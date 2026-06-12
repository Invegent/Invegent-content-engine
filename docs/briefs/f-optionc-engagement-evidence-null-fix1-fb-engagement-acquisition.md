# f-optionc-engagement-evidence-null-fix1 — FB engagement acquisition repair (insights-worker)

**Brief ID:** `f-optionc-engagement-evidence-null-fix1-fb-engagement-acquisition`
**Parent carry:** F-OPTIONC-ENGAGEMENT-EVIDENCE-NULL — P2 OPEN/diagnosed (v3.42; session record `docs/runtime/sessions/2026-06-12-v3.42-f-optionc-engagement-evidence-null-close.md`)
**Class:** `ef_deploy` — narrow patch to `supabase/functions/insights-worker/index.ts` only (baseline v14.1.0, blob `d31071b8`)
**Status:** AUTHORED — **NOT IMPLEMENTED, NOT DEPLOYED.** Committing this brief is a docs action only.
**Framing:** instrumentation / evidence-feed repair. **This is NOT Option C implementation, and completing this fix does NOT approve Option C** — Option C remains PARKED until the full feed (D1+D2+D3) is repaired and a fresh decision is taken at its own gate.
**Execution gates (all required, in order):** Stage R verification (gated, read-only Graph calls) → CCD patch on branch/commit → **D-01 `ask_chatgpt_review` BEFORE deployment** → **PK exact approval phrase BEFORE any deploy** → CCD deploy via Supabase CLI from terminal (never the MCP wrapper) → post-deploy V-checks → close-out.

---

## 1. Current failure (evidence of record, v3.42)

- The direct Graph metric **`post_engaged_users` fails 526/526 FB rows** across all four clients/tokens (`raw_payload.failed_metrics`; systematic; introduced as a "direct metric" in v14.0.0).
- **`engaged_users` is NULL 526/526 rows.**
- The fallback basis (reactions+comments+shares from the post-fields call) is **0 on 526/526 rows** — and the code coerces fields-call failures to 0 (`Number(...) || 0`, error → `{}`), so "fetch failed" and "genuinely zero engagement" are indistinguishable in stored data; the fields-call outcome is not persisted in `raw_payload`.
- Net: **`engagement_rate` is NULL for ALL FB rows despite reach existing on many** (reach > 0 on 322/526; reach/impressions collection otherwise healthy and cron-scheduled).
- Code path (v14.1.0 `fetchPostInsights`): `engagementRate = reach > 0 && engaged_users != null ? engaged_users/reach : null`; `engaged_users = directEngaged ?? (derivedEngaged > 0 ? derivedEngaged : null)` — both legs dead.

## 2. Stage R — required research/verification BEFORE implementation

All Stage R Graph calls are **read-only GETs** against Meta (insights/fields reads; nothing posted, nothing mutated) but are still **provider calls — they happen only inside the gated execution session under this brief's approval**, never ad hoc. Verify, with evidence captured into the execution session record:

1. **Currently valid Meta Graph API source for post engagement under the deployed Graph version (v19.0):** test `post_engaged_users` directly on one known post per client and capture the exact error body. Evaluate candidate replacements against the v19 metric list: e.g. `post_reactions_by_type_total`, `post_clicks`, `post_activity*` family, or abandoning the insights-metric route for engagement in favour of a fields-derived basis. Decide the canonical engagement definition (recommended candidate: `(reactions + comments + shares [+ clicks]) / reach`) and document it in the patch changelog.
2. **Failure-cause classification:** determine whether the 526/526 failure is **metric-name deprecation, permissions (`pages_read_engagement`), endpoint shape, token scope, or code-path handling** — the captured error bodies decide this. Token-scope differences across the four clients should be checked (env-key vs inline-profile tokens both in use per v14.1.0 Type B).
3. **Post-fields call health:** run the exact fields call (`reactions.summary(true),comments.limit(0).summary(true),shares`) on posts with known non-zero engagement (verifiable in the FB UI) to determine whether 0-on-526/526 is genuine zero or a silently failing call (error shape, permission, or summary-parse issue).
4. **Zero-vs-failure design check:** confirm the patch design (§3) cleanly distinguishes the two in stored data before any code is written.

**Abort/replan condition:** if Stage R shows the failure is permissions/App-Review-scoped rather than code-fixable, stop — that becomes a Meta-side action, not an insights-worker patch, and this brief returns to PK with the evidence.

## 3. Proposed patch shape (narrow; v14.2.0)

