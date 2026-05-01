# Publisher Gate Batch — 2026-05-01

**Authored by**: Claude (chat) under D-01 standing rule
**Reviewer**: ChatGPT (red-team review required before deploy/apply)
**Deployer**: PK (post-ChatGPT-approval)

## Context

Tonight's investigation surfaced that **three publishers (FB, LinkedIn, YT) are missing approval-status gates**. IG and WordPress correctly gate. Plus auto-approver starvation (F-PUB-004) is independently P0.

Reference: `docs/00_action_list.md` v2.7 commit `6fe2bb1e`.

## Deploy sequence (per PK + ChatGPT decision)

Micro-staged in-session, smoke check between each:

1. **T17** — `youtube-publisher` v1.6.0 (smallest; blocks T06/T11)
2. **T18** — `publisher` (FB) v1.8.0
3. **T13** — `linkedin-zapier-publisher` v1.1.0 + `linkedin-publisher` v1.2.0 (deployed + repo-only)
4. **T08** — `auto-approver` v1.6.0 + SQL migration `m.auto_approver_fetch_drafts_v2` (after publisher gates safe)
5. **T10** — pre-fix queue disposition (executed by PK after T08)
6. **T09** — safe-to-resume publisher checklist (walked by PK before any cron flip)
7. **T14** — crosspost RPC audit findings (no patch; documentation only)

## Files in this batch

| # | Brief | Type | Owner |
|---|---|---|---|
| 01 | `01_t17_youtube_publisher_gate.md` | EF source patch | PK deploys |
| 02 | `02_t18_facebook_publisher_gate.md` | EF source patch | PK deploys |
| 03 | `03_t13_linkedin_publishers_gate.md` | EF source patch (×2) | PK deploys |
| 04 | `04_t08_auto_approver_stratify_cooldown.md` | SQL migration + EF source patch | PK applies + deploys |
| 05 | `05_t14_crosspost_rpc_audit.md` | Audit findings (no patch) | Documentation |
| 06 | `06_t09_safe_to_resume_publisher_checklist.md` | Operational checklist | PK walks pre-cron-flip |
| 07 | `07_t10_pre_fix_queue_disposition.md` | Disposition queries + decision tree | PK executes post-T08+T13+T18 |

## ChatGPT review prompts (suggested)

1. Are the three publisher-gate patches semantically equivalent across the three platforms? Any subtle differences that would matter?
2. T17 fetch-time pattern vs per-row — confirmed the fetch-time pattern is correct for direct-read publishers?
3. T08 stratification SQL — does the fair-share design avoid all the failure modes that caused F-PUB-004?
4. T08 reject-cooldown — does setting `approval_status='rejected'` interact correctly with `trg_handle_draft_rejection` (which resets the slot)?
5. T10 decision tree — are there populations missing? (P-A IG, P-B cycling drafts, P-C LinkedIn+FB needs_review)
6. T09 checklist — adequate to prevent the T07 step 4 mistake from recurring?
7. T14 — is the LinkedIn seeding cron (B25) something to investigate before T13 deploy or after?

## Acceptance batch-level

- All 7 briefs reviewed by ChatGPT
- All P0 patches deployed in sequence (T17 → T18 → T13 → T08)
- T10 disposition executed
- T09 checklist walked before T07 IG cron re-enable
- S12 standing check (post-deploy) confirms zero `'needs_review'`-state published rows in 24h post-deploy across all platforms

## New issues surfaced during authoring

- **B25 (NEW)**: `seed-and-enqueue-linkedin-every-10m` cron and the trigger extension referenced in the disabled `crosspost_facebook_to_linkedin` RPC's body — needs investigation. Could be another unguarded enqueue path. T14 documents this; B25 carries forward to next session.
