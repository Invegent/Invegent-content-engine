# Global Format Capability Pyramid — Slice 1A (read-only backend / data-contract brief)

> **Status:** implementation brief **only** — read-only backend / data-contract slice.
> **No implementation in this brief.** No RPC created, no migration, no DB mutation, no
> `execute_sql`, no apply, no deploy, no dashboard edit, no UI.
> **Produced:** 2026-06-29 (CE session). **Type:** docs/brief only.
> **Repos:** backend = `Invegent-content-engine` (this repo); future UI = the SEPARATE
> `invegent-dashboard` repo (`dashboard.invegent.com`) — out of scope here.
> **Decides against:** the PK source decisions D1–D5 recorded in register **v4.17**.
> **CE state at write time:** `main == origin/main == 9ac5b8439d30edf36285ed3283820785ef679662`;
> register **v4.17** current (Slice 0 PK source decisions recorded).

---

## 0. Authoritative state and lineage

- **Register v4.17** records PK's Slice 0 source decisions (D1–D5) and unblocks Slice 1A
  **to brief** — not to implement.
- **Slice 0 inputs** (the source/contract decisions this brief implements):
  - `docs/briefs/global-format-capability-pyramid-slice0-brief.md` (the source-decision & contract brief).
  - `docs/briefs/global-format-capability-pyramid-slice0-decision-record.md` (PK D1–D5 + the
    Canonical Capability Model v1 forward carry).
- **Proven pattern this slice mirrors end-to-end:**
  `docs/briefs/ppp-slice1a-data-contract-validation.md` — the live, ledger-backed,
  registered client-level RPC `public.get_publishing_plan_pyramid(uuid)` (validation checks 1–20).
  Slice 1A here is the **global / client-agnostic** analogue.
- **Inventory grounding:** `docs/briefs/publishing-plan-pyramid-inventory-brief.md`
  (§7 source map, §10 eligibility model, §11 variant gap, §14 risks).

> **Load-bearing framing (PK, do not lose):** Global Format Capability Pyramid **v0 = an
> evidence-and-reconciliation VIEW, NOT the final canonical source-of-truth architecture.** The
> later **Canonical Capability Model v1** is the normalized source of truth, designed only *after*
> this v0 view exposes the real conflict/gap set. Slice 1A produces a **reconciliation lens**; it
> resolves nothing and corrects nothing.

---

## 1. Purpose

Build the **read-only backend data contract** for the Global Format Capability Pyramid v0: a single
governed, reviewable read object that resolves the client-agnostic **(platform × format)** capability
matrix server-side and returns it as one `jsonb` payload, **mirroring the proven PPP Slice 1A RPC**.

The contract answers the global / base question: **"Can ICE support this platform + format *at all* —
is it declared, configured, governed, render-provable, publish-provable, and is there governed
creative evidence?"** It is **client-agnostic** (no per-client adoption) and its load-bearing
addition over the client PPP is **Layer G diagnostics**: where the scattered sources disagree, the
disagreement is *surfaced as data*, never silently resolved.

Slice 1A is **the data contract only** — no UI (that is Slice 1B), no editing, no writes, no
canonical model. The contract exists so a later read-only dashboard surface (Create → Format
Capability) can consume it via the service-role client, and so PK can see the real conflict set that
will justify the Canonical Capability Model v1.

---

## 2. Approved Slice 0 decisions (the contract this brief implements)

Recorded in register **v4.17** and
`docs/briefs/global-format-capability-pyramid-slice0-decision-record.md`:

- **D1 — APPROVED:** adopt the **layered evidence model for v0** (declared support · configured
  defaults · governed readiness · render proof · publish proof · Creative Library/contract proof
  where safe · diagnostics/conflicts). **Clarification:** layered evidence is the **v0 reconciliation
  model**, *not* the permanent canonical decision brain.
- **D2 — APPROVED:** Slice 1A uses a new **service-role-only SECURITY DEFINER RPC**
  `public.get_global_format_capability_pyramid(...)`, **unless the Slice-1A security review blocks
  it** → then fall back to the **dashboard server-action-only assembly** pattern (no new DB object).
