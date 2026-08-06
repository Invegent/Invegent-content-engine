# Result — M12 `select_music` seed/rotation resolver-lane scoping

**Governing:** `docs/briefs/s3-m12-music-sourcing-plan-content-prep.md` §4.3 (the structural gap) + v6.147 §2.4 ratified answer (scoping authorized; build sequenced after M1)
**Seed:** cross-session control-tower dispatch, "M12 select_music seed/rotation resolver-lane SCOPING" (2026-08-06), final mission for this control-tower slot
**Executed by:** Claude Code (orchestrator, docs-only — live catalog reads only, no table-data queries beyond what `s3-m12-music-sourcing-plan-content-prep.md` already cited)
**Completed:** 2026-08-06 Sydney
**Nothing in this doc is applied.** No code, no migration authored, no DB write, no `select_music` change. Two catalog reads (`pg_get_functiondef` on `select_music` and `resolve_slot_assets`) were run to ground this design in current-HEAD live signatures, per the functiondef-gate discipline (§3) — no table data was queried.

---

## 0. Headline finding — the M1→M12 sequencing rationale needs re-examination, not silent adoption

The governing doc chains M12's rotation proof behind M1 (automated loudness measurement) because
`select_music`'s CURRENT sole differentiator is `ORDER BY t.loudness_lufs NULLS LAST, ...` and every
candidate track has `loudness_lufs=NULL` today, so nothing rotates. **This is correct as a critique of
today's function, but it does not necessarily hold against the design this scoping produces.** The
design below (§1) mirrors `resolve_slot_assets`' proven mechanism, which rotates via a **seed-hash
pick over a recent-use-filtered pool** — a mechanism that needs no loudness signal at all (confirmed:
`resolve_slot_assets`' own Background-asset rotation uses zero loudness-equivalent input anywhere in
its 629-line live body). **A pure uniform seed-hash `select_music` redesign could mechanically satisfy
PK's ratified rotation bar (§2) today, independent of M1 landing.** This is presented as an open
Gate-1 question (§4), not a unilateral override of the ratified M1-before-M12 sequencing — but it is a
real, evidence-grounded finding this scoping pass surfaced, and burying it would repeat the exact
"inherited assumption not re-checked" pattern this session's other lanes have caught and corrected.

## 1. Seed/rotation parameter contract — mirroring `resolve_slot_assets`' proven mechanism

**Live signatures pulled fresh this session** (functiondef-gate discipline — do not trust a design
packet's cited SQL without a live re-pull, since the migration ledger can drift from what's actually
live):

- `select_music(p_scope_kind text, p_scope_value text, p_min_duration_seconds numeric DEFAULT 12, p_mood text DEFAULT NULL)` — confirmed live, 4-arg, **zero rotation input**, `STABLE SECURITY DEFINER`, single deterministic winner via `ORDER BY loudness_lufs NULLS LAST, duration_seconds DESC, track_key LIMIT 1`.
- `resolve_slot_assets(p_client_slug text, p_platform text, p_format text, p_template_id uuid, p_seed text DEFAULT NULL)` — confirmed live, the proven rotation precedent.

**`resolve_slot_assets`' actual recent-use-avoidance mechanism** (cited from its live body, not a design doc — three tiers, all built from `m.post_render_log`):

1. **History source**: `m.post_render_log.render_spec.template.tmr.slot_reasons[]` where `slot='Background'`, `status='succeeded'` only (an asset nobody saw was never "used"), scoped to `client_id` + `ice_format_key`, bounded to a **90-day window** (an explicit bound so the history query never grows unboundedly).
2. **Sticky-on-retry**: rows whose `post_draft_id` matches `p_seed` are excluded from the history — a re-render of the SAME draft reproduces the SAME asset (idempotent evidence; a retry storm cannot walk the pool). Production passes `p_seed = post_draft_id` verbatim.
3. **Three-tier exclusion, hard fallback never fails closed on a repeat**: Tier 1 excludes the two most recent keys (preferred). Tier 2 (only if Tier 1 empties the pool) excludes just the immediately-previous key. Tier 3 (only if Tier 2 also empties the pool) falls back to the full compatible pool with a named warning (`recent_use_fallback_full_pool`) — **a repeat is acceptable; an empty candidate set is not.**
4. **Deterministic seed-hash pick over the surviving pool**: FNV-1a hash of `p_seed` bytes, `v_idx := hash % pool_count`, index into the (already tiered/filtered) array. Same pool + same history + same seed ⇒ same pick, always — this is what makes a 40-seed sweep reproducible and auditable.

