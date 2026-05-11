// Pure-function helpers for cadence-rule-generator.
//
// No DB access. No I/O. All functions deterministic given their inputs.
// Unit-testable in isolation.
//
// Stage A schema:
//   r.expected_publication UNIQUE (client_id, platform, expected_local_date, cadence_rule_id)
//   — this is the R9 generator idempotency key. derivePlannedRows() emits rows
//   matching this shape exactly; lib/db.ts inserts with ON CONFLICT DO NOTHING.

export interface CadenceRule {
  cadence_rule_id: string;
  client_id: string;
  platform: "facebook" | "instagram" | "linkedin" | "youtube";
  is_active: boolean;
  weekdays: number[] | null; // ISO weekdays 1=Mon..7=Sun; null means every day
  preferred_local_times: string[]; // HH:MM:SS strings, Sydney local
  suppression_dates: string[] | null; // YYYY-MM-DD strings; rule does not fire on these dates
  expected_format: string | null;
  valid_from: string | null; // YYYY-MM-DD
  valid_to: string | null; // YYYY-MM-DD
}

export interface PublishProfile {
  client_id: string;
  platform: "facebook" | "instagram" | "linkedin" | "youtube";
  publish_enabled: boolean;
  paused_reason: string | null;
}

export interface Horizon {
  start: string; // YYYY-MM-DD (Sydney-local; today - 7)
  end: string; // YYYY-MM-DD (Sydney-local; today + 7)
  dates: string[]; // 15 entries, inclusive
}

export interface PlannedRow {
  client_id: string;
  platform: "facebook" | "instagram" | "linkedin" | "youtube";
  cadence_rule_id: string;
  expected_local_date: string; // YYYY-MM-DD
  expected_window_start: string; // ISO timestamptz
  expected_window_end: string; // ISO timestamptz
  expected_format: string | null;
  expected_status: "expected" | "suppressed";
  suppression_reason: string | null;
  notes: string | null;
  created_by_run_id: string;
  updated_by_run_id: string;
}

const SYDNEY_TZ = "Australia/Sydney";
const DEFAULT_TOLERANCE_MINUTES = 60; // matcher_config global default; r.matcher_config lives in cc-0010
const HORIZON_BACKFILL_DAYS = 7;
const HORIZON_FORWARD_DAYS = 7;

/**
 * Sydney-local "today" as YYYY-MM-DD.
 * Uses Intl.DateTimeFormat with en-CA locale (which formats as YYYY-MM-DD) for
 * deterministic ISO-style output regardless of host locale.
 */
export function todaySydney(now: Date = new Date()): string {
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone: SYDNEY_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  return fmt.format(now);
}

/**
 * Add `days` to a YYYY-MM-DD date string and return the new YYYY-MM-DD string.
 * Operates on the date label only — no timezone arithmetic, no DST shifts.
 */
