# S1 — M14: WS-5 Calibration-Backfill Inventory (Lane B sizing) (v1)

**Lane:** control-tower watch-week diagnostics bundle (T1, strictly read-only), per PK watch ruling
v6.140 (`docs/briefs/cgu-final-control-tower-watch-ruling-v1.md`). PK authorized the bundle in-chat
2026-08-05 ("run the diagnostic"). Docs-only output, version-less — no register edit, no DB write,
no schedule/cap change, no deploy.
**Read date:** 2026-08-05, live reads against Supabase project `mbkmaxqhsohbtwsqolns`.
**Governing context:** CGU Final must-have M14 (`docs/briefs/creatomate-global-ultimate-final-delta-audit-v1.md:189-192,476-478,553`) — `ws5-production-template-calibration-backfill`. WS-5 Phase 1's
seven outcomes (calibration coverage · field-shape rules · generation-time enforcement ·
render-time bounds enforcement · graduation enforcement · **existing-template backfill** ·
change invalidation) landed the shape + RPCs + one fully-worked example (kinetic, `9ad024cc`);
M14 is the backfill of everything else. This is the M11a-style definitive inventory that scopes
M14's lane count.

## "Production-selectable" — definition used, taken from the selector itself

`public.select_template()`'s own context object states its selectability rule verbatim:
`'selectable_definition': 'visually_approved+ AND passed visual_approval proof'`. Concretely
(`public.select_template` source, live-read): `scope='generic'` AND
`status IN (smoke_rendered, visually_approved, platform_safe, client_enabled, production_proven)`
AND a `c.creative_template_client_assignment` row with
`assignment_status IN (visually_approved, client_enabled, production_proven)` AND a
`c.creative_template_proof_event` row (`proof_type='visual_approval', proof_status='passed'`)
attached to that assignment. This is a **(template × client)** property, not a template-only one
— the same template can be selectable for one client and not another. The inventory below is
deduplicated to distinct templates, with the qualifying client list named per row.

## The Lane-B backlog table

Live query joining `c.creative_provider_template` → `c.creative_template_client_assignment` →
`c.creative_template_proof_event` (selectability) → `c.creative_provider_template_field` /
`c.creative_template_platform_suitability` (constraint coverage). **20 distinct templates are
production-selectable today** across 4 clients (Property Pulse dominates — 18/20; CFW, Invegent,
NDIS-Yarns share 2 templates).

