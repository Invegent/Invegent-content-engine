# F-EF-DRIFT-PREVENTION — Edge Function Source Drift Prevention

**Date:** 2026-05-05 (evening, post-v2.39 + sync commit `7ba441e2`)
**Status:** **APPROVED (design locked) — build pending in separate session.** Recommendation accepted by PK 2026-05-05 late-evening (v2.40). Tier 2 inventory COMPLETE (46/46 EFs surveyed); Option F is the target prevention design. Build effort ~4-5h split across two sessions.
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

The full survey has now found and characterised every drift case across all 46 deployed EFs plus 2 repo-only directories. The pattern is firm enough to recommend, and PK has approved the recommendation.

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
- `ai-diagnostic` v1.0.0 — daily diagnostic EF that writes to `m.ai_diagnostic_report`. Project memory describes this as "daily 6am AEST, /diagnostics dashboard page," implying it should be deployed. No deployed slug `ai-diagnostic` exists. Two possibilities: (a) functionality has been folded into a different deployed slug; (b) memory is stale and the EF was authored but never deployed. Worth a one-time triage by PK.
- `linkedin-publisher` v1.2.0 — banner explicitly states: "Repo-only EF; not deployed yet. Patched defensively so when B24/F06 activates this EF (LinkedIn Community Management API approval), the gate is in place from day-1." Intentional forward-staging.

**FINAL cumulative class distribution across 46 deployed EFs:**
- A = 26 (57%) — 17 byte-identical + 9 line-ending-only
- B-RR (regression-risk) = 5 (11%)
- B-FD (forward-drift) = 1 (2%)
- C = 7 (15%) — current state
- D = 7 (15%)

Class C reconciliation: current-state Class C = 7. Ever-observed = 8 if `youtube-publisher` (pre-sync, since repaired) is included.

---

## 5. Tier 2 — per-EF drift inventory (all 5 batches complete)

### Batch 1 totals (11 EFs): A=7, B-RR=0, B-FD=0, C=0, D=4.
### Batch 2 totals (10 EFs): A=4, B-RR=1, B-FD=0, C=2, D=3.
### Batch 3 totals (10 EFs): A=10, B-RR=0, B-FD=0, C=0, D=0.
### Batch 4 totals (10 EFs): A=1, B-RR=4, B-FD=1, C=4, D=0.
### Batch 5 totals (5 EFs): A=4 (2 byte-identical + 2 line-ending), B-RR=0, B-FD=0, C=1, D=0.

Full per-EF detail in commit history (`bec80b73` for Batch 4, `0abd8ca5` for Batch 5 lock). Class C cases that affect content quality: `series-outline` (deployed has carousel guidance + narrative-arc instruction not in repo), `compliance-reviewer` (deployed has different system prompt and rules-scope label).

### FINAL cumulative across all 46 deployed EFs

- A = 26 (57%), B-RR = 5, B-FD = 1, C = 7 (current), D = 7. Repo-only directories = 2.

### Already characterised in RECONCILE-EF-DRIFT (pre-sync, historical)

| Slug | Pre-sync state | Current state |
|---|---|---|
| ai-worker | B-RR (v2.9.0 → v2.11.1) | A |
| heygen-worker | B-RR (v1.0.0 → v1.1.0) | A |
| video-worker | D (repo missing) | A |
| youtube-publisher | C (banner v1.6.0 body-diff) | A |

Ever-observed counts (current + pre-sync historical): B-RR ever = 7. C ever = 8. D ever = 8.

---

## 6. Tier 3 — root-cause hypothesis matrix (LOCKED, all-46 data)

