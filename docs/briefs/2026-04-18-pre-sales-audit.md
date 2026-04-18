# Brief — Pre-Sales Reconciliation Audit

**Created:** 2026-04-18
**Type:** Reconciliation audit (not inventory-from-scratch)
**Intended runtime:** Claude Code in agentic mode
**Expected duration:** 60–90 minutes
**Output file:** `docs/14_pre_sales_audit_inventory.md` (committed to main)

---

## Context

ICE has extensive existing documentation (docs/00–23, briefs 011–045, consultant audit from 8 April). The goal of this audit is NOT to inventory from scratch. It is to **reconcile three things**:

1. **What the docs say exists** (written state)
2. **What Supabase, Vercel, and the repos actually contain** (live state)
3. **What the docs say needs to happen before first external client** (committed action items — open or closed?)

The output is a single structured document that PK will process in a follow-up Claude.ai session to classify items as pre-sales / post-sales / technical debt against the framework in this brief.

---

## What this audit is specifically looking for

**Drift** — doc says X, reality is Y
**Gaps** — exists in reality but not documented
**Stale commitments** — "action required by" item that has passed its date or sits in an indeterminate state
**Uncommitted work** — Edge Functions, migrations, cron jobs, tables that have no brief or decision entry explaining why they exist
**Missing hard gates** — items the legal register (L001–L008) or consultant audit flagged as "before first external client" that are not yet done

---

## Source documents to read FIRST (do not skip)

Read these in order. Each one informs subsequent audit steps. Do not re-invent what these already cover.

### Primary state documents
1. `docs/00_sync_state.md` — current live state snapshot
2. `docs/00_docs_index.md` — map of all docs
3. `docs/00_audit_report.md` — last nightly audit format (reference for structure)

### Strategic / product context
4. `docs/01_README.md`
5. `docs/02_scope.md`
6. `docs/03_blueprint.md` — architecture of record
7. `docs/04_phases.md` — phase definitions and done criteria
8. `docs/07_business_context.md`
9. `docs/08_product.md`
10. `docs/20_vision.md`
11. `docs/21_business_plan.md`
12. `docs/22_product_charter.md`

### Pre-sales critical documents
13. `docs/05_risks.md` — risk register (7 risks, most recent update April)
14. `docs/06_decisions.md` — decisions log (D001 through D146+). Identify the highest-numbered D entry.
15. `docs/09_client_onboarding.md` — onboarding SOP
16. `docs/10_consultant_audit_april_2026.md` — 4-perspective consultant audit from 8 April (the "before external clients" list is in here — extract it verbatim)
17. `docs/10_pricing.md` — pricing tiers and unit economics
18. `docs/11_sales_playbook.md` — sales conversation guide
19. `docs/12_project_handoff.md`
20. `docs/23_legal_register.md` — L001–L008 legal issues with status and owner
21. `docs/Invegent_Privacy_Policy.md` — published policy
22. `docs/secrets_reference.md` — all credentials documented

### Brief history
23. Scan `docs/briefs/` directory. For each brief with a matching `_result.md`, confirm it is complete. For briefs WITHOUT a matching `_result.md`, these are uncompleted work — list them.

### Subdirectories to scan (file list only, don't read contents)
- `docs/alerts/`
- `docs/build-specs/`
- `docs/compliance/`
- `docs/consent/`
- `docs/cowork/`
- `docs/iae/`
- `docs/legal/`
- `docs/migrations/`
- `docs/quality/`
- `docs/skills/`
- `docs/video/`

Note their existence and high-level contents, but do not deep-read unless a specific question arises.

---

## Live state queries — Supabase project `mbkmaxqhsohbtwsqolns`

Run each query and capture the full result set.

### 1. Schema and table reconciliation

```sql
-- All tables across all schemas, with purpose documentation
SELECT schema_name, table_name, purpose, join_keys, allowed_ops
FROM k.vw_table_summary
ORDER BY schema_name, table_name;
```

