-- Migration: tmr_variant_reclassify_quote_card_v1_unsuitable
-- TMR Template Variant Reclassification — quote_card.v1 Micro-lane (Step 2 of TMR Template Proof Lifecycle v1).
--
-- Reclassifies the variant candidate `quote_card.v1` of the seeded TMR provider template
-- `news_quote_insight_1x1_v1` (490ad9ea-…) from fit_status 'needs_template_edit' to 'unsuitable'.
-- The template is a market-insight / news card, NOT a true quote card (no quote slot, no
-- attribution/source slot). The false `needs_template_edit` flag was pinning the whole
-- template's read-RPC lifecycle_rollup at `needs_template_edit`; reclassifying to `unsuitable`
-- removes the false pin. `market_update.v1` (strong_candidate) is preserved untouched.
-- A genuine quote card is a SEPARATE future template / template-edit lane — not this template.
--
-- Single guarded one-row UPDATE. No DDL, no schema change, no grant/RLS change, no proof event,
-- no render, no publish, no enablement, no Format Mix binding, no other table.
--
-- Governance:
--   Packet            : docs/briefs/tmr-template-variant-reclassification-quote-card-v1-micro-lane-apply-packet.md
--   reviewed_input_hash (sha256 of the executable UPDATE below) :
--                       615f08f7512487ff2482e31b947769f8d2831acbd18f93340dc9049b57350cdd
--   db-rls-auditor    : pass (no must-fix)
--   external review   : ask_chatgpt_review cc66dca5-b1e9-435c-8414-3499136b1d6e — agree / low / high
--   PK apply approval : exact-hash phrase given 2026-07-01
--
-- APPLIED 2026-07-01 to mbkmaxqhsohbtwsqolns. `apply_migration` was harness-denied →
-- byte-identical statement ran via the pre-authorized `execute_sql` fallback; the migration
-- ledger marker (this version, this name) was backfilled immediately afterward to avoid
-- repo↔prod drift. This file is the in-repo record of that applied statement.

UPDATE c.creative_template_variant_candidate
SET fit_status  = 'unsuitable',
    fit_reason  = 'Reclassified 2026-07-01 (quote_card.v1 micro-lane, TMR Template Proof Lifecycle v1): provider template news_quote_insight_1x1_v1 is a market-insight/news card, not a true quote card (no quote slot, no attribution/source slot). A genuine quote card requires a different template with quote_text + attribution fields, handled as a separate future template/template-edit lane — not an edit of this template. market_update.v1 remains the strongest valid variant.',
    reviewed_by = 'PK quote_card.v1 reclassification micro-lane (TMR Template Proof Lifecycle v1)',
    reviewed_at = now(),
    updated_at  = now()
WHERE id          = 'b2621805-5d8c-43c7-a39c-9eee0964d7e7'
  AND template_id = '8a6fd92e-ef27-433b-b49b-010a7844dca9'
  AND variant_key = 'quote_card.v1'
  AND fit_status  = 'needs_template_edit';

-- ── ROLLBACK (reference only — NOT executed by this migration) ─────────────────────────
--   UPDATE c.creative_template_variant_candidate
--   SET fit_status  = 'needs_template_edit',
--       fit_reason  = 'no quote slot, no attribution/source slot — requires template edit',
--       reviewed_by = NULL,
--       reviewed_at = NULL,
--       updated_at  = now()
--   WHERE id          = 'b2621805-5d8c-43c7-a39c-9eee0964d7e7'
--     AND template_id = '8a6fd92e-ef27-433b-b49b-010a7844dca9'
--     AND variant_key = 'quote_card.v1'
--     AND fit_status  = 'unsuitable';
