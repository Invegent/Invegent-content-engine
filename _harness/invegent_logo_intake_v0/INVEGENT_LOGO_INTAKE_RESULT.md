CLAIMED v5.34 · cfw+invegent-logo-intake · isolated-worktree ce-logoreg · register-commit-gate · 2026-07-08
# Invegent logo-variant INTAKE v0 — RESULT (applied + verified)

**APPLIED + VERIFIED** — 2026-07-08, project `mbkmaxqhsohbtwsqolns`, PK-approved artifact hash `5673979baeb43271356f910adbd3862087d749ab4877159b9c84808b8f396581` (re-verified on disk pre-apply). 17 fenced INSERTs in one transaction; all in-txn assertions passed at COMMIT. **T2 · SAFETY_GATE (full chain — new client).**

## What landed (17 fenced candidates, curated)
9 SVG (`usage=logo_vector_source`) + 8 PNG (`usage=logo`) for Invegent (`93494a09-…`), ids `d3d10001…`–`d3d10017…`, all DOUBLE-FENCED (is_active=false · approved=false · production_use_allowed=false · intake_candidate). asset_type ∈ {logo_primary, logo_dark, logo_light, logo_icon, watermark, other} — all CHECK-valid; never `'logo'`. Storage: `brand-assets/Invegent/Logos/invegent_logo_*` (17 uploaded x-upsert:false, public-URL sha256 17/17; folder was empty). Variants: wordmark (full-colour/white/dark-navy, 2000×700) · **both tagline lockups** (current "Content intelligence" + legacy "Know what to say") · mark-only (cyan/navy/white) · square badge (cyan-on-navy) · watermark.

## Post-apply proof — ALL PASS
| Check | Result |
|---|---|
| Fenced count | ✓ 17 |
| Governed/active logos | ✓ **0** |
| SVG / PNG split | ✓ 9 vector_source + 8 logo |
| `brand_profile.brand_logo_url` | ✓ **NULL (unchanged)** — Invegent has no live logo set |
| asset_type values | ✓ all CHECK-valid |
| **sha256 fidelity** | ✓ **all 17 stored == manifest** (ordered-concat md5 `5f4679ac…`; 48KB apply byte-faithful) |

## Reconstruction caveat (recorded in every row)
**Like NDIS, a RECONSTRUCTION** — Invegent supplied mostly PNG exports (no native SVG/AI); this kit is a manual SVG reconstruction, **wordmark/tagline approximated**, a governed working master **not a pixel-perfect original**. Palette navy `#1B3A5C` / cyan `#05ADDA` / cyan-highlight `#16C1F3`.

## Review chain
db-rls-auditor **PASS zero-must-fix / zero-should-fix** (all 8 checks; brand_logo_url IS NULL verified with the correct must-remain-NULL assertion; production-neutral by construction) · external review `e1c435c6-452b-491e-ba36-431e1fc7643c` **partial / apply_corrected, escalate=false — NO concrete defect** (two non-DML points: reconstruction quality [product judgment, fenced + caveated] + storage-check [mitigated by post-upload public-URL sha256 verify]); surfaced to PK, who approved · PK hash/upload gate approved → upload → apply → proven.

## Standing / NOT done (per PK boundaries)
Rollback `9f3202dd2e5cb1f76e351bd43bf83f08a269d8b20eaf4836f94355f2a6576b8e` standing (guarded delete of the 17 fenced lane rows; storage excluded). **NOT done:** promotion · is_active flip · **brand_profile change (Invegent still has NO live logo — setting one is its own future gate)** · production logo swap · template assignment · resolver change · **register commit (HELD — "recording" is the next step per PK).**
