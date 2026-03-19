import { createClient } from "jsr:@supabase/supabase-js@2";

// linkedin-publisher v1.1.0
const VERSION = "linkedin-publisher-v1.1.0";

function nowIso() { return new Date().toISOString(); }
function getServiceClient() {
  const url = Deno.env.get("SUPABASE_URL");
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !key) throw new Error("Missing Supabase credentials");
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}
function clampInt(n: number, lo: number, hi: number) { if (!Number.isFinite(n)) return lo; return Math.max(lo, Math.min(hi, Math.trunc(n))); }
function startOfNextUtcDayIso() { const d = new Date(); return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() + 1)).toISOString(); }

async function linkedInPost(opts: { accessToken: string; orgUrn: string; text: string }): Promise<{ id: string }> {
  const { accessToken, orgUrn, text } = opts;
  const resp = await fetch("https://api.linkedin.com/rest/posts", {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json", "LinkedIn-Version": "202504", "X-Restli-Protocol-Version": "2.0.0" },
    body: JSON.stringify({ author: orgUrn, commentary: text, visibility: "PUBLIC", distribution: { feedDistribution: "MAIN_FEED", targetEntities: [], thirdPartyDistributionChannels: [] }, lifecycleState: "PUBLISHED", isReshareDisabledByAuthor: false }),
  });
  const responseText = await resp.text();
  if (!resp.ok) throw new Error(`linkedin_http_${resp.status}: ${responseText.slice(0, 1200)}`);
  const postId = resp.headers.get("x-restli-id") ?? decodeURIComponent((resp.headers.get("location") ?? "").replace(/^\/posts\//, "")) ?? `linkedin-post-${Date.now()}`;
  return { id: postId };
}

Deno.serve(async (req: Request) => {
  const supabase = getServiceClient();
  const expectedKey = Deno.env.get("PUBLISHER_API_KEY");
  const providedKey = req.headers.get("x-publisher-key") ?? new URL(req.url).searchParams.get("key") ?? "";
  if (expectedKey && providedKey !== expectedKey) return new Response(JSON.stringify({ ok: false, error: "Unauthorized" }), { status: 401, headers: { "Content-Type": "application/json" } });
  if (req.method === "GET") return new Response(JSON.stringify({ ok: true, version: VERSION }), { headers: { "Content-Type": "application/json" } });

  let body: any = {};
  try { body = await req.json(); } catch { /* empty body fine */ }

  const limit = clampInt(Number(body.limit ?? 1), 1, 10);
  const workerId = `linkedin-pub-${crypto.randomUUID().slice(0, 8)}`;
  const lockSecs = clampInt(Number(body.lock_seconds ?? 600), 30, 3600);
  const dryRun = Boolean(body.dry_run ?? false);

  const { data: lockedRows, error: lockErr } = await supabase.schema("m").rpc("publisher_lock_queue_v2", { p_limit: limit, p_worker_id: workerId, p_lock_seconds: lockSecs, p_platform: "linkedin" });
  if (lockErr) return new Response(JSON.stringify({ ok: false, error: "lock_failed", detail: lockErr }), { status: 500, headers: { "Content-Type": "application/json" } });

  const rows = (lockedRows ?? []) as any[];
  if (!rows.length) return new Response(JSON.stringify({ ok: true, version: VERSION, message: "no_linkedin_jobs", worker_id: workerId }), { headers: { "Content-Type": "application/json" } });

  const results: any[] = [];

  for (const q of rows) {
    const queueId = q.queue_id;
    try {
      const { data: prof, error: profErr } = await supabase.schema("c").from("client_publish_profile").select("*").eq("client_id", q.client_id).eq("platform", "linkedin").eq("status", "active").order("is_default", { ascending: false }).limit(1).maybeSingle();
      if (profErr) throw new Error(`load_profile_failed: ${profErr.message}`);
      if (!prof) throw new Error("no_active_linkedin_profile");
      if (prof.publish_enabled === false) {
        await supabase.schema("m").from("post_publish_queue").update({ status: "skipped", last_error: "publish_disabled", locked_at: null, locked_by: null, updated_at: nowIso() }).eq("queue_id", queueId);
        results.push({ queue_id: queueId, status: "skipped", reason: "publish_disabled" }); continue;
      }
      const orgUrn = prof.page_id;
      const accessToken = prof.page_access_token;
      if (!orgUrn) throw new Error("missing_org_urn");
      if (!accessToken) throw new Error("missing_access_token");
      if (prof.token_expires_at && new Date(prof.token_expires_at).getTime() < Date.now()) throw new Error(`linkedin_token_expired`);
      const { data: draft, error: draftErr } = await supabase.schema("m").from("post_draft").select("post_draft_id, draft_title, draft_body").eq("post_draft_id", q.post_draft_id).maybeSingle();
      if (draftErr) throw new Error(`load_draft_failed: ${draftErr.message}`);
      if (!draft) throw new Error("post_draft_not_found");
      const title = (draft.draft_title ?? "").trim();
      const draftBody = (draft.draft_body ?? "").trim();
      if (!title && !draftBody) throw new Error("empty_draft");
      const prefix = prof.mode === "staging" ? (prof.test_prefix ?? "[TEST] ") : "";
      const text = `${prefix}${title}${title && draftBody ? "\n\n" : ""}${draftBody}`.trim().slice(0, 3000);
      const maxPerDay = Number(prof.max_per_day ?? 0);
      if (maxPerDay > 0) {
        const dayStart = new Date(); dayStart.setUTCHours(0, 0, 0, 0);
        const { count: todayCount } = await supabase.schema("m").from("post_publish").select("post_publish_id", { count: "exact", head: true }).eq("client_id", q.client_id).eq("platform", "linkedin").eq("status", "published").gte("created_at", dayStart.toISOString());
        if ((todayCount ?? 0) >= maxPerDay) {
          await supabase.schema("m").from("post_publish_queue").update({ status: "queued", scheduled_for: startOfNextUtcDayIso(), last_error: `throttled:max_per_day:${maxPerDay}`, locked_at: null, locked_by: null, updated_at: nowIso() }).eq("queue_id", queueId);
          results.push({ queue_id: queueId, status: "throttled", reason: "max_per_day" }); continue;
        }
      }
      if (dryRun) {
        await supabase.schema("m").from("post_publish_queue").update({ status: "queued", scheduled_for: new Date(Date.now() + 60 * 60_000).toISOString(), last_error: "dry_run_ok", locked_at: null, locked_by: null, updated_at: nowIso() }).eq("queue_id", queueId);
        results.push({ queue_id: queueId, status: "dry_run_ok" }); continue;
      }
      const liResp = await linkedInPost({ accessToken, orgUrn, text });
      await supabase.schema("m").from("post_publish").insert({ queue_id: queueId, ai_job_id: q.ai_job_id, post_draft_id: q.post_draft_id, client_id: q.client_id, platform: "linkedin", destination_id: orgUrn, status: "published", platform_post_id: liResp.id, published_at: nowIso(), request_payload: { org_urn: orgUrn, text_len: text.length }, response_payload: liResp, error: null, created_at: nowIso() });
      await supabase.schema("m").from("post_publish_queue").update({ status: "published", last_error: null, locked_at: null, locked_by: null, updated_at: nowIso() }).eq("queue_id", queueId);
      await supabase.schema("m").from("post_draft").update({ approval_status: "published", updated_at: nowIso() }).eq("post_draft_id", q.post_draft_id);
      results.push({ queue_id: queueId, post_draft_id: q.post_draft_id, status: "published", platform_post_id: liResp.id });
    } catch (e: any) {
      const errMsg = (e?.message ?? String(e)).slice(0, 4000);
      await supabase.schema("m").from("post_publish_queue").update({ status: "queued", scheduled_for: new Date(Date.now() + 10 * 60_000).toISOString(), last_error: errMsg, locked_at: null, locked_by: null, updated_at: nowIso() }).eq("queue_id", queueId);
      await supabase.schema("m").from("post_publish").insert({ queue_id: queueId, ai_job_id: q.ai_job_id, post_draft_id: q.post_draft_id, client_id: q.client_id, platform: "linkedin", destination_id: null, status: "failed", platform_post_id: null, request_payload: {}, response_payload: null, error: errMsg, created_at: nowIso() });
      results.push({ queue_id: queueId, status: "failed", error: errMsg });
    }
  }

  return new Response(JSON.stringify({ ok: true, version: VERSION, worker_id: workerId, locked: rows.length, processed: results.length, results }), { headers: { "Content-Type": "application/json" } });
});
