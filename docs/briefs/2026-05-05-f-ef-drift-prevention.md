# F-EF-DRIFT-PREVENTION — Edge Function Source Drift Prevention

**Date:** 2026-05-05 (evening, post-v2.39 + sync commit `7ba441e2`)
**Status:** ACTIVE — P1 inspection (no patch, no deploy)
**Parent:** RECONCILE-EF-DRIFT (CLOSED by commit `7ba441e2aba18cd848c67a6283e6376a8846f91a`)
**Project:** mbkmaxqhsohbtwsqolns
**Repo:** Invegent/Invegent-content-engine
**Total deployed EFs:** **46** (per `Supabase:list_edge_functions`, 2026-05-05 ~22:00 UTC)
**Tier 2 progress:** 21/46 surveyed (46%) — Batches 1+2 complete

---

## 1. Why this brief exists

On 2026-05-05 evening the v2.39 carry-forward identified that 4 deployed Edge Functions were either ahead of or absent from the GitHub source repo. RECONCILE-EF-DRIFT applied a sync-only commit to bring those 4 to byte-parity with deployed source. That sync closed the symptom but not the cause.

Three things that the sync revealed make a prevention investigation P1:

1. **Drift went undetected for at least 5 days.** The deployed `youtube-publisher` source had been edited multiple times (v1.5.0 → v1.6.0 deployed 1 May, 4 days before discovery) without a corresponding repo commit. There is no automated alert when deployed EF source diverges from `main`.
2. **One drift case had matching banners but different bodies.** `youtube-publisher` repo and deployed both reported `v1.6.0` in the VERSION constant — but the bodies differed by one comment line. Banner-equality alone is not sufficient evidence of source-equality. This is the trap case: a developer or audit checking only `VERSION === VERSION` would report parity when there is none.
3. **Three of four affected EFs had stale repo source for at least one full deployed version cycle.** `ai-worker` was 3 minor versions behind. `heygen-worker` was 1 version behind. `video-worker` was missing from the repo entirely.

Batch 1 of Tier 2 (see Section 11) added a fourth driver: **`ingest` is pipeline-core, on deploy version 117, and has never landed in the repo at all**. Its banner does not even follow the slug-vSEMVER convention — it's `ingest-v8-youtube-channel`, a feature tag.

Batch 2 of Tier 2 added the most consequential evidence yet:

- **`insights-worker` is on deploy version v14.0.0 in production but the repo is still on v1.6.0.** This is the largest banner-version gap discovered to date — roughly 12 minor-version generations of drift, including changes to the metrics-fetching strategy.
- **`image-worker` and `feed-intelligence` are both Class C (banner-match-body-diff)** — exactly the trap case `youtube-publisher` first revealed. `image-worker` is one of the highest-traffic EFs in the system and its repo source is well-formatted multi-line code while production runs a minified single-line variant. They are functionally equivalent (same VERSION, same logic, same recent fixes) but bytewise very different.

The investigation is now closing in on a clear prevention recommendation: **body-comparison must run periodically; banner-only checks are insufficient.** That conclusion is firm enough to lock for Section 8 even before the remaining ~25 EFs are surveyed.

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
3. **Identify whether version banners inside EFs are reliable.** Cases to test: (a) banner present and matches deploy slug; (b) banner present but stale relative to deployed body; (c) banner absent; (d) banner matches both repo and deployed but bodies differ (the `youtube-publisher` trap case); (e) banner present and slug-prefix correct, but version field is a feature tag rather than a semver number; **(f) banner is in a comment with no `VERSION` constant at all (heygen utility class).**
4. **Propose an automated prevention mechanism.** Candidate options:
   - drift-check script (cron-runnable, compares all 46 EF deployed sources against repo)
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

The investigation proceeds in three tiers, each producing evidence the next builds on.

**Tier 1 — Inventory map (cheap reads)** — DONE.
**Tier 2 — Body-level comparison (in batches of ~10)** — IN PROGRESS (21/46 surveyed).
**Tier 3 — Hypothesis matrix and recommendation** — partial (matrix updating after each batch; Section 8 will firm up after Batch 5).

