# cc-0044 Proof #1 — shared-pool background renders live for invegent: PK PASS — result v1

**Lane:** cc-0044 shared-pool activation Proof #1 · **Class:** PRODUCT_PROOF · **Date:** 2026-07-20
**Verdict:** PK visual PASS on a fresh independent render · **Base:** origin/main `6ad815e`

## What Proof #1 establishes

The `c.shared_creative_asset` shared-pool fallback (resolver v1.2, CARRY-1/CARRY-2 fixed) now
**selects and renders a shared background end-to-end for a real client** — invegent, which has no
background of its own. This is the first live demonstration of the shared pool doing its job.

## Prerequisite state (done by the CP-D Invegent onboarding lane, 08:57–09:25 today — NOT this lane)

- Shared asset **`bg_shared_datacentre_server.jpg`** (`0ba46053…`) promoted: `is_active=true`,
  `production_use_allowed=true`, `approval_status='governed'`, `governance_scope='global_generic'`,
  `allowed_clients=[invegent]`, `safe_for_text_overlay='true'`.
- invegent **pool policy**: `client_preferred`, `allow_global_shared=true` (`policy_version='cc-0044-invegent-v1'`).
- invegent **governance**: `image_quote` enabled (`render_label='creative_library_generic_selector'`).
- invegent has **zero** client background assets → `client_preferred` falls through to the shared pool.

This lane did **not** re-promote or re-wire anything (it was already in place). PK's "promote a shared
asset" instruction was already satisfied; this lane verified + rendered the proof.

## Resolver proof (read-only, live)

`select_template('invegent','facebook','image_quote')` → `status:ok`, and the slot resolver selected:

- **Background → `bg_shared_datacentre_server.jpg`** (`0ba46053…`), reasons `["governed","license_ok","text_safe_true","client_match"]`, `Scrim.opacity=40`.
- Logo → invegent's own `invegent_logo_full_colour` (client asset).
- The other 7 shared backgrounds correctly rejected `inactive` (still fenced).

This is unambiguous: with CARRY-1 live, the shared pool resolves the governed, text-safe shared
background for invegent.

## Render proof (fresh, independent, non-publishing) — PK PASS

Two renders driven this lane via Creatomate (template `generic_quote_card_1x1_v1` = `2140ca19…`,
non-publishing, key read in-process from a PK-placed file, never in transcript):

- v1 (`0bd8f314`): full-colour logo — PK flagged the top-right logo as low-contrast on the mixed-lit bg.
- **v2 (`9725a8c3`) — ACCEPTED**: top-right logo swapped to `invegent_logo_square_brand_bg` (mark on a
  brand-colour square → contrast-safe regardless of bg). Shared datacentre background unchanged; quote
  text legible with the scrim, no overprint; brand-safe content (no fabricated person / false claim).

**PK visual verdict: PASS** (render `9725a8c3`). Evidence (local, sha256-anchored, house-pattern
binaries not pushed): `_harness/cc0044_proof1_invegent_render_20260720/renders/invegent_proof1_v2_squarebadge.png`
(sha256 `73ae50f6d0a972c1e87f2c6217ca3c1bdc2e39baa458597deb2f22ca426d1b4a`),
manifest `invegent_proof1_manifest.json` (sha256 `d0a9865f7c4ae8054d32003b030e2eb1474b396ff2c58a893a930f20cc1b3a20`),
creatomate render `9725a8c3` (url `https://f002.backblazeb2.com/file/creatomate-c8xg3hsxdu/9725a8c3-4901-4889-b918-fc5ed361fa79.jpg`).

## Follow-ups (out of scope of Proof #1)

1. **Footer LinkedIn banner** (PK requested, deferred → tracked task `task_a6e31a0f`). Two blockers:
   (a) no LinkedIn/banner asset exists for invegent (only logos); (b) the template `Footer` is a **text**
   element — a banner image needs a manual Creatomate template edit (no template-edit API). Needs asset
   intake + template footer-image slot + re-render.
2. **Logo delta — NOTED, needs a PK decision.** The accepted render uses `invegent_logo_square_brand_bg`,
   but invegent's currently **governed/active** logo is `invegent_logo_full_colour` — so a production
   render today would resolve full_colour, not the approved square badge. To make production match the
   approved look, promote `invegent_logo_square_brand_bg` (or a mark-only variant) to active and retire
   full_colour — a small T3 logo-rotation change. Not done by this lane.

## Status

**Shared-pool activation is PROVEN for invegent (Proof #1 PASS).** cc-0044's shared-pool arc — schema
(cc-0041) → read-path (cc-0042) → resolver v1.2 (CP-B) → CARRY-2 + CARRY-1 fixes → activation (CP-D) →
**Proof #1** — has reached a live, PK-verified render for the first client.

## Register pointer (Convention 1)

> **cc-0044 Proof #1 — shared-pool background renders live for invegent: PK PASS (PRODUCT_PROOF)** — first live shared-pool render: `select_template('invegent',fb,image_quote)`→ok selects shared `bg_shared_datacentre_server` (governed/text_safe_true/client_match, scrim 40); fresh non-publishing Creatomate render `9725a8c3` (square-badge logo) PK visual PASS. Promotion+policy were CP-D's (already in place); this lane verified + rendered. Follow-ups: footer LinkedIn banner (`task_a6e31a0f`; template Footer is text-only + no banner asset) · logo delta (approved square-badge ≠ governed full_colour → optional T3 logo promotion). Result: `docs/briefs/results/cc-0044-proof1-invegent-shared-pool-render-result-v1.md`.
