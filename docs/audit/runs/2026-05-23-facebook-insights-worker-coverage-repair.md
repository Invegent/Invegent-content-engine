# Evidence Memo — Facebook insights coverage repair / `observer.insights_ingestion_stalled_since_0506`

**Date:** 2026-05-23
**Status:** repaired → track/monitoring · `next_review_at` 2026-05-24
**Supabase project:** `mbkmaxqhsohbtwsqolns` (content_engine)
**Function:** `supabase/functions/insights-worker`
**Repair commit:** `0f03c0900af47750c9adf07894b9286357fac2f6` · deployed version `insights-worker-v14.1.0`

---

## 1. Original (wrong) diagnosis → correction

**Original framing:** "Facebook insights ingestion is stalled since ~05-06." Implied a total ingestion stall and/or expired Type A tokens.

**Correction (verified):** ingestion was **not** totally stalled. `m.post_performance.collected_at` was still refreshing an older subset of rows (max `collected_at` = 2026-05-23 03:02 at diagnosis time). What had stalled was **new-row coverage**: `max(created_at)` was stuck at **2026-05-06 03:01:37** — no *first-time* performance rows for ~17 days. Two distinct faults (Type B + Type C), no token fault.

## 2. Type A — token probe result (no refresh needed)

A temporary, gated, sanitized-output-only diagnostic (`fb-token-probe`, since decommissioned to an inert stub) read the two env secrets and called Graph insights for one sample post each:

| env_key | secret_present | graph_status | http |
|---|---|---|---|
| `FB_PAGE_TOKEN_PROPERTY_PULSE` | true | **success** | 200 |
| `FB_PAGE_TOKEN_NDIS_YARNS` | true | **success** | 200 |

Both Type A tokens valid and returning `post_impressions_unique`. **No token refresh required.** Token values were never printed/logged/returned.

## 3. Type B — skipped clients (credential_env_key NULL)

`insights-worker` resolved the page token **only** from `credential_env_key`. **Care For Welfare** and **Invegent** have `credential_env_key = NULL` (inline `page_access_token` present), so the worker skipped them by design → 0 performance coverage for those two clients. (NDIS Yarns + Property Pulse have env keys set.)

## 4. Type C — insertion / coverage starvation

`processClient` selected eligible published FB posts with `LIMIT 50` and **no `ORDER BY`**. With no never-collected / freshness ordering, each run kept re-selecting the same older subset (refreshing their `collected_at`) while newer posts beyond that subset never received a **first-time** `m.post_performance` row. Success was being measured as `collected_at` churn, masking the absence of new `created_at` rows.

Pre-repair coverage (eligible published FB posts >24h old, missing a perf row):

| client | eligible | missing |
|---|---|---|
| care-for-welfare | 11 | 11 |
| invegent | 19 | 19 |
| ndis-yarns | 216 | 131 |
| property-pulse | 221 | 147 |
| **total** | | **308** |

## 5. Repair applied

`insights-worker` **v14.1.0**, deployed from commit **`0f03c09`** (Supabase CLI, from disk, `--use-api --no-verify-jwt`; only this function deployed):

- **Type C fix** — never-collected-first selection. The selection now uses the worker's existing `exec_sql` pattern with a `LEFT JOIN m.post_performance`, ordered: (1) posts with no perf row first, (2) then oldest `collected_at`, (3) then most recent `published_at`. Per-client limit (`MAX_POSTS_PER_CLIENT = 50`) preserved. Reports `first_time` / `total_first_time`.
- **Type B fix** — token-source fallback. Use the `credential_env_key` env secret first; if NULL or unavailable, fall back to the inline `client_publish_profile.page_access_token` (same source the publisher uses). Token values never logged/returned/persisted (only a `token_source` label).
- D-01 hardening — interpolated system values cast explicitly (`'${client_id}'::uuid`, `'${cutoff}'::timestamptz`) for defence-in-depth.
- Graph call + upsert unchanged; `onConflict (platform_post_id, insights_period)` preserved.
- **No DB migration. No secret update. No cron change.**

## 6. Verification results (first manual pass)

- `m.post_performance` `max(created_at)` advanced **2026-05-06 03:01:37 → 2026-05-23 10:21:45** (first-time-row stall broken).
- **29 new performance rows** inserted (total FB rows 159 → 188).
- **Invegent 0 → 19** performance rows — proves the inline `page_access_token` fallback works (rows carry real `reach` data, confirming the inline token authenticated to Graph). Invegent now fully covered (0 missing).
- **Property Pulse +10** new rows (missing 147 → 137).
- **Care For Welfare** and **NDIS Yarns** not yet reached this pass — still require subsequent runs to drain backlog.
- The first manual pass returned **`WORKER_RESOURCE_LIMIT`** (platform compute limit while draining a large backlog in one shot). This is **partial completion, not a failure**: the upsert is idempotent and the next run continues. Coverage advanced 308 → 279 missing.
- Pool moved **act_now → track/monitoring**, `next_review_at` 2026-05-24.

## 7. Remaining monitoring carries

- **Care For Welfare** should go 0 → covered on the next runs (same NULL-`credential_env_key` + inline-token config as Invegent, which succeeded).
- **NDIS Yarns / Property Pulse** coverage gaps should continue shrinking run-over-run (NY 131, PP 137 missing remain).
- **`observer_stale`** signals for these clients should begin showing real observed counts once coverage fills in (instead of the false-positive "n/a" that seeded this pool).
- **`WORKER_RESOURCE_LIMIT`** may recur while the ~279-row backlog drains — expect multiple runs. Watch that later-ordered clients (CFW, NY) actually get served each cycle: the worker processes all clients per run in a fixed order and re-collects already-covered clients before reaching later ones, so under the compute limit CFW/NY could be under-served during drain. If they stall, consider a follow-up (skip fully-covered clients / round-robin / smaller per-run scope / higher compute tier) or a few targeted manual passes. (Out of scope here; flagged only.)
- Metric-value nuance (separate from coverage): new rows show low `reach` and null `impressions` for some older posts — a data-quality follow-up, not a coverage-repair defect.

## 8. Explicit statement

- **No token refresh** — Type A tokens (PP, NY) were probed valid; inline tokens (CFW, Invegent) authenticate. No credential change.
- **No DB migration** — fix reuses the existing `exec_sql` RPC and the existing `client_publish_profile.page_access_token` column.
- **No secret update.**
- **No rollback needed** — the deploy logic is correct and verified; `WORKER_RESOURCE_LIMIT` is partial completion (idempotent), explicitly not a rollback trigger.

---

**Read/write boundary:** the v14.1.0 deploy and the single approved manual invoke (which wrote the 29 `m.post_performance` rows as its normal operation) were explicitly PK-approved. This memo was persisted via local git only (not the GitHub bridge write path). No further Supabase mutation, no secret update, no cron change, no `friction.case`/`friction.event` writes, Q-005 left open, cc-0015 not started, `fb-token-probe` decommissioned stub left in place.
