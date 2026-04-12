# Brief 016 Result — brand-scanner Edge Function

**Executed:** 12 April 2026
**Executor:** Claude Code (Opus 4.6)
**Repos:** Invegent-content-engine (Edge Function), invegent-dashboard (wiring)
**Supabase project:** mbkmaxqhsohbtwsqolns

---

## Task Results

| Task | Description | Status |
|------|-------------|--------|
| 1 | Storage bucket + form_data column | COMPLETED |
| 2 | update_submission_brand_scan() function | COMPLETED |
| 3 | Update approve_onboarding() to copy brand data | COMPLETED |
| 4 | Create brand-scanner Edge Function | COMPLETED |
| 5 | Git push + deploy Edge Function | COMPLETED |
| 6 | Wire run-scans API route to brand-scanner | COMPLETED |
| 7 | Update ReadinessChecklist to read brand_scan_result | COMPLETED |
| 8 | Write result file | COMPLETED |

---

## Critical discovery: no form_data column existed

The `c.onboarding_submission` table had individual columns for each field but NO JSONB column for extra data. Brief 014 fields (logo_data_url, service_list, serves_ndis, ndis_registration, content_objectives) were being sent in the JSON payload to `submit_onboarding` but silently dropped because the function only mapped known columns.

**Resolution:**
1. Added `form_data JSONB DEFAULT '{}'` column to `c.onboarding_submission`
2. Updated `submit_onboarding()` to store the full `p_data` payload in `form_data`
3. All Brief 014 fields now preserved in `form_data` for new submissions
4. brand-scanner reads from `form_data` and writes `brand_scan_result` back to it
5. Dashboard detail panel reads both top-level columns AND `form_data` with fallback

**Note:** Existing submissions (before this migration) will have `form_data = NULL`. New submissions will have the full payload including logo_data_url, service_list, etc.

---

## DB Changes

| Object | Type | Action |
|--------|------|--------|
| storage.buckets 'client-assets' | Bucket | CREATED (private, 5MB limit, image types only) |
| storage policy 'service_role_full_access' | Policy | CREATED |
| c.onboarding_submission.form_data | Column | ADDED (JSONB DEFAULT '{}') |
| public.submit_onboarding() | Function | UPDATED (now stores full payload in form_data) |
| public.update_submission_brand_scan() | Function | CREATED |
| public.approve_onboarding() | Function | UPDATED (copies brand_scan_result to c.client_brand_profile on approval) |

## Existing constraints verified

| Check | Result |
|-------|--------|
| c.client_brand_profile UNIQUE on client_id | Already exists (client_brand_profile_client_id_key) |

---

## Edge Function

- **Name:** brand-scanner
- **Version:** v1.0.0
- **Status:** ACTIVE (deployed via Supabase MCP)
- **JWT verification:** Disabled (called with service_role key from dashboard API)

### Extraction pipeline
1. **Priority 1:** If client uploaded a logo (base64 in form_data), decode and upload to Storage
2. **Priority 2:** If website URL provided, fetch HTML and extract:
   - Theme colour from `<meta name="theme-color">` or `msapplication-TileColor`
   - Logo from `og:image` meta tag (downloaded and uploaded to Storage)
   - Fallback: favicon URL referenced but not downloaded
3. Derive secondary (lightened 40%) and accent (darkened 30%) colours from primary
4. Write `brand_scan_result` to submission JSONB via `update_submission_brand_scan()`

---

## Dashboard changes (invegent-dashboard)

| File | Change |
|------|--------|
| app/api/onboarding/run-scans/route.ts | Replaced stub with real brand-scanner invocation |
| app/(dashboard)/onboarding/page.tsx | ReadinessChecklist reads brand_scan_result; detail sections read from form_data with fallback |

### Commits
- `Invegent-content-engine` `7be5f0c` — brand-scanner Edge Function
- `invegent-dashboard` `66933bc` — wiring + checklist update

---

## Notes

- Website fetch timeout is 8 seconds — non-fatal on failure
- No individual extraction step failure stops the scan
- AI profile bootstrap still TODO (separate brief) — checklist item shows as warn
- The approve_onboarding brand copy uses ON CONFLICT (client_id) DO UPDATE for safety
