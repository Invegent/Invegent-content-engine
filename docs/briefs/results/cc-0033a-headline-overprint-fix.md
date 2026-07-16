# Result cc-0033a — governed image_quote headline/subtitle overprint fix

**Brief file:** `docs/briefs/cc-0033a-headline-overprint-fix-execution.md`
**Executed by:** Claude Code (orchestrator + ef-builder), PK gates
**Completed:** 2026-07-16 Sydney

---

## 1. Result status

`Complete` — fix DEPLOYED to production (image-worker **v3.24.0**) and live-proven on both an Instagram and a Facebook card that had overprinted. **PK visual verdict: PASS (both platforms).**

## 2. Commit(s)

- `a130665` — feat(image-worker): cc-0033a headline layout guard (`b1_production.ts` + `b1_production_test.ts`) — the actual fix.
- `4b70506` — chore(image-worker): v3.24.0 header/version bump (`index.ts`) — required so the drift-check deploy gate (entrypoint-hash only) could see the helper-module fix and reclassify A-LE → B-FD. No logic change.

(Both pushed to `origin/main`. A benign sibling docs commit `deae79d` — "active-parallel-lanes coordination note" — was pushed alongside `4b70506` under explicit PK R4 authorization, Option A.)

## 3. Files changed

- `supabase/functions/image-worker/b1_production.ts` — modified (layout guard + type widened to allow `null`).
- `supabase/functions/image-worker/b1_production_test.ts` — modified (+4 hermetic guard tests; D-2 assertion updated 9→13 keys).
- `supabase/functions/image-worker/index.ts` — modified (v3.24.0 banner + changelog + `VERSION` const only; no logic).

## 4. Actions taken

