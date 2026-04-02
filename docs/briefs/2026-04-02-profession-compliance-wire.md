# Claude Code Autonomous Brief
## ICE — Profession Compliance Wire + k Registry + Token Alert

**Date:** 2 April 2026
**Author:** PK via Claude (chat session)
**Status:** READY FOR EXECUTION
**Estimated duration:** 2-3 hours autonomous execution
**Agentic loop test:** YES — this brief is designed to run without human intervention

---

## HOW TO USE THIS BRIEF

This brief is written for Claude Code to execute autonomously in a loop.

**Before starting:**
1. Read `docs/00_sync_state.md` from GitHub — confirm system state
2. Read this file completely before executing any step
3. Check the CURRENT STATE section of each task — use it to determine if the task is already done
4. Execute tasks IN ORDER — later tasks depend on earlier ones
5. After each task, run the VERIFICATION QUERY — if it passes, move on; if it fails, retry once then write a failure note to `docs/briefs/2026-04-02-progress.md`
6. When all tasks complete, update `docs/briefs/2026-04-02-progress.md` with COMPLETE status and timestamp

**What you have access to:**
- GitHub MCP (read/write files, push commits)
- Supabase MCP (execute SQL, apply migrations, deploy Edge Functions)
- Vercel MCP (list deployments, trigger redeploys)

**What this tests:**
This is the first autonomous agentic loop execution for ICE. The tasks are well-defined, reversible, and have clear verification steps. If a step is genuinely ambiguous, skip it and note the reason rather than guessing.

---

## SYSTEM CONTEXT

**Project:** ICE — Invegent Content Engine
**Supabase project:** `mbkmaxqhsohbtwsqolns` (ap-southeast-2)
**GitHub org:** `Invegent`
**Repos:** `Invegent-content-engine` (Edge Functions + docs), `invegent-dashboard`
**Vercel team:** `pk-2528s-projects` / `team_kYqCrehXYxW02AycsKVzwNrE`

**Critical DB access pattern:**
- `exec_sql` RPC: READ-ONLY on `m`, `c`, `f`, `t` schemas — DML will silently fail
- All DML on those schemas requires `SECURITY DEFINER` functions in `public` schema called via `.rpc()`
- `apply_migration` tool: use for all DDL (CREATE TABLE, ALTER TABLE, etc.)
- `execute_sql` tool: use for read queries and DML on `public` schema functions

**What was built in the preceding session (2 Apr 2026):**
- `t.profession` table: 12 professions seeded (7 NDIS, 5 property)
- `profession_slugs text[]` column on `t.5.7_compliance_rule`: 4 rules scoped
- `profession_slug` column on `m.compliance_policy_source`, `m.compliance_review_queue`, `c.client`
- Care for Welfare (`client_id = 'fb98a472-ae4d-432d-8738-2273231c1ef4'`) set to `profession_slug = 'occupational_therapy'`
- `public.get_compliance_rules(p_vertical_slug text, p_profession_slug text)` SECURITY DEFINER function
- `compliance-reviewer` Edge Function v1.3.0 deployed — uses profession-scoped rule loading
- **CRITICAL GAP:** `ai-worker` still loads compliance rules WITHOUT profession scoping — it uses a raw SQL query that ignores `profession_slugs` and loads ALL vertical rules regardless of client profession

**k schema (governance catalog) — key facts:**
- `k.schema_registry`: 8 schemas fully documented
- `k.table_registry`: all tables auto-registered but many have "TODO" purpose descriptions
- `k.vw_table_summary`: best navigation view — schema, table, purpose, columns, FK edges
- `k.vw_db_columns`: column metadata across all registered tables
- New tables from this session are already in `k.table_registry` with "TODO" purposes — they need to be updated, not inserted

---

## TASK 1 — Wire profession-scoped compliance rules into ai-worker

### What this does
The `fetchComplianceBlock` function in `ai-worker/index.ts` currently loads compliance rules
using a raw SQL query that:
1. Gets vertical slugs from `c.client_content_scope`
2. Loads ALL rules where `vertical_slug IN (...)` — ignoring `profession_slugs[]` entirely
3. Does NOT load global rules (`vertical_slug IS NULL`) — these are missed entirely

The fix replaces this with profession-aware loading that:
1. Gets vertical slugs (same as now)
2. Gets client's `profession_slug` from `c.client`
3. Loads: vertical-specific rules scoped to the client's profession + universal vertical rules + global rules
4. A client with no `profession_slug` gets only universal and global rules (safe default)

### CURRENT STATE CHECK
Before making any changes, verify the current rule loading:
```sql
-- Supabase execute_sql
-- Check if fetchComplianceBlock already uses profession scoping
-- (We check by looking at the ai-worker version and the current compliance rule query pattern)
SELECT 
  (SELECT ai_confidence FROM m.compliance_review_queue LIMIT 1) AS has_ai_analysis,
  (SELECT profession_slug FROM c.client WHERE client_id = 'fb98a472-ae4d-432d-8738-2273231c1ef4') AS ndis_profession,
  (SELECT COUNT(*) FROM t."5.7_compliance_rule" WHERE profession_slugs IS NOT NULL) AS scoped_rules;
```

