# Brief — TPM Saturation on Concurrent Platform Rewrite Jobs

**Parked:** 21 April 2026 evening
**Gate to pick up:** Pipeline resumes from the 349-draft drain (estimated mid-May 2026, ~3.4 weeks from 21 Apr at current drain rate) AND at least one fresh digest has fired end-to-end through the rewrite step so the pattern's recurrence can be observed on live data.
**Owner:** PK
**Tags:** ai-worker, rate-limiting, digest, rewrite, concurrency
**Related:** D163 (proximate scoping), D157 (cost guardrails neighbourhood), A22 (silent failure detection), A20 (pipeline liveness monitoring)

---

## The finding

On 18 April 2026 at ~07:20 UTC, a single digest burst on NDIS Yarns fired **13 concurrent `rewrite_v1` ai_jobs** against gpt-4o — 6 LinkedIn + 7 Instagram, all for the same client (`fb98a472`), all created within the same minute. OpenAI gpt-4o's 30,000 TPM (tokens-per-minute) ceiling saturated almost immediately. All 13 jobs returned `openai_http_429`. None succeeded. No retries queued (the failures pre-dated the D157 retry-cap infrastructure shipped 21 Apr). The 13 rows sat in `status='failed'` for three days until sprint item Q1 cleaned them up on 21 Apr evening.

The cleanup marked them terminal with `dead_reason='openai_tpm_rate_limit_2026-04-18'` via the migration from D163. History is sealed.

**What is not sealed is the underlying pattern.** When the pipeline resumes from its current 349-draft drain and fires a fresh digest burst, the same saturation will recur. No design in ai-worker, the seeder, or the scheduler spaces out platform rewrites for the same digest item. No per-provider TPM budget exists. No throttle layer exists.

This is a latent concurrency bug. It's dormant while the pipeline is dormant. First burst after resume = first re-hit.

---

## Root cause breakdown

**How a single digest item becomes multiple concurrent LLM calls:**

1. Bundler selects N canonical items into a digest run for a client
2. Per digest item, one `rewrite_v1` ai_job is created per active platform for the client
3. NDIS Yarns has 3 active platforms (Facebook, Instagram, LinkedIn) → 3 jobs per item
4. PP has 3 active platforms → also 3 per item
5. Digest burst of 5-10 items on one client = 15-30 concurrent `rewrite_v1` jobs
6. `ai-worker-every-5m` cron picks up all `queued` rows in a single invocation and processes them concurrently
7. Each `rewrite_v1` on gpt-4o consumes roughly 10-15k input tokens + 1-2k output per call
8. Three concurrent calls of that shape = ~40-50k tokens in the first minute
9. gpt-4o Tier 1 TPM ceiling: 30,000
10. Saturation happens before the third job completes. All subsequent calls that minute return 429.

**Why this was invisible until now:**

- Pipeline was stable at 1-2 clients × lower throughput — digest bursts stayed under the ceiling
- ID003 incident was the recent dominant failure mode, so the 18 Apr TPM failures were miscategorised as "more of ID003" when they're actually a distinct cause (ID003 was timeout/retry loop; this is provider-side rate limiting on concurrent calls)
- The 13 failed rows sat in `status='failed'` with no monitoring alert (A20 item exists to fix this class of blindness)

---

## Design options (not prescriptive — think before picking)

### Option 1 — Stagger at the worker

ai-worker processes `queued` rows but enforces a concurrency limit of N per provider per minute via an in-memory or pg_advisory lock. The simplest is N=1 per provider per invocation (strict serialisation), but that throttles throughput unnecessarily. A smarter version: token-bucket per provider per minute.

- **Pros:** Centralised at the worker, handles all future digest patterns, works regardless of seeder behaviour
- **Cons:** Requires knowing the ai-worker's current concurrency model (probably `Promise.all` over all queued rows — needs change to sequential or bounded-parallel); adds state (token bucket) that needs to persist across invocations (or re-compute from `m.ai_usage_log`)
- **Estimated work:** 2-4 hours including testing

### Option 2 — Stagger at the seeder

Seeder writes rewrite jobs with offset `scheduled_at` values such that the cron picks them up in batches over multiple minutes. Example: 30 seconds between each job in the burst.

