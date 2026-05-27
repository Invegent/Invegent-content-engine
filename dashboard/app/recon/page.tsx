import { isReconEnvConfigured, queryOp, RECON_ENV_VAR } from "../../lib/db";
import { AttentionBadge, AttentionBanner } from "../_components/AttentionBadge";
import { EmptyState, ErrorState, PageFooter } from "../_components/StateBlocks";
import {
  formatDate,
  formatNumber,
  formatPercent,
  formatRelativeMinutes,
  formatTimestamp,
} from "../_components/format";
import { TABLE, TABLE_WRAPPER, TD, TH } from "../_components/tableStyles";

// CCD-PRV-002 Path A — Platform Reconciliation View, local read-only MVP.
//
// Internal/unlinked route (not in the layout nav). Server Component. Reads the
// existing cc-0012 op.* views through the DIRECT read-only Postgres transport
// (lib/db.ts) instead of supabase-js REST, because schema `op` is not exposed to
// PostgREST (CCD-PRV-001 finding). SELECT-only; no mutation surface; reuses the
// cc-0013 shared display primitives.

export const dynamic = "force-dynamic";

const SECTION: React.CSSProperties = { marginTop: "2rem" };

// --- op.* read surfaces (SELECT-only; bigint->int, numeric->float8, time->text
// casts so pg returns predictable JS scalar types matching the row shapes). ---

const SUMMARY_SQL = `
  select
    as_of_at::text                            as as_of_at,
    window_start::text                        as window_start,
    window_end::text                          as window_end,
    total_expected_7d::int                    as total_expected_7d,
    total_matched_7d::int                     as total_matched_7d,
    total_late_7d::int                        as total_late_7d,
    total_suppressed_7d::int                  as total_suppressed_7d,
    total_cancelled_7d::int                   as total_cancelled_7d,
    on_time_rate_7d::float8                   as on_time_rate_7d,
    late_rate_7d::float8                      as late_rate_7d,
    drift_info_count_7d::int                  as drift_info_count_7d,
    drift_warn_count_7d::int                  as drift_warn_count_7d,
    drift_critical_count_7d::int              as drift_critical_count_7d,
    observer_stale_client_platform_count::int as observer_stale_client_platform_count,
    attention_needed                          as attention_needed
  from op.v_reconciliation_summary
`;

const FRESHNESS_SQL = `
  select
    client_slug                          as client_slug,
    client_id::text                      as client_id,
    platform                             as platform,
    freshness_status                     as freshness_status,
    last_evidence_at::text               as last_evidence_at,
    last_match_at::text                  as last_match_at,
    evidence_count_7d::int               as evidence_count_7d,
    match_count_7d::int                  as match_count_7d,
    drift_warn_critical_count_7d::int    as drift_warn_critical_count_7d,
    minutes_since_last_evidence          as minutes_since_last_evidence,
    observer_is_healthy                  as observer_is_healthy,
    observer_consecutive_failure_count   as observer_consecutive_failure_count,
    attention_needed                     as attention_needed,
    as_of_at::text                       as as_of_at
  from op.v_freshness_rollup
  order by attention_needed desc nulls last, last_evidence_at asc nulls first,
           client_slug asc, platform asc
`;

const DRIFT_SQL = `
  select
    created_at::text                 as created_at,
    client_slug                      as client_slug,
    client_id::text                  as client_id,
    platform                         as platform,
    drift_type                       as drift_type,
    drift_severity                   as drift_severity,
    observation_window_start::text   as observation_window_start,
    observation_window_end::text     as observation_window_end,
    observed_count                   as observed_count,
    expected_count                   as expected_count,
    is_recent                        as is_recent,
    is_actionable                    as is_actionable
  from op.v_drift_rollup
  order by is_actionable desc nulls last, created_at desc
  limit 200
`;

type SummaryRow = {
  as_of_at: string | null;
  window_start: string | null;
  window_end: string | null;
  total_expected_7d: number | null;
  total_matched_7d: number | null;
  total_late_7d: number | null;
  total_suppressed_7d: number | null;
  total_cancelled_7d: number | null;
  on_time_rate_7d: number | null;
  late_rate_7d: number | null;
  drift_info_count_7d: number | null;
  drift_warn_count_7d: number | null;
  drift_critical_count_7d: number | null;
  observer_stale_client_platform_count: number | null;
  attention_needed: boolean | null;
};

type FreshnessRow = {
  client_slug: string | null;
  client_id: string;
  platform: string;
  freshness_status: string | null;
  last_evidence_at: string | null;
  last_match_at: string | null;
  evidence_count_7d: number | null;
  match_count_7d: number | null;
  drift_warn_critical_count_7d: number | null;
  minutes_since_last_evidence: number | null;
  observer_is_healthy: boolean | null;
  observer_consecutive_failure_count: number | null;
  attention_needed: boolean | null;
  as_of_at: string | null;
};

