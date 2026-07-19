-- ============================================================================
-- cc-0041 — Post-Prep Asset-Gap Analysis — CANDIDATE DDL PACKET v1
-- ⛔ DESIGN — NOT APPLIED.  Apply is a PK-gated HARD STOP (T3).
-- ============================================================================
-- Brief:  docs/briefs/cc-0041-post-prep-asset-gap-analysis-brief.md (rev-3, Option B)
-- Evidence: db-rls-auditor read-only pass (project mbkmaxqhsohbtwsqolns), verdict
--           concerns→resolved by PK (Option B shared-asset table; toggle greenfield).
--
-- This file is a DESIGN artifact for review (db-rls-auditor + external review pinned
-- to its sha256). It is NOT a migration and is NOT applied by this lane. The final
-- version number is MINTED AT APPLY TIME (apply_migration/execute_sql precedent;
-- memory: apply-migration-mints-own-version) at a separate PK apply gate.
--
-- Four objects, in dependency order:
--   0A  c.shared_creative_asset      — dedicated shared/generic governed-asset table
--                                       (Option B: client-bound assets stay in
--                                        c.client_brand_asset, untouched)
--   0B  c.client_asset_pool_policy   — one row per client; no row ⇒ client_only
--   1   m.asset_gap_suggestion       — aggregated, client-specific demand queue
--   2   m.asset_gap_observation      — per-post evidence child
--
-- Posture (all four): additive · RLS enabled deny-all (0 policies) · REVOKE ALL FROM
-- public, anon, authenticated · GRANT DML to service_role · SELECT to inspector_ro
-- (mirrors c.creative_template_family_tag, the db-rls-auditor-confirmed target). The
-- two c.* tables MUST revoke anon/authenticated explicitly — schema c grants them
-- USAGE (schema m does not), so a PUBLIC-only revoke is insufficient.
--
-- FOLDED IN THIS REV (db-rls-auditor review of v1, verdict concerns→addressed):
--   [must-fix] D-d resolved_asset_id → SPLIT into resolved_client_asset_id +
--              resolved_shared_asset_id (real FKs) + XOR CHECK tied to status='resolved'.
--   [must-fix] partial-unique predicate now INCLUDES 'failed' (retry updates in place; no
--              duplicate row while a signature is failed). Exact ON CONFLICT form documented at the index.
--   [should]   removed 'client_scoped' from c.shared_creative_asset.governance_scope + dropped the
--              now-redundant forbidding constraint (client-scoped lives in c.client_brand_asset).
--   [should]   drain index → priority_score DESC NULLS LAST, first_seen_at ASC (matches Artifact-D).
--   [should]   m.asset_gap_suggestion.client_id keeps NO ACTION on delete (RESTRICT) — INTENTIONAL:
--              do not silently drop demand evidence when a client row is deleted. (pool_policy cascades.)
--
-- OPEN DDL-GATE DECISIONS (still flagged for PK / final db-rls-auditor pass — not silently resolved):
--   D-a) c.shared_creative_asset fence model: EXPLICIT columns for fences + eligibility (indexable,
--        CHECK-enforced) + asset_meta jsonb for provenance (license/sha256/bucket), rather than the
--        all-in-asset_meta model of c.client_brand_asset. Confirm the divergence, or align to the
--        asset_meta-key model so the two sources read identically.
--   D-b) sensitivity_class / governance_scope / asset_kind CHECK vocabularies are proposed; any
--        addition is a PK decision.
--   D-c) demand_count maintenance: chosen app-maintained (analyzer ON CONFLICT increments atomically);
--        a reconciliation view against count(*) of m.asset_gap_observation is an analyzer-lane item.
--   NOTE inspector_ro SELECT is granted for posture-parity but returns 0 rows under RLS-deny-all (not the
--        owner) — any read path must go through an owner-privileged view/RPC, exactly like the TMR-4 tables.
-- ============================================================================

begin;

-- Idempotent schema usage (service_role already holds these on c/m per TMR-4 + m.* grants;
-- included for a clean standalone apply). inspector_ro USAGE mirrors the tag-table posture.
grant usage on schema c to service_role;
grant usage on schema m to service_role;