Body-comparison protocol per EF:
- `Supabase:get_edge_function` returns full source for every deployed slug.
- `github:get_file_contents` returns the corresponding repo file when the directory exists.
- Five classes recorded per EF:
  - **CLASS A — clean**: deployed banner matches deploy slug AND repo body byte-equals deployed body. Subclass: **A (line-ending only)** — bodies differ only in CRLF vs LF.
  - **CLASS B — banner-drift**: deployed banner differs from repo banner. Banner check would catch this.
  - **CLASS C — body-drift trap**: deployed banner equals repo banner BUT body differs (the `youtube-publisher` case, also `image-worker` and `feed-intelligence`).
  - **CLASS D — missing**: repo directory absent.
  - **REVERSE-DRIFT** — repo directory exists but no deployed counterpart.

---

## 4. Tier 1 baseline — deployed inventory (post-Batch 2)

Captured from `Supabase:list_edge_functions` 2026-05-05 ~22:00 UTC. **46 EFs**, all `ACTIVE` status. Repo-presence column resolved through the sync work + Tier 2 batches.

| # | Slug | Deploy version | Repo dir? | Class (post-Batch 2) |
|---|---|---|---|---|
| 1 | inspector | 104 | ✓ | TBD |
| 2 | ingest | 117 | ✗ | **D** (Batch 1) |
| 3 | content_fetch | 89 | ✓ | **A line-ending** (Batch 2) |
| 4 | ai-worker | 99 | ✓ | A (synced) |
| 5 | publisher | 82 | ✓ | A (Batch 1) |
| 6 | inspector_sql_ro | 59 | ✓ | TBD |
| 7 | auto-approver | 57 | ✓ | A (Batch 1) |
| 8 | insights-worker | 55 | ✓ | **B** (Batch 2) |
| 9 | feed-intelligence | 42 | ✓ | **C** (Batch 2) |
| 10 | email-ingest | 37 | ✓ | TBD |
| 11 | draft-notifier | 38 | ✓ | TBD |
| 12 | image-worker | 59 | ✓ | **C** (Batch 2) |
| 13 | series-outline | 37 | ✓ | TBD |
| 14 | series-writer | 38 | ✓ | TBD |
| 15 | pipeline-doctor | 35 | ✗ | **D** (Batch 1) |
| 16 | pipeline-ai-summary | 36 | ✗ | **D** (Batch 1) |
| 17 | compliance-monitor | 36 | ✗ | **D** (Batch 1) |
| 18 | video-worker | 36 | ✓ | A (synced) |
| 19 | youtube-publisher | 38 | ✓ | A (synced) |
| 20 | pipeline-fixer | 26 | ✓ | **A** (Batch 2) |
| 21 | compliance-reviewer | 26 | ✓ | TBD |
| 22 | video-analyser | 25 | ✗ | **D** (Batch 2) |
| 23 | heygen-intro | 22 | ✗ | **D** (Batch 2) |
| 24 | heygen-youtube-upload | 21 | ✗ | **D** (Batch 2) |
| 25 | heygen-worker | 22 | ✓ | A (synced) |
| 26 | heygen-avatar-creator | 28 | ✓ | TBD |
| 27 | heygen-avatar-poller | 31 | ✓ | TBD |
| 28 | onboarding-notifier | 22 | ✓ | TBD |
| 29 | brand-scanner | 22 | ✓ | TBD |
| 30 | ai-profile-bootstrap | 21 | ✓ | TBD |
| 31 | weekly-manager-report | 25 | ✓ | TBD |
| 32 | pipeline-sentinel | 22 | ✓ | TBD |
| 33 | pipeline-diagnostician | 22 | ✓ | TBD |
| 34 | pipeline-healer | 22 | ✓ | TBD |
| 35 | client-weekly-summary | 22 | ✓ | TBD |
| 36 | insights-feedback | 22 | ✓ | TBD |
| 37 | instagram-publisher | 24 | ✓ | **A line-ending** (Batch 2) |
| 38 | linkedin-zapier-publisher | 24 | ✓ | A (Batch 1) |
| 39 | wordpress-publisher | 21 | ✓ | **A** (Batch 2) |
| 40 | feed-discovery | 22 | ✓ | TBD |
| 41 | external-reviewer | 13 | ✓ | TBD |
| 42 | external-reviewer-digest | 11 | ✓ | TBD |
| 43 | system-auditor | 11 | ✓ | TBD |
| 44 | chatgpt-review-worker | 5 | ✓ | TBD |
| 45 | mcp-chatgpt-bridge | 8 | ✓ | TBD |
| 46 | mcp-github-bridge | 4 | ✓ | TBD |

