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
| 2026-05-08 | v2.52-insights-sync-rpc-closure | **Productive close (v2.52).** 3 findings closed in single session. Commit `57daf877`: insights-worker forward-sync (deployed v14.0.0 → repo, byte-equivalent, byte-for-byte verified post-D-01 escalation). Commit `7555b98a`: combined RPC migration orphan closure (F-HEYGEN-RPC-MIGRATIONS-MISSING + F-INSIGHTS-RPC-MIGRATIONS-MISSING) — 5 heygen SECURITY DEFINER RPCs + 1 insights RPC + 1 table + 1 column + 1 btree index + 2 FK guards, all idempotent CREATE OR REPLACE / IF NOT EXISTS / DO-block-guarded patterns. 2 D-01 fires (T-MCP-02 47 → 49); fire #1 partial→empirical resolution (Lesson #62 v2.50 testable-corrected-action path), fire #2 clean agree. **0 state-capture exceptions.** 0 production mutations chat-side. STANDING_THREE unchanged. ~6 P0+P1 open → ~5 of 20 cap. F-INSIGHTS logged + closed same session. | `docs/runtime/sessions/2026-05-08-v2.52-insights-sync-rpc-closure.md` |
| 2026-05-08 | personal-finance-cowork-inbox-brief | **Lightweight close (v2.51).** Personal finance interlude: PK Crazy Domains $521/3yr renewal quote analysed; identified $251/yr Website Builder auto-renewal bleed (Nov 25 free trial → Feb 26 auto-convert) + $26/yr Premium DNS + $18/yr Domain Guard ×2 fluff. PK called CD; ≥1 refund verbally in progress. Total annual saving once cleaned up: ~A$286. NEW Cowork brief drafted: `morning-inbox-sweep-v1` (daily 06:00 AEST personal-email triage; Tier 0 read-only Gmail; URGENT/FYI/NOISE classifier; calibration anchor=Crazy Domains discovery; money-out flags every match regardless of amount). Brief committed status=draft per PK hold-pending-amendment. Logged P3 in Active. NEW Personal businesses entry: CD refund + clean-up follow-up. No D-01 fire (doc-only bump). 0 production mutations chat-side. Today/Next 5 unchanged from v2.50. | `docs/runtime/sessions/2026-05-08-personal-finance-cowork-inbox-brief.md` |
| 2026-05-07 | p1-sd-triage-sync | **P1 SECURITY-DEFINER triage CLOSED (v2.50).** All 3 standing-three EFs now repo-aligned to deployed source via sync-only commits. | `docs/runtime/sessions/2026-05-07-p1-sd-triage-sync.md` |
| 2026-05-07 | stage3-safe-deploy | **Stage 3 SHIPPED + VERIFIED (v2.49).** `scripts/safe-deploy.sh` live. | `docs/runtime/sessions/2026-05-07-stage3-safe-deploy.md` |
| 2026-05-07 | stage2b-shipped-accepted | **Stage 2b SHIPPED + ACCEPTED on desktop (v2.48).** | `docs/runtime/sessions/2026-05-07-stage2b-shipped-accepted.md` |
| 2026-05-07 | s30-pass-stage2b-kickoff | **S30 PASS + Stage 2b kickoff (v2.47).** | `docs/runtime/sessions/2026-05-07-s30-pass-stage2b-kickoff.md` |
| 2026-05-07 | dashboard-architecture-review-completion | **Dashboard Architecture Review COMPLETE.** | `docs/runtime/sessions/2026-05-07-dashboard-architecture-review-completion.md` |
| 2026-05-07 | s30-paused-stuck-cluster-recheck | Lightweight checkpoint. | `docs/runtime/sessions/2026-05-07-s30-paused-stuck-cluster-recheck.md` |
| 2026-05-07 | stage2a-cron-applied | F-EF-DRIFT-PREVENTION Stage 2a fully CLOSED. | `docs/runtime/sessions/2026-05-07-stage2a-cron-applied.md` |
| 2026-05-07 | bef6be96-investigation-resolved | bef6be96 origin RESOLVED. | `docs/runtime/sessions/2026-05-07-bef6be96-investigation-resolved.md` |
| 2026-05-06 | f-ef-drift-prevention-stage2a-checkpoint | Stage 2a CHECKPOINT. | `docs/runtime/sessions/2026-05-06-f-ef-drift-prevention-stage2a-checkpoint.md` |
| 2026-05-06 | f-ef-drift-prevention-stage1-applied | Stage 1 APPLIED. | `docs/runtime/sessions/2026-05-06-f-ef-drift-prevention-stage1-applied.md` |
| 2026-05-05 | f-ef-drift-prevention-locked | Tier 2 inventory LOCKED. | `docs/runtime/sessions/2026-05-05-f-ef-drift-prevention-locked.md` |
| 2026-05-05 | ice-yt-oauth-restoration | F-YT-OAUTH-PP RESTORED. | `docs/runtime/sessions/2026-05-05-ice-yt-oauth-restoration.md` |
| 2026-05-05 | m5-applied-corrected-cascade-fix | M5 APPLIED. 7/7 PASS. | `docs/runtime/sessions/2026-05-05-m5-applied-corrected-cascade-fix.md` |
| 2026-05-05 | m4-applied-state-capture-override | M4 APPLIED. 8/8 PASS. | `docs/runtime/sessions/2026-05-05-m4-applied-state-capture-override.md` |
| 2026-05-05 | tier-1-queue-integrity-applied | M1+M2+M3 applied. 8/8 PASS. | `docs/runtime/sessions/2026-05-05-tier-1-queue-integrity-applied.md` |
| 2026-05-04 | dashboard-architecture-review-kickoff | Dashboard review kickoff. | `docs/runtime/sessions/2026-05-04-dashboard-architecture-review-kickoff.md` |
| 2026-05-04 | laptop-three-applies | ai-worker v2.11.1; F-AAP-007 v2; F-PUB-009. | `docs/runtime/sessions/2026-05-04-laptop-three-applies.md` |
| 2026-05-04 | baudit-check5-retired-faap007-revised | B-AUDIT-CHECK5-DRIFT retired. | `docs/runtime/sessions/2026-05-04-baudit-check5-retired-faap007-revised.md` |
| 2026-05-03 | audit-readiness-completion-night | Migration 3 + runbook v2.1. | `docs/runtime/sessions/2026-05-03-audit-readiness-completion-night.md` |
| 2026-05-03 | pipeline-relief-apply-night | Migration 1+2 applied. | `docs/runtime/sessions/2026-05-03-pipeline-relief-apply-night.md` |
| 2026-05-03 | pipeline-investigation-night | End-to-end investigation. | `docs/runtime/sessions/2026-05-03-pipeline-investigation-night.md` |
| 2026-05-03 | tmcp05-batch-closure | T-MCP-05 closed. | `docs/runtime/sessions/2026-05-03-tmcp05-batch-closure.md` |
| 2026-05-03 | faap001-002-apply | F-AAP-001 + F-AAP-002 + B-AUDIT-V4-PEERS clean. | `docs/runtime/sessions/2026-05-03-faap001-002-apply.md` |

