# Result — S1 Forward Shadow Stamping — function applied + supervised first run

**Packet:** `docs/briefs/s1-forward-shadow-stamping-packet.md` · **Completed:** 2026-07-03 Sydney
**Status:** ✅ APPLIED + FIRST RUN VERIFIED — **the stamper is live and idle; the cron schedule remains a separate PK gate (NOT activated)**

## 1. What shipped

`public.stamp_tmr_shadow_forward(p_limit int default 20)` — the DB-native forward shadow stamper (PK-ratified Option A). VOLATILE SECURITY DEFINER, `search_path=''`, service-role-only; scans unshadowed succeeded `creative_library_b1_production` renders oldest-first (constant label, clamp 1..100), per row calls the live `select_template(seed=post_draft_id)` and inserts one shadow row (`batch_label='s1-forward-v1'`, S0-equivalent taxonomy, per-client registry_context). Writes ONLY the shadow table; selector fail-closed is stamped as data. **Schedules nothing.**

## 2. Identity + hash

Ledger `20260703130939 create_stamp_tmr_shadow_forward_v1`; applied **byte-identical** to the reviewed artifact — single hash reviewed = applied = repo file: `6299cb833916dd3d44a68dcb9985c046aeddb869349ced04cfcbd1f6df124dd9` (re-verified pre-apply). Repo file to be renamed `20260703200000_…` → `20260703130939_…` at the commit gate (rename only; content hash unchanged).

## 3. Gate trail

PK-ratified Gate 1 (Option A · hourly context · supervised first run · cap 20 · PP-B1-only) → ef-builder isolated worktree → **47/47 hermetic tests ×2** (all four real migrations in PGlite) → harvest byte-verified → db-rls-auditor **PASS zero-must-fix** (incl. live pool = 0 prediction; post-Lane-0 classification check) → security-auditor **GREEN** (write capability = zero privilege gain; scan-predicate fixity; label-scoped rollback; its M-2 "missing dashboard consumer" flag resolved as a checkout artifact — the consumer is confirmed on dashboard origin/main) → external review **agree/proceed zero-pushback** (`review_id 6fe0f80e-da9a-4772-ba81-e2f531041a95`, hash-pinned) → PK "apply" → this verification.

## 4. Post-apply verification (ALL PASS)

| Proof | Result |
|---|---|
| Posture | `prosecdef=t`, `provolatile='v'`, `search_path=""`, `proacl={postgres=X, service_role=X}`; anon/authenticated **false**, service_role **true** |
| Anon REST | **42501 / HTTP 401** |
| **Supervised first run** (S0-pattern probes) | return **exactly as predicted**: `{limit:20, scanned:0, stamped:0, skipped_no_slug:0, remaining_unshadowed:0}` — live pool was 0 (S0 covered all 17) |
| Production isolation | PRE/POST probes **byte-identical**: post_draft 2639 · post_render_log 2702 (max timestamp identical) · post_publish_queue 802 · post_publish 1543; shadow table unchanged at 17 rows, `s1-forward-v1` rows = 0 |
| Advisors | **zero findings** reference the new function (baseline unchanged) |

**The no-op/idempotent/isolation path is proven live.** The stamping path is hermetically proven (47/47) and gets its live proof at the **next PP production render** via a second supervised invocation — predicted outcome: `stamped:1`, class `selector_disagreement` (post-Lane-0 registry truth), row visible automatically in the dashboard shadow panel.

## 5. Non-claims / boundaries held

No cron scheduled (separate PK gate) · no production behaviour change (proven) · no render/publish · no runtime/worker/dashboard change · no Format Mix · no enablement · shadow rows grant no status · queue items 2–5 untouched.

## 6. Standing items

- **Next for S1:** (a) second supervised invocation after the next natural B1 render (live stamping proof); (b) then the `cron.schedule` gate (hourly, per ratified cadence — `sql_destructive` D-01 per house precedent).
- Rollback: `DROP FUNCTION IF EXISTS public.stamp_tmr_shadow_forward(integer);` + optional `DELETE … WHERE batch_label='s1-forward-v1'` (cannot touch S0 rows).
- selector_version constant `select_template_v1@20260703035154` must be bumped in a successor migration if `select_template` is ever revised.
