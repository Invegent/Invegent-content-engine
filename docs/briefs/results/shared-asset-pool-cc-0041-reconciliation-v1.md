# Result — Shared Asset Pool reconciliation: cc-0041 is the design of record

**Executed by:** Claude Code (orchestrator) + PK (reconciliation ruling)
**Completed:** 2026-07-19 Sydney
**Lane:** reconciliation (docs governance) · T1 · SIDE_PROVING
**Trigger:** discovered during the PR #8 rebase onto current `main` that this session's shared-asset-pool arc (P0 assessment → OQ-1 Rule 3.5 → P1 design-of-record → P2 dark-DDL) was built on a **v5.72 base**, unaware of parallel-session work already merged/applied on main.

---

## 1. Result status

`Complete` — PK ruled (2026-07-19): **cc-0041's applied schema is the design of record**; this session's P1 design-of-record + P2 migration are **SUPERSEDED**; Rule 3.5 is **reconciled** (OAIC grounding + v5.79 cross-reference). PR #8 is relabelled accordingly and merges as an honest record.

## 2. What was discovered

Two parallel artifacts existed on main that this session's v5.72 base could not see:

- **cc-0041 (register v5.88) — APPLIED, live-dark:** `c.shared_creative_asset` + `c.client_asset_pool_policy` + `m.asset_gap_suggestion` + `m.asset_gap_observation`. `c.shared_creative_asset` is the same concept as this session's `m.shared_asset`; `c.client_asset_pool_policy` carries the **same `asset_pool_policy` enum** (`client_only`/`client_preferred`/`best_fit`), plus `client_asset_score_bias` + `minimum_fit_score` (the scoring this session had only sketched). Independent convergence — the same design, built twice.
- **v5.79 — the NDIS Sensitive Real-Imagery Intake policy** (OAIC-grounded, staged phases, §F purpose-binding = this session's OQ-7). This is literally the *"v5.79 NDIS Sensitive-Real-Imagery policy"* the P0 assessment seed referenced; OQ-1's "it never existed" was a **base-staleness effect** (it post-dates v5.72).

## 3. Comparison (cc-0041 applied vs this session's P1 DoR)

| Dimension | cc-0041 (APPLIED) | P1 DoR (unbuilt) | Outcome |
|---|---|---|---|
| Scope model | flat `governance_scope` enum + allow/exclude client arrays | separate scoped-suitability table | **Keep cc-0041's flat model** (PK); scoped rows revisited only if a real multi-scope case demands |
| Pool policy | enum **+ score_bias + minimum_fit_score + allow_vertical/global_shared** | enum + preferred/banned arrays | cc-0041 richer; keep it |
| Licence | jsonb + one boolean | separate 1:1 table, 6 fail-closed booleans | fold P1's table idea into the evolution backlog (auditability) |
| Audit/rotation | none (has demand-side `asset_gap_*`) | review_event + usage_event | backlog when audit/rotation is built |
| Sensitivity | participant_neutral + sensitivity_class enum + purpose_bound | + cultural_review_required + has_people | backlog: add `cultural_review_required` |
| Schema | `c.*` | `m.*` (OQ-4) | cc-0041's `c.*` wins (applied) |

## 4. PK ruling (2026-07-19)

1. **cc-0041's `c.shared_creative_asset` + `c.client_asset_pool_policy` = the design of record.** You do not retire applied schema for an unbuilt design.
2. **This session's P1 design-of-record → SUPERSEDED** (relabelled in place: `docs/briefs/shared-asset-pool-design-of-record-v1.md`). Retained as a historical artifact + additive-idea source.
3. **The P2 migration → RETIRED, never to be applied** (isolated branch `claude/ice-shared-asset-pool-p2-prepared` @ `fe38a35`) — it would duplicate cc-0041's live tables. The R1 halt that blocked its apply was providential.
4. **Additive ideas → cc-0041 evolution backlog** (each a future PK gate): scoped-suitability table (only if the flat model proves too crude) · 1:1 licence table · review_event/usage_event · `cultural_review_required` column.
5. **Rule 3.5 stands, reconciled:** source upgraded from analogy-grounding to an **OAIC citation** (disability info = health = sensitive information) + cross-referenced to the v5.79 intake policy. Rule 3.5 = the compliance-block statement; v5.79 = the staged intake/sourcing governance. (`ndis_content_rules.md` v1.1→1.2.)
6. **PR #8 → relabel-and-merge (option A):** merge as an honest record of the superseded arc; the register pointers (v5.92/93/94) + this doc + a v5.95 pointer carry the reconciliation.

## 5. Files changed (this reconciliation)

- `docs/briefs/shared-asset-pool-design-of-record-v1.md` — status → SUPERSEDED
- `docs/compliance/ndis_content_rules.md` — Rule 3.5 OAIC grounding + v5.79 cross-ref; v1.1→1.2 + changelog
- `docs/briefs/results/shared-asset-pool-cc-0041-reconciliation-v1.md` — this doc
- `docs/00_sync_state.md`, `docs/00_action_list.md` — v5.95 pointer

## 6. What is NOT changed

- cc-0041's applied schema — untouched (it is the incumbent; this is a docs reconciliation only).
- The v5.79 policy and all main lanes — untouched.
- No DB write, no migration, no resolver, no deploy. The retired P2 migration is left on its isolated branch as a superseded artifact (not deleted — historical record).

## 7. Next recommended step

If/when the shared/generic asset pool needs the additive capabilities, open a **cc-0041 evolution** lane (its own PK gate) to consider the scoped-suitability table / 1:1 licence table / review+usage events against the live `c.shared_creative_asset`. No action required to close this reconciliation.

## 8. Verification

**Verdict:** `Pass` — cc-0041 established as the sole design of record; competing artifacts relabelled/retired honestly; Rule 3.5 reconciled and strengthened (real OAIC source now cited); no live schema touched.

## 9. Learning notes

- **Base-staleness is the root cause.** A session working off a v5.72 base while main advanced to v5.91 rebuilt an already-applied design and "proved" a policy didn't exist that did. CCF-02 claim-stubs are meant to prevent exactly this; a single-session assumption skipped them. Lesson: for any multi-lane arc, re-fetch main and scan the register range before cutting design-of-record decisions, not just at commit time.
- **The R1 halt earned its keep twice** — it blocked an apply that would have duplicated live tables, quite apart from the MCP-verification reason it was raised for.
- Independent convergence (same `asset_pool_policy` enum, `purpose_bound`, scoring fields arrived at separately) is reassuring about the design's correctness — but convergence built twice is waste; the governance value is catching it before a second apply.
