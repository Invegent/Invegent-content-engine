# Result — cc-0041 evolution: additive-ideas DESIGN-INPUT assessment (read-only)

**Brief:** `docs/briefs/cc-0041-evolution-design-input-assessment-brief-v1.md`
**Executed by:** Claude Code (orchestrator) · **Completed:** 2026-07-19 Sydney
**Lane:** SIDE_PROVING · T1 (read-only design assessment; no DB, no DDL, no deploy)
**Deliverable form (PK-chosen):** single consolidated input packet — prioritized set + named PK decision per idea.

---

## 0. Standing: this is design INPUT to a live, actively-owned schema

`c.shared_creative_asset` + `c.client_asset_pool_policy` + `m.asset_gap_*` are **LIVE/applied on main** (cc-0041, register v5.88) and **actively owned + mid-flight** by the Asset-Gap program (`00_sync_state.md` v5.90 "Asset-Gap lane owns c.shared_creative_asset"; read-path cc-0042 applied v5.93; the analyzer-WRITE lane is next). The three LIVE dark functions `derive_asset_appetite` / `resolve_shared_pool_assets` / `analyze_asset_gap` READ this schema. **This assessment decides nothing and touches nothing** — it hands a prioritized recommendation to that owner + PK. Each surviving idea graduates only via its own future Gate-1 lane at its own tier.

**Churn note (re-verified 2026-07-19):** main at `2ac3ea4`, register v5.95 (Video D6 L4b — not a cc-0041 lane); no new cc-0041/read-path movement since the schema was read. Per the base-staleness lesson, any follow-on lane must re-fetch main + rescan the register + drop a CCF-02 claim-stub before cutting anything.

## 1. Per-idea assessment

Incumbent columns cited from the applied DDL packet `docs/briefs/cc-0041-asset-gap-analysis-ddl-packet-v1.sql`.

### Idea 3 — `review_event` + `usage_event` tables · **verdict: ADOPT-CANDIDATE (highest priority), timed to promotion/rotation**

- **(a) Needed vs covered:** **Genuinely absent.** cc-0041 has only the demand-side `m.asset_gap_suggestion`/`m.asset_gap_observation` (`:137,246`) — **no** scoped-approval audit trail and **no** rotation-cooldown source for a shared asset. The music library carries both (parity). Real gap.
- **(b) Reader impact:** **None.** Both are append-only logs; no cc-0042 reader consumes them. Purely additive.
- **(c) Tier:** **T2, additive-dark** (two new tables, fenced/empty, no reader change). Lowest-risk of the four.
- **(d) Owner backlog:** Yes — but the cleanest to offer, because it aligns with the owner's *upcoming* shared-asset approval + rotation work (the analyzer/promotion/harvest-drain lanes on the roadmap, `cc-0041-post-prep-asset-gap-analysis.md:59-64`).
- **Recommendation:** offer to the Asset-Gap owner as **ready-to-adopt when shared-asset promotion/rotation lands** — it gives that work an audit trail + cooldown source-of-truth from day one. Not needed while the pool ships dark with no promotion/rotation yet.

### Idea 2 — 1:1 licence table with fail-closed booleans · **verdict: DEFER (candidate for the video/paid-stock step)**

- **(a) Needed vs covered:** **Partially covered.** cc-0041 has `licence_allows_multi_entity_use` boolean (`:85`) + `license`/`license_type`/`sha256` in `asset_meta` jsonb (`:95`). Adequate for the current single-bar "multi-entity commercial only" rule. The 1:1 table's six fail-closed booleans (commercial/social/modification/paid_ads/attribution/content_id + expiry) only earn their keep when the shared pool admits **video (`content_id_safe`)** or **paid-stock (`paid_ads_allowed`)** — richer rights logic than one boolean.
- **(b) Reader impact:** **Additive if unenforced; reader-touching if enforced.** A new table alone = dark. Making `resolve_shared_pool_assets` gate on the booleans = a reader change.
- **(c) Tier:** **T2 additive-dark** (new table) → **T3** to enforce in the resolver.
- **(d) Owner backlog:** Yes — licence enforcement is part of the eligibility contract the owner controls.
- **Recommendation:** **defer**; offer as a candidate **when the shared pool's licence bar needs to go beyond one boolean** (video/paid-stock). Music precedent (`m.music_license`) is the ready shape.

### Idea 4 — `cultural_review_required` column · **verdict: DEFER (low priority; consider as a `sensitivity_class` value instead)**

- **(a) Needed vs covered:** **Forward-looking.** cc-0041 has `participant_neutral` + `sensitivity_class ∈ {person_free,contains_people,unknown}` + `purpose_bound` (`:80-84`). None captures a First-Nations cultural sign-off, which the **v5.79 policy** names (§D adviser, HELD). But cultural content is **Phase-3 HELD** — not sourceable now — so the flag is not yet operable.
- **(b) Reader impact:** **None** (additive fenced column, default false).
- **(c) Tier:** **T2 additive-dark** (new column with default on a live table).
- **(d) Owner backlog:** Yes. **Design nuance to hand the owner:** this may be cleaner as a new **`sensitivity_class` value** (e.g. `culturally_specific`) than a separate boolean — one governed vocabulary rather than a parallel flag.
- **Recommendation:** **defer** until cultural content enters scope (Phase 3, held); when it does, prefer extending `sensitivity_class` over a new column.

### Idea 1 — scoped-suitability table (vs flat `governance_scope` enum + client arrays) · **verdict: DEFER→NEAR-DROP for now (highest cost, no current need)**

