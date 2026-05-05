# F-EF-DRIFT-PREVENTION — Edge Function Source Drift Prevention

**Date:** 2026-05-05 (evening, post-v2.39 + sync commit `7ba441e2`)
**Status:** ACTIVE — P1 inspection (no patch, no deploy)
**Parent:** RECONCILE-EF-DRIFT (CLOSED by commit `7ba441e2aba18cd848c67a6283e6376a8846f91a`)
**Project:** mbkmaxqhsohbtwsqolns
**Repo:** Invegent/Invegent-content-engine
**Total deployed EFs:** **46** (per `Supabase:list_edge_functions`, 2026-05-05 ~22:00 UTC)
**Tier 2 progress:** 41/46 surveyed (89%) — Batches 1+2+3+4 complete

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

Batch 3 changed the picture in the opposite direction:

- **All 10 EFs in Batch 3 came back Class A.** Critical infrastructure that has been built recently and deployed carefully (MCP bridges, pipeline observability/healing trio, inspector tooling, weekly reports) is in clean sync.

**Batch 4 (this update) brings the picture into sharp focus and is the most consequential batch since Batch 1 for diagnosing root cause.** Highlights:

- **Three Class B cases all share the same architectural fix being undone in repo:** `heygen-avatar-creator` (v2.0.0 → v2.2.0), `heygen-avatar-poller` (v1.0.0 → v2.0.0), and `draft-notifier` (v1.0.0 → v1.1.0). In every one of these three, the deployed version replaces a broken `exec_sql` UPDATE on the `c` or `m` schema with a `SECURITY DEFINER` `rpc()` call. The repo source uses the broken pattern that we know from project memory does not work (`exec_sql` is read-only on `c`, `f`, `m`, `t` schemas — DML silently fails). **A repo redeploy of any of these three would silently re-introduce a known broken state in production.** This is the highest-severity drift pattern observed across the entire investigation so far.
- **Two Class B cases bring real feature drift:** `series-writer` v1.3.0 deployed adds `source_material` and `format_preference` (per c.content_series schema migration on 20 Mar 2026); repo is still v1.2.0. `heygen-avatar-poller` adds an entirely different state-machine and switches HeyGen API host (api.heygen.com → api2.heygen.com endpoints "discovered via browser network inspection").
- **First forward-drift case observed:** `feed-discovery` repo is at v1.2.0 with a banner explicitly documenting that the commit was authored to align repo with deployed convention (`config.feed_url` not `config.url`) and to add an OR-fallback dedupe query for legacy rows. Deployed is still at v1.1.0. This is the inverse failure mode of `youtube-publisher`: a known-good pending deploy that hasn't shipped. Forward-drift is benign in operational terms but it is a separate state the prevention recommendation must distinguish.
- **Class C body-drift trap cases keep accumulating.** `onboarding-notifier`, `ai-profile-bootstrap`, `series-outline`, and `email-ingest` all have banner-equality and body-difference. The `series-outline` body-drift includes a real prompt enrichment difference (carousel guidance, narrative-arc instruction) that affects content generation quality.

The investigation's prevention conclusion is now firm enough to lock for Section 8 even before the remaining 5 EFs are surveyed:

- **Body-comparison must run periodically.**
- **Banner-only checks are insufficient (Class C is the trap case, now demonstrated 6 times).**
- **The most dangerous drift class is the SECURITY-DEFINER-vs-exec_sql pattern, because the repo source compiles and lints cleanly but does not function in production.** A drift detection script that surfaces this class as a special category would let PK triage these as urgent (they are the cases where a repo redeploy would actively break production).

