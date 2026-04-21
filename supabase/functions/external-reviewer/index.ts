import { Hono } from "jsr:@hono/hono";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { UntarStream } from "jsr:@std/tar@0.1.4/untar-stream";

const app = new Hono();

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "content-type, apikey, authorization, x-hub-signature-256, x-ai-worker-key",
  "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
};

const VERSION = "external-reviewer-v1.1.0";
// v1.1.0 — corrected design after first-run OpenAI rate-limit discovery:
//   Strategist (Gemini 2.5 Pro) — full repo context, wide architectural lens.
//   Engineer Reviewer (GPT-4o) — focused commit context (~400k chars = ~100k
//   tokens): changed files' post-change state, directly-referenced briefs,
//   recent decisions, sync_state, last 10 commit messages, then top-up from
//   docs/15 + docs/03. This is the honest role split, not a workaround:
//   code review is about the commit and its immediate context, not the whole
//   codebase.

const QUALIFYING_PATH_PATTERNS = [
  /^supabase\/functions\/.+\.ts$/,
  /^supabase\/migrations\/.+\.sql$/,
  /^docs\/briefs\/.+\.md$/,
  /^docs\/06_decisions\.md$/,
  /^docs\/incidents\/.+\.md$/,
  /^docs\/15_pre_post_sales_criteria\.md$/,
  /^docs\/04_phases\.md$/,
  /^docs\/03_blueprint\.md$/,
  /^docs\/05_risks\.md$/,
  /^docs\/07_business_context\.md$/,
  /^app\/.+\.tsx?$/,
];

const RELEVANT_EXTS = new Set([".ts", ".tsx", ".sql", ".md", ".json"]);
const EXCLUDE_DIRS = ["node_modules/", ".next/", ".vercel/", "dist/", "build/", ".git/"];
const EXCLUDE_FILES = ["package-lock.json", "yarn.lock", "pnpm-lock.yaml", "bun.lockb"];

const FOCUSED_CONTEXT_MAX_CHARS = 400_000; // ~100k tokens at 4 chars/token

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

function pathQualifies(path: string): boolean {
  return QUALIFYING_PATH_PATTERNS.some((rx) => rx.test(path));
}

async function verifyGitHubSignature(payloadText: string, signatureHeader: string | null): Promise<boolean> {
  if (!signatureHeader) return false;
  const secret = Deno.env.get("GITHUB_WEBHOOK_SECRET");
  if (!secret) throw new Error("GITHUB_WEBHOOK_SECRET not set");
  const expected = signatureHeader.replace(/^sha256=/, "");
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, encoder.encode(payloadText));
  const hex = Array.from(new Uint8Array(sig)).map((b) => b.toString(16).padStart(2, "0")).join("");
  if (hex.length !== expected.length) return false;
  let mismatch = 0;
  for (let i = 0; i < hex.length; i++) mismatch |= hex.charCodeAt(i) ^ expected.charCodeAt(i);
  return mismatch === 0;
}

type CommitContext = {
  sha: string;
  repo: string;
  owner: string;
  repoFullName: string;
  message: string;
  author: string;
  timestamp: string;
  changedFiles: string[];
};

async function fetchCommitContext(sha: string, owner: string, repo: string, pat: string): Promise<CommitContext> {
  const url = `https://api.github.com/repos/${owner}/${repo}/commits/${sha}`;
  const resp = await fetch(url, {
    headers: {
      "Authorization": `Bearer ${pat}`,
      "Accept": "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
      "User-Agent": "ICE-external-reviewer/1.1",
    },
  });
  if (!resp.ok) throw new Error(`github_commit_fetch_${resp.status}: ${(await resp.text()).slice(0, 500)}`);
  const data = await resp.json();
  return {
    sha,
    repo,
    owner,
    repoFullName: `${owner}/${repo}`,
    message: data.commit?.message ?? "",
    author: data.commit?.author?.name ?? data.author?.login ?? "unknown",
    timestamp: data.commit?.author?.date ?? new Date().toISOString(),
    changedFiles: (data.files ?? []).map((f: any) => f.filename as string),
  };
}

async function fetchCommitDiff(sha: string, owner: string, repo: string, pat: string): Promise<string> {
  const url = `https://api.github.com/repos/${owner}/${repo}/commits/${sha}`;
  const resp = await fetch(url, {
    headers: {
      "Authorization": `Bearer ${pat}`,
      "Accept": "application/vnd.github.v3.diff",
      "User-Agent": "ICE-external-reviewer/1.1",
    },
  });
  if (!resp.ok) return `(diff unavailable: ${resp.status})`;
  const diff = await resp.text();
  return diff.length > 100_000 ? diff.slice(0, 100_000) + "\n... (truncated)" : diff;
}

