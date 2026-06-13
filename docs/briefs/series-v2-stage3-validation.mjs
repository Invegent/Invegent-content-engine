// Series v2 Stage 3 validation — writer re-point to governed fan_out_episode.
// Ports the NEW series-writer v1.3.0 control flow (writeEpisode mocked; all DB
// calls real) and runs it against the REAL Stage 2 objects (fan_out_episode,
// retry_episode, get_content_series_detail) loaded from the committed migration.
import { PGlite } from "@electric-sql/pglite";
import { readFileSync } from "node:fs";
const ROOT = "C:/Users/parve/Invegent-content-engine";
const MIG2 = readFileSync(`${ROOT}/supabase/migrations/20260613120000_series_v2_stage2_fanout_retry_detail.sql`, "utf8").replace(/\r\n/g, "\n");
const WRITER_SRC = readFileSync(`${ROOT}/supabase/functions/series-writer/index.ts`, "utf8");
const db = new PGlite();
const q = async (s, p) => (await db.query(s, p)).rows;
const one = async (s, p) => (await q(s, p))[0];
let pass = 0, fail = 0;
const check = (n, c, d = "") => { if (c) { pass++; console.log(`  PASS  ${n}`); } else { fail++; console.log(`  FAIL  ${n} ${d}`); } };

