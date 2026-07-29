-- Packet: creatomate-registry-repair-packet-v1 (FORWARD)
-- Source: docs/briefs/results/creatomate-registry-integrity-graduation-contract-v1.md
-- Scope: DATA-ONLY correction of 8 rows across 4 governance tables, covering 3 of the
--        27 c.creative_provider_template rows (fb9820f8 / 48cba556 / 2140ca19).
--        NO DDL. NO scope/fit_status ranking change (except row 17's own fit_status,
--        which is a defense-in-depth exclusion, not a ranking change — see doc §3.4).
--        NO template activation.
--
-- ⛔ APPLY IS PK-GATED. This file is PREPARED, NOT APPLIED. Do not run it without explicit
--    PK apply approval at the registry-repair gate named in the packet doc.
--
-- EXECUTION CHANNEL (required for the atomicity claim below to hold — apply-harness-auditor
-- AHA-04-1): apply this file as ONE statement batch through ONE connection — either
-- `psql -f creatomate-registry-repair-packet-v1-forward.sql` against the project's direct
-- (non-pooled) connection string, or by pasting this file's full text into a SINGLE
-- mcp__supabase__execute_sql call (never split across multiple tool calls — a pooled/PgBouncer
-- channel that splits BEGIN...COMMIT across calls can silently break atomicity with no error).
-- If the execution channel cannot guarantee single-connection delivery, STOP and use
-- apply_migration instead of this raw file.
--
-- Evidence for every value below is cited in the packet doc §2 (row reconciliation) and
-- was pulled live via db-rls-auditor + direct execute_sql SELECTs on 2026-07-29. Every
-- WHERE clause targets a primary key captured from that live pull — no row is matched by
-- a mutable label.
--
-- SAFETY: wrapped in one transaction. Each UPDATE and its fail-closed rowcount assertion
-- are INSIDE THE SAME DO $$ ... $$ block (GET DIAGNOSTICS reads the UPDATE's own rowcount —
-- FOUND/ROW_COUNT do not carry across separate top-level statements, so the UPDATE and its
-- check must never be split into two DO blocks or a bare UPDATE + a following DO block).
-- A 0-row (or >1-row) match RAISEs and rolls back the ENTIRE transaction.

BEGIN;

-- ── Row 17 (fb9820f8) — RETIRE. Provider template deleted upstream; DB status is stale
--    and, per select_template's fail-closed-on-first-filter design, was already excluded
--    from the live candidate set by scope='client' (not the status/assignment/fit values
--    below) — this repair adds three INDEPENDENT, redundant exclusion layers so retirement
--    does not depend solely on that unrelated scope accident. Zero observable selector
--    output change per static code-tracing (doc §3.4) — treat that as an UNENFORCED
--    claim until the manual pre/post select_template diff at the bottom of this file is
--    actually run (apply-harness-auditor AHA-02-1: this is a required checklist step at
--    apply time, not an automated proof).

-- 17a. Template-level status: production_proven -> deprecated (closest legal CHECK value;
--      'retired' is not in creative_provider_template_status_check — see packet doc §1).
DO $$
DECLARE v_rows int;
BEGIN
  UPDATE c.creative_provider_template
  SET status = 'deprecated'
  WHERE provider_template_id = 'fb9820f8-3fee-4448-b324-3d500fa74b40'
    AND status = 'production_proven';
  GET DIAGNOSTICS v_rows = ROW_COUNT;
  IF v_rows <> 1 THEN
    RAISE EXCEPTION 'STOP: row17 template status update matched % rows (expected 1) — pre-image mismatch, aborting', v_rows;
  END IF;
END $$;

-- 17b. Template-level inventory_source: append a retirement note + count correction
--      (21 succeeded, not 17 — see packet doc §2.3). Original text preserved verbatim,
--      appended not replaced.
DO $$
DECLARE v_rows int;
BEGIN
  UPDATE c.creative_provider_template
  SET inventory_source = inventory_source
    || ' · RETIRED 2026-07-29 (creatomate-registry-repair-packet-v1): provider template'
    || ' deleted upstream (docs/creative-library/property-pulse.json provider_status='
    || 'retired_provider_deleted; supabase/functions/image-worker/index.ts:931-932 "the dead'
    || ' legacy template ... GONE"); render count corrected to 21 succeeded / 5 failed'
    || ' (not "17 succeeded") per live m.post_render_log pull 2026-07-29; zero activity'
    || ' since 2026-07-05.'
  WHERE provider_template_id = 'fb9820f8-3fee-4448-b324-3d500fa74b40'
    AND inventory_source = 'vendored implementation supabase/functions/image-worker/index.ts + b1_production.ts (8 modification keys) · docs/creative-library/property-pulse.json (news family) · 17 succeeded production render_specs (m.post_render_log label=creative_library_b1_production) · registers v3.98/v4.00/v4.05';
  GET DIAGNOSTICS v_rows = ROW_COUNT;
  IF v_rows <> 1 THEN
    RAISE EXCEPTION 'STOP: row17 inventory_source update matched % rows (expected 1) — pre-image mismatch, aborting', v_rows;
  END IF;
