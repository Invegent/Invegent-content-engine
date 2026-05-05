# F-EF-DRIFT-PREVENTION — Edge Function Source Drift Prevention

**Date:** 2026-05-05 (evening, post-v2.39 + sync commit `7ba441e2`)
**Status:** ACTIVE — Tier 2 inventory COMPLETE (46/46 EFs surveyed); recommendation locked, awaiting PK approval
**Parent:** RECONCILE-EF-DRIFT (CLOSED by commit `7ba441e2aba18cd848c67a6283e6376a8846f91a`)
**Project:** mbkmaxqhsohbtwsqolns
**Repo:** Invegent/Invegent-content-engine
**Total deployed EFs:** **46** (per `Supabase:list_edge_functions`, 2026-05-05 ~22:00 UTC)
**Tier 2 progress:** 46/46 surveyed (100%) — Batches 1+2+3+4+5 complete + repo-only checks done

---

## 1. Why this brief exists

On 2026-05-05 evening the v2.39 carry-forward identified that 4 deployed Edge Functions were either ahead of or absent from the GitHub source repo. RECONCILE-EF-DRIFT applied a sync-only commit to bring those 4 to byte-parity with deployed source. That sync closed the symptom but not the cause.

Three drivers made a prevention investigation P1:

1. **Drift went undetected for at least 5 days.** The deployed `youtube-publisher` source had been edited multiple times (v1.5.0 → v1.6.0 deployed 1 May, 4 days before discovery) without a corresponding repo commit. There is no automated alert when deployed EF source diverges from `main`.
2. **One drift case had matching banners but different bodies.** `youtube-publisher` repo and deployed both reported `v1.6.0` in the VERSION constant — but the bodies differed by one comment line. Banner-equality alone is not sufficient evidence of source-equality. This is the trap case (Class C).
3. **Three of four affected EFs had stale repo source for at least one full deployed version cycle.** `ai-worker` was 3 minor versions behind. `heygen-worker` was 1 version behind. `video-worker` was missing from the repo entirely.

The full survey has now found and characterised every drift case across all 46 deployed EFs plus 2 repo-only directories. The pattern is firm enough to recommend.

---

## 2. Scope (locked by PK direction, 2026-05-05)

This brief investigates and recommends. It does NOT patch EF code. It does NOT deploy. It does NOT start F-YT-NY-FORMAT-SELECTION. It does NOT start M6.

The scope items, verbatim:

1. Investigate how deployed EF source diverged from GitHub.
2. Identify all Edge Functions where repo version differs from deployed version.
3. Identify whether version banners inside EFs are reliable.
4. Propose an automated prevention mechanism.
5. Recommend the lowest-friction solution for a solopreneur workflow.
6. Do not patch Edge Functions yet.
7. Do not start F-YT-NY-FORMAT-SELECTION until deployed source is synced. (Synced 2026-05-05 via commit `7ba441e2`.)
8. Do not start M6 unless EF source sync is blocked. (Sync was not blocked.)

---

## 3. Methodology + classification taxonomy (locked post-Batch 4 cleanup)

### Two independent classification axes

**Structural class** (always applies):
- **Class A — clean.** Deployed banner matches deploy slug AND repo body byte-equals deployed body. Subclass: **A (line-ending only)** — bodies differ only in CRLF vs LF. Treated as Class A for drift purposes per D-PREV-04.
- **Class B — banner-version drift.** The version field embedded in deployed source differs from the version field in repo source. Banner-string comparison would catch this. Class B always carries a directional sub-classification.
- **Class C — body-drift trap.** Deployed banner equals repo banner BUT body differs. Banner-string comparison would NOT catch this.
- **Class D — repo file missing.** Deployed slug has no matching directory in `supabase/functions/<slug>/`.
- **Repo-only directory** (no class letter). Repo has a directory with no corresponding deployed slug. Always forward-only.

**Directional sub-classification** (applies to drift):
- **Regression-risk drift (B-RR)** = deployed is ahead of repo. Repo redeploy would lose fixes/features. Class C and D are regression-risk by structure.
- **Forward-drift (B-FD)** = repo is ahead of deployed. Pending deploy state. Repo-only directories are forward-only by structure.

