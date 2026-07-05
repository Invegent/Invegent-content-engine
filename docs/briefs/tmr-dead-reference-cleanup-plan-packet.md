# TMR Dead-Reference Cleanup — Planning Packet (T2 planning · SAFETY_GATE)

**Created:** 2026-07-05 Sydney · **Source findings:** Creatomate Provider Reconciliation v0 (result `docs/briefs/results/creatomate-provider-reconciliation-v0-result.md`, matrix `_harness/creatomate_provider_recon/coverage_matrix_v0.md`, guard rule `docs/governance/tmr-gov-provider-1-pre-cleanup-guard.md`)
**Status:** ✅ **APPROVED BY PK 2026-07-05 as the GOVERNING CLEANUP PLAN.** Lane order ratified: **D → B → W**. PK conditions (binding): the three lanes are NOT a bundle — each requires its own Gate 1 under CCF-02 (tier + classification + claims protocol); **D6 preempts all cleanup work**. No lane has started; this approval opens none of them.

## 1. Ground rules carried into every execution lane

- The **registry row for `fb9820f8` (production_proven) is NOT cleanup** — it is historical evidence of what ran in production and stays untouched.
- Historical briefs/results/register entries are never rewritten (Convention 1); only **live-truth surfaces** (worker code, declarative registry current-state labels, dashboard truth cards) get corrected.
- All four candidates are **opt-in/dormant surfaces** — none affects the live Option-D production path. Urgency is misleading-truth and dead-code hygiene, not outage risk.

## 2. Candidates

### C1 — `fb9820f8…` (provider-ABSENT, deleted B1 template)
| Field | Detail |
|---|---|
| Appears | CE code: both vendored `creative_contract.ts:132` copies · `manual_render.ts:52-62` (`NEWS_STATIC_CENTERED_SCRIM_1x1`, manual 1:1 branch — already marked degraded `index.ts:37`) · tests ×3. Docs: `property-pulse.json:229,273,391` (**v0.3 still labels it the LIVE 1:1 production variant**) · `current-ice-flow-v2.md:48`. Dashboard: `actions/creative-library.ts:38-44` (`B1_GROUND_TRUTH` presents it + worker v3.14.1 as current production truth). |
| Why dead | Deleted provider-side 2026-07-04 (recon-confirmed); production replaced by Option D (winner-driven). |
| Risk if untouched | Manual 1:1 branch fails loud if invoked (contained). Real risk = **misleading truth**: CE declarative registry and the dashboard B1 card assert a deleted template as live production — operator/planning error class. Vendored contract keeps stamping a dead variant pin into draft evidence (honest-at-the-time, now stale). |
| Cleanup | Code: retire `NEWS_STATIC_CENTERED_SCRIM_1x1` + manual 1:1 branch + test pins (contract pin handled by the separate contract-v3 carry — NOT this lane). Docs: property-pulse.json v0.4 — variant `centred-scrim-1x1` → `retired_provider_deleted` (history + proofs kept). Dashboard: `B1_GROUND_TRUTH` → Option-D truth. |
| Affected files | `image-worker/manual_render.ts`, `index.ts` (branch), `manual_render_test.ts`, contract tests (pins) · `docs/creative-library/property-pulse.json` · dashboard `actions/creative-library.ts` |
| Rollback | git revert per repo; image-worker redeploy of prior fn (code lane only). |

### C2 — `490ad9ea…` (provider-ABSENT smoke reference)
| Field | Detail |
|---|---|
| Appears | `tmr_smoke.ts:5,46` (single-id allowlist) · `index.ts:62,279,543` wiring · migration comment + ~25 docs (historical, keep). |
| Why dead | Template deleted; registry-purged v4.71; 2 failed smokes already on record. |
| Risk if untouched | Near-zero (opt-in, fail-loud 400). Pure dead code + confusion. |
| Cleanup | Remove the `tmr_template_smoke` branch, `tmr_smoke.ts`, wiring, tests. (Repoint-to-live-generic rejected: smoke utility superseded by the live TMR spine + direct-source recipe.) |
| Affected files | `image-worker/tmr_smoke.ts` (delete), `index.ts`, `template_smoke_test.ts` (tmr parts) |
| Rollback | git revert + redeploy prior fn. |

