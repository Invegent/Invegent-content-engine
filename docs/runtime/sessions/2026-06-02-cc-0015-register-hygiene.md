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

## Held / not executed this session

- Batch 2b (YouTube true-stuck `99dc50b6` / `0c92a8a9` tracked_done) — HELD pending CCD review of the carry-forward count change (option (a) adds a new tracking case → final 48 total / 14 open / 34 resolved). YouTube straggler carry-case NOT created.
- Batch 3 (observer_stale suppressed, 13) — not executed.
- Batch 4 (smoke resolve-ignored, 2) — not executed.
- Batch 6 (`f633c279` first triage) — not executed.

## Batch 2b carry-forward — verified straggler facts (for when 2b is cleared)

20 stale YouTube `post_publish_queue` rows, status `queued`, never published: NDIS-Yarns 10 (scheduled 2026-05-06 → 2026-05-21) + Property Pulse 10 (scheduled 2026-04-29 → 2026-05-14). Carry-forward mechanism = option (a): a separate tracked friction case `youtube.queue.stale_stragglers_cleanup` (cleanup decision pending: archive_stale vs requeue), created via `fn_emit_manual_event` then triaged to `track`/`quality_flag=true`/`next_review_at=2026-06-09` before the two YouTube true-stuck cases are resolved.

## Protected IDs (must remain untouched across all batches)

`26436794`, `877b7382`, `78afc70e`, `101935ba`, `53f3e533`, `2cf0cd4f`, `b7369dc9`, `22056313`, `6e148859`, `15d57015`, `c53f5af6`, `220bc43a` — verified open + `track` after both batches.
