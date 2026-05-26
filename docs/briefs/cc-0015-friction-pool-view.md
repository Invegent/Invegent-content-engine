# cc-0015 — Friction Register Pool View + Batch Resolution + Operator Surface Copy

**Brief ID:** cc-0015
**Version:** v1.0
**Status:** IN EXECUTION (v3.13, 2026-05-26; Stage A + Stage F + Stage B RPC + Stage B frontend all shipped — Stage C/D/E held). **Stage A APPLIED** (migration `cc_0015_a_pool_schema_additions` v`20260526110657`; plan_review D-01 `58d89efe` escalate→PK + PK approval phrase; V-A1–A4 PASS — `dashboard_ui` category active, `friction.pool_session` live with generated `duration_minutes`, grants authenticated=SELECT only / service_role=SELECT,INSERT,UPDATE, no CHECK on `cases_addressed`). **Stage F SHIPPED — merged + deployed to production (v3.12, 2026-05-26).** Copy V-F3-approved + de-experimented (no Day-19 / criterion-5 / raw-table-name); `components/friction-field-help.tsx` wired into the FAB (severity, category) + triage form (quality_flag, category, action_decision, next_review_at, capture_reason, capture_reason_note). **CCB visual V-F1/V-F2 PASS** on the preview (commit `f9d51a9`). FF-merged to dashboard `main` `f9d51a96ffb811b84bbbf39b42637d10e7037f6d`; typecheck clean (0 errors); **production deploy READY** (Vercel `dpl_FftxSjeBNyurxZetJedi3zDsan6b`, live at `dashboard.invegent.com`). Production liveness OK (/login 200, /operations 307→auth). **CCB production smoke PASS** (2026-05-26): FAB help visible, triage-row help visible, "What do the options mean?" expands, "Counts as prevented loss?" marker correct, no stale Day-19/criterion-5/incrementality-verdict/`friction.pool_session` copy, no visual issues, no missing help. **Stage F live + clean.**
**Stage B (RPC) APPLIED 2026-05-26 (COEXIST):** `friction.fn_recent_cases` extended with backward-compatible `p_categories`/`p_triage_states`/`p_action_decisions` filters (migration `cc_0015_b_fn_recent_cases_filters` v`20260526124005`; plan_review D-01 `58d89efe` + sql_destructive D-01 `17db8b27` + PK phrase; file backfilled to `supabase/migrations/`). Verified: V-B2 byte-identical no-filter equivalence (`fn_recent_cases(50)` == `(50,NULL,NULL,NULL)` == baseline n=44/md5 `af67c0ee…`); filters restrict with 0 leakage; single fn (no overload); return shape unchanged. **Stage B FRONTEND MERGED + DEPLOYED 2026-05-26 (v3.13):** filter bar + 5 PK-approved saved views + category-description hydration on `/operations` — built on dashboard prep branch `feat/cc-0015-stage-b-operations-filters` (commit `25bcdb7`); **CCB preview visual PASS** (V-B3 URL filters / V-B4 saved views / V-B5 Repair-Board-v0-untouched / V-B6 default byte-identical / stale-wording CLEAN); FF-merged to dashboard `main` `25bcdb75e79ff25047f15840037f5b22a13d7be9` (`tsc --noEmit` clean, `next build` exit 0); **production deploy READY** (Vercel `dpl_Hb2BkFnK3cL4cCAHXbkAz1tDnHjW`, live `dashboard.invegent.com`; liveness OK — `/operations` 307→`/login` 200, no 5xx; CCD did not do behind-auth visual — CCB did the preview visual). New files `pool-filter-bar.tsx` + `saved-views.tsx`; `page.tsx` searchParams parsing + `fetchActiveCategories()`; `friction-field-help.tsx` gained an optional `categoryDescriptions` prop (backward-compatible); `case-row.tsx` forwards it. Source filter + sort deferred; `/operations/pools` v0 untouched; Stage C/D/E excluded. **cc-0015 still NOT complete.** **Category per-option descriptions — now COMPLETE for `/operations` (v3.13):** the earlier v3.12 RE-SCOPE deferral is discharged on the triage form — live `friction.category.description` rows hydrate the category help via `fetchActiveCategories()`. (FAB hydration still deferred; the FAB has no `capture_reason` field — field absent, not omitted help.) **Stage B/C/D HELD pending a re-brief** reconciling this category-based pool view vs the shipped notes-based Pools/Repair-Board v0 (`/operations/pools`, commit `9a4b446`) — v0 NOT superseded. Stage A.5 backfill recategorisation = separate manual PK-confirmed step. *(Brief drift: line 10 "one new column on friction.case / no new tables" contradicts §3 which adds the `pool_session` table and no column — §3 authoritative. Stage F dict lives at `lib/friction-help-copy.ts` not `app/lib/` per repo `@/*`→root convention.)*