Repo-only directories (reverse-drift candidates): `ai-diagnostic` and `linkedin-publisher`.

**Cumulative class distribution across 21 surveyed EFs:** A=11 (52%), B=1 (5%), C=2 (10%), D=7 (33%).

---

## 5. Tier 2 — per-EF drift inventory (Batches 1+2 complete)

### Batch 1 (2026-05-05)

| # | Slug | Deploy ver | Banner | Banner conv | Repo SHA | Body match | Class | Op importance |
|---|---|---|---|---|---|---|---|---|
| 1 | ai-worker | 99 | `ai-worker-v2.11.1` | ✓ semver | `54bf045d` | ✓ | A | HIGH — LLM draft gen |
| 2 | heygen-worker | 22 | `heygen-worker-v1.1.0` | ✓ semver | `284a1154` | ✓ | A | MED — avatar videos |
| 3 | video-worker | 36 | `video-worker-v2.1.0` | ✓ semver | `a15f1505` | ✓ | A | MED — Creatomate |
| 4 | youtube-publisher | 38 | `youtube-publisher-v1.6.0` | ✓ semver | `78157b8a` | ✓ | A | HIGH — YT publish |
| 5 | **ingest** | **117** | **`ingest-v8-youtube-channel`** | **✗ feature-tag** | _none_ | n/a | **D** | **CRITICAL — pipeline top** |
| 6 | publisher | 82 | `publisher-v1.8.0` | ✓ semver | `56b1d1da` | ✓ | A | CRITICAL — FB publish |
| 7 | linkedin-zapier-publisher | 24 | `linkedin-zapier-publisher-v1.1.0` | ✓ semver | `5620e973` | ✓ | A | HIGH — LinkedIn |
| 8 | auto-approver | 57 | `auto-approver-v1.6.0` | ✓ semver | `936cc414` | ✓ | A | HIGH — approval gates |
| 9 | **compliance-monitor** | 36 | `compliance-monitor-v1.2.0` | ✓ semver | _none_ | n/a | **D** | MED — monthly NDIS hash |
| 10 | **pipeline-doctor** | 35 | `pipeline-doctor-v1.0.0` | ✓ semver | _none_ | n/a | **D** | MED — self-healing 30min |
| 11 | **pipeline-ai-summary** | 36 | `pipeline-ai-summary-v1.1.0` | ✓ semver | _none_ | n/a | **D** | LOW — narration |

**Batch 1 totals:** A=7, B=0, C=0, D=4.

### Batch 2 (2026-05-05)

| # | Slug | Deploy ver | Banner | Banner conv | Repo SHA | Body match | Class | Op importance |
|---|---|---|---|---|---|---|---|---|
| 1 | content_fetch | 89 | `content-fetch-v2.4-rpc` | ✗ feature-tag (slug-prefix correct, version `2.4-rpc`) | `606e75f6` | LF/CRLF only | **A line-ending** | HIGH — pipeline core (jina article body fetch) |
| 2 | **image-worker** | 59 | `image-worker-v3.9.2` | ✓ semver | `37e0804f` | **NO — minified vs formatted** | **C** | HIGH — image generation (Creatomate, carousel deadlock fix) |
| 3 | **insights-worker** | 55 | deployed `insights-worker-v14.0.0` ≠ repo `insights-worker-v1.6.0` | ✓ semver | `d4bfcd09` | **NO — substantial functional drift** | **B** | HIGH — Phase 2 perf feedback, daily cron |
| 4 | **feed-intelligence** | 42 | `feed-intelligence-v1.0.0` | ✓ semver | `b76c12b7` | **NO — dead-code diff (deployed has fallback dead code, repo cleaned up)** | **C** | MED — feed quality cron weekly |
| 5 | pipeline-fixer | 26 | `pipeline-fixer-v1.1.0` | ✓ semver | `afa61b59` | ✓ | **A** | MED — pipeline fixer 30min cron |
| 6 | **video-analyser** | 25 | `video-analyser-v1.2.0` | ✓ semver | _none_ | n/a | **D** | LOW — YT channel video analysis |
| 7 | **heygen-intro** | 22 | `// heygen-intro v2 — fixed talking_photo_style` | **✗ no VERSION constant** | _none_ | n/a | **D** | LOW — HeyGen test utility |
| 8 | **heygen-youtube-upload** | 21 | `// heygen-youtube-upload — one-shot` | **✗ no VERSION constant** | _none_ | n/a | **D** | LOW — HG→YT one-shot |
| 9 | instagram-publisher | 24 | `instagram-publisher-v2.0.0` | ✓ semver | `a2712068` | LF/CRLF only | **A line-ending** | HIGH — IG publish (currently paused) |
| 10 | wordpress-publisher | 21 | `wordpress-publisher-v1.0.0` | ✓ semver | `a446e9ab` | ✓ | **A** | MED — CFW website |

