import { Hono } from "jsr:@hono/hono";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { encodeBase64 } from "jsr:@std/encoding/base64";

const app = new Hono();

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "content-type, apikey, authorization",
  "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
};

const VERSION = "external-reviewer-digest-v1.1.0";
// v1.1.0 — digest now surfaces reviewer coverage for the window: which reviewers
// were active vs paused. Lets PK read a digest knowing exactly which lenses
// covered the commits (e.g. "Strategist active, Engineer paused pending OpenAI
// tier bump").
const DIGEST_REPO_OWNER = "Invegent";
const DIGEST_REPO_NAME = "Invegent-content-engine";

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

function ymd(ts: string | Date): string {
  const d = typeof ts === "string" ? new Date(ts) : ts;
  return d.toISOString().slice(0, 10);
}

function commitUrl(repo: string, sha: string): string {
  return `https://github.com/Invegent/${repo}/commit/${sha}`;
}

type Finding = {
  review_id: string;
  reviewer_key: string;
  commit_sha: string;
  commit_repo: string;
  commit_message: string | null;
  commit_author: string | null;
  commit_timestamp: string | null;
  severity: "info" | "warn" | "critical";
  finding_summary: string;
  finding_detail: string;
  referenced_rules: string[];
  referenced_artifacts: string[];
  cost_usd: number | null;
  created_at: string;
};

function renderFinding(f: Finding): string {
  const parts: string[] = [];
  parts.push(`### [${f.reviewer_key}] ${f.commit_sha.slice(0, 7)} — ${f.finding_summary}`);
  parts.push("");
  parts.push(f.finding_detail);
  parts.push("");
  if (f.referenced_artifacts.length > 0) parts.push(`**Referenced:** ${f.referenced_artifacts.join(", ")}`);
  if (f.referenced_rules.length > 0) parts.push(`**Rule(s):** ${f.referenced_rules.join(", ")}`);
  parts.push(`**Commit:** [${f.commit_sha.slice(0, 7)}](${commitUrl(f.commit_repo, f.commit_sha)}) — ${(f.commit_message ?? "").split("\n")[0]}`);
  return parts.join("\n");
}