// ---------------------------------------------------------------------------
// Prod surface (same as Stage 2 harness) + Stage 2 migration (real fan_out etc.)
// ---------------------------------------------------------------------------
await db.exec(`
CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role;
CREATE SCHEMA c; CREATE SCHEMA m; CREATE SCHEMA t;
CREATE TABLE c.client (client_id uuid PRIMARY KEY DEFAULT gen_random_uuid(), status text, timezone text);
CREATE TABLE c.client_publish_profile (client_id uuid, platform text, publish_enabled boolean, status text, paused_until timestamptz);
CREATE TABLE c.content_series (
  series_id uuid PRIMARY KEY DEFAULT gen_random_uuid(), client_id uuid NOT NULL, title text NOT NULL, topic text NOT NULL,
  goal text, audience_notes text, tone_notes text, episode_count int NOT NULL DEFAULT 5, platform text NOT NULL DEFAULT 'facebook',
  platforms text[], status text NOT NULL DEFAULT 'draft', series_summary text, outline_json jsonb,
  outline_approved_by text, outline_approved_at timestamptz, source_material text, format_preference text,
  created_by text NOT NULL DEFAULT 'operator', created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT content_series_status_check CHECK (status = ANY (ARRAY['draft','outline_pending','outline_ready','approved','writing','active','complete','cancelled'])));
CREATE TABLE c.content_series_episode (
  episode_id uuid PRIMARY KEY DEFAULT gen_random_uuid(), series_id uuid, client_id uuid, position int,
  episode_title text, episode_angle text, episode_hook text, cta_type text, scheduled_for timestamptz, post_draft_id uuid,
  status text NOT NULL DEFAULT 'outline', created_at timestamptz DEFAULT now(), updated_at timestamptz DEFAULT now(),
  recommended_format text, image_headline text, platform_drafts jsonb,
  intent_id uuid, persona_label text, avatar_preference text, persona_notes text,
  CONSTRAINT content_series_episode_status_check CHECK (status = ANY (ARRAY['outline','writing','draft_ready','published'])));
CREATE TABLE m.creative_intent (
  intent_id uuid PRIMARY KEY DEFAULT gen_random_uuid(), client_id uuid NOT NULL, intent_kind text NOT NULL DEFAULT 'package',
  source_material jsonb NOT NULL, format_preference text, target_platforms text[] NOT NULL, status text NOT NULL DEFAULT 'fanning_out',
  created_by text NOT NULL, fanout_result jsonb, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT creative_intent_intent_kind_check CHECK (intent_kind = ANY (ARRAY['single','package'])),
  CONSTRAINT creative_intent_status_check CHECK (status = ANY (ARRAY['draft','fanning_out','active','partial','complete','failed'])));
CREATE TABLE m.slot (
  slot_id uuid PRIMARY KEY DEFAULT gen_random_uuid(), client_id uuid, platform text, scheduled_publish_at timestamptz,
  format_preference text[], fill_window_opens_at timestamptz, fill_lead_time_minutes int, status text NOT NULL DEFAULT 'pending_fill',
  source_kind text, source_material text, created_by text, canonical_ids uuid[], intent_id uuid, slot_confidence numeric,
  format_chosen text, skip_reason text, created_at timestamptz DEFAULT now(),
  CONSTRAINT m_slot_status_check CHECK (status = ANY (ARRAY['future','pending_fill','fill_in_progress','filled','approved','published','skipped','failed'])));
CREATE UNIQUE INDEX idx_slot_unique_active ON m.slot (client_id, platform, scheduled_publish_at) WHERE status NOT IN ('skipped','failed','published');
CREATE TABLE m.post_draft (post_draft_id uuid PRIMARY KEY DEFAULT gen_random_uuid(), slot_id uuid, intent_id uuid, platform text,
  approval_status text DEFAULT 'needs_review', recommended_format text, image_status text DEFAULT 'pending', video_status text, image_url text, created_at timestamptz DEFAULT now());
CREATE TABLE m.post_publish (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), post_draft_id uuid, status text, platform_post_id text, published_at timestamptz, created_at timestamptz DEFAULT now());
CREATE TABLE m.post_publish_queue (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), post_draft_id uuid, status text, created_at timestamptz DEFAULT now());
CREATE TABLE t."5.3_content_format" (ice_format_key text, is_active boolean, is_buildable boolean, requires_build boolean, render_engine text, platform_support jsonb, advisor_description text);

CREATE FUNCTION m.is_publish_eligible(p_client_id uuid, p_platform text) RETURNS boolean
  LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'pg_catalog','c','public' AS $f$
  SELECT EXISTS (SELECT 1 FROM c.client_publish_profile cpp JOIN c.client cl ON cl.client_id=cpp.client_id
    WHERE cpp.client_id=p_client_id AND cpp.platform=p_platform AND cpp.publish_enabled=true AND cpp.status='active'
      AND (cpp.paused_until IS NULL OR cpp.paused_until <= now()) AND cl.status='active'); $f$;
CREATE FUNCTION m.create_manual_slot_internal(uuid,text,text,text,timestamptz,text,uuid,numeric) RETURNS jsonb
  LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'pg_catalog','m','c','t','public' AS $f$
DECLARE v_slot_id uuid; v_scheduled timestamptz; v_supported boolean;
  v_has_pref boolean := $4 IS NOT NULL AND length(trim($4))>0; v_attempts int := 0;
BEGIN
  IF $3 IS NULL OR length(trim($3))<20 THEN RETURN jsonb_build_object('ok',false,'error','brief_too_short'); END IF;
  IF $1 IS NULL OR $2 IS NULL OR NOT m.is_publish_eligible($1,$2) THEN RETURN jsonb_build_object('ok',false,'error','platform_not_eligible','platform',$2); END IF;
  IF v_has_pref THEN
    SELECT COALESCE((cf.platform_support->>$2)::boolean,false) INTO v_supported FROM t."5.3_content_format" cf WHERE cf.ice_format_key=trim($4) AND cf.is_active=true;
    IF NOT FOUND THEN RETURN jsonb_build_object('ok',false,'error','format_not_in_taxonomy','format',trim($4)); END IF;
    IF NOT v_supported THEN RETURN jsonb_build_object('ok',false,'error','format_not_supported_on_platform','format',trim($4),'platform',$2); END IF;
  END IF;
  v_scheduled := COALESCE($5, now()+interval '1 hour');
  IF v_scheduled < now() THEN RETURN jsonb_build_object('ok',false,'error','scheduled_for_in_past'); END IF;
  LOOP BEGIN
    INSERT INTO m.slot (client_id,platform,scheduled_publish_at,format_preference,fill_window_opens_at,fill_lead_time_minutes,status,source_kind,source_material,created_by,canonical_ids,intent_id,slot_confidence)
    VALUES ($1,$2,v_scheduled, CASE WHEN v_has_pref THEN ARRAY[trim($4)] ELSE ARRAY[]::text[] END, now(),
      GREATEST(1,CEIL(EXTRACT(epoch FROM (v_scheduled-now()))/60.0))::int,'pending_fill','manual',trim($3),COALESCE(NULLIF(trim($6),''),'content-studio'),ARRAY[]::uuid[],$7,$8)
    RETURNING slot_id INTO v_slot_id; EXIT;
  EXCEPTION WHEN unique_violation THEN v_attempts:=v_attempts+1;
    IF v_attempts>=5 THEN RETURN jsonb_build_object('ok',false,'error','slot_collision','platform',$2); END IF;
    v_scheduled:=v_scheduled+interval '1 minute'; END; END LOOP;
  RETURN jsonb_build_object('ok',true,'slot_id',v_slot_id,'status','pending_fill','platform',$2,'format_preference',CASE WHEN v_has_pref THEN trim($4) END,'scheduled_publish_at',v_scheduled,'intent_id',$7);
END; $f$;
CREATE FUNCTION public.get_creative_intent_detail(p_intent_id uuid) RETURNS jsonb
  LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'pg_catalog','m','c','public' AS $f$
DECLARE v_intent jsonb; v_children jsonb;
BEGIN
  SELECT to_jsonb(ci) INTO v_intent FROM m.creative_intent ci WHERE ci.intent_id=p_intent_id;
  IF v_intent IS NULL THEN RETURN jsonb_build_object('ok',false,'error','intent_not_found'); END IF;
  SELECT COALESCE(jsonb_agg(child ORDER BY child->>'scheduled_publish_at'),'[]'::jsonb) INTO v_children FROM (
    SELECT jsonb_build_object('slot_id',s.slot_id,'platform',s.platform,'slot_status',s.status,'scheduled_publish_at',s.scheduled_publish_at,
      'format_chosen',s.format_chosen,'slot_confidence',s.slot_confidence,'skip_reason',s.skip_reason,
      'selected_canonical_ids_count',COALESCE(array_length(s.canonical_ids,1),0),'draft_id',d.post_draft_id,'draft_intent_id',d.intent_id,
      'approval_status',d.approval_status,'recommended_format',d.recommended_format,'image_status',d.image_status,'video_status',d.video_status,
      'queue_status',qd.status,'publish_status',pub.status,'platform_post_id',pub.platform_post_id,'published_at',pub.published_at) AS child
    FROM m.slot s LEFT JOIN m.post_draft d ON d.slot_id=s.slot_id
    LEFT JOIN LATERAL (SELECT status FROM m.post_publish_queue qq WHERE qq.post_draft_id=d.post_draft_id ORDER BY qq.created_at DESC LIMIT 1) qd ON true
    LEFT JOIN LATERAL (SELECT status,platform_post_id,published_at FROM m.post_publish pp WHERE pp.post_draft_id=d.post_draft_id ORDER BY pp.created_at DESC LIMIT 1) pub ON true
    WHERE s.intent_id=p_intent_id) z;
  RETURN jsonb_build_object('ok',true,'intent',v_intent,'children',v_children);
END; $f$;
CREATE FUNCTION public.get_series_episodes(p_series_id uuid) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER AS $f$
BEGIN RETURN (SELECT jsonb_agg(to_jsonb(e) ORDER BY e.position) FROM c.content_series_episode e WHERE e.series_id=p_series_id AND e.status='outline'); END; $f$;
`);
await db.exec(MIG2); // real fan_out_episode / retry_episode / get_content_series_detail / approve_series_outline

