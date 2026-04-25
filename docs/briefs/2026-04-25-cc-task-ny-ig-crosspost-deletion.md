# Claude Code Brief — Delete 18 NY IG Cross-Posts via Meta Graph API

**Date:** 25 April 2026 Saturday | **Owner:** PK (run by handing this brief to Claude Code in `C:\Users\parve\Invegent-content-engine`) | **Estimated runtime:** 5–10 minutes

---

## Context (read this first, do NOT skip)

On 19 April 2026, instagram-publisher v1.0.0 published 18 IG posts to NDIS Yarns Instagram. **All 18 were cross-posted from FB-platform drafts** — `pp.platform='instagram'` but `pd.platform='facebook'` for every one. FB-shaped content went live on the actual NY Instagram account (`@ndisyarns`).

The bug class (M12) was closed earlier today via instagram-publisher v2.0.0 queue-based refactor (commit `562ab3e`, deploy verified). v2.0.0's three-layer platform discipline is verified working in production via the 08:15 UTC live-tick failed-publish row showing `platforms_match = TRUE`.

The 18 historical cross-posts remain on NY's IG account. They are **almost certainly the cause of Meta's current app-level rate restriction** (error code 4 / subcode 2207051 / "Application request limit reached" / `is_transient: false`). Removing the 18 posts demonstrates to Meta that the bad behaviour is gone, and is the standard remediation for this restriction class.

This brief runs the deletion. Independent of v2.0.0 — separate workflow.

The script `scripts/delete_ny_ig_crosspost_cleanup_20260419.sh` exists but **DO NOT just run it as-is**. The brief adds three guardrails the script doesn't enforce:
1. Re-verify the 18 IDs match the live DB before deleting
2. Token handling discipline (env var only, never echo, never log)
3. Per-ID DB writeback so `m.post_publish.response_payload` records the deletion event

---

## Pre-flight

Before running the sequence:

