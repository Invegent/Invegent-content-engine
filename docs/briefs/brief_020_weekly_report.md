# Claude Code Brief 020 — Weekly Manager Report Email (B5)

**Date:** 12 April 2026
**Status:** READY TO RUN
**Decisions:** D073, D074
**Repo:** `Invegent-content-engine`
**Working directory:** `C:\Users\parve\Invegent-content-engine`
**Supabase project:** `mbkmaxqhsohbtwsqolns`
**MCPs required:** Supabase MCP, GitHub MCP
**Estimated time:** 1–2 hours

---

## What this builds

A weekly email report delivered to `pk@invegent.com` every Monday at 7am AEST
(Sunday 21:00 UTC). It shows the previous 7 days at a glance:
posts published per client, drafts pending, pipeline issues, token expiry warnings.

This replaces manual dashboard checking. Once running, PK's Monday morning
starts with the full picture already in the inbox.

---

## Report sections

1. **Pipeline headline** — total posts published last 7 days, health status
2. **Per-client breakdown** — posts published, drafts pending, dead items
3. **Alerts** — token expiry warnings (<60 days), stuck jobs, high dead draft count
4. **Quick stats** — feed health, AI job queue depth

---

## Task 1 — Create the Edge Function

**File:** `supabase/functions/weekly-manager-report/index.ts`

