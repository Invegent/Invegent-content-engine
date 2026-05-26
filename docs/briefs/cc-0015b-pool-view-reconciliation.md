# cc-0015b — Pool-view reconciliation: category pools (cc-0015) ⟷ Repair Board v0

**Brief ID:** cc-0015b (reconciliation re-brief for cc-0015 Stage B)
**Version:** v1.0
**Status:** **AUTHORED — PENDING PK DECISION + PENDING_EXECUTION.** Not implemented. No code, no migration, no deploy.
**Authored:** 2026-05-26 Sydney (CCD)
**Why:** cc-0015 v1.0 (authored 2026-05-16) specified a category-based pool view for `/operations`. Seven days later a *different* "pools" surface shipped — the read-only **Pool / Repair Board v0** at `/operations/pools` (commit `9a4b446`, 2026-05-23). cc-0015 Stage B/C/D were **held** at the v3.12 readiness pass pending this reconciliation. Stage A (schema) + Stage F (operator copy) are already done; this brief unblocks Stage B only.
**Depends on:** cc-0015 Stage A APPLIED (✅ `dashboard_ui` category + `friction.pool_session`), Stage F SHIPPED (✅ operator help live). Does NOT depend on Stage C/D/E/G.

---

## 1. Current-state inventory

### 1a. `/operations` (`app/(dashboard)/operations/page.tsx` + `case-row.tsx` + FAB)
- **Friction-case list:** `friction.fn_recent_cases(p_limit=50)` → `CaseRow` (inline triage form per case, calls `fn_triage_case`).
- **cc-0016 Stage D:** per-case evidence attachments, signed-URL hydrated server-side.
- **Usability patch (2026-05-23):** hydrates `problem_key` + capture/suppression metadata via a supplemental `friction.case` read (not returned by `fn_recent_cases`).
- **Stage F (shipped v3.12):** `FrictionFieldHelp` inline help on the FAB (severity, category) + triage form (quality_flag, category, action_decision, next_review_at, capture_reason, capture_reason_note).
- **Links to** `/operations/pools` ("Pools / Repair Board").
- **Does NOT have:** filter bar, saved views, source filter, sort options, batch select. *(These are the cc-0015 Stage B targets.)*

### 1b. `/operations/pools` — Repair Board v0 (`pools/page.tsx` + `pool-card.tsx`, commit `9a4b446`)
- Header self-declares **"NOT cc-0015 and NOT automation… only reads `friction.case`."** Read-only control plane.
- **Pool membership** is encoded by PK inside `friction.case.notes` as structured `key: value` lines (`pool_key`, `pool_role`, `evidence`, `repair_status`, `blocked_by`, …). The page parses notes, groups cases by `pool_key`, and merges each pool with an editorial `CATALOG` (plane / title / recommended-step / mutation-required / D-01-required / evidence-path).
- **Pools are pipeline-incident / repair pools:** e.g. FB jobid-48 starvation, insights-ingestion stall, IG true-stuck, YT true-stuck, LinkedIn enqueue, content-studio series-save, cc-0016 smoke artifact.
- Sections: **Act now / Track / Suppressed-ignored**; `PoolCard` expandable. **No DB pool tables, no batch, no mutation, no cron/queue controls.**

### 1c. The two "pool" models (the conflict)
| | cc-0015 category pools | Repair Board v0 |
|---|---|---|
| **Grouping key** | `friction.category` (+ triage_state) | `friction.case.notes` `pool_key:` (manual) |
| **Purpose** | General **resolution** pooling — batch-triage related cases by category in weekly sessions | **Specialist repair** control plane — curated pipeline-incident pools with editorial repair metadata |
| **Backing** | DB: `friction.category` + `friction.pool_session` (Stage A) + extended `fn_recent_cases` (Stage B) | `notes` text parsing + a code-side editorial `CATALOG`; no DB pool tables |
| **Surface** | `/operations` (list + filters + saved views) | `/operations/pools` |
| **Mutation** | batch-resolve (Stage C, future) via `fn_triage_case` | none (read-only) |

The collision is **conceptual + naming**: both call themselves "pools," and cc-0015's planned saved views include "Pipeline pool" / "Reconciliation pool" while v0 already surfaces pipeline/reconciliation repair pools.

---

## 2. The eight reconciliation questions (with recommendation)

1. **Supersede v0?** → **No (recommended).** v0 is a distinct, useful specialist surface (pipeline-incident repair control plane). Superseding it would destroy a working operator tool. *Do NOT supersede without a separate, explicit PK-approved decision.*
2. **Coexist?** → **Yes (recommended).** Two complementary surfaces: a general register pool view (`/operations`) and a specialist repair board (`/operations/pools`).
3. **Re-scope Stage B to integrate with v0?** → **Partial.** Stage B is a **`/operations` filter/saved-view enhancement** (general category pooling). It does **not** merge into, replace, or modify v0. The two stay separate, cross-linked.
4. **What should `/operations` link to?** → `/operations` = the friction-register list with Stage B filters + saved views; **keep** the link to `/operations/pools`, relabeled to make its *specialist repair* purpose explicit. v0 keeps a link back to "all friction cases."
5. **Difference between the four concepts:**
   - **Operational friction pools (cc-0015):** cases grouped by `friction.category` for batch resolution on a weekly cadence (driven by category + triage_state).
   - **Repair-board / pipeline-incident pools (v0):** cases manually curated by `notes.pool_key` into named repair pools with editorial control-plane metadata (plane / recommended-step / mutation+D-01 flags). Repair-focused, read-only.
   - **Category filters (Stage B):** the `/operations` list filtered by category / triage_state / source via URL params.
   - **Saved views (Stage B):** pre-configured filter combinations (named) — a convenience layer over category filters.
