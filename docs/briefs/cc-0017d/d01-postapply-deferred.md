# cc-0017d — §6 D-01 framing + §7 Post-apply commitments + §8 Deferred items

**Part of:** [`cc-0017d-friction-case-mutation-functions.md`](../cc-0017d-friction-case-mutation-functions.md)
**Prev:** [`hardstop-rollback.md`](hardstop-rollback.md) **Next:** [`lessons-metadata-changelog.md`](lessons-metadata-changelog.md)

---

## §6 D-01 framing

Fire via `ask_chatgpt_review` MCP with `action_type='plan_review'` before apply_migration.

### `proposal` (prose, single string)

> Apply cc-0017d v1.0 to friction schema in Supabase `mbkmaxqhsohbtwsqolns`. Migration `cc_0017d_friction_case_mutation_functions` adds 6 SECURITY DEFINER plpgsql functions (postgres-owned, search_path=friction,public) to `friction` schema: `triage_case`, `resolve_case`, `reopen_case`, `mark_duplicate`, `record_first_view`, `purge_test_case`. All functions are inert until callers wire them. No table DDL, no schema changes, no behaviour changes to existing code paths. Grants: functions 1-5 → service_role + authenticated EXECUTE; function 6 → service_role only. REVOKE EXECUTE FROM PUBLIC on all 6. Required because cc-0017c REVOKE lockdown reduced service_role privileges on friction.case to SELECT-only, blocking all current operator-mutation paths. Wave 0d unblocks Wave 7 (cc-0015 pool-view) and Wave 8 (cc-0016 capture-evidence). Brief authored from empirical probes (P-α through P-ζ) on 2026-05-19; 23 V-checks defined; rollback is clean DROP FUNCTION x6.

### `context` (structured)

```json
{
  "brief_files": [
    "docs/briefs/cc-0017d-friction-case-mutation-functions.md (main)",
    "docs/briefs/cc-0017d/risks-and-grants.md",
    "docs/briefs/cc-0017d/preflight-pset.md",
    "docs/briefs/cc-0017d/migration-sql.md",
    "docs/briefs/cc-0017d/vchecks.md",
    "docs/briefs/cc-0017d/hardstop-rollback.md",
    "docs/briefs/cc-0017d/d01-postapply-deferred.md (this file)",
    "docs/briefs/cc-0017d/lessons-metadata-changelog.md"
  ],
  "depends_on": ["cc-0017a (CLOSED-APPLIED)", "cc-0017b (CLOSED-APPLIED + corrective v1.1)", "cc-0017c (CLOSED-APPLIED + V-check correction)"],
  "empirical_probes_run": "P-α through P-ζ executed 2026-05-19; results captured in main file §1.1",
  "key_findings": {
    "fn_triage_case_status": "SECDEF + postgres-owned, survives lockdown; left untouched in Wave 0d",
    "naming_collisions": "zero on all 6 proposed names",
    "lifecycle_baseline": "29 cases, 0 resolved, 8 triaged via fn_triage_case, 0 first_viewed",
    "emit_event_grants": "service_role + authenticated + postgres (template for functions 1-5)"
  },
  "scope_decisions": {
    "triage_case_rejects_closure_class": "suppress/ignore/duplicate routed to resolve_case/mark_duplicate",
    "resolve_case_strict_mapping": "resolution_kind must match action_decision; mismatch raises with hint",
    "reopen_case_bypasses_14_day_window": "operator override; emit_event auto-reopen unchanged",
    "mark_duplicate_cross_fingerprint": "allowed with friction.emit_error audit log (CROSS-FINGERPRINT-DUPLICATE)",
    "purge_test_case_regex": "^cc-[0-9]{4}[a-z]?-test/ ; service_role EXECUTE only",
    "triaged_at_first_only": "set on first triage per Amendment C; backfill of 8 existing cases deferred"
  },
  "v_check_count": 23,
  "rollback": "DROP FUNCTION x6 + manual fixture cleanup if partial V-D run; clean reversal, no compensating state",
  "1_week_observation_window_active": "2026-05-19 to 2026-05-26; Wave 7/8 gated on Wave 0d apply + window close"
}
```

### Required ChatGPT review fields

