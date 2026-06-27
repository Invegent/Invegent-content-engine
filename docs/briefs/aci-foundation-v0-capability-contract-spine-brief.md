# Brief — ACI Foundation v0 — Capability Contract Spine

**Created:** 2026-06-27 Sydney
**Author:** chat (orchestrator)
**Executor:** Claude Code (ef-builder) per slice, under PK gates
**Status:** draft (planning brief — NOT issued; no code/DB/deploy)
**Result file:** `docs/briefs/results/aci-foundation-v0-capability-contract-spine.md` (per slice, on completion)

---

## Task

Make the **existing Property Pulse `image_quote` governed render path (B1-v2, live/proven)** *contract-aware*: thread a single capability contract through selection (ai-worker) and enforcement (image-worker) so that (a) the AI drafts to the contract's required fields/limits, (b) output is validated against the contract before render with one bounded repair, and (c) every governed render stamps the contract/variant identity as evidence. This is a **spine** sprint — it connects and hardens what already exists; it does **not** add formats, clients, variants-to-choose-from, mix, or tables.

This brief is the standing plan for five sequenced, independently shippable + reversible slices (A→E). Each slice is its own ef-builder → review → PK-deploy lane.

## Source context

- `docs/architecture/current-ice-flow-v3.md` — current spine (L4 ai-worker = final format decision; L5 image-worker = render + B1-v1 governed edge).
- Register **v4.05** (`d172330`, HEAD) — **B1-v2 PROVEN + RELEASED** (image-worker **v3.16.0** deterministic background rotation + **v3.17.0** subtitle-from-`draft_body`). This sprint builds directly on that live path.
- `supabase/functions/image-worker/index.ts` — B1 governed `image_quote` branch (~`645-668`), `render_spec` construction (~`658`), `write_render_log` call (~`302`).
- `supabase/functions/image-worker/b1_production.ts` — `isB1GovernedImageQuote(clientId)` (~`84`), `B1_GOVERNED_CLIENT_ID = 4036a6b5-b4a3-406e-998d-c2fe14a8bbdd`, `B1_ASSET_KEYS` / `B1_BACKGROUND_KEYS`, `selectB1BackgroundKey()`, subtitle derivation, `assertHeadlineWithinGate()` + `B1_HEADLINE_MAX_CHARS=90` (provisional), `B1_PRODUCTION_LABEL='creative_library_b1_production'`.
- `supabase/functions/image-worker/manual_render.ts` — `buildGovernedTemplateSpec()` (~`132-152`) (already emits `template_variant`, `capability`, `asset_keys`, `resolver_used`, `fallback_taken`).
- `supabase/functions/image-worker/asset_url_guard.ts` — H2 `assertGovernedAssetReachable()` (fail-loud on unreachable governed asset).
- `supabase/functions/ai-worker/index.ts` — `callFormatAdvisor()` (~`403-426`), `formatInstruction` prose (~`618-631`), `assemblePrompts()` (~`970-971`), draft update / `recommended_format` write + `draft_format` jsonb (~`1071-1084`, `1076`).
- `docs/creative-library/property-pulse.json` + `docs/creative-library/registry-schema-v2.md` — declarative registry; variant objects already carry `required_fields` / `optional_fields` / `expected_assets` / `capability`. **Runtime-import guard:** no production worker reads these JSON files.
- Lessons enforced: **H3.1** (`attempt_number` is telemetry-only with an accepted race — never a control input), **H3.2** (render-retry cap — no unbounded retry loops), B1-v1 UUID-fallback fix (gate on `client_id`, not slug).

## Locked decisions (do not relitigate in build)

