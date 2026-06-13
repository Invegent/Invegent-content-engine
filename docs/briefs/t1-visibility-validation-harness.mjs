// T1 visibility validation — applies T0 + T1 + list_creative_intents migration in
// PGlite, builds intents in every case-state, asserts list_creative_intents counts,
// and asserts the deriveIntentStatus mapping (Cases A-F) used by the dashboard.
import { PGlite } from "@electric-sql/pglite";
import { readFileSync } from "node:fs";

const ROOT = "C:/Users/parve/Invegent-content-engine";
const M = (f) => readFileSync(`${ROOT}/supabase/migrations/${f}`, "utf8").replace(/\r\n/g, "\n");
const T0 = M("20260613010000_t0_manual_slot_governed_studio.sql");
const T1 = M("20260613020000_t1_creative_intent.sql");
const LIST = M("20260613060000_t1_list_creative_intents.sql");

const db = new PGlite();
const q = async (sql, params) => (await db.query(sql, params)).rows;
const exec = (sql) => db.exec(sql);
let pass = 0, fail = 0;
const check = (n, c, d = "") => { if (c) { pass++; console.log(`  PASS  ${n}`); } else { fail++; console.log(`  FAIL  ${n} ${d}`); } };

// ---- deriveIntentStatus: MIRROR of dashboard lib/intent-status.ts ----
// compute-on-display only; no backend rollup.
function deriveIntentStatus(c) {
  const total = (c.child_total ?? 0) + (c.fanout_rejected ?? 0); // all targets
  const published = c.child_published ?? 0;
  const inflight = c.child_inflight ?? 0;
  const failed = (c.child_failed ?? 0) + (c.fanout_rejected ?? 0);
  if (total === 0) return "failed";                 // zero targets created
  if (inflight > 0) return "active";                // anything still moving
  if (published === total) return "completed";      // all targets published
  if (published === 0) return "failed";             // nothing went out
  return "partial";                                  // some out, some not
}

