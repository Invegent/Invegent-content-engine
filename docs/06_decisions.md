# ICE — Decisions Log

## Purpose

Every significant architectural, strategic, or product decision
is recorded here with context and reasoning.

---

## D001–D043 — See previous commits

---

## D044–D057 — See commit 9b810f0 (31 Mar 2026)

---

## D058 — Property Pulse Compliance-Aware System Prompt
**Date:** 31 March 2026 | **Status:** ✅ Live

Embedded ASIC/AFSL financial compliance rules into PP brand_identity_prompt.
Five hard-block groups: investment returns, credit/lending, tax/depreciation,
product promotion, disclaimer rule.

---

## D059 — m.post_format_performance Aggregation
**Date:** 31 March 2026 | **Status:** ✅ Live

refresh_post_format_performance() SQL function. Aggregates post_performance
by ice_format_key per client, 7/30/all-time windows. pg_cron daily 3:15am UTC.

---

## D060 — YouTube Pipeline Activation (Both Clients)
**Date:** 1 April 2026 | **Status:** ✅ Live

youtube-publisher v1.2.0 — DB-driven credential_env_key lookup.
OAuth tokens for both channels. PP YouTube connected and first Short published.
NDIS Yarns YouTube pending Brand Account conversion.

---

## D061 — OpenClaw Installed (Telegram Remote Control)
**Date:** 1 April 2026 | **Status:** ✅ Live

OpenClaw v2026.3.31. @InvegentICEbot. anthropic/claude-sonnet-4-6 via Max plan.
Gateway auto-starts on boot. Run `openclaw tui` after each restart.

---

## D062 — post_seed Platform Column + Constraint Fix
**Date:** 2 April 2026 | **Status:** ✅ Live

**Problem:**
Adding YouTube client_publish_profile for Property Pulse caused seed_client_to_ai_v2
to fail every hour. The function CROSS JOINs active_platforms and uses ON CONFLICT
DO UPDATE — when two platforms (facebook + youtube) produce seeds for the same
(digest_run_id, digest_item_id), PostgreSQL rejects the upsert because it would
hit the same row twice in one statement.

**Fix:**
- Added `platform text` column to `m.post_seed`
- Replaced `post_seed_uniq_run_item` constraint (digest_run_id, digest_item_id)
  with `post_seed_uniq_run_item_platform` (digest_run_id, digest_item_id, platform)
- Updated `seed_client_to_ai_v2` to:
  - Populate platform column in INSERT
  - Reference new constraint in ON CONFLICT clause
  - Exclude `youtube` from text pipeline (youtube gets content via video-worker)
- Backfilled existing rows with platform from seed_payload JSONB

**Pattern:** Any time a new platform is added to client_publish_profile, the text
pipeline only seeds platforms NOT in the exclusion list. YouTube content flows
through video-worker, not the bundle/rewrite pipeline.

---

## D063 — Pipeline Doctor Log Harvester
**Date:** 2 April 2026 | **Status:** ✅ Live

**Problem:**
Pipeline-doctor Edge Function runs every 30 minutes and executes 7 checks with
auto-fixes, but the INSERT to m.pipeline_doctor_log was never in the function code.
The log table had 0 records despite months of doctor runs.

**Fix:**
Created `m.harvest_pipeline_doctor_log()` SECURITY DEFINER function that:
- Reads the most recent pipeline-doctor HTTP response from `net._http_response`
  (Supabase stores all outbound HTTP call responses here)
- Skips if already recorded within ±5 minutes (idempotent)
- If all dead items are acknowledged (acknowledged_at IS NOT NULL), rewrites
  the dead_items finding as 'ok' and decrements issues_found/fixes_applied counts
- Inserts clean record into m.pipeline_doctor_log

pg_cron job at :17/:47 (2 minutes after each doctor run at :15/:45).
Backfilled 12 historical records from the last 24 hours.

**Why not redeploy the Edge Function?**
The function source was not in the GitHub repo (deployed directly). The harvester
pattern achieves the same result without requiring access to the live function code,
and adds the acknowledged_item filtering as a bonus.

---

## D064 — post_publish_queue acknowledged_at Pattern
**Date:** 2 April 2026 | **Status:** ✅ Live

**Problem:**
A Property Pulse Facebook queue item from 20 March (post_draft deleted, orphaned)
accumulated 734 failed attempts and was marked dead. The doctor's dead_items check
flagged it every single run as "needs manual review" — making the doctor log report
1 issue/1 fix every 30 minutes forever.

**Fix:**
- Added `acknowledged_at timestamptz` and `acknowledged_by text` columns to
  `m.post_publish_queue`
- Items with acknowledged_at set are excluded from doctor alerting
- Marked the orphaned PP item as acknowledged
- Harvester function adjusted to rewrite dead_items finding as 'ok' when
  all dead items have acknowledged_at set

**Pattern for future dead items:**
Dead items are never deleted (audit trail). When a dead item is intentional or
unavoidable, set acknowledged_at. The dashboard Failures tab should expose a
one-click Acknowledge button — wire this when building the Failures panel.

---

## D065 — AI Compliance Reviewer (Phase 3.14)
**Date:** 2 April 2026 | **Status:** ✅ Live

**Problem:**
Compliance-monitor detects that a policy page has changed (SHA-256 hash comparison)
but only writes "hash changed — review manually." With 5 monitored NDIS URLs and
more verticals planned, manual review of changed pages is unsustainable.

**Decision:**
Build compliance-reviewer Edge Function that runs automatically after compliance-monitor
and writes structured AI analysis to each queue item.

