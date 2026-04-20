# Incident — AI cost retry loop (ID003)

**Date range:** 15–19 April 2026
**Detected:** 19 April 2026 ~07:00 AEST (by PK, reviewing inbox receipts)
**Diagnosed:** 19 April 2026 ~10:30 AEST
**Contained:** Self-terminated overnight 19 Apr when OpenAI fallback hit rate limits + PK manually set Anthropic monthly spend cap to $150 USD (later $200)
**Status:** Contained. Root cause identified. Permanent fix pending (planned: week of 20 Apr).
**Severity:** High — financial (~$155 AUD over 4 days on tight personal budget); psychological impact on PK's confidence in ICE's operational integrity; the Apr 18 D155 fix and this incident together reshape the pre-sales criteria

---

## One-paragraph summary

Between 15 and 19 April, the `ai-worker` Edge Function had a retry loop bug that caused single-draft ai_jobs to make between 5 and 152 LLM calls each before completing. The root cause was that the DB write of `ai_job.status = 'succeeded'` was not completing within the Edge Function's execution timeout, leaving jobs appearing stuck in `running`. The `sweep-stale-running-every-10m` cron (jobid 9) then requeued each stuck job every ~10 minutes, and ai-worker re-attempted the full LLM call from scratch. Input payloads of ~10,000 tokens per call — bloated because `seed_payload` stores entire scraped pages rather than `body_excerpt` — made every call slow and expensive, which made the timeout more likely to fire, which triggered more retries. Net cost: ~$155 AUD of Anthropic API charges over four days, against a true operating baseline of roughly $5–15 AUD/month. The loop stopped autonomously when OpenAI fallback calls began returning HTTP 429 rate-limit errors, causing ICE to mark 13 jobs as `failed` rather than re-queueing them.

---

## What PK saw

- 17 Apr 02:00 AEST onwards: Anthropic billing receipts started arriving every ~4 hours to `pk@invegent.com` (auto-recharge firing at $10 USD each time).
- 19 Apr morning: PK reviewed inbox, counted receipts, flagged to investigate.
- Anthropic console confirmed ~$141 USD of token spend over the preceding 7 days against the `ICE Production` API key, concentrated 15–18 April.

Console chart pattern:

| Day | Cost (USD) |
|---|---|
| 11–14 Apr | near-zero (normal) |
| 15 Apr | ~$6 |
| 16 Apr | ~$19 |
| 17 Apr | ~$37 |
| 18 Apr | ~$53 (peak) |
| 19 Apr (partial) | ~$5 before self-termination |

---

## The three conditions that had to be simultaneously true

This incident required the coincidence of three independent conditions. Any one of them being absent would have prevented it. Every fix must address at least one.

### 1. Payload bloat

`seed_payload` in `m.post_seed` stored the full scraped page body including every navigation menu, sidebar, footer link, cookie banner, and "related articles" block. A single NDS (National Disability Services) "State in Focus" seed carried roughly 15–20 KB of mostly-useless boilerplate. The ai-worker's prompt constructor read from `seed_payload.digest_item.body_text` rather than the pre-extracted `body_excerpt`. Result: average input token count per LLM call was ~10,000 — 3 to 5× what it should be if clean extracted text were used.

A field named `body_excerpt` already existed on the same JSON object and contained approximately the right extracted-text subset. It was simply never consumed by ai-worker.

### 2. Edge Function timeout vs. DB write ordering

Supabase Edge Functions have a response timeout (historical default ~60 seconds; may be configurable higher). The ai-worker flow executes approximately:

1. Read `ai_job` row, lock it with `status='running'`, `locked_by=<worker_id>`
2. Load `seed_payload`, assemble prompt
3. Call Anthropic API (can take 15–45 seconds for 10K-input-token Sonnet request)
4. Parse response, write new `post_draft` row
5. Update `ai_job.status='succeeded'`, `output_payload=<details>`
6. Log to `m.ai_usage_log`

Because step 3 + step 4 + step 5 occasionally exceeded the function timeout — especially with bloated payloads — the function returned (or was killed) before step 5 completed. The `post_draft` row usually made it through (step 4), but the `ai_job.status` update (step 5) did not. The LLM call had been completed and billed by Anthropic; ICE just lost track of it.

This is **a data consistency bug disguised as a cost bug**. Anthropic charged fairly for work done. ICE re-asked for the same work because it couldn't confirm to itself that the work was done.

### 3. Aggressive sweep-and-requeue

The cron job `sweep-stale-running-every-10m` (jobid 9) runs every 10 minutes and executes:

