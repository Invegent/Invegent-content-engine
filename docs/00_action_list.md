# ICE — Action List

> **Single active action index for what's queued, in flight, blocked, or frozen.**
> Source-of-truth details remain in sync_state, run states, decisions, briefs, and commits — this file is the operational index that points at all of them.
> Read at the start of every session alongside `docs/00_sync_state.md`.
> Updated inline as state changes (not just end-of-session) so it doesn't go stale.
>
> Created: 2026-04-30 Thursday evening Sydney.
> Last updated: 2026-05-01 Friday evening Sydney (v2.8 — **Round-1 ChatGPT review of publisher-gate batch complete**: 7 amendments folded into briefs. T18 newly conditional on FB go/no-go query. T08 expanded with platform-scoped `auto_approve_enabled` lookup (T08-A HIGH severity catch), dual-field response (T08-B), staged first-run protocol (T08-C), P-B snapshot pre-deploy (T08-D). T09 check 7 rewritten platform-specific. T10 uses `'skipped'` not `'failed'`/`'dead'`. **B25 added** (LinkedIn seeding cron audit). **Lesson #47 candidate at 7 catches in 24h**. Round-2 ChatGPT review pending before deploy.

## How this file works

**At session start**, chat reads this file and:
1. **Rebuilds the Today / Next 5 view below** from the live state of categories
2. Runs 🔄 Standing checks (verify at every session open)
3. Ask PK about 💼 Personal businesses (per standing rule)
4. Surfaces any 🔴 Time-bound items due today or tomorrow

**Standing rule (per D-01 ratification, 2026-05-01)**: every production patch and every action_list version bump from v2.5 onward goes through ChatGPT cross-check before deploy / commit. **v2.8 honest limitation**: this bump committed without ChatGPT cross-check per PK's standing go-ahead for state-capture bumps documenting completed reviews.

---

## ⭐ Today / Next 5 — REBUILD AT EVERY SESSION START

> **Last rebuilt:** 2026-05-01 Friday evening Sydney post-round-1-review.

| Rank | Item | Priority | Why now | Next action |
|---|---|---|---|---|
| 1 | Personal businesses check-in | P0 | ICE is bonus, not driver | Cleared at session open — reconfirm next session |
| 2 | **Round-2 ChatGPT review of publisher-gate batch amendments** | P0 | 7 amendments folded into briefs; round-2 verifies the amendments themselves | PK shares folder URL with ChatGPT; chat holds until round-2 verdict |
| 3 | **Publisher gate batch deploy** (post round-2 approval) | P0 | T17 → T18 (with go/no-go) → T13 → T08 (with P-B snapshot + staged run) | PK deploys micro-staged per `00_INDEX.md` |
| 4 | **T10 + T09 execution** (post deploys) | P0 | T10 disposition → T09 checklist walked → T07 step 4 retry | PK executes per briefs |
| 5 | T02 — Gate B exit decision | P0 | Sat 2 May | Default: exit on schedule |

T05/T06/T11/T12/T16 remain P1 in Time-bound table. T06 still blocked on T17.

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
| S9 | Publisher OAuth health | YT: count of drafts with `youtube_upload_error`. IG: count of OAuth errors | Any non-zero → OAuth reconnect |
| S10 | Business-outcome publish check | `SELECT platform, COUNT(*) FROM m.post_publish WHERE created_at > NOW() - INTERVAL '24 hours' AND status='published' GROUP BY platform` | Any expected platform with 0 rows → investigate |
| S11 | Auto-approver business outcome | `SELECT COUNT(*) FROM m.post_draft WHERE approval_status='approved' AND updated_at > NOW() - INTERVAL '24 hours' GROUP BY platform` | Any platform with 0 fresh approvals → starvation pattern |
| S12 | Approval-gate compliance | Join `m.post_publish` with `m.post_draft` per platform last 24h | Any published post where draft was `'needs_review'` or `'rejected'` → publisher gate failed |

---

## 🔴 Time-bound (calendar-driven deadlines)

| ID | Item | Priority | Due | Owner | Next action / Done when | Source |
|---|---|---|---|---|---|---|
| ~~T01~~ | ~~Phase B +24h obs~~ | — | — | — | **DONE 2026-05-01 00:30 UTC**. All 5 targets pass. | obs run state |
| T02 | Gate B exit decision | P0 | Sat 2 May | PK + chat | Default: exit on schedule | Phase B run state |
| T03 | Anthropic $200 cap reset | P3 | Fri 1 May | passive | None — awareness only | calendar |
| T04 | R01 calibration session | P1 | Sun 3 May / Mon 4 May | PK + chat | 90min hard cap | RTR proposal |
| T05 | Meta dev support contact | P1 | ASAP — Mon 4 May latest | PK | Single conversation: business verification + PP IG block + NDIS-Yarns IG block + App Review status | F-PUB-002 |
| T06 | **Reconnect YouTube OAuth — BLOCKED ON T17** | P1 | Within 7 days | PK | DO NOT reconnect until T17 deployed | F-PUB-001 corrigendum + T15 |
| T07 | Instagram publisher recovery | P1 | Gated on T08 + T10 + T09 + T05 | mixed | Step 4 revised sequence per v2.7. **NEW v2.8**: round-2 review must complete before any cron flip | F-PUB-002 corrigendum |
| **T08** | **Auto-approver patch (F-PUB-004 NARROW)** — 4 round-1 amendments folded | P0 | This session author; deploy this week post round-2 | chat (authored) → ChatGPT (round-2) → PK (P-B snapshot → staged run → deploy) | brief: `04_t08_auto_approver_stratify_cooldown.md` |
| **T09** | **Safe-to-resume publisher checklist** — platform-specific check 7 folded | P0 | This session author; walk before each cron flip | chat (authored) → ChatGPT (round-2) → PK (walks) | brief: `06_t09_safe_to_resume_publisher_checklist.md` |
| **T10** | **Pre-fix queue disposition** — `'skipped'` semantics + split discovery folded | P0 | This session author; execute post-T08+T13+T18 | chat (authored) → ChatGPT (round-2) → PK (executes) | brief: `07_t10_pre_fix_queue_disposition.md` |
| T11 | YouTube failed-draft replay plan | P1 | After T17 + T06 | chat (authored) → ChatGPT → PK | brief in next session | F-PUB-003 + T17 dependency |
| T12 | F-PUB-005 trigger gate (defence-in-depth, post-T13/T17/T18) | P1 | After publisher-gate batch + observation | chat → ChatGPT → PK | F-PUB-005 |
| **T13** | **LinkedIn publishers gate (Zapier deployed + direct repo-only)** | P0 | This session author; deploy this week post round-2 | chat (authored) → ChatGPT (round-2) → PK (deploys) | brief: `03_t13_linkedin_publishers_gate.md` |
| T14 | crosspost RPC audit | — | — | — | **CLOSED — RPC disabled since D154. B25 referral.** | brief: `05_t14_crosspost_rpc_audit.md` |
| ~~T15~~ | ~~5-publisher gate audit~~ | — | — | — | **DONE 2026-05-01.** Findings in v2.7 + brief 08 amendments doc. | T15 inline |
| T16 | Audit needs_review LinkedIn published drafts | P1 | This week | PK | Full window since `linkedin-zapier-publisher` v1.0.0 deployed (2026-03-12) | T15 finding + ChatGPT v2.6 |
| **T17** | **YouTube publisher gate (fetch-time)** | P0 | This session author; deploy first | chat (authored) → ChatGPT (round-2) → PK (deploys) | brief: `01_t17_youtube_publisher_gate.md` |
| **T18** | **FB publisher gate (per-row + go/no-go pre-deploy)** | P0 | This session author; deploy second post round-2 + go/no-go | chat (authored) → ChatGPT (round-2) → PK (runs go/no-go → deploys or pauses) | brief: `02_t18_facebook_publisher_gate.md` |

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
| O-01 | Platform-source-of-truth map | P1 escalated | chat | Author with approval gate location + pattern columns | Most enabling piece |
| O-02 | Per-client/platform circuit breakers | P2 | chat + PK | Audit step 1 substantially closed by T15 | T13/T15 partially overlap |
| O-03 | Business-outcome monitors | P1 | chat | `m.fn_business_outcome_health()` with S10/S11/S12 fields | Manual versions in place |
| O-04 | Pre-DDL verification gate | P2 | chat | Append to migration_naming_discipline | Vindicated 3 times this session |
| O-05 | External-account health checks | P1 | chat | `m.vw_external_account_health` view | Parallels S9+S11+S12 |
| O-06 | Recovery playbooks | P2 | chat | 5 failure classes including publisher-missing-gate | New v2.6 entry |
| O-07 | Production change packet | P1 — operationalises D-01 | chat | Template authoring | Vindicated this session |
| O-08 | Disabled-publisher-with-growing-queue alert | P1 | chat | Specific instance of O-03 | Net-additive |
| O-09 | OAuth/token lifecycle monitor | P1 | chat | Active alerting layer above O-05 | Proactive |
| O-10 | Publisher approval-gate audit (one-time + ongoing) | P0 partial | chat | T15 closed; ongoing discipline carried forward | B24 acceptance criterion |
| O-11 | Gate-pattern documentation | P2 | chat | Per-row vs fetch-time by architecture | New finding |

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
| R13 | Publisher incident postmortem (1 May) | P2 expanded scope | chat | Author postmortem covering 7+ catches in one session | tonight's session |
| R14 | D185 entry to `docs/06_decisions.md` | P1 | chat | 15min capture of D-01 ratification | D-01 closure |

---

## 🤝 Pending decisions

| ID | Decision | Priority | Notes |
|---|---|---|---|
| ~~D-01, D-02, D-03, D-06, D-08, D-09, D-10, D-11~~ | — | — | All resolved 30 Apr / 1 May |
| D-04 | Invegent thin-pool resolution path | P2 | 142/155 canonicals had no body |
| D-05 | Stage 1.2 brief merge or keep separate | P2 | Carry-over |
| D-07 | PP + NDIS-Yarns IG specific recovery | P1 | Per T05 outcome |

---

## 📌 Backlog

| ID | Item | Priority | Trigger | Source |
|---|---|---|---|---|
| B01–B15 | (per v2.7) | varies | per item | (see v2.7) |
| ~~B16~~ | Red-team review v1 ratification | — | **CLOSED with D-01.** | |
| ~~B17, B18~~ | — | — | **CLOSED 2026-04-30.** | |
| B19 | Add `idx_slot_filled_draft_id` | P3 | n_live_tup>5000 | F-2026-04-30-D-002 |
| B20 | m-schema column-purpose continuation — medium tables | P2 | After F04 | userMemories |
| B21 | Audit heygen/video-worker stranded YT slots | P2 | After T06 + successful upload | F-PUB-003 |
| B22 | ai-worker prompt cap enforcement | P2 — priority raised | After T08 + churn observation | F-PUB-004 |
| ~~B23~~ | F-PUB-005 trigger gate fix | — | **PROMOTED to T12 (P1, defence-in-depth).** | |
| B24 | Direct linkedin-publisher activation | P2 | LinkedIn CMS API approval; v2.7 day-1 gate criterion. **NEW v2.8**: T13b patches the repo source defensively so B24 has gate from day-1 | F06 trigger; T15 |
| **B25 (NEW v2.8)** | **Audit `seed-and-enqueue-linkedin-every-10m` cron + extended LinkedIn enqueue trigger** | P2 | When publisher-gate batch is stable (post T13 deploy + 7d obs). Per T14 finding | T14 brief 05 |

---

## 🧊 Frozen / Deferred

| ID | Item | Trigger to revisit |
|---|---|---|
| F01 | D182 Phase 4b GitHub Actions validation | When brief demands cloud-side |
| F02 | D182 Phase 4c OpenAI API answer step | When brief generates real questions |
| F03 | Audit Slice 3 auto-auditor | Manual cycle 5+ |
| ~~F04~~ | — | **PROMOTED to Active 2026-04-30.** |
| F05 | D156 deferred | When ICE has bandwidth |
| F06 | LinkedIn publisher direct integration | LinkedIn CMS API approval; B24 captures |
| F07 | Grok red-team agent evaluation | Only if T04 noisy |
| F08 | Large m-schema tables column-purpose work | After F04+B20 |

---

## 🎓 Canonical Lessons

- **Lesson #46 (PROMOTED 30 Apr v2.2)** — "Cron health is not system health. Source-of-truth must be verified at the consumer, not inferred from the producer." Operationalised through S8/S9/S10/S11/S12, OTL O-01..O-11, and the publisher-gate batch tickets T13/T17/T18.
- **Lesson #47 candidate (RAISED v2.8 to 7-catch session)** — "Investigation following the source-of-truth principle reliably surfaces issues deeper than the initial hypothesis. Each red-team layer reveals the next."
  - Tonight: trigger fix averted → bulk-quarantine averted → v2.3→v2.4 missing controls caught → D-09 reframing → pre-DDL source pull → LinkedIn publisher gate-missing → ChatGPT v2.6 review caught FB+YT also missing gates → **ChatGPT round-1 review of v2.7 caught T08-A platform-scope risk + 6 other amendments**.
  - Seven distinct review layers in one session. Strong promotion candidate at next R10.
- **Lesson #48 candidate (NEW v2.7)** — "Gate placement is determined by consumer architecture, not global preference." Per-row in loop for queue-based; SQL fetch-time filter for direct-read.

---

## v2.8 honest limitations

- All v2.7 limitations still apply.
- **v2.8 committed without ChatGPT cross-check** per PK's standing go-ahead for state-capture bumps documenting completed reviews.
- **Round-2 ChatGPT review pending** before any deploy. The 7 amendments need their own review pass; round-2 may surface further refinements.
- **B25 LinkedIn seeding cron audit** is captured but not blocking T13. Architecture-correct because consumer-side gate (T13) catches anything the seeder might enqueue improperly.
- **T08-A is the highest-severity round-1 catch** — silent risk of cross-platform auto-approve. Vindication of structured red-team review v1 and stratification-design care.

---

## Changelog

- v1.0–1.9 (30 Apr): initial through R03 closure.
- v2.0–2.2 (30 Apr late): publisher operational audit; OTL captured; Lesson #46 promoted; T06+T07+S8+S9+S10 added.
- v2.3 (1 May early UTC): T07 step 4 attempted+rolled-back; F-PUB-004+005 discovered; T08+D-08+D-09+B22+B23+S11.
- v2.4 (1 May evening): ChatGPT red-team caught 7 structural gaps; T09+T10+T11+R13+O-07+O-08+O-09.
- v2.5 (1 May evening): D-01 RATIFIED; T12 created; B16+B23 closed; R14 created.
- v2.6 (1 May evening +45min): LinkedIn publisher gate-missing discovery; T13+T14+T15+T16+S12+O-10+B24+D-10.
- v2.7 (1 May evening +1h): T15 audit complete; T17+T18 added; D-10+D-11 resolved; gate-pattern by architecture; Lesson #47 raised to 6-catch.
- **v2.8 (1 May evening +30min after v2.7): Round-1 ChatGPT review of publisher-gate batch — 7 amendments folded into briefs.** T18 newly conditional on FB go/no-go (medium severity). T08-A platform-scoped auto_approve_enabled (HIGH severity catch — silent cross-platform auto-approve risk eliminated). T08-B dual-field response. T08-C staged first run protocol. T08-D P-B snapshot pre-deploy. T09 check 7 platform-specific subsections. T10 `'skipped'` semantics + split discovery by approval_status. **B25 added** (LinkedIn seeding cron audit). Lesson #47 candidate raised to 7-catch session. Round-2 ChatGPT review pending.