**Original status:** AUTHORED, PENDING_EXECUTION
**Authored:** 2026-05-16 Sydney
**Author:** Chat-side Claude with PK approval (session v2.76)
**Strategic anchor:** Extends cc-0014. Operationalises the register as a *pool consumed in concentrated sessions*, not a queue triaged one-at-a-time.
**Depends on:** cc-0014 complete + Day-19 verdict resolved (PASS or INVALID-EXTEND). Do not execute under FAIL verdict.
**Schema:** modifies `friction.*` (one new category row + one new column on `friction.case`). No new tables.

---

## 1. Purpose

cc-0014 built the friction register and proved one-at-a-time triage. cc-0015 makes the register usable as PK's actual weekly operational rhythm:

> "Instead of working in parts and parcel every week on certain days, we just pick up one item to fix with all the discovered cases and just work on them with a lot of concentration."

This brief operationalises *pooled resolution*: cases of the same category are batched, reviewed together in concentrated weekly sessions, and resolved as a coherent set rather than individually. The brief also fixes the surface copy gap exposed in cc-0014 (operator cannot triage correctly without remembered context from the brief).

---

## 2. Scope summary

### In scope

- **New category** `dashboard_ui` separate from `operator_friction` (justifies a Dashboard pool that is not tangled with general workflow pain)
- **Pool view UI** on `/operations` — category filter + triage_state filter + saved views ("Dashboard pool", "Reconciliation pool", "Pipeline pool", "All Track", "All New")
- **Batch select + batch resolve** — checkboxes on case rows, bulk action_decision via N single-case `fn_triage_case` calls
- **Pool dashboard widget** in status-strip — visible count per pool with click-through to filtered view
- **Pool session tracking** — new table `friction.pool_session` records what was reviewed when (empirical record of the pooling discipline)
- **Operator surface copy** — inline help text on FAB and triage form for `quality_flag`, `capture_reason`, `capture_reason_note`, `action_decision`, `severity`, `category`
- **Process doc** — `docs/process/ICE-PROC-002-pooled-resolution.md` codifying the weekly rhythm

### Out of scope

- AI clustering of cases (deferred)
- Auto-routing of cases to pools (manual categorisation only)
- Playbooks / action catalogue (separate future brief)
- Customer-facing pool surface (single-operator only)
- Attachment / evidence capture on FAB (separate brief cc-0016)

### Rejected from initial framing

- **One unified "everything" pool view** — rejected. Defeats the purpose. The concentration value comes from a *single category* of related issues being resolved together. Mixed pools recreate the per-case triage problem.
- **Auto-suggesting `action_decision=track` for non-critical cases** — rejected. Behavioural training is for the operator, not the system. Default-track via UI affordance, not auto-assignment.
- **Hard time-boxing of pool sessions** — rejected. Pooling is the structure; duration is operator judgement.

---

## 3. Stage A — Schema additions

### Pre-flight verification

```sql
-- New category code must not already exist
SELECT category_code FROM friction.category WHERE category_code = 'dashboard_ui';
-- Must return zero rows

-- pool_session table must not already exist
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'friction' AND table_name = 'pool_session';
-- Must return zero rows
```

### Migration

Migration name: `cc_0015_a_pool_schema_additions`.

