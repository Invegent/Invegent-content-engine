# cc-0073 — Decision Packs A / B / C

**Created:** 2026-07-24 Sydney
**Author:** chat (S5 — Asset-Gap Drain)
**Status:** decision packs — awaiting PK rulings
**Parent brief:** `docs/briefs/cc-0073-backgrounds-only-asset-gap-drain.md` (Gate 1 accepted)
**Mutations performed:** **NONE.** No promotion, no assignment, no policy row, no ledger write, no
harvest, no upload, no template change, no deploy, no commit, no register version, no push.
**Classification frozen and verified unchanged:** 8 ledger rows, 4 open — the three carousel rows
remain `(assignment, unassigned)`, the PP YouTube row remains `(platform_config, misconfigured)`.

**Visual review set:** `_harness/cc0073_packA_contactsheet/`
· `contact_sheet_raw.jpg` (1:1 centre crops — how a 1080×1080 card frames each)
· `contact_sheet_as_rendered.jpg` (the same with the resolver's **actual** scrim applied)
· `integrity_report.json` · the nine source JPEGs.

**Free integrity result:** all **8** shared assets fetched from the live public bucket hash-match
their recorded `asset_meta.sha256` **exactly** (see `integrity_report.json`). Proof-matrix item P5 is
therefore already discharged for the existing shared pool.

---

# PACK A — CFW visual suitability

## A0. The two rulings, deliberately separated

Per the directive, these are **two independent decisions**. They are presented separately because
the first determines whether the second buys anything at all.

> **RULING A1 — POLICY (enablement).** What `pool_policy` does CFW get?
> **RULING A2 — ASSETS (promotion).** Which specific shared assets get promoted and allowlisted?

**Why they must not be bundled.** `resolve_slot_assets` v1.2 consults the shared pool under
`client_preferred` **only when the client's own eligible list is empty**:

```
(v_pool_policy = 'client_preferred' AND jsonb_array_length(v_bg_true) = 0
                                    AND jsonb_array_length(v_bg_needs) = 0)
```

CFW has exactly **one** eligible client asset (`bg_cfw_brand_texture_navy_waves`). So under
`client_preferred`, that one asset suppresses the entire shared pool and **CFW's rotation stays at 1
no matter how many shared assets A2 promotes.** Promotion without the right policy is a no-op for CFW.

## A1. Suitability criteria — named BEFORE they are applied

Mechanical eligibility (the resolver's predicate) is necessary and **not** sufficient. For a
**care / welfare** brand a background must clear all six:

| # | Criterion | Why it matters for care/welfare specifically |
|---|---|---|
| **C1** | **No false sector implicature.** The image must not imply a service the client does not provide. | A care provider is not a real-estate agency, a landscaper, or a tech firm. A house or an office tower silently rebrands them. This is the criterion that most often fails while eligibility passes. |
| **C2** | **Dignity-neutral and non-clinical.** No institutional, austere, or clinical read. | Care/welfare audiences include service users. Institutional imagery (bare concrete, corridors) evokes the institutional-care history the sector actively distances itself from. |
| **C3** | **Person-free and identity-free.** | Disability/care context makes any depicted person sensitive information (OAIC). Standing policy: NDIS Phase 2 CLOSED, Phase 3 HELD. Nothing here presumes either. |
| **C4** | **Text legibility at the scrim production actually applies.** Headline and secondary line must be comfortably readable. | Non-negotiable — and see **A4**, where this criterion fails far more widely than the metadata suggests. |
| **C5** | **Brand-palette compatibility.** Should sit with CFW's deep-navy identity, not fight it. | Strong saturated greens beside a navy logo read as a different brand. |
| **C6** | **Warm or calm tone; never cold, corporate, or transactional.** | Tone is the brand promise in a care context. |

## A2. Judgment, applied — every fenced candidate

Suggestive only. **PK's visual verdict is the only deciding act.**

| # | Asset | C1 sector | C2 dignity | C3 person-free | C4 legible @40% | C5 palette | C6 tone | **Verdict for CFW** |
|---|---|---|---|---|---|---|---|---|
| S1 | Soft blue gradient | ✅ abstract | ✅ | ✅ | ⚠️ **high-key; white text weak** | ✅ blue family | ✅ calm | **SUITABLE — conditional on A4** |
| S2 | Neutral concrete texture | ✅ abstract | ⚠️ **reads institutional/austere** | ✅ | ⚠️ mid-grey, marginal | ➖ neutral | ⚠️ cold | **MARGINAL — recommend hold** |
| S3 | Soft grey bokeh | ✅ abstract | ✅ | ✅ | ✅ **darkest of the set; best contrast** | ✅ neutral | ✅ soft | **SUITABLE — strongest candidate** |
| S4 | Abstract wall & sky | ✅ abstract | ✅ | ✅ | ⚠️ pale wall under headline | ✅ sky-blue | ✅ clean | **SUITABLE — conditional on A4** |
| S5 | Contemporary home exterior | ❌ **reads real-estate/housing** | ✅ | ✅ | ❌ busy; headline collides with foliage | ❌ strong greens | ➖ | **NOT SUITABLE for CFW** |
| S6 | Modern glass office tower | ❌ **reads corporate/commercial** | ⚠️ cold | ✅ | ❌ bright sky where headline sits | ➖ | ❌ corporate | **NOT SUITABLE for CFW** |
| S7 | Landscaped formal garden | ⚠️ **reads landscaping/garden services** (visible spade) | ✅ | ✅ | ❌ busy, bright greens | ❌ saturated green | ✅ natural | **NOT SUITABLE for CFW** |
| S8 | Data-centre server | ❌ tech | ⚠️ cold | ✅ | ✅ | ❌ teal | ❌ technical | **NOT SUITABLE** (also Invegent-allowlisted) |

**Result: 3 clearly suitable (S1, S3, S4), 1 marginal (S2), 4 unsuitable.** The unsuitable ones are
not defective — they were sourced for a property/tech context and they are correct there. This is
precisely why "mechanically eligible" and "right for the brand" are different questions.

## A3. The arithmetic — promotion alone does not reach the floor

| Path | CFW eligible pool |
|---|---|
| Today | **1** |
| `best_fit` + promote S1, S3, S4 | **4** |
| `best_fit` + promote S1, S2, S3, S4 | **5** |
| `client_preferred` + promote anything | **1** (unchanged — shared pool suppressed) |

**So F1 remains a genuine `governed_sourcing` item, and it is now precisely sized: 2–4 CFW-appropriate
backgrounds to clear a floor of 6.** Promotion is the cheap first half; sourcing is the necessary
second half. Neither alone suffices.

## A4. 🔴 Material finding — the shared pool was crop-proofed at a scrim production never applies

Every shared asset records `asset_meta.crop_proof = "pass_1x1_scrim62"` — proven readable at a **62%**
scrim. But `resolve_slot_assets` v1.2 hard-codes:

```
c_scrim_opacity_needs_scrim CONSTANT numeric := 48;
c_scrim_opacity_text_safe   CONSTANT numeric := 40;
```

All 8 shared assets carry `safe_for_text_overlay = 'true'` ⇒ production applies **40%**, never 62%.
**The text-safety proof was conducted at a density production does not use**, and
`contact_sheet_as_rendered.jpg` shows the consequence directly: S1, S4 and S6 have visibly weak white
headline contrast at 40%, and S5/S7 are unreadable over foliage. This is the
"declared control production never reads" failure mode, in a text-legibility guard.

**Remediation is data-only and inside this lane's shape** — no code change, no cc-0051 crossing.
`resolve_slot_assets` already honours a per-asset override, clamped 0–100:

```
v_scrim_override_txt := v_pick->>'scrim_override';   -- asset_meta.scrim_opacity_override
v_scrim_opacity := LEAST(GREATEST((v_scrim_override_txt)::numeric, 0), 100);
```

**Recommendation:** set `asset_meta.scrim_opacity_override = '62'` on every shared asset promoted for
CFW, so production matches the density the crop proof actually certified. This becomes a mandatory
condition of A2, not an optional nicety.

**Scope note:** this same mismatch applies to the one already-live shared asset (S8, Invegent). That
is Pack B's problem, flagged there — **not** silently fixed here.

## A5. Minimum safe rotation pool — recommendation and reasoning

`resolve_slot_assets` picks by FNV-1a hash of the seed (`post_draft_id`) modulo the eligible count —
**independent draws with replacement, no anti-repeat memory.** Consequences:

- Probability two consecutive posts repeat = **1/N**.
- Expected distinct backgrounds over a 30-day platform-month (CFW ≈ 12 renders/platform/month, from
  36 successful renders across 3 platforms in 30 days): `N·(1−((N−1)/N)^12)` → N=1: **1.0** ·
  N=4: **3.9** · N=6: **5.3** · N=10: **7.2**.

| Floor | Consecutive-repeat rate | Assessment |
|---|---|---|
| 1 (today) | **100%** | Every card identical. Not a rotation. |
| 4 | 25% | Minimum defensible; repeats roughly monthly-visible. |
| **6** | **17%** | **Recommended.** ~5.3 distinct per platform-month; no obvious sameness in a scroll. |
| 10 | 10% | Comfortable, but the sourcing cost is not yet justified at CFW's volume. |

> **RECOMMENDATION: floor of 6 eligible backgrounds per client per live platform** (facebook,
> instagram, linkedin). Absolute minimum 4; below 4 is not meaningfully a rotation.

**Honest limit:** because selection is memoryless, no pool size *guarantees* two consecutive posts
differ. A true anti-repeat guarantee needs resolver logic — **cc-0051 handoff, recorded, not actioned.**

## A6. Pack A — the two rulings

> ### RULING A1 — POLICY (enablement). Independent of A2.
> **Recommend: `best_fit` for CFW** (`allow_global_shared=true`, `allow_vertical_shared=false`).
> `best_fit` ranks client and shared assets together — CFW's brand navy stays in the pool *and*
> shared assets join it. `client_preferred` provably delivers nothing for CFW (§A0).
> Fully reversible: `DELETE` the single `c.client_asset_pool_policy` row.
> *Landing A1 alone changes CFW's live selection from 1 asset to 1 asset — the shared pool is still
> all fenced — so A1 is safe to land first and is independently testable.*

> ### RULING A2 — ASSETS (promotion). Independent of A1.
> **Recommend: promote S3 (soft grey bokeh), S1 (soft blue gradient), S4 (abstract wall & sky)** —
> allowlist widened to include CFW — **each with `scrim_opacity_override='62'` per §A4**.
> **Hold** S2 (institutional read). **Do not promote** S5, S6, S7 for CFW (false sector implicature).
> Per-asset PK visual gate; rollback = restore the prior fence values.

> ### Consequent: is D3 (CFW sourcing) still needed?
> **Yes.** A1+A2 reach **4**; the recommended floor is **6**. **Source 2–4 person-free, warm/calm,
> sector-neutral CFW backgrounds.** This is the lane's only confirmed `governed_sourcing` work.

---

# PACK B — Invegent rotation

## B1. Why the policy row already exists and Invegent STILL reaches exactly one background

Invegent is the **only** client with a `c.client_asset_pool_policy` row:
`client_preferred` · `allow_global_shared=true` · `allow_vertical_shared=false` ·
`policy_version='cc-0044-invegent-v1'`.

Trace, gate by gate:

1. Invegent has **0** client backgrounds ⇒ `v_bg_true` and `v_bg_needs` are both empty ⇒ the
   `client_preferred` condition is satisfied ⇒ **the shared pool IS consulted.** The policy row is
   working exactly as designed.
2. The resolver scans all 8 rows where `governance_scope = ANY('{global_generic}')`.
3. **7 are rejected on governance, not on fit:** `is_active=false` ⇒ `reason_code='inactive'`;
   `production_use_allowed=false` ⇒ `production_use_not_allowed`. They are `intake_candidate`.
4. **1 survives** — `0ba46053` (`bg_shared_datacentre_server`), `is_active=true`,
   `production_use_allowed=true`, `approval_status='governed'`, and its
   `allowed_clients=[93494a09…]` contains Invegent so it clears the allowlist gate.
5. Pool size **1** ⇒ seed-hash mod 1 ⇒ index 0 always.

**Conclusion: the constraint is not policy and not the resolver. It is that only one shared asset has
ever been promoted.** Live probe confirms all three platforms return
`Shared/Backgrounds/bg_shared_datacentre_server.jpg`, 0 alternatives.

## B2. ⚠️ The `client_preferred` trap — adding one Invegent asset makes things WORSE

Under `client_preferred`, the shared pool is consulted **only while the client list is empty**. The
moment Invegent gains its first client background, the condition fails and **the entire shared pool
is suppressed** — Invegent would go from 1 shared → 1 client, still **1**, and would lose access to
every shared asset promoted in the meantime.

This is counter-intuitive and it is a live trap sitting directly in front of any Invegent sourcing
work. **Any lane that gives Invegent a client-scoped background must move Invegent to `best_fit`
first, or it will silently reduce capability.** Same mechanism as CFW (§A0), opposite direction.

## B3. Governed candidates that exist today

| Asset | State | Reachable by Invegent? |
|---|---|---|
| S8 Data-centre server | `governed`, active, allowlist=[invegent] | ✅ — the current sole pick |
| S1 Soft blue gradient | `intake_candidate`, fenced | ❌ promotion only |
| S2 Neutral concrete | `intake_candidate`, fenced | ❌ promotion only |
| S3 Soft grey bokeh | `intake_candidate`, fenced | ❌ promotion only |
| S4 Abstract wall & sky | `intake_candidate`, fenced | ❌ promotion only |
| S5 Contemporary home | `intake_candidate`, fenced | ❌ promotion only |
| S6 Glass office tower | `intake_candidate`, fenced | ❌ promotion only |
| S7 Landscaped garden | `intake_candidate`, fenced | ❌ promotion only |

All eight are person-free, Pexels-licensed, sha256-verified against the live bucket **today**,
crop-proofed, and carry an `image-reviewer` verdict (5× PASS, 3× PASS_WITH_NOTE).

## B4. Needs promotion vs needs sourcing — the Gate-1 distinction carried through

**Needs PROMOTION (already harvested · reviewed · hashed · crop-proofed — zero harvesting):**
Invegent is a B2B technology/consulting brand, so the sector-implicature test that excludes S5/S6/S7
for CFW does **not** exclude them here — corporate and architectural imagery is on-brand for Invegent.

- **Strong for Invegent:** S6 glass office tower · S1 soft blue gradient · S3 soft grey bokeh ·
  S2 neutral concrete · S4 abstract wall & sky (+ S8 already live) → **6 without sourcing anything.**
- **Weak for Invegent:** S5 contemporary home and S7 formal garden (residential/landscaping read,
  same C1 test, same outcome — wrong sector).

**Needs SOURCING: nothing, on current evidence.** Promotion alone reaches the recommended floor of 6
on every live platform. **F2 therefore stands as confirmed at Gate 1: Invegent is ELECTIVE, not a
true supply gap.** Brand-distinct Invegent sourcing is a preference call, not a capability gap — and
if PK elects it, §B2 must be honoured first.

## B5. Scrim carry-over

S8 also records `crop_proof=pass_1x1_scrim62` while production applies 40% (§A4). Invegent's live
card has been rendering at a scrim density its own proof did not certify. **Flagged, not fixed** —
it belongs to Ruling B2 below, at PK's discretion.

## B6. Platform coverage recommendation

Invegent's live platforms are **facebook, instagram, linkedin** (0 YouTube slots ever — see Pack C).
Shared assets carry `platform_scope = NULL` ⇒ eligible on all platforms ⇒ coverage is uniform and no
per-platform work is required. Note `platform_scope=NULL` raises the resolver's
`platform_scope_unbacked` warning; that is the existing convention for NDIS and CFW too, and this
lane proposes no change to it.

## B7. Pack B — the rulings

> ### RULING B1 — Invegent promotion set.
> **Recommend: promote S6, S1, S3, S2, S4** (allowlist including Invegent, or cleared to make them
> genuinely shared — see B3 note), taking Invegent from **1 → 6** with **zero sourcing**.
> Per-asset PK visual gate; rollback = restore prior fence values.

> ### RULING B2 — scrim correction for the Invegent pool.
> **Recommend: yes** — set `scrim_opacity_override='62'` on S8 and on every newly promoted asset, so
> rendered contrast matches the certified crop proof. Data-only; reversible by clearing the key.

> ### RULING B3 — Invegent-specific sourcing (D4).
> **Recommend: DO NOT ELECT.** No supply gap exists. If PK later wants brand-distinct Invegent
> imagery, **Invegent must move to `best_fit` first** or the first client-scoped asset will suppress
> the whole shared pool (§B2).

---

# PACK C — PP YouTube determination

## C1. The question: is static `image_quote` intended live production on YouTube?

**Answer: No. YouTube is intentionally video-only, by ratified evidence-cited product policy.**

## C2. Decisive evidence — `t.platform_format_mix_default` (`is_current=true`, effective 2026-04-22)

The governing format-mix policy allocates YouTube share as:

| Platform | Format | Share |
|---|---|---|
| youtube | video_short_kinetic | 30% |
| youtube | video_short_kinetic_voice | 25% |
| youtube | video_short_stat | 20% |
| youtube | video_short_stat_voice | 15% |
| youtube | video_short_avatar | 10% |
| | **TOTAL** | **100% — entirely video** |

**`image_quote` has no YouTube row at all.** By deliberate contrast the same table allocates
`image_quote` **30% on facebook**, **20% on instagram**, **15% on linkedin**, each with a cited
evidence source (Buffer 2026 / Hootsuite 2026). Static image is not an oversight on YouTube — it is
allocated everywhere it is wanted and **allocated 0% on YouTube on purpose**.

`c.client_format_mix_override` is **empty** — no client overrides this. The policy is uniform across
all four clients.

## C3. Corroborating demand evidence — `m.slot`

- **Future YouTube slots, all clients: 8 — every one video.** PP: `video_short_kinetic_voice` ×1,
  `video_short_kinetic` ×2, `video_short_stat` ×1. NDIS: `video_short_avatar` ×4.
  **Zero future YouTube slots request a static format.**
- **CFW and Invegent have never had a single YouTube slot** — the two clients whose backgrounds
  this lane would touch have no YouTube presence at all.
- Historical YouTube static fills are residual, not policy-driven: PP `image_quote` slots are dated
  **2026-04-27** (at the policy boundary) plus 8 slots on 2026-06-23/25 whose `format_preference` is
  the **empty array `{}`** — i.e. a fallback fill with no stated preference, not expressed demand.
  NDIS has exactly 2, both June. Nothing since 2026-06-25.

## C4. Reconciliation with the F4 finding

Gate 1 reported: `select_template(…, 'youtube', 'image_quote', …)` returns `fail_closed /
no_selectable_template` for **all four clients**, because no static template carries a `youtube`
row in `c.creative_template_platform_suitability`.

That finding is unchanged and correct. **Its interpretation now changes.** The missing suitability
rows are not a defect — they are **consistent with, and downstream of, the ratified format-mix
policy**. The registry is fail-closed in exactly the direction product intent points. The one
template that *does* carry a YouTube suitability row is `generic_youtube_thumbnail_16x9_v1`, under
`format_key='youtube_thumbnail'` — a separate, deliberate format.

> **RECOMMENDATION: record static `image_quote` on YouTube as an ACCEPTED NON-CAPABILITY, not a
> defect.** It is a deliberate product choice, evidenced by an `is_current` policy row with a cited
> source and by zero forward demand. **Open no template lane and no sourcing lane.** A gap that
> encodes a deliberate product decision is not work.

## C5. Consequences for the parent brief

- **F3 (PP `platform_scope` omits `youtube` on all 24 background rows) is CLOSED as correct-by-design.**
  Gate 1 held it behind F4; it now resolves cleanly — the fences match product intent. PP's
  background rows *should* exclude YouTube. **No action, and no ledger change.**
- **F4 is downgraded** from "dominant finding / larger blast radius than the backgrounds gap" to
  **accepted non-capability**. This removes the largest apparent item from the lane. It also means
  **no cc-0051 handoff is warranted on F4's own account.**
- The PP YouTube ledger row `22d3df93` is `video_short_stat` — a **video** row, out of this lane's
  scope in either reading. Its classification `(platform_config, misconfigured)` stays frozen and
  untouched, exactly as directed.

## C6. Recorded handoff to cc-0051 (reasoning only — no change authored)

The classifier produces **no ledger row** for static `image_quote` on YouTube even though it is
universally unreachable. On this pack's evidence that silence is **correct behaviour**, since there
is no genuine demand to strand. Recorded so cc-0051 has the reasoning, not because a change is
implied. Also carried forward from Pack A: **memoryless seed-hash selection cannot guarantee
non-repetition at any pool size** — a resolver-design question owned by cc-0051.

## C7. Pack C — the ruling

> ### RULING C1 — YouTube static template gap.
> **Recommend: record as ACCEPTED NON-CAPABILITY.** No template lane, no suitability rows, no
> sourcing, no ledger mutation. Close F3 as correct-by-design. Downgrade F4 from defect to
> accepted limitation. Revisit only if `t.platform_format_mix_default` is amended to allocate a
> static share on YouTube — that policy row is the correct trigger.

---

# Consolidated decision sheet

| Ruling | Subject | Recommendation | Reversal |
|---|---|---|---|
| **A1** | CFW pool policy | **`best_fit`** — `client_preferred` provably yields nothing for CFW | DELETE the policy row |
| **A2** | CFW promotion set | Promote **S3, S1, S4** (+ hold S2); **not** S5/S6/S7 — false sector implicature; all with `scrim_opacity_override='62'` | restore prior fence values |
| **A3** | Rotation floor | **6** per client per live platform (absolute minimum 4) | n/a — a standard, not a change |
| **A4** | CFW sourcing (D3) | **Proceed** — source **2–4** person-free, sector-neutral, warm/calm CFW backgrounds to close 4 → 6 | fenced-first intake; nothing auto-promotes |
| **B1** | Invegent promotion set | Promote **S6, S1, S3, S2, S4** → **1 → 6, zero sourcing** | restore prior fence values |
| **B2** | Scrim correction | Set `scrim_opacity_override='62'` on S8 + all newly promoted | clear the key |
| **B3** | Invegent sourcing (D4) | **Do not elect** — no supply gap; and `best_fit` must precede any client-scoped asset | n/a |
| **C1** | YouTube static | **Accepted non-capability** — no lane; F3 closed correct-by-design; F4 downgraded | n/a |

**Net effect if all recommendations are accepted:** CFW 1 → 6 (promotion + a small, precisely sized
sourcing batch) · Invegent 1 → 6 (promotion only, no sourcing) · PP and NDIS unchanged (already
healthy) · the largest apparent gap (YouTube) removed from the backlog as a deliberate product
choice rather than absorbed as work · one previously invisible defect surfaced and fixed by data
alone (the 62%-proof / 40%-production scrim mismatch).

**Still forbidden until PK rules:** every promotion, the policy row, all sourcing, every ledger
write, all commits, register versions and pushes.
