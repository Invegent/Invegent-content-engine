# Brief 011 — Execution Result

**Date:** 11 April 2026 (executed) | 12 April 2026 (reconciliation confirmed)
**Executed by:** Claude Code autonomous execution + follow-up chat session migration
**Reconciliation:** Full DB verification run 12 Apr 2026 — all 7 checks pass

---

## Task Results

| Task | Description | Status |
|---|---|---|
| 1 | Portal callback redirect /inbox → / | ✅ COMPLETED — confirmed in portal repo |
| 2 | Audit trail columns on m.post_draft | ✅ COMPLETED — 4/4 columns verified |
| 3 | NDIS provider fields on c.client | ✅ COMPLETED — 2/2 columns + CFW updated |
| 4 | require_client_approval on c.client_publish_profile | ✅ COMPLETED — 1/1 column verified |
| 5 | c.client_brand_profile extraction columns | ✅ COMPLETED — follow-up migration (table pre-existed) |
| 6 | NDIS taxonomy tables (4 tables) | ✅ COMPLETED — 4/4 tables verified |
| 7 | Immutable published post triggers | ✅ COMPLETED — 2/2 triggers verified |
| 8 | k schema registry refresh + purposes | ✅ COMPLETED — 144 tables documented |
| 9 | Result file + commits | ✅ COMPLETED |

---

## Task 5 Detail

c.client_brand_profile already existed as the full AI/brand profile table with brand voice,
persona, model settings, and existing columns: brand_logo_url, brand_colour_primary,
brand_colour_secondary. Claude Code correctly flagged this ambiguity rather than overwriting.

Follow-up migration added 6 missing extraction-specific columns:
- logo_storage_path TEXT
- logo_extraction_method TEXT (check: scraped | uploaded | manual)
- accent_hex TEXT
- extraction_confidence NUMERIC(3,2)
- website_scraped_at TIMESTAMPTZ
- updated_by TEXT

Column name mapping for brand-scanner Edge Function to use:
- brand_logo_url → public URL (existing column)
- brand_colour_primary → primary hex (existing column)
- brand_colour_secondary → secondary hex (existing column)
- accent_hex → new
- logo_storage_path → new (Supabase Storage path)
- logo_extraction_method → new
- extraction_confidence → new
- website_scraped_at → new
- updated_by → new
- updated_at → existing

---

## New Tables Created

| Table | Schema | Rows | Purpose |
|---|---|---|---|
| ndis_registration_group | t | 0 | NDIA registration groups reference data |
| ndis_support_item | t | 0 | NDIS support catalogue ~900 items |
| client_registration_group | c | 0 | Client → group junction |
| client_support_item | c | 0 | Client → item junction with client_description |

Data load for NDIS tables is a separate task — requires NDIA Excel file from ndia.gov.au.

---

## Commits

- invegent-portal: portal callback redirect fix
- Invegent-content-engine: decisions D084-D088, sync_state, phases, brief 011
- Invegent-content-engine: brief_011_result.md (this file)

---

## What Brief 011 Unlocks

- Portal magic link now lands on home page, not inbox
- Every future draft approval permanently records who + when + compliance scores
- Care for Welfare correctly flagged as NDIS registered provider
- External client onboarding can set require_client_approval=true
- brand-scanner Edge Function has a fully specified schema to write to
- NDIS taxonomy tables ready for NDIA catalogue data load
- Published posts and publish records protected from deletion — permanent audit trail
- k catalog fully current at 144 documented tables
