# Claude Code Brief 017 — AI Profile Bootstrap Edge Function

**Date:** 12 April 2026  
**Status:** READY TO RUN  
**Decisions:** D087  
**Repo:** `Invegent-content-engine` (Edge Function + DB) + `invegent-dashboard` (UI wire-up)  
**Working directory:** `C:\Users\parve\Invegent-content-engine`  
**Supabase project:** `mbkmaxqhsohbtwsqolns`  
**MCPs required:** Supabase MCP, GitHub MCP  
**Estimated time:** 3–4 hours  

---

## Architecture (same as brand-scanner)

Runs BEFORE approval — no client_id exists yet.
Stores results as `ai_profile_scan_result` in submission JSONB (form_data column).
On approval, `approve_onboarding()` copies to `c.client_ai_profile` with status='draft'.
Content generation holds until PK sets status='active'.

---

## Existing client_ai_profile structure (verified from live DB)

```
Columns: client_ai_profile_id, client_id, provider, assistant_id, model,
         status, version, is_default, system_prompt, persona (jsonb),
         guidelines (jsonb), platform_rules (jsonb), tool_policy (jsonb),
         generation (jsonb), notes, created_by, created_at, updated_at
```

Existing profile pattern (from NDIS Yarns, Property Pulse):
- `model`: 'claude-sonnet-4-6'
- `status`: 'active' (for live clients) | 'draft' (for new bootstrapped profiles)
- `system_prompt`: "You are the content writer for the brand \"X\" (slug: x-slug)..."
- `persona.tone`: e.g. "warm, supportive, plain-English, empowering"
- `persona.style_notes`: array of style instructions
- `persona.presenter_name`: short brand handle

The bootstrapped profile must follow this exact structure.

---

## Task 1 — SECURITY DEFINER: update_submission_ai_scan

```sql
CREATE OR REPLACE FUNCTION public.update_submission_ai_scan(
  p_submission_id UUID,
  p_ai_scan_result JSONB
)
RETURNS BOOLEAN SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE c.onboarding_submission
  SET
    form_data = form_data || jsonb_build_object('ai_profile_scan_result', p_ai_scan_result),
    updated_at = NOW()
  WHERE submission_id = p_submission_id;
  RETURN FOUND;
END;
$$ LANGUAGE plpgsql;

GRANT EXECUTE ON FUNCTION public.update_submission_ai_scan(UUID, JSONB) TO service_role;
```

Verification:
```sql
SELECT routine_name FROM information_schema.routines
WHERE routine_schema = 'public' AND routine_name = 'update_submission_ai_scan';
```

---

## Task 2 — Update approve_onboarding to copy AI profile

Read the current approve_onboarding function body:
```sql
SELECT pg_get_functiondef(oid)
FROM pg_proc
WHERE proname = 'approve_onboarding' AND pronamespace = 'public'::regnamespace;
```

After the brand_scan_result copy block (added in Brief 016),
add this block to also copy the AI profile:

```sql
-- Copy AI profile scan result to c.client_ai_profile if it exists
INSERT INTO c.client_ai_profile (
  client_id,
  model,
  status,
  system_prompt,
  persona,
  notes,
  created_by,
  created_at,
  updated_at
)
SELECT
  v_client_id,
  'claude-sonnet-4-6',
  'draft',
  (sub.form_data->'ai_profile_scan_result'->>'system_prompt_draft'),
  jsonb_build_object(
    'tone', (sub.form_data->'ai_profile_scan_result'->>'brand_voice'),
    'style_notes', (sub.form_data->'ai_profile_scan_result'->'style_notes'),
    'presenter_name', (sub.form_data->'ai_profile_scan_result'->>'presenter_name')
  ),
  'AI-bootstrapped from onboarding scan. Review and activate before content generates.',
  'ai-profile-bootstrap',
  NOW(),
  NOW()
FROM c.onboarding_submission sub
WHERE sub.submission_id = p_submission_id
  AND sub.form_data->'ai_profile_scan_result' IS NOT NULL
ON CONFLICT (client_id) DO UPDATE SET
  system_prompt = EXCLUDED.system_prompt,
  persona = EXCLUDED.persona,
  status = 'draft',
  notes = EXCLUDED.notes,
  updated_at = NOW();
```

IMPORTANT:
- Read the function body first and use the correct variable name for client_id (may be `v_client_id` or similar)
- Check if c.client_ai_profile has UNIQUE constraint on client_id. If not:
  ```sql
  ALTER TABLE c.client_ai_profile ADD CONSTRAINT client_ai_profile_client_id_unique UNIQUE (client_id);
  ```
  If it already exists, skip.

