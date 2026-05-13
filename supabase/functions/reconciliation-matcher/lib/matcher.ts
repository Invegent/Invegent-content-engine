// Pure-function helpers for reconciliation-matcher. No DB access here.
//
// Brief: docs/briefs/cc-0010C-reconciliation-matcher.md @ v1 commit 8204ab540a0775034b927e8c86d4cb255e8ace26
// cc-0010A v1.5 r.* foundation applied 2026-05-12 via cc_0010a_r_evidence_matcher_schema_foundation
// cc-0010B v1.3 ice-evidence-materialiser EF v2 ACTIVE post-F4-hotfix (commit 62f319c8554b25ee06cf680bc548cf87f24521ba)
//
// Tier-1 scope lock (brief §1.2 + §5.2):
//   - matched_evidence_kind hardcoded to 'ice'.
//   - matched_match_tier hardcoded to 1.
//   - matched_confidence hardcoded to 1.000.
//   - No reference to r.platform_observation or r.platform_manual_observation in this module.
//   - No status transition to 'late' (deferred per brief §1.2 + §13 #3).
//
// D-21 hard lock (brief §5.2 step 5–6):
//   - Existing r.reconciliation_match rows with override_by IS NOT NULL are pre-filtered out
//     of both insert + update payloads upstream in index.ts/db.ts before this module's
//     planMatcherPass is called via the existingMatchByExpected map carrying override_by status.
//   - The brief's literal WHERE-clause-on-conflict-update is achieved via the pre-filter pattern
//     (PostgREST does not support WHERE on the UPDATE side of upsert natively).
//
// R2 run-id stamping (brief §5.2 step 6 + V12 + V14):
//   - INSERT path: matcher_run_id + created_by_run_id + updated_by_run_id all set = current run_id.
//   - UPDATE path: matcher_run_id + updated_by_run_id set = current run_id;
//                  created_by_run_id PRESERVED via payload omission (PostgREST infers SET clause
//                  from row keys, so omitted keys are not touched on UPDATE-path payloads).
//
// L53 FK source-column-type protections:
//   - All UUID-typed fields are typed as `string` in TS interfaces (never `unknown`/`any`).
//   - All UUIDs written into r.reconciliation_match originate from PG-returned uuid columns
//     (r.expected_publication.expected_publication_id PK, r.ice_publication_evidence.ice_publication_evidence_id PK,
//     r.reconciliation_run.reconciliation_run_id PK). No body-supplied UUIDs are accepted.
//   - assertUuid() throws fail-fast at row-construction time on any null/undefined/empty value.
//   - All r.reconciliation_match write columns map 1:1 with the cc-0010A v1.5 declared types.

/** Run trigger mapping (matches the cc-0010B precedent). */
export type RunMode = "manual" | "scheduled" | "backfill";

/** ICE pipeline_state CHECK enum (cc-0010A v1.5 §2.1) — read-only consumption here. */
export type PipelineState = "drafted" | "queued" | "attempted" | "published" | "failed";

/**
 * r.expected_publication projection used by matcher.
 * Read-only here — never mutated except via the explicit UPDATE in db.ts.
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

/**
 * r.ice_publication_evidence projection used by matcher.
 * cc-0010C reads only the columns needed for Tier-1 delta computation + payload construction.
 */
export interface IceEvidenceRow {
  ice_publication_evidence_id: string;
  expected_publication_id: string;
  pipeline_state: PipelineState;
  published_at: string | null;
  scheduled_for: string | null;
}

/**
 * r.matcher_config projection (cc-0010A v1.5 §2.6).
 * v1 only consumes minutes_late_tolerance for Tier-1 matched-only gate.
 * Other columns retained for future amendment (per-client overrides, fuzzy-tier deltas).
 */
export interface MatcherConfigRow {
  client_id: string | null;
  platform: string | null;
  minutes_late_tolerance: number;
  caption_prefix_length: number;
  same_day_window_hours: number;
  fuzzy_levenshtein_threshold: number;
}

/**
 * Existing r.reconciliation_match projection used for D-21 + insert/update split.
 * reconciliation_match_id is the PK; override_by null status drives D-21 gate.
 */
export interface ExistingMatchRow {
  reconciliation_match_id: string;
  expected_publication_id: string;
  override_by: string | null;
}

/**
 * r.reconciliation_match INSERT-path payload (R2: includes created_by_run_id).
 * Field shape matches cc-0010A v1.5 §2.4 column declarations exactly.
 */
export interface MatchInsertRow {
  expected_publication_id: string;
  matched_evidence_kind: "ice";
  matched_evidence_id: string;
  matched_match_tier: 1;
  matched_confidence: 1.0;
  delta_minutes_late: number | null;
  matcher_run_id: string;
  created_by_run_id: string;
  updated_by_run_id: string;
}

