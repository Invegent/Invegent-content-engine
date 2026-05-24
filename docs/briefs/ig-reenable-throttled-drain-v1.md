# Brief — Instagram re-enable via throttled, staged drain (v1)

**Date:** 2026-05-24
**Pool:** `instagram.publisher.v2_deployed_cron_paused`
**Mode of this brief:** read-only plan (CCH read-only analysis; load-bearing facts re-verified read-only this session). **No production change is proposed *in this brief* — it defines the staging + approval sequence.**
**Supabase project:** `mbkmaxqhsohbtwsqolns` (content_engine)

> **Critical finding:** the IG `max_per_day` / `min_gap_minutes` throttle is **not reliably enforced at runtime**, so a **CCD code patch must be staged and deployed before** any cron/profile re-enable. Details in §2–§3.

---

## 1. Current blocker summary (verified 2026-05-24, read-only)

Instagram is intentionally contained on three independent layers:

| Layer | State |
|---|---|
| `cron.job` 53 `instagram-publisher-every-15m` | **active = false** |
| `cron.job` 64 `seed-and-enqueue-instagram-every-10m` | **active = false** |
| IG `client_publish_profile.publish_enabled` | invegent **true**, care-for-welfare **true**, **ndis-yarns false**, **property-pulse false** |

- Deployed publisher: `instagram-publisher` **v2.0.0** (edge fn v32, 2026-04-25) — queue-based, three-layer platform discipline; locks via `m.publisher_lock_queue_v1 → v2`.
- IG profiles (all 4): `max_per_day = 2`, `min_gap_minutes = 240`, `destination_id` set.
- IG `post_publish_queue`: **123 `queued`**, **174 `dead`** (the dead set includes the 110 `m8_*` rows — do not touch, see §10).
- Net: nothing publishes to IG (cron paused). Re-enabling means draining a 123-row backlog — which is exactly when an unenforced throttle becomes dangerous (§7).

## 2. Evidence that `max_per_day` / `min_gap_minutes` were ignored

The throttle lives in `m.publisher_lock_queue_v2` (which `v1` wraps and the IG publisher calls). It enforces the caps via a lateral subquery that counts published posts **keyed on `destination_id`**:

```sql
left join lateral (
  select max(p.created_at) filter (where p.status='published') as last_published_at,
         count(*) filter (where p.status='published'
                           and p.created_at >= date_trunc('day', v_now)) as published_today
  from m.post_publish p
  where p.destination_id = cpp.destination_id        -- ← the throttle's join key
    and p.created_at >= v_now - interval '7 days'
) stats on true
...
and (cpp.min_gap_minutes is null or stats.last_published_at is null
     or stats.last_published_at <= v_now - make_interval(mins => cpp.min_gap_minutes))
and (cpp.max_per_day is null or stats.published_today < cpp.max_per_day)
```

**Runtime evidence (read-only query of `m.post_publish`, instagram/published):**

| client | date | publishes | min gap (min) | rows with `destination_id` NULL |
|---|---|---|---|---|
| ndis-yarns (`fb98a472`) | 2026-04-19 | **18** | **0** | **18 / 18** |
| invegent (`93494a09`) | 2026-04-25 | **4** | **0** | **4 / 4** |

Two independent throttle violations: 18 posts/day and 4 posts/day (cap = 2), with **0-minute gaps** (min_gap = 240). **Every violating row has `destination_id = NULL`.** This matters two ways:
1. Those bursts were produced by the **v1.0.0** publisher (pre-2026-04-25-08:00 deploy), which bypassed the queue/lock entirely → no throttle at all.
2. **More importantly for re-enable:** because the throttle counts `WHERE p.destination_id = cpp.destination_id`, any published row with a NULL or mismatched `destination_id` is **invisible to `published_today`/`last_published_at`** → the count stays 0 → `0 < max_per_day` is always true → **the cap silently no-ops.** The historical rows demonstrate exactly this failure mode.

**What is NOT proven:** that v2.0.0 *fails* to throttle. v2.0.0's success path *does* write `destination_id` (`= igUserId`), and the IG profiles have `destination_id` set, so in principle v2.0.0 publishes would be counted. **But v2.0.0 has never published successfully at runtime** — its only post-deploy activity was 2 *failed* attempts on 2026-05-01 (Graph errors) before the cron pause. So the throttle's correctness for IG is **unverified in production**, and it remains structurally fragile (one NULL/mismatched `destination_id` write silently disables the cap). That fragility, on a 123-row backlog drain, is the blocker.

## 3. Required CCD patch before re-enable (staged, D-01-reviewed, then deployed)

