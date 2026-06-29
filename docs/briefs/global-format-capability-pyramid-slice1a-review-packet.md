# Global Format Capability Pyramid — Slice 1A REVIEW PACKET

> **Status:** review-gate packet. **NOT APPLIED.** No function created in production, no migration
> applied, no DB mutation, no grant change, no deploy. This packet drives the db-rls-auditor /
> security / external review gates before the PK apply HARD STOP.
> **Produced:** 2026-06-29 (CE Session 4). **CE state:** `main == origin/main == a36cdf4`; register v4.18.
> **Revised 2026-06-29 (Session 4 — PK model correction):** the candidate SQL was corrected to apply
> PK Decisions 1–2 (see §0a). The reviewed hash changed; all gates were re-run against the new hash.

---

## 0a. PK model decisions applied (v4.18 correction)

- **Decision 1 — non-build production proof.** For `requires_build=false` formats (e.g. `text`),
  publish proof ALONE counts as production proof (no render proof required). **SQL change:** one CASE
  branch added — `WHEN (NOT requires_build) AND publish_proof THEN 'proven_in_production'` — placed
  after the `NOT support_true` conflict/blocked guards (so publish-without-declared-support still
  surfaces as a `conflict` diagnostic, not silent proof) and before the render branches. Build
  formats (`requires_build=true`) still require render+publish per the layered model.
- **Decision 2 — no `publisher_inferred`.** Retained as-is: `publisher_path_status` stays
  `publisher_proven` / `publisher_unknown` / `publisher_unsupported` (+ `publisher_blocked` if
  applicable). No `publisher_inferred` unless a named auditable coverage list exists. **No SQL change
  needed** (the candidate never had `publisher_inferred`).
- **Ratified v0 stances (unchanged):** website stays `channel_outside_model` diagnostic only (not a
  matrix row); Creative Library/variant proof stays production-evidence-only; Layer 3 stays
  `not_modelled`; source tables not mutated; conflicts surfaced as diagnostics only.

**Hash supersession:**
- OLD `reviewed_input_hash` = `cb2e68cdfe49bb314a8ff996e187b836b3ef5c107fefe90a2d28110b0aefa135`
  — **superseded** (pre-decision model; capped non-build publish-proven cells at
  `configured_and_enforceable`; NEEDS_PK_MODEL_DECISION).
- NEW `reviewed_input_hash` = `e10ad5a89097bbd431be150a4f60c9c206598ee151994646d60b4318428a77be`
  (git blob `0c4e03f474992dcc13a76f1c6e15dc314fdaa309`, 17,765 bytes) — the active reviewed artifact.

---

## 1. Candidate SQL body

Record-of-truth: `supabase/migrations/20260630000000_gfcp_slice1a_get_global_format_capability_pyramid_rpc.sql`
(STATUS: NOT YET APPLIED).

- **ACTIVE reviewed_input_hash (SHA256):** `e10ad5a89097bbd431be150a4f60c9c206598ee151994646d60b4318428a77be`
  (git blob `0c4e03f474992dcc13a76f1c6e15dc314fdaa309`, 17,765 bytes) — post-correction (see §0a).
- **Superseded hash:** `cb2e68cdfe49bb314a8ff996e187b836b3ef5c107fefe90a2d28110b0aefa135` (pre-decision).

The review is valid **only** for the active hash. Any change to the SQL body invalidates the review
and forces a re-run (CLAUDE.md external-review rule 4).

## 2. Candidate RPC signature

```text
public.get_global_format_capability_pyramid(
  p_platform         text    DEFAULT NULL,
  p_ice_format_key   text    DEFAULT NULL,
  p_include_variants boolean DEFAULT false
) RETURNS jsonb
```

## 3. SECURITY DEFINER wrapper (as written)

`LANGUAGE sql`, `STABLE`, `SECURITY DEFINER`, `SET search_path TO 'public, pg_temp'`, owner `postgres`
(by apply-as-postgres). Body is a single `WITH … SELECT jsonb_build_object(...)` — read-only.

## 4. Proposed grant posture

- owner `postgres`
- `STABLE`
- `search_path = public, pg_temp` (pinned on the function)
- `REVOKE EXECUTE … FROM PUBLIC, anon, authenticated`
- `GRANT EXECUTE … TO service_role` only
- migration body = `CREATE OR REPLACE FUNCTION` + function REVOKE/GRANT **only** — no table grants, no RLS change.

## 5. No dynamic SQL confirmation

Static scan: no `format()`, `quote_ident`, `quote_literal`, or `EXECUTE … USING` dynamic execution.
The only `EXECUTE` tokens are the `REVOKE/GRANT EXECUTE ON FUNCTION` statements. **No dynamic SQL.**

## 6. Schema-qualified references confirmation

All base-table references are schema-qualified (`t.*`, `m.*`, `public.*`). The only unqualified
identifiers are local CTE names (`platforms`, `fmt`, `cells`, `enriched`, `derived`, `final_rows`,
`labelled`, `matrix`, `diag`, `evsum`). Resolution is independent of `search_path`.

## 7. Safe `detail_payload` whitelist