/**
 * r.reconciliation_match UPDATE-path payload (R2: OMITS created_by_run_id).
 * PostgREST infers SET clause from object keys; omitting created_by_run_id preserves
 * the column's existing value on the UPDATE-on-conflict side.
 */
export interface MatchUpdateRow {
  expected_publication_id: string;
  matched_evidence_kind: "ice";
  matched_evidence_id: string;
  matched_match_tier: 1;
  matched_confidence: 1.0;
  delta_minutes_late: number | null;
  matcher_run_id: string;
  updated_by_run_id: string;
}

/** Skip-reason histogram per brief §5.1 response shape. */
export interface SkipReasonCounters {
  skipped_no_evidence: number;
  skipped_evidence_not_published: number;
  skipped_late_beyond_tolerance: number;
  skipped_override_protected: number;
  skipped_other: number;
}

export interface MatchPlanResult {
  inserts: MatchInsertRow[];
  updates: MatchUpdateRow[];
  skipped: SkipReasonCounters;
  /** Map of expected_publication_id -> last computed delta_minutes_late (for log/audit). */
  deltaByExpected: Map<string, number | null>;
}
/**
 * L53 fail-fast guard for any UUID-shaped string.
 * Accepts canonical 36-char UUID form with hyphens; case-insensitive.
 * Throws on null, undefined, empty, or non-UUID-shaped input.
 */
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export function assertUuid(label: string, value: unknown): string {
  if (typeof value !== "string" || value.length === 0) {
    throw new Error(`L53 guard: ${label} must be non-empty string uuid, got ${typeof value}`);
  }
  if (!UUID_RE.test(value)) {
    throw new Error(`L53 guard: ${label} not uuid-shaped (got '${value.slice(0, 64)}')`);
  }
  return value;
}

/**
 * Compute delta_minutes_late per brief §5.2 step 3:
 *   delta = GREATEST(0, EXTRACT(EPOCH FROM (ipe.published_at - ep.expected_window_end)) / 60)::int
 *
 * Returns null when published_at is null (brief §13 #7 — log + surface; do not block).
 * Otherwise returns a non-negative integer (clamped to 0 if early publish).
 */
export function computeDeltaMinutesLate(
  publishedAtIso: string | null,
  expectedWindowEndIso: string,
): number | null {
  if (publishedAtIso === null) return null;
  const publishedAt = Date.parse(publishedAtIso);
  const windowEnd = Date.parse(expectedWindowEndIso);
  if (Number.isNaN(publishedAt) || Number.isNaN(windowEnd)) {
    throw new Error(
      `computeDeltaMinutesLate: invalid timestamp(s) publishedAt='${publishedAtIso}' windowEnd='${expectedWindowEndIso}'`,
    );
  }
  const diffMinutes = (publishedAt - windowEnd) / 60000;
  return Math.max(0, Math.round(diffMinutes));
}

/**
 * Resolve minutes_late_tolerance for an (expected.client_id, expected.platform) pair via the
 * brief §5.2 step 2 lookup chain: (client, platform) -> (client, NULL) -> (NULL, NULL).
 *
 * v1 invariant: cc-0010A v1.5 inserted exactly 1 global default row with client_id=NULL,
 * platform=NULL, minutes_late_tolerance=60. So this function always resolves the global
 * default until per-client overrides land (out of v1 scope per brief §1.2 + §13 #6).
 *
 * Throws if no row matches at all (pre-flight §4.8 guarantees the global default exists).
 */
export function resolveLateTolerance(
  configRows: MatcherConfigRow[],
  expected: { client_id: string; platform: string },
): number {
  // Most specific first.
  const exact = configRows.find(
    (c) => c.client_id === expected.client_id && c.platform === expected.platform,
  );
  if (exact) return exact.minutes_late_tolerance;

  const clientOnly = configRows.find(
    (c) => c.client_id === expected.client_id && c.platform === null,
  );
  if (clientOnly) return clientOnly.minutes_late_tolerance;

  const global = configRows.find((c) => c.client_id === null && c.platform === null);
  if (global) return global.minutes_late_tolerance;

  throw new Error(
    "resolveLateTolerance: no matcher_config row resolves (expected at least the global default; check cc-0010A v1.5 Stage A close)",
  );
}

/**
 * Plan the matcher pass over a candidate set.
 *
 * Inputs:
 *   - expectedRows: r.expected_publication rows in window with expected_status IN ('expected','backfilled').
 *   - evidenceByExpected: Map<expected_publication_id, IceEvidenceRow[]>; the materialiser
 *     guarantees UNIQUE(expected_publication_id), so each value array has length <= 1.
 *     Empty/missing key means no evidence row exists.
 *   - existingMatchByExpected: Map<expected_publication_id, ExistingMatchRow> (D-21 gate input).
 *   - configRows: r.matcher_config rows (lookup chain).
 *   - runId: current Stage E reconciliation_run row id (R2 stamping source).
 *
 * Returns: planned insert + update payloads, skip-reason histogram, delta map.
 *
 * Pure function — no DB access, no side effects.
 */
