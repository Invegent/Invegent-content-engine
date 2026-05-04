# Briefs Queue

Active briefs ready for execution by the D182 v1 non-blocking automation system.

## How this file works

Briefs live as individual files in `docs/briefs/`. This file is the operator-facing queue showing what's ready, what's in flight, and what's done. Cowork reads this file to find the next brief with `status: ready` AND `owner` ∈ {`cowork`, `cc/cowork`, empty} (owner-gate convention added 2026-05-04 — see `docs/runtime/automation_v1_spec.md` Brief frontmatter notes).

When a brief moves through the lifecycle, update the row here. Detailed state lives in `docs/runtime/runs/{brief_id}-{timestamp}.md`.

## Active queue

| brief_id | risk_tier | status | owner | created | notes |
|---|---|---|---|---|---|
| `nightly-health-check-v1` (v2.1) | 0 | review_required | cowork | 2026-05-02 | **Run 2026-05-04T105109Z by Cowork — first scheduled v2.1 run. 0 questions, 0 corrections, 0 schema/SQL bugs, 0 production writes.** All 14 brief queries executed cleanly. v2.1 SQL fix held (Q-true-stuck slice notation). Output `docs/audit/health/2026-05-04.md` (11 sections). State `docs/runtime/runs/nightly-health-check-v1-2026-05-04T105109Z.md`. **Section 10 Priority 1: 5 true-stuck items** across 3 clusters — linkedin×property-pulse (2, oldest 2026-05-01 21:00 UTC = ~2.5 days), youtube×property-pulse (2, oldest 2026-05-03 10:00), youtube×ndis-yarns (1, scheduled today 09:00). Workers healthy (no cron failures, no HTTP errors). LinkedIn-PP cluster persists from same shape that triggered v2 patch on 2 May. **Secondary signal**: S17 escalation rate 52% (13/25 calls in 7d) > 40% threshold with calls≥10. **5-of-7 success thresholds confirmed at run-end; PK review time + Section 10 accuracy pending.** Next: PK reviews; queue row resets `review_required` → `ready` for tomorrow's run (recurring brief, manual reset convention). |
| `post-render-log-column-purposes` | 1 | review_required | cc/cowork | 2026-04-30 | **Cowork drafted 2026-05-02T10:20:54Z. 15/16 HIGH + 1/16 LOW deferred (render_spec)** — within brief's 0-2 LOW budget. Migration drafted at `supabase/migrations/20260502102054_audit_post_render_log_column_purposes.sql` (single atomic DO block, count-delta verification asserts pre-post=15 AND post=1). LOW followup at `docs/audit/decisions/post_render_log_low_confidence_followup.md` — render_spec stays NULL because image-worker passes p_render_spec=null on every call (success and fail paths); 0/932 production rows have it populated. Status enum reconciled vs brief: brief carried `pending\|rendering\|succeeded\|failed` from table_purpose, image-worker actually writes `succeeded\|failed\|timeout`; default `submitted` never written. video-worker/ directory does not exist (only heygen-worker/, which does not write to m.post_render_log). Run state `docs/runtime/runs/post-render-log-column-purposes-2026-05-02T102054Z.md`. **Open question: Q-post-render-log-column-purposes-001** — render_spec LOW judgement + status enum reconciliation. Recommend Option A. **Next:** chat applies migration via Supabase MCP per D170. |
| `publish-queue-and-publish-column-purposes` | 1 | ready | cc | 2026-05-03 | **Frontmatter patched 2026-05-04** — added 5 missing v1-spec-mandatory fields (`default_action`, `allowed_paths`, `forbidden_actions`, `idempotency_check`, `success_output`) per halt-state-file suggestions; renamed `id` → `brief_id`. Brief now spec-compliant. **Owner remains `cc`** — under owner-gate convention (added 2026-05-04 to v1 spec + cowork prompt v2.2) Cowork SKIPS `owner: cc` rows. This brief awaits CC pickup, not Cowork. Tier 1, 35 cols across `m.post_publish_queue` (20) + `m.post_publish` (15), follows established column-purposes pattern, 0-2 LOW budget, F-PUB-006 work area context fresh. Last halt state file: `docs/runtime/runs/publish-queue-and-publish-column-purposes-2026-05-03T160310Z.md`. |

## Recently completed

