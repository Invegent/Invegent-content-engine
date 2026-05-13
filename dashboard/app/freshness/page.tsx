import type { CSSProperties } from "react";
import { createOpClient } from "../../lib/supabase/server";
import { AttentionBadge } from "../_components/AttentionBadge";
import { EmptyState, ErrorState, PageFooter } from "../_components/StateBlocks";
import {
  formatNumber,
  formatRelativeMinutes,
  formatTimestamp,
} from "../_components/format";
import { TABLE, TABLE_WRAPPER, TD, TH } from "../_components/tableStyles";

// cc-0013 Stage D — Observer Freshness Scoreboard, polished.
// Server Component. Reads op.v_freshness_rollup via op-scoped server-only client.

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

const FRESHNESS_BADGE_STYLES: Record<string, CSSProperties> = {
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

const FRESHNESS_BADGE_BASE: CSSProperties = {
  padding: "2px 8px",
  borderRadius: "3px",
  fontSize: "0.8rem",
  display: "inline-block",
};

const FRESHNESS_FALLBACK: CSSProperties = {
  background: "#eee",
  border: "1px solid #bbb",
  color: "#333",
};

function freshnessBadge(status: string | null) {
  const lower = (status ?? "").toLowerCase();
  const variant = FRESHNESS_BADGE_STYLES[lower] ?? FRESHNESS_FALLBACK;
  return (
    <span style={{ ...FRESHNESS_BADGE_BASE, ...variant }}>
      {status ?? "—"}
    </span>
  );
}

function renderObserverHealth(row: FreshnessRow): string {
  if (row.observer_is_healthy === true) return "healthy";
  if (row.observer_is_healthy === false) {
    return `unhealthy (${formatNumber(
      row.observer_consecutive_failure_count,
    )} consec. fail)`;
  }
  return "—";
}

export default async function FreshnessPage() {
  const supabase = createOpClient();

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
        <ErrorState message={error.message} />
        <PageFooter routeNote="reads op.v_freshness_rollup" />
      </main>
    );
  }

  const rows = data ?? [];
  const asOf = rows[0]?.as_of_at ?? null;

  return (
    <main>
      <h1>Observer freshness</h1>
      <p>
        Data as of: <strong>{formatTimestamp(asOf)}</strong> · {rows.length}{" "}
        (client × platform) pair{rows.length === 1 ? "" : "s"}
      </p>

      {rows.length === 0 ? (
        <EmptyState message="No freshness data." />
      ) : (
        <div style={TABLE_WRAPPER}>
          <table style={TABLE}>
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
              {rows.map((r) => (
                <tr key={`${r.client_id}-${r.platform}`}>
                  <td style={TD}>{r.client_slug ?? r.client_id}</td>
                  <td style={TD}>{r.platform}</td>
                  <td style={TD}>{freshnessBadge(r.freshness_status)}</td>
                  <td style={TD}>{formatTimestamp(r.last_evidence_at)}</td>
                  <td style={TD}>{formatTimestamp(r.last_match_at)}</td>
                  <td style={TD}>{formatNumber(r.evidence_count_7d)}</td>
                  <td style={TD}>{formatNumber(r.match_count_7d)}</td>
                  <td style={TD}>{formatNumber(r.drift_warn_critical_count_7d)}</td>
                  <td style={TD}>{formatRelativeMinutes(r.minutes_since_last_evidence)}</td>
                  <td style={TD}>{renderObserverHealth(r)}</td>
                  <td style={TD}>
                    {/* Var-A3 strict-equality rule applied inside AttentionBadge. */}
                    <AttentionBadge attentionNeeded={r.attention_needed} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <p style={{ fontSize: "0.85rem", color: "#666", marginTop: "1rem" }}>
        Observer health column is <code>—</code> until PRV-2 / PRV-3 / PRV-4
        observers populate the underlying health table.
      </p>

      <PageFooter routeNote="reads op.v_freshness_rollup" />
    </main>
  );
}
