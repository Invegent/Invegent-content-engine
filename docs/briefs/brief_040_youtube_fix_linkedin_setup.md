# Brief 040 — YouTube post_publish fix + LinkedIn activation

**Date:** 14 April 2026  
**Phase:** 3 — Platform expansion  
**Repo:** `Invegent-content-engine`  
**Working directory:** `C:\Users\parve\Invegent-content-engine`  
**Supabase project:** `mbkmaxqhsohbtwsqolns`  
**MCPs required:** Supabase MCP, GitHub MCP  
**Estimated time:** 2–3 hours  
**Deploy manually:** `npx supabase functions deploy youtube-publisher --project-ref mbkmaxqhsohbtwsqolns`

---

## Context

Two issues to fix:

**Issue 1 — YouTube post_publish not written:**  
youtube-publisher v1.5.0 in GitHub has the correct fix (column names `response_payload` and `attempt_no` corrected from v1.4.x). The deployed version may be v1.4.x with the bug. One video successfully uploaded to YouTube on 1 Apr has no `m.post_publish` record — proof the bug is live. This means YouTube engagement data cannot be tracked.

**Issue 2 — LinkedIn never published:**  
`linkedin-publisher` is deployed and runs every 15 minutes but has published zero posts. Root cause: no `c.client_publish_profile` rows for LinkedIn exist for any client. The publisher has nothing to work with. LinkedIn manual tokens must be inserted for NDIS Yarns and Property Pulse before the publisher can fire.

**IMPORTANT — LinkedIn tokens require manual steps by PK before Part 2 of this brief can run.** Part 1 (YouTube fix) can run immediately. Part 2 (LinkedIn setup) requires PK to generate tokens first. See Task 4 for instructions.

---

## Task 1 — Confirm youtube-publisher v1.5.0 is deployed

Check the deployed version:

```powershell
$resp = Invoke-RestMethod -Uri "https://mbkmaxqhsohbtwsqolns.supabase.co/functions/v1/youtube-publisher" -Headers @{ 'Authorization' = "Bearer $env:SUPABASE_ANON_KEY" }
$resp.version
```

Expected: `youtube-publisher-v1.5.0`

If the version is not v1.5.0 → deploy:

```bash
npx supabase functions deploy youtube-publisher --project-ref mbkmaxqhsohbtwsqolns
```

After deploy, verify version again.

---

## Task 2 — Backfill missing post_publish record for the 1 published YouTube video

The 1 video uploaded on 1 Apr (queue_id `39c57fac-45ca-403e-9f51-879bc1fc9e79`) has no post_publish record. Find the youtube_video_id from the draft and backfill.

```sql
-- Find the draft linked to this queue item
SELECT
  pd.post_draft_id,
  pd.client_id,
  pd.draft_title,
  pd.draft_format->>'youtube_video_id' AS youtube_video_id,
  pd.draft_format->>'youtube_url' AS youtube_url,
  ppq.queue_id
FROM m.post_publish_queue ppq
JOIN m.post_draft pd ON pd.post_draft_id = ppq.post_draft_id
WHERE ppq.queue_id = '39c57fac-45ca-403e-9f51-879bc1fc9e79';
```

If `youtube_video_id` is set → backfill:

```sql
-- Backfill the missing post_publish record
-- Replace values from query above
INSERT INTO m.post_publish (
  post_draft_id, client_id, platform, platform_post_id,
  published_at, status, attempt_no, response_payload
)
SELECT
  pd.post_draft_id,
  pd.client_id,
  'youtube',
  pd.draft_format->>'youtube_video_id',
  (pd.draft_format->>'youtube_published')::timestamptz,
  'published',
  1,
  jsonb_build_object(
    'youtube_url', pd.draft_format->>'youtube_url',
    'backfilled_at', NOW()::text,
    'backfill_reason', 'v1.4x_bug_missing_post_publish'
  )
FROM m.post_draft pd
JOIN m.post_publish_queue ppq ON ppq.post_draft_id = pd.post_draft_id
WHERE ppq.queue_id = '39c57fac-45ca-403e-9f51-879bc1fc9e79'
  AND pd.draft_format->>'youtube_video_id' IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM m.post_publish pp
    WHERE pp.post_draft_id = pd.post_draft_id AND pp.platform = 'youtube'
  );
```

Verify:
```sql
SELECT platform, platform_post_id, published_at, status
FROM m.post_publish
WHERE platform = 'youtube';
```

Expected: 1 row.

If `youtube_video_id` is null in draft_format → the video was uploaded but the ID was not stored. This means the publish was partially successful. Log this in the result file and skip the backfill.

---

## Task 3 — Read linkedin-publisher to understand how it sources work

Read `supabase/functions/linkedin-publisher/index.ts` from GitHub.

