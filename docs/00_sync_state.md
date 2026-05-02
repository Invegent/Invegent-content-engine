# ICE — Live System State

> **This file is machine-written. Do not edit manually.**
> Last written: 2026-05-03 Sunday morning Sydney CC pre-T01/T02 — **F-PUB-006 partial (Stage 1 drafted, Stage 2 halted on count drift); B-INV-LinkedIn investigation complete; F-PUB-005 trigger patch promoted to backlog as B38.**
> Written by: chat session sync (prior segments) + claude-code (3 May Sunday morning addendum below)

> ⚠️ **Session-start reading order (per memory entry 1):**
> 1. **`docs/00_sync_state.md`** (this file) — narrative log of last session
> 2. **`docs/00_action_list.md`** — running queued/active/blocked/frozen backlog with priorities and triggers
>
> The two files are complementary: sync_state is the session log, action_list is the working backlog. Read both at every session open.

---

## 🟢 2 MAY SATURDAY VERY LATE EVENING SYDNEY — B31 DEPLOY (v1.6.0 LIVE) — APPEND-ONLY SESSION

This section APPENDS to the late-evening session-end reconciliation below. New chat session opened ~22:35 AEST (12:35 UTC) with explicit goal: knock off B31. Single continuous thread covering: (a) B32 cooldown design choice escalated → Path 3 chosen; (b) v1.6.0 source authored from v1.4.1 baseline, MCP review #2 escalated on JSONB validation gap; (c) source baseline drift discovered — deployed = v1.5.0, NOT v1.4.1 in repo; (d) v1.6.0 rebased on v1.5.0 retrieved via `get_edge_function`; (e) MCP review #3 escalated on source_score classification → defence-in-depth applied; (f) repo push to main commit `f65e16d2`; (g) live deploy via Supabase MCP `deploy_edge_function` (NEW chat capability) version 52 → 53; (h) first cron tick at 12:40:00 UTC (27 sec post-deploy) verified `eligibility_safety_net_fires=0`; (i) D186 closure discipline authored (carried from prior session); (j) record-writing batch.

### Sequence of events (chronological, summarised)

**1. Session startup pre-flight reads** — `docs/00_sync_state.md` v2.18 + `docs/00_action_list.md` v2.18 confirmed deployed state: SQL v5 already LIVE (prior session); B31 + B32 + D186 + F04 still owed. Morning Cowork run not yet fired (scheduled 16:00 UTC = ~3.5h away).

**2. B32 cooldown design choice resolved (Path 3)** — initial PK choice was Option C (no cooldown, observe). MCP review fire #1 (review_id `d38ba055-88e2-499d-aa9e-8217f6492e2a`) returned escalate with weak objections about defence-in-depth absence. Per protocol v2.17 response procedure, chat presented escalation summary; PK upgraded to **Path 3 — full correction**: Option B EF cooldown defence-in-depth, 4h window via reading `draft_format.auto_review.checked_at` JSONB.

**3. v1.6.0 source authored (first cut) from v1.4.1 baseline** — repo source pulled (SHA `b744f76a...`), 366 lines extended to ~390 with: COOLDOWN_HOURS constant + checkCooldown() helper + ELIGIBILITY_GATES Set classifier + eligibility-safety-net path (outcome='skipped', leave at needs_review) + content-gate-failure path (terminal `approval_status='rejected'`, the F-PUB-004 fix) + dual-field response shape (`auto_rejected` + deprecated `skipped_needs_human_review` alias) + new counters (`eligibility_safety_net_fires`, `cooldown_skips`).

**4. MCP review #2 escalated on JSONB validation** (review_id `2d09be1d-6691-4744-8f58-c3bda5043f25`). Strong objection: cooldown logic reads `draft_format.auto_review.checked_at` from JSONB but no validation done that field exists at that path on production rows. **Lesson #61 candidate self-flagged.** Closed via SELECT against live data: `967 of 967` production rows have the path populated. Latest write 2026-05-02T12:20:04Z confirmed v1.5.0 actively writing immediately before session.

**5. Source baseline drift discovered.** Sample row inspection during JSONB validation revealed: deployed agent on production rows = `auto-approver-v1.5.0`, NOT v1.4.1 in repo. v1.5.0 had been deployed via Supabase EF dashboard without corresponding push to `supabase/functions/auto-approver/index.ts`. PK directed: paste deployed v1.5.0 source → re-base. Retrieved via Supabase MCP `get_edge_function` (function_slug=auto-approver, version=52). Diff v1.4.1 → v1.5.0: only `min_score: 6/5/5` → `min_score: 0/0/0` for Property Pulse / NDIS Yarns / Care For Welfare + default fallback (D135 bundler removed; `final_score=0` on all drafts). Plus inline comment in evaluateGates source_score block. JSONB output structure identical.

**6. v1.6.0 rebased on v1.5.0** — min_score: 0 across 4 locations + header comment block updated to reference v1.5.0 baseline + version history extended with v1.5.0 entry. 405 lines.

**7. MCP review #3 escalated on source_score classification** (review_id `304a87cc-1316-4ad4-8621-c516dc0277b7`). Valid weak point: should `source_score` be classified as eligibility while scoring is no-op? PK chose **defence-in-depth: add source_score to ELIGIBILITY_GATES with removal-trigger comment**. Final set: `{"auto_approve_enabled", "not_rejected", "source_score"}` with explicit comment that source_score must be REMOVED from set when scoring is intentionally re-enabled.

**8. Repo push to main (commit `f65e16d2`)** — github MCP `create_or_update_file` against `Invegent/Invegent-content-engine` `supabase/functions/auto-approver/index.ts`. SHA pre-write `b744f76ad9753880cf532d44eb568011b49cfecf` (v1.4.1) → post-write `936cc41454508e5959364dd134760b6f882ee87b`. Repo source jumps v1.4.1 → v1.6.0; v1.5.0 was deployed via dashboard without repo push (governance gap captured for B37 candidate).

**9. Live deploy via Supabase MCP** — `deploy_edge_function` called at ~12:39:33 UTC. Response: function id `9180633e-fb49-476e-a147-00e447b3793a`, version 52 → 53, status ACTIVE, verify_jwt: false (matches v1.5.0 — auto-approver uses custom `x-auto-approver-key` not JWT), ezbr_sha256 `65f65f0c89960d2f500732546020db260fb751f371c002dd074f88dd2dfd1c80`. **NEW chat capability**: this is the first chat-driven EF deploy in ICE history (previously PK deployed manually via Supabase EF dashboard or `supabase functions deploy` CLI which times out under Windows MCP PowerShell per memory). Verified deployed source via `get_edge_function` — matches commit `f65e16d2` exactly, `VERSION = "auto-approver-v1.6.0"`.

