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
| 2026-05-07 | bef6be96-investigation-resolved | **bef6be96 origin investigation RESOLVED.** Read-only forensics traced the unexpected prior scan to the same `postgres` DB role + chat-authored SQL fingerprint as the v2.42 chat session itself. `pg_stat_statements` recovered the exact 03:24:06 UTC SQL block: "`-- Generate ONE scan_id, fire all 5 write chunks…`" + CTE structure + `vault.decrypted_secrets` MCP convention. Most likely cause: discarded first parallel-block write attempt that v2.42 chat re-did sequentially as a2124145 without recording the discard. PK decision: **keep both scans**, document, no row mutation. Both scans byte-identical per slug; `m.vw_ef_drift_current` correctly returns latest (a2124145); zero data corruption / zero production impact. Stage 2a UNBLOCKED — top P1 next is the cron migration (daily drift-check + 90-day retention). Lesson candidate #68 captured. ~30–40 min chat closure. | `docs/runtime/sessions/2026-05-07-bef6be96-investigation-resolved.md` |
| 2026-05-06 | f-ef-drift-prevention-stage2a-checkpoint | F-EF-DRIFT-PREVENTION Stage 2a CHECKPOINT — was BLOCKED on bef6be96 origin investigation; now CLOSED above. drift-check EF iterated v1.0.0 → v1.0.8 (final fix: F1 multipart/form-data parsing — Management API `/body` returns multipart, not raw text). Publisher correctly Class A; auto-approver Class C real 4-byte diff at byte 8790. Dry-run chunks 1–5 PASS all 6 PK criteria. Writer fn migrated to accept caller-supplied `p_run_id`. Manual chunked write `a2124145` succeeded 49 rows. T-MCP-02 37→40; T-MCP-08 1→2 (state-capture override on chunked-write per PK pre-auth). | `docs/runtime/sessions/2026-05-06-f-ef-drift-prevention-stage2a-checkpoint.md` |
| 2026-05-06 | f-ef-drift-prevention-stage1-applied | F-EF-DRIFT-PREVENTION **Stage 1 APPLIED** (backend foundation). `m.ef_drift_log` table + `m.vw_ef_drift_current` view + `public.write_ef_drift_log()` SECURITY DEFINER batch writer. 3 D-01 fires (T-MCP-02 34 → 37); Fire 1 escalated → revised; Fires 2/3 cleared. Live test verified all 4 semantic cases. | `docs/runtime/sessions/2026-05-06-f-ef-drift-prevention-stage1-applied.md` |
| 2026-05-05 | f-ef-drift-prevention-locked | F-EF-DRIFT-PREVENTION Tier 2 inventory LOCKED at 46/46 EFs. Option F APPROVED. 13 drift cases triaged. | `docs/runtime/sessions/2026-05-05-f-ef-drift-prevention-locked.md` |
| 2026-05-05 | ice-yt-oauth-restoration | F-YT-OAUTH-PP RESTORED for Property Pulse via dashboard `/connect`. | `docs/runtime/sessions/2026-05-05-ice-yt-oauth-restoration.md` |
| 2026-05-05 | m5-applied-corrected-cascade-fix | M5 (`p_shadow` / `is_shadow` removal) APPLIED. 7/7 verifications PASS. | `docs/runtime/sessions/2026-05-05-m5-applied-corrected-cascade-fix.md` |
| 2026-05-05 | m4-applied-state-capture-override | M4 (Defect 5: enqueue scheduled_for + 147-row backfill) APPLIED. 8/8 verifications PASS. | `docs/runtime/sessions/2026-05-05-m4-applied-state-capture-override.md` |
| 2026-05-05 | tier-1-queue-integrity-applied | M1+M2+M3 applied. 8/8 PASS. | `docs/runtime/sessions/2026-05-05-tier-1-queue-integrity-applied.md` |
| 2026-05-04 | dashboard-architecture-review-kickoff | Dashboard review kickoff. | `docs/runtime/sessions/2026-05-04-dashboard-architecture-review-kickoff.md` |
| 2026-05-04 | laptop-three-applies | ai-worker v2.11.1; F-AAP-007 v2; F-PUB-009. | `docs/runtime/sessions/2026-05-04-laptop-three-applies.md` |
| 2026-05-04 | baudit-check5-retired-faap007-revised | B-AUDIT-CHECK5-DRIFT retired; F-AAP-007 v1→v2; F-PUB-009 brief. | `docs/runtime/sessions/2026-05-04-baudit-check5-retired-faap007-revised.md` |
| 2026-05-03 | audit-readiness-completion-night | Migration 3 + runbook v2.1; F-HISTORIC-DEAD-CLEANUP retired. | `docs/runtime/sessions/2026-05-03-audit-readiness-completion-night.md` |
| 2026-05-03 | pipeline-relief-apply-night | Migration 1+2 applied; 16 dead rows swept. | `docs/runtime/sessions/2026-05-03-pipeline-relief-apply-night.md` |
| 2026-05-03 | pipeline-investigation-night | End-to-end investigation; 4 stalled streams. | `docs/runtime/sessions/2026-05-03-pipeline-investigation-night.md` |
| 2026-05-03 | tmcp05-batch-closure | T-MCP-05 closed. | `docs/runtime/sessions/2026-05-03-tmcp05-batch-closure.md` |
| 2026-05-03 | faap001-002-apply | F-AAP-001 + F-AAP-002 + B-AUDIT-V4-PEERS clean. | `docs/runtime/sessions/2026-05-03-faap001-002-apply.md` |
| 2026-05-03 | faap001-rootcause | F-PUB-005 V3-V5 PASS + F-AAP-001 root cause. | `docs/runtime/sessions/2026-05-03-faap001-rootcause.md` |
| 2026-05-03 | r01-calibration | R01 Data Auditor calibration v2. | `docs/runtime/sessions/2026-05-03-r01-calibration.md` |
| 2026-05-03 | t02-ratification | T02 Gate B body-health exit RATIFIED. | `docs/runtime/sessions/2026-05-03-t02-ratification.md` |
| 2026-05-03 | fpub005-apply | F-PUB-005 + F-PUB-010 patch APPLIED. | `docs/runtime/sessions/2026-05-03-fpub005-apply.md` |

