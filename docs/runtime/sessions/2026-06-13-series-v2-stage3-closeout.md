# 2026-06-13 — Content Series v2 · Stage 3 (series-writer governed fan-out re-point): deploy close-out (PASS)

**Status:** DEPLOYED. PK-approved D-01 `aea8626b-240a-423c-92a1-396aed096fe7` (verdict **agree** / risk **medium** / confidence **high** / proceed, no escalation).
**Brief:** `docs/briefs/content-series-v2-stage3-writer-repoint.md`. First live behaviour-changing Series v2 stage. **No DB migration, no UI, no Advisor/compliance/render/publisher/T2 change.**

---

## 1. Shipped
- **content-engine `main` `32d92f2`** ← merge (`--no-ff`) of `feat/series-v2-stage3-writer-repoint` (`e0023d46`). (Re-merged onto origin/main after a concurrent docs-only commit `52173b7` — the Stage 3 brief authoring — landed; no overlap, no conflict.)
- **Edge function `series-writer` deployed via Supabase CLI** (v1.2.0 → **v1.3.0**). Prior blob `da3d55de` → new blob `fda184c3`.
- Files: `supabase/functions/series-writer/index.ts` + `docs/briefs/series-v2-stage3-validation.mjs` (PGlite harness). No migration, no UI, no other EF.

## 2. Exact writer-path change
- **Removed:** the inner per-platform loop that, per platform, called `writeEpisode` then `rpc("series_post_insert", { … recommended_format: ep.recommended_format ?? 'image_quote' … })` to directly create an `m.post_draft`. The writer no longer references `series_post_insert`.
- **Added:** per episode (one pass) → `writeEpisode` **once** (preserved Anthropic step, primary-platform voice); record `{title, body}` as **audit only** in the EF JSON response (`epResult.audit`) + `console.log` (`ev:"episode_content_generated"`) — **no DB write** → `rpc("fan_out_episode", { p_episode_id, p_created_by: VERSION })`. `fan_out_episode` creates the `intent_kind='episode'` intent, one governed child slot per platform via `m.create_manual_slot_internal`, carries persona into `source_material`, and sets `episode.intent_id` + `status='intent_created'`.
- Counters → `episodes_fanned_out/failed`; series `'writing'` during run → `'active'` (or `'writing'` if any episode failed); error path still resets to `'approved'`.

## 3. Post-deploy verification
- **Live version check:** `GET /functions/v1/series-writer` → `{"ok":true,"function":"series-writer","version":"series-writer-v1.3.0"}`. ✅
- `deno check supabase/functions/series-writer/index.ts` → exit 0. ✅
- **No live series run / no test series / no manual fan_out_episode** was triggered (per PK scope). Behaviour change takes effect on the next operator-initiated series write.

## 4. Validation (pre-deploy)
**PGlite 21/21 PASS** (`docs/briefs/series-v2-stage3-validation.mjs`) — ports the new writer control flow (writeEpisode mocked; all DB calls real) against the REAL Stage 2 objects: single→fan_out; multi-platform→one governed child slot/platform; `intent_id`+`intent_created`; **YouTube gets no image_quote/text child (rejected at fan-out) but does get a valid governed child for a supported format (video_short)**; **Instagram only supported children (no text)**; children enter the governed path (`source_kind=manual`, intent-linked, `canonical_ids=0` → Advisor+compliance downstream); **no direct post_draft / no queue insertion**; `retry_episode` operates on Stage 3 episodes; `get_content_series_detail` shows linked children + derived/series_derived status; legacy series readable; writer never rpc-calls `series_post_insert`; retry never duplicates a published child + re-run does not re-fan; full multi-episode run → `active`. Items 6/7 (Advisor/compliance per child) are inherited from the governed pipeline (proven in T1); to be confirmed by a live trace when the first governed series runs.

## 5. Scope / guardrails (held)
Edge-function re-point ONLY. NOT touched: DB (no migration), UI, `fan_out_episode`/`retry_episode`/`create_creative_intent`/`get_content_series_detail`/`get_series_episodes` (reused unchanged), ai-worker, Advisor, compliance, render, publishers, scheduling, T2. `series_post_insert` retained in the DB for rollback (off the writer path). No live run / test series / manual fan-out performed.

## 6. Constraint-forced choice (recorded per PK)
`writeEpisode` output is **audit-only** — surfaced in the EF response + logs, **not persisted to the DB** (schema `c` is not REST-exposed and the only episode-writer is `series_post_insert`, which is being removed; adding a persist RPC/column would be a DB migration, out of scope). The episode transitions **outline → intent_created via `fan_out_episode`**; the intermediate **`writing` is carried at the series level** only (existing `update_series_status`). No new status values introduced.

## 7. Rollback (simple, no DB)
Redeploy prior **series-writer-v1.2.0** (git blob `da3d55de`) via Supabase CLI:
```
git checkout da3d55de -- supabase/functions/series-writer/index.ts
supabase functions deploy series-writer --project-ref mbkmaxqhsohbtwsqolns
```
No DB rollback; no Stage 1/2 rollback. `series_post_insert` is still present, so the prior writer works immediately.

## 8. Next (NOT started — separately gated)
Stage 4 = UI (persona fields, per-child outcome surface, retry control). First live governed series run + Advisor/compliance-per-child trace to be performed when PK authorizes. Register reconciliation for the Studio/Series line remains held.
