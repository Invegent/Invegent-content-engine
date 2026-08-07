# Lane 5 step 1 — reconciliation of the untracked 5-arg `select_music` draft

**Status: ANALYSIS COMPLETE — disposition is PK's.** Read-only. Nothing applied, nothing deleted,
nothing committed to the migration ledger. **Authored:** 2026-08-07.

**Subject:** `supabase/migrations/20260711003222_select_music_per_platform_scope.sql`
(175 lines, **UNTRACKED** in git, **NOT** in the migration ledger, authored ~2026-07-11 by a
parallel session as cc-0038).

**PK's step-1 instruction:** *"Either it is usable ancestry or it is explicitly retired/superseded.
Don't let two competing implementations exist."*

---

## Verdict: NOT ancestry for Lane 5. Park it as its own lane — do not merge it into the rotation change.

The draft is **good work and solves a real problem**, but it is a *different* problem, and folding it
into Lane 5 would violate Lane 5's own bounded outcome.

## 1. What the draft actually does

| | |
|---|---|
| **Concern** | Per-**platform** eligibility scoping (cc-0038, T3, SAFETY_GATE) |
| **Signature** | `DROP FUNCTION` 4-arg → `CREATE FUNCTION` 5-arg, adding `p_platform text DEFAULT NULL` |
| **Content-ID gate** | Changed from global to **platform-conditional**: required unless platform ∈ {facebook, linkedin, instagram}; youtube / unrecognised / NULL still require it |
| **Scope** | **Composes** a platform `scoped_approval` on top of the existing format one |
| **Selection tail** | `ORDER BY t.loudness_lufs NULLS LAST, t.duration_seconds DESC, t.track_key LIMIT 1` — **byte-identical to live. It adds NO rotation.** |

**So the draft and Lane 5 are orthogonal:** the draft changes *who is eligible*; Lane 5 changes *how
a winner is picked from the eligible set*. They collide only because both must rewrite the same
function.

## 2. Why it cannot be merged into Lane 5

PK's bounded outcome for Lane 5: *"Prove that multiple governed eligible music tracks can actually be
selected by ICE, **without weakening any existing eligibility, approval, Content-ID or format-scope
gates**."*

The draft **deliberately relaxes the Content-ID gate** — that is its entire purpose (letting CC0 beds
play on Facebook/LinkedIn/Instagram where Content-ID does not run). Whatever its merits, that is
precisely the change Lane 5 is forbidden to make. Merging them would make the rotation proof
unreviewable: a reviewer could not tell whether a behaviour change came from rotation or from the
relaxed gate.

**Second reason — blast radius.** The draft's composed scope makes **every currently-approved track
ineligible until PK grants a platform approval**. That means `calm_piano_drifting_006` goes dark on
apply, and every governed video renders a silent bed until platform approvals exist. That is a
significant, deliberate, fail-closed change which deserves its own gate and its own proof — not a
passenger seat on a rotation migration.

## 3. What Lane 5 SHOULD inherit from it — the technique, not the content

The draft is better than my Lane 5 packet on two mechanical points, and Lane 5 should adopt them:

- **`DROP` + `CREATE`, not an additive overload.** My packet recommended creating a 5-arg alongside
  the 4-arg and dropping the old one later. **That was the worse call** — see §4. The draft's
  DROP+CREATE leaves exactly one function and no resolution ambiguity.
- **Load-bearing ACL discipline.** A freshly `CREATE`d function is born EXECUTE-able by
  `anon`+`authenticated` (default ACL applies on CREATE, not on REPLACE), and `REVOKE FROM PUBLIC`
  does not clear it. The draft does `REVOKE ... FROM PUBLIC` **and** `FROM anon, authenticated`,
  `GRANT` to `service_role`, then an **in-transaction `has_function_privilege` post-assert** that
  aborts the migration on a leak. Lane 5 must carry this verbatim — it is the standing
  `public fns born anon-executable` gotcha, and Lane 5 will also be a DROP+CREATE.

## 4. Two corrections to the Lane 5 packet (v1), found here

**(a) The worker sends TWO named arguments, not four.** Verified at
`supabase/functions/video-worker/index.ts:906-909`:

```ts
await supabase.rpc('select_music', { p_scope_kind: ..., p_scope_value: ... })
```

The live function carries defaults for the other two (`p_min_duration_seconds numeric DEFAULT 12`,
`p_mood text DEFAULT NULL`; `pronargdefaults = 2`, confirmed live). My packet's claim that the worker
"still sends four named arguments" was wrong.

**(b) That makes the overload hazard WORSE than I described, and kills my recommendation.** With only
two named arguments on the wire, a 4-arg and a 5-arg function would **both** be satisfiable by those
two arguments plus defaults — genuine PostgREST ambiguity, on the live render path. My "additive
overload first, drop later" sequencing would have walked straight into it. **Adopt the draft's
DROP+CREATE instead.** The Lane 5 packet's §4(a) should be corrected accordingly.

Consolation: because the worker passes no `p_seed`, adding one with `DEFAULT NULL` needs **no worker
change to be safe** — the seed path stays dormant (index 0, deterministic, exactly today's behaviour)
until the worker is updated to pass the draft id. Migration and deploy are therefore decoupled.

## 5. ⚠ Immediate hygiene risk — independent of any decision

**The file sits untracked in `supabase/migrations/`.** That directory is scanned by tooling: a
`supabase db push` or equivalent from this checkout could pick up a 175-line, never-reviewed,
never-applied T3 migration that **drops and recreates a live production function** and takes
Drifting Piano dark. It is invisible in git history, so nobody reviewing the repo would see it
coming.

**Recommend regardless of disposition: get it out of `supabase/migrations/`.** Either commit it to a
non-scanned location (e.g. `docs/briefs/artifacts/cc-0038-select-music-per-platform-scope-PARKED.sql`)
with a PARKED header, or delete it now that its content is analysed here. Leaving it untracked in the
migrations directory is the one option with a real downside.

## 6. Recommended disposition (PK decides)

1. **Retire it from Lane 5's path** — it is not ancestry for rotation, and merging it would breach
   Lane 5's no-weakening constraint.
2. **Preserve it as a parked cc-0038 lane**, not deleted — the per-platform scoping problem is real
   (a global Content-ID gate excludes every CC0 track on every platform) and this is a considered
   design worth returning to.
3. **Move it out of `supabase/migrations/`** per §5, today.
4. **Sequence: rotation first, platform scoping second.** Rotation is narrow, gate-preserving, and
   delivers PK's milestone. Platform scoping is a deliberate eligibility change with a
   go-dark-on-apply consequence that wants its own gate.
5. **Whichever lands second must be rebased onto the first** — both DROP+CREATE the same function, so
   they can never be authored independently. Note this in the parked file's header so a future
   session cannot miss it.
