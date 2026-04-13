# Brief 038 Result — Format Advisor Preferred Format Bias + PP Video Re-queue

**Executed:** 14 April 2026
**Commit:** d1fd145

---

## Task Results

| Task | Status |
|------|--------|
| 1. Re-queue 3 PP video drafts | COMPLETED — 3 queue items created |
| 2. Update ai-worker format advisor (v2.8.0) | COMPLETED |
| 3. Deploy ai-worker | COMPLETED — ACTIVE |
| 4. Verify | COMPLETED — baseline established, next run will use v2.8.0 |
| 5. Write result file | COMPLETED |

---

## Task 1 — PP Video Re-queue

3 drafts re-queued via `draft_approve_and_enqueue()`:

| Draft | Format | Scheduled (AEST) |
|-------|--------|-------------------|
| Australia keeps talking while the rest of the world builds | video_short_kinetic | Mon 14 Apr 12:00 |
| The market is splitting — and the data tells the real story | video_short_kinetic | Tue 15 Apr 07:30 |
| The Market Is Splitting. The Data Shows It Clearly. | video_short_stat | Wed 16 Apr 12:00 |

All 3 status=queued with proper PP schedule slots.

## Task 2 — ai-worker v2.8.0 Changes

### fetchFormatContext
- Now also returns `preferredFormat: string | null`
- Queries `preferred_format_facebook` from `c.client_publish_profile`

### callFormatAdvisor
- Accepts optional `preferredFormat` parameter
- When set, appends CLIENT FORMAT PREFERENCE instruction to system prompt
- Biases toward preferred format for borderline content

### image_quote threshold softened
- Before: "requires one genuinely striking stat or insight that stands alone"
- After: "requires one interesting stat, insight, or key message that works as a visual headline — it doesn't need to be a hard number, a clear declarative statement about a sector development works"

### Verified client settings
- NDIS Yarns: preferred_format_facebook = 'image_quote'
- Property Pulse: preferred_format_facebook = 'image_quote'
- 4 pending NDIS Yarns bundle drafts will be the first to use v2.8.0

---

## Notes
- The format bias is non-breaking: if preferred_format is null, no bias is added
- NDIS policy content may still legitimately get 'text' format — the bias only affects borderline decisions
- PP content already generates images naturally (market data, stats) — minimal effect expected there
