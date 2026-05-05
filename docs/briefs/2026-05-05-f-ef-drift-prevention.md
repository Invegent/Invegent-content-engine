# F-EF-DRIFT-PREVENTION — Edge Function Source Drift Prevention

**Date:** 2026-05-05 (evening, post-v2.39 + sync commit `7ba441e2`)
**Status:** ACTIVE — P1 inspection (no patch, no deploy)
**Parent:** RECONCILE-EF-DRIFT (CLOSED by commit `7ba441e2aba18cd848c67a6283e6376a8846f91a`)
**Project:** mbkmaxqhsohbtwsqolns
**Repo:** Invegent/Invegent-content-engine
**Total deployed EFs:** **46** (per `Supabase:list_edge_functions`, 2026-05-05 ~22:00 UTC)
**Tier 2 progress:** 31/46 surveyed (67%) — Batches 1+2+3 complete

---

## 1. Why this brief exists

On 2026-05-05 evening the v2.39 carry-forward identified that 4 deployed Edge Functions were either ahead of or absent from the GitHub source repo. RECONCILE-EF-DRIFT applied a sync-only commit to bring those 4 to byte-parity with deployed source. That sync closed the symptom but not the cause.

Three things that the sync revealed make a prevention investigation P1:

1. **Drift went undetected for at least 5 days.** The deployed `youtube-publisher` source had been edited multiple times (v1.5.0 → v1.6.0 deployed 1 May, 4 days before discovery) without a corresponding repo commit. There is no automated alert when deployed EF source diverges from `main`.
2. **One drift case had matching banners but different bodies.** `youtube-publisher` repo and deployed both reported `v1.6.0` in the VERSION constant — but the bodies differed by one comment line. Banner-equality alone is not sufficient evidence of source-equality. This is the trap case: a developer or audit checking only `VERSION === VERSION` would report parity when there is none.
3. **Three of four affected EFs had stale repo source for at least one full deployed version cycle.** `ai-worker` was 3 minor versions behind. `heygen-worker` was 1 version behind. `video-worker` was missing from the repo entirely.

Batch 1 of Tier 2 added a fourth driver: **`ingest` is pipeline-core, on deploy version 117, and has never landed in the repo at all**.

Batch 2 added the most consequential evidence yet:

- **`insights-worker` is on deploy version v14.0.0 in production but the repo is still on v1.6.0.** Substantial functional drift.
- **`image-worker` and `feed-intelligence` are both Class C (banner-match-body-diff)** — exactly the trap case.

Batch 3 changed the picture again, but in the opposite direction:

- **All 10 EFs in Batch 3 came back Class A.** This is a relief and a useful counterweight: drift is real and consequential, but it is not universal. Critical infrastructure that has been built recently and deployed carefully (MCP bridges, pipeline observability/healing trio, inspector tooling, weekly reports) is in clean sync.
- **MCP bridges and the ChatGPT review worker are clean.** PK specifically flagged these as high-priority because they affect review/repo tooling. They're fine.
- **Inspector and inspector_sql_ro are clean.** PK flagged these because they affect read-only observability. They're fine.
- **Pipeline-sentinel + pipeline-diagnostician + pipeline-healer are clean.** PK flagged these because they're autonomous operational tools. All three byte-identical with the repo.

The investigation is now closing in on a clear prevention recommendation: **body-comparison must run periodically; banner-only checks are insufficient.** That conclusion is firm enough to lock for Section 8 even before the remaining ~15 EFs are surveyed. Batch 3's clean-sweep result also clarifies the prevention design tradeoff: the system isn't broken everywhere — it's broken at specific seams (older or hand-deployed EFs without a strong commit-deploy discipline).

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
3. **Identify whether version banners inside EFs are reliable.** Cases to test: (a) banner present and matches deploy slug; (b) banner present but stale relative to deployed body; (c) banner absent; (d) banner matches both repo and deployed but bodies differ (the `youtube-publisher` trap case); (e) banner present and slug-prefix correct, but version field is a feature tag rather than a semver number; (f) banner is in a comment with no `VERSION` constant at all (heygen utility class); **(g) banner uses MCP-style `SERVER_INFO.version` constant rather than top-level `VERSION` constant.**
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
**Tier 2 — Body-level comparison (in batches of ~10)** — IN PROGRESS (31/46 surveyed).
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

