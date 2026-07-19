# Result cc-0041 — Post-Prep Asset-Gap Analysis: demand-intelligence schema APPLIED

**Completed:** 2026-07-19 Sydney · **Lane:** Post-Prep Asset-Gap Analysis
**Tier:** T3 (production-touching additive DDL) · **Class:** SIDE_PROVING → substrate live, dark
**Brief:** `docs/briefs/cc-0041-post-prep-asset-gap-analysis-brief.md` (rev-3, Option B)
**DDL artifact:** `docs/briefs/cc-0041-asset-gap-analysis-ddl-packet-v1.sql` · sha256 `37a1da5e3259da11dcd2516c9b2b53cb411cfb935115d55fb6719cdb8f72410d`
**Migration (ledger):** `20260719160000` / `cc_0041_asset_gap_analysis_schema_v1`

---

## What shipped

The **schema substrate** for the post-prep asset-gap demand loop — 4 additive tables, all born fenced / service-role-only / non-REST-exposed. **Design + schema only**: the analyzer, the appetite/inventory read-path, and the harvest-drain routine are NOT built (each a later PK-gated lane). Nothing in production reads these tables yet — ships dark.

| Object | Role |
|---|---|
| `c.shared_creative_asset` | **Option B** — dedicated shared/generic governed-asset table (`global_generic`/`vertical_shared`/`purpose_bound`). Client-bound assets stay in `c.client_brand_asset`, untouched. Born fenced. |
| `c.client_asset_pool_policy` | Per-client pool policy (`client_only`/`client_preferred`/`best_fit`); **no row ⇒ `client_only`** (fail-safe). |
| `m.asset_gap_suggestion` | Aggregated, client-specific demand queue. Dual-axis (`primary_route` × `asset_gap_detected`/`drainability`), 7-state lifecycle, partial-unique per live appetite signature. No license/sha (demand ≠ asset). |
| `m.asset_gap_observation` | Per-post evidence child (replaces a mutating sample-array). |

## The architecture (PK-ratified over 3 design revisions)

- **MISS detector is not `select_template` alone.** Governance/template gates mask asset shortfalls, so the analyzer runs an **independent** asset check (`resolve_slot_assets` over the client's own assets **+** a shared-pool evaluator over `c.shared_creative_asset` for the scopes the client policy permits). A MISS exists only after **all permitted pools** are checked.
- **Dual-axis classifier.** `primary_route` (system_error > template_gap > governance_gap > asset_gap) routes remediation; `asset_gap_detected` + `asset_gap_drainability` (drainable / blocked_by_template / blocked_by_governance / triage_only) govern recording and drainability. **Option (a):** a governance/template-masked asset gap is **recorded as demand evidence** but is **not drainable** until the masking gap clears.
- **Drain query (future routine):** claims ONLY `asset_gap_detected AND asset_gap_drainability='drainable' AND status='open' AND slot_kind='static_background'`. Video B-roll / logo gaps are recorded but never drained by the background harvester.
- **Aggregation** by client-specific `appetite_signature` (includes `client_id` + canonical slot requirements + appetite-policy version). Cross-client shared-demand is a **later derived view**, never conflated into the operational queue.
- **`resolved` ≠ candidate creation.** A gap is `resolved` only when a promoted governed asset makes the recheck HIT; promotion stays the existing PK hard gate; harvester output is fenced candidates only.

## Gate chain (T3)

| Gate | Evidence |
|---|---|
| Gate-1 design | PK "ARCHITECTURE APPROVED WITH FINAL TARGETED REVISION" → rev-3; blockers resolved: **Option B** (dedicated shared table) + exclusivity toggle **UI/planned-only → greenfield**. |
| db-rls-auditor (ground truth) | `concerns` — confirmed no shared-asset concept exists (`client_brand_asset.client_id` NOT NULL, 0 shared rows), toggle absent from DB; established FK targets, posture mirror, roles. |
| db-rls-auditor (DDL v1) | `concerns` → **all folded**: D-d `resolved_asset_id` split into `resolved_client_asset_id`+`resolved_shared_asset_id` (real FKs) + XOR CHECK; partial-index predicate includes `failed`; removed `client_scoped` from shared `governance_scope`; drain index `DESC NULLS LAST`. |
| External review | `ask_chatgpt_review` **agree / medium / high → proceed**, `review_id cfe70b94`, `reviewed_input_hash 37a1da5e…`. |
| PK apply gate | One-gate, hash-pinned (Convention-2). |

## Apply + verification (project `mbkmaxqhsohbtwsqolns`)

- **Pre-apply STOP checks:** packet hash == `37a1da5e…` ✓ · origin not moved (behind 0) ✓ · 4 table names collision-free (`[]`) ✓.
- **Applied** verbatim via `execute_sql` (single txn; `apply_migration` harness-deny-listed) — no error.
- **Ledger backfilled:** `20260719160000` / `cc_0041_asset_gap_analysis_schema_v1` (statements + 4-line rollback array).
- **Post-verify:** 4 tables present · RLS on / `force_rls=false` / **0 policies** (deny-all, TMR-4 mirror) · grants per table = `service_role`(DELETE,INSERT,SELECT,UPDATE) + `inspector_ro`(SELECT) + `postgres`(owner) · **anon/authenticated/public privileges = 0** · 15 indexes.
- **Advisor delta:** exactly **4 benign `rls_enabled_no_policy` INFO** (one per new table); **0 new ERROR/WARN** (the 3 pre-existing ERRORs are `security_definer_view` on unrelated objects). Every Convention-2 STOP condition held.

## Rollback

`drop table if exists` in reverse dependency order: `m.asset_gap_observation` → `m.asset_gap_suggestion` → `c.client_asset_pool_policy` → `c.shared_creative_asset` (recorded in the ledger `rollback` column and the DDL packet).

## Open decisions carried to the analyzer lane (not blockers)

- **D-a** shared-asset fence model: explicit columns + `asset_meta` provenance (chosen) vs mirroring `client_brand_asset`'s all-in-`asset_meta` model.
- **D-c** `demand_count`: app-maintained on analyzer UPSERT (chosen) + a reconciliation view vs `count(*)` of observations.
- **Analyzer UPSERT contract:** must infer the partial index with the EXACT predicate `ON CONFLICT (appetite_signature) WHERE status IN ('open','queued','harvesting','candidates_ready','failed') DO UPDATE …` (a bare `ON CONFLICT (appetite_signature)` errors — no total unique index by design).
- **inspector_ro reads** return 0 rows under RLS-deny-all (not owner) — any read path needs an owner-privileged view/RPC (same as TMR-4 tables).

## Next lanes (each own PK gate)

1. **Read-only appetite/inventory derivation** (`derive_asset_appetite` + two-source eligibility evaluator; ships dark) — T2.
2. **Analyzer** (offline idempotent batch sweep over stable drafts → writes `m.asset_gap_suggestion`; no synchronous draft-path change) — T3.
3. **0A/0B population** (define/seed shared assets + per-client pool policy).
4. **Harvest-drain routine** (governed image-harvester → image-reviewer → PK visual gate) — separate future T3.

## Not touched

No production worker/RPC/EF/cron changed. `resolve_slot_assets` / `select_template` unedited. `c.client_brand_asset` and the 127 live client assets untouched. Video lanes untouched.
