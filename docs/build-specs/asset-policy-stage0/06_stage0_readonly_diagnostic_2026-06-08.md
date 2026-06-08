# Stage 0 read-only diagnostic — 2026-06-08

**STATUS: DIAGNOSTIC OF RECORD (read-only). Recommendation = C (continue with existing evidence; hold 0A; keep OBS foundation dormant).**

This is the dated record of the Stage 0 asset-policy diagnosis performed **entirely from existing production evidence** (read-only SQL against production `mbkmaxqhsohbtwsqolns`). No observer, read-path, CDC, or OBS 0A build was used or required. It answers the four "answerable today" Stage 0 questions (Q1/Q3/Q5/Q7) and records the recommendation that the OBS 0A observer remains **not currently justified**.

Provenance: produced by CCH; method = read-only `execute_sql` aggregates only; no mutation, no DDL/DML, no D-01. The OBS Stage 0 **foundation** (separate isolated project `invegent-obs-stage0`) remains **complete but dormant**; the **0A observer / read-path remains BLOCKED**.

---

## Read sources used (all read-only, production `mbkmaxqhsohbtwsqolns`)

`information_schema.columns` (column verification); `c.client` + `c.client_format_config` (config presence + bypass join); `m.post_publish` ⋈ `m.post_draft` (realized per-platform format distribution); `t.platform_format_mix_default` where `is_current` (intended mix); `m.post_draft` ⋈ `m.slot` (slot-default vs advisor); status rollups across `m.post_draft`, `m.ai_job`, `m.post_publish_queue`, `m.post_render_log`, `m.post_publish`. No token/secret columns were read.

---

## Q1 — Format-decision divergence — CONFIRMED (confidence High for FB/YouTube, Medium for LI/IG)

The two-decision-point model (slot-layer default → advisor re-decision) is confirmed empirically on slot-origin drafts (`post_draft.slot_id IS NOT NULL`):

| Platform | Slot-origin drafts | Slot default (`pref1`) set? | Advisor overrides slot default | Note |
|---|---|---|---|---|
| YouTube | 67 | All 67 non-null (hard-coded avatar) | **51 (76%)** | advisor keeps avatar only ~24% |
| Facebook | 156 | All non-null | 68 (44%) | advisor agrees 56% |
| LinkedIn | 164 | 150/164 null | 117 "override" | mostly advisor filling an empty default |
| Instagram | 142 | 129/142 null | 127 "override" | same — empty default, not contradiction |

**Finding:** YouTube hard-codes `video_short_avatar` as the slot default for every slot, then the advisor overrides it ~76% of the time — the mechanism behind the realized YouTube mix. `slot.format_chosen` tracks the slot-layer default (YouTube `chosen` differs from `pref1` only twice), so **`format_chosen` does not capture the advisor's final decision — `recommended_format` is the truer signal.** LinkedIn/Instagram set no slot default, so their high "override" counts are the advisor populating an empty field, not contradicting intent.

**Limitation:** LI/IG "override" is inflated by null defaults; the meaningful override signal is Facebook (44%) and YouTube (76%).

---

## Q3 — Platform format-mix divergence — CONFIRMED, with a major correction

**Correction to a prior working assumption: YouTube is NOT 100% avatar at the realized-output level.** Realized published vs intended (`platform_format_mix_default`, `is_current`):

| YouTube format | Intended % | Realized % (published) |
|---|---|---|
| video_short_kinetic | 30 | 33.8 |
| video_short_stat | 20 | 25.4 |
| **video_short_avatar** | **10** | **19.7** |
| video_short_kinetic_voice | 25 | 12.7 |
| video_short_stat_voice | 15 | 8.5 |

Avatar runs ~2× intended (not 10×); voice variants under-produced; non-voice kinetic/stat over-produced. **Moderate** divergence, not severe. Confidence Medium-High (YouTube is video-only, so `recommended_format` = realized asset; small n = 71).

Other platforms:
- **Instagram — strong divergence (Medium-High):** realized ≈ 98% `image_quote` / 2% carousel, vs an intended mix that is carousel/video/animated-dominant. The intended IG mix lists formats IG cannot ship (`animated_*` unpublishable) — part of the "intent" is structurally unshippable.
- **LinkedIn — divergence (Medium):** realized 61% text / 25% image_quote / 8% carousel vs intended 40% carousel / 20% text. Driven by LinkedIn publisher capability (text-dominant), not advisor choice.
- **Facebook — Low confidence:** 45.8% of FB-published drafts have null `recommended_format` (legacy pre-advisor drafts), which muddies the comparison.

**Key limitation (load-bearing):** `recommended_format` is a **draft-level** attribute. For YouTube/IG it equals the realized asset; for cross-postable FB/LinkedIn drafts the realized per-destination asset can differ from the draft's format. Per-destination realized format is the one genuinely thin spot in the evidence.

---

## Q5 — Client-preference adherence — CONFIRMED: config is NOT an enforced gate (confidence High)

