# ICE — Action List

> **Single active action index for what's queued, in flight, blocked, or frozen.**
> Source-of-truth details remain in sync_state, run states, decisions, briefs, and commits.
> Read at the start of every session alongside `docs/00_sync_state.md`.
>
> Last updated: 2026-05-01 Friday late evening Sydney (v2.14 — **Session close-out. Workstream 1 COMPLETE; T08 SQL v5 live; auto-approver EF v1.6.0 DEFERRED**). All critical production objectives achieved. EF v1.6.0 deferred due to missing source provenance from "v2.9 brief" reference; Lesson #51 honoured (terminal-decision authority needs disproportionate scrutiny). Stratification is already live in production via v1.5.0 EF calling the upgraded SQL function. Cooldown deferred deliberately.

## How this file works

**At session start**, chat reads this file and:
1. Rebuilds the Today / Next 5 view
2. Runs Standing checks (S1–S15)
3. Asks PK about Personal businesses
4. Surfaces Time-bound items due today/tomorrow

**Standing rule (D-01)**: every production patch and action_list version bump from v2.5 onward goes through ChatGPT cross-check before deploy/commit. **v2.14 honest limitation**: this bump committed without ChatGPT cross-check per state-capture-bump exception.

---

## ⭐ Today / Next 5 — REBUILD AT EVERY SESSION START

> **Last rebuilt:** 2026-05-01 Friday late evening Sydney session close-out.

| Rank | Item | Priority | Why now | Next action |
|---|---|---|---|---|
| 1 | Personal businesses check-in | P0 | ICE is bonus | Ask at next session start |
| 2 | **MONITOR auto-approver next cron tick** | P0 | First tick after T08 SQL v5 live; tells us if stratification alone is enough | Run S16 (new) on first cron tick post-session |
| 3 | **Reconstruct v1.6.0 EF source** | P0 | T08 not complete until cooldown ships; design needs careful authoring | Author from v1.5.0 + brief 09 design + cooldown spec; ChatGPT cross-check |
| 4 | **T10 disposition execution** | P0 | Now appropriate post-W1; queue legacy needs cleaning | Walk three-population disposition |
| 5 | T02 Gate B exit decision (if not actioned) | P0 | Sat 2 May | Default: exit on schedule |

---

## 🔄 Standing session-start checks

| # | Check | How | Threshold to act |
|---|---|---|---|
| S1–S15 | (per v2.13) | (see v2.13) | (see v2.13) |
| **S16 (NEW v2.14)** | **Auto-approver fresh-approval rate post-T08** — count approvals by (client, platform) bucket in 24h since session close, AND count repeat rank-1 failures across cron ticks | See queries in B31 brief (next session) | Repeat rank-1 failures > 3 across 3 ticks → cooldown is urgent → prioritise v1.6.0 EF |

---

## 🔴 Time-bound (calendar-driven deadlines)

| ID | Item | Priority | Due | Owner | Next action / Done when | Source |
|---|---|---|---|---|---|---|
| T02 | Gate B exit decision | P0 | Sat 2 May | PK + chat | Default: exit on schedule | |
| T03 | Anthropic $200 cap reset | P3 | Fri 1 May | passive | Awareness only | |
| T04 | R01 calibration session | P1 | Sun 3 May / Mon 4 May | PK + chat | 90min hard cap | |
| T05 | Meta dev support contact | P1 | ASAP — Mon 4 May latest | PK | Single conversation | |
| T06 | Reconnect YouTube OAuth — UNBLOCKED (T17 deployed) | P1 | Within 7 days | PK | Reconnect OAuth at user/account level | |
| T07 | Instagram publisher recovery | P1 | Gated on T08 EF + T10 + T09 + T05 | mixed | Step 4 revised; T08 EF still needed | |
| T08 | **Auto-approver patch — split status: SQL v5 LIVE / EF v1.6.0 DEFERRED** | P0 | EF deploy next session | chat (next session) → ChatGPT → PK | Reconstruct EF source per B31 |
| T09 | Safe-to-resume publisher checklist | P0 | Walk before each cron flip | PK | brief: `06_t09_*` |
| T10 | Pre-fix queue disposition | P0 | Now appropriate post-W1 | PK | brief: `07_t10_*` |
| T11 | YouTube failed-draft replay plan | P1 | After T17 + T06 | chat → ChatGPT → PK | next session |
| T12 | F-PUB-005 trigger gate | P1 | After publisher-gate batch (now) | chat → ChatGPT → PK | F-PUB-005 |
| T13a | LinkedIn Zapier publisher gate v1.1.0 | P0 | ✅ DONE 2026-05-01 evening | — | brief: `03_t13_*` |
| T13b | LinkedIn direct publisher gate v1.2.0 — repo-only | P0 | ✅ DONE 2026-05-01 evening | — | brief: `03_t13_*` |
| T16 | Audit needs_review LinkedIn published drafts | P1 | This week | PK | Full window since 2026-03-12 | |
| T17 | YouTube publisher gate v1.6.0 | P0 | ✅ DONE 2026-05-01 evening | — | brief: `01_t17_*` |
| T18 | FB publisher gate v1.8.0 | P0 | ✅ DONE 2026-05-01 evening | — | brief: `02_t18_*` |

**Workstream 1 status: COMPLETE.**
**Workstream 2 status: 80% complete — SQL v5 LIVE, Path B + B28 applied; v1.6.0 EF deferred to next session.**

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

