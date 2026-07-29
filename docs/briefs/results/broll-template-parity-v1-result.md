# Result — B-roll Template Parity v1

**Brief file:** none — task given directly in chat (Sonnet, "GOVERNED CREATOMATE VIDEO — B-ROLL TEMPLATE PARITY"), itself brief-shaped (outcome, required evidence, boundaries, completion rule).
**Executed by:** Claude Code (chat)
**Completed:** 2026-07-29 Sydney

---

## 1. Result status

`Complete` — with one material scope finding PK reviewed and accepted inline (see §6).

## 2. Commit(s)

- {filled by orchestrator at commit time} — docs(v6.50): B-roll Template Parity v1 — render-time recipe proven, incumbent unchanged

## 3. Files changed

- `docs/briefs/results/broll-template-parity-v1-result.md` — created (this file)
- `_harness/cc_broll_parity_20260729/` — created (proof harness: template JSON pulls, parity render script + meta, rendered proof files, extracted frames)
- `docs/00_sync_state.md` — modified (pointer entry, v6.50)
- `docs/00_action_list.md` — modified (pointer entry)

No code, migration, or registry (`c.creative_provider_template*`) changes. No production/EF changes.

## 4. Actions taken

1. Read-only research pass (`Explore` agent) mapped `buildGovernedVideoStatPlan`'s binding contract (`supabase/functions/video-worker/b1_video_stat.ts:270-372`), the incumbent template (`a3d8472d` / Creatomate `c11bb8ab-…`, 1080×1920/12s), the rolled-back B-roll template (`dd5fd75e` / Creatomate `46c5c4ac-…`, 720×1280/8s, name `AU_generic_national_Suburb_9:16_V1`), and confirmed only the DB `fit_status` rows were rolled back in v6.48 — the underlying Creatomate template itself was never edited.
2. Verified live against current Creatomate docs (WebFetch/WebSearch, 2026-07-29) that the REST API has **no template create/update endpoint** — templates and `GET /v1/templates{,/{id}}` are the only surface; template authoring is editor-only. This confirms and updates the standing memory note (`creatomate-api-gotchas.md`, previously 18 days stale).
3. Fetched live template JSON for both `46c5c4ac` (source `sha256=201e8ad9…`) and `c11bb8ab` (source `sha256=70e7184d…`) via `GET /v1/templates/{id}`. Found the B-roll template's Background element is already `type:"video"`, `dynamic:true`, and every element shares an explicit `"duration":8`; composition `width`/`height` are plain top-level fields — both are per-element/per-composition properties, not hardcoded geometry.
4. Probed the B-roll source asset (`broll_pp_au_suburb_aerial.mp4`) directly with `ffmpeg -i <url>`: native **1080×1920, 29.03s** — far more headroom than the template used, ruling out "footage too short" as a constraint.
5. Ran one validation render against template_id `46c5c4ac` with `modifications: {width:1080, height:1920, <Element>.duration:12 for every element}` plus the (then-hardcoded, validation-only) Background/Logo sources. Provider response and `ffmpeg`-measured file both confirmed **1080×1920, 00:00:12.00**.
6. Called `public.resolve_slot_assets('property-pulse', NULL, 'video_short_stat', 'dd5fd75e-982d-4c3d-89cd-7ce0936076b2', 'broll-parity-proof-20260729')` live (read-only `STABLE SECURITY DEFINER`, verified no writes in function body) — returned `status:"ok"`, Background=`broll_pp_au_suburb_aerial`, Logo=`pp_logo_primary`, with no asset ID supplied by this session.
7. Checked whether any production code path reads `c.creative_provider_template.width/height/duration_seconds` (the registry row for `dd5fd75e` currently records 720/1280/8, i.e. still accurate). Only `supabase/functions/tmr-drift-probe` references the table, and only for an id+name drift check (`compare.ts` check (a)) — the width/height/duration columns are not read or compared anywhere. Concluded: editing those columns would be **inert metadata**, not enforcement, and setting them to 1080/1920/12 while the real Creatomate object stays 720/1280/8 would make the registry describe something untrue (a mirror of the TPR-1 failure this whole task exists to prevent). **Left this row untouched.**
8. Ran the official two-render proof (`_harness/cc_broll_parity_20260729/render_proof_parity.py`) against template_id `46c5c4ac`, using the live resolver output from step 6 plus the parity `modifications` overlay:
   - `parity_control_no_vo` (baked MusicBed default, VoiceAudio omitted/silent): 1080×1920, 12.00s, −28.4 LUFS.
   - `parity_production_shape` (adds `VoiceAudio.source` + `MusicBed.source` = governed music-library track): 1080×1920, 12.00s, −25.9 LUFS.
   - SHA-256 differs between the two → audio keys demonstrably affect output, not silently dropped.
   - Both renders completed in ~30s wall clock (production ceiling is a hard 2 minutes — see `video-worker-2min-render-timeout-no-retry` memory).
