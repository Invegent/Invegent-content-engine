/**
 * cc-0011 cadence-drift-checker — pure functions.
 *
 * Scope per brief §5.2 (v1.2) + PK Stage B directive overrides:
 *  - Per-row drift classification (late / missing) from expected_publication × ice_publication_evidence × reconciliation_match.
 *  - Aggregate drift classification (cadence_anomaly / observer_stale) from refreshed MVs + cadence_rule.
 *  - L53 assertUuid fail-fast at every FK-source row construction site (≥3 call sites — drift_check_run_id +
 *    created_by_run_id + updated_by_run_id + expected_publication_id + client_id, depending on row shape).
 *  - PK Stage B directive #4: NO writes to r.expected_publication.expected_status this version.
 *    drift_type='late' and drift_type='missing' findings are LOG-ONLY in v1 (drift_log row only;
 *    no expected_status transition). The late_transitions counter in summary_json reflects this and
 *    is always 0 in v1. Late-state UPDATE is deferred to a future cc-0011 v2 amendment.
 *  - PK Stage B directive #6: MV refresh runs BEFORE drift evaluation (handled in index.ts), so the
 *    classifyAggregateAnomalies / classifyObserverStale inputs read from freshly-refreshed views,
 *    not stale-from-prior-run state.
 *  - Brief §10.3 race tolerance: even though v1 doesn't UPDATE expected_status, future versions
 *    must include the `WHERE expected_status='expected'` pre-filter pattern in their UPDATE path
 *    to avoid stomping concurrent cron 84 matcher writes.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

// =============================================================================
// L53: UUID assertion (fail-fast at row-construction time)
// =============================================================================

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function assertUuid(value: unknown, fieldName: string): string {
  if (typeof value !== "string" || !UUID_RE.test(value)) {
    throw new Error(
      `cc-0011 L53 assertUuid: field '${fieldName}' is not a valid UUID: received ${JSON.stringify(value)}`,
    );
  }
  return value;
}

// =============================================================================
// Domain types
// =============================================================================

export type DriftType = "late" | "missing" | "cadence_anomaly" | "observer_stale";
export type DriftSeverity = "info" | "warn" | "critical";
export type RunMode = "manual" | "scheduled" | "backfill";

export interface ExpectedPublicationRow {
  expected_publication_id: string;
  client_id: string;
  platform: string;
  expected_local_date: string;
  expected_window_start: string;
  expected_window_end: string;
  expected_status: string;
  matched_match_id: string | null;
  matched_at: string | null;
  created_at: string;
}

export interface EvidenceRow {
  ice_publication_evidence_id: string;
  expected_publication_id: string;
  pipeline_state: string;
  published_at: string | null;
  created_at: string;
}

export interface MatchRow {
  reconciliation_match_id: string;
  expected_publication_id: string;
  matched_evidence_id: string | null;
  delta_minutes_late: number | null;
  override_by: string | null;
  created_at: string;
}

export interface MatcherConfigRow {
  matcher_config_id: string;
  client_id: string | null;
  platform: string | null;
  minutes_late_tolerance: number;
}

export interface MatrixRow {
  client_id: string;
  platform: string;
  expected_local_date: string;
  count_expected: number;
  count_matched: number;
  count_late: number;
  count_suppressed: number;
  count_cancelled: number;
  count_total: number;
  on_time_rate: number | null;
  late_rate: number | null;
}

export interface FreshnessRow {
  client_id: string;
  platform: string;
  last_evidence_at: string | null;
  last_match_at: string | null;
  last_drift_log_at: string | null;
  evidence_count_7d: number;
  match_count_7d: number;
  drift_warn_critical_count_7d: number;
  freshness_status: string;
}

export interface CadenceRuleRow {
  client_id: string;
  platform: string;
  expected_posts_per_week: number | null;
}

export interface DriftFindingRowInsert {
  drift_check_run_id: string;
  client_id: string;
  platform: string;
  drift_type: DriftType;
  drift_severity: DriftSeverity;
  observation_window_start: string;
  observation_window_end: string;
  expected_publication_id: string | null;
  observed_count: number | null;
  expected_count: number | null;
  drift_details: Record<string, unknown>;
  created_by_run_id: string;
  updated_by_run_id: string;
}

export interface DriftClassificationOutput {
  drift_type: DriftType;
  drift_severity: DriftSeverity;
  drift_details: Record<string, unknown>;
  observed_count?: number;
  expected_count?: number;
}
// =============================================================================
// Window helpers
// =============================================================================

/**
 * Derive observation window in Sydney-local dates per cc-0011 brief §3.
 * Returns inclusive [start, end] for filtering r.expected_publication.expected_local_date.
 */
