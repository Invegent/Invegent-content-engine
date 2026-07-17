# RESULT — TMR Re-skin Video Templates v1 · Fenced Registry Intake

**Date:** 2026-07-17 Sydney · **Lane class:** SIDE_PROVING · **Tier T2** (additive, fenced DB writes) · **Verdict:** ✅ APPLIED + VERIFIED
**Packet:** `docs/briefs/tmr-reskin-video-templates-fenced-intake-packet-v1.md`
**Migration:** `20260717014905_tmr_reskin_video_templates_v1_fenced_intake` · reviewed artifact sha256 `237a4024ac92ef51b43948c7bc1a4590cd4daea0fbaa7fe219c88bd4769ab59c` (7004 B)
**Predecessors:** `tmr-generic-template-library-foundation-v1.md` · `tmr4-…-apply-result.md` (v5.53) · `tmr-four-template-reskin-classification-workbook-v1.md`

## Outcome
Three re-skinned generic **video** templates — PK-transposed into Creatomate and smoke-passed — were intaken **FENCED** (`status='classified'`) into the live TMR registry (project `mbkmaxqhsohbtwsqolns`), reusing the existing archetype families (each now holds a static + a video member, per the unified static+video model). No family created, no production behaviour change.

| # | Archetype | Format | Creatomate `provider_template_id` | Family (reused) | JSON sha256 |
|---|---|---|---|---|---|
| 01 Stat Reveal | `stat_reveal` | 9:16 · 8s | `c6dcaa2d-f3fe-4564-a588-6ac588680387` | `generic.stat_hero_card` | `3dc71c36…` |
| 02 Multi-Stat / Tips | `tips_listicle` | 1:1 · 9s | `817ce92d-6843-4580-ad09-3d35d80d8154` | `generic.listicle_card` | `0fd5248c…` |
| 03 Quote Statement | `quote_statement` | 9:16 · 8s | `416658f5-f565-4351-95e6-12b9a4063df0` | `generic.news.quote_card` | `c7613d69…` |

Each row: `scope='generic'`, `output_type='video'`, `inventory_status='captured_from_render_probe'`, asset-appetite **background-free** (`image_slot_min/max=0/0`, `needs_governed_background=false`, `text_overlay_safe_required=NULL`). +18 template-level tags (6 each): `vertical=generic`, `use_case`=archetype, `tone` (clean/clean/dramatic), `motion_treatment` (counter_reveal / staggered_slide / searchlight_reveal), `length_class=short_video`, `aspect_fit` (9x16/1x1/9x16).

## Material correction (vs the classification workbook)
The workbook Sheet 3 proposed **new** family keys (`generic.stat_reveal` / `…quote_statement` / `…tips_listicle`). **Those do not exist.** The live registry already carries the matching archetype families (`generic.stat_hero_card`, `generic.listicle_card`, `generic.news.quote_card`), each seeded with a `static_image` sibling. This lane **reused** them (one archetype family = static + video, differentiated by `output_type` + tags — the doctrinal "medium is a tag, not a new family" rule). The workbook's family-key column is superseded by this result.

## Honesty note (template 03 motion)
Built as a translucent **spotlight sweep**, not a true alpha mask (kept background-free). Tagged `motion_treatment=searchlight_reveal` to reflect what renders; the workbook's `masked_reveal` is retired for this row. The photo-reveal mask variant is a documented future upgrade (photo = optional governed slot).

## Copy-length note (from template 02 smoke)
Each `Points` line renders as its own scaling-clip pill; a line exceeding the box wraps into an extra pill (observed "…first / impression"). Not a defect. Intake copy rule: **each `Points` line should fit one line at max font.** Informational — no column encodes it.

## Review chain (T2)
- **db-rls-auditor:** CLEAN / pass (high). All 7 invariants confirmed vs live schema; fencing verified; no migration-name collision; no new advisor findings.
- **External review** (`ask_chatgpt_review`, `sql_destructive`): **AGREE / proceed**, risk medium, confidence high, no escalation. `review_id e0342e91-cddf-4f88-aa7d-46235bc0fa7a`, pinned to sha `237a4024…`.
- **branch-warden:** git state safe (main, HEAD `e368c6f`, parity 0/0). Verdict `concerns` = **commit-hygiene only**: two pre-existing tracked mods from other lanes (`docs/briefs/pp-video-tmr-template-workbook-v1.xlsx`, `docs/governance/pp-tmr-definition-of-done-v1.md`) must NOT be swept in (CCF-02 R4) — commit staged explicit paths only.

## Apply + verification
- **Apply:** PK-authorised; run via `execute_sql` (`apply_migration` deny-listed for agents). Single txn ended with a fail-closed in-txn assertion (3 rows / 18 tags / 0 satellite rows) — passed (no rollback). Ledger backfilled: `supabase_migrations.schema_migrations` version `20260717014905` (statements + rollback recorded). Repo migration file byte-matches reviewed sha `237a4024…`.
- **Post-apply (read-only):** 3 rows present (all `classified`/`generic`/`video`); 18 tags; **0** variant_candidate / **0** platform_suitability / **0** client_assignment / **0** proof_event; 16 generic families (unchanged); each target family now 1 static + 1 video.
- **Fence proven live:** `select_template('property-pulse','facebook','image_quote',NULL,'seed-verify')` → winner still `48cba556…`, status `ok`, **none of the 3 new ids present** anywhere in the response.

## Fencing mechanism (reusable)
`public.select_template` returns a template only if ALL hold: a `c.creative_template_variant_candidate` row for the format · status ≥ `smoke_rendered` · a `platform_suitability` row · a `visually_approved` `client_assignment` · a passed `visual_approval` `proof_event`. This intake writes **none** → unreachable four independent ways; `classified` < `smoke_rendered` blocks independently.

## Rollback (validated, unused)
`DELETE FROM c.creative_provider_template WHERE provider='creatomate' AND provider_template_id IN (<3 ids>);` — tags cascade via FK `ON DELETE CASCADE`; families + static siblings untouched. Recorded in the ledger `rollback` column.

## Next (separate future gates)
Promotion is a later lane: **video-lane governed smoke render → PK visual approval → client_assignment + visual_approval proof_event + enable** (each PK-gated). The 1:1 sibling of the quote card, the T1 photo-carousel variant, and the T4 photo body remain unbuilt (need the b-roll / governed-background supply lane).