Per cell, `detail_payload` carries ONLY: `platform_support_raw`, `default_share_pct`,
`synthesis_policy_present`, `quality_policy_present`, `fitness_policy_present`,
`render_engine_declared`, `requires_build`, `render_provider_observed`, `render_success_count`,
`publish_count`, `creative_evidence`, `variant_key_sample`. No secrets, no raw `render_spec`, no
`destination_id`, no tokens, no profile blobs.

## 8. No-secret scan result

Read-only payload scan (live prod, unfiltered case): **PASS** —
`access_token` / `credential_env_key` / `destination_id` / `page_access_token` all **false**;
payload text length 64,149.

## 9. Read-only proof summary (CORRECTED model, hash `e10ad5a8…`)

| Metric | Result |
|---|---|
| Production function exists in prod | **no** (re-confirmed `fn_exists_in_prod=0`) |
| Platforms | 4 (facebook, instagram, linkedin, youtube); website NOT in matrix |
| Formats | 13 (active universe, with display labels) |
| Matrix cells | 52 (= 4×13); state counts sum to 52 |
| Maturity dist | **Proven in production 14** · Conflict/diagnostic 13 · Supported in theory only 10 · Blocked 8 · Policy-only 5 · **Configured & enforceable 1** · Smoke-proven 1 |
| Δ vs pre-correction | +2 `proven_in_production`, −2 `configured_and_enforceable` — exactly the two declared-supported, publish-proven non-build `text` cells (facebook:text, linkedin:text) flipped per Decision 1 |
| Publisher dist | publisher_proven 21 · publisher_unknown 17 · publisher_unsupported 14 — **no `publisher_inferred`** (`has_publisher_inferred=false`) |
| Variant dist | not_modelled 52/52 |
| Creative dist | none 50 · production_evidence 2 (`property_pulse.image_quote.news_card.v1` only) |
| Website | NOT a matrix row (`website_in_matrix=false`); 35 website publish rows → `channel_outside_model` diagnostic |
| No-secret scan | **PASS** — access_token / credential_env_key / destination_id / page_access_token / client_id / output_url / storage_url all absent |
| Static | STABLE-compatible · schema-qualified · no dynamic SQL |
| Mutation | none — pure read-only SELECT; no function created |

## 10. Known diagnostics surfaced (Layer G — surfaced, not fixed)

- `default_without_support` ×9 (e.g. facebook:animated_text_reveal — default 5% vs platform_support=false) — **R1**
- `publish_evidence_without_support` ×7 (e.g. linkedin:carousel) — **R1/R2**
- `channel_outside_model` ×1 (`website` has publish evidence, outside the 4 modelled platforms) — **R3**
- `render_without_publish` ×2 (render proof present, no publisher reach) — **R6**

## 11. Open modelling challenges for reviewers (reviewer challenge items)

1. **Non-build production proof.** For `requires_build=false` formats (e.g. `text`), should publish
   proof ALONE count as "Proven in production" (no render proof required)? Current candidate caps
   them at `configured_and_enforceable`. **Recommendation to consider:** if `requires_build=false`
   AND `publisher_proven=true`, `evidence_maturity` should be "Proven in production".
2. **Publisher path uncertainty.** Candidate asserts `publisher_proven` only from real
   `m.post_publish` evidence; else `publisher_unknown` / `publisher_unsupported`. Confirm **no**
   `publisher_inferred` should be introduced unless a named auditable coverage list exists.
3. **Website outside model.** Confirm v0 surfaces `website` as `channel_outside_model` diagnostic
   only — NOT added to the platform matrix.
4. **Creative Library / variant.** Confirm v0 stays production-evidence-only and Layer 3 stays
   `not_modelled`.
5. **Detail payload.** Confirm the §7 whitelist is safe and there is no raw `render_spec` dump.
6. **Security.** Confirm SECURITY DEFINER posture safe; grants `service_role`-only; no table grants
   widened; browser-direct RPC not allowed.

---

## 12. Review results

### 12a. Round 1 — against superseded hash `cb2e68…a135` (pre-decision)
- **db-rls-auditor — PASS / no must-fix.** Posture correct; grants service_role-only; no table grants
  widened; t.*/m.* USAGE confirms RPC is the correct bridge; columns exist; joins sound; no new
  advisor finding. Cosmetic-only note (search_path stored as single quoted identifier, matches PPP).
- **security-auditor — GREEN / no must-fix.** service_role-only correct; browser/anon double-blocked;
  blast radius minimal; whitelist independently verified leak-free (sensitive cols incl. `client_id`
  never selected; `render_spec` only via `? 'variant_key'`/`->>'variant_key'`).
- **external review — `partial` / `apply_corrected`, no escalation** (`review_id de91f62d-110e-4619-b0b5-34e6fdafb952`).
  No concrete defect; the two pushback points were the open modelling questions → **routed to PK**.
- **Round-1 decision:** `NEEDS_PK_MODEL_DECISION`.

### 12b. PK ruled (v4.18) → SQL corrected → Round 2 against ACTIVE hash `e10ad5a8…77be`
All three gates **re-ran on the corrected hash**:

