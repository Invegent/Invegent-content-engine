# Build Spec Template

Copy this for complex features (anything that touches more than one component or takes more than a single session). Fill it in before writing any code. The act of filling it in often reveals the problem before you build the wrong thing.

Keep it short. If a section doesn't apply, delete it. This is a thinking tool, not a document.

---

## [Feature Name]

**Date:**
**Status:** Draft / Approved / Done

---

### Problem being solved

One paragraph. What breaks or is missing without this? Specific enough that someone reading it tomorrow knows whether it's been fixed.

### What done looks like

Exact observable outcomes. Not "images generate" but:
- `image_status` moves from `pending` to `generated` on approved drafts within 15 minutes
- `image_url` contains a valid public Supabase Storage URL
- Post publishes to Facebook with the image attached (visible in Facebook post)
- No image: post still publishes as text after 30-minute hold, not stuck forever

### What must not break

List the things downstream that depend on what you're changing. Be specific about which tables, which functions, which UI.

### Components being changed

List every file, function, table, and Edge Function being touched. If the list is long, that's a signal the scope is too wide.

### Verification steps

Step-by-step. Run these after deploying. Don't declare done until all steps produce the expected output.

1. Query: `SELECT ...` → Expected: `...`
2. Call function: `SELECT m.fn(...)` → Expected: `{ok: true, ...}`
3. Trigger cron: wait for next cycle → Check: edge-function logs show 200
4. End-to-end: approve a test draft → confirm it publishes with image

### Decisions made

Any non-obvious choices made during the build. One line each. These go into `06_decisions.md` after the build is done.

---

## Filled example: Visual Pipeline V1 (reference)

**Problem:** ICE publishes plain text only. No branded visual posts despite brand profiles existing.

**Done looks like:**
- ai-worker outputs `recommended_format` (image_quote/carousel/text) on every draft
- Approved image drafts have `image_url` set by image-worker within 15 minutes
- Publisher attaches image when `image_url` is set
- Posts publish as text if image not ready after 30-minute hold (not stuck)

**Must not break:** auto-approver, publisher cron schedule, existing queue items

**Verification:**
1. `SELECT recommended_format, COUNT(*) FROM m.post_draft GROUP BY 1` → non-null formats
2. Approve one image draft → check `image_status = generated` within 15 min
3. Check Facebook post has image attached
4. Check `m.post_publish.status = 'published'` for the test draft

**Decisions:** SVG/Resvg over sharp (no native binaries in Deno). GitHub CDN for fonts as Storage upload workaround.
