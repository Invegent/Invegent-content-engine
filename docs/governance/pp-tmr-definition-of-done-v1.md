CLAIMED v5.46 · cc-0036 PP TMR Definition of Done · main-checkout C:\Users\parve\Invegent-content-engine · gate: PK Gate-1 ACCEPTED → register pointer (pending PK commit instruction) · 2026-07-10T06:05Z

# PP TMR — Definition of Done v1 (ACCEPTED)

**Accepted:** 2026-07-10 Sydney · PK Gate 1
**Source packet:** `docs/briefs/cc-0036-pp-tmr-definition-of-done.md`
**Status:** the DoD **of record**. Supersedes the retired phrase *"Ultimate TMR for Property Pulse is done"*.

---

## The three labels (PK ruling — the phrase they replace is retired)

| Label | Meaning | Status 2026-07-10 |
|---|---|---|
| **PP Static TMR Done** | `image_quote` is governed and production-ready | **NEARLY TRUE** — carries named; overprint carried (A-OQ1) |
| **PP Video TMR First Proof Done** | `video_short_stat` renders on a real governed PP draft | **FALSE** — zero real-draft governed renders (cc-0035 in flight) |
| **PP Ultimate TMR Done** | high-volume visual formats governed, defects resolved-or-carried, drift closed, safe to copy | **FALSE** — D4 / D5 / D6 open |

**cc-0035 alone cannot declare Ultimate done.** It satisfies Level B, a strict subset of Level D.

## Accepted decisions (PK, 2026-07-10 — all seven defaults, as-written)

| # | Decision | Accepted ruling |
|---|---|---|
| A-OQ1 | Overprint defect | **Named carry.** Static Done stands with the 7/17 defect enumerated; closure gated at **D5**, not Level A. It is a template-calibration bug with a known real fix (`max_lines: 3`), not a governance failure. |
| B-OQ1 | Music attribution | **Single-track determinism suffices, with a self-tripping tripwire.** `select_music('format','video_short_stat')` MUST return exactly 1 row. The day a 2nd track is approved, First Video Done **reverts** to requiring per-track attribution (`m.music_usage_event` wired). |
| C-OQ1 | Carousel (94 drafts/90d) | **IN-as-carry.** In scope for Ultimate; satisfiable by governed **or** explicitly carried. Not a Static/First-Video blocker. |
| C-OQ2 | Video formats in scope | **`video_short_stat` + `video_short_stat_voice`.** `kinetic`, `kinetic_voice`, `avatar` are **READINESS-ONLY carries** — `avatar` (49/90d) depends on the Character Model / Brand-Host lane and does not gate Ultimate v1. |
| C-OQ3 | Template proof bar | **Rotation set only.** Non-rotation templates may remain `visually_approved` **if fenced out of rotation**. |
| C-OQ4 | `visually_approved` sufficiency | **Only if provably unreachable** by the live resolver. Check: no `visually_approved` assignment is selectable by `select_template` for the governed platform set. |
| D-OQ1 | Ultimate targets | **D1–D7 adopted verbatim**, with **D4 / D5 / D6 as the three hard reconciliation gates**. |

## The exit test (machine-checkable — no criterion resolves by judgment)

**Level A — Static Done:** `c.client_creative_governance` (PP, `image_quote`) `enabled=true` · ≥1 governed render-log row with non-null `post_draft_id` AND `client_id` · FB PASS + IG PASS per the cross-platform matrix · LinkedIn carried (cc-0030) · carries enumerated (C1 geo-pairing · C2 scrim · C3 crop · C4 LinkedIn · **overprint 7/17, carried per A-OQ1**).

**Level B — First Video Proof Done:** `enabled=true` for `video_short_stat` · ≥1 governed video render-log row with non-null `post_draft_id` AND `client_id` and `variant_key='stat-reveal-9x16-video-v2'` · `select_music(...)` returns exactly 1 row (the B-OQ1 tripwire) · fail-closed exercised on a **real** draft (governed throw → `video_status='failed'` + render-log row, no legacy fallback).

