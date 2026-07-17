# RESULT — TMR Re-skin Video · Stat 1:1 + Tips 9:16 · Fenced Batch Intake

**Date:** 2026-07-17 Sydney · **Lane class:** SIDE_PROVING · **Tier T2** (additive, fenced) · **Verdict:** ✅ APPLIED + VERIFIED
**Migration:** `20260717045204_tmr_reskin_video_stat1x1_tips9x16_intake` · reviewed artifact sha256 `29196aa693cedf78253a8212ba1b03ab92ce14303ed814e8712ab51b8f0c6e8d` (5262 B)
**Predecessors / same-shape:** v5.57 (`237a4024…`, 3 rows) · v5.59 (`a3c8712a…`, 1 row)

## Outcome
Batch fenced intake of two more re-skinned generic **video** siblings, completing all 3 archetypes × both ratios (9:16 + 1:1). Both intaken `classified` into their existing archetype families. No family created, no production behaviour change.

| Template | Format | `provider_template_id` | Family | JSON sha256 | Notes |
|---|---|---|---|---|---|
| Stat Reveal 1:1 | video · 1:1 · 8s | `8d5cd8df-94c2-4b3d-bb51-ed3bd3e163ae` | `generic.stat_hero_card` | `491947c4…` | PK-transposed |
| Multi-Stat Tips 9:16 | video · 9:16 · 9s | `2bda9382-3b11-4395-9b87-05a752e22678` | `generic.listicle_card` | `b593cd7d…` | **browser-transposed by ICE** (duplicate-03 → source-editor JSON swap via Monaco → rename; PK's cheat-code workflow) |

Both rows: `scope='generic'`, `output_type='video'`, `inventory_status='captured_from_render_probe'`, background-free (`image_slot 0/0`, `needs_governed_background=false`, `text_overlay_safe_required=NULL`). 12 template-level tags (6 each).

**Family coverage now complete for these three archetypes:**
- `generic.stat_hero_card` → static 1:1 · video 9:16 (`c6dcaa2d`) · **video 1:1 (`8d5cd8df`)**
- `generic.listicle_card` → static 1:1 · video 1:1 (`817ce92d`) · **video 9:16 (`2bda9382`)**
- `generic.news.quote_card` → static 1:1 · video 9:16 (`416658f5`) · video 1:1 (`314974f6`) *(from v5.57/v5.59)*

## Browser-transpose note (06)
Template 06's Creatomate template was created by ICE via the in-app browser using PK's cheat-code workflow: duplicate `03_generic_quote_statement_9x16` → open the Source Editor (`‹{}›` / F12) → replace the JSON with 06's (injected through the Monaco editor API so Creatomate re-parsed and applied it live) → rename to `06_generic_multistat_tips_9x16`. Verified by an API render off the saved template_id. (Direct clipboard/paste was blocked by browser security; the Monaco-API injection was the working path.)

## Review chain (T2)
- **db-rls-auditor:** pass, 0 must_fix — same shape as v5.57/v5.59; both families resolve to one generic row each; all CHECKs satisfied; no id/name collision; no new advisor findings.
- **External review** (`sql_destructive`): **AGREE**, risk medium, confidence high, no pushback. `review_id 5b6609c2-9856-4267-94a2-796fd10c5042`, pinned to sha `29196aa6…`. (Bridge `escalate` flag = routine production-apply→PK gate, not a defect.)
- **branch-warden:** git state safe (main; parity 0/0). `concerns` = commit-hygiene only: HEAD had advanced to `7a9d85d` (v5.60 sibling lane, benign FF). **R4 exclusions honoured** at commit: `docs/briefs/pp-video-tmr-template-workbook-v1.xlsx` (other lane) + five untracked orphan music-lane migrations in `supabase/migrations/` — staged by exact path only.

## Apply + verification
- PK-authorised; applied via `execute_sql`. Fail-closed in-txn assertion (2 rows / 12 tags / 0 satellite) passed. Ledger backfilled: version `20260717045204` (+ rollback). Repo migration file byte-matches reviewed sha `29196aa6…`.
- Post-apply (read-only): 2 rows present + `classified`/`generic`/`video`; 12 tags; **0** variant_candidate / platform_suitability / client_assignment.
- Fenced 4 ways; live PP path unchanged (`select_template('property-pulse','facebook','image_quote')` still returns a winner, new ids absent).

## Rollback (validated, unused)
`DELETE FROM c.creative_provider_template WHERE provider='creatomate' AND provider_template_id IN ('8d5cd8df-…','2bda9382-…');` — tags cascade; families + siblings untouched. Recorded in the ledger `rollback` column.

## Next
**Six fenced video templates now intaken total** (v5.57 ×3 + v5.59 ×1 + this ×2). Promotion (video-lane governed smoke → PK visual approval → assignment/proof/enable) remains a later, separately-gated lane.
