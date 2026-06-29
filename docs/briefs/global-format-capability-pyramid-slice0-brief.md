# Global Format Capability Pyramid — Slice 0 (source-decision & contract brief)

> **Status:** source-decision and contract brief **only**. **No implementation in Slice 0.**
> **Produced:** 2026-06-29 (CE session). **Type:** docs/brief only — no code, no migration, no RPC,
> no DB mutation, no `execute_sql`, no deploy, no dashboard edit.
> **Repos:** backend = `Invegent-content-engine` (this repo); future UI = the SEPARATE
> `invegent-dashboard` repo (`dashboard.invegent.com`).
> **Inputs:** `docs/briefs/publishing-plan-pyramid-inventory-brief.md` (Session 1 inventory +
> §15 Session 3 readiness addendum); `docs/briefs/ppp-slice1a-data-contract-validation.md`
> (the proven client-level RPC pattern this brief mirrors).

---

## 0. Authoritative state at time of writing

- CE register **v4.16** current (the PPP tooltip-hotfix note has landed). CE
  `main == c864185` (local), **1 commit ahead of `origin/main == 096576a`** — the v4.16 register
  note is committed locally, unpushed. This brief does not depend on push state.
- **PPP Slice 1A complete:** `public.get_publishing_plan_pyramid(uuid)` is **live, ledger-backed,
  and registered** — the proven client-level read-contract pattern (validation:
  `docs/briefs/ppp-slice1a-data-contract-validation.md`).
- **PPP Slice 1B read-only UI live** in dashboard production; the tooltip hotfix is handled
  separately in the dashboard session and is **out of scope here**.
- **Global Format Capability Pyramid is future work, not implemented.** This is its Slice 0.

> **Scope discipline:** this brief decides *sources* and *contract shape* only. It chooses nothing
> that mutates production, builds no UI, writes no RPC, and corrects none of the `t.*`/`m.*`
> conflicts it documents.

---

## 1. Purpose and product framing

Two pyramids, two questions, two layers:

- **Global Format Capability Pyramid (this brief)** is the **global / base layer**. It answers:
  **"Can ICE support this platform + format *at all* — and is it declared, configured, governed,
  render-provable, publish-provable?"** It is **client-agnostic**: it describes the *capability
  surface of the system*, not any one client's adoption.
- **Client Publishing Plan Pyramid (already built, Slice 1A/1B)** is the **client adoption /
  enrollment layer**. It answers: **"Has *this client* enabled / enrolled / configured this
  platform + format, and what is its eligibility/allocation state?"**

The relationship is **base → overlay**: the global capability layer is the substrate the client
publishing plans build on. A client cannot meaningfully "enable carousel on LinkedIn" if ICE has no
render path or publisher path for that pair globally. Today the client PPP infers some of this
per-client; the global view makes the **system-wide capability truth a first-class, explainable
surface** so that client-level gaps can be told apart from global-level gaps.

- **Global capability** = "Can ICE support this platform + format at all?" (declared support →
  configured default → governed readiness → render proof → publish proof → creative/variant
  evidence).
- **Client capability** = "Has this client enabled/enrolled it?" (the existing PPP question;
  **client overlay is explicitly deferred** out of the global v0 — see §11/§12).

---

## 2. Source-decision problem

**There is currently no single source of truth for platform × format capability.** The inventory
run (`publishing-plan-pyramid-inventory-brief.md` §7, §14) confirms capability facts are scattered
across ≥7 surfaces that do not agree and were never designed to be read together.

### Conflicting candidate sources

