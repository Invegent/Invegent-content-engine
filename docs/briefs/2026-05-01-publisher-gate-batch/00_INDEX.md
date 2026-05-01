# Publisher Gate Batch — 2026-05-01

**Authored by**: Claude (chat) under D-01 standing rule
**Reviewer**: ChatGPT (red-team review required before deploy/apply)
**Deployer**: PK (post-ChatGPT-approval)

## Round status

- **Round 1 complete** — 7 amendments captured in `08_amendments_round_1.md`. All folded into briefs.
- **Round 2 complete** — 2 amendments (1 HIGH-severity) captured in `09_amendments_round_2.md`. Both folded in.
- **Round 3 review pending** — PK shares folder URL with ChatGPT.

## Context

Tonight's investigation surfaced that **three publishers (FB, LinkedIn, YT) are missing approval-status gates**. IG and WordPress correctly gate. Plus auto-approver starvation (F-PUB-004) is independently P0.

Reference: `docs/00_action_list.md` v2.9 commit (latest on main).

**Eight catches in this session.** Structured red-team review v1 (D-01) is performing as designed. Each layer surfaces deeper issues:
1. Wrong YT trigger fix averted (earlier today)
2. Wrong bulk-quarantine of 87 legacy FB drafts averted (phone session)
3. v2.3→v2.4 missing controls caught (T09/T10/T11/O-07/O-08/O-09/R13)
4. D-09 reframing → T12 created
5. Pre-DDL source pull → LinkedIn publisher gate-missing (F-PUB-005 reframed)
6. ChatGPT v2.6 review → FB + YT publishers also missing gates
7. ChatGPT round-1 review of v2.7 → T08-A HIGH severity catch + 6 other amendments
8. **ChatGPT round-2 review of v2.8 → T08-A semantic bug (eligibility/content gate conflation) HIGH severity** + T10 constraint check

## Deploy sequence (post round-3 review)

Micro-staged in-session, smoke check between each:

1. **T17** — `youtube-publisher` v1.6.0 (smallest; blocks T06/T11)
2. **T18** — `publisher` (FB) v1.8.0 — gated on FB queue-status go/no-go
3. **T13** — `linkedin-zapier-publisher` v1.1.0 + `linkedin-publisher` v1.2.0
4. **T08** — `auto-approver` v1.6.0 + SQL migration v3 (round-2 revised). P-B snapshot first, then S13/S14 config-gap observation, then staged `{limit: 5}` first run
5. **T10** — pre-fix queue disposition (round-2 amended): step 0 introspection ✓; step 3 smoke check on first batch
6. **T09** — safe-to-resume publisher checklist (round-1 amended check 7 platform-specific)
7. **T14** — crosspost RPC audit findings (no patch; documentation only)

## Files in this batch

| # | Brief | Type | Owner |
|---|---|---|---|
| 01 | `01_t17_youtube_publisher_gate.md` | EF source patch | PK deploys |
| 02 | `02_t18_facebook_publisher_gate.md` | EF source patch + go/no-go | PK deploys |
| 03 | `03_t13_linkedin_publishers_gate.md` | EF source patch (×2) | PK deploys |
| 04 | `04_t08_auto_approver_stratify_cooldown.md` | SQL migration v3 + EF source patch | PK applies + deploys |
| 05 | `05_t14_crosspost_rpc_audit.md` | Audit findings (no patch) | Documentation |
| 06 | `06_t09_safe_to_resume_publisher_checklist.md` | Operational checklist | PK walks pre-cron-flip |
| 07 | `07_t10_pre_fix_queue_disposition.md` | Disposition queries + step 0/3 | PK executes post-T08+T13+T18 |
| 08 | `08_amendments_round_1.md` | Round-1 ChatGPT review amendments | Reference |
| 09 | `09_amendments_round_2.md` | Round-2 ChatGPT review amendments (NEW) | Reference |

## Round-3 ChatGPT review prompts

1. T08 SQL v3 + EF defence-in-depth design — are there any remaining ways for eligibility-gate failures to terminal-reject drafts?
2. T08 Q1 post-step query catches regression if defence-in-depth fires — sufficient observability?
3. T10 step 3 smoke check on first 10-row batch — sufficient to catch downstream breakage when `'skipped'` is first written to production?
4. Any other patches in the batch that conflate "system decision" with "operator decision" the same way T08-A did?

## New issues surfaced during authoring

- **B25 (in action_list backlog)**: `seed-and-enqueue-linkedin-every-10m` cron + extended trigger.
- **S13 + S14 (NEW v2.9)**: standing observation queries for missing/disabled auto-approve config gaps.
