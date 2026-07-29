# Brief — Creative Templates Dashboard Section + Seven-State Capability Correction

**Created:** 2026-07-29 Sydney
**Author:** chat (orchestrator, plan approved by PK in-session — this brief records the
approved plan as the durable Gate-1 artifact)
**Executor:** chat (orchestrator-driven: `ef-builder` ×2 isolated worktrees, `db-rls-auditor`,
`branch-warden`, external review, PK deploy/merge gate)
**Status:** issued
**Result file:** `docs/briefs/results/creative-template-portfolio-dashboard-result-v1.md`
(created on completion)
**Lane classification:** PRODUCT_PROOF · **Tier T2** (dark/additive DB · isolated code ·
read-only dashboard)

---

## Task

Give PK a truthful, read-only dashboard view of the Creatomate template portfolio —
which templates are live, ready for proof, blocked or retired, and why production
keeps selecting the same creative style — inside the selected client's dashboard
profile. In the same release, extend the dashboard's six-status Format Capability
Indicator to recognise the seventh live classifier status, `publisher_path_missing`
(shipped dark in CE migration `20260729120000`, no dashboard consumer yet).
Read-only first release: zero controls (no promote/retire/activate, no selector
weight change, no assignment mutation, no governance-flag flip). Full task spec is
PK's original message this session; the approved implementation plan is
`C:\Users\parve\.claude\plans\drifting-sleeping-moore.md`.

## Source context

- `docs/briefs/results/creatomate-template-graduation-matrix-v1.md` (commit `8e1c0ff`)
  — the 27-template ground truth this dashboard must not contradict, including the
  known DB/provider contradiction on row `fb9820f8`.
- `docs/briefs/results/broll-rotation-readiness-handoff-v1.md` — B-roll pool=1,
  floor=4/target=6, saved-vs-effective output spec, platform-scope inertness.
- `docs/briefs/results/shared-capability-contract-classifier-publisher-path-extension-result-v1.md`
  §7 — names this dashboard update as the required next step for the 7th status.
- `docs/briefs/results/format-capability-indicator-v1-result.md` §11 — the existing
  six-status contract and its fail-closed `unknown` handling.
- `docs/00_sync_state.md` v6.49 — the corrective rule this lane restores: dashboard
  production changes need an explicit recorded PK merge/deploy gate.
- `supabase/migrations/20260630042316_tmr3_template_metadata_registry.sql` — the 8
  governance tables this build reads from.
- `supabase/migrations/20260719150000_ice_ro_r0_views_and_confined_role.sql` — the R0
  view/grant pattern (not used directly here, but the house convention for additive
  read surfaces).
- `supabase/migrations/20260729150000_cc0086_voice_config_write_rpc_v1.sql` and
  `20260719012947_create_get_client_creative_governance_rpc_v1.sql` — the SECURITY
  DEFINER read-RPC pattern this build clones exactly (grants, `SET search_path=''`,
  owner `postgres`).
- `invegent-dashboard` repo, `origin/main` (NOT the locally checked-out
  `tmr-template-intake-ui-v0` branch) — `app/(dashboard)/clients/page.tsx`,
  `actions/creative-library.ts`, `components/creative-library/*`,
  `lib/format-capability.ts`, `components/format-capability/CapabilityCell.tsx`.

## Scope

**In scope:**
- CE repo: one new migration adding `public.get_creative_template_portfolio(p_client_slug)`
  and `public.get_creative_template_portfolio_summary(p_client_slug)`, both SECURITY
  DEFINER / STABLE / `service_role`-only, additive-only (zero changes to any existing
  function/table/grant/worker).
- Dashboard repo: new "Creative Templates" tab on `app/(dashboard)/clients/page.tsx`,
  built off `origin/main` in a fresh isolated worktree; extension of
  `lib/format-capability.ts` + `CapabilityCell.tsx`'s four lockstep maps to add
  `publisher_path_missing`.
- Full T2 review chain + external review + explicit PK deploy/merge gate.

