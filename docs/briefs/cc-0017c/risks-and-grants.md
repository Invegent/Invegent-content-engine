# cc-0017c — §3 Risks + §4 Grants + Authorisation gates

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

**Empirical state at v2.83 fact-finding (Query 3 result):** 0 candidate rows. action_decision distribution: NULL=14, track=7, act_now=1. No suppress/ignore/duplicate/done rows exist.

**Mitigation:** UPDATE is a no-op at apply time. Pattern is forward-looking — encodes the closure invariant for future rows. V-C1 confirms 0 rows affected matches pre-flight P-3 count.

**Residual:** None at apply time. UPDATE cannot affect rows that don't exist. Forward-looking: write-side enforcement (CHECK or trigger) is deferred to a future wave — backfill UPDATE alone does not prevent future invariant violations.

### §3.4 `'done'` not in legal CHECK domain — divergence from Amendment G framing

**Empirical finding (Query 3b):** `case_action_decision_check` legal domain is `('act_now', 'track', 'defer_intentionally', 'suppress', 'ignore', 'duplicate')`. `'done'` is **NOT** a legal value.

**PK directive used `('suppress','ignore','duplicate','done')` as the closed-class set.**

**Resolution — Option C (selected; match PK directive verbatim, flag explicitly):**
- Migration SQL §5.2-C uses all 4 values in WHERE clause
- `'done'` branch in CASE expression maps to `'acted_on'` (most semantically aligned of legal `case_resolution_kind_check` values: `acted_on / tracked_done / deferred_done / suppressed / ignored / duplicate / reopened`)
- `'done'` clause matches 0 rows at apply time (cannot match — domain restricts)
- Forward-looking: if Amendment G later expands the CHECK domain to include `'done'`, backfill UPDATE already accounts for it
- This Option C is **FLAGGED for PK redirection** during D-01 or pre-apply review

**Alternative options not selected:**
- **Option A** (drop `'done'` from WHERE): matches production exactly but diverges from PK directive verbatim
- **Option B** (expand CHECK in this brief): scope expansion beyond PK 4-item directive; would require Amendment G in-line

### §3.5 Divergence from idealised Amendment F framing

**Amendment F (signed v2.79) framed REVOKE as targeting PUBLIC + authenticated + anon roles.**

**Empirical finding (Query 2):** No grants exist on friction.event or friction.case to PUBLIC, authenticated, or anon. The actual direct-write attack surface is `service_role`'s INSERT (event) + INSERT/UPDATE (case).

**Resolution:** Migration SQL §5.2-B issues REVOKE statements for all four (service_role + PUBLIC + authenticated + anon) idempotently. PUBLIC/authenticated/anon REVOKEs are defensive no-ops (REVOKE on a grant that doesn't exist is a successful no-op per PostgreSQL semantics). service_role REVOKE is the effective change.

**Pre-flight P-1 captures current grant matrix as JSON.** Rollback uses this exact JSON to restore grants — not idealised Amendment F grants.

### §3.6 L-v2.81-a parallel-session coordination risk

**Risk:** Between brief authoring (v2.84) and apply session, a parallel session (Claude Code, parallel chat-side session, PK direct edits) could land schema changes that invalidate P-set expected values.

**Mitigation:** Pre-flight P-set rerun immediately before apply is the drift-detection gate. Hard-stop §5.4-A1 triggered on any drift between brief-authoring reference and apply-time capture.

**Residual:** L-v2.81-a now at 2 occurrences (promotion-eligible per PK directive v2.83). Recurrence in cc-0017c apply session would be occurrence 3.

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

- **G1 — Brief commit:** None required (this commit)
- **G2 — D-01 fire:** PK explicit authorisation per v2.83 session directive
- **G3 — Apply:** D-01 verdict + PK explicit approval; pre-flight P-set rerun must match brief-authoring reference (drift detection)
- **G4 — Post-apply close-the-loop:** Automatic on V-check pass; UPDATE on m.chatgpt_review with action_taken summary
- **G5 — Hard-stop:** Triggered by V-check failure or D-01 reject — see `hardstop-rollback.md` §5.4
