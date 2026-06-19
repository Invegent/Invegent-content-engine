# Brief — Render Provider Capability Audit: HeyGen (docs-only)

**Created:** 2026-06-20 Sydney
**Author:** chat (Session 1, docs/register reconciliation owner)
**Status:** PLANNING / AUDIT RECORD — docs-only. Records the read-only HeyGen provider-specialist audit.
**Implements nothing.**
**Class:** `docs_only` — 0 DB / 0 migration / 0 code / 0 RPC / 0 EF deploy / 0 provider/HeyGen call /
0 token / 0 render creation / 0 avatar-asset creation / 0 marker write / 0 selection change / 0 AGP
activation.

> **Terminology:** ICE = the Invegent Content Engine **product**; Invegent = company/platform owner.
> Companions: `character-model-v0-brand-host-designation.md`, `creative-render-intelligence-character-architecture.md`.
> HeyGen is the **identity-based** render provider in the Render Intelligence (RI) model.

---

## 1. ICE has TWO HeyGen surfaces

| Surface | Functions | Role |
|---|---|---|
| **(1) Render path** | `heygen-worker` | turns an approved avatar draft into a rendered video |
| **(2) Asset-provisioning path** | `heygen-avatar-creator` / `heygen-avatar-poller` | provisions the avatar ASSETS (photo-avatar generation/training/grouping/look extraction) |

These are **distinct concerns** — RI is concerned mainly with surface (1); surface (2) is upstream
asset creation and carries extra caution (see §6).

## 2. Render path — `heygen-worker` (the live render surface)

- Inputs: **`talking_photo_id` + `voice_id` + text TTS** (single text input), **single scene**, background
  colour.
- Output: **hardcoded `720x1280`** (9:16 portrait, Shorts-native), mp4.
- Lifecycle: async two-phase **submit → poll** (v2.0.0+), terminal `generated | failed | timeout`.
- **HeyGen is identity-based:** the render is keyed to an avatar **identity** (the talking-photo/voice
  pair), not a composition. This is the natural home for the Character Model v0 host identity →
  provider-identity resolution (RI side).
- **Cost is opaque at render time** — the HeyGen render API does not return per-render cost;
  `credits_used` is currently **null** in `m.post_render_log` (verified: the deployed heygen-worker
  writeRenderLog sets `p_credits_used: null`).

## 3. Asset-provisioning path — `heygen-avatar-creator` / `heygen-avatar-poller`

- Uses HeyGen **photo-avatar** generate / train / group / **look extraction** to provision new avatar
  assets.
- **Risk flagged:** includes a **reverse-engineered `api2.heygen.com` look endpoint** — an undocumented
  surface that could change/break without notice. Treat as fragile.
- These are the functions that create the `c.brand_avatar` substrate the render path later consumes.

## 4. Cost / telemetry gap

- At render time, HeyGen cost is not exposed → `credits_used` null. This is the main observability gap
  for RI on the HeyGen path.

## 5. Recommended safe future slice (DO NOT IMPLEMENT YET)

- **Estimated render-cost telemetry — NO provider call.** Derive an *estimated* HeyGen render cost from
  known inputs (duration / text length / dimension) and record it alongside the render in
  `m.post_render_log` (observability-only). No HeyGen API call, no schema-breaking change. This closes
  the cost-visibility gap without depending on an API that doesn't return cost.

## 6. Larger / deferred items (NOT in any near slice)

- Configurable **dimensions** (beyond the hardcoded 720x1280); **multi-character** scenes; **templates**;
  **webhooks** (vs polling); **captions**; **quota / usage API**; provisioning **new assets**.
- **Asset-provisioning functions (`heygen-avatar-creator` / `heygen-avatar-poller`) are standing
  "DO NOT REDEPLOY" functions** — they require **extra caution** (the reverse-engineered look endpoint
  + the fact they mutate the avatar substrate). Any change to them is its own high-caution PK-gated lane.

## 7. Shared Render Intelligence abstraction (HeyGen ↔ Creatomate)

- **HeyGen = identity-based provider.** **Creatomate = composition-based provider** (see
  `render-provider-creatomate-capability-audit.md`).
- A future **provider-neutral RI interface** should model: **submit · poll · cost (reported vs
  estimated) · capabilities · renderMode (identity vs composition)**.
- **`m.post_render_log` remains the telemetry spine** for all providers.
- **Provider-specific IDs and payloads stay inside adapters** (HeyGen talking_photo/voice ids + scene
  payload stay in the HeyGen adapter; never leak into the provider-neutral layer).

## 8. Scope / non-goals + provenance

Docs only. No provider/HeyGen call, no token use, no DB mutation, no migration, no code/RPC change, no
EF deploy, no render creation, no avatar-asset creation, no marker update, no selection change, no AGP
activation. Audit findings recorded as relayed from the read-only HeyGen provider-specialist audit;
the render-path cost-telemetry slice (§5) is a future PK-gated lane. CE HEAD `9fb2de1` (0/0) at authoring.