- **D3 — APPROVED:** `publisher_path_status` v0 = **evidence/inference with honest uncertainty**;
  allowed labels include `publisher_proven` · `publisher_inferred` · `publisher_unknown` ·
  `publisher_blocked` · `publisher_unsupported`. **Do not invent publisher certainty.**
- **D4 — APPROVED:** Creative Library / variant proof v0 = **production-evidence-only where safe**;
  docs JSON (`docs/creative-library/*`) is **NOT** runtime authority; no full variant model is
  claimed; Layer 3 stays mostly `not_modelled`.
- **D5 — APPROVED:** page location = **Create → Format Capability** (UI is Slice 1B; recorded here
  for continuity only — not built in Slice 1A).

---

## 3. RPC candidate signature

**Preferred (D2):** a new read-only RPC that resolves the full global matrix server-side.

```text
public.get_global_format_capability_pyramid(
  p_platform         text    DEFAULT NULL,   -- optional filter: single platform
  p_ice_format_key   text    DEFAULT NULL,   -- optional filter: single format
  p_include_variants boolean DEFAULT false   -- v0: variant section stays placeholder unless true AND safe
) RETURNS jsonb
```

Semantics:

- **No required arguments** (the global view is client-agnostic — there is no `client_id` parameter,
  by design). All three parameters are optional filters.
- `p_platform` / `p_ice_format_key` narrow the returned matrix to a single platform and/or format
  (server-side `WHERE`), for a focused drawer/detail read. `NULL` = full matrix.
- `p_include_variants` v0: when `false` (default), `variant_capability[]` returns the placeholder
  shape. When `true`, it returns **production render evidence only** (`render_spec.variant_key`),
  still surfaced as evidence — **never** as an allowlist or model (D4). It must remain safe (no docs
  JSON authority, no secret leakage); if `true` cannot be served safely it degrades to the
  placeholder, not an error.
- **`STABLE`, read-only** — the body is `SELECT`-only; it mutates nothing.

**Fallback (D2):** if the Slice-1A security review blocks the RPC, implement the identical payload via
**dashboard server-side assembly** (the service-role client issues the layered SELECTs and assembles
the payload in a server action). The payload schema (§4) is identical either way; only the access
mechanism changes. The migration-name discipline and ledger-backfill steps then do not apply.

---

## 4. Payload schema

Top-level `jsonb` sections (mirrors the Slice 0 brief §6 and the PPP Slice 1A shape):

| Key | Type | Meaning |
|---|---|---|
| `contract_version` | string | e.g. `gfcp.v0` |
| `generated_at` | timestamp | server `now()` at read |
| `global_summary` | object | counts by `global_support_state`; platform count; format count; conflict count |
| `platforms[]` | array | modelled platforms (facebook, instagram, linkedin, youtube); website/WordPress flagged `evidence_only` if surfaced |
| `formats[]` | array | the `t."5.3_content_format"` format universe with `ice_format_key` + `display_label` |
| `platform_format_matrix[]` | array | the capability cells (cell model in §6) |
| `variant_capability[]` | array | v0 placeholder / production-evidence-only (§9) |
| `creative_library_links[]` | array | pointers to governed creative evidence (evidence-only, **not** authority) |
| `evidence_summary[]` | array | per-layer coverage roll-up (how much of the matrix each layer A–F proves) |
| `diagnostics[]` | array | Layer-G conflicts (which cells, which layers disagree, nature of clash) |
| `missing_model_pieces[]` | array | what is not modelled yet (§10) |
| `source_metadata` | object | which objects/versions were read; `is_current` filters applied; row counts |

Notes:

- Section shape is **stable** under filtering: with `p_platform`/`p_ice_format_key` set,
  `platform_format_matrix[]` is narrowed but every top-level key is still present.
- `global_summary` is computed from the returned (post-filter) cell set so the dashboard can render a
  capability count strip without re-aggregating.

---

## 5. Source layers (A–G)