```typescript
import { createClient } from "jsr:@supabase/supabase-js@2";

const VERSION = "weekly-manager-report-v1.0.0";
const RESEND_API_URL = "https://api.resend.com/emails";

function getServiceClient() {
  const url = Deno.env.get("SUPABASE_URL");
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !key) throw new Error("Missing Supabase credentials");
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

interface ClientStat {
  client_name: string;
  posts_7d: number;
  needs_review: number;
  dead_7d: number;
}

interface TokenWarning {
  platform: string;
  page_name: string;
  days_remaining: number;
}

async function gatherStats(supabase: ReturnType<typeof getServiceClient>) {
  // Posts published last 7 days per client
  const { data: postRows } = await supabase.rpc("exec_sql", {
    query: `
      SELECT c.client_name, COUNT(pp.post_publish_id)::int AS posts_7d
      FROM m.post_publish pp
      JOIN c.client c ON c.client_id = pp.client_id
      WHERE pp.published_at > NOW() - INTERVAL '7 days'
        AND c.status = 'active'
      GROUP BY c.client_name
      ORDER BY c.client_name
    `,
  });

  // Drafts needing review per client
  const { data: reviewRows } = await supabase.rpc("exec_sql", {
    query: `
      SELECT c.client_name, COUNT(pd.post_draft_id)::int AS needs_review
      FROM m.post_draft pd
      JOIN c.client c ON c.client_id = pd.client_id
      WHERE pd.approval_status = 'needs_review'
        AND c.status = 'active'
      GROUP BY c.client_name
    `,
  });

  // Dead drafts created this week per client
  const { data: deadRows } = await supabase.rpc("exec_sql", {
    query: `
      SELECT c.client_name, COUNT(pd.post_draft_id)::int AS dead_7d
      FROM m.post_draft pd
      JOIN c.client c ON c.client_id = pd.client_id
      WHERE pd.approval_status = 'dead'
        AND pd.updated_at > NOW() - INTERVAL '7 days'
        AND c.status = 'active'
      GROUP BY c.client_name
    `,
  });

  // All active clients
  const { data: clientRows } = await supabase.rpc("exec_sql", {
    query: `SELECT client_name FROM c.client WHERE status = 'active' ORDER BY client_name`,
  });

  // Merge into per-client stats
  const clients = ((clientRows ?? []) as any[]).map((r: any) => r.client_name as string);
  const postMap = Object.fromEntries(((postRows ?? []) as any[]).map((r: any) => [r.client_name, Number(r.posts_7d)]));
  const reviewMap = Object.fromEntries(((reviewRows ?? []) as any[]).map((r: any) => [r.client_name, Number(r.needs_review)]));
  const deadMap = Object.fromEntries(((deadRows ?? []) as any[]).map((r: any) => [r.client_name, Number(r.dead_7d)]));

  const clientStats: ClientStat[] = clients.map(name => ({
    client_name: name,
    posts_7d: postMap[name] ?? 0,
    needs_review: reviewMap[name] ?? 0,
    dead_7d: deadMap[name] ?? 0,
  }));

  // Stuck AI jobs
  const { data: stuckRows } = await supabase.rpc("exec_sql", {
    query: `SELECT COUNT(*)::int AS stuck FROM m.ai_job WHERE status = 'pending' AND created_at < NOW() - INTERVAL '2 hours'`,
  });
  const stuckJobs = Number((stuckRows as any[])?.[0]?.stuck ?? 0);

  // Token expiry warnings (<60 days)
  const { data: tokenRows } = await supabase.rpc("exec_sql", {
    query: `
      SELECT platform, page_name,
        EXTRACT(DAY FROM (token_expires_at - NOW()))::int AS days_remaining
      FROM c.client_publish_profile
      WHERE token_expires_at < NOW() + INTERVAL '60 days'
        AND page_access_token IS NOT NULL
      ORDER BY token_expires_at ASC
    `,
  });
  const tokenWarnings: TokenWarning[] = ((tokenRows ?? []) as any[]).map((r: any) => ({
    platform: r.platform,
    page_name: r.page_name,
    days_remaining: Number(r.days_remaining),
  }));

  // Total posts this week
  const totalPosts = clientStats.reduce((s, c) => s + c.posts_7d, 0);
  const totalNeedsReview = clientStats.reduce((s, c) => s + c.needs_review, 0);
  const totalDead = clientStats.reduce((s, c) => s + c.dead_7d, 0);

  return { clientStats, stuckJobs, tokenWarnings, totalPosts, totalNeedsReview, totalDead };
}

function buildEmail(stats: Awaited<ReturnType<typeof gatherStats>>): { subject: string; html: string } {
  const { clientStats, stuckJobs, tokenWarnings, totalPosts, totalNeedsReview, totalDead } = stats;

  const now = new Date();
  const weekLabel = now.toLocaleDateString("en-AU", { day: "numeric", month: "long", year: "numeric", timeZone: "Australia/Sydney" });

  // Determine overall health
  const hasAlerts = stuckJobs > 0 || tokenWarnings.length > 0 || totalNeedsReview > 3;
  const healthEmoji = hasAlerts ? "⚠️" : totalPosts > 0 ? "✅" : "⚠️";
  const healthLabel = hasAlerts ? "Needs attention" : totalPosts > 0 ? "All good" : "No posts published";

  const subject = `${healthEmoji} ICE Weekly — ${totalPosts} posts published — ${weekLabel}`;

  // Client rows
  const clientRowsHtml = clientStats.map(c => {
    const reviewBadge = c.needs_review > 0
      ? `<span style="background:#fef3c7;color:#92400e;padding:2px 8px;border-radius:99px;font-size:12px;">${c.needs_review} to review</span>`
      : ``;
    const deadBadge = c.dead_7d > 0
      ? `<span style="background:#fee2e2;color:#991b1b;padding:2px 8px;border-radius:99px;font-size:12px;">${c.dead_7d} dead</span>`
      : ``;
    return `
      <tr>
        <td style="padding:12px 16px;border-bottom:1px solid #f1f5f9;font-size:14px;color:#334155;font-weight:500;">${c.client_name}</td>
        <td style="padding:12px 16px;border-bottom:1px solid #f1f5f9;font-size:14px;color:#0f172a;font-weight:700;text-align:right;">${c.posts_7d}</td>
        <td style="padding:12px 16px;border-bottom:1px solid #f1f5f9;text-align:right;">${reviewBadge}${deadBadge}</td>
      </tr>`;
  }).join("");

  // Alert rows
  const alertsHtml: string[] = [];
  if (stuckJobs > 0) {
    alertsHtml.push(`<li style="color:#dc2626;margin-bottom:6px;">❌ <strong>${stuckJobs} stuck AI job${stuckJobs !== 1 ? 's' : ''}</strong> — pending for more than 2 hours. Check the Diagnostics tab.</li>`);
  }
  for (const t of tokenWarnings) {
    const urgency = t.days_remaining < 14 ? "#dc2626" : "#d97706";
    const icon = t.days_remaining < 14 ? "🔴" : "⚠️";
    alertsHtml.push(`<li style="color:${urgency};margin-bottom:6px;">${icon} <strong>${t.platform} token for ${t.page_name}</strong> expires in ${t.days_remaining} days. Refresh now.</li>`);
  }
  if (totalNeedsReview > 3) {
    alertsHtml.push(`<li style="color:#d97706;margin-bottom:6px;">⚠️ <strong>${totalNeedsReview} drafts</strong> waiting for human review. Check the Inbox.</li>`);
  }

  const alertsSection = alertsHtml.length > 0
    ? `<div style="background:#fff7ed;border:1px solid #fed7aa;border-radius:12px;padding:16px 20px;margin-bottom:20px;">
        <p style="font-size:13px;font-weight:700;color:#9a3412;margin:0 0 8px;">ALERTS</p>
        <ul style="margin:0;padding-left:16px;">${alertsHtml.join("")}</ul>
      </div>`
    : `<div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:12px;padding:14px 20px;margin-bottom:20px;">
        <p style="font-size:14px;color:#166534;margin:0;">✅ No alerts this week. Pipeline running cleanly.</p>
      </div>`;

  const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"></head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
<div style="max-width:560px;margin:32px auto;padding:0 16px 40px;">

  <!-- Header -->
  <div style="margin-bottom:24px;">
    <span style="background:#06b6d4;color:white;font-weight:700;font-size:14px;padding:6px 14px;border-radius:8px;">Invegent ICE</span>
  </div>

  <!-- Title -->
  <div style="background:white;border-radius:16px;border:1px solid #e2e8f0;padding:24px;margin-bottom:16px;">
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:4px;">
      <h1 style="font-size:20px;font-weight:700;color:#0f172a;margin:0;">Weekly Report</h1>
      <span style="font-size:13px;color:#64748b;">${weekLabel}</span>
    </div>
    <p style="font-size:14px;color:#64748b;margin:4px 0 0;">${healthEmoji} ${healthLabel} &mdash; <strong style="color:#0f172a;">${totalPosts} posts</strong> published in the last 7 days</p>
  </div>

  <!-- Alerts -->
  ${alertsSection}

  <!-- Client table -->
  <div style="background:white;border-radius:16px;border:1px solid #e2e8f0;overflow:hidden;margin-bottom:16px;">
    <div style="padding:14px 16px;border-bottom:1px solid #f1f5f9;">
      <p style="font-size:12px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:0.05em;margin:0;">Client breakdown</p>
    </div>
    <table style="width:100%;border-collapse:collapse;">
      <thead>
        <tr style="background:#f8fafc;">
          <th style="padding:8px 16px;font-size:11px;color:#94a3b8;font-weight:600;text-align:left;">Client</th>
          <th style="padding:8px 16px;font-size:11px;color:#94a3b8;font-weight:600;text-align:right;">Posts</th>
          <th style="padding:8px 16px;font-size:11px;color:#94a3b8;font-weight:600;text-align:right;">Status</th>
        </tr>
      </thead>
      <tbody>${clientRowsHtml}</tbody>
    </table>
  </div>

  <!-- Footer -->
  <p style="color:#94a3b8;font-size:12px;text-align:center;margin-top:16px;">
    ICE Weekly Manager Report &mdash; <a href="https://dashboard.invegent.com" style="color:#06b6d4;">Open dashboard</a>
  </p>

</div>
</body></html>`;

  return { subject, html };
}

