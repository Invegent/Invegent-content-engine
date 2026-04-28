# A18 — Source-less Edge Functions Audit

> **Purpose:** Classify all deployed Edge Functions by data-source binding to identify operational risk for new client onboarding.
> **Date:** 2026-04-28 evening (4th shift, Option B)
> **Status:** Diagnostic / reporting only. No EF behaviour changed.
> **Pre-sales audit item:** A18 (1 of 38)
> **Methodology:** Heuristic classification by EF name + memory context + 1 spot-check (`compliance-monitor`) to validate methodology. Bucket A and B classifications have HIGH confidence by name/memory; specific data sources are inferred where source code wasn't reviewed. EFs flagged for code review are listed at the end.

## Scope

44 ACTIVE Edge Functions deployed in Supabase project `mbkmaxqhsohbtwsqolns` as of 2026-04-28 22:30 AEST. Memory had recorded 41 EFs; the +3 since last snapshot likely represent recent agent additions (sentinel, diagnostician, healer per briefs 027–029).

## Classification framework

- **Bucket A — Client-bound + correctly sourced** — reads client-scoped tables (`c.client*`, `m.post_*`, `m.digest_*`, `f.*` per-client) such that a new client onboarded with the standard checklist will receive the EF's behaviour automatically.
- **Bucket B — System utility, no client source expected** — operates on system-wide tables or external resources by design. New clients neither need nor receive specific bindings.
- **Bucket C — Source-less / ambiguous, needs follow-up** — naming or memory context is unclear; should be source-reviewed.
- **Bucket D — Deprecated / candidate for removal** — present but no longer in active use.

## Bucket A — Client-bound + correctly sourced (28 EFs)

These read from client-scoped tables in their normal operation. A new client in an existing vertical with `c.client_source` rows will receive the EF's behaviour without code change.

| # | EF | Expected primary data source(s) | Confidence |
|---|---|---|---|
| 1 | `ingest` | `f.feed_source` (per-client feed registrations) | HIGH |
| 2 | `content_fetch` | `f.canonical_content_item`, `f.canonical_content_body` | HIGH |
| 3 | `ai-worker` | `c.client_ai_profile`, `m.digest_item`, `m.ai_job` | HIGH |
| 4 | `publisher` | `m.post_publish_queue`, `c.client_publish_profile` | HIGH |
| 5 | `auto-approver` | `m.post_draft`, `c.client_ai_profile` | HIGH |
| 6 | `image-worker` | `m.post_draft`, `c.client_brand_asset` (reserved per F-002 LOW resolution Row 3) | HIGH |
| 7 | `youtube-publisher` | `c.client_channel` (YT OAuth per Phase C JSONB analysis) | HIGH |
| 8 | `instagram-publisher` | `c.client_channel`, `m.post_publish_queue` | HIGH |
| 9 | `linkedin-zapier-publisher` | `c.client_channel`, `m.post_publish_queue` | HIGH |
| 10 | `wordpress-publisher` | `c.client.profile` (WP credentials per Phase C JSONB analysis), `m.post_publish_queue` | HIGH |
| 11 | `series-outline` | `c.client_ai_profile`, `c.content_series` | HIGH |
| 12 | `series-writer` | `c.client_ai_profile`, `c.content_series` | HIGH |
| 13 | `compliance-reviewer` | `m.post_draft`, `c.client_ai_profile`, `t.compliance_rule` | HIGH |
| 14 | `video-worker` | `c.client_avatar_profile`, `m.post_draft` | MEDIUM (reserved infra per Row 2 LOW resolution) |
| 15 | `video-analyser` | `f.video_analysis`, `c.client_*` | MEDIUM |
| 16 | `heygen-intro` | `c.client_avatar_profile`, `c.brand_avatar` | MEDIUM (reserved infra per Row 1 LOW resolution) |
| 17 | `heygen-youtube-upload` | `c.client_channel` (YT) | MEDIUM (reserved infra) |
| 18 | `heygen-worker` | `c.brand_avatar`, `c.client_avatar_profile` | MEDIUM (reserved infra) |
| 19 | `heygen-avatar-creator` | `c.brand_stakeholder`, `c.brand_avatar` | MEDIUM (reserved infra) |
| 20 | `heygen-avatar-poller` | `c.brand_avatar` | MEDIUM (reserved infra) |
| 21 | `brand-scanner` | `c.client.profile` (website URL) | MEDIUM (assumed; not spot-checked) |
| 22 | `ai-profile-bootstrap` | Creates `c.client_ai_profile` for new client (write-side rather than read-side) | MEDIUM |
| 23 | `onboarding-notifier` | `c.client` (triggered on insert/update) | MEDIUM |
| 24 | `draft-notifier` | `m.post_draft`, `c.client.notifications_email` | HIGH |
| 25 | `insights-worker` | `m.post_publish` + Facebook Graph API per client; writes `m.post_performance` (Phase 2.1, currently reserved per Row 4 LOW resolution) | MEDIUM (Phase 2.1 not yet activated) |
| 26 | `insights-feedback` | `m.post_performance` → digest scoring weights (Phase 2.1) | MEDIUM (depends on insights-worker activation) |
| 27 | `email-ingest` | `c.client_channel` (Gmail OAuth tokens), labels per memory: `newsletter/ndis` + `newsletter/property` | MEDIUM (label list may be hardcoded — see Bucket C flag) |
| 28 | `feed-discovery` | `f.feed_discovery_seed` (per-client seeds, recently active per memory D180) | HIGH |
| 29 | `feed-intelligence` | `f.feed_source`, `m.agent_recommendations` | MEDIUM |
| 30 | `external-reviewer` | `c.external_reviewer`, `c.external_reviewer_rule`, `m.post_draft` | HIGH |
| 31 | `external-reviewer-digest` | `c.external_reviewer`, `m.post_draft` | HIGH |
| 32 | `client-weekly-summary` | `m.post_publish`, `c.client` (per-client report) | HIGH |

