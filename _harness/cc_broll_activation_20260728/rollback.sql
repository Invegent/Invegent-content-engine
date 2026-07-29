-- ============================================================================================
-- ROLLBACK — B-roll Production Activation v1 (Route A) — REV 3
-- Restores the EXACT pre-apply values of fit_status / fit_reason / reviewed_by / reviewed_at on all
-- 3 rows, returning PP governed video_short_stat selection to incumbent a3d8472d.
-- (`updated_at` is deliberately set to now(), NOT restored — nothing reads it; see packet.)
--
-- APPLY CHANNEL (named): ONE `mcp supabase execute_sql` call carrying this entire file.
--
-- SELF-VERIFYING + FAIL-CLOSED, and SYMMETRIC with forward.sql:
--   (0a) exactly 3 video_short_stat candidate rows                            else ABORT
--   (0b) identity+fit_status pre-image must be the POST-APPLY state           else ABORT
--        (refuses to run against a state it did not create)
--   (0d) atomicity guard ARMED (transaction-local)
--   (1)  atomicity guard RE-ASSERTED **BEFORE** any mutation (preventive),
--        then each UPDATE guarded on id+template_id+format_key+variant_key+expected fit_status,
--        each must affect EXACTLY 1 row                                       else ABORT
--   (2)  atomicity guard re-asserted (detective) + winner must be back to a3d8472d else ABORT
-- Any RAISE rolls back the whole transaction; nothing is committed.
--
-- REV-3 hardening (round-2 review): the rollback now carries its OWN txid atomicity guard, asserted
-- before mutation (SF-4/AHA-02-1 — it is the emergency path and was previously unguarded), every
-- UPDATE carries `format_key`, and the pre-image check pins the row IDENTITY set (AHA-02-2/SF-6).
-- ============================================================================================

BEGIN;

-- ---- (0) EXPECT THE POST-APPLY STATE ---------------------------------------------------------
DO $precheck$
DECLARE
  v_n   int;
  v_pre text;
  -- Identity-pinned. fit_reason/reviewed_at are NOT digested here because the apply writes
  -- reviewed_at = now(), which is inherently non-freezable; fit_status + identity is the
  -- deterministic post-apply signature.
  c_expected CONSTANT text :=
    '8b611275-ea75-4663-a411-f05a329dfd5d|dd5fd75e-982d-4c3d-89cd-7ce0936076b2|stat-reveal-9x16-broll-v1=strong_candidate,'
    'b61e2f15-0213-4db8-b401-8629ae11313a|a3d8472d-9438-4312-9f11-b6a920be4014|stat-reveal-9x16-video-v2=candidate,'
    'dee47d2e-7a65-424f-a389-3165f8c22bd2|4cd2c9e2-bb55-4a71-9f13-cb2e1c41e958|stat-reveal-9x16-governed-av-v2=candidate';
BEGIN
  SELECT count(*) INTO v_n
  FROM c.creative_template_variant_candidate WHERE format_key = 'video_short_stat';
  IF v_n <> 3 THEN
    RAISE EXCEPTION 'ABORT (0a): expected exactly 3 video_short_stat candidate rows, found %.', v_n;
  END IF;

  SELECT string_agg(id::text||'|'||template_id::text||'|'||variant_key||'='||fit_status, ',' ORDER BY id)
  INTO v_pre
  FROM c.creative_template_variant_candidate WHERE format_key = 'video_short_stat';

  IF v_pre IS DISTINCT FROM c_expected THEN
    RAISE EXCEPTION 'ABORT (0b): not in the post-apply state this rollback reverses. expected [%] got [%]. Do NOT force — reconcile by hand.', c_expected, v_pre;
  END IF;

  -- (0d) Arm the atomicity guard (transaction-local).
  PERFORM set_config('ice.rollback_txid', txid_current()::text, true);

  RAISE NOTICE '(0) rollback pre-image OK · txid guard armed: %', txid_current();
END
$precheck$;