export function computeDriftWindow(
  nowUtc: Date,
  observationWindowDays: number,
): { today_local: string; observation_window_start: string; observation_window_end: string } {
  // Sydney is UTC+10 (AEST) or UTC+11 (AEDT). For simplicity in window math, use UTC+10
  // which is the parent cc-0009 + cc-0010A convention. Any single-day boundary effects
  // at DST transitions are accepted as v1 variance.
  const sydneyOffsetMs = 10 * 60 * 60 * 1000;
  const todaySydney = new Date(nowUtc.getTime() + sydneyOffsetMs);
  const todayLocal = todaySydney.toISOString().slice(0, 10);

  const windowStart = new Date(todaySydney.getTime() - observationWindowDays * 24 * 60 * 60 * 1000);
  const observationWindowStart = windowStart.toISOString().slice(0, 10);

  return {
    today_local: todayLocal,
    observation_window_start: observationWindowStart,
    observation_window_end: todayLocal,
  };
}

// =============================================================================
// Matcher config resolution (global default only in v1 per brief §1.2 out-of-scope)
// =============================================================================

export function resolveLateToleranceMinutes(configs: MatcherConfigRow[]): number {
  const global = configs.find((c) => c.client_id === null && c.platform === null);
  if (!global) {
    throw new Error(
      "cc-0011: r.matcher_config global default row (client_id IS NULL AND platform IS NULL) not found. " +
        "cc-0010A v1.5 should have seeded it at Stage A. Halting.",
    );
  }
  return global.minutes_late_tolerance;
}

// =============================================================================
// Per-row drift classification (late / missing)
// PK Stage B directive #4: log-only — no expected_status writes in v1.
// =============================================================================

const HOUR_MS = 60 * 60 * 1000;
const MIN_MS = 60 * 1000;

export interface PerRowClassifyInput {
  ep: ExpectedPublicationRow;
  evidence: EvidenceRow[]; // all evidence rows for this expected_publication_id
  match: MatchRow | null; // matching reconciliation_match row, if any
  lateToleranceMinutes: number;
  nowUtc: Date;
}

