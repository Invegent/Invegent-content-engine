import type { CSSProperties } from "react";
import { createOpClient } from "../../lib/supabase/server";
import { EmptyState, ErrorState, PageFooter } from "../_components/StateBlocks";
import {
  formatDate,
  formatNumber,
  formatTimestamp,
} from "../_components/format";
import { TABLE, TABLE_WRAPPER, TD, TH } from "../_components/tableStyles";

// cc-0013 Stage D — Drift triage queue (trailing 30-day window), polished.
// Server Component. Reads op.v_drift_rollup via op-scoped server-only client.
//
// Phase 0 brief V4 hygiene: this route renders columns surfaced by the op view
// (passthrough columns from cc-0011's drift table). To keep the V4 substring
// grep clean, the operator-visible columns are limited to the human-actionable
// set: timestamps, client_slug, platform, drift_type, drift_severity,
// observation window, observed/expected counts, drift_details, is_recent/
// is_actionable. FK identifier passthrough columns are intentionally omitted
// from this interface + render.

interface DriftRow {
  run_started_at: string | null;
  client_id: string;
  client_slug: string | null;
  platform: string;
  drift_type: string;
  drift_severity: string;
  observation_window_start: string | null;
  observation_window_end: string | null;
  observed_count: number | null;
  expected_count: number | null;
  drift_details: Record<string, unknown> | null;
  created_at: string;
  is_recent: boolean | null;
  is_actionable: boolean | null;
}

export const dynamic = "force-dynamic";

const SEVERITY_BADGE_STYLES: Record<string, CSSProperties> = {
  info: {
    background: "#e3f2fd",
    border: "1px solid #64b5f6",
    color: "#0d47a1",
  },
  warn: {
    background: "#fff4e5",
    border: "1px solid #ffb74d",
    color: "#7a3e00",
  },
  critical: {
    background: "#fde7e9",
    border: "1px solid #ef5350",
    color: "#b71c1c",
    fontWeight: 600,
  },
};

const SEVERITY_BADGE_BASE: CSSProperties = {
  padding: "2px 8px",
  borderRadius: "3px",
  fontSize: "0.8rem",
  textTransform: "uppercase",
  letterSpacing: "0.025em",
  display: "inline-block",
};

const SEVERITY_FALLBACK: CSSProperties = {
  background: "#eee",
  border: "1px solid #bbb",
  color: "#333",
};

function severityBadge(severity: string) {
  const lower = (severity ?? "").toLowerCase();
  const variant = SEVERITY_BADGE_STYLES[lower] ?? SEVERITY_FALLBACK;
  return <span style={{ ...SEVERITY_BADGE_BASE, ...variant }}>{severity}</span>;
}

export default async function DriftPage() {
  const supabase = createOpClient();

  const { data, error } = await supabase
    .from("v_drift_rollup")
    .select(
      "run_started_at, client_id, client_slug, platform, drift_type, drift_severity, observation_window_start, observation_window_end, observed_count, expected_count, drift_details, created_at, is_recent, is_actionable",
    )
    .order("is_actionable", { ascending: false, nullsFirst: false })
    .order("drift_severity", { ascending: false })
    .order("created_at", { ascending: false })
    .returns<DriftRow[]>();

  if (error) {
    return (
      <main>
        <h1>Drift queue</h1>
        <ErrorState message={error.message} />
        <PageFooter routeNote="reads op.v_drift_rollup" />
      </main>
    );
  }

  const rows = data ?? [];
  const actionableCount = rows.filter((r) => r.is_actionable === true).length;

  return (
    <main>
      <h1>Drift queue</h1>
      <p>
        {rows.length} finding{rows.length === 1 ? "" : "s"} in trailing 30
        days · {actionableCount} actionable (warn / critical)
      </p>

      {rows.length === 0 ? (
        <EmptyState message="No drift findings in trailing 30 days." />
      ) : (
        <div style={TABLE_WRAPPER}>
          <table style={TABLE}>
            <thead>
              <tr>
                <th style={TH}>Created</th>
                <th style={TH}>Client</th>
                <th style={TH}>Platform</th>
                <th style={TH}>Type</th>
                <th style={TH}>Severity</th>
                <th style={TH}>Window</th>
                <th style={TH}>Observed</th>
                <th style={TH}>Expected</th>
                <th style={TH}>Details</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, idx) => (
                <tr
                  key={`${r.created_at}-${r.client_id}-${r.platform}-${r.drift_type}-${idx}`}
                >
                  <td style={TD}>{formatTimestamp(r.created_at)}</td>
                  <td style={TD}>{r.client_slug ?? r.client_id}</td>
                  <td style={TD}>{r.platform}</td>
                  <td style={TD}>{r.drift_type}</td>
                  <td style={TD}>{severityBadge(r.drift_severity)}</td>
                  <td style={TD}>
                    {formatDate(r.observation_window_start)} →{" "}
                    {formatDate(r.observation_window_end)}
                  </td>
                  <td style={TD}>{formatNumber(r.observed_count)}</td>
                  <td style={TD}>{formatNumber(r.expected_count)}</td>
                  <td style={TD}>
                    {r.drift_details ? (
                      <details>
                        <summary
                          style={{ cursor: "pointer", fontSize: "0.85rem" }}
                        >
                          view
                        </summary>
                        <pre
                          style={{
                            background: "#f7f7f7",
                            padding: "0.5rem",
                            fontSize: "0.75rem",
                            overflow: "auto",
                            maxWidth: "320px",
                            marginTop: "0.25rem",
                          }}
                        >
                          {JSON.stringify(r.drift_details, null, 2)}
                        </pre>
                      </details>
                    ) : (
                      "—"
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <PageFooter routeNote="reads op.v_drift_rollup" />
    </main>
  );
}
