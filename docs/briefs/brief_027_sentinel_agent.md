# Claude Code Brief 027 — Pipeline Sentinel Agent

**Date:** 13 April 2026
**Phase:** B — System Intelligence
**Repo:** `Invegent-content-engine`
**Working directory:** `C:\Users\parve\Invegent-content-engine`
**Supabase project:** `mbkmaxqhsohbtwsqolns`
**MCPs required:** Supabase MCP, GitHub MCP
**Estimated time:** 3–4 hours

---

## What this builds

ICE currently has zero proactive monitoring. Failures are only discovered when
PK notices them or a client complains. This brief builds the Sentinel agent —
a proactive health checker that catches pipeline failures before they're visible.

Sentinel runs every 15 minutes. For each active client, it checks 5 conditions.
Any failure writes an incident record and fires a Telegram alert.

---

## Task 1 — Create pipeline_incident table

```sql
CREATE TABLE IF NOT EXISTS m.pipeline_incident (
  incident_id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id uuid REFERENCES c.client(client_id),
  detected_at timestamptz DEFAULT NOW(),
  check_name text NOT NULL,
  severity text NOT NULL CHECK (severity IN ('INFO', 'WARNING', 'CRITICAL')),
  description text NOT NULL,
  context jsonb,
  auto_healable boolean DEFAULT false,
  auto_healed boolean DEFAULT false,
  action_taken text,
  resolved_at timestamptz,
  resolved_by text,
  created_at timestamptz DEFAULT NOW()
);

CREATE INDEX idx_pipeline_incident_client ON m.pipeline_incident(client_id);
CREATE INDEX idx_pipeline_incident_detected ON m.pipeline_incident(detected_at DESC);
CREATE INDEX idx_pipeline_incident_severity ON m.pipeline_incident(severity) WHERE resolved_at IS NULL;

-- Immutable insert trigger (incidents are never deleted)
CREATE OR REPLACE FUNCTION m.prevent_incident_delete()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'pipeline_incident rows are immutable — never delete incidents';
END;
$$;

CREATE TRIGGER no_delete_pipeline_incident
  BEFORE DELETE ON m.pipeline_incident
  FOR EACH ROW EXECUTE FUNCTION m.prevent_incident_delete();
```

---

## Task 2 — Create SECURITY DEFINER functions for Sentinel writes

```sql
CREATE OR REPLACE FUNCTION public.insert_pipeline_incident(
  p_client_id uuid,
  p_check_name text,
  p_severity text,
  p_description text,
  p_context jsonb DEFAULT NULL,
  p_auto_healable boolean DEFAULT false
)
RETURNS uuid SECURITY DEFINER SET search_path = public AS $$
DECLARE v_id uuid;
BEGIN
  INSERT INTO m.pipeline_incident
    (client_id, check_name, severity, description, context, auto_healable)
  VALUES
    (p_client_id, p_check_name, p_severity, p_description, p_context, p_auto_healable)
  RETURNING incident_id INTO v_id;
  RETURN v_id;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION public.resolve_pipeline_incident(
  p_incident_id uuid,
  p_action_taken text,
  p_resolved_by text DEFAULT 'sentinel-auto'
)
RETURNS void SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE m.pipeline_incident
  SET resolved_at = NOW(),
      resolved_by = p_resolved_by,
      action_taken = p_action_taken,
      auto_healed = (p_resolved_by = 'sentinel-auto')
  WHERE incident_id = p_incident_id
    AND resolved_at IS NULL;
END;
$$ LANGUAGE plpgsql;

GRANT EXECUTE ON FUNCTION public.insert_pipeline_incident(uuid,text,text,text,jsonb,boolean) TO service_role;
GRANT EXECUTE ON FUNCTION public.resolve_pipeline_incident(uuid,text,text) TO service_role;
```

---

## Task 3 — Create the Sentinel Edge Function

**File:** `supabase/functions/pipeline-sentinel/index.ts`

