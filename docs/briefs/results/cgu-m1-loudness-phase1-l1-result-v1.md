# Result — CGU Final Lane L1: M1 Loudness Measurement Phase-1 (build, undeployed)

**Seed:** control-tower "CONTROL-TOWER SEED — L1" (relayed 2026-08-06). **PK authorization:** given
directly in the orchestrator chat window, 2026-08-06 ("Yes, I authorized it — proceed with L1") —
per the standing control-tower-relay-mode-facts-only rule, the seed itself carried no authority; PK's
own words in this window are the actual grant.
**Governing ruling:** `docs/briefs/cgu-final-build-acceleration-ruling-v1.md` (v6.147) — isolated,
non-production implementation only.
**Design authority:** `docs/briefs/seeds/cgu-m1-loudness-measurement-design-v1.md`.
**Executed by:** Claude Code (orchestrator, direct — no ef-builder subagent invoked; work performed
directly inside an isolated `EnterWorktree` git worktree, functionally equivalent to the ruling's
"implementation in isolated branches" allowance).
**Worktree / branch:** `.claude/worktrees/cgu-l1-m1-loudness-phase1` /
`worktree-cgu-l1-m1-loudness-phase1` — never `main`, never the shared checkout.
**Completed:** 2026-08-06 Sydney.

---

## 1. Result status

`Complete` for the scope named in the seed (Phase 0 replay, Phase 1 undeployed implementation,
hermetic tests, this result doc). **Not complete / explicitly out of scope:** nothing has been
committed, applied, deployed, or activated — see §5.

## 2. Commit(s)

**N/A — nothing committed.** Per the harness's standing git-safety rule ("never commit unless
explicitly asked"), all work sits as uncommitted changes inside the isolated worktree. This is a
deliberate pause point, not an oversight — see §7.

## 3. Files changed (all inside the isolated worktree only)

- `supabase/functions/video-worker/qa.ts` — modified (additive: `loudness_lufs`, `true_peak_dbtp`,
  `loudness_measurement_status` fields)
- `supabase/functions/heygen-worker/qa.ts` — modified (mirrored, byte-identical per the file's own
  stated contract)
- `supabase/functions/video-worker/qa_test.ts` — modified (extended `FULL_KEYS` + 4 new M1 test cases)
- `supabase/functions/heygen-worker/qa_test.ts` — modified (mirrored)
- `supabase/functions/loudness-sweep/measure.ts` — **new**: pure decode+measure module
- `supabase/functions/loudness-sweep/measure_test.ts` — **new**: hermetic tests (5 cases)
- `supabase/functions/loudness-sweep/candidates.ts` — **new**: pure candidate-selection SQL
- `supabase/functions/loudness-sweep/candidates_test.ts` — **new**: hermetic tests (7 cases)
- `supabase/functions/loudness-sweep/index.ts` — **new**: undeployed EF entrypoint (`Deno.serve`)
- `supabase/functions/loudness-sweep/fixtures/real_voiced_sample.mp4` — **new**: small (114 KB)
  trimmed/downscaled real-render fixture for hermetic tests
- `supabase/functions/loudness-sweep/fixtures/silent_but_voiced_sample.mp4` — **new**: small (9 KB)
  synthetic silent-but-voiced fixture
- `supabase/migrations/NOT_APPLIED_m1_create_record_render_loudness_rpc.sql` — **new**: write-back
  RPC, author-only, filename deliberately non-timestamped so no apply tool sweeps it up

**Not tracked by git (gitignored `_harness/`, evidence/scratch only, will not ship):**
`_harness/audio_gate_v0/m1_phase0_sample/` — Phase-0 driver script, sample manifest, 20 downloaded
renders, the two probe scripts, and every generated report/table referenced below.

## 4. Actions taken

### 4.1 Phase 0 — 20-render replay (acceptance target's own "20-render sample" clause)

Pulled the 20 most-recent unique `succeeded`, `render_spec.qa.audio_expected=true` renders via
`execute_sql` (R1 — `storage_url`/`render_spec` are withheld from the `ice_ro.render_status` R0 view
by design, confirmed at `supabase/migrations/20260719150000_ice_ro_r0_views_and_confined_role.sql:53`),
spanning all 4 currently-live audio-expected formats (`video_short_avatar`, `video_short_stat`,
`video_short_stat_voice`, `video_short_kinetic_voice`) across both PP and NDIS Yarns clients. Ran the
existing proven `_harness/audio_gate_v0/audio_gate.py` (ffmpeg via `imageio_ffmpeg`) against all 20 +
one synthesized fixture.

