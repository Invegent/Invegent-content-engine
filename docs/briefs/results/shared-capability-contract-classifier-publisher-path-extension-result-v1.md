# Result — Shared Capability Contract classifier: `publisher_path_missing` extension (S5)

**Brief file:** `docs/briefs/shared-capability-contract-classifier-publisher-path-extension-gate1-v1.md`
**Executed by:** chat (orchestrator-driven: `ef-builder` (isolated worktree), `db-rls-auditor`, `branch-warden`, external review, PK apply gate)
**Completed:** 2026-07-29 Sydney (build + full T3 chain clean + PK-authorized apply live)

---

## 1. Result status

`Complete — applied live and proven, ships dark`. `public.classify_format_capability` now returns exactly one of **seven** statuses. No production consumer wired (unchanged from v1) — this is classification-only, no behaviour change to any caller.

## 2. Commit(s)

Migration + rollback + this brief committed to `main` in one docs/DB-record commit (see closeout). Applied to production **before** this commit, under the explicit PK apply gate below — same sequencing as the original classifier's own lane.

## 3. Files changed

- `supabase/migrations/20260729120000_classify_format_capability_v2_publisher_path.sql` — created (the applied migration).
- `supabase/migrations/ROLLBACK_20260729120000_classify_format_capability_v2_publisher_path.sql` — created (rollback, byte-verified against the live pre-change function body).
- `docs/briefs/shared-capability-contract-classifier-publisher-path-extension-gate1-v1.md` — created (Gate-1 brief, PK-approved with Design (A)).

## 4. Actions taken

