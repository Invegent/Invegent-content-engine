CLAIMED · broll-suitability-fb-ig-v1 · main-checkout `C:\Users\parve\Invegent-content-engine` · Gate-2 applied · 2026-07-29

# Result — B-roll Platform Suitability (facebook + instagram) v1 · ✅ APPLIED

**Date:** 2026-07-29 Sydney · **Lane classification:** PRODUCT_PROOF · **Tier: T3**
**Packet:** `docs/briefs/broll-suitability-fb-ig-v1-apply-packet.md` (frozen at `c8e4fad`)
**Artifacts:** `docs/briefs/artifacts/broll-suitability-fb-ig-v1-forward.sql` · `…-rollback.sql`
**PK authorisation:** explicit, 2026-07-29 — *"Accept the Surface C inference and apply it"*, which
both resolved the blocking review pushback and authorised Gate 2.

> **Outcome:** facebook and instagram are repointed from the incumbent to the governed B-roll template.
> All eight guards passed. **Production (`p_platform=NULL`) is unchanged**, LinkedIn stayed on the
> incumbent, and YouTube was not opened.

---

## 1. What was applied

2 rows INSERTed into `c.creative_template_platform_suitability` for template `dd5fd75e`
(provider `46c5c4ac`):

| platform | placement | suitability_status |
|---|---|---|
| `facebook` | `feed` | `candidate` |
| `instagram` | `feed` | `candidate` |

`candidate` mirrors the incumbent's own rows and is the honest value — it passes the selector gate
while still emitting `platform_suitability_unproven`. No DDL, GRANT, template, resolver, asset, fence,
`fit_status`, code or deploy change.

## 2. Guard outcomes — all eight passed, committed without raising

| Guard | Result |
|---|---|
| **G0** atomicity armed pre-write, re-asserted post | ✅ |
| **G1** pre-state exactly 0 suitability rows | ✅ |
| **G2** exactly 2 rows inserted | ✅ |
| **G3** post-state exactly 2 rows, all `(facebook\|instagram, feed, candidate)` | ✅ |
| **G4** production-signature winner unchanged **and** still the B-roll template | ✅ |
| **G5** repoint took at both facebook and instagram | ✅ |
| **G6** no LinkedIn leakage — still the incumbent | ✅ |
| **G7** no YouTube enablement — still unselectable | ✅ |

Executed as **one** `execute_sql` call covering the whole file, so `BEGIN`/`DO`/`COMMIT` composed in a
single transaction.

## 3. Post-apply verification (live)

| `p_platform` | winner | warnings |
|---|---|---|
| **`NULL`** (production) | `AU_generic_national_Suburb_9:16_V1` — **unchanged** | `platform_input_missing` |
| `facebook` | **`AU_generic_national_Suburb_9:16_V1`** ← repointed (was the incumbent) | `platform_suitability_unproven` |
| `instagram` | **`AU_generic_national_Suburb_9:16_V1`** ← repointed (was the incumbent) | `platform_suitability_unproven` |
| `linkedin` | `video_stat_reveal_9x16_v2` (incumbent) — **unchanged** | `platform_suitability_unproven` |
| `youtube` | `(none)` — **not enabled** | — |

Row readback confirms exactly 2 rows, both `feed`/`candidate`, created `2026-07-29 07:10:04Z`.

## 4. TPR-1 + Addendum v1 compliance (the addendum's first real use)

| Surface | OUTGOING `c11bb8ab` | INCOMING `46c5c4ac` |
|---|---|---|
| **A** saved provider spec | `1080×1920 / 12s` | `720×1280 / 8s` |
| **B** worker parity overlay | absent → empty | `1080×1920`, `.duration=12` on all 8 elements |
| **Effective** | **`1080×1920 / 12s`** | **`1080×1920 / 12s`** |
| **source** | `provider_template_default` | `render_time_parity_overlay` |

**`specs_match = TRUE`.** The incoming registry row still reads `720/1280/8` and was left untouched
(TPR-1.c) — it truthfully describes the provider object.

