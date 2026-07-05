# Creatomate Provider Reconciliation v0 — Coverage Matrix (FINAL — all 3 legs complete)

**Lane:** SAFETY_GATE (packet `docs/briefs/creatomate-provider-reconciliation-v0-packet.md`) · **State:** COMPLETE 2026-07-05 — Leg 3 run via CREATOMATE_ICE_PROJECT_API_KEY (GET-only, 2 calls: list + 48cba556 detail; raw: `provider_inventory_raw.json`). Default Project = DEGRADED-by-UI-export (PK screenshots 2026-07-05: empty).
**Columns:** CODE = static refs (cited; full inventory in cartographer output) · REG = registry truth · PROV = provider truth (`pending_api`)

## A. Matrix — 20 distinct template IDs

| # | provider_template_id | CODE (static refs) | REG (schema c) | PROV exists | PROV meta |
|---|---|---|---|---|---|
| 1 | `48cba556…` ⚠️VC3 | **DUAL IDENTITY**: PP 16:9 news (`manual_render.ts:43`, `index.ts:553`, `property-pulse.json:189,330`, dashboard `registry.ts:386`) vs generic 1:1 market_insight (`b1_production_test.ts:170`, migration `…111455:28`) | ✅ `generic_market_insight_card_1x1_v1`, 1080×1080, smoke_rendered / PP visually_approved — **LIVE TMR default winner** | ✅ EXISTS | `generic_market_insight_card_1x1_v1`, **1080×1080** (detail GET) — registry CORRECT; 16:9 identity refs = STALE |
| 2 | `fb9820f8…` ⚠️VC1 | Both vendored `creative_contract.ts:132` · `manual_render.ts:62` (branch marked degraded, `index.ts:37`) · dashboard `actions/creative-library.ts:42` pins it as "production ground truth" (STALE) · `property-pulse.json` v0.3 still says LIVE (STALE) | ✅ `news_static_centered_scrim_1x1_v1`, client PP, **production_proven**, sole `captured_from_docs` row (never provider-read-verified) | ❌ **ABSENT (confirmed)** | n/a — deletion provider-confirmed |
| 3 | `490ad9ea…` ⚠️VC2 | `tmr_smoke.ts:46` allowlist + ~25 docs; 2 failed smokes on record | ❌ ABSENT (purged v4.71; 0 rows + 0 evidence-text refs) | ❌ **ABSENT (confirmed)** | n/a |
| 4 | `bc32f52f…` ⭐NEW | **video-worker** `template_smoke.ts:17,48` (9:16 MP4 smoke branch, manual-only) + dashboard `registry.ts:411` + `property-pulse.json:209,360` (Gate D2 proven) | ❌ ABSENT (never TMR-captured) | ❌ **ABSENT — video Gate-D2 template ALSO deleted in cleanup** (new finding) | n/a — video smoke branch dead; future video work rebuilds |
| 5 | `2fd50302…` ⭐NEW | Docs ONLY (2 briefs + register) — `news_static_lower_third_1x1_v1`, authored in B0 era, never wired | ❌ ABSENT | ❌ ABSENT (never existed as wired artifact) | n/a |
| 6–20 | 15 generic-library IDs (`2140ca19` quote · `03459d76` auction · `54b305c8` stat_hero · `a75e7139` announce · `05c37472` 4x5 · `ca5b1509` yt_thumb · `b662f999` news_summary · `47ad6a9c` listicle · `b95e0c9e` before_after · `1dcb4c91` testimonial · `c9a59faa/c4c0fc9d/8aeb946c` carousel · `0b1f7079` story · `590ca39a` linkedin) | ⚠️ **ZERO worker-code references** — sole static anchor = the 2 capture migrations (`…111455`, `…124329`); runtime IDs arrive via `select_template` (data-driven, `b1_production.ts:220-222` fail-closed) | ✅ all 15 present, smoke_rendered / PP visually_approved, dims match seeds | ✅ **ALL 15 EXIST**, names match registry 1:1 (list GET) | list endpoint carries no dims; registry dims stand |

Registry totals (Leg 2 verified): 17 rows · 0 duplicate provider ids · 135 fields · 37 proofs (reconcile exactly) · only `fb9820f8` is production_proven · no `client_enabled` anywhere.

## B. Findings (pre-provider; PROV column may amend)

