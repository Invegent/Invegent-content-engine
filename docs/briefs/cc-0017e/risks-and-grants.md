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

**Lockdown pattern:** matches cc-0017c lockdown on friction.event + friction.case + friction.emit_error. All non-owner mutations must go through SECURITY DEFINER functions. The cc-0017c + cc-0017e lockdown surface is exactly: `friction.case`, `friction.event`, `friction.emit_error`, `friction.case_history`. Other friction.* tables (reference/config) retain their pre-existing SELECT grants — see §3 for the narrowed verification scope.

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

**Note: `CREATE OR REPLACE FUNCTION` preserves existing grants** (Postgres semantics) **only when the argument list is unchanged.** When the argument list changes (e.g., fn_triage_case 10-arg → 11-arg), the explicit `DROP FUNCTION IF EXISTS` of the prior signature plus a fresh `CREATE OR REPLACE FUNCTION` of the new signature MUST re-issue any GRANT statements explicitly, because the new signature is a different function entry and inherits no grants from the dropped legacy entry. For the 5 cc-0017d functions (signature byte-stable), grants carry forward unchanged. For fn_triage_case (arity change), grants must be re-issued. See migration-sql.md §2 v1.1 doc-patch note and risks-and-grants.md R4 (revised).

### 1.3 fn_triage_case grant continuity (pre-existing)

`fn_triage_case` predates cc-0017d. Its grant matrix may differ from cc-0017d functions. Pre-apply probe at apply session:

```sql
SELECT routine_name, grantee, privilege_type
FROM information_schema.routine_privileges
WHERE routine_schema = 'friction' AND routine_name = 'fn_triage_case'
ORDER BY grantee;
```

If the grant matrix is broader than cc-0017d functions (e.g., includes `authenticated`), the patch must re-issue equivalent or narrower grants on the new 11-arg signature. PK directs the target grant matrix at apply. If PK directs to align fn_triage_case grants to the cc-0017d narrow matrix, the GRANT statements become part of the cc-0017e apply migration after the DROP-then-CREATE pattern in §2.

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

**v1.1 doc-patch note (harness scope clarification):** the harness catches substitution-class drift only. Value-class defects (CHECK / FK value violations), schema-resolution defects (arity-change overload), helper coverage gaps, and phantom-column references in close-the-loop templates are OUTSIDE harness scope. See L-v2.86-a refinement in lessons-metadata-changelog.md L-v2.90 family.

### R3 — Backfill triple-pin predicate drift

**Severity:** MEDIUM
**Likelihood:** LOW
**Description:** The backfill predicate `triage_state='acknowledged' AND triaged_at IS NULL AND triaged_by IS NULL` could fail to match if probe-time state differs from apply-time state (e.g., new acknowledged rows created between probe v2.88 and apply).

**Detection:** Pre-apply P-set re-runs the P4 probe and compares against the 8-row expectation.

**Mitigation:**
- Triple-pin predicate makes re-runs no-ops by construction.
- V-F1 strictly expects 8 rows backfilled; deviation = brief-level investigation, not silent acceptance.
- If pre-apply probe shows >8 candidate rows: STOP. Investigate whether additional triage flow has been added that creates acknowledged rows without setting triaged_at. Update brief or extend backfill scope under PK directive.

### R4 — fn_triage_case arity change creates sibling overload, not replacement (REVISED v1.1)

**Severity:** MEDIUM (revised from LOW at v1.0)
**Likelihood:** CERTAIN absent explicit DROP (revised from LOW at v1.0)

**v1.1 doc-patch correction (Defect 3 / L-v2.90-b):** the v1.0 framing conflated two distinct senses of "signature-compatible":

