# Result cc-0046 — Orthogonal Gap Classification & Routing Precision (precursor lane)

**Brief file:** `docs/briefs/cc-0046-orthogonal-gap-classification-brief.md` (rev-3, Gate-1 APPROVED at `d1ca6de`)
**Executed by:** Claude Code (orchestrator-direct authoring — see §6 substitution note) + PK gates
**Completed:** 2026-07-21 Sydney — **BUILD + PROOF complete; STOPPED at the first T3 production-apply gate. No production change made.**

---

## 1. Result status

`Partial` — build, hermetic proof, live-fixture proof, and full review chain complete; **three T3 apply gates (DDL+helpers · functions · backfill) remain PK-gated and UNAPPLIED.** Nothing deployed, migrated, backfilled, or sourced.

## 2. Commit(s)

- (to be committed to `claude/new-session-10ofji` after the review chain is clean — feature-branch record only; **not** applied to production)

## 3. Files changed (all additive; feature-branch only). **rev-2 hashes (post-Concern-fix; supersede `ce3e4732…`/`1989bc76…`):**

- `supabase/migrations/20260721100000_cc0046_asset_gap_orthogonal_classification_ddl_v1.sql` — Artifact 1 (DDL + helpers, now incl. `derive_template_vertical` + reworked `probe_asset_inventory`). sha256 **`466bb7d8…`**
- `supabase/migrations/20260721110000_cc0046_analyze_and_writer_orthogonal_v1.sql` — Artifact 2 (now replaces **3** fns: refactored `resolve_slot_assets` + analyze + writer). sha256 **`367aae63…`**
- `supabase/migrations/20260721120000_cc0046_backfill_open_rows_v1.sql` — Artifact 3 (backfill; unchanged). sha256 `5ef9cca3…`
- Combined-packet hash (external-review pin): **`b12b3864…`**
- `_harness/cc0046_hermetic/{test_pure_functions.sql, test_probe_seeded.sql, analyze_body.diff, writer_body.diff, resolve_body.diff}` — proof harness + diffs.
- `_harness/cc0046_ddl/rollback.sql`, `rollback_functions.sql` — Artifact 1/2 rollbacks (Artifact 2 rollback = byte-exact prior bodies).
- `_harness/cc0046_backfill/rollback.sql` — Artifact 3 rollback.
- `_harness/cc0046_hermetic/test_pure_functions.sql`, `analyze_body.diff`, `writer_body.diff` — hermetic proof harness + additive-only diffs.
- `docs/briefs/results/cc-0046-orthogonal-gap-classification.md` — this doc.

## 4. Actions taken (evidence)

**Binding exhaustiveness proof (read-only, project `mbkmaxqhsohbtwsqolns`) — PASS.** The only governed reusable image-asset stores in `c`/`m` are `c.client_brand_asset` + `c.shared_creative_asset` (the sole `asset_url`-bearing candidate stores; `c.brand_avatar` is avatar-subject/consent-gated, `client_brand_profile.brand_logo_url` is a pointer, `m.post_*` are rendered output). No third DB candidate store. In-flight refs (`candidates_ref`/`harvest_manifest_ref`) all NULL, 0 rows `harvesting`/`candidates_ready`. Per PK's binding ruling, `_harness/image_harvester_v0/**` filesystem packages are non-authoritative pre-intake artifacts. `probe_asset_inventory` declares coverage over these two tables + in-flight demand and returns `coverage_conclusive=false` for anything it cannot read.

