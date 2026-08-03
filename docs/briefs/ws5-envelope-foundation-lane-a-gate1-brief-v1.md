# Brief — Lane A: `ws5-production-envelope-enforcement-foundation` (Gate 1)

**Created:** 2026-08-03 Sydney
**Author:** chat (orchestrator; evidence-gathered + live-verified this session)
**Executor:** Claude Code (orchestrator + subagents) with PK at every named gate; Creatomate editor acts + EF deploys + DB applies are PK-run
**Status:** issued — Gate 1 APPROVED 2026-08-03 (PK), P1 only authorized; P2–P5 retain separate gates
**Result file:** `docs/briefs/results/ws5-envelope-foundation-lane-a-result-v1.md` (created on completion)
**Authorized by:** PK boundary ruling 2026-08-03 (run-sheet §RE-CLOSE RULE ADJUSTED; audit result §6h; proposal §0c)
**Seed:** `docs/briefs/cgu-lane-a-ws5-envelope-foundation-seed-v1.md` (branch `lane/cgu-final-readiness-audit`)
**Tier:** T3 overall (production DB writes + EF deploy + production template edit); phases individually tiered below. Lane class: SAFETY_GATE.

---

## Task

Build the reusable WS-5 envelope-enforcement foundation AND execute the contained CGU-v1 repair of
`video_stat_reveal_9x16_v2`, ending at PK's visual PASS on one corrected NDIS render and the
re-close of the NDIS × YouTube × `video_short_stat` cell per the five adjusted re-close conditions.
Fleet-wide backfill is OUT (Lane B, CGU Final).

## Source context

- `docs/briefs/cgu-lane-a-ws5-envelope-foundation-seed-v1.md` (lane branch) — the seed packet; deliverables 1–6.
- `docs/briefs/cgu-ndis-yt-stat-supervised-proof-runsheet-v1.md` (lane branch) — ADDENDUM (3 defects, containment, evidence inventory) + §RE-CLOSE RULE ADJUSTED (five conditions; no-second-publish rule; twice-failed-gate fallback = PK re-defers to state-2).
- `docs/briefs/results/cgu-final-readiness-audit-result-v1.md` §6e–§6h (lane branch) — incident record + boundary ruling.
- `docs/briefs/creatomate-global-ultimate-final-delta-audit-v1.md` §0c (branch `lane/cgu-final-proposal-ws5-correction`) — seven-outcome full-WS-5 definition; Lane A implements the foundation subset.
- `docs/briefs/results/s9-cta-text-bounds-minimal-landing-packet-v1.md` + `docs/briefs/artifacts/s9-cta-text-bounds-minimal-landing-patch-v1.diff` — the parked 3-file validator (v6.91; 11/11 + 4/4 at rebase-check). Old ai-worker hunk EXCLUDED by design (predates v2.25.0).
- `docs/briefs/s9-cta-text-bounded-copy-dead-draft-diagnosis-packet-v1.md` — Option B (bounded regeneration before persistence) design the integration follows.
- `docs/briefs/results/creatomate-registry-integrity-graduation-contract-v1.md` §4 — graduation ladder; material-edit ⇒ re-capture; rung 6 (PK visual approval) semantics.
- `docs/briefs/results/ws5-constraints-shape-design-lane-result-v1.md` — probe-calibration method precedent (kinetic template).
- `supabase/migrations/20260801043347_tmr5_field_constraints_write_rpcs_and_intake_validator_v2.sql` — the governed write RPCs: `record_tmr_template_field` · `set_tmr_field_constraints` · `record_tmr_platform_suitability` · `set_tmr_platform_constraints` · `validate_tmr_template_intake` (all service-role-only).
- `scripts/ws4-d4-kinetic-proof-render.ts` — out-of-band zero-DB-writes proof-render precedent.
- `supabase/functions/ai-worker/index.ts` v2.25.0 — `clampField()` char-only clamp (stat_value≤12 · stat_label≤35 · context_line≤75 · cta_text≤65) at lines ~767–770; S9 capability gate; schedule-authority pin.

