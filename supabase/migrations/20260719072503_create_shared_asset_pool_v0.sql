-- Migration: create_shared_asset_pool_v0
-- Generic Shared Asset Pool v0 — six dark/additive/empty tables + music-v0 security posture
--
-- Design:  docs/briefs/shared-asset-pool-design-of-record-v1.md
--          (RATIFIED 2026-07-19, PK consolidated gate OQ-2..OQ-7). §2 = six tables + keys +
--          RLS/grant posture · §3 = descriptors (sensitivity_class / cultural_review_required /
--          purpose_bound) · §4 = the four fences (default-OFF) + purpose_bound · §6 = the
--          asset_pool_policy enum. §5 (pool-neutrality) is OUT of scope here — this migration
--          authors NO assertion/replica/resolver.
--          Brief: docs/briefs/shared-asset-pool-p2-dark-ddl-brief-v1.md (P2 dark-DDL lane, T3).
-- Mirror:  supabase/migrations/20260708224532_create_music_library_v0.sql
--          (posture precedent, mirrored EXACTLY: RLS-ENABLED deny-all with NO permissive policy
--           [service_role bypasses RLS] · REVOKE ALL ... FROM PUBLIC, anon, authenticated
--           [all three named — PUBLIC alone is insufficient] · GRANT service-role-only writes ·
--           unexposed m.* schema [no schema USAGE grant to anon/authenticated] · UNIQUE natural
--           keys · four fences as REAL COLUMNS default-off · reference-only rollback header).
--          supabase/migrations/20260707010000_grant_service_role_select_client.sql
--          (schema-c precedent: anon/authenticated ALREADY hold schema-c USAGE, so
--           c.client_asset_profile must NEVER get a table-level grant to anon/authenticated —
--           the REVOKE discipline is the sole protection for the c.* table).
--
-- WHAT IT DOES
--   Creates the empty, fenced, generic shared asset pool schema so brand posts can LATER draw
--   from a client-independent image/asset pool with per-scope eligibility:
--     m.shared_asset               — GENERIC shared asset (NO client_id; the 4 fences + descriptors)
--     m.shared_asset_suitability   — scoped fit (client/vertical/platform/format), NEVER global
--     m.shared_asset_license       — 1:1 rights record (six fail-closed booleans; NULL => not allowed)
--     m.shared_asset_review_event  — append-only scoped-approval audit trail (recorded, never inferred)
--     m.shared_asset_usage_event   — append-only rotation/cooldown source of truth
--     c.client_asset_profile       — per-client preference + asset_pool_policy (the ONLY client-keyed table)
--   Fail-closed defaults fence every asset until an explicit, scoped, future approval flips them.
--
-- SHIPS DARK
--   Six EMPTY tables. NO worker/resolver reads them. This migration authors NO RPC, NO resolver
--   edit, NO pool-neutrality assertion/replica (§5 is a later P4/P5 gate), NO storage/bucket
--   change (§8 reuses brand-assets, later gate), touches NO worker. Behaviour is byte-for-byte
--   unchanged (mirrors the 'ships dark: no production consumer' framing of music v0).
--
-- SECURITY POSTURE (mirror music v0 EXACTLY)
--   · All 6 tables: ALTER TABLE ... ENABLE ROW LEVEL SECURITY with NO permissive policy
--     (deny-all — service_role bypasses RLS; every other principal is denied).
--   · REVOKE ALL ... FROM PUBLIC, anon, authenticated on all 6 tables (revoking PUBLIC alone
--     is insufficient — anon/authenticated named explicitly; standing CLAUDE.md gotcha).
--   · GRANT SELECT/INSERT/UPDATE/DELETE to service_role only (the house pattern).
--   · m.* is NOT exposed over REST (no schema USAGE grant) — future reads route through a
--     SECURITY DEFINER public RPC (avoids PGRST106 on an unexposed schema). No RPC here.
--   · c.client_asset_profile lives in schema c, where anon/authenticated ALREADY hold USAGE
--     (20260707010000). It therefore gets NO table-level grant to anon/authenticated — the
--     REVOKE ALL FROM PUBLIC, anon, authenticated + service-role-only GRANT is what keeps it
--     unreachable. No schema-c grant is touched by this migration.
--
-- FENCE REPRESENTATION (decision — see rollback/notes)
--   The four fences are REAL COLUMNS on m.shared_asset (mirroring music v0's m.music_track:
--   approval_status text + approved/production_use_allowed/is_active boolean), NOT jsonb keys.
--   DoR §2 sketched approved/production_use_allowed/approval_status inside asset_meta; the P2
--   brief and the image-workflow P2 structural-diff gate ("all four fences present-and-false")
--   both require real columns. Real columns chosen to mirror music exactly.
--
-- FK / CREATE ORDER (§2 — parents before children)
--   1. m.shared_asset  →  2. m.shared_asset_suitability  →  3. m.shared_asset_license
--   →  4. m.shared_asset_review_event  →  5. m.shared_asset_usage_event
--   →  6. c.client_asset_profile  →  7. RLS enable  →  8. REVOKE  →  9. service-role GRANTs.
--
-- ⛔ APPLY IS PK-GATED. This file is PREPARED, NOT APPLIED. Do not run it against any database
--    without explicit PK apply approval pinned to this file's sha256. No data, no RPC, no bucket,
--    no worker change. Ships dark and empty.
--
-- ROLLBACK (reference only — NOT executed by this migration; reverse of create-order):
--   DROP TABLE IF EXISTS c.client_asset_profile;
--   DROP TABLE IF EXISTS m.shared_asset_usage_event;
--   DROP TABLE IF EXISTS m.shared_asset_review_event;
--   DROP TABLE IF EXISTS m.shared_asset_license;
--   DROP TABLE IF EXISTS m.shared_asset_suitability;
--   DROP TABLE IF EXISTS m.shared_asset;
--   (v0 tables start EMPTY — no rows, no storage objects, no RPC, no worker state to unwind;
--    ON DELETE CASCADE FKs mean child rows never orphan. Rollback drops empty structures only
--    and leaves zero residue. A companion executable rollback SQL is provided OUTSIDE the
--    migrations dir — see the P2 result/plan — to avoid a duplicate-version file in
--    supabase/migrations/.)

