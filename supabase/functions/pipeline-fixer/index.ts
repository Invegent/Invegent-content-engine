// pipeline-fixer v1.1.0
// Tier 2 AI Diagnostic Agent — Layer A
// Runs every 30 minutes via pg_cron (:25 and :55).
// Executes pre-approved auto-fix actions + escalation detection.
// Writes structured log to m.pipeline_fixer_log.
// Does NOT modify: draft content, approval status, client config, published posts, feeds.

import { createClient } from "jsr:@supabase/supabase-js@2";

const VERSION = "pipeline-fixer-v1.1.0";

type FixResult = {
  fix: string;
  count: number;
  ids: string[];
};

type SB = ReturnType<typeof getServiceClient>;

function getServiceClient() {
  const url = Deno.env.get("SUPABASE_URL");
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !key) throw new Error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

function nowIso() { return new Date().toISOString(); }
function agoIso(minutes: number) { return new Date(Date.now() - minutes * 60_000).toISOString(); }

// ─── FIX 1: Unstick locked ai_jobs ───────────────────────────────────────────
// Jobs locked > 30 min ago = worker crashed. Re-queue them.
async function fixLockedAiJobs(sb: SB): Promise<FixResult> {
  const { data: locked } = await sb.schema("m").from("ai_job")
    .select("ai_job_id")
    .eq("status", "locked")
    .lt("locked_at", agoIso(30));

  const ids = (locked ?? []).map((r: any) => r.ai_job_id);
  if (ids.length === 0) return { fix: "unstick_locked_jobs", count: 0, ids: [] };

  await sb.schema("m").from("ai_job")
    .update({ status: "queued", locked_by: null, locked_at: null, updated_at: nowIso() })
    .in("ai_job_id", ids);

  return { fix: "unstick_locked_jobs", count: ids.length, ids };
}

// ─── FIX 2: Reset failed image generation for retry ─────────────────────────
// Approved image-format drafts that failed > 2 hours ago get another chance.
async function fixFailedImages(sb: SB): Promise<FixResult> {
  const { data: failed } = await sb.schema("m").from("post_draft")
    .select("post_draft_id")
    .eq("image_status", "failed")
    .eq("approval_status", "approved")
    .lt("updated_at", agoIso(120))
    .in("recommended_format", ["image_quote", "carousel", "animated_text_reveal", "animated_data"]);

  const ids = (failed ?? []).map((r: any) => r.post_draft_id);
  if (ids.length === 0) return { fix: "reset_failed_images", count: 0, ids: [] };

  await sb.schema("m").from("post_draft")
    .update({ image_status: "pending", updated_at: nowIso() })
    .in("post_draft_id", ids);

  return { fix: "reset_failed_images", count: ids.length, ids };
}

// ─── FIX 3: Kill orphaned publish queue items ────────────────────────────────
// Items stuck in 'running' for > 20 min = publisher timed out.
async function fixStuckPublishQueue(sb: SB): Promise<FixResult> {
  const { data: stuck } = await sb.schema("m").from("post_publish_queue")
    .select("queue_id")
    .eq("status", "running")
    .lt("updated_at", agoIso(20));

  const ids = (stuck ?? []).map((r: any) => r.queue_id);
  if (ids.length === 0) return { fix: "unstick_publish_queue", count: 0, ids: [] };

  await sb.schema("m").from("post_publish_queue")
    .update({ status: "queued", locked_at: null, locked_by: null, updated_at: nowIso() })
    .in("queue_id", ids);

  return { fix: "unstick_publish_queue", count: ids.length, ids };
}

// ─── FIX 4: Dead-letter items stuck > 7 days ────────────────────────────────
// Jobs failing for a week will never succeed. Move to dead status.
async function fixStaleDeadLetters(sb: SB): Promise<FixResult> {
  const { data: stale } = await sb.schema("m").from("ai_job")
    .select("ai_job_id")
    .in("status", ["failed", "locked"])
    .lt("updated_at", agoIso(7 * 24 * 60));

  const ids = (stale ?? []).map((r: any) => r.ai_job_id);
  if (ids.length === 0) return { fix: "dead_letter_7day", count: 0, ids: [] };

  await sb.schema("m").from("ai_job")
    .update({ status: "dead", error: "auto-dead: stuck 7+ days", updated_at: nowIso() })
    .in("ai_job_id", ids);

  return { fix: "dead_letter_7day", count: ids.length, ids };
}

// ─── ESCALATION DETECTION ────────────────────────────────────────────────────
// These write alerts for the Nightly Auditor to pick up. No data changes.

