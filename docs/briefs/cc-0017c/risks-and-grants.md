# cc-0017c — §3 Risks + §4 Grants + Authorisation gates

**Brief version:** v1.1 (doc-only patch — §3.4 revised to reflect Path A as final selected option per D-01 verdict `a37eff28-2ba1-4a7a-8fbd-3e9aba738c79`)

## §3 Risks

### §3.1 FK swap risk (Section A)

**Risk:** Adding FK on `friction.event.source` → `friction.source(source_code)` blocks future emit_event calls with `source` values not in `friction.source`. cc-0017b emit_event already validates source against friction.source before insert. FK becomes a database-level guarantee of an already-enforced application invariant.

**Mitigation:** Pre-flight P-2 confirms orphan-free state across all 22 existing rows. FK is defensive — emit_event SECURITY DEFINER function is the primary write path.

**Residual:** If a future direct-write path (post-lockdown, via postgres owner only) inserts a source not in friction.source, FK violation will reject the row. This is desired behaviour.

### §3.2 REVOKE lockdown risk (Section B)

**Risk:** REVOKE INSERT/UPDATE on friction.event from service_role removes direct-write capability. All writes must route through `friction.emit_event` SECURITY DEFINER function (runs as postgres owner, bypassing the REVOKE).

**Mitigation:** cc-0017b verified emit_event end-to-end via 27/27 V-checks (v2.82). PRV chain (`op_reader` etc.) uses SECURITY DEFINER functions / views and does not require direct table grants.

**Verification:** V-B4 will confirm emit_event still functional post-REVOKE via a test event insert that gets cleaned up.

**Residual:** Any code path that bypasses emit_event by inserting directly into friction.event/case as service_role will break post-apply. Audit at v2.83 fact-finding: friction.event service_role grant is INSERT+SELECT (no UPDATE — no in-place edits currently happen); friction.case service_role grant includes UPDATE (used by triage/resolution flows). Post-lockdown, triage/resolution must route through Wave 0d SECURITY DEFINER functions — flagged as Wave 0d gate prerequisite.

### §3.3 Backfill risk (Section C)

**Risk:** UPDATE on friction.case where action_decision is in closed-class but resolved_at IS NULL.

**Empirical state at v2.83 fact-finding (Query 3 result):** 0 candidate rows. action_decision distribution: NULL=14, track=7, act_now=1. No suppress/ignore/duplicate rows exist (and `'done'` is not legal under `case_action_decision_check`).

**Mitigation:** UPDATE is a no-op at apply time. Pattern is forward-looking — encodes the closure invariant for future rows. V-C1 confirms 0 rows affected matches pre-flight P-3 count.

**Residual:** None at apply time. UPDATE cannot affect rows that don't exist. Forward-looking: write-side enforcement (CHECK or trigger) is deferred to a future wave — backfill UPDATE alone does not prevent future invariant violations.

### §3.4 `'done'` not in legal CHECK domain — v1.1 RESOLUTION: Path A SELECTED

**v1.1 status:** RESOLVED. Path A is the final selected option per D-01 verdict `a37eff28-2ba1-4a7a-8fbd-3e9aba738c79` (verdict: partial, corrected_action: Option A) + PK directive 2026-05-18 Sydney late evening ("Proceed with Path A").

**Empirical finding (Query 3b at v2.83 fact-finding):** `case_action_decision_check` legal domain is `('act_now', 'track', 'defer_intentionally', 'suppress', 'ignore', 'duplicate')`. `'done'` is **NOT** a legal value at apply time.

**Path A — Final selected option (v1.1):**
- Migration SQL `§5.2-C` uses **only current legal values** in WHERE clause: `('suppress','ignore','duplicate')`
- CASE expression maps only current legal values: `suppress → suppressed`, `ignore → ignored`, `duplicate → duplicate`
- `'done'` is **not** included in WHERE or CASE
- Backfill matches 0 rows at apply time (no existing rows in closed-class state without resolved_at; consistent with v1.0 v2.83 fact-finding)

**Recording per PK directive item 4:** `'done'` is not currently legal under `case_action_decision_check`. It should only be introduced in a future lifecycle-domain expansion if needed. Such expansion would require:
- A new brief (e.g., cc-0018 or Wave 0d follow-on)
- Amendment G nomenclature alignment work
- ALTER TABLE friction.case DROP CONSTRAINT case_action_decision_check + ADD CONSTRAINT with expanded domain
- Corresponding update to resolution_kind mapping logic (likely `'done' → 'acted_on'` as semantic match, though final mapping is a design decision for the future brief)

