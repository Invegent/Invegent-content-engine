CLAIMED · static-template-graduation-batch1-v1 · main-checkout `C:\Users\parve\Invegent-content-engine` · docs-only lane · 2026-07-29

# Result — Static Template Graduation Batch 1 (readiness + proposal)

**Brief file:** `docs/briefs/static-template-graduation-batch1-gate1-brief-v1.md`
**Executed by:** Claude Code (orchestrator + db-rls-auditor)
**Completed:** 2026-07-29 Sydney

---

## 1. Result status

`Complete` — as scoped by PK's Gate-1 decision (readiness + proposal only, no code/commit). This is
**not** a graduation: none of the 3 candidates render today, and this lane does not change that. It
is the evidence + scoped proposal PK asked for, ending at a fresh Gate-1 decision point for whichever
follow-on code lane PK elects.

## 2. Commit(s)

N/A — no commits. Read-only evidence gathering + this docs-only result.

## 3. What was confirmed

Per PK's Gate-1 answers: scope = readiness + proposal only; candidates = the proposed default
(`generic_stat_hero_card_1x1_v1`, `generic_announcement_card_1x1_v1`, `generic_carousel_cover_1x1_v1`).

## 4. Per-candidate readiness dossier (rungs 1, 3, 4)

All data below is a live `db-rls-auditor` read, 2026-07-29, project `mbkmaxqhsohbtwsqolns`. Full
per-field dossiers are in the agent transcript; this table is the graduation-ladder-relevant summary.

| Candidate | Rung 1 (exists) | Rung 3 (dims/output parity) | Rung 4 (asset resolution) | Rung 6 (visual approval) |
|---|---|---|---|---|
| `generic_stat_hero_card_1x1_v1` (`54b305c8…`) | ✅ live, `status=smoke_rendered`, PP assignment `visually_approved` | ✅ 1080×1080 static, matches `image_quote` static contract | ⚠️ **partial** — `resolve_slot_assets` returns `ok`, but only because `BackgroundSolid` is a static shape (`dynamic=false`); **no `Background.source` is ever produced** — only `Logo` resolves | ✅ **already satisfied** — `visual_approval` proof_event, passed, 2026-07-03, evidence `_harness/pp_proof_wall/05_stat_hero_1x1.jpg` |
| `generic_announcement_card_1x1_v1` (`a75e7139…`) | ✅ live, same status/assignment shape | ✅ 1080×1080 static | ✅ **full** — real dynamic `Background` image field resolves live to `bg_pp_open_home_entry`, `Scrim.opacity=48` applied, `Logo` resolves | ✅ **already satisfied** — proof_event passed 2026-07-03, evidence `_harness/pp_proof_wall/03_announcement_1x1.jpg` |
| `generic_carousel_cover_1x1_v1` (`c9a59faa…`) | ✅ live, same shape, `format_key=carousel` | ✅ 1080×1080 static, matches `carousel` contract (3 platform-suitability rows: fb/ig/li, no website/card row — consistent with a carousel-only format) | ✅ **full** — real dynamic `Background` resolves to the same `bg_pp_open_home_entry` asset, `Scrim.opacity=48`, `Logo` resolves | ✅ **already satisfied** — proof_event passed 2026-07-03, evidence `_harness/pp_proof_wall/12_carousel_cover_1x1.jpg` |

**Rung 6 finding resolves brief open question #4:** all three candidates (and both carousel partners,
`body`/`closing`) already carry a passed `visual_approval` proof_event from PK's own 2026-07-03 proof-wall
review, each with a concrete `evidence_reference` (a local render file or Creatomate render id). **No new
render mechanism is needed to satisfy rung 6** — it was already cleared 26 days ago and simply never
surfaced as "graduation progress" because nothing downstream (a real render) was ever attempted.

## 5. Rung 2 — field-contract compatibility (the core finding, differentiated per candidate)

Confirmed by direct code read (`supabase/functions/image-worker/b1_production.ts:199-241,301-329`),
cross-checked against the live field-contract dossier above. **The gap is NOT the same size or shape
for all three candidates** — this matters for scoping any follow-on code lane:

### 5.1 `generic_announcement_card_1x1_v1` and `generic_carousel_cover_1x1_v1` — single, narrow blocker

Both have a **real dynamic `Background` image field** (`required_for_render=true`), so
`resolve_slot_assets` already produces a non-empty `Background.source` + `Logo.source` — the two
values `buildTmrRenderPlan` hard-requires at line 328 regardless of winner. **The only missing piece
is a `TMR_WINNER_TEXT_FIELDS` entry** mapping each template's dynamic text fields to
`'<Element>.text'` keys, in exactly the same shape as the two existing entries:

- `generic_announcement_card_1x1_v1` needs: `Headline.text` (required), `Subtitle.text`, `CTA.text`,
  `Footer.text` — 4 text elements, all confirmed live on `c.creative_provider_template_field`.
- `generic_carousel_cover_1x1_v1` needs: `Headline.text` (required), `Subtitle.text`,
  `SlideNumber.text`, `CategoryBadge.text` — 4 text elements, confirmed live.

Both fit the exact pattern of the two existing entries (a pure function `(f: B1Fields) => Record<string,
string>`), and neither template's field contract shows an under-specified-geometry risk pattern like
`generic_market_insight_card_1x1_v1`'s known Headline/Subtitle overprint (cc-0033a) — but that
possibility is **not ruled out by this data-only pass**; a `TMR_WINNER_LAYOUT_GUARD` entry may or may
not be needed per candidate and can only be confirmed by an actual rendered preview once mapped (the
existing proof-wall renders were manual/pre-code-integration and would not have exercised this
worker's specific layout math).

### 5.2 `generic_stat_hero_card_1x1_v1` — a second, structural blocker beneath the mapping gap

This candidate's `Background` element is `BackgroundSolid`, a **static shape** (`dynamic=false`), not
a dynamic image field. Confirmed live: `resolve_slot_assets` for this template never attempts
Background resolution at all (`v_has_background` gates false), so `slot_resolution.modifications`
never contains a `Background.source` key. `buildTmrRenderPlan`'s line 328 unconditionally requires
`typeof backgroundUrl === 'string' && backgroundUrl` for **every** winner, with no branch for a
solid-background/no-image-background template — so **even with a `TMR_WINNER_TEXT_FIELDS` entry
added, this candidate would still throw `tmr_slot_resolution_incomplete` on every render attempt.**

This is a materially bigger, architecturally different fix than §5.1: it needs either (a) a new code
branch in `buildTmrRenderPlan` that accepts solid-background templates without requiring
`Background.source` (a real behavioral change to a fail-closed guard, needs its own review), or (b) a
Creatomate-template-side change turning `BackgroundSolid` into a real dynamic image field (not a code
change at all, but a provider-template edit outside this repo's control, plus a fresh field-contract
re-capture). **Recommend treating `generic_stat_hero_card_1x1_v1` as its own, later, more carefully
scoped follow-on — not bundled into the same code lane as the two single-blocker candidates.**

### 5.3 Carousel body/closing — same structural blocker as stat_hero_card (not part of this batch)

Cross-check confirms `generic_carousel_body_1x1_v1` and `generic_carousel_closing_1x1_v1` both use the
same static `BackgroundSolid` shape as stat_hero_card (not a dynamic Background field) — `resolve_slot_assets`
returns the identical Logo-only pattern for both. If a future lane wants the full 3-part carousel
(cover+body+closing) usable end-to-end, `body` and `closing` inherit §5.2's structural blocker, not
§5.1's narrow one — worth knowing before committing to "carousel" as a batch-2 unit.

## 6. Proposed code-change specs (for a future ef-builder T2 Gate 1 — NOT executed here)

Per PK's Gate-1 scope decision, this lane stops at a spec, not a diff or commit. Proposed additions
(field names/shape only, modeled exactly on the two existing entries in
`supabase/functions/image-worker/b1_production.ts:206-240`):

```
'generic_announcement_card_1x1_v1': (f) => ({
  'Headline.text': f.headline,
  'Subtitle.text': f.subtitle,
  'CTA.text': f.cta,          // NEW B1Fields member — not currently on the B1Fields type; confirm shape before building
  'Footer.text': f.footer,
}),
'generic_carousel_cover_1x1_v1': (f) => ({
  'Headline.text': f.headline,
  'Subtitle.text': f.subtitle,
  'SlideNumber.text': f.slide_number,     // NEW B1Fields member
  'CategoryBadge.text': f.category,       // reuse of the existing `category` member (market-insight already has CategoryBadge.text)
}),
```

`generic_stat_hero_card_1x1_v1` is **explicitly not proposed here** — per §5.2, a mapping alone would
not make it render; the structural `Background.source` requirement needs its own scoping decision
first (open question, §8).

Both proposed entries would need: (a) confirmation of whether either candidate's headline geometry
risks the cc-0033a overprint pattern (a `TMR_WINNER_LAYOUT_GUARD` entry, to be confirmed by an actual
render, not assumed); (b) the `B1Fields` type extended with any new members (`cta`, `slide_number`)
the mapping functions reference; (c) hermetic tests mirroring the existing 142-test suite's coverage
of the two current winners; (d) a real supervised render → draft → publish proof run per candidate
per the rungs 7-9 of the graduation ladder, before any `fit_status`/`assignment_status` promotion.

## 7. Files changed

**New:**
- `docs/briefs/static-template-graduation-batch1-gate1-brief-v1.md` (Gate-1 brief, approved)
- `docs/briefs/results/static-template-graduation-batch1-result-v1.md` (this file)

No code, migration, or registry-data files touched. No render, draft, or publish attempted. No
`fit_status`/`assignment_status`/`status` values mutated for any of the 5 templates examined (3
candidates + 2 carousel cross-check partners).

## 8. Open questions carried forward (for the next Gate-1)

1. **Follow-on code lane scope:** does PK want ONE ef-builder T2 lane covering both
   `generic_announcement_card_1x1_v1` and `generic_carousel_cover_1x1_v1` (the two single-blocker
   candidates, §5.1), with `generic_stat_hero_card_1x1_v1`'s structural fix (§5.2) deferred to its own
   separately-scoped lane? (Recommended by this result, not yet PK-decided.)
2. **`generic_stat_hero_card_1x1_v1`'s structural fix direction:** extend `buildTmrRenderPlan` to
   accept solid-background templates (a code-side behavioral change to a fail-closed guard), or treat
   its `BackgroundSolid` shape as a template-authoring defect to fix on the Creatomate side (turning it
   into a real dynamic image field, which would move it into the §5.1 narrow-blocker class)? This is a
   product/architecture call, not inferable from this data.
3. **Carousel framing (brief open question #3, still open):** is `generic_carousel_cover_1x1_v1` a
   meaningful graduation unit on its own, or does a usable carousel post require `body`+`closing` too —
   which, per §5.3, carry the SAME structural blocker as stat_hero_card, not the narrow one? If PK
   wants a full carousel, the realistic scope is closer to "2 structural fixes + 1 narrow fix," not "1
   narrow fix."
4. **Layout-guard risk for the two narrow-blocker candidates** — not assessable without an actual
   render; flagged as a required check inside whichever follow-on lane builds the mapping, not
   something this data-only pass can resolve.

## 9. Non-claims

- Not claimed: any of the 3 candidates can render today. None can — confirmed structurally blocked,
  differently for stat_hero_card than for the other two.
- Not claimed: the proposed field-mapping specs (§6) are final or tested — they are a starting spec
  for a future ef-builder lane, not reviewed code.
- Not claimed: rung 6 (visual approval) needed anything done in this lane — it was already satisfied
  2026-07-03, discovered rather than created by this pass.
- Not claimed: the carousel cover/body/closing coupling question is resolved — it is sharpened (§5.3)
  but still a named PK decision.

## 10. Stop condition

**Met.** Readiness dossier + differentiated gap analysis + scoped (unexecuted) code-change specs
delivered, per PK's Gate-1 scope decision. No further action without a fresh PK Gate 1 on one of the
open questions in §8.