1. **Call-resolution compatibility (preserved by DEFAULT NULL):** any caller passing 10 args positionally OR using named-argument syntax resolves to a function with the new 11-arg signature without changing call sites. This is what `DEFAULT NULL` on the new 11th arg provides.
2. **Schema-resolution compatibility (BROKEN by arity change):** PostgreSQL's `CREATE OR REPLACE FUNCTION` matches functions by `(schema, name, argument list)`. Adding an 11th argument creates a NEW function entry (different argument list) — it does NOT replace the legacy 10-arg function. After running `CREATE OR REPLACE FUNCTION friction.fn_triage_case(...11 args...)` without first dropping the 10-arg signature, the production database has BOTH signatures co-existing:
   - legacy 10-arg `fn_triage_case` with its pre-patch body (no case_history INSERT, no triaged_at/triaged_by writes)
   - new 11-arg `fn_triage_case` with the refactored body

   Any 10-arg positional call resolves to the LEGACY function. The patch is defeated for any caller path that doesn't pass the new arg.

**Description (revised):** Adding `p_actor text DEFAULT NULL` as the 11th argument changes the argument list at the schema level. Without an explicit `DROP FUNCTION IF EXISTS friction.fn_triage_case(uuid, text, text, boolean, text, text, text, timestamptz, text, text)` BEFORE the `CREATE OR REPLACE FUNCTION` of the new signature, the legacy 10-arg overload persists alongside the new 11-arg signature.

**Detection:** V-A1 strict signature byte-match returns 7 rows instead of the expected 6 (both fn_triage_case signatures present). Surfaced at v2.90 apply.

**Mitigation:**
- migration-sql.md §2 (v1.1) includes the explicit `DROP FUNCTION IF EXISTS` statement before the `CREATE OR REPLACE FUNCTION` for fn_triage_case.
- vchecks.md V-A1 expected-matrix note (v1.1) calls out the 7-row dual-overload condition as Defect-3-class and prescribes Path B-prime: run the DROP, re-run V-A1.
- L-v2.90-b codifies the discipline: for any function patch that changes argument arity, the explicit DROP of the prior signature MUST precede the CREATE OR REPLACE. DEFAULT NULL on a new argument preserves call-resolution compatibility but does NOT preserve schema-resolution compatibility.

**Residual risk:** if an apply session forgets the DROP, V-A1 catches the dual overload. Path B-prime is the corrective. The patch is recoverable without re-authoring.

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

Post-apply, the following verification confirms the cc-0017c + cc-0017e lockdown surface remains intact.

**v1.1 doc-patch scope narrowing (Defect 8 / L-v2.90-f):** the v1.0 query #2 asserted "authenticated + anon have zero grants on friction.*" which overclaims. The actual cc-0017c lockdown surface was always `friction.case + friction.event + friction.emit_error`; cc-0017e adds `friction.case_history`. Other friction.* tables (reference/config — `category`, `emission_rule`, `emission_rule_history`, `experiment_run`, `notification_policy`, `source`) retain their pre-existing SELECT grants intentionally and predate cc-0017c. Those grants are NOT a lockdown regression. The verification clause is narrowed below to only the actual lockdown surface.

```sql
-- 1. service_role still SELECT-only on the lockdown surface
SELECT table_name, privilege_type
FROM information_schema.role_table_grants
WHERE table_schema = 'friction'
  AND table_name IN ('case', 'event', 'emit_error', 'case_history')
  AND grantee = 'service_role'
ORDER BY table_name, privilege_type;

-- Expected:
--   case          SELECT
--   case_history  SELECT
--   emit_error    SELECT
--   event         SELECT
-- (NO INSERT/UPDATE/DELETE for service_role on these 4 tables)

-- 2. authenticated + anon have zero grants on the lockdown surface
--    (case + event + emit_error + case_history) ONLY.
--    Reference/config tables (category, emission_rule, emission_rule_history,
--    experiment_run, notification_policy, source) retain intentional pre-existing
--    SELECT grants and are NOT in scope for this lockdown verification.
SELECT count(*) AS unauthorized_grants_on_lockdown_surface
FROM information_schema.role_table_grants
WHERE table_schema = 'friction'
  AND table_name IN ('case', 'event', 'emit_error', 'case_history')
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

Any non-zero result on queries #2 or #3 triggers lockdown-regression Path B-prime correction migration. Non-zero on query #1 in unexpected privilege columns is also a regression. If a broad-scope sanity sweep finds additional grants outside the four-table lockdown surface, document the table + role + privilege and confirm intentional pre-existing grant before treating as regression.
