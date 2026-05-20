# cc-0016 — Friction Capture Evidence Attachments

**Brief ID:** cc-0016
**Version:** v1.1
**Status:** AUTHORED, PENDING_EXECUTION. Stage A APPLIED v2.97. Stage C patched v1.1 2026-05-20 for cc-0017b pipeline compatibility (see Stage C patch history).
**Authored:** 2026-05-16 Sydney (v1.0); patched 2026-05-20 Sydney (v1.1)
**Author:** Chat-side Claude with PK approval (session v2.76); patch by CCD with PK directive (session v2.97)
**Strategic anchor:** Extends cc-0014. Addresses the "words are a lossy codec for visual friction" gap exposed in v2.76 first-week capture pattern.
**Depends on:** cc-0014 complete + Day-19 verdict resolved. Does not depend on cc-0015 (parallel-executable).
**Schema:** modifies `friction.event` (adds attachment metadata columns). New Supabase Storage bucket.

## Version history

- **v1.0** (2026-05-16 Sydney) — initial authoring (session v2.76).
- **v1.1** (2026-05-20 Sydney) — Stage C patched after v2.97 preflight found cc-0017b pipeline drift. The original v1.0 Stage C proposed a direct `INSERT INTO friction.event` from `fn_emit_manual_event`, which was correct against the cc-0014 production state but would regress the cc-0017b unified emit pipeline (delegation through `friction.emit_event`) that landed during Wave 0a-0e (v2.81-v2.91). v1.1 rewrites Stage C to **extend `friction.emit_event` with a `p_attachments` parameter** (preserving the canonical pipeline) and **route `fn_emit_manual_event` through the extended `emit_event`** (preserving dedupe, case attachment via `fn_attach_or_create_inner_v1`, emission rule routing, source/condition validation, idempotent replay, and dynamic_context capture). Overload behaviour resolved explicitly via `DROP FUNCTION` of the pre-patch signatures before `CREATE`. Rollback section rewritten with the captured production-safe function bodies. Stage A is unchanged by this patch (already APPLIED v2.97).

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

## 5. Stage C — Extended emit function (PATCHED v1.1 — 2026-05-20)

### Scope

**Path X (selected v1.1):** Extend the cc-0017b unified emit pipeline by adding a `p_attachments` parameter to `friction.emit_event` (which becomes a 13-arg signature). `friction.fn_emit_manual_event` is rewritten to delegate through the extended `emit_event` (rather than do a direct INSERT as v1.0 proposed). This preserves dedupe via `fn_compute_dedupe_fingerprint_v1`, case attachment via `fn_attach_or_create_inner_v1`, emission rule routing, source/condition FK validation, idempotent replay on `unique_violation`, and `dynamic_context` capture — all behaviour that landed in cc-0017b Wave 0b and that the v1.0 brief was unaware of.

The function-layer attachment validation (array-shape, max-3, per-item `storage_path` + `mime_type`, MIME whitelist) lives at the `fn_emit_manual_event` layer for manual captures; a minimal array-shape + max-3 invariant is also enforced inside `emit_event` so that any future direct caller of `emit_event` with a non-conforming `p_attachments` is rejected at the canonical pipeline.

**Overload behaviour resolved explicitly:** the migration `DROP`s the existing pre-patch signatures (`friction.emit_event(12 args)` and `friction.fn_emit_manual_event(6 args)`) BEFORE creating the new signatures. Without these DROPs, PostgreSQL would keep both old and new as separate overloads, and the live dashboard's 6-arg FAB calls would continue resolving to the OLD `fn_emit_manual_event` — bypassing attachment support entirely. DROP-then-CREATE ensures a single function exists at each name post-apply, with the new behaviour reached via parameter-default resolution for the 6-arg call shape that the live FAB uses today.

### Backend additions

Migration name: `cc_0016_c_emit_manual_event_with_attachments`.

