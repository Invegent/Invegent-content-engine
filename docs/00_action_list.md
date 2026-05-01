# ICE — Action List

> **Single active action index for what's queued, in flight, blocked, or frozen.**
> Source-of-truth details remain in sync_state, run states, decisions, briefs, and commits — this file is the operational index that points at all of them.
> Read at the start of every session alongside `docs/00_sync_state.md`.
>
> Last updated: 2026-05-01 Friday late evening Sydney (v2.10 — **Round-3 ChatGPT review of publisher-gate batch complete**: 1 HIGH-severity bypass amendment + 1 observability note. **Third consecutive HIGH-severity catch on T08-A.** Pattern signal: terminal-decision authority requires extra scrutiny. **B27 added** (audit lateral-join patterns for the same bypass class). **Lesson #51 candidate** (terminal-decision authority needs extra rounds). 9 catches in session. Round-4 ChatGPT review pending before deploy.

## How this file works

**At session start**, chat reads this file and:
1. Rebuilds the Today / Next 5 view
2. Runs Standing checks (S1–S14)
3. Asks PK about Personal businesses
4. Surfaces Time-bound items due today/tomorrow

**Standing rule (D-01)**: every production patch and action_list version bump from v2.5 onward goes through ChatGPT cross-check before deploy/commit. **v2.10 honest limitation**: this bump committed without ChatGPT cross-check per PK's standing go-ahead for state-capture bumps documenting completed reviews.

---

## ⭐ Today / Next 5 — REBUILD AT EVERY SESSION START

> **Last rebuilt:** 2026-05-01 Friday late evening Sydney post-round-3 review.

| Rank | Item | Priority | Why now | Next action |
|---|---|---|---|---|
| 1 | Personal businesses check-in | P0 | ICE is bonus, not driver | Cleared |
| 2 | **Round-4 ChatGPT review of T08 (only)** | P0 | 3 consecutive HIGH-severity catches on T08-A; verify v4 SQL has no remaining bypass paths | PK shares folder URL with ChatGPT, focused round-4 prompts |
| 3 | **Publisher gate batch deploy** (post round-4 approval) | P0 | T17 → T18 → T13 → T08 micro-staged | PK deploys per `00_INDEX.md` |
| 4 | **T10 + T09 execution** (post deploys) | P0 | T10 step 3 smoke check first batch → T09 walked → T07 step 4 retry | PK executes per briefs |
| 5 | T02 — Gate B exit decision | P0 | Sat 2 May | Default: exit on schedule |

---

## 🔄 Standing session-start checks

| # | Check | How | Threshold to act |
|---|---|---|---|
| S1–S12 | (per v2.9) | (see v2.9) | (see v2.9) |
| S13 | Auto-approve config gap (missing rows) | LEFT JOIN cpp on (client_id, platform) where IS NULL | Any non-zero → add config row OR document |
| **S14** (revised v2.10) | **Auto-approve explicitly disabled on AUTHORITATIVE profile** | LATERAL pick of active+default cpp with `auto_approve_enabled=false` | Operator-intended human-review; review weekly |

S14 query revised in v2.10 to use authoritative-profile lateral pattern — mirrors round-3 T08 SQL fix. Definitive query in `04_t08_auto_approver_stratify_cooldown.md`.

---

## 🔴 Time-bound (calendar-driven deadlines)

| ID | Item | Priority | Due | Owner | Next action / Done when | Source |
|---|---|---|---|---|---|---|
| ~~T01~~ | ~~Phase B +24h obs~~ | — | — | — | **DONE.** | |
| T02 | Gate B exit decision | P0 | Sat 2 May | PK + chat | Default: exit on schedule | |
| T03 | Anthropic $200 cap reset | P3 | Fri 1 May | passive | Awareness only | |
| T04 | R01 calibration session | P1 | Sun 3 May / Mon 4 May | PK + chat | 90min hard cap | |
| T05 | Meta dev support contact | P1 | ASAP — Mon 4 May latest | PK | Single conversation | |
| T06 | Reconnect YouTube OAuth — BLOCKED ON T17 | P1 | Within 7 days | PK | After T17 deployed | |
| T07 | Instagram publisher recovery | P1 | Gated on T08 + T10 + T09 + T05 | mixed | Step 4 revised | |
| **T08** | Auto-approver patch (F-PUB-004 NARROW) — round-1 + round-2 + **round-3** amendments folded | P0 | Deploy this week post round-4 | chat → ChatGPT (round-4) → PK | brief: `04_t08_*` |
| T09 | Safe-to-resume publisher checklist | P0 | Walk before each cron flip | PK | brief: `06_t09_*` |
| T10 | Pre-fix queue disposition | P0 | Execute post-T08+T13+T18 | PK | brief: `07_t10_*` |
| T11 | YouTube failed-draft replay plan | P1 | After T17 + T06 | chat → ChatGPT → PK | next session |
| T12 | F-PUB-005 trigger gate (defence-in-depth) | P1 | After publisher-gate batch | chat → ChatGPT → PK | F-PUB-005 |
| T13 | LinkedIn publishers gate | P0 | Deploy this week | PK | brief: `03_t13_*` |
| T14 | crosspost RPC audit | — | — | — | **CLOSED.** | |
| ~~T15~~ | 5-publisher gate audit | — | — | — | **DONE.** | |
| T16 | Audit needs_review LinkedIn published drafts | P1 | This week | PK | Full window since `linkedin-zapier-publisher` v1.0.0 deployed | |
| T17 | YouTube publisher gate | P0 | Deploy first | PK | brief: `01_t17_*` |
| T18 | FB publisher gate | P0 | Deploy second (with go/no-go) | PK | brief: `02_t18_*` |

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

| ID | Item | Priority | Owner | First action | Notes |
|---|---|---|---|---|---|
| O-01 → O-11 | (per v2.9) | (see v2.9) | | | |
| O-12 | Eligibility-vs-content gate distinction documentation | P1 | chat | Capture round-2 lesson | T08 round-2 |
| **O-13 (NEW v2.10)** | **Authoritative-row-then-flag-check pattern documentation** | P1 | chat | Document the round-3 lesson — "select from candidate set, then check on the chosen row" pattern (vs filter-inside-WHERE) | T08 round-3 |

---

## 🟢 Ready / Strategic

| ID | Item | Priority |
|---|---|---|
| R07–R14 | (per v2.9) | (see v2.9) |

R13 expanded scope reminder: postmortem now covers 9+ catches in single session.

---

## 🤝 Pending decisions

| ID | Decision | Priority |
|---|---|---|
| ~~D-01..D-03, D-06, D-08..D-11~~ | RESOLVED | |
| D-04 | Invegent thin-pool resolution path | P2 |
| D-05 | Stage 1.2 brief merge or keep separate | P2 |
| D-07 | PP + NDIS-Yarns IG specific recovery | P1 |

---

## 📌 Backlog

| ID | Item | Priority | Trigger |
|---|---|---|---|
| B01–B15, B19–B22, B24, B25, B26 | (per v2.9) | (see v2.9) | |
| ~~B16, B17, B18, B23~~ | CLOSED | | |
| **B27 (NEW v2.10)** | **Audit other lateral-join patterns in codebase for filter-inside-WHERE vs authoritative-row-then-check pattern** | P2 | After T08 deploy + 7d obs |

---

## 🧊 Frozen / Deferred

Unchanged from v2.9.

---

## 🎓 Canonical Lessons

- **Lesson #46 (PROMOTED 30 Apr v2.2)** — "Cron health is not system health."
- **Lesson #47 candidate (RAISED v2.10 to 9-catch session)** — "Investigation following the source-of-truth principle reliably surfaces issues deeper than the initial hypothesis. Each red-team layer reveals the next."
  - Tonight's catch chain: trigger fix averted → bulk-quarantine averted → v2.3→v2.4 missing controls → D-09 reframing → pre-DDL source pull → LinkedIn publisher gate-missing → ChatGPT v2.6 caught FB+YT also missing → ChatGPT round-1 caught T08-A platform-scope → ChatGPT round-2 caught T08-A semantic conflation → **ChatGPT round-3 caught T08-A authoritative-profile bypass**.
  - **9 distinct review layers in one session.** Strong promotion candidate at next R10.
- **Lesson #48 candidate** (v2.7) — "Gate placement is determined by consumer architecture, not global preference."
- **Lesson #49 candidate** (v2.9) — "Eligibility gates (operator decisions) and content gates (system decisions) must be architecturally separated."
- **Lesson #50 candidate** (NEW v2.10) — "When filtering through a lateral subquery to derive eligibility, select the authoritative row first (matching downstream consumer logic), then apply the eligibility predicate on THAT chosen row — do not embed the predicate in the inner WHERE, where it can match a non-authoritative row."
- **Lesson #51 candidate** (NEW v2.10) — "Patches that touch terminal-decision authority (e.g. terminal-reject + slot-reset triggers) require disproportionately more scrutiny than 'narrow' framing suggests, because terminal decisions amplify any underlying bug. Plan for at least one extra review round than the patch's surface area would suggest."

---

## v2.10 honest limitations

- All previous limitations still apply.
- v2.10 committed without ChatGPT cross-check (state-capture-bump exception).
- **Round-4 ChatGPT review pending** before any deploy.
- T08-A round-3 catch is the third consecutive HIGH-severity issue on the same patch. Strong signal that T08 is not as "narrow" as initial scoping claimed. Round-4 prompts are T08-focused with explicit instruction to look for remaining bypass paths.
- B27 (lateral-join pattern audit) added; not blocking the immediate deploy after T08 round-4 clears.

---

## Changelog

- v1.0–1.9 → v2.9: per previous changelog entries.
- **v2.10 (1 May late evening +30min after v2.9): Round-3 ChatGPT review** — 1 HIGH-severity bypass amendment to T08 SQL (move `auto_approve_enabled=true` from inner WHERE to JOIN ON authoritative row) + 1 observability note (capture full responses preserving `eligibility_safety_net_fires`). Schema verified live. T08 SQL revised to v4. **B27** added (lateral-join pattern audit). **O-13** OTL ticket added. **Lessons #50 + #51** candidates added. **Pattern signal**: 3 consecutive HIGH-severity catches on T08-A across 3 review rounds; T08 should have been scoped as multi-concern from the start. Round-4 review pending before deploy.
