# Schedule-Driven Governed Video — Golden-Path Proof (Result)

> **Lane:** schedule→format authority, minimal golden-path slice · **Tier:** T3 · **Status:** PROVEN — outcome met.
> **Brief:** `docs/briefs/schedule-driven-governed-video-goldenpath-gate1-brief-v1.md` (PK Gate-1 APPROVED).
> **Outcome:** prove repeatable Creatomate production from an authoritative scheduled video slot → publish-ready video.
> **Gate:** the schedule-selected video format must drive the governed Creatomate path end-to-end. **MET.**

---

## 1 · What was wrong (live baseline)

The governed Creatomate video render was already proven (v6.29 render `989558b1`), but the schedule drove **nothing**: every renderer reads `m.post_draft.recommended_format` — the **Advisor's** pick — while `m.slot.format_chosen` (the schedule allocation) is read by nothing in production (cc-0079 §2.1, still live in current code). Live baseline on the exact golden path — 3 of 3 filled PP YouTube slots whose schedule chose `video_short_stat`:

| Slot | Sched date | Schedule chose | Advisor `recommended_format` | Governed render |
|---|---|---|---|---|
| `3ab2e6a2` | 2026-07-23 | `video_short_stat` | `text` (unpublishable on YT) | never fired |
| `b57a506b` | 2026-07-16 | `video_short_stat` | `video_short_kinetic_voice` (legacy) | never fired |
| `52758754` | 2026-07-09 | `video_short_stat` | `text` | never fired |

## 2 · The change (ai-worker v2.22.0, commit `ddf3fbd`, DEPLOYED)

One narrow hard-pin mirroring the existing F-HEYGEN A2 avatar override, plus a deterministic stat-field clamp. Entirely in `ai-worker`; no migration; governance table read-only.

- **Pin** (`index.ts`, after the avatar override): when `input_payload.format === 'video_short_stat'` AND `platform === 'youtube'` (the only platform where `video_short_stat` is valid) AND the client is governance-enabled (`isVideoStatGovernanceEnabled`, fail-closed) → force `decidedFormat = 'video_short_stat'`, recording `advisor_would_have` in the reason. Every other Advisor power intact.
- **CTA/field clamp** in the `video_short_stat` script generator: deterministic word-boundary clamp of stat_value/stat_label/context_line/cta_text to the generator's own stated limits (all ≤ the video-worker contract maxima) — no-op when compliant; fixes the observed `cta_text=133` fail-loud death.
- Deployed via `scripts/safe-deploy.sh ai-worker --allow-warn`; `verify_jwt=false` preserved (config.toml + x-ai-worker-key).

**Review chain (all clear):** ef-builder 37/37 deno + `deno check` clean · branch-warden `safe` · service_role SELECT on `c.client_creative_governance` confirmed (`can_select=true`) · external review `760603c5` partial/no-concrete-defect (pinned diff `8bc8ccac`) · **deploy-verifier PASS** (`deploy_content_verdict=PASS`; deployed entrypoint hash byte-identical to `ddf3fbd`, all 4 markers live, `verify_jwt=false` — bundles-from-CWD trap positively refuted; drift advisory `A-LE` only).

## 3 · Live proof (real slot `a157f5bb`, PP YouTube 2026-07-30)

Drove the real scheduled slot through the genuine cron pipeline (workers triggered via the crons' own `net.http_post`; keys never exfiltrated). Draft `db67b61c`, ai_job `29c47751`, seed canonical `14b2789b` (overseas-born population / property investors).

**Four-way agreement (the gate):**

| # | Criterion | Value |
|---|---|---|
| 1 | Scheduled format | `video_short_stat` (`slot.format_chosen`) |
| 2 | Final draft format (post-pin) | `video_short_stat` — `advisor_would_have=video_short_stat_voice` (the legacy-routing trap the pin prevented) |
| 3 | Governed template selection | `select_template('property-pulse',null,'video_short_stat',…)` → `c11bb8ab` (`video_stat_reveal_9x16_v2`), status `ok` |
| 4 | Produced render | template `c11bb8ab` / `video_short_stat`, 12.0s mp4, `render_status=succeeded`, `resolver_used=true`, `bind_mode=resolved`, governed logo `pp_logo_primary` + background `bg_pp_contract_signing_closeup` |

**Acceptance conditions:**
- **CTA safety:** all four script fields within contract; `cta_text` = "Is migration-driven demand affecting your local market?" (55 ≤ 90); `stat_value="1 in 3"`.
- **Audio verification:** mp4 byte-scan — handlers `['vide','soun','mdir']`, real **audio track present** (`soun`, 564 audio samples; 360 video frames = 30fps × 12s); render evidence `voiceover:true, music_bed:true`. Silent-video trap refuted by measurement. (Numeric LUFS deferred — no ffmpeg on this host; PK audio listen is the final confirmation, as with prior governed video proofs `e37affd9`/`def2195f`.)
- **Containment:** `post_publish_queue` rows = 0 throughout; draft scheduled 2026-07-30; never reached the publisher.

**Repeatability:** the pin fires deterministically for any governance-enabled PP YouTube `video_short_stat` slot; the weekly YouTube cadence re-demands the format; the allocator is convergent (cc-0079 §4.1). Not a one-off.

## 4 · Disposition (PK)

- **Artifact rides to 2026-07-30** (PK election): slot `a157f5bb` left filled, draft `db67b61c` approved + `video_status=generated` + `video_url` set, scheduled 2026-07-30 — a genuine governed post that publishes on schedule. Actual publish remains a separate PK act (the publish-queue cron enqueues near-date).
- Real future slot `a157f5bb` was filled ~4 days early to run the proof now (a fill the pipeline would have done anyway); it is a legitimate, correct governed fill.

## 5 · Scope fences honoured / non-claims

Touched **only** `ai-worker` + produced one publish-ready video. **No** general R3/R4 schedule-authority resolver (that remains an ICE Engineering outcome; the R3a shadow resolver was left byte-unchanged), **no** schema change, **no** change to renderers/publishers/allocator/mix, **no** static-YouTube capability, **no** actual publish. Reversible via revert+redeploy.

**Non-claims:** does not claim the universal schedule→format authority is solved (this is one golden path); does not claim other formats/platforms/clients are schedule-driven; does not claim the cta_text or audio-measurement defects are fixed system-wide (handled only for this path); LUFS not numerically measured this lane.

**Evidence basis:** CE `ddf3fbd` (origin/main, pushed); live DB reads + drives 2026-07-26; deploy-verifier live bundle read; mp4 byte-scan `db67b61c…_stat_governed.mp4` (2,114,559 bytes).