1. **Subtitle authorship stays in image-worker for v0.** Source = first non-empty paragraph of `draft_body`; max 90 chars; **derived by the renderer** (as today, B1-v2 v3.17.0). The AI is only *guided* to make the first paragraph subtitle-suitable — it does **not** author a discrete subtitle field. The contract **validates** the derived subtitle; it does **not** move authorship.
2. **Variant/contract resolution happens at draft time in ai-worker.** ai-worker resolves the variant + contract and **stamps `draft_format`** (jsonb); image-worker **echoes + enforces** via `render_spec`. Selection lives in ai-worker; enforcement lives in image-worker.
3. **jsonb evidence only.** Stamp into `m.post_draft.draft_format` and `m.post_render_log.render_spec`. **No new columns. No DB migration.**
4. **Contract source of truth = registry JSON → vendored runtime-safe projection.** The runtime consumes a **vendored/compiled** contract object derived from `property-pulse.json`. **No live JSON import** (runtime-import guard preserved).
5. **Repair is one bounded attempt only.** On validation failure: exactly one repair attempt, then **fail loud**. **No loop.** Repair must not consume `attempt_number` as control and must not re-enter the render-retry path uncapped.

## Identifiers (locked)

- `variant_key = property_pulse.image_quote.news_card.v1`
- `contract_ref` = stable reference to the vendored contract for that variant (e.g. `property_pulse.image_quote.news_card`)
- `contract_version` = semver of the contract object (e.g. `v1`), bumped only when fields/limits change.
- `selector_reason` = short deterministic string explaining the resolution (v0: constant, e.g. `pp_image_quote_default`).

---

## Scope

**In scope:** Property Pulse only · `image_quote` only · the existing B1-v2 governed path · a single capability contract for the PP `image_quote` news-card variant · contract-aware ai-worker drafting + validator + one bounded repair + governed-render evidence stamping.

**Out of scope (explicit):** mix governance (format **and** variant) · AI variant **selector** · multi-brand / any non-PP client · any non-`image_quote` format · new DB tables **or columns** · DB migration · dashboard implementation · Content Studio changes · moving subtitle authorship to the AI · reviving the dormant demand-grid / `platform_format_mix_default` · changing the Format Advisor's format decision · cost-based selection.

## Allowed actions (per slice, under gates)

- Read repo + registry; ef-builder edits in an **isolated worktree**, local-only.
- Author/extend the registry contract (docs) and a **vendored** runtime constant derived from it.
- Edit `ai-worker` and `image-worker` **only within the PP-`image_quote` governed branch**, gated on `client_id` (`4036a6b5…`) + `recommended_format='image_quote'`.
- Stamp jsonb evidence (`draft_format`, `render_spec`).
- Run local Deno tests.

## Forbidden actions

- No deploy/merge/migrate without the PK gate (HARD STOP). No DB DDL. No new columns. No live registry JSON import. No unbounded repair/retry. No change to any non-PP / non-`image_quote` path (those stay **byte-unchanged**). No consumption of `attempt_number` as a control input. No `supabase functions deploy` without `--no-verify-jwt`. Respect all active holds in `docs/00_sync_state.md`.

---

## Slice-by-slice plan

> Each slice: **goal · likely files/functions · acceptance criteria · gates.** Build in order A→E. Each is shippable + reversible on its own.

### Slice A — Contract object + deterministic resolver

**Goal:** Establish the single source of truth. Author/extend the registry variant for the PP `image_quote` news card; produce a **vendored runtime-safe contract projection**; add a deterministic resolver `PP client_id + image_quote → contract`. Define `variant_key` / `contract_ref` / `contract_version`. **No behaviour change** to drafting or rendering yet.

**Likely files/functions:**
- `docs/creative-library/property-pulse.json`, `docs/creative-library/registry-schema-v2.md` (author — declarative).
- New vendored module, e.g. `supabase/functions/_shared/creative-contracts/pp_image_quote_news_card_v1.ts` (or under `image-worker/contracts/`) — a **derived constant**, not a JSON import; carries `variant_key`, `contract_ref`, `contract_version`, `required_fields`, `optional_fields`, `expected_assets`, hard limits (headline max, subtitle max=90).
- Resolver fn (shared), e.g. `resolveContract(clientId, recommendedFormat) → contract | null`, gated on PP `client_id` + `image_quote`.