---

## 4. Tier 1 inventory — deployed inventory (FINAL, post-Batch 5)

Captured from `Supabase:list_edge_functions` 2026-05-05 ~22:00 UTC. **46 EFs**, all `ACTIVE` status.

| # | Slug | Deploy version | Repo dir? | Class (FINAL) |
|---|---|---|---|---|
| 1 | inspector | 104 | ✓ | A line-ending (Batch 3) |
| 2 | ingest | 117 | ✗ | **D** (Batch 1) |
| 3 | content_fetch | 89 | ✓ | A line-ending (Batch 2) |
| 4 | ai-worker | 99 | ✓ | A (synced) |
| 5 | publisher | 82 | ✓ | A (Batch 1) |
| 6 | inspector_sql_ro | 59 | ✓ | A line-ending (Batch 3) |
| 7 | auto-approver | 57 | ✓ | A (Batch 1) |
| 8 | insights-worker | 55 | ✓ | **B-RR** (Batch 2) |
| 9 | feed-intelligence | 42 | ✓ | **C** (Batch 2) |
| 10 | email-ingest | 37 | ✓ | **C cosmetic** (Batch 4) |
| 11 | draft-notifier | 38 | ✓ | **B-RR** (Batch 4) |
| 12 | image-worker | 59 | ✓ | **C** (Batch 2) |
| 13 | series-outline | 37 | ✓ | **C** (Batch 4) |
| 14 | series-writer | 38 | ✓ | **B-RR** (Batch 4) |
| 15 | pipeline-doctor | 35 | ✗ | **D** (Batch 1) |
| 16 | pipeline-ai-summary | 36 | ✗ | **D** (Batch 1) |
| 17 | compliance-monitor | 36 | ✗ | **D** (Batch 1) |
| 18 | video-worker | 36 | ✓ | A (synced) |
| 19 | youtube-publisher | 38 | ✓ | A (synced) |
| 20 | pipeline-fixer | 26 | ✓ | A (Batch 2) |
| 21 | compliance-reviewer | 26 | ✓ | **C** (Batch 5) |
| 22 | video-analyser | 25 | ✗ | **D** (Batch 2) |
| 23 | heygen-intro | 22 | ✗ | **D** (Batch 2) |
| 24 | heygen-youtube-upload | 21 | ✗ | **D** (Batch 2) |
| 25 | heygen-worker | 22 | ✓ | A (synced) |
| 26 | heygen-avatar-creator | 28 | ✓ | **B-RR** (Batch 4) |
| 27 | heygen-avatar-poller | 31 | ✓ | **B-RR** (Batch 4) |
| 28 | onboarding-notifier | 22 | ✓ | **C** (Batch 4) |
| 29 | brand-scanner | 22 | ✓ | A line-ending (Batch 4) |
| 30 | ai-profile-bootstrap | 21 | ✓ | **C** (Batch 4) |
| 31 | weekly-manager-report | 25 | ✓ | A (Batch 3) |
| 32 | pipeline-sentinel | 22 | ✓ | A (Batch 3) |
| 33 | pipeline-diagnostician | 22 | ✓ | A (Batch 3) |
| 34 | pipeline-healer | 22 | ✓ | A (Batch 3) |
| 35 | client-weekly-summary | 22 | ✓ | A (Batch 3) |
| 36 | insights-feedback | 22 | ✓ | A (Batch 5) |
| 37 | instagram-publisher | 24 | ✓ | A line-ending (Batch 2) |
| 38 | linkedin-zapier-publisher | 24 | ✓ | A (Batch 1) |
| 39 | wordpress-publisher | 21 | ✓ | A (Batch 2) |
| 40 | feed-discovery | 22 | ✓ | **B-FD** (Batch 4) |
| 41 | external-reviewer | 13 | ✓ | A line-ending (Batch 5) |
| 42 | external-reviewer-digest | 11 | ✓ | A (Batch 5) |
| 43 | system-auditor | 11 | ✓ | A line-ending (Batch 5) |
| 44 | chatgpt-review-worker | 5 | ✓ | A line-ending (Batch 3) |
| 45 | mcp-chatgpt-bridge | 8 | ✓ | A line-ending (Batch 3) |
| 46 | mcp-github-bridge | 4 | ✓ | A (Batch 3) |

