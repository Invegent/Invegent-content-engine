# ICE — Decisions Log

## Purpose

Every significant architectural, strategic, or product decision
is recorded here with context and reasoning.

---

## D001–D061 — See earlier commits

---

## D062 — post_seed Platform Column + Constraint Fix
**Date:** 2 April 2026 | **Status:** ✅ Live

Added `platform` column to `m.post_seed`. New constraint `post_seed_uniq_run_item_platform`
on (digest_run_id, digest_item_id, platform). YouTube excluded from text pipeline.
Fixes CROSS JOIN duplicate conflict bug in seed_client_to_ai_v2.

---

## D063 — Pipeline Doctor Log Harvester
**Date:** 2 April 2026 | **Status:** ✅ Live

`m.harvest_pipeline_doctor_log()` SECURITY DEFINER function reads doctor HTTP response
from `net._http_response`, writes structured results to `m.pipeline_doctor_log`.
pg_cron at :17/:47 (2 min after doctor at :15/:45). 37 records in log at session end.

---

## D064 — post_publish_queue acknowledged_at Pattern
**Date:** 2 April 2026 | **Status:** ✅ Live

Added `acknowledged_at` + `acknowledged_by` to `m.post_publish_queue`.
Doctor harvester skips acknowledged dead items from issues_found count.
Enables formal closure of known-bad items without deletion.

---

## D065 — AI Compliance Reviewer (Phase 3.14)
**Date:** 2 April 2026 | **Status:** ✅ Live

compliance-reviewer v1.3.0. Fetches changed pages via Jina, loads scoped rules
via get_compliance_rules(), sends to Claude with vertical+profession context.
Writes structured ai_analysis JSONB to m.compliance_review_queue.
pg_cron 9:05 UTC 1st of month. Dashboard AI panel live.
First run: 5/5 NDIS items analysed, 4/5 action required.

---

## D066 — Profession Dimension for Compliance + Content
**Date:** 2 April 2026 | **Status:** ✅ Live

t.profession table (12 professions: 7 NDIS, 5 property).
profession_slugs[] on t.5.7_compliance_rule (4 rules scoped).
profession_slug on m.compliance_policy_source, m.compliance_review_queue, c.client.
Care for Welfare = occupational_therapy.
get_compliance_rules(vertical, profession) SECURITY DEFINER function.
OT gets 22 rules (16 universal + 3 OT-specific + 3 global).
Support worker gets 19 (16 + 3 global). No false positives.

t.profession also stores: anzsco_occupation_id, anzsic_class_code,
code_of_conduct_url, code_of_conduct_name, regulator_website.
All 12 professions backfilled. code_of_conduct_url is the input for
the future AI compliance rule generator — fetched fresh via Jina when needed.
Storing URL (not text) is correct — avoids stale copies, uses existing fetch infrastructure.

---

## D067 — Claude Code Agentic Loop — First Autonomous Execution
**Date:** 2 April 2026 | **Status:** ✅ Proven

Establish the Claude Code agentic loop as the standard pattern for
well-scoped ICE build tasks that don't require mid-execution human judgment.

Brief format that works:
- Current state check query per task (idempotent)
- Exact SQL/code with no ambiguity
- Verification query with explicit expected result
- Error handling: skip and log, don't guess
- Completion protocol: write progress file

First execution: 4 tasks, no human intervention, completed in minutes.
Claude Code handled ANZSIC 8699 not existing → used NULL (correct).

Directory: `C:\Users\parve\Invegent-content-engine`
MCPs needed: Supabase MCP + GitHub MCP (both in claude_desktop_config.json)
Proven tasks: ai-worker deploy, schema migration, k registry updates, Cowork file creation.

---

## D068 — k Schema as Primary Navigation Tool
**Date:** 2 April 2026 | **Status:** ✅ Adopted

Replace ad-hoc `information_schema.columns` discovery with structured nav
against `k.vw_table_summary` and `k.vw_db_columns` at session start.

Rationale: Every session was spending 3-5 tool calls rediscovering column
names and FK relationships already in the k registry.

Standard pattern:
```sql
SELECT schema_name, table_name, purpose, columns_list, fk_edges
FROM k.vw_table_summary
WHERE schema_name = 'x' AND table_name = 'y';
```

---

