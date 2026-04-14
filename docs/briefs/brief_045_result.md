# Brief 045 Result — WordPress Publisher for Care For Welfare

**Executed:** 14 April 2026
**Commit:** 5c5cb4b

---

## Task Results

| Task | Status |
|------|--------|
| 1. Test WP API auth | PASSED (with User-Agent fix) |
| 2. Get/create NDIS News category | COMPLETED — ID: 20 |
| 3. Build wordpress-publisher Edge Function | COMPLETED |
| 4. Cron job (every 6h, job 55) | COMPLETED |
| 5. Deploy | COMPLETED — ACTIVE |
| 6. Test (dry run) | COMPLETED — 0 drafts ready (CFW pipeline not active) |
| 7. Write result file | COMPLETED |

---

## Key Findings

### Mod_Security on careforwelfare.com.au
The WP REST API returns HTTP 406 "Not Acceptable" for requests without a standard User-Agent header. Mod_Security (Apache WAF) blocks non-browser requests. Fixed by adding `User-Agent: Mozilla/5.0 (compatible; Invegent-WP-Publisher/1.0)` to all fetch calls.

### Category
- "NDIS News" category did not exist — created via API
- Category ID: 20, slug: `ndis-news`
- URL will be: careforwelfare.com.au/category/ndis-news/

### Client Config
Added to `c.client.profile` JSONB for CFW:
- `website_publish_enabled: "true"`
- `wp_site_url: "https://www.careforwelfare.com.au"`
- `wp_username: "admin"`
- `wp_category_slug: "ndis-news"`
- `wp_secret_env_key: "CFW_WP_APP_PASSWORD"`

### Dry Run Result
```json
{"ok":true,"version":"wordpress-publisher-v1.0.0","dry_run":true,"processed":0,"results":[]}
```
0 drafts because CFW has no pipeline running yet (no AI profile, no feeds configured). Once CFW pipeline is active and generating approved facebook drafts, the wordpress-publisher will cross-post them automatically every 6 hours.

---

## Architecture
- Cross-post pattern: queries `m.post_draft` for approved facebook drafts not yet published to `website` platform
- Max 3 posts per client per run (SEO-friendly rate)
- Supports `dry_run` mode for safe testing
- Writes `m.post_publish` records with `platform = 'website'`
- Category and auth resolved from `c.client.profile` JSONB per client
- App password stored as Supabase Edge Function secret (`CFW_WP_APP_PASSWORD`)
