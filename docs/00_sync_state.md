# ICE — Sync State Index

> **This file is the lightweight session pointer index.** It never grows large. Per-session detail lives at `docs/runtime/sessions/YYYY-MM-DD-{slug}.md`.
>
> Restructured 2026-05-03 (G1) after two giant-file-rewrite truncation incidents in 24h. See `docs/runtime/archive/sync_state-pre-2026-05-03.md` for the frozen pre-restructure history.

---

## ⚠️ Session-start reading order (per memory entry 1)

1. **`docs/00_sync_state.md`** (this file) — pointer index + last 1-2 sessions inlined
2. **`docs/00_action_list.md`** — running queued/active/blocked/frozen backlog
3. Open the most-recent session file from the index below if deeper context is needed

---

## 📚 Session index (reverse chronological)

| Date | Slug | Headline | File |
|---|---|---|---|
| 2026-05-04 | laptop-three-applies | Three queued items shipped: ai-worker v2.11.1 deployed (F-AI-WORKER-PARSER-SKIP-BUG); audit matrix CASE patch (F-AAP-007 v2); m.fill_pending_slots scheduled_for write (F-PUB-009). 2/3 D-01 reviews escalated type-(c); state-capture override with PK approval; both shipped clean. Lesson #62 type-(c) at 5+ vindications, ready for canonical promotion. | `docs/runtime/sessions/2026-05-04-laptop-three-applies.md` |
| 2026-05-04 | baudit-check5-retired-faap007-revised | Phone-flow knock + deep pipeline investigation. B-AUDIT-CHECK5-DRIFT retired; F-AAP-007 brief v1→v2; F-PUB-009 brief authored; F-AI-WORKER-PARSER-SKIP-BUG diagnosed (single root cause for 3 prior P1 findings). T-MCP-11/12 each reinforced. F-AAP-DRAFTS-STUCK subsumed; F-RECOVER-LOOP-001 P1→P3. | `docs/runtime/sessions/2026-05-04-baudit-check5-retired-faap007-revised.md` |
| 2026-05-03 | audit-readiness-completion-night | Migration 3 (audit views v2); runbook v1→v2→v2.1 across 2 ChatGPT external audits; F-HISTORIC-DEAD-CLEANUP retired (Phase 1.7); T-MCP-11/12 lessons. | `docs/runtime/sessions/2026-05-03-audit-readiness-completion-night.md` |
| 2026-05-03 | pipeline-relief-apply-night | Migration 1+2 applied; 16 dead rows swept; audit schema + 2 views; cap lift deferred (math caught). | `docs/runtime/sessions/2026-05-03-pipeline-relief-apply-night.md` |
| 2026-05-03 | pipeline-investigation-night | End-to-end investigation; 4 stalled streams; 3 structural issues identified. | `docs/runtime/sessions/2026-05-03-pipeline-investigation-night.md` |
| 2026-05-03 | tmcp05-batch-closure | T-MCP-05 closed; post-apply ACL gap surfaced via break-glass. | `docs/runtime/sessions/2026-05-03-tmcp05-batch-closure.md` |
| 2026-05-03 | faap001-002-apply | Stance retired + F-AAP-001 + F-AAP-002 applied + B-AUDIT-V4-PEERS clean; T05 returns P1-urgent. | `docs/runtime/sessions/2026-05-03-faap001-002-apply.md` |
| 2026-05-03 | faap001-rootcause | F-PUB-005 V3-V5 PASS + F-AAP-001 P1 root cause confirmed. | `docs/runtime/sessions/2026-05-03-faap001-rootcause.md` |
| 2026-05-03 | r01-calibration | R01 Data Auditor calibration v2 — 7 decisions + 3 lesson promotions. | `docs/runtime/sessions/2026-05-03-r01-calibration.md` |
| 2026-05-03 | t02-ratification | T02 Gate B body-health exit RATIFIED. | `docs/runtime/sessions/2026-05-03-t02-ratification.md` |
| 2026-05-03 | fpub005-apply | F-PUB-005 + F-PUB-010 patch APPLIED. | `docs/runtime/sessions/2026-05-03-fpub005-apply.md` |
| 2026-05-03 | mid-morning-chat-session-2 | F-PUB-007 closed + F-PUB-010 surfaced + F-PUB-005 brief v2 + F04 applied. | `docs/runtime/sessions/2026-05-03-mid-morning-chat-session-2.md` |

**Pre-2026-05-03 history**: frozen at `docs/runtime/archive/sync_state-pre-2026-05-03.md`.

---

## 🟢 Most recent session — inline summary

### 2026-05-04 laptop Sydney — Three applies in one chat

~0.5h chat-side. Full detail: `docs/runtime/sessions/2026-05-04-laptop-three-applies.md`. Prior phase: `docs/runtime/sessions/2026-05-04-baudit-check5-retired-faap007-revised.md`.

PK on laptop after morning phone session committed all 3 briefs. Chose Option B (chat handles entire flow including EF deploy via Supabase MCP, no CC handoff).

