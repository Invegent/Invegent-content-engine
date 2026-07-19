# Brief — cc-0041 evolution: additive-ideas DESIGN-INPUT assessment (read-only)

**Created:** 2026-07-19 Sydney
**Author:** chat (brief-author draft; orchestrator persists)
**Executor:** Claude Code (orchestrator)
**Status:** draft — awaiting PK Gate-1 approval
**Result file:** `docs/briefs/results/cc-0041-evolution-design-input-assessment.md` (created on completion)

**Lane class:** SIDE_PROVING · **Tier:** T1 (read-only design assessment; no DB, no DDL, no deploy).

---

## Task

Produce a **read-only design-input assessment doc** that evaluates the FOUR additive ideas carried out of the shared-asset-pool reconciliation into the "cc-0041 evolution backlog" — offered as design INPUT to the live, actively-owned Asset-Gap program and to a PK decision. This lane does **not** redesign, own, or modify any schema. The four ideas (named in `docs/briefs/results/shared-asset-pool-cc-0041-reconciliation-v1.md`):

1. **Scoped-suitability table** — one row per (scope_kind, scope_value, fit_status) with first-class `blocked` rows — vs cc-0041's incumbent **flat `governance_scope` enum + `allowed_clients[]`/`excluded_clients[]` arrays** (`cc-0041-asset-gap-analysis-ddl-packet-v1.sql:66-71`).
2. **1:1 licence table with fail-closed booleans** (commercial/social/modification/paid_ads/attribution/content_id + expiry) — vs cc-0041's **`asset_meta` jsonb + the single `licence_allows_multi_entity_use` boolean** (`:85,95`).
3. **review_event + usage_event tables** — a scoped-approval audit trail + a rotation-cooldown history source-of-truth (music-library parity; superseded DoR §2 tables 4–5) — cc-0041 has **neither** (only the demand-side `m.asset_gap_*` tables, `:137,246`).
4. **`cultural_review_required` column** — a real field for the already-named First-Nations cultural sign-off requirement — additive to cc-0041's existing `participant_neutral`/`sensitivity_class`/`purpose_bound` (`:80-84`).

For EACH idea, the assessment states, evidence-cited:
- **(a) Genuinely needed vs already covered/deferred?** — vs the LIVE incumbent columns and the active roadmap's explicitly-deferred items (`best_fit` scoring · `sourcing_target_scope` v1=`client_scoped` · seed rotation, `cc-0042-appetite-inventory-read-path.md:54`; cc-0041 open decisions `cc-0041-post-prep-asset-gap-analysis.md:52-57`).
- **(b) Conflict with / change required to the cc-0042 read-path, the future analyzer, or the flat-scope model?** — the LIVE dark functions `derive_asset_appetite`/`resolve_shared_pool_assets`/`analyze_asset_gap` READ this schema; any evolution must not break them.
- **(c) If adopted, what tier + additive-dark-safe?** — a new/altered column or table on a LIVE table is DML/DDL ≥ **T2**; touching the read-path/analyzer or the live flat-scope contract is **T3**. Note purely-additive-dark (new table / new fenced column, no reader change) vs reader-touching.
- **(d) Belongs to the Asset-Gap owner's backlog rather than a separate lane?** — the program **actively owns `c.shared_creative_asset`** (`00_sync_state.md` v5.90 handoff) and is mid-flight (read-path applied v5.93; analyzer-WRITE lane next).

The deliverable ends with a **prioritized recommendation** — `adopt-now-candidate` / `defer` / `drop`, each justified — an **explicit coordination handoff to the Asset-Gap lane owner**, and the **specific PK decision** each surviving idea would need. Any idea that graduates gets its OWN future Gate-1 lane at its own tier; this lane decides nothing.

## Source context

- `docs/briefs/results/shared-asset-pool-cc-0041-reconciliation-v1.md` — the PK ruling that made cc-0041 the design of record and routed the four ideas to the evolution backlog; §3 comparison; §9 base-staleness lesson.
- `docs/briefs/cc-0041-asset-gap-analysis-ddl-packet-v1.sql` — the LIVE applied incumbent (the schema to evaluate against).
- `docs/briefs/results/cc-0041-post-prep-asset-gap-analysis.md` — apply verification, open decisions carried to the analyzer lane, next lanes each own PK gate.
- `docs/briefs/results/cc-0042-appetite-inventory-read-path.md` — the LIVE dark read functions that READ this schema, the v1→v2 "static review necessary-but-not-sufficient" lesson, and the deferred items.
- `docs/briefs/shared-asset-pool-design-of-record-v1.md` (**SUPERSEDED**) — where the four ideas were designed; carry the reasoning, NOT the retired `m.shared_asset` tables.
- `CLAUDE.md` — CCF-02 lane classification + claim-stub/parallel-session discipline + risk tiers.

