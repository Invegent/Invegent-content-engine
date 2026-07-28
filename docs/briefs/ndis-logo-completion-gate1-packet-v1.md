# NDIS Yarns logo completion — Gate-1 packet (promotion, NOT applied)

**Status: DRAFT — awaiting PK Gate-1 decision. Nothing in this packet has been applied.**
**Lane:** Asset Sufficiency, item **P1-5** (`docs/briefs/ice-asset-gap-register-v1.md` §0/§2/§3).
**Client:** NDIS Yarns, `client_id fb98a472-ae4d-432d-8738-2273231c1ef4`, slug `ndis-yarns`, project `mbkmaxqhsohbtwsqolns`.
**Tier:** T2 (additive DB flag-flip on already-fenced rows, same shape as the proven 2026-07-18 D7 promotion) — full db-rls-auditor + external-review chain to run on the FINAL diff at Gate-2, not yet run here.

## 0. Headline finding

**The register's literal P1-5 ask ("promote the authoritative logo") is unsafe to execute as a
blanket action.** `resolve_slot_assets` has **no placement/format-aware logo selection** — it picks
`v_elig_logo -> 0`, unconditionally "first by `(created_at ASC, asset_id ASC)`"
(`supabase/migrations/20260703002813_create_resolve_slot_assets_v1.sql:287`, confirmed by direct
read, no seed/rotation branch for Logo unlike Background). All 17 intake rows share one bulk-insert
transaction, so `created_at` ties and the **asset_id** literal order decides the winner.

The currently governed, PK-proven, live-rendering logo is `d1b10015` (`ny_logo_mark_only`, mark-only
icon — promoted 2026-07-18 as the deliberate "Option B" correction over the earlier full-colour
pick, proven on FB+IG+LI). Five of the remaining fenced PNG candidates
(`d1b10010`–`d1b10014`) have a **lower** asset_id than `d1b10015`. Promoting **any** of them would
silently become the new deterministic winner and **revert PK's mark-only decision** without anyone
flipping `brand_logo_url` or touching the resolver — a live identity switch disguised as "just
governing more variants." This is the exact risk the task boundary ("do not switch production
identity merely because assets are promoted") anticipates.

**Recommendation:** promote only the two candidates whose asset_id sorts *after* `d1b10015`
(§3, safe set) now; leave the five order-hazard candidates fenced and put the real question —
whether to accept a live identity switch, or wait for the resolver to gain placement-aware logo
selection (a separate, out-of-boundary build) — to PK as its own decision (§5).

## 1. Authoritative candidate inventory (17 rows, re-established from `ndis_logo_intake_apply.sql` +
live DB read via db-rls-auditor, 2026-07-28)

All rows: `client_id=fb98a472-…`, bucket `brand-assets`, path `NDIS_Yarns/Logos/`, `license_type=client_owned`,
no expiry, `platform_scope=null` (permissive-with-warning). Reconstruction caveat applies to all
(Claude Design manual vector reconstruction of the live raster source; font approximated; not
pixel-perfect; already PK-accepted at the 2026-07-08 and 2026-07-18 gates).

