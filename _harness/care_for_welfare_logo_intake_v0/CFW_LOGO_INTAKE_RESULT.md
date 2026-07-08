CLAIMED v5.34 · cfw+invegent-logo-intake · isolated-worktree ce-logoreg · register-commit-gate · 2026-07-08
# Care for Welfare logo-variant INTAKE v0 — RESULT (applied + verified)

**APPLIED + VERIFIED** — 2026-07-08, project `mbkmaxqhsohbtwsqolns`, PK-approved artifact hash `e0b283ff5142bdbfb9a5eab7d8993a0f1fd2bc8af0b543fb213a6cac3ae510a4` (re-verified on disk pre-apply). 16 fenced INSERTs in one transaction; all in-txn assertions passed at COMMIT. **T2 · SAFETY_GATE (full chain — new client).**

## What landed (16 fenced candidates, curated)
9 SVG (`usage=logo_vector_source`) + 7 PNG (`usage=logo`) for Care for Welfare (`3eca32aa-…`), ids `d2c10001…`–`d2c10016…`, all DOUBLE-FENCED (is_active=false · approved=false · production_use_allowed=false · intake_candidate). asset_type ∈ {logo_primary, logo_dark, logo_light, logo_icon, watermark, other} — all CHECK-valid; never the invalid `'logo'`. Storage: `brand-assets/Care_for_Welfare/Logos/cfw_logo_*` (16 uploaded x-upsert:false, public-URL sha256 16/16). Variants: wordmark (full-colour/white/dark, 2048×676) · mark-only (full/dark/white) · square badge · watermark.

## Post-apply proof — ALL PASS
| Check | Result |
|---|---|
| Fenced count | ✓ 16 |
| Governed/active logos | ✓ **0** |
| SVG / PNG split | ✓ 9 vector_source + 7 logo |
| `brand_profile.brand_logo_url` | ✓ **unchanged** (`logo.png`, **client-assets bucket** — different bucket from the intake) |
| asset_type values | ✓ all CHECK-valid |
| **sha256 fidelity** | ✓ **all 16 stored == manifest** (ordered-concat md5 `a8a3cf57…` identical; 43KB apply byte-faithful) |

## Faithful-vector note (recorded in every row)
**Unlike NDIS, this is a FAITHFUL vector kit** — prepared from genuine CFW vector sources (SVG/AI/EPS); production SVG has true vector paths, no embedded raster, **wordmark already outlined (no font dependency)**. Not a font-approximated reconstruction. Palette: black `#000000` + cyan `#00BCE4` / red `#C41230` / lime `#C3CF21` leaf accents. Production logo swap deferred to a future PK gate.

## Review chain
db-rls-auditor **PASS zero-must-fix** (all 8 checks; brand_logo_url live-verified == client-assets path; cross-bucket so overwrite impossible; production-neutral by construction; one non-blocking note: idempotency via WHERE-NOT-EXISTS not a DB unique constraint) · external review `3270c228-3900-4639-aca6-c4bec0860aec` **AGREE / risk low / confidence high / proceed** (clean) · PK hash/upload gate approved → upload → apply → proven.

## Standing / NOT done (per PK boundaries)
Rollback `bb5000bb37a90c98c6229df7311c654162d96020c06f670445927cc8f0e224b5` standing (guarded delete of the 16 fenced lane rows; storage excluded). **NOT done:** promotion · is_active flip · brand_profile change · production logo swap · live render/publish change · template assignment · resolver change · **register commit (HELD per PK — no register records this pass).**
