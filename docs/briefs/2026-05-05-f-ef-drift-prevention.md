# F-EF-DRIFT-PREVENTION — Edge Function Source Drift Prevention

**Date:** 2026-05-05 (evening, post-v2.39 + sync commit `7ba441e2`)
**Status:** ACTIVE — P1 inspection (no patch, no deploy)
**Parent:** RECONCILE-EF-DRIFT (CLOSED by commit `7ba441e2aba18cd848c67a6283e6376a8846f91a`)
**Project:** mbkmaxqhsohbtwsqolns
**Repo:** Invegent/Invegent-content-engine
**Total deployed EFs:** 47 (per `Supabase:list_edge_functions`, 2026-05-05 ~22:00 UTC)

---

## 1. Why this brief exists

On 2026-05-05 evening the v2.39 carry-forward identified that 4 deployed Edge Functions were either ahead of or absent from the GitHub source repo. RECONCILE-EF-DRIFT applied a sync-only commit to bring those 4 to byte-parity with deployed source. That sync closed the symptom but not the cause.

Three things that the sync revealed make a prevention investigation P1:

1. **Drift went undetected for at least 5 days.** The deployed `youtube-publisher` source had been edited multiple times (v1.5.0 → v1.6.0 deployed 1 May, 4 days before discovery) without a corresponding repo commit. There is no automated alert when deployed EF source diverges from `main`.
2. **One drift case had matching banners but different bodies.** `youtube-publisher` repo and deployed both reported `v1.6.0` in the VERSION constant — but the bodies differed by one comment line. Banner-equality alone is not sufficient evidence of source-equality. This is the trap case: a developer or audit checking only `VERSION === VERSION` would report parity when there is none.
3. **Three of four affected EFs had stale repo source for at least one full deployed version cycle.** `ai-worker` was 3 minor versions behind. `heygen-worker` was 1 version behind. `video-worker` was missing from the repo entirely. None of these would have been detected by routine GitHub browsing because the directories existed (or the absence was not flagged) and casual reading suggests current state.

The cost of this drift is real: any developer (Claude-Code, PK, or future contributor) reading the repo and assuming it reflects production would propose changes against stale source, build a patch on stale assumptions, or introduce regressions. The sync mitigated this for 4 EFs. The other 43 deployed EFs have not yet been audited.

---

## 2. Scope (locked by PK direction, 2026-05-05)

This brief investigates and recommends. It does NOT patch EF code. It does NOT deploy. It does NOT start F-YT-NY-FORMAT-SELECTION. It does NOT start M6.

The scope items, verbatim:

1. **Investigate how deployed EF source diverged from GitHub.** Candidate root-cause hypotheses to evaluate:
   - local manual `supabase functions deploy` from CLI (deployed without `git add` / `git commit` of the staged file)
   - Supabase dashboard inline-edit (deploys directly to the Edge Function runtime, never touches local source)
   - uncommitted local working-tree edit deployed via CLI (file was edited in local repo but never committed)
   - another agent or chat window deploying without coordinating with the primary repo
   - GitHub Actions / CI deploy pipeline absent or bypassed
2. **Identify all Edge Functions where repo version differs from deployed version.**
3. **Identify whether version banners inside EFs are reliable.** Cases to test: (a) banner present and matches deploy slug; (b) banner present but stale relative to deployed body; (c) banner absent; (d) banner matches both repo and deployed but bodies differ (the `youtube-publisher` trap case).
4. **Propose an automated prevention mechanism.** Candidate options:
   - drift-check script (cron-runnable, compares all 47 EF deployed sources against repo)
   - CI guard on PR (refuse merge if any local EF source disagrees with deployed)
   - scheduled audit (daily / weekly cron writing to a drift table or alert channel)
   - dashboard health check (drift card on Overview tab)
   - deploy-only-from-repo policy (CLI deploys forbidden; deploys flow through GitHub Action that requires committed source)
5. **Recommend the lowest-friction solution for a solopreneur workflow.** Solo means: no team review process available, every guardrail must be either zero-friction or self-imposing, the recommendation must not add hours of process per session.
6. **Do not patch Edge Functions yet.**
7. **Do not start F-YT-NY-FORMAT-SELECTION until deployed source is synced.** (Synced 2026-05-05 via commit `7ba441e2`. Holding on PK go-ahead for the F-YT-NY-FORMAT-SELECTION brief regardless, per scope item 7 + PK §7.)
8. **Do not start M6 unless EF source sync is blocked.** (Sync was not blocked. M6 remains paused per scope item 8.)

---

## 3. Methodology

