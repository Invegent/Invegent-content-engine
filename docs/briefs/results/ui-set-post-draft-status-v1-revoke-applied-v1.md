# Result — `m.ui_set_post_draft_status_v1` PUBLIC-EXECUTE REVOKE — APPLIED

**Date:** 2026-08-01 Sydney · **Tier:** T2 (production ACL change) · **Lane class:** SAFETY_GATE
**Status:** **APPLIED — LIVE.**
**Authorization:** PK Gate-2, 2026-08-01 final sitting item 4, relayed via `local_aac5adf2-…`
(CGU planning): *"Proceed separately with the exact reviewed grant-revoke Gate-2 apply."*
**Governing:** `docs/briefs/gate2-sitting-card-ui-set-post-draft-status-v1-revoke-v1.md`,
`docs/briefs/results/ui-set-post-draft-status-v1-revoke-review-record-v1.md`

---

## 1. What was applied

```sql
REVOKE EXECUTE ON FUNCTION m.ui_set_post_draft_status_v1(uuid, text, timestamp with time zone, text)
  FROM PUBLIC, anon, authenticated;
```

Frozen SQL hash `a08dbdc46805b84a57b3f96ca1de271eb426a551d89c26459c4f400710c5e361`.

## 2. Pre-apply drift check (immediately before, per authorization terms)

- Frozen file re-hashed fresh: byte-identical to `a08dbdc4…`.
- Live `proacl` re-read fresh: `{=X/postgres, postgres=X/postgres, retool_ui=X/postgres}` —
  byte-identical to what `db-rls-auditor` verified in review. No drift on either side.

## 3. Apply and post-apply verification

Executed as a single statement. Post-apply, re-read live:

| Check | Result |
|---|---|
| New `proacl` | `{postgres=X/postgres, retool_ui=X/postgres}` — `PUBLIC` entry gone |
| `has_function_privilege('postgres', …, 'EXECUTE')` | `true` — unaffected |
| `has_function_privilege('retool_ui', …, 'EXECUTE')` | `true` — unaffected |
| `has_function_privilege('anon', …, 'EXECUTE')` | `false` — now correctly denied |
| `has_function_privilege('authenticated', …, 'EXECUTE')` | `false` — now correctly denied |
| Advisor re-pull (`get_advisors`, security) | Zero hits for `ui_set_post_draft_status_v1` — both prior WARN lints (0028/0029) cleared immediately |

`postgres` and `retool_ui` retain their own distinct grants exactly as predicted — the Retool admin
panel this function backs is unaffected.

## 4. Rollback (on file, not needed)

```sql
GRANT EXECUTE ON FUNCTION m.ui_set_post_draft_status_v1(uuid, text, timestamp with time zone, text) TO PUBLIC;
```

## 5. What this does NOT close

The function's own free-text `p_actor` parameter (which could still set `approved_by` to
arbitrary text if called) is unchanged — that gap is closed structurally by the approval-provenance
fence trigger (separate Gate-2 apply, same sitting), not by this grant change. This apply removes an
accidental exposure surface; it does not alter the function's behavior.

## 6. Non-claims

No other grant touched. No RLS change. No edit to the function body. No other object modified.
