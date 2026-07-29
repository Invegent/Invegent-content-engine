# Apply/Deploy Packet — B-roll PARITY Activation v1

**Lane:** wire the approved 1080×1920 / 12-second parity overlay into the governed B-roll render path
and activate it without degrading the incumbent contract.
**Tier:** T3 (production-touching: EF deploy + production DML repointing a governed default).
**Lane class (CCF-02):** PRODUCT_PROOF.
**Status:** **FROZEN — awaiting PK Gate 2.** Nothing in this packet has been applied or deployed.
**Register version claimed:** v6.54 (v6.53 is held by a concurrent uncommitted session — see §9).

---

## 1. What this lane closes

The v6.48 activation was applied, proven, then **rolled back by PK** because the promoted template
downgraded PP governed video from **1080×1920/12s → 720×1280/8s**, undisclosed at Gate 2. That
regression is the origin of standing rule **TPR-1** (diff the OUTPUT SPEC on any default-template
repoint).

Creatomate has **no template create/update API** (re-verified live 2026-07-29), so the saved
`46c5c4ac` object cannot be corrected in place. B-roll Template Parity v1
(`docs/briefs/results/broll-template-parity-v1-result.md`, PK-approved) proved a deterministic
**render-time `modifications` recipe** that produces true 1080×1920/12s from that same template.
That result explicitly left the recipe **unwired** and handed the wiring + activation to this lane.

This packet wires it and re-runs TPR-1 against the wired implementation.

---

## 2. The change, in two parts

### Part A — code (EF deploy): `video-worker` v3.14.0 → **v3.15.0**

Three files, `+346 / −12`:

| File | Change |
|---|---|
| `supabase/functions/video-worker/b1_video_stat.ts` | the overlay: `B1_VIDEO_GOVERNED_OUTPUT_SPEC`, `B1_VIDEO_TEMPLATE_OUTPUT_PARITY`, `parityOverlayForProviderTemplate()`, `assertParityOverlayDisjoint()`; merged in `buildGovernedVideoStatPlan`; `output_spec` stamped into the tmr evidence; `modifications` type widened `string` → `string \| number`; `assertExpectedVideoProviderTemplate` accepts a set |
| `supabase/functions/video-worker/b1_video_stat_test.ts` | +15 hermetic tests (scope, overlay values, governance-containment, evidence, determinism, fail-loud, smoke-guard set, allow-list canaries) |
| `supabase/functions/video-worker/index.ts` | `VERSION` bump (drift-gate visibility — the gate hashes ONLY `index.ts`, so a helper-only change would misclassify A-LE) + the smoke expected-template **set** |

**The overlay is an allow-list of exactly one template:**

```
'46c5c4ac-4d35-488c-b57c-44e05d790fb9': {
  width: 1080, height: 1920,
  Background.duration | Logo.duration | StatValue.duration | StatLabel.duration |
  ContextLine.duration | CtaText.duration | MusicBed.duration | VoiceAudio.duration = 12
}
```

Keyed on **provider_template_id** (the Creatomate object UUID), not `provider_template_name` — the
name is editor-renameable and is therefore a weaker identity than the thing being corrected.

**Why every element carries a duration:** the composition length is the max element duration. A missed
element would render its content short against a 12s composition.

### Part B — production DML: the selector repoint (3 rows, no DDL)

`c.creative_template_variant_candidate`, `format_key='video_short_stat'`:

| id | template | from → to |
|---|---|---|
| `8b611275` | `dd5fd75e` / `46c5c4ac` B-roll | `candidate` → **`strong_candidate`** |
| `b61e2f15` | `a3d8472d` / `c11bb8ab` incumbent | `strong_candidate` → `candidate` |
| `dee47d2e` | `4cd2c9e2` / `03bc6a3c` | `strong_candidate` → `candidate` |

**Selector/ranking change, stated explicitly.** Ranking is
`v_b_intent_strong ‖ v_b_intent_other ‖ v_b_strong ‖ v_b_other`, each filled in template
`created_at ASC`. The production caller passes `p_platform=null, p_variant_intent=null`, so both
intent buckets are empty and the winner is **the first `strong_candidate` by template `created_at`**.
The B-roll template is the **newest** of the three, so **promoting it alone cannot make it win** —
demoting both incumbents is what makes the promotion effective. That is why this is a 3-row change,
not a 1-row change. Demoted rows remain fully selectable and become the fallback chain.

