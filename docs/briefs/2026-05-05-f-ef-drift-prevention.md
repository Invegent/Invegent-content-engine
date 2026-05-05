# F-EF-DRIFT-PREVENTION — Edge Function Source Drift Prevention

**Date:** 2026-05-05 (evening, post-v2.39 + sync commit `7ba441e2`)
**Status:** ACTIVE — P1 inspection (no patch, no deploy)
**Parent:** RECONCILE-EF-DRIFT (CLOSED by commit `7ba441e2aba18cd848c67a6283e6376a8846f91a`)
**Project:** mbkmaxqhsohbtwsqolns
**Repo:** Invegent/Invegent-content-engine
**Total deployed EFs:** **46** (per `Supabase:list_edge_functions`, 2026-05-05 ~22:00 UTC; corrected from initial miscount of 47)

---

## 1. Why this brief exists

On 2026-05-05 evening the v2.39 carry-forward identified that 4 deployed Edge Functions were either ahead of or absent from the GitHub source repo. RECONCILE-EF-DRIFT applied a sync-only commit to bring those 4 to byte-parity with deployed source. That sync closed the symptom but not the cause.

Three things that the sync revealed make a prevention investigation P1:

1. **Drift went undetected for at least 5 days.** The deployed `youtube-publisher` source had been edited multiple times (v1.5.0 → v1.6.0 deployed 1 May, 4 days before discovery) without a corresponding repo commit. There is no automated alert when deployed EF source diverges from `main`.
2. **One drift case had matching banners but different bodies.** `youtube-publisher` repo and deployed both reported `v1.6.0` in the VERSION constant — but the bodies differed by one comment line. Banner-equality alone is not sufficient evidence of source-equality. This is the trap case: a developer or audit checking only `VERSION === VERSION` would report parity when there is none.
3. **Three of four affected EFs had stale repo source for at least one full deployed version cycle.** `ai-worker` was 3 minor versions behind. `heygen-worker` was 1 version behind. `video-worker` was missing from the repo entirely. None of these would have been detected by routine GitHub browsing because the directories existed (or the absence was not flagged) and casual reading suggests current state.

Batch 1 of Tier 2 (see Section 11) added a fourth driver: **`ingest` is pipeline-core, on deploy version 117, and has never landed in the repo at all**. Its banner does not even follow the slug-vSEMVER convention — it's `ingest-v8-youtube-channel`, a feature tag. Drift here is the worst of both worlds: the EF that runs first in the pipeline (cron-driven, hits every active feed source) has zero source representation in source control.

The cost of this drift is real: any developer (Claude-Code, PK, or future contributor) reading the repo and assuming it reflects production would propose changes against stale source, build a patch on stale assumptions, or introduce regressions. The sync mitigated this for 4 EFs. Of the remaining 42 deployed EFs, Batch 1 has so far found 4 more in Class D (3 not in repo at all). The investigation continues.

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
3. **Identify whether version banners inside EFs are reliable.** Cases to test: (a) banner present and matches deploy slug; (b) banner present but stale relative to deployed body; (c) banner absent; (d) banner matches both repo and deployed but bodies differ (the `youtube-publisher` trap case). **Batch 1 added a fifth case: (e) banner present and slug-prefix correct, but version field is a feature tag rather than a semver number — banner-vs-slug check passes nominally, but banner cannot be compared against the numeric deploy version.**
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

The investigation proceeds in three tiers, each producing evidence the next builds on. Tier 1 is cheap (read-only API calls). Tier 2 is the bulk of the work (46 EF body fetches). Tier 3 is the analysis layer.

**Tier 1 — Inventory map (cheap reads)**
- `Supabase:list_edge_functions` → all 46 deploy slugs + numeric versions + `ezbr_sha256` (already captured for this brief, see Section 4 baseline table).
- `Invegent GitHub:list_directory supabase/functions` → all repo directories (already captured: 41 directories post-sync, including newly-synced `video-worker/`).
- For each deployed slug, compute repo-side presence: directory exists / does not exist.

**Tier 2 — Body-level comparison (in batches of ~10)**
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

Captured from `Supabase:list_edge_functions` 2026-05-05 ~22:00 UTC. **46 EFs** (corrected from initial miscount of 47), all `ACTIVE` status. Sorted by `created_at`. Repo-presence column resolved through the sync work + Batch 1 reads — no remaining `_TBD_` rows.

