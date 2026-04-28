# F-002 Column Proposals — P1 Behaviour-Control

**Generated:** 2026-04-28 by Claude Code (Opus 4.7)
**Phase:** A (P1 — booleans + enum status/mode/kind/type text + behaviour flags)
**Total columns:** 83 (69 in `c`, 14 in `f`)
**Confidence distribution:** HIGH 62 (75%) · MEDIUM 17 (20%) · LOW 4 (5%) — under the >80% HIGH ceiling per brief V5
**Schema-verified columns:** 33 (40%) — distinct values queried for every text-enum column and both array columns; booleans relied on column name + table_purpose

Migration target: `supabase/migrations/20260428143000_audit_f002_p1_column_purposes.sql` (chat applies via Supabase MCP per D170).

---

## c.brand_avatar.avatar_type
- **Type:** text · **Nullable:** false · **FK:** none
- **Sample distinct values:** ['stock'] (28 rows; only one value observed)
- **Table purpose:** Per-stakeholder, per-client synthetic avatar generation records via HeyGen.
- **Proposed column_purpose:** "Source class of the avatar's visual identity. 'stock' = HeyGen-stock avatar selected by ID; values for custom/generated avatars exist in design (e.g. 'custom', 'generated') but only 'stock' has been populated to date."
- **Confidence:** MEDIUM
- **Reasoning:** Only one observed value; table purpose implies a wider set is supported by the HeyGen pipeline. Hedging while accurately noting what's live.

## c.brand_avatar.is_active
- **Type:** boolean · **Nullable:** true · **FK:** none
- **Sample distinct values:** N/A (boolean)
- **Table purpose:** Per-stakeholder, per-client synthetic avatar generation records.
- **Proposed column_purpose:** "Whether this avatar record is currently active for the client. Inactive rows preserve avatar generation history but are not selected for video synthesis."
- **Confidence:** HIGH
- **Reasoning:** Canonical is_active pattern matched by the table's lifecycle-tracking purpose.

## c.brand_avatar.consent_required
- **Type:** boolean · **Nullable:** true · **FK:** none
- **Sample distinct values:** N/A (boolean)
- **Table purpose:** Per-stakeholder synthetic avatar generation records — including consent management.
- **Proposed column_purpose:** "Whether stakeholder consent must be captured/verified before this synthetic avatar is used in published video. False permits use without an explicit consent artefact (e.g. internal-only stakeholder)."
- **Confidence:** HIGH
- **Reasoning:** Table_purpose explicitly mentions consent management; column name aligns.

## c.brand_avatar.avatar_gen_status
- **Type:** text · **Nullable:** true · **FK:** none
- **Sample distinct values:** ['empty'] (28 rows; only one value observed)
- **Table purpose:** Tracks the full generation lifecycle (status, errors, image set).
- **Proposed column_purpose:** "Lifecycle of the avatar generation job at HeyGen. 'empty' is the only observed value to date — additional states such as 'pending', 'generating', 'ready', 'failed' are likely in design; full set should be confirmed against HeyGen worker code if precision matters."
- **Confidence:** LOW
- **Reasoning:** Single observed value, no observed transitions; lifecycle implied by table_purpose but not exercised in production.

---

## c.brand_stakeholder.is_active
- **Type:** boolean · **Nullable:** true · **FK:** none
- **Table purpose:** Per-client persona definitions used as the basis for generating synthetic avatars.
- **Proposed column_purpose:** "Whether this stakeholder persona is currently active for the client. Inactive personas remain as historical records but are not used for new avatar generation."
- **Confidence:** HIGH
- **Reasoning:** Canonical is_active pattern; persona-as-source semantic established by table_purpose.

---

## c.client.status
- **Type:** text · **Nullable:** false · **FK:** none
- **Sample distinct values:** ['active'] (4 rows)
- **Table purpose:** Master client record.
- **Proposed column_purpose:** "Client lifecycle status. 'active' = ICE produces and publishes content for this client. Other values such as 'inactive' or 'churned' may exist to suspend without deletion (no rows observed yet)."
- **Confidence:** MEDIUM
- **Reasoning:** Only 'active' observed across 4 clients; broader lifecycle plausible but not exercised.

## c.client.portal_enabled
- **Type:** boolean · **Nullable:** false · **FK:** none
- **Table purpose:** Master client record (includes portal access flag).
- **Proposed column_purpose:** "Whether the client has access to the operator portal at portal.invegent.com for self-service draft review and approval. False clients are managed entirely by the ICE operator."
- **Confidence:** HIGH
- **Reasoning:** Table_purpose explicitly mentions the portal access flag.

## c.client.serves_ndis_participants
- **Type:** boolean · **Nullable:** true · **FK:** none
- **Table purpose:** Master client record (profession_slug for compliance scoping).
- **Proposed column_purpose:** "Whether the client provides services to NDIS participants. Drives compliance scoping — content for NDIS-serving clients runs through advertising-rule checks specific to NDIS participant communications."
- **Confidence:** HIGH
- **Reasoning:** Direct semantic from name + compliance scope established in table_purpose.