**Pre-2026-05-03 history**: frozen at `docs/runtime/archive/sync_state-pre-2026-05-03.md`.

---

## 🟢 Most recent session — inline summary

### 2026-05-07 Sydney — bef6be96 Investigation Resolved (~30–40 min)

**Outcome:** F-EF-DRIFT-PREVENTION Stage 2a **UNBLOCKED**. PK directive: keep both scans, document, proceed to cron migration. No row mutations. No production impact.

**Investigation method (read-only):**
- `net._http_response` request IDs 96450–96490 — full timeline of drift-check and surrounding pipeline activity 03:20–03:40 UTC 6 May
- `pg_stat_statements` filtered to `postgres` role + time window 02:24–04:30 UTC 6 May — recovered exact SQL blocks for both writes
- `cron.job` — no matching entry (ruled out scheduled origin)
- `net.http_request_queue` — empty for relevant IDs (request side flushed)
- Past chats search — confirmed v2.42 chat content matches the a2124145 narrative only

**Smoking gun:** `pg_stat_statements` row at 03:24:06 UTC, `postgres` role:

> `-- Generate ONE scan_id, fire all 5 write chunks with that same scan_id`
> `-- Each chunk processes a disjoint slug slice so concurrent writes are race-free.`
> `WITH scan AS (SELECT gen_random_uuid() AS scan_id), url_base AS (...), posted AS (SELECT net.http_post(...) ×5)`

Fingerprint match with v2.42 chat session: same DB role, same MCP secret-resolution convention (`vault.decrypted_secrets`), chat-style English comments, CTE-block structure.

**Most likely cause (medium-high confidence):** Same v2.42 chat session, two write attempts. Chat fired the parallel-block write at 03:24:06 (= bef6be96), then ran additional verification dry-runs at 03:25–03:27, fired the formal D-01 review (`d53c9918`) → state-capture override per PK pre-auth → fired the sequential write at 03:30:30+ (= a2124145), and recorded only the second write in the session register. The bef6be96 attempt fell out of session memory.

**Lower-confidence alternative:** A separate concurrent Claude session. PK denied; no positive evidence.

**Ruled out:** pg_cron, Cowork shell, Studio manual, DB function/trigger, ChatGPT MCP, external actor.

**Production state:** unchanged from v2.42. `m.ef_drift_log` retains 98 rows; `m.vw_ef_drift_current` returns 49 latest-per-slug (= a2124145). a2124145's `state_changed=false` and populated `previous_class` correctly reflect bef6be96 prior state. Drift detection works correctly going forward.

**Lesson candidate #68 captured:** *All fired writes must be tracked inline; a discarded first attempt cannot fall out of session memory just because a later formally-authorised replay supersedes it.* Complements Lesson #62. Defer canonical promotion until one reuse.

**Closure budget:** +~30–40 min. Cumulative day total well within budget; trailing-14-day ~35.5h above 8h floor.

**Hard stops still in effect (per PK):**
- Do not start dashboard / safe-deploy / P1 triage / NY×YT / M6 yet.
- Cron migration may proceed per PK directive — design + D-01 review then apply.

**No D-01 fires this session** (read-only investigation). T-MCP-02 quota unchanged at 40.

---

## 🟡 Next session priorities (rebuilt for v2.43)