Batch 4's clean-sweep of an opposite-failure case (`feed-discovery`'s forward-drift) also clarifies that the prevention design must report TWO different states, not one: "deployed is ahead of repo" (the high-risk case) and "repo is ahead of deployed" (the benign-but-noteworthy case). Treating them as a single "drift" signal would create false-positive noise on every commit-before-deploy workflow PK uses.

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
3. **Identify whether version banners inside EFs are reliable.** Cases to test: (a) banner present and matches deploy slug; (b) banner present but stale relative to deployed body; (c) banner absent; (d) banner matches both repo and deployed but bodies differ (the `youtube-publisher` trap case); (e) banner present and slug-prefix correct, but version field is a feature tag rather than a semver number; (f) banner is in a comment with no `VERSION` constant at all (heygen utility class); (g) banner uses MCP-style `SERVER_INFO.version` constant rather than top-level `VERSION` constant; **(h) banner has version number but no slug prefix at all (feed-discovery `1.2.0`).**
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
**Tier 2 — Body-level comparison (in batches of ~10)** — IN PROGRESS (41/46 surveyed).
**Tier 3 — Hypothesis matrix and recommendation** — partial (matrix updating after each batch; Section 8 will firm up after Batch 5).

Body-comparison protocol per EF:
- `Supabase:get_edge_function` returns full source for every deployed slug.
- `github:get_file_contents` returns the corresponding repo file when the directory exists.
- Five classes recorded per EF:
  - **CLASS A — clean**: deployed banner matches deploy slug AND repo body byte-equals deployed body. Subclass: **A (line-ending only)** — bodies differ only in CRLF vs LF.
  - **CLASS B — banner-drift**: deployed banner differs from repo banner. Banner check would catch this. Subclass: **B (forward-drift)** — repo version is AHEAD of deployed (pending deploy, not stale source).
  - **CLASS C — body-drift trap**: deployed banner equals repo banner BUT body differs (the `youtube-publisher` case, also `image-worker`, `feed-intelligence`, `onboarding-notifier`, `ai-profile-bootstrap`, `series-outline`, `email-ingest`).
  - **CLASS D — missing**: repo directory absent.
  - **REVERSE-DRIFT** — repo directory exists but no deployed counterpart.

---

## 4. Tier 1 baseline — deployed inventory (post-Batch 4)

Captured from `Supabase:list_edge_functions` 2026-05-05 ~22:00 UTC. **46 EFs**, all `ACTIVE` status. Repo-presence column resolved through the sync work + Tier 2 batches.

| # | Slug | Deploy version | Repo dir? | Class (post-Batch 4) |
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
| 10 | email-ingest | 37 | ✓ | **C cosmetic** (Batch 4) |
| 11 | draft-notifier | 38 | ✓ | **B** (Batch 4) |
| 12 | image-worker | 59 | ✓ | **C** (Batch 2) |
| 13 | series-outline | 37 | ✓ | **C** (Batch 4) |
| 14 | series-writer | 38 | ✓ | **B** (Batch 4) |
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
| 26 | heygen-avatar-creator | 28 | ✓ | **B** (Batch 4) |
| 27 | heygen-avatar-poller | 31 | ✓ | **B** (Batch 4) |
| 28 | onboarding-notifier | 22 | ✓ | **C** (Batch 4) |
| 29 | brand-scanner | 22 | ✓ | **A line-ending** (Batch 4) |
| 30 | ai-profile-bootstrap | 21 | ✓ | **C** (Batch 4) |
| 31 | weekly-manager-report | 25 | ✓ | **A** (Batch 3) |
| 32 | pipeline-sentinel | 22 | ✓ | **A** (Batch 3) |
| 33 | pipeline-diagnostician | 22 | ✓ | **A** (Batch 3) |
| 34 | pipeline-healer | 22 | ✓ | **A** (Batch 3) |
| 35 | client-weekly-summary | 22 | ✓ | **A** (Batch 3) |
| 36 | insights-feedback | 22 | ✓ | TBD |
| 37 | instagram-publisher | 24 | ✓ | **A line-ending** (Batch 2) |
| 38 | linkedin-zapier-publisher | 24 | ✓ | A (Batch 1) |
| 39 | wordpress-publisher | 21 | ✓ | **A** (Batch 2) |
| 40 | feed-discovery | 22 | ✓ | **B forward-drift** (Batch 4) |
| 41 | external-reviewer | 13 | ✓ | TBD |
| 42 | external-reviewer-digest | 11 | ✓ | TBD |
| 43 | system-auditor | 11 | ✓ | TBD |
| 44 | chatgpt-review-worker | 5 | ✓ | **A line-ending** (Batch 3) |
| 45 | mcp-chatgpt-bridge | 8 | ✓ | **A line-ending** (Batch 3) |
| 46 | mcp-github-bridge | 4 | ✓ | **A** (Batch 3) |

