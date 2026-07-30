# Asset Graduation Contract v1 — sourced candidate → production eligibility

> **Status:** ✅ `GATE 1 APPROVED by PK 2026-07-30 — all five open decisions RATIFIED (§13).`
> Slice 1 build authorised and **BUILT** (see
> `docs/briefs/asset-graduation-backgrounds-slice1-build-packet-v1.md`).
> The contract itself still **authorises no asset movement**: it defines the rules, and every
> instantiation stops at its own PK gate. **Type:** reusable governance contract
> (the graduation half of the asset lifecycle; the intake half is
> `docs/briefs/asset-governed-intake-framework-v1.md`).
> **Lane classification (CCF-02):** SAFETY_GATE. **Tier:** the contract itself is T1 (docs);
> every instantiation it governs is **T2 (fenced intake) / T3 (graduation)**.
> **Base:** CE `main`, HEAD `4e7dfa6`, parity ahead 0 / behind 0. Working tree dirty (181 untracked
> paths — pre-existing, unrelated). No DB mutation performed by this lane.
> **Evidence:** repo reads + previously-recorded live pulls, all cited inline. Where a number is
> asserted from a prior doc rather than re-measured this session, it is marked **[asserted]**.

---

## 0 · The one design principle — the graduation ratchet

Everything below is an elaboration of a single rule:

> **Automation may move an asset only in the fail-closed direction. Every fail-open move requires PK.**

Fencing, demoting, retiring, rejecting, blocking — automatable, because none of them can add
production exposure. Un-fencing, promoting, widening scope, relaxing a fence — never automatable,
because each one puts new pixels in front of a client's audience.

This is why the contract can remove *permanent manual handling* without relaxing a single ratified
non-negotiable. The manual handling that disappears is the **mechanical evidence assembly** — dozens
of checks a human currently re-derives per asset. The manual act that remains is the **judgment**:
PK looks at the pixels and says yes. That act is not overhead; it is the product.

**Inherited unchanged** (CLAUDE.md §Image workflow acceleration §2, and
`docs/briefs/asset-governed-intake-framework-v1.md:65-71`): PK visual verdict is the only deciding
act · text-safety crop proof before any accept · licence safety + sha256 provenance · pool-neutrality
machine-assertion on every intake · full T3 chain + live proof + rollback-proven on every production
rotation change · fenced-until-approved default · CAS / fail-closed. **This contract subtracts none
of them.**

---

## 1 · Scope — what "routine asset" means here

| Class | Table | Governs | In this contract |
|---|---|---|---|
| **Static background image (per-client)** | `c.client_brand_asset` | `Background` slot for static formats | ✅ **routine — the v1 build class** |
| **Static background image (shared pool)** | `c.shared_creative_asset` | cross-client `Background` | ✅ routine |
| **B-roll video clip** | `c.client_brand_asset` (`broll_*`) | `Background.source` for governed video | ✅ routine (adds duration + native-dimension checks) |
| Logo / brand mark | `c.client_brand_asset` (`logo_*`) | brand identity | ⛔ out — identity, not routine; and production reads `client_brand_profile.brand_logo_url`, not the resolver |
| Music / audio bed | `c.shared_creative_asset` (post-music) | `MusicBed` | ⛔ out — Music Library v0 is still dark |
| Avatar / voice | HeyGen surfaces | persona | ⛔ out — not a governed asset row |
| NDIS Phase 2 / Phase 3 imagery | any | — | ⛔ **hard-blocked** — Phase 2 CLOSED, Phase 3 HELD (CLAUDE.md §NDIS sensitive real-imagery intake) |

**"Routine" test (all four must hold):** the asset class (a) resolves through a governed selector
rather than a hardcode; (b) has a machine-readable eligibility predicate; (c) is interchangeable
within a rotation pool rather than uniquely identifying; (d) carries no person, cultural, or
participant content. Fail any one → not routine → no automated path, full manual lane.

---

## 2 · The asset proof ladder — nine states

Modelled on the template ladder in
`docs/briefs/results/creatomate-registry-integrity-graduation-contract-v1.md:113-123`, but for
assets. As there, the ladder is a **judgment framework over existing columns plus fact tables** — it
is not a schema change, and several rungs have no status literal (§13 O-1).

