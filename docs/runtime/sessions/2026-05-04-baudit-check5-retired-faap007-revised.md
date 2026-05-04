# 2026-05-04 morning Sydney — phone session: B-AUDIT-CHECK5-DRIFT retired, F-AAP-007 revised, F-PUB-009 authored, F-AI-WORKER-PARSER-SKIP-BUG diagnosed

**Phase**: phone-flow knock-out of carry-forward briefs from v2.32, then deep pipeline-health investigation requested by PK.
**Honours**: D-01, D-170, D-186, Lesson #51, T-MCP-11, T-MCP-12.
**Closure budget**: +1.5h this phase. Trailing-14d ~18.5h. Above floor.

---

## Trigger

Carry-forward of P2 (F-AAP-007) and P3 (B-AUDIT-CHECK5-DRIFT) briefs from v2.32 action list. PK directive: "knock these on phone". After knocking those, PK directed: "do a very deep investigation [of] all the platforms for all the channels [...] going according to the schedule".

## Pre-flight findings (read-only Supabase MCP queries)

**Brief-vs-deployed-reality drift caught for Check 5.** Both "checks" referenced in the briefs are not standalone functions — they are computed columns inside the `audit.*` views deployed last night.

| # | Metric | Result |
|---|---|---|
| Q1 | `m.post_publish_queue` rows where `locked_at < now()-30min AND status IN (queued,running)` | 0 |
| Q2 | Same at 2h threshold (brief's proposed weaker bound) | 0 |
| Q3 | Any `locked_at IS NOT NULL` rows, any status, any age | 0 |
| Q4 | `m.post_publish_queue` status vocab in production | queued=507, published=94, dead=47 (no `locked`, no `running`) |
| Q6 | Check 8 deployed fail cnt (approved drafts without queue, 14d) | 65 (was 56 yesterday — F-AAP-001 drain continuing) |
| Q7 | Same with backpressure filter (cap-blocked excluded) | 0 |
| Q8 | Clients with NULL `max_queued_per_platform` | 0 |
| Q9 | Clients with `max_queued_per_platform = 0` | 0 |

## Decision 1 — B-AUDIT-CHECK5-DRIFT RETIRED

Brief premise is invalid against deployed reality.

- Brief assumed Check 5 queries `status = 'locked'`. Deployed `audit.v_publish_queue_summary.possibly_stuck_locked_items` already uses the correct `locked_at IS NOT NULL` semantics with a tighter 30min threshold (vs brief's proposed 2h).
- Brief's status vocab list (`queued, published, dead, throttled, held, skipped`) does not match production (`queued, published, dead` only). `'locked'` was never a status value.
- Q1–Q3 confirm zero rows currently locked under any reasonable definition. The check is functioning correctly and surfacing nothing because nothing is wrong.
- Applying the proposed migration would weaken the deployed threshold from 30min to 2h — a regression.

**Action:** Retire brief. No migration applied. No D-01 fire (corrective brief retirement following ground-truth verification does not qualify as production patch — same precedent as F-HISTORIC-DEAD-CLEANUP retirement v2.32).

**Pattern parallel:** Mirrors last night's F-HISTORIC-DEAD-CLEANUP retirement. Lessons #51 + T-MCP-11 + T-MCP-12 vindicated.

## Decision 2 — F-AAP-007 brief revised (Option B, label-level fix)

Brief's premise validated by Q6+Q7: all 65 surfaced "missing queue" rows are cap-blocked false positives, zero are genuine gaps.

But brief's fix shape is wrong. The check is a CTE column inside `audit.v_brand_platform_audit_matrix`, not a standalone function. The matrix's CASE statement already labels these rows as `'approved_not_queued_cap_blocked'` without verifying the cap is breached — the conflation is in the label, not the count.

**Option B chosen (label-level accuracy)** over Option A (column filter):
- Keep the count factual ("approved but not in queue, whatever the reason").
- Fix the CASE statement to actually verify the cap before applying the cap-blocked label. Add a sibling label `approved_not_queued_genuine_gap` for rows where headroom exists.

Brief revised at `docs/briefs/2026-05-04-or-later-faap007-fix.md` (replaces 2026-05-03 evening version).

**Apply path:** held for next session at home (full view rewrite + D-01 review + verification benefits from keyboard).

## Decision 3 — F-PUB-009 brief authored

Pipeline investigation 3 May night promoted F-PUB-009 from P3 to P1 because the legacy `get_next_scheduled_for` function overrides slot intent at queue-row creation time. Brief committed at `docs/briefs/2026-05-04-or-later-fpub009-fix.md`. Forward-only fix: at slot fill time, write `slot.scheduled_publish_at` into `post_draft.scheduled_for`. Two pre-flight-determined fix patterns (function-internal patch or trigger). Apply path held for home session.

## Decision 4 — Deep pipeline investigation findings

PK requested deep end-to-end check on all 14 (client, platform) streams against the 70-posts/week target (5/week × 14 streams).

**14-stream snapshot:**

| Stream | Target/wk | Actual 7d | Status |
|---|---|---|---|
| CFW FB | 5 | 6 (clustered Mon-Wed) | 🔴 silent 82h |
| CFW LI | 5 | 5 (clustered) | 🔴 silent 94h |
| CFW IG | 5 | 0 | ❌ paused (T07) |
| Invegent FB | 5 | 6 | ✅ |
| Invegent LI | 5 | 6 | ✅ |
| Invegent IG | 5 | 0 | ❌ paused (T07) |
| NDIS-Yarns FB | 5 | 14 | ⚠️ 2.8× target — chewing backlog |
| NDIS-Yarns LI | 5 | 5 | ✅ marginal |
| NDIS-Yarns IG | 5 | 0 | ❌ paused (T07) |
| NDIS-Yarns YT | 5 | 0 | ❌ T06/T11 |
| PP FB | 5 | 14 | ⚠️ 2.8× target |
| PP LI | 5 | 19 | ⚠️ 3.8× target |
| PP IG | 5 | 0 | ❌ paused (T07) |
| PP YT | 5 | 0 | ❌ T06/T11 |

**Drill 1: publish_queue_overdue rows on CFW IG, Invegent IG.** All `attempt_count = 0/null`, no last_error, no locked_at. Publisher cron has never attempted them — confirms paused IG cron jobid 53 (T07 known gate) suppressing all IG streams.

**Drill 2: failed slots picture.** CFW Facebook 1 + CFW LinkedIn **6** (was 4 yesterday — recovery loop pathology actively progressing). All `exceeded_recovery_attempts` with `has_draft=true`. Plus PP IG 1 (T07-gated), PP YT 1 (T06-gated).

**Drill 3: token health.** `m.platform_token_health` table is empty for all clients. Token monitoring is itself broken. Logged as B-TOKEN-HEALTH-EMPTY (P3).

**Drill 4: schedule expectations.** All 14 streams configured 5/week M-F, one specific time per platform per client. Baseline confirmed.

**Drill 5: content supply funnel.** Surfaced two new findings:

- **F-AAP-DRAFTS-STUCK (initially P2):** 10 drafts stuck in `'draft'` status, oldest 11 days. CFW LI 6, CFW FB 1, Invegent IG 1, PP IG 1, PP YT 1.
- **F-AAP-NEEDS-REVIEW-BACKLOG (P2):** 28 drafts in `needs_review` piling up. CFW IG 15 (oldest 11 days), Invegent IG 10, CFW FB 2, CFW LI 1.

**Drill 6: auto-approver fetcher.** Found `m.auto_approver_fetch_drafts` filters on `WHERE pd.approval_status = 'needs_review'`. Drafts in `'draft'` status are invisible to auto-approver. Something else must transition `draft → needs_review`.

**Drill 7: stuck shadow drafts forensic.** ALL 10 stuck drafts share: `is_shadow=true`, `created_by='fill_function'`, `body_len=0`, no title/image. Decoded `m.fill_pending_slots` function — confirmed `p_shadow boolean DEFAULT true`. Cron jobid 75 explicitly passes `p_shadow := true` every 10min. The fill function creates skeleton post_draft + queued ai_job; ai-worker is supposed to hydrate via OpenAI/Claude synthesis.

**Drill 8: ai_job state for stuck drafts.** SMOKING GUN. Every stuck draft has a `failed` ai_job with one of three errors:
- `openai_missing_title_or_body` × 7 (CFW LI 6, CFW FB 1)
- `slot_fill_no_body_content: ... empty extracted_text/extracted_excerpt` × 2 (PP YT, PP IG)
- `auto-dead: stuck 7+ days` × 1 (Invegent IG older `rewrite_v1` artifact)

**Drill 9: format breakdown.** CFW LI image_quote success rate **3/9 = 33%**. Every other stream on image_quote: 89-100%. **Bug is specifically at CFW × LinkedIn × image_quote.**

**Drill 10: ai-worker source code (read via Supabase MCP `get_edge_function`).** Found the bug:

```typescript
// callClaude (and identical pattern in callOpenAI):
const parsed = safeParseJson<any>(cleaned);
if (!parsed.ok) throw new Error(`anthropic_non_json: ...`);
if (!parsed.value?.title || !parsed.value?.body) throw new Error('anthropic_missing_title_or_body');  // ← BUG: throws before skip check
const usage = outer.value?.usage ?? {};
return {
  title: String(parsed.value.title).trim(),
  body: String(parsed.value.body).trim(),
  ...
  skip: parsed.value.skip === true,  // ← never reached when skip=true
  ...
};
```

The system prompt + `buildFormatOutputSchema()` explicitly instruct the model to return one of two valid shapes: normal `{title, body, image_headline, meta}` OR compliance skip `{skip: true, reason: ...}`. The main loop has a fully-built skip handler (`if (result.skip)` marks draft `dead`, slot `skipped`, ai_job `succeeded`). But the parser checks title/body BEFORE checking skip and throws `anthropic_missing_title_or_body` when the model correctly returns a skip response.

**Cascade effects of this single bug:**
- F-AAP-DRAFTS-STUCK: drafts never transition to `needs_review` because worker fails before writing → stay in `draft`
- F-RECOVER-LOOP-001: recovery cron sees slots stuck at `fill_in_progress`, resets → next fill cycle hits same parser bug → after 3 attempts, slot marked failed
- CFW LI 94h silence: every fill is a legitimate compliance skip being misread as failure
- Cost waste: every "skip" pays for Claude call AND OpenAI fallback call, both billed, neither used

**Fix is ~6 lines per provider** (callClaude + callOpenAI). Brief authored at `docs/briefs/2026-05-04-or-later-fai-worker-parser-skip-bug.md`.

## Decision 5 — F-RECOVER-LOOP-001 demoted

Once F-AI-WORKER-PARSER-SKIP-BUG ships, the recovery loop won't trigger because slots will go `pending_fill → skipped` instead of `pending_fill → fill_in_progress → recovered → ... → exceeded_recovery_attempts`. The `m.recover_stuck_slots` patch (refuse refilling with already-published drafts) is still good defence-in-depth, but the urgency is gone. Demote P1 → P3.

## Decision 6 — F-AAP-DRAFTS-STUCK subsumed

Subsumed by F-AI-WORKER-PARSER-SKIP-BUG. Closed-by-pointer in action_list.

## New findings logged

| Finding | Priority | Status |
|---|---|---|
| **F-AI-WORKER-PARSER-SKIP-BUG** | **P1** | Brief committed; deploy at home |
| F-AAP-NEEDS-REVIEW-BACKLOG | P2 | Backlog (separate problem on different streams) |
| B-AI-WORKER-NO-FAILURE-PAYLOAD-LOGGING | P3 | Bundled into F-AI-WORKER-PARSER-SKIP-BUG deploy |
| B-TOKEN-HEALTH-EMPTY | P3 | Backlog |
| F-CFW-LI-DUP-SLOTS | P3 | Backlog (2 CFW LI slots both for 5-4 03:04) |

## Lesson reinforcements

- **T-MCP-11** (pre-flight discipline includes verifying log/health tables actually contain data): vindicated again. Discovered the briefs' premises only by querying the deployed view bodies directly — would have shipped a regression migration otherwise.
- **T-MCP-12** (query every annotation column when verifying table contents): vindicated. The status vocab query (Q4) caught `'locked'` is never set; the locked_at queries (Q1–Q3) caught zero rows under correct semantics.
- **NEW lesson candidate**: when investigating cascading symptoms, drill into the source code of the worker producing the symptom — DB-only inspection missed this for 7+ days, EF source-read found it in one query. Promote to canonical after one more vindication.

After today's reinforcement count: T-MCP-11 = 2 vindications, T-MCP-12 = 2 vindications. Both ready for canonical promotion after one more instance per the brief's promotion rule.

## Closure-effectiveness note

This phase's leverage was disproportionate. ~1.5h chat-side investigation collapsed 3 of the open P1 findings (F-AAP-DRAFTS-STUCK, F-RECOVER-LOOP-001, CFW silence) into one root cause with a ~6-line fix. The investigation paid for itself by avoiding 2-3 separate fix briefs that would have all been chasing symptoms.

## Open at end-of-phase

- F-AAP-007 v2 brief committed; apply path held for home session.
- F-PUB-009 brief committed; apply path held for home session.
- F-AI-WORKER-PARSER-SKIP-BUG brief committed; deploy path held for home session.
- B-AI-WORKER-NO-FAILURE-PAYLOAD-LOGGING bundled into F-AI-WORKER-PARSER-SKIP-BUG deploy.
- F-AAP-NEEDS-REVIEW-BACKLOG, B-TOKEN-HEALTH-EMPTY, F-CFW-LI-DUP-SLOTS logged for future briefs.
