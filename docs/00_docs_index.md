# ICE — Documentation Index
## Last updated: 2026-06-11 (T1 authority established: `architecture/current-ice-decision-tree.md`; `03_blueprint.md` pipeline/four-agents content demoted to historical for live production flow; prior: 2026-06-08 Stage 0 OBS foundation applied to the isolated OBS project)

This is the reading map for the `/docs` folder. Every document is listed with its purpose, when to read it, and a freshness/authority marker so any reader (human or AI) knows whether the doc is current truth or historical reference.

---

## AUTHORITY (T1) — current-state truth

T1 docs are the repo's authoritative current state. Hard cap: **≤4 T1 docs repo-wide.** A T1 doc is authoritative because it was verified against production on a dated check (`last_verified` header), not because it carries a 🟢. A T1 doc whose `last_verified` is >30 days old is not authoritative until re-verified.

| File | Covers | Status |
|---|---|---|
| `architecture/current-ice-decision-tree.md` | What ICE is · live production pipeline · current decision tree · decision ownership | T1 — `last_verified` 2026-06-11 |

**Promotion rule (mandatory):** every session completion report must include `Authority impact: none` OR `Authority impact: patch queued → {file}`.

T1 docs state truth. Session docs (`runtime/sessions/`) are **evidence, not authority**. `00_action_list.md` is a **task register, not truth-of-record**.

**🧭 Planning-docs ownership boundary.** Four planning docs each own one scope — do not conflate: product/implementation roadmap → `04_phases.md`; active task queue → `00_action_list.md`; sales-readiness gates → `15_pre_post_sales_criteria.md`; dashboard build/revamp plan → `docs/dashboard-review-2026-05/12_dashboard-revamp-master-plan.md`. Live truth-of-stack is always `00_sync_state.md`.

---

## How to read the freshness column

| Marker | Meaning |
|---|---|
| 🟢 **living** | Updated continuously. Always authoritative for what it covers. Read this first when its topic comes up. |
| 🔵 **reference** | Static or rarely-updated content. Authoritative when relevant, but rarely changes. |
| 🟡 **snapshot** | Point-in-time record. Useful for history, but always check the date before relying on it. |
| ⚫ **archived** | Superseded by another doc. Lives in `docs/archive/`. Look in archive for the original; use the successor for current state. |

When `living` and `snapshot` disagree, trust `living`.
When a T1 authority doc and any lower-tier doc disagree, trust T1.
When the DB disagrees with a T1 doc, that is a **staleness trigger** — log it and re-verify the T1 doc; it is not a reason to silently bypass the authority doc. (For non-T1 docs, the DB remains the better witness, but the divergence should still be reported.)

---

## ALWAYS READ FIRST

| File | Purpose | Freshness | When |
|---|---|---|---|
| `00_sync_state.md` | Live system state — deployed versions, pipeline health, what is next | 🟢 living | **Every session, before anything else** |
| `architecture/current-ice-decision-tree.md` | T1 — how ICE actually works today (pipeline + decision tree + ownership) | T1 authority | Any session touching pipeline behaviour; any fresh start |
| `00_docs_index.md` | This file — reading map for the docs folder | 🟢 living | Once per project, then when navigating an unfamiliar area |

---

## STRATEGY LAYER — read when orienting or making a decision

| File | Purpose | Freshness |
|---|---|---|
| `20_vision.md` | What Invegent is, where it is going, what it will never become, north star metric | 🔵 reference |
| `21_business_plan.md` | Market sizing, business model, unit economics, SaaS transition criteria, funding position | 🔵 reference |
| `22_product_charter.md` | What ICE builds, what it doesn't, how to decide on scope, video pipeline layers, vertical rules | 🔵 reference |
| `23_legal_register.md` | All legal issues tracked — L001–L008+, status, owner, deadline | 🟢 living |
| `05_risks.md` | Risk register — current status, monthly review checklist | 🟢 living |
| `15_pre_post_sales_criteria.md` | Definitive pre-sales gate (Section A) + post-sales tier 1/2/3 + parked items. Supersedes 14 (archived). | 🟢 living |

---

## TECHNICAL LAYER — read when building