await exec(`
CREATE ROLE anon NOLOGIN; CREATE ROLE authenticated NOLOGIN; CREATE ROLE service_role NOLOGIN;
CREATE SCHEMA m; CREATE SCHEMA c; CREATE SCHEMA t;
CREATE TABLE c.client (client_id uuid PRIMARY KEY, status text NOT NULL DEFAULT 'active');
CREATE TABLE c.client_publish_profile (client_id uuid NOT NULL, platform text NOT NULL,
  publish_enabled boolean NOT NULL DEFAULT true, status text NOT NULL DEFAULT 'active', paused_until timestamptz);
CREATE TABLE t."5.3_content_format" (ice_format_key text PRIMARY KEY, format_name text, is_active boolean NOT NULL DEFAULT true,
  is_buildable boolean NOT NULL DEFAULT true, platform_support jsonb NOT NULL DEFAULT '{}'::jsonb);
CREATE TABLE t.dedup_policy (policy_name text, is_current boolean, same_canonical_block_hours int DEFAULT 72,
  title_similarity_threshold numeric DEFAULT 0.85, same_source_diversity_min int DEFAULT 2);
INSERT INTO t.dedup_policy (policy_name, is_current) VALUES ('default', true);
CREATE TABLE m.slot (
  slot_id uuid PRIMARY KEY DEFAULT gen_random_uuid(), client_id uuid NOT NULL REFERENCES c.client(client_id) ON DELETE CASCADE,
  platform text NOT NULL, scheduled_publish_at timestamptz NOT NULL,
  format_preference text[] NOT NULL DEFAULT ARRAY[]::text[], format_chosen text,
  fill_window_opens_at timestamptz NOT NULL, fill_lead_time_minutes integer NOT NULL DEFAULT 1440,
  status text NOT NULL DEFAULT 'future' CHECK (status = ANY (ARRAY['future','pending_fill','fill_in_progress','filled','approved','published','skipped','failed'])),
  skip_reason text, filled_at timestamptz, filled_draft_id uuid, canonical_ids uuid[] DEFAULT ARRAY[]::uuid[],
  is_evergreen boolean NOT NULL DEFAULT false, evergreen_id uuid, slot_confidence numeric,
  source_kind text NOT NULL DEFAULT 'scheduled', schedule_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT m_slot_fill_window_consistency CHECK (fill_window_opens_at <= scheduled_publish_at));
CREATE UNIQUE INDEX idx_slot_unique_active ON m.slot (client_id, platform, scheduled_publish_at)
  WHERE (status <> ALL (ARRAY['skipped'::text,'failed'::text,'published'::text]));
CREATE TABLE m.slot_fill_attempt (attempt_id uuid PRIMARY KEY, slot_id uuid, attempted_at timestamptz,
  pool_size_at_attempt integer, pool_snapshot jsonb, decision text, skip_reason text, selected_canonical_ids uuid[],
  selected_evergreen_id uuid, chosen_format text, threshold_relaxed boolean, pool_health_at_attempt jsonb,
  evergreen_ratio_at_attempt numeric, ai_job_id uuid, error_message text, created_at timestamptz);
CREATE TABLE m.post_draft (
  post_draft_id uuid PRIMARY KEY DEFAULT gen_random_uuid(), digest_item_id uuid, client_id uuid NOT NULL, platform text NOT NULL, slot_id uuid,
  approval_status text NOT NULL DEFAULT 'draft', draft_title text, draft_body text, draft_format jsonb,
  recommended_format text, recommended_reason text, image_headline text, image_url text, image_status text DEFAULT 'pending',
  video_url text, video_status text, auto_approval_scores jsonb, compliance_flags jsonb DEFAULT '[]'::jsonb,
  dead_reason text, approved_by text, approved_at timestamptz, scheduled_for timestamptz, notification_sent_at timestamptz,
  version integer NOT NULL DEFAULT 1, created_by text, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now());
CREATE UNIQUE INDEX uq_post_draft_slot_id ON m.post_draft (slot_id) WHERE (slot_id IS NOT NULL);
CREATE TABLE m.ai_job (ai_job_id uuid PRIMARY KEY, client_id uuid, platform text, slot_id uuid, post_draft_id uuid,
  digest_run_id uuid, post_seed_id uuid, job_type text, status text, priority integer, input_payload jsonb, output_payload jsonb,
  error text, dead_reason text, locked_at timestamptz, locked_by text, attempts integer, created_at timestamptz, updated_at timestamptz, UNIQUE (post_draft_id, job_type));
CREATE TABLE m.post_publish_queue (queue_id uuid PRIMARY KEY DEFAULT gen_random_uuid(), ai_job_id uuid, post_draft_id uuid,
  client_id uuid, platform text, status text, scheduled_for timestamptz, attempt_count integer, created_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE m.post_publish (post_publish_id uuid PRIMARY KEY DEFAULT gen_random_uuid(), post_draft_id uuid, attempt_no int,
  status text, platform_post_id text, published_at timestamptz, response_payload jsonb, created_at timestamptz NOT NULL DEFAULT now(), client_id uuid, platform text);
CREATE FUNCTION m.is_publish_eligible(p_client_id uuid, p_platform text) RETURNS boolean LANGUAGE sql STABLE AS $$
  SELECT EXISTS (SELECT 1 FROM c.client_publish_profile cpp JOIN c.client cl ON cl.client_id = cpp.client_id
    WHERE cpp.client_id = p_client_id AND cpp.platform = p_platform AND cpp.publish_enabled = true
      AND cpp.status='active' AND (cpp.paused_until IS NULL OR cpp.paused_until <= now()) AND cl.status='active'); $$;
CREATE FUNCTION public.manual_post_insert(p_platform text, p_draft_body text, p_approval_status text, p_client_id uuid, p_destination text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER AS $$ DECLARE v uuid; BEGIN
  INSERT INTO m.post_draft (digest_item_id, client_id, platform, draft_body, approval_status, created_by)
  VALUES (null,p_client_id,p_platform,p_draft_body,p_approval_status,'manual-studio') RETURNING post_draft_id INTO v;
  RETURN jsonb_build_object('post_draft_id', v); END; $$;
GRANT EXECUTE ON FUNCTION public.manual_post_insert(text,text,text,uuid,text) TO anon, authenticated, service_role;
INSERT INTO c.client VALUES ('11111111-1111-1111-1111-111111111111','active');
INSERT INTO c.client_publish_profile (client_id, platform) VALUES
  ('11111111-1111-1111-1111-111111111111','facebook'), ('11111111-1111-1111-1111-111111111111','linkedin');
INSERT INTO t."5.3_content_format" (ice_format_key, format_name, is_buildable, platform_support) VALUES
  ('image_quote','Image quote', true, '{"facebook":true,"linkedin":true}'),
  ('text','Text', true, '{"facebook":true,"linkedin":true}'),
  ('video_short','Short', false, '{"facebook":true}');
`);
await exec(T0); await exec(T1); await exec(LIST);
console.log("migrations applied (T0 + T1 + list)\n");

const CLIENT = "11111111-1111-1111-1111-111111111111";
const mkIntent = async (brief, targets) =>
  (await q(`SELECT public.create_creative_intent($1,$2,$3::jsonb,'package',NULL,NULL,'content-studio:vis') AS res`,
    [CLIENT, brief, JSON.stringify(targets)]))[0].res;
