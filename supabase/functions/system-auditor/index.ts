import { Hono } from "jsr:@hono/hono";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { UntarStream } from "jsr:@std/tar@0.1.4/untar-stream";

const app = new Hono();

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "content-type, apikey, authorization, x-ai-worker-key",
  "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
};

const VERSION = "system-auditor-v1.0.1";
// v1.0.1 — fix: .catch() on supabase.rpc() builder throws
//   "supabase.rpc(...).catch is not a function" because PostgrestBuilder
//   doesn't expose Promise.catch() directly. Wrap in try/catch instead.
// v1.0.0 — One-shot system audit invocation.
//   Assembles docs (from GitHub main) + live DB state (clients, crons, pipeline
//   health, reviewer queue, etc.) + recent commits, sends to a single reviewer
//   (default: system_auditor on xAI Grok 4.1 Fast), writes result to
//   m.external_review_queue with a synthetic commit_sha = 'system-audit-{ISO}'.
//   Auth via x-ai-worker-key.

const RELEVANT_EXTS = new Set([".md"]);
const EXCLUDE_DIRS = ["node_modules/", ".next/", ".vercel/", "dist/", "build/", ".git/"];

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function getServiceClient() {
  const url = Deno.env.get("SUPABASE_URL");
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !key) throw new Error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

// Only fetch docs/ from the repo — no source code, keeps context focused on claims
async function fetchDocsBlob(owner: string, repo: string, sha: string, pat: string): Promise<{ blob: string; fileCount: number; bytes: number }> {
  const tarballUrl = `https://api.github.com/repos/${owner}/${repo}/tarball/${sha}`;
  const ctl = new AbortController();
  const timeoutId = setTimeout(() => ctl.abort(), 120_000);
  try {
    const resp = await fetch(tarballUrl, {
      headers: {
        "Authorization": `Bearer ${pat}`,
        "Accept": "application/vnd.github+json",
        "User-Agent": "ICE-system-auditor/1.0",
      },
      redirect: "follow",
      signal: ctl.signal,
    });
    if (!resp.ok) throw new Error(`tarball_fetch_${resp.status}: ${(await resp.text()).slice(0, 300)}`);
    if (!resp.body) throw new Error("tarball_no_body");

    const decompressed = resp.body.pipeThrough(new DecompressionStream("gzip"));
    const entries = decompressed.pipeThrough(new UntarStream());

    const parts: string[] = [];
    let fileCount = 0;
    let bytes = 0;

    for await (const entry of entries) {
      const rawPath = entry.path;
      const firstSlash = rawPath.indexOf("/");
      const relPath = firstSlash >= 0 ? rawPath.slice(firstSlash + 1) : rawPath;

      if (!relPath || !relPath.startsWith("docs/")) {
        await entry.readable?.cancel();
        continue;
      }
      if (EXCLUDE_DIRS.some((d) => relPath.includes(d))) {
        await entry.readable?.cancel();
        continue;
      }
      const dot = relPath.lastIndexOf(".");
      const ext = dot >= 0 ? relPath.slice(dot) : "";
      if (!RELEVANT_EXTS.has(ext)) {
        await entry.readable?.cancel();
        continue;
      }
      if (!entry.readable) continue;

      const chunks: Uint8Array[] = [];
      const reader = entry.readable.getReader();
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        if (value) chunks.push(value);
      }
      const total = chunks.reduce((n, c) => n + c.length, 0);
      const buf = new Uint8Array(total);
      let off = 0;
      for (const c of chunks) { buf.set(c, off); off += c.length; }
      const text = new TextDecoder("utf-8", { fatal: false }).decode(buf);

      parts.push(`========== FILE: ${relPath} ==========`);
      parts.push(text);
      parts.push("");
      fileCount++;
      bytes += text.length;
    }

    return { blob: parts.join("\n"), fileCount, bytes };
  } finally {
    clearTimeout(timeoutId);
  }
}