1. **VC1 `fb9820f8`** — code-referenced (2 vendored contracts + degraded opt-in branch) + registry-present (production_proven, docs-captured) + provider-deleted (per `index.ts:4`; Leg-3 confirms). Post-Option-D this is historical evidence, not a live dependency. Cleanup candidates (future gated lanes): contract v3, doc/registry staleness (`property-pulse.json` v0.3 still says LIVE).
2. **VC2 `490ad9ea`** — code allowlist (`tmr_smoke.ts`) references a template absent from registry AND (expected) provider: the smoke branch is dead weight; retire-or-repoint = future carry.
3. **VC3 `48cba556`** — dual identity held simultaneously in-repo. Expected provider truth: 1:1 market_insight (paste-repurposed). If Leg 3 shows 16:9 → **incident-class** (live winner renders wrong layout) → stop rule (d).
4. ⭐ **Video template `bc32f52f`** — the packet's floor missed it; refutes "video has no stored template IDs" (true only for the production path). Un-registered in TMR; dashboard + CE docs claim Gate-D2 proven. Leg 3 says if it survived the cleanup.
5. ⭐ **The 15-generics anchor gap** — no code grep can detect provider-side deletion of 15 of the 16 live-selectable generics (their only static anchor is migration history; runtime discovers loss only at render time, fail-closed). **This is the core justification for the guard checklist + a future periodic provider-inventory probe.**
6. **Dashboard staleness (named coverage-gap follow-up, own lane):** vendored registry pinned at CE `161816a`/v0.2 (missing the whole v0.3 era) and `B1_GROUND_TRUTH` presents the deleted `fb9820f8` + worker v3.14.1 as current production truth on the B1 status card.
7. **Doc-only orphan `2fd50302`** — harmless; candidate for a one-line "never wired" annotation in a future doc pass.

## C. Leg-3 runbook (once `CREATOMATE_ICE_PROJECT_API_KEY` is set — GET only)

1. `GET /v1/templates` (ICE project) → fill all PROV cells.
2. `GET /v1/templates/48cba556…` → settle VC3 (expect 1:1 market_insight; 16:9 = incident-class STOP).
3. Confirm `fb9820f8` + `490ad9ea` absent (VC1/VC2 provider-side).
4. `bc32f52f` present? (video smoke viability.)
5. Provider-vs-matrix diff → provider-exists-but-not-registered list.
6. Default Project: PK UI confirmation "empty" (2026-07-05 screenshots) = degraded export; cells labeled DEGRADED-by-UI-export.

## D. Zero-mutation ledger

Leg 1: Read/Grep/Glob only (PASS, D6 artifact produced zero grep hits and was not read). Leg 2: SELECT/catalog only (pass). Leg 3: no call. Lane writes: this matrix + the guard-checklist draft (`_harness/creatomate_provider_recon/`), commit PK-gated.

## E. FINAL RECONCILIATION VERDICT (2026-07-05)

**PASS with 3 dead-reference classes and 0 governance drift.**

1. **Provider↔registry: PERFECT 1:1** — 16 provider templates == 16 registered generics (id+name exact; VC3 also dimension-verified 1080×1080). **Provider-exists-but-not-registered: NONE.** Registered-but-provider-missing: only `fb9820f8` (known, documented, post-Option-D historical).
2. **VC1/VC2/VC3 all rediscovered blind and settled:** fb9820f8 provider-ABSENT (confirmed) · 490ad9ea provider-ABSENT (confirmed) · 48cba556 = 1:1 market_insight (registry right; live winner safe).
3. **NEW: `bc32f52f` (video 9:16 Gate-D2 template) provider-ABSENT** — the cleanup also deleted the proven video template; video-worker's smoke branch is dead (production video path unaffected — direct-source). Future video lanes rebuild from scratch.
4. **Dead-reference cleanup candidates (each a future gated lane):** (a) fb9820f8 in both vendored contracts + manual 1:1 branch + property-pulse.json v0.3 "LIVE" label + dashboard B1_GROUND_TRUTH; (b) 490ad9ea tmr_smoke branch; (c) bc32f52f video smoke branch + docs; (d) 48cba556 stale 16:9 identity in manual_render/template_smoke/docs/dashboard vendored registry (v0.2 @ 161816a).
5. **Zero mutation:** 2 GETs total, no POST/PATCH/DELETE; DB SELECT-only; repo writes = this matrix + checklist draft only.

**The guard checklist (`pre-cleanup-guard-checklist-draft.md`, TMR-GOV-PROVIDER-1) is ready for PK ratification.**
