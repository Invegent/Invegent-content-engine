# Session — 2026-05-07 Sydney — Stage 2a Cron Applied (CLOSED)

**Slug:** stage2a-cron-applied
**Outcome:** F-EF-DRIFT-PREVENTION Stage 2a fully **CLOSED**. Daily drift-check + 90-day retention crons live in production. Dry-run smoke PASS. No row mutation. Pairs with `2026-05-07-bef6be96-investigation-resolved.md` as one continuous session arc.
**Closure:** ~25 min (pre-flight + design proposal + D-01 + apply + verify). Combined day ~9.5h.

## Sequence

1. **Pre-flight P1–P5** — all 5 checks PASS (no existing drift cron; columns + FK clean; postgres has `cron.schedule` privilege; vault secrets resolve; writer fn signature `(p_rows jsonb, p_run_id uuid)`)
2. **Design proposal to PK** — parallel single-statement orchestration with shared scan_id; 03:00 AEST daily fire + 03:15 AEST retention sweep; 90-day retention literal
3. **PK approval** — design approved with adjustment: do not manually fire another `write=true` scan post-apply unless something fails (avoid adding a third scan to `m.ef_drift_log`)
4. **D-01 review** — review ID `c261e338-5f4f-473f-900c-f5ad8d8711a9`, verdict agree, risk medium, confidence high, no pushback. T-MCP-02 quota 40 → 41.
5. **Migration applied** — `f_ef_drift_prevention_stage2a_cron_jobs` via Supabase MCP `apply_migration` per D170. `success: true`.
6. **Verifications PASS** (all 7 PK criteria):
   - V1: both cron jobs in `cron.job` (jobid 80 + 81, both `active=true`, owner `postgres`)
   - V2: schedules `0 17 * * *` and `15 17 * * *`
   - V3: drift-check command path = `/functions/v1/drift-check?write=true&limit=10`
   - V4: all 5 offsets (0/10/20/30/40) present + 5 references to `s.scan_id::text` (single CTE-generated UUID, shared across chunks)
   - V5: retention command = `DELETE FROM m.ef_drift_log WHERE checked_at < now() - interval '90 days'`
   - V6 (optional dry-run smoke): `?write=false&slug=publisher` — HTTP 200, `write_mode=false`, `wrote_rows=false`, `writer_inserted=0`, errors=[], slug_filter=publisher
   - V7: `m.ef_drift_log` row count = 98 (unchanged from session start — no mutation)

## Production state at session close

- **drift-check-daily-fire** (jobid 80) — fires daily at 17:00 UTC = 03:00 AEST. Generates one scan_id, fires 5 chunks parallel via single SQL block, each chunk processes a slug-disjoint slice (offsets 0/10/20/30/40, limit=10).
- **ef-drift-log-retention-90d** (jobid 81) — fires daily at 17:15 UTC = 03:15 AEST. DELETEs rows older than 90 days. First time this matters: 2026-08-04 (first row aged out).
- **First automated scan**: 2026-05-08 03:00 AEST. Will be a new `drift_check_run_id` with 49 rows, computing `state_changed=false` per slug against the a2124145 baseline. SD-risk count expected 3 (`draft-notifier`, `heygen-avatar-creator`, `heygen-avatar-poller`).
- **`m.ef_drift_log`**: 98 rows preserved (49 bef6be96 + 49 a2124145) per v2.43 keep-both decision.
- **`m.vw_ef_drift_current`**: returns 49 latest-per-slug (= a2124145).

## Standing rules honoured

- D-01 fired before apply (review ID `c261e338`); cleared cleanly
- D170: applied via Supabase MCP `apply_migration`, not `supabase db push`
- D186: closure budget +~25 min this session; combined ~70–80 min day total; trailing-14-day ~36h above 8.0 floor
- Lesson #61 P1–P5 pre-flight: all 5 PASS
- Lesson #68 (NEW v2.43): D-01 review fired BEFORE migration apply; review ID + outcome captured inline at moment of firing; no discarded actions
- G1: this file is the per-session detail; sync_state inline summary updated to v2.44; pointer index row added
- 4-way sync: docs (sync_state + action_list) updated; memory updated; finding doc remains the canonical chain-of-custody record. Dashboard roadmap NOT updated — drift-prevention is internal observability hygiene, not a public Phase milestone.

## D-01 close-the-loop pending

- `c261e338-5f4f-473f-900c-f5ad8d8711a9` — add to next batch closure UPDATEs to `m.chatgpt_review`. Carry total now 16+ pending.

## Next session priorities (rebuilt for v2.44)

1. Personal businesses check-in (P0)
2. **F-EF-DRIFT-PREVENTION Stage 2b** — dashboard drift panel. Now top P1.
3. F-EF-DRIFT-PREVENTION Stage 3 — `scripts/safe-deploy.sh` (~30 min)
4. P1 SECURITY-DEFINER triage (after Stage 2b live)
5. insights-worker P1 functional drift
6. F-YT-NY-FORMAT-SELECTION (BLOCKED behind 2b + triage)
7. M6 Phase A (BLOCKED behind same gate)
8. T05 Meta dev support contact (P1-urgent)

## Hard stops still in effect

- Do not start Stage 2b, Stage 3, P1 triage, NY×YT, M6 in THIS session (per PK)
- DO NOT REDEPLOY heygen-avatar-creator / heygen-avatar-poller / draft-notifier (P1 SECURITY-DEFINER regression-risk)
- Do not delete rows from `m.ef_drift_log` (98-row keep-both state preserved)
