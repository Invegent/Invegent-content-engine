CLAIMED v5.48 · cc-0035-governed-pp-video-live-draft-render-proof · main-checkout C:\Users\parve\Invegent-content-engine · gate: PK verdict PASS-WITH-CARRY, D1 terminal → register cut (pending; RENUMBERED v5.46→v5.48, v5.46=PP-TMR-DoD + v5.47 parallel-uncommitted at claim time) · 2026-07-10T06:45Z

# Result — cc-0035: governed PP video_short_stat live-draft render proof

**Completed:** 2026-07-10 Sydney
**Packet:** `docs/briefs/cc-0035-governed-pp-video-live-draft-render-proof.md` · sha256 `080a17db54ad240e87b3f684d1a43e2d4e80b9db1d41a696681edb40307bca3a`
**Directives:** `_harness/cc0035_orchestrator_20260710/DIRECTIVES.md` (D1.0 → D1.5)
**Lane:** PRODUCT_PROOF · **Tier:** T3 (production write on a live published draft) · explicit PK gate (no Convention-2 sequence)
**Outcome:** ✅ **PK VISUAL + AURAL PASS — WITH CARRY** (2026-07-10). The governed combo-audio video renders **end-to-end in live production**; one visual carry (CTA clipping). Production left with **zero net change** (draft restored).

---

## 1. PK verdict (the deciding act)

PK watched the governed mp4: **12 s, voiceover + music bed both present, visuals correct = PASS**, with **one carry — the CTA text is clipped at both frame edges** (§5).

- **render_log_id:** `8c41689a-582b-4728-a658-76c7eeeb8a65`
- **artifact:** `post-videos/property-pulse/1f5633de-6b83-4440-90ab-6673b0b8fbaa_stat_governed.mp4` · **sha256 `33e13dcb62335f74ca300cb06a1f18c2c5e2acd5d419c5df37a929d4b122a3e8`**
- 1080×1920 · 12.00 s · two streams (h264 + aac 48 kHz stereo) · mean −27.8 / max −5.5 dB.

## 2. What this proves

The **first governed render on a REAL production PP `video_short_stat` draft** — not a smoke, not forced. Draft `1f5633de` (approved, previously published to YouTube `tZEVJW7fnyU`) → PK-authorised `video_status` flip → **cron jobid 33** picked it up → the governed branch (`enabled=true`) fired → template `c11bb8ab` + a **governance-selected** music bed (`select_music`) + a composed voiceover → audio-bearing mp4. End-to-end live: select → resolve → render → log, with the governed signature on the render row.

## 2b. Scope — cc-0035 does NOT close DoD "Level B" (one criterion remains)

Per `docs/governance/pp-tmr-definition-of-done-v1.md` (Level B — First Video Proof Done), the label requires FOUR criteria:

- **B1** `enabled=true` for `video_short_stat` — **MET** (flip, 2026-07-10 04:25:44Z).
- **B2** ≥1 governed render-log row with non-null `post_draft_id`+`client_id` and `variant_key='stat-reveal-9x16-video-v2'` — **MET** by this render (`8c41689a`; baseline 33 → 34).
- **B3** `select_music('format','video_short_stat')` returns exactly 1 row (the B-OQ1 tripwire) — **HOLDS**.
- **B4** **fail-closed exercised on a REAL draft** (governed throw → `video_status='failed'` + render-log row, no legacy fallback) — **NOT MET**.

**A *successful* render cannot exercise the throw path.** B4 is proven **only in the hermetic tests (code)**, never yet on a real production draft. Therefore **"PP Video TMR First Proof Done" is still FALSE on exactly this one criterion**, and **"cc-0035 closed" ≠ "Level B done."** The board must not read this result as flipping the label. Closing B4 needs a *separate* proof: a real draft that fails the governed gate (e.g. an over-length field) producing `video_status='failed'` + a render-log row with no legacy fallback. cc-0035 also does not touch Level D (Ultimate) at all.

