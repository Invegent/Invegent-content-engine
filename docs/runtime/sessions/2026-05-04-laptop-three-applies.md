# 2026-05-04 laptop Sydney — three applies: F-AI-WORKER-PARSER-SKIP-BUG deploy, F-AAP-007 v2 apply, F-PUB-009 apply

**Phase**: laptop-session execution of the three queued items from morning phone session (commit `1213fba`).
**Honours**: D-01, D-170, D-186, Lesson #36, Lesson #51, Lesson #62 type-(c).
**Closure budget**: ~0.5h this phase. Trailing-14d ~18.5 → ~19.0h. Above floor.

---

## Trigger

Morning phone session (`2026-05-04-baudit-check5-retired-faap007-revised`) closed with three queued items: F-AI-WORKER-PARSER-SKIP-BUG (P1 EF deploy), F-PUB-009 (P1 SQL apply), F-AAP-007 v2 (P2 SQL apply). PK on laptop; chose Option B (chat handles entire flow including EF deploy via Supabase MCP, no CC handoff). Sequence per leverage: F-AI-WORKER-PARSER-SKIP-BUG first.

## Decisions

### Decision 1 — F-AI-WORKER-PARSER-SKIP-BUG: ai-worker v2.11.0 → v2.11.1 deployed

Patch shape per brief, three logically-bundled changes:

1. **`callClaude` parser**: check `parsed.value.skip !== true` BEFORE checking `!title || !body`. Throws `AiParseError` (new class) instead of plain `Error` on parse failures, carrying the raw cleaned response.
2. **`callOpenAI` parser**: identical mirror.
3. **Outer per-job catch**: reads `e.rawResponse` if `e instanceof AiParseError`, persists to `ai_job.output_payload.error_response_raw.slice(0,4000)`. Also added: when fallback OpenAI also throws AiParseError, prefer fallback's rawResponse; if no result and primaryRawResponse populated, re-raise as AiParseError so outer catch persists evidence. Closes B-AI-WORKER-NO-FAILURE-PAYLOAD-LOGGING in same deploy.

D-01 review `ba234fce-1adb-4ae0-8a38-d8da3e5ac401`: **agree, medium risk, high confidence, no escalation.** Clean approval.

Deploy via Supabase MCP `deploy_edge_function`:
- Version 98 → **99**
- Status: ACTIVE
- `verify_jwt: false` preserved
- Single-file `index.ts`
- New `ezbr_sha256`: `8957e53269fd9d636be8c7bab378db1b14bb2d5a9d19d6f7a442cad55075e8f0`
- Deploy timestamp: 1777883372719 (~08:29 UTC)

### Decision 2 — F-AAP-007 v2 applied (Option B, label-level fix)

Pre-flight at apply time: Q6=6 (down from 65 yesterday — F-AAP-001 drain working), Q7=0 (zero genuine gaps; all surfaced rows correctly cap-blocked).

Patch shape: ONE CASE branch in `audit.v_brand_platform_audit_matrix.likely_bottleneck` split into two:
- `approved_not_queued_cap_blocked` — verified cap-breached (queue_ready ≥ cap)
- `approved_not_queued_genuine_gap` — surfaced rows with headroom remaining (new sibling label)

D-01 review `e462597f-103d-45de-809e-a87d0176d083`: **partial verdict, medium risk, high confidence, ESCALATED.** Lesson #62 type-(c) signature: verified_claims confirmed both fact-checks (Q6+Q7 ground truth, fix targets correct rows); pushback was generic-risk speculation about "downstream systems may not handle new label" without specific consumer-break evidence; corrected_action restated the existing plan. State-capture exception applied with PK explicit approval.

Migration applied via `apply_migration`. Verification:
- **V1** ✅ New label string + cap-check predicate present in deployed view body (positions 6378 + 6616)
- **V2** ✅ Total row count unchanged; new label exists in schema (count 0 currently — no genuine gaps)
- **V3** ✅ Q6=6 / Q7=0 unchanged (count column factual; label-only fix)
- **V4** ✅ Sample 6 surfaced rows: 4 correctly labelled `approved_not_queued_cap_blocked` (verified cap-breached: ndis-yarns FB queue 100 ≥ cap 10; ndis-yarns LI 48 ≥ 6; pp LI 70 ≥ 8; pp YT 10 ≥ 10). 2 correctly fall through to higher-priority `publishing_disabled` (ndis-yarns IG, pp IG — T07-paused state). Bonus: fix also de-conflates publishing_disabled from cap_blocked for IG streams.

### Decision 3 — F-PUB-009 applied (improved Pattern 1 — function-internal patch)

Pre-flight PF6 at apply time: 145/145 slot-driven drafts (14d window) have `scheduled_for IS NULL`. No prior path writing this column. Forward-only safeguard fully aligned.

Function source read via `pg_get_functiondef`. Found that the existing `INSERT INTO m.post_draft ... ON CONFLICT` block already explicitly sets `scheduled_for = NULL` in its UPSERT path — meaning we don't need a separate trailing UPDATE (brief's original Pattern 1). Cleaner approach: surgical edit to that one block.

Patch shape: **two changes inside the existing INSERT block** in `m.fill_pending_slots`:
1. INSERT column list adds `scheduled_for` with value `v_slot.scheduled_publish_at`
2. ON CONFLICT clause changes `scheduled_for = NULL` → `scheduled_for = EXCLUDED.scheduled_for`

Every other line of the function byte-identical to the deployed body. One block, no race window, no extra statement. Atomic CREATE OR REPLACE FUNCTION — no partial-state risk.