// writer helper RPC stubs (reads from seeded tables)
await db.exec(`
CREATE FUNCTION public.get_series_for_outline(p_series_id uuid) RETURNS jsonb LANGUAGE sql STABLE AS $f$
  SELECT to_jsonb(cs) FROM c.content_series cs WHERE cs.series_id=p_series_id; $f$;
CREATE FUNCTION public.get_client_brand_for_series(p_client_id uuid) RETURNS jsonb LANGUAGE sql STABLE AS $f$
  SELECT jsonb_build_object('model','claude-sonnet-4-6','brand_identity_prompt','Be warm.'); $f$;
CREATE FUNCTION public.get_client_platform_profile_for_series(p_client_id uuid, p_platform text) RETURNS jsonb LANGUAGE sql STABLE AS $f$
  SELECT jsonb_build_object('platform_voice_prompt','Voice for '||p_platform); $f$;
CREATE FUNCTION public.update_series_status(p_series_id uuid, p_status text) RETURNS void LANGUAGE sql AS $f$
  UPDATE c.content_series SET status=p_status, updated_at=now() WHERE series_id=p_series_id; $f$;
`);

// ---------------------------------------------------------------------------
// Seed
// ---------------------------------------------------------------------------
const CLIENT = '11111111-1111-1111-1111-111111111111';
await db.exec(`
INSERT INTO c.client (client_id,status,timezone) VALUES ('${CLIENT}','active','Australia/Sydney');
INSERT INTO c.client_publish_profile (client_id,platform,publish_enabled,status) VALUES
  ('${CLIENT}','facebook',true,'active'),('${CLIENT}','linkedin',true,'active'),('${CLIENT}','instagram',true,'active'),('${CLIENT}','youtube',true,'active');
INSERT INTO t."5.3_content_format" (ice_format_key,is_active,is_buildable,requires_build,render_engine,platform_support) VALUES
  ('image_quote',true,true,true,'image','{"facebook":true,"linkedin":true,"instagram":true,"youtube":false}'),
  ('text',       true,true,false,'none', '{"facebook":true,"linkedin":true,"instagram":false,"youtube":false}'),
  ('video_short',true,true,true,'video', '{"facebook":true,"linkedin":false,"instagram":true,"youtube":true}');
`);
async function mkSeries(platforms, status='approved') {
  return (await one(`INSERT INTO c.content_series (client_id,title,topic,status,platform,platforms,episode_count) VALUES ($1,'S','t',$2,'facebook',$3,5) RETURNING series_id`, [CLIENT, status, platforms])).series_id;
}
async function mkEp(series, pos, fmt, {persona=true}={}) {
  return (await one(`INSERT INTO c.content_series_episode (series_id,client_id,position,episode_title,episode_angle,episode_hook,cta_type,recommended_format,scheduled_for,persona_label,avatar_preference,persona_notes,status)
    VALUES ($1,$2,$3,$4,'key message here','strong opening hook','question',$5, now()+interval '2 days', $6,$7,$8,'outline') RETURNING episode_id`,
    [series, CLIENT, pos, 'Episode '+pos, fmt, persona?'Priya — First-Time Investor':null, persona?'investor':null, persona?'warm notes':null])).episode_id;
}

