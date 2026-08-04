# Creatomate Global Ultimate — v1 → Final Delta Audit (rev-3, PK-ratified 2026-08-04 — CGU Final active programme)

**Lane classification:** T1 (docs/read-only) · SIDE_PROVING · audit + packet preparation only.
**Status:** **The accepted proposed CGU Final programme, preserved for closeout.** PK accepted the
reconciled baseline (rev-2), directed four amendments (rev-3, committed `f59d680`), then directed
one further lane-order amendment (§4 — M1 replaces M8 in the first-three list; M8 now explicitly
follows) before pushing for preservation. PK then directed two further same-day amendments
(2026-08-03): a **correction** (§0c) requiring complete per-template calibration + live bounds
enforcement across every production-selectable template (prompted by the NDIS `video_short_stat`
visual-defect incident, contained per the §0c boundary ruling — v1 does not reopen for it), and an
**additive** amendment (§0d) adding must-have **M13 — Governed Template Build Pack v1**. On
2026-08-04 the CGU-v1 verdict landed (25/25) and the `cgu-final-ratification-and-launch` session
reconciled this proposal against it (§0e) and obtained PK's ruling on every §5 open decision,
including P-1 final ratification of the programme brief itself (§0f). **This document is PK's
accepted CGU Final proposal, ratified 2026-08-04** — a register pointer has been cut
(`docs/00_sync_state.md`); implementation of the must-have list (§2.2) may begin per §0f's
sequencing directive (M11a first, read-only; heavy implementation waits on the §6 schedule-
expansion plan's own approval).
**Scope:** Creatomate-side production pipeline only. HeyGen remains out of scope (parked
2026-08-02) — not analysed, not assumed as a dependency.
**Why rev-2 exists:** rev-1 (same filename, superseded in place — never committed, so no
historical-rewrite concern) was built from memory snapshots up to ~8 days stale and described a
"PP `video_short_stat`-only" baseline that PK correctly identified as materially wrong. This
revision is a reconciliation pass against the actual governing document already ratified-in-draft
in this repo (`docs/briefs/creatomate-global-ultimate-programme-brief-v1.md`, rev-2, 2026-08-01)
and the live final-readiness measurement taken 2026-08-02
(`docs/briefs/results/cgu-final-readiness-audit-result-v1.md`, on branch
`lane/cgu-final-readiness-audit`, pushed to origin, not yet merged to main).
**Method:** every claim is cited to a file, or to a live read-only DB query run in this session
(`execute_sql`/`db-read.py` against project `mbkmaxqhsohbtwsqolns`, timestamped 2026-08-02), or
marked `[UNVERIFIED — needs a fresh check]`. Where a memory conflicted with a live read, the live
read wins and the conflict is named, not silently resolved.
**Authority:** nothing below authorises any write, deploy, schedule change, or migration.

---

## 0. Correction log (what rev-1 got wrong, and the live facts that replace it)

| # | rev-1 claim | Correction | Evidence |
|---|---|---|---|
| 1 | "CGU v1 = PP `video_short_stat` only" | CGU already governs 25 committed cells across 4 clients × up to 4 platforms × 5 format families (image_quote, text, carousel, video_short_stat, video_short_kinetic). PP-stat-only was true in late July; it is not true now. | `creatomate-global-ultimate-programme-brief-v1.md` §1.2 target matrix; readiness audit §2 |
| 2 | (not claimed, but assumed) PP kinetic is unbuilt | PP kinetic is **deployed, activated, `overall_state='ready'`, `runtime_reachable=true`**; `video-worker` v3.16.2 live, `deploy-verifier` content-PASS; only rungs 8–9 (a real draft + publish through Wednesday's natural slot) remain. | readiness audit row #33; `docs/00_sync_state.md` v6.121 |
| 3 | (not claimed) NDIS YouTube stat is unbuilt | NDIS YT stat is `ready`/`ready`/`true` with a **PK-authorized supervised production-proof lane** in flight (force-fill precedent from the PP 3-consecutive lane); zero governed evidence exists yet, but the lane is scoped and gated, not conceptual. | readiness audit row #30, §4-C, §6b item 4 |
| 4 | (not claimed) B2/D1/D2/D3 status | All four are **decided and executed**: D1 (governed text, all brands) live via the governed-exempt rider; D2 (PP legacy carousel) **applied** 2026-08-02 03:43:40Z; D3 (CFW/INV YouTube deferred) recorded state-2; B2 (three template-family promotions to NDIS/CFW/Invegent) applied 2026-08-02, all `visually_approved` and live-selectable, one (Invegent market-insight-card) now the live selector winner on 4 platforms. | readiness audit §2, §6b, §6c; `b2-visual-verdict-promotion-stage0-forensic-reconstruction-v1.md` |
| 5 | "89% of PP video is legacy" | Recalculated from live 90-day publish counts (not the 18-slot July sample rev-1's figure came from): PP YouTube — the only platform where video is a committed matrix cell — carries 44 publishes/90d (16 stat + 28 kinetic), of which **exactly 2 are governed** ⇒ **~95.5% legacy, not 89%**, and this number is about to move materially once kinetic's natural slot lands 2026-08-03T07:00Z. See §2. | readiness audit rows #29, #33 |
| 6 | "Music: 0 selectable tracks (content_id_safe gate)" | **False today.** Live-verified 2026-08-02: `select_music('format','video_short_stat')` returns 1 row (Drifting Piano), and its license row has `content_id_safe=true`. The 0-eligible state described in an older memory was itself later corrected (the license row was updated after 2026-07-10) — this pass re-verified against the live table directly rather than trusting either doc. | live `execute_sql`, this session |
| 7 | "Voice: PP + NDIS only, CFW/Invegent blind" | **Still true, live-reconfirmed 2026-08-02** (unlike #6, nothing changed here — a voice-config *editing* surface shipped 2026-07-29 (`cc-0086`) but zero new client rows were added). | live `execute_sql`, this session; `cc-0086-brand-host-voice-config-result-v1.md` |
| 8 | "WS-3 Asset Gap: dry-run only, dormant" | **WS-3 is closed per its own Definition of Done as of 2026-08-02.** Live scheduled writer (cron `jobid=94`, `p_dry_run=false`, live-fired 2026-08-01), secret-free read view (`ice_ro.asset_gap_backlog`, applied 2026-08-02), routing complete on all 4 brands (zero unrouted non-ready cells), and a **deliberate two-register model** (not a merge — the markdown register is a superset the DB analyzer structurally cannot represent 9 of 15 items of; PK-accepted Option C). Only a dashboard panel over this now-live backlog is new work. | `ws3-asset-gap-read-view-result-v1.md`, `ws3-asset-gap-live-writer-result-v1.md`, `ws3-asset-gap-routing-loop-proof-result-v1.md`, `ws3-asset-gap-register-reconciliation-result-v1.md` |
| 9 | "WS-5 template metadata: dark/unpopulated" | **WS-5 DoD met.** Governed write RPC live (Phase 1, 2026-08-01); 3 templates now carry live, validator-confirmed calibrated constraints (kinetic `9ad024cc` + `generic_market_insight_card_1x1_v1` + `generic_quote_card_1x1_v1`, the last two applied 2026-08-02 as register v6.126); the WS-4 intake-validation consumer is live and reads them. | `ws5-constraints-shape-phase1-designed`, `ws5-metadata-population-closeout-result-v1.md` |
| 10 | Template graduation ladder treated as a "Final workstream" (WS-T) | **Wrong framing — it is inherited infrastructure**, ratified 2026-08-01 as the formal proof authority (P-2 closed). It has no remaining deliverable of its own; it is the tool every other workstream uses. Removed as a standalone workstream in this revision. | `creatomate-global-ultimate-programme-brief-v1.md` §1.4 |

### 0b. rev-3 amendments (PK-directed, accepted baseline stands unchanged)

PK accepted rev-2's reconciled baseline in full and directed four amendments before commit —
these are additive/corrective, not further baseline reconciliation:

1. **New must-have M11 — governed legacy-path migration & retirement**, added to close the exact
   trap rev-1's percentage framing couldn't: a cell can be `ready` in the readiness queue while a
   real fraction of its actual scheduled occurrences still silently execute a legacy code-composed
   route (the precedent: `video_short_stat_voice` "reads governed, routes legacy" naming trap; PP
   YouTube's 2-of-44 real governed-occurrence rate, §1). **No percentage gate** — acceptance is
   binary per cell (§2.2).
2. **M9 resolved**, not left as an open decision: a literal 5th live client is explicitly NOT a
   Final blocker; Final instead requires proving the zero-code onboarding *contract* is a reusable
   package (Day-1 governed setup + a no-code replay), demonstrated on an existing brand or an
   isolated fixture. A literal 5th client becomes the first *post-Final* commercial validation of
   that package.
3. **Music reclassified**: basic capability (≥1 selectable Content-ID-safe track) moves to
   Inherited (§2.1) — it is MET. A new must-have, M12, carries the *quality* question (depth,
   rotation, monotony avoidance) forward, with minimum library depth surfaced as an open PK
   decision rather than assumed.
4. **Appendix B (first-week operating plan) restored** (§7), rebuilt against the reconciled
   baseline, not rev-1's stale one.

### 0c. Correction (PK-directed, 2026-08-03 — additive; prompted by a live production defect)

**WS-5 infrastructure is inherited, but complete per-template calibration and live bounds
enforcement remain REQUIRED across every production-selectable template.** Row 9 / §2.1's "WS-5
DoD met" stands as written for WS-5's own scoped DoD (write RPC + 2–3 populated templates + a live
consumer) — but must NOT be read as "template text-fit is a solved, inherited property." The live
counter-example, same day as this proposal: the first governed NDIS `video_short_stat` publish
(`oCrtq6R9VFQ`, 2026-08-02) shipped with three template-fit defects (static "MARKET UPDATE" eyebrow
colliding with StatValue and carrying wrong-brand copy · a two-word `stat_value` breaking geometry
past the char-count-only clamp · ContextLine exceeding never-calibrated text-safe bounds) —
`video_stat_reveal_9x16_v2` is production-selectable yet is NOT one of the 3 calibrated templates,
and no generation- or render-time bounds enforcement exists for it. Rung-6 visual approval is
per-render, not per-content-envelope. Consequences for Final: (a) calibration coverage must extend
to **every production-selectable template**, not 2–3; (b) constraints must be **enforced live**
(generation-time clamp/reject against the template's measured envelope + the parked
`video_stat_bounds` validator landed and wired), not merely persisted; (c) **calibrated constraints
become a mandatory graduation requirement** for any future template — the direct answer to the
auto-onboarded-template quality risk. Incident disposition + contained repair plan:
`docs/briefs/cgu-ndis-yt-stat-supervised-proof-runsheet-v1.md` (ADDENDUM), disposition
`published_proof_captured / visual_quality_remediation_required / final_acceptance_open`; the
NDIS assignment is contained (`blocked`) pending remediation, so the §1 baseline's NDIS stat
state-1 reading is 22/25 again until re-close.

**PK boundary ruling (2026-08-03, same directive):** the incident splits into a contained CGU-v1
repair and CGU-Final systemic hardening — **v1 does NOT reopen for single layout defects, and
universal future quality perfection is not a v1 pass condition.** v1's promise: every committed
capability has a governed route, fail-closed containment, evidence, and an accepted production
output. The v1 repair (Lane A, `ws5-production-envelope-enforcement-foundation`) re-closes the NDIS
cell on: eyebrow removed/parameterised · safe StatValue+ContextLine bounds for
`video_stat_reveal_9x16_v2` · one corrected replacement render · PK visual PASS · assignment
restored — **no second public publish** unless routing/authority/publisher behaviour changed (the
preserved publish stands as transport+evidence proof).

**CGU-Final quality hardening (this correction's must-have-shaped content — "full WS-5", PK-defined
as seven outcomes; Lane B `ws5-production-template-calibration-backfill`):**
1. **Calibration coverage** — every production-selectable template has persisted, probe-derived constraints;
2. **Field-shape rules** — constraints express char count, word count, numeric-only expectation, line count, safe-width behaviour;
3. **Generation-time enforcement** — the AI worker receives the selected template's real limits before writing content;
4. **Render-time bounds enforcement** — the (currently parked) bounds validator landed, checking final modifications/geometry;
5. **Graduation enforcement** — no template becomes production-selectable without completed calibration + passing probes;
6. **Existing-template backfill** — all currently selectable templates checked, not only future ones;
7. **Change invalidation** — material template edits invalidate calibration until reproven.

**Ongoing quality policy (PK, operative post-v1):** for every newly graduated template, visually
inspect its first three natural production renders, then a weekly sample; automatically validate
text bounds on every render where possible; on defect, immediately block only the affected
template/client assignment and record the issue in the Asset Gap/quality register; repair →
recalibrate → replacement visual proof → restore. **Reopen the programme only for a systemic
governance failure** (silent fallback across many cells, governance bypass, publishing past a
failed control) — never for a single content-envelope defect.

### 0d. Additive amendment — new must-have M13 (PK-directed, 2026-08-03)

PK directed one further amendment to the accepted baseline — purely additive, not a reconciliation
of anything already accepted:

**New must-have M13 — Governed Template Build Pack v1.**

**Outcome:** Asset Gap can produce a versioned Template Blueprint JSON describing the intended
provider-neutral template contract. A human transposes that design into Creatomate. ICE then
captures a versioned Creatomate implementation JSON, compares expected versus actual structure,
persists the governed registry/constraint records, runs calibration and probes, obtains PK visual
approval, and graduates the template.

**Finite acceptance** (carried into the §2.2 table below):
- versioned Blueprint JSON schema;
- versioned Creatomate Capture JSON schema;
- artifact IDs, hashes, and registry linkage;
- Asset Gap attachment/display;
- automated blueprint-versus-capture structural diff;
- mismatches block graduation;
- one real end-to-end template proof.

**Explicitly excluded** (carried into the §2.4 hard exclusions below): automatic Creatomate
template creation, automatic promotion, bidirectional synchronization, and any removal of the PK
visual gate.

**Sequencing** (carried into §3 below): after the reusable WS-5 envelope foundation, before the
first multi-scene template (M6). M8's dashboard implementation must account for displaying the
Build Pack.

**Scope guardrails (PK-directed):** docs-only amendment. Not added to the current WS-5/NDIS repair
scope. No implementation begins before CGU Final ratification — the same standing rule that already
governs the rest of this document (§8).

### 0e. CGU-v1 verdict reconciliation (2026-08-04, ratification session)

**CGU-v1 is COMPLETE.** Per the final mechanical re-read
(`docs/briefs/results/cgu-v1-final-reread-and-verdict-v1.md`, on origin `4ac3724`): Milestone 2
PASS **25/25** committed cells (R1 queue + R2 proof-events + R3 provenance all PASS, INV-carousel
disposition recorded, enrolment clause met); Milestone 1 PASS. The three cells this proposal's
Phase 0 (§3, §4) tracked as "already in flight" **all closed** via PK-gated supervised recoveries:

1. **PP YT `video_short_kinetic`** — diagnosed double blocker (advisor `_voice` palette deviation +
   silent-plan/audio-gate contradiction), fixed `video-worker` v3.17.1 (`79f1717`), production
   publish `ZScjrWU09AQ`, PK visual PASS, proofs `ffe3f705…`/`374745df…`.
2. **NDIS YT `video_short_stat`** — Lane A re-close
   (`ws5-envelope-foundation-lane-a-result-v1.md`): eyebrow removed, safe StatValue/ContextLine
   bounds applied, one corrected replacement render, PK visual PASS, **no second public publish**
   (the preserved `oCrtq6R9VFQ` publish stands as transport+evidence proof, per the §0c boundary
   ruling above).
3. **CFW × LinkedIn `image_quote`** — diagnosed `pool_thin` (40 in scope, 0 ≥ fitness 60); governed
   manual replacement slot (pool-bypassing T0 path), published, proof `9fde0213…`.

**Effective immediately in this document: Phase 0 is CLOSED (was: "already in flight"); M5 (§2.2)
is MET (was: IN FLIGHT); D4 disposition (§1) is DECIDED AND EXECUTED (was: "in flight"); the
25-cell baseline throughout this document (§1, §6.1, §6.2) supersedes every prior "22 of 25" /
"22 state-1" reading** — those readings are retained in place below as the dated historical record
they were at time of writing, not restated as current.

**§0c disposition:** the **v1 contained repair is DELIVERED** — Lane A
(`ws5-production-envelope-enforcement-foundation`) re-closed the NDIS cell exactly per the §0c
boundary ruling (eyebrow removed/parameterised, safe bounds, one corrected render, PK visual PASS,
no second publish). §0c's **CGU-Final quality-hardening content is NOT yet delivered** — the seven
outcomes (calibration coverage · field-shape rules · generation-time enforcement · render-time
bounds enforcement · graduation enforcement · existing-template backfill · change invalidation)
survive into CGU Final as **Lane B, `ws5-production-template-calibration-backfill`** — see new
must-have **M14** (§2.2).

**Four further carries from the verdict** — none of these are a v1 defect (v1 does not reopen for
any of them); each is folded into the tier tables below as a new candidate must-have, **status
PENDING PK TIER RULING** (§5 item 8):

- **M15 — `kinetic_voice` palette hygiene.** PK order: REQUIRED before PP kinetic returns to
  *unsupervised* scheduling (the advisor `_voice` palette deviation diagnosed during the PP kinetic
  recovery, §0e above). Recommended tier: **must-have** — narrow, cheap, and directly gates removing
  the supervised-recovery training wheels from a now-live cell.
- **M16 — CFW natural-pool fitness starvation.** The CFW-LI recovery used a manual replacement slot
  (pool-bypassing T0 path) because the natural pool returned 0 candidates ≥ fitness 60 out of 40 in
  scope — a bridge, not a fix; without sourcing work the same starvation recurs on CFW-LI's next
  natural cycle. Recommended tier: **must-have** — a repeat manual bypass on a committed cell is
  exactly the "silent legacy/manual dependency" pattern M11 already targets elsewhere.
- **M17 — auto-approver dead-draft hygiene.** Recommended tier: **optional/post-Final** — a
  hygiene/cleanup finding from the recovery lanes, no evidence yet that it blocks a committed cell
  or causes a live-publish risk; escalate to must-have only if PK knows otherwise.
- **M18 — Creatomate key rotation / managed storage.** Plaintext key exposure carried since before
  this audit (`docs/briefs/results/` security triage; see also the CGU-v1 verdict's carry list).
  Recommended tier: **must-have**, but as a **parallel security lane**, not a capability-matrix
  gate — a credential-exposure fix should not wait on Final's feature completeness, nor should
  Final's declaration wait on it if the two are independently schedulable.

### 0f. PK ratification — CGU Final decisions (2026-08-04)

PK ruled on every §5 open decision the same session as §0e's reconciliation. **P-1 (the programme
brief's own final ratification) is RATIFIED** — see
`docs/briefs/creatomate-global-ultimate-programme-brief-v1.md`, preserved as the historical v1
contract, linked to the CGU-v1 verdict. Full ruling text is recorded in §5 below (now a resolved
decision log, not an open list); the practical effect on this proposal:

- **M9** — resolved-with-preference: existing brand entering a genuinely new format-mix is the
  default replay target; fixture only if no real brand is eligible at execution time.
- **M12** — resolved-with-number: 4 selectable Content-ID-safe tracks required; the proof week
  must exercise ≥3, with no unnecessary consecutive same-brand reuse.
- **M4** — resolved: `platform_scope` is enforced live, not documented as decorative. Pool
  metadata is corrected first, then the real platform is passed into selection. Missing platform
  context **fails closed** (a new, stricter acceptance clause — not merely "provably enforced").
- **M6** — resolved-with-numbers: first production-proven multi-scene format = 3 scenes,
  30–45 seconds, **hard maximum 45 seconds**. Longer-form multi-scene is explicitly post-Final
  (moved to §2.3).
- **M11** — resolved-with-default: migrate every active/scheduled/committed legacy route to
  governed by default; explicit retirement is reserved for unused, superseded, or
  disproportionately expensive routes, each with a recorded PK disposition. **M15 is folded into
  M11** (struck through as its own row, §2.2) — `kinetic_voice` palette hygiene is mandatory
  before unsupervised PP kinetic scheduling, and unsupported `kinetic_voice` eligibility is
  **removed** unless/until that format receives its own governed implementation and proof.
- **M16** — tier confirmed **must-have**: the normal governed source/fill path must become
  sustainable; repeated supervised manual slots are not an acceptable steady state.
- **M17** — tier confirmed **optional/post-Final**: retain a task chip, monitor operational
  impact, do not scope as Final work.
- **M18** — tier confirmed **must-have, mandatory parallel security prerequisite** (not a
  creative-capability workstream): rotate the key, move to managed secrets, remove plaintext
  copies, verify worker authentication, preserve evidence — all before Final PASS.
- **M14** — confirmed must-have, unchanged.

**Sequencing directive (PK, same ruling):** M11a may run now, read-only, as a **preflight input to
the optimum-schedule apply** (§6) — it is explicitly authorised to start. **Do not begin heavy CGU
Final implementation before the schedule-expansion plan (§6) is approved** — M11a's inventory
findings inform that approval; they do not themselves authorise expanding beyond it.

---

## 1. Exact current baseline (2026-08-02)

**Governing documents (already exist, already partially ratified — this audit does not replace
them):**
- `docs/briefs/creatomate-global-ultimate-programme-brief-v1.md` (rev-2) — defines Milestone 1
  (Governed Boundary Complete) and Milestone 2 (Ultimate), the 25-cell target matrix, D1–D4,
  WS-1…WS-6. **Status: DRAFT rev-2, awaiting final PK ratification (P-1 still open per its own §4.3
  table)** — treat its content as the working definition, not yet as a closed contract.
- `docs/briefs/results/cgu-final-readiness-audit-result-v1.md` — the live measurement against that
  matrix, 2026-08-02, on the unmerged branch `lane/cgu-final-readiness-audit`. This is the most
  current ground truth in the repo for cell-level state.

**Milestone 1 (Governed Boundary Complete):** PASS under its own operational rule ("zero unowned
non-ready target cells" — met) with one cosmetic disposition recorded (INV FB/IG carousel
queue-absence accepted as state-2, PK ruling 2026-08-02). Strict-letter reading needs only
bookkeeping, not new governance work.

**Milestone 2 (Ultimate, as currently defined by the rev-2 brief):** *(as read 2026-08-02 — dated
historical record; superseded by the CGU-v1 verdict, §0e: Milestone 2 is now PASS, 25/25, all three
cells below closed)* **22 of 25 committed cells are state-1** (ready + a recorded `platform_publish`
proof event), after three same-day applies (Packets A, B, A2). Remaining 3:
1. **PP YT `video_short_kinetic`** — rungs 8–9 only; natural slot **2026-08-03T07:00:00Z**.
   ⚠ `youtube-publisher` is schedule-blind — approving the resulting draft auto-publishes publicly
   within ≤30 min. **CLOSED (§0e)** — production publish `ZScjrWU09AQ`.
2. **NDIS YT `video_short_stat`** — PK-authorized supervised force-fill lane (run-sheet exists on
   the readiness-audit branch), zero governed evidence today. **CLOSED (§0e)** — Lane A re-close, no
   second publish.
3. **CFW × LinkedIn `image_quote`** — zero 90-day publishes; needs a PK evidence ruling (accept
   >90d-old evidence, or wait for a fresh natural publish) — the only image_quote cell without a
   resolvable proof-event path. **CLOSED (§0e)** — governed manual replacement slot, published.
The Milestone-2 zero-code enrolment-proof clause is **already satisfied** (NDIS, empty CE code
diff, v6.113).

**D1–D4 disposition:** all four DECIDED and EXECUTED (D1/D2/D3 live; D4 **CLOSED as of the verdict,
§0e** — was "in flight" at time of writing, see above).
No open design question remains on any of the four.

**B2 (template-family expansion to NDIS/CFW/Invegent):** three promotions applied 2026-08-02, all
`visually_approved` and live-selectable (not yet `production_proven` — render/draft/publish rungs
7–9 are future, separately-gated):
- Invegent → `generic_market_insight_card_1x1_v1`: **live selector winner** on all 4
  platforms/placements (flipped from `generic_quote_card_1x1_v1`).
- NDIS → `generic_quote_card_1x1_v1`: applied, selector winner unchanged.
- CFW → `generic_quote_card_1x1_v1`: applied, selector winner unchanged.

**WS-3 Asset Gap:** CLOSED per its own DoD (read view + live scheduled writer + full 4-brand
routing + a deliberate, PK-accepted two-register model). No remaining build work. A dashboard
panel over the now-live backlog was never part of WS-3's scope and is genuinely new work (§3).

**WS-5 Template Metadata:** Phase 1 (write RPC) live; 3 templates populated with live calibrated
constraints; WS-5's own DoD ("2–3 production-proven templates populated" + a live consumer) is met.

**Music (live-verified this session):** `select_music('format','video_short_stat')` returns exactly
1 row — Drifting Piano, `content_id_safe=true`, CC0, no attribution required. **A Content-ID-safe
governed music bed already exists and is selectable.** 8 further tracks remain fenced
(`intake_candidate`).

**Voice (live-verified this session):** `property-pulse` and `ndis-yarns` have a configured
ElevenLabs voice; `care-for-welfare-pty-ltd` and `invegent` do not. Unchanged from before
2026-07-28 — a voice-config editing UI shipped 2026-07-29 but added zero new rows.

**B-roll:** pool = 6 clips, resolver v1.5 live (recent-use avoidance + geography compatibility),
4 of 6 clips Sydney-concentrated (3 distinct localities), `platform_scope` still inert at the
production call site (`p_platform=NULL` always). **Dated 2026-07-30, not independently re-verified
live this pass** — no evidence of change found, but flagged per the reconciliation discipline this
audit is itself modeling.

**Legacy-vs-governed video share (recalculated):** PP YouTube 90-day publishes = 44 (16 stat + 28
kinetic), 2 governed ⇒ **~95.5% legacy on the one platform where video is committed**. Cross-platform
(FB/IG/LI) legacy video share is **[UNVERIFIED — not a committed matrix cell, not re-derived this
pass]**. This YouTube number will shift as soon as kinetic's 2026-08-03 slot and the NDIS supervised
lane land. **This figure is retained as descriptive context only — per PK direction (§0b), Final
does not gate on any percentage threshold.** The actual gate is M11 (§2.2): every scheduled cell is
either provably governed or explicitly retired/deferred, checked per-cell, not in aggregate.

**Audio standards, monitoring, cost controls, provider-neutral render contract:** unchanged from
the prior pass — no evidence of new work found. Carried forward with original dates
(2026-07-24 → 2026-08-01); **not independently re-verified live this session** (lower priority given
the specific corrections PK asked for). Treat these four sections' currency as roughly one week
older than everything else in this document.

**Register head:** v6.126 (`docs/00_sync_state.md`, `docs/00_action_list.md`). Known disclosed
carry: `tmr-drift-probe` daily status reads `error` (not `ok`) starting 2026-08-02 — an accepted
side effect of the D2 apply, Option-B patch queued and unbuilt. Not a new incident if seen.

---

## 2. Restructured programme: three tiers

### 2.1 Inherited from CGU v1 — closed, permanent, not reopened by Final

- Template registry (TMR-3/4 schema) + the 9-state/13-rung graduation ladder, **ratified as the
  formal proof authority** (P-2, 2026-08-01).
- `select_template` + selector policy (cc-0089).
- `classify_format_capability` v2 (seven-state) + the Client Production Readiness Queue — the
  measuring instrument for both milestones; no new measurement machinery gets built for Final.
- **WS-2 S7 Capability Enforcement** — COMPLETE, live v6.106. Demand-grid guard, self-healing on
  template graduation.
- S9 capability→publisher enforcement (resolver + publisher boundaries), both live.
- Asset intake/promotion machinery (image-harvester/image-reviewer, PK visual gate as the only
  deciding act) — proven, unchanged non-negotiable.
- **WS-3 Asset Gap Activation** — CLOSED per DoD (live writer, read view, full routing, two-register
  model). Only its dashboard surface is new work (§3, must-have item 8).
- **WS-4 Creatomate Specialist** charter + the operator-transposition loop (AI proposes → PK
  transposes in the editor → ICE registers → system proves → template becomes selectable) — the
  pattern is proven once (PP kinetic) and is the reusable mechanism for any future template family,
  not a one-off.
- **WS-5 Template Metadata** Phase 1 — write RPC live, 3 templates populated, consumer live. Future
  population of *more* templates reuses this machinery; it is not new infrastructure.
- **WS-6 Dashboard Capability Visibility** — COMPLETE (Slice F, landed pre-existing, v6.100).
- D1 (governed text carve-out), D2 (PP legacy carousel), D3 (CFW/INV YouTube deferred), D4
  (kinetic) — all four decided and executed; D4's mechanical rungs closed per the CGU-v1 verdict
  (§0e). None is a Final workstream.
- Production Reliability lane (fail-closed audio-*presence* gate, visible retry/recovery,
  schedule-safe publish) — all 3 fixes deployed and live-proven.
- B-roll re-activation + resolver v1.5 — live (depth/diversity is a genuine remaining gap, carried
  into §2.2 as its own must-have, not reopening the activation itself).
- The registered specialist-agent team and the CCF-02/CCF-04 orchestration contract (this
  document's own operating rules).
- **Basic governed music capability** — `select_music()` live and correct; ≥1 selectable
  Content-ID-safe track (Drifting Piano) exists today, live-verified. **MET, reclassified from
  must-have in rev-3** (§0b). Only the *depth/rotation/monotony* question remains open work,
  tracked as M12 (§2.2) — a quality workstream, not a basic-capability gap.
- **The zero-code capability-enrolment demonstration itself** (NDIS, v6.113, empty CE code diff) —
  the one-off proof is done and stays done. What is NOT yet inherited is turning that one-off into
  a documented, reusable Day-1 package — that is M9 (§2.2, resolved scope, §0b).

### 2.2 CGU Final must-have — finite, gates Final's declaration

Every row states a bounded, checkable acceptance test. Final is declared when every row reads
`MET`.

| # | Capability | Current state (2026-08-02) | Finite acceptance test | Status |
|---|---|---|---|---|
| M1 | Automated loudness measurement | Presence-only audio gate live (`video-worker` v3.14.0); true LUFS measurement exists only as an offline harness tool, never wired to a live render | A live LUFS value is written to `render_spec.qa.loudness_lufs` for every voiced/music-bed render in a 20-render sample; a deliberately silent-but-voiced test render is caught pre-publish | **OPEN** |
| M2 | Governed voice for all 4 active clients | PP + NDIS configured, live-reconfirmed; CFW + Invegent have zero rows in `c.client_voice_config` | 4/4 clients produce one audible, correctly-attributed governed voice render each, via the same controlled single-draft protocol used for the PP/NDIS recovery | **OPEN** (2/4) |
| ~~M3~~ | ~~≥1 Content-ID-safe governed music bed~~ | **MOVED to Inherited, §2.1 — MET, not a must-have.** `select_music('format','video_short_stat')` returns Drifting Piano, `content_id_safe=true`, live-verified this session | — | **MET (inherited)** — the depth/rotation question continues as M12, below |
| M4 | Deeper, truthful B-roll coverage + live `platform_scope` enforcement | Pool=6, 4/6 Sydney-concentrated (3 distinct localities); `platform_scope` inert at the production call site (`p_platform=NULL` always) | **RESOLVED (PK, 2026-08-04, §0f):** ≥3 distinct AU localities represented with ≥2 clips each in the eligible pool; `platform_scope` **enforced live** — pool metadata corrected first, then the real platform passed into selection; **missing platform context fails closed** (no silent fallback to an unscoped clip) | **OPEN** — decision resolved, build not started |
| M5 | Multiple production-proven governed video families | Per the programme's own definition, "production-proven" = readiness-queue state-1 (ready + recorded proof event). **MET per the CGU-v1 verdict (§0e, 2026-08-04):** PP `video_short_stat` and PP `video_short_kinetic` both reached state-1 (kinetic's production publish `ZScjrWU09AQ`, PK visual PASS) | Both PP `video_short_stat` and PP `video_short_kinetic` reach state-1; **"multiple" is met at exactly 2 families** unless PK elects to require a 3rd (e.g. NDIS stat, which closed the same verdict pass) | **MET** — closed by the CGU-v1 verdict (§0e); no separate work required |
| M6 | One production-proven multi-scene format | Creatomate has no multi-scene lane in this repo at all — confirmed explicitly out of scope in `video-broll-intake-v1-gate1-brief-DRAFT.md` | **RESOLVED-WITH-NUMBERS (PK, 2026-08-04, §0f):** one PK-approved, audibly+visually verified, reproducible multi-scene render, **exactly 3 scenes, 30–45 seconds, hard maximum 45 seconds** (within the 2-min EF wall-clock budget). Longer-form multi-scene is explicitly post-Final (§2.3) | **OPEN** — zero prior art; largest single lift in this table |
| M7 | Render monitoring + cost capture | Cron-health Layer-1 live; render-path cost/queue-depth observability does not exist; `render_spec` cost fields uncaptured; no LLM-cost-guardrail design was ever built for render providers | `render_spec` carries a non-null cost/credit value for a sample of recent Creatomate renders; a documented weekly cost figure exists (even if the honest figure today is "previously unknown, now observed") | **OPEN** |
| M8 | Dashboard Asset Gap Register | WS-3's backlog (`ice_ro.asset_gap_backlog`) is live and populated; **no dashboard UI reads it** — the only UI surface today (Static-Image Governance Dashboard) is a different, already-closed surface | A dashboard panel shows the same open-gap count as a direct ledger read, refreshes on the writer's own cadence, passes `dashboard-ia-lint` | **OPEN** — the one item WS-3's own closure explicitly deferred |
| M9 | Zero-code onboarding contract: Day-1 package + no-code replay proof | **RESOLVED SCOPE (PK, §0b): a literal 5th client is NOT required for Final.** The one-off zero-code enrolment demonstration (NDIS, v6.113) is done and inherited (§2.1), but it has never been written up as a reusable, documented contract — there is no "governed Day-1 setup package" spec (what voice/music/asset-pool/format-governance rows a new-to-a-format brand needs on day one) and no second replay proving the pattern generalizes rather than being a NDIS-specific artifact | Author the Day-1 governed setup package as a spec (voice config + starter background/B-roll pool + ≥1 governed format's governance rows + client_format_config), then **replay it end-to-end with zero worker-code changes**. **RESOLVED replay-target default (PK, 2026-08-04, §0f):** an existing brand entering a genuinely new governed format-mix, the same evidentiary shape as NDIS's original proof; a purpose-built isolated fixture brand is used only if no real brand is eligible at execution time | **OPEN** — smaller, well-scoped deliverable now that the literal-5th-client ambiguity is removed |
| M10 | Docs-only provider-neutral render contract (Creatomate-scoped) | One aspirational sketch exists (`render-provider-creatomate-capability-audit.md` §7); zero abstraction in code | A design doc exists, extracted from ≥2 real format implementations (stat + kinetic, once both close), that a future provider-abstraction lane could implement against without re-deriving this programme's learnings (TPR-1, the silent-template trap, the audio-presence-vs-loudness gap) | **OPEN**, but cheap — docs-only, no code |
| M11 | Governed legacy-path migration & retirement (**incl. M15, folded**) | **NEW, PK-directed (§0b).** No repo-wide accounting exists of which scheduled Creatomate format×client×platform occurrences actually execute the governed builder vs a legacy code-composed route. Known live instances of the trap this targets: PP YouTube's 2-of-44 real governed-occurrence rate (§1); the historical `video_short_stat_voice` naming trap ("reads governed, routes legacy" — `B1_VIDEO_GOVERNED_FORMAT` string-matches the base format key only, so voice-suffixed variants silently miss the governed fork); legacy `video_short_kinetic`/`_kinetic_voice` composing in code with no `select_template` call at all pre-D4 | **Per-cell, binary, no percentage gate:** for every scheduled Creatomate format×client×platform cell, either (a) it demonstrably routes through the governed selector + asset resolver + metadata + QA + evidence path for its real scheduled occurrences, or (b) the legacy route is explicitly retired with a recorded reason. **RESOLVED retirement default (PK, 2026-08-04, §0f):** migrate every active/scheduled/committed legacy route to governed by default; explicit retirement reserved for unused/superseded/disproportionately-expensive routes, each with a recorded PK disposition. **Folded from M15 (§0f):** `kinetic_voice` palette hygiene mandatory before PP kinetic returns to unsupervised scheduling; unsupported `kinetic_voice` eligibility **removed** unless/until it gets its own governed implementation + proof | **OPEN** — starts with an inventory (M11a, cheap, T1, authorised to start now); closure lanes (M11b) follow per finding |
| M12 | Music depth, rotation & monotony avoidance | Basic capability MET (M3, inherited, §2.1) — but exactly 1 track means every governed video plays identical music indefinitely; PK has previously rejected a fully-silent video and accepted a single-track 70%-bed render once, but a *week* of the same bed on every video is a real, untested aesthetic question, not yet asked | **RESOLVED-WITH-NUMBER (PK, 2026-08-04, §0f):** 4 selectable Content-ID-safe tracks required; the proof week must exercise ≥3 of them, with no unnecessary consecutive same-brand reuse; rotation producing a measurably non-uniform aural experience across a sample week of renders (reuse the existing B-roll rotation-uniformity proof method — seed distribution across the eligible pool) | **OPEN** — decision resolved, sourcing not started |
| M13 | Governed Template Build Pack v1 | **NEW, PK-directed additive amendment (§0d, 2026-08-03).** No Blueprint/Capture artifact pipeline exists today; Asset Gap has no mechanism to declare an intended provider-neutral template contract, and no automated structural diff exists between an intended design and what a human actually built in Creatomate | Versioned Blueprint JSON schema + versioned Creatomate Capture JSON schema both exist; every Blueprint/Capture pair carries artifact IDs, hashes, and registry linkage; Asset Gap can attach/display a Blueprint; an automated blueprint-vs-capture structural diff runs and any mismatch blocks graduation; one real end-to-end template proves the full loop (Blueprint → human transposition → Capture → diff clean → registry/constraint persistence → calibration/probes → PK visual approval → graduation) | **OPEN** — new, unscoped |
| M14 | WS-5 quality hardening — full per-template calibration + live bounds enforcement (Lane B) | **NEW, carried from §0c via the CGU-v1 verdict (§0e).** §0c's v1 contained repair (Lane A) is delivered; the seven-outcome CGU-Final hardening is not: calibration coverage, field-shape rules, generation-time enforcement, render-time bounds enforcement, graduation enforcement, existing-template backfill, change invalidation (§0c) | All seven §0c outcomes MET; Lane B (`ws5-production-template-calibration-backfill`) delivered and PK visual-verified per the §0c ongoing quality policy | **OPEN** — surviving requirement from §0c, tier already settled (must-have) by §0c's own text |
| ~~M15~~ | ~~`kinetic_voice` palette hygiene~~ | **MERGED into M11 (PK ruling, 2026-08-04, §0f)** — not a separate Final workstream. See M11's row above for the folded content | — | **MERGED** — tracked under M11 |
| M16 | CFW natural-pool fitness starvation | **NEW, carried from the CGU-v1 verdict (§0e).** CFW-LI's natural pool returned 0/40 candidates ≥ fitness 60, forcing a manual pool-bypassing replacement slot — a bridge, not a fix; recurs on the next natural cycle without sourcing work | **TIER CONFIRMED must-have (PK, 2026-08-04, §0f):** the normal governed source/fill path becomes sustainable — CFW-LI's natural pool sustains ≥1 candidate ≥ fitness 60 across a sample week, with zero further manual bypasses needed. Repeated supervised manual slots are explicitly not an acceptable steady state | **OPEN** — tier settled, sourcing not started |
| M17 | Auto-approver dead-draft hygiene | **NEW, carried from the CGU-v1 verdict (§0e).** A hygiene/cleanup finding surfaced during the recovery lanes; no evidence yet that it blocks a committed cell or creates live-publish risk | **TIER CONFIRMED optional/post-Final (PK, 2026-08-04, §0f)** — moved to §2.3. Retain a task chip and monitor operational impact; do not scope as Final work | **MOVED to §2.3** — optional/post-Final, PK-confirmed |
| M18 | Creatomate key rotation / managed storage | **NEW, carried from the CGU-v1 verdict (§0e).** Plaintext Creatomate API key exposure, carried since before this audit | **TIER CONFIRMED must-have, mandatory parallel security prerequisite, NOT a creative-capability workstream (PK, 2026-08-04, §0f):** rotate the key; move to managed secrets; remove plaintext copies; verify worker authentication; preserve evidence — all before Final PASS | **OPEN** — tier settled, run parallel to the capability matrix |

### 2.3 Optional / post-Final — explicitly deferred, does not gate Final

- **A literal 5th commercial live client — resolved (§0b, §5): explicitly NOT a Final blocker.**
  Becomes the **first post-Final commercial validation** of the M9 Day-1 package, once that
  package is proven (on an existing brand or fixture) inside Final itself.
- `video_short_kinetic_voice` and any B-roll/imagery-backed kinetic variant — explicitly out of
  scope of every visual approval recorded to date (v6.115 scope rider); each needs its own probes
  and a fresh visual verdict. **Sharpened by the M11 fold (§0f, 2026-08-04):** unsupported
  `kinetic_voice` eligibility is actively removed, not merely left unaddressed, unless/until it
  gets its own governed implementation + proof.
- **Multi-scene formats beyond M6's 45-second hard maximum** (PK, 2026-08-04, §0f) — longer-form
  multi-scene work is explicitly post-Final.
- **M17 — auto-approver dead-draft hygiene** (moved from §2.2, PK-confirmed 2026-08-04, §0f) — a
  hygiene/cleanup finding from the recovery lanes; retain a task chip, monitor operational impact,
  do not scope as Final work unless evidence later shows it blocks a committed cell.
- CFW/Invegent YouTube (D3, PK-deferred, promotable later without moving Final's finish line).
- Weekly Digest format family, animated formats (Slice D), Asset Gap subject-type expansion
  (music/avatar/voice/feed-volume/provider) — all explicitly named OUT of Ultimate v1 in the
  ratified programme brief §1.3, unchanged by this reconciliation.
- LinkedIn cadence raise beyond the existing max-2/day design — a standing lever, not pulled by
  default.
- A second render provider (implementation, as opposed to M10's design-only doc) — no provider is
  named, scoped, or assumed here.
- R3a `resolve_final_format` shadow-predicate consolidation (three parallel predicate
  implementations) — a named carry, not blocking.

### 2.4 Hard exclusions — never in scope, by standing charter rule (not "deferred," permanently out)

- **Automated Asset Gap *closure*** (as opposed to detection, which is done). PK visual approval
  remains, by design, the only act that promotes an asset to production — CLAUDE.md's Image
  Workflow §2 non-negotiables are unchanged by anything in this programme and are not up for
  reconsideration in a Final scoping pass.
- Browser-automated Creatomate template creation — no template-create API exists; this is a
  standing out-of-scope rule, not a backlog item.
- **M13 Build Pack — no automatic Creatomate template creation** (reinforces the rule directly
  above, scoped explicitly to the Build Pack): a human always transposes the Blueprint into
  Creatomate; the Capture step only ever reads back what a human built.
- **M13 Build Pack — no automatic promotion or graduation.** The Build Pack automates the
  blueprint-vs-capture structural diff only; PK visual approval remains the only act that graduates
  a template, unchanged.
- **M13 Build Pack — no bidirectional synchronization.** Capture is one-directional, read-only
  observation of the live Creatomate implementation; nothing is ever written back into Creatomate
  from the Blueprint or the registry.
- **M13 Build Pack — the PK visual gate is never removed or bypassed.** A clean structural diff is
  a precondition for graduation, never a substitute for PK's visual approval.

---

## 3. Workstream dependencies and order (must-have items only — inherited items need no sequencing)

**PK sequencing directive (2026-08-04, §0f): M11a is authorised to start now, read-only, as a
preflight input to the §6 schedule-expansion plan's approval. Do not begin heavy CGU Final
implementation (Phase 2 onward) before that plan is approved.**

```
Phase 0 — CLOSED (2026-08-04, CGU-v1 verdict, §0e) — was "already in flight, closes automatically"
  Milestone-2's remaining 3 cells, all closed via PK-gated supervised recovery:
  PP kinetic (production publish ZScjrWU09AQ) · NDIS YT stat (Lane A re-close) · CFW-LI (manual slot, published)
  → closed M5 as a side effect, per plan; M11b and M6/M10's "Phase 0 closed" dependency are now unblocked

Phase 1 — Foundation (measure before you gate; nothing else is trustworthy without this)
  M1   Loudness measurement            ← blocks: M2 acceptance quality, M6's reproducibility bar, M12's rotation proof
  M7   Render monitoring + cost capture ← blocks: any future cost-control decision (not itself a must-have here)
  M11a Legacy-routing INVENTORY (which scheduled cells are governed/legacy/retired, incl. voice-suffix
       naming-trap variants, incl. the folded M15 kinetic_voice-eligibility-removal sub-scope) ← no
       dependency, cheap (T1), AUTHORISED TO START NOW (§0f) as preflight input to §6's approval —
       everything in Phase 2's M11b closure work is scoped BY this inventory's findings
  M14  WS-5 quality hardening (Lane B) ← no dependency beyond the already-inherited WS-5 envelope
       (§0c/§0e); a foundation item like M1 — M13's own graduation-enforcement outcome and M6's
       template quality both need this landed, not just the 3-template scope §2.1 already covers

Phase 2 — Close known content gaps (does not start before §6's schedule-expansion plan is approved, §0f)
  M2   Voice for CFW + Invegent         ← needs: M1 (a voice proof needs a real loudness number, not presence-only)
  M4   B-roll depth + live platform_scope enforcement ← needs: M1 (combined B-roll+VO QA proof pattern);
       PK-resolved shape (§0f): pool metadata corrected first, then real platform passed into
       selection, missing context fails closed
  M11b Per-cell legacy migration/retirement closures, incl. `kinetic_voice` palette hygiene + eligibility
       removal (folded from M15, §0f) ← needs: M11a inventory (Phase 0 is CLOSED, no longer a blocker)
  M12  Music depth/rotation sourcing — PK-set target 4 tracks, ≥3 exercised in the proof week, no
       unnecessary consecutive same-brand reuse (§0f) ← reuses the proven fenced-first sourcing
       pattern (same shape as the B-roll batch-2 lane)
  M16  CFW natural-pool fitness starvation ← same sourcing shape as M4/M12; tier confirmed must-have
       (§0f) — the manual-slot bridge already proved the recovery path, this closes the underlying
       pool health

Phase 3 — New capability
  M13  Governed Template Build Pack v1  ← needs: the reusable WS-5 envelope foundation complete
                                            (inherited infra, in flight elsewhere); benefits from M14
                                            landing first (its own graduation-enforcement outcome);
                                            PK-directed to sequence BEFORE M6 — the first multi-scene
                                            template should graduate through the Build Pack, not around it
  M6   Multi-scene production-proven format ← needs: Phase 0 CLOSED (done) + M13 landed (§0d
                                                sequencing). PK-set shape (§0f): exactly 3 scenes,
                                                30-45s, hard maximum 45s; longer-form is post-Final (§2.3)
  M10  Provider-neutral contract (design)  ← needs: Phase 0 CLOSED (done — ≥2 real format
                                                implementations now exist to extract a real shared
                                                shape); benefits from M11a's inventory to know the
                                                real (not nominal) format count

Phase 4 — Operational surfacing
  M8   Dashboard Asset Gap Register     ← needs: nothing further — WS-3's backlog is already live;
                                            this can start immediately, in parallel with everything above;
                                            once M13 lands, the same panel must also display M13's
                                            Build Pack status per template (§0d)
  M9   Day-1 package + replay proof     ← needs: nothing structurally. PK-set default (§0f): replay on
                                            an existing brand entering a genuinely new format-mix;
                                            fixture only if no real brand is eligible at execution time

Parallel, any phase, no dependency
  M18  Creatomate key rotation / managed storage ← tier confirmed must-have, mandatory parallel
       security lane, NOT a capability-matrix gate (§0f) — rotate key, managed secrets, remove
       plaintext copies, verify worker auth, preserve evidence, all before Final PASS; schedule
       independently of everything above

Post-Final (§2.3) — not sequenced, not gating
  M17  Auto-approver dead-draft hygiene ← tier confirmed optional/post-Final (§0f); retain a task
       chip, monitor operational impact
```

**Rule preserved from rev-1:** no item is sequenced ahead of the measurement it needs to prove
itself — M1 and M7 are the two "measure first" foundations, same discipline TPR-1 and the audio-
presence gate already taught this programme twice.

---

## 4. Estimated implementation lanes

Counting distinct PK-gated packets/lanes, not calendar time (this programme's own history shows
lane duration varies from same-day to multi-day depending on review-chain findings).

| Item | Est. lanes | Tier | Notes |
|---|---|---|---|
| Phase 0 closure (3 cells) | 3 — **EXECUTED, CLOSED 2026-08-04** | T3 (2), T2 (1) | Verdict: `docs/briefs/results/cgu-v1-final-reread-and-verdict-v1.md` (§0e). All three closed via PK-gated supervised recovery, not the originally-scoped straight-line rungs 8-9/force-fill/evidence-ruling path — each hit a real diagnosed defect en route (kinetic audio-gate contradiction, NDIS template-fit defects, CFW pool starvation) |
| M1 Loudness | 1–2 | T2 | 1 design lane (how to run ffmpeg-equivalent from a Deno EF) + 1 wiring lane; could collapse to 1 if the design is simple |
| M2 Voice ×2 clients | 1 (config) + 2 (proof) = 3 | T2 | Config addition is trivial; the blocker is PK sourcing/approving 2 ElevenLabs voice IDs — a content decision, not an engineering one |
| M4 B-roll depth + live platform_scope | 1 sourcing batch + 1 enforcement-wiring lane (fail-closed on missing platform context) | T2 (sourcing), T2/T3 (enforcement) | Sourcing reuses the proven fenced-first batch pattern; enforcement shape resolved by PK (§0f) — pool metadata first, then real platform passed into selection |
| M6 Multi-scene | 1 design spike + 1 template-authoring lane (WS-4 pattern) + 1 proof lane | T3 throughout | Largest lift in this table; reuses the WS-4 operator-transposition loop, not a new mechanism. PK-set shape (§0f): 3 scenes, 30-45s, hard max 45s |
| M7 Monitoring/cost capture | 1 (capture only) | T1/T2 | Pure additive logging — cheapest lane in this table |
| M8 Dashboard Asset Gap Register | 1 IA-lint pass + 1 build lane | T2 | Can start now; WS-3's backlog is already live to build against |
| M10 Provider-neutral contract | 1 docs lane | T1 | Docs-only; cheapest lane in the whole must-have list; wait for Phase 0 to give it 2 real formats |
| M9 Day-1 package + replay proof | 1 spec-authoring lane + 1 replay lane | T1 (spec), T2/T3 (replay) | No longer a pure decision gate (§0b) — a literal 5th client is off the table, so this is now bounded, buildable work. PK-set default target (§0f): existing brand, fixture only as fallback |
| M11 Governed legacy-path migration & retirement (incl. folded M15) | 1 inventory lane (M11a, authorised to start now) + N closure lanes (M11b, count TBD; at minimum 2 known naming-trap variants `video_short_stat_voice`/`video_short_kinetic_voice`, plus the folded `kinetic_voice` palette-hygiene + eligibility-removal item) | T1 (inventory), T2/T3 per closure | Inventory is cheap, authorised to start immediately (§0f) as preflight input to §6; the only way to bound this workstream's real size |
| M12 Music depth/rotation | PK number set (§0f): 4 tracks required, ≥3 exercised in the proof week — 1 sourcing batch + 1 rotation-proof lane | T2 (sourcing), T1 (proof, reuses B-roll's uniformity method) | No longer blocked on a PK number |
| M13 Governed Template Build Pack v1 | Not yet scoped | T2 (schema design + structural-diff automation), T3 (registry/constraint-record persistence + graduation-gate authority) | New PK-directed additive amendment (§0d, 2026-08-03); sequenced after the WS-5 envelope foundation, before M6 (first multi-scene template); lane count TBD pending a scoping pass |
| M14 WS-5 quality hardening (Lane B) | Not yet scoped | T2 (calibration/enforcement wiring per §0c outcomes 1-4,6-7), T3 (graduation-gate authority, §0c outcome 5) | Carried from §0c via the verdict (§0e); `ws5-production-template-calibration-backfill`; must-have confirmed (§0f) — only lane count is open |
| ~~M15~~ | — | — | **MERGED into M11 (§0f)** — see M11's row above |
| M16 CFW natural-pool fitness starvation | 1 sourcing batch + 1 pool-health proof lane | T2 (sourcing), T1 (proof) | Same shape as M4/M12 sourcing; must-have confirmed (§0f) |
| M17 Auto-approver dead-draft hygiene | Not yet scoped | T1/T2 | **Moved to §2.3, optional/post-Final (§0f)** — retain task chip, monitor operational impact |
| M18 Creatomate key rotation / managed storage | Not yet scoped | T3 (secret rotation touches live credentials) | Mandatory parallel security lane, confirmed must-have, NOT gated by the capability matrix (§0f) — rotate key, managed secrets, remove plaintext, verify worker auth, preserve evidence, before Final PASS |

**Total estimated new-work lanes (excluding Phase 0, which is now closed/executed rather than
estimated, and excluding M11b/M12/M13/M14/M16/M18 pending their own lane scoping): ~15–19 lanes**
for the original rev-3/§0d must-haves, most T2, three T3 (M6's template/worker path, M4's
platform_scope enforcement lane, and any M11b closure that touches live selection behavior) —
**plus the four surviving §0e/§0f carries (M14, M16, M18, and M11's M15-fold) once each is
lane-scoped; M17 moved out of the must-have count entirely (§2.3).**

**First three implementation lanes proposed (amended, PK direction 2026-08-02)** — the three
foundation/measurement lanes from Phase 1 (§3), none requiring a further PK decision to start:
1. **M11a — legacy-routing inventory.** T1, read-only, no dependency. Bounds M11's real size before
   anything else in that workstream is scoped, and directly informs M10's real format count.
2. **M7 — render monitoring + cost capture** (observability only, no cap proposed). T1/T2, pure
   additive logging, no dependency, cheapest lane that unblocks a real future cost conversation.
3. **M1 — automated loudness measurement.** T2, 1–2 lanes (design + wiring). Completes the Phase-1
   foundation trio — M2's voice-acceptance quality and M6's multi-scene reproducibility bar both
   need this landed first (§3), so it earns its place in the first three over M8 despite M8 having
   no technical blocker of its own.

**M8 — Dashboard Asset Gap Register follows these three** (Phase 4, §3) — not technically blocked by
them (WS-3's backlog is already live to build against), but sequenced after the foundation trio by
priority. T2, `dashboard-ia-lint` pass first, then the panel.

**Gate on everything beyond M11a/M7/M1/M8/M14 (PK, 2026-08-04, §0f):** heavy CGU Final
implementation — Phase 2 onward (§3) — does not begin before the §6 schedule-expansion plan is
itself PK-approved. M11a runs now specifically as that approval's preflight input.

---

## 5. PK decisions — ALL RESOLVED 2026-08-04 (§0f)

Was "Open PK decisions" until PK ruled on every item the same session as §0e's reconciliation.
Kept as the historical decision log; each item's resolution is also folded into §2.2/§3/§4 at its
point of use.

1. **M9 — replay target. RESOLVED.** Use an existing active brand entering a genuinely new
   governed format mix. Use an isolated fixture only if no real brand is eligible at execution
   time.
2. **M12 — minimum music library depth. RESOLVED.** Require 4 selectable Content-ID-safe tracks.
   The proof week must exercise at least 3, with no unnecessary consecutive reuse for the same
   brand.
3. **M4 — `platform_scope` enforcement. RESOLVED.** Enforce it live. Correct pool metadata first,
   then pass the real platform into selection. Missing platform context fails closed;
   `platform_scope` must not remain decorative.
4. **M6 — render-ceiling budget. RESOLVED.** First production-proven multi-scene format = 3
   scenes, 30–45 seconds, hard maximum 45 seconds. Longer-form work is post-Final (§2.3).
5. **M11 — retirement authority. RESOLVED.** Migrate every active, scheduled, or committed legacy
   route to governed by default. Explicitly retire only unused, superseded, or disproportionately
   expensive routes, with a recorded PK disposition.
6. **P-1 — programme brief final ratification. RESOLVED — RATIFIED.** Ratify programme brief
   rev-2 now and link it to the final CGU-v1 25/25 verdict. Preserve the brief as the historical v1
   contract. Applied: `docs/briefs/creatomate-global-ultimate-programme-brief-v1.md` (status,
   §4.3 P-1 row, closing line).
7. ~~**Whether to close the 3 remaining Milestone-2 cells (Phase 0) before or in parallel with
   starting must-have work.**~~ **RESOLVED — moot.** Phase 0 closed 2026-08-04 (CGU-v1 verdict,
   §0e) before this decision was reached; M5/M10/M11b are unblocked.
8. **Tier ruling for the four CGU-v1 verdict carries (§0e). RESOLVED.**
   - **M15 — `kinetic_voice` palette hygiene.** Mandatory before unsupervised PP kinetic
     scheduling, but **folded into M11** rather than a separate Final workstream. Unsupported
     `kinetic_voice` eligibility is removed unless/until that format receives its own governed
     implementation and proof.
   - **M16 — CFW natural-pool fitness starvation.** CGU Final **must-have**. The normal governed
     source/fill path must become sustainable; repeated supervised manual slots are not an
     acceptable steady state.
   - **M17 — auto-approver dead-draft hygiene.** **Optional/post-Final** (moved to §2.3). Retain
     the task chip and monitor operational impact.
   - **M18 — Creatomate key rotation.** **Mandatory parallel security prerequisite**, not a
     creative-capability workstream. Rotate the key, move it to managed secrets, remove plaintext
     copies, verify worker authentication, and preserve evidence — before Final PASS.
   - **M14** stays a must-have, unchanged.
9. **Sequencing directive (PK, same ruling). RESOLVED.** M11a may run as a preflight input to the
   §6 optimum-schedule apply — authorised to start now, read-only. **Heavy CGU Final
   implementation does not begin before the §6 schedule-expansion plan is itself approved.**

---

## 6. Appendix — `post-ultimate-schedule-expansion-v1` (rebuilt from the 22/25 readiness matrix)

**Status: proposal only, superseding rev-1's PP-only-baseline appendix entirely. No cap, cadence,
or mix below is authorised.** **This is the specific approval PK's §0f/§5 item 9 sequencing
directive names: M11a runs now as its preflight input, but Phase 2-onward CGU Final implementation
does not begin until PK approves a mix (or explicitly waives this section) here.**

### 6.1 Baseline this appendix now measures against (not rev-1's PP-only baseline)

- **25 committed cells across 4 clients; 25/25 state-1 as of the CGU-v1 verdict, 2026-08-04 (§0e)**
  — dated historical reading at time of writing was 22 state-1, 3 closing via already-authorized
  lanes (Phase 0, §3); all three since closed.
- Governed formats live: `image_quote` (12/12 cells routed or state-1), `text` (8/8
  state-1 via D1), `carousel` (PP FB/IG state-1 via D2; NDIS/CFW deferred), `video_short_stat` (PP
  live, NDIS live — contained per §0c/§0e, visual remediation via Lane B/M14 still owed),
  `video_short_kinetic` (PP live, `kinetic_voice` palette hygiene/M15 owed before unsupervised
  scheduling).
- CFW/INV YouTube: explicitly deferred (D3) — not part of any expansion mix below.
- LinkedIn cadence: max 2/day by design — any raise is Open PK Decision, not proposed here.

### 6.2 Proposed mixes (each gated on a specific §2.2/§3 item — not a schedule)

| Mix | Client(s) | Cell(s) | Proposed cap | Unlocked by |
|---|---|---|---|---|
| E1 | PP, NDIS, CFW, INV | all 25 state-1 cells | unchanged — already live | nothing; this is the current baseline, not an expansion (Phase 0 CLOSED, §0e) |
| E2 | PP | `video_short_kinetic` YT, post-graduation | match current legacy kinetic cadence, no increase at first | Phase 0 item 1 CLOSED (production publish `ZScjrWU09AQ`) — still gated on M15 (`kinetic_voice` palette hygiene) before *unsupervised* cadence |
| E3 | NDIS | `video_short_stat` YT, post-proof | 1/week initial | Phase 0 item 2 CLOSED (Lane A re-close) — still gated on M14/Lane B (full calibration) before further volume, per §0c's containment |
| E4 | CFW | LinkedIn `image_quote` | resume at existing cadence once evidence ruling made | Phase 0 item 3 CLOSED (manual-slot publish) — natural-cadence resumption still gated on M16 (pool fitness starvation); the manual slot is a bridge, not a fix |
| E5 | CFW, Invegent | any video format | none proposed | **blocked on M2** — 0/2 voice-configured; do not expand video onto voice-blind clients |
| E6 | CFW, Invegent | YouTube, any format | none proposed | **blocked on D3** — explicitly deferred, not reopened by this appendix |
| E7 | any | LinkedIn cadence raise | none proposed | Open PK Decision (§5), Path-B lever exists but unpulled |
| E8 | 5th client | tbd | tbd | **Moved out of Final scope entirely (§2.3, §0b)** — a literal 5th client is post-Final commercial validation, not a Final-lane expansion; no mix proposed here or later in this appendix |
| E9 | any cell M11a finds silently legacy-routed | n/a | **zero expansion** — a cell caught mid-migration or awaiting a retirement ruling gets no volume increase until M11b closes it | M11 closure (§2.2) |

### 6.3 Rollback and proof discipline (unchanged from rev-1 — still the correct pattern)

Every expansion row ships with a single, digest-exact, self-verifying `execute_sql` rollback,
reusing the pattern already proven twice in this codebase (B-roll parity activation, registry-
integrity repair). Before/after readiness-queue snapshots (the same shape as the 25-cell matrix in
§1 of this document) are mandatory for every row — a cell moving from `ready` to any failure state
is an automatic STOP.

---

## 7. Appendix B — first-week operating plan (restored, rebuilt against the reconciled baseline)

**Status: measurement plan only. Applies once PK ratifies a §6 expansion mix — this section defines
how it will be watched, not what will run. Every figure below is the reconciled 2026-08-02 baseline,
not rev-1's stale one.**

### 7.1 Governed-versus-legacy share

- Baseline to watch against: PP YouTube 2-of-44 governed (§1) — track this ratio weekly per cell,
  not as a single programme-wide percentage (per M11's own no-percentage-gate principle, §2.2). A
  cell either has a real governed occurrence in the week or it doesn't; report per-cell counts.
- Watch specifically for the naming-trap class M11 targets: any `_voice`-suffixed format publishing
  in the week should be checked against whether it actually hit the governed fork, not assumed from
  its base format key.

### 7.2 Render / publish success

- Render terminal-fail rate and timeout-retry rate, read directly off the Reliability lane's
  existing classifiers (`classifyRenderFailure`) — already instrumented; Week 1 just needs daily
  reading.
- Publish-anomaly count: any draft reaching `publish_proven` outside its scheduled window (the
  schedule-blind-autopublish class, already fixed once for `youtube-publisher` v1.14.0) — Week 1 is
  a live re-confirmation given kinetic's imminent first natural YouTube publish.

### 7.3 QA

- M1's LUFS pass rate, once M1 lands: target 100% of voiced/music-bed renders carry a non-null
  measurement. If M1 hasn't landed by Week 1, report "presence-only gate still the ceiling" rather
  than omitting the section.
- TPR-1 spec-match on any template involved in a Week-1 render — output spec on record and diffed
  against the prior default, per the standing rule.
- PK visual-approval pass rate on first-render-per-newly-closed-cell (the 3 Phase-0 cells, once
  closed).

### 7.4 Repetition

- Music: with exactly 1 selectable track today (M3, inherited/met), Week 1 will show 100% repeat —
  this is expected and not a failure, but it is the exact evidence M12's PK depth-number decision
  should be made against. Report it plainly.
- B-roll: distinct-locality count actually exercised in the week, against the known baseline (3
  distinct localities across 6 clips, Sydney-concentrated, §1).
- Rotation seed distribution: reuse the existing uniformity check (40+ seeds, near-uniform
  distribution expected) for any pool a Week-1 mix draws from.

### 7.5 Asset Gap movement

- WS-3's live writer (cron `jobid=94`) fires daily — report the actual open/resolved delta in
  `ice_ro.asset_gap_backlog` across the week, now that this is a live-moving number rather than the
  frozen 8-row ledger rev-1 had to caveat.
- Cross-check the markdown register's 9 structurally-unrepresentable pool-depth items by hand (they
  will never appear in the DB delta by construction, per the two-register model, §1).

### 7.6 Fallback behavior

- Confirm zero `unsupported_silent_degrade` cells produced a live publish during the week (S7/S9
  containment should make this structurally impossible — Week 1 is a live re-confirmation, not a
  new build).
- For any cell M11a flags as legacy-routed but not yet closed: confirm it degrades to a *named,
  logged* legacy path, not a silent one — the inventory step itself should make "silent" impossible
  to claim by Week 1's end, even before closure lands.

### 7.7 Format distribution

- Per-client, per-format publish counts for the week, same shape as §1's readiness-matrix table —
  this is the natural weekly re-run of a subset of the same measurement, not new instrumentation.
- Explicitly flag any format publishing outside the 25-cell committed matrix (would indicate either
  a matrix gap or an enforcement gap — should be zero, per Milestone 1).

### 7.8 Provider cost

- M7's capture (once landed): report an actual weekly Creatomate cost/credit figure. If M7 hasn't
  landed by Week 1, say so explicitly — "unknown, not yet captured" — rather than omitting the
  section, consistent with this document's own no-silent-gaps discipline.
- No cap exists to breach today, and none is proposed here — Week 1's job is producing the first
  real number a future cap could be sized against.

---

## 8. Non-claims

**As of 2026-08-04 (§0f): the programme brief's rev-2 IS ratified (P-1, PK act, applied to the
brief itself) and every §5 decision IS resolved.** What this document still does NOT do: it does
not itself authorise any expansion mix in §6 (that is a separate, still-open PK approval — §0f/§5
item 9 makes it the explicit gate on Phase 2-onward implementation) or the Appendix B measurement
plan's activation; it does not build any must-have item (M11a is authorised to *start*, not
complete); and it is not itself a register-cut authority beyond the pointer already cut
(`docs/00_sync_state.md`) — future must-have applies each go through their own T2/T3 gate per
CLAUDE.md, unchanged by this ratification. It corrects rev-1's stale baseline, carries PK's four
rev-3 amendments, reconciles the CGU-v1 verdict (§0e — Phase 0 closed, M5 MET, §0c's Lane A
delivered/Lane B surviving as M14), and records PK's full ruling on the must-have list and every
§5 decision (§0f). The CGU-v1 verdict itself
(`docs/briefs/results/cgu-v1-final-reread-and-verdict-v1.md`) already declared v1 COMPLETE — this
document governs Final only.
