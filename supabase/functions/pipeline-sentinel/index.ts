import { createClient } from 'jsr:@supabase/supabase-js@2';

const VERSION = 'pipeline-sentinel-v1.0.0';

function getServiceClient() {
  const url = Deno.env.get('SUPABASE_URL')!;
  const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  return createClient(url, key, { auth: { persistSession: false } });
}

async function sendTelegramAlert(message: string): Promise<void> {
  const token = Deno.env.get('TELEGRAM_BOT_TOKEN');
  const chatId = Deno.env.get('TELEGRAM_CHAT_ID');
  if (!token || !chatId) {
    console.warn('[sentinel] Telegram not configured — skipping alert');
    return;
  }
  try {
    await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text: message, parse_mode: 'HTML' }),
    });
  } catch (e) {
    console.error('[sentinel] Telegram send failed:', e);
  }
}

async function runChecks(supabase: ReturnType<typeof getServiceClient>): Promise<{
  checked: number;
  incidents: number;
  criticals: number;
}> {
  const { data: clients } = await supabase.rpc('exec_sql', {
    query: `SELECT client_id, client_name, timezone
            FROM c.client WHERE status = 'active'`
  });

  let checked = 0, incidents = 0, criticals = 0;
  let globalIngestChecked = false;

  for (const client of (clients ?? [])) {
    const cid = client.client_id;
    const name = client.client_name;
    checked++;

    // CHECK 1 — No drafts in 48h (CRITICAL)
    const { data: draftCheck } = await supabase.rpc('exec_sql', {
      query: `SELECT COUNT(*) AS cnt FROM m.post_draft
              WHERE client_id = '${cid}'
                AND created_at > NOW() - INTERVAL '48 hours'`
    });
    if (Number((draftCheck as any[])?.[0]?.cnt ?? 0) === 0) {
      const { data: existing } = await supabase.rpc('exec_sql', {
        query: `SELECT incident_id FROM m.pipeline_incident
                WHERE client_id = '${cid}' AND check_name = 'no_drafts_48h'
                  AND resolved_at IS NULL AND detected_at > NOW() - INTERVAL '4 hours'
                LIMIT 1`
      });
      if (!(existing as any[])?.length) {
        await supabase.rpc('insert_pipeline_incident', {
          p_client_id: cid,
          p_check_name: 'no_drafts_48h',
          p_severity: 'CRITICAL',
          p_description: `${name}: No drafts generated in the last 48 hours. Pipeline may be stalled.`,
          p_context: { client_name: name },
          p_auto_healable: false,
        });
        incidents++; criticals++;
        await sendTelegramAlert(
          `\uD83D\uDD34 <b>ICE CRITICAL</b> \u2014 ${name}\nNo drafts in 48h. Check pipeline.\n/monitor`
        );
      }
    }

    // CHECK 2 — No posts in 48h despite active schedule (WARNING)
    const { data: schedCheck } = await supabase.rpc('exec_sql', {
      query: `SELECT COUNT(*) AS schedule_rows FROM c.client_publish_schedule
              WHERE client_id = '${cid}' AND enabled = true`
    });
    const hasSchedule = Number((schedCheck as any[])?.[0]?.schedule_rows ?? 0) > 0;
    if (hasSchedule) {
      const { data: pubCheck } = await supabase.rpc('exec_sql', {
        query: `SELECT COUNT(*) AS cnt FROM m.post_publish
                WHERE client_id = '${cid}'
                  AND published_at > NOW() - INTERVAL '48 hours'`
      });
      if (Number((pubCheck as any[])?.[0]?.cnt ?? 0) === 0) {
        const { data: existing } = await supabase.rpc('exec_sql', {
          query: `SELECT incident_id FROM m.pipeline_incident
                  WHERE client_id = '${cid}' AND check_name = 'no_posts_48h'
                    AND resolved_at IS NULL AND detected_at > NOW() - INTERVAL '4 hours'
                  LIMIT 1`
        });
        if (!(existing as any[])?.length) {
          await supabase.rpc('insert_pipeline_incident', {
            p_client_id: cid,
            p_check_name: 'no_posts_48h',
            p_severity: 'WARNING',
            p_description: `${name}: No posts published in last 48h despite active schedule.`,
            p_context: { client_name: name, has_schedule: true },
            p_auto_healable: false,
          });
          incidents++;
        }
      }
    }

    // CHECK 3 — AI job queue depth > 20 (WARNING)
    const { data: jobCheck } = await supabase.rpc('exec_sql', {
      query: `SELECT COUNT(*) AS cnt FROM m.ai_job
              WHERE client_id = '${cid}' AND status = 'queued'`
    });
    const queueDepth = Number((jobCheck as any[])?.[0]?.cnt ?? 0);
    if (queueDepth > 20) {
      const { data: existing } = await supabase.rpc('exec_sql', {
        query: `SELECT incident_id FROM m.pipeline_incident
                WHERE client_id = '${cid}' AND check_name = 'ai_queue_depth'
                  AND resolved_at IS NULL AND detected_at > NOW() - INTERVAL '2 hours'
                LIMIT 1`
      });
      if (!(existing as any[])?.length) {
        await supabase.rpc('insert_pipeline_incident', {
          p_client_id: cid,
          p_check_name: 'ai_queue_depth',
          p_severity: 'WARNING',
          p_description: `${name}: AI job queue has ${queueDepth} items \u2014 may be backing up.`,
          p_context: { client_name: name, queue_depth: queueDepth },
          p_auto_healable: false,
        });
        incidents++;
      }
    }

    // CHECK 4 — Stuck AI jobs pending > 2h (CRITICAL, auto_healable)
    const { data: stuckCheck } = await supabase.rpc('exec_sql', {
      query: `SELECT COUNT(*) AS cnt FROM m.ai_job
              WHERE client_id = '${cid}' AND status = 'pending'
                AND created_at < NOW() - INTERVAL '2 hours'`
    });
    const stuckCount = Number((stuckCheck as any[])?.[0]?.cnt ?? 0);
    if (stuckCount > 0) {
      const { data: existing } = await supabase.rpc('exec_sql', {
        query: `SELECT incident_id FROM m.pipeline_incident
                WHERE client_id = '${cid}' AND check_name = 'stuck_ai_jobs'
                  AND resolved_at IS NULL AND detected_at > NOW() - INTERVAL '1 hour'
                LIMIT 1`
      });
      if (!(existing as any[])?.length) {
        await supabase.rpc('insert_pipeline_incident', {
          p_client_id: cid,
          p_check_name: 'stuck_ai_jobs',
          p_severity: 'CRITICAL',
          p_description: `${name}: ${stuckCount} AI job(s) stuck in pending for >2h.`,
          p_context: { client_name: name, stuck_count: stuckCount, fix_action: 'reset_stuck_ai_jobs' },
          p_auto_healable: true,
        });
        incidents++; criticals++;
        await sendTelegramAlert(
          `\uD83D\uDD34 <b>ICE CRITICAL</b> \u2014 ${name}\n${stuckCount} stuck AI job(s). Auto-heal eligible.`
        );
      }
    }

    // CHECK 5 — Feed ingest stalled globally (only once per run)
    if (!globalIngestChecked) {
      globalIngestChecked = true;
      const { data: ingestCheck } = await supabase.rpc('exec_sql', {
        query: `SELECT COUNT(*) AS cnt FROM f.ingest_run
                WHERE created_at > NOW() - INTERVAL '7 hours'`
      });
      if (Number((ingestCheck as any[])?.[0]?.cnt ?? 0) === 0) {
        const { data: existing } = await supabase.rpc('exec_sql', {
          query: `SELECT incident_id FROM m.pipeline_incident
                  WHERE check_name = 'feed_ingest_stalled' AND client_id IS NULL
                    AND resolved_at IS NULL AND detected_at > NOW() - INTERVAL '4 hours'
                  LIMIT 1`
        });
        if (!(existing as any[])?.length) {
          await supabase.rpc('insert_pipeline_incident', {
            p_client_id: null,
            p_check_name: 'feed_ingest_stalled',
            p_severity: 'CRITICAL',
            p_description: 'Global: Feed ingest has not run in over 7 hours.',
            p_context: {},
            p_auto_healable: false,
          });
          incidents++; criticals++;
          await sendTelegramAlert('\uD83D\uDD34 <b>ICE CRITICAL</b> \u2014 Feed ingest stalled globally. Check ingest worker.');
        }
      }
    }
  }

  return { checked, incidents, criticals };
}

Deno.serve(async () => {
  const supabase = getServiceClient();
  try {
    const result = await runChecks(supabase);
    console.log(`[sentinel] ${VERSION} \u2014 checked=${result.checked} incidents=${result.incidents} criticals=${result.criticals}`);
    return new Response(JSON.stringify({ ok: true, version: VERSION, ...result }), {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (e: any) {
    console.error('[sentinel] error:', e);
    return new Response(JSON.stringify({ ok: false, error: e.message }), {
      status: 500, headers: { 'Content-Type': 'application/json' }
    });
  }
});
