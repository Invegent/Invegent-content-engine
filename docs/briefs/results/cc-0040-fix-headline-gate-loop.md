# Result cc-0040 — fix-headline-gate-loop (COMPLETE — all steps)

**Brief file:** `docs/briefs/cc-0040-fix-headline-gate-loop.md`  
**Executed by:** Claude Code (orchestrator + ef-builder) · deploy authorised & sequenced by PK  
**Completed:** 2026-07-18 Sydney (Step 1 + Combined Step 2/3 & D7 footer fold-in — all DEPLOYED)

---

## 1. Result status

`Complete` — **all cc-0040 steps DEPLOYED & VERIFIED.** Step 1 = dead-letter loop fix (image-worker v3.30.0). Combined = Step 2 (advisor ≤60-char budget), Step 3 (gate 90→180 + unbreakable-token assert + subtitle decouple), and D7 footer fold-in (NDIS footer 'NDIS Yarns') → image-worker v3.31.0 + ai-worker v2.20.0.

## 2. Commit(s)

- `8b44c94` — fix(cc-0040): image-worker Step 1 — render-log on pre-render throw (dead-letter loop fix) [v3.30.0]. FF onto `main` over base `5f684ba`; pushed `dd61931..8b44c94`.
- `70a9629` — fix(cc-0040): image-worker v3.31.0 + ai-worker v2.20.0 — headline gate 90→180 + unbreakable-token assert (S3), advisor ≤60-char budget (S2), NDIS footer 'NDIS Yarns' (D7 fold-in). FF onto `main` over base `50f3ec3`; pushed `50f3ec3..70a9629` (10 files, diff sha256 `bae5b2a5…`). Chain: ef-builder 138+22 tests · branch-warden safe · external review `ee68ad46` agree/proceed · deployed via `safe-deploy.sh --allow-warn`; verified image-worker=v3.31.0 / ai-worker=v2.20.0, drift clean, verify_jwt=false preserved. **D7 footer scope reconstructed** (ref diff `282515818d93` unreachable in this checkout) — minimal (footer value + 3 direct assertions); flagged for D7-lane reconciliation.

## 3. Files changed

- `supabase/functions/image-worker/index.ts` — modified (v3.28.0→v3.30.0: header block + VERSION const; new exported `handleRenderFailure()`; three capped-format catches delegate to it)
- `supabase/functions/image-worker/handle_render_failure_test.ts` — created (7-case hermetic test)

## 4. Actions taken

- **Gate-1 design (read-only):** verified both root causes against HEAD; established the key correction that the 90-char gate is an obsolete outer bound (cc-0033a auto-shrink already prevents overflow), so the fix is NOT "enforce 90 harder." PK ratified D1 (log a failed render-log row), D3 (recalibrate gate to real floor via probe — Step 3), D4 (all pre-render throws, all single-render capped formats); D2/D5 at recommended defaults.
- **Step 1 build (ef-builder, isolated worktree):** added a best-effort `handleRenderFailure(supabase, draft, iceFormatKey, msg)` that FIRST writes a `status='failed'` `m.post_render_log` row (reusing the existing failure-path `write_render_log` payload; swallowed) THEN performs the byte-identical `image_status='failed'` update. Wired into the `image_quote` / `animated_text_reveal` / `animated_data` catches. So a pre-render throw (headline gate, `governed_slug_unresolved`, selector RPC, asset reachability) now accrues counted failures and `pipeline-fixer` dead-letters after `RENDER_ATTEMPT_CAP=5` instead of resetting `failed→pending` forever.
- **Review chain (all clean):** ef-builder local checks (image-worker suite 137/137, new hermetic 7/7, `deno check` clean) · branch-warden **safe** · db-rls-auditor **pass** (null-`render_id` `failed` row inserts and IS counted; `client_id` nullable/no-FK; `ice_format_key` FK satisfied; `status` CHECK allows `failed`) · external ChatGPT review **agree/proceed** (review_id `5e0ae7fa`, `reviewed_input_hash` = diff sha256 `ede6e4ce…`).
- **Deploy (PK-authorised Convention-2 sequence, orchestrator-run):** committed in worktree → ff-merge to main → push → refreshed `drift-check` on-demand (A-LE→B-FD, GitHub `main` now ahead of deployed) → `scripts/safe-deploy.sh image-worker --allow-warn` (sanctioned wrapper; raw `supabase functions deploy` is deny-listed) → deployed (image-worker version 97).
- **Post-deploy verification:** drift-check re-run → `deploy_version 3.30.0 == repo_version 3.30.0`, class `A-LE`, `direction clean` (deployed hash == repo hash); deployed bundle greps `image-worker-v3.30.0` + `handleRenderFailure`; `verify_jwt=false` confirmed unchanged (caller safe).

