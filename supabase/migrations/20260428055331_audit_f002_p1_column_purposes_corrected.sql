-- Audit closure: F-2026-04-28-D-002 — P1 column purposes (behaviour-control)
-- Source: docs/audit/snapshots/columns/2026-04-28-p1-proposals.md
-- Corrections per ChatGPT review of CC's Phase A output:
--   * 4 LOW-confidence rows removed (deferred to operator-written follow-up
--     — see docs/audit/decisions/f002_p1_low_confidence_followup.md)
--   * 7 row wordings edited for safety/clarity (consent, voice-clone, r6_enabled,
--     use_markdown, is_featured, external_reviewer paused-state references)
--   * Post-apply verification raises if updated count != 79
-- Applied: 2026-04-28 via Supabase MCP apply_migration (per D170).
-- Supersedes: supabase/migrations/20260428143000_audit_f002_p1_column_purposes.sql
--             (CC draft, never applied; preserved for audit trail).

DO $audit_phase_a$
DECLARE
  expected_count CONSTANT integer := 79;
  actual_count integer;
BEGIN

-- ── c.brand_avatar ───────────────────────────────────────────────
UPDATE k.column_registry SET column_purpose = $cp$Source class of the avatar's visual identity. 'stock' = HeyGen-stock avatar selected by ID; values for custom/generated avatars exist in design (e.g. 'custom', 'generated') but only 'stock' has been populated to date.$cp$, updated_at = NOW()
WHERE table_id = (SELECT table_id FROM k.table_registry WHERE schema_name = 'c' AND table_name = 'brand_avatar') AND column_name = 'avatar_type';

UPDATE k.column_registry SET column_purpose = $cp$Whether this avatar record is currently active for the client. Inactive rows preserve avatar generation history but are not selected for video synthesis.$cp$, updated_at = NOW()
WHERE table_id = (SELECT table_id FROM k.table_registry WHERE schema_name = 'c' AND table_name = 'brand_avatar') AND column_name = 'is_active';

-- EDITED per ChatGPT review: original wording implied false=no consent needed
UPDATE k.column_registry SET column_purpose = $cp$Whether this avatar requires an explicit consent check before use in published video. False means this row is not gated by this column's consent workflow; it does not override any separate legal, client, or platform consent requirement.$cp$, updated_at = NOW()
WHERE table_id = (SELECT table_id FROM k.table_registry WHERE schema_name = 'c' AND table_name = 'brand_avatar') AND column_name = 'consent_required';

-- REMOVED 1/4: c.brand_avatar.avatar_gen_status (LOW confidence — only 'empty' observed)

-- ── c.brand_stakeholder ────────────────────────────────────────────
UPDATE k.column_registry SET column_purpose = $cp$Whether this stakeholder persona is currently active for the client. Inactive personas remain as historical records but are not used for new avatar generation.$cp$, updated_at = NOW()
WHERE table_id = (SELECT table_id FROM k.table_registry WHERE schema_name = 'c' AND table_name = 'brand_stakeholder') AND column_name = 'is_active';

-- ── c.client ─────────────────────────────────────────────────────────
UPDATE k.column_registry SET column_purpose = $cp$Client lifecycle status. 'active' = ICE produces and publishes content for this client. Other values such as 'inactive' or 'churned' may exist to suspend without deletion (no rows observed yet).$cp$, updated_at = NOW()
WHERE table_id = (SELECT table_id FROM k.table_registry WHERE schema_name = 'c' AND table_name = 'client') AND column_name = 'status';

UPDATE k.column_registry SET column_purpose = $cp$Whether the client has access to the operator portal at portal.invegent.com for self-service draft review and approval. False clients are managed entirely by the ICE operator.$cp$, updated_at = NOW()
WHERE table_id = (SELECT table_id FROM k.table_registry WHERE schema_name = 'c' AND table_name = 'client') AND column_name = 'portal_enabled';

UPDATE k.column_registry SET column_purpose = $cp$Whether the client provides services to NDIS participants. Drives compliance scoping — content for NDIS-serving clients runs through advertising-rule checks specific to NDIS participant communications.$cp$, updated_at = NOW()
WHERE table_id = (SELECT table_id FROM k.table_registry WHERE schema_name = 'c' AND table_name = 'client') AND column_name = 'serves_ndis_participants';

UPDATE k.column_registry SET column_purpose = $cp$Client's NDIS provider registration state. 'registered' = registered NDIS provider (currently the only observed value); other values such as 'unregistered' or 'pending' may capture self-managed providers or applications in progress.$cp$, updated_at = NOW()
WHERE table_id = (SELECT table_id FROM k.table_registry WHERE schema_name = 'c' AND table_name = 'client') AND column_name = 'ndis_registration_status';

