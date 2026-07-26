# Apply Packet — Batch 1 / Gap 1 · Path B: PP YouTube static-background re-scope (data-only)

> **Lane:** S1/S4/S8 Asset Gap · **Register:** `docs/briefs/ice-asset-gap-register-v1.md` (`163c9132`), gap **P0-1**.
> **Supersedes for this gap:** the Path-A sourced manifest `a19e635e` + brief `f091333a` — **PK chose Path B (data-only re-scope) 2026-07-26.** Path-A fenced candidates remain on disk, un-applied, available if PK reverses.
> **Status:** `FROZEN apply packet — PREPARATION-ONLY`. Production DML on live `c.client_brand_asset` = **T3, rotation-affecting**. **STOPS at the PK apply gate. This lane does NOT run the DML.**
> **Base (stale-ref):** CE HEAD `8e3e9d6`, branch `main`, ahead 1 / behind 0 of `origin/main 5488e85`. Project `mbkmaxqhsohbtwsqolns`. All facts below read live 2026-07-26.

---

## 1 · What Path B is (verified, not assumed)

The P0-1 gap (PP × youtube × `youtube_thumbnail` static background) closes **data-only** — the only barrier is a
missing `youtube` value in the `platform_scope[]` of PP's existing 16:9 backgrounds. **No sourcing, no upload, no
new rows.** Verified against the *runtime* resolver, not just the analyzer:

- **`resolve_slot_assets` (SECURITY DEFINER, the render-time resolver)** eligibility loop keys on
  `asset_meta->>'usage' IN ('background','logo')` — **not** on any `youtube_thumbnail_background` usage value. The
  existing `usage='background'` rows already qualify on usage.
- Its platform gate is exactly: `platform_scope IS NOT NULL AND p_platform <> ALL(platform_scope) → 'platform_excluded'`.
  Adding `youtube` to `platform_scope` clears it. **This is the entire fix.**
- **No aspect-ratio filter exists in the resolver** → re-scope only the genuinely 16:9 scenes (quality gate is ours, by selection).
- All other per-row gates already pass on the targets: `is_active=true`, `approved=true`, `license` present,
  `bucket='brand-assets'`, `safe_for_text_overlay='needs_scrim'` (∈ the accepted set {true, needs_scrim}; resolver applies scrim 48).

### Baseline (captured live 2026-07-26, seed `baseline-probe-pathb`)
- `analyze_asset_gap('property-pulse','youtube','youtube_thumbnail',…)` → `asset_gap_detected=true`,
  `select_template_status=fail_closed`, `asset_gap_drainability=drainable`, `client_pool_policy=client_only`,
  `candidate_template_id=7f3e6587-509e-4305-af37-1a3fe3311efa`, `needs_governed_background=true`, `needs_logo=true`.
  Its `near_match_breakdown` shows ~22 client backgrounds rejected **solely** for `platform_excluded` on a
  **`configurable`** fence — machine confirmation this is a data/config fix, not a sourcing gap.
- `resolve_slot_assets('property-pulse','youtube','youtube_thumbnail','7f3e6587…','baseline-probe-pathb')`
  → `status=fail_closed`, `fail_reason=no_governed_background`, `selected=[]`, every 16:9 bg rejected `platform_excluded`.

### Logo-slot dependency — already satisfied (verified, no change needed)
The template requires a **Logo** slot (`needs_logo=true`). **`pp_logo_primary` (`b7530c55`) has `platform_scope=NULL`**,
so the resolver's platform gate is skipped for it (it only raises the `platform_scope_unbacked` warning — the lone
warning in the baseline) and it lands in the eligible-logo set. It is **absent from the baseline rejected list**.
Therefore, once a background is in scope, the resolver reaches `status=ok` with **both** Background and Logo filled.
**Path B changes backgrounds only; the logo needs nothing.** (The post-apply efficacy assertion in §4 proves this, fail-closed.)

---

## 2 · The re-scope target set

**Sufficiency target ≥2 (register ideal 4). Sufficiency, not max volume.** All 7 active, approved, 16:9 PP
backgrounds currently lacking `youtube` are eligible candidates. Recommended set = 4 distinct high-suitability
scenes (rotation variety, calm sky/negative space for thumbnail headline overlay):

| # | asset_id | asset_key | scene | sha256(12) | current scope | Rec |
|---|---|---|---|---|---|---|
| 1 | `b2a10008-9c4e-4f7a-8d21-0d5e6f7a8b08` | `bg_pp_perth_cbd_skyline_day_wide` | Perth CBD bright-day skyline hero | `620c77b43edc` | {fb,li} | ⭐ |
| 2 | `47f489f4-e3a4-4c2f-8ea4-215becbb5c47` | `bg_brisbane_cbd` | Brisbane CBD suburbs | `812d8f39350c` | {fb,ig,li} | ⭐ |
| 3 | `3769be84-8280-4bc1-80e5-141ba44420c8` | `bg_sydney_cbd` | Sydney CBD suburbs | `74cfd47f3ffb` | {fb,ig,li} | ⭐ |
| 4 | `b2a10002-9c4e-4f7a-8d21-0d5e6f7a8b02` | `bg_pp_au_suburb_aerial_grid` | Generic AU suburb aerial grid | `68c8bd645b61` | {fb,ig,li} | ⭐ |
| 5 | `f9caed52-0859-4e22-91f6-7dc998485d77` | `bg_perth_cbd` | Perth CBD suburbs | `6ab242ab1de1` | {fb,ig,li} | opt |
| 6 | `b2a10001-9c4e-4f7a-8d21-0d5e6f7a8b01` | `bg_pp_perth_skyline_dawn_moody` | Perth skyline dawn (moody) | `8279d87d9464` | {fb,li} | opt |
| 7 | `b3a20007-9c4e-4f7a-8d21-0d5e6f7a8b07` | `bg_pp_mortgage_calculator_keys` | Mortgage calculator + keys (flat-lay) | `84dbab66a9fe` | {fb,ig,li} | opt |

