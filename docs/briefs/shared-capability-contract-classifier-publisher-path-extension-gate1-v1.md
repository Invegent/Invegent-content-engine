# Brief — Shared Capability Contract classifier: `publisher_path_missing` extension (S5)

**Created:** 2026-07-29 Sydney
**Author:** chat (orchestrator)
**Executor:** Claude Code (`ef-builder` for the SQL diff, `db-rls-auditor` for review) — T3, isolated worktree
**Status:** **COMPLETE — applied live 2026-07-29** under explicit PK apply-gate authorization, full T3 chain clean (`db-rls-auditor` pass, `branch-warden` safe, external review agree/proceed). See `docs/briefs/results/shared-capability-contract-classifier-publisher-path-extension-result-v1.md`.
**Result file:** `docs/briefs/results/shared-capability-contract-classifier-publisher-path-extension-result-v1.md` (on completion)

**Lane class:** PRODUCT_PROOF · **Tier: T3** (DDL to a live, already-deployed, dashboard-consumed function; introduces a new data dependency on `c.client_publish_profile`). Full chain required: `db-rls-auditor` + external review pinned to the final diff hash + explicit PK apply gate + rollback proven before apply, per CCF-02 §Risk-tiered review chains.

---

## Task

Extend `public.classify_format_capability` (live, `supabase/migrations/20260728034955_classify_format_capability_v1.sql`) to detect and return a new **seventh** status, `publisher_path_missing`, for a `(client, platform, format)` cell where the client has **no publishing integration configured for that platform at all** — as distinct from having one but the render/template/asset/governance path failing. Then prove the existing six statuses are unaffected (byte-identical `status`/`reason_code` on every cell not newly reclassified). This is the follow-up scoped in `docs/briefs/results/format-capability-indicator-v1-result.md` §11, itself created because the dashboard's Format Capability Indicator v1 (shipped 2026-07-28/29, see that result doc) could not surface this distinction — the live classifier didn't make it.

**This lane does NOT touch the dashboard.** Updating the dashboard to render a 7th visible state is a separate, later outcome, gated on this classifier change landing and being proven stable — explicitly out of scope here per PK's 2026-07-29 instruction ("Extend the source capability contract... prove existing classifications remain stable, THEN update the dashboard... Do not implement that extension in this session" — that instruction governs this lane too: only the classifier change, not the dashboard follow-through).

## Source context

- `supabase/migrations/20260728034955_classify_format_capability_v1.sql` — the function being extended. Note: its own header comment still reads `NOT_APPLIED_...` / "STATUS: NOT YET APPLIED" — stale leftover from its draft-filename convention; it IS applied and live. Don't let the stale header mislead the diff.
- `docs/briefs/results/format-capability-indicator-v1-result.md` §11 — the follow-up that scoped this exact task; §10 records the process finding (a prior lane shipped without a recorded PK merge/deploy gate) that this lane must not repeat — see Forbidden actions.
- `docs/briefs/format-capability-indicator-implementation-packet-v1.md` §4 — the original open question: the live classifier composes `select_template` (governance) + `resolve_slot_assets` (shortage-vs-pipeline split) + `m.post_publish` (silent-degrade overlay), and has **zero** reference to `c.client_publish_profile` — whether a client can actually publish to a platform at all is invisible to it today.
- **Grounding research (this session, read-only, cited with file:line in the full report — summarized here):**
  - `c.client_publish_profile` has `UNIQUE(client_id, platform)`; the eligibility-relevant columns are `publish_enabled` (bool), `status` (text, `'active'` observed), `paused_until` (timestamptz, nullable), `page_id`/`page_access_token` (credentials). No RLS (`relrowsecurity=false`), service-role-only access pattern, consistent with the `c` schema generally.
  - An existing predicate function, `m.is_publish_eligible(client_id, platform)` (`supabase/migrations/20260524091020_cc_0019_publish_eligibility_gate.sql:12-30`), already answers a related but coarser question — it collapses "no row" / "disabled" / "paused" into one boolean and is consulted only at draft-generation time (`m.fill_pending_slots`), never by the publisher EFs or by `classify_format_capability`. Its grant posture (`anon, authenticated, service_role`) is broader than what this extension should use — mirror `classify_format_capability`'s own existing posture instead (service-role-only, `search_path=''`), not `is_publish_eligible`'s.
  - An **unapplied** prototype view, `supabase/migrations/20260508061900_proposed_audit_v_pipeline_reconciliation.sql:99-105`, already models the exact three-way split this brief needs: `unconfigured` (no row) vs. `standing_hold_disabled` (`publish_enabled=false`) vs. `temp_paused` (`paused_until` in the future) vs. `live`. Use this as the design precedent for **naming**, not as something this lane applies.
  - Publisher EFs (`facebook-publisher`, `instagram-publisher`, `linkedin-publisher` [dead code, undeployed], `linkedin-zapier-publisher`) each independently re-query the profile per queue row and throw `no_active_*_profile` when no row exists — an uncaught-exception path today, never a soft classification. YouTube's guard is weaker (fails open on a read error, only checks `paused_until`, not `publish_enabled` or row-existence) — a known, separately-tracked weakness (`docs/briefs/ndis-capability-leak-containment-apply-packet-v1.md:110-114`), not this lane's to fix.
