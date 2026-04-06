-- ICE — Audience Asset Schema Migration
-- Action: D3 from April 2026 session action register
-- Purpose: Track audience assets built by ICE publishing activity
--          Foundation for IAE activation when prerequisites are met
--
-- Run via: Supabase MCP apply_migration or SQL editor
-- Schema pattern: configuration in c, facts in m, intelligence in k views
-- Docs: docs/iae/01_iae_prerequisites.md, docs/quality/00_session_action_register.md

-- ============================================================
-- PART 1: c.client_audience_policy
-- Operator's decision about what audiences to build per client
-- Configuration: set at onboarding, changed deliberately
-- ============================================================

CREATE TABLE IF NOT EXISTS c.client_audience_policy (
  id                       uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id                uuid NOT NULL REFERENCES c.client(id) ON DELETE CASCADE,
  platforms_enabled        text[] NOT NULL DEFAULT ARRAY['meta'],
  -- ['meta', 'linkedin', 'google'] — which platforms to build audiences on
  audience_types_enabled   text[] NOT NULL DEFAULT ARRAY['page_engagers', 'video_viewers', 'website_visitors', 'email_list'],
  -- page_engagers | video_viewers | post_savers | website_visitors | email_list | lookalike
  min_boost_audience_size  integer NOT NULL DEFAULT 500,
  -- Do not activate IAE boost until Custom Audience reaches this size
  email_capture_enabled    boolean NOT NULL DEFAULT false,
  -- Confirmed email capture mechanism exists on client website
  lookalike_auto_create    boolean NOT NULL DEFAULT false,
  -- Auto-create lookalike when seed audience hits threshold
  meta_pixel_id            text,
  -- Client's Meta Pixel ID (from Events Manager)
  ga4_measurement_id       text,
  -- Client's GA4 Measurement ID (format: G-XXXXXXXXXX)
  email_platform           text,
  -- 'mailchimp' | 'klaviyo' | 'activecampaign' | 'other'
  email_list_size          integer,
  -- Current email list size — updated monthly
  notes                    text,
  created_at               timestamptz NOT NULL DEFAULT now(),
  updated_at               timestamptz NOT NULL DEFAULT now(),
  UNIQUE(client_id)        -- One policy per client
);

COMMENT ON TABLE c.client_audience_policy IS
  'Per-client audience building configuration. Governs what audiences ICE builds and when IAE can activate. One row per client.';

COMMENT ON COLUMN c.client_audience_policy.platforms_enabled IS
  'Which ad platforms to build audiences on. Start with meta only. Add linkedin and google when IAE expands.';

COMMENT ON COLUMN c.client_audience_policy.min_boost_audience_size IS
  'IAE will not fire a boost until the Custom Audience pool reaches this size. Prevents cold-audience boosting.';

-- RLS: service role only (operator-managed, not client-facing via portal)
ALTER TABLE c.client_audience_policy ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service_role_only" ON c.client_audience_policy
  USING (auth.role() = 'service_role');

-- ============================================================
-- PART 2: m.audience_asset
-- Fact table: what audiences have been built by ICE activity
-- Created by pipeline, never manually inserted
-- ============================================================

