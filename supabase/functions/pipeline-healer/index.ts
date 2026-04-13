import { createClient } from 'jsr:@supabase/supabase-js@2';

const VERSION = 'pipeline-healer-v1.0.0';

function getServiceClient() {
  const url = Deno.env.get('SUPABASE_URL')!;
  const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  return createClient(url, key, { auth: { persistSession: false } });
}

async function sendTelegramAlert(message: string): Promise<void> {
  const token = Deno.env.get('TELEGRAM_BOT_TOKEN');
  const chatId = Deno.env.get('TELEGRAM_CHAT_ID');
  if (!token || !chatId) return;
  try {
    await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text: message, parse_mode: 'HTML' }),
    });
  } catch (e) {
    console.error('[healer] Telegram send failed:', e);
  }
}

Deno.serve(async () => {
  const supabase = getServiceClient();
  const healed: string[] = [];
  const skipped: string[] = [];

  try {
    // Find all unresolved, auto-healable incidents with a known fix_action
    const { data: incidents } = await supabase.rpc('exec_sql', {
      query: `
        SELECT pi.incident_id, pi.client_id, pi.check_name,
               pi.context->>'fix_action' AS fix_action,
               c.client_name
        FROM m.pipeline_incident pi
        JOIN c.client c ON c.client_id = pi.client_id
        WHERE pi.auto_healable = true
          AND pi.resolved_at IS NULL
          AND pi.detected_at > NOW() - INTERVAL '4 hours'
          AND pi.context->>'fix_action' IS NOT NULL
        ORDER BY pi.detected_at DESC
      `
    });

    for (const incident of (incidents as any[]) ?? []) {
      const { incident_id, client_id, fix_action, client_name, check_name } = incident;

      try {
        let affectedRows = 0;
        let actionDescription = '';

        if (fix_action === 'reset_stuck_ai_jobs') {
          const { data } = await supabase.rpc('heal_reset_stuck_ai_jobs', { p_client_id: client_id });
          affectedRows = Number(data ?? 0);
          actionDescription = `Reset ${affectedRows} stuck AI job(s) to queued`;
        } else if (fix_action === 'reset_stuck_queue') {
          const { data } = await supabase.rpc('heal_reset_stuck_queue', { p_client_id: client_id });
          affectedRows = Number(data ?? 0);
          actionDescription = `Reset ${affectedRows} stuck queue item(s) to queued`;
        } else {
          skipped.push(`${client_name}:${check_name} \u2014 unknown fix_action: ${fix_action}`);
          continue;
        }

        // Resolve the incident
        await supabase.rpc('resolve_pipeline_incident', {
          p_incident_id: incident_id,
          p_action_taken: actionDescription,
          p_resolved_by: 'healer-auto',
        });

        healed.push(`${client_name}:${check_name} \u2014 ${actionDescription}`);
        await sendTelegramAlert(
          `\u2705 <b>ICE Auto-Healed</b> \u2014 ${client_name}\n${check_name}: ${actionDescription}`
        );

      } catch (e: any) {
        console.error(`[healer] failed to heal incident ${incident_id}:`, e.message);
        skipped.push(`${incident_id} \u2014 error: ${e.message}`);
      }
    }

    console.log(`[healer] ${VERSION} \u2014 healed=${healed.length} skipped=${skipped.length}`);
    return new Response(
      JSON.stringify({ ok: true, version: VERSION, healed, skipped }),
      { headers: { 'Content-Type': 'application/json' } }
    );
  } catch (e: any) {
    return new Response(JSON.stringify({ ok: false, error: e.message }), { status: 500 });
  }
});