```sql
-- Step 1: add dashboard_ui category
INSERT INTO friction.category (
  category_code, display_label, default_sla_hours, description, counts_for_success, is_active
) VALUES (
  'dashboard_ui',
  'Dashboard UI / UX',
  NULL,  -- not SLA-driven; batch-resolved on Dashboard pool cadence
  'Operations dashboard interface issue — layout, density, navigation, copy, visual bugs. Distinct from operator_friction which covers general workflow pain (e.g., wrong-default-behaviour outside the dashboard, missing affordances in other tools).',
  true,
  true
);

-- Step 2: pool_session table
CREATE TABLE friction.pool_session (
  pool_session_id    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_date       date NOT NULL DEFAULT current_date,
  pool_label         text NOT NULL,  -- 'dashboard_ui', 'reconciliation', 'pipeline_integrity', 'all_track', custom
  category_filter    text[],         -- which categories were in this pool
  triage_state_filter text[],        -- which triage states were included
  cases_reviewed     integer NOT NULL DEFAULT 0,
  cases_addressed    integer NOT NULL DEFAULT 0,  -- those whose action_decision changed away from 'track' or 'new'
  notes              text,
  started_at         timestamptz NOT NULL DEFAULT now(),
  ended_at           timestamptz,
  duration_minutes   integer GENERATED ALWAYS AS (
    CASE WHEN ended_at IS NOT NULL 
         THEN EXTRACT(EPOCH FROM (ended_at - started_at))::integer / 60
         ELSE NULL END
  ) STORED,
  created_at         timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX ON friction.pool_session (session_date DESC);
CREATE INDEX ON friction.pool_session (pool_label);

GRANT SELECT, INSERT, UPDATE ON friction.pool_session TO service_role;
GRANT SELECT ON friction.pool_session TO authenticated;
-- authenticated writes via SECURITY DEFINER function in Stage B
```

### Stage A.5 — Backfill recategorisation (manual, post-migration)

After migration applies, chat fires this diagnostic query:

```sql
-- Cases currently in operator_friction that look like dashboard_ui candidates
SELECT case_id, case_title, severity, triage_state, action_decision, first_seen_at
FROM friction.case
WHERE category = 'operator_friction'
  AND (
    case_title ILIKE '%dashboard%' OR
    case_title ILIKE '%overview%' OR
    case_title ILIKE '%layout%' OR
    case_title ILIKE '%spaced%' OR
    case_title ILIKE '%submenu%' OR
    case_title ILIKE '%row%' OR
    case_title ILIKE '%/operations%' OR
    case_title ILIKE '%/clients%' OR
    case_title ILIKE '%content-studio%'
  )
ORDER BY first_seen_at;
```

PK reviews list and confirms per case. Recategorisation UPDATEs via `fn_triage_case` with `p_category := 'dashboard_ui'` per confirmed case_id.

### V-checks for Stage A

V-A1 — new category exists and is active. V-A2 — pool_session table exists with expected shape. V-A3 — grants verification (authenticated SELECT, no INSERT). V-A4 — no CHECK on cases_addressed (intentional).

### Hard-stop conditions

Migration fails, V-A1/V-A2 wrong shape, V-A3 overpermission.

### Rollback path

```sql
DROP TABLE IF EXISTS friction.pool_session;
DELETE FROM friction.category WHERE category_code = 'dashboard_ui';
```

---

## 4. Stage B — Pool view UI on /operations

### Scope

`/operations` gains: filter bar (category multi-select, triage_state multi-select, source multi-select, URL-params-driven), saved views dropdown (5 pre-configured pools), sort options, case count badge.

### Backend additions

Migration name: `cc_0015_b_pool_view_rpc`.

Extend `friction.fn_recent_cases` with `p_categories text[]`, `p_triage_states text[]`, `p_sources text[]`, `p_sort_by text` parameters. RPC returns case rows joined with category display_label and source_list aggregated from underlying events.

### Frontend

- `app/operations/page.tsx` — server-side URL param parsing, passes to RPC
- `app/operations/PoolFilterBar.tsx` — client component, multi-select dropdowns + saved views menu, updates URL via shallow routing
- `app/operations/CaseRow.tsx` — adds source badges
- `app/operations/SavedViews.tsx` — 5 hardcoded saved-view configs