**Repo-only directories (forward-only state, no deployed counterpart):**
- `ai-diagnostic` v1.0.0 — daily diagnostic EF that writes to `m.ai_diagnostic_report`. Project memory describes this as "daily 6am AEST, /diagnostics dashboard page," implying it should be deployed. No deployed slug `ai-diagnostic` exists. Two possibilities: (a) functionality has been folded into a different deployed slug (`pipeline-ai-summary` or `pipeline-doctor` are candidates, both Class D, no source visible to verify); (b) memory is stale and the EF was authored but never deployed. Worth a one-time triage by PK — either deploy from repo or remove the dead repo file.
- `linkedin-publisher` v1.2.0 — banner explicitly states: "Repo-only EF; not deployed yet. Patched defensively so when B24/F06 activates this EF (LinkedIn Community Management API approval), the gate is in place from day-1 — prevents reintroducing the F-PUB-005-class bug." This is intentional forward-staging. The currently-deployed alternative is `linkedin-zapier-publisher` (the Zapier bridge). Per project memory, LinkedIn Community Management API approval is pending; if still pending 13 May 2026, evaluate Late.dev. Not drift; deliberate.

**FINAL cumulative class distribution across 46 deployed EFs:**
- A = 26 (57%) — of which 9 line-ending-only and 17 byte-identical
- B-RR (regression-risk) = 5 (11%)
- B-FD (forward-drift) = 1 (2%)
- C = 7 (15%) — current state
- D = 7 (15%)

**Reconciliation footnote on Class C count:** Current-state Class C = 7 (image-worker, feed-intelligence, onboarding-notifier, ai-profile-bootstrap, series-outline, email-ingest, compliance-reviewer). Ever-observed Class-C-or-comment-drift = 8 if `youtube-publisher` is included as a historical case (pre-sync state, since repaired by commit `7ba441e2`). Brief reports current-state counts as canonical.

---

## 5. Tier 2 — per-EF drift inventory (all 5 batches complete)

### Batch 1 totals (11 EFs): A=7, B-RR=0, B-FD=0, C=0, D=4.
### Batch 2 totals (10 EFs): A=4, B-RR=1, B-FD=0, C=2, D=3.
### Batch 3 totals (10 EFs): A=10, B-RR=0, B-FD=0, C=0, D=0.
### Batch 4 totals (10 EFs): A=1, B-RR=4, B-FD=1, C=4, D=0.

### Batch 5 (5 EFs + 2 repo-only checks)

| # | Slug | Deploy ver | Banner | Banner conv | Repo SHA | Body match | Class | Op importance |
|---|---|---|---|---|---|---|---|---|
| 1 | compliance-reviewer | 26 | `compliance-reviewer-v1.3.0` | ✓ semver | `6b050e20` | **NO — prompt strings differ (system prompt: "No preamble, no markdown" vs "...no markdown fences."; userPrompt rules-loaded line: short label vs vertical+profession context); rules-scope label `[Universal]` vs `[Universal — all professions in vertical]`; banner has 1 extra line in repo; `no_rules` summary string longer in repo. Differences flow into the LLM call and affect content.** | **C** | MED — NDIS policy change AI analysis (rare invocations, content quality affected) |
| 2 | external-reviewer | 13 | `external-reviewer-v1.2.1` | ✓ semver | `4d4ba387` | LF/CRLF only | **A line-ending** | HIGH — webhook-triggered code review (Strategist/Engineer/Risk) |
| 3 | external-reviewer-digest | 11 | `external-reviewer-digest-v1.1.0` | ✓ semver | `c80b5908` | byte-identical (LF) | **A** | MED — weekly digest assembly + GitHub commit + email |
| 4 | system-auditor | 11 | `system-auditor-v1.0.2` | ✓ semver | `f2c5268e` | LF/CRLF only | **A line-ending** | MED — one-shot xAI audit of docs + DB |
| 5 | insights-feedback | 22 | `insights-feedback-v1.0.0` | ✓ semver | `c3dec7f0` | byte-identical (LF) | **A** | MED — daily topic-weight recalc per active client |

