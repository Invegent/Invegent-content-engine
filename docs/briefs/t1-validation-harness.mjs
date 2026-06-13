// T1 validation — applies the REAL T0 then T1 migration files in PGlite.
//  - proves the automated fill path is byte-identical (server-normalized md5,
//    manual branch stripped) between T0-applied and T1-applied,
//  - re-runs the T0 regression suite (manual single-slot path) — must still pass,
//  - runs the T1 fan-out cases from brief §9.
import { PGlite } from "@electric-sql/pglite";
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";

const ROOT = "C:/Users/parve/Invegent-content-engine";
const T0_SQL = readFileSync(`${ROOT}/supabase/migrations/20260613010000_t0_manual_slot_governed_studio.sql`, "utf8");
const T1_SQL = readFileSync(`${ROOT}/supabase/migrations/20260613020000_t1_creative_intent.sql`, "utf8");
const md5 = (s) => createHash("md5").update(Buffer.from(s, "utf8")).digest("hex");

const db = new PGlite();
const q = async (sql, params) => (await db.query(sql, params)).rows;
const exec = (sql) => db.exec(sql);
let pass = 0, fail = 0;
function check(name, cond, detail = "") { if (cond) { pass++; console.log(`  PASS  ${name}`); } else { fail++; console.log(`  FAIL  ${name} ${detail}`); } }

function stripManualBranch(fnText) {
  const a = fnText.indexOf("-- T0 MANUAL BRANCH");
  const b = fnText.indexOf("-- end T0 MANUAL BRANCH");
  if (a < 0 || b < 0) return fnText; // already stripped / not present
  const before = fnText.slice(0, fnText.lastIndexOf("\n", a) + 1);
  const after = fnText.slice(fnText.indexOf("\n", b) + 1);
  return before + after;
}
async function fillDefMd5() {
  const [r] = await q(`SELECT pg_get_functiondef(p.oid) AS def FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='m' AND p.proname='fill_pending_slots'`);
  return md5(stripManualBranch(r.def));
}

