import { Hono } from "jsr:@hono/hono";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { classifyFbFormat, decideAssetGuard, IMAGE_HOLD_MINUTES } from "./guard.ts";

const app = new Hono();

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "content-type, apikey, authorization, x-publisher-key",
  "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
};

const VERSION = "publisher-v1.9.0";
// v1.9.0 (14 Jun 2026): INTERIM ASSETLESS-RELEASE GUARD (Facebook only).
//   Live incident: an image_quote draft with image_status='failed' (no image_url)
//   fell through the old gate (which only caught image_status='pending'),
//   hasImage=false, and silently published as a TEXT feed post.
//   Fix: classify each draft by the asset FB can actually publish (classifyFbFormat)
//   and a single pure decision (decideAssetGuard) that refuses to publish an
//   asset-required format without its rendered asset. NO silent text fallback.
//   text→feed; image_quote→photo; carousel→multi-photo; video/animated/unknown→
//   FB has no publish path → blocked (never text). No DB/schema change. FB only.
//   Not T2 (no OCR/transcript/visual QA).
// v1.8.0 (T18, 1 May 2026): APPROVAL GATE added — mirror IG v2.0.0 per-row pattern.
// v1.7.0 — Schedule-aware publishing.
// v1.6.0 — Organic carousel.

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function safeParseJson<T>(raw: string): { ok: true; value: T } | { ok: false; error: string } {
  try { return { ok: true, value: JSON.parse(raw) as T }; }
  catch (e: any) { return { ok: false, error: e?.message ?? "invalid_json" }; }
}

function nowIso() { return new Date().toISOString(); }

function parseBool(v: unknown, fallback = false) {
  if (typeof v === "boolean") return v;
  if (typeof v === "string") {
    const s = v.trim().toLowerCase();
    if (["1","true","yes","y"].includes(s)) return true;
    if (["0","false","no","n"].includes(s)) return false;
  }
  return fallback;
}

function clampInt(n: number, lo: number, hi: number) {
  if (!Number.isFinite(n)) return lo;
  return Math.max(lo, Math.min(hi, Math.trunc(n)));
}

function startOfUtcDayIso(d = new Date()) {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate())).toISOString();
}
function startOfNextUtcDayIso(d = new Date()) {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() + 1)).toISOString();
}

function getServiceClient() {
  const url = Deno.env.get("SUPABASE_URL");
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !key) throw new Error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

function requirePublisherKey(c: any) {
  const expected = Deno.env.get("PUBLISHER_API_KEY");
  const provided = c.req.header("x-publisher-key");
  if (!expected) return { ok: false, res: jsonResponse({ ok: false, error: "PUBLISHER_API_KEY_not_set" }, 500) };
  if (!provided || provided !== expected) return { ok: false, res: jsonResponse({ ok: false, error: "Unauthorized" }, 401) };
  return { ok: true as const };
}

function getGraphVersion() { return (Deno.env.get("FB_GRAPH_VERSION") ?? "v25.0").toString(); }

function getAppAccessTokenOrNull() {
  const appId = Deno.env.get("FB_APP_ID");
  const appSecret = Deno.env.get("FB_APP_SECRET");
  if (!appId || !appSecret) return null;
  return `${appId}|${appSecret}`;
}

async function fbDebugToken(opts: { graphVersion: string; inputToken: string; appAccessToken: string }) {
  const { graphVersion, inputToken, appAccessToken } = opts;
  const url = `https://graph.facebook.com/${graphVersion}/debug_token?input_token=${encodeURIComponent(inputToken)}&access_token=${encodeURIComponent(appAccessToken)}`;
  const resp = await fetch(url);
  const text = await resp.text();
  let parsed: any = null; try { parsed = JSON.parse(text); } catch { parsed = { raw: text }; }
  if (!resp.ok) throw new Error(`facebook_debug_token_http_${resp.status}: ${text.slice(0, 1200)}`);
  return parsed;
}