1. **Personal businesses check-in** (P0) — ICE is bonus.
2. **F-EF-DRIFT-PREVENTION Stage 2a finalisation — daily drift-check + 90-day retention pg_cron** (P1 TOP) — design + D-01 review + apply via Supabase MCP per D170. Sequential per-chunk fire pattern recommended (not parallel) given the bef6be96 lesson; or single-statement parallel with documented justification.
3. **F-EF-DRIFT-PREVENTION Stage 2b** — dashboard drift panel. Sequenced after #2.
4. **F-EF-DRIFT-PREVENTION Stage 3** — `scripts/safe-deploy.sh`. ~30 min.
5. **P1 SECURITY-DEFINER regression-risk triage** — `heygen-avatar-creator`, `heygen-avatar-poller`, `draft-notifier`. After Stage 2b live.
6. **insights-worker P1 functional drift** — manual review (D-PREV-07).
7. **F-YT-NY-FORMAT-SELECTION (P1)** — BLOCKED until F-EF-DRIFT-PREVENTION build close + P1 triage.
8. **M6 Phase A** (P1 — 108 historical Bug 3 dead-letter) — BLOCKED behind same gate.
9. **T05 Meta dev support contact** (P1-urgent) — unchanged.
10. **3 stuck-item clusters re-evaluation** (P1) — verify next session.
11. **F-AAP-NEEDS-REVIEW-BACKLOG** (P2) — 28 drafts.
12. **F-PUB-009 7-day flow check** (P2).
13. **Dashboard Architecture Review §1** — when PK signals; ~1.5h.
14. **`docs/audit/health/2026-05-06.md` follow-up** (P3) — investigate if still absent.
15. **15+ close-the-loop UPDATEs pending** to `m.chatgpt_review` — combine in next batch closure.

---

## ⛔ Carried-forward "do not touch" state

- NDIS-Yarns IG `publish_enabled=false` — do not flip until T05 decides recovery
- Cron jobid 53 `active=false` — do not re-enable until S16 + T05 + cron `?limit=1` update
- Cron jobid 11/64/65 (`seed-and-enqueue-{fb,ig,li}`) — paused per slot-driven v4
- Jobid 12 (`planner-hourly`) — still active despite v3 orphan production (B-CRON-V3-ORPHAN)
- 12+ review_ids close-the-loop pending (carry-over). Combine in next batch closure.
- 47 historic dead queue rows retained as audit trail (Phase 1.7 design)
- 6 CFW LinkedIn slots + 1 CFW Facebook slot in `exceeded_recovery_attempts` — quiescent
- 1 NDIS-FB dead queue row preserved per F-PUB-005 carry-forward
- 5 over-cap (client, platform) combos hold queue depth — by design
- NDIS-Yarns LinkedIn slot `8f9e5c57-…` orphan since 4-27 — do not touch
- Property Pulse Facebook 1 orphan slot (B-PP-FB-ORPHAN-PENDING-FILL P3)
- C2-CAND-001 — punted to Cycle 3
- 108 historical Bug 3 fingerprint queue rows — intentionally retained as `queued`; M6 Phase A scope (BLOCKED behind drift-check build close + P1 triage)
- queue_id `ad573844-…` — dead-lettered; do not re-queue
- 47 v4-origin queue rows still mismatch slot intent — M6 Phase B scope
- 160 records previously flagged is_shadow=true lost flag metadata — acceptable, flag was inert
- 2 NY×YT avatar test drafts (a501aa6a, 80d8d2b7) from 2026-04-09 with expired HeyGen-hosted URLs — latent
- `is_shadow: true` JSONB residue persists in `m.post_draft.draft_format.ai` — investigate post-drift-check infrastructure
- 13 drift cases active in priority buckets (v2.40 inventory) — see `docs/00_action_list.md` for the triage table. Do not patch any until drift-check infrastructure is live and the 3 SECURITY-DEFINER cases are visibly green in the dashboard.
- 2 repo-only directories (ai-diagnostic, linkedin-publisher) — do not deploy or remove without PK direction. linkedin-publisher is intentional forward-staging for B24/F06.
- `docs/audit/health/2026-05-06.md` absent — Cowork 02:00 AEST cron did not push 6 May. Logged as P3 follow-up. Investigate only if not back online by next session.
- **v2.43: `m.ef_drift_log` retains 98 rows.** Both scans intentionally preserved per PK keep-both decision. Per-slug content byte-identical. `m.vw_ef_drift_current` returns 49 latest-per-slug (a2124145). **Do not delete any rows.** Finding doc: `docs/audit/findings/2026-05-06-ef-drift-duplicate-scan-origin.md`.
- **v2.43: drift-check v1.0.8 deployed; cron NOT yet applied.** Manual triggers safe. Cron migration is top P1 next session.
- **v2.43: Standing don't-redeploy** for `heygen-avatar-creator`, `heygen-avatar-poller`, `draft-notifier` (P1 SECURITY-DEFINER regression-risk).

---

## 📜 G1 convention (the rule)

**Each session writes its own file** at `docs/runtime/sessions/YYYY-MM-DD-{slug}.md`. At session end, chat updates this file ONLY by:

1. Inserting one row into the `📚 Session index` table at the top
2. Replacing the `🟢 Most recent session — inline summary` section with the new session's summary
3. Optionally updating `🟡 Next session priorities` and `⛔ Carried-forward` blocks

**This file should never exceed ~10KB.** If it grows past that, archive the oldest inline summaries to a session file.

**Old monolithic file is frozen.** Pre-2026-05-03 → `docs/runtime/archive/sync_state-pre-2026-05-03.md`. Never modified again.

---

*Last updated: 2026-05-07 Sydney — bef6be96 origin investigation RESOLVED, Stage 2a UNBLOCKED (v2.43).*