async function sendEmail(opts: { to: string; subject: string; html: string }): Promise<void> {
  const resendKey = Deno.env.get("RESEND_API_KEY");
  if (!resendKey) throw new Error("RESEND_API_KEY not set");

  const fromEmail = Deno.env.get("NOTIFY_FROM") ?? "noreply@invegent.com";

  const resp = await fetch(RESEND_API_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${resendKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: `Invegent ICE <${fromEmail}>`,
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
  // Allow GET for manual trigger from dashboard or pg_cron
  const supabase = getServiceClient();

  try {
    const stats = await gatherStats(supabase);
    const { subject, html } = buildEmail(stats);

    const recipient = Deno.env.get("MANAGER_REPORT_EMAIL") ?? "pk@invegent.com";
    await sendEmail({ to: recipient, subject, html });

    console.log(`[weekly-manager-report] Sent to ${recipient}: ${subject}`);

    return new Response(
      JSON.stringify({
        ok: true,
        version: VERSION,
        recipient,
        subject,
        totalPosts: stats.totalPosts,
        alerts: stats.tokenWarnings.length + (stats.stuckJobs > 0 ? 1 : 0),
      }),
      { headers: { "Content-Type": "application/json" } }
    );
  } catch (e: any) {
    console.error("[weekly-manager-report] error:", e);
    return new Response(
      JSON.stringify({ ok: false, error: e.message, version: VERSION }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
});
```

---

## Task 2 — Create pg_cron job

Monday 7am AEST = Sunday 21:00 UTC.

```sql
SELECT cron.schedule(
  'weekly-manager-report-monday-7am-aest',
  '0 21 * * 0',
  $$
  SELECT net.http_post(
    url := (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'SUPABASE_URL') || '/functions/v1/weekly-manager-report',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'SUPABASE_SERVICE_ROLE_KEY')
    ),
    body := '{}'
  );
  $$
);
```

Verify it was created:
```sql
SELECT jobname, schedule, active FROM cron.job WHERE jobname = 'weekly-manager-report-monday-7am-aest';
```

**Note on cron pattern:** If the vault lookup pattern doesn't work (some projects use
a different secret lookup), fall back to the same pattern used by other pg_cron jobs
in this project. Check an existing working cron job body for the correct pattern:
```sql
SELECT command FROM cron.job WHERE jobname = 'draft-notifier-every-30m' LIMIT 1;
```
Use that same pattern for the URL and auth header construction.

---

## Task 3 — Push to GitHub and deploy

```bash
cd C:\Users\parve\Invegent-content-engine
git add supabase/functions/weekly-manager-report/
git commit -m "feat: weekly manager report email B5 v1.0.0 — Monday 7am AEST via Resend"
git push origin main
npx supabase functions deploy weekly-manager-report --project-ref mbkmaxqhsohbtwsqolns
```

If CLI times out, note it and continue. Git push is sufficient.

---

## Task 4 — Manual test trigger

After deploy, invoke the function manually to verify the email arrives:

```bash
curl -X POST https://mbkmaxqhsohbtwsqolns.supabase.co/functions/v1/weekly-manager-report \
  -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json" \
  -d '{}'
```

Or invoke via Supabase dashboard → Edge Functions → weekly-manager-report → Test.

Check `pk@invegent.com` inbox for the report email.
Check Resend → Logs to confirm delivery.

---

## Task 5 — Write result file

Write `docs/briefs/brief_020_result.md` in Invegent-content-engine:
- Task 1: Edge Function created
- Task 2: pg_cron job created (include the jobname confirmation)
- Task 3: Deployed (ACTIVE) or needs manual deploy
- Task 4: Manual test result — did the email arrive?
- Notes on any issues

---

## Error handling

- If the vault secret lookup in pg_cron doesn't work, check an existing
  cron job body for the correct pattern and replicate it exactly.
- If `RESEND_API_KEY` is not set as a Supabase secret, the function will
  throw. Verify with: check other functions that use Resend (e.g. draft-notifier)
  and confirm the secret name.
- If `NOTIFY_FROM` is not set, the function falls back to `noreply@invegent.com`.
- If `MANAGER_REPORT_EMAIL` is not set, the function falls back to `pk@invegent.com`.
- The function accepts GET and POST — pg_cron uses GET-style invocation,
  manual testing can use either.

---

## What this brief does NOT include

- Feed health section (give-up rates per source) — can add in v1.1
- YouTube publishing stats — can add in v1.1
- HeyGen video pipeline stats — can add in v1.1
- Dashboard UI for manual trigger — future
- Opt-in/opt-out from email — PK is the only recipient
