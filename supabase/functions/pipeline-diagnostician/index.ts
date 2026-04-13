import { createClient } from 'jsr:@supabase/supabase-js@2';

const VERSION = 'pipeline-diagnostician-v1.0.0';

function getServiceClient() {
  const url = Deno.env.get('SUPABASE_URL')!;
  const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  return createClient(url, key, { auth: { persistSession: false } });
}

async function gatherClientState(supabase: ReturnType<typeof getServiceClient>, clientId: string) {
  const checks = await Promise.all([
    supabase.rpc('exec_sql', { query: `SELECT client_name, status, timezone FROM c.client WHERE client_id = '${clientId}'` }),
    supabase.rpc('exec_sql', { query: `SELECT status, model FROM c.client_ai_profile WHERE client_id = '${clientId}' ORDER BY is_default DESC LIMIT 1` }),
    supabase.rpc('exec_sql', { query: `SELECT publish_enabled, auto_approve_enabled, mode FROM c.client_publish_profile WHERE client_id = '${clientId}' LIMIT 1` }),
    supabase.rpc('exec_sql', { query: `SELECT COUNT(*) AS cnt FROM c.client_content_scope WHERE client_id = '${clientId}'` }),
    supabase.rpc('exec_sql', { query: `SELECT COUNT(*) AS cnt FROM c.client_source WHERE client_id = '${clientId}'` }),
    supabase.rpc('exec_sql', { query: `SELECT status, COUNT(*) AS cnt FROM m.ai_job WHERE client_id = '${clientId}' AND created_at > NOW() - INTERVAL '48 hours' GROUP BY status` }),
    supabase.rpc('exec_sql', { query: `SELECT approval_status, COUNT(*) AS cnt FROM m.post_draft WHERE client_id = '${clientId}' AND created_at > NOW() - INTERVAL '48 hours' GROUP BY approval_status` }),
    supabase.rpc('exec_sql', { query: `SELECT COUNT(*) AS cnt FROM m.post_publish WHERE client_id = '${clientId}' AND published_at > NOW() - INTERVAL '48 hours'` }),
    supabase.rpc('exec_sql', { query: `SELECT COUNT(*) AS active_feeds FROM f.feed_source fs JOIN c.client_source cs ON cs.source_id = fs.source_id WHERE cs.client_id = '${clientId}' AND fs.status = 'active'` }),
    supabase.rpc('exec_sql', { query: `SELECT COUNT(*) AS cnt FROM f.ingest_run WHERE created_at > NOW() - INTERVAL '7 hours'` }),
  ]);

  return {
    client: (checks[0].data as any[])?.[0],
    aiProfile: (checks[1].data as any[])?.[0],
    publishProfile: (checks[2].data as any[])?.[0],
    contentScopeCount: Number((checks[3].data as any[])?.[0]?.cnt ?? 0),
    feedSourceCount: Number((checks[4].data as any[])?.[0]?.cnt ?? 0),
    aiJobsByStatus: checks[5].data ?? [],
    draftsByStatus: checks[6].data ?? [],
    publishedLast48h: Number((checks[7].data as any[])?.[0]?.cnt ?? 0),
    activeFeeds: Number((checks[8].data as any[])?.[0]?.active_feeds ?? 0),
    recentIngestRuns: Number((checks[9].data as any[])?.[0]?.cnt ?? 0),
  };
}

async function runDiagnosis(clientId: string, checkName: string | null): Promise<{
  finding: string;
  probable_cause: string;
  recommended_fix: string;
  auto_fixable: boolean;
  fix_action?: string;
}> {
  const supabase = getServiceClient();
  const anthropicKey = Deno.env.get('ANTHROPIC_API_KEY')!;
  const state = await gatherClientState(supabase, clientId);

  const systemPrompt = `You are an expert ICE pipeline diagnostician.
ICE is an AI content engine: feeds \u2192 ingest \u2192 canonicalise \u2192 digest \u2192 ai-worker \u2192 auto-approver \u2192 publish queue \u2192 publisher.

You will be given the current state of a client's pipeline and must diagnose why it is failing.
Return ONLY valid JSON:
{
  "finding": string (1 sentence: what is wrong),
  "probable_cause": string (1-2 sentences: most likely root cause),
  "recommended_fix": string (1-3 actionable steps),
  "auto_fixable": boolean (true only if the fix is: reset stuck jobs, re-enable a disabled flag, or retry a failed queue item \u2014 NOT auth, NOT token refresh, NOT feed config changes),
  "fix_action": string | null (if auto_fixable: one of "reset_stuck_ai_jobs" | "reset_stuck_queue" | null)
}`;

  const userPrompt = `Client: ${state.client?.client_name ?? clientId}
Failed check: ${checkName ?? 'general'}

Current state:
- AI profile: ${state.aiProfile ? `status=${state.aiProfile.status}, model=${state.aiProfile.model}` : 'MISSING \u2014 no AI profile configured'}
- Publish profile: ${state.publishProfile ? `enabled=${state.publishProfile.publish_enabled}, auto_approve=${state.publishProfile.auto_approve_enabled}, mode=${state.publishProfile.mode}` : 'MISSING \u2014 no publish profile configured'}
- Content scope rows: ${state.contentScopeCount} (0 means no verticals assigned)
- Feed sources assigned: ${state.feedSourceCount} (0 means no feeds)
- Active feeds: ${state.activeFeeds}
- Recent ingest runs (7h): ${state.recentIngestRuns}
- AI jobs last 48h: ${JSON.stringify(state.aiJobsByStatus)}
- Drafts last 48h by status: ${JSON.stringify(state.draftsByStatus)}
- Posts published last 48h: ${state.publishedLast48h}

Diagnose the most likely cause of the failure and provide a recommended fix.`;

  const resp = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': anthropicKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-6',
      max_tokens: 600,
      temperature: 0.1,
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
    }),
  });

  const data = await resp.json();
  const raw = data?.content?.[0]?.text ?? '{}';
  try {
    const cleaned = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/, '').trim();
    return JSON.parse(cleaned);
  } catch {
    return { finding: raw.slice(0, 200), probable_cause: 'Parse error', recommended_fix: 'Check raw response', auto_fixable: false };
  }
}

Deno.serve(async (req: Request) => {
  const supabase = getServiceClient();
  try {
    const body = await req.json().catch(() => ({}));
    const clientId: string | null = body.client_id ?? null;
    const incidentId: string | null = body.incident_id ?? null;
    const checkName: string | null = body.check_name ?? null;

    if (!clientId) {
      return new Response(JSON.stringify({ ok: false, error: 'client_id required' }), { status: 400 });
    }

    const result = await runDiagnosis(clientId, checkName);

    // Write finding back to incident if provided
    if (incidentId) {
      const diagJson = JSON.stringify({ diagnosis: result }).replace(/'/g, "''");
      await supabase.rpc('exec_sql', {
        query: `UPDATE m.pipeline_incident
                SET context = COALESCE(context, '{}'::jsonb) || '${diagJson}'::jsonb
                WHERE incident_id = '${incidentId}'`
      });
    }

    console.log(`[diagnostician] ${VERSION} client=${clientId} auto_fixable=${result.auto_fixable}`);
    return new Response(JSON.stringify({ ok: true, version: VERSION, clientId, ...result }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ ok: false, error: e.message }), { status: 500 });
  }
});
