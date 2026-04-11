# Claude Code Brief 011 — DB Foundations: Audit Trail + NDIS Fields + Brand Profile

**Date:** 11 April 2026  
**Status:** READY TO RUN  
**Decisions:** D084, D086, D088  
**Estimated time:** 30–45 minutes autonomous execution  
**Working directory:** `C:\Users\parve\Invegent-content-engine`  
**MCPs required:** Supabase MCP, GitHub MCP  

---

## Context

This brief executes the DB foundation work from the portal/onboarding/compliance/audit
design session of 11 April 2026. It is pure migration work — no Edge Function deploys,
no UI changes. All tasks are idempotent. If a column or table already exists, skip and log.

Project: `mbkmaxqhsohbtwsqolns`  
Primary navigation: always query `k.vw_table_summary` before `information_schema`.

---

## Pre-flight check

Before starting any task, run:

```sql
SELECT schema_name, table_name, columns_list
FROM k.vw_table_summary
WHERE (schema_name = 'm' AND table_name = 'post_draft')
   OR (schema_name = 'c' AND table_name = 'client')
   OR (schema_name = 'c' AND table_name = 'client_publish_profile')
ORDER BY schema_name, table_name;
```

Log the output. Use it to confirm which columns already exist before each migration.

---

## Task 1 — Fix portal callback redirect

**Repo:** `invegent-portal`  
**File:** `app/(auth)/callback/route.ts`  
**Change:** Last redirect — change `/inbox` to `/`

**Find this line (near end of file):**
```typescript
return NextResponse.redirect(`${origin}/inbox`);
```

**Replace with:**
```typescript
return NextResponse.redirect(`${origin}/`);
```

**Verification:** Confirm the file now contains `${origin}/\`` (with closing backtick and
closing paren) and does NOT contain `${origin}/inbox`.

**Commit message:** `fix: portal callback redirects to / not /inbox`

---

## Task 2 — Audit trail columns on m.post_draft

**Purpose:** Records who approved each draft, when, and what compliance issues were flagged.
Closes audit gaps F5 and F6 from the 11 Apr 2026 audit exercise.

**Pre-check:** Confirm `approved_by`, `approved_at`, `auto_approval_scores`,
`compliance_flags` do NOT already exist on `m.post_draft`.
If any already exist, skip that column only — do not error.

**Migration:**

```sql
ALTER TABLE m.post_draft
  ADD COLUMN IF NOT EXISTS approved_by TEXT,
  ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS auto_approval_scores JSONB,
  ADD COLUMN IF NOT EXISTS compliance_flags JSONB DEFAULT '[]'::jsonb;

COMMENT ON COLUMN m.post_draft.approved_by IS
  'Who approved this draft. Format: portal_user_id (UUID as text) or literal string ''auto-approver''. NULL = not yet approved.';

COMMENT ON COLUMN m.post_draft.approved_at IS
  'Timestamp when approval decision was made. NULL = not yet approved.';

COMMENT ON COLUMN m.post_draft.auto_approval_scores IS
  'JSONB object of auto-approver gate scores if auto-approved, e.g. {"relevance": 0.87, "tone": 0.91, ...}. NULL if human-approved.';

COMMENT ON COLUMN m.post_draft.compliance_flags IS
  'Array of compliance issues flagged during generation. Each item: {rule_id, severity, reason}. Empty array = no flags. Written by ai-worker on generation and auto-approver on approval.';
```

**Verification:**
```sql
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_schema = 'm' AND table_name = 'post_draft'
  AND column_name IN ('approved_by', 'approved_at', 'auto_approval_scores', 'compliance_flags')
ORDER BY column_name;
```
Expected: 4 rows returned.

---

## Task 3 — NDIS provider fields on c.client

**Purpose:** Captures whether a client serves NDIS participants and their registration
status. Self-declared, never enforced. Drives compliance rule set selection (D086).

**Pre-check:** Confirm `serves_ndis_participants` and `ndis_registration_status`
do NOT already exist on `c.client`.

**Migration:**

