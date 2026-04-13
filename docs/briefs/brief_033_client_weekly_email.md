# Claude Code Brief 033 — Client Weekly Summary Email

**Date:** 13 April 2026
**Phase:** C — Client Experience
**Repo:** `Invegent-content-engine`
**Working directory:** `C:\Users\parve\Invegent-content-engine`
**Supabase project:** `mbkmaxqhsohbtwsqolns`
**MCPs required:** Supabase MCP, GitHub MCP
**Estimated time:** 2–3 hours

---

## What this builds

A weekly email to each active client every Monday morning.
Different from the B5 manager report (which goes to PK) —
this is client-facing: what ICE did for them this week, what's coming,
any actions needed.

Keeps ICE top of mind even when clients don't log in.

---

## Task 1 — Create the Edge Function

**File:** `supabase/functions/client-weekly-summary/index.ts`

```typescript
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
    ? `✅ ICE published ${postCount} post${postCount !== 1 ? 's' : ''} for you this week — ${weekLabel}`
    : `📋 Your ICE weekly summary — ${weekLabel}`;

  const postsHtml = stats.postsThisWeek.length > 0
    ? stats.postsThisWeek.map((p: any) => `
      <tr>
        <td style="padding:10px 16px;border-bottom:1px solid #f1f5f9;font-size:13px;color:#334155;">${p.draft_title}</td>
        <td style="padding:10px 16px;border-bottom:1px solid #f1f5f9;font-size:12px;color:#64748b;text-align:right;">
          ${new Date(p.published_at).toLocaleDateString('en-AU', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'Australia/Sydney' })}
        </td>
      </tr>`).join('')
    : `<tr><td colspan="2" style="padding:16px;color:#94a3b8;font-size:13px;text-align:center;">No posts published this week</td></tr>`;

  const actionSection = stats.draftsToReview > 0
    ? `<div style="background:#fff7ed;border:1px solid #fed7aa;border-radius:12px;padding:16px 20px;margin-bottom:20px;">
        <p style="font-size:14px;color:#92400e;margin:0;">⚠️ You have <strong>${stats.draftsToReview} draft${stats.draftsToReview !== 1 ? 's' : ''}</strong> waiting for your approval.
        <a href="https://portal.invegent.com/inbox" style="color:#06b6d4;">Review now →</a></p>
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
    <p style="font-size:13px;color:#64748b;margin:0;">${client.client_name} · ${weekLabel}</p>
  </div>

  ${actionSection}

  <div style="background:white;border-radius:16px;border:1px solid #e2e8f0;overflow:hidden;margin-bottom:16px;">
    <div style="padding:12px 16px;border-bottom:1px solid #f1f5f9;">
      <p style="font-size:11px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:0.05em;margin:0;">Published this week</p>
    </div>
    <table style="width:100%;border-collapse:collapse;">${postsHtml}</table>
  </div>

  <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:12px;padding:14px 20px;margin-bottom:16px;">
    <p style="font-size:13px;color:#166534;margin:0;">📅 <strong>${stats.upcomingQueued} post${stats.upcomingQueued !== 1 ? 's' : ''}</strong> scheduled and ready to go next week.</p>
  </div>

  <p style="color:#94a3b8;font-size:11px;text-align:center;margin-top:16px;">
    <a href="https://portal.invegent.com" style="color:#06b6d4;">View your portal</a> · powered by Invegent ICE
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
    // Get all active clients with email addresses
    const { data: clients } = await supabase.rpc('exec_sql', { query: `
      SELECT c.client_id, c.client_name, u.email
      FROM c.client c
      JOIN auth.users u ON u.id = c.client_id
      WHERE c.status = 'active'
    `});

    const results: any[] = [];

    for (const client of (clients ?? []) as any[]) {
      try {
        const stats = await getClientStats(supabase, client.client_id);
        const { subject, html } = buildClientEmail(client, stats);
        await sendEmail(client.email, subject, html);
        results.push({ client: client.client_name, sent: true });
        console.log(`[client-weekly-summary] Sent to ${client.client_name} <${client.email}>`);
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
```

---

## Task 2 — Add pg_cron job

Monday 7:30am AEST (30 minutes after the manager report) = Sunday 21:30 UTC:

```sql
SELECT cron.schedule(
  'client-weekly-summary-monday-730am-aest',
  '30 21 * * 0',
  $$
  SELECT net.http_post(
    url := (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'SUPABASE_URL')
            || '/functions/v1/client-weekly-summary',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'SUPABASE_SERVICE_ROLE_KEY')
    ),
    body := '{}'
  );
  $$
);
```

---

## Task 3 — Push, deploy, test

```bash
cd C:\Users\parve\Invegent-content-engine
git add supabase/functions/client-weekly-summary/
git commit -m "feat: client-weekly-summary v1.0.0 — Monday 7:30am AEST per-client email"
git push origin main
npx supabase functions deploy client-weekly-summary --project-ref mbkmaxqhsohbtwsqolns
```

Manual test (will send to actual client emails):
```bash
curl -X POST https://mbkmaxqhsohbtwsqolns.supabase.co/functions/v1/client-weekly-summary \
  -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY"
```

**Note:** This sends to real client auth.users emails. If PK wants to test without
sending to real clients, add a `TEST_MODE=true` env var that overrides recipient to `pk@invegent.com`.

---

## Task 4 — Write result file

Write `docs/briefs/brief_033_result.md` in Invegent-content-engine.
Include: client query result (how many emails would be sent), test result, cron job ID.

---

## Error handling

- The JOIN to `auth.users` on `u.id = c.client_id` assumes client_id matches the Supabase Auth user ID. Verify this assumption first with: `SELECT client_id FROM c.client WHERE status = 'active' LIMIT 3` and `SELECT id, email FROM auth.users LIMIT 3` — if client_id != user id, find the correct join column.
- If no auth user exists for a client (manually created clients): skip them, log warning, continue.
- Each client's email is sent individually with a try/catch — one failure does not stop others.
- draftsToReview only shows the action section if `require_client_approval = true` for that client. Add that check to the query.
