# Runbook — instagram-publisher v2.1.0 controlled deploy-test (RE-A breach tests)

> **PREPARED — DO NOT EXECUTE YET.** Run only during a **supervised, low-volume controlled-drain** session (D-01 RE-B option 2). Each live test publishes a real IG post; keep `limit=1`, abort on `2207051`, and keep ndis-yarns + property-pulse disabled. Retry-cap/`attempt_count` hardening is still required before unattended cron-53 steady-state.

**Deployed:** `instagram-publisher-v2.1.0` (commit `55bec57`, edge fn, project `mbkmaxqhsohbtwsqolns`). Verified via `GET /functions/v1/instagram-publisher/health`.

**v2.2.0 (staged on this branch, not yet deployed):** adds **image-container readiness polling** before `media_publish` — fixes IG 400 `9007`/`2207027` "Media ID is not available". The image Tests **a / d** require **v2.2.0 deployed** to succeed; against v2.1.0 they will still hit `9007`. Once v2.2.0 is deployed, re-confirm the health version reports `instagram-publisher-v2.2.0`, and expect new log lines: `… container poll attempt=N status_code=… status=…` and `… container FINISHED attempts=N waited_ms=M` (label = image / reel / carousel_child / carousel_parent).

## Scope this session (RE-A2 — option 2 selected)
This supervised deploy-test validates **three** paths only:
- **(a) successful publish path** — Test a.
- **(b) min-gap throttle/requeue path** — Test c.
- **(c) destination_id write guarantee** — Test d.

**Dedicated cap-breach (`max_per_day`) validation is DEFERRED** to a later controlled validation or to natural operation (see Test b, below, marked deferred). **Rationale:** validating the daily cap in this contained test would require either temporarily mutating `max_per_day` (explicitly disallowed — RE-A2 option 2) or driving a client to its full daily cap with real posts; both are avoided so the deploy-test stays contained. The cap logic shares the same `published_today` count + filter path exercised by Tests a/c, so the min-gap result gives indirect confidence pending dedicated validation.

## Preconditions (verify before running)
- Cron 53 (`instagram-publisher-every-15m`) and 64 (`seed-and-enqueue-instagram-every-10m`) remain **`active=false`** throughout (we invoke manually).
- Only **invegent** / **care-for-welfare** IG `publish_enabled=true`; **ndis-yarns + property-pulse stay `false`**.
- A test client has at least one **eligible** queued IG row (approved draft, media ready, `scheduled_for` due/past). If none, do not flip anything — pick a client that has one, or stop.
- Secrets exported by PK (never echoed): `PUBLISHER_API_KEY`, `SUPABASE_ANON_KEY` (or publishable key).

```bash
URL=https://mbkmaxqhsohbtwsqolns.supabase.co/functions/v1/instagram-publisher
# headers used below: -H "apikey: $SUPABASE_ANON_KEY" -H "x-publisher-key: $PUBLISHER_API_KEY" -H "Content-Type: application/json"
```

**Invoke timeout (REQUIRED — v2.2.0).** The EF now polls the image container (up to `IMAGE_CONTAINER_POLL_MAX_MS = 120s` + publish/write overhead, ~130s worst case; images normally finish in seconds). The caller must wait long enough:
- **`net.http_post`**: set `timeout_milliseconds := 180000` (≥ 180000) — the pg_net default is only 5000 ms, which would record a false timeout while the EF keeps running. **This also applies to cron 53's `net.http_post` command and must be set there before any cron-53 re-enable.**
- **curl**: use `-m 200` on the live Tests below (the dry-run is fast).
- EF-side bound: the synchronous response is still capped by Supabase's **150s request idle timeout**; the image path's ~130s worst case stays under it (verified against Free 150s / Paid 400s wall-clock limits — this project is paid).

## Baseline (read-only)
```sql
SELECT c.client_slug, cpp.destination_id, cpp.max_per_day, cpp.min_gap_minutes,
       (SELECT count(*) FROM m.post_publish p
         WHERE p.client_id=cpp.client_id AND p.platform='instagram' AND p.status='published'
           AND p.created_at >= date_trunc('day', now())) AS published_today,
       (SELECT max(p.created_at) FROM m.post_publish p
         WHERE p.client_id=cpp.client_id AND p.platform='instagram' AND p.status='published') AS last_published_at
FROM c.client_publish_profile cpp JOIN c.client c ON c.client_id=cpp.client_id
WHERE cpp.platform='instagram' AND cpp.publish_enabled=true;
```