**10. First cron tick verified at 12:40:00.485 UTC** (27 seconds after deploy completion). Cron `auto-approver-sweep` body `{"limit": 30}` fired through `pg_net.http_post`. Captured response from `net._http_response` (id 90793, status 200):

```json
{
  "ok": true,
  "version": "auto-approver-v1.6.0",
  "processed": 30,
  "approved": 0,
  "auto_rejected": 0,
  "skipped": 30,
  "skipped_needs_human_review": 0,
  "eligibility_safety_net_fires": 0,
  "cooldown_skips": 30,
  "errors": 0
}
```

All 30 fetched drafts skipped with `cooldown_active (last_checked 10min ago, window 4h)` reason. **Acceptance criteria met**: `eligibility_safety_net_fires: 0` (SQL contract intact), `errors: 0`, version string matches deployed.

**11. D186 closure discipline authored** — owed from prior session, committed in this same record-writing batch as `docs/06_decisions.md` addition (commit `9d4233bb`). Encodes find/fix imbalance constraint: 20-finding cap on P0+P1 open items; 4h/week closure floor; 2-week pause trigger on new automation if closure falls behind. Sunset 30 June 2026.

**12. Record-writing batch** (this commit) — 4-way sync per memory entry 11: run state file (`d5679c61`) + decisions D186 (`9d4233bb`) + action_list v2.19 (`66fbce4a`) + this sync_state addendum.

### Today's mutations

| When (UTC) | Mutation | Type |
|---|---|---|
| ~12:00 | MCP review #1 — review_id `d38ba055-...` (B32 cooldown design) | DML (auto by EF) |
| ~12:15 | MCP review #2 — review_id `2d09be1d-...` (v1.6.0 first-cut) | DML (auto by EF) |
| ~12:25 | MCP review #3 — review_id `304a87cc-...` (v1.6.0 rebased + source_score) | DML (auto by EF) |
| 12:35:03 | github commit `f65e16d2...` to main — auto-approver v1.6.0 source | Git |
| 12:39:33 | Supabase MCP deploy_edge_function — auto-approver version 52 → 53 ACTIVE | EF deploy |
| 12:40:00 | First cron tick fired (cron-driven, not chat); EF returned v1.6.0 response with 30 cooldown skips | DML (EF-internal) |

**7 chat-driven external operations** (3 MCP review fires + 1 github push + 1 Supabase MCP deploy + 2 verification reads). **No chat-driven DDL** — D170 standing rule honoured (no chat-applied migrations this session). **No chat-driven DML to `c.*`/`m.*`/`f.*`/`t.*` schemas**. The 3 MCP review rows in `m.chatgpt_review` are EF-internal writes by chatgpt-review-worker.

### Today's commits (this session-segment)

**Invegent-content-engine `main`:**
| Commit | What |
|---|---|
| `f65e16d2` | B31: auto-approver v1.6.0 — close F-PUB-004 starvation cascade (`supabase/functions/auto-approver/index.ts`) |
| `d5679c61` | run state — `docs/runtime/runs/2026-05-02-b31-auto-approver-v160-deploy.md` (NEW) |
| `9d4233bb` | decisions D186 closure-first discipline LOCKED + B31/B32/T08 pending-table closure rows + F04 pending row |
| `66fbce4a` | action_list v2.19 — closure budget tracking section + B31/B32/T08 closed + B37 NEW + Lesson #61 PROMOTED + Lesson #62 candidate |
| (this commit) | sync_state addendum — very-late-evening B31 deploy section + DO NOT TOUCH update + NEXT SESSION rebuild |

**No invegent-dashboard or invegent-portal commits this session-segment.**

### Standing rule honoured (memory entry 11 — 4-way sync)

