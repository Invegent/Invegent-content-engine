# PP YouTube — Three Consecutive Governed Stat Videos + Fail-Closed Audio Gate (Result)

> **Lane:** repeatability proof of the schedule→governed video golden path across a SEQUENCE, + a fail-closed audio-quality gate · **Tier:** T3 (production writes: slot fill, real renders, live publish) · **Status:** **PK-ACCEPTED as proof of governed single-scene stat-video production (2026-07-27).** 2 of 3 delivered + verified + published; authority (pin) proven on all 3; #3 render-timeout NOT further investigated per PK — rolls into the next outcome (Production Reliability).
> **Predecessor:** `docs/briefs/results/schedule-driven-governed-video-goldenpath-result-v1.md` (v6.30, the single-render proof).
> **Outcome target (PK):** three *consecutive* scheduled PP YouTube videos with verified audible voice/music, correct governed template selection, publish-ready quality; silent/inaudible must FAIL the quality check.
> **PK dispositions this session:** (1) render + audio-verify (publish accepted — "let it publish; it's a quality issue, I can delete myself"); (2) sequence = 3 weekly `video_short_stat` slots (07-30 + 08-06 + 08-13).

---

## 1 · Fail-closed audio gate (built + validated)

`_harness/audio_gate_v0/audio_gate.py` — measures real EBU R128 **integrated LUFS + true peak** via the bundled ffmpeg `loudnorm` pass (`imageio_ffmpeg` v7.1; no host ffmpeg needed). **Only** PASS path = an audio stream present AND integrated LUFS ≥ floor; every uncertain path (no stream · non-finite/silent · below floor · parse/exec error) fails closed. **Recommended floor: −40 LUFS** (real governed content clusters −19…−26; documented near-silent batch ~−58; ≥14 LU margin).

All four verdict branches proven:

| Case | Measured | Verdict |
|---|---|---|
| known-silent (no audio track) | no stream | **FAIL** `no_audio_stream` |
| synth present-but-silent (−52 dB) | non-finite | **FAIL** `loudness_non_finite` |
| synth finite-but-quiet (−30 dB in) | −51.9 LUFS | **FAIL** `below_floor` |
| real governed renders | −19…−26 LUFS | **PASS** |

Also **re-checked the v6.30 proof render honestly**: `db67b61c` measures **−25.8 LUFS with a real audio track** — genuinely audible, not a silent render behind a presence-only scan.

## 2 · Schedule-authority repeatability — PIN FIRED ON ALL THREE

The three consecutive weekly PP YouTube `video_short_stat` slots (Thursdays 07-30 / 08-06 / 08-13). For all three, the v2.22.0 pin held the schedule choice past the Advisor → `recommended_format = video_short_stat` → governed `select_template` path. The authority half is **repeatable, not a one-off**.

| # | Slot date | Slot id | Draft id | `recommended_format` (post-pin) | Render | Audio gate | Published (public YT) |
|---|---|---|---|---|---|---|---|
| 1 | 2026-07-30 | `a157f5bb` | `db67b61c` | video_short_stat ✅ | succeeded | **PASS −25.8 LUFS** | `XPQ26cF9sBA` (07-26 11:45) |
| 2 | 2026-08-06 | `b5d415f0` | `4dcd3c86` | video_short_stat ✅ | succeeded | **PASS −26.4 LUFS** | `oHDyazW1isQ` (07-27 01:15) |
| 3 | 2026-08-13 | `c1f38536` | `452f58b9` | video_short_stat ✅ | **FAILED — render timeout** | n/a (no render) | no (contained) |

Slots #2/#3 were created + force-filled early (mirroring how `a157f5bb` was filled ~4 days early for the v6.30 proof); pool was healthy (198 qualifying candidates). Pipeline driven via each worker's own cron `net.http_post` (fill → ai-worker → auto-approver → video-worker → youtube-publisher). No code/schema/deploy change — v2.22.0 pin already live.

## 3 · Publish reality (corrects the v6.30 record)