---

## 3. ⛔ ORDER IS A HARD PRECONDITION

**Deploy Part A, verify it, THEN apply Part B.** SQL cannot see edge-function code, so `forward.sql`
**cannot** enforce this — it is STOP-1 below and is owned by the operator.

Applying Part B against v3.14.0 reproduces the v6.48 regression exactly: production would immediately
render 720×1280/8s. Deploying Part A without Part B is inert and safe (the overlay only fires for a
template nothing selects).

---

## 4. Evidence

### 4.1 Hermetic — `deno test --allow-env --allow-net supabase/functions/video-worker/` → **142 passed, 0 failed**

Key assertions:
- incumbent `c11bb8ab` → **empty overlay**; exact 7-key modification set; **no `width`/`height`/`*.duration` key**; `output_spec.source='provider_template_default'` — i.e. byte-unchanged from v3.14.0.
- unlisted/unknown template → empty overlay (allow-list, not a default).
- B-roll → `width=1080`, `height=1920`, all 8 element durations `=12`, exact 18-key set.
- every governed binding (4 text slots, `Logo.source`, `Background.source`, both audio sources) unchanged by the merge; no `*.volume` key (N3 intact).
- `assertParityOverlayDisjoint` throws `b1_video_parity_overlay_conflict` on any `.source`/`.volume`/governed-key collision; the shipped map is verified disjoint.
- the overlay does **not** rescue a fail-closed selection (`tmr_video_selector_fail_closed` / `tmr_video_slot_resolution_incomplete` / `b1_video_missing_voiceover` all still throw first).
- **allow-list canaries** (added after external review, §8.1): the overlay map must hold **exactly one** entry, and **every** entry must be complete (both geometry keys + all 8 element durations = 10 keys). Deliberately brittle — adding a template to the parity map cannot happen quietly, and a partial entry (which would produce a mixed-spec render) fails the build.

### 4.2 Live production-shaped render proof — `_harness/cc_broll_parity_activation_20260729/`

Inputs are live and governed, not fixtures:

- **draft** `db67b61c-33f2-40da-b14c-c83b52b026d2` — a real published PP `video_short_stat` draft; its
  `draft_format.video_script` verbatim. National-scope stat, correctly paired with the national-only
  governed clip (the geo-authenticity gate: never pair generic AU footage with Perth copy).
- **selection** — verbatim live `public.select_template(...)` responses (`live_selection.json`,
  `live_selection_incumbent.json`), read-only.
- **assets** — resolver-selected: `broll_pp_au_suburb_aerial` (Background) + `pp_logo_primary` (Logo).
  No asset URL is hardcoded anywhere in the harness.
- **voice** — a **real ElevenLabs VO** generated from the production narration using the governed voice
  `YCxeyFA0G7yTk6Wuv2oq` (`c.client_voice_config`, enabled), hosted in the same bucket production uses
  (`post-videos`, `_harness/` path), byte-verified after upload (`b769b3a6…`).
- **music** — the live `public.select_music('format','video_short_stat')` winner
  `calm_piano_drifting_006` (`8f520a93…`).

`build_plan.ts` **imports the production module under change** and calls the same two functions
`renderGovernedVideoStat` calls; `render_proof.py` posts the resulting `modifications` **verbatim**.
Nothing re-implements the recipe.

**Measured results** (`render_proof_meta.json`):

| | outgoing incumbent `c11bb8ab` | incoming B-roll `46c5c4ac` |
|---|---|---|
| provider-reported | 1080×1920, 12s, 30fps | 1080×1920, 12s, 30fps |
| ffmpeg-measured | 1080×1920, **00:00:12.00** | 1080×1920, **00:00:12.00** |
| integrated loudness | −24.6 LUFS | **−22.9 LUFS** |
| audio stream | present | present |
| wall clock | 46.8s | **34.1s** |

- **TPR-1 output-spec diff: `specs_match = true`.** The regression that caused the v6.48 rollback is closed, measured on both sides.
- **Audio binds, not silently dropped:** production-shape sha `db83c58e…` vs no-audio control sha `93fe051f…` — **differ**. Both far above the −40 LUFS `audio_gate` floor. Production shape is *louder* than the incumbent.
- **Render ceiling:** 34.1s against the hard 2-minute `pollRender` ceiling.
- **Frames** at 0.5s / 4s / 8s / 11.5s: full-frame native-resolution moving footage, logo and all four text slots legible, **no freeze/black frame through the extended 8→12s tail** — the specific risk of stretching an 8s template to 12s.