| Field | Value |
|---|---|
| `decision_under_review` | "Apply cc-0017d v1.0 friction case mutation functions migration to production" |
| `production_action_if_approved` | "apply_migration cc_0017d_friction_case_mutation_functions to Supabase mbkmaxqhsohbtwsqolns; then execute 23 V-checks via execute_sql; if all pass, close-the-loop UPDATE m.chatgpt_review + 4-way sync to v2.86" |
| `consequence_if_delayed` | "Wave 7 (cc-0015 friction-pool-view) and Wave 8 (cc-0016 friction-capture-evidence) remain blocked. /operations UI cannot mutate cases beyond legacy fn_triage_case. Manual case resolution requires `apply_migration` per-row (not sustainable). 21 untriaged cases continue accumulating from cron 85/86 daily." |
| `cost_of_waiting` | "1 day delay = ~5 additional accumulated cases without resolution path. Wave 7 launch (post-2026-05-26 observation window close) slips proportionally." |
| `current_evidence` | "Empirical probes P-α through P-ζ ran 2026-05-19 confirming: fn_triage_case survives lockdown; CHECK domains documented; 0 naming collisions; emit_event grant pattern confirmed; lifecycle baseline captured. 23 V-checks defined including signature drift detection (V-A1) per L-v2.85-a. Clean DROP FUNCTION rollback. Migration is function-only-additive (zero table DDL). All 6 functions are inert until callers wire them." |
| `known_weak_evidence` | "(a) friction.triage_case duplicates partial fn_triage_case scope — operational debt until Wave 0e deprecation. (b) 8 existing acknowledged cases have triaged_at=NULL; Wave 0d won't backfill them (Wave 0e or never). (c) resolve_case strict mapping rejects legitimate cross-paths (operator triaged 'track' but wants to suppress); workaround requires re-triage via fn_triage_case. (d) mark_duplicate cross-fingerprint audit row only goes to emit_error — no dashboard surface yet. (e) Test fixtures use emit_event under authenticated context; small race window if cron 85/86 fires during V-D seed." |
| `default_action` | "If escalate=true: separate type-b (genuine new evidence) from type-c (echo of self-disclosed weak evidence). For type-b → Path A: address objection in v1.1 brief patch, re-fire D-01. For type-c → Path A: satisfy corrected action, re-fire. Do NOT use state-capture override without PK explicit approval (counter cum 1 already)." |

---

## §7 Post-apply commitments

On successful apply + all V-checks pass:

### G4 close-the-loop sequence (atomic, single session)

1. **Update m.chatgpt_review** for the D-01 review row: set `terminal_status='resolved'`, `action_taken='Applied cc_0017d_friction_case_mutation_functions; 23/23 V-checks passed; 0 hard-stops fired; functions inert pending caller wire-up in Wave 7/8'`, `resolved_at=now()`, `resolved_by='cc-0017d-close'`.

