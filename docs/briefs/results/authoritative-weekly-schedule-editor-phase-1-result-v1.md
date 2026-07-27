# Result — Authoritative Weekly Schedule Editor, Phase 1 (1a + 1b + 1c)

**Date:** 2026-07-27 Sydney
**Lane class:** PRODUCT_PROOF · **Tiers:** 1a T2 · 1b T2 · 1c T3 (live-proof required)
**Brief:** `docs/briefs/authoritative-weekly-schedule-editor-phase-1-brief-v1.md`
**Apply/deploy packet (frozen):** `docs/briefs/artifacts/p1-apply-deploy-packet-v1.md` (reviewed hash `de0e12a81274c855da1e628f92f763d7`)
**Verdict:** COMPLETE — applied to production, end-to-end proven live, dashboard deployed. Baseline restored (proof left no trace).

## Outcome (PK)
Operator sets a weekly format per publish slot → it persists durably → the *effective* format reaches the materialised slot; suggested-vs-override visible; invalid combos rejected fail-closed; reseeding preserves overrides. **Boundary:** authoritative schedule *planning* + durable slot *intent* only — the Advisor may still replace the format downstream until Phase 2 governed-authority slices land (no `ai-worker`/`recommended_format`/resolver change in Phase 1).

## What shipped

**1a — additive DB (applied via `apply_migration` `p1a_schedule_format_override_surface`):**
- `c.client_publish_schedule.format_override text NULL` — durable per-slot override.
- `public.save_week_format_override(uuid, jsonb)` — SECURITY DEFINER, `search_path=''`, **service_role-only** (REVOKE PUBLIC/anon/authenticated; GRANT service_role; OWNER postgres). Two-pass validate-all-then-apply, **fail-closed** against `t."5.3_content_format".platform_support` (`COALESCE((->>platform)::boolean,false)`); NULL/'' clears; PASS 2 `GET DIAGNOSTICS ROW_COUNT`-backed (0-row validated update → RAISE 23503, whole call rolls back).
- `public.get_week_format_allocation` extended **additively** — `contract_version` unchanged `slice_a_allocation_v1` (existing v1 read-only panel preserved); adds per-entry `format_override`/`effective_format`/`effective_is_valid` and top-level `selectable_formats`. Authored against the byte-exact live **dow** body (md5 `11e566…`); also reconciles the stale isodow repo artifact `20260725004336` to live truth.

**1c — production nightly function (applied via `apply_migration` `p1c_materialise_slots_honour_format_override`):**
- `m.materialise_slots` stamps `format_override` into `m.slot.format_preference` (token-only `ARRAY[override]`; wins over allocator + legacy). Byte-exact live base (md5 `48e2db58…`) + only the rule-SELECT column and the override branch; **dow joins + `ON CONFLICT DO NOTHING` unchanged** (forward-only — already-materialised active slots are not retroactively re-stamped).

**1b — dashboard (deployed):** new **Format Plan** tab on `/clients` (no new route), commit `79e063d`, fast-forwarded `origin/main` `07d9c42 → 79e063d` (Vercel prod). Grid seeded from the wrapper (v1 superset), suggested-vs-override, all seven days incl. Sunday, reset clears override, save via `save_week_format_override`. Files: `app/(dashboard)/clients/page.tsx`, `actions/week-format-plan.ts`, `components/clients/WeekFormatPlanTab.tsx`, `lib/week-format-plan.ts`.

## Review chain (all recorded)
- **branch-warden:** safe (both worktrees isolated, change sets exact).
- **db-rls-auditor:** clean / high — provably additive, service_role-only, fail-closed, rollbacks byte-identical to live pre-images, live md5 zero drift.
- **dashboard-ia-lint:** no block (NO_GOVERNING_RULE on IA placement — PK approved keeping it a `/clients` tab for Phase 1; revisit long-term home after operator use). Naming WARN ("Slot times"→"Publish times") fixed.
- **apply-harness-auditor (shadow):** CONCERNS→addressed (save-RPC counts made ROW_COUNT-backed); rollback-identity check clean.
- **ask_chatgpt_review:** `435c3dfa` agree on hash `47360cbf`; re-review `c6ee429a` escalate/partial on hash `de0e12a8` — **PK cleared** (no concrete defect; its concrete mitigation was already the declared apply order).

## Live proof (T3 — 2026-07-27, project mbkmaxqhsohbtwsqolns)
Pre-checks passed: P0 live md5 == pinned bases (materialise `48e2db58…`, wrapper `11e566b5…`); P1 column+RPC absent. Post-1a: column present; save RPC + wrapper `service_role`/`postgres` only; wrapper returns `slice_a_allocation_v1` + new fields + `selectable_formats`.

**Data finding:** no active client schedules weekends — all active/enabled rows are Mon–Fri (dow 1–5); the 24 dow=0 rows are on inactive/disabled records. Per PK, weekend coverage proven via **temporary** dow=0 (Sun) + dow=6 (Sat) property-pulse rows, then fully cleaned up.

Proof (overrides set to `text`, distinct from allocation):
- **All seven days (dow 0–6):** property-pulse facebook rows (Mon–Fri real + temp Sat/Sun) — every new (post-override) slot carried `format_preference = {text}` on the correct **local (Sydney) weekday**, incl. **Sunday (dow 0)** and **Saturday (dow 6)**.
- **Enrolled + legacy both:** property-pulse (enrolled) and ndis-yarns (legacy) overrides both landed in `m.slot`.
- **Null unchanged:** property-pulse instagram (no override) → new slots carried the allocation (`{carousel}`), not `text`.
- **Fail-closed:** `carousel`/linkedin (unsupported) → RAISE 23514, zero write (linkedin row stayed null).
- **Clear path:** cleared 5+1 overrides (`cleared_count`), overrides removed.
- **Dashboard-read agreement:** `get_week_format_allocation` returned all seven facebook days with `format_override='text'`, `effective_format='text'`, `effective_is_valid=true` alongside the differing `assigned_format` (suggestion).

**Chain proven:** stored override → effective weekly allocation → materialised slot → dashboard read — all agree.

**Cleanup verified:** 0 overrides remaining · temp rows deleted (2) · temp-row slots deleted (6) · override slots on real test rows deleted (12) · 0 leftover test artifacts. Baseline restored.

## Carries / open items
- **Vercel build + rendered-UI visual acceptance:** PK (auth-gated; orchestrator cannot sign in). Data-layer display agreement proven above.
- **Pre-existing (not introduced):** latent `m.materialise_slots` anon/auth SECDEF ACL (blocked by no schema-`m` USAGE — separate T3 lane); cosmetic save-RPC count edge (now ROW_COUNT-backed).
- **IA placement:** Format Plan stays a `/clients` tab for Phase 1; long-term IA home is a later product decision.
- **Follow-up candidate:** retroactive re-stamp of already-materialised current-week slots (forward-only today). The existing Slice-A read-only panel appears to label `day_of_week` as isodow while the live RPC is dow — likely a pre-existing display bug in that panel (out of this lane's scope).
- **Repo/ledger:** `apply_migration` mints its own applied version; repo filenames `20260727100000`/`20260727100100` are the records — reconcile filename vs applied-ledger if needed.

## Next outcome (PK)
**Phase 2 — extend downstream format authority incrementally**, starting with the next governed platform-format pair after the already-proven Property Pulse YouTube `video_short_stat` path. Each pair: shadow-verify → enable via governance flag → one live golden-path proof → widen. Each widening is its own T3 deploy gate.