async function assembleDbSnapshot(supabase: ReturnType<typeof getServiceClient>): Promise<string> {
  const parts: string[] = [];
  parts.push(`========== LIVE DB SNAPSHOT (as of ${new Date().toISOString()}) ==========\n`);

  // 1. Clients
  try {
    const { data: clients } = await supabase.schema("c").from("client")
      .select("client_id, client_name, client_slug, status, timezone, profession_slug, serves_ndis_participants, ndis_registration_status, notifications_email, portal_enabled, created_at");
    parts.push("### c.client\n```json\n" + JSON.stringify(clients, null, 2) + "\n```\n");
  } catch (e: any) {
    parts.push(`### c.client — query failed: ${e?.message ?? String(e)}\n`);
  }

  // 2. Cron jobs (active only) — exec_sql may fail under service role; wrap in try/catch
  try {
    const { data: crons } = await supabase.rpc("exec_sql", { sql: "SELECT jobname, schedule, active FROM cron.job WHERE active = true ORDER BY jobname" });
    if (crons) {
      parts.push("### cron.job (active only)\n```json\n" + JSON.stringify(crons, null, 2) + "\n```\n");
    } else {
      parts.push("### cron.job — exec_sql returned no data\n");
    }
  } catch (e: any) {
    parts.push(`### cron.job — exec_sql failed (expected under service role): ${e?.message ?? String(e)}\n`);
  }

  // 3. ai_job pipeline health summary
  try {
    const { data: aiJobStats } = await supabase.schema("m").from("ai_job")
      .select("status", { count: "exact", head: false });
    const aiJobAgg: Record<string, number> = {};
    (aiJobStats ?? []).forEach((r: any) => {
      aiJobAgg[r.status] = (aiJobAgg[r.status] ?? 0) + 1;
    });
    parts.push("### m.ai_job (status counts, all-time)\n```json\n" + JSON.stringify(aiJobAgg, null, 2) + "\n```\n");
  } catch (e: any) {
    parts.push(`### m.ai_job status counts — query failed: ${e?.message ?? String(e)}\n`);
  }

  // 4. Recent ai_job activity
  try {
    const { data: recentAiJobs } = await supabase.schema("m").from("ai_job")
      .select("ai_job_id, status, attempts, created_at, updated_at")
      .order("created_at", { ascending: false })
      .limit(20);
    parts.push("### m.ai_job (last 20, most recent first)\n```json\n" + JSON.stringify(recentAiJobs, null, 2) + "\n```\n");
  } catch (e: any) {
    parts.push(`### m.ai_job recent — query failed: ${e?.message ?? String(e)}\n`);
  }

  // 5. Publish queue
  try {
    const { data: publishQueue } = await supabase.schema("m").from("post_publish_queue")
      .select("client_id, platform, status", { count: "exact" })
      .in("status", ["pending", "scheduled", "running", "failed"])
      .limit(100);
    parts.push("### m.post_publish_queue (active states, up to 100 rows)\n```json\n" + JSON.stringify(publishQueue, null, 2) + "\n```\n");
  } catch (e: any) {
    parts.push(`### m.post_publish_queue — query failed: ${e?.message ?? String(e)}\n`);
  }

  // 6. Published posts last 7d by client
  try {
    const sevenDaysAgo = new Date(Date.now() - 7 * 86400_000).toISOString();
    const { data: recentPublishes } = await supabase.schema("m").from("post_publish")
      .select("client_id, platform, published_at")
      .gt("published_at", sevenDaysAgo);
    const publishAgg: Record<string, Record<string, number>> = {};
    (recentPublishes ?? []).forEach((r: any) => {
      const k = r.client_id ?? "null";
      if (!publishAgg[k]) publishAgg[k] = {};
      publishAgg[k][r.platform] = (publishAgg[k][r.platform] ?? 0) + 1;
    });
    parts.push("### m.post_publish (last 7 days, grouped by client_id x platform)\n```json\n" + JSON.stringify(publishAgg, null, 2) + "\n```\n");
  } catch (e: any) {
    parts.push(`### m.post_publish 7d — query failed: ${e?.message ?? String(e)}\n`);
  }

  // 7. Channel / token state
  try {
    const { data: channels } = await supabase.schema("c").from("client_channel")
      .select("client_id, platform, active, token_expires_at, connected_page_id, updated_at")
      .order("client_id");
    parts.push("### c.client_channel\n```json\n" + JSON.stringify(channels, null, 2) + "\n```\n");
  } catch (e: any) {
    parts.push(`### c.client_channel — query failed: ${e?.message ?? String(e)}\n`);
  }

  // 8. Existing reviewer queue (what's been reviewed to date)
  try {
    const { data: reviews } = await supabase.schema("m").from("external_review_queue")
      .select("reviewer_key, commit_sha, commit_repo, severity, finding_summary, cost_usd, created_at")
      .order("created_at", { ascending: false });
    parts.push("### m.external_review_queue (all rows to date)\n```json\n" + JSON.stringify(reviews, null, 2) + "\n```\n");
  } catch (e: any) {
    parts.push(`### m.external_review_queue — query failed: ${e?.message ?? String(e)}\n`);
  }

  // 9. Recent digests
  try {
    const { data: digests } = await supabase.schema("m").from("external_review_digest")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(5);
    parts.push("### m.external_review_digest (last 5)\n```json\n" + JSON.stringify(digests, null, 2) + "\n```\n");
  } catch (e: any) {
    parts.push(`### m.external_review_digest — query failed: ${e?.message ?? String(e)}\n`);
  }

  // 10. Reviewer rules (what the other reviewers are checking against — Grok as System Auditor should know what peers cover)
  try {
    const { data: rules } = await supabase.schema("c").from("external_reviewer_rule")
      .select("reviewer_key, rule_key, category, rule_text, is_active")
      .eq("is_active", true)
      .order("reviewer_key");
    parts.push("### c.external_reviewer_rule (active rules, grouped by reviewer)\n```json\n" + JSON.stringify(rules, null, 2) + "\n```\n");
  } catch (e: any) {
    parts.push(`### c.external_reviewer_rule — query failed: ${e?.message ?? String(e)}\n`);
  }

  // 11. Recent AI usage log — pipeline cost visibility
  try {
    const { data: usage } = await supabase.schema("m").from("ai_usage_log")
      .select("provider, model, content_type, input_tokens, output_tokens, cost_usd, created_at")
      .order("created_at", { ascending: false })
      .limit(50);
    parts.push("### m.ai_usage_log (last 50 calls)\n```json\n" + JSON.stringify(usage, null, 2) + "\n```\n");
  } catch (e: any) {
    parts.push(`### m.ai_usage_log — query failed: ${e?.message ?? String(e)}\n`);
  }

  return parts.join("\n");
}