| # | Slug | Deploy version | Repo dir? | Class (post-Batch 1) |
|---|---|---|---|---|
| 1 | inspector | 104 | ✓ | TBD |
| 2 | ingest | 117 | ✗ | **D** (Batch 1) |
| 3 | content_fetch | 89 | ✓ | TBD |
| 4 | ai-worker | 99 | ✓ | A (synced) |
| 5 | publisher | 82 | ✓ | A (Batch 1) |
| 6 | inspector_sql_ro | 59 | ✓ | TBD |
| 7 | auto-approver | 57 | ✓ | A (Batch 1) |
| 8 | insights-worker | 55 | ✓ | TBD |
| 9 | feed-intelligence | 42 | ✓ | TBD |
| 10 | email-ingest | 37 | ✓ | TBD |
| 11 | draft-notifier | 38 | ✓ | TBD |
| 12 | image-worker | 59 | ✓ | TBD |
| 13 | series-outline | 37 | ✓ | TBD |
| 14 | series-writer | 38 | ✓ | TBD |
| 15 | pipeline-doctor | 35 | ✗ | **D** (Batch 1) |
| 16 | pipeline-ai-summary | 36 | ✗ | **D** (Batch 1) |
| 17 | compliance-monitor | 36 | ✗ | **D** (Batch 1) |
| 18 | video-worker | 36 | ✓ | A (synced) |
| 19 | youtube-publisher | 38 | ✓ | A (synced) |
| 20 | pipeline-fixer | 26 | ✓ | TBD |
| 21 | compliance-reviewer | 26 | ✓ | TBD |
| 22 | video-analyser | 25 | ✗ | TBD (likely D) |
| 23 | heygen-intro | 22 | ✗ | TBD (likely D) |
| 24 | heygen-youtube-upload | 21 | ✗ | TBD (likely D) |
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
| 37 | instagram-publisher | 24 | ✓ | TBD |
| 38 | linkedin-zapier-publisher | 24 | ✓ | A (Batch 1) |
| 39 | wordpress-publisher | 21 | ✓ | TBD |
| 40 | feed-discovery | 22 | ✓ | TBD |
| 41 | external-reviewer | 13 | ✓ | TBD |
| 42 | external-reviewer-digest | 11 | ✓ | TBD |
| 43 | system-auditor | 11 | ✓ | TBD |
| 44 | chatgpt-review-worker | 5 | ✓ | TBD |
| 45 | mcp-chatgpt-bridge | 8 | ✓ | TBD |
| 46 | mcp-github-bridge | 4 | ✓ | TBD |

Repo-only directories (reverse-drift candidates, NOT in the 46 deployed): **`ai-diagnostic`** and **`linkedin-publisher`**. Hypothesis: `linkedin-publisher` was renamed to `linkedin-zapier-publisher` on Supabase but the repo dir was not removed. `ai-diagnostic` is unverified — possibly never deployed.

---

## 5. Tier 2 — per-EF drift inventory (running)

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

**Batch 1 totals:** A=7, B=0, C=0, D=4. Class C (the trap case `youtube-publisher` was when first observed) was zero in Batch 1 — but Batch 1 is biased toward EFs we expected to be clean (the just-synced 4) plus ones we expected to be Class A or D based on prior knowledge. Future batches may surface Class C cases.

**Already characterised in RECONCILE-EF-DRIFT (pre-sync state, kept as historical record):**
| ai-worker | 99 | ai-worker-v2.9.0 → v2.11.1 | banner-drift | _was B_ |
| heygen-worker | 22 | heygen-worker-v1.0.0 → v1.1.0 | banner-drift | _was B_ |
| video-worker | 36 | absent → v2.1.0 | missing | _was D_ |
| youtube-publisher | 38 | v1.6.0 ↔ v1.6.0 body-diff | trap | _was C_ |

---

## 6. Tier 3 — root-cause hypothesis matrix (preliminary, post-Batch 1)

| Hypothesis | Likelihood (post-Batch 1) | Evidence pattern |
|---|---|---|
| Manual CLI `supabase functions deploy` without commit | HIGH | Class B (banner-drift) cases. Pattern: deployed banner has features the repo banner lacks. Confirmed for 3/4 RECONCILE-EF-DRIFT EFs. |
| Supabase dashboard inline-edit | MEDIUM-HIGH | Suspected for `ingest` (Class D, banner uses feature-tag style not semver — feature-tag style is more typical of dashboard edits than committed-from-CLI source). |
| Uncommitted local working-tree edit | MEDIUM | Indistinguishable from #1 without local-machine evidence (`git status`, reflog). |
| Parallel agent / chat window deploy | LOW-MEDIUM | No direct evidence yet. Memory references "ChatGPT-reviewed in 4 rounds" on multiple banners — that workflow is chat-driven and could deploy without committing. |
| GitHub Actions / CI absent or bypassed | **CONFIRMED** | The repo has no `.github/workflows/` EF-deploy pipeline. All deploys are necessarily manual. This is the upstream enabler for hypotheses 1–4. |

The top-level finding from Batch 1: **drift is the default state**, not the exception. Without a CI deploy pipeline, drift accumulates whenever a deploy happens without a corresponding `git commit && git push`. Class A status only holds when the operator manually maintains parity — and from RECONCILE-EF-DRIFT we know that fails routinely (4 EFs out of sync at the moment of discovery, ranging from 1 minor version to "entire EF missing").

---

## 7. Banner reliability — running (post-Batch 1, 11/46 EFs surveyed)