## Bucket B — System utility, no client source expected (11 EFs)

These operate on system-wide tables or external resources. New clients require no specific binding.

| # | EF | Data source | Confidence |
|---|---|---|---|
| 33 | `inspector` | DB introspection via service role | HIGH |
| 34 | `inspector_sql_ro` | Read-only SQL execution for chat tools | HIGH |
| 35 | `compliance-monitor` | `m.compliance_policy_source` (verified via spot-check); 5 NDIS policy URLs scoped by `vertical_slug` | **VERIFIED** |
| 36 | `pipeline-doctor` | System-wide pipeline state diagnostic | HIGH |
| 37 | `pipeline-ai-summary` | System-wide pipeline state with AI summary | HIGH |
| 38 | `pipeline-fixer` | System-wide auto-fix routines | HIGH |
| 39 | `pipeline-sentinel` | Sentinel agent (per brief 027) — system-wide alert detection | HIGH |
| 40 | `pipeline-diagnostician` | Diagnostician agent (per brief 028) — system-wide root-cause analysis | HIGH |
| 41 | `pipeline-healer` | Healer agent (per brief 029) — system-wide auto-remediation | HIGH |
| 42 | `system-auditor` | System-wide audit checks | HIGH |
| 43 | `weekly-manager-report` | Cross-client manager report | HIGH |

## Bucket C — Source-less / ambiguous, needs follow-up (1 EF)

| # | EF | Concern | Suggested follow-up |
|---|---|---|---|
| 44 | `email-ingest` | Memory says it processes `newsletter/ndis` and `newsletter/property` Gmail labels. The label list **may be hardcoded** rather than per-client configurable. If hardcoded, a new client in a new vertical (e.g., `newsletter/aged-care`) would not be ingested without code change. | Read `email-ingest` source; if labels are hardcoded, raise as a finding for cycle 2 candidates (similar to vertical-scoping concern surfaced by `compliance-monitor`). |

## Bucket D — Deprecated / candidate for removal (0 EFs)

No EFs identified as deprecated tonight. The HeyGen suite (Bucket A entries 16-20) is **reserved infrastructure not currently active** per F-002 LOW resolutions Rows 1+2; they are deployed but not consumed. Distinguishing between "reserved infra" and "deprecated" requires operator judgement — these are NOT recommended for removal until video pipeline activation has been definitively cancelled.

## Spot-check finding — `compliance-monitor` reveals the per-vertical pattern

Methodology validation also surfaced a soft dependency worth noting:

`compliance-monitor` reads URLs from `m.compliance_policy_source` (5 active rows, all NDIS-scoped via `vertical_slug`). A new client in an existing NDIS or Property vertical works automatically. **A new client in a new vertical** (e.g., aged care, mental health) would need 1+ rows added to `m.compliance_policy_source` for that vertical's compliance to be monitored. Without those rows, compliance-monitor would silently skip that vertical.

This is a **per-vertical onboarding step**, not a per-client one. Worth tracking in the onboarding checklist as a vertical-expansion task. Not a runtime risk for clients in existing verticals.

## Recommended follow-up actions

1. **Source-review `email-ingest`** to determine whether Gmail labels are hardcoded or per-client. If hardcoded, this is the only source-less concern surfaced tonight. Brief CC for a quick read; ~10 min work.
2. **Vertical-expansion onboarding step** — add to onboarding SOP: "When adding a new vertical, ensure `m.compliance_policy_source` has at least 1 active policy URL for that vertical." Not urgent until a third vertical is onboarded.
3. **MEDIUM-confidence Bucket A entries** — for any EF marked MEDIUM (entries 14-23, 25-27, 29), source-review when convenient. Not urgent. Most are reserved infra (HeyGen suite, Phase 2.1 insights) where the source-binding doesn't materially affect current operations.
4. **Reserved-infra distinction** — the HeyGen suite is currently 5 EFs deployed but unconsumed. Worth a separate decision in cycle 2 candidates: "if HeyGen is genuinely reserved for future activation, document the activation criteria; if it's been quietly abandoned, schedule removal".

## What did NOT get checked tonight

- Source code review of 32 EFs in Bucket A and Bucket B (only `compliance-monitor` spot-checked)
- Verification of which EFs have crons running vs are HTTP-triggered
- Verification of which EFs have been called recently vs are stale
- Cross-check against `pg_cron` job list to identify orphaned crons
- Per-EF environment variable / API key dependencies
- Any inactive (non-ACTIVE status) Edge Functions

These are appropriate cycle 2 inputs if a deeper EF audit is warranted.

## Coverage stat

- 44 of 44 EFs classified (100%)
- 1 of 44 source-verified (2%)
- 1 of 44 flagged for follow-up (2%)
- 0 of 44 confirmed source-less (0%)
- 0 of 44 confirmed deprecated (0%)

## Summary verdict

**No urgent operational risk found.** The naming + memory context for 43 of 44 EFs is consistent with proper client-scoping or system-utility-by-design. The single flag (`email-ingest` label list) is a quick code review, not a runtime issue.

The bigger pattern surfaced is the **per-vertical onboarding requirement** (illustrated by `compliance-monitor`'s `m.compliance_policy_source`). When ICE expands to a third vertical, the onboarding SOP needs to address per-vertical configuration tables — this is beyond the per-client onboarding step that's currently documented.
