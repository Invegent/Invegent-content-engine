// Pure-function helpers for ice-evidence-materialiser. No DB access here.
//
// Brief: docs/briefs/cc-0010B-ice-evidence-materialiser.md @ v1.3 commit 1b0bbff7
//
// v1.3 guardrail: slot_id is downstream-captured from matched m.post_draft.slot_id only.
// No upstream slot_id reference on r.expected_publication (column does not exist).

/** ICE pipeline_state CHECK enum (cc-0010A v1.5 §2.1). */
export type PipelineState = "drafted" | "queued" | "attempted" | "published" | "failed";

/** RunMode for r.reconciliation_run.run_type / trigger mapping. */
export type RunMode = "manual" | "scheduled" | "backfill";

/**
 * r.expected_publication projection used by materialiser.
 *
 * v1.3 guardrail: NO slot_id field — that column does not exist on r.expected_publication
 * per live-schema verification 2026-05-12. The materialiser must not SELECT, JOIN, WHERE,
 * or condition on r.expected_publication.slot_id. slot_id is captured downstream from
 * matched m.post_draft.slot_id only.
 */
export interface ExpectedPublicationRow {
  expected_publication_id: string;
  client_id: string;
  platform: string;
  cadence_rule_id: string;
  expected_local_date: string;
  expected_window_start: string;
  expected_window_end: string;
  expected_format: string | null;
  expected_status: string;
}

export interface PostPublishRow {
  post_publish_id: string;
  post_draft_id: string;
  queue_id: string | null;
  client_id: string;
  platform: string;
  published_at: string;
  status: string;
  platform_post_id: string | null;
  error: string | null;
  destination_id: string | null;
  attempt_no: number;
}

export interface PostPublishQueueRow {
  queue_id: string;
  post_draft_id: string | null;
  client_id: string;
  platform: string;
  status: string | null;
  scheduled_for: string;
  last_error: string | null;
  dead_reason: string | null;
  attempt_count: number | null;
  last_error_code: number | null;
  last_error_at: string | null;
}

export interface PostDraftRow {
  post_draft_id: string;
  client_id: string;
  platform: string;
  created_at: string;
  approval_status: string;
  slot_id: string | null;
  scheduled_for: string | null;
  dead_reason: string | null;
}

/**
 * r.ice_publication_evidence row payload for UPSERT.
 *
 * R2 v1.1 semantics — created_by_run_id is optional in the type so UPDATE-path payloads can
 * omit it (PostgREST preserves existing value when field is absent from payload). INSERT-path
 * payloads include both run-id fields.
 */
export interface EvidenceRow {
  expected_publication_id: string;
  pipeline_state: PipelineState;
  post_draft_id: string | null;
  post_publish_queue_id: string | null;
  post_publish_id: string | null;
  slot_id: string | null;
  platform_post_id: string | null;
  published_url: string | null;
  scheduled_for: string | null;
  published_at: string | null;
  failure_reason: string | null;
  raw_evidence: Record<string, unknown>;
  created_by_run_id?: string;
  updated_by_run_id: string;
}

/**
 * Sydney-local date string (YYYY-MM-DD) for a given timestamptz string.
 * Uses Intl.DateTimeFormat — DST-aware automatically.
 */
export function toSydneyLocalDate(timestamp: string | Date): string {
  const d = typeof timestamp === "string" ? new Date(timestamp) : timestamp;
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Australia/Sydney",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
}

/**
 * Build the Sydney-local-date window for the driver query.
 * windowStart = today_sydney - backfillDays; windowEnd = today_sydney + horizonDays. Inclusive.
 */
export function buildLocalWindow(
  horizonDays: number,
  backfillDays: number,
  now: Date = new Date(),
): { windowStartLocalDate: string; windowEndLocalDate: string; todayLocalDate: string } {
  const todayLocalDate = toSydneyLocalDate(now);
  const startDate = addDaysToLocalDate(todayLocalDate, -Math.abs(backfillDays));
  const endDate = addDaysToLocalDate(todayLocalDate, Math.abs(horizonDays));
  return { windowStartLocalDate: startDate, windowEndLocalDate: endDate, todayLocalDate };
}

/**
 * Build conservative UTC bounds (with ±2 day padding) covering the Sydney-local window.
 */