export function planMatcherPass(input: {
  expectedRows: ExpectedPublicationRow[];
  evidenceByExpected: Map<string, IceEvidenceRow[]>;
  existingMatchByExpected: Map<string, ExistingMatchRow>;
  configRows: MatcherConfigRow[];
  runId: string;
}): MatchPlanResult {
  const { expectedRows, evidenceByExpected, existingMatchByExpected, configRows, runId } = input;

  // L53: validate run-id shape up front (single fail-fast for entire pass).
  assertUuid("runId", runId);

  const inserts: MatchInsertRow[] = [];
  const updates: MatchUpdateRow[] = [];
  const skipped: SkipReasonCounters = {
    skipped_no_evidence: 0,
    skipped_evidence_not_published: 0,
    skipped_late_beyond_tolerance: 0,
    skipped_override_protected: 0,
    skipped_other: 0,
  };
  const deltaByExpected = new Map<string, number | null>();

  // Brief §5.2 deterministic order: by expected_publication_id ascending.
  const ordered = [...expectedRows].sort((a, b) =>
    a.expected_publication_id < b.expected_publication_id ? -1 : 1
  );

  for (const ep of ordered) {
    // L53: pre-validate the candidate row's uuids before we touch them.
    assertUuid("ep.expected_publication_id", ep.expected_publication_id);

    // D-21: an existing match row carrying a non-null override_by is fully sticky.
    // Skip without write — neither r.reconciliation_match nor r.expected_publication is touched.
    const existing = existingMatchByExpected.get(ep.expected_publication_id);
    if (existing && existing.override_by !== null) {
      skipped.skipped_override_protected += 1;
      continue;
    }

    const evidenceList = evidenceByExpected.get(ep.expected_publication_id) ?? [];
    if (evidenceList.length === 0) {
      skipped.skipped_no_evidence += 1;
      continue;
    }

    // Tier-1 lock: only pipeline_state='published' rows are matchable. Anything else stays
    // at expected_status='expected'/'backfilled' (cc-0011 / future v2 amendment may handle).
    const published = evidenceList.find((e) => e.pipeline_state === "published");
    if (!published) {
      skipped.skipped_evidence_not_published += 1;
      continue;
    }

    // L53: evidence row's uuid PK must be present (cc-0010A v1.5 declares it NOT NULL with
    // gen_random_uuid() DEFAULT; this guard catches drift if cc-0010B ever changes projection).
    assertUuid("evidence.ice_publication_evidence_id", published.ice_publication_evidence_id);

    const tolerance = resolveLateTolerance(configRows, ep);
    const delta = computeDeltaMinutesLate(published.published_at, ep.expected_window_end);
    deltaByExpected.set(ep.expected_publication_id, delta);

    // v1 matched-only gate (brief §5.2 step 4):
    //   - delta === null (published_at missing) is treated as "do not block, do not gate" —
    //     proceed to write per §13 #7 surfacing pattern. delta_minutes_late stays null in the row.
    //   - delta > tolerance gate skips without write.
    if (delta !== null && delta > tolerance) {
      skipped.skipped_late_beyond_tolerance += 1;
      continue;
    }

    if (existing) {
      // UPDATE-path: omit created_by_run_id so PostgREST preserves the original value.
      updates.push({
        expected_publication_id: ep.expected_publication_id,
        matched_evidence_kind: "ice",
        matched_evidence_id: published.ice_publication_evidence_id,
        matched_match_tier: 1,
        matched_confidence: 1.0,
        delta_minutes_late: delta,
        matcher_run_id: runId,
        updated_by_run_id: runId,
      });
    } else {
      // INSERT-path: stamp all three run-id columns.
      inserts.push({
        expected_publication_id: ep.expected_publication_id,
        matched_evidence_kind: "ice",
        matched_evidence_id: published.ice_publication_evidence_id,
        matched_match_tier: 1,
        matched_confidence: 1.0,
        delta_minutes_late: delta,
        matcher_run_id: runId,
        created_by_run_id: runId,
        updated_by_run_id: runId,
      });
    }
  }

  return { inserts, updates, skipped, deltaByExpected };
}
/**
 * Sydney-local date string (YYYY-MM-DD) for a given timestamptz string or Date.
 * Uses Intl.DateTimeFormat — DST-aware automatically.
 * Pattern carried verbatim from cc-0010B lib/materialiser.ts.
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
 * Build the Sydney-local-date window for the driver query.
 * windowStart = today_sydney - backfillDays; windowEnd = today_sydney + horizonDays. Inclusive.
 *
 * Per brief §5.1 v1 defaults: horizon_days=7, backfill_days=0 (today-forward only, per
 * F-CC-0009-EF-BACKFILL-HORIZON-FORWARD-ONLY Option (a) folded into matcher horizon contract).
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