Each layer is an **independently-sourced read-only signal**; the cell `global_support_state` (§6) is
*derived* from the stack, and disagreements are surfaced in Layer G, **not** silently resolved
(D1). All references are **schema-qualified** and read-only.

| Layer | Meaning | Read-only source(s) |
|---|---|---|
| **A — Declared support** | Does ICE declare this platform supports this format / is it buildable? | `t."5.3_content_format".platform_support` (per-platform support flags); render-engine / buildability metadata **if present** |
| **B — Configured defaults** | Is there a configured default mix for the pair? | `t.platform_format_mix_default` (`default_share_pct`, `is_current`) |
| **C — Governed readiness** | Are governance policies present for synthesis / quality / fitness? | `t.format_synthesis_policy`, `t.format_quality_policy`, `t.class_format_fitness` |
| **D — Render proof** | Has a render actually succeeded for the pair (and was it governed)? | `m.post_render_log` (`status='succeeded'`); `render_spec` labels / contract-identity fields **where safe** (whitelist only — no raw dumps) |
| **E — Publish proof** | Has a publish actually reached the platform for the pair? | `m.post_publish` (`status='published'`) |
| **F — Creative / contract proof (where safe)** | Is there governed creative/variant evidence? | **production render evidence only for v0** — `render_spec.variant_key` / `contract_ref` / `contract_version` from `m.post_render_log`; **NO docs JSON as runtime authority** (D4) |
| **G — Diagnostics / conflicts** | Where do the layers disagree? | derived: clashes between A–F are **surfaced** as `diagnostics[]` rows |

**Why layered (D1 rationale):** this is the same evidence-stacking discipline the client PPP proved
(declared → configured → enrolled → render-proven → publish-proven), generalised to global scope and
made explicit about conflict. **Layer G is the product** at the global level — the disagreements tell
PK where the model is wrong/incomplete and are the input to Canonical Capability Model v1.

**Grounded conflict examples Layer G must surface** (from Slice 0 §2, do **not** fix here):

1. **Defaults exist where support is false** — `t.platform_format_mix_default` has rows for pairs
   `t."5.3_content_format".platform_support` marks `false` (e.g. facebook `animated_text_reveal` 5%
   default vs `platform_support.facebook=false`). → diagnostic `default_without_support`.
2. **Publish evidence contradicts declared support** — `m.post_publish` shows publishes for pairs the
   `t.*` model does not currently represent (e.g. website/WordPress). → diagnostic
   `publish_evidence_without_support`.
3. **Render proves render, not reach** — `m.post_render_log` success ≠ a publisher path. D and E stay
   **separate layers**; never collapse render proof into publish reach.
4. **Channels outside the modelled platform set** — WordPress/website has publish evidence but may not
   exist in the `t.*` platform-format model. → diagnostic `channel_outside_model` (evidence-only).

---

## 6. Matrix cell model (`platform_format_matrix[]`)

Each **(platform × format)** cell resolves to exactly **one** `global_support_state`, derived from
layers A–G and labelled honestly (no cell looks safe merely because config exists).

| Field | Meaning |
|---|---|
| `platform` | platform key |
| `ice_format_key` | format key |
| `display_label` | human label |
| `global_support_state` | the resolved state (see list below) |
| `platform_support` | Layer A flag (`t."5.3_content_format".platform_support`) |
| `configured_default_present` | Layer B presence |
| `default_mix_pct` | Layer B `default_share_pct` (**display only — labelled, NOT enforced globally**) |
| `synthesis_policy_present` | Layer C (`t.format_synthesis_policy`) |
| `quality_policy_present` | Layer C (`t.format_quality_policy`) |
| `fitness_policy_present` | Layer C (`t.class_format_fitness`) |
| `render_path_status` | Layer D: `proven` / `evidence_only` / `none` / `unknown` |
| `render_provider` | observed provider from render evidence where safe (creatomate/heygen/…); else null |
| `publisher_path_status` | Layer E: `publisher_proven` / `publisher_inferred` / `publisher_unknown` / `publisher_blocked` / `publisher_unsupported` (§8 — never invented) |
| `smoke_or_proof_status` | governed smoke/proof state: `proven` / `not_evaluated` |
| `creative_library_status` | Layer F: `production_evidence` / `none` |
| `variant_model_status` | `not_modelled` (default v0) |
| `evidence_maturity` | the §7 maturity label (mirrors PPP Slice 1A labels) |
| `blocked_reasons[]` | scoped block/gap reasons (block scope below) |
| `operator_actions[]` | the exact required next action(s), if any |
| `detail_payload` | **safe whitelisted fields only** (no secrets, no raw `render_spec` dumps — §11) |