**Acceptance criteria:**
- Registry variant for PP `image_quote` news card present + internally consistent (`required_fields` includes headline; subtitle in `optional_fields`; `expected_assets` = logo + background keys).
- Vendored contract constant equals the registry variant's fields/limits (single source of truth; a comment cites the registry `source_commit`).
- `resolveContract(PP client_id, 'image_quote')` returns the contract; any other client/format returns `null`.
- The hardcoded `B1_HEADLINE_MAX_CHARS=90` is **reconciled** to the contract's headline limit (one number, contract-owned) — no second source.
- No runtime JSON import (grep clean). No behaviour change (no test for drafting/render output changes).

**Gates:** ef-builder (isolated worktree) → Deno unit test (resolver + constant↔registry parity) → **creative-graph-auditor** (static audit of the registry change) → branch-warden `safe` → `ask_chatgpt_review` *optional* (pure constant) → PK deploy gate (only if the vendored module ships with a worker; otherwise no deploy). **db-rls-auditor: not required** (no DB).

---

### Slice B — Evidence stamp (additive)

**Goal:** Stamp `variant_key`, `contract_ref`, `contract_version`, `selector_reason` onto governed evidence. ai-worker resolves (Slice A) and writes them to `m.post_draft.draft_format`; image-worker echoes them into `render_spec`. Additive only — **no selection/validation behaviour change**.

**Likely files/functions:**
- `ai-worker/index.ts` — after format decision (~post `1076`), call `resolveContract()`, write `{variant_key, contract_ref, contract_version, selector_reason}` into `draft_format` (jsonb) for PP `image_quote`.
- `image-worker/index.ts` — B1 branch (~`658`): read the draft's `draft_format` contract fields and add them to `render_spec`; `write_render_log` (~`302`) persists `render_spec` (jsonb).
- `manual_render.ts` `buildGovernedTemplateSpec` — ensure `template_variant` aligns with `variant_key`.

**Acceptance criteria:**
- A PP `image_quote` draft carries `draft_format.contract = {variant_key=property_pulse.image_quote.news_card.v1, contract_ref, contract_version, selector_reason}`.
- Its governed `m.post_render_log.render_spec` echoes the same `variant_key`/`contract_ref`/`contract_version` (+ existing `label`, `resolver_used`, `fallback_taken`, `background_key`, `subtitle_chars`).
- Non-PP / non-`image_quote` drafts and renders are **byte-unchanged** (no new keys).
- No new columns; both writes are jsonb. Deno test: stamping present for PP `image_quote`, absent for a control (non-PP) case.

**Gates:** ef-builder → Deno tests → branch-warden `safe` → `ask_chatgpt_review` (light — touches render output) → **PK deploy gate (HARD STOP)** ai-worker + image-worker, `--no-verify-jwt`, confirm `verify_jwt=false` → read-only post-deploy verification. **db-rls-auditor: not required** (jsonb, no DDL).

---

### Slice C — Validator check only (baseline + guard, NO repair)

**Goal:** Validate AI output against the contract **before render** and record the outcome — but take **no repair action yet**. This establishes a baseline (how often does current prose-prompted output fail the contract?) and a guard that Slice D lands behind.

**Likely files/functions:**
- `image-worker/index.ts` B1 branch (~`645-668`): reuse `assertHeadlineWithinGate()` (`b1_production.ts`) + `assertGovernedAssetReachable()` (`asset_url_guard.ts`); **add** subtitle validation (derived subtitle ≤ contract max=90, non-empty if `required`) sourced from the contract.
- Record validation result into `render_spec.contract_validation = {pass|fail, failed_fields[]}` (jsonb).

**Acceptance criteria:**
- For PP `image_quote`: headline/subtitle/asset checks run against the **contract** limits (not hardcoded constants) before the Creatomate submit.
- A conforming draft renders exactly as today (B1-v2 output byte-equivalent) with `render_spec.contract_validation.pass=true`.
- A non-conforming draft is recorded `pass=false` with `failed_fields` — **current behaviour preserved** (fail-loud as today; no new repair, no silent force-fit).
- Deno tests: conforming→pass; over-limit headline→fail+failed_fields; over-limit/empty subtitle→fail; unreachable asset→fail-loud (unchanged).

