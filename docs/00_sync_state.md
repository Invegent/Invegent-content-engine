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
| 2026-05-03 | tmcp05-batch-closure | T-MCP-05 closed end-to-end via reusable SECURITY DEFINER function; post-apply ACL gap surfaced + closed via break-glass; T-MCP-08 3rd vindication; new lesson candidate (post-apply ACL verification) | `docs/runtime/sessions/2026-05-03-tmcp05-batch-closure.md` |
| 2026-05-03 | faap001-002-apply | Stance retired + F-AAP-001 + F-AAP-002 applied + B-AUDIT-V4-PEERS clean; T05 returns to P1-urgent; F-AAP-007 + B-AUDIT-CHECK5-DRIFT logged | `docs/runtime/sessions/2026-05-03-faap001-002-apply.md` |
| 2026-05-03 | faap001-rootcause | F-PUB-005 V3-V5 PASS + F-AAP-001 P1 confirmed root cause (slot-driven v4 vs auto-approver SQL fetcher contract break); ChatGPT correction validated | `docs/runtime/sessions/2026-05-03-faap001-rootcause.md` |
| 2026-05-03 | r01-calibration | R01 Data Auditor calibration v2 — 7 decisions + 3 lesson promotions; closure effectiveness metric; bidirectional severity anchors | `docs/runtime/sessions/2026-05-03-r01-calibration.md` |
| 2026-05-03 | t02-ratification | T02 Gate B body-health exit RATIFIED (5-signal panel + paused-cron hardening) | `docs/runtime/sessions/2026-05-03-t02-ratification.md` |
| 2026-05-03 | fpub005-apply | F-PUB-005 + F-PUB-010 patch APPLIED (drop trigger + hard-cap cron) | `docs/runtime/sessions/2026-05-03-fpub005-apply.md` |
| 2026-05-03 | mid-morning-chat-session-2 | F-PUB-007 closed not-real-bug + F-PUB-010 surfaced + F-PUB-005 brief v2 + F04 applied | `docs/runtime/sessions/2026-05-03-mid-morning-chat-session-2.md` |

**Pre-2026-05-03 history**: frozen at `docs/runtime/archive/sync_state-pre-2026-05-03.md`. Read the archive directly when deep historical context is needed.

---

## 🟢 Most recent session — inline summary

### 2026-05-03 late evening Sydney — T-MCP-05 batch closure + grants hardening break-glass

~0.7h chat-side. Full detail: `docs/runtime/sessions/2026-05-03-tmcp05-batch-closure.md`.

**Trigger**: PK directed Option A on T-MCP-05 close-the-loop after F-AAP-007 + B-AUDIT-CHECK5-DRIFT briefs were committed for night-job pickup.

**Major events**:

1. **Two ready-for-night-job briefs committed** at f793ddbf: F-AAP-007 fix (P2; same shape as F-AAP-002 but for F-PUB-010 backpressure-aware Check 8) and B-AUDIT-CHECK5-DRIFT fix (P3; Check 5 vocabulary drift `status='locked'` not in current vocab). Both scoped read-only pre-flight + migration draft only; apply gated on MCP review next chat session.