Determine:
1. Does it use the queue system (processes `m.post_publish_queue` items for `platform='linkedin'`), or does it query `m.post_draft` directly?
2. What fields does it read from `c.client_publish_profile`? (`page_access_token`, `page_id`, `credential_env_key`?)
3. What is the LinkedIn API endpoint it calls?
4. What does it write to `m.post_publish`?

Document the answers in the result file. This determines what publish profile fields are required.

---

## Task 4 — MANUAL STEP (PK) — Generate LinkedIn tokens

**This task requires PK to act. Claude Code cannot generate OAuth tokens.**

PK needs the following for NDIS Yarns, Property Pulse, and Care for Welfare LinkedIn pages:

**What you need:**
1. **Member Access Token** — a LinkedIn OAuth token with scopes: `r_organization_social`, `w_organization_social`, `rw_organization_admin`
2. **Organization URN** — format: `urn:li:organization:XXXXXXXXX` — found in the LinkedIn page admin URL or via API

**How to get the token:**
- Go to LinkedIn Developer Portal → Invegent Community app (Client ID: 78im589pktk59k)
- Use the OAuth Token Generator tool (if available) or the /oauth/v2/authorization flow
- Scopes required: `r_organization_social w_organization_social rw_organization_admin`
- Note: if Community Management API is still pending approval, the w_organization_social scope may not be grantable. If so, document this and stop Part 2 — LinkedIn cannot publish without it.

**How to find Organization URN:**
- Go to each LinkedIn company page in browser
- The URL will be: `https://www.linkedin.com/company/XXXXXXXXX/`
- The number after `/company/` is the Organization ID
- URN format: `urn:li:organization:XXXXXXXXX`

**Once tokens and URNs are gathered, provide to Claude Code to run Task 5.**

---

## Task 5 — Insert LinkedIn publish profiles (run after PK provides tokens)

Based on what Task 3 found about required fields, insert profiles for all three clients.

Template (adjust field names based on linkedin-publisher code):

```sql
-- NDIS Yarns LinkedIn (replace placeholders)
INSERT INTO c.client_publish_profile (
  client_id, platform, status, publish_enabled,
  page_access_token, page_id, page_name,
  image_generation_enabled, video_generation_enabled,
  auto_approve_enabled, require_client_approval
) VALUES (
  'fb98a472-ae4d-432d-8738-2273231c1ef4',
  'linkedin', 'active', true,
  '{NDIS_YARNS_LINKEDIN_TOKEN}',
  '{NDIS_YARNS_ORG_URN}',
  'NDIS Yarns',
  true, true, true, false
)
ON CONFLICT (client_id, platform) DO NOTHING;

-- Property Pulse LinkedIn
INSERT INTO c.client_publish_profile (
  client_id, platform, status, publish_enabled,
  page_access_token, page_id, page_name,
  image_generation_enabled, video_generation_enabled,
  auto_approve_enabled, require_client_approval
) VALUES (
  '4036a6b5-b4a3-406e-998d-c2fe14a8bbdd',
  'linkedin', 'active', true,
  '{PP_LINKEDIN_TOKEN}',
  '{PP_ORG_URN}',
  'Property Pulse',
  true, true, true, false
)
ON CONFLICT (client_id, platform) DO NOTHING;
```

---

## Task 6 — Test LinkedIn publisher fires

After profiles are inserted, trigger the linkedin-publisher manually:

```powershell
curl -X POST https://mbkmaxqhsohbtwsqolns.supabase.co/functions/v1/linkedin-publisher `
  -H "Content-Type: application/json" `
  -H "Authorization: Bearer $env:SUPABASE_ANON_KEY"
```

Or whichever auth header the linkedin-publisher expects (check from Task 3).

Check result:
```sql
SELECT platform, platform_post_id, published_at, status
FROM m.post_publish
WHERE platform = 'linkedin'
ORDER BY published_at DESC
LIMIT 5;
```

If 0 rows: check if linkedin-publisher uses queue system — if so, queue items for platform='linkedin' don't exist yet. Document this in the result file — a seeding/routing change may be needed.

---

## Task 7 — Write result file

Write `docs/briefs/brief_040_result.md`:
- youtube-publisher version confirmed/deployed
- post_publish backfill: success or skipped (with reason)
- linkedin-publisher architecture: queue-based or post_draft-based
- linkedin-publisher fields required from publish profile
- LinkedIn tokens: inserted or awaiting PK
- LinkedIn test result: published or blocked (with reason)
- Any errors

---

## Error handling

- If youtube-publisher deploy times out in PowerShell: run manually from `C:\Users\parve\Invegent-content-engine` terminal.
- If linkedin-publisher code reveals it uses the queue system (platform='linkedin' queue items): LinkedIn posts won't fire until seeds are created for linkedin platform. Document this — do NOT try to fix the seeding in this brief. Log it as a follow-on task.
- If LinkedIn token doesn't have required scopes: document the specific error and stop. Do not guess or retry with wrong scopes.
