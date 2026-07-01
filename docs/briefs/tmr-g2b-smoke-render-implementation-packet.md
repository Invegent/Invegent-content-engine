# TMR G2b — Smoke-Render Implementation Packet

> **Lane:** TMR Template Proof Lifecycle v1 — **G2b** (implementation packet / reviewed patch plan). **NOT deploy, NOT render, NOT G2 execution.** Packet/design only.
> **Owner:** PK · **Date context:** 2026-07-01 Sydney · **Repo HEAD:** `aedca96` (== origin/main, 0/0) · **Registers:** v4.64 · **Project (ref only):** `mbkmaxqhsohbtwsqolns`
> **Target:** Creatomate `490ad9ea-7473-49e4-9d3c-e1ae8a12d790` = `news_quote_insight_1x1_v1` (static_image, 1080×1080, family `generic.real_estate.market_insight_card`, valid variant `market_update.v1`).

---

## 1. Preflight Result

PASS. branch `main`; `HEAD == origin/main == aedca96`; ahead/behind `0/0`; registers **v4.64**; tree clean except known scrap. Read-only DB: proof rows **0**; target `lifecycle_rollup=platform_candidate`; `proof_summary=[]`; `record_tmr_proof_event` live (service_role EXECUTE true, anon false). Image-worker current repo version **v3.19.0** identified; existing B0/`_smoke/` path + Creatomate template-id render behaviour inspected (below). G2 has rendered nothing; G3/G4/G5 not started.

## 2. Current Baseline

Option A (G2a v4.64) is selected: a reviewed image-worker `tmr_template_smoke` branch. The template remains a governed **inventory candidate** — not render/publish/production-proven, not platform-safe, not enabled, not bound, not Format Mix eligible. This lane produces a reviewed patch plan only; no code is written, deployed, or run here.

## 3. Existing Image-Worker Smoke Path Findings

Source: `supabase/functions/image-worker/index.ts` (v3.19.0).
- **Auth:** the EF requires header `x-image-worker-key` == env `PUBLISHER_API_KEY` (`:461-463`). Secrets are EF env only: `CREATOMATE_API_KEY` (`:464`), `PUBLISHER_API_KEY`, `ANTHROPIC_API_KEY`, `SUPABASE_SERVICE_ROLE_KEY` — all `Deno.env.get(...)`, never in repo/response.
- **Proven smoke pattern (`:474-499`):** `if (body?.mode === 'template_smoke' && body?.template === 'PP_NEWS_CENTRED_SCRIM_16x9_v1')` → builds a `modifications` map with `.text` / `.source` keys → `renderScript = { template_id, modifications, output_format:'jpg' }` → `renderUploadAndLog(...)` → returns `{ storage_url, props_hash }`. Isolated, opt-in, **returns BEFORE production draft selection**. A second manual branch (`isManualRenderRequest`, `:507-542`) follows the same shape via the governed resolver.
- **Creatomate render:** `CREATOMATE_API='https://api.creatomate.com/v2/renders'`; the worker submits `{ template_id, modifications, output_format }` and polls — it **does** render from a stored template-id (just not `490ad9ea…`).
- **⚠️ The blocker mechanism:** `renderUploadAndLog` (`:276`) uploads to bucket **`post-images`** at `storagePath` (`:308`) **and always calls `write_render_log` → writes `m.post_render_log`** (`:313`, `:335`; `logMustSucceed=true` makes a log-write failure hard). Both existing smoke branches pass `iceFormatKey:'image_quote'` and write a render-log row. **This is exactly what G2 forbids.**

## 4. Current Blocker

Two facts, from §3:
1. `490ad9ea…` is **not wired** into any smoke branch (they hardcode other template-ids + modification builders).
2. The shared `renderUploadAndLog` **always writes `m.post_render_log`** and needs a governed `iceFormatKey` — but G2 forbids a render-log row, and `market_update.v1.format_key` is NULL (no governed key).

**Resolution:** a new, isolated `tmr_template_smoke` branch that renders `490ad9ea…` through a **new no-log helper** (`renderUploadSmokeNoLog`) which uploads to `_smoke/tmr/...` and **never calls `write_render_log`** — leaving the production `renderUploadAndLog` byte-unchanged.

