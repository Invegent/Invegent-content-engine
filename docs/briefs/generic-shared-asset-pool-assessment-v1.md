# Generic Shared Asset Pool — Gate-1 Assessment + Design Packet (v1)

**Created:** 2026-07-19 Sydney · **Author:** chat (orchestrator, design/assessment lane) · **Status:** DRAFT — Gate-1 assessment, RETURNED for PK review. Nothing approved, nothing built.
**Lane class:** SIDE_PROVING · **Tier:** T1 (read-only assessment + design). **Every implementation step named in §5 is a SEPARATE future lane at its own tier and its own PK gate** (DML/DDL ≥ T2; resolver / storage-move / deploy = T3).
**Target project:** `mbkmaxqhsohbtwsqolns` · schema `c` (non-REST-exposed, service-role-only) + shared-library precedent in schema `m`.
**Boundaries (this lane):** ⛔ no DB write · ⛔ no migration · ⛔ no storage change · ⛔ no resolver edit · ⛔ no deploy · ⛔ no promotion · ⛔ no approval. This packet PRODUCES a design and RETURNS it; PK gates every step.

---

## 0. Provenance & the db-rls-auditor substitution (named per CCF-02 R1)

The DB schema/resolver/pool truth **is** the subject of this lane, so it was routed to `db-rls-auditor`. **That agent was tool-blocked this session** — its `mcp__supabase__*` tools were not wired into its invocable set (it had only `Read`/`Grep`/`Glob`), so it could run no live SQL and returned `concerns` with the exact queries prepared.

Per CCF-02 Phase-2 refinement **R1** ("orchestrator read-only checks OK … substitutions named in the lane record"), the orchestrator then ran the prepared **read-only SELECT / catalog queries itself** via `mcp__Supabase__execute_sql` against `mbkmaxqhsohbtwsqolns`. **SELECT/catalog reads only — zero mutation, zero DDL/DML, zero deploy.** Every §1 figure below is **live-verified** (queried 2026-07-19) and labelled as such; nothing here relies on the stale repo snapshots the auditor flagged.

> **Standing recommendation for the FIRST implementation lane (§5):** re-run `db-rls-auditor` in a Supabase-MCP-enabled session so the DB-truth gate is exercised by the auditor, not by an orchestrator substitution. The substitution is acceptable for a T1 read-only assessment; it is **not** a precedent for T2/T3 DB lanes.

---

## 1. Current-state map (live-verified 2026-07-19, cited)

### 1.1 The table — `c.client_brand_asset` (11 real columns; everything else is `asset_meta` jsonb)

Live `information_schema.columns`:

| Real column | Type | Null | Default |
|---|---|---|---|
| `asset_id` | uuid | NO | `gen_random_uuid()` |
| `client_id` | uuid | **NO** | — |
| `asset_type` | text | NO | — |
| `asset_name` | text | NO | — |
| `asset_url` | text | YES | — |
| `asset_meta` | jsonb | YES | — |
| `platform_scope` | text[] | YES | — |
| `is_active` | boolean | NO | `true` |
| `notes` | text | YES | — |
| `created_at` | timestamptz | YES | `now()` |
| `updated_at` | timestamptz | YES | `now()` |

**Confirmed:** the only real columns that touch eligibility are `is_active`, `platform_scope`, `client_id`. **`approved`, `approval_status`, `production_use_allowed`, `safe_for_text_overlay`, `geo_scope`, `suggested_scrim_opacity`, `usage`, `bucket`, `license`/`license_type` all live inside `asset_meta`** — verified by the key histogram (`approved`/`approval_status`/`bucket`/`license`/`usage`/`asset_key` present on all 119 rows). **`client_id` is `NOT NULL`** — there is *no* way today to store a client-agnostic asset in this table without a sentinel client or a schema change (design consequence, §3.1).