// ---- minimal production-shaped scaffold (PRE-T0 shape) ----
await exec(`
CREATE ROLE anon NOLOGIN; CREATE ROLE authenticated NOLOGIN; CREATE ROLE service_role NOLOGIN;
CREATE SCHEMA m; CREATE SCHEMA c; CREATE SCHEMA t;

CREATE TABLE c.client (client_id uuid PRIMARY KEY, status text NOT NULL DEFAULT 'active');
CREATE TABLE c.client_publish_profile (client_id uuid NOT NULL, platform text NOT NULL,
  publish_enabled boolean NOT NULL DEFAULT true, status text NOT NULL DEFAULT 'active', paused_until timestamptz);

CREATE TABLE t."5.3_content_format" (
  ice_format_key text PRIMARY KEY, format_name text, is_active boolean NOT NULL DEFAULT true,
  is_buildable boolean NOT NULL DEFAULT true, platform_support jsonb NOT NULL DEFAULT '{}'::jsonb);
CREATE TABLE t.dedup_policy (policy_name text, is_current boolean, same_canonical_block_hours int DEFAULT 72,
  title_similarity_threshold numeric DEFAULT 0.85, same_source_diversity_min int DEFAULT 2);
INSERT INTO t.dedup_policy (policy_name, is_current) VALUES ('default', true);

CREATE TABLE m.slot (
  slot_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES c.client(client_id) ON DELETE CASCADE,
  platform text NOT NULL, scheduled_publish_at timestamptz NOT NULL,
  format_preference text[] NOT NULL DEFAULT ARRAY[]::text[], format_chosen text,
  fill_window_opens_at timestamptz NOT NULL, fill_lead_time_minutes integer NOT NULL DEFAULT 1440,
  status text NOT NULL DEFAULT 'future' CHECK (status = ANY (ARRAY['future','pending_fill','fill_in_progress','filled','approved','published','skipped','failed'])),
  skip_reason text, filled_at timestamptz, filled_draft_id uuid,
  canonical_ids uuid[] DEFAULT ARRAY[]::uuid[],
  is_evergreen boolean NOT NULL DEFAULT false, evergreen_id uuid, slot_confidence numeric,
  source_kind text NOT NULL DEFAULT 'scheduled', schedule_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT m_slot_fill_window_consistency CHECK (fill_window_opens_at <= scheduled_publish_at));
-- the LIVE partial-unique index the fan-out must respect
CREATE UNIQUE INDEX idx_slot_unique_active ON m.slot (client_id, platform, scheduled_publish_at)
  WHERE (status <> ALL (ARRAY['skipped'::text,'failed'::text,'published'::text]));

CREATE TABLE m.slot_fill_attempt (attempt_id uuid PRIMARY KEY, slot_id uuid, attempted_at timestamptz,
  pool_size_at_attempt integer, pool_snapshot jsonb, decision text, skip_reason text,
  selected_canonical_ids uuid[], selected_evergreen_id uuid, chosen_format text, threshold_relaxed boolean,
  pool_health_at_attempt jsonb, evergreen_ratio_at_attempt numeric, ai_job_id uuid, error_message text, created_at timestamptz);

CREATE TABLE m.post_draft (
  post_draft_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  digest_item_id uuid, client_id uuid NOT NULL, platform text NOT NULL, slot_id uuid,
  approval_status text NOT NULL DEFAULT 'draft', draft_title text, draft_body text, draft_format jsonb,
  recommended_format text, recommended_reason text, image_headline text, image_url text, image_status text DEFAULT 'pending',
  video_url text, video_status text, auto_approval_scores jsonb, compliance_flags jsonb DEFAULT '[]'::jsonb,
  dead_reason text, approved_by text, approved_at timestamptz, scheduled_for timestamptz, notification_sent_at timestamptz,
  version integer NOT NULL DEFAULT 1, created_by text,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now());
CREATE UNIQUE INDEX uq_post_draft_slot_id ON m.post_draft (slot_id) WHERE (slot_id IS NOT NULL);

CREATE TABLE m.ai_job (ai_job_id uuid PRIMARY KEY, client_id uuid, platform text, slot_id uuid, post_draft_id uuid,
  digest_run_id uuid, post_seed_id uuid, job_type text, status text, priority integer,
  input_payload jsonb, output_payload jsonb, error text, dead_reason text, locked_at timestamptz, locked_by text,
  attempts integer, created_at timestamptz, updated_at timestamptz, UNIQUE (post_draft_id, job_type));

CREATE TABLE m.post_publish_queue (queue_id uuid PRIMARY KEY DEFAULT gen_random_uuid(), ai_job_id uuid,
  post_draft_id uuid, client_id uuid, platform text, status text, scheduled_for timestamptz, attempt_count integer,
  created_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE m.post_publish (post_publish_id uuid PRIMARY KEY DEFAULT gen_random_uuid(), post_draft_id uuid,
  attempt_no int, status text, platform_post_id text, published_at timestamptz, response_payload jsonb,
  created_at timestamptz NOT NULL DEFAULT now(), client_id uuid, platform text);

CREATE FUNCTION m.is_publish_eligible(p_client_id uuid, p_platform text) RETURNS boolean LANGUAGE sql STABLE AS $$
  SELECT EXISTS (SELECT 1 FROM c.client_publish_profile cpp JOIN c.client cl ON cl.client_id = cpp.client_id
    WHERE cpp.client_id = p_client_id AND cpp.platform = p_platform AND cpp.publish_enabled = true
      AND cpp.status = 'active' AND (cpp.paused_until IS NULL OR cpp.paused_until <= now()) AND cl.status = 'active'); $$;

CREATE FUNCTION public.manual_post_insert(p_platform text, p_draft_body text, p_approval_status text, p_client_id uuid, p_destination text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE v_draft_id uuid; BEGIN
  INSERT INTO m.post_draft (digest_item_id, client_id, platform, draft_body, approval_status, created_by)
  VALUES (null, p_client_id, p_platform, p_draft_body, p_approval_status, 'manual-studio') RETURNING post_draft_id INTO v_draft_id;
  RETURN jsonb_build_object('post_draft_id', v_draft_id); END; $$;
GRANT EXECUTE ON FUNCTION public.manual_post_insert(text,text,text,uuid,text) TO anon, authenticated, service_role;

INSERT INTO c.client VALUES ('11111111-1111-1111-1111-111111111111','active'), ('22222222-2222-2222-2222-222222222222','inactive');
UPDATE c.client SET status='inactive' WHERE client_id='22222222-2222-2222-2222-222222222222';
INSERT INTO c.client_publish_profile (client_id, platform) VALUES
  ('11111111-1111-1111-1111-111111111111','facebook'),
  ('11111111-1111-1111-1111-111111111111','linkedin');
-- youtube/instagram: NO profile -> ineligible
INSERT INTO t."5.3_content_format" (ice_format_key, format_name, is_buildable, platform_support) VALUES
  ('image_quote','Image quote', true,  '{"facebook":true,"linkedin":true}'),
  ('text','Text post',          true,  '{"facebook":true,"linkedin":true}'),
  ('video_short_avatar','Avatar',true,  '{"youtube":true,"facebook":true}'),
  ('video_short','Short video',  false, '{"facebook":true,"linkedin":true}');  -- NOT buildable
`);

