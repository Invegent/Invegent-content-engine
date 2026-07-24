# cc-0073 — MANIFEST C: Invegent promotion (3 assets → pool of 4)

**Created:** 2026-07-24 Sydney · **Author:** chat (S5) · **Status:** authored + frozen — **NOT APPLIED**
**Ruling basis:** PK per-candidate verdicts on the five real-template renders, 2026-07-24
**Tier:** T3 · **Change class:** data-only, `c.shared_creative_asset` fence columns, **3 rows**

> ⛔ **NOT APPLIED, and no window is open.** Invegent promotion belongs to the **next sprint** and
> requires its own PK-opened window. This manifest is authored and frozen only.

---

## 1. PK per-candidate verdicts — the basis for this manifest

Rendered through `generic_quote_card_1x1_v1` (Invegent's live template) at the live scrim 62, with
Invegent's live logo — real Creatomate renders, not the simulation contact sheet.

| Asset | Verdict | PK's reason (verbatim where given) |
|---|---|---|
| **S2** neutral concrete | ✅ **ACCEPTED** | strongest text clarity |
| **S3** soft grey bokeh | ✅ **ACCEPTED** | strongest text clarity |
| **S6** glass office tower | ✅ **ACCEPTED** | *"provides the best B2B technology signal"* |
| **S1** soft blue gradient | ❌ **REJECTED** | *"clean but too generic"* |
| **S4** abstract wall & sky | ❌ **REJECTED** | *"pale diagonal competes with the headline"* |

PK's summary, verbatim: *"S2 and S3 have the strongest text clarity, while S6 provides the best B2B
technology signal."*

**S4's rejection independently confirms the pre-gate flag** raised when the renders were surfaced —
the pale wall sitting behind the headline's right side was weaker in real production than the
simulation contact sheet implied. That divergence is the concrete case for rendering through the real
template rather than trusting a simulation, and it is why the render condition was worth imposing.

## 2. Live pre-state (2026-07-24)

| # | asset | is_active | prod_allowed | approval_status | allowed_clients | scrim |
|---|---|---|---|---|---|---|
| S2 | neutral_concrete_texture | false | false | intake_candidate | `{}` | 62 |
| S3 | soft_grey_bokeh | **true** | **true** | **governed** | **`{CFW}`** | 62 |
| S6 | glass_office_tower | false | false | intake_candidate | `{}` | 62 |
| S8 | datacentre_server | true | true | governed | `{invegent}` | 62 |

**⚠️ S3 is already live under the CFW pilot with allowlist `{CFW}`.** Its promotion here is an
**allowlist widening**, not a fence flip — a materially different statement from S2/S6, and it must
not be written with the same UPDATE.

## 3. The change — 3 rows, two distinct statements

```sql
-- C1: fence flip — S2, S6 (currently fenced) → live, Invegent only
UPDATE c.shared_creative_asset
   SET is_active = true, production_use_allowed = true, approval_status = 'governed',
       allowed_clients = ARRAY['93494a09-cc89-41d1-b364-cb63983063a6'::uuid],   -- Invegent
       asset_meta = asset_meta || jsonb_build_object(
         'promoted_by','cc-0073 Manifest C (Invegent pool activation); PK per-candidate visual verdict 2026-07-24 on real-template renders at scrim 62.'),
       updated_at = now()
 WHERE id IN ('3719033b-725e-4023-9dd2-b779ec462579',   -- S2 neutral concrete
              'bd462204-cf43-4680-8aae-4083103593e1')   -- S6 glass office tower
   AND approval_status = 'intake_candidate'
   AND asset_meta->>'scrim_opacity_override' = '62';

-- C2: allowlist WIDENING — S3 is already live for CFW; ADD Invegent, do not disturb CFW
UPDATE c.shared_creative_asset
   SET allowed_clients = ARRAY['3eca32aa-e460-462f-a846-3f6ace6a3cae'::uuid,    -- CFW (retained)
                               '93494a09-cc89-41d1-b364-cb63983063a6'::uuid],   -- Invegent (added)
       updated_at = now()
 WHERE id = 'c36bb74f-6f3b-4939-8bdc-c47fc2f39e82'
   AND approval_status = 'governed'                                  -- guard: already promoted
   AND allowed_clients = ARRAY['3eca32aa-e460-462f-a846-3f6ace6a3cae'::uuid];   -- guard: exactly CFW today

-- assertions
DO $$ DECLARE n int; BEGIN
  SELECT count(*) INTO n FROM c.shared_creative_asset WHERE is_active AND production_use_allowed;
  IF n <> 4 THEN RAISE EXCEPTION 'cc-0073C ABORT: expected 4 live shared assets, got %', n; END IF;
  SELECT count(*) INTO n FROM c.shared_creative_asset WHERE approval_status='intake_candidate';
  IF n <> 4 THEN RAISE EXCEPTION 'cc-0073C ABORT: expected 4 still fenced (S1,S4,S5,S7), got %', n; END IF;
  SELECT count(*) INTO n FROM c.shared_creative_asset WHERE asset_meta->>'scrim_opacity_override'='62';
  IF n <> 8 THEN RAISE EXCEPTION 'cc-0073C ABORT: scrim override lost, got %', n; END IF;
END $$;
```

**Rows touched: 3** (S2, S6 flipped; S3 widened). S8 untouched. S1, S4, S5, S7 remain fenced.

## 4. Projected pools

**Invegent** (0 client backgrounds; `client_preferred` + empty client list ⇒ shared pool consulted):
S8 + S2 + S3 + S6 = **4** — exactly the recommended floor. Repeat rate 100% → 25%.

**CFW** — **unchanged at 2** (`S3` + brand-navy, 50/50). The S3 widening adds Invegent without
removing CFW. **This manifest must not alter CFW's pool**, and P-C5 below proves it.

**PP / NDIS** — no policy row ⇒ `client_only` ⇒ unaffected by construction.

## 5. Proof

| # | Check | Pass condition |
|---|---|---|
| P-C1 | Fence state | 4 live / 4 fenced; S1, S4, S5, S7 byte-identical; **S8 byte-identical** |
| P-C2 | Allowlists exact | S2 = `{Inv}` · S6 = `{Inv}` · **S3 = `{CFW, Inv}`** · S8 = `{Inv}` |
| P-C3 | **Invegent pool = 4** | ≥16 seeds → exactly 4 distinct `asset_key` (S8, S2, S3, S6); **never S1, S4, S5, S7** |
| P-C4 | Rejected-for-Invegent proof | S1/S4 appear in Invegent's `rejected[]` as `inactive` — the PK rejections are enforced, not just documented |
| P-C5 | **CFW pool UNCHANGED at 2** | CFW still draws exactly `{S3, brand-navy}` ~50/50; **never S2, S6 or S8** |
| P-C6 | PP / NDIS unchanged | pinned seed `cc0073-baseline` |
| P-C7 | Scrim survives | every shared pick emits `Scrim.opacity=62` + `scrim_override_applied` |
| P-C8 | Spine unmutated | md5 `75d59925316ccde39073113557504596` / `41df4745707d0396f145d32d7ffd7483` |
| P-C9 | Ledger frozen | 8 rows, 4 open; classification untouched |
| P-C10 | **Live render + PK visual PASS** | ≥1 real Invegent render on a newly reachable background; **PK's visual verdict is the deciding act** |

**P-C5 is this manifest's most important proof:** widening a shared asset's allowlist must not perturb
the client already using it. The CFW pilot's 50/50 must survive intact.

## 6. Rollback

```sql
-- reverse C1
UPDATE c.shared_creative_asset
   SET is_active=false, production_use_allowed=false, approval_status='intake_candidate',
       allowed_clients='{}'::uuid[], asset_meta = asset_meta - 'promoted_by', updated_at=now()
 WHERE id IN ('3719033b-725e-4023-9dd2-b779ec462579','bd462204-cf43-4680-8aae-4083103593e1');

-- reverse C2 — restore S3 to CFW-only (does NOT un-promote it)
UPDATE c.shared_creative_asset
   SET allowed_clients = ARRAY['3eca32aa-e460-462f-a846-3f6ace6a3cae'::uuid], updated_at=now()
 WHERE id = 'c36bb74f-6f3b-4939-8bdc-c47fc2f39e82';
```

Two reversals because there are two distinct changes. **The S3 reversal must restore `{CFW}`, not
`{}`** — reverting it to empty would silently un-promote the CFW pilot, which this manifest never
promoted and has no authority to undo.

## 7. Stop conditions

Any target row not in its expected pre-state → STOP · rows updated ≠ 3 · live ≠ 4 or fenced ≠ 4
(in-txn abort) · **S3's allowlist does not contain CFW post-apply** → STOP + rollback ·
**CFW's pool changes in size or membership** → STOP + rollback · Invegent resolves S1, S4, S5 or S7
→ STOP + rollback · PP/NDIS drift at the pinned seed → STOP + rollback ·
`scrim_opacity_override` altered or lost → STOP + rollback · spine digest differs → STOP · any ledger
classification column changes → STOP · PK visual verdict ≠ PASS → rollback · any attempt to bundle a
policy change, CFW expansion, sourcing, template or resolver change → STOP · unexpected origin
movement or out-of-set files → STOP.

## 8. Explicitly NOT in this manifest

**S1 and S4 — PK-REJECTED, must remain fenced** · S5/S7 promotion (never assessed as suitable) ·
CFW expansion beyond the pilot · any policy-row change · **any Invegent client-scoped background**
(standing constraint: under `client_preferred` the first such asset makes `v_bg_true` non-empty and
**suppresses Invegent's entire shared pool**, silently reducing it to 1 — Invegent must move to
`best_fit` *before* any client-scoped background is ever introduced) · sourcing · resolver/template
change · ledger mutation · commit/register/push.

---

**Ruling requested (next sprint, own window):** promote S2 and S6 to Invegent and widen S3's allowlist
to include Invegent → Invegent pool of 4, CFW unchanged at 2. Recommend **yes** — every asset carries
an explicit per-brand allowlist, each has a real-template render at the live scrim, each was
individually accepted by PK, and the two PK-rejected candidates stay fenced.