### V-checks for Stage B

V-B1 — RPC accepts new params + returns expected shape. V-B2 — empty filter returns all (backward compatible). V-B3 — frontend filter bar updates URL + reloads (manual). V-B4 — saved view links produce expected filtered lists (manual).

### Hard-stop conditions

RPC fails, V-B1/V-B2 fail, URL bookmarkability breaks.

### Rollback path

DROP overload, restore prior signature. Frontend reverts to cc-0014 single-list shape.

---

## 5. Stage C — Batch resolution

### Scope

Pool view gains: checkbox column, batch action bar (sticky, appears when ≥1 selected), confirmation modal, per-case execution loop calling `fn_triage_case` once per case. Failures collected and shown; no all-or-nothing semantics.

### No new backend function

Intentional — uses existing `fn_triage_case` per case. Keeps audit trail per-case.

### Frontend

`app/operations/BatchActionBar.tsx`, `app/operations/BatchConfirmModal.tsx`.

### V-checks for Stage C

V-C1 — manual test, select 3, batch-resolve, verify all 3 update. V-C2 — partial failure, others succeed. V-C3 — concurrent edit safety (no UI desync).

### Hard-stop conditions

UI lacks confirmation step, V-C1 fails, V-C2 breaks good cases.

### Rollback path

Remove component imports. Backend unchanged.

---

## 6. Stage D — Pool dashboard widget

### Scope

Status strip gains pool counts per saved view. Each clickable to filtered /operations.

Example state: `● Dashboard pool: 7 ● Reconciliation pool: 0 ● Pipeline pool: 3`

### Backend addition

`friction.fn_pool_counts()` returns `(pool_label, case_count, oldest_first_seen_at)` for 5 pools.

### V-checks for Stage D

V-D1 — RPC returns expected shape, 5 rows. V-D2 — synthetic case → strip shows count → click-through filter matches.

### Hard-stop conditions

RPC fails, click-through filter doesn't match count.

### Rollback path

DROP function. Revert status strip.

---

## 7. Stage E — Pool session tracking

### Scope

Light-touch table records when a pool review session happens. Operator-initiated.

### Backend additions

`fn_start_pool_session(pool_label, category_filter, triage_state_filter)` returns uuid.
`fn_end_pool_session(session_id, cases_reviewed, cases_addressed, notes)` returns uuid.

### Frontend

"Start pool session" / "End session" buttons on pool views. Banner during session.

### V-checks for Stage E

V-E1 — start + end round trip. V-E2 — empirical sanity after first real pool session.

### Hard-stop conditions

RPCs fail, duration_minutes generated column doesn't compute.

### Rollback path

DROP functions + DROP TABLE pool_session.

---

## 8. Stage F — Operator surface copy

### Scope

The gap exposed in cc-0014: a future operator (or future-PK with no session context) cannot triage correctly without remembered context from the brief. Every field with a non-obvious option set gets inline help.

### What needs explanation

#### 8.1 — `severity`

Same surface on FAB + triage form.

| Option | Help text |
|---|---|
| `info` | "Worth noting. No urgency. Will get reviewed in normal pool cadence." |
| `warn` | "Pay attention. Likely needs action in days, not weeks. Pool review still acceptable." |
| `critical` | "Blocking now. Client commitment at risk OR pipeline failure. Triage immediately, do not pool." |

Form copy guidance: "Default `info`. Reserve `warn` for things you'd raise in a weekly review; reserve `critical` for things you'd interrupt other work to fix."

#### 8.2 — `category`

Surface `friction.category.description` as helper text under each dropdown option. For `unclassified`: append "(triage placeholder — must be reclassified before this case can count as quality)".

#### 8.3 — `quality_flag` (triage form only)

> **Quality flag** — Mark **TRUE** only if you'd want to act on this a week from now. **FALSE** = noise, transient, duplicate of something already known, or filed-in-error. Leave **unset** if unsure. Quality reviews count only TRUE cases — but truthfulness matters more than the count. A FALSE mark is a legitimate triage outcome.