- [ ] You're in `C:\Users\parve\Invegent-content-engine`
- [ ] `git pull` has run (this brief itself was just committed)
- [ ] **Cron jobid 53 is `active=false`** — verify with `SELECT active FROM cron.job WHERE jobid = 53;` — must be FALSE. If TRUE, stop and pause it before proceeding (running deletes against an active publishing pipeline is not safe, even though the publisher only writes new IG posts and doesn't touch existing ones).
- [ ] `bash` is available (Git Bash, WSL, or whatever's available — NOT PowerShell, the script uses bash flag syntax)

---

## Step 1 — Re-verify the 18 IDs match the live DB

The script has 18 hardcoded `IG_MEDIA_IDS`. Before running, confirm the live DB still shows exactly those 18 rows as the cross-posts.

Run this query via Supabase MCP:

```sql
SELECT 
  pp.platform_post_id AS ig_media_id,
  pp.published_at AT TIME ZONE 'Australia/Sydney' AS pub_aest,
  LEFT(pd.draft_title, 60) AS title
FROM m.post_publish pp
JOIN c.client c ON c.client_id = pp.client_id
LEFT JOIN m.post_draft pd ON pd.post_draft_id = pp.post_draft_id
WHERE c.client_slug = 'ndis-yarns'
  AND pp.platform = 'instagram'
  AND pp.status = 'published'
  AND pd.platform = 'facebook'  -- the cross-post signature
  AND pp.published_at::date = '2026-04-19'
ORDER BY pp.published_at;
```

**Expected:** 18 rows. The 18 `ig_media_id` values must match the `IG_MEDIA_IDS` array in `scripts/delete_ny_ig_crosspost_cleanup_20260419.sh` exactly.

**If count != 18 OR any ID doesn't match the script:** STOP. The DB has drifted from when the script was committed. Report the diff to PK and don't proceed.

**If count == 18 and all IDs match:** Proceed to Step 2.

---

## Step 2 — Fetch NY IG token + verify expiry

Pull the page access token from the live DB. **Do not echo, log, or commit this value anywhere.** Treat it like a credential.

```sql
SELECT 
  page_access_token,
  token_expires_at AT TIME ZONE 'Australia/Sydney' AS expires_aest,
  token_expires_at > NOW() + INTERVAL '1 hour' AS valid_for_at_least_1h
FROM c.client_publish_profile
WHERE client_id = 'fb98a472-ae4d-432d-8738-2273231c1ef4'::uuid  -- NDIS Yarns
  AND platform = 'instagram'
  AND status = 'active';
```

**Expected:** 1 row, `valid_for_at_least_1h = TRUE`.

**If `valid_for_at_least_1h = FALSE` or token is null:** STOP. PK needs to refresh the token before deletion can run. Report and exit.

**If valid:** Export the token to your shell session env. **Do not write it to any file, do not include it in any commit message, do not echo it back in your responses.**

```bash
export NY_IG_TOKEN='<value from query — direct paste, no quotes echo>'
```

Verify it's set without echoing:
```bash
test -n "$NY_IG_TOKEN" && echo "token set" || echo "token MISSING"
```

---

## Step 3 — Single-target test before bulk run

Before looping through all 18, test against ONE ID to confirm:
- The token works
- Meta's DELETE endpoint isn't currently rate-limited for this account
- The response shape matches what the script expects

Pick the first ID from the script (`18059807273476954` — the 12:30 AEST "When dementia care shifts from managing to understanding" post):

```bash
curl -s -X DELETE "https://graph.facebook.com/v19.0/18059807273476954?access_token=${NY_IG_TOKEN}"
```

**Expected:** `{"success":true}`

**Other expected responses:**
- `{"error":{"message":"...does not exist...","code":100,...}}` → post already deleted manually. Treat as success for that ID. Continue to bulk.
- `{"error":{"message":"Application request limit reached","code":4,"error_subcode":2207051,...}}` → Meta rate limit still active for DELETE on this app. STOP. Same restriction as the publish failure. Wait longer (24-48h from the original publish attempt) before retrying.
- `{"error":{"message":"Invalid OAuth access token...","code":190,...}}` → token expired between Step 2 and now. STOP. Refresh token.
- Any other error → STOP. Capture full response and report to PK.

**If the test returns `{"success":true}`:** First post is deleted. Mark this ID as done — don't re-attempt it in Step 4. Update `m.post_publish` for this row:

```sql
UPDATE m.post_publish
SET response_payload = response_payload || jsonb_build_object(
      'deleted_from_platform_at', NOW()::text,
      'deletion_reason', 'm12_crosspost_cleanup_2026-04-19',
      'deletion_method', 'meta_graph_api_v19'
    )
WHERE platform_post_id = '18059807273476954'
  AND platform = 'instagram';
```

(If Meta returned `does not exist` instead, use the same UPDATE but set `deletion_method` to `manual_or_already_gone`.)

---

## Step 4 — Bulk delete remaining 17

Loop through the remaining 17 IDs (skipping `18059807273476954` which Step 3 handled). For each:

```bash
# Pseudo-code — implement in a real bash loop
REMAINING_IDS=(
  "18109094788803103" "18071278490297970" "18096822992048253"
  "18098175296017192" "17987055332965094" "17996748383763958"
  "18007034186856697" "18078493178393805" "18122786212715891"
  "18112414657808516" "18114045667689651" "18321500404266191"
  "17849870463676052" "18182116393384228" "17999407478875649"
  "18102244058501057" "18087520979205521"
)

for id in "${REMAINING_IDS[@]}"; do
  echo -n "[$id] "
  response=$(curl -s -X DELETE "https://graph.facebook.com/v19.0/${id}?access_token=${NY_IG_TOKEN}")
  
  if echo "$response" | grep -q '"success":true'; then
    echo "OK (deleted)"
    # Mark in DB — see UPDATE template below
  elif echo "$response" | grep -q 'does not exist'; then
    echo "OK (already gone)"
    # Mark in DB with method=manual_or_already_gone
  elif echo "$response" | grep -q '"code":4'; then
    echo "RATE_LIMITED — STOP"
    break
  else
    echo "FAILED: $response"
    # Don't mark in DB — leave for retry
  fi
  
  sleep 0.5  # Be polite to Meta API
done
```

For each ID that returned success or already-gone, run the same UPDATE pattern from Step 3 with the correct `platform_post_id` and `deletion_method`.

**If you hit a rate limit mid-loop:** Stop the loop, mark in your output which IDs are still pending, and report. Do NOT retry within this session.

---

## Step 5 — Verify deletions via GET

For every ID that Step 3 + Step 4 reported as deleted, do a final GET to confirm:

```bash
curl -s "https://graph.facebook.com/v19.0/<media_id>?access_token=${NY_IG_TOKEN}"
```

**Expected:** Error response containing `"does not exist"` or similar (proves the post is gone from Meta's side).

**If GET returns the post object instead of an error:** The DELETE didn't actually take. Flag to PK.

Run this for all 18 IDs (or however many the loop processed). Should be a single bash loop.

---

## Step 6 — Update sync_state

If all 18 IDs are confirmed deleted (Step 5 returns `does not exist` for each):

Single targeted edit to `docs/00_sync_state.md`. Find the "M12 CLOSURE" section's "What stays open / 18 cross-posts" wording (it's currently noted as PK-pending). Update to:

> **18 NY IG cross-posts cleanup: COMPLETE.** All 18 media IDs deleted from Meta on `<UTC timestamp>` via `scripts/delete_ny_ig_crosspost_cleanup_20260419.sh`. `m.post_publish` rows updated with `deleted_from_platform_at` markers in `response_payload`. Meta restriction (error 2207051) expected to clear within 24-48h of this cleanup; A10b unblocked when next clean publish lands.

Use GitHub MCP, fetch fresh SHA, single targeted edit. Don't rewrite the file. Commit message: `docs(sync_state): NY IG cross-post cleanup complete — 18/18 deleted`.

If less than 18 were deleted (rate limited mid-loop, or some failed):

Capture the partial-state version. Note which IDs are still pending. Commit message: `docs(sync_state): NY IG cross-post cleanup partial — N/18 deleted, M pending Meta rate limit`.

---

## Acceptance criteria

The cleanup is complete when ALL of these are true:

- [ ] All 18 IDs return `does not exist` on a final GET
- [ ] All 18 `m.post_publish` rows have `deleted_from_platform_at` set in `response_payload`
- [ ] sync_state updated with completion timestamp
- [ ] Cron jobid 53 is still `active=false` (you didn't change it)
- [ ] `$NY_IG_TOKEN` env var is unset before session ends: `unset NY_IG_TOKEN`

If 18/18 deleted: full success. PK now waits 24-48h then re-tests v2.0.0.

If <18 deleted: partial success. Re-run this brief later for remaining IDs after Meta rate limit clears.

---

## What NOT to do

- **Do NOT echo, log, commit, or include `$NY_IG_TOKEN` in any output, including thinking-out-loud text.** Treat as a credential. If you accidentally include it in any output, immediately tell PK to rotate the token.
- **Do NOT unpause cron jobid 53 after deletion.** Meta restriction may or may not have lifted. PK runs the verification + unpause as a separate manual step (per the existing recovery sequence in sync_state).
- **Do NOT trigger a publish-test from this brief.** Goal is deletion, not publishing.
- **Do NOT delete any IG media not in the 18-ID list.** Even if the live-DB query in Step 1 returns 19 or 20 rows for some reason, only delete the 18 from the script.
- **Do NOT modify the deletion script** (`scripts/delete_ny_ig_crosspost_cleanup_20260419.sh`). It stays as-committed for the record. Your bash logic in Steps 3-4 is a Claude Code-side adaptation that adds the DB writeback — that's fine to keep ephemeral, don't commit it.
- **Do NOT proceed past a rate-limit error.** If Meta returns code 4 / subcode 2207051 at any point, stop, capture partial state, report, exit.

---

## Failure protocol

If anything goes sideways:

1. Immediately stop the loop.
2. Capture the exact failing output (excluding the token).
3. Run the verify-via-GET on the IDs you've processed so far to know exactly which are deleted vs still on Meta.
4. Update `m.post_publish` for the IDs that ARE confirmed deleted.
5. Report to PK with: (a) which step failed, (b) exact error, (c) state before/after, (d) which IDs are deleted, (e) which are still pending.
6. Exit cleanly with `unset NY_IG_TOKEN`.

Don't troubleshoot beyond the obvious. If Meta is the blocker, it's a wait-and-retry — not a debug.

---

## Reference docs

- `scripts/delete_ny_ig_crosspost_cleanup_20260419.sh` — the original cleanup script (commit `f0c34f3`)
- `docs/decisions/D169_instagram_publisher_v2_queue_refactor.md` — M12 closure decision
- `docs/00_sync_state.md` — "M12 CLOSURE" section + recovery sequence