-- ── c.client_ai_profile ────────────────────────────────────────────
UPDATE k.column_registry SET column_purpose = $cp$Profile lifecycle status. 'active' = used by the ai-worker fallback path when no client_brand_profile exists. Legacy table being superseded by c.client_brand_profile but retained for backward compatibility.$cp$, updated_at = NOW()
WHERE table_id = (SELECT table_id FROM k.table_registry WHERE schema_name = 'c' AND table_name = 'client_ai_profile') AND column_name = 'status';

UPDATE k.column_registry SET column_purpose = $cp$Whether this is the default legacy AI profile for the client when multiple legacy rows exist. ai-worker selects the is_default row when falling back to this table.$cp$, updated_at = NOW()
WHERE table_id = (SELECT table_id FROM k.table_registry WHERE schema_name = 'c' AND table_name = 'client_ai_profile') AND column_name = 'is_default';

-- ── c.client_audience_policy ───────────────────────────────────────
UPDATE k.column_registry SET column_purpose = $cp$Platforms where ICE may build audiences and run boost campaigns. Currently 'meta' (Facebook + Instagram via Meta Ads) is the only observed value; LinkedIn / YouTube ads platforms may be added later.$cp$, updated_at = NOW()
WHERE table_id = (SELECT table_id FROM k.table_registry WHERE schema_name = 'c' AND table_name = 'client_audience_policy') AND column_name = 'platforms_enabled';

UPDATE k.column_registry SET column_purpose = $cp$Audience source types ICE is allowed to build for this client. Values include 'email_list', 'page_engagers', 'video_viewers', 'website_visitors' — each maps to a Meta Ads custom-audience source.$cp$, updated_at = NOW()
WHERE table_id = (SELECT table_id FROM k.table_registry WHERE schema_name = 'c' AND table_name = 'client_audience_policy') AND column_name = 'audience_types_enabled';

UPDATE k.column_registry SET column_purpose = $cp$Whether ICE captures email addresses from client touchpoints (e.g. lead forms) to seed the email_list audience type.$cp$, updated_at = NOW()
WHERE table_id = (SELECT table_id FROM k.table_registry WHERE schema_name = 'c' AND table_name = 'client_audience_policy') AND column_name = 'email_capture_enabled';

UPDATE k.column_registry SET column_purpose = $cp$Whether ICE auto-creates lookalike audiences when a seed audience reaches its activation threshold, without requiring operator approval.$cp$, updated_at = NOW()
WHERE table_id = (SELECT table_id FROM k.table_registry WHERE schema_name = 'c' AND table_name = 'client_audience_policy') AND column_name = 'lookalike_auto_create';

-- ── c.client_avatar_profile ───────────────────────────────────────────
-- REMOVED 2/4: c.client_avatar_profile.avatar_status (LOW confidence — no populated rows)

-- EDITED per ChatGPT review: original equated "enabled" with "consented"
UPDATE k.column_registry SET column_purpose = $cp$Whether custom voice-clone use is enabled for this client avatar profile. This flag should not be treated as the consent record itself; consent evidence should be tracked separately where required.$cp$, updated_at = NOW()
WHERE table_id = (SELECT table_id FROM k.table_registry WHERE schema_name = 'c' AND table_name = 'client_avatar_profile') AND column_name = 'voice_clone_enabled';

-- ── c.client_brand_asset ──────────────────────────────────────────────
-- REMOVED 3/4: c.client_brand_asset.asset_type (LOW confidence — no populated rows)

UPDATE k.column_registry SET column_purpose = $cp$Whether this brand asset is currently active and selectable by image-worker for visual composition.$cp$, updated_at = NOW()
WHERE table_id = (SELECT table_id FROM k.table_registry WHERE schema_name = 'c' AND table_name = 'client_brand_asset') AND column_name = 'is_active';

-- ── c.client_brand_profile ───────────────────────────────────────────────
UPDATE k.column_registry SET column_purpose = $cp$Whether the brand profile expresses a dynamic audience treatment (avatars/voice changing per persona) versus a single fixed brand voice. Drives whether ai-worker applies persona-specific overrides per draft.$cp$, updated_at = NOW()
WHERE table_id = (SELECT table_id FROM k.table_registry WHERE schema_name = 'c' AND table_name = 'client_brand_profile') AND column_name = 'audience_is_dynamic';

UPDATE k.column_registry SET column_purpose = $cp$Whether c.client_brand_profile.system_prompt should override the default system-prompt scaffolding in ai-worker assemblePrompts(). True = profile prompt replaces defaults; false = profile prompt is appended to defaults.$cp$, updated_at = NOW()
WHERE table_id = (SELECT table_id FROM k.table_registry WHERE schema_name = 'c' AND table_name = 'client_brand_profile') AND column_name = 'use_prompt_override';

UPDATE k.column_registry SET column_purpose = $cp$Whether this brand profile version is the currently active row used by ai-worker. Only one row per client should be is_active=true; older versions retained for audit.$cp$, updated_at = NOW()
WHERE table_id = (SELECT table_id FROM k.table_registry WHERE schema_name = 'c' AND table_name = 'client_brand_profile') AND column_name = 'is_active';