**Pre-2026-05-03 history**: frozen at `docs/runtime/archive/sync_state-pre-2026-05-03.md`.

---

## 🟢 Most recent session — inline summary

### 2026-05-08 Sydney — insights forward-sync + combined RPC migration orphan closure (v2.52)

**Outcome:** 3 findings closed across 2 commits. ICE chat-side: 0 production mutations, 2 D-01 fires (cumulative T-MCP-02 47 → 49), 0 SQL DDL/DML applied, 0 EF deploys, 0 cron changes. STANDING_THREE array unchanged. Hold-state respected throughout.

**Commit 1 — insights-worker forward-sync:** `57daf877c4db46540abde8396a71c1284616f0a4` at 2026-05-08T00:27:43Z. Single-file replace of `supabase/functions/insights-worker/index.ts` from repo v1.6.0 (`d4bfcd09…`, 9434 B) to deployed v14.0.0 (`41b29a63…`, 13476 B). Byte-equivalent to deployed source (Supabase EF id `160320ac-…`, internal version 56, ezbr_sha256 `83055cdc…`).

D-01 fire #1 returned `partial / escalate=true` with two pushback points (byte-for-byte hash unverified; RPC dependencies unchecked). Both corrected_actions were testable; per Lesson #62 v2.50 refinement, empirical verification path used — re-fetched deployed source, diffed staged candidate (MD5 `370ff4a1…` identical, exit 0); read-only DB introspection confirmed 3 orphan dependencies for adjacent F-INSIGHTS finding. PK approved Path A (proceed) after empirical resolution. **No state-capture exception** — testable verification distinct from override.