| Hypothesis | Likelihood | Evidence pattern |
|---|---|---|
| **Manual CLI `supabase functions deploy` without commit** | HIGH-CONFIRMED | 5 B-RR cases across 46 EFs. Three have explicit "Fix vX.Y: ..." banners showing hands-on patches. |
| **Windows CLI deploy without git autocrlf normalization** | HIGH-CONFIRMED | 9/35 (26%) of repo-comparable EFs have CRLF deployed / LF repo. |
| **Source minification before deploy** | possible (single case) | `image-worker` only. Functionally equivalent. |
| **Supabase dashboard inline-edit** | MEDIUM-HIGH | Suspected for `ingest`, `heygen-intro`, `heygen-youtube-upload` (Class D, no VERSION constant). `onboarding-notifier` has comments stripped + 1 type annotation added — Studio inline-edit signature. |
| **Class C "polish drift" — repo cleanup never deployed** | CONFIRMED | 7 cases. Pattern: repo gets formatted/refactored after a deploy, source isn't redeployed. |
| **SECURITY-DEFINER-vs-exec_sql architectural drift** | CONFIRMED, 3 cases (Batch 4) | `heygen-avatar-creator`, `draft-notifier`, `heygen-avatar-poller` all replace `exec_sql` UPDATE with `SECURITY DEFINER` rpc. Repo source still uses the broken pattern. **Repo redeploy = silent production bug.** Highest-severity drift category. |
| **Forward-drift (pending deploy)** | CONFIRMED, 1 case | `feed-discovery` repo v1.2.0 with explicit alignment-commit banner; deployed still v1.1.0. |
| **Repo-only forward-staging** | CONFIRMED, 1-2 cases | `linkedin-publisher` deliberately staged for B24/F06. `ai-diagnostic` unclear. |
| **GitHub Actions / CI absent or bypassed** | CONFIRMED | No `.github/workflows/` EF-deploy pipeline. All deploys manual. |
| **Recent / careful deploys are clean; older / hand-fixed deploys drift** | CONFIRMED — strongly | Batch 3 sweep was 10/10 clean. Drift correlates with hand-patches at schema-write or HeyGen-API boundaries. |

**Top-level finding (locked):** Drift accumulates at three specific seams — c/m/f/t schema-write boundary (highest-severity), repo-formatting/post-deploy seam (Class C consistently), feature-fix seam (B-RR). Recently-built MCP/observability/reviewer infrastructure is in clean sync. Drift is concentrated, not uniform.

---

## 7. Banner reliability — LOCKED (all-46 data)

- 32/46 follow `<slug>-vX.Y.Z` semver convention
- 14/46 non-conforming (feature-tag / vN-style / no VERSION / SERVER_INFO / bare version / Class D)
- **Banner-only check is INSUFFICIENT** — misses Class C (7 cases)
- **Banner-only check is UNRELIABLE** — ~30% non-conforming
- **Body-comparison must normalise line endings** — 9/35 (26%) of repo-comparable EFs differ only by CRLF/LF
- **Body-comparison must distinguish B-RR from B-FD** directionally
- **SECURITY-DEFINER-vs-exec_sql drift** is the highest-severity sub-class within B-RR — flag as P1 urgent

---

## 8. Prevention recommendation — APPROVED 2026-05-05 (Option F)

**Approved design: Option F = Option B (passive daily detection) + Option C (deploy-time non-blocking warning) + targeted SECURITY-DEFINER pattern detector.**

### Components

**Component 1: `drift-check` Edge Function (new).**
Daily pg_cron at 03:00 AEST (after the 02:00 nightly health check). Iterates every deployed EF via `Supabase:list_edge_functions`. For each: fetch deployed source via `get_edge_function`; fetch repo source from `supabase/functions/<slug>/index.ts` on `main`; normalise line endings (CRLF → LF); compute body hash on both sides; parse banner version with permissive parser; classify A / B-RR / B-FD / C / D; run SECURITY DEFINER pattern detector; write to `m.ef_drift_log`. Also list repo-only directories.

**SECURITY DEFINER pattern detector:** lex-scan repo source for `\.rpc\s*\(\s*['"]exec_sql['"]` followed within ~500 chars by `UPDATE\s+[cmft]\.`. If found in repo BUT deployed replaces the same call site with a non-`exec_sql` `.rpc()` call, set `security_definer_regression_risk=true`.

**Component 2: `m.ef_drift_log` table (new).**
Columns: `id`, `slug`, `checked_at`, `class`, `direction`, `deploy_version`, `repo_version`, `deployed_hash`, `repo_hash`, `security_definer_regression_risk`, `previous_class`, `state_changed`, `notes`. Indexes on `(slug, checked_at)` and `(class, checked_at)`. 90-day retention.

**Component 3: Dashboard surface.**
Drift panel reads `m.ef_drift_log` and shows: total drift by class; SECURITY-DEFINER regression-risk list (P1); B-FD list (informational); Class C list (medium-priority sync); Class D list (commit deployed source or remove EF); repo-only directory list. State_changed rows get a notification badge.

**Component 4: `scripts/safe-deploy.sh`.**
Pre-deploy `git status` + `origin/main` check; warns but does NOT refuse. Habit-builder. PK retains hot-fix capability.

### NOT building

- No CI deploy policy (Option D — too friction-heavy for solo with hot-fix needs)
- No real-time deploy hook (daily cadence sufficient)
- No automatic backfill from deployed to repo (sync commits remain manual decisions)