If `ndis_profession` = `occupational_therapy` and `scoped_rules` >= 4, the DB is correct and this is about updating the Edge Function.

### EXACT CHANGE REQUIRED

**File:** `supabase/functions/ai-worker/index.ts`
**Function to replace:** `fetchComplianceBlock` (the complete async function)

**Current implementation** loads rules with this SQL (inside the function):
```
WHERE vertical_slug IN (${slugList}) AND is_active = true ORDER BY sort_order ASC
```

**Replacement implementation:**

Replace the ENTIRE `fetchComplianceBlock` function with this:

```typescript
async function fetchComplianceBlock(
  supabase: ReturnType<typeof getServiceClient>,
  clientId: string
): Promise<string> {
  try {
    // Step 1: Get client's verticals and profession
    const { data: scopeRows } = await supabase.rpc('exec_sql', {
      query: `
        SELECT DISTINCT cv.vertical_slug
        FROM c.client_content_scope ccs
        JOIN t.content_vertical cv ON cv.vertical_id = ccs.vertical_id
        WHERE ccs.client_id = '${clientId}'
          AND cv.is_active = true
          AND cv.vertical_slug IS NOT NULL
      `
    });
    const slugs: string[] = (scopeRows ?? []).map((r: any) => r.vertical_slug).filter(Boolean);
    if (!slugs.length) return '';

    // Step 2: Get client's profession_slug (may be null)
    const { data: clientRow } = await supabase.rpc('exec_sql', {
      query: `SELECT profession_slug FROM c.client WHERE client_id = '${clientId}'`
    });
    const professionSlug: string | null = (clientRow as any[])?.[0]?.profession_slug ?? null;

    // Step 3: Load scoped compliance rules
    // Loads:
    //   a) Vertical-specific rules where profession_slugs IS NULL (universal for all professions)
    //   b) Vertical-specific rules where client's profession is in profession_slugs[]
    //   c) Global rules where vertical_slug IS NULL (apply to all clients always)
    const slugList = slugs.map(s => `'${s}'`).join(',');
    const professionFilter = professionSlug
      ? `OR '${professionSlug}' = ANY(profession_slugs)`
      : '';

    const { data: ruleRows } = await supabase.rpc('exec_sql', {
      query: `
        SELECT DISTINCT ON (rule_key)
          rule_name, rule_text, risk_level, enforcement, examples_good, examples_bad, sort_order
        FROM t."5.7_compliance_rule"
        WHERE is_active = true
          AND (
            -- Vertical-specific rules (universal or profession-matched)
            (
              vertical_slug IN (${slugList})
              AND (profession_slugs IS NULL ${professionFilter})
            )
            -- Global rules: vertical_slug IS NULL — always apply
            OR vertical_slug IS NULL
          )
        ORDER BY rule_key, sort_order ASC
      `
    });

    const rules: any[] = ruleRows ?? [];
    if (!rules.length) return '';

    // Step 4: Build compliance block text (same format as before)
    const lines: string[] = [
      '=== COMPLIANCE REQUIREMENTS ===',
      'HARD_BLOCK: if violated, return {"skip": true, "reason": "compliance_block: [rule_name]"}.',
      'SOFT_WARN: apply best judgment.',
      '',
    ];
    for (const rule of rules) {
      lines.push(`RULE: ${rule.rule_name} [${rule.risk_level.toUpperCase()} \u2014 ${rule.enforcement}]`);
      lines.push(rule.rule_text);
      if (rule.examples_bad && !rule.examples_bad.startsWith('TBD'))
        lines.push(`  PROHIBITED: ${rule.examples_bad}`);
      if (rule.examples_good && !rule.examples_good.startsWith('TBD'))
        lines.push(`  PREFERRED: ${rule.examples_good}`);
      lines.push('');
    }
    if (professionSlug) {
      lines.push(`[Rules loaded for vertical(s): ${slugs.join(', ')} | profession: ${professionSlug}]`);
    }
    lines.push('=== END COMPLIANCE ===', '');
    return lines.join('\n');

  } catch (e: any) {
    console.error('[ai-worker] fetchComplianceBlock failed:', e?.message);
    return '';
  }
}
```

**Also update the VERSION constant** at the top of the file:
```
// Change: const VERSION = "ai-worker-v2.6.1";
// To:
const VERSION = "ai-worker-v2.7.0";
// Add comment:
// v2.7.0 — Profession-scoped compliance rule loading (D066)
//   fetchComplianceBlock now loads rules filtered by client profession_slug
//   An OT client gets OT-specific rules; a support worker gets only universal rules
//   Global rules (vertical_slug IS NULL) now correctly included for all clients
```

