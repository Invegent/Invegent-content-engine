-- Audit closure follow-up: F-2026-04-28-D-001 (HIGH) — older entries
-- Backfill table-level purposes for the remaining 25 ICE tables created pre-22 Apr 2026
-- that had no purpose registered. Operator-approved in chat, schema-verified for the
-- 3-table avatar chain (stakeholder -> brand_avatar -> client_avatar_profile).
--
-- Coverage impact: 87.5% -> 100.0% across all 7 ICE schemas (a, c, f, k, m, r, t).
-- 200/200 ICE tables now have a registered purpose.

-- k schema (documentation infrastructure)
UPDATE k.table_registry SET purpose = 'View of k.column_registry rows missing column_purpose, prioritised by table importance and column leverage. Used by docs sprints to identify high-leverage backlog first.', updated_at = NOW()
WHERE schema_name = 'k' AND table_name = 'vw_doc_backlog_columns_priority';

UPDATE k.table_registry SET purpose = 'View enriching k.column_registry rows with sample values, FK targets, and usage context. Reference for ChatGPT/operator when proposing column purposes (per F-2026-04-28-D-002 plan).', updated_at = NOW()
WHERE schema_name = 'k' AND table_name = 'vw_column_enrichment_context';

UPDATE k.table_registry SET purpose = 'Staging table for batch column-purpose imports (CSV or ChatGPT proposals). Rows reviewed and approved before merging into k.column_registry.', updated_at = NOW()
WHERE schema_name = 'k' AND table_name = 'column_purpose_import';

UPDATE k.table_registry SET purpose = 'Backup of k.column_registry column_purpose values prior to bulk operations. Allows rollback of a bad import.', updated_at = NOW()
WHERE schema_name = 'k' AND table_name = 'column_purpose_backup';

UPDATE k.table_registry SET purpose = 'View aggregating feed source intelligence (give-up rates, content quality, vertical match) for the feed-intelligence agent and dashboard surfacing.', updated_at = NOW()
WHERE schema_name = 'k' AND table_name = 'vw_feed_intelligence';

UPDATE k.table_registry SET purpose = 'Operator-facing register tracking external subscriptions (Vercel, Anthropic, OpenAI, Creatomate, Resend) with cost, renewal date, and account holder. Surfaced at /system/subscriptions. Per Brief 043.', updated_at = NOW()
WHERE schema_name = 'k' AND table_name = 'subscription_register';

-- c schema (avatar chain — schema-verified during closure)
UPDATE k.table_registry SET purpose = 'Per-client persona definitions (role, demographic hint, character brief jsonb) used as the basis for generating synthetic avatars. Iteratively refined via brief_version. Each stakeholder persona may produce one or more c.brand_avatar rows.', updated_at = NOW()
WHERE schema_name = 'c' AND table_name = 'brand_stakeholder';

UPDATE k.table_registry SET purpose = 'Per-stakeholder, per-client synthetic avatar generation records via HeyGen. Tracks the full generation lifecycle (status, errors, image set) and consent management for each avatar produced. References c.brand_stakeholder via stakeholder_id.', updated_at = NOW()
WHERE schema_name = 'c' AND table_name = 'brand_avatar';

UPDATE k.table_registry SET purpose = 'Per-client active avatar+voice selection for video synthesis. Combines a HeyGen avatar (visual, from c.brand_avatar) with an ElevenLabs voice (audio). One row per active production avatar profile, with consent tracking.', updated_at = NOW()
WHERE schema_name = 'c' AND table_name = 'client_avatar_profile';

-- c schema (onboarding + service packages + channels)
UPDATE k.table_registry SET purpose = 'Per-client allocation of platform channels (e.g. NDIS Yarns gets Facebook + LinkedIn but not Instagram). Determines which platforms ICE publishes to per client.', updated_at = NOW()
WHERE schema_name = 'c' AND table_name = 'client_channel_allocation';

UPDATE k.table_registry SET purpose = 'Per-client service agreement terms (start date, term, deliverables, SLA, billing arrangement). Used for client onboarding and operator reference.', updated_at = NOW()
WHERE schema_name = 'c' AND table_name = 'client_service_agreement';