## D069 — k Schema Full Repair
**Date:** 2 April 2026 | **Status:** ✅ Complete

**Problem:** k schema governance catalog had three bugs and was partially non-functional.

**Bugs fixed:**
1. `refresh_table_registry()` — hardcoded schema list excluded `c` and `f`
2. `refresh_column_registry()` — same exclusion of `c` and `f` schemas
3. `sync_registries()` — referenced `vw_db_objects.object_type` but column is `object_kind`

**Infrastructure added:**
- Weekly pg_cron: `k-schema-refresh-weekly` every Sunday 3am UTC
- `refresh_catalog()` now covers all 8 registered schemas

**Documentation completed:**
- c schema: 14 tables, 207 columns now registered and documented
- f schema: 12 tables, 149 columns now registered and documented
- m schema: all 19 remaining TODO tables documented
- Total: 117 tables fully documented across all schemas — zero TODO entries

**Key principle confirmed:**
Manually-coded purpose/join_keys/advisory entries are preserved on every
refresh (ON CONFLICT only updates structural fields). Safe to re-run at any time.

**code_of_conduct_url decision (same session):**
Storing URL on t.profession (not text) is correct. The compliance-reviewer
already fetches URLs via Jina — same infrastructure handles code of conduct
fetching when the AI rule generator is built. Stored text would go stale;
fetched-on-demand text is always current.

---

## D070 — AI Diagnostic Agent v1.0.0 — Tier 2 Daily Health Report
**Date:** 2 April 2026 | **Status:** ✅ Live

New `ai-diagnostic` Edge Function providing a Tier 2 daily health report for the ICE pipeline.

**Capabilities:**
- Trend analysis across pipeline health snapshots
- Per-client scoring — NDIS Yarns and Property Pulse assessed separately
- AI-generated recommendations based on detected patterns
- Predictive warnings for emerging pipeline risks

**Dashboard:** `/diagnostics` page and `/api/diagnostics` Next.js route live in invegent-dashboard.

Complements pipeline-fixer (D057): fixer auto-executes pre-approved reversible fixes;
ai-diagnostic provides the human-facing scored daily report, trend view, and forward-looking recommendations.

---

## D071 — IAE Strategic Decision — Do Not Build Yet
**Date:** April 2026 | **Status:** ✅ Decided — concept stage only

**Decision:**
IAE (Invegent Advertising Engine) is recognised as a legitimate future
product extension of ICE. The decision is explicitly NOT to build it yet.

**Context:**
Brainstorming session identified IAE as the paid amplification layer of ICE —
the engine that activates audience assets built organically by ICE against
confirmed ad spend. The strategic logic is sound. The timing is wrong.

**Reasons not to build yet:**
- ICE has zero external paying clients — operational foundation not proven
- Meta Standard Access not confirmed — required before any third-party boosting
- Facebook Insights back-feed running but low volume — IAE boost scoring needs more data
- Client demand not validated — no paying client has confirmed they want paid amplification
- Compliance framework for paid content not defined — AHPRA + NDIS Code of Conduct
  + Meta health advertising policies apply simultaneously to paid content

**What IAE is (for the record):**
The amplification layer of ICE. Not a standalone ads product.
Works because ICE has already built organic engagement pools, Custom Audiences,
and social proof on content before a dollar of paid spend is committed.
The core insight: ICE tests with organic, IAE amplifies what's already proven.
No competitor builds both sides simultaneously for NDIS providers.

**Build trigger:**
- 2-3 paying ICE clients confirmed
- Client demand for paid amplification explicitly validated (asked directly, not assumed)
- All prerequisites in docs/iae/01_iae_prerequisites.md met

**Interim approach:**
Phase 3.4 Meta boost (within ICE) tests whether clients respond to paid amplification.
This is an ICE feature, not IAE. Build Phase 3.4 when Phase 3 arrives.
If client demand confirmed via Phase 3.4 results → scope IAE Phase A.

**Documentation:**
Full strategic thinking committed to docs/iae/ as reference for future build.

---

## D072 — Audience as Asset — Schema Pattern
**Date:** April 2026 | **Status:** ✅ Decided — schema designed, not built

**Decision:**
Audience data has a dual nature — fact and configuration-linked.
The correct schema pattern follows existing ICE conventions.

