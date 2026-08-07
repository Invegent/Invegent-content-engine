# `select_music` seed rotation — PK CONTRACT FREEZE record (R2 · R3 · R6 closed)

**This is a RULING RECORD, not a second contract.** The contract lives in
`docs/briefs/select-music-seed-rotation-gate1-brief-v1.md`, authored by a parallel session, which
already structures the lane as resolutions **R1–R6** and correctly marks R2/R3/R6 as **NOT RULED**.
PK's 2026-08-07 step-2 direction rules on exactly those three. **Apply these rulings into that brief;
do not fork a competing document** — that is the same failure R1 retired the cc-0038 draft for.

**Recorded by:** the music-lane session (batch-2 / Lane 4 / Lane 5 step 1).
**Authority:** PK's words below are quoted verbatim; everything else is mapping, not authority.

---

## 1. PK's freeze (verbatim)

> For Lane 5, freeze the contract around these rulings:
>
> * Existing eligibility, Content-ID, approval and format-scope gates remain unchanged.
> * Fifth argument is `p_seed text DEFAULT NULL`.
> * Existing callers that omit `p_seed` must preserve today's deterministic index-0 behaviour.
> * Winner selection uses the approved deterministic seed mechanism, not loudness as the winner.
> * Cooldown is bounded so a non-empty eligible pool can never be emptied.
> * Return contract remains unchanged.
> * Migration uses one atomic `DROP` + `CREATE`; do not temporarily expose competing overloads.
> * Explicitly restore the intended ACLs after CREATE and prove no unintended `PUBLIC` / anon /
>   authenticated execution remains.
> * Worker change is not required for the migration proof; seeded caller activation can remain a
>   separate later step.
>
> The frozen contract must also define the split proof:
>
> 1. database/resolver proof — pool sizes 1–4, ≥40 controlled seeds, reachability, determinism,
>    distribution, cooldown safety;
> 2. capability proof — after the governed four-track pool exists and the caller supplies seeds,
>    demonstrate ≥3 distinct tracks in governed renders/usage evidence.
>
> Do not implement yet.

## 2. Effect on the brief's open resolutions

| Resolution | Prior state | Effect of PK's freeze |
|---|---|---|
| **R2 — seed / signature contract** | NOT RULED | **RATIFIED AS DRAFTED.** PK's three clauses (`p_seed text DEFAULT NULL` as 5th arg · omitting callers preserve index-0 · return contract unchanged) match R2 line-for-line. R2's supporting decisions carry with it: `LANGUAGE plpgsql` for the FNV-1a loop, `STABLE`/`SECURITY DEFINER`/`SET search_path TO ''` retained, **no warnings column added**. |
| **R3 — deterministic ranking / indexing** | NOT RULED | **RATIFIED AS DRAFTED.** PK's *"winner selection uses the approved deterministic seed mechanism, not loudness as the winner"* is exactly R3's `idx = FNV1a_32(p_seed) mod |C|`, with the existing rank key retained **for array order only**. The corollary stands: `loudness_lufs = NULL` is harmless, so **M1 is not a prerequisite for this lane**. |
| **R6 — proof criteria** | NOT RULED | **RATIFIED, REORGANISED into PK's two parts** — see §3. No acceptance threshold is weakened. |
| R1 (retire draft) · R4 (bounded cooldown) · R5 (atomic swap) | PK APPROVED 2026-08-07 | Unchanged. PK's freeze restates R4 and R5 in its own words; no conflict. |

**Nothing in PK's freeze contradicts anything already approved.** Where PK's wording is terser than
the brief's, the brief's detail is the implementation of PK's clause, not an extension of it.

## 3. R6 mapped to PK's two-part split

PK ruled a **two-part** proof; the brief drafted a **three-part** one. These are compatible — the
brief's (a) and (b) are both database-side and together constitute PK's part 1.

**Part 1 — database / resolver proof** (= brief R6(a) + R6(b)). PK's named criteria, all of which the
brief already carries:
- **pool sizes 1–4** — assert at every size, including `|E| = 1`, where cooldown `N` must be 0 and
  behaviour must equal today's;
