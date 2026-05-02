-- Audit: m.post_render_log column purposes (single-table brief).
-- Brief: docs/briefs/post-render-log-column-purposes.md
-- Pre-flight (live, 2026-05-02T10:20Z): 16 undocumented column rows on
--   m.post_render_log (column_id 824257..824272). Production population:
--   932 rows, status 896 succeeded / 36 failed, render_engine 100%
--   'creatomate', attempt_number 100% =1, render_spec NULL on every row,
--   credits_used NULL on every row.
--
-- Producer code authoritative source: supabase/functions/image-worker/index.ts
--   v3.9.2 (renderUploadAndLog → public.write_render_log RPC). The RPC body
--   is a straight INSERT into m.post_render_log of its 13 parameters
--   (no defaulting beyond column defaults). image-worker constructs the
--   Creatomate payload via build{ImageQuote|AnimatedTextReveal|AnimatedData
--   |CarouselSlide}Script() but always passes p_render_spec=null to the
--   RPC, so render_spec is currently never populated.
--
-- Confidence per the brief's strict JSONB rule and producer-code citation
-- gate:
--   * 15/16 HIGH — all non-JSONB columns trace cleanly to image-worker
--     parameter sites + table_purpose enumeration + production samples.
--   * 1/16 LOW  — render_spec. The producer (image-worker) currently
--     passes p_render_spec=null on every call (success and failure
--     paths), so the JSONB schema is NOT constructed by an Edge Function
--     source line that writes the column. Column-level schema is therefore
--     undefined in code today; deferred to the followup file at
--     docs/audit/decisions/post_render_log_low_confidence_followup.md
--     for joint chat+CC resolution alongside any future image-worker
--     change that starts populating render_spec.
--
-- Total: expected_delta = 15 (= 16 HIGH+LOW − 1 LOW deferred).
--
-- Verification (Lesson #38): single atomic DO block captures pre_count
-- of NULL/empty/PENDING/TODO column_purpose rows for m.post_render_log,
-- runs 15 UPDATEs, captures post_count, asserts pre_count - post_count = 15
-- (expected post_count = 1 — render_spec retained NULL).
--
-- Status enum reconciliation (default-and-continue per D182): the brief
-- carried "pending | rendering | succeeded | failed" from the
-- table_purpose. image-worker's actual write set is
-- {succeeded, failed, timeout}; column default 'submitted' is never
-- written by code. Column purpose documents the observed/code-cited
-- values rather than the table_purpose verbatim list.

DO $audit_post_render_log$
DECLARE
  expected_delta CONSTANT integer := 15;
  pre_count integer;
  post_count integer;
BEGIN

SELECT COUNT(*)::int INTO pre_count
FROM k.column_registry cr
JOIN k.table_registry tr ON tr.table_id = cr.table_id
WHERE tr.schema_name = 'm'
  AND tr.table_name = 'post_render_log'
  AND (cr.column_purpose IS NULL
       OR cr.column_purpose = ''
       OR cr.column_purpose = 'PENDING_DOCUMENTATION'
       OR cr.column_purpose ILIKE 'TODO%');

-- ── m.post_render_log (15 HIGH; 1 LOW deferred — render_spec) ──────────────────
-- Producer: supabase/functions/image-worker/index.ts v3.9.2
-- (renderUploadAndLog calls supabase.rpc('write_render_log', {...}); the
-- RPC INSERTs into m.post_render_log).

UPDATE k.column_registry SET column_purpose = $cp$Surrogate UUID primary key for the render attempt row (default gen_random_uuid()).$cp$, updated_at = NOW() WHERE column_id = 824272;

UPDATE k.column_registry SET column_purpose = $cp$Draft this render attempt was for (FK m.post_draft.post_draft_id). Set by image-worker on every render call across image_quote, animated_text_reveal, animated_data, carousel slides, and image_quote_video_fallback paths.$cp$, updated_at = NOW() WHERE column_id = 824271;

UPDATE k.column_registry SET column_purpose = $cp$Carousel slide this render attempt produced (FK m.post_carousel_slide.slide_id). NULL for single-image formats; set per-slide for carousel renders — image-worker passes p_slide_id=null on image_quote / animated_text_reveal / animated_data / image_quote_video_fallback and passes the slide_id resolved from m.post_carousel_slide on each carousel slide render.$cp$, updated_at = NOW() WHERE column_id = 824270;

UPDATE k.column_registry SET column_purpose = $cp$Client tenant this render attempt belongs to (matches c.client.client_id; no DB-level FK constraint). Resolved by image-worker via resolveClientId() — uses the direct value on the draft if present, otherwise looks it up via m.post_draft → m.digest_item → m.digest_run.client_id. NULL only on the legacy rows where resolveClientId returned null and the row was logged anyway (3 rows of 932 in production).$cp$, updated_at = NOW() WHERE column_id = 824269;

UPDATE k.column_registry SET column_purpose = $cp$ICE content format key this render produced (FK t."5.3_content_format".ice_format_key). Image-worker writes these values: image_quote, animated_text_reveal, animated_data, carousel, image_quote_video_fallback (rendered when video_generation_enabled=false on a video-format draft). Selects which build*Script() function constructed the Creatomate payload.$cp$, updated_at = NOW() WHERE column_id = 824268;

UPDATE k.column_registry SET column_purpose = $cp$Render engine the call targeted. Default 'creatomate' — the only value image-worker writes today (hard-coded p_render_engine='creatomate' in renderUploadAndLog). Reserved as a discriminator for future engines (e.g. heygen-driven video paths if they migrate onto this table); production sample is 100% 'creatomate' across 932 rows.$cp$, updated_at = NOW() WHERE column_id = 824267;

UPDATE k.column_registry SET column_purpose = $cp$Render identifier returned by Creatomate's POST /v2/renders endpoint (sub.id in image-worker renderUploadAndLog). Used to poll the render outcome via GET /v2/renders/{id} (pollRender, POLL_INTERVAL_MS=1500, POLL_MAX_ATTEMPTS=30). NULL only if the Creatomate submit call itself failed before Creatomate assigned an id.$cp$, updated_at = NOW() WHERE column_id = 824266;

UPDATE k.column_registry SET column_purpose = $cp$Terminal render lifecycle state written by image-worker. Observed/code-cited values: succeeded (Creatomate render completed and the asset was copied to Supabase Storage), failed (any exception during submit / poll / Storage upload — error_message is set), timeout (pollRender exhausted POLL_MAX_ATTEMPTS=30 at 1.5s intervals before Creatomate returned a terminal state). Column default 'submitted' is never written by image-worker today; production sample is 896 succeeded + 36 failed across 932 rows. Used as the failure-rate signal in the cron-health snapshot and the diagnostic dashboards per table_purpose.$cp$, updated_at = NOW() WHERE column_id = 824265;

UPDATE k.column_registry SET column_purpose = $cp$Creatomate-hosted render URL returned by GET /v2/renders/{id} when data.status='succeeded' (data.url in pollRender). image-worker fetches this URL once to download the rendered asset, then uploads it to Supabase Storage. NULL on failed/timeout rows; populated on all 896 succeeded rows in production.$cp$, updated_at = NOW() WHERE column_id = 824264;

UPDATE k.column_registry SET column_purpose = $cp$Public Supabase Storage URL of the rendered asset after image-worker copies it from output_url into the post-images bucket. Path pattern: {client_slug}/{post_draft_id}.png|gif for single-image formats, {client_slug}/{post_draft_id}/slide_{slideIndex}.png for carousel slides. This is the URL the publishers consume (image_url on m.post_draft / m.post_carousel_slide is sourced from here). NULL on failed/timeout rows.$cp$, updated_at = NOW() WHERE column_id = 824263;

UPDATE k.column_registry SET column_purpose = $cp$Creatomate credits billed for this render, sourced from the GET /v2/renders/{id} response's data.credits field (pollRender returns Number(data.credits) when present, else null). NULL on non-succeeded rows or whenever Creatomate's response omits the field; production sample is credits_used=NULL on all 932 rows because the current Creatomate v2/renders response shape does not return credits to image-worker. Reserved as the cost-monitoring axis per table_purpose for when Creatomate's response or image-worker's parsing changes.$cp$, updated_at = NOW() WHERE column_id = 824262;

UPDATE k.column_registry SET column_purpose = $cp$Wall-clock duration of the render attempt in milliseconds (Date.now() - startMs in image-worker, measured from POST /v2/renders submit through the final pollRender result, including the Storage upload on the success path). Captures total Creatomate-side latency for the render-debugging axis named in table_purpose. Set on both succeeded and failed/timeout rows.$cp$, updated_at = NOW() WHERE column_id = 824261;

UPDATE k.column_registry SET column_purpose = $cp$Retry counter for this render attempt of the (post_draft_id, slide_id) pair. Default 1; image-worker never increments it today (renderUploadAndLog has no retry loop and never overrides the default), so production is 100% attempt_number=1 across 932 rows. Reserved for future retry/backoff logic that re-renders failed/timeout rows; the brief flagged this column as the natural retry signal alongside ON CONFLICT semantics.$cp$, updated_at = NOW() WHERE column_id = 824260;

UPDATE k.column_registry SET column_purpose = $cp$Failure cause captured when status='failed' or 'timeout'. image-worker truncates the exception message to 500 chars before writing (errMsg = (e?.message ?? String(e)).slice(0, 500)). NULL on succeeded rows; populated on all 36 failed rows in production. Free-form text — not parsed downstream, intended for render-debugging eyeballs per table_purpose.$cp$, updated_at = NOW() WHERE column_id = 824259;

-- column_id 824258 (render_spec, jsonb) — LOW-confidence, deferred.
-- See docs/audit/decisions/post_render_log_low_confidence_followup.md.

UPDATE k.column_registry SET column_purpose = $cp$Row creation timestamp (default now()). Effectively the render-attempt start time — image-worker calls write_render_log inside the renderUploadAndLog success/failure branches once polling completes, so the lag between Creatomate-submit and this timestamp is bounded by render_duration_ms. Used as the canonical time axis for cost/throughput dashboards on this table.$cp$, updated_at = NOW() WHERE column_id = 824257;

-- ── Atomic count-delta verification (Lesson #38) ─────────────────────────────
SELECT COUNT(*)::int INTO post_count
FROM k.column_registry cr
JOIN k.table_registry tr ON tr.table_id = cr.table_id
WHERE tr.schema_name = 'm'
  AND tr.table_name = 'post_render_log'
  AND (cr.column_purpose IS NULL
       OR cr.column_purpose = ''
       OR cr.column_purpose = 'PENDING_DOCUMENTATION'
       OR cr.column_purpose ILIKE 'TODO%');

IF pre_count - post_count <> expected_delta THEN
  RAISE EXCEPTION 'post_render_log column-purpose verification failed: expected delta %, got % (pre=%, post=%). Expected post=1 (the single LOW-confidence render_spec row retained NULL).',
    expected_delta, pre_count - post_count, pre_count, post_count;
END IF;

IF post_count <> 1 THEN
  RAISE EXCEPTION 'post_render_log column-purpose verification failed: expected post_count=1 (render_spec deferred LOW), got post_count=% (pre=%).',
    post_count, pre_count;
END IF;

RAISE NOTICE 'post_render_log column-purpose verification passed: delta % (pre=%, post=%, 1 LOW-confidence row deferred — render_spec, JSONB schema not yet constructed by any producer because image-worker passes p_render_spec=null).',
  pre_count - post_count, pre_count, post_count;

END;
$audit_post_render_log$;
