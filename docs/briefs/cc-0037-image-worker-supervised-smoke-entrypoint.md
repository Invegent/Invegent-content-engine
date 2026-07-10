# Brief cc-0037 — image-worker supervised smoke entrypoint

**Created:** 2026-07-10 Sydney
**Author:** Claude Code (orchestrator; `brief-author` spec exercised manually — see Notes)
**Executor:** Claude Code (`ef-builder`) → PK at the deploy gate
**Status:** issued
**Result file:** `docs/briefs/results/cc-0037-image-worker-supervised-smoke-entrypoint.md` (created on completion)

**Lane classification (CCF-02):** `SAFETY_GATE` · **Tier T3**
**Findings verdict:** `DRAFT_READY` (4 open questions, all with recommended defaults; OQ-1 departs from the literal wording of PK's scope)

## Gate 1 — PK decision (2026-07-10)

**APPROVED.** PK elected **OQ-1 option (B): selector-derived bind with the fail-loud assert**, explicitly overriding the hardcoded-pin wording of the original scope statement. OQ-2 / OQ-3 / OQ-4 carried at their recommended defaults (distinct smoke label · keep the headline gate but surface rejections as a clean 4xx · bucket visibility is a `db-rls-auditor` handoff, not asserted here). Gate 2 (deploy) remains a hard stop.

## ⏸ PARKED — PK ruled (b) SERIALISE, cc-0033a first (2026-07-10)

**Status: BLOCKED on cc-0033a. Do not commit, push, rebase, or deploy this lane until cc-0033a has landed and been verified live.**

**Ordering deadlock — RESOLVED (PK, 2026-07-10).** cc-0033a's brief originally read *"HELD at Gate 1 — does not open until cc-0037 deploys"*, which deadlocked against PK's (b) ruling holding cc-0037 behind cc-0033a. **PK confirmed (b) stands and superseded cc-0033a's gate**; the supersession is recorded in `docs/briefs/cc-0033a-headline-overprint-fix-execution.md` (Status block). cc-0033a goes first.

**The cost PK accepted, recorded here so it is not lost:** cc-0033a deploys a BLOCKER fix to the live governed render path **with no supervised smoke surface** — this lane's `governed_image_quote_smoke` is precisely what does not yet exist. cc-0033a's post-deploy verification rests on its pre-deploy P1 probe evidence plus observation of real production renders. (The cc-0037 lane originally recommended (b) while under-weighting this; the recommendation was made on *pre-deploy* probe sufficiency, and cc-0033a's gate existed for *post-deploy* verification.)

**The collision (verified, not relayed).** `docs/briefs/cc-0033a-headline-overprint-fix-execution.md` scopes itself to *"One file: `supabase/functions/image-worker/b1_production.ts`. Plus its test file."* — two of the three files this lane touches, and it too requires an `image-worker` deploy. Two lanes cannot deploy the same edge function concurrently. Specific interactions:

- cc-0033a widens `TmrRenderPlan.modifications` from `Record<string, string|number>` to admit `null` (`font_size: null` selects Creatomate auto-fit). This lane's smoke branch casts `plan.modifications` for `computePropsHash` — the cast is in the blast radius.
- cc-0033a attaches a layout guard to `TMR_WINNER_TEXT_FIELDS`; this lane's smoke calls `buildTmrRenderPlan` and would inherit it silently.
- `b1_production_test.ts` is a guaranteed textual conflict: cc-0033a's brief baselines "22 `Deno.test` cases"; this lane's diff makes it 26.

**Record correction.** This brief's own Notes described cc-0033 as an *ai-worker prompt* change. That was the original cc-0033. It has since been re-planned and split: **cc-0033a** = the image-worker geometry fix (T3, SAFETY_GATE); **cc-0033b** (unopened) = the ai-worker writer budget. The "separate lane, no overlap" premise is void.

**Why (b) and not (a):** cc-0033a is a live-defect fix for a card already published to Facebook (8 July 2026) carrying the overprint. It should not be slowed or enlarged by a harness. Rollback granularity decided it — under a combined deploy, a smoke defect forces rolling back the overprint fix too. cc-0033a does **not** need this smoke surface to be verified: it validated via P1 probes (4 renders, production Creatomate key, no production surface, worst admissible 90-char input rendering 3 clean lines).

### ⚠ The external review below is VOID on rebase

`3ee6c2bc-bb64-4f70-92b4-57563065f9c9` binds **only** to `010abb01…dee4`. Rebasing onto cc-0033a changes the diff, which makes the review **stale by definition**. It must be re-run on the new hash. The approval does not carry across.

### Parked artifact

- Change preserved uncommitted in ef-builder worktree `agent-a755f175eb5984362`, and as a verified patch reproducing `010abb01…dee4` at 21172 bytes.
- Shared `main` was left **clean**: the three files were staged there under a moved HEAD (a sibling commit would have swept them in) and have been unstaged + restored to HEAD. `image-worker` on `main` is untouched.

### Re-entry checklist (when cc-0033a is live)

1. Rebase the three files onto post-cc-0033a `main`; resolve the `b1_production_test.ts` conflict and the widened `modifications` type.
2. Re-run the FULL chain — `deno check` · image-worker tests · `branch-warden` · `db-rls-auditor` · **fresh** external review pinned to the NEW hash.
3. Confirm `record_tmr_proof_event` carry (`task_75ddb5c5`) has landed — this lane introduces exactly the row class (`status='succeeded'`, null `post_draft_id`, non-production label) its validator would wrongly accept as proof evidence.
4. Re-verify the OQ-1 assert still holds live (`select_template` → `48cba556…`) — cc-0033a touches `buildTmrRenderPlan`.
5. Validate the rollback command form BEFORE the forward deploy.
6. **Unresolved for whoever deploys first:** `safe-deploy.sh` execs a bare `supabase functions deploy "$EF_NAME"` with **no `--no-verify-jwt`**, and rejects unknown flags. `supabase/config.toml` pins `[functions.image-worker] verify_jwt = false`, which the CLI should honour from repo root — unproven. Verify the deployed `verify_jwt` state immediately after deploy, before declaring success.

---

## Gate 2 readiness — chain result, VALID ONLY FOR HASH `010abb01…dee4` (superseded by the park above)

**Pinned artifact:** `reviewed_input_hash = sha256 010abb01479c4ae89156b85f566e6da9d2ee5a69e545013c95b9944a7572dee4` (21172 bytes, `git diff --no-color`, 3 files). Independently recomputed by the orchestrator; matches `ef-builder`'s claim. **Any change to the diff voids the review below.**

| Stage | Verdict | Evidence |
|---|---|---|
| `ef-builder` (isolated worktree `agent-a755f175eb5984362`) | built, local-only | HEAD `8199153` unchanged, nothing committed |
| Local checks | pass | `deno check` exit 0 · `b1_production_test.ts` 26/26 · full dir 82/82 (`--allow-read`) |
| `branch-warden` | **safe** | both worktrees 0 ahead / 0 behind `origin/main`, neither on `main`, changed set == approved set, 0 untracked in the build worktree |
| `db-rls-auditor` | **pass** | 6/6 gate questions satisfied; no DDL/DML/grant needed |
| External review (`ask_chatgpt_review`) | **agree** · medium risk · high confidence · no escalation | `review_id 3ee6c2bc-bb64-4f70-92b4-57563065f9c9`, pinned to the hash above |

**The OQ-1 assert is confirmed live, not merely assumed.** `db-rls-auditor` executed `select_template('property-pulse', {null,facebook,linkedin}, 'image_quote', NULL, {3 seeds})` — all five calls returned `status='ok'` and `provider_template_id = 48cba556-0a53-4001-90f0-05420d10efc0` (`generic_market_insight_card_1x1_v1`). The winner is platform- **and** seed-invariant; the seed passes through to background rotation only. `slot_resolution.status='ok'` with non-null `Background.source` (`bg_pp_sold_sign_closeup.jpg`) and `Logo.source` (`PP_logo_2.png`). **The smoke will not throw on its first run.**

**Smoke-row invisibility is doubly guaranteed.** Every live reader of `m.post_render_log` was enumerated: `stamp_tmr_shadow_forward` (excluded by both the label and the `post_draft_id IS NOT NULL` clause), `get_global_format_capability_pyramid` (inner-joins `m.post_draft`, so the null draft-id row is dropped), `tmr-drift-probe` (triple-guarded on `client_id` + production label + status), `record_tmr_proof_event` (see carry below). No view or matview references the table. Five rows with `post_draft_id IS NULL` already exist, so this is a tolerated class, not a new one.

`post-images` is `public=true` with no storage RLS policy referencing it — PK gets a viewable URL at the visual gate.

### Accepted known behaviours (named, not hidden)

- **Orphan smoke object on a failed log write.** `renderUploadAndLog` uploads *before* it writes the render-log row, so with `logMustSucceed=true` a log-write failure throws after the storage object exists, leaving `_smoke/governed_image_quote_v1.jpg` present alongside a 500. Benign: fixed key, `upsert:true`, overwritten by the next smoke, and no production consumer reads `_smoke/`. Identical posture to the video lane. External review raised no objection when asked directly.
- **Single fixed storage key.** Concurrent smokes overwrite one another. Acceptable for a supervised, one-supervisor-at-a-time surface.
- **`assertHeadlineWithinGate` also throws on empty/null**, so an empty supervisor headline returns `422 headline_gate_rejected` with `headline_chars: 0` rather than a length complaint. Honest and intended.

### Deploy gate — HARD STOP, PK only

**CORRECTED 2026-07-10 (supersedes the earlier deny-lift proposal).** The original plan asked for a `deploy_edge_function` temporary lift. That was wrong and the request is **withdrawn**. Verified against artifacts:

- `supabase/functions/drift-check/index.ts:90-92,392` fetches `raw.githubusercontent.com/Invegent/Invegent-content-engine/main` — **GitHub `main`, not local disk**. An uncommitted or unpushed change is invisible to it.
- `scripts/safe-deploy.sh:192-195` — `A|A-LE) … BLOCK … exit 1`, with **no override flag** (only `B-FD`/`B-RR` are overridable, via `--allow-warn` at `:197-210`). So while the diff is unpushed, drift-check sees repo == deployed == v3.23.0, classifies A-LE, and `safe-deploy.sh` hard-blocks. **An unpushed commit can never clear an A-LE block.** The correct order is merge → commit → push → re-run drift-check → deploy.
- `image-worker` is **not** on the `STANDING_THREE` don't-redeploy list (`scripts/safe-deploy.sh:50-54` = `draft-notifier`, `heygen-avatar-creator`, `heygen-avatar-poller`), so no exit-2 block.

**⚠ Gap found in the recommended path — `safe-deploy.sh` does NOT pass `--no-verify-jwt`.** Every one of its four deploy invocations (`:177`, `:206`, `:220`, `:230`) is a bare `exec supabase functions deploy "$EF_NAME"`, and its arg parser rejects unknown flags (`:89`), so the flag cannot be threaded through. Mitigating fact: `supabase/config.toml` declares `[functions.image-worker] verify_jwt = false`, which the CLI honours when run from the repo root — so the bare deploy is *probably* safe. **"Probably" is not a T3 answer to the exact gotcha CLAUDE.md names.** Recommended: use `safe-deploy.sh image-worker --check-only` to obtain the drift classification, then run the deploy explicitly:

```
supabase functions deploy image-worker --no-verify-jwt
```

**⚠ CCF-02 R4 conflict at the push step.** The default worktree's `main` is at `6001d18`, **ahead 1** of `origin/main` (`8199153`) with **another lane's unpushed commit** — `docs: register v5.47 — PP video B-roll … fenced intake APPLIED` (touches only `docs/00_action_list.md` + `docs/00_sync_state.md`). Pushing `main` to make GitHub ahead of the deployed binary would also push that lane's commit. R4 forbids pushing another session's unpushed commit without explicit PK authorization. **PK must authorise `6001d18` as well as the cc-0037 commit, or that lane must push its own work first.** Because `6001d18` touches zero `image-worker` files, it does **not** invalidate the pinned diff hash.

Commit hygiene at merge: use an **explicit pathspec** for the three `supabase/functions/image-worker/` files. `git add -A` would sweep in the two ownerless tracked-dirty files in the default worktree (`.claude/settings.json`, `docs/briefs/pp-video-tmr-template-workbook-v1.xlsx`).

**Review staleness:** `review_id 3ee6c2bc…` is valid **only** for `010abb01…dee4`. Re-verify the 3-file diff hash after the merge commit and before the deploy; if it moved, the approval is stale and the external review must be re-run.

**Rollback (validate before apply, per T3):** redeploy `image-worker` from commit `8199153` (v3.23.0, currently live) with the same `--no-verify-jwt` flag. The change is purely additive and returns before production selection; there is no schema or data state to unwind. Confirm the v3.23.0 source is reachable at `8199153` and that the rollback command form is correct **before** the forward deploy.

**Post-deploy verification (success criteria 1–3), PK-supervised:** one `POST {"mode":"governed_image_quote_smoke"}` with a valid `x-image-worker-key` → expect `200` + a `post-images/_smoke/…` URL; PK visual review; then `db-rls-auditor` read-back confirming `m.post_draft` is byte-unchanged and the new `m.post_render_log` row carries `post_draft_id IS NULL` + label `creative_library_b1_smoke`.

---

## Task

Restore a supervised, non-production way to render a governed Property Pulse `image_quote` static card. Lane W retired both of image-worker's manual entrypoints to hard `410`s on 2026-07-05 and nothing replaced them, so today **every** visual verification of a static card change must go through the production render path. Add one new mode to `supabase/functions/image-worker/index.ts` that renders a governed PP card to `_smoke/` and returns — writing no `m.post_draft` row, publishing nothing, touching no scheduler, and leaving no production-labelled `m.post_render_log` row. Mirror the shape of the video lane's surviving `governed_video_stat_smoke` entrypoint.

This is a **standalone carry**. It is not folded into cc-0033.

## Source context

- `supabase/functions/image-worker/index.ts:573-575` — `mode === 'tmr_template_smoke'` → `410 tmr_template_smoke_retired`.
- `supabase/functions/image-worker/index.ts:582-584` — `mode === 'template_smoke'` → `410 template_smoke_retired`.
- `supabase/functions/image-worker/index.ts:591-593`, `:601-603` — two further retired modes (`creative_library_manual_render`, `creative_library_draft_proof`), same 410 treatment. **The gap is wider than PK's statement records: four modes were retired, not two.**
- `supabase/functions/video-worker/index.ts:956-1002` — the pattern to mirror: `mode==='governed_video_stat_smoke'`, sample fields with body overrides, renders to `_smoke/governed_video_stat_v1.mp4`, calls `renderUploadAndLog` with `postDraftId: null, clientId: null, logMustSucceed: true`, then **returns before draft selection**. Same production auth header, checked above it. Does not require governance `enabled=true`, never flips it, never publishes.
- `supabase/functions/image-worker/index.ts:652-718` — the LIVE governed PP path. Calls `assertHeadlineWithinGate`, reads `m.slot.platform`, calls RPC `select_template(p_client_slug, p_platform, 'image_quote', NULL, p_seed=post_draft_id)`, then `buildTmrRenderPlan(...)` → `plan.providerTemplateId` + `plan.modifications` (governed `Background.source` / `Logo.source` / `Scrim.opacity` from `slot_resolution`).
- `supabase/functions/image-worker/index.ts:370-420` — `renderUploadAndLog` **already** types `postDraftId: string | null` (`:376`) and already supports `logMustSucceed?: boolean` (`:381`). Uploads to the `post-images` bucket (`:402`); builds the public URL at `:404`.
- `supabase/migrations/20260703130939_create_stamp_tmr_shadow_forward_v1.sql:147-152` and `:289-293` — the shadow-stamper's candidate pool **and** its remaining-count query both filter `render_spec->>'label' = 'creative_library_b1_production'` AND `status='succeeded'` AND **`post_draft_id IS NOT NULL`**, with an inner join to `m.post_draft`. A row with a null draft id is structurally unstampable.
- `supabase/functions/image-worker/b1_production.ts:28,33,37,40,61` — `B1_GOVERNED_CLIENT_ID='4036a6b5-…'`, `B1_GOVERNED_CLIENT_SLUG='property-pulse'`, `B1_HEADLINE_MAX_CHARS=90` (annotated **`PROVISIONAL / to_be_calibrated`**), `B1_SUBTITLE_MAX_CHARS=90`, `B1_PRODUCTION_LABEL='creative_library_b1_production'`.
- `supabase/functions/tmr-drift-probe/index.ts:19` — drift-probe **removed** its `B1_PRODUCTION_LABEL` hardcode; it does not key on the label.
- `docs/governance/tmr-gov-provider-1-pre-cleanup-guard.md` — why the four modes were retired.
- `docs/briefs/results/pp-static-tmr-cross-platform-quality-proof-v1-result.md` — the static TMR pilot hit this same wall ("fresh seed renders impossible").
- Current worker version: `image-worker-v3.23.0` (`index.ts:311`). Target: `v3.24.0`.
- Provider template of record: `48cba556-0a53-4001-90f0-05420d10efc0` (`generic_market_insight_card_1x1_v1`).

## Scope

**In scope:** One additive `mode` branch in `image-worker/index.ts`, placed after the existing auth + env checks and after the four `410` guards, returning before production draft selection. Sample-field defaults with body overrides. A `_smoke/` storage path. One smoke-labelled render-log row. A version bump to `v3.24.0`. Unit tests for any new pure helper.

**Out of scope:** cc-0033's headline capability contract (separate PK-gated lane). Un-retiring any of the four `410` modes — they stay dead. Changing the production `image_quote` path, `buildTmrRenderPlan`, `b1_production.ts` constants, `select_template`, or the stamper. Any DDL, DML, GRANT/REVOKE, or migration. Any dashboard change. Spine Gen v2.

## Allowed actions

- `ef-builder`, in an **isolated worktree**, may edit `supabase/functions/image-worker/index.ts` and add/extend a test file under `supabase/functions/image-worker/`.
- Run local hermetic checks (`deno test`, `deno check`) inside the worktree.
- Read-only inspection of `select_template`, `m.post_render_log`, `c.creative_template_*`, and storage-bucket visibility, via `db-rls-auditor`.
- Hand the final diff + a deploy plan back to the orchestrator.

## Forbidden actions

- **No `deploy_edge_function`.** It is deny-listed; deploying requires an explicit PK-authorised temporary lift. The executor prepares the command and **stops**.
- **No `supabase functions deploy` without `--no-verify-jwt`.** Omitting it flips `verify_jwt`→true and breaks `x-image-worker-key`-only callers (401→502). The flag must appear in the deploy plan verbatim.
- No `m.post_draft` insert or update from the smoke path — not `image_url`, not `image_status`.
- No publish, no scheduler enqueue, no slot fill.
- No production-labelled `m.post_render_log` row from the smoke path (see OQ-2).
- No read or write of `c.client_creative_governance.enabled`, and never a flip of it.
- No DDL, DML, GRANT/REVOKE, or migration in this lane.
- No un-retiring of the four `410` guards; no change to their responses.
- No commit to a shared branch; no push; no merge. Push remains a hard stop.
- **Spine Gen v2 stays fenced** on its four preconditions (cc-0035 closed · DoD accepted · drift reconciled · cc-0033 plan accepted). This lane does not touch it and does not satisfy any of its preconditions.
- No brand rollout beyond readiness-only.

## Success criteria

1. `POST /image-worker` with `{"mode":"<smoke-mode>"}` and a valid `x-image-worker-key` returns `200` with a `storage_url` under `post-images/_smoke/`, and the rendered card is visually inspectable by PK at that URL.
2. The same request writes **zero** rows to `m.post_draft` and mutates **zero** existing rows there. Verified by `db-rls-auditor` read-back against a before/after snapshot.
3. The smoke's `m.post_render_log` row (if OQ-2 resolves to "write one") carries `post_draft_id IS NULL` and a label that is **not** `creative_library_b1_production`, and is therefore invisible to both stamper queries (`…:147-152`, `…:289-293`). Verified by `db-rls-auditor`.
4. A malformed or absent body still falls through to the existing production loop unchanged — the new branch fires on the mode alone, exactly as the four `410` guards do (`index.ts:565-566` parses once, guards read `body?.mode`).
5. The four existing `410` guards return `410` byte-for-byte unchanged.
6. `deno test` passes for `image-worker`, including any new helper's unit tests, and `deno check` is clean.
7. `branch-warden` returns `safe`; `db-rls-auditor` returns `pass`; external review returns clean **pinned to the final diff hash**.
8. The deploy plan names `--no-verify-jwt` explicitly and records that `deploy_edge_function` needs a PK lift.

## Stop condition

`ef-builder` stops at the final diff. The orchestrator runs `branch-warden` → `db-rls-auditor` → external review pinned to the diff hash, then **stops for PK at the deploy gate**. PK runs or authorises the deploy. On completion, report per `docs/briefs/_template_result.md` and stop.

---

## Open questions (recommended defaults; PK decides at gate 1)

### OQ-1 — provider-template binding *(triage: `scope_design_concern`)* — **departs from the literal wording of PK's scope**

PK's statement says "bind it to the CURRENT live provider template `48cba556…`". A **literal hardcoded pin of that UUID reintroduces precisely the failure mode Lane W retired these modes for.** The evidence is in the guard comment itself (`index.ts:577-581`): the old `template_smoke` pinned `48cba556` under the stale label `PP_NEWS_CENTRED_SCRIM_16x9_v1`, but that provider ID had been *paste-repurposed* to the live 1:1 market-insight card — so the surface "would have rendered wrong output **SILENTLY** (C4)". The sibling mode pinned `490ad9ea`, which was deleted outright. Both rotted; neither told anyone.

- **(A) Hardcoded direct-bind** to `48cba556`. Literal reading of the scope; mirrors the video lane's direct-bind constant. The smoke exercises the Creatomate render only — **not** `select_template`, **not** `buildTmrRenderPlan`, **not** `slot_resolution` — so it needs invented sample Background/Logo/Scrim values, and a passing smoke would prove nothing about the governed path. Re-pins a UUID that can rot again, silently.
- **(B) Selector-derived bind — RECOMMENDED.** The smoke calls the same read-only `select_template` RPC with a supervisor-supplied seed and optional platform, runs the same `buildTmrRenderPlan`, and then **asserts `plan.providerTemplateId === '48cba556-0a53-4001-90f0-05420d10efc0'`, throwing on mismatch.** This satisfies "bind to the current live template" *by construction* rather than by hand; it converts provider drift from a silent wrong render into a loud, immediate failure; and — decisive for the stated cc-0033 use case — it reproduces the real production card geometry, real governed background, and real derived subtitle, which is exactly what a headline-overprint probe must see. Cost: the smoke reads one live read-only RPC, and the expected-ID constant must be updated when the live winner legitimately changes (a loud test failure, not a silent one).

**Recommendation: (B).** (A) is the weaker choice: it re-creates the C4 hazard and produces a probe that cannot observe the defect it exists to observe.

### OQ-2 — render-log row *(triage: `policy_decision`)*

Options: write no row · write with the production label · write with a **distinct smoke label** (e.g. `creative_library_b1_smoke`).

**Recommendation: distinct smoke label**, with `post_draft_id=null`, `clientId=null`, `logMustSucceed=true`. Defence in depth: the row stays unstampable even if the stamper someday drops its `post_draft_id IS NOT NULL` clause, while still leaving provenance for the lane record.

Two things PK should weigh:
- A distinct label means the smoke row's `render_spec` is **not** byte-identical to production's. The smoke is therefore *evidence*, not a parity proof.
- This is a **deliberate divergence from the mirrored video pattern**: the video smoke sets the *production* label (`video-worker/index.ts:995`, `renderSpecLabel: B1_VIDEO_PRODUCTION_LABEL`). Video gets away with it because the image stamper is the label-keyed consumer. Diverging here is the safer of the two, but it is a divergence and is named as one.

### OQ-3 — headline gate *(triage: `policy_decision`)*

Whether the smoke calls `assertHeadlineWithinGate`. There is a real tension: `B1_HEADLINE_MAX_CHARS = 90` is annotated **`PROVISIONAL / to_be_calibrated`** in source (`b1_production.ts:37`), and the registered D5 defect (7/17 governed cards overprint the headline onto the subtitle) is the reason a probe is wanted at all. A probe that can only submit gate-passing headlines cannot characterise the gate.

**Recommendation:** keep the gate, but have the smoke branch surface a gate rejection as a clean `4xx` with the offending length, not an opaque `500`. **Do not decide the calibration question here** — that is cc-0033's lane, and per the register the char-limit premise is itself contested.

### OQ-4 — storage-path confirmation *(triage: `missing_evidence`)*

`post-images/_smoke/<name>.jpg`. The worker already constructs a `…/storage/v1/object/public/post-images/…` URL (`index.ts:404`), so it assumes the bucket is public — but no migration in this repo creates that bucket (it was made out-of-band), so **repo evidence cannot confirm the bucket's actual visibility.** PK needs a viewable URL at the visual gate.

**Handoff:** `db-rls-auditor` confirms bucket visibility and any storage RLS before the deploy gate. Not asserted here.

---

## Notes

**Tier check.** PK's statement assigns T3. That is correct and independently confirmed against CLAUDE.md's rules: this is a code change to a **production-touching** edge function requiring **deploy**, and CLAUDE.md routes "production-touching / deploy" to T3 with "nothing waived". The full chain applies: `ef-builder` (isolated worktree) → `branch-warden` → `db-rls-auditor` → external review pinned to the final diff hash → explicit PK deploy gate, with rollback written and validated before apply. Note that although the *change* is additive and dark, T3 is driven by the deploy, not by the blast radius of the branch.

**Rollback.** The branch is additive and returns before production selection; rollback is a redeploy of `v3.23.0`. That must be **written and validated before apply**, per T3 — not assumed from the diff's shape.

**Scope correction (evidence vs. PK's statement).** PK's statement names two retired modes. Source shows **four** (`tmr_template_smoke`, `template_smoke`, `creative_library_manual_render`, `creative_library_draft_proof` — `index.ts:573,582,591,601`). The conclusion is unchanged and in fact strengthened: the image lane has no supervised surface at all.

**Cross-reference correction — SUPERSEDED 2026-07-10 (forward correction, original retained as evidence).** This brief originally recorded: *"PK's statement cites cc-0033's brief at `docs/briefs/cc-0033-headline-capability-contract-wiring.md`. That file does not exist."* **Both halves are now false.** The file exists on disk (untracked — which is why a `git grep` at the time found nothing), and cc-0033 has since **split**:

- **cc-0033a** (`docs/briefs/cc-0033a-headline-overprint-fix-execution.md`) — the image-worker geometry fix. SAFETY_GATE · T3 · **SEVERITY: BLOCKER**. Touches `b1_production.ts` + its test file, i.e. two of the three files this lane touches.
- **cc-0033b** — UNOPENED. Owns the contract `limits` shape + the ai-worker writer budget.

The original `cc-0033-headline-capability-contract-wiring.md` (the ai-worker prompt lane) is cc-0033b's predecessor, not the overprint execution lane. **Any statement in this brief describing cc-0033 as "an ai-worker prompt change" or as non-overlapping with this lane is void.** See the PARKED header: PK ruled (b) serialise, cc-0033a first.

**Numbering.** `cc-0037` claimed: `cc-0036` is the highest brief file on disk; `cc-0033`/`cc-0034`/`cc-0035` are referenced in registers but have no brief files. Re-verify at commit per the CCF-02 parallel-session claim protocol.

**Agent-substitution note (CCF-02 R1).** This brief is the `brief-author` charter exercised **manually by the orchestrator**: the `brief-author` agent-type was not registered as invocable in this session, exactly as `creative-graph-auditor` was not in the A1.4 lane (registers v3.90). The substitution is named here per R1. Independently, CLAUDE.md records `brief-author` as PROVEN only on docs/planning-shaped briefs, with the standing condition that its **first code-lane brief gets candidate-level scrutiny** — which this is. Both facts point the same way: this draft should be read as a candidate, not as a proven-lane artifact.
