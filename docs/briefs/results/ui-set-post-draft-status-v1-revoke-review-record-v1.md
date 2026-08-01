# Review record — `m.ui_set_post_draft_status_v1` PUBLIC-EXECUTE REVOKE (D-01)

**Date:** 2026-08-01 Sydney · **Tier:** T2 grant-only (production ACL change) · **Lane class:** SAFETY_GATE
**Status:** **REVIEW CHAIN COMPLETE — NOT APPLIED. Awaiting PK exact-phrase apply authorization.**
**Origin:** collateral finding from the NDIS Yarns "free chat" incident recon
(`docs/briefs/results/ndis-yarns-free-chat-post-investigation-result-v1.md`), triaged by
`security-auditor` (GREEN, D-01-ready), independent review chain approved by PK 2026-08-01 (decision
sitting, item 6b) — freeze + review only, production apply remains a separate PK gate.

---

## 1. The frozen SQL

`docs/briefs/artifacts/ui-set-post-draft-status-v1-revoke-frozen-v1.sql` (137 bytes, sha256
`a08dbdc46805b84a57b3f96ca1de271eb426a551d89c26459c4f400710c5e361`):

```sql
REVOKE EXECUTE ON FUNCTION m.ui_set_post_draft_status_v1(uuid, text, timestamp with time zone, text)
  FROM PUBLIC, anon, authenticated;
```

Removes an accidental `EXECUTE ... TO PUBLIC` grant on a `SECURITY DEFINER` function that can set
`m.post_draft.approved_by` to arbitrary caller-supplied text (`p_actor`, no validation). Satisfies
the standing house rule: *"Revoking from PUBLIC alone is insufficient — also REVOKE FROM anon,
authenticated for service-role-only objects"* — this statement names all three explicitly.

## 2. Review chain

**Pass 1 — `security-auditor` triage** (initial recon): GREEN, D-01 packet drafted, no concrete
defect. Correctly noted the residual free-text-identity design defect is a *separate* problem from
the grant (now the fence brief's target, not this REVOKE's).

**Pass 2 — `db-rls-auditor` independent re-confirmation** (this lane, live, first-hand — did not
rely on Pass 1 without re-verifying):
- Function signature re-verified via `pg_get_function_identity_arguments`: matches the REVOKE
  statement's argument list exactly.
- Live `proacl` re-read: three **distinct** ACL entries — bare PUBLIC, `postgres` (grantable),
  `retool_ui` (not grantable). `anon`/`authenticated` hold **no** entry of their own; their apparent
  access is entirely inherited through PUBLIC — confirming the REVOKE costs them nothing they hold
  independently.
- Schema-`m` `USAGE` fence re-confirmed live (`pg_namespace.nspacl`): `anon`/`authenticated`/`PUBLIC`
  absent from the grantee set — the function is not currently REST-reachable regardless of this
  grant, corroborating the earlier live REST probe (`42501 permission denied for schema m`).
- `retool_ui` re-confirmed as a real login role (`rolcanlogin=true`), independently corroborated
  across two unrelated prior security lanes as the standing internal Retool admin-panel identity.
- `pg_stat_statements` (installed, v1.11): **zero recorded invocations of this function, ever** —
  the PUBLIC grant has never actually been exercised by anything.
- Live Supabase advisor re-pulled directly (not relayed from Pass 1): two WARN lints
  (`anon_security_definer_function_executable`, `authenticated_security_definer_function_executable`)
  independently corroborate the exposure at the linter level.
- Rollback (`GRANT EXECUTE ... TO PUBLIC`) confirmed to restore the exact byte-identical pre-state.
- **Verdict returned as `concerns`, not `pass`** — but the stated reason is a self-disclosed process
  note, not a defect in the SQL: the auditor ran one out-of-charter `Bash rm -f` against an
  ephemeral session tool-output cache file (a `get_advisors` JSON dump under
  `.claude/projects/.../tool-results/`), outside its read-only charter. **Disclosed rather than
  omitted.** It touched no DB, no repo file, no PK artifact, and had zero effect on the SELECT-only
  findings above. **Orchestrator judgment: the SQL-safety substance of this review has no gap** —
  every claim above was independently re-derived from live catalog state, not merely repeated from
  Pass 1. The charter violation is recorded here for visibility and as a standing note that
  read-only agents should not issue mutating shell commands under any circumstance, including on
  files they believe are harmless — but it does not change the correctness of the reviewed SQL and
  is not treated as a reason to re-run or distrust this pass.

**Pass 3 — External review** (`ask_chatgpt_review`, `sql_destructive`), pinned to
`reviewed_input_hash = a08dbdc46805b84a57b3f96ca1de271eb426a551d89c26459c4f400710c5e361`
(`review_id`: `a6ebcb73-6ebc-447b-9de7-fe14c13d86d9`): **verdict `agree`, risk `low`, confidence
`high`, zero pushback points, zero unverified claims, `requires_pk_escalation: false`.**

## 3. Rollback (proven, not required to run)

```sql
GRANT EXECUTE ON FUNCTION m.ui_set_post_draft_status_v1(uuid, text, timestamp with time zone, text) TO PUBLIC;
```
Confirmed by Pass 2 to restore the exact pre-state ACL byte-for-byte.

## 4. What this review does NOT authorize

**No REVOKE has been executed. No GRANT has been touched. Nothing has been applied.** This record
closes the review chain PK approved (item 6b: *"its independent review chain is APPROVED to run
now ... production apply remains a separate PK gate with PK exact-phrase authorisation"*).
Production apply requires PK's own exact-phrase authorization, minted per house convention, on this
exact frozen hash — not fabricated or assumed by this record.

## 5. Constraints respected

- Zero writes: every verification query across both `db-rls-auditor` passes and the external review
  was read-only (`SELECT`, catalog introspection, `get_advisors`, one non-mutating REST probe).
- No repo file edited except this record and the frozen SQL artifact (both new, additive).
- The self-disclosed charter violation (§2, Pass 2) is recorded plainly, not corrected retroactively
  or hidden from this record.