## c.client.ndis_registration_status
- **Type:** text · **Nullable:** true · **FK:** none
- **Sample distinct values:** ['registered'] (4 rows)
- **Proposed column_purpose:** "Client's NDIS provider registration state. 'registered' = registered NDIS provider (currently the only observed value); other values such as 'unregistered' or 'pending' may capture self-managed providers or applications in progress."
- **Confidence:** MEDIUM
- **Reasoning:** Single observed value; broader set plausible but not exercised.

---

## c.client_ai_profile.status
- **Type:** text · **Nullable:** false · **FK:** none
- **Sample distinct values:** ['active'] (4 rows)
- **Table purpose:** Legacy AI generation profile per client (pre-brand-profile era).
- **Proposed column_purpose:** "Profile lifecycle status. 'active' = used by the ai-worker fallback path when no client_brand_profile exists. Legacy table being superseded by c.client_brand_profile but retained for backward compatibility."
- **Confidence:** MEDIUM
- **Reasoning:** Single observed value; legacy table — low operational use.

## c.client_ai_profile.is_default
- **Type:** boolean · **Nullable:** false · **FK:** none
- **Proposed column_purpose:** "Whether this is the default legacy AI profile for the client when multiple legacy rows exist. ai-worker selects the is_default row when falling back to this table."
- **Confidence:** HIGH
- **Reasoning:** Canonical is_default pattern; semantics clear from legacy fallback context.

---

## c.client_audience_policy.platforms_enabled
- **Type:** ARRAY (text[]) · **Nullable:** false · **FK:** none
- **Sample values across all rows:** ['meta']
- **Table purpose:** Per-client audience building configuration.
- **Proposed column_purpose:** "Platforms where ICE may build audiences and run boost campaigns. Currently 'meta' (Facebook + Instagram via Meta Ads) is the only observed value; LinkedIn / YouTube ads platforms may be added later."
- **Confidence:** MEDIUM
- **Reasoning:** Single observed value; platform set will broaden as IAE grows.

## c.client_audience_policy.audience_types_enabled
- **Type:** ARRAY (text[]) · **Nullable:** false · **FK:** none
- **Sample values across all rows:** ['email_list', 'page_engagers', 'video_viewers', 'website_visitors']
- **Proposed column_purpose:** "Audience source types ICE is allowed to build for this client. Values include 'email_list', 'page_engagers', 'video_viewers', 'website_visitors' — each maps to a Meta Ads custom-audience source."
- **Confidence:** HIGH
- **Reasoning:** Full set observed in live data; semantics map directly to Meta Ads audience types.

## c.client_audience_policy.email_capture_enabled
- **Type:** boolean · **Nullable:** false · **FK:** none
- **Proposed column_purpose:** "Whether ICE captures email addresses from client touchpoints (e.g. lead forms) to seed the email_list audience type."
- **Confidence:** HIGH

## c.client_audience_policy.lookalike_auto_create
- **Type:** boolean · **Nullable:** false · **FK:** none
- **Proposed column_purpose:** "Whether ICE auto-creates lookalike audiences when a seed audience reaches its activation threshold, without requiring operator approval."
- **Confidence:** HIGH

---

## c.client_avatar_profile.avatar_status
- **Type:** text · **Nullable:** true · **FK:** none
- **Sample distinct values:** [] (0 rows in table)
- **Table purpose:** Per-client active avatar+voice selection for video synthesis.
- **Proposed column_purpose:** "Lifecycle status of the production avatar+voice profile for this client. No populated rows yet — values not observed; column reserved for future video pipeline activation. Likely lifecycle: 'pending' → 'consent_signed' → 'active'."
- **Confidence:** LOW
- **Reasoning:** No populated rows. Column purpose drafted from name + table_purpose only.

## c.client_avatar_profile.voice_clone_enabled
- **Type:** boolean · **Nullable:** true · **FK:** none
- **Proposed column_purpose:** "Whether the client has consented to a custom voice clone (ElevenLabs Voice Cloning) for video synthesis. False = use a stock ElevenLabs voice instead."
- **Confidence:** HIGH

---

## c.client_brand_asset.asset_type
- **Type:** text · **Nullable:** false · **FK:** none
- **Sample distinct values:** [] (0 rows in table)
- **Table purpose:** Brand asset registry per client.
- **Proposed column_purpose:** "Asset classification. Per table_purpose the canonical set is 'logo', 'banner', 'avatar' — image-worker reads asset_type to pick the right asset for a given Creatomate render slot. No populated rows yet."
- **Confidence:** LOW
- **Reasoning:** No populated rows; relying on table_purpose to enumerate.

## c.client_brand_asset.is_active
- **Type:** boolean · **Nullable:** false · **FK:** none
- **Proposed column_purpose:** "Whether this brand asset is currently active and selectable by image-worker for visual composition."
- **Confidence:** HIGH

