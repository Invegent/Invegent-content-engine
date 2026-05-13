// Service-role Supabase client + DB helpers for reconciliation-matcher.
//
// All DB access in the EF goes through this module. Pure-function helpers live in
// lib/matcher.ts (no DB access there).
//
// Reads:
//   - r.expected_publication (driver query; in-window rows in 'expected'/'backfilled' status)
//   - r.ice_publication_evidence (Tier-1 evidence source; populated by cc-0010B)
//   - r.reconciliation_match (D-21 sticky-override gate + insert/update split)
//   - r.matcher_config (tolerance lookup chain)
// Writes:
//   - r.reconciliation_run (open + close audit lifecycle)
//   - r.reconciliation_match (UPSERT with cc-0010A v1.5 UNIQUE on expected_publication_id)
//   - r.expected_publication (per-row UPDATE: expected_status='matched' + matched_match_id + matched_at)
//
// Brief: docs/briefs/cc-0010C-reconciliation-matcher.md @ v1 commit 8204ab540a0775034b927e8c86d4cb255e8ace26
// cc-0010A v1.5 r.* foundation applied 2026-05-12 via cc_0010a_r_evidence_matcher_schema_foundation
// cc-0010B v1.3 ice-evidence-materialiser EF v2 ACTIVE post-F4-hotfix (commit 62f319c8554b25ee06cf680bc548cf87f24521ba)
//
// Auth: x-cron-secret header compared against Deno.env.get('CRON_SECRET') — same pattern as cc-0009 +
// cc-0010B. JWT verification disabled at the gateway (verify_jwt = false in supabase/config.toml).
//
// Tier-1 scope lock: this module has zero references to r.platform_observation or
// r.platform_manual_observation. Any future amendment to add Tier 2-5 paths must go via a
// separate brief (PRV-2/3/4 + cc-0010C v2 or successor).
//
// D-21 hard lock: fetchExistingMatchRows pre-reads r.reconciliation_match and surfaces
// override_by status; planMatcherPass in lib/matcher.ts filters override-protected rows out
// of both insert + update payloads. PostgREST does not support WHERE on the UPDATE side of
// upsert natively; pre-filter pattern achieves identical observable behaviour to the brief's
// literal `WHERE override_by IS NULL` clause.
//
// R2 v1.1 run-id stamping: two homogeneous-shape UPSERT calls (upsertMatchInserts +
// upsertMatchUpdates) so PostgREST does not blanket-include created_by_run_id in the UPDATE
// side of `ON CONFLICT DO UPDATE`. cc-0010B established this pattern; cc-0010C carries it.
//
// L53 FK source-column-type protections: all UUIDs flowing into r.reconciliation_match
// originate from PG-returned uuid columns (PK of r.expected_publication / r.ice_publication_evidence /
// r.reconciliation_run). No body-supplied UUIDs are accepted. assertUuid() in lib/matcher.ts
// enforces fail-fast at row-construction time.

import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";
import type {
  ExistingMatchRow,
  ExpectedPublicationRow,
  IceEvidenceRow,
  MatchInsertRow,
  MatchUpdateRow,
  MatcherConfigRow,
} from "./matcher.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const CRON_SECRET = Deno.env.get("CRON_SECRET") ?? "";

/**
 * Custom-header auth gate. Returns a 401 Response on mismatch, null if OK.
 * Pattern carries from cadence-rule-generator (cc-0009) + ice-evidence-materialiser (cc-0010B) verbatim.
 */
