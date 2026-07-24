# cc-0049 — Geometry / Visual-Proof Packet v1 (T3 gate packet)

**Status:** `DRAFT — awaiting PK gate. Authorises nothing on its own. NOTHING INVOKED.`
**Lane:** cc-0049 (continued) · SAFETY_GATE · read-only session
**Prepared:** 2026-07-24 · worker session S2 (Image Proof)
**Entry state verified against:** `origin/main f1312a3` · image-worker fn version **101** / v3.33.0
**Predecessor record:** `docs/briefs/results/cc-0049-invegent-quote-card-winner-mapping.md` §5

---

## 1. Status line — Property Pulse no-regression (§5a)

🔴 **STILL PENDING as at 2026-07-24.** Re-ran the §5a query against `ice_ro.render_status`.
Post-deploy (`> 2026-07-23T04:38:06Z`) `image_quote` renders, **complete set, 4 rows**:

| client_id | client | render | created_at |
|---|---|---|---|
| `3eca32aa…` | care-for-welfare-pty-ltd | `a17872dc…` | 2026-07-23T15:30:25Z |
| `fb98a472…` | ndis-yarns | `bb4be175…` | 2026-07-23T15:30:16Z |
| `93494a09…` | invegent | `bc8e97ce…` | 2026-07-23T06:30:10Z |
| `93494a09…` | invegent | `654b7a6d…` | 2026-07-23T05:15:17Z |

**No property-pulse (`4036a6b5…`) row exists.** Unchanged from the §5a snapshot — no new PP
`image_quote` render has occurred in the ~24h since. Awaiting a natural slot fill; **not
manufacturable, no attempt made.**

---

## 2. 🛑 BLOCKER — the prepared instrument does NOT discharge the geometry obligation

The predecessor record §5c and the S2 seed both name `governed_image_quote_smoke` as "the narrowest
instrument that discharges the geometry obligation." **Source inspection shows it cannot.**

`supabase/functions/image-worker/index.ts:815-884` — the smoke is **hardcoded to Property Pulse and
asserts the market-insight template**:

| Line | Fact |
|---|---|
| `index.ts:833` | selector called with `p_client_slug: B1_GOVERNED_CLIENT_SLUG` |
| `b1_production.ts:33` | `B1_GOVERNED_CLIENT_SLUG = 'property-pulse'` (constant, **not** body-supplied) |
| `index.ts:838` | fields built with `client_id: B1_GOVERNED_CLIENT_ID` = `4036a6b5…` (property-pulse) |
| `index.ts:843` | `assertExpectedProviderTemplate(plan.providerTemplateId, EXPECTED_SMOKE_PROVIDER_TEMPLATE_ID)` |
| `index.ts:478` | `EXPECTED_SMOKE_PROVIDER_TEMPLATE_ID = '48cba556-0a53-4001-90f0-05420d10efc0'` |
| `b1_production.ts:131` | throw text names that id as `generic_market_insight_card_1x1_v1` |

The request body supplies only `headline` / `subtitle` / `platform` / `seed`. **Client and template
are not parameterisable.** Live assignment state confirms the divergence:

| client | provider template | name | assignment_status |
|---|---|---|---|
| property-pulse | `48cba556…` | `generic_market_insight_card_1x1_v1` | **production_proven** |
| property-pulse | `2140ca19…` | `generic_quote_card_1x1_v1` | visually_approved |
| **invegent** | **`2140ca19…`** | **`generic_quote_card_1x1_v1`** | visually_approved (sole assignment) |

**Consequence:** invoking the smoke as shipped renders **Property Pulse's market-insight card** —
the geometry that is already proven and that cc-0049 explicitly states is **non-portable** to the
quote card. It yields **zero** information about the Invegent quote-card layout. The option-B assert
would *pass*, producing a green result that proves the wrong thing — a false-proof hazard.

The four other non-production modes (`tmr_template_smoke`, `template_smoke`,
`creative_library_manual_render`, `creative_library_draft_proof`, `index.ts:769-799`) are all
**410-retired**. **There is no shipped non-publishing entrypoint that can render the Invegent quote
card.**

---

