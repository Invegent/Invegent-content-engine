CLAIMED v5.89 · Video D6 Lane 3 (video-worker spine de-hardcode) · worktree ice-wt-video-d6-lane3 (merged) · gate: CLOSED (PK visual+audio PASS) · 2026-07-19

# Result — Video D6 Lane 3: video-worker code de-hardcode (D6-8 + D6-6 + D6-7, ATOMIC) — CLOSED

**Status:** ✅ CLOSED — PK visual+audio PASS on the spine-driven parity smoke. **Lane class:** PRODUCT_PROOF. **Tier:** T3 (production code + EF deploy).
**Brief:** `docs/briefs/video-d6-lane3-code-dehardcode-gate1-brief-v1.md`. **Deployed:** video-worker `v3.7.0 → v3.8.0`.
**Commits:** `13ba199` (atomic de-hardcode) + `f2214e5`→ rebased `11976d4` (smoke parity guard) on `main`; origin parity 0/0.

## What shipped

The governed Property-Pulse `video_short_stat` production render now runs through the **live TMR spine**, mirroring the image path. Three de-hardcodes, atomic:

- **D6-8 (direct-bind + logo source).** `renderGovernedVideoStat` calls `public.select_template(clientSlug, null, 'video_short_stat', …)`; a **baked-bg** plan builder consumes the response — `provider_template_id` ← `selected.provider_template_id`, `Logo.source` ← `slot_resolution.modifications['Logo.source']`. **Background stays BAKED** (builder requires Logo.source only — the one deliberate divergence from the image `buildTmrRenderPlan`, which requires both). Fail-loud on any non-`ok`.
- **D6-6 (PP-UUID gate).** The `isB1GovernedVideoStat` PP-UUID check is no longer the production gate; the fork now keys on `fmt === 'video_short_stat' && isVideoGovernanceEnabled(client_id)` — governance-driven, generalized, fail-closed, `_voice` excluded.
- **D6-7 (contract literals).** `variant_key` ← selector response; `contract_ref` dropped from evidence (mirrors image); evidence now carries `resolver_used: true` / `bind_mode: 'resolved'`.

**Design decisions (PK-approved recommendations):** platform arg = `null` (permissive + `platform_suitability_unproven` warning, matching the image path's accepted noise); parity proof = supervised `governed_video_stat_smoke`; `contract_ref` dropped.

**Smoke-only parity guard** (added after external review `747bc701` escalated the missing-guard policy point; PK-approved): exported pure `assertExpectedVideoProviderTemplate(actual, expected)` + a **smoke-only** assert that the resolved `provider_template_id === c11bb8ab` before render. **Production carries NO expected-id assert — fully spine-driven.**

Legacy `isKinetic`/`isStat`/`processDraft` byte-identical; `renderUploadAndLog` byte-unchanged; no DB change (read-only RPC).

## Proof chain (T3, all clean)

- **ef-builder:** isolated worktree; `deno test -A video-worker/` → **95 passed / 0 failed**; `deno check` clean; scope = exactly 4 video-worker files.
- **branch-warden:** `safe` (HEAD `f2214e5`, base `ab0c361`, 2 ahead, isolated, not pushed; benign main drift noted → rebased).
- **db-rls-auditor:** N/A (no DB change).
- **external review:** `03059ad5` **agree / medium / high / proceed** (re-review pinned to diff sha256 `3f04e94d0b15ac447c235b06864cdb9cff08829aebf7c8080a3463f08ff92d03`; prior escalation resolved).
- **PK gate 2:** Convention-2 sequence authorized (hash-pinned), key rotation confirmed.

## Deploy + live proof (Convention-2 sequence, no STOP tripped)

1. Rebased onto `67760d0` (hash preserved) → FF main `11976d4` → **pushed** (parity 0/0).
2. Drift refresh: stale A-LE → **B-FD** (P3, deploy 3.7.0 vs repo 3.8.0).
3. `CREATOMATE_API_KEY` rotation confirmed (PK).
4. `safe-deploy.sh video-worker --allow-warn` → **v3.8.0 live**, exit 0; `verify_jwt=false` intact.
5. Post-deploy: deployed VERSION=`v3.8.0`; deployed bundle carries the spine code (`assertExpectedVideoProviderTemplate`, `isVideoGovernanceEnabled`) — bundles-from-CWD trap avoided; drift back to clean **A-LE** (deploy==repo 3.8.0).
6. **Parity smoke** `governed_video_stat_smoke` → **succeeded**. Render `post-videos/_smoke/governed_video_stat_v1.mp4`, render_log **`e37affd9`**: `status=succeeded` · **`resolver_used=true`** · **`bind_mode=resolved`** · `selector_status=ok` · `variant_key=stat-reveal-9x16-video-v2` · `audio={voiceover:true, music_bed:true}`. **PK visual+audio PASS** vs proven `8c41689a` (same `c11bb8ab`, baked Perth-CBD stat-reveal, PP logo, VO over music bed).

## Live state

The production governed PP `video_short_stat` path is **live and spine-driven** on video-worker v3.8.0. `select_template('video_short_stat')` resolves PP (fb/ig/li `ok`); NDIS `fail_closed` (cross-brand owner-tie + assignment gate); image path unregressed.

## Carries / NEXT (each its own PK gate)
- **Lane 4 (D6-9 voice map → governed table)** — the last Video D6 item; `VOICE_ENV_BY_CLIENT_ID` is already client_id-keyed + fail-closed (lowest value). T2/T3 DB. FENCED.
- **Full-spine video background (Option B)** — deferred; would revisit the D2 baked-bg ruling + needs video-bg intake. Not scheduled.
- Second-brand (NDIS) video enable — needs its own baked template + governance flip + proof. Not started.