**Proposed `select_music` contract, direct analogy:**

```
select_music(
  p_scope_kind text, p_scope_value text,          -- UNCHANGED, existing eligibility gate
  p_min_duration_seconds numeric DEFAULT 12,        -- UNCHANGED
  p_mood text DEFAULT NULL,                         -- UNCHANGED
  p_seed text DEFAULT NULL                          -- NEW, additive, backward-compatible default
)
```

- **Backward compatibility, by construction**: `p_seed DEFAULT NULL` mirrors `resolve_slot_assets`'
  own default exactly. Every existing caller that omits the argument gets byte-identical behavior to
  today (falls through to the current deterministic `ORDER BY` winner) — this is the same
  "byte-unchanged for every unlisted case" discipline this repo's build lanes have used throughout
  this session (M16's Option C/B, M14's WS-3 per-field no-op posture).
- **New recent-use-avoidance tier**, reading `m.music_usage_event` (the append-only usage log named
  in `music-library-v0-schema-packet.md:132-133,190-193` as the mechanism that already "powers the
  per-client/per-platform cooldown window and the same-day cross-client dedup guard") instead of
  `m.post_render_log` — the natural analogue: `resolve_slot_assets` reads its OWN worker's render log
  because Background assets are stamped there; music usage already has its own dedicated event log,
  so that is the correct source, not a repurposed render log. Scope the exclusion by `(client_id,
  platform)` or `(client_id)` alone — **this is the direct mechanism for PK's literal "no unnecessary
  consecutive same-brand reuse" wording**: exclude the same client's most-recently-used track(s),
  tiered exactly like `resolve_slot_assets`' 2-then-1-then-full-pool fallback (never fail closed on a
  repeat — a repeat is acceptable when the pool is thin, an empty result is not).
- **Same FNV-1a seed-hash pick** over the post-recent-use-exclusion, post-eligibility pool, replacing
  the current single-winner `ORDER BY ... LIMIT 1`. `p_seed` convention: production callers pass
  `post_draft_id` (mirrors `resolve_slot_assets`' sticky-on-retry contract exactly, same idempotent-
  on-retry benefit).
- **Open design fork (§0), not resolved here**: does `loudness_lufs` stay in the ORDER BY as a
  PRE-RANK ahead of the seed-hash pick (mirroring `resolve_slot_assets`' own two-stage design — a
  geo/fitness ranking BEFORE the recent-use+seed-hash layer), making it a real ranking input once M1
  populates real values (and a degenerate/coarse one until then, per the governing doc's own
  concern) — or is `select_music`'s design PURE uniform seed-hash with no loudness-based pre-rank at
  all (matching the B-roll precedent's own shape, which has no analogous pre-rank dimension)? This
  is the single most consequential open question for Gate-1 (§4) — it directly determines whether M1
  is a hard mechanical prerequisite or an independently-valuable, parallel quality workstream.

## 2. Rotation-proof method against PK's ratified number

**PK's ratified bar** (restated, not re-litigated): 4 selectable Content-ID-safe tracks; ≥3 exercised
in the proof week; no unnecessary consecutive same-brand reuse (2026-08-04 ruling, cited in the
governing doc §1).

**Method — reusing the B-roll uniformity check exactly, as the governing doc's own §4.1 already
establishes as the reusable instrument:**

1. **Synthetic seed sweep**: ≥40 distinct seeds (`post_draft_id`-shaped UUIDs, matching
   `resolve_slot_assets`' own convention) through the redesigned `select_music`, same acceptance shape
   as the proven B-roll G8 guard — **reachability** (every eligible track hit at least once across
   the sweep) and **uniformity** (near-equal hit-count distribution, not skewed to one track) — the
   exact numbers the precedent produced: "40-seed sweep, 4-clip pool → 10/10/10/10 (exactly 25%
   each), zero unreachable clips" (`docs/briefs/results/broll-promotion-batch1-result.md:57-68`).
   Music's pool shape is narrower (4 tracks minimum, per PK's own ratified number, vs B-roll's
   already-proven 4-clip case) — this is the SAME pool size the precedent already validated, not a
   novel shape requiring new proof methodology.
