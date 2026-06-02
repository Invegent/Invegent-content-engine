# cc-0015 friction register hygiene — 2026-06-02 (Sydney)

Lane: cc-0015 triage/friction register operational reconciliation. Actor on all mutations: `pk` (per CCD ruling — operator/audit convention). Execution: CCH via Supabase MCP, one RPC call at a time, verified after each.

## Governance convention (CCD ruling 2026-06-02)

For cc-0015 friction-hygiene batches: **CCD-inline D-01 + doc/session record.** Do NOT manually insert into `m.chatgpt_review`; do NOT fabricate a ChatGPT-Review ledger row. Only update `m.chatgpt_review` when a genuine ChatGPT-Review MCP row already exists.

## Batch 1 — true-stuck duplicate marking (9 calls)

Batch 1 (9× mark_duplicate, p_actor='pk') executed under CCD inline D-01 + PK exact approval phrase PK APPROVES CC-0015 BATCH 1 TRUE-STUCK DUPLICATE MARKING (9 CALLS). No m.chatgpt_review row exists to close — this D-01 was a CCD inline review, not a ChatGPT-Review-tool call; row not fabricated (per CCD ruling 2026-06-02).

Survivor → duplicates marked (all duplicates → triage_state/action_decision/resolution_kind = `duplicate`, resolved, predecessor linked; all 5 survivors remained open + `track`):
- `1e8eb9fd` survives ← `f971ebee`, `fe36ac02`
- `8f4c5728` survives ← `a4f12c61`, `275bd27d`
- `4377926f` survives ← `2b9b7405`, `c6162646`
- `99dc50b6` survives ← `2ff7a816`, `3d32e839`
- `0c92a8a9` survives ← `6180acb0`

Counts after Batch 1: 47 total / 34 open / 13 resolved / 1 new. 12 protected IDs verified untouched.

## Batch 2a — non-YouTube true-stuck tracked_done resolution (4 calls)

Batch 2a (4× resolve_case(..., 'tracked_done', 'pk')) executed under CCD inline D-01 + PK exact approval phrase PK APPROVES CC-0015 BATCH 2A NON-YOUTUBE TRACKED_DONE. No m.chatgpt_review row exists to close — this D-01 was a CCD inline review, not a ChatGPT-Review-tool call; row not fabricated (per CCD ruling 2026-06-02).

Resolved (each `resolution_kind='tracked_done'`, `action_decision` retained `track`; live publish evidence 2026-06-02 confirms each platform×brand publishing after the stuck window):
- `ba2b9899-531f-45a0-ae4c-af105239f497` — IG umbrella "no posts to instagram"; IG live all brands 05-31/06-01
- `1e8eb9fd-3fbf-4d46-aac7-d1df0594f440` — instagram × Care for Welfare; IG-CFW last publish 2026-05-31
- `8f4c5728-145c-4631-bb03-1a08a9e19b29` — instagram × Invegent; IG-Invegent last publish 2026-05-31
- `4377926f-770c-4180-be13-3db6073f3d2f` — linkedin × Property Pulse; LI-PP last publish 2026-05-31

Counts after Batch 1 + Batch 2a: 47 total / 30 open / 17 resolved / 1 new. 12 protected IDs verified untouched.

## Batch 2b — YT straggler carry case + YouTube true-stuck tracked_done resolution (4 calls)

Batch 2b executed under CCD inline D-01 + CCD count-change clearance + PK exact approval phrase PK APPROVES CC-0015 BATCH 2B CREATE YT-STRAGGLER CARRY CASE + RESOLVE 99DC50B6 0C92A8A9 TRACKED-DONE. No m.chatgpt_review row exists to close — CCD inline review, not a ChatGPT-Review-tool call; row not fabricated (per CCD ruling 2026-06-02). CCD confirmed option (a) intentionally changes the final target from 47/13/34 to 48/14/34 (extra open case = real carry-forward work, not noise).

1. **Created** carry case via `fn_emit_manual_event` (severity `warn`, category `pipeline_integrity`) → event `c2700baa-14f8-4bf6-bc5c-cb735ff26795` → **case `79326fc8-fa1d-4f67-a4db-9fa19dc04f63`**.
2. **Triaged** via `fn_triage_case` (p_actor='pk') → `acknowledged` / `pipeline_integrity` / `quality_flag=true` / `track` / `next_review_at=2026-06-09` / pool_key `youtube.queue.stale_stragglers_cleanup` (anchor). Verified open + track.
3. **Resolved** `99dc50b6-f410-452d-84f2-e60ad87912d1` (yt-NDIS-Yarns) → `tracked_done` (action_decision retained `track`).
4. **Resolved** `0c92a8a9-23ac-4746-9c11-ca5f0f8ca19d` (yt-Property-Pulse) → `tracked_done`.

Carry case content: 20 stale YouTube `post_publish_queue` rows, status `queued`, never published — NDIS-Yarns 10 (scheduled 2026-05-06 → 2026-05-21) + Property Pulse 10 (2026-04-29 → 2026-05-14). Cleanup decision pending: archive_stale vs requeue.

Counts after Batch 1 + 2a + 2b: **48 total / 29 open / 19 resolved / 1 new** (waypoint toward the 48/14/34 end-state). 12 protected IDs verified untouched.

## Batch 3 — observer_stale suppressed resolution (13 calls)

Batch 3 (13× resolve_case(..., 'suppressed', 'pk')) executed under CCD inline D-01 + PK exact approval phrase PK APPROVES CC-0015 BATCH 3 OBSERVER_STALE SUPPRESS. No m.chatgpt_review row exists to close — CCD inline review, not a ChatGPT-Review-tool call; row not fabricated (per CCD ruling 2026-06-02).

