# Brief 013 Result — Platform OAuth Connect Page

**Executed:** 12 April 2026
**Executor:** Claude Code (Opus 4.6)
**Repos:** invegent-portal (UI), Supabase mbkmaxqhsohbtwsqolns (DB)

---

## Task Results

| Task | Description | Status |
|------|-------------|--------|
| 1 | DB: get_client_connect_status() SECURITY DEFINER | COMPLETED |
| 2 | DB: store_platform_token() + unique constraint | COMPLETED |
| 3 | Add getClientConnectStatus() to lib/portal-data.ts | COMPLETED |
| 4 | Build app/(portal)/connect/page.tsx | COMPLETED |
| 5 | Create Facebook OAuth initiation route | COMPLETED |
| 6 | Create Facebook OAuth callback route | COMPLETED |
| 7 | Create LinkedIn OAuth initiation route | COMPLETED |
| 8 | Create LinkedIn OAuth callback route | COMPLETED |
| 9 | Connect banner on portal home page | COMPLETED |
| 10 | Build + commit + deploy | COMPLETED |

---

## Details

### Task 1 — get_client_connect_status()
- Created as SECURITY DEFINER in public schema
- Joins client_service_agreement → service_package_channel → platform_channel
- Returns platform, channel_codes, is_connected, page_name, page_id, token_expires_at
- Verified with CFW client: 1 row, platform='facebook', is_connected=false
- Granted to authenticated + service_role

### Task 2 — store_platform_token()
- Created as SECURITY DEFINER in public schema
- Uses ON CONFLICT (client_id, platform) DO UPDATE for upsert
- Unique constraint `client_publish_profile_client_platform_unique` ADDED (did not exist)
- Granted to service_role only

### Task 3 — portal-data.ts
- Added PlatformConnectStatus type and getClientConnectStatus() function
- Existing getPortalDraftsCount() preserved unchanged

### Task 4 — Connect page
- Platform cards with icon, label, connected/not-connected badge
- "Connection coming soon" disabled button when OAUTH_ENABLED is false
- "Connect" button when enabled, "Reconnect" when already connected
- Privacy footer note
- Supports facebook, linkedin, instagram, youtube display configs

### Task 5-8 — OAuth routes
- Facebook initiation: /api/connect/facebook — redirects to coming_soon unless env enabled
- Facebook callback: /api/connect/facebook/callback — code exchange → long-lived token → page token → store_platform_token RPC
- LinkedIn initiation: /api/connect/linkedin — same pattern
- LinkedIn callback: /api/connect/linkedin/callback — code exchange → org lookup → store_platform_token RPC
- All routes use state parameter with base64url-encoded clientId for security

### Task 9 — Connect banner
- Added amber banner on portal home page when any platform is unconnected
- Used getPortalSession() separately since getPortalDashboardData() doesn't return clientId
- AlertTriangle icon already imported — no new imports needed

### Task 10 — Build + deploy
- Build: PASS (0 errors, 17 routes compiled)
- Commit SHA: b06f1a5
- 7 files changed: +431 -6
- Env vars doc written to brief_013_env_vars_needed.md

---

## Files Changed (invegent-portal)

| File | Action |
|------|--------|
| app/(portal)/connect/page.tsx | REPLACED (stub → full) |
| app/(portal)/page.tsx | MODIFIED (added connect banner) |
| app/api/connect/facebook/route.ts | CREATED |
| app/api/connect/facebook/callback/route.ts | CREATED |
| app/api/connect/linkedin/route.ts | CREATED |
| app/api/connect/linkedin/callback/route.ts | CREATED |
| lib/portal-data.ts | MODIFIED (added getClientConnectStatus) |

## DB Changes (Supabase)

| Object | Type | Schema |
|--------|------|--------|
| get_client_connect_status(UUID) | FUNCTION | public |
| store_platform_token(UUID,TEXT,TEXT,TEXT,TEXT,TIMESTAMPTZ) | FUNCTION | public |
| client_publish_profile_client_platform_unique | CONSTRAINT | c |

---

## Notes

- All platforms show "coming soon" by default — this is correct behaviour
- Facebook OAuth activation requires FACEBOOK_OAUTH_ENABLED=true + Meta Standard Access
- LinkedIn OAuth activation requires LINKEDIN_OAUTH_ENABLED=true + API approval
- Multi-page selection (when client manages multiple FB pages) is future work — currently uses first page
- Token refresh automation is not in scope for this brief
