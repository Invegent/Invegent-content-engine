# Global Format Capability Pyramid — Slice 1A validation / security / proof PLAN

> **Status:** PLAN ONLY — **NOT IMPLEMENTED, NOT APPLIED.** This document defines *how* the future
> Slice 1A read-only RPC will be proven safe **before any PK apply**. It creates no RPC, no
> migration, mutates no DB, runs no `execute_sql`, applies no migration, deploys nothing, edits no
> dashboard repo, builds no UI, and corrects none of the source conflicts it plans to surface.
> **Produced:** 2026-06-29 (CE Session 3). **Type:** docs/brief only.
> **Hard stop:** the actual read-only proof run, the review gates, and the apply are **separate
> future steps** — each gated. This file is the proof contract they must satisfy.

---

## 0. Authoritative state and inputs

- **Target object (future, not created):**
  ```text
  public.get_global_format_capability_pyramid(
    p_platform         text    DEFAULT NULL,   -- optional platform filter
    p_ice_format_key   text    DEFAULT NULL,   -- optional format filter
    p_include_variants boolean DEFAULT false   -- v0: variant section stays placeholder unless true+safe
  ) RETURNS jsonb
  ```
- **DB (read-only target for the proof run):** prod `mbkmaxqhsohbtwsqolns`.
- **Upstream (approved):**
  - `docs/briefs/global-format-capability-pyramid-slice0-brief.md` — source decision + contract shape
    (layered evidence model A–G, cell-state model §4, payload schema §6, security model §9).
  - `docs/briefs/global-format-capability-pyramid-slice0-decision-record.md` — **PK D1–D5 APPROVED**
    (layered evidence v0 · service-role-only SECURITY DEFINER RPC unless review blocks · honest
    publisher uncertainty · production-evidence-only variant proof · page = Create → Format Capability).
- **Proven pattern this plan mirrors:** `docs/briefs/ppp-slice1a-data-contract-validation.md`
  (client-level RPC; security checks 12–18; `evidence_maturity` labels; `detail_payload` whitelist).
- **Framing (load-bearing):** v0 is an **evidence-and-reconciliation view**, NOT the canonical
  source of truth. Conflicts between layers are **surfaced as diagnostics, never resolved by mutation**
  (Canonical Capability Model v1 is a separate, later, PK-gated carry).
- **Read-only source objects (Layer A–F):** `t."5.3_content_format"` (`platform_support`),
  `t.platform_format_mix_default`, `t.format_synthesis_policy`, `t.format_quality_policy`,
  `t.class_format_fitness`, `m.post_render_log` (`render_spec` echo, safe fields only), `m.post_publish`.

---

## 1. Pre-apply read-only proof strategy

The candidate SQL is proven against **live production data as a `SELECT`, before the function is
ever created** — identical to the proven PPP Slice 1A method.

1. **Run the candidate function body as a standalone read-only query.** Wrap the resolution logic in
   a `SELECT … ` (or `WITH … SELECT`) and execute it directly. **No `CREATE FUNCTION`. No
   `CREATE OR REPLACE`. No DDL of any kind during validation.**
2. **No mutation.** The body must be SELECT-only and provably `STABLE`-compatible (no INSERT/UPDATE/
   DELETE/UPSERT, no `SET`, no `nextval`, no advisory-lock writes). The proof run reads existing
   `t.*`/`m.*` rows only.
3. **No function creation, no temp objects, no session state.** Validation produces a payload and a
   recorded result table only — it leaves the database byte-unchanged.
4. **Parameter coverage during the proof run (read-only):**
   - unfiltered (`p_platform=NULL, p_ice_format_key=NULL, p_include_variants=false`) — the full matrix;
   - one platform filter (e.g. `p_platform='facebook'`);
   - one format filter (e.g. `p_ice_format_key='image_quote'`);
   - `p_include_variants=true` — confirm the variant section stays a safe placeholder (D4) and leaks
     nothing.
