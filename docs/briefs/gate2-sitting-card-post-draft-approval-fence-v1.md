# Gate-2 sitting card — `m.post_draft` approval-provenance fence

**For:** PK's next sitting, priority 6. **This card authorizes nothing by itself — it is
presented for PK to read and, if he chooses, act on using the exact phrase in §5.**

---

## 1. Drift check (required before presenting — result: NONE, clean to proceed)

Re-verified 2026-08-01, immediately before staging this card:
- Migration file hash: `2bd2ae1eb34dd872ae17483a8aec2e627578bf0ab8c7f3f93e2df986fbb68fff` — **byte-identical** to the hash `db-rls-auditor` and external review approved.
- Rollback file hash: `1a902c206e00a01f11e7a0b81f4a8dbc908d32fe10dbd8ab5f25c68ec1c48da2` — unchanged.
- Isolated branch `lane/post-draft-approval-fence`, commit `16e1b75` — working tree clean, not touched since review.
- Live: `m.guard_post_draft_approval_provenance()` does not exist, `trg_guard_post_draft_approval_provenance` does not exist, no migration version `20260801120000`/`20260801120001` in the applied ledger — **confirmed nothing has been applied yet.**

## 2. Design attestation

**Once this trigger is live, no caller — `draft_set_status`'s `p_approved_by`, `m.ui_set_post_draft_status_v1`'s `p_actor`, any future RPC, or raw SQL run as `postgres`/`service_role` — can make `approved_by` become trusted approval provenance unless it is exactly one of four values, each independently confirmed hardcoded (never caller-supplied) in its one legitimate writer: `'auto-agent-v1'`, `'manual'`, `'portal-client'`, `'manual-studio'`.** This closes the 2026-07-31 incident's exact mechanism for every current and future write path, not just the one raw-SQL statement that caused it.

**Stated limit (unchanged from Gate 1, repeated here so it isn't lost):** this constrains the *value* written, not *who* can write it. A determined actor already holding `postgres`/`service_role` access who knows the vocabulary could still write `approved_by='manual'` to blend in, or set the trigger's own override GUC. No real actor-identity system exists anywhere in ICE — that is a separate, larger, unaddressed architectural gap, not something this trigger claims to solve.

## 3. Review chain (complete)

| Stage | Result |
|---|---|
| Hermetic proof (`ef-builder`) | 18/18 PASS, 0 FAIL, 0 DEFECT — including the rev-3 NULL-bypass fix and zero regression |
| `branch-warden` | `safe` |
| `db-rls-auditor` | `pass`, zero must-fix — independently re-traced the NULL-fix truth table by hand, re-pulled all five writer functions live |
| External review | `agree`, risk `medium`, confidence `high`, zero pushback (`review_id` `19849fcf-952d-4956-bed8-f31831417603`) |

Full record: `docs/briefs/post-draft-approval-fence-gate1-brief-v1.md` (rev-3).

## 4. Exact migration (what would be applied)

File: `supabase/migrations/20260801120000_post_draft_approval_fence_guard_v1.sql` (on branch `lane/post-draft-approval-fence`, commit `16e1b75` — not on `main`, would need to be merged/applied from there).

```sql
CREATE OR REPLACE FUNCTION m.guard_post_draft_approval_provenance()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
BEGIN
  IF current_setting('m.allow_ungoverned_approval_provenance', true) = 'on' THEN
    RETURN NEW;
  END IF;

  IF NEW.approval_status IN ('approved','scheduled','published')
     AND (TG_OP = 'INSERT' OR NEW.approved_by IS DISTINCT FROM OLD.approved_by)
     AND (NEW.approved_by IS NULL
          OR NOT (NEW.approved_by = ANY (ARRAY['auto-agent-v1','manual','portal-client','manual-studio'])))
  THEN
    RAISE EXCEPTION
      'm.post_draft: approved_by=% cannot become approval provenance for status % — only a recognized governed source may approve a draft, regardless of caller, RPC, or raw SQL (set m.allow_ungoverned_approval_provenance=on to add a new governed source)',
      COALESCE(NEW.approved_by, '<NULL>'), NEW.approval_status
      USING ERRCODE = '23514';
  END IF;

  RETURN NEW;
END
$function$;

REVOKE ALL ON FUNCTION m.guard_post_draft_approval_provenance() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_guard_post_draft_approval_provenance ON m.post_draft;
CREATE TRIGGER trg_guard_post_draft_approval_provenance
  BEFORE INSERT OR UPDATE ON m.post_draft
  FOR EACH ROW
  WHEN (NEW.approval_status IN ('approved','scheduled','published'))
  EXECUTE FUNCTION m.guard_post_draft_approval_provenance();

-- plus a fail-closed presence/grant assert block (function exists, trigger exists on m.post_draft,
-- anon/authenticated hold no EXECUTE) that aborts the whole migration if anything didn't install
-- correctly — see the file itself for the full assert text.
```

## 5. Exact-phrase authorization (PK's, if given)

> `PK APPROVES GATE-2 APPLY POST-DRAFT-APPROVAL-FENCE-V1 HASH 2bd2ae1e ON lane/post-draft-approval-fence`

## 6. Apply sequence (only after §5 is given)

1. Merge/fast-forward `lane/post-draft-approval-fence` into `main` (or apply the migration file directly via `apply_migration` — either path, the applied bytes must match hash `2bd2ae1e…` exactly).
2. `apply_migration` the frozen file as a single submission (this matters — `db-rls-auditor` flagged that the assert block's atomicity depends on it running as one message/transaction).
3. Confirm the assert block did not raise (a clean apply implies this; check `list_migrations` shows the new version).
4. **Live dry-run verification, inside `BEGIN…ROLLBACK`, before declaring done:** attempt the incident's exact INSERT shape, and separately a `draft_set_status`/`ui_set_post_draft_status_v1`-shaped call with `approved_by`/`p_actor='PK'` — both must fail with `23514`. Roll back. Zero live data touched by this check.
5. Record the result per `docs/briefs/_template_result.md`, referencing this card and the brief.

## 7. Rollback (if ever needed post-apply)

File: `supabase/migrations/20260801120001_post_draft_approval_fence_guard_rollback_v1.sql`, hash `1a902c206e00a01f11e7a0b81f4a8dbc908d32fe10dbd8ab5f25c68ec1c48da2` — `DROP TRIGGER` then `DROP FUNCTION`, own fail-closed assert, confirmed by `db-rls-auditor` to correctly reverse in dependency order.