| Template | Brand exposure | Field constraints | Platform-suitability constraints | Coverage state | Risk note |
|---|---|---|---|---|---|
| `generic_kinetic_text_9x16_v1` (`9ad024cc`) | PP only | 26/26 populated — 10 `probe_calibrated`, 8 `declared_from_source`, 0 TBC | 26/26 populated | **Calibrated (evidenced)** | Shape+values are the most complete of any template, but **no generation-time consumer exists yet** — dark, pre-graduation (own named gap: "kinetic has no governed worker branch yet"). Zero live enforcement despite full calibration. |
| `generic_market_insight_card_1x1_v1` | **CFW, Invegent, NDIS-Yarns, PP (4 brands)** | 36/36 rows carry the constraints envelope; of 8 `text_limits` triples, **6 are `to_be_calibrated` placeholders, 2 `declared_from_source`, 0 probe-evidenced** | 36/36 populated | **Declared-only (shape captured, values mostly TBC)** | Highest brand exposure of any uncalibrated-value template. Image-worker (the renderer for this static card) has **zero `text_limits` reads anywhere in its source** — even the 2 declared-from-source limits are not enforced at generation time today. |
| `generic_quote_card_1x1_v1` | **CFW, Invegent, NDIS-Yarns, PP (4 brands)** | 32/32 rows carry the envelope; of 5 `text_limits` triples, **4 `to_be_calibrated`, 1 `declared_from_source`, 0 probe-evidenced** | 32/32 populated | **Declared-only (shape captured, values mostly TBC)** | Same 4-brand exposure and same "shape exists, values and enforcement don't" gap as market_insight_card. |
| `video_stat_reveal_9x16_v2` | NDIS-Yarns, PP | 36/36 populated — **11/11 `text_limits` triples are `probe_calibrated`** (best-evidenced values of any template) | **0/36 — zero suitability rows carry constraints** | **Partial — field fully calibrated, platform/composition bounds absent** | Only template with a **live generation-time enforcer**: `video-worker/b1_video_stat.ts` reads `text_limits.max_chars` for the EyebrowText field and throws (not truncates) on violation; `ai-worker/stat_envelope.ts` enforces the same triple shape upstream for AI-authored stat copy. But safe-zone/duration/aspect bounds (the platform-suitability half of WS-5's design) are entirely missing — video format, so caption-safe-zone risk is real and unmitigated by the registry. |
| `AU_generic_national_Suburb_9:16_V1` | PP only | 0/12 | 0/12 | **None** | Non-standard naming (colon in template name) vs the `generic_*_v1` convention — worth a name-hygiene note, not scored further here. |
| `generic_announcement_card_1x1_v1` | PP only | 0/28 | 0/28 | None | — |
| `generic_auction_snapshot_card_1x1_v1` | PP only | 0/40 | 0/40 | None | Largest field surface (40) of any zero-coverage template — highest backfill effort if scoped. |
| `generic_before_after_card_1x1_v1` | PP only | 0/40 | 0/40 | None | Tied-largest field surface (40). |
| `generic_carousel_body_1x1_v1` | PP only | 0/18 | 0/18 | None | Carousel family — PP carousel is the only governed-live carousel path (per CLAUDE.md); text overflow here is a live-cell risk. |
| `generic_carousel_closing_1x1_v1` | PP only | 0/15 | 0/15 | None | Same carousel-family note. |
| `generic_carousel_cover_1x1_v1` | PP only | 0/21 | 0/21 | None | Same carousel-family note. |
| `generic_linkedin_landscape_card_1200x628_v1` | PP only | 0/18 | 0/18 | None | Platform-specific aspect (1200×628) with zero suitability rows — no captured safe-zone for LinkedIn's own crop. |
| `generic_listicle_card_1x1_v1` | PP only | 0/44 | 0/44 | None | Largest field surface (44) in the entire selectable set. |
| `generic_news_summary_card_1x1_v1` | PP only | 0/36 | 0/36 | None | — |
| `generic_portrait_feed_card_4x5_v1` | PP only | 0/24 | 0/24 | None | — |
| `generic_stat_hero_card_1x1_v1` | PP only | 0/32 | 0/32 | None | — |
| `generic_story_static_card_9x16_v1` | PP only | 0/14 | 0/14 | None | — |
| `generic_testimonial_card_1x1_v1` | PP only | 0/32 | 0/32 | None | — |
| `generic_youtube_thumbnail_16x9_v1` | PP only | 0/14 | 0/14 | None | — |
| `Stat Reveal 9×16 — Governed AV v2` | PP only | 0/3 | 0/3 | None | Only 3 field rows of any selectable template — small surface, but non-standard display name (em-dash, "Governed AV") suggests a legacy/naming-variant row worth a structural-diff check before backfill, not just a straight calibration pass. |

## Summary counts

- **20/20 production-selectable templates** inventoried.
- **1/20** fully field-calibrated with render-evidence (`generic_kinetic_text_9x16_v1`) — but
  zero live consumer.
- **1/20** fully field-calibrated + has a live generation-time enforcer for at least one field
  (`video_stat_reveal_9x16_v2`) — but zero platform-suitability coverage.
- **2/20** have the constraints shape captured but the numeric limits are 75–80% placeholder
  (`generic_market_insight_card_1x1_v1`, `generic_quote_card_1x1_v1`) — these carry the highest
  brand exposure (4 brands each) of the entire set, and neither has a generation-time consumer.
  **This directly refutes/refines the CGU Final delta audit's framing of these two as "carrying
  live constraints today" alongside kinetic** (`creatomate-global-ultimate-final-delta-audit-v1.md:192`) — the constraints *envelope* exists, but the values inside are mostly uncalibrated and
  nothing enforces them at generation time. Recorded here as a correction, not smoothed over.
- **16/20 (80%)** have zero constraint coverage of any kind — the raw Lane-B backlog. Combined
  field surface across these 16: 495 fields.
- **Generation-time enforcement, system-wide:** live in exactly two files
  (`supabase/functions/ai-worker/stat_envelope.ts`, `supabase/functions/video-worker/b1_video_stat.ts`), both scoped to the `video_short_stat` family. **`image-worker` — the renderer for every
  static card in this table, including the two 4-brand "declared" templates — contains zero
  `text_limits` reads anywhere in its source.** Backfilling the registry values alone will not
  produce enforcement for the image-card family without a matching image-worker consumer, which
  is a separate build (WS-5's own "generation-time enforcement" outcome, not yet extended past
  the stat family).

## What this gives Lane B (scoping input, not a scoping decision)

The backlog splits into three distinct workstreams, not one uniform pass:
1. **Value-calibration backfill** for the 2 shape-captured-but-TBC templates (market_insight,
   quote_card) — reuse the kinetic probe-render methodology, ~9–13 limit-triples between them.
2. **Shape-capture-from-zero** for the 16 uncalibrated templates — reuse the `record_tmr_template_field`/`set_tmr_field_constraints` RPC path already built and proven; effort scales with the
   495 combined fields, PP carousel family and the two 40-field/44-field cards being the largest.
3. **Generation-time enforcement build-out** for image-worker (currently has zero `text_limits`
   consumption) and platform-suitability enforcement generally (currently zero live consumers
   anywhere, including for kinetic and video_stat_reveal) — this is infrastructure, not per-
   template backfill, and blocks all 20 rows from ever being *enforced* regardless of how many
   get calibrated.

No lane was scoped, split, or started by this read — the table above is the inventory only.

## Unknowns / not verified in this read

- Whether `generic_market_insight_card_1x1_v1` / `generic_quote_card_1x1_v1`'s remaining
  `to_be_calibrated` triples have probe renders already queued elsewhere (not checked — out of
  this read's scope).
- Platform-suitability enforcement consumers were checked by source-grep for `text_limits` only;
  a differently-named consumption path for the suitability half (safe-zone/duration/aspect) was
  not separately searched for and may exist under different naming — flagged, not assumed absent
  beyond what the grep covered.
- `Stat Reveal 9×16 — Governed AV v2`'s relationship to `video_stat_reveal_9x16_v2` (near-identical
  purpose, different id/name/field-count) was not investigated — possible legacy/duplicate pair,
  named as a question rather than resolved here.

**No template row, field row, suitability row, or assignment was modified by this read. All
queries were `SELECT`-only.**