**In scope — `insights-worker/index.ts` only:**
- Repair `engaged_users` acquisition per Stage R outcome: replace/remove the dead `post_engaged_users` metric; adopt the verified engagement basis.
- **Preserve raw failure visibility:** persist the post-fields call outcome into `raw_payload` (e.g. `post_fields_status: 'ok' | 'error'` + truncated error message); on fields-call failure store reactions/comments/shares as **NULL, not 0**; only derive engagement from a **successful** fields read.
- `engagement_rate` computed **only from trustworthy inputs**: requires reach > 0 AND a verified engagement basis; otherwise NULL with the failure reason visible in `raw_payload`.
- Version bump + changelog; no change to selection ordering (v14.1.0 Type C), token fallback (Type B), reach/impressions metrics, upsert conflict key, or `computeFormatPerformance`.

**Explicitly OUT of scope (later, separately gated fixes):**
- **No Option C changes.** No mix tables, no policy reconnection, no narrative layer.
- **No Advisor changes** — the NULL→"0.0%" shielding is Fix 4, separately scoped.
- **No aggregation-ownership change** — the 03:15 refresh clobber is Fix 2 (D2 stands).
- **No YouTube repair** — reach/views mapping + YT cron is Fix 3 (D3 stands).
- No DB schema change (all touched columns exist and are nullable), no cron change, no other EF.

**Known interaction (recorded, not a defect of this fix):** once FB `engagement_rate` populates, BOTH writers begin averaging real values — the 03:15 refresh will then write real (FB-only) window-30 averages instead of NULLs, partially healing the Advisor's read even before Fix 2. Fix 2 remains required for YT inclusion and window consistency.

## 4. Test plan

1. **Stage R evidence first** (§2) — no code until the engagement source is verified.
2. **Dry run / limited sample:** CCD local run against ONE client (lowest-volume: CFW, 19 perf rows) with `MAX_POSTS_PER_CLIENT` temporarily lowered or a temporary client filter in the local invocation — verify outputs before full deploy. If local execution is impractical, first post-deploy cron tick serves as the limited sample with V-checks immediately after (03:00–03:15 UTC window).
3. **Verify `raw_payload` records metric/field failures clearly** — failed insight metrics in `failed_metrics` (existing) + new `post_fields_status` populated on every row.
4. **Verify `engaged_users` populates where valid** — rows with reach > 0 and a successful engagement read get non-null `engaged_users`.
5. **Verify `engagement_rate` computes only from trustworthy inputs** — non-null only where reach > 0 AND verified basis; spot-check 3 posts against FB UI numbers.
6. **Verify true zero engagement remains distinguishable from fetch failure** — a successful fields read with genuinely 0 reactions/comments/shares stores 0s + `post_fields_status='ok'` (engagement_rate 0, not NULL); a failed read stores NULLs + `'error'`.
7. **Verify no regression to reach/impressions collection** — pre/post comparison of population rates (baseline: reach NOT NULL 526/526, reach > 0 on 322/526; impressions per current baseline) and `total_succeeded` per client vs the prior tick.

## 5. Gates, rollback, V-checks

- **D-01 before deployment** — fired at execution time with Stage R evidence attached; escalations handled per protocol (type-(a)/(b)/(c) classification; genuine objections satisfied before deploy).
- **PK exact approval phrase before any deploy.** No deploy on this brief's existence alone.
- **Deploy path:** CCD via Supabase CLI from terminal (governance: never the MCP deploy wrapper). Commit-then-deploy so repo and deployed hash stay drift-clean (A-LE).
- **Rollback:** redeploy prior version v14.1.0 from git (blob `d31071b8`) via CLI — single-step, no DB rollback needed (new rows with the new raw_payload fields are inert to all readers; columns unchanged).
- **Post-deploy V-checks (read-only, after the first full cron cycle):** V1 fresh FB perf rows carry `post_fields_status`; V2 `engaged_users` non-null rate > 0 on rows with reach > 0 (target: majority, exact threshold set from Stage R findings); V3 `engagement_rate` non-null on those rows and spot-check plausible (0 < rate ≤ 1); V4 reach/impressions population rates not degraded vs baseline; V5 zero-vs-failure distinguishable in at least one observed instance of each (or synthetic check); V6 drift register shows insights-worker v14.2.0 A-LE.
- **Confirmation of scope:** completing this fix **does not make Option C approved** — it makes Option C *decidable later*, at its own gate, once Fixes 2–3 land and evidence accumulates.

## 6. Roles

CCH: brief (this), Stage R evidence capture queries/records, D-01 fire, post-deploy V-checks via SQL. CCD: code patch, commit, CLI deploy, local dry run. PK: sole approval authority — Stage R go, deploy phrase, close-out acceptance.