Repo-only directories (reverse-drift candidates): `ai-diagnostic` and `linkedin-publisher` (still pending Batch 5 verification).

**Cumulative class distribution across 41 surveyed EFs (Batches 1+2+3+4):** A=22 (54%), B=6 (15%, of which 1 forward-drift), C=6 (15%), D=7 (17%).

---

## 5. Tier 2 — per-EF drift inventory (Batches 1+2+3+4 complete)

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

### Batch 4 (2026-05-05) — onboarding + drafts + feed support

| # | Slug | Deploy ver | Banner | Banner conv | Repo SHA | Body match | Class | Op importance |
|---|---|---|---|---|---|---|---|---|
| 1 | onboarding-notifier | 22 | `onboarding-notifier-v2.0.0` | ✓ semver | `f69b51a3` | **NO — comments stripped + 1 `(c: string)` type annotation added in deployed callback** | **C** | MED — onboarding emails (operator + client) |
| 2 | brand-scanner | 22 | `brand-scanner-v1.0.1` | ✓ semver | `2d027f3c` | LF/CRLF only | **A line-ending** | MED — onboarding logo + brand-colour extract |
| 3 | ai-profile-bootstrap | 21 | `ai-profile-bootstrap-v1.0.0` | ✓ semver | `847cdb02` | **NO — slug variable refactor in `buildPrompt` + comment differences** | **C** | MED — onboarding AI profile gen (Claude API) |
| 4 | **heygen-avatar-creator** | 28 | deployed `v2.2.0` ≠ repo `v2.0.0` | ✓ semver | `021e8994` | **NO — substantial drift: deployed uses `Pixar` style enum (vs repo `Animated`) + `save_avatar_generation()` SECURITY DEFINER fn (vs repo direct `exec_sql` UPDATE on `c.brand_avatar`)** | **B** | MED — avatar gen entry point. **Repo redeploy would silently fail** (exec_sql is read-only on c schema per project memory). |
| 5 | **heygen-avatar-poller** | 31 | deployed `v2.0.0` ≠ repo `v1.0.0` | ✓ semver | `895c9b17` | **NO — major architectural drift: deployed uses `api2.heygen.com/v2/avatar_group` endpoints "discovered via browser network inspection" + 4 SECURITY DEFINER fns (`store_gen_poll_response`, `advance_avatar_to_creating`, `complete_avatar_training`, `fail_avatar_generation`); repo uses `api.heygen.com/v2/photo_avatar/train` + direct `exec_sql` UPDATE on `c.brand_avatar`** | **B** | MED — pg_cron 60s. **Repo redeploy would silently fail** (broken endpoints + broken schema writes). |
| 6 | series-outline | 37 | `series-outline-v1.2.0` | ✓ semver | `522871e3` | **NO — repo single-line compacted; deployed has expanded prompt with extra carousel guidance + narrative-arc instruction + console.error log** | **C** | MED — series outline gen (content quality affected) |
| 7 | **series-writer** | 38 | deployed `v1.3.0` ≠ repo `v1.2.0` | ✓ semver | `da3d55de` | **NO — deployed banner explicitly notes "v1.3.0 — Source material + format preference support; both fields added to c.content_series schema (20 Mar 2026)". Deployed reads `series.source_material` and `series.format_preference`; repo doesn't.** | **B** | MED — series writer gen. Repo would lose v1.3.0 features (source-material injection + format override). |
| 8 | **draft-notifier** | 38 | deployed `v1.1.0` ≠ repo `v1.0.0` | ✓ semver | `0839cc56` | **NO — banner explicitly notes "Fix v1.1: use public.mark_drafts_notified(uuid[]) SECURITY DEFINER function instead of exec_sql UPDATE which was silently failing (m schema not writable via exec_sql)." Repo still uses the broken exec_sql UPDATE on `m.post_draft`.** | **B** | **HIGH — approval flow + duplicate-email risk.** Repo redeploy would re-introduce a known production bug: drafts never get marked as notified, so every 30min cron run would send the same review-email batch to clients. |
| 9 | email-ingest | 37 | `email-ingest-v1` | ✗ slug-prefix correct, version `v1` not semver (same as `inspector_sql_ro`) | `10d4500d` | **NO — repo single-line compacted, deployed has section dividers + slightly different `console.warn` text on ingest_run insert fallback** | **C cosmetic** | MED — Gmail label ingest (newsletter/ndis, newsletter/property). No functional risk. |
| 10 | feed-discovery | 22 | deployed `1.1.0` ≠ repo `1.2.0` | **✗ no slug prefix at all (bare `1.x.y`)** | `76607246` | **NO — repo is AHEAD of deployed.** Repo banner explicitly documents the alignment commit (28 Apr 2026): `config.url` → `config.feed_url` + OR-fallback dedupe query for legacy rows. Repo author notes the commit makes a fresh `supabase functions deploy` from main safe. | **B forward-drift** | LOW — feed-source provisioning. Functionally compatible (deployed v1.1.0 still works since all live rows since 28 Apr use `feed_url`). |

