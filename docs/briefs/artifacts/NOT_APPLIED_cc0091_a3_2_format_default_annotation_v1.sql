-- cc-0091 A3-2 — format-default annotation at the fill site (FORWARD)
--
-- STATUS: NOT APPLIED. Authored under cc-0091 Gate A (brief v3, ISSUED 2026-08-08).
--         Gate A applies nothing and changes no live behaviour.
-- ROLLBACK: NOT_APPLIED_cc0091_a3_2_format_default_annotation_ROLLBACK_v1.sql
--
-- ─── What this records ────────────────────────────────────────────────────────
-- m.fill_pending_slots resolves a slot's format with
--   COALESCE(v_slot.format_preference[1], 'image_quote')
-- at four sites. When no preference survives, the slot silently becomes a static post
-- and m.slot_fill_attempt records decision='filled', chosen_format='image_quote' — with
-- nothing distinguishing "image_quote was requested" from "image_quote was the default".
--
-- Measured: 909 of 1157 'filled' attempts in the last 60 days chose image_quote. How many
-- were genuine requests versus silent defaults is currently UNANSWERABLE. This closes that.
--
-- ─── Why a TRIGGER and not a rewrite of m.fill_pending_slots ─────────────────
-- The obvious implementation is CREATE OR REPLACE on m.fill_pending_slots to annotate at
-- each of the four COALESCE sites. That function is 34 KB on the nightly publish path and
-- a full-body reproduction to add annotation is a large, high-blast-radius diff for a
-- purely observational change.
--
-- Instead: a BEFORE INSERT trigger on m.slot_fill_attempt, which is where the fill is
-- already recorded (verified: decision='filled' rows exist, 1157 in 60 days, and
-- pool_snapshot is already populated on 100% of them).
--   * m.fill_pending_slots stays BYTE-UNCHANGED — zero diff on the nightly path.
--   * Purely additive: one function, one trigger.
--   * decision, skip_reason, chosen_format are NEVER modified. The S9 capability gate and
--     every existing consumer of this table are byte-unaffected. Annotation only.
--   * pool_snapshot is MERGED into under a namespaced key, never overwritten.
--
-- ─── Fail-open by construction ────────────────────────────────────────────────
-- A BEFORE trigger that raises would ABORT the insert and break slot filling. The
-- annotation body is therefore wrapped in its own EXCEPTION block that swallows any
-- error, emits a WARNING, and returns NEW unmodified. An observability feature must
-- never be able to take down the production path it observes.
-- This mirrors the exception discipline already used inside m.fill_pending_slots, where
-- the classifier call is wrapped so a defect cannot abort the whole batch transaction.
--
-- ─── What this does NOT do ────────────────────────────────────────────────────
--   * Does NOT change which slot fills, or with what. Volume and output are identical.
--     (PK Option A: fill with fallback, RECORD the degradation.)
--   * Does NOT recover the originally requested format. By the time m.fill_pending_slots
--     runs, a format dropped upstream is unrecoverable — that is A3-1's and A3-3's job.
--     A3-2 can only state "this fill was a default, not a request", which is precisely the
--     fact that is missing today.
--   * Does NOT write to m.format_capability_drop. The annotation lives with the attempt.

BEGIN;

CREATE OR REPLACE FUNCTION m.tg_annotate_format_default()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $function$
DECLARE
  v_pref text[];