### C3 — `bc32f52f…` (provider-ABSENT video Gate-D2 template)
| Field | Detail |
|---|---|
| Appears | `video-worker/template_smoke.ts:16-17,48,65` + `index.ts:38` header + `template_smoke_test.ts:22,61,88`. Docs: `property-pulse.json:209,360` + family doc `:61` (**"Gate-D2 proven" video variant**). Dashboard vendored registry `registry.ts:411,478`. |
| Why dead | Deleted in the same cleanup (recon Leg-3 discovery — nobody knew). |
| Risk if untouched | Video smoke fails loud if invoked (contained). Real risk = **planning error**: docs/dashboard claim a proven 9:16 video template exists; future video lanes would plan against a ghost. Production video unaffected (direct-source). |
| Cleanup | Code: remove video `template_smoke` branch + tests. Docs: variant `centred-scrim-9x16-video` → `retired_provider_deleted` (Gate-D2 render evidence `508b4365…` stays as history). Dashboard: vendored-registry refresh (same motion as C1/C4). |
| Affected files | `video-worker/template_smoke.ts` (delete), `index.ts`, `template_smoke_test.ts` · `property-pulse.json` · dashboard `lib/creative-library/registry.ts` |
| Rollback | git revert; video-worker redeploy prior fn. |

### C4 — `48cba556…` stale 16:9 identity refs (repurposed ID) — **sharpest of the four**
| Field | Detail |
|---|---|
| Appears | `manual_render.ts:33-43` (`PP_NEWS_STATIC_16x9`, Lane-3B manual branch) · `index.ts:511-536,553` (`template_smoke` branch) · `manual_render_test.ts:65,100`, `template_smoke_test.ts:8,46`. Docs: `property-pulse.json:189,330` + family doc `:60` (16:9 proven identity). Dashboard `registry.ts:386,448`. |
| Why stale | The ID was paste-repurposed: the 16:9 artwork no longer exists; the ID now renders the 1:1 market_insight card. |
| Risk if untouched | **The only silent-wrong case:** invoking the manual 16:9 branch or template_smoke would render *successfully* — the modification keys happen to match — producing 1:1 market-insight artwork under a 16:9 PP-news label. No error, wrong output. Plus docs/dashboard assert a 16:9 capability PP no longer has. |
| Cleanup | Code: retire `PP_NEWS_STATIC_16x9` + `template_smoke` branch + test pins. Docs: variant `centred-scrim-16x9` → `retired_artwork_repurposed` (Gate-C proofs stay history; note the ID now belongs to `generic_market_insight_card_1x1_v1`). Dashboard: same refresh. |
| Affected files | `image-worker/manual_render.ts`, `index.ts`, both smoke/manual test files · `property-pulse.json` + family doc · dashboard `registry.ts` |
| Rollback | git revert + redeploy prior fn. (Restoring the 16:9 *capability* is impossible without re-authoring the template — that ship sailed with the repurpose.) |

## 3. Proposed execution lanes (each its own Gate 1; recommended order D → B → W)

| Lane | Contents | Tier (per ratified Convention 3) | External review | Why this order |
|---|---|---|---|---|
| **Lane D — CE declarative-registry truth pass** | property-pulse.json v0.4: three variant retirements (C1/C3/C4) + `2fd50302` never-wired annotation + changelog; family doc notes; `current-ice-flow` pointer note | **T1** (docs-only, verify-or-abort + branch-warden + readback) + **creative-graph-auditor** (registry change per contract) | Only on escalation triggers | Cheapest, kills the CE-side misleading truth first; zero deploy |
| **Lane B — dashboard truth refresh** | `B1_GROUND_TRUTH` card → Option-D truth (TMR winner-driven, worker v3.22.0) · re-vendor `registry.ts` at post-Lane-D CE version | **T2** (isolated code, read-only dashboard surface; build+tsc; no CE risk) | Yes (pinned to diff hash, per T2) | Operator-facing wrongness; depends on Lane D output for the re-vendor |
| **Lane W — worker dead-code removal** | image-worker: retire manual 16:9 + manual 1:1 + template_smoke + tmr_smoke branches/impls/tests (C1/C2/C4 code) · video-worker: remove template_smoke (C3 code) | **T3** (worker changes + 2 deploys, `--no-verify-jwt`) — full chain, Convention-2 sequence recommended | Yes (mandatory) | Lowest urgency (all fail-loud or opt-in except C4's silent-wrong — mitigated meanwhile by Lane D/B truth fixes + nobody invokes these branches routinely); heaviest gates, so last |

**Explicitly NOT in these lanes (standing separate carries):** contract v3 (`policy: tmr_spine`, removes the C1 contract pin properly) · periodic provider-inventory probe · `CREATOMATE_GENERICS_API_KEY` split · fb9820f8 registry row (kept, historical).

**Expected end-state proof (per lane result doc):** repo-wide grep for the four IDs returns only historical docs/briefs/registers + the kept registry row · deno/tsc green · re-run of the recon matrix shows CODE column cleared for C1–C4 · zero production-path diffs (Option-D branch byte-unchanged in Lane W).

## 4. Stop

Planning packet ends here. No edits made. Each lane starts only on its own PK Gate 1; this packet's file is itself uncommitted pending PK.