- ✅ `docs/00_sync_state.md` — late-evening section preserved; this very-late-evening section appended (this commit)
- ✅ `docs/00_action_list.md` — bumped to v2.19 (commit `66fbce4a`)
- ✅ `docs/briefs/queue.md` — already up-to-date from prior session (no brief touched this session — B31 was chat-driven without brief)
- ✅ `docs/06_decisions.md` — **D186 closure discipline NEW** (commit `9d4233bb`)
- ✅ `docs/runtime/runs/2026-05-02-b31-auto-approver-v160-deploy.md` — **NEW** (commit `d5679c61`)
- ⚠️ `invegent-dashboard` roadmap page.tsx — still deferred per R07 (this session was deploy + records, not phase-deliverables)
- ✅ Memory entries — auto-regenerate from chat history; explicit memory-worth captures: (a) Supabase MCP `deploy_edge_function` as new tool capability proven in production; (b) v1.5.0-deployed-but-not-in-repo as governance lesson (Lesson #62 candidate)

### Validation outcomes (numerical)

| Validation | Status |
|---|---|
| MCP review protocol v2.17 followed for production deploy | ✅ Three fires before deploy (B32 design + v1.6.0 first-cut + v1.6.0 rebased) |
| JSONB pre-flight validation | ✅ 967/967 production rows have `draft_format.auto_review.checked_at` |
| Source baseline drift discovered + corrected | ✅ v1.5.0 retrieved via `get_edge_function`; v1.6.0 rebased correctly |
| Defence-in-depth on source_score | ✅ Added to ELIGIBILITY_GATES with removal-trigger comment |
| Repo source committed before deploy | ✅ commit `f65e16d2` before `deploy_edge_function` call |
| Deploy success | ✅ version 52 → 53, status ACTIVE, `VERSION = "auto-approver-v1.6.0"` verified |
| First cron tick `eligibility_safety_net_fires: 0` | ✅ |
| First cron tick `errors: 0` | ✅ |
| First cron tick deterministic given pre-deploy cooldown distribution | ✅ All 30 fetched drafts were cycling-30 with active cooldowns (12:30 UTC last touched) |
| **Lesson #51 honoured** (disproportionate scrutiny on terminal-decision authority) | ✅ 4-round pre-design ChatGPT reviews (prior sessions) + 3 MCP fires this session + JSONB pre-flight + baseline drift correction + defence-in-depth on source_score |
| **Lesson #61 promoted** (third vindication via JSONB pre-flight) | ✅ Promoted from candidate → canonical in action_list v2.19 |

### Production state at session end (snapshot, 12:42 UTC)

- **EF**: auto-approver v1.6.0 ACTIVE on Supabase (version 53)
- **Repo source**: `auto-approver-v1.6.0` on main (commit `f65e16d2`)
- **First-tick observed behaviour**: 30 cooldown_skips, 0 eligibility_safety_net_fires, 0 errors
- **Drafts at `needs_review`**: 563 (no change yet — terminal rejections start ~T+4h when cooldowns expire)
- **Cooldown distribution among 563**: 482 never_auto_reviewed, 30 cooldown_active <4h, 51 cooldown_expired
- **Approvals/rejections last hour**: 0/0 (F-PUB-004 starvation pattern still observable in last-hour view; will close after first terminal rejection wave at T+4h)

### Expected timeline post-deploy

- **T+0 to T+4h** (12:40 → ~16:30 UTC): cooldown holds 30 cycling drafts. Cron ticks every 10min still fetch them; all skipped via cooldown.
- **T+4h** (~16:30 UTC): cooldown expires for first cohort → v1.6.0 evaluates → terminal rejects on body_length/sensitive_keywords gate failures → `trg_handle_draft_rejection` fires → slot resets.
- **T+4h+**: AI worker generates fresh drafts for reset slots. 482 never-reviewed drafts begin getting processed as buckets clear.
- **T+4-6h**: fresh approvals begin to flow as some new drafts pass content gates.

**S16 standing check active**: monitor fresh-approval rate across multiple (client, platform) buckets within 24h of deploy.

### Lesson #51 / #61 / #62 status

- **Lesson #51 (CONFIRMED, REINFORCED v2.19, HONOURED throughout this session)** — terminal-decision authority requires disproportionate scrutiny. The most-scrutinised single deploy in ICE history.
- **Lesson #61 PROMOTED (canonical v2.19)** — Pre-flight discipline must include JSONB-path validation on every brief- or patch-referenced JSONB field, AND `information_schema.columns` lookup on every brief-referenced table, AND test-running every SQL block before brief/patch authoring. Three vindications: nightly-health-check v1 schema bugs (Q7/Q9), nightly-health-check v2 SQL syntax bug (Q-true-stuck), this session's JSONB validation gap caught by MCP review #2 (closed via 967/967 SELECT).
- **Lesson #62 candidate (NEW v2.19)** — Production EF source must be in repo BEFORE deploy. v1.5.0 dashboard-only deploy created 4-week record-of-truth gap that surfaced as confusion during v1.6.0 baseline rebase. Forward defence: every EF deploy via chat MCP automatically pushes source to repo first; manual dashboard deploys are last-resort and require same-session repo backfill. B37 captures the governance work; promote when seen in 2+ more sessions.

### Standing rule update (D-01 + protocol v2.17)

This session is the first end-to-end production deploy under protocol v2.17. Three MCP fires before deploy + escalation handling per response-side procedure + Lesson #51 honoured throughout. Protocol works as designed. **No protocol changes proposed.**

### Strategic posture at session end

**Workstream 2 closed.** SQL v5 was LIVE prior session; EF v1.6.0 LIVE this session. F-PUB-004 starvation cascade is mechanically committed to closure (4h cooldown delay on first terminal rejections, then trg fires → slot resets → fresh draft generation → approvals begin to flow).

**Closure-first discipline now codified.** D186 locks the find/fix time allocation. Next session opens with closure budget tracking and 20-finding cap.

**Build path forward:**
1. **Tomorrow morning (Sun 3 May ~16:00 UTC)**: PK reads scheduled Cowork health-check output, signals "morning check" or "done"; chat fetches state file from GitHub. Validates first unobserved Cowork run.
2. **Same morning or next session**: S16 standing check on fresh-approval rate (~T+24h post-deploy = ~12:40 UTC Sun 3 May). Verify approvals flowing across (client, platform) buckets.
3. **Next session**: B-INV-LinkedIn-Queue-Stall investigation — 5 LinkedIn × Property Pulse true-stuck drafts. Hypothesis order locked from PK turn (per prior session log).
4. **F04 migration apply** — Cowork autonomously drafted at 10:20:54Z prior session; chat owes Supabase MCP apply per D170 + Q-post-render-log-001 closure (recommend Option A).
5. **Following sessions**: T02 Gate B exit ratification (Sun 3 May default), T05 Meta dev support, T06 YouTube OAuth reconnect.
6. **Slice 3 v0 spec authoring** still earliest 4-5 sessions out per D184 + D186.

### Closing note for next session

**B31 is closed.** F-PUB-004 closure mechanism deployed and verified at first-tick level. Full closure observable in 4-6h.

**Three new chat capabilities proven in this session:**
- Supabase MCP `deploy_edge_function` (first production fire)
- T-MCP-02 quota completed (was 4 of 5; now 7 of 5 with 3 fires this session)
- Lesson #51 honoured at scale (most-scrutinised single deploy in ICE history)

**D186 codified.** Next session begins with closure budget tracking. Action list v2.19 carries the open-finding count + 14d closure hours alongside the standard sections.

**B37 candidate captured** — v1.5.0 source archive governance gap. No action required this session beyond capture; v1.5.0 changes are embedded in v1.6.0 commit so record-of-truth is restored.

**Next chat-side bottleneck**: B-INV-LinkedIn-Queue-Stall (Property Pulse 5 stuck drafts). Then F04 migration apply.

---

## 🟢 2 MAY SATURDAY LATE EVENING SYDNEY — SESSION-END RECONCILIATION (APPENDED)

This section APPENDS to the Saturday afternoon ChatGPT Review MCP build section below. Single continuous chat thread spanned ~7+ hours, covering: (a) T-MCP-01 first real fire on T02 Gate B exit decision; (b) T02 extended 24h per MCP review correction; (c) MCP review protocol v2.17 codification; (d) D182 nightly-health-check-v1 brief shape #3 validation across v1 → v2 → v2.1; (e) Cowork executor prompt v1 → v2.1 (cold-start fix); (f) after-run handover loop codified in automation_v1_spec.md; (g) Cowork → Scheduled tab daily 02:00 AEST configured for nightly health check; (h) ChatGPT-reviewed Slice 3 build path → ground reset to closure-first discipline; (i) B31 reconfirmed as next-session-active focus.

### Sequence of events (chronological, summarised)

**1. T-MCP-01 closed (~05:48 UTC)** — first real fire of `ask_chatgpt_review` from a fresh claude.ai chat session. Tool loaded via `tool_search`; fired with `action_type=plan_review` on T02 Gate B exit decision. Returned schema-conformant response (verdict=`partial`, risk_level=`medium`, confidence=`medium`, routing_decision=`escalate_explicit_flag`). Wrote row to `m.chatgpt_review` (id `2bab95d5-36bb-47f8-88e4-75b4887d458f`) with full telemetry. Backend-enforced routing fired correctly per `requires_pk_escalation=true`. **B34 (`estimated_cost_usd` null) confirmed as cosmetic-only.**

**2. T02 Gate B extended 24h** — ChatGPT raised one substantive concern (n=3 shadow ai_jobs sample size against <5% target). PK chose Path A (accept correction, extend observation 24h) over Path B (override): cost of waiting zero, and avoid setting precedent of overriding the first real MCP escalation. T02 extension memo committed at `docs/audit/runs/2026-05-02-t02-extension.md`. T02 due date moved Sat 2 May → Sun 3 May with explicit 5-signal panel exit conditions.

**3. MCP review protocol codified (v2.17)** — PK feedback post-T-MCP-01 formalised as `docs/runtime/mcp_review_protocol.md`. Two halves: **call-side** — 7 named context fields required (`decision_under_review`, `production_action_if_approved`, `consequence_if_delayed`, `cost_of_waiting`, `current_evidence`, `known_weak_evidence`, `default_action`); **response-side** — 6-step procedure when tool returns `escalate=true`. T-MCP-04 progressed to **half-codified** (repo doc shipped; project system prompt update in claude.ai still pending PK manual edit).

**4. D182 nightly-health-check brief shape #3 validated** — three brief versions in one session:
   - **v1 first run** (06:48 UTC) — Cowork manual fire. 4-of-4 measurable thresholds Good. Surfaced 4 brief-author schema bugs in Q7/Q9 (column names + status enum); recovered via default-and-continue + `information_schema.columns` lookup. **Lesson #61 candidate** captured.
   - **B investigation** discovered v1's boolean `has_stuck_items=true` obscured a meaningful signal: **5 LinkedIn-approved drafts at Property Pulse with `publish_attempts=0`** sitting in queue 16h+ overdue despite `publish_enabled=true` and `linkedin-zapier-publisher-every-20m` cron healthy 72/72 in 24h. Saved as separate investigation thread B-INV-LinkedIn-Queue-Stall.
   - **v2 brief patch** — schema fixes; NEW Q-stuck (drill-down) + Q-true-stuck (actionable); NEW Section 6a/6b (categorisation Cat A/B/C); NEW Section 10 priority-tier flags; NEW S17 minimum-n guard (skip alert when calls < 10).
   - **v2 second run** (07:48 UTC) — **7-of-7 measurable thresholds Good**. Section 10 Priority 1 auto-detected the same 5 LinkedIn × Property Pulse cluster. **One brief-author SQL syntax bug in Q-true-stuck**: `array_agg(... ORDER BY ... LIMIT 5)` is invalid Postgres. Cowork rewrote as correlated subquery; captured as Q-002.
   - **v2.1 brief patch** — Q-true-stuck SQL replaced with slice notation `(array_agg(... ORDER BY ...))[1:5]` per PK Option A. Brief shape locked. Q-002 closed.

**5. Cowork executor prompt v1 → v2.1 (cold-start fix)** — Cowork's first paste of v1 prompt in a fresh session asked 3 clarifying questions, refused to fire. v2.1 patches: explicit repo, explicit Supabase project ID, "infrastructure already exists" warning, scaffolding clarifier, Lesson #61 pre-flight discipline, after-run handover awareness. ChatGPT MCP review (review_id `af420233-...`, decision `apply_corrected`) returned partial verdict, two pushback points addressed in v2.1.

**6. After-run handover loop codified** — `docs/runtime/automation_v1_spec.md` extended. State file is canonical handover format; pasting findings to chat is redundant. PK signals "done" or "result"; chat fetches from GitHub.

**7. Cowork scheduled task configured** — Cowork → Scheduled → "ICE Nightly Health Check" → Daily → 02:00 AEST. First scheduled run tonight (Sat 2 May → Sun 3 May 02:00 AEST = 16:00 UTC).

**8. Slice 3 ground reset** — PK raised the next build candidate: ChatGPT MCP with tools exposed for autonomous nightly audit. On inspection, this matches Audit Slice 3 from D181/D184 — already designed, currently DEFERRED per D184. PK named the deeper concern: "the existing pipeline has issues which we keep discovering, how do we close those... I want to focus on building." Chat recommended deferral + B31 + LinkedIn P1 + closure discipline. ChatGPT review returned: strategic direction good, but plan 20-30% over-engineered for current system maturity; closure must precede construction. Synthesis: cut Slice 3 from this session entirely; v0 minimal when authored. **D186 closure discipline decision deferred to next session — chat conceded twice in writing then ran out of session time, honest miss.** *(Now closed in this very-late-evening session — D186 LOCKED.)*

**9. B31 reconfirmed as next-session-active** — Chat next session, with B32 design choice resolved + MCP review under protocol v2.17 BEFORE deploy. Lesson #51 honoured by NOT attempting B31 in session-tail at 7+ hours. *(Now done in this very-late-evening session — B31 deploy CLOSED.)*

### Today's mutations

| When (UTC) | Mutation | Type |
|---|---|---|
| 02:08 | `ask_chatgpt_review` smoke test — review_id `5cdc1d02-...` | DML (auto by EF) |
| 05:48 | T-MCP-01 first real fire — review_id `2bab95d5-...` | DML (auto by EF) |
| ~07:00 | ChatGPT review on cowork prompt v2.1 — review_id `af420233-...` | DML (auto by EF) |
| 11:17 | ChatGPT review on Slice 3 plan_review — review_id `624de0ce-...` | DML (auto by EF) |

**4 production rows in `m.chatgpt_review` end of late-evening session. T-MCP-02 progress: 4 of 5 captured.**

### Today's commits (this session-segment)

| Commit | What |
|---|---|
| `eef8cab8` | T02 extension memo + action_list v2.16 (T-MCP-01 closure recorded) |
| `bb593d26` | MCP review protocol codified — `docs/runtime/mcp_review_protocol.md` + action_list v2.17 |
| `d75729c3` | nightly-health-check-v1 brief authored (v1) + queue.md update |
| `7d6e31d7` | nightly-health-check-v1 brief v2 patched + spec extended |
| `80f3307a` | cowork_prompt v2.1 — explicit repo/MCP/infra + scaffolding clarifier |
| `c726f232` | brief v2 → v2.1 — Q-true-stuck slice notation fix |
| `fb873c44` | Q-002 closure block in `claude_questions.md` |
| (late-evening reconciliation commit) | sync_state addendum + action_list v2.18 |

### Production state at session end (late-evening snapshot)

From Cowork v2 run output `docs/audit/health/2026-05-02.md` Section 10 + headline:

- **Pipeline 3-hour stasis** — every metric flat across 6 snapshots from 05:00Z to 07:30Z. F-PUB-004 (auto-approver starvation) is upstream cause. *(Now closed via B31 in very-late-evening session.)*
- **`m.ai_job` 24h = 0 rows.** Known F-PUB-004 effect. *(Now closing.)*
- **`m.slot_fill_attempt` 24h = 0 rows.** Known F-PUB-004 effect. *(Now closing.)*
- **Publishes 24h: 6, all to `property-pulse`** (1 facebook + 5 linkedin). NDIS-Yarns / CFW / Invegent at zero — explained by known platform locks (IG locks T07 + B28 conservative disable + F-PUB-005 trigger gap).
- **5 LinkedIn × Property Pulse drafts true-stuck.** Earliest 16h+ overdue. **B-INV-LinkedIn-Queue-Stall** is the next chat-side investigation after B31.
- **No worker HTTP errors 24h.**
- **`m.post_publish_queue.dead = 42`** — stable, no growth this UTC day.
- **Cron health: 58 jobs total, 54 active, 0 with failures** in 24h window.

### Strategic posture at session end (late-evening)

**Closure-first discipline established (verbally, not yet codified).** PK named the find-vs-fix imbalance. **D186 NOT authored this session — honest miss carried forward.** *(Closed in very-late-evening session — D186 LOCKED.)*

---

## 🟢 2 MAY SATURDAY AFTERNOON SYDNEY — CHATGPT REVIEW MCP BUILT AND CONNECTED — APPEND-ONLY SESSION

Single-session build of the Claude→ChatGPT cross-check MCP. Idea conceived 1 May after the 4hr context-window incident. Built end-to-end Saturday afternoon Sydney; connected to claude.ai at 03:16:48 UTC. **The mechanism that automates the human-in-the-middle review pattern (D-01 standing rule) is now itself live.**

### Sequence of events

1. **Brief authored** as `docs/briefs/chatgpt-review-mcp-v1.md`. ChatGPT review round 1 caught: `json_object` → `json_schema` upgrade; backend-enforced routing not model-enforced; expanded audit table schema.

2. **ChatGPT review round 2** caught a real Postgres bug: `now()` inside a partial unique index predicate fails IMMUTABLE function requirement. Brief patched to v1.1: added `idempotency_key` column + UTC-date-bucket pattern. Would have failed the migration outright.

3. **Three migrations applied via Supabase MCP per D170:** `m.chatgpt_review` (31 cols, 5 idx, 16 constraints), service-role grants, `m.mcp_oauth_client` + `m.mcp_oauth_code`.

4. **OpenAI account setup**: project `ice-review`, $50/mo budget alert at $35 + 100%.

5. **Three Supabase secrets set:** `OPENAI_REVIEW_API_KEY`, `MCP_BRIDGE_BEARER_TOKEN`, `INTERNAL_WORKER_TOKEN`.

6. **Two EFs deployed:** `chatgpt-review-worker` v1.0 + `mcp-chatgpt-bridge` v1.2.2 (OAuth 2.1 + DCR + PKCE).

7. **End-to-end PowerShell tests passed** (5 runs): handshake, tools/list, tools/call, idempotency, audit-row verification.

8. **Hit Supabase EF gateway quirk**: `Content-Type: text/html` set in EF code arrives as `text/plain` at the browser. v1.2.0 + v1.2.1 code fixes didn't work. **Confirmed via live `Invoke-WebRequest` headers inspection — gateway behaviour, not code bug.**

9. **ChatGPT review round 3 (live)** pushed for live header inspection BEFORE another round of code patches. Lesson #46 in action.

10. **Pivoted to host consent UI on Vercel**: `app/mcp-consent/page.tsx` in invegent-dashboard. Bridge `/authorize` redirects to `dashboard.invegent.com/mcp-consent`. Clean two-surface architecture.

11. **Connected to claude.ai at 03:16:48 UTC** — client `mcp_69ff8298c1e006f509f104b30a0934d9` registered, auth code exchanged, JWT issued.

### Today's commits (Saturday afternoon)

`906a7ec` brief v1.0 + queue add | `b7c0543` brief v1.1 ChatGPT review round 2 patches | `464c6a2` EFs v1.0 | `c8c4ab5` mcp-chatgpt-bridge v1.2.0 (OAuth) | `7f90119` v1.2.1 htmlResponse helper | `aa6cded` v1.2.2 Vercel pivot | `f07686e` reconciliation commit | (later) post-reconciliation verification addendum.

**invegent-dashboard `main`:** `828b06d` feat(mcp-consent): app/mcp-consent/page.tsx OAuth consent UI on Vercel.

### Lesson #46 third vindication

Three ChatGPT cross-check production saves now in the running tally:
1. **30 Apr/1 May earlier**: Wrong YT trigger fix (averted)
2. **1 May late evening**: Wrong bulk-quarantine of 87 legacy FB drafts (averted)
3. **2 May this session**: Wasted patching of the Supabase EF gateway HTML quirk (averted)

### Lesson #58 candidate (NEW)

> *"When a platform's gateway misbehaves with a specific response type that you don't control, route around on a different surface rather than fighting the platform."*

### Addendum — post-reconciliation verification

`m.mcp_oauth_client` actual row count is **7 rows (1 working + 6 dead)**, not 5 as initially documented. The two earliest dead rows (`mcp_37bdbacd...` 02:30:03 + `mcp_7a93d2e2...` 02:31:19) were initial-bridge-deploy test registrations that pre-dated the broken text/plain consent page period. All 6 dead rows have `last_used_at: null`. Audit trail; no functional impact.

---

## 🟣 1 MAY EARLY MORNING UTC — PK ON PHONE — APPEND-ONLY SESSION (T07 STEP 4 ATTEMPT + ROLLBACK + AUTO-APPROVER STARVATION DISCOVERY)

This section APPENDS to the Thursday late-evening reconciliation. PK was on phone (no laptop). Single continuous chat thread covering: T07 step 4 cron re-enable + monitor, cron rolled back when NDIS-Yarns IG hit subcode 2207051, deep investigation revealed auto-approver starvation as the actual largest production issue, ChatGPT cross-checks #1 (wrong YT trigger) and #2 (wrong bulk-quarantine) both halted by chat before harmful action, T01 +21h obs run, reconciliation.

### Sequence of events

**20. T07 step 4 attempted** — PK confirmed cron jobid 53 should be re-enabled. Chat ran `cron.alter_job(53, true)`. Pre-flight verified.

**21. T07 step 5 first observation (00:18 UTC 1 May)** — 2 cron ticks fired, both `succeeded` at cron layer. CFW × 2 attempts: failed at publisher's pre-flight gate with `not_approved:needs_review`. NDIS-Yarns × 2 attempts: reached Meta API. 00:00 UTC subcode 2207027 silent flag; 00:15 UTC **subcode 2207051 "Action is blocked"**.

**22. Cron rolled back + NDIS-Yarns IG locked (00:19 UTC 1 May)** — `cron.alter_job(53, false)`; NDIS-Yarns IG `publish_enabled=false` with paused_reason. Final IG state: PP false, NDIS-Yarns false, CFW true, Invegent true.

**23. Deep investigation** — Discovered: CFW IG queue rows reference drafts in `approval_status='needs_review'`, not `'approved'`. Trigger function `m.enqueue_publish_from_ai_job_v1` doesn't check approval_status. **F-PUB-005**: design coupling problem. Auto-approver fetch returns same 30 highest-scored drafts every cycle; all fail body_length or sensitive_keywords gates; no reject-cooldown means rejected drafts re-enter top-30. **F-PUB-004 (HIGH, NEW)**: auto-approver starvation. *(Closed via B31 in 2 May very-late-evening session.)*

**24. ChatGPT cross-check #1** — On the publisher operational audit's first-pass YT framing, ChatGPT pulled R6 spec evidence; pre-check via `youtube-publisher` v1.5.0 EF source proved trigger exclusion was intentional architecture. Real cause: OAuth refresh-token expiry. **Lesson #45 application**.

**25. ChatGPT cross-check #2** — On chat's proposed fix for F-PUB-004 (bulk-update legacy 17 Apr FB stragglers to 'dead'), ChatGPT pushed back: CHECK constraint violation, scope was 12 rows not 87+, cap mismatch is synthesis-layer not draft-layer. Chat halted before applying any UPDATE. **Lesson #46 application**.

**26. T01 Phase B +24h obs** — All 5 targets pass. **T01 ✅ done at +21h.**

**27. S10 baseline established (00:30 UTC 1 May)** — Last 24h FB: 5 published (healthy). LinkedIn: 3 published (running on remainder of pre-25-Apr `approved` queue). YT: 0 (broken OAuth). IG: 0 published, 2 failed.

**28. action_list updated through v2.3** — T07 step 4 attempted+rolled-back; NDIS-Yarns IG locked; T01 ✅; T08 added P0; D-08 + D-09 added; B22 + B23 added; S11 added; F-PUB-002 corrigendum + F-PUB-004 + F-PUB-005 captured.

### Lesson #46 vindication

F-PUB-004 (auto-approver starvation) is the most direct demonstration of Lesson #46 to date. The auto-approver-sweep cron returned 200 OK on every run while the actual business outcome was zero approvals across IG and LinkedIn for 5+ days. **S11 added** to fill the *approvals dimension* monitoring gap.

---

## ⛔ DO NOT TOUCH NEXT SESSION (CARRIED FORWARD)

(All prior protections still apply.)

- **The NDIS-Yarns IG `publish_enabled=false` row state** (T07 step 4 rollback). Do not flip back to `true` until T05 (Meta dev support outcome) decides recovery. **B31 / T08 EF v1.6.0 is now LIVE — but the Meta-side block still applies independently.**
- **The cron jobid 53 `active=false` state.** Do not re-enable until: (a) ✅ T08 patch deployed (DONE this session via B31) AND (b) at least one fresh CFW or Invegent IG draft observed reaching `approved` status (pending; expected ~T+4-6h post-deploy as cooldowns expire and fresh drafts generate). Then revisit with `?limit=1` only.
- **The Phase B body-health gate** continues to hold. T02 ratification deferred 24h per T-MCP-01 review correction; default Sun 3 May exit on broader 5-signal panel clean.
- **The six failed mcp_oauth_client rows** (`mcp_37bdbacd...` 02:30, `mcp_7a93d2e2...` 02:31, `mcp_d523f33d...` 02:47, `mcp_3237c6a2...` 02:47, `mcp_3223edb8...` 02:48, `mcp_c81c5496...` 02:50) — leave them. Audit trail.
- **The `m.chatgpt_review` row `2bab95d5-...`** — status currently `escalated` but PK chose Path A (extend observation 24h). T-MCP-05 close-the-loop UPDATE still pending PK confirmation.
- **The 7 `m.chatgpt_review` rows now total** — including 3 from this session (B32 design + v1.6.0 first-cut + v1.6.0 rebased). Counted toward T-MCP-02 quota; quota now at 7 of 5 (exceeded).

---

## 🟡 NEXT SESSION (Sun 3 May or later)

> **All next-session items are also in `docs/00_action_list.md` v2.19 with priorities and triggers.** Read that file alongside this one for the active backlog view.

### Required (time-bound)

1. **Personal businesses check-in** — per standing rule entry 19 (P0).

2. **Morning check on first scheduled Cowork run** — "ICE Nightly Health Check" should fire Sun 3 May 02:00 AEST = Sat 2 May 16:00 UTC. PK signals "morning check" or "done"; chat fetches state file from GitHub. If clean, brief shape #3 fully operationalised. If failed, investigate before further automation.

3. **S16 fresh-approval rate verification** — at ~T+24h post-deploy (~12:40 UTC Sun 3 May), verify approvals flowing across (client, platform) buckets. **First success criterion that B31 actually closes F-PUB-004.** Expected: terminal rejections begin firing around 16:30 UTC Sat 2 May (T+4h after cooldowns expire on cycling-30); fresh approvals begin within 1-2h after that as AI worker generates new drafts for reset slots.

4. **F04 migration apply** — Cowork autonomously drafted `supabase/migrations/20260502102054_audit_post_render_log_column_purposes.sql` prior session at 10:20:54Z. Chat owes Supabase MCP apply per D170 + Q-post-render-log-001 closure (recommend Option A).

5. **T02 Gate B exit decision** — Sun 3 May default: ratify on schedule per extended observation; check 5-signal panel.

6. **B-INV-LinkedIn-Queue-Stall** — investigate the 5 LinkedIn × Property Pulse true-stuck drafts. Hypothesis order locked from PK turn (per prior session log). Sample draft IDs in `docs/audit/health/2026-05-02.md` Section 6b: 80633543, 1b994655, 5a07f80a, 07532767, e22308fd.

7. **PK: T06** — reconnect YouTube OAuth via Supabase dashboard (3 clients).

8. **PK: T05** — Meta dev support contact (single conversation covering business verification + PP IG block + NDIS-Yarns IG block + App Review status).

### Strict ordering for IG re-enable

T07 step 4 cannot be retried until ALL of:
- ✅ T08 (F-PUB-004 patch) deployed (DONE this session via B31 → MCP reviews → Supabase MCP deploy)
- 🟡 At least one fresh CFW or Invegent IG draft observed in `approval_status='approved'` (proves auto-approver patch works) — expected ~T+4-6h post-deploy
- 🟡 T05 Meta dev support outcome known for PP and NDIS-Yarns
- 🟡 Cron command updated to `?limit=1` (currently `?limit=2`)

### Closure work owed (per D186)

- **F04 migration apply** (closes `Active` row in action_list)
- **B-INV-LinkedIn-Queue-Stall** (closes the open investigation)
- **T-MCP-05** close-the-loop UPDATE on `m.chatgpt_review` row `2bab95d5-...` (closes telemetry edge case)

### Slice 3 build path (after closure work above)

- **Slice 3 v0 spec authoring** — gated on D186 closure budget + B31 closure observable + LinkedIn P1 closed + 1 month of nightly-health-check observation. Earliest: 4-5 sessions out. Per ChatGPT review on Slice 3 plan: "You don't need more discovery yet. You need closure discipline + one minimal audit prototype."
- **Architecture sketch (for v1 only — not v0):** two separate workers, two separate OpenAI API keys, two separate token budgets per PK call. Consultation worker (`chatgpt-review-worker`) stays as-is at $50/mo. Audit worker (`chatgpt-audit-worker`) on new project `ice-audit` at $20/mo.
- **No code lands** until B31 closure observed + LinkedIn P1 close + closure discipline operationalised.

### Backlog (no specific deadline)

See `docs/00_action_list.md` v2.19 sections for the full lists with triggers — including B34 (estimated_cost_usd calc) + B35 (m.chatgpt_review_daily telemetry view) + B36 (slice 3 v0 spec authoring trigger) + **B37 NEW (v1.5.0 source archive governance)**.

---

## D182 sunset review reminder

10 briefs validated across 3 brief shapes (migration drafting, audit-snapshot markdown, pipeline-state digest). nightly-health-check-v1 v2.1 is locked. F04 (post_render_log) is `review_required` from Cowork's autonomous run prior session — chat picks up next session for migration apply. Sunset review still 12 May 2026; portfolio is on track to comfortably justify D182 framework continuation.

Note: B31 was NOT a D182 brief — chat-driven directly with three MCP review fires. Brief authoring discipline remains at 10/3 portfolio.

---

## END OF SATURDAY 2 MAY VERY LATE EVENING SYDNEY SESSION-SEGMENT

B31 / B32 / T08 closed end-to-end. Auto-approver v1.6.0 LIVE on Supabase (version 53). First cron tick verified `eligibility_safety_net_fires=0`. F-PUB-004 closure mechanically committed; observable terminal rejections begin ~T+4h. D186 closure discipline locked. Lesson #61 promoted from candidate to canonical (third vindication). Lesson #62 candidate captured (v1.5.0-deployed-but-not-in-repo). T-MCP-02 quota at 7 of 5 (exceeded). Action list at v2.19. Closure hours this session: ~3.5h (recorded for D186 budget tracking).

---

## 🟢 3 MAY SUNDAY MORNING SYDNEY — F-PUB-006 PARTIAL + B-INV-LINKEDIN INVESTIGATION (CC) — APPEND-ONLY SEGMENT

Session opened by claude-code (CC) per D170 boundary: CC drafts SQL + investigation; chat applies via Supabase MCP `execute_sql` after firing MCP review. Brief: `docs/briefs/2026-05-03-fpub006-zombie-cleanup-cc.md` (created 2026-05-03T22:15:00Z forward-dated; DB clock at execution = 2026-05-02 22:51 UTC = 2026-05-03 08:51 AEST).

### Sequence (chronological)

1. **Pre-flight (Lesson #61, mandatory)** — three read-only queries via Supabase MCP `execute_sql`:
   - **Step 0a** (orphan rows: `status='queued' AND last_error='post_draft_not_found' AND post_draft missing`) → **4** ✓ exact match.
   - **Step 0b** (not_approved zombies: `status='queued' AND last_error='not_approved:needs_review' AND draft.approval_status='needs_review'`) → **17** ⚠ deviation (expected 13). Outside abort range (0 OR > 25) but inside halt-Stage-2 branch (any ≠ 13) per failure-mode table. Stage 2 halted.
   - **Step 0c** (5 named PP-LinkedIn queue_ids with `attempt_count IS NULL`, scheduled ≥12h ago) → **5** ✓ exact match.

2. **Step 0b characterisation** — 17 rows broken down: 4 CFW-IG (created 2026-04-23/24, IG cron paused per separate Meta-block governance), 11 PP-FB (2026-04-27), 1 NDIS-FB (2026-04-28), 1 PP-FB (2026-04-28), 1 PP-FB (2026-04-29). The +4 delta vs brief's expected 13 is consistent with F-PUB-005 trigger gap continuing to produce ~4 zombies/day since brief authoring.

3. **Stage 1 SQL drafted** at `supabase/sql/2026-05-03-fpub006-stage1-orphan-cleanup.sql` — predicate verbatim from brief; verification SELECT embedded; `dead_reason='post_draft_not_found_orphan_F-PUB-006_2026-05-03'`. Awaiting chat MCP review (`action_type=sql_destructive`, payload in brief Stage 1) + apply.

4. **Stage 2 SQL NOT drafted** — halt honoured per failure-mode table. PK to triage 17-vs-13 drift: either authorise predicate-as-is (the predicate re-evaluates `pd.approval_status='needs_review'` at apply time so any drafts that have transitioned to approved are skipped) OR refresh brief with new expected count.

5. **Stage 4 LinkedIn stall investigation (read-only, complete)**:
   - Source-side: `linkedin-zapier-publisher/index.ts` (v1.1.0) delegates row selection to `m.publisher_lock_queue_v2(p_limit, p_worker_id, p_lock_seconds, p_platform='linkedin')`. The eligibility WHERE lives in the RPC, not the EF.
   - RPC body retrieved via `pg_get_functiondef`. Filters: `q.status='queued'`, `q.scheduled_for <= v_now`, lock-timeout, `cpp.publish_enabled`, `cpp.paused_until`, NOT EXISTS running row, **`cpp.min_gap_minutes` (240) → last_published_at <= v_now - 4h**, **`cpp.max_per_day` (2) → published_today < 2**. Picker takes top-`p_limit` by `row_number() OVER (PARTITION BY client_id, platform ORDER BY scheduled_for ASC, created_at ASC)`.
   - Data-side: 5 stuck rows have `attempt_count IS NULL` (RPC never picked them; RPC increments attempt_count on lock). All have `approval_status='approved'`, `publish_enabled=true`, `paused_until=NULL`, single cpp row per (client_id, platform) — eligibility-side noise filtered out.
   - **Hypothesis (HIGH confidence with code + data evidence):** `cpp.max_per_day=2` filter excludes the 5 rows on every tick. PP-LinkedIn day-by-day: 2-3 publishes per UTC day, all packed into the first 4-14 hours of the day, exhausting the cap before the 5 stuck rows can be picked.
   - **Striking secondary anomaly:** the 3 queue_ids referenced by today's `m.post_publish` records on PP-LinkedIn (`c2fdafe6-...`, `3785396b-...`, `2a117aa2-...`) **do not exist in `m.post_publish_queue` at all** — SELECT returns 0 rows in any status. Their `platform_post_id` format `zapier-li-{ms_epoch}` matches this EF's producer but the originating queue rows are gone. Possibilities: hard-deleted post-publish, non-standard code path, or stale `post_publish.queue_id`. Either way the publish records still feed `stats.published_today` in the eligibility CTE and continue to exclude the 5 stuck rows.
   - Findings written to `docs/audit/runs/2026-05-03-fpub006-linkedin-investigation.md` with three proposed remediation paths (lead: identify phantom-publish source; surgical: temp-raise max_per_day; reset scheduled_for ineffective alone). **No remediation drafted, no DML proposed, no code changes — Stage 4e honoured.**

6. **Handover artefacts** (4-way sync per memory entry 11):
   - Run state: `docs/runtime/runs/2026-05-03-fpub006-cleanup.md`
   - Investigation file: `docs/audit/runs/2026-05-03-fpub006-linkedin-investigation.md`
   - Stage 1 SQL: `supabase/sql/2026-05-03-fpub006-stage1-orphan-cleanup.sql`
   - Action list bump v2.19 → v2.20: F-PUB-006 partial active row, B-INV-LinkedIn updated to investigation-complete, B38 NEW (F-PUB-005 trigger patch backlog candidate)
   - This sync_state addendum

### Open items for chat / PK next session

1. **Stage 1 apply** via Supabase MCP `execute_sql` (after MCP review). Expected dead-marked count: 4.
2. **Stage 2 triage** of the 17-vs-13 count drift: authorise predicate-as-is OR refresh brief.
3. **Stage 3 observability check** at +30min after Stage 2 apply (or after Stage 1 alone if Stage 2 deferred). Exit criteria: ≥1 fresh publish on NDIS-Yarns FB AND ≥1 on PP FB.
4. **B-INV-LinkedIn remediation brief authoring** post-PK review of investigation findings. Lead candidate: identify the 3 phantom 00:00-UTC publish source.
5. **B38 (F-PUB-005 trigger patch)** PK triage for priority — at ~4 zombies/day rate, every cleanup brief will face count drift on apply.

### Closure budget impact (D186)

CC closure work this session: ~0.8h (pre-flight + investigation + draft + writeup). Trailing-14-day estimate updated in action_list v2.20: ~3.5h (v2.19) + ~0.8h (this) = ~4.3h. Still below 8.0 floor; ~3.7h needed over next 13 days.

### State-capture-bump exception

No MCP review fired on this commit. CC is read-only (MCP `execute_sql` queries) + draft-only (SQL files + markdown). No production mutation. The MCP reviews fire when chat applies Stage 1 (and Stage 2 if PK clears).

### Standing rule honoured

D170 boundary: CC drafts, chat applies. ✓
4-way sync: run state + investigation file + Stage 1 SQL + action_list v2.20 + sync_state addendum. ✓
Brief Stage 4e (no remediation in this brief). ✓
Failure-mode table on Step 0b (halt Stage 2). ✓
Lesson #61 (pre-flight discipline before drafting). ✓

---

## END OF SUNDAY 3 MAY MORNING SYDNEY CC SESSION-SEGMENT

F-PUB-006 partial: Stage 1 SQL drafted (4 orphans, exact match) awaiting chat MCP review + apply. Stage 2 halted on count drift (17 vs 13). Stage 4 LinkedIn investigation complete with HIGH-confidence hypothesis (`cpp.max_per_day=2` exhaustion via 3 phantom 00:00-UTC publishes whose queue_ids no longer exist in `m.post_publish_queue`). B-INV-LinkedIn remediation deferred to separate brief next session. Action list at v2.20. Closure hours this CC segment: ~0.8h. PK signals "morning check" or "done" → chat fetches state files from GitHub and proceeds with Stage 1 apply + Stage 2 triage + Stage 3 observability.
