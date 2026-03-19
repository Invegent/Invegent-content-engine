# Skill: Pipeline Change Verification

Read before making any change to the publish pipeline — publisher, image-worker, auto-approver, bundler, scorer, or any function in `run_pipeline_for_client`.

The pipeline is a chain. A change anywhere can silently break something downstream. This skill is about making the chain visible before touching it.

---

## Understand the chain first

The full pipeline:
```
ingest → content-fetch → score_digest_items_v2 → select_digest_items_v2 
→ cluster_digest_items_v1 → bundle_client_v4 → seed_client_to_ai_v2 
→ ai-worker → auto-approver → image-worker → publisher
```

For the change you're making: which steps are upstream? Which are downstream? What does each downstream step assume about the data the changed step produces?

**The content_type_prompt gap happened because image-worker assumed ai-worker would output `recommended_format` and `image_headline`. ai-worker assumed content_type_prompt rows would include those fields. Neither assumption was verified end-to-end.**

---

## Before changing

**Query the current state of relevant rows.**
Before changing a scoring function, check what the current score distribution looks like:
```sql
SELECT final_category, COUNT(*) 
FROM m.digest_item 
WHERE created_at >= now() - interval '48 hours'
GROUP BY 1 ORDER BY 2 DESC;
```
This is the baseline. Compare after the change.

**Check what's currently in the queue.**
A pipeline change mid-flight affects in-progress items. Know what's queued, what's pending image generation, what's approved but not published. Don't make changes when series posts are scheduled to fire in the next hour.

---

## After changing

**Run `run_pipeline_for_client` manually for both clients and read the output.**
```sql
SELECT m.run_pipeline_for_client('fb98a472-ae4d-432d-8738-2273231c1ef4', 48, 0, 72, 4, 2, 10);
SELECT m.run_pipeline_for_client('4036a6b5-b4a3-406e-998d-c2fe14a8bbdd', 48, 0, 72, 4, 2, 10);
```
Check: `ok: true`. Check: `items_bundled` and `seeds` are reasonable numbers, not 0 when they should be non-zero.

**Check the drafts that came out.**
If you changed scoring or bundling, look at the new drafts in `m.post_draft`. Do the titles look diverse? Are the categories correct? Is `recommended_format` set correctly?

**Check image-worker on the next cycle.**
If you changed anything upstream of image-worker, watch the first image-worker run after your change. Check edge-function logs for 200 vs 500. Check `image_status` on the affected drafts.

**Check the publisher doesn't hold indefinitely.**
Approve one test draft and watch it move through the queue. Confirm it either publishes or produces a clear, expected error. An item sitting in `running` state for > 20 minutes means something is stuck.

---

## The one question that prevents most pipeline bugs

**"What does the next step in the chain assume about the data I'm producing?"**

Answer it before shipping.