---

## Task 3 — Create ai-profile-bootstrap Edge Function

**File:** `supabase/functions/ai-profile-bootstrap/index.ts`

```typescript
import { createClient } from "jsr:@supabase/supabase-js@2";

const VERSION = "ai-profile-bootstrap-v1.0.0";
const JINA_BASE = "https://r.jina.ai/";
const ANTHROPIC_URL = "https://api.anthropic.com/v1/messages";

function getServiceClient() {
  const url = Deno.env.get("SUPABASE_URL");
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !key) throw new Error("Missing Supabase credentials");
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

async function fetchViaJina(url: string): Promise<string | null> {
  try {
    const res = await fetch(`${JINA_BASE}${url}`, {
      headers: { Accept: "text/plain" },
      signal: AbortSignal.timeout(15000),
    });
    if (!res.ok) return null;
    const text = await res.text();
    return text.slice(0, 8000); // cap at 8000 chars to control context size
  } catch {
    return null;
  }
}

async function callClaude(prompt: string): Promise<string> {
  const apiKey = Deno.env.get("ANTHROPIC_API_KEY");
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY not set");

  const res = await fetch(ANTHROPIC_URL, {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-6",
      max_tokens: 2000,
      messages: [{ role: "user", content: prompt }],
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Claude API ${res.status}: ${text.slice(0, 200)}`);
  }

  const data = await res.json();
  return data.content?.[0]?.text ?? "";
}

