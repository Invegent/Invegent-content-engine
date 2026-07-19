# Brief — shared-asset-pool P2 dark additive DDL (six empty fenced tables)

**Created:** 2026-07-19 Sydney
**Author:** chat (brief-author draft; orchestrator persists)
**Executor:** Claude Code (ef-builder, isolated worktree) + PK (apply hard-stop)
**Status:** draft — awaiting PK Gate-1 approval (incl. tier decision)
**Result file:** `docs/briefs/results/shared-asset-pool-p2-dark-ddl.md` (created on completion)

**Lane class:** SIDE_PROVING (proposed — infrastructure build). **Tier: PK decision at Gate 1** — proposed T2 (dark/additive/empty net-new objects) vs T3 (Convention 3 routes grants → T3); the mandated chain runs at T3-strength either way (see Notes).

---

## Task

Author and prepare (LOCAL-only, do NOT apply) the P2 migration for the generic shared asset pool: the **dark, additive, empty** DDL that creates the **six** tables specified by the RATIFIED design-of-record — `m.shared_asset`, `m.shared_asset_suitability`, `m.shared_asset_license`, `m.shared_asset_review_event`, `m.shared_asset_usage_event`, and `c.client_asset_profile` — plus their RLS/grant posture, and a validated rollback. The tables ship **empty**: no data, no resolver reads them, no runtime effect. Mirrors the music-library v0 prepared/dark apply. Take the migration through the full review chain to the PK apply hard-stop; PK runs `apply_migration`; then verify post-apply.

## Source context

- `docs/briefs/shared-asset-pool-design-of-record-v1.md` — **RATIFIED 2026-07-19 (register v5.74)**, the authoritative design. §2 = the six tables + natural keys + RLS/grant posture; §4 = the four fences (default-off, fenced-until-approved); §5 = the scoped-delta pool-neutrality invariant (a P4/P5 concern, OUT of scope here); §11 = boundaries; §12 = the R1 MCP precondition + carried should-fixes. **§2 load-bearing caveat:** anon/authenticated already hold schema-`c` USAGE (`20260707010000_grant_service_role_select_client.sql`), so `c.client_asset_profile` must **never** receive a table-level grant to anon/authenticated — the REVOKE discipline is what keeps it unreachable.
- `docs/briefs/generic-shared-asset-pool-assessment-v1.md` §5 P2 row: "Dark, additive DDL … no `client_id`, four fences, deny-all/service-role posture, empty. No resolver read, no runtime effect. Mirrors the music-library apply. Tier T2. Gate artifact: Migration packet → db-rls-auditor → external (hash-pinned) → PK apply hard-stop; rollback written+validated." §0/R1: the P1 orchestrator-read substitution for `db-rls-auditor` is a **T1-only stopgap, explicitly NOT a T2/T3 precedent**.
- `supabase/migrations/20260708224532_create_music_library_v0.sql` — the precedent to mirror **exactly** in posture: RLS-enabled deny-all (no permissive policy; service_role bypasses RLS), `REVOKE ALL … FROM PUBLIC, anon, authenticated` on every table (all three named), `GRANT` writes `TO service_role`, unexposed `m.*` (no schema USAGE grant to anon/authenticated), UNIQUE natural keys, PK-gated apply header, reference-only reverse-create-order rollback.
- `CLAUDE.md` — Convention 3 tiering; standing deploy/DB gotchas (migration name = permanent identity; REVOKE anon/authenticated not just PUBLIC; PGRST106 on unexposed schemas; re-verify HEAD before commit; isolated worktrees); CCF-02 findings contract.
- `docs/00_sync_state.md` / `docs/00_action_list.md` — v5.74 marker: **P2 dark-DDL = separate future T2 gate**; **R1: `db-rls-auditor` was MCP-less at P1 → P2 MUST re-run MCP-enabled + `get_advisors` before any DDL**; push = separate PK hard stop.

## Scope

**In scope:**
1. The **migration packet**: the P2 SQL (six-table create-order per DoR §2, parents before children; four fences default-off on `m.shared_asset`; `UNIQUE(asset_key)`; `UNIQUE(asset_id, scope_kind, scope_value)`; 1:1 fail-closed licence booleans; `c.client_asset_profile` PK=`client_id` REFERENCES `c.client(client_id)`, RLS-enabled deny-all, carrying `asset_pool_policy`); the RLS-enable + REVOKE + service_role-GRANT posture on all six; the **rollback SQL** (DROP the six tables in reverse create-order); and the deploy/apply plan (`apply_migration`, PK-run). Authored LOCAL-only in an isolated worktree.
2. The **review chain** (see Allowed actions).
3. The **PK apply hard-stop** and **post-apply verification**.
4. The **result doc + a single register pointer** (Convention 1).

**Out of scope (each a separate, later, independently-gated phase):** the storage `_generic/` prefix and any upload (**P3**); any resolver edit or resolver version (**P4/P5**), including the §5 scoped-delta assertion-replica ↔ resolver-v2 co-versioning; any data insert, intake, promotion, approval, or un-fence; the dashboard IA (**P6**); any change to `c.client_brand_asset` (incl. nullable `client_id` — explicitly rejected, risk 4.8); any EF deploy.

## Allowed actions