-- ────────────────────────────────────────────────────────────────────────────
-- 0A · c.shared_creative_asset — shared/generic governed asset (Option B, greenfield)
-- ────────────────────────────────────────────────────────────────────────────
create table c.shared_creative_asset (
  id                              uuid primary key default gen_random_uuid(),

  -- eligibility contract (read by the analyzer's shared-pool evaluator) --------
  governance_scope                text not null
                                    check (governance_scope in
                                      ('global_generic','vertical_shared','purpose_bound')),  -- client-scoped assets live in c.client_brand_asset (db-rls-auditor should-fix)
  vertical_key                    text,                               -- e.g. 'ndis'; null = cross-vertical
  allowed_clients                 uuid[] not null default '{}',       -- explicit allow (empty = governed by scope)
  excluded_clients                uuid[] not null default '{}',       -- explicit deny
  asset_kind                      text not null
                                    check (asset_kind in ('static_background','logo','image','video_broll')),
  subject_tags                    text[] not null default '{}',
  use_case_tags                   text[] not null default '{}',
  tone_tags                       text[] not null default '{}',
  platform_scope                  text[],                             -- mirrors c.client_brand_asset real column
  aspect_ratio                    text[] not null default '{}',
  brand_neutral                   boolean not null default false,
  participant_neutral             boolean not null default false,
  sensitivity_class               text not null default 'unknown'
                                    check (sensitivity_class in
                                      ('person_free','contains_people','unknown')),          -- D-b vocab
  purpose_bound                   boolean not null default false,     -- purpose-bound never auto-enters the reusable pool
  licence_allows_multi_entity_use boolean not null default false,    -- a shared asset MUST permit multi-entity use

  -- governance fences (born fenced — mirrors the client_brand_asset intake discipline) ---
  is_active                       boolean not null default false,
  production_use_allowed          boolean not null default false,
  approval_status                 text not null default 'intake_candidate',

  -- asset payload + provenance -------------------------------------------------
  asset_url                       text not null,
  asset_name                      text,
  asset_meta                      jsonb not null default '{}'::jsonb, -- license/license_type/sha256/bucket/safe_for_text_overlay

  created_at                      timestamptz not null default now(),
  updated_at                      timestamptz not null default now()
);
comment on table c.shared_creative_asset is
  'cc-0041 Option B: shared/generic governed assets (global_generic/vertical_shared/purpose_bound). Client-bound assets remain in c.client_brand_asset. Born fenced (is_active/production_use_allowed=false, approval_status=intake_candidate). Service-role-only, non-REST-exposed. Read by the asset-gap analyzer''s shared-pool eligibility evaluator; promotion is the existing PK hard gate.';

create index shared_creative_asset_scope_kind_idx  on c.shared_creative_asset (governance_scope, asset_kind);
create index shared_creative_asset_vertical_idx    on c.shared_creative_asset (vertical_key);
create index shared_creative_asset_active_idx      on c.shared_creative_asset (is_active) where is_active = true;

alter table c.shared_creative_asset enable row level security;
revoke all on c.shared_creative_asset from public, anon, authenticated;   -- schema c grants anon/auth USAGE → explicit revoke required
grant select, insert, update, delete on c.shared_creative_asset to service_role;
grant select on c.shared_creative_asset to inspector_ro;                  -- read-path role (mirrors TMR-4 tag tables)

-- ────────────────────────────────────────────────────────────────────────────
-- 0B · c.client_asset_pool_policy — per-client pool policy (greenfield; no row ⇒ client_only)
-- ────────────────────────────────────────────────────────────────────────────
create table c.client_asset_pool_policy (
  client_id               uuid primary key references c.client(client_id) on delete cascade,
  pool_policy             text not null default 'client_only'
                            check (pool_policy in ('client_only','client_preferred','best_fit')),
  allow_vertical_shared   boolean not null default false,
  allow_global_shared     boolean not null default false,
  client_asset_score_bias numeric not null default 0,     -- ranking bias toward client-owned assets
  minimum_fit_score       numeric,                        -- floor below which an asset is not a HIT (null = no floor)
  policy_version          text not null default 'v1',
  updated_at              timestamptz not null default now()
);
comment on table c.client_asset_pool_policy is
  'cc-0041: per-client asset-pool policy. ABSENCE of a row ⇒ client_only (fail-safe; the exclusive-images toggle is UI/planned-only, not persisted elsewhere). Service-role-only, non-REST-exposed.';

alter table c.client_asset_pool_policy enable row level security;
revoke all on c.client_asset_pool_policy from public, anon, authenticated;   -- schema c anon/auth USAGE → explicit revoke required
grant select, insert, update, delete on c.client_asset_pool_policy to service_role;
grant select on c.client_asset_pool_policy to inspector_ro;

-- ────────────────────────────────────────────────────────────────────────────
-- 1 · m.asset_gap_suggestion — aggregated, client-specific demand queue
-- ────────────────────────────────────────────────────────────────────────────
create table m.asset_gap_suggestion (
  id                           uuid primary key default gen_random_uuid(),

  -- aggregation key (Artifact B — client-specific) -----------------------------
  appetite_signature           text not null,
  client_id                    uuid not null references c.client(client_id),
  client_pool_policy           text not null
                                 check (client_pool_policy in ('client_only','client_preferred','best_fit')),
  permitted_governance_scopes  text[] not null,     -- where the resolver was allowed to look
  preferred_scope_order        text[] not null,     -- how existing assets were ranked
  sourcing_target_scope        text not null
                                 check (sourcing_target_scope in
                                   ('global_generic','vertical_shared','client_scoped','purpose_bound')),
  vertical_key                 text,
  platform                     text,                -- fb/ig/li; null = agnostic
  format                       text not null,       -- format_key
  slot_kind                    text not null
                                 check (slot_kind in ('static_background','logo','image','video_broll')),
  appetite_descriptor          jsonb not null,      -- canonical appetite (evidence, not authority)
  why_needed                   text not null,       -- asset-only reason (no_governed_background/missing_required_logo/assets_fail_closed:*)

  -- dual-axis verdict (Artifact A) ---------------------------------------------
  primary_route                text not null
                                 check (primary_route in ('system_error','template_gap','governance_gap','asset_gap')),
  asset_gap_detected           boolean not null,
  asset_gap_drainability       text not null
                                 check (asset_gap_drainability in
                                   ('drainable','blocked_by_template','blocked_by_governance','triage_only')),

  -- lifecycle (Artifact F) -----------------------------------------------------
  status                       text not null default 'open'
                                 check (status in
                                   ('open','queued','harvesting','candidates_ready','resolved','dismissed','failed')),

  -- aggregation counters -------------------------------------------------------
  demand_count                 int not null default 1,
  priority_score               numeric,              -- derived; not scored this lane
  first_seen_at                timestamptz not null default now(),
  last_seen_at                 timestamptz not null default now(),
  latest_source_post_id        uuid references m.post_draft(post_draft_id) on delete set null,
  source_of_demand             text,                 -- latest analyzer run/batch id

  -- queue-safety fields --------------------------------------------------------
  analyzer_version             text,
  inventory_policy_version     text,
  attempt_count                int not null default 0,
  next_retry_at                timestamptz,
  claimed_by                   text,
  claim_expires_at             timestamptz,
  last_error_code              text,

  -- harvest linkage (pointers only — NOT approvals) ----------------------------
  harvest_manifest_ref         text,
  candidates_ref               text,                 -- fenced harvest package pointer (set at candidates_ready)
  -- D-d RESOLVED (db-rls-auditor must-fix): the promoted asset that made the recheck HIT can live in
  -- EITHER parent (Option B) → split + real FKs + XOR, restoring referential integrity a bare uuid lacked.
  resolved_client_asset_id     uuid references c.client_brand_asset(asset_id) on delete set null,
  resolved_shared_asset_id     uuid references c.shared_creative_asset(id)    on delete set null,
  dismissed_reason             text,

  created_at                   timestamptz not null default now(),
  updated_at                   timestamptz not null default now(),

  -- a drainable row must be an actual asset_gap on a static_background slot (guards the drain query)
  constraint gap_drainable_requires_static_bg
    check (asset_gap_drainability <> 'drainable'
           or (asset_gap_detected = true and slot_kind = 'static_background')),
  -- resolved requires EXACTLY ONE promoted-asset pointer (XOR); non-resolved rows carry neither
  constraint gap_resolved_requires_one_asset
    check (
      case when status = 'resolved'
           then (resolved_client_asset_id is not null) <> (resolved_shared_asset_id is not null)
           else resolved_client_asset_id is null and resolved_shared_asset_id is null
      end)
);
comment on table m.asset_gap_suggestion is
  'cc-0041: aggregated per-client asset-demand queue. One live row per appetite_signature (partial-unique below). Dual-axis: primary_route (remediation) × asset_gap_detected/drainability (demand state). Drained (static_background only) via the governed image-harvester → image-reviewer → PK visual gate; candidate creation ≠ resolution. Carries NO license/sha (demand ≠ asset). Service-role-only, non-REST-exposed.';

-- Partial-unique: one LIVE row per signature. 'failed' is INCLUDED (db-rls-auditor must-fix) so a
-- failed row remains the single aggregation row and retry UPDATEs it in place — otherwise a fresh MISS
-- while a signature sits 'failed' would INSERT a duplicate. 'resolved'/'dismissed' stay OUT (re-open works).
-- Analyzer UPSERT MUST infer this partial index with the EXACT matching predicate:
--   INSERT ... ON CONFLICT (appetite_signature)
--     WHERE status IN ('open','queued','harvesting','candidates_ready','failed')
--     DO UPDATE SET demand_count = m.asset_gap_suggestion.demand_count + 1, last_seen_at = now(), ...
-- and the inserted row's status must itself be a live status for arbitration to fire. (A bare
-- ON CONFLICT (appetite_signature) errors — there is no TOTAL unique index, by design.)
create unique index asset_gap_suggestion_live_sig_uidx
  on m.asset_gap_suggestion (appetite_signature)
  where status in ('open','queued','harvesting','candidates_ready','failed');