**Fence reality (matches CLAUDE.md memory):** `is_active` is a real column; `approved`/`approval_status`/`production_use_allowed` are `asset_meta` keys. The production resolvers read only `is_active` + `asset_meta.approved`; `production_use_allowed` and `approval_status` are **written by intake but read by no resolver** (they are governance-audit metadata, not runtime fences). Verified against both resolver bodies below.

### 1.2 The two resolvers (both `SECURITY DEFINER`, `search_path=''`, **service_role EXECUTE only** — anon/authenticated `false`, live-verified)

**(a) `public.resolve_brand_assets(p_client_slug text, p_asset_keys text[])`** — the legacy foundation layer. Live `pg_get_functiondef` (this function is a known repo-drift item — *not* in `supabase/migrations/**`; captured live here, closing the gap flagged in `spine-generalisation-v1-packet.md:46`):

```sql
-- returns TABLE(client_slug, client_id, asset_id, asset_key, asset_type, asset_name,
--               asset_url, bucket, source_path, usage, location, approved, is_active)
SELECT … FROM c.client_brand_asset cba
JOIN c.client cl ON cl.client_id = cba.client_id
WHERE cl.client_slug = p_client_slug
  AND cba.asset_meta->>'asset_key' = ANY (p_asset_keys)
  AND cba.is_active = true
  AND (cba.asset_meta->>'approved')::boolean IS TRUE;
```

It is a **by-KEY lookup, client-scoped**, filtering only `is_active + approved`. It does **not** filter licence, platform, aspect, text-safety, or consent — the caller must already know the `asset_key`. (Corroborated by `creative-asset-selection-v0-result.md:28-33`.)

**(b) `public.resolve_slot_assets(client_slug, platform, format, template_id, seed)`** — the TMR "spine" slot-selector (`20260704002811_update_resolve_slot_assets_v1_1_scrim48.sql`). Client-scoped `WHERE cba.client_id = v_client_id`; runs the full eligibility filter chain (v0-result §5): `is_active` → `asset_meta.approved` → licence present → licence not expired → `bucket='brand-assets'` (output-as-input guard) → `platform_scope` → `safe_for_text_overlay ∈ {true,needs_scrim}`; ranks text-safe class then `(created_at, asset_id)`, rotates by FNV-1a over the seed; **fails closed** with per-asset reason codes (the "why picked / why rejected" explainability contract). Reads the governed per-asset `asset_meta.scrim_opacity_override` — **but 0 rows carry that key today** (rows use `suggested_scrim_opacity`; key histogram), so that path is dormant.

**Where each runs (live production reality):**
- **PP `image_quote`** uses the TMR spine: `select_template(...)` embeds `resolve_slot_assets` output; the image-worker consumes it (`b1_production.ts`, Option D — the hardcoded rotation was retired). Governed for `property-pulse` only (`client_creative_governance.enabled`).
- **Every other client / format** stays on the legacy path; the production **logo** there comes from `c.client_brand_profile.brand_logo_url` (a single fixed logo), *not* the resolver (`creative-asset-selection-v0-result.md:24`).

Both resolvers are **service_role EXECUTE only** (live-verified: anon=false, authenticated=false, service_role=true). `c.client_brand_asset` has **RLS disabled, 0 policies** (live-verified) — protection is grant-based (service_role SELECT) on an unexposed `c.*` schema, per `20260707010000_grant_service_role_select_client.sql`.

### 1.3 Storage — `brand-assets` bucket, client-foldered (+ existing non-client prefixes)

Live `storage.buckets`/`storage.objects`. `brand-assets` (public) top prefixes: `Property_Pulse` (47), `NDIS_Yarns` (46), `Invegent` (17), `Care_for_Welfare` (16) — **and already `fonts/` (2) + `wasm/` (1), non-client shared prefixes coexisting in the same bucket.** Convention: `brand-assets/<Client>/Backgrounds/<asset_key>.jpg` (and `/Logos/`, `/Broll/`). Public URL `…/storage/v1/object/public/brand-assets/<Client>/…`. Video B-roll lives in the **same** `brand-assets` bucket under the client folder, `asset_meta.usage='broll_background'` (PP has 2, 0 eligible). Rendered *outputs* live in separate buckets (`post-images`, `post-videos`) foldered by client_id/slug — never a source (the output-as-input guard).