**Surface C — accepted by PK as a code-level inference, not a fresh measurement.** C =
`1080×1920 / 00:00:12.00`, ffmpeg-measured in the v6.54 proof at the `p_platform=NULL` signature. No
fb/ig render exists to measure because no caller passes an explicit platform (§5). The inference is
that `parityOverlayForProviderTemplate` is keyed **solely** by provider-template id and takes no
platform argument, so the identical overlay applies on any platform and platform never reaches the
Creatomate payload at all. **PK accepted this explicitly at the gate.** Recorded as an accepted
inference so no later lane cites it as a measured fb/ig result.

## 5. ⚠ This has ZERO live effect today

No production caller passes an explicit platform for `video_short_stat` — `video-worker` passes `null`
in both production (`index.ts:1251`) and the governed smoke (`index.ts:1437`); `image-worker` passes an
explicit platform but for `image_quote`, a different format.

**So nothing renders through the fb/ig video path.** This change is **preparatory**: B-roll is now
*selectable* at fb/ig for whenever such a caller exists. It must not be read as "fb/ig B-roll now
renders" — it does not, because nothing calls it.

## 6. Deliberate exclusions (unchanged, asserted by guards)

- **LinkedIn** — excluded because the asset `platform_scope` (set at v6.59) omits it; an li row would
  declare suitability the assets block at `no_governed_background`. G6 verified li stayed on the
  incumbent.
- **YouTube** — excluded as a safety call. No template has a youtube suitability row, so youtube fails
  closed globally; opening it would expose the schedule-blind auto-publish path and needs its own PK
  decision. G7 verified youtube remains unselectable.

## 7. Chain

| Check | Verdict |
|---|---|
| Live dry run (aborted txn) | before/after measured, production invariance confirmed |
| Rollback proven **before** apply | `ROLLBACK_PROOF_PASSED` — 2 deleted, 0 remain, fb/ig restored to incumbent, zero production effect |
| TPR-1 + Addendum v1 three-surface diff | `specs_match = TRUE` (§4) |
| External review | `partial` · medium · medium · **no concrete defect** · 2 pushbacks escalated — `8a990dde-ec47-4afb-9434-cc921d021e4b`, pinned `29d7cdb8…` |
| Guards executable, not prose | verified — eight `RAISE EXCEPTION` |
| `db-rls-auditor` / `branch-warden` | **orchestrator-run substitution (CCF-02 R1)** — session instructed not to spawn subagents; equivalent read-only checks run inline and named in the packet |
| **PK Gate-2 authorisation** | ✅ **GRANTED 2026-07-29**, with Surface C explicitly accepted |
| Apply | ✅ **committed, all eight guards passed** |
| Post-apply verification | ✅ rows + selection across all five platform values |

**Review pushback disposition:**
1. **Surface C** (`runtime_verification_required`) — **resolved by PK acceptance at the gate**, which is
   the named decision CCF-02 routing requires. Not resolved by further evidence.
2. **G7 durability against future changes** — acknowledged and unchanged: G7 is an **apply-time** guard
   proving *this* transaction cannot open youtube. The standing protection is structural (no template
   has a youtube row at all); a future lane adding one is its own T3 gate.

## 8. Rollback status

**Available and valid.** `broll-suitability-fb-ig-v1-rollback.sql` deletes exactly the 2 rows,
identity-pinned to the applied state, asserting 0 remain and that fb/ig return to the incumbent. Proven
live before the apply. One `execute_sql` call.

## 9. Non-claims

- ❌ Not claimed: that fb/ig B-roll renders. **Nothing calls that path** (§5).
- ❌ Not claimed: that Surface C was measured at an fb/ig signature. It was **not** — PK accepted a
  code-level inference (§4).
- ❌ Not claimed: that the template is platform-proven. Status is `candidate`; the selector emits
  `platform_suitability_unproven` on every fb/ig call.
- ❌ Not claimed: that the B-roll pool improved. **Still 1 eligible clip, still below the ratified
  floor of 4.** Nothing sourced, nothing promoted.
- ❌ Not claimed: that youtube or linkedin are addressed (§6).

## 10. Stop condition

**Met.** Applied, verified, recorded, committed, pushed. Normal production volume still does **not**
resume — that gate remains the 4-clip eligible floor, owned by Asset Sufficiency.
