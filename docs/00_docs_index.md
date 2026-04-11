# ICE — Documentation Index
## Last updated: 11 April 2026

This is the reading map for the `/docs` folder. Every document is listed with its purpose and when to read it. The folder has grown to 20+ files — this index prevents getting lost.

---

## ALWAYS READ FIRST

| File | Purpose | When |
|---|---|---|
| `00_sync_state.md` | Live system state — deployed versions, pipeline health, what is next | **Every session, before anything else** |

---

## STRATEGY LAYER — read when orienting or making a decision

| File | Purpose |
|---|---|
| `20_vision.md` | What Invegent is, where it is going, what it will never become, north star metric |
| `21_business_plan.md` | Market sizing, business model, unit economics, SaaS transition criteria, funding position |
| `22_product_charter.md` | What ICE builds, what it doesn't, how to decide on scope, video pipeline layers, vertical rules |
| `23_legal_register.md` | All legal issues tracked — L001–L008, status, owner, deadline |
| `05_risks.md` | Risk register — 9 risks, current status, monthly review checklist |

---

## TECHNICAL LAYER — read when building

| File | Purpose |
|---|---|
| `03_blueprint.md` | Full technical architecture — stack, schema map, pipeline flow, the four agents |
| `04_phases.md` | Phase deliverables with status — what is done, what is planned, done criteria |
| `06_decisions.md` | Architecture decisions log — D001–D083+. Every significant decision recorded here with reasoning |
| `02_scope.md` | Product scope — the four content types, signal sources, platforms, what ICE does not do |

---

## OPERATIONAL LAYER — read when running the business

| File | Purpose |
|---|---|
| `07_business_context.md` | Founder context, the three businesses, 90-day action plan, unit economics |
| `08_product.md` | Product details |
| `09_client_onboarding.md` | Full client onboarding SOP — step by step process for new clients |
| `10_pricing.md` | Pricing tiers, tier definitions, add-on structure |
| `11_sales_playbook.md` | Sales approach, target client profile, conversation structure |
| `secrets_reference.md` | All credentials, API keys, and environment variable locations |

---

## RESEARCH & AUDIT — read when evaluating

| File | Purpose |
|---|---|
| `10_consultant_audit_april_2026.md` | Four-lens independent audit — product, business, legal, technology |
| `video/00_video_pipeline_research.md` | Deep research on video tools, pricing, tech stack, market opportunity |
| `12_project_handoff.md` | Full project handoff document — use when starting fresh in a new Claude session |
| `Invegent_Privacy_Policy.md` | Live privacy policy for Meta App Review |

---

## FOLDER STRUCTURE

```
docs/
├── 00_sync_state.md          ← READ EVERY SESSION
├── 00_docs_index.md          ← this file
├── 20_vision.md              ← strategy
├── 21_business_plan.md
├── 22_product_charter.md
├── 23_legal_register.md
├── 05_risks.md
├── 03_blueprint.md           ← technical
├── 04_phases.md
├── 06_decisions.md
├── 02_scope.md
├── 07_business_context.md    ← operational
├── 08_product.md
├── 09_client_onboarding.md
├── 10_pricing.md
├── 11_sales_playbook.md
├── 12_project_handoff.md     ← handoff
├── secrets_reference.md
├── Invegent_Privacy_Policy.md
├── 10_consultant_audit_april_2026.md
├── video/
│   └── 00_video_pipeline_research.md
├── alerts/
├── briefs/           ← Claude Code task briefs
├── build-specs/
├── compliance/
├── cowork/
├── iae/
├── migrations/
├── quality/
└── skills/
```

---

## Session startup reading order

**For a regular technical build session:**
1. `00_sync_state.md` (always)
2. `06_decisions.md` (last few entries for recent decisions)
3. Relevant brief in `briefs/` if one exists

**For a strategy or planning session:**
1. `00_sync_state.md`
2. `20_vision.md`
3. `22_product_charter.md`
4. `04_phases.md`

**For a new Claude instance with no memory:**
1. `00_sync_state.md`
2. `12_project_handoff.md`
3. Then the technical or strategy layer as needed