-- ---- (1) RESTORE THE EXACT PRE-APPLY PRE-IMAGE -----------------------------------------------
DO $restore$
DECLARE v_rows int; v_armed text;
BEGIN
  -- (1z) PREVENTIVE atomicity guard — abort before writing anything if the file was split.
  v_armed := current_setting('ice.rollback_txid', true);
  IF v_armed IS NULL OR v_armed = '' THEN
    RAISE EXCEPTION 'ABORT (1z): atomicity guard ABSENT before mutation — step (0) did not run in THIS transaction. The file was split across calls/connections. NOTHING has been written.';
  END IF;
  IF v_armed IS DISTINCT FROM txid_current()::text THEN
    RAISE EXCEPTION 'ABORT (1z): atomicity guard MISMATCH before mutation (armed=% current=%). NOTHING has been written.', v_armed, txid_current();
  END IF;

  -- 1a. B-roll variant back to 'candidate' with its original Slice-B reason + NULL reviewed_at.
  UPDATE c.creative_template_variant_candidate
     SET fit_status  = 'candidate',
         fit_reason  = 'Slice B contained proof — B-roll video Background variant; intent-only selection (never default-wins)',
         reviewed_by = 'PK',
         reviewed_at = NULL,
         updated_at  = now()
   WHERE id = '8b611275-ea75-4663-a411-f05a329dfd5d'
     AND template_id = 'dd5fd75e-982d-4c3d-89cd-7ce0936076b2'
     AND format_key  = 'video_short_stat'
     AND variant_key = 'stat-reveal-9x16-broll-v1'
     AND fit_status  = 'strong_candidate';   -- symmetry with forward: concurrent drift ⇒ 0 rows ⇒ ABORT
  GET DIAGNOSTICS v_rows = ROW_COUNT;
  IF v_rows <> 1 THEN RAISE EXCEPTION 'ABORT (1a): expected 1 row, got %', v_rows; END IF;

  -- 1b. Incumbent 1 back to strong_candidate, original reason + original reviewed_at.
  UPDATE c.creative_template_variant_candidate
     SET fit_status  = 'strong_candidate',
         fit_reason  = 'D6 Lane 2 — direct-bind variant promoted to spine mapping (baked-bg, logo-only slot)',
         reviewed_by = 'PK',
         reviewed_at = '2026-07-19 01:08:00.4319+00'::timestamptz,
         updated_at  = now()
   WHERE id = 'b61e2f15-0213-4db8-b401-8629ae11313a'
     AND template_id = 'a3d8472d-9438-4312-9f11-b6a920be4014'
     AND format_key  = 'video_short_stat'
     AND variant_key = 'stat-reveal-9x16-video-v2'
     AND fit_status  = 'candidate';   -- symmetry with forward: concurrent drift ⇒ 0 rows ⇒ ABORT
  GET DIAGNOSTICS v_rows = ROW_COUNT;
  IF v_rows <> 1 THEN RAISE EXCEPTION 'ABORT (1b): expected 1 row, got %', v_rows; END IF;

  -- 1c. Incumbent 2 back to strong_candidate, original reason + original reviewed_at.
  UPDATE c.creative_template_variant_candidate
     SET fit_status  = 'strong_candidate',
         fit_reason  = 'Route A governed-AV template; governed keys (Logo/VoiceAudio/MusicBed + 4 text) bind — proven at 2A.',
         reviewed_by = 'PK',
         reviewed_at = '2026-07-26 07:35:25.966026+00'::timestamptz,
         updated_at  = now()
   WHERE id = 'dee47d2e-7a65-424f-a389-3165f8c22bd2'
     AND template_id = '4cd2c9e2-bb55-4a71-9f13-cb2e1c41e958'
     AND format_key  = 'video_short_stat'
     AND variant_key = 'stat-reveal-9x16-governed-av-v2'
     AND fit_status  = 'candidate';   -- symmetry with forward: concurrent drift ⇒ 0 rows ⇒ ABORT
  GET DIAGNOSTICS v_rows = ROW_COUNT;
  IF v_rows <> 1 THEN RAISE EXCEPTION 'ABORT (1c): expected 1 row, got %', v_rows; END IF;

  RAISE NOTICE '(1) restore OK: 3 rows reverted';
END
$restore$;

-- ---- (2) POST-STATE SELF-VERIFY --------------------------------------------------------------
DO $postverify$
DECLARE v_win uuid; v_armed text; v_full text;
  c_expected_full CONSTANT text := '962043fb55bdd2a1a9e5d0a8718118e0';
BEGIN
  v_armed := current_setting('ice.rollback_txid', true);
  IF v_armed IS NULL OR v_armed = '' OR v_armed IS DISTINCT FROM txid_current()::text THEN
    RAISE EXCEPTION 'ABORT (2z): atomicity guard failed (armed=% current=%).', v_armed, txid_current();
  END IF;

  -- Prove the restore is DIGEST-EXACT against the same frozen pre-image the apply asserted.
  SELECT md5(string_agg(
           id::text||'|'||template_id::text||'|'||format_key||'|'||variant_key||'|'||fit_status||'|'
           ||coalesce(fit_reason,'<null>')||'|'||coalesce(reviewed_by,'<null>')||'|'
           ||coalesce(to_char(reviewed_at AT TIME ZONE 'UTC','YYYY-MM-DD HH24:MI:SS.US'),'<null>'),
           chr(10) ORDER BY id))
  INTO v_full
  FROM c.creative_template_variant_candidate WHERE format_key = 'video_short_stat';

  IF v_full IS DISTINCT FROM c_expected_full THEN
    RAISE EXCEPTION 'ABORT (2a): restore is NOT digest-exact to the frozen pre-image (expected %, got %). The rollback literals do not reproduce the original state — reconcile by hand.', c_expected_full, v_full;
  END IF;

  SELECT (public.select_template('property-pulse', NULL, 'video_short_stat', NULL, 'rollback-postverify')
          -> 'selected' ->> 'template_id')::uuid
  INTO v_win;
  IF v_win IS DISTINCT FROM 'a3d8472d-9438-4312-9f11-b6a920be4014'::uuid THEN
    RAISE EXCEPTION 'ABORT (2b): post-rollback winner is %, expected incumbent a3d8472d.', v_win;
  END IF;

  RAISE NOTICE '(2) rollback post-verify OK: digest-exact restore · incumbent a3d8472d wins again';
END
$postverify$;

COMMIT;