export function classifyExpectedRow(input: PerRowClassifyInput): DriftClassificationOutput | null {
  const { ep, evidence, match, lateToleranceMinutes, nowUtc } = input;

  // Terminal states — no drift classification needed.
  if (ep.expected_status === "matched" || ep.expected_status === "suppressed" || ep.expected_status === "cancelled") {
    return null;
  }

  // If already in 'late' or 'missed' state from a prior cc-0011 run or out-of-band write, still emit a log row
  // for the current observation window (drift findings accumulate per-run; downstream consumers can dedup by
  // (drift_check_run_id, expected_publication_id, drift_type)). For v1 we keep this simple.

  const windowEndUtc = new Date(`${ep.expected_window_end}T00:00:00Z`).getTime();
  if (Number.isNaN(windowEndUtc)) {
    // Defensive: malformed timestamp. Caller logs as skipped_other; classification returns null.
    return null;
  }

  const toleranceMs = lateToleranceMinutes * MIN_MS;
  const toleranceCutoffUtc = windowEndUtc + toleranceMs;
  const past24hCutoffUtc = windowEndUtc + 24 * HOUR_MS;
  const nowMs = nowUtc.getTime();

  // Within tolerance — no drift; the matcher (cc-0010C) is responsible for matching.
  if (nowMs <= toleranceCutoffUtc) {
    return null;
  }

  // If we have a recorded match (cc-0010C wrote one) — the matcher already handled it; no drift for cc-0011 to log.
  if (match) {
    return null;
  }

  // Determine if any evidence row is "within tolerance" published evidence.
  const hasWithinToleranceEvidence = evidence.some((ipe) => {
    if (ipe.pipeline_state !== "published") return false;
    if (!ipe.published_at) return false;
    const pubMs = Date.parse(ipe.published_at);
    if (Number.isNaN(pubMs)) return false;
    return pubMs <= toleranceCutoffUtc;
  });

  if (hasWithinToleranceEvidence) {
    // Edge case: published within tolerance but no reconciliation_match row exists yet.
    // The matcher will pick this up at its next :15/:45 fire; not a drift finding.
    return null;
  }

  // No within-tolerance evidence. Classify as missing or late based on whether ANY evidence rows exist.
  if (evidence.length === 0) {
    // Past tolerance + zero evidence rows.
    if (nowMs > past24hCutoffUtc) {
      return {
        drift_type: "missing",
        drift_severity: "critical",
        drift_details: {
          tolerance_minutes: lateToleranceMinutes,
          window_end_utc: new Date(windowEndUtc).toISOString(),
          observed_minutes_past_window_end: Math.round((nowMs - windowEndUtc) / MIN_MS),
        },
      };
    }
    // Past tolerance, < 24h since window end, no evidence — classify as late (still recoverable).
    return {
      drift_type: "late",
      drift_severity: "warn",
      drift_details: {
        tolerance_minutes: lateToleranceMinutes,
        window_end_utc: new Date(windowEndUtc).toISOString(),
        observed_minutes_past_window_end: Math.round((nowMs - windowEndUtc) / MIN_MS),
        evidence_kind: "none",
      },
    };
  }

  // Evidence exists but none within tolerance — classify as late.
  const latestPub = evidence
    .filter((ipe) => ipe.pipeline_state === "published" && ipe.published_at !== null)
    .map((ipe) => Date.parse(ipe.published_at!))
    .filter((t) => !Number.isNaN(t))
    .reduce((acc, t) => (t > acc ? t : acc), -Infinity);

  return {
    drift_type: "late",
    drift_severity: "warn",
    drift_details: {
      tolerance_minutes: lateToleranceMinutes,
      window_end_utc: new Date(windowEndUtc).toISOString(),
      observed_minutes_past_window_end: Math.round((nowMs - windowEndUtc) / MIN_MS),
      evidence_kind: latestPub > -Infinity ? "published_beyond_tolerance" : "non_published_states_only",
      latest_published_at_utc: latestPub > -Infinity ? new Date(latestPub).toISOString() : null,
      evidence_count: evidence.length,
    },
  };
}
// =============================================================================
// Aggregate classification: cadence_anomaly (per (client, platform) over 7d window)
// PK Stage B directive #6: input is read from r.mv_reconciliation_daily_matrix which has been
// refreshed at start of run (not stale-from-prior-run).
// =============================================================================

export interface AggregateAnomalyInput {
  matrixRows: MatrixRow[];
  cadenceRules: CadenceRuleRow[];
}