**The dual nature:**
- As fact: an audience exists, has a size, was built by pipeline activity → m schema
- As configuration: which platforms and audience types to build per client → c schema
- As intelligence: what the system knows about audience state → k views

**Schema resolution:**

```
c.client_audience_policy  — operator's decision about what to build (configuration)
    ↓ FK (client_id)
m.audience_asset          — what the pipeline built (fact)
    ↓ self-referential FK (seed_audience_id for lookalikes)
m.audience_asset          — lookalike child
    ↓ FK (audience_id)
m.audience_performance    — how it performed when used in IAE
    ↑
k.vw_audience_summary     — synthesises above into intelligence view
```

**k schema principle confirmed:**
k gains views, not tables. The guru got smarter, not fatter.
Every new capability adds rows to k views derived from m and c.
k never stores operational data directly.

**Full schema spec:** docs/iae/01_iae_prerequisites.md

---

## D073 — Publisher Asset Gate — Image/Video Must Be Ready Before Facebook Publish
**Date:** 6 April 2026 | **Status:** ✅ Live

**Problem:**
Non-text posts (image_quote, carousel, video_short_*) were publishing to Facebook
as text-only. Root cause: a timing race between image-worker and publisher.

Race sequence:
1. Draft approved → queue item created with `scheduled_for = NOW()`
2. Publisher runs (every 15 min) → picks up queue item → `image_url` is null → publishes text-only
3. `approval_status` flips to `'published'`
4. Image-worker queries `approval_status = 'approved'` → finds nothing → image never generated

Result: image/carousel/video posts arrive on Facebook with no visual. Confirmed
via `request_payload` audit — `has_image: false` on all non-text published posts.

**Fix: two DB triggers, zero publisher code changes**

`trg_gate_queue_on_asset_status` — BEFORE INSERT on `m.post_publish_queue`:
- For image formats (image_quote, carousel, animated_text_reveal, animated_data):
  if `image_status = 'pending'`, push `scheduled_for` to `NOW() + 4 hours`
- For video formats (video_short_kinetic, video_short_stat, voice variants):
  if `video_status = 'pending'`, push `scheduled_for` to `NOW() + 4 hours`
- Text format: no gate, publishes immediately as before

`trg_release_queue_on_asset_ready` — AFTER UPDATE OF image_status, video_status on `m.post_draft`:
- When `image_status` leaves 'pending' (generated, failed, skipped — all release):
  UPDATE queue `scheduled_for = NOW()` for held items
- When `video_status` leaves 'pending': same release
- Only releases items held > 30 min (avoids double-firing on unrelated updates)

**Flow after fix:**
Approve → queue INSERT → gate holds to +4h → image-worker generates → release trigger fires
→ `scheduled_for = NOW()` → next publisher cycle picks up with `image_url` populated → publishes with image ✅

If asset generation fails or is skipped, the release trigger still fires and the post
publishes as text-only fallback rather than being held forever.

**Also fixed:** 2 PP carousel queue items with `scheduled_for` already in the past
updated to `NOW() + 4 hours` to prevent them publishing as text before image-worker runs.

**Migration:** `publisher_asset_gate_v1`

---

## Decisions Pending

| Decision | Context | Target |
|---|---|---|
| Prospect demo generator | ~1 day. Needed before first external client conversation | Phase 3 |
| Client health weekly report email | ~2 days. Sunday night Edge Function via Resend | Phase 3 |
| NDIS Yarns YouTube | Convert channel to Brand Account, connect via dashboard | Next session |
| AI compliance rule generator | Use ANZSCO tasks + code_of_conduct_url → Claude generates draft rules | Phase 3 |
| Content vertical → topic mapping | Map 13 verticals to relevant topics for bundler precision | Phase 3 |
| Populate t.5.8 + t.5.9 | Compliance rule × platform × use case scoping | Phase 3 |
| OpenClaw SOUL.md | ICE context for @InvegentICEbot | Phase 3 |
| Instagram publisher | After Meta App Review approved | Phase 3 |
| m.audience_asset schema | Deploy now — start tracking audience growth even before IAE | Phase 2 |
| IAE Phase A build | Meta boost only — after all prerequisites in docs/iae/01 are met | Phase 3+ |
| Model router | When AI costs become significant | Phase 4 |
| SaaS vs managed service | When 10 clients served 3+ months | Phase 4 |