| # | State | Meaning | Evidence required | Dimensionality |
|---|---|---|---|---|
| 1 | **sourced** | Bytes exist in a harvest package; no DB row, no storage object. | `_harness/image_harvester_v0/<batch>/` manifest entry with source URL, licence, **sha256 of the actual downloaded bytes**. | asset-specific only |
| 2 | **intake_candidate** | A **fenced** DB row exists. Inert by construction. | Row present with every fence closed: shared → `approval_status='intake_candidate'`, `is_active=false`, `production_use_allowed=false`, `brand_neutral/participant_neutral/licence_allows_multi_entity_use=false`, `sensitivity_class` classified (never `'unknown'`); per-client → **explicit `is_active=false`** (its default is OPEN — `asset-governed-intake-framework-v1.md:47`) + `asset_meta.approved=false`. Pool-neutrality assertion passed at insert. | asset-specific |
| 3 | **machine_validated** | Every mechanical check in §3 passes. **No human has looked at it yet.** | The §3 check vector, all `pass`, recorded with the evaluator version + input digest. | asset × target client × format × platform |
| 4 | **human_reviewed** | `image-reviewer` suggestive verdict + the authoritative **crop proof** at the target aspect. | Reviewer verdict (P0 vocabulary) + crop-proof artifact reference. **Suggestive only** — decides nothing (CLAUDE.md team table). | asset × format |
| 5 | **pk_visually_approved** | PK looked at the actual pixels, at the target crop, and approved them for this client. | A recorded PK verdict with a concrete evidence reference (contact sheet / crop proof id) — **not a bare claim**. | **client-specific** + format-specific. Never transferable between clients. |
| 6 | **graduated** | Fences flipped; the asset is production-eligible. | `is_active=true` · `approved=true` · `production_use_allowed=true` · `approval_status='governed'` · `approved_by='PK'` · `approved_at` · `promotion_lane` — the exact end-state applied at `broll-promotion-batch1-result.md:18-20`. Plus **§8 declared == resolver-reachable, proven post-apply**. | client × format × platform |
| 7 | **rotation_proven** | The asset is demonstrably selected by the live resolver, not merely eligible. | A live seed sweep in which this asset is returned at least once (`broll-promotion-batch1-result.md:12` — 10/10/10/10 over 40 seeds), **and** ideally ≥1 natural production render. | client × format × platform |
| 8 | **fenced_back** | Reversed to inert without deletion. | Fences re-closed, CAS-pinned, pool count re-asserted. **This is the standing rollback for state 6** and is always available. | asset |
| 9 | **retired** | Must never be selectable again: licence withdrawn/expired, source deleted, superseded, or a rights complaint. | Licence-source evidence or an explicit PK supersede naming the successor. Propagates to **every** row referencing the asset. | asset — propagates everywhere |

**No rung is skippable by having a later one.** A successful render (7) does not retroactively supply
a PK visual approval (5) that was never given — the same non-skip rule as the template ladder
(`creatomate-registry-integrity-graduation-contract-v1.md:381-383`).

---

## 3 · Machine-validation requirements

The check vector. Every check is **deterministic, re-runnable, and fails closed** — an
unknown/unreadable input is a FAIL, never a pass. Each emits a §11 reason code on failure.

| # | Check | Passes when | Fails closed because |
|---|---|---|---|
| C1 | **Byte identity** | `sha256(local bytes) == sha256(fetched public URL bytes) == asset_meta.sha256` | a URL can be re-pointed after intake |
| C2 | **Object reachability** | the `asset_url` resolves, HTTP 200, correct content-type, in bucket `brand-assets` | resolver requires `asset_meta.bucket='brand-assets'` (`cc-0073-backgrounds-only-asset-gap-drain.md:44`) |
| C3 | **Rights** | §4 in full | see §4 |
| C4 | **Dimensions / aspect / duration** | §5 in full | see §5 |
| C5 | **Geography classification** | `geo_scope` is a known `c.geo_class` key; never absent, never inferred from a filename | v1.5 rejects unknown geo as `geo_unclassified` rather than treating it as generic (`broll-rotation-governance-v1-result.md:90-92`) |
| C6 | **Content-theme compatibility** | §6 | see §6 |
| C7 | **Template-slot compatibility** | §7 | see §7 |
| C8 | **Text-safety vocabulary** | `safe_for_text_overlay ∈ {'true','needs_scrim'}` — **the resolver's literal accepted set** (`supabase/migrations/20260703002813_create_resolve_slot_assets_v1.sql:207`) | ⚠ **the false-6 failure.** `'needs_gradient_scrim'` is outside the set, so the resolver fails the asset closed while the pool *count* still reports it (`broll-promotion-batch1-result.md:11.2`) |
| C9 | **Exact-duplicate detection** | no existing row shares the sha256 | prevents a paid-for pool of one image |
| C10 | **Previously-rejected detection** | composite key **(provider + provider_asset_id/source_url + sha256)** absent from the rejected-fingerprint store — the Gate-1-locked key, not sha256 alone (`automated-image-intake-v1.md:10`) | the same provider image re-offered at a different size/filename |
| C11 | **Near-duplicate** | perceptual distance above threshold vs the live pool and within the batch | **DEFERRED to v2** by the same Gate-1 ruling — v1 records the check as `not_run`, never as `pass` |
| C12 | **Declared == resolver-reachable** | §8 | see §8 |
| C13 | **Pool neutrality** | every *other* client's eligible set is byte-identical pre/post | the in-txn fail-closed assertion, never waived (§2 non-negotiable 4) |
| C14 | **Fence integrity** | at state 2, every fence column reads closed on readback | `client_brand_asset.is_active` defaults **open** |

