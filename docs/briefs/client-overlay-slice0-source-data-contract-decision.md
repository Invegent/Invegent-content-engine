# Client Overlay — Slice 0 source / data-contract decision brief

> **Status:** Slice 0 **decision / design only**. **No implementation.** No DB tables, no RPCs, no
> migration, no `execute_sql`, no grant change, no dashboard UI, no editable controls, no write RPC,
> no GFCP/PPP/Creative-Library/runtime change, no deploy, no production mutation.
> **Produced:** 2026-06-29 (CE session). **Type:** docs/brief only.
> **CE state at write time:** `main == origin/main == 0cc313d68e3f95594b620b0748183de313f813fc`;
> register **v4.20** current.
> **Priority note:** this is **Option A — Client Overlay first**. **Format Variant Intake is
> PAUSED** (its v0 design + Slice 0 decisions are landed docs-only at register v4.20; no further
> variant work proceeds under this lane). The Client Overlay variant layer stays `not_modelled`,
> consistent with that pause.

---

## 1. Purpose

Connect the two live, proven read surfaces — the **Global Format Capability Pyramid (GFCP)** and the
**Client Publishing Plan Pyramid (PPP)** — into a single **read-only Client Overlay** that answers,
for one selected client, **"what formats/platforms can they safely use *right now*?"** by combining
**global capability** (what ICE can support/prove) with **client enablement** (what this client has
enabled/enrolled). It is the base→overlay join both surfaces were designed to support: GFCP = the
global base, PPP = the client adoption layer.

## 2. Product question