---

## c.client_brand_profile.audience_is_dynamic
- **Type:** boolean · **Nullable:** false · **FK:** none
- **Table purpose:** Client brand identity (logo URL, colour palette, brand tone).
- **Proposed column_purpose:** "Whether the brand profile expresses a dynamic audience treatment (avatars/voice changing per persona) versus a single fixed brand voice. Drives whether ai-worker applies persona-specific overrides per draft."
- **Confidence:** MEDIUM
- **Reasoning:** Column placement on a brand-identity table is unusual; semantics inferred from name and persona-related sibling columns. Worth operator confirmation.

## c.client_brand_profile.use_prompt_override
- **Type:** boolean · **Nullable:** false · **FK:** none
- **Proposed column_purpose:** "Whether c.client_brand_profile.system_prompt should override the default system-prompt scaffolding in ai-worker assemblePrompts(). True = profile prompt replaces defaults; false = profile prompt is appended to defaults."
- **Confidence:** MEDIUM
- **Reasoning:** Override-semantic clear from name; exact compose-vs-replace behaviour worth operator sanity-check.

## c.client_brand_profile.is_active
- **Type:** boolean · **Nullable:** false · **FK:** none
- **Proposed column_purpose:** "Whether this brand profile version is the currently active row used by ai-worker. Only one row per client should be is_active=true; older versions retained for audit."
- **Confidence:** HIGH

## c.client_brand_profile.persona_type
- **Type:** text · **Nullable:** false · **FK:** none
- **Sample distinct values:** ['hybrid_operator_and_avatar', 'voiceover_only'] (4 rows)
- **Proposed column_purpose:** "Persona delivery mode for the client's content. 'voiceover_only' = no on-screen presenter, voice over visuals; 'hybrid_operator_and_avatar' = synthetic avatar performs in some content while real operator footage is used in other content."
- **Confidence:** HIGH
- **Reasoning:** Both observed values map cleanly to delivery models named in the persona system.

## c.client_brand_profile.persona_dialogue_mode
- **Type:** boolean · **Nullable:** false · **FK:** none
- **Proposed column_purpose:** "Whether the persona uses a dialogue/conversational tone (multi-speaker or Q&A) versus a single-narrator monologue style."
- **Confidence:** MEDIUM
- **Reasoning:** Inferred from name; worth confirming against ai-worker code path.

---

## c.client_channel.is_enabled
- **Type:** boolean · **Nullable:** false · **FK:** none
- **Table purpose:** Platform channel connections per client.
- **Proposed column_purpose:** "Master enable/disable for the client's connection to a given platform. When false, ICE does not display this channel in the dashboard or treat it as published-to. Independent of c.client_publish_profile.publish_enabled (which gates the publisher specifically)."
- **Confidence:** HIGH

---

## c.client_channel_allocation.is_active
- **Type:** boolean · **Nullable:** false · **FK:** none
- **Table purpose:** Per-client allocation of platform channels.
- **Proposed column_purpose:** "Whether this client x platform allocation is currently active. Determines which platforms ICE publishes to per client (e.g. NDIS-Yarns includes Facebook + LinkedIn, excludes Instagram)."
- **Confidence:** HIGH

---

## c.client_class_fitness_override.is_current
- **Type:** boolean · **Nullable:** false · **FK:** none
- **Table purpose:** Per-client overrides to t.class_format_fitness.
- **Proposed column_purpose:** "Whether this override is the currently effective row for the client. Older rows retained for history; only the is_current row is read by the format advisor when scoring class-format fit for this client."
- **Confidence:** HIGH
- **Reasoning:** Versioned-override pattern matches D175.

---

## c.client_content_scope.is_primary
- **Type:** boolean · **Nullable:** false · **FK:** none
- **Table purpose:** Junction table linking clients to content verticals with weighting.
- **Proposed column_purpose:** "Whether this vertical is the client's primary vertical. The is_primary=true row determines which vertical_slug ai-worker uses for compliance rule loading; secondary verticals influence bundler scoring but not compliance scoping."
- **Confidence:** HIGH
- **Reasoning:** Behaviour explicitly described in table_purpose.

---

## c.client_dedup_policy.is_current
- **Type:** boolean · **Nullable:** false · **FK:** none
- **Proposed column_purpose:** "Whether this dedup policy override row is currently effective for the client. Older rows retained for audit; only the is_current row is read by the bundler when applying dedup rules for this client."
- **Confidence:** HIGH

---

## c.client_digest_policy.mode
- **Type:** text · **Nullable:** false · **FK:** none
- **Sample distinct values:** ['lenient', 'strict'] (4 rows)
- **Table purpose:** Content selection rules for the bundler per client.
- **Proposed column_purpose:** "Bundler scoring threshold mode. 'strict' = high score floor, fewer items qualify per bundle; 'lenient' = lower threshold, larger bundles. The numeric thresholds are bundler-side parameters keyed off this mode."
- **Confidence:** HIGH