**Batch 4 totals:** A=1 (line-ending), B=5 (one of which is forward-drift), C=4. No D. No reverse-drift.

**Batch 4 critical observation: SECURITY DEFINER pattern is the single largest source of dangerous drift.** Three of the five Class B cases in this batch (`heygen-avatar-creator`, `heygen-avatar-poller`, `draft-notifier`) share the exact same architectural fix: replace a broken `exec_sql` UPDATE on the `c` or `m` schema (which fails silently per project memory) with a `SECURITY DEFINER` function called via `.rpc()`. The repo still has the broken pattern. **A repo redeploy of any of these three would silently re-introduce a known production bug.** The fourth Class B (`series-writer`) is feature drift, not pattern drift. The fifth (`feed-discovery`) is forward-drift, not regression risk.

### Cumulative across Batches 1+2+3+4 (41 EFs surveyed)

A=22 (54%), B=6 (15%, of which 1 forward-drift), C=6 (15%), D=7 (17%).

A breakdown: 7 line-ending-only-different + 15 byte-identical = 22.

### Already characterised in RECONCILE-EF-DRIFT (pre-sync state, historical record)

| ai-worker | 99 | ai-worker-v2.9.0 → v2.11.1 | banner-drift | _was B_ |
| heygen-worker | 22 | heygen-worker-v1.0.0 → v1.1.0 | banner-drift | _was B_ |
| video-worker | 36 | absent → v2.1.0 | missing | _was D_ |
| youtube-publisher | 38 | v1.6.0 ↔ v1.6.0 body-diff | trap | _was C_ |

---

## 6. Tier 3 — root-cause hypothesis matrix (post-Batch 4)