### 4.3 Rollback proven **before** apply — `rollback_proof.sql` → `rollback_proof_output.txt`

`forward.sql` and `rollback.sql` bodies, machine-extracted verbatim, composed in **one live transaction
that cannot commit** (it ends in a deliberate sentinel `RAISE EXCEPTION`, so a channel that ignored
explicit transaction control still could not leave a write behind).

Result: **`ROLLBACK_PROOF_PASSED`** (txid 4011945). Every forward guard passed, the repoint took effect
against the real production call signature, and the rollback then restored a **digest-exact** pre-image
(`962043fb55bdd2a1a9e5d0a8718118e0`) with the incumbent winning again.

Independent post-proof re-read: digest unchanged, `max(updated_at)` unchanged, incumbent still live.
**Net production effect of the proof: zero.**

### 4.4 Rollback is live-valid today

The live pre-image digest recomputed 2026-07-29 is **`962043fb55bdd2a1a9e5d0a8718118e0`** —
byte-identical to the value frozen before the v6.48 apply. The v6.48 rollback was genuinely
digest-exact, and this lane's `rollback.sql` (same executable body) still reproduces the true current
pre-image.

---

## 5. Ordered apply sequence + non-removable STOPs

| # | Step | STOP condition (any → void the remainder, fresh PK gate to resume) |
|---|---|---|
| 1 | `bash scripts/safe-deploy.sh video-worker --allow-warn` | deploy reports anything other than success |
| 2 | **Verify the deployed bundle** contains `video-worker-v3.15.0` **and** the marker `B1_VIDEO_TEMPLATE_OUTPUT_PARITY` | marker or VERSION absent ⇒ the CWD-bundling trap shipped old code — **STOP, do not apply Part B** |
| 3 | `verify_jwt` unchanged (`false`) | flipped true (401→502 for `x-series-key` callers) |
| 4 | Refresh drift: `drift-check?write=true&slug=video-worker` | — |
| 5 | Re-confirm the pre-image digest is still `962043fb…` | any other value ⇒ concurrent drift, re-cut the packet |
| 6 | Apply `_harness/cc_broll_parity_activation_20260729/forward.sql` — **ONE `execute_sql` call carrying the whole file** | any `ABORT (…)` — all are executable `RAISE`s, all self-rollback |
| 7 | Live post-apply proof: generate/observe one governed PP `video_short_stat` render; confirm `render_spec.template.tmr.output_spec.source = 'render_time_parity_overlay'` and the mp4 measures 1080×1920/12s with audible audio | anything else ⇒ run `rollback.sql` |
| 8 | **PK visual approval** of the live post-apply render | PK rejects ⇒ run `rollback.sql` |

**Rollback at any point:** `_harness/cc_broll_parity_activation_20260729/rollback.sql`, one
`execute_sql` call. It is self-verifying, refuses a state it did not create, and proves its own restore
digest-exact. **The EF does not need to be rolled back with it** — v3.15.0's overlay is keyed to a
template that stops being selected the moment the rollback commits, so it becomes inert, not wrong.

---

## 6. Blast radius / what is NOT touched

- **Other clients:** unaffected. NDIS and others reject `dd5fd75e` upstream at `no_assignment`, which sits **above** `fit_status`.
- **Explicit-platform calls** (fb/ig/li) already resolve the incumbent and are unchanged; `youtube` remains `fail_closed` — **pre-existing**, all three templates lack a youtube suitability row, and that gate runs before `fit_status`. Not caused or fixed here.
- **Legacy video paths, image-worker, `renderUploadAndLog`, `pollRender`, `composeRenderSpec`, the audio guards, voice/TTS, claim/publish:** byte-unchanged.
- **No DDL, no migration, no grant, no secret, no registry-row mutation.**

---

## 7. Disclosed trade-offs (PK decisions, not defects)

