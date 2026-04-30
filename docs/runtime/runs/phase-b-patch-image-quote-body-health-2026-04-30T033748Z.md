# Run State: phase-b-patch-image-quote-body-health-gate

Status: done
Risk tier: 2
Started: 2026-04-30T03:37:48Z
Finished: 2026-04-30T03:53:30Z (migration applied + four-step rollback test passed via Supabase MCP)

## Work completed

- Read brief in full at `docs/briefs/phase-b-patch-image-quote-body-health-gate.md`.
- Ran the four pre-flight queries verbatim from the brief:
  1. `pg_get_functiondef('m.fill_pending_slots(integer, boolean)'::regprocedure)` — captured ~12k-char definition verbatim.
  2. `SELECT proname, pg_get_function_identity_arguments(oid) FROM pg_proc WHERE proname = 'fill_pending_slots'` — exactly 1 row, args `p_max_slots integer, p_shadow boolean`. No overload ambiguity.
  3. `pg_get_viewdef('m.hot_breaking_pool'::regclass, true)` — captured view body verbatim.
  4. Dependents check via `pg_depend` joined to `pg_class`/`pg_namespace`, filtered to non-system schemas — empty result. Zero dependents on either object.
- Drafted `supabase/migrations/20260430033748_phase_b_patch_image_quote_body_health_gate.sql`:
  - `-- ROLLBACK SQL:` header comment containing the verbatim original `CREATE OR REPLACE FUNCTION m.fill_pending_slots(...)` and `CREATE OR REPLACE VIEW m.hot_breaking_pool AS ...` definitions captured during pre-flight, every line prefixed with `-- ` so the file is self-contained for rollback.
  - `BEGIN; ... COMMIT;` wrapper so the function and view replacement apply atomically.
  - Patched `CREATE OR REPLACE FUNCTION m.fill_pending_slots(integer, boolean)` — single edit relative to original: the body-health `EXISTS` clause from the brief appended to the WHERE block of (a) the `candidate_pool` CTE (after the two `NOT EXISTS` dedup clauses) and (b) the `relaxed_pool` CTE (after the one `NOT EXISTS` dedup clause). All other code byte-identical to captured definition.
  - Patched `CREATE OR REPLACE VIEW m.hot_breaking_pool` — single edit relative to original: the same `EXISTS` clause appended to the existing `WHERE`. Column list, joins, and `ORDER BY` byte-identical to the captured view body.
- Added brief row to `docs/briefs/queue.md` Active queue with status `review_required`.
- **Migration applied 2026-04-30T03:48:25Z** via Supabase MCP `apply_migration` (chat). `success: true`. Migration file contained an embedded `BEGIN; ... COMMIT;` wrapper that the chat session noted Path A handling on (chosen over a CC round-trip to strip): the wrapping transaction acceptance produced no surfaced warning. Both function and view replacements landed in the live schema as captured in the post-apply verification.
- **Post-apply verification (chat)**: per-object body-health clause count via raw text-replace counter on `pg_get_functiondef` / `pg_get_viewdef` — function = 2 (candidate_pool + relaxed_pool CTEs), view = 1. Exactly as designed.
- **Four-step rollback test executed end-to-end** (per brief Rollback plan §5):
  - Step 1 — Apply patch — 2026-04-30T03:48:25Z — function=2, view=1 ✅
  - Step 2 — Apply rollback (CREATE OR REPLACE from ROLLBACK SQL header) — 2026-04-30T03:50:23Z — function=0, view=0 ✅
  - Step 3 — Re-apply patch — 2026-04-30T03:52:04Z — function=2, view=1 ✅
  - Step 4 — Confirm patched definitions are final live state — 2026-04-30T03:52:50Z — function=2, view=1 ✅
- **Reproducibility verification**: filter applied to the 12 known canonicals across the 4 failed slots. Result: 3/3 PASS canonicals correctly retained, 9/9 EXCLUDE canonicals correctly excluded. 100% match to brief expectation.
- **Pool retention verification**: signal_pool active candidates after filter — Care For Welfare 132/381 (34.6%), NDIS-Yarns 132/381 (34.6%), Property Pulse 64/389 (16.5%), Invegent 13/155 (8.4%). All four exact match to brief expectation (zero drift in the ~16 minutes between brief authorship and apply). All four above `min_pool_size_for_format = 2`.
- Updated `docs/briefs/queue.md` — moved phase-b-patch-image-quote-body-health-gate from Active queue to Recently completed.

