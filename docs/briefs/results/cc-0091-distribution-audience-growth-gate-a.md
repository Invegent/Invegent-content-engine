# Result cc-0091 — distribution-audience-growth-gate-a

**Brief file:** `docs/briefs/cc-0091-distribution-audience-growth-gate-a-brief-v3.md` (ISSUED 2026-08-08)
**Executed by:** Claude Code
**Completed:** 2026-08-08 Sydney

> **FROZEN PACKET — NOTHING APPLIED.**
> commit `b4d011bc04303654963b902ed99ab0eb4dd0c82f`
> rollup `dccb666664f61dc0e3e4ff95d26533d562c620ab890fc9e95c7c0aaa594c1f0f` (10 artifacts)
> Re-verify the rollup against the pin before any downstream use — this worktree saw
> concurrent cross-session commits and pushes throughout, and that hash is the one thing a
> racing session can silently invalidate.

---

## 1. Result status

`Complete` — Gate A only. **Zero live behaviour change**, which was a pass/fail criterion of the
gate itself, not merely an intention. Nothing applied; the production-mutation watch gate
(~2026-08-11 20:20 Sydney) is untouched and unwaived.

## 2. Commit(s)

Packet, oldest first:

- `910059d` — A1 determination + Gate-A brief v1→v3
- `bd4fafd` — registers v6.173 pointer
- `241cb1c` — Gate-1 ISSUED
- `b1a26e9` — A1 deliverables (forward + rollback + Asset Gap handoff + stale publisher comment)
- `cc8270c` — A3 design finding (silent-degradation path located)
- `463ac8f` — A3 Option-A design
- `4a1b29b` — A3-1 authored + rollback
- `f3ffb3b` — A3-3 gap analysis + `detection_source` discriminator
- `cedb25b` — A3-3 detector + rollback
- `dc77173` — A3-2 authored + first hermetic validation
- `a5c9034` — fix M1–M3, S2–S4, S9
- `800c92f` — fix N1–N5
- `7a6dc0b` — lifecycle validation added
- `2fb4dd0` — fix R1, R2, R3 rename
- `a8f9585` — C2 + N8
- `620e4fa` — **C1 closed** (runtime-grid path executed)
- `f95ad43` — `classifier_version`
- `878fb80` — fail-soft NULL fix
- `2253f3b` — F1/F2/F3/F5 ⚠ **its message claims "56/56" and that is FALSE — see §6**
- `b4d011b` — **correction + guard restored; genuinely 57/57 + 31/31. FROZEN PIN.**

⚠ **Cite `2253f3b` and `b4d011b` as a PAIR, never `2253f3b` alone.** Unsquashed on PK's ruling
that the sequence is better audit evidence than a manufactured clean history.