```sql
UPDATE m.ai_job
SET status='queued', locked_at=null, locked_by=null, updated_at=now()
WHERE status='running'
  AND locked_at < now() - interval '20 minutes'
```

There is no retry-count check. No `retry_attempts < 3` guard. A job can be requeued indefinitely — and for 152 iterations, was.

### Why the positive feedback loop

Bigger payload → slower response → higher chance of timeout → stale-running requeue → re-attempt with same bloated payload → same slow response → repeat.

The loop terminated in only two ways: either a call happened to complete fast enough (DB lag, quicker Anthropic response) to finish all six steps inside the timeout window, OR the API returned a hard error (like OpenAI 429) that ai-worker classified as terminal and moved the job to `failed`.

---

## Timeline (AEST)

| When | What |
|---|---|
| ~11 Apr | Loop conditions first present in production (payload bloat was always there; unclear what changed on 15 Apr to trigger the timeout threshold). |
| 15 Apr 16:10 | First LLM calls in the 15–18 Apr window recorded. Costs begin rising. |
| 15 Apr → 18 Apr | Loop runs continuously. Hundreds of jobs each retried 5–20× each. Peak single-job observation: 152 calls for one ultimately-published draft. |
| 18 Apr evening | D155 (enqueue trigger `ON CONFLICT` fix) shipped. Unrelated to retry loop cause, but hit pipeline stability. |
| 18 Apr 20:45 | Cost spike fully visible in Anthropic receipts. PK does not notice yet. |
| 19 Apr ~07:00 | PK reviews inbox, flags the multiple-receipts-per-day pattern. |
| 19 Apr ~15:20 UTC (01:20 AEST, actually the prior evening in UTC terms) | OpenAI fallback begins hitting 429 rate-limit errors (OpenAI Tier 1 cap = 30,000 TPM, bloated payloads consumed budget in ~3 requests). |
| 19 Apr ~16:40 UTC (02:40 AEST) | Last LLM call completes. Retry loop self-terminates because failed OpenAI calls are marked terminal and not re-queued. |
| 19 Apr 10:30 AEST | Diagnosis complete. |
| 19 Apr evening | PK sets Anthropic monthly spend cap to $150 USD (effectively at the already-spent limit — freezing further API spend). |
| 20 Apr evening | PK raises cap to $200 USD to allow ~$44 USD of headroom for remainder of April billing cycle. ICE pipeline still silent (39+ hours of zero LLM calls). |

---

## Financial impact

| Source | Cost |
|---|---|
| Anthropic API (measured from `m.ai_usage_log`) | ~$105 USD |
| OpenAI API (fallback, same table) | ~$2 USD |
| **Total token cost** | **~$107 USD** |
| Plus GST on auto-recharges (Australia 10%) | ~$11 AUD |
| **Total AUD charged to PK's card** | **~$155 AUD** |

Against a post-fix baseline of ~$0.30–0.50 USD/day, this represents roughly **80× the expected spend rate** for the 4-day window.

---

## Why $155 hurt beyond $155

PK is pre-revenue, on a tight personal budget, running ICE alongside domestic obligations (Care for Welfare, family). $155 is not a rounding error at this stage. The incident also arrived immediately after Saturday's D155 discovery — which had already shaken confidence in ICE's monitoring. The combined psychological impact was a significant hit to operational trust in the system.

The response that followed (stopping the pipeline dead via the console cap rather than continuing to diagnose) was the correct instinct for a solo founder without enterprise-level safety nets. Capital preservation over uptime is the right call when the system has no revenue to protect.

---

## What worked

- `m.ai_usage_log` table existed and recorded token counts per call with `ai_job_id`, `post_draft_id`, `error_call`, `fallback_used`, and `cost_usd`. Diagnosis would have taken days longer without it.
- OpenAI fallback path executed correctly when Anthropic errors began.
- Hard-fail handling on OpenAI 429 terminated the loop rather than cascading indefinitely.
- `post_draft` was written successfully on the first LLM call most of the time; retries generated throwaway completions but did not corrupt persisted content.
- Manual Anthropic console cap was immediately effective — Anthropic blocks new requests once monthly limit is reached, no ICE-side enforcement required.

---

## What failed

