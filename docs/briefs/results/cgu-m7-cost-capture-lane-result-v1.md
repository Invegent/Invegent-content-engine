# Result — CGU Final Build Lane L2: M7 Cost-Capture (isolated, non-production)

**Seed:** cross-session control-tower dispatch, "L2: M7 Cost-Capture BUILD" (2026-08-06)
**Governing ruling:** `docs/briefs/cgu-final-build-acceleration-ruling-v1.md` (isolated, non-production implementation only — three lanes authorized, M7 is lane 2)
**Design authority:** `docs/briefs/seeds/cgu-m7-render-cost-capture-design-v1.md` (implemented as designed; no re-design)
**Executed by:** Claude Code orchestrator + `ef-builder` subagent + `branch-warden` verification
**Completed:** 2026-08-06 Sydney
**VERSION-LESS** — no register/sync-state cut (this doc is the record; a pointer entry is a separate, later step if PK wants one)

---

## 1. Result status

`Complete` — isolated build only, as scoped. Nothing applied/deployed/merged (out of scope by design).

## 2. Commits (isolated branch `lane/m7-cost-capture-build`, worktree `C:\Users\parve\ice-worktrees\m7-cost-capture`, based on main HEAD `e121f6b`)

- `beb93bc` — build(m7): NOT_APPLIED render-cost-snapshot migration (isolated, non-prod)
- `0b01f8e` — build(m7): force-add hermetic SQL test fixture (matches cc0046 `_harness` precedent)

Branch is purely local — no remote-tracking ref, nothing pushed. `branch-warden` verdict: **safe** (HEAD `0b01f8e`, exactly these 2 commits above the correct merge-base, clean tree, main checkout untouched at `e121f6b`).

## 3. Files changed

