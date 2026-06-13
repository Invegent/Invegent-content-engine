# 2026-06-13 — Content Series v2 · Stage 2 (fan-out + retry RPCs, extended detail, approve fix): deploy close-out (PASS)

**Status:** DEPLOYED. PK-approved D-01 `07a1a21a-43a8-4e9d-9c68-0835781f852e` (verdict **agree** / risk **medium** / confidence **high** / proceed, no escalation).
**Brief:** `docs/briefs/content-series-v2-t1-integration.md` §4/§8/§9/§10 (Stage 2 only). RPC/API foundation — **does NOT re-point the live series writer** (Stage 3, separately gated).

---

## 1. Shipped
- **content-engine `main` `4c37251`** ← merge (`--no-ff`) of `feat/series-v2-stage2-rpc` (`96241bbe`).
- Migration **`20260613120000_series_v2_stage2_fanout_retry_detail.sql`** applied to prod `mbkmaxqhsohbtwsqolns` (`apply_migration` → `{success:true}`).
- Files (migration-only): the migration SQL + `docs/briefs/series-v2-stage2-validation.mjs` (PGlite harness). No application/EF/UI code.

## 2. What shipped
| Object | Change |
|---|---|
| `public.fan_out_episode(uuid,text,timestamptz)` | **NEW** — builds one `intent_kind='episode'` intent + one governed child slot per platform via the existing `m.create_manual_slot_internal`; carries persona into `source_material`+brief; links `episode.intent_id`, sets `status='intent_created'`. No direct draft/queue insert; no `series_post_insert`; `canonical_ids` empty (`selected_canonical_ids_count=0`). SECURITY DEFINER, service-role only. |
| `public.retry_episode(uuid,text,text)` | **NEW** — `refan_out` / `retry_failed_children`; NULL-safe per-platform health; never re-creates when a published or in-flight child exists; `regenerate_outline_item` gated to Stage 3. Never deletes published content. SECURITY DEFINER, service-role only. |
| `public.get_content_series_detail(uuid)` | **REPLACED** (extended, backward-compatible) — keeps all legacy keys incl. `platform_statuses`; adds per-episode `intent_id`/persona/`children`(delegated)/`derived_status`, plus `series_derived_status`. Derive-on-read. |
| `public.approve_series_outline(uuid,text)` | **REPLACED** (messaging fix) — already-approved/writing/active no longer surfaces as a failure; `outline_ready→approved` success shape preserved. |
| `m.creative_intent.intent_kind` CHECK | **WIDENED** += `'episode'` (additive) |
| `c.content_series_episode.status` CHECK | **WIDENED** += `'intent_created'` (additive) |

## 3. Post-deploy verification (live prod, read-only — no fan-out/retry executed, no test series created)
- **fan_out_episode / retry_episode exist** — correct signatures, `prosecdef=true`, `service_role` EXECUTE, **0** anon/authenticated/PUBLIC grants. ✅
- **`intent_kind` CHECK** = `('single','package','episode')`. ✅
- **episode `status` CHECK** = `('outline','writing','draft_ready','published','intent_created')`. ✅
- **`approve_series_outline`** contains the `already_approved` messaging fix. ✅
- **`get_content_series_detail`** contains `series_derived_status` (extension) AND still `platform_statuses` (legacy). Executes cleanly on a real existing series and returns `episodes` as an array + the new keys. ✅
- **Byte-identical guarantees (md5, pre vs post):** `create_creative_intent` `15ccd557…` = `15ccd557…` (UNCHANGED); `get_series_episodes` `265feb39…` = `265feb39…` (UNCHANGED). ✅
- **Deploy is inert:** `episodes_with_intent=0`, `episodes_intent_created=0`, `episode_intents=0` — nothing was fanned out; existing data untouched. ✅

## 4. Validation (pre-deploy)
PGlite harness **40/40 PASS** (`docs/briefs/series-v2-stage2-validation.mjs`): approve fix + no regression; fan_out creates episode-intent + child slots (kind=episode, intent_id+intent_created, persona in source_material AND brief, `canonical_ids`=0, NO post_draft/queue write, idempotency guard, unsupported YouTube rejected→partial); extended detail (intent_id+persona+children+derived_status, legacy backward-compat); derived in_flight/partial/complete/failed; retry recreates failed-only / skips published (no dup) / preserves in-flight / gates regenerate_outline_item; guardrails (no `series_post_insert(` call, `get_series_episodes` unchanged, `create_creative_intent` not redefined). A three-valued-logic bug in the child classifier (NULL publish/approval → dropped row) was caught by the harness and fixed (COALESCE / IS DISTINCT FROM) before D-01.

## 5. Scope / guardrails (held)
Stage 2 **only**. NOT touched: series-writer EF re-point, automatic use by the live writer, `get_series_episodes`, `create_creative_intent`, `get_creative_intent_detail` (called only), `m.create_manual_slot_internal` (reused, not changed), ai-worker, Advisor, compliance, render, publishers, scheduling redesign, UI, T2, register reconciliation. No `fan_out_episode` run on production data; no verification series created; no retries triggered.

## 6. Rollback (simple; Stage 1 columns + Stage 1 stay)
```sql
DROP FUNCTION IF EXISTS public.fan_out_episode(uuid,text,timestamptz);
DROP FUNCTION IF EXISTS public.retry_episode(uuid,text,text);
-- restore prior bodies (captured pre-deploy by md5):
--   public.get_content_series_detail(uuid)  prior md5 33387498411e67072d23f49f8a906747
--   public.approve_series_outline(uuid,text) prior md5 42db8b870e126a9654420f972b5e6adb
-- (both available verbatim in the session transcript / git history)
ALTER TABLE c.content_series_episode DROP CONSTRAINT content_series_episode_status_check;
ALTER TABLE c.content_series_episode ADD  CONSTRAINT content_series_episode_status_check
  CHECK (status = ANY (ARRAY['outline','writing','draft_ready','published']));
ALTER TABLE m.creative_intent DROP CONSTRAINT creative_intent_intent_kind_check;
ALTER TABLE m.creative_intent ADD  CONSTRAINT creative_intent_intent_kind_check
  CHECK (intent_kind = ANY (ARRAY['single','package']));
```
No data migration needed (deploy left 0 episode intents). Reverting the `intent_kind` CHECK requires no `'episode'` rows to remain — clean up any test intents first.

## 7. Next (NOT started — separately gated)
Stage 3 = series-writer EF re-pointed from `series_post_insert` to per-episode `fan_out_episode`; capability-resolver-gated formats. Stage 4 = UI (persona fields, per-child outcome surface, retry control). Each its own commit/D-01/PK phrase. Register reconciliation for the Studio/Series line remains held.