### EXECUTION STEPS

1. Read current `supabase/functions/ai-worker/index.ts` from GitHub
2. Locate the `fetchComplianceBlock` function (search for `async function fetchComplianceBlock`)
3. Replace the entire function with the new implementation above
4. Update the VERSION constant and comment block
5. Push the updated file to GitHub: `supabase/functions/ai-worker/index.ts`
6. Deploy the Edge Function via Supabase MCP

### VERIFICATION QUERY
After deployment, run this to confirm the Edge Function is live:
```sql
-- execute_sql
SELECT 
  'ai-worker deployed' AS check,
  NOW() AS checked_at;
```
Then check Supabase Edge Functions list — `ai-worker` should show deploy# incremented.

Also verify the function logic by checking the compliance block would load correctly:
```sql
-- execute_sql  
SELECT 
  c.client_name,
  c.profession_slug,
  cv.vertical_slug,
  COUNT(cr.rule_key) AS rules_that_should_load
FROM c.client c
JOIN c.client_content_scope ccs ON ccs.client_id = c.client_id
JOIN t.content_vertical cv ON cv.vertical_id = ccs.vertical_id
CROSS JOIN t."5.7_compliance_rule" cr
WHERE c.client_id = 'fb98a472-ae4d-432d-8738-2273231c1ef4'
  AND cr.is_active = true
  AND (
    (cr.vertical_slug IN ('ndis','au-disability-policy') AND (cr.profession_slugs IS NULL OR 'occupational_therapy' = ANY(cr.profession_slugs)))
    OR cr.vertical_slug IS NULL
  )
GROUP BY c.client_name, c.profession_slug, cv.vertical_slug;
```
Expected: NDIS-Yarns / occupational_therapy / ndis should show ~22 rules (not 20).

### DONE WHEN
- `ai-worker` Edge Function deployed with version `ai-worker-v2.7.0`
- Verification query shows 22 rules for NDIS-Yarns OT client (not 20)

---

## TASK 2 — Extend t.profession with ANZSCO + code of conduct fields

### What this does
`t.profession` currently has no connection to ANZSCO (occupation classifications) or to
codes of conduct. This task adds those fields and backfills them for the 12 existing professions.

The ANZSCO connection enables the future AI compliance rule generator to read occupation tasks.
The code_of_conduct_url enables the compliance-reviewer to fetch and analyse the actual
professional obligations that govern what content is allowed.

### CURRENT STATE CHECK
```sql
-- execute_sql
SELECT column_name FROM information_schema.columns
WHERE table_schema = 't' AND table_name = 'profession'
ORDER BY ordinal_position;
```
If `anzsco_occupation_id` is NOT in the list, Task 2 is not done. If it IS there, skip to verification.

### SCHEMA MIGRATION

Apply this migration (name: `profession_anzsco_conduct_fields`):

```sql
-- Add ANZSCO and code of conduct fields to t.profession
ALTER TABLE t.profession
  ADD COLUMN IF NOT EXISTS anzsco_occupation_id   integer,
  ADD COLUMN IF NOT EXISTS anzsic_class_code       varchar(10),
  ADD COLUMN IF NOT EXISTS code_of_conduct_url     text,
  ADD COLUMN IF NOT EXISTS code_of_conduct_name    text,
  ADD COLUMN IF NOT EXISTS regulator_website       text;

COMMENT ON COLUMN t.profession.anzsco_occupation_id  IS 'ANZSCO occupation_id from t.2.4_anzsco_occupation — links profession to official occupation classification and task list';
COMMENT ON COLUMN t.profession.anzsic_class_code     IS 'ANZSIC class code from t.1.4_anzsic_class — links profession to industry classification';
COMMENT ON COLUMN t.profession.code_of_conduct_url   IS 'URL of the primary code of conduct / registration standards for this profession — used by compliance-reviewer to fetch and analyse obligations';
COMMENT ON COLUMN t.profession.code_of_conduct_name  IS 'Human-readable name of the code of conduct document';
COMMENT ON COLUMN t.profession.regulator_website     IS 'Primary regulator website for this profession';
```

### VERIFY ANZSCO IDs BEFORE BACKFILLING

Run these queries to confirm the ANZSCO occupation_ids exist in the DB before using them:
```sql
-- execute_sql
SELECT occupation_id, occupation_name
FROM t."2.4_anzsco_occupation"
WHERE occupation_id IN (252411, 252511, 252712, 222112, 612114)
ORDER BY occupation_id;
```
Expected: 5 rows. If any are missing, use NULL for that profession.

Also confirm ANZSIC class codes exist:
```sql
-- execute_sql
SELECT anzsic_class_code, anzsic_class_name
FROM t."1.4_anzsic_class"
WHERE anzsic_class_code IN ('8539','8533','6720','8599')
ORDER BY anzsic_class_code;
```
Expected: 4 rows.

### BACKFILL DATA