| Hypothesis | Likelihood | Evidence pattern |
|---|---|---|
| **Manual CLI `supabase functions deploy` without commit** | **HIGH-CONFIRMED** | Class B count now 6 (`insights-worker`, `heygen-avatar-creator`, `heygen-avatar-poller`, `series-writer`, `draft-notifier`, `feed-discovery`). 3 of these have explicit "Fix vX.Y: ..." banners that show the deploy was the result of a hands-on patch, not a CI flow. RECONCILE-EF-DRIFT pattern (3/4 of original sync targets were banner-drift). |
| **Windows CLI deploy without git autocrlf normalization** | **HIGH-CONFIRMED** | content_fetch + instagram-publisher (Batch 2), inspector + inspector_sql_ro + chatgpt-review-worker + mcp-chatgpt-bridge (Batch 3), brand-scanner (Batch 4) all have CRLF deployed / LF repo. 7/30 (23%) of repo-comparable EFs across surveyed batches show this pattern. Consistent with PK's local repo at `C:\Users\parve\Invegent-content-engine`. |
| **Source minification before deploy** | possible (single case) | `image-worker` only. Could indicate (a) intentional minification, (b) hand-deployed minified copy, (c) dashboard-edit converting formatting. Functionally equivalent to repo. |
| **Supabase dashboard inline-edit** | **MEDIUM-HIGH** | Suspected for `ingest` (Class D, feature-tag banner). Suspected for `heygen-intro` and `heygen-youtube-upload` (Class D, no VERSION constant, utility-style). **New evidence from Batch 4:** `onboarding-notifier` deployed has comments stripped + 1 type annotation added relative to repo (no functional change), which is a textbook signature of a Studio inline-edit (developer auto-formats / annotates while editing in browser). |
| **Uncommitted local working-tree edit** | **MEDIUM** | Indistinguishable from CLI-deploy without local-machine evidence. `series-outline` and `email-ingest` Class C cases (single-line compacted in repo, multi-line expanded in deployed) suggest the inverse — repo was compacted *after* deploy, possibly by a code-formatter run that wasn't redeployed. |
| **Class C "polish drift" — repo cleanup never deployed** | **CONFIRMED** | `feed-intelligence` repo has dead code removed; deployed still has it. `series-outline` and `email-ingest` are similar (repo was reformatted single-line-style after deploy). `ai-profile-bootstrap` repo extracted slug as variable. |
| **SECURITY-DEFINER-vs-exec_sql architectural drift** | **NEW — CONFIRMED, 3 cases in Batch 4** | `heygen-avatar-creator` v2.2.0 banner: "use public.save_avatar_generation() SECURITY DEFINER fn for c schema write". `draft-notifier` v1.1.0 banner: "use public.mark_drafts_notified(uuid[]) SECURITY DEFINER function instead of exec_sql UPDATE which was silently failing (m schema not writable via exec_sql)." `heygen-avatar-poller` v2.0.0 implicitly carries the same pattern. **All three repo source files still use the broken `exec_sql` UPDATE pattern**. Project memory documents this exact pattern: "`exec_sql` / `execute_sql` is effectively read-only on `c`, `f`, `m`, `t` schemas — DML silently fails. All mutations require `SECURITY DEFINER` functions in `public` schema called via `.rpc()`". **The drift is not random — it is a recurring fix being recurringly stripped from the repo**, likely because the EF was patched in dashboard or via CLI without a corresponding repo edit. |
| **Forward-drift (repo ahead of deployed, pending deploy)** | **NEW — CONFIRMED, 1 case** | `feed-discovery` repo v1.2.0 with explicit alignment-commit banner; deployed still v1.1.0. Documented at commit time ("a fresh `supabase functions deploy feed-discovery` from main is safe"). This is a benign state, not regression, but the prevention recommendation must distinguish this from regression-drift. |
| **Parallel agent / chat window deploy** | LOW-MEDIUM | No direct evidence. Memory references "ChatGPT-reviewed in 4 rounds" for some banners. |
| **GitHub Actions / CI absent or bypassed** | **CONFIRMED** | The repo has no `.github/workflows/` EF-deploy pipeline. All deploys are manual. |
| **Recent / careful deploys are clean; older / hand-fixed deploys drift** | **CONFIRMED — strongly** | Batch 3 sweep was 10/10 clean (MCP, observability, weekly reports). Batch 4 onboarding flow had mixed results: brand-scanner clean, AI/notifier path drifted 4-of-5. The drift pattern correlates with EFs that have had a hand-patch applied to fix a schema-write or HeyGen-API problem after initial deploy. |
| **Deploy machine determines line-ending** | **likely** | Mix of CRLF-deployed and LF-deployed EFs across batches. Drift detection script must normalize line endings regardless. |

The top-level finding is now sharper: **drift is not just "the default state without a CI deploy pipeline"; it is actively recurring at specific failure seams — the c/m/f/t schema-write boundary and the HeyGen-API-discovery boundary.** Both are places where the running production system needs a fix that the repo source doesn't provide. The fix gets applied in the dashboard or via CLI hot-deploy, then the repo source is forgotten until inspection like this catches it.