UPDATE k.column_registry SET column_purpose = $cp$Persona delivery mode for the client's content. 'voiceover_only' = no on-screen presenter, voice over visuals; 'hybrid_operator_and_avatar' = synthetic avatar performs in some content while real operator footage is used in other content.$cp$, updated_at = NOW()
WHERE table_id = (SELECT table_id FROM k.table_registry WHERE schema_name = 'c' AND table_name = 'client_brand_profile') AND column_name = 'persona_type';

UPDATE k.column_registry SET column_purpose = $cp$Whether the persona uses a dialogue/conversational tone (multi-speaker or Q&A) versus a single-narrator monologue style.$cp$, updated_at = NOW()
WHERE table_id = (SELECT table_id FROM k.table_registry WHERE schema_name = 'c' AND table_name = 'client_brand_profile') AND column_name = 'persona_dialogue_mode';

-- ── c.client_channel ────────────────────────────────────────────────────
UPDATE k.column_registry SET column_purpose = $cp$Master enable/disable for the client's connection to a given platform. When false, ICE does not display this channel in the dashboard or treat it as published-to. Independent of c.client_publish_profile.publish_enabled (which gates the publisher specifically).$cp$, updated_at = NOW()
WHERE table_id = (SELECT table_id FROM k.table_registry WHERE schema_name = 'c' AND table_name = 'client_channel') AND column_name = 'is_enabled';

-- ── c.client_channel_allocation ────────────────────────────────────────
UPDATE k.column_registry SET column_purpose = $cp$Whether this client x platform allocation is currently active. Determines which platforms ICE publishes to per client (e.g. NDIS-Yarns includes Facebook + LinkedIn, excludes Instagram).$cp$, updated_at = NOW()
WHERE table_id = (SELECT table_id FROM k.table_registry WHERE schema_name = 'c' AND table_name = 'client_channel_allocation') AND column_name = 'is_active';

-- ── c.client_class_fitness_override ───────────────────────────────────
UPDATE k.column_registry SET column_purpose = $cp$Whether this override is the currently effective row for the client. Older rows retained for history; only the is_current row is read by the format advisor when scoring class-format fit for this client.$cp$, updated_at = NOW()
WHERE table_id = (SELECT table_id FROM k.table_registry WHERE schema_name = 'c' AND table_name = 'client_class_fitness_override') AND column_name = 'is_current';

-- ── c.client_content_scope ───────────────────────────────────────────────
UPDATE k.column_registry SET column_purpose = $cp$Whether this vertical is the client's primary vertical. The is_primary=true row determines which vertical_slug ai-worker uses for compliance rule loading; secondary verticals influence bundler scoring but not compliance scoping.$cp$, updated_at = NOW()
WHERE table_id = (SELECT table_id FROM k.table_registry WHERE schema_name = 'c' AND table_name = 'client_content_scope') AND column_name = 'is_primary';

-- ── c.client_dedup_policy ────────────────────────────────────────────────
UPDATE k.column_registry SET column_purpose = $cp$Whether this dedup policy override row is currently effective for the client. Older rows retained for audit; only the is_current row is read by the bundler when applying dedup rules for this client.$cp$, updated_at = NOW()
WHERE table_id = (SELECT table_id FROM k.table_registry WHERE schema_name = 'c' AND table_name = 'client_dedup_policy') AND column_name = 'is_current';

-- ── c.client_digest_policy ───────────────────────────────────────────────
UPDATE k.column_registry SET column_purpose = $cp$Bundler scoring threshold mode. 'strict' = high score floor, fewer items qualify per bundle; 'lenient' = lower threshold, larger bundles. The numeric thresholds are bundler-side parameters keyed off this mode.$cp$, updated_at = NOW()
WHERE table_id = (SELECT table_id FROM k.table_registry WHERE schema_name = 'c' AND table_name = 'client_digest_policy') AND column_name = 'mode';

UPDATE k.column_registry SET column_purpose = $cp$Whether bundles may include items whose canonical body is paywalled (resolution_status = 'give_up_paywalled'). When false, paywalled items are excluded from bundles even if otherwise high-scoring.$cp$, updated_at = NOW()
WHERE table_id = (SELECT table_id FROM k.table_registry WHERE schema_name = 'c' AND table_name = 'client_digest_policy') AND column_name = 'allow_paywalled';

UPDATE k.column_registry SET column_purpose = $cp$Whether bundles may include items whose canonical body is blocked by source-side bot detection (resolution_status = 'give_up_blocked'). Default false — blocked bodies offer no usable text for ai-worker.$cp$, updated_at = NOW()
WHERE table_id = (SELECT table_id FROM k.table_registry WHERE schema_name = 'c' AND table_name = 'client_digest_policy') AND column_name = 'allow_blocked';