- **Live grounding query (run this session, read-only, project `mbkmaxqhsohbtwsqolns`):** across all 4 live clients × 4 platforms, exactly 2 cells have **no** `c.client_publish_profile` row at all: `care-for-welfare-pty-ltd`/`youtube` and `invegent`/`youtube`. Today both classify as `template_missing` (`format_unmapped`) for `video_long_form` — the same status a client who **does** have YouTube configured but lacks a template would get. This is the concrete, live proof of the gap. All other 14 client×platform cells have a row (`status='active'`, `publish_enabled=true`); NDIS-Yarns's 4 rows all exist but are paused (`paused_until=2027-01-01`) — paused is NOT missing, and must not be reclassified by this change (see Scope).

## Scope

**In scope:**
- Add a new precedence check to `classify_format_capability`: if `c.client_publish_profile` has **no row** for `(client_id, platform)`, return `publisher_path_missing` with an evidence-cited `reason_code` (e.g. `no_publish_profile_row`) and a `routed_lane` naming the onboarding owner.
- **Design decision — RESOLVED 2026-07-29, PK selected (A).** Where this check sits in precedence relative to the existing checks (ready / silent-degrade overlay / template_missing / governance_unproven / pipeline_missing / asset_shortage) — two candidates were presented, both grounded in the live data above:
  - **(A) First, before `select_template` even runs, or immediately overriding a `ready` result.** Rationale: if there is no publisher at all, a governed render capability is moot — "ready" today doesn't check publish-profile existence, so a client with zero YouTube configuration but a fully governed render path would currently report `ready`, which is arguably misleading (nothing would ever actually publish). This matches the classifier's own precedent of putting the most safety-relevant fact first (silent-degrade already overrides the underlying blocker).
  - **(B) Only as a fallback when `select_template` is already fail_closed**, i.e. never overrides an existing `ready`. Lower blast radius (touches zero currently-`ready` cells) but leaves the "ready but nothing can publish" case unaddressed.
  - This brief recommends **(A)**, consistent with the classifier's own "capability readiness controls execution" governing rule, but flags it as a PK decision, not a default — (A) can flip a currently-`ready` cell to `publisher_path_missing` wherever a client has a governed render path but no publisher row (none observed live today, but possible in future data).
- Confine the check to `publish_enabled`-independent row existence only. **`publish_enabled=false` and `paused_until` in the future are explicitly OUT of scope for this status** — a row that exists but is disabled/paused continues to classify exactly as it does today (via the existing render-capability logic, unaffected by publish-profile state). This keeps the change to exactly one new status, not the broader `unconfigured`/`standing_hold_disabled`/`temp_paused` three-way split the prototype view models — that fuller split is a possible future extension, not this lane.
- Regression proof: re-run (a) the classifier's own original 6-cell live proof matrix (`docs/briefs/results/shared-capability-contract-classifier-result-v1.md` §5) and (b) this session's ~25-cell smoke matrix (`docs/briefs/results/format-capability-indicator-v1-production-smoke-v1.md` §3) — confirm byte-identical `status`/`reason_code` for every cell except the 2 genuinely-missing cells identified above, which must newly report `publisher_path_missing`.
- Update the function's own `COMMENT ON FUNCTION` to name 7 statuses; bump the migration to a new timestamped file (`CREATE OR REPLACE FUNCTION`, same identity — do not rename the function or touch its signature).