- **≥40 controlled seeds**;
- **reachability** — every eligible track selected at least once. **HARD requirement**;
- **determinism** — re-running the same 40 seeds returns the identical 40 picks;
- **distribution** — no single track ≥50% of draws; record exact counts. A materially worse spread
  than B-roll's 10/10/10/10 is an investigation trigger, not an automatic failure;
- **cooldown safety** — `|C| ≥ 1` holds at every pool size; excluded tracks provably absent from the
  candidate set.

**Keep the brief's cooldown-neutrality caveat** — it is load-bearing and PK's wording does not
displace it: *a naive 40-seed sweep against a cooldown-enabled resolver reports false
unreachability*, because cooldown excludes the same recent tracks on every seed. The reachability
sweep must run with cooldown provably inert (`N = 0`) or against a pool with no recent usage in scope.

**Part 2 — capability proof** (= brief R6(c)). After the governed four-track pool exists **and the
caller supplies seeds**: `m.music_usage_event` shows **≥3 distinct tracks** exercised in governed
renders. Baseline for comparison already established: **11/11 single track, 2026-07-19 → 2026-08-05**.
Synthetic seeds alone do not close the lane.

**Part 1 is developable now** against a synthetic/hermetic pool. **Part 2 cannot run** until the
approval gate in §4 exists — PK's own phrasing (*"after the governed four-track pool exists and the
caller supplies seeds"*) already assumes it.

## 4. ⚠ The unowned gate — surfaced by the parallel session, and it is real

Independently verified live 2026-08-07: `uplifting_composed_pluto_007`, `warm_acoustic_simple_001`
and `neutral_short_4mei_009` are all still `approval_status='intake_candidate'` with
`content_id_safe=false`. **The live selectable pool is still exactly 1.**

Even after Lane 4's flip applies, those three stay unselectable until **both**:
- all four fences open (`approved`, `production_use_allowed`, `is_active`, and
  `approval_status='approved_scoped'`); **and**
- an `m.music_review_event` row exists with `event_kind='scoped_approval'`, `scope_kind='format'`,
  `scope_value='video_short_stat'` — **currently zero such rows exist for these three**.

**No lane owns that step.** Lane 4 ends at Content-ID clearance and is forbidden from flipping
fences; Lane 5 is forbidden from touching approval. The true sequence is:

> **Lane 4 (flip) → ⟨UNOWNED: PK approval + scoped-approval events⟩ → Lane 5 proof part 2.**

**This lane must not be recorded as blocked on Lane 5 when it is actually blocked on an unowned
approval gate.** PK's ruled sequence has this as step 5 (*"execute the three CLEAN flips and their
required scoped approvals/promotion"*) — so it is acknowledged, but it currently has **no packet, no
tier, and no owner**. That is the gap to close before part 2 can be scheduled.

## 5. Unresolved gate decisions returned to PK

1. **Who owns the approval/promotion step (§4)?** It needs a packet, a tier (T3 — it opens fences on
   the live render path), and a named owner. Without it, part 2 of the proof cannot be scheduled.
2. **Cooldown parameters are ruled in shape but not in value.** R4 fixes the *guard* (a non-empty
   eligible pool can never be emptied). The *window* — how many recent tracks, over what period, per
   which scope (client / platform / format / global) — is not ruled. At pool size 4 the window
   materially changes the observed distribution, so it should be pinned before part 1 is measured or
   the numbers will not be comparable across runs.
3. **Does part 1 gate the apply, or run against production after it?** The brief's part 1 is
   developable hermetically, but a `BEGIN … ROLLBACK` rehearsal on the real schema is the only way to
   prove live-schema compatibility. Recommend: hermetic part 1 → rehearsal → PK gate → apply →
   re-run part 1 live → part 2 later. Not ruled.
4. **The Phase-1 production-write watch (to ~2026-08-11 20:20 Sydney) is not waived** by this freeze.
   PK's 2026-08-07 standing direction is explicit that an authorisation on one step does not override
   an independent hold. The apply lands after the watch unless PK rules otherwise at that gate.

## 6. Boundaries honoured in producing this record

Nothing implemented. No migration authored, no function changed, no deploy, no worker edit, no fence
flipped, no register cut. **The parallel session's brief was NOT edited** — it is uncommitted in-flight
work in a shared checkout, and mutating it would breach the shared-worktree discipline. This record is
additive and is intended to be folded into that brief by whoever owns it.
