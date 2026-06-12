# f-optionc-engagement-evidence-null-fix1 — FB engagement acquisition repair (insights-worker)

**Brief ID:** `f-optionc-engagement-evidence-null-fix1-fb-engagement-acquisition`
**Parent carry:** F-OPTIONC-ENGAGEMENT-EVIDENCE-NULL — P2 OPEN/diagnosed (v3.42; session record `docs/runtime/sessions/2026-06-12-v3.42-f-optionc-engagement-evidence-null-close.md`)
**Class:** `ef_deploy` — narrow patch to `supabase/functions/insights-worker/index.ts` only (baseline v14.1.0, blob `d31071b8`)
**Status:** AUTHORED + **STAGE R COMPLETE (2026-06-12) — AMENDED with verified findings. NOT IMPLEMENTED, NOT DEPLOYED.**
**Framing:** instrumentation / evidence-feed repair. **This is NOT Option C implementation, and completing this fix does NOT approve Option C, Advisor changes, aggregation-ownership changes, or YouTube repairs** — Option C remains PARKED; Fixes 2/3/4 remain separately gated.
**Execution gates (remaining, in order):** CCD patch on branch/commit → **D-01 `ask_chatgpt_review` BEFORE deployment** → **PK exact approval phrase BEFORE any deploy** → CCD deploy via Supabase CLI from terminal (never the MCP wrapper) → post-deploy V-checks → close-out.

---

## 1. Current failure (evidence of record, v3.42)

- `engaged_users` NULL **526/526** FB rows; fallback reactions+comments+shares basis stored as 0 on **526/526**; `engagement_rate` NULL on ALL FB rows despite reach > 0 on 322/526.
- `raw_payload.failed_metrics` distribution: `engaged_users` (post_engaged_users) fails **526/526**; **`impressions` (post_impressions) ALSO fails 526/526**; `reach` (post_impressions_unique) and `clicks` (post_clicks) succeed on 459/526 (the 67 failures are the known NY-only cluster — separate carry).
- Code path (v14.1.0): fields-call failures coerced to 0 (`Number(...) || 0`, error → `{}`), outcome not persisted — "fetch failed" and "genuine zero" indistinguishable in stored data.

## 2. STAGE R RESULTS (verified 2026-06-12 — read-only Graph GETs via pg_net, tokens never exposed in requests; response capture incident noted §2.5)

**2.1 Root cause is SPLIT — two different failures, one per leg:**
- **Leg A — direct insights metrics: globally invalid.** `post_engaged_users` returned the identical error `(#100) The value must be a valid insights metric` on **all four clients/tokens** — metric-level invalidity, NOT permissions, NOT token-specific, NOT endpoint shape, NOT code-path. **`post_impressions` returned the same #100** — the worker's impressions metric is equally dead.
- **Leg B — fields fallback: permission-blocked.** The exact fields call (`reactions.summary(true),comments.limit(0).summary(true),shares`) returned `(#10) requires 'pages_read_engagement' permission or 'Page Public Content Access'`. The RCS fallback has been silently failing on permissions all along; the 0-on-526/526 was never genuine zero. (Verified on the CFW token; same app across clients → high-confidence global, one-token-tested.)

**2.2 Graph-version drift is part of the failure mode.** Requests were issued as `v19.0` but **Meta served them as v24.0** (v19 has sunset; Graph silently auto-upgrades). Under the served version, `post_engaged_users` and `post_impressions` are removed while `post_impressions_unique` and `post_clicks` survive — exactly matching the 459/526 success pattern.

**2.3 Viable replacement verified.** **`post_reactions_by_type_total` returned HTTP 200** on the same token that failed the fields call — an insights-side reactions source that works **without** `pages_read_engagement`. The test post returned an empty value object (genuinely zero reactions on a reach-2 post), proving zero-vs-failure is cleanly distinguishable: 200 + empty value ≠ 400 + structured error code.