5. **Why live data, not a PGlite harness:** the contract reconciles ~7 live `t.*`/`m.*` evidence
   surfaces whose *real, disagreeing rows are the point* (§2 conflicts). An offline seed cannot prove
   reconciliation/diagnostics correctness against production reality. Validation is therefore a
   read-only production SELECT, exactly as PPP Slice 1A was validated.
6. **Record-of-truth:** the validated SELECT body becomes, byte-for-byte, the migration `CREATE
   FUNCTION` body at apply time. A re-review is mandatory if the body changes after validation
   (§6, external-review hash rule).

---

## 2. Expected checks (acceptance criteria for the proof run)

These are **acceptance targets the read-only proof run must satisfy**, not yet-measured results. Each
must be confirmed against live data before Slice 1A is declared review-ready.

| # | Check | Acceptance criterion |
|---|---|---|
| 2.1 | **Platform count** | The modelled platform set is returned (facebook, instagram, linkedin, youtube). Website/WordPress, if surfaced, appears **flagged evidence-only**, never as a configured modelled platform. `global_summary.platform_count` matches the rows in `platforms[]`. |
| 2.2 | **Format count** | The `t."5.3_content_format"` format universe is returned in `formats[]` with `display_label`; `global_summary.format_count` matches. No format invented; no format silently dropped. |
| 2.3 | **Matrix cell count** | `platform_format_matrix[]` length == platform_count × format_count (filters applied honestly when `p_platform`/`p_ice_format_key` set). State counts in `global_summary` sum to the cell count. |
| 2.4 | **Evidence-maturity distribution** | Every cell carries exactly one `global_support_state` / `evidence_maturity` from the §4 vocabulary (Proven in production · Smoke-proven · Configured and enforceable · Configured but not smoke-proven · Policy exists but no proof · Supported in theory only · Ungoverned · Blocked · Conflict/diagnostic · Not modelled yet). Distribution is reported; **no cell is labelled "Proven in production" without BOTH render (D) and publish (E) evidence.** |
| 2.5 | **Known conflict diagnostics surfaced** | `diagnostics[]` (Layer G) is **non-empty** and names the recorded conflicts (at minimum the defaults-vs-`platform_support` clash, §2/§9 R1). Each diagnostic names the cell(s) and which layers disagree. Conflicts are **surfaced, not resolved**. |
| 2.6 | **`publisher_path_status` labels present** | Every cell carries a `publisher_path_status` from the D3 allowlist: `publisher_proven` · `publisher_inferred` · `publisher_unknown` · `publisher_blocked` · `publisher_unsupported`. `publisher_proven` appears **only** where `m.post_publish` shows real publishes for the pair. No invented publisher certainty. |
| 2.7 | **`variant_model_status` mostly `not_modelled`** | `variant_model_status` is `not_modelled` for the overwhelming majority of cells (D4); `variant_capability[]` is a placeholder; any non-`not_modelled` value is backed strictly by production render evidence (`render_spec.variant_key`), never by docs JSON. |
| 2.8 | **Creative Library proof is production-evidence-only** | `creative_library_status` ∈ {`production_evidence`, `none`}; `production_evidence` is backed only by `m.post_render_log` evidence. **Docs JSON (`docs/creative-library/*`) is never read at runtime** and never appears as authority. `creative_library_links[]` are pointers/evidence only. |
| 2.9 | **Render-path honesty** | `render_path_status` ∈ {`proven`,`evidence_only`,`none`,`unknown`}; `render_provider` populated only from safe observed render evidence. Render proof never silently upgraded to publish proof (D ≠ E kept distinct). |
| 2.10 | **Block reasons scoped** | `blocked_reasons[]` use the §4 scoped vocabulary (`global_platform_block` · `policy_gap` · `render_path_gap` · `publisher_path_gap` · `proof_gap` · `creative_library_gap` · `variant_model_gap`); `client_gap` **must not appear** (client overlay deferred). `operator_actions[]` populated where a block names a real next action. |
| 2.11 | **Summary integrity** | `global_summary` counts (by state, platform, format, conflict) are internally consistent with the arrays; `source_metadata` records which objects/versions were read and the `is_current` filters applied. |

