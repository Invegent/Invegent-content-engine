# Result — Asset Gap Batch-2 B2-2/B2-4: Invegent + CFW brand-colour data fill

**Status:** ✅ **APPLIED + LIVE-PROVEN** (production `c.*` data fill) · 2026-07-26 Sydney
**Lane:** Asset Gap (schedule-driven Batch-2) · **Tier:** T2 (production `c.client_brand_profile` DML, client-facing config)
**Project:** `mbkmaxqhsohbtwsqolns` · **Author:** Claude Code (orchestrator)
**Packet:** `_harness/assetgap_brandcolours_20260726/` (apply.sql `06a79d72…`, rollback.sql `77f2ed44…`, packet.md `4e7c3c57…`)

---

## 1. What shipped
Filled the two NULL brand-colour columns for the two thinnest brands, so their live forward-scheduled
image_quote slots render on brand-true colour instead of the worker default `#0A2A4A/#1C8A8A`.

| Brand | client_id | brand_colour_primary (card bg) | brand_colour_secondary (accent) |
|---|---|---|---|
| Invegent | `93494a09-cc89-41d1-b364-cb63983063a6` | `#1B3A5C` | `#05ADDA` |
| Care For Welfare | `3eca32aa-e460-462f-a846-3f6ace6a3cae` | `#233141` | `#00BCE4` |

**Write target:** `c.client_brand_profile.{brand_colour_primary,brand_colour_secondary}`, read by image-worker
`getBrandAndSlug()` (`supabase/functions/image-worker/index.ts:894-896`) — `primary` = card background fill,
`secondary` = accent bars/quote-mark/divider/label. NULL → default `#0A2A4A/#1C8A8A`.

## 2. Why these values (not invented)
Both from the brands' own **governed logo kits** (PK-gated through logo-intake v0), with the kit's own role labels:
- **Invegent** — `invegent_logo_intake_v0` palette CSV: `primary_navy #1B3A5C` *"Primary background, brand panels"*
  → card bg; `primary_cyan #05ADDA` *"Primary mark/accent colour"* → accent. Exact match to the render model.
- **CFW** — `care_for_welfare_logo_intake_v0` palette CSV: `soft_dark #233141` *"softer panel than black"* → card bg;
  `accent_cyan #00BCE4` (brightest leaf) → accent. PK-selected from four grounded pairs.

PK selected both pairs 2026-07-26 ("go with your recommendations").

## 3. Why this lane (schedule-driven, not ease-driven)
Live forward-slot read (R0 `ice_ro.slot_status`, 2026-07-26) showed the near-term demand is dominated by
**image_quote** and nothing forward-scheduled is fail-closed. The register's ease-ordered #1 items
(PP `youtube_thumbnail` P0, NDIS logo promotion) have **zero** forward-scheduled demand. Invegent and CFW
each carry **12 `future` image_quote slots** (fb/ig/li) that were rendering on generic default colours —
the highest schedule-leverage asset gap, exactly as PK's priority note predicted. Colours chosen first as the
cheapest, lowest-risk, data-only step; background pools (B2-1/B2-3) are the next lane.

## 4. Safety harness (all held)
- **Fail-closed CAS guard** — each UPDATE `AND brand_colour_* IS NULL`; 0 rows if a concurrent lane already set colours (no clobber).
- **In-txn post-apply assertion** — `RAISE EXCEPTION` unless exactly 2 target rows carry the intended values; aborts the whole `BEGIN/COMMIT` otherwise.
- **Single-channel atomicity** — applied as ONE `execute_sql` call so `BEGIN…COMMIT` composes (no pooled split).
- **Rollback** — `rollback.sql` restores NULL/NULL, scoped to the exact values this lane wrote (won't clobber a later deliberate recolour).

## 5. Gates cleared
| Gate | Verdict |
|---|---|
| Baseline (live) | both rows exist, all four fields NULL — verified pre-apply |
| db-rls-auditor | **pass** — text/nullable cols, no CHECK, `UNIQUE(client_id)`, no triggers/upsert/DDL/grant change, service-role-only grants (no exposure introduced), CAS+assertion+rollback sound |
| External review (`ask_chatgpt_review`) | **agree** · risk low · confidence high · proceed · review `ddadfe24-ff1e-4ed3-8db7-da0dee0b8b7e`, pinned to apply.sql sha256 `06a79d72…` |
| PK apply gate (hard stop) | **authorized** ("go") |

## 6. Apply proof (live)
Applied 2026-07-26 07:58:01 UTC via single `execute_sql` call; in-txn assertion passed (no exception).
Post-apply re-select confirmed:
```
Care For Welfare Pty Ltd | #233141 | #00BCE4 | 2026-07-26 07:58:01.671883+00
Invegent                 | #1B3A5C | #05ADDA | 2026-07-26 07:58:01.671883+00
```

## 7. Residual / next
- **Render proof carries open** (deferred, not a blocker): the colour change is realised only when the next
  image_quote slot fills for either brand — no re-render was forced. First live card for Invegent/CFW confirms visually.
- **Next lane (queued):** Invegent + CFW background starter pools (B2-1/B2-3, P1) — image-harvester fenced-first
  intake, person-free for CFW; the bigger T3 lift. NDIS authoritative-logo promotion (B2-5) remains a separate lane.
- No DDL, no grant, no deploy. No production mutation beyond the two rows above.

## 8. Rollback
`_harness/assetgap_brandcolours_20260726/rollback.sql` — restores NULL/NULL for exactly these values.
