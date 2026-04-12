# Claude Code Brief 023 — NDIS Support Catalogue Data Load

**Date:** 12 April 2026
**Status:** READY TO RUN
**Repo:** `Invegent-content-engine`
**Working directory:** `C:\Users\parve\Invegent-content-engine`
**Supabase project:** `mbkmaxqhsohbtwsqolns`
**MCPs required:** Supabase MCP
**Estimated time:** 30–45 min

---

## Context

The NDIS Support Catalogue 2025-26 v1.1 needs to be loaded into:
- `t.ndis_registration_group` — 35 rows (already loaded, idempotent upsert is safe)
- `t.ndis_support_item` — 635 rows (150 already loaded in batches 00-02, remainder needed)
- `c.client_registration_group` — link Care For Welfare to OT-relevant groups

Two SECURITY DEFINER loader functions already exist in the DB:
- `public.load_ndis_registration_groups(jsonb)` — upsert reg groups
- `public.load_ndis_support_items(jsonb)` — upsert support items

The Excel file is at:
`C:\Users\parve\Downloads\NDIS-Support Catalogue-2025-26 -v1.1.xlsx`

---

## Task 1 — Verify current state

```sql
SELECT
  (SELECT COUNT(*) FROM t.ndis_registration_group) AS reg_groups,
  (SELECT COUNT(*) FROM t.ndis_support_item) AS support_items,
  (SELECT COUNT(*) FROM c.client_registration_group) AS client_reg_groups;
```

Expected: reg_groups=35, support_items between 0-635 depending on
how much was loaded before. The upsert is safe to re-run everything.

---

## Task 2 — Parse the Excel file with Python

Use Windows MCP PowerShell to run a Python script that:
1. Reads `C:\Users\parve\Downloads\NDIS-Support Catalogue-2025-26 -v1.1.xlsx`
2. Extracts registration groups and support items from the `Current Support Items` sheet
3. Saves the data to temp JSON files

```python
import openpyxl, json

wb = openpyxl.load_workbook(
    r'C:\Users\parve\Downloads\NDIS-Support Catalogue-2025-26 -v1.1.xlsx',
    read_only=True, data_only=True
)
ws = wb['Current Support Items']
rows = list(ws.iter_rows(values_only=True))

# Registration groups
reg_groups = {}
for row in rows[1:]:
    if not row[0]: continue
    rg_id = str(row[2]).zfill(4) if row[2] else None
    rg_name = row[3]
    if rg_id and rg_id not in reg_groups:
        reg_groups[rg_id] = rg_name

rg_list = [{"registration_group_id": k, "group_name": v, "is_active": True}
           for k, v in sorted(reg_groups.items())]

# Support items
items = []
for row in rows[1:]:
    if not row[0]: continue
    rg_id = str(row[2]).zfill(4) if row[2] else None
    cat_num = int(row[4]) if row[4] else None
    cat_name = str(row[6]).strip() if row[6] else None
    unit = str(row[8]).strip() if row[8] else None
    start_raw = row[10]
    try:
        s = str(int(start_raw)) if isinstance(start_raw, (int, float)) else str(start_raw).replace('-','')
        effective_from = f"{s[:4]}-{s[4:6]}-{s[6:8]}"
    except:
        effective_from = '2025-07-01'
    price = None
    for col in [13, 12, 15, 16, 17, 18, 19]:  # NSW, ACT, QLD...
        if row[col] is not None:
            try: price = float(row[col]); break
            except: pass
    items.append({
        "item_number": str(row[0]).strip(),
        "registration_group_id": rg_id,
        "support_category_number": cat_num,
        "support_category_name": cat_name,
        "item_name": str(row[1]).strip() if row[1] else None,
        "price_limit_aud": price,
        "unit": unit,
        "is_active": True,
        "effective_from": effective_from
    })

with open(r'C:\Temp\ndis_rg.json', 'w') as f: json.dump(rg_list, f)
with open(r'C:\Temp\ndis_items.json', 'w') as f: json.dump(items, f)
print(f'reg_groups={len(rg_list)}, items={len(items)}')
```

Create `C:\Temp` if it doesn't exist. Run with:
```powershell
pip install openpyxl -q
python C:\Temp\parse_ndis.py
```

---

## Task 3 — Load registration groups (upsert, safe to re-run)

Read `C:\Temp\ndis_rg.json` and call via Supabase MCP:

```sql
SELECT public.load_ndis_registration_groups('<JSON_HERE>'::jsonb) AS loaded;
```

Expected result: 35

---

## Task 4 — Load support items in batches of 50

Read `C:\Temp\ndis_items.json`.
Split into batches of 50 items.
For each batch, call via Supabase MCP:

```sql
SELECT public.load_ndis_support_items('<BATCH_JSON>'::jsonb) AS loaded;
```

Run all 13 batches (635 items / 50 = 13 batches, last is 35).
The upsert is safe to re-run — ON CONFLICT DO UPDATE.
Verify after all batches:

```sql
SELECT COUNT(*) FROM t.ndis_support_item;
```

Expected: 635

---

## Task 5 — Link Care For Welfare to OT-relevant registration groups