- **Pros:** Simplest change, no worker modification, just a `created_at` offset in the seeder
- **Cons:** Depends on cron timing discipline (cron runs every 5 min; if 30s offset lands all jobs in the same 5-min slot, it doesn't help); doesn't handle legacy queued rows that pre-date the fix; fragile if digest sizes grow
- **Estimated work:** 30 min + testing

### Option 3 — Raise TPM limit via OpenAI Tier 2

OpenAI Tier 2 = 450k TPM on gpt-4o. Unlocks at $50 cumulative API spend + 7-day wait. Currently pending organically from other usage.

- **Pros:** No code change, just operational patience
- **Cons:** Band-aid not a fix — raises the ceiling but the saturation pattern recurs at higher volumes (imagine 10 clients × 3 platforms × 10-item bursts = 300 concurrent jobs); doesn't help if OpenAI degrades further
- **Estimated work:** zero code; waiting

### Option 4 — Route rewrites to Claude as primary

Per D006 (Claude primary, OpenAI fallback) — but ai-worker currently routes rewrites to gpt-4o. Switching primary to Claude uses Anthropic's rate-limit structure (different ceilings, different shape).

- **Pros:** Aligns with D006 architectural intent; Claude's ITPM on Sonnet is higher; gets synthesis benefits D006 cites
- **Cons:** Bigger change — touches model selection logic in ai-worker; re-tests model quality per client persona; cost profile shifts
- **Estimated work:** 4-8 hours including validation

### Option 5 — Provider-aware throttle layer

New `m.provider_token_budget` table tracks per-minute token consumption per provider. ai-worker (and any other LLM-calling EF) checks budget before each call. If over budget, delay or re-queue. Generalises to all callers, not just ai-worker.

- **Pros:** Closest to "correct" answer; handles all LLM-calling code paths uniformly; extensible to any provider; produces observability data
- **Cons:** Highest build cost; introduces new shared state that needs careful concurrency handling (pg_advisory locks); overkill for current scale
- **Estimated work:** 1-2 days

---

## Recommendation posture (non-binding)

At current volume: **Option 2 is the minimum change** (seeder stagger) that reduces likelihood. It's cheap and ships same-session.

At pilot-client volume (+1 external client = probably breaks again at their first big burst): **Option 1 is the principled fix** (worker-side concurrency bound) — solves it centrally.

At 5+ client volume: **Option 5 is the right shape** — provider-aware throttle is the infrastructure every LLM-calling EF should benefit from.

Don't over-engineer ahead of evidence. Ship Option 2 when pipeline resumes, verify pattern recurrence, then decide.

---

## What to do at pick-up

1. **Verify pattern recurs.** Watch `m.ai_usage_log` for `http_status = 429` errors after pipeline resumes and a digest burst fires. If pattern doesn't recur at current volumes (possible but unlikely), downgrade brief to Watch List only.
2. **If it recurs at 1-2 clients:** implement Option 2 (seeder stagger) in one commit. Ship. Observe.
3. **If Option 2 is insufficient at first pilot client:** implement Option 1 (worker concurrency bound). Ship.
4. **Promote to A-item if production blocker.** At pilot-client stage, any silent LLM failure is a pilot-killer — don't carry this as a brief indefinitely. Gate the promotion on "first external client signed."
5. **Update `m.ai_usage_log` queries in A20 scope.** When A20 (pipeline liveness monitoring) lands, TPM saturation events should be a specific alert class — not just "ai_jobs failing" but "repeated 429 from same provider within X minutes."

---

## Why this isn't just a cleanup finding

Phase 1.7 DLQ foundation work in D163 marked the 13 historical failures terminal. That does NOT fix the source. The source is a concurrency design that treats each platform's `rewrite_v1` as an independent job regardless of provider capacity. The DLQ catches the symptom after failure; this design fix prevents the failure in the first place.

The external reviewer layer (paused per D162) would likely have flagged this pattern on any digest-burst-related commit. It didn't, because commits since 18 Apr haven't touched the relevant code paths. Worth re-inviting this into a targeted review once reviewers resume.

---

## What this brief does NOT do

- Does not propose changes to any specific Edge Function today
- Does not quantify cost impact (spend loss from 13 failed jobs on 18 Apr was small; future cost impact depends entirely on frequency of bursts at higher volumes)
- Does not address the broader question of provider-mix strategy (that's D006 and D144 territory)
- Does not claim any one option is correct — picks are evidence-dependent

---

*End of brief. Pick up when gate fires. Decision at pick-up goes into `docs/06_decisions.md` as a new D-number.*
