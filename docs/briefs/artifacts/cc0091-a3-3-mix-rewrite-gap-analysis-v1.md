# cc-0091 A3-3 — the mix-rewrite gap (authoring-time silent removal)

**Created:** 2026-08-08 Sydney · **Author:** Claude Code (cc-0091 Gate A)
**Status:** ANALYSIS + DESIGN — **no code, nothing applied.**
**Why this exists:** A3-1 catches *runtime* drops but **would not have caught cc-0079 Slice-2**,
the incident that motivated cc-0091. PK directed a pause on A3-2/tests to close this first.

---

## 1. Correction to the record — the renormaliser was mostly RIGHT

Earlier framing in this lane leaned toward "cc-0079 Slice-2 broke the Instagram mix." The full
2026-07-25 rewrite, measured across all four platforms, is more specific than that:

| Platform | Removed on 2026-07-25 | Share removed | Correct? |
|---|---|---|---|
| facebook | `video_short_kinetic` 10 · `video_short_kinetic_voice` 10 · `animated_text_reveal` 5 | 25% | **YES** |
| linkedin | `video_short_kinetic` 15 · `video_short_stat_voice` 10 · `carousel` 40 | 65% | video YES; **carousel = open question** |
| **instagram** | `video_short_kinetic` 20 · `video_short_stat_voice` 15 · `animated_data` 10 · `animated_text_reveal` 5 | **50%** | **NO** |
| youtube | — nothing; all 5 rows still `is_current` from 2026-04-22 | 0% | YES |

**Facebook's removal was correct.** `supabase/functions/publisher/index.ts` v1.9.0 states it
outright: *"text→feed; image_quote→photo; carousel→multi-photo; video/animated/unknown → FB has no
publish path → blocked (never text)."* `facebook: false` matches reality.

**YouTube was untouched** because its flags were right.

**Instagram is the sole platform where the registry disagreed with its publisher** — the IG
publisher has full `media_type='REELS'` support and six published Reels of history.

So the renormaliser did its job faithfully on 3 of 4 platforms and was defeated on the 4th by bad
input. **It is not the villain.** The defect is: capability-derived data rewrote a live allocation,
the input was wrong for exactly one platform, and *nothing anywhere raised an alarm* that a whole
capability class had just been zeroed. Garbage in, faithful transformation out, no signal.

**Open question, not chased here:** LinkedIn lost `carousel` at 40% — a non-video format — leaving
LI on `image_quote` 42.86 + `text` 57.14 only. That may be correct (LI publisher is text/image
oriented) or may be collateral. It is out of cc-0091 scope (LinkedIn is validated-by-feedback and
not to be touched) and is flagged for a separate decision.

## 2. The gap, measured

**`superseded_by` is NULL on all 29 rows** — 0 of 17 superseded and 0 of 12 current. The lineage
column exists and **has never been populated, ever.** "What replaced this row, and why" is not
mechanically answerable; it can only be inferred from `effective_from` dates and a free-text
`evidence_note`.

Three concrete defects:

1. **No lineage.** `superseded_by` unused across the entire table's history.
2. **No per-format removal reason.** A format *removed* (not superseded) leaves nothing. The whole
   2026-07-25 batch carries one shared free-text note — `"renormalised vs platform_support
   (Fault A)"` — with no per-format capability state, reason code, or routed lane.
3. **No class-elimination alarm.** Nothing detects that a rewrite took a platform's entire video
   allocation from 35% to 0%. That is precisely what happened to Instagram, unnoticed for 14 days
   until a user reported the symptom from outside the system.

**Why A3-1 cannot cover this:** A3-1 detects `enabled_set` MINUS grid-survivors. A format deleted
from the mix is no longer a candidate, so it never enters `enabled_set`. There is nothing left to
detect. The loss happens at **authoring time**, upstream of every runtime guard.

## 3. Design — one evidence surface, two detection sources

**Do not build a second table.** Extend `m.format_capability_drop` (A3-1, still unapplied and
therefore free to amend) with a `detection_source` discriminator:

- `'runtime_grid'` — A3-1: carried a mix share, dropped by the grid.
- `'mix_rewrite'` — A3-3: held a share in the prior generation, absent from the current one.

Both answer PK's Q1 question set (what was requested · for which cell · what state caused it · why ·
where routed) and both persist `classify_format_capability` output verbatim. **No second taxonomy**
(PK C1) and one surface for the dashboard and Asset Gap machinery to read.

**A3-3 components (authored in Gate A, applied in Gate B):**

- **Detector** `m.detect_mix_rewrite_removals(p_platform, p_as_of)` — STABLE. Compares the current
  `is_current` generation against the immediately-prior generation per platform; returns formats
  present-then/absent-now with their lost share, enriched with classifier output.
- **Class-elimination guard** — flags when a rewrite takes an entire capability class (all
  `video_short_*`, all `animated_*`) from non-zero to zero on a platform. This is the check that
  would have fired on 2026-07-25 for Instagram, and correctly *also* on Facebook — where a human
  would have confirmed it as intended. **The alarm is not "this is wrong"; it is "this is big,
  confirm it."**
- **Lineage backfill** — populate `superseded_by` for the 2026-07-25 generation where a successor
  exists. **Data-touching**, so Gate B at the earliest, and it needs its own PK gate: it writes
  history that was never recorded, and a wrong link is worse than a null one.

## 4. What this does NOT do

- Does **not** prevent a mix rewrite. Prevention would need a constraint or trigger on
  `t.platform_format_mix_default`, which would block legitimate authoring. PK's governing statement
  requires **surfacing**, not blocking — the same conclusion reached for A3-1.
- Does **not** re-add any removed format. A2a/A2b own restoration, proof-gated.
- Does **not** touch LinkedIn or the carousel question.

## 5. Recommended sequencing

1. **Amend A3-1 now** — add `detection_source` while it is unapplied. Cheap; retrofitting a
   discriminator onto a live table later is not. *(Done — see the amended artifact.)*
2. **Author A3-3 detector + class-elimination guard** in Gate A, unapplied.
3. **A3-2** (fill-site annotation) + hermetic tests, completing the Gate A set.
4. **Freeze** the whole A3 set.
5. Lineage backfill: Gate B, own gate, PK-decided.

## Non-claims

- Not claimed: that the Facebook or YouTube outcomes were wrong. Facebook's removal is verified
  correct against its publisher; YouTube was untouched and correct.
- Not claimed: that LinkedIn's carousel removal was wrong. Unexamined, out of scope, flagged.
- Not claimed: that a class-elimination alarm would have *prevented* the incident — only that it
  would have surfaced it on the day rather than after 14 days and an external report.
- Not done: no code, no migration, no data touched.
