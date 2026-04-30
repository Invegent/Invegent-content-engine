# Briefs Queue

Active briefs ready for execution by the D182 v1 non-blocking automation system.

## How this file works

Briefs live as individual files in `docs/briefs/`. This file is the operator-facing queue showing what's ready, what's in flight, and what's done. Cowork (when scheduled in Phase 4) reads this file to find the next brief with `status: ready`.

When a brief moves through the lifecycle, update the row here. Detailed state lives in `docs/runtime/runs/{brief_id}-{timestamp}.md`.

## Active queue

| brief_id | risk_tier | status | owner | created | notes |
|---|---|---|---|---|---|
| `audit-slice-2-snapshot-generation` | 0 | ready | cowork | 2026-04-30 | R02 from action list. Tier 0 markdown generation per D184 — second-shape D182 durability test (first non-migration brief). Cowork executes 16 read-only SQL queries + 1 git op, formats as JSON sections, writes today's snapshot at `docs/audit/snapshots/{YYYY-MM-DD}.md` matching cycle 1 manual snapshot structure (sections 1-17 + 19, **NO section 18** — judgment-heavy, deliberate omission). Idempotency: today's UTC-date snapshot file absent. Output is input material for cycle 2 manual ChatGPT auditor pass (R04). PK running this manually now via Cowork. |
| `post-render-log-column-purposes` | 1 | ready | cc | 2026-04-30 | F04 promoted from Frozen. Single table: `m.post_render_log` (16 cols). Expected_delta=16. Pre-flight by chat confirmed count + rich table_purpose (names 8 columns + enumerates status enum verbatim). Strict JSONB rule applies to `render_spec` — must trace to image-worker/video-worker EF source. Expected 0-2 LOW (smallest surface of the day). Strategic value: closes m-schema small-tables sweep; m schema 39.94% → ~42.3%. CC may apply overnight; chat picks up tomorrow after T01+T02 resolved. |

## Recently completed

| brief_id | risk_tier | status | owner | created | run | completed | notes |
|---|---|---|---|---|---|---|---|
| `operator-alerting-trio-column-purposes` | 1 | done | cc | 2026-04-30 | 2026-04-30T065007Z | 2026-04-30 | 57/57 HIGH columns populated, **0 LOW** (cleanest result on JSONB-bearing brief to date). m.compliance_review_queue 19/19, m.external_review_queue 21/21, m.external_review_digest 17/17. Strict JSONB rule satisfied for `ai_analysis`: producer code cited at `supabase/functions/compliance-reviewer/index.ts:200-244` + canonical writer RPC `public.store_compliance_ai_analysis`; all 8 top-level keys + array element sub-shapes documented. Pause-context handled correctly — column purposes describe semantics without repeating "(paused per D162)". m schema coverage 31.6% → **39.94%** (217 → 274 of 686) — crosses the 40% mark called out in the brief. Migration applied by chat via Supabase MCP per D170 at 2026-04-30T07:08:00Z. |
| `pipeline-health-pair-column-purposes` | 1 | done | cc | 2026-04-30 | 2026-04-30T060202Z | 2026-04-30 | 37/37 HIGH columns populated, **0 LOW** (cleanest of the three Tier 1 briefs today). m.pipeline_health_log 21/21, m.cron_health_snapshot 16/16. Producer code in hand for both tables: `m.take_pipeline_health_snapshot` and `m.refresh_cron_health`. Every brief-flagged risk item resolved with code evidence: `_today` TZ = AEST (verified in function), `failure_rate` = 0..1 ratio (verified `failed/total::NUMERIC`), `pub_held` vs `pub_throttled` distinguished by `image_pending` vs `throttled` error-substring filters. Two-client vestiges (`ndis_/pp_published_today`) documented with hardcoded UUIDs + refactor-needed flag. m schema coverage 26.2% → **31.6%** (180 → 217 of 686). Migration applied by chat via Supabase MCP per D170 at 2026-04-30T06:13:30Z. One polish note captured in run state: `latest_run_status` purpose narrowed to observed value only — canonical enum is wider; revise next time someone touches that row. |
| `post-publish-observability-column-purposes` | 1 | done | cc | 2026-04-30 | 2026-04-30T041924Z | 2026-04-30 | 61 HIGH columns populated, 3 LOW retained for joint session. m.post_format_performance_per_publish 26/26 (100% from R5 markdown spec — empty table), m.post_performance 18/18 (100% from insights-worker code), m.post_publish_queue 17/20 (85%, 3 LOW). m schema coverage 17.3% → **26.2%** (119 → 180 of 686). The 3 LOW (`last_error_code`, `last_error_subcode`, `err_368_streak`) are designed-but-unwired FB Graph error tracking columns escalated to `docs/audit/decisions/post_publish_observability_low_confidence_followup.md`. Migration applied by chat via Supabase MCP per D170 at 2026-04-30T04:30:55Z. |
| `phase-b-patch-image-quote-body-health-gate` | 2 | done | cc | 2026-04-30 | 2026-04-30T033748Z | 2026-04-30 | Phase B patch — body-health gate on `m.fill_pending_slots(integer, boolean)` candidate_pool + relaxed_pool CTEs and `m.hot_breaking_pool` view. Pre-flight clean. Migration applied by chat via Supabase MCP per D170 at 2026-04-30T03:48:25Z. Four-step rollback test passed end-to-end. Pool retention exact match to brief: CFW 132 / NDIS-Yarns 132 / PP 64 / Invegent 13. +24h observation checkpoint due 2026-05-01T03:48:25Z drives Gate B Sat 2 May exit decision. |
| `slot-core-column-purposes` | 1 | done | cc | 2026-04-30 | 2026-04-30T020151Z | 2026-04-30 | 56 columns populated across m.slot (20), m.slot_fill_attempt (16), m.ai_job (20) — each at 100% documented. m schema coverage 9.2% → 17.3% (63 → 119 of 686). All HIGH confidence. Atomic DO block self-verified pre/post count delta = 56. Migration applied by chat via Supabase MCP per D170. |
| `phase-d-array-mop-up` | 1 | done | cowork | 2026-04-29 | 2026-04-29T102956Z | 2026-04-29 | 🎉 First D182 run — 5/5 success thresholds. 7 ARRAY columns documented (c+f 142→149, 22.1%). Cowork run — 0 questions, 0 corrections, 0 production writes from automation, ~5 min runtime, ~45k token burn. Migration applied by PK via Supabase MCP per D170. |

## Failed / blocked

*(none)*

---

## Status legend

- **ready** — brief authored, frontmatter complete, awaiting execution
- **running** — Cowork has picked it up
- **questions_pending** — Cowork has written to `claude_questions.md`, awaiting `claude_answers.md`
- **validation_pending** — output ready for GitHub Actions validation
- **review_required** — validation passed, awaiting PK morning approval
- **done** — PK has approved and applied (move to Recently completed)
- **failed** — something went wrong; PK to inspect state file and decide next step
- **blocked** — Tier 2/3 escalation hit; PK must reset to ready manually

## Adding a new brief

1. Create `docs/briefs/{brief-id}.md` with v1 frontmatter (see `docs/runtime/automation_v1_spec.md`)
2. Add row to Active queue table above
3. Set `status: ready` in the brief frontmatter
4. Commit

That's it. The brief is now visible to Cowork.
