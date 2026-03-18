-- ============================================================
-- VISUAL PIPELINE SCHEMA MIGRATION
-- Date: 19 March 2026
-- Decisions: D027, D028, D029
-- Applied: 19 March 2026 via Supabase MCP
-- ============================================================

-- ------------------------------------------------------------
-- 1. c.client_brand_profile — visual identity fields
-- ------------------------------------------------------------

ALTER TABLE c.client_brand_profile
  ADD COLUMN IF NOT EXISTS brand_colour_primary    text,
  ADD COLUMN IF NOT EXISTS brand_colour_secondary  text,
  ADD COLUMN IF NOT EXISTS brand_logo_url          text,
  ADD COLUMN IF NOT EXISTS image_style             text NOT NULL DEFAULT 'quote_card',
  ADD COLUMN IF NOT EXISTS persona_type            text NOT NULL DEFAULT 'voiceover_only',
  ADD COLUMN IF NOT EXISTS persona_avatar_id       text,
  ADD COLUMN IF NOT EXISTS persona_dialogue_mode   boolean NOT NULL DEFAULT false;

ALTER TABLE c.client_brand_profile
  ADD CONSTRAINT chk_image_style CHECK (
    image_style IN ('quote_card','carousel','news_card','series_card','image_ai')
  );

ALTER TABLE c.client_brand_profile
  ADD CONSTRAINT chk_persona_type CHECK (
    persona_type IN ('custom_avatar','stock_avatar','cartoon','voiceover_only')
  );

-- ------------------------------------------------------------
-- 2. c.client_publish_profile — generation flags + format prefs
-- ------------------------------------------------------------

ALTER TABLE c.client_publish_profile
  ADD COLUMN IF NOT EXISTS image_generation_enabled   boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS video_generation_enabled   boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS preferred_format_facebook  text,
  ADD COLUMN IF NOT EXISTS preferred_format_linkedin  text,
  ADD COLUMN IF NOT EXISTS preferred_format_instagram text;

ALTER TABLE c.client_publish_profile
  ADD CONSTRAINT chk_preferred_format_facebook CHECK (
    preferred_format_facebook IS NULL OR preferred_format_facebook IN
    ('text','image_quote','carousel','image_ai','video_slideshow','video_avatar','video_voiceover')
  ),
  ADD CONSTRAINT chk_preferred_format_linkedin CHECK (
    preferred_format_linkedin IS NULL OR preferred_format_linkedin IN
    ('text','image_quote','carousel','image_ai','video_slideshow','video_avatar','video_voiceover')
  ),
  ADD CONSTRAINT chk_preferred_format_instagram CHECK (
    preferred_format_instagram IS NULL OR preferred_format_instagram IN
    ('text','image_quote','carousel','image_ai','video_slideshow','video_avatar','video_voiceover')
  );

-- ------------------------------------------------------------
-- 3. m.post_draft — visual generation fields
-- ------------------------------------------------------------

ALTER TABLE m.post_draft
  ADD COLUMN IF NOT EXISTS recommended_format  text,
  ADD COLUMN IF NOT EXISTS recommended_reason  text,
  ADD COLUMN IF NOT EXISTS image_headline      text,
  ADD COLUMN IF NOT EXISTS image_url           text,
  ADD COLUMN IF NOT EXISTS image_status        text NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS carousel_slides     jsonb;

ALTER TABLE m.post_draft
  ADD CONSTRAINT chk_recommended_format CHECK (
    recommended_format IS NULL OR recommended_format IN
    ('text','image_quote','carousel','image_ai','video_slideshow','video_avatar','video_voiceover')
  );

ALTER TABLE m.post_draft
  ADD CONSTRAINT chk_image_status CHECK (
    image_status IN ('pending','generated','failed','skipped')
  );

-- Index for image-worker polling
CREATE INDEX IF NOT EXISTS idx_post_draft_image_worker
  ON m.post_draft (approval_status, image_status, recommended_format)
  WHERE approval_status = 'approved'
    AND image_status = 'pending'
    AND recommended_format IN ('image_quote','carousel');

-- ------------------------------------------------------------
-- 4. Seed data — applied 19 March 2026
-- NDIS Yarns: colours from Primary Colors.txt
-- Property Pulse: placeholders until assets confirmed
-- ------------------------------------------------------------

-- NDIS Yarns brand identity
-- brand_logo_url: NULL — set after NDIS-Yarns Logo.png uploaded to Storage
UPDATE c.client_brand_profile
SET
  brand_colour_primary   = '#0A2A4A',
  brand_colour_secondary = '#1C8A8A',
  brand_logo_url         = NULL,
  image_style            = 'quote_card',
  persona_type           = 'voiceover_only',
  updated_at             = now()
WHERE client_id = 'fb98a472-ae4d-432d-8738-2273231c1ef4';

-- Property Pulse brand identity (placeholders)
UPDATE c.client_brand_profile
SET
  brand_colour_primary   = '#1A1A2E',
  brand_colour_secondary = '#E8B84B',
  brand_logo_url         = NULL,
  image_style            = 'quote_card',
  persona_type           = 'voiceover_only',
  updated_at             = now()
WHERE client_id = '4036a6b5-b4a3-406e-998d-c2fe14a8bbdd';

-- Enable image generation for NDIS Yarns Facebook
UPDATE c.client_publish_profile
SET
  image_generation_enabled  = true,
  preferred_format_facebook = 'image_quote',
  updated_at                = now()
WHERE client_id = 'fb98a472-ae4d-432d-8738-2273231c1ef4'
  AND platform = 'facebook';
