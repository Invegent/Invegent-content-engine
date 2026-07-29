CLAIMED · broll-platform-scope-correction-v1 · main-checkout `C:\Users\parve\Invegent-content-engine` · Gate-2 applied · 2026-07-29

# Result — B-roll `platform_scope` Correction v1 · ✅ APPLIED

**Date:** 2026-07-29 Sydney · **Lane classification:** SAFETY_GATE · **Tier: T2** (tier disputed by
external review; PK authorised the apply without electing T3 — recorded in §6).
**Packet:** `docs/briefs/broll-platform-scope-correction-v1-apply-packet.md`
**Artifacts:** `docs/briefs/artifacts/broll-platform-scope-correction-v1-forward.sql` ·
`…-rollback.sql`
**PK authorisation:** explicit, 2026-07-29 ("Apply it") following the frozen packet at `0064afa`.

> **Outcome:** both `broll_background` rows now declare `{facebook,instagram,youtube}`. All six guards
> passed. **Production renders exactly what it rendered before** — verified end-to-end, not just at the
> resolver.

---

## 1. What was applied

`c.client_brand_asset.platform_scope`, 2 rows, one column:

| asset | asset_key | before | after |
|---|---|---|---|
| `2d62b04e` | `broll_pp_au_suburb_aerial` (live, sole eligible clip) | `{youtube}` | **`{facebook,instagram,youtube}`** |
| `42211c0f` | `broll_pp_perth_skyline` (fenced) | `{youtube}` | **`{facebook,instagram,youtube}`** |

No DDL · no GRANT · no fence change · no `fit_status`/`enabled` change · no template, resolver or code
change · no deploy. LinkedIn deliberately excluded (ratified `video-broll-intake-v1` ruling 4).

- **Pre-image digest:** `a779f700296959c8cf18e28cdcceb1b8` (re-verified immediately before apply)
- **Post-image digest:** `0801049c8f942dc6a5dccfe4dadcb55e`

## 2. Guard outcomes — all passed, apply committed without raising

| Guard | Result |
|---|---|
| **G0** atomicity armed pre-write, re-asserted post | ✅ |
| **G1** pre-image digest == frozen value | ✅ |
| **G2** exactly 2 rows updated (CAS-pinned) | ✅ |
| **G3** post-image exactly `{facebook,instagram,youtube}` on both | ✅ |
| **G4** production-signature resolver payload byte-identical | ✅ |
| **G5** LinkedIn still `fail_closed` | ✅ |

Executed as **one** `execute_sql` call covering the whole file, so `BEGIN`/`DO`/`COMMIT` composed in a
single transaction (avoiding the pooled-channel non-composition failure class).

## 3. Post-apply verification (live)

### 3.1 Resolver — `resolve_slot_assets` on the production template `dd5fd75e`

| `p_platform` | status | picked |
|---|---|---|
| **`NULL`** (production) | `ok` | `broll_pp_au_suburb_aerial` — **unchanged** |
| `facebook` | **`ok`** ✅ (was `fail_closed`) | `broll_pp_au_suburb_aerial` |
| `instagram` | **`ok`** ✅ (was `fail_closed`) | `broll_pp_au_suburb_aerial` |
| `linkedin` | `fail_closed` / `no_governed_background` | — (correctly excluded) |
| `youtube` | `ok` | `broll_pp_au_suburb_aerial` |

### 3.2 End-to-end selection — `select_template`, the real production entry point

| call | winner |
|---|---|
| `p_platform=NULL` (**production**) | `AU_generic_national_Suburb_9:16_V1` — **B-roll, unchanged** |
| `p_platform='facebook'` | `video_stat_reveal_9x16_v2` (incumbent) — unchanged |
| `p_platform='instagram'` | `video_stat_reveal_9x16_v2` (incumbent) — unchanged |

**Production behaviour is identical to pre-apply, verified at both layers.** The disclosed §4.3
limitation is unchanged and was not worsened: at an explicit fb/ig platform, template suitability still
rejects the B-roll template above the asset layer, so selection falls back to the incumbent.

## 4. What this did and did not achieve