```sql
-- =============================================================================
-- cc-0016 Stage C — Path X — extend cc-0017b unified emit pipeline
-- =============================================================================
--
-- Step 1: DROP pre-patch fn_emit_manual_event (6-arg).
--   Required because the new 8-arg function is treated by PostgreSQL as a
--   DIFFERENT overload, not a replacement. Without this DROP, both signatures
--   would coexist and the live dashboard FAB (6-arg call shape) would continue
--   calling the OLD 6-arg function and miss attachment support.

DROP FUNCTION friction.fn_emit_manual_event(
  text, text, text, text, jsonb, text
);

-- Step 2: DROP pre-patch emit_event (12-arg).
--   Same overload-coexistence rationale — adding p_attachments creates a new
--   13-arg overload unless we drop the 12-arg first.

DROP FUNCTION friction.emit_event(
  text, text, text, text, timestamptz, jsonb, text, jsonb, text, text, text, jsonb
);

-- Step 3: CREATE the new 13-arg friction.emit_event with p_attachments.
--   Body is the cc-0017b production source captured at HEAD 307822b
--   (v2.97 sync close, 2026-05-20) plus two additions:
--     * p_attachments parameter (default '[]'::jsonb)
--     * attachments column populated in INSERT INTO friction.event
--   All other behaviour preserved verbatim:
--     * input validation (p_source / p_condition_key / p_problem_key /
--       p_source_event_id / p_observation_text / p_observed_at / p_reported_by /
--       p_severity_override / p_category_override)
--     * set_config('friction.emit_event_active', 'true', true)
--     * friction.source FK lookup (raises if inactive)
--     * friction.emission_rule lookup (raises if no enabled rule)
--     * case_policy = 'suppress' short-circuit (writes to friction.emit_error,
--       returns suppressed_by_rule)
--     * severity/category override merging
--     * v_final_context construction (severity_override + category_override
--       provenance)
--     * dedupe via friction.fn_compute_dedupe_fingerprint_v1
--     * unique_violation EXCEPTION → idempotent_replay return
--     * friction.fn_attach_or_create_inner_v1 case attachment
--     * UPDATE with qualified WHERE (the "THE FIX" preserved)

CREATE OR REPLACE FUNCTION friction.emit_event(
  p_source              text,
  p_condition_key       text,
  p_problem_key         text,
  p_source_event_id     text,
  p_observed_at         timestamptz,
  p_related_object      jsonb,
  p_observation_text    text,
  p_raw_payload         jsonb,
  p_reported_by         text  DEFAULT 'system',
  p_severity_override   text  DEFAULT NULL,
  p_category_override   text  DEFAULT NULL,
  p_dynamic_context     jsonb DEFAULT NULL,
  p_attachments         jsonb DEFAULT '[]'::jsonb   -- NEW (13th arg)
)
RETURNS TABLE(event_id uuid, case_id uuid, case_disposition text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'friction', 'public'
AS $$
DECLARE
  v_source_row       friction.source%ROWTYPE;
  v_rule             friction.emission_rule%ROWTYPE;
  v_dedupe           text;
  v_severity         text;
  v_category         text;
  v_category_source  text;
  v_event_id         uuid;
  v_case_id          uuid;
  v_disposition      text;
  v_inner            RECORD;
  v_final_context    jsonb;
  v_rule_default_sev text;
  v_rule_default_cat text;
BEGIN
  -- Input validation (preserved verbatim from cc-0017b production)
  IF p_source IS NULL OR length(trim(p_source)) = 0 THEN
    RAISE EXCEPTION 'emit_event: p_source is required' USING ERRCODE = 'P0001';
  END IF;
  IF p_condition_key IS NULL OR length(trim(p_condition_key)) = 0 THEN
    RAISE EXCEPTION 'emit_event: p_condition_key is required' USING ERRCODE = 'P0001';
  END IF;
  IF p_problem_key IS NULL OR length(trim(p_problem_key)) = 0 THEN
    RAISE EXCEPTION 'emit_event: p_problem_key is required' USING ERRCODE = 'P0001';
  END IF;
  IF p_source_event_id IS NULL OR length(trim(p_source_event_id)) = 0 THEN
    RAISE EXCEPTION 'emit_event: p_source_event_id is required (idempotency key)' USING ERRCODE = 'P0001';
  END IF;
  IF p_observation_text IS NULL OR length(trim(p_observation_text)) < 5 THEN
    RAISE EXCEPTION 'emit_event: p_observation_text required and must be >= 5 characters' USING ERRCODE = 'P0001';
  END IF;
  IF p_observed_at IS NULL THEN
    RAISE EXCEPTION 'emit_event: p_observed_at is required' USING ERRCODE = 'P0001';
  END IF;
  IF p_observed_at > now() + interval '5 minutes' THEN
    RAISE EXCEPTION 'emit_event: p_observed_at is in the future (clock skew?). value=%, now=%', p_observed_at, now()
      USING ERRCODE = 'P0001';
  END IF;
  IF p_reported_by IS NULL OR p_reported_by NOT IN ('system','pk','client','vendor','unknown') THEN
    RAISE EXCEPTION 'emit_event: p_reported_by must be one of system/pk/client/vendor/unknown; got %', p_reported_by
      USING ERRCODE = 'P0001';
  END IF;
  IF p_severity_override IS NOT NULL AND p_severity_override NOT IN ('info','warn','critical') THEN
    RAISE EXCEPTION 'emit_event: p_severity_override must be info/warn/critical or NULL; got %', p_severity_override
      USING ERRCODE = 'P0001';
  END IF;
  IF p_category_override IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM friction.category
       WHERE category_code = p_category_override AND is_active = true
    ) THEN
      RAISE EXCEPTION 'emit_event: p_category_override % is not an active friction.category code', p_category_override
        USING ERRCODE = 'P0001';
    END IF;
  END IF;

  -- NEW v1.1: attachments shape validation (array + max-3 invariant).
  -- Per-item validation lives in friction.fn_emit_manual_event for the manual
  -- path. Direct emit_event callers (cron emitters, triggers) typically pass
  -- attachments='[]' via the default; here we enforce only the canonical-shape
  -- invariant so any direct caller with a non-conforming p_attachments fails
  -- fast at the pipeline.
  IF jsonb_typeof(p_attachments) != 'array' THEN
    RAISE EXCEPTION 'emit_event: p_attachments must be a JSON array' USING ERRCODE = 'P0001';
  END IF;
  IF jsonb_array_length(p_attachments) > 3 THEN
    RAISE EXCEPTION 'emit_event: attachments limited to 3 per event' USING ERRCODE = 'P0001';
  END IF;

  PERFORM set_config('friction.emit_event_active', 'true', true);

  SELECT * INTO v_source_row FROM friction.source
   WHERE source_code = p_source AND is_active = true;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'emit_event: friction.source code % not found or inactive', p_source
      USING ERRCODE = 'P0001',
            HINT    = 'Register the source via INSERT INTO friction.source before emitting.';
  END IF;

  SELECT * INTO v_rule FROM friction.emission_rule
   WHERE source = p_source AND condition_key = p_condition_key AND enabled = true;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'emit_event: no enabled emission_rule for (source=%, condition_key=%)',
                    p_source, p_condition_key
      USING ERRCODE = 'P0001',
            HINT    = 'INSERT a row into friction.emission_rule before emitting under this condition_key.';
  END IF;

  IF v_rule.case_policy = 'suppress' THEN
    BEGIN
      INSERT INTO friction.emit_error
        (source, source_event_id, error_message, error_code, raw_payload, emitter_version)
      VALUES (
        p_source, p_source_event_id,
        format('emit_event: emission_rule.case_policy=suppress for (source=%s, condition_key=%s); event not written',
               p_source, p_condition_key),
        'POLICY-SUPPRESS',
        COALESCE(p_raw_payload, '{}'::jsonb),
        'cc-0017b-v1.0'
      );
    EXCEPTION WHEN OTHERS THEN NULL;
    END;
    RETURN QUERY SELECT NULL::uuid, NULL::uuid, 'suppressed_by_rule'::text;
    RETURN;
  END IF;

  v_rule_default_sev := COALESCE(v_rule.default_severity, v_source_row.default_severity);
  v_rule_default_cat := COALESCE(v_rule.default_category_code, v_source_row.default_category_code);

  v_severity := COALESCE(p_severity_override, v_rule_default_sev);
  v_category := COALESCE(p_category_override, v_rule_default_cat);

  v_category_source := CASE
    WHEN p_reported_by = 'pk' AND p_category_override IS NOT NULL THEN 'manual_at_capture'
    WHEN p_category_override IS NOT NULL                          THEN 'category_override'
    ELSE                                                              'emitter_default'
  END;

  v_final_context := COALESCE(p_dynamic_context, '{}'::jsonb);

  IF p_severity_override IS NOT NULL THEN
    v_final_context := v_final_context || jsonb_build_object(
      'severity_override', jsonb_build_object(
        'applied',        p_severity_override,
        'rule_default',   v_rule.default_severity,
        'source_default', v_source_row.default_severity,
        'effective_was',  v_rule_default_sev
      )
    );
  END IF;

  IF p_category_override IS NOT NULL THEN
    v_final_context := v_final_context || jsonb_build_object(
      'category_override', jsonb_build_object(
        'applied',        p_category_override,
        'rule_default',   v_rule.default_category_code,
        'source_default', v_source_row.default_category_code,
        'effective_was',  v_rule_default_cat
      )
    );
  END IF;

  IF v_final_context = '{}'::jsonb THEN v_final_context := NULL; END IF;

  v_dedupe := friction.fn_compute_dedupe_fingerprint_v1(p_source, p_problem_key, p_related_object);

  BEGIN
    INSERT INTO friction.event (
      event_id, source, source_event_id, observed_at,
      severity, category, category_source, reported_by,
      problem_key, observation_text, related_object, raw_payload,
      dedupe_fingerprint, dynamic_context, case_id,
      attachments                                  -- NEW v1.1
    )
    VALUES (
      gen_random_uuid(), p_source, p_source_event_id, p_observed_at,
      v_severity, v_category, v_category_source, p_reported_by,
      p_problem_key, p_observation_text, p_related_object, p_raw_payload,
      v_dedupe, v_final_context, NULL,
      COALESCE(p_attachments, '[]'::jsonb)         -- NEW v1.1
    )
    RETURNING friction.event.event_id INTO v_event_id;

  EXCEPTION WHEN unique_violation THEN
    SELECT e.event_id, e.case_id INTO v_event_id, v_case_id
    FROM friction.event e
    WHERE e.source = p_source AND e.source_event_id = p_source_event_id;
    v_disposition := 'idempotent_replay';
    RETURN QUERY SELECT v_event_id, v_case_id, v_disposition;
    RETURN;
  END;

  SELECT * INTO v_inner FROM friction.fn_attach_or_create_inner_v1(
    v_dedupe, p_observed_at, v_severity, v_category, p_problem_key, p_observation_text
  );
  v_case_id     := v_inner.case_id;
  v_disposition := v_inner.disposition;

  -- THE FIX: qualify event_id in WHERE clause to disambiguate from RETURNS TABLE OUT param
  UPDATE friction.event SET case_id = v_case_id WHERE friction.event.event_id = v_event_id;

  RETURN QUERY SELECT v_event_id, v_case_id, v_disposition;
END
$$;

REVOKE EXECUTE ON FUNCTION friction.emit_event(
  text, text, text, text, timestamptz, jsonb, text, jsonb, text, text, text, jsonb, jsonb
) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION friction.emit_event(
  text, text, text, text, timestamptz, jsonb, text, jsonb, text, text, text, jsonb, jsonb
) TO authenticated, service_role;

-- Step 4: CREATE the new 8-arg friction.fn_emit_manual_event.
--   Delegates to the extended emit_event. Adds attachment validation
--   (array-shape + max-3 + per-item storage_path + mime_type + MIME whitelist)
--   BEFORE forwarding to emit_event. Accepts p_event_id as a client-supplied
--   UUID that becomes the source_event_id prefix (NOT the friction.event.event_id
--   itself — that remains generated inside emit_event for consistency with
--   other emitters). The storage_path strings inside p_attachments may use
--   the client UUID as a path prefix; this is a convention enforced by the
--   dashboard FAB (Stage B), not by the SQL layer.

CREATE OR REPLACE FUNCTION friction.fn_emit_manual_event(
  p_observation_text  text,
  p_severity          text,
  p_category          text,
  p_current_route     text  DEFAULT NULL,
  p_related_object    jsonb DEFAULT NULL,
  p_notes             text  DEFAULT NULL,
  p_event_id          uuid  DEFAULT NULL,            -- NEW v1.1
  p_attachments       jsonb DEFAULT '[]'::jsonb      -- NEW v1.1
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'friction', 'public'
AS $$
DECLARE
  v_problem_key      text;
  v_related_object   jsonb;
  v_event_id         uuid;
  v_case_id          uuid;
  v_disposition      text;
  v_attachment       jsonb;
  v_source_event_id  text;
BEGIN
  -- Existing input validation (preserved verbatim from cc-0017b production)
  IF p_observation_text IS NULL OR length(trim(p_observation_text)) < 5 THEN
    RAISE EXCEPTION 'observation_text required and must be >= 5 characters';
  END IF;
  IF COALESCE(p_severity, 'info') NOT IN ('info', 'warn', 'critical') THEN
    RAISE EXCEPTION 'severity must be info, warn, or critical';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM friction.category
     WHERE category_code = COALESCE(p_category, 'unclassified')
       AND is_active = true
  ) THEN
    RAISE EXCEPTION 'category % is not active', COALESCE(p_category, 'unclassified');
  END IF;

  -- NEW v1.1: per-attachment shape + MIME whitelist validation.
  IF jsonb_typeof(p_attachments) != 'array' THEN
    RAISE EXCEPTION 'attachments must be a JSON array';
  END IF;
  IF jsonb_array_length(p_attachments) > 3 THEN
    RAISE EXCEPTION 'attachments limited to 3 per event';
  END IF;
  FOR v_attachment IN SELECT jsonb_array_elements(p_attachments) LOOP
    IF v_attachment->>'storage_path' IS NULL OR v_attachment->>'mime_type' IS NULL THEN
      RAISE EXCEPTION 'each attachment must include storage_path and mime_type';
    END IF;
    IF v_attachment->>'mime_type' NOT IN ('image/jpeg', 'image/png', 'image/webp') THEN
      RAISE EXCEPTION 'attachment mime_type % not allowed', v_attachment->>'mime_type';
    END IF;
  END LOOP;

  -- Existing field computation preserved.
  v_problem_key := lower(regexp_replace(substring(p_observation_text from 1 for 50), '[^a-z0-9]+', '_', 'g'));
  v_related_object := COALESCE(p_related_object, '{}'::jsonb);
  IF p_current_route IS NOT NULL THEN
    v_related_object := v_related_object || jsonb_build_object('dashboard_route', p_current_route);
  END IF;

  -- Compose source_event_id. If caller supplied p_event_id (Stage B FAB after
  -- the v1.1 dashboard update), use it as the prefix so the storage path on
  -- the bucket side and the source_event_id on the row side share a
  -- correlatable UUID. Otherwise generate one (preserves cc-0017b behaviour
  -- for 6-arg callers via parameter defaults).
  v_source_event_id := 'manual/' || COALESCE(p_event_id, gen_random_uuid())::text;

  -- Delegate to extended emit_event (preserves unified pipeline).
  SELECT event_id, case_id, case_disposition
  INTO v_event_id, v_case_id, v_disposition
  FROM friction.emit_event(
    p_source             := 'manual',
    p_condition_key      := 'manual_fab',
    p_problem_key        := v_problem_key,
    p_source_event_id    := v_source_event_id,
    p_observed_at        := now(),
    p_related_object     := v_related_object,
    p_observation_text   := p_observation_text,
    p_raw_payload        := jsonb_build_object(
      'form_version', CASE WHEN jsonb_array_length(p_attachments) > 0 THEN 'v2' ELSE 'v1' END,
      'notes',        p_notes
    ),
    p_reported_by        := 'pk',
    p_severity_override  := COALESCE(p_severity, 'info'),
    p_category_override  := CASE WHEN p_category IS NOT NULL THEN p_category ELSE NULL END,
    p_dynamic_context    := jsonb_build_object(
      'fab_emission',  true,
      'current_route', p_current_route
    ),
    p_attachments        := p_attachments                  -- NEW v1.1: forward to emit_event
  );

  RETURN v_event_id;
END
$$;

REVOKE EXECUTE ON FUNCTION friction.fn_emit_manual_event(
  text, text, text, text, jsonb, text, uuid, jsonb
) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION friction.fn_emit_manual_event(
  text, text, text, text, jsonb, text, uuid, jsonb
) TO authenticated, service_role;
```

