> ## 🔖 CANONICAL ID: **cc-0048** — RETAINED (collision resolved 2026-07-24)
> A parallel session on `origin/claude/new-session-swx6cf` independently issued a *different*
> `cc-0048` — "HeyGen avatar typed-resolver" (brief `191db5f`, 2026-07-23T01:26:46Z; branch
> register **v6.12**). **This lane keeps the number**: its implementation commit `5a6c998`
> (2026-07-22T06:41:26Z) is the earliest committed claim, ~19h ahead, and was already present in
> the branch's own history. The HeyGen lane is renumbered **cc-0052**.
> Ledger: `docs/briefs/results/governance-recovery-lane-2026-07-24-result-v1.md` §3.

# Brief cc-0048 — Image Worker Creative-Contract Registry Recovery (Care For Welfare + Invegent)

**Created:** 2026-07-22 Sydney (**rev-2** — incorporates PK-authored brand values and narrowed deploy scope)
**Author:** Claude Code (orchestrator-direct — CCF-02 R1 substitution)
**Executor:** Claude Code + PK gates
**Status:** draft — **Gate-1 submission. The rev-1 STOP is CLEARED: PK has authored the four brand values (§5).**
**Lane classification (CCF-02):** SAFETY_GATE / production incident · **T2 build; T3 deploy gate**
**Result file:** `docs/briefs/results/cc-0048-image-worker-creative-contract-registry-recovery.md`

---

## 1. Incident classification — ACTIVE

| | |
|---|---|
| Affected format | `image_quote` |
| Affected clients | `care-for-welfare-pty-ltd`, `invegent` |
| Live failure | `brand_payload_contract_unresolved` |
| Regression controls (unaffected) | `property-pulse`, `ndis-yarns` |
| Deployed image-worker | **v3.31.0**, repo-parity hash match `true`, drift class `A-LE` |
| Deployed ai-worker | v2.20.0, hash match `true` |
| Canonical main | `8a885df` |

| Client | Failed renders | Distinct drafts | Latest failure |
|---|---|---|---|
| `care-for-welfare-pty-ltd` | **199** | 4 | 2026-07-22 05:45Z |
| `invegent` | **105** | 4 | 2026-07-22 05:45Z |

Onset 2026-07-20 15:30Z (CFW) / 22:30Z (INV), coincident with cc-0044 CP-D onboarding producing these clients' first approved `image_quote` drafts. **Failures continue on the ~15-minute worker cadence.**

## 2. Root cause (exact throw path)

`image-worker/index.ts` production `image_quote` loop → `buildProofFieldsFromDraft()` (`branch_b_proof.ts`) → headline hard-gate passes → `resolveCreativeContract(client_id, format)` (`creative_contract.ts:278`) → `CREATIVE_CONTRACT_REGISTRY[`${clientId}::${format}`] ?? null` → registry holds **exactly two** entries (PP `4036a6b5…`, NDIS Yarns `fb98a472…`) → CFW/INV resolve `null` → **`throw new Error('brand_payload_contract_unresolved')`** (`branch_b_proof.ts:75`).

This is the v3.28.0 fail-closed guard working **as designed**. The defect is a missing registry entry. **The guard stays.**

## 3. Patch surface — vendored twice, deployed once

`creative_contract.ts` exists in both `ai-worker/` and `image-worker/`. The files are not byte-identical (sha `58929e1a…` vs `dbced205…`) but `ai-worker/creative_contract_parity_test.ts` asserts the frozen contract constants **deep-equal** and both resolvers agree. **Both copies must be patched or the parity test fails.**

`ai-worker` uses the contract for **additive stamping only** (`ai-worker/index.ts:1020`); a `null` there is benign and does not throw. **No runtime dependency on the new entries has been found in ai-worker**, so per PK direction:

- **Deploy `image-worker` only.** Bump `image-worker/index.ts` v3.31.0 → **v3.32.0** — mandatory, because the drift gate hashes only `index.ts`, so a helper-only change would stay class `A-LE` and `safe-deploy.sh` would hard-block it.
- **Do NOT deploy `ai-worker`** during outage recovery. Its parity edit lands in the repo undeployed.
- **Recorded as a follow-up deployment carry (§10), not part of incident recovery.** This knowingly creates repo↔deploy drift on ai-worker until that carry is taken; the drift is inert because the affected path is additive stamping only.

## 4. What is derivable from live governed state

`buildProofFieldsFromDraft` reads exactly three contract values: `renderer_fixed.category` (required), `renderer_fixed.footer` (required), `renderer_fixed.location` (optional → `''`). All remaining fields are structural metadata, not read on this path, and are taken from live governed state so the entry states nothing false:

