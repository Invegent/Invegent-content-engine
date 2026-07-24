-- cc-0063 — Brand Host Designation v0 (M2: one designated host per client + render_style)
-- =============================================================================================
-- ⛔ DESIGN — NOT APPLIED. T2 PK apply gate (PK ruling 2026-07-24: Q2=M2, Q1=boolean+carry,
--    Q3=T2, Q4=wait for a natural production event).
-- Packet:  docs/briefs/cc-0063-brand-host-designation-gate1-packet-m2-v1.md
-- Brief:   docs/briefs/cc-0063-brand-host-designation-brief.md (e2343a8, register v6.14)
-- Parent:  cc-0047 Part-3 step 4.   Refuted sibling: cc-0052 (do not inherit its pinned mechanism).
-- Rollback: 20260724120100_cc0063_brand_host_designation_rollback_v1.sql (authored before apply).
--
-- WHAT THIS DOES: writes exactly ONE column (is_default_host) on exactly TWO rows.
-- WHAT THIS DOES NOT DO: it does not change live avatar selection. `is_default_host` is referenced
--   by NO Edge Function source (verified by repo grep 2026-07-24). Live `lookupAvatar` filters on
--   is_active + render_style only. The sole reader is the DORMANT shadow resolver
--   (public.resolve_and_record_avatar_shadow), whose flag AVATAR_SHADOW_TELEMETRY is OFF and whose
--   table r.avatar_resolution_shadow has 0 rows. Declared to PK as a T3-trigger-adjacent condition;
--   PK ruled T2 on 2026-07-24 because no resolver in operation consumes the designation.
--
-- A -> B -> C INVARIANT: this is step A (declare). Step B (a resolver reads the designation) and
--   step C (activating a second host) are separate gates. C MUST NEVER PRECEDE B.
--
-- DELIBERATELY NOT IDEMPOTENT: the `is_default_host = false` predicate means a re-run affects 0 rows
--   and RAISES. A silent no-op re-run would be indistinguishable from success; a loud abort is
--   correct. Endorsed by PK 2026-07-24.
--
-- NULLABILITY: c.brand_avatar.is_active is NULLABLE (boolean NULL DEFAULT false). Every predicate
--   and every count below uses `IS TRUE`, which excludes NULL unambiguously. This agrees with live
--   lookupAvatar's `is_active = true`, which also excludes NULL.
--
-- TRANSACTION SHAPE: the whole lane is ONE `DO` block, so it is atomic as a single statement under
--   either apply path — `apply_migration` (which may supply its own transaction) or `execute_sql`
--   at a PK gate. No explicit BEGIN/COMMIT, deliberately: an explicit BEGIN can conflict with a
--   caller-supplied transaction, and this form needs neither. Any RAISE rolls the entire statement
--   back, including the UPDATE.
--
-- MIGRATION NAME IS PERMANENT IDENTITY. A revision gets a NEW number and a DISTINCT name — never
--   this name with different SQL.
-- ⚠ apply_migration mints its OWN version from wall clock and ignores this filename. Repo filenames
--   and the applied ledger WILL diverge. Decide rename-or-record BEFORE commit and state which was
--   chosen in the result doc.
-- =============================================================================================

DO $cc0063$
DECLARE
  v_marked   int;
  v_active   int;
  v_n        int;
  v_total    int;
  v_dupe     int;
  v_mismatch int;
BEGIN
  ---------------------------------------------------------------------------------------------
  -- GUARD 1 — entry fingerprint. Abort unless the ratified entry state holds.
  ---------------------------------------------------------------------------------------------
  SELECT count(*) INTO v_marked FROM c.brand_avatar WHERE is_default_host;
  IF v_marked <> 0 THEN
    RAISE EXCEPTION 'cc-0063 STOP: expected 0 pre-existing default-host markers, found %', v_marked;
  END IF;

  SELECT count(*) INTO v_active FROM c.brand_avatar WHERE is_active IS TRUE;
  IF v_active <> 2 THEN
    RAISE EXCEPTION 'cc-0063 STOP: expected exactly 2 active avatars, found %', v_active;
  END IF;

  ---------------------------------------------------------------------------------------------
  -- GUARD 2 — the designation write, asserted to exactly two rows.
  ---------------------------------------------------------------------------------------------
  UPDATE c.brand_avatar
     SET is_default_host = true
   WHERE brand_avatar_id IN (
           '83ff167d-a844-4e1c-9d1a-d8ff257c11bc',  -- ndis-yarns     | realistic | support_coordinator
           'd6c422fb-9dc5-4bcc-aba6-2e6e942f2cdd'   -- property-pulse | realistic | buyers_agent
         )
     AND is_active IS TRUE
     AND render_style = 'realistic'
     AND is_default_host = false;

  GET DIAGNOSTICS v_n = ROW_COUNT;
  IF v_n <> 2 THEN
    RAISE EXCEPTION 'cc-0063 STOP: designation affected % row(s), expected exactly 2', v_n;
  END IF;

  ---------------------------------------------------------------------------------------------
  -- GUARD 3 — post-write invariants, evaluated inside the same atomic statement.
  ---------------------------------------------------------------------------------------------
  SELECT count(*) INTO v_total FROM c.brand_avatar WHERE is_default_host;
  IF v_total <> 2 THEN
    RAISE EXCEPTION 'cc-0063 STOP: % designated row(s) post-write, expected 2', v_total;
  END IF;

  SELECT count(*) INTO v_dupe FROM (
    SELECT 1 FROM c.brand_avatar
     WHERE is_default_host
     GROUP BY client_id, render_style
    HAVING count(*) > 1
  ) x;
  IF v_dupe <> 0 THEN
    RAISE EXCEPTION 'cc-0063 STOP: % (client,render_style) group(s) carry >1 designated host', v_dupe;
  END IF;

  -- is_active must be untouched by this lane.
  SELECT count(*) INTO v_active FROM c.brand_avatar WHERE is_active IS TRUE;
  IF v_active <> 2 THEN
    RAISE EXCEPTION 'cc-0063 STOP: is_active changed — % active row(s) post-write, expected 2', v_active;
  END IF;

  -- every designated row must still be an active realistic avatar.
  SELECT count(*) INTO v_mismatch
    FROM c.brand_avatar
   WHERE is_default_host
     AND (is_active IS NOT TRUE OR render_style <> 'realistic');
  IF v_mismatch <> 0 THEN
    RAISE EXCEPTION 'cc-0063 STOP: % designated row(s) are not active-realistic', v_mismatch;
  END IF;

  RAISE NOTICE 'cc-0063: brand host designated on % row(s); is_active untouched; invariants hold', v_n;
END
$cc0063$;