**Gates:** ef-builder → Deno tests → branch-warden `safe` → **`ask_chatgpt_review` required** (control-path) → **PK deploy gate (HARD STOP)** image-worker `--no-verify-jwt` → read-only verification (sample `contract_validation` outcomes). **db-rls-auditor: not required.**

---

### Slice D — AI contract injection (gated)

**Goal:** Replace the prose `formatInstruction` for PP `image_quote` with a **structured** contract injection (required fields + hard limits + "make the first paragraph subtitle-suitable, ≤90 chars" guidance). Lands **behind the Slice C guard**. Expectation: contract-validation failures fall.

**Likely files/functions:**
- `ai-worker/index.ts` — `assemblePrompts()` (~`970-971`) and `formatInstruction` (~`618-631`): for PP `client_id` + `image_quote`, inject the contract's structured requirements (sourced from the vendored contract). **Gate on `client_id` (not slug).**
- `callFormatAdvisor()` headline generation aligned to the contract's headline limit.

**Acceptance criteria:**
- For PP `image_quote`, the assembled prompt contains the contract's required fields + hard limits (verifiable in a unit test on the prompt builder) and the "first paragraph subtitle-suitable ≤90" guidance. Subtitle remains **renderer-derived** (locked decision 1) — the AI is guided, not asked for a discrete subtitle field.
- All other clients/formats use the **unchanged** prose path (byte-identical prompt) — gated, verified by test.
- Post-deploy: `render_spec.contract_validation.pass` rate for PP `image_quote` is **≥ the Slice C baseline** (no regression; ideally improved).

**Gates:** ef-builder → Deno tests (gated prompt assembly; control path unchanged) → branch-warden `safe` → **`ask_chatgpt_review` required** (prompt/control-path change) → **PK deploy gate (HARD STOP)** ai-worker `--no-verify-jwt` → read-only verification vs baseline. **db-rls-auditor: not required.**

---

### Slice E — One bounded repair, then fail loud

**Goal:** On contract-validation failure, perform **exactly one** bounded repair (a single targeted AI rewrite to the contract), re-validate once, then **fail loud** if still non-conforming. No loop.

**Likely files/functions:**
- Repair helper (ai-worker or shared) — single re-invoke to rewrite to the contract; **bounded to one attempt**; returns conforming output or fails.
- `image-worker`/`ai-worker` wiring so a Slice-C `pass=false` triggers **one** repair then fail-loud; stamp `render_spec.contract_repair = {attempted:true, outcome:pass|fail}`.

**Acceptance criteria:**
- A repairable failure → exactly **one** repair → re-validate → render on pass.
- A non-repairable failure → **fail loud** (`image_status='failed'`), `contract_repair.outcome=fail`; **no second repair**, no reset loop.
- Repair does **not** read/write `attempt_number` as control; does **not** re-enter an uncapped render-retry path (H3.1/H3.2 lessons). Deno tests: one-and-only-one repair; fail-loud after; no loop; cost-bounded.

**Gates:** ef-builder → Deno tests → branch-warden `safe` → **`ask_chatgpt_review` required** (control-path + cost surface; confirm single-attempt bound) → **PK deploy gate (HARD STOP)** ai-worker (+image-worker if wiring) `--no-verify-jwt` → read-only verification (confirm exactly-one-repair in logs). **db-rls-auditor: not required.**

---

## Gates summary (per CLAUDE.md proof lane)

| Slice | creative-graph-auditor | db-rls-auditor | ask_chatgpt_review | PK deploy gate (HARD STOP) |
|---|---|---|---|---|
| A contract+resolver | **yes** (registry edit) | no (no DB) | optional (pure constant) | only if a worker ships |
| B evidence stamp | no | no (jsonb only) | light | **yes** (ai+image workers) |
| C validator check | no | no | **yes** | **yes** (image-worker) |
| D AI injection | no | no | **yes** | **yes** (ai-worker) |
| E bounded repair | no | no | **yes** | **yes** (ai-worker [+image]) |