**`global_support_state` values (derived from A–G):**

- `proven_in_production` — render proof (D) **and** publish proof (E) observed.
- `smoke_proven` — governed smoke/proof render (D) observed; publish not yet proven.
- `configured_and_enforceable` — declared (A) + configured (B) + governance (C) + an enforcement path exists.
- `configured_not_smoke_proven` — declared + configured, no governed render/proof yet.
- `policy_only` — governance (C) present, never produced.
- `supported_in_theory_only` — declared support (A) only; no config, policy, or proof.
- `ungoverned` — appears (config/evidence) but governance (C) absent.
- `blocked` — a hard prerequisite missing (block scope below); shows operator action.
- `conflict` — layers disagree (Layer G); the cell carries the diagnostic.
- `not_modelled` — no backing model exists (e.g. variant capability).

**Block / gap scope** (so a block names *which* layer failed):

- `global_platform_block` — platform unsupported/disabled globally for the format.
- `policy_gap` — synthesis/quality/fitness policy missing (Layer C).
- `render_path_gap` — no render path / no successful render evidence (Layer D).
- `publisher_path_gap` — no publisher path / no publish evidence (Layer E).
- `proof_gap` — declared/configured but unproven (smoke/production proof absent).
- `creative_library_gap` — no governed creative/contract evidence (Layer F).
- `variant_model_gap` — variant capability not modelled.
- `client_gap` — **deferred, NOT in v0** — per-client enablement belongs to the client overlay.

---

## 7. Evidence maturity labels

`evidence_maturity` mirrors the proven PPP Slice 1A label vocabulary so the dashboard can reuse
Creative-Mix / PPP rendering logic. The label is a **maturity description, never an over-claim** —
no cell may read "Proven in production" without both render (D) and publish (E) proof.

| Label | Required evidence |
|---|---|
| `Proven in production` | render proof (D) **and** publish proof (E) for the pair |
| `Smoke-proven` | governed smoke/proof render (D); no publish proof yet |
| `Configured and enforceable` | declared (A) + configured (B) + governance (C) + enforcement path |
| `Configured but not smoke-proven` | declared + configured; no governed render/proof |
| `Policy exists but no render/publish proof` | governance (C) present; never produced |
| `Supported in theory only` | declared support (A) only |
| `Ungoverned` | config/evidence present; governance (C) absent |
| `Not evaluated` | the default where no layer asserts maturity (`smoke_or_proof_status = not_evaluated`) |

**Discipline:** `evidence_maturity` is bounded by the *weakest* required layer — a configured cell
with no render evidence caps at `Configured but not smoke-proven`, exactly as PPP Slice 1A caps at
`Configured and enforced` without `smoke_or_proof_status = proven`.

---

## 8. Publisher path uncertainty model (D3)

Global publisher support has **no clean canonical DB source today** — publisher capability lives in
EF/worker code plus sparse `m.post_publish` evidence; there is **no "publisher supports (platform,
format)" table**. v0 therefore expresses publisher capability as **evidence/inference with honest
uncertainty** and **never invents certainty**.

`publisher_path_status` labels:

| Label | When |
|---|---|
| `publisher_proven` | `m.post_publish` shows real publishes for the pair (`status='published'`) |
| `publisher_inferred` | no publish evidence, but known per-platform publisher coverage makes the path plausible — labelled inferred, never asserted |
| `publisher_unknown` | no evidence and no known coverage signal — surfaced honestly as unknown |
| `publisher_blocked` | a hard prerequisite for publishing the pair is missing |
| `publisher_unsupported` | the publisher path is known not to support the pair |