**PK decides the exact set at the gate** (visual/governance call). The apply SQL below is parameterised by asset_id
list — the recommended 4 rows 1–4; PK may trim to ≥2 or add rows 5–7. Rows 6/7 are optional (two Perth skylines are
partly redundant; the mortgage flat-lay is busier / less ideal as a thumbnail).

---

## 3 · Apply SQL (single atomic channel — fail-closed; NOT run by this lane)

Run as **ONE** `apply_migration` call (single transaction; a `DO` block is one statement — any `RAISE EXCEPTION`
aborts the whole migration → full rollback). **Do NOT split across pooled calls** (a split breaks atomicity — the
cc-0079 Slice-2 failure class). Set `<TARGETS>` to the PK-approved asset_id list (default = rows 1–4).

```sql
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
```

**Atomicity note:** the UPDATE, all assertions, and the efficacy probe run inside one `DO` block. `resolve_slot_assets`
is STABLE and reads the same-transaction snapshot, so it sees the just-applied scope before COMMIT — if efficacy fails,
the whole re-scope rolls back. Nothing partial can commit.

## 3b · Post-commit live proof (run by the apply hand AFTER commit)

```sql
-- 1) confirm persisted scope
SELECT asset_id, asset_meta->>'asset_key' AS asset_key, platform_scope
FROM c.client_brand_asset WHERE asset_id = ANY(ARRAY[/*<TARGETS>*/]::uuid[]);
-- 2) confirm gap closed
SELECT public.analyze_asset_gap('property-pulse','youtube','youtube_thumbnail','post-apply-proof')->>'asset_gap_detected';   -- expect false
SELECT public.select_template('property-pulse','youtube','youtube_thumbnail',NULL,'post-apply-proof')->>'status';            -- expect NOT fail_closed
```

## 4 · Rollback (authored + validated BEFORE apply — exact reversal)

Removes `youtube` from the same target set only; restores byte-identical pre-state (targets had no `youtube` before,
per §2 current scope). Single atomic `DO` block, same anti-split rule.

```sql
DO $$
DECLARE
  v_targets uuid[] := ARRAY[
    'b2a10008-9c4e-4f7a-8d21-0d5e6f7a8b08',
    '47f489f4-e3a4-4c2f-8ea4-215becbb5c47',
    '3769be84-8280-4bc1-80e5-141ba44420c8',
    'b2a10002-9c4e-4f7a-8d21-0d5e6f7a8b02'
  ]::uuid[];                                   -- MUST equal the applied <TARGETS>
BEGIN
  UPDATE c.client_brand_asset a
     SET platform_scope = array_remove(a.platform_scope, 'youtube'),
         updated_at = now()
   WHERE a.asset_id = ANY(v_targets);
  IF EXISTS (SELECT 1 FROM c.client_brand_asset
              WHERE asset_id = ANY(v_targets) AND 'youtube' = ANY(COALESCE(platform_scope,'{}'))) THEN
    RAISE EXCEPTION 'STOP rollback incomplete';
  END IF;
END $$;
```

> ⚠ Rollback identity: the rollback `v_targets` **must be byte-identical** to the applied set. If PK trims/expands
> the target set at the gate, update **both** §3 and §4 arrays together before freeze (apply/rollback identity check).

## 5 · Review chain + gate status

- **db-rls-auditor** — run on this packet (verdict recorded below at freeze). Read-only DB subject review.
- **branch-warden** — run before any commit of this packet.
- **External review (`ask_chatgpt_review`)** — ✅ **DONE, CLEAN.** Ran 2026-07-26 pinned to `reviewed_input_hash`
  `36eaa0090e85`: `verdict=agree`, `decision=proceed`, `escalate=false`, `risk=medium`, `confidence=high`,
  `review_id=f173b014-7e31-4517-9ed4-7d707c5474c8` (`idempotent=false`, fresh). **The connector is working** — the
  earlier "auth error / blocked" note was stale/misdiagnosed; the real failure mode is the large-`context` payload
  rejection, avoided by placing the packet in `proposal`. Review is valid only for this hash — re-run if the SQL/targets change.
- **Migration name (required at the gate)** — this runs via `apply_migration`, which records a ledger entry and mints
  its own version (ICE trap: name = permanent identity). The orchestrator/PK must supply a **fresh, unique, sequential**
  name at the gate and re-check for collision; no name is pinned in this packet.
- **PK apply gate (hard stop)** — PK approves the target set + runs the single `apply_migration` call. Convention-2
  sequence approval is acceptable only if it pins this packet's hash, the ordered steps, and the STOP conditions.

## 6 · STOP conditions (any → void remainder, fresh PK gate)
Packet-hash mismatch · target set changed without both §3/§4 arrays updated · any `RAISE EXCEPTION` STOP fires ·
non-clean db-rls-auditor / branch-warden · external-review still blocked at apply · post-commit `analyze_asset_gap`
still `asset_gap_detected=true` · any non-target asset's `platform_scope` moved.

## 7 · Forbidden (this lane)
No upload · no new DB row · no approval flip · no `is_active` change · no template/rotation-config change · no logo
change (not needed) · no commit/push/migration/deploy by this lane · does not approve itself. **STOP at the PK apply gate.**
