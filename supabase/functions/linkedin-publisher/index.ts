import { createClient } from "jsr:@supabase/supabase-js@2";
import { classifyLinkedinFormat, decideLinkedinAssetGuard } from "./guard.ts";

// linkedin-publisher v1.3.0
// v1.3.0 (18 Jun 2026): INTERIM ASSETLESS-PUBLISH GUARD (LinkedIn) — F-PUBLISHER-ASSETGUARD-LINKEDIN.
//   Repo-only EF; NOT deployed (activates with B24/F06). Ports the proven FB interim asset
//   guard so this EF is asset-safe from day-1 of activation. linkedInPost() posts
//   `commentary` text only via /rest/posts — there is NO media-publish path today, so the
//   guard is called with { mediaPublishSupported: false }: text→publish (existing text path
//   unchanged); any non-text recommended_format → BLOCK (queue status='skipped',
//   last_error='asset_guard_blocked:<reason>', m.post_publish status='failed' audit row,
//   draft preserved, NO LinkedIn POST); never text-fallback. Also adds a defensive
//   platform-isolation skip (mirror YT v1.12.0 / IG v2.0.0): a loaded draft whose
//   platform != 'linkedin' is skipped (status='skipped', last_error='platform_isolation_skip',
//   lock cleared). The guard's mediaPublishSupported flag flips to true (one line) when a real
//   LinkedIn media path is built.
//   STRICTLY OUT OF SCOPE: no new media-publish path; existing approval gate + text path are
//   byte-unchanged; no DB/schema/migration; remains REPO-ONLY (not wired to any deploy).
// v1.2.0 (T13, 1 May 2026): APPROVAL GATE added — mirror IG v2.0.0 per-row pattern.
//   Repo-only EF; not deployed yet. Patched defensively so when B24/F06
//   activates this EF (LinkedIn Community Management API approval), the gate
//   is in place from day-1 — prevents reintroducing the F-PUB-005-class bug.
// v1.1.0 (prior): direct LinkedIn API integration, repo-staged for B24/F06 future activation.
const VERSION = "linkedin-publisher-v1.3.0";

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

      // v1.2.0 (T13): added approval_status to SELECT for gate check below
      // v1.3.0: added platform + asset-status columns for the platform-isolation skip + asset guard
      const { data: draft, error: draftErr } = await supabase.schema("m").from("post_draft").select("post_draft_id, draft_title, draft_body, approval_status, platform, recommended_format, image_status, image_url, video_status, video_url").eq("post_draft_id", q.post_draft_id).maybeSingle();
      if (draftErr) throw new Error(`load_draft_failed: ${draftErr.message}`);
      if (!draft) throw new Error("post_draft_not_found");

      // v1.2.0 (T13): APPROVAL GATE (mirror IG v2.0.0 per-row pattern).
      // Repo-only EF; not deployed yet. Patched defensively for B24/F06 activation
      // so the gate is in place from day-1 of activation.
      if (draft.approval_status !== 'approved') {
        await supabase.schema("m").from("post_publish_queue").update({
          status: "queued",
          scheduled_for: new Date(Date.now() + 60 * 60_000).toISOString(),
          last_error: `not_approved:${draft.approval_status}`,
          locked_at: null, locked_by: null, updated_at: nowIso(),
        }).eq("queue_id", queueId);
        results.push({ queue_id: queueId, status: "held", reason: "not_approved", draft_status: draft.approval_status });
        continue;
      }

      // v1.3.0: DEFENSIVE PLATFORM-ISOLATION SKIP (mirror YT v1.12.0 / IG v2.0.0).
      // Queue is locked with p_platform:'linkedin', but defend in depth: never POST a
      // non-linkedin draft even if a future SELECT/code path lets one through. Skip the
      // row (no stuck lock), no LinkedIn POST.
      if (draft.platform !== 'linkedin') {
        console.error(`[linkedin-publisher] platform_isolation_skip post_draft_id=${q.post_draft_id} platform=${draft.platform}`);
        await supabase.schema("m").from("post_publish_queue").update({
          status: "skipped",
          last_error: "platform_isolation_skip",
          locked_at: null, locked_by: null, updated_at: nowIso(),
        }).eq("queue_id", queueId);
        results.push({ queue_id: queueId, status: "skipped", reason: "platform_isolation_skip", platform: draft.platform });
        continue;
      }

      // ══ INTERIM ASSETLESS-PUBLISH GUARD (v1.3.0) ════════════════════════════
      // linkedInPost() posts `commentary` text only (no media path) → mediaPublishSupported:false.
      // text → publish (existing text path); any non-text format → block, never text.
      const assetClass = classifyLinkedinFormat(draft.recommended_format);
      const decision = decideLinkedinAssetGuard({
        assetClass,
        image_status: draft.image_status, image_url: draft.image_url,
        video_status: draft.video_status, video_url: draft.video_url,
      }, { mediaPublishSupported: false });

      if (decision.kind === "hold") {
        // retryable hold — requeue, no post_publish row, NO LinkedIn POST.
        // (not reachable this lane with mediaPublishSupported:false; kept for parity)
        await supabase.schema("m").from("post_publish_queue").update({
          status: "queued",
          scheduled_for: new Date(Date.now() + decision.minutes * 60_000).toISOString(),
          last_error: decision.reason,
          locked_at: null, locked_by: null, updated_at: nowIso(),
        }).eq("queue_id", queueId);
        results.push({ queue_id: queueId, status: "held", reason: decision.reason, asset_class: assetClass });
        continue;
      }
      if (decision.kind === "block") {
        // terminal, reviewable block — no LinkedIn POST, draft preserved, reason recorded.
        await supabase.schema("m").from("post_publish_queue").update({
          status: "skipped",
          last_error: `asset_guard_blocked:${decision.reason}`,
          locked_at: null, locked_by: null, updated_at: nowIso(),
        }).eq("queue_id", queueId);
        await supabase.schema("m").from("post_publish").insert({
          queue_id: queueId, ai_job_id: q.ai_job_id, post_draft_id: q.post_draft_id,
          client_id: q.client_id, platform: "linkedin", destination_id: orgUrn,
          status: "failed", platform_post_id: null,
          request_payload: { asset_guard: true, reason: decision.reason, asset_class: assetClass },
          response_payload: null, error: `asset_guard_blocked:${decision.reason}`, created_at: nowIso(),
        });
        results.push({ queue_id: queueId, status: "blocked", reason: decision.reason, asset_class: assetClass });
        continue;
      }
      // decision.kind === "publish" (method 'text' this lane) → fall through to the
      // existing empty_draft check + text build + linkedInPost path UNCHANGED.
      // ══ END ASSETLESS-PUBLISH GUARD ═════════════════════════════════════════

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
