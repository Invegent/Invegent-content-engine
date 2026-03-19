# Skill: Edge Function Deployment

Read before deploying any new or updated Supabase Edge Function.

---

## Before writing code

**What does success look like?**
Be specific. Not "image-worker generates images" but "image-worker picks up approved drafts with image_status=pending, renders SVG to PNG, uploads to post-images bucket, sets image_url and image_status=generated on the draft row."

**What does failure look like?**
Name the failure modes. image-worker: WASM not loaded, fonts missing, storage upload fails, draft not found. Write them down so you know what to test.

**What does the function need from the environment?**
List every secret, env var, and external service. Confirm they exist before writing code. The font upload failure happened because the dependency (font files in Storage) was assumed, not verified.

---

## Before deploying

**Does it handle errors without crashing?**
A 500 is worse than a graceful degradation. image-worker v1.3.0 crashed on missing fonts. v1.4.0 falls back to system fonts. The fallback is the right pattern.

**Does it write to a log?**
Every significant event should be loggable. At minimum: what it processed, what succeeded, what failed. The pipeline doctor needs something to read.

**Does the cron schedule conflict with anything?**
Check `cron.job` before adding a new schedule. Stagger offsets deliberately — health snapshot at :00/:30, doctor at :15/:45, AI summary at :55.

**Does it handle the empty case?**
What happens when there's nothing to process? Return early cleanly, don't error.

**Does it have a version string?**
Every function should have `const VERSION = 'function-name-v1.0.0'` at the top. Makes log reading unambiguous.

---

## After deploying — verify before declaring done

This is the step most often skipped. The font upload failure, the content_type_prompt gap, the publisher hold gate — all would have been caught by a verification call.

**Call the function once manually after deployment.**
Check the actual output, not just the HTTP status. A 200 with empty results is not the same as a 200 with correct results.

**Check the DB rows it should have written.**
If it's supposed to update `image_status`, query `m.post_draft` and confirm the status changed. Don't trust the response payload alone.

**If it runs on a cron, wait for the first cron run and check the log.**
The first cron-triggered run often has different context than a manual call.