const CLIENT = "11111111-1111-1111-1111-111111111111";

// ---- apply T0, snapshot automated-path md5 ----
await exec(T0_SQL.replace(/\r\n/g, "\n"));
const md5AfterT0 = await fillDefMd5();
console.log("automated-path md5 after T0:", md5AfterT0, "\n");

// ---- apply T1 ----
await exec(T1_SQL.replace(/\r\n/g, "\n"));
const md5AfterT1 = await fillDefMd5();

console.log("Invariance — automated fill path unchanged by T1");
check("INV1 automated-path md5 identical T0 vs T1 (manual branch stripped)", md5AfterT0 === md5AfterT1, `${md5AfterT0} vs ${md5AfterT1}`);

// ---- T0 REGRESSION (manual single-slot path via the refactored wrapper) ----
console.log("\nT0 regression — create_manual_slot wrapper still governs single posts");
{
  const slotsBefore = (await q(`SELECT count(*)::int n FROM m.slot`))[0].n;
  const [a] = await q(`SELECT public.create_manual_slot($1,'facebook',$2,'image_quote') AS res`, [CLIENT, "T0 regression: governed single manual post via the refactored wrapper path."]);
  check("T0-A wrapper ok + pending_fill", a.res.ok === true && a.res.status === "pending_fill", JSON.stringify(a.res));
  check("T0-A intent_id NULL (single post parentless)", a.res.intent_id === null || a.res.intent_id === undefined, JSON.stringify(a.res));
  const [s] = await q(`SELECT source_kind, status, intent_id, slot_confidence FROM m.slot WHERE slot_id=$1`, [a.res.slot_id]);
  check("T0-A slot manual + intent_id NULL + confidence NULL at creation", s.source_kind === "manual" && s.intent_id === null && s.slot_confidence === null);
  await q(`SELECT m.fill_pending_slots(5)`);
  const [d] = await q(`SELECT approval_status, intent_id, approved_by FROM m.post_draft WHERE slot_id=$1`, [a.res.slot_id]);
  check("T0-A fill -> draft 'draft', NOT pre-approved, intent_id NULL", d.approval_status === "draft" && d.approved_by === null && d.intent_id === null);
  const [s2] = await q(`SELECT status, slot_confidence FROM m.slot WHERE slot_id=$1`, [a.res.slot_id]);
  check("T0-A slot_confidence stays NULL for T0 single post (carry unchanged for T0)", s2.slot_confidence === null, `conf=${s2.slot_confidence}`);
  // rejection paths unchanged
  const [r1] = await q(`SELECT public.create_manual_slot($1,'youtube',$2) AS res`, [CLIENT, "ineligible platform must reject cleanly with no slot."]);
  check("T0-B ineligible platform rejected", r1.res.ok === false && r1.res.error === "platform_not_eligible");
  const [r2] = await q(`SELECT public.create_manual_slot($1,'facebook','short') AS res`, [CLIENT]);
  check("T0-B brief floor rejected", r2.res.ok === false && r2.res.error === "brief_too_short");
  const [r3] = await q(`SELECT public.create_manual_slot($1,'facebook',$2,'nope') AS res`, [CLIENT, "unknown format must reject via taxonomy."]);
  check("T0-B unknown format rejected", r3.res.ok === false && r3.res.error === "format_not_in_taxonomy");
}

