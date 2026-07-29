CLAIMED · broll-rotation-readiness-v1 · main-checkout `C:\Users\parve\Invegent-content-engine` · Gate-1 record · 2026-07-29

# Result — Governed Creatomate Video: B-roll Rotation Readiness v1

**Date:** 2026-07-29 Sydney · **Lane classification:** SAFETY_GATE · **Tier: T1** (read-only inspection
+ governance text; no code, no DDL/DML, no deploy, no sourcing, no promotion).
**Companion artifact:** `docs/briefs/tpr-1-addendum-v1.md` (TPR-1 Addendum v1 — proposed).
**Basis:** live read-only DB inspection + worker source read, 2026-07-29, HEAD `b7568ce`.

> **HEAD moved mid-lane (recorded, not glossed).** A concurrent session landed and pushed **v6.55**
> (cc-0086 Brand Host Voice config) while this inspection was in progress: `b7568ce` → `32a1081` →
> **`773b19f`**, local and origin in parity at `773b19f`. The diff was checked before this lane
> committed: it touches only `docs/00_sync_state.md`, the cc-0086 brief/result/packet, the
> `voice-preview` EF, and a voice-config migration — **no video-worker, no resolver, no template, no
> `client_brand_asset` row**. Every finding below was therefore re-confirmed as unaffected; the
> inspection basis is `b7568ce` and remains valid at `773b19f`.

> **Outcome in one line:** the parity path is sound and the resolver consumes B-roll correctly, but the
> live pool is **one clip**, that clip is **scoped `{youtube}` only**, it is **geographically specific
> while labelled generic**, rotation has **no recent-use avoidance**, and **nothing anywhere surfaces
> the one-clip state as a warning** — the inventory probe reports it as `0 / not probable`.

---

## 1. Ground truth re-verified (live, read-only)

| Fact | Verified value | Method |
|---|---|---|
| HEAD / origin parity | `b7568ce`, ahead 0 / behind 0 | `git`, source-truth-check |
| Live winner for PP `video_short_stat` | provider `46c5c4ac` / registry `dd5fd75e` | `c.creative_provider_template` |
| Worker version applying parity overlay | video-worker **v3.15.0** (`d5ddca1`) | repo read |
| Production output contract | 1080×1920 / 12.00s (render-time overlay) | `b1_video_stat.ts:146`, v6.54 render proof |
| Resolver version | `resolve_slot_assets` **v1.4** (`v_bg_is_video` exclusive-by-element-type) | `pg_get_functiondef` live read |
| Template Background field | `element_name='Background'`, `field_kind='background'`, `element_type='video'`, `dynamic=true` | `c.creative_provider_template_field` |
| `broll_background` rows, all clients | **2 total** | `c.client_brand_asset` |
| **Eligible** B-roll clips at the production signature | **1** (`2d62b04e` `broll_pp_au_suburb_aerial`) | live `resolve_slot_assets` call |

**Production call signature (confirmed in code):** `video-worker/index.ts:1251` calls
`select_template(p_client_slug, p_platform: null, p_format: 'video_short_stat', p_variant_intent: null,
p_seed: draft.post_draft_id)`; `select_template` passes `p_platform` and `p_seed` **verbatim** through
to `resolve_slot_assets` (live function body, line 109). So the resolver runs with **`p_platform = NULL`**
and **`p_seed = post_draft_id`** in production.

### 1.1 The two existing rows

| asset | `is_active` | `approved` | `sfto` | `platform_scope` | `geo_scope` | eligible? |
|---|---|---|---|---|---|---|
| `2d62b04e` `broll_pp_au_suburb_aerial` | `true` | `true` | `needs_scrim` | `{youtube}` | `au_nsw` | ✅ **the only one** |
| `42211c0f` `broll_pp_perth_skyline` | `false` | `false` | `needs_gradient_scrim` | `{youtube}` | `au_wa_perth` | ❌ triple-fenced |

