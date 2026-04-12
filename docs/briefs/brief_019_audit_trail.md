# Claude Code Brief 019 — Audit Trail Column Writes

**Date:** 12 April 2026
**Status:** READY TO RUN
**Decisions:** D088
**Repos:** `Invegent-content-engine`
**Working directory:** `C:\Users\parve\Invegent-content-engine`
**Supabase project:** `mbkmaxqhsohbtwsqolns`
**MCPs required:** GitHub MCP, Supabase MCP
**Estimated time:** 1–2 hours

---

## Context

D088 added four columns to `m.post_draft` for audit trail purposes.
Two of them are not yet being written:

| Column | Written by | Current status |
|---|---|---|
| `approved_by` | auto-approver | ✅ Already writing `'auto-agent-v1'` |
| `approved_at` | auto-approver | ✅ Already writing `checkedAt` |
| `auto_approval_scores` | auto-approver | ❌ Not written — gate scores are in `draft_format.auto_review` only |
| `compliance_flags` | ai-worker | ❌ Not written — rule count is in `draftMeta` only |

This brief adds the two missing writes. Both functions already update
`m.post_draft` directly via `supabase.schema('m').from('post_draft').update()`
using the service role key. No new SECURITY DEFINER functions needed.

---

## Task 1 — Verify both columns exist

```sql
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'm' AND table_name = 'post_draft'
  AND column_name IN ('compliance_flags', 'auto_approval_scores')
ORDER BY column_name;
```

Expected: 2 rows. If either column is missing, add it:
```sql
ALTER TABLE m.post_draft
  ADD COLUMN IF NOT EXISTS compliance_flags JSONB,
  ADD COLUMN IF NOT EXISTS auto_approval_scores JSONB;
```

---

## Task 2 — Update ai-worker: write compliance_flags

**File:** `supabase/functions/ai-worker/index.ts`

### Change 1 — Bump version

Find:
```typescript
const VERSION = "ai-worker-v2.7.0";
```
Replace with:
```typescript
const VERSION = "ai-worker-v2.7.1";
// v2.7.1 — Write compliance_flags to m.post_draft (D088)
//   Skip (HARD_BLOCK): compliance_flags = [{rule, severity: 'HARD_BLOCK', triggered: true, at}]
//   Success: compliance_flags = [] (rules checked, none triggered)
```

### Change 2 — Write compliance_flags on skip (HARD_BLOCK)

Find the skip case update block:
```typescript
if (result.skip) {
  const skipReason = result.skipReason || 'compliance_block';
  await supabase.schema('m').from('post_draft').update({ approval_status: 'dead', draft_format: { compliance_skip: true, reason: skipReason, at: nowIso() }, updated_at: nowIso() }).eq('post_draft_id', job.post_draft_id);
```

Replace the update call with:
```typescript
if (result.skip) {
  const skipReason = result.skipReason || 'compliance_block';
  await supabase.schema('m').from('post_draft').update({
    approval_status: 'dead',
    draft_format: { compliance_skip: true, reason: skipReason, at: nowIso() },
    compliance_flags: [{ rule: skipReason, severity: 'HARD_BLOCK', triggered: true, at: nowIso() }],
    updated_at: nowIso(),
  }).eq('post_draft_id', job.post_draft_id);
```

### Change 3 — Write compliance_flags on success

Find the `baseUpdate` object:
```typescript
const baseUpdate: any = {
  draft_title: result.title, draft_body: result.body, draft_format: draftMeta,
  approval_status: 'needs_review', recommended_format: decidedFormat,
  recommended_reason: advisorReason, image_headline: finalImageHeadline,
  updated_at: nowIso(),
};
```

Replace with:
```typescript
const baseUpdate: any = {
  draft_title: result.title,
  draft_body: result.body,
  draft_format: draftMeta,
  approval_status: 'needs_review',
  recommended_format: decidedFormat,
  recommended_reason: advisorReason,
  image_headline: finalImageHeadline,
  compliance_flags: [],  // rules were checked, none triggered a skip
  updated_at: nowIso(),
};
```

---

## Task 3 — Update auto-approver: write auto_approval_scores

**File:** `supabase/functions/auto-approver/index.ts`

### Change 1 — Bump version

Find:
```typescript
const VERSION = "auto-approver-v1.3.0";
```
Replace with:
```typescript
const VERSION = "auto-approver-v1.4.0";
// v1.4.0 — Write auto_approval_scores to m.post_draft (D088)
//   approved: auto_approval_scores = {gates, checked_at, agent, passed: true}
//   skipped:  auto_approval_scores = {gates, checked_at, agent, passed: false, failed_gate}
```

### Change 2 — Write auto_approval_scores on approval