UPDATE k.table_registry SET purpose = 'Submissions to the client onboarding flow capturing client identity, brand, publishing preferences, feeds, and policy. One row per onboarding session.', updated_at = NOW()
WHERE schema_name = 'c' AND table_name = 'onboarding_submission';

UPDATE k.table_registry SET purpose = 'Catalogue of channel offerings (channel_code per platform) with default posts/week, best posting days/times AEST, content mix, and per-channel pricing (AUD). Referenced by c.service_package_channel and onboarding flow.', updated_at = NOW()
WHERE schema_name = 'c' AND table_name = 'platform_channel';

UPDATE k.table_registry SET purpose = 'Reference table of service packages offered to clients (Starter $500, Standard $800, Premium $1500). Defines posts/week, platforms, and add-ons per tier.', updated_at = NOW()
WHERE schema_name = 'c' AND table_name = 'service_package';

UPDATE k.table_registry SET purpose = 'Many-to-many mapping of service packages to platform channels included in each tier.', updated_at = NOW()
WHERE schema_name = 'c' AND table_name = 'service_package_channel';

-- c schema (external reviewer layer — paused per D162)
UPDATE k.table_registry SET purpose = 'External reviewer identities (D156 reviewer layer). Each row defines a named reviewer role and contact. Layer paused per D162; superseded by audit loop for system-level review.', updated_at = NOW()
WHERE schema_name = 'c' AND table_name = 'external_reviewer';

UPDATE k.table_registry SET purpose = 'Per-reviewer rules defining what content gets routed to which reviewer (vertical scope, severity threshold, content types). Paused per D162.', updated_at = NOW()
WHERE schema_name = 'c' AND table_name = 'external_reviewer_rule';

-- f schema
UPDATE k.table_registry SET purpose = 'Per-canonical video analysis output (transcript, scene breakdown, key moments) from video processing pipeline. Used by video-format synthesis and content classification.', updated_at = NOW()
WHERE schema_name = 'f' AND table_name = 'video_analysis';

UPDATE k.table_registry SET purpose = 'Operator-defined seeds (URLs or keywords) for the feed-discovery system to attempt RSS feed extraction or rss.app feed creation. Per D180, auto-links to client on provisioning.', updated_at = NOW()
WHERE schema_name = 'f' AND table_name = 'feed_discovery_seed';

-- m schema
UPDATE k.table_registry SET purpose = 'Daily diagnostic snapshot of AI pipeline health (job rates, error patterns, cost per client). Generated by ai-diagnostic Edge Function 6am AEST. Surfaced at /diagnostics.', updated_at = NOW()
WHERE schema_name = 'm' AND table_name = 'ai_diagnostic_report';

UPDATE k.table_registry SET purpose = 'Pipeline incident records auto-created by sentinel/healer crons when error patterns cross thresholds. Auto-resolved by incident-auto-resolver cron when conditions clear.', updated_at = NOW()
WHERE schema_name = 'm' AND table_name = 'pipeline_incident';

UPDATE k.table_registry SET purpose = 'Per-topic scoring weights applied during canonical scoring. Live-tunable parameters that influence which signals rise in the digest selector.', updated_at = NOW()
WHERE schema_name = 'm' AND table_name = 'topic_score_weight';

UPDATE k.table_registry SET purpose = 'Alerts raised by token-expiry-alert-daily cron when an OAuth token approaches expiry (30d/14d/7d). Empty currently because all FB tokens use 2099-12-31 sentinel; see snapshot 2026-04-28 section 16.', updated_at = NOW()
WHERE schema_name = 'm' AND table_name = 'token_expiry_alert';

UPDATE k.table_registry SET purpose = 'Weekly digest of content drafts routed to external reviewers under the D156 reviewer layer. Paused per D162; superseded by audit loop.', updated_at = NOW()
WHERE schema_name = 'm' AND table_name = 'external_review_digest';

UPDATE k.table_registry SET purpose = 'Queue of individual drafts awaiting external reviewer feedback. Paused per D162.', updated_at = NOW()
WHERE schema_name = 'm' AND table_name = 'external_review_queue';