## 4. Tier 1 baseline — deployed inventory (post-Batch 3)

Captured from `Supabase:list_edge_functions` 2026-05-05 ~22:00 UTC. **46 EFs**, all `ACTIVE` status. Repo-presence column resolved through the sync work + Tier 2 batches.

| # | Slug | Deploy version | Repo dir? | Class (post-Batch 3) |
|---|---|---|---|---|
| 1 | inspector | 104 | ✓ | **A line-ending** (Batch 3) |
| 2 | ingest | 117 | ✗ | **D** (Batch 1) |
| 3 | content_fetch | 89 | ✓ | **A line-ending** (Batch 2) |
| 4 | ai-worker | 99 | ✓ | A (synced) |
| 5 | publisher | 82 | ✓ | A (Batch 1) |
| 6 | inspector_sql_ro | 59 | ✓ | **A line-ending** (Batch 3) |
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
| 31 | weekly-manager-report | 25 | ✓ | **A** (Batch 3) |
| 32 | pipeline-sentinel | 22 | ✓ | **A** (Batch 3) |
| 33 | pipeline-diagnostician | 22 | ✓ | **A** (Batch 3) |
| 34 | pipeline-healer | 22 | ✓ | **A** (Batch 3) |
| 35 | client-weekly-summary | 22 | ✓ | **A** (Batch 3) |
| 36 | insights-feedback | 22 | ✓ | TBD |
| 37 | instagram-publisher | 24 | ✓ | **A line-ending** (Batch 2) |
| 38 | linkedin-zapier-publisher | 24 | ✓ | A (Batch 1) |
| 39 | wordpress-publisher | 21 | ✓ | **A** (Batch 2) |
| 40 | feed-discovery | 22 | ✓ | TBD |
| 41 | external-reviewer | 13 | ✓ | TBD |
| 42 | external-reviewer-digest | 11 | ✓ | TBD |
| 43 | system-auditor | 11 | ✓ | TBD |
| 44 | chatgpt-review-worker | 5 | ✓ | **A line-ending** (Batch 3) |
| 45 | mcp-chatgpt-bridge | 8 | ✓ | **A line-ending** (Batch 3) |
| 46 | mcp-github-bridge | 4 | ✓ | **A** (Batch 3) |

Repo-only directories (reverse-drift candidates): `ai-diagnostic` and `linkedin-publisher`.

**Cumulative class distribution across 31 surveyed EFs (Batches 1+2+3):** A=21 (68%), B=1 (3%), C=2 (6%), D=7 (23%).

---

## 5. Tier 2 — per-EF drift inventory (Batches 1+2+3 complete)

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
| 1 | content_fetch | 89 | `content-fetch-v2.4-rpc` | ✗ feature-tag | `606e75f6` | LF/CRLF only | **A line-ending** | HIGH — pipeline core |
| 2 | **image-worker** | 59 | `image-worker-v3.9.2` | ✓ semver | `37e0804f` | **NO — minified vs formatted** | **C** | HIGH — image gen |
| 3 | **insights-worker** | 55 | deployed `v14.0.0` ≠ repo `v1.6.0` | ✓ semver | `d4bfcd09` | **NO — substantial functional drift** | **B** | HIGH — perf cron |
| 4 | **feed-intelligence** | 42 | `feed-intelligence-v1.0.0` | ✓ semver | `b76c12b7` | **NO — dead-code diff** | **C** | MED — feed cron |
| 5 | pipeline-fixer | 26 | `pipeline-fixer-v1.1.0` | ✓ semver | `afa61b59` | ✓ | **A** | MED — fixer cron |
| 6 | **video-analyser** | 25 | `video-analyser-v1.2.0` | ✓ semver | _none_ | n/a | **D** | LOW — YT video analysis |
| 7 | **heygen-intro** | 22 | `// heygen-intro v2 — fixed talking_photo_style` | **✗ no VERSION** | _none_ | n/a | **D** | LOW — utility |
| 8 | **heygen-youtube-upload** | 21 | `// heygen-youtube-upload — one-shot` | **✗ no VERSION** | _none_ | n/a | **D** | LOW — utility |
| 9 | instagram-publisher | 24 | `instagram-publisher-v2.0.0` | ✓ semver | `a2712068` | LF/CRLF only | **A line-ending** | HIGH — IG (paused) |
| 10 | wordpress-publisher | 21 | `wordpress-publisher-v1.0.0` | ✓ semver | `a446e9ab` | ✓ | **A** | MED — CFW website |