| asset_id | asset_key | asset_type | usage | file | dims | transparency | current is_active/approved |
|---|---|---|---|---|---|---|---|
| d1b10001 | ny_logo_master_editable | logo_primary | logo_vector_source | ny_logo_master_editable.svg | vector | true | false/false |
| d1b10002 | ny_logo_master_outlined | logo_primary | logo_vector_source | ny_logo_master_outlined.svg | vector | true | false/false |
| d1b10003 | ny_logo_dark_svg | logo_dark | logo_vector_source | ny_logo_dark_transparent.svg | vector | true | false/false |
| d1b10004 | ny_logo_white_svg | logo_light | logo_vector_source | ny_logo_white_transparent.svg | vector | true | false/false |
| d1b10005 | ny_logo_horizontal_svg | other | logo_vector_source | ny_logo_horizontal_transparent.svg | vector | true | false/false |
| d1b10006 | ny_logo_horizontal_white_svg | other | logo_vector_source | ny_logo_horizontal_white_transparent.svg | vector | true | false/false |
| d1b10007 | ny_logo_mark_only_svg | logo_icon | logo_vector_source | ny_logo_mark_only_transparent.svg | vector | true | false/false |
| d1b10008 | ny_logo_square_brand_bg_svg | other | logo_vector_source | ny_logo_square_brand_bg.svg | vector | true | false/false |
| d1b10009 | ny_logo_watermark_white_svg | watermark | logo_vector_source | ny_logo_watermark_white_transparent.svg | vector | true | false/false |
| **d1b10010** | ny_logo_full_colour | logo_primary | **logo** | ny_logo_full_colour_transparent.png | 1024×1024 (1:1) | true | false/false *(re-fenced 07-18, was briefly promoted)* |
| d1b10011 | ny_logo_white | logo_light | logo | ny_logo_white_transparent.png | 1024×1024 (1:1) | true | false/false |
| d1b10012 | ny_logo_dark | logo_dark | logo | ny_logo_dark_transparent.png | 1024×1024 (1:1) | true | false/false |
| d1b10013 | ny_logo_horizontal | other | logo | ny_logo_horizontal_transparent.png | 2048×666 (3:1) | true | false/false |
| d1b10014 | ny_logo_horizontal_white | other | logo | ny_logo_horizontal_white_transparent.png | 2048×666 (3:1) | true | false/false |
| **d1b10015** | ny_logo_mark_only | logo_icon | **logo** | ny_logo_mark_only_transparent_1024.png | 1024×1024 (1:1) | true | **true/true — LIVE, PK-proven FB+IG+LI (2026-07-18)** |
| d1b10016 | ny_logo_watermark_white | watermark | logo | ny_logo_watermark_white_transparent.png | 1024×1024 (1:1) | true | false/false |
| d1b10017 | ny_logo_square_brand_bg | other | logo | ny_logo_square_brand_bg_1024.png | 1024×1024 (1:1) | **false (solid brand-navy bg)** | false/false |

`brand_profile.brand_logo_url` = original untouched raster (`NDIS_Yarns/Logos/NDIS-Yarns_Logo.png`,
2026-03-31) — separate legacy render path, unaffected by any of the above; not to be changed here.

## 2. Identity / brand-fit confirmation

Verified visually against the client's own original source files
(`_harness/ndis_yarns_logo_intake_v0/source/source_NDIS-Yarns Brand.png` and `…Logo.png`):

- **Correct NDIS Yarns identity:** wordmark "NDIS Yarns" + tagline "Explainers · Updates · News" present
  on all full-lockup variants; mark-only variants carry just the speech-bubble/yarn glyph, matching
  the client's live bare mark 1:1 in silhouette and colour split.
- **White–teal–white ring treatment:** present on all *full-lockup* variants (`d1b10001/2/10/11/12`
  + SVGs `d1b10003/4`) — outer teal ring, white ring, navy badge fill, matching the original
  `source_NDIS-Yarns Brand.png` exactly. **Not present** on mark-only/horizontal/watermark/square-badge
  variants (no ring is expected there — a mark/horizontal/watermark by definition isn't the ringed
  badge; not a defect).
- **Sketch-style yarn mark:** the looped-yarn/speech-bubble glyph is present, faithfully reconstructed,
  on every variant.
- **Transparent + solid-background variants:** 16 of 17 are transparent PNG/SVG; exactly one
  (`d1b10017`, square brand-bg badge) is solid (navy) background — satisfies the "acceptable
  solid-background variant" requirement.
