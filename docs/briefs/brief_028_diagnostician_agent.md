# Claude Code Brief 028 — Diagnostician Agent

**Date:** 13 April 2026
**Phase:** B — System Intelligence
**Repo:** `Invegent-content-engine`, `invegent-dashboard`
**Supabase project:** `mbkmaxqhsohbtwsqolns`
**MCPs required:** Supabase MCP, GitHub MCP
**Estimated time:** 3–4 hours
**Depends on:** Brief 027 (pipeline_incident table must exist)

---

## What this builds

When Sentinel detects a failure, the Diagnostician runs root cause analysis.
It's triggered on-demand ("Run Diagnosis" button in dashboard) or automatically
when Sentinel logs a CRITICAL incident. It uses Claude to reason about the
current state and produce a structured finding.

---

## Task 1 — Create the Diagnostician Edge Function

**File:** `supabase/functions/pipeline-diagnostician/index.ts`

The function accepts a `client_id` and optional `check_name`. It:
1. Gathers current state for that client from multiple tables
2. Sends context to Claude with a structured diagnosis prompt
3. Returns a structured finding: what failed, probable cause, recommended fix, auto-fixable boolean
4. Writes the finding back to the relevant `m.pipeline_incident` row

```typescript
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
ICE is an AI content engine: feeds → ingest → canonicalise → digest → ai-worker → auto-approver → publish queue → publisher.

You will be given the current state of a client's pipeline and must diagnose why it is failing.
Return ONLY valid JSON:
{
  "finding": string (1 sentence: what is wrong),
  "probable_cause": string (1-2 sentences: most likely root cause),
  "recommended_fix": string (1-3 actionable steps),
  "auto_fixable": boolean (true only if the fix is: reset stuck jobs, re-enable a disabled flag, or retry a failed queue item — NOT auth, NOT token refresh, NOT feed config changes),
  "fix_action": string | null (if auto_fixable: one of "reset_stuck_ai_jobs" | "reset_stuck_queue" | null)
}`;

  const userPrompt = `Client: ${state.client?.client_name ?? clientId}
Failed check: ${checkName ?? 'general'}

Current state:
- AI profile: ${state.aiProfile ? `status=${state.aiProfile.status}, model=${state.aiProfile.model}` : 'MISSING — no AI profile configured'}
- Publish profile: ${state.publishProfile ? `enabled=${state.publishProfile.publish_enabled}, auto_approve=${state.publishProfile.auto_approve_enabled}, mode=${state.publishProfile.mode}` : 'MISSING — no publish profile configured'}
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
  const cleaned = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/, '').trim();
  return JSON.parse(cleaned);
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
      await supabase.rpc('exec_sql', {
        query: `UPDATE m.pipeline_incident
                SET context = context || '${JSON.stringify({ diagnosis: result })}'
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
```

---

## Task 2 — Add "Run Diagnosis" button to dashboard

**File:** `app/(dashboard)/diagnostics/page.tsx` in `invegent-dashboard`

Add a section: "Client Pipeline Diagnosis".

For each active client, show:
- Client name
- Last incident (from m.pipeline_incident, most recent unresolved)
- [Run Diagnosis] button → POST to `/api/diagnostics/run`

**New API route:** `app/api/diagnostics/run/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  const { clientId, incidentId, checkName } = await req.json();
  const resp = await fetch(
    `${process.env.SUPABASE_URL}/functions/v1/pipeline-diagnostician`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
      },
      body: JSON.stringify({ client_id: clientId, incident_id: incidentId, check_name: checkName }),
    }
  );
  const data = await resp.json();
  return NextResponse.json(data);
}
```

After diagnosis, display the result inline:
- Finding: bold
- Probable cause: normal text
- Recommended fix: highlighted box
- Auto-fixable badge: green (Yes) or amber (Needs manual action)

---

## Task 3 — Deploy

```bash
cd C:\Users\parve\Invegent-content-engine
git add supabase/functions/pipeline-diagnostician/
git commit -m "feat: pipeline-diagnostician v1.0.0 — Claude-powered root cause analysis"
git push origin main
npx supabase functions deploy pipeline-diagnostician --project-ref mbkmaxqhsohbtwsqolns
```

```bash
cd C:\Users\parve\invegent-dashboard
git add -A
git commit -m "feat: diagnostics page — run diagnosis button + result display"
git push origin main
```

---

## Task 4 — Write result file

Write `docs/briefs/brief_028_result.md` in Invegent-content-engine.

---

## Error handling

- If diagnosis JSON parse fails: return raw text as finding, set auto_fixable=false
- The context column UPDATE uses string interpolation — ensure JSON is escaped (use `jsonb_build_object` or double-escape quotes if needed)
- Diagnostician does NOT auto-fix anything — that's the Healer (Brief 029)
- If pipeline_incident table doesn't exist yet: check Brief 027 ran first
