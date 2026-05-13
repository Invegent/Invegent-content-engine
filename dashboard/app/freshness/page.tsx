import { createOpClient } from "../../lib/supabase/server";

// cc-0013 Stage C — Observer Freshness Scoreboard.
// Server Component. Reads op.v_freshness_rollup via op-scoped server-only client.
// Per Phase 0 §4.5: one row per (client, platform); freshness_status + last_*_at +
// observer_health columns (NULL pre-PRV-2/3/4).

interface FreshnessRow {
  client_id: string;
  client_slug: string | null;
  platform: string;
  last_evidence_at: string | null;
  last_match_at: string | null;
  last_drift_log_at: string | null;
  evidence_count_7d: number | null;
  match_count_7d: number | null;
  drift_warn_critical_count_7d: number | null;
  freshness_status: string | null;
  minutes_since_last_evidence: number | null;
  observer_is_healthy: boolean | null;
  observer_consecutive_failure_count: number | null;
  observer_last_failure_reason: string | null;
  observer_last_observed_at: string | null;
  attention_needed: boolean | null;
  as_of_at: string | null;
}

export const dynamic = "force-dynamic";

function fmtNumber(value: number | null): string {
  if (value == null) return "—";
  return value.toLocaleString("en-AU");
}

function fmtMinutes(minutes: number | null): string {
  if (minutes == null) return "—";
  if (minutes < 60) return `${minutes} min ago`;
  const hours = minutes / 60;
  if (hours < 48) return `${hours.toFixed(1)} h ago`;
  const days = hours / 24;
  return `${days.toFixed(1)} d ago`;
}

function freshnessBadge(status: string | null) {
  const lower = (status ?? "").toLowerCase();
  const styles: Record<string, React.CSSProperties> = {
    fresh: {
      background: "#e8f5e9",
      border: "1px solid #81c784",
      color: "#1b5e20",
    },
    aging: {
      background: "#fffde7",
      border: "1px solid #ffd54f",
      color: "#795548",
    },
    stale: {
      background: "#fff4e5",
      border: "1px solid #ffb74d",
      color: "#7a3e00",
      fontWeight: 600,
    },
    no_evidence_ever: {
      background: "#fde7e9",
      border: "1px solid #ef5350",
      color: "#b71c1c",
      fontWeight: 600,
    },
  };
  const fallback: React.CSSProperties = {
    background: "#eee",
    border: "1px solid #bbb",
    color: "#333",
  };
  return (
    <span
      style={{
        padding: "2px 6px",
        borderRadius: "3px",
        fontSize: "0.8rem",
        ...(styles[lower] ?? fallback),
      }}
    >
      {status ?? "—"}
    </span>
  );
}

const TH: React.CSSProperties = {
  textAlign: "left",
  padding: "0.4rem 0.5rem",
  borderBottom: "2px solid #ddd",
  fontWeight: 600,
  fontSize: "0.875rem",
  whiteSpace: "nowrap",
};
const TD: React.CSSProperties = {
  padding: "0.35rem 0.5rem",
  borderBottom: "1px solid #f0f0f0",
  fontSize: "0.9rem",
};

export default async function FreshnessPage() {
  const supabase = createOpClient();

  // Order per Phase 0 brief §4.5: attention first, then oldest evidence, then alpha.
  const { data, error } = await supabase
    .from("v_freshness_rollup")
    .select("*")
    .order("attention_needed", { ascending: false, nullsFirst: false })
    .order("last_evidence_at", { ascending: true, nullsFirst: true })
    .order("client_slug", { ascending: true })
    .order("platform", { ascending: true })
    .returns<FreshnessRow[]>();

  if (error) {
    return (
      <main>
        <h1>Observer freshness</h1>
        <p style={{ color: "#b00020" }}>Error loading data: {error.message}</p>
      </main>
    );
  }

  const rows = data ?? [];
  const asOf = rows[0]?.as_of_at ?? null;

  return (
    <main>
      <h1>Observer freshness</h1>
      <p>
        Data as of: <strong>{asOf ?? "—"}</strong> · {rows.length} (client ×
        platform) pair{rows.length === 1 ? "" : "s"}
      </p>

      {rows.length === 0 ? (
        <p>No freshness data.</p>
      ) : (
        <table style={{ borderCollapse: "collapse", width: "100%" }}>
          <thead>
            <tr>
              <th style={TH}>Client</th>
              <th style={TH}>Platform</th>
              <th style={TH}>Freshness</th>
              <th style={TH}>Last evidence</th>
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
            {rows.map((r) => {
              // Var-A3 strict-equality rule (Phase 0 §8).
              const isAttention = r.attention_needed === true;
              return (
                <tr key={`${r.client_id}-${r.platform}`}>
                  <td style={TD}>{r.client_slug ?? r.client_id}</td>
                  <td style={TD}>{r.platform}</td>
                  <td style={TD}>{freshnessBadge(r.freshness_status)}</td>
                  <td style={TD}>{r.last_evidence_at ?? "—"}</td>
                  <td style={TD}>{r.last_match_at ?? "—"}</td>
                  <td style={TD}>{fmtNumber(r.evidence_count_7d)}</td>
                  <td style={TD}>{fmtNumber(r.match_count_7d)}</td>
                  <td style={TD}>{fmtNumber(r.drift_warn_critical_count_7d)}</td>
                  <td style={TD}>{fmtMinutes(r.minutes_since_last_evidence)}</td>
                  <td style={TD}>
                    {/* Observer health columns are NULL pre-PRV-2/3/4. */}
                    {r.observer_is_healthy === true
                      ? "healthy"
                      : r.observer_is_healthy === false
                      ? `unhealthy (${fmtNumber(r.observer_consecutive_failure_count)} consec. fail)`
                      : "—"}
                  </td>
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

      <p style={{ fontSize: "0.85rem", color: "#666", marginTop: "1rem" }}>
        Observer health columns (right-most data column) are NULL until PRV-2 /
        PRV-3 / PRV-4 observers populate <code>r.platform_observer_health</code>
        . Render shows <code>—</code> for that case.
      </p>
    </main>
  );
}