// ---- T1 CASES (brief §9) ----
console.log("\nT1 Case 1 — one idea -> one platform child");
let intent1;
{
  const [r] = await q(`SELECT public.create_creative_intent($1,$2,$3::jsonb) AS res`,
    [CLIENT, "Two Support Coordinator roles open at Care For Welfare — encourage qualified applicants to reach out.",
     JSON.stringify([{platform:"facebook", format_preference:"image_quote"}])]);
  intent1 = r.res;
  check("C1 ok, status active, 1 accepted", r.res.ok && r.res.status === "active" && r.res.accepted === 1 && r.res.rejected === 0, JSON.stringify(r.res));
  const kids = await q(`SELECT s.slot_id, s.intent_id, s.source_kind, s.status, s.slot_confidence, COALESCE(array_length(s.canonical_ids,1),0) AS canon FROM m.slot s WHERE s.intent_id=$1`, [r.res.intent_id]);
  check("C1 exactly one child slot, linked, manual, high confidence, 0 canonical", kids.length===1 && kids[0].intent_id===r.res.intent_id && kids[0].source_kind==="manual" && Number(kids[0].slot_confidence)===1 && kids[0].canon===0, JSON.stringify(kids));
  await q(`SELECT m.fill_pending_slots(5)`);
  const [d] = await q(`SELECT approval_status, intent_id, approved_by FROM m.post_draft WHERE slot_id=$1`, [kids[0].slot_id]);
  check("C1 draft inherits intent_id, status 'draft', not pre-approved", d.intent_id===r.res.intent_id && d.approval_status==="draft" && d.approved_by===null, JSON.stringify(d));
  const [s2] = await q(`SELECT slot_confidence, status FROM m.slot WHERE slot_id=$1`, [kids[0].slot_id]);
  check("C1 child slot_confidence preserved high (1.0) through fill", Number(s2.slot_confidence)===1, `conf=${s2.slot_confidence}`);
  const [j] = await q(`SELECT input_payload->>'synthesis_mode' sm, input_payload->'canonical_ids' canon FROM m.ai_job WHERE slot_id=$1`, [kids[0].slot_id]);
  check("C1 ai_job synthesis_mode manual, canonical_ids empty (no pool)", j.sm==="manual" && JSON.stringify(j.canon)==="[]");
}

console.log("\nT1 Case 2 — one idea -> two platform children (distinct timestamps)");
{
  const [r] = await q(`SELECT public.create_creative_intent($1,$2,$3::jsonb) AS res`,
    [CLIENT, "Webinar next Thursday on NDIS plan reviews — register now, limited spots available.",
     JSON.stringify([{platform:"facebook"},{platform:"linkedin"}])]);
  check("C2 ok, active, 2 accepted", r.res.ok && r.res.status==="active" && r.res.accepted===2, JSON.stringify(r.res));
  const kids = await q(`SELECT platform, scheduled_publish_at, intent_id FROM m.slot WHERE intent_id=$1 ORDER BY scheduled_publish_at`, [r.res.intent_id]);
  check("C2 two children, both linked", kids.length===2 && kids.every(k=>k.intent_id===r.res.intent_id));
  check("C2 distinct platforms", new Set(kids.map(k=>k.platform)).size===2);
  await q(`SELECT m.fill_pending_slots(5)`);
  const drafts = await q(`SELECT d.intent_id, d.approval_status, COALESCE(array_length(s.canonical_ids,1),0) canon FROM m.post_draft d JOIN m.slot s ON s.slot_id=d.slot_id WHERE s.intent_id=$1`, [r.res.intent_id]);
  check("C2 both drafts independent + linked + 0 canonical", drafts.length===2 && drafts.every(d=>d.intent_id===r.res.intent_id && d.approval_status==="draft" && d.canon===0));
}