**Batch 2 totals:** A=4, B=1, C=2, D=3.

### Batch 3 (2026-05-05)

| # | Slug | Deploy ver | Banner | Banner conv | Repo SHA | Body match | Class | Op importance |
|---|---|---|---|---|---|---|---|---|
| 1 | inspector | 104 | (Hono multi-endpoint) | **✗ no VERSION constant** | `886e17d0` | LF/CRLF only | **A line-ending** | HIGH — observability primary |
| 2 | inspector_sql_ro | 59 | `inspector-sql-ro-v1` | ✗ slug-prefix correct, version `v1` not semver | `93ddfd31` | LF/CRLF only | **A line-ending** | MED — RO-SQL tool |
| 3 | chatgpt-review-worker | 5 | comment-only (refs `docs/briefs/chatgpt-review-mcp-v1.md`) | **✗ no machine-readable VERSION** | `85cb70a9` | LF/CRLF only | **A line-ending** | HIGH — D-01 critical path |
| 4 | mcp-chatgpt-bridge | 8 | comment `v1.2.2` + `SERVER_INFO.version='1.2.2'` | ✗ MCP SERVER_INFO pattern (no top-level `VERSION`) | `6044b6bf` | LF/CRLF only | **A line-ending** | HIGH — D-01 critical path |
| 5 | mcp-github-bridge | 4 | comment `v2.0.0` + `SERVER_INFO.version='2.0.0'` | ✗ MCP SERVER_INFO pattern (no top-level `VERSION`) | `4435ab48` | byte-identical (LF) | **A** | HIGH — repo read |
| 6 | pipeline-sentinel | 22 | `pipeline-sentinel-v1.0.0` | ✓ semver | `f66b4ec0` | byte-identical (LF) | **A** | HIGH — incident detection |
| 7 | pipeline-diagnostician | 22 | `pipeline-diagnostician-v1.0.0` | ✓ semver | `a175498c` | byte-identical (LF) | **A** | HIGH — Claude diagnosis |
| 8 | pipeline-healer | 22 | `pipeline-healer-v1.0.0` | ✓ semver | `3ef423ab` | byte-identical (LF) | **A** | HIGH — auto-heal |
| 9 | weekly-manager-report | 25 | `weekly-manager-report-v2.0.0` | ✓ semver | `df5761ba` | byte-identical (LF) | **A** | MED — weekly email |
| 10 | client-weekly-summary | 22 | `client-weekly-summary-v1.0.0` | ✓ semver | `9557c572` | byte-identical (LF) | **A** | MED — per-client weekly |

**Batch 3 totals:** A=10, B=0, C=0, D=0. Cleanest batch so far.

### Cumulative across Batches 1+2+3 (31 EFs surveyed)

A=21 (68%), B=1 (3%), C=2 (6%), D=7 (23%).

### Already characterised in RECONCILE-EF-DRIFT (pre-sync state, historical record)

| ai-worker | 99 | ai-worker-v2.9.0 → v2.11.1 | banner-drift | _was B_ |
| heygen-worker | 22 | heygen-worker-v1.0.0 → v1.1.0 | banner-drift | _was B_ |
| video-worker | 36 | absent → v2.1.0 | missing | _was D_ |
| youtube-publisher | 38 | v1.6.0 ↔ v1.6.0 body-diff | trap | _was C_ |