**Batch 2 totals:** A=4 (2 truly identical, 2 line-ending only), B=1, C=2, D=3.

### Cumulative across Batches 1+2 (21 EFs surveyed)

A=11 (52%), B=1 (5%), C=2 (10%), D=7 (33%).

### Already characterised in RECONCILE-EF-DRIFT (pre-sync state, historical record)

| ai-worker | 99 | ai-worker-v2.9.0 → v2.11.1 | banner-drift | _was B_ |
| heygen-worker | 22 | heygen-worker-v1.0.0 → v1.1.0 | banner-drift | _was B_ |
| video-worker | 36 | absent → v2.1.0 | missing | _was D_ |
| youtube-publisher | 38 | v1.6.0 ↔ v1.6.0 body-diff | trap | _was C_ |

---

## 6. Tier 3 — root-cause hypothesis matrix (post-Batch 2)

| Hypothesis | Likelihood | Evidence pattern |
|---|---|---|
| **Manual CLI `supabase functions deploy` without commit** | **HIGH-CONFIRMED** | Class B (`insights-worker` v1.6.0→v14.0.0 — repo is many versions behind deployed). RECONCILE-EF-DRIFT pattern (3/4 EFs were banner-drift cases). |
| **Windows CLI deploy without git autocrlf normalization** | **NEW EVIDENCE — HIGH** | `content_fetch` and `instagram-publisher` deployed sources have CRLF line endings; repo files have LF. Deploys were clearly made from a Windows environment without git's CRLF→LF normalization. Consistent with PK's local repo at `C:\Users\parve\Invegent-content-engine`. |
| **Source minification before deploy** | **NEW EVIDENCE — possible** | `image-worker` deployed source is single-line minified style; repo source is multi-line readable. Could indicate (a) intentional minification step in a deploy script, (b) someone hand-deployed a minified copy, or (c) dashboard-edit converted the formatting. Functionally equivalent to repo, so this is more of a stylistic / process issue than a functional drift. |
| **Supabase dashboard inline-edit** | **MEDIUM** | Suspected for `ingest` (Class D, banner uses feature-tag style). Suspected for `heygen-intro` and `heygen-youtube-upload` (both Class D, no VERSION constant — typical dashboard-quick-utility style). |
| **Uncommitted local working-tree edit** | **MEDIUM** | Indistinguishable from CLI-deploy without local-machine evidence (`git status`, reflog). |
| **Class C "polish drift" — repo cleanup never deployed** | **NEW EVIDENCE — confirmed** | `feed-intelligence` repo has dead code removed; deployed version still has it. Could mean someone refactored locally, committed to repo, but never re-deployed. Or someone polished after deploy. |
| **Parallel agent / chat window deploy** | LOW-MEDIUM | No direct evidence yet. Memory references "ChatGPT-reviewed in 4 rounds" on multiple banners — that workflow is chat-driven and could deploy without committing. |
| **GitHub Actions / CI absent or bypassed** | **CONFIRMED** | The repo has no `.github/workflows/` EF-deploy pipeline. All deploys are necessarily manual. This is the upstream enabler for hypotheses 1–6. |

The top-level finding remains: **drift is the default state**. Without a CI deploy pipeline, drift accumulates whenever a deploy happens without a corresponding `git commit && git push`. Batch 2 added two new flavours of drift to the catalogue:

- **CRLF/LF line-ending drift** (cosmetic but breaks byte-comparison) — at least 2/13 sampled repo files affected
- **Class B major version drift** (`insights-worker` ~12 minor versions) — repo abandoned by deploy cycle for an extended period

---

## 7. Banner reliability — running (post-Batch 2, 21/46 EFs surveyed)

