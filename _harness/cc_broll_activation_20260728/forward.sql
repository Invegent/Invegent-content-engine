-- ============================================================================================
-- B-roll Production Activation v1 — ROUTE A (repoint PP governed video_short_stat to B-roll)
-- REV 3. Tier T3 · DML ONLY on c.creative_template_variant_candidate (3 rows) · NO DDL · NO EF deploy
-- Brief: docs/briefs/broll-production-activation-v1-gate1-brief.md (PK Gate-1 approved 2026-07-28)
--
-- APPLY CHANNEL (named): ONE `mcp supabase execute_sql` call carrying this entire file, so the
-- BEGIN…COMMIT composes on a single pooled connection. Do NOT split across calls.
--
-- SELF-VERIFYING + FAIL-CLOSED. Every STOP below is an executable RAISE, not a comment:
--   (0a) exactly 3 video_short_stat candidate rows                          else ABORT
--   (0b) fit_status projection matches the frozen pre-image                 else ABORT
--   (0c) TZ-INVARIANT digest over id+template_id+format_key+variant_key AND every column the
--        rollback restores (fit_status, fit_reason, reviewed_by, reviewed_at)  else ABORT
--   (0d) atomicity guard ARMED (transaction-local)
--   (1)  baseline: the CURRENT winner must be the incumbent a3d8472d        else ABORT
--   (2)  atomicity guard RE-ASSERTED **BEFORE** any mutation (preventive),
--        then each UPDATE must affect EXACTLY 1 row                          else ABORT
--   (3)  atomicity guard re-asserted (detective) + winner must be dd5fd75e AND its
--        Background.source must be the governed B-roll clip (video, not a still) else ABORT
-- Any RAISE rolls back the whole transaction; nothing is committed.
--
-- REV-3 hardening (round-2 review): C0c is now timezone-invariant and pins the row IDENTITY set
-- (AHA-02-2/AHA-02-4/SF-5); every UPDATE carries `format_key` so the attested scope and the mutated
-- scope are the SAME rows (AHA-02-2); the txid guard is asserted BEFORE the mutations, making it
-- preventive rather than only detective (AHA-02-1/SF-4).
-- ============================================================================================

BEGIN;

-- ---- (0) PRE-IMAGE VERIFY-OR-ABORT ---------------------------------------------------------
DO $precheck$
DECLARE
  v_n     int;
  v_pre   text;
  v_full  text;
  c_expected CONSTANT text :=
    '4cd2c9e2-bb55-4a71-9f13-cb2e1c41e958=strong_candidate,'
    'a3d8472d-9438-4312-9f11-b6a920be4014=strong_candidate,'
    'dd5fd75e-982d-4c3d-89cd-7ce0936076b2=candidate';
  -- TZ-INVARIANT digest over the row IDENTITY (id, template_id, format_key, variant_key) plus
  -- EVERY column rollback.sql restores. Pinning `id` binds this baseline to exactly the rows the
  -- UPDATEs below mutate. `to_char(... AT TIME ZONE 'UTC')` makes it independent of session
  -- TimeZone/DateStyle, so a non-UTC session cannot cause a spurious ABORT.
  -- Digested plaintext is recorded verbatim in the apply packet for inspection.
  c_expected_full CONSTANT text := '962043fb55bdd2a1a9e5d0a8718118e0';
