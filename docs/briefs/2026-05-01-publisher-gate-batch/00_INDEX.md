# Publisher Gate Batch — 2026-05-01

**Authored by**: Claude (chat) under D-01 standing rule
**Reviewer**: ChatGPT (red-team review required before deploy/apply)
**Deployer**: PK (post-ChatGPT-approval)

## Round-1 review status

**Round 1 complete** — 7 amendments captured in `08_amendments_round_1.md`. All folded into the relevant briefs in this folder. Round-2 ChatGPT review of the amendments now pending before deploy.

## Context

Tonight's investigation surfaced that **three publishers (FB, LinkedIn, YT) are missing approval-status gates**. IG and WordPress correctly gate. Plus auto-approver starvation (F-PUB-004) is independently P0.

Reference: `docs/00_action_list.md` v2.8 commit (latest on main).

## Deploy sequence (post round-2 review)

Micro-staged in-session, smoke check between each:

1. **T17** — `youtube-publisher` v1.6.0 (smallest; blocks T06/T11)
2. **T18** — `publisher` (FB) v1.8.0 — **NEW v2.8**: gated on go/no-go FB queue-status query first
3. **T13** — `linkedin-zapier-publisher` v1.1.0 + `linkedin-publisher` v1.2.0 (deployed + repo-only)
4. **T08** — `auto-approver` v1.6.0 + SQL migration — **NEW v2.8**: P-B snapshot first, then staged `{limit: 5}` first run, observe, escalate to full limit
5. **T10** — pre-fix queue disposition (executed by PK after publisher gates) — **NEW v2.8**: uses `'skipped'` status, split P-A by approval_status
6. **T09** — safe-to-resume publisher checklist (walked by PK before any cron flip) — **NEW v2.8**: check 7 platform-specific
7. **T14** — crosspost RPC audit findings (no patch; documentation only)

## Files in this batch

| # | Brief | Type | Owner |
|---|---|---|---|
| 01 | `01_t17_youtube_publisher_gate.md` | EF source patch | PK deploys |
| 02 | `02_t18_facebook_publisher_gate.md` | EF source patch + go/no-go | PK deploys |
| 03 | `03_t13_linkedin_publishers_gate.md` | EF source patch (×2) | PK deploys |
| 04 | `04_t08_auto_approver_stratify_cooldown.md` | SQL migration + EF source patch | PK applies + deploys |
| 05 | `05_t14_crosspost_rpc_audit.md` | Audit findings (no patch) | Documentation |
| 06 | `06_t09_safe_to_resume_publisher_checklist.md` | Operational checklist | PK walks pre-cron-flip |
| 07 | `07_t10_pre_fix_queue_disposition.md` | Disposition queries + decision tree | PK executes post-T08+T13+T18 |
| 08 | `08_amendments_round_1.md` | Round-1 ChatGPT review amendments (NEW) | Reference |

## Round-2 ChatGPT review prompts (suggested)

1. T08-A platform-scoped SQL + `auto_approve_config_found` + EF Set-aggregation — does the design produce exactly one warning per (client, platform) per run?
2. T08-D P-B snapshot — does the snapshot capture enough fields for retrospective review?
3. T18 go/no-go decision tree — are there other states beyond approved/needs_review/published that should branch differently?
4. T09 platform-specific check 7 — are all five publisher credential layouts captured correctly?
5. T10 P-A `skipped` semantics — confirm `'skipped'` is in the legal `m.post_publish_queue.status` enum (we have weak evidence from IG publisher source; need definitive check)?

## New issues surfaced during authoring

- **B25 (in action_list backlog)**: `seed-and-enqueue-linkedin-every-10m` cron + extended trigger — second LinkedIn enqueue path. Not blocking T13.
