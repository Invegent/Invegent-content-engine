# M11c — PP Carousel: Reconciliation Decision Memo (Packet A vs Packet B)

**Lane:** `m11c-reconciliation` (T1, read-only, main checkout)
**Created:** 2026-08-05 Sydney
**Author:** chat (Claude Code orchestrator)
**Governing constraint:** PK watch ruling v6.140 (`docs/briefs/cgu-final-control-tower-watch-ruling-v1.md`)
— no DML, no schedule change, no packet evolution during the Phase-1 watch. This memo is docs-only
output; it does not authorize, execute, or scope anything.
**Status:** `RECONCILIATION_COMPLETE`. Zero code/DB/deploy/merge/schedule change. Neither underlying
packet was edited to produce this memo.
**Scope discipline (per this lane's own instruction):** does not edit either packet, does not close
M11c, does not scope the migrate lane. Feeds a PK decision only.

**Packet A** (PK-accepted, commit `96095e8`, no live DB access):
`docs/briefs/m11c-pp-carousel-migrate-vs-retire-decision-packet-v1.md`
**Packet B** (uncommitted, live `db-rls-auditor` pass):
`docs/briefs/m11c-pp-carousel-migrate-vs-retire-packet-v1.md`

---

## 1. Fresh live read performed for this memo

A fresh, independent `db-rls-auditor` read was run this session (2026-08-05, project
`mbkmaxqhsohbtwsqolns`, PP client_id `4036a6b5-b4a3-406e-998d-c2fe14a8bbdd`, DB `now()` ≈ 05:41 UTC),
targeting exactly the four points where Packet A and Packet B disagree: current volume, LinkedIn
history, TMR template state, and `tmr-drift-probe-daily` cause. All reads were read-only SELECT; no
mutation performed. Full findings below are ground truth as of this read, not a re-assertion of
either packet's numbers.

| # | Question | Ground truth (live, 2026-08-05) |
|---|---|---|
| 1 | PP carousel volume, 90d | **44 drafts** (7 approved · 31 published · 4 rejected · 2 voided) · **2/14d** · FB 16 pub · IG 15 pub · LI 8 pub · **241 slides/90d** |
| 1b | PP carousel volume, all-time | 105 drafts · 39 published (23 FB · 15 IG · 17 LI, historical) · 4 rejected · 32 voided · **553 slides** |
| 2 | LinkedIn carousel history | **17 all-time rows**, all `status='published'`, dated **2026-04-25 → 2026-06-15**, zero after; every `platform_post_id` shaped `zapier-li-<unix-ms>` (synthetic, not a real LinkedIn URN) |
| 3 | TMR template state | **3 provider templates exist** (`generic_carousel_cover/body/closing_1x1_v1`), created 2026-07-02, `status='smoke_rendered'`; assigned exclusively to PP 2026-07-03 (`assignment_status='visually_approved'`); `required_field_mapping_status='pending'` on all 3, unchanged since assignment; 9 platform-suitability rows stuck at `'candidate'`; 6 proof events (3× `smoke_render` + 3× `visual_approval`, both passed), **zero** `platform_render`/`platform_publish` events; D2 governance row `declarative_registry_ref=NULL`, `enabled=true`, untouched since 2026-08-02 |
| 4 | `tmr-drift-probe-daily` | 15/15 sampled runs (2026-07-21→2026-08-04) logged `status='error'`; `pg_cron`'s own job-run table shows `status='succeeded'` on all 20 sampled runs — the daily logical error is invisible at the cron-health layer. **Causation is time-varying**: 2026-07-21→2026-08-01 (12/15 runs) cite exactly 3 causes — NDIS shape mismatch, CFW 404, Invegent — **no property-pulse**; PP only becomes a 4th cause from **2026-08-02**, the same day the PP D2 governance row was created |

---

## 2. Material divergences, reconciled (named, not smoothed)

### D1 — 90-day volume figure: **Packet B correct; Packet A's framing is wrong**

Packet A's "104 drafts / 37 posts per 90d" is not a 90-day figure at all — it is close to the
**all-time** total (105 drafts, live). Even read as all-time, A's own **slide count (629) does not
match live all-time slides (553)** — a 76-row gap with no plausible one-day-drift explanation, i.e. a
genuine, unresolved discrepancy in A's sourcing, not merely staleness. Packet B's "45 drafts/90d,
published 31, approved 8, rejected 4, voided 2" lands within one row of live ground truth (44/7) —
consistent with ordinary one-day drift between B's read and this one. **Packet A's own §1 caveat**
("last independently verified 2026-08-04... not re-verified live this session... treat these as the
last-known, not today's, numbers") was honest about staleness but did not anticipate that the number
was mislabeled by window, not just dated.

### D2 — TMR template existence: **Packet B correct; Packet A is factually wrong, not merely stale**

Packet A §5 states plainly: *"Template identity: **None** — no template row exists anywhere for
carousel."* This is refuted, not superseded — 3 provider templates have existed since 2026-07-02,
PK-approved to `visually_approved` assignment status on 2026-07-03, over a month before either packet
was written. This is the single most consequential divergence: A's entire framing of the migration as
*"the first multi-object/multi-render Creative Library extension of any kind in this repo... zero
prior art"* (A §6, §8, §14, repeated four times) is built on a false premise. The **schema gap A
identifies is still real** — nothing in Creative Library v2 lets a Capability Contract bind an ordered
N-slide sequence to one governed format (both packets converge on this substantive point, A §6 and B
§3.6, independently) — but the framing that no groundwork exists at all is wrong. Real, stalled,
PK-approved work already exists one layer below the schema question.

### D3 — LinkedIn carousel volume: **Packet B correct; Packet A is factually wrong**

Packet A §1 states *"LinkedIn carries zero carousel volume for PP — it was never a committed PP cell
for this format."* Refuted: 17 historical published rows exist, 2026-04-25→2026-06-15. Packet B's own
treatment is the more defensible one — it surfaces the same 17 rows *and* flags their synthetic
`platform_post_id` provenance caveat (a genuine Zapier-ack ≠ a confirmed LinkedIn delivery), which is
the more careful reading, not just the more complete one. Net effect on current-state analysis is
small (LinkedIn has been dormant ~7 weeks either way, per B §2.1), but "never a committed cell" is a
stronger and simply incorrect claim.

### D4 — `tmr-drift-probe` causation: **Packet B directionally correct; one precision correction**

Packet B's "3 independent causes, every run" is confirmed for 12 of the 15 sampled runs, but PP was
**not yet a cause** for the first 12 (2026-07-21→08-01) — it only starts contributing from 2026-08-02,
the exact date the D2 governance row was created. B's substantive conclusion — *fixing PP's row alone
will not turn the probe green, because NDIS/CFW/Invegent causes are independent of PP's disposition* —
holds regardless of this correction, and remains the important fact for whoever picks up M11b's Seed
Packets A/B (B §10 already names this correctly as a caution for those lanes). The correction is worth
recording precisely rather than letting "every run" stand uncorrected in the register.

### D5 — Migration cost/complexity framing: **Packet B's framing is better-grounded; not a hard
contradiction of A's substantive schema question**

Downstream of D2: A's complexity narrative ("genuinely novel... zero prior art... concentrated design
risk") overstates the state of the world. B's framing — *"lower than M11b's own DB-access-free
estimate implied, because the TMR groundwork already exists further along than assumed"* — matches
live findings. Both packets still correctly and independently identify the same real, unresolved
design gap (no schema primitive for ordered multi-slide sequences); this is not in dispute between
them. What's in dispute is how much *of the rest* of the work is already done, and B is right that
material PK-approved groundwork (3 templates, `visually_approved`) already exists and should not be
re-litigated or redesigned from zero.

### D6 — Recommended disposition: **not a divergence — both recommend MIGRATE**

No reconciliation needed on the bottom-line recommendation itself. What differs is the strength of the
evidentiary floor under it: A's MIGRATE recommendation rests partly on now-refuted premises (D2, D3);
B's rests on confirmed live facts. PK should treat B's version of the MIGRATE case, not A's, as the
evidentially sound one — while noting the schema-design question neither packet resolves (§3, decision
2 below).

### D7 — Conversion-rate question (Packet A's PK decision #5): **substantially answered by corrected
data, not merely restated**

A frames "37 delivered posts from 104 drafts ≈ 36% conversion" as a real, unexplained business-value
gap worth a follow-up investigation. That ratio was an artifact of comparing a stale all-time-ish draft
count against a differently-scoped published figure — not a true like-for-like ratio. The corrected 90d
picture (44 drafts → 31 published + 4 rejected + 2 voided + 7 still approved-pending = 44, i.e. the
population fully accounts for itself) shows **~70% publish-through with no unexplained residue at
anywhere near the scale A implied.** See §3 decision 5 below for the disposition recommendation.

### D8 / D9 — Not contradictions, just omissions (carried forward as-is)

Packet A's PK decisions #6 (M13 sequencing) and #7 (mandatory live `pg_get_functiondef` read of
`select_template`/`resolve_slot_assets` before any migration Phase 1) are **not addressed by Packet B
at all**, and this session's live read was not tasked to verify either (M13 sequencing is a programme
question, not a DB fact; the `select_template`/`resolve_slot_assets` deployed-body check is out of
scope for a carousel-focused read since carousel does not call either RPC today). Both stand as valid,
unresolved PK decisions regardless of which packet's other facts are preferred — see §3.

