# Music Lane 5 — `select_music` rotation capability — DESIGN packet v1 (NOTHING BUILT)

**Status: DESIGN ONLY.** No migration authored, no function changed, no deploy, no worker edit.
**Lane opened by PK 2026-08-07** as the capability lane. **Tier when it eventually builds: T3**
(production function on the live render path). **Authored:** 2026-08-07.

**PK's required outcome, verbatim:** *"`select_music` no longer permanently resolves to Drifting
Piano solely because it is the quietest eligible track, and … multiple governed eligible beds can
actually rotate/select deterministically under an approved rule."*

That wording settles the option space: revoking Drifting Piano (moves the single winner) and
accepting one permanent bed (no rotation) both **fail** the stated outcome. The remaining path is a
resolver upgrade. This packet designs it; it does not build it.

---

## 1. The defect, stated precisely

`select_music` (live, `20260710115043_select_music_require_content_id_safe.sql:119-120`) ends:

```sql
ORDER BY t.loudness_lufs NULLS LAST, t.duration_seconds DESC, t.track_key
LIMIT 1
```

One row, ordered ascending by loudness. Consequences, all verified live 2026-08-07:

- `calm_piano_drifting_006` is **−27.2 LUFS**; every batch-2 survivor is **−16.73 … −10.51**. Drifting
  Piano sorts first and wins **every call, forever**.
- The 8 batch-1 candidates have **`loudness_lufs = NULL`**, which under `NULLS LAST` sorts them
  **last** — so promoting them loses too, by a second independent mechanism.
- There is **no seed, no randomness, no cooldown, no rotation input of any kind**. Pool size is
  irrelevant to the outcome.

**So the pool cannot rotate at any size.** This is why Lane 4 is scoped to a minimum set: clearing
inventory before this lands buys nothing observable.

## 2. Proven in-repo precedent to mirror — do not invent a mechanism

`resolve_slot_assets` v1.5 already solves exactly this for the Background slot
(`supabase/migrations/20260729225034_resolve_slot_assets_v1_5_rotation_governance.sql`). Its
mechanism, read from source:

1. **`p_seed text DEFAULT NULL`** — the caller passes the draft id; a warning
   (`recent_use_seed_not_draft_id`) is emitted if it does not look like a UUID (`:661-664`).
2. **Recent-use exclusion** before selection — recently-used keys are pulled from the render log and
   removed from the candidate pool (`:670-671`), which is the cooldown.
3. **Deterministic ranking** of the surviving pool into an ordered array.
4. **FNV-1a hash of the seed → modulo pool size → index** (`:742-752`):
   ```sql
   v_hash := 2166136261;
   v_bytes := convert_to(p_seed, 'UTF8');
   FOR i IN 0 .. octet_length(v_bytes) - 1 LOOP
     v_hash := v_hash # get_byte(v_bytes, i)::bigint;
     v_hash := (v_hash * 16777619) % 4294967296;
   END LOOP;
   v_idx := (v_hash % v_bg_count)::int;
   ```
5. **`p_seed IS NULL` → index 0** — a deterministic, backward-compatible fallback, never random.

This is **deterministic rotation**: same seed → same pick, always; different seeds → uniform spread.
Exactly PK's "rotate/select deterministically under an approved rule".

## 3. Proposed design for `select_music`

**Keep every existing eligibility gate untouched.** All nine conditions in §2 of the Lane 4 packet
stay: licence commercial/social, `content_id_safe IS TRUE`, all four fences, `approval_status`,
duration, mood, the `scoped_approval` review-event for `(scope_kind, scope_value)`, and the
un-revoked check. **This lane changes only how a winner is chosen from the eligible set, never who
is eligible.** That containment is what keeps it reviewable.

**Change the tail from `ORDER BY … LIMIT 1` to: rank → cooldown-exclude → seed-index.**

- **Ranking key stays `loudness_lufs NULLS LAST, duration_seconds DESC, track_key`.** Keeping it
  costs nothing and preserves a stable, reproducible array order. Because the *index* is uniform
  over the array, ranking no longer decides the winner — so the winner-takes-all effect disappears
  while the loudness signal is retained for tie-stability.
- **Cooldown via `m.music_usage_event`**, which the v0 schema already designed for exactly this
  (per-client/per-platform cooldown window + same-day cross-client dedup —
  `docs/briefs/music-library-v0-schema-packet.md:132-133,190-193`) and which `video-worker` v3.7.0
  already writes to via `record_music_usage`. **The write side exists; nothing reads it yet.**
- **`p_seed IS NULL` → index 0**, matching the precedent, so behaviour stays deterministic and the
  function remains safe to call without a seed.

### 3a. This design does NOT require M1

Worth stating because the delta audit named **M1 (automated loudness measurement)** as the blocker
for M12's rotation proof, on the reasoning that an all-NULL sort key is degenerate
(`creatomate-global-ultimate-final-delta-audit-v1.md:470`). **Under a seed-indexed design that
reasoning no longer holds:** loudness affects only array position, not who wins, so NULL loudness on
the batch-1 candidates is harmless. **M1 stops being a prerequisite for rotation** — it remains
wanted for bed-level consistency, which is a separate quality concern. Do not carry M1 as blocking
this lane.

## 4. The three hazards this lane must not walk into