async function detectEscalations(sb: SB): Promise<string[]> {
  const escalations: string[] = [];

  // 1. Publishing stalled: active client with drafts but no publish in 36h
  const { data: clients } = await sb.schema("c").from("client")
    .select("client_id").eq("status", "active");
  for (const cl of (clients ?? [])) {
    const { data: recent } = await sb.schema("m").from("post_publish")
      .select("post_publish_id")
      .eq("client_id", cl.client_id)
      .gte("published_at", agoIso(36 * 60))
      .limit(1);
    if ((recent ?? []).length === 0) {
      const { data: hasDrafts } = await sb.schema("m").from("post_draft")
        .select("post_draft_id")
        .eq("client_id", cl.client_id)
        .limit(1);
      if ((hasDrafts ?? []).length > 0) {
        escalations.push("publishing_stalled");
        console.log(`[pipeline-fixer] ESCALATION: publishing_stalled for client ${cl.client_id}`);
        break; // one is enough
      }
    }
  }

  // 2. AI backlog critical: queue depth > 50 for any client
  const { data: allQueued } = await sb.schema("m").from("ai_job")
    .select("client_id")
    .eq("status", "queued");
  const queueByClient: Record<string, number> = {};
  for (const j of (allQueued ?? [])) {
    queueByClient[j.client_id] = (queueByClient[j.client_id] ?? 0) + 1;
  }
  if (Object.values(queueByClient).some(c => c > 50)) {
    escalations.push("ai_backlog_critical");
    console.log("[pipeline-fixer] ESCALATION: ai_backlog_critical");
  }

  // 3. Image pipeline silent: 0 renders in 48h with image_generation_enabled
  const { data: imgClients } = await sb.schema("c").from("client_publish_profile")
    .select("client_id")
    .eq("image_generation_enabled", true);
  for (const ic of (imgClients ?? [])) {
    const { data: recentImg } = await sb.schema("m").from("post_draft")
      .select("post_draft_id")
      .eq("client_id", ic.client_id)
      .eq("image_status", "generated")
      .gte("updated_at", agoIso(48 * 60))
      .limit(1);
    if ((recentImg ?? []).length === 0) {
      escalations.push("image_pipeline_silent");
      console.log(`[pipeline-fixer] ESCALATION: image_pipeline_silent for client ${ic.client_id}`);
      break;
    }
  }

  // 4. Dead letter spike: > 10 new dead letters in 24 hours
  const { data: deadRecent } = await sb.schema("m").from("ai_job")
    .select("ai_job_id")
    .eq("status", "dead")
    .gte("updated_at", agoIso(24 * 60));
  if ((deadRecent ?? []).length > 10) {
    escalations.push("dead_letter_spike");
    console.log(`[pipeline-fixer] ESCALATION: dead_letter_spike — ${deadRecent!.length} in 24h`);
  }

  // 5. Health degraded persistent: 3 consecutive pipeline_ai_summary with health_ok=false
  const { data: healthRows } = await sb.schema("m").from("pipeline_ai_summary")
    .select("health_ok")
    .order("generated_at", { ascending: false })
    .limit(3);
  if ((healthRows ?? []).length >= 3 && healthRows!.every((r: any) => r.health_ok === false)) {
    escalations.push("health_degraded_persistent");
    console.log("[pipeline-fixer] ESCALATION: health_degraded_persistent");
  }

  return escalations;
}

// ─── MAIN ─────────────────────────────────────────────────────────────────────

Deno.serve(async (req: Request) => {
  if (req.method === "GET") {
    return new Response(JSON.stringify({ ok: true, version: VERSION }), {
      headers: { "Content-Type": "application/json" },
    });
  }

  // Auth check
  const expected = Deno.env.get("PIPELINE_FIXER_API_KEY");
  const provided = req.headers.get("x-pipeline-fixer-key");
  if (expected && (!provided || provided !== expected)) {
    return new Response(JSON.stringify({ ok: false, error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  const sb = getServiceClient();
  const fixResults: FixResult[] = [];
  let escalations: string[] = [];
  let healthOk = true;

  try {
    // Run all 4 fixes
    const fixes = [fixLockedAiJobs, fixFailedImages, fixStuckPublishQueue, fixStaleDeadLetters];
    for (const fix of fixes) {
      try {
        const result = await fix(sb);
        if (result.count > 0) fixResults.push(result);
      } catch (e: any) {
        console.error(`[pipeline-fixer] fix ${fix.name} failed:`, e?.message);
        fixResults.push({ fix: fix.name, count: -1, ids: [`error: ${(e?.message ?? "").slice(0, 200)}`] });
      }
    }

    // Run escalation detection
    try {
      escalations = await detectEscalations(sb);
    } catch (e: any) {
      console.error("[pipeline-fixer] escalation detection failed:", e?.message);
      escalations = [`error: ${(e?.message ?? "").slice(0, 200)}`];
    }

    healthOk = escalations.length === 0;

    // Write log
    try {
      await sb.schema("m").from("pipeline_fixer_log").insert({
        run_at: nowIso(),
        fixes_applied: fixResults,
        escalations: escalations,
        health_ok: healthOk,
        version: VERSION,
      });
    } catch (e: any) {
      console.error("[pipeline-fixer] failed to write log:", e?.message);
    }

  } catch (e: any) {
    console.error("[pipeline-fixer] top-level error:", e?.message);
    healthOk = false;
  }

  const totalFixed = fixResults.reduce((s, r) => s + Math.max(r.count, 0), 0);

  return new Response(JSON.stringify({
    ok: true,
    version: VERSION,
    fixes_applied: fixResults,
    total_fixed: totalFixed,
    escalations,
    health_ok: healthOk,
  }), { headers: { "Content-Type": "application/json" } });
});