**Carry (D6, not cc-0035's to close):** the video-worker governed path added PP-hardcoded literals ([b1_video_stat.ts:32](supabase/functions/video-worker/b1_video_stat.ts:32) provider-template id, [index.ts:981](supabase/functions/video-worker/index.ts:981)) — per the DoD these are net-6 unrecorded chokepoints for the Spine-Gen-v2/D6 gate; flagged for that lane.

## 3. Sequence executed (D1.0 → D1.5; all STOPs honoured, none tripped)

| Step | Result |
|---|---|
| **D1.0** pre-checks (9 tuples) | **all `actual == expected`**; parity `94b70f3`/0-0 at write time; packet hash matched |
| **D1.1** write | `m.post_draft.video_status` `published → pending`, CAS-guarded, **rowcount=1** (asserted in a DO block that aborts otherwise) |
| **D1.2** wait + observe | did **not** invoke the worker; cron jobid 33 (`*/30`) fired 06:30, rendered **06:31:20**. **Governed success signature:** render-log `8c41689a`, `variant_key='stat-reveal-9x16-video-v2'`, `provider_template_id=c11bb8ab`, `tmr.audio.music_bed=true`, `status='succeeded'`; draft `video_status='generated'`, `video_url → …_stat_governed.mp4`. (Asserted on the signature, NOT a count delta — the legacy 2026-06-24 row has `variant_key=null`.) |
| **D1.3** publish-neutrality | **HELD** — `post_publish`=1/`tZEVJW7fnyU`, `queue`=1/`queued`, unchanged |
| **D1.4** evidence | mp4 §1; ffmpeg two-stream / 12.00 s / levels / sha256 → **PK PASS-WITH-CARRY** |
| **D1.5** rollback | `video_status='published'`, `video_url` → original `…4036a6b5…_stat.mp4`, rowcount=1; `approval_status`/`youtube_video_id` untouched. **All 6 fields re-verified == the D1.0 tuple.** |

## 4. Publish safety (why this was safe on a live published draft)

The lane elected an entity the publish path **structurally cannot re-select** rather than mutating any production posture (no cron pause, no publish hold): the draft already carries `youtube_video_id='tZEVJW7fnyU'` and a `published` `post_publish` row, so the publishers' guards exclude it. Four no-publish guards were independently db-rls-verified (`pass`/high); external review found no missed publish path (`2f7e705c`, escalation was `policy_decision` + `runtime_verification_required`, which PK resolved by authorising). The governed render wrote a **distinct object** (`…_stat_governed.mp4`), so D1.5 restored the draft with zero byte loss. **Blast radius = a failed draft (`video_status='failed'`) at worst, never a bad post.**

## 5. CARRY — CTA clipping (real, live-path defect)

The `CtaText` renders **clipped at both left and right frame edges**. The draft's `cta_text` — *"Are you watching the Perth market? Drop your thoughts below 👇"* (~60 chars) — is wider than the 1080 frame, and template `c11bb8ab`'s `CtaText` element is **single-line with no wrap / no auto-shrink**, so it overflows. (The smoke CTA *"What does this mean for your next move?"* ~38 chars fit; the worker gate `B1_VIDEO_CTA_TEXT_MAX_CHARS=90` is too loose for the visual width.)

**`enabled=true` is live**, so real long-CTA drafts will publish with clipped CTAs. **PK ruling 2026-07-10: ACCEPT-AND-MONITOR** — no fix lane opened; the CTA clip is accepted for now and watched on live output. The fix options remain on the shelf if it recurs or worsens: (a) author a `CtaText` that wraps/auto-shrinks (template change → likely a `_v3` revision + re-register); (b) tighten the CTA gate `B1_VIDEO_CTA_TEXT_MAX_CHARS` to a visual-safe width (worker change; fails-loud on over-length instead of clipping).

## 6. CARRY — governance-selection attribution expires

**Audio-present proves a bed was BOUND, not WHICH track.** `render_spec.template` is the worker's self-report (no `modifications` key); `m.music_usage_event` is unwired (Music lane C5); `c11bb8ab`'s baked `MusicBed.source` is blanked (Fixups). Attribution to *Drifting Piano* holds **only because `select_music` returns exactly one eligible row today.** This evidence **expires the moment a second track is approved** — at that point audio-present no longer identifies the track, and a real witness (`GET /v1/renders/{id}` modifications, or wiring `m.music_usage_event`) becomes necessary.

## 7. Resolved thread + non-claims

- **cc-0032 flip db-rls verdict RESOLVED = `pass`/clean** (agent a13296d3, late-return): `UNIQUE(client_id,format)`, CAS sound, reversible, grants clean, only an INFO advisor. The enable-flip applied on PK authority is retroactively confirmed clean — no must_fix.
- No `enabled` change, no publish, no draft mutation persisted (draft restored to prior published state). `approval_status` and `draft_format->youtube_video_id` never written by this lane.
- D2 (cc-0032 doc-drift), D3 (register pointer), D4 (contract amendments) are separate directives; only D1 ran here.
