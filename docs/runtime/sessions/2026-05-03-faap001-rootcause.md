# 2026-05-03 late-afternoon Sydney — F-PUB-005 V3-V5 PASS + F-AAP-001 confirmed root cause

> **Status:** F-PUB-005 V3-V5 wait-based verifications PASS. B-INV-CFW-Invegent-Silent-Approver investigation reframed and resolved. New finding F-AAP-001 logged P1 with **confirmed** root cause: slot-driven v4 architecture vs auto-approver SQL fetcher schema/contract break. ChatGPT correction validated — EF source inspection upgraded F-AAP-001 from "inferred hypotheses" to "confirmed mechanism".

## Headline

PK 3-step session sequence executed clean. Step 1 (V3-V5 verifications) PASS across all 11 (client, platform) combos. Step 2 (B-INV-CFW-Invegent-Silent-Approver) reframed the picture: silence is system-wide post-2026-05-02 19:00 UTC, not CFW/Invegent-specific. ChatGPT MCP review of close-out plan ESCALATED — recommended EF source inspection before commit. PK accepted correction. Inspection of `auto-approver` (v53/v1.6.0) and `ai-worker` (v94/v2.11.0) confirmed root cause: slot-driven `slot_fill_synthesis_v1` jobs (ai-worker v2.10.0+, deployed late-April) produce `m.post_draft` rows with `digest_item_id = NULL`, while `m.auto_approver_fetch_drafts` SQL function INNER-JOINs through `m.digest_item` + `m.digest_run`. 131 of 135 post-25-April drafts unreachable. 0 of 122 current `needs_review` drafts pass current SQL fetch.

## F-PUB-005 V3-V5 verifications — PASS

T+0 baseline: post-apply snapshot at `2026-05-03 02:29:48 UTC`, captured in `docs/runtime/sessions/2026-05-03-fpub005-apply.md`.

| Combo | T+0 | Now | Δ | Cap | V5 |
|---|---|---|---|---|---|
| CFW × FB | 1 | 1 | 0 | 10 | ✅ |
| CFW × IG | 7 | 7 | 0 | 10 | ✅ |
| CFW × LI | 1 | 1 | 0 | 10 | ✅ |
| Invegent × FB | 1 | 1 | 0 | 10 | ✅ |
| Invegent × IG | 6 | 6 | 0 | 10 | ✅ |
| NDIS-Yarns × FB | 107 | 106 | -1 | 10 | ✅ drained |
| NDIS-Yarns × IG | 128 | 128 | 0 | 6 | ✅ |
| NDIS-Yarns × LI | 50 | 50 | 0 | 6 | ✅ |
| PP × FB | 3 | 2 | -1 | 20 | ✅ drained |
| PP × IG | 111 | 111 | 0 | 6 | ✅ |
| PP × LI | 72 | 72 | 0 | 8 | ✅ |

- **V5 PASS**: zero growth on any over-cap combo. Two below-cap combos drained by 1 each (publisher functional).
- **V4 PASS**: zero queue rows post-apply with `needs_review` draft (no new zombies).
- **V3 PASS**: backpressure signal as designed; only NDIS-Yarns × FB shows 19 approved-not-enqueued drafts (cap doing its job).

**Stance retire criterion #1 (V3-V5 PASS, ~13h post-apply) FIRED.** Stance not retired this session — PK accepted close only, did not signal retirement. T05 stays P1-deferred until explicit retirement signal.

## B-INV-CFW-Invegent-Silent-Approver investigation — REFRAMED + RESOLVED

### Original premise (v2.21)

"NDIS-Yarns firing all 4 platforms; CFW + Invegent silent across all platforms."

### Reframed picture (this session)

Premise was correct as of 2026-05-03 morning. By late afternoon: silence is **system-wide**, not CFW/Invegent-specific.