## Live state (verified this session, 2026-08-03, project `mbkmaxqhsohbtwsqolns`)

- Assignment `aa2179eb-800e-4d0f-a323-925705942b73` = `blocked`, `approved_by='PK'`/`approved_at` preserved. ✅ matches seed.
- `select_template('ndis-yarns','youtube','video_short_stat')` → `fail_closed / no_selectable_template` (reason `assignment_blocked` on `a3d8472d…`). ✅
- Readiness cell NDIS×YT×stat = `blocked` / responsible lane `capability_template_remediation`. ✅
- PP assignment `1ee1a547…` = `visually_approved`, NOT contained. ✅ Template shared.
- WS-5 calibrated templates confirmed: kinetic `9ad024cc…` (26 field rows, all constraints) · `generic_market_insight_card_1x1_v1` (9) · `generic_quote_card_1x1_v1` (8). ✅
- **NEW FINDING (F-1):** `video_stat_reveal_9x16_v2` (`a3d8472d…`) has ONLY 2 field rows (Background, Logo). **No StatValue / StatLabel / ContextLine / CtaText / VoiceAudio / MusicBed rows exist.** The persist step must first CREATE the text/audio field rows via `record_tmr_template_field`, then set constraints — a different write shape than the v6.126 CAS-from-NULL population. Graduation-ladder rung 2 (field-contract compatibility) was never satisfied in the registry for this template.
- **NOTE (F-2):** template `inventory_hash` is EMPTY (`captured_from_manual_entry`) — the post-edit re-capture will be its first content fingerprint.
- **NOTE (F-3):** a materialised NDIS YT stat slot exists at 2026-08-03T10:00Z; under containment S9 skips it terminally — expected, no action.
- **NOTE (F-4):** ai-worker's char clamps (35/75/65) are TIGHTER than video-worker's render-gate constants vendored by the parked validator (48/160/90); the incident proves char-count alone is the wrong dimension either way. The integration makes persisted per-template constraints primary; char clamp remains only as fallback.

## Scope

**In scope:** deliverables 1–6 of the seed — (1) land the 3 parked validator files + fresh ai-worker integration; (2) ai-worker consumes the selected template's persisted constraints pre-generation; (3) graduation calibration-gate mechanism (proposed below, D-2); (4) repair + re-capture + probe-calibrate + persist constraints for `video_stat_reveal_9x16_v2`; (5) one corrected NDIS replacement render, out-of-band, zero DB writes → PK visual PASS; (6) re-close (assignment restore + selector/readiness verify + result doc + version-less register payload).
**Out of scope:** Lane B fleet-wide backfill · any publish · PP YT kinetic rungs 8–9 · CFW-LI lane · register version cuts · any change to `select_template` filters, publisher, or rendering authority (would trip the second-publish rule) · the two adjacent S9 diagnosis findings (dead_reason-NULL drafts; ai-worker:1173 error-discard) — restated, not absorbed.

## Gate-1 decisions requested (D-1…D-4)

