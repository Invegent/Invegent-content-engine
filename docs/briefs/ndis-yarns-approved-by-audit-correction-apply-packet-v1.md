# Apply packet — `approved_by='PK'` audit correction, draft `4c8578ba` (v1)

**Status: PREPARED — NOT APPLIED. Blocked on ONE PK decision (§2: the replacement value).**
**Tier:** T3 (production DML on an audit field) · **Lane class:** SAFETY_GATE
**Target:** `m.post_draft` `post_draft_id = 4c8578ba-46bf-4e2e-be0b-3d1ea9c5c28e` — exactly 1 row
**Origin:** open item 1 of the v6.101 remediation record; investigation §5.3 ("`approved_by='PK'`
must not stand as-is") — which names the defect but does **not** specify the replacement value.

---

## 1. Live pre-state (read-only, verified 2026-08-01)

| Field | Value |
|---|---|
| `approval_status` | `approved` |
| `approved_by` | **`PK`** |
| `approved_at` | `2026-07-31 01:48:09.76861+00` |
| `created_at` | `2026-07-31 01:48:09.76861+00` — **identical to `approved_at`** |
| `created_by` | `postgres` (raw SQL) |
| `video_status` | `published` |
| `slot_id` / `digest_item_id` / `auto_approval_scores` | NULL / NULL / NULL |
| `compliance_flags` | `[]` |
| `draft_format->>'source'` | `orchestrator_gate8_supervised` |

**`approved_at == created_at` is machine proof the row was born-approved inside the INSERT** — no
approval event ever occurred. This is the evidentiary basis for the correction and does not depend
on anyone's recollection.

**Vocabulary evidence (whole table, 2911 rows):** `'PK'` (uppercase) is a **vocabulary of one — this
row alone**. Human approvals in this system are `pk` (12) and `pk@invegent.com` (3). Proof-lane
drafts are labelled with the *lane*, not a person: `cc-0089-audit-write-proof` (1, born-approved) and
`schedule-authority-goldenpath-proof` (1). Only 15 rows table-wide are born-approved.

## 2. ⛔ THE BLOCKING DECISION — replacement value (PK)

Not decidable from evidence; it is the permanent audit record, and **the prior value is not
recoverable from the DB afterwards** (§4).

| Option | Value | Trade-off |
|---|---|---|
| **A (recommended)** | `orchestrator_gate8_supervised` | Matches this row's own `draft_format.source`; follows the established proof-lane precedent; truthful (that lane did mint it); asserts no human approval; preserves provenance. |
| B | `NULL` | Cleanest denial, but indistinguishable from the 980 never-approved rows and loses provenance. `approval_status` stays `approved`, so the row reads approved-by-nobody. |
| C | `orchestrator_gate8_supervised_corrected_20260801` | Self-documenting in-field, but breaks the vocabulary and bakes a one-off format into production data. |
| D | *(no DML)* | Treat the git-side records as the correction. The row keeps asserting PK approved it. |

## 3. Blast radius — verified, not assumed

**Exactly one reader of `m.post_draft.approved_by` exists in the codebase:**
`supabase/functions/weekly-manager-report/index.ts:76` —
`COUNT(*) FILTER (WHERE (auto_approval_scores IS NULL OR approved_by NOT LIKE 'auto-%') AND approval_status='approved') AS manually_approved`.

This row has `auto_approval_scores IS NULL`, so it is counted as `manually_approved` **before and
after, under every option A/B/C** — the correction is **metric-neutral**. No other read path exists.
(`select_template`'s `approved_by` references are on `c.creative_template_assignment`, a different
table. `auto-approver` only writes. Migration hits are NULL-ing reset paths, not readers.)

**Triggers on `m.post_draft`** (all 4 enumerated live): `trg_post_draft_updated_at` (BEFORE UPDATE →
sets `updated_at`, expected) · `trg_handle_draft_rejection` (**UPDATE OF approval_status** — NOT
fired, this packet does not touch that column) · `trg_prevent_published_draft_delete` (DELETE only) ·
`trg_release_queue_on_asset_ready` (**UPDATE OF image_status, video_status** — NOT fired). **No
immutability trigger blocks this UPDATE.**

**Not touched:** `approval_status`, `approved_at`, `body`, any publish state, the live video, any
other row, any other client.

## 4. ⚠ Irreversibility note (the reason this needs a deliberate decision)

`m.post_draft` has **no history/audit table and no revision columns** — only `updated_at`. Overwriting
`approved_by` leaves **no in-DB trace of the prior value**. Correcting an audit field is itself an
untraceable mutation.

**Mitigation (already in place, and durable):** the original value `'PK'`, its timestamps, and the
full provenance are recorded byte-exact in git on `main` and pushed — investigation record
`docs/briefs/results/ndis-yarns-free-chat-post-investigation-result-v1.md` (v6.104) and remediation
record `…-video-remediation-record-v1.md` (v6.101). The pre-image is therefore preserved outside the
DB before any write. **Do not apply this packet before confirming both are on `origin/main`.**

## 5. Apply SQL — self-verifying, fail-closed, single statement

Substitute `<VALUE>` per §2 (option A shown). Aborts rather than writing the wrong thing.

```sql
DO $$
DECLARE v_n int;
BEGIN
  -- G1: pre-image must be EXACTLY the known-bad state, or abort untouched
  IF NOT EXISTS (
    SELECT 1 FROM m.post_draft
    WHERE post_draft_id = '4c8578ba-46bf-4e2e-be0b-3d1ea9c5c28e'
      AND approved_by = 'PK'
      AND approval_status = 'approved'
      AND approved_at = created_at            -- born-approved invariant
      AND created_by = 'postgres'
  ) THEN
    RAISE EXCEPTION 'STOP G1: pre-image mismatch — row already changed or misidentified; nothing written';
  END IF;

  UPDATE m.post_draft
     SET approved_by = 'orchestrator_gate8_supervised'   -- <VALUE>
   WHERE post_draft_id = '4c8578ba-46bf-4e2e-be0b-3d1ea9c5c28e'
     AND approved_by = 'PK';                              -- CAS guard
  GET DIAGNOSTICS v_n = ROW_COUNT;

  -- G2: exactly one row, never zero, never many
  IF v_n <> 1 THEN
    RAISE EXCEPTION 'STOP G2: expected ROW_COUNT=1, got %; rolled back', v_n;
  END IF;

  -- G3: untouched-field invariants must still hold
  IF NOT EXISTS (
    SELECT 1 FROM m.post_draft
    WHERE post_draft_id = '4c8578ba-46bf-4e2e-be0b-3d1ea9c5c28e'
      AND approval_status = 'approved'
      AND approved_at    = '2026-07-31 01:48:09.76861+00'
      AND video_status   = 'published'
  ) THEN
    RAISE EXCEPTION 'STOP G3: collateral change detected; rolled back';
  END IF;
END $$;
```

**Atomicity:** a single `DO $$…$$` block is one statement on one pooled call — any RAISE rolls the
whole thing back. Do **not** split it across calls (the cc-0079 Slice-2 non-composition failure).

## 6. Rollback — proven-shape, one-liner

```sql
UPDATE m.post_draft SET approved_by = 'PK'
 WHERE post_draft_id = '4c8578ba-46bf-4e2e-be0b-3d1ea9c5c28e'
   AND approved_by = 'orchestrator_gate8_supervised';   -- <VALUE>
```
Restores the exact pre-image byte-for-byte. `updated_at` will differ (trigger-set, unavoidable and
immaterial).

## 7. Post-apply verification (run immediately)

```sql
SELECT approved_by, approval_status, approved_at, created_at, video_status, updated_at
  FROM m.post_draft WHERE post_draft_id = '4c8578ba-46bf-4e2e-be0b-3d1ea9c5c28e';
```
Expect: `approved_by` = the chosen value · `approval_status='approved'` ·
`approved_at = created_at = 2026-07-31 01:48:09.76861+00` (unchanged) · `video_status='published'` ·
`updated_at` newly bumped. Then confirm `'PK'` returns zero rows table-wide.

## 8. What this does and does NOT close

**Closes:** the audit trail's false assertion that PK approved this copy.
**Does NOT close:** safeguard A (DB fence — no row INSERTable already-approved; the actual structural
fix), B (fail-closed compliance gate in publishers), C (proof-lane content policy), D (brand claims
register), or the separate suitability-row / ruling-E1 reconciliation. **This packet corrects one
row's record. It does not stop the next raw-SQL INSERT from doing exactly the same thing.**
