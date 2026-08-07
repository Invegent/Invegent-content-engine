# Music rotation — DECISION PACKET (LANE 5)

**Authored:** 2026-08-07 · **Lane:** Music Lane 5, per `docs/briefs/music-lanes-4-5-parallel-handoff-v1.md`
**Local HEAD at authoring:** `be184ee`
**Status:** DESIGN / ANALYSIS ONLY. **Nothing built, nothing changed, nothing decided.**
No DB write, no storage write, no fence flip, no deploy, no migration, no register cut, no push.
`select_music` not modified. Drifting Piano not revoked or fenced.

**This packet recommends. PK decides.** The recommendation in §5 is a recommendation, not an election.

---

## 1. The problem, re-verified live (not inherited from the handoff)

`select_music` ends with one deterministic winner:

```sql
ORDER BY t.loudness_lufs NULLS LAST, t.duration_seconds DESC, t.track_key
LIMIT 1
```

Verified live this lane against `pg_get_functiondef`, not just the repo:

- **Exactly one** `public.select_music` exists: `(p_scope_kind text, p_scope_value text, p_min_duration_seconds numeric, p_mood text)`.
- The live `ORDER BY` **matches the repo** migration `20260710115043` byte-for-byte on that clause.
- **No `p_seed`.** No rotation input of any kind.
- **Does not read `m.music_usage_event`** — the usage log exists and is being written, but the
  resolver ignores it. There is no cooldown, no least-recently-used, no dedup at selection time.
- `m.music_suitability`: **0 rows**.

### The empirical confirmation — this is not a theoretical concern

`m.music_usage_event`, live: **11 of 11 real production renders used `calm_piano_drifting_006`**,
spanning **2026-07-19 → 2026-08-05** (18 days), all `format=video_short_stat`.

That is the handoff's requested cross-check "against real usage, not synthetic seeds alone"
(`s3-m12-music-sourcing-plan-content-prep.md:151-157`), and it returns 100% repeat on live data.
The winner-takes-all behaviour is **measured, not predicted**.

### Why the pool cannot break the tie

Drifting Piano is **−27.2 LUFS**. The 12 batch-2 survivors span **−16.73 to −10.51**. Ascending sort
puts −27.2 first. The 8 batch-1 candidates have **`loudness_lufs = NULL`**, which sorts *last*.

So: **growing the pool changes which track could win, never whether the pool rotates.** Confirmed.

**Worth naming honestly:** the sort key is not arbitrary. Ascending LUFS = *quietest wins*, which is
a defensible proxy for "least likely to mask the voiceover." As a **selection** heuristic it is
reasonable; as a **rotation** mechanism it is degenerate. The problem is the absence of rotation, not
the presence of a bad sort.

---

## 2. Option A — revoke/fence Drifting Piano

**The finding that decides this option: it is not executable today.**

If Drifting Piano were fenced right now:

- Batch 2 is **not in the database** (intake blocked — `psql` unavailable, `DATABASE_URL` unset).
- All 8 batch-1 candidates are `intake_candidate`, four fences false, `content_id_safe=false`, and
  have **no `scoped_approval` event** for `(format, video_short_stat)` — verified live.
- → `select_music` returns **zero rows** → the caller binds `MusicBed.source=''` → **every governed
  video renders a silent bed.** (Not a failure: `video-worker/index.ts:902-923` throws only on RPC
  *error*; an empty result set is the designed VO-only path.)

So Option A today = **turning music off across governed video**, not rotating it.

Even executed later, after the intake unblocks and a replacement is approved + scoped +
Content-ID-cleared, Option A **still produces zero rotation** — it relocates the single permanent
winner from Drifting Piano to (mechanically) `uplifting_lofi_springsight_011` at −16.73.

| | |
|---|---|
| **Cost** | production DML on a governance table; T3 |
| **Dependencies** | blocked intake **+** an approval gate **+** Lane 4 clearance — three, all open |
| **Rotation delivered** | **none** |
| **Risk** | silent-bed window on live governed video if sequenced wrong |

**Assessment: reject as an end state.** Option A is a legitimate *emergency lever* — if Drifting
Piano is ever found Content-ID-unsafe or otherwise unusable, this is how it gets pulled — and it
should be kept in that role. It is not a rotation strategy.

---

## 3. Option B — resolver upgrade (`p_seed` / weighted selection)

**This is the real fix**, and the precedent for it is proven and live in this codebase.

### The precedent is strong and directly transferable

`resolve_slot_assets` has performed seed-stable ranked selection since v1.0 (`20260703002813`) and
still does at v1.5 (`20260729225034`): FNV-1a 32-bit over the UTF-8 bytes of `p_seed`, modulo the
ranked-candidate count, `NULL` seed → rank #1. Five successive live versions, unchanged mechanism.

**v1.5 is the more mature model** and is what a music version should mirror: it combines the seed
hash with a **recent-use exclusion** read from render history, plus a bounded window, plus an
explicit warning when the seed isn't a draft id. That is seed-stability *and* anti-repeat, which is
what "rotation" actually needs.

### Feasibility — smaller than it looks