async function fetchRecentCommitMessages(owner: string, repo: string, untilSha: string, pat: string, n = 10): Promise<Array<{ sha: string; message: string; author: string; date: string }>> {
  const url = `https://api.github.com/repos/${owner}/${repo}/commits?sha=${untilSha}&per_page=${n + 1}`;
  const resp = await fetch(url, {
    headers: {
      "Authorization": `Bearer ${pat}`,
      "Accept": "application/vnd.github+json",
      "User-Agent": "ICE-external-reviewer/1.1",
    },
  });
  if (!resp.ok) return [];
  const data = await resp.json();
  return (data as any[]).slice(0, n).map((c) => ({
    sha: c.sha,
    message: c.commit?.message ?? "",
    author: c.commit?.author?.name ?? "unknown",
    date: c.commit?.author?.date ?? "",
  }));
}

type RepoFiles = {
  files: Map<string, string>; // path -> content
  bytes: number;
  fileCount: number;
};

async function fetchRepoFiles(owner: string, repo: string, sha: string, pat: string): Promise<RepoFiles> {
  const tarballUrl = `https://api.github.com/repos/${owner}/${repo}/tarball/${sha}`;
  const resp = await fetch(tarballUrl, {
    headers: {
      "Authorization": `Bearer ${pat}`,
      "Accept": "application/vnd.github+json",
      "User-Agent": "ICE-external-reviewer/1.1",
    },
    redirect: "follow",
  });
  if (!resp.ok) throw new Error(`tarball_fetch_${resp.status}: ${(await resp.text()).slice(0, 300)}`);
  if (!resp.body) throw new Error("tarball_no_body");

  const decompressed = resp.body.pipeThrough(new DecompressionStream("gzip"));
  const entries = decompressed.pipeThrough(new UntarStream());

  const files = new Map<string, string>();
  let fileCount = 0;
  let bytes = 0;

  for await (const entry of entries) {
    const rawPath = entry.path;
    const firstSlash = rawPath.indexOf("/");
    const relPath = firstSlash >= 0 ? rawPath.slice(firstSlash + 1) : rawPath;

    if (!relPath || EXCLUDE_DIRS.some((d) => relPath.startsWith(d))) {
      await entry.readable?.cancel();
      continue;
    }
    const baseName = relPath.split("/").pop() ?? "";
    if (EXCLUDE_FILES.includes(baseName)) {
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

    files.set(relPath, text);
    fileCount++;
    bytes += text.length;
  }

  return { files, bytes, fileCount };
}

function buildFullBlob(repoFiles: RepoFiles, owner: string, repo: string, sha: string): string {
  const parts: string[] = [];
  parts.push(`REPOSITORY CONTEXT: ${owner}/${repo} @ ${sha}`);
  parts.push(`Files included: ${repoFiles.fileCount}`);
  parts.push(`Total chars: ${repoFiles.bytes}`);
  parts.push("Excluded: node_modules, .next, .vercel, dist, build, .git, lockfiles, non-source files.");
  parts.push("");
  for (const [path, text] of repoFiles.files) {
    parts.push(`========== FILE: ${path} ==========`);
    parts.push(text);
    parts.push("");
  }
  return parts.join("\n");
}

// Extract brief file paths referenced in commit message (e.g. "brief_043" or "docs/briefs/...")
function findReferencedBriefs(commitMessage: string, changedFiles: string[], allFiles: Map<string, string>): string[] {
  const refs = new Set<string>();
  const numberedMatches = commitMessage.matchAll(/brief[_-]?(\d{3})/gi);
  for (const m of numberedMatches) {
    const num = m[1];
    for (const path of allFiles.keys()) {
      if (path.includes(`brief_${num}`) && !path.includes("_result")) refs.add(path);
    }
  }
  const pathMatches = commitMessage.matchAll(/docs\/briefs\/([^\s)]+\.md)/g);
  for (const m of pathMatches) {
    const full = `docs/briefs/${m[1]}`;
    if (allFiles.has(full)) refs.add(full);
  }
  // Date-based briefs (YYYY-MM-DD-topic.md) if commit message mentions a date
  const dateMatches = commitMessage.matchAll(/(\d{4}-\d{2}-\d{2})/g);
  for (const m of dateMatches) {
    const date = m[1];
    for (const path of allFiles.keys()) {
      if (path.startsWith(`docs/briefs/${date}`)) refs.add(path);
    }
  }
  // Also add briefs that share a YYYY-MM-DD prefix with any changed file
  for (const cf of changedFiles) {
    const dm = cf.match(/(\d{4}-\d{2}-\d{2})/);
    if (dm) {
      for (const path of allFiles.keys()) {
        if (path.startsWith(`docs/briefs/${dm[1]}`)) refs.add(path);
      }
    }
  }
  return [...refs];
}