async function fbPostToFeed(opts: { graphVersion: string; pageId: string; pageToken: string; message: string }) {
  const { graphVersion, pageId, pageToken, message } = opts;
  const url = `https://graph.facebook.com/${graphVersion}/${pageId}/feed`;
  const body = new URLSearchParams();
  body.set("message", message); body.set("access_token", pageToken);
  const resp = await fetch(url, { method: "POST", body });
  const text = await resp.text();
  let parsed: any = null; try { parsed = JSON.parse(text); } catch { parsed = { raw: text }; }
  if (!resp.ok) throw new Error(`facebook_http_${resp.status}: ${text.slice(0, 1200)}`);
  if (!parsed?.id) throw new Error(`facebook_missing_post_id: ${text.slice(0, 1200)}`);
  return parsed;
}

async function fbPostWithPhoto(opts: { graphVersion: string; pageId: string; pageToken: string; message: string; imageUrl: string }) {
  const { graphVersion, pageId, pageToken, message, imageUrl } = opts;
  const url = `https://graph.facebook.com/${graphVersion}/${pageId}/photos`;
  const body = new URLSearchParams();
  body.set("caption", message); body.set("url", imageUrl); body.set("access_token", pageToken);
  const resp = await fetch(url, { method: "POST", body });
  const text = await resp.text();
  let parsed: any = null; try { parsed = JSON.parse(text); } catch { parsed = { raw: text }; }
  if (!resp.ok) throw new Error(`facebook_photo_http_${resp.status}: ${text.slice(0, 1200)}`);
  if (!parsed?.id) throw new Error(`facebook_photo_missing_post_id: ${text.slice(0, 1200)}`);
  return parsed;
}

async function fbUploadSlideUnpublished(opts: { graphVersion: string; pageId: string; pageToken: string; imageUrl: string }): Promise<string> {
  const { graphVersion, pageId, pageToken, imageUrl } = opts;
  const url = `https://graph.facebook.com/${graphVersion}/${pageId}/photos`;
  const body = new URLSearchParams();
  body.set("url", imageUrl);
  body.set("published", "false");
  body.set("access_token", pageToken);
  const resp = await fetch(url, { method: "POST", body });
  const text = await resp.text();
  let parsed: any = null; try { parsed = JSON.parse(text); } catch { parsed = { raw: text }; }
  if (!resp.ok) throw new Error(`fb_upload_slide_http_${resp.status}: ${text.slice(0, 800)}`);
  const photoId = parsed?.id;
  if (!photoId) throw new Error(`fb_upload_slide_missing_id: ${text.slice(0, 800)}`);
  return String(photoId);
}

async function fbPostCarousel(opts: { graphVersion: string; pageId: string; pageToken: string; message: string; photoIds: string[] }) {
  const { graphVersion, pageId, pageToken, message, photoIds } = opts;
  const url = `https://graph.facebook.com/${graphVersion}/${pageId}/feed`;
  const body = new URLSearchParams();
  body.set("message", message);
  body.set("access_token", pageToken);
  for (const photoId of photoIds) {
    body.append("attached_media[]", JSON.stringify({ media_fbid: photoId }));
  }
  const resp = await fetch(url, { method: "POST", body });
  const text = await resp.text();
  let parsed: any = null; try { parsed = JSON.parse(text); } catch { parsed = { raw: text }; }
  if (!resp.ok) throw new Error(`fb_carousel_http_${resp.status}: ${text.slice(0, 1200)}`);
  if (!parsed?.id) throw new Error(`fb_carousel_missing_post_id: ${text.slice(0, 1200)}`);
  return parsed;
}

type PublisherRequest = { limit?: number; worker_id?: string; lock_seconds?: number; dry_run?: boolean; dry_run_hold_minutes?: number };

type PublishQueueRow = {
  queue_id: string; ai_job_id: string | null; post_draft_id: string;
  client_id: string; platform: string; status: string;
  scheduled_for: string | null; attempt_count: number | null;
  last_error: string | null; locked_at: string | null; locked_by: string | null;
};

type PublishProfile = {
  client_publish_profile_id: string; client_id: string; platform: string;
  status: string; mode: string | null; is_default: boolean | null;
  destination_id: string | null; credential_env_key: string | null;
  page_id: string | null; page_access_token: string | null; page_name: string | null;
  publish_enabled: boolean | null; test_prefix: string | null;
  max_per_day: number | null; min_gap_minutes: number | null;
};

function resolvePageId(p: PublishProfile) { return (p.page_id ?? p.destination_id ?? "").toString(); }
function resolvePageToken(p: PublishProfile) {
  if (p.page_access_token) return p.page_access_token;
  const k = (p.credential_env_key ?? "").toString();
  return k ? (Deno.env.get(k) ?? null) : null;
}