Unchanged from v2.13. R13 expanded scope: postmortem now also captures the v1.6.0 EF source-provenance gap as a process-failure data point — tighten artefact retention rules so future v-N briefs don't reference disappeared v-(N-x) briefs without inlining the relevant source.

---

## 🤝 Pending decisions

Unchanged from v2.11.

---

## 📌 Backlog

| ID | Item | Priority | Trigger |
|---|---|---|---|
| B01–B22, B24–B27 | (per v2.10) | varies | per item |
| ~~B16, B17, B18, B23~~ | CLOSED | | |
| B28 | Verify operator intent for CFW IG / Invegent IG / CFW FB auto-approve | ✅ APPLIED v2.14 (conservative: all 3 disabled) | — |
| B29 | Partial unique constraint on `c.client_publish_profile (client_id, platform) WHERE status='active' AND is_default=true` | P2 | Long-term forward-defence |
| ~~B30~~ | Data hygiene UPDATE | CLOSED v2.14 (Path B applied; sole-active NULL-default rows now is_default=true) | — |
| **B31 (NEW v2.14)** | **Reconstruct auto-approver v1.6.0 EF source** | P0 | Next session — reconstruct from current production v1.5.0 + brief 09 design + cooldown spec. ChatGPT cross-check before deploy. Source-of-truth: production v1.5.0 (already calls `m.auto_approver_fetch_drafts`); add `eligibility_safety_net_fires` counter + cooldown filter (at SQL or EF level — design TBD). |
| **B32 (NEW v2.14)** | **Cooldown design decision: SQL filter vs EF filter** | P0 | Next session — chat presents both options to PK; ChatGPT review; choose one. SQL filter (e.g. `WHERE auto_approval_scores->>'checked_at' < NOW() - INTERVAL '30m'`) is simpler but couples to JSONB shape. EF filter is more flexible but requires storing per-draft cooldown state. |
| **B33 (NEW v2.14)** | **Brief artefact retention rule** | P2 | Process improvement: when a brief references "v-N source as captured in v-(N-x) brief", inline the source into the current brief. Lesson from tonight's v2.9 brief disappearance. |

---

## 🧊 Frozen / Deferred

Unchanged. Plus:
- **T08 EF v1.6.0 deploy** — deferred to next session per Lesson #51 (terminal-decision authority requires disproportionate scrutiny; building at 22:30 Sydney without source provenance violates the lesson).

---

## 🎓 Canonical Lessons

- Lesson #46 (PROMOTED).
- Lesson #47 candidate (raised v2.12 to 10-catch session; now 11-catch with v2.14 source-provenance catch).
- Lesson #48 candidate — gate placement by consumer architecture.
- Lesson #49 candidate — eligibility vs content gates separation.
- Lesson #50 candidate — authoritative row first, eligibility predicate second.
- Lesson #51 (CONFIRMED v2.12, REINFORCED v2.14) — terminal-decision authority requires disproportionate scrutiny. **Honoured tonight by deferring v1.6.0 EF rather than constructing without source provenance at 22:30.**
- Lesson #52 candidate (REINFORCED v2.13) — decoupled deploys are risk-reduction.
- Lesson #53 candidate — pre-deploy diagnostic probes.
- Lesson #54 candidate (v2.13) — tool-level deploy gate intermittency.
- Lesson #55 candidate (v2.13) — queue state as gate-firing predictor.
- **Lesson #56 candidate (NEW v2.14)** — "Brief artefacts that reference earlier-version content by pointer (e.g. 'see v2.9 brief') without inlining the content are fragile. When the earlier version is overwritten, the canonical source disappears. Rule: every brief inlines the full source it depends on, even at the cost of duplication." Captured as B33.
- **Lesson #57 candidate (NEW v2.14)** — "Stratification at the SQL function layer can be deployed independently from the EF that consumes it, provided the EF's column expectations remain a subset of the function's return shape. This decoupling let us land the primary fix tonight without forcing the EF deploy." Reinforces Lesson #52.

---

## v2.14 honest limitations

- All previous limitations apply.
- v2.14 committed without ChatGPT cross-check (state-capture-bump exception).
- **T08 split-state acknowledged**: SQL v5 LIVE in production via v1.5.0 EF + RPC; EF v1.6.0 not deployed. Stratification is operational; cooldown is not. If rank-1 failing drafts recur, S16 will catch it and B31/B32 become urgent.
- Source provenance gap on v1.6.0 EF is a real process failure (Lesson #56). Captured as B33 backlog improvement.

---

## Changelog

- v1.0–1.9 → v2.13: per previous changelog.
- **v2.14 (1 May +30min after v2.13): Session close-out.** Path B applied (12 rows is_default=true, RETURNING audit). B28 applied (3 rows: CFW FB/IG, Invegent IG → auto_approve_enabled=false, RETURNING audit). T08 v5 SQL applied via apply_migration (DROP + CREATE due to return-type change adding `platform` column). Function smoke-tested: 10 stratified drafts across 3 platforms × 2 clients with auth_profile and B28 filtering correctly applied. **Stratification is now LIVE in production** through v1.5.0 EF + new RPC. Auto-approver v1.6.0 EF deferred — no source provenance from referenced "v2.9 brief"; Lesson #51 honoured. New monitoring task S16. New backlog: B31 (reconstruct EF), B32 (cooldown design), B33 (artefact retention rule). New lesson candidates: #56 (brief artefact retention) and #57 (SQL/EF deploy decoupling). T08 status changed to split: SQL v5 LIVE / EF v1.6.0 DEFERRED. Workstream 2 now 80% complete. **Session close — Workstream 1 COMPLETE was the main win tonight.**