| Approval pattern | Window | Total |
|---|---|---|
| All clients × all platforms | last 24h | 251 (NDIS-Yarns 247, PP 4, CFW 0, Invegent 0) |
| All clients × all platforms | last 72h | 423 |
| Last approval action timestamp | — | **2026-05-02 19:00 UTC** |
| Newest `approved` draft `created_at` | — | **2026-04-25 07:00 UTC** |
| Newest `needs_review` draft `created_at` | — | 2026-05-03 07:00 UTC (still being produced) |

The 252-approval burst on 2 May was the auto-approver draining the **legacy digest-flow draft backlog** FIFO-style. Once that backlog exhausted, approvals stopped completely.

### Status

B-INV-CFW-Invegent-Silent-Approver: **RESOLVED** — original framing superseded by system-wide silence finding. Concrete mechanism documented as F-AAP-001 below.

## F-AAP-001 — confirmed root cause

### Sequence of evidence

**1. SQL function diagnostic**

`m.auto_approver_fetch_drafts(100)` returns **0 rows** right now despite 122 `needs_review` drafts existing in the system.

**2. JOIN chain trace on the 122 drafts**

| Stage | Count | What it means |
|---|---|---|
| Total `needs_review` | 122 | All eligible-by-status drafts |
| `pd.digest_item_id IS NULL` on draft itself | **109** | Column is NULL on the draft row. Not a deletion. |
| `digest_item_id` set, but `digest_item` row missing | 0 | Not a dangling-FK issue |
| `digest_item` exists, `digest_run_id IS NULL` | 0 | Not the digest_item layer |
| `digest_item` + `digest_run` chain intact | **13** | These have proper linkage; fail the next gate |
| Of those 13: `cpp.auto_approve_enabled = false` | 13 | All 13 hit the per-platform gate |
| Would pass all SQL filters | **0** | — |

**3. Date inflection**

- Oldest NULL-`digest_item_id` `needs_review` draft `created_at`: **2026-04-27 01:40 UTC** (one day after slot-driven Phase A complete on 26 April per memory)
- Newest: 2026-05-03 07:00 UTC (40min before session start; still happening)
- Of 135 drafts created post-25-April: **131 (97%) have NULL `digest_item_id`**
- Of 562 historical `approved` drafts: 2 (0.4%) had NULL `digest_item_id`
- Of 67 historical `published` drafts: NULL — these likely came through evergreen/series paths

**4. EF source inspection (the ChatGPT-prompted step)**

*`auto-approver` v53 (v1.6.0):*
- SQL fetch fn: `m.auto_approver_fetch_drafts(p_limit)` returned via Supabase MCP
- Function uses INNER JOIN: `m.digest_item di ON di.digest_item_id = pd.digest_item_id` and `m.digest_run dr ON dr.digest_run_id = di.digest_run_id`
- `client_id` for the LATERAL `c.client_publish_profile` match is read from `dr.client_id` (the digest_run), not `pd.client_id` (the draft itself)
- Failed JOIN → row dropped before reaching the `auto_approve_enabled` gate
- Per-platform `auto_approve_enabled` filter is a separate downstream gate via the LATERAL

*`ai-worker` v94 (v2.11.0):*
- v2.10.0 (Stage 11) introduced `slot_fill_synthesis_v1` job type
- Code comment: *"Translate the slot-driven payload into a digest_item-shaped seed (single_item) or items[] (bundle) so the existing format-advisor → assemblePrompts → callClaude/callOpenAI flow runs unchanged."*
- Translation builds an in-memory `effectivePayload.digest_item` SHAPE for the LLM prompt only — **never inserts a row into `m.digest_item`**
- ai-worker UPDATEs existing post_draft row with `draft_title`/`draft_body`/`draft_format`/`approval_status='needs_review'` — **never touches `digest_item_id`**
- Slot-meta encoded in `draft_format.ai.{slot_id, job_type_input, job_type_effective, is_shadow}` instead of via digest tables

### Confirmed mechanism (no longer hypothesis)