```sql
ALTER TABLE c.client
  ADD COLUMN IF NOT EXISTS serves_ndis_participants BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS ndis_registration_status TEXT
    CHECK (ndis_registration_status IN ('registered', 'unregistered', 'mixed', 'unknown'));

COMMENT ON COLUMN c.client.serves_ndis_participants IS
  'True if this client serves NDIS participants. Determines whether NDIS Code of Conduct compliance rules apply. Set from onboarding form.';

COMMENT ON COLUMN c.client.ndis_registration_status IS
  'Self-declared registration status. Values: registered | unregistered | mixed | unknown. Never enforced by ICE — used for content tone context only. NULL = not an NDIS provider.';
```

**Update Care for Welfare to reflect known status:**
```sql
UPDATE c.client
SET serves_ndis_participants = true,
    ndis_registration_status = 'registered'
WHERE client_id = '3eca32aa-e460-462f-a846-3f6ace6a3cae';
```

**Verification:**
```sql
SELECT client_name, serves_ndis_participants, ndis_registration_status
FROM c.client
WHERE client_id = '3eca32aa-e460-462f-a846-3f6ace6a3cae';
```
Expected: Care For Welfare Pty Ltd | true | registered

---

## Task 4 — require_client_approval on c.client_publish_profile

**Purpose:** External clients default to manual approval — auto-publish is opt-in (D088 F8).

**Pre-check:** Confirm `require_client_approval` does not already exist.

**Migration:**

```sql
ALTER TABLE c.client_publish_profile
  ADD COLUMN IF NOT EXISTS require_client_approval BOOLEAN DEFAULT false;

COMMENT ON COLUMN c.client_publish_profile.require_client_approval IS
  'If true, client must approve drafts in portal before publishing. Auto-approver still runs but approved posts queue for client review. Default false for internal clients (existing behaviour unchanged). Must be set true for external clients on onboarding.';
```

**Verification:**
```sql
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_schema = 'c' AND table_name = 'client_publish_profile'
  AND column_name = 'require_client_approval';
```
Expected: 1 row.

---

## Task 5 — c.client_brand_profile table

**Purpose:** Stores extracted logo and colour palette per client. Portal reads this to
apply CSS custom properties (client branding) on session load (D087, D088).

**Pre-check:** Confirm table does not already exist.

**Migration:**

```sql
CREATE TABLE IF NOT EXISTS c.client_brand_profile (
  brand_profile_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES c.client(client_id) ON DELETE CASCADE,
  logo_url TEXT,
  logo_storage_path TEXT,
  logo_extraction_method TEXT
    CHECK (logo_extraction_method IN ('scraped', 'uploaded', 'manual')),
  primary_hex TEXT,
  secondary_hex TEXT,
  accent_hex TEXT,
  extraction_confidence NUMERIC(3,2),
  website_scraped_at TIMESTAMPTZ,
  last_updated_at TIMESTAMPTZ DEFAULT now(),
  updated_by TEXT,
  UNIQUE (client_id)
);

COMMENT ON TABLE c.client_brand_profile IS
  'Client brand identity — logo and colour palette. Extracted automatically from website on onboarding approval, or uploaded/entered manually. Portal reads this to apply client-specific CSS variables per session. One row per client.';

COMMENT ON COLUMN c.client_brand_profile.logo_url IS 'Public URL to logo file — either Supabase Storage URL or external URL scraped from website.';
COMMENT ON COLUMN c.client_brand_profile.logo_storage_path IS 'Supabase Storage path if logo was downloaded and stored internally. Null if using external URL.';
COMMENT ON COLUMN c.client_brand_profile.logo_extraction_method IS 'How the logo was obtained: scraped (auto from website), uploaded (client uploaded in form), manual (PK entered in dashboard).';
COMMENT ON COLUMN c.client_brand_profile.primary_hex IS 'Primary brand colour as hex, e.g. #E11D48. Extracted from logo or entered manually.';
COMMENT ON COLUMN c.client_brand_profile.secondary_hex IS 'Secondary brand colour as hex.';
COMMENT ON COLUMN c.client_brand_profile.accent_hex IS 'Accent/highlight colour as hex.';
COMMENT ON COLUMN c.client_brand_profile.extraction_confidence IS '0.00–1.00 confidence score from brand-scanner. Low confidence flags for PK manual review.';
```

**Verification:**
```sql
SELECT table_name, obj_description(c.oid) AS comment
FROM information_schema.tables t
JOIN pg_class c ON c.relname = t.table_name
WHERE t.table_schema = 'c' AND t.table_name = 'client_brand_profile';
```
Expected: 1 row with comment.

---

## Task 6 — NDIS taxonomy tables (t schema)

