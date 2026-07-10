CLAIMED v5.45 · cc-0032-combo-audio-enabled-live (consolidated night terminal) · main-checkout C:\Users\parve\Invegent-content-engine · gate: PK flip authorized+proven → register commit (pending PK) · 2026-07-10T04:25Z

# Result — cc-0032 step 5: governed PP video combo audio (VO + music bed)

**Completed:** 2026-07-10 Sydney
**Brief:** `docs/briefs/cc-0032-step5-governed-combo-branch-build-brief.md` (Gate-1 approved 2026-07-09)
**Lane:** PRODUCT_PROOF · **Tier:** T2 build → T3 deploy (Convention-2 sequence)
**Outcome:** ✅ **PK VISUAL + AURAL PASS (2026-07-10)** — first governed Property Pulse combo-audio video PROVEN. Ships **DARK** (`enabled=false`); the `enabled=true` production flip is a SEPARATE gate PK holds.

---

## 1. PK verdict (the deciding act)

**PK watched and listened to the smoke render and verdicted PASS — visual + aural — on 2026-07-10.**

- **render_log_id:** `485571c5-b35f-46be-8843-9172a38fb8fa`
- **creatomate_render_id:** `e6e377a3-7659-4efc-9f98-f97ac1cd8935`
- **artifact:** `post-videos/_smoke/governed_video_stat_v1.mp4` · **sha256 `de598f2d2729ff86ae27956f902d985ddd63ce438528f60c8e2c9abbe0ac808a`**
- **duration 12.00 s · audio stream PRESENT.**
- **Loudness carry CLOSED by this verdict:** the music bed at **70%** is right in the mix — the first-estimate level is accepted, not a tune-later. No further bed-level work pending.

## 2. Deploy facts (verified)

- **Deployed version:** `video-worker-v3.6.0` (GET banner).
- **`verify_jwt = false`** — unauthenticated GET returns HTTP 200 JSON (a `verify_jwt=true` function would 401). `config.toml` pins `[functions.video-worker] verify_jwt=false` (lines 56–57); the CLI honoured it without the `--no-verify-jwt` flag.
- **Audio (ffmpeg on the accepted mp4):** two streams — **video `h264` 1080×1920 @30fps** + **audio `aac (LC)` 48 kHz stereo 263 kb/s**; **`mean_volume −26.8 dB`, `max_volume −7.5 dB`**; duration 12.00 s. (Independent MP4-box parse confirmed 2 `trak` boxes, handlers `vide`+`soun`, `mp4a`/`esds` present; dimensions **1080×1920** per ffmpeg.)

## 3. What shipped (v3.5.0 → v3.6.0, three files)

- **`b1_video_stat.ts`** — governed direct-bind re-pointed to the registered v2 template **`c11bb8ab`** (variant `stat-reveal-9x16-video-v2`, VoiceAudio + MusicBed slots); `901a30ce` stays the silent v1 baseline. New pure `composeGovernedVideoNarration` (concise VO from stat_label + stat_value + context_line; **CTA is NOT spoken** — stays visual, D3/N2). `buildGovernedVideoStatPlan` gains `voiceUrl` (REQUIRED, throws `b1_video_missing_voiceover`) + `musicBedUrl` (N1). **MusicBed.source is ALWAYS a modification key** (presence is the guard); **MusicBed.volume is NEVER set** (N3, template-controlled 70%).
- **`index.ts`** — `resolveGovernedMusicBedUrl` calls `public.select_music(p_scope_kind='format', p_scope_value='video_short_stat')` (RETURNS TABLE); empty result set → `''` (silent bed, N1); **an RPC error THROWS `b1_video_missing_music_rpc` (fail loud — no swallow)**. Rewired `renderGovernedVideoStat` + the `governed_video_stat_smoke` entrypoint (compose narration → generate VO via existing `generateAndUploadVoice` → resolve bed → bind both). `renderUploadAndLog` and every legacy path (isKinetic/isStat/_voice, MUSIC_LIBRARY/resolveMusicUrl) byte-unchanged.
- **`b1_video_stat_test.ts`** — 68/68 green (deno check clean); covers narration, plan shape, the audio-key invariants (R0/R1/R2), and fail-loud voiceover.

Contract note: the `select_music` RPC is the **TMR Music Lane's** artifact (packet `cc-0032-select-music-rpc-t3-design-packet.md`); this lane owns only the CALLER, which conforms to it.

## 4. The drift-gate finding (a real generalisable lesson)

The `safe-deploy.sh` A-LE block was **cleared by PUSHING, not by lifting a deny.**

