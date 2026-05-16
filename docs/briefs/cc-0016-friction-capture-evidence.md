# cc-0016 — Friction Capture Evidence Attachments

**Brief ID:** cc-0016
**Version:** v1.0
**Status:** AUTHORED, PENDING_EXECUTION
**Authored:** 2026-05-16 Sydney
**Author:** Chat-side Claude with PK approval (session v2.76)
**Strategic anchor:** Extends cc-0014. Addresses the "words are a lossy codec for visual friction" gap exposed in v2.76 first-week capture pattern.
**Depends on:** cc-0014 complete + Day-19 verdict resolved. Does not depend on cc-0015 (parallel-executable).
**Schema:** modifies `friction.event` (adds attachment metadata columns). New Supabase Storage bucket.

---

## 1. Purpose

cc-0014's FAB captures observation text only. The first six manual captures in v2.71-v2.76 revealed the pattern: most friction PK files is visual ("the overview on clients is very spaced out", "the rows should be condensed", "the top side submenu keeps moving"). Words alone make these cases hard to triage days later, hard to communicate to anyone else, and hard to verify-as-resolved without manual screenshot comparison.

cc-0016 adds optional image (and later, optional file) attachments to the FAB and triage surfaces, stored in Supabase Storage, referenced from `friction.event.attachments` jsonb, and rendered inline in the case row on `/operations`.

The brief is intentionally narrow:
- **Image attachments only in v1.0** — JPG/PNG/WebP up to 5MB per file
- **Up to 3 attachments per event**
- **No PII redaction tooling** — PK is single operator, dashboard contents are PK's data
- **Video / GIF deferred to v1.1**

---

## 2. Scope summary

### In scope

- New Supabase Storage bucket `friction-evidence` with single-operator RLS
- `friction.event.attachments` jsonb column (array of attachment objects)
- FAB form gains optional drag-and-drop / paste / file-picker upload
- `/operations` case row renders thumbnail per attachment with click-to-zoom
- Lifecycle rule: attachments older than 18 months auto-deleted (storage cost cap)

### Out of scope