- **D-1 — Generation-time fail-closed behaviour** (deliverable 1/2 design). PROPOSAL: Option B per the diagnosis packet — validate the stat generator's parsed output against the selected template's persisted constraints (fallback: vendored char bounds); on violation, ONE bounded re-prompt carrying `buildBoundReminder()`; if still violating, clamp only where a constraint declares clamping safe, else fail the draft closed with a machine-readable `dead_reason` (never persist a known-out-of-envelope draft). No silent multi-retry loops.
- **D-2 — Graduation calibration-gate mechanism** (deliverable 3). PROPOSAL: a contract rule (graduation contract §4 gains a mandatory rung: persisted calibration + passing probes BEFORE any assignment may reach `visually_approved`+selectable) enforced at intake/graduation time via `validate_tmr_template_intake` + the human ladder — explicitly NOT a new `select_template` filter, which would change governed routing and trip the second-publish requirement (that enforcement point is Lane B/Final material). CCF-02 never-automate-approval unchanged: the gate blocks un-calibrated graduation; it approves nothing.
- **D-3 — PP re-probe scope** after the template edit: PK in-lane decision once the edit's blast radius is known (eyebrow-only edit is geometry-neutral for PP's already-approved content class, but PP shares the template). Any PP `select_template` winner change = STOP and surface.
- **D-4 — Eyebrow disposition** at the Creatomate sitting: remove vs parameterise (PK's call in-editor; parameterise adds a new modification field → field-contract + worker implications; remove is the minimal-blast-radius default).

## Execution phases (each with its own gate)

- **P1 (T2, code):** ef-builder isolated worktree — land the 3 parked files byte-identical (re-verify parity 4/4 + unit 11/11 against today's `main`) + author the FRESH ai-worker integration per D-1 (constraints read → validate → bounded regen → fail-closed), VERSION bump. Full chain: hermetic tests · branch-warden · external review pinned to hash · PK merge gate. Deploy = PK-run (sanctioned `safe-deploy.sh --allow-warn`; verify_jwt gotcha; deploy-verifier after).
- **P2 (PK operator act):** Creatomate editor sitting — eyebrow per D-4. Material edit ⇒ re-capture (`captured_from_manual_entry` precedent) + calibration-invalidation acknowledged (none persisted yet for this template — F-1).
- **P3 (T2 probes + T3 persist):** probe-render calibration per the WS-5 kinetic method (watch the 2-min render ceiling — a trip = STOP after two failures, fallback per run-sheet); then ONE reviewed apply packet: `record_tmr_template_field` inserts for the missing field rows + `set_tmr_field_constraints` triples (probe-derived, CAS-from-NULL) + platform rows if needed. Chain: db-rls-auditor · AHA shadow · external review · PK apply gate. Rollback written + validated before apply.
- **P4 (T2, zero-DB-writes):** one corrected NDIS replacement render out-of-band (ws4-d4 precedent script pattern) → present to PK → **PK visual PASS** (gate; a FAIL loops to P2/P3 once — twice = STOP, PK re-defer fallback).
- **P5 (T3, re-close):** reviewed apply packet: assignment `aa2179eb…` `blocked`→`visually_approved` (approval columns untouched) → verify `select_template` selects + readiness cell leaves `blocked` → verify PP winner unchanged → result doc + version-less register payload to the register-cut owner. NO publish.

## Allowed actions

- Read-only evidence gathering (R0 views first; `execute_sql` for `c.*`/`m.*` reads).
- ef-builder code work in an isolated worktree; hermetic/local tests.
- Probe renders (Creatomate API render calls per the WS-5 probe precedent — render-only, no template mutation; out-of-band proof render likewise zero-DB-writes).
- Drafting apply packets, rollbacks, review packets; running the named auditors + external review.
- Local commits only on PK instruction; push only on explicit PK instruction.

## Forbidden actions

- Deleting/rewriting ANY preserved evidence: publish `9fb06e0a…`/`oCrtq6R9VFQ` · render `ebfb44cf…`/creatomate `bf399d21…` · proof events `c9150005-…{1,2}` + CP-E visual_approval · rejected draft `d6c7e3e3…` · the four-attempt record.
- Any publish (the no-second-publish rule holds unless routing/authority/publisher changed — this lane is designed NOT to change them).
- Any `select_template` / publisher / rendering-authority behaviour change.
- Touching PP/CFW/INV cells beyond verified non-regression; starting Lane B; absorbing the PP-kinetic or CFW-LI lanes.
- Register version cuts (payloads to the register-cut owner only).
- Orchestrator-run deploys, migrations, Creatomate editor acts (all PK-run).
- Un-reviewed DB writes of any kind; `execute_sql` DML outside a PK-gated apply packet.

## STOP conditions (surface to PK immediately)

- Any PP `select_template` winner change at any verification point.
- Provider template hash/identity change without re-capture.
- Any repair step found to touch routing/authority/publisher (triggers the second-publish question — PK decides).
- `video-worker` 2-min render ceiling trips on probes (twice = fallback: PK re-defers cell to state-2 with evidence).
- Any non-clean auditor/external verdict; any apply-packet guard trip; hash mismatch; unexpected origin movement.
- Any gate failing twice (run-sheet fallback rule).

## Success criteria (= the five adjusted re-close conditions + foundation)

1. Baked "MARKET UPDATE" copy removed or parameterised (per D-4), template re-captured.
2. Safe StatValue + ContextLine (+ full field set) bounds implemented for `video_stat_reveal_9x16_v2`: field rows created, probe-derived constraints persisted via governed RPCs, ai-worker consumes them pre-generation, bounds validator landed + wired (fail-closed per D-1).
3. One corrected NDIS replacement render produced out-of-band with zero DB writes.
4. PK visual PASS recorded on that render.
5. Assignment `aa2179eb…` restored `blocked`→`visually_approved` (approval columns untouched); `select_template` returns the template as `selected`; readiness cell no longer `blocked`; PP winner verified unchanged.
6. Foundation reusable beyond this template: validator + consumption path + D-2 graduation rule are template-generic (Lane B consumes them without rework).
7. Result doc written; version-less register payload delivered; no publish occurred; all preserved evidence untouched.

## Stop condition

Report result per `docs/briefs/_template_result.md`, deliver the register payload to the register-cut
owner, then stop. If the fallback trips: record the failure evidence and surface PK's state-2
re-deferral option instead — no forcing, no synthetic proof.

---

## Gate-1 outcome (PK rulings, 2026-08-03 — verbatim in effect)

- **D-1 APPROVED (Option B):** validate against persisted per-template constraints · ONE bounded
  re-prompt · then fail the draft closed with a named `dead_reason`. No silent truncation, no legacy
  fallback, no persistence of out-of-envelope content. **Preserve both validation attempts in QA
  evidence.**
- **D-2 APPROVED (contract rule + intake-validation enforcement; NO global `select_template` filter
  in this lane).** Restoration preconditions (all five, additive to the re-close rule): every actual
  modification field registered · required text fields carry probe-calibrated constraints · intake
  validation passes · the corrected render passes live bounds enforcement · PK visual PASS.
  Fleet-wide selectable-template enforcement = Lane B.
- **D-3 — PP re-probe MANDATORY** after the shared provider-template edit: one controlled,
  non-published PP comparison render, preserving PP's "MARKET UPDATE" value; verify geometry,
  animation, duration, resolution, audio shape against the accepted baseline. Any PP selector-winner
  change, routing change, or visual regression = hard STOP. No second PP publish if routing and
  output specification remain unchanged.
- **D-4 — PARAMETERISE the eyebrow (do not remove):** governed bounded `EyebrowText` field using
  assignment/client-approved values, NOT freeform AI — Property Pulse: `MARKET UPDATE` ·
  NDIS Yarns: `NDIS UPDATE`. Calibrate + validate it like every other visible text field.
- **F-1 disposition:** create registry field rows via `record_tmr_template_field` for every actual
  modification field before calibration; record prior condition as
  `graduation_contract_rung_2_incomplete` (template became selectable before its complete field
  inventory existed).
- **Authorization:** brief approved; **P1 only**. No assignment restoration, production DML, public
  publish, or CGU-v1 re-close authorized at this gate. Lane A stays bounded to: reusable WS-5
  enforcement foundation · `video_stat_reveal_9x16_v2` calibration and repair · corrected NDIS
  visual re-pass. Fleet-wide backfill = Lane B.

## Notes

- Local `main` is behind `origin/main` by 1 (`5044b7c`, a runtime marker commit) with a dirty tree
  (182 untracked docs/harness paths) — P1's worktree forks from fetched `origin/main`; the shared
  checkout is not mutated mid-lane.
- The seed's governing docs live on the two lane branches, not `main` — result doc will cite
  branch-qualified paths.