### 1.4 Live pools (the pool-neutrality baseline — 2026-07-19, `is_active AND asset_meta.approved`)

| client_slug | background | broll_background | logo | logo_vector_source |
|---|---|---|---|---|
| property-pulse | **22** / 24 | 0 / 2 | 8 / 12 | 0 / 7 |
| ndis-yarns | **5** / 24 | — | 1 / 8 | 0 / 9 |
| care-for-welfare-pty-ltd | — | — | 0 / 7 | 0 / 9 |
| invegent | — | — | 0 / 8 | 0 / 9 |

*(eligible / total.)* Everything is client-scoped; **PP and NDIS each hold 24 backgrounds** — the duplication pressure PK names. Licence mix on backgrounds: `pexels_license` 23, `unsplash_license` 13, `pexels` 9 (all 0-eligible — a stale/typo class), plus 2 null + 1 `licence_free`. `geo_scope` is already a populated key (38 rows: values `none`/`au_generic`/`au_nsw`/`au_qld`/`au_wa_perth`/`non_au`/`unidentified`/null); `has_people` mostly `false`; `ai_exclusion` carries free-text clearance notes.

### 1.5 Pool-neutrality — how it is kept today

Every intake asserts, **in-transaction, fail-closed**, that the per-client, per-platform *eligible* count is unchanged after a fenced INSERT (`batch_intake_apply.sql:100-114`: recomputes the `resolve_slot_assets` background filter as a WITH-clause replica and `RAISE EXCEPTION` on any delta). It is a **per-client static invariant** ("this INSERT must not change PP's 22/22/22/21 pool"). The D7 NDIS envelope asserts the same and relies on `resolve_slot_assets`' `WHERE client_id=…` for cross-client isolation (`tmr-d7-c-…:23`). **This invariant is defined per client and structurally assumes assets belong to exactly one client — the core thing a shared pool changes (§3.4).**

### 1.6 The `/creative-library` "what ICE selects & why it rejects" surface

