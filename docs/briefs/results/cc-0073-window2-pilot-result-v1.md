# Result cc-0073 — WINDOW 2: CFW pilot promotion (S3 soft grey bokeh) — APPLIED

**Manifest:** `docs/briefs/cc-0073-manifest-B-pilot-v2.md`
**Applied at pinned hash:** `eb202701577054d2846584cf66604e18bdfb92c526e30fe7cb9d4162e5542eb7` (re-derived, matched)
**Executed by:** chat (S5), in the PK-opened pilot window · **Completed:** 2026-07-24 Sydney
**Tier:** T3 · **Change class:** data-only, **ONE row**, `c.shared_creative_asset`
**Write path:** direct `execute_sql` DML — **no `apply_migration`, no migration version minted**

## PK visual gate (pre-apply) — VERBATIM, never paraphrased

> **"CFW pilot PASS — headline is fully legible, the bokeh is sector-neutral and appropriately warm,
> and the yellow support tag, icon and footer keep it recognisably Care For Welfare."**

That verdict addresses all three governing criteria directly — **C4 legibility · C1 sector-neutrality
· C5/C6 brand coherence** — on `_harness/cc0073_candidate_renders_20260724/CFW_PILOT_5050_pair.jpg`.

## 1. Result status

`Complete` — applied, all six proofs pass. **Lane NOT closed:** proof 6 (PK visual acceptance of the
*live post-apply* output) is outstanding and is the deciding act.

## 2. Pre-apply gates

Stale-ref PASS (upstream `052a9ba3ec8f1b7251bfe8e0eb399a3e51a5fcb9`, HEAD identical, parity 0/0) ·
manifest hash re-derived and matched · S3 pre-state verified `intake_candidate` / `is_active=false` /
`production_use_allowed=false` / `allowed_clients={}` / `scrim_opacity_override='62'` / no
`promoted_by`.

## 3. The change — one row

`c36bb74f-6f3b-4939-8bdc-c47fc2f39e82` (`Shared/Backgrounds/bg_shared_soft_grey_bokeh.jpg`) →
`is_active=true`, `production_use_allowed=true`, `approval_status='governed'`,
`allowed_clients={3eca32aa-…}` (**CFW only**), `promoted_by` recorded.

Guarded on `approval_status='intake_candidate'` AND `scrim_opacity_override='62'`; inside a `DO` block
asserting 1 row updated · 2 live shared · 6 still fenced · 8 still at scrim 62. All held.

## 4. The six proofs

### P1 — eligible pool is exactly `[S3, brand-navy]`
**PASS.** 40 seeds → **exactly 2** distinct `asset_key`. Nothing else eligible. No other shared asset
leaked into CFW's pool.

### P2 — selection ≈ 50/50 by the governed `hash mod 2` rule
**PASS — measured 20 / 20 over 40 seeds (50.0% / 50.0%).**

| background | draws | share |
|---|---|---|
| `Shared/Backgrounds/bg_shared_soft_grey_bokeh.jpg` | 20 | **50.0%** |
| `bg_cfw_brand_texture_navy_waves` | 20 | **50.0%** |

### P3 — brand-navy remains reachable, not displaced
**PASS.** CFW's own brand asset is selected on 50% of draws. It sorts *last* in the `best_fit` ranking
(text-safe-first; brand-navy is `needs_scrim`) but ranking does not bias the pick — `hash mod count`
is uniform. Sample: seed `cc0073-pilot-2` → `bg_cfw_brand_texture_navy_waves` @ scrim **48**,
reasons `[governed, license_ok, text_safe_needs_scrim, client_match]`.

### P4 — no cross-client eligibility leak
**PASS**, and the two non-leak mechanisms are distinct and both verified:

| client | fb | ig | li | S3 reachable? |
|---|---|---|---|---|
| property-pulse | kitchen @48 | mortgage-keys @48 | subdivision @48 | **no** — `client_only`, shared loop never runs |
| ndis-yarns | library-nook @55 | library-nook @55 | library-nook @55 | **no** — same |
| invegent | datacentre @62 | datacentre @62 | datacentre @62 | **no** — loop runs, S3 rejected **`not_in_allowlist`** |

All nine resolutions byte-identical to the pinned-seed baseline. Invegent is the meaningful test: its
shared loop *does* execute and *does* evaluate S3, and the `{CFW}` allowlist correctly excludes it.