**Alternatives considered and not selected at v1.1:**

- **Option B (CHECK domain expansion):** Expand `case_action_decision_check` to include `'done'` in this same brief. **Not selected** — scope expansion beyond PK 4-item directive verbatim; Amendment G nomenclature work not authorised at v2.84.
- **Option C (forward-completeness with state-capture override):** Include `'done'` in WHERE/CASE for forward-completeness; map `'done' → 'acted_on'`; rely on domain restriction to match 0 rows. **Not selected** — D-01 verdict `a37eff28-...` flagged this as causing "potential scope expansion if 'done' is included in the WHERE clause linked to a closed-class" + "confusion regarding the legal compliance of the action_decision domain". PK accepted Path A over state-capture override.

### §3.5 Divergence from idealised Amendment F framing

**Amendment F (signed v2.79) framed REVOKE as targeting PUBLIC + authenticated + anon roles.**

**Empirical finding (Query 2):** No grants exist on friction.event or friction.case to PUBLIC, authenticated, or anon. The actual direct-write attack surface is `service_role`'s INSERT (event) + INSERT/UPDATE (case).

**Resolution:** Migration SQL §5.2-B issues REVOKE statements for all four (service_role + PUBLIC + authenticated + anon) idempotently. PUBLIC/authenticated/anon REVOKEs are defensive no-ops (REVOKE on a grant that doesn't exist is a successful no-op per PostgreSQL semantics). service_role REVOKE is the effective change.

**Pre-flight P-1 captures current grant matrix as JSON.** Rollback uses this exact JSON to restore grants — not idealised Amendment F grants.

### §3.6 L-v2.81-a parallel-session coordination risk

**Risk:** Between brief authoring (v2.84) and apply session, a parallel session (Claude Code, parallel chat-side session, PK direct edits) could land schema changes that invalidate P-set expected values.

**Mitigation:** Pre-flight P-set rerun immediately before apply is the drift-detection gate. Hard-stop §5.4-A1 triggered on any drift between brief-authoring reference and apply-time capture.

**Residual:** L-v2.81-a now at 2 occurrences (promotion-eligible per PK directive v2.83). Parent SHA observation at v1.0 brief commit (`92f9e868` parent `586d30cd` vs compaction-summary v2.83 close HEAD `06a8421e`) was observed but not confirmed as occurrence 3 — not treated as blocker per PK directive.

## §4 Grant matrix snapshot (Query 2 at v2.83 fact-finding)

**Note:** This is a **DESIGN REFERENCE** captured at brief authoring time. Pre-flight P-1 re-captures the live grant matrix immediately before apply. Use the pre-flight capture for exact rollback — not this design-time reference.

### friction.case (current at v2.83)
| Grantee | Privileges | is_grantable |
|---|---|---|
| postgres | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE | YES |
| service_role | INSERT, SELECT, UPDATE | NO |

### friction.event (current at v2.83)
| Grantee | Privileges | is_grantable |
|---|---|---|
| postgres | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE | YES |
| service_role | INSERT, SELECT | NO |

### Expected post-cc-0017c state

#### friction.case (post-lockdown)
| Grantee | Privileges | is_grantable |
|---|---|---|
| postgres | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE | YES |
| service_role | SELECT | NO |

#### friction.event (post-lockdown)
| Grantee | Privileges | is_grantable |
|---|---|---|
| postgres | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE | YES |
| service_role | SELECT | NO |

**Change scope:** service_role loses INSERT on friction.event; service_role loses INSERT + UPDATE on friction.case. All other grants preserved. PUBLIC/authenticated/anon unchanged (already empty).

## §5 Authorisation gates

- **G1 — Brief commit:** None required (v1.0 + v1.1 commits done)
- **G2 — D-01 fire on v1.0:** COMPLETE (review_id `a37eff28-2ba1-4a7a-8fbd-3e9aba738c79`; verdict partial, corrected_action Option A accepted by PK)
- **G2b — D-01 re-fire on v1.1:** PENDING (next step this session per PK directive)
- **G3 — Apply:** GATED on v1.1 D-01 verdict + PK explicit approval; pre-flight P-set rerun must match brief-authoring reference (drift detection)
- **G4 — Post-apply close-the-loop:** Automatic on V-check pass; UPDATE on m.chatgpt_review with action_taken summary
- **G5 — Hard-stop:** Triggered by V-check failure or D-01 reject — see `hardstop-rollback.md §5.4`