9. Extracted and visually reviewed frames at 1s/5s/9s/end (≈11.5s) of the production-shape render — full-frame native-resolution B-roll footage, no freeze/black frame/dropout through the extended 8→12s tail, logo/text layout unaffected (percentage/`vmin` units scale automatically with the 720×1280→1080×1920 override, same 9:16 aspect ratio).
10. Sent the final rendered file to PK for visual review; PK approved ("Recipe's fine, that's a good answer").
11. Re-fetched `c11bb8ab` (incumbent) template JSON — `sha256=70e7184d…`, byte-identical to the value captured at the start of this session. Confirmed via `git diff --stat` that no tracked repo file was modified by this session other than the two register pointers and this result doc.

## 5. Constraints confirmed

- Did not activate or repoint production selection — no write to `fit_status`, `c.creative_provider_template*`, or any selector-relevant row.
- Did not demote incumbents — incumbent template confirmed byte-identical, pre- and post-session.
- Did not change resolver v1.4 — `resolve_slot_assets` was called read-only; its body was read but not modified.
- Did not update the governed-smoke expected template ID — `EXPECTED_SMOKE_VIDEO_PROVIDER_TEMPLATE_ID` (`video-worker/index.ts:1442`) untouched.
- Did not accept lower resolution/shorter duration — parity render measured 1080×1920/12.00s, matching the incumbent spec exactly.
- No production deploy, migration, or worker code change was made.

## 6. Open issues

**Material scope finding, PK-reviewed and accepted:** Creatomate has no template create/update API (confirmed live, 2026-07-29). This means "correct the template" cannot mean editing the saved Creatomate object — that stays 720×1280/8s and is unchanged by this lane. What was built and proven instead is a **deterministic render-time `modifications` recipe** (fixed `width`/`height`/per-element `.duration` overlay) that, applied on every render call against `template_id=46c5c4ac`, reliably reproduces the full 1080×1920/12s production contract with correct audio binding and equal-or-better visual quality (native-resolution source vs the previous 720p render). PK reviewed this framing plus the rendered proof and accepted it as the intended shape of "template parity" for this outcome.

Consequence for any future activation lane: the recipe is **not wired into any code path today**. Nothing in `video-worker` currently attaches this overlay when `46c5c4ac` is selected — the recipe exists only as this proof + the constant `PARITY_OVERLAY` dict in `_harness/cc_broll_parity_20260729/render_proof_parity.py`. A future activation outcome must (a) decide where the overlay lives (worker-side per-template constant, or a new registry column actually read at render time — TBD, deliberately not decided here) and (b) re-run TPR-1's output-spec diff against that wired implementation, not just this harness proof, before any repoint.

The ICE registry row for `dd5fd75e` (`c.creative_provider_template`) still reads width=720/height=1280/duration_seconds=8 — left as-is because it is currently accurate and nothing reads it; it should be updated only once/if the recipe is actually wired into a real render path, at which point it would describe true production behavior rather than aspirational metadata.

## 7. Next recommended step

None from this lane — task boundaries explicitly reserve production activation (selector-diff review, rollback proof, PK apply gate) for a separate fresh Opus outcome. This result and its harness are the evidence base for that future lane.

---

## 8. Verification (chat fills this)

**Verdict:** `Pass`

**Notes:**

- Output matched the brief's 7 required-evidence items; item 1 ("provider template configuration confirms…") was satisfied via a proven render-time recipe rather than an edited saved template, disclosed explicitly and accepted by PK before recording.
- All stated boundaries respected — verified via re-fetch hashes (incumbent template, unchanged) and `git diff --stat` (no unexpected tracked-file changes).
- Only files changed: this result doc, two register pointers, and the new `_harness/cc_broll_parity_20260729/` proof folder (untracked-by-default `_harness` convention).
- Success criteria met: 1080×1920/12.00s measured from the rendered file; resolver-selected (non-hardcoded) B-roll asset; audio keys proven to bind (SHA-256 diff + LUFS shift, both renders far above the −40 LUFS audio-gate floor); wall clock ~30s, well inside the 2-minute production ceiling; incumbent output unchanged.
- New risk: none introduced (nothing wired into a live path). Residual risk carried forward explicitly for the next lane: the recipe must be wired and TPR-1-diffed again before it can back a real repoint.
- Follow-up: none required now; the future activation outcome inherits the open item in §6.

## 9. Learning notes (chat fills this)

- Reusable pattern: when a governed video/image contract requires provider-side spec correction and the provider has no write API, check whether the constraint is genuinely baked into the saved object or whether `modifications`-at-render-time can reach it (root `width`/`height` and per-element `duration` both proved reachable here, contrary to the initial assumption that duration was fixed). Cheap to test with one throwaway render before concluding "blocked."
- Updated a stale memory: `creatomate-api-gotchas.md` (18 days old) claimed no template CRUD API from a single repo citation (`docs/briefs/cc-0032-...md:30`); this lane independently re-verified it live against current Creatomate docs before relying on it — worth doing whenever a stale memory is about to gate a go/no-go decision.
- Better wording for future briefs like this one: "template" is ambiguous between "the provider's saved object" and "whatever configuration reliably produces the required output." Naming which one is required up front would have saved one clarifying round-trip (here resolved by presenting both interpretations and their evidence to PK for a single accept/reject call).
