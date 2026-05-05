# Session — 2026-05-05 Sydney late-evening: F-EF-DRIFT-PREVENTION Tier 2 LOCKED + Option F APPROVED

## Scope

Continuation chat. Earlier session (compacted) completed Batches 1-3 of the F-EF-DRIFT-PREVENTION inventory. This chat completed Batches 4 + 5, applied a mid-session taxonomy cleanup at PK direction, locked the recommendation, and — on PK approval — closed the investigation phase. Read-only inspection scope throughout. No EF patches, no deploys, no NY×YT, no M6.

## Outcome

**Tier 2 inventory COMPLETE: 46/46 deployed EFs surveyed + 2 repo-only directories characterised.**

Final classification:
- A (clean) = 26 (57%) — 17 byte-identical + 9 line-ending-only (CRLF/LF)
- B-RR (regression-risk; deployed ahead of repo) = 5
- B-FD (forward-drift; repo ahead of deployed) = 1
- C (banner same, body differs — trap case) = 7 current state (8 ever-observed)
- D (repo file missing) = 7
- Repo-only directories = 2 (ai-diagnostic unclear, linkedin-publisher deliberate forward-staging)

**Option F APPROVED by PK as the target prevention design.** Build is a separate session.

## Decisions added this session

- **D-PREV-13** — Classification taxonomy locked. Two independent axes: structural (A / B / C / D / repo-only) + directional (B-RR / B-FD). Retired ambiguous "reverse-drift" terminology mid-session at PK direction.
- **D-PREV-14** — Final recommendation locked: Option F = drift-check EF (daily 03:00 AEST cron) + `m.ef_drift_log` table + CRLF-normalised body hashing + SECURITY DEFINER regression detector + dashboard drift panel + non-blocking `safe-deploy.sh` wrapper. Build effort ~4-5h split across two sessions.
- **D-PREV-15** — Repo-only directories are a separate state from drift; surfaced in detection output as informational.
- **D-PREV-16** — **PK approved Option F (2026-05-05 late-evening, v2.40).** Build occurs in a separate session. M6 Phase A and F-YT-NY-FORMAT-SELECTION remain blocked until build phase closes and the 4 P1 triage cases are addressed.

## Three commits this session

1. **`bec80b73`** — Batch 4 (10 EFs: onboarding + drafts + feed support). Used pre-cleanup "reverse-drift" terminology.
2. **`7bb588fa`** — Taxonomy cleanup per PK direction. Retired "reverse-drift". Introduced B-RR / B-FD directional sub-classes. Reconciled Class C count (current-state = 6 at that point; ever-observed = 7 with youtube-publisher pre-sync).
3. **`0abd8ca5`** — Batch 5 (5 EFs + 2 repo-only checks) + Tier 2 LOCK. Final cumulative: A=26, B-RR=5, B-FD=1, C=7 (current), D=7. Section 6 hypothesis matrix locked. Section 7 banner reliability locked. Section 8 prevention recommendation locked.

This session's commit (separate from this session file) marks the brief APPROVED status and triages the 13 cases into action_list priority buckets.

## Batch 4 + Batch 5 evidence highlights

- **3-of-5 B-RR cases share the SECURITY-DEFINER-vs-exec_sql pattern** (heygen-avatar-creator, heygen-avatar-poller, draft-notifier). Deployed source replaces broken `exec_sql` UPDATE on c/m schemas with `SECURITY DEFINER` rpc; repo still uses the broken pattern. **Repo redeploy of any of these = silent production bug.** Highest-severity drift category.
- **insights-worker** is the fourth B-RR case: deployed v14.0.0 vs repo v1.6.0 — substantial functional drift; D-PREV-07 says no auto-sync (PK manual review of deployed source for correctness first).
- **series-writer** (B-RR) is feature drift, not pattern drift: deployed v1.3.0 reads `c.content_series.source_material` and `format_preference` columns added 20 Mar 2026; repo v1.2.0 doesn't.
- **feed-discovery** is the only B-FD case: repo v1.2.0 explicitly aligns to deployed convention (`config.feed_url` not `config.url`) + OR-fallback dedupe; deployed still v1.1.0. Pending-deploy state, benign.
- **Class C cases that affect content quality**: `series-outline` (deployed has carousel guidance + narrative-arc instruction not in repo), `compliance-reviewer` (deployed has different system prompt and rules-scope label).
- **9/35 (26%) repo-comparable EFs have CRLF deployed / LF repo** — Windows CLI autocrlf signature, treated as Class A line-ending per D-PREV-04.
- **Recently-built infrastructure is clean.** Batch 3 (MCP bridges + observability trio + inspector pair + weekly reports) was 10/10 Class A. Batch 5 reviewer stack (external-reviewer, external-reviewer-digest, system-auditor, insights-feedback) was 4/5 Class A; only compliance-reviewer drifted.

## Standing rules honoured

- D170 (chat-applied migrations only): N/A this session (read-only).
- D186 (closure budget): see below.
- G1 (per-session file): this file.
- D-01 (ChatGPT review on production patches): **0 fires this session** — read-only inspection scope; no patches, no deploys, no DML.
- Lesson #61 (state-capture before destructive apply): N/A (no destructive apply).
- Lesson #62 (state-capture override): N/A.

## Closure budget

- This session: ~3h (Batch 4 inspection + taxonomy cleanup + Batch 5 inspection + repo-only checks + recommendation lock + brief status update + 4-way sync).
- Day total (5 May): ~10h (Tier 1 morning ~3.5h + M4 ~1h + M5 ~1.5h + F-YT-OAUTH-PP ~1h + F-EF-DRIFT-PREVENTION batches ~3h).
- Trailing-14-day: ~28h. Above 8.0h floor.
- Net P0+P1 open: 5 (T05 P1-urgent + F-EF-DRIFT-PREVENTION build pending + 3 P1 SECURITY-DEFINER triage + insights-worker P1). Within 20-finding cap.

## What's blocked

M6 Phase A and F-YT-NY-FORMAT-SELECTION remain blocked until F-EF-DRIFT-PREVENTION build phase closes AND the 4 P1 triage cases are addressed (3 SECURITY-DEFINER syncs + insights-worker manual review). The drift-check infrastructure being live before further EF patching is the precondition.

## Next session options (carry-forward)

A. Build F-EF-DRIFT-PREVENTION Option F (~4-5h, splittable across two sessions)
B. Triage P1 SECURITY-DEFINER regression-risk drift (heygen-avatar-creator, heygen-avatar-poller, draft-notifier sync repo → deployed)
C. Return to F-YT-NY-FORMAT-SELECTION after source safety is improved
D. M6 Phase A cleanup (108 historical Bug 3 dead-letter)

Personal businesses check-in remains the standing P0 at session start.
