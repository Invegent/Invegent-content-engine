# ICE — Action List

> **Single active action index for what's queued, in flight, blocked, or frozen.**
> Source-of-truth details remain in sync_state, run states, decisions, briefs, and commits.
> Read at the start of every session alongside `docs/00_sync_state.md`.
>
> Last updated: 2026-05-01 Friday late evening Sydney (v2.11 — **PK confirmed B + C plan**: ship cleared publisher gates (T17/T18/T13) without further delay; hold T08 for focused adversarial review. Two parallel review tracks now: brief 11 (publisher confirmation) and brief 12 (T08 adversarial). **Live dry-run executed**: 639-draft pool across 9 buckets, all eligible under v4 SQL. **B28 added** (verify operator intent for smaller-client auto-approve configs). 9 catches in session.

## How this file works

**At session start**, chat reads this file and:
1. Rebuilds the Today / Next 5 view
2. Runs Standing checks (S1–S14)
3. Asks PK about Personal businesses
4. Surfaces Time-bound items due today/tomorrow

**Standing rule (D-01)**: every production patch and action_list version bump from v2.5 onward goes through ChatGPT cross-check before deploy/commit. **v2.11 honest limitation**: this bump committed without ChatGPT cross-check per state-capture-bump exception.

---

## ⭐ Today / Next 5 — REBUILD AT EVERY SESSION START

> **Last rebuilt:** 2026-05-01 Friday late evening Sydney post B+C decision.

| Rank | Item | Priority | Why now | Next action |
|---|---|---|---|---|
| 1 | Personal businesses check-in | P0 | ICE is bonus | Cleared |
| 2 | **Round-4 publisher confirmation (Workstream 1)** | P0 | Publisher gates cleared by round 3; brief 11 needs ChatGPT yes/no on independence | PK shares brief 11 with ChatGPT; expect short verdict |
| 3 | **Publisher gate batch deploy** (post W1 confirmation) | P0 | Decoupled from T08; ship to close LinkedIn unreviewed-publishing risk | PK deploys T17 → T18 → T13 micro-staged |
| 4 | **Round-4-T08 adversarial review (Workstream 2)** | P0 — parallel | Brief 12 includes live dry-run + Q1–Q7 adversarial questions | PK shares brief 12 with ChatGPT; expect deeper review |
| 5 | **Operator-intent verification for CFW IG / Invegent IG / CFW FB** (B28) | P1 | Round-4-T08 Q5 — dry-run shows all are auto_approve_enabled=true; confirm intentional | PK reviews `c.client_publish_profile` for these 3 (client_id, platform) combos |

T02, T05, T06, T07, T10, T16 remain P1 in Time-bound table.

---

## 🔄 Standing session-start checks

Unchanged from v2.10. S13 + S14 added in v2.9; S14 query revised in v2.10 to use authoritative-profile lateral pattern.

---

## 🔴 Time-bound (calendar-driven deadlines)

| ID | Item | Priority | Due | Owner | Next action / Done when | Source |
|---|---|---|---|---|---|---|
| T02 | Gate B exit decision | P0 | Sat 2 May | PK + chat | Default: exit on schedule | |
| T03 | Anthropic $200 cap reset | P3 | Fri 1 May | passive | Awareness only | |
| T04 | R01 calibration session | P1 | Sun 3 May / Mon 4 May | PK + chat | 90min hard cap | |
| T05 | Meta dev support contact | P1 | ASAP — Mon 4 May latest | PK | Single conversation | |
| T06 | Reconnect YouTube OAuth — BLOCKED ON T17 | P1 | Within 7 days | PK | After T17 deployed | |
| T07 | Instagram publisher recovery | P1 | Gated on T08 + T10 + T09 + T05 | mixed | Step 4 revised | |
| T08 | **Auto-approver patch — HELD pending round-4-T08 adversarial verdict** | P0 | Deploy when round-4-T08 clears | chat (authored) → ChatGPT (round-4-T08 brief 12) → PK | brief: `04_t08_*` + brief 12 |
| T09 | Safe-to-resume publisher checklist | P0 | Walk before each cron flip | PK | brief: `06_t09_*` |
| T10 | Pre-fix queue disposition | P0 | Execute post-T08+T13+T18 | PK | brief: `07_t10_*` |
| T11 | YouTube failed-draft replay plan | P1 | After T17 + T06 | chat → ChatGPT → PK | next session |
| T12 | F-PUB-005 trigger gate (defence-in-depth) | P1 | After publisher-gate batch | chat → ChatGPT → PK | F-PUB-005 |
| T13 | LinkedIn publishers gate — cleared | P0 | Deploy this week post brief-11 confirmation | chat (authored) → ChatGPT (brief 11) → PK | brief: `03_t13_*` |
| T16 | Audit needs_review LinkedIn published drafts | P1 | This week | PK | Full window since `linkedin-zapier-publisher` v1.0.0 deployed | |
| T17 | YouTube publisher gate — cleared | P0 | Deploy first post brief-11 confirmation | chat (authored) → ChatGPT (brief 11) → PK | brief: `01_t17_*` |
| T18 | FB publisher gate — cleared (with go/no-go) | P0 | Deploy second post brief-11 confirmation | chat (authored) → ChatGPT (brief 11) → PK | brief: `02_t18_*` |

---

## 🟡 Active

| ID | Item | Priority | Status | Owner | Next action |
|---|---|---|---|---|---|
| F04→Active | post_render_log column-purposes | P2 | brief authored | chat→CC | Awaiting CC |

---

## 💼 Personal businesses

| | | | | | |
|---|---|---|---|---|---|
| *(none flagged this session)* | | | | | |

---

## 🏗 Operational Truth Layer (strategic stream)

Unchanged from v2.10. O-12, O-13 captured. O-13 specifically documents the round-3 lateral-join pattern lesson.

---

## 🟢 Ready / Strategic

Unchanged from v2.10.

---

## 🤝 Pending decisions

Unchanged from v2.10.

---

## 📌 Backlog

| ID | Item | Priority | Trigger |
|---|---|---|---|
| B01–B22, B24–B27 | (per v2.10) | varies | per item |
| ~~B16, B17, B18, B23~~ | CLOSED | | |
| **B28 (NEW v2.11)** | **Verify operator intent for CFW IG / Invegent IG / CFW FB auto-approve configs** | P1 | Before T08 deploy (round-4-T08 Q5) |

---

## 🧊 Frozen / Deferred

Unchanged from v2.10.

---

## 🎓 Canonical Lessons

- Lesson #46 (PROMOTED).
- Lesson #47 candidate (raised v2.10 to 9-catch session).
- Lesson #48 candidate (v2.7) — "Gate placement is determined by consumer architecture."
- Lesson #49 candidate (v2.9) — "Eligibility gates and content gates must be architecturally separated."
- Lesson #50 candidate (v2.10) — "Select the authoritative row first, then apply the eligibility predicate on THAT chosen row."
- Lesson #51 candidate (v2.10) — "Patches that touch terminal-decision authority require disproportionately more scrutiny than 'narrow' framing suggests."
- **Lesson #52 candidate (NEW v2.11)** — "Decoupled deploys are an architectural risk-reduction tool. When two patches touch independent surface area, ship them on independent timelines so one's complexity doesn't gate the other's urgency. The architectural test: would shipping A without B introduce any cross-impact failure mode? If no, decouple by default."

---

## v2.11 honest limitations

- All previous limitations still apply.
- v2.11 committed without ChatGPT cross-check (state-capture-bump exception).
- **Two parallel review tracks now**: publisher confirmation (brief 11) + T08 adversarial (brief 12). PK manages both.
- **B28 verification of operator intent for smaller-client auto-approve configs** is a P1 BEFORE T08 deploys, not blocking publisher deploys.
- Live dry-run executed via Supabase MCP read-only — no DDL or DML touched. Confirmed via execute_sql, not apply_migration.

---

## Changelog

- v1.0–1.9 → v2.10: per previous changelog.
- **v2.11 (1 May late evening +30min after v2.10): PK confirmed B + C plan.** Decoupled deploy: T17/T18/T13 ship after brief-11 ChatGPT confirmation; T08 holds for round-4-T08 adversarial review per brief 12. Live dry-run executed against production via Supabase MCP read-only: 639-draft pool, 9 buckets, all currently eligible under v4 SQL. **B28** added (operator-intent verification for CFW IG, Invegent IG, CFW FB — all show `auto_approve_enabled=true` in dry-run). **Lesson #52 candidate** added (decoupled deploy as risk-reduction). Briefs 11 and 12 added to publisher-gate-batch folder.
