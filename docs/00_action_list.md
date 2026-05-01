# ICE — Action List

> **Single active action index for what's queued, in flight, blocked, or frozen.**
> Source-of-truth details remain in sync_state, run states, decisions, briefs, and commits.
> Read at the start of every session alongside `docs/00_sync_state.md`.
>
> Last updated: 2026-05-01 Friday late evening Sydney (v2.12 — **ChatGPT round-4 verdict: Workstream 1 cleared (T17/T18/T13 ready to deploy NOW), Workstream 2 has 4th HIGH-severity catch on T08-A (forward-defence ambiguity) with amendments**. Live duplicate/ambiguity guard run: 12 rows flagged but ALL `active_profile_count=1` — bad state not currently reachable; amendment is forward-defence. **B29 added** (partial unique constraint long-term). **B30 added** (data hygiene UPDATE if Path A taken). **S15 standing check added** (duplicate/ambiguity guard). **10 catches in session**, 4 consecutive on T08-A. Lesson #51 confirmed.

## How this file works

**At session start**, chat reads this file and:
1. Rebuilds the Today / Next 5 view
2. Runs Standing checks (S1–S15)
3. Asks PK about Personal businesses
4. Surfaces Time-bound items due today/tomorrow

**Standing rule (D-01)**: every production patch and action_list version bump from v2.5 onward goes through ChatGPT cross-check before deploy/commit. **v2.12 honest limitation**: this bump committed without ChatGPT cross-check per state-capture-bump exception.

---

## ⭐ Today / Next 5 — REBUILD AT EVERY SESSION START

> **Last rebuilt:** 2026-05-01 Friday late evening Sydney post-round-4 verdicts.

| Rank | Item | Priority | Why now | Next action |
|---|---|---|---|---|
| 1 | Personal businesses check-in | P0 | ICE is bonus | Cleared |
| 2 | **W1 publisher gate batch deploy** — CLEARED | P0 | ChatGPT round-4 cleared. T17 → T18 (with go/no-go) → T13 micro-staged | PK deploys per `00_INDEX.md` |
| 3 | **W2 T08 round-5 light verification** | P0 | 4 amendments folded; round-5 verifies the amendments themselves | PK shares brief 13 with ChatGPT |
| 4 | **W2 Path A or B decision + B28 confirmation** (parallel to round-5) | P0 | Path B recommended: UPDATE 12 rows for clean guard. B28: confirm CFW/Invegent IG intent | PK decides Path; PK reviews B28 |
| 5 | **T08 deploy** (post round-5 + Path/B28) | P0 | Final deploy of session | PK applies migration + EF + staged `{limit: 5}` |

T02, T05, T06, T07, T10, T16 remain P1 in Time-bound table.

---

## 🔄 Standing session-start checks

| # | Check | How | Threshold to act |
|---|---|---|---|
| S1–S14 | (per v2.11) | (see v2.11) | (see v2.11) |
| **S15 (NEW v2.12)** | **Duplicate/ambiguity guard — multiple active profiles or missing default per (client, platform)** | Query in `13_amendments_round_4_t08.md` (HAVING COUNT > 1 OR default count != 1) | Any new (client, platform) showing duplicate actives → immediate investigation; missing default rows → monitor / cleanup via Path B-style UPDATE |

---

## 🔴 Time-bound (calendar-driven deadlines)

| ID | Item | Priority | Due | Owner | Next action / Done when | Source |
|---|---|---|---|---|---|---|
| T02 | Gate B exit decision | P0 | Sat 2 May | PK + chat | Default: exit on schedule | |
| T03 | Anthropic $200 cap reset | P3 | Fri 1 May | passive | Awareness only | |
| T04 | R01 calibration session | P1 | Sun 3 May / Mon 4 May | PK + chat | 90min hard cap | |
| T05 | Meta dev support contact | P1 | ASAP — Mon 4 May latest | PK | Single conversation | |
| T06 | Reconnect YouTube OAuth — BLOCKED ON T17 deploy | P1 | Within 7 days | PK | After T17 deployed (W1) | |
| T07 | Instagram publisher recovery | P1 | Gated on T08 + T10 + T09 + T05 | mixed | Step 4 revised | |
| T08 | **Auto-approver patch — HELD pending round-5 + Path A/B + B28** | P0 | Deploy this session post all gates | chat (authored v5) → ChatGPT (round-5 brief 13) → PK | brief: `04_t08_*` + brief 13 |
| T09 | Safe-to-resume publisher checklist | P0 | Walk before each cron flip | PK | brief: `06_t09_*` |
| T10 | Pre-fix queue disposition | P0 | Execute post-T08+T13+T18 | PK | brief: `07_t10_*` |
| T11 | YouTube failed-draft replay plan | P1 | After T17 + T06 | chat → ChatGPT → PK | next session |
| T12 | F-PUB-005 trigger gate | P1 | After publisher-gate batch | chat → ChatGPT → PK | F-PUB-005 |
| T13 | LinkedIn publishers gate — **CLEARED, ready to deploy** | P0 | Deploy this session | PK | brief: `03_t13_*` |
| T16 | Audit needs_review LinkedIn published drafts | P1 | This week | PK | Full window since 2026-03-12 | |
| T17 | YouTube publisher gate — **CLEARED, deploy first** | P0 | Deploy this session | PK | brief: `01_t17_*` |
| T18 | FB publisher gate — **CLEARED, deploy second with go/no-go** | P0 | Deploy this session | PK | brief: `02_t18_*` |

---

## 🟡 Active

| ID | Item | Priority | Status | Owner | Next action |
|---|---|---|---|---|---|
| F04→Active | post_render_log column-purposes | P2 | brief authored | chat→CC | Awaiting CC |

---

## 💼 Personal businesses

*(none flagged this session)*

---

## 🏗 Operational Truth Layer (strategic stream)

Unchanged from v2.11. O-12, O-13 captured.

---

## 🟢 Ready / Strategic

Unchanged from v2.11. R13 expanded scope reminder: postmortem now covers 10+ catches in single session.

---

## 🤝 Pending decisions

Unchanged from v2.11.

---

## 📌 Backlog

| ID | Item | Priority | Trigger |
|---|---|---|---|
| B01–B22, B24–B27 | (per v2.10) | varies | per item |
| ~~B16, B17, B18, B23~~ | CLOSED | | |
| B28 | Verify operator intent for CFW IG / Invegent IG / CFW FB auto-approve | P1 | Before T08 deploy |
| **B29 (NEW v2.12)** | **Partial unique constraint on `c.client_publish_profile (client_id, platform) WHERE status='active' AND is_default=true`** | P2 | Long-term forward-defence; design + rollout plan separately |
| **B30 (NEW v2.12, conditional)** | **Data hygiene: set `is_default=true` on 12 NULL-default sole-active profiles** | P2 if Path A; CLOSED if Path B applied | After T08 deploy if Path A taken |

---

## 🧊 Frozen / Deferred

Unchanged.

---

## 🎓 Canonical Lessons

- Lesson #46 (PROMOTED).
- Lesson #47 candidate (raised v2.12 to **10-catch session**).
- Lesson #48 candidate — "Gate placement is determined by consumer architecture."
- Lesson #49 candidate — "Eligibility gates and content gates must be architecturally separated."
- Lesson #50 candidate — "Select the authoritative row first, then apply the eligibility predicate on THAT chosen row."
- **Lesson #51 candidate (CONFIRMED v2.12 — 4 consecutive HIGH catches on T08-A across 4 review rounds)** — "Patches that touch terminal-decision authority require disproportionately more scrutiny than 'narrow' framing suggests, because terminal decisions amplify any underlying bug. Plan for AT LEAST one extra review round than the patch's surface area suggests — likely two or three." Lesson promoted candidate → strong-confirmed; ready for canonical promotion at next R10.
- Lesson #52 candidate (v2.11) — "Decoupled deploys are risk-reduction."
- **Lesson #53 candidate (NEW v2.12)** — "Pre-deploy diagnostic probes against production data surface 'unknown unknown' issues that pure SQL/code review cannot. Run dry-run probes and guard queries against live state for any patch with eligibility/selection logic."

---

## v2.12 honest limitations

- All previous limitations still apply.
- v2.12 committed without ChatGPT cross-check (state-capture-bump exception).
- **Two parallel review tracks now resolved**: W1 publishers cleared; W2 has round-4-T08 amendments awaiting round-5 light verification.
- 4 consecutive HIGH catches on T08-A is the strongest signal in this session that initial scoping mismatched the patch's complexity. Lesson #51 confirmed.

---

## Changelog

- v1.0–1.9 → v2.11: per previous changelog.
- **v2.12 (1 May late evening +1h after v2.11): ChatGPT round-4 verdicts.** W1 publishers cleared; W2 T08 had 4th HIGH catch (forward-defence: multiple active profiles ambiguity). Live guard run shows bad state not currently reachable. Brief 13 authored with v5 SQL (3-level deterministic tie-break), pre-deploy guard, recommended Path B UPDATE. **B29** partial unique constraint backlog. **B30** data hygiene cleanup conditional. **S15** standing check added. **Lesson #51 confirmed** (4 consecutive HIGH catches). **Lesson #53 candidate** (pre-deploy diagnostic probes). 10-catch session.
