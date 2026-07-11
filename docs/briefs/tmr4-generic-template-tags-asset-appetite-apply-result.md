# TMR-4 — Generic Template Library Tags + Asset-Appetite — Apply Result

**Date:** 2026-07-11 Sydney · **Author:** chat (orchestrator) · **Lane:** SIDE_PROVING · **Tier:** T2 (additive, dark DDL)
**Result:** ✅ **APPLIED — VERIFIED.** Additive/dark schema extension of the live TMR registry landed cleanly; all preconditions held, all 9 post-apply checks pass, zero production behaviour change.

**Canonical record** (Convention 1). Registers carry pointers only.

---

## A. What was applied

Migration `tmr4_generic_template_tags_and_asset_appetite`, schema `c`, project `mbkmaxqhsohbtwsqolns`:
- **4 nullable columns** on `c.creative_provider_template`: `image_slot_min` int, `image_slot_max` int, `needs_governed_background` bool, `text_overlay_safe_required` bool + 2 CHECK constraints (`_image_slot_min_nonneg`, `_image_slot_order`).
- **2 new tables**: `c.creative_template_family_tag` (family-level default tags) + `c.creative_provider_template_tag` (template-level override tags) — each `namespace`/`value`, `length_class` value-vocab CHECK, unique(owner, namespace, value), `on delete cascade`, 1 `(namespace,value)` index, deny-all RLS, browser-role revoke, service-role-only DML.

**Source (Gate-1 approved):** `docs/briefs/tmr-generic-template-library-foundation-v1.md`.
**Reviewed packet:** `docs/briefs/tmr4-generic-template-tags-asset-appetite-migration-packet.md`.

## B. Apply method + identity

- **Method:** PK-authorized **`execute_sql` fallback + ledger backfill** (TMR-3 precedent; packet §J). `apply_migration` is deny-listed and was deliberately **not** used (avoids its version-minting divergence). `execute_sql` is ask-gated, so **no security-settings edit was required** — the deny-list was never touched (verified byte-exact: 46280 bytes, sha `4eb3d998…`, unchanged before/after).
- **Migration version (minted at apply):** `20260711065353` · **name:** `tmr4_generic_template_tags_and_asset_appetite`.
- **Repo artifact:** `supabase/migrations/20260711065353_tmr4_generic_template_tags_and_asset_appetite.sql` (sha256 `caff4b3e…`), body byte-exact from the reviewed §B.
- **Ledger:** one row backfilled (`on conflict (version) do nothing`), confirmed present.

## C. Review chain (both CLEAN, pinned)

- **db-rls-auditor:** CONCERNS → RESOLVED. Two should-fix items applied before external review: (1) the stale "empty registry" premise corrected — the registry is live (17 families / 19 templates, 7 reader RPCs); DDL confirmed additive-safe (nullable cols, jsonb readers, empty new tables → no reader breakage); (2) two redundant owner-id indexes dropped. FK / CHECK / RLS-grant / rollback / naming all PASS.
- **external review** (`ask_chatgpt_review`): CLEAN — agree/proceed, low risk, high confidence, no pushback. review_id `79d3dd85-dc7e-4bb6-bff4-6692b0e6b977`, `reviewed_input_hash` `5dd36d14cf7efef0e2e4fc2017880e99300c86025ed69fbe080757cfe103355a`.

## D. Preconditions (all held — no STOP tripped)

1. Fetch + parity: HEAD == origin/main == `88b0254`, ahead 0 / behind 0. ✓
2. Reviewed SQL is the reviewed version (SQL-only sha `3d140e9b…`; only §I-ext annotation changed since the external pin). ✓
3. SQL section unchanged (2 blocks, 2 `ns_val` indexes = auditor fix present). ✓
4. Migration not already applied (no `tmr4_*` in ledger). ✓
5. Registry state: **17 families · 19 templates · 0 new cols · 0 tag tables · 7/7 reader RPCs**. ✓
6. Additive/dark only (property of reviewed SQL). ✓

## E. Post-apply verification (all 9 PASS)

1. New columns exist — 4, all nullable, correct types + 2 CHECKs. ✓
2. Existing 19 `creative_provider_template` rows present. ✓
3. New fields NULL on all existing rows (`new_cols_all_null_on_existing=true`). ✓
4. New tag tables exist and are empty (rowcount 0 both). ✓
5. RLS deny-all enabled (both `relrowsecurity=true`, 0 policies); advisors show only the intended `rls_enabled_no_policy` **INFO** on the 2 new tables — no new ERROR/WARN. ✓
6. service_role grants correct (SELECT/INSERT/UPDATE/DELETE both); **0 browser-role grants** (anon/authenticated/PUBLIC). ✓
7. Existing read RPCs still work — `public.get_tmr_template_list()` + `public.get_tmr_template_filters()` execute, return object. ✓
8. No template selection/render behaviour changed — readers unaffected; new objects unread by any RPC/worker. ✓
9. No production rows activated/promoted — counts unchanged 17/19; no writes to any existing table; no lifecycle/status touched. ✓

## F. Boundaries respected (unchanged)

⛔ no Creatomate re-skin · ⛔ no template intake · ⛔ no smoke render · ⛔ no selection RPC build · ⛔ no production behaviour change. This lane added dark schema capacity only; nothing reads or writes the new objects yet.

## G. Rollback

The §D "down" SQL in the packet remains valid and side-effect-free (drops 2 tables + 2 constraints + 4 columns; nothing reads them). Available if the tag model is revised before intake begins.

## H. Next

- **Commit/push:** the repo migration file + docs are **uncommitted working-tree changes** — commit/push awaits explicit PK instruction (docs/register lane rule).
- **Then the intake loop** (Step 5→6→7→8 of the plan): PK re-skins templates in Creatomate → intake writes registry rows **including tags + asset-appetite** (now supported) → governed smoke render → PK visual approval. Selection read-path (Step 10) remains a later separately-gated lane.

## Non-claims
- Only the approved additive DDL + one ledger row were executed. No seed, no RPC/function/view, no runtime/dashboard/worker/Creatomate/deploy change. No secrets. No template re-skinned, intaken, rendered, or proven. No selection behaviour built. Deny-list settings never modified.