| File | Purpose | Freshness |
|---|---|---|
| `architecture/current-ice-decision-tree.md` | **T1 authority — the live production pipeline and decision tree.** Read this, not the blueprint, for how ICE works today | T1 authority |
| `03_blueprint.md` | Founding technical architecture — stack rationale, schema map, taxonomy design. **⚠ Pipeline-flow and four-agents sections are HISTORICAL (digest-era) and superseded for live production flow by `architecture/current-ice-decision-tree.md`** | 🟡 snapshot (pipeline/agents) · 🔵 reference (stack/schema rationale) |
| `04_phases.md` | Phase deliverables with status — what is done, what is planned, done criteria | 🟢 living |
| `06_decisions.md` | Architecture decisions log — D001 through current. Every significant decision recorded with reasoning | 🟢 living |
| `02_scope.md` | Product scope — the four content types, signal sources, platforms, what ICE does not do | 🔵 reference |

---

## OPERATIONAL LAYER — read when running the business

| File | Purpose | Freshness |
|---|---|---|
| `07_business_context.md` | Founder context, the three businesses, 90-day action plan, unit economics | 🔵 reference |
| `08_product.md` | Product details | 🔵 reference |
| `09_client_onboarding.md` | Full client onboarding SOP — step by step process for new clients | 🟢 living |
| `10_pricing.md` | Pricing tiers, tier definitions, add-on structure | 🔵 reference |
| `11_sales_playbook.md` | Sales approach, target client profile, conversation structure | 🔵 reference |
| `12_project_handoff.md` | Full project handoff document — use when starting fresh in a new Claude session | 🟢 living |
| `secrets_reference.md` | All credentials, API keys, and environment variable locations | 🟢 living |
| `Invegent_Privacy_Policy.md` | Live privacy policy for Meta App Review | 🟢 living |

---

## RESEARCH & EVALUATION

| File | Purpose | Freshness |
|---|---|---|
| `video/00_video_pipeline_research.md` | Deep research on video tools, pricing, tech stack, market opportunity | 🔵 reference |

---

## ARCHIVE — historical snapshots (do NOT use for current state)

These files have been moved to `docs/archive/` because they were point-in-time snapshots that began to mislead any reader (human or AI) treating them as current. Each has an archive header at the top warning the reader.

| File | What it is | Replaced by |
|---|---|---|
| `archive/00_audit_report.md` | Frozen 6 Apr nightly audit — never overwritten because the Cowork reconciler stopped running | `00_sync_state.md` (current pipeline state) |
| `archive/10_consultant_audit_april_2026.md` | 8 Apr four-lens consultant audit | `15_pre_post_sales_criteria.md` Section A items A1–A26 (where the audit findings landed) |
| `archive/ICE_Pipeline_Audit_Apr2026.md` | Mid-April pipeline audit (40-row cron + 46-row EF tables) | Live DB state via `system-auditor` Edge Function or direct Supabase MCP query |
| `archive/14_pre_sales_audit_inventory.md` | 18 Apr raw reconciliation audit (38 items + 13 open questions) | `15_pre_post_sales_criteria.md` (file 15 explicitly states it supersedes 14) |

If you find yourself reading anything in `docs/archive/`, ask: do I need history, or am I looking for current state? If current state, go to the "Replaced by" doc instead.

---

## SUBDIRECTORIES

| Folder | Purpose |
|---|---|
| `architecture/` | **T1 authoritative current-state docs (≤4 cap).** `current-ice-decision-tree.md` = the live production pipeline and decision tree |
| `archive/` | Superseded snapshots. See above. |
| `alerts/` | Alert configurations and runbooks |
| `briefs/` | Claude Code task briefs (numbered + dated) |
| `build-specs/` | Detailed build specs for larger features |
| `build-specs/asset-policy-stage0/` | Asset Production Policy & Provider Routing — Stage 0 OBS (out-of-band shadow observer). **Stage 0 foundation APPLIED (2026-06-08) to the isolated OBS project only** (D-01 `fd3e519a` closed `completed`; production untouched; OBS isolated). F-precondition artefacts (schema concept, evidence-class lattice, 0A→0B transform contract, 0A lint config) + CCD build handoff. **0A observer/read-path still GATED** — requires a new concrete plan + new D-01 + PK exact-phrase approval. See the folder `00_README.md`. |
| `compliance/` | Compliance rules and reviews |
| `consent/` | Consent templates (avatar, photo, etc.) |
| `cowork/` | Cowork scheduled task definitions |
| `iae/` | Internal application docs |
| `incidents/` | Post-mortem documents (`YYYY-MM-DD-incident-name.md`) |
| `legal/` | Legal templates and pilot agreements |
| `migrations/` | Documentation about applied migrations |
| `process/` | ICE process docs (`ICE-PROC-NNN-*`) — operating rhythms / discipline frameworks. ICE-PROC-001 (patch severity), ICE-PROC-002 (pooled resolution). |
| `quality/` | Quality control logs and checks |
| `reviews/` | External reviewer outputs (digests, system audits) |
| `skills/` | Skill configurations |
| `video/` | Video pipeline research |