## 5. Proposed `tmr_template_smoke` Branch

Additive, opt-in, isolated (mirrors the B0/manual pattern; recommended in a **new module** `supabase/functions/image-worker/tmr_smoke.ts` to keep the `index.ts` diff to an import + one guarded branch). It must:
- run **only** when `body.mode === 'tmr_template_smoke'` **and** `body.provider_template_id === '490ad9ea-7473-49e4-9d3c-e1ae8a12d790'` **and** `body.synthetic_only === true`; else reject (§6).
- return **before** any production draft selection / publish / queue / advisor path.
- render only `template_id='490ad9ea…'` with the **fixed synthetic modifications** (§7), `output_format` per §8.
- use `CREATOMATE_API_KEY` from EF env only — never logged, never returned, never in docs.
- upload output only to `_smoke/tmr/news_quote_insight_1x1_v1/<run-id>/` in the `post-images` bucket, via the **new `renderUploadSmokeNoLog`** helper.
- **write no `m.post_render_log`**, **no `m.post_publish`**, **no** draft, **no** proof event; call **no** `record_tmr_proof_event(...)`; publish/enable/bind nothing; make no platform_safe / platform_render / platform_publish / production_proven claim.
- return only the safe evidence shape (§8).

## 6. Request / Trigger Shape

```json
{
  "mode": "tmr_template_smoke",
  "provider_template_id": "490ad9ea-7473-49e4-9d3c-e1ae8a12d790",
  "provider_template_name": "news_quote_insight_1x1_v1",
  "run_label": "tmr-g2-smoke",
  "synthetic_only": true
}
```

**Hard guards — the branch MUST reject (400) any request that:**
- has any other `provider_template_id` (allowlist = the single id only).
- is missing `synthetic_only === true`.
- has an unknown/mismatched `mode`.
- tries to pass an arbitrary template id or `template`.
- asks for publish, enablement, binding, or proof insertion.
- provides raw provider payload / `modifications` overrides (no passthrough — modifications are fixed synthetic, server-side).
- attempts a production storage path (anything not under `_smoke/tmr/...`).

## 7. Synthetic Data Contract

Template `490ad9ea…` real elements (from the TMR field inventory): **Headline, Subtitle, CategoryBadge, Location, Date, Footer** (text) + **Background, Logo** (image) + **Scrim** (static shape, no modification). Fixed, server-side synthetic modifications (no live stats, no publishable/production claim):

| Creatomate key | Synthetic value |
|---|---|
| `Headline.text` | `Sydney Market Snapshot` |
| `Subtitle.text` | `Clearance rates held steady this week as buyer demand remained selective.` |
| `CategoryBadge.text` | `SAMPLE DATA ONLY` |
| `Location.text` | `Property Pulse` |
| `Date.text` | `Smoke test — not for publication` |
| `Footer.text` | `TMR G2 smoke render` |
| `Background.source` | **neutral synthetic placeholder** under `…/<run-id>/inputs/` (R1 SETTLED — generated at execution or reviewed static fixture; never a real/brand/stock/prior-output asset) |
| `Logo.source` | **neutral synthetic placeholder** under `…/<run-id>/inputs/` (R1 SETTLED — same rule; never a real client logo) |

`Scrim` is static (not dynamic) — no modification. No `metric_label`/`source_label`/`client_label` element exists on this template; the directive's labels are mapped to the real elements above (CategoryBadge = "SAMPLE DATA ONLY", Location = "Property Pulse", Footer = "TMR G2 smoke render", Date = the not-for-publication marker). **ef-builder to confirm exact element/key names against the live template before deploy.**

## 8. Storage and Evidence Contract

**Paths (only), in the `post-images` bucket** (`_smoke/` = established non-production prefix; `<run-id>` = generated id/timestamp):
- **inputs (neutral synthetic placeholders — R1):** `_smoke/tmr/news_quote_insight_1x1_v1/<run-id>/inputs/`
- **output:** `_smoke/tmr/news_quote_insight_1x1_v1/<run-id>/output/` (e.g. `output/output.<ext>`; `<ext>` jpg per B0 default or png per the directive example — ef-builder picks; dimensions 1080×1080).