### Build effort

~4-5h split across two sessions. Approved to be done in a separate session, not concurrent with this brief's closure.

### Triage list for the 13 existing drift cases (action items, not scope of this brief)

**P1 SECURITY-DEFINER regression-risk** (do NOT redeploy from repo):
1. heygen-avatar-creator
2. heygen-avatar-poller
3. draft-notifier

**P1 functional drift:**
4. insights-worker

**P2 feature drift:**
5. series-writer

**P2 forward-drift (PK decision):**
6. feed-discovery

**P3 Class C polish-sync:**
7. image-worker (skip per D-PREV-05)
8. feed-intelligence
9. onboarding-notifier
10. ai-profile-bootstrap
11. series-outline (affects content quality)
12. email-ingest (cosmetic)
13. compliance-reviewer (affects content quality)

**P3 Class D (commit deployed source to repo OR remove deployed EF):**
ingest, pipeline-doctor, pipeline-ai-summary, compliance-monitor, video-analyser, heygen-intro, heygen-youtube-upload

**Repo-only triage:**
ai-diagnostic (deploy from repo or remove dead repo file), linkedin-publisher (leave alone — deliberate forward-staging)

---

## 9. Tasks

- [x] Brief created with scope locked.
- [x] Tier 1 inventory map.
- [x] **Batches 1-5 complete** (46/46 EFs surveyed + 2 repo-only checks).
- [x] **Taxonomy clean-up post-Batch 4**: B-RR / B-FD directional sub-classes.
- [x] **Tier 3 hypothesis matrix LOCKED** with all-46 data.
- [x] **Section 7 banner reliability LOCKED.**
- [x] **Section 8 prevention recommendation LOCKED.**
- [x] **PK approval of Option F (2026-05-05 late-evening, v2.40).**
- [ ] Build phase (separate session, ~4-5h): drift-check EF + m.ef_drift_log table + dashboard panel + deploy wrapper.
- [ ] Triage phase (after build): work the 13-case existing-drift list.

M6 Phase A and F-YT-NY-FORMAT-SELECTION remain BLOCKED until build phase closes.

---

## 10. Decisions

**D-PREV-01** (2026-05-05) — Inventory pacing: chunked batches of ~10 EFs.
**D-PREV-02** — Class C is the highest-priority case to surface.
**D-PREV-03** — `ingest` banner non-conformance is a finding, not a defect.
**D-PREV-04** (post-Batch 2) — CRLF/LF differences are NOT classified as drift.
**D-PREV-05** (post-Batch 2) — `image-worker` minification is NOT drift requiring sync.
**D-PREV-06** (post-Batch 2) — `heygen-intro` and `heygen-youtube-upload` Class D treatment.
**D-PREV-07** (post-Batch 2) — `insights-worker` B-RR drift will NOT be auto-synced.
**D-PREV-08** (post-Batch 3) — MCP `SERVER_INFO.version` is a legitimate alternative banner pattern.
**D-PREV-09** (post-Batch 3) — `chatgpt-review-worker` and `inspector` lack any machine-readable version field; rely on body-hash comparison.
**D-PREV-10** (post-Batch 3) — Drift is concentrated, not uniform; prevention prioritises detection over prevention.
**D-PREV-11** (post-Batch 4) — SECURITY-DEFINER-vs-exec_sql drift is the highest-severity drift category within B-RR.
**D-PREV-12** (post-Batch 4) — Forward-drift (B-FD) is a separate state from regression-risk drift (B-RR); reporting must distinguish them.
**D-PREV-13** (post-Batch 4 cleanup) — Classification taxonomy locked: structural axis (A/B/C/D/repo-only) + directional axis (B-RR/B-FD).
**D-PREV-14** (post-Batch 5) — Final prevention recommendation locked: Option F. Build effort ~4-5h split across two sessions. Awaiting PK approval to proceed.
**D-PREV-15** (post-Batch 5) — Repo-only directories are a separate state from drift; surfaced in detection output as informational.
**D-PREV-16** (2026-05-05 late-evening, v2.40) — **PK approved Option F as the target prevention design.** Build to occur in a separate session (not concurrent with brief closure). M6 Phase A and F-YT-NY-FORMAT-SELECTION remain blocked until build phase closes and the drift-check infrastructure is live + the 4 P1 triage cases (3 SECURITY-DEFINER + insights-worker) are addressed.

---

_End of brief. Tier 2 complete. Recommendation APPROVED. Build is a separate session item. No EF patches, no deploys, no NY×YT, no M6 Phase A until build phase closes._
