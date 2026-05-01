# ICE — Action List

> **Single active action index for what's queued, in flight, blocked, or frozen.**
> Source-of-truth details remain in sync_state, run states, decisions, briefs, and commits — this file is the operational index that points at all of them.
> Read at the start of every session alongside `docs/00_sync_state.md`.
>
> Last updated: 2026-05-01 Friday late evening Sydney (v2.9 — **Round-2 ChatGPT review of publisher-gate batch complete**: 2 amendments (1 HIGH-severity semantic bug — T08-A conflated eligibility-gate with content-gate failures). Both folded into briefs. **S13 + S14 standing checks added** (auto-approve config gap visibility). **B26 candidate**: audit other publishers / SQL functions for similar eligibility/content gate conflation. **Lesson #47 candidate at 8 catches**. Round-3 ChatGPT review pending before deploy.

## How this file works

**At session start**, chat reads this file and:
1. Rebuilds the Today / Next 5 view
2. Runs Standing checks (S1–S14)
3. Asks PK about Personal businesses
4. Surfaces Time-bound items due today/tomorrow

**Standing rule (D-01)**: every production patch and action_list version bump from v2.5 onward goes through ChatGPT cross-check before deploy/commit. **v2.9 honest limitation**: this bump committed without ChatGPT cross-check per PK's standing go-ahead for state-capture bumps documenting completed reviews.

---

## ⭐ Today / Next 5 — REBUILD AT EVERY SESSION START

> **Last rebuilt:** 2026-05-01 Friday late evening Sydney post-round-2 review.

| Rank | Item | Priority | Why now | Next action |
|---|---|---|---|---|
| 1 | Personal businesses check-in | P0 | ICE is bonus, not driver | Cleared at session open |
| 2 | **Round-3 ChatGPT review of publisher-gate batch** | P0 | 2 round-2 amendments folded; round-3 verifies the new SQL eligibility filter design | PK shares folder URL with ChatGPT; chat holds until verdict |
| 3 | **Publisher gate batch deploy** (post round-3 approval) | P0 | T17 → T18 → T13 → T08 (with P-B snapshot + S13/S14 + staged run) | PK deploys micro-staged per `00_INDEX.md` |
| 4 | **T10 + T09 execution** (post deploys) | P0 | T10 step 3 smoke check on first batch → T09 checklist → T07 step 4 retry | PK executes per briefs |
| 5 | T02 — Gate B exit decision | P0 | Sat 2 May | Default: exit on schedule |

---

## 🔄 Standing session-start checks

| # | Check | How | Threshold to act |
|---|---|---|---|
| S1 | Personal business priorities | Ask PK directly | Whatever PK says |
| S2 | Stage 2.3 trigger | Last 24h post counts per active client | 0 posts in 24h → jump queue |
| S3 | Open `m.slot_alerts` count | `SELECT COUNT(*) FROM m.slot_alerts WHERE acknowledged_at IS NULL` | >0 → investigate |
| S4 | Failed slots last 7d | `SELECT COUNT(*) FROM m.slot WHERE status='failed' AND scheduled_publish_at >= NOW() - INTERVAL '7 days'` | New failures → investigate |
| S5 | Anthropic spend trend | `m.ai_usage_log` cost since 1st of month | Approaching Stop 1 ($30/mo) → review |
| S6 | sync_state freshness | Last-written timestamp | >12h old → re-read |
| S7 | B19 trigger check | `SELECT n_live_tup FROM pg_stat_user_tables WHERE schemaname='m' AND relname='slot'` | >5000 → promote B19 |
| S8 | Publisher cron health | Verify all expected platform publishers active=true AND last_success<1h | Any unexpected `active=false` → investigate |
| S9 | Publisher OAuth health | YT: `youtube_upload_error` count. IG: OAuth error count | Any non-zero → OAuth reconnect |
| S10 | Business-outcome publish check | `SELECT platform, COUNT(*) FROM m.post_publish WHERE created_at > NOW() - INTERVAL '24 hours' AND status='published' GROUP BY platform` | Any expected platform with 0 rows → investigate |
| S11 | Auto-approver business outcome | `SELECT COUNT(*) FROM m.post_draft WHERE approval_status='approved' AND updated_at > NOW() - INTERVAL '24 hours' GROUP BY platform` | Any platform with 0 fresh approvals → starvation |
| S12 | Approval-gate compliance | Join `m.post_publish` with `m.post_draft` per platform last 24h | Any published post where draft was `'needs_review'`/`'rejected'` → publisher gate failed |
| **S13 (NEW v2.9)** | **Auto-approve config gap (missing rows)** | `SELECT pd.client_id, c.client_name, pd.platform, COUNT(*) FROM m.post_draft pd JOIN c.client c ON c.client_id=pd.client_id LEFT JOIN c.client_publish_profile cpp ON cpp.client_id=pd.client_id AND cpp.platform=pd.platform WHERE pd.approval_status='needs_review' AND cpp.client_id IS NULL GROUP BY 1,2,3 ORDER BY 4 DESC` | Any non-zero counts → decide: add config row OR document why platform is human-review only |
| **S14 (NEW v2.9)** | **Auto-approve explicitly disabled** | `SELECT pd.client_id, c.client_name, pd.platform, COUNT(*) FROM m.post_draft pd JOIN c.client c ON c.client_id=pd.client_id JOIN c.client_publish_profile cpp ON cpp.client_id=pd.client_id AND cpp.platform=pd.platform WHERE pd.approval_status='needs_review' AND COALESCE(cpp.auto_approve_enabled,false)=false GROUP BY 1,2,3 ORDER BY 4 DESC` | Operator-intended human-review backlog; review periodically (weekly?) |

---

## 🔴 Time-bound (calendar-driven deadlines)

| ID | Item | Priority | Due | Owner | Next action / Done when | Source |
|---|---|---|---|---|---|---|
| ~~T01~~ | ~~Phase B +24h obs~~ | — | — | — | **DONE 2026-05-01 00:30 UTC**. | obs run state |
| T02 | Gate B exit decision | P0 | Sat 2 May | PK + chat | Default: exit on schedule | Phase B run state |
| T03 | Anthropic $200 cap reset | P3 | Fri 1 May | passive | None — awareness only | calendar |
| T04 | R01 calibration session | P1 | Sun 3 May / Mon 4 May | PK + chat | 90min hard cap | RTR proposal |
| T05 | Meta dev support contact | P1 | ASAP — Mon 4 May latest | PK | Single conversation: business verification + PP IG + NDIS-Yarns IG + App Review | F-PUB-002 |
| T06 | **Reconnect YouTube OAuth — BLOCKED ON T17** | P1 | Within 7 days | PK | DO NOT reconnect until T17 deployed | T15 |
| T07 | Instagram publisher recovery | P1 | Gated on T08 + T10 + T09 + T05 | mixed | Step 4 revised sequence | F-PUB-002 corrigendum |
| T08 | Auto-approver patch (F-PUB-004 NARROW) — round-1 + **round-2** amendments folded | P0 | This session author; deploy this week post round-3 | chat (authored) → ChatGPT (round-3) → PK | brief: `04_t08_*` |
| T09 | Safe-to-resume publisher checklist — round-1 amendments folded | P0 | This session author; walk before each cron flip | chat (authored) → ChatGPT (round-3) → PK | brief: `06_t09_*` |
| T10 | Pre-fix queue disposition — round-1 + **round-2** amendments folded; step 0 introspection done | P0 | This session author; execute post-T08+T13+T18 | chat (authored) → ChatGPT (round-3) → PK | brief: `07_t10_*` |
| T11 | YouTube failed-draft replay plan | P1 | After T17 + T06 | chat → ChatGPT → PK | brief in next session | F-PUB-003 |
| T12 | F-PUB-005 trigger gate (defence-in-depth, post-batch) | P1 | After publisher-gate batch + observation | chat → ChatGPT → PK | F-PUB-005 |
| T13 | LinkedIn publishers gate — round-1 cleared, no round-2 changes | P0 | Deploy this week post round-3 | chat (authored) → ChatGPT (round-3) → PK | brief: `03_t13_*` |
| T14 | crosspost RPC audit | — | — | — | **CLOSED — RPC disabled since D154. B25 referral.** | brief: `05_t14_*` |
| ~~T15~~ | 5-publisher gate audit | — | — | — | **DONE 2026-05-01.** | inline |
| T16 | Audit needs_review LinkedIn published drafts | P1 | This week | PK | Full window since `linkedin-zapier-publisher` v1.0.0 deployed (2026-03-12) | T15 |
| T17 | YouTube publisher gate (fetch-time) — round-1 cleared | P0 | Deploy first | chat → ChatGPT (round-3) → PK | brief: `01_t17_*` |
| T18 | FB publisher gate (per-row + go/no-go) — round-1 amendment folded | P0 | Deploy second | chat → ChatGPT (round-3) → PK | brief: `02_t18_*` |

---

## 🟡 Active (in flight right now)

| ID | Item | Priority | Status | Owner | Next action | Source |
|---|---|---|---|---|---|---|
| F04→Active | post_render_log column-purposes (16 cols) | P2 | brief authored | chat→CC→chat | Awaiting CC overnight | brief |

---

## 💼 Personal businesses

| ID | Item | Priority | Trigger | Owner | Next action | Source |
|---|---|---|---|---|---|---|
| *(none flagged this session)* | | | | | | |

---

## 🏗 Operational Truth Layer (strategic stream)

| ID | Item | Priority | Owner | First action | Notes |
|---|---|---|---|---|---|
| O-01 | Platform-source-of-truth map | P1 escalated | chat | Author with approval gate location + pattern columns | |
| O-02 | Per-client/platform circuit breakers | P2 | chat + PK | Audit step 1 closed by T15 | |
| O-03 | Business-outcome monitors | P1 | chat | `m.fn_business_outcome_health()` with S10/S11/S12 | Manual versions in place |
| O-04 | Pre-DDL verification gate | P2 | chat | Append to migration_naming_discipline | Vindicated 3 times |
| O-05 | External-account health checks | P1 | chat | `m.vw_external_account_health` view | Parallels S9+S11+S12 |
| O-06 | Recovery playbooks | P2 | chat | 5 failure classes including publisher-missing-gate | |
| O-07 | Production change packet | P1 — operationalises D-01 | chat | Template authoring | Vindicated this session |
| O-08 | Disabled-publisher-with-growing-queue alert | P1 | chat | Specific instance of O-03 | |
| O-09 | OAuth/token lifecycle monitor | P1 | chat | Active alerting | |
| O-10 | Publisher approval-gate audit (one-time + ongoing) | P0 partial | chat | T15 closed; ongoing carried forward | B24 |
| O-11 | Gate-pattern documentation | P2 | chat | Per-row vs fetch-time by architecture | |
| **O-12 (NEW v2.9)** | **Eligibility-vs-content gate distinction documentation** | P1 | chat | Capture round-2 lesson — SQL functions and EFs must distinguish operator-decision gates from system-decision gates | T08-A round-2 |

---

## 🟢 Ready / Strategic

| ID | Item | Priority | Owner | Next action | Source |
|---|---|---|---|---|---|
| R07 | Update invegent-dashboard roadmap milestone | P3 | chat | 10min bundle | standing rule |
| R08 | Meta App Review status check | P1 | PK | Overlaps with T05 | userMemories |
| R09 | Author reconciliation v2 brief | P1 | PK + chat | After T01+T02+personal | spec capture |
| R10 | Phase C cutover live pilot | P1 | PK + ChatGPT + chat | First formal D-01 application | RTR proposal |
| R11 | Cycle 3 audit run | P3 | chat + ChatGPT | Future day | D181 manual loop |
| R12 | Define Operations Auditor role | P1 | chat | When O-01+O-03+O-05 authored | PK feedback |
| R13 | Publisher incident postmortem (1 May) | P2 expanded scope | chat | Author postmortem covering 8+ catches | tonight's session |
| R14 | D185 entry to `docs/06_decisions.md` | P1 | chat | 15min capture of D-01 ratification | D-01 closure |

---

## 🤝 Pending decisions

| ID | Decision | Priority | Notes |
|---|---|---|---|
| ~~D-01..D-03, D-06, D-08..D-11~~ | — | — | All resolved 30 Apr / 1 May |
| D-04 | Invegent thin-pool resolution path | P2 | 142/155 canonicals had no body |
| D-05 | Stage 1.2 brief merge or keep separate | P2 | Carry-over |
| D-07 | PP + NDIS-Yarns IG specific recovery | P1 | Per T05 outcome |

---

## 📌 Backlog

| ID | Item | Priority | Trigger | Source |
|---|---|---|---|---|
| B01–B15 | (per v2.7) | varies | per item | (see v2.7) |
| ~~B16, B17, B18, B23~~ | — | — | **CLOSED.** | |
| B19 | Add `idx_slot_filled_draft_id` | P3 | n_live_tup>5000 | F-2026-04-30-D-002 |
| B20 | m-schema column-purpose continuation — medium tables | P2 | After F04 | |
| B21 | Audit heygen/video-worker stranded YT slots | P2 | After T06 + successful upload | F-PUB-003 |
| B22 | ai-worker prompt cap enforcement | P2 — priority raised | After T08 + churn observation | F-PUB-004 |
| B24 | Direct linkedin-publisher activation | P2 | LinkedIn CMS API approval; T13b pre-patches gate | F06; T15 |
| B25 | Audit `seed-and-enqueue-linkedin-every-10m` cron + extended trigger | P2 | Post T13 deploy + 7d obs | T14 |
| **B26 (NEW v2.9)** | **Audit other SQL functions / EFs for eligibility-vs-content gate conflation** | P2 | After T08 deploy + 7d obs | T08-A round-2 |

---

## 🧊 Frozen / Deferred

| ID | Item | Trigger to revisit |
|---|---|---|
| F01–F03, F05–F08 | (per v2.7) | (see v2.7) |
| ~~F04~~ | — | **PROMOTED to Active.** |

---

## 🎓 Canonical Lessons

- **Lesson #46 (PROMOTED 30 Apr v2.2)** — "Cron health is not system health."
- **Lesson #47 candidate (RAISED v2.9 to 8-catch session)** — "Investigation following the source-of-truth principle reliably surfaces issues deeper than the initial hypothesis. Each red-team layer reveals the next."
  - Tonight's catch chain: trigger fix averted → bulk-quarantine averted → v2.3→v2.4 missing controls → D-09 reframing → pre-DDL source pull → LinkedIn publisher gate-missing → ChatGPT v2.6 caught FB+YT also missing → ChatGPT round-1 caught T08-A platform-scope risk + 6 amendments → **ChatGPT round-2 caught T08-A semantic conflation (eligibility vs content gate) + T10 constraint check**.
  - **8 distinct review layers in one session.** Strong promotion candidate at next R10.
- **Lesson #48 candidate (NEW v2.7)** — "Gate placement is determined by consumer architecture, not global preference."
- **Lesson #49 candidate (NEW v2.9)** — "Eligibility gates (operator decisions) and content gates (system decisions) must be architecturally separated. Conflating them — e.g. terminal-rejecting drafts on a missing config row — causes silent damage. Filter eligibility at the SQL boundary; let content gates run only on already-eligible drafts."

---

## v2.9 honest limitations

- All v2.7 + v2.8 limitations still apply.
- v2.9 committed without ChatGPT cross-check per state-capture-bump exception.
- **Round-3 ChatGPT review pending** before any deploy.
- T08-A round-2 catch was a HIGH-severity semantic bug; vindication of structured red-team review v1.
- B26 (audit other functions for similar conflation) added but not blocking.

---

## Changelog

- v1.0–1.9 (30 Apr): initial through R03 closure.
- v2.0–2.2 (30 Apr late): publisher operational audit; OTL captured; Lesson #46.
- v2.3 (1 May early UTC): T07 step 4 attempted+rolled-back; F-PUB-004+005.
- v2.4 (1 May evening): ChatGPT red-team caught 7 structural gaps.
- v2.5 (1 May evening): D-01 RATIFIED; T12 created.
- v2.6 (1 May evening +45min): LinkedIn publisher gate-missing.
- v2.7 (1 May evening +1h): T15 audit; T17+T18; D-10+D-11; gate-pattern.
- v2.8 (1 May evening +30min): Round-1 ChatGPT review — 7 amendments folded.
- **v2.9 (1 May late evening +30min after v2.8): Round-2 ChatGPT review — 2 amendments folded (1 HIGH-severity).** T08-A revised: SQL eligibility filter at fetch time, EF defence-in-depth for safety-net, eligibility/content gate distinction. T10 step 0 constraint introspection executed in chat: no CHECK constraint on `m.post_publish_queue.status`; `'skipped'` legal but never written in production. T10 step 3 added: smoke-check first 10-row batch before bulk apply. **S13 + S14** standing checks added. **O-12** OTL ticket added. **B26** backlog ticket added (audit other functions for similar conflation). Lesson #47 raised to 8-catch. Lesson #49 candidate added. Round-3 review pending.