**Returned evidence shape (safe, id/label/path-grade only):**
```json
{
  "gate": "G2",
  "result": "success",
  "provider": "creatomate",
  "provider_template_id": "490ad9ea-7473-49e4-9d3c-e1ae8a12d790",
  "provider_render_id": "<safe-id-if-available>",
  "smoke_storage_path": "_smoke/tmr/news_quote_insight_1x1_v1/<run-id>/output/output.jpg",
  "dimensions": "1080x1080",
  "synthetic_only": true,
  "proof_event_inserted": false,
  "published": false
}
```

**Must NOT return:** raw Creatomate payload · API key · signed secret-bearing URL · full provider response if it carries sensitive data · production post id · production draft id · `post_render_log` id · `post_publish` id.

## 9. Code Safety Requirements

- **Explicit mode guard** (`tmr_template_smoke` only) + **explicit template-id allowlist** (single id) + **`synthetic_only===true`** required.
- **Explicit `_smoke/tmr/...` output prefix** — hardcoded server-side; no client-supplied path.
- **New no-log helper `renderUploadSmokeNoLog`** — renders + uploads only; **no `write_render_log`**, **no `logMustSucceed`**, **no `m.post_render_log`**, **no `iceFormatKey`**. The shared production `renderUploadAndLog` is **not modified** (byte-unchanged).
- **No** publish-queue path · **no** draft path · **no** proof-event path · **no** `record_tmr_proof_event` call · **no** arbitrary `modifications` passthrough (fixed synthetic only).
- **Safe error handling** — return `{ ok:false, error:<safe reason> }`; **no secret logging**, **no raw provider payload logging** (log only safe ids/labels).
- **Helpers REUSED from B0/existing:** the Creatomate submit+poll logic and the `post-images` storage-upload pattern (`:308`), the props-hash (`crypto.subtle.digest` SHA-256), and the "return before production draft selection" isolation pattern. *(Reused via a new no-log helper that shares the render+upload code but omits the log write.)*
- **Helpers intentionally NOT reused:** `renderUploadAndLog` itself (writes render-log) · `write_render_log` / `logMustSucceed` · `iceFormatKey` (no governed key needed) · `resolve_brand_assets` (no governed asset resolution — synthetic placeholders only) · any draft/queue/publish helper.

## 10. Files Expected to Change

- **New:** `supabase/functions/image-worker/tmr_smoke.ts` — the isolated branch handler + `renderUploadSmokeNoLog` + fixed synthetic modifications (mirrors `manual_render.ts` / `branch_b_proof.ts` isolation).
- **Edit (minimal):** `supabase/functions/image-worker/index.ts` — one import + one guarded branch (`if (body?.mode === 'tmr_template_smoke') { … return; }`) placed **before** production draft selection; version bump. **No change to `renderUploadAndLog` or any production loop.**
- **No** DB migration · **no** dashboard · **no** other file. *(If review finds any DB/storage-policy/grant/migration/proof-RPC surface is actually required, STOP and escalate — see §13.)*

## 11. Versioning and Deployment Plan

- **Current version:** `v3.19.0` (repo). **Proposed:** `v3.20.0` (minor — additive isolated branch).
- **Deploy command (PK-run, at a FUTURE deploy gate):** `supabase functions deploy image-worker --no-verify-jwt` — **`--no-verify-jwt` is mandatory** (standing gotcha: deploying without it flips `verify_jwt→true` and breaks the `x-image-worker-key`-only caller with 401→502).
- **Post-deploy verification (no render):** `GET image-worker` → `version:"v3.20.0"`; negative-guard checks (wrong template-id / missing `synthetic_only` → 400) — these reject without rendering; confirm production branches behave unchanged. **Actually invoking the smoke render is G2 execution, a separate gate — not part of post-deploy verification.**
- **Stops at a future deploy gate. No deploy in G2b.**

## 12. Rollback Plan

Redeploy the prior image-worker (`git checkout <prev commit> -- supabase/functions/image-worker && supabase functions deploy image-worker --no-verify-jwt`), or redeploy the last-good version. The branch is additive + isolated, so rollback is a clean redeploy; it writes no DB rows, so there is no data to reverse. Rollback clarity: high.

