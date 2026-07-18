# NDIS Yarns — image_quote background ROTATION POOL (fenced candidate sourcing)

**Status:** ⛔ AWAITING PK VISUAL/SOURCE GATE — lane STOPS here. Sourcing only. Nothing approved,
uploaded, inserted, promoted, or activated. All candidates remain **FENCED** (files live only under this
package). No DB / storage bucket / git-tracked / pool / deploy surface touched. DB intake + rotation
activation are **separate later PK-gated steps** — NOT part of this lane.

**Lane class / tier:** SIDE_PROVING (supporting lane, disjoint surface = NDIS image assets) · sourcing-only,
no production surface → no deploy tier. **NON-PP brand → candidate-level scrutiny** (image agents are
PROVEN-SCOPED for Property Pulse only; NDIS is first-of-kind for a rotation pool → fenced-only + PK gate is
the mitigation, per CLAUDE.md image-agents charter).

**Package root:** `_harness/image_harvester_v0/ndis_bg_rotation_20260718/`
**Register:** head v5.75 at lane start; **no register version consumed by this sourcing lane** (record +
pointer are cut post-PK, claimed through the orchestrator). Builds on the D7 close (v5.75,
`docs/briefs/results/tmr-d7-second-brand-proof-v1.md`) and the P0 sourcing lane (`ndis_bg_20260717/`).

## Agent-availability note (read first)
`image-harvester` and `image-reviewer` are **not registered as invocable agent-types this session** (same
situation recorded for `creative-graph-auditor` in the A1.4 lane). Per that precedent the orchestrator
executed **both charters directly**: network GET to allow-listed licence-safe sources (Pexels CDN) →
byte-hash → PIL inspection → pixel-level review → authoritative 0.55-scrim crop-proof. The fenced-only +
PK-visual-gate posture is unchanged and is the mitigation for running the roles inline on a non-PP brand.

## Workflow executed (two-stage, per image-workflow-acceleration-v1 P1 batch-first)
1. **Harvest (stage 1).** Re-harvested the **12 vetted candidates** from the prior NDIS P0 lane
   (`ndis_bg_20260717`, `data_grid-04` AI-deny excluded) fresh by their exact Pexels CDN URLs +
   discovered **10 new** on-palette dark navy/teal candidates via web-search → page extraction → CDN fetch.
2. **Byte-verify.** All 22 downloaded, sha256 computed on the bytes, re-verified: **22/22, 0 mismatch, 0 missing.**
   The 12 re-harvested candidates reproduced the prior manifest's byte counts + sha256 exactly (byte-identical provenance).
3. **Review (stage 2).** Orchestrator pixel-level review + 1:1 centre-crop @1080 @0.55 black scrim + sample
   NDIS headline (`Understanding your / NDIS plan review / and what to expect`) with `NDIS UPDATE` strap +
   `NDIS Yarns` footer — the authoritative text-safety proof.
4. **This PK gate.** Visual / source verdict is the only deciding act.

## Scope compliance (every offered candidate)
- **Allowed categories only:** (1) civic/policy/service-system neutral · (2) brand-colour wash / abstract
  brand texture · (3) abstract data-grid / information-flow. Every candidate maps to exactly one.
- **Hard exclusions — none present in any offered candidate:** no people-forward / disability imagery ·
  no medical / clinical stereotypes · no First-Nations motifs or cultural visual language · no readable
  third-party signage · nothing implying NDIS/government endorsement · **no AI-generated imagery** (the
  prior AI-deny `data_grid-04` stays dropped; two new candidates rejected partly on medical-adjacent /
  off-palette grounds — see rejects).
- **Licence:** every candidate is **Pexels License** (attribution-free, PK-accepted for this brand at the
  2026-07-17 P0 gate; inside the proven PP allow-list). No CC BY / CC BY-SA / paid / AI material offered.
- **Palette:** NDIS navy `#0A2A4A` / teal `#1C8A8A`. Off-palette (purple/grey/red) candidates rejected.

## Recommended ROTATION POOL — 15 candidates (evidence: `orch_cropproof/RECOMMENDED_SET_cropproof.png`)

### Tier 1 — clean, ready for rotation (9)
| id | cat | dims | creator | luma | note |
|---|---|---|---|---|---|
| **brand_texture-01** *(LIVE)* | brand_texture | 1920×2877 | Allec Gomes | 19 | already live as `bg_ny_brand_texture_navy_waves`; deep navy silky waves — the anchor |
| **brand_texture-02** | brand_texture | 1920×2880 | Eva Bronzini | 22 | dark teal→navy gradient wash; excellent legibility |
| **brand_texture-03** | brand_texture | 1920×2880 | Eva Bronzini | 15 | near-solid deep navy; maximal negative space |
| **w-bt-e** *(NEW)* | brand_texture | 1920×2880 | Eva Bronzini ✓ | 13 | **flattest dark navy of the whole set** (sd 1.1) — cleanest headline field |
| **w-bt-a** *(NEW)* | brand_texture | 1920×2880 | Eva Bronzini ✓ | 15 | dark navy w/ subtle star/particle sparkle; texture without competing |
| **civic_neutral-04** | civic | 1920×2400 | Mikitayo | 117 | calm curved metal/glass facade; **has optimized 1:1 pre-crop** from prior lane |
| **civic_neutral-05** | civic | 1920×1284 | Ronald van Eendenburg | 104 | teal-green panel grid; most on-palette civic |
| **w-dg-a** *(NEW)* | data_grid | "3D Render" ✓⚠ | 19 | **dark navy woven grid — strongest data-grid**; calm + text-safe (fixes the prior thin row). ⚠ creator handle "3D Render" = CGI/3D render (non-AI; 3D renders already in accepted pool) — flagged for PK |
| **data_grid-01** | data_grid | 1920×2880 | Evija Ciematniece | 32 | radial blue light streaks / info-flow; keep headline central |