**(a) Signature change on a live production function. — CORRECTED 2026-08-07, see
`docs/briefs/music-lane5-step1-5arg-draft-reconciliation-v1.md` §4.**

~~Recommended order: create the 5-arg alongside the 4-arg, deploy the worker, drop the 4-arg later.~~
**That recommendation was wrong and is withdrawn.**

Two facts, both verified live:
- The worker sends **TWO** named arguments, not four —
  `rpc('select_music', { p_scope_kind, p_scope_value })` at
  `supabase/functions/video-worker/index.ts:906-909`. The live function carries defaults for the
  other two (`p_min_duration_seconds numeric DEFAULT 12`, `p_mood text DEFAULT NULL`;
  `pronargdefaults = 2`).
- With only two arguments on the wire, a 4-arg and a 5-arg would **both** be satisfiable by those two
  plus defaults — genuine PostgREST ambiguity, on the live render path. The additive-overload order
  walks straight into it.

**Use `DROP FUNCTION` + `CREATE FUNCTION` instead**, so exactly one function ever exists. That is
what the parked cc-0038 draft already does, and it is the correct vehicle.

**Consequence that must be carried (standing `public fns born anon-executable` gotcha):** a freshly
`CREATE`d function is EXECUTE-able by `anon`+`authenticated` by default ACL — `CREATE OR REPLACE`
preserves ACL, `CREATE` does not — and `REVOKE FROM PUBLIC` does **not** clear it. Lane 5 must
`REVOKE ... FROM PUBLIC` **and** `FROM anon, authenticated`, `GRANT` to `service_role`, and carry an
**in-transaction `has_function_privilege` post-assert** that aborts on a leak.

**Decoupling bonus:** because the worker passes no `p_seed`, adding it with `DEFAULT NULL` needs no
worker change to be safe — the seed path stays dormant (index 0 = today's behaviour) until the worker
is updated. Migration and deploy are independent.

**(b) A conflicting unapplied 5-arg draft already exists in the repo. — RECONCILED 2026-08-07:
`docs/briefs/music-lane5-step1-5arg-draft-reconciliation-v1.md`. Verdict: NOT ancestry for Lane 5
(it deliberately relaxes the Content-ID gate, which Lane 5's bounded outcome forbids, and its
composed scope takes Drifting Piano dark on apply). Park it as its own cc-0038 lane; inherit its
DROP+CREATE and ACL technique, not its content. ⚠ It sits UNTRACKED in `supabase/migrations/` and
should be moved out of that scanned directory today.** Original note follows:
`supabase/migrations/20260711003222_select_music_per_platform_scope.sql` is an untracked, unapplied
per-platform 5-arg design from a parallel session (`music-completion-gate1-packet-v1.md:65-70`).
**Two different 5-arg `select_music` definitions would collide.** Reconcile or explicitly retire
that draft before authoring this one — this is the first thing to check, not the last.

**(c) Depletion behaviour is measured and unforgiving.** The B-roll register (v6.165, `a1bfb02`)
records that the analogous resolver has **no minimum-pool threshold** and **no fallback**, and that
pool=0 fails closed. For music the failure mode is gentler — `select_music` returning zero rows makes
`video-worker` render a **silent VO-only bed, not an error** (`cc-0039` brief, confirmed on v3.7.0) —
but a cooldown that excludes too aggressively against a 4-track pool could empty it. **Design the
cooldown so exclusion can never reduce the pool below one**, and decide deliberately whether that
guard is a threshold or a fallback-to-least-recently-used.

## 5. Proof method (for when it builds — not now)

Reuse the B-roll seed-distribution uniformity check, which the delta audit already names as the
reusable instrument for M12 (`creatomate-global-ultimate-final-delta-audit-v1.md:719`):

- **≥40 distinct UUID seeds** through `select_music`, requiring **(i) 100% reachability** — every
  eligible track selected at least once — and **(ii) near-uniform distribution**. Proven live for
  B-roll at 40 seeds / 4-clip pool → **10/10/10/10, zero unreachable**
  (`docs/briefs/results/broll-promotion-batch1-result.md` guard G8).
- **Cross-check against real usage, not synthetic seeds alone** — read `m.music_usage_event` across
  a real week, because PK's standing ruling is framed as an actual outcome (*≥3 exercised, no
  unnecessary consecutive same-brand reuse*), not a sweep.
- **Minimum pool for a meaningful proof: 4 selectable** — Drifting Piano plus Lane 4's 3, which is
  also the standing PK number from 2026-08-04.

## 6. What this packet is NOT

No migration authored. No `select_music` change. No worker change. No deploy. No fence flipped. No
`content_id_safe` set. No register cut. No decision taken on the overload order, the cooldown policy,
or the retirement of the conflicting draft — **those are PK's, and each is named above rather than
assumed.**

**Watch:** the Phase-1 production-write watch (to ~2026-08-11 20:20 Sydney) is **not waived** by the
opening of this lane. Per PK 2026-08-07, an authorisation on one step does not override an
independent hold; surface it at execution time.

## 7. Recommended next gate

A Gate-1 brief for the resolver upgrade, whose **first** task is hazard (b) — reconcile or retire the
conflicting unapplied 5-arg draft — because authoring against a colliding definition would waste the
whole lane. Then the overload-resolution test (a), then the design build behind a T3 chain.
