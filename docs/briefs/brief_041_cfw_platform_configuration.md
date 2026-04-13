# Brief 041 — CFW full platform configuration + acceptance test

**Date:** 14 April 2026  
**Phase:** 3 — First external client  
**Repo:** `Invegent-content-engine`  
**Working directory:** `C:\Users\parve\Invegent-content-engine`  
**Supabase project:** `mbkmaxqhsohbtwsqolns`  
**MCPs required:** Supabase MCP  
**Estimated time:** 2–3 hours (plus PK token-gathering time)  
**Prerequisite:** Briefs 038, 039, 040 complete

---

## Context

Care for Welfare (CFW, client_id: `3eca32aa-e460-462f-a846-3f6ace6a3cae`) is the first external client. They need all 4 platforms working: Facebook, LinkedIn, Instagram, YouTube.

CFW currently has zero publish profiles. Nothing will publish to CFW until this brief is complete.

**This brief requires PK to gather tokens and IDs before Claude Code can run.** Read the full brief first, gather everything in the MANUAL SETUP section, then run.

---

## MANUAL SETUP — PK must gather before running

For each platform, PK needs to collect the following from CFW's social accounts:

### Facebook
- **Page Access Token** (60-day): Go to Facebook Developer → Graph API Explorer → select CFW Facebook page → generate a Page Access Token with `pages_manage_posts`, `pages_read_engagement` permissions. Then extend it to 60 days via the token debugger.
- **Page ID**: Found in CFW Facebook page → About → Page ID (numeric string)
- **Page name**: e.g. `Care for Welfare`

### LinkedIn  
- **Member Access Token**: same process as Brief 040 Task 4
- **Organization URN**: `urn:li:organization:XXXXXXXXX` from CFW LinkedIn page URL
- **Page name**: e.g. `Care for Welfare`

### Instagram
- **Instagram Business Account ID**: Call `GET https://graph.facebook.com/v19.0/{CFW_FB_PAGE_ID}?fields=instagram_business_account&access_token={CFW_FB_TOKEN}` — use the same Facebook token from above. Returns the IG Business Account ID.
- **Token**: same Facebook token as above
- **Note:** CFW's Facebook page must be connected to an Instagram Business account in Facebook Business Manager. Confirm this before proceeding.

### YouTube
- **Refresh token**: CFW's YouTube channel OAuth refresh token. To generate:
  1. Go to Google OAuth playground or use the existing YouTube OAuth flow in ICE
  2. Auth with CFW's Google account that owns the YouTube channel
  3. Scope: `https://www.googleapis.com/auth/youtube.upload`
  4. Exchange auth code for refresh token
  5. Store the refresh token (not the access token — it expires in 1 hour)
- **Channel ID**: Found in CFW YouTube channel → About → Share → Copy channel ID (starts with `UC`)
- **Note:** The youtube-publisher uses `c.client_channel.config->>'refresh_token'` as the primary token source. This brief inserts it there.

---

## Task 1 — Verify CFW client record exists and is configured

```sql
SELECT
  c.client_id, c.client_name, c.status,
  c.serves_ndis_participants, c.profession_slug,
  cap.status AS ai_profile_status,
  cbp.brand_name
FROM c.client c
LEFT JOIN c.client_ai_profile cap ON cap.client_id = c.client_id AND cap.is_default = true
LEFT JOIN c.client_brand_profile cbp ON cbp.client_id = c.client_id AND cbp.is_active = true
WHERE c.client_id = '3eca32aa-e460-462f-a846-3f6ace6a3cae';
```

Check also that content scope exists:
```sql
SELECT cv.vertical_name, cv.vertical_slug, ccs.is_primary
FROM c.client_content_scope ccs
JOIN t.content_vertical cv ON cv.vertical_id = ccs.vertical_id
WHERE ccs.client_id = '3eca32aa-e460-462f-a846-3f6ace6a3cae';
```

If no content scope rows: stop and report — CFW needs to be onboarded before platforms are configured. The acceptance test cannot run without a content scope.