// Return lines from decisions.md from the last N days, based on date markers inside the file.
function extractRecentDecisions(decisionsText: string, sinceIso: string): string {
  const since = new Date(sinceIso).getTime();
  // Naive segmentation: split on top-level decision headers (e.g. "## D150 ..." or "# D150")
  const parts = decisionsText.split(/(?=^#{1,3}\s+D\d+)/m);
  const recent: string[] = [];
  for (const part of parts) {
    // Look for any ISO date in the part header/body
    const dateMatch = part.match(/(20\d{2}-\d{2}-\d{2})/);
    if (!dateMatch) continue;
    const partDate = new Date(dateMatch[1]).getTime();
    if (Number.isFinite(partDate) && partDate >= since) recent.push(part.trim());
  }
  if (recent.length === 0) {
    // fallback: last 200 lines
    const lines = decisionsText.split("\n");
    return lines.slice(Math.max(0, lines.length - 200)).join("\n");
  }
  return recent.join("\n\n");
}

function buildFocusedContext(opts: {
  repoFiles: RepoFiles;
  owner: string;
  repo: string;
  sha: string;
  commit: CommitContext;
  diff: string;
  recentCommits: Array<{ sha: string; message: string; author: string; date: string }>;
}): { blob: string; chars: number; sections: string[] } {
  const { repoFiles, owner, repo, sha, commit, diff, recentCommits } = opts;
  const files = repoFiles.files;
  const max = FOCUSED_CONTEXT_MAX_CHARS;
  const parts: string[] = [];
  const sections: string[] = [];
  let used = 0;

  const add = (sectionLabel: string, body: string): boolean => {
    if (used >= max) return false;
    const remaining = max - used;
    const trimmed = body.length > remaining ? body.slice(0, remaining) + "\n...(truncated)" : body;
    parts.push(`\n========== ${sectionLabel} ==========\n${trimmed}`);
    used += trimmed.length + sectionLabel.length + 26;
    sections.push(sectionLabel);
    return true;
  };

  // Header
  const header = `FOCUSED COMMIT CONTEXT: ${owner}/${repo} @ ${sha}\nTarget budget: ${max} chars (~100k tokens).\nSelection: commit diff + changed files + referenced briefs + recent decisions + sync_state + last 10 commits + top-up (docs/15, docs/03).`;
  parts.push(header);
  used += header.length;

  // 1. Commit diff
  add("COMMIT DIFF", diff);

  // 2. Post-change state of changed files
  for (const cf of commit.changedFiles) {
    if (used >= max) break;
    const content = files.get(cf);
    if (content) add(`CHANGED FILE: ${cf}`, content);
  }

  // 3. Referenced briefs
  const refBriefs = findReferencedBriefs(commit.message, commit.changedFiles, files);
  for (const bp of refBriefs) {
    if (used >= max) break;
    const content = files.get(bp);
    if (content) add(`REFERENCED BRIEF: ${bp}`, content);
  }

  // 4. Recent decisions (last 30 days)
  const decisionsText = files.get("docs/06_decisions.md");
  if (decisionsText && used < max) {
    const since = new Date(Date.now() - 30 * 86400_000).toISOString();
    const recent = extractRecentDecisions(decisionsText, since);
    add("RECENT DECISIONS (last 30d) — docs/06_decisions.md", recent);
  }

  // 5. sync_state full
  const syncState = files.get("docs/00_sync_state.md");
  if (syncState && used < max) add("CURRENT SYNC STATE — docs/00_sync_state.md", syncState);

  // 6. Last 10 commit messages
  if (recentCommits.length > 0 && used < max) {
    const lines = recentCommits.map((c) => `${c.date}  ${c.sha.slice(0, 7)}  ${c.author}: ${c.message.split("\n")[0]}`).join("\n");
    add("LAST 10 COMMITS (same repo, preceding this one)", lines);
  }

  // 7. Fill remaining tokens with docs/15 + docs/03
  const doc15 = files.get("docs/15_pre_post_sales_criteria.md");
  if (doc15 && used < max) add("PRE/POST SALES CRITERIA — docs/15_pre_post_sales_criteria.md", doc15);
  const doc03 = files.get("docs/03_blueprint.md");
  if (doc03 && used < max) add("BLUEPRINT — docs/03_blueprint.md", doc03);

  return { blob: parts.join("\n"), chars: used, sections };
}

async function loadRules(supabase: ReturnType<typeof getServiceClient>, reviewerKey: string) {
  const { data, error } = await supabase.schema("c")
    .from("external_reviewer_rule")
    .select("rule_key, rule_text, category, sort_order")
    .eq("reviewer_key", reviewerKey)
    .eq("is_active", true)
    .order("sort_order");
  if (error) throw new Error(`load_rules_failed: ${error.message}`);
  return (data ?? []).map((r: any) => `- [${r.rule_key}] (${r.category}) ${r.rule_text}`).join("\n");
}

function assemblePrompt(systemPromptTemplate: string, rulesBlock: string, commit: CommitContext, diff: string, repoBlob: string): string {
  const commitContext = [
    `SHA: ${commit.sha}`,
    `Repo: ${commit.repoFullName}`,
    `Author: ${commit.author}`,
    `Timestamp: ${commit.timestamp}`,
    `Message:\n${commit.message}`,
    `Changed files (${commit.changedFiles.length}):\n${commit.changedFiles.map((f) => "  - " + f).join("\n")}`,
    `Diff:\n${diff}`,
  ].join("\n\n");

  return systemPromptTemplate
    .replace("{rules block injected here}", rulesBlock)
    .replace("{commit context injected here}", commitContext)
    .replace("{repo blob injected here, cached across calls}", repoBlob);
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

type ReviewResult = {
  severity: string;
  summary: string;
  detail: string;
  referenced_rules: string[];
  referenced_artifacts: string[];
  tokens_input: number;
  tokens_output: number;
  cost_usd: number;
  cache_hit: boolean;
};

async function callGemini(model: string, prompt: string, apiKey: string): Promise<ReviewResult> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
  const resp = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: { responseMimeType: "application/json", temperature: 0.3 },
    }),
  });
  const raw = await resp.text();
  if (!resp.ok) throw new Error(`gemini_http_${resp.status}: ${raw.slice(0, 800)}`);
  const data = JSON.parse(raw);
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
  const usage = data?.usageMetadata ?? {};
  const ti = usage.promptTokenCount ?? 0;
  const to = usage.candidatesTokenCount ?? 0;
  const cached = usage.cachedContentTokenCount ?? 0;
  // Gemini 2.5 Pro pricing (per 1M tokens): input $1.25 (<=200k), $2.50 (>200k); output $10 (<=200k), $15 (>200k)
  const inputRate = ti > 200_000 ? 2.5 : 1.25;
  const outputRate = ti > 200_000 ? 15 : 10;
  const cost = (ti / 1_000_000) * inputRate + (to / 1_000_000) * outputRate;
  const parsed = extractJson(text);
  return {
    severity: parsed.overall_severity ?? "info",
    summary: (parsed.summary ?? "").slice(0, 200),
    detail: parsed.detail ?? "",
    referenced_rules: parsed.referenced_rules ?? [],
    referenced_artifacts: parsed.referenced_artifacts ?? [],
    tokens_input: ti,
    tokens_output: to,
    cost_usd: Number(cost.toFixed(6)),
    cache_hit: cached > 0,
  };
}