```sql
-- Tables with no documented purpose (gaps)
SELECT schema_name, table_name
FROM k.vw_table_summary
WHERE purpose IS NULL OR purpose ILIKE '%todo%' OR purpose = '';
```

### 2. Edge Function inventory

```sql
-- All Edge Functions deployed
SELECT name, version, created_at, updated_at, status
FROM supabase_functions.functions
ORDER BY updated_at DESC;
```

For each Edge Function, check whether there is a matching decision entry in `docs/06_decisions.md` OR a matching brief in `docs/briefs/` that explains why it exists.

### 3. Cron job inventory

```sql
-- All pg_cron jobs
SELECT jobid, jobname, schedule, active, command
FROM cron.job
ORDER BY jobname;
```

For each active cron job, confirm:
- Is the function it calls still deployed?
- Is its purpose documented anywhere?
- Is there any dormant/duplicate job?

### 4. Secrets inventory

Cannot query vault.secrets directly. Instead, read `docs/secrets_reference.md` and compare against env variables that Edge Functions reference in their source. Flag any secret name referenced in code that is NOT in `docs/secrets_reference.md`.

### 5. Storage buckets

Use the Supabase management API or dashboard export if accessible via MCP. List all buckets with public/private state. Note: `docs/00_sync_state.md` flags `client-assets` bucket as private — verify current state.

### 6. RLS and SECURITY DEFINER functions

```sql
-- All SECURITY DEFINER functions in public schema
SELECT proname, prosrc
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public' AND p.prosecdef = true
ORDER BY proname;
```

For each, confirm it is referenced by at least one dashboard route or Edge Function. Unreferenced functions are candidates for dead code flagging.

```sql
-- RLS coverage: tables with RLS enabled vs disabled
SELECT n.nspname AS schema_name, c.relname AS table_name, c.relrowsecurity AS rls_enabled
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE c.relkind = 'r' AND n.nspname IN ('c', 'm', 'f', 't', 'a', 'k', 'public')
ORDER BY n.nspname, c.relname;
```

### 7. Client state

```sql
-- All clients with full state
SELECT client_id, client_name, client_slug, status, created_at
FROM c.client
ORDER BY created_at;
```

```sql
-- Publish profile state per client × platform
SELECT cpp.client_id, c.client_name, cpp.platform, cpp.mode, cpp.max_per_day, cpp.min_gap_minutes, cpp.token_expires_at
FROM c.client_publish_profile cpp
JOIN c.client c ON c.client_id = cpp.client_id
ORDER BY c.client_name, cpp.platform;
```

```sql
-- Content type prompt coverage
SELECT client_id, platform, job_type, COUNT(*) AS prompt_count
FROM c.content_type_prompt
GROUP BY client_id, platform, job_type
ORDER BY client_id, platform, job_type;
```

### 8. Pipeline recent health

```sql
-- Last 7 days publishing by client × platform
SELECT c.client_name, pp.platform, COUNT(*) AS posts_7d, MAX(pp.published_at) AS last_published
FROM m.post_publish pp
JOIN c.client c ON c.client_id = pp.client_id
WHERE pp.published_at > NOW() - INTERVAL '7 days'
GROUP BY c.client_name, pp.platform
ORDER BY c.client_name, pp.platform;
```

```sql
-- Auto-approver pass rate last 7 days
SELECT c.client_name, COUNT(*) FILTER (WHERE pd.approval_status = 'approved') AS approved,
       COUNT(*) FILTER (WHERE pd.approval_status = 'needs_review') AS flagged,
       COUNT(*) FILTER (WHERE pd.approval_status = 'rejected') AS rejected,
       ROUND(100.0 * COUNT(*) FILTER (WHERE pd.approval_status = 'approved') / NULLIF(COUNT(*), 0), 1) AS pass_rate_pct
FROM m.post_draft pd
JOIN m.post_seed ps ON ps.id = pd.seed_id
JOIN m.digest_item di ON di.id = ps.digest_item_id
JOIN m.digest_run dr ON dr.id = di.digest_run_id
JOIN c.client c ON c.client_id = dr.client_id
WHERE pd.created_at > NOW() - INTERVAL '7 days'
GROUP BY c.client_name
ORDER BY c.client_name;
```