2. **Append session detail file:** `docs/runtime/sessions/2026-05-19-cc-0017d-apply.md` (assuming same Sydney day; else next day's slug). Include: apply timestamp, V-check pass/fail summary, lessons reified, deferred items remaining.

3. **Update `docs/00_sync_state.md`:** bump version to v2.86, add session pointer, update Wave 0d status from `AUTHORED_PENDING_D01` to `CLOSED-APPLIED`. Mark Wave 7/8 status: `UNBLOCKED_BY_WAVE_0D` (observation window still gating).

4. **Update `docs/00_action_list.md`:** move cc-0017d from Active → Removed (closed). Promote cc-0015 (Wave 7) + cc-0016 (Wave 8) from Blocked → Ready, with note "1-week observation window closes 2026-05-26; defer authoring until then OR run parallel-eligible if PK directs."

5. **Update `app/(dashboard)/roadmap/page.tsx` PHASES carry:** decision deferred (39th consecutive deferral) unless V-checks revealed something PHASES-relevant. Update `lastUpdated` regardless.

6. **Commit all 4-way sync edits in a single push_files atomic commit** (4 files: sync_state + action_list + session detail + roadmap page) labelled `cc-0017d v2.86 4-way sync close`.

### G4 timing target

< 30 minutes from V-Z1 pass to 4-way sync commit. Session does not close until commit is verified via `get_commit`.

### Standing carries to register at G4 close

- 22 close-the-loop UPDATEs outstanding (this brief's UPDATE makes it 23; close on apply makes net = 22)
- Dashboard PHASES 38th deferral → 39th
- cc-0017c v1.2 doc patch (P3 standing)
- vchecks.md V-B4 doc patch (P3 standing)
- L-v2.83-a STRONG promotion candidate (6+ occurrences threshold; counter advances)
- L-v2.85-a/b/c/d/e candidates → reify based on Wave 0d outcomes:
  - L-v2.85-a (HIGH-SIGNAL signature drift check) — applied via V-A1; promote to STRONG if V-A1 detects any drift
  - L-v2.85-d (purge_test_case helper) — realised; remove from candidate list, register as L-v2.85-d-CONFIRMED
  - L-v2.85-e (compact payloads / multi-file commits) — applied via brief structure; stays candidate (only one realisation)
- T-MCP-02 cum 76 → +N (count execute_sql calls during V-checks)
- state-capture exceptions cum 1 (do NOT increment unless used)

---

## §8 Deferred items (documented for future waves)

### §8.1 Wave 0e candidates (next wave on friction track)

- **`fn_triage_case` deprecation / rename:** Decide whether to (a) keep as legacy parallel path, (b) rewrite body to wrap `friction.triage_case`, or (c) drop after dashboard FAB migrates. Requires UI inventory of callers.
- **Triaged_at backfill for 8 acknowledged cases:** SQL `UPDATE friction.case SET triaged_at = reviewed_at, triaged_by = 'pk-historical' WHERE action_decision IS NOT NULL AND triaged_at IS NULL AND reviewed_at IS NOT NULL;`. Cosmetic, not blocking.
- **Audit history shadow tables (`friction.case_history`):** before/after JSONB snapshots on each mutation. Designed to support post-mortem queries like "show me every state change on case X".
- **`p_notes` parameter persistence** in Wave 0d functions: currently discarded in v1 (signature accepts but does not write). Wave 0e adds shadow row carrying free-form note + actor + timestamp.
- **Operator-action audit emit_event:** every Wave 0d mutation also emits a `friction.emit_event` of source='operator_action', condition_key=`<function>_called`. Builds operator-activity stream.
- **`fn_triage_case` patch to set `triaged_at` + `triaged_by`** on first action_decision set (closes Amendment C gap for legacy path).
- **Write-side CHECK enforcing "open iff resolved_at IS NULL"** — deferred from Wave 0c per `cc-0017c/risks-and-grants.md`.

### §8.2 Wave 0d known gaps (accepted in v1)

- Functions 1-5 do NOT emit `friction.emit_event` audit rows for their own mutations (Wave 0e §8.1).
- `p_actor` only persists to `triaged_by` on first triage; subsequent triages by different actors are not recorded per-mutation (Wave 0e shadow tables).
- `resolve_case` strict mapping means operator must re-triage to change resolution path; could be relaxed in v1.1 if friction discovered.
- `mark_duplicate` does NOT migrate events from the duplicate case to the predecessor (events stay with their original case_id). Event-merge logic deferred.

### §8.3 Test data prefix convention

**Established by Wave 0d (L-v2.85-d-CONFIRMED):** Any test data created during V-checks or experiments uses the prefix:

```
cc-NNNN[a-z]?-test/<descriptor>
```

Examples:
- `cc-0017d-test/triage-smoke`
- `cc-0017d-test/v-d-001`
- `cc-0018-test/predecessor-fixture`
- `cc-0019a-test/race-condition-001`

The `friction.purge_test_case(text)` function accepts patterns matching `^cc-[0-9]{4}[a-z]?-test/` and DELETEs across event + case + emit_error. **Future brief authors MUST use this prefix** for test fixtures, or implement bespoke cleanup. Document the convention in any brief that creates test data.

### §8.4 v1.1 candidate amendments (open backlog)

These are noted but not committed; only address if discovered necessary during apply or V-checks:

- (A) `friction.resolve_case(p_force boolean DEFAULT false)` — bypass strict mapping with explicit override flag. Defer unless workflow friction shows up in Wave 7.
- (B) `friction.bulk_triage(p_case_ids uuid[], ...)` — batch operations. Defer to Wave 7 UI signal.
- (C) `friction.triage_case` extended signature with `p_suppression_reason` — if PK overrides scope decision (currently routed to resolve_case path).
