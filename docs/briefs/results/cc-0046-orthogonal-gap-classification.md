# Result cc-0046 — Orthogonal Gap Classification & Routing Precision (precursor lane)

**Brief file:** `docs/briefs/cc-0046-orthogonal-gap-classification-brief.md` (rev-3, Gate-1 APPROVED at `d1ca6de`)
**Executed by:** Claude Code (orchestrator-direct authoring — see §6 substitution note) + PK gates
**Completed:** 2026-07-21 Sydney — **BUILD + PROOF complete; STOPPED at the first T3 production-apply gate. No production change made.**

---

## 1. Result status

`Partial — awaiting PK T3 apply gate` — build, hermetic proof, live-fixture proof, concern-fixes, and the **full clean review chain** (branch-warden safe · db-rls-auditor pass · external agree/proceed) are complete; **three T3 apply gates (DDL+helpers · functions · backfill) remain PK-gated and UNAPPLIED.** Nothing deployed, migrated, backfilled, or sourced.

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

## 7b. T3 STEP 1 — APPLIED (Artifact 1 only), PK-authorized 2026-07-21. Steps 2 & 3 remain UNAUTHORIZED.

Applied via `execute_sql` at the T3 gate (apply_migration deny-listed). Pre-checks all passed (HEAD `d8b58f4`, origin 0/0, full sha256 `466bb7d83f7753bec8d985ac0c97fe917cf46560b6ab129bb7add1f8e269f11d` == reviewed, objects absent, 0 in-flight, rollback intact). Transaction committed, no error.

- **Applied hash:** `466bb7d83f7753bec8d985ac0c97fe917cf46560b6ab129bb7add1f8e269f11d` (Artifact 1, full).
- **Object inventory (live):** 6 columns (`subject_kind`/`failure_state` text+vocab-CHECK, `classifier_version` text, `diagnostic_evidence` jsonb, `diagnosed_at` timestamptz, `evidence_confidence` text+CHECK) · constraint `gap_absent_static_bg_requires_conclusive` (exact reviewed def) · index `asset_gap_suggestion_diag_pair_idx` on `(subject_kind, failure_state)` · 5 functions: `asset_gap_route(text,text)`+`asset_gap_automation(text,text)`+`diagnose_gap(jsonb,jsonb,jsonb,text)` (immutable), `derive_template_vertical(uuid)`+`probe_asset_inventory(text,text,uuid,text)` (stable security definer); all `search_path=""`.
- **Grant proof:** every function ACL = `postgres=X ; service_role=X` only — no `anon`/`authenticated`/PUBLIC EXECUTE. No table grant/RLS change on `m.asset_gap_suggestion`.
- **Constraint proof (live):** forged `(static_background, absent, insufficient)` and `(static_background, absent, NULL)` both rejected by `check_violation` via rolled-back UPDATE on a real row; no row modified.
- **No-side-effect proof:** rows still **8** (status open=4, resolved=4 — unchanged); all 6 new columns NULL on every existing row; legacy columns intact; 0 `harvesting`/`candidates_ready`, 0 `claimed_by`. No sourcing / status transition / candidate / assignment / operational side effect.
- **Ledger proof:** `supabase_migrations.schema_migrations` row `20260721100000 · cc0046_asset_gap_orthogonal_classification_ddl_v1` recorded (sha256 + provenance in `statements`).
- **Rollback readiness:** `_harness/cc0046_ddl/rollback.sql` proven complete (apply→rollback→0 orphans; correct 4-arg probe + `derive_template_vertical` drops; dependency-safe order). Ready if needed.
- **Branch/origin:** HEAD `d8b58f4`, origin parity 0/0, working tree clean (apply was DB-only; no git change).

**STOPPED for separate T3 Step 2 authorization. No Artifact 2 apply, Artifact 3 backfill, merge, deploy, sourcing, or drain activation performed.**

## 7c. T3 STEP 2 — APPLIED (Artifact 2 only), PK-authorized 2026-07-21. Step 3 remains UNAUTHORIZED.

Applied via `execute_sql` (one transaction, committed, no error). Pre-apply reconciliation: HEAD `b062dc3` (== origin, 0/0; child of `d8b58f4` — the apply ran at `d8b58f4`, `b062dc3` is the Step-1 record commit; the temporal note is resolved), Artifact 2 full sha256 `367aae63d8d1aae7d27c066cdea7d26add78f1e275b3d48a6bdc688a9f129ace` == reviewed, Artifact 1 intact (cols=6/constraint=1/index=1/fns=5), rollback (3 prior bodies) present, 0 in-flight. Fresh baseline captured before apply.

