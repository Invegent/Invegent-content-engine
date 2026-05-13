import { createOpClient } from "../../lib/supabase/server";
import { AttentionBadge } from "../_components/AttentionBadge";
import { EmptyState, ErrorState, PageFooter } from "../_components/StateBlocks";
import {
  formatNumber,
  formatPercent,
  formatTimestamp,
} from "../_components/format";
import { TABLE, TABLE_WRAPPER, TD, TH } from "../_components/tableStyles";

// cc-0013 Stage D — Per-Platform Rollup, polished.
// Server Component. Reads op.v_per_platform_rollup via op-scoped server-only client.

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

export default async function PlatformsPage() {
  const supabase = createOpClient();

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
        <ErrorState message={error.message} />
        <PageFooter routeNote="reads op.v_per_platform_rollup" />
      </main>
    );
  }

  const rows = data ?? [];
  const asOf = rows[0]?.as_of_at ?? null;

  return (
    <main>
      <h1>Per-Platform Rollup</h1>
      <p>
        Data as of: <strong>{formatTimestamp(asOf)}</strong> · {rows.length}{" "}
        platform{rows.length === 1 ? "" : "s"} with trailing 7-day activity
      </p>

      {rows.length === 0 ? (
        <EmptyState message="No platform data in trailing 7 days." />
      ) : (
        <div style={TABLE_WRAPPER}>
          <table style={TABLE}>
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
              {rows.map((r) => (
                <tr key={r.platform}>
                  <td style={TD}>{r.platform}</td>
                  <td style={TD}>{formatNumber(r.client_count)}</td>
                  <td style={TD}>{formatNumber(r.total_expected_7d)}</td>
                  <td style={TD}>{formatNumber(r.total_matched_7d)}</td>
                  <td style={TD}>{formatNumber(r.total_late_7d)}</td>
                  <td style={TD}>{formatNumber(r.total_suppressed_7d)}</td>
                  <td style={TD}>{formatPercent(r.on_time_rate_7d)}</td>
                  <td style={TD}>{formatPercent(r.late_rate_7d)}</td>
                  <td style={TD}>{formatNumber(r.drift_warn_critical_count_7d)}</td>
                  <td style={TD}>{formatNumber(r.observer_stale_client_count)}</td>
                  <td style={TD}>{formatTimestamp(r.last_evidence_at)}</td>
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

      <PageFooter routeNote="reads op.v_per_platform_rollup" />
    </main>
  );
}