console.log("\nT1 Case 2b — two children SAME platform -> distinct timestamps, no unique-index collision");
{
  const [r] = await q(`SELECT public.create_creative_intent($1,$2,$3::jsonb) AS res`,
    [CLIENT, "Two distinct Facebook angles for the same hiring push — variant A and variant B.",
     JSON.stringify([{platform:"facebook"},{platform:"facebook"}])]);
  check("C2b two same-platform children accepted (distinct ts)", r.res.ok && r.res.accepted===2 && r.res.rejected===0, JSON.stringify(r.res));
  const kids = await q(`SELECT scheduled_publish_at FROM m.slot WHERE intent_id=$1`, [r.res.intent_id]);
  check("C2b timestamps distinct", new Set(kids.map(k=>String(k.scheduled_publish_at))).size===2);
}

console.log("\nT1 Case 3 — one platform invalid -> partial, valid proceeds");
{
  const [r] = await q(`SELECT public.create_creative_intent($1,$2,$3::jsonb) AS res`,
    [CLIENT, "Cross-post our service update to Facebook and to an unconnected platform.",
     JSON.stringify([{platform:"facebook"},{platform:"youtube"}])]);
  check("C3 partial, 1 accepted 1 rejected", r.res.ok && r.res.status==="partial" && r.res.accepted===1 && r.res.rejected===1, JSON.stringify(r.res));
  const rej = r.res.targets.find(t=>t.status==="rejected");
  check("C3 rejection reason platform_not_eligible (youtube)", rej && rej.platform==="youtube" && rej.reason==="platform_not_eligible", JSON.stringify(rej));
  const kids = await q(`SELECT platform FROM m.slot WHERE intent_id=$1`, [r.res.intent_id]);
  check("C3 only the valid child slot created", kids.length===1 && kids[0].platform==="facebook");
}

console.log("\nT1 Case 4 — unsupported / non-buildable format rejected per target");
{
  const [r] = await q(`SELECT public.create_creative_intent($1,$2,$3::jsonb) AS res`,
    [CLIENT, "Same idea, but request a format that the platform does not support on one target.",
     JSON.stringify([{platform:"facebook", format_preference:"text"},{platform:"linkedin", format_preference:"video_short_avatar"}])]);
  // text@facebook supported; video_short_avatar@linkedin NOT in platform_support -> helper rejects
  check("C4 partial: supported accepted, unsupported rejected", r.res.ok && r.res.accepted===1 && r.res.rejected===1, JSON.stringify(r.res));
  const rej = r.res.targets.find(t=>t.status==="rejected");
  check("C4 unsupported reason format_not_supported_on_platform", rej && rej.reason==="format_not_supported_on_platform", JSON.stringify(rej));
  // non-buildable format rejected by T1 gate
  const [r2] = await q(`SELECT public.create_creative_intent($1,$2,$3::jsonb) AS res`,
    [CLIENT, "Request a non-buildable video format that T1 must refuse to surface.",
     JSON.stringify([{platform:"facebook", format_preference:"video_short"}])]);
  check("C4b non-buildable format -> failed (0 accepted), reason format_not_buildable", r2.res.status==="failed" && r2.res.targets[0].reason==="format_not_buildable", JSON.stringify(r2.res));
  const [cnt] = await q(`SELECT count(*)::int n FROM m.slot WHERE intent_id=$1`, [r2.res.intent_id]);
  check("C4b no child slot created for non-buildable", cnt.n===0);
}

console.log("\nT1 Case 5 — partial fan-out failure (one child fails to fill) -> siblings unaffected");
{
  const [r] = await q(`SELECT public.create_creative_intent($1,$2,$3::jsonb) AS res`,
    [CLIENT, "Two-platform idea where we will simulate one child losing its source material before fill.",
     JSON.stringify([{platform:"facebook"},{platform:"linkedin"}])]);
  const kids = await q(`SELECT slot_id, platform FROM m.slot WHERE intent_id=$1 ORDER BY platform`, [r.res.intent_id]);
  // corrupt ONE child's source material -> manual fill guard fails it
  await q(`UPDATE m.slot SET source_material=NULL WHERE slot_id=$1`, [kids[0].slot_id]);
  // drain fully (large limit) so both this intent's children are processed —
  // fill_pending_slots is oldest-first LIMIT N; earlier cases left a backlog.
  await q(`SELECT m.fill_pending_slots(100)`);
  const [bad] = await q(`SELECT status, skip_reason FROM m.slot WHERE slot_id=$1`, [kids[0].slot_id]);
  const [good] = await q(`SELECT status FROM m.slot WHERE slot_id=$1`, [kids[1].slot_id]);
  check("C5 failed child isolated (manual_source_material_missing)", bad.status==="failed" && bad.skip_reason==="manual_source_material_missing");
  check("C5 sibling unaffected (fill_in_progress)", good.status==="fill_in_progress", `sib=${good.status}`);
  const noJob = (await q(`SELECT count(*)::int n FROM m.ai_job WHERE slot_id=$1`, [kids[0].slot_id]))[0].n;
  check("C5 no ai_job for failed child", noJob===0);
}

