# Brief cc-0040 — fix-headline-gate-loop

**Created:** 2026-07-18 Sydney  
**Author:** chat (orchestrator, read-only Gate-1 design)  
**Executor:** Claude Code (ef-builder, per-step isolated worktrees) → PK deploy gates  
**Status:** Gate-1 RATIFIED. **Step 1 DEPLOYED & VERIFIED (image-worker v3.30.0, `8b44c94`, live 2026-07-18).** Result: `docs/briefs/results/cc-0040-fix-headline-gate-loop.md`. Steps 2 & 3 ratified-and-queued.  

**Step 1 chain record (2026-07-18):** worktree `…/scratchpad/wt-cc0040` branch `lane/cc-0040-image-worker-loopfix` on base `5f684ba`; diff sha256 `ede6e4cea530879d1ae68fc6a5a0b8266ef725c68329a61afe5aac7979335ff4`; image-worker `v3.28.0→v3.30.0`; files = `image-worker/index.ts` + new `image-worker/handle_render_failure_test.ts`. Verdicts: ef-builder ✓ (137 suite + 7 hermetic pass, `deno check` clean) · branch-warden **safe** · db-rls-auditor **pass** (null-render_id `failed` row inserts & is counted — loop-fix effective) · external review **agree/proceed** (review_id `5e0ae7fa`, pinned hash `ede6e4ce…`).  
**Result file:** `docs/briefs/results/cc-0040-fix-headline-gate-loop.md` (created on completion)  
**Tier:** T3 (production-touching, two live workers, multi-step) · **Lane class:** SAFETY_GATE (a governed content post silently dies forever) with a PRODUCT_PROOF tail (advisor↔render coordination).

---

## Task

A Content-Studio governed `image_quote` post whose `image_headline` exceeds the image-worker hard gate (`B1_HEADLINE_MAX_CHARS = 90`) fails to render and then **retries forever** — it is never published and never dead-lettered. Two independent defects combine to produce this. Fix them so (a) the pipeline can never infinite-loop on a pre-render failure again, and (b) the advisor stops generating headlines the render pipeline will reject, while **not** blindly hardening the 90-char bound — because the cc-0033a auto-shrink layout guard means the render can now absorb headlines well beyond 90.

## Source context (all verified against HEAD `dd61931`, read-only)

- `supabase/functions/image-worker/b1_production.ts:40` — `B1_HEADLINE_MAX_CHARS = 90`, and its own comment (`:35-40`) states this is an **"OUTER SANITY BOUND. This is NOT a fit guarantee and never was — it never fired on any real collision; fit is owned by TMR_WINNER_LAYOUT_GUARD."**
- `supabase/functions/image-worker/b1_production.ts:91-101` — `assertHeadlineWithinGate()`: trims, then **throws** (no truncation, no rewrite) when `>90`.
- `supabase/functions/image-worker/b1_production.ts:195-214` — `TMR_WINNER_LAYOUT_GUARD` (cc-0033a): `Headline.height:22%` + `Headline.font_size:null` (auto-fit) between `font_size_minimum:'30 px'` and `font_size_maximum:'74 px'`. Comment: bounding height + auto-shrink makes **"overflow structurally impossible; no headline length can collide."** At 90 chars the font "lands nowhere near the 30px minimum" (probe P1d). Evidence: `_harness/cc0033_headline_calibration/p1_probe/P1_FINDINGS.md`.
- `supabase/functions/image-worker/index.ts:849-850` — the gate is called **inside** the governed branch, **before** any selector/Creatomate/render-log call.
- `supabase/functions/image-worker/index.ts:917` — `renderUploadAndLog(...)` is the **only** thing that writes an `m.post_render_log` row. Everything that throws at `:850` (headline), `:856` (`getGovernedClientSlug`), `:864` (`select_template` error), `:869` (`buildTmrRenderPlan` fail-closed), `:915-916` (`assertGovernedAssetReachable`) throws **before** `:917`.
- `supabase/functions/image-worker/index.ts:930` — the per-draft `catch`: sets `image_status='failed'` and **writes no render-log row**.
- `supabase/functions/pipeline-fixer/index.ts:68-113` (`fixFailedImages`, cron jobid 36) — resets `failed → pending`; dead-letters a capped format **only** after `RENDER_ATTEMPT_CAP = 5` `post_render_log` rows with status `failed`/`timeout` (`:82-94`). The count source is render-log rows, **not** a stored attempt counter.
- `supabase/functions/ai-worker/index.ts:443` (`callFormatAdvisor`) and `:655` (`buildFormatOutputSchema`: *"image_headline: 10-15 word pull quote"*) — both frame the headline by **word count with no character budget**. 10–15 words routinely exceeds 90 chars.