The investigation proceeds in three tiers, each producing evidence the next builds on. Tier 1 is cheap (read-only API calls). Tier 2 is the bulk of the work (47 EF body fetches). Tier 3 is the analysis layer.

**Tier 1 — Inventory map (cheap reads)**
- `Supabase:list_edge_functions` → all 47 deploy slugs + numeric versions + `ezbr_sha256` (already captured for this brief, see Section 4 baseline table).
- `Invegent GitHub:list_directory supabase/functions` → all repo directories (already captured: 40 directories).
- For each deployed slug, compute repo-side presence: directory exists / does not exist.

**Tier 2 — Body-level comparison**
- For each deployed EF, `Supabase:get_edge_function` returns full source.
- For each EF whose repo directory exists, `github:get_file_contents` returns the corresponding file.
- Three classes recorded per EF:
  - **CLASS A — clean**: deployed banner matches deploy slug AND repo body byte-equals deployed body.
  - **CLASS B — banner-drift**: deployed banner matches deploy slug AND repo banner differs from deployed banner (whether or not body also differs). Banner check would catch this.
  - **CLASS C — body-drift trap**: deployed banner matches repo banner BUT body differs (the `youtube-publisher` case). Banner check FAILS to catch this.
  - **CLASS D — missing**: repo directory absent (the `video-worker` case).
- Tier 2 produces the per-EF table that fills Section 5 of this brief.

**Tier 3 — Hypothesis matrix and recommendation**
- Cross-reference Tier 2 findings against the 5 root-cause hypotheses (Section 2.1).
- Use timestamps (`updated_at` on Supabase, last-commit timestamps on repo) to triangulate which hypothesis fits each drift case.
- Run banner-reliability assessment using Tier 2 class distribution (Section 6).
- Score each prevention option on (friction, coverage, latency, false-positive rate) (Section 7).
- Recommend (Section 8).

---

## 4. Tier 1 baseline — deployed inventory

Captured from `Supabase:list_edge_functions` 2026-05-05 ~22:00 UTC. 47 EFs, all `ACTIVE` status. Sorted by `created_at`.

| # | Slug | Deploy version | Created | Last updated (UTC ms) | Repo dir? |
|---|---|---|---|---|---|
| 1 | inspector | 104 | 2025-12-04 | 1770070241541 | ✓ |
| 2 | ingest | 117 | 2025-12-15 | 1775640513241 | _TBD_ |
| 3 | content_fetch | 89 | 2025-12-26 | 1776263362045 | ✓ |
| 4 | ai-worker | 99 | 2026-01-07 | 1777883372719 | ✓ (synced 7ba441e2) |
| 5 | publisher | 82 | 2026-01-07 | 1777637678730 | ✓ |
| 6 | inspector_sql_ro | 59 | 2026-01-14 | 1771885732752 | ✓ |
| 7 | auto-approver | 57 | 2026-01-22 | 1777725573346 | ✓ |
| 8 | insights-worker | 55 | 2026-01-26 | 1775535921114 | ✓ |
| 9 | feed-intelligence | 42 | 2026-01-26 | 1772869052635 | ✓ |
| 10 | email-ingest | 37 | 2026-01-30 | 1773186582960 | ✓ |
| 11 | draft-notifier | 38 | 2026-02-04 | 1773801782462 | ✓ |
| 12 | image-worker | 59 | 2026-02-07 | 1775534583808 | _TBD_ |
| 13 | series-outline | 37 | 2026-02-07 | 1773888041940 | ✓ |
| 14 | series-writer | 38 | 2026-02-07 | 1774009935049 | ✓ |
| 15 | pipeline-doctor | 35 | 2026-02-07 | 1773913956302 | _TBD_ |
| 16 | pipeline-ai-summary | 36 | 2026-02-07 | 1773952188204 | _TBD_ |
| 17 | compliance-monitor | 36 | 2026-02-08 | 1773956922162 | _TBD_ |
| 18 | video-worker | 36 | 2026-02-08 | 1775635437137 | ✓ (synced 7ba441e2) |
| 19 | youtube-publisher | 38 | 2026-02-08 | 1777635026171 | ✓ (synced 7ba441e2) |
| 20 | pipeline-fixer | 26 | 2026-02-19 | 1774944028363 | ✓ |
| 21 | compliance-reviewer | 26 | 2026-02-21 | 1775127454248 | ✓ |
| 22 | video-analyser | 25 | 2026-02-23 | 1775641515133 | _TBD_ |
| 23 | heygen-intro | 22 | 2026-02-24 | 1775696414041 | _TBD_ |
| 24 | heygen-youtube-upload | 21 | 2026-02-24 | 1775696748059 | _TBD_ |
| 25 | heygen-worker | 22 | 2026-02-24 | 1775697948797 | ✓ (synced 7ba441e2) |
| 26 | heygen-avatar-creator | 28 | 2026-02-25 | 1775741371371 | ✓ |
| 27 | heygen-avatar-poller | 31 | 2026-02-25 | 1775778607737 | ✓ |
| 28 | onboarding-notifier | 22 | 2026-02-25 | 1775787695689 | ✓ |
| 29 | brand-scanner | 22 | 2026-02-28 | 1776416112760 | ✓ |
| 30 | ai-profile-bootstrap | 21 | 2026-02-28 | 1775983249510 | ✓ |
| 31 | weekly-manager-report | 25 | 2026-02-28 | 1776334952529 | ✓ |
| 32 | pipeline-sentinel | 22 | 2026-02-29 | 1776233322893 | ✓ |
| 33 | pipeline-diagnostician | 22 | 2026-02-29 | 1776233382387 | ✓ |
| 34 | pipeline-healer | 22 | 2026-02-29 | 1776233331816 | ✓ |
| 35 | client-weekly-summary | 22 | 2026-02-29 | 1776233365709 | ✓ |
| 36 | insights-feedback | 22 | 2026-02-29 | 1776233373946 | ✓ |
| 37 | instagram-publisher | 24 | 2026-03-01 | 1777104048247 | ✓ |
| 38 | linkedin-zapier-publisher | 24 | 2026-03-01 | 1777637759762 | ✓ |
| 39 | wordpress-publisher | 21 | 2026-03-02 | 1776233390684 | ✓ |
| 40 | feed-discovery | 22 | 2026-03-04 | 1776803059725 | ✓ |
| 41 | external-reviewer | 13 | 2026-03-08 | 1776746987608 | ✓ |
| 42 | external-reviewer-digest | 11 | 2026-03-08 | 1776740220995 | ✓ |
| 43 | system-auditor | 11 | 2026-03-08 | 1776756092090 | ✓ |
| 44 | chatgpt-review-worker | 5 | 2026-04-29 | 1777686284744 | ✓ |
| 45 | mcp-chatgpt-bridge | 8 | 2026-04-29 | 1777691647895 | ✓ |
| 46 | mcp-github-bridge | 4 | 2026-05-01 | 1777865918640 | ✓ |
| _additional_ | _ai-diagnostic, linkedin-publisher_ | _repo only_ | _NA_ | _NA_ | ✓ (in repo, no deployed match) |

