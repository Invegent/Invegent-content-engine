# Global Format Capability Pyramid — Slice 0 PK Decision Record

> **Type:** PK source-decision record (docs/decision-record only). **No implementation occurred.**
> **Recorded:** 2026-06-29 (CE session). **Decided by:** PK.
> **Decides against:** `docs/briefs/global-format-capability-pyramid-slice0-brief.md` (the Slice 0
> source-decision & contract brief, verdict `READY_FOR_PK_SOURCE_DECISION`).
> **CE state at record time:** `main == origin/main == f024150171bb5c134857eb113bc544528a865358`;
> register **v4.16** (→ v4.17 with this record). PPP Slice 1A RPC + Slice 1B client Pyramid +
> tooltip hotfix all shipped and registered.

---

## 0. Headline

**PK approves moving forward with the Global Format Capability Pyramid using a v0 layered evidence /
reconciliation model.**

**Critical framing (load-bearing — do not lose):**

- **This is NOT the final canonical source-of-truth architecture.**
- **Global Format Capability Pyramid v0 = an evidence-and-reconciliation view** — it reads the
  scattered, conflicting sources, stacks them as layered evidence, and *surfaces* disagreement. It is
  a reconciliation lens, **not** the permanent decision brain.
- **Future Canonical Capability Model v1 = a later, normalized source-of-truth architecture** —
  designed only *after* the v0 view has exposed enough real conflicts/gaps to justify the normalized
  tables/catalogs. Recorded as a forward carry (§3).

---

## 1. Approved decisions (D1–D5)

### D1 — Adopt the layered evidence model for v0
Approved. The v0 contract resolves each (platform × format) cell from a stack of independently
sourced layers:

- **declared support**
- **configured defaults**
- **governed readiness**
- **render proof**
- **publish proof**
- **Creative Library / contract proof where safe**
- **diagnostics / conflicts**

**Clarification (PK):** layered evidence is approved as the **v0 reconciliation model**, **not** the
permanent canonical decision brain. The layers reconcile and expose truth; they do not *become* the
normalized source of truth. That is Canonical Capability Model v1's job (§3).

### D2 — Slice 1A uses a new service-role-only SECURITY DEFINER RPC
Approved, **unless the Slice-1A security review blocks it** (then fall back to the server-action-only
assembly pattern). Expected future RPC:

```text
public.get_global_format_capability_pyramid(...)
```

Security posture mirrors the proven PPP Slice 1A RPC: SECURITY DEFINER, owner `postgres`, `STABLE`,
pinned `search_path = public, pg_temp`, schema-qualified, no dynamic SQL, EXECUTE revoked from
PUBLIC/anon/authenticated and granted only to `service_role`, dashboard server-side only, no
browser-direct call, no secrets, no raw `render_spec` dumps, safe `detail_payload` whitelist only.
**(Not created in this step — Slice 1A artifact.)**

### D3 — `publisher_path_status` v0 = evidence/inference with honest uncertainty
Approved. **Do not invent publisher certainty.** v0 derives publisher path status from
`m.post_publish` evidence + known publisher coverage, labelled honestly. Allowed labels include:

- `publisher_proven`
- `publisher_inferred`
- `publisher_unknown`
- `publisher_blocked`
- `publisher_unsupported`

A static publisher capability catalog remains a deferred future option, not v0.

### D4 — Creative Library / variant proof v0 = production-evidence-only where safe
Approved. v0 uses production render evidence (`render_spec.variant_key` from `m.post_render_log`)
only, where safe. Constraints:

- **Do not treat docs JSON (`docs/creative-library/*`) as runtime authority.**
- **Do not claim a full variant model exists.**
- Layer 3 (variant) remains **mostly `not_modelled`** until a real variant capability model exists
  (e.g. a future `c.client_format_variant_*` model).

### D5 — Page location: Create → Format Capability
Approved as recommended. **Reason (PK):** the surface is bigger than "Formats" and bigger than
"Creative Library" — it represents ICE capability across **platform, format, policy, render,
publish, proof, creative evidence, and diagnostics**, so it earns its own top-level capability
surface rather than being nested under either.

---

## 2. Status change this record effects

- Slice 0 source/contract decisions are **resolved** (D1–D5 approved).
- **Slice 1A may now be briefed** as a **read-only backend / data-contract slice** (the
  service-role read RPC `public.get_global_format_capability_pyramid(...)` + validation harness +
  db-rls-auditor / security / external review + PK apply gate) — mirroring the proven PPP Slice 1A
  lane. **Slice 1A is NOT implemented in this step** — only unblocked-to-brief.
- The v0 framing is **reconciliation/evidence**, explicitly **not** canonical source-of-truth.

---

## 3. Future architecture carry — Canonical Capability Model v1

**Carry added:** **Canonical Capability Model v1.**

**Purpose:** after the Global Format Capability Pyramid (v0 evidence/reconciliation view) has exposed
enough conflicts and gaps, design **normalized capability tables / catalogs** that can become the
**long-term source of truth** for:

- **Advisor** (format/platform recommendation)
- **Studio** (operator content creation surface)
- **client Publishing Plan Pyramid** (the client adoption/enrollment layer)
- **render eligibility** (which formats a render path can build)
- **publish eligibility** (which formats a publisher path can deliver)

**Sequencing:** v0 reconciliation view first (exposes the real conflicts) → then design v1 canonical
model from observed reality. Do **not** attempt the normalized canonical model before the v0 view has
surfaced the actual disagreement set. This carry is **future, PK-gated, not started.**

---

## 4. Explicit non-implementation

This record is **decision-capture only**. No code, no RPC, no migration, no DB mutation, no
`execute_sql`, no migration apply, no ledger backfill, no deploy, no dashboard-repo edit, no Slice 1A
implementation, no editable UI, no dry-run UI, no write RPC, no variant implementation, no
publisher/render/schedule/avatar/video/scene work, no Slice C proof, no Phase 1 post-fill
confirmation occurred.

---

## Cross-references

- Slice 0 brief: `docs/briefs/global-format-capability-pyramid-slice0-brief.md` (verdict
  `READY_FOR_PK_SOURCE_DECISION`; §13 open decisions = the D1–D5 resolved here).
- Proven pattern: `docs/briefs/ppp-slice1a-data-contract-validation.md`.
- Inventory grounding: `docs/briefs/publishing-plan-pyramid-inventory-brief.md`.