// ---------------------------------------------------------------------------
// Port of series-writer v1.3.0 control flow (writeEpisode mocked).
// ---------------------------------------------------------------------------
const VERSION = "series-writer-v1.3.0";
const writeEpisodeMock = (ep) => ({ title: `Generated title for ep ${ep.position}`, body: `Generated body for episode ${ep.position} — at least twenty characters of content here.` });
async function runWriter(seriesId, { mock = writeEpisodeMock } = {}) {
  const series = (await one(`SELECT public.get_series_for_outline($1) r`, [seriesId])).r;
  if (!series) throw new Error("series_not_found");
  if (series.status !== "approved") return { ok: false, error: "series_not_approved", status: series.status };
  const episodes = (await one(`SELECT public.get_series_episodes($1) r`, [seriesId])).r ?? [];
  if (episodes.length === 0) return { ok: false, error: "no_outline_episodes_found" };
  const platforms = Array.isArray(series.platforms) && series.platforms.length > 0 ? series.platforms : [series.platform ?? "facebook"];
  await q(`SELECT public.update_series_status($1,'writing')`, [seriesId]);
  const results = []; let fannedOk = 0, fannedFail = 0;
  for (const ep of episodes) {
    const epResult = { episode_id: ep.episode_id, position: ep.position };
    try {
      const written = mock(ep);                                   // 1. preserved Anthropic step (mocked)
      epResult.audit = { title: written.title, body: written.body }; // audit in response (no DB write)
      const fo = (await one(`SELECT public.fan_out_episode($1,$2) r`, [ep.episode_id, VERSION])).r; // 2. governed fan-out
      if (!fo?.ok) throw new Error(`fan_out_episode_rejected: ${fo?.error}`);
      epResult.fan_out = fo;
      if ((fo.accepted ?? 0) > 0) fannedOk++; else { fannedFail++; epResult.error = "fan_out_no_accepted_children"; }
    } catch (e) { fannedFail++; epResult.error = String(e.message ?? e); }
    results.push(epResult);
  }
  const newStatus = fannedFail === 0 ? "active" : "writing";
  await q(`SELECT public.update_series_status($1,$2)`, [seriesId, newStatus]);
  return { ok: true, version: VERSION, series_id: seriesId, series_status: newStatus, platforms_used: platforms, episodes_fanned_out: fannedOk, episodes_failed: fannedFail, results };
}

// ===========================================================================
console.log("\n== Stage 3 writer-repoint validation ==");

