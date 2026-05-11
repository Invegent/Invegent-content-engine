// Service-role Supabase client + typed DB helpers for cadence-rule-generator.
//
// All DB access in the EF goes through this module. Pure-function helpers live in
// lib/cadence.ts (no DB access there).
//
// Reads:
//   - c.client_cadence_rule (active rules; optionally filtered by client_id)
//   - c.client_publish_profile (publish_enabled + paused_reason)
// Writes:
//   - r.reconciliation_run (open + close)
//   - r.expected_publication (batch insert with R9 idempotency)

import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";
import type {
  CadenceRule,
  PlannedRow,
  PublishProfile,
} from "./cadence.ts";

export type RunMode = "manual" | "scheduled" | "backfill";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_SERVICE_ROLE_KEY =
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const CRON_SECRET = Deno.env.get("CRON_SECRET") ?? "";

/**
 * Custom-header auth gate. Returns a 401 Response if mismatch, null if OK.
 * Pattern matches existing custom-header-auth EFs (verify_jwt=false at gateway).
 */
export function ensureCronSecret(req: Request): Response | null {
  const provided = req.headers.get("x-cron-secret") ?? "";
  if (CRON_SECRET.length === 0) {
    return new Response(
      JSON.stringify({
        error: "server_misconfigured",
        detail: "CRON_SECRET env var not set",
      }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    );
  }
  if (provided !== CRON_SECRET) {
    return new Response(
      JSON.stringify({ error: "unauthorized" }),
      { status: 401, headers: { "Content-Type": "application/json" } },
    );
  }
  return null;
}

export function buildSupabaseClient(): SupabaseClient {
  if (SUPABASE_URL.length === 0) {
    throw new Error("SUPABASE_URL env var not set");
  }
  if (SUPABASE_SERVICE_ROLE_KEY.length === 0) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY env var not set");
  }
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
    db: { schema: "public" },
  });
}

export function badRequest(message: string): Response {
  return new Response(
    JSON.stringify({ error: "bad_request", detail: message }),
    { status: 400, headers: { "Content-Type": "application/json" } },
  );
}

export function okJson(payload: unknown): Response {
  return new Response(JSON.stringify(payload), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}

export function internalError(message: string): Response {
  return new Response(
    JSON.stringify({ error: "internal_error", detail: message }),
    { status: 500, headers: { "Content-Type": "application/json" } },
  );
}

/**
 * Open a r.reconciliation_run audit row with status='running' (the column default).
 * Returns the inserted row's reconciliation_run_id.
 *
 * The Supabase JS client targets the public REST schema by default, so we route
 * via a SECURITY DEFINER function or via the REST schema-switch header. cc-0009
 * brief §4.1 leaves the auth pattern open; we use the schema-switch via the
 * .schema() builder which the supabase-js v2 client supports for non-public schemas.
 */
export async function openReconciliationRun(
  client: SupabaseClient,
  input: {
    runType: string;
    trigger: string;
    triggeredBy: string;
  },
): Promise<string> {
  const { data, error } = await client
    .schema("r" as never)
    .from("reconciliation_run")
    .insert({
      run_type: input.runType,
      trigger: input.trigger,
      triggered_by: input.triggeredBy,
      status: "running",
      summary_json: {},
    })
    .select("reconciliation_run_id")
    .single();

  if (error) {
    throw new Error(`openReconciliationRun failed: ${error.message}`);
  }
  return (data as { reconciliation_run_id: string }).reconciliation_run_id;
}

/**
 * Close a r.reconciliation_run audit row. status transitions running -> succeeded|failed|partial.
 * The recon_run_finished_when_done CHECK requires finished_at non-null when status<>'running'.
 */
export async function closeReconciliationRun(
  client: SupabaseClient,
  runId: string,
  input: {
    status: "succeeded" | "failed" | "partial" | "cancelled";
    rowsProcessed?: number;
    rowsInserted?: number;
    rowsUpdated?: number;
    rowsSkipped?: number;
    errorSummary?: string;
    summaryJson?: Record<string, unknown>;
  },
): Promise<void> {
  const { error } = await client
    .schema("r" as never)
    .from("reconciliation_run")
    .update({
      status: input.status,
      finished_at: new Date().toISOString(),
      rows_processed: input.rowsProcessed ?? null,
      rows_inserted: input.rowsInserted ?? null,
      rows_updated: input.rowsUpdated ?? null,
      rows_skipped: input.rowsSkipped ?? null,
      error_summary: input.errorSummary ?? null,
      summary_json: input.summaryJson ?? {},
    })
    .eq("reconciliation_run_id", runId);

  if (error) {
    throw new Error(`closeReconciliationRun failed: ${error.message}`);
  }
}

/**
 * Fetch active cadence rules. If clientFilter is non-null, restrict to that client_id.
 */
export async function fetchActiveCadenceRules(
  client: SupabaseClient,
  clientFilter: string | null,
): Promise<CadenceRule[]> {
  let query = client
    .schema("c" as never)
    .from("client_cadence_rule")
    .select(
      "cadence_rule_id, client_id, platform, is_active, weekdays, preferred_local_times, suppression_dates, expected_format, valid_from, valid_to",
    )
    .eq("is_active", true);

  if (clientFilter) {
    query = query.eq("client_id", clientFilter);
  }

  const { data, error } = await query;
  if (error) {
    throw new Error(`fetchActiveCadenceRules failed: ${error.message}`);
  }
  return (data ?? []) as CadenceRule[];
}

/**
 * Fetch all publish profiles. Indexed by caller (cadence.ts) on (client_id, platform).
 */
export async function fetchPublishProfiles(
  client: SupabaseClient,
): Promise<PublishProfile[]> {
  const { data, error } = await client
    .schema("c" as never)
    .from("client_publish_profile")
    .select("client_id, platform, publish_enabled, paused_reason");

  if (error) {
    throw new Error(`fetchPublishProfiles failed: ${error.message}`);
  }
  return (data ?? []) as PublishProfile[];
}

/**
 * Batch insert r.expected_publication rows with ON CONFLICT DO NOTHING on the
 * R9 idempotency key (client_id, platform, expected_local_date, cadence_rule_id).
 *
 * Returns the count of rows actually inserted (conflicts are silent).
 *
 * supabase-js .insert() with onConflict + ignoreDuplicates=true is the equivalent
 * of ON CONFLICT DO NOTHING. The returned data includes only inserted rows.
 */
export async function insertExpectedPublications(
  client: SupabaseClient,
  rows: PlannedRow[],
): Promise<{ inserted: number }> {
  if (rows.length === 0) return { inserted: 0 };

  const { data, error } = await client
    .schema("r" as never)
    .from("expected_publication")
    .upsert(rows, {
      onConflict: "client_id,platform,expected_local_date,cadence_rule_id",
      ignoreDuplicates: true,
    })
    .select("expected_publication_id");

  if (error) {
    throw new Error(`insertExpectedPublications failed: ${error.message}`);
  }

  return { inserted: data?.length ?? 0 };
}
