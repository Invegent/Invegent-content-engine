import { Hono } from "jsr:@hono/hono";
import { createClient } from "jsr:@supabase/supabase-js@2";

const app = new Hono();
const VERSION = "auto-approver-v1.6.0";
// v1.6.0 (B31, T08, F-PUB-004 fix) — closes auto-approver starvation cascade.
//   Three coordinated changes from v1.5.0:
//   (1) Eligibility filter at SQL: SQL v5 fetch fn already filters auto_approve_enabled=true
//       via INNER JOIN LATERAL. Drafts without auto-approve config are not fetched.
//   (2) Terminal rejection on content-gate failure: previously v1.4.1 only updated
//       auto_approval_scores JSONB on failure, leaving approval_status='needs_review'.
//       This caused the F-PUB-004 cycling-30 starvation. v1.6.0 sets approval_status='rejected'
//       which fires trg_handle_draft_rejection and resets the slot.
//   (3) Eligibility safety net: if the auto_approve_enabled or not_rejected gate fires anyway
//       (SQL filter regression), return outcome='skipped' and leave draft at needs_review.
//       Tracked via eligibility_safety_net_fires counter in response — should be 0 in steady state.
//   Plus EF cooldown defence-in-depth (B32 Path 3): drafts auto-reviewed within COOLDOWN_HOURS
//       are returned as outcome='skipped' (cooldown_active) without re-evaluating gates.
//       Prevents log spam if eligibility safety net fires repeatedly; protects against rapid
//       re-evaluation if a regression flips approval_status back to needs_review.
//   Response shape extended:
//       auto_rejected (new)              — count of terminal-rejected drafts
//       skipped_needs_human_review       — DEPRECATED alias mirroring auto_rejected; v1.7.0 removes
//       skipped (new)                    — count of cooldown + safety-net skips combined
//       eligibility_safety_net_fires     — should be 0 in steady state
//       cooldown_skips                   — count of cooldown_active outcomes
//   DraftRow gains `platform` field per SQL v5 RETURNS TABLE signature.
//   ELIGIBILITY_GATES = Set(["auto_approve_enabled", "not_rejected", "source_score"]) — explicit
//       classification; new gates must be classified or default to content-gate-terminal-rejection.
//       source_score included as defence-in-depth while scoring is no-op (v1.5.0 D135);
//       remove from set when scoring is intentionally re-enabled.
// v1.5.0 — Set min_score to 0 for all clients (final_score=0 on all drafts because old bundler
//           scoring was removed with D135 pipeline fix; source_score gate is a no-op until
//           proper scoring is implemented as a future build). Preserved in v1.6.0.
// v1.4.1 — Add Care For Welfare to CLIENT_CONFIGS (NDIS blocklist, same thresholds as NDIS Yarns)
// v1.4.0 — Write auto_approval_scores to m.post_draft (D088)

const COOLDOWN_HOURS = 4;
const COOLDOWN_MS = COOLDOWN_HOURS * 60 * 60 * 1000;

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
    min_score: 0,  // v1.5.0: scoring disabled — final_score=0 on all drafts (D135 bundler removed)
    min_body_chars: 80,
    max_body_chars: 2000,
    blocklist: PROPERTY_BLOCKLIST,
  },
  "fb98a472-ae4d-432d-8738-2273231c1ef4": {
    client_id: "fb98a472-ae4d-432d-8738-2273231c1ef4",
    name: "NDIS Yarns",
    min_score: 0,  // v1.5.0: scoring disabled — final_score=0 on all drafts (D135 bundler removed)
    min_body_chars: 80,
    max_body_chars: 1800,
    blocklist: NDIS_BLOCKLIST,
  },
  "3eca32aa-e460-462f-a846-3f6ace6a3cae": {
    client_id: "3eca32aa-e460-462f-a846-3f6ace6a3cae",
    name: "Care For Welfare",
    min_score: 0,  // v1.5.0: scoring disabled — final_score=0 on all drafts (D135 bundler removed)
    min_body_chars: 80,
    max_body_chars: 1800,
    blocklist: NDIS_BLOCKLIST,
  },
};

