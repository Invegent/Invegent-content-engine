# S1 — Forward Shadow Stamping — Gate 1 (design confirmation)

**Created:** 2026-07-03 Sydney · **Queue:** item 1 (unblocked by Lane 0 / v4.84) · **Design authority:** shadow design packet (v4.80; decision 3 deferred the mechanism with a cron-EF recommendation)
**Status:** awaiting PK Gate 1 decisions. Docs-only — no build, no DDL, no cron, no deploy.

## 1. Goal

As new PP production renders happen, automatically record what TMR *would have* chosen — same row shape as S0, same table, same isolation guarantees — so the shadow dataset grows with live production instead of stopping at the 17 retroactive rows. With Lane 0 applied, forward rows classify **genuinely** (`selector_disagreement` / `background_divergence` / `agreement`), not blanket structural.

## 2. Mechanism — REFINED RECOMMENDATION (supersedes the v4.80 cron-EF sketch, PK to ratify)

**Option A (recommended): DB-native stamper — one SECURITY DEFINER function + one pg_cron job.**
`c`-side function `public.stamp_tmr_shadow_forward(p_limit int default 20) → jsonb` that: scans `m.post_render_log` for succeeded `creative_library_b1_production` rows whose `render_log_id` has **no shadow row yet** (the existing partial unique index is the idempotency key), per row calls `select_template(seed=post_draft_id)` and INSERTs a shadow row (`batch_label='s1-forward-v1'`, same divergence CASE as S0, fresh `registry_context` per run), capped at `p_limit` per invocation, returns a summary jsonb (`scanned/stamped/skipped`). Scheduled via `pg_cron` (separate, later `cron.schedule` gate per house precedent).
*Why better than a cron-EF:* zero deploy surface (no EF, no `verify_jwt`, no HTTP hop), hermetically testable in PGlite like every prior artifact, identical isolation (writes ONLY the shadow table — provable the same way S0 was), and one fewer runtime to monitor. The v4.80 EF recommendation predated the discovery that the whole S0 batch ran as pure SQL.

**Option B (v4.80's sketch): isolated cron-EF `tmr-shadow-stamper`.** Same logic in Deno; needs deploy + `--no-verify-jwt` discipline + secrets. Kept as the fallback if PK prefers compute outside the DB.

**Rejected (unchanged from v4.80):** ai-worker extension — touches a production worker for no evidence gain at this stage.

## 3. Behaviour contract (either option)

- **Trigger cadence:** hourly (renders arrive ~daily; hourly keeps lag small at negligible cost). PK may pick 15min–daily.
- **Idempotent by construction:** the partial unique index on `render_log_id` + NOT-EXISTS scan — re-runs stamp nothing twice; no assertions needed on counts (forward flow is open-ended, unlike S0's fixed 17).
- **Fail-safe:** a selector fail-closed is DATA (`selector_fail_closed` class), not an error; genuine errors abort that run's transaction — production is structurally untouchable either way (read-only against `m.*`; writes only `c.tmr_shadow_decision`).
- **Scope v1:** PP `image_quote` B1 renders only (the only governed production label). Other clients/formats have no governed render path yet — nothing to shadow.
- **Observability for free:** the shipped shadow panel reads ALL rows and aggregates batch labels — forward rows appear automatically alongside S0's, no dashboard change.
- **Isolation proof:** same pre/post invariant-probe pattern as S0 for the first supervised run; thereafter the structural argument + the panel's own numbers stand.

## 4. Gate 1 decisions for PK

1. **Mechanism:** Option A DB-native (recommended) vs Option B cron-EF.
2. **Cadence:** hourly (recommended) — or 15min / daily.
3. **First-run mode:** apply function → **one PK-gated manual invocation** with pre/post isolation probes (recommended) → then the separate `cron.schedule` gate; or straight to cron after apply.
4. **Per-run cap:** 20 (recommended; a backlog burst self-drains across runs).
5. Confirm scope v1 = PP B1 renders only.

## 5. Build lane preview (on ratification)

One migration (the stamper function, service-role-only, same posture as siblings) + PGlite hermetic tests (loads all four prior SQL artifacts + this one; cases: stamps new render, skips already-shadowed, cap respected, selector-fail stamped as data, classification now `selector_disagreement` for B1-template mismatch post-Lane-0, zero writes outside shadow table) + standard review chain → PK apply gate → supervised first run with probes → separate cron.schedule gate → result + registers.

## 6. Boundaries

No production behaviour change (proven again at first run) · no render · no publish · no runtime/publisher/worker change · no dashboard change · no Format Mix · no enablement · queue items 2–5 untouched.