All 13 were observer_stale client_commitment/`suppress` cases pooled to now-resolved parent conditions (instagram.publisher.v2_deployed_cron_paused / youtube.truestuck.unpublishable_media / linkedin.enqueue.disabled_no_queue_rows); none Facebook — no overlap with the genuine CFW/NY Facebook-insights gap (those remain protected/track). Each resolved with `action_decision='suppress'` retained → `resolution_kind='suppressed'`, resolved (13 of 13 verified):
`02708c23`, `07e11315`, `19fd3412`, `279df2da`, `38df8074`, `395ebab6`, `4322d0ba`, `685ed282`, `87e6e0f7`, `98f913f2`, `c5e34315`, `cd5e4f96`, `d5efc053`.

(`279df2da` independently suppress-safe: PP × linkedin, LI-PP publishing 2026-05-31, stale residual, not the FB gap.)

Counts after Batch 1 + 2a + 2b + 3: **48 total / 16 open / 32 resolved / 1 new**. 12 protected IDs verified untouched. Carry case `79326fc8` remains open + `track`. `f633c279` remains `new` (held for Batch 6).

## Batch 4 — cc-0016 Stage B smoke resolve-ignored (2 calls)

Batch 4 (2× resolve_case(..., 'ignored', 'pk')) executed under CCD inline D-01 + PK exact approval phrase PK APPROVES CC-0015 BATCH 4 SMOKE RESOLVE-IGNORED. No m.chatgpt_review row exists to close — CCD inline review, not a ChatGPT-Review-tool call; row not fabricated (per CCD ruling 2026-06-02).

Both were cc-0016 Stage B smoke-test cases; the hard-guard `purge_test_case` pattern does not match their titles, so resolved-ignored (not hard-deleted) — preserves them as an audit trail and the cc-0016 V-A5 protected artefacts. Each `action_decision='ignore'` retained → `resolution_kind='ignored'`, resolved (2 of 2 verified):
- `66722f67-1243-47ce-b85e-50f0b7686807` — "cc-0016 Stage B attachment smoke"
- `ce4442dc-d2a7-4cf3-8136-02a2ff3c3e39` — "cc-0016 Stage B no-attachment smoke"

Counts after Batch 1 + 2a + 2b + 3 + 4: **48 total / 14 open / 34 resolved / 1 new**. 12 protected IDs verified untouched. Carry case `79326fc8` remains open + `track`. `f633c279` remains `new` / open (held for Batch 6).

## Batch 6 — f633c279 manual case first triage (1 call)

Batch 6 (1× fn_triage_case, p_actor='pk') executed under CCD inline D-01 + PK exact approval phrase PK APPROVES CC-0015 F633C279 MANUAL CASE TRIAGE. No m.chatgpt_review row exists to close — CCD inline review, not a ChatGPT-Review-tool call; row not fabricated (per CCD ruling 2026-06-02).

`f633c279-3592-4433-b80e-c170e4e33fd2` (manual PK FAB case, "Property Pulse kinetic shorts have no voice over") triaged → `acknowledged` / `client_commitment` / `quality_flag=true` / `track` / `next_review_at=2026-06-09` / `triaged_by=pk`. Kept **unpooled** (p_notes=NULL) so it surfaces through the Stage D unpooled / needs-assignment strip. Stays open + track. Root cause noted: PP YouTube shorts dominated by silent formats (video_short_kinetic / video_short_stat) vs under-routed voice/avatar variants — a real content-quality/format-routing gap.

Counts after Batch 6 (session end-state): **48 total / 14 open / 34 resolved / 0 new**. 12 protected IDs verified untouched. Carry case `79326fc8` remains open + `track`.

## Session complete — final end-state

cc-0015 register hygiene COMPLETE for this session. Final register: **48 total / 14 open / 34 resolved / 0 new**. All mutations executed via SECURITY DEFINER friction RPCs, p_actor='pk', one call at a time, verified after each. Governance recorded per CCD-inline convention (no m.chatgpt_review rows fabricated). 12 protected IDs untouched throughout.

## Stage D Phase 1 UI — LIVE IN PRODUCTION

Track-2 Stage D Phase 1 (read-only) was **implemented by CCD, preview-verified by CCB (PASS), merged to main at `668b6ae`, deployed to production, and production sanity-verified by CCB (PASS)**. Live on `/operations/pools`: status strip + collapsed pool-card indicators. No mutation surface added; read-only footer intact. (Supersedes the earlier "plan only / not built" and "pending merge / production verification" notes — those are stale.)

## Carry-forwards (open follow-ups)

- Stage D **Phase 2** `/operations` status strip — not yet built.
- Optional cosmetic label-truncation cleanup on pool/case labels.
- Stale YouTube queue cleanup (carry case `79326fc8`) — open decision: archive_stale vs requeue (next_review 2026-06-09).
- Overdue tracked-cases review sweep — several `track` cases have next_review dates in the past (2026-05-19 → 2026-05-30).
- `00_sync_state.md` / `00_action_list.md` updated in the cc-0015 surgical index pass (2026-06-02) to record register-hygiene completion + Stage D Phase 1 live.

## Protected IDs (must remain untouched across all batches)

`26436794`, `877b7382`, `78afc70e`, `101935ba`, `53f3e533`, `2cf0cd4f`, `b7369dc9`, `22056313`, `6e148859`, `15d57015`, `c53f5af6`, `220bc43a` — verified open + `track` after Batches 1, 2a, 2b, 3, 4, 6.
