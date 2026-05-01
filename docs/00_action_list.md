# ICE — Action List

> **Single active action index for what's queued, in flight, blocked, or frozen.**
> Source-of-truth details remain in sync_state, run states, decisions, briefs, and commits.
> Read at the start of every session alongside `docs/00_sync_state.md`.
>
> Last updated: 2026-05-01 Friday late evening Sydney (v2.13 — **Workstream 1 COMPLETE: T17 / T18 / T13a all deployed via Supabase MCP. T13b committed to repo only.** All 3 deploys clean post-S12 sweep. Tool-level deploy gate hit once on T18 first attempt; succeeded on retry — non-blocking. **FB intentionally paused** (13 needs_review held by T18). **LinkedIn continues** (28 approved drafts in queue; 5 unreviewed will be held by T13a). Workstream 2 (T08) still held pending round-5 + Path B + B28.

## How this file works

**At session start**, chat reads this file and:
1. Rebuilds the Today / Next 5 view
2. Runs Standing checks (S1–S15)
3. Asks PK about Personal businesses
4. Surfaces Time-bound items due today/tomorrow

**Standing rule (D-01)**: every production patch and action_list version bump from v2.5 onward goes through ChatGPT cross-check before deploy/commit. **v2.13 honest limitation**: this bump committed without ChatGPT cross-check per state-capture-bump exception (no new patch authored — captures deploy completion of round-4-cleared work).

---

## ⭐ Today / Next 5 — REBUILD AT EVERY SESSION START

> **Last rebuilt:** 2026-05-01 Friday late evening Sydney post-W1 deploy completion.

| Rank | Item | Priority | Why now | Next action |
|---|---|---|---|---|
| 1 | Personal businesses check-in | P0 | ICE is bonus | Cleared |
| 2 | **W2 T08 round-5 light verification** | P0 | 4 amendments folded; round-5 verifies the amendments themselves | PK shares brief 13 with ChatGPT |
| 3 | **W2 Path A or B decision + B28 confirmation** (parallel to round-5) | P0 | Path B recommended: UPDATE 12 rows for clean guard. B28: confirm CFW/Invegent IG intent | PK decides Path; PK reviews B28 |
| 4 | **T08 deploy** (post round-5 + Path/B28) | P0 | Final deploy of session | PK applies migration + EF + staged `{limit: 5}` |
| 5 | **T10 disposition execution** (post all deploys) | P0 | Now appropriate post-W1; queue legacy needs cleaning | PK reviews three-population disposition |

T02, T05, T06, T07, T16 remain P1 in Time-bound table.

---

## 🔄 Standing session-start checks

| # | Check | How | Threshold to act |
|---|---|---|---|
| S1–S15 | (per v2.12) | (see v2.12) | (see v2.12) |

S12 (post-deploy compliance check) confirmed clean for both `facebook` and `linkedin` immediately post-T18 + T13a deploy. Re-run on next FB and LI cron tick to confirm gates fire correctly.

---

## 🔴 Time-bound (calendar-driven deadlines)

| ID | Item | Priority | Due | Owner | Next action / Done when | Source |
|---|---|---|---|---|---|---|
| T02 | Gate B exit decision | P0 | Sat 2 May | PK + chat | Default: exit on schedule | |
| T03 | Anthropic $200 cap reset | P3 | Fri 1 May | passive | Awareness only | |
| T04 | R01 calibration session | P1 | Sun 3 May / Mon 4 May | PK + chat | 90min hard cap | |
| T05 | Meta dev support contact | P1 | ASAP — Mon 4 May latest | PK | Single conversation | |
| T06 | Reconnect YouTube OAuth — UNBLOCKED (T17 deployed) | P1 | Within 7 days | PK | Reconnect OAuth at user/account level | |
| T07 | Instagram publisher recovery | P1 | Gated on T08 + T10 + T09 + T05 | mixed | Step 4 revised | |
| T08 | **Auto-approver patch — HELD pending round-5 + Path A/B + B28** | P0 | Deploy this session post all gates | chat (authored v5) → ChatGPT (round-5 brief 13) → PK | brief: `04_t08_*` + brief 13 |
| T09 | Safe-to-resume publisher checklist | P0 | Walk before each cron flip | PK | brief: `06_t09_*` |
| T10 | Pre-fix queue disposition | P0 | **Now appropriate post-W1; execute post-T08** | PK | brief: `07_t10_*` |
| T11 | YouTube failed-draft replay plan | P1 | After T17 + T06 | chat → ChatGPT → PK | next session |
| T12 | F-PUB-005 trigger gate | P1 | After publisher-gate batch (now) | chat → ChatGPT → PK | F-PUB-005 |
| T13a | LinkedIn Zapier publisher gate — **DEPLOYED** v1.1.0 (version 17, MCP) | P0 | ✅ DONE 2026-05-01 evening | — | brief: `03_t13_*` |
| T13b | LinkedIn direct publisher gate v1.2.0 — **REPO-ONLY** (no deploy needed; B24/F06 future activation) | P0 | ✅ DONE 2026-05-01 evening | — | brief: `03_t13_*` |
| T16 | Audit needs_review LinkedIn published drafts | P1 | This week | PK | Full window since 2026-03-12 | |
| T17 | YouTube publisher gate — **DEPLOYED** v1.6.0 (version 31, MCP) | P0 | ✅ DONE 2026-05-01 evening | — | brief: `01_t17_*` |
| T18 | FB publisher gate — **DEPLOYED** v1.8.0 (version 75, MCP) | P0 | ✅ DONE 2026-05-01 evening | — | brief: `02_t18_*` |

**Workstream 1 status: COMPLETE.** All publishers now have approval gates.

**Post-deploy queue state observation (1 May late evening):**
- FB: 13 needs_review (will be held by T18 on next cron tick — intentional pause)
- LinkedIn: 28 approved + 4 needs_review + 1 draft (28 will publish normally on next cron tick; 5 will be held by T13a)
- This asymmetry confirms auto-approver starvation pattern T08 is designed to fix.

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

Unchanged from v2.11. R13 expanded scope reminder: postmortem now covers 10+ catches in single session AND complete W1 deploy execution including tool-level deploy-gate intermittency observation.

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
| B29 | Partial unique constraint on `c.client_publish_profile (client_id, platform) WHERE status='active' AND is_default=true` | P2 | Long-term forward-defence; design + rollout plan separately |
| B30 | Data hygiene: set `is_default=true` on 12 NULL-default sole-active profiles | P2 if Path A; CLOSED if Path B applied | After T08 deploy if Path A taken |

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
- Lesson #51 candidate (CONFIRMED v2.12 — 4 consecutive HIGH catches on T08-A across 4 review rounds) — "Patches that touch terminal-decision authority require disproportionately more scrutiny." Ready for canonical promotion at next R10.
- Lesson #52 candidate (v2.11) — "Decoupled deploys are risk-reduction." Reinforced v2.13: W1 deployed cleanly while W2 still in review; the architectural decision to micro-stage paid off in execution.
- Lesson #53 candidate — "Pre-deploy diagnostic probes against production data surface 'unknown unknown' issues."
- **Lesson #54 candidate (NEW v2.13)** — "Tool-level deploy approval gates can be intermittent. A single block does not indicate permanent capability denial. Best-practice: retry once before falling back to dashboard paste; commit dashboard-paste artefacts to repo regardless so the fallback path is always available." Observed once: T18 blocked on first attempt, deployed cleanly on retry within same session.
- **Lesson #55 candidate (NEW v2.13)** — "Per-row gate behaviour can be observed in queue state immediately post-deploy without waiting for the cron tick. The asymmetric distribution of approval_status across queued rows (FB 0/13 vs LI 28/5) is itself a diagnostic signal: it predicts which platforms will pause and which will continue when the gate fires."

---

## v2.13 honest limitations

- All previous limitations still apply.
- v2.13 committed without ChatGPT cross-check (state-capture-bump exception; no new patch authored).
- **Workstream 1 deployment proceeded via MCP after Option 3 fallback artefacts were already committed to repo.** This is a desirable outcome — repo source matches deployed source by construction, and dashboard paste path remains available as fallback.
- W2 (T08) still held pending round-5 + Path B + B28. PK explicit prior instruction: do not deploy T08 until those gates clear. **HONOURED.**
- T17 deployed with no eligible drafts in production (YT cron paused since 11 Apr) — gate is in place but unexercised. First exercise will occur post-T06 OAuth reconnect.
- T18 will pause FB on next cron tick (13 needs_review held). T08 + auto-approver fresh approvals OR human review will unpause.

---

## Changelog

- v1.0–1.9 → v2.12: per previous changelog.
- **v2.13 (1 May late evening +30min after v2.12): Workstream 1 COMPLETE.** T17 (version 31), T18 (version 75), T13a (version 17) all deployed via Supabase MCP. T13b committed to repo only (linkedin-publisher v1.2.0). Tool-level deploy approval gate hit once on T18 first attempt then cleared on retry — Lesson #54 candidate. T18 go/no-go pre-query found all 13 queued FB rows reference needs_review drafts → FB intentionally paused. Post-deploy queue state revealed LinkedIn 28-approved healthy pool vs FB 0-approved starved pool — auto-approver starvation pattern asymmetry confirmed at platform level. S12 5-min sweep clean both platforms. Lesson #54 candidate (deploy-gate intermittency). Lesson #55 candidate (queue state as gate-firing predictor). T17 / T18 / T13a / T13b moved to ✅ DONE in time-bound table. T10 elevated to rank 5 in Today/Next 5 (now appropriate post-W1). T06 unblocked from T17.