Whatever creates post_draft rows for slot-driven jobs upstream produces them with `digest_item_id = NULL` (no `m.digest_item` row exists for slot-driven drafts). The ai-worker does not backfill. The auto-approver SQL fetcher was authored for the legacy digest-flow architecture and was not updated when slot-driven shipped. INNER JOIN drops every slot-driven draft. Auto-approver runs every 10min via cron jobid 58 (active), fetches 0 rows, no-ops, repeats.

The "252 approvals in 9.5h post-B31" verified at v2.21 was the auto-approver draining **legacy digest-flow drafts** (the ones that DID have valid digest_item linkage from before the slot-driven cutover). Once that backlog ran out at 2026-05-02 19:00 UTC, all approvals ceased.

### Severity

**P1** — blocks auto-approver on the entire v4 architecture. The auto-approver code is functioning correctly given its inputs; the SQL function is producing the wrong outputs given current pipeline state.

### Two fix paths (next-session brief)

**Path 1 — Loosen the SQL fetcher (preferred).**

Rewrite `m.auto_approver_fetch_drafts` to:
- LEFT JOIN `m.digest_item` and `m.digest_run` (instead of INNER JOIN)
- Read `client_id` from `pd.client_id` (the draft) instead of `dr.client_id` (the run)
- Read `final_score` from LEFT-joined `di.final_score` (NULLs sort last under existing `NULLS LAST` clause; no behavioural change since D135 already made `final_score` no-op)
- Preserve the LATERAL on `c.client_publish_profile` keyed by `pd.client_id` and `pd.platform` (still required, still works)

**Rationale**: The slot-driven v4 architecture is intentionally moving away from the digest_item coupling. Path 1 removes a stale dependency without requiring upstream changes. Smaller diff. Clearer intent. No upstream risk.

**Path 2 — Have the slot-driven creator populate `digest_item_id`.**

Either:
- Modify the slot-fill mechanism to also INSERT a synthetic `m.digest_item` row, OR
- Add a compatibility-bridge `digest_item` row at slot-fill time with the canonical_id metadata

**Rationale**: Keeps the SQL fetcher unchanged. Cost: requires identifying and modifying the slot-driven row creator (more surface area than Path 1). Couples v4 architecture to a v3 dependency the v4 design is intentionally trying to drop.

**Recommendation: Path 1.**

### Out of scope for next-session brief

- Per-platform `auto_approve_enabled` configuration audit (CFW × FB/IG and Invegent × IG are `false`). If those should be `true`, that's a config decision separate from the SQL-fetcher fix.
- Audit of other SQL functions/triggers/views authored against legacy digest-flow that may need updating for v4 (F-AAP-001 may have peers — see Pattern signals below).

## Mutations log

| When | Action | Type |
|---|---|---|
| Session-start | Read `docs/00_sync_state.md` + `docs/00_action_list.md` + `docs/runtime/sessions/2026-05-03-fpub005-apply.md` via GitHub MCP | Read |
| Session | F-PUB-005 V3-V5 verification SQL (combined query) | sql_read |
| Session | B-INV funnel SQL: 48h activity per (client, platform) | sql_read |
| Session | Sanity-check SQL: raw counts + status distribution | sql_read |
| Session | Cron state SQL + per-client `needs_review` SQL + 24h/72h approvals SQL | sql_read |
| Session | MCP review fire on close-out plan (review_id `1e5ab2eb-d29b-4fa6-8e0c-262780f31e0d`) — ESCALATED | DML (auto by EF) |
| Session | F-PUB-005 SQL function definition + `c.client_publish_profile` cpp gate query | sql_read |
| Session | `m.auto_approver_fetch_drafts(100)` direct call + cooldown state SQL | sql_read |
| Session | JOIN-chain diagnostic SQL replicating SQL fetcher's filter chain on 122 needs_review drafts | sql_read |
| Session | Date-pattern + post-25-April distribution SQL | sql_read |
| Session | `auto-approver` v53 EF source read via Supabase MCP | Read |
| Session | `ai-worker` v94 EF source read via Supabase MCP | Read |
| (this commit) | GitHub push: 3 files (this session file + sync_state index update + action_list v2.27) | Git |

