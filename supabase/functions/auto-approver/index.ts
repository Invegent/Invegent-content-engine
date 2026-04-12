import { Hono } from "jsr:@hono/hono";
import { createClient } from "jsr:@supabase/supabase-js@2";

const app = new Hono();
const VERSION = "auto-approver-v1.4.1";
// v1.4.1 — Add Care For Welfare to CLIENT_CONFIGS (NDIS blocklist, same thresholds as NDIS Yarns)
// v1.4.0 — Write auto_approval_scores to m.post_draft (D088)

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "content-type, apikey, authorization, x-auto-approver-key",
  "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
};

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function nowIso() {
  return new Date().toISOString();
}

function getServiceClient() {
  const url = Deno.env.get("SUPABASE_URL");
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !key) throw new Error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

const PROPERTY_BLOCKLIST = [
  "fraud", "scam", "money laundering", "criminal", "arrested", "charged",
  "class action", "lawsuit", "court", "tribunal",
  "explicit", "suicide", "death", "murder",
  "confidential", "leaked", "whistleblower",
];

const NDIS_BLOCKLIST = [
  "fraud", "scam", "abuse", "neglect", "assault", "criminal", "arrested",
  "charged", "court", "tribunal", "lawsuit", "class action",
  "suicide", "self-harm", "death", "murder",
  "confidential", "leaked", "whistleblower",
  "ndia investigation", "royal commission", "complaint",
  "participant death", "restrictive practice",
];

interface ClientApprovalConfig {
  client_id: string;
  name: string;
  min_score: number;
  min_body_chars: number;
  max_body_chars: number;
  blocklist: string[];
}

const CLIENT_CONFIGS: Record<string, ClientApprovalConfig> = {
  "4036a6b5-b4a3-406e-998d-c2fe14a8bbdd": {
    client_id: "4036a6b5-b4a3-406e-998d-c2fe14a8bbdd",
    name: "Property Pulse",
    min_score: 6,
    min_body_chars: 80,
    max_body_chars: 2000,
    blocklist: PROPERTY_BLOCKLIST,
  },
  "fb98a472-ae4d-432d-8738-2273231c1ef4": {
    client_id: "fb98a472-ae4d-432d-8738-2273231c1ef4",
    name: "NDIS Yarns",
    min_score: 5,
    min_body_chars: 80,
    max_body_chars: 1800,
    blocklist: NDIS_BLOCKLIST,
  },
  "3eca32aa-e460-462f-a846-3f6ace6a3cae": {
    client_id: "3eca32aa-e460-462f-a846-3f6ace6a3cae",
    name: "Care For Welfare",
    min_score: 5,
    min_body_chars: 80,
    max_body_chars: 1800,
    blocklist: NDIS_BLOCKLIST,
  },
};

function getClientConfig(client_id: string): ClientApprovalConfig {
  return CLIENT_CONFIGS[client_id] ?? {
    client_id,
    name: "unknown",
    min_score: 6,
    min_body_chars: 80,
    max_body_chars: 2000,
    blocklist: [...PROPERTY_BLOCKLIST, ...NDIS_BLOCKLIST],
  };
}

interface GateResult { gate: string; reason: string; }

interface DraftRow {
  post_draft_id: string;
  client_id: string;
  draft_body: string;
  draft_title: string | null;
  draft_format: Record<string, unknown> | null;
  approval_status: string;
  digest_item_id: string;
  final_score: number | null;
  auto_approve_enabled: boolean | null;
}

function evaluateGates(
  draft: DraftRow,
  config: ClientApprovalConfig
): { passed: boolean; failed_gate?: GateResult; gates: Record<string, boolean | string> } {
  const gates: Record<string, boolean | string> = {};

  const autoEnabled = draft.auto_approve_enabled ?? false;
  gates["auto_approve_enabled"] = autoEnabled;
  if (!autoEnabled) {
    return { passed: false, failed_gate: { gate: "auto_approve_enabled", reason: "auto_approve_enabled is false or missing" }, gates };
  }

  gates["not_rejected"] = draft.approval_status !== "rejected";
  if (draft.approval_status === "rejected") {
    return { passed: false, failed_gate: { gate: "not_rejected", reason: "Draft was previously rejected by a human" }, gates };
  }

  const score = draft.final_score ?? 0;
  gates["source_score"] = score >= config.min_score ? `pass (${score})` : `fail (${score} < ${config.min_score})`;
  if (score < config.min_score) {
    return { passed: false, failed_gate: { gate: "source_score", reason: `Score ${score} below threshold ${config.min_score}` }, gates };
  }

  const bodyLen = (draft.draft_body ?? "").trim().length;
  gates["body_length"] = (bodyLen >= config.min_body_chars && bodyLen <= config.max_body_chars)
    ? `pass (${bodyLen} chars)` : `fail (${bodyLen} chars)`;
  if (bodyLen < config.min_body_chars) {
    return { passed: false, failed_gate: { gate: "body_length", reason: `Too short: ${bodyLen} chars (min ${config.min_body_chars})` }, gates };
  }
  if (bodyLen > config.max_body_chars) {
    return { passed: false, failed_gate: { gate: "body_length", reason: `Too long: ${bodyLen} chars (max ${config.max_body_chars})` }, gates };
  }

  const fullText = `${draft.draft_title ?? ""} ${draft.draft_body ?? ""}`.toLowerCase();
  const hitKeyword = config.blocklist.find((kw) => fullText.includes(kw.toLowerCase()));
  gates["sensitive_keywords"] = hitKeyword ? `fail ("${hitKeyword}")` : "pass";
  if (hitKeyword) {
    return { passed: false, failed_gate: { gate: "sensitive_keywords", reason: `Blocked keyword: "${hitKeyword}"` }, gates };
  }

  return { passed: true, gates };
}