- **Applied hash:** `367aae63…` (Artifact 2, full). Replaces `resolve_slot_assets` + `analyze_asset_gap` + `run_asset_gap_analysis`.
- **Function-def pre/post proof:** exactly the 3 intended bodies changed — resolve `1977f492→75d59925`, analyze `b4a3f4f8→d343e267`, writer `91b6fc25→ec2bb745`. No other function altered.
- **Security posture (post):** resolve/analyze `STABLE SECURITY DEFINER search_path=""`; writer `VOLATILE SECURITY DEFINER search_path=""`; all ACL `postgres=X ; service_role=X` only — no PUBLIC/anon/authenticated EXECUTE.
- **Resolver compatibility:** all **8/8** `resolve_slot_assets` outputs byte-identical to the pre-apply baseline (value-identical; the shared `derive_template_vertical` returns the same vertical the inline block did; the `vertical_shared` path is dormant live).
- **Analyzer legacy-identity:** all **8/8** `analyze_asset_gap` legacy-key projections (output minus the 7 new keys) byte-identical to baseline — `primary_route`/`asset_gap_detected`/`asset_gap_drainability`/`why_needed`/`slot_kind`/appetite/signature/scope all unchanged.
- **New classification (additive):** 3 carousel (`9dfb…`/`5658…`/`7658…` → wait, sigs `9dfb4526bb`/`568bc2839a`/`765828991b`) → `(assignment, unassigned)` / `config_repair`; PP YouTube (`012a8b2ead`) → `(platform_config, misconfigured)` / `config_repair`; **0 live rows → `governed_sourcing`**.
- **Writer dry-run equivalence:** `run_asset_gap_analysis(p_dry_run=true)` output `b8ec7311…` == baseline (counters, accepted/rejected set, fail-closed validation behaviour identical).
- **No-side-effect proof:** table snapshot md5 `c369ea40…` == baseline (no row mutation); all 6 new columns still NULL; rows still 8 (open=4, resolved=4); no candidate/assignment/suitability/claim/status/sourcing mutation.
- **Vertical-contract proof:** live defs confirm `resolve_slot_assets` **and** `probe_asset_inventory` both consume the shared `derive_template_vertical(p_template_id)`; the inline duplicate derivation is gone from resolve (`NONE (contract only)`) — no independent duplicate vertical derivation.
- **Ledger proof:** `20260721110000 · cc0046_analyze_and_writer_orthogonal_v1` recorded (sha256 + value-identity note in `statements`), after all verification passed.
- **Rollback readiness:** `_harness/cc0046_ddl/rollback_functions.sql` restores the byte-exact prior resolve/analyze/writer bodies. Ready if needed.

**STOPPED for separate T3 Step 3 decision. No Artifact 3 backfill, merge, deploy, sourcing, or drain activation performed.**

## 8. Verification / review chain

**Hermetic + live proofs:** PASS (see §4).

