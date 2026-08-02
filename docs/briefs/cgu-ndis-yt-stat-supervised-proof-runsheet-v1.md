# Run-sheet — NDIS YouTube `video_short_stat` supervised proof (PK decision #4)

**Authorizing decision:** PK 2026-08-02 (#4, `cgu-final-readiness-audit-result-v1.md` §6b): supervised
force-fill proof through the real pipeline; re-defer remains the named fallback.
**Precedent:** the PP 3-consecutive lane (`pp-youtube-three-consecutive-governed-stat-videos-result-v1.md`)
— slots force-filled early, every worker fired via its own cron `net.http_post` mechanism, zero code change.
**Tier:** T3 (production slot fill, real render, live PUBLIC publish). This run-sheet is the plan;
each ⛔ step is its own PK hard stop at execution time — decision #4 authorizes the lane, not the gates.

## Facts this plan is built on (live-read 2026-08-02 by the CGU audit)

- Cell classifies `ready`/`ready`/`reach=true`; winner `video_stat_reveal_9x16_v2` (NDIS assignment
  `aa2179eb-800e-4d0f-a323-925705942b73`, `visually_approved` 2026-07-20 CP-E, rung 6 ✓).
- NDIS is format-mix enrolled (v6.113) and the S7 guard passes YT `video_short_stat` (it was one of the
  4 proof-scoped cells).
- **Zero governed NDIS stat renders exist** — this lane produces the first (rung 7+8+9 in one supervised pass).
- `youtube-publisher` is schedule-blind: **an approved YT video draft auto-publishes PUBLIC within
  ≤30 min** — so the human gate sits BEFORE approval, not before "publish".
- Known failure modes to expect: 2-min render timeout (row-19 class; PP's #3 hit it 4/4 attempts —
  a failed draft is never auto-retried), and the voice path (stat template requires `VoiceAudio`
  fail-loud; NDIS voice config must pre-check clean).

## Steps

1. **Pre-checks (read-only, no gate):** publish profile healthy (`publish_enabled=true`, not paused);
   NDIS voice ID resolves (the `getBrand()` UUID-vs-slug defect class — verify the voice actually
   resolves for NDIS, not just that a config row exists); `select_template` winner re-read =
   `video_stat_reveal_9x16_v2`; `resolve_slot_assets` succeeds for NDIS (rung-4 check); pool has
   qualifying feed candidates.
2. **⛔ PK gate A — force-fill:** create/force-fill ONE NDIS YouTube `video_short_stat` slot (the PP
   precedent's early-fill shape). Exact SQL prepared at execution time against the live schedule; PK
   confirms before any write.
3. **Pipeline run (crons fire naturally or are triggered via their own `net.http_post`):** fill →
   ai-worker (authority pin holds `video_short_stat`) → draft created — **verify the draft lands
   UNAPPROVED and hold it** (do not let auto-approver move it if its policy would; if auto-approval
   is unavoidable for this path, pause the YT publish profile FIRST and fold the pause-lift into gate B).
4. **Render + audio gate:** video-worker renders; run the `_harness/audio_gate_v0/audio_gate.py`
   check (−40 LUFS floor) on the output. Render timeout → investigate/re-roll per PP precedent;
   a `failed` draft is terminal and needs manual reset (known gap, disclosed).
5. **⛔ PK gate B — the publish gate:** PK reviews the rendered video + audio verdict, knowing
   **approval = public YouTube publish within ~30 min**. PK approves (or rejects → lane records an
   honest FAIL and falls back to re-defer).
6. **Post-publish:** verify `m.post_publish` row + real `youtube_video_id`; record proof events via
   `record_tmr_proof_event` (`platform_publish` minimum; `supervised_render` optional) against
   assignment `aa2179eb…`; rung-12 promotion (`production_proven`) is a separate PK election.
7. **Close:** re-run the CGU re-run contract R1+R2 (audit doc §6) — the NDIS YT stat cell flips state-1;
   result doc + version-less pointer payload.

## Fallback

If any gate fails twice (render timeout persists, voice unresolvable, PK rejects), stop and take the
named fallback: **PK re-defers the cell to state-2** (Milestone 2 explicitly allows re-deferral) with
the failure evidence recorded — no forcing, no synthetic proof.