### P5 — actual CFW template render at scrim 62
**PASS.** Real Creatomate renders through `generic_market_insight_card_1x1_v1` (CFW's live template)
with CFW's live logo, **driven by the values the live resolver itself emitted** — not hand-fed:

| seed | background | Scrim.opacity | render id |
|---|---|---|---|
| `cc0073-pilot-1` | S3 soft grey bokeh | **62** (`scrim_override_applied`) | `14c1e801-3b48-40f1-9257-9690c8c54a10` |
| `cc0073-pilot-2` | CFW brand navy | **48** | `a3070a41-583a-44f9-94ac-d8a513782699` |

Artifacts: `_harness/cc0073_pilot_live_20260724/` — `PILOT_LIVE_5050.jpg` + both cards + hashes.

**Notable:** the post-apply live renders are **byte-identical** (sha256
`60344e8f…` and `74f9fea4…`) to the pre-apply preview pair PK reviewed. The preview was therefore an
exact prediction of live output, not an approximation — the resolver's emitted values matched the
preview inputs precisely.

### P6 — PK visual acceptance of the first real output
**OUTSTANDING — this is the deciding act and the lane is not closed without it.**
Surfaced for a second look: `_harness/cc0073_pilot_live_20260724/PILOT_LIVE_5050.jpg`.

## 5. Additional verification

| Check | Result |
|---|---|
| Fences | 2 live / 6 fenced / **8 still at `scrim_opacity_override='62'`** |
| S8 untouched | `governed`, `{invegent}`, unchanged |
| S1/S2/S4/S5/S6/S7 | untouched, still `intake_candidate` |
| Spine unmutated | `resolve_slot_assets` `75d59925316ccde39073113557504596` · `select_template` `41df4745707d0396f145d32d7ffd7483` |
| Ledger frozen | 8 rows, 4 open; carousel ×3 `(assignment, unassigned)`; PP-YouTube `(platform_config, misconfigured)` |
| CFW policy row | unchanged from Window 1 (`best_fit`, `cc-0073-cfw-bestfit-v1`) |

## 6. Constraints confirmed

- **No expansion** — S1, S2, S4, S5, S6, S7 all still fenced. PK's ruling honoured: expansion waits on
  acceptance of the **live rendered output** (P6), not the pre-render pair.
- **No Invegent asset touched** — S8 unchanged; the Invegent manifest is authored-only, **not applied**.
- **One asset, one allowlist** — exactly as specified.
- No policy change in this window · no resolver/template change · no ledger mutation ·
  no commit/register/push.

## 7. Rollback (validated, unused)

```sql
UPDATE c.shared_creative_asset
   SET is_active=false, production_use_allowed=false, approval_status='intake_candidate',
       allowed_clients='{}'::uuid[], asset_meta = asset_meta - 'promoted_by', updated_at=now()
 WHERE id='c36bb74f-6f3b-4939-8bdc-c47fc2f39e82';
```
Restores byte-identical prior state; returns CFW to a 1-asset pool **without touching Window 1's
policy row**. The `approval_status` guard makes a re-run update 0 rows.

## 8. Standing expectation for the P6 gate — read this before judging the pilot

At **N=2**, the chance two consecutive CFW posts share a background is **50%**. Selection is
memoryless — `hash(seed) mod count`, no anti-repeat memory. **This is correct behaviour, not pilot
failure.** The pilot proves *visual acceptance of a sector-neutral shared asset on a real CFW card*,
not rotation richness. A pilot judged on repeat frequency would be rejected for doing exactly what it
was designed to do. Anti-repeat guarantees require resolver logic — **cc-0051 handoff, recorded, not
actioned.**

## 9. Open / next

- **P6 — PK visual acceptance of the live output.** Deciding act; lane open until given.
- **Expansion** (S1/S4 for CFW) — blocked on P6, then a fresh gate. B-v1 (`ae5041ae…`) retained as the
  expansion design.
- **Invegent promotion** — manifest authored and frozen, **NOT applied**; next sprint, own window.
- **CFW sourcing** — remains CLOSED by PK ruling; learn whether the smaller pool suffices first.
- Standing: no Invegent **client-scoped** background while `client_preferred`.

---

**Window 2 CLOSED (apply + proofs 1–5). P6 outstanding.** Nothing staged; S4 records.
