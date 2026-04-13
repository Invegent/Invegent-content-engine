# Brief 039 Result — instagram-publisher v1.0.0

**Executed:** 14 April 2026
**Commit:** 1a74f23

---

## Task Results

| Task | Status |
|------|--------|
| 1a. Get Instagram Business Account IDs | BLOCKED — neither FB page has linked IG Business account |
| 1b. Insert Instagram publish profiles | SKIPPED (no IG accounts to configure) |
| 2. Build instagram-publisher Edge Function | COMPLETED |
| 3. Register in k schema | SKIPPED (edge_function_registry table doesn't exist) |
| 4. Add cron job (every 15 min, job 53) | COMPLETED |
| 5. Deploy | COMPLETED — ACTIVE |
| 6. Test | N/A — no publish profiles yet |
| 7. Write result file | COMPLETED |

---

## Task 1 — Instagram Business Account Discovery

Called Graph API `/{PAGE_ID}?fields=instagram_business_account` for both clients:

| Client | FB Page ID | IG Business Account |
|--------|-----------|-------------------|
| NDIS Yarns | 950779394792976 | **NOT LINKED** — response has no `instagram_business_account` field |
| Property Pulse | 962399936961457 | **NOT LINKED** — same |

**Action required by PK:** Both Facebook pages need to be connected to Instagram Business accounts via Facebook Business Manager. Steps:
1. Go to Facebook Business Manager → Business Settings → Instagram Accounts
2. Connect the Instagram account for each page
3. Ensure the Instagram account is set as a Business account (not Personal or Creator)
4. Once linked, re-run the Graph API call to get the IG User ID
5. Insert publish profiles with the IG User ID

---

## Function Architecture

- **Cross-post pattern:** Queries `m.post_draft` directly for approved drafts with `image_url` or `video_url` not yet published to Instagram
- **Format support:** image_quote/carousel → image post; video_short_* → Reels; text → skipped
- **Token model:** Same Facebook Page Access Token used for Instagram API
- **Auth:** Uses `x-instagram-publisher-key` header with `publisher_api_key` vault secret (same key as main publisher)
- **Rate:** max 3 posts per client per run, every 15 min
- **Video handling:** Polls `status_code` until `FINISHED` (max 5 min timeout)

---

## Cron Job

- **Name:** instagram-publisher-every-15m
- **Schedule:** `*/15 * * * *`
- **Job ID:** 53
- **Status:** Active (will return `no_instagram_posts_ready` until profiles configured)
