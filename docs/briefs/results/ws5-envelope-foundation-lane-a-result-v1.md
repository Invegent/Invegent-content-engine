# Result — Lane A: `ws5-production-envelope-enforcement-foundation` (COMPLETE)

**Completed:** 2026-08-03 Sydney · **Executor:** chat (orchestrator) + subagents, PK at every gate
**Brief:** `docs/briefs/ws5-envelope-foundation-lane-a-gate1-brief-v1.md` (Gate 1 approved 2026-08-03 with rulings D-1…D-4 + F-1 disposition)
**Outcome:** the reusable WS-5 envelope-enforcement foundation is LIVE end-to-end, `video_stat_reveal_9x16_v2` is repaired + calibrated, the corrected NDIS render received **PK visual PASS**, and the **NDIS × YouTube × `video_short_stat` cell is RE-CLOSED** under the adjusted re-close rule (all five conditions; NO second publish — the repair changed no routing, rendering authority, or publisher behaviour; the preserved publish `oCrtq6R9VFQ` stands as transport+evidence proof).

## The five re-close conditions (run-sheet §RE-CLOSE RULE ADJUSTED) — ALL MET

1. **Eyebrow parameterised** (D-4: not removed): PK editor sitting renamed the baked "MARKET UPDATE" element to dynamic `EyebrowText`; saved source frozen `docs/briefs/artifacts/ws5-p2-video-stat-reveal-9x16-v2-eyebrow-param-source-v1.json` (sha256 `f98a8e08…` = the template's first captured inventory fingerprint). Governed per-client values persisted (`constraints.baked`): PP `MARKET UPDATE` · NDIS `NDIS UPDATE`; video-worker v3.17.0 consumes them fail-loud.
2. **Safe StatValue + ContextLine bounds implemented** (whole field set): probe-calibrated envelope persisted (P3) — StatValue **7ch/1 line/1 word** · StatLabel 30/1 · ContextLine 130/4 · CtaText 38/1 · EyebrowText 13/1 — and ENFORCED live at generation by ai-worker v2.26.0 (validate → one bounded re-prompt → fail-closed `dead_reason`, both attempts preserved as QA; silent clamps removed) with template-identity binding verified at render by video-worker v3.17.0.
3. **Corrected NDIS replacement render:** `e15b7aaf-2c8d-46b5-96f4-6bfd5e494023` (out-of-band, zero DB writes, silent audio by design; local `_harness/ws5_p4_ndis_corrected/renders/ws5_p4_ndis_corrected.mp4` sha256 `5e34d0a0…`). Content = the ORIGINAL incident draft's story (`4d81324a-526e…`, read-only) reshaped into the envelope; **live-bounds pre-flight ran the DEPLOYED validator code against the persisted constraints and PASSED**; assets via read-only governed resolver (`bg_ny_brand_texture_navy_waves` + NDIS full-colour logo).
4. **PK visual PASS:** 2026-08-03 ("Visual pass proceed") — all three incident defects verified resolved (right-brand eyebrow, single-line stat with margins, context inside text-safe width).
5. **Assignment restored + selector/readiness verified:** `aa2179eb…` `blocked`→`visually_approved` (CAS, approval columns byte-intact: `PK` / `2026-07-20 05:10:10.340431+00`); `select_template('ndis-yarns','youtube','video_short_stat')` → `ok`, selects `a3d8472d…`; readiness cell → **`ready` / `selectable`**; PP winner unchanged `dd5fd75e…`; zero claimable drafts.

## D-2 restoration preconditions (PK Gate-1) — ALL MET
Every actual modification field registered (9 rows; prior state recorded as `graduation_contract_rung_2_incomplete`) · required text fields probe-calibrated · intake validation `pass`/0 hard failures (platform-neutral contract; platform-constraints = Lane B by recorded decision) · corrected render passed live bounds · PK visual PASS.

## What is now LIVE (the reusable foundation — Lane B consumes without rework)

- **Generation-time enforcement:** ai-worker v2.26.0 (deployed, verified `PASS`, marker `ai-worker-ws5-stat-envelope-enforcement`) — pre-generation envelope load mirroring the render-time selector; real limits in the prompt; D-1 Option B (one re-prompt → fail-closed `stat_bounds_violation_after_bounded_reprompt` + `video_status='failed'`, unclaimable); QA evidence with both attempts; char clamp REMOVED from the stat path (fallback char-bounds are validation, never truncation).
- **Template-identity continuity:** `stat_template_binding` persisted at generation; video-worker v3.17.0 (deployed, verified `PASS`, marker `video-worker-ws5-eyebrow-text`) fail-closes `b1_video_stat_template_binding_mismatch` on any winner change/disappearance/malformed binding.
- **Vocabulary:** `text_limits.max_words` persistable (migration `tmr5_field_constraints_vocabulary_max_words_v1`; one-line diff, advisors 250→250 zero-new) — expresses the exact incident defect class.
- **Governed EyebrowText:** data-gated, per-client baked values, fail-loud, never freeform AI.
- **Graduation calibration-gate (D-2, contract rule + intake enforcement, NO selector filter):** this lane's own restore was executed under it; fleet-wide enforcement = Lane B.

## Phase records (canonical evidence)

- **P1 build+deploy:** commits `04de162`→`5955318` on main (pushed); frozen diff `ws5-envelope-foundation-p1-v2.diff` sha256 `b19c66a6…`; branch-warden `safe`×2; external `1923c68c` (v1) → `3184e0d4` apply_corrected; deploy-verifier content PASS both workers; drift A-LE/none; zero binding-mismatch events (still zero at lane close).
- **P2 containment:** packet v2 `ae40dbf1…` applied (record `ws5-p2-containment-apply-record-v1.md`); PP non-regression render `a955d1f6…` PK PASS; chain db-rls clean · AHA 3 findings fixed · external `e9a5e0a8`→`bdb732ff` agree.
- **P3 calibration persist + PP restore:** packet v2 `73c28dd7…` applied (record `ws5-p3-apply-record-v1.md`); probe evidence `ws5-p3-stat-calibration-evidence-v1.md` (6 probes incl. exact incident regression `3e6fbe96…`); chain db-rls concerns→fixed · AHA 5 findings→fixed · external `23c30399`→`c2c70f05` agree; 9 constraint payloads persisted (md5s in the apply record); intake validation `pass`.
- **P4/P5:** corrected render `e15b7aaf…` → PK visual PASS → NDIS restore + re-close verification (this doc §above).

## Named carries / not done here

- **Git step (PK-gated, pending):** commit the migration file `supabase/migrations/20260803090000_tmr5_field_constraints_vocabulary_max_words_v1.sql` (ALREADY APPLIED live — ledger⇄git must not drift) + the lane docs/artifacts + harness scripts; push main.
- **Lane B (CGU Final)** `ws5-production-template-calibration-backfill`: fleet calibration coverage · render-time bounds validator wiring · platform-constraints population · selector-level graduation enforcement · ongoing sampling policy.
- ai-worker prompt static example `$62.17/hr` (9ch) now exceeds the 7ch envelope — cosmetic future patch; enforcement chain makes it harmless.
- Auto-approver terminal-draft exclusion: recorded future hygiene task (chip `task_8e00b843`).
- Creatomate key: local rotation-staleness confirmed live (401); managed storage/rotation carry unchanged; renders used PK-designated key file, value never in transcript.
- Optional (not required by the re-close rule, not done): a new `visual_approval` proof event row for the corrected render — the preserved CP-E proof event satisfies the selector; the corrected-render PASS is recorded here.

## Register payload (version-less — to the register-cut owner)

> **✅ vX.XXX — Lane A ws5-production-envelope-enforcement-foundation COMPLETE: WS-5 envelope enforcement LIVE end-to-end + `video_stat_reveal_9x16_v2` repaired/calibrated + NDIS × YouTube × `video_short_stat` RE-CLOSED (T3 · SAFETY_GATE · every gate PK-ruled; NO second publish per the adjusted re-close rule)** — result: `docs/briefs/results/ws5-envelope-foundation-lane-a-result-v1.md`.
> · Foundation live: ai-worker v2.26.0 (persisted-envelope validate → one re-prompt → fail-closed, clamps removed, QA both-attempts) + video-worker v3.17.0 (governed EyebrowText data-gated + template-identity binding fail-closed) + `text_limits.max_words` vocabulary (migration applied+advisors zero-new) + probe-calibrated constraints on all 9 fields (StatValue 7ch/1line/1word — the incident class is now mechanically unrepresentable).
> · Repair: eyebrow parameterised (PK sitting; PP `MARKET UPDATE`/NDIS `NDIS UPDATE` baked governed values), first template fingerprint `f98a8e08…`, PP non-regression PK PASS (`a955d1f6…`, winner unchanged `dd5fd75e…`), corrected NDIS render `e15b7aaf…` live-bounds PASS + **PK visual PASS**.
> · Re-close: assignment `aa2179eb…` restored (approvals intact), selector selects, readiness cell `ready/selectable`; all preserved incident evidence untouched (`oCrtq6R9VFQ` · `9fb06e0a…` · `c9150005-…{1,2}` · `d6c7e3e3…`). CGU-v1 committed-cell tally returns 23/25 by this re-close (PP YT kinetic + CFW-LI remain the other lanes' work).
> · Carries: PK git step (applied migration file + lane docs → main) · Lane B fleet backfill · auto-approver dead-draft hygiene (chip) · Creatomate key rotation/managed storage.