export function classifyAggregateAnomalies(input: AggregateAnomalyInput): Array<{
  client_id: string;
  platform: string;
  classification: DriftClassificationOutput;
}> {
  const { matrixRows, cadenceRules } = input;
  const results: Array<{ client_id: string; platform: string; classification: DriftClassificationOutput }> = [];

  // Index cadence rules by (client_id, platform).
  const ruleByKey = new Map<string, CadenceRuleRow>();
  for (const rule of cadenceRules) {
    if (rule.expected_posts_per_week == null) continue;
    ruleByKey.set(`${rule.client_id}::${rule.platform}`, rule);
  }

  // Group matrix rows by (client_id, platform) and sum the past-7-day matched count.
  const matchedByKey = new Map<string, { client_id: string; platform: string; matched_7d: number; total_7d: number }>();
  for (const m of matrixRows) {
    const key = `${m.client_id}::${m.platform}`;
    const existing = matchedByKey.get(key);
    if (existing) {
      existing.matched_7d += m.count_matched;
      existing.total_7d += m.count_total;
    } else {
      matchedByKey.set(key, {
        client_id: m.client_id,
        platform: m.platform,
        matched_7d: m.count_matched,
        total_7d: m.count_total,
      });
    }
  }

  for (const [key, agg] of matchedByKey.entries()) {
    const rule = ruleByKey.get(key);
    if (!rule || rule.expected_posts_per_week == null) continue;

    const expectedWeekly = rule.expected_posts_per_week;
    const observedWeekly = agg.matched_7d;
    const deviation = Math.abs(observedWeekly - expectedWeekly);

    if (deviation < 1) continue; // <1 unit deviation — not classified

    let severity: DriftSeverity;
    if (deviation <= 1) severity = "info";
    else if (deviation <= 3) severity = "warn";
    else severity = "critical";

    results.push({
      client_id: agg.client_id,
      platform: agg.platform,
      classification: {
        drift_type: "cadence_anomaly",
        drift_severity: severity,
        observed_count: observedWeekly,
        expected_count: expectedWeekly,
        drift_details: {
          deviation_units: deviation,
          observation_window_7d_total_rows: agg.total_7d,
          rule_expected_posts_per_week: expectedWeekly,
        },
      },
    });
  }

  return results;
}

// =============================================================================
// Aggregate classification: observer_stale (per (client, platform) freshness check)
// PK Stage B directive #6: input is read from r.mv_observer_freshness_summary which has been
// refreshed at start of run.
// =============================================================================

export interface ObserverStaleInput {
  freshnessRows: FreshnessRow[];
  staleThresholdHours: number; // default 48 per brief §3.1
  nowUtc: Date;
}

export function classifyObserverStale(input: ObserverStaleInput): Array<{
  client_id: string;
  platform: string;
  classification: DriftClassificationOutput;
}> {
  const { freshnessRows, staleThresholdHours, nowUtc } = input;
  const results: Array<{ client_id: string; platform: string; classification: DriftClassificationOutput }> = [];
  const staleCutoffUtc = nowUtc.getTime() - staleThresholdHours * HOUR_MS;

  for (const f of freshnessRows) {
    if (!f.last_evidence_at) {
      // No evidence ever — classify as observer_stale (info severity, since this may just be a new (client, platform) tuple).
      results.push({
        client_id: f.client_id,
        platform: f.platform,
        classification: {
          drift_type: "observer_stale",
          drift_severity: "info",
          drift_details: {
            last_evidence_at: null,
            freshness_status: f.freshness_status,
            evidence_count_7d: f.evidence_count_7d,
            reason: "no_evidence_ever",
          },
        },
      });
      continue;
    }

    const lastMs = Date.parse(f.last_evidence_at);
    if (Number.isNaN(lastMs)) continue;
    if (lastMs >= staleCutoffUtc) continue; // within threshold — no drift

    results.push({
      client_id: f.client_id,
      platform: f.platform,
      classification: {
        drift_type: "observer_stale",
        drift_severity: "warn",
        drift_details: {
          last_evidence_at: f.last_evidence_at,
          freshness_status: f.freshness_status,
          stale_threshold_hours: staleThresholdHours,
          hours_since_last_evidence: Math.round((nowUtc.getTime() - lastMs) / HOUR_MS),
          evidence_count_7d: f.evidence_count_7d,
        },
      },
    });
  }

  return results;
}

// =============================================================================
// Drift-log row construction with R2 stamping + L53 assertUuid at FK source columns.
// =============================================================================

