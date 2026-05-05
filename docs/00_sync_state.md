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
| 2026-05-05 | ice-yt-oauth-restoration | F-YT-OAUTH-PP RESTORED for Property Pulse. Dashboard reconnect at `dashboard.invegent.com/connect` superseded staged Template 1 SQL — refreshed both PP+NY YouTube tokens (103-char canonical Google refresh_tokens written via dashboard OAuth flow). Template 2 SQL (4-draft reset) D-01 cleared first-fire `91caf322`; applied via Supabase MCP. Both subsequent cron 34 firings (:15 + :45 UTC) published all 4 stuck PP×YT drafts cleanly. First PP×YT pipeline-driven publishes since 2026-04-01. F-YT-NY-FORMAT-SELECTION brief committed `ff5ae6ae` (queued behind RECONCILE-EF-DRIFT). RECONCILE-EF-DRIFT remains P1 blocker on EF patches. M6 untouched. T-MCP-02 33 → 34. | `docs/runtime/sessions/2026-05-05-ice-yt-oauth-restoration.md` |
| 2026-05-05 | m5-applied-corrected-cascade-fix | M5 (`p_shadow` / `is_shadow` removal) APPLIED via `m5_remove_p_shadow_corrected_v2` after first attempt failed at view-rewrite (PostgreSQL `CREATE OR REPLACE VIEW` cannot drop columns). P3 dependency miss surfaced (`m.check_evergreen_threshold` reads view); corrected packet added cascade fix. 2 D-01 fires both clean first-fire proceed. 7/7 post-apply verifications PASS. M4 invariants intact. T-MCP-02 31→33. | `docs/runtime/sessions/2026-05-05-m5-applied-corrected-cascade-fix.md` |
| 2026-05-05 | m4-applied-state-capture-override | M4 (Defect 5: enqueue scheduled_for source + 147-row slot backfill) APPLIED via Lesson #62 state-capture override after both D-01 reviews escalated with verbatim-identical generic pushback. 8/8 post-apply verifications PASS. Forward flow proven (2 new v4 queue rows aligned). Lesson #62 sixth vindication. T-MCP-02 quota 29 → 31. | `docs/runtime/sessions/2026-05-05-m4-applied-state-capture-override.md` |
| 2026-05-05 | tier-1-queue-integrity-applied | Tier 1 queue integrity incident remediation applied: M1 (cleanup trigger filter by queue_id), M2 (publisher per-partition cap), M3 (get_next_scheduled_for NULL fallback + enqueue guards + 1-row dead-letter). All 8/8 post-apply verifications pass. T-MCP-08 vindicated twice. 108 historical anomalies intentionally untouched per scope item 5. | `docs/runtime/sessions/2026-05-05-tier-1-queue-integrity-applied.md` |
| 2026-05-04 | dashboard-architecture-review-kickoff | ICE Dashboard Architecture Review formally kicked off — three foundational decisions locked. 11-section review document agreed; ~9-10h estimate; §1 starts when PK signals. Cowork night-task v2.2 owner-gate. | `docs/runtime/sessions/2026-05-04-dashboard-architecture-review-kickoff.md` |
| 2026-05-04 | laptop-three-applies | Three queued items shipped: ai-worker v2.11.1; audit matrix CASE patch (F-AAP-007 v2); m.fill_pending_slots scheduled_for write (F-PUB-009). 2/3 D-01 reviews state-capture override. Lesson #62 type-(c) at 5+ vindications. | `docs/runtime/sessions/2026-05-04-laptop-three-applies.md` |
| 2026-05-04 | baudit-check5-retired-faap007-revised | B-AUDIT-CHECK5-DRIFT retired; F-AAP-007 brief v1→v2; F-PUB-009 brief authored; F-AI-WORKER-PARSER-SKIP-BUG diagnosed. T-MCP-11/12 each reinforced. F-RECOVER-LOOP-001 P1→P3. | `docs/runtime/sessions/2026-05-04-baudit-check5-retired-faap007-revised.md` |
| 2026-05-03 | audit-readiness-completion-night | Migration 3 (audit views v2); runbook v1→v2→v2.1 across 2 ChatGPT external audits; F-HISTORIC-DEAD-CLEANUP retired; T-MCP-11/12 lessons. | `docs/runtime/sessions/2026-05-03-audit-readiness-completion-night.md` |
| 2026-05-03 | pipeline-relief-apply-night | Migration 1+2 applied; 16 dead rows swept; audit schema + 2 views; cap lift deferred. | `docs/runtime/sessions/2026-05-03-pipeline-relief-apply-night.md` |
| 2026-05-03 | pipeline-investigation-night | End-to-end investigation; 4 stalled streams; 3 structural issues identified. | `docs/runtime/sessions/2026-05-03-pipeline-investigation-night.md` |
| 2026-05-03 | tmcp05-batch-closure | T-MCP-05 closed; post-apply ACL gap surfaced via break-glass. | `docs/runtime/sessions/2026-05-03-tmcp05-batch-closure.md` |
| 2026-05-03 | faap001-002-apply | Stance retired + F-AAP-001 + F-AAP-002 applied + B-AUDIT-V4-PEERS clean; T05 returns P1-urgent. | `docs/runtime/sessions/2026-05-03-faap001-002-apply.md` |
| 2026-05-03 | faap001-rootcause | F-PUB-005 V3-V5 PASS + F-AAP-001 P1 root cause confirmed. | `docs/runtime/sessions/2026-05-03-faap001-rootcause.md` |
| 2026-05-03 | r01-calibration | R01 Data Auditor calibration v2 — 7 decisions + 3 lesson promotions. | `docs/runtime/sessions/2026-05-03-r01-calibration.md` |
| 2026-05-03 | t02-ratification | T02 Gate B body-health exit RATIFIED. | `docs/runtime/sessions/2026-05-03-t02-ratification.md` |
| 2026-05-03 | fpub005-apply | F-PUB-005 + F-PUB-010 patch APPLIED. | `docs/runtime/sessions/2026-05-03-fpub005-apply.md` |

