# Result cc-0049 — Invegent Governed Quote-Card Winner Mapping Recovery

**Status:** `DEPLOYED · INVEGENT RECOVERED · NO-REGRESSION PROOF PARTIAL · GEOMETRY/VISUAL ACCEPTANCE NOT SUPPLIED`
**Lane classification (CCF-02):** SAFETY_GATE / production incident · T2 build · T3 deploy · T3 containment DML
**Recorded:** 2026-07-24 (retrospective — governance recovery lane)
**Brief:** `docs/briefs/cc-0049-invegent-quote-card-winner-mapping-brief.md` (rev-2)
**Sequence packet:** `docs/briefs/cc-0049-revised-containment-deploy-sequence-packet-v1.md` (v1)
**Canonical ID:** `cc-0049` RETAINED — no competing claim on any `origin/*` ref.

> ⚠ **RETROSPECTIVE record.** Built, gated and deployed 2026-07-22/23; result doc and register
> pointer never written at the time. Reconstructed from git, the live Edge Function bundle, and
> live DB only. **§5 is the load-bearing section: this lane is NOT proven.**

---

## 1. What was wrong

cc-0048 repaired the creative-contract guard and, in doing so, **exposed a second independent
defect it had been masking**. Invegent `image_quote` renders then failed with
`tmr_winner_unmapped: generic_quote_card_1x1_v1`.

`TMR_WINNER_TEXT_FIELDS` in `supabase/functions/image-worker/b1_production.ts` mapped only certain
governed winners — including `generic_market_insight_card_1x1_v1` (why CFW recovered under cc-0048)
but **not** the quote card, which is Invegent's governed winner. `buildTmrRenderPlan` threw
fail-closed rather than guess a layout.

## 2. What shipped

**Commit `e232607`** — `fix(cc-0049): map the Invegent governed quote-card winner — clears
tmr_winner_unmapped (image-worker v3.33.0)`, authored 2026-07-23T03:28:29Z, on `origin/main`.
Build branch `cc-0049-invegent-quote-card-winner-mapping` (`e522e54`, base `5a6c998`), worktree
`C:\Users\parve\AppData\Local\Temp\claude\cc0048-build-wt`, integrated to main as `e232607`.
Reviewed tracked-diff sha256
`2292d07e5c5bcbb3e49dd30fe2993f532ab33d7e60d0b71b5b269c2321496ccb`.

**The element mapping came from a governed source, not a guess.** Element names/types/dynamic flags
were taken from the authoritative governed capture `c.creative_provider_template_field` for provider
template `2140ca19-d075-49d3-9dc9-30d924805e22` (populated from live Creatomate) — explicitly **not**
inferred from a label, screenshot, prior render payload, or the market-insight mapping.
PK-confirmed mapping: `QuoteText.text ← headline` · `Attribution.text ← attribution` ·
`SourceLabel.text ← source_label` · `Footer.text ← footer`. `QuoteMark` and `Scrim` are
`dynamic=false` and deliberately unmapped; `Background` / `Logo` / `Scrim.opacity` stay authoritative
from `slot_resolution`.

