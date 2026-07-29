-- ============================================================================
-- RECONCILIATION BACKFILL (cc-0087, 2026-07-29): this file was NOT originally
-- committed to git under this name/version. It reproduces exact content that was
-- actually applied LIVE to project mbkmaxqhsohbtwsqolns, sourced from:
--   docs/briefs/asset-intake-batch1-gap1-pathB-rescope-apply-packet-v1.md §3
-- Any 'NOT APPLIED' / 'PREPARED' / 'DESIGN' framing below is the ORIGINAL packet's
-- pre-apply language, preserved for historical fidelity -- it is STALE; this
-- migration IS live (confirmed against the Supabase migration ledger and, where
-- checked, live pg_get_functiondef/information_schema state). See
-- docs/briefs/results/cc-0087-migration-ledger-reconciliation-result-v1.md.
-- ============================================================================

-- Source: docs/briefs/asset-intake-batch1-gap1-pathB-rescope-apply-packet-v1.md §3
-- Path B: re-scope 4 PP active/approved 16:9 backgrounds to include 'youtube' in platform_scope.
-- Fail-closed: precondition guard, row-count assert, pool-neutrality assert, efficacy probe — all in
-- one DO block/transaction; any RAISE EXCEPTION aborts the whole migration.

DO $$
DECLARE
  v_targets uuid[] := ARRAY[
    'b2a10008-9c4e-4f7a-8d21-0d5e6f7a8b08',
    '47f489f4-e3a4-4c2f-8ea4-215becbb5c47',
    '3769be84-8280-4bc1-80e5-141ba44420c8',
    'b2a10002-9c4e-4f7a-8d21-0d5e6f7a8b02'
  ]::uuid[];                                   -- <TARGETS>: PK-approved set
  v_pp uuid := '4036a6b5-b4a3-406e-998d-c2fe14a8bbdd';
  v_expected int := array_length(
    (SELECT array_agg(DISTINCT t) FROM unnest(v_targets) t), 1);
  v_updated  int;
  v_yt_before int;
  v_yt_after  int;
  v_other_yt_before int;
  v_other_yt_after  int;
  v_resolve jsonb;
BEGIN
  -- baseline counts (before) --------------------------------------------------
  SELECT count(*) INTO v_yt_before
    FROM c.client_brand_asset
    WHERE asset_id = ANY(v_targets) AND 'youtube' = ANY(COALESCE(platform_scope,'{}'));
  SELECT count(*) INTO v_other_yt_before
    FROM c.client_brand_asset
    WHERE client_id = v_pp AND asset_id <> ALL(v_targets)
      AND asset_meta->>'usage' = 'background'
      AND 'youtube' = ANY(COALESCE(platform_scope,'{}'));

  -- guard: targets must be exactly PP active/approved 16:9 backgrounds ---------
  IF (SELECT count(*) FROM c.client_brand_asset
        WHERE asset_id = ANY(v_targets)
          AND client_id = v_pp
          AND asset_meta->>'usage' = 'background'
          AND is_active = true
          AND asset_meta->>'approved' = 'true'
          AND asset_meta->>'aspect_ratio' = '16:9') <> v_expected THEN
    RAISE EXCEPTION 'STOP precondition: one or more targets is not a PP active approved 16:9 background';
  END IF;

  -- the re-scope: add youtube, idempotent, dedup-preserving --------------------
  UPDATE c.client_brand_asset a
     SET platform_scope = a.platform_scope || ARRAY['youtube'],   -- append last; preserves existing order (WHERE guarantees no dup) → rollback is byte-identical
         updated_at = now()
   WHERE a.asset_id = ANY(v_targets)
     AND NOT ('youtube' = ANY(COALESCE(a.platform_scope,'{}')));
  GET DIAGNOSTICS v_updated = ROW_COUNT;

  -- assert: all targets now youtube-scoped ------------------------------------
  SELECT count(*) INTO v_yt_after
    FROM c.client_brand_asset
    WHERE asset_id = ANY(v_targets) AND 'youtube' = ANY(platform_scope);
  IF v_yt_after <> v_expected THEN
    RAISE EXCEPTION 'STOP: expected % targets youtube-scoped, got %', v_expected, v_yt_after;
  END IF;
  IF v_updated <> (v_expected - v_yt_before) THEN
    RAISE EXCEPTION 'STOP: row-count mismatch (updated %, expected %)', v_updated, (v_expected - v_yt_before);
  END IF;

  -- pool-neutrality: no OTHER PP background changed youtube membership --------
  SELECT count(*) INTO v_other_yt_after
    FROM c.client_brand_asset
    WHERE client_id = v_pp AND asset_id <> ALL(v_targets)
      AND asset_meta->>'usage' = 'background'
      AND 'youtube' = ANY(COALESCE(platform_scope,'{}'));
  IF v_other_yt_after <> v_other_yt_before THEN
    RAISE EXCEPTION 'STOP pool-neutrality: non-target youtube-background count moved % -> %',
      v_other_yt_before, v_other_yt_after;
  END IF;

  -- efficacy: resolver now returns ok with a Background selected --------------
  v_resolve := public.resolve_slot_assets(
    'property-pulse','youtube','youtube_thumbnail',
    '7f3e6587-509e-4305-af37-1a3fe3311efa'::uuid,'apply-efficacy-probe');
  IF (v_resolve->>'status') <> 'ok'
     OR NOT (v_resolve->'selected' @> '[{"slot":"Background"}]'::jsonb)
     OR NOT (v_resolve->'selected' @> '[{"slot":"Logo"}]'::jsonb) THEN
    RAISE EXCEPTION 'STOP efficacy: resolver did not return ok+Background+Logo: %', v_resolve->>'status';
  END IF;

  RAISE NOTICE 'Path B OK: % targets youtube-scoped, resolver=ok, pool-neutral', v_yt_after;
END $$;