---

## 7. Banner reliability — running (post-Batch 4, 41/46 EFs surveyed)

**Banner conformance:**
- 28/41 deployed banners follow the `<slug>-vX.Y.Z` semver convention
- 2/41 use feature-tag style with non-numeric semver field:
  - `ingest-v8-youtube-channel` (Batch 1)
  - `content-fetch-v2.4-rpc` (Batch 2)
- 2/41 use `<slug>-vN` style (single-digit major version, not full semver):
  - `inspector-sql-ro-v1` (Batch 3)
  - `email-ingest-v1` (Batch 4)
- 4/41 have **no `VERSION` constant at all** — banner is a comment-only line:
  - `heygen-intro` (Batch 2)
  - `heygen-youtube-upload` (Batch 2)
  - `inspector` (Batch 3) — Hono multi-endpoint pattern
  - `chatgpt-review-worker` (Batch 3) — comment refs spec brief, no version constant
- 2/41 use **MCP `SERVER_INFO.version` pattern** instead of top-level `VERSION`:
  - `mcp-chatgpt-bridge` (Batch 3) — `SERVER_INFO = { name: 'mcp-chatgpt-bridge', version: '1.2.2' }`
  - `mcp-github-bridge` (Batch 3) — `SERVER_INFO = { name: 'mcp-github-bridge', version: '2.0.0' }`
- 1/41 uses **bare version-only** banner with no slug prefix:
  - `feed-discovery` (Batch 4) — `VERSION = "1.2.0"` (in repo; deployed has `"1.1.0"`).

That is **11/41 (27%) non-conforming** to the simple `VERSION = "<slug>-vX.Y.Z"` pattern. Of the 11, 2 follow a defensible alternative (MCP SERVER_INFO).

**Body-vs-banner relationship:**
- 22/41 (54%) Class A — banner matches deploy slug, body matches repo
  - 15 truly byte-identical
  - 7 line-ending-only-different (CRLF vs LF)
- 6/41 (15%) Class B — banner numerically different between deployed and repo. Banner check would catch this. **One is forward-drift (feed-discovery).**
- 6/41 (15%) Class C — banner identical between deployed and repo, body different. **Banner check FAILS for Class C.**
- 7/41 (17%) Class D — no repo file to compare.

