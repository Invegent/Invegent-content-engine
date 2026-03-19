# Compliance Framework Changelog

Every review, update, and sign-off is logged here. This is the audit trail.

Format: `[Date] — [What changed] — [Who reviewed] — [Status]`

---

## 2026-03-20 — Initial structure created

**What:** Framework skeleton created. Files:
- `README.md` — how the framework works
- `ndis_code_of_conduct.md` — obligations extracted from NDISCC website (20 Mar 2026 version)
- `ndis_practice_standards.md` — structure only, content pending
- `ndis_content_rules.md` — v0.1 draft, sourced from public documents
- `policy_sources.json` — 5 URLs identified for monthly monitoring

**Who:** Claude (initial draft from public sources)
**Status:** DRAFT — not yet active in system. Requires PK review of all [PK REVIEW NEEDED] sections before activation.

**Pending before activation:**
- PK review of Rule Groups 4, 5 (operational experience sections)
- Centro Assist review for Rule 2.4 (OT scope) and 2.5 (early childhood)
- Test against 20 recent NDIS Yarns drafts
- ai-worker update to inject compliance block
- D041 committed to 06_decisions.md

---

## Template for future entries

```
## [YYYY-MM-DD] — [Brief description]

**Trigger:** [What prompted this review — policy URL change, NDIS Commission announcement, etc.]
**What changed:** [Which rules were updated and why]
**Source:** [URL or document that triggered the change]
**Who reviewed:** PK — [date]
**Status:** Active / Draft
**DB updated:** Yes/No — [which rule_keys in t.5.7_compliance_rule were updated]
```
