/**
 * cc-0011 cadence-drift-checker — service-role DB helpers.
 *
 * Mirrors cc-0010C lib/db.ts patterns:
 *   - createServiceClient: Supabase client with SUPABASE_SERVICE_ROLE_KEY.
 *   - ensureCronSecret: HTTP 401 gate on x-cron-secret header (L42 vault-backed).
 *   - openReconciliationRun / closeReconciliationRun: r.reconciliation_run lifecycle writes (run_type='cadence_drift_check').
 *   - refreshDriftViews: .rpc('refresh_cc_0011_views') call — invoked BEFORE drift evaluation per PK Stage B directive #6.
 *   - fetch* helpers: read-only PostgREST SELECTs.
 *   - insertDriftLogBatch: PostgREST batch insert with R2 stamping (every row carries drift_check_run_id +
 *     created_by_run_id + updated_by_run_id all equal to the same run UUID).
 *
 * Strict scope per directive: NO writes to r.expected_publication this version (late = log only in v1).
 */

import { createClient, type SupabaseClient } from "supabase";
import type {
  ExpectedPublicationRow,
  EvidenceRow,
  MatchRow,
  MatcherConfigRow,
  MatrixRow,
  FreshnessRow,
  CadenceRuleRow,
  DriftFindingRowInsert,
} from "./drift.ts";

// =============================================================================
// Service-role client factory
// =============================================================================

export interface EnvVars {
  SUPABASE_URL: string;
  SUPABASE_SERVICE_ROLE_KEY: string;
  CRON_SECRET: string;
}

export function readEnv(): EnvVars {
  const env = {
    SUPABASE_URL: Deno.env.get("SUPABASE_URL") ?? "",
    SUPABASE_SERVICE_ROLE_KEY: Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    CRON_SECRET: Deno.env.get("CRON_SECRET") ?? "",
  };
  if (!env.SUPABASE_URL) throw new Error("cc-0011: SUPABASE_URL env var missing");
  if (!env.SUPABASE_SERVICE_ROLE_KEY) throw new Error("cc-0011: SUPABASE_SERVICE_ROLE_KEY env var missing");
  if (!env.CRON_SECRET) throw new Error("cc-0011: CRON_SECRET env var missing");
  return env;
}

export function createServiceClient(env: EnvVars): SupabaseClient {
  return createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
    db: { schema: "r" },
  });
}

// =============================================================================
// Auth gate (L42 vault-backed CRON_SECRET — secret resolved by pg_cron at fire-time,
// passed via x-cron-secret header)
// =============================================================================

export function ensureCronSecret(req: Request, env: EnvVars): Response | null {
  const incoming = req.headers.get("x-cron-secret") ?? "";
  if (incoming.length === 0 || incoming !== env.CRON_SECRET) {
    return new Response(JSON.stringify({ error: "unauthorized" }), {
      status: 401,
      headers: { "content-type": "application/json" },
    });
  }
  return null;
}

// =============================================================================
// r.reconciliation_run lifecycle (run_type='cadence_drift_check')
// =============================================================================

export interface OpenRunInput {
  trigger: string; // 'manual' | 'scheduled' | 'backfill'
  triggered_by: string;
  client: SupabaseClient;
}

export interface OpenRunOutput {
  reconciliation_run_id: string;
  started_at: string;
}

export async function openReconciliationRun(input: OpenRunInput): Promise<OpenRunOutput> {
  const { client, trigger, triggered_by } = input;
  const now = new Date().toISOString();
  const { data, error } = await client
    .from("reconciliation_run")
    .insert({
      run_type: "cadence_drift_check",
      status: "running",
      trigger,
      triggered_by,
      started_at: now,
    })
    .select("reconciliation_run_id, started_at")
    .single();
  if (error) throw new Error(`cc-0011 openReconciliationRun failed: ${error.message}`);
  if (!data?.reconciliation_run_id) {
    throw new Error("cc-0011 openReconciliationRun: insert returned no reconciliation_run_id");
  }
  return { reconciliation_run_id: data.reconciliation_run_id as string, started_at: data.started_at as string };
}

export interface CloseRunInput {
  runId: string;
  client: SupabaseClient;
  status: "succeeded" | "failed" | "partial";
  rowsProcessed: number | null;
  rowsInserted: number | null;
  rowsUpdated: number | null;
  rowsSkipped: number | null;
  errorSummary: string | null;
  summaryJson: Record<string, unknown>;
}

export async function closeReconciliationRun(input: CloseRunInput): Promise<void> {
  const { client, runId, status, rowsProcessed, rowsInserted, rowsUpdated, rowsSkipped, errorSummary, summaryJson } = input;
  const { error } = await client
    .from("reconciliation_run")
    .update({
      status,
      finished_at: new Date().toISOString(),
      rows_processed: rowsProcessed ?? null,
      rows_inserted: rowsInserted ?? null,
      rows_updated: rowsUpdated ?? null,
      rows_skipped: rowsSkipped ?? null,
      error_summary: errorSummary ?? null,
      summary_json: summaryJson,
    })
    .eq("reconciliation_run_id", runId);
  if (error) throw new Error(`cc-0011 closeReconciliationRun failed: ${error.message}`);
}
// =============================================================================
// MV refresh helper (PK Stage B directive #6: called BEFORE drift evaluation)
// =============================================================================

export interface RefreshDriftViewsOutput {
  refreshed_at: string;
}

export async function refreshDriftViews(client: SupabaseClient): Promise<RefreshDriftViewsOutput> {
  const startedAt = new Date().toISOString();
  const { error } = await client.rpc("refresh_cc_0011_views");
  if (error) {
    throw new Error(`cc-0011 refreshDriftViews .rpc('refresh_cc_0011_views') failed: ${error.message}`);
  }
  return { refreshed_at: startedAt };
}