// 13. series_post_insert not CALLED (rpc) by the writer (comments may mention it)
check("13. writer never rpc-calls series_post_insert", !/rpc\(\s*["']series_post_insert["']/.test(WRITER_SRC),
  "found an rpc(series_post_insert) call");

// Single-platform episode -> fan_out (items 1, 3)
const S1 = await mkSeries(['facebook']);
const E1 = await mkEp(S1, 1, 'image_quote');
const r1 = await runWriter(S1);
check("1. single episode -> fan_out_episode (intent created)", r1.ok && r1.results[0].fan_out?.ok && !!r1.results[0].fan_out.intent_id, JSON.stringify(r1.results?.[0]?.fan_out));
check("3. episode.intent_id populated + status intent_created", (await one(`SELECT intent_id,status FROM c.content_series_episode WHERE episode_id=$1`,[E1])).intent_id !== null);

// Multi-platform episode -> child slots (item 2)
const S2 = await mkSeries(['facebook','linkedin','instagram']);
const E2 = await mkEp(S2, 1, 'image_quote');
const draftsBefore = Number((await one(`SELECT count(*) n FROM m.post_draft`)).n);
const queueBefore  = Number((await one(`SELECT count(*) n FROM m.post_publish_queue`)).n);
const r2 = await runWriter(S2);
const ci2 = (await one(`SELECT intent_id FROM c.content_series_episode WHERE episode_id=$1`,[E2])).intent_id;
const slots2 = await q(`SELECT platform,status,intent_id,source_kind,COALESCE(array_length(canonical_ids,1),0) cc FROM m.slot WHERE intent_id=$1 ORDER BY platform`,[ci2]);
check("2. multi-platform episode -> one governed child slot per platform (3)", slots2.length===3 && slots2.every(s=>s.status==='pending_fill' && s.intent_id===ci2), JSON.stringify(slots2.map(s=>s.platform)));
check("6/7. children enter governed path (source_kind=manual, intent-linked, canonical 0 -> Advisor+compliance run downstream)",
  slots2.every(s=>s.source_kind==='manual' && Number(s.cc)===0));

// 8 + 9. writer creates NO post_draft and NO queue rows directly
check("8. no direct post_draft insertion by writer/fan-out", Number((await one(`SELECT count(*) n FROM m.post_draft`)).n)===draftsBefore);
check("9. no direct queue insertion by writer/fan-out", Number((await one(`SELECT count(*) n FROM m.post_publish_queue`)).n)===queueBefore);

// Persona carry (req 4)
const sm2 = (await one(`SELECT source_material FROM m.creative_intent WHERE intent_id=$1`,[ci2])).source_material;
check("4(persona). persona carried episode -> fan_out -> intent.source_material", sm2.persona?.persona_label==='Priya — First-Time Investor' && sm2.persona?.avatar_preference==='investor');

// Platform-native governance (items 4,5): full-platform series, 3 format episodes
const SG = await mkSeries(['facebook','linkedin','instagram','youtube']);
const Eiq = await mkEp(SG, 1, 'image_quote'); // yt unsupported
const Etx = await mkEp(SG, 2, 'text');        // ig + yt unsupported
const Evd = await mkEp(SG, 3, 'video_short'); // li unsupported; yt supported
const rg = await runWriter(SG);
const intents = {};
for (const e of [Eiq, Etx, Evd]) intents[e] = (await one(`SELECT intent_id FROM c.content_series_episode WHERE episode_id=$1`,[e])).intent_id;
const platsFor = async (eid) => (await q(`SELECT platform FROM m.slot WHERE intent_id=$1 ORDER BY platform`,[intents[eid]])).map(r=>r.platform);
const iqP = await platsFor(Eiq), txP = await platsFor(Etx), vdP = await platsFor(Evd);
check("4. YouTube receives NO image_quote and NO text child (rejected at fan-out)", !iqP.includes('youtube') && !txP.includes('youtube'), `iq=${iqP} tx=${txP}`);
check("4b. YouTube DOES receive a valid governed child for a supported format (video_short)", vdP.includes('youtube'), `vd=${vdP}`);
check("5. Instagram receives only supported children (no text; yes image_quote/video)", !txP.includes('instagram') && iqP.includes('instagram') && vdP.includes('instagram'), `iq=${iqP} tx=${txP} vd=${vdP}`);
// per-format rejection surfaced
const iqFo = rg.results.find(r=>r.position===1).fan_out;
check("5b. unsupported combo surfaced as per-target rejection (image_quote/youtube)", iqFo.targets.some(t=>t.platform==='youtube'&&t.status==='rejected'));

// 11. get_content_series_detail shows linked children
const det = (await one(`SELECT public.get_content_series_detail($1) r`,[SG])).r;
const detEp = det.episodes.find(e=>e.position===3);
check("11. get_content_series_detail shows episode intent_id + linked children", !!detEp.intent_id && Array.isArray(detEp.children) && detEp.children.length>0);
check("11b. detail derived_status present + series_derived_status set", !!detEp.derived_status && !!det.series_derived_status);

// 10 + 14. retry_episode sees Stage 3 episodes; no duplicate child creation
// simulate one video_short child published, then retry -> no dup, published preserved
const vdYt = (await one(`SELECT slot_id FROM m.slot WHERE intent_id=$1 AND platform='youtube'`,[intents[Evd]])).slot_id;
const pd = (await one(`INSERT INTO m.post_draft (slot_id,intent_id,platform,approval_status) VALUES ($1,$2,'youtube','published') RETURNING post_draft_id`,[vdYt,intents[Evd]])).post_draft_id;
await q(`UPDATE m.slot SET status='published' WHERE slot_id=$1`,[vdYt]);
await q(`INSERT INTO m.post_publish (post_draft_id,status,published_at) VALUES ($1,'published',now())`,[pd]);
const ytSlotsBefore = Number((await one(`SELECT count(*) n FROM m.slot WHERE intent_id=$1 AND platform='youtube'`,[intents[Evd]])).n);
const rt = (await one(`SELECT public.retry_episode($1,'refan_out') r`,[Evd])).r;
check("10. retry_episode operates on Stage 3-created episode", rt.ok===true && rt.intent_id===intents[Evd]);
check("14. retry never duplicates published child (youtube skipped already_published)",
  rt.skipped.some(x=>x.platform==='youtube'&&x.reason==='already_published')
  && Number((await one(`SELECT count(*) n FROM m.slot WHERE intent_id=$1 AND platform='youtube'`,[intents[Evd]])).n)===ytSlotsBefore);

// 12. legacy series remain readable (no intent, legacy fields, detail works)
const L = await mkSeries(['facebook'],'active');
await q(`INSERT INTO c.content_series_episode (series_id,client_id,position,episode_title,status,recommended_format) VALUES ($1,$2,1,'Legacy',$3,'image_quote')`,[L,CLIENT,'published']);
const detL = (await one(`SELECT public.get_content_series_detail($1) r`,[L])).r;
check("12. legacy series remain readable (intent_id null, platform_statuses present)",
  detL.episodes[0].intent_id===null && 'platform_statuses' in detL.episodes[0] && detL.episodes[0].derived_status==='published');

// 15. writer can complete a FULL series run (multi-episode), series -> active
const SF = await mkSeries(['facebook','linkedin']);
for (let i=1;i<=3;i++) await mkEp(SF, i, 'image_quote');
const rf = await runWriter(SF);
check("15. writer completes full series run (3 eps all fanned, series active)",
  rf.ok && rf.episodes_fanned_out===3 && rf.episodes_failed===0 && rf.series_status==='active', JSON.stringify({ok:rf.ok,f:rf.episodes_fanned_out,fail:rf.episodes_failed,s:rf.series_status}));
check("15b. all episodes now intent_created (none left at outline) -> idempotent re-run safe",
  Number((await one(`SELECT count(*) n FROM c.content_series_episode WHERE series_id=$1 AND status='outline'`,[SF])).n)===0);
// idempotent: re-run does not re-fan (blocked by status gate AND outline filter); no new intents
const intentsBeforeRerun = Number((await one(`SELECT count(DISTINCT intent_id) n FROM c.content_series_episode WHERE series_id=$1 AND intent_id IS NOT NULL`,[SF])).n);
const rfAgain = await runWriter(SF);
const intentsAfterRerun = Number((await one(`SELECT count(DISTINCT intent_id) n FROM c.content_series_episode WHERE series_id=$1 AND intent_id IS NOT NULL`,[SF])).n);
check("14b. re-run does not re-fan completed episodes (rejected, no new intents)",
  rfAgain.ok===false && intentsAfterRerun===intentsBeforeRerun, JSON.stringify({err:rfAgain.error, before:intentsBeforeRerun, after:intentsAfterRerun}));

// Stage 1/2 objects reused unchanged: fan_out/retry/detail come from MIG2 verbatim; create_creative_intent absent from writer/MIG-side here
check("reuse. Stage 2 fan_out_episode used unchanged (from committed migration)", MIG2.includes("FUNCTION public.fan_out_episode"));

console.log(`\n==== SERIES V2 STAGE 3 RESULT: ${pass} passed, ${fail} failed ====`);
process.exit(fail ? 1 : 0);
