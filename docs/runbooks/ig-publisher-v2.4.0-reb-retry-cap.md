# Note — instagram-publisher v2.4.0 (RE-B): bounded outer per-row retry cap

**Date staged:** 2026-05-24 · **Status:** STAGED — D-01 before deploy; not deployed.
**Scope:** `supabase/functions/instagram-publisher/index.ts` only.
**Lineage:** v2.3.0 (image publish-retry, deployed, fn version 35) → **v2.4.0 (this, RE-B)**.
**Carry closed:** RE-B from `docs/briefs/ig-publisher-v2.3.0-image-publish-retry.md` §7.

---

## 1. Problem (RE-B)

The publisher's **outer per-row catch** requeued every failed row `+10 min` with
`status='queued'` but **never incremented `attempt_count`** and had **no max-retry
cap**. A persistently-failing row therefore retried indefinitely — a `dead` row was
observed historically at `attempt_count = 734`. Before any unattended / semi-unattended
cron-53 drain, a genuinely-broken row must stop retrying and become terminal.

## 2. Fix

In the per-row failure path:

- **Increment `attempt_count`** on every failure: `newAttempt = (q.attempt_count ?? 0) + 1`, persisted on the queue row.
- **Cap (`MAX_PUBLISH_ATTEMPTS = 5`):** once a **non-rate-limited** row reaches the cap,
  set `status='dead'` (terminal), `dead_reason='re_b_max_attempts:<n>/<max>'`, `last_error=<errMsg>`,
  `scheduled_for=null`, locks cleared — instead of requeuing.
- **Under the cap:** the existing `+10 min` requeue is preserved (`status='queued'`,
  `scheduled_for=+10m`, `attempt_count=newAttempt`, `last_error`).

### Chosen threshold: 5 — rationale
Transient container-readiness (`9007/2207027`) is already absorbed **in-attempt** by the
v2.3.0 `publishWithReadinessRetry` (1 + 3 tries). So by the time the **outer** catch fires,
the error is usually non-transient (auth, exhausted-container, malformed). A tight outer
cap of 5 tolerates a few cross-invocation Graph/network blips while bounding a broken row
to ~40 min (5 × +10 min) before it goes `dead`. The constant is easily tunable.

## 3. Design decision — rate-limit is EXEMPT from the dead cap

`2207051` / `code 4` failures still **auto-pause** the profile 6 h (unchanged) and
**increment `attempt_count`**, but are **never** dead-capped: `exhausted = !rateLimited && newAttempt >= MAX_PUBLISH_ATTEMPTS`.
Rationale: a rate limit is an **account/app-level restriction, not a per-row defect**; the
6 h pause is its containment (the lock RPC won't re-lock until the pause clears). Counting
it toward the cap could `dead` perfectly publishable content merely because the account
was restricted during its attempts. **If PK/CCH prefers rate-limit to count toward the
cap, it is a one-line change** (drop `!rateLimited` from `exhausted`).

## 4. Preserved (byte-unchanged)

- `2207051` / code 4 auto-pause (fires before the requeue/dead decision).
- The failure **audit row** insert into `m.post_publish` (`status='failed'`).
- The v2.3.0 **in-attempt** `9007/2207027` retry (`publishWithReadinessRetry`).
- The **`destination_id` gate** and the **defensive throttle** (`max_per_day` / `min_gap`).
- `m.publisher_lock_queue_v1/v2` — **not touched** (no SQL/RPC change).

## 5. Safe logs (no token values)

- `failed <queue_id> attempt=<n>/<max>: <errMsg>`
- requeue: `requeue <queue_id> attempt=<n>/<max> rate_limited=<bool> next=<iso>`
- dead: `DEAD <queue_id> attempt=<n>/<max> dead_reason=<reason>`
- Results array now carries `attempt_count` + `dead` per row.

## 6. Validation

- `deno check` — clean.
- Diff vs v2.3.0 (`ccec0cd`): `instagram-publisher/index.ts` only (+73/−14) — header note,
  `VERSION → v2.4.0`, `MAX_PUBLISH_ATTEMPTS`, catch rewrite. No migration/SQL/config/cron
  change; no `publisher_lock_queue` change.

## 7. Drain monitoring (when v2.4.0 is eventually deployed + drained)

- Watch `m.post_publish_queue` for IG rows transitioning to `dead` with
  `dead_reason LIKE 're_b_max_attempts:%'` — these are rows that exhausted the cap (inspect
  their `last_error` before any requeue).
- Confirm no row's `attempt_count` climbs without bound (it now caps at 5 for non-rate-limit).
- Rate-limited rows: expect `attempt_count` to rise slowly (once per 6 h pause) and the
  profile `paused_until` to be set — these are intentionally not dead-capped.

## 8. Hard stops (this staging)

Staged only — **not deployed**, no Supabase mutation, no publisher invoke, cron 53/64 stay
paused, no `publish_enabled` flip, no queue/dead-row touch, no `friction.case`/`event`,
Q-005 not closed, cc-0015 not started. D-01 (`ef_deploy`) review precedes any deploy.
