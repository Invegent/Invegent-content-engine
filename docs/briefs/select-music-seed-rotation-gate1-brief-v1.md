# Brief cc-XXXX — `select_music` deterministic governed seed rotation (GATE 1)

**Created:** 2026-08-07 Sydney
**Author:** Lane 5 (S3)
**Executor:** `ef-builder` (code) + PK (apply/deploy gates) — **not yet issued**
**Status:** **GATE 1 FULLY DISCHARGED — PK ruled R1/R4/R5, then R2/R3/R6 and the cooldown scope, all
2026-08-07.** All six resolutions are ruled; no design question remains open. The lane is **FROZEN
AWAITING THE UPSTREAM POOL** — the apply gate, the T3 chain and the live proof remain, and none can
start until the Music Promotion gate delivers four eligible tracks.
**Task ID:** `cc-XXXX` — **PK to allocate.** Deliberately not self-assigned: version/ID allocation
belongs to a single cut owner, and out-of-channel allocation is the documented collision cause.
**Result file:** `docs/briefs/results/cc-XXXX-select-music-seed-rotation.md` (on completion)
**Tier:** **T3** — production function on a live render path, plus an EF deploy. Nothing waived.
**Lane classification (CCF-02):** PRODUCT_PROOF with a safety-sensitive write.

**PK decision this brief implements (2026-08-07):** *Option B — deterministic governed seed
rotation.*

---

## PK RULINGS — 2026-08-07

**ALL SIX RULED.** First pass: R1 / R4 / R5 + approval ownership. Second pass: **R2 / R3 / R6 + the
cooldown scope**. Nothing in this brief is now awaiting a design decision.

| # | Ruling |
|---|---|
| **R1** | **APPROVED — retire the cc-0038 untracked 5-arg draft immediately.** Move it out of `supabase/migrations/`; retain it explicitly as `NOT_APPLIED / SUPERSEDED`; **do not silently delete its provenance.** *The seed design owns the 5-arg signature.* **EXECUTED 2026-08-07 — see the R1 Execution record.** |
| **R4** | **APPROVED — bounded cooldown `N = min(2, eligible_pool_size - 1)`.** Preserve **zero eligible -> zero rows**. A **non-empty eligible pool must never be emptied by cooldown.** |
| **R5** | **APPROVED — single-transaction atomic replacement** of the 4-arg `select_music` with the 5-arg seeded function. **Do not run both overloads concurrently.** The transaction **must explicitly establish the intended ACLs after `CREATE`, including removal of unintended default execution grants**, and the **apply proof must include the actual PostgREST/RPC caller path.** |
| **R2** | **RULED — `p_seed text DEFAULT NULL`.** Callers omitting it **preserve deterministic index-0 behaviour**. **Return contract unchanged.** |
| **R3** | **RULED — deterministic FNV-1a seed indexing over the stable eligible array.** The existing rank key **remains for stable array ordering only and no longer determines the winner.** |
| **R6** | **RULED — two parts.** **Part 1:** cooldown-neutral hermetic deterministic proof → `BEGIN`/`ROLLBACK` rehearsal → PK apply gate → atomic live swap → repeat live proof **and** actual PostgREST/RPC caller-path proof. **Part 2 (later):** governed-render / usage evidence proving **≥3 distinct tracks actually exercised.** |
| **Cooldown scope** | **RULED — format-scoped only for v1.** Exclude the most recent `min(2, eligible_pool_size - 1)` distinct tracks **for the current format**. **Do NOT** add `p_client_id` · **do NOT** derive client identity from `p_seed` · **do NOT** introduce a time window · **do NOT** reopen the approved 5-argument signature. |

### Approval ownership — a SEPARATE bounded Music Promotion gate

PK created a new gate **between Lane 4 and Lane 5 live proof**. This narrows all three lanes:

| Owner | Owns | Does NOT own |
|---|---|---|
| **Lane 4** | Content-ID **evidence** and the `content_id_safe` **flip** — *only* | eligibility fences, approvals, promotion |
| **Music Promotion gate** (NEW, bounded) | the **eligibility fences** and the required **`scoped_approval(format, video_short_stat)` events for the three CLEAN tracks** | resolver behaviour, Content-ID adjudication |
| **Lane 5** (this brief) | **resolver capability** — seed, ranking, cooldown, the atomic swap — *only* | flipping `content_id_safe`, granting approvals, deciding which tracks are eligible |

**Consequence for this brief:** Lane 5 must **not** grant a `scoped_approval`, flip `content_id_safe`,
or otherwise widen the eligible pool to make its own proof pass. If the pool is too small to
demonstrate rotation, that is a **Music Promotion gate** dependency, not a Lane 5 action.

### Ruled sequence

```
Lane 4 CLEAN
  -> content_id_safe flip
    -> Music Promotion gate   (prove 4 eligible tracks)
      -> Lane 5 atomic resolver apply
        -> deterministic seed/cooldown proof
          -> governed render proof exercising >= 3 tracks
```

**Gating note:** Lane 5's apply is downstream of a proven **4-eligible-track** pool. The live eligible
pool is currently **1** (`calm_piano_drifting_006`). The rotation proof (R6) is therefore **not
runnable until the promotion gate delivers**, regardless of code readiness.

### Standing constraint restated by PK

> **Do not implement or mutate production yet** — with the single exception of safely retiring the
> stale untracked cc-0038 artifact from the migration discovery path (R1), which is done.

---

## Task

Replace `public.select_music`'s permanent-winner tail with **deterministic seed-indexed selection
across the eligible pool**, preserving every existing eligibility gate exactly as-is.

Today the function ends `ORDER BY loudness_lufs NULLS LAST, duration_seconds DESC, track_key LIMIT 1`
— one deterministic winner, ascending by loudness, with no seed, no randomness and no cooldown. Live
evidence: **11 of 11 real production renders used `calm_piano_drifting_006`** (`m.music_usage_event`,
2026-07-19 → 2026-08-05). Pool size is irrelevant to that outcome.

