-- ============================================================================
-- RECONCILIATION BACKFILL (cc-0087, 2026-07-29): this file was NOT originally
-- committed to git under this name/version. It reproduces exact content that was
-- actually applied LIVE to project mbkmaxqhsohbtwsqolns, sourced from:
--   _harness/img_intake_v1_20260727/slice3_filter_new_candidates.sql (gitignored harness dir)
-- Any 'NOT APPLIED' / 'PREPARED' / 'DESIGN' framing below is the ORIGINAL packet's
-- pre-apply language, preserved for historical fidelity -- it is STALE; this
-- migration IS live (confirmed against the Supabase migration ledger and, where
-- checked, live pg_get_functiondef/information_schema state). See
-- docs/briefs/results/cc-0087-migration-ledger-reconciliation-result-v1.md.
-- ============================================================================

-- Automated Image Intake v1 — Slice 3a: candidate dedup filter (read-only, NEW).
-- Tier T2. Applied via apply_migration at the PK gate. Additive only.
--
-- Operationalizes the Slice-1 reject store: given harvested candidate fingerprints, returns which
-- are NEW vs already-in-pool or previously-rejected. Composite match (Gate-1 correction 1):
--   dup_pool     — sha256 or source_url already in c.shared_creative_asset
--   rejected     — sha256, (provider,provider_asset_id), or source_url in m.rejected_asset_fingerprint
-- v1 SCOPE NOTE: dedup targets the shared pool (the intake destination) + reject store. Client-owned
--   backgrounds (c.client_brand_asset) are brand-specific and not deduped in v1 (low collision with
--   generic harvested backgrounds) — a documented v1 limitation.
-- SECURITY INVOKER: service_role already reads c.shared_creative_asset (arwd) and
--   m.rejected_asset_fingerprint (granted Slice 1) — no new grant needed.
-- Input p_candidates: jsonb array of {provider, provider_asset_id, sha256, source_url}.

CREATE OR REPLACE FUNCTION m.filter_new_candidates(p_candidates jsonb)
RETURNS TABLE (
  idx               int,
  provider          text,
  provider_asset_id text,
  sha256            text,
  source_url        text,
  is_new            boolean,
  exclusion_reason  text
)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public, m, c, pg_temp
AS $fn$
  WITH cand AS (
    SELECT (t.ord)::int          AS idx,
           t.e->>'provider'          AS provider,
           t.e->>'provider_asset_id' AS provider_asset_id,
           t.e->>'sha256'            AS sha256,
           t.e->>'source_url'        AS source_url
    FROM jsonb_array_elements(p_candidates) WITH ORDINALITY AS t(e, ord)
  ),
  pool AS (
    SELECT asset_meta->>'sha256'     AS sha256,
           asset_meta->>'source_url' AS source_url
    FROM c.shared_creative_asset
  )
  SELECT
    c.idx, c.provider, c.provider_asset_id, c.sha256, c.source_url,
    NOT (
         (c.sha256     IS NOT NULL AND EXISTS (SELECT 1 FROM pool p WHERE p.sha256     = c.sha256))
      OR (c.source_url IS NOT NULL AND EXISTS (SELECT 1 FROM pool p WHERE p.source_url = c.source_url))
      OR (c.sha256     IS NOT NULL AND EXISTS (SELECT 1 FROM m.rejected_asset_fingerprint r WHERE r.sha256 = c.sha256))
      OR (c.provider_asset_id IS NOT NULL AND EXISTS (SELECT 1 FROM m.rejected_asset_fingerprint r WHERE r.provider = c.provider AND r.provider_asset_id = c.provider_asset_id))
      OR (c.source_url IS NOT NULL AND EXISTS (SELECT 1 FROM m.rejected_asset_fingerprint r WHERE r.source_url = c.source_url))
    ) AS is_new,
    CASE
      WHEN c.sha256     IS NOT NULL AND EXISTS (SELECT 1 FROM pool p WHERE p.sha256     = c.sha256)     THEN 'dup_pool_sha256'
      WHEN c.source_url IS NOT NULL AND EXISTS (SELECT 1 FROM pool p WHERE p.source_url = c.source_url) THEN 'dup_pool_source_url'
      WHEN c.sha256     IS NOT NULL AND EXISTS (SELECT 1 FROM m.rejected_asset_fingerprint r WHERE r.sha256 = c.sha256) THEN 'rejected_sha256'
      WHEN c.provider_asset_id IS NOT NULL AND EXISTS (SELECT 1 FROM m.rejected_asset_fingerprint r WHERE r.provider = c.provider AND r.provider_asset_id = c.provider_asset_id) THEN 'rejected_provider_assetid'
      WHEN c.source_url IS NOT NULL AND EXISTS (SELECT 1 FROM m.rejected_asset_fingerprint r WHERE r.source_url = c.source_url) THEN 'rejected_source_url'
      ELSE NULL
    END AS exclusion_reason
  FROM cand c
  ORDER BY c.idx;
$fn$;

COMMENT ON FUNCTION m.filter_new_candidates(jsonb) IS
  'Automated Image Intake v1 dedup filter (read-only). Given harvested candidate fingerprints (provider, provider_asset_id, sha256, source_url), returns is_new + exclusion_reason by matching against the shared pool (c.shared_creative_asset) and the reject store (m.rejected_asset_fingerprint). v1 does not dedup against c.client_brand_asset.';

REVOKE ALL ON FUNCTION m.filter_new_candidates(jsonb) FROM PUBLIC;
REVOKE ALL ON FUNCTION m.filter_new_candidates(jsonb) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION m.filter_new_candidates(jsonb) TO service_role;