**Out of scope (route elsewhere — do NOT build here):**
- Any dashboard change (`CapabilityStatus`, `CAPABILITY_STATUS_LABEL`, `CapabilityCell.tsx` tone/help text) — separate future outcome, gated on this landing.
- `publish_enabled=false` / `paused_until` handling as their own statuses (the `standing_hold_disabled` / `temp_paused` split) — not authorized this lane.
- Fixing the YouTube publisher's weaker guard, the self-healing `paused_until` write no-op (`service_role` lacks `UPDATE` on `c.client_publish_profile` — confirmed live in the NDIS containment packet), or `m.is_publish_eligible`'s coarser boolean — all pre-existing, separately tracked issues, unrelated to this classifier extension.
- Any change to `select_template`, `resolve_slot_assets`, or any publisher EF.
- Deploying, merging, or applying anything without an explicit PK gate — see Forbidden actions below, this is a direct response to the process finding in the prior lane's result doc §10.

## Allowed actions

- `db-rls-auditor`: confirm `c.client_publish_profile`'s current live schema/grants/RLS posture (byte-verify against this brief's citations, don't trust them blind), and review the SQL diff.
- `ef-builder` (isolated worktree): author the `CREATE OR REPLACE FUNCTION` diff as a new timestamped migration file (do NOT edit the existing applied migration file in place — new migration, same function identity, per the house "migration name = permanent identity" rule applied to the file, not the function).
- Run the regression proof matrix (read-only `execute_sql` calls against a **staged/dry-run** environment or via `BEGIN...ROLLBACK` against prod per the house dry-run pattern — Supabase dev branches come up bare/useless for this per prior lane learning, so use a prod `BEGIN...ROLLBACK`, never an uncommitted live apply).
- Draft the rollback (`DROP`-and-recreate-prior-version or a straight `CREATE OR REPLACE` reverting to the current live body) and prove it before requesting the apply gate.
- `ask_chatgpt_review` on the final diff, pinned to its hash.

## Forbidden actions

- **No apply/deploy of the migration without an explicit PK gate.** The immediately prior lane on this same classifier shipped a related dashboard change without a recorded gate (`docs/briefs/results/format-capability-indicator-v1-result.md` §10) — this lane must not repeat that. `ef-builder` prepares the diff and stops; the orchestrator runs the full T3 chain and external review, then **stops for PK** before any `execute_sql`/`apply_migration` apply call.
- Do not touch `invegent-dashboard` (separate repo) at all this lane.
- Do not change `publish_enabled`, `paused_until`, or any other row in `c.client_publish_profile` — read-only consumption only.
- Do not widen the function's grant beyond service-role-only, and do not adopt `is_publish_eligible`'s broader `anon, authenticated` grant.
- Do not fold `publish_enabled=false` / `paused_until` handling into this status without a separate PK decision (see Scope).
- Active hold-states per `docs/00_sync_state.md` apply — in particular, NDIS-Yarns's 4-platform publish pause (`paused_until=2027-01-01`, interim containment) is unrelated to and unaffected by this change; do not touch it.

## Success criteria

- New migration adds a `publisher_path_missing` check to `classify_format_capability`, `CREATE OR REPLACE` (same signature/identity), `SECURITY DEFINER`/`search_path=''`/service-role-only preserved.
- Live re-verification (post-apply, under the PK gate) shows: `care-for-welfare-pty-ltd`/youtube/`video_long_form` and `invegent`/youtube/`video_long_form` now return `publisher_path_missing`; every other cell in both regression matrices (original 6-cell proof + this session's ~25-cell smoke matrix) returns byte-identical `status`/`reason_code` to its pre-change value.
- `db-rls-auditor` review clean (no must-fix); external review pinned to the final diff hash, no unresolved `concrete_defect`.
- Rollback proven (a dry-run revert reproduces the pre-change live behavior exactly) before the apply gate is requested.
- PK's precedence-order design question (Scope, (A) vs (B)) is explicitly answered by PK, not defaulted.

## Stop condition

Report result per result template after the diff is authored, reviewed, and regression-proven in a dry-run — then **stop for the PK apply gate**. Do not apply/deploy. No dashboard work follows from this lane even after apply — that is next lane's own Gate-1.

---

## Notes

- This is a T3 lane specifically because the previous, adjacent lane on this same classifier shipped without a recorded gate — treat that as a standing caution, not a reason to rush this one through faster.
- If `db-rls-auditor`'s independent schema read of `c.client_publish_profile` disagrees with this brief's column citations (reconstructed from migration comments and prior briefs, not a fresh `information_schema` read), the live read wins — flag the discrepancy rather than silently trusting this brief.