Make IG throttle enforcement **robust and runtime-verifiable** — do not rely solely on the `destination_id`-keyed count silently working:

1. **Defensive IG-side throttle in `instagram-publisher`**: before publishing a locked row, independently check `max_per_day` + `min_gap_minutes` for the client/platform using a count that does **not** silently no-op on NULL `destination_id` (count by `client_id + platform + status='published'`, or `COALESCE(destination_id, page_id)` consistently on both write and count). If over cap / inside the gap, re-queue with a clear `last_error` instead of publishing.
2. **Guarantee `destination_id` is always written** on every IG `post_publish` row (success *and* the throttle-relevant paths), matching `cpp.destination_id`, so the lock-RPC count is reliable.
3. **(Optional, recommended for the first drain)** a temporary, explicit **drain-rate cap** (e.g., honour a per-run/`per-day` ceiling tighter than 2) so the staged drain is observable before trusting steady-state throttle.

Staging only — patch lands on a branch, D-01 review, **then** deploy under explicit PK approval. This brief does **not** implement the patch.

## 4. Proposed execution sequence (each step gated by PK)

1. **Stage** the §3 patch (CCD, branch + D-01 review). No deploy.
2. **Deploy** the patched `instagram-publisher` (PK approval; verify version via `/health`).
3. **Pre-drain dry-run verification** (§6) — confirm the throttle counts correctly and the backlog/eligibility is as expected. Optionally `POST {dry_run:true}` (locks, validates, publishes nothing).
4. **Controlled single publish:** with cron still paused, invoke once (limit 1) for **one enabled client** (invegent or care-for-welfare). Confirm exactly one publish, `destination_id` written, no `2207051`, throttle count increments.
5. **Re-enable cron 53 only**, keeping ndis-yarns + property-pulse `publish_enabled = false` and **cron 64 still paused**. Drain only invegent + care-for-welfare under throttle; observe several ticks.
6. **Then** decide on ndis-yarns / property-pulse `publish_enabled` re-enable and cron 64, staged.

## 5. Exact mutations requiring PK approval (none performed in this brief)

- **Deploy** patched `instagram-publisher` edge function.
- `SELECT cron.alter_job(53, active := true);` (publisher) — and later `cron.alter_job(64, active := true);` (enqueuer).
- `UPDATE c.client_publish_profile SET publish_enabled = true WHERE platform='instagram' AND client_id IN (ndis-yarns, property-pulse);` — **deferred to a later stage**, not the first drain.
- (Optional) temporary throttle/drain-cap tightening for the controlled drain, reverted after.

## 6. Dry-run verification queries (read-only)

```sql
-- a) Throttle count sanity: what published_today / last_published_at does the lock RPC see per IG client?
SELECT cpp.client_id, cpp.destination_id, cpp.max_per_day, cpp.min_gap_minutes,
       (SELECT count(*) FROM m.post_publish p
         WHERE p.destination_id = cpp.destination_id AND p.status='published'
           AND p.created_at >= date_trunc('day', now())) AS published_today_by_dest,
       (SELECT count(*) FROM m.post_publish p
         WHERE p.client_id = cpp.client_id AND p.platform='instagram' AND p.status='published'
           AND p.created_at >= date_trunc('day', now())) AS published_today_by_client
FROM c.client_publish_profile cpp WHERE cpp.platform='instagram';
-- If by_dest and by_client diverge, the destination_id-keyed throttle is unreliable.

-- b) destination_id population on recent IG publishes (must be non-null + match the profile)
SELECT date_trunc('day', created_at) AS d, count(*),
       count(*) FILTER (WHERE destination_id IS NULL) AS null_dest
FROM m.post_publish WHERE platform='instagram' AND status='published'
GROUP BY 1 ORDER BY d DESC LIMIT 14;

-- c) Eligible backlog by client (what a re-enable would attempt)
SELECT client_id, status, count(*) FROM m.post_publish_queue
WHERE platform='instagram' GROUP BY client_id, status ORDER BY client_id, status;

-- d) Post-deploy dry-run (no publish): POST instagram-publisher {"limit":1,"dry_run":true} (PK-run)
```

## 7. `2207051` recurrence risk controls

`2207051` is an Instagram content-publishing restriction/throttle error (IG flags rapid automated posting as spam-like). A fast drain of 123 backlog posts is the trigger condition. Controls:
- **Enforce `max_per_day` + `min_gap_minutes` (the §3 patch)** — the primary control; keep IG to ≤2/day/client with ≥240-min gaps.
- **Controlled staged drain** (§4 steps 4–5): one publish → observe → small batch → observe, before trusting steady-state.
- **Keep ndis-yarns + property-pulse disabled initially** (only invegent + care-for-welfare drain first).
- **Abort-on-error:** if any IG publish returns `2207051` (or code 4 / app-request-limit), re-pause cron 53 and stop (do not retry-loop).

