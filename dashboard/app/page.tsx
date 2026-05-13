import { createOpClient } from "../lib/supabase/server";
import { AttentionBanner } from "./_components/AttentionBadge";
import { ErrorState, PageFooter } from "./_components/StateBlocks";
import {
  formatDate,
  formatNumber,
  formatPercent,
  formatTimestamp,
} from "./_components/format";

// cc-0013 Stage D — Reconciliation Summary (home), polished.
// Server Component. Reads exactly one row from op.v_reconciliation_summary
// via the op-scoped server-only Supabase client. Shared primitives applied.

interface ReconciliationSummary {
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
}

export const dynamic = "force-dynamic";

const SECTION: React.CSSProperties = {
  marginTop: "1.5rem",
};

export default async function HomePage() {
  const supabase = createOpClient();

  const { data, error } = await supabase
    .from("v_reconciliation_summary")
    .select("*")
    .single<ReconciliationSummary>();

  if (error) {
    return (
      <main>
        <h1>Reconciliation Summary</h1>
        <ErrorState message={error.message} />
        <PageFooter routeNote="reads op.v_reconciliation_summary" />
      </main>
    );
  }

  if (!data) {
    return (
      <main>
        <h1>Reconciliation Summary</h1>
        <p>No reconciliation data available.</p>
        <PageFooter routeNote="reads op.v_reconciliation_summary" />
      </main>
    );
  }

  return (
    <main>
      <h1>Reconciliation Summary</h1>

      <p>
        Window: <strong>{formatDate(data.window_start)}</strong> →{" "}
        <strong>{formatDate(data.window_end)}</strong>
        <br />
        Data as of: <strong>{formatTimestamp(data.as_of_at)}</strong>
      </p>

      {/* Var-A3 strict-equality rule applied inside AttentionBanner. */}
      <AttentionBanner attentionNeeded={data.attention_needed} />

      <section style={SECTION}>
        <h2>7-day totals</h2>
        <ul>
          <li>Expected: {formatNumber(data.total_expected_7d)}</li>
          <li>Matched: {formatNumber(data.total_matched_7d)}</li>
          <li>Late: {formatNumber(data.total_late_7d)}</li>
          <li>Suppressed: {formatNumber(data.total_suppressed_7d)}</li>
          <li>Cancelled: {formatNumber(data.total_cancelled_7d)}</li>
        </ul>
      </section>

      <section style={SECTION}>
        <h2>Ratios</h2>
        <ul>
          <li>On-time rate: {formatPercent(data.on_time_rate_7d)}</li>
          <li>Late rate: {formatPercent(data.late_rate_7d)}</li>
        </ul>
      </section>

      <section style={SECTION}>
        <h2>Drift (trailing 7 days)</h2>
        <ul>
          <li>Info: {formatNumber(data.drift_info_count_7d)}</li>
          <li>Warn: {formatNumber(data.drift_warn_count_7d)}</li>
          <li>Critical: {formatNumber(data.drift_critical_count_7d)}</li>
        </ul>
      </section>

      <section style={SECTION}>
        <h2>Observer freshness</h2>
        <ul>
          <li>
            Stale (client × platform) pairs:{" "}
            {formatNumber(data.observer_stale_client_platform_count)}
          </li>
        </ul>
      </section>

      <PageFooter routeNote="reads op.v_reconciliation_summary" />
    </main>
  );
}