- **The fix:** added `TMR_WINNER_LAYOUT_GUARD` for winner `generic_market_insight_card_1x1_v1` — `Headline.height:'22%'` + `Headline.font_size:null` (Creatomate auto-fit) + `font_size_minimum:'30 px'` / `font_size_maximum:'74 px'`. Merged into `buildTmrRenderPlan` modifications in the order `slotMods → layoutGuard → textFields` (guard between the two so neither clobbers the geometry). `TmrRenderPlan.modifications` type widened `Record<string,string|number>` → `…|null`. `B1_HEADLINE_MAX_CHARS` (value 90 unchanged) comment corrected from "provisional fit gate" to "outer sanity bound." A bounded headline box + font auto-shrink makes overflow structurally impossible: **no headline length can collide, and zero drafts are rejected.** `Subtitle.y` shipped OUT (brief default — the 22% box bottom at 518.4px already clears the subtitle's 540px).
- **Local checks:** `deno check` clean on `b1_production.ts` + caller `index.ts`; `b1_production_test.ts` 26/26; `creative_contract_test.ts` 9/9.
- **Review chain (T3):** branch-warden safe (isolated worktree; exact file set); db-rls-auditor substituted per CCF-02 R1 (diff has zero DB surface — no schema/DML/grant/RPC); external review twice — 2-file diff `22011fd7…f40c` (review `30b04c68`, agree/low/high) then re-pinned to the 3-file diff `bee9287c…fe05` (review `c967b015`, agree/low/high) after the index.ts bump.
- **Deploy (PK-gated):** reconciled origin divergence (rebase; benign runtime commits), committed + pushed, refreshed `drift-check` (A-LE → **B-FD**), deployed via governed `scripts/safe-deploy.sh image-worker --allow-warn`. Verified: deployed `VERSION = image-worker-v3.24.0`; `verify_jwt=false` (no-auth GET → 200); post-deploy drift clean (`deploy_version 3.24.0`, `repo_hash == deployed_hash`).
- **Live proof (controlled render, PK-authorized):** re-rendered two real previously-overprinting cards through the deployed worker:
  - IG — draft `604c3dfb` "Australia's build-to-rent market now has a $10 billion benchmark" (64 chars) → **PASS** (3 bounded lines, clean).
  - FB — draft `a3ac9129` "Banks are cutting rates. The RBA hasn't moved. Your loan might still be wrong." (78 chars, worst case) → **PASS** (3 bounded lines, clean).
  Both renders were **publish-safe** (each draft carried a `post_publish … published` row → permanently excluded by the enqueue cron's `NOT EXISTS post_publish published` guard; 0 queue rows throughout) and were **fully restored** — draft row (`approval_status`/`image_status`) and storage object bytes returned byte-identical; **no publish occurred**.

## 5. Constraints confirmed

- No `max_lines` constant / no line-count input / no literal `3` — confirmed not done.
- No provider-template write — confirmed not done.
- No writer-prompt / creative-contract edit (that is cc-0033b) — confirmed not done.
- No deterministic wrap-enforcement / tightening reintroduced — confirmed not done.
- `assertHeadlineWithinGate` behaviour and `B1_HEADLINE_MAX_CHARS` value (90) unchanged — only the comment corrected.
- No edit to `docs/governance/pp-tmr-definition-of-done-v1.md` (committed governance; SUPERSEDE is the record-reconciliation lane's).
- No schema change, no TMR activation change, no publish, no `safe-deploy.sh` bypass, no raw/direct `supabase functions deploy` — confirmed (deploy went through the governed gate; controlled-render DML was reversible and restored).

## 6. Open issues

- **Drift-gate coverage gap (new finding):** `drift-check` → `safe-deploy.sh` hashes ONLY the entrypoint `index.ts`, not imported helper modules, and hard-blocks A-LE with no override. A helper-only EF fix can never clear the gate without a paired cosmetic `index.ts` bump (as done here). Worth its own small lane. Recorded in memory `drift-check-hashes-only-entrypoint`.
- **cc-0033b** (contract `limits` shape + ai-worker writer budget) remains UNOPENED / deferred; `contract_validation.limit_source` stays `'fallback_constant'`.
- **Carry C5** (admissible ≤90-char single unbreakable-token horizontal overflow) is PRE-EXISTING, strictly improved by this guard, nil real-world exposure; separate input-gate lane if ever needed.
- The 4 originally-flagged published cards remain live on Meta (their published copies are unaffected); only new renders are protected.

## 7. Next recommended step

**cc-0037** (supervised `governed_image_quote_smoke` surface) is now UNBLOCKED — it can rebase onto this deploy and re-run its full chain (its prior external review `010abb01…` voids on rebase). Optionally open the drift-gate coverage-gap lane.

---

## 8. Verification

**Verdict:** `Pass`

**Notes:**
- Output matched the brief: winner-scoped layout guard, no template write, zero drafts rejected, `Subtitle.y` OUT.
- Constraints respected; change set was exactly the three named files (+ the authorized sibling docs commit).
- Success criteria met: deno/tests green, reviews clean, deployed v3.24.0, `verify_jwt=false`, post-deploy drift clean, and a real governed render shows 3 clean lines on both IG and FB.
- **PK visual verdict: PASS on both Instagram (604c3dfb) and Facebook (a3ac9129).**
- New risk surfaced and recorded: the entrypoint-only drift gate.

## 9. Learning notes

- The governed deploy gate is **entrypoint-hash only** — any EF whose logic lives in helper modules needs a paired `index.ts` version bump to be deployable. This turned a clean 2-file fix into a 3-file change mid-lane. → `drift-check-hashes-only-entrypoint`.
- The enqueue cron's `NOT EXISTS (post_publish … published)` guard makes an already-published draft safe to re-render (flip to approved+pending) without any re-publish risk — the reusable pattern for post-deploy live proof when no supervised smoke surface exists and no pending draft is available.
- `exec_sql` RPC only supports SELECT (wraps as a subquery); DML must go through the Supabase MCP `execute_sql`.
- `safe-deploy.sh` execs a bare `supabase functions deploy` (no `--no-verify-jwt`); `config.toml`'s `verify_jwt=false` pin was honoured for image-worker (confirmed post-deploy).