**Note on function signature change (v1.1 correction):** Because adding parameters with different defaults creates a NEW PostgreSQL function (distinct from the pre-patch signature by argument-list identity), the migration MUST `DROP` the pre-patch 6-arg `fn_emit_manual_event` and 12-arg `emit_event` BEFORE creating the new signatures. The v1.0 brief's comment ("PostgreSQL handles this via parameter defaults if signature stays same") was incorrect — parameter-default resolution only works when there is a single function at the name. The DROP-then-CREATE pattern restores that single-function invariant, and 6-arg callers (the live FAB at dashboard.invegent.com) then resolve to the new 8-arg function via defaults.

### V-checks for Stage C

V-C1 — backward-compatible 6-arg call still works and creates `attachments = '[]'`:
```sql
SELECT friction.fn_emit_manual_event(
  'cc-0016-test/v-c1 backward-compat smoke',
  'info',
  'operator_friction',
  '/test',
  NULL,
  'test note'
);
-- Must succeed, return uuid, friction.event row has attachments='[]'::jsonb
-- (also verify the row went through emit_event: case_id IS NOT NULL on the
--  new row, or case_disposition was returned via the unified pipeline).
```

V-C2 — 8-arg call with valid attachment JSON:
```sql
SELECT friction.fn_emit_manual_event(
  p_observation_text := 'cc-0016-test/v-c2 with attachments',
  p_severity         := 'info',
  p_category         := 'operator_friction',
  p_event_id         := '00000000-0000-0000-0000-cc0016c001'::uuid,
  p_attachments      := '[
    {"storage_path": "00000000-0000-0000-0000-cc0016c001/test1.png", "mime_type": "image/png", "filename_original": "test1.png", "size_bytes": 12345, "uploaded_at": "2026-05-20T00:00:00Z"}
  ]'::jsonb
);
-- Must succeed, return uuid (the friction.event.event_id; note this is NOT
-- equal to p_event_id — emit_event generates it. The source_event_id is
-- 'manual/00000000-0000-0000-0000-cc0016c001').
-- Verify: friction.event row with source='manual', source_event_id='manual/00000000-0000-0000-0000-cc0016c001',
--         attachments = the supplied JSONB.
```