UPDATE k.column_registry SET column_purpose = $cp$Whether bundles may include items whose canonical body has not been fetched (resolution_status not yet 'success'). When false, the bundler waits for body retrieval before considering the item — slower but ensures ai-worker has full text.$cp$, updated_at = NOW()
WHERE table_id = (SELECT table_id FROM k.table_registry WHERE schema_name = 'c' AND table_name = 'client_digest_policy') AND column_name = 'allow_missing_body';

-- ── c.client_format_config ───────────────────────────────────────────────
UPDATE k.column_registry SET column_purpose = $cp$Whether the client has explicitly enabled this ice_format_key on this platform. When no row exists for a format, all buildable formats are available by default; an explicit row with is_enabled=false hard-disables the format for this client.$cp$, updated_at = NOW()
WHERE table_id = (SELECT table_id FROM k.table_registry WHERE schema_name = 'c' AND table_name = 'client_format_config') AND column_name = 'is_enabled';

-- ── c.client_format_mix_override ──────────────────────────────────────────
UPDATE k.column_registry SET column_purpose = $cp$Whether this format-mix override is the currently effective row for the client. Older rows retained for history.$cp$, updated_at = NOW()
WHERE table_id = (SELECT table_id FROM k.table_registry WHERE schema_name = 'c' AND table_name = 'client_format_mix_override') AND column_name = 'is_current';

-- ── c.client_match_weights ───────────────────────────────────────────────
UPDATE k.column_registry SET column_purpose = $cp$Whether this signal-scoring weights row is the currently effective configuration for the client (controlling vertical fit / recency / freshness mix). Older rows retained for audit.$cp$, updated_at = NOW()
WHERE table_id = (SELECT table_id FROM k.table_registry WHERE schema_name = 'c' AND table_name = 'client_match_weights') AND column_name = 'is_current';

-- ── c.client_platform_profile ───────────────────────────────────────────
UPDATE k.column_registry SET column_purpose = $cp$Whether ai-worker should include hashtags in drafts for this client x platform. Driven by platform conventions (Instagram yes, LinkedIn often no) and brand preference.$cp$, updated_at = NOW()
WHERE table_id = (SELECT table_id FROM k.table_registry WHERE schema_name = 'c' AND table_name = 'client_platform_profile') AND column_name = 'use_hashtags';

-- EDITED per ChatGPT review: removed brittle platform assumption
UPDATE k.column_registry SET column_purpose = $cp$Whether ICE is configured to emit markdown-style formatting for drafts on this client x platform. Downstream publisher/platform rendering determines how that formatting appears.$cp$, updated_at = NOW()
WHERE table_id = (SELECT table_id FROM k.table_registry WHERE schema_name = 'c' AND table_name = 'client_platform_profile') AND column_name = 'use_markdown';

UPDATE k.column_registry SET column_purpose = $cp$Whether this platform profile version is the currently active row read by ai-worker assemblePrompts(). Only one row per (client, platform) should be is_active=true; older versions retained for audit.$cp$, updated_at = NOW()
WHERE table_id = (SELECT table_id FROM k.table_registry WHERE schema_name = 'c' AND table_name = 'client_platform_profile') AND column_name = 'is_active';

-- ── c.client_publish_profile ────────────────────────────────────────────
UPDATE k.column_registry SET column_purpose = $cp$Publish profile lifecycle status. 'active' = current row used by publisher (only observed value). Other values such as 'inactive' or 'archived' may exist for retired credentials but are not exercised today.$cp$, updated_at = NOW()
WHERE table_id = (SELECT table_id FROM k.table_registry WHERE schema_name = 'c' AND table_name = 'client_publish_profile') AND column_name = 'status';

UPDATE k.column_registry SET column_purpose = $cp$Publishing mode. 'auto' = approved drafts publish on schedule automatically. 'manual' = approved drafts wait in queue for a human trigger. 'staging' = nothing publishes (test mode). NULL = unconfigured (publisher skips). Allowed set enforced by public.update_publish_profile_toggle RPC.$cp$, updated_at = NOW()
WHERE table_id = (SELECT table_id FROM k.table_registry WHERE schema_name = 'c' AND table_name = 'client_publish_profile') AND column_name = 'mode';

UPDATE k.column_registry SET column_purpose = $cp$Default-row indicator. The table has a UNIQUE(client_id, platform) constraint so there is only ever one row per client x platform; this column is likely vestigial from an earlier schema where multiple credential sets per platform were possible. Treat as informational pending operator decision on deprecation.$cp$, updated_at = NOW()
WHERE table_id = (SELECT table_id FROM k.table_registry WHERE schema_name = 'c' AND table_name = 'client_publish_profile') AND column_name = 'is_default';

UPDATE k.column_registry SET column_purpose = $cp$Master toggle for whether the publisher will pick up queue items for this client x platform. When false, drafts may still be generated and queued but the publisher skips them.$cp$, updated_at = NOW()
WHERE table_id = (SELECT table_id FROM k.table_registry WHERE schema_name = 'c' AND table_name = 'client_publish_profile') AND column_name = 'publish_enabled';