async function callOpenAI(model: string, prompt: string, apiKey: string): Promise<ReviewResult> {
  const url = "https://api.openai.com/v1/chat/completions";
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
      temperature: 0.3,
    }),
  });
  const raw = await resp.text();
  if (!resp.ok) throw new Error(`openai_http_${resp.status}: ${raw.slice(0, 800)}`);
  const data = JSON.parse(raw);
  const text = data?.choices?.[0]?.message?.content ?? "";
  const usage = data?.usage ?? {};
  const ti = usage.prompt_tokens ?? 0;
  const to = usage.completion_tokens ?? 0;
  const cached = usage.prompt_tokens_details?.cached_tokens ?? 0;
  // GPT-4o pricing (per 1M tokens): input $2.50, cached input $1.25, output $10.00
  const uncachedIn = ti - cached;
  const cost = (uncachedIn / 1_000_000) * 2.5 + (cached / 1_000_000) * 1.25 + (to / 1_000_000) * 10.0;
  const parsed = extractJson(text);
  return {
    severity: parsed.overall_severity ?? "info",
    summary: (parsed.summary ?? "").slice(0, 200),
    detail: parsed.detail ?? "",
    referenced_rules: parsed.referenced_rules ?? [],
    referenced_artifacts: parsed.referenced_artifacts ?? [],
    tokens_input: ti,
    tokens_output: to,
    cost_usd: Number(cost.toFixed(6)),
    cache_hit: cached > 0,
  };
}