END $$;

-- 17c. Client assignment (property-pulse): production_proven -> deprecated.
--      select_template step (d) explicitly treats assignment_status IN ('blocked','deprecated')
--      as reason_code 'assignment_blocked' — an independent, named exclusion.
DO $$
DECLARE v_rows int;
BEGIN
  UPDATE c.creative_template_client_assignment
  SET assignment_status = 'deprecated'
  WHERE id = 'c0b10001-0000-4000-8000-000000000004'
    AND assignment_status = 'production_proven';
  GET DIAGNOSTICS v_rows = ROW_COUNT;
  IF v_rows <> 1 THEN
    RAISE EXCEPTION 'STOP: row17 assignment update matched % rows (expected 1) — pre-image mismatch, aborting', v_rows;
  END IF;
END $$;

-- 17d. Platform suitability (facebook, instagram): production_proven -> blocked.
--      ('deprecated' is not in creative_template_platform_suitability_suitability_status_check;
--      'blocked' is the closest legal value and is explicitly checked as a negative by
--      select_template step (c).)
DO $$
DECLARE v_rows int;
BEGIN
  UPDATE c.creative_template_platform_suitability
  SET suitability_status = 'blocked'
  WHERE id IN ('9cb2a8bd-ba39-4a4d-b79f-e059a0d13bac', '9b69fd31-a016-4491-b141-023a6c2f8c57')
    AND suitability_status = 'production_proven';
  GET DIAGNOSTICS v_rows = ROW_COUNT;
  IF v_rows <> 2 THEN
    RAISE EXCEPTION 'STOP: row17 suitability update matched % rows (expected 2) — pre-image mismatch, aborting', v_rows;
  END IF;
END $$;

-- 17e. Variant candidate fit_status: strong_candidate -> blocked.
--      This is the row select_template's ranking loop reads directly; 'blocked' removes it
--      from consideration under any future scope/status regression, independent of 17a/17c/17d.
DO $$
DECLARE v_rows int;
BEGIN
  UPDATE c.creative_template_variant_candidate
  SET fit_status = 'blocked',
      fit_reason = fit_reason || ' · SUPERSEDED 2026-07-29 (creatomate-registry-repair-packet-v1): provider template deleted upstream; fit_status forced to blocked to remove selector eligibility independent of the scope=client exclusion.'
  WHERE id = 'c0b10001-0000-4000-8000-000000000003'
    AND fit_status = 'strong_candidate';
  GET DIAGNOSTICS v_rows = ROW_COUNT;
  IF v_rows <> 1 THEN
    RAISE EXCEPTION 'STOP: row17 variant_candidate update matched % rows (expected 1) — pre-image mismatch, aborting', v_rows;
  END IF;
END $$;


-- ── Row 5 (48cba556) — PROMOTE ndis-yarns + care-for-welfare-pty-ltd assignments to
--    production_proven. Each has its OWN independently-attributed render/draft/publish
--    evidence (NDIS: 14 renders/14 drafts/12 publishes; CFW: 10/10/8 — see packet doc §2.1).
--    property-pulse's assignment (already production_proven) is untouched.

DO $$
DECLARE v_rows int;
BEGIN
  UPDATE c.creative_template_client_assignment
  SET assignment_status = 'production_proven'
  WHERE id = 'c4737728-eb87-462f-aa79-ce6b321ba8ef'  -- ndis-yarns
    AND assignment_status = 'visually_approved';
  GET DIAGNOSTICS v_rows = ROW_COUNT;
  IF v_rows <> 1 THEN
    RAISE EXCEPTION 'STOP: row5 ndis-yarns assignment update matched % rows (expected 1) — pre-image mismatch, aborting', v_rows;
  END IF;
END $$;

DO $$
DECLARE v_rows int;
BEGIN
  UPDATE c.creative_template_client_assignment
  SET assignment_status = 'production_proven'
  WHERE id = '60e43a0e-8ac3-497d-b823-8d41c2aa123b'  -- care-for-welfare-pty-ltd
    AND assignment_status = 'visually_approved';
  GET DIAGNOSTICS v_rows = ROW_COUNT;
  IF v_rows <> 1 THEN
    RAISE EXCEPTION 'STOP: row5 CFW assignment update matched % rows (expected 1) — pre-image mismatch, aborting', v_rows;
  END IF;