**Level C — Visual scope:** governed set = {`image_quote`, `video_short_stat`, `video_short_stat_voice`}; carousel IN-as-carry; `kinetic` / `kinetic_voice` / `avatar` readiness-only.

**Level D — Ultimate Done:**
- **D1** every in-scope format `enabled=true`.
- **D2** every rotation-set template `assignment_status='production_proven'`. *(today 2/17)*
- **D3** FB PASS · IG PASS · LinkedIn carried-or-closed · a named video-publish target.
- **D4 (HARD GATE)** `property-pulse.json` pool == live governed+active pool == register figure. *(today: live **11** vs declarative **9** — carried since Spine Gen v1's never-executed "Phase 4")*
- **D5 (HARD GATE)** governed-path defect register empty **or** every entry explicitly carried. *(today: 7/17 overprint, carried per A-OQ1; closure via the cc-0033 re-plan)*
- **D6 (HARD GATE)** no PP-hardcoded chokepoint regression: every PP identity literal in the governed worker path is register-recorded and trending to 0. *(today: audit named **5**; Spine Gen v1 closed **1**; the video-worker lane **added 2** — [b1_video_stat.ts:32](supabase/functions/video-worker/b1_video_stat.ts:32), [index.ts:981](supabase/functions/video-worker/index.ts:981) — **net 6, unrecorded**)*
- **D7** the copy artifact carries no PP-hardcoded identity **and** a second-brand dry-run resolves to a governed render **without editing worker code**.

## Standing fences (in force on acceptance)

- **No brand rollout beyond READINESS-ONLY work.**
- **Spine Gen v2 does NOT start** until ALL FOUR: (1) cc-0035 closed · (2) this DoD accepted ✅ · (3) record/registry drift reconciled · (4) cc-0033 re-plan accepted. **Acceptance of this DoD satisfies precondition (2) only.**
- **cc-0033 stays HELD** pending its Gate-1 re-plan; the char-limit step is disproven by `max_lines: 3`.
- **PP video B-roll (`42211c0f…`) stays fenced**, not promoted; it is not a DoD criterion.

## Open handoffs

- **db-rls-auditor** — live eligible pool count at the Ultimate gate (D4); `select_music` single-row invariant (B-OQ1 tripwire); `resolve_brand_assets` brand-genericity (its DDL was absent from repo migrations at the readiness audit).
- **register-reconciler** (TMR Fixups lane) — record the ARC regression (D6) against the 5-chokepoint baseline, and the 11-vs-9 drift (D4).
- **cc-0033 re-plan lane** (TMR Image lane) — D5.
- **TMR Readiness** — author the D7 second-brand exit test; it is the weakest-specified criterion and the rollout depends on it.

---

## Corrections (additive · forward-only · 2026-07-10 · record-reconciliation lane · HEAD `2d8b092`)

*Forward-corrects this doc of record. Every superseded line above is **retained unedited** as evidence.
Nothing in this section closes an open gate. Discharges the `register-reconciler` handoff at line 60.*

### A-OQ1 — REVERSED BY PK, 2026-07-10. Overprint is a BLOCKER. **PP Static TMR Done is WITHHELD.**

**This supersedes lines 15 and 25 above, which are retained unedited.** Both were true as the ruling of
record when made; PK reversed them on new evidence the same day. **That the ruling was made and then
reversed is itself part of the record** — do not collapse it into a single corrected state.

| | superseded text (retained above) | current ruling |
|---|---|---|
| line 15 | *"**NEARLY TRUE** — carries named; overprint carried (A-OQ1)"* | **FALSE — WITHHELD** |
| line 25 | *"**Named carry.** Static Done stands with the 7/17 defect enumerated… not a governance failure."* | **BLOCKER.** Static Done does not stand. |
| line 35 | Level-A criteria enumerate the overprint as carried per A-OQ1 | the carry is void; Level A is **not** satisfiable while D5 is open |
| line 46 | D5 gate: *"defect register empty **or** every entry explicitly carried. (today: 7/17 overprint, carried per A-OQ1…)"* | the *"or explicitly carried"* branch is **no longer available** for this entry; D5 requires the defect **closed** |

**Read the whole doc through this amendment.** Lines 15, 25, 35 and 46 each rest on the carry, and all
four are retained unedited. Anywhere the doc says the overprint is "carried", it is now **blocking**.

**Why it reversed.** The carry ruling rested on the defect being confined to internal renders. It is not:
the overprint reaches **published production posts**. Two are confirmed on Facebook — the card of
**2026-07-05** and the card of **2026-07-08** (*"Rate relief slower than hoped — here is what that means for
your portfolio"*, 74 chars → 4 lines → headline prints through the subtitle). A live, brand-visible defect in
published output is a governance failure, not a template-calibration carry.

**Consequence.** **D5 now structurally gates Level A**, not merely D5's own closure. It also gates **D7**: a
spine carrying a live published brand-visible defect is not "ready to copy" — onboarding a second brand
propagates the defect to that brand's audience. Note a D5 closure proven on PP's headline corpus **does not
transfer** to another brand's corpus: overprint is text length against box geometry, and corpora differ.

**The measured figure, and its bounds.** **7 of 17** real governed renders overprint (**41%**). Population:
`m.post_render_log` rows with `render_spec.label = 'creative_library_b1_production'` and `status='succeeded'`,
joined to `m.post_draft.image_headline`, 2026-06-26 → 2026-07-09; 6 `B1-v2 proof draft` rows excluded as
non-posts. Line counts from a greedy-wrap model (Montserrat `wght=800`, box `86% × 1080 = 928.8px`)
**validated 3/3 against real Creatomate renders** (78ch→4 lines collide · 65ch→4 collide · 53ch→3 clean).

*Uncertainty, stated rather than hidden:* this is the count of **rendered** cards, not **published** ones —
publication was confirmed for two, not verified for the other fifteen, so the published-defect rate is
**unknown and ≤ 41%**. **A proxy figure of ~76% is NOT adopted here.** It disagrees with the measurement and
is most likely a `draft_title` artifact: `image_headline` is provably the bound column — the render evidence
`contract_validation.checks[headline].detail = "headline ok (54/90)"` matches that render's
`image_headline` length of exactly **54**. Cite the measured 41% with its bounds, or cite nothing.

**D5 remains OPEN.** This amendment records a reversal; it closes nothing.

---

**D4 — the "live 11 vs declarative 9" figure (line 45) is STALE; BOTH numbers are wrong.**
`db-rls-auditor` reproduced the eligibility predicate from the live `public.resolve_slot_assets`
definition. Property Pulse's live eligible **background** pool today is **17**, not 11 and not 9:

| | eligible |
|---|---|
| platform-agnostic (`p_platform` NULL) | **17** |
| facebook | 17 |
| linkedin | 15 |
| instagram | 14 |

24 background rows exist; 7 are fenced-inactive (`b2a10001/04/07`, `b3a20001/02/04/10`, first failing
filter `inactive`). The pool grew after Spine Gen v1 measured it (`b2a10008` 2026-07-05; the `b3a2*`
batch 2026-07-06/07). **Eligibility is platform-parameterised — recording it as a single scalar is
itself the defect.** D4 must compare the declarative figure against the **fb/li/ig triple**, not one
number. `resolve_slot_assets` considers only `usage IN ('background','logo')`; a Background slot with
nothing eligible returns `fail_closed` / `no_governed_background`. **D4 stays an OPEN hard gate.**

**D5 — `max_lines: 3` is RETIRED as the overprint fix** (cited at lines 25 and 54; both retained unedited).
`3` is not a capability — it is a **derived** value:
`floor((subtitle_top − headline_top) / line_height) = floor((540 − 280.8) / 77.7) = 3`.
It becomes **4** if `Subtitle.y`→55%, **5** if →65%, **4** under `Headline` auto-fit. Encoding `3`
would repeat the `B1_HEADLINE_MAX_CHARS = 90` error one layer up — and giving `Subtitle` the explicit
`y` it currently lacks (the very fix this defect calls for) would silently invalidate it.
**The durable capability is the invariant `headline_bottom < subtitle_top`, computed from the template
source at validation time.** UNAFFECTED: the **7/17 overprint measurement stands**. The **A-OQ1 carry does
NOT stand** — PK reversed it to a **blocker** (see the A-OQ1 amendment above); this D5 paragraph corrects
only the prescribed *fix*, and must be read after that reversal. D5 closure remains gated on the cc-0033
re-plan, and D5 now gates **Level A** and **D7**.

**D6 — RECORDED REGRESSION: the scoreboard reads better than the truth.**
Line 47 records *"net 6"* and names only `b1_video_stat.ts:32` and `index.ts:981`. Verified present at
HEAD `2d8b092` and **absent from that count**:

- `video-worker/b1_video_stat.ts:62` — `B1_VIDEO_CONTRACT_REF = 'property_pulse.video_short_stat.market_stat'`
- `video-worker/voice_id.ts:23` — `VOICE_ENV_BY_CLIENT_ID` keyed on the PP UUID `4036a6b5-…`
- `image-worker/branch_b_proof.ts:50,55` — `category: 'PROPERTY NEWS'`, `footer: 'propertypulse.com.au'`
  — **brand-visible, named by no lane, and predating the video work**

The true count is therefore **> 6**. Because D6's own text requires *"every PP identity literal … trending
to 0"*, an undercounted baseline lets a lane remove one literal, add two elsewhere, and still appear to
trend down — the gate cannot function against it. **This is recorded as a regression. D6 stays an OPEN
hard gate; this section does not close it, and the "net 6" text above is retained as its evidence.**

**Census line-count VERIFIED by independent re-scan.** The census draft
`docs/briefs/tmr-d6-chokepoint-census-v1.md` reports **30 literal lines across 8 files**. This lane ran its
own comment-stripped, test-excluded static scan at HEAD `2d8b092` and **reproduced that figure exactly**
(`creative_contract.ts` ×2 @ 10 each · `b1_production.ts` 2 · `branch_b_proof.ts` 2 ·
`contract_validation.ts` 2 · `b1_video_stat.ts` 2 · `video-worker/index.ts` 1 · `voice_id.ts` 1 = **30**).
Corroborating: `git diff --name-only 8199153..2d8b092 -- supabase/functions/` is empty — no worker source
changed, so the census's original anchor was stale but its substance was unaffected. The 30 lines are
adopted; **the unit total is not** (see below).

**⚠ D6 HAS NO DEFINED DENOMINATOR — the gate is currently unfalsifiable.** D6 (line 47) reads *"every PP
identity literal in the **governed worker path**"*, but the doc never defines that set. A repo-wide scan of
`supabase/functions/**` at the same HEAD finds **34 lines across 11 files** — four more, in
`auto-approver/index.ts:91,92`, `ai-diagnostic/index.ts:149`, `youtube-insights-worker/index.ts:36`. Those
three are legitimately **out of scope** (each has zero references to `creatomate` / `resolve_slot_assets` /
`select_template`; the `ai-diagnostic` hit is prose inside an LLM prompt, not an identity binding). So both
counts are correct under different readings, and two competent scans differed by 4 lines purely on scope.
Likewise "units" (5 → 6 → 8) is a count of an undefined object: the census's 8 units span 8 `.ts` files
**plus** the structural `property-pulse.json` unit, so units and files coincide numerically without being
the same set. **Before D6 can be gated on "trending to 0", the doc must define (a) the file set that
constitutes the governed worker path and (b) what counts as one unit.** Until then, a lane can move a
literal across the scope boundary and appear to make progress. This is the same defect as `max_lines: 3`
and `B1_HEADLINE_MAX_CHARS = 90`: **a governed number with no defined referent.**

**Additional verified fact (bears on D4/D7).** `select_template` rejects any template with
`scope <> 'generic'` as `wrong_scope`, **before** assignment or proof is evaluated. PP's client-scoped
`news_static_centered_scrim_1x1_v1` therefore holds a `production_proven` assignment it can **never**
act on; PP's real winner is the generic `generic_market_insight_card_1x1_v1` (provider
`48cba556-0a53-4001-90f0-05420d10efc0`). A second brand consequently needs **no** client-scoped provider
template — scoring its absence as a gap is incorrect.

---

## Corrections — additive · forward-only · 2026-07-17 · record-reconciliation lane · HEAD `e368c6f`

*Forward-corrects the 2026-07-10 corrections block above to the state AFTER the cc-0033a overprint fix and
cc-0037 supervised-smoke surface deployed on 2026-07-16. Every prior line — including the 2026-07-10
block — is **retained unedited**; the earlier rulings were true when made. Re-derived fresh against committed
HEAD, not adopted from any prior draft. This block **closes exactly one Ultimate hard gate's sub-finding**
(D5's overprint entry) and **refreshes D4's figure**; it does not resolve D4 or D6 by judgment.*

### A-OQ1 / D5 overprint — RESOLVED. The blocker is CLOSED (fix DEPLOYED, PK visual PASS).

The 2026-07-10 amendment reversed A-OQ1 to a **BLOCKER** and **WITHHELD** "PP Static TMR Done" because the
overprint reached published production posts with **no shipped fix**. **That fix has now shipped and is
live-proven.** image-worker **v3.24.0** (commits `a130665` + `4b70506`, deployed 2026-07-16 through the
governed drift gate; `verify_jwt=false` confirmed) injects a winner-scoped layout guard
(`TMR_WINNER_LAYOUT_GUARD`: `Headline.height:'22%'` + `Headline.font_size:null` auto-shrink + 30/74px
min/max) into the Creatomate template-mode modifications — **no provider-template write, and zero drafts
rejected**. This is exactly the *"durable capability … `headline_bottom < subtitle_top`"* that the 2026-07-10
D5 paragraph (lines 139–140) prescribed: a bounded headline box makes overflow structurally impossible.

**PK visual verdict PASS (the deciding act) on the two real cards that had overprinted:**
- Instagram — draft `604c3dfb` (*"Australia's build-to-rent market now has a $10 billion benchmark"*) — PASS.
- Facebook — draft `a3ac9129` (*"Banks are cutting rates. The RBA hasn't moved. Your loan might still be wrong."*, 78 chars, worst case) — PASS.
- Controlled renders were publish-safe (already-published draft exclusion) and fully restored; nothing re-published.
- Record of the lane: `docs/briefs/results/cc-0033a-headline-overprint-fix.md`.

| | 2026-07-10 ruling (retained above) | 2026-07-17 current ruling |
|---|---|---|
| Overprint defect (A-OQ1) | BLOCKER, open | **RESOLVED — fix deployed + visual PASS** |
| D5 overprint entry (line 82) | *"requires the defect **closed**; carry branch unavailable"* | **the defect IS closed** — the governed image path now renders through the guard |
| PP Static TMR Done (lines 15/79) | WITHHELD (label FALSE) | **withholding blocker discharged** — see label note |

**"PP Static TMR Done" — proposed TRUE (PK ratifies at the commit gate).** The single blocker that WITHHELD
Static Done (the published overprint) is closed, and FB PASS + IG PASS are both proven (the cc-0033a live
gate). The remaining Level-A items are the **enumerated carries** C1 (geo-pairing) · C2 (scrim) · C3 (crop) ·
C4 (LinkedIn) — which Level A (line 35) explicitly admits as *named carries*, not blockers. On that basis the
label is **proposed TRUE (carries named)**. Flipping a governance label is PK's ratification, not this lane's.

**Scope note (upholds the 2026-07-10 caveat, lines 93–96):** a D5 closure proven on PP's headline corpus does
**not** transfer to another brand's corpus — overprint is text-length against box geometry, and corpora
differ; **D7's second-brand readiness is unaffected** by this closure. Carry **C5** (an admissible ≤90-char
*single unbreakable token* can still overflow horizontally) is pre-existing, has nil real-world exposure, and
is deferred to a separate input-gate lane — it is **not** a reopening of the overprint.

### `max_lines: 3` — retirement CONFIRMED and now REALIZED in production.

The 2026-07-10 block (lines 133–143) retired `max_lines: 3` as the prescribed fix. The deployed fix confirms
that retirement **empirically**: it encodes **no line-count constant** — the guard bounds the box and lets the
font auto-shrink, so a line count is a *consequence* of geometry, never an input. The prediction *"encoding 3
would repeat the `B1_HEADLINE_MAX_CHARS` error"* is upheld; the shipped fix encodes no such number.

### D4 — figure REFRESHED. The 2026-07-10 "17" is itself now stale (the pool is a moving quantity).

`db-rls-auditor` re-derived the eligibility predicate from live `public.resolve_slot_assets` on 2026-07-17.
PP's eligible **background** pool TODAY:

| p_platform | eligible | (2026-07-10 was) |
|---|---|---|
| NULL (agnostic) | **12** | 17 |
| facebook | **12** | 17 |
| linkedin | **11** | 15 |
| instagram | **9** | 14 |

24 background rows total, **12 fenced-inactive** (up from 7). The −5 delta is **entirely `is_active`
deactivations** — a whole-pool governance sweep landed 2026-07-10; **no predicate / license / approval /
platform-fence change**, and no new rows entered the pool. **That the "17" was correct on 2026-07-10 and is
**12** today is itself the D4 finding** — it upholds line 128 (*"recording it as a single scalar is the
defect"*): the figure is volatile, so D4 must compare the declarative pool against the **fb/li/ig triple**,
never one number.

**Live-vs-declarative delta:** `docs/creative-library/property-pulse.json` declares **8** background keys;
live agnostic-eligible is **12**; they diverge **both ways** — **2 declared keys are dead** (`bg_sydney_cbd`,
`bg_brisbane_cbd`, both `inactive`) and **6 live-eligible keys are undeclared** (`bg_pp_sold_sign_closeup`,
`bg_pp_new_build_construction_site`, `bg_pp_subdivision_land_estate`, `bg_pp_mortgage_calculator_keys`,
`bg_pp_inspection_checklist_clipboard`, `bg_pp_market_data_chart_grid`); intersection = 6. The JSON's own
*"eligible pool is 8 fb/li, 7 ig"* note is stale in both directions. **D4 stays an OPEN hard gate** — this
refreshes its figure only. The declarative-registry drift is a separate registry-reconciliation item (handoff).

### D6 — STILL OPEN (unchanged posture; not closed by, and no PP-identity literal added by, the 2026-07-16 deploys).

The 2026-07-10 block recorded the D6 chokepoint regression and — decisively — that **D6 has no defined
denominator** (lines 168–180): it cannot be gated on *"trending to 0"* until the doc defines (a) the
governed-worker-path file set and (b) what counts as one unit. **That remains true and unaddressed.** The
2026-07-16 image-worker deploys did not close it and did not add a PP-*identity* literal: cc-0033a's
`TMR_WINNER_LAYOUT_GUARD` keys on the **generic** template name `generic_market_insight_card_1x1_v1` (not a PP
literal), and cc-0037's new constants (`B1_SMOKE_LABEL='creative_library_b1_smoke'`,
`EXPECTED_SMOKE_PROVIDER_TEMPLATE_ID='48cba556…'`, `SMOKE_SEED`) reference the generic template / provider
UUID / a smoke label — not PP brand identity. A full re-census remains a separate lane. **D6 stays an OPEN
hard gate, carried;** defining its denominator is the thing to fix first.

### The three labels (proposed reconciliation; PK ratifies at the commit gate)

| Label | 2026-07-10 | 2026-07-17 proposed | basis |
|---|---|---|---|
| **PP Static TMR Done** | WITHHELD (FALSE) | **TRUE** — blocker closed | overprint fixed+deployed (v3.24.0), FB+IG PASS, C1–C4 named carries |
| **PP Video TMR First Proof Done** | FALSE | **TRUE** — *per cc-0038, not re-derived here* | Level B CLOSED by cc-0038 B4 (register v5.55); B3 restored TRUE by cc-0039 (v5.54). Sourced to those lanes' records |
| **PP Ultimate TMR Done** | FALSE (D4/D5/D6 open) | **FALSE** — D4 + D6 remain open | D5's overprint entry is closed; D4 figure refreshed but gate open; D6 undefined-denominator unresolved |

D5's overprint entry is the **only** one of the three Ultimate hard gates this reconciliation closes. **Ultimate
stays FALSE.** The Video label change is recorded for table completeness and is **sourced to cc-0038/cc-0039,
not derived by this lane.**

### Non-claims

Closes no gate other than D5's overprint sub-finding. D4 and D6 remain OPEN hard gates. Does not ratify any
label — the label column is a *proposal* for PK. Does not re-derive the Video/Level-B closure (cc-0038's
record). The D4 figure is a live read on 2026-07-17 and is itself volatile. Does not adopt the uncommitted
"Amendment 4" working-tree draft (superseded; see the lane's handback for the disposition of its still-valid
sub-findings).

---

## DoD SUPERSEDE — 2026-07-17 (PP Static TMR Done ratified TRUE · D4 redefined to an invariant) · v5.63

*Additive/dated. Every ruling above — including the 2026-07-10 corrections and the earlier 2026-07-17 block (`88ec060`) — is RETAINED unedited. This block (a) RATIFIES PP Static TMR Done = TRUE and (b) REPLACES the scalar D4 gate with an invariant.*

### (a) PP Static TMR Done — RATIFIED TRUE (PK, 2026-07-17).

Upgrades the *"proposed TRUE"* recorded in the earlier 2026-07-17 block (`88ec060`) to a ratified ruling: **PP Static TMR Done = TRUE.** Supersedes lines 15 / 79's *"WITHHELD / FALSE"* (both retained unedited) — Static Done stands. Evidence accepted by PK:
1. The headline/subtitle overprint blocker is **fixed + deployed** — image-worker **v3.24.0** (`a130665` + `4b70506`).
2. **PK visual PASS** on the two real cards that had overprinted — Instagram `604c3dfb` + Facebook `a3ac9129`.
3. **C-OQ1 carousel** second-surface overprint measured **non-blocking at 0/600** (carousel body-slide investigation, task `task_8c5dab3b`).

**C1 (geo-pairing) · C2 (scrim) · C3 (crop) · C4 (LinkedIn) remain named carries, NOT blockers** — Level A (line 35) admits them as enumerated carries; Static Done being TRUE does not close them.

### (b) D4 — REDEFINED to an invariant (supersedes the scalar gate).

The scalar form of D4 — *"`property-pulse.json` pool == live governed+active pool == register figure"* (line 45), refreshed to `11-vs-9` (2026-07-10) then `12/12/11/9` (`88ec060`) — is **RETIRED as the gate**. Cause, on the record: the `12/12/11/9` snapshot went stale **within hours** (live moved to `16/16/15/13` at 2026-07-17 02:06 when four fenced rows were reactivated). A scalar equality over a live-mutated pool is unstable by construction.

**D4 (HARD GATE) is now the invariant:** *Every active / approved / production-use governed PP asset must be either (a) declared in the declarative registry, (b) intentionally exempt with a recorded reason, or (c) deactivated.* D4 is **closed** when the invariant holds AND is continuously machine-evaluated by `tmr-drift-probe` check (d) (Option 3: fetches `property-pulse.json` from pushed GitHub `main`) — not at a manual snapshot. The per-platform triple is recorded as evidence, never as the pass condition.

**D4-close status (this lane, v5.63):** Apply A back-declared the 9 previously-undeclared live/governed keys into `property-pulse.json` (registry v0.10; background pool 8→17 — the 9th, `bg_pp_modern_home_exterior_front`, was promoted since the packet and PK-confirmed at the fresh gate; the invariant predicate is active∧approved∧production_use_allowed, so the 5 active+approved-but-not-production-use keys are outside the must-declare set and intentionally not declared), each verified `active+approved+production_use=governed` at apply time; 0 exemptions; **the invariant now holds** (declared 17 == live must-declare 17). Apply B extends `tmr-drift-probe` (check (d), Option 3) to evaluate the invariant continuously against pushed `main`. **D4 formally CLOSES when Apply B is live and its first probe run confirms `declarative_coverage.status='ok'` against pushed main.** Until then: invariant-holds, continuous-proof-pending. D5's overprint entry is closed (see (a)); **D6 remains an OPEN hard gate.**