**Achieved:** the declared `platform_scope` is now **honest** — it no longer asserts a youtube-only
restriction while the clip renders everywhere. The asset-layer detonator is defused: a future caller
passing an explicit `facebook`/`instagram` no longer empties the B-roll pool.

**NOT achieved (unchanged, by design):**
- `platform_scope` is still **not enforced** in production — the resolver's gate remains short-circuited
  at `p_platform=NULL`. This apply made the value truthful, not consulted.
- Explicit-platform B-roll still does not render end-to-end: template `46c5c4ac` has **no row** in
  `c.creative_template_platform_suitability`. Closing that is a separate lane inheriting TPR-1 +
  Addendum v1.
- The Perth row remains triple-fenced and its `sfto='needs_gradient_scrim'` is still an unrecognised
  value that would fail closed even if un-fenced — **deliberately untouched** (PK asked for
  `platform_scope`; `sfto` touches eligibility).

## 5. ⚠ Incidental finding — `updated_at` does NOT track changes on this table

Both rows' `updated_at` are **byte-unchanged across a committed `UPDATE`**
(`42211c0f` = `2026-07-10 12:17:07`, `2d62b04e` = `2026-07-28 02:19:34` — identical before and after).
There is no `updated_at` trigger on `c.client_brand_asset` for this path.

**Consequence:** `updated_at` is **not a reliable audit signal** for `c.client_brand_asset` — a lane
that uses it to detect drift or to prove "nothing changed" will get a false negative. This also
re-explains why the pre-apply rollback proof left no trace: not merely because the transaction aborted,
but because the column does not move even on a real commit. Recorded as a carry, not fixed here.

## 6. Chain

| Check | Verdict |
|---|---|
| Live read-only inspection + aborted-transaction dry run | complete |
| Rollback proven **before** apply | `ROLLBACK_PROOF_PASSED`, digest-exact, zero production effect |
| External review round 1 | `partial` · medium · high · no concrete defect · 1 tier pushback — `278fdc71-9f8f-4182-ad39-b0977f14c723`, pinned `81be969e…` |
| External review round 2 | `partial` · medium · medium · **"no concrete defect present"**, round-1 claims closed by live counts · tier pushback persists — `ebbce1f6-a2de-43a1-8817-abc5e4efee27`, pinned `12c760c9…` |
| Guards executable, not prose | verified — six `RAISE EXCEPTION` |
| `db-rls-auditor` / `branch-warden` | **orchestrator-run substitution (CCF-02 R1)** — session instructed not to spawn subagents; equivalent read-only checks run inline and named in the packet |
| **PK Gate-2 apply authorisation** | ✅ **GRANTED 2026-07-29** |
| Apply | ✅ **committed, all guards passed** |
| Post-apply verification | ✅ resolver + `select_template`, both layers |

**Tier disposition:** external review pushed back on T2 across both rounds, arguing tier should track
what a row class *governs* rather than only measured impact (`policy_decision`). PK authorised the apply
without electing T3. The dispute is **recorded, not resolved** — if the principle is accepted generally
it would reclassify future `client_brand_asset` DML, which is a standing-rule question rather than a
finding against this lane.

## 7. Rollback status

**Available and valid.** `docs/briefs/artifacts/broll-platform-scope-correction-v1-rollback.sql` restores
`{youtube}` on both rows, identity-pinned to the applied state `{facebook,instagram,youtube}` and
self-verifying against the forward pre-image digest `a779f700296959c8cf18e28cdcceb1b8`. It was proven
live before the apply. One `execute_sql` call.

## 8. Non-claims

- ❌ Not claimed: that `platform_scope` is now enforced in production. It is not (§4).
- ❌ Not claimed: that explicit-platform B-roll renders. It does not (§3.2).
- ❌ Not claimed: that the B-roll pool improved. **Still 1 eligible clip, still below the ratified
  floor of 4** — this lane sourced nothing and promoted nothing.
- ❌ Not claimed: that the tier dispute is settled (§6).

## 9. Stop condition

**Met.** Applied, verified at both layers, recorded, committed, pushed. No further action in this lane.
Normal production volume still does **not** resume — that gate is the 4-clip eligible floor, and Asset
Sufficiency owns it.