`youtube-publisher` is a **schedule-blind direct-read** publisher: approving + generating a PP YouTube video draft auto-publishes it **public** within ≤30 min (no date gate, bypasses the queue → `queue_id=null`). The v6.30 doc's "held to 07-30, never reached the publisher" was inaccurate — `db67b61c` published public 07-26. PK accepted the auto-publish for this lane. Memory: [[youtube-publisher-schedule-blind-autopublish]].

## 4 · Video #3 (08-13) — render reliability finding (the one blocker)

Video #3 **reproducibly fails at the render step** — not at governance. The v2.22.0 pin fired correctly (draft `recommended_format=video_short_stat`, approved, governed path selected); it is the **Creatomate render** that never completes.

- **`video-worker` enforces a hard "Render timed out after 2 minutes"** poll ceiling. #3 hit it on **every** attempt: **4 render submissions, each ~128.8–129.2 s** (real Creatomate render ids `c87cd5c8` / `04a8112d` / `2df26cac` / one more), logged `timeout`→`failed`.
- **Not content-specific:** the 4th attempt was a **fresh re-roll** (new canonical `33b6cb1c`, new script) and still timed out at ~129 s.
- **Contrast:** #1 rendered in **49 s** and #2 in **28 s** on the identical governed `video_short_stat` path, minutes apart — so #3's render is a ~4–5× outlier that consistently exceeds the 2-minute worker budget. Most probable cause: a heavy/slow source asset in the resolved composition (e.g. a footage/video background vs a static image) that Creatomate cannot finish rendering + returning inside 2 minutes for this slot right now. Confirming it needs Creatomate-spec-level inspection (the stored `render_spec` holds only QA metadata, not the composed source assets), which is beyond this render-only lane.
- **Secondary reliability gap:** a video draft that lands `video_status='failed'` is **never re-selected** (video-worker selects `video_status='pending'` only) — so a real scheduled slot that hits this timeout would **silently produce no video** with no auto-retry. Only `pipeline-fixer`/manual reset recovers it.
- **State: contained.** #3 = `video_status='failed'`, no `video_url`, **0 publish rows** — it did not and will not publish.

**Recommended follow-ups (out of this lane):** (a) diagnose why #3's composition exceeds 2 min (inspect the composed Creatomate spec / resolved background asset; check the captured render ids on Creatomate); (b) treat the "failed video draft is never retried" gap as a render-reliability ticket; (c) the fail-closed audio gate from §1 is the natural place to also assert render success before a slot is considered done.

## 5 · Non-claims

- Governed video remains the **single point**: only `video_short_stat`+YouTube+PP is governed; other formats/platforms/clients are NOT schedule-driven or governed here.
- The fail-closed audio gate is a **local verification tool**, NOT wired into the pipeline — a silent render would still auto-publish (no pre-publish audio block exists in production).
- LUFS floor −40 is a recommended inaudibility gate, not PK-ratified; PK audio listen remains the human confirmation.

## 6 · PK disposition + go-forward (2026-07-27)

**Phase 1 ACCEPTED** as proof of governed single-scene stat-video production. #3's render timeout is NOT to be chased further this session.

**Next outcome — Production Reliability** (seeded directly by this lane's three findings):
1. **Silent output must fail closed** — wire the §1 audio gate as a real *pre-publish* block (today it is only a local tool; nothing in production gates audio).
2. **Timed-out renders must retry or recover visibly** — fix the §4 gap: `video-worker` 2-min ceiling + `failed` drafts never re-selected → silent no-video slot.
3. **Scheduled videos must not publish outside intended release control** — the §3 finding: `youtube-publisher` is schedule-blind and auto-publishes public within ≤30 min with no date gate.

**Following outcome — Creatomate Video Phase 2:** one longer, **animated, multi-scene** PP video using multiple governed backgrounds/assets — a scheduled script driving several scenes, controlled transitions + animation, governed asset selection, audible audio, publish-ready final.