UPDATE k.column_registry SET column_purpose = $cp$Whether drafts targeting this client x platform are auto-approved on creation (skipping the human review step) before entering the publish queue.$cp$, updated_at = NOW()
WHERE table_id = (SELECT table_id FROM k.table_registry WHERE schema_name = 'c' AND table_name = 'client_publish_profile') AND column_name = 'auto_approve_enabled';

UPDATE k.column_registry SET column_purpose = $cp$Whether image-worker should generate visuals for drafts targeting this client x platform. When false, drafts publish as text-only.$cp$, updated_at = NOW()
WHERE table_id = (SELECT table_id FROM k.table_registry WHERE schema_name = 'c' AND table_name = 'client_publish_profile') AND column_name = 'image_generation_enabled';

UPDATE k.column_registry SET column_purpose = $cp$Whether video-worker should generate video assets for drafts targeting this client x platform. Independent of image_generation_enabled.$cp$, updated_at = NOW()
WHERE table_id = (SELECT table_id FROM k.table_registry WHERE schema_name = 'c' AND table_name = 'client_publish_profile') AND column_name = 'video_generation_enabled';

UPDATE k.column_registry SET column_purpose = $cp$Whether drafts require explicit client approval (via portal) before publishing, in addition to operator approval. True clients see drafts in their portal queue; false clients have publishing fully managed by the operator.$cp$, updated_at = NOW()
WHERE table_id = (SELECT table_id FROM k.table_registry WHERE schema_name = 'c' AND table_name = 'client_publish_profile') AND column_name = 'require_client_approval';

-- EDITED per ChatGPT review: softened to avoid baking specific pipeline behaviour
UPDATE k.column_registry SET column_purpose = $cp$Whether this client x platform is enabled for the R6-era publishing path. Exact downstream behaviour should be read from the publisher/slot pipeline; false leaves the profile outside that path.$cp$, updated_at = NOW()
WHERE table_id = (SELECT table_id FROM k.table_registry WHERE schema_name = 'c' AND table_name = 'client_publish_profile') AND column_name = 'r6_enabled';

-- ── c.client_publish_schedule ───────────────────────────────────────────
UPDATE k.column_registry SET column_purpose = $cp$Whether this scheduled time slot is currently active. Disabled slots are preserved for history but not used by the publisher when assigning scheduled_for.$cp$, updated_at = NOW()
WHERE table_id = (SELECT table_id FROM k.table_registry WHERE schema_name = 'c' AND table_name = 'client_publish_schedule') AND column_name = 'enabled';

-- ── c.client_registration_group ────────────────────────────────────────
UPDATE k.column_registry SET column_purpose = $cp$Whether the client has explicitly confirmed they hold this NDIS registration group (vs being inferred from profession_slug or other heuristics).$cp$, updated_at = NOW()
WHERE table_id = (SELECT table_id FROM k.table_registry WHERE schema_name = 'c' AND table_name = 'client_registration_group') AND column_name = 'confirmed_by_client';

UPDATE k.column_registry SET column_purpose = $cp$Whether this registration-group attribution was inferred from the client's profession_slug rather than directly confirmed by the client. Used to track inference confidence — true rows may be overruled when the client confirms their actual groups.$cp$, updated_at = NOW()
WHERE table_id = (SELECT table_id FROM k.table_registry WHERE schema_name = 'c' AND table_name = 'client_registration_group') AND column_name = 'inferred_from_profession';

-- ── c.client_service_agreement ──────────────────────────────────────────
UPDATE k.column_registry SET column_purpose = $cp$Service agreement lifecycle. 'active' = current binding agreement. Other values such as 'pending' (drafted, awaiting signature) or 'expired' may exist but are not currently observed.$cp$, updated_at = NOW()
WHERE table_id = (SELECT table_id FROM k.table_registry WHERE schema_name = 'c' AND table_name = 'client_service_agreement') AND column_name = 'status';

-- ── c.client_source ────────────────────────────────────────────────────
UPDATE k.column_registry SET column_purpose = $cp$Whether this client x feed source assignment is currently enabled. The bundler reads only is_enabled=true rows when scoring content for this client; disabling preserves the assignment row but stops use without deletion.$cp$, updated_at = NOW()
WHERE table_id = (SELECT table_id FROM k.table_registry WHERE schema_name = 'c' AND table_name = 'client_source') AND column_name = 'is_enabled';

-- ── c.client_support_item ───────────────────────────────────────────────
-- EDITED per ChatGPT review: softened to not assume specific downstream weighting
UPDATE k.column_registry SET column_purpose = $cp$Whether this support item is marked as featured for the client. Featured items may be used for display, prioritisation, or content-selection weighting depending on downstream logic.$cp$, updated_at = NOW()
WHERE table_id = (SELECT table_id FROM k.table_registry WHERE schema_name = 'c' AND table_name = 'client_support_item') AND column_name = 'is_featured';