| Source | What it asserts | Known limitation |
|---|---|---|
| `t."5.3_content_format".platform_support` | Declared per-platform support flags per format | Declarative; can contradict configured defaults and observed evidence |
| `t.platform_format_mix_default` | Configured default mix % per (platform, format) | Defaults can exist where `platform_support=false` (see conflict #1) |
| `m.post_publish` | Evidence a post was actually published to a platform | Proves a *past* publish, not declared/ongoing support; sparse coverage |
| `m.post_render_log` | Evidence a render succeeded (incl. `render_spec` contract echo) | Proves render, **not** publisher reach; governed vs legacy paths differ |
| publisher / worker code | The *real* execution capability (which platforms/formats a worker/publisher actually handles) | Not a DB source; code and data can disagree; not queryable from a read contract |
| Creative Library / registry + proof evidence (`docs/creative-library/*`, `render_spec.variant_key`) | Declared creative contracts + production variant evidence | **Docs JSON is not runtime authority**; no DB-backed variant capability registry exists |
| dashboard / system format surfaces (`/system/formats`, Creative Mix audit) | Operator-facing format listings | Presentation surfaces, not authoritative; some are DB-dumps |

### Recorded examples of conflict (grounded)

1. **Defaults exist where support is false.** `t.platform_format_mix_default` has rows for
   (platform, format) pairs that `t."5.3_content_format".platform_support` marks `false` — e.g.
   facebook `animated_text_reveal` carries a 5% default while `platform_support.facebook=false`
   (recorded in `ppp-slice1a-data-contract-validation.md` "Honest finding"). Declared support and
   configured default disagree.
2. **Publish evidence may contradict declared support.** `m.post_publish` can show a publish for a
   (platform, format) pair whose declared support/config does not currently model it (e.g. website /
   WordPress publishing exists in evidence but is not configured in the same format-mix model).
3. **Render evidence proves render, not reach.** `m.post_render_log` success proves a render
   pipeline produced an asset; it does **not** prove a publisher path can deliver that format to the
   platform. The two must be separate layers.
4. **Website/other channels.** WordPress/website has publish evidence but may not be represented in
   the `t.*` platform-format model at all — capability exists outside the modelled platform set.
5. **Avatar / publisher support unclear.** Avatar/persona capability (`c.brand_avatar`,
   `c.client_avatar_profile`) and publisher capability live in code + sparse data; code and data can
   disagree and there is no canonical "publisher supports X" table.
6. **Voice/video engine declarations vs observed success path.** Render-engine declarations
   (creatomate/heygen capability audits) can conflict with the observed succeeding path in
   `m.post_render_log` — declared engine capability ≠ proven production path.

**Conclusion:** picking any one table as "truth" would encode a known-wrong answer. The capability
truth is **inherently multi-source and must be expressed as layered evidence with diagnostics for
disagreement.**

---

## 3. Recommended source decision

**Do not choose a single table as truth.** Adopt a **layered evidence model** — each layer is a
distinct, independently-sourced signal; the global cell state (§4) is *derived* from the stack, and
disagreements between layers are **surfaced as diagnostics, not silently resolved**.

| Layer | Meaning | Sources (read-only) |
|---|---|---|
| **A — Declared support** | Does ICE declare this platform supports this format / is it buildable? | `t."5.3_content_format".platform_support`; `render_engine` / buildability metadata **if present** |
| **B — Configured default** | Is there a configured default mix for the pair? | `t.platform_format_mix_default` (`default_share_pct`, `is_current`) |
| **C — Governed readiness** | Are the governance policies present for synthesis/quality/fitness? | `t.format_synthesis_policy`, `t.format_quality_policy`, `t.class_format_fitness` |
| **D — Render proof** | Has a render actually succeeded for the pair (and was it governed)? | `m.post_render_log`; `render_spec` labels / contract evidence **where safe** |
| **E — Publish proof** | Has a publish actually reached the platform for the pair? | `m.post_publish` |
| **F — Creative Library / variant evidence** | Is there governed creative/variant evidence? | **production render evidence only for v0** (`render_spec.variant_key`); **no docs JSON as runtime authority** |
| **G — Diagnostics** | Where do the layers disagree? | derived: conflicts between A–F are **surfaced, not hidden** |

**Rationale:** this is the same evidence-stacking discipline the client PPP already proved at the
client scope (declared → configured → enrolled → render-proven → publish-proven), generalised to the
global scope and made explicit about conflict. Layer G is the load-bearing addition versus the
client PPP: at the global level the *disagreements are the product* (they tell PK where the model is
wrong or incomplete).

---

## 4. Global cell state model

Each **(platform × format)** global cell resolves to **one** `global_support_state`, derived from
the layered evidence (§3) and labelled honestly (no cell looks safe merely because config exists):

- **Proven in production** — render proof (D) **and** publish proof (E) observed for the pair.
- **Smoke-proven** — governed smoke/proof render observed (D), publish not yet proven.
- **Configured and enforceable** — declared (A) + configured (B) + governance present (C) + an
  enforcement path exists.
- **Configured but not smoke-proven** — declared + configured, but no governed render/proof yet.
- **Policy exists but no render/publish proof** — governance (C) present, never produced.
- **Supported in theory only** — declared support (A) only; no config, no policy, no proof.
- **Ungoverned** — appears (config/evidence) but governance policies (C) absent.
- **Blocked** — a hard prerequisite is missing (see block scope below); shows the operator action.
- **Conflict / diagnostic** — layers disagree (e.g. default exists where support=false; publish
  evidence without declared support); surfaced via Layer G.
- **Not modelled yet** — no backing model exists (e.g. variant capability).

### Block / gap scope (so a block names *which* layer failed)

- `global_platform_block` — the platform itself is unsupported/disabled globally for the format.
- `policy_gap` — synthesis/quality/fitness policy missing (Layer C).
- `render_path_gap` — no render path / no successful render evidence (Layer D).
- `publisher_path_gap` — no publisher path / no publish evidence (Layer E).
- `proof_gap` — declared/configured but unproven (smoke/production proof absent).
- `creative_library_gap` — no governed creative/contract evidence (Layer F).
- `variant_model_gap` — variant capability not modelled.
- `client_gap` — **deferred, not in v0** — per-client enablement gap belongs to the client overlay.

---

## 5. Data contract recommendation

Recommend a **new read-only global data contract** that resolves the full global matrix shape
server-side, mirroring the proven PPP Slice 1A RPC.

**Preferred — new read-only RPC:**

```text
public.get_global_format_capability_pyramid(
  p_platform         text    DEFAULT NULL,   -- optional filter
  p_ice_format_key   text    DEFAULT NULL,   -- optional filter
  p_include_variants boolean DEFAULT false   -- v0: variant section stays placeholder unless true+safe
) RETURNS jsonb
```

**Alternative — dashboard server-side assembly only** (no new DB object): the dashboard service-role
client issues the layered SELECTs and assembles the payload in a server action.

**Recommendation:** **use the RPC**, for parity with PPP Slice 1A — it cleanly solves the
`t.*`/`m.*` REST-exposure problem (§9, inventory §14.1) in one governed, reviewable object, and keeps
the capability resolution logic in one place rather than spread across dashboard code — **unless the
Slice-1A-style security review finds a better server-action-only pattern.** The decision is PK's
(§13, Decision 2).

---

## 6. Proposed payload schema

Top-level sections:

- `contract_version` — string (e.g. `gfcp.v0`).
- `generated_at` — timestamp.
- `global_summary` — counts by `global_support_state`; platform count; format count; conflict count.
- `platforms[]` — modelled platforms (facebook, instagram, linkedin, youtube; website/WordPress
  flagged as evidence-only if surfaced).
- `formats[]` — the `t."5.3_content_format"` format universe with `display_label`.
- `platform_format_matrix[]` — the cells (fields below).
- `variant_capability[]` — v0 **placeholder / production-evidence-only** (see §8).
- `creative_library_links[]` — pointers to governed creative evidence (evidence-only, not authority).
- `evidence_summary[]` — per-layer coverage roll-up (how much of the matrix each layer proves).
- `diagnostics[]` — Layer-G conflicts (which cells, which layers disagree, the nature of the clash).
- `missing_model_pieces[]` — what is not modelled yet (variant model, publisher catalog, etc.).
- `source_metadata` — which objects/versions were read; `is_current` filters applied.

### Matrix cell fields (`platform_format_matrix[]`)

| Field | Meaning |
|---|---|
| `platform` | platform key |
| `ice_format_key` | format key |
| `display_label` | human label |
| `global_support_state` | the §4 state |
| `platform_support` | Layer A flag (`t."5.3_content_format".platform_support`) |
| `configured_default_present` | Layer B presence |
| `default_mix_pct` | Layer B `default_share_pct` (display only; **labelled, not enforced globally**) |
| `synthesis_policy_present` | Layer C (`t.format_synthesis_policy`) |
| `quality_policy_present` | Layer C (`t.format_quality_policy`) |
| `fitness_policy_present` | Layer C (`t.class_format_fitness`) |
| `render_path_status` | Layer D (`proven` / `evidence_only` / `none` / `unknown`) |
| `render_provider` | observed provider from render evidence where safe (creatomate/heygen/…); else null |
| `publisher_path_status` | Layer E (`proven` / `inferred` / `unknown` — never invented; see §7) |
| `smoke_or_proof_status` | governed smoke/proof state (`proven` / `not_evaluated`) |
| `creative_library_status` | Layer F (`production_evidence` / `none`) |
| `variant_model_status` | `not_modelled` (default v0) |
| `evidence_maturity` | the §4 maturity label (mirrors PPP Slice 1A labels) |
| `blocked_reasons[]` | scoped block/gap reasons (§4 block scope) |
| `operator_actions[]` | the exact required next action(s), if any |
| `detail_payload` | **safe whitelisted fields only** (no secrets, no raw `render_spec` dumps) |

This mirrors the PPP Slice 1A cell contract (`evidence_maturity`, `blocked_reasons`,
`detail_payload`) so the dashboard can reuse Creative-Mix/PPP rendering logic.

---

## 7. Publisher-path source decision

**Global publisher support has no clean canonical DB source today.** Publisher capability lives in
EF/worker code plus sparse `m.post_publish` evidence; there is no "publisher supports (platform,
format)" table.

