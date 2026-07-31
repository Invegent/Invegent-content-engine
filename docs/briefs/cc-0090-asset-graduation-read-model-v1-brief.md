# Brief cc-0090 — Asset Graduation Read Model v1 (O-4 follow-on)

**Created:** 2026-07-30 Sydney
**Author:** chat
**Executor:** Claude Code
**Status:** ✅ **COMPLETE — GATE 1 approved 2026-07-30, T3 apply authorised + applied
2026-07-31.** Migration `20260731001557_cc_0090_asset_graduation_read_model_v1` is live.
Result: `docs/briefs/results/cc-0090-asset-graduation-read-model-v1-result.md`.
**Lane classification (CCF-02):** SAFETY_GATE. **Tier: T3** (DDL authoring with eventual GRANT
surface — per Convention 3, "DML/DDL ≥ T2; callers/grants/deploy/publish/secrets → T3").
**Result file:** `docs/briefs/results/cc-0090-asset-graduation-read-model-v1-result.md` (created on
completion)

---

## Task

Design and author — but do **not apply** — the smallest secret-free, read-only database interface
needed to run Asset Graduation Slice 1 evaluation batches repeatedly without a prompted `execute_sql`
call per batch. This is the named follow-on ratified at **O-4** in
`docs/briefs/asset-graduation-contract-v1.md:448`: *"the required follow-on before any automated
production authority is Asset Graduation Read Model v1 — exposing only the asset, fence, pool-policy
and resolver-reachability fields the contract requires, through a dedicated secret-free read-only view
or RPC."* Prove it reproduces the Slice-1 live shadow batch byte-identically, then **stop at the T3
database apply gate** — the view/RPC is authored, tested, and reviewed, but the actual `CREATE VIEW` /
`CREATE FUNCTION` against the live DB is a separate PK-run step.

## Source context

- `docs/briefs/asset-graduation-contract-v1.md:448` (§13 O-4) — the ratified requirement this brief
  instantiates. Also §1 (scope table), §8 (declared vs resolver-reachable — explicitly **not** in
  scope here, see Boundaries), §13 O-5 (shared-pool ownership must classify `client_owned` /
  `shared_pooled` / `shared_unreachable` / `ownership_indeterminate`).
- `docs/briefs/results/asset-graduation-slice1-build-result-v1.md` — the **pinned baseline** to
  reproduce byte-identically: the 15-real-asset shadow batch (Property Pulse + Invegent), its
  ownership-classification counts (§5.1 item 2), and the four required historical defect-class proofs
  (§2).
- `docs/briefs/artifacts/asset-graduation-candidates-v1.sql` — the **live-verified column provenance**
  for every table this view touches (`c.client_brand_asset`, `c.shared_creative_asset`,
  `c.client_asset_pool_policy`, `c.geo_class`, `c.client`). This was corrected against the deployed
  schema by `db-rls-auditor` on 2026-07-30 (three real defects found and fixed) — **reuse these
  verified shapes; do not re-derive from the migration files**, which have already diverged from
  deployed schema at least twice in ICE history (see `migration-ledger-git-drift` memory).
- CLAUDE.md **"Operator read path (R0)"** — the existing secret-free view pattern (`ice_ro` schema +
  `scripts/db-read.py`, schema-USAGE confinement, 10 existing views, zero-prompt reads). This lane's
  structural model — but note **none of the 10 existing R0 views expose asset/fence/pool data**
  (confirmed in the Slice-1 read pack header), so this is new view surface, not a reuse of an existing
  view.
- `.claude/helpers/asset-graduation-check.mjs` + `.claude/helpers/asset-graduation-check.test.mjs` —
  the evaluator this read model feeds; its input contract (the JSON payload shape) is fixed and must
  not change.
- CLAUDE.md team table — `db-rls-auditor` (schema/RLS/grant review, required before any DDL), the R0
  view pattern's `PostgREST exposed schemas + default-acl trap` memory (new tables/views are born
  anon-writable/readable unless REVOKE explicitly names `PUBLIC, anon, authenticated`).

## Scope

**In scope:**
- One or more new read-only views (or a single SECDEF read-only RPC), modeled on the `ice_ro` pattern,
  exposing exactly the fields the Slice-1 evaluator consumes today (per the read pack's field list):
  asset identity + ownership (`asset_id`, `client_id`, `source_table`); client/shared classification;
  approval + active fences (`is_active`, `asset_meta->>'approved'`, `production_use_allowed`,
  `approval_status`); usage/kind/mime; dimensions (`width`/`height`), duration, mime type; rights and
  provenance fields (source/provider/licence/expiry/commercial-use); geography (`geo_scope`,
  `geo_basis`) and theme (`subject_tags`) metadata; `c.client_asset_pool_policy` fields for the target
  client; platform/template-slot fields (`platform_scope`, `asset_meta_usage`,
  `safe_for_text_overlay`); and the existing-eligible-pool sha256 set (mirroring the read pack's
  `existing_hashes` CTE) for C9 duplicate checks.
- Both client-owned (`c.client_brand_asset`) and shared (`c.shared_creative_asset`) assets, the latter
  joined against the **target client's** `c.client_asset_pool_policy` row (absent row ⇒ `client_only`
  ⇒ structurally unreachable — must be preserved, not defaulted away).
- Hermetic + live proof that the new read model reproduces the Slice-1 baseline exactly (see Success
  criteria).