`42211c0f` is blocked three independent ways: `is_active=false` (the reason code the resolver actually
returns), `approved=false`, **and** `sfto='needs_gradient_scrim'`, which is **not in the resolver's
accepted vocabulary** (`'true'` / `'needs_scrim'` only — anything else ⇒ `text_safety_unknown` ⇒ fail
closed). Un-fencing it without correcting `sfto` would produce a silently still-ineligible clip.

---

## 2. Resolver + rotation inspection — the five questions answered

### 2.1 How the seed selects among multiple eligible clips

Ranking then indexing, both in `resolve_slot_assets`:

1. **Candidate order.** Client rows are read `ORDER BY created_at ASC, asset_id ASC`, split into
   `v_bg_true` (`sfto='true'`) and `v_bg_needs` (`sfto='needs_scrim'`), then concatenated
   **`v_bg_true || v_bg_needs`**. So text-safe-true clips always occupy the low indices; needs-scrim
   clips follow. (Under `pool_policy='best_fit'` the same ordering is expressed as an explicit
   `jsonb_agg ... ORDER BY` — same result. PP is not on that policy path for video; see 2.4.)
2. **Index.** With a seed present:
   `hash := 2166136261` (FNV-1a offset basis), then per UTF-8 byte
   `hash := (hash XOR byte) * 16777619 mod 2^32`; finally **`idx := hash mod pool_size`**.
   With `p_seed IS NULL`, **`idx := 0`** — the first, i.e. oldest text-safe-true clip.
3. **Pick.** `v_ranked_bg -> idx` ⇒ `Background.source`, plus a `Scrim.opacity` of **48** for a
   `needs_scrim` clip or **40** for a `true` one (an `asset_meta.scrim_opacity_override` numeric wins,
   clamped 0–100; a non-numeric override is ignored with a `scrim_override_invalid` warning).

**Live proof of the current degenerate state** — five different seeds, all returning the same clip:

| seed | status | picked |
|---|---|---|
| `seed-a` / `seed-b` / `seed-c` / a UUID / `deadbeef` | `ok` (×5) | `broll_pp_au_suburb_aerial` (×5) |

That is correct behaviour for `pool_size = 1` (`hash mod 1 = 0` always) — it is the pool, not the
selector, that is broken.

### 2.2 Recent-use avoidance — **NONE. Confirmed absent.**

`resolve_slot_assets` is declared `STABLE` and reads only `c.client_brand_asset`,
`c.client_asset_pool_policy`, `c.shared_creative_asset`, and the template field rows. It reads **no
render history, no `m.post_render_log`, no last-used timestamp, and holds no state**. Selection is a
pure function of `(client, template, pool contents, seed)`.

**Consequence:** rotation is *memoryless sampling with replacement*, not a rotation.

### 2.3 Can the same clip repeat on consecutive videos — **YES.**

Because the index is `hash(seed) mod N` with no history term, consecutive drafts land on the same clip
whenever their `post_draft_id` hashes are congruent mod N. At a pool of N the chance any given render
repeats its predecessor is ≈ **1/N**, independent of what came before; runs of three or more are
possible and will occur. Expected repeat rates: **N=4 → ~25%**, **N=6 → ~17%**, **N=8 → ~12.5%**.
No pool size removes this — only a history-aware selector would, and that is explicitly **not** in
scope here (it would be a reviewed change to resolver v1.4).

### 2.4 Is platform scope respected — **NOT AT THE PRODUCTION SIGNATURE. This is the sharpest finding.**

The gate is `r.platform_scope IS NOT NULL AND p_platform IS NOT NULL AND p_platform <> ALL(r.platform_scope)`.
Production passes **`p_platform = NULL`**, so the second conjunct is false and **the scope check never
fires**. The resolver does emit a `platform_input_missing` warning, and it is stamped into
`render_spec.template.tmr.slot_warnings` (`b1_video_stat.ts:465`) — but it is a warning, not a gate.

**Live proof — the same call, varying only `p_platform`:**

