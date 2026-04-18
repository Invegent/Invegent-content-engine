import { createClient } from "jsr:@supabase/supabase-js@2";

const VERSION = "weekly-manager-report-v2.0.0";
const RESEND_API_URL = "https://api.resend.com/emails";

function getServiceClient() {
  const url = Deno.env.get("SUPABASE_URL");
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !key) throw new Error("Missing Supabase credentials");
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

type Supabase = ReturnType<typeof getServiceClient>;

interface PipelineHealth {
  drafts_generated: number;
  auto_approved: number;
  manually_approved: number;
  rejected: number;
  posts_published: number;
  platform_breakdown: { platform: string; count: number }[];
}

interface ClientSummary {
  client_name: string;
  posts_published: number;
  platform_counts: Record<string, number>;
  needs_review: number;
  token_warnings: { platform: string; page_name: string; days_remaining: number }[];
}

interface ActiveIssues {
  token_warnings: { platform: string; page_name: string; client_name: string; days_remaining: number }[];
  stuck_jobs: number;
  inactive_crons: { jobname: string; schedule: string }[];
}

interface FeedHealth {
  active_feeds: number;
  high_giveup_feeds: { feed_name: string; giveup_ratio: number }[];
}

interface IncidentSummary {
  total: number;
  auto_healed: number;
  manually_resolved: number;
  still_open: number;
  avg_mttr_minutes: number | null;
}

async function sql<T = any>(supabase: Supabase, query: string): Promise<T[]> {
  const { data, error } = await supabase.rpc("exec_sql", { query });
  if (error) throw new Error(`SQL error: ${error.message}`);
  return (data ?? []) as T[];
}

