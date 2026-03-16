import { createClient } from "jsr:@supabase/supabase-js@2";

// draft-notifier v1.0.0
// pg_cron: every 30 minutes
// Finds unnotified needs_review drafts for portal-enabled clients,
// sends one email per client via Resend, marks drafts as notified.
//
// Required Supabase secrets: RESEND_API_KEY, PORTAL_URL (optional), NOTIFY_FROM (optional)

const VERSION = "draft-notifier-v1.0.0";
const RESEND_API_URL = "https://api.resend.com/emails";

function getServiceClient() {
  const url = Deno.env.get("SUPABASE_URL");
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !key) throw new Error("Missing Supabase credentials");
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

async function sendReviewEmail(opts: {
  to: string;
  clientName: string;
  draftTitles: string[];
  pendingCount: number;
}): Promise<void> {
  const resendKey = Deno.env.get("RESEND_API_KEY");
  if (!resendKey) {
    console.warn("[draft-notifier] RESEND_API_KEY not set — email skipped");
    return;
  }

  const portalUrl = Deno.env.get("PORTAL_URL") ?? "https://portal.invegent.com";
  const fromEmail = Deno.env.get("NOTIFY_FROM") ?? "notifications@invegent.com";

  const items = opts.draftTitles
    .slice(0, 5)
    .map((t) => `<li style="padding:6px 0;color:#334155;font-size:15px;">${t || "New post"}</li>`)
    .join("");

  const moreNote = opts.draftTitles.length > 5
    ? `<p style="color:#64748b;font-size:13px;margin:8px 0 0;">...and ${opts.draftTitles.length - 5} more</p>`
    : "";

  const plural = opts.pendingCount !== 1;
  const subject = `${opts.pendingCount} post${plural ? "s" : ""} ready for your review — ${opts.clientName}`;

  const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"></head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:-apple-system,sans-serif;">
<div style="max-width:480px;margin:32px auto;padding:0 16px 32px;">
  <div style="margin-bottom:24px;">
    <span style="background:#06b6d4;color:white;font-weight:700;font-size:15px;padding:6px 14px;border-radius:8px;">Invegent</span>
  </div>
  <div style="background:white;border-radius:16px;border:1px solid #e2e8f0;padding:24px;">
    <h1 style="font-size:20px;color:#0f172a;margin:0 0 8px;">${opts.pendingCount} post${plural ? "s" : ""} ready for your review</h1>
    <p style="color:#64748b;font-size:15px;margin:0 0 20px;">New content is waiting for your approval in the ${opts.clientName} portal.</p>
    <ul style="list-style:none;padding:12px 16px;margin:0 0 20px;background:#f8fafc;border-radius:10px;">${items}</ul>
    ${moreNote}
    <a href="${portalUrl}/inbox" style="display:inline-block;background:#06b6d4;color:white;font-weight:600;font-size:16px;padding:14px 28px;border-radius:12px;text-decoration:none;">Review posts &rarr;</a>
  </div>
  <p style="color:#94a3b8;font-size:12px;margin-top:16px;text-align:center;">You're receiving this because you have posts awaiting approval in the Invegent portal.</p>
</div>
</body></html>`;

  const resp = await fetch(RESEND_API_URL, {
    method: "POST",
    headers: { Authorization: `Bearer ${resendKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from: `Invegent <${fromEmail}>`, to: [opts.to], subject, html }),
  });

  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(`Resend ${resp.status}: ${text.slice(0, 400)}`);
  }
}

Deno.serve(async () => {
  const supabase = getServiceClient();

  const { data: rows } = await supabase.rpc("exec_sql", {
    query: `
      SELECT
        pd.post_draft_id,
        COALESCE(pd.draft_title, 'New post') AS draft_title,
        COALESCE(pd.client_id, dr.client_id)  AS client_id,
        c.client_name,
        c.notifications_email
      FROM m.post_draft pd
      LEFT JOIN m.digest_item  di ON di.digest_item_id  = pd.digest_item_id
      LEFT JOIN m.digest_run   dr ON dr.digest_run_id   = di.digest_run_id
      JOIN  c.client c ON c.client_id = COALESCE(pd.client_id, dr.client_id)
      WHERE pd.approval_status      = 'needs_review'
        AND pd.notification_sent_at IS NULL
        AND c.portal_enabled         = true
        AND c.notifications_email   IS NOT NULL
      ORDER BY c.client_id, pd.created_at DESC
    `,
  });

  if (!rows || !Array.isArray(rows) || rows.length === 0) {
    return new Response(
      JSON.stringify({ ok: true, version: VERSION, sent: 0, message: "no_pending_drafts" }),
      { headers: { "Content-Type": "application/json" } }
    );
  }

  type Row = { post_draft_id: string; draft_title: string; client_id: string; client_name: string; notifications_email: string };

  const byClient = new Map<string, Row[]>();
  for (const row of rows as Row[]) {
    if (!byClient.has(row.client_id)) byClient.set(row.client_id, []);
    byClient.get(row.client_id)!.push(row);
  }

  let emailsSent = 0;
  const notifiedIds: string[] = [];
  const errors: string[] = [];

  for (const [, clientDrafts] of byClient) {
    const first = clientDrafts[0];
    try {
      await sendReviewEmail({
        to: first.notifications_email,
        clientName: first.client_name,
        draftTitles: clientDrafts.map((d) => d.draft_title),
        pendingCount: clientDrafts.length,
      });
      notifiedIds.push(...clientDrafts.map((d) => d.post_draft_id));
      emailsSent++;
    } catch (e: any) {
      errors.push(`${first.client_id}: ${e?.message ?? String(e)}`);
    }
  }

  if (notifiedIds.length > 0) {
    const idList = notifiedIds.map((id) => `'${id}'::uuid`).join(", ");
    await supabase.rpc("exec_sql", {
      query: `UPDATE m.post_draft SET notification_sent_at = NOW() WHERE post_draft_id IN (${idList})`,
    });
  }

  return new Response(
    JSON.stringify({ ok: true, version: VERSION, drafts_found: rows.length, emails_sent: emailsSent, drafts_notified: notifiedIds.length, errors }),
    { headers: { "Content-Type": "application/json" } }
  );
});