// =============================================================================
// Read helpers — r.expected_publication, r.ice_publication_evidence, r.reconciliation_match,
// r.matcher_config, r.mv_reconciliation_daily_matrix, r.mv_observer_freshness_summary, c.cadence_rule.
// =============================================================================

export async function fetchExpectedPublicationWindow(
  client: SupabaseClient,
  windowStart: string,
  windowEnd: string,
): Promise<ExpectedPublicationRow[]> {
  const { data, error } = await client
    .from("expected_publication")
    .select(
      "expected_publication_id, client_id, platform, expected_local_date, expected_window_start, expected_window_end, expected_status, matched_match_id, matched_at, created_at",
    )
    .gte("expected_local_date", windowStart)
    .lte("expected_local_date", windowEnd);
  if (error) throw new Error(`cc-0011 fetchExpectedPublicationWindow failed: ${error.message}`);
  return (data ?? []) as ExpectedPublicationRow[];
}

export async function fetchEvidenceForExpectedIds(
  client: SupabaseClient,
  expectedIds: string[],
): Promise<EvidenceRow[]> {
  if (expectedIds.length === 0) return [];
  const { data, error } = await client
    .from("ice_publication_evidence")
    .select("ice_publication_evidence_id, expected_publication_id, pipeline_state, published_at, created_at")
    .in("expected_publication_id", expectedIds);
  if (error) throw new Error(`cc-0011 fetchEvidenceForExpectedIds failed: ${error.message}`);
  return (data ?? []) as EvidenceRow[];
}

export async function fetchMatchesForExpectedIds(
  client: SupabaseClient,
  expectedIds: string[],
): Promise<MatchRow[]> {
  if (expectedIds.length === 0) return [];
  const { data, error } = await client
    .from("reconciliation_match")
    .select("reconciliation_match_id, expected_publication_id, matched_evidence_id, delta_minutes_late, override_by, created_at")
    .in("expected_publication_id", expectedIds);
  if (error) throw new Error(`cc-0011 fetchMatchesForExpectedIds failed: ${error.message}`);
  return (data ?? []) as MatchRow[];
}

export async function fetchMatcherConfig(client: SupabaseClient): Promise<MatcherConfigRow[]> {
  // v1 reads ALL rows but only consumes the global default — kept simple for forward-compat with per-client extensions.
  const { data, error } = await client
    .from("matcher_config")
    .select("matcher_config_id, client_id, platform, late_tolerance_minutes");
  if (error) throw new Error(`cc-0011 fetchMatcherConfig failed: ${error.message}`);
  return (data ?? []) as MatcherConfigRow[];
}

export async function fetchMatrixRows(client: SupabaseClient): Promise<MatrixRow[]> {
  const { data, error } = await client
    .from("mv_reconciliation_daily_matrix")
    .select("client_id, platform, expected_local_date, count_expected, count_matched, count_late, count_suppressed, count_cancelled, count_total, on_time_rate, late_rate");
  if (error) throw new Error(`cc-0011 fetchMatrixRows failed: ${error.message}`);
  return (data ?? []) as MatrixRow[];
}

export async function fetchFreshnessRows(client: SupabaseClient): Promise<FreshnessRow[]> {
  const { data, error } = await client
    .from("mv_observer_freshness_summary")
    .select("client_id, platform, last_evidence_at, last_match_at, last_drift_log_at, evidence_count_7d, match_count_7d, drift_warn_critical_count_7d, freshness_status");
  if (error) throw new Error(`cc-0011 fetchFreshnessRows failed: ${error.message}`);
  return (data ?? []) as FreshnessRow[];
}

/**
 * Read cadence rules across all clients × platforms. The c.cadence_rule shape is owned by cc-0009;
 * here we only need (client_id, platform, expected_posts_per_week) for the cadence_anomaly classifier.
 * If c.cadence_rule has different column names than expected, this read may need adjustment; brief §10.5
 * tracks this as a v2 sensitivity. v1 uses a soft-fail pattern: empty result = no cadence_anomaly classifications.
 */
export async function fetchCadenceRules(client: SupabaseClient): Promise<CadenceRuleRow[]> {
  // c.cadence_rule lives in schema 'c', not 'r'. Use a separate client view if needed; otherwise call through
  // a service-role connection with cross-schema permissions.
  const adhoc = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    {
      auth: { persistSession: false, autoRefreshToken: false },
      db: { schema: "c" },
    },
  );
  const { data, error } = await adhoc
    .from("cadence_rule")
    .select("client_id, platform, expected_posts_per_week");
  if (error) {
    // Soft-fail: cc-0009 schema may differ. Log empty cadence rules; cadence_anomaly classifications skipped.
    console.warn(`cc-0011 fetchCadenceRules soft-fail: ${error.message}`);
    return [];
  }
  return (data ?? []) as CadenceRuleRow[];
}

// =============================================================================
// Drift-log batch insert (R2 stamped at row construction time in drift.ts)
// =============================================================================

export interface InsertDriftLogBatchOutput {
  inserted_count: number;
}

export async function insertDriftLogBatch(
  client: SupabaseClient,
  rows: DriftFindingRowInsert[],
): Promise<InsertDriftLogBatchOutput> {
  if (rows.length === 0) {
    return { inserted_count: 0 };
  }
  const { error, count } = await client
    .from("cadence_drift_log")
    .insert(rows, { count: "exact" });
  if (error) {
    throw new Error(`cc-0011 insertDriftLogBatch failed: ${error.message}`);
  }
  return { inserted_count: count ?? rows.length };
}