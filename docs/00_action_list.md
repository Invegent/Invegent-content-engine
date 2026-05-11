# ICE — Action List

> **Single active action index for what's queued, in flight, blocked, or frozen.**
> Source-of-truth details remain in sync_state, run states, decisions, briefs, and commits.
> Read at the start of every session alongside `docs/00_sync_state.md`.
>
> Last updated: 2026-05-11 Sydney (**v2.64 — cc-0009 Stage C documentation sync (retroactive doc-only patch).** Stage C deploy + V5 service_role grant remediation (`cc_0008_service_role_grants_fix`) + 3-row audit close-out (`bea1bca4-7517-4382-bb20-5ddcf3770f4e` + `48304b04-0c86-4ed4-8ec3-1ad34d5d72aa` + `4ac0cfce-6765-40dc-b151-4bd35a8bb935`, all `resolved_by='cc-0009-stage-c-close-2026-05-11'`) completed earlier on 2026-05-11 (closure timestamp 07:26:28 UTC; preceded by V5 PASS at 07:20:59 UTC). v2.64 brings repo documentation into line with runtime truth before Stage D D-01. Sync_state + result file already patched at commit `1b006b28953654de8b01294e624bbc47e26402b8`; this file is the v2.64 follow-on commit (third attempt; previous two failed mid-stream). Today/Next 5 rebuilt with Stage D D-01 as rank 1. Stage D pre-flight ran GREEN in same v2.64 session: Q1 PASS (EF ACTIVE v4, latest reconciliation_run row `63c7aef9` succeeded, two prior failed runs match V5 narrative empirically), Q2 PASS-with-vault-observation (CRON_SECRET absent from `vault.secrets` — EF-only storage; Stage D D-01 design input), Q3 PASS (zero cron collisions on `5 16 * * *` UTC), Q4 PASS (pg_cron 1.6.4 + pg_net 0.19.5), Q5 PASS (verify_jwt false). No production mutation v2.64. T-MCP-02 cum 57 unchanged. State-capture exceptions: 0. **L37 candidate vindicated again** through Stage A + B + C end-to-end. **L41 NEW candidate**: runtime grant defect surfaced at V-check + fixed in-place during same Stage close cycle. PHASES reconciliation **20th** consecutive carry. v2.64 action_list narrative pruned to keep file size manageable for chat-driven commits; v2.63 audit detail remains in commit history + sync_state v2.63 inline summary. **cc-0009 Stage A + B + C CLOSED. Stages D + E NOT STARTED.**)

---

## How this file works

**At session start**, chat reads this file and:
1. Rebuilds the Today / Next 5 view
2. Runs Standing checks (S1–S29)
3. **Verifies D186 closure budget**
4. Asks PK about Personal businesses
5. Surfaces Time-bound items due today/tomorrow

**Standing rule (D-01)**: every production patch + action_list version bump that touches production state goes through ChatGPT cross-check before deploy/commit. v2.64: 0 fires (doc-only).

**Standing rule (D-186)**: closure work has a hard time budget. 20-finding cap on P0+P1 open items + 4h/week closure floor + 2-week pause trigger.

**Standing rule (D-YT-OAUTH-1)**: invegent-dashboard `/connect` first for FB/IG/LI/YT OAuth reconnects.

**Standing rule (D-PREV-16)**: F-EF-DRIFT-PREVENTION Option F is approved target design. All stages CLOSED.

