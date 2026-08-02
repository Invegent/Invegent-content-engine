-- =====================================================================
-- D2 — PP legacy-carousel governance declaration (Facebook + Instagram)
--
-- Declares the EXISTING, ALREADY-LIVE legacy carousel rendering pipeline
-- governed for property-pulse on Facebook + Instagram, per the Creatomate
-- Global Ultimate programme brief's D2 decision (§1.2: "PP legacy carousel
-- governed for Ultimate v1 (DECIDED). Execution = declaration + evidence
-- lane: declare the legacy carousel pipeline governed for PP FB/IG, record
-- proof events against the live publishes (104 real drafts). No TMR
-- carousel migration inside Ultimate v1.").
--
-- WHAT "THE LEGACY CAROUSEL PIPELINE" ACTUALLY IS (identified this session
-- by reading supabase/functions/image-worker/index.ts lines ~1208-1256):
-- a bespoke, worker-code-embedded render path — NOT routed through
-- select_template / c.creative_template_client_assignment / the
-- TMR/Creatomate template registry at all. It picks up
-- m.post_draft rows with recommended_format='carousel', calls Anthropic
-- directly (callContentAdvisor) to produce a 3-6 slide spec, then for each
-- slide calls buildCarouselSlideScript(...) (a locally-built Creatomate
-- direct-source render, not a stored/selected template row) and writes
-- each slide via the upsert_carousel_slide RPC into m.post_carousel_slide.
-- This is a DIFFERENT system from the TMR-registered
-- generic_carousel_cover_1x1_v1 template found during B2 Stage 0 (that one
-- IS select_template-routed and predates D2 by four weeks — see
-- docs/briefs/results/b2-visual-verdict-promotion-stage0-forensic-
-- reconstruction-v1.md §5). D2 governs the LEGACY pipeline; the TMR
-- template is untouched by this migration.
--
-- REAL EVIDENCE (live query, this session, 2026-08-02 — full accounting in
-- docs/briefs/results/d2-pp-legacy-carousel-governance-declaration-result-v1.md):
--   104 total m.post_draft rows, client=property-pulse, recommended_format='carousel'
--    55 of those have at least one m.post_publish row (any status)
--    37 actually PUBLISHED on facebook(23)+instagram(14), 2026-03-20 to 2026-07-26
--   629 individual m.post_carousel_slide rows across those 104 drafts
-- "104 real drafts" in the programme brief matches total_carousel_drafts
-- exactly — verified, not assumed.
--
-- WHAT THIS MIGRATION DOES: ONE additive INSERT into
-- c.client_creative_governance (client_id=property-pulse, format='carousel',
-- enabled=true), declaring the pipeline's governed status as a matter of
-- programme record. contract_ref/render_label name the ACTUAL pipeline
-- (image-worker's buildCarouselSlideScript path), not a Creative Library
-- declarative-registry entry — none exists for this legacy pipeline
-- (checked: docs/creative-library/property-pulse.json has no carousel
-- family/pattern entry, only a passing mention in its brand-constitution
-- purpose string) — so declarative_registry_ref is left NULL, honestly,
-- rather than inventing a reference.
--
-- RENDER-GATE DISCLOSURE (verified correct) — this row has ZERO render-path
-- consumers. Confirmed by reading image-worker/index.ts: the runtime
-- governance gate isImageGovernanceEnabled(supabase, clientId, format) is
-- called EXACTLY ONCE in production code, hardcoded to format='image_quote'
-- (line 1082) — never with 'carousel'. The carousel render block (lines
-- 1208-1256) runs unconditionally on any carousel-format pending draft,
-- gated only by the unrelated isImageEnabled(clientId) client-level toggle
-- — it does NOT consult c.client_creative_governance at all. This INSERT
-- changes NO render behaviour today.
--
-- CORRECTED 2026-08-02 (db-rls-auditor review): the render-gate claim above
-- is correct but was originally overstated as "changes NO production
-- behaviour" full stop. It does not hold for every consumer of this table:
-- supabase/functions/tmr-drift-probe/index.ts's fetchGovernedClients() reads
-- c.client_creative_governance WHERE enabled=true with NO format filter, and
-- runs daily via the live cron tmr-drift-probe-daily (35 17 * * *). Once
-- this row exists, its declarative_registry_ref=NULL (honest, see below)
-- causes fetchDeclarativeRegistry() to throw declarative_registry_ref_
-- missing, which flips the probe's daily status from ok to error starting
-- the next cron run. PK DECISION (2026-08-02, direct chat, "go with your
-- recommendation" on a 3-option card): ACCEPT this as a disclosed, known
-- side effect (Option C) rather than block on it. Patching tmr-drift-probe
-- to skip rows with no resolvable registry ref (Option B) is the correct
-- long-term fix and is queued as a separate, later follow-up carry — NOT
-- part of this migration. This declarative/record-keeping act formally
-- closes D2 as decided AND recorded, and gives any FUTURE code that reads
-- this table for carousel the correct governed state from day one.
--
-- NO PROOF-EVENT ROWS ARE WRITTEN BY THIS MIGRATION. c.creative_template_
-- proof_event.template_id is NOT NULL and references c.creative_provider_
-- template — the legacy carousel pipeline has no such row (it is not a
-- registered Creatomate template), so inserting a proof_event here would
-- require fabricating a template_id that does not truthfully describe this
-- pipeline. Per the governing instruction ("zero synthetic proof rows"),
-- the evidence ledger for D2 is the RESULT DOCUMENT (cited above), not a
-- forced DB row. This is a deliberate, disclosed scope decision, not an
-- oversight.
--
-- (R) ROLLBACK (reference only — see the paired
--   ROLLBACK_20260802100000_d2_pp_legacy_carousel_governance_declaration_v1.sql):
--   deletes the single inserted row by its deterministic ID.
-- =====================================================================

BEGIN;

DO $$
DECLARE v_rows int;
BEGIN
  INSERT INTO c.client_creative_governance
    (id, client_id, format, contract_ref, declarative_registry_ref, render_label, enabled)
  VALUES (
    'd2510001-0000-4000-8000-000000000001',
    '4036a6b5-b4a3-406e-998d-c2fe14a8bbdd',  -- property-pulse
    'carousel',
    'property_pulse.carousel.legacy_pipeline',
    NULL,  -- no Creative Library declarative-registry entry exists for this legacy pipeline (checked, honest NULL)
    'image_worker_legacy_carousel_v1',
    true
  )
  ON CONFLICT DO NOTHING;
  GET DIAGNOSTICS v_rows = ROW_COUNT;
  IF v_rows <> 1 THEN
    RAISE EXCEPTION 'D2 declaration: expected exactly 1 row inserted for property-pulse x carousel governance, got %. A row may already exist (re-check c.client_creative_governance before retrying) — STOP, do not force.', v_rows
      USING ERRCODE = 'P0001';
  END IF;
END $$;

COMMIT;

-- =====================================================================
-- ROLLBACK (reference only — NOT executed by this migration; see the paired
-- file ROLLBACK_20260802100000_d2_pp_legacy_carousel_governance_declaration_v1.sql):
--   DELETE FROM c.client_creative_governance WHERE id = 'd2510001-0000-4000-8000-000000000001';
-- =====================================================================