- Grounded the Gate-1 brief with live research: an Explore agent traced the publisher-EF guards, `c.client_publish_profile` schema, an existing (unapplied) `channel_state` prototype view, and `m.is_publish_eligible`; a live query then found the concrete real-world gap — `care-for-welfare-pty-ltd` and `invegent` have zero `c.client_publish_profile` rows for `youtube`, and both classified identically to a template gap (`template_missing`) before this change.
- PK approved Gate-1 and selected **Design (A)**: `publisher_path_missing` has absolute precedence, evaluated before `select_template` is even called, overriding a would-be `ready`.
- `ef-builder` (isolated worktree `agent-a717a45240cef8f3d`) authored the migration as a minimal, byte-precise diff — reproduces the entire live v1 function body unchanged except the new precedence check (§0) and the updated `COMMENT ON FUNCTION` — plus a rollback file. It flagged (correctly) that it could not see the Gate-1 brief inside its isolated worktree since the brief was uncommitted at the time; proceeded on the fully self-contained design spec given directly in its prompt instead of guessing.
- Orchestrator ran a live `BEGIN...ROLLBACK` dry-run of the exact migration SQL against production, re-testing all 4 clients across a ~25-cell matrix: the 6 target cells (both under-onboarded clients × all 3 YouTube formats) correctly flipped to `publisher_path_missing`; every other cell — including NDIS-Yarns's 4 platforms, which have `client_publish_profile` rows but are `paused_until=2027-01-01` — returned byte-identical status to pre-change, confirming the "row-existence only, not `publish_enabled`/`paused_until`" scope fence held exactly as designed.
- `db-rls-auditor`: **pass**, zero must-fix. Independently re-verified every material claim from live catalog state rather than trusting the brief or the diff — confirmed the live function body matched the base migration file exactly (only cosmetic `search_path` re-serialization differed), confirmed `UNIQUE(client_id, platform)` on `c.client_publish_profile`, confirmed `CREATE OR REPLACE` cannot silently widen the existing service-role-only grant, confirmed the rollback body is byte-identical to the pre-change live function, and confirmed zero production callers (still dark) via both a repo grep and a live `pg_proc.prosrc` search.
- `branch-warden`: **safe**. Worktree HEAD was exactly the fork point from `main`, only the two expected untracked files present, nothing committed/pushed, no cross-worktree contamination; noted `main` had moved 2 unrelated docs-only commits since the fork with zero overlap on `supabase/migrations/**`.
- External review (`ask_chatgpt_review`): **agree/proceed**, risk medium, confidence high, zero pushback. `review_id a943aa26-7173-42cd-ba08-cb5f4e8e2440`, pinned to `reviewed_input_hash ab3f08b8cec348129b58934abb70e216890cdb294c4e5a839288b7718b6cd2e7` (sha256 of the migration file at review time).
- **PK apply gate: explicitly authorized** ("authorized"), after the full chain above was presented with the exact apply plan and preconditions.
- Applied via `execute_sql` (not `apply_migration` — that tool mints its own version and would desync the ledger from the file's timestamped identity, per standing house gotcha) against project `mbkmaxqhsohbtwsqolns`.
- Post-apply live re-verification: all 6 target cells confirmed `publisher_path_missing`/`no_publish_profile_row`/`publisher_onboarding`; a spot-check of 4 other cells (`property-pulse`/facebook/image_quote, `ndis-yarns`/facebook/image_quote, `ndis-yarns`/linkedin/video_long_form, a nonexistent client) all returned unchanged status; grants confirmed `postgres` + `service_role` only (no `anon`/`authenticated`); caller count confirmed 0 (still dark).

## 5. Constraints confirmed

- No change to `select_template`, `resolve_slot_assets`, or any publisher edge function — confirmed by diff scope (only the classifier function changed) and by `db-rls-auditor`'s independent body-diff.
- No dashboard/frontend change — `invegent-dashboard` repo not touched this lane.
- `publish_enabled=false` / `paused_until` handling explicitly NOT folded into the new status — proven by the dry-run and post-apply live checks on NDIS-Yarns's paused rows, which classify exactly as before.
- No grant widening — confirmed both by `db-rls-auditor`'s live read and the post-apply `information_schema.routine_privileges` check.
- Function remains dark — zero production callers, confirmed pre- and post-apply.
- Rollback authored and proven (byte-identical to the live pre-change body) before the apply gate, per T3 discipline.

## 6. Open issues

- **Dashboard follow-through not started.** `invegent-dashboard`'s `CapabilityStatus`/`CAPABILITY_STATUS_LABEL`/`CapabilityCell.tsx` still model only the six-status contract (see `docs/briefs/results/format-capability-indicator-v1-result.md` §11). The classifier now returns a 7th status the dashboard doesn't recognize — its own fail-closed `unrecognised_status:publisher_path_missing` → `unknown` handling (`lib/format-capability.ts:135-160`, `normaliseCapabilityPayload`) means this is safe (never misrepresents as `ready`), but the dashboard will render `publisher_path_missing` cells as a generic "Unknown — could not verify" until it's updated. This is expected and was the explicitly scoped next step, not a defect.
- **Base migration file's stale header.** `supabase/migrations/20260728034955_classify_format_capability_v1.sql` still says `STATUS: NOT YET APPLIED` in its own header comment even though it's long applied and live — `db-rls-auditor` flagged this as a cosmetic doc-drift item, not a blocker. Not fixed this lane (out of scope).
- **Pre-existing, unrelated issues surfaced during research, not fixed here:** `service_role` lacks `UPDATE` on `c.client_publish_profile`, so the self-healing `paused_until` writes in `instagram-publisher`/`youtube-publisher` silently no-op in production (already tracked in `docs/briefs/ndis-capability-leak-containment-apply-packet-v1.md`); YouTube's publish-eligibility guard is weaker than the other publishers' (fails open on a read error). Neither is this lane's scope.

## 7. Next recommended step

Update `invegent-dashboard`'s Format Capability Indicator to the seven-state contract — its own future Gate-1 brief, gated on this being proven stable (which it now is, per §4/§5 above). No code should be written for that until PK names it as a task.

---

## 8. Verification (chat fills this)

**Verdict:** `Pass`

**Notes:**

- Output matches the brief and PK's Design (A) selection exactly — precedence-first, row-existence-only, no scope creep into `publish_enabled`/`paused_until`.
- Full T3 chain ran clean: `ef-builder` minimal diff, live dry-run regression proof (zero unexpected changes across ~25 cells), `db-rls-auditor` pass, `branch-warden` safe, external review agree/proceed, explicit PK apply authorization.
- Post-apply live re-verification matches the pre-apply dry-run byte-for-byte on every checked cell.
- No unexpected files touched — exactly the migration, its rollback, and the brief.

## 9. Learning notes (chat fills this)

- `ef-builder` correctly flagged that it could not see the (at-the-time uncommitted) Gate-1 brief inside its isolated worktree, rather than silently proceeding as if it had full context or fabricating brief content — a good instance of a subagent surfacing an evidence gap instead of papering over it. It still executed correctly because the design spec was given directly and completely in its prompt; worth remembering that uncommitted orchestrator-side files are invisible to a fresh isolated worktree.
- Running the live `BEGIN...ROLLBACK` dry-run proof myself (rather than only trusting `ef-builder`'s local checks, which had no DB access at all) caught nothing wrong here, but is what actually produced the evidence base for both `db-rls-auditor`'s independent pass and the external review — for a T3 DDL change to a function with real live data dependencies, a orchestrator-run live dry-run is worth the two execute_sql calls it costs.
