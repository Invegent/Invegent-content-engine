# WS-5 Constraints Shape + Write RPCs + Intake Validator — Design Lane Result (v1)

**Lane:** ws5-constraints-shape-and-kinetic-registration, Phase 1 (seed packet relayed 2026-08-01)
**Tier/class:** T2 · SIDE_PROVING (design/docs only this lane at authoring time; ~~the packet's migration is NOT applied~~ — **UPDATED 2026-08-01: APPLIED AND LIVE**, see "APPLIED — live record" section below)
**Status:** ~~`DESIGN COMPLETE — STOPPED AT THE PK APPLY GATE`~~ → **`DESIGN COMPLETE — APPLIED AND LIVE (2026-08-01)`** (PK authorised + executed against frozen hash `7cc5636d…`; see the "PK apply gate" row and "APPLIED — live record" section below)
**Deliverable:** `docs/briefs/ws5-constraints-shape-and-write-rpc-design-packet-v1.md`
**Packet sha256 (pre-review, rev-0):** `013c74699a2205703aa2f841705750b2cd95bdd86fc501efb46bcb1effd3db2f`
**Packet sha256 (FINAL, rev-1):** `7cc5636dad5a518fe53597cdde9aadbf644a3077e7e4cc47899182c786c81b49`
— the hash external review and the PK gate must pin. Any further edit = new hash = stale reviews.

## What was designed (Phase 1, all three seed items)

1. **`tmr_field_constraints_v1`** — the per-field `constraints` jsonb shape for
   `c.creative_provider_template_field` (packet §2), vocabulary drawn from
   `branch-b-template-capability-contracts.md` §1/§3 and the WS-4 kinetic package §6/§7/§9 (the
   named 26-field input). Calibration triples make `to_be_calibrated` machine-checkable; numbers
   without a basis/citation cannot exist in the shape.
2. **`tmr_platform_constraints_v1`** — the platform-suitability sibling (packet §2a): aspect,
   safe zones (caption band), scene contract, duration bounds — the composition-level facts with
   no column home (kinetic's variable 20–45 s duration cannot live in `duration_seconds`).
3. **Governed write RPCs** (packet §5): 3 private fail-closed validators in schema `c` + 4
   service-role-only SECDEF writers (`record_tmr_template_field`, `set_tmr_field_constraints`,
   `record_tmr_platform_suitability`, `set_tmr_platform_constraints`) — insert-only or
   md5-CAS, no upsert, no status elevation, proof-RPC conventions throughout.
4. **P-7 first consumer** (packet §3/§5 fn 8): `public.validate_tmr_template_intake` — the
   operator template-intake validator, checks C1–C10, two modes (declared-only usable NOW on the
   kinetic contract; capture-check for Phase 2). Zero-inert-fields coverage matrix at packet §7.

## Review chain record

| Stage | Verdict | Notes |
|---|---|---|
| `apply-harness-auditor` (SHADOW — clears/blocks nothing; run via its backing helper `.claude/helpers/apply-harness-auditor.mjs` because the registered agent-type is not invocable in this session — same fallback precedent as the creative-graph-auditor A1.4 manual smoke) | CONCERNS — rev-0: 4 findings; rev-1 re-run: 5 findings, same family | **All dispositioned as mechanical false positives** by the invoker (this session, per the shadow-mode contract "audit left to the invoker"): the helper's declared-STOP scraper matched the tier labels "T2"/"T3" and the precedent references "TMR-3"/"TMR-4" in §6 prose and reported them as unenforced declared controls. The packet's only declared *executable* control is the §0 DO-block precondition, which IS present in the SQL (checked: 8 signatures probed, RAISE on any hit). No declared-control-without-enforcement exists. Check-7 (apply/rollback identity — the named watch item): 8 CREATEs ↔ 8 DROPs, 1:1. |
| `db-rls-auditor` (registered subagent, live catalog reads via db-read.py) | **concerns → all 4 should-fix APPLIED (rev-1); 0 must-fix** | Verified sound against live `mbkmaxqhsohbtwsqolns`: REVOKE/GRANT posture necessary-and-present on both schemas (live default ACLs grant EXECUTE to anon/authenticated on new `public` fns; schema `c` has anon/auth USAGE, so helper REVOKEs are load-bearing too); both UNIQUE keys the RPCs rely on confirmed in `pg_constraint`; all CHECK vocabularies confirmed (RPC sets are deliberate strict subsets); no name/signature collision (only `record_tmr_proof_event` exists); CAS/`FOR UPDATE` race-safe; regex interpolation safe behind the name gate; single-txn + DO-block precondition + 8↔8 apply/rollback identity confirmed. **Fixes applied:** (1) C1 widened to `scope <> 'generic'` — a `brand` row passed silently before; (2) declared-input type guards before every cast (no raw 22P02); (3) free-text RPC params bounded + secret-scanned; (4) migration name minted `_v2`, unused `_v1` retired. **Two residuals it could not close (no `execute_sql` in its session or this one)** → folded into packet §6 as named pre-apply STOP checks: re-verify the all-NULL `constraints` baseline; confirm the live PostgREST exposed-schema list. |
| External review (`ask_chatgpt_review`) | **CLEAN — agree · medium risk · high confidence · escalate false · zero pushback** | **Executed 2026-08-01 by the programme-planning session (bridge-holder) on PK's explicit directive** ("Fire external review now against frozen hash 7cc5636d…; no apply authority is granted"), relayed cross-session to this lane. `reviewed_input_hash` = `7cc5636dad5a518fe53597cdde9aadbf644a3077e7e4cc47899182c786c81b49` (byte-exact re-verify immediately pre-review; 78,139 bytes / 1,338 lines) — equals the FINAL rev-1 hash above, so the review is valid for exactly this packet. `review_id` = `1cbce433-fcc5-4eeb-ae41-360f4442beb5`. Under house rules this clears ONLY the external-review link of the chain. Any further packet edit = new hash = this review is stale and must re-run. |
| Packet §8 Q1–Q5 | **DECIDED — PK 2026-08-01 (direct, this session): "accept the packet's recommendations as written"** | Q1 suffix vocabulary frozen at 7 · Q2 platform vocabulary frozen at 5 · Q3 suitability-status ceiling at `needs_review` (elevation stays a separate governed act) · Q4 Phase-2 capture appends one `inventory_audit` row per batch · Q5 population order = kinetic first, then the B0/stat templates. Recorded here; the packet itself is unmodified (hash preserved). |
| Pre-apply check 1 — all-NULL constraints baseline | **CLOSED — CONFIRMED (live `execute_sql`, 2026-08-01, this session)** | `c.creative_provider_template_field`: 144 rows, 0 non-null `constraints` · `c.creative_template_platform_suitability`: 66 rows, 0 non-null. Exactly the packet's claimed baseline (suitability rows additionally confirmed all-NULL). |
| Pre-apply check 2 — live PostgREST exposed-schema list | **CLOSED — CONFIRMED empirically (REST probe, 2026-08-01)** | PGRST106 contrast probe returned the authoritative live list: `public, graphql_public, k, f, m, c, r, a, t, friction` — **schema `c` IS exposed**, as prior evidence said. Anon probe on the field table via `Accept-Profile: c` correctly bounced `42501 permission denied` (table grants hold). Consequence confirmed: the §9 function REVOKEs are load-bearing (new `c`-schema functions would otherwise be REST-callable by anon via default PUBLIC EXECUTE + anon USAGE on `c`). |
| Pre-apply advisor baseline (optional, auditor-suggested) | **CAPTURED** | `get_advisors(security)` 2026-08-01: 251 findings — 3 ERROR `security_definer_view` · 92 WARN `function_search_path_mutable` · 50 WARN `authenticated_security_definer_function_executable` · 41 WARN `anon_security_definer_function_executable` · 61 INFO `rls_enabled_no_policy` · 4 other WARN. Only "tmr" hits: two INFO deny-all-RLS notes on unrelated `c.tmr_drift_probe_run`/`c.tmr_shadow_decision`. **Post-apply expectation: ZERO new findings** — in particular none of the 8 new functions may appear under the two SECDEF-executable classes or `function_search_path_mutable`. |
| PK apply gate | **AUTHORISED & EXECUTED — 2026-08-01** | PK (direct, this session): "Apply authorised against hash 7cc5636d — execute the sequence." Pre-apply hash re-verified byte-exact = the authorised hash (STOP #1 clear); §5 SQL extracted byte-exact (48,331 B, extraction sha256 `6cbe52dc…`, 8 creates/8 revokes/8 grants confirmed). |

## APPLIED — live record (2026-08-01)

- **Channel:** ONE `apply_migration` call (the named single-call channel), name
  `tmr5_field_constraints_write_rpcs_and_intake_validator_v2`, minted version **`20260801043347`**
  (ledger row confirmed). The §0 fail-closed DO-block precondition passed (no pre-existing
  signature). In-repo record of the applied statement:
  `supabase/migrations/20260801043347_tmr5_field_constraints_write_rpcs_and_intake_validator_v2.sql`
  (ledger⇄git drift closed same-day). Honest delta note: the applied string carried §5's
  executable statements byte-faithfully; §5's trailing reference-only ROLLBACK **comment** block
  was not part of the applied string (non-executable; preserved in the repo migration file).
- **Post-apply verification (all PASS, recomputed from ground truth):**
  1. 8/8 functions live; 5 public entry points `prosecdef=true` + `proconfig={search_path=""}`;
     3 `c`-schema helpers `search_path=""` pinned; **all 8 ACLs exactly
     `{postgres=X, service_role=X}`** — anon/authenticated absent.
  2. **Zero rows written:** field 144/0 and suitability 66/0 unchanged; smoke throwaway rows 0.
  3. **Advisors 251 → 251:** zero new findings, zero resolved, zero naming any of the 8 new
     functions (exactly the declared acceptance).
- **Acceptance smoke — `WS5_SMOKE_PASS`, 6 checks, self-aborting transaction (nothing persisted):**
  (a) good `HookHeadline` insert → `ok` · (b) duplicate → `field_already_exists` · (c) unknown
  top-level key → `constraints_invalid:constraints_unknown_key` · (c2) element/key prefix
  mismatch → `constraints_invalid:modification_key_invalid` (discovered live in smoke run 1,
  where a script bug passed HookHeadline-keyed constraints under CtaHeadline and the RPC
  correctly fail-closed — an unplanned live proof of the prefix guard) · (d) TBC triple carrying
  a number → `limit_tbc_must_have_null_value` · (e) `validate_tmr_template_intake` declared-only
  mode → `verdict=pass`, `calibration_required=[{HookHeadline, max_lines}]`.
- **Rollback posture:** the 8 exact-signature `DROP FUNCTION`s (packet §5 tail) remain valid —
  no data was written, so rollback stays a pure function drop.

**Lane state: WS-5 Phase 1 COMPLETE AND LIVE.** The constraints shapes, governed write RPCs, and
the P-7 intake-validation consumer exist in production, dark (no caller until the Phase-2 capture
lane). |

## PHASE 2 — kinetic template registry capture (EXECUTED 2026-08-01)

**Unblock:** PK delivered `{generic_kinetic_text_9x16_v1, 0bd871ae-79c1-431a-a7bd-9f631a6cf75a}`
directly (with layer-list screenshots — all 26 element names verified exact; deviations: none).
**Declared contract:** `docs/briefs/artifacts/ws4-kinetic-declared-contract-v1.json`
(sha256 `eecab2e731216ff2a692f3ac2570e82bbad1b0c7d084175f2b5bc5eaf120020f`; 26 elements; zero
invented numbers — every limit `declared_from_source` ai-worker/index.ts:728 or
`to_be_calibrated`). **Declared-only intake validation: `pass`, 0 hard** (10 `calibration_required`
items = the probe queue; 6 advisory shape-collapse warnings only).
**External review (capture plan): CLEAN** — agree · medium · high · zero pushback,
`review_id f7c1a748-8780-4dab-8e53-d9811e9a47c2`, pinned to the artifact hash.
**PK capture authorisation:** direct, this session ("capture … and go").

**Executed** as ONE self-aborting transaction (any failure → full rollback): template row
(`scope='generic'`) → 26 × `record_tmr_template_field` (each fail-closed shape-validated) →
1 × `record_tmr_platform_suitability` (youtube/default, `candidate`) → 1 append-only audit row
(Q4) → **in-transaction gate `validate_tmr_template_intake(tid, contract)` = `pass`/0-hard**.

**Post-capture ground truth:** registry id **`9ad024cc-3eda-488e-b346-bc661ec70a6a`** ·
`scope='generic'` · `status='inventory_captured'` · `inventory_hash` = artifact hash · 26/26
field rows all with constraints · 1 suitability + 1 audit row · table totals 144→170 fields /
66→67 suitability, **non-null `constraints` 0→26 (exactly the kinetic rows — the NULL era ended
here, P-7 consumer already consuming)**. Dark by construction: no client assignment, no variant
candidate, no proof events — invisible to `select_template` until graduation.

**Post-capture db-rls-auditor pass on the written rows: CLEAN (`pass`, high confidence, 0
must-fix / 0 should-fix)** — template row exact-match on every attribute incl. `scope='generic'`;
26/26 element names + constraints shape verified; modification-key prefixes checked across ALL 26
rows (zero violations); zero invented numeric limits (spot-checked citations); blast radius exact
(170/26/67, all 144 pre-existing rows still NULL); dark-capture confirmed (0 assignment, 0
variant rows); **advisors still exactly the 251 baseline — zero new findings.**
**Orchestrator hash-checkpoint (auditor-named step): CLOSED** — artifact bytes recomputed
2026-08-01: sha256 = `eecab2e7…` = the stored `inventory_hash`, byte-exact (artifact committed at
`b72efc8`).
**Carries from the auditor (recorded, not blockers):** (1) the five TMR `c.*` tables' deny-all
RLS (enabled, zero policies) is a PRE-EXISTING posture inside the 251 baseline — if these tables
are ever served to dashboard callers, that needs explicit policies or an RPC (its own lane);
(2) `evidence_reference` semantics for `declared_from_source` limits: the `source` citation IS
the terminal reference by design (packet §2 — `evidence_reference` is mandatory only for
`probe_calibrated`); recorded here as the authoritative answer.
**Audit row review fields (`reviewed_by`/`decision`) intentionally NULL** — the capture is dark
and awaits the graduation-lane gates.

**Next (WS-4 loop):** probe renders against the 10-item calibration queue — first probe =
top-level `duration` overridability (WS-4 pkg §15 Q4, highest-leverage) — then PK visual verdict,
then 13-rung graduation.

## PROBE 1 — duration overridability (EXECUTED 2026-08-01, PK-authorised) — **Q4 = YES**

Two paid renders on the live template (key conveyance per cc-0033 precedent; key found ROTATED —
new pin `bcde13d1` validated read-only before spend; value never in transcript):

| Probe | Result | ffprobe duration | Wall-clock | Render id |
|---|---|---|---|---|
| A_control (no override, `HookHeadline.text` modified) | succeeded | **35.00 s** (= saved) | 30.9 s | `982e8abb-1e48-4240-94b9-39ef2fd57526` |
| B_bare_duration_mod (`"duration": 27` inside `modifications`) | succeeded | **27.00 s** | 23.4 s | `fc7e2707-7507-4d82-bb29-e690112b0ae4` |

Findings: (1) **the §5 timing mechanism is viable as designed** — bare `duration` modification
key overrides the saved 35 s timeline exactly; fallback probe C not needed; (2) **suffixed
modification-key form confirmed on the video family** (cc-0049's resolution now proven beyond
image cards); (3) reliability: both renders far under the 2-min ceiling (§9a); (4) bonus rung-1:
provider existence confirmed by DIRECT `GET /v1/templates` read (id + exact name). mp4 sha256s:
`58abac67…` (A) / `bc8c6e9d…` (B); local evidence `_harness/ws5_kinetic_probe1_duration/`
(untracked by repo convention — this section is the canonical record).
**Proof event recorded** via `record_tmr_proof_event`: `smoke_render`/`passed`, evidence =
render id `fc7e2707…`, `proof_event_id 25c20718-5028-45fa-a826-0a7854ddca87`.
**Remaining probe queue:** collapse-mechanism leak test (§15 Q2) · shape-element timing overrides ·
`source:""` silence on this composition · the 10 text-calibration items.

## PROBE 2 — structural batch (EXECUTED 2026-08-01) — render OK; **TWO TRANSPOSITION DEFECTS FOUND**

One render (`D_two_point_collapsed`, id `304161dc-c3bb-4028-a8b3-9385c7e9105c`): the WS-4 §5a
representative composition as template-mode modifications — hook + 2 points + Point3 collapsed
via guards 1+2 (guard 3 off-canvas is UNREACHABLE in template mode under the ratified 7-suffix
vocabulary — no `.y` key; recorded as a design fact). Succeeded, 27.00 s exact, wall-clock
27.7 s.

**Answered cleanly:**
- **Audio (§14): CONFIRMED** — zero audio streams in both probe files; `source:""` = silent by
  absence, not an error, on this composition.
- Duration override re-confirmed (27.00 s), text mod-keys re-confirmed.

**Defects found (frame inspection + saved-source API read; BOTH trace to the operator-guide
paste JSON, which inherited the syntax from WS-4 pkg §5a — NOT a PK build error):**
1. **All 9 shape elements pathless** — the guide used `"shape": "rectangle"`; Creatomate
   templates require `path`; the editor silently dropped the unknown key, so Background/BarTop/
   BarBottom/bars/dividers render NOTHING (black canvas, no chrome). House memory
   `creatomate-direct-source-render-recipe` ("shapes require path") strikes again — in the
   template-paste context this time.
2. **Opacity unit mismatch** — CSS-style fractions (`0.7`) were saved by the editor as PERCENT
   (`"0.7%"`), rendering 12 decorated elements (counters/subtitle/bars/dividers/watermark/footer)
   at <1% opacity — present but invisible.

**Consequence for Q2 (collapse leak): INCONCLUSIVE this probe** — the collapsed Point3 elements
that could visibly leak are exactly the currently-invisible shapes, so a leak cannot be observed
until the template is fixed. Pixel scanner (Windows temp-file variant) verified working data path;
zero teal anywhere including the self-proof region — consistent with the shape defect, not with
a clean collapse. **Q2 re-runs after the fix.**

**Fix issued (no registry change needed — layout geometry is provider-side; the captured
constraints encode neither paths nor opacities):** corrected full template source generated from
the SAVED source + the production-proven Scrim syntax (path added to 9 shapes, 12 opacities →
percent strings): `docs/briefs/artifacts/ws4-kinetic-template-source-corrected-v2.json`
(sha256 `072fd3ed…`), delivered to PK to paste over the template in the editor; operator guide
§6 banner-superseded. **Waiting on PK re-save, then probe 2 re-runs (one render).**
**Package feedback for the WS-4 record:** §5a's source-mode JSON syntax (`"shape":"rectangle"`,
fraction opacities) does not survive the editor-paste path — a v2 of the package should carry
editor-schema source (path + percent strings). The §2 provenance claim ("carried unchanged from
the proven legacy builder") holds for geometry/timing but NOT for these two syntax classes,
because the legacy path renders via API source-mode where the units/keys differ.

## PROBE 2b/2c — fixed template re-run + Q2 RESOLUTION (2026-08-01)

PK re-pasted the corrected source (verified by API read: 9/9 shapes with paths, 12/12 percent
opacities, same name/id). Two renders:

| Probe | Collapse mechanism under test | Verdict | Evidence |
|---|---|---|---|
| **2b** `D2_two_point_collapsed_fixed` (`40083e31…`, 23.7 s wall) | guards 1+2 (near-zero duration + empty text) | **LEAK** — Point3Bar paints frame 0 (1500 teal px at t=0.0; zero at t≥0.033). Detector self-proof PASSED this time (BarTop 8640/8640 · Point1Bar 1500/3000), so the verdict is trusted. Confirms WS-4 §14's suspicion: `duration: 0.01` still renders one frame | mp4 `8020b524…` |
| **2c** `D3_offtimeline_collapse` (`49159807…`, 26.6 s wall) | **off-timeline** — collapsed elements' `.time` = 9999 (beyond the 27 s composition) + duration 0.01 + empty text | **NO LEAK** — zero teal at t = 0.0/0.033/0.066/0.1/0.5/1.0/26.9; detector self-proof passed; duration 27.00 exact; Creatomate accepts `time > duration` without error | mp4 `139da509…` |

**Q2 RESOLVED: the production collapse mechanism for template mode is OFF-TIMELINE
(`.time` beyond composition end), with near-zero duration + empty text as belt-and-braces.**
The fixed-slot design (§4) is VIABLE — no per-scene-count template variants needed. Visual state
confirmed by frame inspection: the full §13 design now renders (navy canvas, teal chrome,
counters, bars, dividers, watermark).
**Proof event:** `smoke_render`/`passed`, evidence render `49159807…`,
`proof_event_id bc738219-54c7-42ce-b1d4-76decba6b1f1`.

**Named governance carry (small T2 lane, PK gate):** the collapse-mechanism vocabulary in
`c.tmr_validate_field_constraints` + the 15 captured conditional rows' `collapse.mechanism`
arrays list `(near_zero_duration, empty_text, off_canvas)` — probes now show `off_canvas` is
template-mode-unreachable (no `.y` in the ratified 7-suffix vocabulary) and the working guard is
`off_timeline`. Carry: add `off_timeline` to the validator vocabulary (function migration, new
name) + CAS-update the 15 conditional rows via `set_tmr_field_constraints` + note `off_canvas`
as source-mode-only. Worker guidance until then: collapse = `.time=9999` + `.duration=0.01` +
`.text=''`.

**Probe queue remaining:** the 10 text-calibration items (hook/point/CTA max_lines sweeps,
worker-string max_chars) — then PK visual verdict on a full 3-point render, then graduation.

## PROBE 3 — text calibration batch (EXECUTED 2026-08-01, PK-authorised) — **ALL 10 ITEMS CALIBRATED**

Two renders, every text slot at its exact char gate simultaneously:
`R1_realistic` (`480d4333…`, 40.8 s wall, sha `f75331e4…`) · `R2_wideglyph` machine-built
worst case (`5976f431…`, 42.3 s wall, sha `ba8f7a35…`). Both 35.00 s. **Caption band
(y1300–1520): ZERO intrusion in all six point-scene measurements — even 100-char bodies.**

| Field (gate) | Realistic | Wide-glyph worst | Calibrated value |
|---|---|---|---|
| HookHeadline (60ch) | 3 lines, clean | **8 lines — overflows the 960×700 box** (recorded; realistic prose never approaches this; `overflow_risk` stays `high`) | `max_lines: 3` |
| PointNHeadline (55ch) | 3 lines | 4 lines — no divider collision | `max_lines: 4` |
| PointNBody (100ch) | 3 lines | 5 lines — band still clear | (no TBC slot; evidence recorded here) |
| CtaHeadline (65ch) | fits centered | 5 lines — fits 880×600 | `max_lines: 5` |
| HookSubtitle (40ch) | 1 line | 1 line | `max_chars: 40` |
| PointNCounter (5ch `10/10`) | 1 line | 1 line | `max_chars: 5` |
| CtaFooter (50ch, longest client name) | 1 line | wraps to 2 centered lines, still clean (cta scene — caption-band rule inapplicable, footer collapses under a caption variant) | `max_chars: 50` |

**Registry recorded:** 10 CAS updates via `set_tmr_field_constraints` (each verified
`to_be_calibrated`-before / `ok`-after), triples now `probe_calibrated` with evidence = both
render ids. Ground truth: 0 TBC remaining, 10 probe-calibrated-with-evidence.
**Calibrated contract artifact:** `docs/briefs/artifacts/ws4-kinetic-declared-contract-v2-calibrated.json`
(v1 stays untouched — its hash remains the capture-time `inventory_hash`, honest lineage).
**Formal capture-check vs v2 (the P-7 consumer demonstrably reading calibrated metadata — the
WS-5 DoD clause): `pass` · 0 hard · 0 calibration_required · 0 findings** (6 standing advisory
shape-collapse warnings only). Proof event `abcf33b6-09ac-43ac-900a-10ec4ca669ce`.
**Render-reliability ledger to date (§9a):** 30.9 / 23.4 / 27.7 / 23.4 / 26.6 / 40.8 / 42.3 s —
all far under the 2-min ceiling, 7/7 succeeded, zero timeouts.

**REMAINING before graduation:** PK visual verdict on a full three-point render (rung 6) →
then the ICE-side graduation lane (variant candidate + PP client assignment + supervised
render → real draft → publish proof, rungs 7–13). Audio/voice stays a separate PK election
(§15 Q3). Also carried: the `off_timeline` vocabulary lane (from probe 2).

## PK VISUAL VERDICT (rung 6) — **"visually approved"** (PK direct, 2026-08-01)

Verdict given on the R1 realistic-max render (`480d4333…` — full 3-point 35 s, every field at
its char gate). Proof event `visual_approval`/`passed` recorded:
`proof_event_id 2ccdb697-0553-46e6-bc97-e4ef9d79fb49`, evidence = the render id.
**Rung-6 strictness note (recorded, not waived):** the graduation contract wants visual approval
attached to the SPECIFIC client assignment being graduated; no assignment row exists yet (dark
capture — deliberately). This template-level approval anchors the verdict + evidence; the
graduation lane re-anchors it client-specifically when the PP assignment row is created (the
contract itself notes rung 6 may precede rungs 2–5 full pipeline verification; row-26 precedent).
Template `status` deliberately NOT elevated (no status-transition RPC exists; elevation is the
graduation lane's own governed act).

**Lane frontier now:** the WS-5 seed packet is fully executed (shape → RPCs → consumer → capture
→ probes → calibration → visual verdict). What remains to close the PP YT kinetic cell (D4) is
the ICE-side graduation lane — its own Gate-1: variant-candidate row (`video_short_kinetic`) +
PP client assignment + worker-side render path (the §16 named gap: kinetic has no governed
worker branch yet — THAT is the real build) + supervised render → real draft → publish proof
(rungs 7–13) + S7's self-healing allocation pickup.

## CLOSE-OUT RECONCILIATION (PK consistency question, 2026-08-01) — evidence-exact

**Premise correction (against the record, verbatim-checkable):** Q2 did NOT resolve the design
to a fixed 1–2 point-slot contract. WS-4 pkg §15 defines **Q1** = slot COUNT (3-slot default vs
a simpler 1-or-2 alternative — the default was adopted at transposition and never overturned)
and **Q2** = collapse-mechanism TRUST ("does the collapse prove sufficient, or does an unused
slot leak a frame? This gates whether the fixed-slot design (§4) is viable at all, or whether
kinetic needs … separate 3/4/5-scene template variants"). Probe 2b/2c resolved Q2 by **validating
the 3-point fixed-slot design** — collapse = off-timeline, leak-free, "no per-scene-count
template variants needed." The design before and after Q2 is the SAME 26-element / 3-point-slot
contract; Q2 selected a runtime modification recipe, not a composition change.

**The five requested evidence items:**
1. **Provider template actual point elements** (saved source read from the live API after the
   syntax fix): 26 elements; exactly 15 point elements = 3 full slots —
   `Point{1,2,3}{Counter,Bar,Headline,Divider,Body}`.
2. **Captured registry field rows** (live query): 26 rows; the identical 15 `Point*` rows;
   `slot_key` set = `{chrome, hook, point1, point2, point3, cta, audio}`.
3. **Hash implemented by the captured template:** registry `inventory_hash` =
   `eecab2e731216ff2…` = the v1 declared contract byte-hash, which declares all three point
   slots and `scene_contract {min_active_scenes: 3, max_active_scenes: 5}` (i.e. 1–3 ACTIVE
   points per render + hook + cta — activity is per-render, slots are fixed at 3). Calibrated
   v2 artifact `ce578164…`; corrected editor source `072fd3ed…`.
4. **Calibration render point count:** all THREE points active in both renders (mods set
   `Point1/2/3` texts) — intentionally: calibration loads every slot at its char gate.
5. **Is the captured template definitively the post-Q2 design? YES.** The only template mutation
   after capture was the probe-2 syntax fix (shape paths + opacity units) — zero change to
   element names, slot structure, or anything the registry constraints encode. Q2 changed no
   composition property. **Therefore the calibration and the visual approval stand as evidence
   for the current contract — no correction, recalibration, or verdict re-anchor is warranted.**

**One genuine adjacent delta, already a named carry (not silently absorbed):** the captured
constraints' `collapse.mechanism` arrays predate the Q2 finding (they list
`near_zero_duration/empty_text/off_canvas`; the probe-proven mechanism is `off_timeline`, and
`off_canvas` is template-mode-unreachable). That is the standing **off_timeline vocabulary
lane** (validator vocab + CAS updates of the 15 conditional rows, own T2 gate). It affects no
calibrated limit and no visual property; the graduation-lane worker build uses the proven
off-timeline recipe regardless.

**If PK intends a NEW design decision to reduce the contract to 1–2 point slots:** nothing in
this session's record contains or supports such a decision — it would be a fresh WS-4 design
change (new package revision → template edit → re-capture → re-calibration), explicitly NOT
started here.

## POST-CLOSE ADDENDUM — WS-4 "stale calibration" handoff RECEIVED, HELD AT PK DESIGN GATE (2026-08-01)

After close-out, the WS-4 specialist session (`creatomate-specialist-charter-and-kinetic-design`)
sent a facts-only handoff asserting the capture is stale and asking for revision to a **1–2
point-slot / 21-element** contract (retiring Point3), collapse via "empty-text + off-canvas ONLY".

**Empirical CONCURRENCE (independent replication, both lanes agree):** their Q4 duration-override
PASS ≡ this lane's probe 1; their Q2 near-zero-duration frame-0 leak (149/150 frames clean,
frame 0 legible) ≡ this lane's probe 2b (1500 teal px at t=0.0, zero at t≥0.033). Two
independent probe harnesses, same physics. No factual dispute.

**Design-conclusion CONFLICT — three facts that session did not have:**
1. **Probe 2c (this lane, on the ACTUAL captured template):** OFF-TIMELINE collapse
   (`.time` beyond composition end) is **leak-free** (render `49159807…`, 7-timestamp scan,
   detector self-proof) — which restores full 3-slot viability. Their revision predates/knows
   nothing of this mechanism.
2. **Their proposed mechanism is unimplementable in template mode:** "off-canvas" requires
   per-render positional modification keys; the PK-ratified 7-suffix vocabulary
   (`text·source·fill_color·time·duration·width·height`, packet §8 Q1 accepted as written) has
   NO positional key. Empty-text cannot apply to shape elements (bars/dividers). Under their
   1–2-slot design, an optional Point2's shapes would have NO executable collapse mechanism —
   the exact hole off-timeline fills.
3. **The 3-slot template is not a proposal — it is BUILT and APPROVED:** PK transposed the
   26-element template (`0bd871ae…`), it was captured (`9ad024cc…`), calibrated (10/10), and PK
   gave the rung-6 visual verdict on a 3-point render; PK then challenged consistency and
   accepted the evidence-exact reconciliation, all landed on main (`4babe11`). Their run-sheet
   (`ws4-kinetic-transposition-run-sheet-v1.md`) and package §5d/§5e are NOT on main.

**Action taken: NONE against the registry** (their handoff correctly leaves revision to this
lane's gates). The 26-row capture, calibration, and visual approval stand as landed. **The
slot-count design authority question is escalated to PK** (`policy_decision`-class, two lanes
with conflicting conclusions):
- **Option A (this lane's recommendation):** keep the built/approved/landed 3-slot design; the
  WS-4 package + run-sheet adopt OFF-TIMELINE as the collapse mechanism (their §5d/§5e revise on
  the fuller evidence); the standing `off_timeline` vocabulary carry proceeds as planned.
- **Option B:** adopt their 1–2-slot design — requires a NEW template edit (delete Point3),
  re-capture (21 rows), re-calibration, a FRESH visual verdict, **and still needs off-timeline
  (or a vocab extension) for Point2's shapes** — plus it narrows the AI content contract from
  1–3 to 1–2 points (`ai-worker` §9 scene range), a product change beyond collapse mechanics.

## VISUAL-APPROVAL SCOPE RIDER (recorded at PK direction, 2026-08-01)

PK's `visual_approval` (proof event `2ccdb697…`) covers **the silent, solid-brand-background
visual v1 ONLY** — the composition as rendered in `480d4333…`: no voiceover, no music, no
B-roll/image background. **Voice, music, and any imagery-backed variant remain UNAPPROVED** and
each requires its own election + probes + fresh visual verdict (WS-4 §11/§15 Q3; the audio
elements exist in the template solely as unbound sockets). Graduation of `video_short_kinetic`
proceeds on the silent v1 scope; `video_short_kinetic_voice` is out of scope of this approval.

## Named handoffs / carries

- ~~External review carry~~ **CLOSED 2026-08-01** — executed by the bridge-holding session on PK
  directive, clean, pinned to the final hash (row above).
- **Register pointer:** submitted version-LESS to the single register-cut owner
  (`docs-hygiene-register-reconciliation-t1`) per PK governance item 7 — this lane allocates no
  register version itself.
- **PK decisions at the gate:** packet §8 Q1–Q5 (suffix vocabulary freeze · platform vocabulary ·
  suitability status ceiling · Phase-2 audit row · 2–3-template population order).
- **Phase 2 remains BLOCKED** on PK returning `{template_name, provider_template_id}` from the
  Creatomate transposition sitting (packet §9 records the capture-lane sequence, including the
  `scope='generic'` footgun check now mechanized as intake-validator C1).
- **WS-4 coordination:** the intake validator's declared-only mode can machine-check the kinetic
  declared contract (authored from WS-4 §6/§7/§9) before PK opens the Creatomate editor — a
  Phase-2 pre-step, no DB write required.