---

## 3. No-secret checks (must all PASS before review-ready)

The global contract reads **more `m.*` evidence** than the client RPC, so the secret scan is re-run on
the **global field set** — it is **not** inherited from PPP Slice 1A.

- **No `page_access_token`** selected or emitted anywhere in the payload.
- **No `credential_env_key`** selected or emitted.
- **No service credentials / secrets** of any kind (no API keys, no env-key names, no tokens).
- **No `destination_id` / raw profile blobs** unless provably safe — `c.client.profile` jsonb is
  **not** dumped; `destination_id` is not emitted. `page_id` may only ever appear as a **boolean
  connection signal**, never as a raw value.
- **No raw `render_spec` dump** — only whitelisted contract-identity fields (e.g. `variant_key`,
  contract identity, format key) may be read from `m.post_render_log.render_spec`; the raw jsonb is
  never returned.
- **Safe `detail_payload` whitelist only** — `detail_payload` carries an explicit allowlist of
  display fields (state, layer flags, default %, policy presence, render/publisher status labels,
  scoped block reasons, operator actions). Anything not on the whitelist is excluded by default.
- **Automated scan:** the recorded proof must include a `contains_secret_marker=false` check — a text
  scan of the full serialized payload for `access_token` / `credential_env_key` / token-like markers
  returns clean (mirrors PPP Slice 1A check 12).

---

## 4. Security posture checks (mirror proven PPP Slice 1A exactly)

The migration that eventually packages the validated SQL must satisfy **all** of the following (each
verified by db-rls-auditor before the PK gate):

- **`SECURITY DEFINER`.**
- **owner `postgres`.**
- **`STABLE`** (read-only; no mutation; no volatile side effects).
- **pinned `search_path = public, pg_temp`** (set on the function).
- **schema-qualified references** throughout (`t.*`, `m.*`, `public.*` fully qualified — no reliance
  on a mutable search path; no PGRST106-style exposure surprises).
- **no dynamic SQL** (no `EXECUTE`/`format()`-built statements).
- **`EXECUTE` revoked** from `PUBLIC`, `anon`, `authenticated`.
- **`EXECUTE` granted only to `service_role`** (unless a narrower approved server role is chosen at
  review; never broader).
- **no table/schema grants widened** — the migration only `CREATE FUNCTION` + REVOKE/GRANT on the
  function itself; it touches no table grants and no RLS.
- **`get_advisors(security)` baseline** shows **no new** finding attributable to the function (absent
  from SECURITY DEFINER / search-path advisory lists, same as PPP Slice 1A).

---

## 5. Browser boundary checks

- **Dashboard calls the RPC server-side only**, via the service-role client (Next.js server
  action / loader). The browser never receives the service-role key.
- **No browser-direct RPC** — the anon/authenticated client cannot `EXECUTE` the function (enforced by
  the §4 grant posture); any future UI must call through the server.
- **No browser table reads** — the browser never reads `t.*`/`m.*` directly; `t.*` has no app-role
  usage and `m.*` is service-role-only, so REST-direct reads would PGRST106 anyway. The RPC is the
  single governed access bridge.
- **Confirmation:** this plan asserts the boundary; the actual UI (Slice 1B) is out of scope here and
  will be linted against the boundary when it is briefed.

---

## 6. Review gates (in order — each must clear before the next)

1. **db-rls-auditor** — must return **PASS / no must-fix**: confirms the §4 security posture, the
   schema-qualified references, the REVOKE/GRANT least-privilege, no table-grant widening, no RLS
   change, no PGRST106 surface, and `get_advisors(security)` no-new-finding.
2. **security-auditor** *(if registered/invocable this session)* — security judgement on top of the
   db-rls-auditor facts: caller-principal, blast radius of a `service_role`-only definer read, and the
   secret/whitelist field-set review on the **global** field set (not assumed from PPP). If not
   invocable, record the gap and have the orchestrator perform the equivalent secret/whitelist review
   manually, surfacing residual judgement to PK.