**Fixture correction mid-run:** the first fixture attempt used `-an` (strip the audio track entirely),
which only re-proves what the EXISTING presence-only gate (`mp4HasAudioTrack` /
`AUDIO_STREAM_MISSING`, `video-worker/index.ts:723,992-993`) already catches. Corrected to mux in a
real (silent) `anullsrc` audio STREAM via `-map`, so the fixture has `has_audio_stream=true` but
inaudible content — the genuinely NEW catch M1's loudness gate adds on top of the presence gate.

**Result: 20/20 PASS, 1/1 fixture correctly FAIL.** Full table:

| render_log_id | ice_format_key | client_id | verdict | LUFS | true peak dBTP | reason |
|---|---|---|---|---|---|---|
| c27fc994-1128-48ac-bcfe-183c36a7718a | video_short_stat | n/a (smoke) | PASS | -24.82 | -8.94 | audible |
| a361b6e0-6b6c-4df6-8366-adf2e7b8d5e1 | video_short_stat | 4036a6b5… (PP) | PASS | -23.20 | -7.21 | audible |
| ebfb44cf-99e8-4fcd-ab78-b72922b0575e | video_short_stat | fb98a472… (NDIS) | PASS | -18.29 | -6.62 | audible |
| fb20756b-c8e3-4489-9daf-1e4986af6f9d | video_short_kinetic_voice | 4036a6b5… (PP) | PASS | -23.24 | -8.69 | audible |
| f9f2c5a8-758d-4f2a-89e8-774785f278b7 | video_short_avatar | fb98a472… (NDIS) | PASS | -15.91 | -4.27 | audible |
| 43c616c2-927f-4e6b-8d96-a9ede7a5f542 | video_short_stat_voice | 4036a6b5… (PP) | PASS | -22.79 | -7.61 | audible |
| dfcbec28-3c33-43dd-a3b7-7ce91d2773b3 | video_short_stat | 4036a6b5… (PP) | PASS | -26.38 | -8.72 | audible |
| e9c67316-01ec-4532-90c7-dce9e698d573 | video_short_avatar | fb98a472… (NDIS) | PASS | -16.16 | -4.29 | audible |
| 317babbd-95fc-4a0d-bf58-99839c4acd24 | video_short_avatar | fb98a472… (NDIS) | PASS | -16.05 | -3.90 | audible |
| 243aeced-0418-404e-83e3-a5a2b595f06d | video_short_stat_voice | 4036a6b5… (PP) | PASS | -23.72 | -7.72 | audible |
| 12cc38ff-fbd1-4406-beb0-991814b51786 | video_short_avatar | fb98a472… (NDIS) | PASS | -15.96 | -4.13 | audible |
| b97f072a-10e3-454e-9438-3493c9894201 | video_short_kinetic_voice | 4036a6b5… (PP) | PASS | -23.28 | -8.02 | audible |
| 9c0a95b7-95c4-4e3c-ad7b-d2b41364d54d | video_short_avatar | fb98a472… (NDIS) | PASS | -15.86 | -4.07 | audible |
| 458a4c99-5bb2-415c-aca1-80233c3976b1 | video_short_avatar | fb98a472… (NDIS) | PASS | -16.29 | -4.14 | audible |
| 40445f36-d6ce-4f3f-b34f-44fa4171d938 | video_short_kinetic_voice | 4036a6b5… (PP) | PASS | -24.05 | -7.43 | audible |
| b22c467c-ec81-4745-84e2-f70904aefa64 | video_short_stat_voice | 4036a6b5… (PP) | PASS | -23.30 | -7.58 | audible |
| ba190b2a-7683-4bd8-b949-112028822c75 | video_short_stat_voice | 4036a6b5… (PP) | PASS | -22.91 | -6.52 | audible |
| 6cbf9707-722f-4f80-9014-57037be49d58 | video_short_kinetic_voice | 4036a6b5… (PP) | PASS | -22.75 | -8.26 | audible |
| 046026ac-3490-4a1d-8e9a-f88cea49bfde | video_short_stat_voice | 4036a6b5… (PP) | PASS | -24.37 | -9.36 | audible |
| 678b5bf0-6496-416c-9881-0cdcf9c082c2 | video_short_stat_voice | 4036a6b5… (PP) | PASS | -22.72 | -7.97 | audible |
| SYNTHETIC_FIXTURE (real audio stream, true digital silence) | silent_but_voiced_probe | n/a | **FAIL** | -- | -- | `loudness_non_finite_silent` |