async function gatherAllStats(supabase: Supabase) {
  // Run all independent queries in parallel
  const [
    draftStats,
    publishedPlatform,
    clientPublished,
    clientReview,
    tokenRows,
    stuckRows,
    cronRows,
    feedCountRows,
    feedGiveupRows,
    incidentRows,
  ] = await Promise.all([
    // 1. Draft pipeline stats (last 7 days)
    sql(supabase, `
      SELECT
        COUNT(*)::int AS drafts_generated,
        COUNT(*) FILTER (WHERE auto_approval_scores IS NOT NULL AND approval_status = 'approved')::int AS auto_approved,
        COUNT(*) FILTER (WHERE (auto_approval_scores IS NULL OR approved_by NOT LIKE 'auto-%') AND approval_status = 'approved')::int AS manually_approved,
        COUNT(*) FILTER (WHERE approval_status = 'rejected')::int AS rejected
      FROM m.post_draft
      WHERE created_at > NOW() - INTERVAL '7 days'
    `),

    // 2. Published posts per platform (last 7 days)
    sql(supabase, `
      SELECT platform, COUNT(*)::int AS cnt
      FROM m.post_publish
      WHERE published_at > NOW() - INTERVAL '7 days'
      GROUP BY platform ORDER BY cnt DESC
    `),

    // 3. Per-client published with platform breakdown
    sql(supabase, `
      SELECT c.client_name, pp.platform, COUNT(*)::int AS cnt
      FROM m.post_publish pp
      JOIN c.client c ON c.client_id = pp.client_id
      WHERE pp.published_at > NOW() - INTERVAL '7 days'
        AND c.status = 'active'
      GROUP BY c.client_name, pp.platform
      ORDER BY c.client_name, cnt DESC
    `),

    // 4. Per-client drafts needing review
    sql(supabase, `
      SELECT c.client_name, COUNT(*)::int AS needs_review
      FROM m.post_draft pd
      JOIN c.client c ON c.client_id = pd.client_id
      WHERE pd.approval_status = 'needs_review'
        AND c.status = 'active'
      GROUP BY c.client_name
    `),

    // 5. Token expiry warnings (< 60 days) with client name
    sql(supabase, `
      SELECT cpp.platform, cpp.page_name, c.client_name,
        EXTRACT(DAY FROM (cpp.token_expires_at - NOW()))::int AS days_remaining
      FROM c.client_publish_profile cpp
      JOIN c.client c ON c.client_id = cpp.client_id
      WHERE cpp.token_expires_at < NOW() + INTERVAL '60 days'
        AND cpp.page_access_token IS NOT NULL
        AND c.status = 'active'
      ORDER BY cpp.token_expires_at ASC
    `),

    // 6. Stuck AI jobs (pending > 2 hours)
    sql(supabase, `
      SELECT COUNT(*)::int AS stuck
      FROM m.ai_job
      WHERE status IN ('pending', 'queued')
        AND created_at < NOW() - INTERVAL '2 hours'
    `),

    // 7. Inactive cron jobs
    sql(supabase, `
      SELECT jobname, schedule
      FROM cron.job
      WHERE NOT active
      ORDER BY jobname
    `).catch(() => [] as any[]),

    // 8. Active feed count
    sql(supabase, `
      SELECT COUNT(*)::int AS cnt
      FROM f.feed_source
      WHERE status = 'active'
    `),

    // 9. High give-up feeds this week
    sql(supabase, `
      SELECT fs.name AS feed_name,
        ROUND(
          COUNT(*) FILTER (WHERE di.body_fetch_status LIKE 'give_up%')::numeric /
          NULLIF(COUNT(*)::numeric, 0), 2
        ) AS giveup_ratio
      FROM f.feed_source fs
      JOIN f.canonical_content_item ci ON ci.feed_source_id = fs.id
      JOIN m.digest_item di ON di.canonical_item_id = ci.id
      WHERE di.created_at > NOW() - INTERVAL '7 days'
        AND fs.status = 'active'
      GROUP BY fs.name
      HAVING COUNT(*) FILTER (WHERE di.body_fetch_status LIKE 'give_up%')::numeric /
             NULLIF(COUNT(*)::numeric, 0) > 0.7
      ORDER BY giveup_ratio DESC
      LIMIT 10
    `).catch(() => [] as any[]),

    // 10. Pipeline incidents
    sql(supabase, `
      SELECT
        COUNT(*)::int AS total,
        COUNT(*) FILTER (WHERE auto_healed = true)::int AS auto_healed,
        COUNT(*) FILTER (WHERE auto_healed = false AND resolved_at IS NOT NULL)::int AS manually_resolved,
        COUNT(*) FILTER (WHERE resolved_at IS NULL)::int AS still_open,
        ROUND(AVG(EXTRACT(EPOCH FROM (resolved_at - detected_at)) / 60)
          FILTER (WHERE resolved_at IS NOT NULL), 1) AS avg_mttr_minutes
      FROM m.pipeline_incident
      WHERE detected_at > NOW() - INTERVAL '7 days'
    `).catch(() => [{ total: 0, auto_healed: 0, manually_resolved: 0, still_open: 0, avg_mttr_minutes: null }]),
  ]);

  // Assemble pipeline health
  const ds = draftStats[0] ?? { drafts_generated: 0, auto_approved: 0, manually_approved: 0, rejected: 0 };
  const totalPublished = publishedPlatform.reduce((s, r) => s + Number(r.cnt), 0);
  const pipelineHealth: PipelineHealth = {
    drafts_generated: Number(ds.drafts_generated),
    auto_approved: Number(ds.auto_approved),
    manually_approved: Number(ds.manually_approved),
    rejected: Number(ds.rejected),
    posts_published: totalPublished,
    platform_breakdown: publishedPlatform.map(r => ({ platform: String(r.platform), count: Number(r.cnt) })),
  };

  // Assemble per-client summaries
  const reviewMap = Object.fromEntries(clientReview.map(r => [r.client_name, Number(r.needs_review)]));
  const tokenByClient: Record<string, ActiveIssues["token_warnings"]> = {};
  for (const t of tokenRows) {
    const name = String(t.client_name);
    if (!tokenByClient[name]) tokenByClient[name] = [];
    tokenByClient[name].push({ platform: String(t.platform), page_name: String(t.page_name), client_name: name, days_remaining: Number(t.days_remaining) });
  }

  // Build client list from published + review data
  const clientNames = new Set<string>();
  clientPublished.forEach(r => clientNames.add(String(r.client_name)));
  clientReview.forEach(r => clientNames.add(String(r.client_name)));
  tokenRows.forEach(r => clientNames.add(String(r.client_name)));

  const clientSummaries: ClientSummary[] = [...clientNames].sort().map(name => {
    const platformCounts: Record<string, number> = {};
    clientPublished.filter(r => r.client_name === name).forEach(r => {
      platformCounts[String(r.platform)] = Number(r.cnt);
    });
    return {
      client_name: name,
      posts_published: Object.values(platformCounts).reduce((s, n) => s + n, 0),
      platform_counts: platformCounts,
      needs_review: reviewMap[name] ?? 0,
      token_warnings: tokenByClient[name] ?? [],
    };
  });

  // Active issues
  const activeIssues: ActiveIssues = {
    token_warnings: tokenRows.map(r => ({
      platform: String(r.platform),
      page_name: String(r.page_name),
      client_name: String(r.client_name),
      days_remaining: Number(r.days_remaining),
    })),
    stuck_jobs: Number(stuckRows[0]?.stuck ?? 0),
    inactive_crons: (cronRows as any[]).map(r => ({ jobname: String(r.jobname), schedule: String(r.schedule) })),
  };

  // Feed health
  const feedHealth: FeedHealth = {
    active_feeds: Number(feedCountRows[0]?.cnt ?? 0),
    high_giveup_feeds: (feedGiveupRows as any[]).map(r => ({
      feed_name: String(r.feed_name),
      giveup_ratio: Number(r.giveup_ratio),
    })),
  };

  // Incidents
  const ir = incidentRows[0] ?? { total: 0, auto_healed: 0, manually_resolved: 0, still_open: 0, avg_mttr_minutes: null };
  const incidentSummary: IncidentSummary = {
    total: Number(ir.total ?? 0),
    auto_healed: Number(ir.auto_healed ?? 0),
    manually_resolved: Number(ir.manually_resolved ?? 0),
    still_open: Number(ir.still_open ?? 0),
    avg_mttr_minutes: ir.avg_mttr_minutes != null ? Number(ir.avg_mttr_minutes) : null,
  };

  return { pipelineHealth, clientSummaries, activeIssues, feedHealth, incidentSummary };
}

