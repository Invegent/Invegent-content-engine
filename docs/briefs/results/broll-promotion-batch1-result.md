CLAIMED · broll-promotion-batch1 · main-checkout `C:\Users\parve\Invegent-content-engine` · applied · 2026-07-29

# Result — Governed B-roll: PK Visual Verdict + Promotion Batch 1 · ✅ APPLIED

**Date:** 2026-07-29 Sydney · **Lane:** PRODUCT_PROOF · **Tier: T3**
**PK visual verdict:** *"Promote the top three"* (2026-07-29), following delivery of the contact-sheet
review bundle at v6.63.
**Artifacts:** `docs/briefs/artifacts/broll-promotion-batch1-forward.sql` (`19f48b62…`) · `…-rollback.sql` (`875433239…`)

> **The eligible B-roll pool went 1 → 4 — the ratified rotation-readiness floor is MET.**
> Rotation proven uniform on live production state: **10 / 10 / 10 / 10** across 40 seeds.
> Every PP governed video no longer renders the identical clip.

---

## 1. What was applied

Three fenced batch-1 rows promoted to eligible (`is_active=true`, `approved=true`,
`production_use_allowed=true`, `approval_status='governed'`, `approved_by='PK'`, `approved_at`,
`promotion_lane`):

| rank | asset_id | asset_key | geo_scope | duration |
|---|---|---|---|---|
| 1 | `f84ac010` | `broll_pp_au_wa_perth_coastal` | `au_wa_perth` | 19.7s |
| 2 | `aa55659e` | `broll_pp_generic_apartment_abstract` | `generic` | 25.0s |
| 3 | `4653144c` | `broll_pp_au_nsw_suburb_waterway` | `au_nsw_sydney_metro` | 51.0s |

**Rank 4 (`9cf9d01a` `broll_pp_au_nsw_suburb_skyline`) deliberately NOT promoted** — closest in look to
the incumbent (both Hurstville). Guard G4 asserted it stayed fenced. The older `42211c0f`
`broll_pp_perth_skyline` also remains fenced (unrecognised `sfto`, untouched by this lane).

No DDL · no GRANT · no template, resolver, worker, or parity-overlay change · no deploy.

## 2. Guard outcomes — all eight passed

| Guard | Check | Result |
|---|---|---|
| G0 | atomicity armed pre-write, re-asserted | ✅ |
| G1 | identity pin — pre-image digest `2cae61b9…` | ✅ |
| G2 | live baseline pool == 1 | ✅ |
| G3 | exactly 3 promoted, CAS-pinned to the fenced state | ✅ |
| G4 | **rank-4 skyline stays fenced** | ✅ |
| G5 | incumbent clip undisturbed and still eligible | ✅ |
| G6 | **pool EXACTLY 4** (not 3, not 5) | ✅ |
| G7 | template winner unchanged at production signature | ✅ |
| G8 | **rotation proof — all 4 clips reachable across 24 seeds** | ✅ |

Applied as ONE `execute_sql` call so `BEGIN`/`DO`/`COMMIT` composed.

## 3. Post-apply verification (live production state)

**Eligible pool = 4.** All four `approval_status='governed'`, `approved_by='PK'`:
`broll_pp_au_suburb_aerial` (incumbent) · `broll_pp_au_wa_perth_coastal` ·
`broll_pp_generic_apartment_abstract` · `broll_pp_au_nsw_suburb_waterway`.
Still fenced: `broll_pp_au_nsw_suburb_skyline`, `broll_pp_perth_skyline`.

### Rotation proof — 40 live seeds

| clip | hits |
|---|---|
| `broll_pp_generic_apartment_abstract` | 10 |
| `broll_pp_au_wa_perth_coastal` | 10 |
| `broll_pp_au_suburb_aerial` | 10 |
| `broll_pp_au_nsw_suburb_waterway` | 10 |

**Perfectly uniform — 25% each, zero unreachable clips.** The pool now delivers three genuinely
distinct looks (WA coastal · architectural abstract · Sydney waterway) plus the incumbent, rather than
one clip repeated on every render.

## 4. TPR-1 assessment — non-trigger (stated, not assumed)

This is **not** a template repoint. The governed output spec (1080×1920 / 12s) is owned by the template
and its render-time parity overlay, **neither of which was touched**; only which background asset the
resolver may select changed. TPR-1 / Addendum v1 therefore does not trigger.

All three promoted clips are natively **1080×1920** with durations 19.7s / 25.0s / 51.0s — each
comfortably exceeding the 12s composition length, so none renders short against it.

## 5. Rollback

**Proven BEFORE apply:** forward + rollback executed live in an aborted transaction — 3 promoted, pool
1→4, then 3 re-fenced, pool 4→1, restore **digest-exact** to `2cae61b90c9844d03396428459199b12`.

`broll-promotion-batch1-rollback.sql` re-fences the 3 rows (identity-pinned to the promoted state,
asserting rowcount==3, digest-exact restore, pool back to 1, incumbent undisturbed). **Storage objects
are deliberately untouched**, so the clips stay uploaded and fenced and could be re-promoted without
re-uploading.

## 6. Chain

| Check | Verdict |
|---|---|
| Dry run (aborted txn) | pool 1→4, rank-4 fenced, winner unchanged, 4/4 reachable (7/7/5/5 over 24 seeds) |
| Rollback proven before apply | **digest-exact**, pool 4→1, zero production effect |
| External review | **`agree`** · medium · high · **`pushback_points: []`** · `unverified_claims: []` · no escalation — `review_id ed4ccd65-8121-4d4e-aaf7-e3cb91f41a64`, pinned `19f48b62…` / `875433239…` |
| Guards executable, not prose | verified — eight `RAISE EXCEPTION` |
| `db-rls-auditor` / `branch-warden` | **orchestrator-run substitution (CCF-02 R1)** — session instructed not to spawn subagents; equivalent read-only checks run inline |
| **PK visual verdict + Gate 2** | ✅ **GRANTED** — *"Promote the top three"* |
| Apply | ✅ **committed, all eight guards passed** |
| Post-apply verification | ✅ pool=4, rotation 10/10/10/10 on live state |

## 7. Known caveat (disclosed, unchanged)

**The resolver still has no recent-use avoidance.** It is `STABLE` and reads no render history, so
selection is memoryless sampling with replacement. At a pool of 4 the expected **consecutive-repeat
rate is ≈25%** — a given render can repeat its predecessor. Growing the pool reduces but cannot
eliminate this; only a history-aware selector would, and that remains explicitly out of scope
(a reviewed resolver change).

The uniform 10/10/10/10 distribution is about *reachability and balance*, not about consecutive repeats.

## 8. Non-claims

- ❌ Not claimed: repeats are eliminated. They are not (§7).
- ❌ Not claimed: a render has been produced through the new pool. This lane changed **selection state**
  and proved it via the resolver; no video was rendered.
- ❌ Not claimed: `label_constraint` / geo labels are enforced. **No renderer reads them** (carry C1) —
  documentation only.
- ❌ Not claimed: the target of 6 is met. The floor of **4** is met; target 6 remains open, with
  `31639439` (held, quality-eligible) and `broll_pp_au_nsw_suburb_skyline` (fenced) as batch-2 stock.

## 9. Stop condition

**Met.** Promotion applied, pool increase and rotation proven on live state, result recorded, committed,
pushed. Governed B-roll rotation is now live at the ratified floor.
