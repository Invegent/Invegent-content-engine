# 2026-06-13 — Content Series v2 · Stage 1 (additive episode schema): deploy close-out (PASS)

**Status:** DEPLOYED. PK-approved D-01 `02fc8fcf-8496-4618-8953-e20e03de05f9` (verdict **agree** / risk **low** / confidence **high** / proceed, no escalation).
**Brief:** `docs/briefs/content-series-v2-t1-integration.md` §3 + §15 (Stage 1 only). **Additive, nullable, behaviour-inert.** No RPC/EF/UI/pipeline change.

---

## 1. Shipped
- **content-engine `main` `9f03f23`** ← merge (`--no-ff`) of `feat/series-v2-stage1-schema` (`884a9526`).
- Migration **`20260613110000_series_v2_stage1_episode_intent_persona.sql`** applied to prod `mbkmaxqhsohbtwsqolns` (`apply_migration` → `{success:true}`).
- Files added (migration-only): the migration SQL + `docs/briefs/series-v2-stage1-validation.mjs` (PGlite harness). No application code, RPC, EF, or UI touched.

## 2. What the migration does (table `c.content_series_episode`, 46 live rows)
| Object | Definition |
|---|---|
| `intent_id` | `uuid NULL` · FK → `m.creative_intent(intent_id)` **ON DELETE SET NULL** (future episode→intent bridge) |
| `persona_label` | `text NULL` |
| `avatar_preference` | `text NULL` (persona carry only; does **not** override Branch A pin) |
| `persona_notes` | `text NULL` |
| `idx_content_series_episode_intent_id` | partial btree `(intent_id) WHERE intent_id IS NOT NULL` |
| 4× `COMMENT ON COLUMN` | documentation only |

No NOT NULL / DEFAULT / CHECK / trigger; **no function or RPC body created or modified.**

## 3. Post-deploy verification (live prod, read-only)
- **Pre-migration snapshot:** 46 episodes, 0 of the 4 new columns present, index absent.
- **A — columns:** all 4 present, types `uuid`/`text`, `is_nullable=YES`, `column_default=NULL` for each. ✅
- **B — FK:** `content_series_episode_intent_id_fkey` → `m.creative_intent`, `on_delete = SET NULL`. ✅
- **C — index:** `CREATE INDEX idx_content_series_episode_intent_id … USING btree (intent_id) WHERE (intent_id IS NOT NULL)`. ✅
- **D — legacy rows valid + NULL-backed:** `total_rows=46`, `intent_id_null=46`, `persona_label_null=46`, `avatar_preference_null=46`, `persona_notes_null=46` — every legacy row preserved, every new column NULL. ✅

## 4. Validation (pre-deploy)
PGlite harness **11/11 PASS** (`docs/briefs/series-v2-stage1-validation.mjs`): migration applies cleanly; existing rows preserved (count unchanged); new columns NULL on all existing rows; legacy read projection byte-identical pre/post; legacy-shaped INSERT works (new cols default NULL); episode can carry intent_id+persona; FK rejects a non-existent intent_id; ON DELETE SET NULL preserves episode + persona; partial index created; **0 functions created by the migration**; rollback drops index+4 columns cleanly with episodes intact.

## 5. Behaviour-inert proof
All columns nullable, no default/constraint/trigger; no function/RPC body changed; all 46 existing rows valid and NULL on every new column; existing Series readers/writers project named columns and ignore the additions; ON DELETE SET NULL can only null the bridge, never delete/break an episode. Nothing references an intent yet, so the FK constrains no current data.

## 6. Scope / guardrails (held)
Stage 1 **only**. NOT included: `fan_out_episode`, `retry_episode`, `approve_series_outline` fix, series-writer EF re-point, `series_post_insert` deprecation, UI, T1 creation-from-series, any Advisor/compliance/render/publisher/scheduling change, T2, register reconciliation. No backfill of historical series (legacy series stay on `post_draft_id`/`platform_drafts` read-compat per brief §11).

## 7. Rollback (no data migration, fully reversible)
```sql
DROP INDEX IF EXISTS c.idx_content_series_episode_intent_id;
ALTER TABLE c.content_series_episode DROP COLUMN IF EXISTS persona_notes;
ALTER TABLE c.content_series_episode DROP COLUMN IF EXISTS avatar_preference;
ALTER TABLE c.content_series_episode DROP COLUMN IF EXISTS persona_label;
ALTER TABLE c.content_series_episode DROP COLUMN IF EXISTS intent_id;
```
All values NULL at rollback time (no Stage 2+ writer exists) → zero data loss.

## 8. Next (NOT started — requires its own brief scope + D-01 + PK phrase)
Stage 2 = `fan_out_episode` + `retry_episode` + extended `get_content_series_detail` + fixed `approve_series_outline`. Stage 3 = series-writer EF re-point. Stage 4 = UI. Each its own commit/D-01. Register reconciliation for the Studio/Series line remains held.