| `p_platform` | status | result |
|---|---|---|
| `NULL` (**production**) | `ok` | picks `broll_pp_au_suburb_aerial` |
| `facebook` | **`fail_closed`** | `no_governed_background` |
| `instagram` | **`fail_closed`** | `no_governed_background` |
| `linkedin` | **`fail_closed`** | `no_governed_background` |
| `youtube` | `ok` | picks `broll_pp_au_suburb_aerial` |

Two distinct problems fall out of one root cause:

- **Live now:** the only eligible clip is scoped `{youtube}`, yet it is being rendered into governed
  video for **every** platform, because nothing checks. The declared scope is inert.
- **Latent:** the entire B-roll path is **one argument away from total fail-closure**. The moment any
  caller passes an explicit `p_platform` of `facebook`/`instagram`/`linkedin` — a change that would
  otherwise look like a correctness improvement — every PP governed video loses its background and
  fail-closes. This is the ICE "declared control production never reads" failure mode, with a
  fail-closed detonator attached.

**Handoff consequence:** `platform_scope` on new clips is not cosmetic metadata. It is a required,
verified field (§4.2), and correcting the two existing rows is raised as its own gate (§8.3).

### 2.5 Can geographically specific clips be misrepresented as generic — **YES. Already happening.**

`resolve_slot_assets` **never reads any geographic field.** There is no `geo_scope`, `geography`, or
locale term anywhere in the function body. Geography is descriptive metadata only, consulted by no
production path.

The live clip demonstrates the failure concretely, on **two** surfaces at once:

- the **template** is named `AU_generic_national_Suburb_9:16_V1` — declares *generic national*;
- the **clip** carries `geo_scope = 'au_nsw'` and (per the ratified intake brief §"What changed" 6) an
  `asset_name` reading "**Generic** AU suburban aerial" while its `geography` is the specific
  `au_nsw_sydney_hurstville`.

So a Sydney-suburb aerial is presented as generic national footage, and nothing in the pipeline can
detect it. Because the resolver cannot filter on geography, **the only available control is truthful
labelling at intake plus human review** — which is exactly why §4.3 makes geographic classification a
required, non-defaultable field rather than an optional note.

---

## 3. Minimum governed pool before normal production volume continues

**✅ RATIFIED (PK, 2026-07-29) — confirmed explicitly at the gate, and now binding:**

| Threshold | Value | Meaning |
|---|---|---|
| **Recommended minimum** | **4 eligible clips** | below this, governed B-roll video stays at held//reduced volume |
| **Target** | **6 eligible clips** | the state at which B-roll rotation is considered production-normal |
| **Quality bar (both)** | every clip safely crop-proofed to **1080×1920 / 12s** | matches the live output contract exactly |

**What kind of number this is.** 4 / 6 is a **PK-issued governance threshold, not an empirically
derived one.** No measurement in ICE establishes the audience-facing cost of background repetition,
and this lane did not attempt to invent one. What the evidence *does* support is the shape of the
curve: at N=1 repetition is **certain** (every video, the identical clip); at N=4 the expected
consecutive-repeat rate is ~25% and every render has a genuine alternative; at N=6 it is ~17%. The
thresholds are a judgment about acceptable sameness, informed by those rates — and they are recorded
as a judgment so that no later lane cites them as a measured finding. §8.2 asks PK to confirm them.

**"Eligible" means eligible as the resolver computes it** — not "rows inserted". A clip counts toward
the floor only when `resolve_slot_assets` at the production signature would actually return it:
`is_active=true` · `approved='true'` · licence present and unexpired · `bucket='brand-assets'` ·
`sfto ∈ {'true','needs_scrim'}`. The count is taken from a **live resolver call**, never from a row
count (§4.5).