After confirming the codes exist, apply this migration (name: `profession_backfill_anzsco_conduct`):

```sql
-- NDIS professions
UPDATE t.profession SET
  anzsco_occupation_id  = 252411,
  anzsic_class_code     = '8539',
  code_of_conduct_url   = 'https://www.occupationaltherapyboard.gov.au/Policies-and-Resources/Policies.aspx',
  code_of_conduct_name  = 'OT Board of Australia Registration Standards',
  regulator_website     = 'https://www.occupationaltherapyboard.gov.au'
WHERE profession_slug = 'occupational_therapy';

UPDATE t.profession SET
  anzsco_occupation_id  = 252511,
  anzsic_class_code     = '8533',
  code_of_conduct_url   = 'https://www.physiotherapyboard.gov.au/Standards-and-Guidelines.aspx',
  code_of_conduct_name  = 'Physiotherapy Board of Australia Registration Standards',
  regulator_website     = 'https://www.physiotherapyboard.gov.au'
WHERE profession_slug = 'physiotherapy';

UPDATE t.profession SET
  anzsco_occupation_id  = 252712,
  anzsic_class_code     = '8539',
  code_of_conduct_url   = 'https://www.speechpathologyboard.gov.au/Policies-and-Resources/Policies.aspx',
  code_of_conduct_name  = 'Speech Pathology Board of Australia Registration Standards',
  regulator_website     = 'https://www.speechpathologyboard.gov.au'
WHERE profession_slug = 'speech_pathology';

UPDATE t.profession SET
  anzsco_occupation_id  = NULL,
  anzsic_class_code     = '8539',
  code_of_conduct_url   = 'https://www.ndiscommission.gov.au/workers/behaviour-support-practitioners',
  code_of_conduct_name  = 'NDIS Commission — Behaviour Support Practitioner Requirements',
  regulator_website     = 'https://www.ndiscommission.gov.au'
WHERE profession_slug = 'behaviour_support';

UPDATE t.profession SET
  anzsco_occupation_id  = NULL,
  anzsic_class_code     = '8699',
  code_of_conduct_url   = 'https://www.ndiscommission.gov.au/providers/provider-obligations/code-conduct',
  code_of_conduct_name  = 'NDIS Code of Conduct',
  regulator_website     = 'https://www.ndiscommission.gov.au'
WHERE profession_slug = 'support_coordination';

UPDATE t.profession SET
  anzsco_occupation_id  = NULL,
  anzsic_class_code     = '8699',
  code_of_conduct_url   = 'https://www.ndiscommission.gov.au/providers/provider-obligations/code-conduct',
  code_of_conduct_name  = 'NDIS Code of Conduct',
  regulator_website     = 'https://www.ndiscommission.gov.au'
WHERE profession_slug = 'support_worker';

UPDATE t.profession SET
  anzsco_occupation_id  = NULL,
  anzsic_class_code     = '8699',
  code_of_conduct_url   = 'https://www.ndiscommission.gov.au/providers/registered-providers/plan-management',
  code_of_conduct_name  = 'NDIS Commission — Plan Management Requirements',
  regulator_website     = 'https://www.ndiscommission.gov.au'
WHERE profession_slug = 'plan_management';

-- Property professions
UPDATE t.profession SET
  anzsco_occupation_id  = 222112,
  anzsic_class_code     = NULL,
  code_of_conduct_url   = 'https://www.mfaa.com.au/code-of-practice',
  code_of_conduct_name  = 'MFAA Code of Practice',
  regulator_website     = 'https://asic.gov.au'
WHERE profession_slug = 'mortgage_broking';

UPDATE t.profession SET
  anzsco_occupation_id  = 612114,
  anzsic_class_code     = '6720',
  code_of_conduct_url   = 'https://www.fairtrading.nsw.gov.au/trades-and-businesses/licensing-and-certification/real-estate-industry',
  code_of_conduct_name  = 'NSW Fair Trading Real Estate Licensing Requirements',
  regulator_website     = 'https://www.fairtrading.nsw.gov.au'
WHERE profession_slug = 'real_estate_agent';

UPDATE t.profession SET
  anzsco_occupation_id  = 612114,
  anzsic_class_code     = '6720',
  code_of_conduct_url   = 'https://rebaa.com.au/code-of-conduct/',
  code_of_conduct_name  = 'REBAA Code of Conduct',
  regulator_website     = 'https://www.fairtrading.nsw.gov.au'
WHERE profession_slug = 'buyers_agent';

UPDATE t.profession SET
  anzsco_occupation_id  = NULL,
  anzsic_class_code     = NULL,
  code_of_conduct_url   = 'https://www.fairtrading.nsw.gov.au/trades-and-businesses/licensing-and-certification/contractor-licences',
  code_of_conduct_name  = 'NSW Fair Trading Builder Licensing Requirements',
  regulator_website     = 'https://www.fairtrading.nsw.gov.au'
WHERE profession_slug = 'building';

UPDATE t.profession SET
  anzsco_occupation_id  = NULL,
  anzsic_class_code     = NULL,
  code_of_conduct_url   = 'https://asic.gov.au/regulatory-resources/financial-services/giving-financial-product-advice/',
  code_of_conduct_name  = 'ASIC Financial Product Advice Requirements',
  regulator_website     = 'https://asic.gov.au'
WHERE profession_slug = 'property_investment';
```

