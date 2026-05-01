# Publisher Gate Batch — 2026-05-01

**Authored by**: Claude (chat) under D-01 standing rule
**Reviewer**: ChatGPT (red-team review required before deploy/apply)
**Deployer**: PK (post-ChatGPT-approval)

## Round status

- **Round 1 complete** — 7 amendments captured in `08_amendments_round_1.md`. Folded.
- **Round 2 complete** — 2 amendments (1 HIGH-severity) captured in `09_amendments_round_2.md`. Folded.
- **Round 3 complete** — 1 HIGH-severity bypass + 1 observability note captured in `10_amendments_round_3.md`. Folded.
- **Round 4 review pending** — PK shares folder URL with ChatGPT.

**9 catches in this session.** Three consecutive HIGH-severity catches on T08-A across three review rounds. Pattern signal captured as Lesson #51 candidate.

## Context

Tonight's investigation surfaced that **three publishers (FB, LinkedIn, YT) are missing approval-status gates**. IG and WordPress correctly gate. Plus auto-approver starvation (F-PUB-004) is independently P0.

Reference: `docs/00_action_list.md` v2.10 commit (latest on main).

## Deploy sequence (post round-4 review)

Micro-staged in-session, smoke check between each:

1. **T17** — `youtube-publisher` v1.6.0
2. **T18** — `publisher` (FB) v1.8.0 — gated on go/no-go
3. **T13** — `linkedin-zapier-publisher` v1.1.0 + `linkedin-publisher` v1.2.0
4. **T08** — `auto-approver` v1.6.0 + SQL migration v4 (round-3 revised)
5. **T10** — disposition with `'skipped'` + 10-row smoke check first
6. **T09** — safe-to-resume checklist walked
7. **T14** — documentation closure

## Files in this batch

| # | Brief | Status |
|---|---|---|
| 01 | `01_t17_youtube_publisher_gate.md` | Cleared by ChatGPT |
| 02 | `02_t18_facebook_publisher_gate.md` | Cleared (with go/no-go gate) |
| 03 | `03_t13_linkedin_publishers_gate.md` | Cleared |
| 04 | `04_t08_auto_approver_stratify_cooldown.md` | **Round-3 amendments folded — awaiting round-4** |
| 05 | `05_t14_crosspost_rpc_audit.md` | Cleared (no patch needed) |
| 06 | `06_t09_safe_to_resume_publisher_checklist.md` | Cleared |
| 07 | `07_t10_pre_fix_queue_disposition.md` | Cleared (with 10-row smoke check) |
| 08 | `08_amendments_round_1.md` | Reference — round 1 |
| 09 | `09_amendments_round_2.md` | Reference — round 2 |
| 10 | `10_amendments_round_3.md` | Reference — round 3 (NEW) |

## Round-4 review prompts (T08-specific)

1. Does the v4 SQL have any remaining bypass paths? Could the lateral pick a row the publisher would NOT actually use?
2. Is there any state where `cpp.status='active'` returns multiple rows after ORDER BY tie-break, with non-deterministic outcome?
3. Are there other patches in the batch with similar "select from candidate set" logic that should be re-examined?
4. Given 3 consecutive HIGH catches on T08, is there a higher-confidence verification step (unit test, verification probe) recommended before deploy?

## Open items not blocking deploy

- **B25**: `seed-and-enqueue-linkedin-every-10m` cron audit (post T13 deploy + 7d obs)
- **B26**: audit other SQL functions / EFs for eligibility-vs-content gate conflation
- **B27 (NEW v2.10)**: audit other lateral-join patterns in the codebase for the v3 round-3 bypass class (filter inside inner WHERE vs JOIN ON authoritative selection)
