// Service-role Supabase client + DB helpers for ice-evidence-materialiser.
//
// All DB access in the EF goes through this module. Pure-function helpers live in
// lib/materialiser.ts (no DB access there).
//
// Reads:
//   - r.expected_publication (driver query; in-window rows in 'expected'/'backfilled' status)
//   - m.post_publish (published evidence source)
//   - m.post_publish_queue (queued/attempted/failed evidence source)
//   - m.post_draft (drafted evidence source + slot_id downstream-capture source)
// Writes:
//   - r.reconciliation_run (open + close)
//   - r.ice_publication_evidence (batch UPSERT with cc-0010A v1.5 UNIQUE on expected_publication_id)
//
// Brief: docs/briefs/cc-0010B-ice-evidence-materialiser.md @ v1.3 commit 1b0bbff7
// cc-0010A v1.5 r.* foundation applied 2026-05-12 via cc_0010a_r_evidence_matcher_schema_foundation
//
// Auth: x-cron-secret header compared against Deno.env.get('CRON_SECRET').
// JWT verification disabled at gateway (verify_jwt = false in supabase/config.toml).
//
// v1.3 guardrail: NO reference to r.expected_publication.slot_id anywhere; column does not exist
// on r.expected_publication per live-schema verification 2026-05-12. slot_id is captured downstream
// from matched m.post_draft.slot_id only.

import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";
import type {
  EvidenceRow,
  ExpectedPublicationRow,
  PostDraftRow,
  PostPublishQueueRow,
  PostPublishRow,
} from "./materialiser.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const CRON_SECRET = Deno.env.get("CRON_SECRET") ?? "";

/**
 * Custom-header auth gate. Returns a 401 Response on mismatch, null if OK.
 * Pattern carries from cadence-rule-generator (cc-0009) verbatim.
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
 * Driver query: fetch r.expected_publication rows in window.
 *
 * v1.3 guardrail: SELECT projection MUST NOT include slot_id (column does not exist on
 * r.expected_publication; see brief §2.4 + §5.2). Required columns enumerated explicitly.
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
 * Batch fetch m.post_publish rows in conservative UTC window covering the Sydney-local target.
 */
export async function fetchPostPublishInWindow(
  client: SupabaseClient,
  windowStartUtc: string,
  windowEndUtc: string,
): Promise<PostPublishRow[]> {
  const { data, error } = await client
    .schema("m" as never)
    .from("post_publish")
    .select(
      "post_publish_id, post_draft_id, queue_id, client_id, platform, published_at, status, platform_post_id, error, destination_id, attempt_no",
    )
    .gte("published_at", windowStartUtc)
    .lte("published_at", windowEndUtc)
    .not("published_at", "is", null)
    .not("client_id", "is", null)
    .not("platform", "is", null);

  if (error) throw new Error(`fetchPostPublishInWindow failed: ${error.message}`);
  return (data ?? []) as PostPublishRow[];
}

/** Batch fetch m.post_publish_queue rows in conservative UTC window. */
export async function fetchPostPublishQueueInWindow(
  client: SupabaseClient,
  windowStartUtc: string,
  windowEndUtc: string,
): Promise<PostPublishQueueRow[]> {
  const { data, error } = await client
    .schema("m" as never)
    .from("post_publish_queue")
    .select(
      "queue_id, post_draft_id, client_id, platform, status, scheduled_for, last_error, dead_reason, attempt_count, last_error_code, last_error_at",
    )
    .gte("scheduled_for", windowStartUtc)
    .lte("scheduled_for", windowEndUtc)
    .not("scheduled_for", "is", null)
    .not("client_id", "is", null)
    .not("platform", "is", null);

  if (error) throw new Error(`fetchPostPublishQueueInWindow failed: ${error.message}`);
  return (data ?? []) as PostPublishQueueRow[];
}

/** Batch fetch m.post_draft rows in conservative UTC window. */
export async function fetchPostDraftInWindow(
  client: SupabaseClient,
  windowStartUtc: string,
  windowEndUtc: string,
): Promise<PostDraftRow[]> {
  const { data, error } = await client
    .schema("m" as never)
    .from("post_draft")
    .select(
      "post_draft_id, client_id, platform, created_at, approval_status, slot_id, scheduled_for, dead_reason",
    )
    .gte("created_at", windowStartUtc)
    .lte("created_at", windowEndUtc)
    .not("client_id", "is", null)
    .not("platform", "is", null);

  if (error) throw new Error(`fetchPostDraftInWindow failed: ${error.message}`);
  return (data ?? []) as PostDraftRow[];
}

/**
 * Batch fetch m.post_draft rows by post_draft_id (slot_id downstream-capture chain).
 */
export async function fetchPostDraftsByIds(
  client: SupabaseClient,
  postDraftIds: string[],
): Promise<PostDraftRow[]> {
  if (postDraftIds.length === 0) return [];
  const { data, error } = await client
    .schema("m" as never)
    .from("post_draft")
    .select(
      "post_draft_id, client_id, platform, created_at, approval_status, slot_id, scheduled_for, dead_reason",
    )
    .in("post_draft_id", postDraftIds);

  if (error) throw new Error(`fetchPostDraftsByIds failed: ${error.message}`);
  return (data ?? []) as PostDraftRow[];
}

/**
 * Query existing r.ice_publication_evidence rows by expected_publication_id.
 * R2 v1.1 requires preserving created_by_run_id on UPDATE path; caller uses this set
 * to split INSERT-path vs UPDATE-path payloads.
 */
export async function fetchExistingEvidenceIds(
  client: SupabaseClient,
  expectedPublicationIds: string[],
): Promise<Set<string>> {
  if (expectedPublicationIds.length === 0) return new Set();
  const { data, error } = await client
    .schema("r" as never)
    .from("ice_publication_evidence")
    .select("expected_publication_id")
    .in("expected_publication_id", expectedPublicationIds);

  if (error) throw new Error(`fetchExistingEvidenceIds failed: ${error.message}`);
  return new Set(
    (data ?? []).map((r: { expected_publication_id: string }) => r.expected_publication_id),
  );
}

/**
 * Batch UPSERT r.ice_publication_evidence rows.
 *
 * R2 v1.1 semantics — caller must call this helper twice when both INSERT and UPDATE rows exist:
 *   - INSERT payload: every row includes created_by_run_id + updated_by_run_id (both = current run_id).
 *   - UPDATE payload: every row omits created_by_run_id from the object literal so PostgREST does
 *     NOT include it in the SET clause of `ON CONFLICT (expected_publication_id) DO UPDATE`;
 *     existing column value is preserved. updated_by_run_id IS set (= current run_id).
 *
 * Splitting into two homogeneous-shape calls (rather than one mixed-shape call) avoids PostgREST
 * inferring the column set from the first row's keys and applying it to subsequent rows.
 */
export async function upsertEvidence(
  client: SupabaseClient,
  rows: EvidenceRow[],
): Promise<{ count: number }> {
  if (rows.length === 0) return { count: 0 };
  const { data, error } = await client
    .schema("r" as never)
    .from("ice_publication_evidence")
    .upsert(rows, { onConflict: "expected_publication_id" })
    .select("ice_publication_evidence_id");

  if (error) throw new Error(`upsertEvidence failed: ${error.message}`);
  return { count: data?.length ?? 0 };
}
