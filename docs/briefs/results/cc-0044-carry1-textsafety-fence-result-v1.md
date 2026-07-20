# cc-0044 CARRY-1 — analyzer↔resolver text-safety parity: LIVE (dark) — result v1

**Lane:** cc-0044 CARRY-1 · **Tier:** T2 (dark/additive DDL to a read-only SECDEF function) · **Class:** PRODUCT_PROOF-enabling
**Date:** 2026-07-20 · **Verdict:** APPLIED LIVE (dark), value-preserving, fully proven · **Base:** origin/main `60253bc`

## Problem (CARRY-1)

`resolve_slot_assets` v1.2 (the render authority) rejects a shared `static_background` whose
`safe_for_text_overlay` is `false` / null / unrecognized. `public.resolve_shared_pool_assets` —
called by `public.analyze_asset_gap` to set `v_shared_hit` — ran the identical licence/scope fence
chain but applied **no text-safety fence** (it did not even select the column). So the analyzer
could count a non-text-safe shared background as a "shared hit" (→ "no gap") that the resolver then
fails-closed at render. Direction is fail-safe (a missed gap-detection, never a bad render), so it
blocked **broad shared-pool activation** but not the dark apply. This was the last documented
resolver↔analyzer gap (CARRY-2 was resolved earlier: `c78ae45`).

## Fix

`CREATE OR REPLACE public.resolve_shared_pool_assets(text,text,text,text,text[],text)` — minimal diff
vs the live body (md5 `9791edd63ffcfb7973e1942b58025e0a`):
1. One SELECT column added: `sa.asset_meta->>'safe_for_text_overlay' as sfto`.
2. Three `elsif` branches appended after `platform_excluded`, guarded by `p_asset_kind='static_background'`,
   mirroring `resolve_slot_assets` v1.2 reason codes **exactly**:
   - `sfto='false'` → `not_text_safe`
   - `sfto IS NULL` → `text_safety_unknown` (caught before the `NOT IN`, so no null-propagation)
   - `sfto NOT IN ('true','needs_scrim')` → `text_safety_unknown`
3. Posture re-assert (`REVOKE ALL FROM public,anon,authenticated` + `GRANT EXECUTE TO service_role`) +
   a `DO $assert$` ACL fail-closed postcondition.

**Preserved:** SECURITY DEFINER · STABLE · `search_path=''` · owner postgres · grants `{postgres=X, service_role=X}`.

## Blast radius

Sole runtime caller: `public.analyze_asset_gap` (always `'static_background'`). `resolve_slot_assets`
references the name in **comments only** (it inlines, does not call). No TS/JS/EF caller. Verified by
repo grep + `pg_get_functiondef` catalog scan (both `analyze_asset_gap` and `resolve_slot_assets` matched;
only the former actually invokes it).

## Dark / value-preserving today

All 8 live `c.shared_creative_asset` static_background rows carry `safe_for_text_overlay='true'` → none
newly rejected. `c.client_asset_pool_policy` has 0 rows → no client consults the shared pool; the
analyzer writer runs dry-run. (Live-truth note: `bg_shared_datacentre_server.jpg` is now
`is_active`/`production_use_allowed`/`approval_status='governed'`, allowlisted to `invegent`, but with 0
pool-policy rows it is not yet consumed — the shared pool is governed-ready but still effectively dark.)

## Proof

**Pre-apply (all trials `BEGIN…ROLLBACK`; live fn unchanged during trials):**
- Bug reproduced — live fn, datacentre flipped `sfto='false'` → **selected** (counts non-text-safe).
- Fix — new fn, same flipped input → **rejected `not_text_safe` → fail_closed `no_shared_candidate`**.
- Value-preservation — new fn on real rows == live baseline byte-for-byte (`ok`, selected=datacentre, 7×`inactive`).
- Rollback fidelity — forward→rollback restores md5 `9791edd6` exactly; `DO $assert$` passed.

**Post-apply (live):**
- New body md5 `7e293f99bff46734aaa93cf5feb32ffe` (changed); posture SECDEF/STABLE/`search_path=""`/owner postgres unchanged.
- Exec matrix: service_role=EXECUTE, anon=false, authenticated=false (ACL postcondition held).
- Real-row call unchanged: `ok`, selected=`0ba46053…` (datacentre).
- Fence live-confirmed: rolled-back flip of datacentre → `fail_closed / no_shared_candidate`, datacentre rejected `not_text_safe`.

## Reviews

- `db-rls-auditor`: **pass**, no must-fix (grants/posture preserved, refs schema-qualified, fence fail-safe & null-first, naming free, rollback byte-exact).
- External review (`ask_chatgpt_review`, `sql_destructive`): `partial` / high / medium → auto-escalated (review_id `2be4ec5d-49fc-44d2-a863-bad7372eb754`), pinned to migration sha256 `6e126be0…`. Triage: `policy_decision` + `structural_DDL_DML_escalation` — no concrete defect; its "unverified" claims were already evidenced (value-preservation proven, dark, sole caller catalog-confirmed). Routed to the PK apply gate.
- PK gate-2: authorized apply via `apply_migration` + temp-lift.

## Apply mechanics

- `apply_migration` deny temp-lifted (backup `276132bf…` → removed 3 `apply_migration` deny lines → apply → restored byte-exact `276132bf…`).
- **Applied ledger version `20260720090951`** (apply_migration minted its own wall-clock stamp). Repo migration file **renamed to match** the ledger: `supabase/migrations/20260720090951_resolve_shared_pool_assets_v1_1_text_safety_fence.sql` (sha256 `6e126be0d4cae46e0a2079f66586c7f600f358f5a8548555fe7c2918307630c6`). Replay-safe: nothing earlier in the ledger references the function; the resolver (150000) inlines, `analyze_asset_gap` (160000) calls it and it exists from 090951.

## Artifacts

- Migration: `supabase/migrations/20260720090951_resolve_shared_pool_assets_v1_1_text_safety_fence.sql` (`6e126be0…`)
- Rollback (byte-exact prior body, restores md5 `9791edd6`): `_harness/cc0044_carry1_textsafety/ROLLBACK_resolve_shared_pool_assets_live_captured.sql` (`7f1ea7ba…`)

## Carries / follow-ups

- **Broad shared-pool activation is now UNBLOCKED** on the text-safety axis. Remaining activation gates are unchanged and per-PK: (a) promote a shared asset out of fenced, (b) set a `c.client_asset_pool_policy` row, (c) render Proof #1.
- **Named follow-up (out of scope here):** a second micro-divergence — empty-array `platform_scope='{}'` is rejected by `resolve_slot_assets` but passed here (`array_length('{}',1) IS NULL`). Inert today (no live asset has `{}`; all NULL). Needs a canonical-direction PK decision before it can bite.

## Register pointer (Convention 1 — ≤5 lines)

> **cc-0044 CARRY-1 — analyzer↔resolver text-safety parity LIVE (dark, T2 · PRODUCT_PROOF-enabling)** — `resolve_shared_pool_assets` v1.1 adds the resolver's text-safety fence (applied ledger `20260720090951`, file sha `6e126be0…`, live md5 `9791edd6`→`7e293f99`); value-preserving (8 rows all `sfto='true'`, 0 pool policies), db-rls PASS, external `2be4ec5d` partial→PK-applied. Broad shared-pool activation unblocked on the text-safety axis; carry = `platform_scope='{}'` micro-divergence (inert). Result: `docs/briefs/results/cc-0044-carry1-textsafety-fence-result-v1.md`.