> **⚠ Divergence to note, not a defect.** The ratified `video-broll-intake-v1` Gate-1 brief cites a
> pool-sizing floor of **min 3 / target 8**, inherited from the general still-background standard in
> `docs/briefs/ice-asset-gap-register-v1.md` §4. This lane's **4 / 6** is B-roll-specific and governs
> the **rotation-readiness / resume-volume decision**; the intake brief's 3 / 8 governs **how much to
> source**. They are compatible — sourcing 8 and accepting 4–6 (that brief's own §2 batch target)
> lands exactly on this floor. Where they are read as competing, **PK's 4 / 6 issued in this lane is
> the later instruction and governs the volume decision.** Flagged for PK confirmation rather than
> silently reconciled — **and CONFIRMED by PK on 2026-07-29.** The two floors stand side by side:
> **3 / 8 governs how much to source** (intake brief), **4 / 6 governs when normal production volume
> resumes** (this document). Neither supersedes the other; a lane citing one must name which.

**Also note (unchanged by pool size):** no pool size fixes §2.3. At the 6-clip target, roughly one
render in six still repeats its predecessor. That is an accepted property of a stateless seeded
selector, not a bug to be discovered later.

---

## 4. Activation handoff — the exact contract for Asset Sufficiency intake results

This is what the Asset Sufficiency lane must deliver for its clips to be *activatable*. It adds to,
and never subtracts from, the ratified `video-broll-intake-v1` Gate-1 brief. Nothing here authorises
sourcing, promotion, or activation.

### 4.1 Required metadata (per clip — all mandatory, none defaultable)

Written into `c.client_brand_asset` for `client_slug='property-pulse'`, reusing the twice-proven shape:

| Field | Required value / rule |
|---|---|
| `asset_type` | `'other'` — **the CHECK constraint forbids `'logo'`-style values; `'other'` is the proven value** |
| `asset_meta.usage` | **`'broll_background'`** — exact string; anything else is invisible to a video Background field |
| `asset_meta.bucket` | **`'brand-assets'`** — any other value ⇒ `output_as_input_risk` rejection |
| `asset_meta.safe_for_text_overlay` | **`'true'` or `'needs_scrim'` ONLY.** Never `'needs_gradient_scrim'` or any other token — unrecognised values fail closed silently |
| `asset_meta.license_type` **or** `license` | at least one present, else `license_missing` |
| `asset_meta.license_expires_at` | absent, or a future timestamptz |
| `asset_meta.asset_key` | stable, honest, human-readable; **must not contain "generic"** unless §4.3 classification is `generic` |
| `asset_meta.sha256` | of the actual downloaded bytes, byte-verified against the public URL at apply |
| Provenance set | creator, source URL, provider ID, download timestamp, archived licence evidence (per intake brief §1) |
| Technical set | `mime`, `duration_s` (**≥ 12 usable after trim**), `fps`, `has_audio`, `motion`, `loopable`, `aspect_ratio` |
| Fences at insert | all four **false** (`is_active`, `approved`, `production_use_allowed`, `approval_status`) |

### 4.2 Platform scope (hard requirement — see §2.4)

- `platform_scope = ['facebook','instagram','youtube']` — **explicit array, never `NULL`**.
- **LinkedIn excluded** until its governed vertical-video template and publisher path are proven.
- **Verification step, not an assumption:** after insert, the handoff must prove the row survives an
  explicit-platform resolver call for **each** scoped platform, not only at `p_platform=NULL`. A row
  that only resolves under `NULL` has an inert scope and does not satisfy this contract.

### 4.3 Geographic classification (hard requirement — see §2.5)

- Every clip declares **`geo_scope`** at the most specific level it actually depicts
  (e.g. `au_nsw_sydney_hurstville`, not `au_nsw`; `au_wa_perth`, not `au`).
- A clip may be classified **`generic`** only if it shows no identifiable locale — no recognisable
  skyline, landmark, signage, or street furniture that ties it to one place.
- **`asset_name` and `asset_key` must agree with `geo_scope`.** A specific clip labelled "generic" is
  a **reject at review**, not a note to carry forward.
- Because the resolver cannot filter on geography (§2.5), truthful labelling **is** the control. State
  this explicitly in the handoff so no downstream lane assumes a filter exists.

### 4.4 Resolver eligibility (the definition of "done" for a clip)

A clip is *activatable* when a **live** `resolve_slot_assets('property-pulse', NULL, 'video_short_stat',
'dd5fd75e-982d-4c3d-89cd-7ce0936076b2', <seed>)` call returns it in `selected[]` with
`slot='Background'` — and it is *correctly scoped* when the same call with each of
`p_platform ∈ {facebook, instagram, youtube}` also returns `status='ok'`. Row state is evidence;
the resolver's answer is the verdict.

### 4.5 Rotation proof (required before volume resumes)

With the pool at **N ≥ 4 eligible**, run the resolver over a seed sample and record:

1. **Distinct-clip coverage** — every eligible clip is reachable; **no clip is unreachable** (an
   unreachable clip means an ordering or eligibility fault, not a rotation quirk).
2. **Distribution** — picks spread across the pool rather than collapsing onto one index.
3. **Pool count taken from the resolver, not a row count** — the number the proof pins.
4. **The measured consecutive-repeat rate**, reported honestly against the ≈1/N expectation (§2.3), so
   PK accepts the repeat behaviour with a number in front of them rather than discovering it live.
5. **`slot_warnings` captured** for each call — `platform_input_missing` is expected at the production
   signature and must be recorded, not filtered out.

### 4.6 Metadata validation gate (how §4.1–4.3 are actually enforced, not just declared)

Declared metadata requirements that nothing checks are the failure mode this whole document is about
(§2.4, §2.5). So each requirement above is paired here with the mechanical check that proves it, run
**inside the apply transaction** where the check is a `RAISE`, and at review where it is human:

| Requirement | Enforcing check | Where |
|---|---|---|
| `usage='broll_background'`, `bucket='brand-assets'`, `asset_type='other'` | in-txn assertion on the written row; fail ⇒ `RAISE` ⇒ rollback | apply txn |
| `sfto ∈ {'true','needs_scrim'}` | in-txn assertion on literal set membership — **not** a NOT NULL check; the whole point is that a *plausible* wrong token (`needs_gradient_scrim`) passes any weaker test and then fails closed silently at render | apply txn |
| all four fences `false` | in-txn assertion per row | apply txn |
| licence present, unexpired; provenance set complete | in-txn NOT NULL assertion on each named key | apply txn |
| `sha256` honest | local bytes hashed, re-hashed from the public URL, compared; mismatch ⇒ abort | pre/post apply |
| `platform_scope` explicit + LinkedIn-free | in-txn assertion that the array equals `{facebook,instagram,youtube}` | apply txn |
| **platform scope is live, not inert** | resolver called per scoped platform; each must return `ok` (§4.2) | post-apply, live |
| `geo_scope` specific + label agreement | **human review** — no machine check is possible (§2.5); the reviewer states the depicted locale and confirms `asset_name`/`asset_key` do not claim "generic" | PK visual gate |
| ≥12s usable, crops safely to 1080×1920 | measured from the file at review, per intake brief §6 | review |
| **pool neutrality** | in-txn fail-closed assertion that the live eligible-pool count is unchanged by a fenced insert, pinned to a count re-read **at apply time** | apply txn |

**Fail-closed rule:** any check that cannot be evaluated aborts the apply. An unevaluated check is a
failed check, never a passed one. Two of these — the `sfto` set-membership assertion and the pool
neutrality count — are the ones most likely to be written as comments rather than executable `RAISE`s;
the apply packet should be run past `apply-harness-auditor` before freeze for exactly that reason
(shadow mode — advisory, clears no gate).

### 4.7 Rollback boundary

| Layer | Rollback |
|---|---|
| **Fenced intake** (rows inserted, all fences false) | row `DELETE` + storage-object delete; written and validated **before** apply. Zero production effect by construction — a fenced row is invisible to the resolver |
| **Fence flip / promotion** (a clip made eligible) | revert the exact fence columns to `false` for the named `asset_id`s; **separate T3 lane**, not covered by this handoff |
| **Template / winner** | **OUT OF BOUNDS.** No rollback needed because no repoint is authorised here. `46c5c4ac` remains the winner |
| **Worker / parity overlay** | **OUT OF BOUNDS.** v3.15.0 and `B1_VIDEO_TEMPLATE_OUTPUT_PARITY` are not touched |
| **Resolver v1.4** | **OUT OF BOUNDS.** Any change is a separate reviewed build |

**The boundary line:** everything up to and including a *fenced* insert is T2 and reversible by row
delete. Everything that changes what production *selects* — fence flips, `fit_status`, `enabled`,
template repoint — is a **separate T3 lane with its own PK gate**, and a template repoint additionally
inherits **TPR-1 + TPR-1 Addendum v1** (three-surface effective-spec diff).

---

## 5. Is the one-clip state surfaced as a production-quality warning? — **NO. Confirmed.**

This was checked directly, and the answer is worse than "silent".

| Surface | What it reports today |
|---|---|
| `probe_asset_inventory('property-pulse', NULL, dd5fd75e, 'background')` | **`reason='slot_kind_not_probable'`, `n_inventory_total=0`, `coverage_conclusive=false`** — identical for `'broll_background'` and `'video_background'`. (Control: `'logo'` returns `n=12`, `conclusive=true` — so the probe works, it is just blind to this slot kind.) |
| Asset-gap analyser / writer loop | keys off **fail-closed** resolution. A one-clip pool resolves `ok`, so it never registers as a gap (consistent with the standing "gap fns catch fail-closed, not thin pools" carry) |
| `render_spec.template.tmr` (per render) | stamps `slot_reasons`, `slot_warnings`, and `output_spec` — but carries **no pool-size / candidate-count field**. A render from a 1-clip pool is byte-indistinguishable from one out of a 6-clip pool |
| `ice_ro.asset_governance_status` | format-contract rows only; no pool sizing |
| Dashboard | no B-roll pool surface exists |
| Registers | `docs/00_sync_state.md:13` and the action list carry it **in prose**, as a human-readable carry |

**Assessment.** The only honest record of the one-clip state is prose in the registers. Every machine
surface either ignores it or, in the probe's case, **returns `0 / not probable`** — a value a reader
could reasonably misread as "no inventory problem" or as a broken probe. Nothing anywhere reports it
as a production-quality warning.

**How this was established (so the claim is checkable, not asserted).** The finding is a *negative*
claim, and negative claims are the easy ones to get wrong, so each surface was probed directly rather
than inferred:

- **The probe was exercised, with a control.** `probe_asset_inventory` was called for
  `background`, `broll_background`, and `video_background` — all three returned
  `slot_kind_not_probable / 0 / false`. The **same function, same client, same template**, called for
  `logo`, returned `n_inventory_total=12, coverage_conclusive=true`. The probe is working; it is blind
  to this slot kind. Without the control this would be indistinguishable from a broken probe.
- **The render evidence shape was read from source, not assumed.** `B1VideoTmrEvidence`
  (`b1_video_stat.ts:300-327`) enumerates every field stamped into `render_spec.template.tmr`:
  `winner`, ids, `variant_key`, `seed`, `bind_mode`, `resolver_used`, `fallback_taken`, `slot_reasons`,
  `slot_warnings`, `selector_status`, `audio`, `output_spec`. **There is no candidate-count or
  pool-size field in the type.** The absence is in the type definition, not merely unobserved in a
  sample row.
- **The resolver's own return shape was read.** `resolve_slot_assets` returns `status`,
  `modifications`, `selected`, `rejected`, `warnings`, `fail_reason`, `context`. It reports the *pick*
  and the *rejections*, never the eligible-candidate **count** — so even a worker that wanted to stamp
  pool size has no value to stamp today. This is why §5.1 option (1) is listed as requiring a resolver
  change, not just a worker one.
- **The gap-analyser reasoning is mechanical, not speculative.** A one-clip pool returns
  `status='ok'`; the analyser keys off fail-closed resolution; `ok` is not fail-closed; therefore no
  gap is registered. Consistent with, and independently corroborated by, the standing carry that the
  gap functions catch fail-closed states rather than thin pools, and by the intake brief's own
  `pg_proc` sweep finding **no B-roll shortage detector anywhere in the catalog**.

What is **not** claimed: that no human would notice. A person reading `docs/00_sync_state.md:13` will
see the carry. The claim is narrower and exact — **no machine surface reports it**, and the one
surface a reader would naturally consult (`probe_asset_inventory`) returns a number that reads as
either "fine" or "broken".

**No B-roll shortage detector exists in the database at all** — independently confirmed by a full
`pg_proc` sweep in the intake brief's own db-rls-auditor pass, and consistent with everything read here.

### 5.1 Required correction (recorded; deliberately NOT built in this lane)

Building a detector means a DB and/or worker change — outside this lane's read-only T1 boundary and
outside the stated boundaries (no resolver change, no worker change). It is recorded as the named next
control, with the cheapest viable option first:

1. **Cheapest, worker-side:** stamp the eligible-candidate count into
   `render_spec.template.tmr` (e.g. `pool_size`, `pool_source`) alongside the existing `output_spec`.
   Makes thin-pool state machine-checkable **per render** and retroactively queryable. Requires the
   resolver to return the count — today it returns only the pick.
2. **DB-side:** teach `probe_asset_inventory` the `broll_background` slot kind so it stops reporting
   `0 / not probable` for a slot that genuinely has inventory.
3. **Governance-side, available immediately:** treat "eligible pool < 4" as an explicit **held**
   production state in the registers rather than an implicit carry line — which is what §3 does.

Until (1) or (2) exists, **the pool floor in §3 is enforced by the human gate, not by any machine
control.** Stated plainly so no future lane mistakes the carry for an alarm. This is a **deliberate
scope decision, not an oversight**: building any of the three requires a worker or DB change, which
this lane's stated boundaries forbid. The correction is named, owned, and left for a lane that is
allowed to make it.

---

## 6. Boundaries honoured in this lane

- ✅ Live template winner unchanged (`46c5c4ac` / `dd5fd75e`).
- ✅ Parity overlay not removed, not edited, not widened.
- ✅ `resolve_slot_assets` v1.4 not modified — read only.
- ✅ No clip sourced, downloaded, inserted, promoted, or un-fenced.
- ✅ Voice, music, and selector ranking untouched.
- ✅ No DDL, no DML, no deploy, no render triggered. Every DB call was a read
  (`pg_catalog` + `STABLE` function calls + SELECTs).

## 7. Non-claims

- ❌ Not claimed: that B-roll is production-ready. It is **not** — the pool is 1 against a floor of 4.
- ❌ Not claimed: that any machine control now enforces the pool floor. None does (§5.1).
- ❌ Not claimed: that rotation avoids repeats. It cannot (§2.3).
- ❌ Not claimed: that platform scope is enforced in production. It is not (§2.4).
- ❌ Not claimed: that geography is filterable. It is not (§2.5).
- ❌ Not claimed: that ratifying TPR-1 Addendum v1 or confirming the 4 / 6 floor changed anything in
  production. Both are governance rules. **The pool is still 1 and B-roll is still below the floor.**

## 7.1 Review chain

| Check | Verdict | Note |
|---|---|---|
| Live read-only inspection | complete | resolver body, worker source, template fields, asset rows, seeded + per-platform resolver probes, inventory probe with control |
| Git state | `main`, HEAD `b7568ce`, parity ahead 0 / behind 0 | source-truth-check at session start |
| External review round 1 | **`partial`** · medium · high · `pushback_points: []` · no escalation | `review_id beee370e-ff6f-478f-914c-5bfd8d538aa4`, `reviewed_input_hash` `bbf5ba46…` (handoff) / `55add658…` (addendum) |
| External review round 2 | **`partial`** · high · high · **1 pushback point → escalate** | `review_id 57531e10-10ac-4f45-b7ac-4da218ad089d`, `reviewed_input_hash` `df9a4fe2…` (handoff) / `55add658…` (addendum, unchanged) |

> **Pin honesty (external-review rule 4).** The addendum is byte-identical to what both rounds
> reviewed (`55add658…`). This handoff's **reviewed** hash is `df9a4fe2…`; the committed file differs
> from it, and the delta is **exclusively this review-chain section, the §8.5 escalation entry, and
> the HEAD-movement note** — i.e. the record OF the review plus a git fact, none of which can exist
> before the review returns. No finding, threshold, metadata requirement, or boundary changed after
> the pin. Re-reviewing would only re-create the same class of delta. Flagged rather than left as a
> silently stale pin; the committed hash is recorded in the commit message.

**Round 1 → round 2 actions.** Round 1 raised no concrete defect. Its `corrected_action` asked for
(a) a mechanism surfacing low-clip-count warnings and (b) clarified metadata-validation processes, and
listed three claims as unverified.

- **(b) acted on in full** — §4.6 (metadata validation gate) was written in response: every declared
  requirement paired with its enforcing check and lifecycle point, a fail-closed rule, and the two
  checks most at risk of being prose-only named for `apply-harness-auditor`.
- **The three unverified claims were closed** by making the evidence self-contained in §3 and §5
  (probe control case, type-level read of `B1VideoTmrEvidence`, resolver return-shape read, explicit
  narrowing of the negative claim to machine surfaces, and relabelling 4/6 as a governance judgment
  rather than a measured finding). Round 2 returned **`unverified_claims: []`**.
- Round 1's pin went stale the moment the handoff changed, so round 2 was re-run against the new hash
  (external-review rule 1/4).

**(a) is the open escalation.** Round 2 verified §4.6 and every prior claim, and left exactly one
pushback point: whether deferring the low-clip-count detector on scope grounds is right for a
governance lane. **Triage class: `policy_decision` / `scope_design_concern`** — not a defect. CCF-02
routing sends both to the PK decision gate, which is where this lane stops regardless. It was **not**
built here because a detector requires a worker and/or resolver change, which this lane's stated
boundaries explicitly forbid; building it would have been the lane exceeding its authority, not
closing a gap. It is carried as §8.5.

## 8. PK gate outcomes and remaining open questions

**Resolved at the gate (PK, 2026-07-29):**

1. ✅ **TPR-1 Addendum v1 RATIFIED** (`docs/briefs/tpr-1-addendum-v1.md`) — sub-rules a–f in force.
   The standing "addendum proposed, NOT ratified" carry (opened v6.54) is **CLOSED**.
2. ✅ **4 / 6 CONFIRMED** as the eligible-pool floor governing resume-of-normal-volume, alongside the
   intake brief's 3 / 8 sourcing floor (§3). **Current eligible pool = 1, so governed B-roll video
   remains below the floor and normal volume does not resume on this ratification.**

**Still open — nothing below was decided at this gate:**

3. **Platform scope on the two existing rows** (§2.4): correcting `{youtube}` →
   `{facebook,instagram,youtube}` on `2d62b04e` is a one-row DML the intake brief explicitly forbids
   itself from doing ("do not mutate"). It therefore needs its own gate. **Until it happens, every
   governed PP video uses a youtube-scoped clip on every platform.**
4. **Which shortage-detector option** (§5.1) to build, and when.
5. **Escalated by external review round 2 (the lane's only open pushback point):** is deferring the
   low-clip-count detector the right call for a governance lane, or should the thin-pool warning be
   treated as blocking the resume of normal volume in its own right — i.e. does "no machine control
   reports the shortage" belong on the *same* gate as "the pool is too small"? This lane's position is
   that the two are separable and that building a detector was outside its authority; the reviewer's
   position is that the omission is arguable on governance-expectation grounds. **PK decides.**

## 9. Stop condition

**Met.** Addendum and handoff written, reviewed, recorded, committed, pushed (v6.56 `ade7947`);
PK gate taken 2026-07-29 — addendum **ratified**, 4 / 6 floor **confirmed** (v6.57). The next
production outcome begins only after Asset Sufficiency delivers approved B-roll clips against §4 and
the eligible pool reaches **4**.