**Batch 5 totals:** A=4 (2 byte-identical + 2 line-ending), B-RR=0, B-FD=0, C=1, D=0.

**Repo-only directory checks (Batch 5 sub-task):**
- `ai-diagnostic` — banner v1.0.0, no top-level VERSION constant (JSDoc-style header). Operational status unclear; project memory describes it as running daily but no deployed slug exists. Triage candidate.
- `linkedin-publisher` — banner v1.2.0 explicitly notes "Repo-only EF; not deployed yet" with the F-PUB-005 approval-gate fix pre-applied for B24/F06 activation. Deliberate forward-staging.

### FINAL cumulative across all 46 deployed EFs

- A = 26 (57%) — 9 line-ending-only + 17 byte-identical
- B-RR (regression-risk) = 5
- B-FD (forward-drift) = 1
- C = 7 (current state)
- D = 7
- Repo-only directories = 2

### Already characterised in RECONCILE-EF-DRIFT (pre-sync state, historical record)

| Slug | Pre-sync state | Current state |
|---|---|---|
| ai-worker | B-RR (banner-drift, v2.9.0 → v2.11.1) | A |
| heygen-worker | B-RR (banner-drift, v1.0.0 → v1.1.0) | A |
| video-worker | D (repo missing, v2.1.0 deployed only) | A |
| youtube-publisher | C (banner v1.6.0 ↔ v1.6.0 body-diff) | A |

**Ever-observed counts (current + pre-sync historical):** B-RR ever = 7. C ever = 8. D ever = 8.

---

## 6. Tier 3 — root-cause hypothesis matrix (LOCKED, all-46 data)

| Hypothesis | Likelihood | Evidence pattern |
|---|---|---|
| **Manual CLI `supabase functions deploy` without commit** | **HIGH-CONFIRMED** | B-RR count is 5 across all 46 EFs (insights-worker, heygen-avatar-creator, heygen-avatar-poller, series-writer, draft-notifier). Three have explicit "Fix vX.Y: ..." banners showing the deploy was the result of a hands-on patch, not a CI flow. RECONCILE-EF-DRIFT pattern (3/4 of original sync targets were B-RR). |
| **Windows CLI deploy without git autocrlf normalization** | **HIGH-CONFIRMED** | content_fetch + instagram-publisher (Batch 2), inspector + inspector_sql_ro + chatgpt-review-worker + mcp-chatgpt-bridge (Batch 3), brand-scanner (Batch 4), external-reviewer + system-auditor (Batch 5) all have CRLF deployed / LF repo. 9/35 (26%) of repo-comparable EFs across all batches show this pattern. Consistent with PK's local repo at `C:\Users\parve\Invegent-content-engine`. |
| **Source minification before deploy** | possible (single case) | `image-worker` only. Functionally equivalent to repo. |
| **Supabase dashboard inline-edit** | **MEDIUM-HIGH** | Suspected for `ingest` (Class D, feature-tag banner). Suspected for `heygen-intro` and `heygen-youtube-upload` (Class D, no VERSION constant). `onboarding-notifier` deployed has comments stripped + 1 type annotation added, signature of a Studio inline-edit. |
| **Uncommitted local working-tree edit** | **MEDIUM** | Indistinguishable from CLI-deploy without local-machine evidence. `series-outline`, `email-ingest`, and `compliance-reviewer` Class C cases (compacted in repo, expanded in deployed) suggest the inverse — repo was reformatted *after* deploy. |
| **Class C "polish drift" — repo cleanup never deployed** | **CONFIRMED** | 7 cases in current state. `feed-intelligence` repo has dead code removed; deployed still has it. `series-outline`, `email-ingest`, `compliance-reviewer` are similar. `ai-profile-bootstrap` repo extracted slug as variable. The pattern is consistent: repo gets formatted/refactored after a deploy, but the resulting source isn't redeployed. |
| **SECURITY-DEFINER-vs-exec_sql architectural drift** | **CONFIRMED, 3 cases (Batch 4)** | `heygen-avatar-creator` v2.2.0, `draft-notifier` v1.1.0, and `heygen-avatar-poller` v2.0.0 all replace `exec_sql` UPDATE on `c` or `m` schema with `SECURITY DEFINER` rpc calls. Repo source still uses the broken pattern. **A repo redeploy of any of these three would silently re-introduce a known production bug.** Highest-severity drift category. |
| **Forward-drift (repo ahead of deployed, pending deploy)** | **CONFIRMED, 1 case** | `feed-discovery` repo v1.2.0 with explicit alignment-commit banner; deployed still v1.1.0. Benign operationally. Body-only drift detection would surface this; recommendation must distinguish it from B-RR. |
| **Repo-only forward-staging** | **CONFIRMED, 1-2 cases** | `linkedin-publisher` is deliberately repo-only with the F-PUB-005 approval-gate fix pre-applied for B24/F06 activation. `ai-diagnostic` is unclear — either forward-staging or stale repo content. Recommendation must surface repo-only directories as a distinct state, not as drift. |
| **Parallel agent / chat window deploy** | LOW-MEDIUM | No direct evidence. |
| **GitHub Actions / CI absent or bypassed** | **CONFIRMED** | No `.github/workflows/` EF-deploy pipeline exists. All deploys are manual. |
| **Recent / careful deploys are clean; older / hand-fixed deploys drift** | **CONFIRMED — strongly** | Batch 3 sweep was 10/10 clean. Batch 5 reviewer-stack (external-reviewer, external-reviewer-digest, system-auditor, insights-feedback) was 4/5 clean (only compliance-reviewer drifted). Drift correlates with EFs that have had a hand-patch applied to fix a schema-write or HeyGen-API problem after initial deploy, or with EFs that have had post-deploy formatter runs in the repo. |
| **Deploy machine determines line-ending** | **CONFIRMED** | Mix of CRLF-deployed and LF-deployed EFs. Drift detection script must normalize line endings regardless. |