function getClientConfig(client_id: string): ClientApprovalConfig {
  return CLIENT_CONFIGS[client_id] ?? {
    client_id,
    name: "unknown",
    min_score: 0,  // v1.5.0: scoring disabled — final_score=0 on all drafts (D135 bundler removed)
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
  platform: string;  // NEW v1.6.0 — SQL v5 RETURNS TABLE includes platform
}

// Eligibility/state gates: failure = safety net skip (DO NOT terminal-reject).
// SQL v5 should filter these at fetch; if they fire here it's a regression signal.
// source_score is included as defence-in-depth while scoring is a no-op (v1.5.0 D135:
// min_score=0, final_score=0 always passes). A stray config change raising min_score
// above 0 would otherwise cause unexpected terminal rejections. REMOVE source_score
// from this set when scoring is INTENTIONALLY re-enabled in a future version.
const ELIGIBILITY_GATES = new Set(["auto_approve_enabled", "not_rejected", "source_score"]);

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

  // score gate — min_score=0 disables this gate (v1.5.0 D135 — scoring not yet implemented post-bundler-removal)
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

// NEW v1.6.0 — read prior auto_review timestamp from draft_format JSONB.
// If within COOLDOWN_HOURS of last check, skip without re-evaluating gates.
// Prevents log spam from repeated eligibility safety-net fires; protects against
// rapid re-evaluation if a regression flips approval_status back to needs_review.
function checkCooldown(draft: DraftRow): { active: boolean; checkedAt?: string; ageMs?: number } {
  const draftFormat = (typeof draft.draft_format === "object" && draft.draft_format)
    ? draft.draft_format as Record<string, unknown>
    : {};
  const autoReview = draftFormat["auto_review"] as Record<string, unknown> | undefined;
  const checkedAtRaw = autoReview?.["checked_at"] as string | undefined;
  if (!checkedAtRaw) return { active: false };
  const checkedAtMs = new Date(checkedAtRaw).getTime();
  if (Number.isNaN(checkedAtMs)) return { active: false };
  const ageMs = Date.now() - checkedAtMs;
  return { active: ageMs >= 0 && ageMs < COOLDOWN_MS, checkedAt: checkedAtRaw, ageMs };
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
  platform: string;
  outcome: "approved" | "rejected" | "skipped" | "failed";
  reason?: string;
  gates?: Record<string, boolean | string>;
}

async function processOneDraft(
  supabase: ReturnType<typeof getServiceClient>,
  draft: DraftRow
): Promise<ApprovalResult> {
  // 1. Cooldown check (NEW v1.6.0). Skip without re-evaluation if recent auto_review.
  const cooldown = checkCooldown(draft);
  if (cooldown.active) {
    const ageMin = Math.round((cooldown.ageMs ?? 0) / 60000);
    return {
      post_draft_id: draft.post_draft_id,
      client_id: draft.client_id,
      platform: draft.platform,
      outcome: "skipped",
      reason: `cooldown_active (last_checked ${ageMin}min ago, window ${COOLDOWN_HOURS}h)`,
    };
  }

  // 2. Evaluate gates.
  const config = getClientConfig(draft.client_id);
  const { passed, failed_gate, gates } = evaluateGates(draft, config);
  const checkedAt = nowIso();
  const existingFormat = (typeof draft.draft_format === "object" && draft.draft_format) ? draft.draft_format : {};

  // 3a. PASS — terminal approve.
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

    if (error) {
      return { post_draft_id: draft.post_draft_id, client_id: draft.client_id, platform: draft.platform, outcome: "failed", reason: error.message };
    }
    return { post_draft_id: draft.post_draft_id, client_id: draft.client_id, platform: draft.platform, outcome: "approved", gates };
  }

  // 3b. FAIL — split path: eligibility/state gate vs content gate.
  const failedGateName = failed_gate?.gate ?? "unknown";
  const isEligibilityGate = ELIGIBILITY_GATES.has(failedGateName);

  if (isEligibilityGate) {
    // ELIGIBILITY SAFETY NET — should not fire; SQL v5 filters auto_approve_enabled at fetch
    // via INNER JOIN LATERAL, and approval_status='rejected' rows are excluded by WHERE clause.
    // If this fires, it means the SQL contract is broken or there's a race. Log + skip + leave
    // draft at needs_review (DO NOT terminal-reject — eligibility != content-bad).
    console.warn(`[auto-approver] eligibility_safety_net_fired post_draft_id=${draft.post_draft_id} client_id=${draft.client_id} platform=${draft.platform} gate=${failedGateName}`);
    const { error } = await supabase
      .schema("m")
      .from("post_draft")
      .update({
        // NB: approval_status NOT changed — draft stays at needs_review for human review.
        auto_approval_scores: { gates, passed: false, failed_gate: failedGateName, reason: failed_gate?.reason, checked_at: checkedAt, agent: VERSION, eligibility_safety_net: true },
        draft_format: { ...existingFormat, auto_review: { passed: false, failed_gate: failedGateName, reason: failed_gate?.reason, gates, checked_at: checkedAt, agent: VERSION, eligibility_safety_net: true } },
        updated_at: checkedAt,
      })
      .eq("post_draft_id", draft.post_draft_id);

    if (error) {
      return { post_draft_id: draft.post_draft_id, client_id: draft.client_id, platform: draft.platform, outcome: "failed", reason: error.message };
    }
    return { post_draft_id: draft.post_draft_id, client_id: draft.client_id, platform: draft.platform, outcome: "skipped", reason: `eligibility_safety_net:${failedGateName}`, gates };
  }

  // CONTENT GATE FAILURE — terminal rejection (NEW v1.6.0; the F-PUB-004 fix).
  // Sets approval_status='rejected' which fires trg_handle_draft_rejection,
  // resetting the slot so a fresh draft can be generated.
  const { error } = await supabase
    .schema("m")
    .from("post_draft")
    .update({
      approval_status: "rejected",
      auto_approval_scores: { gates, passed: false, failed_gate: failedGateName, reason: failed_gate?.reason, checked_at: checkedAt, agent: VERSION },
      draft_format: { ...existingFormat, auto_review: { passed: false, failed_gate: failedGateName, reason: failed_gate?.reason, gates, checked_at: checkedAt, agent: VERSION } },
      updated_at: checkedAt,
    })
    .eq("post_draft_id", draft.post_draft_id);

  if (error) {
    return { post_draft_id: draft.post_draft_id, client_id: draft.client_id, platform: draft.platform, outcome: "failed", reason: error.message };
  }
  return { post_draft_id: draft.post_draft_id, client_id: draft.client_id, platform: draft.platform, outcome: "rejected", reason: failed_gate?.reason, gates };
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
      return jsonResponse({
        ok: true,
        version: VERSION,
        message: "no_drafts_to_review",
        processed: 0,
        approved: 0,
        auto_rejected: 0,
        skipped: 0,
        skipped_needs_human_review: 0, // deprecated alias; v1.7.0 removes
        eligibility_safety_net_fires: 0,
        cooldown_skips: 0,
        errors: 0,
        results: [],
      });
    }

    const results: ApprovalResult[] = [];
    for (const draft of drafts) {
      results.push(await processOneDraft(supabase, draft));
    }

    const approved = results.filter((r) => r.outcome === "approved").length;
    const rejected = results.filter((r) => r.outcome === "rejected").length;
    const skipped = results.filter((r) => r.outcome === "skipped").length;
    const errors = results.filter((r) => r.outcome === "failed").length;
    const eligibilitySafetyNetFires = results.filter((r) => r.outcome === "skipped" && (r.reason ?? "").startsWith("eligibility_safety_net:")).length;
    const cooldownSkips = results.filter((r) => r.outcome === "skipped" && (r.reason ?? "").startsWith("cooldown_active")).length;

    return jsonResponse({
      ok: true,
      version: VERSION,
      processed: results.length,
      approved,
      auto_rejected: rejected,
      skipped,
      skipped_needs_human_review: rejected, // DEPRECATED alias mirroring auto_rejected; v1.7.0 will remove
      eligibility_safety_net_fires: eligibilitySafetyNetFires,
      cooldown_skips: cooldownSkips,
      errors,
      results,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return jsonResponse({ ok: false, error: msg, version: VERSION }, 500);
  }
});

Deno.serve(app.fetch);