-- Drain-query index — column order/direction matches Artifact-D ORDER BY (priority_score DESC NULLS LAST,
-- first_seen_at ASC) for an index-ordered scan.
create index asset_gap_suggestion_drain_idx
  on m.asset_gap_suggestion (status, slot_kind, asset_gap_drainability, priority_score desc nulls last, first_seen_at)
  where asset_gap_detected = true;
create index asset_gap_suggestion_client_idx          on m.asset_gap_suggestion (client_id);
create index asset_gap_suggestion_latest_post_idx     on m.asset_gap_suggestion (latest_source_post_id);
create index asset_gap_suggestion_resolved_client_idx on m.asset_gap_suggestion (resolved_client_asset_id);
create index asset_gap_suggestion_resolved_shared_idx on m.asset_gap_suggestion (resolved_shared_asset_id);

alter table m.asset_gap_suggestion enable row level security;
revoke all on m.asset_gap_suggestion from public, anon, authenticated;
grant select, insert, update, delete on m.asset_gap_suggestion to service_role;
grant select on m.asset_gap_suggestion to inspector_ro;

-- ────────────────────────────────────────────────────────────────────────────
-- 2 · m.asset_gap_observation — per-post evidence child (compact aggregate provenance)
-- ────────────────────────────────────────────────────────────────────────────
create table m.asset_gap_observation (
  id             uuid primary key default gen_random_uuid(),
  suggestion_id  uuid not null references m.asset_gap_suggestion(id) on delete cascade,
  source_post_id uuid references m.post_draft(post_draft_id) on delete set null,
  analyzer_run   text,
  observed_at    timestamptz not null default now(),
  evidence_codes text[] not null default '{}'   -- why_needed, primary_route, drainability observed for this post
);
comment on table m.asset_gap_observation is
  'cc-0041: per-observation evidence for m.asset_gap_suggestion (replaces a mutating sample_post_ids array). demand_count on the parent reconciles to count(*) of these children. Service-role-only, non-REST-exposed.';

create index asset_gap_observation_suggestion_idx  on m.asset_gap_observation (suggestion_id);
create index asset_gap_observation_post_idx        on m.asset_gap_observation (source_post_id);

alter table m.asset_gap_observation enable row level security;
revoke all on m.asset_gap_observation from public, anon, authenticated;
grant select, insert, update, delete on m.asset_gap_observation to service_role;
grant select on m.asset_gap_observation to inspector_ro;

commit;

-- ============================================================================
-- ROLLBACK (reference only — NOT executed here). Drop in reverse dependency order.
-- ============================================================================
--   drop table if exists m.asset_gap_observation;
--   drop table if exists m.asset_gap_suggestion;
--   drop table if exists c.client_asset_pool_policy;
--   drop table if exists c.shared_creative_asset;
-- ============================================================================