---

## Task 2 — Insert Facebook publish profile

```sql
INSERT INTO c.client_publish_profile (
  client_id, platform, status, publish_enabled,
  page_access_token, page_id, page_name,
  preferred_format_facebook,
  image_generation_enabled, video_generation_enabled,
  auto_approve_enabled, require_client_approval
) VALUES (
  '3eca32aa-e460-462f-a846-3f6ace6a3cae',
  'facebook', 'active', false,  -- publish_enabled = FALSE until tested
  '{CFW_FB_PAGE_TOKEN}',
  '{CFW_FB_PAGE_ID}',
  'Care for Welfare',
  'image_quote',
  true, true, true, false
)
ON CONFLICT (client_id, platform) DO UPDATE SET
  page_access_token = EXCLUDED.page_access_token,
  page_id = EXCLUDED.page_id,
  status = 'active',
  updated_at = NOW();
```

---

## Task 3 — Insert LinkedIn publish profile

```sql
INSERT INTO c.client_publish_profile (
  client_id, platform, status, publish_enabled,
  page_access_token, page_id, page_name,
  image_generation_enabled, video_generation_enabled,
  auto_approve_enabled, require_client_approval
) VALUES (
  '3eca32aa-e460-462f-a846-3f6ace6a3cae',
  'linkedin', 'active', false,
  '{CFW_LINKEDIN_TOKEN}',
  '{CFW_LINKEDIN_ORG_URN}',
  'Care for Welfare',
  true, true, true, false
)
ON CONFLICT (client_id, platform) DO UPDATE SET
  page_access_token = EXCLUDED.page_access_token,
  page_id = EXCLUDED.page_id,
  status = 'active',
  updated_at = NOW();
```

---

## Task 4 — Insert Instagram publish profile

```sql
INSERT INTO c.client_publish_profile (
  client_id, platform, status, publish_enabled,
  page_access_token, page_id, page_name,
  image_generation_enabled, video_generation_enabled,
  auto_approve_enabled, require_client_approval
) VALUES (
  '3eca32aa-e460-462f-a846-3f6ace6a3cae',
  'instagram', 'active', false,
  '{CFW_FB_PAGE_TOKEN}',  -- same as Facebook token
  '{CFW_IG_BUSINESS_ACCOUNT_ID}',
  'Care for Welfare',
  true, true, true, false
)
ON CONFLICT (client_id, platform) DO UPDATE SET
  page_access_token = EXCLUDED.page_access_token,
  page_id = EXCLUDED.page_id,
  status = 'active',
  updated_at = NOW();
```

---

## Task 5 — Insert YouTube channel record

The youtube-publisher reads the refresh token from `c.client_channel`:

```sql
-- Check if client_channel table exists and its structure
SELECT schema_name, table_name, columns_list
FROM k.vw_table_summary
WHERE schema_name = 'c' AND table_name = 'client_channel';
```

Then insert:

```sql
INSERT INTO c.client_channel (
  client_id, platform, channel_id, channel_name, config
) VALUES (
  '3eca32aa-e460-462f-a846-3f6ace6a3cae',
  'youtube',
  '{CFW_YOUTUBE_CHANNEL_ID}',
  'Care for Welfare',
  jsonb_build_object('refresh_token', '{CFW_YOUTUBE_REFRESH_TOKEN}')
)
ON CONFLICT (client_id, platform) DO UPDATE SET
  channel_id = EXCLUDED.channel_id,
  config = EXCLUDED.config,
  updated_at = NOW();
```

Also insert YouTube publish profile:

```sql
INSERT INTO c.client_publish_profile (
  client_id, platform, status, publish_enabled,
  page_id, page_name,
  image_generation_enabled, video_generation_enabled,
  auto_approve_enabled
) VALUES (
  '3eca32aa-e460-462f-a846-3f6ace6a3cae',
  'youtube', 'active', false,
  '{CFW_YOUTUBE_CHANNEL_ID}',
  'Care for Welfare',
  false, true, true
)
ON CONFLICT (client_id, platform) DO NOTHING;
```