type DriftRow = {
  created_at: string | null;
  client_slug: string | null;
  client_id: string;
  platform: string;
  drift_type: string;
  drift_severity: string;
  observation_window_start: string | null;
  observation_window_end: string | null;
  observed_count: number | null;
  expected_count: number | null;
  is_recent: boolean | null;
  is_actionable: boolean | null;
};

function observerCell(row: FreshnessRow): string {
  if (row.observer_is_healthy === true) return "healthy";
  if (row.observer_is_healthy === false) {
    return `unhealthy (${formatNumber(row.observer_consecutive_failure_count)})`;
  }
  return "—";
}

function EnvNotConfigured() {
  return (
    <main>
      <h1>Platform Reconciliation View — local read-only MVP</h1>
      <ErrorState
        message={`Read-only DB transport not configured. Set ${RECON_ENV_VAR} in dashboard/.env.local.`}
      />
      <section style={SECTION}>
        <h2>How to enable (local only)</h2>
        <ol>
          <li>
            Add <code>{RECON_ENV_VAR}</code> to <code>dashboard/.env.local</code>{" "}
            (gitignored; never commit). See <code>dashboard/.env.example</code>.
          </li>
          <li>
            Use a read-only Postgres connection string for project{" "}
            <code>mbkmaxqhsohbtwsqolns</code> (session pooler or direct). The
            transport additionally forces a read-only session, so no write can
            pass through it.
          </li>
        </ol>
        <p style={{ fontSize: "0.9rem", color: "#555" }}>
          The Supabase <strong>service-role key</strong> is an API key, not a
          Postgres credential, and must never reach the browser; a database URL
          must stay server-only and must never use a <code>NEXT_PUBLIC_</code>{" "}
          prefix. This route uses the direct Postgres transport precisely because
          schema <code>op</code> is not exposed to the REST API.
        </p>
      </section>
      <PageFooter routeNote="direct read-only Postgres → op.* (env pending)" />
    </main>
  );
}