---

## 6. Tier 3 — root-cause hypothesis matrix (post-Batch 3)

| Hypothesis | Likelihood | Evidence pattern |
|---|---|---|
| **Manual CLI `supabase functions deploy` without commit** | **HIGH-CONFIRMED** | Class B (`insights-worker` v1.6.0→v14.0.0). RECONCILE-EF-DRIFT pattern (3/4 EFs were banner-drift). |
| **Windows CLI deploy without git autocrlf normalization** | **HIGH-CONFIRMED** | content_fetch + instagram-publisher (Batch 2) and inspector + inspector_sql_ro + chatgpt-review-worker + mcp-chatgpt-bridge (Batch 3) all have CRLF deployed / LF repo. 6/24 (25%) of repo-comparable EFs across surveyed batches show this pattern. Consistent with PK's local repo at `C:\Users\parve\Invegent-content-engine`. |
| **Source minification before deploy** | possible (single case) | `image-worker` only. Could indicate (a) intentional minification, (b) hand-deployed minified copy, (c) dashboard-edit converting formatting. Functionally equivalent to repo. |
| **Supabase dashboard inline-edit** | **MEDIUM** | Suspected for `ingest` (Class D, feature-tag banner). Suspected for `heygen-intro` and `heygen-youtube-upload` (Class D, no VERSION constant, utility-style). |
| **Uncommitted local working-tree edit** | **MEDIUM** | Indistinguishable from CLI-deploy without local-machine evidence. |
| **Class C "polish drift" — repo cleanup never deployed** | **CONFIRMED** | `feed-intelligence` repo has dead code removed; deployed version still has it. |
| **Parallel agent / chat window deploy** | LOW-MEDIUM | No direct evidence. Memory references "ChatGPT-reviewed in 4 rounds" for some banners. |
| **GitHub Actions / CI absent or bypassed** | **CONFIRMED** | The repo has no `.github/workflows/` EF-deploy pipeline. All deploys are manual. |
| **Recent / careful deploys are clean** | **NEW EVIDENCE — strong** | 10/10 of Batch 3 are Class A. Critical infra (MCP bridges, pipeline observability/healer trio, inspector pair, weekly reports) all in sync. The drift problem is concentrated in (a) older operational EFs created via dashboard like `ingest` and the heygen utilities, (b) cron-driven Class D EFs that never landed in the repo (`compliance-monitor`, `pipeline-doctor`, `pipeline-ai-summary`), and (c) hand-edited Class B/C cases (`insights-worker`, `image-worker`, `feed-intelligence`). The system is *not* uniformly broken. |
| **Deploy machine determines line-ending** | **NEW EVIDENCE — likely** | Mix of CRLF-deployed and LF-deployed EFs across batches. Batch 3 had 4 CRLF-deployed (inspector/inspector_sql_ro/chatgpt-review-worker/mcp-chatgpt-bridge) and 6 LF-deployed. Pattern is consistent with multiple deploy machines or path differences. Drift detection script must normalize line endings regardless. |

The top-level finding remains: **drift is the default state without a CI deploy pipeline**. Batch 3 shows that the *consequence* of this default depends on deploy discipline. Where PK has worked carefully (recent MCP build-out, observability tooling), drift is zero. Where PK has hand-edited, used the dashboard, or shipped utilities, drift accumulates.

---

## 7. Banner reliability — running (post-Batch 3, 31/46 EFs surveyed)

**Banner conformance:**
- 22/31 deployed banners follow the `<slug>-vX.Y.Z` semver convention
- 2/31 use feature-tag style with non-numeric semver field:
  - `ingest-v8-youtube-channel` (Batch 1)
  - `content-fetch-v2.4-rpc` (Batch 2)