const kids = async (iid) => q(`SELECT slot_id, platform FROM m.slot WHERE intent_id=$1 ORDER BY platform`, [iid]);
const fill = async () => q(`SELECT m.fill_pending_slots(100)`);
const listFor = async (iid) => {
  const rows = (await q(`SELECT public.list_creative_intents($1, 100) AS res`, [CLIENT]))[0].res;
  return rows.find((r) => r.intent_id === iid);
};

// ---- Build the case matrix ----
console.log("Case C — compliance-killed (all children dead)");
const iC = await mkIntent("Compliance case: this idea fans to two platforms and both children will be compliance-killed.", [{platform:"facebook"},{platform:"linkedin"}]);
await fill();
for (const k of await kids(iC.intent_id)) {
  await q(`UPDATE m.post_draft SET approval_status='dead', dead_reason='compliance', draft_format=jsonb_build_object('compliance_skip',true,'reason','not relevant to CFW scope') WHERE slot_id=$1`, [k.slot_id]);
  await q(`UPDATE m.slot SET status='skipped', skip_reason='compliance_skip:not relevant' WHERE slot_id=$1`, [k.slot_id]);
}
{
  const r = await listFor(iC.intent_id);
  check("C list counts: total2 pub0 failed2 inflight0", r.child_total===2 && r.child_published===0 && r.child_failed===2 && r.child_inflight===0, JSON.stringify(r));
  check("C derived=failed", deriveIntentStatus(r)==="failed", deriveIntentStatus(r));
}

console.log("\nCase A/E — all children published");
const iA = await mkIntent("All-success case: both children render, queue and publish successfully to their platforms.", [{platform:"facebook"},{platform:"linkedin"}]);
await fill();
for (const k of await kids(iA.intent_id)) {
  const d = (await q(`SELECT post_draft_id FROM m.post_draft WHERE slot_id=$1`, [k.slot_id]))[0].post_draft_id;
  await q(`UPDATE m.post_draft SET approval_status='published', recommended_format='image_quote' WHERE post_draft_id=$1`, [d]);
  await q(`UPDATE m.slot SET status='published' WHERE slot_id=$1`, [k.slot_id]);
  await q(`INSERT INTO m.post_publish (post_draft_id, status, platform_post_id, published_at, platform) VALUES ($1,'published',$2,now(),'x')`, [d, 'PID_'+d]);
}
{
  const r = await listFor(iA.intent_id);
  check("A list counts: total2 pub2 failed0 inflight0", r.child_total===2 && r.child_published===2 && r.child_failed===0 && r.child_inflight===0, JSON.stringify(r));
  check("A derived=completed (Case A + Case E published)", deriveIntentStatus(r)==="completed", deriveIntentStatus(r));
}

console.log("\nCase B — partial (1 published, 1 dead)");
const iB = await mkIntent("Partial case: one child publishes and the other is compliance-killed, so the parent is mixed.", [{platform:"facebook"},{platform:"linkedin"}]);
await fill();
{
  const ks = await kids(iB.intent_id);
  const dPub = (await q(`SELECT post_draft_id FROM m.post_draft WHERE slot_id=$1`, [ks[0].slot_id]))[0].post_draft_id;
  await q(`UPDATE m.post_draft SET approval_status='published' WHERE post_draft_id=$1`, [dPub]);
  await q(`UPDATE m.slot SET status='published' WHERE slot_id=$1`, [ks[0].slot_id]);
  await q(`INSERT INTO m.post_publish (post_draft_id, status, platform_post_id, published_at, platform) VALUES ($1,'published','PID',now(),'fb')`, [dPub]);
  await q(`UPDATE m.post_draft SET approval_status='dead', dead_reason='compliance' WHERE slot_id=$1`, [ks[1].slot_id]);
  await q(`UPDATE m.slot SET status='skipped', skip_reason='compliance_skip' WHERE slot_id=$1`, [ks[1].slot_id]);
  const r = await listFor(iB.intent_id);
  check("B list counts: total2 pub1 failed1 inflight0", r.child_total===2 && r.child_published===1 && r.child_failed===1 && r.child_inflight===0, JSON.stringify(r));
  check("B derived=partial", deriveIntentStatus(r)==="partial", deriveIntentStatus(r));
}

console.log("\nCase D — waiting (children in flight)");
const iD = await mkIntent("Waiting case: both children are filled and awaiting approval, nothing terminal yet.", [{platform:"facebook"},{platform:"linkedin"}]);
await fill(); // leaves children fill_in_progress with draft 'draft' = inflight
{
  const r = await listFor(iD.intent_id);
  check("D list counts: total2 pub0 failed0 inflight2", r.child_total===2 && r.child_published===0 && r.child_failed===0 && r.child_inflight===2, JSON.stringify(r));
  check("D derived=active (waiting)", deriveIntentStatus(r)==="active", deriveIntentStatus(r));
}

