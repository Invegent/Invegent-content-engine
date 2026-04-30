-- Audit: operator-alerting trio column purposes — m.external_review_queue,
--        m.compliance_review_queue, m.external_review_digest
-- Brief: docs/briefs/operator-alerting-trio-column-purposes.md
-- Pre-flight: 57 undocumented column rows total (21 + 19 + 17). Confidence per
--             the brief's strict JSONB rule and producer-code citation gate:
--   * 19/19 HIGH on m.compliance_review_queue — compliance-reviewer Edge
--     Function (supabase/functions/compliance-reviewer/index.ts:200-244)
--     constructs ai_analysis JSONB with explicit keys (summary, relevance,
--     confidence, key_changes, affected_rules, new_rules_suggested,
--     human_action_required, confidence_reason); writes via the
--     public.store_compliance_ai_analysis RPC. Production sample (3 rows)
--     matches that key set. Status enum and AI lifecycle from table_purpose.
--   * 21/21 HIGH on m.external_review_queue — D156 migration
--     supabase/migrations/20260421_d156_external_reviewer_layer.sql carries
--     full CREATE TABLE, table COMMENT (severity info|warn|critical), seed
--     reviewer rows (strategist, engineer/system_auditor, risk), and
--     per-reviewer system_prompts that pin the output JSON schema mapping
--     overall_severity/summary/detail/referenced_rules/referenced_artifacts
--     to the row columns.
--   * 17/17 HIGH on m.external_review_digest — D156 migration carries full
--     CREATE TABLE plus the COMMENT enumerating trigger_type (weekly_cron |
--     on_demand) and status (running | succeeded | failed) lifecycles.
--
-- Total: 57 HIGH (this migration) + 0 LOW. expected_delta = 57 (= 57 - 0).
-- Pause context for external_review_queue / external_review_digest already
-- lives in k.table_registry.purpose ("Paused per D162") — column purposes do
-- not repeat that, per brief instruction.
--
-- Verification (Lesson #38): single atomic DO block captures pre_count of
-- NULL/empty/PENDING/TODO column_purpose rows for the three tables, runs 57
-- UPDATEs, captures post_count, asserts pre_count - post_count = 57.

DO $audit_operator_alerting_trio$
DECLARE
  expected_delta CONSTANT integer := 57;
  pre_count integer;
  post_count integer;
BEGIN

SELECT COUNT(*)::int INTO pre_count
FROM k.column_registry cr
JOIN k.table_registry tr ON tr.table_id = cr.table_id
WHERE tr.schema_name = 'm'
  AND tr.table_name IN ('external_review_queue', 'compliance_review_queue', 'external_review_digest')
  AND (cr.column_purpose IS NULL
       OR cr.column_purpose = ''
       OR cr.column_purpose = 'PENDING_DOCUMENTATION'
       OR cr.column_purpose ILIKE 'TODO%');

-- ── m.compliance_review_queue (19 HIGH) ──────────────────────────────────────────
-- Producer: compliance-monitor populates the queue when a monitored policy URL
-- hash changes; compliance-reviewer Edge Function reads pending rows
-- (ai_reviewed_at IS NULL), calls Claude via analyseWithClaude(), writes back
-- via public.store_compliance_ai_analysis(p_review_id, p_ai_analysis,
-- p_ai_confidence, p_ai_error). Status lifecycle: pending -> reviewed |
-- dismissed (per table_purpose); AI lifecycle: ai_reviewed_at IS NULL ->
-- ai_analysis written.
UPDATE k.column_registry SET column_purpose = $cp$Surrogate UUID primary key for the compliance review queue row.$cp$, updated_at = NOW() WHERE column_id = 754341;
UPDATE k.column_registry SET column_purpose = $cp$Compliance policy source whose URL change produced this row (FK m.compliance_policy_source.source_id).$cp$, updated_at = NOW() WHERE column_id = 754340;
UPDATE k.column_registry SET column_purpose = $cp$Stable text key for the compliance source (m.compliance_policy_source.source_key), denormalised onto the queue row so the dashboard can render without joining.$cp$, updated_at = NOW() WHERE column_id = 754339;
UPDATE k.column_registry SET column_purpose = $cp$Human-readable display name of the compliance source, denormalised from m.compliance_policy_source for dashboard rendering.$cp$, updated_at = NOW() WHERE column_id = 754338;
UPDATE k.column_registry SET column_purpose = $cp$Monitored policy URL whose content hash changed and triggered this review row.$cp$, updated_at = NOW() WHERE column_id = 754337;
UPDATE k.column_registry SET column_purpose = $cp$Vertical taxonomy slug (matches t.5.7_compliance_rule.vertical_slug; observed value: ndis). Used by compliance-reviewer to filter applicable rules for this row's analysis.$cp$, updated_at = NOW() WHERE column_id = 754336;
UPDATE k.column_registry SET column_purpose = $cp$Wall-clock time compliance-monitor first observed the URL hash change. Default now() at insert.$cp$, updated_at = NOW() WHERE column_id = 754335;
UPDATE k.column_registry SET column_purpose = $cp$Hash of the monitored URL's content prior to the detected change. NULL if this is the first time the URL has been seen.$cp$, updated_at = NOW() WHERE column_id = 754334;
UPDATE k.column_registry SET column_purpose = $cp$Hash of the monitored URL's content after the detected change. Compared against previous_hash to detect drift.$cp$, updated_at = NOW() WHERE column_id = 754333;
UPDATE k.column_registry SET column_purpose = $cp$Human review state for the row. Lifecycle per table_purpose: pending (default) -> reviewed | dismissed.$cp$, updated_at = NOW() WHERE column_id = 754332;
UPDATE k.column_registry SET column_purpose = $cp$Wall-clock time the human reviewer transitioned status to reviewed or dismissed. NULL while status is still pending.$cp$, updated_at = NOW() WHERE column_id = 754331;
UPDATE k.column_registry SET column_purpose = $cp$Operator identifier of the human reviewer who actioned this row. NULL while status is still pending.$cp$, updated_at = NOW() WHERE column_id = 754330;
UPDATE k.column_registry SET column_purpose = $cp$Free-text human review notes. NULL by default; populated when a reviewer captures rationale alongside the status transition.$cp$, updated_at = NOW() WHERE column_id = 754329;
UPDATE k.column_registry SET column_purpose = $cp$Row creation timestamp (default now()).$cp$, updated_at = NOW() WHERE column_id = 754328;
UPDATE k.column_registry SET column_purpose = $cp$AI analysis written by the compliance-reviewer Edge Function via the public.store_compliance_ai_analysis RPC. JSONB object whose schema is constructed in supabase/functions/compliance-reviewer/index.ts (see analyseWithClaude). Top-level keys: summary (text), relevance (high|medium|low|none), confidence (high|medium|low), confidence_reason (text), key_changes (array of strings), affected_rules (array of objects with rule_key, rule_name, action, impact, suggested_update), new_rules_suggested (array of objects with rule_name, rule_text, rationale, risk_level, enforcement), human_action_required (boolean). NULL until compliance-reviewer processes the row; re-set to NULL on retries.$cp$, updated_at = NOW() WHERE column_id = 1033045;
UPDATE k.column_registry SET column_purpose = $cp$Top-level promotion of ai_analysis.confidence to its own indexable text column. Observed values: high, medium, low. NULL until compliance-reviewer processes the row.$cp$, updated_at = NOW() WHERE column_id = 1033044;
UPDATE k.column_registry SET column_purpose = $cp$Wall-clock time compliance-reviewer wrote the ai_analysis (set to NOW() inside public.store_compliance_ai_analysis). NULL until the row has been AI-reviewed; the WHERE ai_reviewed_at IS NULL filter is what compliance-reviewer scans for.$cp$, updated_at = NOW() WHERE column_id = 1033043;
UPDATE k.column_registry SET column_purpose = $cp$Free-text error captured when compliance-reviewer's analysis call fails (truncated to 500 chars by the Edge Function before the RPC call). NULL on successful runs.$cp$, updated_at = NOW() WHERE column_id = 1033042;
UPDATE k.column_registry SET column_purpose = $cp$Profession taxonomy slug (LEFT JOIN target on t.profession.profession_slug). NULL means the source applies across all professions in the vertical; non-NULL narrows the applicable compliance rules to that profession.$cp$, updated_at = NOW() WHERE column_id = 1074512;

-- ── m.external_review_queue (21 HIGH; paused per D162) ──────────────────────────
-- Producer: external-reviewer Edge Function (supabase/functions/external-reviewer/).
-- Schema authoritative source: D156 migration
-- supabase/migrations/20260421_d156_external_reviewer_layer.sql — CREATE TABLE,
-- table COMMENT, seeded c.external_reviewer rows (reviewer_key vocab) and
-- per-reviewer system_prompts that fix the output JSON schema. Each row
-- represents one reviewer-key x commit-sha finding; row columns are mapped
-- from the reviewer's JSON output (overall_severity -> severity,
-- summary -> finding_summary, detail -> finding_detail, referenced_rules /
-- referenced_artifacts arrays passed through verbatim).
UPDATE k.column_registry SET column_purpose = $cp$Surrogate UUID primary key for the external-review finding row.$cp$, updated_at = NOW() WHERE column_id = 2530577;
UPDATE k.column_registry SET column_purpose = $cp$External reviewer that produced this finding (FK c.external_reviewer.reviewer_key). Observed values: strategist, system_auditor, risk.$cp$, updated_at = NOW() WHERE column_id = 2530576;
UPDATE k.column_registry SET column_purpose = $cp$Git commit SHA the finding was generated against. Pairs with reviewer_key as the natural key — one reviewer produces one row per commit_sha.$cp$, updated_at = NOW() WHERE column_id = 2530575;
UPDATE k.column_registry SET column_purpose = $cp$Repository identifier (e.g. owner/name) the commit_sha belongs to. Lets the same reviewer layer cover multiple repos without commit_sha collisions.$cp$, updated_at = NOW() WHERE column_id = 2530574;
UPDATE k.column_registry SET column_purpose = $cp$Commit message captured at review time (snapshot).$cp$, updated_at = NOW() WHERE column_id = 2530573;
UPDATE k.column_registry SET column_purpose = $cp$Commit author captured at review time (snapshot).$cp$, updated_at = NOW() WHERE column_id = 2530572;
UPDATE k.column_registry SET column_purpose = $cp$Commit timestamp captured at review time (snapshot, the commit's own author/committer time).$cp$, updated_at = NOW() WHERE column_id = 2530571;
UPDATE k.column_registry SET column_purpose = $cp$Severity bucket for the finding. Allowed values per D156 migration COMMENT and per-reviewer system_prompt severity calibration: info | warn | critical. Drives the findings_critical / findings_warn / findings_info counters on m.external_review_digest.$cp$, updated_at = NOW() WHERE column_id = 2530570;
UPDATE k.column_registry SET column_purpose = $cp$One-line headline of the finding (<=200 chars). Mapped from the reviewer JSON output's "summary" field.$cp$, updated_at = NOW() WHERE column_id = 2530569;
UPDATE k.column_registry SET column_purpose = $cp$Long-form reasoning for the finding (~200-800 words per system_prompt instruction). Mapped from the reviewer JSON output's "detail" field. Free-form prose; not parsed downstream.$cp$, updated_at = NOW() WHERE column_id = 2530568;
UPDATE k.column_registry SET column_purpose = $cp$Reviewer rule keys cited in this finding (text[] of c.external_reviewer_rule.rule_key values). Drawn from the reviewer JSON output's "referenced_rules" array. Empty array when no rules are cited.$cp$, updated_at = NOW() WHERE column_id = 2530588;
UPDATE k.column_registry SET column_purpose = $cp$Repository or decision artefacts cited in this finding (text[] of e.g. D-numbers, ID-numbers, brief filenames, file paths). Drawn from the reviewer JSON output's "referenced_artifacts" array. Empty array when no artefacts are cited.$cp$, updated_at = NOW() WHERE column_id = 2530587;
UPDATE k.column_registry SET column_purpose = $cp$Input token count for the underlying LLM call. Used together with tokens_output and cost_usd for per-finding cost accounting.$cp$, updated_at = NOW() WHERE column_id = 2530586;
UPDATE k.column_registry SET column_purpose = $cp$Output (completion) token count for the underlying LLM call.$cp$, updated_at = NOW() WHERE column_id = 2530585;
UPDATE k.column_registry SET column_purpose = $cp$Total cost in USD for the LLM call that produced this finding. NUMERIC(10,6) per D156 schema — six decimal places of precision.$cp$, updated_at = NOW() WHERE column_id = 2530584;
UPDATE k.column_registry SET column_purpose = $cp$True if the underlying LLM call benefited from prompt caching (full-repo blob reused across calls per the D156 Approach C design). Default false.$cp$, updated_at = NOW() WHERE column_id = 2530583;
UPDATE k.column_registry SET column_purpose = $cp$Mark-as-read flag for the operator inbox view. Default false; set true when a human marks the finding as read.$cp$, updated_at = NOW() WHERE column_id = 2530582;
UPDATE k.column_registry SET column_purpose = $cp$Wall-clock time the finding was marked is_read=true. NULL while is_read=false.$cp$, updated_at = NOW() WHERE column_id = 2530581;
UPDATE k.column_registry SET column_purpose = $cp$Free-text record of the action a human took in response to the finding (e.g. "filed as ID00X", "reverted commit", "no action — accepted as info"). NULL when no action has been recorded.$cp$, updated_at = NOW() WHERE column_id = 2530580;
UPDATE k.column_registry SET column_purpose = $cp$Digest run that included this finding (FK m.external_review_digest.digest_id). Set after the weekly_cron or on_demand digest assembly groups the finding into a digest row. NULL until first digest assembly.$cp$, updated_at = NOW() WHERE column_id = 2530579;
UPDATE k.column_registry SET column_purpose = $cp$Row creation timestamp (default now()).$cp$, updated_at = NOW() WHERE column_id = 2530578;

-- ── m.external_review_digest (17 HIGH; paused per D162) ─────────────────────────
-- Producer: external-reviewer-digest Edge Function
-- (supabase/functions/external-reviewer-digest/). Schema authoritative source:
-- D156 migration CREATE TABLE plus its table COMMENT explicitly enumerating
-- trigger_type (weekly_cron | on_demand) and status (running | succeeded |
-- failed). Weekly cron schedule cron-health-every-15m... actually
-- 'external-reviewer-digest-weekly' (Sun 21:00 UTC = Mon 7am AEST per D156).
UPDATE k.column_registry SET column_purpose = $cp$Surrogate UUID primary key for the digest run row.$cp$, updated_at = NOW() WHERE column_id = 2532573;
UPDATE k.column_registry SET column_purpose = $cp$How the digest run was initiated. Per D156 migration COMMENT, allowed values are weekly_cron (the Sun 21:00 UTC / Mon 7am AEST cron job external-reviewer-digest-weekly) and on_demand (manual operator trigger).$cp$, updated_at = NOW() WHERE column_id = 2532572;
UPDATE k.column_registry SET column_purpose = $cp$Identifier of who/what triggered the digest run. NULL for cron-driven runs; set to an operator identifier for on_demand runs.$cp$, updated_at = NOW() WHERE column_id = 2532571;
UPDATE k.column_registry SET column_purpose = $cp$Inclusive lower bound of the time window scanned for findings to include in this digest.$cp$, updated_at = NOW() WHERE column_id = 2532570;
UPDATE k.column_registry SET column_purpose = $cp$Exclusive upper bound of the time window scanned for findings to include in this digest.$cp$, updated_at = NOW() WHERE column_id = 2532569;
UPDATE k.column_registry SET column_purpose = $cp$Count of distinct git commits whose findings were included in this digest run.$cp$, updated_at = NOW() WHERE column_id = 2532568;
UPDATE k.column_registry SET column_purpose = $cp$Total findings included in this digest run (sum of findings_critical + findings_warn + findings_info).$cp$, updated_at = NOW() WHERE column_id = 2532567;
UPDATE k.column_registry SET column_purpose = $cp$Count of findings with severity='critical' included in this digest run.$cp$, updated_at = NOW() WHERE column_id = 2532566;
UPDATE k.column_registry SET column_purpose = $cp$Count of findings with severity='warn' included in this digest run.$cp$, updated_at = NOW() WHERE column_id = 2532565;
UPDATE k.column_registry SET column_purpose = $cp$Count of findings with severity='info' included in this digest run.$cp$, updated_at = NOW() WHERE column_id = 2532564;
UPDATE k.column_registry SET column_purpose = $cp$Repository-relative path of the markdown digest file written to the GitHub repo by the external-reviewer-digest Edge Function. NULL until the digest assembly succeeds.$cp$, updated_at = NOW() WHERE column_id = 2532563;
UPDATE k.column_registry SET column_purpose = $cp$Git commit SHA on the GitHub repo that contains the digest file referenced by github_file_path. NULL until the digest assembly succeeds.$cp$, updated_at = NOW() WHERE column_id = 2532562;
UPDATE k.column_registry SET column_purpose = $cp$Wall-clock time the digest email was dispatched via Resend. NULL until email send succeeds.$cp$, updated_at = NOW() WHERE column_id = 2532561;
UPDATE k.column_registry SET column_purpose = $cp$Resend message identifier returned for the digest email send. NULL until email send succeeds.$cp$, updated_at = NOW() WHERE column_id = 2532560;
UPDATE k.column_registry SET column_purpose = $cp$Digest run lifecycle state. Default 'running'. Allowed values per D156 migration COMMENT: running | succeeded | failed. (Observed in production to date: succeeded, on a small population of 3 rows on a paused-per-D162 surface.)$cp$, updated_at = NOW() WHERE column_id = 2532559;
UPDATE k.column_registry SET column_purpose = $cp$Free-text error captured when the digest run transitions to status='failed'. NULL on succeeded or in-flight runs.$cp$, updated_at = NOW() WHERE column_id = 2532558;
UPDATE k.column_registry SET column_purpose = $cp$Row creation timestamp (default now()).$cp$, updated_at = NOW() WHERE column_id = 2532557;

-- ── Atomic count-delta verification (Lesson #38) ─────────────────────────────────
SELECT COUNT(*)::int INTO post_count
FROM k.column_registry cr
JOIN k.table_registry tr ON tr.table_id = cr.table_id
WHERE tr.schema_name = 'm'
  AND tr.table_name IN ('external_review_queue', 'compliance_review_queue', 'external_review_digest')
  AND (cr.column_purpose IS NULL
       OR cr.column_purpose = ''
       OR cr.column_purpose = 'PENDING_DOCUMENTATION'
       OR cr.column_purpose ILIKE 'TODO%');

IF pre_count - post_count <> expected_delta THEN
  RAISE EXCEPTION 'operator-alerting trio column-purpose verification failed: expected delta %, got % (pre=%, post=%). Expected post=0 (zero LOW-confidence rows escalated).',
    expected_delta, pre_count - post_count, pre_count, post_count;
END IF;

RAISE NOTICE 'operator-alerting trio column-purpose verification passed: delta % (pre=%, post=%, 0 LOW-confidence rows — JSONB ai_analysis schema cited in compliance-reviewer EF; D156 migration spec cited for the external-review pair).',
  pre_count - post_count, pre_count, post_count;

END;
$audit_operator_alerting_trio$;