**2.4 Failure-classification answers:** per-metric and global (identical #100 across all clients/tokens) for Leg A; permission/App-Review-scoped for Leg B; nothing token-specific or client-specific in either leg (the NY 67-row cluster excepted, separate carry).

**2.5 Security incident + standing hygiene rule (L-StageR-paging).** Meta's successful (200) responses include `paging` URLs that **echo the access token**. One Stage R response capture leaked a CFW page-token fragment into the session transcript; containment: the pg_net response row was purged same-day under PK approval (`security_purge_pgnet_stage_r_159957`), CFW token rotation actioned as a precaution. **Standing rule: any SQL/pg_net Graph verification must strip/redact `paging` blocks before capturing or persisting response bodies; the patch must likewise redact/drop `paging` from anything persisted or logged.**

## 3. Proposed patch shape (REVISED per Stage R; narrow; v14.2.0)

**In scope — `insights-worker/index.ts` only:**
1. **Replace `post_engaged_users` with `post_reactions_by_type_total`** (sum the by-type values into a reactions total).
2. **Handle the dead `post_impressions` metric in the same narrow patch** — remove it, or replace it with a verified successor tested in the gated execution session; do not leave a known-dead call in METRICS_TO_TRY.
3. **Pin the Graph version explicitly to the currently served version (v24.0)** rather than relying on silent auto-upgrade — version drift caused this failure mode.
4. **Engagement basis:** `engagement_rate = (reactions_total [+ clicks]) / reach`, **computed only from trustworthy 200-response inputs** (reach > 0 AND a 200 reactions read). Canonical definition documented in the changelog.
5. **Store failed reads as NULL, not 0.** No coercion anywhere in the metric/fields paths.
6. **Preserve raw failure visibility in `raw_payload`:** per-call record `{source, http_status, fb_error_code, fb_error_message (truncated), value_present}`.
7. **Redact/drop `paging` blocks before persistence/logging** (per §2.5).
8. The legacy fields call is either removed or retained ONLY behind the same failure-visible recording (it will keep failing #10 until the Meta-side action lands — see §3a).
9. Version bump + changelog; no change to selection ordering (Type C), token fallback (Type B), upsert conflict key, or `computeFormatPerformance`.

**§3a — SPLIT-OUT Meta-side action (separate carry; does NOT block Fix 1):** verify/obtain **`pages_read_engagement`** (or Page Public Content Access) for the page tokens to regain **comments + shares** coverage later — App Review territory, aligns with the existing Meta App Review carry. **Fix 1 proceeds as an insights-worker code fix on the reduced engagement basis (reactions [+clicks] / reach); comments/shares coverage is the later Meta-permission carry.**

**Explicitly OUT of scope (unchanged):** no Option C changes; no Advisor changes (Fix 4); no aggregation-ownership change (Fix 2/D2); no YouTube repair (Fix 3/D3); no DB schema change; no cron change; no other EF. **Completing this fix does not approve any of those, and does not approve Option C.**

**Known interaction (recorded):** once FB `engagement_rate` populates, both writers begin averaging real values — the 03:15 refresh writes real (FB-only) window-30 averages instead of NULLs, partially healing the Advisor's read even before Fix 2. Fix 2 remains required for YT inclusion and window consistency.

## 4. Test plan (updated)

1. Stage R complete (§2) — engagement source verified; no further pre-code research required except the impressions-successor check (§3.2) inside the gated session.
2. **Dry run / limited sample:** CCD local run against ONE client (CFW, lowest volume); else first post-deploy cron tick (03:00–03:15 UTC) serves as the limited sample with immediate V-checks.
3. Verify `raw_payload` records metric/field failures clearly — per-call records present on every row; no `paging` content persisted.
4. Verify reactions_total populates where valid (200 reads), including the genuine-zero case (200 + empty value → 0, `engagement_rate` 0 not NULL).
5. Verify `engagement_rate` non-null only from trustworthy inputs; spot-check 3 posts against FB UI numbers.
6. Verify zero-vs-failure distinguishable: 200+zero stores 0s with ok-status; failed reads store NULLs with error code.
7. Verify no regression to reach/clicks collection (baseline: 459/526 success) and `total_succeeded` per client vs prior tick; confirm the version pin (v24.0) does not break the surviving metrics.

## 5. Gates, rollback, V-checks (unchanged in structure)

- **D-01 before deployment** (Stage R evidence attached); **PK exact approval phrase before any deploy**; deploy via Supabase CLI from terminal only; commit-then-deploy (A-LE drift-clean).
- **Rollback:** redeploy v14.1.0 from git (blob `d31071b8`) — single-step; no DB rollback needed.
- **Post-deploy V-checks:** V1 fresh rows carry per-call raw_payload records (no paging content); V2 reactions-basis populated on 200-reads; V3 `engagement_rate` non-null and plausible (0 ≤ rate ≤ 1) on rows with reach > 0 + verified basis; V4 reach/clicks population not degraded vs 459/526 baseline; V5 zero-vs-failure observed/synthetically confirmed; V6 drift register shows insights-worker v14.2.0 A-LE.
- **Scope confirmation:** this fix makes Option C *decidable later* at its own gate; it does not approve Option C.

## 6. Roles

CCH: brief + Stage R (done), D-01 fire, post-deploy V-checks via SQL. CCD: code patch, commit, CLI deploy, local dry run, in-session impressions-successor check. PK: sole approval authority — deploy phrase, close-out acceptance, Meta-side §3a carry decision.