V-C3a — 4 attachments rejected:
```sql
SELECT friction.fn_emit_manual_event(
  'cc-0016-test/v-c3a too many',
  'info',
  'operator_friction',
  p_attachments := '[{"storage_path":"a","mime_type":"image/png"},{"storage_path":"b","mime_type":"image/png"},{"storage_path":"c","mime_type":"image/png"},{"storage_path":"d","mime_type":"image/png"}]'::jsonb
);
-- Must fail: attachments limited to 3 per event
```

V-C3b — bad MIME rejected:
```sql
SELECT friction.fn_emit_manual_event(
  'cc-0016-test/v-c3b bad mime',
  'info',
  'operator_friction',
  p_attachments := '[{"storage_path": "x", "mime_type": "video/mp4"}]'::jsonb
);
-- Must fail: attachment mime_type video/mp4 not allowed
```

V-C3c — missing storage_path rejected:
```sql
SELECT friction.fn_emit_manual_event(
  'cc-0016-test/v-c3c missing path',
  'info',
  'operator_friction',
  p_attachments := '[{"mime_type": "image/png"}]'::jsonb
);
-- Must fail: each attachment must include storage_path and mime_type
```

V-C3d — missing mime_type rejected:
```sql
SELECT friction.fn_emit_manual_event(
  'cc-0016-test/v-c3d missing mime',
  'info',
  'operator_friction',
  p_attachments := '[{"storage_path": "x"}]'::jsonb
);
-- Must fail: each attachment must include storage_path and mime_type
```

