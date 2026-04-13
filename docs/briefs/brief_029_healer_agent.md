# Claude Code Brief 029 — Healer Agent

**Date:** 13 April 2026
**Phase:** B — System Intelligence
**Repo:** `Invegent-content-engine`
**Supabase project:** `mbkmaxqhsohbtwsqolns`
**MCPs required:** Supabase MCP, GitHub MCP
**Estimated time:** 2–3 hours
**Depends on:** Brief 027 (pipeline_incident table), Brief 028 (incident structure)

---

## What this builds

The Healer executes safe auto-remediation for known, bounded failure patterns.
It only acts on incidents flagged `auto_healable = true` by Sentinel.
Every action is logged. No auth boundaries are crossed.

---

## Safe actions the Healer can take

| fix_action | What it does | Safe? |
|---|---|---|
| `reset_stuck_ai_jobs` | Sets pending ai_jobs > 2h back to 'queued' | ✅ Yes |
| `reset_stuck_queue` | Sets stuck publish_queue items back to 'queued' | ✅ Yes |
| `disable_dead_feed` | Sets feed_source status = 'inactive' if 100% give-up for 7d | ✅ Yes |

**Never auto-heals:** token refresh, external API calls, client config changes, data deletion.

---

## Task 1 — Create SECURITY DEFINER heal functions

```sql
CREATE OR REPLACE FUNCTION public.heal_reset_stuck_ai_jobs(p_client_id uuid)
RETURNS integer SECURITY DEFINER SET search_path = public AS $$
DECLARE v_count integer;
BEGIN
  UPDATE m.ai_job
  SET status = 'queued', locked_by = NULL, locked_at = NULL, updated_at = NOW()
  WHERE client_id = p_client_id
    AND status = 'pending'
    AND created_at < NOW() - INTERVAL '2 hours';
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION public.heal_reset_stuck_queue(p_client_id uuid)
RETURNS integer SECURITY DEFINER SET search_path = public AS $$
DECLARE v_count integer;
BEGIN
  UPDATE m.post_publish_queue
  SET status = 'queued', locked_by = NULL, locked_at = NULL, updated_at = NOW()
  WHERE client_id = p_client_id
    AND status IN ('running', 'locked')
    AND updated_at < NOW() - INTERVAL '2 hours';
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$ LANGUAGE plpgsql;

GRANT EXECUTE ON FUNCTION public.heal_reset_stuck_ai_jobs(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.heal_reset_stuck_queue(uuid) TO service_role;
```

---

## Task 2 — Create the Healer Edge Function

**File:** `supabase/functions/pipeline-healer/index.ts`

```typescript
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
  await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text: message, parse_mode: 'HTML' }),
  });
}

Deno.serve(async (req: Request) => {
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
          skipped.push(`${client_name}:${check_name} — unknown fix_action: ${fix_action}`);
          continue;
        }

        // Resolve the incident
        await supabase.rpc('resolve_pipeline_incident', {
          p_incident_id: incident_id,
          p_action_taken: actionDescription,
          p_resolved_by: 'healer-auto',
        });

        healed.push(`${client_name}:${check_name} — ${actionDescription}`);
        await sendTelegramAlert(
          `✅ <b>ICE Auto-Healed</b> — ${client_name}\n${check_name}: ${actionDescription}`
        );

      } catch (e: any) {
        console.error(`[healer] failed to heal incident ${incident_id}:`, e.message);
        skipped.push(`${incident_id} — error: ${e.message}`);
      }
    }

    console.log(`[healer] ${VERSION} — healed=${healed.length} skipped=${skipped.length}`);
    return new Response(
      JSON.stringify({ ok: true, version: VERSION, healed, skipped }),
      { headers: { 'Content-Type': 'application/json' } }
    );
  } catch (e: any) {
    return new Response(JSON.stringify({ ok: false, error: e.message }), { status: 500 });
  }
});
```

---

## Task 3 — Add Healer to pg_cron

Run after Sentinel. Schedule at minutes :02, :17, :32, :47 (2 minutes after Sentinel fires):

```sql
SELECT cron.schedule(
  'pipeline-healer-every-15m',
  '2,17,32,47 * * * *',
  $$
  SELECT net.http_post(
    url := (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'SUPABASE_URL')
            || '/functions/v1/pipeline-healer',
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

## Task 4 — Update Sentinel to include fix_action in context

The Healer reads `context->>'fix_action'` from incidents. Sentinel currently sets
`auto_healable = true` for stuck AI jobs but doesn't set the fix_action in context.

Update the stuck_ai_jobs incident insert in Sentinel to include fix_action:
```typescript
p_context: { client_name: name, stuck_count: stuckCount, fix_action: 'reset_stuck_ai_jobs' },
```

Commit this fix to `supabase/functions/pipeline-sentinel/index.ts` and redeploy:
```bash
npx supabase functions deploy pipeline-sentinel --project-ref mbkmaxqhsohbtwsqolns
```

---

## Task 5 — Push and deploy

```bash
cd C:\Users\parve\Invegent-content-engine
git add supabase/functions/pipeline-healer/ supabase/functions/pipeline-sentinel/
git commit -m "feat: pipeline-healer v1.0.0 + sentinel fix_action context"
git push origin main
npx supabase functions deploy pipeline-healer --project-ref mbkmaxqhsohbtwsqolns
```

---

## Task 6 — Write result file

Write `docs/briefs/brief_029_result.md` in Invegent-content-engine.
Include: functions created, cron job confirmed, Sentinel updated.

---

## Governance boundary — NEVER cross these

- Never refresh or touch access tokens
- Never make external API calls (no Facebook, no Anthropic)
- Never delete any data (incidents, posts, drafts, queue items)
- Never change client configuration (AI profile, publish profile settings)
- Only reset status fields back to a retriable state