- `drift-check` reads `GITHUB_REF="main"` from **GitHub**, not local disk. So while `eae380e` was committed-but-unpushed, `drift-check` still saw repo == deployed == v3.5.0 → class **A-LE** ("in-spec, redeploy unnecessary"), which `safe-deploy.sh` hard-blocks with no override flag. **An unpushed commit can NEVER clear an A-LE block.**
- Pushing `eae380e` (`0e0560f..eae380e`, parity 0/0) made GitHub `main` = v3.6.0. Re-running `drift-check` (**note: writes only with `?write=true`**; default is dry-run) reclassified video-worker as **B-FD / forward-drift** (repo 3.6.0 vs deploy 3.5.0). `safe-deploy.sh video-worker --allow-warn` then passed and deployed.
- **The v3.5.0 deploy-deny-lift precedent was a workaround for an unpushed commit — not a necessity.** For this deploy **no deny-lift was needed or used.** The correct move for a repo-ahead deploy is: push → refresh drift → `--allow-warn`.

## 5. Governance-selection evidence — why audio-present is now sufficient

- **`render_spec.template` carries NO `modifications` key** (verified on the live row `485571c5`: keys are `tmr, provider, variant_key, contract_ref, resolver_used, fallback_taken, implementation_id, provider_template_id`). `composeRenderSpec` emits the worker's `templateSpec` verbatim — **it is the worker's self-report and never records what modifications Creatomate actually received.** It cannot prove which bed (or whether a bed) was bound.
- Because **PK blanked the template's baked `MusicBed.source`** (verified provider API, `2026-07-10T02:09:09Z`), the eligible bed can now reach a render ONLY through a worker-bound `MusicBed.source`. Therefore **audio-stream-present is the decisive evidence that governance selected the track** — the system was made to fail honestly rather than instrumented around. The smoke returned `music_bed: true` (`select_music` returned Drifting Piano and the worker bound it), and the mp4 carries an audio stream. `GET /v1/renders/{id}` remains available as optional provider-side confirmation but is no longer load-bearing.

## 6. Sequence executed (Convention-2, all STOPs honoured, none tripped)

1. branch-warden **safe** (main `0e0560f`/parity 0/0; staged set = exactly the 3 files; no sweep).
2. `deno test` **68/0** → commit **`eae380e`** (3 files) → ff-merge to main → **push** (parity 0/0).
3. `drift-check ?write=true&slug=video-worker` → **B-FD** → `safe-deploy.sh video-worker --allow-warn` → **deployed**.
4. GET → **v3.6.0 · verify_jwt=false**.
5. `governed_video_stat_smoke` → one `m.post_render_log` row (`485571c5`, **null draft/client**, succeeded); no publish/flip; `enabled` stayed FALSE (baseline 4 → 5 null-draft/client rows, exactly +1).
6. Audio proof (§2) → **PK verdict PASS** (§1).

## 7. Pre-flip risk measurement (read-only; nothing changed)

The smoke used hardcoded sample fields, so the **AI-authored narration path was unexercised**. `composeGovernedVideoNarration` is bounded in practice by the AI prompt (`context_line` target ≤75) but the hard gate permits 160, and **nothing in code measures TTS duration against the 12 s template**. Measured over the **18** real PP `video_short_stat` drafts that exist:

| composed narration chars | value |
|---|---|
| min / avg / median / p90 / max | 110 / 119 / 117 / 125 / **135** |
| over 170 (~12 s @ 14 cps) · over 190 (~12 s @ 16 cps) | **0 · 0** |
| `context_line` max · over-prompt-75 · over-gate-160 | 73 · **0** · **0** |

Every real draft composes to 110–135 chars — essentially the length of the PK-approved smoke narration (~130), ≈8–10 s of speech, comfortably inside 12 s. Zero overruns; the gate-vs-prompt gap (160 vs 75) is unrealized (max real `context_line` = 73). **Character proxy, not measured TTS duration** — but the distribution plus the approved anchor make overrun unlikely. Narration length does **not** block the flip. (Standing gap for a future lane: no code check of TTS duration vs template.)

## 8. State & rollback

- **Live:** v3.6.0 deployed, governed combo branch **DARK** (`c.client_creative_governance.enabled=false`, fail-closed). `main` pushed at `eae380e`, parity 0/0. `select_music` live, service-role-only.
- **Rollback:** redeploy `video-worker v3.5.0` (commit `cec3569`, deployed hash `70d1c063…`). Governed branch is dark, so a worker rollback is behaviour-neutral for live traffic.

## 9. Non-claims / open

- **No claim of `enabled=true` readiness.** That flip is a separate PK gate (its own T3: flip → live production render proof), explicitly out of scope here.
- No register pointer cut (per PK instruction). No publish, no draft mutation, no flip performed.
- Carry: brief `cc-0032` §2 still says `approved` (should be `approved_scoped`) — text fix pending.
- Carry: the merged isolated worktree `agent-a7763fffaaee8fd01` can be cleaned up; the superseded `_harness/video_tmr/select_music_v1_rpc_DRAFT.sql` stays untracked (history only).