**Purpose:** Reference tables for NDIS registration groups and support items (D084).
Data will be loaded separately from NDIA Excel. This task creates structure only.

**Pre-check:** Confirm neither table exists.

**Migration:**

```sql
CREATE TABLE IF NOT EXISTS t.ndis_registration_group (
  registration_group_id TEXT PRIMARY KEY,
  group_name TEXT NOT NULL,
  plain_description TEXT,
  profession_slugs TEXT[],
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

COMMENT ON TABLE t.ndis_registration_group IS
  'NDIS registration groups as defined by the NDIA. Reference data — loaded from NDIA documents, updated annually each July. Each provider registers for one or more groups which determine which support items they can deliver.';

CREATE TABLE IF NOT EXISTS t.ndis_support_item (
  item_number TEXT PRIMARY KEY,
  registration_group_id TEXT REFERENCES t.ndis_registration_group(registration_group_id),
  support_category_number INT,
  support_category_name TEXT,
  item_name TEXT NOT NULL,
  plain_description TEXT,
  cross_group_ids TEXT[],
  profession_slugs TEXT[],
  price_limit_aud NUMERIC(8,2),
  unit TEXT,
  is_active BOOLEAN DEFAULT true,
  effective_from DATE,
  created_at TIMESTAMPTZ DEFAULT now()
);

COMMENT ON TABLE t.ndis_support_item IS
  'NDIS support catalogue items. Reference data from NDIA Pricing Arrangements and Price Limits document. ~900 rows. Updated annually. plain_description is AI-written plain English for content generation context. cross_group_ids captures items that can be delivered by multiple registration groups.';

CREATE TABLE IF NOT EXISTS c.client_registration_group (
  client_id UUID REFERENCES c.client(client_id) ON DELETE CASCADE,
  registration_group_id TEXT REFERENCES t.ndis_registration_group(registration_group_id),
  confirmed_by_client BOOLEAN DEFAULT false,
  inferred_from_profession BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (client_id, registration_group_id)
);

COMMENT ON TABLE c.client_registration_group IS
  'Which NDIS registration groups each client holds. Self-declared — never enforced by ICE. confirmed_by_client = client stated this in onboarding form. inferred_from_profession = ICE inferred from profession_slug, awaits client confirmation.';

CREATE TABLE IF NOT EXISTS c.client_support_item (
  client_support_item_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES c.client(client_id) ON DELETE CASCADE,
  item_number TEXT REFERENCES t.ndis_support_item(item_number),
  client_description TEXT,
  is_featured BOOLEAN DEFAULT false,
  source TEXT CHECK (source IN ('onboarding_form', 'ai_mapped', 'pk_manual', 'reg_group_inferred')),
  created_at TIMESTAMPTZ DEFAULT now()
);

COMMENT ON TABLE c.client_support_item IS
  'The specific NDIS support items each client delivers. client_description is their own words from the onboarding form — preserved verbatim alongside the normalised item_number. is_featured items get higher weighting in bundler signal scoring.';
```

**Verification:**
```sql
SELECT table_schema, table_name
FROM information_schema.tables
WHERE table_schema IN ('t', 'c')
  AND table_name IN ('ndis_registration_group', 'ndis_support_item',
                     'client_registration_group', 'client_support_item')
ORDER BY table_schema, table_name;
```
Expected: 4 rows.

---

## Task 7 — Immutable published post trigger

**Purpose:** Prevents deletion of published content — permanent audit trail (D088 F7).

**Migration:**

```sql
CREATE OR REPLACE FUNCTION m.prevent_published_draft_delete()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.approval_status = 'published' THEN
    RAISE EXCEPTION 'Cannot delete a published post_draft (post_draft_id: %). Soft-archive only — set approval_status to ''archived'' instead.', OLD.post_draft_id;
  END IF;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_prevent_published_draft_delete ON m.post_draft;
CREATE TRIGGER trg_prevent_published_draft_delete
  BEFORE DELETE ON m.post_draft
  FOR EACH ROW EXECUTE FUNCTION m.prevent_published_draft_delete();

CREATE OR REPLACE FUNCTION m.prevent_post_publish_delete()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'Cannot delete a post_publish record (post_publish_id: %). Published records are a permanent audit trail.', OLD.post_publish_id;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_prevent_post_publish_delete ON m.post_publish;
CREATE TRIGGER trg_prevent_post_publish_delete
  BEFORE DELETE ON m.post_publish
  FOR EACH ROW EXECUTE FUNCTION m.prevent_post_publish_delete();
```

