/**
 * cc-0011 cadence-drift-checker — HTTP handler.
 *
 * Scope per brief §5.2 (v1.2) + PK Stage B directive overrides:
 *
 *  Body shape:
 *    { observation_window_days?: number,  // default 14
 *      mv_refresh_window_days?: number,   // default 30; informational only (MV definition is fixed)
 *      dry_run?: boolean,                 // default false
 *      run_mode?: 'manual'|'scheduled'|'backfill',  // default 'manual'
 *      triggered_by: string }             // required
 *
 *  Flow:
 *    1. Auth gate: ensureCronSecret on x-cron-secret header (HTTP 401 if absent/mismatched).
 *    2. Open r.reconciliation_run audit row with run_type='cadence_drift_check'.
 *    3. PK Stage B directive #6: refreshDriftViews() FIRST (before any reads from MVs).
 *    4. Fetch matcher_config, expected_publication window, evidence, matches, matrix rows,
 *       freshness rows, cadence rules.
 *    5. Per-row classification (late / missing).
 *    6. Aggregate classification (cadence_anomaly / observer_stale) — reads freshly-refreshed MVs.
 *    7. Build drift_log rows with R2 stamping + L53 assertUuid.
 *    8. PK Stage B directive #4: NO writes to r.expected_publication. drift_log INSERTs only.
 *    9. Close r.reconciliation_run with status='succeeded'/'partial'/'failed' + summary_json.
 *    10. Return HTTP 200 with response shape per brief §5.3.
 *
 *  L54: duration_ms computed at runtime here and returned in API response; r.reconciliation_run
 *    audit row carries started_at + finished_at only, not duration_ms. V-checks at Stage E must
 *    derive duration from the timestamp delta.
 */

import {
  buildDriftFindingsHistogram,
  buildDriftLogRowsForInsert,
  buildDriftSeverityHistogram,
  classifyAggregateAnomalies,
  classifyExpectedRow,
  classifyObserverStale,
  computeDriftWindow,
  resolveLateToleranceMinutes,
  type DriftFindingRowInsert,
  type EvidenceRow,
  type ExpectedPublicationRow,
  type MatchRow,
  type RunMode,
} from "./lib/drift.ts";
import {
  closeReconciliationRun,
  createServiceClient,
  ensureCronSecret,
  fetchCadenceRules,
  fetchEvidenceForExpectedIds,
  fetchExpectedPublicationWindow,
  fetchFreshnessRows,
  fetchMatcherConfig,
  fetchMatchesForExpectedIds,
  fetchMatrixRows,
  insertDriftLogBatch,
  openReconciliationRun,
  readEnv,
  refreshDriftViews,
} from "./lib/db.ts";

interface RequestBody {
  observation_window_days?: number;
  mv_refresh_window_days?: number;
  dry_run?: boolean;
  run_mode?: RunMode;
  triggered_by?: string;
}

