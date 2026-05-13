// reconciliation-matcher — cc-0010C Stage B
//
// Reads r.expected_publication rows in window (today_sydney - backfill_days .. today_sydney + horizon_days
// Sydney-local, status IN ('expected','backfilled')), looks up Tier-1 evidence in
// r.ice_publication_evidence (pipeline_state='published'), computes delta_minutes_late against
// r.matcher_config, and UPSERTs match rows into r.reconciliation_match with idempotency on
// expected_publication_id. Sequentially UPDATEs r.expected_publication.expected_status from
// 'expected'/'backfilled' to 'matched' for the rows just written.
//
// Brief: docs/briefs/cc-0010C-reconciliation-matcher.md @ v1 commit 8204ab540a0775034b927e8c86d4cb255e8ace26
// cc-0010A v1.5 r.* foundation applied 2026-05-12 via cc_0010a_r_evidence_matcher_schema_foundation (V1-V8 PASS)
// cc-0010B v1.3 EF v2 ACTIVE post-F4-hotfix (commit 62f319c8554b25ee06cf680bc548cf87f24521ba)
//
// Auth: x-cron-secret header compared against Deno.env.get('CRON_SECRET').
// JWT verification disabled at gateway (verify_jwt = false in supabase/config.toml).
//
// Pipeline placement: invoked by pg_cron via net.http_post (Stage D, future) at
// `15-59/30 * * * *` UTC — offset 15 min after cc-0010B materialiser cron job 83 at `*/30`,
// so each cycle is materialiser at :00 -> matcher at :15 -> materialiser at :30 -> matcher at :45.
// Manual invocation supported for Stage E first fire.
//
// Tier-1 scope lock (brief §1.2 + §5.2):
//   - matched_evidence_kind hardcoded to 'ice' (lib/matcher.ts MatchInsertRow / MatchUpdateRow).
//   - matched_match_tier hardcoded to 1.
//   - matched_confidence hardcoded to 1.000.
//   - Zero references to r.platform_observation or r.platform_manual_observation in this EF.
//   - Zero status transitions to 'late' (deferred per brief §1.2 + §13 #3).
//
// D-21 hard lock (brief §5.2 step 5–6):
//   - fetchExistingMatchRows pre-reads r.reconciliation_match to surface override_by status.
//   - planMatcherPass filters override-protected rows out of both insert + update payloads.
//   - PostgREST does not support WHERE on the UPDATE side of upsert natively; pre-filter
//     pattern achieves identical observable behaviour to the brief's literal SQL.
//
// R2 run-id stamping (brief §5.2 step 6 + V12 + V14):
//   - INSERT path: matcher_run_id + created_by_run_id + updated_by_run_id all = current run_id.
//   - UPDATE path: matcher_run_id + updated_by_run_id = current run_id; created_by_run_id
//     PRESERVED via payload omission (homogeneous-shape split per cc-0010B v1.1 precedent).
//
// L53 FK source-column-type protections:
//   - All UUIDs flowing into r.reconciliation_match originate from PG-returned uuid columns.
//   - lib/matcher.ts assertUuid() fail-fast at row-construction time.
//   - No body-supplied UUIDs accepted (horizon_days, backfill_days are numbers; run_mode,
//     triggered_by are strings; dry_run is boolean).

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import {
  badRequest,
  buildSupabaseClient,
  closeReconciliationRun,
  ensureCronSecret,
  fetchExistingMatchRows,
  fetchExpectedPublications,
  fetchIceEvidenceForExpected,
  fetchMatcherConfig,
  internalError,
  okJson,
  openReconciliationRun,
  updateExpectedToMatched,
  upsertMatchInserts,
  upsertMatchUpdates,
} from "./lib/db.ts";
import {
  buildLocalWindow,
  type ExistingMatchRow,
  type IceEvidenceRow,
  planMatcherPass,
  type RunMode,
} from "./lib/matcher.ts";

interface RequestBody {
  horizon_days?: number;
  backfill_days?: number;
  run_mode?: RunMode;
  triggered_by?: string;
  dry_run?: boolean;
}

