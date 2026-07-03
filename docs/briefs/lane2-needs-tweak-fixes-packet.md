# Lane 2 — Needs-Tweak Template Fixes — Review Packet

**Created:** 2026-07-03 Sydney · **Queue:** item 2 (PK-ratified order) · **Source decisions:** Lane B gallery review (v4.78: 4 units needs-tweak)
**Status:** fix previews rendered — **awaiting PK before/after review (gate)**. **Nothing saved, nothing mutated:** no Creatomate template modified, no DB change, no render-path/production surface touched. Previews in `_harness/lane2_fix_previews/` + gallery `lane2_before_after_review.html`.

## 1. Per-unit diagnosis and fix

| Unit | Diagnosis | Fix class | Fix |
|---|---|---|---|
| **1 — market_insight** | Perth headline over Brisbane skyline — an ASSET-PAIRING artifact of seeded rotation, **not a template defect** | pairing (no template change) | Preview re-rendered with the location-matched Perth background. Durable rule = the parked **location-aware selection v2** carry (asset `location` metadata exists). Until then, review-wall renders pair location-relevant copy with matching backgrounds by hand. |
| **8 — testimonial** | Bare persona attribution = fabrication risk | **governance rule** (no template change) | §3 source-guard rule + the copy convention it mandates (source-marked attribution), previewed. |
| **12c — carousel closing** | `propertypulse.com.au` duplicated (amber ContactLine y=74% + grey Footer y=92%) | **template edit** | Footer element REMOVED from the closing slide; ContactLine is the single website mention. Registry note: closing's `Footer` field row is retired in the recording packet. |
| **14 — youtube thumbnail** | `EP 12` (y=90%, bottom-anchored) collides with the unbounded headline's 3rd line | **template edit** | EpisodeNumber relocated into the badge stack (x=4%, y=35%, under MARKET UPDATE) — the lower-left is now safe for up-to-3-line headlines. Verified against the same 3-line headline that collided. FaceObject stays optional-unfilled (accepted warning). |

## 2. What was and wasn't rendered

4 preview renders, non-publishing (no drafts, no render-log rows, no queue): Units 12c/14 via **direct-source** with the edited JSON (saved templates untouched); Units 1/8 via the **unchanged saved templates** with corrected pairing/copy. Scrim deliberately stays 64 everywhere — recalibration is queue item 3 and is not previewed here to keep this lane's review isolated.

## 3. Testimonial source-guard rule (PROPOSED — PK ratifies)

> **TMR-GOV-TESTIMONIAL-1:** The testimonial template may only carry testimonials with a **verifiable source on record**: (a) the full quote, author identity, and platform/date are held in a governed record (client-supplied file or captured review URL/screenshot) BEFORE any render; (b) the rendered attribution must carry a visible source marker (e.g. "verified client review" + "Source: <platform>, <month year>"); (c) NO paraphrasing beyond typographic truncation with ellipsis; (d) absent a source record, the template is ineligible — fail-closed, same doctrine as assets. Enforcement v1 = review-gate discipline (this rule blocks the template's `visually_approved` flip until PK accepts the convention); mechanical enforcement (a source-evidence field checked at selection) = future lane, noted as a carry.

The testimonial's assignment stays `proposed` until PK ratifies this rule AND approves the preview.

## 4. Apply plan (after PK approves per-unit)

1. **Save the 2 template edits to Creatomate** (generics project): attempt API update first; if the API doesn't support template update, PK paste-saves the fixed sources (same flow as the original library build). Fixed sources: `lane2_closing_fixed_source.json` / `lane2_thumb_fixed_source.json` (scratchpad; will be committed with the packet).
2. **Re-smoke from the SAVED templates** (proving the saved state matches the approved previews) — 2 renders.
3. **Recording packet** (hash-pinned, Lane-B pattern): per-approved-unit assignment flips `proposed → visually_approved` + `visual_approval` proof events citing the fix previews + re-smokes; retire the closing `Footer` field row; testimonial flip only if §3 ratified. Selectable set grows accordingly (up to 10→14).
4. Registers + result doc. Each step at your gates.

## 5. Boundaries held

No saved-template mutation yet · no DB change · no render-path/production change · no publish · no Format Mix · no enablement · scrim untouched (item 3) · rotation untouched (item 4) · location-aware selection stays parked (v2 carry).
