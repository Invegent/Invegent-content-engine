import { Hono } from "jsr:@hono/hono";
import { createClient } from "jsr:@supabase/supabase-js@2";

const app = new Hono();

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "content-type, apikey, authorization, x-worker-id, x-ai-worker-key",
  "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
};

const VERSION = "ai-worker-v2.2.0";

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function safeParseJson<T>(raw: string): { ok: true; value: T } | { ok: false; error: string } {
  try {
    return { ok: true, value: JSON.parse(raw) as T };
  } catch (e: any) {
    return { ok: false, error: e?.message ?? "invalid_json" };
  }
}

function getServiceClient() {
  const url = Deno.env.get("SUPABASE_URL");
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !key) throw new Error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

function nowIso() { return new Date().toISOString(); }

// ─────────────────────────────────────────────────────────────────────────────
// Cost calculation
// Looks up current active rate for provider+model. Returns 0 if not found.
// ─────────────────────────────────────────────────────────────────────────────

async function calculateCostUsd(
  supabase: ReturnType<typeof getServiceClient>,
  provider: string,
  model: string,
  inputTokens: number,
  outputTokens: number,
): Promise<number> {
  try {
    const { data } = await supabase
      .schema("m")
      .from("ai_model_rate")
      .select("rate_input_per_1m, rate_output_per_1m")
      .eq("provider", provider)
      .eq("model", model)
      .is("effective_until", null)
      .limit(1)
      .maybeSingle();

    if (!data) return 0;

    const inputCost = (inputTokens / 1_000_000) * Number(data.rate_input_per_1m);
    const outputCost = (outputTokens / 1_000_000) * Number(data.rate_output_per_1m);
    return Math.round((inputCost + outputCost) * 1_000_000) / 1_000_000; // 6 decimal places
  } catch {
    return 0; // Never block generation due to cost calc failure
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Usage ledger — one row per AI call
// ─────────────────────────────────────────────────────────────────────────────

async function writeUsageLog(
  supabase: ReturnType<typeof getServiceClient>,
  opts: {
    clientId: string;
    aiJobId?: string | null;
    postDraftId?: string | null;
    provider: string;
    model: string;
    contentType: string;
    platform: string;
    inputTokens: number;
    outputTokens: number;
    costUsd: number;
    fallbackUsed: boolean;
    errorCall: boolean;
  }
): Promise<void> {
  try {
    await supabase.schema("m").from("ai_usage_log").insert({
      client_id: opts.clientId,
      ai_job_id: opts.aiJobId ?? null,
      post_draft_id: opts.postDraftId ?? null,
      provider: opts.provider,
      model: opts.model,
      content_type: opts.contentType,
      platform: opts.platform,
      input_tokens: opts.inputTokens,
      output_tokens: opts.outputTokens,
      cost_usd: opts.costUsd,
      fallback_used: opts.fallbackUsed,
      error_call: opts.errorCall,
    });
  } catch (e) {
    // Never block main flow due to ledger write failure — just log
    console.error("[ai_usage_log] write failed:", e);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Anthropic Claude call
// Returns title, body, meta + raw usage tokens
// ─────────────────────────────────────────────────────────────────────────────

async function callClaude(opts: {
  apiKey: string;
  model: string;
  systemPrompt: string;
  userPrompt: string;
  temperature: number;
  maxOutputTokens: number;
}) {
  const { apiKey, model, systemPrompt, userPrompt, temperature, maxOutputTokens } = opts;

  const resp = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model,
      max_tokens: maxOutputTokens,
      temperature,
      system: systemPrompt,
      messages: [{ role: "user", content: userPrompt }],
    }),
  });

  const text = await resp.text();
  if (!resp.ok) throw new Error(`anthropic_http_${resp.status}: ${text.slice(0, 1200)}`);

  const outer = safeParseJson<any>(text);
  if (!outer.ok) throw new Error(`anthropic_bad_json: ${outer.error}`);

  const content = outer.value?.content?.[0]?.text;
  if (!content) throw new Error("anthropic_empty_content");

  // Strip markdown code fences if present
  const cleaned = content.replace(/^```(?:json)?\s*/i, "").replace(/\s*```\s*$/, "").trim();
  const parsed = safeParseJson<{ title: string; body: string; meta?: any }>(cleaned);
  if (!parsed.ok) throw new Error(`anthropic_non_json: ${parsed.error} | raw: ${cleaned.slice(0, 400)}`);
  if (!parsed.value?.title || !parsed.value?.body) throw new Error("anthropic_missing_title_or_body");

  const usage = outer.value?.usage ?? {};
  return {
    title: String(parsed.value.title).trim(),
    body: String(parsed.value.body).trim(),
    meta: parsed.value.meta ?? {},
    inputTokens: Number(usage.input_tokens ?? 0),
    outputTokens: Number(usage.output_tokens ?? 0),
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// OpenAI fallback call
// ─────────────────────────────────────────────────────────────────────────────

async function callOpenAI(opts: {
  apiKey: string;
  model: string;
  systemPrompt: string;
  userPrompt: string;
  temperature: number;
  maxOutputTokens: number;
}) {
  const { apiKey, model, systemPrompt, userPrompt, temperature, maxOutputTokens } = opts;

  const resp = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      temperature,
      max_tokens: maxOutputTokens,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
    }),
  });

  const text = await resp.text();
  if (!resp.ok) throw new Error(`openai_http_${resp.status}: ${text.slice(0, 1200)}`);

  const outer = safeParseJson<any>(text);
  if (!outer.ok) throw new Error(`openai_bad_json_outer: ${outer.error}`);

  const content = outer.value?.choices?.[0]?.message?.content;
  if (!content) throw new Error("openai_empty_content");

  const parsed = safeParseJson<{ title: string; body: string; meta?: any }>(content);
  if (!parsed.ok) throw new Error(`openai_non_json: ${parsed.error}`);
  if (!parsed.value?.title || !parsed.value?.body) throw new Error("openai_missing_title_or_body");

  const usage = outer.value?.usage ?? {};
  return {
    title: String(parsed.value.title).trim(),
    body: String(parsed.value.body).trim(),
    meta: parsed.value.meta ?? {},
    inputTokens: Number(usage.prompt_tokens ?? 0),
    outputTokens: Number(usage.completion_tokens ?? 0),
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Prompt assembly from content intelligence profiles (D014)
// Falls back to legacy c.client_ai_profile if new tables not populated
// ─────────────────────────────────────────────────────────────────────────────

async function assemblePrompts(
  supabase: ReturnType<typeof getServiceClient>,
  clientId: string,
  platform: string,
  jobType: string,
  seedPayload: any,
): Promise<{
  systemPrompt: string;
  userPrompt: string;
  model: string;
  temperature: number;
  maxOutputTokens: number;
  usedLegacy: boolean;
}> {
  // Load brand profile
  const { data: brand } = await supabase
    .schema("c")
    .from("client_brand_profile")
    .select("*")
    .eq("client_id", clientId)
    .eq("is_active", true)
    .limit(1)
    .maybeSingle();

  // Load platform profile
  const { data: platProfile } = await supabase
    .schema("c")
    .from("client_platform_profile")
    .select("platform_voice_prompt, platform_voice_notes, max_chars, min_chars, emoji_level, use_hashtags, hashtag_count, use_markdown, structure_notes")
    .eq("client_id", clientId)
    .eq("platform", platform)
    .eq("is_active", true)
    .limit(1)
    .maybeSingle();

  // Load content type prompt
  const { data: ctPrompt } = await supabase
    .schema("c")
    .from("content_type_prompt")
    .select("task_prompt, output_schema_hint")
    .eq("client_id", clientId)
    .eq("platform", platform)
    .eq("job_type", jobType)
    .eq("is_active", true)
    .limit(1)
    .maybeSingle();

  if (brand) {
    // ── New content intelligence profile path ──────────────────────────────
    const model = (brand.model ?? "claude-sonnet-4-6").toString();
    const temperature = Number(brand.temperature ?? 0.72);
    const maxOutputTokens = Number(brand.max_output_tokens ?? 1200);

    const systemPrompt = [
      brand.brand_identity_prompt ?? "",
      platProfile?.platform_voice_prompt ?? "",
    ].filter(Boolean).join("\n\n");

    const outputSchema = ctPrompt?.output_schema_hint ??
      `Return ONLY valid JSON: {"title": string, "body": string, "meta": object}`;

    const taskInstruction = ctPrompt?.task_prompt ??
      "Rewrite the seed content into a valuable, engaging post for the target platform.";

    const userPrompt = [
      taskInstruction,
      `\nSeed content (JSON):\n${JSON.stringify(seedPayload)}`,
      `\n${outputSchema}`,
    ].join("\n");

    return { systemPrompt, userPrompt, model, temperature, maxOutputTokens, usedLegacy: false };
  }

  // ── Legacy fallback: c.client_ai_profile ──────────────────────────────────
  const { data: legacyProfile } = await supabase
    .schema("c")
    .from("client_ai_profile")
    .select("system_prompt, model, generation, persona, guidelines, platform_rules")
    .eq("client_id", clientId)
    .eq("status", "active")
    .order("is_default", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!legacyProfile) throw new Error("no_client_profile_found");

  const model = (legacyProfile.model ?? "claude-sonnet-4-6").toString();
  const gen = legacyProfile.generation ?? {};
  const temperature = Number(gen.temperature ?? 0.72);
  const maxOutputTokens = Number(gen.max_output_tokens ?? 1200);

  const systemPrompt = [
    legacyProfile.system_prompt ?? "",
    "Persona: " + JSON.stringify(legacyProfile.persona ?? {}),
    "Guidelines: " + JSON.stringify(legacyProfile.guidelines ?? {}),
    "Platform rules: " + JSON.stringify(legacyProfile.platform_rules ?? {}),
    `Return ONLY valid JSON: {"title": string, "body": string, "meta": object}`,
  ].join("\n\n");

  const userPrompt = `Rewrite this seed into a platform-appropriate post.\n\nSeed:\n${JSON.stringify(seedPayload)}\n\nReturn ONLY JSON: {"title": string, "body": string, "meta": object}`;

  return { systemPrompt, userPrompt, model, temperature, maxOutputTokens, usedLegacy: true };
}

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

type WorkerRequest = {
  limit?: number;
  worker_id?: string;
  lock_seconds?: number;
};

type AiJobRow = {
  ai_job_id: string;
  client_id: string;
  post_draft_id: string;
  platform: string;
  job_type: string;
  input_payload: any;
};

// ─────────────────────────────────────────────────────────────────────────────
// Routes
// ─────────────────────────────────────────────────────────────────────────────

app.options("*", () => new Response(null, { status: 204, headers: corsHeaders }));

// Security gate
app.use("*", async (c, next) => {
  if (c.req.method !== "POST") return next();
  const expected = Deno.env.get("AI_WORKER_API_KEY");
  const provided = c.req.header("x-ai-worker-key");
  if (!expected) return jsonResponse({ ok: false, error: "AI_WORKER_API_KEY_not_set" }, 500);
  if (!provided || provided !== expected) return jsonResponse({ ok: false, error: "Unauthorized" }, 401);
  return next();
});

app.get("*", (c) => {
  const path = c.req.path || "/";
  if (path.endsWith("/health")) {
    return jsonResponse({ ok: true, function: "ai-worker", version: VERSION }, 200);
  }
  return jsonResponse({ ok: true, function: "ai-worker", version: VERSION }, 200);
});

app.post("*", async (c) => {
  const path = c.req.path || "/";
  const supabase = getServiceClient();

  const anthropicKey = Deno.env.get("ANTHROPIC_API_KEY");
  const openaiKey = Deno.env.get("OPENAI_API_KEY");

  if (!anthropicKey && !openaiKey) {
    return jsonResponse({ ok: false, error: "no_ai_api_key_configured" }, 500);
  }

  // Parse request
  const url = new URL(c.req.url);
  const bodyText = await c.req.text();
  const bodyJson = bodyText?.trim()
    ? safeParseJson<WorkerRequest>(bodyText)
    : ({ ok: true, value: {} as WorkerRequest } as const);

  if (!bodyJson.ok) return jsonResponse({ ok: false, error: "bad_json", path_seen: path }, 400);

  const limit = Math.min(Math.max(Number(bodyJson.value.limit ?? url.searchParams.get("limit") ?? 1), 1), 20);
  const workerId = bodyJson.value.worker_id ?? url.searchParams.get("worker_id") ?? `worker-${crypto.randomUUID().slice(0, 8)}`;
  const lockSeconds = Math.min(Math.max(Number(bodyJson.value.lock_seconds ?? 600), 30), 3600);

  // Lock jobs
  const { data: lockedData, error: lockErr } = await supabase
    .schema("f")
    .rpc("ai_worker_lock_jobs_v1", {
      p_limit: limit,
      p_worker_id: workerId,
      p_lock_seconds: lockSeconds,
    });

  if (lockErr) {
    return jsonResponse({ ok: false, error: "lock_jobs_failed", detail: lockErr, path_seen: path }, 500);
  }

  const jobs = (lockedData ?? []) as AiJobRow[];
  if (!jobs.length) {
    return jsonResponse({ ok: true, message: "no_jobs", worker_id: workerId, locked: 0 }, 200);
  }

  const results: any[] = [];

  for (const job of jobs) {
    const jobId = job.ai_job_id;
    const platform = job.platform ?? "facebook";
    const jobType = job.job_type ?? "rewrite_v1";

    try {
      // Assemble prompts from content intelligence profiles
      const { systemPrompt, userPrompt, model, temperature, maxOutputTokens, usedLegacy } =
        await assemblePrompts(supabase, job.client_id, platform, jobType, job.input_payload ?? {});

      // Determine provider from model name
      const isPrimary = model.startsWith("claude");
      const primaryProvider = isPrimary ? "anthropic" : "openai";

      let result: Awaited<ReturnType<typeof callClaude>> | null = null;
      let fallbackUsed = false;
      let primaryError: string | null = null;

      // ── Try primary model ──────────────────────────────────────────────────
      if (isPrimary && anthropicKey) {
        try {
          result = await callClaude({ apiKey: anthropicKey, model, systemPrompt, userPrompt, temperature, maxOutputTokens });
        } catch (e: any) {
          primaryError = e?.message ?? String(e);
          console.error(`[ai-worker] Claude failed for job ${jobId}:`, primaryError);

          // Log the failed primary call to ledger
          await writeUsageLog(supabase, {
            clientId: job.client_id, aiJobId: jobId, postDraftId: job.post_draft_id,
            provider: "anthropic", model, contentType: jobType, platform,
            inputTokens: 0, outputTokens: 0, costUsd: 0,
            fallbackUsed: false, errorCall: true,
          });
        }
      } else if (!isPrimary && openaiKey) {
        // Configured for OpenAI directly
        try {
          result = await callOpenAI({ apiKey: openaiKey, model, systemPrompt, userPrompt, temperature, maxOutputTokens });
        } catch (e: any) {
          primaryError = e?.message ?? String(e);
          await writeUsageLog(supabase, {
            clientId: job.client_id, aiJobId: jobId, postDraftId: job.post_draft_id,
            provider: "openai", model, contentType: jobType, platform,
            inputTokens: 0, outputTokens: 0, costUsd: 0,
            fallbackUsed: false, errorCall: true,
          });
        }
      }

      // ── Fallback to OpenAI if Claude failed ────────────────────────────────
      if (!result && primaryError && openaiKey) {
        fallbackUsed = true;
        const fallbackModel = "gpt-4o";
        result = await callOpenAI({
          apiKey: openaiKey, model: fallbackModel,
          systemPrompt, userPrompt, temperature, maxOutputTokens,
        });
        result = { ...result }; // clone to avoid mutation issues

        // Log fallback call
        const fallbackCost = await calculateCostUsd(supabase, "openai", fallbackModel, result.inputTokens, result.outputTokens);
        await writeUsageLog(supabase, {
          clientId: job.client_id, aiJobId: jobId, postDraftId: job.post_draft_id,
          provider: "openai", model: fallbackModel, contentType: jobType, platform,
          inputTokens: result.inputTokens, outputTokens: result.outputTokens, costUsd: fallbackCost,
          fallbackUsed: true, errorCall: false,
        });
      } else if (result) {
        // Log successful primary call
        const cost = await calculateCostUsd(supabase, primaryProvider, model, result.inputTokens, result.outputTokens);
        await writeUsageLog(supabase, {
          clientId: job.client_id, aiJobId: jobId, postDraftId: job.post_draft_id,
          provider: primaryProvider, model, contentType: jobType, platform,
          inputTokens: result.inputTokens, outputTokens: result.outputTokens, costUsd: cost,
          fallbackUsed: false, errorCall: false,
        });
      }

      if (!result) throw new Error(primaryError ?? "all_providers_failed");

      // Update post_draft
      const draftMeta = {
        ...(typeof result.meta === "object" && result.meta ? result.meta : {}),
        ai: {
          provider: fallbackUsed ? "openai" : primaryProvider,
          model: fallbackUsed ? "gpt-4o" : model,
          fallback_used: fallbackUsed,
          legacy_profile: usedLegacy,
          worker_id: workerId,
          ai_job_id: jobId,
          at: nowIso(),
          input_tokens: result.inputTokens,
          output_tokens: result.outputTokens,
        },
      };

      await supabase.schema("m").from("post_draft").update({
        draft_title: result.title,
        draft_body: result.body,
        draft_format: draftMeta,
        approval_status: "needs_review",
        updated_at: nowIso(),
      }).eq("post_draft_id", job.post_draft_id);

      await supabase.schema("m").from("ai_job").update({
        status: "succeeded",
        output_payload: { title: result.title, body: result.body, meta: draftMeta },
        error: null,
        locked_by: null,
        locked_at: null,
        updated_at: nowIso(),
      }).eq("ai_job_id", jobId);

      results.push({
        ai_job_id: jobId,
        post_draft_id: job.post_draft_id,
        status: "succeeded",
        provider: fallbackUsed ? "openai_fallback" : primaryProvider,
        model: fallbackUsed ? "gpt-4o" : model,
        input_tokens: result.inputTokens,
        output_tokens: result.outputTokens,
      });

    } catch (e: any) {
      const msg = (e?.message ?? String(e)).slice(0, 4000);

      await supabase.schema("m").from("ai_job").update({
        status: "failed",
        error: msg,
        locked_by: null,
        locked_at: null,
        updated_at: nowIso(),
      }).eq("ai_job_id", jobId);

      results.push({ ai_job_id: jobId, post_draft_id: job.post_draft_id, status: "failed", error: msg });
    }
  }

  return jsonResponse({
    ok: true,
    version: VERSION,
    worker_id: workerId,
    locked: jobs.length,
    processed: results.length,
    results,
  });
});

app.all("*", (c) => jsonResponse({ ok: false, error: "route_not_found", version: VERSION }, 404));

Deno.serve(app.fetch);
