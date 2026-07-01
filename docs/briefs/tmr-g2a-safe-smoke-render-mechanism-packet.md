# TMR G2a — Safe Render Mechanism Packet (Design)

> **Lane:** TMR Template Proof Lifecycle v1 — **G2a** (design/review the render mechanism). **NOT G2 execution.** This lane renders nothing, calls no provider, handles no secret, mutates no DB/storage.
> **Owner:** PK · **Date context:** 2026-07-01 Sydney · **Repo HEAD:** `c01d77e` (== origin/main, 0/0) · **Registers:** v4.63 · **Project (ref only):** `mbkmaxqhsohbtwsqolns`
> **Target:** Creatomate `490ad9ea-7473-49e4-9d3c-e1ae8a12d790` = `news_quote_insight_1x1_v1` (static_image, 1080×1080, family `generic.real_estate.market_insight_card`, valid variant `market_update.v1`).

---

## PK Decision (2026-07-01) — Option A SELECTED

**PK selected Option A** — extend the image-worker with a reviewed `tmr_template_smoke` branch. **Option C (Claude/ChatGPT handling the Creatomate secret) is PERMANENTLY REJECTED.** **Option D (PK-run manual render) is retained ONLY as a fallback if Option A becomes technically blocked.**

**Rationale:** durable governed path (a reviewed first-class capability, not a one-off) · reusable for future TMR smoke renders (not just `490ad9ea…`) · no Claude/ChatGPT secret handling (Creatomate key stays inside Edge Function secrets) · aligns with the existing image-worker smoke pattern (proven B0 `_smoke/` mechanism) · avoids production-coupled render logs (writes no `m.post_render_log` row) · preserves G2/G3/G4/G5 gate separation.

The `tmr_template_smoke` branch must: render **only** `490ad9ea-7473-49e4-9d3c-e1ae8a12d790`; synthetic data only; output **only** to `_smoke/tmr/news_quote_insight_1x1_v1/<run-id>/`; keep the Creatomate secret inside EF secrets; create **no** production draft / `m.post_render_log` / `m.post_publish` / proof event / `record_tmr_proof_event(...)` call / publish / enable / bind / `platform_safe` / `production_proven` / `platform_render` / `platform_publish` claim.

---

## 0. Preflight Result

PASS. branch `main`; `HEAD == origin/main == c01d77e`; ahead/behind `0/0`; registers **v4.63**; tree clean except known scrap. Read-only DB: `record_tmr_proof_event` live (anon/auth EXECUTE false, service_role true); **proof rows 0**; target `lifecycle_rollup=platform_candidate`; `proof_summary=[]`; **0 `smoke_render` events**; no G2 smoke output exists. Non-claims intact (not render/publish/production-proven, not platform-safe, not enabled, not bound, not Format Mix eligible).

## 1. Render mechanism options (evaluated)

**Grounding (image-worker `supabase/functions/image-worker/index.ts`):** it **already renders from a Creatomate `template_id`** — `CREATOMATE_API='https://api.creatomate.com/v2/renders'`; the manual/smoke branches build `renderScript = { template_id, modifications, output_format }` (e.g. B0 `48cba556…`, `NEWS_STATIC_CENTERED_SCRIM_1x1`). There is a proven **`mode==='template_smoke'` / B0** branch that renders to a **`_smoke/…` storage path only**, non-publishing, governed-only, fail-loud — the Branch-B-Proof/B0 mechanism (proven live 2026-06-24/25). The Creatomate secret lives **inside the Edge Function** (env), never in repo/Claude.

| Option | What it is | Secret handling | Writes `m.post_render_log`? | Verdict |
|---|---|---|---|---|
| **A. Extend image-worker with a reviewed smoke-only template-id branch** | New `mode` (e.g. `tmr_template_smoke`) that renders `490ad9ea…` with a synthetic modifications builder → `_smoke/tmr/…` only | Secret stays **inside the EF** — Claude never reads/handles it ✅ | **Must be designed to write NONE** (see §3 note) | **RECOMMENDED** |
| B. Purpose-built `_smoke/`-only Edge Function | A brand-new tiny EF that only does template-id smoke renders | Secret inside the new EF ✅ | none (by design) | Viable but more surface than A; A reuses proven code |
| C. Direct Creatomate API call through a reviewed harness (Claude-run) | Claude curls `/v2/renders` | **Claude would need the API key** ❌ | none | **REJECTED** — violates "Claude must not read/handle the secret" |
| D. PK/manual external render | PK runs the render (Creatomate UI/API) and returns the `_smoke/` object/URL | Secret stays with PK, never Claude ✅ | none | **Viable fallback** — safest re: secret, no code; manual |

**Two hard facts that shape the choice:**
1. The existing `template_smoke`/B0 branch renders only **specific hardcoded** template-ids — **`490ad9ea…` is not wired**. Rendering it needs new (reviewed) code: a synthetic-modifications builder for this template's fields + wiring the template-id.
2. The existing `template_smoke` branch **writes an `m.post_render_log` row** (governed `ice_format_key`, `logMustSucceed=true`). **G2 forbids creating `m.post_render_log`**, and the TMR template has **no governed `ice_format_key`** (`market_update.v1.format_key` is NULL). So the mechanism used for G2 **must skip the render-log write entirely** — evidence is the `_smoke/` object only (this is the key delta from B0). *(IMPLEMENTATION-LANE VERIFY: confirm exactly where/how the smoke branch calls `write_render_log` and that a new `tmr_template_smoke` branch can bypass it cleanly — ef-builder + security review.)*

## 2. Recommended path

