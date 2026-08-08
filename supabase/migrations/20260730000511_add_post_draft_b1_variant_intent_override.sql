-- ============================================================================
-- ADD POST_DRAFT B1 VARIANT-INTENT OVERRIDE — additive, dark-by-default column
-- ============================================================================
-- Source brief: docs/briefs/creatomate-global-static-graduation-batch1-gate1-brief-v1.md
-- (Part A, Open Question 1, option (a) — the mechanism-gap fix). Paired code change:
-- supabase/functions/image-worker/index.ts v3.35.0 (quoteDrafts select + the production
-- image_quote branch's select_template call + templateSpec evidence fields).
--
-- AUTHORED, NOT APPLIED. Applying is a SEPARATE, PK-gated step (apply_migration).
-- Migration name = permanent identity (new number + distinct name; never an
-- in-place edit to an existing migration).
--
-- WHY: the production image_quote branch's ONE select_template RPC call hardcodes
-- p_variant_intent: null (supabase/functions/image-worker/index.ts, production branch, the
-- select_template call inside the `if (await isImageGovernanceEnabled(...))` block). That is
-- the ONLY code path that renders a real m.post_draft-backed image, so no real production draft
-- can ever select a non-default strong_candidate winner (e.g. generic_announcement_card_1x1_v1)
-- without either a premature selector-ranking change or the supervised governed_image_quote_smoke
-- entrypoint — which never writes m.post_draft and is explicitly excluded by PK's "no forced
-- test-only substitutions" instruction. This column is the narrow, PK-approved fix: a per-draft,
-- explicit, disclosed override the production branch can read.
--
-- WHAT THIS DOES (single additive change, backward-compatible):
--   ALTER TABLE m.post_draft ADD COLUMN b1_variant_intent_override text; -- nullable, no default.
-- NULL is the correct default and preserves byte-identical select_template behaviour for every
-- existing row (and every future row unless explicitly set) — the paired code change reads
-- draft.b1_variant_intent_override ?? null, which collapses to the exact prior hardcoded literal
-- when the column is NULL.
--
-- WHY ADDITIVE / SAFE:
--   * No backfill — every existing row stays NULL.
--   * No constraint, no index, no trigger, no default value beyond SQL's implicit NULL.
--   * No grant/ACL change — the column inherits m.post_draft's existing grants.
--   * No RLS/policy change.
--   * select_template itself is completely unmodified by this migration (no DDL/DML against it);
--     the column only supplies an input value the caller may now pass through.
--
-- OUT OF SCOPE (this migration): any change to select_template's ranking/registry rows,
-- c.creative_template_variant_candidate, c.creative_provider_template, buildTmrRenderPlan,
-- stat_hero_card support, carousel body/closing mappings. No backfill, no data write of any kind.
--
-- ROLLBACK: ALTER TABLE m.post_draft DROP COLUMN b1_variant_intent_override; — safe, in-txn,
-- drops only this column; no other object depends on it (nothing reads it until the paired
-- image-worker v3.35.0 code is deployed).
-- ============================================================================

ALTER TABLE m.post_draft
  ADD COLUMN b1_variant_intent_override text;

COMMENT ON COLUMN m.post_draft.b1_variant_intent_override IS
  'Additive, nullable per-draft override for select_template''s p_variant_intent argument in the '
  'production image_quote render branch. NULL (the default for every row) preserves prior '
  'behaviour byte-for-byte. Set explicitly, and disclosed, to steer exactly one draft toward a '
  'specific variant_key (e.g. an announcement_card promotion candidate) — see '
  'docs/briefs/creatomate-global-static-graduation-batch1-gate1-brief-v1.md.';
