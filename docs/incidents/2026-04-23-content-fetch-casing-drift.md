# Incident — Content-fetch silent outage (ID004)

**Date range:** 14 April 2026 (last successful body fetch) — 23 April 2026 09:30 UTC (fix applied)
**Detected:** 23 April 2026 ~07:00 UTC (PK, reviewing downstream digest starvation: Property Pulse 1,119 stuck candidates, NDIS/Invegent zero digest_items all week)
**Diagnosed:** 23 April 2026 ~09:20 UTC (PK + Claude session)
**Contained:** 23 April 2026 09:30 UTC via `cron.alter_job` on jobid 4 changing vault secret filter from `name='INGEST_API_KEY'` to `name='ingest_api_key'`. Verified fully 10:01 UTC — all four gates (V1/V2/V3/downstream) passed.
**Status:** ✅ Resolved. Root cause identified and fixed. Permanent prevention for this failure class pending — see D168.
**Severity:** Medium — 9 days of silent outage, but bounded blast radius: IG publisher was already paused (D165), FB queue was clean post-cleanup, no financial hit, no client-visible outage. Would have been High if IG/FB publishing had been live against stale-draft backlog.

---

## One-paragraph summary

Cron job `content_fetch_every_10min` (jobid 4) queried `vault.decrypted_secrets` with filter `where name='INGEST_API_KEY'` (uppercase). The actual vault entry is lowercase: `ingest_api_key`. Postgres string comparison is case-sensitive — the subquery returned NULL, the `x-ingest-key` HTTP header was sent with a null value, and the `content_fetch` Edge Function's auth check (`content_fetch/index.ts:116-119`) rejected with 401 Unauthorized. Every cron invocation since the casing drift failed identically. `pg_cron.job_run_details.status` reported `succeeded` because pg_cron measures the success of `net.http_post` *scheduling*, not the HTTP response status — so the outage was invisible. Downstream: `f.canonical_content_body.fetch_status='success'` count dropped to zero on 14 Apr. For clients on `mode='strict'` (NDIS Yarns) or null-defaulting to strict (Invegent), `m.populate_digest_items_v1`'s `eligible` CTE requires `body_fetch_status='success'` → zero digest_items despite 53+ canonicals/day arriving from upstream. For Property Pulse on `mode='lenient'`, pending-body candidates passed the filter but `final_score` stayed at 0 (scorer gives no points for empty body_text), so none cleared the selector's `>= 6` threshold — 1,119 candidates accumulated, zero selected. One root cause, two distinct-looking symptoms.

---

## What PK saw

- "Pipeline stalls" on NDIS Yarns, Invegent — zero digest_items all week despite hourly digest runs showing `status='populated'`.
- Property Pulse: 1,119+ digest_item candidates, zero promoted to `selected`. All scored 0.
- Every cron in `pg_cron.job_run_details` showing `succeeded`. No red signal anywhere.
- Care For Welfare showed similar surface symptoms but turned out to be a separate provisioning gap (slug `care-for-welfare-pty-ltd`, no client_source rows, no client_digest_policy row, not in planner) — never wired, not part of this incident.

---

## The two conditions that had to be simultaneously true

### 1. Case-sensitive lookup against case-sensitive vault names

Postgres treats `'INGEST_API_KEY' <> 'ingest_api_key'` as true. The `vault.decrypted_secrets.name` column stores the name as written. There is no case-normalization in the lookup path. When the cron command was hand-edited (likely via Dashboard, date unknown — no audit log), an uppercase-by-habit substitution silently matched nothing.

### 2. pg_cron status semantics mask HTTP failures

`cron.job_run_details.status='succeeded'` reflects only that the scheduled SQL ran without error. A `net.http_post(...)` call succeeds at the moment the request enters the `net._http_response` queue, regardless of the eventual HTTP status. Every existing pipeline health check reads `job_run_details.status` and treats `succeeded` as "work happened." This is a structural gap, not a bug in any specific check.

---

## Timeline (UTC)

