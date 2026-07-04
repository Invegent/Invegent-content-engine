# Lane 4 — B1 Rotation Alignment — Evidence + Decision Packet (Gate 1)

**Created:** 2026-07-04 Sydney · **Queue:** item 4 (PK-ratified 2026-07-04: "Align B1's canonical background order to the governed resolver rank order")
**Status:** review chain complete — **awaiting the PK hash/apply gate (HARD STOP)**. PK resolved the §5 fork 2026-07-04: **"Approve Option A-now-D-later"**, explicitly accepting the production render behaviour change (mapping permutation + the 2 newly promoted governed backgrounds entering B1 rotation). Build + full review chain done — see §8. **Diff hash (pinned): `a005c5e9904c262bcf9deebfca3b3b5ceec982c86f6169f3a8bd83772de738d2`** (artifact `_harness/lane4_rotation_alignment_packet.diff`; worktree `C:\Users\parve\ice-wt-lane4-rotation`, branch `lane4-rotation-alignment` off main @ `bc77ae8`, uncommitted).

## 1. Material discovery: the resolver pool is no longer 3

PK's directive assumed the S0-era comparison: B1 canonical `[perth, brisbane, sydney]` vs resolver rank `[perth, sydney, brisbane]` — same FNV-1a hash, permuted 3-element arrays, 5/17 agreement. **That premise is stale.** A parallel session's P0 background promotion (PK-approved, `approved_by='PK'` at `2026-07-03T23:21Z`) promoted 2 of the 7 intake candidates to governed/`production_use_allowed`/active, and both pass the resolver's full filter chain. **The live eligible background pool is now FIVE:**

| Rank | asset_key | created_at | tiebreak | sfto |
|---|---|---|---|---|
| 1 | `bg_perth_cbd` | 2026-06-22 07:07:29Z | — | needs_scrim |
| 2 | `bg_sydney_cbd` | 2026-06-22 11:34:18Z | asset_id `3769be84…` < | needs_scrim |
| 3 | `bg_brisbane_cbd` | 2026-06-22 11:34:18Z | asset_id `47f489f4…` | needs_scrim |
| 4 | `bg_pp_au_suburb_aerial_grid` | 2026-07-03 09:16:02Z | asset_id `b2a10002…` < | needs_scrim |
| 5 | `bg_pp_home_keys_contract_table` | 2026-07-03 09:16:02Z | asset_id `b2a10006…` | needs_scrim |