CREATE TABLE IF NOT EXISTS m.audience_asset (
  id                       uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id                uuid NOT NULL REFERENCES c.client(id) ON DELETE CASCADE,
  platform                 text NOT NULL CHECK (platform IN ('meta', 'linkedin', 'google')),
  audience_type            text NOT NULL CHECK (audience_type IN (
                             'page_engagers',
                             'video_viewers',
                             'post_savers',
                             'website_visitors',
                             'email_list',
                             'lookalike'
                           )),
  seed_audience_id         uuid REFERENCES m.audience_asset(id),
  -- For lookalike audiences: which audience seeded this one (self-referential)
  -- NULL for all non-lookalike types
  size                     integer,
  -- Current member count. Updated by insights-worker weekly.
  min_viable_size          integer NOT NULL DEFAULT 500,
  -- Minimum size before this audience is usable for IAE activation
  platform_audience_id     text,
  -- The ID assigned by Meta/LinkedIn/Google to this audience
  boost_eligible           boolean NOT NULL DEFAULT false,
  -- True when size >= min_viable_size and audience_type is activated in policy
  status                   text NOT NULL DEFAULT 'building'
                           CHECK (status IN ('building', 'active', 'insufficient', 'archived')),
  -- building: not yet at min_viable_size
  -- active: viable, boost_eligible = true
  -- insufficient: was active but shrank below threshold
  -- archived: no longer tracking
  last_refreshed_at        timestamptz,
  -- When size was last read from platform API
  created_at               timestamptz NOT NULL DEFAULT now(),
  updated_at               timestamptz NOT NULL DEFAULT now(),
  UNIQUE(client_id, platform, audience_type)
  -- One row per client per platform per audience type
  -- Lookalikes can have multiple (handle via seed_audience_id distinction if needed)
);

COMMENT ON TABLE m.audience_asset IS
  'Audience assets built by ICE publishing activity. One row per client per platform per audience type. '
  'Size tracked weekly by insights-worker. IAE reads this to determine what audiences are available for activation.';

COMMENT ON COLUMN m.audience_asset.seed_audience_id IS
  'For lookalike audiences: the custom audience that seeded this lookalike. '
  'Enables full lineage tracing: custom audience -> lookalike -> performance.';

COMMENT ON COLUMN m.audience_asset.boost_eligible IS
  'True when size >= min_viable_size. IAE boost-worker checks this before activating any campaign. '
  'Prevents wasting money boosting to audiences too small to be meaningful.';

-- RLS
ALTER TABLE m.audience_asset ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service_role_only" ON m.audience_asset
  USING (auth.role() = 'service_role');

-- ============================================================
-- PART 3: m.audience_performance
-- How each audience performed when activated in IAE
-- Written by boost-worker after each campaign run
-- ============================================================