-- ── c.content_series ────────────────────────────────────────────────────
UPDATE k.column_registry SET column_purpose = $cp$Series lifecycle status. Observed values: 'outline_ready', 'active'. Documented design (per table_purpose) spans 'draft' → 'outline_approved' → 'in_production' → 'complete' — production data and design have diverged; full state machine should be reconciled separately.$cp$, updated_at = NOW()
WHERE table_id = (SELECT table_id FROM k.table_registry WHERE schema_name = 'c' AND table_name = 'content_series') AND column_name = 'status';

-- ── c.content_series_episode ────────────────────────────────────────────
UPDATE k.column_registry SET column_purpose = $cp$Call-to-action type for the episode. 'comment' / 'question' / 'save' / 'share' map to the post's intended audience action; ai-worker shapes the closing line accordingly.$cp$, updated_at = NOW()
WHERE table_id = (SELECT table_id FROM k.table_registry WHERE schema_name = 'c' AND table_name = 'content_series_episode') AND column_name = 'cta_type';

UPDATE k.column_registry SET column_purpose = $cp$Episode lifecycle status. Observed values: 'outline', 'draft_ready'. Documented design (per table_purpose) spans 'planned' → 'draft_created' → 'approved' → 'published' — production data and design have diverged; full state machine should be reconciled separately.$cp$, updated_at = NOW()
WHERE table_id = (SELECT table_id FROM k.table_registry WHERE schema_name = 'c' AND table_name = 'content_series_episode') AND column_name = 'status';

-- ── c.content_type_prompt ───────────────────────────────────────────────
UPDATE k.column_registry SET column_purpose = $cp$Job type the prompt applies to. 'rewrite_v1' = single-item rewrite; 'synth_bundle_v1' = multi-item digest synthesis; 'promo_v1' = promotional content. New job_types may emerge as ai-worker capabilities expand; the v1 suffix supports versioning per D175.$cp$, updated_at = NOW()
WHERE table_id = (SELECT table_id FROM k.table_registry WHERE schema_name = 'c' AND table_name = 'content_type_prompt') AND column_name = 'job_type';

UPDATE k.column_registry SET column_purpose = $cp$Whether this custom prompt is currently active for the (client, platform, job_type) combination. Only one row per combination should be is_active=true; older versions retained for audit.$cp$, updated_at = NOW()
WHERE table_id = (SELECT table_id FROM k.table_registry WHERE schema_name = 'c' AND table_name = 'content_type_prompt') AND column_name = 'is_active';

-- ── c.external_reviewer ────────────────────────────────────────────────
-- EDITED per ChatGPT review: removed transient D156/D162 paused state from column purpose
UPDATE k.column_registry SET column_purpose = $cp$Whether this external reviewer identity is eligible for routing when the external reviewer layer is enabled.$cp$, updated_at = NOW()
WHERE table_id = (SELECT table_id FROM k.table_registry WHERE schema_name = 'c' AND table_name = 'external_reviewer') AND column_name = 'is_active';

-- ── c.external_reviewer_rule ─────────────────────────────────────────────
-- EDITED per ChatGPT review: removed transient D156/D162 paused state from column purpose
UPDATE k.column_registry SET column_purpose = $cp$Whether this reviewer routing rule is eligible for use when the external reviewer layer is enabled.$cp$, updated_at = NOW()
WHERE table_id = (SELECT table_id FROM k.table_registry WHERE schema_name = 'c' AND table_name = 'external_reviewer_rule') AND column_name = 'is_active';

-- ── c.onboarding_submission ───────────────────────────────────────────────
UPDATE k.column_registry SET column_purpose = $cp$Onboarding submission lifecycle. 'approved' = submission accepted and client created (only observed value). Other values such as 'pending' (operator review pending) or 'rejected' (declined to onboard) likely exist in design.$cp$, updated_at = NOW()
WHERE table_id = (SELECT table_id FROM k.table_registry WHERE schema_name = 'c' AND table_name = 'onboarding_submission') AND column_name = 'status';

UPDATE k.column_registry SET column_purpose = $cp$Whether the client acknowledges blackout windows (industry-event no-publish periods) during onboarding. Used by operator to set expectation that ICE pauses around major events.$cp$, updated_at = NOW()
WHERE table_id = (SELECT table_id FROM k.table_registry WHERE schema_name = 'c' AND table_name = 'onboarding_submission') AND column_name = 'blackout_awareness';

UPDATE k.column_registry SET column_purpose = $cp$Whether the client provided brand assets (logos, banners) at onboarding. Drives a follow-up step if false (operator collects assets manually).$cp$, updated_at = NOW()
WHERE table_id = (SELECT table_id FROM k.table_registry WHERE schema_name = 'c' AND table_name = 'onboarding_submission') AND column_name = 'has_brand_assets';

