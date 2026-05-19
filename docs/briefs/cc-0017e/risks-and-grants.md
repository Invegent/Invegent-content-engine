# cc-0017e v1.0 — Risks & Grants

**Status:** AUTHORED-PENDING-APPLY.
**Parent brief:** `docs/briefs/cc-0017e-friction-case-history-and-compat.md`

---

## 1. Grant matrix

### 1.1 friction.case_history

| Privilege | postgres | service_role | authenticated | anon | PUBLIC |
|---|---|---|---|---|---|
| SELECT | ✅ (owner) | ✅ (granted) | ❌ | ❌ | ❌ |
| INSERT | ✅ (owner) | ❌ | ❌ | ❌ | ❌ |
| UPDATE | ✅ (owner) | ❌ | ❌ | ❌ | ❌ |
| DELETE | ✅ (owner) | ❌ | ❌ | ❌ | ❌ |
| TRUNCATE | ✅ (owner) | ❌ | ❌ | ❌ | ❌ |
| TRIGGER | ✅ (owner) | ❌ | ❌ | ❌ | ❌ |
| REFERENCES | ✅ (owner) | ❌ | ❌ | ❌ | ❌ |

**Lockdown pattern:** matches cc-0017c lockdown on friction.event + friction.case. All non-owner mutations must go through SECURITY DEFINER functions.

**Why SELECT on service_role:** read access from PostgREST RPC contexts and from dashboard reconciliation views. Reading audit history is safe; writing is gated.

### 1.2 Function grants (6 patched functions)

All 6 patched functions are SECURITY DEFINER and inherit cc-0017d grant matrix:

| Function | postgres EXECUTE | service_role EXECUTE | authenticated EXECUTE | anon EXECUTE |
|---|---|---|---|---|
| fn_triage_case | ✅ | ✅ | ❌ | ❌ |
| triage_case | ✅ | ✅ | ❌ | ❌ |
| resolve_case | ✅ | ✅ | ❌ | ❌ |
| reopen_case | ✅ | ✅ | ❌ | ❌ |
| mark_duplicate | ✅ | ✅ | ❌ | ❌ |
| record_first_view | ✅ | ✅ | ❌ | ❌ |

**Note: `CREATE OR REPLACE FUNCTION` preserves existing grants** (Postgres semantics). The cc-0017d grant matrix carries forward unchanged through the cc-0017e patch. No explicit GRANT statements needed in the patch; verify post-apply via V-C-style check.

### 1.3 fn_triage_case grant continuity (pre-existing)

`fn_triage_case` predates cc-0017d. Its grant matrix may differ from cc-0017d functions. Pre-apply probe at apply session:

```sql
SELECT routine_name, grantee, privilege_type
FROM information_schema.routine_privileges
WHERE routine_schema = 'friction' AND routine_name = 'fn_triage_case'
ORDER BY grantee;
```

If the grant matrix is broader than cc-0017d functions (e.g., includes `authenticated`), the patch preserves that — `CREATE OR REPLACE` does not modify grants. If PK directs to align fn_triage_case grants to the cc-0017d narrow matrix, that becomes a SEPARATE pre-apply REVOKE migration outside this brief.

---

## 2. Risk register

### R1 — Silent INSERT failure in patch surface