### VERIFICATION QUERY
```sql
-- execute_sql
SELECT 
  profession_slug,
  anzsco_occupation_id IS NOT NULL AS has_anzsco,
  code_of_conduct_url IS NOT NULL AS has_cod_url,
  regulator_website IS NOT NULL AS has_regulator
FROM t.profession
ORDER BY vertical_slug, profession_slug;
```
Expected: 12 rows. At least 9 of 12 should have `has_cod_url = true`. All NDIS professions should have `has_regulator = true`.

### DONE WHEN
- `anzsco_occupation_id`, `code_of_conduct_url`, `regulator_website` columns exist on `t.profession`
- All 12 professions have `code_of_conduct_url` populated
- OT, Physio, Speech have `anzsco_occupation_id` populated

---

## TASK 3 — Update k schema registry with purpose descriptions

### What this does
The k schema is ICE's governance catalog. Every table should have a documented purpose.
New and updated tables from the 2 Apr 2026 session have auto-registered "TODO" entries.
This task updates them with accurate descriptions.

This matters because:
- Claude Code sessions should use `k.vw_table_summary` as the navigation tool, not `information_schema`
- Undocumented tables appear in `k.vw_doc_backlog_tables` as gaps
- The k schema is PK's single-source navigation layer for the entire DB

### CURRENT STATE CHECK
```sql
-- execute_sql
SELECT table_name, LEFT(purpose, 60) AS purpose_preview
FROM k.table_registry
WHERE schema_name IN ('t','m')
  AND (purpose LIKE 'TODO%' OR purpose IS NULL)
  AND table_name IN (
    'profession','pipeline_doctor_log','compliance_review_queue',
    'post_publish_queue','post_seed','compliance_policy_source'
  )
ORDER BY schema_name, table_name;
```
If rows are returned, Task 3 is needed. If 0 rows, all are already documented — skip.

### UPDATES TO APPLY

Use `execute_sql` (DML on k schema is allowed via direct SQL):