**Option A — extend image-worker with a reviewed, smoke-only, template-id branch for `490ad9ea…`**, because it (i) reuses the **proven** non-publishing `_smoke/` mechanism, (ii) keeps the **Creatomate secret entirely inside the Edge Function** (Claude never reads/prints/stores it), and (iii) can be designed to write **no `m.post_render_log`** row.

- New request `mode` (e.g. `tmr_template_smoke`), gated + additive; renders `template_id='490ad9ea…'` with a synthetic `modifications` map → storage `_smoke/tmr/news_quote_insight_1x1_v1/<run-id>/`.
- **No** `write_render_log` call, **no** draft, **no** publish, **no** `ice_format_key` requirement.
- Because this is **runtime/Edge-Function code touching a secret-adjacent path**, Option A is an **implementation packet** (ef-builder to write it → security-auditor for EF/secret/runtime → db-rls-auditor for the storage/RLS and the "no post_render_log" guarantee → external review → **PK deploy gate**), then G2 execution = invoking the deployed EF with the synthetic smoke payload.

**Fallback: Option D (PK-run manual render)** if you'd rather avoid an EF change for a one-off — PK renders `490ad9ea…` with the §5 synthetic data to a `_smoke/` object and hands back the safe reference; G2 then just records that reference. Zero Claude secret handling, zero code.

**Preferred principle honored:** Claude Code must not read, print, store, or handle the Creatomate API secret. Under A it stays in EF secrets; under D it stays with PK. Option C (Claude handling the key) is rejected.

## 3. Exact boundary (the mechanism must)

- Render **only** the target template id `490ad9ea-7473-49e4-9d3c-e1ae8a12d790`.
- Use **synthetic data only** (§5).
- Write/reference **only** `_smoke/tmr/news_quote_insight_1x1_v1/<run-id>/`.
- Create **no** production draft · **no** `m.post_render_log` row · **no** `m.post_publish` row · **no** proof event · call **no** `record_tmr_proof_event(...)` · publish nothing · enable nothing · bind nothing · make **no** `platform_safe` / `production_proven` claim.
- Store **no** raw Creatomate payload · **no** secrets.

## 4. Evidence model (what G2 will return later)

Safe, id/label/path-grade only — no payload, no secret:
- `provider_render_id` (Creatomate render id) — if safe to surface.
- `storage_object_path` = `_smoke/tmr/news_quote_insight_1x1_v1/<run-id>/<file>.jpg`.
- `generated_image_url` — the `_smoke/` object URL, if safe to share for PK viewing.
- `run_id` + `timestamp`.
- `synthetic_data_label` (e.g. "Synthetic smoke test — not for publication").
- `output_dimensions` (assert 1080×1080), `status` (succeeded/failed), `render_duration_ms`, optional content hash.
- **Explicitly excluded:** raw provider request/response payload, API key, any client-real data. This evidence reference is what a **future G3** would pass to `record_tmr_proof_event(smoke_render, …)` — but G3 is a separate gate, not this lane.

## 5. Review requirements (before G2 execution)

Driven by which path is chosen:
- **Option A (EF code):** `ef-builder` (write the smoke-only branch, local-only) → **`security-auditor`** (Edge Function, secret handling, runtime code, external-API handling, no-secret-leak, `verify_jwt`/`x-series-key`) → **`db-rls-auditor`** (confirm the branch writes **no** `m.post_render_log` / no DB mutation, and the `_smoke/` storage/RLS posture) → **external review** on the final diff/deploy plan → **PK deploy gate** (deploy image-worker with `--no-verify-jwt` per the standing gotcha) → then a **separate PK G2 execution gate** to invoke it.
- **Option D (PK-run manual):** no code review needed; just confirm the synthetic data + `_smoke/` path with PK, then PK renders and returns the reference.
- **All paths:** external review of the final mechanism packet; **PK exact approval before any execution**; render remains an irreversible/external action gated by PK.

## 6. Execution gates (kept separate)

- **G2a** = design/review the render mechanism *(this lane — docs only)*.
- **G2** = run the safe `_smoke/` render *(separate PK gate; needs A deployed or D performed)*.
- **G3** = record `smoke_render` proof event via `record_tmr_proof_event(...)` *(separate PK gate)*.
- **G4** = PK visual review *(human gate)*.
- **G5** = record `visual_approval` proof event *(separate PK gate)*.

## 7. Hard boundaries (this G2a lane)

No render · no provider call · no secret access · no runtime code (this lane is design-only; runtime code is the *next* implementation packet if Option A is chosen) · no DB mutation · no migration · no storage write · no proof event · no publish · no enablement · no binding · no dashboard work · no G3/G4/G5. Nothing was rendered, called, or mutated — read-only preflight + this doc only.

## 8. Verdict

```
READY_FOR_PK_REVIEW
```

The safe render path is designable and the secret can stay out of Claude's hands. Recommended: **Option A** (reviewed smoke-only image-worker branch) → an **implementation packet** next; or **Option D** (PK-run manual render) if you prefer no code for a one-off. Either way, G2 execution stays a separate PK gate; nothing here renders or claims proof.

## 9. Recommended Next Lane

**PK-LOCKED (Option A):** `TMR G2b — Smoke-Render Implementation Packet` — ef-builder writes the `tmr_template_smoke` branch (local-only, isolated worktree), then security-auditor → db-rls-auditor → external review → **PK deploy gate**; **G2 execution follows as its own separate PK gate**. **Option C permanently rejected. Option D retained only as a fallback if Option A becomes technically blocked.** **Not authorized here or in G2b:** any render, deploy, or proof insertion without the respective PK gate. G2a ends at PK review — **do not start G2b until PK separately approves.**