Range: **-15.86 to -26.38 LUFS.** Note vs. design doc §2's cited prior 4-render calibration band
(-19 to -26 LUFS): the 6 `video_short_avatar` (HeyGen) renders sit noticeably louder, -15.86 to
-16.29 LUFS — a real, not-previously-calibrated engine-level difference worth carrying into M2's own
acceptance-floor decision (design doc §9), not a defect in this replay.

### 4.2 Resolved design-doc TBC — pure-Deno/WASM EBU R128 feasibility (open question #3)

The seed explicitly asked to resolve "measurement-service choice vs pure-Deno/WASM EBU R128
feasibility, with evidence." Found and empirically proved a complete pure-JS/WASM pipeline:

- **`@audio/decode-aac`** (FAAD2 compiled to WASM, MIT, no dependencies, ~400 KB unpacked) — a
  self-contained M4A/MP4 demuxer + AAC decoder: `decode(mp4Bytes) → {channelData, sampleRate}`. Closes
  the actual hard part (container demux + audio decode) that ffmpeg was originally used for.
- **`@audio/loudness-lufs`** (pure JS, no WASM even needed, ITU-R BS.1770-4, EBU Tech 3341-verified per
  its own header) — `lufs(channelData, {fs}) → LUFS | null`, `null` on silence/fully-gated input (the
  exact fail-closed "silent-but-voiced" catch).
- **`@audio/loudness-truepeak`** (pure JS, 4×-oversampled inter-sample peak, BS.1770-4 Annex 2) —
  `truepeak(channelData, {fs}) → dBTP`.

**Cross-validated against the proven ffmpeg-based harness across all 20 real Phase-0 renders + the
silent fixture**, run locally via `deno run npm:@audio/decode-aac ...` (Deno 2.6.5, confirmed
installed in this environment):

- 20/20 real renders: both tools agree on PASS; **max |LUFS delta| = 0.749** (one outlier — see §6),
  median delta well under 0.1 LUFS, 15/20 files under 0.15 LUFS.
- Silent-but-voiced fixture: both tools correctly fail-closed (ffmpeg → `loudness_non_finite_silent`;
  pure-Deno `lufs()` → `null`).
- Decode+measure latency: 150 ms–500 ms per file for the small trimmed fixtures used in the committed
  test suite, up to ~17 s for full-length real downloads in the throwaway probe run — well inside any
  Edge Function per-invocation budget for a small batch.

Full per-file cross-validation table: `_harness/audio_gate_v0/m1_phase0_sample/cross_validation_table.md`
(local evidence, gitignored). Probe script (throwaway, not part of the shipped implementation):
`_harness/audio_gate_v0/m1_phase0_sample/probe_pure_deno_lufs.ts`.

**Verdict on design doc §5/§10.3: Option A is NOT "unexplored" — it is now proven feasible**, and this
changes the Phase-1 recommendation: build **Option C′ (revised)** — keep Option C's async-sweep-EF
architecture (still correct given §4's 2-minute-poll-ceiling wall-clock finding, which is about WHEN
to measure, not HOW) but **replace the external measurement-service HTTP call with an in-process
pure-Deno decode+measure**. This also **dissolves open question #2** (hosting choice for an external
service) — there is no longer an external service to host.

### 4.3 Phase 1 — sweep implementation (undeployed)

- **`qa.ts` (both workers, byte-identical):** added `loudness_lufs`, `true_peak_dbtp`,
  `loudness_measurement_status` as optional `RenderQaInput` fields, additive per the module's own
  "NEVER blocks publish" contract. `loudness_measurement_status` defaults to `'pending'` when
  `audio_expected=true` and stays `null` otherwise — **zero call-site changes needed in either
  `index.ts`**, since `audio_expected` is already passed at every existing call site. This makes
  "not yet measured" observable (design doc §6) with the smallest possible footprint.
- **`record_render_loudness` RPC** (`NOT_APPLIED_m1_create_record_render_loudness_rpc.sql`): shape
  mirrors the live `record_music_usage` definition (pulled read-only via `pg_get_functiondef`,
  `SECURITY DEFINER`, `SET search_path TO ''`, `PUBLIC`/`anon`/`authenticated` revoked,
  `service_role`-only grant — confirmed live grants match this exact pattern). Differs materially:
  jsonb-**merges** into the existing `render_spec.qa` object (`COALESCE(...) || jsonb_build_object(...)`
  under `FOR UPDATE`) rather than inserting a new row, since there is no new table. Guards:
  `p_render_log_id` required, `p_status` must be one of `measured|unmeasurable|error`, and
  `p_status='measured'` requires a non-null `p_loudness_lufs` — the exact ambiguity design doc §6 was
  written to prevent, enforced at the DB layer, not just in application code.
