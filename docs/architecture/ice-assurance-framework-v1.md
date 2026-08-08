# ICE Assurance Framework v1 (durable)

**Status:** FROZEN 2026-08-08 — **ICE Assurance Framework v1** (PK conditional-sequence ratification; external-review chain recorded in the lane record/commit). **This document is the STABLE framework** — it changes only by PK ratification. Audit *results* are dated, versioned observations and live in separate snapshot documents (first: `ice-assurance-baseline-v1.md`, snapshot date 2026-08-08). Current inventories (seam register contents, agent census) live in the snapshot, so ordinary architecture evolution never requires framework ratification. Resolving a finding never obsoletes this framework; it updates the next snapshot.

**Operating rule (the assurance contract):**
> Every architecture component and seam has a known audit-coverage state. A system change invalidates the affected audit cells. Recurring deterministic checks detect drift; read-only agents classify ambiguous findings; PK decides policy. Approval, promotion, deploy, and enforcement are never automated.

---

## 1. The nine architecture domains (L1)

| # | Domain | Scope |
|---|---|---|
| D1 | Content Production Spine | ingest → pool → slotting → draft → render → approve → queue → publish → learn |
| D2 | Capability & Scheduling Authority | capability declaration + classification + enforcement (S7/S9), schedule/format authority chain |
| D3 | Creative & Asset Governance | Creative Library, template families/graduation, asset/music/background governance, harvest intake |
| D4 | Distribution & Publishing | per-platform publishers, queue + bypass paths, publish truth |
| D5 | Observability & Health | sentinels/healers, R0 views, drift probes, watches |
| D6 | Governance & Orchestration | agent team, gates, CCF contracts, helpers/hooks, external review, registers |
| D7 | Dashboard & Operator Surface | invegent-dashboard operator surfaces and their CE contracts |
| D8 | Security & Authorization | roles, grants, RLS, secrets, EF perimeter, confinement |
| D9 | External Integrations | render/publish/AI/email/webhook vendors and their identities |

L2 subsystems and L3 components under each domain are enumerated in the current architecture snapshot (cartographer-generated, citation-grounded). The domain set is stable; L2/L3 membership updates with each snapshot.

## 2. The twelve audit lenses

L1 Strategic · L2 Architectural · L3 Technical · L4 Flow · L5 Capability · L6 Data/Contract · L7 Governance/Authorization · L8 Failure/Recovery · L9 Evidence/Observability · L10 Operator Truth · L11 Scale/Portability · L12 Cost/Performance.

## 3. Verdict semantics

Per architecture × lens cell: **PASS** (evidence supports health) · **PARTIAL** (works with named defects/caveats) · **FAIL** (lens objective not met, evidence cited) · **UNKNOWN** (not verifiable with the access used — a legitimate finding, never silently PASS) · **N/A** (lens does not apply). Every non-PASS cell names its evidence and the existing finding/programme item that covers it, or states NEW.

## 4. The seam-audit requirement (durable)

**Seams are audited explicitly, not only the components they join.** Every snapshot MUST maintain the current seam register — internal seam classes plus the external-vendor seams — with each seam carrying endpoints, channel, auth model, failure behaviour, and its audit-coverage state. Adding, retiring, or re-verdicting seams is ordinary snapshot evolution and needs no framework ratification; what is durable is this requirement itself and the register's required fields. (Current inventory: snapshot §2 — 14 internal seam classes as of 2026-08-08.)

## 5. Finding-register federation model

- `docs/00_action_list.md` §Active — the operational queue of open findings (F-*/SEC-*).
- `docs/audit/open_findings.md` — the audit-loop register (severity rubric, closure types, no-auto-close).
- Assurance snapshots (AB-*) — dated observations; each AB entry MUST name the existing item that covers it or mark itself NEW; NEW items graduate into one of the two registers, never into a third.
- A deterministic federation check (Register-Generator class, Governor §7) reconciles counts across the registers; divergence is a finding, not a reconcile-by-hand.

## 6. Audit-execution taxonomy (deterministic → agent → human)

1. **Deterministic recurring checks** (scripts/SQL, no LLM; Governor MUST-contract: stateless, read-only, recompute-from-source, idempotent, never decides): the snapshot's §6.1 list is the live backlog (skip/throughput threshold · capability drop surface · ledger⟷git diff · bundle-hash parity · cron coverage · register federation · secret hygiene · untracked-cited files · view blind-spot regression · template-governance coverage · stale-citation lint).
2. **Recurring agent audits** (read-only classification): register-reconciler · ice-architecture-cartographer (snapshot + diff-vs-prior = architectural drift detector) · creative-graph-auditor · deploy-verifier · apply-harness-auditor (shadow) · dashboard-ia-lint (candidate).
3. **Periodic human/PK audits** (never automated): strategic review · risk-register refresh + decision-sunset sweep · capability/product policy elections · cost-lens stand-up decision · all existing PK gates.

Escalation: deterministic check trips → agent classifies (benign/material/critical, Governor drift taxonomy) → material/critical surfaces to PK. A check that false-STOPs on benign drift is rejected (Governor §1).

## 7. Cell-invalidation rule

A change to a component or seam marks its row/column cells STALE in the coverage ledger until re-verdicted by the responsible check tier. The coverage ledger (per-cell: verdict · verdict date · invalidated-by) is the artifact a future dashboard surface renders as domain-level health (e.g. "Capability health — RED · Architecture assurance — N% current / M cells UNKNOWN").

## 8. Registered-agent census convention (durable)

Counts of registered agents in assurance documents must state the split explicitly — proven/active vs shadow vs candidate — never a bare total. The current census itself lives in the dated snapshot (headline §0), not here; census changes are snapshot updates.
