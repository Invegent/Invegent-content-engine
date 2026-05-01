# Publisher Gate Batch — 2026-05-01

**Authored by**: Claude (chat) under D-01 standing rule
**Reviewer**: ChatGPT (red-team review required before deploy/apply)
**Deployer**: PK (post-ChatGPT-approval)

## Round status (v2.12)

- **Round 1 complete** — 7 amendments folded
- **Round 2 complete** — 2 amendments folded (1 HIGH-severity)
- **Round 3 complete** — 1 HIGH-severity bypass + 1 observability note folded
- **Round 4 publisher track** — ChatGPT cleared T17 / T18 / T13. **Ready to deploy now.**
- **Round 4 T08 track** — 1 HIGH-severity adversarial catch + amendments folded into `13_amendments_round_4_t08.md`. Round-5 light review pending.

**10 catches in this session**, 4 consecutive on T08-A.

## Workstream 1 — Publisher gates (CLEARED FOR DEPLOY)

ChatGPT round-4 verdict: "YES — T17/T18/T13 are functionally independent of T08 and remain cleared."

Deploy sequence:
1. **T17 YouTube** (smallest; blocks T06/T11)
2. **T18 Facebook** — RUN GO/NO-GO QUERY first; deploy as planned OR acknowledge intentional FB pause
3. **T13 LinkedIn Zapier + LinkedIn direct repo patch** (Zapier deploys; direct is repo-only commit)

Smoke check S12 between each. T10 disposition + T09 checklist follow per existing briefs.

## Workstream 2 — T08 (HOLD pending round-5 + Path A/B + B28)

ChatGPT round-4-T08 amendments per `13_amendments_round_4_t08.md`:
1. v5 SQL with `client_publish_profile_id DESC` final tie-break
2. Pre-deploy duplicate/ambiguity guard query
3. Path B (RECOMMENDED): UPDATE NULL `is_default` to true on sole-active profiles
4. Standing check S15 added

Before T08 deploys:
- PK takes round-4-T08 amendments to ChatGPT for round-5 light verification
- PK chooses Path A or Path B
- If Path B: pre-execution verification (expect 12 rows) → UPDATE → post-execution guard (expect 0 rows)
- B28 operator intent confirmed for CFW IG, Invegent IG, CFW FB
- Then T08 v5 migration + EF v1.6.0 deploy + staged `{limit: 5}` run

## Files in this batch

| # | Brief | Status |
|---|---|---|
| 01–07 | (unchanged from v2.10/v2.11) | T17/T18/T13/T09/T10/T14: cleared. T08: held. |
| 08–10 | Round 1–3 amendments | Reference |
| 11 | `11_round4_confirmation_publishers_independent.md` | Cleared by ChatGPT round 4 |
| 12 | `12_t08_adversarial_review_prompt.md` | Reviewed by ChatGPT round 4-T08 |
| **13** | `13_amendments_round_4_t08.md` | **NEW — round-4-T08 amendments awaiting round-5** |

## Open items not blocking publisher deploy

- B25, B26, B27 (per v2.11)
- **B28**: operator intent for CFW IG, Invegent IG, CFW FB — blocks T08 only
- **B29 (NEW v2.12)**: partial unique constraint on `(client_id, platform) WHERE status='active' AND is_default=true` — long-term forward-defence; backlog
- **B30 (NEW v2.12, Path A only)**: data hygiene UPDATE if PK chooses Path A tonight — backlog cleanup
