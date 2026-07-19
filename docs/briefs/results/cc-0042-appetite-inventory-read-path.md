# Result cc-0042 — Asset appetite/inventory read-path (the read-only "brain") — LIVE, dark, verified

**Completed:** 2026-07-19 Sydney · **Lane:** Post-Prep Asset-Gap read-path (follow-on to cc-0041)
**Tier:** T2 (read-only functions, ship dark) · **Class:** SIDE_PROVING
**Brief:** `docs/briefs/cc-0042-appetite-inventory-read-path-brief.md`
**Migrations (ledger):** v1 `20260719170000` `cc_0042_appetite_inventory_read_path_v1` → superseded by v2 `20260719190000` `cc_0042_appetite_inventory_read_path_v2_fix`
**Artifacts:** v1 `docs/briefs/cc-0042-appetite-inventory-read-path-ddl-v1.sql` (sha `36438ad1…`) · **v2 (live)** `docs/briefs/cc-0042-appetite-inventory-read-path-ddl-v2.sql` (sha `dff19f5b…`)

---

## What shipped

Three read-only `SECURITY DEFINER · STABLE · SET search_path='' · service_role-only` functions in `public`, all **shipping dark** (no production consumer, no cron, **write nothing**):

| Function | Role |
|---|---|
| `derive_asset_appetite(client,platform,format,seed)` | Pre-governance appetite from the template's **real dynamic slots** (`c.creative_provider_template_field`) + effective TMR-4 tags; deterministic-candidate rule (ambiguous when viable candidates' material appetite disagrees). |
| `resolve_shared_pool_assets(client,platform,asset_kind,vertical,permitted_scopes,seed)` | Read-only shared-pool eligibility over `c.shared_creative_asset` (mirrors `resolve_slot_assets`). |
| `analyze_asset_gap(client,platform,format,seed)` | Dual-axis verdict in the `m.asset_gap_suggestion` contract shape — **returned, not written**. |

`analyze_asset_gap` composition (v2): **`select_template` first** (a producible post ⇒ `primary_route=none`, no gap) → on failure classify the honest route (governance ≻ template ≻ asset) → derive appetite → **independent two-source asset check** (`resolve_slot_assets` over client assets + `resolve_shared_pool_assets` over policy-permitted shared pools; no policy row ⇒ `client_only`) → dual-axis output. Independent check defeats governance masking; ambiguous appetite blocks *sourcing* (`drainability=blocked_by_template`) without rewriting the route; masked gaps recorded, never drained.

## The v1→v2 correction (verification caught it)

v1 passed static review (db-rls-auditor clean, external agree) but its **read-only smoke on live data exposed 3 real defects** — every `image_quote` case returned `template_gap/ambiguous`, including fully-governed producible property-pulse (should be `none`). Root causes + v2 fixes:

- **F1 — inert columns.** The TMR-4 appetite columns (`image_slot_min/max`, `needs_governed_background`, `text_overlay_safe_required`) are **unpopulated (all NULL)** on live templates — v1 read a `declared-control-not-consulted` control. **v2 derives appetite from the real dynamic slots** (`creative_provider_template_field`: background/logo/image), the same source `resolve_slot_assets` trusts.
- **F2 — aspect false-ambiguity.** `aspect_ratio` (1:1/4:5/1.91:1 platform variants) drove false ambiguity. **v2 drops aspect from the material key.**
- **F3 — ordering.** Appetite-ambiguity preempted the no-gap check. **v2 calls `select_template` first**; appetite/ambiguity matter only on the sourcing path.

This is the lane's core lesson: static review is necessary but not sufficient — the dark read-only smoke against real data is what proved the read-path.

## Gate chain (T2, v2)

| Gate | Result |
|---|---|
| db-rls-auditor (v2) | **PASS**, 0 must-fix (security preserved; drainability CHECK provably satisfied; no null-concat trap) |
| External review (v2) | `partial` → PK escalation (no concrete defect; `runtime_verification_required` — wanted edge-case testing), `review_id 4db81862`, pinned `dff19f5b…` |
| PK decision | approved apply (one-gate hash-pinned) **+ an expanded post-apply smoke gate** as the named verification |
| Deterministic pre-check | `select_template` PP/NDIS image_quote = ok → v2 `none` (fix confirmed before apply) |

## Apply + verification (project `mbkmaxqhsohbtwsqolns`)

- v1 applied `20260719170000`; v2 `CREATE OR REPLACE` applied `20260719190000` (both via `execute_sql`; `apply_migration` deny-listed). NB `20260719180000` was taken by a concurrent lane (`create_client_voice_config_v1`) — `on conflict do nothing` prevented a clobber; v2 took `…190000`.
- **Post-apply posture:** 3 functions `SECDEF · STABLE · search_path=""` · EXECUTE `service_role` only · **anon/auth/public = empty** · adds no advisors.
- **Expanded smoke gate — PASSED.** 4 clients × 5 formats + edge cases (null/bad platform, bad format, bad client). Highlights: PP & NDIS producible formats → `none` (v1 defect fixed); governance gaps correctly carry `detected=false` (NDIS carousel/story — assets fine, just not governed); real asset gaps surface (**Invegent `image_quote` no governed background; Invegent `video_short_stat` `missing_required_logo`** — matches the known `brand_logo_url IS NULL`); CFW governance+ambiguity → `blocked_by_template`; format_unmapped / system_error correct.
- **Invariants (all 0):** no `drainable` without `detected+static_background` · route in domain · drainability in domain · every `none` route carries `detected=false`.

## Carries to the analyzer-write lane (next)

- **Skip/translate `primary_route='none'` and `slot_kind='none'`** — not in the `m.asset_gap_suggestion` CHECK domains; they carry `detected=false` = nothing to persist (db-rls-auditor v2 should-fix, a mapping-lane rule).
- **Analyzer UPSERT** must infer the partial index with the EXACT predicate `ON CONFLICT (appetite_signature) WHERE status IN (open,queued,harvesting,candidates_ready,failed) DO UPDATE` (cc-0041).
- **`drainable` path is invariant-guarded but unexercised** in current data (needs a client governed+proven-for-a-format yet background-starved). Worth a targeted fixture when the analyzer lane lands.
- **Open (deferred by design):** `best_fit` minimal scoring · shared-pool `sourcing_target_scope` (v1 = `client_scoped`) · richer shared-pool seed rotation.

## Rollback

`DROP FUNCTION` ×3 (`analyze_asset_gap`, `resolve_shared_pool_assets`, `derive_asset_appetite`) — in the ledger rollback column and both DDL files. Reverting v2→v1 = re-apply v1 bodies.

## Not touched

No production worker/RPC/EF/cron changed. `select_template` / `resolve_slot_assets` unedited (composed read-only). `c.client_brand_asset` / live assets untouched. cc-0041 tables read-only.
