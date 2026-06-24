-- 20260624040000_intent_detail_queue_eta_fields.sql
-- Operator Visibility v1 · Lane 2 — Idea Detail publish-ETA fields.
--
-- ADDITIVE, READ-ONLY. Extends public.get_creative_intent_detail so each child
-- output also carries the QUEUE'S authoritative publish fields:
--   * scheduled_for   (the eligible publish time — differs from slot.scheduled_publish_at)
--   * publish_origin  (feed | studio … — surfaced for the operator, not interpreted here)
--   * last_error      (throttle/cadence reason when present)
--
-- Same signature, same return shape (3 extra keys per child), STABLE SECURITY
-- DEFINER + search_path UNCHANGED. The queue is ALREADY LATERAL-joined; this only
-- selects 3 more columns from that existing subquery and adds 3 jsonb keys. No new
-- table/join, no DML, no grant change, no publishing-policy change. Pure read.
-- Migration name = permanent identity (new sequential timestamp).

CREATE OR REPLACE FUNCTION public.get_creative_intent_detail(p_intent_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'm', 'c', 'public'
AS $function$
DECLARE
  v_intent  jsonb;
  v_children jsonb;
BEGIN
  SELECT to_jsonb(ci) INTO v_intent FROM m.creative_intent ci WHERE ci.intent_id = p_intent_id;
  IF v_intent IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'intent_not_found');
  END IF;

  SELECT COALESCE(jsonb_agg(child ORDER BY child->>'scheduled_publish_at'), '[]'::jsonb)
    INTO v_children
  FROM (
    SELECT jsonb_build_object(
      'slot_id', s.slot_id,
      'platform', s.platform,
      'slot_status', s.status,
      'scheduled_publish_at', s.scheduled_publish_at,
      'format_chosen', s.format_chosen,
      'slot_confidence', s.slot_confidence,
      'skip_reason', s.skip_reason,
      'selected_canonical_ids_count', COALESCE(array_length(s.canonical_ids, 1), 0),
      'draft_id', d.post_draft_id,
      'draft_intent_id', d.intent_id,
      'approval_status', d.approval_status,
      'recommended_format', d.recommended_format,
      'image_status', d.image_status,
      'video_status', d.video_status,
      'queue_status', q.status,
      'scheduled_for', q.scheduled_for,
      'publish_origin', q.publish_origin,
      'last_error', q.last_error,
      'publish_status', pub.status,
      'platform_post_id', pub.platform_post_id,
      'published_at', pub.published_at
    ) AS child
    FROM m.slot s
    LEFT JOIN m.post_draft d ON d.slot_id = s.slot_id
    LEFT JOIN LATERAL (
      SELECT status, scheduled_for, publish_origin, last_error FROM m.post_publish_queue qq
      WHERE qq.post_draft_id = d.post_draft_id ORDER BY qq.created_at DESC LIMIT 1
    ) q ON true
    LEFT JOIN LATERAL (
      SELECT status, platform_post_id, published_at FROM m.post_publish pp
      WHERE pp.post_draft_id = d.post_draft_id ORDER BY pp.created_at DESC LIMIT 1
    ) pub ON true
    WHERE s.intent_id = p_intent_id
  ) z;

  RETURN jsonb_build_object('ok', true, 'intent', v_intent, 'children', v_children);
END;
$function$;