**STANDING RULE (Lesson #62, v2.41 + v2.50 refinement)**: When ChatGPT MCP echoes Claude's self-disclosed weak evidence as objections, default is NOT automatic state-capture override. v2.64: not exercised (doc-only).

**STANDING RULE (Lesson candidate #68, v2.43)**: All fired writes must be tracked inline. v2.64: 2 GitHub commits total (commit 1 `1b006b28`: result file + sync_state via push_files; commit 2: this file). Zero production writes. Zero SQL UPDATEs. Zero ChatGPT MCP fires.

**STANDING RULE (v2.46 — Dashboard Architecture Review)**: All architecture-level decisions live in `docs/dashboard-review-2026-05/`.

**STANDING RULE (v2.47 — Documentation framing)**: Sync_state framing of cron timing always anchors to **UTC clock-time + Sydney clock-time**. cc-0009 Stage D will lock `5 16 * * *` UTC = 02:05 Sydney AEST at Stage D apply gate (not yet started).

**STANDING RULE (v2.48 — Pre-flight discovery as standard CC pattern)**: §1.5-style pre-flight discovery is now the default brief pattern for any CC dashboard/portal/web/script work.

**STANDING RULE (v2.50 — Acceptance integrity)**: Acceptance is not complete until the actual review artifact is received and reviewed. v2.64: no acceptance gates (doc-only).

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

**v2.64 ADDITIONS** (cc-0009 Stage C end-to-end + retroactive doc sync):
- **L37 candidate VINDICATED AGAIN**: Stages A + B + C all closed end-to-end across heterogeneous actor types (chat-owned migration; CC-owned source + chat-owned merge; CC-owned deploy + chat-owned remediation apply).
- **L41 NEW candidate**: runtime grant defect surfaced at V-check + fixed in-place during the same Stage close cycle via target-table-attributed migration. Stage C V5 surfaced missing `service_role` SELECT grant on `c.client_cadence_rule` after EF deploy; remediation via `cc_0008_service_role_grants_fix` was applied within the Stage C cycle (not deferred); V5 re-ran PASS; Stage C closed cleanly. Pattern reinforces L17. Confirms target-table-attributed migration namespaces (`cc_0008_*` for `c.client_cadence_rule` grants) are correct even when the surfacing brief is cc-0009.

**All v2.62 + v2.63 + v2.64 candidates (L37 + L38 + L39 + L40 + L41) recommended for promotion to baseline candidate at next cycle.**

---

## 📊 Closure budget tracking (per D186)

| Metric | Current | Limit | Status |
|---|---|---|---|
| Open findings + investigations (P0+P1) | ~2 (unchanged) | 20 | ✅ within budget |
| Trailing-14-day closure hours | ~68h | 8.0 floor | ✅ above floor |
| Pause trigger active? | NO | — | New automation authoring still allowed |

**v2.64 doc-sync cycle: ~30 min total chat work. Zero production mutation.**

**State-capture exception count v2.64: 0** (no D-01 fires).

---

## ⭐ Today / Next 5

> **Last rebuilt:** 2026-05-11 Sydney (v2.64).
> **v2.64 note:** cc-0009 Stage C CLOSED — removed from active work. Stage D apply gate is now rank 1. Stage E rank 2. Close-the-loop batch rank 3. Platform Reconciliation View brief authoring rank 4. cc-0009 is now 3 of 5 stages complete.

| Rank | Item | Priority | Why now | Next action |
|---|---|---|---|---|
| 1 | **cc-0009 Stage D D-01 + cron creation** | **P1 (NEW rank v2.64 — Stage C CLOSED unblocks Stage D)** | Stage C deploy + remediation closed earlier on 2026-05-11. EF source on main at commit `dbd41438`. EF runtime healthy: ACTIVE v4, latest reconciliation_run succeeded at 07:20:59 UTC. Stage D pre-flight ran GREEN in v2.64 session (Q1-Q5 all PASS with Q2 vault observation flagged). **NEXT NATURAL WORK** post-Stage-C doc sync. | Pre-flight §1.10+§1.11 final re-verify (already GREEN v2.64) → NEW Stage-D D-01 fire (action_type=plan_review per KOI-02) → PK approval phrase → `apply_migration cc_0009_pg_cron_cadence_generator` registering `cadence_rule_generator_daily` at fixed UTC anchor `5 16 * * *` (Sydney: 02:05 AEST) → V9 → close-the-loop UPDATE. **Vault design input**: CRON_SECRET in EF secrets only, not in vault.secrets — cron command must inject secret literally from EF env or use a vault path that exists. |
| 2 | **cc-0009 Stage E first backfill** | **P1 (sequenced)** | Sequenced after Stage D. First on-demand backfill invocation populates `r.expected_publication` (~140 rows expected, 15 calendar dates × ~9 active rules). | Pre-flight §1.12 → NEW Stage-E D-01 fire → PK approval phrase → `execute_sql net.http_post` invocation → V10–V12 → close-the-loop UPDATE. |
| 3 | **5-row close-the-loop UPDATE batch (UNBLOCKED v2.61, still pending v2.64)** | **P2 — promoted v2.63 (batch overdue 6 sessions)** | UNBLOCKED by L36 enum discovery v2.61. 5 prior cc-NNNN rows still `status='escalated'`. Batch via single `execute_sql` with CASE expression. ~10 min when scheduled. Can run between cc-0009 stages without disrupting their gates. | Single `execute_sql` with CASE mapping cc-0003 v2 + cc-0004 + cc-0006 + cc-0007 + cc-0005 v4 each → `status='resolved'`. |
| 4 | **Platform Reconciliation View — BRIEF AUTHORING** | **P2 — held at rank 4 v2.64** | Sequencing blockers all cleared. Brief NOT YET AUTHORED. Can proceed in parallel with cc-0009 stages D/E once any of them is in flight. | Brief authoring when PK greenlights. |
| 5 | **Dashboard Architecture Review Phase 0 prerequisites** | P1 TOP | Unchanged. M-series effectively complete v2.59. cc-0008 v5 APPLIED v2.61. cc-0009 Stage A + B + C CLOSED v2.64. 7 default-blockers still pending PK confirm/override. | PK confirms 7 default-blockers via `docs/briefs/cc-0001-dashboard-phase-0-defaults.md`. |
| 6 | **AI cost view** | P3 quick win | Unchanged. ~1h estimate. | Author `vw_ai_cost_monthly` view DDL on `m.ai_job` + add NOW dashboard tile. |
| 7 | **Personal businesses check-in** | P0 standing | Carry. | PK reports any time-sensitive items + Crazy Domains clean-up status. |

---

## 🟢 F-EF-DRIFT-PREVENTION — STATUS BLOCK (unchanged)

All stages CLOSED. Cron jobid 80 + 81 active=true. No drift fires this cycle.

---

## 🟢 ICE Dashboard Architecture Review — STATUS BLOCK

**Status:** COMPLETE at v2.46. 12 docs at `docs/dashboard-review-2026-05/`. PRV-0 v2 design lock at commit `6e989517` is direct cc-0008 + cc-0009 input.

**v2.64 update:**
- ✅ S30 cleared v2.47.
- ✅ M5–M8 reconciliation effectively COMPLETE v2.59.
- ✅ PRV-1 first build delivered v2.61 (cc-0008 v5 APPLIED).
- ✅ PRV-1 second build Stage A APPLIED + CLOSED v2.63 (2026-05-11 01:38 UTC).
- ✅ PRV-1 second build Stage B APPLIED + MERGED + CLOSED v2.63 (2026-05-11 04:38 UTC).
- ✅ PRV-1 second build Stage C DEPLOYED + REMEDIATED + CLOSED v2.64 documentation (2026-05-11 07:26 UTC runtime).
- 🔲 PRV-1 second build Stages D/E NOT STARTED.
- 🔲 7 Phase 0 confirmation-blocker defaults — pending PK confirm/override.

---

## 🟢 Tier 1 + M4 + M5 + M6 Phase A + M6 Phase B + M8a — STATUS BLOCK (unchanged v2.64)

| M-step | Closure version | Apply commit | Effect |
|---|---|---|---|
| M1 + M2 + M3 | v2.55 (lineage) | (5 May) | Tier 1 queue integrity foundations |
| M4 | v2.55 (lineage) | (5 May) | State-capture override; 8/8 PASS |
| M5 | v2.55 (lineage) | (5 May) | Corrected cascade fix; 7/7 PASS |
| M6 Phase A | v2.55 | `d60dcfbc` | 9 Bug 3 fingerprint rows dead-lettered |
| M6 Phase B | v2.56 | `9d5bdd37` | 43 v4-mismatch rows dead-lettered |
| M7 | doc-only fold | n/a | n/a |
| **M8a** | **v2.59** | result `eb820bae` | **344 legacy-origin future queue rows dead-lettered + cron 48 rewritten in place** |
| M8b | DEFERRED | TBD | function rename + COMMENT after manual caller remediation |

**Total residual rows cleared by M-series dead-letter cycles since 8 May 2026: 396 rows.**

**Urgent pipeline-integrity block EFFECTIVELY COMPLETE v2.59. Unchanged v2.64.**

---

## 🟢 Platform Reconciliation View — BRIEF CANDIDATE STATUS BLOCK (held at rank 4 v2.64)

**Status v2.64:** held at rank 4 of Today/Next 5 because cc-0009 stages D/E + close-the-loop batch occupy ranks 1+2+3. **Still PROMOTED to next major planning/work item after cc-0009 lifecycle.** Can proceed in parallel with cc-0009 stages D-E once any of them is in flight, if PK directs.

**Classification:** pipeline observability / reconciliation. NOT cosmetic dashboard work.

**Title:** Platform Reconciliation View — by day / client / platform.

**v2.64 cross-reference:** cc-0009 Stage A applied (r.* schema + tables) + Stage B merged (EF source on main) + Stage C deployed + remediated (EF live + V5 PASS). Once Stages D+E complete, `r.expected_publication` will be populated (Stage E first backfill, ~140 rows expected) which is the primary input to the Platform Reconciliation View matcher (cc-0010+) and matrix view (cc-0011).

**Required scope (PK-directed 2026-05-09):**
- by day / client / platform reconciliation
- ICE expected cadence (`c.client_cadence_rule` SEEDED v2.61; `r.expected_publication` populated v2.64+Stage E if cc-0009 stages D/E complete)
- ICE generated assets / drafts (`m.post_draft`)
- ICE queue state (`m.post_publish_queue`)
- ICE publisher result / logs
- platform-observed post evidence
- mismatch classification: `missing`, `late`, `duplicate`, `extra`, `wrong-content`, `stale`, `OK`
- evidence links / platform IDs where available
- manual override field for platforms where API ingestion is not yet available

**Seed manual observations (PK direct, 2026-05-09 Sydney; preserved across v2.58–v2.64 closes):**

| Client | Platform | Observation date | PK note |
|---|---|---|---|
| NDIS Yarns | YouTube Short | 7 May 2026 | — |
| Property Pulse | YouTube Short | 6 May 2026 | — |
| NDIS Yarns | Instagram | 1 May 2026 | — |
| Property Pulse | Instagram | 25 Apr 2026 | — |
| Invegent | Instagram | 25 Apr 2026 | — |
| Property Pulse | Facebook | 8 May 2026 | — |
| NDIS Yarns | Facebook | 8 May 2026 | — |
| Care for Welfare | Facebook | 1 May 2026 | — |
| Invegent | Facebook | 8 May 2026 | **wrong / irrelevant post** |
| Care for Welfare | LinkedIn | ~6 May 2026 | — |
| NDIS Yarns | LinkedIn | ~8 May 2026 | — |
| Property Pulse | LinkedIn | ~7 May 2026 | **two posts in one day** |
| Invegent | LinkedIn | (consistent) | "appears consistent" |

**Implementation gates:** unchanged (Phase 0 confirm + architecture review §10 extension + manual override design + API ingestion priority).

**Brief author when promoted:** chat.

---

## 🟢 cc-0009 PRV-1 Second Build — STATUS BLOCK (UPDATED v2.64)

**Status v2.64:** **Stage A CLOSED + Stage B CLOSED + Stage C CLOSED. Stages D + E NOT STARTED.**

**Brief reference (unchanged):**
- Path: `docs/briefs/cc-0009-r-schema-and-cadence-rule-generator.md`
- Authoring commit: `97b8d8442c4538b1af57bb9444d741bd5ac0463a`
- Brief FROZEN per ICE-PROC-001 at commit `ae301a92`
- Authority: PRV-0 design lock v2 commit `6e989517ceaf600e1373f7f319ab5b7d5c2c7147`

**Stage A delivered (closed v2.63, 2026-05-11 01:38 UTC):** Migration `cc_0009_r_schema_and_helpers` applied via Supabase MCP. Created: schema `r` + 2 tables + 2 helpers + k.* registry rows. V1–V8 all PASS. Both Stage A D-01 rows resolved via `cc_0009_stage_a_close_the_loop`.

**Stage B delivered (closed v2.63, 2026-05-11 04:38 UTC):** Feature branch `feature/cc-0009-stage-b-ef-source` (preserved at HEAD `9796b0ee`) merged to main at commit `dbd41438` (squash-equivalent via MCP `push_files`). Stage B D-01 re-fire post-fix `7feb52d5` CLEAN AGREE. Close-the-loop via `cc_0009_stage_b_close_the_loop`.

**Stage C delivered (closed runtime 2026-05-11 07:26:28 UTC; documented v2.64 retroactive doc sync):**
- Deploy command: `supabase functions deploy cadence-rule-generator --no-verify-jwt --project-ref mbkmaxqhsohbtwsqolns` (CC manual PowerShell)
- EF state: ACTIVE, version 4, `verify_jwt=false` (empirically verified v2.64 session)
- V1–V4 + V6–V7 PASS (per PK report)
- V5 initial: FAIL — `permission denied for table client_cadence_rule` (failed runs `49955e8d` 07:12:29 + `ed72cb99` 07:13:26 UTC empirically verified v2.64)
- Remediation: `cc_0008_service_role_grants_fix` (service_role SELECT on `c.client_cadence_rule`)
- V5 post-remediation: HTTP 200; succeeded run `63c7aef9` at 07:20:59 UTC (empirically verified v2.64)
- `r.expected_publication` delta: 0 (first population deferred to Stage E)
- Three review rows resolved at 07:26:28 UTC `resolved_by='cc-0009-stage-c-close-2026-05-11'`: `bea1bca4-7517-4382-bb20-5ddcf3770f4e` + `48304b04-0c86-4ed4-8ec3-1ad34d5d72aa` + `4ac0cfce-6765-40dc-b151-4bd35a8bb935`

**Locked design decisions (unchanged):**
1. Option B for paused-IG suppression
2. Cross-brief FK deferral (matched_match_id, cc-0010 ALTER TABLE)
3. Default cron schedule `5 16 * * *` (Stage D lock at apply gate)

**Stages remaining (NOT STARTED):**
- **Stage D** — `apply_migration cc_0009_pg_cron_cadence_generator` (chat). Pre-flight §1.10+§1.11 (already GREEN v2.64) → D-01 → PK approval → apply → V9 → close-the-loop. **Vault design input from v2.64 Q2**: CRON_SECRET in EF secrets only, not in `vault.secrets`.
- **Stage E** — `execute_sql net.http_post` first backfill (chat). Pre-flight §1.12 → D-01 → PK approval → invoke → V10–V12 → close-the-loop.

**Carry to next session:** rank 1 (Stage D D-01 + cron creation) + rank 2 (Stage E first backfill, sequenced).

---

## 🔄 Standing session-start checks

S1–S29 unchanged. S30 closed PASS v2.47.

---

## 🔴 Time-bound (calendar-driven deadlines)

Unchanged from v2.54.

---

## 🛠 Meta-tooling — ChatGPT Review MCP

**v2.64 application**: 0 D-01 fires (doc-only retroactive sync). Cumulative T-MCP-02 **57** unchanged. Cumulative T-MCP-08 unchanged at 2. State-capture exceptions v2.64: **0**.

**Close-the-loop UPDATEs to `m.chatgpt_review`:** v2.64 adds 0 (Stage C close-the-loop UPDATEs on three review rows `bea1bca4` + `48304b04` + `4ac0cfce` were applied earlier on 2026-05-11 at 07:26:28 UTC, not in this session). **5 prior cc-NNNN reviews still pending close-the-loop** (cc-0003 v2 + cc-0004 + cc-0006 + cc-0007 + cc-0005 v4) — UNBLOCKED v2.61, still not batched.

---

## 🤖 Cowork automation (D182)

**v2.64 status:** `docs/briefs/morning-inbox-sweep-v1.md` committed status=draft per PK hold. NOT scheduled in Cowork until PK amends.

**Existing Cowork status:** Weekly reconciliation Mon 7am AEST + ICE Nightly Health Check daily 02:00 AEST.

---

## 🟡 Active

| ID | Item | Priority | Status | Owner | Next action |
|---|---|---|---|---|---|
| **cc-0009 Stage D D-01 + cron creation** | pg_cron schedule registering `cadence_rule_generator_daily` at `5 16 * * *` UTC (02:05 Sydney AEST) | **P1 (rank 1 v2.64)** | Unblocked by Stage C runtime closure + v2.64 doc sync. Pre-flight §1.10+§1.11 already GREEN v2.64 (Q1-Q5 all PASS, Q2 vault observation flagged). ≥1 D-01 fire required → PK approval phrase → V9 → close-the-loop. | chat | NEW Stage-D D-01 fire (action_type=plan_review per KOI-02) → PK approval phrase → `apply_migration cc_0009_pg_cron_cadence_generator` → V9 → close-the-loop UPDATE. |
| **cc-0009 Stage E first backfill** | `execute_sql net.http_post` invocation | **P1 (rank 2 v2.64; sequenced)** | Cannot start until Stage D closes clean. | chat | Pre-flight §1.12 → NEW Stage-E D-01 fire → PK approval phrase → `execute_sql net.http_post` invocation → V10–V12 → close-the-loop UPDATE. |
| **Close-the-loop UPDATE batch (5 prior cc-NNNN D-01 rows — UNBLOCKED v2.61, still pending v2.64)** | Map cc-0003 v2 + cc-0004 + cc-0006 + cc-0007 + cc-0005 v4 D-01 rows to `status='resolved'` | **P2 — promoted v2.63 (batch overdue 6 sessions)** | UNBLOCKED by L36 enum discovery v2.61. All 5 rows currently `status='escalated'`. Batch UPDATE in single `execute_sql` call. ~10 min. | chat → next session OR between cc-0009 stages | Single execute_sql with CASE expression. |
| **Platform Reconciliation View — BRIEF AUTHORING** | reconciliation surface | **P2 — held at rank 4 v2.64** | Sequencing blockers all cleared. Brief NOT YET AUTHORED. Can proceed in parallel with cc-0009 stages D-E. | PK → chat | Brief authoring when PK greenlights. |
| **Dashboard Architecture Review Phase 0 prerequisites** | 7 confirm-defaults | P1 TOP (unchanged) | M-series complete v2.59; cc-0008 v5 APPLIED v2.61; cc-0009 Stage A + B + C CLOSED v2.64. 7 default-blockers still pending PK confirm/override. | PK | Confirm defaults via cc-0001. |
| **AI cost view** | `vw_ai_cost_monthly` view + dashboard tile | P3 → Top 5 (carry) | Backlog | chat → future session | Author view DDL + add NOW dashboard tile. ~1h. |
| **Publisher latent config risk follow-up** | Doc-only patch adding `[functions.publisher] verify_jwt = false` | P3 (carry from v2.58) | OPEN. | chat → future session | Single-file commit to `supabase/config.toml`. NO deploy required. ~5 min. |
| **M8b separate brief authoring** | Function rename + COMMENT after manual caller remediation | P3 (carry from v2.59) | NOT YET AUTHORED. | PK → chat | When PK directs. |
| **94-row un-publishable legacy draft cohort cleanup** | Drafts: SQL filter per cc-0007 result file | P3 (carry from v2.58) | LOGGED. Currently 94 rows. | PK → chat → future session | If PK directs, separate cc-NNNN brief. |
| **F-CRON-AUTO-APPROVER-SECRET-INLINE** | Cron jobid 58 has secret hardcoded inline | P2 (security, OPEN) | OPEN — unchanged v2.64. cc-0009 Stage B + D design AROUND this lesson. v2.64 Q2 vault observation consistent. Finding NOT remediated by cc-0009. | chat → future session (PK approval required) | PK to authorise secret rotation for cron jobid 58 specifically. |
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
| **Dashboard roadmap PHASES reconciliation** | PHASES array stale since 3 May | P3 | Carried (**20th deferral v2.64**) | chat → dedicated session | Open `app/(dashboard)/roadmap/page.tsx` and bring PHASES + LAST_UPDATED current. |
| **F-AI-WORKER-PARSER-SKIP-BUG V4** | Forward acid-test inconclusive | P2 | Passive monitoring | chat → future | V4 needs natural skip event OR synthetic test. |
| **F-CRON-COMPLIANCE-MONITOR-STALE** | cron jobid 31 calls deployed slug; folder absent | P2 | LOGGED | PK → future session | Decide. |
| **F-CRON-INGEST-STALE** | cron jobid 1 calls deployed slug; folder absent | P2 | LOGGED | PK → future session | Same shape. |
| **F-CRON-PIPELINE-AI-SUMMARY-STALE** | cron jobid 30 calls deployed slug; folder absent | P2 | LOGGED | PK → future session | Same shape. |
| **F-CRON-PIPELINE-DOCTOR-STALE** | cron jobids 29 + 39 call deployed slug; folder absent | P2 | LOGGED | PK → future session | Same shape. |
| **Music library activation checklist** | 9 mp3 upload + bucket + env var | P3 (PK action) | PENDING PK ACTION | PK | PK to action when ready. |
| **Emergency redeploy governance question** | Should bounded production-restoration require expedited D-01? | P2 (PK decision) | PENDING PK DECISION | PK | PK rules; chat documents. |
| **`f4a0dd85` bridge health-check `sql_read` row** | `status='completed', resolved_by=null` | P3 (carry from v2.63) | OBSERVED, hygiene only | PK → future | PK can decide whether to close (functional no-op) or leave as-is. |
| **Feature branch `feature/cc-0009-stage-b-ef-source`** | Preserved at HEAD `9796b0ee` post Stage B merge | P3 (carry from v2.63) | OBSERVED, audit artifact | PK → future | PK can direct deletion when convenient. |

**Closed v2.64:** **cc-0009 Stage C documentation sync (PRV-1 second build, third stage — retroactive doc-only patch).** Stage C runtime work occurred earlier on 2026-05-11 (deploy + V5 remediation via `cc_0008_service_role_grants_fix` + 3-row audit close-out at 07:26:28 UTC); v2.64 brings repo documentation into line with that runtime truth. Result file gets new `# Stage C — Result` section. Sync_state shows Stage A + B + C all CLOSED. Today/Next 5 rebuilt: Stage D D-01 rank 1, Stage E rank 2, close-the-loop batch rank 3, Platform Reconciliation rank 4. No production mutation v2.64. **L41 NEW candidate**: runtime grant defect surfaced at V-check + fixed in-place during same Stage close cycle. T-MCP-02 cum 57 unchanged. State-capture exceptions v2.64: 0.

**Closed v2.63:** **cc-0009 Stage A + Stage B (PRV-1 second build, first + second stages).** Stage A migration `cc_0009_r_schema_and_helpers` applied; V1–V8 all PASS; Stage B feature branch merged to main at commit `dbd41438` via squash-equivalent push_files; D-01 review row `7feb52d5` CLEAN AGREE. L39 + L40 candidates.

**Closed v2.62:** *(none — v2.62 is doc-only authoring close.)*

**Closed v2.61:** **cc-0008 v5 (PRV-1 first build).** L33+L34+L35+L36 reified.

**Closed v2.60:** *(none — single-file backlog addition only.)*

**Closed v2.59:** **M8 Path A (cc-0005 v4 / M8a)** — 344 rows dead-lettered.

**Closed v2.58:** F-CRON-AI-WORKER-401-INVALID-JWT-FORMAT (cc-0007 commit `411b85ee`).
**Closed v2.57:** F-CRON-PG-NET-TIMEOUT-5S (cc-0006 commit `c72bc327`).
**Closed v2.56:** M6 Phase B (cc-0004 commit `9d5bdd37`).
**Closed v2.55:** M6 Phase A (cc-0003 v2 commit `d60dcfbc`).
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

**v2.64 carry (unchanged from v2.55–v2.63):**

- **Crazy Domains refund + clean-up follow-up** (carry from v2.51) — PK called CD on 2026-05-08. Remaining clean-up still PK to action manually:
  1. Cancel Website Builder auto-renewal (saves ~$251/yr ongoing)
  2. Disable Premium DNS auto-renewal (saves $26/yr; move DNS to Cloudflare — free)
  3. Disable Domain Guard on .com auto-renewal (saves $9/yr)
  4. Before Nov 2026: transfer invegent.com to Cloudflare Registrar (~A$15/yr); transfer invegent.com.au to VentraIP or similar (~A$25–35/yr).
  5. Decline the $521/3yr renewal quote from CD.

  **Total annual saving once cleaned up: ~A$286/yr ongoing. Three-year saving: ~A$860.**

  Not chat scope — PK actions manually. Re-check status next session.

*(no other items flagged at v2.64 close — standing P0 to ask at next session start.)*

---

## 🌱 Future ideation / content-pipeline expansion (NOT current pipeline-integrity work)

> **Classification:** Forward-looking ideation. Queue behind: (1) cc-0009 PRV-1 second build (currently Stages A + B + C CLOSED; D/E remaining), (2) Platform Reconciliation build, (3) AI Operating System Improvements / project skills. NOT pipeline-integrity work.

### v2.60 — Brand Topic Notebook → Episodic Podcast Source Pack (NotebookLM upstream feed)

**Logged:** 2026-05-09 Sydney (PK direction post cc-0008 v3 landing).

**Context.** PK observed that NotebookLM can create topic-specific notebooks and generate podcast-style Audio Overviews from source material. This could be connected to ICE brands as an upstream content ideation / source-pack system.

**Important framing (PK explicit):**
- Do NOT treat raw NotebookLM audio as final publishable brand content.
- Treat it as research / ideation / source-pack material requiring review.
- Future module name candidate: `Brand Topic Notebook → Episode Source Pack → Content Derivatives`.

**Queue behind (PK directive):**
1. cc-0009 / PRV-1 second build (Stages A + B + C CLOSED v2.64; Stages D/E remaining).
2. Platform Reconciliation build.
3. AI Operating System Improvements / project skills.

**Not actionable until upstream blockers clear.** Logged for forward visibility only.

---

## 📌 Backlog

**v2.64 changes:**

- **CLOSED v2.64**: cc-0009 Stage C documentation sync (PRV-1 second build, third stage). Stage C runtime work occurred earlier on 2026-05-11; v2.64 patches repo documentation. No production mutation v2.64.
- **STATE CHANGE v2.64**: Stage C apply gate row removed from Active.
- **STATE CHANGE v2.64**: Stage D promoted to rank 1; Stage E rank 2; close-the-loop batch rank 3; Platform Reconciliation rank 4.
- **NEW v2.64 LESSON CANDIDATE**: L41 — runtime grant defect surfaced at V-check + fixed in-place during same Stage close cycle. Reinforces L17.
- **NEW v2.64 VINDICATION**: L37 vindicated again through Stage A + B + C end-to-end execution.
- **CARRIED v2.64**: Dashboard roadmap PHASES — **20th** consecutive deferral.
- **CARRIED v2.64**: All v2.63 carries unchanged otherwise (audit detail in commit history + sync_state v2.63 inline summary).

**Pre-v2.64 changes**: per commit history + sync_state archive. v2.63: cc-0009 Stage A + B; v2.62: cc-0009 v1 AUTHORED; v2.61: cc-0008 v5 APPLIED + CLOSED; v2.60: Brand Topic Notebook future-ideation logged; v2.59: M8 Path A applied; v2.55–v2.58 + earlier per prior changelog.

---

## 🧊 Frozen / Deferred

Unchanged.

---

## 🎓 Canonical Lessons

- **Lesson #61** (P1–P5 must be empirically verified, not theoretically assumed) — reinforced again by cc-0009 Stage C execution (Stage D pre-flight Q1-Q5 reads v2.64 session empirically verified runtime state PK reported, including V5 failed runs at 07:12:29 + 07:13:26 UTC and V5 PASS run at 07:20:59 UTC). **Promotion to canonical recommended (now reinforced 8 times).**
- **Lesson #62 v2.50 refinement** — not exercised v2.64 (doc-only).
- **L17 in-place patching pattern** — vindicated again at cc-0009 Stage C (V5-fail + same-cycle remediation via `cc_0008_service_role_grants_fix` + V5 re-PASS without a separate brief). **L41 NEW candidate** is the named refinement.
- **L11, L16, L18 vindicated again** — strong evidence.
- **L19, L20, L21** — VINDICATED v2.59; reinforced.

**v2.60 NEW lesson candidate (L32)**: future-ideation backlog quarantine pattern.

**v2.61 NEW lesson candidates (L33–L36)** — reified by cc-0008 v4→v5 cycle (event-trigger pre-flight survey; k.fn_sync_registry auto-registration; ON CONFLICT DO UPDATE for k.*; m.chatgpt_review enum discovery).

**v2.62 NEW lesson candidates (L37–L38)** — reified by cc-0009 v1 brief authoring:
- **L37 candidate VINDICATED v2.63 + v2.64** Multi-stage cc-NNNN brief authoring pattern: cc-0009 executed Stages A + B + C successfully end-to-end. Pattern refines L17.
- **L38 candidate** Cross-brief FK deferral pattern. Awaits cc-0010 ALTER TABLE for full empirical vindication.

**v2.63 NEW lesson candidates (L39–L40)** — reified by cc-0009 Stage B end-to-end execution:
- **L39 candidate VINDICATED** Feature-branch + diff-review + PK-approval workflow per CCH R11.
- **L40 NEW candidate** Squash-equivalent merge mechanism via MCP `push_files` when `merge_pull_request` unavailable.

**v2.64 NEW lesson candidate (L41)** — reified by cc-0009 Stage C runtime cycle:
- **L41 NEW candidate** Runtime grant defect surfaced at V-check and fixed in-place during the same Stage close cycle. Stage C V5 surfaced missing `service_role` SELECT grant on `c.client_cadence_rule` after EF deploy; remediation via `cc_0008_service_role_grants_fix` was applied within the Stage C cycle (not deferred); V5 re-ran PASS; Stage C closed cleanly. Reinforces L17. Confirms target-table-attributed migration namespaces (`cc_0008_*` for `c.client_cadence_rule` grants) are correct even when the surfacing brief is cc-0009. Distinguishes from L37 by being about runtime-state-correction-within-stage. Candidate-only pending repeat use.

**All five (L37 + L38 + L39 + L40 + L41) recommended for promotion to baseline candidate at next cycle.**

---

## v2.64 honest limitations

- All v2.31–v2.63 limitations apply (audit detail in commit history + sync_state archive).
- **cc-0009 Stage A + B + C CLOSED at v2.64.** Stages D/E remain ungated.
- **v2.64 is a retroactive doc-only sync session.** Stage C operational work occurred earlier on 2026-05-11 (closure timestamp 07:26:28 UTC). No production mutation in v2.64 itself.
- **v2.64 doc-sync split across 2 commits** due to combined-content response-size budget. Commit 1 (`1b006b28953654de8b01294e624bbc47e26402b8`): result file + sync_state via push_files. Commit 2 (this file): action_list via push_files (after 2 prior attempts failed: first push_files hung 4 min; create_or_update_file truncated mid-content but did not land). Audit cleanliness preserved through commit-message cross-references.
- **Action_list v2.64 narrative pruned** to keep file size manageable for chat-driven commits. Detailed v2.63 changelog narrative + v2.63 honest limitations compressed (full v2.63 detail remains in commit `1b006b28` sync_state inline summary + earlier sync_state v2.63 close). No semantic information lost; size reduced ~25%.
- **No Edge Function deploys this session.** No cron schedules created. No backfill invocations. No DB writes. Only `execute_sql` SELECT calls for Stage D pre-flight + `get_edge_function` reads + GitHub doc commits.
- **Three Stage C `m.chatgpt_review` rows resolved earlier on 2026-05-11 at 07:26:28 UTC**: `bea1bca4` + `48304b04` + `4ac0cfce`. v2.64 does not re-verify these row states via SQL (would have required `execute_sql` SELECT on `m.chatgpt_review`, not in documentation-sync-only directive). PK report is the authoritative source.
- **5 prior outstanding `m.chatgpt_review` close-the-loop UPDATEs UNBLOCKED v2.61, still pending v2.64** (cc-0003 v2 + cc-0004 + cc-0006 + cc-0007 + cc-0005 v4) — still P2 (batch overdue 6 sessions).
- **L37 + L41 candidates: L37 VINDICATED AGAIN through Stage C end-to-end execution; L41 NEW candidate** documents runtime grant defect + in-cycle remediation pattern.
- **Memory at 30-edit cap pre-session.** v2.64 does NOT update memory directly.
- **Dashboard roadmap PHASES still stale** — **20th** consecutive deferral.
- **Action_list file size**: ~38KB at v2.64 close (was ~50KB at v2.63; pruned ~25% during v2.64 doc-sync to fit response budget). Audit detail relocated to commit history + sync_state archive.
- **Today/Next 5 rebuild at v2.64**: cc-0009 Stage D D-01 + cron creation = rank 1 (NEW); Stage E = rank 2 (sequenced); close-the-loop batch = rank 3; Platform Reconciliation View = rank 4; Phase 0 confirms = rank 5; AI cost view = rank 6; Personal businesses standing = rank 7.
- **Per-session file**: NOT WRITTEN (retroactive doc-only sync exception to G1 convention).
- **Result file**: UPDATED in commit 1 `1b006b28` of v2.64.

---

## Changelog

- v1.0–v2.62: per commit history + sync_state archive (no v2.64 changes to historical entries; v2.63 detail in commit `1b006b28` sync_state inline summary + earlier v2.63 close).
- **v2.63 (2026-05-11 Sydney, cc-0009 Stage A + Stage B APPLIED + MERGED + CLOSED):** Stage A applied via `apply_migration cc_0009_r_schema_and_helpers`; V1–V8 all PASS. Stage B feature branch merged to main at squash-equivalent commit `dbd41438` (parent `db4143ce`). D1 schema-mismatch fixup commit `9796b0ee` (removed `tolerance_minutes` references). Stage B D-01 re-fire `7feb52d5` CLEAN AGREE. Close-the-loop via `cc_0009_stage_b_close_the_loop`. L37 + L39 vindicated; L40 NEW candidate (squash-equivalent merge via push_files). T-MCP-02 +1 cum 57.
- **v2.64 (2026-05-11 Sydney, cc-0009 Stage C documentation sync — retroactive doc-only patch):**
  - **cc-0009 Stage C operationally CLOSED earlier on 2026-05-11 (closure timestamp 07:26:28 UTC).** v2.64 brings repo documentation into line with that runtime truth before Stage D D-01.
  - Stage C runtime facts (per PK report + this session's empirical pre-flight reads): deploy succeeded (cadence-rule-generator ACTIVE v4 verify_jwt=false); V1–V4 + V6–V7 PASS; V5 initial fail (`permission denied for table client_cadence_rule` — failed runs `49955e8d` 07:12:29 + `ed72cb99` 07:13:26 UTC empirically verified); remediation `cc_0008_service_role_grants_fix`; V5 post-remediation PASS (HTTP 200 succeeded run `63c7aef9` at 07:20:59 UTC, rows_inserted=0); 3 review rows resolved 07:26:28 UTC (`bea1bca4` + `48304b04` + `4ac0cfce` all `resolved_by='cc-0009-stage-c-close-2026-05-11'`).
  - **3-file doc-sync split into 2 commits** due to response-size budget. Commit 1 (`1b006b28953654de8b01294e624bbc47e26402b8`): result file + sync_state. Commit 2 (this file): action_list.
  - **Stage D pre-flight ran GREEN this session** ahead of Stage D D-01 fire: Q1-Q5 all PASS, with Q2 vault observation (CRON_SECRET absent from `vault.secrets` — Stage D D-01 design input).
  - **L41 NEW candidate** — runtime grant defect surfaced at V-check + fixed in-place during same Stage close cycle. Reinforces L17.
  - **L37 candidate VINDICATED AGAIN** through Stage A + B + C end-to-end execution.
  - **T-MCP-02 cumulative 57** unchanged (no D-01 fires v2.64). State-capture exceptions v2.64: **0**.
  - **Today/Next 5 rebuild**: cc-0009 Stage D D-01 + cron creation = rank 1; Stage E = rank 2; 5-row close-the-loop batch = rank 3; Platform Reconciliation View = rank 4; Phase 0 = rank 5; AI cost view = rank 6; Personal businesses = rank 7.
  - **Active rows updated v2.64**: Stage C row removed; Stage D promoted to rank 1; Stage E promoted to rank 2; close-the-loop batch promoted to rank 3; Platform Reconciliation promoted to rank 4.
  - **5 prior close-the-loop UPDATEs** UNBLOCKED v2.61, still pending v2.64.
  - **Closure budget**: ~30 min total v2.64 cycle. Trailing-14-day ~68h above 8.0h floor. ~2 P0+P1 open within 20-finding cap.
  - **Production mutations this session**: 0 (doc-only).
