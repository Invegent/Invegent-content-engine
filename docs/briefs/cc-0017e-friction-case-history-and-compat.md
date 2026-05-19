# cc-0017e — Friction Case History + Mutation-Function History Writes + fn_triage_case Compatibility + Acknowledged Legacy Backfill + V-Z3 Convention

**Version:** v1.0 — AUTHORED-PENDING-APPLY
**Date authored:** 2026-05-19 Sydney evening (v2.88)
**Date applied:** PENDING
**Wave:** Wave 0e of Friction Register Consolidation Plan v1
**Predecessor:** cc-0017d (CLOSED-APPLIED-WITH-VCHECK-CORRECTION v2.86; v1.1 doc patch CLOSED v2.87 at commit `f0367405`)
**Plan gate:** 13 (next open gate after Wave 0d closed v2.86)
**Authoring agent:** Claude (chat)
**Author session:** v2.88

---

## 1. Scope

### IN (per PK directive v2.88)

| ID | Item | Rationale |
|---|---|---|
| **A** | Create `friction.case_history` shadow table | Audit-trail + event-replay foundation for the friction register; mirrors `friction.emission_rule_history` in-schema precedent |
| **C** | Patch `friction.fn_triage_case` compatibility path | Legacy function transitions `triage_state` without writing `triaged_at`/`triaged_by`; defensive prospective protection for external callers |
| **D** | Backfill 8 acknowledged legacy cases with `triaged_at`/`triaged_by` | 8 rows with `triage_state='acknowledged'`, `triaged_at IS NULL`, `triaged_by IS NULL`, `reviewed_at SET` — confirmed by probe P4 |
| **A-extended** | Patch all 5 cc-0017d mutation functions to INSERT into `friction.case_history` | `triage_case`, `resolve_case`, `reopen_case`, `mark_duplicate`, `record_first_view` — semantic-context history writes |
| **H** | Add V-Z3-style residue cross-check convention in `vchecks.md` | Codify the cross-check discipline that emerged from cc-0017d v1.1 Addendum recommendation |

### OUT / DEFER (per PK directive v2.88)

| ID | Item | Disposition |
|---|---|---|
| B | Operator-action audit events via `friction.emit_event` | DEFERRED — Wave 0f candidate |
| E | `fn_triage_case` deprecation / rename | DEFERRED — requires external-caller inventory first |
| F | Write-side CHECK enforcing open/resolved invariant | DEFERRED — requires invariant-formalisation gate |
| G | `emit_event` rule relaxation / test-mode bypass | DEFERRED — V-D-setup direct-INSERT fallback (cc-0017d v1.1 Drift 1) is sufficient for now |

### Hard scope guard (PK directive)

> "No production mutations. No apply_migration. No D-01 fire. No Wave 0f scope creep."

This brief is **AUTHORING ONLY**. Apply happens in a future session under PK directive with fresh D-01 fire and full preflight P-set discipline.

---

## 2. Empirical preconditions (probes v2.88)

All probes are read-only via `execute_sql`. No production mutations consumed v2.88. T-MCP-02 unchanged at ~85.

### P1 — friction.* table inventory (9 tables confirmed)

`case`, `category`, `emission_rule`, `emission_rule_history`, `emit_error`, `event`, `experiment_run`, `notification_policy`, `source`. **`emission_rule_history` is the in-schema shadow-table precedent** — `case_history` mirrors its shape.

### P1b — friction.case column inventory (28 columns)

