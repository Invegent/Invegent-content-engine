# Result — F-PUBLISHER-ASSETGUARD-LINKEDIN (LinkedIn interim assetless-publish guard)

**Brief file:** `docs/briefs/f-publisher-assetguard-linkedin.md`
**Executed by:** Claude Code (orchestrator) — build by ef-builder (Session-2 packet); deploy PK-run
**Completed:** 2026-06-19 Sydney

---

## 1. Result status

`Complete` — guard shipped to the live LinkedIn publisher and post-deploy-verified. Guard-only scope (per PK); `asset_backstop.ts` parity is a separate future follow-up.

## 2. Commit(s)

- `891f6eb` — feat(publisher): add LinkedIn interim assetless-publish guard (rebased onto `51415ed`, fast-forward merged + pushed to `main`, origin 0/0).
- Docs (this result + register reconciliation) — commit pending PK gate.

## 3. Files changed

- `supabase/functions/linkedin-zapier-publisher/guard.ts` — created (new pure guard module).
- `supabase/functions/linkedin-zapier-publisher/index.ts` — modified (guard integration; v1.1.0→v1.2.0).
- `supabase/functions/linkedin-publisher/guard.ts` — created (byte-identical copy).
- `supabase/functions/linkedin-publisher/index.ts` — modified (guard integration; v1.2.0→v1.3.0, repo-only).
- `docs/briefs/f-publisher-assetguard-linkedin-validation.test.ts` — created (22-case deno test).
- Registers (`docs/00_action_list.md:326`, `docs/00_sync_state.md`) — reconciliation pending PK commit gate.

## 4. Actions taken

- **Promote (no rebuild):** the implementation was already built/verified (Session-2 packet) on `feat/linkedin-asset-guard`. Re-verified HEAD; **rebased** `8c10f7d`→`891f6eb` onto current main `51415ed` (clean, conflict-free; the 5 files don't overlap the insights-worker/docs commits main had advanced).
- **Re-ran local checks:** `deno check` exit 0 (4 source files); `deno test` **22/22** green; the two `guard.ts` copies byte-identical; versions v1.2.0 (live) / v1.3.0 (repo-only).
- **Gates:** branch-warden `safe` (5-file change set, ff provable, main unmoved) → pre-deploy queue safety (db-rls: 0 non-text actionable LinkedIn rows → 0 would be stranded) → external review `e1d81a76` (`agree`/proceed; `reviewed_input_hash` `fbafe50ef60d1bfd52c1e9e9399202e20dd871a820d5d466a3202262559c9c3b`).
- **Merge + push:** ff-merge to `main` (`891f6eb`), pushed, origin 0/0.
- **Deploy (PK-run):** the orchestrator's `supabase functions deploy` attempt was denied at the permission layer → handed the exact command to PK; **PK deployed** `linkedin-zapier-publisher` v1.2.0 (function version 33) with `--no-verify-jwt`.
- **Post-deploy verification (read-only — NOT invoked live, since a live run would publish):** `get_edge_function` → version 33, `VERSION=v1.2.0`, `verify_jwt=false`, guard.ts deployed byte-identical; header-less GET → 200 `{"version":"linkedin-zapier-publisher-v1.2.0"}`; db-rls false-positive check → **0** LinkedIn asset_guard blocks anywhere, the 7 text LinkedIn queue rows intact/publishable (the 9 existing asset_guard blocks are all Facebook's pre-existing guard).

## 5. Constraints confirmed

- **Guard-only** (PK decision) — `asset_backstop.ts` NOT added this lane; parity is a future follow-up — confirmed.
- `linkedin-publisher` v1.3.0 **committed but NOT deployed** (gated on B24/F06) — confirmed (only `linkedin-zapier-publisher` deployed).
- No DB / schema / migration / cron / grant change — confirmed (code-only).
- `verify_jwt=false` preserved (deployed `--no-verify-jwt`) — confirmed.
- Existing approval gate + text Zapier POST path byte-unchanged; guard only blocks/holds non-text — confirmed (diff + 22 tests + live false-positive check).
- Active holds untouched (Branch B NOT AUTHORISED; Phase 3.3 BLOCKED; AVATAR_SHADOW_TELEMETRY OFF) — none touch LinkedIn EFs.

## 6. Open issues

- **Asset-backstop parity (future follow-up, per PK):** FB/IG/YT carry a uniform `asset_backstop.ts` layer; LinkedIn does not. Redundant now (at `mediaPublishSupported:false` the guard blocks every non-text format before any POST), so deferred deliberately — not part of this lane.
- The repo-only `linkedin-publisher` v1.3.0 is guarded but inactive until B24/F06 activation; its day-1 safety is in the committed source.

## 7. Next recommended step

None for this lane — guard live + verified. Asset-backstop parity is a separate future follow-up (open it when LinkedIn parity with FB/IG/YT is prioritized).

---

## 8. Verification (chat fills this)

**Verdict:** `Pass`

**Notes:**

- Output matched the brief: guard ports the FB template, blocks non-text / never text-fallback, defensive platform skip, audit row on block, text path unchanged. ✓
- Constraints respected: guard-only; only Zapier EF deployed; no DB change; verify_jwt preserved. ✓
- No unexpected files changed (5-file guard commit; docs are separate). ✓
- Success criteria met: deployed v1.2.0, verify_jwt=false, 22/22 tests, queue not stranded (0 false positives live). ✓
- New risk: none — the guard fired 0 times live (no non-text LinkedIn actionable items) and stranded nothing.
- Follow-up: asset_backstop.ts parity (deferred, per PK).

## 9. Learning notes (chat fills this)

- **Promote-don't-rebuild lanes still need a rebase + full re-gate.** A pre-built branch must be rebased onto current main and re-run through branch-warden + external review on the *rebased* diff — the prior review/branch-warden were against an older base.
- **Don't live-invoke a publisher for "post-deploy verification".** Unlike read/aggregation workers, invoking a publisher POSTs real content. Verify via `get_edge_function` (authoritative source/version/verify_jwt) + a safe GET + read-only DB false-positive checks instead.
- **The deploy permission gate held even under a delegated-deploy directive** — the irreversible `supabase functions deploy` was denied at the permission layer, correctly reverting to PK-run. Treat a denied irreversible command as a blocker, hand the exact command over, don't retry.