UPDATE k.column_registry SET column_purpose = $cp$Whether the client accepted the service agreement at submission. Required to proceed to client creation.$cp$, updated_at = NOW()
WHERE table_id = (SELECT table_id FROM k.table_registry WHERE schema_name = 'c' AND table_name = 'onboarding_submission') AND column_name = 'agreement_accepted';

-- ── c.platform_channel ───────────────────────────────────────────────────
UPDATE k.column_registry SET column_purpose = $cp$Delivery model for the channel offering. 'automated' = ICE auto-publishes per schedule (the standard mode for FB/IG/LinkedIn); 'manual_series' = content delivered as scheduled episodic series with operator pacing (e.g. multi-part campaigns).$cp$, updated_at = NOW()
WHERE table_id = (SELECT table_id FROM k.table_registry WHERE schema_name = 'c' AND table_name = 'platform_channel') AND column_name = 'delivery_mode';

UPDATE k.column_registry SET column_purpose = $cp$Whether this channel offering is currently sellable / available for inclusion in service packages. When false, the channel is preserved in the catalogue but cannot be added to a new package.$cp$, updated_at = NOW()
WHERE table_id = (SELECT table_id FROM k.table_registry WHERE schema_name = 'c' AND table_name = 'platform_channel') AND column_name = 'is_active';

-- ── c.service_package ───────────────────────────────────────────────────
UPDATE k.column_registry SET column_purpose = $cp$Whether this service package is the currently effective version (priced and offered today). Older versions retained for historical contracts; new packages should be created rather than mutating existing rows.$cp$, updated_at = NOW()
WHERE table_id = (SELECT table_id FROM k.table_registry WHERE schema_name = 'c' AND table_name = 'service_package') AND column_name = 'is_current';

-- ── c.service_package_channel ──────────────────────────────────────────────
UPDATE k.column_registry SET column_purpose = $cp$Whether this platform channel is included in the service package tier (vs available as an add-on). True = baked into the tier price; false = available as a paid add-on for clients on this tier.$cp$, updated_at = NOW()
WHERE table_id = (SELECT table_id FROM k.table_registry WHERE schema_name = 'c' AND table_name = 'service_package_channel') AND column_name = 'is_included';

-- ── f.canonical_content_body ────────────────────────────────────────────
UPDATE k.column_registry SET column_purpose = $cp$Most recent fetch attempt outcome for the canonical body. 'pending' = not yet fetched; 'success' = body retrieved and stored; 'paywalled' / 'blocked' / 'blocked_permanent' = source-side gate; 'error' / 'timeout' / 'stale' = transient or persistent failure; 'dead' = source returned 404 or marked permanently unreachable. Distinct from resolution_status which is the aggregated terminal state.$cp$, updated_at = NOW()
WHERE table_id = (SELECT table_id FROM k.table_registry WHERE schema_name = 'f' AND table_name = 'canonical_content_body') AND column_name = 'fetch_status';

UPDATE k.column_registry SET column_purpose = $cp$MIME type of the fetched body returned by the source HTTP response. Used by ingest normaliser to choose extraction strategy (JSON parse vs text extract).$cp$, updated_at = NOW()
WHERE table_id = (SELECT table_id FROM k.table_registry WHERE schema_name = 'f' AND table_name = 'canonical_content_body') AND column_name = 'content_type';

UPDATE k.column_registry SET column_purpose = $cp$Aggregated terminal state for the body retrieval lifecycle. 'active' = still trying (fetch_status may have transient values); 'success' = body retrieved and stored; 'give_up_*' = bundler treats this item as unusable from the named cause. resolution_status is the field client_digest_policy.allow_paywalled / allow_blocked / allow_missing_body interrogate.$cp$, updated_at = NOW()
WHERE table_id = (SELECT table_id FROM k.table_registry WHERE schema_name = 'f' AND table_name = 'canonical_content_body') AND column_name = 'resolution_status';

-- ── f.content_item ────────────────────────────────────────────────────
UPDATE k.column_registry SET column_purpose = $cp$Normalised content item type. 'article' is the dominant value (RSS/email articles); other values such as 'video', 'podcast', 'newsletter' may emerge as ingest sources expand to non-text-first formats.$cp$, updated_at = NOW()
WHERE table_id = (SELECT table_id FROM k.table_registry WHERE schema_name = 'f' AND table_name = 'content_item') AND column_name = 'content_type';

-- ── f.feed_discovery_seed ───────────────────────────────────────────────
UPDATE k.column_registry SET column_purpose = $cp$Seed type the discovery EF interprets. 'keyword' = rss.app keyword search across configured sites; 'url' = original site URL the operator wants an rss.app feed generated for. 'youtube_keyword' is also defined for YouTube discovery (not yet observed in data).$cp$, updated_at = NOW()
WHERE table_id = (SELECT table_id FROM k.table_registry WHERE schema_name = 'f' AND table_name = 'feed_discovery_seed') AND column_name = 'seed_type';