## c.client_digest_policy.allow_paywalled
- **Type:** boolean · **Nullable:** false · **FK:** none
- **Proposed column_purpose:** "Whether bundles may include items whose canonical body is paywalled (resolution_status = 'give_up_paywalled'). When false, paywalled items are excluded from bundles even if otherwise high-scoring."
- **Confidence:** HIGH

## c.client_digest_policy.allow_blocked
- **Type:** boolean · **Nullable:** false · **FK:** none
- **Proposed column_purpose:** "Whether bundles may include items whose canonical body is blocked by source-side bot detection (resolution_status = 'give_up_blocked'). Default false — blocked bodies offer no usable text for ai-worker."
- **Confidence:** HIGH

## c.client_digest_policy.allow_missing_body
- **Type:** boolean · **Nullable:** false · **FK:** none
- **Proposed column_purpose:** "Whether bundles may include items whose canonical body has not been fetched (resolution_status not yet 'success'). When false, the bundler waits for body retrieval before considering the item — slower but ensures ai-worker has full text."
- **Confidence:** HIGH

---

## c.client_format_config.is_enabled
- **Type:** boolean · **Nullable:** false · **FK:** none
- **Table purpose:** Per-client enable/disable overrides for content formats.
- **Proposed column_purpose:** "Whether the client has explicitly enabled this ice_format_key on this platform. When no row exists for a format, all buildable formats are available by default; an explicit row with is_enabled=false hard-disables the format for this client."
- **Confidence:** HIGH

---

## c.client_format_mix_override.is_current
- **Type:** boolean · **Nullable:** false · **FK:** none
- **Proposed column_purpose:** "Whether this format-mix override is the currently effective row for the client. Older rows retained for history."
- **Confidence:** HIGH

---

## c.client_match_weights.is_current
- **Type:** boolean · **Nullable:** false · **FK:** none
- **Proposed column_purpose:** "Whether this signal-scoring weights row is the currently effective configuration for the client (controlling vertical fit / recency / freshness mix). Older rows retained for audit."
- **Confidence:** HIGH

---

## c.client_platform_profile.use_hashtags
- **Type:** boolean · **Nullable:** false · **FK:** none
- **Table purpose:** Platform-specific voice and formatting rules per client.
- **Proposed column_purpose:** "Whether ai-worker should include hashtags in drafts for this client x platform. Driven by platform conventions (Instagram yes, LinkedIn often no) and brand preference."
- **Confidence:** HIGH

## c.client_platform_profile.use_markdown
- **Type:** boolean · **Nullable:** false · **FK:** none
- **Proposed column_purpose:** "Whether the platform supports markdown formatting in posts (LinkedIn yes; Facebook/Instagram no). Drives whether ai-worker emits markdown or plain text in the draft."
- **Confidence:** HIGH

## c.client_platform_profile.is_active
- **Type:** boolean · **Nullable:** false · **FK:** none
- **Proposed column_purpose:** "Whether this platform profile version is the currently active row read by ai-worker assemblePrompts(). Only one row per (client, platform) should be is_active=true; older versions retained for audit."
- **Confidence:** HIGH

---

## c.client_publish_profile.status
- **Type:** text · **Nullable:** true · **FK:** none
- **Sample distinct values:** ['active'] (14 rows)
- **Table purpose:** Publishing configuration per client per platform.
- **Proposed column_purpose:** "Publish profile lifecycle status. 'active' = current row used by publisher (only observed value). Other values such as 'inactive' or 'archived' may exist for retired credentials but are not exercised today."
- **Confidence:** MEDIUM

## c.client_publish_profile.mode
- **Type:** text · **Nullable:** true · **FK:** none
- **Sample distinct values:** ['auto'] (14 rows; allowed set per Stage 2.1 RPC: 'auto' | 'manual' | 'staging' | NULL)
- **Proposed column_purpose:** "Publishing mode. 'auto' = approved drafts publish on schedule automatically. 'manual' = approved drafts wait in queue for a human trigger. 'staging' = nothing publishes (test mode). NULL = unconfigured (publisher skips)."
- **Confidence:** HIGH
- **Reasoning:** Allowed set documented in public.update_publish_profile_toggle RPC enforcement; Stage 2.1 brief.

## c.client_publish_profile.is_default
- **Type:** boolean · **Nullable:** true · **FK:** none
- **Proposed column_purpose:** "Default-row indicator. The table has a UNIQUE(client_id, platform) constraint so there is only ever one row per client x platform; this column is likely vestigial from an earlier schema where multiple credential sets per platform were possible. Treat as informational."
- **Confidence:** MEDIUM
- **Reasoning:** UNIQUE(client_id, platform) makes is_default semantically redundant. Worth operator decision on whether to deprecate.