```sql
-- Update t.profession
UPDATE k.table_registry SET
  purpose = 'Reference table defining professions served by ICE across verticals. Links each profession to its ANZSCO occupation code, ANZSIC industry class, primary regulator, and code of conduct URL. Used to scope compliance rules (via profession_slugs[]) and content generation (via client.profession_slug) to the correct regulatory obligations for each client practice type.',
  primary_use_cases = 'Scope compliance rules to profession; Provide ANZSCO occupation_id for task lookup; Store code_of_conduct_url for compliance-reviewer Jina fetch; Link client practice type to regulatory context; Drive get_compliance_rules() two-dimension filter',
  join_keys = 'PK: profession_slug | FK: anzsco_occupation_id -> t.2.4_anzsco_occupation.occupation_id (soft) | FK: anzsic_class_code -> t.1.4_anzsic_class.anzsic_class_code (soft) | Referenced by: c.client.profession_slug, m.compliance_policy_source.profession_slug, m.compliance_review_queue.profession_slug, t.5.7_compliance_rule.profession_slugs[]',
  advisory = 'profession_slug is the stable join key — never rename. code_of_conduct_url is fetched by compliance-reviewer via Jina reader; ensure URLs are stable government/regulator pages. ANZSCO and ANZSIC codes are soft FKs — no DB constraint enforced. Add new professions here before configuring client.profession_slug.',
  updated_at = NOW()
WHERE schema_name = 't' AND table_name = 'profession';

-- Update m.pipeline_doctor_log
UPDATE k.table_registry SET
  purpose = 'Audit log of pipeline-doctor Edge Function runs. Written by m.harvest_pipeline_doctor_log() which runs at :17/:47 (2 min after each doctor run at :15/:45) and reads the doctor HTTP response from net._http_response. Stores: checks_run, issues_found, fixes_applied, findings JSONB. Acknowledged dead items are excluded from issues_found count so the log reflects true unresolved issues only.',
  primary_use_cases = 'Track doctor run history; Power Monitor > Pipeline dashboard; Provide input data for AI Diagnostic Tier 2 action selection; Detect patterns in recurring issues; Audit fix history',
  join_keys = 'PK: log_id (uuid) | No FK edges — standalone audit log. Read by: dashboard pipeline-log page, AI Diagnostic Tier 2 agent',
  advisory = 'Written by harvest_pipeline_doctor_log() pg_cron job, not directly by the doctor Edge Function. issues_found is adjusted to exclude acknowledged queue items (acknowledged_at IS NOT NULL). Never delete rows — audit trail.',
  updated_at = NOW()
WHERE schema_name = 'm' AND table_name = 'pipeline_doctor_log';

-- Update m.compliance_review_queue
UPDATE k.table_registry SET
  purpose = 'Review queue populated by compliance-monitor when a monitored policy URL hash changes. Extended 2 Apr 2026 with AI analysis columns written by compliance-reviewer Edge Function. Each row represents one policy URL change event. Status lifecycle: pending -> reviewed | dismissed. AI analysis lifecycle: ai_reviewed_at IS NULL -> compliance-reviewer writes ai_analysis JSONB, ai_confidence, ai_reviewed_at.',
  primary_use_cases = 'Surface compliance alerts in dashboard Monitor > Compliance; Store AI analysis of changed pages; Track review status and human review notes; Feed compliance-reviewer with pending items; Provide audit trail of policy changes',
  join_keys = 'PK: review_id (uuid) | FK: source_key -> m.compliance_policy_source.source_key (soft) | Written by: compliance-monitor (hash change detection), compliance-reviewer (AI analysis). Read by: dashboard compliance page, /api/compliance route',
  advisory = 'DML requires store_compliance_ai_analysis() SECURITY DEFINER function — exec_sql cannot write to this table. ai_analysis is JSONB with schema: {summary, relevance, key_changes[], affected_rules[], new_rules_suggested[], human_action_required, confidence, confidence_reason}. profession_slug inherited from compliance_policy_source.',
  updated_at = NOW()
WHERE schema_name = 'm' AND table_name = 'compliance_review_queue';

-- Update m.post_publish_queue
UPDATE k.table_registry SET
  purpose = 'Queue of approved post drafts awaiting publication. Publisher Edge Function polls this table every 5 minutes for due items in auto mode. Extended 2 Apr 2026 with acknowledged_at / acknowledged_by columns: dead items with acknowledged_at set are excluded from doctor alerting, allowing known-bad items to be formally closed without deletion.',
  primary_use_cases = 'Drive automated publisher scheduling; Surface queue depth in monitoring; Allow manual publish trigger for manual-mode clients; Audit publish attempts and errors; Track acknowledged dead items',
  join_keys = 'PK: queue_id (uuid) | FK: post_draft_id -> m.post_draft.post_draft_id | FK: client_id -> c.client.client_id',
  advisory = 'Dead items are NEVER deleted — acknowledged_at marks them as reviewed, not removed. attempt_count tracks retry exhaustion. locked_by / locked_at implement optimistic locking for concurrent publisher workers.',
  updated_at = NOW()
WHERE schema_name = 'm' AND table_name = 'post_publish_queue';

-- Update m.post_seed
UPDATE k.table_registry SET
  purpose = 'Seeding record linking a digest bundle to AI generation. Created by seed_client_to_ai_v2() when a bundle is ready for generation. Extended 2 Apr 2026 with platform column — constraint post_seed_uniq_run_item_platform on (digest_run_id, digest_item_id, platform) ensures one seed per bundle per platform. YouTube is excluded from the text pipeline — it gets content via video-worker separately.',
  primary_use_cases = 'Track which digest bundles have been seeded to AI; Prevent duplicate AI jobs for same bundle+platform; Drive ai_job creation; Link digest_run to post_draft via seed_payload',
  join_keys = 'PK: post_seed_id (uuid) | UNIQUE: (digest_run_id, digest_item_id, platform) | FK: digest_run_id -> m.digest_run | FK: digest_item_id -> m.digest_item | FK: client_id -> c.client',
  advisory = 'platform column added 2 Apr 2026 (D062). YouTube platform excluded from this table — video pipeline runs separately. ON CONFLICT target is post_seed_uniq_run_item_platform — ensure any upsert logic references this constraint name.',
  updated_at = NOW()
WHERE schema_name = 'm' AND table_name = 'post_seed';

-- Update m.compliance_policy_source
UPDATE k.table_registry SET
  purpose = 'Master list of compliance policy URLs monitored by compliance-monitor. One row per URL. compliance-monitor hashes each URL monthly and creates compliance_review_queue items when the hash changes. Extended with profession_slug (scope URL to specific profession or NULL for whole vertical) and vertical_context (description injected into compliance-reviewer AI prompt).',
  primary_use_cases = 'Configure which URLs compliance-monitor checks; Provide vertical_context for compliance-reviewer AI prompt; Store content hash baseline; Track last_checked_at and last_changed_at; Scope monitoring to profession via profession_slug',
  join_keys = 'PK: source_id (uuid) | UNIQUE: source_key | FK: profession_slug -> t.profession.profession_slug (soft) | Referenced by: m.compliance_review_queue.source_key',
  advisory = 'vertical_context is a plain-English description of the vertical injected into the Claude system prompt during compliance analysis — keep it current and accurate. profession_slug NULL means the URL applies to all professions in the vertical.',
  updated_at = NOW()
WHERE schema_name = 'm' AND table_name = 'compliance_policy_source';

-- Update t.content_vertical
UPDATE k.table_registry SET
  purpose = 'Hierarchical taxonomy of content verticals from global to jurisdiction-specific. Global verticals (is_global=true) have no parent; jurisdiction-specific verticals have a parent_id pointing to the global vertical. Verticals are linked to content domains via domain_id and to clients via c.client_content_scope. Used by bundler for content relevance scoping and by compliance rules for vertical_slug matching.',
  primary_use_cases = 'Define vertical scope for each client; Drive compliance rule vertical_slug matching; Scope bundler content selection; Link global vertical to jurisdiction programs (NDIS under Disability Services); Support future multi-jurisdiction expansion',
  join_keys = 'PK: vertical_id | FK: parent_id -> t.content_vertical.vertical_id (self-ref) | FK: domain_id -> t.6.0_content_domain.domain_id | Referenced by: c.client_content_scope.vertical_id, t.5.7_compliance_rule.vertical_slug (via slug), m.compliance_policy_source.vertical_slug (via slug)',
  advisory = 'vertical_slug is the stable string key used by compliance rules and policy sources — never change existing slugs. Add new jurisdictions by adding child rows under existing global verticals, never modifying the global parent.',
  updated_at = NOW()
WHERE schema_name = 't' AND table_name = 'content_vertical';
```