CREATE TABLE IF NOT EXISTS m.audience_performance (
  id                       uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  audience_id              uuid NOT NULL REFERENCES m.audience_asset(id) ON DELETE CASCADE,
  post_boost_id            uuid,
  -- References m.post_boost when built (post_boost table built in Phase 3.4)
  client_id                uuid NOT NULL REFERENCES c.client(id) ON DELETE CASCADE,
  platform                 text NOT NULL,
  campaign_id              text,
  -- Platform's campaign ID
  impressions              integer,
  clicks                   integer,
  spend_aud                numeric(10,2),
  results                  integer,
  -- Platform-defined 'result' (e.g. page likes, post engagements, link clicks)
  cost_per_result_aud      numeric(10,2),
  roas                     numeric(10,4),
  -- Return on ad spend (if conversion tracking is live)
  reporting_period_start   date,
  reporting_period_end     date,
  recorded_at              timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE m.audience_performance IS
  'Performance data for each IAE campaign activation, linked to the audience used. '
  'Accumulates over time to show which audience types produce the best results per client. '
  'k.vw_audience_summary synthesises this for at-a-glance intelligence.';

-- RLS
ALTER TABLE m.audience_performance ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service_role_only" ON m.audience_performance
  USING (auth.role() = 'service_role');

-- ============================================================
-- PART 4: Seed existing clients with default audience policy
-- ============================================================

-- NDIS Yarns
INSERT INTO c.client_audience_policy (client_id, platforms_enabled, email_capture_enabled)
SELECT id, ARRAY['meta'], false
FROM c.client WHERE slug = 'ndis-yarns'
ON CONFLICT (client_id) DO NOTHING;

-- Property Pulse
INSERT INTO c.client_audience_policy (client_id, platforms_enabled, email_capture_enabled)
SELECT id, ARRAY['meta'], false
FROM c.client WHERE slug = 'property-pulse'
ON CONFLICT (client_id) DO NOTHING;

-- ============================================================
-- PART 5: Seed initial audience_asset rows for existing clients
-- Start tracking from now even with size = 0
-- These will be updated by insights-worker once extended (D4)
-- ============================================================

-- NDIS Yarns: Meta page engagers
INSERT INTO m.audience_asset (client_id, platform, audience_type, size, status)
SELECT id, 'meta', 'page_engagers', 0, 'building'
FROM c.client WHERE slug = 'ndis-yarns'
ON CONFLICT (client_id, platform, audience_type) DO NOTHING;

-- NDIS Yarns: Meta video viewers
INSERT INTO m.audience_asset (client_id, platform, audience_type, size, status)
SELECT id, 'meta', 'video_viewers', 0, 'building'
FROM c.client WHERE slug = 'ndis-yarns'
ON CONFLICT (client_id, platform, audience_type) DO NOTHING;

-- NDIS Yarns: Meta website visitors
INSERT INTO m.audience_asset (client_id, platform, audience_type, size, status)
SELECT id, 'meta', 'website_visitors', 0, 'building'
FROM c.client WHERE slug = 'ndis-yarns'
ON CONFLICT (client_id, platform, audience_type) DO NOTHING;

-- Property Pulse: Meta page engagers
INSERT INTO m.audience_asset (client_id, platform, audience_type, size, status)
SELECT id, 'meta', 'page_engagers', 0, 'building'
FROM c.client WHERE slug = 'property-pulse'
ON CONFLICT (client_id, platform, audience_type) DO NOTHING;

-- Property Pulse: Meta video viewers
INSERT INTO m.audience_asset (client_id, platform, audience_type, size, status)
SELECT id, 'meta', 'video_viewers', 0, 'building'
FROM c.client WHERE slug = 'property-pulse'
ON CONFLICT (client_id, platform, audience_type) DO NOTHING;

-- Property Pulse: Meta website visitors
INSERT INTO m.audience_asset (client_id, platform, audience_type, size, status)
SELECT id, 'meta', 'website_visitors', 0, 'building'
FROM c.client WHERE slug = 'property-pulse'
ON CONFLICT (client_id, platform, audience_type) DO NOTHING;

-- ============================================================
-- PART 6: Update k schema registry
-- Run after migration to keep k catalog current
-- ============================================================

-- SELECT refresh_catalog();
-- Run manually after applying this migration
-- Then verify: SELECT table_name, purpose FROM k.vw_table_summary
--              WHERE table_name IN ('client_audience_policy', 'audience_asset', 'audience_performance');

-- ============================================================
-- VERIFICATION QUERIES
-- Run these after applying migration to confirm correct state
-- ============================================================

-- 1. Confirm tables created
-- SELECT table_name FROM information_schema.tables
-- WHERE table_schema IN ('c', 'm')
-- AND table_name IN ('client_audience_policy', 'audience_asset', 'audience_performance');
-- Expected: 3 rows

-- 2. Confirm seed data inserted
-- SELECT cl.name, cap.platforms_enabled, cap.email_capture_enabled
-- FROM c.client_audience_policy cap
-- JOIN c.client cl ON cl.id = cap.client_id;
-- Expected: 2 rows (NDIS Yarns and Property Pulse)

-- 3. Confirm audience asset rows seeded
-- SELECT cl.name, ma.platform, ma.audience_type, ma.status
-- FROM m.audience_asset ma
-- JOIN c.client cl ON cl.id = ma.client_id
-- ORDER BY cl.name, ma.audience_type;
-- Expected: 6 rows (3 per client)

-- 4. Confirm RLS enabled
-- SELECT tablename, rowsecurity FROM pg_tables
-- WHERE tablename IN ('client_audience_policy', 'audience_asset', 'audience_performance');
-- Expected: rowsecurity = true for all 3