v0 options:

- **A. Infer from evidence + known publisher code** — derive `publisher_path_status` from
  `m.post_publish` evidence (and known per-platform publisher coverage), **labelled `inferred` /
  evidence-based**, never asserted as certainty.
- **B. Build a static publisher capability catalog** — a future declared table of publisher
  capability. **Deferred** (new development; not v0).
- **C. Mark `publisher_path_status = inferred / unknown`** wherever it is not proven by evidence.

**Recommendation for v0:**
- **Do not invent publisher certainty.** Use proof/evidence where it exists (`proven` only when
  `m.post_publish` shows real publishes for the pair).
- Where evidence is absent, **surface "publisher path unknown" honestly** (`unknown`), or `inferred`
  where code coverage is known but unproven.
- The static publisher capability catalog (option B) is a **named future slice**, not v0.

---

## 8. Creative Library / variant decision

- **No full DB-backed Creative Library / variant capability registry exists.** Variant capability
  today is runtime evidence only (`render_spec.variant_key`), not an allowlist (inventory §11).
- **Docs JSON (`docs/creative-library/*`) must NOT be used as runtime authority.** It is a
  declarative design artifact; the runtime-import guard exists precisely to keep it out of
  production read paths.
- **v0 uses production render evidence only, where safe** — `render_spec.variant_key` from
  `m.post_render_log` as *evidence*, surfaced as `creative_library_status = production_evidence`.