export function addDays(yyyyMmDd: string, days: number): string {
  const [y, m, d] = yyyyMmDd.split("-").map(Number);
  // Use UTC math on a date constructed from the label, then format back.
  // We do this purely to avoid host-tz interference; the label semantics are tz-free.
  const date = new Date(Date.UTC(y, m - 1, d));
  date.setUTCDate(date.getUTCDate() + days);
  const yy = date.getUTCFullYear();
  const mm = String(date.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(date.getUTCDate()).padStart(2, "0");
  return `${yy}-${mm}-${dd}`;
}

/**
 * ISO weekday (1=Mon..7=Sun) for a YYYY-MM-DD date label.
 * No timezone arithmetic — pure label-based calculation.
 */
export function isoWeekday(yyyyMmDd: string): number {
  const [y, m, d] = yyyyMmDd.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  // Date.getUTCDay() returns 0=Sun..6=Sat; convert to ISO 1=Mon..7=Sun.
  const jsDay = date.getUTCDay();
  return jsDay === 0 ? 7 : jsDay;
}

/**
 * Build the 15-calendar-date inclusive horizon: today-7 .. today+7 (Sydney-local).
 */
export function buildHorizon(now: Date = new Date()): Horizon {
  const today = todaySydney(now);
  const start = addDays(today, -HORIZON_BACKFILL_DAYS);
  const end = addDays(today, HORIZON_FORWARD_DAYS);
  const dates: string[] = [];
  for (let i = -HORIZON_BACKFILL_DAYS; i <= HORIZON_FORWARD_DAYS; i++) {
    dates.push(addDays(today, i));
  }
  return { start, end, dates };
}

/**
 * Compute the timestamptz window for a (Sydney-local date, HH:MM:SS local time, tolerance) tuple.
 *
 * Implementation note: PostgreSQL would natively compute this with
 *   (date AT TIME ZONE 'Australia/Sydney') + time_offset
 * but we are emitting timestamptz strings from the EF. We compute the UTC
 * instant corresponding to (date, time) interpreted in Australia/Sydney via
 * the well-known "format in target tz, then re-parse" technique, which works
 * correctly across AEST/AEDT boundaries.
 */
export function computeWindow(
  yyyyMmDd: string,
  hhMmSs: string,
  toleranceMinutes: number,
): { start: string; end: string } {
  // Construct the wall-clock moment in Sydney and find its UTC equivalent.
  const [y, mo, d] = yyyyMmDd.split("-").map(Number);
  const [hh, mm, ss] = hhMmSs.split(":").map(Number);

  // Strategy: pick a UTC instant; format it in Sydney; if the formatted wall
  // clock matches our target wall clock, we have the correct UTC. We iterate
  // by adjusting the candidate UTC instant by the observed offset.
  // For our use case (single offset, IANA Australia/Sydney), one iteration is enough.

  // Initial guess: treat the inputs as UTC, then correct.
  let candidate = new Date(Date.UTC(y, mo - 1, d, hh, mm, ss));

  for (let iter = 0; iter < 3; iter++) {
    const parts = new Intl.DateTimeFormat("en-CA", {
      timeZone: SYDNEY_TZ,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hourCycle: "h23",
    }).formatToParts(candidate);

    const get = (type: string): number =>
      Number(parts.find((p) => p.type === type)?.value ?? "0");

    const sydY = get("year");
    const sydMo = get("month");
    const sydD = get("day");
    const sydHh = get("hour");
    const sydMm = get("minute");
    const sydSs = get("second");

    const sydUtcLike = Date.UTC(sydY, sydMo - 1, sydD, sydHh, sydMm, sydSs);
    const targetUtcLike = Date.UTC(y, mo - 1, d, hh, mm, ss);
    const diffMs = targetUtcLike - sydUtcLike;

    if (diffMs === 0) break;
    candidate = new Date(candidate.getTime() + diffMs);
  }

  const start = candidate.toISOString();
  const end = new Date(
    candidate.getTime() + toleranceMinutes * 60 * 1000,
  ).toISOString();
  return { start, end };
}

/**
 * Pure-function row derivation. Takes cadence rules + publish profiles + horizon
 * + run_id and returns the full list of planned r.expected_publication rows.
 *
 * No DB access. Caller (index.ts) passes the results to lib/db.ts for insertion.
 *
 * Rules:
 * - For each (rule × date in horizon):
 *   - Skip if rule's weekdays array does not include the date's ISO weekday
 *     (null weekdays = every day).
 *   - Skip if rule's suppression_dates includes the date.
 *   - Skip if rule.valid_from > date or rule.valid_to < date.
 *   - If publish_profile.publish_enabled is false:
 *     emit row with expected_status='suppressed', suppression_reason set.
 *   - Otherwise: emit row with expected_status='expected'.
 * - For each preferred_local_time in the rule, emit one row.
 */
export function derivePlannedRows(input: {
  rules: CadenceRule[];
  profiles: PublishProfile[];
  horizon: Horizon;
  runId: string;
}): PlannedRow[] {
  const { rules, profiles, horizon, runId } = input;
  const rows: PlannedRow[] = [];

  // Index profiles by (client_id, platform) for O(1) lookup.
  const profileMap = new Map<string, PublishProfile>();
  for (const p of profiles) {
    profileMap.set(`${p.client_id}::${p.platform}`, p);
  }

  for (const rule of rules) {
    if (!rule.is_active) continue;
    if (rule.preferred_local_times.length === 0) continue;

    const profile = profileMap.get(`${rule.client_id}::${rule.platform}`);
    const tolerance = DEFAULT_TOLERANCE_MINUTES;
    // Per cc-0009 §4.1, per-rule overrides deferred to cc-0010 matcher_config
    const suppressionSet = new Set(rule.suppression_dates ?? []);

    for (const date of horizon.dates) {
      // valid_from / valid_to gates.
      if (rule.valid_from && date < rule.valid_from) continue;
      if (rule.valid_to && date > rule.valid_to) continue;

      // weekday gate.
      if (rule.weekdays && rule.weekdays.length > 0) {
        const dow = isoWeekday(date);
        if (!rule.weekdays.includes(dow)) continue;
      }

      // explicit suppression date — skip entirely (different from paused profile).
      if (suppressionSet.has(date)) continue;

      // Determine status from publish profile.
      let expectedStatus: "expected" | "suppressed";
      let suppressionReason: string | null;
      if (profile && profile.publish_enabled === false) {
        expectedStatus = "suppressed";
        suppressionReason = `publish_profile_paused: ${
          profile.paused_reason ?? "unspecified"
        }`;
      } else {
        expectedStatus = "expected";
        suppressionReason = null;
      }

      for (const time of rule.preferred_local_times) {
        const win = computeWindow(date, time, tolerance);
        rows.push({
          client_id: rule.client_id,
          platform: rule.platform,
          cadence_rule_id: rule.cadence_rule_id,
          expected_local_date: date,
          expected_window_start: win.start,
          expected_window_end: win.end,
          expected_format: rule.expected_format,
          expected_status: expectedStatus,
          suppression_reason: suppressionReason,
          notes: `generated by cadence-rule-generator; rule=${rule.cadence_rule_id}; time=${time}`,
          created_by_run_id: runId,
          updated_by_run_id: runId,
        });
      }
    }
  }

  return rows;
}