3. **`ask_chatgpt_review` (external cross-model adversary)** — called on the **final** validated
   SELECT body / migration. **`reviewed_input_hash` mandatory**: the review is valid only for the exact
   SQL hash reviewed. Any change to the body (e.g. adding a filter, changing a whitelist field)
   invalidates the review and forces a re-run. Non-clean verdict → triage-route per CLAUDE.md
   (`concrete_defect`→fix+re-review · `missing_evidence`→gather+re-review ·
   `structural_DDL_DML_escalation`→PK · `policy_decision`→PK · `scope_design_concern`→PK ·
   `runtime_verification_required`→named post-apply gate).
4. **PK apply gate (HARD STOP).** The orchestrator prepares the exact `apply_migration` command +
   preconditions and **stops for PK**. PK runs/authorises the apply. **No apply, no `execute_sql`
   fallback, no ledger backfill without explicit PK authorization at this gate.**

---

## 7. Post-apply validation (run only after a PK-authorised apply)

Recorded as the acceptance set the apply must satisfy — **not performed in this planning step.**

- **Function exists** — `public.get_global_format_capability_pyramid` present with the exact 3-arg
  signature; owner `postgres`; `STABLE`; `SECURITY DEFINER`; `search_path` pinned.
- **Grants correct** — `EXECUTE` = `service_role` (+ `postgres`) only; PUBLIC/anon/authenticated have
  none (verified from `information_schema`/`pg_proc` ACL, not assumed).
- **Advisor / security: no new finding** — `get_advisors(security)` shows nothing new attributable to
  the function.
- **Sample payload safe** — call the live RPC for the unfiltered case + one filtered case; re-run the
  §3 secret scan on the **live** payload (`contains_secret_marker=false`); confirm `detail_payload`
  carries only whitelisted fields.
- **No data mutation** — spot-confirm the read is `STABLE`/side-effect-free (row counts on a couple of
  source tables unchanged across the call; no write to `m.*`/`t.*`).
- **No table grants widened** — re-confirm no table/schema grant changed; only the function ACL exists.
- **Ledger discipline** — if the apply lands via `execute_sql` fallback (because `apply_migration` is
  harness-denied), record the expected ledger WARN-carry and schedule a **separate PK-gated ledger
  backfill** so `supabase_migrations.schema_migrations` records the migration exactly once against the
  repo SQL-of-record (same pattern as PPP Slice 1A / Control Tower P1).
- **Register** — record the outcome (docs-only register lane) only after the live payload is proven
  safe; do **not** claim "Proven in production" for any capability cell that lacks render+publish proof.

---

## 8. Rollback / hard-stop rules

- **Hard stop before apply.** Validation, review gates, and apply are distinct steps. The orchestrator
  never applies; PK runs the apply. Push is a separate hard stop after that.
- **Stop on any non-clean gate.** A db-rls-auditor must-fix, a security-auditor escalation, or a
  non-clean external verdict halts the lane and surfaces to PK — no auto-fix of a `policy_decision` or
  a `structural_DDL_DML_escalation`.
- **Stale-review stop.** If the validated SQL changes after `ask_chatgpt_review`, the review is stale
  (`reviewed_input_hash` mismatch) — **re-run before apply**.
- **Rollback path (if applied and a problem is found):** the object is an **additive, read-only
  function** — rollback is a clean `DROP FUNCTION public.get_global_format_capability_pyramid(text,
  text, boolean);` (PK-run). Because it mutates nothing and no other object depends on it at v0, drop
  is fully reversible with zero data impact. Migration identity is permanent — any revision gets a
  **new** migration number + distinct name, never the same name with different SQL.
- **No silent fallback.** If `apply_migration` is denied, do not silently route through `execute_sql`
  — surface to PK and only use the fallback under explicit PK authorization, recording the ledger carry.

---

## 9. Known risks (surfaced, carried — not fixed in Slice 1A)

These are pre-existing source-model conflicts the contract will **reveal as diagnostics**. None is
caused by Slice 1A; none is corrected by Slice 1A.