After this lane: when multiple governed eligible tracks exist, the winner is chosen by a
deterministic function of a caller-supplied seed over the eligible pool. **Same seed → same track,
always.** Eligibility, Content-ID, approval and format-scope gates are untouched.

---

## Source context

- `supabase/migrations/20260710115043_select_music_require_content_id_safe.sql:71-121` — the live
  function. Verified live 2026-08-07 via `pg_get_functiondef`: exactly one overload,
  `ORDER BY` matches the repo, **no `p_seed`**, does **not** read `m.music_usage_event`.
- `supabase/migrations/20260729225034_resolve_slot_assets_v1_5_rotation_governance.sql:661-664,670-683,742-752`
  — **the mechanism to mirror.** Proven live across five successive versions of a sibling resolver.
- `docs/briefs/music-lane5-rotation-capability-packet-v1.md` — the committed Lane-5 design packet
  (commit `8f0be67`). This brief is its Gate-1 successor and resolves the three hazards it named.
- `docs/briefs/music-rotation-decision-packet-v1.md` — the A/B/C decision packet behind PK's election.
- `supabase/functions/video-worker/index.ts:902-923` (resolver), `:1476-1480` (call site — note
  `draft.post_draft_id` is already in scope), `:1448,:1542` (`p_seed = post_draft_id` house convention).
- `supabase/functions/video-worker/music_usage.ts` — `mapSelectMusicRow`, and the **D3 invariant**
  ("bed bound ⟺ `trackId !== null` ⟺ `url !== ''`").
- `docs/briefs/results/broll-promotion-batch1-result.md:46,57-68` — guard **G8**, the 40-seed proof
  shape (10/10/10/10, zero unreachable).
- `docs/briefs/artifacts/NOT_APPLIED_SUPERSEDED_cc0038_select_music_per_platform_scope_20260711003222.sql`
  (**RETIRED 2026-08-07 per PK R1**; was `supabase/migrations/20260711003222_select_music_per_platform_scope.sql`)
  — **the conflicting
  untracked draft. See §R1 — it must be resolved before any authoring.**

---

## The six pre-implementation resolutions

PK required these resolved *in the brief*, before implementation. Each below is a **recommendation
with evidence**; each remains PK's to accept or override at this gate.

### R1 — The untracked 5-argument draft: **RETIRE the file** — **PK APPROVED, EXECUTED 2026-08-07**

> #### R1 Execution record (2026-08-07)
>
> PK ruling: *"Retire the cc-0038 untracked 5-arg draft immediately. Move it out of
> `supabase/migrations/` and retain it explicitly as `NOT_APPLIED / SUPERSEDED`; do not silently
> delete its provenance. The seed design owns the 5-arg signature."*
>
> **Done, and scoped to that file only.**
>
> | | |
> |---|---|
> | Removed from | `supabase/migrations/20260711003222_select_music_per_platform_scope.sql` |
> | Retained at | `docs/briefs/artifacts/NOT_APPLIED_SUPERSEDED_cc0038_select_music_per_platform_scope_20260711003222.sql` |
> | Original sha256 | `65c77b6ae3a6820cbb432cb095a749f2dd245f5b26082a6d2576bbc090e92385` |
> | Body integrity | **byte-for-byte identical** after the retirement banner was prepended (verified programmatically) |
> | Blast radius | the **other 8** untracked files in `supabase/migrations/` were **not touched** (verified before and after) |
>
> **Verified live, read-only, BEFORE the move:** `public.select_music` is **4-arg**
> (`p_scope_kind, p_scope_value, p_min_duration_seconds, p_mood`), `SECURITY DEFINER`, `STABLE`,
> def md5 `61a18d15e9f49830bd257265e8c5ffbe`; `public.record_music_usage` is 6-arg. **Exactly one
> `select_music` overload exists live** — confirming the 5-arg draft was genuinely **UNAPPLIED**
> rather than assumed to be.
>
> The retained file carries a header recording NOT_APPLIED / SUPERSEDED status, the original path,
> what supersedes it, the live-verification evidence, why it was retired rather than deleted (it is
> the only record of the per-platform reasoning and the `pg_default_acl` CREATE-vs-REPLACE trap), and
> an explicit **do not move this back under `supabase/migrations/`**.
>
> **Disposition note:** this brief's own text recommended banner-marking the file **in place**. PK's
> ruling is **stronger** — move it out of the discovery path entirely — and matches the convergence
> note's §5 finding. PK's ruling governs; the in-place recommendation is superseded.
>
> **Carry preserved:** per-platform music scoping remains a real, unbuilt need. Retiring the file is
> **not** retiring the requirement (see "Carry created" below).

> **⚠ CONVERGENCE NOTE (added after commit `6c6b550`).** A parallel session executed this exact
> reconciliation while this brief was being authored:
> `docs/briefs/music-lane5-step1-5arg-draft-reconciliation-v1.md`. **It reaches the same disposition
> independently** — not ancestry for Lane 5, park as cc-0038, do not delete, do not merge, rotation
> first, `DROP`+`CREATE` over additive overload, load-bearing ACL discipline. Two independent
> derivations of the same call.
>
> **Adopt their §5 finding, which this brief missed:** the draft **sits untracked inside
> `supabase/migrations/`**, a directory scanned by tooling — a `supabase db push` from this checkout
> could pick up a 175-line, never-reviewed T3 migration that drops and recreates a live production
> function and takes Drifting Piano dark, invisibly to anyone reading git history. **Move it out of
> `supabase/migrations/` today, independent of any disposition decision** (e.g. to
> `docs/briefs/artifacts/cc-0038-select-music-per-platform-scope-PARKED.sql` with a PARKED header).
> That is the strongest immediate action item in this section.
>
> **Their correction to the design packet, verified:** the worker sends **two** named arguments, not
> four (`pronargdefaults = 2`, confirmed live) — which makes the overload hazard in R5 *worse* than
> the design packet described, and independently kills additive-first. This brief's R5 reaches the
> same conclusion by a different route.
>
> **Two findings below appear to be unique to this brief** and should be carried into whichever
> artifact survives: the **identical-type-signature** argument (why rebasing is not optional but
> structurally forced), and the **missing rollback file**. A third: their §6.2 restates the draft's
> premise — *"a global Content-ID gate excludes every CC0 track on every platform"* — as still true.
> **It is now stale**; see point 1 below.