2. **Real-usage cross-check**, because PK's ruling is framed against an ACTUAL proof-week outcome
   ("≥3 exercised," not merely "provably reachable in a synthetic sweep"): read `m.music_usage_event`
   across a real Week-1 mix once the resolver is live, exactly as the governing doc §4.3 step 4 names
   — a synthetic sweep proves the MECHANISM is capable of uniform rotation; the real-usage read proves
   it actually DID rotate under real traffic (which may be thinner/lumpier than 40 synthetic draws).
   Both checks are required — one alone is insufficient (a mechanism can pass a synthetic sweep and
   still see a Week-1 mix concentrate on one track if real slot volume/format mix skews the traffic).
3. **"No unnecessary consecutive same-brand reuse"** is checked directly against `m.music_usage_event`
   per client: for each client, no two temporally-adjacent usage events (by `occurred_at`) may name the
   same `track_id` UNLESS the pool for that client's eligible scope was thin enough that
   `resolve_slot_assets`' own Tier-3 full-pool-fallback logic would apply (a repeat under genuine pool
   exhaustion is acceptable and named, not a violation — same doctrine as the asset-rotation
   precedent).

**What M1's loudness data specifically adds, precisely stated (not "same as the sequencing doc
assumed"):** IF the design fork in §1 keeps `loudness_lufs` as a pre-rank dimension, M1 supplies the
non-degenerate sort key that makes that pre-rank meaningful (today's all-NULL state makes any pre-rank
before the seed-hash layer a no-op, coarsening to `duration_seconds`/`track_key` only). IF the design
is pure uniform seed-hash (no pre-rank), **M1 is NOT a mechanical prerequisite for the rotation proof
to run or pass** — it remains valuable for a SEPARATE reason (audio-level consistency/normalization of
the actual mixed output, an audio-quality concern, not a selection-mechanism concern), but that value
is independent of whether rotation itself works. This scoping pass cannot resolve which design fork PK
wants without a fresh Gate-1 decision — presented as open, not assumed either way.

## 3. Lane plan

