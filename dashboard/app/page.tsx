import { createOpClient } from "../lib/supabase/server";

// cc-0013 Stage B — Reconciliation Summary (home).
// Server Component (no "use client"). Reads exactly one row from
// op.v_reconciliation_summary via the op-scoped server-only Supabase client.
// No client-side Supabase. No forms. No mutation handlers. No realtime.

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

// Always re-render on every request — data freshness depends on the most-recent
// cron-85 fire, not a build-time snapshot.
export const dynamic = "force-dynamic";

function fmtPercent(value: number | null): string {
  if (value == null) return "—";
  return `${(value * 100).toFixed(2)}%`;
}

function fmtNumber(value: number | null): string {
  if (value == null) return "—";
  return value.toLocaleString("en-AU");
}

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
        <p style={{ color: "#b00020" }}>Error loading data: {error.message}</p>
        <p>
          Confirm <code>SUPABASE_URL</code> and{" "}
          <code>SUPABASE_SERVICE_ROLE_KEY</code> are set in{" "}
          <code>.env.local</code>.
        </p>
      </main>
    );
  }

  if (!data) {
    return (
      <main>
        <h1>Reconciliation Summary</h1>
        <p>No reconciliation data available.</p>
      </main>
    );
  }

  // Var-A3 strict-equality rule (cc-0013 Phase 0 §8):
  //   - attention_needed === true  → attention state
  //   - false OR null              → OK / no-attention (visually identical)
  const isAttention = data.attention_needed === true;

  return (
    <main>
      <h1>Reconciliation Summary</h1>

      <p>
        Window: <strong>{data.window_start ?? "—"}</strong> →{" "}
        <strong>{data.window_end ?? "—"}</strong>
        <br />
        Data as of: <strong>{data.as_of_at ?? "—"}</strong>
      </p>

      {isAttention ? (
        <p
          role="alert"
          style={{
            background: "#fff4e5",
            border: "1px solid #ffb74d",
            padding: "0.75rem 1rem",
            borderRadius: "4px",
            color: "#7a3e00",
            fontWeight: 600,
          }}
        >
          Attention needed — review drift findings + client / platform rollups.
        </p>
      ) : (
        <p
          style={{
            background: "#e8f5e9",
            border: "1px solid #81c784",
            padding: "0.75rem 1rem",
            borderRadius: "4px",
            color: "#1b5e20",
          }}
        >
          OK — no attention required at this time.
        </p>
      )}

      <section>
        <h2>7-day totals</h2>
        <ul>
          <li>Expected: {fmtNumber(data.total_expected_7d)}</li>
          <li>Matched: {fmtNumber(data.total_matched_7d)}</li>
          <li>Late: {fmtNumber(data.total_late_7d)}</li>
          <li>Suppressed: {fmtNumber(data.total_suppressed_7d)}</li>
          <li>Cancelled: {fmtNumber(data.total_cancelled_7d)}</li>
        </ul>
      </section>

      <section>
        <h2>Ratios</h2>
        <ul>
          <li>On-time rate: {fmtPercent(data.on_time_rate_7d)}</li>
          <li>Late rate: {fmtPercent(data.late_rate_7d)}</li>
        </ul>
      </section>

      <section>
        <h2>Drift (trailing 7 days)</h2>
        <ul>
          <li>Info: {fmtNumber(data.drift_info_count_7d)}</li>
          <li>Warn: {fmtNumber(data.drift_warn_count_7d)}</li>
          <li>Critical: {fmtNumber(data.drift_critical_count_7d)}</li>
        </ul>
      </section>

      <section>
        <h2>Observer freshness</h2>
        <ul>
          <li>
            Stale (client × platform) pairs:{" "}
            {fmtNumber(data.observer_stale_client_platform_count)}
          </li>
        </ul>
      </section>

      <footer
        style={{
          marginTop: "2rem",
          paddingTop: "1rem",
          borderTop: "1px solid #eee",
          fontSize: "0.875rem",
          color: "#666",
        }}
      >
        cc-0013 Stage B scaffold · reads <code>op.v_reconciliation_summary</code>{" "}
        only · operator-internal.
      </footer>
    </main>
  );
}
