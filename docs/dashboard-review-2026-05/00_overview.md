# ICE Dashboard Architecture Review — Overview

## Purpose

This is the source-of-truth document for the ICE Dashboard architecture review formally kicked off on 2026-05-04. It captures the locked foundational decisions, the agreed final-form information architecture, the 11-section review structure that drives the rest of this folder, deferred open decisions, and where the document lives across both repos.

It is documentation only. Nothing in this folder deploys.

---

## Locked foundational decisions (PK, 2026-05-04)

1. **Strategic renovation, staged migration.** The dashboard is being designed from first principles. Existing pages are evidence and source material — neither sacred nor disposable. Implementation is staged migration, not a big-bang rewrite.

2. **Multi-channel: Brief + alerts on Telegram only; web is primary for everything else.** No mobile inbox, no voice approval flows, no Telegram-driven decisions. Web is the workspace. Non-web channels are the nudge.

3. **Agents as status surface, not full-colleague framing (MVP).** Each agent gets a status card on Overview and a section in Investigate. Exception items feed Inbox naturally. NO calibration UI, NO threshold tuning, NO simulator, NO agent profile pages as MVP. Defer "colleague" framing to v2.

---

## Final-form IA (locked)

Six top-level sections, ~18 nav items.

```
NOW          (3): Overview, Inbox, Pipeline
CLIENTS      (4): All Clients, Feeds, Onboarding, Connect
CREATE       (2): Content Studio, Formats
INVESTIGATE  (4): Flow, Pipeline Log, Visual Pipeline, Agents
REPORTS  (1 nav, 3 tabs): Performance + Costs + Calibration
ADMIN        (4): Reviews, Compliance Rules, Subscriptions, Roadmap
```

Rationale for splits where one current page becomes two:

- **Compliance** splits into rule editor (Admin) and review-queue items that feed Inbox. Two products in one page today.
- **Performance** splits into ops Performance (Reports tab) and agent **Calibration** (separate Reports tab). Two products.
- **Visuals** splits into visual creation (Create) and Visual Pipeline log (Investigate). Two products.

---

## 11-section review structure

Adapted from Reviewer 1's framework. Effort estimate ~9–10h chat work spread across 3 sessions; code work follows agreed §6 + §10.

| § | Section | Effort | Target file |
|---|---|---|---|
| 1 | Current-state inventory | ~1.5h | `01_current_state_inventory.md` |
| 2 | Operator workflow map (PK's Tuesday rhythm) | ~1h | `02_operator_workflow.md` |
| 3 | Decision criteria | ~30 min | `03_decision_criteria.md` |
| 4 | IA option comparison (5 options scored) | ~1h | `04_ia_option_comparison.md` |
| 5 | Recommended target IA | ~30 min | `05_target_ia.md` |
| 6 | Page-by-page fate table | ~2h | `06_page_fate.md` |
| 7 | Brief + Telegram channel plan | ~30 min | `07_brief_telegram_plan.md` |
| 8 | Layer 1/2 boundary (dashboard vs portal) | ~30 min | `08_layer_boundary.md` |
| 9 | New product objects (`m.attention_item`, agent status, scope primitive) | ~1h | `09_new_product_objects.md` |
| 10 | Migration sequence | ~1h | `10_migration_sequence.md` |
| 11 | Risks + open decisions | continuous | `11_risks_open_decisions.md` |

File slugs above are conventions for this folder; deviation is fine if a section needs to split or merge.

---

## Deferred open decisions (5)

Held for the §3 Decision Criteria conversation. Captured here as the standing list — provisional positions are NOT locked.

1. **Agent integration shape** — agents as overlays on operational pages vs dedicated section under Investigate. Provisional: status cards on Overview + section in Investigate.
2. **Pipeline state-machine surface** — replace existing Queue page with a state-machine view, or keep both as complementary surfaces. Provisional: Now > Pipeline reframes Queue.
3. **Reviews placement** — own top-level section vs nested under Admin. Provisional: Admin > Reviews.
4. **Roadmap fate** — keep in dashboard under Admin / split to a separate deployment / demote to markdown-only. Provisional: Admin > Roadmap.
5. **Layer 1/2 boundary** — Performance for clients goes to portal (Layer 2); ops Performance stays in dashboard (Layer 1). Boundary needs §8 work to confirm shape.

---

## Document location and cross-link plan

LOCKED 2026-05-04:

- **Source-of-truth (this folder):** `Invegent-content-engine/docs/dashboard-review-2026-05/`
- **Pointer doc** (to be created when §1 + §2 are stable): `invegent-dashboard/docs/architecture-review/README.md` — short pointer + link to this folder. Not yet created. Creating it requires touching the dashboard repo and is deferred until the review's shape is firm enough to be worth pointing at.
- **Kickoff session record:** `Invegent-content-engine/docs/runtime/sessions/2026-05-04-dashboard-architecture-review-kickoff.md`
- **Per-session work logs:** continue to be appended in `Invegent-content-engine/docs/runtime/sessions/`

When §6 (page-by-page fate) is finalised, fate decisions that drive code work will be reflected in `invegent-dashboard/docs/architecture-review/` as actionable migration notes alongside the pointer.

---

## Reading order

1. `00_overview.md` (this file) — orientation
2. `01_current_state_inventory.md` — what exists today
3. (sequential through to §11 as authored)

---

## Status

- Kickoff: ✅ COMPLETE (2026-05-04)
- §1 Current-state inventory: 🟡 IN PROGRESS — initial draft committed this session
- §2 – §11: ⬜ NOT STARTED
- v1 implementation: gated on §6 (page fate) + §10 (migration sequence) being agreed

---

*Created 2026-05-06 (Sydney). Owner: PK + chat. No changes from this folder deploy — it is documentation only. Inputs sourced from `docs/runtime/sessions/2026-05-04-dashboard-architecture-review-kickoff.md`.*