## 13. Review Chain

Before any implementation/deploy:
1. **ef-builder** — write the patch (local-only, **isolated worktree**), run local checks.
2. **security-auditor** — secret handling (`CREATOMATE_API_KEY` stays in EF, never logged/returned), runtime isolation, logging safety, external-API safety, no-secret-leak, `verify_jwt`/`x-image-worker-key` posture.
3. **db-rls-auditor** — confirm the branch writes **no `m.post_render_log`** / no DB mutation, and the `post-images` `_smoke/` storage-write posture is safe.
4. **external review** — on the final diff + deploy plan.
5. **PK exact approval** before deploy.

**Escalation rule:** if the patch is found to touch DB tables, storage policy, grants, migrations, or the proof-RPC logic, **STOP and widen the review scope** (this packet asserts it should touch none of those).

## 14. Gate Separation (do not collapse)

- **G2b** = this implementation packet / reviewed patch plan *(here)*.
- **G2b-Apply (a.k.a. G2c)** = deploy the image-worker smoke branch *(separate PK deploy gate)*.
- **G2** = run the safe `_smoke/` render *(separate PK execution gate)*.
- **G3** = record `smoke_render` proof event via `record_tmr_proof_event(...)` *(separate PK gate)*.
- **G4** = PK visual review *(human gate)*.
- **G5** = record `visual_approval` proof event *(separate PK gate)*.

## 15. Risks / Residuals

- **R1 — SETTLED (PK decision 2026-07-01): neutral synthetic placeholder images ONLY.** `Background.source` + `Logo.source` must use neutral synthetic placeholders — either (a) generated by the smoke branch at execution time, or (b) reviewed static synthetic fixtures dedicated to `_smoke/` testing. **Inputs live under `_smoke/tmr/news_quote_insight_1x1_v1/<run-id>/inputs/`; output under `.../output/`.** **PROHIBITED:** real Property Pulse logo · `client_brand_profile.brand_logo_url` · `client_brand_profile.brand_assets` · `brand-assets` bucket · `client-assets` bucket · any stock image · any AI-generated production asset · any prior render output from `post-images` / `post-videos` · `m.post_render_log.storage_url` · `m.post_publish` asset · any production storage path. **Rationale:** G2 is a *physical render smoke test only* — it proves the template can render, NOT brand correctness or asset suitability. **If G2b-Apply cannot safely provide neutral placeholders without touching a real asset or production/output surface, it MUST stop and report BLOCKED.**
- **R2 — no-log helper duplicates render/upload code.** Keep `renderUploadSmokeNoLog` isolated and small; document that it intentionally omits `write_render_log`, to prevent future drift with `renderUploadAndLog`.
- **R3 — output writes to the `post-images` bucket under `_smoke/tmr/`.** Confirm (db-rls-auditor) no publisher/production reader consumes the `_smoke/` prefix (it is the established non-production prefix; existing B0 already uses `_smoke/`).
- **R4 — deploy `verify_jwt` gotcha** (§11) — mandatory `--no-verify-jwt`.
- **R5 — element-name exactness** — the Creatomate modification keys must match the live template elements (§7 mapping is grounded in the field inventory, but ef-builder confirms against the template before deploy).

## 16. Recommended Next Lane

**`TMR G2b-Apply` (image-worker smoke-branch build + deploy)** — ef-builder writes `tmr_smoke.ts` + the guarded `index.ts` branch (isolated worktree) → security-auditor → db-rls-auditor → external review → **PK deploy gate** (`--no-verify-jwt`). Then **G2** execution (run the `_smoke/` render) is its own separate PK gate. **Do not start G2b-Apply until PK separately approves.**

## 17. Final Verdict

```
READY_FOR_PK_REVIEW
```

The patch plan is grounded in the live image-worker (v3.19.0), reuses the proven `_smoke/` pattern, keeps the Creatomate secret inside the EF, and satisfies every G2 boundary (no render-log, no publish, no proof, synthetic-only, allowlisted template, `_smoke/tmr/` output). One real open detail (R1: synthetic Background/Logo sources) is flagged for the build lane. Nothing was written, deployed, rendered, or mutated — read-only inspection + this packet only.