- Video attachments (v1.1)
- Audio / voice notes (v1.1 or later)
- PII detection / redaction (single-operator scope)
- Multi-tenant attachment scoping (no other operator)
- Attachment versioning (replace, don't version)
- Comments / annotation tools on attachments (display only)

### Rejected from initial framing

- **Storing attachments inline in `friction.event.raw_payload` as base64** — rejected. Inflates DB size, awkward to render, breaks the row-size limits at scale.
- **External image host (Imgur, Cloudinary)** — rejected. Introduces vendor dependency, privacy risk, and indirection. Supabase Storage is in-stack.
- **Auto-screenshot of current dashboard route on FAB submit** — rejected as v1.0 scope creep. Defer to v1.1 if PK uses it heavily.

---

## 3. Stage A — Storage bucket + schema column

### Pre-flight verification

```sql
-- Storage bucket must not already exist
SELECT name FROM storage.buckets WHERE name = 'friction-evidence';
-- Must return zero rows

-- attachments column must not exist on friction.event
SELECT column_name FROM information_schema.columns 
WHERE table_schema = 'friction' AND table_name = 'event' AND column_name = 'attachments';
-- Must return zero rows
```

### Migration

Migration name: `cc_0016_a_attachments_schema_and_bucket`.

```sql
-- Step 1: Storage bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'friction-evidence',
  'friction-evidence',
  false,  -- not public, signed URLs only
  5242880,  -- 5 MB per file
  ARRAY['image/jpeg', 'image/png', 'image/webp']
);

-- Step 2: RLS policies on the bucket
-- Note: storage.objects RLS is the actual enforcement layer for buckets.
CREATE POLICY "friction_evidence_authenticated_read"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'friction-evidence');

CREATE POLICY "friction_evidence_authenticated_insert"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'friction-evidence');

CREATE POLICY "friction_evidence_authenticated_delete"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'friction-evidence');

-- service_role bypasses RLS automatically.

-- Step 3: attachments column on friction.event
-- Schema: array of objects {storage_path, mime_type, filename_original, size_bytes, uploaded_at}
ALTER TABLE friction.event
  ADD COLUMN attachments jsonb DEFAULT '[]'::jsonb NOT NULL;

-- Validation: must be a JSON array (CHECK constraint)
ALTER TABLE friction.event
  ADD CONSTRAINT attachments_is_array
  CHECK (jsonb_typeof(attachments) = 'array');

-- Validation: max 3 attachments per event
ALTER TABLE friction.event
  ADD CONSTRAINT attachments_max_three
  CHECK (jsonb_array_length(attachments) <= 3);

CREATE INDEX ON friction.event ((jsonb_array_length(attachments))) WHERE jsonb_array_length(attachments) > 0;

-- Step 4: Optional helper view to surface attachment counts on case
CREATE OR REPLACE VIEW friction.case_with_attachment_count AS
SELECT 
  c.*,
  COALESCE(SUM(jsonb_array_length(e.attachments)), 0) AS attachment_count
FROM friction.case c
LEFT JOIN friction.event e ON e.case_id = c.case_id
GROUP BY c.case_id;

GRANT SELECT ON friction.case_with_attachment_count TO authenticated;
```

### V-checks for Stage A

V-A1 — bucket exists:
```sql
SELECT name, public, file_size_limit, allowed_mime_types FROM storage.buckets WHERE name = 'friction-evidence';
-- Must return 1 row, public=false, file_size_limit=5242880, allowed_mime_types=['image/jpeg','image/png','image/webp']
```

V-A2 — attachments column exists:
```sql
SELECT column_name, data_type, column_default FROM information_schema.columns 
WHERE table_schema = 'friction' AND table_name = 'event' AND column_name = 'attachments';
-- Must return: attachments, jsonb, '[]'::jsonb
```

V-A3 — CHECK constraints active:
```sql
-- Reject non-array
INSERT INTO friction.event (..., attachments) VALUES (..., '{"not": "array"}'::jsonb);
-- Must fail: attachments_is_array

-- Reject > 3 items
INSERT INTO friction.event (..., attachments) VALUES (..., '[{},{},{},{}]'::jsonb);
-- Must fail: attachments_max_three
```

V-A4 — RLS denies anon access:
```sql
SET ROLE anon;
SELECT name FROM storage.objects WHERE bucket_id = 'friction-evidence';
-- Must return zero rows (RLS filter)
RESET ROLE;
```

V-A5 — RLS allows authenticated upload + read round-trip (manual frontend test).

V-A6 — view returns expected shape:
```sql
SELECT case_id, case_title, attachment_count FROM friction.case_with_attachment_count LIMIT 5;
-- Must succeed, attachment_count must be integer ≥ 0
```

### Hard-stop conditions

- Migration fails
- V-A1, V-A2, V-A3, V-A6 fail
- V-A4 succeeds (overpermission — anon can list bucket contents)

### Rollback path

```sql
DROP VIEW IF EXISTS friction.case_with_attachment_count;
ALTER TABLE friction.event DROP CONSTRAINT IF EXISTS attachments_max_three;
ALTER TABLE friction.event DROP CONSTRAINT IF EXISTS attachments_is_array;
ALTER TABLE friction.event DROP COLUMN IF EXISTS attachments;
DROP POLICY IF EXISTS "friction_evidence_authenticated_delete" ON storage.objects;
DROP POLICY IF EXISTS "friction_evidence_authenticated_insert" ON storage.objects;
DROP POLICY IF EXISTS "friction_evidence_authenticated_read" ON storage.objects;
DELETE FROM storage.objects WHERE bucket_id = 'friction-evidence';
DELETE FROM storage.buckets WHERE name = 'friction-evidence';
```

Note: rollback deletes ALL attachments uploaded since Stage A. Use only during initial deployment, never after PK begins relying on attachments.

---

## 4. Stage B — FAB upload UX

### Scope

FAB form gains an attachment surface above the Submit button:

- Drag-and-drop zone with prompt: "Drag images here, paste from clipboard, or click to select"
- Paste handler (Ctrl+V) accepts clipboard images
- File-picker fallback (input type=file, multiple, accept=image/jpeg,image/png,image/webp)
- Selected attachments shown as thumbnails with remove button per attachment
- Hard limit visible: "Up to 3 images, 5MB each"

### Upload flow

1. User selects file(s) via any of the three input methods
2. Frontend validates: MIME type in allowed list, size ≤ 5MB, count + existing ≤ 3
3. Frontend uploads to `friction-evidence/{event_id_placeholder}/{filename}` using Supabase JS client
4. On upload success: collect `{storage_path, mime_type, filename_original, size_bytes, uploaded_at}` for each
5. On FAB Submit: pass attachments array to `friction.fn_emit_manual_event` (extended signature, Stage C)
6. Server-side: rename uploaded files from `{event_id_placeholder}/` to `{actual_event_id}/` (or accept the placeholder path since event_id is generated server-side)

**Path naming decision (chosen):** generate event_id on the **client** before upload (UUID v4), use it as the storage path prefix, then pass that same UUID to `fn_emit_manual_event` as `p_event_id`. Function uses the provided UUID. No rename step. This is cleaner than placeholder-then-rename.

### Frontend

- `app/components/FrictionAttachmentPicker.tsx` — drag/drop/paste/picker, thumbnail strip, validation, upload progress
- `app/components/FrictionFAB.tsx` — integrates AttachmentPicker, generates event_id client-side, passes to RPC

### V-checks for Stage B

V-B1 — drag-and-drop accepts a single JPG, shows thumbnail, uploads to bucket → row in `storage.objects`.

V-B2 — paste accepts a clipboard screenshot, same flow.

V-B3 — file-picker accepts up to 3 files in one select, all upload.

V-B4 — validation: reject non-image MIME (try uploading a .txt). Reject > 5MB. Reject 4th attachment.

V-B5 — submit flow round-trip: file + observation_text → row in `friction.event` with `attachments` jsonb populated, file in `storage.objects` at expected path.

V-B6 — performance: average upload + submit time for 1 attachment + observation ≤ 30s (was 15s without attachment in cc-0014 V-D5; +15s is allowance for upload).

### Hard-stop conditions

- Upload fails for any allowed MIME type
- Validation fails to reject invalid files
- V-B5 leaves orphaned storage rows (file in bucket but not referenced in friction.event)
- V-B6 average > 30s

### Rollback path

Remove `FrictionAttachmentPicker` component, revert `FrictionFAB` to cc-0014 text-only form. Backend unchanged (attachments column accepts empty array).

---

## 5. Stage C — Extended emit function

### Scope

Extend `friction.fn_emit_manual_event` to accept attachments. Maintain backward compatibility (existing callers without attachments still work).

### Backend additions

Migration name: `cc_0016_c_emit_manual_event_with_attachments`.

```sql
CREATE OR REPLACE FUNCTION friction.fn_emit_manual_event(
  p_observation_text  text,
  p_severity          text,
  p_category          text,
  p_current_route     text DEFAULT NULL,
  p_related_object    jsonb DEFAULT NULL,
  p_notes             text DEFAULT NULL,
  p_event_id          uuid DEFAULT NULL,         -- NEW: caller may supply
  p_attachments       jsonb DEFAULT '[]'::jsonb  -- NEW: array of attachment metadata
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = friction, public
AS $$
DECLARE
  v_event_id uuid;
  v_severity text;
  v_category text;
  v_problem_key text;
  v_dedupe_fingerprint text;
  v_related_object jsonb;
  v_attachment jsonb;
BEGIN
  -- Existing validation (unchanged from cc-0014)
  IF p_observation_text IS NULL OR length(trim(p_observation_text)) < 5 THEN
    RAISE EXCEPTION 'observation_text required and must be >= 5 characters';
  END IF;

  v_severity := COALESCE(p_severity, 'info');
  IF v_severity NOT IN ('info', 'warn', 'critical') THEN
    RAISE EXCEPTION 'severity must be info, warn, or critical';
  END IF;

  v_category := COALESCE(p_category, 'unclassified');
  IF NOT EXISTS (SELECT 1 FROM friction.category WHERE category_code = v_category AND is_active = true) THEN
    RAISE EXCEPTION 'category % is not active', v_category;
  END IF;

  -- NEW: attachments validation
  IF jsonb_typeof(p_attachments) != 'array' THEN
    RAISE EXCEPTION 'attachments must be a JSON array';
  END IF;

  IF jsonb_array_length(p_attachments) > 3 THEN
    RAISE EXCEPTION 'attachments limited to 3 per event';
  END IF;

  -- Per-attachment structure check
  FOR v_attachment IN SELECT jsonb_array_elements(p_attachments) LOOP
    IF v_attachment->>'storage_path' IS NULL OR v_attachment->>'mime_type' IS NULL THEN
      RAISE EXCEPTION 'each attachment must include storage_path and mime_type';
    END IF;
    IF v_attachment->>'mime_type' NOT IN ('image/jpeg', 'image/png', 'image/webp') THEN
      RAISE EXCEPTION 'attachment mime_type % not allowed', v_attachment->>'mime_type';
    END IF;
  END LOOP;

  -- Existing fields (unchanged)
  v_problem_key := lower(regexp_replace(substring(p_observation_text from 1 for 50), '[^a-z0-9]+', '_', 'g'));
  v_related_object := COALESCE(p_related_object, '{}'::jsonb);
  IF p_current_route IS NOT NULL THEN
    v_related_object := v_related_object || jsonb_build_object('dashboard_route', p_current_route);
  END IF;
  v_dedupe_fingerprint := md5('manual' || '|' || v_problem_key || '|' || v_related_object::text || '|' || v_category);

  -- Use provided event_id or generate new
  v_event_id := COALESCE(p_event_id, gen_random_uuid());

  INSERT INTO friction.event (
    event_id, source, source_event_id, observed_at, severity, category, category_source,
    reported_by, problem_key, observation_text, related_object, raw_payload, dedupe_fingerprint,
    attachments
  ) VALUES (
    v_event_id,
    'manual',
    'manual/' || v_event_id::text,
    now(),
    v_severity,
    v_category,
    CASE WHEN p_category IS NOT NULL THEN 'manual_at_capture' ELSE 'emitter_default' END,
    'pk',
    v_problem_key,
    p_observation_text,
    v_related_object,
    jsonb_build_object('form_version', 'v2', 'notes', p_notes),
    v_dedupe_fingerprint,
    p_attachments
  );

  RETURN v_event_id;
END $$;

-- Backward compatibility: keep the cc-0014 signature as an overload that calls the new one
-- (PostgreSQL handles this via parameter defaults if signature stays same; explicit overload below
-- for clarity if a separate function is preferred)

REVOKE EXECUTE ON FUNCTION friction.fn_emit_manual_event(text, text, text, text, jsonb, text, uuid, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION friction.fn_emit_manual_event(text, text, text, text, jsonb, text, uuid, jsonb) TO authenticated, service_role;
```

**Note on function signature change:** because we're adding two parameters with defaults, PostgreSQL allows callers using the cc-0014 signature to continue working. No separate overload needed; the original 6-arg call resolves to the new 8-arg function with NULL/empty defaults for the new params.

### V-checks for Stage C

V-C1 — backward-compatible call (cc-0014 6-arg form):
```sql
SELECT friction.fn_emit_manual_event(
  'cc-0016-test/v-c1 backward-compat smoke',
  'info',
  'operator_friction',
  '/test',
  NULL,
  'test note'
);
-- Must succeed, return uuid, attachments column = '[]'
```

V-C2 — new call with attachments:
```sql
SELECT friction.fn_emit_manual_event(
  p_observation_text := 'cc-0016-test/v-c2 with attachments',
  p_severity := 'info',
  p_category := 'operator_friction',
  p_event_id := '00000000-0000-0000-0000-cc0016c001'::uuid,
  p_attachments := '[
    {"storage_path": "00000000-0000-0000-0000-cc0016c001/test1.png", "mime_type": "image/png", "filename_original": "test1.png", "size_bytes": 12345, "uploaded_at": "2026-05-16T00:00:00Z"}
  ]'::jsonb
);
-- Must return the provided uuid
-- Verify row has attachments jsonb populated correctly
```

V-C3 — validation rejects bad input:
```sql
-- Too many attachments
SELECT friction.fn_emit_manual_event(
  'cc-0016-test/v-c3 too many',
  'info',
  'operator_friction',
  p_attachments := '[{},{},{},{}]'::jsonb
);
-- Must fail: attachments limited to 3

-- Bad mime type
SELECT friction.fn_emit_manual_event(
  'cc-0016-test/v-c3 bad mime',
  'info',
  'operator_friction',
  p_attachments := '[{"storage_path": "x", "mime_type": "video/mp4"}]'::jsonb
);
-- Must fail: attachment mime_type video/mp4 not allowed
```

V-C4 — test row cleanup:
```sql
DELETE FROM friction.event WHERE observation_text LIKE 'cc-0016-test/%';
```

### Hard-stop conditions

- Function fails to deploy
- V-C1 breaks cc-0014 callers (backward incompatibility)
- V-C2 fails
- V-C3 fails to reject invalid input

### Rollback path

Restore cc-0014 signature:
```sql
DROP FUNCTION IF EXISTS friction.fn_emit_manual_event(text, text, text, text, jsonb, text, uuid, jsonb);
-- Restore cc-0014 6-arg version
```

---

## 6. Stage D — Attachment display on /operations

### Scope

Case rows on `/operations` show attachment thumbnails when present. Click to zoom (lightbox modal). Triage form shows attachments inline.

### Backend

No new backend. `friction.fn_recent_cases` (cc-0015 Stage B extension or cc-0014 baseline) already returns case data. Add to RPC: attachment metadata pulled from underlying events via aggregation.

Updated `fn_recent_cases` (additive to cc-0015 Stage B version):

```sql
-- Add to RETURNS TABLE: attachments_summary jsonb
-- Add to CTE: aggregate attachment counts and a sample storage_path per case
```

Alternatively, simpler: frontend fetches attachments separately via Supabase JS using event_ids from the case row's underlying events. Trade-off: extra round-trip per case but cleaner separation.

**Decision:** add `attachments_summary` to `fn_recent_cases` return. Single round-trip per page load.

### Frontend

- `app/operations/CaseRow.tsx` — render thumbnail strip when `attachments_summary.count > 0`
- `app/components/AttachmentThumbnail.tsx` — fetches signed URL from Supabase Storage on mount, displays thumbnail, click to open lightbox
- `app/components/AttachmentLightbox.tsx` — fullscreen modal, keyboard navigation, close on Esc
- Signed URLs cached client-side for the session (avoid re-signing on every render)

### V-checks for Stage D

V-D1 — manual: file a case with 1 attachment via FAB → open /operations → thumbnail visible.

V-D2 — manual: click thumbnail → lightbox opens, image displays at native resolution.

V-D3 — manual: case with 3 attachments shows 3 thumbnails in row.

V-D4 — signed URL expiry: thumbnails work after 30s, 2 min, 10 min (signed URL TTL behaviour).

### Hard-stop conditions

- Thumbnails don't render
- Lightbox doesn't open
- V-D4: signed URLs expire mid-session causing broken images

### Rollback path

Remove AttachmentThumbnail + AttachmentLightbox components. Case rows render without attachment surfaces.

---

## 7. Stage E — Lifecycle / cleanup

### Scope

Storage cost cap: attachments older than 18 months get auto-deleted along with their reference from `friction.event.attachments`. Light-touch pg_cron job.

### Backend

Migration name: `cc_0016_e_attachment_lifecycle`.

```sql
CREATE OR REPLACE FUNCTION friction.fn_cleanup_old_attachments()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = friction, storage, public
AS $$
DECLARE
  v_cutoff timestamptz := now() - INTERVAL '18 months';
  v_deleted_event_count integer := 0;
  v_deleted_file_count integer := 0;
  v_event_record record;
  v_attachment jsonb;
BEGIN
  -- Find events older than cutoff with attachments
  FOR v_event_record IN 
    SELECT event_id, attachments 
    FROM friction.event 
    WHERE observed_at < v_cutoff 
      AND jsonb_array_length(attachments) > 0
  LOOP
    -- Delete each attached file from storage
    FOR v_attachment IN SELECT jsonb_array_elements(v_event_record.attachments) LOOP
      DELETE FROM storage.objects 
      WHERE bucket_id = 'friction-evidence' 
        AND name = v_attachment->>'storage_path';
      v_deleted_file_count := v_deleted_file_count + 1;
    END LOOP;
    
    -- Clear attachments array on the event
    UPDATE friction.event 
    SET attachments = '[]'::jsonb 
    WHERE event_id = v_event_record.event_id;
    
    v_deleted_event_count := v_deleted_event_count + 1;
  END LOOP;
  
  RETURN jsonb_build_object(
    'cutoff_date', v_cutoff,
    'events_processed', v_deleted_event_count,
    'files_deleted', v_deleted_file_count,
    'completed_at', now()
  );
END $$;

REVOKE EXECUTE ON FUNCTION friction.fn_cleanup_old_attachments() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION friction.fn_cleanup_old_attachments() TO service_role;

-- pg_cron job: weekly Sunday 02:30 UTC (low-traffic window)
SELECT cron.schedule(
  'friction-attachment-cleanup-weekly',
  '30 2 * * 0',
  $$SELECT friction.fn_cleanup_old_attachments();$$
);
```

### V-checks for Stage E

V-E1 — function deploys + is callable.
V-E2 — pg_cron job scheduled:
```sql
SELECT jobname, schedule, active FROM cron.job WHERE jobname = 'friction-attachment-cleanup-weekly';
-- Must return 1 row, active=true
```
V-E3 — dry-run: seed a synthetic event with observed_at = 19 months ago, attachments array with 1 entry → call cleanup → verify storage row deleted + attachments cleared.

### Hard-stop conditions

- Function fails to deploy
- pg_cron schedule not registered
- V-E3 deletes wrong events (touches events newer than 18 months)

### Rollback path

```sql
SELECT cron.unschedule('friction-attachment-cleanup-weekly');
DROP FUNCTION IF EXISTS friction.fn_cleanup_old_attachments();
```

Note: this only stops future cleanups. Already-deleted attachments cannot be recovered.

---

## 8. Stage sequencing rollback matrix

| Failed stage | Keep prior? | Roll back what? | Can cc-0016 proceed? |
|---|---|---|---|
| Stage A | n/a | Drop bucket + RLS + column + view | No — no foundation |
| Stage B | Yes (A) | Remove FrictionAttachmentPicker | Schema exists, no UI to populate |
| Stage C | Yes (A, B) | Restore cc-0014 fn signature | UI can upload but submit fails |
| Stage D | Yes (A-C) | Remove display components | Capture works, attachments invisible — DEFECT |
| Stage E | Yes (A-D) | Unschedule cron, drop fn | Storage grows indefinitely — operationally acceptable for <18mo |

**Stage D is the closing piece** — without display, the upload UX has no purpose. Hard-stop on Stage D failure means rolling back B and C as well (capture without display creates orphan storage).

---

## 9. D-01 framing

Fire one D-01 before Stage A. Questions:

1. Is 5MB per-file + 3 attachments per event the right ceiling? (Or too restrictive / too permissive?)
2. Is the 18-month auto-delete lifecycle correct? Or should it be 12 months / 24 months / never?
3. Are the chosen MIME types complete? Missing GIF? (GIF arguably wanted for short screen captures.)
4. Is client-side UUID generation for event_id (path naming) a security risk?
5. Should attachments be visible in the FAB *retroactively* (edit an existing event's attachments)? Brief currently says no — attachments at capture only.
6. Is the cleanup function delete-without-archive an irreversible-data-loss risk that requires PK approval per execution?
7. Should the cleanup job log to `friction.emit_error` with a special source = 'attachment_cleanup' for audit trail?

---

## 10. Open decisions for stage execution

1. **Path naming convention** — `{event_id}/{original_filename}` or `{event_id}/{timestamp}_{counter}.{ext}`? Recommend the latter for uniqueness if multiple files have the same name.
2. **Lightbox library** — use a minimal hand-rolled component (no dep) or pull in something like `yet-another-react-lightbox`? Recommend hand-rolled to avoid dep bloat.
3. **Triage form attachment editing** — can PK *add* attachments to an existing case during triage? Brief currently says no. Reconsider during Stage D execution.

---

## 11. Estimated effort

- Stage A: 1 hour schema + bucket + RLS testing
- Stage B: 3-4 hours frontend (drag/drop is fiddly)
- Stage C: 30 min RPC + 1 hour V-checks
- Stage D: 2-3 hours frontend (lightbox + signed URL caching)
- Stage E: 30 min RPC + 1 hour V-checks

**Total: ~8-10 hours focused work over ~2 sessions.** Recommended split: schema + FAB upload in session 1, emit fn + display + lifecycle in session 2.

---

## 12. Post-cc-0016 commitments

### Pass path

Unlocks visual evidence on every captured case, dramatically improving triage quality + future-reviewer comprehension.

Does not unlock:
- Video/audio attachments (v1.1 decision)
- Annotation tooling (out of scope)
- Customer-shared attachments (out of scope)

### Fail path

If Stage A or D fails — full rollback. If Stages B/C succeed but D fails — orphan storage. Rollback B+C too.

Existing cc-0014 register continues working text-only.

---

*Brief cc-0016 v1.0. Authored 2026-05-16. Status: PENDING_EXECUTION. Awaiting cc-0014 Day-19 verdict resolution before execution. Parallel-executable with cc-0015 — does not depend on it.*