- **10/11 deployed banners follow the `<slug>-vX.Y.Z` semver convention.** Banner-vs-slug-prefix check is reliable for 10/11 sampled.
- **1/11 deployed banner uses a feature-tag style** (`ingest-v8-youtube-channel`). Slug prefix is correct but the version field is not numeric. A drift detector that expects semver in the banner would either misclassify this as malformed or skip the version comparison.
- **7/11 repo banners match deployed banners exactly.** All 7 are Class A.
- **4/11 EFs are Class D** (no repo file at all → no banner to compare).
- **0/11 are Class C** (banner-match-body-diff trap) — but the batch was selected to be high-confidence cases, so this is not yet a representative sample.
- **0/11 missing-banner cases** observed.

Implications already firm enough to lock for Section 8:
- **Banner check is useful as a fast first-pass triage** (does the deployed banner exist + does its slug-prefix match the deploy slug). It catches Class B drift cheaply.
- **Banner check is INSUFFICIENT for full drift detection.** It misses Class C entirely, and it can't be trusted for Class D (the EF isn't even in the repo to read a banner from).
- **Any production prevention mechanism must body-compare on a periodic basis**, not just banner-compare.
- **The semver convention is not enforced.** `ingest` proves the convention is opt-in not contractual. Recommendation will need to either (a) propose a banner contract, or (b) treat banner content as advisory only.

---

## 8. Prevention options — preliminary

_To be ranked after Tier 2 + Tier 3 complete. Initial sketch:_

**Option A — Drift-check script invoked manually before each session.**
Friction: low (1 command). Coverage: high (46 EFs). Latency: zero (runs when you ask). Cost: developer discipline only.

**Option B — Daily pg_cron job calling a drift-check Edge Function that writes findings to a `m.ef_drift_log` table.**
Friction: very low (passive). Coverage: high (46 EFs). Latency: ≤24h. Cost: minor — one new EF, one new table, one cron entry. Surfaces in dashboard automatically.

**Option C — Wrapper script over `supabase functions deploy` that refuses to deploy unless local repo is clean and committed.**
Friction: medium (changes deploy workflow). Coverage: prevents new drift only — doesn't detect existing drift. Cost: small wrapper script.

**Option D — Deploy-only-from-CI policy: GitHub Action triggers `supabase functions deploy` on push to `main`. Manual CLI deploys forbidden.**
Friction: high (changes deploy mental model entirely). Coverage: very high if enforced. Cost: GitHub Action + secret + discipline. Risk: breaks PK's ability to do urgent hot-fixes if CI is slow or down.

**Option E — Combination of B + C.**
Friction: low-medium. Coverage: high (B detects + C prevents). Cost: minor.

The recommendation will likely be Option B alone, or B + a stripped-down version of C, depending on Batch 2-5 evidence about how often new drift is introduced vs. how much old drift exists.

---

## 9. Tasks

- [x] Brief created with scope locked.
- [x] Tier 1: complete repo-presence check for all 46 deploy slugs (Section 4 table fully resolved).
- [x] Count discrepancy reconciled (46 not 47).
- [x] **Batch 1: ingest, publisher, youtube-publisher, linkedin-zapier-publisher, ai-worker, video-worker, heygen-worker, auto-approver, compliance-monitor, pipeline-doctor, pipeline-ai-summary.** Done.
- [ ] Batch 2: ~10 EFs covering pipeline core + heygen avatar suite + video-analyser + cron-driven Class D candidates.
- [ ] Batch 3: ~10 EFs covering MCP bridges + observability + onboarding.
- [ ] Batch 4: ~10 EFs covering remaining publishers + ingest support.
- [ ] Batch 5: final ~5 EFs to close inventory.
- [ ] Tier 3: cross-reference findings with root-cause hypothesis matrix (Section 6 — preliminary written, will firm up).
- [ ] Section 7: lock banner-reliability assessment with all-46 data.
- [ ] Section 8: rank prevention options on (friction, coverage, latency).
- [ ] Section 8: lock recommendation and present for PK approval.

No EF patching, no deploys, no NY×YT or M6 work until this brief is closed and PK has approved a recommendation.

---

## 10. Decisions

**D-PREV-01 (2026-05-05) — Inventory pacing: Option B (chunked batches of ~10 EFs).**
Rationale: full 46-EF inventory in one session would consume excessive context and prevent mid-investigation course correction. Batches let PK redirect after each report.

**D-PREV-02 (2026-05-05) — Class C is the highest-priority case to surface.**
Banner-only checks miss Class C; the `youtube-publisher` case demonstrated this. Future batch selection should weight slugs where banner-match has been informally assumed (i.e., recently-deployed / actively-edited EFs).

**D-PREV-03 (2026-05-05) — `ingest` banner non-conformance is a finding, not a defect.**
The feature-tag banner style (`ingest-v8-youtube-channel`) is informative — it tells the operator what the most recent feature-tag was — but it cannot be programmatically compared to a deploy version number. Recommendation will treat the semver convention as advisory only, not a contract; drift detection must rely on body-comparison, not banner parsing.

---

_End of brief. Batch 2 commences in next session pass._