## c.client_publish_profile.publish_enabled
- **Type:** boolean · **Nullable:** true · **FK:** none
- **Proposed column_purpose:** "Master toggle for whether the publisher will pick up queue items for this client x platform. When false, drafts may still be generated and queued but the publisher skips them."
- **Confidence:** HIGH

## c.client_publish_profile.auto_approve_enabled
- **Type:** boolean · **Nullable:** false · **FK:** none
- **Proposed column_purpose:** "Whether drafts targeting this client x platform are auto-approved on creation (skipping the human review step) before entering the publish queue."
- **Confidence:** HIGH

## c.client_publish_profile.image_generation_enabled
- **Type:** boolean · **Nullable:** false · **FK:** none
- **Proposed column_purpose:** "Whether image-worker should generate visuals for drafts targeting this client x platform. When false, drafts publish as text-only."
- **Confidence:** HIGH

## c.client_publish_profile.video_generation_enabled
- **Type:** boolean · **Nullable:** false · **FK:** none
- **Proposed column_purpose:** "Whether video-worker should generate video assets for drafts targeting this client x platform. Independent of image_generation_enabled."
- **Confidence:** HIGH

## c.client_publish_profile.require_client_approval
- **Type:** boolean · **Nullable:** true · **FK:** none
- **Proposed column_purpose:** "Whether drafts require explicit client approval (via portal) before publishing, in addition to operator approval. True clients see drafts in their portal queue; false clients have publishing fully managed by the operator."
- **Confidence:** HIGH

## c.client_publish_profile.r6_enabled
- **Type:** boolean · **Nullable:** false · **FK:** none
- **Proposed column_purpose:** "Whether the slot-driven R6 publishing path applies to this client x platform. When true, the slot-materialiser and slot-promoter chain handles publishing; when false, the legacy publishing path runs instead."
- **Confidence:** HIGH

---

## c.client_publish_schedule.enabled
- **Type:** boolean · **Nullable:** false · **FK:** none
- **Table purpose:** Per-client per-platform automated publishing time slots.
- **Proposed column_purpose:** "Whether this scheduled time slot is currently active. Disabled slots are preserved for history but not used by the publisher when assigning scheduled_for."
- **Confidence:** HIGH

---

## c.client_registration_group.confirmed_by_client
- **Type:** boolean · **Nullable:** true · **FK:** none
- **Table purpose:** Which NDIS registration groups each client holds. Self-declared, never enforced.
- **Proposed column_purpose:** "Whether the client has explicitly confirmed they hold this NDIS registration group (vs being inferred from profession_slug or other heuristics)."
- **Confidence:** HIGH

## c.client_registration_group.inferred_from_profession
- **Type:** boolean · **Nullable:** true · **FK:** none
- **Proposed column_purpose:** "Whether this registration-group attribution was inferred from the client's profession_slug rather than directly confirmed by the client. Used to track inference confidence — true rows may be overruled when the client confirms their actual groups."
- **Confidence:** HIGH

---

## c.client_service_agreement.status
- **Type:** text · **Nullable:** false · **FK:** none
- **Sample distinct values:** ['active'] (1 row)
- **Proposed column_purpose:** "Service agreement lifecycle. 'active' = current binding agreement. Other values such as 'pending' (drafted, awaiting signature) or 'expired' may exist but are not currently observed."
- **Confidence:** MEDIUM

---

## c.client_source.is_enabled
- **Type:** boolean · **Nullable:** false · **FK:** none
- **Table purpose:** Junction table linking clients to feed sources with weight.
- **Proposed column_purpose:** "Whether this client x feed source assignment is currently enabled. The bundler reads only is_enabled=true rows when scoring content for this client; disabling preserves the assignment row but stops use without deletion."
- **Confidence:** HIGH

---

## c.client_support_item.is_featured
- **Type:** boolean · **Nullable:** true · **FK:** none
- **Table purpose:** NDIS support items each client delivers.
- **Proposed column_purpose:** "Whether this support item is featured for the client. Featured items receive higher weighting in bundler signal scoring (the operator has flagged them as a content-priority service)."
- **Confidence:** HIGH

---

## c.content_series.status
- **Type:** text · **Nullable:** false · **FK:** none
- **Sample distinct values:** ['active', 'outline_ready'] (9 rows)
- **Table purpose:** Content series (campaign) record per client. Status: draft → outline_approved → in_production → complete.
- **Proposed column_purpose:** "Series lifecycle status. Observed values: 'outline_ready', 'active'. Documented design (per table_purpose) spans 'draft' → 'outline_approved' → 'in_production' → 'complete' — production data and design have diverged; full state machine should be reconciled separately."
- **Confidence:** MEDIUM
- **Reasoning:** Sample diverges from documented lifecycle; flagging for operator note.

---

## c.content_series_episode.cta_type
- **Type:** text · **Nullable:** true · **FK:** none
- **Sample distinct values:** ['comment', 'question', 'save', 'share'] (35 rows)
- **Proposed column_purpose:** "Call-to-action type for the episode. 'comment' / 'question' / 'save' / 'share' map to the post's intended audience action; ai-worker shapes the closing line accordingly."
- **Confidence:** HIGH