// v1.9.0: terminal, reviewable block — no publish, draft preserved, reason recorded.
async function assetGuardBlock(supabase: any, q: PublishQueueRow, queueId: string, pageId: string | null, reason: string) {
  await supabase.schema("m").from("post_publish_queue").update({
    status: "skipped", last_error: `asset_guard_blocked:${reason}`,
    locked_at: null, locked_by: null, updated_at: nowIso(),
  }).eq("queue_id", queueId);
  await supabase.schema("m").from("post_publish").insert({
    queue_id: queueId, ai_job_id: q.ai_job_id, post_draft_id: q.post_draft_id,
    client_id: q.client_id, platform: "facebook", destination_id: pageId,
    status: "failed", platform_post_id: null,
    request_payload: { asset_guard: true, reason }, response_payload: null,
    error: `asset_guard_blocked:${reason}`, created_at: nowIso(),
  });
}
// v1.9.0: retryable hold — requeue, no post_publish row (mirrors pending pattern).
async function assetGuardHold(supabase: any, queueId: string, reason: string, minutes: number) {
  await supabase.schema("m").from("post_publish_queue").update({
    status: "queued", scheduled_for: new Date(Date.now() + minutes * 60_000).toISOString(),
    last_error: reason, locked_at: null, locked_by: null, updated_at: nowIso(),
  }).eq("queue_id", queueId);
}

app.options("*", () => new Response(null, { status: 204, headers: corsHeaders }));

app.get("*", async (c) => {
  const path = c.req.path || "/";
  if (path.endsWith("/health")) return jsonResponse({ ok: true, function: "publisher", version: VERSION });
  if (path.endsWith("/token-health")) {
    const gate = requirePublisherKey(c); if (!gate.ok) return gate.res;
    const supabase = getServiceClient();
    const graphVersion = getGraphVersion();
    const appAccessToken = getAppAccessTokenOrNull();
    if (!appAccessToken) return jsonResponse({ ok: false, error: "FB_APP_ID_or_FB_APP_SECRET_missing" }, 400);
    const { data: profiles } = await supabase.schema("c").from("client_publish_profile").select("*").eq("platform", "facebook").eq("status", "active");
    const results: any[] = [];
    for (const p of profiles ?? []) {
      const profile = p as unknown as PublishProfile;
      const pageId = resolvePageId(profile); const pageToken = resolvePageToken(profile);
      if (!pageId || !pageToken) { results.push({ client_id: p.client_id, ok: false, error: "missing_page_id_or_token" }); continue; }
      try {
        const dbg = await fbDebugToken({ graphVersion, inputToken: pageToken, appAccessToken });
        const d = dbg?.data ?? {};
        results.push({ client_id: p.client_id, page_id: pageId, is_valid: Boolean(d.is_valid), expires_at: d.expires_at ?? null, scopes: d.scopes ?? null });
      } catch (e: any) { results.push({ client_id: p.client_id, ok: false, error: e?.message?.slice(0,800) }); }
    }
    return jsonResponse({ ok: true, version: VERSION, checked: results.length, results });
  }
  return jsonResponse({ ok: true, function: "publisher", version: VERSION });
});

