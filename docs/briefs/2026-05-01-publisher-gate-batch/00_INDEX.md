# Publisher Gate Batch — 2026-05-01

**Authored by**: Claude (chat) under D-01 standing rule
**Reviewer**: ChatGPT (red-team review required before deploy/apply)
**Deployer**: PK (post-ChatGPT-approval)

## B + C plan (PK confirmed v2.11)

**Decoupled deploy**: ship cleared publisher gates without further delay; hold T08 for focused adversarial review.

### Workstream 1 — Publisher gates (cleared by ChatGPT round-3)

1. PK takes brief `11_round4_confirmation_publishers_independent.md` to ChatGPT for quick yes/no on independence
2. If yes: deploy micro-staged — T17 → T18 (with go/no-go) → T13 (Zapier + direct repo patch)
3. Post-deploy: smoke check S12 between each
4. T10 disposition + T09 checklist follow per existing briefs

### Workstream 2 — T08 adversarial review (parallel)

1. PK takes brief `12_t08_adversarial_review_prompt.md` to ChatGPT for round-4-T08 with explicit adversarial framing (Q1–Q7)
2. Live dry-run output included for inspection (639 candidates, 9 buckets, all eligible)
3. PK confirms operator intent for CFW IG, Invegent IG, CFW FB before T08 deploys (Q5)
4. If round-4-T08 finds HIGH issues: fold into T08 v5
5. If clean: T08 deploys per existing staged-run protocol

## Round status

- **Round 1 complete** — 7 amendments folded
- **Round 2 complete** — 2 amendments folded (1 HIGH-severity)
- **Round 3 complete** — 1 HIGH-severity bypass + 1 observability note folded
- **Round 4 — PUBLISHER track**: PK to share brief 11 with ChatGPT
- **Round 4 — T08 track**: PK to share brief 12 with ChatGPT (adversarial framing)

**9 catches in this session**, 3 consecutive on T08-A. Pattern signal: terminal-decision authority requires extra scrutiny (Lesson #51 candidate).

## Files in this batch

| # | Brief | Status |
|---|---|---|
| 01 | `01_t17_youtube_publisher_gate.md` | Cleared — deploy first |
| 02 | `02_t18_facebook_publisher_gate.md` | Cleared — deploy second (with go/no-go) |
| 03 | `03_t13_linkedin_publishers_gate.md` | Cleared — deploy third |
| 04 | `04_t08_auto_approver_stratify_cooldown.md` | **HOLD** — awaiting round-4-T08 adversarial verdict |
| 05 | `05_t14_crosspost_rpc_audit.md` | Documentation only |
| 06 | `06_t09_safe_to_resume_publisher_checklist.md` | Cleared — PK walks before cron flips |
| 07 | `07_t10_pre_fix_queue_disposition.md` | Cleared — PK executes post-T08+T13+T18 |
| 08 | `08_amendments_round_1.md` | Reference — round 1 |
| 09 | `09_amendments_round_2.md` | Reference — round 2 |
| 10 | `10_amendments_round_3.md` | Reference — round 3 |
| **11** | `11_round4_confirmation_publishers_independent.md` | **NEW — round-4 publisher confirmation prompt** |
| **12** | `12_t08_adversarial_review_prompt.md` | **NEW — round-4-T08 adversarial prompt with live dry-run** |

## Open items not blocking deploy

- **B25**: `seed-and-enqueue-linkedin-every-10m` cron audit (post T13 deploy + 7d obs)
- **B26**: audit other SQL functions / EFs for eligibility-vs-content gate conflation
- **B27**: audit other lateral-join patterns for filter-in-WHERE vs authoritative-row-then-check
- **B28 (NEW v2.11)**: verify operator intent for CFW IG, Invegent IG, CFW FB auto-approve config (per round-4-T08 Q5)
