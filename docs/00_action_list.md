# ICE — Action List

> **Single active action index for what's queued, in flight, blocked, or frozen.**
> Source-of-truth details remain in sync_state, run states, decisions, briefs, and commits.
> Read at the start of every session alongside `docs/00_sync_state.md`.
>
> Last updated: 2026-05-11 Sydney (**v2.66 — L44–L48 process upgrades FORMALISED + committed (post-cc-0009 closure synthesis).** PK presented 5-improvement proposal capturing weaknesses observed during cc-0009 closure. Chat + ChatGPT MCP (via PK paste) reviews converged on substance. Five lessons formalised: L44 Runtime Proof Pre-flight (probes match path verbatim, halt-on-contradiction), L45 Post-mutation truth check (count-delta + ≥3-row sample, mismatch declared not normalised), L46 Reviewer Evidence Gate (3-field requirement → INFORMATIVE-BLOCKING / GENERIC-NON-BLOCKING; 2-GNB override path formalises informal Lesson #62 type-(c)), L47 Shared-state lock conditional (A=pause cron / B=`audit.session_lock` UNIQUE; build deferred until race-scope investigation), L48 Atomicity Gate (3 questions pre-Stage-A; 2-of-3 split rule). Templates + protocol patches committed at SHA `bc91af079aed987ea10ce9aaf6fd2a685eb87eb2` (2026-05-11 14:26 UTC) via single `push_files`: `mcp_review_protocol.md` REPLACED (sha `e6f8fad8` → `9bd5d3fa`) with Evidence Gate section; NEW `cc_stage_template.md` (sha `5657b69e`) bakes L44+L45+L48; NEW `sessions/_template.md` (sha `010b6964`) bakes L46 GNB log + Truth Check + Mismatch declarations. Memory line 27 `replace` consolidated old #32–#39 + new L44–L48 + pre-cc-0010A gating items into ~500 chars (memory was at 30/30 cap; lesson: at cap, target line-replacement of compressible existing entries). Three pre-cc-0010A gating items queued for next session (P1, ~30 min total): L62 attribution investigation (ChatGPT MCP vs CCD origin), L47 lock scope decision (A vs B; Stage E parallel-writer evidence suggests B), L48 Atomicity Gate application to cc-0010 brief (ChatGPT-proposed decomposition cc-0010a/b/c). NO production pipeline mutation this session. NO `m.chatgpt_review` fires. NO EF deploys. NO DB writes. T-MCP-02 cum 59 unchanged. State-capture exceptions: 0. Dashboard roadmap PHASES — **22nd** consecutive deferral. Commit 1 (this file v2.66 close): action_list. Commit 2 (paired): per-session file + sync_state v2.66. Production payload commit `bc91af07` already landed earlier in the session via `push_files`. **Next major:** L62 + L47 investigations (~30 min) → L48 application to cc-0010 → cc-0010A (or unsplit cc-0010) authoring as first live test of new templates.)

---

## How this file works

**At session start**, chat reads this file and:
1. Rebuilds the Today / Next 5 view
2. Runs Standing checks (S1–S29)
3. **Verifies D186 closure budget**
4. Asks PK about Personal businesses
5. Surfaces Time-bound items due today/tomorrow

**Standing rule (D-01)**: every production patch + action_list version bump that touches production state goes through ChatGPT cross-check before deploy/commit. v2.66: 0 D-01 fires (meta-process session; no production pipeline mutation).

**Standing rule (D-186)**: closure work has a hard time budget. 20-finding cap on P0+P1 open items + 4h/week closure floor + 2-week pause trigger.

**Standing rule (D-YT-OAUTH-1)**: invegent-dashboard `/connect` first for FB/IG/LI/YT OAuth reconnects.

**Standing rule (D-PREV-16)**: F-EF-DRIFT-PREVENTION Option F is approved target design. All stages CLOSED.

**STANDING RULE (Lesson #62, v2.41 + v2.50 refinement, v2.66 formalised as L46)**: ChatGPT MCP echoing self-disclosed weak evidence as objections → GENERIC-NON-BLOCKING classification per L46 (logged, not escalated). Two consecutive GNB on same proposed action → PK explicit approval authorises override. v2.66: not exercised (no fires this session).

**STANDING RULE (Lesson candidate #68, v2.43)**: All fired writes must be tracked inline. v2.66: 1 GitHub commit `bc91af07` via `push_files` (templates + protocol patches, 3 files) + 1 memory `replace` (line 27) + this 4-way sync close (2 commits split per size budget). Zero DB writes. Zero EF deploys. Zero EF source edits. Zero schema changes. Zero `m.chatgpt_review` fires.

**STANDING RULE (v2.46 — Dashboard Architecture Review)**: All architecture-level decisions live in `docs/dashboard-review-2026-05/`.

**STANDING RULE (v2.47 — Documentation framing)**: Sync_state framing of cron timing always anchors to **UTC clock-time + Sydney clock-time**.

**STANDING RULE (v2.48 — Pre-flight discovery as standard CC pattern)**: §1.5-style pre-flight discovery is now the default brief pattern for any CC dashboard/portal/web/script work.

**STANDING RULE (v2.50 — Acceptance integrity)**: Acceptance is not complete until the actual review artifact is received and reviewed.

**STANDING RULE (v2.55 — brief-runner-v0 baseline patterns from cc-0003 cycle)**: L1–L4 are baseline:
- **L1 HALT mechanism is load-bearing.**
- **L2 doc-only patch → re-execution loop.**
- **L3 result-file preservation.**
- **L4 pre-state baseline pattern is now required.**

**v2.56 ADDITION**: **L6 (cross-brief patch propagation when invariant fails) is now baseline.**

**v2.57 ADDITIONS:** L10–L18.

**v2.58 ADDITIONS:** L22–L25.

**v2.59 vindications and promotions:** L19+L20+L21 VINDICATED; L11+L16+L17+L18 vindicated again. L17 promotion to baseline.

**v2.61 ADDITIONS** (cc-0008 v4→v5 cycle): L33 (event-trigger pre-flight survey mandatory) + L34 (k.fn_sync_registry auto-registration) + L35 (ON CONFLICT DO UPDATE for k.*) + L36 (m.chatgpt_review enum `{pending, completed, failed, escalated, resolved}`).

**v2.62 ADDITIONS**: L37 candidate (multi-stage cc-NNNN authoring) + L38 candidate (cross-brief FK deferral).

**v2.63 ADDITIONS**: L37 VINDICATED through Stage A + B; L38 catalog-level confirmation; L39 candidate VINDICATED (feature-branch + diff-review + PK-approval per CCH R11); L40 NEW candidate (squash-equivalent merge via push_files).

**v2.64 ADDITIONS** (cc-0009 Stage C end-to-end + retroactive doc sync): L37 vindicated again; L41 NEW candidate (runtime grant defect at V-check + in-cycle remediation).

**v2.65 ADDITIONS** (cc-0009 Stages D + E end-to-end execution + vault pivot + verified variance): L37 FULLY VINDICATED; L41 vindicated; L42 NEW candidate (in-stage tactical pivot); L43 NEW candidate (closed-with-verified-variance pathway).

**v2.66 ADDITIONS** (post-cc-0009 process upgrades formalised + committed):
- **L44 NEW candidate baselined**: Runtime Proof Pre-flight. Before any production mutation, probe queries traverse the same path the migration or EF invocation will use. Output captured verbatim. Halt-on-contradiction. Baselined into `docs/runtime/cc_stage_template.md`. Pending first live use at cc-0010A authoring.
- **L45 NEW candidate baselined**: Post-mutation truth check. After any production mutation, count-delta + ≥3-row JSONB / shape-variance sanity sample captured verbatim. Mismatch declared (not silently normalised) with per-row decision: accept-with-variance / re-fire / rollback / escalate. Generalises Lesson #38 (count-delta) + Lesson #39 (multi-row sample). Baselined into both `cc_stage_template.md` + `sessions/_template.md`. Pending first live use at cc-0010A apply.
- **L46 NEW candidate baselined**: Reviewer Evidence Gate. Every `escalate=true` return classified before reaching PK. 3 fields required (new defect, new evidence, concrete corrective action) → INFORMATIVE-BLOCKING; any missing → GENERIC-NON-BLOCKING (logged, not escalated). 2 consecutive GNB on same proposed action → PK explicit approval authorises override. Formalises informal Lesson #62 type-(c). Baselined into `docs/runtime/mcp_review_protocol.md`. Pending first live exercise against real `escalate=true` return.
- **L47 NEW candidate documented as conditional, build deferred**: Shared-state lock. Path A (same-session race → pause competing cron during session, doc-only). Path B (cross-session race → `audit.session_lock` table with UNIQUE constraint on resource). Build only Path B if confirmed; Path A is doc-only. Stage E parallel-writer evidence at cc-0009 closure strongly suggests B but explicit investigation deferred to next session.
- **L48 NEW candidate baselined**: Atomicity Gate. 3 questions pre-Stage-A: (Q1) Can this brief succeed or fail as one atomic unit? (Q2) More than 3 unresolved assumptions at brief approval? (Q3) Would a late-stage failure force rollback of earlier stages? If 2 of 3 indicate split → brief splits into atomic sub-builds before Stage A authoring continues. Baselined into `cc_stage_template.md`. Pending first live application to cc-0010 brief.

**All seven candidates (L42 + L43 + L44 + L45 + L46 + L47 + L48 — plus prior L37 + L38 + L39 + L40 + L41 still in lifecycle) recommended for promotion to baseline at appropriate cycle once empirical evidence accumulates.**

---

## 📊 Closure budget tracking (per D186)

| Metric | Current | Limit | Status |
|---|---|---|---|
| Open findings + investigations (P0+P1) | ~5 (v2.65 ~2 + 3 NEW v2.66 pre-cc-0010A gating items) | 20 | ✅ within budget |
| Trailing-14-day closure hours | ~72h (v2.66 ~2h for review + synthesis + commit) | 8.0 floor | ✅ above floor |
| Pause trigger active? | NO | — | New automation authoring still allowed |

**v2.66 cycle: ~2h total (review reading + synthesis + memory edit + 3-file push_files + 4-way sync close).**

**State-capture exception count v2.66: 0** (no fires this session).

---

## ⭐ Today / Next 5

> **Last rebuilt:** 2026-05-11 Sydney (v2.66).
> **v2.66 note:** Three pre-cc-0010A gating items NEW at rank 1 (~30 min total work). cc-0010A authoring promoted rank 2 (was rank 1 v2.65; now gated by L62 + L47 + L48 application). Close-the-loop batch held at rank 3 (now 8 sessions overdue). F-CC-0009-EF-BACKFILL-HORIZON-FORWARD-ONLY reconciliation = rank 4 (was rank 3 v2.65; likely folded into cc-0010A brief). Platform Reconciliation View brief authoring = rank 5 (was rank 4 v2.65).

| Rank | Item | Priority | Why now | Next action |
|---|---|---|---|---|
| 1 | **Pre-cc-0010A gating items (3 items, ~30 min total)** | **P1 (NEW v2.66; gates cc-0010A)** | (a) L62 attribution investigation — pull last 5 `m.chatgpt_review` fires, classify informative vs generic, attribute pushback origin. ChatGPT MCP only → L62 unchanged; CCD also generating noise → L62 generalises + L46 names update. (b) L47 lock scope decision — inspect cc-0009 Stage E parallel-writer evidence (session file `2026-05-11-cc-0009-stages-d-e-closed.md` section "Stage E close-the-loop"). Decide A (pause cron, doc-only) or B (`audit.session_lock` UNIQUE, build). Path B likely. (c) L48 Atomicity Gate application to cc-0010 brief — apply 3 questions to `docs/briefs/cc-0010-r-reconciliation-evidence-and-matcher.md`. ChatGPT proposed decomposition cc-0010a (evidence ingestion) / cc-0010b (matcher) / cc-0010c (cron + orchestration). Validate or revise. | Next session: execute all three in opening ~30 min before any cc-0010A authoring. |
| 2 | **cc-0010A authoring (or cc-0010 unsplit if Atomicity Gate clears)** | **P1 (gated by rank 1)** | Natural successor to cc-0009 closure. Inherits cc-0009 outputs: `r.expected_publication` populated with 84 rows, `r.reconciliation_run` audit trail live, cron job 82 firing daily. First live test of new `cc_stage_template.md` (L44 pre-flight + L45 post-mutation + L48 atomicity). May fold F-CC-0009-EF-BACKFILL-HORIZON-FORWARD-ONLY (rank 4) into the brief via Option (a). | After rank 1 completes. Author at `docs/briefs/cc-0010a-...md` (if split confirmed) or `docs/briefs/cc-0010-...md` (if Atomicity Gate clears unsplit). |
| 3 | **5-row close-the-loop UPDATE batch (UNBLOCKED v2.61, batch now 8 sessions overdue)** | **P2 (rank 3 v2.66; batch overdue 8 sessions)** | UNBLOCKED by L36 enum discovery v2.61. 5 prior cc-NNNN rows still `status='escalated'`. Batch UPDATE in single `execute_sql` with CASE expression. ~10 min. Can be batched before/alongside cc-0010A brief authoring without disrupting any gates. | Single `execute_sql` with CASE mapping cc-0003 v2 + cc-0004 + cc-0006 + cc-0007 + cc-0005 v4 each → `status='resolved'`. |
| 4 | **F-CC-0009-EF-BACKFILL-HORIZON-FORWARD-ONLY reconciliation** | **P3 (carry from v2.65)** | New follow-up opened at cc-0009 closure. PK decision pending on option (a) update brief [chat-recommended], (b) update EF source, (c) leave both as-is. Likely folded into cc-0010A brief via Option (a). | PK directs option. Most likely folded into cc-0010A brief authoring. |
| 5 | **Platform Reconciliation View — BRIEF AUTHORING** | **P2 — held at rank 5 v2.66** | Sequencing blockers all cleared. Brief NOT YET AUTHORED. cc-0009 outputs (populated `r.expected_publication`) feed Platform Reconciliation View's expected-vs-observed matrix. Can proceed in parallel with cc-0010A if PK directs. | Brief authoring when PK greenlights. |
| 6 | **Dashboard Architecture Review Phase 0 prerequisites** | P1 TOP | Unchanged. PK confirms 7 default-blockers via `docs/briefs/cc-0001-dashboard-phase-0-defaults.md`. | PK confirms. |
| 7 | **AI cost view** | P3 quick win | Unchanged. ~1h estimate. | Author `vw_ai_cost_monthly` view DDL on `m.ai_job` + add NOW dashboard tile. |
| 8 | **Personal businesses check-in** | P0 standing | Carry. | PK reports any time-sensitive items + Crazy Domains clean-up status. |

**Passive observation item this session-window:** **First cron-driven `r.reconciliation_run` row at 2026-05-11 16:05 UTC** — sanity check at next session start (carry from v2.65). Verify `trigger='scheduled'`, `triggered_by='pg_cron_cadence_rule_generator_daily'`, status=`succeeded`, vault secret resolution worked.

---

## 🟢 F-EF-DRIFT-PREVENTION — STATUS BLOCK (unchanged)

All stages CLOSED. Cron jobid 80 + 81 active=true. No drift fires this cycle.

---

## 🟢 ICE Dashboard Architecture Review — STATUS BLOCK

**Status:** COMPLETE at v2.46. 12 docs at `docs/dashboard-review-2026-05/`. PRV-0 v2 design lock at commit `6e989517` is direct cc-0008 + cc-0009 input.

**v2.66 update:** unchanged from v2.65. cc-0009 closure didn't unblock new dashboard work; 7 Phase 0 default-blockers still pending PK confirm/override.

---

## 🟢 Tier 1 + M4 + M5 + M6 Phase A + M6 Phase B + M8a — STATUS BLOCK (unchanged v2.66)

Unchanged from v2.65. **Urgent pipeline-integrity block EFFECTIVELY COMPLETE v2.59.**

---

## 🟢 Platform Reconciliation View — BRIEF CANDIDATE STATUS BLOCK (held at rank 5 v2.66)

**Status v2.66:** held at rank 5 of Today/Next 5 because pre-cc-0010A gating items occupy rank 1 + cc-0010A authoring occupies rank 2 + close-the-loop batch + F-CC-0009-EF-BACKFILL-HORIZON-FORWARD-ONLY occupy ranks 3+4. **Still PROMOTED to top deliverable category after cc-0009 lifecycle.** Can proceed in parallel with cc-0010A brief authoring once PK directs.

**Classification:** pipeline observability / reconciliation. NOT cosmetic dashboard work.

**Title:** Platform Reconciliation View — by day / client / platform.

**Cross-reference:** cc-0009 outputs now populated. Once cc-0010 (matcher + evidence + reconciliation_match) lands, `r.reconciliation_match` becomes the second primary input.

**Required scope (PK-directed 2026-05-09):** unchanged.

**Seed manual observations (PK direct, 2026-05-09 Sydney; preserved across v2.58–v2.66 closes):** unchanged.

**Implementation gates:** unchanged.

**Brief author when promoted:** chat.

---

## 🟢 Process Upgrades L44–L48 — STATUS BLOCK (NEW v2.66)

**Status v2.66:** **All 5 candidates baselined in repo + memory. Pending first live exercise.**

**Templates + protocol commit:** `bc91af079aed987ea10ce9aaf6fd2a685eb87eb2` (2026-05-11 14:26 UTC) via `push_files` (single commit, 3 files):
- `docs/runtime/mcp_review_protocol.md` REPLACED (sha `e6f8fad8` → `9bd5d3fa`, 6467 → 10295 bytes) — L46 Evidence Gate added
- `docs/runtime/cc_stage_template.md` NEW (sha `5657b69e`, 5786 bytes) — L44 + L45 + L48 baked in
- `docs/runtime/sessions/_template.md` NEW (sha `010b6964`, 4320 bytes) — L46 GNB log + Truth Check + Mismatch declarations baked in

**Memory edit:** line 27 `replace` consolidated old #32–#39 + new L44–L48 + pre-cc-0010A gating items into ~500 chars.

**Pre-cc-0010A gating items (3 items, all P1, all NEW v2.66):**

1. **L62 attribution investigation** (~15 min): pull last 5 `m.chatgpt_review` fires, classify informative vs generic, attribute generic-pushback origin. If ChatGPT MCP only → L62 unchanged; if CCD also generating noise → L62 generalises + L46 names update.
2. **L47 lock scope decision** (~15 min): inspect cc-0009 Stage E parallel-writer evidence. Decide A (pause cron, doc-only) or B (`audit.session_lock` UNIQUE, build). Path B likely.
3. **L48 Atomicity Gate application to cc-0010 brief**: apply 3 questions to `docs/briefs/cc-0010-r-reconciliation-evidence-and-matcher.md`. ChatGPT proposed decomposition cc-0010a/b/c. Validate.

**First live exercise candidates:**
- L44 + L45 + L48 → cc-0010A brief authoring + apply (first stage of split brief)
- L46 → first real `escalate=true` return from `ask_chatgpt_review` post-v2.66
- L47 → either confirmed in build (Path B) or rejected as doc-only (Path A) after race-scope investigation

---

## 🟢 cc-0009 PRV-1 Second Build — STATUS BLOCK (unchanged v2.66)

**Status v2.66:** **ALL STAGES CLOSED. Build COMPLETE.** All details unchanged from v2.65.

**No carry to next session.** cc-0009 superseded by cc-0010A brief authoring (next major work, gated by pre-cc-0010A items at rank 1).

---

## 🔄 Standing session-start checks

S1–S29 unchanged. S30 closed PASS v2.47.

---

## 🔴 Time-bound (calendar-driven deadlines)

**v2.66 carry from v2.65**: passive observation: first cron-driven `r.reconciliation_run` row at 2026-05-11 16:05 UTC — sanity check next session start.

Other unchanged from v2.54.

---

## 🛠 Meta-tooling — ChatGPT Review MCP

**v2.66 application**: 0 D-01 fires (meta-process session; no production pipeline mutation). Cumulative T-MCP-02 **59** (unchanged). Cumulative T-MCP-08 unchanged at 2. State-capture exceptions v2.66: **0**.

**L46 Evidence Gate**: formalised v2.66 in `docs/runtime/mcp_review_protocol.md`. Pending first live exercise. When the next real `escalate=true` return arrives, classify per L46 (INFORMATIVE-BLOCKING / GENERIC-NON-BLOCKING) and log in session file accordingly.

**Close-the-loop UPDATEs to `m.chatgpt_review`:** v2.66 adds 0 (no fires this session). **5 prior cc-NNNN reviews still pending close-the-loop** (cc-0003 v2 + cc-0004 + cc-0006 + cc-0007 + cc-0005 v4) — UNBLOCKED v2.61, batch now 8 sessions overdue.

**Coordination observation v2.65 NEW carry**: chat detected another writer to `m.chatgpt_review` row 339ae9e4 at cc-0009 Stage E closure. Defensive guards prevented overwrite. PK may want to formalise coordination protocol if parallel CC/Claude-Code agent work is intended. **L47 lock scope investigation next session** will inform this.

---

## 🤖 Cowork automation (D182)

**v2.66 status:** unchanged from v2.65. `cadence_rule_generator_daily` cron 82 at `5 16 * * *` UTC firing daily; first scheduled fire occurred 2026-05-11 16:05 UTC (verification queued for next session). `docs/briefs/morning-inbox-sweep-v1.md` committed status=draft per PK hold.

---

## 🟡 Active

| ID | Item | Priority | Status | Owner | Next action |
|---|---|---|---|---|---|
| **Pre-cc-0010A: L62 attribution investigation** | Pull last 5 `m.chatgpt_review` fires, classify informative vs generic, attribute pushback origin | **P1 (NEW v2.66, gates cc-0010A)** | NEW v2.66. ~15 min. Outcome: ChatGPT MCP only → L62 unchanged; CCD also generating noise → L62 generalises + L46 names update. | chat → next session opener | Execute as part of next session's first 30 min before any cc-0010A authoring. |
| **Pre-cc-0010A: L47 lock scope decision** | Decide A (pause cron) vs B (`audit.session_lock` UNIQUE) | **P1 (NEW v2.66, gates cc-0010A)** | NEW v2.66. ~15 min. Inspect cc-0009 Stage E parallel-writer evidence in session file `2026-05-11-cc-0009-stages-d-e-closed.md`. Path B likely. Path B if confirmed = build `audit.session_lock` table; Path A = doc-only. | chat → next session opener | Investigation + decision in first 30 min next session. |
| **Pre-cc-0010A: L48 Atomicity Gate application to cc-0010 brief** | Apply 3 questions to existing cc-0010 brief | **P1 (NEW v2.66, gates cc-0010A)** | NEW v2.66. ChatGPT-proposed decomposition cc-0010a/b/c. Validate or revise against actual brief content (`docs/briefs/cc-0010-r-reconciliation-evidence-and-matcher.md`). | chat → next session opener | Apply 3 questions; document split decision in parent brief if split confirmed. |
| **cc-0010A authoring (or cc-0010 unsplit if Atomicity Gate clears)** | matcher + evidence + reconciliation_match table; ALTER TABLE re-adding `matched_match_id` FK | **P1 (rank 2 v2.66, gated by rank 1)** | NEW v2.66 framing. Inherits cc-0009 outputs. First live test of new `cc_stage_template.md` (L44 + L45 + L48). May fold F-CC-0009-EF-BACKFILL-HORIZON-FORWARD-ONLY (Option a) into the brief. | chat → after pre-cc-0010A gating clears | Author brief at `docs/briefs/cc-0010a-...md` (split) or `docs/briefs/cc-0010-...md` (unsplit). |
| **Close-the-loop UPDATE batch (5 prior cc-NNNN D-01 rows — UNBLOCKED v2.61, batch now 8 sessions overdue v2.66)** | Map cc-0003 v2 + cc-0004 + cc-0006 + cc-0007 + cc-0005 v4 D-01 rows to `status='resolved'` | **P2 (rank 3 v2.66; batch overdue 8 sessions)** | UNBLOCKED by L36 enum discovery v2.61. All 5 rows currently `status='escalated'`. Batch UPDATE in single `execute_sql` call. ~10 min. | chat → next session OR before/alongside cc-0010A brief authoring | Single execute_sql with CASE expression. |
| **F-CC-0009-EF-BACKFILL-HORIZON-FORWARD-ONLY reconciliation** | Deployed EF emits today-forward-only weekday dates; brief §4.1+§6 V10d assumed full 15-day | **P3 (carry from v2.65, OPEN)** | OPEN. PK decision pending on option (a) update brief [chat-recommended], (b) update EF source, (c) leave as-is. Likely folded into cc-0010A brief authoring. | PK → chat | PK directs option. |
| **Platform Reconciliation View — BRIEF AUTHORING** | reconciliation surface | **P2 — held at rank 5 v2.66** | Sequencing blockers all cleared. Brief NOT YET AUTHORED. Can proceed in parallel with cc-0010A brief authoring. | PK → chat | Brief authoring when PK greenlights. |
| **Dashboard Architecture Review Phase 0 prerequisites** | 7 confirm-defaults | P1 TOP (unchanged) | Carry. 7 default-blockers still pending PK confirm/override. | PK | Confirm defaults via cc-0001. |
| **AI cost view** | `vw_ai_cost_monthly` view + dashboard tile | P3 → Top 5 (carry) | Backlog | chat → future session | Author view DDL + add NOW dashboard tile. ~1h. |
| **Publisher latent config risk follow-up** | Doc-only patch adding `[functions.publisher] verify_jwt = false` | P3 (carry from v2.58) | OPEN. | chat → future session | Single-file commit to `supabase/config.toml`. NO deploy required. ~5 min. |
| **M8b separate brief authoring** | Function rename + COMMENT after manual caller remediation | P3 (carry from v2.59) | NOT YET AUTHORED. | PK → chat | When PK directs. |
| **94-row un-publishable legacy draft cohort cleanup** | Drafts: SQL filter per cc-0007 result file | P3 (carry from v2.58) | LOGGED. Currently 94 rows. | PK → chat → future session | If PK directs, separate cc-NNNN brief. |
| **F-CRON-AUTO-APPROVER-SECRET-INLINE** | Cron jobid 58 has secret hardcoded inline | P2 (security, OPEN) | OPEN — unchanged v2.66. cc-0009 Stage D vault-backed secret sourcing for jobid 82 set positive precedent; jobid 58 still inline. | chat → future session (PK approval required) | PK to authorise secret rotation for cron jobid 58 specifically. |
| **F-YT-PUB-AVATAR-EXCLUSION** | youtube-publisher filter excludes `video_short_avatar` | P3 (carry from v2.53) | LOGGED, no chat action | chat → future (passive) | Validator. |
| **morning-inbox-sweep-v1 brief amendment** | PK personal-email morning triage | P3 (carry from v2.51) | DRAFT exists at `docs/briefs/morning-inbox-sweep-v1.md` (status=draft) | PK → chat | PK reviews + proposes amendments. |
| **NEW v2.56 P3 backlog observation** | 1 LinkedIn queue row `1a21199e-...` with `pd.approval_status='draft'` | P3 | LOGGED, no chat action | chat → future (passive) | Investigation deferred. |
| **Dashboard mobile responsiveness — system-wide** | Whole-dashboard gap | P3 | OBSERVED | chat → dedicated session OR Phase 1+ | Dedicated session OR roll into architecture review Phase 1+ build sequence. |
| **F-PUB-009 V3-V5 + 7-day flow** | Forward acid-test | P2 | Passive monitoring | chat → next session | Continue passive monitoring. |
| **Invegent IG cap-throttle planning** | jobid 53 unblock readiness | P3 | OBSERVED | chat → T05 unblock session | Plan cap-throttle / rate-limit handling. |
| **CFW post-ai-worker dead drafts** | Drafts dying after AI succeeds | P3 | OBSERVED | chat → future session | Investigate downstream pathway. |
| **Vault `service_role_key` naming hygiene** | 15-char value; misleadingly named | P3 | OBSERVED | chat → future session | Read-only scope-check. |
| **`docs/audit/health/2026-05-06.md` follow-up** | Cowork 02:00 AEST cron 6 May did not push | P3 | Carried | chat → next session if still absent | Investigate Cowork status. |
| **`00_overview.md` 11-section table reconciliation** | Architecture review changed actual section structure | P3 | Required updates | chat → future session | Update `00_overview.md`. ~15 min. |
| **F-AAP-NEEDS-REVIEW-BACKLOG** | 28 drafts pending review | P2 | Closure target = architecture review Phase 2 B-09-14 | chat → Phase 2 session | Bulk approve UI in Phase 2. |
| **Dashboard roadmap PHASES reconciliation** | PHASES array stale since 3 May | P3 | Carried (**22nd deferral v2.66**) | chat → dedicated session | Open `app/(dashboard)/roadmap/page.tsx` and bring PHASES + LAST_UPDATED current. |
| **F-AI-WORKER-PARSER-SKIP-BUG V4** | Forward acid-test inconclusive | P2 | Passive monitoring | chat → future | V4 needs natural skip event OR synthetic test. |
| **F-CRON-COMPLIANCE-MONITOR-STALE** | cron jobid 31 calls deployed slug; folder absent | P2 | LOGGED | PK → future session | Decide. |
| **F-CRON-INGEST-STALE** | cron jobid 1 calls deployed slug; folder absent | P2 | LOGGED | PK → future session | Same shape. |
| **F-CRON-PIPELINE-AI-SUMMARY-STALE** | cron jobid 30 calls deployed slug; folder absent | P2 | LOGGED | PK → future session | Same shape. |
| **F-CRON-PIPELINE-DOCTOR-STALE** | cron jobids 29 + 39 call deployed slug; folder absent | P2 | LOGGED | PK → future session | Same shape. |
| **Music library activation checklist** | 9 mp3 upload + bucket + env var | P3 (PK action) | PENDING PK ACTION | PK | PK to action when ready. |
| **Emergency redeploy governance question** | Should bounded production-restoration require expedited D-01? | P2 (PK decision) | PENDING PK DECISION | PK | PK rules; chat documents. |
| **`f4a0dd85` bridge health-check `sql_read` row** | `status='completed', resolved_by=null` | P3 (carry from v2.63) | OBSERVED, hygiene only | PK → future | PK can decide whether to close (functional no-op) or leave as-is. |
| **Feature branch `feature/cc-0009-stage-b-ef-source`** | Preserved at HEAD `9796b0ee` post Stage B merge | P3 (carry from v2.63) | OBSERVED, audit artifact | PK → future | PK can direct deletion when convenient. |
| **Parallel agent coordination v2.65 NEW carry** | Chat detected another writer to m.chatgpt_review row 339ae9e4 + result file during Stage E close | P3 (hygiene v2.65 → being investigated v2.66 as part of L47) | OBSERVED. Defensive guards prevented overwrite. v2.66 NOTE: directly informs L47 lock scope decision. | chat → next session opener | Folded into L47 lock scope investigation at rank 1. |
| **Memory cap NEW v2.66 hygiene** | Memory at 30/30 cap; line-replacement strategy used this session | P3 (hygiene v2.66) | OBSERVED. Successive `add` calls failed at cap; final `replace` on line 27 succeeded. Pruning cadence consideration deferred. | PK → future | PK to consider memory pruning cadence at future session. |

**Closed v2.66:** **L44–L48 process upgrades formalised + committed.** PK presented 5-improvement proposal post-cc-0009 closure. Chat + ChatGPT MCP (via PK paste) reviews converged. Five lessons formalised: L44 Runtime Proof Pre-flight (probes match path verbatim, halt-on-contradiction), L45 Post-mutation truth check (count-delta + 3-row sample, mismatch declared), L46 Reviewer Evidence Gate (3-field requirement → INFORMATIVE-BLOCKING / GENERIC-NON-BLOCKING; 2-GNB override path), L47 Shared-state lock conditional (A=pause cron / B=`audit.session_lock` UNIQUE; build deferred), L48 Atomicity Gate (3 questions; 2-of-3 split rule). Templates + protocol patches committed at SHA `bc91af07` (2026-05-11 14:26 UTC) via single `push_files`: `mcp_review_protocol.md` REPLACED with Evidence Gate section; NEW `cc_stage_template.md` bakes L44+L45+L48; NEW `sessions/_template.md` bakes L46 GNB log + Truth Check + Mismatch declarations. Memory line 27 `replace` consolidated old #32–#39 + new L44–L48 + pre-cc-0010A gating items into ~500 chars.

**Closed v2.65:** cc-0009 PRV-1 second build COMPLETE (Stages D + E executed + closed with verified variance).

**Closed v2.64:** cc-0009 Stage C documentation sync (retroactive doc-only).

**Closed v2.63:** cc-0009 Stage A + Stage B.

**Closed v2.61:** cc-0008 v5.

**Closed v2.59:** M8 Path A (cc-0005 v4 / M8a) — 344 rows.

**Closed v2.58:** F-CRON-AI-WORKER-401-INVALID-JWT-FORMAT (cc-0007 `411b85ee`).
**Closed v2.57:** F-CRON-PG-NET-TIMEOUT-5S (cc-0006 `c72bc327`).
**Closed v2.56:** M6 Phase B (cc-0004 `9d5bdd37`).
**Closed v2.55:** M6 Phase A (cc-0003 v2 `d60dcfbc`).
**Closed v2.54:** video-worker `verify_jwt` durable fix.
**Closed v2.53:** F-YT-NY-FORMAT-SELECTION.
**Closed v2.52:** insights-worker P1; F-HEYGEN-RPC-MIGRATIONS-MISSING; F-INSIGHTS-RPC-MIGRATIONS-MISSING.
**Closed v2.50:** P1 SECURITY-DEFINER triage.
**Closed v2.49:** F-EF-DRIFT-PREVENTION Stage 3.
**Closed v2.48:** Stage 2b dashboard drift panel.
**Closed v2.47:** S30.
**Closed v2.46:** Dashboard Architecture Review of 2026-05.
**Closed v2.44:** F-EF-DRIFT-PREVENTION Stage 2a finalisation.
**Closed v2.43:** bef6be96 origin investigation.
**Closed v2.41:** F-EF-DRIFT-PREVENTION Stage 1.
**Closed v2.40:** F-EF-DRIFT-PREVENTION investigation phase.

---

## 💼 Personal businesses

**v2.66 carry (unchanged from v2.55–v2.65):**

- **Crazy Domains refund + clean-up follow-up** (carry from v2.51) — PK called CD on 2026-05-08. Remaining clean-up still PK to action manually:
  1. Cancel Website Builder auto-renewal (saves ~$251/yr ongoing)
  2. Disable Premium DNS auto-renewal (saves $26/yr; move DNS to Cloudflare — free)
  3. Disable Domain Guard on .com auto-renewal (saves $9/yr)
  4. Before Nov 2026: transfer invegent.com to Cloudflare Registrar (~A$15/yr); transfer invegent.com.au to VentraIP or similar (~A$25–35/yr).
  5. Decline the $521/3yr renewal quote from CD.

  **Total annual saving once cleaned up: ~A$286/yr ongoing. Three-year saving: ~A$860.**

  Not chat scope — PK actions manually. Re-check status next session.

*(no other items flagged at v2.66 close — standing P0 to ask at next session start.)*

---

## 🌱 Future ideation / content-pipeline expansion (NOT current pipeline-integrity work)

> **Classification:** Forward-looking ideation. Queue behind: (1) pre-cc-0010A gating items, (2) cc-0010A brief authoring, (3) Platform Reconciliation build, (4) AI Operating System Improvements / project skills. NOT pipeline-integrity work.

### v2.60 — Brand Topic Notebook → Episodic Podcast Source Pack (NotebookLM upstream feed)

Unchanged from v2.65. Not actionable until upstream blockers clear.

---

## 📌 Backlog

**v2.66 changes:**

- **CLOSED v2.66**: L44–L48 process upgrades formalised + committed (post-cc-0009 closure synthesis).
- **STATE CHANGE v2.66**: Three pre-cc-0010A gating rows ADDED rank 1 (L62 attribution, L47 lock scope, L48 Atomicity Gate application). cc-0010A brief authoring moved rank 1 → rank 2 (gated). Close-the-loop batch rank 2 → rank 3 (now 8 sessions overdue). F-CC-0009-EF-BACKFILL-HORIZON-FORWARD-ONLY rank 3 → rank 4. Platform Reconciliation rank 4 → rank 5.
- **NEW v2.66 ACTIVE ROWS**: 3× pre-cc-0010A gating items (P1) + cc-0010A authoring framing (P1, was generic cc-0010) + Memory cap hygiene (P3).
- **NEW v2.66 LESSON CANDIDATES**: L44–L48. Distinct from L41/L42/L43 by being process-governance, not pipeline-execution lessons.
- **NEW STATUS BLOCK v2.66**: "🟢 Process Upgrades L44–L48 — STATUS BLOCK". Documents the templates commit + memory edit + first-live-exercise candidates.
- **CARRIED v2.66**: Dashboard roadmap PHASES — **22nd** consecutive deferral. F-CC-0009-EF-BACKFILL-HORIZON-FORWARD-ONLY OPEN. Parallel agent coordination observation folded into L47 lock scope investigation. All v2.65 carries unchanged otherwise.

**Pre-v2.66 changes**: per commit history + sync_state archive.

---

## 🧊 Frozen / Deferred

Unchanged.

---

## 🎓 Canonical Lessons

- **Lesson #61** (P1–P5 must be empirically verified, not theoretically assumed) — **now generalised as L44 (Runtime Proof Pre-flight) v2.66**. Lesson #61 promoted to canonical implicitly via L44 baseline.
- **Lesson #62 v2.50 refinement** — **formalised as L46 (Reviewer Evidence Gate) v2.66**. 2-GNB override path now codified in `mcp_review_protocol.md`. Pending first live exercise.
- **Lesson #38 + Lesson #39** — **fused as L45 (Post-mutation truth check) v2.66**. Count-delta + multi-row sample combined into single post-mutation discipline.
- **L17 in-place patching pattern** — vindicated again at cc-0009 Stage D + reinforced. **L41 + L42 NEW candidates are named refinements.**
- **L11, L16, L18 vindicated again** — strong evidence.
- **L19, L20, L21** — VINDICATED v2.59; reinforced.

**v2.60 NEW lesson candidate (L32)**: future-ideation backlog quarantine pattern.

**v2.61 NEW lesson candidates (L33–L36)** — reified by cc-0008 v4→v5 cycle.

**v2.62 NEW lesson candidates (L37–L38)** — reified by cc-0009 v1 brief authoring:
- **L37 candidate FULLY VINDICATED v2.65**: Multi-stage cc-NNNN brief authoring pattern.
- **L38 candidate**: Cross-brief FK deferral pattern. Awaits cc-0010 ALTER TABLE.

**v2.63 NEW lesson candidates (L39–L40)** — reified by cc-0009 Stage B end-to-end execution:
- **L39 candidate VINDICATED v2.63**: Feature-branch + diff-review + PK-approval workflow per CCH R11.
- **L40 NEW candidate**: Squash-equivalent merge mechanism via MCP `push_files`. Vindicated again v2.66 (templates commit used push_files).

**v2.64 NEW lesson candidate (L41)** — reified by cc-0009 Stage C runtime cycle:
- **L41 candidate VINDICATED v2.65**: Runtime grant defect surfaced at V-check and fixed in-place during the same Stage close cycle.

**v2.65 NEW lesson candidates (L42–L43)** — reified by cc-0009 Stages D + E execution:
- **L42 NEW candidate**: In-stage tactical pivot pattern. Candidate-only pending repeat use.
- **L43 NEW candidate**: Pre-flight envelope vs deployed-EF emission semantics mismatch + "closed with verified variance" pathway. Candidate-only pending repeat use.

**v2.66 NEW lesson candidates (L44–L48)** — formalised post-cc-0009 closure synthesis:
- **L44 NEW candidate v2.66**: Runtime Proof Pre-flight. Probes traverse same path verbatim. Halt-on-contradiction. Baselined into `cc_stage_template.md`. Pending first live use at cc-0010A authoring.
- **L45 NEW candidate v2.66**: Post-mutation truth check. Count-delta + ≥3-row sanity sample. Mismatch declared per-row with decision (accept-with-variance / re-fire / rollback / escalate). Fuses Lesson #38 + Lesson #39. Baselined into `cc_stage_template.md` + `sessions/_template.md`. Pending first live use at cc-0010A apply.
- **L46 NEW candidate v2.66**: Reviewer Evidence Gate. 3-field requirement (new defect, new evidence, concrete corrective action) → INFORMATIVE-BLOCKING; any missing → GENERIC-NON-BLOCKING. 2-GNB override path. Formalises informal Lesson #62 type-(c). Baselined into `mcp_review_protocol.md`. Pending first live exercise.
- **L47 NEW candidate v2.66**: Shared-state lock conditional. A=pause competing cron (doc-only). B=`audit.session_lock` UNIQUE table (build). Build deferred until next-session race-scope investigation. Pending decision.
- **L48 NEW candidate v2.66**: Atomicity Gate. 3 questions pre-Stage-A. 2-of-3 split rule. Baselined into `cc_stage_template.md`. Pending first live application to cc-0010 brief.

**All twelve candidates (L37 + L38 + L39 + L40 + L41 + L42 + L43 + L44 + L45 + L46 + L47 + L48) recommended for promotion to baseline at appropriate cycle once empirical evidence accumulates.**

---

## v2.66 honest limitations

- All v2.31–v2.65 limitations apply.
- **L44–L48 are baselined-as-candidates, not yet vindicated.** First live exercise candidates: L44 + L45 + L48 → cc-0010A authoring + apply; L46 → next real `escalate=true` return; L47 → race-scope investigation outcome.
- **L47 conditional build deferred** until next-session race-scope investigation. Stage E parallel-writer evidence suggests Path B but explicit decision not yet made. The L47 lesson is currently documented but not enforced.
- **L62 attribution not yet confirmed.** Memory still notes attribution pending. If CCD generates noise too, L46 gate naming generalises and protocol doc updates again.
- **NO production pipeline mutation this session.** No DB writes; no EF deploys; no schema changes; no `m.chatgpt_review` fires; no cron schedule changes; no vault changes.
- **Templates committed but untested.** `cc_stage_template.md` and `sessions/_template.md` are baselined in repo but their first live use is queued for cc-0010A authoring next session. Until first live use, the templates are assertions, not validated patterns.
- **Memory at 30/30 cap.** v2.66 line-replacement on line 27 was the only memory write this session. Future memory writes will need similar consolidation strategy. Pruning cadence consideration deferred.
- **5 prior outstanding `m.chatgpt_review` close-the-loop UPDATEs UNBLOCKED v2.61, still pending v2.66** — batch now 8 sessions overdue.
- **Dashboard roadmap PHASES still stale** — **22nd** consecutive deferral.
- **Action_list file size**: ~50KB at v2.66 close. Sync_state ~32KB. Both above their 10KB / 16KB respective targets.
- **Today/Next 5 rebuild at v2.66**: pre-cc-0010A gating items = rank 1 (3 items); cc-0010A authoring = rank 2 (gated); close-the-loop batch = rank 3 (8 sessions overdue); F-CC-0009-EF-BACKFILL-HORIZON-FORWARD-ONLY = rank 4; Platform Reconciliation View = rank 5; Phase 0 = rank 6; AI cost view = rank 7; Personal businesses = rank 8.
- **Per-session file written v2.66**: `docs/runtime/sessions/2026-05-11-post-cc0009-process-upgrades-l44-l48-applied.md`.
- **Doc-sync split across 2 commits** per file-size budget (precedent set v2.65). Commit 1 (paired): per-session file + sync_state landed at SHA `e3388727c9459a3b3e26d311bef2d0aed1cf41a9`. Commit 2 (this file): action_list. Production payload commit `bc91af07` already landed earlier in the session via `push_files`.
- **No close-the-loop UPDATEs on `m.chatgpt_review` this session** because no fires this session.
- **First cron-driven `r.reconciliation_run` row at 2026-05-11 16:05 UTC** — sanity check at next session start (carry from v2.65; still not verified).

---

## Changelog

- v1.0–v2.64: per commit history + sync_state archive.
- **v2.65 (2026-05-11 Sydney, cc-0009 Stages D + E EXECUTED + CLOSED — PRV-1 second build COMPLETE):** Stage D applied + vault-pivoted; Stage E first backfill executed + closed with verified variance. T-MCP-02 +2 cum 59. L37 FULLY VINDICATED; L41 vindicated; L42 + L43 NEW candidates.
- **v2.66 (2026-05-11 Sydney, post-cc-0009 process upgrades L44–L48 formalised + committed):**
  - **Review + synthesis**: PK presented 5-improvement proposal capturing weaknesses observed at cc-0009 closure (Stages D + E surprises, reviewer noise, parallel-agent shared-state race, doc lag, complexity scaling). Chat + ChatGPT MCP (via PK paste) reviews converged on substance. Where ChatGPT differed, it sharpened. No conflicts.
  - **L44 NEW candidate baselined** (Runtime Proof Pre-flight). Probes traverse same path verbatim. Halt-on-contradiction.
  - **L45 NEW candidate baselined** (Post-mutation truth check). Count-delta + ≥3-row sanity sample. Mismatch declared per-row with decision (accept-with-variance / re-fire / rollback / escalate). Fuses Lesson #38 + Lesson #39.
  - **L46 NEW candidate baselined** (Reviewer Evidence Gate). 3-field requirement → INFORMATIVE-BLOCKING / GENERIC-NON-BLOCKING. 2-GNB override path formalises informal Lesson #62 type-(c).
  - **L47 NEW candidate documented as conditional** (Shared-state lock). A=pause cron / B=`audit.session_lock` UNIQUE. Build deferred until next-session race-scope investigation.
  - **L48 NEW candidate baselined** (Atomicity Gate). 3 questions pre-Stage-A. 2-of-3 split rule.
  - **Templates + protocol commit at SHA `bc91af079aed987ea10ce9aaf6fd2a685eb87eb2`** (2026-05-11 14:26 UTC) via single `push_files` (3 files): `mcp_review_protocol.md` REPLACED (sha `e6f8fad8` → `9bd5d3fa`); NEW `cc_stage_template.md` (sha `5657b69e`); NEW `sessions/_template.md` (sha `010b6964`).
  - **Memory edit**: line 27 `replace` consolidated old #32–#39 + new L44–L48 + pre-cc-0010A gating items into ~500 chars. Memory was at 30/30 cap pre-session; successive `add` calls failed before final `replace` succeeded. Lesson: at cap, target line-replacement of compressible existing entries.
  - **3 NEW pre-cc-0010A gating items queued** (P1, ~30 min total): L62 attribution investigation; L47 lock scope decision; L48 Atomicity Gate application to cc-0010 brief.
  - **Today/Next 5 rebuild**: pre-cc-0010A gating items = rank 1; cc-0010A authoring = rank 2 (gated); close-the-loop batch = rank 3 (8 sessions overdue); F-CC-0009-EF-BACKFILL-HORIZON-FORWARD-ONLY = rank 4; Platform Reconciliation View = rank 5; Phase 0 = rank 6; AI cost view = rank 7; Personal businesses = rank 8.
  - **Active rows updated v2.66**: 3× pre-cc-0010A gating rows ADDED rank 1; cc-0010A authoring re-framed; Memory cap hygiene row ADDED P3; Parallel agent coordination observation folded into L47 investigation.
  - **NEW STATUS BLOCK v2.66**: "🟢 Process Upgrades L44–L48 — STATUS BLOCK".
  - **Closure budget**: ~2h v2.66 cycle. Trailing-14-day ~72h above 8.0h floor. ~5 P0+P1 open (within 20-finding cap; 3 new gating items P1 surfaced this session).
  - **Doc-sync split across 2 commits**. Commit 1 (paired): per-session file + sync_state landed at SHA `e3388727c9459a3b3e26d311bef2d0aed1cf41a9`. Commit 2 (this file): action_list. Production payload commit `bc91af07` already landed earlier in the session.
  - **Production mutations this session**: 1 GitHub commit `bc91af07` (3 docs via push_files) + 1 memory `replace` + this 4-way sync close (split 2 commits). Zero DB writes. Zero EF deploys. Zero EF source edits. Zero schema changes. Zero `m.chatgpt_review` fires. Zero secret value entered chat context.
