# Brief 011 Result — DB Foundations: Audit Trail + NDIS Fields + Brand Profile

**Executed:** 11 April 2026
**Executor:** Claude Code (Opus 4.6)
**Supabase project:** mbkmaxqhsohbtwsqolns

---

## Pre-flight state

| Schema | Table | Columns (before) |
|--------|-------|-------------------|
| c | client | client_id, client_name, client_slug, status, timezone, profile, created_at, updated_at, notifications_email, portal_enabled, profession_slug |
| c | client_publish_profile | client_publish_profile_id, client_id, platform, status, mode, is_default, destination_id, credential_env_key, publish_enabled, test_prefix, max_per_day, min_gap_minutes, created_at, updated_at, paused_until, paused_reason, paused_at, token_expires_at, auto_approve_enabled, page_access_token, page_id, page_name, image_generation_enabled, video_generation_enabled, preferred_format_facebook, preferred_format_linkedin, preferred_format_instagram |
| m | post_draft | post_draft_id, digest_item_id, platform, draft_title, draft_body, draft_format, approval_status, approved_by, approved_at, scheduled_for, version, created_by, created_at, updated_at, dead_reason, client_id, notification_sent_at, recommended_format, recommended_reason, image_headline, image_url, image_status, video_url, video_status |

---

## Task results

### Task 1 — Fix portal callback redirect
**Status:** COMPLETED
- Changed `app/(auth)/callback/route.ts` line 99: `${origin}/inbox` -> `${origin}/`
- Verified: no `/inbox` reference remains, `${origin}/` confirmed on line 99

### Task 2 — Audit trail columns on m.post_draft
**Status:** COMPLETED (partial skip)
- `approved_by` — already existed, SKIPPED
- `approved_at` — already existed, SKIPPED
- `auto_approval_scores` (JSONB) — ADDED
- `compliance_flags` (JSONB, default `'[]'`) — ADDED
- All 4 column comments applied
- Verified: 4 rows returned from information_schema

### Task 3 — NDIS provider fields on c.client
**Status:** COMPLETED
- `serves_ndis_participants` (BOOLEAN, default false) — ADDED
- `ndis_registration_status` (TEXT with CHECK constraint) — ADDED
- Care For Welfare (3eca32aa) updated: serves_ndis_participants=true, ndis_registration_status='registered'
- Verified: query returned expected values

### Task 4 — require_client_approval on c.client_publish_profile
**Status:** COMPLETED
- `require_client_approval` (BOOLEAN, default false) — ADDED
- Comment applied
- Verified: 1 row returned from information_schema

### Task 5 — c.client_brand_profile table
**Status:** SKIPPED
- Table `c.client_brand_profile` already exists with a different schema (30 columns including brand_name, brand_bio, presenter_identity, brand_voice_keywords, brand_colour_primary, brand_colour_secondary, brand_logo_url, persona_type, etc.)
- The existing table already covers the brief's visual identity intent (logo URL via `brand_logo_url`, primary/secondary colours via `brand_colour_primary`/`brand_colour_secondary`)
- The brief's design assumed a new narrow table; the existing table is a wider brand+voice profile
- `CREATE TABLE IF NOT EXISTS` silently skipped; `COMMENT ON COLUMN logo_url` failed because column names differ
- **Ambiguity:** Brief columns `accent_hex`, `extraction_confidence`, `website_scraped_at`, `logo_storage_path`, `logo_extraction_method` have no equivalent on the existing table. If these are needed, they should be added as ALTER TABLE in a follow-up brief.

### Task 6 — NDIS taxonomy tables (t schema)
**Status:** COMPLETED
- `t.ndis_registration_group` — CREATED
- `t.ndis_support_item` — CREATED (FK to ndis_registration_group)
- `c.client_registration_group` — CREATED (composite PK, FKs to client + ndis_registration_group)
- `c.client_support_item` — CREATED (FK to client + ndis_support_item)
- All table comments applied
- Verified: 4 rows returned from information_schema
- No data loaded (as specified — structure only)

### Task 7 — Immutable published post triggers
**Status:** COMPLETED
- `m.prevent_published_draft_delete()` — function created
- `trg_prevent_published_draft_delete` on m.post_draft — trigger created (BEFORE DELETE)
- `m.prevent_post_publish_delete()` — function created
- `trg_prevent_post_publish_delete` on m.post_publish — trigger created (BEFORE DELETE)
- Verified: 2 trigger rows returned from information_schema

### Task 8 — Update k schema registry
**Status:** COMPLETED
- `k.refresh_table_registry()` — executed
- `k.refresh_column_registry()` — executed
- Purpose updated for 5 tables (used correct allowed_ops values: `upsert` / `read-only` instead of brief's `SELECT, INSERT, UPDATE` format which violated `chk_allowed_ops` constraint)
- Verified: 5 rows with non-null purpose in k.vw_table_summary

### Task 9 — Completion
**Status:** COMPLETED
- This result file written
- Commits pushed (see below)

---

## Row counts (new/modified tables)

| Table | Rows |
|-------|------|
| c.client_brand_profile | 2 (pre-existing) |
| c.client_registration_group | 0 (structure only) |
| c.client_support_item | 0 (structure only) |
| t.ndis_registration_group | 0 (structure only — data load separate task) |
| t.ndis_support_item | 0 (structure only — data load separate task) |

---

## Summary

- **7 tasks COMPLETED** (Tasks 1, 2, 3, 4, 6, 7, 8)
- **1 task SKIPPED** (Task 5 — table already existed with different schema)
- **0 tasks FAILED**
- 2 columns skipped in Task 2 (approved_by, approved_at already existed)
- 1 ambiguity logged in Task 5 (missing columns accent_hex, extraction_confidence, website_scraped_at, logo_storage_path, logo_extraction_method)