**Tier: T2**, per CLAUDE.md Convention 3 (DML/DDL ≥ T2), same reasoning class as this session's M16
lane (`m.check_pool_health`/`m.fill_pending_slots` `CREATE OR REPLACE` changes, also tiered T2): an
additive, backward-compatible `CREATE OR REPLACE FUNCTION` change to a live `SECURITY DEFINER`
function, reversible by construction (old signature restorable via a symmetric `CREATE OR REPLACE`),
touching no schema/grant/secret/deploy surface directly. **Escalation consideration, named not
resolved**: `select_music` is called from multiple render-path consumers (image-worker, video-worker,
ai-worker are all cited as touching music selection in the governing doc's own sources) — a wider
caller fan-out than M16's two-function change had. If PK judges the caller breadth itself warrants T3
treatment (full external-review + independent lead re-verification, per Convention 3's "escalation up
is free"), that is a legitimate, defensible call — this scoping recommends T2 as the DEFAULT given the
change is additive/backward-compatible by construction, but does not foreclose PK electing T3.

**Functiondef-gate discipline (named per the seed's instruction, and already exercised this session):**
before any real apply packet is authored for this lane, the executing session MUST pull a FRESH
`pg_get_functiondef` on `select_music` (not trust this scoping doc's citation, which will itself age)
— exactly the discipline this session applied to `m.check_pool_health`/`m.fill_pending_slots` in the
M16 lane, and to `resolve_slot_assets` in producing THIS doc. The live signature confirmed today
(§1) is the CURRENT ground truth as of 2026-08-06 only.

**Single-lane vs split — recommend SPLIT into two sequential lanes, not one:**
1. **Lane 1 — resolver upgrade** (this design's `CREATE OR REPLACE`, NOT_APPLIED artifact + hermetic
   tests + the synthetic 40-seed sweep proof, per §2 step 1). This can proceed as soon as Gate-1
   resolves the §1 design-fork question, independent of M1 (per §0/§2's finding) OR gated behind M1
   if PK prefers the loudness-pre-rank design.
2. **Lane 2 — real-usage rotation proof** (§2 steps 2-3, reading `m.music_usage_event` across an
   actual Week-1 mix). This CANNOT run until Lane 1 is applied and live traffic has accumulated —
   it is inherently sequenced after Lane 1, not parallel to it.
   Splitting avoids conflating "the mechanism works" (provable synthetically, fast) with "it actually
   rotated in production" (needs real elapsed time and real traffic) — the same two-part proof
   structure the B-roll precedent itself used (synthetic sweep at promotion time, then an
   unproven-but-monitored real-rotation follow-up, per this repo's own
   `broll-rotation-naturally-unproven-monitor-armed` carry).

**Gate-1 prerequisites for Lane 1** (named, not authored — this scoping produces no packet):
- PK resolves the §1 design-fork (loudness-pre-rank vs pure-uniform) — the single decision that
  determines whether M1 gates this lane's start.
- A fresh `db-rls-auditor` pass confirming `m.music_usage_event`'s actual current schema/columns
  match what this design assumes (not independently re-verified by this docs-only pass, per its own
  "no DB reads beyond R0/catalog" boundary — table-data confirmation is a Gate-1 prerequisite, not
  done here).
- A fresh functiondef pull on `select_music` immediately before the packet is frozen (functiondef-gate
  discipline, restated).
- `apply-harness-auditor` shadow pass on the frozen packet before PK's apply gate, consistent with
  every DML-touching artifact this session has produced (kinetic_voice, Seed A, Seed B all received
  this treatment; recommend the same for whichever session eventually authors this lane's real
  packet).

## 4. Explicitly out of scope (per the seed's own instruction)

- **No sourcing** — the governing doc's §3/§3a sourcing-manifest question is untouched by this
  scoping pass.
- **No promotion** — no Content-ID test, no fence flip, no track promoted.
- **No live change** — no code written, no migration authored, no `select_music` modification applied
  or even drafted as a NOT_APPLIED artifact (this is a scoping/design memo, one level short of the
  apply-packet-authoring this session's other M11b lanes produced — the seed asked for scoping only).
- **No resolution of the M1-before-M12 sequencing question** — §0/§2 name it precisely and surface a
  real finding, but do not overrule PK's existing ratified sequencing; that remains PK's call at a
  fresh Gate-1.
- **No DB table-data reads** — only two catalog-level `pg_get_functiondef` pulls were run (the
  boundary the seed set: "no DB reads beyond R0/catalog needs").

## 5. Honest context/quality self-check (requested explicitly by the seed)

This is the sixth mission run in this control-tower session (L2/M7, M16, M14 Lane-B, kinetic_voice,
Seed A+B, now M12 scoping). Self-assessment, stated plainly rather than reflexively reassuring:

- **No degradation noticed in citation discipline or live-check rigor** — this doc still pulled fresh
  catalog reads rather than trusting the governing doc's dated SQL citation, and still surfaced a
  real, non-obvious correction (§0) rather than accepting the inherited M1-before-M12 framing at face
  value. The pattern held across all six missions (M7's test-fixture correction, M16's advisor-palette
  correction, kinetic_voice's stale-draft correction, Seed A's CAS-guard fix, and now this).
- **One honest risk to name**: this doc is DENSER and more cross-referential than the earlier ones —
  it leans on a long chain of prior-session citations (`resolve_slot_assets`' three-tier mechanism,
  the B-roll G8 numbers, `m.music_usage_event`'s cited-but-not-directly-queried schema) more than it
  independently re-derives from scratch. Every citation is sourced and, where feasible within this
  lane's own boundary, freshly re-pulled (the two functiondef reads) — but `m.music_usage_event`'s
  actual columns were NOT independently confirmed this pass (named as a Gate-1 prerequisite, §3), which
  is the correct disclosure under the "no DB reads beyond R0/catalog" boundary, but is also the kind
  of gap that a longer session makes easier to let slide without naming. Naming it here rather than
  letting it pass silently.
- **No indication of attention narrowing or a dropped constraint** — the docs-only/no-code/no-migration
  boundary was held throughout (verified: zero `Write`/`Edit` calls against any `.sql`/`.ts` file this
  mission, only this result doc and the earlier two `execute_sql`/`db-read.py` catalog calls).
- Recommend: if the control tower runs a seventh mission in this same session, a fresh
  `apply-harness-auditor`-style "has the pattern held" spot-check on the NEXT lane's first few actions
  would be a reasonable, cheap confirmation — not because anything here shows degradation, but because
  self-report at six-missions-deep is exactly the point past which it becomes least reliable.

---

## 6. Verification

**Verdict:** `Pass`

**Notes:** Every scope item from the seed is addressed: the seed/rotation contract (§1, with the
actual `resolve_slot_assets` mechanism cited from a live pull, not the design doc's paraphrase); the
rotation-proof method against PK's exact ratified number (§2), with the M1-loudness question answered
precisely rather than restated as given; the lane plan with tier/split/prerequisites (§3); explicit
out-of-scope statement (§4); and the requested honest context/quality self-check (§5). The headline
finding (§0) is the most consequential output of this pass — it is presented as an open question for a
fresh PK decision, not as this scoping lane overriding an already-ratified sequencing call.