---

## FOLDER STRUCTURE

```
docs/
├── 00_sync_state.md                       🟢 READ EVERY SESSION
├── 00_docs_index.md                       🟢 this file
├── 01_README.md                           🔵
├── 02_scope.md                            🔵
├── 03_blueprint.md                        🟡 pipeline/agents historical — see architecture/ for live flow
├── 04_phases.md                           🟢
├── 05_risks.md                            🟢
├── 06_decisions.md                        🟢
├── 07_business_context.md                 🔵
├── 08_product.md                          🔵
├── 09_client_onboarding.md                🟢
├── 10_pricing.md                          🔵
├── 11_sales_playbook.md                   🔵
├── 12_project_handoff.md                  🟢
├── 15_pre_post_sales_criteria.md          🟢
├── 20_vision.md                           🔵
├── 21_business_plan.md                    🔵
├── 22_product_charter.md                  🔵
├── 23_legal_register.md                   🟢
├── Invegent_Privacy_Policy.md             🟢
├── secrets_reference.md                   🟢
├── index.html                             (GitHub Pages landing)
├── architecture/                          ★ T1 AUTHORITY
│   └── current-ice-decision-tree.md       T1 — live pipeline + decision tree (last_verified 2026-06-11)
├── archive/                               ⚫ historical snapshots
│   ├── 00_audit_report.md                 (was: docs/00_audit_report.md)
│   ├── 10_consultant_audit_april_2026.md  (was: docs/10_consultant_audit_april_2026.md)
│   ├── 14_pre_sales_audit_inventory.md    (was: docs/14_pre_sales_audit_inventory.md)
│   └── ICE_Pipeline_Audit_Apr2026.md      (was: docs/ICE_Pipeline_Audit_Apr2026.md)
├── alerts/
├── briefs/                                ← Claude Code task briefs
├── build-specs/
│   └── asset-policy-stage0/                ← Stage 0 OBS foundation applied (isolated OBS); 0A/read-path gated
├── compliance/
├── consent/
├── cowork/
├── iae/
├── incidents/
├── legal/
├── migrations/
├── process/                                ← ICE-PROC-NNN process docs
├── quality/
├── reviews/                               ← external reviewer digests + system audits
├── skills/
└── video/
```

---

## Session startup reading order

**For a regular technical build session:**
1. `00_sync_state.md` (always)
2. `architecture/current-ice-decision-tree.md` (if the session touches pipeline behaviour)
3. `06_decisions.md` (last few entries for recent decisions)
4. Relevant brief in `briefs/` if one exists

**For a strategy or planning session:**
1. `00_sync_state.md`
2. `20_vision.md`
3. `22_product_charter.md`
4. `04_phases.md`

**For a new Claude instance with no memory:**
1. `00_sync_state.md`
2. `architecture/current-ice-decision-tree.md` (how ICE actually works today)
3. `12_project_handoff.md`
4. Then the technical or strategy layer as needed

**For pre-sales gate review:**
1. `00_sync_state.md` (current operational state)
2. `15_pre_post_sales_criteria.md` (gate checklist)
3. `23_legal_register.md` (legal status)

---

## Index maintenance

This file should be updated whenever a doc is added, archived, or its freshness changes. Owners:
- **Living docs:** updated by the doc's owner whenever they change
- **Reference docs:** review every quarter; mark stale if material changes
- **Snapshot/archived:** never edited after the move; only re-archive new snapshots when they're created
- **T1 authority docs:** governed by their own `last_verified` contract (header of each T1 doc). A T1 doc past 30 days is not authoritative until re-verified. T1 changes are driven by the mandatory `Authority impact:` completion-report line.

Stale-marker rule: if a 🟢 living doc hasn't been updated in 30+ days and the system has changed materially, downgrade it to 🟡 snapshot or archive it.
