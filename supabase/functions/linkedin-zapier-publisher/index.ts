import { createClient } from 'jsr:@supabase/supabase-js@2';
import { classifyLinkedinFormat, decideLinkedinAssetGuard } from './guard.ts';
import { resolveZapierAction, nextAttemptNoFrom } from './media_action.ts';

const VERSION = 'linkedin-zapier-publisher-v1.4.0';
// v1.4.0 (08 Jul 2026): ATTEMPT_NO AUDIT-GAP FIX — cc-0029 step 1; mirrors youtube-publisher
//   v1.10.0 F-YT-PUB-PUBLISH-AUDIT-GAP. Both m.post_publish inserts (the published-path insert and
//   the shared writeTerminalBlock insert) previously omitted attempt_no, so it defaulted to 1 and
//   collided with a prior/cross-posted platform's row on uq_publish_attempt (post_draft_id,
//   attempt_no); the collision .error was never checked, so the audit row was SILENTLY lost while
//   the queue was still marked published (observed in the cc-0028 proof). Fix: derive the next
//   free attempt_no per post_draft_id (nextAttemptNoFrom, pure + unit-tested) immediately before
//   each insert, set attempt_no on the payload, and CAPTURE + check the insert .error.
//   PUBLISHED PATH: on insertErr, log + surface audit_row_inserted:false but do NOT throw — the
//   Zapier POST already fired, so throwing would route to catch → requeue → RE-FIRE → duplicate
//   post; the queue still goes 'published' (the post is live). writeTerminalBlock PATH: no post was
//   sent, so log + reflect audit_row_inserted:false, no duplicate risk. Each result entry now
//   carries audit_row_inserted + attempt_no.
//   STRICTLY OUT OF SCOPE: the Zapier POST + text/image body, mediaPublishSupported, resolveZapier-
//   Action, guard logic, approval gate, platform-isolation skip, dry_run branch, throttle/seeding
//   (all byte-unchanged); guard.ts (byte-unchanged); no DB/schema/migration; the identical latent
//   defect in the sibling publishers (publisher/instagram-publisher/linkedin-publisher) — flagged
//   as a carry, not fixed here.
// v1.3.0 (06 Jul 2026): IMAGE_QUOTE MEDIA-PUBLISH PATH (LinkedIn) — cc-0028 image_quote-first v0.
//   Adds a real single-image media POST for image_quote drafts. mediaPublishSupported flipped
//   false→true at the guard call site, so the guard's forward-compat branch (guard.ts) may now
//   return { kind:'publish', method:'image' } for a generated image + url. The publish path is
//   fail-closed on a decision.method ALLOWLIST — supported methods are EXACTLY 'text' and 'image'
//   (resolveZapierAction, pure + unit-tested). method 'image' requires image_status==='generated'
//   AND a non-empty image_url or it BLOCKS (never text-fallback). Any other method (carousel /
//   video / unknown) BLOCKS via the shared terminal-block writer. For method 'image' the Zapier
//   body carries the SAME fields as text (text, title, client_name, post_draft_id, queue_id) PLUS
//   image_url mapped to the Zap single Media/Image URL field; the text-only body is byte-identical
//   to v1.2.0. dry_run reports the resolved method + whether an image_url would be sent, POSTs
//   nothing. guard.ts is byte-unchanged.
//   STRICTLY OUT OF SCOPE: carousel publishing (stays BLOCKED/held pending a separate Zapier
//   ordered-slide lane) — carousel GFCP NOT flipped; video publishing (stays hard-BLOCKED) — video
//   GFCP NOT flipped; the direct linkedin-publisher EF (B24/F06, repo-only); Zapier action
//   restructuring beyond the single image/media URL field; approval gate / platform-isolation skip /
//   seeding / throttle / empty_draft semantics (all byte-unchanged); dashboard; worker platform
//   filters (named carry); broad platform expansion.
// v1.2.0 (18 Jun 2026): INTERIM ASSETLESS-PUBLISH GUARD (LinkedIn) — F-PUBLISHER-ASSETGUARD-LINKEDIN.
//   Ports the proven FB interim asset guard. This Zapier bridge is TEXT-ONLY (the webhook
//   carries { text, title, ... } with no media fields), so a draft whose recommended_format
//   requires a rendered visual (image_quote/carousel/video) and whose asset is missing/
//   failed/pending was previously published as a TEXT-only post, silently losing the format.
//   Fix: classifyLinkedinFormat + decideLinkedinAssetGuard({ mediaPublishSupported: false })
//   after the approval gate. text→publish (existing Zapier POST unchanged); any non-text
//   format → BLOCK (queue status='skipped', last_error='asset_guard_blocked:<reason>',
//   m.post_publish status='failed' audit row, draft preserved, NO Zapier POST); never text-
//   fallback. Also adds a defensive platform-isolation skip (mirror YT v1.12.0 / IG v2.0.0):
//   a loaded draft whose platform != 'linkedin' is skipped (status='skipped',
//   last_error='platform_isolation_skip', lock cleared) — no stuck lock.
//   STRICTLY OUT OF SCOPE: no new LinkedIn media-publish path (image/carousel/video posting);
//   the existing approval gate + text Zapier POST path are byte-unchanged; no DB/schema/
//   migration; no throttle/schedule change; no T2 (no OCR/transcript/visual QA).
// v1.1.0 (T13, 1 May 2026): APPROVAL GATE added — mirror IG v2.0.0 per-row pattern.
//   v1.0.0 had NO approval gate (didn't even SELECT approval_status).
//   28+ unreviewed posts published in 14d before this patch (T16 audit window).
//   F-PUB-005-class fix. ChatGPT-reviewed in 4 rounds; cleared by round-4.
// v1.0.0 (12 Mar 2026): Temporary bridge — routes LinkedIn queue items to Zapier webhooks.
// Zapier posts to LinkedIn Company Pages using its own approved OAuth.
// Replace with direct linkedin-publisher when Community Management API is approved.
//
// page_access_token on c.client_publish_profile (linkedin) = Zapier webhook URL
// page_id = org URN (urn:li:organization:XXXXXXXXX)

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'content-type, apikey, authorization, x-publisher-key',
};

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
function nowIso() { return new Date().toISOString(); }
function getServiceClient() {
  const url = Deno.env.get('SUPABASE_URL');
  const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!url || !key) throw new Error('Missing Supabase credentials');
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: corsHeaders });
  if (req.method === 'GET') return jsonResponse({ ok: true, version: VERSION });

  const expectedKey = Deno.env.get('PUBLISHER_API_KEY');
  const providedKey = req.headers.get('x-publisher-key') ?? '';
  if (expectedKey && providedKey !== expectedKey) {
    return jsonResponse({ ok: false, error: 'Unauthorized' }, 401);
  }

  const supabase = getServiceClient();
  let body: any = {};
  try { body = await req.json(); } catch { /* empty body fine */ }

  const limit = Math.min(Math.max(Number(body.limit ?? 3), 1), 10);
  const workerId = `zapier-pub-${crypto.randomUUID().slice(0, 8)}`;
  const dryRun = Boolean(body.dry_run ?? false);

  // Step 1: Cross-post approved FB drafts into LinkedIn queue
  // (RPC disabled D154 18 Apr 2026 — returns no-op; native LinkedIn seeding via cron handles enqueue.)
  const { data: crossPostResult } = await supabase.rpc('crosspost_facebook_to_linkedin', {
    p_hours_lookback: 48,
    p_limit: 20,
  });
  console.log(`[zapier-pub] cross-post:`, JSON.stringify(crossPostResult));

  // Step 2: Lock LinkedIn queue items
  const { data: lockedRows, error: lockErr } = await supabase
    .schema('m')
    .rpc('publisher_lock_queue_v2', {
      p_limit: limit,
      p_worker_id: workerId,
      p_lock_seconds: 300,
      p_platform: 'linkedin',
    });

  if (lockErr) {
    return jsonResponse({ ok: false, error: 'lock_failed', detail: lockErr.message }, 500);
  }

  const rows = (lockedRows ?? []) as any[];
  if (!rows.length) {
    return jsonResponse({ ok: true, version: VERSION, message: 'no_linkedin_jobs', cross_post: crossPostResult });
  }

  const results: any[] = [];

  for (const q of rows) {
    const queueId = q.queue_id;
    const startMs = Date.now();

    try {
      // Load LinkedIn profile -- page_access_token = Zapier webhook URL
      const { data: prof } = await supabase
        .schema('c')
        .from('client_publish_profile')
        .select('page_access_token, page_id, page_name, publish_enabled')
        .eq('client_id', q.client_id)
        .eq('platform', 'linkedin')
        .eq('status', 'active')
        .limit(1)
        .maybeSingle();

      if (!prof) throw new Error('no_active_linkedin_profile');
      if (!prof.publish_enabled) throw new Error('publish_disabled');

      const zapierWebhookUrl = prof.page_access_token;
      const orgUrn = prof.page_id;

      if (!zapierWebhookUrl?.startsWith('https://hooks.zapier.com')) {
        throw new Error('invalid_zapier_webhook_url');
      }

      // Load draft
      // v1.1.0 (T13): added approval_status to SELECT for gate check below
      // v1.2.0: added platform + asset-status columns for the platform-isolation skip
      //         and the interim asset guard.
      const { data: draft } = await supabase
        .schema('m')
        .from('post_draft')
        .select('post_draft_id, draft_title, draft_body, approval_status, platform, recommended_format, image_status, image_url, video_status, video_url')
        .eq('post_draft_id', q.post_draft_id)
        .maybeSingle();

      if (!draft) throw new Error('post_draft_not_found');

      // v1.1.0 (T13): APPROVAL GATE (mirror IG v2.0.0 per-row pattern).
      // Publisher previously had no gate — F-PUB-005-class fix.
      // 28+ unreviewed posts published in 14d before this patch (T16 audit window).
      if (draft.approval_status !== 'approved') {
        await supabase.schema('m').from('post_publish_queue').update({
          status: 'queued',
          scheduled_for: new Date(Date.now() + 60 * 60_000).toISOString(),
          last_error: `not_approved:${draft.approval_status}`,
          locked_at: null, locked_by: null, updated_at: nowIso(),
        }).eq('queue_id', queueId);
        results.push({ queue_id: queueId, status: 'held', reason: 'not_approved', draft_status: draft.approval_status });
        continue;
      }

      // v1.2.0: DEFENSIVE PLATFORM-ISOLATION SKIP (mirror YT v1.12.0 / IG v2.0.0).
      // The queue is locked with p_platform:'linkedin', but defend in depth: never POST a
      // non-linkedin draft even if a future SELECT/code path lets one through. Skip the
      // row (no stuck lock), no Zapier POST.
      if (draft.platform !== 'linkedin') {
        console.error(`[zapier-pub] platform_isolation_skip post_draft_id=${q.post_draft_id} platform=${draft.platform}`);
        await supabase.schema('m').from('post_publish_queue').update({
          status: 'skipped',
          last_error: 'platform_isolation_skip',
          locked_at: null, locked_by: null, updated_at: nowIso(),
        }).eq('queue_id', queueId);
        results.push({ queue_id: queueId, status: 'skipped', reason: 'platform_isolation_skip', platform: draft.platform });
        continue;
      }

      // ══ ASSET-PUBLISH GUARD (v1.3.0 — cc-0028 image_quote media path) ═══════
      // mediaPublishSupported:true → the guard's forward-compat branch may return
      // publish:image for a generated image + url (guard.ts:72). text still → publish:text.
      // carousel/video/unknown still → block (guard.ts). The publish path below is
      // fail-closed on a decision.method allowlist (text + image only) via resolveZapierAction.
      const assetClass = classifyLinkedinFormat(draft.recommended_format);
      const decision = decideLinkedinAssetGuard({
        assetClass,
        image_status: draft.image_status, image_url: draft.image_url,
        video_status: draft.video_status, video_url: draft.video_url,
      }, { mediaPublishSupported: true });

      if (decision.kind === 'hold') {
        // retryable hold — requeue, no post_publish row, NO Zapier POST.
        // (not reachable this lane with mediaPublishSupported:false; kept for parity)
        await supabase.schema('m').from('post_publish_queue').update({
          status: 'queued',
          scheduled_for: new Date(Date.now() + decision.minutes * 60_000).toISOString(),
          last_error: decision.reason,
          locked_at: null, locked_by: null, updated_at: nowIso(),
        }).eq('queue_id', queueId);
        results.push({ queue_id: queueId, status: 'held', reason: decision.reason, asset_class: assetClass });
        continue;
      }
      // Shared terminal-block writer — used by BOTH the guard's kind:'block' path and
      // the resolveZapierAction fail-closed block path (identical records; no divergent logic).
      // queue → status='skipped', last_error='asset_guard_blocked:<reason>';
      // m.post_publish → status='failed', request_payload { asset_guard:true, reason, asset_class }.
      const writeTerminalBlock = async (reason: string) => {
        await supabase.schema('m').from('post_publish_queue').update({
          status: 'skipped',
          last_error: `asset_guard_blocked:${reason}`,
          locked_at: null, locked_by: null, updated_at: nowIso(),
        }).eq('queue_id', queueId);
        // v1.4.0 (cc-0029): pick the next free attempt_no for this draft so the failed-audit row
        // never collides with a prior/cross-posted platform's row on uq_publish_attempt
        // (post_draft_id, attempt_no). No post was sent on this path, so there is no duplicate risk.
        let nextAttemptNo = 1;
        try {
          const { data: priorRows } = await supabase.schema('m').from('post_publish')
            .select('attempt_no').eq('post_draft_id', q.post_draft_id)
            .order('attempt_no', { ascending: false }).limit(1);
          nextAttemptNo = nextAttemptNoFrom(priorRows);
        } catch (_) { nextAttemptNo = 1; }
        const { error: insertErr } = await supabase.schema('m').from('post_publish').insert({
          queue_id: queueId,
          post_draft_id: q.post_draft_id,
          client_id: q.client_id,
          platform: 'linkedin',
          destination_id: orgUrn,
          status: 'failed',
          attempt_no: nextAttemptNo,
          platform_post_id: null,
          request_payload: { asset_guard: true, reason, asset_class: assetClass },
          response_payload: null,
          error: `asset_guard_blocked:${reason}`,
          created_at: nowIso(),
        });
        if (insertErr) {
          // v1.4.0: do NOT swallow — surface so a residual audit miss is discoverable. No post was
          // sent, so no re-fire risk; the queue is already 'skipped'.
          console.error('[zapier-pub] post_publish INSERT failed:', insertErr.message);
        }
        results.push({ queue_id: queueId, status: 'blocked', reason, asset_class: assetClass, attempt_no: nextAttemptNo, audit_row_inserted: !insertErr });
      };

      if (decision.kind === 'block') {
        // terminal, reviewable block — no Zapier POST, draft preserved, reason recorded.
        await writeTerminalBlock(decision.reason);
        continue;
      }

      // decision.kind === 'publish' → resolve the concrete Zapier action on a fail-closed
      // method allowlist (text + image only). A method-level block writes the SAME terminal
      // records as the guard block above (never a text-only fallback for an image_quote draft).
      const action = resolveZapierAction(decision, {
        image_status: draft.image_status, image_url: draft.image_url,
      });
      if (action.action === 'block') {
        await writeTerminalBlock(action.reason);
        continue;
      }
      // action.action === 'post' → method is 'text' or 'image'; fall through to the
      // empty_draft check + text build + Zapier POST (image_url added when includeImage).
      // ══ END ASSET-PUBLISH GUARD ═════════════════════════════════════════════

      const imageUrl = action.includeImage ? (draft.image_url ?? '').trim() : '';

      const title = (draft.draft_title ?? '').trim();
      const draftBody = (draft.draft_body ?? '').trim();
      if (!title && !draftBody) throw new Error('empty_draft');

      const text = `${title}${title && draftBody ? '\n\n' : ''}${draftBody}`.trim().slice(0, 3000);

      if (dryRun) {
        // v1.3.0: report the resolved method + whether an image_url would be sent; POST nothing.
        await supabase.schema('m').from('post_publish_queue').update({
          status: 'queued',
          scheduled_for: new Date(Date.now() + 60 * 60_000).toISOString(),
          last_error: 'dry_run_ok',
          locked_at: null, locked_by: null, updated_at: nowIso(),
        }).eq('queue_id', queueId);
        results.push({
          queue_id: queueId, status: 'dry_run_ok', text_length: text.length,
          method: action.method, would_send_image: action.includeImage,
        });
        continue;
      }

      // POST to Zapier webhook.
      // v1.3.0: text-only body is byte-identical to v1.2.0 (text, title, client_name,
      // post_draft_id, queue_id). method 'image' adds image_url (single Zap Media/Image URL field).
      const zapBody: Record<string, unknown> = {
        text,
        title,
        client_name: prof.page_name,
        post_draft_id: q.post_draft_id,
        queue_id: queueId,
      };
      if (action.includeImage) zapBody.image_url = imageUrl;
      const zapResp = await fetch(zapierWebhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(zapBody),
      });

      const zapText = await zapResp.text();
      if (!zapResp.ok) throw new Error(`zapier_${zapResp.status}: ${zapText.slice(0, 400)}`);

      const durationMs = Date.now() - startMs;
      const platformPostId = `zapier-li-${Date.now()}`;

      // v1.4.0 (cc-0029, F-YT-PUB-PUBLISH-AUDIT-GAP mirror): pick the next free attempt_no for this
      // draft so the published audit row does not collide with a prior/cross-posted platform's row
      // on uq_publish_attempt (post_draft_id, attempt_no) — the old hardcoded default of 1 was
      // rejected and the audit row was silently lost (cc-0028 proof).
      let nextAttemptNo = 1;
      try {
        const { data: priorRows } = await supabase.schema('m').from('post_publish')
          .select('attempt_no').eq('post_draft_id', q.post_draft_id)
          .order('attempt_no', { ascending: false }).limit(1);
        nextAttemptNo = nextAttemptNoFrom(priorRows);
      } catch (_) { nextAttemptNo = 1; }

      // Write post_publish record
      const { error: insertErr } = await supabase.schema('m').from('post_publish').insert({
        queue_id: queueId,
        post_draft_id: q.post_draft_id,
        client_id: q.client_id,
        platform: 'linkedin',
        destination_id: orgUrn,
        status: 'published',
        attempt_no: nextAttemptNo,
        platform_post_id: platformPostId,
        published_at: nowIso(),
        request_payload: { webhook_prefix: zapierWebhookUrl.slice(0, 60), text_length: text.length, method: action.method, image_sent: action.includeImage },
        response_payload: { zapier_response: zapText.slice(0, 200), duration_ms: durationMs },
        error: null,
        created_at: nowIso(),
      });
      if (insertErr) {
        // v1.4.0: PUBLISHED PATH — the Zapier POST already fired (the post is LIVE on LinkedIn), so
        // NEVER throw here: a throw would route to catch → requeue → RE-FIRE → duplicate post.
        // Log + surface audit_row_inserted:false so the residual audit miss is discoverable and
        // backfillable, and still mark the queue 'published' below (the post exists).
        console.error('[zapier-pub] post_publish INSERT failed:', insertErr.message);
      }

      // Update queue — post is live regardless of the audit insert outcome (never re-send).
      await supabase.schema('m').from('post_publish_queue').update({
        status: 'published',
        last_error: null,
        locked_at: null, locked_by: null, updated_at: nowIso(),
      }).eq('queue_id', queueId);

      results.push({
        queue_id: queueId,
        post_draft_id: q.post_draft_id,
        status: 'published',
        platform_post_id: platformPostId,
        client: prof.page_name,
        duration_ms: durationMs,
        attempt_no: nextAttemptNo,
        audit_row_inserted: !insertErr,
      });

      console.log(`[zapier-pub] ${VERSION} → ${prof.page_name} in ${durationMs}ms`);

    } catch (e: any) {
      const errMsg = (e?.message ?? String(e)).slice(0, 2000);
      console.error(`[zapier-pub] failed ${queueId}:`, errMsg);
      await supabase.schema('m').from('post_publish_queue').update({
        status: 'queued',
        scheduled_for: new Date(Date.now() + 15 * 60_000).toISOString(),
        last_error: errMsg,
        locked_at: null, locked_by: null, updated_at: nowIso(),
      }).eq('queue_id', queueId);
      results.push({ queue_id: queueId, status: 'failed', error: errMsg });
    }
  }

  return jsonResponse({
    ok: true, version: VERSION, worker_id: workerId,
    cross_post: crossPostResult,
    locked: rows.length, processed: results.length, results,
  });
});