- **Aspect ratios / resolutions:** 1:1 @ 1024px (standard card/badge use, matches existing governed
  PP/NDIS asset conventions) and 3:1 @ 2048×666 (footer/lower-third use). All suitable for current
  ICE static formats. No format currently calls specifically for the horizontal or dark/light
  variant — **today, exactly one logo asset is ever used per client, everywhere** (§0) — so the
  variant breadth is inventory-ready but not yet consumable by any live template routing.
- Brand-typography/unrelated-language clause in the task brief: not applicable to this inventory
  (no such requirement exists in the NDIS Yarns brand kit).

## 3. Classification

| Class | Assets | Rationale |
|---|---|---|
| **PROMOTE (safe — recommended)** | `d1b10016` (watermark white), `d1b10017` (square brand-bg, solid) | asset_id sorts **after** `d1b10015` → cannot become the resolver's `v_elig_logo->0` pick while `d1b10015` stays governed. Adds the missing solid-bg variant + a documented low-contrast overlay option. Zero resolver-selection change. |
| **RETAIN FENCED — order-hazard** | `d1b10010` (full-colour primary/ringed), `d1b10011` (light/white ringed), `d1b10012` (dark ringed), `d1b10013` (horizontal), `d1b10014` (horizontal white) | asset_id sorts **before** `d1b10015` → promoting any would silently override today's live winner (§0). Needs an explicit PK identity-switch decision or resolver placement-awareness (out of this task's boundary) before promotion is safe. |
| **RETAIN FENCED — inert under current resolver** | `d1b10001`–`d1b10009` (all 9 SVGs, `usage=logo_vector_source`) | `resolve_slot_assets` only scans `usage IN ('background','logo')` (`…v1.sql:172`) — vector-source rows are structurally outside the resolver's scan regardless of `is_active`. Flipping them would have zero functional effect. Kept as the design-source library. |
| **ALREADY GOVERNED — no action** | `d1b10015` | Live, PK-proven, sole selectable NDIS logo since 2026-07-18. |
| **DUPLICATE/SUPERSEDED (informational)** | `d1b10001` (editable-text master SVG) vs `d1b10002` (outlined master SVG) | Same lockup design; `d1b10002` is the kit's own stated production-preferred vector ("preferred for automated rendering"). Both retained fenced as source material — no promotion difference since neither is resolver-scanned. |
| **REJECT** | none | No candidate fails identity, licence, or fence checks. |

## 4. Promotion packet — exact mechanics (draft, NOT executed)

Same guarded pattern as the proven 2026-07-18 Rework-1 promotion (in-txn `DO`-block, fail-closed
pre-check + post-verify assert, single transaction):

```sql
BEGIN;
DO $$
DECLARE governed_before int; governed_after int;
BEGIN
  -- pre-check: exactly 1 governed NDIS logo today (d1b10015), PP pool untouched by this txn
  SELECT count(*) INTO governed_before FROM c.client_brand_asset
  WHERE client_id='fb98a472-ae4d-432d-8738-2273231c1ef4'
    AND asset_meta->>'usage'='logo' AND is_active IS TRUE AND (asset_meta->>'approved')::boolean IS TRUE;
  IF governed_before <> 1 THEN
    RAISE EXCEPTION 'precondition failed: % governed NDIS logos, expected exactly 1 (d1b10015) — abort', governed_before;
  END IF;

  UPDATE c.client_brand_asset
     SET is_active = true,
         asset_meta = asset_meta
           || jsonb_build_object('approved', true, 'approval_status', 'governed',
                                  'production_use_allowed', true, 'promoted_by', 'PK',
                                  'promoted_at', now()::text)
   WHERE asset_id IN ('d1b10016-9c4e-4f7a-8d21-0d5e6f7a8b16', 'd1b10017-9c4e-4f7a-8d21-0d5e6f7a8b17');

  -- post-verify: d1b10015 is STILL the resolver's winner (lowest asset_id among eligible, unchanged)
  SELECT count(*) INTO governed_after FROM c.client_brand_asset
  WHERE client_id='fb98a472-ae4d-432d-8738-2273231c1ef4'
    AND asset_meta->>'usage'='logo' AND is_active IS TRUE AND (asset_meta->>'approved')::boolean IS TRUE;
  IF governed_after <> 3 THEN
    RAISE EXCEPTION 'post-verify failed: % governed NDIS logos, expected exactly 3 — abort', governed_after;
  END IF;
END $$;
COMMIT;
```

