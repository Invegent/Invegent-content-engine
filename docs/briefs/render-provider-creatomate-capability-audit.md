# Brief — Render Provider Capability Audit: Creatomate (docs-only)

**Created:** 2026-06-20 Sydney
**Author:** chat (Session 1, docs/register reconciliation owner)
**Status:** PLANNING / AUDIT RECORD — docs-only. Records the read-only Creatomate provider-specialist
audit. **Implements nothing.**
**Class:** `docs_only` — 0 DB / 0 migration / 0 code / 0 RPC / 0 EF deploy / 0 provider/Creatomate call /
0 token / 0 render creation / 0 marker write / 0 selection change / 0 AGP activation.

> **Terminology:** ICE = the Invegent Content Engine **product**; Invegent = company/platform owner.
> Companions: `character-model-v0-brand-host-designation.md`, `creative-render-intelligence-character-architecture.md`,
> `render-provider-heygen-capability-audit.md`. Creatomate is the **composition-based** render provider.

---

## 1. How ICE uses Creatomate

- **ICE uses Creatomate SOURCE mode, NOT templates.** `video-worker` builds the **full composition JSON
  in code** (the source object), rather than referencing a Creatomate-hosted template.
- **Path:** the **kinetic / stat non-avatar** video formats (the non-HeyGen video paths).
- **Elements used:** text, shape, image, audio; **manual captions** (built in code, not Creatomate
  auto-subtitles); **ElevenLabs TTS** for the voice formats.
- **Output:** **hardcoded `1080x1920`** mp4 (9:16).
- **Composition-based:** the render is a **composition** (a scene graph of elements), not an identity —
  the contrast with HeyGen's identity-based path, and why both need different RI adapters.

## 2. Cost / telemetry

- **Creatomate DOES return credits / cost** (unlike HeyGen) — so cost is available on this path.
- **But `render_spec` is currently null** in `m.post_render_log` for the Creatomate path → the
  per-render detail (provider job, dimensions, element/cost breakdown) is not captured. Observability gap.

## 3. Major reliability risk

- **Blocking in-request poll near the Supabase EF time limit.** `video-worker` polls the Creatomate
  render **synchronously within the request**, which can run up against the ~150s Edge Function
  wall-clock — the **same failure class** that hit `insights-worker` and was fixed for HeyGen via the
  async submit/poll split. This is the top reliability concern on the Creatomate path.

## 4. Recommended safe future slice (DO NOT IMPLEMENT YET)

- **Creatomate `render_spec` enrichment — observability-only.** Populate `m.post_render_log.render_spec`
  with the Creatomate provider job id, dimensions, returned credits/cost, and element summary
  (capture data already in hand; no new provider call). Closes the telemetry gap without touching the
  render path's behaviour.

## 5. Larger reliability follow-up (DEFERRED, its own gated lane)

- **Async-ify Creatomate polling** using the **HeyGen-style submit/poll pattern** (decouple submit from
  poll across cron ticks) to remove the in-request wall-clock risk (§3). This is a behavioural change to
  `video-worker` → a separate PK-gated code lane with external review + a deploy gate (`--no-verify-jwt`
  where applicable). NOT this lane.

## 6. Deferred items (NOT in any near slice)

- Creatomate **templates / modifications**; **auto-subtitles** (vs the current manual captions);
  **webhooks** (vs polling); **video overlay**; **new aspect ratios** (beyond the hardcoded 1080x1920).

## 7. Shared Render Intelligence abstraction (HeyGen ↔ Creatomate)

- **Creatomate = composition-based provider.** **HeyGen = identity-based provider** (see
  `render-provider-heygen-capability-audit.md`).
- A future **provider-neutral RI interface** should model: **submit · poll · cost (reported vs
  estimated) · capabilities · renderMode (identity vs composition)**. (Note the asymmetry the interface
  must absorb: Creatomate **reports** cost; HeyGen cost is **estimated** — see the HeyGen brief §5.)
- **`m.post_render_log` remains the telemetry spine** for all providers.
- **Provider-specific IDs and payloads stay inside adapters** (Creatomate composition JSON + provider
  job id stay in the Creatomate adapter; never leak into the provider-neutral layer).

## 8. Scope / non-goals + provenance

Docs only. No provider/Creatomate call, no token use, no DB mutation, no migration, no code/RPC change,
no EF deploy, no render creation, no marker update, no selection change, no AGP activation. Audit
findings recorded as relayed from the read-only Creatomate provider-specialist audit; the `render_spec`
enrichment slice (§4) and the async-poll follow-up (§5) are future PK-gated lanes. CE HEAD `9fb2de1`
(0/0) at authoring.