- **The seed already exists at the call site.** `video-worker/index.ts:1480` calls
  `resolveGovernedMusicBedUrl` from a scope where `draft.post_draft_id` is in hand (used one line
  earlier at `:1476`). `p_seed = post_draft_id` is already the house convention for
  `select_template` (`:1448`, `:1542`). The worker change is small.
- **Determinism is preserved.** Seeded selection is reproducible — the same draft always resolves to
  the same bed. (This is why the answer is a seed and *not* `ORDER BY random()`, which would make a
  render irreproducible and unauditable. Naming the rejected alternative explicitly.)
- **The usage log is already populated** (11 rows) and already carries `client_id`, `platform`,
  `format`, `draft_id`, `render_id`, `used_at` — everything a cooldown/LRU variant would need. No new
  capture work.

### Honest costs

| | |
|---|---|
| **Scope** | migration (`CREATE OR REPLACE public.select_music` with `p_seed text DEFAULT NULL`) **+** video-worker edit **+** EF deploy |
| **Tier** | **T3** — touches a live production function on an `enabled=true` path, plus a deploy |
| **Gotchas already known** | `CREATE OR REPLACE` preserves the ACL but re-assert + post-assert anyway; deploy must carry `--no-verify-jwt` discipline; adding a parameter creates a **new overload** unless the existing 4-arg signature is replaced — an overload would leave the old seedless function callable and is the main correctness trap in this change |
| **Rotation delivered** | **yes — this is the only option that does** |

### The sequencing property that matters

**Option B is not blocked by the blocked apply lane.** With a pool of 1, a seeded resolver returns
the same single track for every seed — behaviour provably identical to today, because `LIMIT 1` over
a one-row candidate set is index-independent. So the resolver upgrade *can* land while the pool is
still 1, as a safe no-op, and rotation switches on by itself when the pool grows.

**But the proof cannot land early.** The 40-seed uniformity check needs a pool > 1. So landing early
buys sequencing freedom at the cost of shipping an unexercised change to a live function — during a
watch window. **Recommended sequencing in §5 declines that trade.**

---

## 4. Option C — accept one permanent bed

Stated plainly rather than defaulted into, as the handoff requires.

This is **the accurate description of the present system**, and it is a legitimate product position
if music variety is not a near-term goal. Every governed video gets a consistent, VO-safe, verified
bed. Zero engineering cost, zero risk, zero new gates.

**What it actually costs:** every governed video for every brand shares one audio identity —
currently a −27.2 LUFS solo piano, on four brands (Property Pulse, NDIS Yarns, Care for Welfare,
Invegent) whose tone briefs are explicitly different (`manifest.json` → `brand_fit_advisory`). The
18-day, 11-render live record already shows what that looks like in production.

It also means the batch-2 work — sourcing, PK aural review, technical audit, packaging — becomes
**bench depth held indefinitely**, and Lane 4's Content-ID clearance has **no production effect at
all** (see the Lane 4 runbook §5).

**Assessment: honest, cheap, and currently true — but it should be an explicit election, not the
result of never deciding.** If PK picks C, the right follow-through is to say so in the register and
stop spending attention on music depth until that changes.

---

## 5. Recommendation

**Target Option B. Label the present state Option C explicitly and truthfully in the interim.
Keep Option A only as an emergency pull-lever. Do not start B during the watch window.**

Reasoning, in order of weight:

1. **A does not deliver rotation and is not executable today.** It is disqualified as an end state on
   the evidence, not on preference.
2. **B is the only option that changes the outcome**, its precedent is proven across five live
   versions of a sibling resolver, and the seed it needs is already at the call site.
3. **B should not be rushed into the watch window.** It is T3 — live function + worker deploy — for
   **zero immediate benefit**, because the pool is 1 and stays 1 until the blocked intake clears.
   Landing it early means shipping an unexercised change to a live path and still not being able to
   prove it.
4. **So the interim state is C, and it should be named as C** — not left as an unexamined default.
   That is the honest label for "one bed, deliberately, for now."

**What this recommendation does NOT claim:** that batch 2 was wasted (it is the pool B needs), that
Lane 4 is pointless (it is a precondition for B), or that C is a bad outcome (it is defensible if
music variety is not a goal). PK may reasonably elect C permanently — §4 states its real cost so
that choice is made with open eyes.

---

## 6. Named next gate

**For the recommended path (B):**

> **Gate 1 brief for a T3 `select_music` seed-rotation lane** — to be raised **after watch expiry
> (~2026-08-11 20:20 Sydney)** and **after the batch-2 intake channel decision unblocks the pool.**

Preconditions that must hold before that Gate 1 is worth raising:

1. Batch-2 intake **applied** (the blocked apply lane resolves) — otherwise the pool stays 1.
2. **≥3 tracks** fully approved: four fences on, `approval_status='approved_scoped'`, **and** a
   `scoped_approval` event for `(format, video_short_stat)` — *gate 7 in the handoff's table, the one
   most often forgotten; there are currently **zero** such events for batch 2.*