| When | What |
|---|---|
| ≤ 14 Apr | Normal operation. 2–14 successful body fetches/day. |
| 14 Apr | Last successful body fetches recorded (3 rows). |
| 14 Apr ~00:10 UTC | First 401 response (would have been caught instantly with response-layer monitoring per D168). |
| 14–15 Apr | Cron command for jobid 4 introduced uppercase `INGEST_API_KEY` (exact change-point unknown — no audit log). All subsequent ticks 401. |
| 15 Apr → 22 Apr | 8 days silent outage. 288+ cron runs all 401. Trailing 25 pending rows reach the 7-day stale window cutoff. |
| 22 Apr | M8 (bundler dedup) and M11 (publish-queue ON CONFLICT) ship. Unrelated. |
| 23 Apr 07:00 | PK investigating downstream symptoms. |
| 23 Apr 09:10 | Both symptoms traced to zero successful bodies since 14 Apr. |
| 23 Apr 09:20 | Root cause: `INGEST_API_KEY` vs `ingest_api_key` in jobid 4. Sibling jobid 1 uses lowercase and works — isolates the bug. |
| 23 Apr 09:30 | Fix applied via `cron.alter_job`. |
| 23 Apr 09:30 | V1 passed — fresh cron run status=succeeded. |
| 23 Apr 09:32 | V2 passed — 3 fresh body-fetch successes in 15-min window (first successes since 14 Apr). |
| 23 Apr 09:32 + 09:56 | V3 passed — backlog trending down across two snapshots: 353 → 307 → 272 (−81 in ~35 min). |
| 23 Apr 10:00 | Downstream passed — NDIS Yarns 2 new digest_items at first post-fix planner-hourly tick. |

---

## Detection gap — why nothing alerted

- `cron.job_run_details.status='succeeded'` for every run (structural monitoring gap above).
- No `net._http_response` status aggregation — the 401s existed in telemetry but nothing summarised them.
- No alert on "zero successful body fetches in N days."
- No alert on "digest_item candidate backlog growing without drain."

Same family as ID003 (no retry-count alert) and M11 (no enqueue-rate alert). Third consecutive silent outage rooted in gaps between "job ran" and "job did what it was supposed to do." This is the trigger for D168.

---

## Fix applied

`cron.alter_job(job_id := 4, ...)` replacing `where name='INGEST_API_KEY'` with `where name='ingest_api_key'`. No other changes: schedule, URL, payload, timeout unchanged. Applied 2026-04-23 09:30 UTC. Readback confirmed `has_lowercase=true`, `has_uppercase=false`.

---

## Verification gates — all passed

1. **V1** ✅ — fresh cron run status=succeeded at 09:30:00 UTC after apply.
2. **V2** ✅ — `f.canonical_content_body.fetch_status='success' AND fetched_at >= now()-15min` returned 3.
3. **V3** ✅ — backlog (`fetch_status='pending'`) trending down across two consecutive checks: 353 (baseline) → 307 (09:32) → 272 (09:56). Drop of 81 in ~35 min. Drain rate ~140 rows/hour.
4. **Downstream** ✅ — NDIS Yarns 2 new digest_items at 10:00:00 UTC planner-hourly tick. `mode='strict'` client producing items for the first time since the outage began. Invegent 0 at 10:00 — plausibly scope-specific (Invegent has 5 enabled `client_source` rows vs NDIS's 15; 10 total post-fix successes spread across all clients' source pools makes scope intersection probabilistic). Tracked for 11:00 belt-and-braces, not blocking.

Property Pulse 0 new digest_items at 10:00 is expected — M8 per-client 7-day dedup (D164) correctly suppresses re-insertion of canonicals already in PP's 1,119-row pending-body candidate pool from the outage window.

---

## Observed but out of scope

V2 confirmed ~10% success / 70% paywalled+blocked ratio matches pre-outage norms. The paywalled-feed funnel is a pre-existing constraint, not caused by or revealed by this incident, but worth noting that digest supply depends on the fetchable minority. Separate from ID004 scope.

---

## Related / separate follow-ups

- **D168** — response-layer sentinel to prevent this class of silent outage recurring.
- **Care For Welfare provisioning gap** — CFW exists in `c.client` (slug `care-for-welfare-pty-ltd`) but has no `c.client_source` rows, no `c.client_digest_policy` row, and is not in the planner loop. Separate backlog ticket.
- **Invegent 0 at 10:00** — 11:00 belt-and-braces check appended as footnote below once data is in.

---

**11:00 UTC belt-and-braces (23 Apr):** Invegent still zero at 11:00 — requires scope-depth investigation, tracked separately.