export interface BuildDriftLogRowsInput {
  perRowFindings: Array<{ ep: ExpectedPublicationRow; classification: DriftClassificationOutput }>;
  aggregateCadenceAnomalies: Array<{ client_id: string; platform: string; classification: DriftClassificationOutput }>;
  aggregateObserverStale: Array<{ client_id: string; platform: string; classification: DriftClassificationOutput }>;
  runId: string;
  observationWindowStart: string;
  observationWindowEnd: string;
}

export function buildDriftLogRowsForInsert(input: BuildDriftLogRowsInput): DriftFindingRowInsert[] {
  const { perRowFindings, aggregateCadenceAnomalies, aggregateObserverStale, runId, observationWindowStart, observationWindowEnd } = input;

  // L53: assert run UUID once at the top — every row will reuse this asserted value (R2 stamping).
  const assertedRunId = assertUuid(runId, "drift_check_run_id");

  const rows: DriftFindingRowInsert[] = [];

  // Per-row findings — drift_type IN ('late','missing'); expected_publication_id required (CHECK cadence_drift_log_per_row_drift_has_ep).
  for (const f of perRowFindings) {
    rows.push({
      drift_check_run_id: assertedRunId,
      client_id: assertUuid(f.ep.client_id, "client_id"),
      platform: f.ep.platform,
      drift_type: f.classification.drift_type,
      drift_severity: f.classification.drift_severity,
      observation_window_start: observationWindowStart,
      observation_window_end: observationWindowEnd,
      expected_publication_id: assertUuid(f.ep.expected_publication_id, "expected_publication_id"),
      observed_count: f.classification.observed_count ?? null,
      expected_count: f.classification.expected_count ?? null,
      drift_details: f.classification.drift_details,
      created_by_run_id: assertedRunId, // R2 stamping
      updated_by_run_id: assertedRunId, // R2 stamping
    });
  }

  // Aggregate findings — drift_type IN ('cadence_anomaly','observer_stale'); expected_publication_id MUST be null (CHECK cadence_drift_log_per_row_drift_has_ep).
  for (const a of aggregateCadenceAnomalies) {
    rows.push({
      drift_check_run_id: assertedRunId,
      client_id: assertUuid(a.client_id, "client_id"),
      platform: a.platform,
      drift_type: a.classification.drift_type,
      drift_severity: a.classification.drift_severity,
      observation_window_start: observationWindowStart,
      observation_window_end: observationWindowEnd,
      expected_publication_id: null,
      observed_count: a.classification.observed_count ?? null,
      expected_count: a.classification.expected_count ?? null,
      drift_details: a.classification.drift_details,
      created_by_run_id: assertedRunId,
      updated_by_run_id: assertedRunId,
    });
  }

  for (const a of aggregateObserverStale) {
    rows.push({
      drift_check_run_id: assertedRunId,
      client_id: assertUuid(a.client_id, "client_id"),
      platform: a.platform,
      drift_type: a.classification.drift_type,
      drift_severity: a.classification.drift_severity,
      observation_window_start: observationWindowStart,
      observation_window_end: observationWindowEnd,
      expected_publication_id: null,
      observed_count: a.classification.observed_count ?? null,
      expected_count: a.classification.expected_count ?? null,
      drift_details: a.classification.drift_details,
      created_by_run_id: assertedRunId,
      updated_by_run_id: assertedRunId,
    });
  }

  return rows;
}

// =============================================================================
// Summary helpers (build summary_json + drift_findings/drift_severity histograms)
// =============================================================================

export function buildDriftFindingsHistogram(rows: DriftFindingRowInsert[]): Record<DriftType, number> {
  const h: Record<DriftType, number> = { late: 0, missing: 0, cadence_anomaly: 0, observer_stale: 0 };
  for (const r of rows) h[r.drift_type] += 1;
  return h;
}

export function buildDriftSeverityHistogram(rows: DriftFindingRowInsert[]): Record<DriftSeverity, number> {
  const h: Record<DriftSeverity, number> = { info: 0, warn: 0, critical: 0 };
  for (const r of rows) h[r.drift_severity] += 1;
  return h;
}