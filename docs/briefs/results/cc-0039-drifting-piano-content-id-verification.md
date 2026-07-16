CLAIMED v5.54 · cc-0039-drifting-piano-content-id-verify · shared default worktree (main) · T3 apply + register pointer · 2026-07-16T06:07Z

# Result cc-0039 — Drifting Piano YouTube Content-ID verification + content_id_safe flip (B3 restored)

**Completed:** 2026-07-16 Sydney
**Lane:** cc-0039 · **Tier:** T2 verification → T3 apply · **Label:** PRODUCT_PROOF (safety-sensitive write)
**Brief:** `docs/briefs/cc-0039-drifting-piano-content-id-verification.md`
**Outcome:** ✅ B3 restored TRUE — governed PP `video_short_stat` renders VO + music bed (Drifting Piano) again.

---

## What happened

The B3 blocker (`select_music('format','video_short_stat')` returning 0 rows) was caused by the `require_content_id_safe` rule excluding the only otherwise-eligible track, **Drifting Piano** (`calm_piano_drifting_006`, CC0), whose `content_id_safe` was a deliberate **fail-closed UNKNOWN**. This lane resolved that UNKNOWN empirically and flipped the flag.

### 1. Content-ID verification (T2)
- Built a **track-forward** test clip: full Drifting Piano audio (byte-identical to the production track, sha `5d1d80af…`) over a plain navy card. Output `contentid_test_drifting_piano.mp4`, sha `888fec34…`, AAC stereo, ~112s.
- **PK uploaded it UNLISTED to the Property Pulse production YouTube channel** (as a Short, "test").
- **Verdict — CLEAN (PK, 2026-07-16):** no Content-ID claim / no copyright notice observed in YouTube Studio.
- **Risk posture (PK-accepted):** Content-ID scans asynchronously → a late claim is theoretically possible; mitigated by the proven, single-command rollback.

### 2. content_id_safe flip (T3)
- **Artifact:** `flip_content_id_safe_FORWARD.sql`, reviewed sha256 `22bf5775e785736d2500bc61a24fc16579b960e01280b98afdfdc0ef2e89dbea`.
- Single-row CAS-guarded flip of `m.music_license.content_id_safe` false→true for `track_id=8f520a93-a2ed-4ba3-80fa-1ca4884dff88`, with an in-txn post-assert that `select_music('format','video_short_stat',12,null)` then returns exactly 1.
- **Mechanism:** execute_sql fallback + ledger backfill (PK-elected; `apply_migration` deny-lift NOT used — not needed). Ledger row `version=20260716060642`, `name=flip_music_license_content_id_safe_drifting_piano_cc0039`, `created_by=pk@invegent.com`, forward + rollback statements recorded. Repo migration file added at the matching version.

## Review chain (all pinned to sha `22bf5775…`)
- **db-rls-auditor → PASS** — CAS sound; PK-pinned single row; no RLS/grant/REST exposure introduced (`m.music_license` service-role-only, deny-all RLS, reads via SECURITY DEFINER `select_music`); full 9-track eligibility simulation shows only Drifting Piano becomes eligible; migration name unique. Nuance: the in-txn `count=1` post-assert proves "≥1 eligible / B3 restored" (0 aborts) because `select_music` has `LIMIT 1`; exclusivity is proven independently by the simulation.
- **external review (ChatGPT bridge) → AGREE**, risk medium, confidence high, no escalation. review_id `08cdc283-c91f-4cca-9c6c-638d873ef16b`.
- **Pre-apply zero-persist validation** (live row, aborting DO block, nothing committed): before=false · flip_rowcount=1 · after_flip=true · select_music_after_flip=1 · rollback_rowcount=1 · after_rollback=false.

## Post-apply verification (PK's 8 checks — all ✅)
1. Drifting Piano `content_id_safe` = **true** ✅
2. `select_music('format','video_short_stat',12,null)` returns **1** row ✅
3. that row is **Drifting Piano** (`calm_piano_drifting_006`) only ✅
4. all other 8 tracks remain **ineligible** (full-library replay) ✅
5. **B3 restored TRUE** ✅
6. **no B-roll rows changed** — 2 `broll_background` rows, both inactive, most-recent update 2026-07-10 (predates today); this lane issued no `c.client_brand_asset` write ✅
7. **no video-worker change** — no `deploy_edge_function` call; deployed remains v3.7.0 (platform version 60) ✅
8. **no render triggered** — no worker POST issued ✅

## Live consequence
The next governed PP `video_short_stat` render (cron jobid 33, every 30 min) will bind **Drifting Piano** as the music bed instead of rendering silent — restoring the PK-approved VO + music-bed combo. `enabled=true` was already live.

## Rollback
`flip_content_id_safe_ROLLBACK.sql`, sha `4c63fcbe…` (proven zero-persist). Applying it returns `content_id_safe`→false → `select_music`→0 rows → VO-only silent bed. No other state touched.

## Scope boundary / carries (NOT closed here)
- Restores **B3 only**. **Level B still needs B4** (fail-closed proof, cc-0038, held).
- **cc-0035 CtaText clipping** carry unchanged / unrelated.
- **Content-ID evidence caveat:** CLEAN is an async-scan snapshot; a late claim would be handled by rollback.
- Observation (not this lane): repo migration `20260711003222_select_music_per_platform_scope.sql` is present but **unapplied** (not in ledger) — a parallel lane's WIP; the live selector remains the `require_content_id_safe` version this lane verified against.
- No B-roll promotion; C1 (geo-pairing) still open and still gates any B-roll promotion.