| Field | care-for-welfare-pty-ltd | invegent | Source |
|---|---|---|---|
| `client_id` | `3eca32aa-e460-462f-a846-3f6ace6a3cae` | `93494a09-cc89-41d1-b364-cb63983063a6` | `c.client` |
| `client_slug` | `care-for-welfare-pty-ltd` | `invegent` | `c.client` |
| `gate.recommended_format` | `image_quote` | `image_quote` | the failing gate |
| selected template | `generic_market_insight_card_1x1_v1` | `generic_quote_card_1x1_v1` | `select_template` = **ok** |
| `provider_template_id` | `48cba556-0a53-4001-90f0-05420d10efc0` | `2140ca19-d075-49d3-9dc9-30d924805e22` | `select_template` |
| `template_variant_key` | `market_update.v1` | `quote_card.v1` | `select_template` |
| live assignment | `60e43a0e-8ac3-497d-b823-8d41c2aa123b` | `ecba211b-5217-4790-afe5-a2f98616712f` | `select_template` |
| `background` | policy `tmr_spine` / `resolve_slot_assets`, **no** hardcoded pool | same | mirrors PP + NDIS v3 shape |
| `location` | `''` | `''` | both existing precedents |

**Both clients already pass the full governed selection chain** — `select_template(...,'image_quote')` returns `status=ok` with a real `visually_approved` assignment and a passed visual proof. **No DB, assignment, proof or governance change is required or permitted by this lane.**

## 5. Brand values — PK-AUTHORED (not derived)

The following four values are **explicit PK-authored brand values**, supplied by PK at the Gate-1 exchange on 2026-07-22. They are **not** inferred from database fields, not generated from free text, and not copied from another client. They are authored brand copy and are to be used **verbatim**:

| Client | `category` | `footer` |
|---|---|---|
| `care-for-welfare-pty-ltd` | `CARE UPDATE` | `Care For Welfare` |
| `invegent` | `AI & AUTOMATION` | `Invegent` |

These strings render on every `image_quote` for these clients. Any future change to them is a PK brand decision, not a code fix.

## 6. Publish-state inspection (pre-deploy, completed)

Each of the 8 drafts has exactly one `m.post_publish_queue` row. **Six are already in terminal states** — the existing asset guard and the `no_image_url` gate stopped them:

| Client | Draft | Platform | Queue status | Reason / schedule |
|---|---|---|---|---|
| CFW | `7888f2de` | instagram | `failed` | `no_image_url:status=failed` |
| CFW | `80170d5d` | linkedin | `skipped` | `asset_guard_blocked:image_required_but_failed` |
| CFW | `099dc290` | facebook | `skipped` | `asset_guard_blocked:image_pending_timeout:1440m` |
| CFW | `e3396dd7` | instagram | `failed` | `no_image_url:status=failed` |
| INV | `e7867c8c` | facebook | `skipped` | `asset_guard_blocked:image_pending_timeout:1430m` |
| INV | `fe80a01e` | instagram | `failed` | `no_image_url:status=failed` |
| **INV** | **`26aaa129`** | **facebook** | **`queued`** | **scheduled 2026-07-22 22:06Z** |
| **INV** | **`33a9acf9`** | **instagram** | **`queued`** | **scheduled 2026-07-23 00:36Z** |

**Terminal rows do not auto-resume.** `pipeline-fixer` FIX 3 requeues only rows stuck in `status='running'` >20 min; it never revives `failed`/`skipped`. So the recovered image alone cannot republish them — that needs an explicit operator requeue.

**Therefore the real automatic-publish exposure is exactly two future-scheduled rows.** Throttles apply on top: `c.client_publish_profile` for both clients is `status=active`, `max_per_day=2`, `min_gap_minutes=240` on facebook/instagram/linkedin.

**Hold recommendation (no new mechanism, no approval-state change):**