async function fetchDraftsViaRpc(
  supabase: ReturnType<typeof getServiceClient>,
  limit: number,
  filterClientId: string | null
): Promise<DraftRow[]> {
  const { data, error } = await supabase
    .schema("m")
    .rpc("auto_approver_fetch_drafts", { p_limit: limit });

  if (error) throw new Error(`fetch_drafts_rpc_failed: ${error.message}`);
  if (!data || (data as unknown[]).length === 0) return [];

  const rows = data as DraftRow[];
  if (filterClientId) return rows.filter((r) => r.client_id === filterClientId);
  return rows;
}

interface ApprovalResult {
  post_draft_id: string;
  client_id: string;
  outcome: "approved" | "skipped" | "failed";
  reason?: string;
  gates?: Record<string, boolean | string>;
}

async function processOneDraft(
  supabase: ReturnType<typeof getServiceClient>,
  draft: DraftRow
): Promise<ApprovalResult> {
  const config = getClientConfig(draft.client_id);
  const { passed, failed_gate, gates } = evaluateGates(draft, config);
  const checkedAt = nowIso();
  const existingFormat = (typeof draft.draft_format === "object" && draft.draft_format) ? draft.draft_format : {};

  if (passed) {
    const { error } = await supabase
      .schema("m")
      .from("post_draft")
      .update({
        approval_status: "approved",
        approved_by: "auto-agent-v1",
        approved_at: checkedAt,
        auto_approval_scores: { gates, passed: true, checked_at: checkedAt, agent: VERSION },
        draft_format: { ...existingFormat, auto_review: { passed: true, gates, checked_at: checkedAt, agent: VERSION } },
        updated_at: checkedAt,
      })
      .eq("post_draft_id", draft.post_draft_id);

    if (error) return { post_draft_id: draft.post_draft_id, client_id: draft.client_id, outcome: "failed", reason: error.message };
    return { post_draft_id: draft.post_draft_id, client_id: draft.client_id, outcome: "approved", gates };
  } else {
    await supabase
      .schema("m")
      .from("post_draft")
      .update({
        auto_approval_scores: { gates, passed: false, failed_gate: failed_gate?.gate, reason: failed_gate?.reason, checked_at: checkedAt, agent: VERSION },
        draft_format: { ...existingFormat, auto_review: { passed: false, failed_gate: failed_gate?.gate, reason: failed_gate?.reason, gates, checked_at: checkedAt, agent: VERSION } },
        updated_at: checkedAt,
      })
      .eq("post_draft_id", draft.post_draft_id);

    return { post_draft_id: draft.post_draft_id, client_id: draft.client_id, outcome: "skipped", reason: failed_gate?.reason, gates };
  }
}

app.options("*", () => new Response(null, { status: 204, headers: corsHeaders }));

app.use("*", async (c, next) => {
  if (c.req.method !== "POST") return next();
  const expected = Deno.env.get("AUTO_APPROVER_API_KEY");
  const provided = c.req.header("x-auto-approver-key");
  if (!expected) return jsonResponse({ ok: false, error: "AUTO_APPROVER_API_KEY not set" }, 500);
  if (!provided || provided !== expected) return jsonResponse({ ok: false, error: "Unauthorized" }, 401);
  return next();
});

app.get("*", () => jsonResponse({ ok: true, function: "auto-approver", version: VERSION }));

app.post("*", async (c) => {
  try {
    const supabase = getServiceClient();
    let limit = 10;
    let filterClientId: string | null = null;

    try {
      const body = await c.req.json();
      if (typeof body?.limit === "number") limit = Math.min(body.limit, 50);
      if (typeof body?.client_id === "string") filterClientId = body.client_id;
    } catch { /* body optional */ }

    const drafts = await fetchDraftsViaRpc(supabase, limit, filterClientId);

    if (drafts.length === 0) {
      return jsonResponse({ ok: true, version: VERSION, message: "no_drafts_to_review", processed: 0, results: [] });
    }

    const results: ApprovalResult[] = [];
    for (const draft of drafts) {
      results.push(await processOneDraft(supabase, draft));
    }

    return jsonResponse({
      ok: true,
      version: VERSION,
      processed: results.length,
      approved: results.filter((r) => r.outcome === "approved").length,
      skipped_needs_human_review: results.filter((r) => r.outcome === "skipped").length,
      errors: results.filter((r) => r.outcome === "failed").length,
      results,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return jsonResponse({ ok: false, error: msg, version: VERSION }, 500);
  }
});

Deno.serve(app.fetch);
