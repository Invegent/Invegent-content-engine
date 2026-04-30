# Briefs Queue

Active briefs ready for execution by the D182 v1 non-blocking automation system.

## How this file works

Briefs live as individual files in `docs/briefs/`. This file is the operator-facing queue showing what's ready, what's in flight, and what's done. Cowork (when scheduled in Phase 4) reads this file to find the next brief with `status: ready`.

When a brief moves through the lifecycle, update the row here. Detailed state lives in `docs/runtime/runs/{brief_id}-{timestamp}.md`.

## Active queue

| brief_id | risk_tier | status | owner | created | notes |
|---|---|---|---|---|---|
| `pipeline-health-pair-column-purposes` | 1 | review_required | cc | 2026-04-30 | R06 from action list. CC drafted 2026-04-30T060202Z — 37/37 HIGH, **0 LOW** (clean run, matches slot-core outcome). Producer code in hand for both tables: `m.take_pipeline_health_snapshot` for `pipeline_health_log` (every column constructed there, ~30-min cadence) and `m.refresh_cron_health` for `cron_health_snapshot` (full schema spec also in `docs/briefs/2026-04-24-cron-health-monitoring-layer-1.md`). Brief-flagged risk items resolved: `_today` TZ = AEST (not UTC), `failure_rate` = 0..1 ratio (not %), `pub_held` ↔ `pub_throttled` distinct via `image_pending` vs `throttled` error-substring filters. `ndis_/pp_published_today` documented explicitly as hardcoded two-client-era vestiges. Awaiting chat MCP apply. |

## Recently completed

| brief_id | risk_tier | status | owner | created | run | completed | notes |
|---|---|---|---|---|---|---|---|
| `post-publish-observability-column-purposes` | 1 | done | cc | 2026-04-30 | 2026-04-30T041924Z | 2026-04-30 | 61 HIGH columns populated, 3 LOW retained for joint session. m.post_format_performance_per_publish 26/26 (100% from R5 markdown spec — empty table), m.post_performance 18/18 (100% from insights-worker code), m.post_publish_queue 17/20 (85%, 3 LOW). m schema coverage 17.3% → **26.2%** (119 → 180 of 686). The 3 LOW (`last_error_code`, `last_error_subcode`, `err_368_streak`) are designed-but-unwired FB Graph error tracking columns escalated to `docs/audit/decisions/post_publish_observability_low_confidence_followup.md`. Migration applied by chat via Supabase MCP per D170 at 2026-04-30T04:30:55Z. |
| `phase-b-patch-image-quote-body-health-gate` | 2 | done | cc | 2026-04-30 | 2026-04-30T033748Z | 2026-04-30 | Phase B patch — body-health gate on `m.fill_pending_slots(integer, boolean)` candidate_pool + relaxed_pool CTEs and `m.hot_breaking_pool` view. Pre-flight clean (1 overload, 0 dependents, both definitions captured verbatim). Migration applied by chat via Supabase MCP per D170 at 2026-04-30T03:48:25Z. Four-step rollback test passed end-to-end: apply ✅ → rollback ✅ → re-apply ✅ → patched final state ✅. Reproducibility 12/12 (3 PASS / 9 EXCLUDE). Pool retention exact match to brief: CFW 132 / NDIS-Yarns 132 / PP 64 / Invegent 13. +24h observation checkpoint due 2026-05-01T03:48:25Z drives Gate B Sat 2 May exit decision. Embedded BEGIN/COMMIT wrapper in CC's draft accepted as Path A — no surfaced warning. |
| `slot-core-column-purposes` | 1 | done | cc | 2026-04-30 | 2026-04-30T020151Z | 2026-04-30 | 56 columns populated across m.slot (20), m.slot_fill_attempt (16), m.ai_job (20) — each at 100% documented. m schema coverage 9.2% → 17.3% (63 → 119 of 686). All HIGH confidence (4 JSONB sourced from production data + check_pool_health function body, 10 enum columns enumerated from observed value distributions, 42 from FK + name + table_purpose signals); zero LOW-confidence escalations. Atomic DO block self-verified pre/post count delta = 56. Migration applied by chat via Supabase MCP per D170. |
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
