# Compliance Framework Changelog

Every review, update, and sign-off is logged here. This is the audit trail.

Format: `[Date] — [What changed] — [Who reviewed] — [Status]`

---

## 2026-03-20 — v1.0: All rules document-sourced, pending items resolved

**What:** Complete rewrite of `ndis_content_rules.md` to v1.0.
All [PK REVIEW NEEDED] sections replaced with content sourced directly
from official NDIS documents. No opinion or operational experience used.

**Documents reviewed:**
- Code-of-Conduct-Provider-Guidance.pdf (April 2024)
- Code-of-Conduct-Worker-Guidance.pdf (April 2024)
- ndis-practice-standards-and-quality-indicators.pdf (Version 4, November 2021)
- NDIS004_FFT Fact Sheet Managing the risk of fraud V4.pdf (November 2024)
- 5818 - NDIS Commission - Fair pricing fact sheet.pdf
- Price-differentiation-participants.pdf
- Price-differentiation-providers.docx
- NDIS important links.docx
- PB ER Guide to Plan Management PDF.pdf

**Rules updated:**
- Rule 2.4: Rewritten from CoC Provider Guidance paras 47-50 (professional registration scope)
- Rule 2.5: Rewritten from Practice Standards Early Childhood Module — Evidence-Informed Practice outcome (p.34)
- Rule 4.2: Rewritten from Practice Standards Specialist Support Coordination Module — Conflict of Interest outcome (p.37) + Provider Guidance paras 58-60
- Rule 5.3: Rewritten from Provider Guidance paras 61-64 (sharp practices) + Price Differentiation Guide
- Rule 5.4: New rule added from NDIS Fraud Factsheet November 2024

**Source documents added to file system:**
- `ndis_practice_standards.md`: Early Childhood and Support Coordination modules documented
- `ndis_code_of_conduct.md`: Sharp practices, conflict of interest, fair pricing, fraud sections added
- `policy_sources.json`: Added `ndis_code_of_conduct_fraud` URL

**Who reviewed:** Claude from NDIS documents in C:\Users\parve\Downloads\NDIS docs
**Status:** Active — ready for DB update and ai-worker activation
**DB update required:** Yes — update 4 inactive rules + add Rule 5.4 in t.5.7_compliance_rule

---

## 2026-03-20 — Initial structure created

**What:** Framework skeleton created. Files: README.md, ndis_code_of_conduct.md (skeleton),
ndis_practice_standards.md (skeleton), ndis_content_rules.md (v0.1 partial draft),
policy_sources.json (5 URLs), CHANGELOG.md.

**Who:** Claude (initial draft from public website sources)
**Status:** Superseded by v1.0 above.

---

## Template for future entries

```
## [YYYY-MM-DD] — [Brief description]

**Trigger:** [What prompted this review — policy URL change, NDIS Commission announcement, etc.]
**What changed:** [Which rules were updated and why]
**Source document:** [Exact document name, section, paragraph]
**Who reviewed:** [Name + date]
**Status:** Active / Draft
**DB updated:** Yes/No — [which rule_keys in t.5.7_compliance_rule were updated]
```