**Top-level finding (locked):** Drift accumulates at three specific seams:
1. The c/m/f/t schema-write boundary (where `exec_sql` UPDATE silently fails and a `SECURITY DEFINER` fix gets hand-deployed without a corresponding repo commit) — the highest-severity seam.
2. The repo-formatting/post-deploy seam (where repo source gets compacted, reformatted, or refactored after a deploy and never gets redeployed) — produces Class C cases consistently.
3. The feature-fix seam (where a hand-discovered fix — new HeyGen API endpoint, new feature column, new prompt enrichment — gets CLI-deployed without committing the underlying code change) — produces B-RR cases.

Recently built and carefully deployed infrastructure (MCP bridges, observability trio, inspector pair, weekly reports, reviewer stack) is in clean sync. The drift problem is concentrated, not uniform.

---

## 7. Banner reliability — LOCKED (all-46 data)

**Banner conformance:**
- 32/46 deployed banners follow the `<slug>-vX.Y.Z` semver convention
- 2/46 use feature-tag style with non-numeric semver field (`ingest-v8-youtube-channel`, `content-fetch-v2.4-rpc`)
- 2/46 use `<slug>-vN` style (`inspector-sql-ro-v1`, `email-ingest-v1`)
- 4/46 have **no `VERSION` constant at all** (`heygen-intro`, `heygen-youtube-upload`, `inspector`, `chatgpt-review-worker`)
- 2/46 use **MCP `SERVER_INFO.version` pattern** (`mcp-chatgpt-bridge`, `mcp-github-bridge`)
- 1/46 uses **bare version-only** banner with no slug prefix (`feed-discovery` — `VERSION = "1.2.0"`)
- 3/46 are repo-only or untested (no comparison done): the 7 Class D have no repo file, so banner conformance is irrelevant for sync-detection

**Body-vs-banner relationship (final):**
- 26/46 (57%) Class A — banner matches deploy slug, body matches repo (17 byte-identical + 9 line-ending-only)
- 5/46 (11%) Class B-RR — banner numerically different, deployed ahead. Banner check would catch this.
- 1/46 (2%) Class B-FD — banner numerically different, repo ahead. Banner check would catch this.
- 7/46 (15%) Class C — banner identical, body different. **Banner check FAILS for Class C.**
- 7/46 (15%) Class D — no repo file to compare.