**Evaluator contract.** The check vector is recorded as a single JSON object stamped with the
evaluator version and a digest of its inputs. A check may return `pass` / `fail` / `not_run`.
**`not_run` is never counted as `pass`** and any `not_run` on a graduation-blocking check
(C1–C10, C12–C14) forces the batch to PK with the gap named.

---

## 4 · Rights and provenance requirements

1. **Allow-listed source only** — Unsplash standard · Pexels · Wikimedia CC0/public-domain
   (`.claude/agents/image-harvester.md:57-67` **[asserted]**, via `automated-image-intake-v1.md:38`).
   Anything else → `licence_unsafe`, no exceptions at the machine layer.
2. **Hold-list, never offered without a per-asset PK exception:** CC BY-SA · CC BY · AI-generated ·
   paid-stock · commissioned.
3. **Recorded per asset:** source URL · licence name **and** licence URL · author/attribution ·
   provider asset id · `harvested_at` · sha256 of bytes · the harvest package path.
4. **Commercial + social use must be affirmatively covered.** Absent or ambiguous → `licence_ambiguous`
   → FAIL. Silence is not permission.
5. **Multi-entity use** — a shared-pool asset additionally requires documented rights covering use by
   *more than one* commercial entity (`licence_allows_multi_entity_use`). Absent → per-client only.
6. **Expiry is live, not one-shot.** The resolver already rejects `license_expired`
   (`…resolve_slot_assets_v1.sql:186`); graduation additionally requires that no licence field is
   within its expiry window at promotion time.
7. **People and sensitive content** — identifiable people prohibited by default; rights must be
   **asset-specific and documented** covering commercial + social + the disability/accessibility
   context, per the evidence-based rights rule (CLAUDE.md §NDIS). A platform licence or a payment is
   **not** sufficient. NDIS Phase 2 CLOSED / Phase 3 HELD; an unfilled specialist role is never
   permission to proceed.
8. **Readable third-party signage or branding in the crop area → REJECT at discovery**, never
   warn-and-offer (Image Workflow P5).

---

## 5 · Dimensions, aspect ratio and duration

> **⚠ The load-bearing fact: production does not check any of this.** The resolver's own header is
> explicit — *"Aspect filtering is intentionally LOOSE in v1 (Creatomate crops) — no aspect
> rejection"* (`…resolve_slot_assets_v1.sql:35`). **Therefore graduation is the only gate where
> dimensional quality can be enforced at all.** A soft, heavily-cropped, upscaled asset is invisible
> in every pool count and every fail-closed reason code. It shows up only in the finished video.

| Rule | Requirement | Reason code on failure |
|---|---|---|
| D1 | Native pixel dimensions ≥ the target render dimensions in **both** axes after the declared crop | `dimension_short` |
| D2 | **Zero upscale.** Required scale factor to reach target ≤ 1.00 | `upscale_required` |
| D3 | Retained crop area ≥ **60 %** of the source frame at the target aspect | `aspect_mismatch` |
| D4 | Native aspect is on the target's accepted list; a class whose whole pool is native (e.g. governed PP video at 1080×1920) admits **native only** — guard G7 (`broll-promotion-batch1-result.md:233`) | `aspect_mismatch` |
| D5 | **Video only** — duration ≥ the format's clip length with headroom; the governed PP spec is 12 s output (`broll-rotation-governance-v1-result.md:339`) | `duration_short` |
| D6 | **Video only** — no audio track expected on a B-roll clip; audio is bound separately | `unexpected_audio` |
| D7 | Compression/artefact sanity: no visible banding or blocking at the target crop | `quality_artefact` |

D3's 60 % threshold is **calibrated from the rejected case, not invented**: `42211c0f` retained
~32 % of frame and needed a ≈1.78× upscale, and was rejected on exactly that ground
(`broll-promotion-batch1-result.md:11.2`). **[asserted — the 60 % line itself is a proposed
threshold, PK decision O-2 in §13.]**

---

## 6 · Geography and content-theme compatibility

**Geography is a declared fact, structurally classified — never inferred.**