**Pre-2026-05-03 history**: frozen at `docs/runtime/archive/sync_state-pre-2026-05-03.md`.

---

## 🟢 Most recent session — inline summary

### 2026-05-05 Sydney evening — F-YT-OAUTH-PP RESTORED for Property Pulse

~1h chat. Full detail: `docs/runtime/sessions/2026-05-05-ice-yt-oauth-restoration.md`.

**Outcome:** Property Pulse YouTube has been dark since 2026-04-01 due to OAuth `invalid_grant` on the stored refresh_token. PK reconnected via `dashboard.invegent.com/connect` (superseded the staged Template 1 SQL). Verification of `c.client_channel.config.refresh_token` confirmed both PP and NY tokens refreshed at 09:02 / 09:03 UTC, both 103-char canonical length, both enabled. Template 2 SQL (UPDATE on `m.post_draft` flipping 4 specific UUIDs from `video_status='failed'` → `'generated'` + clearing `youtube_upload_error`/`youtube_upload_attempted` JSONB keys) was D-01 cleared first-fire (review_id `91caf322-213d-4994-b781-abb54acc70b9`) and applied via Supabase MCP. 4 rows returned; idempotent guards held.

Both subsequent cron 34 firings published cleanly: `:15` UTC took 2 kinetic drafts (4f07da94 → `fD3_BmOegaY`, 2cc22fce → `FU6AwvULcAs`); `:45` UTC took 2 stat drafts (53b16d45 → `vRTXpKrf56k`, e59a561d → `1_YU6Yc_FfI`). All 4 `m.post_publish` rows created; `pp_status='published'`; no new `youtube_upload_error` written by publisher's catch handler. End-to-end pipeline confirmed: ai-worker v2.11.1 → video-worker v2.1.0 → Supabase Storage → youtube-publisher v1.6.0 → YouTube Data API → `m.post_publish`. First PP×YT pipeline-driven publishes in ~5 weeks.

**Behavioural-only investigation A (read-only)** during the holding window between cron firings produced `docs/briefs/2026-05-05-f-yt-ny-format-selection.md` (commit `ff5ae6ae`) — frames the secondary YT blocker (NY×YT 100% text-format) as platform-agnostic format-advisor-v1 logic that picks based on content shape rather than platform. PP and NY YouTube configs are identical; format distribution differs purely by content-mix (NDIS opinion vs property news with stats). 4 candidate fix shapes listed; no fix attempted. Resolution requires `RECONCILE-EF-DRIFT` to close first. Storage sanity check B confirmed both `_stat.mp4` files existed in `post-videos` bucket (150KB / 155KB, mimetype video/mp4, paths matched `video_url`).

**D-01 fires this session: 1.** Clean first-fire proceed on bounded `sql_destructive`. Reviewer: `verdict=agree`, `risk_level=medium`, `confidence=high`, no pushback. T-MCP-02 quota: 33 → 34. **Counter-pattern to Lesson #62 reinforced: 3-of-3 clean proceeds across recent sql_destructive D-01s (M5 original + M5 corrected v2.38 + Template 2 v2.39) when PK pre-approves + change is bounded + evidence empirically grounded + rollback explicit.**

**New finding logged:** `RECONCILE-EF-DRIFT` (P1) — repo missing source for ai-worker v2.11.1, heygen-worker v1.1.0, video-worker v2.1.0 (entire EF, no folder in repo); youtube-publisher v1.6.0 matches. Blocks ALL EF patching including the F-YT-NY-FORMAT-SELECTION fix. Resolution: PK runs `npx supabase functions download` × 4 locally and commits as sync-only commit.

**Standing rules honoured:** D-01 (1 fire, clean), Lesson #61 (P1 state-capture immediately before apply, T-MCP-14 implicitly observed), G1 (separate session-detail file), D170 (DML via execute_sql, not migration), D186 (closure ~1h, day total ~7h, trailing-14d ~26h above 8.0 floor). **No EF deploys.** **M6 untouched.** **Old D-01 review `a80cf579-...` (superseded F-YT avatar Step 1 plan) never cited as cleared.**