**Production DML**: 0. **DDL**: 0. **Edge Function deploys**: 0. Read-only investigation session.

## Standing rules honoured

- **D-01**: ChatGPT cross-check fired before close-out commit (review_id `1e5ab2eb-...`). Escalation accepted; correction applied (do EF source inspection); finding upgraded from inferred to confirmed. Second fire skipped — same accepted close-out plan, evidence strengthened (lower risk than original); state-capture exception applies for the strengthening update.
- **Lesson #51**: pre-flight discipline applied to investigation SQL.
- **Lesson #62 type-(c)**: does NOT apply here. Escalation produced genuinely new knowledge (root cause confirmed). Distinct from "consistency-bias" pattern where escalation just restates caveats.
- **G1 convention**: this file at `docs/runtime/sessions/`. ✓
- **4-way sync**: docs (this) + memory (next memory bump) + dashboard (no update needed — F-AAP-001 is a v4 architecture finding, not a roadmap change) + action_list (this commit).

## Closure budget impact

This work block: ~0.9h (V3-V5 + B-INV investigation + 2 EF source reads + diagnostic SQL chain + commit drafting).

Trailing-14-day: 10.3h (post-R01-calibration v2.25) + 0.9h (this) = **~11.2h**. Comfortably above the 8.0 floor.

Open findings P0+P1: ~10 net (closed B-INV-CFW-Invegent-Silent-Approver, added F-AAP-001 P1). Within 20 cap.

## Open items / next session

1. **F-AAP-001 fix brief**: design Path 1 SQL fetcher rewrite + acceptance criteria + migration name. Drop in `docs/briefs/`. CC-suitable for migration drafting; chat applies via Supabase MCP per D170.
2. **Operational stance retire decision**: criterion #1 fired (V3-V5 PASS confirmed patches held over ~13h). PK to signal retire/keep at next session start. If retired, T05 returns to P1-urgent.
3. **publish-queue-and-publish CC brief**: status `ready`, deferred from rank 4 of Today/Next 5; still queued.
4. **B-INV-LinkedIn-PhantomPublishes** (P2 backlog) — read-only investigation when bandwidth allows.
5. **T-MCP-05** close-the-loop UPDATE on `m.chatgpt_review` rows including `1e5ab2eb-...` from this session — pending PK confirmation.

## Pattern signals captured

- **MCP review correction value (NEW pattern):** ChatGPT escalation that flags inferred hypotheses on `plan_review` action_type → PK accepts → source inspection performed → escalation justified by new evidence found. Different from Lesson #62 type-(c) "consistency-bias" because the escalation produced new knowledge rather than restating caveats. **Lesson candidate**: "On `plan_review` actions where the plan logs a finding with inferred hypotheses, MCP escalation is high-value when a plausible upstream confirmation is one tool-call away — the source inspection often upgrades the finding from hypothesis to confirmed mechanism, or refutes it cleanly."

- **Slot-driven v4 contract migration audit gap:** the auto-approver SQL fetcher is one of likely several SQL functions/triggers/views authored against the legacy digest-flow that may need updating for slot-driven v4. F-AAP-001 may have peers. Worth a scoped audit pass (read-only) when bandwidth allows.

- **First sql_read MCP escalation of the day:** review_id `1e5ab2eb-...` was an escalation on `plan_review`, not `sql_destructive`. T-MCP-06's hypothesis ("investigate sql_destructive escalation rate ~50%") doesn't apply here. This is a different action_type pattern.

---

## End of segment

F-PUB-005 V3-V5 PASS. B-INV-CFW-Invegent-Silent-Approver resolved (premise superseded). F-AAP-001 logged P1 with **confirmed** root cause: slot-driven v4 vs auto-approver SQL fetcher schema/contract break. Path 1 fix recommended for next session. ChatGPT correction validated.