Defects fixed by alignment to v14.0.0: invalid impressions metric path; missing `publish_enabled` filter; global vs per-client cap; missing direct `engaged_users`/`clicks`; missing `computeFormatPerformance()` 30/90 day rolling-window logic.

**Commit 2 — combined RPC migration orphan closure:** `7555b98ae4d3eccbfc70eb81688265d62556dc48` at 2026-05-08T00:45:30Z. Two-file commit closing **F-HEYGEN-RPC-MIGRATIONS-MISSING** (5 SECURITY DEFINER fns: `store_gen_poll_response`, `fail_avatar_generation`, `advance_avatar_to_creating`, `complete_avatar_training`, `save_avatar_generation` — 4 from poller v2.0.0 + 1 from creator v2.2.0 broadened in-session) and **F-INSIGHTS-RPC-MIGRATIONS-MISSING** (1 fn `upsert_format_performance` + 1 table `m.post_format_performance` + 1 column `m.post_draft.recommended_format` + 1 btree index `idx_format_perf_client` + 2 FK guards).

Files (both in `supabase/migrations/`):
- `20260508003500_f_heygen_rpc_migrations_missing.sql` (5487 B, blob `1e0229bf…`)
- `20260508003600_f_insights_rpc_migrations_missing.sql` (7307 B, blob `0f4098b1…`)

All function bodies sourced byte-equivalent from `pg_get_functiondef` output. All idempotent: CREATE OR REPLACE FUNCTION / CREATE TABLE IF NOT EXISTS / CREATE INDEX IF NOT EXISTS / ADD COLUMN IF NOT EXISTS / DO blocks with NOT EXISTS guards for FK adds. Self-grep confirmed no DROP / DELETE / TRUNCATE / REVOKE at file scope; UPDATE statements present only inside function body definition text. NO production DDL applied — files are CC-reference / fresh-DB-rebuild artifacts only.

D-01 fire #2 returned `decision=proceed`, `verdict=agree`, `risk_level=low`, `confidence=high`, no pushback. Clean approve.

**Acceptance-integrity adherence (v2.50 standing rule):** Both commits verified post-push by re-fetching from GitHub — closure 1 via `get_file_contents` confirming new blob SHA + matching VERSION header; closure 2+3 via `list_directory` confirming both new files with matching byte sizes (5487 / 7307) and expected blob SHAs.

**Closure budget:** ~1.5h chat. Day total v2.52: ~1.5h. Trailing-14-day ~54h above 8.0 floor. ~5 P0+P1 open of 20 cap (was ~6 v2.51). ✅ within budget.

**4-way sync close at this commit:**
- Session file: `docs/runtime/sessions/2026-05-08-v2.52-insights-sync-rpc-closure.md`
- Sync state (this file): refreshed v2.52
- Action list: v2.52 bump (3 closures, Today/Next 5 rebuilt, closure budget recalculated)
- Memory: entry #14 replaced with v2.52 summary folding v2.51 carry-forward bits

**Open from this session:**
- Dashboard roadmap PHASES — **8th** consecutive deferral (was 7th in v2.51)
- 21+ close-the-loop UPDATEs to `m.chatgpt_review` still pending; v2.52 adds 2 more (cumulative ~23+)
- Carry: Crazy Domains refund follow-up (Personal businesses, PK actions manually)
- Carry: morning-inbox-sweep-v1 brief amendment (P3, status=draft, awaiting PK)

---

## 🟡 Next session priorities (rebuilt v2.52 per PK directive)

1. **Dashboard Architecture Review Phase 0 prerequisites** (P1 TOP) — 7 confirm-defaults via `docs/briefs/cc-0001-dashboard-phase-0-defaults.md` + M5–M8 reconciliation. PK confirms defaults; chat applies.
2. **F-YT-NY-FORMAT-SELECTION** (P1) — Brief committed `ff5ae6ae`. Read v2.11.1 source post-build; locate `format-advisor-v1`; decide between 4 fix shapes.
3. **AI cost view P3** (quick win, ~1h) — Author `vw_ai_cost_monthly` view DDL on `m.ai_job` + add NOW dashboard tile.

Plus standing P0:
- **Personal businesses check-in** — Crazy Domains refund status (≥1 refund verbally in progress on 8 May call) + any new items from Care for Welfare / Property Buyers Agent / NDIS Accessories.