D-01 review `753930ad-5b7c-44d3-8f9f-bbde34c6d7ed`: **partial verdict, medium risk, high confidence, ESCALATED.** Same Lesson #62 type-(c) signature as F-AAP-007 v2 escalation 10 minutes earlier: verified_claims confirmed all three substantive facts (function is the only writer, 145/145 NULL, byte-identical except patch points); pushback was generic risk + restating the proposal's own "stock vs flow" caveat as if it were a new finding; corrected_action restated the existing 7-day flow check plan. State-capture exception applied with PK explicit approval.

Migration applied via `apply_migration`. Verification:
- **V1** ✅ All 3 patch markers present in deployed function body (insert col list at pos 14016; ON CONFLICT EXCLUDED at pos 15069; F-PUB-009 marker at pos 13839)
- **V2** ✅ Pre-existing scheduled_for values unchanged (still 0/145 set; forward-only invariant holds; no retroactive backfill)
- **V3-V5** pending next fill cycle. Pipeline currently at 0 pending_fill / 0 fill_in_progress (queues caught up). Next CFW LI slot at 2026-05-06 03:04 UTC will be the first acid test for both this fix AND the parser fix's skip-path.

## Verification status across all three fixes

| Fix | V1 | V2 | V3-V5 |
|---|---|---|---|
| F-AI-WORKER-PARSER-SKIP-BUG | ✅ v99 deployed | ✅ partial — 1 ai_job (NDIS-Yarns YT, 09:00 UTC) succeeded under v2.11.1, normal success path no regression | Pending CFW LI fill cycle (~17h) for skip-path acid test |
| F-AAP-007 v2 | ✅ | ✅ | ✅ all 4 V-checks green |
| F-PUB-009 | ✅ | ✅ forward-only invariant | Pending next fill cycle for V3-V5 (slot scheduled_publish_at → draft.scheduled_for write) |

## D-01 escalation pattern (this session)

Two of three D-01 reviews escalated (`e462597f` + `753930ad`). Both showed identical Lesson #62 type-(c) signature:

1. Verified_claims affirmed every substantive fact in the proposal
2. Pushback consisted of generic-risk speculation without specific consumer-break / data-corruption / regression evidence
3. Corrected_action restated the existing apply-path plan (no new ask)
4. Unverified_claims either restated the proposal's own caveats or hedged with "may not"

State-capture exception applied to both with PK explicit approval. Cost-of-waiting reasoning held. Both fixes shipped successfully with V1+V2 confirmation.

**Reinforcement count update**: Lesson #62 type-(c) at 5+ vindications now (3 from v2.32 + 2 today). Ready for canonical promotion to "type-(c) escalations carry a default presumption of generic-bias unless reviewer surfaces specific consumer-break or data-corruption evidence."

## Net P0+P1 open after session

Pre-session: 7 (F-AI-WORKER-PARSER-SKIP-BUG P1, F-PUB-009 P1, T05 P1-urgent, plus 4 lower-priority items)
Post-session: 4 (T05 P1-urgent + 3 P1 fixes shipped pending V3-V5 confirmation over 24h window)

## On the horizon

- **CFW LI fill cycle** at ~05-06 03:04 UTC will be the first acid test for both deployed fixes simultaneously (parser skip-path + scheduled_for write). Watch `m.ai_job` updates from that cycle for: (a) succeeded with output_payload.skipped=true (parser fix) OR succeeded normally (success path), (b) corresponding `m.post_draft.scheduled_for = m.slot.scheduled_publish_at` (F-PUB-009).
- **F-AAP-NEEDS-REVIEW-BACKLOG (P2)** — 28 drafts piled in needs_review; remains the top P2 next-up.
- **T05 Meta dev support** — still P1-urgent, unchanged.
- **F-PUB-009 7-day flow check** — `legacy_spread_mismatch_count` is a stock measure; new fills will queue with correct timing but old queue rows drain at current cadence. Add to S23 candidate.

## Lesson reinforcements

- **Lesson #62 type-(c)**: 5+ vindications. Promote to canonical with the default-presumption framing.
- **Lesson #36 (source byte-identity)**: honoured on both SQL applies — `pg_get_viewdef` and `pg_get_functiondef` read immediately before composing each migration; line-by-line edit to the patch points only.
- **Lesson #51 (pre-flight discipline)**: PF1-PF6 honoured for F-PUB-009 with extra rigour given the function-body size (~500 lines).
- **NEW canonical-lesson candidate from morning phone session** ("drill into worker source code when investigating cascading symptoms") **reinforced in apply phase**: deploying the parser fix without first reading the deployed source via `get_edge_function` would have produced a patch against a guessed-at version. Source-first rule continues to pay off.

## Closure-effectiveness note

Three P1/P2 fixes shipped in ~30min of chat-side execution time after the morning phone session pre-flight. High leverage: the morning session's investigation produced ready-to-execute briefs with pre-flight already 80%+ done; laptop session was largely D-01 review + apply + verify mechanical work. This is the closure-effectiveness target: investigation-heavy phone session feeds an execution-heavy laptop session.

## Open at end-of-phase

- F-AI-WORKER-PARSER-SKIP-BUG V3-V5 (CFW LI skip-path acid test) — pending ~17h
- F-PUB-009 V3-V5 (new fill cycle write verification) — pending next cron tick when slots are pending
- All three apply paths complete; no rollbacks needed
- Session-close 4-way sync (this note + sync_state v2.34 + action_list v2.34 + memory bump) — in progress