Initial Tier 1 finding worth noting: the repo has `ai-diagnostic/` and `linkedin-publisher/` directories that have no deployed counterpart. Either these are not yet deployed (legitimate work-in-progress) or they were deleted from Supabase but the repo dirs remained (reverse drift). Tier 2 will determine which. Slugs marked `_TBD_` need a quick repo check to fill in the column — the original repo `list_directory` returned 40 entries but I haven't yet matched all 47 deploy slugs against that list. Will resolve in next pass.

---

## 5. Tier 2 — per-EF drift inventory

_To be filled. Each row will record:_

| Slug | Deploy version | Repo file SHA | Deploy banner | Repo banner | Body match? | Class (A/B/C/D) | Notes |
|---|---|---|---|---|---|---|---|

_Already characterised (from RECONCILE-EF-DRIFT, included here as the seed for this section):_

| ai-worker | 99 | (post-sync `54bf045d`) | `ai-worker-v2.11.1` | (pre-sync was `v2.9.0`) | post-sync match | _was B_ | Synced 7ba441e2 |
| heygen-worker | 22 | (post-sync `284a1154`) | `heygen-worker-v1.1.0` | (pre-sync was `v1.0.0`) | post-sync match | _was B_ | Synced 7ba441e2 |
| video-worker | 36 | (post-sync `a15f1505`) | `video-worker-v2.1.0` | (pre-sync absent) | post-sync match | _was D_ | Synced 7ba441e2 |
| youtube-publisher | 38 | (post-sync `78157b8a`) | `youtube-publisher-v1.6.0` | (pre-sync `v1.6.0`, body differed by 1 comment) | post-sync match | _was C_ | Synced 7ba441e2. **Trap case demonstrating banner-only check is insufficient.** |

The other 43 EFs are pending Tier 2 fetches.

---

## 6. Tier 3 — root-cause hypothesis matrix

_To be filled after Tier 2 completes. Preliminary view (subject to revision):_

