# SEED PACKET — Lane A: `ws5-production-envelope-enforcement-foundation`

**Purpose:** the reusable WS-5 envelope-enforcement foundation PLUS the contained CGU-v1 repair of
`video_stat_reveal_9x16_v2`, ending at PK's visual PASS on one corrected NDIS render and the
re-close of the NDIS × YouTube × `video_short_stat` cell. Authorized by PK's boundary ruling
2026-08-03. Fleet-wide backfill is explicitly OUT (Lane B, CGU Final).

**Governing (read in this order):**
`docs/briefs/cgu-ndis-yt-stat-supervised-proof-runsheet-v1.md` (branch `lane/cgu-final-readiness-audit`) —
the ADDENDUM (defects, containment, evidence) + §RE-CLOSE RULE ADJUSTED (the five conditions, the
no-second-publish rule) · `docs/briefs/results/cgu-final-readiness-audit-result-v1.md` §6e–§6h ·
CGU Final proposal §0c (branch `lane/cgu-final-proposal-ws5-correction`) — the seven-outcome full-WS-5
definition (Lane A implements the foundation subset) · `docs/briefs/creatomate-global-ultimate-programme-brief-v1.md` ·
graduation contract `docs/briefs/results/creatomate-registry-integrity-graduation-contract-v1.md` §4.

## Live state at seed time (2026-08-03, project `mbkmaxqhsohbtwsqolns` — re-verify, don't trust)

- Assignment `aa2179eb-800e-4d0f-a323-925705942b73` (NDIS × `video_stat_reveal_9x16_v2`, template
  `a3d8472d…`, provider_template `c11bb8ab…`) = **`blocked`** (containment; `approved_by='PK'`/
  `approved_at` preserved). `select_template('ndis-yarns','youtube','video_short_stat')` fail-closes;
  readiness cell = `blocked / capability_template_remediation`. All evidence preserved: publish
  `9fb06e0a…`/`oCrtq6R9VFQ` · render `ebfb44cf…`/creatomate `bf399d21…` · proof events
  `c9150005-…{1,2}` + CP-E `visual_approval` · rejected draft `d6c7e3e3…` (do not touch any of these).
- **⚠ PP SHARES THIS TEMPLATE**: PP assignment `1ee1a547…` (`visually_approved`, NOT contained) +
  two other PP stat templates. PP YT stat cell is CLOSED state-1. Template repair affects PP too —
  scope of PP re-probing/re-approval after the edit is an in-lane PK decision; any PP selector-winner
  change = STOP and surface.
- WS-5 machinery LIVE: governed constraints write RPC (Phase 1) + 3 calibrated templates (kinetic
  `9ad024cc…`, `generic_market_insight_card_1x1_v1`, `generic_quote_card_1x1_v1`, register v6.126) +
  the WS-4 intake-validation consumer reads them. Carry: `off_timeline` validator-vocabulary item.
- Parked bounds validator: `docs/briefs/results/s9-cta-text-bounds-minimal-landing-packet-v1.md` +
  `docs/briefs/artifacts/s9-cta-text-bounds-minimal-landing-patch-v1.diff` (v6.91) — 3 files
  (`video_stat_bounds.ts` + unit test + one-source-of-truth parity test vs `video-worker/b1_video_stat.ts`),
  rebase-checked 4/4+11/11 at the time. **Its old ai-worker integration hunk is EXCLUDED by design**
  (predates ai-worker v2.25.0 S9 rewrite) — integration must be written fresh.
- ai-worker: `clampField()` clamps stat fields by CHAR COUNT only (stat_value≤12 · stat_label≤35 ·
  context_line≤75 · cta_text≤65) — the defect class ("2 people", 8 chars, two words) passes it.
  Authority pin + `isVideoStatGovernanceEnabled` live; NDIS governance row `c9150004-…0001` enabled.
- Defects to fix (from the live incident): (1) static "MARKET UPDATE" eyebrow — baked template text,
  wrong-brand + collides with StatValue; (2) StatValue geometry — needs a numeric/content envelope
  (word-count/line rules, not chars alone); (3) ContextLine exceeds text-safe width — never
  probe-calibrated.

## Deliverables (the foundation + the repair)

1. **Land + wire the reusable bounds validator** — land the 3 parked files, then a FRESH ai-worker
   integration: validate the stat generator's output against per-template bounds before the draft is
   finalized (fail-closed behaviour to be designed: clamp/reject/regenerate — surface the choice at
   Gate 1).
2. **Generator consumes stored constraints** — ai-worker receives the SELECTED template's persisted
   constraints (from `creative_provider_template_field.constraints` via the WS-5 read path) before
   writing content; char-only clamp becomes the fallback, not the primary.
3. **Graduation calibration-gate** — no template becomes production-selectable without persisted
   calibration + passing probes (mechanism proposal at Gate 1: contract rule + intake-validation
   enforcement; keep CCF-02's never-automate-approval boundary).
4. **Repair + calibrate `video_stat_reveal_9x16_v2`**: PK Creatomate-editor sitting to remove/
   parameterise the eyebrow (NO template-edit API exists — operator act; a material edit changes the
   provider template → re-capture per registry-integrity rules, `captured_from_manual_entry`
   precedent, and invalidates prior calibration by the change-invalidation principle) → probe-render
   calibration (WS-5 probe method precedent) → persist constraints via the governed write RPC.
5. **One corrected NDIS replacement render** — out-of-band, zero DB writes (precedent:
   `scripts/ws4-d4-kinetic-proof-render.ts` bypasses `select_template`) → **PK visual PASS**.
6. **Re-close**: restore assignment `blocked`→`visually_approved` (PK gate) → verify
   `select_template` selects + readiness cell `ready` → record the re-close (result doc pointer +
   version-less register payload to the register-cut owner). **NO second public publish** unless the
   repair changed governed routing, rendering authority, or publisher behaviour (PK rule).

## Constraints / STOPs

- T2/T3 per house tiers; every DB write via reviewed packet + PK apply gate; EF deploys are PK-run
  (orchestrator deploys are permission-blocked in this environment — proven); Creatomate editor acts
  are PK-only. Full review chain on code + DML (db-rls-auditor · branch-warden · AHA shadow ·
  external review pinned to hash).
- STOP + surface: any PP `select_template` winner change · provider template hash/identity change
  without re-capture · any repair touching routing/authority/publisher (triggers the second-publish
  requirement) · `video-worker` 2-min render ceiling trips on probes.
- Do NOT: delete/rewrite any preserved evidence · touch PP/CFW/INV cells beyond verified
  non-regression · start Lane B backfill · publish anything · cut register versions (payloads to the
  register-cut owner).
- Parallel context: PP YT kinetic rungs 8–9 and CFW-LI publish/proof-event are OTHER lanes' work —
  do not absorb them.