Adjacent, not part of this packet: `rescue/26d67e3-migration-hygiene-and-music-promotion-gate`
(another lane's dangling commit, rescued as an exact branch ref, SHA preserved).

## 3. Files changed

**Apply artifacts — all `NOT_APPLIED_*`, four forward + four rollback:**
`…cc0091_a1_instagram_platform_support_correction_v1.sql` (+ `_ROLLBACK_`) ·
`…cc0091_a3_1_format_capability_drop_surface_v1.sql` (+ `_ROLLBACK_`) ·
`…cc0091_a3_2_format_default_annotation_v1.sql` (+ `_ROLLBACK_`) ·
`…cc0091_a3_3_mix_rewrite_removal_detector_v1.sql` (+ `_ROLLBACK_`)

**Determination + design records:** `cc-0091-a1-instagram-video-format-determination-v1.md` ·
`cc0091-a3-design-finding-silent-degradation-path-v1.md` · `cc0091-a3-option-a-design-v1.md` ·
`cc0091-a3-3-mix-rewrite-gap-analysis-v1.md` ·
`cc0091-a1-asset-gap-handoff-video-short-kinetic-audio-v1.md`

**Harnesses:** `cc0091-a3-validation.mjs` (57) · `cc0091-a3-lifecycle-validation.mjs` (31)

**Brief:** v1 → v2 → v3 (v1/v2 retained unaltered as audit records)

**One non-docs file:** `supabase/functions/instagram-publisher/index.ts` — comment-only,
mechanically verified (+11/−1, zero non-comment tokens), **not deployed**.

## 4. Actions taken

**A1 — the determination, and the most load-bearing artifact in the lane.**
11 `ffprobe` probes of real rendered `.mp4` files from `m.post_render_log` established that
three Creatomate short-video formats were wrongly marked unsupported on Instagram
(`video_short_stat` = `false`; `video_short_stat_voice` and `video_short_kinetic_voice` = **key
ABSENT**, not JSON null). All produce 1080×1920 exactly 9:16, h264 High/yuv420p, AAC 44.1–48 kHz
2ch, 12–27 s, ≤6.5 Mbps, on public bucket URLs on the same host Instagram has already fetched
from six times. `video_short_kinetic` stays `false` with cause recorded — **no audio stream,
4/4 renders**; whether Instagram rejects silent video was NOT tested and is NOT asserted.

**The determination also prevented a wrong fix.** The same 2026-07-25 renormalisation was
**CORRECT** on Facebook (its publisher genuinely has no video path — `publisher/index.ts` v1.9.0:
*"video/animated/unknown → FB has no publish path → blocked"*) and left YouTube untouched
(its flags were right). Instagram was the **only** platform where the registry disagreed with its
own publisher. Without A1 the obvious remedy — "restore video everywhere" — would have been wrong
on two platforms.

**A3-1** — durable runtime-drop evidence surface: table, STABLE detector, writer, 90-day
retention, `ice_ro` view. Drops are grounded in the grid's **real output** (`enabled_set` LEFT JOIN
the live grid), so the capability predicate is duplicated nowhere.

**A3-2** — a BEFORE INSERT trigger on `m.slot_fill_attempt` recording whether a fill took the
`COALESCE(format_preference[1],'image_quote')` default or honoured an explicit request. Chosen over
rewriting `m.fill_pending_slots` (34 KB, nightly publish path), which stays **byte-unchanged**.

**A3-3** — detector, writer and class-elimination alarm for **authoring-time** mix rewrites, which
A3-1 structurally cannot see. Class axis is `output_mime_type`, **not** `format_category` — the
latter is NULL for all seven video formats, so a guard built on it would have been blind to exactly
the class that was eliminated.

**Validation** — 57 per-artifact + 31 lifecycle assertions, executing the **real artifact SQL** in
PGlite. The lifecycle suite runs all eight files: forward → assertions → rollback → baseline
assertions → forward again → assertions. It proves the A1 asymmetric rollback restores
`platform_support` **byte-identically including the absent-key rows** (a symmetric rollback fails
that assertion), that A1 is single-shot and re-appliable only after its rollback, that the
data-loss guard fires and then succeeds only once evidence is consciously cleared, and that rolling
back A3-1 before A3-3 hard-errors rather than silently succeeding.

## 5. Constraints confirmed

- **Do NOT apply any migration** — confirmed not done. All eight SQL artifacts remain `NOT_APPLIED_*`.
- **Do NOT deploy any edge function** — confirmed not done.
- **Do NOT make any live scheduling or mix behaviour change** — confirmed not done; no draft
  generated, no mix row altered, no schedule affected.
- **Do NOT apply A2a or A2b** — confirmed; A2a/A2b were deferred wholly to Gate B, so neither was
  authored in Gate A.
- **Do NOT publish a Reel** — confirmed not done.
- **Do NOT unfreeze Lane 5 `select_music`** — confirmed; branch `lane5/select-music-seed-rotation
  @ b24ebe4` untouched. The `video_short_kinetic` audio dependency is **recorded, not actioned**.
- **Do NOT change LinkedIn or YouTube** mix, publisher behaviour or scheduling — confirmed.
- **Do NOT publish the Meta app to Live / alter business verification / change any FB or IG
  setting** — confirmed not done (Gate C, PK-owned).