**What it actually is.** Not a rival seed design — it is **cc-0038's per-*platform* scope work**:
`select_music(p_scope_kind, p_scope_value, p_min_duration_seconds, p_mood, p_platform)`. Untracked
(`git ls-files` → 0), unapplied (absent from the migration ledger, verified live).

**Why it is a hard blocker, more sharply than "two 5-arg definitions would collide".** Both designs
occupy the **identical PostgreSQL type signature** `select_music(text,text,numeric,text,text)` —
`p_platform text` and `p_seed text` are the same type in the same position. They are therefore
**mutually exclusive by construction, not merely conflicting**: they cannot coexist as overloads,
and `CREATE OR REPLACE` cannot rename an input parameter (Postgres rejects it — *"cannot change name
of input parameter"*). Whichever lands second must `DROP` the first.

**Two independent reasons the draft is not apply-ready as written:**

1. **Its stated premise is stale.** Its `WHY` reads: *"the global content_id_safe stop-gap excludes
   every CC0 track on every platform (0 eligible library-wide)"*. True when authored 2026-07-11.
   **False now** — the cc-0039 flip landed 2026-07-16 (ledger `20260716060642`, verified live), so
   `calm_piano_drifting_006` is `content_id_safe=true` and **1 track is eligible**. The over-broadness
   the draft exists to fix has already been partly relieved by a different route.
2. **Its claimed rollback does not exist.** The header pins
   `_harness/music_ratify_v0/rollback_20260711003222.sql` as *"validated before apply"*. That file is
   **not on disk** — the directory holds only `rollback_2026070922951`, `…0710005607`,
   `…0710094353`, `…0710104641`. A T3 migration whose validated rollback is missing cannot be applied
   under house rules regardless of this lane.

**Recommendation (as submitted): retire the FILE, keep the LANE.** ~~Banner-mark it
`DO-NOT-RUN — SUPERSEDED` in place~~ — **superseded by PK's stronger ruling: move it out of the
discovery path entirely.** The house precedent for the marking itself is the discarded S3 B-roll
resolver packet, whose rollback was banner-marked DO-NOT-RUN because running it would have silently
reverted live v1.4. Do **not** delete it — it holds the per-platform reasoning and the cc-0038 §6
central risk. **Executed as ruled; see the R1 Execution record above.**

**Explicitly NOT recommended:** merging platform-scope into this lane (a 6-arg function). That drags
cc-0038's central risk — *the content_id_safe relaxation is safe only while `youtube-publisher`'s
`.eq('platform','youtube')` filter holds, with no DB constraint enforcing it* — into a rotation lane
that has no need of it, and doubles the review surface.

**Carry created:** per-platform music scoping remains a real, unbuilt need. If PK later wants it, it
returns as a fresh design **on top of** the 5-arg seed signature (i.e. a 6-arg
`(…, p_seed, p_platform)`), with a rollback that exists. **Named here so retiring the file is not
mistaken for retiring the requirement.**

> ~~**PK decision required:** retire-the-file (recommended) · merge into this lane · defer this lane
> until cc-0038 is resolved on its own.~~
> **RESOLVED — PK ruled retire-the-file, 2026-08-07. Executed and independently verified
> (body sha256 `65c77b6a…2385` matches the original byte-for-byte; 203 lines = 28 banner + 175
> original). No decision outstanding in R1.**

### R2 — Seed / signature contract — **✅ PK RULED 2026-08-07**

> **Ruled:** `p_seed text DEFAULT NULL`; **callers omitting it preserve deterministic index-0
> behaviour**; **return contract unchanged.** The table below is adopted as written — it is exactly
> that shape, and the frozen FORWARD implements it (`p_seed IS NULL → v_idx := 0`, 8-column
> `RETURNS TABLE` byte-identical to v2).

| | |
|---|---|
| **Parameter** | `p_seed text DEFAULT NULL`, appended as the **5th** argument |
| **Caller value** | `draft.post_draft_id` — already in scope at `index.ts:1476-1480`, already the house convention at `:1448`/`:1542` |
| **`p_seed IS NULL`** | → **index 0**, deterministic. Never random. Mirrors v1.5 `:750-752`. This is what makes the migration safe to land before the worker deploy. |
| **Non-UUID seed** | Still hashes correctly (FNV-1a is defined over any byte string). v1.5 emits a `recent_use_seed_not_draft_id` warning; **`select_music` has no warnings channel** — it returns a typed `RETURNS TABLE`, not jsonb. |
| **Return contract** | **UNCHANGED — 8 columns, identical names/types/order.** Load-bearing: `mapSelectMusicRow` and the D3 invariant stay untouched, so the worker's mapping and its hermetic tests need no change. Only the RPC *arguments* change. |
| **Volatility / security** | Stays `STABLE`, `SECURITY DEFINER`, `SET search_path TO ''`. Reading `m.music_usage_event` is a read — still STABLE. |
| **Language** | `LANGUAGE sql` → **`LANGUAGE plpgsql`** (the FNV-1a loop needs it), matching `resolve_slot_assets`. |

**Do not add a warnings column** to widen the return contract. If seed-shape observability is wanted,
it belongs in the worker's log line, not in the resolver's row shape.

### R3 — Deterministic ranking / indexing — **✅ PK RULED 2026-08-07**

> **Ruled:** deterministic **FNV-1a seed indexing over the stable eligible array**. The existing rank
> key **remains for stable array ordering only and no longer determines the winner.** Adopted as
> written below; the frozen FORWARD implements it, including the 1-based array `+1` shift.

Mirror v1.5 exactly; invent nothing.

1. Build the eligible set **E** using the **existing predicate, verbatim** (§ "unchanged" below).
2. Apply cooldown (R4) → candidate set **C**.
3. Rank **C** into an ordered array by the **existing key**:
   `loudness_lufs NULLS LAST, duration_seconds DESC, track_key`.
   Keep it — it costs nothing and gives a stable, reproducible array order.
4. `idx = FNV1a_32(p_seed) mod |C|`; `p_seed IS NULL → idx = 0`.
5. Return `C[idx]`.

```sql
v_hash := 2166136261;
v_bytes := convert_to(p_seed, 'UTF8');
FOR i IN 0 .. octet_length(v_bytes) - 1 LOOP
  v_hash := v_hash # get_byte(v_bytes, i)::bigint;
  v_hash := (v_hash * 16777619) % 4294967296;
END LOOP;
v_idx := (v_hash % v_count)::int;
```

**Why the winner-takes-all effect disappears:** the index is uniform over the array, so ranking no
longer decides the winner — it only fixes array *order*. Loudness is retained purely for tie-stability.
**Corollary: `loudness_lufs = NULL` becomes harmless**, so **M1 is not a prerequisite for this lane**
(it remains wanted for bed-level consistency — a separate concern, explicitly out of scope).

### R4 — Cooldown, and the guard that cannot empty the pool — **PK APPROVED 2026-08-07**

> **Ruled:** bounded cooldown **`N = min(2, eligible_pool_size - 1)`**; **preserve zero eligible ->
> zero rows**; a **non-empty eligible pool must never be emptied by cooldown.** The recommendation
> below is adopted as written — the bound is the guarantee; the assert stays belt-and-braces.

**Source:** `m.music_usage_event` — already written by `video-worker` v3.7.0 via `record_music_usage`,
already carrying `client_id · platform · format · draft_id · render_id · used_at`. **The write side
exists; nothing reads it yet.** No new capture work.

**Scope:** ~~most-recently-used distinct `track_id`s for the same `(client_id, format)`.~~

> ### ✅ RESOLVED — PK ruled the cooldown scope, 2026-08-07
>
> **Format-scoped only for v1:** exclude the most recent `min(2, eligible_pool_size - 1)` distinct
> tracks **for the current format**. Explicitly barred: `p_client_id` · deriving client identity from
> `p_seed` · any time window · reopening the 5-argument signature.
>
> **This is option 1 below, which the frozen FORWARD already implements — the artifact needs NO
> re-cut and its hash stands** (`499ef1b3…f80e7`). No time window is used (exclusion is by
> `max(used_at)` rank with `LIMIT`, not by elapsed time), no client identity is read, and the
> signature is the ruled 5-arg shape.
>
> **One implementation detail, named rather than buried:** the recent-set query is restricted to
> tracks **currently in E** (`u.track_id = ANY(v_eligible)`). A literal reading of "the most recent
> N distinct tracks for the format" would not restrict that way. The restriction is deliberate — it
> stops the exclusion budget being spent on tracks that are not selectable anyway, which is what
> makes `|C| ≥ |E| − N ≥ 1` hold **by construction** rather than by luck, and it makes cooldown
> actually bite instead of silently doing nothing whenever the last-used tracks have since been
> de-scoped. It is within the ruling (no client identity, no time window, no signature change), but
> it is a semantic choice and PK can override it with a one-line change.
>
> The original gap analysis is retained below for provenance.

> **⚠ R4 IMPLEMENTATION GAP (as originally raised — now resolved above).**
> `select_music` **has no `client_id` parameter** and never did — its arguments are
> `(p_scope_kind, p_scope_value, p_min_duration_seconds, p_mood[, p_seed])`. The `(client_id, format)`
> cooldown scope written above **cannot be implemented as stated** without changing the signature
> beyond the 5-arg shape PK ruled in R5. My R4 text asserted a scope the function cannot see; that
> was an error, and it surfaces now rather than at implementation.
>
> **Three options:**
> 1. **Format-only cooldown (implemented in the frozen artifact; recommended for v1).** Exclude the
>    N most-recent tracks for `format = p_scope_value`, across all clients. Needs **no** signature
>    change. Cost: cross-client coupling — one brand's render influences another's candidate set.
>    Bounded and mild at N ≤ 2 over a 4-track pool, and arguably desirable (it spreads usage across
>    the fleet rather than letting each brand converge on the same bed).
> 2. **Per-client cooldown via a 6th `p_client_id` argument.** Exact semantics, but **reopens R5** —
>    a different signature than the one ruled.
> 3. **Derive the client from the seed** (`p_seed` is `post_draft_id`, so join `m.post_draft`).
>    Exact semantics with no signature change, but couples the resolver to the draft schema and
>    degrades to no-cooldown whenever the seed is absent or not a draft id. Widens blast radius in a
>    lane whose whole virtue is containment.
>
> **Recommendation: option 1 for v1**, with per-client cooldown named as a follow-on if the
> cross-client coupling ever shows up as a real problem. **The frozen FORWARD implements option 1.**
> If PK prefers 2 or 3, the artifact must be re-cut and re-hashed before review.

**Smoke renders:** the worker logs smoke with `client_id = NULL`; those rows are **excluded** so a
smoke render cannot consume a rotation slot. Mirrors v1.5's recorded decision — **stated as a
decision, not a side effect.**

**Scope guard:** cooldown applies **only** when `p_scope_kind = 'format'` (the sole scope any live
caller queries, and the only one `m.music_usage_event.format` can be matched against). Any other
scope takes `N = 0` — conservative and deterministic.

**The guard — structural, not a fallback (recommended):**

> Exclude the most recent **N = min(2, |E| − 1)** distinct tracks.

Because N is bounded by `|E| − 1`, **`|C| ≥ 1` is guaranteed by construction** — cooldown can never
empty the pool, so there is no emptiness to recover from. At `|E| = 1`, N = 0 and behaviour is
exactly today's. At `|E| = 4`, the two most recent are excluded and 2 remain.

**Belt-and-braces:** still assert `|C| ≥ 1` before indexing and, if it somehow fails, fall back to
the full **E** ranked least-recently-used-first. The assert should be unreachable; if it ever fires,
that is a defect signal, not normal operation.

**Critical distinction to preserve:** cooldown must never *create* emptiness, but genuine
ineligibility must still return **zero rows**. `E = ∅ → 0 rows` is the existing fail-closed contract
— the caller renders a silent VO-only bed and does **not** error (`index.ts:902-923`: only an RPC
*error* throws). Do not "fix" that.

> ~~**PK decision required:** structural `N = min(2, |E| − 1)` (recommended) · a fixed window with an
> LRU fallback · no cooldown at all in v1 (seed-only).~~
> **RESOLVED — PK approved the structural bound `N = min(2, eligible_pool_size − 1)`, 2026-08-07,
> with `zero eligible → zero rows` preserved and a non-empty pool never emptied by cooldown.
> No decision outstanding in R4.**

### R5 — Compatibility / PostgREST implications — **atomic swap** — **PK APPROVED 2026-08-07**

> **Ruled:** single-transaction atomic replacement of the 4-arg with the 5-arg seeded function.
> **Do not run both overloads concurrently.** PK added **two requirements beyond the recommendation**:
>
> 1. the transaction **must explicitly establish the intended ACLs after `CREATE`**, *including
>    removal of unintended default execution grants* — the `REVOKE ... FROM anon, authenticated` is
>    **mandated, not advised**, and the in-transaction `has_function_privilege` post-assert stands;
> 2. **the apply proof must include the actual PostgREST/RPC caller path** — proving the function
>    executes correctly *as the worker actually calls it over PostgREST*, not only via direct SQL.
>    **A direct-SQL-only proof does NOT discharge R5.**

**This overturns the committed design packet's recommended order, and it is the highest-risk finding
in this brief.**

The packet proposed: create the 5-arg alongside the 4-arg, deploy the worker, drop the 4-arg later.
**That order is unsafe.** The deployed worker calls `supabase.rpc('select_music', {p_scope_kind,
p_scope_value})` — two named arguments. With **both** overloads present, *both* are satisfiable
(every other parameter has a default), so the call is **ambiguous**. Expected failure mode:
PostgREST **`PGRST203` "Could not choose the best candidate function"**. Because the worker throws on
any RPC error (fail-loud by design), that surfaces as a **live governed-render failure**, not a
silent degrade — for as long as both overloads coexist.

**Recommended instead — single-transaction `DROP` + `CREATE`:**

1. One migration, one transaction: `DROP FUNCTION public.select_music(text,text,numeric,text)` then
   `CREATE FUNCTION` the 5-arg version. **Exactly one overload exists at every committed instant** —
   the ambiguity window never opens.
2. The deployed worker's 2-arg call continues to bind, with `p_seed` defaulting to `NULL` → index 0
   → **behaviour identical to today**. The migration is therefore independently safe and does not
   require the deploy.
3. **Then** deploy the worker to pass `p_seed: draft.post_draft_id`. Rotation switches on at that
   point. Migration precedes deploy, house order.

This is precisely the shape cc-0038's draft used on this same function (`DROP` + `CREATE` in one
transaction, `:44-70`) — precedent within `select_music` itself.