## 8. Rollback plan

- Re-pause publisher: `SELECT cron.alter_job(53, active := false);` (and `64` if enabled).
- Re-disable any flipped profile: `UPDATE c.client_publish_profile SET publish_enabled=false WHERE ...`.
- Redeploy the prior `instagram-publisher` version if the patch misbehaves.
- No DB rollback needed for harmless queued rows; **never** requeue dead rows (§10).
- Trigger rollback on: `2207051`/rate-limit errors, throttle observed exceeding `max_per_day`/`min_gap`, duplicate/cross-platform publishes, or any broader breakage.

## 9. Monitoring checks (during/after drain)

- `m.post_publish` (instagram, last N min): `published` vs `failed`, and **error codes** — watch for `2207051` and code 4 (app request limit).
- **Per-day publish count per client ≤ `max_per_day`**, and consecutive gaps **≥ `min_gap_minutes`** (the §2 evidence query, inverted — expect zero violations).
- `destination_id` non-null on every new IG publish (matches the profile).
- Queue drain rate: `queued` trending down, no new `dead`.
- `cron.job_run_details` jobid 53: `succeeded`, sane durations.
- Assert every publish row has `pd.platform = pp.platform = 'instagram'` (no regression of the M12 cross-post class).

## 10. Hard stops / non-actions

- Do **not** enable cron 53 or 64.
- Do **not** flip `publish_enabled` for any IG client.
- Do **not** drain the queue or invoke any publisher/enqueue function.
- Do **not** touch / requeue the dead rows (incl. the 110 `m8_*`).
- Do **not** deploy; do **not** mutate Supabase.
- Do **not** write `friction.case` / `friction.event`; do **not** close Q-005; do **not** start cc-0015.
- This brief is read-only planning; the §3 patch must be staged + D-01-reviewed + PK-approved before any of the §5 mutations.

## 11. D-01 resolution (RE1–RE4) — patch staged 2026-05-24

The §3 patch is now **staged** (source only, **not deployed**) as `instagram-publisher` **v2.1.0** on branch `fix/ig-publisher-throttle-robustness`.

- **RE1 — patch-scope fork resolved as *sequenced-both*:** the defensive throttle is implemented **in the IG Edge Function only**; the shared `m.publisher_lock_queue_v2` is **NOT** modified in this patch. Hardening the lock RPC's destination-keyed count is tracked as a **separate future D-01-reviewed shared-infra change**, sequenced after this EF patch proves out.
- **RE2 — destination_id write guarantee is a BLOCKING GATE:** the EF now requires `profile.destination_id` non-null before publishing (else skips with `missing_destination_id_throttle_gate`; **no page_id fallback**), and the success `m.post_publish` row writes that same `destination_id` (= `cpp.destination_id`) so both the EF throttle and the lock-RPC count are reliable.
- **RE3 — v2.0.0 unverified-runtime gate named explicitly:** v2.0.0's throttle has never executed a *successful* IG publish in production (only 2 failed attempts on 2026-05-01 before the pause). Re-enable MUST include the controlled single-publish verification (§4 step 4) under v2.1.0 before steady-state is trusted.
- **RE4 — cron 64 stays paused until backlog is healthy:** `seed-and-enqueue-instagram-every-10m` (jobid 64) remains `active=false` until the 123-row `queued` backlog has drained under throttle with **zero** 2207051; only then consider re-enabling the enqueuer.

**v2.1.0 throttle enforcement (EF-side, defence-in-depth):** counts the client's IG `post_publish` (`status='published'`) over 7 days by `client_id + platform` (robust — does not no-op on NULL `destination_id`); enforces `max_per_day` (requeue → next UTC day) and `min_gap_minutes` (requeue → gap end); auto-pauses the profile via `cpp.paused_until` (+`RATE_LIMIT_PAUSE_HOURS`=6h, tunable) on `2207051`/code-4; logs profile / destination_id / daily count / last-publish / cap+gap decision. No shared-infra change; no `publish_enabled` flip.

---

**Provenance (all read-only):** `cron.job` (53/64), `c.client_publish_profile` (IG throttle/enable/destination), `m.post_publish_queue` (queue status), `m.post_publish` (throttle-violation evidence + destination_id), `pg_get_functiondef('m.publisher_lock_queue_v2')`. Cross-references the 2026-05-23 IG deploy-verification memo. No production mutation; saved via local git only.