- Classification comes from `c.geo_class` (generic / national / state / metro, `generic` its own root
  so it can never absorb a locality claim) and is compared by `public.geo_relation()` containment —
  never by filename, `asset_name`, or `asset_key`
  (`broll-rotation-governance-v1-result.md:29-31`).
- Copy geography is a **declaration** per `(client, format)`, not a measurement. Copy geography does
  not exist anywhere in ICE as data (verified three ways, `broll-rotation-governance-v1-result.md:66-73`).
  Absent declaration = UNKNOWN = fail closed to generic / `geo_national_safe` only.
- **Provider geo tags are unreliable.** Four separate instances this arc of a Pexels tag being wrong
  about location, including a clip tagged Adelaide whose source title says Hurstville
  (`broll-promotion-batch1-result.md:12.1`). **Provider tags are a hint, never evidence.** Geography
  is set from the source title/description or an explicit human call, and the basis is recorded.
- Graduation requires: `geo_scope` set to a **known class**, its **basis recorded**, and containment
  compatible with the client×format copy declaration. Unknown class → `geo_unclassified` → FAIL.
  Different branch → `geo_conflict` → FAIL.

**Content-theme compatibility** is the weaker, honestly-scoped sibling:

- Theme is declared via `subject_tags[]` / `use_case_tags[]` / `tone_tags[]`.
- A machine may check **presence and vocabulary conformance** of those tags, and may flag a
  contradiction against the family's declared theme set.
- A machine may **not** judge whether the image *feels* right for the brand. That is PK's, per §10.
- ⚠ **Standing carry C1:** every B-roll row carries a `label_constraint` documenting its theme rule
  and **no renderer reads it** (`broll-promotion-batch1-result.md:150-152`). Do not score a
  theme control as enforced when nothing consults it — the standing
  "declared control production never reads" trap.

---

## 7 · Template-slot compatibility

An asset graduates **into a slot**, never into the abstract. Required, per target format:

1. **Slot exists and is the right kind.** The resolver models exactly two slots — `Background` and
   `Logo` (`cc-0073-backgrounds-only-asset-gap-drain.md:42-43`). An asset offered for a slot that does
   not exist for that format → `slot_contract_mismatch`.