export function buildUtcFetchBounds(
  windowStartLocalDate: string,
  windowEndLocalDate: string,
): { windowStartUtc: string; windowEndUtc: string } {
  const pad = 2;
  const startUtc = new Date(`${addDaysToLocalDate(windowStartLocalDate, -pad)}T00:00:00Z`).toISOString();
  const endUtc = new Date(`${addDaysToLocalDate(windowEndLocalDate, pad)}T23:59:59Z`).toISOString();
  return { windowStartUtc: startUtc, windowEndUtc: endUtc };
}

/** Add (or subtract) days to a YYYY-MM-DD string; returns YYYY-MM-DD. */
export function addDaysToLocalDate(localDate: string, days: number): string {
  const [y, m, d] = localDate.split("-").map((v) => parseInt(v, 10));
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() + days);
  const yy = dt.getUTCFullYear();
  const mm = String(dt.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(dt.getUTCDate()).padStart(2, "0");
  return `${yy}-${mm}-${dd}`;
}

/**
 * Classify m.post_publish_queue.status into pipeline_state {queued, attempted, failed}.
 * Per brief §5.2: failed if status='failed' (or dead/reverted); attempted if processing-like;
 * queued otherwise (and on null).
 */
export function classifyQueueStatus(
  status: string | null,
): "queued" | "attempted" | "failed" {
  if (!status) return "queued";
  const s = status.toLowerCase();
  if (s === "failed" || s === "dead" || s === "reverted") return "failed";
  if (s === "processing" || s === "locked" || s === "in_progress" || s === "running") return "attempted";
  return "queued";
}

/**
 * Index rows by (client_id, platform, sydney_local_date(timestampField)).
 * Returns Map keyed by `${client_id}|${platform}|${syd_local_date}`. Drops rows with null keys defensively.
 */
export function indexByClientPlatformSydDate<
  T extends { client_id: string | null; platform: string | null },
>(rows: T[], getTimestamp: (r: T) => string | null): Map<string, T[]> {
  const idx = new Map<string, T[]>();
  for (const row of rows) {
    if (!row.client_id || !row.platform) continue;
    const ts = getTimestamp(row);
    if (!ts) continue;
    const sydDate = toSydneyLocalDate(ts);
    const key = `${row.client_id}|${row.platform}|${sydDate}`;
    const bucket = idx.get(key) ?? [];
    bucket.push(row);
    idx.set(key, bucket);
  }
  return idx;
}

/** Pick the row with maximum getTimestamp value (latest-wins per brief §5.2). */
export function pickLatestByTimestamp<T>(rows: T[], getTimestamp: (r: T) => string): T {
  return rows.reduce((best, cur) =>
    new Date(getTimestamp(cur)).getTime() > new Date(getTimestamp(best)).getTime() ? cur : best
  );
}

/**
 * JS-side equivalent of r.compact_raw_json (cc-0010A v1.5 §2.7 IMMUTABLE plpgsql helper).
 * Strips the same 4 keys: __internal_debug, request_headers, response_headers, full_html.
 * Semantically identical to the DB helper; avoids per-row RPC overhead. Documented deviation
 * from brief §5.2 "populate via r.compact_raw_json" — flagged for CCD review.
 */
export function compactRawEvidence(input: Record<string, unknown>): Record<string, unknown> {
  const STRIP_KEYS = new Set([
    "__internal_debug",
    "request_headers",
    "response_headers",
    "full_html",
  ]);
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(input)) {
    if (STRIP_KEYS.has(k)) continue;
    out[k] = v;
  }
  return out;
}

/**
 * Build evidence row payload for a published-state match.
 * R2 v1.1: caller passes isNewRow to decide whether to include created_by_run_id.
 *
 * published_url is left null — m.post_publish has no published_url field. cc-0010A v1.5
 * r.ice_publication_evidence.published_url is nullable; future enhancement may derive URL
 * from destination_id + platform conventions.
 *
 * F4 hotfix (path (b), 2026-05-13): post_publish_queue_id forced null in this branch.
 * `m.post_publish.queue_id` is a historical/audit pointer, NOT a live FK to
 * `m.post_publish_queue.queue_id` (94% orphan rate in production observed at Stage E
 * cron pre-fire 2026-05-13 00:30:04 UTC; 42 orphans in 7-day window). The cc-0010A v1.5
 * FK constraint `ice_publication_evidence_post_publish_queue_id_fkey` correctly rejects
 * orphan values, killing the entire UPSERT batch (all-or-nothing semantics). Queue
 * linkage is preserved only in `buildEvidenceFromQueue` where the queue row's existence
 * is guaranteed by construction. `pp.queue_id` is still captured inside `raw_evidence`
 * jsonb for forensic audit but never as the FK column value.
 */