Key columns for this brief:
- `triage_state text NOT NULL DEFAULT 'new'` — status column (NOT named `status`; PK's "acknowledged" maps to this column)
- `triaged_at timestamptz` (nullable, position 22)
- `triaged_by text` (nullable, position 23)
- `reviewed_at timestamptz` (nullable, position 17) — set by `fn_triage_case` on every call
- `resolved_at timestamptz` (nullable, position 20)

### P1b — emission_rule_history shape (template for case_history)

| col | type | nullable | default |
|---|---|---|---|
| history_id | uuid | NO | gen_random_uuid() |
| rule_id | uuid | NO | — |
| changed_at | timestamptz | NO | now() |
| changed_by | text | NO | — |
| change_kind | text | NO | — |
| before_row | jsonb | YES | — |
| after_row | jsonb | YES | — |

### P2 — friction function inventory (19 functions)

12 from cc-0017a/b/c + 6 from cc-0017d + 1 trigger function (`fn_emit_reconciliation_event`). All cc-0017d mutation functions use `friction."case"%ROWTYPE` (L-v2.86-c applied) and single-`%` RAISE EXCEPTION placeholders (L-v2.86-a applied).

**Two triage-writing functions co-exist:**
- `triage_case(p_case_id, p_action_decision, p_actor, p_effort_level, p_next_review_at)` — cc-0017d new; writes `triaged_at`/`triaged_by` via `COALESCE(c.triaged_at, now())` set-once idempotent
- `fn_triage_case(p_case_id, p_triage_state, p_category, p_quality_flag, p_capture_reason, p_capture_reason_note, p_action_decision, p_next_review_at, p_suppression_reason, p_notes)` — legacy 10-arg; sets `reviewed_at = now()` + `updated_at = now()` but **body never references `triaged_at` or `triaged_by`**

### P3 — fn_triage_case caller inventory (CORRECTED)

Initial probe found 1 reference: `friction.resolve_case`. **P6 body inspection reveals this is a HINT-string substring match, NOT an actual code path.** `resolve_case`'s HINT message reads: `'Re-triage via friction.triage_case or fn_triage_case first. For duplicate, prefer friction.mark_duplicate.'`

**Net: `fn_triage_case` has ZERO confirmed in-DB callers.** Item C compatibility patch rationale shifts from "co-exists with new mutation suite via in-suite call" to **"defensive prospective protection for external callers (Edge Functions, PostgREST RPC consumers, app code) outside SQL-probe visibility"**. Scope decision unchanged.

### P4 — triage_state distribution + NULL-triage breakdown

| triage_state | total | null triaged_at | null triaged_by | reviewed_at set |
|---|---|---|---|---|
| new | 21 | 21 | 21 | 0 |
| **acknowledged** | **8** | **8** | **8** | **8** |

Total = 29 cases (matches sync_state v2.87 baseline). Zero rows in any other state.

**Item D backfill target = exactly 8 rows.** Backfill source for `triaged_at`: `COALESCE(reviewed_at, updated_at)` — `reviewed_at` is set in all 8 targets so resolves to `reviewed_at` cleanly. Backfill sentinel for `triaged_by`: `'legacy_backfill'` (explicit, searchable, audit-friendly).

### P5b — trigger landscape on friction.case

| trigger | timing | event | function |
|---|---|---|---|
| friction_case_no_delete_during_run | BEFORE | DELETE | fn_prevent_delete_during_run |

**No UPDATE trigger on friction.case.** Clean canvas. friction.emission_rule also has zero triggers — `emission_rule_history` is populated by explicit INSERTs (presumably from rule-management RPC code), confirming that **in-function explicit INSERTs is the canonical pattern for shadow tables in friction.\***.

### P6 — cc-0017d mutation function body inspection

All 5 functions confirmed to use `friction."case"%ROWTYPE` for `v_current` (loaded via `SELECT ... FOR UPDATE`):

| function | triaged_at/by write pattern | needs history-INSERT patch? |
|---|---|---|
| triage_case | `COALESCE(c.triaged_at, now())` + `COALESCE(c.triaged_by, p_actor)` set-once idempotent | YES (`change_kind='triage'`) |
| resolve_case | Does NOT touch triaged_at/by; assumes prior triage_case call set them | YES (`change_kind='resolve'`) |
| reopen_case | Does NOT touch triaged_at/by | YES (`change_kind='reopen'`) |
| mark_duplicate | `COALESCE(c.triaged_at, now())` + `COALESCE(c.triaged_by, p_actor)` set-once idempotent | YES (`change_kind='mark_duplicate'`) |
| record_first_view | Does NOT touch triaged_at/by | YES (`change_kind='first_view'`) — only when first_viewed_at actually changes |

---

## 3. Design summary

### 3.1 case_history table (item A)

Mirrors emission_rule_history shape with `case_id` as the parent FK and a CHECK constraint on `change_kind`:

```
history_id   uuid PK gen_random_uuid()
case_id      uuid NN REFERENCES friction."case"(case_id) ON DELETE RESTRICT
changed_at   timestamptz NN DEFAULT now()
changed_by   text NN
change_kind  text NN
   CHECK IN ('triage', 'resolve', 'reopen', 'mark_duplicate', 'first_view',
             'compat_legacy_triage', 'backfill')
before_row   jsonb (nullable)
after_row    jsonb (nullable)
```

Index: `(case_id, changed_at DESC)` for per-case timeline queries.

**Grants (cc-0017c lockdown pattern):**
- `REVOKE ALL ON friction.case_history FROM PUBLIC, authenticated, anon`
- `GRANT SELECT ON friction.case_history TO service_role`
- No INSERT/UPDATE/DELETE grants — all writes via SECURITY DEFINER mutation functions

`ON DELETE RESTRICT` matches the friction.case DELETE-prevention trigger semantics (cases shouldn't be deleted; if they are, history shouldn't orphan).

### 3.2 cc-0017d mutation function patches (item A-extended)

Each of the 5 functions gets a single INSERT into `friction.case_history` immediately after the UPDATE, capturing `before_row = to_jsonb(v_current)` and `after_row = to_jsonb(v_after)` where `v_after` is loaded via a post-UPDATE re-fetch.

Pattern for each function:
```
-- existing: SELECT ... FOR UPDATE into v_current
-- existing: validation
-- existing: UPDATE friction.case ...
-- NEW: SELECT ... INTO v_after FROM friction.case WHERE case_id = p_case_id
-- NEW: INSERT INTO friction.case_history (case_id, changed_at, changed_by, change_kind, before_row, after_row)
--      VALUES (p_case_id, now(), p_actor, '<kind>', to_jsonb(v_current), to_jsonb(v_after))
-- existing: RETURN QUERY ...
```

**record_first_view special case:** only INSERT history when first_viewed_at actually changes (skip the early-return idempotent path where `was_already_viewed=true`).

**Signature preservation:** all 5 function signatures byte-stable across the patch (L-v2.85-a applied). RETURNS TABLE columns retain `out_` prefix (L-v2.86-b applied).

### 3.3 fn_triage_case compatibility patch (item C)

**Signature change:** add optional `p_actor text DEFAULT NULL` as a new (11th) argument. Default NULL is signature-compatible — existing positional/keyword callers unaffected.

**Body refactor:**
1. Load `v_current friction."case"%ROWTYPE` via `SELECT ... FOR UPDATE` (new — current body skips this).
2. Compute `v_new_triage_state := COALESCE(p_triage_state, v_current.triage_state)`.
3. UPDATE with:
   - All existing column writes preserved.
   - NEW: `triaged_at = CASE WHEN v_current.triage_state = 'new' AND v_new_triage_state != 'new' AND v_current.triaged_at IS NULL THEN now() ELSE v_current.triaged_at END`
   - NEW: `triaged_by = CASE WHEN v_current.triage_state = 'new' AND v_new_triage_state != 'new' AND v_current.triaged_by IS NULL THEN COALESCE(p_actor, current_user::text) ELSE v_current.triaged_by END`
4. Post-UPDATE: load `v_after`, INSERT into `case_history` with `change_kind='compat_legacy_triage'`.

**Transition gating logic:** triaged_at/by only set on first transition out of `'new'`, AND only when current values are NULL. Idempotent for already-triaged cases. Protects against accidental clobbering.

**Actor resolution:** if `p_actor IS NULL`, fall back to `current_user::text`. The session's database role becomes the audit trail of last resort.

### 3.4 Acknowledged legacy backfill (item D)

Single transactional CTE chain:

```
WITH before_state AS (
  SELECT to_jsonb(c.*) AS before_row, c.case_id
  FROM friction."case" c
  WHERE triage_state = 'acknowledged'
    AND triaged_at IS NULL
    AND triaged_by IS NULL
),
updated AS (
  UPDATE friction."case" c
  SET triaged_at = c.reviewed_at,
      triaged_by = 'legacy_backfill',
      updated_at = now()
  FROM before_state b
  WHERE c.case_id = b.case_id
  RETURNING c.case_id, to_jsonb(c.*) AS after_row
)
INSERT INTO friction.case_history
  (case_id, changed_at, changed_by, change_kind, before_row, after_row)
SELECT u.case_id, now(), 'cc-0017e-backfill', 'backfill', b.before_row, u.after_row
FROM updated u
JOIN before_state b ON b.case_id = u.case_id;
```

**Expected effect:** 8 rows updated in friction.case, 8 rows inserted into friction.case_history. Both counts verified at V-check time.

**Defensive guard:** WHERE predicate triple-pins (triage_state='acknowledged' AND triaged_at IS NULL AND triaged_by IS NULL) — re-runs are no-ops by construction.

**Audit signal:** `changed_by='cc-0017e-backfill'` distinguishes the migration-row from operational triage rows (`changed_by` = actor name).

### 3.5 V-Z3 convention codification (item H)

Codified in `cc-0017e/vchecks.md` Section X as the canonical statement, with reference-back from sync_state at apply close. **No new process doc created** — overhead not justified; define-where-used pattern preferred (per cc-0017d v1.1 Addendum recommendation).

**V-Z3 principle (codified):**

> Every brief introducing mutation functions OR shadow tables MUST include a V-Z residue cross-check section that verifies, post-apply, on the live database:
> 1. **V-Z1 (strict-prefix residue):** zero fixture-prefix rows remain in target tables (using brief-canonical fixture-naming convention — slash-prefix per cc-0017d v1.1 reaffirmation).
> 2. **V-Z2 (baseline count preservation):** all non-fixture baseline row counts in affected tables equal the pre-apply baseline (target tables + any related parent/child tables in FK relationships).
> 3. **V-Z3 (shadow-table operation alignment):** for briefs introducing or writing to a shadow table, the count of shadow-table rows added during V-D positive smoke equals the count of V-D positive operations exercised (e.g., if V-D exercises 5 triage_case + 3 resolve_case + 2 reopen_case calls, V-Z3 asserts case_history grew by exactly 10 rows from those operations, all with matching change_kind values).

**Why this matters (apply-time rationale):** V-Z3 is the operation-to-shadow alignment check. Without it, a function patch that silently fails to INSERT history (e.g., due to a CHECK constraint mismatch, a permissions gap, or an exception-swallowed code path) passes positive smoke tests but leaves the audit trail incomplete. V-Z3 forces this alignment to be measured rather than assumed.

---

## 4. Sub-file index

| File | Purpose |
|---|---|
| `cc-0017e-friction-case-history-and-compat.md` (this file) | Main brief — scope, preconditions, design summary, hard stops |
| `cc-0017e/migration-sql.md` | All DDL + DML ordered for apply; transactional-EXEC pre-validation harness per L-v2.86-a |
| `cc-0017e/vchecks.md` | V-A through V-Z V-check matrix; V-Z3 convention codification |
| `cc-0017e/risks-and-grants.md` | Grant matrix + risk register + lockdown verification approach |
| `cc-0017e/preflight-pset.md` | P1-P5 pre-apply discipline (Lesson 61 pattern) |
| `cc-0017e/hardstop-rollback.md` | Rollback plan + abort conditions |
| `cc-0017e/d01-postapply-deferred.md` | D-01 fire template for apply session (NOT fired at authoring) |
| `cc-0017e/lessons-metadata-changelog.md` | Lesson candidates + metadata table + v1.0 changelog |

---

## 5. Hard stops (apply-time, NOT this authoring session)

**This authoring session has 0 production mutations. The list below applies to the FUTURE apply session.**

1. **D-01 must fire** before any migration executes. Action type: `sql_destructive`. Proposal must reference this brief by commit SHA and enumerate the 5 function rewrites + 1 backfill statement + 1 DDL block.
2. **Pre-apply P-set** (preflight-pset.md) must run clean. Any P-check FAIL aborts.
3. **Transactional EXEC pre-validation harness** (per L-v2.86-a) must succeed on a marker `PERFORM` block before the real apply. Substitution-class drift caught here, not at apply.
4. **case_history must be created BEFORE any function patch is applied** — function patches reference the table; reverse ordering creates a "function created but table missing" window.
5. **Backfill must run AFTER all function patches are applied** — backfill INSERTs into case_history, which requires the table; but timing-wise it can run last to preserve a clean separation.
6. **If V-A1 byte-match fails on any function patch** at the proposed migration, ABORT before applying. Fix substitution-class drift first.
7. **V-Z3 must PASS strict** at close. If V-Z3 returns mismatched counts, the patch surface has a silent INSERT failure and apply is not closed-clean.

---

## 6. Lesson tie-ins (watching at apply time)

| Lesson | Status | Apply-time exercise expectation |
|---|---|---|
| L-v2.86-a (HIGH-SIGNAL) | candidate | EXERCISED — transactional EXEC pre-validation harness in migration-sql.md |
| L-v2.86-b | candidate | EXERCISED — out_-prefix preserved on cc-0017d mutation-fn RETURNS TABLE patches |
| L-v2.86-c | candidate | EXERCISED — friction."case"%ROWTYPE quoting preserved through patches |
| L-v2.85-a (HIGH-SIGNAL) | candidate | EXERCISED — function-signature probe done at authoring (P2 + P6) |
| L-v2.85-b | candidate | Path B-prime pattern available if substitution-class drift surfaces |
| L-v2.85-d | REALIZED | `friction.purge_test_case` available for V-D fixture cleanup |
| L-v2.85-e | applied | 3-commit split-commit pattern for brief authoring (this session) |
| L40 | baseline | m.chatgpt_review close-the-loop UPDATE at apply close |
| L41 | baseline | apply_migration NOT db push — friction schema is k.schema_registry-registered |
| L58 | baseline | Atomic close-the-loop at apply close |
| L62 | baseline | D-01 fire + close-the-loop semantics |

---

## 7. Dependencies & sequencing

**Apply prerequisites:**
- cc-0017d Wave 0d CLOSED-APPLIED-WITH-VCHECK-CORRECTION (v2.86) ✅
- cc-0017c lockdown applied (v2.85) ✅
- friction schema event_source_fk in place ✅
- service_role REVOKE on event+case for direct DML in place ✅

**Apply sequence:**
1. case_history DDL + grants (creates table)
2. fn_triage_case patch (refactored body + p_actor arg)
3. cc-0017d mutation function patches (5 functions, one per file or one combined block)
4. Acknowledged legacy backfill (single CTE statement, 8 rows expected)
5. COMMENT statements (table + functions + columns)
6. V-check matrix execution (V-A through V-Z)

**Sequence ordering rationale:** functions reference the table → table must exist first. Backfill writes to history → all function patches must be in place to maintain consistency in future (even though backfill itself bypasses functions and writes history directly via CTE).

**Wave 0e gates Wave 0f and beyond:**
- Wave 0f (operator-action audit events via emit_event) — depends on case_history being present and writeable
- Wave 7 (cc-0015 friction-pool-view) — still gated on 1-week observation window closing 2026-05-26; Wave 0e does not unblock it
- Wave 8 (cc-0016 friction-capture-evidence) — still gated on Wave 7

---

## 8. Authoring metadata

**Authoring session:** v2.88 (2026-05-19 Sydney evening)
**Authoring scope:** brief files only — 8 files total via 3 commits per L-v2.85-e mitigation
**Production mutations this session:** 0
**D-01 fires this session:** 0
**T-MCP-02 consumption this session:** 0 (read-only probes do not consume)
**Memory cap status:** 19/30 (no new edits this session)
**State-capture exceptions this session:** 0 (cumulative: 1 unchanged)

**Authoring commit map:**
- Commit 1 (this file): `create_or_update_file` for main brief
- Commit 2: `push_files` for migration-sql.md + vchecks.md + risks-and-grants.md + preflight-pset.md
- Commit 3: `push_files` for hardstop-rollback.md + d01-postapply-deferred.md + lessons-metadata-changelog.md

**Probes executed v2.88 (read-only):**
- P1: friction.* table inventory
- P1b: friction.case + emission_rule_history + emission_rule column inventory
- P2: friction.* function inventory with triage_write flag
- P3: fn_triage_case caller inventory (corrected by P6)
- P4: triage_state distribution + NULL-triage breakdown
- P5a: fn_triage_case body
- P5b: trigger landscape on friction.case + event + emission_rule
- P6: cc-0017d mutation function body inspection (5 functions)

---

## 9. Open design decisions surfaced at authoring (PK to override at D-01 or v1.1)

| # | Decision | Default chosen | Rationale | Override path |
|---|---|---|---|---|
| 1 | case_history change_kind enum | `{triage, resolve, reopen, mark_duplicate, first_view, compat_legacy_triage, backfill}` | Covers semantic surface + non-canonical paths; excludes 'create' (deferred — would require trigger or fn_promote_event_to_case patch) | v1.1 add 'create' kind + INSERT trigger if PK directs |
| 2 | fn_triage_case patch arg surface | Add `p_actor text DEFAULT NULL` (signature-compatible) | Optional 11th arg with NULL default doesn't break existing callers; falls back to current_user | v1.1 require p_actor (signature break) if PK directs |
| 3 | Patch transition condition | triaged_at/by set only on first 'new'→non-'new' AND when current value IS NULL | Matches cc-0017d set-once idempotent pattern; protects against clobber | v1.1 change to "any non-NULL transition" if PK directs |
| 4 | Backfill triaged_by sentinel | `'legacy_backfill'` | Explicit, searchable, audit-friendly; distinguishes from operational triage | v1.1 change to NULL or different sentinel if PK directs |
| 5 | Backfill triaged_at source | `COALESCE(reviewed_at, updated_at)` | Reviewed_at set in all 8 targets; resolves to reviewed_at cleanly; conservative human-touch timestamp | v1.1 use created_at instead if PK directs |
| 6 | Scope of mutation-function history writes | ALL 5 cc-0017d functions + fn_triage_case | Maximises audit completeness; cohesive Wave 0e scope | v1.1 narrow to subset if PK directs |
| 7 | V-Z3 convention codification location | In-brief at `cc-0017e/vchecks.md` Section X | Define-where-used; no new process doc; least-intrusive | v1.1 promote to `docs/process/` if PK directs |

---

## 10. Changelog

- **v1.0 (2026-05-19 Sydney evening v2.88):** Authored. 8-file multi-file brief following cc-0017a/b/c/d precedent. PK scope confirmed for items A, C, D, H + A-extended (5-function patch). Items B, E, F, G DEFERRED per PK directive. Empirical preconditions from 8 read-only probes. Apply pending; D-01 deferred per PK directive.