6. **What must NOT change in Repair Board v0:** the route `/operations/pools`; the `notes` `pool_key:`/`pool_role:` convention + its parsing; the editorial `CATALOG`; its **read-only** posture; `pool-card.tsx`. **Nothing in v0 changes without explicit PK approval** (this brief proposes zero v0 changes).
7. **Smallest safe Stage B slice (after A/F):** the `/operations` **filter bar + saved views** (URL-param-driven) + a **backward-compatible** extension of `friction.fn_recent_cases` (new defaulted params). **Excludes** batch (Stage C), status-strip pool counts (Stage D), pool-session UI (Stage E), and **any** change to `/operations/pools`. Saved views **renamed** to avoid the "Pipeline pool" collision (see §3).
8. **V-checks that prove the model isn't confusing:** see §6 (V-B5 specifically — distinct labeled purposes, no duplicate "Pipeline pool" naming, cross-links explain each surface, PK read-aloud "which surface for X?" is unambiguous).

---

## 3. Proposed information architecture

- **`/operations` — "Friction cases"**: the register list + Stage B filter bar (category / triage_state / source, URL-param-driven) + **saved views**. The general register pool/triage surface.
- **`/operations/pools` — "Pools / Repair Board"**: v0, **unchanged** — the specialist pipeline-incident repair control plane.
- **Cross-links (relabeled for clarity):** `/operations` → "Repair Board (pipeline-incident pools)"; `/operations/pools` → "All friction cases".
- **Saved views — renamed to avoid collision with v0's pipeline/repair pools:**
  - **Dashboard UI** (`category=dashboard_ui`)
  - **Register reconciliation** (`category=client_commitment` / reconciliation-sourced — exact predicate TBD with PK)
  - **Pipeline / friction cases** (`category=pipeline_integrity`) — *NOT* "Pipeline pool" (v0 owns the pipeline-repair framing)
  - **All tracked** (`action_decision=track`)
  - **New / untriaged** (`triage_state=new`)

---

## 4. Proposed Stage B implementation plan (smallest safe slice)

**Backend (1 migration, `sql_destructive` D-01):** recreate `friction.fn_recent_cases` adding `p_categories text[] DEFAULT NULL`, `p_triage_states text[] DEFAULT NULL`, `p_sources text[] DEFAULT NULL`, `p_sort_by text DEFAULT NULL` — **all defaulted so the existing `fn_recent_cases(p_limit)` callers (operations page, roadmap) keep working unchanged** (V-B2). Return the existing columns + `category` display_label + an aggregated `source_list`. NULL/empty filters → return all (current behaviour).

**Frontend (`/operations` only, additive):**
- `app/(dashboard)/operations/PoolFilterBar.tsx` — multi-select (category / triage_state / source) + saved-views menu; updates URL via shallow routing.
- `app/(dashboard)/operations/SavedViews.tsx` — the 5 renamed saved-view configs (§3).
- `page.tsx` — parse URL params server-side, pass to the extended RPC; **preserve** the cc-0016 evidence hydration, the usability patch, and the Stage F help wiring.
- (optional) `CaseRow` source badge.
- **`/operations/pools` is NOT touched.**

**Explicitly NOT in this slice:** Stage C batch resolve, Stage D status-strip pool counts (`fn_pool_counts`), Stage E pool-session UI, any v0 change, the re-scoped category-per-option-description follow-up.

---

## 5. Open decisions for PK
1. **Model:** confirm **coexist** (recommended) vs supersede vs deeper integrate.
2. **Saved-view names** (§3) — approve or adjust; confirm the "Register reconciliation" predicate.
3. **Stage B = complement, not replacement** of `/operations/pools` — confirm.
4. Whether to fold the **category-description follow-up** (live `friction.category.description` per-option help) into Stage B or keep it separate.
5. Whether a "source" filter is wanted now (depends on `fn_recent_cases` exposing source) or deferred.

---

## 6. D-01 questions / V-checks / hard stops / rollback

**D-01 (`plan_review` before build; `sql_destructive` before the RPC migration):**
- Does the `fn_recent_cases` recreate preserve all existing callers (backward-compatible defaults)?
- Does the two-surface IA (general register pool vs specialist repair board) read as non-confusing?
- Do the renamed saved views avoid the v0 "pipeline/repair pool" collision?
- Confirm Stage B alters **nothing** in Repair Board v0.

**V-checks:** V-B1 RPC accepts new params + returns expected shape. V-B2 empty/NULL filter returns all (backward-compatible — existing callers unaffected). V-B3 filter bar updates URL + reloads (manual). V-B4 saved views produce the expected filtered lists (manual). **V-B5 (reconciliation): `/operations` and `/operations/pools` have distinct, clearly-labelled purposes; no duplicate "Pipeline pool" naming; cross-links state what each surface is for; PK read-aloud — "which surface do I use for X?" — is unambiguous.** V-B6: `/operations/pools` renders byte-identically (untouched).

**Hard stops:** do not modify `/operations/pools` or the `notes` `pool_key` convention; do not break existing `fn_recent_cases` callers; do not introduce duplicate pool naming; `sql_destructive` D-01 + PK approval before the RPC migration; no batch / status-strip / pool-session in this slice; no production deploy without ef_deploy + PK approval.

**Rollback:** DROP the recreated `fn_recent_cases` overload / restore the prior signature; revert the `/operations` frontend to its Stage-F state; `/operations/pools` requires no rollback (untouched).

---

## 7. Status

cc-0015 progress: **Stage A APPLIED + verified · Stage F SHIPPED (live + CCB smoke PASS).** This brief (cc-0015b) unblocks **Stage B only** pending PK's §5 decisions. Stages C/D/E/G remain future. **cc-0015 is NOT complete.** Repair Board v0 is **NOT** superseded or changed by this brief.