function assembleMarkdown(opts: {
  digestDate: string;
  triggerType: string;
  windowStart: string;
  windowEnd: string;
  commitsReviewed: number;
  totals: { critical: number; warn: number; info: number; total: number; cost: number };
  findings: Finding[];
  activeReviewers: Array<{ reviewer_key: string; display_name: string; model: string }>;
  pausedReviewers: Array<{ reviewer_key: string; display_name: string; model: string }>;
}): string {
  const { digestDate, triggerType, windowStart, windowEnd, commitsReviewed, totals, findings, activeReviewers, pausedReviewers } = opts;

  const critical = findings.filter((f) => f.severity === "critical");
  const warns = findings.filter((f) => f.severity === "warn");
  const infos = findings.filter((f) => f.severity === "info");

  const uniqueCommits = new Map<string, Finding>();
  for (const f of findings) if (!uniqueCommits.has(f.commit_sha)) uniqueCommits.set(f.commit_sha, f);

  const parts: string[] = [];
  parts.push(`# ICE External Review Digest — ${digestDate}`);
  parts.push("");
  parts.push(`**Trigger:** ${triggerType}`);
  parts.push(`**Window:** ${windowStart} to ${windowEnd}`);
  parts.push(`**Commits reviewed:** ${commitsReviewed}`);
  parts.push(`**Findings:** ${totals.total} total (${totals.critical} critical, ${totals.warn} warn, ${totals.info} info)`);
  parts.push(`**Cost:** $${totals.cost.toFixed(4)}`);
  parts.push("");
  parts.push("## Reviewer coverage for this window");
  parts.push("");
  for (const r of activeReviewers) parts.push(`- **${r.display_name}** (${r.model}) — active`);
  for (const r of pausedReviewers) parts.push(`- **${r.display_name}** (${r.model}) — **paused** (reviewer inactive; digest findings below are from active reviewers only)`);
  parts.push("");
  parts.push("---");
  parts.push("");

  parts.push("## Critical findings");
  parts.push("");
  if (critical.length === 0) parts.push("_None._");
  else critical.forEach((f) => { parts.push(renderFinding(f)); parts.push(""); });
  parts.push("");
  parts.push("---");
  parts.push("");

  parts.push("## Warnings");
  parts.push("");
  if (warns.length === 0) parts.push("_None._");
  else warns.forEach((f) => { parts.push(renderFinding(f)); parts.push(""); });
  parts.push("");
  parts.push("---");
  parts.push("");

  parts.push("## Informational");
  parts.push("");
  if (infos.length === 0) parts.push("_None._");
  else infos.forEach((f) => parts.push(`- [${f.reviewer_key}] ${f.commit_sha.slice(0, 7)}: ${f.finding_summary}`));
  parts.push("");
  parts.push("---");
  parts.push("");

  parts.push("## This window's commits under review");
  parts.push("");
  parts.push("| SHA | Repo | Author | Message |");
  parts.push("|---|---|---|---|");
  for (const f of uniqueCommits.values()) {
    const msg = (f.commit_message ?? "").split("\n")[0].replace(/\|/g, "\\|").slice(0, 80);
    parts.push(`| [${f.commit_sha.slice(0, 7)}](${commitUrl(f.commit_repo, f.commit_sha)}) | ${f.commit_repo} | ${f.commit_author ?? "?"} | ${msg} |`);
  }
  parts.push("");
  parts.push("---");
  parts.push("");

  parts.push("## Notes for next session");
  parts.push("");
  const actionable = [...critical, ...warns];
  if (actionable.length === 0) parts.push("_No critical or warn findings in this window. Reviewers aligned with the direction of recent work._");
  else actionable.forEach((f) => parts.push(`- **[${f.severity.toUpperCase()}]** ${f.commit_sha.slice(0, 7)} (${f.reviewer_key}): ${f.finding_summary}`));
  parts.push("");
  return parts.join("\n");
}

function markdownToHtml(md: string): string {
  const escape = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const lines = md.split("\n");
  const out: string[] = [];
  let inTable = false;
  let inList = false;

  const flushList = () => { if (inList) { out.push("</ul>"); inList = false; } };
  const flushTable = () => { if (inTable) { out.push("</table>"); inTable = false; } };

  for (const line of lines) {
    if (line.startsWith("# ")) { flushList(); flushTable(); out.push(`<h1>${escape(line.slice(2))}</h1>`); continue; }
    if (line.startsWith("## ")) { flushList(); flushTable(); out.push(`<h2>${escape(line.slice(3))}</h2>`); continue; }
    if (line.startsWith("### ")) { flushList(); flushTable(); out.push(`<h3>${escape(line.slice(4))}</h3>`); continue; }
    if (line.trim() === "---") { flushList(); flushTable(); out.push("<hr>"); continue; }
    if (line.startsWith("- ")) {
      flushTable();
      if (!inList) { out.push("<ul>"); inList = true; }
      out.push(`<li>${escape(line.slice(2)).replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>').replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")}</li>`);
      continue;
    }
    if (line.startsWith("|")) {
      flushList();
      if (!inTable) { out.push("<table style=\"border-collapse:collapse;\">"); inTable = true; }
      if (line.includes("---")) continue;
      const cells = line.split("|").slice(1, -1).map((c) => escape(c.trim()));
      out.push("<tr>" + cells.map((c) => `<td style=\"border:1px solid #ccc;padding:4px 8px;\">${c.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>')}</td>`).join("") + "</tr>");
      continue;
    }
    flushList(); flushTable();
    if (line.trim() === "") { out.push("<br>"); continue; }
    out.push(`<p>${escape(line).replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>').replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>").replace(/_([^_]+)_/g, "<em>$1</em>")}</p>`);
  }
  flushList(); flushTable();
  return `<div style=\"font-family:system-ui,-apple-system,sans-serif;font-size:14px;line-height:1.5;color:#1e293b;\">${out.join("\n")}</div>`;
}