1. **Smoke guard widened from one id to a two-member set.** `governed_video_stat_smoke` previously
   asserted exactly `c11bb8ab`. A single-id constant is red in one of the two valid selector states, so
   it cannot survive an activation *and* its rollback — the rollback path itself would fail the smoke.
   The set is `{c11bb8ab, 46c5c4ac}`; both render the governed output contract (the first natively, the
   second via the overlay). Any other id still refuses to render. This is a deliberate, bounded
   weakening of a drift guard in exchange for a smoke that is green in both directions.

2. **The registry row for `dd5fd75e` still reads `width=720 / height=1280 / duration_seconds=8` and is
   left untouched.** Those columns describe the **provider object**, which really is 720×1280/8s; the
   1080×1920/12s is produced at render time by code. Setting them to 1080/1920/12 would make the
   registry describe something untrue — the same class of error TPR-1 exists to prevent. **Consequence:
   TPR-1's cheap check (`SELECT width,height,duration_seconds FROM c.creative_provider_template`) now
   returns a misleading answer for this one template.** Mitigation shipped in this lane: every governed
   render stamps `render_spec.template.tmr.output_spec` with the effective spec and its source, which is
   machine-checkable per render. **Recommended TPR-1 addendum for PK ratification:** the output-spec diff
   must consult the registry row **and** `B1_VIDEO_TEMPLATE_OUTPUT_PARITY`; a template appearing in the
   overlay map is diffed on its *effective* spec, not its stored one.

3. **One-clip pool (carried, unchanged from v6.48).** Exactly one eligible `broll_background` asset
   (`2d62b04e`), so the seeded pick is deterministic — **every PP governed video gets the identical AU
   suburb aerial** until Asset Gap "Video B-roll Intake v1" lands. PK accepted this knowingly at v6.48;
   it is re-surfaced here because activation makes it live again.

4. **Pre-activation proof used `p_variant_intent='stat-reveal-9x16-broll-v1'`** — the only deviation
   from the production call signature, and the only way to reach the B-roll template before the repoint.
   Post-activation the same template is returned at `p_variant_intent=null` and `selected` derives from
   the same registry row, so the plan inputs are identical. Step 7 above re-proves it on the real
   production signature after apply.

---

## 8. Review chain

| Check | Verdict | Note |
|---|---|---|
| Hermetic tests (142) | **pass** | full `video-worker` suite |
| `deno check` entrypoint | **pass** | |
| Live rollback proof | **`ROLLBACK_PROOF_PASSED`** | digest-exact, zero production effect |
| Production-shaped render proof | **pass** | TPR-1 `specs_match=true`, audio binds, 34.1s |
| Git state | **safe** | `main`, HEAD `2b5e44b`, parity `ahead 0 / behind 0`; change set = exactly 3 tracked files + this packet + the harness dir |
| External review (`ask_chatgpt_review`) | **partial → escalate** | see §8.1 |
| `db-rls-auditor` / `branch-warden` | **orchestrator-run substitution** (CCF-02 R1) | this session was instructed not to spawn subagents; the equivalent read-only checks were run inline and are named above. PK may still route the packet to the registered agents before Gate 2 — the packet is frozen and hash-pinned for exactly that. |

### 8.1 External review record

**Round 1** — `review_id 60b2a205-02c5-49bf-92a6-ca5c570431d4`, `reviewed_input_hash`
`a697274ce4d1b18d72117eac7150872c2feb60a28b28f20018541a64963f445f`.
Verdict **`partial`** · risk **medium** · confidence **high** · **`pushback_points: []`** ·
`requires_pk_escalation: true`.

- **Verified:** the 142-test pass, the TPR-1 `specs_match=true` production-shaped render proof, the
  zero-effect rollback proof, and that `forward.sql`'s guards are executable `RAISE`s rather than
  comments.
- **No concrete defect** was raised against the overlay design, the merge order, the ordering
  precondition, the guard set, or the rollback story.
- **Escalated items:** the two-id smoke-guard widening and the untouched registry row — i.e. exactly the
  two trade-offs §7 already discloses. **Triage class: `policy_decision`** (a judgment call, not a
  defect). CCF-02 routing sends `policy_decision` to the PK decision gate, which is where this lane
  stops regardless.
- **Acted on:** the review's `corrected_action` asked for additional hardening/coverage on the widened
  surfaces. The allow-list canary tests in §4.1 were added in response (142 tests, was 140). The
  registry-row question is left to PK as §7(2), with the proposed TPR-1 addendum.

