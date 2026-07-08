-- Migration: create_music_library_v0
-- Music Library v0 — Shared Harvest-Free Music schema (7 tables + post-music bucket + posture)
--
-- Design:  docs/briefs/music-library-v0-schema-packet.md
--          (§3 tables · §4 governed CHECK vocabularies + fail-closed defaults · §9 apply
--           posture/create-order/bucket-create · §10 reference-only rollback)
--          PK Gate-1 decisions (§0, 2026-07-09): namespace m.* for the 6 shared tables +
--          c.client_music_profile; bucket post-music PUBLIC + NET-NEW; audio metadata
--          (loudness_lufs/bpm/text_overlay_safe) human-recorded and nullable (no automated QA);
--          facets = typed CHECK columns on m.music_track + m.music_track_tag.
--          Reviewed design hash 797719f4e6f397d347064d7ad095edb16e60a63e770b63272f6c8f21ce98bd0f.
-- Mirror:  supabase/migrations/20260703002813_create_resolve_slot_assets_v1.sql
--          supabase/migrations/20260703035154_create_select_template_v1.sql
--          (posture precedent: RLS deny-all · REVOKE ALL FROM public, anon, authenticated ·
--           service-role-only writes · unexposed m.* schema · reference-only rollback header)
--          _harness/ndis_yarns_logo_intake_v0/ndis_logo_intake_apply.sql
--          (the four live fences: approval_status='intake_candidate' + approved/
--           production_use_allowed/is_active = false)
--
-- WHAT IT DOES
--   Creates the empty, fenced, globally-shared music library schema so brand videos can LATER
--   carry royalty-free background music:
--     m.music_track       — GLOBAL shared track (NO client_id; the 4 fences)
--     m.music_license     — 1:1 rights record (six fail-closed booleans)
--     m.music_track_tag   — open-ended multi-value facet labels
--     m.music_suitability — scoped fit (platform/format/vertical/client), never global
--     m.music_usage_event — append-only usage log (future cooldown source of truth)
--     m.music_review_event— append-only review/approval log (approval recorded, never inferred)
--     c.client_music_profile — per-client preference (the ONLY client-keyed table)
--   plus the NET-NEW public post-music storage bucket and its service-role-only write policy.
--   Governed CHECK vocabularies (§4) constrain every classification column; fail-closed
--   defaults fence every track until an explicit, scoped, future approval flips them.
--
-- SHIPS DARK
--   Empty tables + a net-new empty bucket. NO worker reads them. This migration authors NO RPC
--   (select_music() is a SEPARATE later migration, §9 step 9), touches NO worker, and leaves
--   VIDEO_WORKER_MUSIC_ENABLED off (supabase/functions/video-worker/index.ts:274 unchanged).
--   Behaviour is byte-for-byte unchanged (mirrors the 'ships dark: no production consumer'
--   framing at 20260703035154_create_select_template_v1.sql:76).
--
-- SECURITY POSTURE (mirror TMR/asset-registry)
--   · All 7 tables: ALTER TABLE ... ENABLE ROW LEVEL SECURITY with NO permissive policy
--     (deny-all — service_role bypasses RLS; every other principal is denied).
--   · REVOKE ALL ... FROM public, anon, authenticated on all 7 tables (revoking PUBLIC alone
--     is insufficient — anon/authenticated named explicitly, standing CLAUDE.md gotcha).
--   · GRANT service-role writes as the house pattern does (SELECT/INSERT/UPDATE/DELETE).
--   · m.* is NOT exposed over REST (no schema USAGE grant to anon/authenticated) — reads route
--     later through a SECURITY DEFINER public.select_music() RPC (avoids PGRST106 on an
--     unexposed schema). No RPC is created here.
--   · post-music is a NET-NEW PUBLIC bucket (it does NOT exist live — §2a). storage.objects
--     write (INSERT/UPDATE/DELETE) on bucket_id='post-music' is restricted to service_role
--     (SF-4 write-hardening); public READ is inherent to a public bucket.
--
-- FK / CREATE ORDER (§9 — parents before children)
--   1. m.music_track  →  2. m.music_license  →  3. m.music_track_tag  →  4. m.music_suitability
--   →  5. m.music_usage_event  →  6. m.music_review_event  →  7. c.client_music_profile
--   →  8. grants/REVOKE/RLS  →  9. bucket + storage.objects write policy.
--
-- ⛔ APPLY IS PK-GATED. This file is PREPARED, NOT APPLIED. Do not run it against any database
--    without explicit PK apply approval pinned to this file's sha256. It creates the net-new
--    post-music bucket at the SAME apply gate (§9). No data, no RPC, no worker change.
--
-- ROLLBACK (reference only — NOT executed by this migration; reverse of create-order, §10):
--   -- (select_music() RPC is NOT created here — dropped in its own later migration's rollback)
--   DROP TABLE IF EXISTS c.client_music_profile;
--   DROP TABLE IF EXISTS m.music_review_event;
--   DROP TABLE IF EXISTS m.music_usage_event;
--   DROP TABLE IF EXISTS m.music_suitability;
--   DROP TABLE IF EXISTS m.music_track_tag;
--   DROP TABLE IF EXISTS m.music_license;
--   DROP TABLE IF EXISTS m.music_track;
--   DELETE FROM storage.objects WHERE bucket_id = 'post-music';   -- v0 = empty; no objects expected
--   DROP POLICY IF EXISTS "post-music service-role write" ON storage.objects;
--   DELETE FROM storage.buckets WHERE id = 'post-music';
--   (v0 tables start EMPTY — no rows, no storage objects, no worker state to unwind; the env
--    flag was never flipped. Rollback drops empty structures only.)

-- ═══════════════════════════════════════════════════════════════════════════════════════════
-- 1. m.music_track — GLOBAL shared track (NO client_id; the four fences)
-- ═══════════════════════════════════════════════════════════════════════════════════════════
CREATE TABLE m.music_track (
  track_id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  track_key              text NOT NULL UNIQUE,                 -- stable slug, e.g. calm_corporate_neutral_001
  title                  text,
  source                 text NOT NULL
                           CHECK (source IN ('manual_harvest', 'paid_generated', 'ai_generated')),
  storage_bucket         text NOT NULL DEFAULT 'post-music',
  storage_path           text NOT NULL,                        -- post-music/global/<mood>/<track_key>.mp3
  sha256                 text NOT NULL,                        -- byte hash of the file (intake provenance)
  mime                   text,                                 -- e.g. audio/mpeg
  bytes                  bigint,                               -- for a storage byte-size precheck at intake
  duration_seconds       numeric,
  loudness_lufs          numeric,                              -- human-recorded in v0 (nullable; no automated QA)
  bpm                    numeric,                              -- human-recorded in v0 (nullable)
  mood                   text CHECK (mood IN ('calm', 'corporate', 'uplifting', 'warm', 'neutral')),
  energy                 text CHECK (energy IN ('low', 'medium', 'high')),
  tempo_band             text CHECK (tempo_band IN ('slow', 'mid', 'up')),
  genre                  text CHECK (genre IN ('ambient', 'corporate', 'acoustic', 'electronic', 'orchestral', 'other')),
  vocals                 text NOT NULL
                           CHECK (vocals IN ('instrumental_only', 'has_vocals')),
  text_overlay_safe      boolean,                              -- human-judged in v0 (nullable)
  -- ── the four live fences (mirror ndis_logo_intake_apply.sql:14,182-183) ──
  approval_status        text NOT NULL DEFAULT 'intake_candidate'
                           CHECK (approval_status IN ('intake_candidate', 'aural_reviewed', 'approved_scoped', 'restricted', 'rejected', 'archived')),
  approved               boolean NOT NULL DEFAULT false,
  production_use_allowed  boolean NOT NULL DEFAULT false,
  is_active              boolean NOT NULL DEFAULT false,
  notes                  text,
  created_at             timestamptz NOT NULL DEFAULT now(),
  updated_at             timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE m.music_track IS
'Music Library v0: GLOBAL shared royalty-free track (no client_id — a track legitimately serves all clients). Fenced-until-approved (four fences default-off). Facet CHECK columns + m.music_track_tag. Ships dark: no worker reads this.';

-- ═══════════════════════════════════════════════════════════════════════════════════════════
-- 2. m.music_license — 1:1 rights record (six fail-closed booleans)
-- ═══════════════════════════════════════════════════════════════════════════════════════════
CREATE TABLE m.music_license (
  track_id               uuid PRIMARY KEY
                           REFERENCES m.music_track (track_id),          -- 1:1
  license_type           text NOT NULL
                           CHECK (license_type IN ('cc0', 'public_domain', 'royalty_free_no_attrib')),
  license_name           text,
  source_url             text NOT NULL,                        -- provenance
  license_snapshot_hash  text NOT NULL,                        -- hash of the captured licence text
  license_snapshot_path  text,                                 -- stored licence-text artifact path
  -- ── six fail-closed booleans: NULL is treated as NOT allowed by the future select_music() ──
  commercial_use_allowed boolean,
  social_use_allowed     boolean,
  modification_allowed   boolean,
  paid_ads_allowed       boolean,
  attribution_required   boolean,                              -- v0: true => track EXCLUDED at selection
  content_id_safe        boolean,                              -- NULL/unknown => NOT YouTube-eligible
  expiry_date            date,                                 -- past => not usable
  created_at             timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE m.music_license IS
'Music Library v0: 1:1 licence/rights record for a track (highest-risk bucket gets its own row). Six fail-closed booleans (NULL => not allowed). v0 licence_type set: cc0/public_domain/royalty_free_no_attrib (attribution-required classes excluded, PK #1). fail-closed semantics are enforced in the future select_music() RPC, not by NOT NULL here.';

-- ═══════════════════════════════════════════════════════════════════════════════════════════
-- 3. m.music_track_tag — open-ended, multi-value facet labels
-- ═══════════════════════════════════════════════════════════════════════════════════════════
CREATE TABLE m.music_track_tag (
  track_id               uuid NOT NULL
                           REFERENCES m.music_track (track_id),
  tag                    text NOT NULL,
  created_at             timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (track_id, tag)
);

COMMENT ON TABLE m.music_track_tag IS
'Music Library v0: open-ended multi-value facet labels for a track (the typed low-cardinality facets live as CHECK columns on m.music_track). PK(track_id, tag) — additive, multi-row.';

-- ═══════════════════════════════════════════════════════════════════════════════════════════
-- 4. m.music_suitability — scoped fit (platform/format/vertical/client); NEVER global
-- ═══════════════════════════════════════════════════════════════════════════════════════════
CREATE TABLE m.music_suitability (
  suitability_id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  track_id               uuid NOT NULL
                           REFERENCES m.music_track (track_id),
  scope_kind             text NOT NULL
                           CHECK (scope_kind IN ('platform', 'format', 'vertical', 'client')),
  scope_value            text NOT NULL,                        -- soft reference (no hard FK to client/template)
  fit_status             text NOT NULL DEFAULT 'unknown'
                           CHECK (fit_status IN ('unknown', 'candidate', 'suitable', 'not_suitable', 'needs_review', 'blocked')),
  reason                 text,
  created_at             timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE m.music_suitability IS
'Music Library v0: scoped fit for a track along ONE dimension per row (platform/format/vertical/client). scope_value is a SOFT reference (no hard FK). Approval is never global — it names a scope via these rows.';

-- ═══════════════════════════════════════════════════════════════════════════════════════════
-- 5. m.music_usage_event — append-only usage log (future cooldown source of truth)
-- ═══════════════════════════════════════════════════════════════════════════════════════════
CREATE TABLE m.music_usage_event (
  usage_id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  track_id               uuid NOT NULL
                           REFERENCES m.music_track (track_id),
  client_id              uuid,                                 -- soft reference
  platform               text,
  format                 text,
  draft_id               uuid,
  render_id              uuid,
  used_at                timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE m.music_usage_event IS
'Music Library v0: append-only usage log. Immutable; the future select_music() cooldown reads (client_id, platform, used_at). Populated at render time in a LATER lane — empty at v0.';

-- ═══════════════════════════════════════════════════════════════════════════════════════════
-- 6. m.music_review_event — append-only review/approval log (approval recorded, never inferred)
-- ═══════════════════════════════════════════════════════════════════════════════════════════
CREATE TABLE m.music_review_event (
  review_id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  track_id               uuid NOT NULL
                           REFERENCES m.music_track (track_id),
  event_kind             text NOT NULL
                           CHECK (event_kind IN ('intake', 'aural_review', 'scoped_approval', 'restriction', 'rejection', 'revocation')),
  scope_kind             text CHECK (scope_kind IS NULL OR scope_kind IN ('platform', 'format', 'vertical', 'client')),  -- scoped kinds only; NULL for non-scoped
  scope_value            text,
  prior_status           text,
  new_status             text,
  actor                  text,
  reason                 text,
  occurred_at            timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE m.music_review_event IS
'Music Library v0: append-only review/approval log. Every status transition is a row; status is never inferred. Approval is scoped (scope_kind/scope_value). event_kind governed by §4 vocabulary.';

-- ═══════════════════════════════════════════════════════════════════════════════════════════
-- 7. c.client_music_profile — per-client preferences (the ONLY client-keyed table)
-- ═══════════════════════════════════════════════════════════════════════════════════════════
CREATE TABLE c.client_music_profile (
  client_id              uuid PRIMARY KEY
                           REFERENCES c.client (client_id),    -- resolve by client_id, NOT id (standing lesson)
  music_enabled          boolean NOT NULL DEFAULT false,
  preferred_moods        text[],
  banned_moods           text[],
  allow_vocals           boolean NOT NULL DEFAULT false,
  default_bed_volume     text,                                 -- e.g. '15%' (current video-worker music-bed behaviour)
  created_at             timestamptz NOT NULL DEFAULT now(),
  updated_at             timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE c.client_music_profile IS
'Music Library v0: per-client music PREFERENCES only (music_enabled/preferred_moods/banned_moods/allow_vocals/default_bed_volume). Never the source of a global track. FK -> c.client(client_id).';

-- ═══════════════════════════════════════════════════════════════════════════════════════════
-- 8. Posture — RLS deny-all + REVOKE ALL FROM public, anon, authenticated + service-role writes
--    (m.* stays UNEXPOSED over REST — no schema USAGE grant to anon/authenticated)
-- ═══════════════════════════════════════════════════════════════════════════════════════════

-- 8a. RLS deny-all on all 7 tables (no permissive policy — service_role bypasses RLS).
ALTER TABLE m.music_track          ENABLE ROW LEVEL SECURITY;
ALTER TABLE m.music_license        ENABLE ROW LEVEL SECURITY;
ALTER TABLE m.music_track_tag      ENABLE ROW LEVEL SECURITY;
ALTER TABLE m.music_suitability    ENABLE ROW LEVEL SECURITY;
ALTER TABLE m.music_usage_event    ENABLE ROW LEVEL SECURITY;
ALTER TABLE m.music_review_event   ENABLE ROW LEVEL SECURITY;
ALTER TABLE c.client_music_profile ENABLE ROW LEVEL SECURITY;

-- 8b. REVOKE ALL FROM public, anon, authenticated (naming all three — PUBLIC alone insufficient).
REVOKE ALL ON TABLE m.music_track          FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE m.music_license        FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE m.music_track_tag      FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE m.music_suitability    FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE m.music_usage_event    FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE m.music_review_event   FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE c.client_music_profile FROM PUBLIC, anon, authenticated;

-- 8c. Service-role writes (the house service-role-only pattern).
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE m.music_track          TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE m.music_license        TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE m.music_track_tag      TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE m.music_suitability    TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE m.music_usage_event    TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE m.music_review_event   TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE c.client_music_profile TO service_role;

-- ═══════════════════════════════════════════════════════════════════════════════════════════
-- 9. Net-new PUBLIC post-music bucket + service-role-only write policy (SF-4 write-hardening)
--    Idempotent: bucket insert ON CONFLICT DO NOTHING; policy guarded by a catalog check.
-- ═══════════════════════════════════════════════════════════════════════════════════════════
INSERT INTO storage.buckets (id, name, public)
VALUES ('post-music', 'post-music', true)
ON CONFLICT (id) DO NOTHING;

-- Write (INSERT/UPDATE/DELETE) on post-music is service-role-only; public READ is inherent to
-- the public bucket. Guarded idempotently (CREATE POLICY has no IF NOT EXISTS).
-- NOTE (db-rls-auditor): service_role has BYPASSRLS, so this policy is DEFENSIVE/DOCUMENTARY, not
-- the mechanism that blocks writes — anon/authenticated are blocked by RLS-enabled-with-no-permissive-
-- policy on storage.objects. Kept for intent-clarity.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename  = 'objects'
      AND policyname = 'post-music service-role write'
  ) THEN
    EXECUTE $pol$
      CREATE POLICY "post-music service-role write"
        ON storage.objects
        FOR ALL
        TO service_role
        USING (bucket_id = 'post-music')
        WITH CHECK (bucket_id = 'post-music')
    $pol$;
  END IF;
END $$;