BEGIN
  SELECT count(*) INTO v_n
  FROM c.creative_template_variant_candidate WHERE format_key = 'video_short_stat';
  IF v_n <> 3 THEN
    RAISE EXCEPTION 'ABORT (0a): expected exactly 3 video_short_stat candidate rows, found %. A new candidate appeared since the packet was frozen — re-cut the packet.', v_n;
  END IF;

  SELECT string_agg(template_id::text || '=' || fit_status, ',' ORDER BY template_id)
  INTO v_pre
  FROM c.creative_template_variant_candidate WHERE format_key = 'video_short_stat';

  IF v_pre IS DISTINCT FROM c_expected THEN
    RAISE EXCEPTION 'ABORT (0b): fit_status pre-image mismatch. expected [%] got [%]', c_expected, v_pre;
  END IF;

  SELECT md5(string_agg(
           id::text||'|'||template_id::text||'|'||format_key||'|'||variant_key||'|'||fit_status||'|'
           ||coalesce(fit_reason,'<null>')||'|'||coalesce(reviewed_by,'<null>')||'|'
           ||coalesce(to_char(reviewed_at AT TIME ZONE 'UTC','YYYY-MM-DD HH24:MI:SS.US'),'<null>'),
           chr(10) ORDER BY id))
  INTO v_full
  FROM c.creative_template_variant_candidate WHERE format_key = 'video_short_stat';

  IF v_full IS DISTINCT FROM c_expected_full THEN
    RAISE EXCEPTION 'ABORT (0c): identity+restored-column pre-image drifted since freeze (expected md5 %, got %). rollback.sql restores hardcoded literals and would no longer restore the true pre-image — re-cut the packet. NOTE: this digest is timezone-invariant, so a session TimeZone difference is NOT a possible cause; treat this as real drift.', c_expected_full, v_full;
  END IF;

  -- (0d) Arm the atomicity guard. is_local=true ⇒ exists ONLY for the life of THIS transaction.
  PERFORM set_config('ice.apply_txid', txid_current()::text, true);

  RAISE NOTICE '(0) pre-image OK (count + fit_status + identity digest) · txid guard armed: %', txid_current();
END
$precheck$;

-- ---- (1) BASELINE: prove the incumbent wins TODAY -------------------------------------------
DO $baseline$
DECLARE v_win uuid;
BEGIN
  SELECT (public.select_template('property-pulse', NULL, 'video_short_stat', NULL, 'activation-baseline')
          -> 'selected' ->> 'template_id')::uuid
  INTO v_win;
  IF v_win IS DISTINCT FROM 'a3d8472d-9438-4312-9f11-b6a920be4014'::uuid THEN
    RAISE EXCEPTION 'ABORT (1): baseline winner is %, expected incumbent a3d8472d. Ranking model invalid — STOP.', v_win;
  END IF;
  RAISE NOTICE '(1) baseline OK: incumbent a3d8472d wins pre-change';
END
$baseline$;

-- ---- (2) THE REPOINT: 3 rows, each asserted --------------------------------------------------
DO $repoint$
DECLARE v_rows int; v_armed text;
BEGIN
  -- (2z) PREVENTIVE atomicity guard — assert BEFORE any mutation, so a split execution aborts
  -- with NOTHING written rather than stranding a half-applied repoint.
  v_armed := current_setting('ice.apply_txid', true);
  IF v_armed IS NULL OR v_armed = '' THEN
    RAISE EXCEPTION 'ABORT (2z): atomicity guard ABSENT before mutation — step (0) did not run in THIS transaction. The file was split across calls/connections. NOTHING has been written.';
  END IF;
  IF v_armed IS DISTINCT FROM txid_current()::text THEN
    RAISE EXCEPTION 'ABORT (2z): atomicity guard MISMATCH before mutation (armed=% current=%). NOTHING has been written.', v_armed, txid_current();
  END IF;

  -- 2a. PROMOTE the B-roll variant into the strong bucket.
  UPDATE c.creative_template_variant_candidate
     SET fit_status = 'strong_candidate',
         fit_reason = 'B-roll Production Activation v1 (Route A, PK 2026-07-28): promoted to PP default for video_short_stat. Supersedes intent-only containment.',
         reviewed_by = 'PK',
         reviewed_at = now(),
         updated_at  = now()
   WHERE id = '8b611275-ea75-4663-a411-f05a329dfd5d'
     AND template_id = 'dd5fd75e-982d-4c3d-89cd-7ce0936076b2'
     AND format_key  = 'video_short_stat'
     AND variant_key = 'stat-reveal-9x16-broll-v1'
     AND fit_status  = 'candidate';
  GET DIAGNOSTICS v_rows = ROW_COUNT;
  IF v_rows <> 1 THEN RAISE EXCEPTION 'ABORT (2a): expected 1 row, got %', v_rows; END IF;

  -- 2b. DEMOTE incumbent 1 (this is what actually lets B-roll win — see brief §Live mechanics).
  UPDATE c.creative_template_variant_candidate
     SET fit_status = 'candidate',
         fit_reason = 'B-roll Production Activation v1 (Route A, PK 2026-07-28): demoted from strong_candidate so the B-roll variant ranks first. Remains fully selectable as fallback.',
         reviewed_by = 'PK',
         reviewed_at = now(),
         updated_at  = now()
   WHERE id = 'b61e2f15-0213-4db8-b401-8629ae11313a'
     AND template_id = 'a3d8472d-9438-4312-9f11-b6a920be4014'
     AND format_key  = 'video_short_stat'
     AND variant_key = 'stat-reveal-9x16-video-v2'
     AND fit_status  = 'strong_candidate';
  GET DIAGNOSTICS v_rows = ROW_COUNT;
  IF v_rows <> 1 THEN RAISE EXCEPTION 'ABORT (2b): expected 1 row, got %', v_rows; END IF;

  -- 2c. DEMOTE incumbent 2.
  UPDATE c.creative_template_variant_candidate
     SET fit_status = 'candidate',
         fit_reason = 'B-roll Production Activation v1 (Route A, PK 2026-07-28): demoted from strong_candidate so the B-roll variant ranks first. Remains fully selectable as fallback.',
         reviewed_by = 'PK',
         reviewed_at = now(),
         updated_at  = now()
   WHERE id = 'dee47d2e-7a65-424f-a389-3165f8c22bd2'
     AND template_id = '4cd2c9e2-bb55-4a71-9f13-cb2e1c41e958'
     AND format_key  = 'video_short_stat'
     AND variant_key = 'stat-reveal-9x16-governed-av-v2'
     AND fit_status  = 'strong_candidate';
  GET DIAGNOSTICS v_rows = ROW_COUNT;
  IF v_rows <> 1 THEN RAISE EXCEPTION 'ABORT (2c): expected 1 row, got %', v_rows; END IF;

  RAISE NOTICE '(2) repoint OK: 3 rows updated';