## 3. ⏰ Time-boxed risk PK must rule on

The two Invegent quote-card renders are attached to real drafts, and one is **queued to publish**:

| draft | render | image_status | publish queue |
|---|---|---|---|
| `26aaa129-9ebb-4fce-a1a7-509be62ca468` | `654b7a6d…` | generated | **`queued` · scheduled 2026-07-31T22:06:00Z · facebook** |
| `e7867c8c-a687-4cbe-8e64-5b9fe58d8541` | `bc8e97ce…` | generated | `skipped` |

**A quote card with no PK geometry acceptance is scheduled to publish to Facebook in ~7 days.**
Recorded as a fact, not a recommendation — deferral is a PK decision, and per the standing gotcha a
queue-only defer is not durable (`trg_release_queue_on_asset_ready` recomputes `scheduled_for`; the
draft must be deferred too, drafts before the queue row).

---

## 4. Route options

### 🟢 Option B — RECOMMENDED: PK visual review of the existing production renders (**zero mutation, no gate**)

The two Invegent renders **are** the "first controlled production render" the `e232607` commit named
as the mandatory geometry gate. They already exist, on the correct template, via the governed path:

- `render_spec.template.provider_template_id` = `2140ca19-d075-49d3-9dc9-30d924805e22` ✅
- `render_spec.tmr.winner` = `generic_quote_card_1x1_v1` ✅
- `render_spec.label` = `creative_library_b1_production` (production path, not smoke) ✅

Artefacts (public bucket, already rendered — **opening them mutates nothing**):

```
https://mbkmaxqhsohbtwsqolns.supabase.co/storage/v1/object/public/post-images/invegent/26aaa129-9ebb-4fce-a1a7-509be62ca468.jpg
https://mbkmaxqhsohbtwsqolns.supabase.co/storage/v1/object/public/post-images/invegent/e7867c8c-a687-4cbe-8e64-5b9fe58d8541.jpg
```

**Why this dominates a smoke:** it reviews the actual production output on the actual template with
the actual governed background/logo/scrim and the actual brand fields — strictly more faithful than a
synthetic proof, at zero risk and zero cost. **No T3 gate is required to look at an existing image.**
PK's verdict on these two images *is* the geometry acceptance §5b is missing.

**What PK is ruling on:** does `QuoteText` / `Attribution` / `SourceLabel` / `Footer` fit, anchor and
render without overflow, overprint or clipping — i.e. is the *unmapped* market-insight geometry
assumption safe on the quote card. Provider `succeeded` is not evidence either way.

### 🟠 Option A — parameterise the smoke (only if PK wants a repeatable instrument)

A T2 code change to accept `client_slug` + an explicit `expected_provider_template_id` in the body
(keeping the assert fail-closed and the non-publishing guarantees), then a T3 deploy, then a T3
invocation. **Cost: a full image-worker deploy to obtain evidence Option B already has.** Recommend
only if PK wants a standing per-brand geometry instrument, and then as its own governed task from
the reserved range (cc-0058–cc-0062) — **not** folded into cc-0049.

### 🔴 Option C — invoke the smoke as shipped

**Do not.** §2: it renders PP market-insight, proves nothing about the quote card, and returns a
green result that could be mis-recorded as a quote-card PASS.

---

## 5. T3 packet — Option A invocation (PREPARED, NOT AUTHORISED, NOT INVOKED)

Recorded for completeness so PK has the full shape. **Blocked behind §2 — it is written against the
as-shipped entrypoint and therefore currently proves the wrong thing.** Do not execute.

- **Instrument:** `POST https://mbkmaxqhsohbtwsqolns.supabase.co/functions/v1/image-worker`
- **Auth:** header `x-image-worker-key: <secret>` — **never in a transcript**; conveyed by PK at the
  gate. `verify_jwt=false` confirmed live, so no bearer token is required (and adding one is not a
  substitute).
- **Body (as-shipped surface):** `{"mode":"governed_image_quote_smoke","fields":{"headline":"…","subtitle":"…"},"platform":null,"seed":"…"}`
- **Preconditions:** image-worker fn version 101 / v3.33.0 · drift A-LE clean 3.33.0==3.33.0 ·
  `verify_jwt=false` — **all verified 2026-07-24, unchanged.**
