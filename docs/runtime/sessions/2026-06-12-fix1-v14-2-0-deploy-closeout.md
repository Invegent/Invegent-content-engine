# 2026-06-12 — Fix 1 deploy close-out: insights-worker v14.2.0 LIVE (record 66) + NEW FINDING: pre-existing misversioned deploy drift

**Status:** Deploy executed by CCD under PK exact phrase `PK APPROVES DEPLOY insights-worker v14.2.0 Fix 1`. D-01 `0fbbea62-72b4-475d-8555-f2eaf4ece0d2` decision `proceed`, escalate `false`, zero pushback. **V-checks PENDING** — next natural cron cycle 2026-06-13 03:00–03:15 UTC. NO register close-out until V-check evidence (PK rule).

## 1. Deploy facts of record (CCD, 2026-06-12 ~22:00 UTC)

- Merge commit **`335ab121b6561ee1429f273d9322820264eae118`** (main), patch commit `a8a1ea5f`, branch `fix/insights-worker-v14.2.0-fb-engagement`.
- Files changed: exactly `supabase/functions/insights-worker/index.ts` (16,838 → 21,925 B; blob `d31071b8` → `238874bc`). CCH line-verified H1–H6 + scope locks pre-D-01.
- Deployed via Supabase CLI (terminal); deployment record **version 66, ACTIVE**; live GET reports `insights-worker-v14.2.0`, Graph `v24.0`.
- No DB schema / cron / Advisor / ai-worker / Option C / aggregation / YouTube changes; no manual worker run; no forced cron; no token exposure. **Option C remains PARKED.**
- Rollback (single-step, standing): `git revert -m 1 335ab121` + push + `supabase functions deploy insights-worker --project-ref mbkmaxqhsohbtwsqolns` (restores v14.1.0 logic; new raw_payload keys inert).

## 2. D-01 close-out

Review row `0fbbea62` verified status **`completed`** (2026-06-12 21:50 UTC) — the bridge auto-closed the loop on the clean `proceed` (original call returned `db_update_error: null`). Close-the-loop protocol satisfied by verification; no write needed this lane.

## 3. 🔴 NEW FINDING (read-only, this lane): F-INSIGHTS-DEPLOY-VERSION-DRIFT (provisional ID; register at reconciliation)

**The insights-worker deployed BEFORE today's record-66 deploy was a misversioned build: it self-identified as `insights-worker-v14.2.0` while executing v14.1.0 logic — live since at least 2026-06-08 03:00 UTC.**

**Evidence (all read-only):**
- All 526 FB `m.post_performance` rows carry `raw_payload.version = "insights-worker-v14.2.0"` with `collected_at` spanning 06-08 03:00 → 06-12 03:16 UTC — **all pre-deploy** (today's deploy ~22:00 UTC; the v14.2.0 string did not exist in any repo artefact until 06-12).
- **Payload shape is conclusively v14.1.0:** 0/526 rows have `calls` or `engagement_basis_source` keys (v14.2.0 writes both on every row); sample row (06-12 03:16): `failed_metrics: ["impressions","engaged_users"]` — those metric keys exist only in v14.1.0's metric set; `metric_names_used` = reach+clicks only.
- Not a DB-side stamp: migration history clean (last entries are the audited purge + pin); YouTube rows untouched (`youtube-insights-worker-v1.0.0`, stale 05-29) ruling out a table-wide bulk UPDATE.

**Implications:**
1. **Silent A-LE drift violation:** repo main carried v14.1.0 (blob `d31071b8`) while the deployed binary self-reported v14.2.0 for ≥4 days; the drift-check mechanism did not catch it. Likely mechanism: a deploy ≤06-08 from a working tree with a pre-bumped VERSION line (mechanism unconfirmed; fact established by payload shape).
2. **Behavioural impact: none beyond v14.1.0's known defects** — the deployed logic matched v14.1.0 exactly (the entire v3.42/Stage-R diagnosis was shape/behaviour-based and is unaffected; Fix 1 stands).
3. **Version-string provenance in `raw_payload` is unreliable for the 06-08→06-12 window** and CANNOT discriminate post-deploy rows. CCD's "live version v14.2.0" GET check is weak sole evidence (the old build reported the same); deployment record 66 + tonight's payload shape are the real confirmation.
4. **Carry recommendations (register with V-check results):** (a) open F-INSIGHTS-DEPLOY-VERSION-DRIFT — investigate which deploy ≤06-08 shipped the misversioned bundle (Supabase deployment records 6x history) and how the drift check missed it; (b) drift-check hardening candidate: compare deployed bundle hash, not VERSION self-report.

## 4. V-checks V1–V6 — PENDING, with AMENDED predicates (shape-based, not version-string)

**Run after the natural 2026-06-13 cycle (NY 03:00 / CFW 03:05 / PP 03:10 / Invegent 03:15 / feedback 03:30 UTC). No forced cron, no manual invocation.**

Post-deploy row discriminator: **`raw_payload ? 'calls'` AND `collected_at > '2026-06-12 22:00 UTC'`** (NOT the version string — see §3).

- **V1:** fresh rows have `raw_payload.calls[]` records; no `paging` content anywhere in raw_payload.
- **V2:** `engagement_basis_source = 'reactions_by_type_total'` where the reactions metric returned 200; `post_fields_rcs` call records remain visible with `#10` if the app-level block persists (expected day-1).
- **V3:** `engagement_rate` non-null and plausible (0 ≤ rate ≤ 1) where reach > 0 AND basis exists.
- **V4:** reach/clicks collection not regressed vs pre-deploy baseline (459/526 success; 67 NY-cluster failures known) under the explicit v24.0 pin.
- **V5:** zero-vs-failure distinguishable: 200+zero → 0 with `value_present: true`; failed reads → NULL with fb_error_code recorded.
- **V6:** deployed version confirmation **by payload shape** (calls keys present = genuine v14.2.0 ran) + deployment record 66 ACTIVE; retrospective drift component recorded in §3.

**Expected day-1 shape:** `engagement_basis_source='reactions_by_type_total'` on ~all fresh rows; `fields_rcs` records showing #10; `failed_metrics` containing `reactions_total` only where that call failed; impressions NULL everywhere.

## 5. Constraint compliance (this lane)

Read-only close-out: 5 read-only SELECTs (close-out prep, version distribution, sample payload, migration history, YT discriminator) + this docs commit. **0 DB/config/schema/cron changes, 0 forced cron, 0 manual worker runs, 0 broad Graph calls, 0 register edits, 0 token values.** T1 untouched. Registers untouched pending V-check evidence.
