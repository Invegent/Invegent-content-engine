# Result — Lane 2 — Needs-Tweak Template Fixes → Re-render → Re-review

**Packet:** `docs/briefs/lane2-needs-tweak-fixes-packet.md` · **Completed:** 2026-07-04 Sydney (review + saves 2026-07-03)
**Status:** ✅ APPLIED + VERIFIED — **the ENTIRE 16-template generic library is now selectable (10 → 16); queue item 2 COMPLETE**

## 1. What happened

1. **Diagnosis split the 4 Lane-B needs-tweak units into three fix classes:** 2 genuine template edits (carousel closing: duplicate `Footer` removed; youtube thumbnail: `EpisodeNumber` relocated y=90%→35% out of the headline collision zone), 1 asset-pairing correction (market_insight: location-matched Perth background — template unchanged; durable rule stays the parked location-aware-v2 carry), 1 governance rule (testimonial: **TMR-GOV-TESTIMONIAL-1** ratified — verifiable source on record before render, visible source-marked attribution, no paraphrase, fail-closed absent a source record; mechanical enforcement = future carry).
2. **Before/after gallery → PK approved all four + ratified the rule.**
3. **Template saves:** Creatomate API has **no template-update endpoint** (verified: PATCH/PUT → 404) → PK paste-saved both fixed sources (persisted at `_harness/lane2_fix_previews/lane2_*_fixed_source.json`).
4. **Saved-template re-smokes: PIXEL-IDENTICAL to the approved previews** (mean abs diff 0.0 on both).
5. **Recording applied** (artifact `_harness/lane2-visual-approval-recording.sql`, sha256 `d005bfd7acef5adafe2cfd7ffae987f28e9a9723d15a36ff2113d91ef3887322`, PK hash approval with the winner-flip acknowledged): 6 assignment flips `proposed → visually_approved` + 6 evidence-cited proof events + closing `Footer` field-row retirement + in-transaction assert selectable==16. All fail-loud asserts passed.

## 2. Post-apply verification (ALL PASS)

| Check | Result |
|---|---|
| PP assignments `visually_approved` / `proposed` | **16 / 0** |
| New proof events (marker-scoped) | **6** |
| Closing `Footer` field row | **retired (0)** — registry mirrors the saved template |
| Live `select_template` default call | `ok`; **rejected[] = exactly ONE entry (B1 `wrong_scope`)** — zero generic rejections remain; alternatives 10 (11 survivors) |
| **Acknowledged winner flip** | default winner now `generic_market_insight_card_1x1_v1` (registry-order tiebreak); `quote_card.v1` intent still selects the quote card — verified live |
| Shadow rows | 17, untouched |

## 3. Reviews

db-rls-auditor `concerns` → zero must-fix (both acknowledge items closed: rollback `created_at` fixed in the final hash; **default-winner flip surfaced to and acknowledged by PK**; its verification incl. the necessity of the `generic_allowed` scope filter in the ladder assert — the B1 client assignment would otherwise inflate the count to 17). External review `partial` → escalated → **PK acknowledged and approved** (`review_id f754f7ab-acf3-4ebf-8e04-e65430ffbd0e`; triage: `runtime_verification_required` answered by the hermetic ranking tests + the post-apply live probe above + the fact that the selector's only caller is the idle S1 stamper; `policy_decision` = the winner flip, PK-accepted). security-auditor n/a (data-only).

## 4. Consequences downstream (recorded)

- Future S1 forward-shadow rows will record `market_insight` as the default would-have pick (shadow doing its job). 
- If PK ever prefers the quote card as default, that is a **ranking-policy tweak** (e.g. family-default preference) — a new carry, NOT a defect.
- Carries: mechanical testimonial source-guard enforcement (source-evidence field at selection) · location-aware selection v2 · scrim 48 (queue item 3, next) · rotation alignment (item 4) · P0 promotion review (item 5 — packet already prepared by a parallel session).

## 5. Boundaries held

No publish · no client_enabled/production_proven · no runtime/dashboard change · selector stays dark (only caller = idle stamper) · scrim untouched · rotation untouched · S0/S1 shadow rows untouched. Rollback standing in the artifact (proofs by marker · flips by status+ids · Footer re-insert with full pre-image incl. original `created_at`).