- **Blast radius (verified by source read, `index.ts:801-884`):** no `m.post_draft` read/insert/update ·
  no `image_url`/`image_status` write · no publish/enqueue/slot fill · does not read or flip
  `c.client_creative_governance.enabled` · writes exactly one object to
  `post-images/_smoke/governed_image_quote_v1.jpg` (**overwrites the prior smoke artefact**) and one
  `m.post_render_log` row with `post_draft_id=NULL`, `client_id=NULL`,
  `label='creative_library_b1_smoke'` (excluded from `stamp_tmr_shadow_forward` on both the null
  draft-id and the divergent label). Consumes Creatomate credits.
- **Rollback posture:** none required — no reversible production state is changed. The `_smoke/`
  object is overwritten on next use; the log row is inert.
- **STOP conditions (any one voids the sequence):** fn version ≠ 101 or VERSION ≠ 3.33.0 at
  invocation · drift no longer A-LE clean · `verify_jwt` ≠ false · non-200 response · response
  `provider_template_id` ≠ the expected id · `assertExpectedProviderTemplate` throw ·
  `tmr_winner_brand_fields_missing` · any governed-asset reachability failure · **any evidence the
  rendered card is not the Invegent quote card.**
- **Expected evidence:** `{ok:true, mode:'governed_image_quote_smoke', provider_template_id, render_spec_label:'creative_library_b1_smoke', storage_url, version}` + the `_smoke/` artefact for PK visual review.

---

## 6. Carry F-A — RESOLVED to a finding (was "verify before assuming")

**ai-worker's vendored `creative_contract.ts` is TWO governed changes behind in production.**

- ai-worker deployed: **version 122, 2026-07-18T11:35:02Z**.
- `supabase/functions/ai-worker/creative_contract.ts` was changed by `5a6c998` (cc-0048, CFW entry)
  and again by `e232607` (cc-0049, Invegent `attribution` / `source_label`) — **both after that deploy.**
- **The drift gate reports it clean and always will:** `ice_ro.deploy_drift_status` shows ai-worker
  `A-LE / clean / 2.20.0 == 2.20.0`, because the gate hashes **only `index.ts`** and neither commit
  bumped ai-worker's VERSION. This is the known helper-only blind spot, live and load-bearing here.
- Repo copies are in parity (only the file's header comment differs — `creative_contract_parity_test.ts`
  compares behaviour, not bytes). **The divergence is repo-vs-deployed, not copy-vs-copy.**

**Severity — bounded, not an outage.** ai-worker's only use is additive metadata stamping
(`index.ts:1020`, `:1129` — `if (creativeContract) draftMeta.contract = buildContractStamp(...)`), and
the call is null-guarded. Effect: **Invegent and CFW drafts are being written with no
`draft_format.contract` stamp.** No render path, format selection or prompt is affected. Not the
cause of any current failure.

**Recommended disposition:** fold the deploy into the next ai-worker change rather than deploying for
metadata alone; if PK wants it now it needs a paired cosmetic `index.ts` VERSION bump (A-LE blocks
`safe-deploy.sh` otherwise). Either way it is a **new governed task from cc-0058–cc-0062**, not a
silent absorption into cc-0049.

## 7. Carry F-C — unchanged, not opened

`RENDER_ATTEMPT_CAP=5` remains unreachable for continuously-retried drafts (`pipeline-fixer` FIX 2
filters `updated_at < now()-120min`, which every failed render refreshes). Not touched this session.
Opening it = a new governed task from the reserved range.

---

## 8. Non-claims

- **No PK visual PASS is claimed for the Invegent quote card.** None exists.
- The two `succeeded` Invegent rows are recorded as **provider render outcomes only**.
- Nothing was invoked, deployed, applied, published, mutated or manufactured this session. All
  reads were SELECT-only via `ice_ro` views, read-only `execute_sql`, and `get_edge_function` /
  `list_edge_functions` metadata.
- The §5 packet is **prepared, not authorised**, and is superseded in practice by §4 Option B.