console.log("\nT1 Case 6 — no queue bypass anywhere in T1");
{
  const qn = (await q(`SELECT count(*)::int n FROM m.post_publish_queue`))[0].n;
  check("C6 zero publish_queue rows written by any T1 path (queue is post-approval+render)", qn===0, `queue rows=${qn}`);
  const preapproved = (await q(`SELECT count(*)::int n FROM m.post_draft d JOIN m.slot s ON s.slot_id=d.slot_id WHERE s.intent_id IS NOT NULL AND (d.approved_by IS NOT NULL OR d.approval_status='approved')`))[0].n;
  check("C6 no T1 child draft pre-approved", preapproved===0);
}

console.log("\nT1 Case 7 — get_creative_intent_detail links parent + children + state");
{
  const [d] = await q(`SELECT public.get_creative_intent_detail($1) AS res`, [intent1.intent_id]);
  check("C7 detail ok, intent present", d.res.ok && d.res.intent && d.res.intent.intent_id===intent1.intent_id, JSON.stringify(d.res.intent||{}));
  check("C7 children array with linked draft + canonical count 0", Array.isArray(d.res.children) && d.res.children.length===1 && d.res.children[0].draft_intent_id===intent1.intent_id && d.res.children[0].selected_canonical_ids_count===0, JSON.stringify(d.res.children));
  check("C7 parent fanout_result persisted (partial-rep)", d.res.intent.fanout_result !== null && d.res.intent.fanout_result !== undefined);
  const [d2] = await q(`SELECT public.get_creative_intent_detail('00000000-0000-0000-0000-000000000000') AS res`);
  check("C7 unknown intent -> ok:false intent_not_found", d2.res.ok===false && d2.res.error==="intent_not_found");
}

console.log("\nGovernance — no manual_post_insert usage by T1, ON DELETE SET NULL lineage");
{
  // create_creative_intent + helpers must not call manual_post_insert
  const usesMPI = (await q(`SELECT count(*)::int n FROM pg_proc p JOIN pg_namespace ns ON ns.oid=p.pronamespace
    WHERE p.proname IN ('create_creative_intent','create_manual_slot','create_manual_slot_internal')
      AND pg_get_functiondef(p.oid) ILIKE '%manual_post_insert%'`))[0].n;
  check("G1 no T1 function references manual_post_insert", usesMPI===0);
  // ON DELETE SET NULL: deleting an intent must null children, not destroy them
  const [r] = await q(`SELECT public.create_creative_intent($1,$2,$3::jsonb) AS res`,
    [CLIENT, "Intent we will delete to prove ON DELETE SET NULL preserves slot + draft lineage.",
     JSON.stringify([{platform:"facebook"}])]);
  const sid = (await q(`SELECT slot_id FROM m.slot WHERE intent_id=$1`, [r.res.intent_id]))[0].slot_id;
  await q(`SELECT m.fill_pending_slots(5)`);
  await q(`DELETE FROM m.creative_intent WHERE intent_id=$1`, [r.res.intent_id]);
  const [s] = await q(`SELECT intent_id, status FROM m.slot WHERE slot_id=$1`, [sid]);
  const [d] = await q(`SELECT intent_id FROM m.post_draft WHERE slot_id=$1`, [sid]);
  check("G2 child slot survives intent delete, intent_id set NULL", s && s.intent_id===null);
  check("G2 child draft survives intent delete, intent_id set NULL", d && d.intent_id===null);
}

console.log(`\n==== T1 RESULT: ${pass} passed, ${fail} failed ====`);
process.exit(fail ? 1 : 0);
