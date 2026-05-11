// cadence-rule-generator — cc-0009 Stage B
//
// Reads c.client_cadence_rule rules, computes 15-calendar-date inclusive horizon
// (today - 7 .. today + 7 in Sydney-local terms), and inserts r.expected_publication
// rows idempotently against the R9 UNIQUE key (client_id, platform, expected_local_date,
// cadence_rule_id). Suppressed rows emitted for paused publish profiles per Option B.
//
// Brief: docs/briefs/cc-0009-r-schema-and-cadence-rule-generator.md @ ae301a92
// Stage A schema: applied 2026-05-11 via cc_0009_r_schema_and_helpers (V1-V8 PASS)
//
// Auth: x-cron-secret header compared against Deno.env.get('CRON_SECRET').
// JWT verification disabled at gateway (verify_jwt = false in supabase/config.toml).
//
// Pipeline placement: invoked by pg_cron via net.http_post (Stage D, future), and
// on-demand for first backfill (Stage E, future). Not invoked by any other EF.

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import {
  ensureCronSecret,
  badRequest,
  okJson,
  internalError,
} from "./lib/db.ts";
import {
  fetchActiveCadenceRules,
  fetchPublishProfiles,
  openReconciliationRun,
  closeReconciliationRun,
  insertExpectedPublications,
  buildSupabaseClient,
  type RunMode,
} from "./lib/db.ts";
import {
  buildHorizon,
  derivePlannedRows,
  type PlannedRow,
} from "./lib/cadence.ts";

interface RequestBody {
  client_id?: string;
  run_mode?: RunMode;
  triggered_by?: string;
}

interface ResponseSummary {
  reconciliation_run_id: string;
  rows_planned: number;
  rows_inserted: number;
  rows_skipped_idempotent: number;
  rows_suppressed: number;
  rules_processed: number;
  rules_failed: number;
  horizon: { start: string; end: string };
  duration_ms: number;
}

serve(async (req: Request): Promise<Response> => {
  const startedAt = Date.now();

  // Method gate — POST only.
  if (req.method !== "POST") {
    return badRequest(`Method ${req.method} not allowed; POST required`);
  }

  // Auth gate — custom-header pattern per CCH R11 + cc-0009 §4.1.
  const authError = ensureCronSecret(req);
  if (authError) return authError;

  // Body parse — all fields optional with reasonable defaults.
  let body: RequestBody = {};
  try {
    const text = await req.text();
    if (text.length > 0) {
      body = JSON.parse(text) as RequestBody;
    }
  } catch (e) {
    return badRequest(`Invalid JSON body: ${(e as Error).message}`);
  }

  const runMode: RunMode = body.run_mode ?? "manual";
  if (!["manual", "scheduled", "backfill"].includes(runMode)) {
    return badRequest(
      `Invalid run_mode '${runMode}'; must be one of: manual, scheduled, backfill`,
    );
  }

  const triggeredBy =
    body.triggered_by ?? `cadence-rule-generator-${runMode}`;
  const clientFilter = body.client_id ?? null;

  // Build Supabase client (service role).
  let supabase;
  try {
    supabase = buildSupabaseClient();
  } catch (e) {
    return internalError(
      `Supabase client construction failed: ${(e as Error).message}`,
    );
  }

  // Map run_mode to r.reconciliation_run.run_type / trigger.
  // Brief §2.2 enum constraints:
  //   run_type IN ('cadence_generation','ice_evidence_materialisation', ...)
  //   trigger  IN ('scheduled','manual','rpc','backfill','dependency')
  const runType =
    runMode === "backfill" ? "backfill" : "cadence_generation";
  const triggerLabel = runMode === "scheduled"
    ? "scheduled"
    : runMode === "backfill"
    ? "backfill"
    : "manual";

  // Open audit row first; any later error closes it as failed/partial.
  let runId: string;
  try {
    runId = await openReconciliationRun(supabase, {
      runType,
      trigger: triggerLabel,
      triggeredBy,
    });
  } catch (e) {
    return internalError(
      `Failed to open r.reconciliation_run: ${(e as Error).message}`,
    );
  }

  // Generator body — try/catch wraps the whole thing so we always close the audit row.
  let plannedRows: PlannedRow[] = [];
  let rowsInserted = 0;
  let rowsSkippedIdempotent = 0;
  let rowsSuppressed = 0;
  let rulesProcessed = 0;
  let rulesFailed = 0;
  let horizonStart: string;
  let horizonEnd: string;

  try {
    // 1. Compute horizon (15 calendar dates inclusive: today-7 .. today+7).
    const horizon = buildHorizon();
    horizonStart = horizon.start;
    horizonEnd = horizon.end;

    // 2. Read inputs.
    const rules = await fetchActiveCadenceRules(supabase, clientFilter);
    const profiles = await fetchPublishProfiles(supabase);

    // 3. Derive planned rows (pure function — no DB access).
    plannedRows = derivePlannedRows({
      rules,
      profiles,
      horizon,
      runId,
    });

    rulesProcessed = rules.length;
    rowsSuppressed = plannedRows.filter(
      (r) => r.expected_status === "suppressed",
    ).length;

    // 4. Batch insert with ON CONFLICT DO NOTHING (R9 idempotency key).
    if (plannedRows.length > 0) {
      const result = await insertExpectedPublications(
        supabase,
        plannedRows,
      );
      rowsInserted = result.inserted;
      rowsSkippedIdempotent = plannedRows.length - result.inserted;
    }

    // 5. Close audit row as succeeded.
    await closeReconciliationRun(supabase, runId, {
      status: rulesFailed > 0 ? "partial" : "succeeded",
      rowsProcessed: plannedRows.length,
      rowsInserted,
      rowsSkipped: rowsSkippedIdempotent,
      summaryJson: {
        run_mode: runMode,
        client_filter: clientFilter,
        horizon_start: horizonStart,
        horizon_end: horizonEnd,
        rules_processed: rulesProcessed,
        rules_failed: rulesFailed,
        rows_suppressed: rowsSuppressed,
      },
    });
  } catch (e) {
    // Close audit row as failed before returning 500.
    const errMsg = (e as Error).message ?? String(e);
    try {
      await closeReconciliationRun(supabase, runId, {
        status: "failed",
        rowsProcessed: plannedRows.length,
        rowsInserted,
        rowsSkipped: rowsSkippedIdempotent,
        errorSummary: errMsg,
        summaryJson: {
          run_mode: runMode,
          client_filter: clientFilter,
          error: errMsg,
          rules_processed: rulesProcessed,
          rules_failed: rulesFailed,
        },
      });
    } catch (closeErr) {
      console.error(
        "Failed to close reconciliation_run after generator error:",
        closeErr,
      );
    }
    return internalError(`Generator failed: ${errMsg}`);
  }

  const summary: ResponseSummary = {
    reconciliation_run_id: runId,
    rows_planned: plannedRows.length,
    rows_inserted: rowsInserted,
    rows_skipped_idempotent: rowsSkippedIdempotent,
    rows_suppressed: rowsSuppressed,
    rules_processed: rulesProcessed,
    rules_failed: rulesFailed,
    horizon: { start: horizonStart, end: horizonEnd },
    duration_ms: Date.now() - startedAt,
  };

  return okJson(summary);
});