UPDATE k.column_registry SET column_purpose = $cp$Seed lifecycle status. 'pending' = awaiting next discovery cron run; 'provisioned' = rss.app feed created and feed_source_id populated; 'failed' = discovery EF could not provision (error_message set); 'paused' = operator-disabled, will not be retried. Per D180, transition to 'provisioned' triggers tg_auto_link_seed_to_client to insert into c.client_source for client-scoped seeds.$cp$, updated_at = NOW()
WHERE table_id = (SELECT table_id FROM k.table_registry WHERE schema_name = 'f' AND table_name = 'feed_discovery_seed') AND column_name = 'status';

-- ── f.feed_source ─────────────────────────────────────────────────────
UPDATE k.column_registry SET column_purpose = $cp$Source type classifier. Drives which normaliser ingest-worker applies and what config keys are expected (e.g. rss_app expects config->>'feed_url'; email_newsletter expects a Gmail label; youtube_channel expects a channel handle).$cp$, updated_at = NOW()
WHERE table_id = (SELECT table_id FROM k.table_registry WHERE schema_name = 'f' AND table_name = 'feed_source') AND column_name = 'source_type_code';

UPDATE k.column_registry SET column_purpose = $cp$Output category emitted by ingest from this source. 'content_item' = normalised articles/posts (most rss/email feeds); 'metrics' = scalar metric snapshots (page-follower counts etc.); 'timeseries' = time-bucketed metric points; 'youtube_inspiration' = YouTube channel signals used for content ideation, not direct republishing.$cp$, updated_at = NOW()
WHERE table_id = (SELECT table_id FROM k.table_registry WHERE schema_name = 'f' AND table_name = 'feed_source') AND column_name = 'output_kind';

UPDATE k.column_registry SET column_purpose = $cp$Feed source lifecycle. 'active' = polled by ingest-worker on schedule; 'paused' / 'inactive' = temporarily disabled (config retained); 'deprecated' = retained for history, not polled.$cp$, updated_at = NOW()
WHERE table_id = (SELECT table_id FROM k.table_registry WHERE schema_name = 'f' AND table_name = 'feed_source') AND column_name = 'status';

-- ── f.ingest_run ───────────────────────────────────────────────────────
UPDATE k.column_registry SET column_purpose = $cp$Ingest run terminal state. 'running' = still in flight; 'success' = completed without fatal error (the run still records error_count for transient per-item failures). Failure states such as 'error' or 'timeout' are likely in design but not observed in current data.$cp$, updated_at = NOW()
WHERE table_id = (SELECT table_id FROM k.table_registry WHERE schema_name = 'f' AND table_name = 'ingest_run') AND column_name = 'status';

UPDATE k.column_registry SET column_purpose = $cp$What kicked off the ingest run. 'schedule' = cron-driven (default); 'manual' = operator-triggered (e.g. via direct Edge Function call during recovery).$cp$, updated_at = NOW()
WHERE table_id = (SELECT table_id FROM k.table_registry WHERE schema_name = 'f' AND table_name = 'ingest_run') AND column_name = 'trigger_type';

-- REMOVED 4/4: f.raw_metric_point.entity_type (LOW confidence — no populated rows)

-- ── f.video_analysis ────────────────────────────────────────────────────
UPDATE k.column_registry SET column_purpose = $cp$Whether the video analysis pipeline successfully extracted a transcript. When true, transcript text is available in the analysis JSONB; when false, transcript extraction failed or was skipped.$cp$, updated_at = NOW()
WHERE table_id = (SELECT table_id FROM k.table_registry WHERE schema_name = 'f' AND table_name = 'video_analysis') AND column_name = 'has_transcript';

UPDATE k.column_registry SET column_purpose = $cp$Classification produced by video-analysis. 'case_study' / 'explainer' / 'tutorial' reflect the video's intent; 'unknown' = classifier could not assign confidently.$cp$, updated_at = NOW()
WHERE table_id = (SELECT table_id FROM k.table_registry WHERE schema_name = 'f' AND table_name = 'video_analysis') AND column_name = 'video_type';

-- Post-apply verification (ChatGPT review recommendation)
SELECT COUNT(*)::int INTO actual_count
FROM k.column_registry cr
JOIN k.table_registry tr ON tr.table_id = cr.table_id
WHERE tr.schema_name IN ('c','f')
  AND cr.column_purpose IS NOT NULL
  AND cr.column_purpose <> 'PENDING_DOCUMENTATION'
  AND cr.updated_at >= NOW() - INTERVAL '2 minutes';

IF actual_count <> expected_count THEN
  RAISE EXCEPTION 'F-002 P1 verification failed: expected % updates within last 2 min, got %', expected_count, actual_count;
END IF;

RAISE NOTICE 'F-002 P1 verification passed: % rows updated as expected', actual_count;

END;
$audit_phase_a$;
