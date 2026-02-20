import { Hono } from "jsr:@hono/hono";
import { createClient } from "jsr:@supabase/supabase-js@2";

const app = new Hono();

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  // ✅ include x-ai-worker-key so scheduled calls + any browser preflight are happy
  "Access-Control-Allow-Headers": "content-type, apikey, authorization, x-worker-id, x-ai-worker-key",
  "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
};

const VERSION = "ai-worker-v1.0.1";

// -------------------------
// Helpers
// -------------------------
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
  if (!url || !key) throw new Error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in secrets");

  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

function nowIso() {
  return new Date().toISOString();
}

type WorkerRequest = {
  limit?: number;
  worker_id?: string;
  lock_seconds?: number;
};

type AiJobRow = {
  ai_job_id: string;
  client_id: string;
  digest_run_id: string;
  post_seed_id: string;
  post_draft_id: string;
  platform: string;
  job_type: string;
  status: string;
  priority: number;
  input_payload: any;
  output_payload: any;
  error: string | null;
  locked_at: string | null;
  locked_by: string | null;
  created_at: string;
  updated_at: string;
};

type ClientAiProfile = {
  client_ai_profile_id: string;
  client_id: string;
  provider: string;
  assistant_id: string | null;
  model: string | null;
  status: string;
  version: number;
  is_default: boolean;
  system_prompt: string | null;
  persona: any;
  guidelines: any;
  platform_rules: any;
  tool_policy: any;
  generation: any;
  notes: string | null;
};

// -------------------------
// OpenAI call (Chat Completions with JSON output)
// -------------------------
async function openaiRewriteFromSeed(opts: {
  apiKey: string;
  model: string;
  systemPrompt: string;
  userPayload: any;
  temperature: number;
  maxOutputTokens: number;
}) {
  const { apiKey, model, systemPrompt, userPayload, temperature, maxOutputTokens } = opts;

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
        {
          role: "user",
          content:
            `Rewrite the seed into value-added content for the target platform.\n` +
            `Return ONLY strict JSON with keys: {"title": string, "body": string, "meta": object}.\n` +
            `Seed payload JSON:\n${JSON.stringify(userPayload)}`,
        },
      ],
    }),
  });

  const text = await resp.text();
  if (!resp.ok) {
    throw new Error(`openai_http_${resp.status}: ${text.slice(0, 1200)}`);
  }

  const parsedOuter = safeParseJson<any>(text);
  if (!parsedOuter.ok) throw new Error(`openai_bad_json_outer: ${parsedOuter.error}`);

  const content = parsedOuter.value?.choices?.[0]?.message?.content;
  if (!content || typeof content !== "string") throw new Error("openai_empty_content");

  const parsed = safeParseJson<{ title: string; body: string; meta?: any }>(content);
  if (!parsed.ok) throw new Error(`openai_non_json_content: ${parsed.error}`);

  if (!parsed.value?.title || !parsed.value?.body) throw new Error("openai_missing_title_or_body");

  return {
    title: String(parsed.value.title).trim(),
    body: String(parsed.value.body).trim(),
    meta: parsed.value.meta ?? {},
    raw: {
      model,
      usage: parsedOuter.value?.usage ?? null,
    },
  };
}

// -------------------------
// Routes
// -------------------------

// Preflight
app.options("*", () => new Response(null, { status: 204, headers: corsHeaders }));

// ✅ Security gate middleware (applies to ALL POST requests)
app.use("*", async (c, next) => {
  if (c.req.method !== "POST") return next();

  const expected = Deno.env.get("AI_WORKER_API_KEY");
  const provided = c.req.header("x-ai-worker-key");

  if (!expected) return jsonResponse({ ok: false, error: "AI_WORKER_API_KEY_not_set" }, 500);
  if (!provided || provided !== expected) return jsonResponse({ ok: false, error: "Unauthorized" }, 401);

  return next();
});

// Health + landing (GET)
app.get("*", (c) => {
  const path = c.req.path || "/";
  if (path.endsWith("/health")) {
    return jsonResponse({ ok: true, message: "env_ok", version: VERSION, path_seen: path }, 200);
  }

  return jsonResponse(
    {
      ok: true,
      function: "ai-worker",
      version: VERSION,
      routes: ["GET */health", "POST * (runs worker)"],
      path_seen: path,
      note: "POST to this function URL (any path) to process queued ai_job rows.",
    },
    200
  );
});