Display rule: field disabled while `category = 'unclassified'` with tooltip "Reclassify the category first."

#### 8.4 — `capture_reason` (both surfaces — the big one)

| Option | Help text | Counts as prevented loss? |
|---|---|---|
| `missed_without_register` | "Without filing this, the issue would have been **forgotten entirely**. Not just delayed — lost." | ✅ Counts |
| `would_have_deferred` | "Without filing this, you'd have **noted it mentally and acted later, less effectively**, or in a less considered way." | ✅ Counts |
| `would_have_rediscovered` | "Without filing this, you'd have **encountered the same issue again** at the next workflow touch — wasting time re-noticing it." | ✅ Counts |
| `centralized_context` | "Filing this **alongside related cases** improves future judgement, even if you'd have remembered the case alone." | Does not count |
| `routine_log` | "Filing this as part of a **disciplined sweep**, not because it would otherwise be lost or rediscovered." | Does not count |
| `other` | "None of the above applies. Required to provide a note explaining." | Does not count |

Form copy guidance directly above the dropdown:

> **Capture reason** — In hindsight, what would have happened to this issue without the register? Pick the option closest to that counterfactual. The first three options indicate the register *prevented* something — these are the ones that count as prevented loss (the register's value).

#### 8.5 — `capture_reason_note`

Required when capture_reason is one of first three values (CHECK constraint enforces). Help:

> **Note** — In one sentence: what specifically would have happened (or been lost) if you hadn't filed this case?

Cycled placeholder examples in the textarea.

For non-incremental capture_reasons: optional, placeholder "Optional note — context if useful."

#### 8.6 — `action_decision` (triage form only)

| Option | Help text |
|---|---|
| `act_now` | "**Fix this session.** Reserved for blocking issues or genuine quick wins. Default away from this — `track` is usually better." |
| `track` | "**Pool with similar cases for batched resolution.** The default for non-blocking issues. Will surface on the next pool review session of the matching category." |
| `defer_intentionally` | "**Park this case with a forced review date.** Use when the case is real but the right time to fix is later." |
| `suppress` | "**Don't surface this category of case again until X.** Requires a reason. Use sparingly — usually `track` is the right answer, not suppression." |
| `incremental` | "**This feeds a future bigger improvement** rather than warranting standalone action. Requires a note explaining what bigger improvement it feeds." |
| `ignore` | "**False alarm or duplicate of a known issue.** Will not count toward action verdict." |
| `duplicate` | "**Same problem as another open case.** Use the related-object field to link." |

Form copy guidance above the dropdown:

> **Action decision** — `track` is the default. Pick `act_now` only if leaving this for a week would harm something. Pick `defer_intentionally` if you have a specific later date. Pick `suppress`, `incremental`, `ignore`, or `duplicate` only with the corresponding required field filled.

#### 8.7 — `next_review_at`

Required when action_decision in (track, defer_intentionally). Quick-pick buttons: "1 week", "2 weeks", "1 month", "Custom".

Help: "When should this case resurface? `track` defaults to next pool session (usually 1 week)."

#### 8.8 — Pool session help

> **Pool sessions** are concentrated reviews of related cases. Start a session, work through the filtered cases together, end the session when done. Sessions are saved to the pool-session log for later review of the cadence.

### Frontend implementation pattern

Single `FrictionFieldHelp` component + single source-of-truth dict at `app/lib/friction-help-copy.ts`. Imported by both FAB form and triage form. Surface copy never duplicated.

### V-checks for Stage F

V-F1 — open FAB, every field has visible help / tooltip matching dict. V-F2 — open triage form, all editable fields have matching help, dropdowns show per-option descriptions. V-F3 — PK reads each help text aloud, confirms actionable without external context.

### Hard-stop conditions

Any field lacks help, dict diverges from this brief, V-F3 fails read-aloud test.

### Rollback path

Remove component imports. Help text disappears; forms still functional.

---

## 9. Stage G — Process documentation

### File

`docs/process/ICE-PROC-002-pooled-resolution.md`.

### Required sections

1. Why pooling (concentration > context-switching).
2. Triage defaults (`track` default, `act_now` reserved, explicit list of when `act_now` is correct).
3. Pool cadence (Friday 0900 Sydney; Dashboard weekly, Reconciliation weekly if ≥3 else biweekly, Pipeline triggered by critical).
4. Pool session protocol (filter, start, work, end with notes, batch-resolve).
5. Suppression discipline (when `suppress` vs `track`).
6. Anti-patterns (fixing in the moment when triaging, one-by-one outside sessions, newest-first bias).
7. Review (first pool session review at session+4 weeks).

### V-checks for Stage G

V-G1 — PK reads draft, approves. V-G2 — Doc committed. V-G3 — Linked from docs/00_docs_index.md.

---

## 10. Stage sequencing rollback matrix

| Failed stage | Keep prior? | Roll back what? | Can cc-0015 proceed? |
|---|---|---|---|
| Stage A | n/a | DROP table + DELETE category | No — no schema |
| Stage B | Yes (A) | DROP overload, restore prior | Could ship A only, B is core value |
| Stage C | Yes (A, B) | Remove BatchActionBar | Pool view works, batch is manual |
| Stage D | Yes (A-C) | DROP fn_pool_counts | Pool view works without strip counts |
| Stage E | Yes (A-D) | DROP fns + table | Pool view + batch work without session tracking |
| Stage F | Yes (A-E) | Remove help surfaces | Critical — surface copy was the original ask |
| Stage G | Yes (A-F) | None — doc-only | Process not codified |

**Stage F is the highest-value piece of cc-0015** because it addresses the immediate operability gap. Stages A-E are the technical surface. Stage G is the durable artefact.

---

## 11. D-01 framing

Fire one D-01 before Stage A. Questions:

1. Does this stay inside v0.4 strategic boundaries from cc-0014 (no clustering, no playbooks, no autonomy)?
2. Is `dashboard_ui` a legitimate split of `operator_friction`, or a redundant subdivision?
3. Does Stage F surface copy address cc-0014's first-week empirical pattern (PK selected `routine_log` for a `would_have_rediscovered` case)?
4. Is per-case batch resolution (Stage C) sufficient, or does it need a batch RPC for audit reasons?
5. Is pool_session over-engineered for current scale? Could a simpler audit log suffice?
6. Are pool counts on the status strip noise vs signal at current scale (≤10 cases per pool)?
7. Is ICE-PROC-002 the right level of formality?

---

## 12. Post-cc-0015 commitments

### Pass path

Unlocks routine weekly pool sessions (operational state, not brief work) and ICE-PROC-002 as reference doc.

Does not unlock: AI clustering, autonomy/brief runner, customer-facing pool surface.

### Fail path

Roll back per matrix. Existing cc-0014 register continues working unchanged. cc-0015 is additive.

---

## 13. Open decisions deferred to stage execution

1. Pool session UI placement — separate page or inline? Recommend inline.
2. quality_flag auto-set on triage when category real + action_decision set? Recommend NO (explicit operator judgement).
3. `dashboard_ui` cases auto-suggest `track`? Recommend YES via UI default selection.
4. Status strip display oldest-age alongside count? Recommend YES once pool_session populated.

---

## 14. Estimated effort

- Stage A: 30 min schema + 1 hour backfill review
- Stage B: 2-3 hours frontend + 30 min RPC
- Stage C: 2 hours frontend
- Stage D: 1 hour frontend + 15 min RPC
- Stage E: 45 min backend + 1 hour frontend
- Stage F: 2-3 hours frontend + ~1 hour copy review
- Stage G: 1-2 hours doc authoring + review

**Total: ~12-15 hours focused work over ~3 sessions.** Recommended split: schema + pool view in session 1, batch + widget in session 2, copy + doc in session 3.

---

*Brief cc-0015 v1.0. Authored 2026-05-16. Status: PENDING_EXECUTION. Awaiting cc-0014 Day-19 verdict resolution before execution.*