**Out of scope:**
- Any control that promotes, retires, activates, or reassigns a template.
- Any change to `select_template`, `resolve_slot_assets`, `classify_format_capability`,
  or any worker.
- Mutating `c.creative_provider_template.status` on row `fb9820f8` or any other row —
  the contradiction is displayed, never corrected, this lane.
- Building a B-roll shortage detector, un-fencing any template, or sourcing/promoting
  any B-roll clip (separate, already-carried items).
- The draft Global Client Picker Slice-3 completion brief — this build reads whatever
  `?client=` resolution `app/(dashboard)/clients/page.tsx` already does today; it does
  not implement the unified picker.

## Allowed actions

- Read/query CE and dashboard repos and the live Supabase project (read-only) to
  ground every field.
- `ef-builder`: author the CE migration in an isolated worktree; author the dashboard
  tab + capability-map extension in a second, fresh isolated worktree branched from
  `invegent-dashboard`'s `origin/main`.
- `db-rls-auditor`: live read-only verification of the new RPCs (grants, isolation,
  join correctness) via `execute_sql`/`db-read.py`.
- `branch-warden`: git safety checks on both repos before any commit.
- Orchestrator: call `ask_chatgpt_review` on the final combined diff; present the
  deploy/merge plan to PK.

## Forbidden actions

- Deploying the dashboard, applying the CE migration, or merging any branch without
  explicit PK authorization at the deploy/merge gate.
- Widening any grant beyond `service_role` EXECUTE on the two new functions.
- Silently reconciling the `fb9820f8` DB-vs-provider contradiction by editing the row.
- Reproducing `classify_format_capability`'s decision logic in the frontend — the
  dashboard may only label a status string the DB already returns.
- Any action listed in "Out of scope" above.
- Active hold-states from `docs/00_sync_state.md` v6.57: B-roll pool is still 1 (below
  the 4/6 floor) — the dashboard must display this honestly, not imply normal volume
  has resumed; both existing B-roll rows are still `{youtube}`-scoped — the new
  dashboard must not claim broader platform coverage than what the resolver actually
  honours today (§2.4 of the handoff: scope is inert at the production call
  signature — display the declared scope AND note it is not enforced, do not imply
  enforcement).

## Success criteria

- Both new RPCs deployed to a reviewed, additive-only migration; `db-rls-auditor`
  pass with a live cross-client isolation probe.
- Dashboard "Creative Templates" tab renders every field in PK's list, with Lifecycle
  and Runtime as two distinct badges (never collapsed), raw evidence shown alongside
  every derived state.
- B-roll status card shows saved spec, effective spec, eligible pool count, and the
  pool-floor warning (distinct single-clip wording) — matches the handoff doc exactly.
- `fb9820f8` renders as retired/provider-missing, never production-capable.
- `publisher_path_missing` renders correctly for the CFW/Invegent × YouTube live
  example; the existing six statuses render unchanged.
- Client isolation proven live: a second client's `client`-scoped rows never appear
  in another client's view.
- Full review chain clean (or non-clean items routed and resolved per CCF-02 triage)
  before the diff reaches PK.

## Stop condition

Build + full review chain, present the exact deploy/merge plan and preconditions to
PK, then **stop**. Do not apply the migration or merge/deploy the dashboard change
without a separate, explicit PK authorization. After PK-authorized deploy and a
production smoke pass, write the result doc, register pointers, commit, and push.

---

## Notes

Two open design/product calls flagged to PK for the deploy-gate presentation (not
blocking the build, but worth a decision before ship):
1. The `fb9820f8` provider-deletion evidence is encoded as a small hardcoded `VALUES`
   list inside the new RPC rather than a new evidence table — flagged in the plan as
   a call-out PK can override.
2. `worker_unsupported` Runtime classification for video families beyond the proven
   `stat_hero_card` shape is a conservative default (per the graduation matrix's
   confirmed finding that 4 of the 6 fenced "reskin" rows have zero worker render
   path) — if a family turns out to have undocumented worker support, this will
   under-classify it as `worker_unsupported` rather than over-claim readiness,
   consistent with PK's "surface missing evidence" instruction.
