# Lane 3 — Scrim-48 Recalibration — Build/Apply Packet

**Created:** 2026-07-03 Sydney (persisted to file at apply time 2026-07-04) · **Queue:** item 3 (PK-ratified order) · **Design authority:** PK proof-wall A/B calibration 2026-07-03 (registers v4.78: 48 preferred default · 64 busy/dense-text only · 80 excluded)
**Status at cut:** review chain complete — awaited the PK apply gate (HARD STOP). **Outcome:** PK approved **"apply — override design ratified"** → applied 2026-07-04; see `docs/briefs/results/lane3-scrim48-result.md`.
**Artifact:** `resolve_slot_assets` v1.1 migration · **sha256 `961feef0b654ceb18d5da367dd71db128ebc998b5f4c678112c4d722d1ebaf7e`** (repo file `supabase/migrations/20260704002811_update_resolve_slot_assets_v1_1_scrim48.sql` after the post-apply ledger rename)
**Tests:** `docs/briefs/creative-asset-selection-slice1-validation.mjs` (sha256 `9247d474…`) **84/84** + `docs/briefs/template-selection-v0-lane-c-validation.mjs` (sha256 `f127f199…`) **58/58** + S1 suite **47/47** — all PGlite over the REAL migration files, independently re-run. (Note: the earlier lane-c packet pins the stale pre-Lane-3 harness hash `dec42c79…`; `f127f199…` supersedes it — recorded carry.)

## 1. What it is

CREATE OR REPLACE of `public.resolve_slot_assets(text,text,text,uuid,text)` — same posture (STABLE · SECDEF · `search_path=''` · service-role-only; defensive REVOKE/GRANT retained). Delta vs v1:

1. `c_scrim_opacity_needs_scrim` **64 → 48** (PK-calibrated; constants no longer `to_be_calibrated`; `text_safe` stays 40).
2. **Governed per-asset override** `asset_meta->>'scrim_opacity_override'` — the "busy background" 64-exception as PK-set **data**, not a heuristic: backgrounds only · consulted only when the template has a Scrim element · numeric → clamped 0..100 and applied with Background reason `scrim_override_applied` (provenance) · non-numeric → ignored with warning `scrim_override_invalid` once, class constant stands (fail-safe, never raises).
3. Explicit non-change: Scrim element detection keeps **no `dynamic` filter** (generics' Scrim rows are `dynamic=false` yet accept opacity mods — Lane-0 carry).

Consumers by composition (`select_template`, `stamp_tmr_shadow_forward`) pick the new values up automatically; the stamper's `selector_version` constant is unaffected (selector unchanged) — no companion migrations.

## 2. Review chain (all pinned to `961feef0…`)

| Gate | Verdict |
|---|---|
| ef-builder (isolated worktree `agent-ab17e7579a3da1340`) | migration + 2 harness updates; harvested byte-identical |
| Hermetic tests | tri-suite green 84/84 + 58/58 + 47/47, independently re-run |
| db-rls-auditor | **PASS zero-must-fix** — zero repo-vs-live drift; live v1 body_md5 baseline `f83948efe7c5596f4bee112161ad4a8c`; **0/29 assets carry the override key** → apply delta = pure 64→48 |
| security-auditor | **GREEN apply-eligible** — sole residual: pathological >131072-digit numeric override raises fail-loud 22003 (trusted-writer-only surface; optional regex length bound deferred as cosmetic) |
| external review | **agree / proceed · zero pushback** — `review_id 6d546362-3d2e-4678-b432-9cd8de67fbe0` |

## 3. Apply plan (executed as written — see result doc for evidence)

1. Re-verify sha256 → apply migration `update_resolve_slot_assets_v1_1_scrim48`.
2. Posture proofs (SECDEF/STABLE/search_path/ACL; body_md5 change from `f83948…`) + anon REST 401.
3. PP happy path → `Scrim.opacity` 48, winner `bg_perth_cbd`, no `scrim_override_applied`; override-absence still 0/29; `select_template` embedded slot_resolution = 48.
4. Advisors no-new-findings → ledger rename → result doc + registers → stop. **Commit/push = separate PK gate.**

## 4. Boundaries / non-claims

No production behaviour change (all consumers dark; sole caller = idle S1 stamper) · no render · no publish · no runtime/worker/dashboard change · no DML · no Format Mix · no enablement · rotation (item 4) + P0 promotion review (item 5) untouched. Rollback: re-apply the v1 body from `20260703002813_create_resolve_slot_assets_v1.sql` under a NEW migration number.