## c.content_series_episode.status
- **Type:** text · **Nullable:** false · **FK:** none
- **Sample distinct values:** ['draft_ready', 'outline'] (35 rows)
- **Table purpose:** Episode lifecycle (per table_purpose: planned → draft_created → approved → published).
- **Proposed column_purpose:** "Episode lifecycle status. Observed values: 'outline', 'draft_ready'. Documented design (per table_purpose) spans 'planned' → 'draft_created' → 'approved' → 'published' — production data and design have diverged; full state machine should be reconciled separately."
- **Confidence:** MEDIUM
- **Reasoning:** Sample diverges from documented lifecycle.

---

## c.content_type_prompt.job_type
- **Type:** text · **Nullable:** false · **FK:** none
- **Sample distinct values:** ['promo_v1', 'rewrite_v1', 'synth_bundle_v1'] (42 rows)
- **Proposed column_purpose:** "Job type the prompt applies to. 'rewrite_v1' = single-item rewrite; 'synth_bundle_v1' = multi-item digest synthesis; 'promo_v1' = promotional content. New job_types may emerge as ai-worker capabilities expand; the v1 suffix supports versioning per D175."
- **Confidence:** HIGH

## c.content_type_prompt.is_active
- **Type:** boolean · **Nullable:** false · **FK:** none
- **Proposed column_purpose:** "Whether this custom prompt is currently active for the (client, platform, job_type) combination. Only one row per combination should be is_active=true; older versions retained for audit."
- **Confidence:** HIGH

---

## c.external_reviewer.is_active
- **Type:** boolean · **Nullable:** false · **FK:** none
- **Table purpose:** External reviewer identities (D156 reviewer layer). Layer paused per D162.
- **Proposed column_purpose:** "Whether this external reviewer identity is currently active. The D156 reviewer layer is paused per D162; rows preserved for audit, no new reviews routed."
- **Confidence:** HIGH

## c.external_reviewer_rule.is_active
- **Type:** boolean · **Nullable:** false · **FK:** none
- **Proposed column_purpose:** "Whether this reviewer routing rule is currently active. D156 reviewer layer paused per D162; rules retained for future re-activation."
- **Confidence:** HIGH

---

## c.onboarding_submission.status
- **Type:** text · **Nullable:** false · **FK:** none
- **Sample distinct values:** ['approved'] (1 row)
- **Proposed column_purpose:** "Onboarding submission lifecycle. 'approved' = submission accepted and client created (only observed value). Other values such as 'pending' (operator review pending) or 'rejected' (declined to onboard) likely exist in design."
- **Confidence:** MEDIUM

## c.onboarding_submission.blackout_awareness
- **Type:** boolean · **Nullable:** true · **FK:** none
- **Proposed column_purpose:** "Whether the client acknowledges blackout windows (industry-event no-publish periods) during onboarding. Used by operator to set expectation that ICE pauses around major events."
- **Confidence:** MEDIUM
- **Reasoning:** Inferred from name; worth operator confirmation that blackout windows are a real onboarding artefact.

## c.onboarding_submission.has_brand_assets
- **Type:** boolean · **Nullable:** true · **FK:** none
- **Proposed column_purpose:** "Whether the client provided brand assets (logos, banners) at onboarding. Drives a follow-up step if false (operator collects assets manually)."
- **Confidence:** HIGH

## c.onboarding_submission.agreement_accepted
- **Type:** boolean · **Nullable:** false · **FK:** none
- **Proposed column_purpose:** "Whether the client accepted the service agreement at submission. Required to proceed to client creation."
- **Confidence:** HIGH

---

## c.platform_channel.delivery_mode
- **Type:** text · **Nullable:** false · **FK:** none
- **Sample distinct values:** ['automated', 'manual_series'] (8 rows)
- **Table purpose:** Catalogue of channel offerings.
- **Proposed column_purpose:** "Delivery model for the channel offering. 'automated' = ICE auto-publishes per schedule (the standard mode for FB/IG/LinkedIn); 'manual_series' = content delivered as scheduled episodic series with operator pacing (e.g. multi-part campaigns)."
- **Confidence:** HIGH

## c.platform_channel.is_active
- **Type:** boolean · **Nullable:** false · **FK:** none
- **Proposed column_purpose:** "Whether this channel offering is currently sellable / available for inclusion in service packages. When false, the channel is preserved in the catalogue but cannot be added to a new package."
- **Confidence:** HIGH

---

## c.service_package.is_current
- **Type:** boolean · **Nullable:** false · **FK:** none
- **Table purpose:** Reference table of service packages (Starter $500, Standard $800, Premium $1500).
- **Proposed column_purpose:** "Whether this service package is the currently effective version (priced and offered today). Older versions retained for historical contracts; new packages should be created rather than mutating existing rows."
- **Confidence:** HIGH