| Hypothesis | Likelihood | Evidence required | Evidence pattern |
|---|---|---|---|
| Manual CLI `supabase functions deploy` | HIGH | Local repo file edited but no commit; deployed source matches local working tree | Look for EFs where local working tree (per `Windows-MCP:FileSystem`) differs from `git show HEAD:supabase/functions/<slug>/index.ts` |
| Supabase dashboard inline-edit | MEDIUM | Deployed source has no parallel in repo or local working tree | EFs where deployed source has features the repo has never seen |
| Uncommitted local working-tree edit | MEDIUM-HIGH | Local working tree differs from `HEAD`; deployed matches working tree | Same as hypothesis 1 but distinguished by lack of CLI history |
| Parallel agent / chat window deploy | LOW-MEDIUM | Multiple distinct edit styles in deployed source over short time windows | Pattern-match on comment style and code conventions across versions |
| GitHub Actions / CI absent or bypassed | CONFIRMED | `.github/workflows/` lacks an EF-deploy workflow | Already known: there is no CI-based EF deploy pipeline |

The "GitHub Actions / CI absent or bypassed" hypothesis is already partially confirmed: the repo has no automated EF deploy pipeline, so all deploys are manual (CLI from local working tree, or dashboard). Both manual paths admit drift unless the operator commits the deployed source on every deploy. The investigation will quantify which manual path produced each drift case.

---

## 7. Banner reliability — preliminary (post-RECONCILE-EF-DRIFT)

Observations on the 4 just-synced EFs:

- **All 4 deployed banners matched their slug name.** Banner-vs-slug check (e.g., `VERSION === "ai-worker-v2.11.1"` for slug `ai-worker`) was reliable for all 4 cases.
- **All 4 banners followed the `<slug>-vX.Y.Z` convention**, which is a useful invariant. A check that detects banner-vs-slug-name divergence is feasible and cheap.
- **HOWEVER, banner-vs-banner comparison FAILED for 1 of 4 (youtube-publisher)** — repo banner and deployed banner both said `v1.6.0` but bodies differed. **This proves banner equality is necessary but not sufficient for source equality.**
- **Of the 4, only 1 had a missing banner** — none. (`video-worker` was missing entirely from repo; its deployed source had a banner.)

Tier 2 will widen this to all 47.

Preliminary banner-reliability verdict: useful as a fast first-pass drift signal, NOT a substitute for byte-comparison. Any production prevention mechanism must body-compare on a periodic basis, not just banner-compare.

---

## 8. Prevention options — preliminary

_To be ranked after Tier 2 + Tier 3 complete. Initial sketch:_

**Option A — Drift-check script invoked manually before each session.**
Friction: low (1 command). Coverage: high (47 EFs). Latency: zero (runs when you ask). Cost: developer discipline only.

**Option B — Daily pg_cron job calling a drift-check Edge Function that writes findings to a `m.ef_drift_log` table.**
Friction: very low (passive). Coverage: high (47 EFs). Latency: ≤24h. Cost: minor — one new EF, one new table, one cron entry. Surfaces in dashboard automatically.

**Option C — Wrapper script over `supabase functions deploy` that refuses to deploy unless local repo is clean and committed.**
Friction: medium (changes deploy workflow). Coverage: prevents new drift only — doesn't detect existing drift. Cost: small wrapper script.

**Option D — Deploy-only-from-CI policy: GitHub Action triggers `supabase functions deploy` on push to `main`. Manual CLI deploys forbidden.**
Friction: high (changes deploy mental model entirely). Coverage: very high if enforced. Cost: GitHub Action + secret + discipline. Risk: breaks PK's ability to do urgent hot-fixes if CI is slow or down.

**Option E — Combination of B + C.**
Friction: low-medium. Coverage: high (B detects + C prevents). Cost: minor.

The recommendation will likely be Option E or Option B alone, depending on Tier 2 findings about how often new drift is introduced vs. how much old drift exists.

---

## 9. Tasks

- [x] Brief created with scope locked.
- [ ] Tier 1: complete repo-presence check for all 47 deploy slugs (resolve _TBD_ rows in Section 4 table).
- [ ] Tier 2: fetch deployed source for the 43 remaining EFs and compare against repo.
- [ ] Tier 2: classify each EF as Class A/B/C/D.
- [ ] Tier 3: cross-reference findings with root-cause hypothesis matrix.
- [ ] Section 6: fill banner-reliability assessment with all-47 data.
- [ ] Section 7: rank prevention options on (friction, coverage, latency).
- [ ] Section 8: lock recommendation and present for PK approval.

No EF patching, no deploys, no NY×YT or M6 work until this brief is closed and PK has approved a recommendation.

---

## 10. Decisions

_To be appended as decisions are made._

---

_End of brief skeleton. Tier 1 / Tier 2 inventory commences in next session pass._
