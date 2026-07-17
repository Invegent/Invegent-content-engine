# Result — PP reserve background promotion (6 of 8 approved → live rotation)

- **Version:** v5.60
- **Date:** 2026-07-17 (Sydney)
- **Tier / lane:** T3 · PRODUCT_PROOF
- **Verdict:** ✅ APPLIED — 6 backgrounds promoted and live; 2 rejected and left fenced.
- **Client:** Property Pulse — `client_id = 4036a6b5-b4a3-406e-998d-c2fe14a8bbdd`
- **Table:** `c.client_brand_asset`
- **Packet + runnable SQL:** `_harness/reserve_bg_promotion_20260717/` (packet.md sha `8a7edf00…`)
- **Review package:** `_harness/reserve_bg_review_20260717/` (8 images + manifest; all bytes sha256-matched)

## What changed
Governed **promotion** of 6 PK-visually-approved Property Pulse background images from reserve into the
live selection pool. Unlike the v5.58 Group A lane (pure `is_active` flip on already-approved assets),
these were `approved=false`, so the write set **`approved=true` (JSON boolean) + `approval_status='governed'`
+ `is_active=true`**. No new rows, no schema change; only those three keys + `updated_at`.

| asset_key | asset_name | asset_id | baseline approval_status |
|---|---|---|---|
| `bg_pp_perth_skyline_dawn_moody` | Perth skyline dawn (moody) | `b2a10001-9c4e-4f7a-8d21-0d5e6f7a8b01` | intake_candidate |
| `bg_pp_au_suburb_texture` | AU suburb texture (aerial) | `b3a20001-9c4e-4f7a-8d21-0d5e6f7a8b01` | intake_candidate |
| `bg_pp_modern_home_exterior_front` | Modern AU townhouse exteriors | `b2a10003-9c4e-4f7a-8d21-0d5e6f7a8b03` | governed (approved=false) |
| `bg_pp_open_home_entry` | Bright home porch entry | `b2a10007-9c4e-4f7a-8d21-0d5e6f7a8b07` | intake_candidate |
| `bg_pp_family_backyard_summer` | Family backyard / alfresco | `b3a20004-9c4e-4f7a-8d21-0d5e6f7a8b04` | intake_candidate |
| `bg_pp_contract_signing_closeup` | Contract signing (blank sheet) | `b3a20010-9c4e-4f7a-8d21-0d5e6f7a8b10` | intake_candidate |

## Rejected (left fenced, untouched)
- `bg_pp_for_sale_sign_street` — dominant full-frame legible "FOR SALE" text; no scrim-safe region (text-on-text).
- `bg_pp_transaction_keys_contract` — Ukrainian-language contract form + barcode on the document (authenticity/legibility risk); the signing theme is already covered by `bg_pp_contract_signing_closeup`.

## Review + gates
- **image-reviewer** (package `_harness/reserve_bg_review_20260717/`): 8/8 present + consistent, licences
  allow-listed (unsplash/pexels), no people in any frame (incl. #5). Flagged #3 (legible "MIDDLEBOROUGH TCE"
  street sign + Melbourne geo), #6, #1 (readable corporate tower trademarks), #8 (Cyrillic doc + barcode).
- **PK visual verdict (deciding act):** approved #1,2,3,4,5,7; rejected #6,#8. **#3 carried on explicit PK
  judgment** — tiny mid-frame street blade sign, illegible at 1080px card scale, brand spans multiple AU
  cities; caveat recorded (scrim covers only the text panel, so the sign remains visible elsewhere on the card).
- **External review:** `ask_chatgpt_review` → verdict `partial`, **escalate on `policy_decision`** only
  ("promoting `approved=false`→`true` needs human judgment"); **no technical defect** — it verified the
  CAS-guard, the rollback, and the boolean-preserving jsonb merge. PK owns and exercised that policy call.
  `review_id = a89f406e-81e1-4a5d-9e44-5b9cc4169be1`, `reviewed_input_hash = 8a7edf00…` (packet.md).
- **PK write authorization:** given explicitly ("authorized — apply", policy call owned).

## Apply + proof (evidence)
- **Baseline probe:** `status=ok`, Background `inactive` rejects = **8**, all 6 targets present as inactive.
- **Apply** (`execute_sql`, CAS-guarded `UPDATE … SET is_active=true, asset_meta || {approved:true,
  approval_status:'governed'}` on the 6 pinned ids with `is_active=false AND (approved)::boolean=false AND
  usage='background' AND bucket='brand-assets'`): **rowcount = 6**, `all_promoted=true` (each verified
  approved + governed + active via RETURNING).
- **Post-apply probe:** `status=ok`, Background `inactive` **8 → 2** (remaining = exactly
  `bg_pp_for_sale_sign_street`, `bg_pp_transaction_keys_contract`), `group_6_still_rejected = 0`.
- **Readback:** live active PP background pool **16 → 22**.

## Rollback
`_harness/reserve_bg_promotion_20260717/04_rollback.sql` — restores `approved=false`, `is_active=false`, and
each row's original `approval_status` (#3 → governed, the other five → intake_candidate). Expect rowcount=6.

## Open / not done
- **Regression render (supervised `governed_image_quote_smoke`) NOT run** — PK-run entrypoint, needs
  `x-series-key`. This change only enlarges the eligible pool (same `needs_scrim` shape as the 16 already
  live); resolver machine-proof confirms the enlarged pool resolves cleanly. Optional PK-run belt-and-braces.

## Inventory after this lane
- **PP backgrounds:** **22 live** (was 12 at session start; +4 v5.58 Group A, +6 this lane) · **2 in reserve**
  (both rejected this pass). The usable image reserve is effectively exhausted.
- **PP background video (B-roll):** unchanged — 0 live, 2 fenced candidates.