async function commitToGitHub(pat: string, filePath: string, content: string, commitMessage: string): Promise<{ sha: string; html_url: string }> {
  const url = `https://api.github.com/repos/${DIGEST_REPO_OWNER}/${DIGEST_REPO_NAME}/contents/${filePath}`;

  let existingSha: string | undefined;
  const probe = await fetch(url, {
    headers: {
      "Authorization": `Bearer ${pat}`,
      "Accept": "application/vnd.github+json",
      "User-Agent": "ICE-external-reviewer-digest/1.0",
    },
  });
  if (probe.ok) {
    const j = await probe.json();
    existingSha = j.sha;
  }

  const payload: Record<string, unknown> = {
    message: commitMessage,
    content: encodeBase64(new TextEncoder().encode(content)),
    branch: "main",
  };
  if (existingSha) payload.sha = existingSha;

  const resp = await fetch(url, {
    method: "PUT",
    headers: {
      "Authorization": `Bearer ${pat}`,
      "Accept": "application/vnd.github+json",
      "Content-Type": "application/json",
      "User-Agent": "ICE-external-reviewer-digest/1.0",
    },
    body: JSON.stringify(payload),
  });
  if (!resp.ok) throw new Error(`github_put_${resp.status}: ${(await resp.text()).slice(0, 500)}`);
  const body = await resp.json();
  return { sha: body.commit?.sha ?? body.content?.sha ?? "", html_url: body.content?.html_url ?? "" };
}