async function runReview(
  supabase: ReturnType<typeof getServiceClient>,
  reviewer: any,
  commit: CommitContext,
  diff: string,
  contextBlob: string,
) {
  const rulesBlock = await loadRules(supabase, reviewer.reviewer_key);
  const prompt = assemblePrompt(reviewer.system_prompt, rulesBlock, commit, diff, contextBlob);
  const apiKey = Deno.env.get(reviewer.api_key_secret);
  if (!apiKey) throw new Error(`missing_secret_${reviewer.api_key_secret}`);

  const result = reviewer.provider === "gemini"
    ? await callGemini(reviewer.model, prompt, apiKey)
    : await callOpenAI(reviewer.model, prompt, apiKey);

  const { error: insertErr } = await supabase.schema("m").from("external_review_queue").insert({
    reviewer_key: reviewer.reviewer_key,
    commit_sha: commit.sha,
    commit_repo: commit.repo,
    commit_message: commit.message,
    commit_author: commit.author,
    commit_timestamp: commit.timestamp,
    severity: result.severity,
    finding_summary: result.summary,
    finding_detail: result.detail,
    referenced_rules: result.referenced_rules,
    referenced_artifacts: result.referenced_artifacts,
    tokens_input: result.tokens_input,
    tokens_output: result.tokens_output,
    cost_usd: result.cost_usd,
    cache_hit: result.cache_hit,
  });
  if (insertErr) throw new Error(`queue_insert_failed: ${insertErr.message}`);

  await supabase.schema("m").from("ai_usage_log").insert({
    provider: reviewer.provider,
    model: reviewer.model,
    input_tokens: result.tokens_input,
    output_tokens: result.tokens_output,
    total_tokens: result.tokens_input + result.tokens_output,
    cost_usd: result.cost_usd,
    content_type: "external_review",
  }).then(() => {}).catch((e: any) => console.error(`ai_usage_log_insert_failed: ${e?.message ?? e}`));

  return { reviewer_key: reviewer.reviewer_key, severity: result.severity, summary: result.summary, cost_usd: result.cost_usd, tokens_input: result.tokens_input, tokens_output: result.tokens_output };
}

async function recordReviewerError(supabase: ReturnType<typeof getServiceClient>, reviewerKey: string, commit: CommitContext, errorMessage: string) {
  await supabase.schema("m").from("external_review_queue").insert({
    reviewer_key: reviewerKey,
    commit_sha: commit.sha,
    commit_repo: commit.repo,
    commit_message: commit.message,
    commit_author: commit.author,
    commit_timestamp: commit.timestamp,
    severity: "critical",
    finding_summary: `reviewer_error: ${errorMessage}`.slice(0, 200),
    finding_detail: `The ${reviewerKey} reviewer failed to produce a finding for this commit. Error: ${errorMessage}`,
    referenced_rules: [],
    referenced_artifacts: [],
    cache_hit: false,
  });
}