> ⚠ **`DROP` + `CREATE` re-applies the default ACL.** A freshly **created** public function is born
> `EXECUTE`-able by `anon` + `authenticated` (the default ACL applies on CREATE, not on REPLACE), and
> `REVOKE … FROM PUBLIC` alone does **not** clear it. The explicit
> `REVOKE ALL … FROM anon, authenticated` is **LOAD-BEARING, not belt-and-braces**, and must be
> followed by an in-transaction `has_function_privilege` post-assert that aborts the migration on a
> leak. Both the cc-0032 lesson and cc-0038's own draft (`:11-15,:148-160`) say this explicitly.

**Also required:** a post-assert that exactly **one** `select_music` overload exists after the swap.

### R6 — Proof criteria — **✅ PK RULED 2026-08-07 (two parts, ordered)**

> **PART 1 — the capability proof, in this exact order:**
> 1. **cooldown-neutral hermetic deterministic proof** (no live dependency);
> 2. **`BEGIN` / `ROLLBACK` rehearsal** against live — zero-persist, nothing committed;
> 3. **PK apply gate**;
> 4. **atomic live swap** (the frozen FORWARD);
> 5. **repeat the live proof** post-swap, **and** the **actual PostgREST/RPC caller-path proof**.
>
> **PART 2 — later:** governed-render / usage evidence proving **≥3 distinct tracks are actually
> exercised**, read from `m.music_usage_event` against the established **11/11 single-track** baseline.
>
> **Sequencing consequence:** step 1 is runnable **now** (hermetic, no pool dependency). Steps 2–5
> need the four-track pool from the Music Promotion gate. Part 2 needs real governed renders after
> the worker deploy. The acceptance bands below (100% reachability hard; no track ≥50%; identical on
> re-run) stand as the measurement detail inside step 1 and step 5.