BEGIN
  -- EXCEPTION SCOPE IS DELIBERATELY MINIMAL and wraps ONLY the annotation. A failure
  -- here must never prevent the slot-fill attempt from being recorded.
  BEGIN
    SELECT s.format_preference INTO v_pref
      FROM m.slot s
     WHERE s.slot_id = NEW.slot_id;

    -- A default was taken iff the slot carried NO surviving preference. A slot whose
    -- preference is explicitly ['image_quote'] is a genuine request and is NOT annotated —
    -- this is the distinction that does not exist in the data today.
    IF array_length(v_pref, 1) IS NULL AND NEW.chosen_format IS NOT NULL THEN
      NEW.pool_snapshot := COALESCE(NEW.pool_snapshot, '{}'::jsonb)
        || jsonb_build_object(
             'cc0091_a3_2',
             jsonb_build_object(
               'format_defaulted', true,
               'requested_format', NULL,          -- unrecoverable here, by design
               'applied_format',   NEW.chosen_format,
               'reason',           'no_surviving_format_preference',
               'annotated_at',     now()
             )
           );
    END IF;
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING '[cc-0091 A3-2] annotation skipped slot=% sqlstate=% sqlerrm=%',
      NEW.slot_id, SQLSTATE, left(SQLERRM, 200);
  END;

  RETURN NEW;   -- always; annotated or not, the row is written unchanged otherwise
END;
$function$;

COMMENT ON FUNCTION m.tg_annotate_format_default() IS
  'cc-0091 A3-2. Annotates m.slot_fill_attempt.pool_snapshot under key ''cc0091_a3_2'' when '
  'a fill took the COALESCE(format_preference[1],''image_quote'') default rather than an '
  'explicit request. Never modifies decision, skip_reason or chosen_format. Fail-open: any '
  'error is swallowed with a WARNING so the fill path cannot be broken by observability.';

CREATE TRIGGER tg_slot_fill_attempt_annotate_format_default
  BEFORE INSERT ON m.slot_fill_attempt
  FOR EACH ROW
  EXECUTE FUNCTION m.tg_annotate_format_default();

-- Operator/dashboard read: which fills were defaults rather than requests.
CREATE OR REPLACE VIEW ice_ro.slot_format_default_status AS
SELECT a.attempted_at,
       a.slot_id,
       a.decision,
       a.chosen_format,
       (a.pool_snapshot -> 'cc0091_a3_2' ->> 'format_defaulted')::boolean AS format_defaulted,
       a.pool_snapshot -> 'cc0091_a3_2' ->> 'reason'                      AS default_reason
  FROM m.slot_fill_attempt a;

COMMENT ON VIEW ice_ro.slot_format_default_status IS
  'cc-0091 A3-2. Distinguishes a fill that took the image_quote DEFAULT from one that '
  'filled an explicitly requested format. format_defaulted IS NULL for rows written before '
  'this trigger existed — NULL means "unknown", never "was not a default".';

REVOKE ALL ON ice_ro.slot_format_default_status FROM PUBLIC;
REVOKE ALL ON ice_ro.slot_format_default_status FROM anon;
REVOKE ALL ON ice_ro.slot_format_default_status FROM authenticated;
GRANT SELECT ON ice_ro.slot_format_default_status TO ice_readonly;

COMMIT;

-- ── POST-APPLY VERIFICATION ──────────────────────────────────────────────────
-- 1. m.fill_pending_slots is BYTE-UNCHANGED (this migration never touched it):
--    SELECT md5(pg_get_functiondef(p.oid)) FROM pg_proc p
--      JOIN pg_namespace n ON n.oid=p.pronamespace
--     WHERE n.nspname='m' AND p.proname='fill_pending_slots';
--    -- compare against the pre-apply md5 captured in the apply packet
--
-- 2. Trigger exists exactly once:
--    SELECT tgname, tgenabled FROM pg_trigger
--     WHERE tgrelid='m.slot_fill_attempt'::regclass AND NOT tgisinternal;
--
-- 3. Historic rows are untouched — annotation is INSERT-only, never backfilled:
--    SELECT count(*) FROM m.slot_fill_attempt
--     WHERE pool_snapshot ? 'cc0091_a3_2';        -- expect 0 immediately after apply
--
-- 4. After the next nightly tick, defaults become distinguishable:
--    SELECT format_defaulted, count(*) FROM ice_ro.slot_format_default_status
--     WHERE attempted_at > now() - interval '1 day' GROUP BY 1;
--    -- NULL = pre-trigger/unknown · true = default taken · (absent key) = explicit request