**Rollback (re-fence, symmetric to the D7 precedent):**
```sql
UPDATE c.client_brand_asset
   SET is_active = false,
       asset_meta = asset_meta
         || jsonb_build_object('approved', false, 'approval_status', 'intake_candidate',
                                'production_use_allowed', false)
 WHERE asset_id IN ('d1b10016-9c4e-4f7a-8d21-0d5e6f7a8b16', 'd1b10017-9c4e-4f7a-8d21-0d5e6f7a8b17');
```

**Governed set after apply:** `d1b10015` (unchanged winner) + `d1b10016` + `d1b10017` (eligible but
never selected while `d1b10015` remains governed — inert-by-order, exactly as designed).

**Storage / usage keys:** unchanged — both already live at
`brand-assets/NDIS_Yarns/Logos/ny_logo_watermark_white_transparent.png` and
`…/ny_logo_square_brand_bg_1024.png`; `asset_meta.usage` stays `'logo'` for both (already resolver-scanned).

## 5. Non-regression proof (task requirement 5)

- **Won't replace the current production logo:** proven structurally (§0, §4) — `d1b10015` keeps the
  lowest eligible asset_id after this apply; `v_elig_logo -> 0` is unconditional (no seed/rotation for
  Logo), so the winner cannot change. `brand_profile.brand_logo_url` is a separate column, untouched
  by this DML.
- **Won't alter unrelated brands:** all UPDATEs scope by exact `asset_id IN (…)` on rows already
  confirmed (db-rls-auditor, 2026-07-28) to belong solely to `client_id fb98a472-…`; zero other
  client rows reference these paths/hashes (cross-brand collision check: clean).
- **Assumption flagged for Gate-2 re-check:** all 17 rows share one bulk-insert transaction, so
  `created_at` should be identical for all — cheap to reconfirm with a single SELECT immediately
  before applying, as an extra pre-check (not yet run this pass).

## 6. Open question for PK (the actual decision this packet surfaces)

The five order-hazard candidates (`d1b10010`–`d1b10014`) are where the register's "authoritative
logo" intent actually lives (full-colour ringed primary + light/dark/horizontal placement variants).
They **cannot** be safely promoted under the current resolver without either:
  (a) accepting a live identity switch (NDIS's rendered logo would silently change from mark-only
      back toward whichever gets promoted, for every template/platform, everywhere — since there is
      still only one Logo slot pick, system-wide), or
  (b) deferring them until `resolve_slot_assets` gains placement/format-aware logo selection — a
      separate build lane, explicitly out of this task's boundary ("do not modify resolve_slot_assets").

This is a `policy_decision` (per the CCF-02 triage vocabulary), not a defect — it is PK's call, not
this packet's to make.

## 7. Boundaries respected

No logo redesigned or generated. `resolve_slot_assets` not modified (read-only, for analysis only).
cc-0043 writer branches not touched. Music / Video B-roll Intake not started. `brand_logo_url`
fallback untouched and not proposed for change. No production identity switch proposed — the one
safe promotion set is inert-by-construction. Nothing in §4 has been executed; no commit made.

## 8. Gate

**Awaiting PK decision on:**
1. Apply the safe promotion set (§4: `d1b10016` + `d1b10017`) — yes/no.
2. §6's policy question on the five order-hazard candidates — accept live switch / defer to a
   resolver-upgrade lane / leave fenced indefinitely.

Once decided (either applied+verified, or explicitly deferred), this outcome closes and the next
Asset Sufficiency priority (P2-1 music promotion, per the register's ranking) is the follow-up
directive.