**Severity:** HIGH
**Likelihood:** LOW-MEDIUM
**Description:** A function patch could silently fail to INSERT into case_history due to:
- CHECK constraint mismatch (typo in change_kind value)
- Permissions gap (case_history INSERT denied to function's effective role — SHOULD NOT happen since SECURITY DEFINER runs as owner, but worth verifying)
- Exception-swallowed code path (`EXCEPTION WHEN OTHERS THEN NULL;` like in mark_duplicate's emit_error block)

**Detection:** V-Z3 alignment check (NEW convention). Operation count must equal shadow-table row count.

**Mitigation:**
- CHECK constraint enumerates exactly 7 valid change_kind values; typos caught at apply time as syntax/check errors.
- SECURITY DEFINER + owner-INSERT bypass any role-based restrictions.
- The 5 mutation function patches do NOT wrap the case_history INSERT in EXCEPTION blocks. Only the mark_duplicate emit_error audit block is wrapped (which is pre-cc-0017e legacy behaviour preserved byte-stable).

**Residual risk:** if a future patch wraps case_history INSERT in an EXCEPTION block, V-Z3 catches the resulting silent failure. Codified convention.

### R2 — Substitution-class drift (RAISE %%→%, ROWTYPE quoting)

**Severity:** HIGH (per cc-0017d v2.86 precedent)
**Likelihood:** MEDIUM
**Description:** Authoring drift in RAISE format strings (`%%` vs `%`) or `friction.case%ROWTYPE` vs `friction."case"%ROWTYPE` quoting causes apply-time syntax errors.

**Detection:** L-v2.86-a transactional EXEC pre-validation harness BEFORE apply_migration.

**Mitigation:**
- All RAISE EXCEPTION calls in migration-sql.md use single `%` placeholders.
- All ROWTYPE references use `friction."case"%ROWTYPE` (double-quoted reserved keyword).
- Pre-apply harness is the strict gate.

### R3 — Backfill triple-pin predicate drift

**Severity:** MEDIUM
**Likelihood:** LOW
**Description:** The backfill predicate `triage_state='acknowledged' AND triaged_at IS NULL AND triaged_by IS NULL` could fail to match if probe-time state differs from apply-time state (e.g., new acknowledged rows created between probe v2.88 and apply).

**Detection:** Pre-apply P-set re-runs the P4 probe and compares against the 8-row expectation.

**Mitigation:**
- Triple-pin predicate makes re-runs no-ops by construction.
- V-F1 strictly expects 8 rows backfilled; deviation = brief-level investigation, not silent acceptance.
- If pre-apply probe shows >8 candidate rows: STOP. Investigate whether additional triage flow has been added that creates acknowledged rows without setting triaged_at. Update brief or extend backfill scope under PK directive.

### R4 — fn_triage_case signature change breaks external callers

**Severity:** LOW
**Likelihood:** LOW
**Description:** Adding `p_actor text DEFAULT NULL` as the 11th argument is signature-compatible — positional and keyword callers unaffected. BUT: if any external caller declared the function with an explicit 10-arg signature (rare), the call fails with "function does not exist".

**Detection:** Apply-time pg_proc check via V-A1. Post-apply: integration test of any known external callers.

**Mitigation:**
- DEFAULT NULL means no caller is required to pass the new arg.
- The risk is only at the type-level (function resolution), not the value-level.
- Edge Functions calling via PostgREST RPC use named arguments → unaffected.
- Should an external 10-arg dependency surface, a 10-arg wrapper function can be added as a v1.1 patch.

### R5 — case_history grows unbounded over time

**Severity:** LOW-MEDIUM
**Likelihood:** CERTAIN (by design)
**Description:** Every case mutation writes a history row. Over time, case_history will be the largest table in friction.* schema.

**Detection:** Standard table-size monitoring.

**Mitigation:**
- v1.0 accepts unbounded growth — audit completeness is the priority.
- Future v1.1+ candidates: partition by changed_at month, archive policy, retention rule. Defer to Wave 0f+ or capacity-driven brief.
- Index `(case_id, changed_at DESC)` keeps per-case queries fast regardless of total size.

### R6 — Wave 0f scope creep into cc-0017e

**Severity:** MEDIUM (procedural)
**Likelihood:** MEDIUM (always tempting)
**Description:** While patching the 5 mutation functions, it's tempting to also add operator-action audit events via emit_event (Wave 0f item B), or restructure resolve_case to call fn_triage_case directly (item E), or add write-side CHECK constraints (item F).

**Detection:** Brief scope IN/OUT table; PK directive hard line.

**Mitigation:**
- Hard line drawn in main brief Section 1. Items B, E, F, G are DEFERRED.
- Any apply-time temptation to add scope = STOP, escalate to PK, document in lessons.
- V-A1 signature byte-match catches accidental signature change.

### R7 — Apply-time D-01 review escalates

**Severity:** MEDIUM (procedural)
**Likelihood:** MEDIUM
**Description:** D-01 fire on a 6-function-patch + DDL + backfill migration may receive `escalate=true` from ChatGPT review (volume of change, breadth of surface).

**Detection:** D-01 response inspection per L62.

**Mitigation:**
- D-01 proposal text references this brief by commit SHA + enumerates all 7 atomic operations (1 DDL, 1 fn_triage_case patch, 5 mutation function patches, 1 backfill statement, 1 COMMENT block).
- known_weak_evidence field explicitly lists: (a) fn_triage_case external callers not enumerable via SQL, (b) backfill predicate sensitive to between-probe-and-apply state drift, (c) V-Z3 is a new convention without prior empirical validation.
- Path A (satisfy corrected action) preferred over state-capture override per L-v2.84-c.

---

## 3. Lockdown verification approach (apply close)

Post-apply, the following verification confirms friction.* lockdown remains intact:

```sql
-- 1. service_role still SELECT-only on case + event
SELECT table_name, privilege_type
FROM information_schema.role_table_grants
WHERE table_schema = 'friction'
  AND table_name IN ('case', 'event', 'case_history')
  AND grantee = 'service_role'
ORDER BY table_name, privilege_type;

-- Expected:
--   case          SELECT
--   case_history  SELECT
--   event         SELECT
-- (NO INSERT/UPDATE/DELETE for service_role)

-- 2. authenticated + anon have zero grants on friction.*
SELECT count(*) AS unauthorized_grants
FROM information_schema.role_table_grants
WHERE table_schema = 'friction'
  AND grantee IN ('authenticated', 'anon');

-- Expected: 0

-- 3. All 6 patched functions SECURITY DEFINER
SELECT count(*) FILTER (WHERE prosecdef = false) AS non_secdef_count
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'friction'
  AND p.proname IN ('fn_triage_case','triage_case','resolve_case','reopen_case','mark_duplicate','record_first_view');

-- Expected: 0
```

Any non-zero result here triggers lockdown-regression Path B-prime correction migration.