| brief_id | risk_tier | status | owner | created | run | completed | notes |
|---|---|---|---|---|---|---|---|
| `nightly-health-check-v1` (v1) | 0 | done | cowork | 2026-05-02 | 2026-05-02T064839Z | 2026-05-02 | **First run of brief shape #3 (pipeline-state digest). 4-of-4 measurable thresholds hit** (questions=1, overrides=0, output produced, production writes=0). Surfaced 4 brief-author schema bugs in Q7/Q9 — Cowork recovered via `information_schema.columns` lookup per default-and-continue (Cat: brief-author bug not Cowork bug). 12 SQL queries against m.* + f.* health tables. Output `docs/audit/health/2026-05-02.md` (11 sections, full data). Run state `docs/runtime/runs/nightly-health-check-v1-2026-05-02T064839Z.md`. **D182 v1 now validated across 3 distinct brief shapes** (migration drafting + audit-snapshot markdown + pipeline-state digest) — strengthens 12 May sunset review case. Q-001 captured the schema divergences for v2 patch (now applied). PK + chat B-investigation flagged 5 LinkedIn-approved drafts at PP with `publish_attempts=0` — v1 boolean `has_stuck_items=true` was too coarse to surface this; v2 brief catches it as Cat C true-stuck automatically. **Lesson #61 candidate**: "Pre-flight must include `information_schema.columns` lookup on every brief-referenced table, not just existence + counts. Schema drift on column names is the most common brief-author bug." |
| `chatgpt-review-mcp-v1` | 2 | done | chat | 2026-05-02 | 2026-05-02 (afternoon Sydney) | 2026-05-02 | **System SHIPPED. claude.ai connector CONNECTED at 03:16:48 UTC.** Built end-to-end in single ~9hr session (Sat 2 May). Three migrations applied via Supabase MCP per D170: `m.chatgpt_review` (31 cols, 5 idx incl. unique idempotency_key, 16 constraints) + `m.mcp_oauth_client` + `m.mcp_oauth_code`. Two EFs deployed: `chatgpt-review-worker` v1.0 + `mcp-chatgpt-bridge` v1.2.2. T-MCP-01 closed via first real fire on T02 Gate B exit decision (review_id `2bab95d5-...`); MCP review protocol codified at `docs/runtime/mcp_review_protocol.md` v2.17. |
| `audit-slice-2-snapshot-generation` | 0 | done | cowork | 2026-04-30 | 2026-04-30T071532Z | 2026-04-30 | **First Tier 0 D182 brief shipped.** Cowork executed 16 SQL queries + 1 git op + wrote `docs/audit/snapshots/2026-04-30.md` (17 mechanical sections + Section 19 footer; **Section 18 deliberately absent** — load-bearing rule honored). All 21 JSON blocks parsed valid. Hit **5/5 first-run thresholds**. **D182 v1 validated across two distinct brief shapes** (migration drafting + markdown generation) — Phase 4 generalisability confirmed for 12 May sunset review. 6 schema-drift fallbacks were Cowork's correct application of default-and-continue (brief author bug not Cowork bug); brief refreshed at the same closure commit. Q-001 resolved Option A. Run state file: `docs/runtime/runs/audit-slice-2-snapshot-generation-2026-04-30T071532Z.md`. |
| `operator-alerting-trio-column-purposes` | 1 | done | cc | 2026-04-30 | 2026-04-30T065007Z | 2026-04-30 | 57/57 HIGH columns populated, **0 LOW** (cleanest result on JSONB-bearing brief to date). m.compliance_review_queue 19/19, m.external_review_queue 21/21, m.external_review_digest 17/17. m schema coverage 31.6% → **39.94%** (217 → 274 of 686). Migration applied by chat via Supabase MCP per D170 at 2026-04-30T07:08:00Z. |
| `pipeline-health-pair-column-purposes` | 1 | done | cc | 2026-04-30 | 2026-04-30T060202Z | 2026-04-30 | 37/37 HIGH columns populated, **0 LOW**. m.pipeline_health_log 21/21, m.cron_health_snapshot 16/16. Producer code in hand for both tables. m schema coverage 26.2% → **31.6%** (180 → 217 of 686). Migration applied by chat via Supabase MCP per D170 at 2026-04-30T06:13:30Z. |
| `post-publish-observability-column-purposes` | 1 | done | cc | 2026-04-30 | 2026-04-30T041924Z | 2026-04-30 | 61 HIGH columns populated, 3 LOW retained for joint session. m schema coverage 17.3% → **26.2%** (119 → 180 of 686). Migration applied by chat via Supabase MCP per D170 at 2026-04-30T04:30:55Z. |
| `phase-b-patch-image-quote-body-health-gate` | 2 | done | cc | 2026-04-30 | 2026-04-30T033748Z | 2026-04-30 | Phase B patch — body-health gate. Migration applied by chat via Supabase MCP per D170 at 2026-04-30T03:48:25Z. Pool retention exact match to brief: CFW 132 / NDIS-Yarns 132 / PP 64 / Invegent 13. |
| `slot-core-column-purposes` | 1 | done | cc | 2026-04-30 | 2026-04-30T020151Z | 2026-04-30 | 56 columns populated across m.slot (20), m.slot_fill_attempt (16), m.ai_job (20). m schema coverage 9.2% → 17.3% (63 → 119 of 686). Migration applied by chat via Supabase MCP per D170. |
| `phase-d-array-mop-up` | 1 | done | cowork | 2026-04-29 | 2026-04-29T102956Z | 2026-04-29 | 🎉 First D182 run — 5/5 success thresholds. 7 ARRAY columns documented. Cowork run — 0 questions, 0 corrections, 0 production writes from automation, ~5 min runtime, ~45k token burn. |

## Failed / blocked

*(none currently isolated here — `publish-queue-and-publish-column-purposes` was failed 2026-05-03 → ready 2026-05-04 in Active queue.)*

---

## Status legend

- **ready** — brief authored, frontmatter complete, awaiting execution
- **running** — Cowork has picked it up
- **questions_pending** — Cowork has written to `claude_questions.md`, awaiting `claude_answers.md`
- **validation_pending** — output ready for GitHub Actions validation
- **review_required** — validation passed, awaiting PK morning approval
- **done** — PK has approved and applied (move to Recently completed)
- **failed** — something went wrong; PK to inspect state file and decide next step
- **blocked** — Tier 2/3 escalation hit; PK must manually reset to `ready`

## Adding a new brief

1. Create `docs/briefs/{brief-id}.md` with v1 frontmatter (see `docs/runtime/automation_v1_spec.md`)
2. Add row to Active queue table above
3. Set `status: ready` in the brief frontmatter
4. Set `owner` correctly per the owner-gate convention (`cowork` or `cc/cowork` for Cowork pickup; `cc` / `chat` / `PK` to gate out Cowork)
5. Commit

That's it. The brief is now visible to Cowork (or routed to its intended executor).

## Workflow loop (post-run)

When Cowork finishes a brief, all output is in GitHub. PK does NOT need to paste findings into chat — see `docs/runtime/automation_v1_spec.md` "After-run handover" section for the canonical pattern.