**Review chain (T2/T3) — RE-RUNNING on the rev-2 (Concern-fixed) artifacts (hashes `466bb7d8…`/`367aae63…`/`5ef9cca3…`):**
- `db-rls-auditor` (rev-2, on fix commit `8feb767`): **concerns** → both original concerns confirmed **CLOSED** (no false-absence path remains; single authoritative `derive_template_vertical` consumed by resolver+probe; platform near-match both origins; grants/CHECK/ON CONFLICT/additive-identity all re-confirmed clean). **One new must_fix caught:** the DDL rollback (`_harness/cc0046_ddl/rollback.sql`) was stale — dropped the *old* 3-arg `probe_asset_inventory` and omitted `derive_template_vertical(uuid)` → **FIXED** (corrected to `(text,text,uuid,text)` + added the `derive_template_vertical` drop) and **hermetically PROVEN**: apply Artifact 1 → 5 fns + 6 cols + index + constraint present; run rollback → **all 0** (complete reversal, zero orphans). should_fix (design): `vertical_basis_conclusive` = template-known independent of whether a vertical tag resolved — auditor deemed **safe** (absent still requires `n_inventory_total=0` over a universe that always includes vertical-independent `global_generic`); covered by the `P_ABSENT` seeded fixture (no-vertical template → absent only when genuinely empty).
- **T3 live re-confirm (orchestrator, read-only, 2026-07-21) — closed the auditor's named handoff:** the 6 new columns · `asset_gap_suggestion_diag_pair_idx` · `gap_absent_static_bg_requires_conclusive` · the new functions all do **NOT** pre-exist live (no apply collision); the ON CONFLICT arbiter index `asset_gap_suggestion_live_sig_uidx` **exists** live (writer valid). `get_advisors` (security+performance) remains a post-apply T3 step.
- `db-rls-auditor` (rev-3, on the corrected rollback, commit `246b0ed`): **clean / pass** — rollback now fully + correctly reverses Artifact 1 (probe 4-arg + `derive_template_vertical` drops present; dependency-safe order: automation→route, probe→derive); `rollback_functions.sql` byte-exact to the 3 prior bodies; backfill rollback scoped correctly; migration hashes unchanged; zero must_fix/should_fix. **db-rls chain CLEAN.**
- `db-rls-auditor` (rev-1, pre-fix artifacts): **concerns** (two precision should_fix — the Concern 1/2 now fixed above) (0 must_fix; 0 exposure/grant/RLS/collision/upsert findings). Independently confirmed: additive-only (from the body diffs), CHECK correctness incl. NULL-rejection, grants service-role-only, ON CONFLICT arbiter byte-identical, no column/index collision, backfill open-only + fail-closed, no auto-sourcing. Two precision **should_fix**: **(1)** `probe_asset_inventory` scopes the `vertical_shared` universe by `vertical_key = p_vertical` in its WHERE, so if the probe's appetite-derived vertical ever diverges from `resolve_slot_assets`' template-tag-derived vertical, a wrong-vertical shared bg is invisible to the probe → the SOLE path to a false `(static_background, absent)` verdict (mitigated: non-auto-executing; drain D8 re-validates; matches the known analyzer↔resolver vertical-alignment carry). **(2)** `platform_scope` isn't evaluated by the probe (either origin): a platform-blocked bg classifies as `unresolved`/manual_triage rather than `misconfigured`/config_repair — fail-safe (never false absent), precision-only. Live-catalog reads were unavailable to the agent (no `ICE_READONLY` cred); it verified against repo source-of-truth + named a T3 live re-confirm (column-absence [orchestrator already live-confirmed via information_schema], index predicate, grants, `get_advisors`).
- `branch-warden` (rev-2, on fix commit `8feb767`): **safe / clean** — follow-up touches only the 9 cc-0046 lane files; parent `4628b99` intact (no rewrite); the three live production migrations (`20260720150000/160000/190000`), `CLAUDE.md`, `docs/00_*` all untouched; origin parity 0/0; working tree clean.
- `branch-warden` (rev-1): **safe / clean** — working tree == exactly the 9 expected new files (all untracked additions), zero modification to any tracked file (live migrations `20260720160000/190000/150000`, `CLAUDE.md`, `docs/00_*` all clean); HEAD `d1ca6de` at perfect origin parity (0/0); no wrong-branch-commit risk; filenames new + monotonic > `20260720200000`. Non-blocking note: deliverable staged in the default worktree on the session branch (authoring done in isolated `/home/user/cc0046-build-wt`).
- External review (`ask_chatgpt_review`, `plan_review`) pinned to the final artifact set `466bb7d8…` / `367aae63…` / `5ef9cca3…` (combined `b12b3864…`): **agree / proceed** — risk medium, confidence high, **zero pushback points, no PK escalation** (review_id `7a9e58d0-c8f4-41a7-9a91-6cdea9507c37`).

**Review chain: CLEAN** (branch-warden safe · db-rls-auditor pass · external agree). 

**Verdict:** `Pass — build & proof complete; STOPPED at the T3 apply gate.` The classifier/routing substrate is fully built and proven (hermetic 17/17 + seeded probe 7/7 + live fixtures + sole-sourcing invariant + CHECK + rollback + additive/resolve identity), the review chain is clean, and the two db-rls concerns are closed. **No production apply/backfill/deploy/merge/sourcing performed.** The three artifacts await their PK-run T3 apply gates (§7). This is the required STOP.

## 9. Learning notes

- Making the entire decision matrix a PURE function (`diagnose_gap`, jsonb→jsonb) let the full D6 matrix be proven hermetically with zero schema, and let the live fixtures be proven by feeding real `select_template` output through the same proven function — decoupling classification logic from data-gathering paid off for both testability and review.
- `client_brand_asset` backgrounds are `asset_type='other'` with `asset_meta->>'usage'='background'` (NOT `asset_type='static_background'`) — a naive type match would have mis-scoped the probe; mirroring `resolve_slot_assets` exactly was essential.
- Building the function-replacement artifact by copying the verbatim prior body and applying only additive edits made legacy byte-identity mechanically provable via diff.