END
$repoint$;

-- ---- (3) POST-STATE SELF-VERIFY --------------------------------------------------------------
-- Asserts the OUTCOME, not the intent: B-roll must actually win the production call signature,
-- and must actually resolve a VIDEO clip (guards the v1.3-class "video field filled with a still").
DO $postverify$
DECLARE
  v_sel   jsonb;
  v_win   uuid;
  v_bg    text;
  v_status text;
  v_armed text;
BEGIN
  -- (3z) atomicity guard, detective pass — proves (0)…(3) were ONE transaction.
  v_armed := current_setting('ice.apply_txid', true);
  IF v_armed IS NULL OR v_armed = '' THEN
    RAISE EXCEPTION 'ABORT (3z): atomicity guard ABSENT — the file was split across calls/connections. STOP: verify whether step (2) committed on its own before doing anything else.';
  END IF;
  IF v_armed IS DISTINCT FROM txid_current()::text THEN
    RAISE EXCEPTION 'ABORT (3z): atomicity guard MISMATCH (armed=% current=%) — steps did not compose in one transaction.', v_armed, txid_current();
  END IF;

  v_sel := public.select_template('property-pulse', NULL, 'video_short_stat', NULL, 'activation-postverify');

  v_status := v_sel ->> 'status';
  IF v_status IS DISTINCT FROM 'ok' THEN
    RAISE EXCEPTION 'ABORT (3a): select_template status=% (fail_reason=%)', v_status, v_sel ->> 'fail_reason';
  END IF;

  v_win := (v_sel -> 'selected' ->> 'template_id')::uuid;
  IF v_win IS DISTINCT FROM 'dd5fd75e-982d-4c3d-89cd-7ce0936076b2'::uuid THEN
    RAISE EXCEPTION 'ABORT (3b): post-change winner is %, expected B-roll dd5fd75e. Repoint did not take effect — STOP.', v_win;
  END IF;

  v_bg := v_sel -> 'slot_resolution' -> 'modifications' ->> 'Background.source';
  IF v_bg IS NULL THEN
    RAISE EXCEPTION 'ABORT (3c): winner resolved no Background.source';
  END IF;
  IF v_bg NOT LIKE '%/Broll/%' OR v_bg NOT LIKE '%.mp4' THEN
    RAISE EXCEPTION 'ABORT (3c): Background.source is not a governed B-roll VIDEO clip: %', v_bg;
  END IF;

  RAISE NOTICE '(3) post-verify OK: winner=dd5fd75e background=%', v_bg;
END
$postverify$;

COMMIT;