**Brand-leak defect caught at design time (STOP #3).** `Attribution` and `SourceLabel` are
**per-client brand values** and were placed in the client's creative contract, **never** in the
template-keyed winner map — the winner map carries no client context, and property-pulse holds a
`visually_approved` assignment on the *same template*, so a literal there would have leaked one
brand's attribution onto another's card. A new fail-closed guard `tmr_winner_brand_fields_missing`
covers the case.

**Blast radius held to zero for existing clients:** `B1Fields` + `buildProofFieldsFromDraft` gained
*optional* `attribution` / `source_label`, emitted only when the contract declares them, so
PP/NDIS/CFW output stays byte-identical at 6 keys.

**No layout guard added** — the market-insight geometry is explicitly non-portable. Per PK, *the
first controlled production render is the mandatory geometry/visual-proof gate.* **See §5: that gate
has not been recorded as passed.**

**Deployment:** image-worker Supabase function version **101**, updated **2026-07-23T04:38:06Z**.
Base `5a6c998` was proven to contain the exact deployed cc-0048 v3.32.0 source before building on it.

## 3. Deploy content verification (this recovery lane, 2026-07-24, read-only)

The **deployed** bundle was re-read live and grepped for change-specific markers — the
bundles-from-CWD "old code shipped" guard. Source read: `get_edge_function(image-worker)`,
function version 101, `verify_jwt=false`.

| Check | Marker | Result |
|---|---|---|
| VERSION in deployed bundle | `image-worker-v3.33.0` | **PRESENT** |
| cc-0049 winner constant | `INVEGENT_IMAGE_QUOTE_QUOTE_CARD_V1` | **PRESENT** |
| cc-0048 payload carried forward | `CFW_IMAGE_QUOTE_NEWS_CARD_V1` | **PRESENT** |
| governed winner key | `generic_quote_card_1x1_v1` | **PRESENT** |
| new fail-closed guard | `tmr_winner_brand_fields_missing` | **PRESENT** |
| mapped elements | `QuoteText` / `Attribution` / `SourceLabel` | **PRESENT** |
| stale prior version | `image-worker-v3.32.0` | **ABSENT** ✅ |
| `verify_jwt` | expected `false` | **`false`** ✅ |

Live drift (`ice_ro.deploy_drift_status`, 2026-07-23T17:00:06Z): class **A-LE**, direction
**clean**, `deploy_version = repo_version = 3.33.0`, `state_changed = false`.

**deploy_content verdict: PASS.** (Recomputed from ground truth, not from the plan's claimed values.)

## 4. Recovery evidence — Invegent

Live `m.post_render_log`, `ice_format_key='image_quote'`, read 2026-07-24:

- Last Invegent **failure**: 2026-07-23T03:30:14Z — *before* the 04:38:06Z deploy.
- First Invegent **success**: 2026-07-23T05:15:17Z, Creatomate render `654b7a6d-…`.
- Second: 2026-07-23T06:30:10Z, Creatomate render `bc8e97ce-…`.

`tmr_winner_unmapped` no longer appears. **Invegent = RECOVERED** (render-success sense only — see §5).

**Containment DML observed:** `m.post_publish_queue` holds **4 `purged` Invegent rows**, last updated
2026-07-23T06:19:19Z, consistent with the publish-containment step in the sequence packet. Recorded
as **observed**; its authorization artifact is **UNRECONSTRUCTABLE** (§6.2).

## 5. ⚠ Proof matrix — render success is NOT geometry acceptance

The no-regression obligation is **explicitly not discharged** by Invegent and CFW recovering. Two
distinct obligations are tracked separately, and neither is complete.

### 5a. Post-v3.33.0 render evidence (deploy boundary = 2026-07-23T04:38:06Z)

| Client | Post-deploy `image_quote` render | Verdict |
|---|---|---|
| invegent | 2026-07-23T05:15:17Z `654b7a6d-…` · 06:30:10Z `bc8e97ce-…` | **RENDER-PROVEN** |
| ndis-yarns | 2026-07-23T15:30:16Z `bb4be175-…` | **RENDER-PROVEN** |
| care-for-welfare-pty-ltd | 2026-07-23T15:30:25Z `a17872dc-…` | **RENDER-PROVEN** |
| **property-pulse** | **NONE** — last render 2026-07-23T02:15:16Z, *pre-deploy* | 🔴 **PENDING** |

**The single outstanding render obligation is Property Pulse.** All PP `image_quote` drafts
currently carry `image_status='generated'` (rendered pre-deploy), so no PP render is queued; the
evidence must arrive from the next natural slot fill. It **cannot be manufactured** and no attempt
was made to do so.

### 5b. Geometry / visual acceptance

🔴 **NOT SUPPLIED.** The commit itself states the first controlled production render is the mandatory
geometry/visual-proof gate, because the market-insight geometry is non-portable to the quote card.
Two Invegent renders returned `succeeded` — **that is the provider reporting a completed render, and
says nothing about whether the quote-card layout is correct.** Text could overflow, overprint, or
mis-anchor and still return `succeeded`.

**No PK visual PASS exists for the Invegent quote card. This document does not claim one.** The
`succeeded` rows in §4 are recorded as render outcomes only.

### 5c. Narrowest governed proof action to discharge the remainder

Prepared, **not executed** — it requires a controlled production event and therefore stops at its gate.

1. **PP no-regression (zero mutation):** re-run the §5a query after PP's next natural render and
   confirm a post-04:38:06Z `succeeded` row with byte-identical 6-key output. **Blocked on a natural
   event only** — no gate needed, no mutation, just elapsed time.
2. **Invegent geometry proof (MUTATION — STOPS HERE):** the existing non-publishing supervised
   entrypoint `governed_image_quote_smoke` (image-worker, shipped v3.25.0) renders a governed proof
   to `_smoke/` with no draft update and no publish. Invoking it is a **controlled production event**
   requiring an `x-series-key` and a T3 PK gate.
   **🛑 NOT INVOKED. This lane stops at that gate**, per the standing instruction not to deploy,
   apply, publish, manufacture operator events, or mutate production.

## 6. Governance gaps — NOT reconstructable

1. **No PK gate-2 artifact for the deploy.** Recorded **DEPLOYED**, never **PK-ACCEPTED**.
2. **The containment DML has no authorization artifact.** 4 Invegent queue rows moved to `purged` at
   2026-07-23T06:19:19Z. The action is evidenced; the approval is not. The sequence packet that
   designed it is explicitly marked *"DRAFT — awaiting PK gate. Authorises nothing on its own."*
   **This is the most serious individual gap in the lane** — a T3 production DML whose gate cannot be
   evidenced.
3. **No external-review id recorded** for the final `e232607` diff. The brief's rev-2 STOP #3 was
   raised *after* the earlier review, so any prior approval is stale by
   `CLAUDE.md` §External review rule 1/4. Whether a fresh review was run is unknown.
4. **Result doc and register pointer never written** until this retrospective.

## 7. Status vocabulary applied

`PLANNED` no · `DEPLOYED` **yes** (image-worker v3.33.0, fn version 101, content-verified §3) ·
`ROLLED_BACK` no · `RECOVERED` **yes, Invegent** (render-success sense) ·
`PROVEN` **NO** — PP render evidence pending §5a, geometry/visual acceptance not supplied §5b ·
`PK-ACCEPTED` **no artifact found**.
