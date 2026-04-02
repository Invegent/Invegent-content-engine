/**
 * ai-diagnostic v1.0.0
 * Tier 2 daily pipeline health diagnostic.
 *
 * Tier 1 (pipeline-doctor): 7 point-in-time checks every 30 min — detects immediate failures.
 * Tier 2 (this):            Daily AI analysis of 7-day history — trends, per-client health,
 *                           recommendations, predicted issues before they materialise.
 *
 * Scheduled: daily at 20:00 UTC (06:00 AEST) via pg_cron.
 * Output: m.ai_diagnostic_report (via public.insert_ai_diagnostic_report SECURITY DEFINER)
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY")!;
const MODEL = "claude-sonnet-4-6";

// ---------------------------------------------------------------------------
// Metric gathering
// ---------------------------------------------------------------------------

async function gatherMetrics() {
  const periodStart = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const prevStart   = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString();

  // 1. Doctor log summary — last 7 days vs previous 7
  const { data: doctorLast } = await supabase.rpc("exec_sql", { query: `
    SELECT
      COUNT(*)::int                     AS runs,
      COALESCE(SUM(issues_found), 0)::int   AS total_issues,
      COALESCE(SUM(fixes_applied), 0)::int  AS total_fixes,
      ROUND(AVG(checks_run), 1)         AS avg_checks_per_run
    FROM m.pipeline_doctor_log
    WHERE ran_at > now() - interval '7 days'
  `});
  const { data: doctorPrev } = await supabase.rpc("exec_sql", { query: `
    SELECT
      COUNT(*)::int                     AS runs,
      COALESCE(SUM(issues_found), 0)::int   AS total_issues,
      COALESCE(SUM(fixes_applied), 0)::int  AS total_fixes
    FROM m.pipeline_doctor_log
    WHERE ran_at BETWEEN now() - interval '14 days' AND now() - interval '7 days'
  `});

  // 2. Per-client publishing — last 7 days vs previous 7
  const { data: publishing } = await supabase.rpc("exec_sql", { query: `
    SELECT
      c.client_slug,
      COUNT(*) FILTER (WHERE pp.published_at > now() - interval '7 days')::int  AS posts_last_7d,
      COUNT(*) FILTER (WHERE pp.published_at BETWEEN now() - interval '14 days' AND now() - interval '7 days')::int AS posts_prev_7d,
      MAX(pp.published_at) AS last_published_at
    FROM c.client c
    LEFT JOIN m.post_publish pp ON pp.client_id = c.client_id
    WHERE c.status = 'active'
    GROUP BY c.client_slug
    ORDER BY c.client_slug
  `});

  // 3. Pipeline funnel last 7 days (ingest → draft → publish)
  const { data: funnel } = await supabase.rpc("exec_sql", { query: `
    SELECT
      (SELECT COUNT(*)::int FROM f.raw_content_item WHERE created_at > now() - interval '7 days') AS raw_items_ingested,
      (SELECT COUNT(*)::int FROM f.canonical_content_body WHERE created_at > now() - interval '7 days' AND fetch_status = 'success') AS bodies_fetched,
      (SELECT COUNT(*)::int FROM f.canonical_content_body WHERE created_at > now() - interval '7 days' AND fetch_status LIKE 'give_up%') AS bodies_given_up,
      (SELECT COUNT(*)::int FROM m.post_draft WHERE created_at > now() - interval '7 days') AS drafts_generated,
      (SELECT COUNT(*)::int FROM m.post_publish WHERE published_at > now() - interval '7 days') AS posts_published
  `});

  // 4. Token expiry
  const { data: tokens } = await supabase.rpc("exec_sql", { query: `
    SELECT
      c.client_slug,
      cpp.platform,
      cpp.token_expires_at,
      EXTRACT(epoch FROM (cpp.token_expires_at - now())) / 86400 AS expires_in_days
    FROM c.client_publish_profile cpp
    JOIN c.client c ON c.client_id = cpp.client_id
    WHERE cpp.publish_enabled = true
      AND cpp.token_expires_at IS NOT NULL
    ORDER BY cpp.token_expires_at ASC
  `});

  // 5. Feed ingest health last 7 days
  const { data: feeds } = await supabase.rpc("exec_sql", { query: `
    SELECT
      COUNT(*)::int                         AS ingest_runs,
      COALESCE(SUM(fetched_count), 0)::int  AS items_fetched,
      COALESCE(SUM(error_count), 0)::int    AS errors,
      COUNT(*) FILTER (WHERE status = 'error')::int AS failed_runs
    FROM f.ingest_run
    WHERE started_at > now() - interval '7 days'
  `});

  // 6. Dead letter last 7 days (non-housekeeping)
  const { data: dead } = await supabase.rpc("exec_sql", { query: `
    SELECT dead_reason, COUNT(*)::int AS count
    FROM m.post_draft
    WHERE approval_status = 'dead'
      AND updated_at > now() - interval '7 days'
      AND dead_reason NOT LIKE '%housekeeping%'
      AND dead_reason NOT LIKE '%backlog%'
      AND dead_reason NOT LIKE '%auditor%'
    GROUP BY dead_reason
    ORDER BY count DESC
    LIMIT 10
  `});

  // 7. AI job throughput last 7 days
  const { data: aiJobs } = await supabase.rpc("exec_sql", { query: `
    SELECT
      COUNT(*)::int                                           AS total_jobs,
      COUNT(*) FILTER (WHERE status = 'completed')::int      AS completed,
      COUNT(*) FILTER (WHERE status = 'dead')::int           AS dead,
      COUNT(*) FILTER (WHERE status IN ('pending','running') AND created_at < now() - interval '2 hours')::int AS stuck
    FROM m.ai_job
    WHERE created_at > now() - interval '7 days'
  `});

  return {
    period_days: 7,
    doctor: { last_7d: doctorLast?.[0] ?? {}, prev_7d: doctorPrev?.[0] ?? {} },
    publishing: publishing ?? [],
    funnel: funnel?.[0] ?? {},
    tokens: tokens ?? [],
    feeds: feeds?.[0] ?? {},
    dead_drafts: dead ?? [],
    ai_jobs: aiJobs?.[0] ?? {},
  };
}

// ---------------------------------------------------------------------------
// Claude prompt
// ---------------------------------------------------------------------------

function buildPrompt(metrics: Record<string, unknown>): string {
  return `You are the ICE Pipeline Analyst. ICE (Invegent Content Engine) is an AI-powered content publishing system for NDIS allied health providers and property professionals in Australia. It ingests RSS/news feeds, generates social media posts via AI, and publishes to Facebook, LinkedIn, and YouTube.

You are given 7 days of pipeline metrics. Analyse them and return a structured JSON diagnostic report.

METRICS:
${JSON.stringify(metrics, null, 2)}

CONTEXT:
- Two active clients: ndis-yarns (NDIS disability services) and property-pulse (property investment)
- Expected publishing cadence: 5+ posts/week per client
- Tokens expiring within 14 days = warning, within 7 days = critical
- Doctor issues > 5 in a week = degraded health
- Funnel give-up rate > 60% = feed health concern
- AI job dead rate > 10% = concerning

Return ONLY valid JSON — no preamble, no markdown fences — in this exact structure:
{
  "health_score": <integer 0-100, where 100 = perfect, 70+ = healthy, 50-69 = needs attention, <50 = degraded>,
  "trend": <"improving" | "stable" | "degrading">,
  "summary": <2-3 sentence plain-English executive summary of pipeline health>,
  "client_findings": [
    {
      "client_slug": <string>,
      "posts_7d": <integer>,
      "posts_prev_7d": <integer>,
      "cadence_status": <"on_track" | "low" | "silent">,
      "issues": [<string>],
      "notes": <string>
    }
  ],
  "recommendations": [
    {
      "priority": <"high" | "medium" | "low">,
      "action": <short imperative sentence, e.g. "Refresh Property Pulse Facebook token">,
      "context": <1-2 sentence explanation>
    }
  ],
  "predicted_issues": [
    {
      "issue": <short description>,
      "likelihood": <"high" | "medium" | "low">,
      "timeframe": <e.g. "7 days", "14 days", "this month">
    }
  ]
}`;
}

// ---------------------------------------------------------------------------
// Main handler
// ---------------------------------------------------------------------------

Deno.serve(async () => {
  const now = new Date();
  const periodStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  try {
    console.log("[ai-diagnostic] Gathering metrics...");
    const metrics = await gatherMetrics();

    console.log("[ai-diagnostic] Calling Claude...");
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 1500,
        messages: [{ role: "user", content: buildPrompt(metrics) }],
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      throw new Error(`Claude API error ${response.status}: ${err}`);
    }

    const aiResponse = await response.json();
    const rawText = aiResponse.content?.[0]?.text ?? "";
    const inputTokens  = aiResponse.usage?.input_tokens ?? 0;
    const outputTokens = aiResponse.usage?.output_tokens ?? 0;

    let parsed: Record<string, unknown>;
    try {
      parsed = JSON.parse(rawText);
    } catch {
      throw new Error(`Failed to parse Claude JSON response: ${rawText.slice(0, 300)}`);
    }

    const {
      health_score, trend, summary,
      client_findings, recommendations, predicted_issues,
    } = parsed as {
      health_score: number; trend: string; summary: string;
      client_findings: unknown[]; recommendations: unknown[]; predicted_issues: unknown[];
    };

    console.log(`[ai-diagnostic] Score: ${health_score}, Trend: ${trend}`);

    const { error } = await supabase.rpc("insert_ai_diagnostic_report", {
      p_period_start:     periodStart.toISOString(),
      p_period_end:       now.toISOString(),
      p_health_score:     health_score,
      p_trend:            trend,
      p_summary:          summary,
      p_client_findings:  JSON.stringify(client_findings  ?? []),
      p_recommendations:  JSON.stringify(recommendations  ?? []),
      p_predicted_issues: JSON.stringify(predicted_issues ?? []),
      p_raw_metrics:      JSON.stringify(metrics),
      p_model_used:       MODEL,
      p_input_tokens:     inputTokens,
      p_output_tokens:    outputTokens,
    });

    if (error) throw new Error(`DB insert error: ${error.message}`);

    console.log("[ai-diagnostic] Report saved.");
    return new Response(
      JSON.stringify({ ok: true, health_score, trend }),
      { headers: { "Content-Type": "application/json" } }
    );

  } catch (err) {
    console.error("[ai-diagnostic] Error:", err);
    return new Response(
      JSON.stringify({ ok: false, error: String(err) }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
});
