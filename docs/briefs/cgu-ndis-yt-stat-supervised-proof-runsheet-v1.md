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

## Execution record (2026-08-02, appended live per PK instruction)

**Gate A confirmed by PK 2026-08-02 (~06:1x UTC "Gate A — proceed"). Four slots, three findings.**

| Attempt | Slot | Outcome | Cause |
|---|---|---|---|
| 1 | `c9150003-…0001` (scheduled-shape, window now, channel PAUSED first) | **skipped** `publish_path_disabled` at first fill tick (06:50Z), terminal | **Finding 1** below |
| 2 | `c9150003-…0002` (channel unpaused, same shape) | **skipped** `pool_thin;no_eligible_evergreen` (09:20Z): `pool_size_at_attempt=0`, 26 in scope | **Finding 2** below |
| 3 | `c9150003-…0003` (T0 manual branch, Grattan "$3.31 an hour?" source `09211020…`) | filled 09:40Z, pin held `video_short_stat`, synthesis succeeded, draft `d6c7e3e3…` — then **auto-approver REJECTED on the sensitive-keyword gate** (blocked keyword "royal commission"; all other gates passed) | Working as designed; **PK ruled: keep as honest evidence, do NOT approve/render** (Option B, 2026-08-02) |
| 4 | `c9150003-…0004` (T0 manual branch, health.gov.au "Technical experts to guide fairer, more consistent NDIS access" source `d8ddb949…`) | IN FLIGHT — same preserved chain: authority pin · channel pause (re-applied at fill) · Advisor→compliance→approval→governed render · no publish before PK's final verdict | — |

**Structural findings (all live-verified from function bodies/code, not inferred):**
1. **The publisher pause also blocks slot fill.** `m.fill_pending_slots` gates on `m.is_publish_eligible(client, platform)`, which reads the same `paused_until` the publish hold uses — so a channel paused for publish containment terminally skips its own fills (`publish_path_disabled`; skips never retry). The PP 3-consec precedent never hit this because it accepted auto-publish and never paused. Workaround used here: unpause → fill → re-pause (safe because `youtube-publisher` v1.17.0's fail-closed pause gate is re-checked at claim time, and no draft was in publishable state during any window). A future lane wanting fill-but-hold semantics has no single mechanism — worth a named T2 follow-up if supervised proofs recur.
2. **NDIS YT `video_short_stat` natural fills are fitness-starved.** `m.signal_pool.fitness_per_format` for vertical 11: 26 candidates in scope, ZERO at stat's `min_fitness_threshold=65` (`t.format_quality_policy`); NDIS stat fitness maxes at 40. A `ready`-classified cell that can never naturally fill — the supervised election (PK decision #4) was the only arriving path, and post-graduation natural production stays starved until pool fitness or policy changes. Named carry for the programme.
3. **The missing NDIS governance row was a hidden prerequisite — added.** `classify_format_capability` does not consult `c.client_creative_governance`, but BOTH the ai-worker v2.22.0 authority pin and video-worker's governed stat branch fail closed without an enabled `(client,'video_short_stat')` row — NDIS had none, so the "ready" cell's governed path was dead (the D4 discovery's mirror image). Inserted `c9150004-0000-4000-8000-000000000001` (mirrors PP's row shape: `contract_ref='ndis_yarns.video_short_stat.cgu_supervised_proof_v1'`, `declarative_registry_ref='ndis-yarns.json'`, `render_label='creative_library_video_stat_production'`, `enabled=true`) as a disclosed lane-prerequisite write; reversible (`enabled=false`/delete); only readers are the two worker gates (enabled-only) + tmr-drift-probe's daily sweep (already in the disclosed D2 `error` state).

## CLOSE-OUT — PUBLISHED, CELL STATE-1 (PK publish verdict, executed 2026-08-02 19:15Z)

Attempt 4 completed the full chain: draft `4d81324a…` ("NDIS Access Is Getting an Overhaul — Here's
Why", health.gov.au source `d8ddb949…`) — authority pin held (`schedule_authority_pin` recorded in
`draft_format.ai.format_reason`; advisor would have chosen kinetic) · compliance flags empty ·
auto-approver passed ALL gates incl. sensitive-keywords (`auto-agent-v1`, 10:20Z) · **governed render**
`ebfb44cf…`/creatomate `bf399d21…` in 43.9s (tmr winner `video_stat_reveal_9x16_v2`, governed
`bg_ny_accessible_pathway` + `ny_logo_full_colour`, voiceover + music bed) · **audio gate PASS
−18.3 LUFS / −6.6 dBTP** · PK reviewed the actual video and copy at Gate B and ruled **Publish** ·
pause lifted · published at the 19:15Z tick: **`m.post_publish` `9fb06e0a…`, YouTube `oCrtq6R9VFQ`**
(https://www.youtube.com/watch?v=oCrtq6R9VFQ), `queue_id=null` (direct-read path, as designed).

**One more mechanism note (4th finding):** `youtube-publisher` v1.14.0+ gates on `scheduled_for`
(release-date gate, shipped 2026-07-27) — the draft inherited the slot's future `scheduled_for`
(2026-08-03T13:00Z) and correctly WAITED; released by a CAS-guarded single-column update under PK's
"next tick" instruction. The historic "schedule-blind" claim is pre-v1.14 only (memory corrected).

**Proof events recorded** (PK instruction) against assignment `aa2179eb…`:
`c9150005-…0001` `platform_render`/passed (the supervised worker-path render — recorded as
`platform_render` because `supervised_render` is not in the `proof_type` CHECK vocabulary; substitution
disclosed in the row's own evidence text) · `c9150005-…0002` `platform_publish`/passed (the real
publish above). **Re-read confirms the NDIS × YouTube × `video_short_stat` cell is STATE-1**:
`classify=ready`, `overall_state=ready`, `reach=true`, live `platform_publish` proof event present.

**Governance evidence preserved (PK instruction):** rejected draft `d6c7e3e3…` ("$3.31" / Royal
Commission keyword rejection) untouched, plus the complete four-attempt record above. Channel pause
ended in its standing pre-lane state (`paused_until NULL`, containment reason string restored).
Rung-12 (`production_proven` promotion) deliberately NOT taken — a separate future PK election.

## Fallback

If any gate fails twice (render timeout persists, voice unresolvable, PK rejects), stop and take the
named fallback: **PK re-defers the cell to state-2** (Milestone 2 explicitly allows re-deferral) with
the failure evidence recorded — no forcing, no synthetic proof.