**Hermetic proof (ephemeral PG 16) — 16/16 fixtures PASS.** The full decision matrix lives in the PURE `diagnose_gap(st, derive, probe, slot)` (jsonb→jsonb, no schema dep), so every D6 fixture is runnable: F1–F3 carousel→`(assignment,unassigned)`/config_repair · F4 PP-YouTube→`(platform_config,misconfigured)`/config_repair · G1 unapproved · G2 unproven · G3 blocked · G4 near-match→misconfigured/config_repair · **G5 absent→`(static_background,absent)`/governed_sourcing (the ONLY YES)** · C1 coverage-inconclusive→unresolved · L1 logo-indistinct→unresolved · S1 status_below_smoke→`(template,unproven)`/operator_approval · W1 wrong_scope→`(template,misconfigured)`/config_repair · T1 divergent-tie→`(none,unresolved)`/manual_triage · appetite-ambiguous→manual_triage · format_unmapped→`(template,unsupported)`/capability_backlog · client_not_found→manual_triage. **Sole-sourcing invariant:** across all 99 (subject×state) pairs, exactly ONE maps to `governed_sourcing`/`governed_auto_sourcing`: `(static_background, absent)`. **Mechanical CHECK:** forged `(static_background,absent)` with `evidence_confidence` `insufficient` and NULL both rejected (check_violation); legitimate `conclusive` and all non-absent rows accepted — proven on both a stand-in and the real `m.asset_gap_suggestion` table shape.