**Locked recommendations:**
- **Banner-only check is INSUFFICIENT.** Class C has 7 confirmed cases (8 ever-observed) where banners match but bodies differ.
- **Banner-only check is also UNRELIABLE.** ~30% of EFs use a non-conforming banner pattern.
- **Production prevention mechanism must body-compare** on a periodic basis.
- **Body-comparison MUST normalize line endings.** 9/35 (26%) of repo-comparable EFs differ only by CRLF/LF.
- **Body-comparison MUST distinguish B-RR from B-FD directionally.**
- **Semver convention is opt-in not contractual.** Treat banner content as advisory.
- **MCP SERVER_INFO pattern is a legitimate alternative.**
- **SECURITY-DEFINER-vs-exec_sql drift is the highest-severity sub-class within B-RR.** Drift detection should flag this as P1 urgent.

---

## 8. Prevention recommendation — LOCKED (awaiting PK approval)

**Final recommendation: Option F-locked = Option B (passive daily detection) + Option C (deploy-time non-blocking warning) + targeted SECURITY-DEFINER pattern detector.**

### What gets built

**Component 1: `drift-check` Edge Function (new).**

Daily pg_cron at low-traffic hour (e.g. 03:00 AEST, after the existing 02:00 AEST nightly health check). Iterates every deployed EF via `Supabase:list_edge_functions`. For each:

1. Fetch deployed source via `get_edge_function`.
2. Fetch repo source from `supabase/functions/<slug>/index.ts` on `main`.
3. Normalize line endings (CRLF → LF) on both sides.
4. Compute body hash (e.g. SHA-256) on both sides.
5. Parse banner version from each side using a permissive parser that accepts: top-level `VERSION = "<slug>-vX.Y.Z"`, top-level `VERSION = "X.Y.Z"` (bare), `SERVER_INFO = { version: "X.Y.Z" }`, or comment-only banners (treat as no version).
6. Classify: A / B-RR / B-FD / C / D.
7. Run `SECURITY DEFINER pattern detector` (see below).
8. Write a row to `m.ef_drift_log` with: `slug`, `deploy_version`, `repo_version`, `class`, `direction`, `security_definer_regression_risk` (boolean), `deployed_hash`, `repo_hash`, `checked_at`, `previous_class` (lookup), `state_changed` (boolean).
9. Also list repo-only directories: scan `supabase/functions/` in repo and flag any directory whose name doesn't match a deployed slug.

**SECURITY DEFINER pattern detector:** lex-scan the repo source for `\.rpc\s*\(\s*['"]exec_sql['"]` followed within ~500 chars by `UPDATE\s+[cmft]\.`. If found in repo BUT the deployed source replaces the same call site with a non-`exec_sql` `.rpc()` call, set `security_definer_regression_risk=true`. This catches the Batch 4 critical pattern.

**Component 2: `m.ef_drift_log` table (new).**

Columns include `id`, `slug`, `checked_at`, `class`, `direction`, `deploy_version`, `repo_version`, `deployed_hash`, `repo_hash`, `security_definer_regression_risk`, `previous_class`, `state_changed`, `notes`. Indexes on `(slug, checked_at)` and `(class, checked_at)`. Retention: 90 days.

**Component 3: dashboard surface (modest extension to existing observability).**

A "Drift" panel on the existing operations dashboard reads from `m.ef_drift_log` and shows: (a) total drift count by class, (b) the SECURITY-DEFINER regression-risk list (P1 urgent), (c) the B-FD list (informational), (d) the Class C list (medium priority, schedule a sync), (e) the Class D list (slugs missing from repo — either commit the source or remove the deployed EF), (f) the repo-only directory list. New rows in `m.ef_drift_log` where `state_changed=true` get a small notification badge.

**Component 4: deploy-time non-blocking warning (Option C).**