- **R1 — `t.*` defaults-vs-support conflicts.** `t.platform_format_mix_default` has rows for
  (platform, format) pairs that `t."5.3_content_format".platform_support` marks `false` (e.g. facebook
  `animated_text_reveal` default 5% while `platform_support.facebook=false`). The contract treats
  `platform_support` as the eligibility source of truth → those cells are `blocked` /
  `Conflict / diagnostic`; the default share is shown in `detail_payload` only. **Surfaced, not cleaned.**
- **R2 — Publisher path lacks a canonical source.** No "publisher supports (platform, format)" table
  exists; capability lives in EF/worker code + sparse `m.post_publish`. v0 labels honestly
  (`publisher_proven`/`inferred`/`unknown`/`blocked`/`unsupported`) and **invents no certainty**; the
  static publisher capability catalog is a deferred future slice.
- **R3 — Website / channel evidence vs config mismatch.** WordPress/website has publish evidence but
  may not be modelled in the `t.*` platform-format set; such channels appear **flagged evidence-only**,
  not as configured platforms.
- **R4 — Avatar code/data conflict.** Avatar/persona capability lives in code + sparse data
  (`c.brand_avatar`, `c.client_avatar_profile`) and can disagree; not asserted as capability truth
  here. Avatar/video/scene work is **out of scope** (no read that requires touching those paths).
- **R5 — Voice / render-engine declaration vs observed path.** Declared engine capability
  (creatomate/heygen) can differ from the observed succeeding path in `m.post_render_log`; `render_*`
  status is labelled from observed evidence, declared-engine capability is **not** asserted as proof.
- **R6 — Render ≠ reach.** A successful render (D) never implies a publisher path (E); the two layers
  stay distinct so no cell over-claims publish capability from render evidence.

---

## 10. What must NOT be fixed during Slice 1A

Slice 1A is a **read-only reconciliation contract**. It **surfaces** disagreement; it never resolves it.

- **Do not mutate source tables** (`t.*`, `m.*`, `c.*`) — zero INSERT/UPDATE/DELETE/UPSERT/DDL.
- **Do not clean the conflicts** of §9 (R1–R6). Reconciliation is by *diagnostic*, never by editing
  defaults, support flags, policies, evidence rows, or any source data.
- **Only surface diagnostics.** Layer G reports disagreement; the canonical normalization that would
  *resolve* it (Canonical Capability Model v1) is a separate, later, PK-gated carry — **not started.**
- **No editable UI, no write RPC, no dry-run-save, no variant implementation, no client overlay, no
  publisher catalog build, no Creative Library DB registry, no schedule/avatar/video/scene work, no
  Slice C proof, no Phase 1 post-fill** — all explicitly out of Slice 1A scope.

---

## Validation (this planning step)

- **Only one docs/brief file changed** by this step:
  `docs/briefs/global-format-capability-pyramid-slice1a-validation-plan.md` (new). No docs-index update
  is required (briefs are not indexed in `00_sync_state.md`/`00_action_list.md` at creation; a register
  note, if any, is a separate PK-gated step).
- **No code, migration, or dashboard files changed.**
- **No DB mutation, no `execute_sql`, no deploy, no RPC creation, no migration creation, no
  implementation** occurred — this is a planning document only.

---

## Cross-references

- Slice 0 source/contract brief: `docs/briefs/global-format-capability-pyramid-slice0-brief.md`.
- Slice 0 PK decision record (D1–D5): `docs/briefs/global-format-capability-pyramid-slice0-decision-record.md`.
- Proven client-level pattern: `docs/briefs/ppp-slice1a-data-contract-validation.md`
  (security checks 12–18, `evidence_maturity` labels, `detail_payload` whitelist).
- Inventory grounding: `docs/briefs/publishing-plan-pyramid-inventory-brief.md`
  (§7 source map, §11 variant gap, §14 risks, §15 readiness addendum).
- Orchestration contract (gates, lanes, review rules): `CLAUDE.md`.