3. Those tracks **Content-ID cleared** via Lane 4 (PK-observed verdicts).
4. A PK decision on the **B-variant**: pure seed-hash (v1.0 model) vs seed-hash + recent-use
   exclusion (v1.5 model). **Recommend v1.5** — the usage log is already populated.

**Proof method** (reuse, do not reinvent — `s3-m12-music-sourcing-plan-content-prep.md:119-157`):

- **≥40 distinct seeds** through `select_music`, requiring (i) **100% reachability** — every eligible
  track selected at least once, and (ii) **near-uniform distribution**. Same acceptance shape as the
  B-roll G8 guard, proven live at 40 seeds / 4-clip pool → **10/10/10/10, zero unreachable**
  (`docs/briefs/results/broll-promotion-batch1-result.md:46,57-68`).
- **Cross-check against real usage** in `m.music_usage_event` across a real week — not synthetic
  seeds alone. This lane established the pre-change baseline for that comparison: **11/11 single
  track, 2026-07-19 → 2026-08-05.**

**For A (if elected as an emergency pull):** its own T3 gate, and it must be sequenced *after* a
verified replacement is selectable — otherwise it produces a silent-bed window (§2).

**For C (if elected):** no engineering gate. A register pointer recording the election, and a stop on
further music-depth spend until it is revisited.

---

## 7. Standing correction — M1 is NOT built

The delta audit named **M1 (automated loudness measurement)** as the blocker for M12's rotation
proof, because an all-NULL sort key is degenerate
(`creatomate-global-ultimate-final-delta-audit-v1.md:470`).

Batch 2's 12 survivors **do** carry measured `loudness_lufs` — but from a **one-off external
technical audit**, not from a pipeline. **M1 as a capability remains UNBUILT and must not be recorded
as done.**

Practical consequence, confirmed live: the **8 batch-1 candidates still have `loudness_lufs = NULL`**
and sort last **under the current seedless resolver**.

> **CORRECTION (2026-08-07, after collision with `8f0be67` — see §9).** An earlier draft of this
> section claimed a rotation pool containing NULL-loudness tracks would be "skewed until M1". **That
> is wrong under Option B.** With seed-indexing — `ranked_array[ hash(seed) mod count ]` — loudness
> determines only a track's **position** in the ranked array, not its **probability of winning**;
> every index is equally likely. NULL loudness is therefore **harmless to rotation**, and
> **M1 is NOT a prerequisite for Option B.**
>
> M1 remains genuinely wanted — for **bed-level consistency** (so beds don't jump in perceived
> loudness between renders) and for the acceptance-quality and reproducibility bars the delta audit
> names. It is **not** a rotation blocker. The delta audit's "blocks M12's rotation proof" framing
> assumed the seedless resolver, where sort position *is* destiny.

Net: M1 stays **UNBUILT** and must not be recorded as done — but it does **not** gate the Option-B
lane recommended in §5.

---

## 8. Forbidden in this lane — confirmed not done

`select_music` not modified · no migration authored or applied · no deploy · Drifting Piano not
revoked or fenced · no fence flipped · measured loudness **not** treated as M1 being built · blocked
apply lane not touched · no register version cut · nothing pushed.

**Open and named, not resolved here:** PK's election among A/B/C · the B-variant (v1.0 vs v1.5
model) · whether the 4-arg `select_music` signature is replaced or overloaded (§3, the main
correctness trap) · whether batch 1 gets a loudness backfill.

---

## 9. ⚠ Parallel session collision — complementary, not duplicate

A **parallel session ran Lane 5 concurrently** and committed `8f0be67` at 2026-08-07 14:29 +1000:
`docs/briefs/music-lane5-rotation-capability-packet-v1.md`. Neither session saw the other's work.
**Surfaced, not reconciled — PK owns which artifacts survive.**

The two Lane-5 outputs address **different halves of the deliverable** and appear to compose:

| | This packet | The parallel packet |
|---|---|---|
| **Question answered** | *Which* option — A/B/C compared honestly, recommendation, next gate | *How* to build B — mechanism, hazards, proof |
| Three-option comparison | **yes** (§2–4) | no — presupposes B |
| Live usage baseline | **yes** — 11/11 renders, 2026-07-19→08-05 | not present |
| Option A not executable today | **yes** (§2) | not present |
| Option-B mechanism detail | outline (§3) | **deeper** — ranked array, cooldown, `p_seed` NULL→index 0 |
| Overload hazard | flagged as the main trap (§3) | **verified live**, plus PostgREST resolution must be *tested* |
| Untracked conflicting 5-arg draft | cited second-hand via M12 | **verified untracked** (`20260711003222`) — reconcile/retire first |

**Where the parallel packet corrects this one:** the M1 prerequisite claim (§7 correction above).
**Where they independently converged:** mirror `resolve_slot_assets` v1.5 (seed + recent-use
exclusion); the lanes are independent of the blocked apply; the watch is not waived.

**Suggested reading order for PK, if both are kept:** this packet for the A/B/C election → the
parallel packet as the design for B once B is elected. Their §4 hazards and untracked-draft finding
should be carried into whatever survives.