export function buildEvidenceFromPublish(
  ep: ExpectedPublicationRow,
  pp: PostPublishRow,
  capturedSlotId: string | null,
  runId: string,
  isNewRow: boolean,
): EvidenceRow {
  const rawEvidence = compactRawEvidence({
    source: "m.post_publish",
    post_publish_id: pp.post_publish_id,
    post_draft_id: pp.post_draft_id,
    queue_id: pp.queue_id,
    platform: pp.platform,
    status: pp.status,
    attempt_no: pp.attempt_no,
    destination_id: pp.destination_id,
    error: pp.error,
  });
  const row: EvidenceRow = {
    expected_publication_id: ep.expected_publication_id,
    pipeline_state: "published",
    post_draft_id: pp.post_draft_id,
    post_publish_queue_id: null,  // F4 hotfix path (b) — pp.queue_id is historical, not live FK; see JSDoc + raw_evidence still captures it
    post_publish_id: pp.post_publish_id,
    slot_id: capturedSlotId,
    platform_post_id: pp.platform_post_id,
    published_url: null,
    scheduled_for: null,
    published_at: pp.published_at,
    failure_reason: null,
    raw_evidence: rawEvidence,
    updated_by_run_id: runId,
  };
  if (isNewRow) row.created_by_run_id = runId;
  return row;
}

/** Build evidence row for a queued/attempted/failed match (m.post_publish_queue source). */
export function buildEvidenceFromQueue(
  ep: ExpectedPublicationRow,
  q: PostPublishQueueRow,
  capturedSlotId: string | null,
  runId: string,
  isNewRow: boolean,
): EvidenceRow {
  const state = classifyQueueStatus(q.status);
  const failureReason = state === "failed" ? (q.last_error ?? q.dead_reason ?? null) : null;
  const rawEvidence = compactRawEvidence({
    source: "m.post_publish_queue",
    queue_id: q.queue_id,
    post_draft_id: q.post_draft_id,
    queue_status: q.status,
    attempt_count: q.attempt_count,
    last_error_code: q.last_error_code,
    last_error_at: q.last_error_at,
    dead_reason: q.dead_reason,
  });
  const row: EvidenceRow = {
    expected_publication_id: ep.expected_publication_id,
    pipeline_state: state,
    post_draft_id: q.post_draft_id,
    post_publish_queue_id: q.queue_id,
    post_publish_id: null,
    slot_id: capturedSlotId,
    platform_post_id: null,
    published_url: null,
    scheduled_for: q.scheduled_for,
    published_at: null,
    failure_reason: failureReason,
    raw_evidence: rawEvidence,
    updated_by_run_id: runId,
  };
  if (isNewRow) row.created_by_run_id = runId;
  return row;
}

/** Build evidence row for a drafted-only match (m.post_draft source). */
export function buildEvidenceFromDraft(
  ep: ExpectedPublicationRow,
  d: PostDraftRow,
  runId: string,
  isNewRow: boolean,
): EvidenceRow {
  const rawEvidence = compactRawEvidence({
    source: "m.post_draft",
    post_draft_id: d.post_draft_id,
    approval_status: d.approval_status,
    scheduled_for: d.scheduled_for,
    dead_reason: d.dead_reason,
  });
  const row: EvidenceRow = {
    expected_publication_id: ep.expected_publication_id,
    pipeline_state: "drafted",
    post_draft_id: d.post_draft_id,
    post_publish_queue_id: null,
    post_publish_id: null,
    slot_id: d.slot_id,
    platform_post_id: null,
    published_url: null,
    scheduled_for: d.scheduled_for,
    published_at: null,
    failure_reason: null,
    raw_evidence: rawEvidence,
    updated_by_run_id: runId,
  };
  if (isNewRow) row.created_by_run_id = runId;
  return row;
}