### VERIFICATION QUERY
```sql
-- execute_sql
SELECT table_name, LEFT(purpose, 80) AS purpose_preview
FROM k.table_registry
WHERE schema_name IN ('t','m')
  AND table_name IN (
    'profession','pipeline_doctor_log','compliance_review_queue',
    'post_publish_queue','post_seed','compliance_policy_source','content_vertical'
  )
ORDER BY schema_name, table_name;
```
Expected: 7 rows, none with "TODO" in the purpose column.

### DONE WHEN
- 7 table_registry entries updated with meaningful purpose descriptions
- `k.vw_doc_backlog_tables` shows 0 rows for these tables

---

## TASK 4 — Cowork weekly token expiry alert task

### What this does
NDIS Yarns Facebook token expires 31 May 2026 — 59 days from now.
Without a proactive alert, the token will expire and publishing will silently stop.

This task creates a Cowork automation file that:
- Runs every Friday at 8am AEST (Thursday 10pm UTC)
- Queries `c.client_publish_profile` for any token expiring within 30 days
- If found: writes a markdown alert to `docs/alerts/token_expiry_YYYY_MM_DD.md` and commits to GitHub
- If none: writes a brief "all tokens healthy" entry to `docs/alerts/token_health_log.md`

### CURRENT STATE CHECK
```sql
-- execute_sql
-- Check current token expiry status
SELECT 
  c.client_name,
  cpp.platform,
  cpp.page_name,
  cpp.token_expires_at,
  CASE 
    WHEN cpp.token_expires_at IS NULL THEN 'NO_EXPIRY_TRACKED'
    WHEN cpp.token_expires_at < NOW() + INTERVAL '30 days' THEN 'EXPIRES_SOON'
    WHEN cpp.token_expires_at < NOW() + INTERVAL '60 days' THEN 'EXPIRES_WITHIN_60_DAYS'
    ELSE 'OK'
  END AS status
FROM c.client_publish_profile cpp
JOIN c.client c ON c.client_id = cpp.client_id
WHERE cpp.publish_enabled = true
ORDER BY cpp.token_expires_at ASC NULLS FIRST;
```

Check whether `docs/cowork/tasks/` directory exists in GitHub. If not, create the directory structure.

### CREATE THE COWORK TASK FILE

Create this file at `docs/cowork/tasks/weekly_token_alert.md`:

```markdown
# Cowork Task — Weekly Token Expiry Alert
**Schedule:** Friday 8:00am AEST (Thursday 22:00 UTC)
**cron:** 0 22 * * 4
**Type:** Health monitoring
**Autonomy:** Full — runs without human input

## Purpose
Check all active client platform tokens for upcoming expiry.
Alert if any token expires within 30 days.
Log health status regardless of alert.

## Steps

### 1. Query token status
Connect to Supabase project `mbkmaxqhsohbtwsqolns` and run:

```sql
SELECT 
  c.client_name,
  cpp.platform,
  cpp.page_name,
  cpp.credential_env_key,
  cpp.token_expires_at,
  CASE 
    WHEN cpp.token_expires_at IS NULL THEN 'no_expiry_tracked'
    WHEN cpp.token_expires_at < NOW() + INTERVAL '7 days'  THEN 'critical'
    WHEN cpp.token_expires_at < NOW() + INTERVAL '30 days' THEN 'warning'
    WHEN cpp.token_expires_at < NOW() + INTERVAL '60 days' THEN 'watch'
    ELSE 'ok'
  END AS status,
  EXTRACT(DAY FROM (cpp.token_expires_at - NOW()))::integer AS days_remaining
