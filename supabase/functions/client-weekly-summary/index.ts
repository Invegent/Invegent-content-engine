import { createClient } from 'jsr:@supabase/supabase-js@2';

const VERSION = 'client-weekly-summary-v1.0.0';
const RESEND_API_URL = 'https://api.resend.com/emails';

function getServiceClient() {
  const url = Deno.env.get('SUPABASE_URL')!;
  const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  return createClient(url, key, { auth: { persistSession: false } });
}

async function getClientStats(supabase: ReturnType<typeof getServiceClient>, clientId: string) {
  const [posts, upcoming, drafts] = await Promise.all([
    supabase.rpc('exec_sql', { query: `
      SELECT pd.draft_title, pp.published_at, pp.platform
      FROM m.post_publish pp
      JOIN m.post_draft pd ON pd.post_draft_id = pp.post_draft_id
      WHERE pp.client_id = '${clientId}'
        AND pp.published_at > NOW() - INTERVAL '7 days'
      ORDER BY pp.published_at DESC
      LIMIT 5
    `}),
    supabase.rpc('exec_sql', { query: `
      SELECT COUNT(*) AS cnt FROM m.post_publish_queue
      WHERE client_id = '${clientId}' AND status = 'queued'
        AND scheduled_for > NOW()
    `}),
    supabase.rpc('exec_sql', { query: `
      SELECT COUNT(*) AS cnt FROM m.post_draft
      WHERE client_id = '${clientId}' AND approval_status = 'needs_review'
    `}),
  ]);

  return {
    postsThisWeek: (posts.data ?? []) as any[],
    upcomingQueued: Number((upcoming.data as any[])?.[0]?.cnt ?? 0),
    draftsToReview: Number((drafts.data as any[])?.[0]?.cnt ?? 0),
  };
}

function buildClientEmail(client: any, stats: Awaited<ReturnType<typeof getClientStats>>): { subject: string; html: string } {
  const weekLabel = new Date().toLocaleDateString('en-AU', {
    day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Australia/Sydney'
  });

  const postCount = stats.postsThisWeek.length;
  const subject = postCount > 0
    ? `\u2705 ICE published ${postCount} post${postCount !== 1 ? 's' : ''} for you this week \u2014 ${weekLabel}`
    : `\uD83D\uDCCB Your ICE weekly summary \u2014 ${weekLabel}`;

  const postsHtml = stats.postsThisWeek.length > 0
    ? stats.postsThisWeek.map((p: any) => `
      <tr>
        <td style="padding:10px 16px;border-bottom:1px solid #f1f5f9;font-size:13px;color:#334155;">${p.draft_title ?? 'Untitled post'}</td>
        <td style="padding:10px 16px;border-bottom:1px solid #f1f5f9;font-size:12px;color:#64748b;text-align:right;">
          ${new Date(p.published_at).toLocaleDateString('en-AU', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'Australia/Sydney' })}
        </td>
      </tr>`).join('')
    : `<tr><td colspan="2" style="padding:16px;color:#94a3b8;font-size:13px;text-align:center;">No posts published this week</td></tr>`;

  const actionSection = stats.draftsToReview > 0
    ? `<div style="background:#fff7ed;border:1px solid #fed7aa;border-radius:12px;padding:16px 20px;margin-bottom:20px;">
        <p style="font-size:14px;color:#92400e;margin:0;">\u26A0\uFE0F You have <strong>${stats.draftsToReview} draft${stats.draftsToReview !== 1 ? 's' : ''}</strong> waiting for your approval.
        <a href="https://portal.invegent.com/inbox" style="color:#06b6d4;">Review now \u2192</a></p>
      </div>`
    : '';

  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
<div style="max-width:520px;margin:32px auto;padding:0 16px 40px;">

  <div style="margin-bottom:20px;">
    <span style="background:#06b6d4;color:white;font-weight:700;font-size:13px;padding:5px 12px;border-radius:8px;">Invegent ICE</span>
  </div>

  <div style="background:white;border-radius:16px;border:1px solid #e2e8f0;padding:24px;margin-bottom:16px;">
    <h1 style="font-size:18px;font-weight:700;color:#0f172a;margin:0 0 6px;">Your weekly content summary</h1>
    <p style="font-size:13px;color:#64748b;margin:0;">${client.client_name} \u00B7 ${weekLabel}</p>
  </div>

  ${actionSection}

  <div style="background:white;border-radius:16px;border:1px solid #e2e8f0;overflow:hidden;margin-bottom:16px;">
    <div style="padding:12px 16px;border-bottom:1px solid #f1f5f9;">
      <p style="font-size:11px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:0.05em;margin:0;">Published this week</p>
    </div>
    <table style="width:100%;border-collapse:collapse;">${postsHtml}</table>
  </div>

  <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:12px;padding:14px 20px;margin-bottom:16px;">
    <p style="font-size:13px;color:#166534;margin:0;">\uD83D\uDCC5 <strong>${stats.upcomingQueued} post${stats.upcomingQueued !== 1 ? 's' : ''}</strong> scheduled and ready to go next week.</p>
  </div>

  <p style="color:#94a3b8;font-size:11px;text-align:center;margin-top:16px;">
    <a href="https://portal.invegent.com" style="color:#06b6d4;">View your portal</a> \u00B7 powered by Invegent ICE
  </p>

</div></body></html>`;

  return { subject, html };
}

async function sendEmail(to: string, subject: string, html: string): Promise<void> {
  const resendKey = Deno.env.get('RESEND_API_KEY')!;
  const from = Deno.env.get('NOTIFY_FROM') ?? 'noreply@invegent.com';
  const resp = await fetch(RESEND_API_URL, {
    method: 'POST',
    headers: { Authorization: `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from: `Invegent ICE <${from}>`, to: [to], subject, html }),
  });
  if (!resp.ok) throw new Error(`Resend ${resp.status}: ${await resp.text()}`);
}

Deno.serve(async () => {
  const supabase = getServiceClient();

  try {
    // Get all active clients with a notifications email
    const { data: clients } = await supabase.rpc('exec_sql', { query: `
      SELECT client_id, client_name, notifications_email
      FROM c.client
      WHERE status = 'active' AND notifications_email IS NOT NULL
    `});

    const results: any[] = [];

    for (const client of (clients ?? []) as any[]) {
      try {
        const stats = await getClientStats(supabase, client.client_id);
        const { subject, html } = buildClientEmail(client, stats);
        await sendEmail(client.notifications_email, subject, html);
        results.push({ client: client.client_name, email: client.notifications_email, sent: true });
        console.log(`[client-weekly-summary] Sent to ${client.client_name} <${client.notifications_email}>`);
      } catch (e: any) {
        results.push({ client: client.client_name, sent: false, error: e.message });
        console.error(`[client-weekly-summary] Failed for ${client.client_name}:`, e.message);
      }
    }

    return new Response(JSON.stringify({ ok: true, version: VERSION, results }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ ok: false, error: e.message }), { status: 500 });
  }
});