Carries (lower priority):
- **M6 Phase A** (P1 carry from v2.50) — 108 historical Bug 3 dead-letter; coordinate with M-09-03 view definition.
- **F-PUB-009 V3-V5 + 7-day flow** (P2) — passive monitoring continues.
- **F-AAP-NEEDS-REVIEW-BACKLOG** (P2) — closure target = architecture review Phase 2 B-09-14.
- **F-AI-WORKER-PARSER-SKIP-BUG V4** (P2) — passive monitoring; needs natural skip event OR synthetic test.
- **morning-inbox-sweep-v1 brief amendment** (P3) — PK reviews drafted brief; chat applies amendments + flips status=review_required.
- **Vault `service_role_key` naming hygiene** (P3) — read-only scope-check; rename if appropriate.
- **`docs/audit/health/2026-05-06.md` follow-up** (P3) — Cowork status investigation if still absent.
- **Dashboard mobile responsiveness** (P3) — dedicated session OR roll into architecture review Phase 1+ build.
- **21+ close-the-loop UPDATEs to `m.chatgpt_review`** — cumulative ~23+ pending after v2.52.
- **Dashboard roadmap PHASES reconciliation** (P3, **8th** consecutive deferral) — PHASES array stale since 3 May.
- **`00_overview.md` 11-section table reconciliation** (P3) — required by `11_final_consolidation.md` §11.1.
- **Invegent IG cap-throttle planning** (P3) — jobid 53 unblock readiness.
- **CFW post-ai-worker dead drafts** (P3) — investigate downstream pathway.
- **47 v4 mismatch queue rows / M6 Phase B** (P3) — sequenced after M6 Phase A.

---

## ⛔ Carried-forward "do not touch" state

Unchanged from v2.51. All 30+ items intact (NDIS-Yarns IG `publish_enabled=false`, cron 53/11/64/65 paused, jobid 12 planner-hourly, 21+ close-the-loop UPDATEs pending, 47 dead queue rows, 32 historical orphans, etc.).

**v2.52 update on standing items:**
- Cron-backed drift logging is LIVE (jobid 80 + 81 active=true). Last fire window 17:00 UTC 7 May = 03:00 AEST 8 May Sydney; verifiable next session if needed.
- Standing don't-redeploy three (`heygen-avatar-creator`, `heygen-avatar-poller`, `draft-notifier`) — list unchanged from v2.51. Mechanically encoded in `scripts/safe-deploy.sh` STANDING_THREE array.
- F-HEYGEN-RPC-MIGRATIONS-MISSING P2 — **CLOSED v2.52** (commit `7555b98a`).
- F-INSIGHTS-RPC-MIGRATIONS-MISSING P2 — **CLOSED v2.52** (commit `7555b98a`).
- Dashboard roadmap PHASES array stale since 3 May — **8th** consecutive deferral (was 7th in v2.51).
- AI cost view P3 — promoted to Top-3 next session priority by PK directive (was carry-forward).
- Crazy Domains clean-up — PK to action manually; chat tracks via Personal businesses entry, no chat-side action without PK direction.
- morning-inbox-sweep-v1 brief at `docs/briefs/morning-inbox-sweep-v1.md` status=draft — do not pick up in Cowork until PK amends and flips status.

---

## 📜 G1 convention (the rule)

**Each session writes its own file** at `docs/runtime/sessions/YYYY-MM-DD-{slug}.md`. At session end, chat updates this file ONLY by:

1. Inserting one row into the `📚 Session index` table at the top
2. Replacing the `🟢 Most recent session — inline summary` section with the new session's summary
3. Optionally updating `🟡 Next session priorities` and `⛔ Carried-forward` blocks

**This file should never exceed ~10KB.** If it grows past that, archive the oldest inline summaries to a session file.

**Old monolithic file is frozen.** Pre-2026-05-03 → `docs/runtime/archive/sync_state-pre-2026-05-03.md`. Never modified again.

---

*Last updated: 2026-05-08 Sydney — Productive close (v2.52). 3 findings closed in single session: insights-worker P1 functional drift (commit `57daf877`); F-HEYGEN-RPC-MIGRATIONS-MISSING + F-INSIGHTS-RPC-MIGRATIONS-MISSING (combined commit `7555b98a`). 2 D-01 fires (T-MCP-02 47 → 49); fire #1 partial→empirical resolution per Lesson #62 v2.50 refinement, fire #2 clean agree. **0 state-capture exceptions.** 0 production mutations chat-side. STANDING_THREE unchanged. Next session priorities rebuilt: Dashboard Phase 0 (P1) → F-YT-NY-FORMAT-SELECTION (P1) → AI cost view (P3 quick win).*