### 9. Token health

```sql
-- Token expiry across all platforms
SELECT c.client_name, cpp.platform, cpp.token_expires_at,
       cpp.token_expires_at - NOW() AS time_to_expiry
FROM c.client_publish_profile cpp
JOIN c.client c ON c.client_id = cpp.client_id
WHERE cpp.token_expires_at IS NOT NULL
ORDER BY cpp.token_expires_at;
```

### 10. Open incidents and compliance queue

```sql
-- Open pipeline incidents
SELECT * FROM m.pipeline_incident
WHERE status = 'open'
ORDER BY first_seen_at DESC;
```

```sql
-- Pending compliance review items
SELECT * FROM m.compliance_review_queue
WHERE reviewed_at IS NULL
ORDER BY detected_at DESC;
```

---

## GitHub reality check

### Repos to inventory
1. `Invegent/Invegent-content-engine` — main pipeline repo
2. `Invegent/invegent-dashboard` — operations dashboard
3. `Invegent/invegent-portal` — client portal
4. Check if there is an `Invegent/invegent-web` repo for invegent.com

For each repo:
- Last commit date
- Any commits in the last 7 days
- Open issues (if any)
- Branches (should be minimal — main + maybe a staging branch)

### Edge Function source code
Check `supabase/functions/` directory in `Invegent-content-engine`. For each subdirectory (each function):
- Does it have a `index.ts` or equivalent?
- Does the code reference any secrets not in `docs/secrets_reference.md`?
- Is the version in the code matching what's deployed? (Memory notes publisher source is not committed — verify.)

---

## Vercel reality check

Use Vercel MCP or API access if available. For each project:
- `invegent-dashboard` (prj_iLsaEFCAqeuQjSdlbtfpfXC3jhxg)
- `invegent-portal` (prj_EpPsX7gCu5wGbiSJr1SA3CmjVlAa)
- `invegent-web` (prj_tXhG43iaqHBtVZpvU3osyG7dLLDZ)

Capture:
- Latest deployment status (ready/error)
- Latest deployment date
- Build errors in last 48 hours if any
- Environment variables set (names only, not values)
- Custom domain status

Compare env vars against `docs/secrets_reference.md` — flag mismatches.

---

## Three specific pre-sales "hard gate" reconciliations

These are explicitly called out in existing docs as gates before external clients. Verify current state of each.

### Gate 1 — Meta App Review (L002)
- Current status per `docs/23_legal_register.md`: "Business verification In Review as of April 2026"
- Check `docs/00_sync_state.md` for the most recent status
- Verify: has Standard Access been granted? (If yes, link to the confirmation. If no, what is the blocker and when is the next check?)

### Gate 2 — Avatar consent workflow (L005)
- Per legal register: "Build consent workflow into client onboarding ... before HeyGen integration is built"
- Check Supabase: does `c.client_audience_policy` or a dedicated `consent` table exist?
- Check dashboard/portal code: is there a consent form component?
- Flag: built or not built?

### Gate 3 — Legal review package (L001, L003, L004, L007)
- Per legal register: "$2,000–5,000 AUD ... before the first paying external client is signed"
- No way to verify externally. Flag as: "external verification required — PK to confirm if engaged."

### Additional gates from consultant audit (8 April)
Extract the "What needs to happen before the first paying client" list from `docs/10_consultant_audit_april_2026.md` Audit 1 (Product Consultant). Verify each item:
1. NDIS Yarns organic growth metrics worth showing
2. One-page proof document
3. Client portal meaningful dashboard ("Here is what ICE has done for your page")
4. 90-day money-back framing

---

## Output file structure

Write the full audit to `docs/14_pre_sales_audit_inventory.md` with these sections. Use markdown, not fancy formatting. Keep tables aligned.