function buildPrompt(submission: Record<string, any>, websiteContent: string | null, facebookContent: string | null): string {
  const formData = submission.form_data ?? {};
  const businessName = formData.business_name ?? "this business";
  const industryVertical = formData.industry_vertical ?? "";
  const industryDetail = formData.industry_detail ?? "";
  const brandVoice = formData.brand_voice ?? "";
  const serviceList = formData.service_list ?? "";
  const contentObjectives = Array.isArray(formData.content_objectives)
    ? formData.content_objectives.join(", ")
    : "";
  const serveNdis = formData.serves_ndis ?? "";
  const ndisReg = formData.ndis_registration ?? "";
  const state = formData.business_state ?? "Australia";

  return `You are helping set up a social media content profile for an Australian business.
Analyse the information below and generate a content profile in JSON format.

## Business Information
Business name: ${businessName}
Industry: ${industryVertical}
Location: ${state}
About: ${industryDetail}
Services offered:
${serviceList}

NDIS provider: ${serveNdis} (registration: ${ndisReg})
Content objectives: ${contentObjectives}
Preferred brand voice: ${brandVoice}

${websiteContent ? `## Website content\n${websiteContent}\n` : ""}
${facebookContent ? `## Facebook page content\n${facebookContent}\n` : ""}

## Instructions
Generate a JSON object with exactly these keys:

{
  "persona_description": "2-3 sentences describing who this business is and what they stand for. Written from the brand perspective.",
  "presenter_name": "A short brand handle (1-2 words, no spaces). E.g. 'Yarns' for NDIS Yarns, 'Pulse' for Property Pulse.",
  "brand_voice": "3-5 comma-separated tone attributes. E.g. 'warm, supportive, plain-English, empowering'",
  "style_notes": ["4-6 specific style instructions as array items. E.g. 'Use simple sentences', 'Include one actionable takeaway per post'"],
  "profession_slug": "One of: occupational_therapy | physiotherapy | speech_pathology | behaviour_support | support_coordination | support_worker | plan_management | mortgage_broking | real_estate_agent | buyers_agent | building | property_investment | general_health | other",
  "content_topics": ["5-8 specific topic areas this business should regularly post about"],
  "system_prompt_draft": "A complete system prompt for an AI content writer for this brand. Start with: 'You are the content writer for the brand \"[name]\" (slug: [slug]). You rewrite a news seed into value-added content with hooks, clarity, and brand voice. Return ONLY valid JSON with keys: title, body, meta.' Then add VOICE AND FORMAT instructions specific to this business."
}

Return ONLY the JSON object. No markdown, no explanation, no preamble.`;
}

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ ok: false, error: "POST only" }), { status: 405 });
  }

  let submission_id: string;
  try {
    const body = await req.json();
    submission_id = body.submission_id;
    if (!submission_id) throw new Error("submission_id required");
  } catch (e: any) {
    return new Response(JSON.stringify({ ok: false, error: e.message }), { status: 400 });
  }

  const supabase = getServiceClient();
  const log: string[] = [];

  try {
    // Load submission
    const { data: rows } = await supabase.rpc("exec_sql", {
      query: `
        SELECT submission_id, form_data
        FROM c.onboarding_submission
        WHERE submission_id = '${submission_id}'::uuid
        LIMIT 1
      `,
    });

    if (!rows?.[0]) {
      return new Response(JSON.stringify({ ok: false, error: "Submission not found" }), { status: 404 });
    }

    const submission = rows[0];
    const formData = submission.form_data ?? {};
    const websiteUrl: string | null = formData.website_url ?? null;
    const facebookUrl: string | null = formData.facebook_page_url ?? null;

    // Fetch website content via Jina
    let websiteContent: string | null = null;
    if (websiteUrl) {
      log.push(`Fetching website via Jina: ${websiteUrl}`);
      websiteContent = await fetchViaJina(websiteUrl);
      log.push(websiteContent ? `Website fetched: ${websiteContent.length} chars` : "Website fetch failed");
    }

    // Fetch Facebook page content via Jina (best effort)
    let facebookContent: string | null = null;
    if (facebookUrl) {
      log.push(`Fetching Facebook page via Jina: ${facebookUrl}`);
      facebookContent = await fetchViaJina(facebookUrl);
      log.push(facebookContent ? `Facebook fetched: ${facebookContent.length} chars` : "Facebook fetch failed or blocked");
    }

    // Build prompt and call Claude
    const prompt = buildPrompt(submission, websiteContent, facebookContent);
    log.push("Calling Claude API...");

    const rawResponse = await callClaude(prompt);
    log.push(`Claude response received: ${rawResponse.length} chars`);

    // Parse Claude's JSON response
    let profileData: Record<string, any>;
    try {
      // Strip markdown code blocks if present
      const cleaned = rawResponse.replace(/^```json\s*/i, "").replace(/```\s*$/i, "").trim();
      profileData = JSON.parse(cleaned);
    } catch (e: any) {
      log.push(`JSON parse failed: ${e.message}. Raw: ${rawResponse.slice(0, 200)}`);
      throw new Error(`Claude returned invalid JSON: ${e.message}`);
    }

    // Validate required keys
    const required = ["persona_description", "presenter_name", "brand_voice", "style_notes", "system_prompt_draft"];
    for (const key of required) {
      if (!profileData[key]) {
        log.push(`Warning: missing key '${key}' in Claude response`);
      }
    }

    const aiScanResult = {
      persona_description: profileData.persona_description ?? null,
      presenter_name: profileData.presenter_name ?? null,
      brand_voice: profileData.brand_voice ?? null,
      style_notes: profileData.style_notes ?? [],
      profession_slug: profileData.profession_slug ?? "other",
      content_topics: profileData.content_topics ?? [],
      system_prompt_draft: profileData.system_prompt_draft ?? null,
      model_used: "claude-sonnet-4-6",
      scanned_at: new Date().toISOString(),
      website_fetched: websiteContent !== null,
      facebook_fetched: facebookContent !== null,
      log,
    };

    // Write back to submission
    const { data: updateResult } = await supabase.rpc("update_submission_ai_scan", {
      p_submission_id: submission_id,
      p_ai_scan_result: aiScanResult,
    });

    log.push(`Submission updated: ${updateResult}`);

    return new Response(
      JSON.stringify({ ok: true, version: VERSION, ai_profile_scan_result: aiScanResult, log }),
      { headers: { "Content-Type": "application/json" } }
    );

  } catch (e: any) {
    console.error(`[ai-profile-bootstrap] error:`, e);
    return new Response(
      JSON.stringify({ ok: false, error: e.message, log }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
});
```

---

## Task 4 — Push and deploy

```bash
cd C:\Users\parve\Invegent-content-engine
git add supabase/functions/ai-profile-bootstrap/
git commit -m "feat: ai-profile-bootstrap Edge Function v1.0.0 (D087)"
git push origin main
npx supabase functions deploy ai-profile-bootstrap --project-ref mbkmaxqhsohbtwsqolns
```

If CLI times out, note it. Git push is sufficient.

---

## Task 5 — Wire up run-scans API to call ai-profile-bootstrap

**File:** `app/api/onboarding/run-scans/route.ts` in `invegent-dashboard`

After the brand-scanner call (already wired in Brief 016), add:

```typescript
// Invoke ai-profile-bootstrap (fire and forget)
try {
  const profileRes = await fetch(`${supabaseUrl}/functions/v1/ai-profile-bootstrap`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${serviceKey}`,
    },
    body: JSON.stringify({ submission_id }),
  });
  const profileData = await profileRes.json();
  console.log('[run-scans] ai-profile-bootstrap result:', profileData.ok, profileData.log?.slice(-3));
} catch (e) {
  console.error('[run-scans] ai-profile-bootstrap error:', e);
  // Non-fatal
}