- **Do NOT mark any capability `proven`** — confirmed; nothing marked proven.
- **Do NOT clean or archive worktree `admiring-shtern-6fdb19`** — confirmed untouched.

## 6. Open issues

**⚠ F6 — a stale comment now CONTRADICTS the constraint it describes. Highest-value item here.**
`NOT_APPLIED_cc0091_a3_1_…_v1.sql`, `classifier_version` comment block, still reads:

> *"The column is deliberately NOT in `ck_fcd_class_scope`, since a legitimate NULL is expected on
> the platform-level path."*

**That is now FALSE.** F2 put `classifier_version` **in** `ck_fcd_class_scope`, on **both** branches,
~70 lines below. **THE CORRECTION:** the column IS in the constraint —
`runtime_grid ⇒ NOT NULL`, `mix_rewrite ⇒ NULL`. The hazard runs the wrong way: a maintainer
reconciling the contradiction may **delete the conjunct**, reintroducing the hole F2 closed.
Recorded here rather than re-pinned, per the auditor's own recommendation. Sweep it on any future
re-pin.

**⚠ `2253f3b`'s commit message claims "56/56" and the suite had ERRORED.** I filtered the run
output with a grep matching only my new assertions, saw them pass, and committed without confirming
completion — the filter also matched *"annotation is FAIL-OPEN"*, so a truncated tail looked clean.
`b4d011b` corrects it explicitly and adjacently. **Never cite `2253f3b` alone.**

**Carried, unresolved, PK-scoped — disclosed, not defended (17):**
R4 unbucketed `p_week_start` still passed to the detector while the bucketed value is stored ·
R5 `last_observed_at` absent from the alarm view · R6 A1's already-applied branch is weaker than its
own rollback guard 3, and `->>` cannot distinguish JSON boolean `true` from string `"true"` ·
R7(a) live `ice_readonly` reachability, unprovable offline · R7(c) the `p_platform=NULL` path ·
N6 `current_effective_from` not persisted · N9 no warning on an unrecognised `decision` ·
**N10 the single-call apply channel is unnamed and EVERY atomicity guarantee depends on it** ·
N11 the alarm is lagging, not live, and contingent on Gate B wiring the writer ·
S1 two forwards carry no executable in-transaction assertions · S5 the write path is
postgres/pg_cron-only (SECURITY INVOKER, no service_role grants) and unnamed in the packet ·
S6/S7 rollback ordering guards documented but not executable, one can strand its own rollback ·
S8 hidden coupling on a fully-qualified body under `search_path=''` · S10 +6 unused-index noise ·
**F4 the RAISE's rollback is guaranteed but its VISIBILITY is not — do NOT wrap the writer in a
swallowing `EXCEPTION WHEN OTHERS` at the Gate-B call site** · F6 above.

**Not open, recorded for completeness:** `video_short_stat_voice` and `video_short_kinetic_voice`
are ALSO missing the `linkedin` key entirely — same absent-key defect, second platform. Out of
cc-0091 scope; needs its own decision.

## 7. Next recommended step

**Gate B.** Named entry conditions, in order:

1. Apply A1 under a PK gate (after the watch gate clears).
2. Author + apply **A2a** proof-tier mix; generate exactly the drafts needed.
3. Publish **one governed Reel per newly-supported format** — `video_short_stat`,
   `video_short_stat_voice`, `video_short_kinetic_voice`. **Transport proof.**
4. **Permit or block A2b** on that evidence. A2b must not be applied on artifact evidence alone.
5. **A5** must land before the 30-day experiment half.
6. Handoff contract: **N10** name the single-call apply channel · **S5** postgres/pg_cron-only write
   path, plus `m.heartbeat()` wiring so a stale `last_observed_at` is diagnosable · **F4** no
   swallowing handler at the call site · **R7(a)** prove the three `ice_ro` views readable AS
   `ice_readonly`, live.

