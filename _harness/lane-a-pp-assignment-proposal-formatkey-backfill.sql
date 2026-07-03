-- Lane A — PP Assignment Proposal + format_key Backfill — EXACT APPLY SQL v1 (2026-07-03)
-- Packet: docs/briefs/template-selection-v0-lane-a-packet.md
-- Design authority: docs/briefs/template-selection-v0-design-packet.md (PK Gate 1 approved 2026-07-03).
-- ⛔ DO NOT APPLY until PK approves the reviewed packet + this file's exact hash.
-- Data-only DML (no DDL): (A) 16-row format_key backfill on c.creative_template_variant_candidate,
-- (B) 16 NOT-EXISTS-guarded 'proposed' PP rows into c.creative_template_client_assignment.
-- Single DO block = single transaction; exact row-count assertions abort the whole apply on mismatch.
-- NOTHING becomes selectable: rows land as assignment_status='proposed' (approved_by NULL) and
-- zero visual_approval proofs exist — the Gate-1 ladder keeps the selectable set EMPTY.
-- Accidental re-run = clean abort (step A matches 0 rows once applied → assertion raises).

DO $$
DECLARE
  n integer;
BEGIN
  -- ── A. format_key backfill — the format→template bridge (PK-approved values, packet §5) ──
  UPDATE c.creative_template_variant_candidate v
  SET format_key = m.fk,
      updated_at = now()
  FROM (VALUES
    ('market_update.v1',    'image_quote'),        -- 4 templates share this variant_key
    ('announcement.v1',     'image_quote'),
    ('quote_card.v1',       'image_quote'),
    ('stat_card.v1',        'image_quote'),
    ('educational.v1',      'image_quote'),
    ('comparison.v1',       'image_quote'),
    ('testimonial.v1',      'image_quote'),
    ('news_summary.v1',     'image_quote'),
    ('carousel_cover.v1',   'carousel'),
    ('carousel_body.v1',    'carousel'),
    ('carousel_closing.v1', 'carousel'),
    ('thumbnail.v1',        'youtube_thumbnail'),
    ('story_static.v1',     'story_image')
  ) AS m(vk, fk)
  WHERE v.variant_key = m.vk
    AND v.format_key IS NULL;   -- pre-state verified: format_key NULL on ALL 16 rows (2026-07-03)
  GET DIAGNOSTICS n = ROW_COUNT;
  IF n <> 16 THEN
    RAISE EXCEPTION 'format_key backfill updated % rows, expected exactly 16 — aborting', n;
  END IF;

  -- ── B. PP proposed assignments (L2 of the Gate-1 ladder) ─────────────────────────────────
  -- Eligibility evidence (recorded in packet §4): all 16 generic smoke_rendered templates
  -- returned resolve_slot_assets status='ok' for property-pulse on 2026-07-03.
  -- NOT EXISTS guard is mandatory: the table has NO unique constraint on (template_id, client_id).
  INSERT INTO c.creative_template_client_assignment
    (template_id, client_id, assignment_scope, assignment_status)
  SELECT t.id,
         '4036a6b5-b4a3-406e-998d-c2fe14a8bbdd'::uuid,   -- property-pulse (c.client.client_id)
         'generic_allowed',
         'proposed'
  FROM c.creative_provider_template t
  WHERE t.scope = 'generic'
    AND t.status = 'smoke_rendered'
    AND NOT EXISTS (
      SELECT 1 FROM c.creative_template_client_assignment a
      WHERE a.template_id = t.id
        AND a.client_id = '4036a6b5-b4a3-406e-998d-c2fe14a8bbdd'::uuid
    );
  GET DIAGNOSTICS n = ROW_COUNT;
  IF n <> 16 THEN
    RAISE EXCEPTION 'assignment INSERT created % rows, expected exactly 16 — aborting', n;
  END IF;
END
$$;

-- ============================================================================
-- ROLLBACK (reference only — run only if reversal required):
--
-- -- B: remove the proposed PP rows (pre-state: table had 0 rows TOTAL, verified 2026-07-03;
-- --    guard on proposed+unapproved keeps any future PK-approved rows safe). Expect 16.
-- DELETE FROM c.creative_template_client_assignment
-- WHERE client_id = '4036a6b5-b4a3-406e-998d-c2fe14a8bbdd'
--   AND assignment_status = 'proposed'
--   AND approved_by IS NULL;
--
-- -- A: restore format_key to the verified pre-state (NULL on all 16). Expect 16.
-- UPDATE c.creative_template_variant_candidate
-- SET format_key = NULL, updated_at = now()
-- WHERE format_key IN ('image_quote','carousel','youtube_thumbnail','story_image');
-- ============================================================================