- Rollback (`DROP VIEW` / `DROP FUNCTION`) authored and proven.
- Specialist review chain (`db-rls-auditor`, `apply-harness-auditor` if a harness packet results,
  `branch-warden`) + `ask_chatgpt_review` pinned to the final artifact hash.

**Out of scope:**
- Applying the view/RPC to the live database. That is the T3 apply gate this lane stops at.
- Any change to `resolve_slot_assets`, `select_template`, any worker, or any template.
- C12 (declared == resolver-reachable) enforcement — remains guard G5 inside a future T3 promotion
  apply, not this read model (per contract §8 and the Boundaries below).
- Any asset sourcing, harvesting, intake, promotion, demotion, or retirement.
- Widening general SQL/`execute_sql` access, or adding any R0 view unrelated to this contract's needs.
- `purpose_bound` (boolean), `vertical_key`, and `allowed_clients`/`excluded_clients` shared-asset
  reachability refinements — named gap in Slice 1, carried forward as a named gap here too unless
  trivial to include; do not silently claim completeness beyond what Slice 1 itself modeled.

## Allowed actions

- Read-only DB inspection to confirm current live schema (via `db-read.py`/R0 where a view covers it,
  `execute_sql` read-only otherwise, `get_advisors`) — same discipline as the Slice-1 `db-rls-auditor`
  pass.
- Author the new view(s)/RPC SQL as a **reviewed artifact file**, not yet applied.
- Author/extend hermetic tests proving the SQL's intended shape and the evaluator's compatibility with
  it.
- Prove live equivalence via a `BEGIN ... ROLLBACK` transaction against production (per
  `supabase-dev-branches-come-up-bare` memory — a dev branch has no `c` schema and cannot serve this
  proof) — creating the view/function inside the transaction, querying it, and rolling back, so nothing
  persists.
- Draft rollback SQL and prove it (byte-identical to a documented pre-state, per §12 rollback
  requirements in the contract, applied by analogy).
- Invoke `db-rls-auditor`, `apply-harness-auditor` (if the packet declares any control/assertion),
  `branch-warden`.
- Call `ask_chatgpt_review` on the final packet, pinned to its hash.
- Write the result doc per house template.

## Forbidden actions

- **Do not apply** the `CREATE VIEW` / `CREATE FUNCTION` (or any GRANT) to the live database outside a
  `ROLLBACK`ed proof transaction. The real apply is a separate PK-run T3 step, out of this lane
  entirely.
- Do not grant `SELECT`/`EXECUTE` to `PUBLIC`, `anon`, or `authenticated` without an explicit,
  documented REVOKE naming all three (per `postgrest-exposed-schemas-and-default-acl-trap` memory —
  new objects are born anon-readable by default).
- Do not grant any production graduation authority — this view is read-only evidence, never a decision
  surface.
- Do not auto-promote, auto-graduate, or otherwise mutate any asset's fence state.
- Do not source new assets.
- Do not implement C12 (declared == resolver-reachable) enforcement.
- Do not touch `resolve_slot_assets`, `select_template`, any worker, or any template.
- Do not widen `execute_sql`/general SQL access as a substitute for building the view.
- Do not commit or push without PK's explicit word.

## Success criteria

- The new read model, queried for the same two client contexts (Property Pulse, Invegent) and the same
  15 real assets, reproduces the Slice-1 result doc's classification exactly: `{client_owned: 4,
  shared_pooled: 2, shared_unreachable: 9, indeterminate: 0}`.
- Evaluator output run against the new read model's payload is **byte-identical** (`diff` empty) to the
  pinned Slice-1 baseline output for the same batch.
- Property Pulse's shared rows classify `shared_unreachable` through the new model (no
  `client_asset_pool_policy` row for that client — must remain true, not silently defaulted).
- The same nine shared rows classify `shared_pooled` for Invegent through the new model (real permissive
  policy, `allow_global_shared=true`).
- B-roll usage (`broll_background`) and slot typing (`asset_kind` video vs image, derived from
  `asset_meta->>'mime'`) are represented identically to Slice 1's corrected logic — no regression of
  the two live-truth corrections recorded in the Slice-1 result (§3, §4).
- Rollback SQL authored, proven (drops cleanly, affects no other object), and reviewed.
- `db-rls-auditor` verdict is clean, or `concerns` with every must-fix applied and re-verified (same
  discipline as Slice 1's three real schema defects).
- `ask_chatgpt_review` returns clean / no unresolved escalation on the final packet, pinned to its hash.

## Stop condition

Once the view/RPC SQL, its rollback, the live `BEGIN...ROLLBACK` equivalence proof, and the full
specialist + external review chain are complete and clean, write the result doc per house template and
**stop at the T3 database apply gate**. Do not run the `CREATE VIEW`/`CREATE FUNCTION`/`GRANT`
statements against the live database outside a rolled-back proof transaction. PK applies (or
separately authorizes the apply) in a follow-on gate.

---

## Notes

Tier is T3 rather than T2 because this view's eventual GRANT surface is itself a caller-facing change
(CLAUDE.md Convention 3: "callers/grants/deploy/publish/secrets → T3"), even though this lane's own
actions stay entirely inside read-only inspection and rolled-back proof transactions. If, on reflection,
PK judges the authoring-and-proof-only scope of this lane to be T2 with the apply itself as the T3 step,
that's a defensible read too — flagging so the tier assignment is a conscious choice, not a default.