async function fetchHeadSha(owner: string, repo: string, pat: string): Promise<string> {
  const url = `https://api.github.com/repos/${owner}/${repo}/commits/main`;
  const resp = await fetch(url, {
    headers: {
      "Authorization": `Bearer ${pat}`,
      "Accept": "application/vnd.github+json",
      "User-Agent": "ICE-system-auditor/1.0",
    },
  });
  if (!resp.ok) throw new Error(`head_fetch_${resp.status}: ${(await resp.text()).slice(0, 500)}`);
  const data = await resp.json();
  return data.sha;
}

function extractJson(text: string): any {
  const trimmed = text.trim();
  if (trimmed.startsWith("{") && trimmed.endsWith("}")) return JSON.parse(trimmed);
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]+?)\s*```/);
  if (fenced) return JSON.parse(fenced[1]);
  const firstBrace = trimmed.indexOf("{");
  const lastBrace = trimmed.lastIndexOf("}");
  if (firstBrace >= 0 && lastBrace > firstBrace) return JSON.parse(trimmed.slice(firstBrace, lastBrace + 1));
  throw new Error(`no_json_in_response: ${trimmed.slice(0, 300)}`);
}

async function callXai(model: string, prompt: string, apiKey: string): Promise<{ severity: string; summary: string; detail: string; referenced_artifacts: string[]; tokens_input: number; tokens_output: number; cost_usd: number; cache_hit: boolean }> {
  const url = "https://api.x.ai/v1/chat/completions";
  const resp = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" },
      temperature: 0.2,
      max_tokens: 8000,
    }),
  });
  const raw = await resp.text();
  if (!resp.ok) throw new Error(`xai_http_${resp.status}: ${raw.slice(0, 800)}`);
  const data = JSON.parse(raw);
  const text = data?.choices?.[0]?.message?.content ?? "";
  const usage = data?.usage ?? {};
  const ti = usage.prompt_tokens ?? 0;
  const to = usage.completion_tokens ?? 0;
  const cached = usage.prompt_tokens_details?.cached_tokens ?? 0;
  const uncachedIn = ti - cached;
  const cost = (uncachedIn / 1_000_000) * 0.20 + (cached / 1_000_000) * 0.05 + (to / 1_000_000) * 0.50;
  const parsed = extractJson(text);
  return {
    severity: parsed.overall_severity ?? "info",
    summary: (parsed.summary ?? "").slice(0, 200),
    detail: parsed.detail ?? "",
    referenced_artifacts: parsed.referenced_artifacts ?? [],
    tokens_input: ti,
    tokens_output: to,
    cost_usd: Number(cost.toFixed(6)),
    cache_hit: cached > 0,
  };
}

app.options("*", () => new Response(null, { status: 204, headers: corsHeaders }));

app.get("*", (c) => {
  return jsonResponse({ ok: true, function: "system-auditor", version: VERSION });
});

app.post("*", async (c) => {
  const providedKey = c.req.header("x-ai-worker-key");
  const expectedKey = Deno.env.get("AI_WORKER_API_KEY");
  if (!expectedKey) return jsonResponse({ ok: false, error: "AI_WORKER_API_KEY_not_set" }, 500);
  if (!providedKey || providedKey !== expectedKey) return jsonResponse({ ok: false, error: "unauthorized" }, 401);

  const pat = Deno.env.get("GITHUB_PAT_INVEGENT");
  if (!pat) return jsonResponse({ ok: false, error: "GITHUB_PAT_INVEGENT_not_set" }, 500);

  const supabase = getServiceClient();

  try {
    // 1. Fetch reviewer config (system_auditor row)
    const { data: reviewer, error: revErr } = await supabase.schema("c")
      .from("external_reviewer")
      .select("*")
      .eq("reviewer_key", "system_auditor")
      .single();
    if (revErr || !reviewer) throw new Error(`system_auditor_row_missing: ${revErr?.message ?? "no row"}`);

    const apiKey = Deno.env.get(reviewer.api_key_secret);
    if (!apiKey) throw new Error(`missing_secret_${reviewer.api_key_secret}`);

    // 2. Gather docs from GitHub HEAD of main
    const headSha = await fetchHeadSha("Invegent", "Invegent-content-engine", pat);
    const docs = await fetchDocsBlob("Invegent", "Invegent-content-engine", headSha, pat);

    // 3. Live DB snapshot
    const dbSnapshot = await assembleDbSnapshot(supabase);

    // 4. Assemble state package
    const statePackage = [
      `AUDIT TIMESTAMP: ${new Date().toISOString()}`,
      `REPO HEAD: Invegent/Invegent-content-engine @ ${headSha}`,
      `DOCS INCLUDED: ${docs.fileCount} files, ${docs.bytes} chars`,
      "",
      "========== DOCS BLOB ==========",
      docs.blob,
      "",
      "========== DB SNAPSHOT ==========",
      dbSnapshot,
    ].join("\n");

    const prompt = reviewer.system_prompt.replace("{state_package injected here}", statePackage);

    // 5. Call Grok
    const result = await callXai(reviewer.model, prompt, apiKey);

    // 6. Write to queue
    const syntheticSha = `system-audit-${new Date().toISOString()}`;
    const { error: insertErr } = await supabase.schema("m").from("external_review_queue").insert({
      reviewer_key: "system_auditor",
      commit_sha: syntheticSha,
      commit_repo: "system-audit",
      commit_message: "Live system audit — docs + DB snapshot",
      commit_author: "system-auditor",
      commit_timestamp: new Date().toISOString(),
      severity: result.severity,
      finding_summary: result.summary,
      finding_detail: result.detail,
      referenced_rules: [],
      referenced_artifacts: result.referenced_artifacts,
      tokens_input: result.tokens_input,
      tokens_output: result.tokens_output,
      cost_usd: result.cost_usd,
      cache_hit: result.cache_hit,
    });
    if (insertErr) throw new Error(`queue_insert_failed: ${insertErr.message}`);

    // 7. Also log to ai_usage_log
    try {
      await supabase.schema("m").from("ai_usage_log").insert({
        provider: reviewer.provider,
        model: reviewer.model,
        input_tokens: result.tokens_input,
        output_tokens: result.tokens_output,
        total_tokens: result.tokens_input + result.tokens_output,
        cost_usd: result.cost_usd,
        content_type: "system_audit",
      });
    } catch (e: any) {
      console.error(`ai_usage_log_insert_failed: ${e?.message ?? e}`);
    }

    return jsonResponse({
      ok: true,
      synthetic_sha: syntheticSha,
      head_sha: headSha,
      docs_files: docs.fileCount,
      docs_bytes: docs.bytes,
      db_snapshot_bytes: dbSnapshot.length,
      state_package_bytes: statePackage.length,
      severity: result.severity,
      summary: result.summary,
      cost_usd: result.cost_usd,
      tokens_input: result.tokens_input,
      tokens_output: result.tokens_output,
    });
  } catch (e: any) {
    return jsonResponse({ ok: false, error: e?.message ?? String(e) }, 500);
  }
});

Deno.serve(app.fetch);
