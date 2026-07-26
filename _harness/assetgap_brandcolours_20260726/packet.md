# Asset Gap · Batch-2 B2-2/B2-4 — Invegent + CFW brand-colour data fill (T2 apply packet)

**Date:** 2026-07-26 · **Lane:** Asset Gap (schedule-driven Batch-2) · **Tier:** T2 (production `c.*` DML, client-facing config).
**Type:** data fill (no DDL, no grants, no upsert). Fills two NULL colour fields per brand.

## 1. Task
Fill governed brand colours for the two thinnest brands so their live, forward-scheduled image_quote
slots stop rendering on default fallback colours. Driven by schedule demand: Invegent 12 + CFW 12
`future` image_quote slots (fb/ig/li), all currently rendering on the worker default `#0A2A4A/#1C8A8A`.

## 2. Write target (grounded)
`c.client_brand_profile.brand_colour_primary` + `brand_colour_secondary`.
Consumed by image-worker `getBrandAndSlug()` — `supabase/functions/image-worker/index.ts:894-896`:
`primary` = card **background** fill; `secondary` = **accent** (bars, quote-mark, divider, label).
NULL → default `#0A2A4A/#1C8A8A`.

## 3. Values (from governed logo kits — NOT invented)
| Brand | client_id | primary (bg) | secondary (accent) | Source |
|---|---|---|---|---|
| Invegent | 93494a09-cc89-41d1-b364-cb63983063a6 | `#1B3A5C` | `#05ADDA` | `invegent_logo_intake_v0` palette CSV: primary_navy "Primary background/panels" + primary_cyan "Primary mark/accent" |
| Care For Welfare | 3eca32aa-e460-462f-a846-3f6ace6a3cae | `#233141` | `#00BCE4` | `care_for_welfare_logo_intake_v0` palette CSV: soft_dark "softer panel than black" + accent_cyan leaf |

PK-selected 2026-07-26 ("go with your recommendations").

## 4. Baseline (verified live 2026-07-26, mbkmaxqhsohbtwsqolns)
Both rows exist; all four fields **NULL**. CFW `updated_at` 2026-04-23, Invegent 2026-07-20 — no concurrent-lane colour write.

## 5. Safety harness
- **Fail-closed CAS guard:** each UPDATE has `AND brand_colour_primary IS NULL AND brand_colour_secondary IS NULL` — 0 rows if a concurrent lane already set colours (no clobber).
- **In-txn post-apply assertion:** `DO $$ ... RAISE EXCEPTION IF count<>2 $$` inside the same `BEGIN/COMMIT` → aborts (auto-rollback) if the fill did not land exactly 2 target rows.
- **Rollback:** `rollback.sql` restores NULL/NULL, scoped to the exact values this lane wrote (won't clobber a later deliberate recolour).
- **Single-statement channel:** applied as ONE `execute_sql` call so the `BEGIN…COMMIT` composes (not split across a pooled multi-call).

## 6. Out of scope
Background sourcing (B2-1/B2-3, next lane), NDIS logo promotion (B2-5), logo governance, any DDL/grant.

## 7. Gates
db-rls-auditor (DB touched) · external review pinned to apply.sql sha256 · **PK apply gate (hard stop — production write)** · post-apply live re-select proof · result doc + register pointer · branch-warden before any commit.