## Questions asked

- *(none — pre-flight was clean)*

## Answers received

- *(none — chat-side decision recorded: Path A acceptance of the embedded BEGIN/COMMIT wrapper rather than a CC round-trip to strip; risk analysis showed the wrapper would at most produce a NOTICE inside Supabase MCP's outer transaction. No NOTICE surfaced in practice.)*

## Corrections applied

- *(none)*

## Validation results

- **Pre-flight 1 (function captured):** `pg_get_functiondef` returned the function definition by exact regprocedure cast. Captured verbatim into the rollback header.
- **Pre-flight 1a (overload count):** 1 row returned. Safe to proceed (brief required STOP if >1).
- **Pre-flight 2 (view captured):** `pg_get_viewdef` returned the view body. Captured verbatim into the rollback header.
- **Pre-flight 3 (dependents):** 0 rows in non-system schemas. Rollback is clean.
- **Diff discipline:** the only character-level changes between captured original and patched output are the two new `AND EXISTS (...)` blocks plus a `-- Phase B patch — body-health gate` marker comment immediately above each. No other whitespace or semantic changes.
- **Apply-time verification (chat):** patched function = 2 body-health clauses, patched view = 1.
- **Rollback test:** all four state transitions executed cleanly; final live state is the patched definitions.
- **Reproducibility:** 12/12 canonicals classified as expected (3 PASS / 9 EXCLUDE).
- **Pool retention:** CFW/NDIS-Yarns/PP/Invegent all match brief expected counts exactly (132/132/64/13).

## Stop conditions

- *(none triggered)*

## Apply summary

- Migration `20260430033748_phase_b_patch_image_quote_body_health_gate` applied via Supabase MCP per D170 at 2026-04-30T03:48:25Z.
- Four-step rollback test passed; patched definitions confirmed as final live state at 2026-04-30T03:52:50Z.
- Reproducibility (9/3) and pool retention (132/132/64/13) match brief expectations exactly.
- `docs/briefs/queue.md` row moved to Recently completed.
- Run-state status closed to `done`.

## +24h observation checkpoint protocol (per brief)

The brief specified four observation queries to run at the +24h mark from the
deploy timestamp (2026-04-30T03:48:25Z → checkpoint due 2026-05-01T03:48:25Z,
~5pm AEST Sat 2 May (after the original Sat 2 May Gate B exit target)).

Replace `'<deploy_timestamp>'` in each query with `'2026-04-30 03:48:25.383415+00'`:

1. **No new `exceeded_recovery_attempts`** in the 24h after deploy:
   ```sql
   SELECT COUNT(*) FROM m.slot
   WHERE status='failed' AND skip_reason='exceeded_recovery_attempts'
     AND updated_at >= '2026-04-30 03:48:25.383415+00';
   -- Target: 0
   ```

2. **ai_job shadow failure rate stays under 5%** in the 24h after deploy:
   ```sql
   SELECT
     ROUND(100.0 * COUNT(*) FILTER (WHERE status IN ('failed','dead'))
           / NULLIF(COUNT(*),0), 2) AS fail_pct
   FROM m.ai_job
   WHERE created_at >= '2026-04-30 03:48:25.383415+00'
     AND is_shadow = true;
   -- Target: < 5%
   ```

3. **No new failures with `slot_fill_no_body_content`** error string:
   ```sql
   SELECT COUNT(*) FROM m.ai_job
   WHERE error LIKE 'slot_fill_no_body_content%'
     AND created_at >= '2026-04-30 03:48:25.383415+00';
   -- Target: 0
   ```

4. **`slot_fill_attempt.decision='filled'` rate stays comparable to pre-patch**:
   ```sql
   SELECT
     COUNT(*) FILTER (WHERE decision='filled') AS filled,
     COUNT(*) FILTER (WHERE skip_reason LIKE 'pool_thin%') AS pool_thin,
     COUNT(*) FILTER (WHERE skip_reason='no_eligible_evergreen') AS no_evergreen
   FROM m.slot_fill_attempt
   WHERE attempted_at >= '2026-04-30 03:48:25.383415+00';
   ```
   If `pool_thin` skip count rises sharply for Invegent or Property Pulse,
   that's the thin-pool signal getting louder, not a filter regression.

**Decision rule for Gate B exit (Sat 2 May)**: per brief, if the +24h
checkpoint is clean (zero new `exceeded_recovery_attempts`, shadow ai_job
fail rate <5%, no new `slot_fill_no_body_content` errors), Gate B continues
toward Sat 2 May exit on schedule. If the patch did not hold, fork to
extend Gate B 5–7 days OR temporarily disable image_quote at the
format-mix layer for Phase C.

## Follow-up candidates

- **Provider diversification on retry** — the same investigation that
  drove this patch flagged 6 of 6 ai_usage_log entries on the failed
  CFW slots showed `fallback_used=false` despite `error_call=true`.
  When Anthropic erred, recovery retried with the same provider rather
  than falling back to OpenAI. This is a separate worker-side patch
  (different code path from slot fill resolver) and was deliberately
  scoped out of this brief. Reconsider after the +24h obs window
  confirms the body-health filter held alone.
- **Stub-content classifier improvements** — `nds.org.au/news` and
  `ndis.gov.au/print/pdf/node/18` were classified `stat_heavy` despite
  being navigation chrome. Upstream classifier issue; the body-health
  filter handles the symptom. Improving classification is the structural
  fix.
- **Invegent thin-pool resolution (D174 follow-up)** — Invegent's
  pool retention dropped to 13 candidates (8.4%) under the filter,
  reflecting the pre-existing thin-pool issue captured in D174. 142
  Invegent canonicals had no successfully fetched body content and would
  never have produced usable image_quote output — the filter exposes
  the problem rather than creating it. Strategic question for PK.
- **27 Apr constraint race on `m.fill_pending_slots` upserts** — surfaced
  during alert acknowledgement at 2026-04-30T04:10Z. Cron `fill-pending-
  slots-every-10m` failed 6 consecutive runs between 02:20–03:10 UTC on
  27 Apr with `duplicate key value violates unique constraint
  "uq_post_draft_slot_id"`, plus a final 04:30 run failing on
  `ux_ai_job_unique`, before resolving on its own at 04:40. Function
  has `ON CONFLICT (slot_id) WHERE (slot_id IS NOT NULL) DO UPDATE`
  and `ON CONFLICT (post_draft_id, job_type) DO UPDATE` clauses, but
  these evidently did not handle whatever conflict pattern occurred on
  27 Apr. **3 days clean since 27 Apr 04:40 UTC** — race is not currently
  recurring under normal load. Investigate before Phase C cutover when
  production traffic shifts to slot-driven: are concurrent cron
  invocations possible (despite `FOR UPDATE SKIP LOCKED` in the slot
  cursor loop), or was the 27 Apr failure cluster purely a deploy-window
  artefact? Worth a focused query to enumerate every constraint
  violation on `m.post_draft` and `m.ai_job` since 1 Mar 2026 to confirm
  the 27 Apr cluster is genuinely isolated. Alerts acked with note
  `chat:pk:27apr-fill-slots-constraint-race-resolved`.
- **27 Apr cron infrastructure pause (~03:15–04:15 UTC)** — surfaced at
  the same time. Three crons (`try-urgent-breaking-fills-every-15m`,
  `recover-stuck-fill-in-progress-every-15m`, `pool-health-check-hourly`)
  all silent in lockstep for ~1h, last run 03:00 UTC, next run 04:30 UTC,
  cleanly resumed across all three simultaneously. Consistent with
  Phase B 10-12 deploy window in user memories ("53 migrations, 5 crons,
  ai-worker v2.11.0"). No production damage — these are recovery/health
  crons that catch up on next run. Logged for reference; no action
  required unless the pause pattern recurs during a future migration
  burst. Alerts acked with note
  `chat:pk:27apr-cron-infra-pause-phase-b-deploy`.

## Token usage (optional)

- *(not tracked)*

## Issues encountered

- Embedded `BEGIN; ... COMMIT;` wrapper in CC's draft (CC drafted before
  the chat-side precision-points reply landed). Chat analysed risk on
  apply: outer apply_migration transaction would absorb the inner BEGIN
  as a NOTICE no-op, the inner COMMIT could end the wrapping transaction
  early but with both DDL statements already applied. Path A acceptance
  chosen rather than CC round-trip. In practice the apply returned
  `success: true` with no surfaced warning. Patched function and view
  both confirmed live post-apply.

## Next step

Open: +24h observation checkpoint at 2026-05-01T03:48:25Z. PK or chat
runs the four observation queries above and folds the result into the
Gate B exit decision.