Rules:

- `publisher_proven` requires **real `m.post_publish` evidence** for the pair — nothing weaker.
- Absence of evidence → `publisher_unknown` (or `publisher_inferred` where code coverage is known but
  unproven). **Never** default a no-evidence cell to a proven/supported state.
- A **static publisher capability catalog** (a future declared table) is a **named later slice**,
  explicitly **NOT v0** (Slice 0 §7 option B, deferred).

---

## 9. Creative Library / variant v0 model (D4)

- **No full DB-backed Creative Library / variant capability registry exists.** Variant capability
  today is **runtime production evidence only** (`render_spec.variant_key`), not an allowlist
  (inventory §11).
- **Docs JSON (`docs/creative-library/*`) MUST NOT be used as runtime authority.** It is a
  declarative design artifact; the runtime-import guard exists to keep it out of production read
  paths. The contract does **not** read the docs JSON.
- **v0 uses production render evidence only, where safe** — `render_spec.variant_key` /
  `contract_ref` / `contract_version` from `m.post_render_log` as **evidence**, surfaced as
  `creative_library_status = production_evidence` (else `none`).
- `variant_capability[]` is a **placeholder** unless `p_include_variants = true`, in which case it
  carries production render evidence **only** (still evidence, never an allowlist/model). It degrades
  to the placeholder if it cannot be served safely.
- `variant_model_status` stays **`not_modelled`** for v0. **Layer 3 (variant) remains a placeholder**
  until a real variant capability model (e.g. a future `c.client_format_variant_*` design) exists.
  **No variant model is built in this slice.**

---

## 10. Missing model pieces (`missing_model_pieces[]`)

The contract must **name what is not modelled** rather than synthesise it (honesty over coverage).
At minimum, v0 surfaces:

- `variant_capability_model_missing` — no DB-backed variant capability registry (Layer 3 placeholder).
- `publisher_capability_catalog_missing` — no declared "publisher supports (platform, format)" table
  (publisher path is evidence/inference only, §8).
- `render_path_catalog_missing` — no declared render-path capability catalog; render capability is
  proven by `m.post_render_log` evidence only (Layer D).