Deno.serve(async (req: Request): Promise<Response> => {
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "method_not_allowed" }), {
      status: 405,
      headers: { "content-type": "application/json" },
    });
  }

  const env = readEnv();
  const authReject = ensureCronSecret(req, env);
  if (authReject) return authReject;

  // ---------- Body parsing ----------
  let body: RequestBody;
  try {
    body = (await req.json()) as RequestBody;
  } catch {
    return new Response(JSON.stringify({ error: "invalid_json_body" }), {
      status: 400,
      headers: { "content-type": "application/json" },
    });
  }

  const observationWindowDays = typeof body.observation_window_days === "number" && body.observation_window_days > 0
    ? Math.floor(body.observation_window_days)
    : 14;
  const dryRun = body.dry_run === true;
  const runMode: RunMode = body.run_mode ?? "manual";
  const triggeredBy = typeof body.triggered_by === "string" && body.triggered_by.length > 0
    ? body.triggered_by
    : "cc-0011-unspecified-trigger";

  const client = createServiceClient(env);
  const startedAtWallClock = Date.now();

  // ---------- Open run audit row ----------
  const { reconciliation_run_id: runId, started_at: startedAtIso } = await openReconciliationRun({
    client,
    trigger: runMode,
    triggered_by: triggeredBy,
  });

  // Surface for catch-block close path.
  let runStatus: "succeeded" | "failed" | "partial" = "succeeded";
  let errorSummary: string | null = null;
  let driftRowsInserted = 0;
  let rowsProcessed = 0;
  let mvRefreshTimestamps: { mv_reconciliation_daily_matrix_refreshed_at: string; mv_observer_freshness_summary_refreshed_at: string } = {
    mv_reconciliation_daily_matrix_refreshed_at: startedAtIso,
    mv_observer_freshness_summary_refreshed_at: startedAtIso,
  };
  const partialFailures: Record<string, number> = {};
  let driftRows: DriftFindingRowInsert[] = [];
  let driftFindingsHistogram = { late: 0, missing: 0, cadence_anomaly: 0, observer_stale: 0 };
  let driftSeverityHistogram = { info: 0, warn: 0, critical: 0 };
  let cadenceAnomalyCount = 0;
  let observerStaleCount = 0;

  try {
    // ---------- PK Stage B directive #6: MV refresh BEFORE drift evaluation ----------
    // The freshness summary + matrix view are inputs to the aggregate classifiers below.
    // Refreshing first ensures aggregate findings reflect current state, not last-week state.
    if (!dryRun) {
      const refresh = await refreshDriftViews(client);
      mvRefreshTimestamps = {
        mv_reconciliation_daily_matrix_refreshed_at: refresh.refreshed_at,
        mv_observer_freshness_summary_refreshed_at: refresh.refreshed_at,
      };
    }

    const nowUtc = new Date();
    const windowInfo = computeDriftWindow(nowUtc, observationWindowDays);

    // ---------- Fetch input data ----------
    const matcherConfigs = await fetchMatcherConfig(client);
    const lateToleranceMinutes = resolveLateToleranceMinutes(matcherConfigs);

    const expectedRows = await fetchExpectedPublicationWindow(
      client,
      windowInfo.observation_window_start,
      windowInfo.observation_window_end,
    );
    rowsProcessed = expectedRows.length;

    const expectedIds = expectedRows.map((r) => r.expected_publication_id);
    const [evidenceRows, matchRows, matrixRows, freshnessRows, cadenceRules] = await Promise.all([
      fetchEvidenceForExpectedIds(client, expectedIds),
      fetchMatchesForExpectedIds(client, expectedIds),
      fetchMatrixRows(client),
      fetchFreshnessRows(client),
      fetchCadenceRules(client),
    ]);

    // Index evidence + match by expected_publication_id.
    const evidenceByEp = new Map<string, EvidenceRow[]>();
    for (const e of evidenceRows) {
      const arr = evidenceByEp.get(e.expected_publication_id);
      if (arr) arr.push(e);
      else evidenceByEp.set(e.expected_publication_id, [e]);
    }
    const matchByEp = new Map<string, MatchRow>();
    for (const m of matchRows) {
      // Only the first match per expected_publication_id is consumed; r.reconciliation_match has UNIQUE on expected_publication_id.
      if (!matchByEp.has(m.expected_publication_id)) matchByEp.set(m.expected_publication_id, m);
    }

    // ---------- Per-row classification ----------
    const perRowFindings: Array<{ ep: ExpectedPublicationRow; classification: ReturnType<typeof classifyExpectedRow> }> = [];
    for (const ep of expectedRows) {
      const classification = classifyExpectedRow({
        ep,
        evidence: evidenceByEp.get(ep.expected_publication_id) ?? [],
        match: matchByEp.get(ep.expected_publication_id) ?? null,
        lateToleranceMinutes,
        nowUtc,
      });
      if (classification) perRowFindings.push({ ep, classification });
    }

    // ---------- Aggregate classification ----------
    const aggregateCadenceAnomalies = classifyAggregateAnomalies({
      matrixRows,
      cadenceRules,
    });
    cadenceAnomalyCount = aggregateCadenceAnomalies.length;

    const aggregateObserverStale = classifyObserverStale({
      freshnessRows,
      staleThresholdHours: 48,
      nowUtc,
    });
    observerStaleCount = aggregateObserverStale.length;

    // ---------- Build drift_log rows (R2 stamping + L53 assertUuid in drift.ts) ----------
    driftRows = buildDriftLogRowsForInsert({
      perRowFindings: perRowFindings.filter((f) => f.classification !== null) as Array<{
        ep: ExpectedPublicationRow;
        classification: NonNullable<ReturnType<typeof classifyExpectedRow>>;
      }>,
      aggregateCadenceAnomalies,
      aggregateObserverStale,
      runId,
      observationWindowStart: windowInfo.observation_window_start,
      observationWindowEnd: windowInfo.observation_window_end,
    });

    driftFindingsHistogram = buildDriftFindingsHistogram(driftRows);
    driftSeverityHistogram = buildDriftSeverityHistogram(driftRows);

    // ---------- Insert ----------
    if (!dryRun && driftRows.length > 0) {
      try {
        const insertResult = await insertDriftLogBatch(client, driftRows);
        driftRowsInserted = insertResult.inserted_count;
      } catch (insertErr) {
        runStatus = "partial";
        errorSummary = `drift_log batch insert failed: ${(insertErr as Error).message}`;
        partialFailures.drift_log_batch_failed = 1;
      }
    }

    // PK Stage B directive #4: NO writes to r.expected_publication.expected_status in v1.
    // Late + missing findings are LOG-ONLY in v1; late_transitions counter is always 0.

  } catch (err) {
    runStatus = "failed";
    errorSummary = (err as Error).message;
  }

  const finishedAtWallClock = Date.now();
  const durationMs = finishedAtWallClock - startedAtWallClock;

  const summaryJson = {
    dry_run: dryRun,
    run_mode: runMode,
    observation_window_days: observationWindowDays,
    today_local: undefined as string | undefined,
    observation_window_start: undefined as string | undefined,
    observation_window_end: undefined as string | undefined,
    expected_publication_rows_fetched: rowsProcessed,
    drift_findings: driftFindingsHistogram,
    drift_severity_distribution: driftSeverityHistogram,
    late_transitions: 0, // v1 log-only mode per PK Stage B directive #4
    mv_refresh: mvRefreshTimestamps,
    partial_failures: partialFailures,
    cadence_anomaly_count: cadenceAnomalyCount,
    observer_stale_count: observerStaleCount,
  };

  // Re-derive window info for summary_json (already computed above; reconstruct cheap).
  const windowInfo2 = computeDriftWindow(new Date(startedAtWallClock), observationWindowDays);
  summaryJson.today_local = windowInfo2.today_local;
  summaryJson.observation_window_start = windowInfo2.observation_window_start;
  summaryJson.observation_window_end = windowInfo2.observation_window_end;

  await closeReconciliationRun({
    client,
    runId,
    status: runStatus,
    rowsProcessed,
    rowsInserted: driftRowsInserted,
    rowsUpdated: 0, // v1 log-only mode — no late-state UPDATEs
    rowsSkipped: rowsProcessed - driftRows.length,
    errorSummary,
    summaryJson,
  });

  return new Response(
    JSON.stringify({
      reconciliation_run_id: runId,
      status: runStatus,
      started_at: new Date(startedAtWallClock).toISOString(),
      finished_at: new Date(finishedAtWallClock).toISOString(),
      duration_ms: durationMs,
      horizon: {
        today_local: summaryJson.today_local,
        observation_window_start: summaryJson.observation_window_start,
        observation_window_end: summaryJson.observation_window_end,
        observation_window_days: observationWindowDays,
      },
      rows_processed: rowsProcessed,
      rows_inserted: driftRowsInserted,
      rows_updated: 0,
      rows_skipped: rowsProcessed - driftRows.length,
      summary_json: summaryJson,
      error_summary: errorSummary,
    }),
    {
      status: 200,
      headers: { "content-type": "application/json" },
    },
  );
});