**For a selected client, what (platform × format) pairs are safe/enabled/proven, enabled-but-
globally-risky, globally-proven-but-client-disabled, blocked, conflicted, not-modelled, or
needs-setup?** The overlay must let an operator tell a **global capability gap** ("ICE can't do this
at all") apart from a **client adoption gap** ("this client hasn't turned it on") — at a glance, per
cell.

## 3. Existing source contracts (both live, proven, read-only)

| Contract | Grain | Key fields the overlay consumes |
|---|---|---|
| `public.get_global_format_capability_pyramid(p_platform text, p_ice_format_key text, p_include_variants boolean)` (GFCP Slice 1A, register v4.19) | client-**agnostic**, platform × format (4×13 = 52 cells) | `global_support_state`, `platform_support`, `render_path_status`, `publisher_path_status`, `creative_library_status`, `evidence_maturity`, `blocked_reasons[]`, `diagnostics[]` |
| `public.get_publishing_plan_pyramid(p_client_id uuid)` (PPP Slice 1A, register v4.14) | **client-specific**, platform × format | `client_summary.format_mix_control` (enrolled/mode/approval), `format_matrix[]` cells: `eligibility_state` (active/available/off/blocked), `client_format_enabled`, `mix_source`, `enrollment_status`, `evidence_maturity`, `blocked_reasons[]`; `schedule_summary[]` |

Both are **SECURITY DEFINER, STABLE, service_role-only EXECUTE** (anon/authenticated/PUBLIC revoked),
called server-side via the dashboard service-role client, returning already-sanitised jsonb (no
secrets). They share the **same `(platform, ice_format_key)` key**, which is what makes a clean join
possible.

---

## 4. Proposed decisions (D-COV-1 … D-COV-6)

### D-COV-1 — v0 source model: **server-side merge of the two existing RPCs** (no new RPC)
**Recommended: YES.** Client Overlay v0 is assembled **server-side** (a dashboard server action /
data contract) by calling both existing RPCs and joining on `(platform, ice_format_key)`. **Do NOT
create a new DB object / RPC in v0.** A new backend overlay RPC is considered **only if** a later
performance or security review proves the two-call server-side merge is insufficient.
**Reason:** both sources are already proven, sanitised, service-role reads sharing the same key; a
server-side merge ships the overlay with **zero new production surface** (no migration, no grant, no
new SECURITY DEFINER object to review) — the lowest-risk path, consistent with how PPP Slice 1B and
GFCP Slice 1B already call their single RPCs server-side.

### D-COV-2 — overlay grain: **client × platform × format**
**Approved.** Each overlay row is one `(client, platform, ice_format_key)`. **Variant is NOT in the
v0 overlay** — Layer 3 is a `not_modelled` placeholder (deferred to the paused Format Variant Intake
lane). The overlay carries no per-variant rows.

### D-COV-3 — overlay status vocabulary
Each cell resolves to exactly one **`overlay_status`** (operator language), derived from the global
state + client state (§7):

- `ready_for_client` — client enabled + globally at least configured-and-enforceable, no conflict/block.
- `globally_proven_client_enabled` — the strongest ready: client enabled **and** globally `proven_in_production`.
- `client_enabled_global_conflict` — client enabled, but the global layers disagree (GFCP `conflict`).
- `client_enabled_global_unproven` — client enabled, but globally not yet proven (theory/configured/smoke) → caution/review.
- `globally_available_client_disabled` — globally proven/available but the client has it off/not-enrolled → **setup opportunity, not an error**.
- `globally_blocked` — global hard block / platform-unsupported → not available for **any** client (overrides client state).
- `client_blocked` — globally fine, but a client-side prerequisite is missing (publisher path off, policy gap, not enrolled).
- `needs_client_setup` — globally available but the client has **no config at all** for the pair.
- `not_modelled` — no backing model (the variant Layer-3 placeholder; never applied to a platform×format cell).
- `conflict_review_required` — surfaced for reconciliation (global conflict and/or global-vs-client disagreement) — review, not auto-fix.

### D-COV-4 — source precedence (how global + client truth combine)
**Approved precedence (highest first):**
1. **Global hard block overrides client enablement** — if GFCP says `blocked` / platform-unsupported, the cell is `globally_blocked` regardless of client enablement (a client cannot enable what ICE cannot do).
2. **Global conflict → review warning** — GFCP `conflict` surfaces as `conflict_review_required` (or `client_enabled_global_conflict` if the client also enabled it); never silently resolved.
3. **Client disabled / enrolled-off → not available for that client** even if globally proven → `globally_available_client_disabled` (a *setup opportunity*, not an error).
4. **Client enabled + globally proven → `globally_proven_client_enabled`** (ready).
5. **Client enabled + globally unproven → `client_enabled_global_unproven`** (caution/review).
6. **Globally proven + client disabled → setup opportunity** (`globally_available_client_disabled`), **not** an error.
The **GFCP cell set is the spine** (the global capability universe, 52 cells); PPP client cells are
left-joined onto it. A global cell with no client cell → `needs_client_setup` (if globally available)
or `globally_blocked` (if not).

### D-COV-5 — first UI placement: **inside the client context** (later: a client selector on Create → Format Capability)
**Recommended: Option 1 for v0** — surface the overlay **inside the existing Client / Schedule /
Publishing Plan context** (it answers *"for this client"*, so it belongs where the operator already
works a client). **Option 2** (a client-selector overlay on **Create → Format Capability**) and
**Option 3** (both) are **later**, gated. v0 chooses one: **client context.**

### D-COV-6 — no editable controls
**Confirmed.** v0 is **read-only** — no enable/disable/save/activate/dry-run controls, no write RPC.
The overlay *reports* the combined state; enabling/enrolling stays the client PPP / client-config
job, unchanged.

---

## 5. Proposed v0 merge model

```
selected client_id
  → call get_global_format_capability_pyramid()         (global spine: 52 platform×format cells)
  → call get_publishing_plan_pyramid(client_id)          (client matrix + enrollment + schedule)
  → join on (platform, ice_format_key); GFCP is the spine, PPP left-joined
  → derive overlay_status per cell (§7 precedence)
  → assemble overlay payload (§6)
```

Server-side only (dashboard service-role client); both calls are STABLE reads; the merge is pure
derivation (no mutation). No new RPC unless a later review proves the two-call merge insufficient
(D-COV-1).

## 6. Proposed overlay payload shape

| Key | Source | Notes |
|---|---|---|
| `contract_version` | new (`client_overlay.v0`) | |
| `generated_at` | server `now()` | |
| `client_summary` | PPP `client_summary` | client id/slug/name + `format_mix_control` (enrolled/mode/approval) |
| `overlay_summary` | derived | counts by `overlay_status`; ready/blocked/conflict/needs-setup tallies |
| `global_summary` | GFCP `global_summary` | carried for context (cells/platforms/formats/conflict count) |
| `overlay_matrix[]` | derived join | per `(platform, ice_format_key)`: `display_label`, `global_support_state`, `global_evidence_maturity`, `client_eligibility_state`, `client_format_enabled`, `enrollment_status`, **`overlay_status`**, merged `blocked_reasons[]`, merged `operator_actions[]`, `detail_payload` (whitelisted global + client safe fields only) |
| `diagnostics[]` | GFCP `diagnostics[]` (+ overlay-derived disagreements) | global conflicts carried; overlay may add global-vs-client disagreement notes |
| `variant_layer` | placeholder | `{ status: "not_modelled", note: "variant overlay deferred — Format Variant Intake paused" }` |
| `missing_model_pieces[]` | carried + overlay | e.g. `variant_capability_model_missing`, `client_overlay_canonical_model_absent` |
| `source_metadata` | new | records both source RPCs + versions + the merge being server-side |

Shape mirrors the proven GFCP/PPP cell+drawer contract so the dashboard can reuse rendering helpers.

## 7. Source precedence rules (derivation truth table — summary)

Let `G` = GFCP `global_support_state`, `C` = PPP client state (`client_format_enabled` + `eligibility_state` + `enrollment`).

| Global `G` | Client `C` | `overlay_status` |
|---|---|---|
| blocked / platform-unsupported | any | `globally_blocked` |
| conflict | enabled | `client_enabled_global_conflict` |
| conflict | disabled / none | `conflict_review_required` |
| proven_in_production | enabled (active) | `globally_proven_client_enabled` |
| configured/enforceable | enabled (active) | `ready_for_client` |
| smoke/configured/theory/policy/ungoverned | enabled | `client_enabled_global_unproven` |
| any non-blocked, proven/available | client-side prerequisite missing (publisher off / policy gap / not enrolled) | `client_blocked` |
| proven/available | disabled / off | `globally_available_client_disabled` |
| available | no client config row at all | `needs_client_setup` |
| (variant layer only) | — | `not_modelled` |

Precedence order is §4 (global hard block first; global conflict next; then client enablement vs
global proof). Honest empty states: a cell is never `ready` without both global proof/availability
**and** client enablement; absence maps to setup/unproven/blocked, never a false ready.

## 8. UI placement recommendation

**v0: inside the client context** (Client / Schedule / Publishing Plan tab) — the overlay answers
"for this client", reusing the selected-client context and the PPP read-only drawer pattern. It sits
as a distinct read-only section/sub-tab alongside (not replacing) the existing client PPP; the
existing PPP and schedule editor are unchanged. A **Create → Format Capability** client-selector
overlay (Option 2) is a later, separately-gated enhancement.

## 9. Security posture

- v0 adds **no new DB object and no new grant** — it composes two existing service-role RPCs
  server-side (D-COV-1). Both RPCs already revoke anon/authenticated/PUBLIC and grant `service_role`
  only; the merge runs in a dashboard server action via the service-role client.
- **No browser-direct RPC** — the browser receives only the already-merged, sanitised overlay
  payload; it never calls either RPC and never holds the service-role key.
- **No secrets** — both source payloads are pre-sanitised (no tokens/`destination_id`/`client.profile`/raw `render_spec`); the overlay carries a whitelisted `detail_payload` only and adds no new secret derivation.
- **If** a later review chooses a new overlay RPC, it mirrors the proven GFCP/PPP posture exactly
  (SECURITY DEFINER, owner postgres, STABLE, pinned search_path, schema-qualified, no dynamic SQL,
  service_role-only EXECUTE) and goes through the full db-rls-auditor / security / external / PK gate
  lane.

## 10. Non-goals (Slice 0 and v0)

- No new DB tables / RPCs / migrations / `execute_sql` / apply (D-COV-1 — server-side merge first).
- No alteration of `get_global_format_capability_pyramid` or `get_publishing_plan_pyramid`, or their grants.
- No editable / enable-disable / save / dry-run controls; no write RPC.
- No change to the client PPP, GFCP, schedule editor, Creative Library runtime JSON, render workers,
  publishers, Advisor, Content Studio, avatar/video/scene, cron/materialise.
- **No variant overlay** — Layer 3 stays `not_modelled` (Format Variant Intake is paused).
- No dashboard build in Slice 0; no deploy; no production data mutation.
- No Canonical Capability Model work (overlay informs, does not pre-empt it).

## 11. Risks / open questions

- **R1 — key-set alignment:** GFCP returns all 52 platform×format cells; PPP returns a client-specific
  matrix (e.g. ~44 for PP, filtered to platform-supported + config). Using GFCP as the spine and
  left-joining PPP is the honest default; cells present in only one source must map to a defined
  status (`needs_client_setup` / `globally_blocked`), never silently dropped. *(design at Slice 1A)*
- **R2 — blocked-vocabulary mapping:** GFCP `blocked_reasons` (`global_platform_block`/`policy_gap`/
  `render_path_gap`/`publisher_path_gap`) and PPP `blocked_reasons` (`platform_unsupported`/
  `format_policy_missing:*`/`publisher_path_unavailable`/`render_path_missing`) overlap but differ in
  spelling; the merge needs an explicit reason-mapping table so `globally_blocked` vs `client_blocked`
  is derived correctly. *(open — ratify the mapping at Slice 1A)*
- **R3 — two RPC calls per page load:** acceptable (both are fast STABLE reads), but is the input to
  the D-COV-1 "new RPC only if perf review proves needed" clause. *(carry)*
- **R4 — client selection model:** the overlay needs a `client_id` (uuid); the dashboard's
  `?client=<slug>` vs global-picker/localStorage mismatch (a pre-existing carry) must be resolved for
  the client-context placement. *(carry — pre-existing, not caused here)*
- **R5 — `overlay_status` count (10):** rich but possibly dense; Slice 1A may collapse display
  groupings (ready / caution / blocked / setup / review) while keeping the precise status underneath. *(open)*
- **R6 — Format Variant Intake paused:** variant overlay intentionally absent; the `not_modelled`
  Layer-3 placeholder must read as honest incompleteness, not a defect. *(constraint)*

## 12. Recommended next slice

**Client Overlay Slice 1A — server-side data-contract merge proof (read-only).** Prove, server-side
and read-only, that calling both RPCs for a real client (Property Pulse) and joining on
`(platform, ice_format_key)` yields a correct `overlay_matrix` with the §7 precedence + a ratified
reason-mapping (R2) and key-alignment (R1) — validated against live data with **zero mutation, no new
DB object** (mirroring how GFCP/PPP Slice 1A were validated as read-only SELECTs first). A read-only
**Slice 1B UI** (client-context section) follows only after the merge contract is proven and
reviewed. Each gated; read-only-first; never starting with editable controls. A new overlay RPC is
introduced **only** if Slice 1A's review proves the server-side merge insufficient.

---

## Verdict

**`READY_FOR_PK_REVIEW`** — both source contracts are live, proven, and share the `(platform,
ice_format_key)` key; the v0 merge model, grain, status vocabulary, precedence rules, payload shape,
UI placement, security posture, non-goals, and the gated next slice are specified, and the open
questions (R1 key alignment, R2 reason mapping, R4 client-selection model) are Slice-1A design items,
not Slice-0 blockers. No new inventory is required to take the source/contract decision (not
`NEEDS_MORE_INVENTORY`); nothing blocks the design (not `BLOCKED`).

---

## Cross-references

- GFCP: `docs/briefs/global-format-capability-pyramid-slice1a-backend-brief.md`,
  `…-slice1a-review-packet.md`, `…-slice1b-ui-brief.md`; registers v4.18–v4.20.
- PPP: `docs/briefs/ppp-slice1a-data-contract-validation.md`,
  `docs/briefs/publishing-plan-pyramid-inventory-brief.md`; registers v4.14–v4.16.
- Live source objects (read-only, unchanged): `public.get_global_format_capability_pyramid(text,text,boolean)`,
  `public.get_publishing_plan_pyramid(uuid)`.
- Format Variant Intake (PAUSED, context only): `docs/briefs/format-variant-intake-v0-proof-chain-design.md`,
  `docs/briefs/format-variant-intake-v0-slice0-decision-record.md`.