**Live-fixture proof (real inputs → proven classifier) — PASS.** The actual live `select_template` payloads for all 4 current `open` rows were fed through the hermetic `diagnose_gap`: 3× carousel (`no_assignment`×3 / derive `ambiguous`) → `(assignment,unassigned)`/**config_repair**; PP YouTube (`platform_unsuitable`/`no_suitability_row_for_platform` / derive `ok`) → `(platform_config,misconfigured)`/**config_repair**. Zero `governed_sourcing` among live rows.

**Legacy identity — additive-only PROVEN.** `_harness/cc0046_hermetic/analyze_body.diff` + `writer_body.diff` show the only changes to legacy lines are trailing `);`→`,` (to append keys) + a column-list trailing `,`; every legacy key name and value expression is byte-identical; the writer's fail-closed validation block is untouched. Full-syntax gate: all three complete artifacts load without error into a stub-schema DB (all 6 functions created, 6 columns + constraint present).

**Probe fidelity.** `probe_asset_inventory` mirrors `resolve_slot_assets` v1.2 (20260720150000) candidate predicates — client: `asset_meta->>'usage' IN ('background','logo')` + is_active/approved/license/bucket/text-safety; shared: `asset_kind` + governance_scope relevance + the full shared fence chain — but retains near-matches (allow-list/pool-policy/platform/excluded → `n_near_match`) instead of filtering them, so `absent` requires `n_inventory_total=0`.

**db-rls-auditor CONCERNS fix (rev-2, PK-mandated 2026-07-21) — both closed, re-proven.**
- **Concern 1 (sole false-absence path) — CLOSED via one authoritative vertical-basis contract.** New `public.derive_template_vertical(template_id)` is the ONE derivation of a template's vertical (template-tag → family-tag). `resolve_slot_assets` is refactored to consume it (inline derivation replaced by the shared call — value-identical; the only resolve change, and its `vertical_shared` path is dormant today so live behaviour is provably unchanged; `_harness/cc0046_hermetic/resolve_body.diff`). `probe_asset_inventory` consumes the SAME contract (given the exact `candidate_template_id` that reached `assets_fail_closed`, passed by `analyze_asset_gap`) — so probe and resolver align **by construction**, no divergent derivation. `(static_background, absent)` is now emitted **only** when `vertical_basis_conclusive=true`; a missing/unestablished basis → `(none, unresolved)` → manual_triage (never absent). The probe records candidate_template_id · resolved_vertical_key · vertical_basis_source · derivation_version (`tmpl-vertical-v1`) · vertical_alignment. Seeded hermetic proof (`test_probe_seeded.sql`): `P_WRONG_VERTICAL_EXCLUDED` (realestate asset excluded under template=ndis), `P_RIGHT_VERTICAL_NEAR` (ndis asset counted — proves the probe uses the *template* vertical, not appetite), `P_TEMPLATE_NULL` (basis unestablished), template-tag/family-tag/none all PASS. D8 drain re-probe uses the same basis (brief updated).
- **Concern 2 (platform precision) — CLOSED.** `platform_scope` is now a configurable near-match on BOTH client and shared origins → a platform-blocked bg is retained in `n_inventory_total`, classified `(static_background, misconfigured)` → config_repair, **never** absent. Proven: `P_CLIENT_PLATFORM_NEAR` / `P_SHARED_PLATFORM_NEAR` (+ `G4` pure fixture).
- **Re-proof after fix:** pure suite **17/17** (adds `VB1` vertical-basis-missing → `(none,unresolved)`); seeded probe suite **7/7 + derive 4/4**; sole-sourcing invariant still exactly one pair; CHECK still fires; full-syntax load of all 3 artifacts (8 fns) clean; live fixtures unchanged (carousel + PP YouTube → config_repair). Legacy analyze/writer identity intact (`analyze_body.diff` still additive-only; writer unchanged); resolve value-identical (`resolve_body.diff` = only the vertical derivation, replaced by the shared call).

## 5. Constraints confirmed (brief Forbidden actions — all respected)

- No migration applied; no production DML/DDL; no deploy; no merge — the three artifacts are UNAPPLIED (three separate T3 gates).
- No image search/download/provider call; no drain dispatcher; no claim-state; no assignment/suitability/candidate mutation; no promotion; no browser automation.
- No legacy output key, vocabulary, or writer validation semantics changed (additive-only, proven).
- Active hold-states untouched: NDIS production video enablement OFF (`c.client_creative_governance` untouched); diverged `invegent-dashboard` main + orphaned `AddTemplateDraftWizard.tsx` untouched; no logo/video/generative sourcing.
- Nothing marked proven/approved/resolved as a side effect.

## 6. Open issues / notes

- **Builder substitution (named per CCF-02 R1):** authoring was orchestrator-direct (not `ef-builder`) because the probe/diagnosis logic required the freshly-loaded `resolve_slot_assets`/`select_template` predicate context; every safety gate is intact — isolated worktree (`/home/user/cc0046-build-wt`), independent `db-rls-auditor` + `branch-warden` + external review, hermetic proof, and the PK T3 apply gate.
- **Live old↔new equivalence (recommended pre-apply verification):** legacy byte-identity is proven by the additive diff; a live OLD-vs-NEW `analyze_asset_gap` equivalence run over the 8 current rows on a Supabase branch (or as the first post-apply read-back) is the recommended belt-and-suspenders check at the Artifact-2 T3 gate. It is NOT done here because running the new function on live requires applying Artifact 2 (the gate itself).
- Open decisions from the brief already ruled by PK: Option R (accepted), `format_unmapped`→unsupported (accepted), `platform_config` negative→manual_triage (accepted).

## 7. Next recommended step

**PK T3 apply gate (three ordered, independently-rollbackable steps).** Each is a HARD STOP; a tripped STOP voids the remainder (Convention-2 sequence available if PK elects).

```
Pre-checks (read-only, at the gate): re-confirm HEAD/branch parity · re-confirm the 3 artifact sha256 == reviewed hashes · re-confirm 0 rows harvesting/candidates_ready.

Step 1 — Artifact 1 (DDL + helpers)  [sha256 466bb7d8…]
  APPLY:    execute_sql < supabase/migrations/20260721100000_cc0046_asset_gap_orthogonal_classification_ddl_v1.sql
  VERIFY:   6 columns + constraint present; 5 functions present (asset_gap_route/asset_gap_automation/
            diagnose_gap/derive_template_vertical/probe_asset_inventory) with service_role-only EXECUTE.
  ROLLBACK: _harness/cc0046_ddl/rollback.sql
  Ledger:   backfill 20260721100000 identity into supabase_migrations.schema_migrations.

Step 2 — Artifact 2 (resolve refactor + analyze + writer replace)  [sha256 367aae63…]
  APPLY:    execute_sql < supabase/migrations/20260721110000_cc0046_analyze_and_writer_orthogonal_v1.sql
  VERIFY:   resolve_slot_assets output == pre-apply for the current templates (value-identical; the shared
            derive_template_vertical returns the same vertical the inline block did); analyze_asset_gap legacy
            keys == pre-apply (old↔new equivalence); run_asset_gap_analysis(p_dry_run=true) counters == baseline.
  ROLLBACK: _harness/cc0046_ddl/rollback_functions.sql (byte-exact prior resolve+analyze+writer bodies).
  Ledger:   backfill 20260721110000 identity.

Step 3 — Artifact 3 (backfill open rows)  [sha256 5ef9cca3…]
  APPLY:    execute_sql < supabase/migrations/20260721120000_cc0046_backfill_open_rows_v1.sql
  VERIFY:   3 carousel rows → (assignment,unassigned)/config_repair; PP YouTube → (platform_config,misconfigured)/config_repair;
            resolved/historical rows still NULL; ZERO rows with asset_gap_route='governed_sourcing'.
  ROLLBACK: _harness/cc0046_backfill/rollback.sql.
  Ledger:   backfill 20260721120000 identity.
```

After all three: this precursor is proven and the **separate** backgrounds-only drain lane may be opened — hard entry condition per brief D8 (fresh-probe validate-and-claim; `governed_sourcing` iff `(static_background,absent)` + conclusive + zero inventory), still subject to every §2/NDIS gate.

---

## 8. Verification / review chain

**Hermetic + live proofs:** PASS (see §4).

**Review chain (T2/T3) — RE-RUNNING on the rev-2 (Concern-fixed) artifacts (hashes `466bb7d8…`/`367aae63…`/`5ef9cca3…`):**
- `db-rls-auditor` (rev-1 on the pre-fix artifacts): **concerns** (0 must_fix; 0 exposure/grant/RLS/collision/upsert findings). Independently confirmed: additive-only (from the body diffs), CHECK correctness incl. NULL-rejection, grants service-role-only, ON CONFLICT arbiter byte-identical, no column/index collision, backfill open-only + fail-closed, no auto-sourcing. Two precision **should_fix**: **(1)** `probe_asset_inventory` scopes the `vertical_shared` universe by `vertical_key = p_vertical` in its WHERE, so if the probe's appetite-derived vertical ever diverges from `resolve_slot_assets`' template-tag-derived vertical, a wrong-vertical shared bg is invisible to the probe → the SOLE path to a false `(static_background, absent)` verdict (mitigated: non-auto-executing; drain D8 re-validates; matches the known analyzer↔resolver vertical-alignment carry). **(2)** `platform_scope` isn't evaluated by the probe (either origin): a platform-blocked bg classifies as `unresolved`/manual_triage rather than `misconfigured`/config_repair — fail-safe (never false absent), precision-only. Live-catalog reads were unavailable to the agent (no `ICE_READONLY` cred); it verified against repo source-of-truth + named a T3 live re-confirm (column-absence [orchestrator already live-confirmed via information_schema], index predicate, grants, `get_advisors`).
- `branch-warden`: **safe / clean** — working tree == exactly the 9 expected new files (all untracked additions), zero modification to any tracked file (live migrations `20260720160000/190000/150000`, `CLAUDE.md`, `docs/00_*` all clean); HEAD `d1ca6de` at perfect origin parity (0/0); no wrong-branch-commit risk; filenames new + monotonic > `20260720200000`. Non-blocking note: deliverable staged in the default worktree on the session branch (authoring done in isolated `/home/user/cc0046-build-wt`).
- External review (`ask_chatgpt_review`) pinned to artifact hashes `ce3e4732…` / `1989bc76…` / `5ef9cca3…`: _(pending — reviewed_input_hash to be recorded)_

**Verdict:** `Needs follow-up` — build/proof complete; awaiting review-chain verdicts, then PK T3 apply gate.

## 9. Learning notes

- Making the entire decision matrix a PURE function (`diagnose_gap`, jsonb→jsonb) let the full D6 matrix be proven hermetically with zero schema, and let the live fixtures be proven by feeding real `select_template` output through the same proven function — decoupling classification logic from data-gathering paid off for both testability and review.
- `client_brand_asset` backgrounds are `asset_type='other'` with `asset_meta->>'usage'='background'` (NOT `asset_type='static_background'`) — a naive type match would have mis-scoped the probe; mirroring `resolve_slot_assets` exactly was essential.
- Building the function-replacement artifact by copying the verbatim prior body and applying only additive edits made legacy byte-identity mechanically provable via diff.