## Diagnosis (confirmed)

**Root cause 1 — advisor blind to the gate.** ai-worker generates a "10-15 word pull quote" with no char cap; the image-worker then hard-throws at 90. The two are structurally uncoordinated, so long-but-normal headlines are produced that the render path rejects.

**Root cause 2 — the throw defeats the dead-letter cap → infinite loop.** The gate (and every other pre-render throw) fires *before* `renderUploadAndLog`, so **zero** `post_render_log` rows are ever written for the failed draft. pipeline-fixer counts render-log rows to decide dead-lettering; 0 rows never reaches the cap of 5, so it resets `failed → pending` every cycle **forever** (`dead_reason` stays NULL). This is **not headline-specific** — it is a general defect for *any* pre-render throw (slug-unresolved, selector fail-closed, asset-unreachable all share it).

**Key design correction (this changes the fix).** The 90 gate is **not** a fit requirement. cc-0033a made overflow structurally impossible via bounded height + font auto-shrink down to a 30px floor. So the live example (94 chars) would almost certainly **render cleanly** today — the gate rejects it on an obsolete assumption. The right fix is therefore *not* "enforce 90 harder." It is: (1) make failures un-loopable, (2) coordinate the advisor to the render, and (3) recalibrate the gate to the **true** auto-shrink floor (evidence-gated), keeping it only as a fail-loud absurd-input guard.

## Recommended approach

Three changes, decomposed into three bounded steps across two workers. **Step 1 is the load-bearing safety fix and ships first, standalone.**

### Step 1 — image-worker: make pre-render failures un-loopable (SAFETY, ship first)
On the per-draft failure path (`index.ts:930`, and the sibling format catches at `:946/:962/:1012/:1051` if in scope), **write a `failed` `m.post_render_log` row** before/with setting `image_status='failed'`, so the existing pipeline-fixer cap counts every failure uniformly and dead-letters after 5 — regardless of whether the failure was a gate throw or a render error. `clientId` is in scope at the catch for the governed branch. No pipeline-fixer change, no new `dead_reason`. This closes the loop for **all** pre-render throws in one worker-local change, and directly protects D7's eventual NDIS render (NDIS headlines can exceed 90 too).
- *Alternative (D1):* dead-letter **immediately** on a deterministic input-gate rejection (retrying identical input can never succeed) instead of burning 5 cycles. Cleaner UX; slightly more logic. See PK decision D1.

### Step 2 — ai-worker: constrain generation to the gate (PRODUCT_PROOF)
Replace the word-count framing at `buildFormatOutputSchema:655` (and the advisor system prompt at `callFormatAdvisor:443`) with an explicit **character budget** comfortably under the live gate, so normal drafts never reach the gate. Pure prompt-string change; no schema/DB change. Independent of the image-worker steps — deployable in parallel, but the budget number depends on D2/D3.

### Step 3 — image-worker: recalibrate the gate to the real floor (EVIDENCE-GATED, optional/last)
Determine the **true** auto-shrink floor (the char count at which the 30px minimum is actually hit for `generic_market_insight_card_1x1_v1`) via a bounded Creatomate calibration probe at increasing lengths, then set `B1_HEADLINE_MAX_CHARS` to a value **derived from geometry** (or deliberately keep 90 as a conservative bound). Fail-loud gate retained; **no truncation, no AI-rewrite in the render worker** (that adds an LLM call + latency + compliance surface to a render worker — architecturally wrong). Ships last because once Steps 1–2 are in, a too-tight gate is no longer catastrophic (bad drafts dead-letter cleanly; advisor rarely trips it). May be taken as a carry.

**Sequencing:** Steps 1 and 3 both touch image-worker → the orchestrator deploys them one image-worker deploy at a time (Step 1 first). Step 2 is ai-worker and can interleave. Per-step: ef-builder in isolated worktree → hermetic tests → branch-warden → external review pinned to the exact diff hash → PK deploy gate. Deploy command for image-worker/ai-worker **must include `--no-verify-jwt`** (standing gotcha).

## Scope

**In scope:** the loop fix in image-worker (Step 1); the advisor char-budget in ai-worker (Step 2); optional gate recalibration + its calibration probe in image-worker (Step 3). Hermetic tests for each. Deploy plans handed to the PK gate.

