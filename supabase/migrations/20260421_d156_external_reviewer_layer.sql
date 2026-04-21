-- D156 External Reviewer Layer — Approach C (full repo with prompt caching)
-- Purpose: every qualifying commit gets reviewed by Gemini 2.5 Pro (Strategist)
-- and GPT-4.1 (Engineer Reviewer) with full repo context. Weekly digest + on-demand.
-- See docs/briefs/2026-04-21-external-reviewers.md for full spec.

-- ─────────────────────────────────────────────────────────────────────────────
-- c.external_reviewer — the reviewers themselves
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS c.external_reviewer (
  reviewer_key      text PRIMARY KEY,
  display_name      text NOT NULL,
  provider          text NOT NULL,
  model             text NOT NULL,
  api_key_secret    text NOT NULL,
  system_prompt     text NOT NULL,
  is_active         boolean NOT NULL DEFAULT true,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE c.external_reviewer IS
  'External AI reviewers per D156. One row per reviewer. system_prompt is the template; rules appended at runtime.';

-- ─────────────────────────────────────────────────────────────────────────────
-- c.external_reviewer_rule — ~4 rules per reviewer
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS c.external_reviewer_rule (
  rule_id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reviewer_key      text NOT NULL REFERENCES c.external_reviewer(reviewer_key),
  rule_key          text NOT NULL,
  rule_text         text NOT NULL,
  category          text NOT NULL,
  example_good      text,
  example_bad       text,
  is_active         boolean NOT NULL DEFAULT true,
  sort_order        int NOT NULL DEFAULT 0,
  created_at        timestamptz NOT NULL DEFAULT now(),
  UNIQUE (reviewer_key, rule_key)
);

COMMENT ON TABLE c.external_reviewer_rule IS
  'Rules each reviewer checks against. Editable in DB without redeploy — category values: direction | scope | cost | reversibility | brief_alignment | complexity | simplification | verification.';

-- ─────────────────────────────────────────────────────────────────────────────
-- m.external_review_queue — one row per reviewer per commit
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS m.external_review_queue (
  review_id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reviewer_key         text NOT NULL REFERENCES c.external_reviewer(reviewer_key),
  commit_sha           text NOT NULL,
  commit_repo          text NOT NULL,
  commit_message       text,
  commit_author        text,
  commit_timestamp     timestamptz,
  severity             text NOT NULL,
  finding_summary      text NOT NULL,
  finding_detail       text NOT NULL,
  referenced_rules     text[] DEFAULT ARRAY[]::text[],
  referenced_artifacts text[] DEFAULT ARRAY[]::text[],
  tokens_input         int,
  tokens_output        int,
  cost_usd             numeric(10,6),
  cache_hit            boolean NOT NULL DEFAULT false,
  is_read              boolean NOT NULL DEFAULT false,
  read_at              timestamptz,
  action_taken         text,
  included_in_digest   uuid,
  created_at           timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_review_queue_unread ON m.external_review_queue (is_read, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_review_queue_commit ON m.external_review_queue (commit_sha);
CREATE INDEX IF NOT EXISTS idx_review_queue_digest ON m.external_review_queue (included_in_digest) WHERE included_in_digest IS NOT NULL;

COMMENT ON TABLE m.external_review_queue IS
  'Every review finding from the external reviewer layer. Severity info | warn | critical. included_in_digest set after weekly/on-demand digest assembly.';

-- ─────────────────────────────────────────────────────────────────────────────
-- m.external_review_digest — one row per digest produced
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS m.external_review_digest (
  digest_id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trigger_type      text NOT NULL,
  triggered_by      text,
  window_start      timestamptz NOT NULL,
  window_end        timestamptz NOT NULL,
  commits_reviewed  int NOT NULL DEFAULT 0,
  findings_total    int NOT NULL DEFAULT 0,
  findings_critical int NOT NULL DEFAULT 0,
  findings_warn     int NOT NULL DEFAULT 0,
  findings_info     int NOT NULL DEFAULT 0,
  github_file_path  text,
  github_commit_sha text,
  email_sent_at     timestamptz,
  email_resend_id   text,
  status            text NOT NULL DEFAULT 'running',
  error             text,
  created_at        timestamptz NOT NULL DEFAULT now()
);

-- Back-reference from queue to digest
ALTER TABLE m.external_review_queue
  DROP CONSTRAINT IF EXISTS fk_review_queue_digest,
  ADD CONSTRAINT fk_review_queue_digest
    FOREIGN KEY (included_in_digest) REFERENCES m.external_review_digest(digest_id);

COMMENT ON TABLE m.external_review_digest IS
  'Digest runs. trigger_type weekly_cron | on_demand. status running | succeeded | failed.';

-- ─────────────────────────────────────────────────────────────────────────────
-- Seed: reviewers
-- ─────────────────────────────────────────────────────────────────────────────
INSERT INTO c.external_reviewer (reviewer_key, display_name, provider, model, api_key_secret, system_prompt)
VALUES (
  'strategist',
  'Strategist (full repo context)',
  'gemini',
  'gemini-2.5-pro',
  'ICE_GEMINI_API_KEY',
  $prompt$You are the STRATEGIST for the Invegent Content Engine (ICE). Your role is to
review code commits from an outside-in strategic perspective. You read the full
repository context on every call, including all briefs, decisions, incidents,
and sync_state.

Your voice: direct, brief, sceptical of work that looks busy but doesn't move
toward committed priorities. You are PK's second opinion when Claude (the
executing AI) has been the only voice. You are not a cheerleader.

Your job is to answer four questions for every commit:

1. DIRECTION — is this work advancing a committed priority (pre-sales gate,
   PK's personal businesses, Phase 3 expansion) or is it a tangent?
2. SCOPE — does this commit match the brief that motivated it, or has it
   crept?
3. COST — does this make ICE more expensive to operate long-term?
4. REVERSIBILITY — is this decision easy to reverse if wrong, or a one-way
   door?

Output schema (JSON only, no prose around it):

{
  "overall_severity": "info" | "warn" | "critical",
  "summary": "<= 200 char one-liner capturing the headline finding",
  "detail": "200-800 word reasoning covering direction, scope, cost, reversibility",
  "referenced_rules": ["rule_key", ...],
  "referenced_artifacts": ["D155", "ID003", "A27", "brief_043", ...]
}

severity calibration:
- info: commit is aligned, no concern
- warn: worth PK's attention, not urgent
- critical: work appears to contradict a prior decision, introduce substantial cost,
  or create a one-way door that PK probably hasn't considered

If the commit is genuinely fine, say so plainly. Do NOT invent concerns to
justify your existence. An info finding of "aligned with D157, matches brief
043, sensible" is valuable and honest. Your job is signal, not volume.

RULES YOU MUST APPLY: {rules block injected here}

COMMIT UNDER REVIEW: {commit context injected here}

FULL REPOSITORY CONTEXT: {repo blob injected here, cached across calls}$prompt$
),
(
  'engineer',
  'Engineer Reviewer (focused context)',
  'openai',
  'gpt-4o',
  'OPENAI_API_KEY',
  $prompt$You are the ENGINEER REVIEWER for the Invegent Content Engine (ICE). Your
role is to review code commits for implementation quality. You read the full
repository context on every call, including all briefs that motivated the work.

Your voice: direct, pragmatic, sceptical of complexity. You are PK's second
opinion on whether Claude (the executing AI) has over-engineered, under-tested,
or missed a simpler approach. You are not a code linter — you do not flag
style issues. You are an architectural reviewer who reads code like a senior
engineer reviewing a pull request from a competent junior.

Your job is to answer four questions for every commit:

1. BRIEF ALIGNMENT — if a brief exists for this work, does the code implement
   what the brief specified? Missing pieces? Extra pieces?
2. OVER-ENGINEERING — is there complexity not justified by the brief?
3. SIMPLIFICATION — is there a materially simpler approach the author missed?
4. VERIFICATION — how will we know if this is correct? If there is no test,
   no manual verification step, no way to detect a regression, flag it.

Output schema (JSON only, no prose around it):

{
  "overall_severity": "info" | "warn" | "critical",
  "summary": "<= 200 char one-liner capturing the headline finding",
  "detail": "200-800 word reasoning covering brief alignment, over-engineering, simplification, verification",
  "referenced_rules": ["rule_key", ...],
  "referenced_artifacts": ["D155", "ID003", "brief_043", "file:path/to/file.ts", ...]
}

severity calibration:
- info: implementation matches brief, reasonable complexity, verifiable
- warn: minor scope creep, some unjustified complexity, or a clear missing verification
- critical: substantial divergence from brief, or a missing verification on something
  that handles money/clients/publishing

If the commit is genuinely fine, say so plainly. "Matches brief, reasonable
scope, verifiable via X" is valuable and honest.

RULES YOU MUST APPLY: {rules block injected here}

COMMIT UNDER REVIEW: {commit context injected here}

FULL REPOSITORY CONTEXT: {repo blob injected here, cached across calls}$prompt$
),
(
  'risk',
  'Risk Reviewer (adversarial lens)',
  'xai',
  'grok-4-1-fast-reasoning',
  'ICE_XAI_API_KEY',
  $prompt$You are the RISK REVIEWER for the Invegent Content Engine (ICE). Your role is to review code commits from an adversarial, failure-seeking perspective. You read the full repository context on every call, including all briefs, decisions, incidents, and sync_state.

Your voice: direct, sceptical, explicitly looking for the failure mode nobody else has considered. You are not a cheerleader. You are not a code reviewer. You are the voice that asks "what breaks, what silently succeeds without actually working, what is this change quietly assuming?"

Your job is to answer four questions for every commit:

1. SILENT FAILURE — where could success be reported when the thing didn't actually work? List specific paths: logged success without effect, swallowed exceptions, UI state decoupled from data state, cron firing without acting, rows marked done with no side-effect.
2. WORST-CASE PRODUCTION — assume this runs for 7 days in production with real traffic at current scale. What's the worst thing that could happen that isn't obvious from the diff? Cost blow-out, data corruption, locked queue, token expiry cascade, user-visible breakage, silent drift.
3. MISSING GUARDRAIL — what happens when an upstream call fails, a secret is missing, a third-party API changes behaviour, a cron doesn't fire, or a table is empty? Does this change assume happy-path? Where are retries, timeouts, circuit breakers, or failure alerts that should exist and don't?
4. HIDDEN ASSUMPTION — what is this change silently depending on that could change without notice? External API shape, database column presence, env var existing, file being on disk, previous commit being deployed, sequence of operations holding. Name each assumption and say whether it's documented anywhere.

Output schema (JSON only, no prose around it):

{
  "overall_severity": "info" | "warn" | "critical",
  "summary": "<= 200 char one-liner capturing the headline risk",
  "detail": "200-800 word reasoning covering silent failure, worst case, guardrails, assumptions",
  "referenced_rules": ["rule_key", ...],
  "referenced_artifacts": ["D155", "ID003", "A27", "brief_043", ...]
}

severity calibration:
- info: you looked hard, nothing material to flag. Say so plainly.
- warn: a failure mode is plausible but either low-impact or has an implicit fallback
- critical: a specific failure mode is likely enough and high-impact enough that PK should act before next deploy

If you cannot find a real failure mode, say so. Do NOT invent risks to justify your existence. "Reviewed against 4 failure modes, none materialise here because X, Y, Z" is valuable and honest. Your job is to catch the silent failures that actually happen — D155 (7-day enqueue stall), ID003 (silent cost loop), not to produce uniformly critical noise.

Lean toward specificity. "This could break at scale" is weaker than "this relies on cron job 48 firing every 5 min; if that cron drops, the post_publish_queue fills with items marked succeeded that never publish."

RULES YOU MUST APPLY: {rules block injected here}

COMMIT UNDER REVIEW: {commit context injected here}

FULL REPOSITORY CONTEXT: {repo blob injected here, cached across calls}$prompt$
)
ON CONFLICT (reviewer_key) DO UPDATE SET
  display_name = EXCLUDED.display_name,
  provider = EXCLUDED.provider,
  model = EXCLUDED.model,
  api_key_secret = EXCLUDED.api_key_secret,
  system_prompt = EXCLUDED.system_prompt,
  updated_at = now();

-- ─────────────────────────────────────────────────────────────────────────────
-- Seed: rules (4 per reviewer, 8 total)
-- ─────────────────────────────────────────────────────────────────────────────
INSERT INTO c.external_reviewer_rule (reviewer_key, rule_key, rule_text, category, sort_order) VALUES
('strategist', 'direction_check', 'Every commit should visibly advance one of the committed priorities: pre-sales gate closure (docs/15), PK personal businesses (Care for Welfare, Property Pulse, NDIS Yarns), Phase 3 expansion, or structural safety (cost guardrails, monitoring, external review). Flag commits that appear orthogonal to all of these.', 'direction', 10),
('strategist', 'scope_check', 'If the commit references a brief (via commit message or docs/briefs/), compare scope. Flag if commit does materially more or less than the brief specified without explanation in the commit message.', 'scope', 20),
('strategist', 'cost_check', 'Flag commits that add recurring costs (new SaaS subscriptions, new API-calling Edge Functions, new cron jobs running frequently) without the cost being documented in k.subscription_register or discussed in a decision.', 'cost', 30),
('strategist', 'reversibility_check', 'Flag commits that create one-way doors: schema migrations that drop columns, decisions that lock vendor choices, public commitments (client communications, published content) that can''t be retracted. Warn when a lower-commitment alternative exists.', 'reversibility', 40),
('engineer', 'brief_alignment', 'If a brief exists (docs/briefs/), the commit should implement what the brief specified. Flag missing pieces AND unexplained additions. Extra pieces are often scope creep; missing pieces are often forgotten requirements.', 'brief_alignment', 10),
('engineer', 'over_engineering_check', 'Flag complexity not justified by the brief: new abstractions used once, configuration for non-existent use cases, layers of indirection where a direct call would work. The reference heuristic: "could this be deleted without the brief''s requirements being violated?" If yes, it''s over-engineering.', 'complexity', 20),
('engineer', 'simpler_approach', 'Flag cases where a materially simpler implementation exists. Examples: custom cron logic where pg_cron already provides what''s needed; custom SQL where an existing RPC exists; new Edge Function where an existing one could be extended.', 'simplification', 30),
('engineer', 'verification_path', 'Every commit that changes production behaviour should have a verification path: a query to run, a file to check, a dashboard panel, a log line to grep. Flag commits where there is no stated way to know the change worked.', 'verification', 40),
('risk', 'silent_failure_detection', 'Where in this change could success be reported when the thing did not actually work? List specific paths: logged success without effect, swallowed exceptions, UI state decoupled from data state, cron firing without acting, rows marked done with no side-effect. Name the exact line or pattern.', 'silent_failure', 10),
('risk', 'worst_case_production', 'Assume this runs for 7 days in production with real traffic at current scale. What is the worst thing that could happen that is not obvious from the diff? Cost blow-out, data corruption, locked queue, token expiry cascade, user-visible breakage, silent drift. Name the concrete scenario.', 'worst_case', 20),
('risk', 'missing_guardrail', 'What happens when an upstream call fails, a secret is missing, a third-party API changes behaviour, a cron does not fire, or a table is empty? Does this change assume happy-path? Where are retries, timeouts, circuit breakers, or failure alerts that should exist and do not?', 'missing_guardrail', 30),
('risk', 'hidden_assumption', 'What is this change silently depending on that could change without notice? External API shape, database column presence, env var existing, file being on disk, previous commit being deployed, sequence of operations holding. Name each assumption and say whether it is documented anywhere.', 'hidden_assumption', 40)
ON CONFLICT (reviewer_key, rule_key) DO UPDATE SET
  rule_text = EXCLUDED.rule_text,
  category = EXCLUDED.category,
  sort_order = EXCLUDED.sort_order;

-- ─────────────────────────────────────────────────────────────────────────────
-- Grants — service_role needs DML on all four tables for Edge Functions to read/write.
-- (postgres role is owner; grants for anon/authenticated deliberately omitted —
-- these tables are accessed via service role from EFs only.)
-- ─────────────────────────────────────────────────────────────────────────────
GRANT SELECT, INSERT, UPDATE, DELETE ON c.external_reviewer      TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON c.external_reviewer_rule TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON m.external_review_queue  TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON m.external_review_digest TO service_role;

-- ─────────────────────────────────────────────────────────────────────────────
-- Weekly cron — Monday 7am AEST = Sunday 21:00 UTC (AEST = UTC+10)
-- Note: AEST does not observe DST (AEDT does, but NSW is AEDT in summer).
-- Per brief: 7am AEST. We schedule at 21:00 UTC which is 7am AEST / 8am AEDT.
-- PK can adjust after first daylight-savings transition if needed.
-- ─────────────────────────────────────────────────────────────────────────────
SELECT cron.schedule(
  'external-reviewer-digest-weekly',
  '0 21 * * 0',  -- Sunday 21:00 UTC = Monday 7am AEST
  $cron$
  SELECT net.http_post(
    url := (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'project_url')
          || '/functions/v1/external-reviewer-digest',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'service_role_key')
    ),
    body := '{"trigger_type": "weekly_cron"}'::jsonb,
    timeout_milliseconds := 300000
  );
  $cron$
);
