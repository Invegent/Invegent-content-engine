# Result — Template Selection v0 — Lane B: PP Branded Proof Wall + Visual-Approval Recording

**Packets:** Gate 1 `docs/briefs/template-selection-v0-lane-b-proof-wall-gate1.md` · recording `docs/briefs/template-selection-v0-lane-b-recording-packet.md`
**Completed:** 2026-07-03 Sydney
**Status:** ✅ APPLIED + VERIFIED — **ICE's first 10 selectable template assignments exist** (selectable = ladder L5: `visually_approved` ∧ passed `visual_approval` proof; still NOT client_enabled / production_proven / runtime-consumed)

## 1. The proof wall

18/18 non-publishing Creatomate renders (16 units + 2 scrim A/B), PP-branded, **every Background/Logo/Scrim supplied by live `resolve_slot_assets` calls** — the Slice-1 RPC's first real consumer exercise (seeded rotation Perth×3/Sydney×4/Brisbane×5; logo-only templates resolved correctly; thumbnail warned on optional FaceObject). Gallery `_harness/pp_proof_wall/pp_proof_wall_review.html`; renders + manifest in the same folder. No drafts, no render-log rows, no publish surface. Budget: 18 renders (within accepted 16–18+2).

## 2. PK gallery decisions (2026-07-03)

- **Approved 10:** auction_snapshot · announcement · quote_card *(content-governance note)* · stat_hero *(logo-transparency)* · listicle · before_after *(logo-transparency)* · news_summary · portrait_feed · linkedin_landscape · story_static.
- **Needs tweak 6 (4 units), stay `proposed`/non-selectable:** market_insight (location mismatch) · testimonial (persona governance) · carousel ×3 (closing CTA/website duplication) · youtube_thumbnail (title/EP placement; FaceObject warning stays).
- **Rejected: 0.** **Scrim:** 48 preferred default · 64 busy-backgrounds/dense-text only · 80 never.

## 3. Recording apply

Artifact `_harness/lane-b-visual-approval-recording.sql`, sha256 `37a5c67090a0a8dec68d63325cb167523723f44c55d9d6325b6f5f5ed2ac80b1` (PK approval pinned to the hash; re-verified MATCH pre-apply). One transaction, fail-loud 10-row assertions, applied via execute_sql (postgres). Review chain: db-rls-auditor **PASS zero-must-fix** → external review **agree/proceed, zero pushback** (`review_id f356eecc-6535-4f64-b223-011b42e45cac`) → PK hash-pinned approval. security-auditor n/a (data-only).

## 4. Post-apply verification (all PASS)

| Check | Result |
|---|---|
| `visually_approved` (approved_by='PK') | **10** |
| Still `proposed` | **6** — exactly the needs-tweak set, `approved_by` NULL |
| Any other status (approved/client_enabled/production_proven/deprecated/blocked) | **0** |
| `visual_approval`/`passed` proof events (assignment-scoped) | **10**, all pinned correctly (assignment_id + template_id + `_harness/pp_proof_wall/*` evidence consistent, verified by join) |
| `platform_publish` proofs | **0** |
| **Selectable set** | **0 → 10** |
| Template rows | untouched (16/16 still `smoke_rendered`) |
| Rollback validity | `recorded_by` marker matches exactly 10; revert guard matches exactly 10 |
| Re-run abort | clean abort (0-row assertion raised, zero effect) |

## 5. Carries (recorded, NOT started per PK)

1. **Scrim recalibration** — `resolve_slot_assets` v1.1: `needs_scrim` default 64→48; 64 reserved for busy/dense (needs a "busy" definition); 80 excluded.
2. **Location-aware background selection** (Slice-1 v2) — `location` metadata exists, unused; wall surfaced Perth-headline/Brisbane-skyline mismatch.
3. **PP logo-variant / transparency intake** — solid-navy logo box visible on solid-colour cards (stat_hero, before_after approvals carry the note).
4. **Testimonial content-source guard** — template blocked from approval until a real-testimonial governance rule exists.
5. **Thumbnail FaceObject** — optional-unfilled warning stands until a governed face asset exists.
6. Template tweaks for the 4 needs-tweak units → fix in Creatomate → re-render → re-review (only those units).

## 6. Non-claims

No publish · no platform_publish proof · no client_enabled · no production_proven · no Format Mix binding · no dashboard change · no runtime change · Template Selection logic unchanged (selector RPC still not built — Lane C) · scrim/location/logo-variant lanes NOT started.