- **`loudness-sweep/measure.ts`** (pure): wraps the proven pure-Deno pipeline, fail-closed by
  construction — `decode` throw → `'error'`; empty channel data → `'unmeasurable'`; null/non-finite
  LUFS → `'unmeasurable'`; only a real numeric LUFS → `'measured'`. Never a silent `'measured'` without
  a value (mirrors `record_render_loudness`'s own DB-side guard).
- **`loudness-sweep/candidates.ts`** (pure, SQL-text-only): the candidate-selection predicate
  (`succeeded` + `audio_expected=true` + still-`pending`, oldest-first). Deliberately does NOT decide
  how the sweep EF's role gets read access to `m.post_render_log` — that grant-path choice is left
  open (§6).
- **`loudness-sweep/index.ts`**: the only file with `Deno.serve` (mirrors `creatomate_submit.ts`'s own
  stated reason for keeping side-effect-free sibling modules importable from tests). Calls a
  **placeholder** RPC name (`exec_readonly_loudness_candidates`) for the candidate read, explicitly
  flagged in-code as undecided — see §6.

### 4.4 Hermetic tests

38/38 passing (`deno test --allow-read --allow-net --allow-env`, `--allow-net`/`--allow-env` needed
only for `npm:` module resolution, not any runtime network/env access):

- `qa_test.ts` ×2 (byte-identical): 13 tests each — extended the pre-existing `FULL_KEYS` shape
  assertion (was about to silently start failing against the additive change — caught and fixed, see
  §6) + 4 new M1-specific cases (pending-default, non-audio stays null, undefined-input stays null,
  explicit-value passthrough).
- `candidates_test.ts`: 7 tests, pure string assertions on the SQL predicate.
- `measure_test.ts`: 5 tests against the two small committed fixtures — real-render → measured with
  plausible values; silent-but-voiced → `unmeasurable`, never `measured`; garbage bytes / empty buffer
  → fail-closed, never throws to the caller; and an explicit invariant test that `status==='measured'`
  never coexists with a null LUFS value across all three fixture cases.

All touched/adjacent modules also pass `deno check` (`loudness-sweep/*.ts`, both `qa.ts`, and — as a
regression check — the pre-existing `video-worker/index.ts` and `heygen-worker/index.ts`, unmodified,
confirmed still clean after the `qa.ts` additive change).

## 5. Constraints confirmed (ruling's prohibited list, verbatim)

- Phase-2 schedule/cap DML — not touched.
- Production database migrations — **none applied**; the one migration authored is filename-flagged
  `NOT_APPLIED_*` and was never passed to `apply_migration`.
- Live selector/palette/routing/voice-config changes — not touched.
- Production worker deployment or cron activation — **none**; `loudness-sweep` was never passed to
  `deploy_edge_function`; the intended cron registration is a commented-out SQL block inside the
  `NOT_APPLIED_*` file, never executed.
- Asset intake/promotion affecting live selection — not touched.
- M11 governance — not touched.
- Schedule-watch evidence — not touched; every DB interaction this lane performed was a read
  (`execute_sql` SELECTs + `db-read.py` catalog reads) against `m.post_render_log` /
  `information_schema` / `pg_proc`, zero writes.
- Work stayed inside the isolated worktree/branch; `main` and the shared checkout were never entered.

## 6. Open issues

1. **One 0.749 LUFS cross-validation outlier** (`dfcbec28…_stat_governed.mp4`: ffmpeg -26.38 vs.
   pure-Deno -25.63). Both land solidly PASS against any reasonable floor and the verdict never flips,
   but this is larger than the ~0.03–0.15 LUFS agreement on the other 19 files and is unexplained —
   worth a follow-up before `loudness_measurement_status` is ever promoted to a publish-blocking gate
   (design doc §6 Phase 2, an explicit future PK decision, not decided here).
2. **Supabase Edge Runtime execution unverified.** The pure-Deno pipeline is proven in the local Deno
   2.6.5 CLI; it has NOT been proven inside the actual Supabase Edge Function sandbox (`npm:` specifier
   resolution, WASM instantiation, and memory/cold-start behavior under that specific runtime are a
   residual gap). Closing this requires either a local `supabase functions serve` smoke (no live
   deploy) or a first real invocation at apply time — named as the first thing Gate-2 review should
   ask for.
3. **Candidate read-path grant is undecided** (design doc §8's own open item, still open):
   `index.ts` calls a placeholder RPC (`exec_readonly_loudness_candidates`) that does not exist. A real
   apply packet must choose between (a) a new narrow `SECURITY DEFINER` read RPC mirroring the `ice_ro`
   pattern, or (b) a scoped grant on the sweep EF's own role. Not decided here.
4. **Batch size (10) and cron cadence (15 min, in the commented-out registration) are placeholders**,
   not sized against the real backlog — noted explicitly in-file, needs sizing against actual
   production render volume at apply time.
5. **`_harness/audio_gate_v0/audio_gate.py` itself is not tracked in git** (pre-existing, not
   introduced by this lane) — this worktree only had it because `_harness/` in the ORIGINAL checkout
   is untracked-but-present; a fresh `git worktree add` does not inherit untracked files, so it had to
   be copied in by hand to run Phase 0 at all. Minor repo-hygiene note, not this lane's to fix.
6. **`record_music_usage`'s migration file is not findable in git** by the name the design doc cites
   (`20260710121423_create_record_music_usage_rpc.sql`) — consistent with the standing
   `migration-ledger-git-drift` memory finding. Worked around by reading the live definition via
   `pg_get_functiondef` (read-only) rather than trusting the cited path.

## 7. Next recommended step

Nothing has been committed. Recommend, in order: (a) PK/control-tower reviews this result doc and the
diff in place inside the worktree; (b) if acceptable, an explicit instruction to commit to the isolated
branch (still not `main`, still zero risk to shared state) so `branch-warden` + `db-rls-auditor` can run
their standing Gate-2 review against a real commit; (c) close open items #2–#4 above as part of that
review, not as a blocker to committing the current state. Per the seed's own deliverable bar, no further
AUTHORING should be needed after that — only review + the PK-run apply/deploy gate.

---

## 8. Verification (chat fills this)

**Verdict:** `Pass with notes`

**Notes:**

- Output matches the seed's four numbered scope items: Phase-0 20-render replay + silent fixture ✅;
  Phase-1 sweep EF + write-back RPC as `NOT_APPLIED_*` + `qa.ts` dark-write contract exactly per
  design ✅; hermetic tests (measurement parsing, fail-closed branch, dark-write shape) ✅, all
  green, zero live DB writes; this result doc + open-question naming ✅.
- Constraints respected: confirmed in §5 against the ruling's verbatim prohibited list.
- Unexpected files changed: none beyond the additive `qa.ts`/`qa_test.ts` pair and the new
  `loudness-sweep/` directory + one `NOT_APPLIED_*` migration.
- Success criteria: Phase 0's 20-render + silent-fixture acceptance target met; Phase 1's dark-write
  contract matches design doc §6/§8 exactly; the seed's own explicit ask (resolve the pure-Deno
  feasibility TBC "with evidence") was resolved with a real, cross-validated proof rather than an
  opinion.
- New risks: none beyond the six named open issues, all non-blocking to a review gate.
- "Notes" (not a clean Pass) because of the genuinely-open residuals in §6, none of which are
  regressions this lane introduced — they are the honest remainder after resolving the TBC the seed
  actually asked to resolve.

## 9. Learning notes (chat fills this)

- **Fresh isolated worktrees do not inherit untracked files.** `_harness/audio_gate_v0/audio_gate.py`
  — a load-bearing, already-proven tool the design doc leans on — was invisible in the new worktree
  until copied by hand. Any future lane depending on `_harness/` content should expect this.
  Reusable pattern: `git status --porcelain` in the ORIGINAL checkout before starting a worktree lane,
  to know what won't come along automatically.
- **A pure-additive schema change can silently break an existing shape-assertion test.** The
  pre-existing `qa_test.ts`'s `assertEquals(Object.keys(qa).length, FULL_KEYS.length, ...)` started
  failing the moment 3 new keys were added to `buildRenderQa`'s output, even though the change was
  genuinely additive/non-breaking at the type level. Reusable pattern: any additive change to a shape
  a test enumerates exhaustively needs that test updated in the SAME commit, not left for a later
  "oh that broke" discovery.
- **The seed's own ask ("resolve X with evidence") was answerable more decisively than the design doc
  anticipated** — a 2022-vintage npm package (`ebur128-wasm`) led to the actually-used, more recent
  (`@audio/*` scope, first published 2026-07-11) family that turned out to close BOTH the container-
  decode gap and the loudness-math gap with zero native dependencies. Worth remembering for future
  "is X feasible" design questions: check npm/jsr registry state directly rather than trusting a
  multi-month-old design doc's "not found in this repo" as the last word — it explicitly invited this
  ("a future design pass could close this rather than accepting the current-code comment as the last
  word", design doc §10.3).