In `processOneDraft`, find the `if (passed)` branch update:
```typescript
if (passed) {
  const { error } = await supabase
    .schema("m")
    .from("post_draft")
    .update({
      approval_status: "approved",
      approved_by: "auto-agent-v1",
      approved_at: checkedAt,
      draft_format: { ...existingFormat, auto_review: { passed: true, gates, checked_at: checkedAt, agent: VERSION } },
      updated_at: checkedAt,
    })
    .eq("post_draft_id", draft.post_draft_id);
```

Replace with:
```typescript
if (passed) {
  const { error } = await supabase
    .schema("m")
    .from("post_draft")
    .update({
      approval_status: "approved",
      approved_by: "auto-agent-v1",
      approved_at: checkedAt,
      auto_approval_scores: { gates, passed: true, checked_at: checkedAt, agent: VERSION },
      draft_format: { ...existingFormat, auto_review: { passed: true, gates, checked_at: checkedAt, agent: VERSION } },
      updated_at: checkedAt,
    })
    .eq("post_draft_id", draft.post_draft_id);
```

### Change 3 — Write auto_approval_scores on skip

In the `else` branch (draft did not pass gates), find:
```typescript
  await supabase
    .schema("m")
    .from("post_draft")
    .update({
      draft_format: { ...existingFormat, auto_review: { passed: false, failed_gate: failed_gate?.gate, reason: failed_gate?.reason, gates, checked_at: checkedAt, agent: VERSION } },
      updated_at: checkedAt,
    })
    .eq("post_draft_id", draft.post_draft_id);
```

Replace with:
```typescript
  await supabase
    .schema("m")
    .from("post_draft")
    .update({
      auto_approval_scores: { gates, passed: false, failed_gate: failed_gate?.gate, reason: failed_gate?.reason, checked_at: checkedAt, agent: VERSION },
      draft_format: { ...existingFormat, auto_review: { passed: false, failed_gate: failed_gate?.gate, reason: failed_gate?.reason, gates, checked_at: checkedAt, agent: VERSION } },
      updated_at: checkedAt,
    })
    .eq("post_draft_id", draft.post_draft_id);
```

---

## Task 4 — Push to GitHub

```bash
cd C:\Users\parve\Invegent-content-engine
git add supabase/functions/ai-worker/index.ts supabase/functions/auto-approver/index.ts
git commit -m "feat: write compliance_flags (ai-worker v2.7.1) + auto_approval_scores (auto-approver v1.4.0) to m.post_draft (D088)"
git push origin main
```

---

## Task 5 — Deploy both functions

```bash
npx supabase functions deploy ai-worker --project-ref mbkmaxqhsohbtwsqolns
npx supabase functions deploy auto-approver --project-ref mbkmaxqhsohbtwsqolns
```

If CLI times out on either deploy, note it in the result file.
Git push is sufficient for the brief to be considered complete.

---

## Task 6 — Verify

After deploy, run a quick verification by checking a recently approved draft:

```sql
SELECT post_draft_id, approval_status, approved_by, approved_at,
  auto_approval_scores IS NOT NULL AS has_scores,
  compliance_flags IS NOT NULL AS has_flags
FROM m.post_draft
WHERE approval_status IN ('approved', 'needs_review', 'dead')
ORDER BY updated_at DESC
LIMIT 5;
```

Existing drafts will have NULL for both new columns — that's correct.
New drafts processed after deploy will have the columns populated.

---

## Task 7 — Write result file

Write `docs/briefs/brief_019_result.md` in Invegent-content-engine:
- Task 1: Column verification result
- Task 2: ai-worker changes applied (version + 2 changes)
- Task 3: auto-approver changes applied (version + 2 changes)
- Task 4: Commit SHA
- Task 5: Deploy status (ACTIVE or needs manual deploy)
- Task 6: Verification query result
- Notes

---

## Error handling

- If `compliance_flags` or `auto_approval_scores` columns don't exist:
  apply the ALTER TABLE migration from Task 1 first, then proceed.
- The changes to ai-worker are additive — they add a field to the
  existing update call. If the column doesn't exist in DB, the update
  will silently ignore the field (Supabase PostgREST behaviour for
  unknown columns). Always verify column existence first.
- Do not change any gate logic, scoring, or approval thresholds.
  These are audit trail additions only.
- The ai-worker `draft_format` / `draftMeta` object already records
  `compliance_rules_injected` count — leave that as-is.
  `compliance_flags` is a separate dedicated column.

---

## What this brief does NOT include

- Surfacing compliance_flags in the dashboard (future — show on draft detail)
- Human approval writing approved_by (that's a portal action, separate task)
- Adding NDIS Yarns Care for Welfare to CLIENT_CONFIGS in auto-approver
  (it falls to default config which is fine for now)
- Changing gate thresholds or blocklist contents