console.log("\nCase B2 — fan-out rejection (1 accepted, 1 rejected at creation)");
const iR = await mkIntent("Fanout-rejection case: one platform target carries a non-buildable format and is rejected at fan-out.", [{platform:"facebook"},{platform:"linkedin", format_preference:"video_short"}]);
{
  // facebook accepted (no pref), linkedin rejected (video_short not buildable)
  check("B2 create: 1 accepted 1 rejected, parent partial", iR.accepted===1 && iR.rejected===1 && iR.status==="partial", JSON.stringify(iR));
  await fill();
  const r = await listFor(iR.intent_id);
  check("B2 list: total1 fanout_rejected1", r.child_total===1 && r.fanout_rejected===1, JSON.stringify(r));
  // 1 child inflight + 1 fanout-rejected -> still active (inflight>0)
  check("B2 derived=active while child in flight", deriveIntentStatus(r)==="active", deriveIntentStatus(r));
  // simulate the live child publishing -> now 1 published + 1 rejected = partial
  const k = (await kids(iR.intent_id))[0];
  const d = (await q(`SELECT post_draft_id FROM m.post_draft WHERE slot_id=$1`, [k.slot_id]))[0].post_draft_id;
  await q(`UPDATE m.post_draft SET approval_status='published' WHERE post_draft_id=$1`, [d]);
  await q(`UPDATE m.slot SET status='published' WHERE slot_id=$1`, [k.slot_id]);
  await q(`INSERT INTO m.post_publish (post_draft_id, status, platform_post_id, published_at, platform) VALUES ($1,'published','PID',now(),'fb')`, [d]);
  const r2 = await listFor(iR.intent_id);
  check("B2 after publish: pub1 + fanout_rejected1 -> partial", deriveIntentStatus(r2)==="partial", JSON.stringify(r2)+" -> "+deriveIntentStatus(r2));
}

console.log("\nFailure visibility — get_creative_intent_detail answers without SQL (Case F)");
{
  const d = (await q(`SELECT public.get_creative_intent_detail($1) AS res`, [iC.intent_id]))[0].res;
  const child = d.children[0];
  check("F detail exposes per-child skip_reason verbatim", typeof child.skip_reason==='string' && child.skip_reason.includes('compliance'), JSON.stringify(child.skip_reason));
  check("F detail exposes approval_status + slot_status", child.approval_status==='dead' && child.slot_status==='skipped');
  check("F detail governance: selected_canonical_ids_count=0", child.selected_canonical_ids_count===0);
  check("F detail child linked to parent", child.draft_intent_id===iC.intent_id);
}

console.log("\nGrants — list RPC is service-role only (read-only posture)");
{
  const g = await q(`SELECT array_agg(grantee::text ORDER BY grantee::text) AS gr FROM information_schema.routine_privileges WHERE routine_schema='public' AND routine_name='list_creative_intents' AND privilege_type='EXECUTE'`);
  const gr = g[0].gr;
  check("list_creative_intents: service_role granted, anon/authenticated not", gr.includes('service_role') && !gr.includes('anon') && !gr.includes('authenticated'), JSON.stringify(gr));
  // read-only proof: function is STABLE and contains no DML keywords
  const def = (await q(`SELECT pg_get_functiondef(p.oid) AS def FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND p.proname='list_creative_intents'`))[0].def;
  check("list RPC is STABLE + SELECT-only (no INSERT/UPDATE/DELETE)", /\bSTABLE\b/.test(def) && !/\b(INSERT|UPDATE|DELETE)\b/i.test(def.replace(/--.*$/gm,'')), "DML found");
}

// deriveIntentStatus direct unit table (Cases A-F as pure inputs)
console.log("\nderiveIntentStatus unit (Cases A-F mapping)");
check("A all published -> completed", deriveIntentStatus({child_total:2,child_published:2,child_failed:0,child_inflight:0,fanout_rejected:0})==="completed");
check("B partial -> partial", deriveIntentStatus({child_total:2,child_published:1,child_failed:1,child_inflight:0,fanout_rejected:0})==="partial");
check("C all dead -> failed", deriveIntentStatus({child_total:2,child_published:0,child_failed:2,child_inflight:0,fanout_rejected:0})==="failed");
check("D waiting -> active", deriveIntentStatus({child_total:2,child_published:0,child_failed:0,child_inflight:2,fanout_rejected:0})==="active");
check("E one published among terminal -> partial", deriveIntentStatus({child_total:2,child_published:1,child_failed:1,child_inflight:0,fanout_rejected:0})==="partial");
check("zero targets -> failed", deriveIntentStatus({child_total:0,child_published:0,child_failed:0,child_inflight:0,fanout_rejected:0})==="failed");

console.log(`\n==== T1-VIS RESULT: ${pass} passed, ${fail} failed ====`);
process.exit(fail ? 1 : 0);