---

## c.service_package_channel.is_included
- **Type:** boolean · **Nullable:** false · **FK:** none
- **Table purpose:** Many-to-many mapping of service packages to platform channels.
- **Proposed column_purpose:** "Whether this platform channel is included in the service package tier (vs available as an add-on). True = baked into the tier price; false = available as a paid add-on for clients on this tier."
- **Confidence:** HIGH

---

## f.canonical_content_body.fetch_status
- **Type:** text · **Nullable:** false · **FK:** none
- **Sample distinct values:** ['blocked', 'blocked_permanent', 'dead', 'error', 'paywalled', 'pending', 'stale', 'success', 'timeout'] (1922 rows)
- **Proposed column_purpose:** "Most recent fetch attempt outcome for the canonical body. 'pending' = not yet fetched; 'success' = body retrieved and stored; 'paywalled' / 'blocked' / 'blocked_permanent' = source-side gate; 'error' / 'timeout' / 'stale' = transient or persistent failure; 'dead' = source returned 404 or marked permanently unreachable. Distinct from resolution_status which is the aggregated terminal state."
- **Confidence:** HIGH
- **Reasoning:** Full set observed in production; semantics map cleanly to source-side gates and retry outcomes. Note: the table_purpose lists a slightly different lifecycle ('pending_fetch → success | give_up_paywall | give_up_blocked | dead') — the columnar reality is broader. Worth a separate table_purpose update later.

## f.canonical_content_body.content_type
- **Type:** text · **Nullable:** true · **FK:** none
- **Sample distinct values:** ['application/json; charset=utf-8', 'text/plain; charset=utf-8'] (1922 rows)
- **Proposed column_purpose:** "MIME type of the fetched body returned by the source HTTP response. Used by ingest normaliser to choose extraction strategy (JSON parse vs text extract)."
- **Confidence:** HIGH

## f.canonical_content_body.resolution_status
- **Type:** text · **Nullable:** false · **FK:** none
- **Sample distinct values:** ['active', 'give_up_blocked', 'give_up_error', 'give_up_paywalled', 'give_up_timeout', 'success'] (1922 rows)
- **Proposed column_purpose:** "Aggregated terminal state for the body retrieval lifecycle. 'active' = still trying (fetch_status may have transient values); 'success' = body retrieved and stored; 'give_up_*' = bundler treats this item as unusable from the named cause. resolution_status is the field client_digest_policy.allow_paywalled / allow_blocked / allow_missing_body interrogate."
- **Confidence:** HIGH

---

## f.content_item.content_type
- **Type:** text · **Nullable:** false · **FK:** none
- **Sample distinct values:** ['article'] (2040 rows)
- **Proposed column_purpose:** "Normalised content item type. 'article' is the dominant value (RSS/email articles); other values such as 'video', 'podcast', 'newsletter' may emerge as ingest sources expand to non-text-first formats."
- **Confidence:** MEDIUM
- **Reasoning:** Single observed value across 2040 rows; broader set plausible.

---

## f.feed_discovery_seed.seed_type
- **Type:** text · **Nullable:** false · **FK:** none
- **Sample distinct values:** ['keyword', 'url'] (18 rows)
- **Proposed column_purpose:** "Seed type the discovery EF interprets. 'keyword' = rss.app keyword search across configured sites; 'url' = original site URL the operator wants an rss.app feed generated for. 'youtube_keyword' is also defined for YouTube discovery (not yet observed in data)."
- **Confidence:** HIGH

## f.feed_discovery_seed.status
- **Type:** text · **Nullable:** false · **FK:** none
- **Sample distinct values:** ['failed', 'provisioned'] (18 rows; design also includes 'pending', 'paused')
- **Proposed column_purpose:** "Seed lifecycle status. 'pending' = awaiting next discovery cron run; 'provisioned' = rss.app feed created and feed_source_id populated; 'failed' = discovery EF could not provision (error_message set); 'paused' = operator-disabled, will not be retried. Per D180, transition to 'provisioned' triggers tg_auto_link_seed_to_client to insert into c.client_source for client-scoped seeds."
- **Confidence:** HIGH

---

## f.feed_source.source_type_code
- **Type:** text · **Nullable:** false · **FK:** none
- **Sample distinct values:** ['email_newsletter', 'google_trends', 'rss_app', 'rss_native', 'youtube_analytics', 'youtube_channel'] (68 rows)
- **Proposed column_purpose:** "Source type classifier. Drives which normaliser ingest-worker applies and what config keys are expected (e.g. rss_app expects config->>'feed_url'; email_newsletter expects a Gmail label; youtube_channel expects a channel handle)."
- **Confidence:** HIGH