**A naive 40-seed sweep against a cooldown-enabled resolver reports false unreachability** — cooldown
excludes the same recent tracks on every seed, so those tracks score zero and look unreachable. The
proof therefore runs in **three parts**, and part (a) is the reachability/uniformity measurement.

**(a) Cooldown-neutral seed sweep — the G8-shape check.**
≥**40 distinct UUID seeds** through `select_music`, against a pool with **no recent-usage history in
scope** (or with cooldown provably inert, `N = 0`). Acceptance:
- **100% reachability — every eligible track selected at least once. HARD requirement.**
- **Reasonable distribution:** no single track takes ≥50% of draws. Record exact counts.
  Reference: B-roll achieved **10/10/10/10 at 40 seeds / 4-clip pool** — perfect. A materially worse
  spread is an investigation trigger, not an automatic failure (FNV-1a mod *n* is not perfectly
  uniform for all *n*).
- **Determinism:** re-running the same 40 seeds returns the **identical** 40 picks.

**(b) Cooldown behaviour.** With usage history present: the excluded tracks are provably absent from
the candidate set, **and `|C| ≥ 1` holds at every pool size 1…4** (assert directly at `|E| = 1`,
where N must be 0 and behaviour must equal today's).

**(c) Live usage confirmation — the one that actually counts.**
`m.music_usage_event` over a real week shows **≥3 distinct tracks exercised**, per PK's standing
2026-08-04 ruling (4 selectable, ≥3 exercised). **Baseline for the comparison, already established:
11/11 single track, 2026-07-19 → 2026-08-05.** Synthetic seeds alone do not close this lane.

**Minimum pool for a meaningful proof: 4 selectable tracks** — Drifting Piano plus Lane 4's three.

> **⚠ CORRECTION + AN UNOWNED STEP (added after commits `6b412f4` / `6c6b550`).** An earlier draft of
> this section said that set "is delivered by the already-committed Lane-4 packet." **That is wrong,
> and the gap is load-bearing for this lane's proof.**
>
> **Live state, verified 2026-08-07:** Lane 4's verdicts are recorded **3/3 CLEAN** (PK, personally
> observed in YouTube Studio — `_harness/music_lane4_contentid_20260807/VERDICTS.md`), but the flip is
> **not applied**: `uplifting_composed_pluto_007`, `warm_acoustic_simple_001` and
> `neutral_short_4mei_009` are all still `approval_status='intake_candidate'` with
> `content_id_safe=false`. **The live selectable pool is still exactly 1.**
>
> **Content-ID clearance alone does not create eligibility.** Even after Lane 4's flip applies, those
> three remain unselectable until *all* of the following also happen — the "approved ≠ selectable"
> trap, which Lane 4's own packet correctly names (`music-lane4-content-id-clearance-packet-v1.md:124-130`):
> - all four fences opened (`approved`, `production_use_allowed`, `is_active`) **and**
>   `approval_status = 'approved_scoped'`; **and**
> - an `m.music_review_event` row with `event_kind='scoped_approval'`, `scope_kind='format'`,
>   `scope_value='video_short_stat'` — **currently zero such rows exist for these three** (verified live).
>
> **No lane currently owns that approval step.** Lane 4 ends at Content-ID clearance and is explicitly
> forbidden from flipping fences; Lane 5 is explicitly forbidden from touching approval. So the real
> sequence is:
>
> **Lane 4 (flip) → ⟨UNOWNED: PK approval + scoped-approval events⟩ → Lane 5 proof R6(a)/(c).**
>
> **This is a PK-owned precondition, named here rather than assumed.** R6(a) can be developed and
> unit-proven against a synthetic/hermetic pool at any time, but the *live* reachability proof and
> R6(c) cannot run until that middle step exists. **This lane must not be recorded as blocked-on-Lane-5
> when it is actually blocked on an unowned approval gate.**
>
> **Also carry Lane 4's residual:** re-check the Notices column on all three immediately before the
> flip applies — Content-ID can claim after an initially clean read.