- `channel_model_incomplete` — channels with publish evidence outside the `t.*` platform-format model
  (e.g. website/WordPress) are not modelled (Slice 0 §2 conflict #4).
- `canonical_capability_model_absent` — the normalized source of truth (**Canonical Capability Model
  v1**) does not exist yet; v0 is reconciliation, not canon.

Each entry is descriptive (what is missing + why it matters), so PK can read the gap set that
justifies Canonical Capability Model v1.

---

## 11. Security posture

Mirror the **proven PPP Slice 1A posture exactly** (validation checks 12–18). Because the global
object reads **more `m.*` evidence** than the client RPC, the secret/whitelist review must be
**re-run on the global field set, not assumed**.

- **SECURITY DEFINER.**
- **`STABLE`** (read-only; no mutation).
- **owner `postgres`.**
- **pinned `search_path = public, pg_temp`.**
- **schema-qualified references** throughout.
- **no dynamic SQL.**
- **`EXECUTE` granted only to `service_role`**; **REVOKE `EXECUTE` from `PUBLIC`, `anon`,
  `authenticated`.**
- **dashboard server-side only** — called via the service-role client.
- **no browser-direct RPC.**
- **no secrets** — `page_access_token` / `credential_env_key` / `destination_id` / raw
  `c.client.profile` never selected; `page_id` only ever as a boolean connection signal; never emit a
  token, credential, or raw profile blob.
- **no raw `render_spec` dumps** — only whitelisted contract-identity fields
  (`variant_key`, `contract_ref`, `contract_version`, `selector_reason`, render `status`/`label`).
- **safe `detail_payload` whitelist only** — an explicit allowlist of display-safe fields per cell;
  anything not on the allowlist is omitted, not best-effort-redacted.

**Grant discipline:** the migration must be `CREATE FUNCTION` + REVOKE/GRANT on the function **only**
— **no table grants widened**, no schema exposure changed. (PPP Slice 1A check 16.)

---

## 12. Validation requirements

Validate the function body as a **read-only `SELECT` against live production before the function is
created** (the PPP Slice 1A method: validate the exact SQL against real rows, zero mutation, no
function created during validation), because the contract joins live `t.*`/`m.*` objects whose real
rows are the point of the validation. Record results in a sibling validation doc
(`docs/briefs/global-format-capability-pyramid-slice1a-validation.md`, created at implementation
time).

Required checks (global analogue of PPP Slice 1A checks 1–20):

1. **All modelled platforms returned** (facebook, instagram, linkedin, youtube; website/WordPress
   only as `evidence_only` if surfaced).
2. **Full format universe returned** from `t."5.3_content_format"` with `display_label`.
3. **Matrix cell count** = platforms × formats (post any `is_current` filter), with state counts.
4. **Layer A** (`platform_support`) reflected per cell.
5. **Layer B** default mix values match `t.platform_format_mix_default` (`is_current`).
6. **Layer C** policy presence matches `t.format_synthesis_policy` / `t.format_quality_policy` /
   `t.class_format_fitness`.
7. **Layer D** `render_path_status` derived from `m.post_render_log` success evidence; `render_provider`
   only where safely observed.
8. **Layer E** `publisher_path_status` honest per §8 — `publisher_proven` only with real
   `m.post_publish` evidence; no-evidence cells `unknown`/`inferred`, never proven.
9. **Layer F** `creative_library_status = production_evidence` only where `render_spec.variant_key`
   evidence exists; else `none`; **no docs JSON read**.
10. **Layer G** diagnostics populated for the grounded conflicts (default-without-support;
    publish-evidence-without-support; channel-outside-model).
11. **`evidence_maturity`** never over-claims (no `Proven in production` without D **and** E).
12. **No secrets** in payload (`contains_secret_marker = false`; no `access_token`/
    `credential_env_key`/`destination_id`/raw profile in payload text).
13. **No raw `render_spec` dumps** — only whitelisted contract-identity fields present.
14. **`detail_payload`** contains whitelisted fields only.
15. **No DB mutation during read** — function `STABLE`, body `SELECT`-only; validation ran as SELECT,
    no function created during validation.
16. **No table grants widened** — migration only `CREATE FUNCTION` + function REVOKE/GRANT.
17. **RPC EXECUTE least-privilege** — REVOKE PUBLIC/anon/authenticated; GRANT `service_role` only.
18. **Existing production behaviour unchanged** — additive read-only function; reads existing objects;
    mutates nothing.
19. **No UI files changed** — Slice 1A is data-contract only (migration + validation doc).
20. **No dashboard deploy.**
21. **Filter parameters** (`p_platform`, `p_ice_format_key`, `p_include_variants`) behave per §3 and
    do not change top-level payload shape.
22. **`missing_model_pieces[]`** present and honest (§10).

**Migration-name discipline** (if the RPC path is taken): migration name = permanent identity; a new
timestamped name (e.g. `2026MMDDHHMMSS_gfcp_slice1a_get_global_format_capability_pyramid_rpc.sql`);
ledger backfill is its own PK-gated step after apply (same pattern as PPP Slice 1A / Control Tower P1
where `apply_migration` was harness-denied and `execute_sql` was the authorized fallback).

---

## 13. Review gates (the Slice 1A lane order)

Mirrors the proven PPP Slice 1A end-to-end lane:

1. **Local read-only SELECT proof** — run the function body as a `SELECT` against live production
   (read-only), prove the payload against real `t.*`/`m.*` rows, record in the validation doc.
   **No function created during validation; zero mutation.**
2. **`db-rls-auditor`** — review the RPC SQL for RLS gaps, REST-exposure traps (PGRST106), grant
   discipline, schema-qualification, and migration-naming. Verdict must be **`pass`**.
3. **Security / external review** — `security-auditor` triage on the global field set (the secret /
   `detail_payload` whitelist re-run, **not** assumed from the client RPC) **and**
   `ask_chatgpt_review` on the **final** migration SQL + validation packet (record
   `reviewed_input_hash`; any non-clean verdict halts → PK). The security review may invoke the **D2
   fallback** (server-action-only) if it blocks the RPC.
4. **PK apply gate (HARD STOP)** — the orchestrator prepares the exact apply command + preconditions;
   PK runs/authorizes the apply (and the separate ledger backfill). Deploy/merge/migrate stays
   manual. **Nothing applies without PK.**

(Per the ICE deploy gotchas: no `supabase functions deploy` is in scope here — this is a DB RPC, not
an EF; and a `t.*`/`m.*` read object must be reachable via RPC, not raw REST, to avoid PGRST106.)

---

## 14. Explicit exclusions

This slice does **NOT** include:

- no RPC creation, migration creation, DB mutation, `execute_sql`, migration apply, ledger backfill,
  or deploy **in this brief** (those are the Slice 1A *implementation* lane, gated by §13);
- **no UI** (Slice 1B), no editable UI, no dry-run UI, no write RPC, no client adoption overlay;
- **no variant model build** (Layer 3 stays `not_modelled`); no Creative Library DB registry build;
- **no static publisher capability catalog** (deferred future slice);
- **no Canonical Capability Model v1** normalized tables (the forward carry — designed only after v0
  surfaces conflicts);
- **no correcting the `t.*` / `m.*` conflicts** documented in §5 — they are *surfaced* as diagnostics,
  never fixed here;
- no docs-JSON-as-runtime-authority;
- no dashboard-repo edit; no code edit;
- no publisher / render / schedule / avatar / video / scene work;
- no Slice C proof; no Phase 1 post-fill confirmation;
- no schedule-row debt cleanup; no broader ledger-drift backfill.

---

## 15. Open questions (if any)

None block the Slice 1A *implementation* — the source/contract decisions (D1–D5) are resolved and the
access posture mirrors a proven pattern. The following are **flagged for resolution during the Slice
1A lane** (most at the security/apply gates), not blockers to implement against:

- **Q1 (security gate) — RPC vs server-action fallback (D2):** confirmed only by the Slice-1A
  security review on the *global* field set. If the review blocks the RPC, the contract ships via
  dashboard server-action assembly (identical payload). *Resolved at §13 gate 3.*
- **Q2 (whitelist) — exact `detail_payload` + `render_spec` field whitelist** for the global object
  must be ratified in review (the global object reads more `m.*` evidence than the client RPC, so the
  whitelist cannot be inherited unchanged). *Resolved at §13 gate 3.*
- **Q3 (scope) — `publisher_inferred` coverage signal source (D3):** v0 derives `inferred` from
  *known per-platform publisher coverage*; the exact coverage signal (which platforms are treated as
  "known coverage") should be named at implementation so it is auditable and not a hidden assumption.
  Default: only `publisher_proven` from `m.post_publish` evidence; everything else `unknown` unless a
  named, recorded coverage list is approved.
- **Q4 (channels) — website/WordPress representation:** surfaced as `evidence_only` /
  `channel_outside_model` diagnostic in v0 (not added to the modelled platform set). Confirm PK is
  content to leave non-`t.*` channels as evidence-only diagnostics for v0.

---

## Cross-references

- Slice 0 brief: `docs/briefs/global-format-capability-pyramid-slice0-brief.md`.
- Slice 0 decision record: `docs/briefs/global-format-capability-pyramid-slice0-decision-record.md`
  (PK D1–D5 + Canonical Capability Model v1 carry).
- Proven client-level pattern: `docs/briefs/ppp-slice1a-data-contract-validation.md`
  (RPC signature, security checks 12–18, `evidence_maturity` labels, `detail_payload` whitelist).
- Inventory grounding: `docs/briefs/publishing-plan-pyramid-inventory-brief.md`
  (§7 source map, §10 eligibility model, §11 variant gap, §14 risks).
- Live objects read by the future contract (read-only): `t."5.3_content_format"`,
  `t.platform_format_mix_default`, `t.format_synthesis_policy`, `t.format_quality_policy`,
  `t.class_format_fitness`, `m.post_render_log`, `m.post_publish`.
