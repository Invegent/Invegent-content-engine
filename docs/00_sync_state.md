# ICE — Sync State Index

> **This file is the lightweight session pointer index.** It never grows large. Per-session detail lives at `docs/runtime/sessions/YYYY-MM-DD-{slug}.md`.
>
> Restructured 2026-05-03 (G1) after two giant-file-rewrite truncation incidents in 24h. See `docs/runtime/archive/sync_state-pre-2026-05-03.md` for the frozen pre-restructure history.

---

## ⚠️ Session-start reading order (per memory entry 1)

1. **`docs/00_sync_state.md`** (this file) — pointer index + last 1-2 sessions inlined
2. **`docs/00_action_list.md`** — running queued/active/blocked/frozen backlog with priorities and triggers
3. Open the most-recent session file from the index below if deeper context is needed

The two top-level files (sync_state + action_list) are complementary: this file answers *"what happened recently"*, action_list answers *"what's queued next"*.

---

## 📚 Session index (reverse chronological)

| Date | Slug | Headline | File |
|---|---|---|---|
| 2026-05-03 | r01-calibration | R01 Data Auditor calibration v2 — 7 decisions + 3 lesson promotions; closure effectiveness metric; bidirectional severity anchors | `docs/runtime/sessions/2026-05-03-r01-calibration.md` |
| 2026-05-03 | t02-ratification | T02 Gate B body-health exit RATIFIED (5-signal panel + paused-cron hardening) | `docs/runtime/sessions/2026-05-03-t02-ratification.md` |
| 2026-05-03 | fpub005-apply | F-PUB-005 + F-PUB-010 patch APPLIED (drop trigger + hard-cap cron) | `docs/runtime/sessions/2026-05-03-fpub005-apply.md` |
| 2026-05-03 | mid-morning-chat-session-2 | F-PUB-007 closed not-real-bug + F-PUB-010 surfaced + F-PUB-005 brief v2 + F04 applied | `docs/runtime/sessions/2026-05-03-mid-morning-chat-session-2.md` |

**Pre-2026-05-03 history**: frozen at `docs/runtime/archive/sync_state-pre-2026-05-03.md`. Read the archive directly when deep historical context is needed.

---

## 🟢 Most recent session — inline summary

### 2026-05-03 late-morning Sydney — R01 Data Auditor calibration v2

~1.0h chat-side, immediately following T02 ratification + T05 Meta dev support prep. Full detail: `docs/runtime/sessions/2026-05-03-r01-calibration.md`.

**Closed**: T04 R01 calibration session (90min hard cap honoured; finished within budget).

**Trigger**: severity miscalibration in cycle 2 (bidirectional — F-001 deflated MEDIUM→HIGH, F-002 inflated MEDIUM→LOW); closure effectiveness regression (cycle 1 67%, cycle 2 0%, trailing 3-cycle 28.6% — below 50% soft target); 2 unpromoted lesson candidates plus 2 promotion-eligible candidates.

**FP taxonomy across 7 cycle-1+2 findings**: 0% Strict FP, 29% Process FP (C2-F003, C2-F004 — about brief, not data), 29% Severity FP (C2-F001 deflated, C2-F002 inflated), 0% Closure-rejected. Aggregate 4/7 (57%) had FP element. Sharpened framing: auditor was right about what they saw — role doc was imprecise about category and weight.

**7 decisions made (PK explicit override on each)**:

1. **Split Data vs Process findings** — `D-` and `P-` ID prefixes; Process ceiling LOW with escalation exception
2. **Severity table compact + Calibration Anchors as own section** — "table defines the system, anchors teach judgment" (PK quote, verbatim in role doc)
3. **Row-count-aware indexing** — Section 5 rewritten with 5000-row threshold + `pg_stat_user_tables` query; **Lesson #41 promoted candidate → canonical**
4. **Step 0 brief-consistency check** — mandatory before reading snapshot; brief gaps trip Process findings; **Lesson #42 promoted candidate → canonical**
5. **Pre-raise overlap check + symptomatic-closure-recurrence escalation** — 4 sub-cases; symptomatic recurrence = severity +1 (the teeth on the rule)
6. **Closure effectiveness metric** — N of M closures produced structural mechanism; ≥ 50% soft target; trailing-3-cycle average drop triggers next calibration
7. **`closed-redundant-lesson-N` closure type + mandatory pre-raise lesson-honor check** — 3 sub-cases; mechanism gaps route to Process findings

**Carry-forward (Option γ)**: Lesson #40 promoted candidate → canonical (tool errors not semantically meaningful); C2-CAND-001 (Stage 12 migration filename audit-trail) punted to Cycle 3.

**3 lessons promoted to canonical this session**: #40, #41, #42. Each has a defined mechanism in the role doc. Closure effectiveness of the calibration session itself: 7 of 7 = 100% structural — calibration models the standard the role doc now requires.

**Standing rule D-01 caveat**: state-capture exception applied; substantial-rewrite caveat logged; PK may fire retrospective ChatGPT review post-commit if desired.

**Commit note**: first push_files attempt blocked by PK internet drop (not MCP failure); verified via `get_file_contents` that data_auditor.md SHA was unchanged; re-fired same payload after reconnection. Single retry; no duplication.

**Closure budget**: +1.0h (T04). Trailing-14-day 9.3h → **10.3h** (comfortably above 8.0 floor).

---

## 🟡 Next session priorities (carry-forward from action_list v2.25)

1. Personal businesses check-in
2. T05 Meta dev support contact (PK external action; message drafted in T05 prep — both variants ready in conversation history)
3. F-PUB-005 V3-V5 wait-based verifications (single query against post-apply T+0 baseline)
4. publish-queue-and-publish CC brief execution (status: ready)
5. B-INV-CFW-Invegent-Silent-Approver investigation (CC-suitable read-only brief)

---

## ⛔ Carried-forward "do not touch" state

- NDIS-Yarns IG `publish_enabled=false` (T07 step 4 rollback) — do not flip to `true` until T05 (Meta dev support) decides recovery
- Cron jobid 53 `active=false` — do not re-enable until S16 fresh-approval verification + T05 + cron `?limit=1` update
- The `m.chatgpt_review` rows `2bab95d5-...` (T-MCP-01) and `521628d0-...` (T02 ratification) — status `escalated`, T-MCP-05 close-the-loop UPDATEs pending PK confirmation
- The 5 over-cap (client, platform) combos (NDIS × FB/IG/LI, PP × IG/LI) hold their existing queue depth — by design, drains via publish rate. Don't manually clear or truncate.
- C2-CAND-001 (Stage 12 migration filename audit-trail) — punted to Cycle 3 per R01 calibration carry-forward Option γ

---

## 📜 G1 convention (the rule)

**Each session writes its own file** at `docs/runtime/sessions/YYYY-MM-DD-{slug}.md`. At session end, chat updates this file ONLY by:

1. Inserting one row into the `📚 Session index` table at the top
2. Replacing the `🟢 Most recent session — inline summary` section with the new session's summary (and demoting the prior summary into the index)
3. Optionally updating `🟡 Next session priorities` and `⛔ Carried-forward` blocks

**This file should never exceed ~10KB.** If it grows past that, archive the oldest inline summaries to a session file.

**Old monolithic file is frozen.** `docs/00_sync_state.md` pre-2026-05-03 → `docs/runtime/archive/sync_state-pre-2026-05-03.md`. Never modified again.

---

*Last updated: 2026-05-03 Sunday late-morning Sydney — R01 calibration v2.*
