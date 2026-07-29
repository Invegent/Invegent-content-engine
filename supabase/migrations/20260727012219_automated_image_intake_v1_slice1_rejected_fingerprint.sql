-- ============================================================================
-- RECONCILIATION BACKFILL (cc-0087, 2026-07-29): this file was NOT originally
-- committed to git under this name/version. It reproduces exact content that was
-- actually applied LIVE to project mbkmaxqhsohbtwsqolns, sourced from:
--   _harness/img_intake_v1_20260727/slice1_rejected_fingerprint.sql (gitignored harness dir)
-- Any 'NOT APPLIED' / 'PREPARED' / 'DESIGN' framing below is the ORIGINAL packet's
-- pre-apply language, preserved for historical fidelity -- it is STALE; this
-- migration IS live (confirmed against the Supabase migration ledger and, where
-- checked, live pg_get_functiondef/information_schema state). See
-- docs/briefs/results/cc-0087-migration-ledger-reconciliation-result-v1.md.
-- ============================================================================

-- Automated Image Intake v1 — Slice 1: rejected-asset fingerprint store (NEW, dark/additive)
-- Gate-1 correction 1: composite key (provider + provider_asset_id/source_url + sha256), NOT sha256 alone.
-- Placement: schema `m` (internal machinery, NOT PostgREST-exposed; consistent with m.asset_gap_*).
-- Tier T2. Applied via apply_migration at the PK gate. Additive only — no existing object touched.

CREATE TABLE IF NOT EXISTS m.rejected_asset_fingerprint (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_class        text NOT NULL DEFAULT 'static_background',   -- v1 = backgrounds only
  provider           text NOT NULL,                               -- 'pexels' | 'unsplash' | 'wikimedia'
  provider_asset_id  text,                                        -- provider's own id (e.g. pexels photo 532562); nullable if not derivable
  source_url         text,                                        -- provider page URL
  sha256             text,                                        -- bytes hash (nullable: a reject may predate download)
  client_scope       uuid,                                        -- INFORMATIONAL in v1 (rejects are GLOBAL); v2 will handle client-scoped uniqueness
  rejected_by        text NOT NULL DEFAULT 'PK',                  -- ICE has no actor identity — free text by design
  reason             text,
  rejected_at        timestamptz NOT NULL DEFAULT now(),
  meta               jsonb NOT NULL DEFAULT '{}'::jsonb,
  -- at least ONE fingerprint component must be present, else the row cannot dedup anything
  CONSTRAINT rejected_asset_fingerprint_has_key
    CHECK (provider_asset_id IS NOT NULL OR sha256 IS NOT NULL OR source_url IS NOT NULL)
);

COMMENT ON TABLE m.rejected_asset_fingerprint IS
  'Automated Image Intake v1 — assets a PK visual gate REJECTED, so the intake pipeline never re-offers them. Composite dedup key: (provider, provider_asset_id) catches same image at different size/filename; sha256 catches exact bytes; source_url catches same page. pHash deferred to v2.';

-- Dedup match paths (composite correction 1). v1 rejects are GLOBAL, so these double as
-- idempotency guards (db-rls-auditor should_fix #1): repeated identical PK rejects are no-ops
-- via ON CONFLICT DO NOTHING targeted at whichever key the writer holds.
CREATE UNIQUE INDEX IF NOT EXISTS uq_raf_provider_assetid
  ON m.rejected_asset_fingerprint (provider, provider_asset_id) WHERE provider_asset_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS uq_raf_sha256
  ON m.rejected_asset_fingerprint (sha256) WHERE sha256 IS NOT NULL;
-- source_url fallback match, md5-hashed to avoid the ~2704-byte btree tuple cap (should_fix #2);
-- non-unique (a row may share a URL prefix; provider_asset_id/sha256 carry idempotency).
CREATE INDEX IF NOT EXISTS idx_raf_source_url_md5
  ON m.rejected_asset_fingerprint (md5(source_url)) WHERE source_url IS NOT NULL;

-- Grant/RLS lockdown (defense-in-depth; anon/authenticated already lack schema-m USAGE).
REVOKE ALL ON m.rejected_asset_fingerprint FROM PUBLIC;
REVOKE ALL ON m.rejected_asset_fingerprint FROM anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON m.rejected_asset_fingerprint TO service_role;
ALTER TABLE m.rejected_asset_fingerprint ENABLE ROW LEVEL SECURITY;
ALTER TABLE m.rejected_asset_fingerprint FORCE ROW LEVEL SECURITY;   -- deny-all for non-bypass roles; service_role bypasses
