// onboarding-notifier v2.0.0
// Handles: new_submission, needs_info, approved email types

import { createClient } from 'jsr:@supabase/supabase-js@2';

const VERSION = 'onboarding-notifier-v2.0.0';
const OPERATOR_EMAIL = 'onboarding@invegent.com';
const SENDER = 'Invegent Onboarding <onboarding@invegent.com>';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'content-type, apikey, authorization',
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

function getServiceClient() {
  const url = Deno.env.get('SUPABASE_URL');
  const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!url || !key) throw new Error('Missing Supabase env vars');
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

async function sendEmail(resendKey: string, to: string, subject: string, html: string): Promise<void> {
  const resp = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from: SENDER, to: [to], subject, html }),
  });
  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(`Resend ${resp.status}: ${text.slice(0, 300)}`);
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: corsHeaders });

  const resendKey = Deno.env.get('RESEND_API_KEY');
  if (!resendKey) return json({ ok: false, error: 'RESEND_API_KEY not configured' }, 500);

  let body: any;
  try { body = await req.json(); } catch { return json({ ok: false, error: 'Invalid JSON' }, 400); }

  const { submission_id, type = 'new_submission' } = body ?? {};
  if (!submission_id) return json({ ok: false, error: 'Missing submission_id' }, 400);

  const supabase = getServiceClient();

  const { data: rows } = await supabase.rpc('exec_sql', {
    query: `
      SELECT os.contact_name, os.contact_email, os.business_name,
             os.selected_package_code, os.desired_platforms, os.submitted_at,
             os.missing_fields, os.operator_notes, os.update_token,
             sp.label AS package_label, sp.base_price_aud
      FROM c.onboarding_submission os
      LEFT JOIN c.service_package sp ON sp.package_code = os.selected_package_code AND sp.is_current = true
      WHERE os.submission_id = '${submission_id}'
      LIMIT 1
    `,
  });

  if (!rows?.length) return json({ ok: false, error: 'Submission not found' }, 404);

  const s = rows[0] as any;
  const platforms = Array.isArray(s.desired_platforms) ? s.desired_platforms.join(', ') : (s.desired_platforms ?? 'Not specified');
  const price = s.base_price_aud ? `$${s.base_price_aud}` : 'TBC';
  const packageLabel = s.package_label ?? s.selected_package_code ?? 'Not selected';
  const timestamp = s.submitted_at ? new Date(s.submitted_at).toLocaleString('en-AU', { timeZone: 'Australia/Sydney' }) : 'Unknown';

  const errors: string[] = [];

  if (type === 'new_submission') {
    // Operator notification
    try {
      await sendEmail(resendKey, OPERATOR_EMAIL, `New onboarding submission \u2014 ${s.business_name}`, `
        <h2>New onboarding submission</h2>
        <p>A new client has submitted an onboarding application.</p>
        <table style="border-collapse:collapse;font-family:sans-serif;">
          <tr><td style="padding:4px 12px 4px 0;font-weight:bold;">Business:</td><td>${s.business_name}</td></tr>
          <tr><td style="padding:4px 12px 4px 0;font-weight:bold;">Contact:</td><td>${s.contact_name} (${s.contact_email})</td></tr>
          <tr><td style="padding:4px 12px 4px 0;font-weight:bold;">Package:</td><td>${packageLabel} (${price}/month)</td></tr>
          <tr><td style="padding:4px 12px 4px 0;font-weight:bold;">Platforms:</td><td>${platforms}</td></tr>
          <tr><td style="padding:4px 12px 4px 0;font-weight:bold;">Submitted:</td><td>${timestamp}</td></tr>
        </table>
        <p style="margin-top:16px;"><a href="https://dashboard.invegent.com/onboarding">Review in dashboard</a></p>
      `);
    } catch (e: any) { errors.push(`operator: ${e.message}`); }

    // Client confirmation
    try {
      await sendEmail(resendKey, s.contact_email, 'Your Invegent application has been received', `
        <p>Hi ${s.contact_name},</p>
        <p>Thank you for applying to work with Invegent.</p>
        <p>We've received your application for the <strong>${packageLabel}</strong> package.
        Our team will review your details within 1&ndash;2 business days and be in touch at this email address.</p>
        <p>If you have any questions, email <a href="mailto:hello@invegent.com">hello@invegent.com</a>.</p>
        <p>Warm regards,<br/>Parveen Kumar<br/>Invegent</p>
      `);
    } catch (e: any) { errors.push(`client: ${e.message}`); }

  } else if (type === 'needs_info') {
    const missingFields = s.missing_fields ?? {};
    const operatorMsg = s.operator_notes ?? '';
    const updateLink = `https://portal.invegent.com/onboard/update?id=${submission_id}&token=${s.update_token ?? ''}`;

    let fieldList = '';
    for (const [field, reason] of Object.entries(missingFields)) {
      const label = field.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
      fieldList += `<li><strong>${label}:</strong> ${reason}</li>`;
    }

    try {
      await sendEmail(resendKey, s.contact_email, `We need a little more information \u2014 ${s.business_name}`, `
        <p>Hi ${s.contact_name},</p>
        <p>Thank you for applying to work with Invegent. We've reviewed your application and need a little more information before we can proceed.</p>
        ${operatorMsg ? `<p>${operatorMsg}</p>` : ''}
        <p>The following details need to be updated:</p>
        <ul>${fieldList}</ul>
        <p><a href="${updateLink}" style="display:inline-block;padding:10px 20px;background:#1B3A5C;color:white;text-decoration:none;border-radius:6px;">Update your application</a></p>
        <p style="font-size:12px;color:#666;">This link is unique to your application. Please do not share it.</p>
        <p>If you have any questions, email <a href="mailto:hello@invegent.com">hello@invegent.com</a>.</p>
        <p>Warm regards,<br/>Parveen Kumar<br/>Invegent</p>
      `);
    } catch (e: any) { errors.push(`client: ${e.message}`); }

  } else if (type === 'approved') {
    try {
      await sendEmail(resendKey, s.contact_email, 'Welcome to Invegent \u2014 your account is ready', `
        <p>Hi ${s.contact_name},</p>
        <p>Great news &mdash; your application has been approved!</p>
        <p>You've been set up on the <strong>${packageLabel}</strong> plan (${price}/month).</p>
        <p>You'll receive a separate login email shortly. Once logged in at <a href="https://portal.invegent.com">portal.invegent.com</a>, you'll be able to:</p>
        <ul>
          <li>Review your upcoming content</li>
          <li>Approve or adjust posts before they go live</li>
          <li>Track your content performance</li>
        </ul>
        <p>We'll be in touch shortly to walk you through getting started.</p>
        <p>Warm regards,<br/>Parveen Kumar<br/>Invegent</p>
      `);
    } catch (e: any) { errors.push(`client: ${e.message}`); }
  }

  return json({
    ok: errors.length === 0,
    version: VERSION,
    type,
    submission_id,
    errors: errors.length > 0 ? errors : undefined,
  });
});
