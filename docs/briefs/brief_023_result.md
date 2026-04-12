# Brief 023 Result — NDIS Support Catalogue Data Load

**Executed:** 12 April 2026
**Executor:** Claude Code (Opus 4.6)
**Supabase project:** mbkmaxqhsohbtwsqolns

---

## Task Results

| Task | Description | Status |
|------|-------------|--------|
| 1 | Verify pre-load state | COMPLETED |
| 2 | Parse Excel file | COMPLETED — 35 groups, 635 items |
| 3 | Load registration groups | COMPLETED — 35 upserted |
| 4 | Load support items in batches | COMPLETED — 631 unique items |
| 5 | Link CFW to 8 OT groups | COMPLETED — 8 rows inserted |
| 6 | Spot-check queries | COMPLETED |
| 7 | Drop loader functions | COMPLETED |
| 8 | Write result file | COMPLETED |

---

## Pre-load State

| Table | Before | After |
|-------|--------|-------|
| t.ndis_registration_group | 35 | 35 (upsert, no change) |
| t.ndis_support_item | 150 | 631 |
| c.client_registration_group | 0 | 8 |

## Item Count: 631 vs 635

The source Excel has 635 rows in the Current Support Items sheet. 4 rows have duplicate `item_number` values with different `effective_from` dates:
- `15_610_0118_1_3` (2 rows)
- `15_610_0128_1_3` (2 rows)
- `15_615_0118_1_3` (2 rows)
- `15_615_0128_1_3` (2 rows)

Since `item_number` is the PK, the upsert keeps the latest effective_from date. Result: 631 unique items.

## CFW Registration Group Links

| Group ID | Group Name | Source |
|----------|-----------|--------|
| 0104 | High Intensity Daily Personal Activities | inferred |
| 0106 | Assistance In Coordinating Or Managing Life Stages | inferred |
| 0107 | Daily Personal Activities | inferred |
| 0117 | Development Of Daily Living And Life Skills | inferred |
| 0118 | Early Intervention Supports For Early Childhood | inferred |
| 0127 | Management of Funding for Supports | inferred |
| 0128 | Therapeutic Supports (OT primary) | inferred |
| 0132 | Support Coordination | inferred |

## Spot-Check: OT Items (Group 0128)

Sample items from Therapeutic Supports:
- OT Assessment/Therapy: $193.99/hr
- Dietitian: $188.99/hr
- Exercise Physiologist: $166.99/hr
- Counsellor: $156.16/hr

Price distribution: 423 items with fixed price limits, 208 quotable (no cap).

## Cleanup

All 3 temporary loader functions dropped:
- load_ndis_registration_groups(jsonb)
- load_ndis_support_items(jsonb)
- link_cfw_registration_groups()