**Three actions in sequence per leverage**:
1. **F-AI-WORKER-PARSER-SKIP-BUG** ✅ ai-worker v98→v99 via `deploy_edge_function`. Three changes bundled (callClaude+callOpenAI parser skip-check fix + new `AiParseError` carrying rawResponse + outer catch persists raw model response). D-01 `ba234fce`: clean, no escalation. Closes B-AI-WORKER-NO-FAILURE-PAYLOAD-LOGGING in same deploy.
2. **F-AAP-007 v2 (Option B)** ✅ ONE CASE branch in `audit.v_brand_platform_audit_matrix` split into two (`approved_not_queued_cap_blocked` cap-verified + `approved_not_queued_genuine_gap` sibling). Pre-flight Q6=6, Q7=0. D-01 `e462597f` ESCALATED type-(c); state-capture override with PK approval. V1-V4 ✅. Bonus: de-conflates publishing_disabled from cap_blocked for IG streams.
3. **F-PUB-009 (improved Pattern 1)** ✅ surgical edit to `m.fill_pending_slots` INSERT/UPSERT block (one block, atomic, no race window — cleaner than brief's original Pattern 1 with separate trailing UPDATE). PF6: 145/145 pre-existing scheduled_for NULL. D-01 `753930ad` ESCALATED type-(c); state-capture override with PK approval. V1+V2 ✅. V3-V5 pending next fill cycle.

**D-01 pattern of session**: 2 of 3 reviews escalated with identical Lesson #62 type-(c) signature: verified_claims affirm every substantive fact; pushback is generic-risk speculation without specific consumer-break / data-corruption evidence; corrected_action restates existing apply-path plan; unverified_claims either restate proposal's own caveats or hedge with "may not". Both overridden via state-capture exception with PK explicit approval. **Lesson #62 type-(c) at 5+ vindications now — ready for canonical promotion** with default-presumption framing.

**One ai_job already processed under v2.11.1**: NDIS-Yarns YouTube at 09:00 UTC, succeeded normally. Confirms success path no regression.

**V3-V5 verification window**: ~17h until next CFW LI fill cycle (2026-05-06 03:04 UTC). That cycle simultaneously tests parser fix skip-path + F-PUB-009 forward-only write.

**Standing rules honoured**: D-01 (3 reviews, 1 clean / 2 type-(c) overridden), D-170 (chat applied 2 migrations + 1 EF deploy via Supabase MCP — D-170 read as "chat may use Supabase MCP for both apply_migration AND deploy_edge_function"), D-186 (closure +0.5h, trailing-14d ~19.0h above 8.0 floor), Lesson #36 (source byte-identity preserved), Lesson #51 (PF1-PF6 honoured for F-PUB-009).

**T-MCP-02 quota**: 21 → **24**. **Net P0+P1 open**: 7 → 4.

---

## 🟡 Next session priorities (carry-forward from action_list v2.34)

1. Personal businesses check-in
2. **T05 Meta dev support contact** (P1-urgent)
3. **CFW LI fill cycle V3-V5 acid test** when next CFW LI slot fires (~05-06 03:04 UTC) — tests parser fix + F-PUB-009 simultaneously
4. **F-AAP-NEEDS-REVIEW-BACKLOG (P2)** — 28 drafts in `needs_review`; CFW IG 15 oldest 11 days
5. **F-PUB-009 7-day flow check** — `legacy_spread_mismatch_count` decline trajectory after ~50 newly-filled slots

---

## ⛔ Carried-forward "do not touch" state

- NDIS-Yarns IG `publish_enabled=false` — do not flip until T05 decides recovery
- Cron jobid 53 `active=false` — do not re-enable until S16 + T05 + cron `?limit=1` update
- Cron jobid 11/64/65 (`seed-and-enqueue-{fb,ig,li}`) — paused per slot-driven v4
- Jobid 12 (`planner-hourly`) — still active despite v3 orphan production (B-CRON-V3-ORPHAN)
- **7 review_ids close-the-loop pending** (4 from prior batches + this session's `ba234fce`, `e462597f`, `753930ad`)
- **47 historic dead queue rows** retained as audit trail (Phase 1.7 design; F-HISTORIC-DEAD-CLEANUP RETIRED v2.32)
- **6 CFW LinkedIn slots + 1 CFW Facebook slot in `exceeded_recovery_attempts`** — quiescent; F-AI-WORKER-PARSER-SKIP-BUG is forward-only, will not retroactively recover. Audit trail intact.
- 1 NDIS-FB dead queue row preserved per F-PUB-005 carry-forward
- 5 over-cap (client, platform) combos hold queue depth — by design, drains via publish rate
- NDIS-Yarns LinkedIn slot `8f9e5c57-...` orphan since 4-27 — do not touch
- Property Pulse Facebook 1 orphan slot (B-PP-FB-ORPHAN-PENDING-FILL P3)
- C2-CAND-001 (Stage 12 migration filename audit-trail) — punted to Cycle 3

---

## 📜 G1 convention (the rule)

**Each session writes its own file** at `docs/runtime/sessions/YYYY-MM-DD-{slug}.md`. At session end, chat updates this file ONLY by:

1. Inserting one row into the `📚 Session index` table at the top
2. Replacing the `🟢 Most recent session — inline summary` section with the new session's summary (demoting the prior summary into the index)
3. Optionally updating `🟡 Next session priorities` and `⛔ Carried-forward` blocks

**This file should never exceed ~10KB.** If it grows past that, archive the oldest inline summaries to a session file.

**Old monolithic file is frozen.** Pre-2026-05-03 → `docs/runtime/archive/sync_state-pre-2026-05-03.md`. Never modified again.

---

*Last updated: 2026-05-04 laptop Sydney — three applies in one chat.*