Care For Welfare (client_id: `3eca32aa-e460-462f-a846-3f6ace6a3cae`) is
an occupational therapy / allied health practice. Link these groups:

```sql
-- Insert CFW registration group links
-- Using a SECURITY DEFINER function since c schema DML requires one
CREATE OR REPLACE FUNCTION public.link_cfw_registration_groups()
RETURNS integer SECURITY DEFINER SET search_path = public AS $$
DECLARE v_count integer := 0;
BEGIN
  INSERT INTO c.client_registration_group
    (client_id, registration_group_id, confirmed_by_client, inferred_from_profession)
  VALUES
    ('3eca32aa-e460-462f-a846-3f6ace6a3cae', '0107', false, true),  -- Daily Personal Activities
    ('3eca32aa-e460-462f-a846-3f6ace6a3cae', '0104', false, true),  -- High Intensity Daily Personal Activities
    ('3eca32aa-e460-462f-a846-3f6ace6a3cae', '0128', false, true),  -- Therapeutic Supports (OT primary)
    ('3eca32aa-e460-462f-a846-3f6ace6a3cae', '0118', false, true),  -- Early Intervention (EC)
    ('3eca32aa-e460-462f-a846-3f6ace6a3cae', '0117', false, true),  -- Development of Daily Living Skills
    ('3eca32aa-e460-462f-a846-3f6ace6a3cae', '0106', false, true),  -- Assistance Coordinating Life Stages
    ('3eca32aa-e460-462f-a846-3f6ace6a3cae', '0132', false, true),  -- Support Coordination
    ('3eca32aa-e460-462f-a846-3f6ace6a3cae', '0127', false, true)   -- Management of Funding (Plan Mgmt)
  ON CONFLICT (client_id, registration_group_id) DO NOTHING;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$ LANGUAGE plpgsql;

SELECT public.link_cfw_registration_groups();
```

Expected: 8 rows inserted.

Verify:
```sql
SELECT rg.group_name, crg.inferred_from_profession
FROM c.client_registration_group crg
JOIN t.ndis_registration_group rg ON rg.registration_group_id = crg.registration_group_id
WHERE crg.client_id = '3eca32aa-e460-462f-a846-3f6ace6a3cae'
ORDER BY rg.group_name;
```

---

## Task 6 — Sample spot-check queries

```sql
-- OT items for CFW (registration group 0128 = Therapeutic Supports)
SELECT item_number, item_name, price_limit_aud, unit
FROM t.ndis_support_item
WHERE registration_group_id = '0128'
ORDER BY item_name
LIMIT 10;

-- Price range across all current items
SELECT
  MIN(price_limit_aud) AS min_price,
  MAX(price_limit_aud) AS max_price,
  COUNT(*) FILTER (WHERE price_limit_aud IS NULL) AS quotable_count,
  COUNT(*) FILTER (WHERE price_limit_aud IS NOT NULL) AS price_limited_count
FROM t.ndis_support_item
WHERE is_active = true;
```

---

## Task 7 — Cleanup temporary loader functions

```sql
DROP FUNCTION IF EXISTS public.load_ndis_registration_groups(jsonb);
DROP FUNCTION IF EXISTS public.load_ndis_support_items(jsonb);
DROP FUNCTION IF EXISTS public.link_cfw_registration_groups();
```

---

## Task 8 — Write result file

Write `docs/briefs/brief_023_result.md` in Invegent-content-engine repo via GitHub MCP:
- Task 1: pre-load counts
- Task 2: Excel parse result (reg_groups=35, items=635 confirmed)
- Task 3: reg groups loaded
- Task 4: all 13 batches loaded, final count=635
- Task 5: CFW links inserted (count)
- Task 6: spot-check results (a few OT items, price range)
- Task 7: cleanup done
- Notes on any issues

---

## Error handling

- If openpyxl not installed: `pip install openpyxl`
- If `C:\Temp` doesn't exist: create it with `New-Item -ItemType Directory C:\Temp`
- If a batch fails with a JSON parse error, the issue is likely an apostrophe in
  an item name. The Python script must escape single quotes: `.replace("'", "''")`
  before embedding in SQL. This is already handled in the script above.
- If `ON CONFLICT (client_id, registration_group_id)` fails because no PK/unique
  constraint exists on that column pair, check the table definition first:
  `SELECT constraint_name FROM information_schema.table_constraints WHERE table_name = 'client_registration_group'`
  and adjust the ON CONFLICT clause accordingly.
- The loader functions use SECURITY DEFINER to write to t and c schemas.
  If they don't exist (were dropped), recreate them from the definitions in the
  previous session (search docs/briefs/ or recreate from Task 5 pattern).
- Item count should be exactly 635 from the Current Support Items sheet.
  The Legacy Support Items sheet (37 rows) is NOT loaded — those are legacy items.

---

## What this brief does NOT include

- Loading the Legacy Support Items sheet (37 rows) — not needed
- Linking NDIS Yarns or Property Pulse to registration groups (NDIS Yarns
  content is already scope-matched via t.content_vertical, not this table)
- Adding plain_description or cross_group_ids (leave NULL for now)
- Price limits by state (only NSW reference price loaded as price_limit_aud)
