import { createOpClient } from "../../lib/supabase/server";

// cc-0013 Stage C — Per-Platform Rollup.
// Server Component. Reads op.v_per_platform_rollup via op-scoped server-only
// client. Mirrors /clients shape but aggregated by platform.

interface PlatformRollupRow {
  platform: string;
  client_count: number | null;
  total_expected_7d: number | null;
  total_matched_7d: number | null;
  total_late_7d: number | null;
  total_suppressed_7d: number | null;
  on_time_rate_7d: number | null;
  late_rate_7d: number | null;
  drift_warn_critical_count_7d: number | null;
  observer_stale_client_count: number | null;
  last_evidence_at: string | null;
  attention_needed: boolean | null;
  as_of_at: string | null;
}

export const dynamic = "force-dynamic";

function fmtPercent(value: number | null): string {
  if (value == null) return "—";
  return `${(value * 100).toFixed(2)}%`;
}

function fmtNumber(value: number | null): string {
  if (value == null) return "—";
  return value.toLocaleString("en-AU");
}

const TH: React.CSSProperties = {
  textAlign: "left",
  padding: "0.4rem 0.5rem",
  borderBottom: "2px solid #ddd",
  fontWeight: 600,
  fontSize: "0.875rem",
};
const TD: React.CSSProperties = {
  padding: "0.35rem 0.5rem",
  borderBottom: "1px solid #f0f0f0",
  fontSize: "0.9rem",
};

export default async function PlatformsPage() {
  const supabase = createOpClient();

  // Order per Phase 0 brief §4.3.
  const { data, error } = await supabase
    .from("v_per_platform_rollup")
    .select("*")
    .order("attention_needed", { ascending: false, nullsFirst: false })
    .order("late_rate_7d", { ascending: false, nullsFirst: false })
    .order("platform", { ascending: true })
    .returns<PlatformRollupRow[]>();

  if (error) {
    return (
      <main>
        <h1>Per-Platform Rollup</h1>
        <p style={{ color: "#b00020" }}>Error loading data: {error.message}</p>
      </main>
    );
  }

  const rows = data ?? [];
  const asOf = rows[0]?.as_of_at ?? null;

  return (
    <main>
      <h1>Per-Platform Rollup</h1>
      <p>
        Data as of: <strong>{asOf ?? "—"}</strong> · {rows.length} platform
        {rows.length === 1 ? "" : "s"} with trailing 7-day activity
      </p>

      {rows.length === 0 ? (
        <p>No platform data in trailing 7 days.</p>
      ) : (
        <table style={{ borderCollapse: "collapse", width: "100%" }}>
          <thead>
            <tr>
              <th style={TH}>Platform</th>
              <th style={TH}>Clients</th>
              <th style={TH}>Expected</th>
              <th style={TH}>Matched</th>
              <th style={TH}>Late</th>
              <th style={TH}>Suppressed</th>
              <th style={TH}>On-time</th>
              <th style={TH}>Late rate</th>
              <th style={TH}>Drift warn/crit</th>
              <th style={TH}>Stale clients</th>
              <th style={TH}>Last evidence</th>
              <th style={TH}>Status</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              // Var-A3 strict-equality rule (Phase 0 §8).
              const isAttention = r.attention_needed === true;
              return (
                <tr key={r.platform}>
                  <td style={TD}>{r.platform}</td>
                  <td style={TD}>{fmtNumber(r.client_count)}</td>
                  <td style={TD}>{fmtNumber(r.total_expected_7d)}</td>
                  <td style={TD}>{fmtNumber(r.total_matched_7d)}</td>
                  <td style={TD}>{fmtNumber(r.total_late_7d)}</td>
                  <td style={TD}>{fmtNumber(r.total_suppressed_7d)}</td>
                  <td style={TD}>{fmtPercent(r.on_time_rate_7d)}</td>
                  <td style={TD}>{fmtPercent(r.late_rate_7d)}</td>
                  <td style={TD}>{fmtNumber(r.drift_warn_critical_count_7d)}</td>
                  <td style={TD}>{fmtNumber(r.observer_stale_client_count)}</td>
                  <td style={TD}>{r.last_evidence_at ?? "—"}</td>
                  <td style={TD}>
                    {isAttention ? (
                      <span
                        style={{
                          background: "#fff4e5",
                          border: "1px solid #ffb74d",
                          padding: "2px 6px",
                          borderRadius: "3px",
                          color: "#7a3e00",
                          fontWeight: 600,
                          fontSize: "0.8rem",
                        }}
                      >
                        ATTENTION
                      </span>
                    ) : (
                      <span
                        style={{
                          background: "#e8f5e9",
                          border: "1px solid #81c784",
                          padding: "2px 6px",
                          borderRadius: "3px",
                          color: "#1b5e20",
                          fontSize: "0.8rem",
                        }}
                      >
                        OK
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </main>
  );
}