```typescript
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
  await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text: message, parse_mode: 'HTML' }),
  });
}

async function runChecks(supabase: ReturnType<typeof getServiceClient>): Promise<{
  checked: number;
  incidents: number;
  criticals: number;
}> {
  // Get all active clients
  const { data: clients } = await supabase.rpc('exec_sql', {
    query: `SELECT client_id, client_name, timezone
            FROM c.client WHERE status = 'active'`
  });

  let checked = 0, incidents = 0, criticals = 0;

  for (const client of (clients ?? [])) {
    const cid = client.client_id;
    const name = client.client_name;
    checked++;

    // CHECK 1 — Draft generated within 48h
    const { data: draftCheck } = await supabase.rpc('exec_sql', {
      query: `SELECT COUNT(*) AS cnt FROM m.post_draft
              WHERE client_id = '${cid}'
                AND created_at > NOW() - INTERVAL '48 hours'`
    });
    if (Number((draftCheck as any[])?.[0]?.cnt ?? 0) === 0) {
      // Check if this incident already exists and is unresolved
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
          `🔴 <b>ICE CRITICAL</b> — ${name}\nNo drafts in 48h. Check pipeline.\n/monitor`
        );
      }
    }

    // CHECK 2 — Published within schedule window (last 48h if has schedule rows)
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

    // CHECK 3 — AI job queue depth
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
          p_description: `${name}: AI job queue has ${queueDepth} items — may be backing up.`,
          p_context: { client_name: name, queue_depth: queueDepth },
          p_auto_healable: false,
        });
        incidents++;
      }
    }

    // CHECK 4 — Stuck AI jobs (pending > 2h)
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
        const incidentId = await supabase.rpc('insert_pipeline_incident', {
          p_client_id: cid,
          p_check_name: 'stuck_ai_jobs',
          p_severity: 'CRITICAL',
          p_description: `${name}: ${stuckCount} AI job(s) stuck in pending for >2h.`,
          p_context: { client_name: name, stuck_count: stuckCount },
          p_auto_healable: true,
        });
        incidents++; criticals++;
        await sendTelegramAlert(
          `🔴 <b>ICE CRITICAL</b> — ${name}\n${stuckCount} stuck AI job(s). Auto-heal eligible.`
        );
      }
    }

    // CHECK 5 — Feed ingest ran in last 7h (global check, only once)
    if (checked === 1) {
      const { data: ingestCheck } = await supabase.rpc('exec_sql', {
        query: `SELECT COUNT(*) AS cnt FROM f.ingest_run
                WHERE created_at > NOW() - INTERVAL '7 hours'`
      });
      if (Number((ingestCheck as any[])?.[0]?.cnt ?? 0) === 0) {
        await supabase.rpc('insert_pipeline_incident', {
          p_client_id: null,
          p_check_name: 'feed_ingest_stalled',
          p_severity: 'CRITICAL',
          p_description: 'Global: Feed ingest has not run in over 7 hours.',
          p_context: {},
          p_auto_healable: false,
        });
        incidents++; criticals++;
        await sendTelegramAlert('🔴 <b>ICE CRITICAL</b> — Feed ingest stalled globally. Check ingest worker.');
      }
    }
  }

  return { checked, incidents, criticals };
}

Deno.serve(async () => {
  const supabase = getServiceClient();
  try {
    const result = await runChecks(supabase);
    console.log(`[sentinel] ${VERSION} — checked=${result.checked} incidents=${result.incidents} criticals=${result.criticals}`);
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
```

---

## Task 4 — Add pg_cron job

```sql
SELECT cron.schedule(
  'pipeline-sentinel-every-15m',
  '*/15 * * * *',
  $$
  SELECT net.http_post(
    url := (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'SUPABASE_URL')
            || '/functions/v1/pipeline-sentinel',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'SUPABASE_SERVICE_ROLE_KEY')
    ),
    body := '{}'
  );
  $$
);
```

Use the same URL/auth pattern as other cron jobs in this project.
Verify: `SELECT jobname, schedule, active FROM cron.job WHERE jobname = 'pipeline-sentinel-every-15m';`

---

## Task 5 — Set Telegram secrets in Supabase

Check if TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID are already set as Supabase secrets:
```bash
npx supabase secrets list --project-ref mbkmaxqhsohbtwsqolns
```

If not set, add them:
```bash
npx supabase secrets set TELEGRAM_BOT_TOKEN=<value> TELEGRAM_CHAT_ID=<value> --project-ref mbkmaxqhsohbtwsqolns
```

The bot token is for `@InvegentICEbot`. Chat ID is PK's Telegram user ID or the bot's chat ID.
If values unknown, skip Telegram for now — Sentinel still writes incidents to DB without it.

---

## Task 6 — Push and deploy

```bash
cd C:\Users\parve\Invegent-content-engine
git add supabase/functions/pipeline-sentinel/
git commit -m "feat: pipeline-sentinel v1.0.0 — proactive 5-check health monitor every 15min"
git push origin main
npx supabase functions deploy pipeline-sentinel --project-ref mbkmaxqhsohbtwsqolns
```

---

## Task 7 — Manual test

Invoke manually and check:
```bash
curl -X POST https://mbkmaxqhsohbtwsqolns.supabase.co/functions/v1/pipeline-sentinel \
  -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY"
```

Expected: `{ok: true, checked: 3, incidents: N, criticals: N}`

Verify in DB:
```sql
SELECT check_name, severity, description, detected_at
FROM m.pipeline_incident
ORDER BY detected_at DESC
LIMIT 10;
```

---

## Task 8 — Write result file

Write `docs/briefs/brief_027_result.md` in Invegent-content-engine.

---

## Error handling

- Duplicate incident suppression: the 4h/2h/1h lookback windows prevent alert storms
- If insert_pipeline_incident fails (foreign key on client_id): for global checks pass NULL client_id — verify the column allows NULL
- Telegram optional: if bot token not available, function still runs and logs to DB
- insert_pipeline_incident needs to accept NULL p_client_id — check the function signature

## What this does NOT include

- Auto-healing (Brief 029 — Healer Agent)
- Root cause analysis (Brief 028 — Diagnostician)
- Dashboard incident panel (Brief 030)