2. **Element type matches.** Video bytes may bind only where the template's element is a video
   element (the resolver's `v_bg_is_video` gate); still bytes only where it is an image element.
3. **Text-safety class matches the template's need.** A template with text over the background
   requires `safe_for_text_overlay ∈ {'true','needs_scrim'}`; note the resolver **ranks** `'true'`
   above `'needs_scrim'` (`…resolve_slot_assets_v1.sql:82`), so an all-`needs_scrim` pool is legal but
   uniformly second-class — a quality observation to record, not a block.
4. **`platform_scope`** — a **column**, not an `asset_meta` key — must contain each platform the
   asset is being graduated for, or be NULL (`cc-0073-backgrounds-only-asset-gap-drain.md:45`).
   Getting this wrong is silent: the asset simply never appears for that platform.
5. **Shared-pool reachability.** A shared asset is reachable only if the client has a
   `c.client_asset_pool_policy` row with `pool_policy <> 'client_only'`. **Absent row ⇒ `client_only`
   ⇒ the shared pool is structurally unreachable** (`cc-0073-backgrounds-only-asset-gap-drain.md:49-51`).
   Graduating a shared asset for a client with no policy row produces a phantom.
6. **End-to-end selection check.** `resolve_slot_assets` must return `status='ok'` binding this asset
   for at least one real seed — a live RPC call, not a status read. Same discipline as the template
   ladder's rung 10 (`creatomate-registry-integrity-graduation-contract-v1.md:415-419`).

---

## 8 · Declared vs resolver-reachable pool equality

**The single most important machine invariant in this contract.**

```
DECLARED   = count of rows whose fence flags read eligible
REACHABLE  = count of DISTINCT assets the live resolver actually returns across a seed sweep
INVARIANT  : DECLARED == REACHABLE, asserted before AND after every graduation
```

Any inequality is a **hard STOP**, never a warning. The gap is always a lie in the safe-looking
direction: the pool reports depth production cannot reach.

- **Provenance:** this guard exists because it was violated. Promoting `42211c0f` would have produced
  flag-based pool 6 / resolver-reachable 5, the asset failing closed on `text_safety_unknown`
  (`broll-promotion-batch1-result.md:11.2`). Guard **G4** was added at v6.67 and re-run as **G5** at
  v6.69 precisely so it cannot recur silently.
- **Baseline currently holds:** 6 declared == 6 reachable, all six selected across a 40-seed probe
  (`broll-rotation-governance-v1-monitoring-baseline-result-v1.md:31`) **[asserted — not re-measured
  this session]**.
- **Sweep sizing:** the sweep must be large enough that every pool member is *expected* several
  times. Precedents: 24 seeds at pool 4, 50 at pool 5, 90 at pool 6. **Rule: ≥ 15 × pool size.**
- **A zero-reach asset is not graduated.** It is fenced back and the reason recorded. Reaching state 6
  without state 7 is permitted only when the sweep is impossible (e.g. no live client yet) and that
  is stated as a non-claim, exactly as the monitoring baseline did for the natural-render sample
  (`broll-rotation-governance-v1-monitoring-baseline-result-v1.md:91`).

---

## 9 · Automatic-graduation boundaries

Applying §0's ratchet concretely. **This table is the enforceable boundary; §13 O-3 is the only place
PK is asked to consider moving it.**

| Transition | Direction | Automatable? | Gate |
|---|---|---|---|
| 1 → 2 sourced → fenced intake row | neutral (inert row) | ✅ **yes** — Automated Image Intake v1, COMPLETE v6.36 **[asserted]** | T2 apply gate, pool-neutrality asserted |
| 2 → 3 run the §3 check vector | read-only | ✅ **yes** — no write at all | none needed |
| 3 → 4 reviewer + crop proof | read-only | ✅ **yes** — output is suggestive | none needed |
| 4 → 5 PK visual approval | — | ⛔ **NEVER** | **PK — the only deciding act** |
| 5 → 6 flip the fences | **fail-open** | ⛔ **NEVER** | **T3 PK apply gate** |
| 6 → 7 prove rotation reach | read-only | ✅ yes | none needed |
| widen `platform_scope` / `allowed_clients` | **fail-open** | ⛔ never | T3 PK gate |
| relax `safe_for_text_overlay` | **fail-open** | ⛔ never | T3 PK gate |
| 6 → 8 fence back / demote | **fail-closed** | ✅ **yes** (see conditions) | logged; PK notified |
| any → 9 retire on licence loss | **fail-closed** | ✅ **yes** | logged; PK notified |
| reject a candidate at any pre-approval state | fail-closed | ✅ yes | logged |

**Conditions on the only two automatable fail-open-adjacent acts** (auto-demote, auto-retire) — all
four required:

1. It is triggered by a **§3 check that has flipped from pass to fail** on a previously-passing asset
   (licence expired, object unreachable, byte hash changed, declared ≠ reachable).
2. It **only closes fences**; it never deletes a row, never touches storage, never edits any other
   asset.
3. It runs the same §12 guard set as a manual apply, including the pre-image digest pin and the
   rollback.
4. **PK is notified with the reason and the exact reversal command** — automatic does not mean
   invisible.

**Explicitly NOT automatable, ever, regardless of how routine:** anything touching an identifiable
person, cultural content, an NDIS Phase 2/3 subject, a logo, or a client's first asset in a class.

### 9.1 The preserved future path (PK ruling 3, 2026-07-30)

The v1 answer is **no auto-graduation carve-out**, and Slice 1 cannot grant production eligibility.
But "no carve-out in v1" is **not** "manual forever" — embedding that would be its own failure.

A **proven routine asset class** may later receive **PK-authorised auto-graduation**. The bar, stated
now so it cannot be lowered by accretion later:

1. **A sufficiently clean evidence set** — enough real batches evaluated in shadow that the
   evaluator's verdicts have been compared against human assembly and found to agree, with the
   disagreements analysed rather than counted.
2. **Stable checks** — no check definition changed over that window. A moving check has no track
   record.
3. **Rollback proven** — the fence-back reversal exercised for real on that class, not merely
   authored.
4. **An explicit, separate PK ratification** naming the class. It is never inherited by another asset
   class, and never granted by a tool's own clean record.

Until all four hold, §9's table is the boundary. This clause is a **door, not a schedule** — nothing
in it obliges anyone to walk through it.

**What this buys.** The manual surface per batch collapses from *N assets × ~14 checks* to **one
visual verdict over a prepared sheet**, plus one PK apply. That is the elimination of permanent
manual handling PK asked for — achieved by deleting clerical work, not by deleting a gate.

---

## 10 · Cases requiring PK visual review

**Always requires a fresh PK visual verdict:**

1. Any asset reaching state 5 for the **first time for that client** — approval is client-specific and
   never transferable (ladder state 5; the template-ladder non-transferability rule,
   `creatomate-registry-integrity-graduation-contract-v1.md:121`).
2. A **new crop geometry** or a new target aspect for an already-approved asset — different pixels.
3. Any asset the reviewer flagged `PARTIAL_FIT_ONLY`, `PASS_GENERIC_ONLY`, or `REJECT_PROPOSED`.
4. Any **identifiable person**, cultural element, or NDIS-adjacent subject — always candidate-level,
   always human (cultural element → ESCALATE, never PASS).
5. Any **brand-neutral ⇄ client-specific reclassification**.
6. Any asset whose theme sits outside the family's declared tag set.
7. Any **first asset of a new shape** (the P2 mechanical structural-diff gate — any diff → new shape
   → full chain).
8. Any promotion where **declared ≠ reachable** was observed and then "fixed" — the fix itself needs
   eyes.

**Does NOT require a fresh visual verdict** (the same pixels, already approved for this client, at the
same crop) — but still requires the T3 apply gate:

- `platform_scope` widening with identical crop geometry.
- Re-graduation after a fence-back whose cause is resolved, with the §3 vector re-run clean.
- Geography **re-labelling** — this is an *evidence* question (§6), routed to evidence review, not to
  visual review. It still changes selection, so it keeps its T3 apply gate.

---

## 11 · Structured rejection and remediation reasons

Every failure emits **one** code (first failing check wins, mirroring the resolver's own
"FIRST failing filter = the reason_code" convention, `…resolve_slot_assets_v1.sql:154`), plus a
remediation route. **Codes marked ⟳ are the resolver's live literals** — reuse them verbatim rather
than minting a parallel vocabulary.

| Code | Check | Remediation route |
|---|---|---|
| `licence_unsafe` | C3 | discard — never re-offer; write the composite fingerprint |
| `licence_ambiguous` | C3 | PK per-asset exception, or discard |
| `license_expired` ⟳ | C3 | re-source; auto-retire if already graduated |
| `provenance_incomplete` | C3 | re-harvest with full metadata |
| `hash_mismatch` | C1 | **hard stop** — investigate the object, never patch the recorded hash |
| `object_unreachable` | C2 | fix storage; auto-fence if already graduated |
| `output_as_input_risk` ⟳ | C2 | **the resolver's own literal for a wrong bucket** — only `brand-assets` is an acceptable source; never re-ingest a render as a source |
| `legible_signage` | C3/§4.8 | discard — never "fix in crop" |
| `identifiable_person` | C3/§4.7 | discard unless documented asset-specific rights + PK |
| `cultural_flag` | C3 | **ESCALATE to PK** — never auto-anything |
| `sensitivity_escalate` | C3 | PK |
| `dimension_short` | D1 | re-source at higher resolution |
| `upscale_required` | D2 | re-source native, **or** re-encode and re-intake as a **new** asset |
| `aspect_mismatch` | D3/D4 | re-source at native target aspect |
| `duration_short` | D5 | re-source longer footage |
| `unexpected_audio` | D6 | re-encode silent, re-intake as new |
| `quality_artefact` | D7 | re-source |
| `geo_unclassified` ⟳ | C5 | classify from the **source title**, not the provider tag; record the basis |
| `geo_conflict` ⟳ | C5 | correct the label, or exclude for this client×format |
| `theme_mismatch` | C6 | PK judgment |
| `slot_contract_mismatch` | C7 | wrong asset class for this format — re-route |
| `usage_not_resolver_eligible` | C7 | ⚠ **GRADUATION-ONLY — deliberately NOT dressed as a resolver literal** (PK ruling 2026-07-30). The resolver's candidate loop is entered only by `asset_meta->>'usage' IN ('background','logo')` (`…resolve_slot_assets_v1.sql:172`), so a wrong **or missing** value makes the row **silently excluded before any rejection reason is produced** — there is no resolver word to borrow, because the resolver never reports it. Both the wrong and the absent case **fail closed**. Remediation: correct `asset_meta.usage` **through the governed intake path** (a reviewed, guarded, PK-gated apply) — never an ad-hoc in-place metadata edit |
| `shared_pool_unreachable` | C7 | shared asset, no permissive `client_asset_pool_policy` — grant one (T3) or use a client-owned asset. **The phantom class** |
| `ownership_indeterminate` | C7 | resolve the owning table / client binding before any graduation — never guess which reachability rule applies |
| `text_safety_unknown` ⟳ | C8 | ⚠ **do not edit the value in place.** Editing `sfto` fixes the count and ships the underlying defect (`broll-promotion-batch1-result.md:11.2`). Re-assess against the real crop |
| `not_text_safe` ⟳ | C8 | template needs a scrim, or re-source |
| `platform_excluded` ⟳ | C7.4 | `platform_scope` widening — a T3 PK gate, not an edit |
| `duplicate_exact` | C9 | discard, cite the incumbent |
| `near_duplicate_of:<id>` | C11 | **v1: `not_run`** — deferred to v2 |
| `previously_rejected` | C10 | discard — the composite fingerprint already caught it once |
| `declared_not_reachable` | C12/§8 | **hard stop the batch** — never promote past it |
| `pool_neutrality_violation` | C13 | **abort the transaction** |
| `fence_open_on_intake` | C14 | abort — the row was born unfenced |
| `not_approved` ⟳ / `inactive` ⟳ | resolver | expected pre-graduation state, not a defect |

**No padding.** A batch that fails N candidates delivers N fewer, never substitutes. Sufficiency, not
volume (`asset-governed-intake-framework-v1.md:15`). A gap already sufficiently supplied closes as
**no-intake-needed**, a legitimate terminal state.

---

## 12 · Audit and rollback requirements

**The guard set** — every graduation apply carries all of these, in this order. Adapted verbatim from
the proven B-roll promotion applies (`broll-promotion-batch1-result.md:36-46`, `:165-166`, `:233`):

| Guard | Assertion |
|---|---|
| **G0** | Atomicity armed pre-write and re-asserted — one `BEGIN`/`COMMIT` through a **named single-call channel** (composition across a pooled multi-call channel does not hold) |
| **G1** | **Identity pin** — pre-image digest of every target row captured and asserted |
| **G2** | Live baseline pool count == the expected value |
| **G3** | **Exactly N** promoted, each **CAS-pinned** to its fenced pre-state |
| **G4** | Every asset intended to stay fenced **is still fenced** |
| **G5** | **Declared == resolver-reachable** (§8) |
| **G6** | Post-state pool count **exactly** the expected value — not N−1, not N+1 |
| **G7** | Class-specific quality invariant holds across the **whole** pool (e.g. every eligible clip native 1080×1920) |
| **G8** | Template winner / selector output unchanged at the production signature |
| **G9** | **Pool neutrality** — every other client's eligible set byte-identical pre/post |

Each guard is a **fail-closed rowcount or value assertion inside the same `DO` block as its write**
— `GET DIAGNOSTICS` reads only its own block's `ROW_COUNT`, so a bare `IF NOT FOUND` in a separate
top-level statement is a non-guard. That exact defect was caught in shadow mode on a live packet
(`creatomate-registry-integrity-graduation-contract-v1.md:339-345`). **Run `apply-harness-auditor`
on every graduation packet before freeze** — advisory, shadow mode, clears no gate.

**Audit record per graduated asset:** `approved_by` · `approved_at` · `promotion_lane` · the §3 check
vector with evaluator version · the PK verdict reference · the pre-image digest · the batch id · the
artifact hashes of the forward and rollback SQL.

**Rollback requirements:**

1. **Authored and digest-proven BEFORE the forward apply**, never reconstructed afterwards from
   memory. A rollback re-typed by hand once silently dropped comments and would have left a
   permanently dirty diff (`broll-rotation-governance-v1-result.md:163-168`).
2. **Restores the exact captured pre-image**, byte-identical — not an approximation.
3. **Carries the same fail-closed rowcount assertions** as the forward file.
4. **Order is load-bearing** where objects depend on each other; state and prove the order.
5. **Graduation's rollback is cheap and always available**: fence-back (state 8) restores inertness
   without deleting anything. This asymmetry — expensive to graduate, cheap to reverse — is
   deliberate and is what makes the T3 gate affordable to exercise often.
6. **Post-apply verification is mandatory, not optional:** re-read every written value, re-run the
   §8 sweep, re-run the selector at the production signature, and diff against the pre-apply
   baseline. A mismatch is a hard STOP, not a footnote.

---

## 13 · PK decisions — RATIFIED 2026-07-30

All five ratified at Gate 1. The rulings are binding; the recommendations they replaced are kept only
for the audit trail.

| # | Decision | **PK ruling** |
|---|---|---|
| **O-1** | Milestone storage — a new column/table, or a judgment framework over fact evidence? | ✅ **Judgment framework only. NO new database object in Slice 1.** The first build must prove the rules can consistently classify real assets before ICE commits to a permanent storage model. Evaluation output is recorded as an **auditable result artifact** for now. Persistent milestone storage is designed **only after** the shadow evaluator has processed enough real samples to show what fields are actually needed. |
| **O-2** | §5 D3's retained-crop threshold. | ✅ **60 % ratified, provisionally.** Binding interpretation: below 60 % → **fail**; 60 % or above → **may pass the mechanical crop check**; a mechanical pass **does not replace visual review**; excessive upscale, subject loss, text/signage truncation or poor composition can still fail **independently**. **The evaluator must report the ACTUAL retained percentage**, not just pass/fail, so the threshold can later be calibrated from evidence. |
| **O-3** | Any auto-graduation carve-out in v1? | ✅ **No carve-out. Slice 1 remains shadow/advisory and cannot grant production eligibility.** But a **future path is preserved** — see §9.1: a proven routine asset class may later receive PK-authorised auto-graduation after a sufficiently clean evidence set, stable checks and rollback proof. This prevents "manual forever" becoming embedded while keeping the first implementation safe. |
| **O-4** | The R0 view gap. | ✅ **Accept the hash-pinned prompted batch read for Slice 1 only. Do NOT widen general SQL access.** The required follow-on before **any** automated production authority is **Asset Graduation Read Model v1** — exposing only the asset, fence, pool-policy and resolver-reachability fields the contract requires, through a dedicated secret-free read-only view or RPC. **The lack of an R0 asset view does not block the shadow evaluator. It does block future unattended production graduation.** |
| **O-5** | Shared pool in scope from day one? | ✅ **Yes — included from day one.** Client-owned and shared assets have materially different reachability and fence rules; excluding shared assets would let the evaluator pass the simpler path while missing the exact class that produced the phantom-reachability risk. **The evaluator must identify the ownership model explicitly:** `client_owned` · `shared_pooled` · `shared_unreachable` · `ownership indeterminate`. |

---

## 14 · Non-claims and forbidden actions

**Non-claims.** No asset was sourced, harvested, uploaded, inserted, graduated, promoted, demoted, or
retired by this lane. No DB mutation, DDL, migration, deploy, commit, or push occurred. No pool count,
eligibility state, or rotation figure was re-measured live this session — every live number is marked
**[asserted]** and carried from a cited prior record; **all of them are a `db-rls-auditor` handoff
before any instantiation.** This contract authorises nothing, allocates no `cc-` id, claims no
register version, and does not approve itself. Nothing here relaxes any ratified non-negotiable; where
it appears to add discretion (§9, §10) it only names where discretion already sat.

**Forbidden under this contract, permanently:**

- ⛔ No automated un-fencing, promotion, scope widening, or fence relaxation — the §0 ratchet.
- ⛔ No graduation of an asset for a client on another client's approval or on aggregate evidence.
- ⛔ No editing a fence value in place to make a count look right (`text_safety_unknown` remediation).
- ⛔ No promotion while `declared ≠ reachable`.
- ⛔ No NDIS Phase 2 / Phase 3 subject; an unfilled specialist role is never permission to proceed.
- ⛔ No logo, music, avatar, or voice asset — out of scope (§1).
- ⛔ No change to `resolve_slot_assets`, `select_template`, any worker, or any template.
- ⚠ No control that depends on actor identity — `auth.uid()` is NULL under service-role.
- ⚠ No scoring a declared control as enforced unless a production path actually reads it (§6 carry C1).

---

## FREEZE BLOCK

```
artifact  : docs/briefs/asset-graduation-contract-v1.md
lane      : Asset Graduation Contract v1 -- reusable governance contract -- NO cc- ID
type      : contract / Gate-1 artifact -- authorises nothing; instantiated per asset class
pairs with: docs/briefs/asset-governed-intake-framework-v1.md (the intake half)
principle : the graduation ratchet -- automation may move an asset only fail-closed
grounds   : resolve_slot_assets v1 eligibility predicate + literal reason codes (migration
            20260703002813, lines 35/82/154/179-207/240) · B-roll promotion guard sets G0-G9
            (broll-promotion-batch1-result) · declared==reachable false-6 precedent (same, 11.2)
            · geo containment + fail-closed (broll-rotation-governance-v1-result) · nine-state
            template ladder (creatomate-registry-integrity-graduation-contract-v1) · fence
            models + non-negotiables (asset-governed-intake-framework-v1 + CLAUDE.md)
build     : docs/briefs/asset-graduation-backgrounds-slice1-build-packet-v1.md (one asset class)
decided   : O-1..O-5 ALL RATIFIED by PK 2026-07-30 (§13) -- judgment framework only, no DB object ·
            60% crop floor provisional + ACTUAL pct always reported · no auto-graduation carve-out
            but a preserved future path (§9.1) · prompted batch read for Slice 1 + "Asset Graduation
            Read Model v1" required before ANY unattended production authority · shared pool in
            scope day one with explicit 4-way ownership classification
status    : GATE 1 APPROVED -- Slice 1 BUILT (shadow/advisory). NOTHING SOURCED, GRADUATED,
            PROMOTED, OR APPROVED. The contract authorises no asset movement.
base      : CE HEAD == 4e7dfa6 (main, ahead 0 / behind 0)
sha256    : carried out-of-band (a file cannot contain its own hash). Verify:
            python -c "import hashlib;print(hashlib.sha256(open(r'docs/briefs/asset-graduation-contract-v1.md','rb').read()).hexdigest())"
```