---

## FREEZE — authored artifacts (NOT APPLIED)

Both are deliberately **outside `supabase/migrations/`**. Putting an unapplied DROP+CREATE — or worse,
a rollback — in the discovery path is precisely the risk PK closed under R1. They move there only at
apply, or are applied via `apply_migration` from here.

| Artifact | sha256 (working copy) | bytes |
|---|---|---|
| `docs/briefs/artifacts/lane5-select-music-seed-rotation-FORWARD.sql` | `499ef1b3ac15ba669e0b0f620c20e09738842a20114b07267ea79c2eba6f80e7` | 14,630 |
| `docs/briefs/artifacts/lane5-select-music-seed-rotation-ROLLBACK.sql` | `a49ab550c7b8067e9afd7b022740b697e8ea4beeeb5500be51a8251fb7555bba` | 9,623 |

> ⚠ **Working-copy hashes.** `core.autocrlf` is on. **Re-pin from the committed ref**
> (`git show <ref>:<path> | sha256sum`) before pinning any external review. A review pinned to a
> working-copy hash is not valid for the committed artifact.

**Migration identity:** `select_music_v3_seed_rotation` (rollback:
`select_music_v3_seed_rotation_rollback`). Permanent names — a revision gets a new name, never the
same name with different SQL.

**Channel:** `apply_migration`. Neither file carries its own `BEGIN`/`COMMIT` — `apply_migration`
supplies the transaction and mints the version, and a self-carried `BEGIN` would nest inside it (the
standing batch-2 lesson). Both rely on **one call in one session**: the baseline temp table would be
lost on a split or autocommitting channel. **Do not substitute a channel.**

**Pre-apply staleness check (pinned live 2026-08-07, verified this lane):**
`md5(pg_get_functiondef(select_music)) = 61a18d15e9f49830bd257265e8c5ffbe` on the 4-arg function. If
that differs at apply time, the rollback is stale and the lane stops.

### What the FORWARD asserts in-transaction