Standing gate rules: ef-builder in an **isolated worktree**; **branch-warden `safe`** before every commit; deploy is PK-run with **`--no-verify-jwt`** (confirm `verify_jwt=false`); re-run `ask_chatgpt_review` on any diff change (the `reviewed_input_hash` must match the deployed diff).

## Success criteria (sprint)

- The PP `image_quote` governed path is contract-aware end-to-end: resolve (ai-worker) → stamp (`draft_format`+`render_spec`) → validate vs contract → one bounded repair → render-enforce, all from a **single** registry-sourced contract.
- Every governed PP `image_quote` render carries `variant_key=property_pulse.image_quote.news_card.v1` + `contract_ref` + `contract_version` + `selector_reason` + `contract_validation` (+ `contract_repair` after E) in `render_spec`.
- **Zero** behaviour change for any non-PP client or non-`image_quote` format (byte-unchanged, test-guarded).
- No new DB tables/columns, no migration, no live registry import, no unbounded repair/retry.

## Stop condition

Each slice: ef-builder hands the diff + deploy plan back to the orchestrator; on a clean lane (tests + branch-warden + required review) the orchestrator presents the PK deploy gate and **stops** for PK. After PK-run deploy + verification, write the per-slice result and stop. Sprint complete after Slice E verified.

---

## Risk list

1. **Subtitle authorship drift.** v0 keeps derivation in image-worker (locked). Risk: Slice D's injection nudges the AI toward authoring a subtitle anyway. Mitigation: inject *guidance only* ("make first paragraph subtitle-suitable ≤90"); validator checks the **derived** subtitle, not an AI field; test asserts no discrete subtitle field is consumed.
2. **Three-way contract drift** (registry JSON ↔ vendored constant ↔ old hardcoded `B1_HEADLINE_MAX_CHARS`). Mitigation: Slice A reconciles to one contract-owned number; constant↔registry parity test; vendored comment cites `source_commit`; re-vendor on any registry change.
3. **Gate leakage to other paths.** A mis-scoped edit perturbs non-PP/non-`image_quote`. Mitigation: gate on `client_id` (`4036a6b5…`, **not** slug — UUID-fallback lesson) + `recommended_format='image_quote'`; control-case byte-unchanged tests in every slice.
4. **Unbounded repair / cost runaway** (the H3.2 failure mode). Mitigation: Slice E is exactly one attempt then fail-loud; no loop; no `attempt_number` control; no re-entry into the render-retry path; review confirms the bound.
5. **Attribution loss** if injection (D) ships before a baseline. Mitigation: Slice C (validate-only) ships first and records the baseline `contract_validation.pass` rate; D must be ≥ baseline.
6. **Scope creep into a DB column.** Any "let's just add a `variant_key` column" flips the lane to db-rls-auditor + migration. Mitigation: jsonb only is a locked decision; reject column proposals in review.
7. **Registry runtime-import regression.** Importing the JSON at runtime breaks the guard. Mitigation: vendored derived constant only; grep-clean test that `supabase/functions/**` does not import `docs/creative-library/*`.
8. **B1-v2 coupling.** The path is live/proven (v4.05) but still young. Mitigation: each slice is additive + reversible (redeploy prior worker version; jsonb evidence is non-destructive); conforming output stays byte-equivalent to current B1-v2.

## Out of scope (restated — do not build)

Mix governance (format + variant) · AI variant **selector** · multi-brand / non-PP · non-`image_quote` formats · new DB tables **or columns** · DB migration · dashboard · Content Studio · subtitle authorship moved to AI · demand-grid / `platform_format_mix_default` revival · Format-Advisor format-decision changes · cost-based selection.

## Notes

- This sprint had a standing dependency on **B1-v2 proof**, now **satisfied** (v4.05 / `d172330`). No remaining external blocker to starting **Slice A (docs-first)**.
- Register reconciliation (a docs-lane closure note, likely `v4.06`) follows each shipped slice — separate from this brief, under the docs-register lane.
- This brief is planning only. **No code, no DB, no deploy, no commit** until PK issues the brief and approves each slice's gate.
