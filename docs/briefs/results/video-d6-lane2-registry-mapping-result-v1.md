CLAIMED v5.83 · Video D6 Lane 2 (registry mapping) · worktree video-d6-lane2-docs · gate: docs-record commit · 2026-07-19

# Video D6 — Lane 2 (registry mapping) — RESULT: exit tests PASS

**Lane:** Video D6 Lane 2 — make `select_template('video_short_stat')` resolve for Property-Pulse through the creative-library spine.
**Decision (PK, 2026-07-19):** **A (baked background) + A2 (client-scope resolver rung).**
**Tier:** T3 (SECURITY DEFINER function replacement + additive DML). **Lane classification:** PRODUCT_PROOF.
**Outcome:** ✅ PASS — video path resolves through the spine; cross-brand safe; image path unregressed; migration ledger reconciled.
**Harness:** `_harness/video_d6_lane2_20260719/` (packet, M1/M2 artifacts, rollback, envelopes, chain-status, RESULT).

## What shipped (live on `content_engine` / mbkmaxqhsohbtwsqolns)

- **M1 — `select_template` client-scope rung (A2).** Adds `t.client_id AS owner_client_id` to the candidate scan; `scope='client'` is now selectable **only for the owning client** (`owner_client_id = caller`); `generic` path byte-unchanged; `brand`/other still `wrong_scope`. Winner reason `client_scope` vs `generic_scope`. `STABLE SECURITY DEFINER search_path=''` preserved; CREATE OR REPLACE → ACL unchanged (postgres/service_role only).
- **M2 — additive registry rows for template `a3d8472d`** (Creatomate `c11bb8ab`, `video_stat_reveal_9x16_v2`, scope `client`, `client_id`=PP): status→`visually_approved` (CAS); variant_candidate `video_short_stat`/`stat-reveal-9x16-video-v2`/`strong_candidate`; `Logo` logo-field (background **baked** — no bg field, per D2); platform suitability `candidate`/`feed` for facebook/instagram/linkedin; client assignment `client_allowed`/`visually_approved`/PK; proof event `visual_approval`/`passed` (evidence render `8c41689a` + Lane 1 PK visual+audio PASS). One fail-closed txn with in-txn asserts.

## Exit-test evidence (live, post-apply)

- PP `video_short_stat` facebook / instagram / linkedin → **`ok`**, winner `a3d8472d`, `slot_resolution.modifications.'Logo.source' = …/Property_Pulse/Logos/PP_logo_2.png`, warning `platform_suitability_unproven` (expected — mirrors image path).
- NDIS `video_short_stat` → **`fail_closed / no_selectable_template`** (cross-brand neutrality: owner-tie + assignment gate).
- Image regression: PP + NDIS `image_quote` winner **`0e006c5c`** unchanged; `c0b10001-…-0002` moved `rejected`→`alternatives` — the single, PK-accepted A2 activation (render-safe: sorts last, never rank-0 with null intent; all live image callers pass null intent + consume only the winner).
- Logo parity: PP `brand_logo_url` == spine first-eligible logo == the logo render `8c41689a` used (`PP_logo_2.png`) — proof reuse is faithful.

## Review chain

- **db-rls-auditor:** v1 `concerns→reconciled` (caught the `c0b10001` activation — corrected + winner-pin assert added); v2 `clean/pass` (no must_fix).
- **external `ask_chatgpt_review`:** v1 `agree/med/high` `155f075a` (superseded); v2 `agree/med/high` `5cb91e39` (pinned packet `c8da1750…` / M2 `2d7b52d9…`).

## Process record

- **Apply-time defect caught & fixed:** M2 v1 fail-closed on missing platform suitability (`no_suitability_row_for_platform`) → rolled back clean (zero partial state) → v2 added suitability rows → passed. Fail-closed design worked as intended.
- **Envelope discipline:** L2-ENV-001 voided by an unexpected-origin-movement STOP (concurrent docs lanes); L2-ENV-002 (M1+M2) → M1 applied, M2 v1 failed; L2-ENV-003 (M2-only) approved → M2 applied. Lesson: benign-verification of origin movement does NOT restore a tripped Convention-2 envelope — a fresh PK gate is required.
- **Migration ledger reconciled:** M1 (`20260719010700`) + M2 (`20260719010800`) inserted into `supabase_migrations.schema_migrations` (both had been applied via PK direct SQL, since `apply_migration` stayed harness-denied). M1 `statements` byte-exact; M2 `statements` replayable-equivalent (condensed) — byte-exact originals in the harness artifacts. Each carries a `rollback` entry.
- **Shared-worktree race:** during the docs commit, a parallel lane's unpushed commit `af9ac35` (prv_readonly) swept this lane's v5.83 `sync_state` block into it. Per PK, the docs commit was finished in an **isolated worktree** (`video-d6-lane2-docs`); the `sync_state` v5.83 pointer therefore lands via `af9ac35`, `action_list` v5.83 + this result doc via the isolated commit. Reconcile at push so v5.83 is not duplicated.
- **Rollback artifacts:** M1 → `_harness/video_d6_lane2_20260719/lane2-select_template-rollback-prior.sql`; M2 → packet §Rollback M2.

## Carries / next (FENCED — own PK gate each)

- **Lane 3 (T3 code + PK deploy):** de-hardcode video-worker (D6-8+6+7 atomic) — replace direct-bind (`B1_VIDEO_PROVIDER_TEMPLATE_ID` / baked-bg / `isB1GovernedVideoStat` PP-UUID gate / contract literals) with `select_template`+`resolve_slot_assets` (mirror image `buildTmrRenderPlan`). First spine-driven render = render-parity visual gate. ⚠ Rotate the Creatomate key before any render (D7 carry).
- **Lane 4 (T2/T3 DB):** D6-9 voice map `VOICE_ENV_BY_CLIENT_ID` → governed table (already client_id-keyed + fail-closed).
- **CCF tooling candidate (future):** single-use hash-welded apply gate — `docs/briefs/ccf-single-use-gate-capability-candidate-v1.md`.