- **Variant capability remains mostly `not_modelled`.** `variant_capability[]` is a placeholder.
- **Layer 3 stays a placeholder** until a real variant model
  (`c.client_format_variant_*`-style, inventory §11) is designed and built. No variant build here.

---

## 9. Security model

If a DB object is used, mirror the **proven PPP Slice 1A posture** exactly:

- **SECURITY DEFINER** RPC.
- **owner `postgres`.**
- **`STABLE`** (read-only; no mutation).
- **pinned `search_path = public, pg_temp`.**
- **schema-qualified references** throughout.
- **no dynamic SQL.**
- **`EXECUTE` revoked** from `PUBLIC`, `anon`, `authenticated`.
- **`EXECUTE` granted only to `service_role`** unless a narrower approved server role exists.
- **dashboard server-side only** — called via the service-role client.
- **no browser-direct RPC.**
- **no secrets** — `page_access_token` / `credential_env_key` / `destination_id` / raw
  `c.client.profile` never selected; `page_id` only ever as a boolean connection signal.
- **no raw `render_spec` dumps** — only whitelisted contract-identity fields.
- **safe `detail_payload` whitelist only.**

This is the **same posture proven in PPP Slice 1A** (validation checks 12–18) — db-rls-auditor +
external review + PK apply gate apply identically. The global object reads more `m.*` evidence than
the client RPC, so the secret/whitelist review must be re-run on the global field set, not assumed.