/* ── Platform label helpers ── */
const PLATFORM_LABELS: Record<string, string> = {
  facebook: "FB", instagram: "IG", linkedin: "LI", youtube: "YT", wordpress: "WP",
};
function platformLabel(p: string): string { return PLATFORM_LABELS[p.toLowerCase()] ?? p; }
function platformBadge(platform: string, count: number): string {
  return `<span style="display:inline-block;background:#f1f5f9;color:#334155;font-size:11px;font-weight:600;padding:2px 8px;border-radius:99px;margin:1px 2px;">${platformLabel(platform)} ${count}</span>`;
}

/* ── Email builder ── */
function buildEmail(stats: Awaited<ReturnType<typeof gatherAllStats>>): { subject: string; html: string } {
  const { pipelineHealth: ph, clientSummaries, activeIssues, feedHealth, incidentSummary } = stats;

  const now = new Date();
  const weekEnd = now.toLocaleDateString("en-AU", { day: "numeric", month: "short", timeZone: "Australia/Sydney" });
  const weekStart = new Date(now.getTime() - 7 * 86400000).toLocaleDateString("en-AU", { day: "numeric", month: "short", timeZone: "Australia/Sydney" });
  const yearLabel = now.toLocaleDateString("en-AU", { year: "numeric", timeZone: "Australia/Sydney" });

  const issueCount = activeIssues.token_warnings.length + (activeIssues.stuck_jobs > 0 ? 1 : 0) + activeIssues.inactive_crons.length;
  const healthIcon = issueCount > 0 ? "\u26A0\uFE0F" : ph.posts_published > 0 ? "\u2705" : "\u26A0\uFE0F";

  const subject = `${healthIcon} ICE Weekly Report \u2014 ${weekStart}\u2013${weekEnd} ${yearLabel}`;

  // ── Section 1: Pipeline Health ──
  const pipelineRows = [
    ["Drafts generated", ph.drafts_generated, "#0f172a"],
    ["Auto-approved", ph.auto_approved, "#16a34a"],
    ["Manually approved", ph.manually_approved, "#0f172a"],
    ["Rejected", ph.rejected, ph.rejected > 0 ? "#dc2626" : "#0f172a"],
    ["Posts published", ph.posts_published, "#06b6d4"],
  ];

  const platformBreakdownHtml = ph.platform_breakdown.length > 0
    ? `<div style="padding:8px 16px 12px;">${ph.platform_breakdown.map(p => platformBadge(p.platform, p.count)).join(" ")}</div>`
    : "";

  const pipelineSection = `
    <div style="background:white;border-radius:16px;border:1px solid #e2e8f0;overflow:hidden;margin-bottom:16px;">
      <div style="padding:14px 16px;border-bottom:1px solid #f1f5f9;">
        <p style="font-size:12px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:0.05em;margin:0;">Pipeline Health (7 days)</p>
      </div>
      <table style="width:100%;border-collapse:collapse;">
        ${pipelineRows.map(([label, val, color], i) => `
          <tr${i % 2 === 1 ? ' style="background:#f8fafc;"' : ''}>
            <td style="padding:10px 16px;font-size:13px;color:#334155;">${label}</td>
            <td style="padding:10px 16px;font-size:16px;font-weight:700;color:${color};text-align:right;">${val}</td>
          </tr>`).join("")}
      </table>
      ${platformBreakdownHtml}
    </div>`;

  // ── Section 2: Per-Client Summary ──
  const clientRowsHtml = clientSummaries.map(c => {
    const platforms = Object.entries(c.platform_counts).map(([p, n]) => platformBadge(p, n)).join(" ");
    const reviewBadge = c.needs_review > 0
      ? `<span style="background:#fef3c7;color:#92400e;padding:2px 8px;border-radius:99px;font-size:11px;font-weight:600;">${c.needs_review} to review</span>`
      : "";
    const tokenBadges = c.token_warnings.map(t => {
      const color = t.days_remaining < 14 ? "#dc2626" : "#d97706";
      return `<span style="color:${color};font-size:11px;">${platformLabel(t.platform)} token: ${t.days_remaining}d</span>`;
    }).join(" ");

    return `
      <tr>
        <td style="padding:12px 16px;border-bottom:1px solid #f1f5f9;">
          <div style="font-size:14px;font-weight:600;color:#0f172a;">${c.client_name}</div>
          <div style="margin-top:4px;">${platforms || '<span style="color:#94a3b8;font-size:12px;">No posts</span>'}</div>
        </td>
        <td style="padding:12px 16px;border-bottom:1px solid #f1f5f9;font-size:18px;font-weight:700;color:#0f172a;text-align:center;vertical-align:top;">${c.posts_published}</td>
        <td style="padding:12px 16px;border-bottom:1px solid #f1f5f9;text-align:right;vertical-align:top;">
          ${reviewBadge}${tokenBadges ? `<div style="margin-top:2px;">${tokenBadges}</div>` : ""}
        </td>
      </tr>`;
  }).join("");

  const clientSection = `
    <div style="background:white;border-radius:16px;border:1px solid #e2e8f0;overflow:hidden;margin-bottom:16px;">
      <div style="padding:14px 16px;border-bottom:1px solid #f1f5f9;">
        <p style="font-size:12px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:0.05em;margin:0;">Per-Client Breakdown</p>
      </div>
      <table style="width:100%;border-collapse:collapse;">
        <thead><tr style="background:#f8fafc;">
          <th style="padding:8px 16px;font-size:11px;color:#94a3b8;font-weight:600;text-align:left;">Client</th>
          <th style="padding:8px 16px;font-size:11px;color:#94a3b8;font-weight:600;text-align:center;">Posts</th>
          <th style="padding:8px 16px;font-size:11px;color:#94a3b8;font-weight:600;text-align:right;">Status</th>
        </tr></thead>
        <tbody>${clientRowsHtml}</tbody>
      </table>
    </div>`;

  // ── Section 3: Active Issues ──
  const issueItems: string[] = [];
  if (activeIssues.stuck_jobs > 0) {
    issueItems.push(`<li style="color:#dc2626;margin-bottom:8px;"><strong>${activeIssues.stuck_jobs} stuck AI job${activeIssues.stuck_jobs !== 1 ? "s" : ""}</strong> &mdash; pending for over 2 hours</li>`);
  }
  for (const t of activeIssues.token_warnings) {
    const color = t.days_remaining < 14 ? "#dc2626" : "#d97706";
    issueItems.push(`<li style="color:${color};margin-bottom:8px;"><strong>${t.platform}</strong> token for <strong>${t.page_name}</strong> (${t.client_name}) expires in <strong>${t.days_remaining} days</strong></li>`);
  }
  for (const c of activeIssues.inactive_crons) {
    issueItems.push(`<li style="color:#d97706;margin-bottom:8px;">Cron <strong>${c.jobname}</strong> is <strong>inactive</strong> (schedule: ${c.schedule})</li>`);
  }

  const issuesSection = issueItems.length > 0
    ? `<div style="background:#fff7ed;border:1px solid #fed7aa;border-radius:12px;padding:16px 20px;margin-bottom:16px;">
        <p style="font-size:12px;font-weight:700;color:#9a3412;text-transform:uppercase;letter-spacing:0.05em;margin:0 0 10px;">Active Issues (${issueItems.length})</p>
        <ul style="margin:0;padding-left:18px;font-size:13px;">${issueItems.join("")}</ul>
      </div>`
    : `<div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:12px;padding:14px 20px;margin-bottom:16px;">
        <p style="font-size:14px;color:#166534;margin:0;">\u2705 No active issues. Pipeline running cleanly.</p>
      </div>`;

  // ── Section 4: Feed Health ──
  const feedGiveupHtml = feedHealth.high_giveup_feeds.length > 0
    ? feedHealth.high_giveup_feeds.map(f =>
        `<li style="color:#d97706;margin-bottom:4px;font-size:13px;"><strong>${f.feed_name}</strong> &mdash; ${Math.round(f.giveup_ratio * 100)}% give-up rate</li>`
      ).join("")
    : "";

  const feedSection = `
    <div style="background:white;border-radius:16px;border:1px solid #e2e8f0;overflow:hidden;margin-bottom:16px;">
      <div style="padding:14px 16px;border-bottom:1px solid #f1f5f9;">
        <p style="font-size:12px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:0.05em;margin:0;">Feed Health</p>
      </div>
      <div style="padding:12px 16px;">
        <p style="font-size:13px;color:#334155;margin:0 0 4px;">Active feeds: <strong>${feedHealth.active_feeds}</strong></p>
        ${feedGiveupHtml
          ? `<p style="font-size:12px;color:#92400e;margin:8px 0 4px;font-weight:600;">High give-up feeds this week:</p><ul style="margin:0;padding-left:18px;">${feedGiveupHtml}</ul>`
          : `<p style="font-size:13px;color:#16a34a;margin:4px 0 0;">\u2705 All feeds healthy</p>`}
      </div>
    </div>`;

  // ── Section 5: Incidents ──
  const incidentSection = incidentSummary.total === 0
    ? `<div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:12px;padding:14px 20px;margin-bottom:16px;">
        <p style="font-size:14px;color:#166534;margin:0;">\u2705 No pipeline incidents this week.</p>
      </div>`
    : `<div style="background:white;border-radius:16px;border:1px solid #e2e8f0;overflow:hidden;margin-bottom:16px;">
        <div style="padding:12px 16px;border-bottom:1px solid #f1f5f9;">
          <p style="font-size:12px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:0.05em;margin:0;">Pipeline Incidents (7 days)</p>
        </div>
        <table style="width:100%;border-collapse:collapse;">
          <tr><td style="padding:10px 16px;font-size:13px;color:#334155;">Total</td><td style="padding:10px 16px;font-size:13px;font-weight:700;text-align:right;">${incidentSummary.total}</td></tr>
          <tr style="background:#f8fafc;"><td style="padding:10px 16px;font-size:13px;color:#334155;">Auto-healed</td><td style="padding:10px 16px;font-size:13px;font-weight:700;color:#16a34a;text-align:right;">${incidentSummary.auto_healed}</td></tr>
          <tr><td style="padding:10px 16px;font-size:13px;color:#334155;">Manually resolved</td><td style="padding:10px 16px;font-size:13px;font-weight:700;text-align:right;">${incidentSummary.manually_resolved}</td></tr>
          <tr style="background:#f8fafc;"><td style="padding:10px 16px;font-size:13px;color:#334155;">Still open</td><td style="padding:10px 16px;font-size:13px;font-weight:700;${incidentSummary.still_open > 0 ? "color:#dc2626;" : ""}text-align:right;">${incidentSummary.still_open}</td></tr>
          ${incidentSummary.avg_mttr_minutes != null ? `<tr><td style="padding:10px 16px;font-size:13px;color:#334155;">Avg resolve time</td><td style="padding:10px 16px;font-size:13px;font-weight:700;text-align:right;">${incidentSummary.avg_mttr_minutes} min</td></tr>` : ""}
        </table>
      </div>`;

  // ── Assemble full email ──
  const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
<div style="max-width:560px;margin:32px auto;padding:0 16px 40px;">

  <!-- Header -->
  <div style="margin-bottom:24px;">
    <span style="background:#06b6d4;color:white;font-weight:700;font-size:14px;padding:6px 14px;border-radius:8px;">Invegent ICE</span>
    <span style="color:#94a3b8;font-size:13px;margin-left:10px;">Weekly Manager Report</span>
  </div>

  <!-- Title card -->
  <div style="background:white;border-radius:16px;border:1px solid #e2e8f0;padding:24px;margin-bottom:16px;">
    <h1 style="font-size:20px;font-weight:700;color:#0f172a;margin:0 0 4px;">Weekly Report</h1>
    <p style="font-size:14px;color:#64748b;margin:0;">${weekStart} \u2013 ${weekEnd} ${yearLabel}</p>
    <p style="font-size:14px;color:#64748b;margin:8px 0 0;">
      ${healthIcon} <strong style="color:#0f172a;">${ph.posts_published} posts</strong> published &middot;
      <strong style="color:#0f172a;">${ph.drafts_generated} drafts</strong> generated &middot;
      <strong style="${issueCount > 0 ? "color:#dc2626;" : "color:#0f172a;"}">${issueCount} issue${issueCount !== 1 ? "s" : ""}</strong>
    </p>
  </div>

  ${pipelineSection}
  ${clientSection}
  ${issuesSection}
  ${feedSection}
  ${incidentSection}

  <!-- Footer -->
  <p style="color:#94a3b8;font-size:12px;text-align:center;margin-top:20px;">
    ICE Weekly Manager Report &middot; ${VERSION}<br>
    <a href="https://dashboard.invegent.com" style="color:#06b6d4;text-decoration:none;">Open dashboard</a>
  </p>

</div>
</body></html>`;

  return { subject, html };
}

async function sendEmail(opts: { to: string; subject: string; html: string }): Promise<void> {
  const resendKey = Deno.env.get("RESEND_API_KEY");
  if (!resendKey) throw new Error("RESEND_API_KEY not set");

  const fromEmail = Deno.env.get("RESEND_FROM_EMAIL") ?? Deno.env.get("NOTIFY_FROM") ?? "noreply@invegent.com";

  const resp = await fetch(RESEND_API_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${resendKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: `Invegent Reports <${fromEmail}>`,
      to: [opts.to],
      subject: opts.subject,
      html: opts.html,
    }),
  });

  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(`Resend ${resp.status}: ${text.slice(0, 400)}`);
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "content-type, authorization, x-weekly-report-key" } });
  }

  const supabase = getServiceClient();

  try {
    const stats = await gatherAllStats(supabase);
    const { subject, html } = buildEmail(stats);

    const recipient = Deno.env.get("MANAGER_REPORT_EMAIL") ?? "pk@invegent.com";
    await sendEmail({ to: recipient, subject, html });

    console.log(`[${VERSION}] Sent to ${recipient}: ${subject}`);

    return new Response(
      JSON.stringify({
        ok: true,
        version: VERSION,
        recipient,
        subject,
        stats: {
          posts_published: stats.pipelineHealth.posts_published,
          drafts_generated: stats.pipelineHealth.drafts_generated,
          clients: stats.clientSummaries.length,
          issues: stats.activeIssues.token_warnings.length + (stats.activeIssues.stuck_jobs > 0 ? 1 : 0) + stats.activeIssues.inactive_crons.length,
          active_feeds: stats.feedHealth.active_feeds,
          incidents: stats.incidentSummary.total,
        },
      }),
      { headers: { "Content-Type": "application/json" } }
    );
  } catch (e: any) {
    console.error(`[${VERSION}] error:`, e);
    return new Response(
      JSON.stringify({ ok: false, error: e.message, version: VERSION }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
});