- 1/31 uses `<slug>-vN` style (single-digit major version, not full semver):
  - `inspector-sql-ro-v1` (Batch 3)
- 4/31 have **no `VERSION` constant at all** — banner is a comment-only line:
  - `heygen-intro` (Batch 2)
  - `heygen-youtube-upload` (Batch 2)
  - `inspector` (Batch 3) — Hono multi-endpoint pattern
  - `chatgpt-review-worker` (Batch 3) — comment refs spec brief, no version constant
- 2/31 use **MCP `SERVER_INFO.version` pattern** instead of top-level `VERSION`:
  - `mcp-chatgpt-bridge` (Batch 3) — `SERVER_INFO = { name: 'mcp-chatgpt-bridge', version: '1.2.2' }`
  - `mcp-github-bridge` (Batch 3) — `SERVER_INFO = { name: 'mcp-github-bridge', version: '2.0.0' }`

That is **9/31 (29%) non-conforming** to the simple `VERSION = "<slug>-vX.Y.Z"` pattern. Of the 9, 2 follow a defensible alternative (MCP SERVER_INFO).

**Body-vs-banner relationship:**
- 21/31 (68%) Class A — banner matches deploy slug, body matches repo
  - 15 truly byte-identical
  - 6 line-ending-only-different (CRLF vs LF)
- 1/31 (3%) Class B — banner numerically different between deployed and repo (insights-worker v14.0.0 vs v1.6.0). Banner check would catch this.
- 2/31 (6%) Class C — banner identical between deployed and repo, body different. **Banner check FAILS for Class C.**
- 7/31 (23%) Class D — no repo file to compare.