**Locked recommendations (firm, won't change with remaining 5 EFs):**
- **Banner-only check is INSUFFICIENT for full drift detection** — it cannot detect Class C cases (`youtube-publisher`, `image-worker`, `feed-intelligence`, `onboarding-notifier`, `ai-profile-bootstrap`, `series-outline`, `email-ingest`). Class C now has 7 confirmed cases including the original sync-target.
- **Banner-only check is also UNRELIABLE** because ~27% of EFs don't follow the simple top-level `VERSION` convention. A check that hard-requires `<slug>-vX.Y.Z` would falsely flag ~11 EFs as malformed when they are merely non-conforming.
- **Production prevention mechanism must body-compare** (not banner-compare) on a periodic basis.
- **Body-comparison should normalize line endings** before computing equality. Otherwise CRLF/LF mismatches will create constant false-positive drift signals.
- **Body-comparison should distinguish forward-drift from regression-drift.** When repo is ahead of deployed, this is a pending deploy, not a regression. Reporting should treat them as different states.
- **The semver convention is opt-in not contractual.** Recommendation will treat banner content as advisory and a useful triage filter, but never as the sole evidence of parity.
- **MCP SERVER_INFO pattern is a legitimate alternative**, not drift. Drift detection will recognise both patterns; reporting will surface non-conforming EFs as informational, not as drift.
- **NEW: SECURITY-DEFINER-vs-exec_sql drift is the highest-severity class.** When a repo source uses `exec_sql` UPDATE on `c`, `f`, `m`, or `t` schemas while the deployed source uses a `.rpc()` call to a SECURITY DEFINER function, the repo is silently broken. Drift detection should flag this category as urgent — these are the cases where a repo redeploy actively re-introduces production bugs.

---

## 8. Prevention options — preliminary (post-Batch 4)

_Lock to come after Batch 5. Current ranking based on 41/46 evidence:_

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

**NEW (post-Batch 4) — Option F: B + C + targeted pattern detection for SECURITY-DEFINER-vs-exec_sql drift.**
The drift script in Option B would also lex-scan deployed and repo source for `await supabase.rpc('exec_sql', ...)` patterns specifically targeting `UPDATE c.`, `UPDATE m.`, `UPDATE f.`, or `UPDATE t.` schemas. When detected in repo but NOT in deployed (replaced by `.rpc('<fn_name>', ...)` calls), surface as a special "schema-write regression risk" category. This would catch the three Batch 4 critical cases automatically and let PK triage them as urgent before a careless redeploy. Cost: ~30 extra lines in the drift script, a single regex set.

---

## 9. Tasks

- [x] Brief created with scope locked.
- [x] Tier 1: complete repo-presence check for all 46 deploy slugs.
- [x] Count discrepancy reconciled (46 not 47).
- [x] **Batch 1 complete** (11 EFs).
- [x] **Batch 2 complete** (10 EFs).
- [x] **Batch 3 complete** (10 EFs): inspector, inspector_sql_ro, chatgpt-review-worker, mcp-chatgpt-bridge, mcp-github-bridge, pipeline-sentinel, pipeline-diagnostician, pipeline-healer, weekly-manager-report, client-weekly-summary.
- [x] **Batch 4 complete** (10 EFs): onboarding-notifier, brand-scanner, ai-profile-bootstrap, heygen-avatar-creator, heygen-avatar-poller, series-outline, series-writer, draft-notifier, email-ingest, feed-discovery.
- [ ] Batch 5 (~5 EFs): final tail (compliance-reviewer, external-reviewer, external-reviewer-digest, system-auditor, insights-feedback) plus reverse-drift checks on `ai-diagnostic` and `linkedin-publisher`.
- [ ] Tier 3: lock root-cause hypothesis matrix with all-46 data.
- [ ] Section 7: lock banner-reliability assessment with all-46 data.
- [ ] Section 8: rank prevention options on (friction, coverage, latency, FP-rate). Decide whether Option F (SECURITY-DEFINER pattern detector) is in scope.
- [ ] Section 8: lock recommendation and present for PK approval.

No EF patching, no deploys, no NY×YT or M6 work until this brief is closed and PK has approved a recommendation.

---

## 10. Decisions

**D-PREV-01 (2026-05-05) — Inventory pacing: chunked batches of ~10 EFs.**
Rationale: full 46-EF inventory in one session would consume excessive context and prevent mid-investigation course correction. Batches let PK redirect after each report.

**D-PREV-02 (2026-05-05) — Class C is the highest-priority case to surface.**
Banner-only checks miss Class C; the `youtube-publisher` case demonstrated this. Batch 2 confirmed twice (`image-worker`, `feed-intelligence`). Batch 4 added four more (`onboarding-notifier`, `ai-profile-bootstrap`, `series-outline`, `email-ingest`). Class C now has 7 confirmed cases — it is a recurring failure mode, not an edge case.

**D-PREV-03 (2026-05-05) — `ingest` banner non-conformance is a finding, not a defect.**
The feature-tag banner style cannot be programmatically compared to a deploy version number, but it is informative for the operator. Recommendation will treat semver banners as advisory only; drift detection must rely on body-comparison.

**D-PREV-04 (2026-05-05, post-Batch 2) — CRLF/LF line-ending differences are NOT classified as drift.**
At least 7/30 repo-comparable EFs across surveyed batches differ from deployed by CRLF vs LF only. Drift detection script must normalize line endings before comparison; otherwise nearly every Windows-deployed EF will produce a false-positive.

**D-PREV-05 (2026-05-05, post-Batch 2) — `image-worker` minification is NOT classified as drift requiring sync.**
Deployed and repo are functionally equivalent; the difference is whitespace/formatting. Sync would replace minified deployed source with formatted repo source, which is harmless but unnecessary.

**D-PREV-06 (2026-05-05, post-Batch 2) — `heygen-intro` and `heygen-youtube-upload` Class D treatment.**
Both are utility/test EFs with no `VERSION` constant. Drift detection will include them; banner-format requirement does not apply.

**D-PREV-07 (2026-05-05, post-Batch 2) — `insights-worker` Class B drift will NOT be auto-synced.**
The repo (v1.6.0) is many versions behind deployed (v14.0.0). Sync would mean overwriting the repo with deployed source. PK should review the deployed source for correctness before accepting it as canonical. Logged as a follow-up sync candidate.

**D-PREV-08 (2026-05-05, post-Batch 3) — MCP `SERVER_INFO.version` is a legitimate alternative banner pattern.**
Both `mcp-chatgpt-bridge` and `mcp-github-bridge` follow this pattern because the MCP protocol's `initialize` response requires a `serverInfo` dictionary that includes a `version` field. Drift detection should:
- recognise the `SERVER_INFO = { ..., version: 'X.Y.Z' }` pattern as a valid version source
- compare the version field across deployed and repo for these EFs
- not flag absence of top-level `VERSION` constant as a drift signal when SERVER_INFO is present

**D-PREV-09 (2026-05-05, post-Batch 3) — `chatgpt-review-worker` and `inspector` lack any machine-readable version field.**
For drift detection these EFs must rely entirely on body-hash comparison; no version-field signal is available. The drift report cannot say "deployed v1.5.2, repo v1.4.0" for these two — only "drift / no-drift" based on body bytes.

**D-PREV-10 (2026-05-05, post-Batch 3) — Drift is concentrated, not uniform.**
Batch 3's clean sweep (10/10 Class A) confirms that drift accumulates at specific seams. Recently built and carefully deployed infrastructure is in clean sync. The prevention recommendation should prioritise *detection of existing drift* over *prevention of new drift in well-managed code*.

**D-PREV-11 (2026-05-05, post-Batch 4) — SECURITY-DEFINER-vs-exec_sql drift is the highest-severity drift category.**
Three Batch 4 cases (`heygen-avatar-creator`, `heygen-avatar-poller`, `draft-notifier`) all share the same pattern: deployed source replaces a broken `exec_sql` UPDATE on `c.brand_avatar` or `m.post_draft` with a `SECURITY DEFINER` function called via `.rpc()`. Repo source still has the broken pattern. Per project memory: "`exec_sql` / `execute_sql` is effectively read-only on `c`, `f`, `m`, `t` schemas — DML silently fails. All mutations require `SECURITY DEFINER` functions in `public` schema called via `.rpc()`". A repo redeploy of any of these three would silently re-introduce a known production bug. Drift detection should:
- detect this pattern specifically (regex for `\.rpc\('exec_sql'.*UPDATE [cmft]\.` in repo source)
- when detected in repo AND NOT in deployed (replaced by named `.rpc()` calls), surface as a special "schema-write regression risk" alert
- treat this as P1 sync priority — these cases need backfill commits, not just monitoring
Option F (Section 8) addresses this with a targeted pattern detector. Option F is the strongest candidate addition to the recommendation post-Batch 4.

**D-PREV-12 (2026-05-05, post-Batch 4) — Forward-drift is a separate state, not a regression.**
`feed-discovery` repo v1.2.0 is ahead of deployed v1.1.0 with an explicit alignment-commit banner. This is a pending deploy, not stale source. Drift detection should:
- compare version numbers when banner is parseable
- distinguish "deployed > repo" (regression risk — the dangerous case) from "repo > deployed" (pending deploy — benign)
- report forward-drift as informational only, not as an alert
- still trigger a body-hash drift signal (the bodies differ), but classify it as forward-drift in the report
Without this distinction, every commit-before-deploy workflow PK uses would generate a false-positive alert.

---

_End of brief. Batch 5 next; checkpoint will report after that batch and lock the final recommendation in Section 8._