The explainability PK refers to is the `selected[]` / `rejected[{reason_code}]` / `warnings[]` structure returned by `resolve_slot_assets` (its day-one contract) plus the TMR read RPCs (`get_tmr_template_list/detail/filters`, `20260630050000_tmr_read_rpc_v1.sql`). The dashboard **UI** lives in the separate `invegent-dashboard` repo (**out of this session's read scope** — flagged, not read); the server-side truth it consumes is those RPCs, all `SECURITY DEFINER` service-role-only reads.

---

## 2. Precedents that constrain the design (do not re-invent)

1. **Music Library v0 — the shared-pool problem, already solved for audio (PK Gate-1 2026-07-09; migration `20260708224532_create_music_library_v0.sql`, prepared/dark).** This is the decisive precedent and the recommended spine for images/B-roll:
   - `m.music_track` = **GLOBAL shared track, NO `client_id`** ("a track legitimately serves all clients"), in its own table in schema `m` — *not* an overload of the client-scoped table. Four fences default-off.
   - `m.music_suitability` = **scoped fit, NEVER global**: one row per (`scope_kind ∈ {platform,format,vertical,client}`, `scope_value`) with `fit_status ∈ {unknown,candidate,suitable,not_suitable,needs_review,blocked}`. This is exactly PK's "which clients/industries/contexts does this generic asset fit" — expressed as scoped rows, including `not_suitable`/`blocked` for the **exclusions** PK wants.
   - `m.music_license` = separate 1:1 rights record, **six fail-closed booleans** (NULL ⇒ not allowed): commercial/social/modification/paid_ads/attribution/content_id + expiry. The "stricter licence bar for a shared pool" is this shape.
   - **Approval is scoped, never global** (`m.music_review_event` records scoped transitions) → directly answers PK's "approved for whom?".
   - Per-client *preference* lives in `c.client_music_profile` (preferred/banned) — the only client-keyed table.
   - Storage: `post-music/global/<mood>/<track_key>.mp3` — a global prefix in a public bucket.
2. **TMR-4 "vertical is a tag, not a copy"** (`tmr4-generic-template-tags-…-packet.md`, applied 2026-07-11): two-level tags (family defaults ∪ template overrides, template wins per namespace) over namespaces `vertical/use_case/tone/motion_treatment/length_class/aspect_fit`, resolved as a **read-side invariant**. The asset suitability vocabulary should reuse these namespaces where they apply, not fork a parallel taxonomy.
3. **Creative Library v2** (`creative-library-v2-architecture.md`, A1.0 ratified): **Assets and Patterns are sibling governed libraries**; `resolve_brand_assets` unchanged; declarative registry is **never read at runtime**. A shared asset pool is an evolution of the Assets library, and must stay consistent with this — the registry describes; the DB governs; the resolver selects.

---

## 3. Proposed model (PROPOSAL ONLY — nothing designed into existence)

> Design principle, from the music precedent: **a shared asset gets its own home (no `client_id`); client fit and client approval are expressed as SCOPED rows, never as a global flag; a client-specific asset stays exactly where it is.** Client-specific always **overrides** generic.

### 3.1 Storage model

- **Generic prefix, same bucket:** `brand-assets/_generic/Backgrounds/<asset_key>.jpg` (and `/Broll/`). Reuses the `fonts/`+`wasm/` precedent (non-client prefixes already live in `brand-assets`) and the music `global/` convention. No new bucket needed. Output-as-input guard (`bucket='brand-assets'`) still holds.
- **Client folders retained unchanged** for genuinely client-only assets (logos, branded/participant/sensitive imagery): `brand-assets/<Client>/…` exactly as today.
- **Migration of existing assets:** *no bulk move.* Existing client-scoped assets **stay** (least-disruption; every intake/pool assertion is keyed to them). Reclassifying a brand-neutral existing asset as generic is a **deliberate, per-asset, PK-gated** action in a later phase (copy bytes to `_generic/`, new shared row, sha256-verified, old client row retired) — never an automatic sweep. Duplicates (PP vs NDIS holding the same generic scene) are reconciled opportunistically, not migrated en masse.
- **Data-home decision (the pivotal one):** because `c.client_brand_asset.client_id` is `NOT NULL` and every resolver + every intake assertion assumes single-client ownership, **do NOT make `client_id` nullable.** Mirror the music model: a **new shared table** (working name `c.shared_brand_asset` or schema-`m` `m.shared_asset`, no `client_id`) + a **scoped suitability table** + a **1:1 licence table**. This isolates the shared model from the proven client-scoped path and its invariants (§3.4), and is the exact shape PK already ratified for music. *(Alternative — a nullable-`client_id` sentinel row in the existing table — is recorded in §6 OQ-2 as the rejected-by-default option, because it silently breaks the per-client pool assertions and the `WHERE client_id=…` isolation.)*

### 3.2 Suitability metadata schema (the core of PK's ask)

Two layers, mirroring music:

**(a) Intrinsic descriptors** on the shared asset row / its `asset_meta` (what the asset *is* — brand-independent):
- `brand_neutral` (boolean, fail-closed: only `true` may enter the pool),
- `industry_tags[]` / `vertical` (reuse TMR-4 `vertical` vocabulary: property, ndis/disability, finance, generic…),
- `context_tags[]` / `use_case`, `tone` (reuse TMR-4 namespaces),
- `geo_scope` (reuse the live vocabulary: `none`/`au_generic`/`au_nsw`/`au_qld`/`au_wa_perth`/`non_au`/`unidentified`),
- `palette` / dominant colour, `has_people` (fail-closed: people-forward ⇒ not pool-eligible without explicit review), `has_text`/legible-signage flag,
- `safe_for_text_overlay` (retained, **but template-relative — see §4.4**), `suggested_scrim_opacity`,
- `ai_exclusion` / provenance (retain existing clearance-note convention).

**(b) Scoped fit + exclusions** (which clients/contexts it fits — the music `m.music_suitability` shape): one row per (`scope_kind ∈ {client,vertical,platform,format}`, `scope_value`, `fit_status ∈ {unknown,candidate,suitable,not_suitable,blocked,needs_review}`). **Exclusions are first-class rows** (`fit_status='blocked'` for "must NEVER serve client X / competitor Y") — the mechanism that prevents the §4.1 brand-conflict risk. Default absence of a `suitable` row ⇒ **not eligible for that scope** (fail-closed, never fail-open to "serves everyone").

All additive; no key overloads eligibility silently (every new eligibility-touching key is a "new shape" under the image-workflow-acceleration P2 mechanical structural-diff gate).

### 3.3 Resolver implications

- **Additive & back-compatible.** Client-specific selection is unchanged. The resolver gains a **union step**: candidates = client-scoped assets **∪** generic assets whose scoped-suitability rows include a `suitable` row for this client/vertical **and** no `blocked` row for this client. **Client-specific OVERRIDES generic** (a client asset for the slot outranks any generic one — same "template wins" precedence as TMR-4's tag resolution).
- The full existing filter chain (licence/text-safety/platform/output-as-input) applies to generic candidates **plus** a stricter licence gate (§4.2) and the `brand_neutral=true` + no-`blocked` gates.
- Shape: a **new resolver version** (`resolve_slot_assets` v2 / a `resolve_shared_assets` helper), shipped **dark** first (the proven pattern), proven in isolation, then wired — a **T3 lane** (resolver on the live PP path). `resolve_brand_assets` (by-key) can stay untouched or gain a sibling; legacy paths need not change until explicitly migrated.

### 3.4 Pool-neutrality — the replacement invariant (the hardest question)

Today's invariant — *"an intake must not change any client's per-client eligible count"* — **cannot survive a shared pool**, because a generic asset **legitimately raises every eligible client's count at once**. That is the intended behaviour, not a violation. Proposed replacement (to PK, not decided):

- **Retire the per-client static-count assertion for shared intakes**; replace it with a **scoped-delta invariant**: a shared intake may change eligible counts **only for the exact set of scopes named in its approved suitability rows**, and **by exactly the asset(s) in the change set** — asserted in-transaction, fail-closed, as a per-scope delta (generalising the existing WITH-replica assertion from "delta must be 0" to "delta must equal the approved scope set"). Any client **not** in the approved scope set must see **delta 0** (a shared asset never silently leaks into an unscoped client).
- **Keep the per-client static assertion unchanged for client-scoped intakes** (the proven T2 path is untouched).
- **Non-waivable per-apply guards remain** (image-workflow P2): byte-verify + public-URL sha256 + branch-warden; the pool assertion is *redefined*, never dropped.
- Fenced-until-approved still means a shared asset raises **no** count until its scoped approval flips — so a fenced shared intake still asserts **delta 0 everywhere**.

### 3.5 Fences + approval for a shared asset

- **Same four fences**, default-off (`is_active` + `asset_meta.approved`/`production_use_allowed`/`approval_status`), fenced-until-approved.
- **Approval is SCOPED, never global** (music precedent): "approved" for a shared asset means "approved **for scope S**" (a `suitable` suitability row + a scoped review-event), not a single global boolean. PK's "approved for whom?" is answered by the scope set. A generic asset can be `suitable` for property-pulse, `not_suitable` for ndis-yarns, and `blocked` for a named competitor — simultaneously.
- **PK visual verdict remains the only deciding act**; the crop-proof/text-safety gate is unchanged and, for shared assets, must be **re-affirmed per template geometry it will actually serve** (§4.4).

---

## 4. Risk register (surfaced, not buried)

| # | Risk | Severity | Mitigation in this design |
|---|---|---|---|
| 4.1 | **Brand conflict** — client A sees a background reading as client B's (or a competitor's building/branding). | **High** | `blocked` scoped-suitability rows are first-class; `suitable` is opt-in per scope (fail-closed — no `suitable` row ⇒ not served); `brand_neutral=true` gate; legible-signage REJECT at harvest (image-harvester calibration rule) + PK crop-proof. A generic asset is eligible for a client **only** by an explicit `suitable` row. |
| 4.2 | **Licensing scope for multi-client reuse.** A licence sourced under one client's intake may not obviously cover multi-brand reuse. | **High** | Live mix is Pexels + Unsplash — both royalty-free, no per-entity/per-brand restriction, commercial reuse permitted (verify per current licence text at the licence lane — **OQ-3**). **Stricter pool bar** (music precedent): shared pool admits only licences that are provably multi-entity commercial + no-attribution; **CC BY / CC BY-SA / AI-generated excluded** (already ICE policy); **paid-stock = per-asset exception**, never blanket. A separate 1:1 licence record with fail-closed booleans (incl. `paid_ads_allowed`, `content_id_safe` for video). The stale `license_type='pexels'` (9 rows, 0 eligible) vs `'pexels_license'` inconsistency should be normalised at the licence lane. |
| 4.3 | **Sensitive-content exclusions.** Some assets must NEVER be generic — NDIS logo/affiliation cues, participant / culturally-specific / consent-bound imagery. | **High** | **Hard class exclusion at the pool boundary:** such assets stay client-scoped and are structurally ineligible for the shared table (`brand_neutral=false` + a policy fence). Grounded in **NDIS content Rule 3.4** (content involving a specific participant requires *verifiable consent*; `docs/compliance/ndis_content_rules.md:204-208`) and the D7 purpose-binding (brand-navy abstract intaken; civic/real imagery routed back, not pooled). **⚠️ Flag:** the seed cites a *"v5.79 NDIS Sensitive-Real-Imagery policy"*, but the register HEAD is **v5.72** — that policy is **not present in the repo at this HEAD**. Treated as a stated requirement to be confirmed/cited by PK, **not** an established citation (**OQ-1**). |
| 4.4 | **Text-safety is template-relative.** An asset safe under one template's overlay geometry may overprint under another. | Medium | `safe_for_text_overlay` + `scrim_opacity_override` are retained, but a shared asset serving multiple templates must carry text-safety **per template family / geometry it is approved for** (a suitability dimension), not a single global boolean. Crop-proof re-affirmed per geometry at approval. |
| 4.5 | **Pool-neutrality regression** — a shared asset silently leaking into an unscoped client. | **High** | §3.4 scoped-delta invariant: any client not in the approved scope set must show eligible-delta 0, asserted in-txn fail-closed. Non-waivable byte/hash/branch-warden guards retained. |
| 4.6 | **Resolver on the live PP path** — a v2 resolver change touches production `image_quote`. | **High** (T3) | Ship dark, prove in isolation, PP byte-identical no-regression proof before wiring; full T3 chain + live proof + rollback-proven (image-workflow §2 non-negotiables). |
| 4.7 | **Governance drift** — two approval models (per-client vs scoped) coexisting could confuse operators / the dashboard. | Medium | Reuse the music scoped-approval vocabulary verbatim; the dashboard IA change is a later, separately-gated lane (`dashboard-ia-lint` handoff; other repo). |
| 4.8 | **`client_id NOT NULL` overload temptation** — sentinel/nullable client_id in the existing table. | Medium | Rejected by default (§3.1): breaks per-client pool assertions + `WHERE client_id=…` isolation. Prefer a new shared table (music precedent). |

---

## 5. Phased plan (each phase = a separate future PK gate; none authorised here)

| Phase | Scope | Tier | Gate artifact |
|---|---|---|---|
| **P0 (this lane)** | Assessment + design (this packet). | T1 | PK Gate-1 review of this doc. |
| **P1** | **Declarative design ratification** — schema shape, suitability vocabulary, scoped-approval model, pool-neutrality redefinition, licence bar (docs only; consistency-check vs music v0 + TMR-4 + creative-library v2). | T1 | Design-of-record doc + `creative-graph-auditor`/`db-rls-auditor` design review + external review + PK ratify. |
| **P2** | **Dark, additive DDL** — new shared-asset table + scoped-suitability table + 1:1 licence table (no `client_id`, four fences, deny-all/service-role posture, empty). No resolver read, no runtime effect. Mirrors the music-library apply. | T2 | Migration packet → `db-rls-auditor` → external (hash-pinned) → PK apply hard-stop; rollback written+validated. |
| **P3** | **Storage `_generic/` prefix** + first fenced generic intake (upload + fenced INSERT, all fences off, sha256 byte+URL verified, delta-0-everywhere assertion). | T2 | Intake gate packet + per-apply guards + `db-rls-auditor` + PK. |
| **P4** | **Resolver v2 (dark)** — union of client + scoped-generic candidates, client-overrides-generic, stricter licence gate, scoped-delta invariant; proven in isolation; PP byte-identical no-regression. | T3 | Full chain + isolation proof + external + PK; ships dark. |
| **P5** | **First scoped promotion + wire** — promote one generic asset for one named client scope; wire resolver v2 on the PP path; live render proof + rollback-proven. | T3 | Full T3 chain + live proof + PK; image-workflow §2 non-negotiables. |
| **P6** | **Dashboard IA** (surface generic vs client eligibility + "why") + optional bulk reclassification of duplicated generics. | T2/T3 | Separate lane (`invegent-dashboard` repo); `dashboard-ia-lint` handoff. |

`inventory_captured ≠ pool-eligible ≠ scope-approved ≠ production-proven` at every phase (TMR discipline). Declarative → governed → operational order preserved.

---

## 6. Open questions / handoffs

- **OQ-1 (blocking P1 for the sensitive class):** The seed's *"v5.79 NDIS Sensitive-Real-Imagery policy"* is **not in the repo at HEAD v5.72**. PK to confirm the authoritative source/text of the sensitive-imagery exclusion, or ratify it fresh, so the P2 hard-exclusion fence cites a real governing rule (not the seed). Interim grounding: NDIS content Rule 3.4 + D7 purpose-binding.
- **OQ-2 (data home):** Confirm the recommended **new shared table** (music model) over a nullable-`client_id` overload of `c.client_brand_asset`. This packet recommends the new table; PK decides.
- **OQ-3 (licence bar):** PK to set the shared-pool licence bar. Recommend: Pexels + Unsplash admitted (royalty-free, multi-entity commercial, no attribution — verify current text at the licence lane); CC BY/CC BY-SA/AI-gen excluded; paid-stock per-asset only. Normalise the `pexels` vs `pexels_license` class inconsistency (9 stale rows).
- **OQ-4 (schema placement):** shared tables in `c.*` (alongside `client_brand_asset`) or `m.*` (alongside the music library)? Music chose `m.*` for shared + `c.*` for the per-client preference. Recommend consistency with music (`m.*` for the shared asset + `c.*` for any per-client preference), PK to decide.
- **OQ-5 (scoped-delta invariant):** PK to ratify the §3.4 replacement of the per-client static pool-neutrality assertion with the scoped-delta assertion (this is the load-bearing governance change).
- **Handoff — `db-rls-auditor`:** re-run in a Supabase-MCP-enabled session at P2 (the §0 orchestrator substitution is a T1-only stopgap); validate the new tables' RLS/grants/FK/ON-CONFLICT + advisors.
- **Handoff — `creative-graph-auditor`:** at P1, check the declarative design's consistency with the creative-library v2 sibling-library model + registry (it is not read at runtime).
- **Handoff — `ice-architecture-cartographer`:** optional, to regenerate the asset→render flow map once the shared path exists.
- **Handoff — `invegent-dashboard` repo (out of this session's scope):** the `/creative-library` UI change (P6) is a separate repo + `dashboard-ia-lint` lane.

---

## Findings-contract block (CCF-02 §2)

- **verdict** — normalized: `concerns` · native: DRAFT_READY_WITH_OPEN_QUESTIONS. (Design is complete and live-grounded; `concerns` because P1 cannot fully proceed until OQ-1/OQ-2/OQ-3/OQ-5 are PK-decided, and because the DB-truth gate was met by an orchestrator read-only substitution, not `db-rls-auditor`.)
- **confidence** — High on the current-state map (live-verified SQL + resolver bodies + storage + pools). High on the design spine (it generalises the PK-ratified music-library shared-pool model). Medium on the sensitive-policy citation (OQ-1) and licence-bar specifics (OQ-3), pending PK.
- **must_fix** (before P2 build): (1) PK resolves OQ-1 (sensitive-imagery policy source) — the hard-exclusion fence needs a real governing citation. (2) PK resolves OQ-2 (new shared table vs nullable client_id) — the data-home decision gates the entire schema. (3) `db-rls-auditor` (MCP-enabled) runs the P2 schema review — the §0 substitution is not a T2/T3 precedent.
- **should_fix**: (1) PK sets the licence bar (OQ-3) + normalise the `pexels`/`pexels_license` class. (2) PK ratifies the scoped-delta pool-neutrality invariant (OQ-5) before any shared promotion. (3) Decide schema placement `c.*` vs `m.*` (OQ-4).
- **observations**: Music Library v0 already solved this exact problem for audio (shared table, scoped suitability, scoped approval, fail-closed licence) — the strongest reuse opportunity. `post-music/global/` + `brand-assets/fonts,wasm/` prove shared prefixes already coexist. `client_id` is `NOT NULL`; the `scrim_opacity_override` resolver path is dormant (0 rows). PP+NDIS each hold 24 backgrounds (duplication pressure is real and quantified).
- **evidence**: live SQL (2026-07-19, `mbkmaxqhsohbtwsqolns`) — schema, `asset_meta` histogram (119 rows), `resolve_brand_assets` body, per-client pools, buckets/prefixes, grants, RLS. Files: `20260704002811_update_resolve_slot_assets_v1_1_scrim48.sql`, `b1_production.ts`, `batch_intake_apply.sql:100-114`, `tmr-d7-c-ndis-background-intake-envelope-v1.md`, `20260708224532_create_music_library_v0.sql`, `tmr4-generic-template-tags-…-packet.md`, `creative-library-v2-architecture.md`, `registry-schema-v2.md`, `creative-asset-selection-v0-result.md`, `docs/compliance/ndis_content_rules.md:204-208`, `spine-generalisation-v1-packet.md:46`.
- **scope_boundary**: read-only assessment + design only. No DB write, no migration, no storage change, no resolver edit, no deploy, no promotion, no approval. Dashboard UI (other repo) not read (out of session scope). Live reads were SELECT/catalog only.
- **open_questions**: OQ-1…OQ-5 above.
- **recommended_next_gate**: **PK Gate-1 review of this packet**, then (if accepted) P1 declarative design ratification as a separate lane. Nothing proceeds to DDL/storage/resolver without its own gate.
- **non_claims**: Nothing is approved, ratified, promoted, or built. No asset was reclassified. No schema exists. The music-library generalisation is a *proposal*, not an adopted design. The "v5.79" sensitive policy is **not** claimed to exist at HEAD. No live render, no deploy, no secret handled.