async function sendEmail(opts: { subject: string; html: string; text: string }): Promise<string> {
  const apiKey = Deno.env.get("RESEND_API_KEY");
  if (!apiKey) throw new Error("RESEND_API_KEY not set");
  const from = Deno.env.get("NOTIFY_FROM") ?? Deno.env.get("RESEND_FROM_EMAIL") ?? "feeds@invegent.com";
  const resp = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { "Authorization": `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from, to: "pk@invegent.com", subject: opts.subject, html: opts.html, text: opts.text }),
  });
  if (!resp.ok) throw new Error(`resend_${resp.status}: ${(await resp.text()).slice(0, 400)}`);
  const body = await resp.json();
  return body?.id ?? "";
}

app.options("*", () => new Response(null, { status: 204, headers: corsHeaders }));

app.get("*", (c) => {
  const path = c.req.path || "/";
  if (path.endsWith("/health")) return jsonResponse({ ok: true, function: "external-reviewer-digest", version: VERSION });
  return jsonResponse({ ok: true, function: "external-reviewer-digest", version: VERSION });
});

app.post("*", async (c) => {
  const bodyText = await c.req.text();
  let body: { trigger_type?: string; triggered_by?: string };
  try { body = bodyText ? JSON.parse(bodyText) : {}; } catch { return jsonResponse({ ok: false, error: "bad_json" }, 400); }
  const triggerType = body.trigger_type ?? "on_demand";
  const triggeredBy = body.triggered_by ?? (triggerType === "weekly_cron" ? null : "pk@invegent.com");

  const supabase = getServiceClient();

  // Determine window
  const { data: lastRow } = await supabase.schema("m")
    .from("external_review_digest")
    .select("window_end")
    .eq("status", "succeeded")
    .order("window_end", { ascending: false })
    .limit(1);
  const windowStart = lastRow?.[0]?.window_end ?? "2026-01-01T00:00:00Z";
  const windowEnd = new Date().toISOString();

  const { data: findingsRaw, error: findErr } = await supabase.schema("m")
    .from("external_review_queue")
    .select("review_id, reviewer_key, commit_sha, commit_repo, commit_message, commit_author, commit_timestamp, severity, finding_summary, finding_detail, referenced_rules, referenced_artifacts, cost_usd, created_at")
    .gte("created_at", windowStart)
    .lt("created_at", windowEnd)
    .is("included_in_digest", null)
    .order("created_at", { ascending: false });
  if (findErr) return jsonResponse({ ok: false, error: `findings_query_failed: ${findErr.message}` }, 500);

  const findings: Finding[] = (findingsRaw ?? []) as unknown as Finding[];

  if (findings.length === 0) {
    return jsonResponse({ ok: true, skipped: true, reason: "no_new_findings", window_start: windowStart, window_end: windowEnd });
  }

  const { data: digestRow, error: digestInsertErr } = await supabase.schema("m")
    .from("external_review_digest")
    .insert({ trigger_type: triggerType, triggered_by: triggeredBy, window_start: windowStart, window_end: windowEnd, status: "running" })
    .select("digest_id")
    .single();
  if (digestInsertErr || !digestRow) return jsonResponse({ ok: false, error: `digest_insert_failed: ${digestInsertErr?.message}` }, 500);
  const digestId = digestRow.digest_id;

  const totals = {
    critical: findings.filter((f) => f.severity === "critical").length,
    warn: findings.filter((f) => f.severity === "warn").length,
    info: findings.filter((f) => f.severity === "info").length,
    total: findings.length,
    cost: findings.reduce((n, f) => n + Number(f.cost_usd ?? 0), 0),
  };

  const uniqueCommits = new Set(findings.map((f) => f.commit_sha));
  const digestDate = ymd(new Date());

  const { data: allReviewers } = await supabase.schema("c")
    .from("external_reviewer")
    .select("reviewer_key, display_name, model, is_active")
    .order("reviewer_key");
  const activeReviewers = (allReviewers ?? []).filter((r: any) => r.is_active);
  const pausedReviewers = (allReviewers ?? []).filter((r: any) => !r.is_active);

  const markdown = assembleMarkdown({
    digestDate,
    triggerType,
    windowStart,
    windowEnd,
    commitsReviewed: uniqueCommits.size,
    totals,
    findings,
    activeReviewers,
    pausedReviewers,
  });

  try {
    const pat = Deno.env.get("GITHUB_PAT_INVEGENT");
    if (!pat) throw new Error("GITHUB_PAT_INVEGENT not set");
    const filePath = `docs/reviews/${digestDate}-digest.md`;
    const { sha: githubCommitSha } = await commitToGitHub(
      pat,
      filePath,
      markdown,
      `docs: external review digest ${digestDate} (${triggerType})`,
    );

    const subject = `ICE Review Digest — ${digestDate} — ${totals.critical} critical, ${totals.warn} warn`;
    const html = markdownToHtml(markdown);
    const resendId = await sendEmail({ subject, html, text: markdown });

    await supabase.schema("m").from("external_review_queue")
      .update({ included_in_digest: digestId })
      .in("review_id", findings.map((f) => f.review_id));

    await supabase.schema("m").from("external_review_digest").update({
      commits_reviewed: uniqueCommits.size,
      findings_total: totals.total,
      findings_critical: totals.critical,
      findings_warn: totals.warn,
      findings_info: totals.info,
      github_file_path: filePath,
      github_commit_sha: githubCommitSha,
      email_sent_at: new Date().toISOString(),
      email_resend_id: resendId,
      status: "succeeded",
    }).eq("digest_id", digestId);

    return jsonResponse({
      ok: true,
      digest_id: digestId,
      trigger_type: triggerType,
      commits_reviewed: uniqueCommits.size,
      findings_total: totals.total,
      findings_critical: totals.critical,
      findings_warn: totals.warn,
      findings_info: totals.info,
      github_file_path: filePath,
      email_resend_id: resendId,
    });
  } catch (e: any) {
    const msg = e?.message ?? String(e);
    await supabase.schema("m").from("external_review_digest").update({ status: "failed", error: msg }).eq("digest_id", digestId);
    return jsonResponse({ ok: false, error: msg, digest_id: digestId }, 500);
  }
});

Deno.serve(app.fetch);