**Architecture:**
- Edge Function: compliance-reviewer v1.3.0 (deployed 2 Apr 2026)
- Trigger: pg_cron at 9:05 UTC on 1st of each month (5 min after compliance-monitor)
- Also callable on-demand via dashboard "Run AI Review" button
- For each pending item with no ai_reviewed_at:
  1. Fetch current page content via Jina reader (12k char limit)
  2. Load scoped compliance rules via get_compliance_rules(vertical, profession)
  3. Send to Claude with vertical_context + profession.description in system prompt
  4. Claude returns: summary, relevance, key_changes, affected_rules (with suggested
     updates), new_rules_suggested, human_action_required, confidence
  5. Write to m.compliance_review_queue via store_compliance_ai_analysis() SECURITY DEFINER

**New schema:**
- ai_analysis JSONB, ai_confidence text, ai_reviewed_at timestamptz, ai_error text
  added to m.compliance_review_queue
- store_compliance_ai_analysis() SECURITY DEFINER function for writes
  (exec_sql RPC cannot do DML on m schema)

**Scalability:**
Vertical-agnostic. Adding a new vertical requires:
1. INSERT rows into m.compliance_policy_source with vertical_slug + profession_slug
2. INSERT rules into t.5.7_compliance_rule with vertical_slug + profession_slugs
3. No code changes required

**First run results (2 Apr 2026):**
- 5 NDIS items processed — all received structured AI analysis
- 4/5 items: human_action_required = true (pricing, mandatory registration, regulatory priorities)
- 1/5: human_action_required = false (Code of Conduct — no material change)

---

## D066 — Profession Dimension for Compliance + Content
**Date:** 2 April 2026 | **Status:** ✅ Live

**Problem:**
The compliance system had one dimension: vertical_slug. But within a single vertical,
different professions have different compliance obligations. An OT needs AHPRA scope
of practice rules. A support worker does not — AHPRA doesn't apply to them.
Applying OT rules to a support worker generates false compliance blocks.
Same problem for property: a mortgage broker needs ASIC BID rules; a builder does not.

**Decision:**
Add profession_slug as a second dimension throughout the compliance and content stack.

**New table: t.profession**
12 professions seeded:
- NDIS: occupational_therapy, physiotherapy, speech_pathology, behaviour_support,
  support_coordination, support_worker, plan_management
- Property: mortgage_broking, real_estate_agent, buyers_agent, building,
  property_investment

Each row includes: regulator, is_ahpra_registered, description (injected into AI prompts).

**profession_slugs text[] on t.5.7_compliance_rule:**
- NULL = applies to all professions in the vertical (universal)
- Array = applies only to those professions
- Example: ndis_ot_scope_of_practice → {occupational_therapy}
- Example: ndis_early_childhood_claims → {occupational_therapy, physiotherapy, speech_pathology}
- Example: ndis_plan_management_commentary → {plan_management, support_coordination}
- 4 NDIS rules scoped; 16 NDIS rules remain universal

**profession_slug text on:**
- m.compliance_policy_source: which profession a URL belongs to (NULL = whole vertical)
- m.compliance_review_queue: inherited from source
- c.client: what profession this client practice is
  (Care for Welfare set to occupational_therapy)

**get_compliance_rules(p_vertical_slug, p_profession_slug) SECURITY DEFINER:**
Single function used by both compliance-reviewer and (next) ai-worker.
Returns:
- All rules where vertical_slug matches AND profession_slugs IS NULL (universal)
- Plus all rules where p_profession_slug = ANY(profession_slugs)
Result: an OT gets 22 rules (16 universal + 3 OT/clinical-scoped + 3 global).
A support worker gets 19 rules (16 universal + 3 global). No clinical rules.

**Scaling to new professions/verticals:**
- New profession: INSERT into t.profession, INSERT rules into t.5.7_compliance_rule
- New vertical: INSERT into t.profession, INSERT into m.compliance_policy_source,
  INSERT into t.5.7_compliance_rule
- Zero code changes required

**Outstanding:** get_compliance_rules() is built and tested but NOT YET wired into
ai-worker. Content generation currently loads all rules for the vertical regardless
of client profession. Wire this in next session.

---

## Decisions Pending

| Decision | Context | Target Date |
|---|---|---|
| Wire get_compliance_rules() into ai-worker | Profession-scoped content generation — function built, not yet called by ai-worker | Next session |
| AI Diagnostic Tier 2 | Prerequisites met (doctor log live 12+ records). Build: pre-approved action list, Claude reasons about which action | Next session |
| NDIS Yarns YouTube | Convert channel to Brand Account, then connect via dashboard | Next session |
| Compliance queue review | 5 items with AI analysis — mark reviewed in dashboard | Next session |
| Prospect demo generator | ~1 day. Needed before first external client conversation | Phase 3 |
| Client health weekly report (email) | ~2 days. Sunday night Edge Function via Resend | Phase 3 |
| Invegent brand pages setup | Own ICE client — Invegent Facebook/LinkedIn/YouTube on ICE | Phase 3 |
| OpenClaw SOUL.md | Define ICE context for @InvegentICEbot | Phase 3 |
| Instagram publisher | 0.5 days after Meta App Review approved | Phase 3 |
| YouTube Stage C — HeyGen avatar | Phase 4 | Phase 4 |
| Model router implementation | When AI costs become significant | Phase 4 |
| SaaS vs managed service long-term | When 10 clients served for 3+ months | Phase 4 |
