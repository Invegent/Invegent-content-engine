# Creatomate Video — Production Reliability Outcome (Result)

> **Outcome (PK 2026-07-27):** every scheduled Creatomate video must (1) fail closed when audio is inaudible, (2) visibly retry or recover after a render timeout, and (3) publish only at its authorised release time.
> **Completion proof (PK):** a silent render, a timed-out render, and a future-dated render are each handled correctly without manual rescue or unintended publication.
> **Status:** **All 3 fixes DEPLOYED + deploy-verifier PASS.** Predecessor: `docs/briefs/results/pp-youtube-three-consecutive-governed-stat-videos-result-v1.md` (Phase 1, which surfaced all three gaps).

---

## The three fixes (all live)

| # | Requirement | Fix | Evidence |
|---|---|---|---|
| 3 | Publish only at authorised release time | **`youtube-publisher` v1.14.0** (F-YT-RELEASE-CONTROL) `6fedabb` | SELECT gates `.or(scheduled_for.is.null,scheduled_for.lte.<now>)` + per-row `skipped_not_yet_scheduled`. **deploy-verifier PASS**; live SQL-validated (withheld the 1 real future-dated draft, 0 regression / 0 leak). |
| 2 | Timed-out renders retry/recover visibly | **`video-worker` v3.12.0** (F-VIDEO-RENDER-RETRY) `ad93fec` | Timeout/transient → `classifyRenderFailure` → stays `pending` + `video_render_attempts`/`video_retry_after`/`video_last_error` (bounded cap 3 → terminal `max_render_attempts:3/3`). **deploy-verifier PASS**; **LIVE-PROVEN** — draft `452f58b9` timed out → stayed `pending`, attempt 1/3, 10-min backoff, error recorded (not silent terminal). |
| 1 | Silent output fails closed | **`video-worker` v3.14.0** (F-VIDEO-AUDIO-FAILCLOSED, **PK option A**) `a0ab233` | Deno-native (ffmpeg can't run in an EF): pre-render `assertAudioSpec` + post-render `mp4HasAudioTrack` (soun byte-scan), enforced **only when `specHasAudio`** (audio was intended) so by-design-silent kinetic is EXEMPT. Both errors terminal. **deploy-verifier PASS**; `deno check` + **128/128** incl. 3 integration tests (spec-with-audio+no-soun → fail closed; spec-no-audio → exempt; spec-with-audio+soun → pass). |

## Key decisions + findings

- **Option A (PK):** fail-close only *audio-expected* renders. Measured live that PP `video_short_kinetic` is silent-by-design (music env-gated off, no voice) and legitimately publishing — option A exempts it (visible `audio_check_skipped:no_audio_in_spec` log) while catching a voice/stat render that *lost* its intended audio. **Phase B (true integrated-LUFS probe) is a separate later lane** — it closes the Phase-A residuals (present-but-too-quiet, and the false-exempt upstream-spec-bug edge).
- **Concurrency hardening landed in parallel:** the `task_5064b70c` ticket (video-worker pending-select had no row lock → concurrent double-render) was built + landed by a separate session as **v3.13.0** (`ca2a407`, `claim_pending_video_drafts` + migration `20260727120000_video_render_claim_rpc.sql`). Fix #1A rebased on top of it (→ v3.14.0); deploy-verifier confirmed the claim markers survived (not reverted).
- **Real event during rollout:** future-dated draft `f8da4b1a` (07-28 slot) published ~23h early (`sBayD9c-8Uw`) on a publisher tick in the gap *before* the v1.14.0 release gate went live — pre-fix behaviour, won't recur; deletable at PK's discretion.

## Completion-proof status — full live demo run 2026-07-27

- **Future-dated render → not published:** ✅ **PROVEN LIVE.** Constructed a future-dated (2027-01-01) YouTube draft matching *all* non-date publisher predicates, triggered the deployed publisher across 2 runs over ~40s → stayed `generated`, no `youtube_video_id`, **0 publish rows, untouched** (only the release gate could have withheld it). Test draft then deleted.
- **Timed-out render → visibly retries:** ✅ **PROVEN LIVE** (`452f58b9`: real 2-min timeout → stayed `pending`, `video_render_attempts=1`, 10-min backoff, error recorded — no manual rescue). **Terminal-recovers-visibly side ALSO proven live** during the demo: a genuine bad-input render (`missing_or_invalid_video_script_scenes`) classified `terminal:render` and was **not** retried (fail-fast with a clear reason, not a silent stuck slot).
- **Silent render → fails closed (audio-expected) / exempt (by-design):** ✅ deployed + **integration-tested** through `renderUploadAndLog` (both the enforcement *and* the option-A exemption) + deploy-verifier-confirmed (`audio_check_skipped` marker live in the bundle). A live end-to-end render of the *kinetic exemption* could **not** be cleanly staged: the Advisor overrides a kinetic slot to a voiced format (no kinetic pin), and manually forcing `recommended_format=video_short_kinetic` onto voice-generated content trips the unrelated pre-audio validation `missing_or_invalid_video_script_scenes` before the audio guard runs. The exemption behaviour therefore rests on the 3 integration tests + the deployed marker, not a live render. (The natural next Mon/Tue kinetic will exercise it live in production and should emit `audio_check_skipped`.)

**Deploy discipline every fix:** ef-builder (isolated worktree) → branch-warden → external ChatGPT review (each escalated on judgment/edge/policy, none on a concrete code defect) → PK gate → merge/push (lane→origin/main directly, never disturbing concurrent lanes' unpushed work) → drift refresh B-FD → `safe-deploy --allow-warn` **from the worktree** → re-refresh → deploy-verifier PASS. All three now sit at benign `A-LE` (repo==deployed; next deploy of either EF needs an A-LE→B-FD cosmetic reclassification).

## Non-claims

- Phase A audio guard is a byte/spec heuristic, NOT loudness measurement; a present-but-too-quiet render (or a voice-format render whose spec lost its audio element upstream) is NOT caught here — **Phase B LUFS probe is the real audibility gate** and remains to be built.
- No schema change in fixes #1A/#2/#3 (state via existing `video_status`/`draft_format` + throw→catch, and an existing `scheduled_for` column); the only migration in scope was the separate v3.13.0 concurrency-claim lane.