END $$;


-- ── Row 7 (2140ca19) — PROMOTE invegent assignment to production_proven. 11 renders /
--    11 drafts / 8 publishes, 100% attributable to invegent, zero failures, sustained
--    2026-07-23 -> 2026-07-29 (packet doc §2.2). property-pulse's assignment on this same
--    template has ZERO of its own evidence (all 11 renders trace to invegent) and is
--    DELIBERATELY LEFT UNCHANGED at visually_approved — do not promote it in a future edit
--    without independent PP-specific proof on THIS provider_template_id.

DO $$
DECLARE v_rows int;
BEGIN
  UPDATE c.creative_template_client_assignment
  SET assignment_status = 'production_proven'
  WHERE id = 'ecba211b-5217-4790-afe5-a2f98616712f'  -- invegent
    AND assignment_status = 'visually_approved';
  GET DIAGNOSTICS v_rows = ROW_COUNT;
  IF v_rows <> 1 THEN
    RAISE EXCEPTION 'STOP: row7 invegent assignment update matched % rows (expected 1) — pre-image mismatch, aborting', v_rows;
  END IF;
END $$;


-- ── Row 19 (c11bb8ab) — NO DEFAULT CHANGE. property-pulse's assignment has real but THIN
--    and RISKY client-attributable evidence (3 succeeded / 5 timeout of its own = 62.5%
--    attributable timeout rate, 4 drafts, 3 publishes — packet doc §2.4). This does not
--    default-promote; see the PK-ELECTIVE block below, commented out, requiring a separate
--    explicit PK decision to uncomment and apply. ndis-yarns has ZERO of its own evidence
--    and is not touched at all.
--
-- PK-ELECTIVE (NOT part of the default packet — uncomment only on explicit PK instruction):
-- DO $$
-- DECLARE v_rows int;
-- BEGIN
--   UPDATE c.creative_template_client_assignment
--   SET assignment_status = 'production_proven'
--   WHERE id = '1ee1a547-08b8-4ce8-8045-d545be16c699'  -- property-pulse
--     AND assignment_status = 'visually_approved';
--   GET DIAGNOSTICS v_rows = ROW_COUNT;
--   IF v_rows <> 1 THEN
--     RAISE EXCEPTION 'STOP: row19 PP assignment update matched % rows (expected 1) — pre-image mismatch, aborting', v_rows;
--   END IF;
-- END $$;


-- ── Row 26 (03bc6a3c) — NO CHANGE. Zero real renders exist; stays ready_for_proof per
--    task ruling. Not included in this packet at all.

COMMIT;

-- ── REQUIRED post-apply verification (read-only; run after COMMIT — not part of the
--    transaction, but NOT optional either: apply-harness-auditor AHA-02-1 flags the packet's
--    core "zero selector output change" safety claim for row 17 as unenforced by the SQL
--    itself. Run both blocks below before closing out the apply.) ──

-- 1. Confirm the 9 written values landed as expected:
-- SELECT provider_template_id, status FROM c.creative_provider_template
--   WHERE provider_template_id IN ('fb9820f8-3fee-4448-b324-3d500fa74b40');
-- SELECT id, assignment_status FROM c.creative_template_client_assignment
--   WHERE id IN ('c0b10001-0000-4000-8000-000000000004','c4737728-eb87-462f-aa79-ce6b321ba8ef',
--                '60e43a0e-8ac3-497d-b823-8d41c2aa123b','ecba211b-5217-4790-afe5-a2f98616712f');
-- SELECT id, suitability_status FROM c.creative_template_platform_suitability
--   WHERE id IN ('9cb2a8bd-ba39-4a4d-b79f-e059a0d13bac','9b69fd31-a016-4491-b141-023a6c2f8c57');
-- SELECT id, fit_status FROM c.creative_template_variant_candidate
--   WHERE id = 'c0b10001-0000-4000-8000-000000000003';

-- 2. REQUIRED: re-run select_template for every client/format this packet touches and diff
--    the JSON response against a pre-apply baseline captured with the SAME calls BEFORE this
--    file runs. Byte-identical `selected`/`alternatives`/`rejected` is the doc §3.4 claim —
--    treat any diff as a STOP, not a note:
--    SELECT public.select_template('property-pulse', 'facebook', 'image_quote', NULL, NULL);
--    SELECT public.select_template('property-pulse', 'instagram', 'image_quote', NULL, NULL);
--    SELECT public.select_template('ndis-yarns', 'facebook', 'image_quote', NULL, NULL);
--    SELECT public.select_template('care-for-welfare-pty-ltd', 'facebook', 'image_quote', NULL, NULL);
--    SELECT public.select_template('invegent', 'facebook', 'image_quote', NULL, NULL);