2. **T-MCP-05 batch closure plan_review fired** (review_id `1bae5068-c77a-40f1-a2a6-769fbc5988b9`, fire #18). ESCALATED with corrected_action requesting narrative validation against historical records. Categorised Lesson #62 type-(a) actionable.

3. **Validation cycle honoured corrected_action**. Three session files fetched; cross-reference produced 3 material amendments to narratives:
   - Row 1: PK's amendment direction was based on understanding "T-MCP-01" was a wrong action_list label. Session file actually has "(T-MCP-01 first fire)" referring to TOOL LINEAGE, not row content. Reframed.
   - Row 3: "three docs-only commits" was wrong — was ONE commit with three FILES. Also added ESCALATION nuance missing from initial draft.
   - Row 5: timestamp clarification (session file ~09:35 UTC vs MCP fire 09:36:16 — D-01 sequence requires apply after fire).

4. **Migration #1 applied** (`t_mcp_05_close_the_loop_v2_28_batch`). Authored reusable SECURITY DEFINER function `public.close_chatgpt_review` + 5 invocations on the pending review_ids. Verification round 1 (rows): all 5 closed clean with status='completed', resolved_by='PK', timestamps + narratives committed (lengths 507–1779 chars).

5. **Verification round 2 (function ACL): GAP SURFACED**. Expected service_role only; actual showed anon + authenticated also held EXECUTE. Root cause: Supabase default ACL grants EXECUTE on public-schema functions individually to roles, not via PUBLIC pseudo-role; REVOKE FROM PUBLIC was no-op against role-specific grants. ChatGPT plan_review couldn't catch this — reviewer sees only proposed SQL, not effective post-apply state.

6. **Migration #2 applied** (`t_mcp_05_close_chatgpt_review_grants_hardening`) under explicit PK BREAK-GLASS D-01 SKIP. Two-line REVOKE removing anon + authenticated EXECUTE. Verification round 3: clean, only postgres + service_role retain EXECUTE.

7. **PK "Verification Complete" mid-session message** claimed REVOKE was already applied. Direct ACL query showed grants unchanged. Trust-but-verify discipline caught the discrepancy. Chat applied REVOKE itself and verified clean state. Pattern signal: even authoritative-sounding status reports require ground-truth verification for production-state claims.

**Standing rules honoured**: D-01 (migration #1 plan_review fired + corrected_action honoured via validation), D-170 (chat applies migrations only), D-186 (closure +0.7h, trailing-14d 13.1→13.8h, well above 8.0 floor), Lessons #36 + #62 type-(a). Migration #2 was BREAK-GLASS exception under explicit PK direction.

**Pattern signals**: T-MCP-08 lesson candidate now has 3 vindications (v2.27 EF source inspection, v2.28 replay test, this session narrative validation) — promoted to canonical in action_list v2.29. NEW lesson candidate: post-apply ACL verification must query `information_schema.routine_privileges` directly; REVOKE FROM PUBLIC alone is insufficient against Supabase's role-specific defaults. First instance this session.

**T-MCP-02 quota**: 17 → **18** (one new fire `1bae5068` this session itself; self-similar follow-up entered backlog as T-MCP-05-NEW for next session closure using the new function).

**Closure budget**: +0.7h. Trailing-14-day 13.1 → 13.8h. Above floor.

**Net P0+P1 open findings**: unchanged (T-MCP-05 was a P3 task).

---

## 🟡 Next session priorities (carry-forward from action_list v2.29)

1. Personal businesses check-in
2. **T05 Meta dev support contact** (P1-urgent, unchanged from v2.28)
3. **F-AAP-007 fix apply path** (brief committed; check whether night-job ran pre-flight, proceed to MCP review + apply path next session)
4. **B-AUDIT-CHECK5-DRIFT fix apply path** (brief committed; same flow as F-AAP-007)
5. publish-queue-and-publish CC brief execution (P2, still queued from v2.27)
6. **T-MCP-05-NEW** — close-the-loop UPDATE on the new fire #18 row `1bae5068-...`. Self-similar to T-MCP-05 batch; uses new `public.close_chatgpt_review` function directly. PK confirmation required.

---

## ⛔ Carried-forward "do not touch" state

- NDIS-Yarns IG `publish_enabled=false` (T07 step 4 rollback) — do not flip to `true` until T05 (Meta dev support) decides recovery
- Cron jobid 53 `active=false` — do not re-enable until S16 fresh-approval verification + T05 + cron `?limit=1` update
- The `m.chatgpt_review` row `1bae5068-c77a-40f1-a2a6-769fbc5988b9` (T-MCP-05-NEW) — escalated, awaits close-the-loop UPDATE in next session
- The 5 over-cap (client, platform) combos (NDIS × FB/IG/LI, PP × IG/LI) hold their existing queue depth — by design, drains via publish rate. F-PUB-005 V3-V5 confirmed holding through F-AAP-001 apply (no over-cap growth). Don't manually clear or truncate.
- C2-CAND-001 (Stage 12 migration filename audit-trail) — punted to Cycle 3 per R01 calibration carry-forward Option γ
- Cron jobid 11/64/65 (`seed-and-enqueue-{fb,ig,li}`) — paused per slot-driven v4 migration. Resumption gate: fix-or-deprecation of `match_demand_to_canonicals` (F-AAP-004) before reactivating.
- Jobid 12 (`planner-hourly`) — still active despite producing v3 orphan data (B-CRON-V3-ORPHAN). Do NOT pause without first running reader-side audit on digest_item/digest_run consumers.
- **Closed v2.29**: 5 m.chatgpt_review rows from prior T-MCP-05 batch (`2bab95d5`, `521628d0`, `1e5ab2eb`, `745482fb`, `d4e25cfa`) are now `status='completed'` — removed from "do not touch".

---

## 📜 G1 convention (the rule)

**Each session writes its own file** at `docs/runtime/sessions/YYYY-MM-DD-{slug}.md`. At session end, chat updates this file ONLY by:

1. Inserting one row into the `📚 Session index` table at the top
2. Replacing the `🟢 Most recent session — inline summary` section with the new session's summary (and demoting the prior summary into the index)
3. Optionally updating `🟡 Next session priorities` and `⛔ Carried-forward` blocks

**This file should never exceed ~10KB.** If it grows past that, archive the oldest inline summaries to a session file.

**Old monolithic file is frozen.** `docs/00_sync_state.md` pre-2026-05-03 → `docs/runtime/archive/sync_state-pre-2026-05-03.md`. Never modified again.

---

*Last updated: 2026-05-03 late evening Sydney — T-MCP-05 batch closure + grants hardening break-glass; T-MCP-08 promoted to canonical.*
