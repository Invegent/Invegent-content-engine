# Gate-2 sitting card — `m.ui_set_post_draft_status_v1` PUBLIC-EXECUTE REVOKE

**For:** PK's next sitting, priority 7. **This card authorizes nothing by itself — it is
presented for PK to read and, if he chooses, act on using the exact phrase in §5. Authorize
separately from the fence card (§1 of that card) — by design, never combined.**

---

## 1. Drift check (required before presenting — result: NONE, clean to proceed)

Re-verified 2026-08-01, immediately before staging this card:
- Frozen SQL artifact hash: `a08dbdc46805b84a57b3f96ca1de271eb426a551d89c26459c4f400710c5e361` — **byte-identical** to the hash external review approved.
- Live `proacl` on `m.ui_set_post_draft_status_v1`: `{=X/postgres, postgres=X/postgres, retool_ui=X/postgres}` — **byte-identical** to the pre-state `db-rls-auditor` verified. Nothing has changed the grant since review.

## 2. Exact REVOKE (what would be applied)

File: `docs/briefs/artifacts/ui-set-post-draft-status-v1-revoke-frozen-v1.sql` (on `main`, committed).

```sql
REVOKE EXECUTE ON FUNCTION m.ui_set_post_draft_status_v1(uuid, text, timestamp with time zone, text)
  FROM PUBLIC, anon, authenticated;
```

Removes an accidental `EXECUTE ... TO PUBLIC` grant on a `SECURITY DEFINER` function that can set
`m.post_draft.approved_by` to arbitrary caller-supplied text (`p_actor`). `postgres` and
`retool_ui` hold their own distinct ACL entries and are entirely unaffected either direction.
`anon`/`authenticated` currently reach this grant only through the `PUBLIC` entry being removed
— confirmed **not** currently exploitable (schema `m` has no REST `USAGE` grant for either role,
live-probed) — this is hardening, not incident response to an active exploit.

## 3. Review chain (complete)

| Stage | Result |
|---|---|
| Signature re-verification | `pg_get_function_identity_arguments` matches the REVOKE statement's argument list exactly |
| `db-rls-auditor` | Live re-confirmation — distinct ACL entries for `postgres`/`retool_ui`, zero recorded invocations of the function ever (`pg_stat_statements`), advisor warnings re-pulled fresh and corroborate |
| External review | `agree`, risk `low`, confidence `high`, zero pushback (`review_id` `a6ebcb73-6ebc-447b-9de7-fe14c13d86d9`) |

**Disclosed, not hidden:** the `db-rls-auditor` pass returned `concerns` rather than `pass` —
solely because it self-flagged running one out-of-charter `Bash rm -f` on a session tool-output
cache file (not the DB, not the repo, not any PK artifact). Every actual SQL-safety finding was
independently re-derived from live catalog state and has no gap. Full record:
`docs/briefs/results/ui-set-post-draft-status-v1-revoke-review-record-v1.md`.

## 4. What this does NOT touch

- No change to `postgres` or `retool_ui`'s own access — both keep their distinct grants.
- No change to `public.draft_set_status` (its grant layer was already closed in June 2026,
  `D-2026-06-16-002` — separate, prior, unrelated lane).
- No edit to `m.ui_set_post_draft_status_v1`'s function body — its own free-text `p_actor`
  design defect is addressed by the separate approval-provenance fence (priority 6 card), not by
  this grant change.

## 5. Exact-phrase authorization (PK's, if given)

> `PK APPROVES GATE-2 APPLY UI-SET-POST-DRAFT-STATUS-V1-REVOKE HASH a08dbdc4`

## 6. Apply sequence (only after §5 is given)

1. Execute the REVOKE statement (§2) exactly as frozen — single statement, no transaction wrapper needed (single DDL statement is implicitly atomic).
2. Post-apply verification (read-only, immediate): `has_function_privilege('postgres', ..., 'EXECUTE')` = true, `has_function_privilege('retool_ui', ..., 'EXECUTE')` = true, `has_function_privilege('anon', ..., 'EXECUTE')` = false, `has_function_privilege('authenticated', ..., 'EXECUTE')` = false.
3. Re-pull `get_advisors(security)` and confirm the two `ui_set_post_draft_status_v1` WARN lints (0028/0029) clear.
4. **Named runtime proof (do not manufacture a test draft):** the next real Retool-panel approve/reject/schedule action still succeeds — confirms `retool_ui` unaffected under real use, not just a grants check.
5. Record the result per `docs/briefs/_template_result.md`, referencing this card and the review record.

## 7. Rollback (if ever needed post-apply)

```sql
GRANT EXECUTE ON FUNCTION m.ui_set_post_draft_status_v1(uuid, text, timestamp with time zone, text) TO PUBLIC;
```
Confirmed by `db-rls-auditor` to restore the exact byte-identical pre-state ACL.
