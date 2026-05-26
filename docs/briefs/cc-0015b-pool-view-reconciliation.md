# cc-0015b — Pool-view reconciliation: category pools (cc-0015) ⟷ Repair Board v0

**Brief ID:** cc-0015b (reconciliation re-brief for cc-0015 Stage B)
**Version:** v1.0
**Status:** **EXECUTED (v3.13, 2026-05-26).** PK §5 decisions applied (COEXIST). Stage B RPC applied + verified; Stage B frontend (§8 package) built, CCB-preview-validated, merged to dashboard `main` `25bcdb7`, and deployed to production (`dpl_Hb2BkFnK3cL4cCAHXbkAz1tDnHjW`, `dashboard.invegent.com`). Repair Board v0 untouched (V-B5). **Stage A.5 recategorisation APPLIED + verified (v3.13.1)** — 3 cases moved `operator_friction`→`dashboard_ui` (mig `20260526222125`; D-01 `bbe9a0fa`; `41576f8`). cc-0015 NOT complete (Stage C/D/E still open).
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

cc-0015 progress: **Stage A APPLIED + verified · Stage A.5 recategorisation APPLIED + verified (v3.13.1) · Stage F SHIPPED (live + CCB smoke PASS) · Stage B RPC APPLIED + verified · Stage B FRONTEND MERGED + DEPLOYED (v3.13, 2026-05-26).** Stage B frontend (filter bar + 5 saved views + category-description hydration on `/operations`) was built on dashboard prep branch `feat/cc-0015-stage-b-operations-filters` (`25bcdb7`), passed CCB preview visual (V-B3/V-B4/V-B5/V-B6 PASS; stale-wording CLEAN), FF-merged to dashboard `main` `25bcdb7`, and is live in production (Vercel `dpl_Hb2BkFnK3cL4cCAHXbkAz1tDnHjW`, `dashboard.invegent.com`; liveness OK). This brief's §8 execution package is now **EXECUTED** (COEXIST model). Stage A.5 recategorisation **applied + verified** (mig `20260526222125`; 3 cases `operator_friction`→`dashboard_ui`; `41576f8`). Stages C/D/E/G remain future; source filter + sort deferred. **cc-0015 is NOT complete.** Repair Board v0 is **NOT** superseded or changed — verified untouched (V-B5).

---

## 8. Stage B execution package (concrete — PK §5 decisions applied; EXECUTED v3.13)

**Model:** COEXIST (PK 2026-05-26). `/operations/pools` Repair Board v0 **untouched**. Stage B = `/operations` filter + saved-view enhancement. **Excludes** Stage C (batch), Stage D (status-strip counts), Stage E (pool-session UI), and any v0 change. **STATUS: EXECUTED** — RPC applied (mig `cc_0015_b_fn_recent_cases_filters` v`20260526124005`); frontend merged to dashboard `main` `25bcdb7` + deployed (`dpl_Hb2BkFnK3cL4cCAHXbkAz1tDnHjW`); CCB preview V-B3/V-B4/V-B5/V-B6 PASS.

### 8.1 Backend — `fn_recent_cases` extension (prepared artifact)
`docs/briefs/results/cc-0015-stage-b-fn-recent-cases.sql` — DROP+CREATE `friction.fn_recent_cases` adding `p_categories text[]`, `p_triage_states text[]`, `p_action_decisions text[]` (all DEFAULT NULL). **Return shape UNCHANGED.** Backward-compatible: NULL filters → byte-identical to current; verified **0 in-DB callers** (DROP safe). **Source filter + sort DEFERRED** (PK §6). `sql_destructive` D-01 at apply.

### 8.2 Saved-view predicates (PK §4 names → predicates)
| Saved view | Predicate |
|---|---|
| Dashboard UI | `category ∈ {dashboard_ui}` |
| **Register reconciliation** | `category ∈ {client_commitment}` — ⚠️ **PK CONFIRM:** the reconciliation emitter writes `category='client_commitment'`, so this captures reconciliation-sourced cases **plus** any manually-filed client_commitment. A source-precise filter (`reported_by='system'`) needs the **deferred** source dimension. **Decide:** accept the `client_commitment` proxy now, or defer this saved view until the source filter exists? |
| Pipeline/friction cases | `category ∈ {pipeline_integrity}` |
| All tracked | `action_decision ∈ {track}` |
| New/untriaged | `triage_state ∈ {new}` |

### 8.3 Frontend files (`/operations` only)
- `app/(dashboard)/operations/page.tsx` — parse URL params → pass arrays to `fn_recent_cases`; NEW read-only `friction.category` fetch (code/label/description/is_active) for category help; **preserve** cc-0016 evidence signing + the 2026-05-23 usability hydration + Stage F help.
- `app/(dashboard)/operations/pool-filter-bar.tsx` *(NEW)* — category + triage_state + action_decision multi-selects + saved-views menu; URL shallow routing.
- `app/(dashboard)/operations/saved-views.tsx` *(NEW)* — the 5 renamed configs (§8.2).
- `components/friction-field-help.tsx` — extend the `category` field to render per-option `friction.category.description` from the hydrated map (folds in the §8.2 category-description follow-up; additive optional prop).
- **NOT touched:** `pools/page.tsx`, `pool-card.tsx`, `friction-fab.tsx`, `friction-form.tsx`.

### 8.4 URL param scheme (bookmarkable)
`/operations?category=dashboard_ui,pipeline_integrity&triage=new&action=track` — comma-separated; absent/empty = no filter (= current `/operations`). Saved views set these.

### 8.5 Category-description hydration
Server-fetch `friction.category` once in `page.tsx` → pass `{code → {label, description}}` into `FrictionFieldHelp`; the category field's per-option help shows the live description. Read-only; no `fn_recent_cases` shape change.

### 8.6 V-checks
V-B1 RPC accepts new params + 12-col shape · V-B2 `fn_recent_cases(50)` == `(50,NULL,NULL,NULL)` (byte-identical = backward-compat) · V-B3 filter bar updates URL + reloads (manual) · V-B4 each saved view → expected list (manual) · **V-B5** distinct labelled purposes, no "Pipeline pool" collision, cross-links explain each surface (PK read-aloud) · **V-B6** `/operations/pools` renders unchanged.

### 8.7 Rollback
`DROP FUNCTION friction.fn_recent_cases(integer, text[], text[], text[])` + re-CREATE the prior single-arg definition (verbatim below); revert `/operations` frontend to its Stage-F state; `/operations/pools` untouched.

Prior `fn_recent_cases(integer)` (rollback source-of-truth):
```sql
CREATE OR REPLACE FUNCTION friction.fn_recent_cases(p_limit integer DEFAULT 50)
 RETURNS TABLE(case_id uuid, case_title text, first_seen_at timestamptz, last_seen_at timestamptz, event_count integer, severity text, category text, triage_state text, quality_flag boolean, action_decision text, next_review_at timestamptz, notes text)
 LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'friction','public'
AS $function$
  SELECT case_id, case_title, first_seen_at, last_seen_at, event_count, severity, category, triage_state, quality_flag, action_decision, next_review_at, notes
  FROM friction.case
  ORDER BY CASE severity WHEN 'critical' THEN 1 WHEN 'warn' THEN 2 ELSE 3 END,
           CASE triage_state WHEN 'new' THEN 1 WHEN 'acknowledged' THEN 2 ELSE 3 END,
           last_seen_at DESC
  LIMIT p_limit;
$function$;
```
