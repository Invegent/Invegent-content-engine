# Skill: Edge Function Deployment

Read before deploying any new or updated Supabase Edge Function.

---

## The Two-Attempt Rule

**If a fix fails twice using the same underlying approach — stop. Question the tool, not the implementation.**

The Resvg font rendering issue is the canonical example. We tried fontBuffers (attempt 1), then @font-face embedded base64 (attempt 2). Both failed. The correct response after attempt 2 was: "Is Resvg WASM v2.4.1 actually capable of font loading?" The answer was no — the API doesn't expose it. We spent 10 versions fixing the wrong thing.

**Before attempt 3, ask:**
- Does this library actually support what we're asking of it? Check the type definitions, not the README.
- Is there a different tool purpose-built for this use case?
- Are we fixing an implementation bug or working around a fundamental tool limitation?

If the answer is "tool limitation" — switch tools. Don't iterate on the unfixable.

**The right question:** "Is this tool capable?" not "What did I get wrong this time?"

---

## Before writing code

**What does success look like?**
Be specific. Not "image-worker generates images" but "image-worker picks up approved drafts with image_status=pending, renders SVG to PNG, uploads to post-images bucket, sets image_url and image_status=generated on the draft row."

**What does failure look like?**
Name the failure modes. image-worker: WASM not loaded, fonts missing, storage upload fails, draft not found. Write them down so you know what to test.

**What does the function need from the environment?**
List every secret, env var, and external service. Confirm they exist before writing code. The font upload failure happened because the dependency (font files in Storage) was assumed, not verified.

**Is this library actually the right tool?**
Before using any library for a non-trivial use case, check its type definitions (`.d.ts`) or source to confirm the API you need actually exists. README examples and blog posts lie. Type definitions don't.

---

## Before deploying

**Does it handle errors without crashing?**
A 500 is worse than a graceful degradation.

**Does it write to a log?**
Every significant event should be loggable. At minimum: what it processed, what succeeded, what failed.

**Does the cron schedule conflict with anything?**
Check `cron.job` before adding a new schedule. Stagger offsets deliberately — health snapshot at :00/:30, doctor at :15/:45, AI summary at :55.

**Does it handle the empty case?**
What happens when there's nothing to process? Return early cleanly, don't error.

**Does it have a version string?**
Every function should have `const VERSION = 'function-name-v1.0.0'` at the top.

---

## After deploying — verify before declaring done

**Call the function once manually after deployment.**
Check the actual output, not just the HTTP status.

**Check the DB rows it should have written.**
If it's supposed to update `image_status`, query `m.post_draft` and confirm the status changed. Don't trust the response payload alone.

**For image generation: check the actual file size.**
A blank 1080×1080 dark PNG compresses to ~15KB. A rendered image with text is 150KB+. File size is the fastest proxy for "did text render."

**If it runs on a cron, wait for the first cron run and check the log.**
The first cron-triggered run often has different context than a manual call.