- **db-rls-auditor — PASS / no must-fix.** Verified delta is exactly 2 hunks (header comment + one
  CASE branch); the branch references only existing derived booleans (`requires_build`,
  `publish_proof`); no new column/table/grant surface; grants/posture/whitelist byte-identical to the
  passed Round-1 hash; function absent in prod; migration identity non-colliding (same never-applied
  candidate, revised pre-apply); no new advisor finding by construction.
- **security-auditor — GREEN / CLEAN, no must-fix.** Confirmed via `git diff` the delta is
  labelling-only; caller/grants/blast-radius/whitelist unchanged; secret scan still PASS; rollback =
  single `DROP FUNCTION`.
- **external review (`ask_chatgpt_review`) — verdict `agree`, decision `proceed`, risk low,
  confidence high, no pushback, escalate=false, requires_pk_escalation=false.**
  `review_id = 267a5ae7-eb12-4555-81ea-760c10c82631` (hash `e10ad5a8…77be`). Verified: the two prior
  modelling decisions correctly addressed; no concrete defect or security regression from the delta.

### Required changes
**None.** No must-fix from any gate on the active hash. PK's model decisions (1–2) are implemented;
Decision 2 required no SQL change.

### Decision
**CLEAN_READY_FOR_PK_APPLY_GATE** — the corrected candidate (hash `e10ad5a8…77be`) is technically
clean and safe across all three gates (db-rls-auditor PASS, security-auditor GREEN, external
`agree`/`proceed`), and reflects the ratified v0 model. The apply is additive read-only DDL
(`CREATE FUNCTION` + function REVOKE/GRANT); rollback is a single
`DROP FUNCTION public.get_global_format_capability_pyramid(text, text, boolean)`.

---

## 13. Apply + post-apply proof + ledger backfill (recorded 2026-06-29 — register v4.19)

### 13a. Apply path
- **`apply_migration` (normal path) was harness-denied before mutation** → HARD STOP, reported,
  no mutation occurred (`fn_exists=0` confirmed post-denial).
- **PK authorized the `execute_sql` fallback** (proven PPP Slice 1A / Control Tower P1 pattern). The
  **exact reviewed SQL (hash `e10ad5a8…77be`, unedited)** was applied via `execute_sql` → DDL success.

### 13b. Post-apply validation (live, project `mbkmaxqhsohbtwsqolns`) — **APPLIED_AND_PROVEN**
- **Function exists & callable:** `public.get_global_format_capability_pyramid(text,text,boolean)`, 1
  overload (no ambiguity). owner `postgres` · **SECURITY DEFINER** · **STABLE** · `search_path="public, pg_temp"`.
- **Grants:** `service_role` + `postgres` EXECUTE only; **PUBLIC/anon/authenticated → none**.
- **No table grants widened, no RLS change, no source-table mutation** (only `CREATE FUNCTION` + function REVOKE/GRANT).
- **Security advisor:** no new finding (0 references to the function across the advisor set).
- **Live payload:** all 12 sections; 4 platforms / 13 formats / **52 cells**; filters facebook→13,
  image_quote→4, both→1; `p_include_variants=true` → production-evidence-only.
- **Maturity dist (exact match to review proof, no drift):** Proven in production **14** · Conflict/diagnostic **13** ·
  Supported in theory only **10** · Blocked **8** · Policy-only **5** · Configured & enforceable **1** · Smoke-proven **1**.
- **Publisher dist:** proven 21 / unknown 17 / unsupported 14 — **no `publisher_inferred`**.
- **Website** not in matrix (`channel_outside_model` diagnostic only). **No-secret scan PASS**
  (access_token / credential_env_key / destination_id / page_access_token / client_id / output_url /
  storage_url all absent); **no raw `render_spec` dump**.

### 13c. Ledger backfill
- `apply_migration` does not auto-record under the `execute_sql` fallback, so the
  `supabase_migrations.schema_migrations` ledger was **backfilled** (established marker-row method):
  **version `20260630000000` / name `gfcp_slice1a_get_global_format_capability_pyramid_rpc`** recorded
  **exactly once** (no duplicate). GFCP is now the latest applied migration (after PPP `20260629120000`).
- **Migration SHA256 ledger drift RESOLVED** — repo SQL-of-record =
  `supabase/migrations/20260630000000_…rpc.sql`.

### Final status
**APPLIED_AND_PROVEN.** GFCP Slice 1A backend RPC is live, proven, and ledger-backed. Next gate:
**GFCP Slice 1B read-only dashboard UI** (Create → Format Capability) — separate authorization, gated.

---

## Cross-references

- Backend brief: `docs/briefs/global-format-capability-pyramid-slice1a-backend-brief.md`.
- Validation plan: `docs/briefs/global-format-capability-pyramid-slice1a-validation-plan.md`.
- PK decision record (D1–D5): `docs/briefs/global-format-capability-pyramid-slice0-decision-record.md`.
- Proven pattern: `docs/briefs/ppp-slice1a-data-contract-validation.md` +
  `supabase/migrations/20260629120000_ppp_slice1a_get_publishing_plan_pyramid_rpc.sql`.
