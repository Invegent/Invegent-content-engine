# Briefs Queue

Active briefs ready for execution by the D182 v1 non-blocking automation system.

## How this file works

Briefs live as individual files in `docs/briefs/`. This file is the operator-facing queue showing what's ready, what's in flight, and what's done. Cowork (when scheduled in Phase 4) reads this file to find the next brief with `status: ready`.

When a brief moves through the lifecycle, update the row here. Detailed state lives in `docs/runtime/runs/{brief_id}-{timestamp}.md`.

## Active queue

| brief_id | risk_tier | status | owner | created | notes |
|---|---|---|---|---|---|
| `post-render-log-column-purposes` | 1 | ready | cc | 2026-04-30 | F04 promoted from Frozen. Single table: `m.post_render_log` (16 cols). Expected_delta=16. Pre-flight by chat confirmed count + rich table_purpose (names 8 columns + enumerates status enum verbatim). Strict JSONB rule applies to `render_spec` — must trace to image-worker/video-worker EF source. Expected 0-2 LOW (smallest surface of the day). Strategic value: closes m-schema small-tables sweep; m schema 39.94% → ~42.3%. CC may apply overnight; chat picks up next session. |

## Recently completed

| brief_id | risk_tier | status | owner | created | run | completed | notes |
|---|---|---|---|---|---|---|---|
| `chatgpt-review-mcp-v1` | 2 | done | chat | 2026-05-02 | 2026-05-02 (afternoon Sydney) | 2026-05-02 | **System SHIPPED. claude.ai connector CONNECTED at 03:16:48 UTC.** Built end-to-end in single ~9hr session (Sat 2 May). Three migrations applied via Supabase MCP per D170: `m.chatgpt_review` (31 cols, 5 idx incl. unique idempotency_key, 16 constraints) + `m.mcp_oauth_client` + `m.mcp_oauth_code`. Two EFs deployed: `chatgpt-review-worker` v1.0 (OpenAI Responses API gpt-4o-mini, json_schema strict, internal-only via INTERNAL_WORKER_TOKEN) + `mcp-chatgpt-bridge` v1.2.2 (MCP JSON-RPC + OAuth 2.1 + DCR RFC 7591 + PKCE; accepts static MCP_BRIDGE_BEARER_TOKEN OR OAuth-issued JWT). One Vercel page added: `app/mcp-consent/page.tsx` in invegent-dashboard. **Hit Supabase EF gateway quirk** — `Content-Type: text/html` rewritten to `text/plain` with `X-Content-Type-Options: nosniff` injected; verified via live `Invoke-WebRequest` headers; routed around on Vercel which serves HTML correctly. OpenAI project `ice-review` with $50/mo alert at $35+100%. Three Supabase secrets set: OPENAI_REVIEW_API_KEY, MCP_BRIDGE_BEARER_TOKEN, INTERNAL_WORKER_TOKEN. End-to-end PowerShell tests passed (init handshake, tools/list, tools/call agree-low → review_id `5cdc1d02-...`, idempotency cache hit). End-to-end OAuth flow validated via DB inspection: client `mcp_69ff8298c1e006f509f104b30a0934d9` registered 03:16:31, auth code created 03:16:46, consumed 03:16:48 (2sec turnaround), JWT issued, `last_used_at` populated. **Two ChatGPT review rounds during build caught real bugs**: (a) `now()` inside partial unique index predicate fails Postgres IMMUTABLE requirement (would have failed migration outright in v1.0); (b) alerting wording correction (OpenAI Project budgets don't enforce, only alert). Lesson #46 vindicated for the third time during this build (saved a wasted round of Headers API patches by inspecting live headers first). Lesson #58 candidate raised: "route around platform quirks on a different surface rather than fighting the platform". 6 commits in Invegent-content-engine (`906a7ec` brief, `b7c0543` brief v1.1, `464c6a2` EFs v1.0, `c8c4ab5` v1.2.0 OAuth wrapper, `7f90119` v1.2.1 htmlResponse helper [didn't fix gateway quirk], `aa6cded` v1.2.2 final Vercel-redirect architecture) + 1 in invegent-dashboard (`828b06d` mcp-consent page). Meta-infrastructure for D-01 standing rule. **Validation pending — tool only available in NEW claude.ai chat sessions; T-MCP-01 in action_list v2.15.** Brief at `docs/briefs/chatgpt-review-mcp-v1.md`. |
| `audit-slice-2-snapshot-generation` | 0 | done | cowork | 2026-04-30 | 2026-04-30T071532Z | 2026-04-30 | **First Tier 0 D182 brief shipped.** Cowork executed 16 SQL queries + 1 git op + wrote `docs/audit/snapshots/2026-04-30.md` (17 mechanical sections + Section 19 footer; **Section 18 deliberately absent** — load-bearing rule honored). All 21 JSON blocks parsed valid. Hit **5/5 first-run thresholds**: questions=1 (≤10), defaults overridden=0 (≤20%), run completes=yes, production writes=0 (mandatory), PK approval ≤10min. **D182 v1 now validated across two distinct brief shapes** (migration drafting + markdown generation) — Phase 4 generalisability confirmed for the 12 May sunset review. 6 schema-drift fallbacks were Cowork's correct application of the default-and-continue rule (brief author bug not Cowork bug); brief refreshed at the same closure commit. Q-001 resolved Option A. Run state file: `docs/runtime/runs/audit-slice-2-snapshot-generation-2026-04-30T071532Z.md`. |
| `operator-alerting-trio-column-purposes` | 1 | done | cc | 2026-04-30 | 2026-04-30T065007Z | 2026-04-30 | 57/57 HIGH columns populated, **0 LOW** (cleanest result on JSONB-bearing brief to date). m.compliance_review_queue 19/19, m.external_review_queue 21/21, m.external_review_digest 17/17. Strict JSONB rule satisfied for `ai_analysis`: producer code cited at `supabase/functions/compliance-reviewer/index.ts:200-244` + canonical writer RPC `public.store_compliance_ai_analysis`; all 8 top-level keys + array element sub-shapes documented. Pause-context handled correctly — column purposes describe semantics without repeating "(paused per D162)". m schema coverage 31.6% → **39.94%** (217 → 274 of 686). Migration applied by chat via Supabase MCP per D170 at 2026-04-30T07:08:00Z. |
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
