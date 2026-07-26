# Result — Batch 1 / Gap 1 · Path B: PP YouTube static-background re-scope (data-only) — APPLIED PASS

> **Lane:** S1/S4/S8 Asset Gap · **Register:** `ice-asset-gap-register-v1` (`163c9132`), gap **P0-1** → **CLOSED**.
> **Packet:** `docs/briefs/asset-intake-batch1-gap1-pathB-rescope-apply-packet-v1.md` (reviewed-substance sha256 `36eaa0090e85`).
> **Tier:** T3 (production DML, rotation-affecting). **Outcome:** ✅ APPLIED PASS, live-proven. **Date:** 2026-07-26.
> **Base:** CE HEAD `8e3e9d6`, ahead 1 / behind 0 of `origin/main 5488e85`. Project `mbkmaxqhsohbtwsqolns`.

## 1 · What was done
PK chose **Path B (data-only)** over the Path-A sourced pack. A single atomic `apply_migration` added the string
`youtube` to `platform_scope[]` of **4** existing Property Pulse (`client_id 4036a6b5-…`) 16:9 backgrounds — closing
the P0-1 gap (PP × youtube × `youtube_thumbnail` static background) with **zero sourcing, no new rows, no upload,
no `is_active`/`approved`/logo change, no DDL, no GRANT/REVOKE**.

**Migration:** `rescope_pp_youtube_thumbnail_backgrounds_pathb` (applied version stamped by the ledger). **Run by:** S1
apply hand under explicit PK gate authorization ("the recommended 4, you run it", 2026-07-26).

**Target set (recommended 4), post-apply `platform_scope`:**
| asset_id | asset_key | platform_scope (after) |
|---|---|---|
| `b2a10008-9c4e-4f7a-8d21-0d5e6f7a8b08` | `bg_pp_perth_cbd_skyline_day_wide` | `{facebook,linkedin,youtube}` |
| `47f489f4-e3a4-4c2f-8ea4-215becbb5c47` | `bg_brisbane_cbd` | `{facebook,instagram,linkedin,youtube}` |
| `3769be84-8280-4bc1-80e5-141ba44420c8` | `bg_sydney_cbd` | `{facebook,instagram,linkedin,youtube}` |
| `b2a10002-9c4e-4f7a-8d21-0d5e6f7a8b02` | `bg_pp_au_suburb_aerial_grid` | `{facebook,instagram,linkedin,youtube}` |
(`youtube` appended last, existing order preserved → rollback via `array_remove` is byte-identical. All 4 share
`updated_at = 2026-07-26 07:15:01.548722+00` — atomic.)

## 2 · Why data-only was sufficient (verified against the runtime resolver, not just the analyzer)
`public.resolve_slot_assets` (STABLE SECURITY DEFINER) gates background eligibility on `usage IN ('background','logo')`
and excludes via `platform_scope IS NOT NULL AND p_platform <> ALL(platform_scope)`. The 4 targets already passed every
other gate (active, approved, license present, bucket `brand-assets`, `safe_for_text_overlay='needs_scrim'`, 16:9);
`youtube` was the sole barrier. The required **Logo** slot was already satisfied by `pp_logo_primary` (`b7530c55`,
`platform_scope=NULL` → platform gate skipped). There is no `youtube_thumbnail_background` usage requirement and no
aspect filter in the resolver (Path-A's proposed usage value was never needed).

## 3 · Review chain (all clean, pinned to `36eaa0090e85`)
- **db-rls-auditor** → `clean/pass`, high confidence — every load-bearing claim independently verified live.
- **external review** (`ask_chatgpt_review`) → `agree`/`proceed`, medium risk, high confidence, review_id
  `f173b014-7e31-4517-9ed4-7d707c5474c8` (fresh, non-idempotent). **Connector confirmed working** (the prior
  "connector-blocked / auth error" note was misdiagnosed — real failure mode is the large-`context` payload rejection).
- **apply-harness class:** single `DO` block = one atomic channel; not split across pooled calls.

## 4 · In-transaction guards (all passed — migration would have rolled back otherwise)
Precondition (4 targets are PP active/approved/16:9 backgrounds) · row-count (`v_updated == v_expected - v_yt_before`
= 4-0) · target coverage (`v_yt_after == 4`) · **pool-neutrality** (non-target PP-background youtube count unchanged,
baseline 0) · **efficacy** (in-txn `resolve_slot_assets` returned `status=ok` with Background + Logo). Migration
returned `success:true` → all assertions held.

## 5 · Post-commit live proof (independent, fresh seed `post-apply-proof`)
- `analyze_asset_gap('property-pulse','youtube','youtube_thumbnail',…)` → **`asset_gap_detected=false`** (was `true`).
- `select_template('property-pulse','youtube','youtube_thumbnail',NULL,…)` → **`status=ok`** (was `fail_closed`).
- PP backgrounds now youtube-scoped = **4** (was 0; exactly the 4 targets — pool-neutral).

## 6 · Pre-apply STOP checks (all clear at apply time)
HEAD `8e3e9d6` unchanged · packet substance intact (`36eaa0090e85`; only §5 review-record annotations differed) ·
migration name no collision (absent from ledger) · fresh re-verify 4/4 targets qualify + 0 already youtube + pool
baseline 0.

## 7 · Rollback (authored + validated; not needed)
`array_remove(platform_scope,'youtube')` on the same 4 asset_ids restores byte-identical pre-state
(`{facebook,linkedin}` / `{facebook,instagram,linkedin}`). Single atomic `DO` block, packet §4.

## 8 · Carries / next
- **Register:** cut a v6.28+ POINTER for this closure (Convention 1 — result doc is canonical; register gets ≤5-line
  pointer). Commit/push of this result doc + the connector-claim corrections + the register pointer is **PK-gated**;
  branch-warden runs at that commit.
- **Batch-2** (per `502f1d58`, PK-gated, non-mutating prep): Invegent/CFW bg starter + brand-colours data fill (both
  NULL); promote NDIS authoritative logo `d1b10010` (earliest-created-logo nuance).
- **P1-6 foreground subject** (optional thumbnail foreground) — not part of Path B; separate future item if desired.
- **Path-A fenced candidates** (manifest `a19e635e`) remain un-applied on disk; superseded by Path B for this gap.

## 9 · Non-claims
No visual render was produced (efficacy asserted via the resolver, in-txn + post-commit). No thumbnail was published.
No other client/platform/format touched. No logo, no new asset, no approval flip. The 4 scenes' visual suitability as
YouTube thumbnails is PK's governance call (PK selected the recommended 4).