-- ═══════════════════════════════════════════════════════════════════════════════════════════
-- 1. m.shared_asset — GENERIC shared asset (NO client_id; four fences default-off + descriptors)
-- ═══════════════════════════════════════════════════════════════════════════════════════════
CREATE TABLE m.shared_asset (
  asset_id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_key                text NOT NULL UNIQUE,                 -- stable natural key / ON-CONFLICT dedup target
  asset_type               text NOT NULL,                        -- e.g. 'background_image' (free-text in v0)
  asset_name               text,
  asset_url                text,
  asset_meta               jsonb,                                -- descriptors NOT promoted to real columns
  -- ── the four live fences (mirror music v0 m.music_track:102-107 — all default not-eligible) ──
  approval_status          text NOT NULL DEFAULT 'intake_candidate'
                             CHECK (approval_status IN ('intake_candidate', 'visual_reviewed', 'approved_scoped', 'restricted', 'rejected', 'archived')),
  approved                 boolean NOT NULL DEFAULT false,
  production_use_allowed    boolean NOT NULL DEFAULT false,
  is_active                boolean NOT NULL DEFAULT false,
  -- ── eligibility-touching intrinsic descriptors promoted to real columns (DoR §3) ──
  brand_neutral            boolean NOT NULL DEFAULT false,       -- fail-closed: only true may enter the pool
  sensitivity_class        text,                                 -- free-text in v0 (no governed vocabulary yet)
  cultural_review_required boolean NOT NULL DEFAULT false,       -- First-Nations / cultural sign-off gate (D7)
  purpose_bound            boolean NOT NULL DEFAULT false,       -- true => excluded from AUTOMATIC rotation (§4)
  has_people               boolean,                              -- nullable; people-forward => review before eligible
  safe_for_text_overlay    text,                                 -- template-relative; human-recorded (nullable)
  created_at               timestamptz NOT NULL DEFAULT now(),
  updated_at               timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE m.shared_asset IS
'Shared Asset Pool v0: GENERIC shared asset (no client_id — a generic asset legitimately serves many clients). Fenced-until-approved (four fences default-off: approval_status/approved/production_use_allowed/is_active). Eligibility-touching descriptors (brand_neutral/sensitivity_class/cultural_review_required/purpose_bound/has_people/safe_for_text_overlay) are real columns; other descriptors live in asset_meta. UNIQUE(asset_key). Ships dark: no worker/resolver reads this.';

-- ═══════════════════════════════════════════════════════════════════════════════════════════
-- 2. m.shared_asset_suitability — scoped fit (client/vertical/platform/format); NEVER global
-- ═══════════════════════════════════════════════════════════════════════════════════════════
CREATE TABLE m.shared_asset_suitability (
  suitability_id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_id                 uuid NOT NULL
                             REFERENCES m.shared_asset (asset_id) ON DELETE CASCADE,
  scope_kind               text NOT NULL
                             CHECK (scope_kind IN ('client', 'vertical', 'platform', 'format')),
  scope_value              text NOT NULL,                        -- soft reference (no hard FK to client/template)
  fit_status               text NOT NULL DEFAULT 'unknown'
                             CHECK (fit_status IN ('unknown', 'candidate', 'suitable', 'not_suitable', 'blocked', 'needs_review')),
  reason                   text,
  created_at               timestamptz NOT NULL DEFAULT now(),
  updated_at               timestamptz NOT NULL DEFAULT now(),
  UNIQUE (asset_id, scope_kind, scope_value)                     -- idempotent scoped rows / ON-CONFLICT upsert target
);

COMMENT ON TABLE m.shared_asset_suitability IS
'Shared Asset Pool v0: scoped fit for an asset along ONE dimension per row (client/vertical/platform/format). Exclusions are first-class blocked rows. Approval is never global — it names a scope via these rows. UNIQUE(asset_id, scope_kind, scope_value). scope_value is a SOFT reference (no hard FK).';

-- ═══════════════════════════════════════════════════════════════════════════════════════════
-- 3. m.shared_asset_license — 1:1 rights record (six fail-closed booleans; NULL => not allowed)
-- ═══════════════════════════════════════════════════════════════════════════════════════════
CREATE TABLE m.shared_asset_license (
  asset_id                 uuid PRIMARY KEY
                             REFERENCES m.shared_asset (asset_id) ON DELETE CASCADE,   -- 1:1
  -- ── six fail-closed booleans: NULL is treated as NOT allowed by the future resolver ──
  commercial_use_allowed   boolean,
  social_use_allowed       boolean,
  modification_allowed     boolean,
  paid_ads_allowed         boolean,
  attribution_required     boolean,                              -- true => asset EXCLUDED at selection
  content_id_safe          boolean,                              -- NULL/unknown => NOT video/ContentID-eligible
  license_type             text,
  license_expiry           timestamptz,                          -- past => not usable
  created_at               timestamptz NOT NULL DEFAULT now(),
  updated_at               timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE m.shared_asset_license IS
'Shared Asset Pool v0: 1:1 licence/rights record for a shared asset. Six fail-closed booleans (NULL => not allowed) enforced by the future resolver, not by NOT NULL here. Shared-pool licence bar (§7): multi-entity commercial + no-attribution only; CC BY / CC BY-SA / AI-generated excluded; paid-stock per-asset exception.';

-- ═══════════════════════════════════════════════════════════════════════════════════════════
-- 4. m.shared_asset_review_event — append-only scoped-approval audit trail (never inferred)
-- ═══════════════════════════════════════════════════════════════════════════════════════════
CREATE TABLE m.shared_asset_review_event (
  review_event_id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_id                 uuid NOT NULL
                             REFERENCES m.shared_asset (asset_id) ON DELETE CASCADE,
  scope_kind               text,                                 -- NULL for non-scoped events
  scope_value              text,
  from_status              text,
  to_status                text,
  actor                    text,
  note                     text,
  created_at               timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE m.shared_asset_review_event IS
'Shared Asset Pool v0: append-only scoped-approval audit trail (music m.music_review_event parity). Every status transition is a row; "approved for scope S" is recorded here, never inferred. Populated in a later lane — empty at v0.';

-- ═══════════════════════════════════════════════════════════════════════════════════════════
-- 5. m.shared_asset_usage_event — append-only rotation/cooldown source of truth
-- ═══════════════════════════════════════════════════════════════════════════════════════════
CREATE TABLE m.shared_asset_usage_event (
  usage_event_id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_id                 uuid NOT NULL
                             REFERENCES m.shared_asset (asset_id) ON DELETE CASCADE,
  client_id                uuid,                                 -- soft reference (no hard FK)
  context                  text,
  used_at                  timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE m.shared_asset_usage_event IS
'Shared Asset Pool v0: append-only usage log (music m.music_usage_event parity). Future rotation/cooldown source of truth (reads asset_id, client_id, used_at). Populated at render time in a LATER lane — empty at v0.';

-- ═══════════════════════════════════════════════════════════════════════════════════════════
-- 6. c.client_asset_profile — per-client preference + asset_pool_policy (ONLY client-keyed table)
-- ═══════════════════════════════════════════════════════════════════════════════════════════
CREATE TABLE c.client_asset_profile (
  client_id                uuid PRIMARY KEY
                             REFERENCES c.client (client_id) ON DELETE CASCADE,   -- resolve by client_id (standing lesson)
  asset_pool_policy        text NOT NULL DEFAULT 'client_preferred'
                             CHECK (asset_pool_policy IN ('client_only', 'client_preferred', 'best_fit')),
  preferred_asset_ids      uuid[],
  banned_asset_ids         uuid[],
  created_at               timestamptz NOT NULL DEFAULT now(),
  updated_at               timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE c.client_asset_profile IS
'Shared Asset Pool v0: per-client asset PREFERENCES + asset_pool_policy (client_only/client_preferred[default]/best_fit; best_fit deferred beyond v1 — enum admitted now). preferred/banned asset id arrays. The ONLY client-keyed table. FK -> c.client(client_id). RLS-enabled deny-all + REVOKE (schema-c already has anon/authenticated USAGE, so NO table grant to them).';

-- ═══════════════════════════════════════════════════════════════════════════════════════════
-- 7. RLS deny-all on all 6 tables (no permissive policy — service_role bypasses RLS)
-- ═══════════════════════════════════════════════════════════════════════════════════════════
ALTER TABLE m.shared_asset              ENABLE ROW LEVEL SECURITY;
ALTER TABLE m.shared_asset_suitability  ENABLE ROW LEVEL SECURITY;
ALTER TABLE m.shared_asset_license      ENABLE ROW LEVEL SECURITY;
ALTER TABLE m.shared_asset_review_event ENABLE ROW LEVEL SECURITY;
ALTER TABLE m.shared_asset_usage_event  ENABLE ROW LEVEL SECURITY;
ALTER TABLE c.client_asset_profile      ENABLE ROW LEVEL SECURITY;

-- ═══════════════════════════════════════════════════════════════════════════════════════════
-- 8. REVOKE ALL FROM PUBLIC, anon, authenticated (naming all three — PUBLIC alone insufficient)
-- ═══════════════════════════════════════════════════════════════════════════════════════════
REVOKE ALL ON TABLE m.shared_asset              FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE m.shared_asset_suitability  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE m.shared_asset_license      FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE m.shared_asset_review_event FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE m.shared_asset_usage_event  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE c.client_asset_profile      FROM PUBLIC, anon, authenticated;

-- ═══════════════════════════════════════════════════════════════════════════════════════════
-- 9. Service-role writes only (the house service-role-only pattern; no anon/authenticated grant)
-- ═══════════════════════════════════════════════════════════════════════════════════════════
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE m.shared_asset              TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE m.shared_asset_suitability  TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE m.shared_asset_license      TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE m.shared_asset_review_event TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE m.shared_asset_usage_event  TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE c.client_asset_profile      TO service_role;