**Verification:**
```sql
SELECT trigger_name, event_manipulation, event_object_table
FROM information_schema.triggers
WHERE trigger_schema = 'm'
  AND trigger_name IN ('trg_prevent_published_draft_delete', 'trg_prevent_post_publish_delete')
ORDER BY trigger_name;
```
Expected: 2 rows.

---

## Task 8 — Update k schema registry

**Purpose:** Register all new tables and columns in the k governance catalog.

```sql
SELECT refresh_table_registry();
SELECT refresh_column_registry();
```

Then update purpose for each new table:

```sql
UPDATE k.table_registry SET
  purpose = 'Client brand identity — logo URL, colour palette (primary/secondary/accent hex), extraction confidence. Read by portal to apply client CSS variables per session. One row per client.',
  allowed_ops = 'SELECT, INSERT, UPDATE'
WHERE schema_name = 'c' AND table_name = 'client_brand_profile';

UPDATE k.table_registry SET
  purpose = 'NDIS registration groups reference data. Loaded from NDIA documents annually each July. Links to t.ndis_support_item and t.profession.',
  allowed_ops = 'SELECT'
WHERE schema_name = 't' AND table_name = 'ndis_registration_group';

UPDATE k.table_registry SET
  purpose = 'NDIS support catalogue items (~900 rows). Official item numbers, names, price limits, and AI-written plain descriptions for content generation context. Updated annually.',
  allowed_ops = 'SELECT'
WHERE schema_name = 't' AND table_name = 'ndis_support_item';

UPDATE k.table_registry SET
  purpose = 'Which NDIS registration groups each client holds. Self-declared, never enforced. Source of item universe for bundler signal scoring.',
  allowed_ops = 'SELECT, INSERT, UPDATE'
WHERE schema_name = 'c' AND table_name = 'client_registration_group';

UPDATE k.table_registry SET
  purpose = 'NDIS support items each client delivers. Preserves client_description verbatim alongside normalised item_number. is_featured items weighted higher in bundler.',
  allowed_ops = 'SELECT, INSERT, UPDATE'
WHERE schema_name = 'c' AND table_name = 'client_support_item';
```

**Verification:**
```sql
SELECT schema_name, table_name, purpose
FROM k.vw_table_summary
WHERE table_name IN ('client_brand_profile', 'ndis_registration_group',
                     'ndis_support_item', 'client_registration_group',
                     'client_support_item')
ORDER BY schema_name, table_name;
```
Expected: 5 rows, all with non-null purpose.

---

## Task 9 — Completion

After all tasks complete successfully:

1. Write a progress summary to `docs/briefs/brief_011_result.md`:
   - List each task: COMPLETED / SKIPPED (with reason) / FAILED (with error)
   - Final row counts for each new table
   - Any columns that already existed and were skipped

2. Commit all changes (including the portal callback fix) to GitHub:
   - Repo `invegent-portal`: the callback route change
   - Repo `Invegent-content-engine`: the result file

3. Commit message: `brief-011: audit trail columns, NDIS fields, brand profile table, immutable trigger`

---

## Error handling rules

- If a column already exists: skip that column, log "already exists — skipped", continue
- If a table already exists: skip that table, log, continue
- If a constraint violation occurs: stop that task, log the error, skip to next task
- If a trigger already exists: DROP and recreate (triggers are idempotent by design above)
- Never guess or infer — if something is ambiguous, write the ambiguity to the result file
- Do NOT attempt to load data into t.ndis_registration_group or t.ndis_support_item —
  structure only in this brief, data load is a separate task

---

## What this brief does NOT include

These are designed but not in scope for this brief:
- brand-scanner Edge Function (separate brief)
- AI profile bootstrap Edge Function (separate brief)
- Portal sidebar redesign (Next.js work, separate brief)
- Platform OAuth connect page (separate brief)
- NDIS Support Catalogue data load (separate task — requires NDIA Excel file)
- Updates to ai-worker to write compliance_flags (Edge Function deploy, separate brief)
- Updates to auto-approver to write approved_by + scores (Edge Function deploy, separate brief)
- Resend SMTP configuration (Supabase dashboard only — PK configures manually)