```markdown
# ICE — Pre-Sales Audit Inventory
## Generated: 2026-04-18
## Type: Reconciliation audit

## Summary Dashboard
- Docs reviewed: N
- Edge Functions inventoried: N (vs docs: aligned/drifted)
- Cron jobs inventoried: N (active/dormant)
- Tables documented: N / N total
- Open briefs (no result file): N
- Hard gates open: N / N

## Section 1 — Document drift findings
(Each finding: doc, what it claims, what reality shows, severity)

## Section 2 — Reality gaps (undocumented items)
(Each finding: what exists in reality, documentation status, suggested doc to update)

## Section 3 — Uncompleted briefs
(List of briefs in `docs/briefs/` without matching `_result.md`. For each: brief name, subject, estimated status)

## Section 4 — Hard gates status
(Gate 1 Meta App Review, Gate 2 Avatar consent, Gate 3 Legal review, plus consultant audit gates — each with current state)

## Section 5 — Risk register reconciliation
(Each of the 7 risks from `docs/05_risks.md` — current status vs documented status)

## Section 6 — Legal register reconciliation
(Each L001–L008 — current status vs documented status)

## Section 7 — Decisions log check
(Highest D-number in docs/06_decisions.md, any recent D-entries that reference work not yet executed)

## Section 8 — Infrastructure state
(Supabase tables per schema, Edge Functions, cron jobs, secrets, storage buckets — current counts with any concerns flagged)

## Section 9 — Client state
(Per client: platforms live, content_type_prompts coverage, publish profile state, token expiry, recent publishing volume)

## Section 10 — Repos and deployments
(Three repos: last commit date, current state. Three Vercel projects: deployment status, env var reconciliation.)

## Section 11 — Live pipeline health
(Last 7 days publishing by client × platform, auto-approver pass rate, open incidents, compliance queue)

## Section 12 — Items flagged for PK classification
(This is the critical output. Every item that needs classification goes here. Format:)

| # | Item | Source | Current state | Proposed classification | Notes |
|---|------|--------|---------------|-------------------------|-------|
| 1 | Example item | Found in sync_state | Built but undocumented | post-sales-tier-2 | ... |

Aim for 30–80 rows in this table. This is what PK will review in the next Claude.ai session.

## Section 13 — Open questions for PK
(Things Claude Code could not determine without human input — put them here as a short list)
```

---

## Execution instructions for Claude Code

1. Read every document in the "Source documents" list. Do not skip. These inform everything else.
2. Run every SQL query. Capture full results. Do not truncate.
3. Do the GitHub and Vercel reality checks.
4. Write the output file in the structure above, committing to `main` branch with message: `audit: pre-sales reconciliation inventory 2026-04-18`.
5. If you encounter something you cannot resolve without human input, put it in Section 13 — do NOT guess.
6. If a query fails, record the failure in Section 13 and continue. Do not abort the audit for a single failed query.
7. Total time budget: 90 minutes. If you are still running at 90 minutes, submit partial output with clear notes on what's incomplete.

---

## What NOT to do

- Do not classify items as pre-sales vs post-sales yourself. That's PK's job in the next session — your job is to surface them.
- Do not reproduce existing doc content. Reference by doc name and section.
- Do not write recommendations. Write findings.
- Do not edit any existing doc. Only write the new inventory file.
- Do not deploy, migrate, or change any Supabase or Vercel state. Read-only audit.
- Do not run diagnostic queries that modify data (`UPDATE`, `INSERT`, `DELETE`). Read-only SQL only.

---

## Completion criteria

The audit is complete when:
- `docs/14_pre_sales_audit_inventory.md` is committed to `main`
- Sections 1–13 are populated
- Section 12 has at least 20 items flagged for classification
- Section 13 has any items requiring PK input clearly listed

PK will then review the inventory in a Claude.ai session and produce the classification document `docs/15_pre_post_sales_criteria.md`.