## f.feed_source.output_kind
- **Type:** text · **Nullable:** false · **FK:** none
- **Sample distinct values:** ['content_item', 'metrics', 'timeseries', 'youtube_inspiration'] (68 rows)
- **Proposed column_purpose:** "Output category emitted by ingest from this source. 'content_item' = normalised articles/posts (most rss/email feeds); 'metrics' = scalar metric snapshots (page-follower counts etc.); 'timeseries' = time-bucketed metric points; 'youtube_inspiration' = YouTube channel signals used for content ideation, not direct republishing."
- **Confidence:** HIGH

## f.feed_source.status
- **Type:** text · **Nullable:** false · **FK:** none
- **Sample distinct values:** ['active', 'deprecated'] (68 rows; design also includes 'paused', 'inactive')
- **Proposed column_purpose:** "Feed source lifecycle. 'active' = polled by ingest-worker on schedule; 'paused' / 'inactive' = temporarily disabled (config retained); 'deprecated' = retained for history, not polled."
- **Confidence:** HIGH

---

## f.ingest_run.status
- **Type:** text · **Nullable:** false · **FK:** none
- **Sample distinct values:** ['running', 'success'] (8537 rows)
- **Proposed column_purpose:** "Ingest run terminal state. 'running' = still in flight; 'success' = completed without fatal error (the run still records error_count for transient per-item failures). Failure states such as 'error' or 'timeout' are likely in design but not observed in current data."
- **Confidence:** MEDIUM
- **Reasoning:** Only two values observed across a large row count — production may simply be very reliable, or failure states write a different status. Worth operator confirmation.

## f.ingest_run.trigger_type
- **Type:** text · **Nullable:** false · **FK:** none
- **Sample distinct values:** ['manual', 'schedule'] (8537 rows)
- **Proposed column_purpose:** "What kicked off the ingest run. 'schedule' = cron-driven (default); 'manual' = operator-triggered (e.g. via direct Edge Function call during recovery)."
- **Confidence:** HIGH

---

## f.raw_metric_point.entity_type
- **Type:** text · **Nullable:** false · **FK:** none
- **Sample distinct values:** [] (0 rows in table)
- **Table purpose:** Raw metric data points ingested from analytics sources.
- **Proposed column_purpose:** "Type of the entity the metric describes (e.g. 'page', 'post', 'account', 'video'). No populated rows yet — values not observed; column reserved for future analytics ingestion. Combined with entity_key to identify the metric subject."
- **Confidence:** LOW
- **Reasoning:** No populated rows; column purpose drafted from name + table_purpose only.

---

## f.video_analysis.has_transcript
- **Type:** boolean · **Nullable:** true · **FK:** none
- **Table purpose:** Per-canonical video analysis output.
- **Proposed column_purpose:** "Whether the video analysis pipeline successfully extracted a transcript. When true, transcript text is available in the analysis JSONB; when false, transcript extraction failed or was skipped."
- **Confidence:** HIGH

## f.video_analysis.video_type
- **Type:** text · **Nullable:** true · **FK:** none
- **Sample distinct values:** ['case_study', 'explainer', 'tutorial', 'unknown'] (9 rows)
- **Proposed column_purpose:** "Classification produced by video-analysis. 'case_study' / 'explainer' / 'tutorial' reflect the video's intent; 'unknown' = classifier could not assign confidently."
- **Confidence:** HIGH

---

## Summary

- **Total proposals:** 83
- **Confidence distribution:** HIGH 62 (75%) · MEDIUM 17 (20%) · LOW 4 (5%)
- **Schema-verified:** 33 columns (40%) — distinct values queried for every text-enum column and both arrays
- **Notable findings for operator:**
  - `c.client_publish_profile.is_default` looks vestigial — UNIQUE(client_id, platform) makes it semantically redundant. Worth deciding whether to deprecate
  - Table_purpose for `f.canonical_content_body` says lifecycle is "pending_fetch → success | give_up_paywall | give_up_blocked | dead" but actual `fetch_status` set is broader (9 values) — table_purpose may benefit from update in a separate brief
  - `c.content_series.status` and `c.content_series_episode.status` observed values diverge from the lifecycles documented in the table_purpose; production data ahead of (or behind) design — separate reconciliation needed
  - 3 columns flagged LOW for "no populated rows" (`c.client_avatar_profile.avatar_status`, `c.client_brand_asset.asset_type`, `f.raw_metric_point.entity_type`); none deprecated, all reserved for future pipeline activation
  - `c.brand_avatar.avatar_gen_status` only ever observed as 'empty' — production lifecycle for HeyGen generation may be unexercised; worth a separate audit of the avatar pipeline state
- **Operator review checklist:**
  - [ ] Spot-check 5 HIGH proposals — confirm none are wrong
  - [ ] Read every MEDIUM proposal — flag any that need correction (especially `audience_is_dynamic`, `use_prompt_override`, `persona_dialogue_mode`, `is_default` on publish_profile, `blackout_awareness`)
  - [ ] Inspect every LOW proposal — these are best-guess from name + table_purpose only
  - [ ] Approve to apply migration `20260428143000_audit_f002_p1_column_purposes.sql`