export default async function ReconPage() {
  if (!isReconEnvConfigured()) {
    return <EnvNotConfigured />;
  }

  let summary: SummaryRow | null = null;
  let freshness: FreshnessRow[] = [];
  let drift: DriftRow[] = [];

  try {
    const [summaryRows, freshnessRows, driftRows] = await Promise.all([
      queryOp<SummaryRow>(SUMMARY_SQL),
      queryOp<FreshnessRow>(FRESHNESS_SQL),
      queryOp<DriftRow>(DRIFT_SQL),
    ]);
    summary = summaryRows[0] ?? null;
    freshness = freshnessRows;
    drift = driftRows;
  } catch (err) {
    // Surface a sanitised message — never the connection string / secrets.
    const message =
      err instanceof Error ? err.message : "unknown database error";
    return (
      <main>
        <h1>Platform Reconciliation View — local read-only MVP</h1>
        <ErrorState message={message} />
        <PageFooter routeNote="direct read-only Postgres → op.*" />
      </main>
    );
  }

  const asOf = summary?.as_of_at ?? freshness[0]?.as_of_at ?? null;
  const actionableDrift = drift.filter((d) => d.is_actionable === true).length;

  return (
    <main>
      <h1>Platform Reconciliation View — local read-only MVP</h1>
      <p style={{ fontSize: "0.9rem", color: "#555" }}>
        CCD-PRV-002 Path A · direct read-only Postgres transport → cc-0012{" "}
        <code>op.*</code> views · internal/unlinked · read-only.
      </p>
      <p>
        Data as of: <strong>{formatTimestamp(asOf)}</strong>
        {summary ? (
          <>
            {" "}
            · Window <strong>{formatDate(summary.window_start)}</strong> →{" "}
            <strong>{formatDate(summary.window_end)}</strong>
          </>
        ) : null}
      </p>

      <AttentionBanner attentionNeeded={summary?.attention_needed ?? null} />

      {summary ? (
        <section style={SECTION}>
          <h2>7-day reconciliation totals</h2>
          <ul>
            <li>Expected (ICE-side cadence): {formatNumber(summary.total_expected_7d)}</li>
            <li>Matched: {formatNumber(summary.total_matched_7d)}</li>
            <li>Late: {formatNumber(summary.total_late_7d)}</li>
            <li>Suppressed: {formatNumber(summary.total_suppressed_7d)}</li>
            <li>Cancelled: {formatNumber(summary.total_cancelled_7d)}</li>
            <li>On-time rate: {formatPercent(summary.on_time_rate_7d)}</li>
            <li>Late rate: {formatPercent(summary.late_rate_7d)}</li>
            <li>
              Drift (info / warn / critical):{" "}
              {formatNumber(summary.drift_info_count_7d)} /{" "}
              {formatNumber(summary.drift_warn_count_7d)} /{" "}
              {formatNumber(summary.drift_critical_count_7d)}
            </li>
            <li>
              Stale observer (client × platform) pairs:{" "}
              {formatNumber(summary.observer_stale_client_platform_count)}
            </li>
          </ul>
        </section>
      ) : (
        <EmptyState message="No reconciliation summary row available." />
      )}

      <section style={SECTION}>
        <h2>
          Reconciliation by account (client × platform) ·{" "}
          {freshness.length} pair{freshness.length === 1 ? "" : "s"}
        </h2>
        {freshness.length === 0 ? (
          <EmptyState message="No per-account freshness rows." />
        ) : (
          <div style={TABLE_WRAPPER}>
            <table style={TABLE}>
              <thead>
                <tr>
                  <th style={TH}>Client</th>
                  <th style={TH}>Platform</th>
                  <th style={TH}>Reconciliation state</th>
                  <th style={TH}>Last ICE evidence</th>
                  <th style={TH}>Last match</th>
                  <th style={TH}>Evidence 7d</th>
                  <th style={TH}>Match 7d</th>
                  <th style={TH}>Drift warn/crit 7d</th>
                  <th style={TH}>Since evidence</th>
                  <th style={TH}>Observer</th>
                  <th style={TH}>Status</th>
                </tr>
              </thead>
              <tbody>
                {freshness.map((r) => (
                  <tr key={`${r.client_id}-${r.platform}`}>
                    <td style={TD}>{r.client_slug ?? r.client_id}</td>
                    <td style={TD}>{r.platform}</td>
                    <td style={TD}>{r.freshness_status ?? "—"}</td>
                    <td style={TD}>{formatTimestamp(r.last_evidence_at)}</td>
                    <td style={TD}>{formatTimestamp(r.last_match_at)}</td>
                    <td style={TD}>{formatNumber(r.evidence_count_7d)}</td>
                    <td style={TD}>{formatNumber(r.match_count_7d)}</td>
                    <td style={TD}>{formatNumber(r.drift_warn_critical_count_7d)}</td>
                    <td style={TD}>
                      {formatRelativeMinutes(r.minutes_since_last_evidence)}
                    </td>
                    <td style={TD}>{observerCell(r)}</td>
                    <td style={TD}>
                      <AttentionBadge attentionNeeded={r.attention_needed} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section style={SECTION}>
        <h2>
          Drift findings — expected (ICE) vs observed (platform) ·{" "}
          {drift.length} finding{drift.length === 1 ? "" : "s"} · {actionableDrift}{" "}
          actionable
        </h2>
        {drift.length === 0 ? (
          <EmptyState message="No drift findings." />
        ) : (
          <div style={TABLE_WRAPPER}>
            <table style={TABLE}>
              <thead>
                <tr>
                  <th style={TH}>Detected</th>
                  <th style={TH}>Client</th>
                  <th style={TH}>Platform</th>
                  <th style={TH}>Drift type</th>
                  <th style={TH}>Severity</th>
                  <th style={TH}>Window</th>
                  <th style={TH}>Expected</th>
                  <th style={TH}>Observed</th>
                  <th style={TH}>Actionable</th>
                </tr>
              </thead>
              <tbody>
                {drift.map((d, idx) => (
                  <tr
                    key={`${d.created_at}-${d.client_id}-${d.platform}-${d.drift_type}-${idx}`}
                  >
                    <td style={TD}>{formatTimestamp(d.created_at)}</td>
                    <td style={TD}>{d.client_slug ?? d.client_id}</td>
                    <td style={TD}>{d.platform}</td>
                    <td style={TD}>{d.drift_type}</td>
                    <td style={TD}>{d.drift_severity}</td>
                    <td style={TD}>
                      {formatDate(d.observation_window_start)} →{" "}
                      {formatDate(d.observation_window_end)}
                    </td>
                    <td style={TD}>{formatNumber(d.expected_count)}</td>
                    <td style={TD}>{formatNumber(d.observed_count)}</td>
                    <td style={TD}>{d.is_actionable === true ? "yes" : "no"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <p style={{ fontSize: "0.85rem", color: "#666", marginTop: "1rem" }}>
        Observer column is <code>—</code> until PRV-2 / PRV-3 / PRV-4 observers
        populate the platform-side health table (currently empty).
      </p>

      <PageFooter routeNote="direct read-only Postgres → op.v_reconciliation_summary + op.v_freshness_rollup + op.v_drift_rollup" />
    </main>
  );
}