- `supabase/migrations/NOT_APPLIED_cgu_m7_render_cost_snapshot_v1.sql` — created (354 lines)
- `_harness/m7_cost_capture_v1/test_render_cost_snapshot.sql` — created (164 lines; force-added over the repo's `_harness/` gitignore rule, matching the `_harness/cc0046_hermetic/*.sql` precedent, which is likewise tracked despite the same ignore rule)

No other file touched. No `supabase/functions/**` file created or edited.

## 4. Actions taken

**4.1 Vendor endpoint resolution (scope item 1).** Checked Creatomate's public API documentation live (`creatomate.com/docs/api/reference/introduction`, the account/pricing docs) via `WebFetch` — no authenticated calls, no key use. **Confirmed: no account-level usage/credits-balance/billing API endpoint exists.** Creatomate's documented REST surface is render submit/poll + webhook + template CRUD only. This resolves design doc §8 open question 1 (previously "to_be_confirmed") and rules out an automated weekly sweep for v1 — there is nothing for it to poll.

**4.2 Schema artifacts (scope item 2), NOT_APPLIED.** `ef-builder`, working in the isolated worktree, authored `NOT_APPLIED_cgu_m7_render_cost_snapshot_v1.sql`:
- `m.render_cost_snapshot` — `snapshot_id`/`period_start`/`period_end`/`provider`/`credits_or_spend`/`unit`/`source`/`captured_at` per the design's §4 shape, plus CHECK constraints on `unit` (`credits`|`usd`), `source` (`account_usage_api`|`dashboard_manual_entry`|`invoice_manual_entry`), `credits_or_spend >= 0`, and `period_end > period_start`. RLS ENABLE with zero permissive policies (deny-all); `REVOKE ALL FROM PUBLIC, anon, authenticated` named explicitly (per the standing CLAUDE.md "revoking PUBLIC alone is insufficient" gotcha); `service_role` holds full DML.
- `ice_ro.render_cost_status` — straight `SELECT *` view, all columns already safe, matching the `*_status` naming and "all columns SAFE" framing of `cron_health`/`pipeline_health`.
- Grants — an **explicit new** `GRANT SELECT ON ice_ro.render_cost_status TO ice_readonly`, reasoned rather than copied: the existing `GRANT ... ON ALL TABLES IN SCHEMA ice_ro` from `20260719150000_ice_ro_r0_views_and_confined_role.sql` is a point-in-time grant that does not retroactively cover a view created by a later migration.
- Section E: fail-closed `DO $assert$` block validating table/constraints/RLS/grants/view/RPC posture via catalog introspection (`pg_constraint`, `pg_policies`, `information_schema.role_table_grants`, `has_table_privilege`, `has_function_privilege`).

**4.3 Manual-entry path (scope item 3).** No automated sweep EF was built — per §4.1's finding, there is no vendor endpoint for one to call, and building one anyway would fabricate an integration against a nonexistent API. Instead: a guarded `SECURITY DEFINER` RPC, `m.record_render_cost_snapshot(p_period_start, p_period_end, p_credits_or_spend, p_unit, p_source DEFAULT 'dashboard_manual_entry', p_provider DEFAULT 'creatomate')`, `SET search_path TO ''`, validating all five inputs (null checks, period ordering, non-negative spend, unit/source vocabulary) before a single INSERT. Owner-only `EXECUTE` — no `anon`/`authenticated`/`PUBLIC` grant, mirroring the `write_render_log`/`m.reconcile_publish_status` idiom. This gives PK's weekly manually-read figure a landing place from day one, honestly labeled `source='dashboard_manual_entry'`.

**4.4 Hermetic tests + fixtures (scope item 4).** `_harness/m7_cost_capture_v1/test_render_cost_snapshot.sql` — a standalone `psql`-runnable fixture (10 `DO` blocks: valid insert + defaults, period-ordering rejection incl. equal-boundary, bad unit, bad source, negative spend via both RPC and raw INSERT, NULL period rejection, non-default params honored, raw-INSERT CHECK enforcement independent of the RPC) plus the migration's own Section E catalog-introspection assertions. **Not executed against a live/scratch database** — no `psql`/`docker`/local Postgres was available in the build environment; both files are structurally reviewed against this repo's existing applied-migration idioms but disclosed as not live-run, not claimed green. Live execution (e.g. a disposable local Postgres or a Supabase dev branch) is recommended before any future Gate-1 apply review.

**4.5 Result doc (scope item 5).** This file. Version-less, no register cut, per the ruling's non-production-mutation scope.

## 5. Constraints confirmed (per the build-acceleration ruling's prohibited list)

- No Phase-2 schedule/cap DML — confirmed not done
- No production database migration applied — confirmed: migration is `NOT_APPLIED`-prefixed, not referenced by any migration-runner list, never executed against any database
- No live selector/palette/routing/voice-config change — confirmed not done (out of scope entirely)
- No production worker deployment or cron activation — confirmed: zero `supabase/functions/**` files touched, no cron job authored
- No asset intake/promotion affecting live selection — confirmed not applicable
- M11 governance closure — not touched
- No mutation that could alter/contaminate schedule-watch evidence — confirmed: isolated worktree/branch, nothing pushed, main checkout untouched (branch-warden verified)
- `m.post_render_log`/`credits_used` left byte-for-byte unchanged — confirmed (grep-verified by `ef-builder`; only referenced in explanatory comments)
- No cap/guardrail logic — confirmed: `m.render_cost_snapshot` is logging-only, per design §7 and the delta audit's own scoping

## 6. Open issues

1. **Fixture not live-executed.** No `psql`/Docker in the build environment. The SQL is pattern-matched against applied precedent (`music_library_v0`, `ice_ro_r0_views_and_confined_role`, `authz_last_admin_delete_guard_v1`) but a real run against a scratch DB is recommended before Gate-1 apply review — this is the standard next step for any `NOT_APPLIED` artifact, not a defect specific to this lane.
2. **Design §8 open question 2/3** (who owns the weekly manual-entry cadence; whether Creatomate's dashboard reports credits or currency) remain PK decisions, not resolved by this build — the RPC's `unit` CHECK already accepts either (`credits`|`usd`), so no schema rework is needed once answered.
3. **Design §8 open question 5** (folding `image-worker`'s identically-dark `credits_used` state into this same table) deliberately left open — the `provider` discriminator column already anticipates it if a future lane wants it.
4. This migration is **not yet wired into the R0 view catalog documented in `CLAUDE.md`** ("the 10 R0 views") or `db-read.py`'s allowlist — correct for a `NOT_APPLIED` artifact; that wiring is an apply-time step for a future Gate-1, not done here.

## 7. Next recommended step

A fresh Gate-1 brief to apply `NOT_APPLIED_cgu_m7_render_cost_snapshot_v1.sql` — requires, at minimum: a live/scratch-DB run of the hermetic fixture, `db-rls-auditor` review of the new table/view/grant/RPC posture, `branch-warden` re-verification, external review pinned to the final SQL's hash, and an explicit PK apply gate. **Watch-gated**: per the ruling, this step cannot proceed until the Phase-1 schedule watch reaches PASS and PK grants explicit production authorization (~2026-08-11 20:20 Sydney or later).

---

## 8. Verification

**Verdict:** `Pass`

**Notes:**
- Scope matched the seed's five numbered items exactly; nothing extra built, nothing skipped.
- Vendor-endpoint claim in the design (§8 Q1, "to_be_confirmed") is now resolved with a cited live doc-check, not assumed.
- Constraints from the governing ruling all confirmed not-violated (§5 above), independently checked via `branch-warden` rather than taken on `ef-builder`'s self-report alone.
- One correction made mid-lane: `ef-builder` initially left the hermetic fixture uncommitted (reasoning "`_harness/` is gitignored, matches every other `_harness/*` artifact") — that reasoning was checked against actual git history and found wrong (the cc0046 hermetic fixtures *are* tracked, force-added past the same ignore rule); the orchestrator force-added and committed the M7 fixture to match the real precedent.

## 9. Learning notes

- `_harness/` being listed in `.gitignore` does not mean everything under it stays untracked — check `git ls-files` against the specific precedent directory before accepting an agent's "matches house pattern" claim about ignored paths; the pattern for *proof/test fixtures specifically* has been to force-add them (cc0046 precedent), while other `_harness/*` content (scratch working files, contact sheets, etc.) does stay ignored. Worth a small CLAUDE.md/memory note if this recurs.
- The design doc's explicit "to_be_confirmed, out of scope" framing for the vendor-endpoint question made this lane's first step unambiguous — worth continuing to write design docs with that kind of clearly-labeled deferred-question section, it turns straight into the build lane's first checklist item.