## 5. Constraints confirmed

- Video-worker — NOT touched. Carousel + video-fallback catches — NOT touched. `renderUploadAndLog`, `assertHeadlineWithinGate`, `b1_production.ts`, ai-worker, pipeline-fixer, `RENDER_ATTEMPT_CAP` — NOT touched.
- No DB schema change / migration / new grant (new call site of an already-live RPC only).
- Deploy used the sanctioned wrapper with `verify_jwt` preserved false; no more than one image-worker deploy in flight; external review pinned to the deployed hash (no stale-hash proceed).
- Draft `938da75c` — NOT touched (PK's data action).

## 6. Open issues

- **ef-builder deviation (accepted):** the brief's illustrative inline try/catch became one exported `handleRenderFailure()` helper (required for the brief's own testability spec). RPC payload byte-identical; production behaviour identical.
- **Runtime confirmation pending on cron:** the hermetic + DB-catalog evidence proves the row writes and is counted, but a live end-to-end confirmation will occur naturally over the next `pipeline-fixer` (:25/:55) + image-worker cycles — draft `938da75c` (and any other capped-format pre-render failure) will now accrue `m.post_render_log` `failed` rows and dead-letter at 5 instead of looping. Observable in `m.post_render_log` for `938da75c`.
- **D2 number still to pin:** the advisor char budget (Step 2) is deliberately deferred until Step 3's probe returns the real auto-shrink floor.

## 7. Next recommended step

Step 2 (ai-worker char budget) can start now; Step 3 (image-worker gate recalibration + calibration probe) runs after, and its measured floor pins Step 2's exact number. Both remain per-step PK deploy gates. Register pointer to be cut at v5.73 (this result doc is the canonical record).

---

## 8. Verification (chat fills this)

**Verdict:** `Pass` (Step 1)

**Notes:**
- Output matched the ratified Step-1 design (D1+D4). Constraints respected; only the 2 approved files changed. Success criterion "loop closed" met at the code + DB-catalog level (hermetic 7/7 + db-rls-auditor pass); live cron confirmation is naturally pending, not blocking.
- New risk: none identified. `verify_jwt` preserved; deployed hash matches repo.
- Follow-up: Steps 2 & 3; register pointer v5.73.

## 9. Learning notes (chat fills this)

- The "pre-render throw → 0 render-log rows → pipeline-fixer resets forever" loop is a GENERAL failure class, not headline-specific — any throw before `renderUploadAndLog` shared it. Fixing at the catch (not the gate) closes the whole class in one worker-local change.
- Deploy path reminder: raw `supabase functions deploy` is deny-listed; the sanctioned channel is `scripts/safe-deploy.sh <ef> [--allow-warn]`, which drift-gates. A fresh entrypoint change reads stale `A-LE` until `drift-check?write=true&slug=<ef>` is refreshed (it hashes GitHub `main`, so PUSH before refreshing) → reclassifies `B-FD` → `--allow-warn` permits. `safe-deploy.sh` deploys WITHOUT `--no-verify-jwt`, relying on `config.toml` per-function `verify_jwt=false` (present for image-worker).