## Scope

**In scope:** the read-only assessment doc (four ideas each carrying an evidence-cited needed/conflict/tier/dependency verdict) + the explicit coordination handoff to the Asset-Gap owner + a per-idea tier/dependency-on-cc-0042 note + the prioritized adopt-candidate/defer/drop recommendation + the named PK decision each surviving idea would need. **Static evidence only.**

**Out of scope:** applying, building, or scheduling any idea; live-DB/deploy/git verification; deciding which ideas ship; any change to the incumbent schema or the cc-0042 functions.

## Allowed actions

- Read the applied DDL packet, the cc-0041/cc-0042 result docs, the superseded DoR, the reconciliation, and the registers as static evidence; cite each material claim to `path`/`path:line`.
- Compare each idea against the LIVE incumbent columns and the active roadmap's covered/deferred items, honestly (say so where an idea is already covered or on the deferred list).
- Classify each idea's would-be tier and additive-dark-safety; note its dependency on / impact to the cc-0042 read-path.
- Write the prioritized recommendation, the coordination handoff, and the named PK decision per surviving idea.

## Forbidden actions

- **NO DDL, NO migration, NO schema change to any live table** — `c.shared_creative_asset`, `c.client_asset_pool_policy`, `m.asset_gap_*` are LIVE/applied on main.
- **NO edit to the cc-0042 read-path functions** — LIVE dark, they READ this schema.
- **NO deploy, no apply, no execute_sql/apply_migration.**
- **NO claim of ownership** over `c.shared_creative_asset` / `c.client_asset_pool_policy` — the Asset-Gap program actively owns them and is mid-flight. This lane offers design input; it does not fork or supersede it.
- **NO reintroduction of the retired `m.shared_asset` tables / six-table P1 model** — SUPERSEDED, P2 RETIRED. Carry the reasoning, not the tables.
- **Do NOT decide which ideas ship** — a PK + Asset-Gap-owner decision; each graduating idea gets its own future Gate-1 lane at its own tier.
- **Do NOT assert live-DB / deploy / git truth** — static artifacts only; live-truth questions (row counts, would-a-reader-break) are `db-rls-auditor` handoffs.

## Success criteria

- Every one of the four ideas carries an **evidence-cited verdict** (adopt-now-candidate / defer / drop) **+ would-be tier + dependency-on-cc-0042 note**, each citation resolving to a `path`/`path:line`.
- The assessment is **honest about coverage**: where an idea is already covered by an incumbent column or already on the deferred/carried list, it says so and does not re-propose it as new.
- The **coordination point with the Asset-Gap lane owner is explicit** — a named handoff, reflecting the owner is mid-flight (analyzer-WRITE next).
- The recommendation names the **specific PK decision** each surviving idea needs to graduate.
- **Nothing is applied, built, or decided**; no live table or cc-0042 function is touched; the retired model is not reintroduced.
- The doc **prominently flags** active ownership + fast-moving main (parallel-session churn), and **recommends a fresh main re-fetch + register scan + CCF-02 claim-stub at the START of any follow-on lane** (the base-staleness lesson).

## Stop condition

Report the assessment per the result template and stop. Route the deliverable to **PK** (deciding party) **and to the Asset-Gap lane owner** as a named coordination handoff. **Nothing proceeds to any schema change or read-path edit without its own Gate-1 lane at its own tier** — this lane produces input only.

---

## Notes

- **Tier T1** (read-only). If any idea appears to need a live-truth check to decide (e.g. "would this reader break"), do NOT resolve it here — record it as a `db-rls-auditor` handoff; the T1 boundary holds.
- **Active-ownership / churn flag (load-bearing):** the cc-0041 schema + cc-0042 read-path are LIVE and mid-flight under the Asset-Gap program. Register moved v5.72→v5.94 across parallel sessions during this arc, and a stale-base session rebuilt an already-applied design. Any follow-on lane must re-fetch main + scan the register + drop a CCF-02 claim-stub before cutting any decision or register entry.
- **Handoffs:** `db-rls-auditor` (would an idea break the live cc-0042 readers; current row/population state — does a real multi-scope case exist yet) · `branch-warden` (main HEAD + migration ledger match the result-doc assertions at run time) · `register-reconciler` (drift between v5.88/v5.93/v5.94 pointers and applied schema).

## PK Gate-1 decision that shapes the deliverable

- **Deliverable granularity:** should the four ideas be handed to the Asset-Gap owner as a **single consolidated input packet** (prioritized set + named PK decision per idea — stays T1), or does PK want **each surviving idea's future Gate-1 lane pre-scoped** in this doc (heavier; borders on doing the next lane's design work)?