(Live-verified this session; rank = the resolver's `(text-safe class, created_at ASC, asset_id ASC)` order — all five are `needs_scrim`, so created_at/asset_id decide.)

## 2. Current state of both sides

- **B1 worker (production):** `B1_BACKGROUND_KEYS = ['bg_perth_cbd', 'bg_brisbane_cbd', 'bg_sydney_cbd']` hardcoded at `supabase/functions/image-worker/b1_production.ts:31`; pick = FNV-1a 32-bit over `post_draft_id`, **mod 3**, into that array (`selectB1BackgroundKey`, index.ts:678).
- **Resolver (dark):** same FNV-1a over the seed, **mod 5**, into the ranked list of §1 (`resolve_slot_assets` v1.1, ledger 20260704002811).
- **S0 datum:** 17 rows, background agreement **5/17** (measured while both pools were 3-element permutations).

## 3. The math after the promotion — an order-swap no longer does anything

The two sides now take **different moduli** (3 vs 5, coprime). For a uniform hash, each (worker-index, resolver-index) pair has density 1/15; the sides agree only when both land on the same shared key:

| Worker array | Expected forward agreement |
|---|---|
| Today `[perth, brisbane, sydney]` | shared keys at (0,0),(1,2),(2,1) → **3/15 = 20%** |
| **Order-swapped** `[perth, sydney, brisbane]` (the directive as written) | shared keys at (0,0),(1,1),(2,2) → **3/15 = 20% — identical. The swap changes production picks (brisbane↔sydney on ~⅔ of new seeds) while buying ZERO S1 signal.** |
| Full 5-key alignment (§5 Option A) | same array, same length, same hash → **100%** while the pool stays exactly these 5 |

**Conclusion: the ratified instruction ("align the order") can no longer achieve its stated goal in any form that avoids production impact.** Every option that moves S1 agreement off ~20% changes what production renders pick.

## 4. Boundary contradiction (stated plainly)

The directive requires *"proof that no production runtime behaviour changes"* AND alignment. These cannot both hold:

- The B1 background choice is **production render behaviour** — it is computed in the deployed image-worker from a hardcoded array. Aligning it (order and/or membership) by definition changes which governed background lands on some future B1 renders.
- There is **no data/config/shadow-side location** where "B1's canonical order" could be changed without production effect: the S1 stamper compares the render log's *actual* pick against the selector — it consumes no canonical-order constant that could be aligned instead.

What CAN be proven for every option below: S0's 17 historical rows untouched (this lane writes zero DB rows) · resolver/select_template/stamper untouched · publisher untouched · Format Mix untouched · dashboard untouched · no re-render of any existing output.

## 5. Options (PK picks ONE)

**Option A — Full alignment (RECOMMENDED):** set the worker array to the resolver's 5-key rank order `['bg_perth_cbd','bg_sydney_cbd','bg_brisbane_cbd','bg_pp_au_suburb_aerial_grid','bg_pp_home_keys_contract_table']`.
- **S1 impact:** background agreement → **100%** while the pool stays exactly these 5 → every future divergence row = a *real* selector difference (PK's stated goal, fully met).
- **Production impact (must be accepted explicitly):** future B1 seed→background mapping changes, and the 2 newly promoted backgrounds start appearing on B1 production renders (~⅖ of new seeds). Both are PK-approved `production_use_allowed` governed assets — this is arguably the intended consumption of the promotion — but it IS a production-visible change.
- **Blast radius (all in one reviewed diff):** `b1_production.ts` constant + comment · vendored contract pool in BOTH `image-worker/creative_contract.ts` and `ai-worker/creative_contract.ts` (`background.asset_keys`; contract_version bump decision included in the build) · declarative registry `docs/creative-library/property-pulse.json` (6 pool-declaration sites) + pattern-library mention (else creative-graph-auditor flags vendored-registry drift) · test updates (exact-array asserts, coverage 3→5, FNV stability pins recomputed) · **TWO EF deploys** (image-worker + ai-worker, PK-run, `--no-verify-jwt`).
- **Brittleness (recorded honestly):** alignment holds only while the eligible pool is exactly these 5 in this order. Any future promotion/deactivation re-diverges it silently. The durable fix is Option D's endgame — the constant is a stopgap.
- Old drafts' frozen `draft_format.contract` evidence keeps the 3-key pool (historical truth; warn-only validation checks URL presence, not pool membership — no warning noise).

**Option B — Order-swap only (the directive as literally written): DO NOT DO.** 20% → 20% expected agreement (§3); all production-mapping cost, zero S1 benefit. Listed only for completeness.

**Option C — No change / accept divergence:** zero production impact; S1 background rows keep ~20% agreement recorded as structurally-explained divergence. Rejects the directive's goal.

**Option D — Defer alignment to the TMR-live lane:** when B1's render path consumes `select_template`/`resolve_slot_assets` directly (the planned enablement), alignment becomes automatic and permanent, and the constant is deleted. If that lane is near, Option A's stopgap may not be worth 2 EF deploys. Can be combined: A now, D later.

## 6. If PK picks A — the build/gate plan (nothing started)

ef-builder isolated worktree (code + vendored contracts + registry JSON + tests) → deno tests green → alignment-equivalence harness (TS pick vs live SQL resolver pick over the 17 S0 seeds + 500 random UUIDs → must be 100%) → creative-graph-auditor on the registry change → branch-warden → external review pinned to the diff hash → **PK hash gate** → PK-run deploys (`--no-verify-jwt`, both workers) → post-deploy: next natural B1 render + supervised `stamp_tmr_shadow_forward()` → expect the S1 row to show `background_match=true` (the live proof S1 has been waiting for does double duty).

## 7. Boundaries held in THIS packet

No DB write · no deploy · no commit/merge/push (worktree only) · no register edit yet · S0 rows bit-untouched (lane writes zero DB rows) · resolver/selector/stamper/publisher/dashboard untouched.

## 8. Build + review chain (post-decision; all pinned to `a005c5e9…`)

**The diff (12 modified + 1 new, 86+/34−, ef-builder isolated worktree):** `b1_production.ts` B1_BACKGROUND_KEYS 3→5 in resolver rank order (FNV logic byte-unchanged; perth stays index 0, back-compat holds) · both vendored `creative_contract.ts` copies: pool → 5 keys + `contract_version` v1→**v2** (contract_key/contract_ref UNCHANGED — variant identity preserved) · `contract_validation.ts` warn-only EXPECTED_CONTRACT_VERSION → v2 (else every v2-stamped draft warns forever; transient v1-draft warn window accepted, evidence-only) · version bumps image-worker **v3.21.0** / ai-worker **v2.17.0** · tests updated incl. FNV stability pins RECOMPUTED by execution (7 pins covering all 5 keys) · declarative registry `property-pulse.json` all 6 pool sites + mod-5 note + contract v2 + PK-decision evidence note; pattern-library table → 5 keys · NEW `_harness/lane4_alignment_equivalence.mjs`.

| Gate | Verdict |
|---|---|
| deno tests | **63/63** across 7 files; `deno check` clean; JSON parse valid |
| **Equivalence proof** (orchestrator-run, independent) | **514/514**: 14 S0 seeds + 500 synthetic UUIDs through the worktree TS pick AND the LIVE SQL resolver — canonical md5 digests IDENTICAL (`2111b5765d1bfebeee1dfd6d9dbc10d0` both sides), distributions identical (103/105/95/99/112), 0 nulls |
| creative-graph-auditor | **PASS** — pool identical (keys AND order) across all registry sites + vendored copies; runtime-import guard holds; 3 advisories: stale vendored `source_commit 2ac172b` (chicken-and-egg pre-commit → **named post-merge carry**), v2 approval-trail evidence (**fixed in this diff**), pre-existing `approved_at` nulls (existing carry) |
| branch-warden | **safe** — isolated worktree verified, exact 13-file set, zero commits, main checkout clean, origin/main parity 0/0 |
| external review | **agree / proceed · risk medium · confidence high · zero pushback** — `review_id 2ac80909-7c23-46e2-805e-c0a0a5b0ef51` |

## 9. Apply plan (on PK approval of hash `a005c5e9…` — every step PK-gated)

1. Commit the worktree branch → fast-forward merge to main → push (PK instruction, exact message).
2. **Pre-deploy re-verify (mandatory):** live resolver eligible pool is STILL exactly these 5 keys in this order — any promotion/deactivation since 2026-07-04 invalidates the alignment premise → STOP.
3. Deploy BOTH workers back-to-back (PK-run): `supabase functions deploy image-worker --no-verify-jwt && supabase functions deploy ai-worker --no-verify-jwt` (any single-worker window = transient warn-only contract_identity notes).
4. Post-deploy: next natural B1 render + supervised `stamp_tmr_shadow_forward()` → expect `background_match=true` (doubles as the outstanding S1 live stamping proof).
5. Result doc + registers + post-merge `source_commit` provenance carry.