---

## 10. UI direction (not implementation)

Future UI shape (record only — **do not build in this slice**):

- Likely under **Create → Formats** or **Create → Creative Library / Format Capability** (page
  location is a PK decision — §13, Decision 5).
- **rows = formats**, **columns = platforms** (the transpose of the client PPP, because the global
  view is format-capability-major).
- **summary row / capability counts** at the top if useful (counts by `global_support_state`).
- **side drawer** for global blockers / proof chain per cell (mirrors PPP's read-only drawer).
- **client overlay deferred** (no per-client adoption in the global v0 UI).
- **variant layer placeholder** only.

**No UI is implemented in Slice 0.**

---

## 11. Slice plan

- **Slice 0 (this brief):** source decision + contract decision. **No implementation.**
- **Slice 1A:** read-only global RPC / data contract +
  validation harness + db-rls-auditor / security / external review + **PK apply gate** (mirrors PPP
  Slice 1A end-to-end).
- **Slice 1B:** read-only dashboard / global capability UI (rows=formats, cols=platforms, side
  drawer). **No editing.**
- **Later (separately gated):** client adoption overlay · variant model
  (`c.client_format_variant_*`) · editable / admin capability controls · static publisher capability
  catalog · Creative Library DB registry if needed.

---

## 12. Explicit exclusions

This slice (and the global v0 it scopes) does **NOT** include:

- no mutation · no editable UI · no write RPC · no client override changes · no variant
  implementation · no publisher/render worker changes · no platform-capability cleanup mutation ·
  **no correcting the `t.*` conflicts** documented in §2 (they are *surfaced* as diagnostics, not
  fixed here) · no schedule work · no Slice C proof · no Phase 1 post-fill confirmation ·
  no client adoption overlay · no Creative Library DB registry build · no tooltip-hotfix work.

---

## 13. Open decisions for PK (required before Slice 1A)

- **Decision 1 — Layered model vs single source.** Adopt the **layered evidence model** (§3, A–G
  with diagnostics) instead of declaring one table as truth? *(Recommended: yes.)*
- **Decision 2 — RPC vs server-action assembly.** Use a **new `service_role`-only SECURITY DEFINER
  RPC** (`public.get_global_format_capability_pyramid(...)`, §5/§9) for PPP parity, or
  dashboard server-side assembly only? *(Recommended: RPC, unless security review prefers
  server-action-only.)*
- **Decision 3 — `publisher_path_status` v0.** Use **evidence/inference labelled with uncertainty**
  (`proven`/`inferred`/`unknown`, §7), or wait for a publisher capability catalog (option B)?
  *(Recommended: evidence/inference + honest uncertainty for v0; catalog is a later slice.)*
- **Decision 4 — Creative Library / variant proof.** Keep variant/creative capability
  **production-evidence-only for v0** (no docs-JSON authority, `not_modelled` placeholder, §8)?
  *(Recommended: yes.)*
- **Decision 5 — Page location.** **Create → Formats**, **Create → Creative Library**, or a new
  **Create → Format Capability**? *(PK product call — no default forced.)*

---

## 14. Recommended verdict

**`READY_FOR_PK_SOURCE_DECISION`** — the source map is complete and grounded in the existing
inventory (`publishing-plan-pyramid-inventory-brief.md` §7/§14) and the proven Slice 1A contract
(`ppp-slice1a-data-contract-validation.md`); the layered evidence model, cell-state model, payload
schema, publisher-path stance, creative/variant stance, security posture, UI direction, slice plan,
and exclusions are all specified; and the open decisions for PK are explicit (§13). No further
inventory is required to make the source/contract decisions, and the data-access posture mirrors an
already-proven pattern (so neither `NEEDS_MORE_INVENTORY` nor `NEEDS_SECURITY_REVIEW` applies at the
brief stage — the security *review* itself is a Slice 1A gate, not a Slice 0 blocker).

---

## 15. PK source decisions (RECORDED 2026-06-29 — §13 resolved)

> Full record: `docs/briefs/global-format-capability-pyramid-slice0-decision-record.md`.
> **PK approved moving forward.** No implementation occurred at decision time.

**Framing (load-bearing):** Global Format Capability Pyramid **v0 = evidence-and-reconciliation
view**, **NOT** the final canonical source-of-truth architecture. The later **Canonical Capability
Model v1** is the normalized source-of-truth architecture (forward carry — see below).

- **D1 — APPROVED:** adopt the layered evidence model for v0 (declared support · configured defaults
  · governed readiness · render proof · publish proof · Creative Library/contract proof where safe ·
  diagnostics/conflicts). **Clarification:** layered evidence is the **v0 reconciliation model**, not
  the permanent canonical decision brain.
- **D2 — APPROVED:** Slice 1A uses a new **service-role-only SECURITY DEFINER RPC**
  `public.get_global_format_capability_pyramid(...)`, **unless security review blocks it** (then
  server-action-only fallback).
- **D3 — APPROVED:** `publisher_path_status` v0 = evidence/inference with honest uncertainty; allowed
  labels include `publisher_proven` · `publisher_inferred` · `publisher_unknown` ·
  `publisher_blocked` · `publisher_unsupported`. **Do not invent publisher certainty.**
- **D4 — APPROVED:** Creative Library / variant proof v0 = **production-evidence-only where safe**;
  docs JSON is **not** runtime authority; no full variant model is claimed; Layer 3 stays mostly
  `not_modelled` until a real variant capability model exists.
- **D5 — APPROVED:** page location = **Create → Format Capability** (the surface spans platform,
  format, policy, render, publish, proof, creative evidence, and diagnostics — bigger than Formats or
  Creative Library alone).

**Status change:** **Slice 1A may now be briefed** as a **read-only backend / data-contract slice**
(RPC + validation harness + db-rls-auditor / security / external review + PK apply gate). **Slice 1A
is NOT implemented here — only unblocked-to-brief.**

**Future architecture carry — Canonical Capability Model v1:** after the v0 view exposes enough
conflicts/gaps, design normalized capability tables/catalogs to become the long-term source of truth
for Advisor, Studio, the client Publishing Plan Pyramid, render eligibility, and publish eligibility.
Future, PK-gated, **not started.**

---

## Cross-references

- Decision record: `docs/briefs/global-format-capability-pyramid-slice0-decision-record.md`
  (PK D1–D5 + Canonical Capability Model v1 carry).
- Inventory + readiness source: `docs/briefs/publishing-plan-pyramid-inventory-brief.md`
  (§7 source map, §10 eligibility model, §11 variant gap, §14 risks, §15 readiness addendum).
- Proven client-level pattern: `docs/briefs/ppp-slice1a-data-contract-validation.md`
  (RPC signature, security checks 12–18, `evidence_maturity` labels, `detail_payload` whitelist).
- Related: `docs/briefs/aci-slice-c-contract-validation-warn-only-brief.md`;
  `docs/dashboard/operator-journey-ia-v1.md` (separate `invegent-dashboard` repo).
- Live objects read by the future contract (read-only): `t."5.3_content_format"`,
  `t.platform_format_mix_default`, `t.format_synthesis_policy`, `t.format_quality_policy`,
  `t.class_format_fitness`, `m.post_render_log`, `m.post_publish`.