- Author the P2 migration SQL and its rollback SQL, LOCAL-only, in an **isolated worktree** (re-verify HEAD before any commit).
- Run `branch-warden` (verdict must be `safe`): HEAD/branch/parity/diff, change set == migration file(s) only, migration name/number **new and unused**.
- Run **`db-rls-auditor` MCP-enabled** (`mcp__supabase__*`, incl. `get_advisors` security + performance) against the migration — **HARD PRECONDITION (R1)**. Verdict must be `pass`.
- Call `ask_chatgpt_review` on the **final** migration diff, `reviewed_input_hash` pinned to that exact diff; re-run if it changes.
- **Validate the rollback BEFORE apply** (a hermetic apply-then-rollback proof — e.g. on a throwaway Supabase dev branch — that the six tables drop cleanly in reverse order and leave no residue).
- Present the migration + rollback + clean reviews to PK at the **apply hard-stop**; PK runs/authorises `apply_migration`.
- **Post-apply verification** (read-only): six tables exist and are empty (0 rows); RLS enabled, no permissive policy, on all six; REVOKE effective (no anon/authenticated grant on any of the six — especially `c.client_asset_profile`); service_role holds the writes; UNIQUE keys + PK/FK present; `m.*`/`c.*` NOT REST-exposed; all four fences default-off on `m.shared_asset`; `get_advisors` clean or every advisory triaged and surfaced to PK.
- Write the result doc and a single register pointer.

## Forbidden actions

- **No apply, no deploy, no push without PK.** `apply_migration` is a PK hard-stop; push is a separate PK hard stop.
- **No orchestrator-read substitution for `db-rls-auditor`.** The P1 orchestrator-read was a **T1-only stopgap explicitly NOT valid for P2**. If the session lacks Supabase-MCP for the auditor, the lane **STOPS before apply and surfaces to PK** — no substitution.
- **Do NOT grant any of the six tables to `anon` or `authenticated`.** anon/authenticated already hold schema-`c` USAGE; REVOKE all three names, GRANT writes to `service_role` only.
- **Do NOT expose `m.*`/`c.*` over REST** (no schema USAGE grant) — reads route later via a SECURITY DEFINER RPC (avoids PGRST106). No RPC in P2.
- **No resolver may read these tables** — ships **dark**. Do NOT edit any resolver; `resolve_slot_assets` / `resolve_brand_assets` / PP `image_quote` behaviour must be byte-unchanged.
- **No storage change / no `_generic/` upload** (P3), **no data insert / intake / promotion / approval / un-fence** (P3/P5), **no dashboard** (P6), **no `c.client_brand_asset` change** (incl. nullable `client_id`).
- **Do NOT co-version the §5 assertion replica with the resolver-v2 union** here — a P4/P5 build requirement, out of P2 scope.
- **Migration name = permanent identity** — never reuse a number/name; a revision gets a NEW number + distinct name.
- **Do NOT mark anything proven; do NOT edit `CLAUDE.md` or the registers beyond the single approved result-pointer.**

## Success criteria

- The six tables exist **empty** (0 rows) after PK apply.
- **Fenced + correctly posture'd:** four fences default-off on `m.shared_asset`; RLS enabled deny-all (no permissive policy) on all six; `REVOKE ALL FROM PUBLIC, anon, authenticated` effective; `service_role` holds the writes; **no anon/authenticated grant on any of the six**; `m.*`/`c.*` not REST-exposed.
- **Keys correct:** `UNIQUE(asset_key)`; `UNIQUE(asset_id, scope_kind, scope_value)`; `c.client_asset_profile` PK=`client_id` FK→`c.client(client_id)`; 1:1 fail-closed licence.
- **`db-rls-auditor` ran MCP-enabled and returned `pass`; `get_advisors` clean or advisories PK-triaged.**
- **Rollback SQL written AND validated before apply**; migration name unique/new.
- **No runtime/resolver effect:** no resolver reads the new tables; PP `image_quote` output byte-unchanged.
- PK-applied; result doc + one register pointer recorded.

## Stop condition

STOP at the **PK apply hard-stop** with the migration + validated rollback + clean `branch-warden` / MCP-enabled `db-rls-auditor` / hash-pinned external review in hand; PK runs/authorises the apply. **STOP-and-surface to PK** immediately if `db-rls-auditor` cannot run MCP-enabled (no substitution). Any non-clean review verdict halts the lane and surfaces to PK. When post-apply criteria are met, report per the result template, then stop.

---

## Notes

- **Tier — PROPOSED T2, PK decides at Gate 1.** Assessment §5 and the DoR tag P2 **T2** (dark / additive / empty; net-new objects; no existing grant changed; no caller wiring; mirrors music-v0). CLAUDE.md Convention 3 sets DML/DDL ≥ T2 and routes **callers/grants/deploy/publish/secrets → T3**; this migration carries GRANT/REVOKE and is production-touching DDL at apply, which plausibly pulls it to T3. This draft does NOT silently pick — it proposes T2 on the grounds that the grants are net-new service-role-only posture on net-new empty fenced objects (not a change to any live caller's reach), and flags T2-vs-T3 as a PK Gate-1 decision. The mandated chain (MCP-enabled `db-rls-auditor` + hash-pinned external + PK apply hard-stop + rollback-proven-before-apply) is **already T3-strength**, so the practical gate is the same either way; escalation up is free, de-escalation needs a fresh Gate 1.
- **Lane class — PROPOSED SIDE_PROVING** (infrastructure build).
- **Column-level shape** (exact CHECK vocabularies; whether `sensitivity_class`/`purpose_bound`/`cultural_review_required` are real columns vs `asset_meta` keys) is specified in the migration packet at build time and reviewed at db-rls-auditor / Gate-1 — the DoR §2 gives working names + load-bearing keys; this brief does not fix column-level SQL.
- This is `brief-author`'s **first DB-lane draft** — reviewed with candidate-level scrutiny.
- **PK advisory-triage posture:** expect a `get_advisors` triage decision at the apply gate (e.g. RLS-enabled-no-policy is intended-by-design; an unindexed FK on `c.client_asset_profile.client_id` may be flagged) rather than assuming a zero-advisory pass.