1 overload only (the R5 guarantee — the PGRST203 window never opens) · ACLs locked to `service_role`
with `anon`/`authenticated` proven to have no EXECUTE · **seedless behaviour identical to the
pre-migration baseline** (captured before the DDL) · a non-empty eligible pool still returns exactly
one row (R4's guarantee).

### Two transcription traps recorded in the artifact

- **Off-by-one.** The v1.5 precedent indexes a **jsonb** array (0-based); this uses a **PostgreSQL
  array (1-based)**, so the modulo result is shifted `+1`. Most likely defect when mirroring v1.5.
- **ACL on CREATE.** `DROP`+`CREATE` re-applies `pg_default_acl` — the new function is born
  `anon`/`authenticated`-executable and `REVOKE … FROM PUBLIC` does not clear it. The
  `REVOKE … FROM anon, authenticated` is **mandated** (PK R5), not hygiene.

## R5 caller-path proof — necessarily POST-COMMIT

An HTTP RPC call cannot run inside the migration transaction, so PK's mandated caller-path proof
**cannot** be an in-transaction assert. Sequence:

1. Apply the FORWARD (PK gate) → in-transaction asserts pass, transaction commits.
2. **Immediately** call `rpc('select_music', { p_scope_kind: 'format', p_scope_value:
   'video_short_stat' })` — **two named arguments, exactly as `video-worker` sends them** — over the
   real PostgREST path using the service-role key.
   **PASS =** one row returned, no `PGRST203` ambiguity, no argument-binding error, and the returned
   `track_key` equals the pre-apply baseline.
3. Then a seeded call (`p_seed` supplied) to confirm the 5th argument binds over PostgREST.
4. **If step 2 or 3 fails → apply the ROLLBACK immediately.** This is why the rollback must be
   proven *before* the forward is applied: the caller-path proof runs on committed state, and the
   rollback is its only safety net.

**A direct-SQL-only proof does not discharge R5** (PK, explicit).

## STOP conditions

The lane halts and surfaces to PK — never fixes forward inside a gate — on any of:

- pre-apply `functiondef` md5 ≠ `61a18d15…` (rollback stale);
- either pre-guard failing (unexpected overload count);
- any in-transaction post-assert failing (the transaction aborts by design);
- **caller-path proof failing** → rollback immediately, then stop;
- `db-rls-auditor` non-`pass`, `branch-warden` non-`safe`, or any non-clean external-review class;
- artifact hash ≠ the pinned committed-ref hash (review is stale);
- rollback not yet proven zero-persist;
- **the eligible pool being smaller than 4 at the point the live proof is attempted** — that is an
  upstream dependency, not a Lane 5 failure, and the lane waits rather than widening the pool itself;
- the Phase-1 production-write watch still standing at apply time (**not waived** by this brief).

## Advance limit — where this lane stops today

Per PK: the lane may advance until a live four-track eligible pool is required. **That point is now
reached.** Complete and frozen: R1 (discharged) · the exact atomic replacement · ACL restoration ·
the caller-path proof design · the rollback · STOP conditions. Still open: R2/R3/R6 rulings, the R4
cooldown-scope call above, the zero-persist rollback proof, the T3 chain, and the apply gate.

**Dependency, recorded as PK specified:**

```
Lane 4 Content-ID flip → Music Promotion gate → four eligible tracks → Lane 5 live capability proof
```

Lane 5's remaining work is **downstream of the Music Promotion gate**, not blocked on itself. Its
code-side design work is complete and frozen; what it waits on is an eligible pool it does not own
and must not create.

---

## Scope

**In scope:** ~~resolving R1~~ **(DISCHARGED 2026-08-07)** · authoring ONE migration that swaps the
4-arg `select_music` for the 5-arg `p_seed` version, as a **single-transaction atomic replacement**
with explicit post-`CREATE` ACL establishment · the `video-worker` change to pass
`p_seed = draft.post_draft_id` · a validated rollback **written and proven before apply** · the R6
proof harness **including a real PostgREST/RPC caller-path exercise** · the result doc.

**Out of scope — explicitly excluded by PK for this lane:** batch-2 intake · any further music
sourcing · M1 / loudness normalisation or backfill · any further Content-ID clearance · per-platform
scoping (cc-0038) · any change to eligibility, approval, fence or scope semantics · any fence flip ·
approving or re-scoping any track.

**Out of scope by the approval-ownership ruling (2026-08-07) — belongs to the Music Promotion gate:**
opening the four eligibility fences · setting `approval_status='approved_scoped'` · writing the
`scoped_approval(format, video_short_stat)` events for the three CLEAN tracks · deciding which tracks
are promoted. **Lane 5 consumes the eligible pool; it never creates it.**

**Upstream dependency (not this lane's work, but its critical path):** R6's live proof requires **4
eligible tracks**. The live pool is **1**. That gap closes at the Music Promotion gate, downstream of
Lane 4's flip — per the ruled sequence in the header.

## Allowed actions

- Read-only DB reads to establish pre-state and compose the migration + rollback.
- Author the migration, the rollback, and the worker diff **in an isolated worktree** (`ef-builder`).
- Run hermetic tests + the R6 proof harness **read-only** against live (seed sweeps are `SELECT`s).
- Exercise the **PostgREST/RPC caller path** read-only (a `select_music` RPC call is a `SELECT`), as
  R5 requires — including against a rehearsal of the post-swap function.
- ~~Banner-mark the cc-0038 draft `DO-NOT-RUN — SUPERSEDED` in place, per R1, **if PK approves R1**.~~
  **DISCHARGED 2026-08-07** — retired out of `supabase/migrations/` per PK's ruling. No further
  action permitted on that artifact beyond leaving it where it now sits.
- Run the T3 chain: `db-rls-auditor` · `apply-harness-auditor` (shadow) · external review pinned to
  the committed-ref hash · `branch-warden`.

## Forbidden actions

- **Do NOT apply the migration or deploy the worker.** Both are PK gates. Migration precedes deploy.
- Do NOT create the 5-arg alongside the 4-arg (R5 — opens the PGRST203 ambiguity window). PK ruled:
  **do not run both overloads concurrently.**
- ~~Do NOT delete the cc-0038 draft; banner-mark only.~~ **SUPERSEDED by PK R1 (2026-08-07) and
  DISCHARGED:** the file was moved out of `supabase/migrations/` and retained as
  `NOT_APPLIED / SUPERSEDED` at
  `docs/briefs/artifacts/NOT_APPLIED_SUPERSEDED_cc0038_select_music_per_platform_scope_20260711003222.sql`.
  Its provenance was **not** deleted. **Do NOT move it back into `supabase/migrations/`.**
- **Do NOT discharge R5 with a direct-SQL-only proof.** PK requires the apply proof to exercise the
  **actual PostgREST/RPC caller path**.
- **Do NOT proceed on R2, R3 or R6 as though ruled.** PK ruled R1/R4/R5 only; the other three are
  open and silence is not approval.
- **LANE-OWNERSHIP FENCES (PK approval-ownership ruling, 2026-08-07) — Lane 5 owns resolver
  capability ONLY:**
  - Do NOT grant, request or forge a `scoped_approval(format, video_short_stat)` event — those belong
    to the **Music Promotion gate**.
  - Do NOT flip `content_id_safe` or touch Content-ID evidence — that belongs to **Lane 4**.
  - Do NOT widen the eligible pool by any route in order to make this lane's own rotation proof pass.
    A pool too small to demonstrate rotation is a **Music Promotion gate dependency**, not a Lane 5
    action. The live eligible pool is currently **1**; R6 needs **4**.
- Do NOT change the `RETURNS TABLE` contract, any eligibility predicate, or the zero-rows-is-not-an-error
  contract.
- Do NOT touch `content_id_safe`, any fence, any `scoped_approval` event, or any track's approval.
- Do NOT treat measured batch-2 loudness as M1 being built. **M1 remains UNBUILT.**
- Do NOT touch the blocked batch-2 apply lane.
- Do NOT cut a register version; hand any pointer text to PK as text. Do NOT push without explicit
  PK instruction, separate from commit.
- **Standing hold:** the Phase-1 production-write watch (~2026-08-11 20:20 Sydney) is **not waived**
  by this lane's approval. Per PK 2026-08-07, authorisation on one step does not override an
  independent production-write hold. Surface it at execution time.

## Success criteria

0. **✅ DISCHARGED 2026-08-07 — R1.** No colliding 5-arg definition remains reachable: the cc-0038
   draft is out of `supabase/migrations/`, retained as `NOT_APPLIED / SUPERSEDED`, body verified
   byte-identical (`65c77b6a…2385`). The other 8 untracked files in that directory were not touched.
1. **PRECONDITION (Music Promotion gate, not Lane 5):** **4 eligible tracks proven live** —
   `select_music('format','video_short_stat')` reaches a 4-track eligible set. Lane 5's live proof
   does not start before this. **Currently 1.**
2. One migration, **one transaction**; exactly **one** `select_music` overload exists after it; ACL
   post-assert proves `anon`/`authenticated` have **no** EXECUTE and `service_role` does — with the
   `REVOKE … FROM anon, authenticated` present as a **mandated** statement, not an optional one.
3. With `p_seed` NULL, the function returns **the same track it returns today** — proven in-transaction.
4. **R5 caller-path proof (PK-mandated):** the post-swap function is exercised over the **actual
   PostgREST/RPC path** as `video-worker` calls it — `rpc('select_music', {p_scope_kind,
   p_scope_value})`, two named arguments — returning a correct row with **no `PGRST203` ambiguity and
   no argument-binding error**. **A direct-SQL-only proof does not satisfy this criterion.**
5. R6(a): ≥40 seeds, **100% reachability**, no track ≥50%, identical results on re-run.
6. R6(b): `|C| ≥ 1` at every pool size 1…4; at `|E| = 1`, behaviour identical to today; and
   `E = ∅ → 0 rows` still holds (cooldown never creates emptiness).
7. Rollback written **and proven** (zero-persist, cc-0039 style) **before** apply.
8. T3 chain clean; external review pinned to the committed-ref hash (**not** a working-copy hash —
   `core.autocrlf` is on).
9. Post-deploy: R6(c) — **governed render proof exercising ≥3 distinct tracks**, read from
   `m.music_usage_event` over a real week, against the established **11/11 single-track** baseline.

## Stop condition

Report per the result template and **STOP at the PK apply gate**. Criterion 8 is a **post-deploy
observation over a real week** — the lane reports at deploy and reopens only to record it. Any
non-clean auditor verdict, any external-review non-clean class, or a failed R6(a) reachability check
**halts the lane and surfaces to PK** — it is not fixed forward inside the gate.

---

## Notes

- ~~**Nothing in this brief is approved.**~~ **Superseded 2026-08-07: R1, R4 and R5 are APPROVED, and
  the approval-ownership question is RESOLVED via the new Music Promotion gate.** **R2, R3 and R6
  remain UNRULED** — Gate 1 is only partially discharged and this brief may not be issued for
  implementation until they are ruled. **Silence is not approval.**
- **Still no implementation and no production mutation**, with the single PK-authorized exception of
  the R1 retirement (a file move outside `supabase/migrations/`, no DB/deploy/ledger effect).
- ~~**The three remaining PK decisions:** R2 · R3 · R6.~~ **ALL RULED 2026-08-07, together with the
  cooldown scope. No design question remains open in this lane.** What remains is execution:
  R6 Part 1 step 1 (hermetic, runnable now), then the pool-dependent steps.
- **This lane's real critical path is upstream of it.** Code readiness does not unblock R6: the live
  eligible pool is **1**, and reaching **4** runs through Lane 4's flip and then the **Music
  Promotion gate**. Do not record Lane 5 as blocked on itself.
- **Parallel-session state at authoring:** HEAD moved twice mid-lane (`8f0be67` → `6c6b550`). This
  brief has been reconciled against both the Lane-4 verdict record (`6b412f4`) and the step-1 draft
  reconciliation (`6c6b550`); where they are right and this brief was wrong, the correction is
  recorded in place rather than silently amended. **No attempt has been made to reconcile artifact
  ownership — that is PK's.**
- **`ef-builder` scope note:** its PROVEN record is code-lane work; this lane pairs a code diff with a
  T3 migration. The migration is authored under the same isolated-worktree discipline but carries the
  full DB chain (`db-rls-auditor` required, not optional — the DB is this lane's subject).