app.post("*", async (c) => {
  const gate = requirePublisherKey(c); if (!gate.ok) return gate.res;
  const supabase = getServiceClient();
  const graphVersion = getGraphVersion();
  const appAccessToken = getAppAccessTokenOrNull();
  const validateToken = parseBool(Deno.env.get("PUBLISH_VALIDATE_TOKEN") ?? "true", true);

  const bodyText = await c.req.text();
  const bodyJson = bodyText?.trim() ? safeParseJson<PublisherRequest>(bodyText) : ({ ok: true as const, value: {} as PublisherRequest });
  if (!bodyJson.ok) return jsonResponse({ ok: false, error: "bad_json" }, 400);

  const limit        = clampInt(Number(bodyJson.value.limit ?? c.req.query("limit") ?? 1), 1, 20);
  const workerId     = (bodyJson.value.worker_id ?? `publisher-${crypto.randomUUID().slice(0, 8)}`).toString();
  const lockSeconds  = clampInt(Number(bodyJson.value.lock_seconds ?? 600), 30, 3600);
  const dryRun       = Boolean(bodyJson.value.dry_run ?? parseBool(c.req.query("dry_run") ?? "", false));
  const dryRunHoldMin = clampInt(Number(bodyJson.value.dry_run_hold_minutes ?? 60), 1, 24 * 60);

  const { data: lockedRows, error: lockErr } = await supabase.schema("m").rpc("publisher_lock_queue_v1", { p_limit: limit, p_worker_id: workerId, p_lock_seconds: lockSeconds });
  if (lockErr) return jsonResponse({ ok: false, error: "lock_queue_failed", detail: lockErr }, 500);

  const rows = (lockedRows ?? []) as PublishQueueRow[];
  if (!rows.length) return jsonResponse({ ok: true, message: "no_publish_jobs", worker_id: workerId, locked: 0 });

  const results: any[] = [];

  for (const q of rows) {
    const queueId = q.queue_id;
    try {
      // ── SCHEDULE CHECK ───────────────────────────────────────
      if (!q.scheduled_for) {
        const { data: nextSlot, error: slotErr } = await supabase.rpc("get_next_publish_slot", {
          p_client_id: q.client_id,
          p_platform: q.platform,
        });
        if (!slotErr && nextSlot && new Date(nextSlot as string).getTime() > Date.now()) {
          await supabase.schema("m").from("post_publish_queue").update({
            status: "queued", scheduled_for: nextSlot as string,
            locked_at: null, locked_by: null, updated_at: nowIso(),
          }).eq("queue_id", queueId);
          console.log(`[publisher] scheduled ${queueId} for ${nextSlot} (client=${q.client_id}, platform=${q.platform})`);
          results.push({ queue_id: queueId, status: "scheduled", scheduled_for: nextSlot });
          continue;
        }
      }
      // ── END SCHEDULE CHECK ──────────────────────────────────

      const { data: prof, error: profErr } = await supabase.schema("c").from("client_publish_profile")
        .select("*").eq("client_id", q.client_id).eq("platform", "facebook").eq("status", "active")
        .order("is_default", { ascending: false }).limit(1).maybeSingle();
      if (profErr) throw new Error(`load_profile_failed: ${profErr.message}`);
      if (!prof) throw new Error("no_active_publish_profile");
      const profile = prof as unknown as PublishProfile;

      if (profile.publish_enabled === false) {
        await supabase.schema("m").from("post_publish_queue").update({ status: "skipped", last_error: "publish_disabled", locked_at: null, locked_by: null, updated_at: nowIso() }).eq("queue_id", queueId);
        results.push({ queue_id: queueId, status: "skipped", reason: "publish_disabled" }); continue;
      }

      const pageId = resolvePageId(profile);
      const pageToken = resolvePageToken(profile);
      const tokenSource = profile.page_access_token ? "db_oauth" : "env_var";
      if (!pageId) throw new Error("missing_page_id");
      if (!pageToken) throw new Error("missing_page_access_token");

      if (validateToken) {
        if (!appAccessToken) throw new Error("token_validation_enabled_but_credentials_missing");
        const dbg = await fbDebugToken({ graphVersion, inputToken: pageToken, appAccessToken });
        if (!dbg?.data?.is_valid) {
          const backoffIso = new Date(Date.now() + 6 * 3600_000).toISOString();
          await supabase.schema("m").from("post_publish_queue").update({ status: "queued", scheduled_for: backoffIso, last_error: "invalid_facebook_token", locked_at: null, locked_by: null, updated_at: nowIso() }).eq("queue_id", queueId);
          await supabase.schema("m").from("post_publish").insert({ queue_id: queueId, ai_job_id: q.ai_job_id, post_draft_id: q.post_draft_id, client_id: q.client_id, platform: "facebook", destination_id: pageId, status: "failed", platform_post_id: null, request_payload: { graph_version: graphVersion, token_source: tokenSource }, response_payload: dbg, error: "invalid_facebook_token", created_at: nowIso() });
          results.push({ queue_id: queueId, status: "failed", error: "invalid_facebook_token" }); continue;
        }
      }

      const { data: draft, error: draftErr } = await supabase.schema("m").from("post_draft")
        .select("post_draft_id, draft_title, draft_body, approval_status, image_url, image_status, video_url, video_status, recommended_format, approved_at")
        .eq("post_draft_id", q.post_draft_id).maybeSingle();
      if (draftErr) throw new Error(`load_draft_failed: ${draftErr.message}`);
      if (!draft) throw new Error("post_draft_not_found");

      // v1.8.0: APPROVAL GATE — hold non-approved drafts (no post_publish row).
      if (draft.approval_status !== 'approved') {
        await supabase.schema("m").from("post_publish_queue").update({
          status: "queued", scheduled_for: new Date(Date.now() + 60 * 60_000).toISOString(),
          last_error: `not_approved:${draft.approval_status}`, locked_at: null, locked_by: null, updated_at: nowIso(),
        }).eq("queue_id", queueId);
        results.push({ queue_id: queueId, status: "held", reason: "not_approved", draft_status: draft.approval_status });
        continue;
      }

      const title = (draft.draft_title ?? "").trim();
      const body  = (draft.draft_body  ?? "").trim();
      if (!title && !body) throw new Error("empty_draft");
      const msg = `${profile.mode === "staging" ? (profile.test_prefix ?? "[TEST] ") : ""}${title}${title && body ? "\n\n" : ""}${body}`.trim();

      // ══ INTERIM ASSETLESS-RELEASE GUARD (v1.9.0) ════════════════════════
      const assetClass = classifyFbFormat(draft.recommended_format);

      // Carousel needs its generated slide count before deciding.
      let slides: Array<{ slide_index: number; image_url: string }> = [];
      let slideCount: number | undefined = undefined;
      if (assetClass === "carousel" && draft.image_status === "generated") {
        const { data: slidesRaw } = await supabase.rpc("exec_sql", {
          query: `SELECT slide_index, image_url FROM m.post_carousel_slide
                  WHERE post_draft_id = '${q.post_draft_id}' AND image_status = 'generated'
                  ORDER BY slide_index ASC`
        });
        slides = (slidesRaw ?? []).filter((s: any) => s && s.image_url);
        slideCount = slides.length;
      }

      const approvedAt = draft.approved_at ? new Date(draft.approved_at).getTime() : null;
      const minutesWaiting = approvedAt ? (Date.now() - approvedAt) / 60_000 : 0;
      const decision = decideAssetGuard({
        assetClass,
        image_status: draft.image_status, image_url: draft.image_url,
        video_status: draft.video_status, video_url: draft.video_url,
        minutesWaiting, holdMinutes: IMAGE_HOLD_MINUTES, slideCount,
      });

      if (decision.kind === "hold") {
        await assetGuardHold(supabase, queueId, decision.reason, decision.minutes);
        results.push({ queue_id: queueId, status: "held", reason: decision.reason, asset_class: assetClass });
        continue;
      }
      if (decision.kind === "block") {
        await assetGuardBlock(supabase, q, queueId, pageId, decision.reason);
        results.push({ queue_id: queueId, status: "blocked", reason: decision.reason, asset_class: assetClass });
        continue;
      }
      // decision.kind === "publish" → method text | image | carousel
      const publishMethod = decision.method;
      // ══ END ASSETLESS-RELEASE GUARD ═════════════════════════════════════

      // Throttle (applies to all publishable methods)
      const maxPerDay = Number(profile.max_per_day ?? 0);
      if (maxPerDay > 0) {
        const { count: todayCount } = await supabase.schema("m").from("post_publish").select("post_publish_id", { count: "exact", head: true }).eq("destination_id", pageId).eq("status", "published").gte("created_at", startOfUtcDayIso());
        if ((todayCount ?? 0) >= maxPerDay) {
          const rf = startOfNextUtcDayIso();
          await supabase.schema("m").from("post_publish_queue").update({ status: "queued", scheduled_for: rf, last_error: `throttled:max_per_day:${maxPerDay}`, locked_at: null, locked_by: null, updated_at: nowIso() }).eq("queue_id", queueId);
          results.push({ queue_id: queueId, status: "throttled", reason: "max_per_day" }); continue;
        }
      }
      const minGap = Number(profile.min_gap_minutes ?? 0);
      if (minGap > 0) {
        const { data: lastPub } = await supabase.schema("m").from("post_publish").select("created_at").eq("destination_id", pageId).eq("status", "published").order("created_at", { ascending: false }).limit(1);
        const lastAt = lastPub?.[0]?.created_at ? new Date(lastPub[0].created_at).getTime() : null;
        if (lastAt && Date.now() - lastAt < minGap * 60_000) {
          const rf = new Date(lastAt + minGap * 60_000).toISOString();
          await supabase.schema("m").from("post_publish_queue").update({ status: "queued", scheduled_for: rf, last_error: `throttled:min_gap:${minGap}m`, locked_at: null, locked_by: null, updated_at: nowIso() }).eq("queue_id", queueId);
          results.push({ queue_id: queueId, status: "throttled", reason: "min_gap" }); continue;
        }
      }

      if (dryRun) {
        const rf = new Date(Date.now() + dryRunHoldMin * 60_000).toISOString();
        await supabase.schema("m").from("post_publish_queue").update({ status: "queued", scheduled_for: rf, last_error: "dry_run_ok", locked_at: null, locked_by: null, updated_at: nowIso() }).eq("queue_id", queueId);
        results.push({ queue_id: queueId, status: "dry_run_ok", publish_method: publishMethod, asset_class: assetClass }); continue;
      }

      // ── PUBLISH ───────────────────────────────────────────────────────
      let fbResp: any; let endpoint: string; let slideCountOut: number | null = null;
      if (publishMethod === "carousel") {
        console.log(`[publisher] carousel ${q.post_draft_id}: uploading ${slides.length} slides`);
        const photoIds: string[] = [];
        for (const slide of slides) {
          const photoId = await fbUploadSlideUnpublished({ graphVersion, pageId, pageToken, imageUrl: slide.image_url });
          photoIds.push(photoId);
        }
        fbResp = await fbPostCarousel({ graphVersion, pageId, pageToken, message: msg, photoIds });
        endpoint = `/${pageId}/feed`; slideCountOut = slides.length;
      } else if (publishMethod === "image") {
        fbResp = await fbPostWithPhoto({ graphVersion, pageId, pageToken, message: msg, imageUrl: draft.image_url! });
        endpoint = `/${pageId}/photos`;
      } else {
        fbResp = await fbPostToFeed({ graphVersion, pageId, pageToken, message: msg });
        endpoint = `/${pageId}/feed`;
      }
      const platformPostId = fbResp?.id ?? null;

      await supabase.schema("m").from("post_publish").insert({
        queue_id: queueId, ai_job_id: q.ai_job_id, post_draft_id: q.post_draft_id,
        client_id: q.client_id, platform: "facebook", destination_id: pageId,
        status: "published", platform_post_id: platformPostId, published_at: nowIso(),
        request_payload: { endpoint, graph_version: graphVersion, publish_method: publishMethod, has_image: publishMethod !== "text", asset_class: assetClass, slide_count: slideCountOut, token_source: tokenSource },
        response_payload: fbResp, error: null, created_at: nowIso(),
      });
      await supabase.schema("m").from("post_publish_queue").update({ status: "published", last_error: null, locked_at: null, locked_by: null, updated_at: nowIso() }).eq("queue_id", queueId);
      await supabase.schema("m").from("post_draft").update({ approval_status: "published", updated_at: nowIso() }).eq("post_draft_id", q.post_draft_id);
      results.push({ queue_id: queueId, status: "published", publish_method: publishMethod, platform_post_id: platformPostId, slide_count: slideCountOut });

    } catch (e: any) {
      const errMsg = (e?.message ?? String(e)).slice(0, 4000);
      const backoffIso = new Date(Date.now() + 10 * 60_000).toISOString();
      await supabase.schema("m").from("post_publish_queue").update({ status: "queued", scheduled_for: backoffIso, last_error: errMsg, locked_at: null, locked_by: null, updated_at: nowIso() }).eq("queue_id", queueId);
      await supabase.schema("m").from("post_publish").insert({ queue_id: queueId, ai_job_id: q.ai_job_id, post_draft_id: q.post_draft_id, client_id: q.client_id, platform: "facebook", destination_id: null, status: "failed", platform_post_id: null, request_payload: { graph_version: graphVersion }, response_payload: null, error: errMsg, created_at: nowIso() });
      results.push({ queue_id: queueId, status: "failed", error: errMsg });
    }
  }

  return jsonResponse({ ok: true, version: VERSION, worker_id: workerId, locked: rows.length, processed: results.length, results });
});

// Only start the server when run as the entrypoint (not when imported by tests).
if (import.meta.main) Deno.serve(app.fetch);