async function processCommit(commit: CommitContext) {
  const supabase = getServiceClient();
  const pat = Deno.env.get("GITHUB_PAT_INVEGENT");
  if (!pat) throw new Error("GITHUB_PAT_INVEGENT not set");

  const qualifying = commit.changedFiles.filter(pathQualifies);
  if (qualifying.length === 0) {
    return { skipped: true, reason: "no_qualifying_paths", commit_sha: commit.sha };
  }

  const [diff, repoFiles, recentCommits] = await Promise.all([
    fetchCommitDiff(commit.sha, commit.owner, commit.repo, pat),
    fetchRepoFiles(commit.owner, commit.repo, commit.sha, pat),
    fetchRecentCommitMessages(commit.owner, commit.repo, commit.sha, pat, 10),
  ]);

  const fullBlob = buildFullBlob(repoFiles, commit.owner, commit.repo, commit.sha);
  const focused = buildFocusedContext({ repoFiles, owner: commit.owner, repo: commit.repo, sha: commit.sha, commit, diff, recentCommits });

  const { data: reviewers, error: revErr } = await supabase.schema("c")
    .from("external_reviewer")
    .select("*")
    .eq("is_active", true);
  if (revErr) throw new Error(`load_reviewers_failed: ${revErr.message}`);
  if (!reviewers || reviewers.length === 0) throw new Error("no_active_reviewers");

  const results: any[] = [];
  for (const reviewer of reviewers) {
    const contextBlob = reviewer.provider === "gemini" ? fullBlob : focused.blob;
    try {
      const r = await runReview(supabase, reviewer, commit, diff, contextBlob);
      results.push(r);
    } catch (e: any) {
      const msg = e?.message ?? String(e);
      console.error(`reviewer_${reviewer.reviewer_key}_failed: ${msg}`);
      await recordReviewerError(supabase, reviewer.reviewer_key, commit, msg);
      results.push({ reviewer_key: reviewer.reviewer_key, error: msg });
    }
  }

  return {
    ok: true,
    commit_sha: commit.sha,
    commit_repo: commit.repo,
    qualifying_paths: qualifying.length,
    repo_files: repoFiles.fileCount,
    repo_chars: repoFiles.bytes,
    focused_chars: focused.chars,
    focused_sections: focused.sections,
    reviews: results,
  };
}

app.options("*", () => new Response(null, { status: 204, headers: corsHeaders }));

app.get("*", (c) => {
  const path = c.req.path || "/";
  if (path.endsWith("/health")) return jsonResponse({ ok: true, function: "external-reviewer", version: VERSION });
  return jsonResponse({ ok: true, function: "external-reviewer", version: VERSION });
});

app.post("*", async (c) => {
  const url = new URL(c.req.url);
  const isRetroactive = url.searchParams.get("retroactive") === "true";

  const bodyText = await c.req.text();

  if (isRetroactive) {
    const expectedKey = Deno.env.get("AI_WORKER_API_KEY");
    const provided = c.req.header("x-ai-worker-key");
    if (!expectedKey) return jsonResponse({ ok: false, error: "AI_WORKER_API_KEY_not_set" }, 500);
    if (!provided || provided !== expectedKey) return jsonResponse({ ok: false, error: "unauthorized_retroactive" }, 401);

    let body: { commit_sha?: string; repo?: string };
    try { body = bodyText ? JSON.parse(bodyText) : {}; } catch { return jsonResponse({ ok: false, error: "bad_json" }, 400); }
    if (!body.commit_sha || !body.repo) return jsonResponse({ ok: false, error: "commit_sha_and_repo_required" }, 400);

    try {
      const pat = Deno.env.get("GITHUB_PAT_INVEGENT");
      if (!pat) return jsonResponse({ ok: false, error: "GITHUB_PAT_INVEGENT_not_set" }, 500);
      const commit = await fetchCommitContext(body.commit_sha, "Invegent", body.repo, pat);
      const result = await processCommit(commit);
      return jsonResponse(result);
    } catch (e: any) {
      return jsonResponse({ ok: false, error: e?.message ?? String(e) }, 500);
    }
  }

  // Webhook path — HMAC verification
  const signature = c.req.header("x-hub-signature-256");
  try {
    const ok = await verifyGitHubSignature(bodyText, signature);
    if (!ok) return jsonResponse({ ok: false, error: "invalid_signature" }, 401);
  } catch (e: any) {
    return jsonResponse({ ok: false, error: e?.message ?? String(e) }, 500);
  }

  let payload: any;
  try { payload = JSON.parse(bodyText); } catch { return jsonResponse({ ok: false, error: "bad_webhook_json" }, 400); }

  const ref = payload.ref as string | undefined;
  if (!ref || !ref.endsWith("/main")) return jsonResponse({ ok: true, skipped: true, reason: "not_main_push", ref });

  const headSha = payload.after as string | undefined;
  const repoFullName = payload.repository?.full_name as string | undefined;
  if (!headSha || !repoFullName) return jsonResponse({ ok: false, error: "missing_sha_or_repo" }, 400);
  const [owner, repo] = repoFullName.split("/");

  try {
    const pat = Deno.env.get("GITHUB_PAT_INVEGENT");
    if (!pat) return jsonResponse({ ok: false, error: "GITHUB_PAT_INVEGENT_not_set" }, 500);
    const commit = await fetchCommitContext(headSha, owner, repo, pat);
    const result = await processCommit(commit);
    return jsonResponse(result);
  } catch (e: any) {
    return jsonResponse({ ok: false, error: e?.message ?? String(e) }, 500);
  }
});

Deno.serve(app.fetch);