return NextResponse.json({
  ok: true,
  message: 'Brand scan and AI profile bootstrap complete.',
  submission_id,
});
```

Rebuild and push invegent-dashboard:
```bash
cd C:\Users\parve\invegent-dashboard
git add app/api/onboarding/run-scans/route.ts
git commit -m "feat: wire run-scans to ai-profile-bootstrap Edge Function"
git push origin main
```

---

## Task 6 — Update dashboard checklist for AI profile

**File:** `app/(dashboard)/onboarding/page.tsx` in `invegent-dashboard`

In `ReadinessChecklist`, update item for AI profile to read from `ai_profile_scan_result`:

```tsx
const aiScan = detail.form_data?.ai_profile_scan_result ?? detail.ai_profile_scan_result ?? null;
const hasAiProfile = !!(aiScan?.system_prompt_draft);
```

Update the AI profile checklist item:
```tsx
{
  label: hasAiProfile
    ? `AI profile drafted ✓ · Profession: ${aiScan?.profession_slug ?? 'detected'}`
    : scanStatus === 'done' ? 'AI profile scan complete — review draft' : 'AI profile scan not run',
  pass: hasAiProfile,
  pending: scanStatus === 'running',
},
```

Also add a new AI Profile section to the detail panel (after the Brand Checklist section,
before Platforms & Reporting), shown only when scan result exists:

```tsx
{/* AI Profile draft */}
{detail.form_data?.ai_profile_scan_result?.system_prompt_draft && (
  <Section title="AI Profile Draft">
    <Row label="Profession" val={detail.form_data.ai_profile_scan_result.profession_slug} />
    <Row label="Brand voice" val={detail.form_data.ai_profile_scan_result.brand_voice} />
    <Row label="Persona" val={detail.form_data.ai_profile_scan_result.persona_description} />
    <div className="mt-2">
      <p className="text-xs text-slate-400 mb-1">System prompt draft:</p>
      <div className="text-xs text-slate-700 bg-slate-50 rounded p-2 whitespace-pre-wrap max-h-32 overflow-y-auto">
        {detail.form_data.ai_profile_scan_result.system_prompt_draft}
      </div>
    </div>
    <p className="text-xs text-amber-600 mt-2">
      ⚠️ Status: draft — PK must activate in dashboard after approving the client.
    </p>
  </Section>
)}
```

Push dashboard changes:
```bash
cd C:\Users\parve\invegent-dashboard
git add -A
git commit -m "feat: AI profile draft section + checklist item in onboarding panel"
git push origin main
```

---

## Task 7 — Write result file

Write `docs/briefs/brief_017_result.md` in Invegent-content-engine:
- Tasks 1–6: COMPLETED / FAILED
- DB functions created: update_submission_ai_scan, approve_onboarding updated
- Unique constraint on client_ai_profile: added or already existed
- Edge Function: deployed (ACTIVE) or needs manual deploy
- Dashboard wired + deployed
- Any notes

---

## Error handling

- If Claude API key is not set as a Supabase secret, the function will fail.
  Check: the key name in Supabase secrets should be `ANTHROPIC_API_KEY`.
  If it is named differently (e.g. `ICE_ANTHROPIC_API_KEY`), use that name.

- If Facebook fetch via Jina is blocked (returns empty or error), set
  `facebookContent = null` and continue — website alone is sufficient.

- If Claude returns text that is not valid JSON (sometimes happens with edge cases),
  log the raw response and return an error — do not insert corrupt data.

- If c.client_ai_profile already has a row for a client_id (e.g. from manual setup),
  the ON CONFLICT DO UPDATE will update it to status='draft' — this is correct.
  PK will need to re-review and reactivate.

- Do NOT create a pg_cron job for this function. It is triggered manually via Run Scans.

---

## What this brief does NOT include

- Portal CSS custom properties from client_brand_profile (Brief 018 — final UI polish)
- AI profile edit UI in dashboard (future)
- Auto-activation of AI profile on approval (PK must manually activate)
- pg_cron automation for brand/AI scans