| Client | Config rows | Published drafts w/ format | Produced format NOT in enabled config |
|---|---|---|---|
| ndis-yarns | 9 (avatar absent) | 238 | 5 (avatar) |
| property-pulse | 9 (avatar absent) | 249 | 9 (avatar) |
| care-for-welfare | **0** | 65 | **65 (100%)** |
| invegent | **0** | 74 | **74 (100%)** |

**Finding:** `client_format_config` is **not consulted as a live gate.** Two active clients (CFW, Invegent) produce 139 published drafts with zero config rows — confirming zero-config = "all buildable allowed," not "deny all." NY/PP output is ~96–98% coincidentally aligned with their 9 enabled formats, but both produce avatar Shorts their config does not list — proving the live path can and does produce formats absent from config. Config rows also carry null `platform` (format-level only).

---

## Q7 — Terminal / eligibility / failure geometry (confidence High)

- **AI generation healthy:** `ai_job` 2080 succeeded / 24 dead (98.9% success); no stuck `queued`/`pending`. Minor telemetry gap: 11 of 24 dead jobs have no `dead_reason`.
- **Draft funnel:** published 559 / approved 499 / rejected 447 / voided 360 / dead 279 / draft 15. (The 499 approved-not-published is largely website-destined + legitimate, not "stuck.")
- **Image:** pending 1292 / generated 614 / skipped 252 / failed 1 — the large "pending" pile is mostly the inert default on non-image/text/rejected drafts (only 1 true failure).
- **Video:** published 71 / failed 17 / archived_stale 15 / generated 2 (draining) / pending 6 — matches the known YouTube arc (17 failed = onboarding debt + non-recoverable; 15 soft-retired).
- **Publish queue:** dead 444 (DLQ audit, retained by design) / purged 131 / published 122 / queued 23 (active) / failed 3 / skipped 2 — healthy; small active backlog.
- **Publish attempts:** 892 published / 269 failed (historical, largely the known err-368 + token-casualty eras).
- **Render log:** 1411 succeeded / 56 failed, **`render_engine` = creatomate for all 1467 rows** (HeyGen renders write no row here).

---

## Confirmed production divergences

1. YouTube slot-default (avatar, hard-coded) vs advisor decision — ~76% override (by design, two-layer).
2. YouTube realized avatar share ~2× intended (19.7% vs 10%); voice variants under-produced.
3. Instagram realized ≈ all `image_quote` vs an intended mix that includes IG-unshippable formats.
4. LinkedIn realized text-dominant vs intended carousel-dominant (publisher-capability driven).
5. `client_format_config` is not enforced — zero-config clients publish freely; configured clients publish formats absent from config.

---

## Evidence gaps (what existing data cannot answer)

- **HeyGen provider attribution + cost** — render log is Creatomate-only; HeyGen renders write no `post_render_log` row and no `credits_used`. (Cost is unrecoverable; the v0.5.1 spec already classes it permanently `unknown_unavailable`.)
- **Per-destination realized asset type** for cross-posted FB/LinkedIn drafts — `recommended_format` is draft-level.
- **Point-in-time policy provenance** — nothing snapshots which `is_current` mix/config version governed a past draft.

---

## Conclusion — residual gaps do NOT currently justify reduced 0A

Every residual gap is a **source-emission** gap, and an external read-only observer cannot manufacture data the source never emits:

- **HeyGen cost/provider** → fixed by instrumenting the **HeyGen worker** (write `post_render_log` rows + credits), not by an observer.
- **Per-destination realized format** → fixed by the **publishers** writing the realized format onto `post_publish`, not by external re-derivation.
- **Point-in-time policy provenance** → fixed by a small **fill-time snapshot** on the draft, not necessarily an isolated observer + read-path.

A reduced 0A would still only *read* these tables; if the source doesn't emit the datum, 0A captures `unknown_unavailable`. So 0A's marginal value over a SQL pass is governance/longitudinal record-keeping — real, but not what closes these gaps.

---

## Recommendation: C — continue with existing evidence; hold 0A; keep OBS foundation dormant

The four diagnostic questions are answered from existing production evidence at usable confidence, and one prior assumption ("100% avatar") has been corrected. The genuine residual gaps are source-instrumentation gaps that 0A cannot close — so **reduced 0A is not currently justified.**

If anything is built next, the higher-value, lower-risk move is small **source-side telemetry** — HeyGen render-logging; publisher realized-format write; fill-time policy snapshot — each as its own separately-gated plan (concrete plan → D-01 → PK exact-phrase approval), **not** an isolated observer + read-path.

**Standing gate state:** the OBS Stage 0 **foundation** remains complete but **dormant** (isolated project `invegent-obs-stage0`; production untouched; D-01 `fd3e519a` closed `completed`). The **0A observer / read-path remains BLOCKED** — any 0A work requires a new concrete plan + new D-01 + PK exact-phrase approval.
