# ICE — Live System State

> **This file is machine-written. Do not edit manually.**
> Last written: 2026-04-22 13:37 AEST (03:37 UTC) — End-of-session close after full sprint day
> Written by: PK + Claude session sync

---

## ⚠️ FIRST THING NEXT SESSION

**Read this entire file before doing anything else.** Today was a major day — 7 sprint items closed (M5, M6, M7, M8, M9, M11 via PRs + D165 decision/cleanup), workflow rule changed, IG publisher paused.

### Today's outcomes in one paragraph

Closed M2 verification follow-ons (M5 getPublishSchedule RPC; M9 client-switch staleness sweep + Schedule platform display), eradicated exec_sql in portal (M6) and dashboard feeds/create (M7), fixed bundler draft multiplication (M8, D164 backing), fixed 8-day silent cron outage (M11) — the trifecta of M8 + M11 + pending M12 was the complete root cause of the NDIS Yarns IG embarrassment. Applied D165 cleanup: 120 FB drafts + 41 queue items marked dead, IG publisher cron paused until M12 ships. Dev workflow rule changed: **direct-push-to-main is default, branch+PR only for risky/multi-repo work** (fix after Opus 4.7 PR-by-default drift created 3 orphan branches unmerged for hours).

### Critical state awareness for next session

1. **`instagram-publisher-every-15m` (jobid 53) is PAUSED** (`active=false`). Resume only AFTER M12 ships + verifies. A single new approved FB draft with image_url will be hijacked by IG again if cron resumes before M12.

2. **Pipeline is clean:** 0 approved-but-unpublished FB drafts, 0 queue items. Bundler will produce fresh drafts on next planner-hourly tick; cron will queue them.

3. **Reviewer layer still paused** (all 4 rows `c.external_reviewer.is_active=false`). Unchanged from 21 Apr. Resume ceremony at ~18-19 of 28 Section A items closed.

4. **M8 Gate 4 — 24h regression check due today (23 Apr Sydney)** — pre-approved query ready to run. Expected zero rows.

5. **Dev workflow rule: direct-push-to-main by default.** No branch+PR ceremony unless risky or multi-repo coordinated. Session start: sweep non-main branches across 3 repos, flag orphans before new work.

---

## SESSION STARTUP PROTOCOL (UPDATED 22 APR)

1. Read this file (`docs/00_sync_state.md`)
2. **NEW — Orphan branch sweep:** query all 3 repos for non-main branches; flag any whose tip is not reachable from main BEFORE starting work
3. Check `c.external_reviewer` — confirm reviewers still paused (`is_active=false` on all four rows)
4. Check IG publisher cron state — confirm `instagram-publisher-every-15m` (jobid 53) still paused, DO NOT resume before M12 verifies
5. Check file 15 Section G — pick next item from the sprint board
6. Check `m.external_review_queue` for any findings that landed before the pause (most recent 5 rows)
7. Read `docs/06_decisions.md` D156–D165 for accumulated decision trail
8. Query `k.vw_table_summary` before working on any table

---

## DEV WORKFLOW RULE (ADOPTED 22 APR — D165 context)

**Default: direct-push to main.** Claude Code work ships straight to main. Vercel auto-deploys within ~60s. Matches behaviour before Opus 4.7 adaptive.

