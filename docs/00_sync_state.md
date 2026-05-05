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
| 2026-05-06 | f-ef-drift-prevention-stage1-applied | F-EF-DRIFT-PREVENTION **Stage 1 APPLIED** (backend foundation). Built `m.ef_drift_log` (19 cols + 5 CHECK constraints + 5 indexes), `m.vw_ef_drift_current` view (latest-per-slug + derived `first_seen_in_class` + `last_resolved_at`), `public.write_ef_drift_log(jsonb)` SECURITY DEFINER batch writer. **3 D-01 fires** (T-MCP-02 34 → 37): Fire 1 escalated on real first-run `state_changed` ambiguity (PK rejected Lesson #62 override → revise); Fire 2 cleared on revised v2 with `is_first_observation` boolean + NULL-tri-state `state_changed` + CHECK constraint enforcing consistency + hash-aware change detection per PK's "previous class/hash differs"; Fire 3 cleared on writer-fn ambiguity bug fix (`#variable_conflict use_column` directive). Live test verified all 4 semantic cases: first obs → NULL; no diff → false; class diff → true; hash diff within same class → true. Test rows cleaned. Stage 2a (drift-check EF + 90-day retention pg_cron) is top P1 next session. Stage 2b (dashboard panel) and Stage 3 (safe-deploy.sh) follow. P1 SECURITY-DEFINER triage remains deferred until drift-check infrastructure live. **`docs/audit/health/2026-05-06.md` absent** — Cowork 02:00 AEST cron didn't push; logged as follow-up, not derailing. | `docs/runtime/sessions/2026-05-06-f-ef-drift-prevention-stage1-applied.md` |
| 2026-05-05 | f-ef-drift-prevention-locked | F-EF-DRIFT-PREVENTION Tier 2 inventory LOCKED at 46/46 EFs (Batches 1-5). Final classification: 26 A + 5 B-RR + 1 B-FD + 7 C + 7 D + 2 repo-only. Mid-session taxonomy cleanup retired "reverse-drift" in favour of B-RR/B-FD. **Option F APPROVED by PK** as target prevention design (drift-check EF + m.ef_drift_log + CRLF-normalised body hashing + SECURITY DEFINER regression detector + dashboard drift panel + non-blocking safe-deploy.sh). ~4-5h build = separate session. 13 drift cases triaged into priority buckets. M6 Phase A + F-YT-NY-FORMAT-SELECTION remain blocked behind build close + P1 triage. D-PREV-13/14/15/16 added. 0 D-01 fires (read-only). Three commits: `bec80b73` Batch 4, `7bb588fa` taxonomy cleanup, `0abd8ca5` Batch 5 + lock; this session's commit marks brief APPROVED. | `docs/runtime/sessions/2026-05-05-f-ef-drift-prevention-locked.md` |
| 2026-05-05 | ice-yt-oauth-restoration | F-YT-OAUTH-PP RESTORED for Property Pulse. Dashboard reconnect at `dashboard.invegent.com/connect` superseded staged Template 1 SQL — refreshed both PP+NY YouTube tokens. Template 2 SQL (4-draft reset) D-01 cleared first-fire `91caf322`; applied via Supabase MCP. Both subsequent cron 34 firings published all 4 stuck PP×YT drafts cleanly. First PP×YT pipeline-driven publishes since 2026-04-01. | `docs/runtime/sessions/2026-05-05-ice-yt-oauth-restoration.md` |
| 2026-05-05 | m5-applied-corrected-cascade-fix | M5 (`p_shadow` / `is_shadow` removal) APPLIED via `m5_remove_p_shadow_corrected_v2` after first attempt failed at view-rewrite. Cascade fix added for `m.check_evergreen_threshold`. 7/7 post-apply verifications PASS. | `docs/runtime/sessions/2026-05-05-m5-applied-corrected-cascade-fix.md` |
| 2026-05-05 | m4-applied-state-capture-override | M4 (Defect 5: enqueue scheduled_for source + 147-row slot backfill) APPLIED via Lesson #62 state-capture override. 8/8 post-apply verifications PASS. | `docs/runtime/sessions/2026-05-05-m4-applied-state-capture-override.md` |
| 2026-05-05 | tier-1-queue-integrity-applied | Tier 1 queue integrity remediation applied: M1+M2+M3. All 8/8 post-apply checks pass. | `docs/runtime/sessions/2026-05-05-tier-1-queue-integrity-applied.md` |
| 2026-05-04 | dashboard-architecture-review-kickoff | ICE Dashboard Architecture Review formally kicked off. | `docs/runtime/sessions/2026-05-04-dashboard-architecture-review-kickoff.md` |
| 2026-05-04 | laptop-three-applies | ai-worker v2.11.1; F-AAP-007 v2; F-PUB-009. | `docs/runtime/sessions/2026-05-04-laptop-three-applies.md` |
| 2026-05-04 | baudit-check5-retired-faap007-revised | B-AUDIT-CHECK5-DRIFT retired; F-AAP-007 v1→v2; F-PUB-009 brief; F-AI-WORKER-PARSER-SKIP-BUG diagnosed. | `docs/runtime/sessions/2026-05-04-baudit-check5-retired-faap007-revised.md` |
| 2026-05-03 | audit-readiness-completion-night | Migration 3 + runbook v2.1; F-HISTORIC-DEAD-CLEANUP retired. | `docs/runtime/sessions/2026-05-03-audit-readiness-completion-night.md` |
| 2026-05-03 | pipeline-relief-apply-night | Migration 1+2 applied; 16 dead rows swept. | `docs/runtime/sessions/2026-05-03-pipeline-relief-apply-night.md` |
| 2026-05-03 | pipeline-investigation-night | End-to-end investigation; 4 stalled streams. | `docs/runtime/sessions/2026-05-03-pipeline-investigation-night.md` |
| 2026-05-03 | tmcp05-batch-closure | T-MCP-05 closed. | `docs/runtime/sessions/2026-05-03-tmcp05-batch-closure.md` |
| 2026-05-03 | faap001-002-apply | Stance retired + F-AAP-001 + F-AAP-002 + B-AUDIT-V4-PEERS clean. | `docs/runtime/sessions/2026-05-03-faap001-002-apply.md` |
| 2026-05-03 | faap001-rootcause | F-PUB-005 V3-V5 PASS + F-AAP-001 root cause. | `docs/runtime/sessions/2026-05-03-faap001-rootcause.md` |
| 2026-05-03 | r01-calibration | R01 Data Auditor calibration v2. | `docs/runtime/sessions/2026-05-03-r01-calibration.md` |
| 2026-05-03 | t02-ratification | T02 Gate B body-health exit RATIFIED. | `docs/runtime/sessions/2026-05-03-t02-ratification.md` |
| 2026-05-03 | fpub005-apply | F-PUB-005 + F-PUB-010 patch APPLIED. | `docs/runtime/sessions/2026-05-03-fpub005-apply.md` |

**Pre-2026-05-03 history**: frozen at `docs/runtime/archive/sync_state-pre-2026-05-03.md`.

---

## 🟢 Most recent session — inline summary

### 2026-05-06 Sydney morning — F-EF-DRIFT-PREVENTION Stage 1 APPLIED (backend foundation)

~2.5h chat. Full detail: `docs/runtime/sessions/2026-05-06-f-ef-drift-prevention-stage1-applied.md`.

**Outcome:** Stage 1 of Option F build complete. The drift-check EF, retention pg_cron, dashboard panel, and `safe-deploy.sh` remain in Stages 2a / 2b / 3 (separate sessions). PK directed Stage 1 only; scope strictly followed — no EF deploy, no other workstreams touched.

**Built:**
- `m.ef_drift_log` table — 19 columns, 5 CHECK constraints (class / direction / repo_path / severity / first_obs_consistency), 5 indexes (3 plain + 2 partial: SD-risk-only + state_changed=true-only).
- `m.vw_ef_drift_current` view — `DISTINCT ON (slug)` latest-per-slug + correlated subqueries for `first_seen_in_class` and `last_resolved_at`.
- `public.write_ef_drift_log(jsonb)` — SECURITY DEFINER batch writer; computes `is_first_observation` + `previous_class` + `state_changed` against most-recent prior row per slug; uses `IS DISTINCT FROM` for NULL-safe hash comparison; `#variable_conflict use_column` directive.
- GRANTs: `authenticated` SELECT on table + view; `service_role` only EXECUTE on writer fn.

**Schema design rationale (per PK direction post-first-D01-escalation):**
- Renamed `class` → `current_class` for symmetry with `previous_class`.
- Added `is_first_observation` boolean NOT NULL.
- `state_changed` is a NULL-tri-state: NULL on first observation (no baseline), false when no diff vs prior row, true when class OR deployed_hash_normalised OR repo_hash_normalised differ from prior row.
- CHECK constraint `ef_drift_log_first_obs_consistency` enforces the invariant: `is_first_observation=true` ⇔ (`previous_class IS NULL AND state_changed IS NULL`).
- Hash-aware change detection covers the case where class stays the same but body content changed.

**3 D-01 fires** (T-MCP-02 34 → 37):
1. Initial v1 packet — escalated on real ambiguity in first-run `state_changed` semantic. **PK explicitly rejected Lesson #62 state-capture override** (treating as type-(c) consistency-bias would have been wrong here). Directed revise.
2. Revised v2 packet — agreed, low/medium risk, no pushback. Applied via `Supabase:apply_migration`.
3. Bug-fix on writer fn ambiguity — Live test surfaced 42702 ambiguous-column error; `#variable_conflict use_column` directive + alias `prev_state` columns. Agreed, low risk, applied.

**Live test — 4 semantic cases proven exactly:**
- First observation → `is_first_observation=true, previous_class=NULL, state_changed=NULL` ✓
- No diff → `state_changed=false` ✓
- Class diff (A→C) → `state_changed=true` ✓
- Hash diff within same class (A→A but deploy_hash h1→h2) → `state_changed=true` ✓ (PK's hash-aware requirement confirmed)

Test rows DELETEd; table + view left clean (0 rows) for Stage 2a's first real run.

**Pre-flight P1-P5 (Lesson #61):** all green at session start. Schema clean for create. No exclusive locks. No existing references. `gen_random_uuid` and `k.vw_table_summary` available.

**Health check follow-up:** `docs/audit/health/2026-05-06.md` absent at session start. Cowork 02:00 AEST cron didn't push. PK direction: log as follow-up; not derailing. To investigate next session if not back online.

**Lesson #62 maturity update (candidate):** PK's first-D01 rejection refined the boundary — when ChatGPT MCP echoes Claude's self-disclosed weak evidence as objections, this does NOT automatically classify as type-(c) consistency-bias if the underlying ambiguity is real. Claude should propose revision first, not state-capture override, when the objection points at a design choice with multiple defensible answers. This session validates Lesson #62's boundary; remains a candidate for canonical promotion.

**Standing rules honoured:** D-01 (3 fires); D170 (chat applied via Supabase MCP, not CC); D186 (closure ~2.5h this session, trailing-14d ~30h above 8.0 floor); Lesson #61 pre-flight; G1 separate session-detail file; D-PREV-16 stage-gated build.

**No EF deploys.** **M6 untouched.** **No DML beyond test inserts (cleaned up).** **F-YT-NY-FORMAT-SELECTION still blocked.**

**What's blocked (unchanged from v2.40):** M6 Phase A and F-YT-NY-FORMAT-SELECTION remain blocked until F-EF-DRIFT-PREVENTION build phase completes (Stage 2a + 2b minimum) AND the 4 P1 triage cases are addressed.

---

## 🟡 Next session priorities (carry-forward from action_list v2.41)

1. **Personal businesses check-in** (P0) — ICE is bonus.
2. **F-EF-DRIFT-PREVENTION Stage 2a** (P1, top next session) — drift-check Edge Function + 90-day retention pg_cron. ~2.25h. Depends on Stage 1 backend (live as of 6 May).
3. **F-EF-DRIFT-PREVENTION Stage 2b** — dashboard drift panel. ~1-2h. Sequenced after 2a.
4. **F-EF-DRIFT-PREVENTION Stage 3** — `scripts/safe-deploy.sh`. ~30min.
5. **P1 SECURITY-DEFINER regression-risk triage** — sync repo → deployed for heygen-avatar-creator, heygen-avatar-poller, draft-notifier. Best done after drift-check infrastructure live so sync commits show up green in dashboard.
6. **insights-worker P1 functional drift** — manual review of deployed v14.0.0 source (D-PREV-07).
7. **F-YT-NY-FORMAT-SELECTION (P1)** — BLOCKED until F-EF-DRIFT-PREVENTION build close + P1 triage.
8. **M6 Phase A** (P1 — 108 historical Bug 3 dead-letter) — BLOCKED behind same gate.
9. **T05 Meta dev support contact** (P1-urgent) — unchanged.
10. **3 stuck-item clusters re-evaluation** (P1) — verify next session.
11. **F-AAP-NEEDS-REVIEW-BACKLOG** (P2) — 28 drafts.
12. **F-PUB-009 7-day flow check** (P2).
13. **Dashboard Architecture Review §1** — when PK signals; ~1.5h.
14. **Investigate `docs/audit/health/2026-05-06.md` absence** — only if cron still not back online.

---

## ⛔ Carried-forward "do not touch" state

- NDIS-Yarns IG `publish_enabled=false` — do not flip until T05 decides recovery
- Cron jobid 53 `active=false` — do not re-enable until S16 + T05 + cron `?limit=1` update
- Cron jobid 11/64/65 (`seed-and-enqueue-{fb,ig,li}`) — paused per slot-driven v4
- Jobid 12 (`planner-hourly`) — still active despite v3 orphan production (B-CRON-V3-ORPHAN)
- **12 review_ids close-the-loop pending** (carry-over) — 9 prior + v2.38's `b3609bc4` + `713dc407` + v2.39's `91caf322`. v2.40 and v2.41 added 0 (v2.40 read-only; v2.41 D-01 review_ids `10635f1d-...`, `d2415cc4-...`, plus the v2.41 v1 `2af1b03a-...` would all need close-the-loop UPDATEs in next batch closure). Combine in next batch closure.
- **47 historic dead queue rows** retained as audit trail (Phase 1.7 design)
- **6 CFW LinkedIn slots + 1 CFW Facebook slot in `exceeded_recovery_attempts`** — quiescent
- 1 NDIS-FB dead queue row preserved per F-PUB-005 carry-forward
- 5 over-cap (client, platform) combos hold queue depth — by design, drains via publish rate
- NDIS-Yarns LinkedIn slot `8f9e5c57-...` orphan since 4-27 — do not touch
- Property Pulse Facebook 1 orphan slot (B-PP-FB-ORPHAN-PENDING-FILL P3)
- C2-CAND-001 — punted to Cycle 3
- **108 historical Bug 3 fingerprint queue rows** — intentionally retained as `queued`; M6 Phase A scope (now blocked behind F-EF-DRIFT-PREVENTION build close + P1 triage)
- **queue_id `ad573844-...`** — dead-lettered; do not re-queue
- **47 v4-origin queue rows still mismatch slot intent** — M6 Phase B address scope
- **160 records previously flagged is_shadow=true lost flag metadata** — acceptable, flag was inert
- **2 NY×YT avatar test drafts** (a501aa6a, 80d8d2b7) from 2026-04-09 with expired HeyGen-hosted URLs — latent, not actionable until heygen-* drift resolved post-build
- **`is_shadow: true` JSONB residue persists in `m.post_draft.draft_format.ai`** — legacy code path; investigate post-drift-check infrastructure
- **13 drift cases active in priority buckets** (v2.40 inventory) — see `docs/00_action_list.md` for the triage table. Do not patch any until drift-check infrastructure is live and the 3 SECURITY-DEFINER cases are visibly green in the dashboard.
- **2 repo-only directories** (ai-diagnostic, linkedin-publisher) — do not deploy or remove without PK direction. linkedin-publisher is intentional forward-staging for B24/F06.
- **NEW v2.41: `docs/audit/health/2026-05-06.md` absent** — Cowork 02:00 AEST cron did not push 6 May. Logged as follow-up; investigate only if not back online by next session. Do not attempt manual re-run of Cowork without PK direction.
- **NEW v2.41: `m.ef_drift_log` empty by design until Stage 2a drift-check EF lands.** Table is live but unpopulated. View `m.vw_ef_drift_current` returns 0 rows. Both correct.

---

## 📜 G1 convention (the rule)

**Each session writes its own file** at `docs/runtime/sessions/YYYY-MM-DD-{slug}.md`. At session end, chat updates this file ONLY by:

1. Inserting one row into the `📚 Session index` table at the top
2. Replacing the `🟢 Most recent session — inline summary` section with the new session's summary
3. Optionally updating `🟡 Next session priorities` and `⛔ Carried-forward` blocks

**This file should never exceed ~10KB.** If it grows past that, archive the oldest inline summaries to a session file.

**Old monolithic file is frozen.** Pre-2026-05-03 → `docs/runtime/archive/sync_state-pre-2026-05-03.md`. Never modified again.

---

*Last updated: 2026-05-06 Sydney morning — F-EF-DRIFT-PREVENTION Stage 1 APPLIED (v2.41).*