**Banner conformance:**
- 17/21 deployed banners follow the `<slug>-vX.Y.Z` semver convention
- 2/21 use feature-tag style with non-numeric version field:
  - `ingest-v8-youtube-channel` (Batch 1) — slug-prefix correct, version is `v8-youtube-channel`
  - `content-fetch-v2.4-rpc` (Batch 2) — slug-prefix correct, version is `v2.4-rpc`
- 2/21 have **no `VERSION` constant at all** — banner is a comment-only line, deploy version cannot be programmatically extracted from inside the file:
  - `heygen-intro` — `// heygen-intro v2 — fixed talking_photo_style`
  - `heygen-youtube-upload` — `// heygen-youtube-upload — one-shot: ...`

**Body-vs-banner relationship:**
- 11/21 (52%) Class A — banner matches deploy slug, body matches repo
  - 9 truly byte-identical
  - 2 line-ending-only-different (CRLF vs LF)
- 1/21 (5%) Class B — banner numerically different between deployed and repo (insights-worker v14.0.0 vs v1.6.0). Banner check would catch this.
- 2/21 (10%) Class C — banner identical between deployed and repo, body different. **Banner check FAILS for Class C.**
- 7/21 (33%) Class D — no repo file to compare.

**Locked recommendations (firm enough to commit before Batch 5):**
- **Banner-only check is INSUFFICIENT for full drift detection** — it cannot detect Class C cases like `image-worker` and `feed-intelligence`, both of which are operationally important.
- **Banner-only check is also UNRELIABLE** because ~19% of EFs don't follow the convention. A check that hard-requires `<slug>-vX.Y.Z` would falsely flag `ingest`, `content_fetch`, `heygen-intro`, and `heygen-youtube-upload` as malformed when they are merely non-conforming.
- **Production prevention mechanism must body-compare** (not banner-compare) on a periodic basis.
- **Body-comparison should normalize line endings** before computing equality. Otherwise CRLF/LF mismatches will create constant false-positive drift signals.
- **The semver convention is opt-in not contractual.** Recommendation will treat banner content as advisory and a useful triage filter, but never as the sole evidence of parity.

---

## 8. Prevention options — preliminary (post-Batch 2)

_Lock to come after Batch 5. Current ranking based on 21/46 evidence:_

**Option A — Drift-check script invoked manually before each session.**
Friction: low (1 command). Coverage: high (46 EFs). Latency: zero. Cost: developer discipline only.
Scoring: friction-low, coverage-high, latency-instant, false-positive-rate-low (after CRLF/LF normalization).

**Option B — Daily pg_cron job calling a drift-check Edge Function that writes findings to a `m.ef_drift_log` table.**
Friction: very low (passive). Coverage: high. Latency: ≤24h. Cost: minor — one new EF, one new table, one cron entry. Surfaces in dashboard automatically.
Scoring: friction-very-low, coverage-high, latency-24h, false-positive-rate-low.
**Pre-locked recommendation candidate.**

**Option C — Wrapper script over `supabase functions deploy` that refuses to deploy unless local repo is clean and committed.**
Friction: medium (changes deploy workflow). Coverage: prevents new drift only — doesn't detect existing drift. Cost: small wrapper script.
Scoring: friction-medium, coverage-prevention-only, latency-deploy-time, false-positive-rate-low.

**Option D — Deploy-only-from-CI policy: GitHub Action triggers `supabase functions deploy` on push to `main`. Manual CLI deploys forbidden.**
Friction: high (changes deploy mental model entirely). Coverage: very high if enforced. Cost: GitHub Action + secret + discipline. Risk: breaks PK's ability to do urgent hot-fixes if CI is slow or down.
Scoring: friction-high, coverage-prevention-very-high, latency-CI-time, false-positive-rate-low.

**Option E — Combination: B + C (minor variant — non-blocking warning rather than refuse).**
Friction: low-medium. Coverage: high (B detects + C warns). Cost: minor.
Scoring: friction-low-medium, coverage-prevention+detection, latency-deploy+24h, false-positive-rate-low.
**Likely final recommendation candidate** — gives PK the safety net of B without removing the speed of CLI deploys for urgent fixes.

---

## 9. Tasks

