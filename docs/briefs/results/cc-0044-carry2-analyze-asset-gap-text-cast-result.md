# Result cc-0044 CARRY-2 — analyze_asset_gap ::text array-append fix

**Parent:** cc-0044 Checkpoint B (`docs/briefs/results/cc-0044-checkpoint-b-resolve-slot-assets-v1-2-result.md`) — carry C2.
**Executed by:** Claude Code (build lane) + PK (apply + push authorised this window)
**Completed:** 2026-07-20 Sydney

---

## 1. Result status
`Complete` — fix APPLIED LIVE + pushed. Read-only analyzer, not on any render path; behaviour-preserving.

## 2. Commit(s)
- `<PENDING PUSH>` — `fix(analyze_asset_gap): ::text on permitted-scope appends (cc-0044 CARRY-2, fixes latent 22P02)`.

## 3. Files changed
- `supabase/migrations/20260720160000_analyze_asset_gap_v1_1_permitted_text_cast.sql` — created (file sha256 `0dbc85f9…`, body md5 `eb116e7b`)
- `_harness/cc0044_agp_textcast/ROLLBACK_analyze_asset_gap_live_captured.sql` — created (byte-exact live pre-fix body, md5 `d3578bd0`, len 6276)
- `docs/briefs/results/cc-0044-carry2-analyze-asset-gap-text-cast-result.md` — created (this file)

## 4. What / why
- `public.analyze_asset_gap` built `v_permitted` (text[]) with bare-literal appends (`v_permitted || 'vertical_shared'` / `|| 'global_generic'`). `text[] || unknown-literal` resolves as array-concat → `22P02 malformed array literal`. The branch runs only for a `client_preferred`/`best_fit` pool-policy row with an allow flag — 0 exist today, so it had never fired; it would fire at the FIRST shared-pool activation (cc-0044 CARRY-2). The sibling resolver `resolve_slot_assets` v1.2 already uses the safe `::text` form; this aligns the analyzer.
- **Fix:** two lines — add `::text` to both appends. Value-identical result array. Surgical-diff proven: migration body == captured live body + exactly the two `::text` additions + one fix comment.
- **Applied LIVE 2026-07-20** (PK-authorised, execute_sql): live `analyze_asset_gap` prosrc md5 `d3578bd0` → **`eb116e7b`** (len 6486). Ledger version **`20260720160000`**.

## 5. Proof (all live, ZERO production writes)
- **Operator-level:** the bare-literal append raises `22P02` (confirmed SQLSTATE); the `::text` form returns `{vertical_shared,global_generic}`.
- **In-situ fragment** (pg_temp fixture policy rows): `client_preferred`+both → `{vertical_shared,global_generic}`; `best_fit`+global → `{global_generic}`; `client_only` → `{}` — no error.
- **Behaviour-preserving regression:** a pg_temp copy of the full fixed body (calling the real live callees) vs live `analyze_asset_gap` over 4 clients × 4 platforms × 2 formats × 2 seeds = **64 inputs → 0 mismatches** (changed lines unreachable at 0 policy rows).
- **db-rls-auditor:** PASS (SECDEF/search_path/grants unchanged; pure body replace; rollback byte-exact; no new exposure).
- **External review `3c99e5d7`:** agree / low / high confidence / proceed (no pushback).
- **Post-apply:** live md5 `eb116e7b`; ledger row present; PP analyzer smoke returns `status: ok`.

## 6. Constraints confirmed (NOT done)
- No pool-policy rows set; no shared/client asset promoted; no render; no register cut by this lane (pointer handed to orchestrator).
- Only the two `::text` lines changed; SECDEF/search_path/grants preserved; no DDL beyond CREATE OR REPLACE; no writes.

## 7. Open issues
- **CARRY-2: CLOSED** by this lane.
- **CARRY-1** (analyzer↔resolver text-safety parity) remains — still blocks BROAD shared-pool activation. Activation also still requires (a) asset promotion out of fenced + (b) a client pool-policy row — separate PK gates.

## 8. Rollback
`execute_sql` the ROLLBACK file (restores `d3578bd0`) + `DELETE FROM supabase_migrations.schema_migrations WHERE version='20260720160000';`