- **(a) Needed vs covered:** **Covered for today's cases.** cc-0041's `governance_scope ∈ {global_generic,vertical_shared,purpose_bound}` + `vertical_key` + `allowed_clients[]`/`excluded_clients[]` (`:66-71`) handles global/vertical scoping + explicit per-client allow/deny. The scoped-suitability table only adds value for **simultaneous multi-scope fit with a review workflow** — e.g. `suitable` for property AND `blocked` for a competitor AND `needs_review` for ndis at once, which the flat model can't express. **No evidence a real multi-scope/needs-review case exists yet** (live row-state is a `db-rls-auditor` handoff).
- **(b) Reader impact:** **High — reader-rewriting.** `resolve_shared_pool_assets` reads the flat scope model directly; replacing it with a suitability table rewrites the resolver's eligibility logic.
- **(c) Tier:** **T3** (touches the live reader + replaces a live column contract; not additive-dark).
- **(d) Owner backlog:** Yes — this is a change to the owner's **core eligibility model**, squarely their call.
- **Recommendation:** **do not push now.** Highest cost, highest risk, no current need. Revisit only if/when a genuine multi-scope/needs-review case arises — and then as the owner's core-model decision, not a bolt-on.

## 2. Prioritized recommendation (consolidated)

| Rank | Idea | Verdict | Tier | Trigger to adopt |
|---|---|---|---|---|
| 1 | review_event + usage_event | **adopt-candidate** | T2 additive-dark | when shared-asset promotion/rotation is built |
| 2 | 1:1 licence table | defer-candidate | T2→T3 | when video/paid-stock enters the shared pool |
| 3 | cultural_review_required | defer (low) | T2 additive-dark | when cultural content (Phase 3) opens; prefer a `sensitivity_class` value |
| 4 | scoped-suitability table | defer→near-drop | T3 reader-rewrite | only on a real multi-scope/needs-review case |

**Pattern:** the additive-dark, reader-neutral ideas (3, and 4-as-a-value) are cheap to fold when their trigger lands; the reader-touching ideas (1, and 2-enforced) are the owner's core-model decisions and should not be pushed absent a concrete need. Nothing here is worth opening ahead of the owner's roadmap.

## 3. Coordination handoff — Asset-Gap lane owner (named)

This packet is **input to the Asset-Gap owner**, who owns `c.shared_creative_asset`. Recommended coordination: fold **idea 3** into the owner's promotion/rotation lane when it's scoped; hold **2/4/1** against their triggers above. None of the four should be opened as a *separate* schema lane in parallel with the owner — each belongs inside (or gated behind) the owner's own next lanes to avoid another parallel-collision.

## 4. PK decision each surviving idea would need

- **Idea 3:** PK approval to fold `review_event`/`usage_event` into the owner's shared-asset promotion/rotation lane (its own Gate-1, T2 additive-dark) when that lane is scoped.
- **Idea 2:** PK approval to open a licence-model lane when the shared pool's licence bar must exceed one boolean (video/paid-stock).
- **Idea 4:** PK approval to add cultural-review handling (as a `sensitivity_class` value, preferably) when Phase-3 cultural content opens.
- **Idea 1:** PK + owner decision only on a concrete multi-scope/needs-review requirement — otherwise closed.

## 5. Handoffs (live-truth — this T1 lane did not resolve)

- **`db-rls-auditor`:** current row/population state of `c.shared_creative_asset` + `c.client_asset_pool_policy` (does a real multi-scope case exist for idea 1?); would adopting any idea break the live cc-0042 readers.
- **`branch-warden`:** confirm main HEAD + migration ledger (cc-0041 `20260719160000`, cc-0042 v2 `20260719190000`) still match the result-doc assertions at any follow-on run.
- **`register-reconciler`:** any drift between pointers v5.88/v5.93/v5.94 and the applied schema.

---

## Findings-contract block (CCF-02 §2)

- **verdict** — normalized: `clean` · native: ASSESSMENT_COMPLETE (design-input; decides nothing).
- **confidence** — High on the static comparison (each idea mapped to incumbent columns / roadmap items). Medium on "needed vs not" for ideas 1–2, which turn on live population state (db-rls-auditor handoff) and the owner's private backlog.
- **must_fix** — none (read-only).
- **should_fix** — confirm the coordination point live with the Asset-Gap owner rather than inferring "belongs to owner backlog" purely from published docs.
- **observations** — idea 3 is genuinely absent from cc-0041 and additive-dark (the cleanest fold-in); idea 1 is the costliest (T3 reader-rewrite) with no current need; idea 4 may be a `sensitivity_class` value, not a column; the cc-0042 v1→v2 lesson (static review necessary-but-insufficient) means every adopt-candidate still needs its own gate + live proof.
- **evidence** — `cc-0041-asset-gap-analysis-ddl-packet-v1.sql:62-132`, `cc-0042-appetite-inventory-read-path.md:16-21,54`, `cc-0041-post-prep-asset-gap-analysis.md:52-64`, `shared-asset-pool-cc-0041-reconciliation-v1.md`, `shared-asset-pool-design-of-record-v1.md` (superseded).
- **scope_boundary** — read-only static assessment; no DDL/schema/function/deploy; no ownership claim; retired `m.shared_asset` model not reintroduced; live-DB/git/register truth are named handoffs.
- **open_questions** — Asset-Gap owner's live backlog state (may change a needed/covered verdict); live population state for idea 1.
- **recommended_next_gate** — route to PK + the Asset-Gap owner as input; no schema lane opens without its own Gate-1 at its own tier.
- **non_claims** — nothing applied, decided, or scheduled; no idea is ratified to ship; no live-DB/deploy/git verified.
