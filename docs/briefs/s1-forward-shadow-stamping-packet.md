# S1 — Forward Shadow Stamping — Build/Apply Packet

**Created:** 2026-07-03 Sydney · **Design authority:** `docs/briefs/s1-forward-shadow-stamping-gate1.md` (PK-ratified: Option A DB-native · hourly context · supervised first run · cap 20 · PP-B1-only)
**Status:** review chain complete — **awaiting PK apply gate (HARD STOP)**. The pg_cron schedule is a **separate later gate**; this migration schedules nothing.
**Artifact:** `supabase/migrations/20260703200000_create_stamp_tmr_shadow_forward_v1.sql` · **sha256 `6299cb833916dd3d44a68dcb9985c046aeddb869349ced04cfcbd1f6df124dd9`**
**Tests:** `docs/briefs/s1-forward-shadow-validation.mjs` (sha256 `8af18ebb…`) — **47/47**, independently re-run **47/47** (PGlite, all four real migrations loaded verbatim)

## 1. What it is

`public.stamp_tmr_shadow_forward(p_limit int default 20)` — the first **write-capable** SECDEF in this lane family (VOLATILE): scans unshadowed succeeded `creative_library_b1_production` renders oldest-first (constant label — no parameter can retarget the scan; clamp 1..100), per row calls the live `select_template(seed=post_draft_id)` and INSERTs one shadow row (`batch_label='s1-forward-v1'`, S0-equivalent divergence taxonomy, per-client `registry_context`). Returns `{run_at, limit, scanned, stamped, skipped_no_slug, remaining_unshadowed}`. Selector fail-closed is stamped as **data**, never raised. Writes ONLY the shadow table. Idempotent via NOT-EXISTS + the live partial unique index; a concurrent-run race loses atomically (all its inserts roll back).

## 2. Review chain (all pinned to `6299cb83…`)

| Gate | Verdict |
|---|---|
| ef-builder (isolated worktree) | 2 files; 5 fail-safe deviations flagged (notably `skipped_no_slug` surfaced in the return rather than counted silently; deterministic `render_log_id` tiebreak) |
| Hermetic tests | 47/47 ×2 — stamping/skipping/idempotency/cap/clamp/all-5-classes/write-surface probes/posture |
| db-rls-auditor | **PASS zero-must-fix** — line-by-line qualification; cache-logic soundness; S0 CASE clause-by-clause equivalent; race = clean atomic abort; **live pool = 0** (supervised first run predicted `{scanned:0, stamped:0}` — a no-op proof; real stamping proven at the next production render, predicted class `selector_disagreement` post-Lane-0, verified by a live representative selector call); rollback complete, zero callers |
| security-auditor | **GREEN apply-eligible** — write capability = zero privilege gain (service_role already holds direct CRUD; postgres owns); single clamped int cannot redirect writes or alter the predicate; no injection surface; atomic failure blast radius; label-scoped rollback cannot touch S0 rows. Notes: M-1 cosmetic ("never overlaps" comment = assumption; race handled regardless) · M-2 **resolved as a checkout artifact** — the dashboard consumer (actions/tmr-shadow.ts) is confirmed on dashboard origin/main by `git show` (the main checkout sits on an unrelated branch), so forward rows appear in the shipped panel automatically |
| external review | **agree / proceed · risk medium · confidence high · zero pushback** — `review_id 6fe0f80e-da9a-4772-ba81-e2f531041a95` |

## 3. Apply plan (on PK approval of the hash)

1. Re-verify `sha256 == 6299cb83…` → apply migration `create_stamp_tmr_shadow_forward_v1`.
2. Posture proofs: proacl `{postgres, service_role}` · `has_function_privilege` asserts · anon REST 42501.
3. **Supervised first run** (ratified decision 3): S0-pattern PRE-probes → single manual `select public.stamp_tmr_shadow_forward();` → POST-probes byte-identical → expected return `{scanned:0, stamped:0, skipped_no_slug:0, remaining_unshadowed:0}` (live pool is 0 — this proves the scan/grant/no-op path; the stamping path was proven hermetically and will be re-proven live at the next B1 render with a second supervised invocation).
4. Advisors no-new-findings → result doc + registers → stop. **Cron gate separate.**

## 4. Boundaries / non-claims

No production behaviour change · no render · no publish · no runtime/worker/dashboard change · no Format Mix · no enablement · schedules nothing · shadow rows grant no status · queue items 2–5 untouched. Rollback standing: `DROP FUNCTION` + label-scoped `DELETE WHERE batch_label='s1-forward-v1'`.