**Locked recommendations (firm, won't change with remaining 15 EFs):**
- **Banner-only check is INSUFFICIENT for full drift detection** — it cannot detect Class C cases (`image-worker`, `feed-intelligence`).
- **Banner-only check is also UNRELIABLE** because ~29% of EFs don't follow the simple top-level `VERSION` convention. A check that hard-requires `<slug>-vX.Y.Z` would falsely flag `ingest`, `content_fetch`, `inspector_sql_ro`, `heygen-intro`, `heygen-youtube-upload`, `inspector`, `chatgpt-review-worker`, `mcp-chatgpt-bridge`, `mcp-github-bridge` as malformed when they are merely non-conforming.
- **Production prevention mechanism must body-compare** (not banner-compare) on a periodic basis.
- **Body-comparison should normalize line endings** before computing equality. Otherwise CRLF/LF mismatches will create constant false-positive drift signals.
- **The semver convention is opt-in not contractual.** Recommendation will treat banner content as advisory and a useful triage filter, but never as the sole evidence of parity.
- **MCP SERVER_INFO pattern is a legitimate alternative**, not drift. Drift detection will recognise both patterns; reporting will surface non-conforming EFs as informational, not as drift.

---

## 8. Prevention options — preliminary (post-Batch 3)

_Lock to come after Batch 5. Current ranking based on 31/46 evidence:_

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
**Likely final recommendation candidate.**

---

## 9. Tasks

- [x] Brief created with scope locked.
- [x] Tier 1: complete repo-presence check for all 46 deploy slugs.
- [x] Count discrepancy reconciled (46 not 47).
- [x] **Batch 1 complete** (11 EFs).
- [x] **Batch 2 complete** (10 EFs).
- [x] **Batch 3 complete** (10 EFs): inspector, inspector_sql_ro, chatgpt-review-worker, mcp-chatgpt-bridge, mcp-github-bridge, pipeline-sentinel, pipeline-diagnostician, pipeline-healer, weekly-manager-report, client-weekly-summary.
- [ ] Batch 4 (~10 EFs): onboarding (onboarding-notifier, brand-scanner, ai-profile-bootstrap, heygen-avatar-creator, heygen-avatar-poller), drafts (series-outline, series-writer, draft-notifier, email-ingest), feed support (feed-discovery, compliance-reviewer).
- [ ] Batch 5 (~5 EFs): final tail (external-reviewer, external-reviewer-digest, system-auditor, insights-feedback) plus reverse-drift checks on `ai-diagnostic` and `linkedin-publisher`.
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
Banner-only checks miss Class C; the `youtube-publisher` case demonstrated this. Batch 2 confirmed twice (`image-worker`, `feed-intelligence`).

**D-PREV-03 (2026-05-05) — `ingest` banner non-conformance is a finding, not a defect.**
The feature-tag banner style cannot be programmatically compared to a deploy version number, but it is informative for the operator. Recommendation will treat semver banners as advisory only; drift detection must rely on body-comparison.

**D-PREV-04 (2026-05-05, post-Batch 2) — CRLF/LF line-ending differences are NOT classified as drift.**
At least 6/24 repo-comparable EFs across surveyed batches differ from deployed by CRLF vs LF only. Drift detection script must normalize line endings before comparison; otherwise nearly every Windows-deployed EF will produce a false-positive.

**D-PREV-05 (2026-05-05, post-Batch 2) — `image-worker` minification is NOT classified as drift requiring sync.**
Deployed and repo are functionally equivalent; the difference is whitespace/formatting. Sync would replace minified deployed source with formatted repo source, which is harmless but unnecessary.

**D-PREV-06 (2026-05-05, post-Batch 2) — `heygen-intro` and `heygen-youtube-upload` Class D treatment.**
Both are utility/test EFs with no `VERSION` constant. Drift detection will include them; banner-format requirement does not apply.

**D-PREV-07 (2026-05-05, post-Batch 2) — `insights-worker` Class B drift will NOT be auto-synced.**
The repo (v1.6.0) is many versions behind deployed (v14.0.0). Sync would mean overwriting the repo with deployed source. PK should review the deployed source for correctness before accepting it as canonical. Logged as a follow-up sync candidate.

**D-PREV-08 (2026-05-05, post-Batch 3) — MCP `SERVER_INFO.version` is a legitimate alternative banner pattern.**
Both `mcp-chatgpt-bridge` and `mcp-github-bridge` follow this pattern because the MCP protocol's `initialize` response requires a `serverInfo` dictionary that includes a `version` field. Hard-coding this dictionary is the natural way to keep the protocol in sync with the deploy version. Drift detection should:
- recognise the `SERVER_INFO = { ..., version: 'X.Y.Z' }` pattern as a valid version source
- compare the version field across deployed and repo for these EFs
- not flag absence of top-level `VERSION` constant as a drift signal when SERVER_INFO is present

**D-PREV-09 (2026-05-05, post-Batch 3) — `chatgpt-review-worker` and `inspector` lack any machine-readable version field.**
`chatgpt-review-worker` only has a comment banner referencing `docs/briefs/chatgpt-review-mcp-v1.md (v1.1)`. `inspector` has no banner or version constant at all (its identity is only the deploy slug + Hono route prefix). For drift detection these EFs must rely entirely on body-hash comparison; no version-field signal is available. This is acceptable but worth noting in the prevention recommendation as a caveat: the drift report cannot say "deployed v1.5.2, repo v1.4.0" for these two — only "drift / no-drift" based on body bytes.

**D-PREV-10 (2026-05-05, post-Batch 3) — Drift is concentrated, not uniform.**
Batch 3's clean sweep (10/10 Class A) confirms that drift accumulates at specific seams: (a) older operational EFs created via dashboard, (b) cron-driven EFs that never made it into the repo, (c) hand-edited Class B/C cases. Recently built and carefully deployed infrastructure (MCP, observability trio, inspector pair, weekly reports) is in clean sync. The prevention recommendation should therefore prioritise *detection of existing drift* (so PK can manually triage the 7 Class D cases plus the 1 B / 2 C) over *prevention of new drift in well-managed code* (which is already happening naturally). Option B (passive daily cron + drift log) addresses the detection priority; Option C (deploy-time non-blocking warning) is the marginal addition for new-drift prevention.

---

_End of brief. Batch 4 next; checkpoint will report after that batch._
