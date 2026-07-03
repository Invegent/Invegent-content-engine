# Lane B — PP Branded Proof Wall — Gate 1 Packet

**Created:** 2026-07-03 Sydney
**Design authority:** `docs/briefs/template-selection-v0-design-packet.md` (Gate 1 ratified) · Lane A applied (16 PP `proposed` assignments, v4.77 @ `da2d7a5`)
**Status:** awaiting PK Gate 1 decisions
**Outcome:** PK visually reviews **Property-Pulse-branded renders** of the proposed templates and decides **approve / needs tweak / reject** per template — producing the first `visual_approval` proofs and unlocking the selectable set.

---

## 1. Proposed template shortlist

**All 16 proposed assignments, reviewed as 13 visual units** (the carousel trio is one story reviewed as a set):

| Unit | Templates | Format |
|---|---|---|
| 1–8 | market_insight · auction_snapshot · announcement · quote · stat_hero · listicle · before_after · testimonial · news_summary (9 × 1:1 cards) | image_quote |
| 9 | portrait_feed_card 4:5 | image_quote |
| 10 | linkedin_landscape 1200×628 | image_quote |
| 11 | carousel cover+body+closing (3 renders, one set) | carousel |
| 12 | story_static 9:16 | image_quote/story |
| 13 | youtube_thumbnail 16:9 | youtube_thumbnail |

*(That's 9+1+1+3+1+1 = 16 renders.)* Rationale for all-16 rather than a subset: the marginal cost per extra render is trivial, and a complete wall gives you the full selectable-set decision in one sitting instead of a second gallery later.

## 2. Sample content plan

Fixed, deterministic, PP-brand-compliant sample copy per variant (written into the render harness so re-renders are byte-reproducible). Style: PP voice rules — data-tone, no predictions, no advice, no hype (e.g. market card: *"Perth median house price $687,400 — up 1.2% for the quarter"*; quote card: a measured investor quote with attribution; stat hero: *"4.35% — cash rate held for a sixth consecutive meeting"*; listicle: three depreciation-basics points; testimonial: a generic client quote with first-name attribution; before/after: 2015-vs-2025 median comparison). Full copy table lands in the Lane B build packet for your edit before rendering. **Sample copy is review scaffolding only — never published, never stored as drafts.**

## 3. Asset plan — the resolver IS the asset plan

Every render's Background / Logo / Scrim comes from **live `resolve_slot_assets('property-pulse', platform, format, template_id, seed)` calls** — making Lane B the **first real (manual, read-only) consumer** of the Slice-1 RPC and an implicit end-to-end proof of it. Governed inputs only: the 3 governed backgrounds (seed chosen per template so the wall shows Perth/Sydney/Brisbane variety), `pp_logo_primary`, `Scrim.opacity` from the resolver (64 on needs_scrim). Known watch-items for your eye during review: the **solid-navy non-transparent logo** on light templates, and **scrim-constant calibration** (§6, decision 5). *Adjacent note: a PP background intake harvest (P0) is separately awaiting your visual review — those candidates are NOT governed yet and are excluded here; if approved later they enrich rotation without changing this lane.*

## 4. Proof method

- **Render:** Creatomate **direct API** against the 16 saved templates with resolver-supplied + sample-copy modifications — the proven TMR-smoke/Path-A mechanism. **Non-publishing by construction:** no drafts, no `m.post_render_log` rows, no queue/publish surface, no worker involvement; outputs are local JPGs (optionally mirrored to `_smoke/` storage — decision 6).
- **Record:** only AFTER your review, via the existing `record_tmr_proof_event` RPC — one `visual_approval` proof event per **assignment_id** (passed/failed + your notes as evidence), plus the assignment status flips. The recording step is a **PK-gated DML packet** (Lane A-style review chain: exact SQL, hash, db-rls-auditor, apply gate).

## 5. Visual review workflow

1. I render all 16 and deliver **one gallery contact sheet** (single HTML page + the raw JPGs) — each tile labelled with template name, format, and the resolver's actual pick (background used, scrim value).
2. You mark each unit: **✅ approve · ⚠️ needs tweak (with a note) · ❌ reject.**
3. I return a recording packet mapping your decisions to data:
   - **approve** → assignment `proposed → approved → visually_approved` + `visual_approval passed` proof event (evidence: render file + your decision) — *one sitting collapses ladder rungs L3+L4 (decision 2)*;
   - **needs tweak** → stays `proposed`, tweak note recorded; template fixed in Creatomate; re-render → re-review (only that unit);
   - **reject** → assignment `blocked` + `visual_approval failed` proof event.
4. You approve the recording packet (hash-pinned, Lane A-style) → applied → the selectable set becomes exactly your approved list. **Expected attrition is healthy** — these templates have never worn PP branding; a wall of 16 yielding, say, 10 approvals is success, not failure.

## 6. Decisions PK must make (Gate 1)

1. **Shortlist:** all 16 in one wall (recommended) — or a first tranche (e.g. the 9 core 1:1 cards)?
2. **One-sitting collapse of L3+L4** (batch assignment approval + visual approval from the same gallery review — recommended) — or keep them as two separate gates?
3. **Sample copy authority:** I draft per §2 and you edit at the build packet (recommended) — or you supply copy up front?
4. **Background variety:** seeded rotation so the wall shows all 3 governed backgrounds across the cards (recommended) — or one fixed background for visual comparability?
5. **Scrim calibration rider:** render ONE extra A/B pair (scrim 64 vs ~48) on a single busy-background card so you can calibrate the provisional constant during the same review (recommended, +2 renders) — or defer calibration?
6. **Render artifact home:** local files delivered to you only (recommended) — or also mirrored to `_smoke/` storage for a durable evidence URL on each proof event?
7. **Budget confirmation:** ~16–18 Creatomate renders (+2 if decision 5 yes) — trivial spend, confirming per standing cost-consciousness.

## 7. Boundaries (held throughout Lane B)

Renders are proofs, not products: **no publish · no drafts · no post_render_log writes · no queue exposure · no worker/runtime change · no selector build (Lane C) · no dashboard work · no platform_safe / production_proven / Format Mix claim.** All DB writes (proof events + status flips) happen only in the PK-gated recording packet after your review. Fail-closed asset rules unrelaxed — every render uses only governed assets via the resolver.
