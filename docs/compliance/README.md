# ICE Compliance Framework

## What This Folder Is

This folder contains the compliance rules that govern what ICE generates for clients operating in regulated verticals. It is the canonical source for compliance knowledge in the system.

These documents are human-authored and human-reviewed. They are not generated automatically. The rules here are inserted into every AI generation call for clients in the relevant vertical.

---

## How It Works in the System

```
docs/compliance/ndis_content_rules.md
       ↓
t.5.7_compliance_rule (database rows, seeded from this file)
       ↓
ai-worker assembles system prompt:
  [vertical compliance block from t.5.7_compliance_rule]
  + [client brand voice from c.client_ai_profile]
       ↓
Claude generates content
```

The compliance block is shared across all clients in the same vertical. If the NDIS Code of Conduct changes, update this file and the database rows — every NDIS client immediately benefits.

---

## Files in This Folder

| File | Purpose |
|---|---|
| `ndis_code_of_conduct.md` | Extracted relevant obligations from the NDIS Code of Conduct (source document) |
| `ndis_practice_standards.md` | Relevant Practice Standards sections (source document — needs Centro Assist input) |
| `ndis_content_rules.md` | **THE OPERATIONAL FILE** — the actual writing rules injected into ai-worker |
| `policy_sources.json` | URLs monitored monthly for changes |
| `CHANGELOG.md` | Audit trail — every review logged here |

---

## How to Update Rules

1. A policy change is detected (monthly cron alert OR notification from NDIS Commission)
2. Review the change against `ndis_content_rules.md`
3. If rules need updating: edit `ndis_content_rules.md` and the corresponding rows in `t.5.7_compliance_rule`
4. Log the update in `CHANGELOG.md` with date, what changed, and who reviewed
5. Commit to GitHub — the commit is the audit trail

**Never update the DB without updating this file first. This file is the source of truth.**

---

## Who Is Responsible

Parveen Kumar (pk@invegent.com) — NDIS Plan Manager, administrator for Care for Welfare.
All compliance rule changes require PK review and sign-off before database update.

---

## Verticals Covered

| Vertical | Status | Primary Source |
|---|---|---|
| NDIS (Australia) | 🟡 Draft — in progress | NDIS Code of Conduct 2018, Practice Standards, PK operational experience |
| Property (Australia) | ⬜ Not started | ASIC, RBA, state fair trading legislation |
| Aged Care (Australia) | ⬜ Future | Aged Care Quality Standards |
