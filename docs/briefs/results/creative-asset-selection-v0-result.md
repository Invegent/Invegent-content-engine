# Result — Creative Asset Selection v0 — Current-State Map + Slot Decision Model

**Brief:** `docs/briefs/creative-asset-selection-v0-brief.md`
**Completed:** 2026-07-02 Sydney
**Executor:** Claude Code (read-only design pass)
**Status:** complete — read-only design output; **no build, no DB mutation, no render, no proof, no publish, no enablement, no binding**.
**Scope reminder:** Asset **Selection** only — filling a **already-chosen** template's slots. NOT Asset Intake (v4.63), NOT Template Selection (TMR/Format Advisor upstream), NOT schema.

---

## 1. Current-state map

**Asset-slot surface — the ENTIRE live 16-template library uses only 3 slot types** (from `c.creative_provider_template_field`, `dynamic=true`, non-text):

| Slot | field_kind | Templates | `required_for_render` |
|---|---|---|---|
| `Background` | background | 13 (all photo cards) | **true** |
| `Logo` | logo | 16 (all) | false *(registry flag)* — but brand-required |
| `FaceObject` | image | 1 (youtube thumbnail) | false |

No `SlideImage`/`Icon`/`Broll`/`Music`/`Avatar` exist yet (future coverage only).

**How assets are sourced today:**
- **Logo** → production image/video workers read `c.client_brand_profile.brand_logo_url` — a **single fixed logo** per client (profile also has `logo_storage_path`, `logo_extraction_method`, `brand_colour_primary/secondary`). See memory `production-logo-source-brand-profile-not-resolver`.
- **Background** → **no production selector exists**; in the TMR smoke lane the URL was hand-supplied per render.
- **No path** joins {client, platform, format, chosen template, slots} → chosen assets. Selection is the missing layer.

## 2. Resolver findings — `public.resolve_brand_assets(p_client_slug, p_asset_keys)`

- `LANGUAGE sql STABLE SECURITY DEFINER SET search_path=''` — **secure**.
- Returns client/asset rows for given **asset_keys**, filtered `is_active=true` **AND** `approved IS TRUE`.
- **It is a by-KEY lookup, not a slot selector.** It does NOT filter by license validity/expiry, platform, aspect ratio, `safe_for_text_overlay`, or release/consent, and it cannot "find the right asset for a slot" — the caller must already know the `asset_key`.
- **Verdict:** good *foundation* layer (client-scoped, approved-only). Asset Selection (eligibility filter + rank) sits **above** it and must QUERY `c.client_brand_asset` with the full filter set, not just resolve a known key.

## 3. Eligibility gaps found (Property Pulse, live)

| Asset | license | approval | safe_for_text_overlay | aspect | platform_scope |
|---|---|---|---|---|---|
| PP logo (`logo_primary`) | **none** | approved(flag) | — | — | — |
| Sydney bg (`other`) | Pexels | **governed** | needs_scrim | 16:9 | — |
| Brisbane bg (`other`) | Pexels | **governed** | needs_scrim | 16:9 | — |
| Perth bg (`other`) | **none** | approved(flag) | — | — | — |

- **Governance is inconsistent:** Sydney/Brisbane are fully governed + licensed + text-safe-tagged (the **stronger governed candidates**); the **PP logo and Perth bg have no license and no text-safe tag** (weaker — intake-incomplete).
- Backgrounds are `asset_type='other'` (no dedicated `background` type) → slot-type matching must use `usage`/`asset_key`, not `asset_type` alone.
- **No `platform_scope`** on any asset. **No `logo_light`/`logo_dark`** variants (asset_type enum supports them; none governed).
- Under the fail-closed policy, **only Sydney + Brisbane are production-eligible today** — the policy correctly surfaces the intake gaps rather than rendering with ungoverned assets. These gaps are **Asset Intake backfill items** (see PK decision 5), not defects of Selection.

## 4. Slot → asset-type → eligibility matrix (live slots)

| Slot | Accepts | Eligibility checks | Signal available today |
|---|---|---|---|
| `Background.source` | image/background (`usage=background`) | client · license valid+unexpired · aspect fits target · **text-safe** (`safe_for_text_overlay`) · active+approved | partial (Sydney/Brisbane only) |
| `Logo.source` | logo (`logo_primary`/`light`/`dark`) | client · brand-approved · license · **variant matches template bg** (light-on-dark) | single logo; no variants; no license |
| `FaceObject.source` | image (presenter/subject) | client · **release/consent** (people) · platform · aspect | none governed yet |

*(Broll/Music/Avatar/SlideImage/Icon carried as future matrix rows — not implemented, no live slots.)*

## 5. Decision order (filter → rank → return-or-fail)

```
1. Filter by client
2. Filter by rights / license (present · valid · not expired · release/consent where people)
3. Filter by template slot type (usage/asset_type ↔ slot)
4. Filter by platform / format   [no platform_scope data yet → permissive-until-backfilled + visible warning]
5. Filter by size / aspect       [source vs target; Creatomate crops → loose]
6. Filter by safety / release    [text-safe adequate for slot text-load · NOT output-as-input · consent]
7. Rank by brand fit + freshness (+ text-safe suitability: true > needs_scrim > false; recently-unused)
8. Return selected asset — else FAIL CLOSED (production) / neutral placeholder (smoke)
```

## 6. Fail-closed policy

- **Production:** no governed eligible asset for a **required** slot → **STOP** (no render). Explicit triggers: unknown license · expired license · wrong client · missing release/consent · unsuitable platform · unsafe asset · **output-as-input** (never feed a rendered/published output back as a source).
- **Smoke:** neutral synthetic placeholder allowed **for testing only** (never brand-ready — the TMR G2 lesson).

## 7. Slice-1 proposal

A **read-only** resolver — `resolve_slot_assets(client, platform, format, provider_template_id)` → `{modifications: {Background.source, Logo.source, Scrim.opacity}}` **or** a fail-closed reason + status. **Off the production render path** (workers unchanged; resolver is testable in isolation first). Covers essentially the whole live library (Background + Logo). Maps `safe_for_text_overlay` → `Scrim.opacity` (`needs_scrim`→~64 · `true`→lighter · `false`→reject/heavy). Slice-1 uses the single existing logo where allowed and **records the missing `logo_light`/`logo_dark` variants**.

---

## 8. PK decisions (ratified 2026-07-02)

1. **Where it runs:** Asset Selection runs as a **new read-only RPC**, **not inside the worker**.
2. **Logo variants:** **deferred to Asset Intake.** Slice-1 may use the current single logo **only where allowed**, and **must record the missing `logo_light`/`logo_dark` variants**.
3. **Missing required brand logo:** **production STOP, not warning.** Smoke may use a neutral placeholder.
4. **Platform filtering:** **permissive-until-backfilled**, but **must return a visible warning/status** (no silent pass).
5. **Licensing/rights:** **strict production rules are NOT relaxed.** The PP-logo and Perth-background gaps are **Asset Intake backfill items** — surfaced, not ignored, not worked around.

## 9. Boundary held / next (parked — do NOT start)

- **No** schema · DB mutation · render · proof event · publish · enablement · binding · platform_safe · production_proven · Format Mix claim.
- **Do NOT start yet:** the RPC build (Slice-1); the Asset Intake backfill (PP logo license, Perth governance, logo variants); the Template Selection design. Each is a separate future lane behind its own PK gate.