interface ResponseSummary {
  reconciliation_run_id: string;
  rows_planned: number;
  rows_inserted: number;
  rows_updated: number;
  rows_skipped: number;
  rows_in_window: number;
  rows_transitioned: number;
  horizon: { start: string; end: string; today: string };
  duration_ms: number;
  summary: {
    tier_1_matched: number;
    skipped_no_evidence: number;
    skipped_evidence_not_published: number;
    skipped_late_beyond_tolerance: number;
    skipped_override_protected: number;
    skipped_other: number;
  };
}
serve(async (req: Request): Promise<Response> => {
  const startedAt = Date.now();

  if (req.method !== "POST") {
    return badRequest(`Method ${req.method} not allowed; POST required`);
  }

  const authError = ensureCronSecret(req);
  if (authError) return authError;

  let body: RequestBody = {};
  try {
    const text = await req.text();
    if (text.length > 0) body = JSON.parse(text) as RequestBody;
  } catch (e) {
    return badRequest(`Invalid JSON body: ${(e as Error).message}`);
  }

  const horizonDays = typeof body.horizon_days === "number" ? body.horizon_days : 7;
  const backfillDays = typeof body.backfill_days === "number" ? body.backfill_days : 0;
  const runMode: RunMode = body.run_mode ?? "manual";
  const dryRun = body.dry_run === true;
  if (!["manual", "scheduled", "backfill"].includes(runMode)) {
    return badRequest(`Invalid run_mode '${runMode}'; must be one of: manual, scheduled, backfill`);
  }
  if (horizonDays < 0 || horizonDays > 60) {
    return badRequest(`horizon_days out of range [0..60]: ${horizonDays}`);
  }
  if (backfillDays < 0 || backfillDays > 60) {
    return badRequest(`backfill_days out of range [0..60]: ${backfillDays}`);
  }
  const triggeredBy = body.triggered_by ?? `reconciliation-matcher-${runMode}`;

  let supabase;
  try {
    supabase = buildSupabaseClient();
  } catch (e) {
    return internalError(`Supabase client construction failed: ${(e as Error).message}`);
  }

  // Brief §5.3: run_type='matching' for all cc-0010C fires (matches parent brief §Scope row E).
  const runType = "matching";
  const triggerLabel = runMode === "scheduled"
    ? "scheduled"
    : runMode === "backfill"
    ? "backfill"
    : "manual";

  let runId: string;
  try {
    runId = await openReconciliationRun(supabase, {
      runType,
      trigger: triggerLabel,
      triggeredBy,
    });
  } catch (e) {
    return internalError(`Failed to open r.reconciliation_run: ${(e as Error).message}`);
  }

  let rowsInWindow = 0;
  let rowsInserted = 0;
  let rowsUpdated = 0;
  let rowsSkipped = 0;
  let rowsTransitioned = 0;
  let tier1Matched = 0;
  let skippedNoEvidence = 0;
  let skippedEvidenceNotPublished = 0;
  let skippedLateBeyondTolerance = 0;
  let skippedOverrideProtected = 0;
  let skippedOther = 0;
  let windowStartLocalDate = "";
  let windowEndLocalDate = "";
  let todayLocalDate = "";

  try {
    const localWindow = buildLocalWindow(horizonDays, backfillDays);
    windowStartLocalDate = localWindow.windowStartLocalDate;
    windowEndLocalDate = localWindow.windowEndLocalDate;
    todayLocalDate = localWindow.todayLocalDate;

    const expectedRows = await fetchExpectedPublications(
      supabase,
      windowStartLocalDate,
      windowEndLocalDate,
    );
    rowsInWindow = expectedRows.length;

    // Empty-pipeline envelope — PASS-with-empirical-observation per brief §10.1 + L43.
    if (expectedRows.length === 0) {
      await closeReconciliationRun(supabase, runId, {
        status: "succeeded",
        rowsProcessed: 0,
        rowsInserted: 0,
        rowsUpdated: 0,
        rowsSkipped: 0,
        summaryJson: {
          run_mode: runMode,
          dry_run: dryRun,
          horizon_start: windowStartLocalDate,
          horizon_end: windowEndLocalDate,
          today_local: todayLocalDate,
          horizon_days: horizonDays,
          backfill_days: backfillDays,
          rows_in_window: 0,
          note: "no_expected_publication_rows_in_window",
        },
      });
      return okJson({
        reconciliation_run_id: runId,
        rows_planned: 0,
        rows_inserted: 0,
        rows_updated: 0,
        rows_skipped: 0,
        rows_in_window: 0,
        rows_transitioned: 0,
        horizon: { start: windowStartLocalDate, end: windowEndLocalDate, today: todayLocalDate },
        duration_ms: Date.now() - startedAt,
        summary: {
          tier_1_matched: 0,
          skipped_no_evidence: 0,
          skipped_evidence_not_published: 0,
          skipped_late_beyond_tolerance: 0,
          skipped_override_protected: 0,
          skipped_other: 0,
        },
      } satisfies ResponseSummary);
    }

    const expectedIds = expectedRows.map((ep) => ep.expected_publication_id);

    // Fan-out fetches in parallel — independent of each other.
    const [evidenceRows, existingMatchRowsResult, configRows] = await Promise.all([
      fetchIceEvidenceForExpected(supabase, expectedIds),
      fetchExistingMatchRows(supabase, expectedIds),
      fetchMatcherConfig(supabase),
    ]);

    // Index evidence by expected_publication_id (cc-0010A UNIQUE constraint => 0 or 1 row per id).
    const evidenceByExpected = new Map<string, IceEvidenceRow[]>();
    for (const ev of evidenceRows) {
      const bucket = evidenceByExpected.get(ev.expected_publication_id) ?? [];
      bucket.push(ev);
      evidenceByExpected.set(ev.expected_publication_id, bucket);
    }

    // Index existing match rows for D-21 gate + insert/update split.
    const existingMatchByExpected = new Map<string, ExistingMatchRow>();
    for (const m of existingMatchRowsResult) {
      existingMatchByExpected.set(m.expected_publication_id, m);
    }

    // Surfacing per brief §13 #7: warn (but do not block) on any published evidence with null published_at.
    for (const ev of evidenceRows) {
      if (ev.pipeline_state === "published" && ev.published_at === null) {
        console.warn(
          `cc-0010C-warn: ice_publication_evidence_id=${ev.ice_publication_evidence_id} for expected_publication_id=${ev.expected_publication_id} has pipeline_state='published' but published_at IS NULL — delta_minutes_late will be NULL in match row (brief §13 #7).`,
        );
      }
    }

    const plan = planMatcherPass({
      expectedRows,
      evidenceByExpected,
      existingMatchByExpected,
      configRows,
      runId,
    });

    skippedNoEvidence = plan.skipped.skipped_no_evidence;
    skippedEvidenceNotPublished = plan.skipped.skipped_evidence_not_published;
    skippedLateBeyondTolerance = plan.skipped.skipped_late_beyond_tolerance;
    skippedOverrideProtected = plan.skipped.skipped_override_protected;
    skippedOther = plan.skipped.skipped_other;
    rowsSkipped = skippedNoEvidence + skippedEvidenceNotPublished + skippedLateBeyondTolerance +
      skippedOverrideProtected + skippedOther;
    if (dryRun) {
      // Dry-run: do not write to r.reconciliation_match or r.expected_publication; report plan only.
      await closeReconciliationRun(supabase, runId, {
        status: "succeeded",
        rowsProcessed: rowsInWindow,
        rowsInserted: 0,
        rowsUpdated: 0,
        rowsSkipped: rowsSkipped,
        summaryJson: {
          run_mode: runMode,
          dry_run: true,
          horizon_start: windowStartLocalDate,
          horizon_end: windowEndLocalDate,
          today_local: todayLocalDate,
          horizon_days: horizonDays,
          backfill_days: backfillDays,
          rows_in_window: rowsInWindow,
          evidence_rows_fetched: evidenceRows.length,
          existing_match_rows_fetched: existingMatchRowsResult.length,
          plan_inserts: plan.inserts.length,
          plan_updates: plan.updates.length,
          skipped: plan.skipped,
          note: "dry_run — no writes to r.reconciliation_match or r.expected_publication",
        },
      });
      return okJson({
        reconciliation_run_id: runId,
        rows_planned: rowsInWindow,
        rows_inserted: 0,
        rows_updated: 0,
        rows_skipped: rowsSkipped,
        rows_in_window: rowsInWindow,
        rows_transitioned: 0,
        horizon: { start: windowStartLocalDate, end: windowEndLocalDate, today: todayLocalDate },
        duration_ms: Date.now() - startedAt,
        summary: {
          tier_1_matched: plan.inserts.length + plan.updates.length,
          skipped_no_evidence: skippedNoEvidence,
          skipped_evidence_not_published: skippedEvidenceNotPublished,
          skipped_late_beyond_tolerance: skippedLateBeyondTolerance,
          skipped_override_protected: skippedOverrideProtected,
          skipped_other: skippedOther,
        },
      } satisfies ResponseSummary);
    }

    // R2 v1.1: two homogeneous-shape UPSERT calls so PostgREST does not blanket-include
    // created_by_run_id in the UPDATE side of `ON CONFLICT DO UPDATE`.
    const insertedResult = await upsertMatchInserts(supabase, plan.inserts);
    const updatedResult = await upsertMatchUpdates(supabase, plan.updates);
    rowsInserted = insertedResult.rows.length;
    rowsUpdated = updatedResult.rows.length;
    tier1Matched = rowsInserted + rowsUpdated;

    // Brief §5.2 step 7: sequenced AFTER the matcher upsert so that at the moment
    // expected_status flips to 'matched', matched_match_id is non-null. CHECK
    // expected_status_match_pair is satisfied throughout. Per-row UPDATE (PostgREST
    // does not natively support batch UPDATE with per-row values; v1 scale is small).
    const transitionMappings = [
      ...insertedResult.rows.map((r) => ({
        expected_publication_id: r.expected_publication_id,
        reconciliation_match_id: r.reconciliation_match_id,
      })),
      ...updatedResult.rows.map((r) => ({
        expected_publication_id: r.expected_publication_id,
        reconciliation_match_id: r.reconciliation_match_id,
      })),
    ];
    const transitionResult = await updateExpectedToMatched(supabase, transitionMappings);
    rowsTransitioned = transitionResult.rows_transitioned;

    // Sanity assertion per brief §10.2.p HALT code:
    //   If a matcher upsert returned a reconciliation_match_id but the corresponding
    //   r.expected_publication row did NOT transition (returned 0 from UPDATE), the
    //   status-transition consistency fault has been hit. Surface as run.status='partial'
    //   so V13 check_pair_violations = 0 still holds but the operator can investigate.
    let runStatus: "succeeded" | "partial" = "succeeded";
    let runNote: string | undefined;
    if (transitionMappings.length > 0 && rowsTransitioned < transitionMappings.length) {
      runStatus = "partial";
      runNote =
        `status_transition_drift: upserted ${transitionMappings.length} match rows but only ${rowsTransitioned} r.expected_publication rows transitioned to 'matched' (brief §10.2.p HALT code). Surface for chat review.`;
      console.warn(`cc-0010C-warn: ${runNote}`);
    }

    await closeReconciliationRun(supabase, runId, {
      status: runStatus,
      rowsProcessed: rowsInWindow,
      rowsInserted,
      rowsUpdated,
      rowsSkipped,
      summaryJson: {
        run_mode: runMode,
        dry_run: false,
        horizon_start: windowStartLocalDate,
        horizon_end: windowEndLocalDate,
        today_local: todayLocalDate,
        horizon_days: horizonDays,
        backfill_days: backfillDays,
        rows_in_window: rowsInWindow,
        evidence_rows_fetched: evidenceRows.length,
        existing_match_rows_fetched: existingMatchRowsResult.length,
        matcher_config_rows_fetched: configRows.length,
        tier_1_matched: tier1Matched,
        rows_transitioned: rowsTransitioned,
        skipped: plan.skipped,
        ...(runNote ? { note: runNote } : {}),
      },
    });

    return okJson({
      reconciliation_run_id: runId,
      rows_planned: rowsInWindow,
      rows_inserted: rowsInserted,
      rows_updated: rowsUpdated,
      rows_skipped: rowsSkipped,
      rows_in_window: rowsInWindow,
      rows_transitioned: rowsTransitioned,
      horizon: { start: windowStartLocalDate, end: windowEndLocalDate, today: todayLocalDate },
      duration_ms: Date.now() - startedAt,
      summary: {
        tier_1_matched: tier1Matched,
        skipped_no_evidence: skippedNoEvidence,
        skipped_evidence_not_published: skippedEvidenceNotPublished,
        skipped_late_beyond_tolerance: skippedLateBeyondTolerance,
        skipped_override_protected: skippedOverrideProtected,
        skipped_other: skippedOther,
      },
    } satisfies ResponseSummary);
  } catch (e) {
    const errMsg = (e as Error).message ?? String(e);
    try {
      await closeReconciliationRun(supabase, runId, {
        status: "failed",
        rowsProcessed: rowsInWindow,
        rowsInserted,
        rowsUpdated,
        rowsSkipped,
        errorSummary: errMsg,
        summaryJson: {
          run_mode: runMode,
          dry_run: dryRun,
          horizon_start: windowStartLocalDate,
          horizon_end: windowEndLocalDate,
          today_local: todayLocalDate,
          horizon_days: horizonDays,
          backfill_days: backfillDays,
          error: errMsg,
        },
      });
    } catch (closeErr) {
      console.error("Failed to close reconciliation_run after matcher error:", closeErr);
    }
    return internalError(`Matcher failed: ${errMsg}`);
  }
});