**Gate C (PK-owned, independent):** the `Invegent Publisher` Meta app is **Unpublished / In
Development**, so Facebook posts are visible only to app-role holders across all four pages. Blocked
on business verification ("Needs more info"). Unrelated to this packet and unfixed.

---

## 8. Verification

**Verdict:** `Pass with notes`

- **Did output match the brief?** Yes. Gate A scope was A1 + A3 with zero live behaviour change;
  that is what was delivered. A2a/A2b were deferred wholly to Gate B per PK's ruling.
- **Were constraints respected?** Yes — §5, each confirmed individually.
- **Were unexpected files changed?** One non-docs file, `instagram-publisher/index.ts`,
  comment-only and mechanically verified, correcting a **stale claim that no reel had ever
  published** (six had; latest 2026-06-19). Not deployed.
- **Were success criteria met?** Yes, including the pass/fail criterion of zero live behaviour change.
- **Review chain:** seven internal DB/RLS rounds — block → block → concerns → clean → clean →
  concerns → **CLEAN with an explicit "no must-fix correctness or rollback defect remains"**.
  Three external rounds, converging: P2's mechanism verified (exact-signature stamp, NULL
  disambiguated, internal rounds passed); escalation moved off the packet and onto the carried list.
  **P1 ruled by PK: Option A confirmed.** **P2 ruled discharged by PK.**
- **New risks?** F6, and the carried list. Both disclosed above.
- **Follow-up?** Gate B.

## 9. Learning notes

- **The determination was worth more than any artifact.** Measuring 11 real files beat reading
  flags, and it is what stopped a fix that would have been wrong on two platforms. When a registry
  and a publisher disagree, measure the artifact.

- **Every hardening round introduced a smaller defect of the same family as the one it closed —
  four consecutively.** N2's `reason_code` key *moved* a NULL hole (→R1); R1's `NULLS NOT DISTINCT`
  *flipped* a failure direction from lossless duplication to silent evidence collapse (→N8);
  `classifier_version` closed a reinterpretation hole and *opened* a NULL ambiguity, then its lookup
  went non-deterministic (→F1). None careless — each a second-order consequence only visible once
  the first-order fix was in. **This is the signal that hardening has stopped paying**, and PK
  called the stop on exactly that basis.

- **The fourth was different in kind, and is the sharper lesson.** It was not an addition but a
  **removal**: I deleted a working guard as "provably dead" on an argument that sounded airtight.
  The next test run disproved it. *"Provably dead" is a claim about reachability, and reachability
  under plan caching is not visible in the statement you are reading.* Do not delete guards on
  reachability arguments alone.

- **Code inspection got the same PostgreSQL behaviour wrong three times; execution settled it in
  one run.** A `'literal'::regprocedure` cast folds to an OID at plan time, the plan is cached, and
  `DROP`+`CREATE` assigns a new OID while the cached plan keeps the dead one —
  `pg_get_functiondef` on a dead OID returns **NULL, not an error** (confirmed on live PG 17.6).
  `CREATE OR REPLACE` preserves the OID and is safe. **Both auditors read that SQL and neither
  caught it — it was not visible to reading at all.** The strongest argument in this lane for the
  lifecycle harness PK required.

- **A green signal you did not watch complete is not a green signal.** The `2253f3b` false claim
  came from filtering test output and inferring success. Read unfiltered tails.

- **Tests that fail before the fix are the only ones that prove it.** The overload assertion and the
  stale-OID assertions each fail against the preceding commit. That is the property to design for.

- **Assertion-guard every scripted edit.** One prose replacement silently no-opped for two rounds
  because it carried no assertion, leaving a stale comment in a frozen artifact.

- **Reusable pattern — record the reasoning that failed, in the file.** Every correction in this
  packet names the earlier wrong claim rather than quietly replacing it. The internal auditor called
  the correction commit "the strongest single piece of evidence in this packet", and PK ruled
  against squashing for the same reason.

- **Brief wording that would have helped:** Gate A's "zero live behaviour change" only became
  enforceable once it was written as a **pass/fail criterion of the gate**. Intentions in a scope
  section do not bind; criteria do.