**Out of scope:** the immediate unstick of draft `938da75c` (PK data action — shorten its headline ≤ current gate); the `invegent-dashboard` "pending_fill" projection bug (separate repo — carry); **any video-worker change**; any pipeline-fixer logic change (Step 1 deliberately reuses the existing cap); any DB schema/migration; any `dead_reason` vocabulary change (unless PK elects D1 immediate-dead-letter, which may add one); raising publish volume.

## Allowed actions (post-Gate-1, per-step under its own envelope)

- ef-builder edits in an isolated worktree to `image-worker/index.ts`, `image-worker/b1_production.ts`, `ai-worker/index.ts`, and their `*_test.ts`.
- Run hermetic/local tests; produce a diff + deploy plan per step.
- A bounded, supervised Creatomate calibration probe for Step 3 (render-only to `_smoke/`, no production write) — its own mini-envelope.

## Forbidden actions

- No code change, deploy, migration, or DB write until PK approves this Gate-1 design.
- No video-worker edit. No pipeline-fixer logic edit. No DDL/DML/migration. No new secret.
- No truncation or AI-rewrite of the headline inside the render worker.
- No deploy without `--no-verify-jwt`; no more than one image-worker deploy in flight; re-run external review on any diff change (stale-hash STOP).
- Do not touch draft `938da75c` (PK's data action).

## Success criteria

- **Loop closed:** a governed `image_quote` draft that fails before render accrues counted failures and is dead-lettered by pipeline-fixer at the cap (or immediately, per D1) — it is provably no longer reset forever. Demonstrated on a hermetic/controlled case, not on live PK data.
- **Advisor coordinated:** ai-worker prompt emits headlines within the agreed char budget; a test asserts the instruction carries the budget.
- **Gate honest:** `B1_HEADLINE_MAX_CHARS` reflects a deliberate, documented decision (recalibrated-to-floor or consciously-kept-90), not the obsolete implicit-fit assumption.
- Each step: branch-warden `safe`, external review clean on the pinned hash, PK deploy gate passed, post-deploy the deployed source greps for the new marker (Supabase-bundles-from-CWD gotcha).

## Stop condition

Report the Gate-1 design (this brief) to PK for approval. On approval, execute Step 1 first as its own bounded envelope; report per result template; return for the next step's gate. Any tripped STOP voids the remainder and requires a fresh PK gate.

---

## PK decisions — RATIFIED 2026-07-18

- **D1 — Loop-fix mechanism → (a) Log a `failed` render-log row.** Step 1's catch writes a `status='failed'` `m.post_render_log` row so the existing pipeline-fixer cap (`RENDER_ATTEMPT_CAP=5`) dead-letters uniformly. No pipeline-fixer change, no new `dead_reason`.
- **D2 — Advisor char budget → recommended default, pinned after the D3 probe.** ai-worker replaces "10-15 words" with an explicit char budget set **comfortably under the recalibrated floor from D3** (interim target ≤ ~80 chars). The exact number is fixed once Step 3's probe returns the true floor, so the advisor stays strictly inside the gate with margin. Confirm the final number at Step 2's gate.
- **D3 — Gate value → recalibrate to the real floor via a bounded probe (Step 3 runs now).** Run the supervised Creatomate calibration probe to find where the 30px minimum actually clips `generic_market_insight_card_1x1_v1`, set `B1_HEADLINE_MAX_CHARS` from geometry, keep it fail-loud. **No truncation / no AI-rewrite in the render worker.**
- **D4 — Loop-fix breadth → all pre-render throws, all single-render capped formats.** Step 1 applies the render-log-on-failure fix to every capped-format catch (`image_quote`, `animated_text_reveal`, `animated_data`) so slug/selector/asset throws are covered too. Carousel is out (already uncapped by design).
- **D5 — Ordering → Step 1 alone first; Step 2 in parallel; Step 3 last.** Steps 1 & 3 both touch image-worker → one deploy at a time, Step 1 first. Step 2 (ai-worker) interleaves; its number is pinned by the Step 3 probe.

## Notes

- Register head is v5.72; no register version cut at Gate-1 (versions are cut on ratification, claimed through the orchestrator).
- This fix is a prerequisite-strength benefit for D7 NDIS: NDIS headlines can exceed 90, and without Step 1 an NDIS render failure would loop identically.
- Live example for reference only (not to be touched): draft `938da75c` — 94-char headline, `image_status='failed'`, `image_url` NULL, 0 `post_render_log` rows, publish queue `a4bd315d` = `skipped / asset_guard_blocked:image_required_but_failed`.