---

## 3. Packet A's 7 open PK decisions — evidence and recommendation, corrected

Numbered to match Packet A §15 exactly.

**1. Confirm the disposition (migrate / retain / retire).**
*Evidence:* Both packets independently recommend MIGRATE; the corrected facts (§2, D1–D5) strengthen
rather than weaken that case — real, current, non-decayed FB+IG production (44 drafts/90d, only 2 in
the last 14d but not decaying the way NDIS/CFW did) plus material PK-approved groundwork already
sitting at proof rung 2. *Recommendation:* confirm MIGRATE on Packet B's evidentiary basis, not
Packet A's.

**2. Which Creative Library schema option (multi-slide-aware Variant extension vs. N independent
variants stitched by worker orchestration)?**
*Evidence:* The corrected fact that 3 templates already exist as **3 separate Template Families**
(cover/body/closing), independently proof-approved to rung 2, is new information bearing directly on
this choice — it is sunk, PK-approved work in the "N independent variants" direction already. Neither
packet resolves this; it remains real design work. *Recommendation:* PK should weigh the existing
3-template asset as a material argument for extending the Capability Contract layer to bind an ordered
sequence of *existing* separate template families (B's framing, §3.6) rather than reworking the Variant
object itself from scratch (A's framing) — finishing what is already `visually_approved` is materially
cheaper than a fresh scalar-to-array Variant redesign. Still PK's call, not resolved here.

**3. Does the render-latency question force a render-path redesign?**
*Evidence:* Neither packet measured this; the live read performed for this memo did not touch EF
wall-clock timing (out of scope for a volume/template reconciliation). *Recommendation:* unresolved,
carry forward exactly as both packets left it — a pre-migration measurement, not assumed either way.

**4. Is closing the `render-qa` v0 exclusion in-scope for the migration itself, or a separate carry?**
*Evidence:* Unaffected by any corrected fact in this memo. *Recommendation:* remains a pure PK judgment
call; no new evidence changes the calculus either way.

**5. Is the conversion-rate question worth a separate investigation?**
*Evidence:* §2 D7 — the corrected 90d numbers (44 drafts → 31 published/4 rejected/2 voided/7 pending,
fully accounting for the population) show no unexplained conversion gap at the scale A's 36% figure
implied. *Recommendation:* **treat this decision as resolved, not open** — no separate investigation is
warranted; the apparent gap A saw was a denominator/window mismatch, not a real business-value
question. This narrows Packet A's 7 open decisions to 6 live ones.

**6. If migrate: sequence against CGU Final's M13 ("Governed Template Build Pack v1")?**
*Evidence:* Untouched by this memo's live read — a programme-sequencing question, not a DB fact. M13
remains not-yet-scoped per the CGU Final brief. *Recommendation:* unresolved, carry forward verbatim;
this is squarely a PK sequencing call, not something further DB reads can settle.

**7. Require a live `pg_get_functiondef` read of `select_template`/`resolve_slot_assets` as a mandatory
Phase-1 precondition?**
*Evidence:* Not verified by this session (out of scope — carousel does not call either RPC today, so
this memo's live read did not touch them). The documented drift history A cites (an undocumented
`scope='client'` extension that shipped without a migration file, per
`docs/briefs/results/creatomate-registry-integrity-graduation-contract-v1.md` §0.3) is independently
recorded in standing memory and remains a live, unretired risk. *Recommendation:* retain this as a hard
Phase-1 gate — nothing in this reconciliation reduces its relevance, and the corrected finding that
real template groundwork already exists (D2) makes it more, not less, important to confirm the
selector/resolver machinery those templates would eventually route through hasn't itself drifted.

---

## 4. Disposition of the uncommitted packet (Packet B)

**Recommendation: fold in the facts, preserve the packet as evidence — do not discard, and do not edit
Packet A.**

Reasoning:
- Every one of Packet B's live-sourced claims was independently reproduced by this session's fresh
  read, with only one minor precision correction (D4 — PP's causal tenure in the drift-probe, not the
  substance of the claim). Packet B is the factually reliable source between the two.
- Packet A is already PK-accepted and committed (`96095e8`) as the canonical M11c record, and this
  lane's own instruction is explicit: **do not edit either packet.** The correct mechanism for
  surfacing Packet B's corrections into the canonical record is this memo plus a future register
  pointer — not a rewrite of A, which would violate the docs-lane's no-historical-rewrite discipline.
- Packet B currently sits **uncommitted** in the working tree, which is a real loss-of-evidence risk
  (per standing project experience: session deletion destroys uncommitted evidence). Its facts have now
  been independently re-verified and are load-bearing for §3's decisions above — it should not be left
  exposed to accidental loss.
- **Concretely:** commit Packet B to the repo as what it actually is — **preserved supporting evidence
  for the reconciliation, not a second competing decision packet** — alongside this memo, at whatever
  commit PK next authorizes for this lane's docs. Do not present it at a future gate as an alternative
  PK might "choose" over Packet A; A remains the accepted record, corrected in effect by this memo, not
  in text.

---

## 5. Version-less register payload

*(No version number assigned — per CCF-02's parallel-session claim discipline; submitted for whoever
next allocates a register version.)*

> **M11c reconciliation — DECISION MEMO COMPLETE (T1, docs-only; zero code/DB/deploy/merge/schedule
> change).** Settles the material disagreement between the PK-accepted M11c packet (`96095e8`, no live
> DB access, 104 drafts/37 posts per 90d, "no template row exists") and the uncommitted M11c packet
> (live `db-rls-auditor` pass, 45 drafts/90d, 3 stalled TMR templates found) via a fresh independent
> live read. **Ground truth confirms the uncommitted packet on all four disputed points**: current
> volume is 44 drafts/90d (the accepted packet's 104 figure was mislabeled all-time, and even so its
> slide count doesn't match live all-time data — a genuine, unexplained 76-row gap); 3 PP-assigned TMR
> carousel templates exist, stalled at proof rung 2 since 2026-07-03 (the accepted packet's "no
> template row exists anywhere" claim is refuted, not merely stale); LinkedIn carries 17 historical
> published carousel rows, 2026-04-25→2026-06-15 (the accepted packet's "zero LinkedIn volume" claim is
> refuted); the `tmr-drift-probe` fails on 3 independent causes with PP only becoming a 4th cause from
> 2026-08-02 (one precision correction to the uncommitted packet's "every run" framing — substance
> otherwise holds). Both packets recommend MIGRATE; this memo treats the uncommitted packet's version
> of that case as evidentially sound, the accepted packet's as resting partly on refuted premises. Of
> the accepted packet's 7 named PK decisions, **decision #5 (conversion-rate investigation) is now
> resolved** — the corrected 90d numbers show no unexplained conversion gap — narrowing the open set to
> 6; the schema-shape decision (#2) gains new evidence (3 existing separate template families argue for
> binding an ordered sequence over reworking the Variant object). **Recommends**: commit the uncommitted
> packet as preserved supporting evidence (not a competing decision record — the accepted packet stays
> canonical, corrected in effect by this memo, not in text); do not edit either underlying packet. Does
> not close M11c, does not scope the migrate lane, does not authorize anything. Record: this file.

---

## 6. Stop condition

This reconciliation memo is complete. Per this lane's own instruction, **no schedule, governance row,
worker, template, dashboard code, or live carousel production route was mutated in producing it, and
neither underlying M11c packet was edited.** Report to PK for register-cut disposition (§4/§5); do not
begin the migrate-path implementation, do not close M11c, and do not scope the migrate lane without a
fresh, separate Gate-1 brief and PK approval.