A local wrapper script (e.g. `scripts/safe-deploy.sh`) that PK can use as a habit but is not enforced. Pre-deploy, it: (a) checks `git status` is clean for the function being deployed, (b) checks the local file matches `origin/main`, (c) prints a warning if either check fails but does NOT refuse the deploy. PK retains the ability to hot-fix via direct CLI when speed matters — the wrapper is a habit-builder, not a gate.

### What does NOT get built

- **No CI deploy pipeline (Option D).** PK works solo and needs the ability to ship hot-fixes from CLI. CI policy would break that.
- **No real-time deploy hook.** The daily cadence is sufficient; drift over a 24-hour window is acceptable given the existing scale.
- **No automatic backfill from deployed to repo.** All sync commits remain manual decisions — PK reviews the deployed source for correctness before accepting it as canonical (per D-PREV-07 for `insights-worker`).

### Why this combination over the alternatives

- **Option B alone** detects existing drift but doesn't slow new drift from accumulating. Tolerable but suboptimal.
- **Option C alone** prevents new drift but doesn't catch the 13 existing cases (5 B-RR + 7 C + 1 B-FD across 46 EFs). Misses the actual problem.
- **Option D alone** is too friction-heavy for a solopreneur with hot-fix needs.
- **Option E (B + C)** is good but doesn't surface the SECURITY-DEFINER class as urgent. Misses the most dangerous category.
- **Option F (B + C + SECURITY-DEFINER detector)** detects existing drift, slows new drift, and surfaces the highest-severity class as P1. Lowest-friction net-positive prevention for the actual failure modes observed.

### Estimated build effort

- `drift-check` EF: ~2 hours of CC-style work (Deno/TypeScript, calls already-familiar `Supabase:list_edge_functions` + `get_edge_function` + GitHub API).
- `m.ef_drift_log` table + indexes: 1 migration, ~15 minutes.
- Dashboard panel: ~1-2 hours, depending on whether PK wants it on the existing Overview tab or a new Drift tab.
- Deploy wrapper script: ~30 minutes, bash.
- Total: ~4-5 hours of build time across two sessions.

### Triage list for the 13 existing drift cases (PK action items, NOT this brief's scope)

**P1 — SECURITY-DEFINER regression-risk (do not redeploy from repo):**
1. heygen-avatar-creator — sync repo → deployed (write deployed v2.2.0 source back into repo)
2. heygen-avatar-poller — sync repo → deployed (write deployed v2.0.0 source back into repo)
3. draft-notifier — sync repo → deployed (write deployed v1.1.0 source back into repo)

**P1 (different reason) — substantial functional drift:**
4. insights-worker — review deployed v14.0.0 source for correctness; PK manually decides whether deployed is canonical, then sync repo

**P2 — feature drift:**
5. series-writer — sync repo → deployed (deployed v1.3.0 has source_material + format_preference)

**P2 — forward-drift (PK decision point):**
6. feed-discovery — PK decides: deploy repo v1.2.0 to live, OR leave deployed v1.1.0 in place

**P3 — Class C, schedule a polish-sync run:**
7. youtube-publisher (already synced, kept here for record)
8. image-worker (minification — D-PREV-05 says no sync needed)
9. feed-intelligence (dead-code diff — minor)
10. onboarding-notifier (comments + 1 type annotation — minor)
11. ai-profile-bootstrap (slug variable refactor — minor)
12. series-outline (prompt enrichment in deployed — affects content quality, sync recommended)
13. email-ingest (cosmetic only)
14. compliance-reviewer (prompt strings differ — affects content quality, sync recommended)

**P3 — Class D (commit deployed source to repo OR remove deployed EF):**
15. ingest, pipeline-doctor, pipeline-ai-summary, compliance-monitor (Batch 1 D-class)
16. video-analyser, heygen-intro, heygen-youtube-upload (Batch 2 D-class)

**P3 — repo-only directories (PK triage):**
17. ai-diagnostic — either deploy from repo or remove the dead repo file
18. linkedin-publisher — leave alone (deliberate forward-staging)

---

## 9. Tasks