### Tier 2 — sound alternates (with notes) (6)
| id | cat | creator | note |
|---|---|---|---|
| **w-bt-f** *(NEW)* | brand_texture | Marek Piwnicki ✓ | soft blue smoke on black; elegant, slight central brightness |
| **civic_neutral-02** | civic | Jan van der Wolf | teal glass + gold diagonal mullions (gold slightly off-palette) |
| **civic_neutral-03** | civic | Jan van der Wolf | glass corner + clear sky top; keep headline mid/low |
| **civic_neutral-01** | civic | Mineia Martins | busy/bright glass tower; generic-only alternate |
| **w-dg-b** *(NEW)* | data_grid | Ahmed (@mutecevvil) ✓ | dark navy zoom/convergence lines (information-flow); motion register |
| **data_grid-02** | data_grid | Solen Feyissa | teal connected dots/lines on black; bright teal blob top — keep headline low |

**6 of the 15 are NEW this lane** (w-bt-a, w-bt-e, w-bt-f, w-dg-a, w-dg-b + the recovered breadth). The
widening materially strengthened the two weakest areas: a second/third clean brand-texture anchor and,
most importantly, **two clean text-safe data-grid options** (`w-dg-a`, `w-dg-b`) — the prior lane's
data-grid row was genuinely thin (only one defensible pick) and PK HELD it. It now clears the bar.

## Rejected / excluded (recorded, NOT offered) — 7
| id | reason |
|---|---|
| brand_texture-04 | lavender/purple accent — OFF-PALETTE |
| w-bt-d *(NEW)* | purple tint + bright highlight (UP Modern series; same off-palette issue as bt-04) |
| w-bt-b *(NEW)* | bright metallic chrome ridges — text-unsafe |
| w-bt-c *(NEW)* | busy blue marble + white streaks near headline — text-marginal |
| w-bt-g *(NEW)* | desaturated GREY spikes — off-palette + busy |
| **w-bt-h** *(NEW)* | glowing circles + gold specks **read as cellular / petri-dish → medical-adjacent RISK** for a disability-sector brand + gold off-palette — **flagged, not a silent drop** |
| data_grid-03 | bright blue mesh — busy, low text-contrast (text-unsafe) |

## Evidence (all under package root)
- `manifest.json` — 22 candidates, full provenance (pexels_photo_id · source_url · download_url · sha256 ·
  bytes · dims · reviewer verdict/tier/note). `metadata.csv` — flat table.
- `harvest_raw.json` (vetted 12) · `widen_raw.json` (new 10) — raw fetch + luma/palette stats.
- `sheets/contact_vetted12.png` · `sheets/contact_widen10.png` — raw 1:1 centre-crop contact sheets.
- `sheets/cropproof_vetted12.png` · `sheets/cropproof_widen10.png` — 0.55-scrim + headline text-safety proofs.
- `orch_cropproof/RECOMMENDED_SET_cropproof.png` — the 15 recommended, tiered, for the PK gate.
- `images/` (22 jpg, sha256-anchored). No `final/` renders written (sourcing lane; no crop-to-final needed yet).

## Should-fix / open items for PK
1. **Creator confirmation:** ✅ DONE 2026-07-19 — all 5 NEW creators re-read on their individual Pexels photo
   pages: w-bt-a & w-bt-e = Eva Bronzini · w-bt-f = Marek Piwnicki · w-dg-b = Ahmed (@mutecevvil) · w-dg-a =
   handle **"3D Render"** (CGI/3D render provenance — non-AI, and 3D-render textures are already in the
   accepted pool; flagged for PK because w-dg-a is a T1 pick). All Pexels License.
2. **Rotation-pool size:** 15 recommended is generous. PK may want a tighter production set (e.g. T1 nine only).
3. **civic gold accents** (civic-02/-03) are slightly warm vs the navy/teal palette — offered as alternates, PK call.

## PK deciding acts at this gate (the only deciding acts)
1. Visual verdict per candidate / accept the recommended rotation set (or a subset).
2. Confirm the 7 rejects — especially `w-bt-h` (medical-adjacent cellular reading) — stay dropped.
3. Confirm Pexels License remains accepted for this rotation pool (unchanged from the 2026-07-17 P0 gate).
4. (After accept) whether to open a **separate later PK-gated DB-intake lane** for the accepted rotation set
   (upload + fenced INSERT-only rows + per-apply byte-verify + public-URL sha256 + in-txn pool-neutrality
   assertion + branch-warden, per image-workflow §2) — **NOT part of this lane.**

## Non-claims
Nothing here is approved or production-safe. No DB promotion, no production activation, no governance flip,
no rotation change. Writes are confined to `_harness/image_harvester_v0/ndis_bg_rotation_20260718/**`.
Licence-hold (CC BY / CC BY-SA), paid, and AI-generated material were never offered — none appear here.
This lane STOPS at the PK visual/source approval gate.