---

## Task 6 — Verify all 4 profiles created

```sql
SELECT platform, status, publish_enabled, page_id, page_name,
  CASE WHEN page_access_token IS NOT NULL AND page_access_token != '' THEN 'SET' ELSE 'MISSING' END AS token
FROM c.client_publish_profile
WHERE client_id = '3eca32aa-e460-462f-a846-3f6ace6a3cae'
ORDER BY platform;
```

Expected: 4 rows (facebook, instagram, linkedin, youtube), all with token SET.

---

## Task 7 — Test each platform one at a time

**Pass/fail criteria (for every platform):**
- ✅ PASS: `m.post_publish` record written with `platform_post_id` set AND post is visible on the platform page
- ❌ FAIL: Error returned from publisher, or `post_publish` record missing, or `platform_post_id` is null

### 7a — Test Facebook

1. Set `publish_enabled = true` for Facebook only:
```sql
UPDATE c.client_publish_profile
SET publish_enabled = true
WHERE client_id = '3eca32aa-e460-462f-a846-3f6ace6a3cae'
  AND platform = 'facebook';
```

2. Find an existing approved text draft for CFW, or create a test seed. If CFW has no content yet, trigger ai-worker manually for CFW once seeding is configured.

3. Check `m.post_publish` after publisher cron fires (up to 15 minutes):
```sql
SELECT platform, platform_post_id, published_at, status
FROM m.post_publish
WHERE client_id = '3eca32aa-e460-462f-a846-3f6ace6a3cae'
ORDER BY published_at DESC;
```

4. Record result: PASS or FAIL with error.

### 7b — Test LinkedIn (after Facebook passes)

Same process: set `publish_enabled = true` for LinkedIn, wait for publisher cron, check post_publish.

### 7c — Test Instagram (after LinkedIn passes)

Same process: set `publish_enabled = true` for Instagram, wait for instagram-publisher cron, check post_publish.

### 7d — Test YouTube (after Instagram passes)

Same process: set `publish_enabled = true` for YouTube, ensure there is a draft with `video_url` set, wait for youtube-publisher cron, check post_publish.

**Note:** YouTube requires a generated video (video_url set on draft). If CFW has no video drafts yet, YouTube testing may need to wait until the content pipeline generates one.

---

## Task 8 — Enable all passing platforms

For each platform that passed:
```sql
UPDATE c.client_publish_profile
SET publish_enabled = true
WHERE client_id = '3eca32aa-e460-462f-a846-3f6ace6a3cae'
  AND platform IN ('facebook', 'linkedin', 'instagram', 'youtube');
  -- remove any that failed
```

---

## Task 9 — Write result file

Write `docs/briefs/brief_041_result.md`:

**Platform test matrix:**
| Platform | Token set? | Test result | platform_post_id | Notes |
|---|---|---|---|---|
| Facebook | | | | |
| LinkedIn | | | | |
| Instagram | | | | |
| YouTube | | | | |

- Any platforms still disabled and why
- Next steps to complete any failing platforms
- CFW acceptance test readiness: READY / BLOCKED (with reason)

---

## Error handling

- If CFW has no content scope: stop at Task 1 and report. Onboarding must run first.
- If Facebook token is invalid (error 190): token was not properly extended to 60 days. PK must regenerate.
- If Instagram returns no `instagram_business_account`: the Facebook page is not linked to an Instagram Business account. PK must connect it in Facebook Business Manager before Instagram can be configured.
- If YouTube refresh token fails: verify the Google account used has admin access to the CFW YouTube channel and the token was generated with `youtube.upload` scope.
- If LinkedIn publisher is queue-based (from Brief 040 finding) and no queue items exist for `platform='linkedin'`: LinkedIn cannot be tested until seeds are created for that platform. Document this and skip LinkedIn for now — it is a seeding infrastructure change, not a configuration change.
- Never set `publish_enabled = true` for a platform that has not passed the test. Set it individually only for passing platforms.