- **No cost monitoring or anomaly detection inside ICE.** PK's personal inbox was the only alerting surface. Receipts arriving every 4 hours were the first visible signal.
- **No retry-count limit** on `sweep-stale-running-every-10m`. A job could be requeued indefinitely.
- **No Anthropic console monthly spend cap prior to incident.** Auto-recharge at $10 USD per trigger allowed the loop to continue as long as PK's card would pay.
- **No idempotency guard in ai-worker.** Nothing prevented a second full LLM call for a job that had already written a `post_draft` row in the last N minutes.
- **`seed_payload` stored unfiltered page scraping output.** `body_excerpt` existed on the same record but was not consumed.
- **Edge Function timeout configuration may not be tuned** for worst-case prompt size.
- **No surface in the dashboard** showed "cost per published post" or "LLM calls per ai_job" — the retry pattern was invisible until the Anthropic console was examined.
- **Saturday's pre-sales criteria document** (docs/15 v3) did not include cost controls or financial resilience as a pre-sales gate. It should. A service charging clients $800/month cannot have a single-bug failure mode that costs the operator $155/week in API fees.

---

## Fix plan

**Primary fix — three-part remediation:**

1. **Payload diet (ai-worker prompt construction).** Change the prompt builder to read `seed_payload.digest_item.body_excerpt` rather than `seed_payload.digest_item.body_text`. Expected impact: 3–5× reduction in input tokens per call.

2. **Idempotency guard (ai-worker).** Before calling the LLM, ai-worker checks `m.ai_usage_log` for any successful row in the last 5 minutes matching the same `ai_job_id`. If found, skip the LLM call and proceed directly to "write post_draft and mark succeeded" using the existing call's output.

3. **Retry cap (sweep-stale-running cron).** Add `attempts` column to `m.ai_job` if not present. Increment on each requeue. `sweep-stale-running` only requeues if `attempts < 3`. If `attempts >= 3` and `status='running'`, move to `status='failed'` with `dead_reason='exceeded_retry_limit'`.

**Supporting fix:**

4. **Edge Function timeout.** Verify current timeout on `ai-worker`. If default 60s, increase to 180s.

**Preventive infrastructure (separate briefs):**

- `docs/briefs/2026-04-20-cost-guardrails.md` — ICE-internal budget + monitoring
- `docs/briefs/2026-04-20-inbox-anomaly-monitor.md` — external billing inbox watcher

---

## Open questions

1. **Why 15 April specifically?** Payload bloat was structurally always present. Something — possibly a Supabase Edge Function runtime change, or the 16 Apr deployment of 18 new `content_type_prompt` rows for IG/LI/YT causing different execution paths — tipped the timeout probability over the threshold. Worth a `git log --since='2026-04-14' -- supabase/functions/ai-worker` review.

2. **Did the D155 ON CONFLICT trigger fix on 18 Apr have any effect on this pattern?** Initial investigation suggests the two issues are independent but the timing overlap is suspicious.

3. **Are any other Edge Functions vulnerable to the same pattern?** `auto-approver`, `compliance-reviewer`, `feed-intelligence`, `weekly-manager-report`, `client-weekly-summary`, `ai-diagnostic` all call the LLM from within Edge Functions with similar DB-update-after-API-call ordering. They have lower frequency and smaller payloads so the failure mode has not materialised, but structurally the risk is present. This becomes **A27** on the pre-sales criteria list.

---

## Claim vs. evidence

The following claims are **directly backed** by DB query evidence collected 19 Apr:

- ✅ 152-call max retry count (worst single job)
- ✅ 1 distinct post_draft per 152 calls (proof of retry, not legitimate generation)
- ✅ OpenAI 429 as termination event (literal error text captured in `m.ai_job.error`)
- ✅ No LLM calls for >8 hours at time of writing (`MAX(created_at) FROM m.ai_usage_log`)
- ✅ 13 jobs in `failed` status (count from `m.ai_job`)
- ✅ Average input tokens ~10K (from `AVG(input_tokens)` on Apr 17/18 slice)

The following claims are **inferred, not directly proven**:

- ⚠ Edge Function timeout is the specific trigger — consistent with evidence but not measured. Supabase function logs would confirm. Action: pull logs this week.
- ⚠ `sweep-stale-running` is the specific cron responsible — consistent with its 10-minute cadence matching observed retry spacing, but other mechanisms could contribute.
- ⚠ Payload diet fix alone would suffice — plausible but not proven. All three fixes recommended for defence-in-depth.

---

## Decisions triggered by this incident

- **D157** — Two-stop budget enforcement (ICE internal + Anthropic console). See `docs/06_decisions.md`.
- **A27** — LLM-caller Edge Function audit (all ~8 callers beyond ai-worker). Added to pre-sales criteria.
- **A28** — Cost-guardrails infrastructure live. Added to pre-sales criteria.
- **A29** — Inbox anomaly monitor live. Added to pre-sales criteria.

---

**Document owner:** PK
**Written:** 19 Apr 2026, refined 20 Apr 2026
**Next action:** Ship three-part remediation (brief: `docs/briefs/2026-04-20-cost-guardrails.md`).