**Deviate only when:**
- Multi-repo coordinated change where half-state would break production (e.g. route change requiring an EF that hasn't deployed yet)
- PK explicitly flags the work as risky

**Why this rule exists:** 22 Apr session discovered 3 orphan branches (M6 portal, M7 dashboard, Q2 dashboard) sitting with Vercel Preview deploys but never merged to main — code sat 4+ hours while state appeared "shipped." Claude Code's "Shipped — github.com/.../pull/new/..." URL is a create-a-PR landing page, not an opened PR. Without a sweep, orphans are silent.

**Session-start orphan sweep is non-negotiable.**

---

## TODAY'S FULL RUN (22 APR)

Chronology in UTC.

### Overnight 01:00-02:00 UTC — M5 + M6 + M7 + Q2 dispatched

Early-morning sprint picking up from 21 Apr's M2 close:
- **Q2** — Discovery pipeline `config.feed_url` normalisation, dispatched + merged (14 rows corrected, ingest EF sourced, dashboard route fixed)
- **M3** — A14 RLS audit of invegent-portal (2 HS OAuth findings, 5 MS exec_sql findings in `docs/briefs/2026-04-22-a14-rls-audit-findings.md`)
- **M5** — `getPublishSchedule` SECURITY DEFINER RPC dispatched; Claude Code shipped to branch; PR #3 opened

### 02:00-03:00 UTC — Privacy policy migration

Major discovery: Meta App Review URL for privacy policy (`invegent.github.io/Invegent-content-engine/Invegent_Privacy_Policy`) was 404 — GitHub Pages was never enabled.

Resolution:
- New canonical privacy policy at `invegent.com/privacy-policy` on `invegent-web` repo
- 12 sections including 4.3 YouTube / 4.4 24h transcript retention / 4.5 HeyGen / revision history
- `/privacy` path 301-redirects via `next.config.mjs`
- Old GitHub Pages URL decommissioned as link target
- **Closes A7** — privacy policy update sprint item
- PK to update Meta App Review URL field + User Data Deletion URL to `https://invegent.com/privacy-policy`

### 03:00-04:00 UTC — M5 verification + side-finds

PK ran Vercel preview gates on M5:
- CFW Schedule renders — 5 enabled cells (FB 2/5, IG 2/5, LI 1/5) ✅
- Property Pulse Schedule renders cleanly ✅
- Invegent (empty schedule) renders "No time slots yet" ✅

Side-finds during verification:
- ScheduleTab + FeedsClient missing the `key={activeClientId}` remount pattern that 17-Apr commits `7f43b80` + `d67ddcd` added elsewhere → dispatched as **M9**
- Property Pulse Schedule shows Facebook 6/5 — over tier limit → flagged as pending sprint item

M5 squash-merged: `737d1501d3404710898985dbddedf4de2b40b2d2` (PR #3).

### 04:00-06:00 UTC — NDIS Yarns IG incident diagnosis (M8)

PK screenshot showed ~100 visually identical posts on NDIS Yarns IG. Actually 18 distinct `post_draft_ids` × ~5 news signals = clusters of near-duplicates.

Diagnostic cascade:
- `m.post_publish` is clean — 1 publish per draft, all distinct platform_post_ids. Publisher was NOT duplicating.
- `m.post_draft` had 100+ `image_quote` drafts for NDIS Yarns created between 17 Apr 02:20-03:20 UTC across 5 canonical news topics.
- 97 drafts : 97 digest_items : 13 canonicals : 15 digest_runs → ~7-8 digest_items per canonical per hour

**Root cause:** `m.populate_digest_items_v1` had `ON CONFLICT (digest_run_id, canonical_id)` — only deduped within a single run. Hourly planner cron re-selected same fresh canonicals into fresh digest_items. 14-17 Apr pipeline block (D135) held 97 bloated digest_items; 17 Apr unblock produced 1-hour burst; 18 published to IG on 19 Apr.

**M8 fix:** `NOT EXISTS` guard in candidates CTE — skip canonicals already in a digest_item for the same client within 7 days, excluding current run for idempotency. Applied via `apply_migration` as `20260422_m8_populate_digest_items_v1_dedup_per_client_7d`. 7-day window backing captured as **D164**.

M8 squash-merged: `ffc767d07b715c3a1540c847a73baa7d32ebe0d5` (PR #1 on content-engine).

### 06:00-08:00 UTC — M6 portal + dashboard exec_sql eradication (M7)

Claude Code ran in parallel:
- **M6** — 5 RPCs created for portal exec_sql sites (verify_draft_ownership, get_client_name_by_id, get_client_brand_profile, get_portal_drafts_count, get_packages_for_form). Content-engine migrations merged as `2ec25f9`. Portal code changes pushed to branch.
- **M7** — `app/api/feeds/create/route.ts` exec_sql → `public.create_feed_source` SECURITY DEFINER RPC. Content-engine migration merged as `de20847`. Dashboard code change pushed to branch.

**Key finding in M7:** the "last known exec_sql site" framing was wrong. Audit revealed **30+ additional exec_sql sites** in the dashboard alone (siblings: `app/api/feeds/available/route.ts`, `app/api/diagnostics/route.ts`; actions/ layer: 5+ files; server components: ~12 sites; `lib/supabase/sql.ts` is a wrapper helper many import). Brief claim corrected honestly in M7 commit body. Follow-on sweep item tracked.

### 08:00-10:00 UTC — M9 dispatch + FB-vs-IG investigation (M11)

- **M9** dispatched: client-switch staleness sweep + Schedule platform display. Claude Code audited all 9 client tabs, found 2 missing the pattern (Schedule + Feeds). Also implemented the "always show all 4 platforms greyed-out-if-not-configured" spec.
- **M11** dispatched: FB-vs-IG publish disparity surfaced in M8 diagnostic (FB got 0 drafts when IG got 18). Claude Code worked ~15 min.

### 10:00-12:00 UTC — Orphan branch discovery + workflow reset

PK spotted Vercel showing many Preview deploys rather than Production-only (which was the historical pattern). Investigation:

| Repo | Branch | Status |
|---|---|---|
| invegent-dashboard | `fix/m7-dashboard-feeds-create-exec-sql` | Preview only, no PR opened, Claude Code shipped overnight |
| invegent-dashboard | `fix/q2-dashboard-feeds-create-key` | Superseded by M7 but never cleaned up |
| invegent-portal | `fix/m6-portal-exec-sql-eradication` | Preview only, no PR opened — portal production was still running pre-M6 exec_sql code |

Root cause: under Opus 4.7 adaptive, briefs defaulted to branch+PR workflow. Claude Code's "Shipped — github.com/.../pull/new/..." URL is a create-a-PR landing page, not an opened PR. Without an explicit sweep, orphans were silent for hours.

**Workflow reset:**
- Default changed to direct-push-to-main (see "DEV WORKFLOW RULE" section above)
- Session-start orphan sweep added to protocol
- Memory entry #30 replaced with the standing rule
- 3 orphan PRs opened + squash-merged immediately via MCP:
  - **M9** merged as `293f8764bcfeaa18096f3976386d98fdee9138e4` (dashboard PR #4)
  - **M6 portal** merged as `9c00b5a7fe901ff46a344f96a3d97f4b848c5de9` (portal PR #1)
  - **M7** merged as `eda95ce001809f06992639eb11f23831b348c689` (dashboard PR #5)
- Q2 dashboard branch left for manual delete (GitHub MCP has no delete-branch tool; harmless cosmetic clutter)

### 12:00-13:00 UTC — M11 merge + D165 bloat cleanup

M11 headline finding: the FB-vs-IG disparity was an 8-day silent cron outage, not a publisher/config/token issue. `enqueue-publish-queue-every-5m` (jobid 48) had `ON CONFLICT (post_draft_id)` but the actual unique index was `(post_draft_id, platform)`. Postgres raised `ERROR: there is no unique or exclusion constraint matching` on every 5-min run from 14 Apr 05:20 UTC — 2,258 silent failures over 8 days. FB queue writes stopped entirely. IG publisher kept working because it bypasses the queue.

Secondary finding (M12, not fixed): `instagram-publisher` reads `m.post_draft` directly with NO `pd.platform` filter. Grabs any approved draft with image_url regardless of intended platform. The 18 "IG duplicates" were actually FB-intended drafts hijacked by IG.

M11 squash-merged: `583cf176c57fdf76c4ae00214f85144d7c7bf593` (content-engine PR #2).

Post-merge state check revealed 120 FB-intended drafts from 17 Apr bloat window still pending (19 newly queued by M11 fix + 101 awaiting queue). **PK decision: delete not drain.** Rationale verbatim: *"rather than just spamming the pages... if we spam, we put 100 posts or you know 50 or 20 posts in one day, people will have different expectations or they will not take the page seriously... maybe the Facebook will tag the page as spam."*

**D165 cleanup applied (13:30 UTC):**
1. 120 FB drafts marked dead with `dead_reason='m8_m11_bloat_window_2026-04-17'` (NDIS Yarns 63, PP 44, CFW 13)
2. 41 queue items cleared (FB 27, IG 12 from 18 Apr, YouTube 2 from 9 Apr)
3. `instagram-publisher-every-15m` (jobid 53) paused via `cron.alter_job` — `active=false`

**D165 decision entry** captures the three-part bloat-window cleanup discipline (mark dead at source, clear queue, pause broken consumer) committed as `cb9eb9c`.

### 13:37 UTC — Session close (this file)

---

## THE EXTERNAL REVIEWER LAYER — CURRENT STATE (UNCHANGED FROM 21 APR)

| Reviewer | Lens | Model | `is_active` |
|---|---|---|---|
| Strategist | Right direction? | gemini-2.5-pro | false |
| Engineer | Built well? | gpt-4o | false (OpenAI Tier 2 pending) |
| Risk | Silent failures? | grok-4-1-fast-reasoning | false |
| System Auditor | Claim vs reality audit | grok-4-1-fast-reasoning | false |

All still paused. Re-enable ceremony at ~18-19 of 28 Section A items closed.

---

## CURRENT PHASE

**Phase 1 — COMPLETE** (7 Apr 2026)
**Phase 3 — Expand + Personal Brand** — active, external client expansion gated on pre-sales criteria

**Pre-sales gate status:** 9 of 28 Section A items closed, 19 open.

**Today's movement on the gate:**
- A7 (privacy policy update) — ✅ **CLOSED 22 Apr.** invegent.com/privacy-policy canonical + live.
- Sprint items closed (non-A, but strong signal on Clock B — Ops): M5, M6, M7, M8, M9, M11 — 6 PRs shipped, 161 draft/queue rows cleaned, IG hijack isolated behind paused cron.

**Operational status:** Pipeline clean. Bundler M8 dedup active. FB queue enqueue M11 fix live (cron healthy, last 40 min shows 8 successes / 0 failures). IG publishing paused until M12. LI / YouTube / WordPress publishing unaffected.

---

## ALL CLIENTS — STATE

| Client | client_id | FB | IG | LI | Schedule rows | Pending drafts | Notes |
|---|---|---|---|---|---|---|---|
| NDIS Yarns | fb98a472 | ✅ | ⏸ IG publisher paused | ✅ | 6 rows (seed) | 0 approved unpublished FB (D165 cleanup) | 63 drafts dead as m8_m11_bloat |
| Property Pulse | 4036a6b5 | ✅ | ⏸ IG publisher paused | ✅ | 6 rows + 6/5 tier violation | 0 approved unpublished FB | 44 drafts dead as m8_m11_bloat |
| Care For Welfare | 3eca32aa | ✅ | ⏸ IG publisher paused | ⚠ mode=null | 21 rows (first real UI save) | 0 approved unpublished FB | 13 drafts dead as m8_m11_bloat |
| Invegent | 93494a09 | ✅ | ⏸ IG publisher paused | ⚠ mode=null | 0 rows | 0 | A11b blocked |

All 4 FB tokens permanent (`expires_at: 0`).

---

## SPRINT MODE — THE BOARD (22 APR END-OF-DAY)

Source of truth: `docs/15_pre_post_sales_criteria.md` Section G. Today's snapshot:

### Quick wins (<1 hour each)

| # | Item | Status |
|---|---|---|
| Q1 | 13 failed ai_jobs SQL cleanup | ✅ CLOSED 21 Apr — D163 |
| Q2 | Discovery pipeline `config.feed_url` | ✅ CLOSED 22 Apr overnight |
| Q3 | A24 → closed in file 15 | ✅ CLOSED 21 Apr morning |
| Q4 | A7 privacy policy update | ✅ CLOSED 22 Apr — invegent.com/privacy-policy |

### Medium (1-3 hours)

| # | Item | Status |
|---|---|---|
| M1 | A11b CFW + Invegent content prompts | 🔲 Gated on PK prompt session Fri 24 Apr |
| M2 | CFW schedule save bug | ✅ CLOSED 21 Apr |
| M3 | A14 RLS verification | 🟡 Audit complete; 2 HS + (5 MS→0) findings — HS-1/HS-2 OAuth state signing remain |
| M4 | A18 — 7 source-less EFs | 🔲 Not yet picked |
| M5 | `getPublishSchedule` RPC hardening | ✅ CLOSED 22 Apr — PR #3 `737d150` |
| M6 | Portal exec_sql eradication | ✅ CLOSED 22 Apr — PR #1 `9c00b5a` |
| M7 | Dashboard `feeds/create` exec_sql | ✅ CLOSED 22 Apr — PR #5 `eda95ce` |
| M8 | Bundler draft multiplication | ✅ CLOSED 22 Apr — PR #1 content-engine `ffc767d`, D164 |
| M9 | Client-switch staleness + Schedule platform display | ✅ CLOSED 22 Apr — PR #4 `293f876` |
| M11 | FB-vs-IG publish disparity (8-day silent cron) | ✅ CLOSED 22 Apr — PR #2 content-engine `583cf17` |
| **M12** | **IG publisher `pd.platform` filter + enqueue NOT EXISTS platform-scoped** | **🔴 HIGH — IG publisher paused until ships** |

### Larger (half-day+) — unchanged since 21 Apr

| # | Item | Status |
|---|---|---|
| L1 | A1 + A5 + A8 — Pilot terms + KPI + AI disclosure | 🔲 PK draft |
| L2 | A3 + A4 — One-page proof doc | 🔲 Needs A4 first |
| L3 | A16 — Clock A dashboard | 🔲 |
| L4 | A17 — Clock C seven items | 🔲 |
| L5 | A20 — Pipeline liveness monitoring | 🔲 D155 fallout; M11 finding suggests this should include `cron.job_run_details` failure-rate watch |
| L6 | A21 — Trigger ON CONFLICT audit | 🔲 M11 is a live example of the class |
| L7 | A22 — ai-worker error surfacing | 🔲 |
| L8 | A23 — Live /debug_token cron | 🔲 D153 |
| L9 | A25 — Stage 2 bank reconciliation | 🔲 |
| L10 | A26 — Review discipline mechanism | 🔲 |

### New HIGH priority items surfaced today (need briefs)

| # | Item | Why HIGH |
|---|---|---|
| **M12** | IG publisher `pd.platform` filter + enqueue NOT EXISTS platform-scoped | IG publisher cron is currently paused; can only resume after M12 verifies |
| **Cron failure-rate monitoring** | `system-auditor` or pg_cron sweep watching `cron.job_run_details` failure_rate | 2,258 silent failures over 8 days should never recur undetected |

### Blocked / external

| # | Item | Status |
|---|---|---|
| A2 | Meta App Review | In Review; escalate 27 Apr if no movement; Shrishti 2FA pending |
| A6 | Unit economics (TBC subs) | Invoice check |

### Exec_sql eradication state

Today's M5/M6/M7 closed the highest-severity operator-facing write-path exec_sql sites. **But 30+ exec_sql sites remain in dashboard alone** (discovered during M7 audit, listed honestly in M7 commit body). Read paths + actions/ layer + server components all still use `exec_sql`. Also:
- `instagram-publisher` EF uses exec_sql with raw interpolation — can fold into M12
- `facebook-publisher` not yet audited

**Recommendation:** do NOT claim "exec_sql sweep complete" anywhere. "M5/M6/M7 closed the known operator-facing write-path sites" is the honest framing.

---

## WATCH LIST

### Due this session / tomorrow
- **M8 Gate 4 — 24h regression check** — run post-deploy variant of D164 regression query after 22 Apr 00:43 UTC + 24h = **23 Apr 00:43 UTC / 10:43 AEST Sydney**. Expected: zero rows.
- **M12 brief** — needs authoring before IG publisher can resume
- **Dashboard roadmap sync** — NOT done in this session (PK time-pressured); today's closures (M5, M6, M7, M8, M9, M11) + D164 + D165 need reflecting in `app/(dashboard)/roadmap/page.tsx`

### Due week of 22-27 Apr
- **Thu 23 Apr** — M8 gate 4 check + A1+A5+A8 pilot document drafting (PK)
- **Fri 24 Apr** — A11b content prompt session for CFW + Invegent (PK session)
- **Mon 27 Apr** — Meta App Review escalation trigger if no movement
- **Sat 2 May** — original reviewer calibration cycle trigger (defer until reviewers resume)

### Backlog (open, not yet addressed)
- **Publisher schedule source audit** — open since 21 Apr
- **`m.post_publish_queue.status` has NO CHECK constraint** — D163 continuation
- **TPM saturation on concurrent platform rewrites** — brief parked
- **docs/archive 5th-file mystery** — 30-sec investigation, not blocking
- **Per-commit external-reviewer pollution** — before reviewers resume
- **Property Pulse Schedule Facebook 6/5 tier violation** — save-side validation missing
- **30+ remaining exec_sql sites in dashboard** — major cleanup arc
- **`instagram-publisher` exec_sql + raw interpolation** — fold into M12
- **Shrishti 2FA + passkey** — Meta admin redundancy

---

## TODAY'S COMMITS

**Invegent-content-engine (main):**

- `9cca6e5` — feat(db): public.get_publish_schedule SECURITY DEFINER RPC (M5)
- `4d6fa16` — docs: A14 portal RLS audit findings (M3, audit-only)
- `2ec25f9` — feat(db): M6 portal exec_sql eradication — 5 SECURITY DEFINER RPCs
- `de20847` — feat(db): M7 create_feed_source RPC — dashboard feeds/create replacement
- `ffc767d` — fix(bundler): eliminate draft multiplication on shared signals (M8 — NDIS Yarns IG incident) (#1)
- `a2f4a67` — docs(decisions): add D164 — bundler per-client canonical dedup window 7d hardcoded
- `583cf17` — fix(cron): enqueue-publish-queue ON CONFLICT target — 8-day silent outage (M11 — FB-vs-IG root cause) (#2)
- `cb9eb9c` — docs(decisions): add D165 — bloat-window cleanup discipline
- THIS COMMIT — docs(sync_state): end-of-session close 22 Apr

**invegent-dashboard (main):**

- `737d150` — fix(schedule): replace exec_sql with SECURITY DEFINER RPC + surface read errors (M5) (#3)
- `293f876` — fix(dashboard): client-switch staleness sweep + Schedule platform display consistency (M9) (#4)
- `eda95ce` — fix(dashboard): eradicate exec_sql in feeds/create — RPC + boundary validation (M7) (#5)

**invegent-portal (main):**

- `9c00b5a` — fix(portal): eradicate exec_sql — 5 sites replaced with SECURITY DEFINER RPCs (M6) (#1)

**invegent-web (main):**

- `683b3c9` — add canonical privacy policy at /privacy-policy (closes A7)
- `85052af` — delete superseded /privacy route; 301 redirect via next.config.mjs

---

## CLOSING NOTE FOR NEXT SESSION

Biggest session since M2 close. Closed 6 M-numbered items + A7 + D164 + D165 + workflow reset. Pipeline state is genuinely clean (0 orphaned drafts, 0 queue items, M8+M11 fixes active) — best baseline in weeks.

Two things that MUST happen tomorrow before any new work:
1. **Session-start orphan sweep** — confirms no new orphans accumulated overnight
2. **M8 Gate 4 regression query** — 24h post-deploy, confirm zero duplicate digest_items for same canonical in same client

Two things waiting in the wings:
3. **M12 brief** — IG publisher needs the platform filter + enqueue NOT EXISTS scoping before `instagram-publisher-every-15m` cron resumes. Same EF still uses exec_sql so fold both into one PR.
4. **Dashboard roadmap sync** — today's 8 commits' worth of closures haven't been reflected on the dashboard roadmap page yet

Operational status for the Meta App Review demo: if reviewer loads NDIS Yarns IG or FB now, they see clean-looking pages with no new spam (IG cleanup was manual via PK; no stale-backlog drain risk because D165 killed it at the source). Better posture than this morning when 120 drafts were pending.

The M11 finding — 2,258 silent cron failures over 8 days undetected — is the biggest systemic lesson of the week. D155/D157 monitoring infrastructure should have surfaced this class of failure. "Cron failure-rate monitoring" is now a HIGH priority item on the board. Not blocking first pilot but would be embarrassing to have happen again with a paying client's pipeline.

PK is also doing a full-time job. Respect that. Sprint pace today was aggressive — next session can afford to be narrower (pick 1-2 items, close them cleanly, rest).