- [x] Brief created with scope locked.
- [x] Tier 1 inventory map.
- [x] **Batch 1 complete** (11 EFs).
- [x] **Batch 2 complete** (10 EFs).
- [x] **Batch 3 complete** (10 EFs).
- [x] **Batch 4 complete** (10 EFs).
- [x] **Taxonomy clean-up post-Batch 4**: retire "reverse-drift", introduce B-RR / B-FD directional sub-classes.
- [x] **Batch 5 complete** (5 EFs + 2 repo-only checks).
- [x] **Tier 3 hypothesis matrix LOCKED** with all-46 data.
- [x] **Section 7 banner reliability LOCKED** with all-46 data.
- [x] **Section 8 prevention recommendation LOCKED.**
- [ ] PK approval of Section 8 recommendation.
- [ ] Build phase (after approval): drift-check EF + m.ef_drift_log table + dashboard panel + deploy wrapper.
- [ ] Triage phase (after build): work the 13-case existing-drift list.

No EF patching, no deploys, no NY×YT or M6 work until this brief is closed and PK has approved the recommendation.

---

## 10. Decisions

**D-PREV-01 (2026-05-05) — Inventory pacing: chunked batches of ~10 EFs.**

**D-PREV-02 (2026-05-05) — Class C is the highest-priority case to surface.**
Final: 7 confirmed current-state cases (8 ever-observed).

**D-PREV-03 (2026-05-05) — `ingest` banner non-conformance is a finding, not a defect.**

**D-PREV-04 (2026-05-05, post-Batch 2) — CRLF/LF line-ending differences are NOT classified as drift.**
Final: 9/35 (26%) of repo-comparable EFs differ only by CRLF/LF.

**D-PREV-05 (2026-05-05, post-Batch 2) — `image-worker` minification is NOT classified as drift requiring sync.**

**D-PREV-06 (2026-05-05, post-Batch 2) — `heygen-intro` and `heygen-youtube-upload` Class D treatment.**

**D-PREV-07 (2026-05-05, post-Batch 2) — `insights-worker` B-RR drift will NOT be auto-synced.** Manual PK review required.

**D-PREV-08 (2026-05-05, post-Batch 3) — MCP `SERVER_INFO.version` is a legitimate alternative banner pattern.**

**D-PREV-09 (2026-05-05, post-Batch 3) — `chatgpt-review-worker` and `inspector` lack any machine-readable version field.**
Drift detection for these EFs relies entirely on body-hash comparison.

**D-PREV-10 (2026-05-05, post-Batch 3) — Drift is concentrated, not uniform.**
The prevention recommendation prioritises detection of existing drift over prevention of new drift in well-managed code.

**D-PREV-11 (2026-05-05, post-Batch 4) — SECURITY-DEFINER-vs-exec_sql drift is the highest-severity drift category within B-RR.**
Three cases (heygen-avatar-creator, heygen-avatar-poller, draft-notifier). Drift detection includes a targeted regex pattern detector for this class.

**D-PREV-12 (2026-05-05, post-Batch 4) — Forward-drift (B-FD) is a separate state from regression-risk drift (B-RR).**
Reporting must distinguish them.

**D-PREV-13 (2026-05-05, post-Batch 4 cleanup) — Classification taxonomy locked.**
Two independent axes: structural (A/B/C/D/repo-only) + directional (B-RR/B-FD).

**D-PREV-14 (2026-05-05, post-Batch 5) — Final prevention recommendation locked.**
Option F: Option B (passive daily drift-check EF + `m.ef_drift_log` table + dashboard panel) + Option C (deploy-time non-blocking wrapper warning) + targeted SECURITY-DEFINER pattern detector. Build effort ~4-5 hours. Awaiting PK approval to proceed to build phase.

**D-PREV-15 (2026-05-05, post-Batch 5) — Repo-only directories are a separate state from drift.**
After Batch 5: `linkedin-publisher` is intentional forward-staging. `ai-diagnostic` is unclear (either forward-staging or stale). The drift detection script flags repo-only directories as informational, not as drift, but surfaces them so PK can triage them one by one.

---

_End of brief. Tier 2 complete. Awaiting PK approval of Section 8 recommendation to proceed to build phase. No EF patches, no deploys, no NY×YT, no M6 until approval._