- **Preferred — use the natural schedule window.** If the deploy and the two controlled recoveries (§8 steps 5–7) complete before **2026-07-22 22:06Z**, no hold action is needed at all: nothing can publish automatically before then.
- **If that window will be missed**, hold using the existing governed mechanism the publisher already consults — set `c.client_publish_profile.status` away from `active` for the two clients for the duration (the publisher's own `publish_disabled` skip path), **or** push `scheduled_for` on those two queue rows only. Either is a PK-authorised, explicitly-recorded action at the gate. **Approval state is never touched, and no new hold path is created.**
- One historical note: `099dc290` already published to the `website` platform on 2026-07-21 (website publish does not require an image). That is existing state, not a recovery effect.

## 7. Implementation scope

**Allowed (after Gate-1):** add the two contract entries to **both** vendored `creative_contract.ts` copies, mirroring the proven NDIS v3.29.0 structure and registered via the same `gate.client_id::gate.recommended_format` key derivation · add focused unit/hermetic tests · bump `image-worker/index.ts` to v3.32.0 · prepare exact deploy + rollback · deploy **image-worker only** at a separate T3 PK gate.

**Must not change:** cc-0047 classifier work · assignment/template governance · TMR proof records · DB schema or governed configuration · other formats · sourcing/drain · carousel execution · the registry architecture (no de-hardcoding — §10) · the fail-closed guard · template selection, asset resolution, rendering or publishing logic · draft approval state.

## 8. Recovery sequence (PK-specified)

1. Patch **both** registry copies with the four PK-authored strings (§5).
2. Prove PP and NDIS remain byte/behaviour compatible.
3. Prove CFW and Invegent resolve.
4. Prove unknown clients remain fail-closed.
5. Deploy **image-worker only** at the T3 gate (after §6's hold decision).
6. Recover **one controlled draft each** for CFW and Invegent first.
7. Verify governed TMR evidence, no duplicate render, no automatic unwanted publish.
8. Release the remaining drafts through the existing pipeline **only after** the two controlled recoveries pass.

## 9. Tests and production proof

**Tests (all seven required):**

1. PP resolves exactly as before — deep-equal to the frozen PP contract; `category`/`footer`/`location` byte-identical.
2. NDIS Yarns resolves exactly as before.
3. CFW resolves, with `category='CARE UPDATE'` and `footer='Care For Welfare'` asserted by exact-string equality.
4. Invegent resolves, with `category='AI & AUTOMATION'` and `footer='Invegent'` asserted by exact-string equality.
5. Unknown/unconfigured client still returns `null` → still throws `brand_payload_contract_unresolved`; a known client with a non-`image_quote` format also still fails closed.
6. No contract value inferred from free text or another client — asserted by exact equality against the §5 PK-authored strings; no value copied from the PP or NDIS entries.
7. Diff touches contract resolution only — `buildProofFieldsFromDraft` logic, template selection, asset resolution, render and publish paths unchanged; the vendored-copy parity test still passes.

**Production proof at the deploy gate:** deployed bundle contains the v3.32.0 marker and matches the reviewed artifact (grep the deployed bundle — bundles-from-CWD guard) · zero new `brand_payload_contract_unresolved` for both clients · the two controlled drafts recover through the existing governed pipeline · **no duplicate renders, no unwanted automatic publish** · zero regression for PP/NDIS · recovered renders carry expected governed TMR evidence (`selector_status=ok`, `assignment_id`, template ids) · failure counts **reduce** rather than accumulate · rollback ready throughout. `deploy-verifier` runs after the deploy.

**Rollback:** redeploy the prior image-worker bundle (v3.31.0) from its canonical commit. The change is additive registry data; reverting restores exactly the current behaviour (both clients fail closed again). No DB or governed state is touched, so rollback is complete and instant. Proven ready before deploy.

## 10. Follow-ups — RECORDED, NOT OPENED

- **F-A — ai-worker parity deployment carry.** The parity edit to `ai-worker/creative_contract.ts` ships undeployed by PK direction, leaving inert repo↔deploy drift on ai-worker. Deploy it in a later routine gate once the outage is closed.
- **F-B — governed data-backed contract resolver.** Replace the hardcoded registry: canonical contract storage · validation and versioning · cache and fail-closed behaviour · onboarding without per-client code · worker compatibility · rollback and migration. This is the second demonstration (after cc-0047's carousel finding) that governed-data onboarding still hits hardcoded client gates in worker code.
- **F-C — NEW, found during this investigation: the render-attempt cap is unreachable for continuously-retried drafts.** `RENDER_ATTEMPT_CAP=5` and `image_quote` is a capped format, yet these 8 drafts carry **10–72** failed renders each with `dead_reason IS NULL`. `pipeline-fixer` FIX 2 selects candidates with `updated_at < now()-120min`, but each failed render refreshes `updated_at`, so a draft failing every ~15 min never becomes a candidate and is therefore **neither reset nor dead-lettered by the cap**. Same family as the cc-0040 dead-letter loop. Consequence here is benign-to-good (nothing dead-lettered, so all 8 remain auto-recoverable) but the cap is not doing its job and the retry loop is effectively unbounded — each attempt is a Creatomate call. **Not fixed in this lane.**

## 11. cc-0047 carry — RECORDED

cc-0047 is paused, worktree preserved clean at `8a885df` (HEAD verified, zero modified files, no artifacts). On resume add:

```
coverage_verdict = inconclusive
coverage_reason  = telemetry_blocked_by_execution_failure
```

An active execution failure must never be classified `unintegrated`, uncovered, stale, or never-onboarded. The cc-0047 live coverage matrix is to be recomputed **only after** successful CFW and Invegent governed renders exist, or the observation window is otherwise honestly documented.

## 12. STOP conditions

Any required contract value would need inference · the patch would touch anything in §7's must-not list · parity test fails · PP or NDIS resolution changes in any way · deployed bundle does not match the reviewed artifact · duplicate render or unwanted publish observed · a controlled recovery (step 6) fails or produces unexpected evidence · rollback not proven ready · any non-clean review verdict · unexpected origin movement.

## 13. Stop condition

Report per `docs/briefs/_template_result.md`, then stop. **Next gate: PK Gate-1 approval of this brief. No build or deploy authorized.**