// MAIN: accept ANY POST path (no 404 due to routing)
app.post("*", async (c) => {
  const path = c.req.path || "/";
  const supabase = getServiceClient();

  const openaiKey = Deno.env.get("OPENAI_API_KEY");
  if (!openaiKey) return jsonResponse({ ok: false, error: "missing_openai_api_key", path_seen: path }, 500);

  // ✅ Support both query params (cron style) and JSON body
  const url = new URL(c.req.url);
  const qLimit = url.searchParams.get("limit");
  const qWorkerId = url.searchParams.get("worker_id");
  const qLockSeconds = url.searchParams.get("lock_seconds");

  const bodyText = await c.req.text();
  const bodyJson = bodyText?.trim()
    ? safeParseJson<WorkerRequest>(bodyText)
    : ({ ok: true, value: {} as WorkerRequest } as const);

  if (!bodyJson.ok) {
    return jsonResponse({ ok: false, error: "bad_json", detail: bodyJson.error, path_seen: path }, 400);
  }

  const limitRaw = bodyJson.value.limit ?? (qLimit ? Number(qLimit) : undefined) ?? 1;
  const workerIdRaw =
    bodyJson.value.worker_id ??
    qWorkerId ??
    c.req.header("x-worker-id") ??
    `worker-${crypto.randomUUID().slice(0, 8)}`;
  const lockSecondsRaw = bodyJson.value.lock_seconds ?? (qLockSeconds ? Number(qLockSeconds) : undefined) ?? 600;

  const limit = Number(limitRaw);
  const workerId = String(workerIdRaw);
  const lockSeconds = Number(lockSecondsRaw);

  if (!Number.isFinite(limit) || limit < 1 || limit > 20) {
    return jsonResponse({ ok: false, error: "limit_out_of_range", detail: "limit must be 1..20", path_seen: path }, 400);
  }

  // 1) Lock jobs using your SKIP LOCKED SQL function
  let jobs: AiJobRow[] = [];
  {
    const { data, error } = await supabase.schema("f").rpc("ai_worker_lock_jobs_v1", {
      p_limit: limit,
      p_worker_id: workerId,
      p_lock_seconds: lockSeconds,
    });

    if (error) {
      return jsonResponse(
        {
          ok: false,
          error: "lock_jobs_failed",
          detail: error,
          hint: "Check f.ai_worker_lock_jobs_v1 exists & schema f is accessible",
          path_seen: path,
        },
        500
      );
    }

    jobs = (data ?? []) as AiJobRow[];
  }

  if (!jobs.length) {
    return jsonResponse({ ok: true, message: "no_jobs", worker_id: workerId, locked: 0, path_seen: path }, 200);
  }

  // 2) Process jobs
  const results: any[] = [];

  for (const job of jobs) {
    const jobId = job.ai_job_id;

    try {
      // Load client AI profile (default active)
      const { data: profile, error: profErr } = await supabase
        .schema("c")
        .from("client_ai_profile")
        .select("*")
        .eq("client_id", job.client_id)
        .eq("status", "active")
        .order("is_default", { ascending: false })
        .order("version", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (profErr) throw new Error(`load_profile_failed: ${profErr.message ?? JSON.stringify(profErr)}`);
      if (!profile) throw new Error("no_active_client_ai_profile");

      const cap = profile as unknown as ClientAiProfile;

      const model = (cap.model ?? "gpt-4o-mini").toString();
      const gen = cap.generation ?? {};
      const temperature = Number(gen.temperature ?? 0.7);
      const maxOutputTokens = Number(gen.max_output_tokens ?? 900);

      const platformRules = cap.platform_rules ?? {};
      const guidelines = cap.guidelines ?? {};
      const persona = cap.persona ?? {};

      const systemPrompt =
        (cap.system_prompt ?? "").toString().trim() +
        "\n\nYou MUST obey these persona notes (JSON): " +
        JSON.stringify(persona) +
        "\n\nYou MUST obey these guidelines (JSON): " +
        JSON.stringify(guidelines) +
        "\n\nPlatform rules (JSON): " +
        JSON.stringify(platformRules) +
        "\n\nReturn ONLY valid JSON: {\"title\": string, \"body\": string, \"meta\": object}.";

      const userPayload = job.input_payload ?? {};

      // Call OpenAI
      const out = await openaiRewriteFromSeed({
        apiKey: openaiKey,
        model,
        systemPrompt,
        userPayload,
        temperature: Number.isFinite(temperature) ? temperature : 0.7,
        maxOutputTokens: Number.isFinite(maxOutputTokens) ? maxOutputTokens : 900,
      });

      // Update post_draft
      const draftMeta = {
        ...(typeof out.meta === "object" && out.meta ? out.meta : {}),
        ai: {
          provider: "openai",
          model: out.raw?.model ?? model,
          worker_id: workerId,
          ai_job_id: jobId,
          at: nowIso(),
          usage: out.raw?.usage ?? null,
        },
      };

      const { error: updDraftErr } = await supabase
        .schema("m")
        .from("post_draft")
        .update({
          draft_title: out.title,
          draft_body: out.body,
          draft_format: draftMeta,
          approval_status: "needs_review",
          updated_at: nowIso(),
        })
        .eq("post_draft_id", job.post_draft_id);

      if (updDraftErr) throw new Error(`update_post_draft_failed: ${updDraftErr.message ?? JSON.stringify(updDraftErr)}`);

      // Mark job succeeded
      const { error: updJobErr } = await supabase
        .schema("m")
        .from("ai_job")
        .update({
          status: "succeeded",
          output_payload: { title: out.title, body: out.body, meta: draftMeta },
          error: null,
          locked_by: null,
          locked_at: null,
          updated_at: nowIso(),
        })
        .eq("ai_job_id", jobId);

      if (updJobErr) throw new Error(`update_ai_job_failed: ${updJobErr.message ?? JSON.stringify(updJobErr)}`);

      results.push({ ai_job_id: jobId, post_draft_id: job.post_draft_id, status: "succeeded" });
    } catch (e: any) {
      const msg = e?.message ?? String(e);

      // Mark job failed (and unlock)
      await supabase
        .schema("m")
        .from("ai_job")
        .update({
          status: "failed",
          error: msg.slice(0, 4000),
          locked_by: null,
          locked_at: null,
          updated_at: nowIso(),
        })
        .eq("ai_job_id", jobId);

      results.push({ ai_job_id: jobId, post_draft_id: job.post_draft_id, status: "failed", error: msg });
    }
  }

  return jsonResponse(
    {
      ok: true,
      version: VERSION,
      worker_id: workerId,
      locked: jobs.length,
      processed: results.length,
      results,
      path_seen: path,
    },
    200
  );
});

// Catch-all
app.all("*", (c) =>
  jsonResponse(
    {
      ok: false,
      error: "route_not_found",
      method: c.req.method,
      path_seen: c.req.path,
      hint: "Use GET */health or POST *",
      version: VERSION,
    },
    404
  )
);

Deno.serve(app.fetch);