V-C3e — non-array rejected:
```sql
SELECT friction.fn_emit_manual_event(
  'cc-0016-test/v-c3e non-array',
  'info',
  'operator_friction',
  p_attachments := '{"not": "an array"}'::jsonb
);
-- Must fail: attachments must be a JSON array
```

V-C4 — grants correct (authenticated + service_role can EXECUTE both functions; anon cannot):
```sql
SELECT
  p.proname,
  r.rolname AS grantee,
  has_function_privilege(r.rolname, p.oid, 'EXECUTE') AS can_execute
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
CROSS JOIN (VALUES ('postgres'), ('service_role'), ('authenticated'), ('anon')) AS roles(rolname)
LEFT JOIN pg_roles r ON r.rolname = roles.rolname
WHERE n.nspname = 'friction' AND p.proname IN ('emit_event', 'fn_emit_manual_event')
ORDER BY p.proname, roles.rolname;
-- Must show: postgres + service_role + authenticated = true; anon = false
-- for BOTH emit_event AND fn_emit_manual_event (the new signatures).
```

V-C5 — service_role direct call works (used by dashboard Server Action):
```sql
SET ROLE service_role;
SELECT friction.fn_emit_manual_event(
  'cc-0016-test/v-c5 service_role smoke',
  'info',
  'operator_friction',
  '/test',
  NULL,
  'service_role smoke'
);
-- Must succeed under service_role.
RESET ROLE;
```