## Test 0 — dry run (no publish; safe first step)
```bash
curl -s -X POST "$URL" -H "apikey: $SUPABASE_ANON_KEY" -H "x-publisher-key: $PUBLISHER_API_KEY" \
  -H "Content-Type: application/json" -d '{"limit":1,"dry_run":true}'
```
Expect `results[].status='dry_run_ok'` (or `no_instagram_publish_jobs`); **0 new** `m.post_publish` rows. **(RE-A1)** dry_run returns *before* the v2.1.0 defensive-throttle block executes, so it does **not** emit a `throttle … decision=…` log — do **not** expect one here. The throttle-decision log is validated during the live Tests a / c below.

## Test a — successful publish increments count
Run with an enabled client under cap and outside the gap:
```bash
curl -s -X POST "$URL" -H "apikey: $SUPABASE_ANON_KEY" -H "x-publisher-key: $PUBLISHER_API_KEY" \
  -H "Content-Type: application/json" -d '{"limit":1}'
```
Expect: `results[].status='published'` with `ig_media_id`. **Verify:**
```sql
-- published_today incremented by exactly 1 for that client (re-run baseline)
SELECT count(*) FROM m.post_publish
WHERE client_id='<CLIENT_ID>' AND platform='instagram' AND status='published'
  AND created_at >= date_trunc('day', now());
```

## Test d — successful publish wrote non-null destination_id (= profile)
```sql
SELECT pp.platform_post_id, pp.destination_id,
       pp.destination_id = cpp.destination_id AS matches_profile
FROM m.post_publish pp
JOIN c.client_publish_profile cpp
  ON cpp.client_id=pp.client_id AND cpp.platform='instagram'
WHERE pp.client_id='<CLIENT_ID>' AND pp.platform='instagram' AND pp.status='published'
ORDER BY pp.created_at DESC LIMIT 1;
```
Expect: `destination_id` non-null AND `matches_profile = true`.

## Test c — in-gap publish returns throttled/requeue
Immediately after Test a (well within `min_gap_minutes=240`), invoke again for the **same** client:
```bash
curl -s -X POST "$URL" -H "apikey: $SUPABASE_ANON_KEY" -H "x-publisher-key: $PUBLISHER_API_KEY" \
  -H "Content-Type: application/json" -d '{"limit":1}'
```
Expect: `results[].status='throttled'`, `reason='min_gap'`; **no** new published row. **Verify:** the locked queue row went back to `status='queued'` with `last_error` like `throttle_min_gap:Xm<240m` and a future `scheduled_for`.

## Test b — cap breach (DEFERRED — NOT run this session) (RE-A2)
**Do not run as part of this contained deploy-test, and do NOT mutate `max_per_day`** to synthesise a breach. Deferred to a later controlled validation or to natural operation (when a client legitimately reaches `published_today = max_per_day`).

When validated later, the expectation is: invoking with the client already at the daily cap yields `results[].status='throttled'`, `reason='max_per_day'`; **no** new published row; the locked queue row returns to `status='queued'` with `last_error` like `throttle_max_per_day:2/2` and `scheduled_for` = next UTC day. (No config mutation: reach the cap via normal publishes, not by editing `max_per_day`.)

## Throttle-decision log (each invoke)
Confirm a line per attempt: `[instagram-publisher] throttle client=… dest=… published_today=… max_per_day=… last_published_at=… min_gap_min=… cap_breached=… gap_breached=… decision=publish|requeue`.

## Safety / abort
- Keep `limit=1`. Supervise every invoke.
- **(RE-A3) Hard abort:** if any `limit=1` invocation produces **>1 published row**, or `published_today` jumps by **more than 1** for the client (unexpected burst), **stop immediately** — re-pause/verify and investigate before any further invoke. A single `limit=1` call must never publish more than one post.
- If any response/log shows IG error `2207051` or code 4: **stop**. The EF auto-pauses the profile via `cpp.paused_until` (+6h); do not retry-loop. Re-check `cron.job` 53/64 still `false`.
- **Containment held throughout (RE-A4):** cron 53/64 stay `active=false`; ndis-yarns + property-pulse stay `publish_enabled=false`; **no queue cleanup**; do not touch dead rows. Retry-cap / `attempt_count` hardening is still required **before** unattended steady-state cron-53 operation — this supervised test does not lift that requirement.

## Post-test read-only verification
```sql
-- no throttle violations during the test window
WITH ig AS (
  SELECT client_id, published_at,
         lag(published_at) OVER (PARTITION BY client_id,(published_at AT TIME ZONE 'UTC')::date ORDER BY published_at) AS prev
  FROM m.post_publish WHERE platform='instagram' AND status='published'
    AND created_at >= now() - interval '1 day')
SELECT client_id, (published_at AT TIME ZONE 'UTC')::date d, count(*) pubs,
       min(round((extract(epoch from (published_at-prev))/60)::numeric))::int min_gap_min,
       count(*) FILTER (WHERE destination_id IS NULL) null_dest
FROM ig GROUP BY 1,2;   -- expect pubs<=max_per_day, min_gap>=240, null_dest=0
```