- [x] Brief created with scope locked.
- [x] Tier 1: complete repo-presence check for all 46 deploy slugs.
- [x] Count discrepancy reconciled (46 not 47).
- [x] **Batch 1 complete** (11 EFs): ingest, publisher, youtube-publisher, linkedin-zapier-publisher, ai-worker, video-worker, heygen-worker, auto-approver, compliance-monitor, pipeline-doctor, pipeline-ai-summary.
- [x] **Batch 2 complete** (10 EFs): content_fetch, image-worker, insights-worker, feed-intelligence, pipeline-fixer, video-analyser, heygen-intro, heygen-youtube-upload, instagram-publisher, wordpress-publisher.
- [ ] Batch 3 (~10 EFs): MCP bridges (chatgpt-review-worker, mcp-chatgpt-bridge, mcp-github-bridge), observability (pipeline-sentinel, pipeline-diagnostician, pipeline-healer, weekly-manager-report, client-weekly-summary, insights-feedback), inspector tools (inspector, inspector_sql_ro).
- [ ] Batch 4 (~10 EFs): onboarding (onboarding-notifier, brand-scanner, ai-profile-bootstrap, heygen-avatar-creator, heygen-avatar-poller), drafts (series-outline, series-writer, draft-notifier, email-ingest), feed support (feed-discovery, compliance-reviewer).
- [ ] Batch 5 (~5 EFs): final tail (external-reviewer, external-reviewer-digest, system-auditor) plus reverse-drift checks on `ai-diagnostic` and `linkedin-publisher`.
- [ ] Tier 3: lock root-cause hypothesis matrix with all-46 data.
- [ ] Section 7: lock banner-reliability assessment with all-46 data.
- [ ] Section 8: rank prevention options on (friction, coverage, latency, FP-rate).
- [ ] Section 8: lock recommendation and present for PK approval.

No EF patching, no deploys, no NY×YT or M6 work until this brief is closed and PK has approved a recommendation.

---

## 10. Decisions

**D-PREV-01 (2026-05-05) — Inventory pacing: chunked batches of ~10 EFs.**
Rationale: full 46-EF inventory in one session would consume excessive context and prevent mid-investigation course correction. Batches let PK redirect after each report.

**D-PREV-02 (2026-05-05) — Class C is the highest-priority case to surface.**
Banner-only checks miss Class C; the `youtube-publisher` case demonstrated this. Batch 2 confirmed the pattern with `image-worker` (HIGH operational importance) and `feed-intelligence` (MED).

**D-PREV-03 (2026-05-05) — `ingest` banner non-conformance is a finding, not a defect.**
The feature-tag banner style cannot be programmatically compared to a deploy version number, but it is informative for the operator. Recommendation will treat semver banners as advisory only; drift detection must rely on body-comparison.

**D-PREV-04 (2026-05-05, post-Batch 2) — CRLF/LF line-ending differences are NOT classified as drift.**
At least 2/13 repo-comparable EFs (content_fetch, instagram-publisher) differ from deployed by CRLF vs LF only. Drift detection script must normalize line endings before comparison; otherwise nearly every Windows-deployed EF will produce a false-positive.

**D-PREV-05 (2026-05-05, post-Batch 2) — `image-worker` minification is NOT classified as drift requiring sync.**
Deployed and repo are functionally equivalent; the difference is whitespace/formatting. Sync would replace minified deployed source with formatted repo source, which is harmless but unnecessary. Brief recommendation: leave as-is, prioritise other Class B/C cases. Optional follow-up: investigate whether minification is from a deploy script or a one-time edit.

**D-PREV-06 (2026-05-05, post-Batch 2) — `heygen-intro` and `heygen-youtube-upload` Class D treatment.**
Both are utility/test EFs with no `VERSION` constant. Recommendation:
- include in drift-detection coverage (they're deployed and could change unnoticed)
- exempt from any banner-format requirement (the convention isn't a contract)
- consider archiving or formalising in the repo as part of a separate cleanup task (not part of this brief)

**D-PREV-07 (2026-05-05, post-Batch 2) — `insights-worker` Class B drift will NOT be auto-synced.**
The repo (v1.6.0) is many versions behind deployed (v14.0.0). Sync would mean overwriting the repo with deployed source. PK should review the deployed source for correctness before accepting it as canonical. Logged as a follow-up sync candidate (Class B FOLLOW-UP — not auto-resolved like the original 4 sync targets). Will be flagged in the final recommendation as one of the post-investigation manual-review items.

---

_End of brief. Batch 3 next; checkpoint will report after that batch._