V-C6 — test row cleanup:
```sql
DELETE FROM friction.event WHERE observation_text LIKE 'cc-0016-test/%';
-- Verify zero residual:
SELECT COUNT(*) FROM friction.event WHERE observation_text LIKE 'cc-0016-test/%';
-- Must return 0.
```

V-A5 (Stage A carryover) — authenticated upload + read round-trip remains **DEFERRED to Stage B FAB ship**. Stage C alone cannot exercise V-A5 because the upload path requires the dashboard FAB (frontend) to authenticate and upload via Supabase JS client. The Stage C apply session validates the RPC contract; V-A5 closes when the Stage B FAB exists and PK exercises an end-to-end upload.

### Hard-stop conditions

- Either DROP fails (some other dependency on the pre-patch signatures was not anticipated).
- Either CREATE OR REPLACE fails to deploy.
- V-C1 breaks 6-arg callers (backward-incompat regression).
- V-C2 returns an event_id without an attachments-populated row.
- V-C3a–V-C3e fails to reject the matching invalid input.
- V-C4 shows anon CAN execute either function (overpermission) or authenticated/service_role CANNOT.
- V-C5 fails for service_role (would break the dashboard Server Action).
- V-C6 leaves residual cc-0016-test rows.

### Rollback path

Restore the cc-0017b production-safe pipeline captured at HEAD `307822b827ad5b532af417cd53d16f9d8c596f85` (v2.97 sync close, 2026-05-20 — bodies captured via `pg_get_functiondef` immediately before this Stage C apply). The rollback is byte-stable against that production state.