export function ensureCronSecret(req: Request): Response | null {
  const provided = req.headers.get("x-cron-secret") ?? "";
  if (CRON_SECRET.length === 0) {
    return new Response(
      JSON.stringify({ error: "server_misconfigured", detail: "CRON_SECRET env var not set" }),
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
  if (SUPABASE_URL.length === 0) throw new Error("SUPABASE_URL env var not set");
  if (SUPABASE_SERVICE_ROLE_KEY.length === 0) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY env var not set");
  }
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
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

/** Open a r.reconciliation_run audit row with status='running'. */
export async function openReconciliationRun(
  client: SupabaseClient,
  input: { runType: string; trigger: string; triggeredBy: string },
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

  if (error) throw new Error(`openReconciliationRun failed: ${error.message}`);
  return (data as { reconciliation_run_id: string }).reconciliation_run_id;
}

/** Close a r.reconciliation_run audit row. status transitions running -> succeeded|failed|partial. */
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

  if (error) throw new Error(`closeReconciliationRun failed: ${error.message}`);
}
/**
 * Driver query: fetch r.expected_publication rows in window with expected_status IN
 * ('expected','backfilled'). Tier-1 candidate set for the matcher pass.
 *
 * Carries cc-0010B v1.3 guardrail: no SELECT of slot_id (column does not exist on
 * r.expected_publication). cc-0010C does not write slot_id anywhere either — that field
 * lives on r.ice_publication_evidence and is downstream-captured by the materialiser.
 */
export async function fetchExpectedPublications(
  client: SupabaseClient,
  windowStartLocalDate: string,
  windowEndLocalDate: string,
): Promise<ExpectedPublicationRow[]> {
  const { data, error } = await client
    .schema("r" as never)
    .from("expected_publication")
    .select(
      "expected_publication_id, client_id, platform, cadence_rule_id, expected_local_date, expected_window_start, expected_window_end, expected_format, expected_status",
    )
    .gte("expected_local_date", windowStartLocalDate)
    .lte("expected_local_date", windowEndLocalDate)
    .in("expected_status", ["expected", "backfilled"]);

  if (error) throw new Error(`fetchExpectedPublications failed: ${error.message}`);
  return (data ?? []) as ExpectedPublicationRow[];
}

/**
 * Fetch r.ice_publication_evidence rows for a list of expected_publication_ids.
 * cc-0010B's UNIQUE(expected_publication_id) on this table means at most one evidence row
 * per id; the caller indexes the result as Map<expected_publication_id, IceEvidenceRow[]>
 * with each array length 0 or 1.
 *
 * L53: projection enumerates exactly the columns used by lib/matcher.ts. No SELECT *.
 */
export async function fetchIceEvidenceForExpected(
  client: SupabaseClient,
  expectedPublicationIds: string[],
): Promise<IceEvidenceRow[]> {
  if (expectedPublicationIds.length === 0) return [];
  const { data, error } = await client
    .schema("r" as never)
    .from("ice_publication_evidence")
    .select(
      "ice_publication_evidence_id, expected_publication_id, pipeline_state, published_at, scheduled_for",
    )
    .in("expected_publication_id", expectedPublicationIds);

  if (error) throw new Error(`fetchIceEvidenceForExpected failed: ${error.message}`);
  return (data ?? []) as IceEvidenceRow[];
}

/**
 * Fetch existing r.reconciliation_match rows for D-21 sticky-override gate + insert/update split.
 *
 * R2 v1.1 requires preserving created_by_run_id on the UPDATE path. Caller uses presence in this
 * result to split inserts (absent) vs updates (present-and-not-override-protected). Rows with
 * override_by IS NOT NULL are pre-filtered out of both payloads in lib/matcher.ts.
 */
export async function fetchExistingMatchRows(
  client: SupabaseClient,
  expectedPublicationIds: string[],
): Promise<ExistingMatchRow[]> {
  if (expectedPublicationIds.length === 0) return [];
  const { data, error } = await client
    .schema("r" as never)
    .from("reconciliation_match")
    .select("reconciliation_match_id, expected_publication_id, override_by")
    .in("expected_publication_id", expectedPublicationIds);

  if (error) throw new Error(`fetchExistingMatchRows failed: ${error.message}`);
  return (data ?? []) as ExistingMatchRow[];
}

/**
 * Fetch all r.matcher_config rows for the tolerance lookup chain.
 *
 * v1 invariant: cc-0010A v1.5 inserted exactly 1 global default row (NULL, NULL,
 * minutes_late_tolerance=60). Per-client + per-(client, platform) overrides land in
 * future briefs (out of v1 scope per brief §1.2 + §13 #6); fetching the full table
 * here is forward-compatible without v1 fan-out.
 */
export async function fetchMatcherConfig(client: SupabaseClient): Promise<MatcherConfigRow[]> {
  const { data, error } = await client
    .schema("r" as never)
    .from("matcher_config")
    .select(
      "client_id, platform, minutes_late_tolerance, caption_prefix_length, same_day_window_hours, fuzzy_levenshtein_threshold",
    );

  if (error) throw new Error(`fetchMatcherConfig failed: ${error.message}`);
  return (data ?? []) as MatcherConfigRow[];
}

/**
 * Batch UPSERT r.reconciliation_match INSERT-path payloads.
 *
 * R2 v1.1 semantics — every row in this payload includes created_by_run_id +
 * updated_by_run_id (both = current run_id). Use upsertMatchUpdates() for the
 * UPDATE-path payload (which OMITS created_by_run_id to preserve existing column value).
 *
 * Splitting into two homogeneous-shape calls (rather than one mixed-shape call) avoids
 * PostgREST inferring the column set from the first row's keys and applying it to all
 * subsequent rows including the ON CONFLICT DO UPDATE SET clause.
 *
 * Returns the upserted rows' reconciliation_match_id + expected_publication_id mapping
 * so the caller can drive step 7 (UPDATE r.expected_publication).
 */
export async function upsertMatchInserts(
  client: SupabaseClient,
  rows: MatchInsertRow[],
): Promise<{ rows: Array<{ reconciliation_match_id: string; expected_publication_id: string }> }> {
  if (rows.length === 0) return { rows: [] };
  const { data, error } = await client
    .schema("r" as never)
    .from("reconciliation_match")
    .upsert(rows, { onConflict: "expected_publication_id" })
    .select("reconciliation_match_id, expected_publication_id");

  if (error) throw new Error(`upsertMatchInserts failed: ${error.message}`);
  return {
    rows: (data ?? []) as Array<
      { reconciliation_match_id: string; expected_publication_id: string }
    >,
  };
}

/**
 * Batch UPSERT r.reconciliation_match UPDATE-path payloads.
 *
 * R2 v1.1 semantics — every row in this payload OMITS created_by_run_id so PostgREST does
 * not include it in the SET clause of ON CONFLICT DO UPDATE; the existing column value is
 * preserved. updated_by_run_id IS set (= current run_id).
 *
 * Note: the brief's literal SQL adds `WHERE override_by IS NULL` on the UPDATE side of the
 * upsert. PostgREST does not support that natively; the equivalent semantics are achieved by
 * pre-filtering override-protected rows out of this payload in lib/matcher.ts. Caller MUST
 * NOT include any expected_publication_id whose existing r.reconciliation_match row has
 * override_by IS NOT NULL.
 */
export async function upsertMatchUpdates(
  client: SupabaseClient,
  rows: MatchUpdateRow[],
): Promise<{ rows: Array<{ reconciliation_match_id: string; expected_publication_id: string }> }> {
  if (rows.length === 0) return { rows: [] };
  const { data, error } = await client
    .schema("r" as never)
    .from("reconciliation_match")
    .upsert(rows, { onConflict: "expected_publication_id" })
    .select("reconciliation_match_id, expected_publication_id");

  if (error) throw new Error(`upsertMatchUpdates failed: ${error.message}`);
  return {
    rows: (data ?? []) as Array<
      { reconciliation_match_id: string; expected_publication_id: string }
    >,
  };
}

/**
 * Per-row UPDATE r.expected_publication for step 7 of brief §5.2:
 *   SET expected_status='matched', matched_match_id=$1, matched_at=now(), updated_at=now()
 *   WHERE expected_publication_id=$2 AND expected_status IN ('expected','backfilled');
 *
 * Sequenced AFTER upsertMatch* so that at the moment expected_status flips to 'matched',
 * matched_match_id is already non-null and the CHECK expected_status_match_pair is satisfied.
 *
 * L53: matched_match_id values originate from upsertMatch*'s RETURNING reconciliation_match_id
 * (PG-returned uuid column); no body-supplied UUIDs. The expected_publication_id originates
 * from the same PG-returned uuid in the upsert response (round-trip).
 *
 * Per-row pattern (rather than bulk UPDATE FROM VALUES) preserves PostgREST surface and matches
 * brief §5.2 step 7 literal semantics. Candidate set is bounded by horizon_days * clients *
 * platforms (typically tens; 30 rows ran in 3.5s during cc-0010B Stage E so per-row UPDATE
 * latency is well within the 30s timeout for v1 scale).
 */
export async function updateExpectedToMatched(
  client: SupabaseClient,
  mappings: Array<{ expected_publication_id: string; reconciliation_match_id: string }>,
): Promise<{ rows_transitioned: number }> {
  if (mappings.length === 0) return { rows_transitioned: 0 };

  const nowIso = new Date().toISOString();
  let transitioned = 0;

  for (const m of mappings) {
    const { data, error } = await client
      .schema("r" as never)
      .from("expected_publication")
      .update({
        expected_status: "matched",
        matched_match_id: m.reconciliation_match_id,
        matched_at: nowIso,
        updated_at: nowIso,
      })
      .eq("expected_publication_id", m.expected_publication_id)
      .in("expected_status", ["expected", "backfilled"])
      .select("expected_publication_id");

    if (error) {
      throw new Error(
        `updateExpectedToMatched failed for ep=${m.expected_publication_id}: ${error.message}`,
      );
    }
    transitioned += (data ?? []).length;
  }

  return { rows_transitioned: transitioned };
}