**New standing rule (from this session):** invegent-dashboard `/connect` and `/clients?tab=connect` is the canonical reconnect path for FB/IG/LI/YT OAuth tokens. OAuth Playground / Google Cloud Console is fallback only. (Memory edit landed.)

---

## 🟡 Next session priorities (carry-forward from action_list v2.39)

1. Personal businesses check-in
2. **RECONCILE-EF-DRIFT (P1, top priority next session)** — PK runs the four `npx supabase functions download` commands from `C:\Users\parve\Invegent-content-engine` (ai-worker, heygen-worker, video-worker, youtube-publisher) and commits as sync-only commit. Required precursor to F-YT-NY-FORMAT-SELECTION fix and any future EF code work.
3. **F-YT-NY-FORMAT-SELECTION (P1)** — sequenced after RECONCILE-EF-DRIFT. Read newly-synced ai-worker v2.11.1 source, locate `format-advisor-v1`, decide between the 4 candidate fix shapes documented in the brief.
4. **M6 Phase A — 108 historical Bug 3 dead-letter** — still ready (v2.36 brief reusable). Only if no live issue outranks RECONCILE-EF-DRIFT or NY×YT format-selection.
5. **T05 Meta dev support contact** (P1-urgent) — unchanged.
6. **3 stuck-item clusters from health check** (P1) — re-evaluate post-Tier 1 + M4 + M5 + F-YT-OAUTH-PP. The PP×YT cluster may now be cleared by today's fix; verify next session.
7. **F-AAP-NEEDS-REVIEW-BACKLOG** (P2) — 28 drafts in `needs_review`.
8. **F-PUB-009 7-day flow check** (P2) — combined with M4/M5/F-YT-OAUTH-PP forward-flow expectation.
9. **Dashboard Architecture Review §1** — when PK signals; ~1.5h estimated.

---

## ⛔ Carried-forward "do not touch" state

- NDIS-Yarns IG `publish_enabled=false` — do not flip until T05 decides recovery
- Cron jobid 53 `active=false` — do not re-enable until S16 + T05 + cron `?limit=1` update
- Cron jobid 11/64/65 (`seed-and-enqueue-{fb,ig,li}`) — paused per slot-driven v4
- Jobid 12 (`planner-hourly`) — still active despite v3 orphan production (B-CRON-V3-ORPHAN)
- **9 review_ids close-the-loop pending** (carry-over) — plus v2.38's `b3609bc4` + `713dc407`, plus v2.39's `91caf322` = 12 pending. Combine in next batch closure.
- **47 historic dead queue rows** retained as audit trail (Phase 1.7 design)
- **6 CFW LinkedIn slots + 1 CFW Facebook slot in `exceeded_recovery_attempts`** — quiescent
- 1 NDIS-FB dead queue row preserved per F-PUB-005 carry-forward
- 5 over-cap (client, platform) combos hold queue depth — by design, drains via publish rate
- NDIS-Yarns LinkedIn slot `8f9e5c57-...` orphan since 4-27 — do not touch
- Property Pulse Facebook 1 orphan slot (B-PP-FB-ORPHAN-PENDING-FILL P3)
- C2-CAND-001 — punted to Cycle 3
- **108 historical Bug 3 fingerprint queue rows** — intentionally retained as `queued`; M6 Phase A scope
- **queue_id `ad573844-c44a-4aa1-a43a-7f222e5b912e`** — dead-lettered with `dead_reason='m3_bug3_fallback_artifact_2026-05-05'`; do not re-queue
- **47 v4-origin queue rows still mismatch slot intent** — pre-M4 legacy artifacts; M6 Phase B address scope
- **160 records previously flagged is_shadow=true lost flag metadata** (v2.38 carry-forward) — acceptable, flag was inert; 37 had already published live regardless
- **NEW v2.39: 2 NY×YT avatar test drafts (a501aa6a, 80d8d2b7) from 2026-04-09 with expired HeyGen-hosted URLs (`?Expires=1776301302` ≈ 15 Apr 2026)** — latent, not actionable until heygen-worker column-vs-JSONB drift resolved post-source-sync; do not touch
- **NEW v2.39: `is_shadow: true` JSONB residue persists in `m.post_draft.draft_format.ai`** despite M5 column drop — legacy code path still writes JSONB key; investigate post-RECONCILE-EF-DRIFT; do not retroactively clean

---

## 📜 G1 convention (the rule)

**Each session writes its own file** at `docs/runtime/sessions/YYYY-MM-DD-{slug}.md`. At session end, chat updates this file ONLY by:

1. Inserting one row into the `📚 Session index` table at the top
2. Replacing the `🟢 Most recent session — inline summary` section with the new session's summary (demoting the prior summary into the index)
3. Optionally updating `🟡 Next session priorities` and `⛔ Carried-forward` blocks

**This file should never exceed ~10KB.** If it grows past that, archive the oldest inline summaries to a session file.

**Old monolithic file is frozen.** Pre-2026-05-03 → `docs/runtime/archive/sync_state-pre-2026-05-03.md`. Never modified again.

---

*Last updated: 2026-05-05 Sydney evening — F-YT-OAUTH-PP restored for Property Pulse (v2.39).*