FROM c.client_publish_profile cpp
JOIN c.client c ON c.client_id = cpp.client_id
WHERE cpp.publish_enabled = true
ORDER BY cpp.token_expires_at ASC NULLS FIRST;
```

### 2. If any status = 'critical' or 'warning'
Create file `docs/alerts/token_expiry_{YYYY_MM_DD}.md` with:
- Which client/platform is expiring
- How many days remaining
- The credential_env_key that needs refreshing
- Steps to refresh:
  - For Facebook: go to dashboard.invegent.com/clients → Connect tab → reconnect
  - For YouTube: run OAuth flow via dashboard Connect tab
- Commit to GitHub repo `Invegent/Invegent-content-engine`
- Commit message: `alert: token expiry warning — {client} {platform} expires in {N} days`

### 3. Always write to health log
Append a one-line entry to `docs/alerts/token_health_log.md`:
`{ISO_DATE}: All tokens OK` or `{ISO_DATE}: WARNING — {client}/{platform} expires in {N} days`

Commit with message: `chore: weekly token health check {YYYY-MM-DD}`

## What NOT to do
- Do not attempt to refresh tokens yourself — this requires OAuth browser flow
- Do not delete or modify existing alert files
- Do not create alerts for disabled clients (publish_enabled = false)
```

### ALSO WRITE AN INITIAL TOKEN HEALTH LOG
Create `docs/alerts/token_health_log.md` with the current state:

Run the token query above and write:
```markdown
# ICE Token Health Log

| Date | Status | Notes |
|---|---|---|
| {TODAY} | {result of query} | Initial log entry from Cowork task setup |
```

### VERIFY
After creating the files, confirm they exist in GitHub by reading them back.

### DONE WHEN
- `docs/cowork/tasks/weekly_token_alert.md` exists in GitHub
- `docs/alerts/token_health_log.md` exists with initial entry
- If any tokens show 'critical' or 'warning': `docs/alerts/token_expiry_{today}.md` also exists

---

## COMPLETION PROTOCOL

After all 4 tasks complete:

### 1. Write progress file
Create `docs/briefs/2026-04-02-progress.md`:

```markdown
# Brief Progress — 2026-04-02-profession-compliance-wire

**Status:** COMPLETE
**Executed:** {ISO timestamp}

## Task Results

| Task | Status | Notes |
|---|---|---|
| 1. ai-worker profession scoping | {DONE/FAILED} | {verification result} |
| 2. t.profession ANZSCO + conduct fields | {DONE/FAILED} | {verification result} |
| 3. k schema registry updates | {DONE/FAILED} | {N tables updated} |
| 4. Cowork token alert task | {DONE/FAILED} | {files created} |

## Verification Queries Passed
{list each verification query and whether it passed}

## Any Issues
{list any steps skipped or failed with reason}
```

### 2. Update docs/06_decisions.md
The decisions log in Invegent-content-engine should note these as completed.
Add to the "Decisions Pending" table: mark these items as resolved or remove them.

### 3. Do NOT update docs/00_sync_state.md
The Cowork nightly reconciler overwrites that file automatically. Do not touch it.

---

## ERROR HANDLING

**If a migration fails:**
- Check if the column/table already exists (the migration may have partially applied)
- Use `IF NOT EXISTS` / `IF EXISTS` guards where possible
- Do not retry destructive operations
- Log the failure in the progress file and move to the next task

**If the Edge Function deployment fails:**
- Verify the GitHub push succeeded first
- Check Vercel/Supabase logs for the failure reason
- If the code has a TypeScript error, fix it and redeploy
- The current ai-worker v2.6.1 will continue working if deployment fails — it's not broken, just unscoped

**If a verification query returns unexpected results:**
- Do not assume the task failed — re-read the query and confirm the expectation
- The DB may have slightly different data than expected — adjust expectations accordingly
- Only mark a task FAILED if the core change is definitely not applied

**If k.table_registry UPDATE fails:**
- Check if the table_name actually exists in k.table_registry first
- Some tables may not be registered — skip them and note it
- k schema DML should work via execute_sql (k schema allows writes)

---

## IMPORTANT PATTERNS TO REMEMBER

1. **exec_sql is READ-ONLY for m/c/f/t** — never attempt DML on these schemas via exec_sql
2. **k schema DML works directly** — execute_sql can UPDATE k.table_registry
3. **public schema SECURITY DEFINER functions** — this is how we write to m/c schemas from Edge Functions
4. **apply_migration for DDL** — always use this tool for CREATE TABLE, ALTER TABLE, CREATE INDEX
5. **GitHub push then Supabase deploy** — always push code to GitHub first, then deploy Edge Function
6. **Verify before assuming** — always run the current state check before executing a task

---

*Brief authored by: Claude Sonnet 4.6 (claude.ai chat session)*
*Project: ICE — Invegent Content Engine*
*Authorized by: PK*