**Round 2** — re-run after the canary tests were added, because a review is valid only for the hash it
reviewed (rule 1) and round 1's pin `a697274c…` went stale the moment the tests landed.

`review_id 698990b8-6ac2-463e-b5c3-041fc8da01ba`, `reviewed_input_hash`
**`8f0e3c1f56b59242d5b66a9f2ea14ca9ca577b64bacb655a101ec898368e4fbf`** (packet) /
`98fad434eb0779205f8a19a8d827b348c15f756f4e2ebd6e494fecb5f21e0cac` (code diff).
Verdict **`partial`** · risk **medium** · confidence **high** · **`pushback_points: []`** ·
`requires_pk_escalation: true`.

Round 2 **converged with round 1**: it verified the canary tests pass, that no production behaviour or
SQL changed between rounds, and that nothing is applied or deployed — and again raised **no concrete
defect**, escalating only the same two `policy_decision` items for human judgment.

> **Hash-pin note (deliberate, not a stale pin).** `8f0e3c1f…` is the hash of the packet **as
> reviewed**. This §8.1 round-2 record was appended afterwards, so the packet's current hash differs by
> exactly this block. The reviewed artifact — the plan, the SQL, the code diff, the STOPs, the disclosed
> trade-offs — is unchanged. Re-pin before apply with:
> `python -c "import hashlib;print(hashlib.sha256(open('docs/briefs/broll-parity-activation-v1-apply-packet.md','rb').read()).hexdigest())"`
> and re-review if anything **other than** this record has moved.

**CCF-02 triage + routing for this lane:** class `policy_decision` → **PK decision gate**. There is no
`concrete_defect` to fix and no `missing_evidence` to gather; the two escalated items are PK's calls to
accept or reject (§7). `runtime_verification_required` is satisfied by the named post-apply steps 7–8.

---

## 9. Concurrent-session notice

`docs/00_sync_state.md` and `docs/00_action_list.md` are dirty in the shared worktree with an
**uncommitted v6.53 claim** (Creatomate Template Graduation Matrix v1) belonging to another session.
This lane therefore claims **v6.54** and will stage **only its own files** at commit time. Per the
v6.52 corrective rule, the full `origin/main..HEAD` commit list must be inspected before any push.

---

## 10. Artifacts

**Tracked (git-anchored) copies of the two files that get executed** — `_harness/` is gitignored
(`.gitignore:21`), so the apply/rollback pair is also committed under `docs/briefs/artifacts/` for
durability. Verified **byte-identical** to the harness originals:

| tracked path | sha256 (16) | harness original |
|---|---|---|
| `docs/briefs/artifacts/broll-parity-activation-v1-forward.sql` | `ae0990542b928b06` | `_harness/cc_broll_parity_activation_20260729/forward.sql` |
| `docs/briefs/artifacts/broll-parity-activation-v1-rollback.sql` | `756621ca09fb1480` | `_harness/cc_broll_parity_activation_20260729/rollback.sql` |

*(Location-only addition made after the §8.1 round-2 review pin; the SQL bodies are unchanged and
still hash to the values the review saw. Evidence artifacts — the rollback proof and the render proof —
stay in `_harness/` per convention.)*

### Harness inventory

`_harness/cc_broll_parity_activation_20260729/` (sha256, first 16):

```
build_plan.ts                  2a8054a7f7037781
forward.sql                    ae0990542b928b06
gen_and_upload_vo.py           0713cc9ae52ea9ef
live_selection.json            c4d30cca3af2e543
live_selection_incumbent.json  d619b0758f433a2a
plan.json                      e5a38f71a10a3463
pp_vo.mp3                      b769b3a6da014381
render_proof.py                eb7f6767951ae5e3
render_proof_meta.json         83367036367faa06
rollback.sql                   756621ca09fb1480
rollback_proof.sql             b3ffbacae81c788e
rollback_proof_output.txt      2cf36ec3a545fd34
```

Renders + frames under `renders/`. Predecessor evidence:
`docs/briefs/results/broll-template-parity-v1-result.md`,
`docs/briefs/results/broll-production-activation-v1-result.md`,
`_harness/cc_broll_parity_20260729/`, `_harness/cc_broll_activation_20260728/`.