```sql
-- =============================================================================
-- Rollback for cc-0016 Stage C (Path X)
-- =============================================================================

-- Step 1: DROP the v1.1 Stage C signatures.
DROP FUNCTION IF EXISTS friction.fn_emit_manual_event(
  text, text, text, text, jsonb, text, uuid, jsonb
);
DROP FUNCTION IF EXISTS friction.emit_event(
  text, text, text, text, timestamptz, jsonb, text, jsonb, text, text, text, jsonb, jsonb
);

-- Step 2: Restore cc-0017b 12-arg emit_event (production-safe body).

CREATE OR REPLACE FUNCTION friction.emit_event(
  p_source              text,
  p_condition_key       text,
  p_problem_key         text,
  p_source_event_id     text,
  p_observed_at         timestamptz,
  p_related_object      jsonb,
  p_observation_text    text,
  p_raw_payload         jsonb,
  p_reported_by         text  DEFAULT 'system',
  p_severity_override   text  DEFAULT NULL,
  p_category_override   text  DEFAULT NULL,
  p_dynamic_context     jsonb DEFAULT NULL
)
RETURNS TABLE(event_id uuid, case_id uuid, case_disposition text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'friction', 'public'
AS $$
DECLARE
  v_source_row       friction.source%ROWTYPE;
  v_rule             friction.emission_rule%ROWTYPE;
  v_dedupe           text;
  v_severity         text;
  v_category         text;
  v_category_source  text;
  v_event_id         uuid;
  v_case_id          uuid;
  v_disposition      text;
  v_inner            RECORD;
  v_final_context    jsonb;
  v_rule_default_sev text;
  v_rule_default_cat text;
BEGIN
  IF p_source IS NULL OR length(trim(p_source)) = 0 THEN
    RAISE EXCEPTION 'emit_event: p_source is required' USING ERRCODE = 'P0001';
  END IF;
  IF p_condition_key IS NULL OR length(trim(p_condition_key)) = 0 THEN
    RAISE EXCEPTION 'emit_event: p_condition_key is required' USING ERRCODE = 'P0001';
  END IF;
  IF p_problem_key IS NULL OR length(trim(p_problem_key)) = 0 THEN
    RAISE EXCEPTION 'emit_event: p_problem_key is required' USING ERRCODE = 'P0001';
  END IF;
  IF p_source_event_id IS NULL OR length(trim(p_source_event_id)) = 0 THEN
    RAISE EXCEPTION 'emit_event: p_source_event_id is required (idempotency key)' USING ERRCODE = 'P0001';
  END IF;
  IF p_observation_text IS NULL OR length(trim(p_observation_text)) < 5 THEN
    RAISE EXCEPTION 'emit_event: p_observation_text required and must be >= 5 characters' USING ERRCODE = 'P0001';
  END IF;
  IF p_observed_at IS NULL THEN
    RAISE EXCEPTION 'emit_event: p_observed_at is required' USING ERRCODE = 'P0001';
  END IF;
  IF p_observed_at > now() + interval '5 minutes' THEN
    RAISE EXCEPTION 'emit_event: p_observed_at is in the future (clock skew?). value=%, now=%', p_observed_at, now()
      USING ERRCODE = 'P0001';
  END IF;
  IF p_reported_by IS NULL OR p_reported_by NOT IN ('system','pk','client','vendor','unknown') THEN
    RAISE EXCEPTION 'emit_event: p_reported_by must be one of system/pk/client/vendor/unknown; got %', p_reported_by
      USING ERRCODE = 'P0001';
  END IF;
  IF p_severity_override IS NOT NULL AND p_severity_override NOT IN ('info','warn','critical') THEN
    RAISE EXCEPTION 'emit_event: p_severity_override must be info/warn/critical or NULL; got %', p_severity_override
      USING ERRCODE = 'P0001';
  END IF;
  IF p_category_override IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM friction.category
       WHERE category_code = p_category_override AND is_active = true
    ) THEN
      RAISE EXCEPTION 'emit_event: p_category_override % is not an active friction.category code', p_category_override
        USING ERRCODE = 'P0001';
    END IF;
  END IF;

  PERFORM set_config('friction.emit_event_active', 'true', true);

  SELECT * INTO v_source_row FROM friction.source
   WHERE source_code = p_source AND is_active = true;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'emit_event: friction.source code % not found or inactive', p_source
      USING ERRCODE = 'P0001',
            HINT    = 'Register the source via INSERT INTO friction.source before emitting.';
  END IF;

  SELECT * INTO v_rule FROM friction.emission_rule
   WHERE source = p_source AND condition_key = p_condition_key AND enabled = true;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'emit_event: no enabled emission_rule for (source=%, condition_key=%)',
                    p_source, p_condition_key
      USING ERRCODE = 'P0001',
            HINT    = 'INSERT a row into friction.emission_rule before emitting under this condition_key.';
  END IF;

  IF v_rule.case_policy = 'suppress' THEN
    BEGIN
      INSERT INTO friction.emit_error
        (source, source_event_id, error_message, error_code, raw_payload, emitter_version)
      VALUES (
        p_source, p_source_event_id,
        format('emit_event: emission_rule.case_policy=suppress for (source=%s, condition_key=%s); event not written',
               p_source, p_condition_key),
        'POLICY-SUPPRESS',
        COALESCE(p_raw_payload, '{}'::jsonb),
        'cc-0017b-v1.0'
      );
    EXCEPTION WHEN OTHERS THEN NULL;
    END;
    RETURN QUERY SELECT NULL::uuid, NULL::uuid, 'suppressed_by_rule'::text;
    RETURN;
  END IF;

  v_rule_default_sev := COALESCE(v_rule.default_severity, v_source_row.default_severity);
  v_rule_default_cat := COALESCE(v_rule.default_category_code, v_source_row.default_category_code);

  v_severity := COALESCE(p_severity_override, v_rule_default_sev);
  v_category := COALESCE(p_category_override, v_rule_default_cat);

  v_category_source := CASE
    WHEN p_reported_by = 'pk' AND p_category_override IS NOT NULL THEN 'manual_at_capture'
    WHEN p_category_override IS NOT NULL                          THEN 'category_override'
    ELSE                                                              'emitter_default'
  END;

  v_final_context := COALESCE(p_dynamic_context, '{}'::jsonb);

  IF p_severity_override IS NOT NULL THEN
    v_final_context := v_final_context || jsonb_build_object(
      'severity_override', jsonb_build_object(
        'applied',        p_severity_override,
        'rule_default',   v_rule.default_severity,
        'source_default', v_source_row.default_severity,
        'effective_was',  v_rule_default_sev
      )
    );
  END IF;

  IF p_category_override IS NOT NULL THEN
    v_final_context := v_final_context || jsonb_build_object(
      'category_override', jsonb_build_object(
        'applied',        p_category_override,
        'rule_default',   v_rule.default_category_code,
        'source_default', v_source_row.default_category_code,
        'effective_was',  v_rule_default_cat
      )
    );
  END IF;

  IF v_final_context = '{}'::jsonb THEN v_final_context := NULL; END IF;

  v_dedupe := friction.fn_compute_dedupe_fingerprint_v1(p_source, p_problem_key, p_related_object);

  BEGIN
    INSERT INTO friction.event (
      event_id, source, source_event_id, observed_at,
      severity, category, category_source, reported_by,
      problem_key, observation_text, related_object, raw_payload,
      dedupe_fingerprint, dynamic_context, case_id
    )
    VALUES (
      gen_random_uuid(), p_source, p_source_event_id, p_observed_at,
      v_severity, v_category, v_category_source, p_reported_by,
      p_problem_key, p_observation_text, p_related_object, p_raw_payload,
      v_dedupe, v_final_context, NULL
    )
    RETURNING friction.event.event_id INTO v_event_id;

  EXCEPTION WHEN unique_violation THEN
    SELECT e.event_id, e.case_id INTO v_event_id, v_case_id
    FROM friction.event e
    WHERE e.source = p_source AND e.source_event_id = p_source_event_id;
    v_disposition := 'idempotent_replay';
    RETURN QUERY SELECT v_event_id, v_case_id, v_disposition;
    RETURN;
  END;

  SELECT * INTO v_inner FROM friction.fn_attach_or_create_inner_v1(
    v_dedupe, p_observed_at, v_severity, v_category, p_problem_key, p_observation_text
  );
  v_case_id     := v_inner.case_id;
  v_disposition := v_inner.disposition;

  -- THE FIX: qualify event_id in WHERE clause to disambiguate from RETURNS TABLE OUT param
  UPDATE friction.event SET case_id = v_case_id WHERE friction.event.event_id = v_event_id;

  RETURN QUERY SELECT v_event_id, v_case_id, v_disposition;
END
$$;

REVOKE EXECUTE ON FUNCTION friction.emit_event(
  text, text, text, text, timestamptz, jsonb, text, jsonb, text, text, text, jsonb
) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION friction.emit_event(
  text, text, text, text, timestamptz, jsonb, text, jsonb, text, text, text, jsonb
) TO authenticated, service_role;

-- Step 3: Restore cc-0017b 6-arg fn_emit_manual_event (production-safe body).

CREATE OR REPLACE FUNCTION friction.fn_emit_manual_event(
  p_observation_text text,
  p_severity         text,
  p_category         text,
  p_current_route    text  DEFAULT NULL,
  p_related_object   jsonb DEFAULT NULL,
  p_notes            text  DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'friction', 'public'
AS $$
DECLARE
  v_problem_key    text;
  v_related_object jsonb;
  v_event_id       uuid;
  v_case_id        uuid;
  v_disposition    text;
BEGIN
  IF p_observation_text IS NULL OR length(trim(p_observation_text)) < 5 THEN
    RAISE EXCEPTION 'observation_text required and must be >= 5 characters';
  END IF;
  IF COALESCE(p_severity, 'info') NOT IN ('info', 'warn', 'critical') THEN
    RAISE EXCEPTION 'severity must be info, warn, or critical';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM friction.category
     WHERE category_code = COALESCE(p_category, 'unclassified')
       AND is_active = true
  ) THEN
    RAISE EXCEPTION 'category % is not active', COALESCE(p_category, 'unclassified');
  END IF;

  v_problem_key := lower(regexp_replace(substring(p_observation_text from 1 for 50), '[^a-z0-9]+', '_', 'g'));

  v_related_object := COALESCE(p_related_object, '{}'::jsonb);
  IF p_current_route IS NOT NULL THEN
    v_related_object := v_related_object || jsonb_build_object('dashboard_route', p_current_route);
  END IF;

  SELECT event_id, case_id, case_disposition
  INTO v_event_id, v_case_id, v_disposition
  FROM friction.emit_event(
    p_source             := 'manual',
    p_condition_key      := 'manual_fab',
    p_problem_key        := v_problem_key,
    p_source_event_id    := 'manual/' || gen_random_uuid()::text,
    p_observed_at        := now(),
    p_related_object     := v_related_object,
    p_observation_text   := p_observation_text,
    p_raw_payload        := jsonb_build_object(
      'form_version', 'v1',
      'notes',        p_notes
    ),
    p_reported_by        := 'pk',
    p_severity_override  := COALESCE(p_severity, 'info'),
    p_category_override  := CASE WHEN p_category IS NOT NULL THEN p_category ELSE NULL END,
    p_dynamic_context    := jsonb_build_object(
      'fab_emission',  true,
      'current_route', p_current_route
    )
  );

  RETURN v_event_id;
END
$$;

REVOKE EXECUTE ON FUNCTION friction.fn_emit_manual_event(
  text, text, text, text, jsonb, text
) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION friction.fn_emit_manual_event(
  text, text, text, text, jsonb, text
) TO authenticated, service_role;
```

Rollback note: friction.event rows written between Stage C apply and rollback will have `attachments` populated. The column itself is not dropped by rollback (Stage A's column add is unaffected by Stage C). Rolling Stage C back leaves any populated attachments fields in place; they remain visible to direct table reads but no in-RPC validator exercises them post-rollback. If the dashboard FAB was already updated to send `p_attachments` to a now-rolled-back 6-arg function, those calls fail at the resolution layer (PostgreSQL cannot match 8-arg form to the restored 6-arg signature when named params for non-existent params are used). Coordinate with dashboard repo: Stage B FAB ship must NOT precede confidence in the Stage C apply.

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
