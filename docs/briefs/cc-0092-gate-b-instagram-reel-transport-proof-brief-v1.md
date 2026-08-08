# Brief cc-0092 — gate-b-instagram-reel-transport-proof

**Created:** 2026-08-08 Sydney
**Author:** chat
**Executor:** Claude Code (authoring + evidence) · **PK (every apply and every publish)**
**Status:** **ISSUED — Gate 1 PASSED (PK, 2026-08-08)**
**Issued:** 2026-08-08 Sydney, on direct PK instruction. Execution authorised **strictly within**
the Scope and Forbidden actions below.
**⛔ THE WATCH GATE IS NOT WAIVED.** PK ruling, verbatim: *"Do not waive the watch gate. No
production mutation before ~2026-08-11 20:20 Sydney and the explicit apply gate."* B1 authoring
proceeds now; B2 onward waits.
**Result file:** `docs/briefs/results/cc-0092-gate-b-instagram-reel-transport-proof.md` (on completion)

> ## ⚠ AMENDMENT 1 — 2026-08-08, PK ruling: **Option 1**
>
> **The brief as issued set an unachievable success criterion.** It required "one Reel from each
> newly-supported format" (three) reachable via A1 + A2a. Post-issue gate-chain analysis proved
> **only one of the three is reachable**. The issued text above is retained unaltered; every
> superseded requirement below is marked `(AMENDED-1)` and resolved here.
>
> **The finding.** `m.build_weekly_demand_grid` gates a format through **four** CTEs, not two:
>
> ```
> candidate_share → enabled_set → capability_gated → policy_backed
>     A2a           is_enabled     platform_support      (all pass)
>                   (untouched)     = A1  AND  select_template ≠ fail_closed
>                                                       (untouched)
> ```
>
> Live state, Instagram, both candidate brands identical:
>
> | Format | `is_enabled` | `platform_support` | `select_template` | reachable? |
> |---|---|---|---|---|
> | `video_short_stat` | ✅ true | ❌ → **A1 fixes** | ✅ `ok` | **YES** |
> | `video_short_stat_voice` | ❌ **false** | ❌ → A1 fixes | ❌ **`format_unmapped`** | no |
> | `video_short_kinetic_voice` | ❌ **false** | ❌ → A1 fixes | ❌ **`format_unmapped`** | no |
>
> `format_unmapped` is literal: `c.creative_template_variant_candidate` holds **zero rows** for
> either `_voice` key (only six format keys are mapped at all).
>
> **Root cause — a governance/render divergence, not a defect in A1.** The `_voice` formats render
> through the **legacy** branch in `video-worker` (`index.ts:1728`); `B1_VIDEO_GOVERNED_FORMAT` is
> the exact literal `'video_short_stat'`, so the `_voice` variants deliberately never reach
> `select_template`. That is why A1's `ffprobe` probes found real, spec-compliant artifacts for
> them. The S7 demand-grid guard (2026-08-01) nonetheless requires **governed selectability** from
> every format — so the scheduler demands a rung the renderer was never routed through.
> `video_short_avatar` is the sharpest proof: 6 Reels genuinely published, `instagram: true`
> already, yet today it has **no `c.client_format_config` row at all** and returns `format_unmapped`.
>
> **PK ruling (2026-08-08): Option 1 — scope B3 to the one reachable format**, and raise the
> divergence as its own lane. That lane is **cc-0093** (`docs/briefs/cc-0093-*`); it is NOT part
> of Gate B and nothing in it is authorised here.
>
> **A1 is UNCHANGED and still applies all three values.** It corrects a factual registry defect and
> the registry must state truth. Option 1 does not narrow A1 — it only means two of the three
> corrected values stay inert until cc-0093 or a template-graduation lane moves them.
>
> **Rejected — and why it is recorded.** Option 2 (map the `_voice` keys onto their already-proven
> parent template) was verified **mechanically feasible**: assignment and visual-proof rungs key off
> `template_id`, not `format_key`, and `resolve_slot_assets` returns `ok` for both `_voice` formats
> against the proven template `dd5fd75e-982d-4c3d-89cd-7ce0936076b2`. It was rejected because it
> asserts that a voice variant **inherits its parent's visual approval** — a governance claim that
> belongs at its own gate, not folded into a transport proof.

> **Lane:** Distribution & Audience Growth — **Gate B (behavioural rollout, minimum viable proof)**.
> **Predecessor:** cc-0091 Gate A, CLOSED. Frozen packet `b4d011b` / rollup `dccb6666…`.
> **CCF-02 class:** PRODUCT_PROOF. **Tier: T3** — production-touching, publishes public content,
> irreversible in part. Nothing in this lane is waived.

---

## Ultimate

> **Prove Instagram video distribution end-to-end. Apply only the minimum governed changes required
> to publish one Reel from each newly-supported format, collect transport evidence, and return a
> permit/block verdict for restoring the material Instagram discovery mix. Do not begin the 30-day
> audience-growth experiment until its measurement prerequisites are proven.** *(PK, 2026-08-08)*

Gate A proved the artifacts are correct. Gate B proves the **path** works. Those are different
claims and only the second one produces a Reel.

## HARD PRECONDITIONS — none of these are the executor's to waive

1. **⛔ PRODUCTION-MUTATION WATCH GATE.** Gated to **~2026-08-11 20:20 Sydney**. At authoring time
   (2026-08-08) it has **NOT** cleared. Every cc-0091 artifact states apply requires this gate
   cleared **and** a PK gate. **No apply may proceed until PK either waits it out or explicitly and
   separately waives it.** Authoring work in §"A2a/A2b" below is safe during the watch.
2. **N10 — the single-call apply channel must be NAMED** before any apply. Every atomicity guarantee
   in the packet (A1's ALREADY-APPLIED and pre-state aborts; A2a's transaction) depends on the
   channel honouring an embedded `BEGIN`/`COMMIT`. A statement-splitting client breaks them
   silently. Supabase `apply_migration` honours it; name it explicitly in the apply record.
3. **S5 — the write-path contract must be stated.** All cc-0091 writers/detectors are
   `SECURITY INVOKER`; `service_role` has no USAGE on `t`, no SELECT on
   `t.platform_format_mix_default` and no INSERT on `m.format_capability_drop`. **postgres /
   pg_cron or a SECURITY DEFINER wrapper is the only viable call site.** A service_role or
   edge-function RPC route fails 42501 and does not exist over REST anyway.
4. **F4 — no swallowing handler at any A3 call site**, if A3 is ever wired. A
   `EXCEPTION WHEN OTHERS` wrapper would catch the stamp guard's RAISE, roll the INSERT back, and
   report success having written nothing.
5. **R7(a) — post-apply, prove the three `ice_ro` views are readable AS `ice_readonly`**, live, via
   `scripts/db-read.py`. This is the check that settled M1 and it is unprovable offline.
6. **`apply_migration` MINTS ITS OWN VERSION.** Do not assume an artifact's filename number
   survives. Record the version actually minted.

## ⚠ AMENDMENT 2 — 2026-08-08, after `db-rls-auditor` BLOCK. PK ruling: per-client overrides, decouple A2a, re-put 35.00 for PP only

**`db-rls-auditor` returned BLOCK on the first freeze set.** The defect (M-1) was mine and it had
already reached a PK ratification, which is the part that matters: A2b v1 rewrote the **platform**
default mix and derived its per-brand impact table from the platform default set, assuming carousel
survives every brand. It does not survive for ndis-yarns, whose live Instagram grid is
`image_quote 100.00 → 7` with **no carousel**. A2b v1 claimed NDIS would go to 2 of 7 video slots;
the true figure was **4 of 7** — a brand with zero Instagram video history going majority-video.
Its own post-state assertion would have aborted at apply, so the fail-closed design worked; it did
**not** protect the ratification decision made against the wrong table.

**Root lesson, now enforced structurally rather than remembered:** a platform-level share cannot
express a per-brand intent, because each brand's surviving set differs by **template graduation
state**. The identical 35.00 meant 40% of PP's Instagram and 57% of NDIS's.

**PK ruling, verbatim:** *"Per-client overrides, decouple A2a, and re-put 35.00 for PP only."*

### What changed

- **A2b is re-cut as v2** — three `c.client_format_mix_override` rows for **property-pulse only**.
  No platform default is touched and no row is written for any other brand, so the M-1 error class
  is **structurally impossible**, not merely corrected. v1 is retained unaltered behind a SUPERSEDED
  banner as the audit record.
- **35.00 re-put and re-confirmed for PP only — and its meaning changed with the instrument.** A
  bare 35.00 override sits *on top of* the unchanged 100-point default base (35/135 = 25.9% → **one**
  slot, no better than A2a's proof tier). So v2 expresses PP's **whole** mix as three overrides
  summing to exactly 100 — carousel 40 / image_quote 25 / `video_short_stat` 35 — which makes
  `per_platform_total` exactly 100 and the normalised shares exactly 40/25/35. **"35.00" now means
  precisely "35% of Property Pulse's Instagram".** Under v1 that meaning was emergent; here it is
  exact by construction. Result: PP carousel 2 / image_quote 1 / **video 2** of 5 (40%).
  ⚠ The sum-to-100 coverage property is load-bearing and is asserted (v2 pre-state 6 pins PP's
  surviving set to exactly those three formats, checking **all** gate legs per format for that brand).
- **A2a is DECOUPLED.** It proceeds on its own gate, independent of A2b. `db-rls-auditor` found no
  defect changing A2a's committed outcome; its 25.00 derivation re-verified exactly. Its bytes did
  change for the named precision items (S-6 assertion coverage, S-8/S-9/O-3 prose over-claims), so
  it needs a re-audit, but its **design and outcome are unchanged**.
- **NDIS Yarns gets nothing from this lane.** It stays `image_quote 100.00 → 7`, no video. v2
  post-state assertion 4 pins that explicitly — the brand v1 got wrong is now the brand whose
  invariance is asserted by name.

### CURRENT freeze set — this supersedes the table above

| Artifact | sha256:16 | State |
|---|---|---|
| A2a forward | `1851151ad4dafb0f` | current *(was `a6f4243f3c3f9f7e`)* |
| A2a rollback | `d89a56e5e126e5e0` | current, **unchanged** |
| A2b v2 forward | `1743f4339abffdc5` | current *(was `ffc606a85f54d18d`; percent-escape fix)* |
| A2b v2 rollback | `44b9ddbfe1548eef` | current |
| A2b v1 forward | `bef8e4e76f14b9dd` | ⛔ SUPERSEDED *(banner added; was `65d7f533031a1ba3` at BLOCK)* |
| A2b v1 rollback | `6ebab56bce1470fd` | ⛔ SUPERSEDED *(banner added; was `a4af2889eb38f3ab` at BLOCK)* |

**The BLOCK-era review is void.** A re-audit against these digests is required before external
review, and external review before any PK apply gate.
**→ That re-audit ran and cleared the BLOCK → CONCERNS. See Amendment 3, which supersedes the
freeze table above.**

## ⚠ AMENDMENT 3 — 2026-08-08. Re-audit CLEARED the BLOCK; PK ordered ONE bounded correction pass and a stop rule

**Re-audit verdict: CONCERNS — BLOCK cleared.** M-1 and M-2 closed; S-3/S-4/S-5 **dissolved** with
the instrument change; S-1/S-6/S-8/S-9/O-3 closed. The auditor confirmed the arithmetic **by
execution** — it rebuilt the live allocator's CTE chain as a read-only query — rather than by
reading my header: three overrides → normalised exactly 40/25/35 → PP carousel 2 / image_quote 1 /
video 2 of 5; a bare 35.00 override → 1 slot; A2a → 48/32/20 → 2/2/1.

Five medium findings remained, **all fail-closed, none overturning the Reel-proof design.**

### ⛔ PK STOP RULE (2026-08-08) — this bounds the lane

> *"Gate B has started to show the same over-hardening tendency that Gate A had… I would allow one
> bounded correction pass, not another design cycle… Then re-audit the bounded corrections. If there
> is no must-fix behavioural/correctness defect, freeze and stop. Don't keep strengthening
> assertions indefinitely."*

**Gate B's job is narrow: prove the newly supported Instagram formats travel the real pipeline and
publish as Reels.** Gate A is finished and closed. The lane has already caught two real
production-impacting defects before apply — that is the value delivered, and it is not a reason to
keep polishing the proof machinery.

### The bounded pass — exactly these items, nothing else

| Item | Fix | Where |
|---|---|---|
| **N-3** *(regression I introduced)* | Restored the "which two defaults" half of pre-state 5. v1 had it, A2a never lost it, the v2 re-cut dropped it while the header still credited it. Auditor measured the cost: PP's video slots **halve, 2 → 1**. | A2b v2 pre-state 5 |
| **N-1** *(auditor's own prior miss, not caused by the re-cut)* | Live `enabled_set` predicate **reproduced verbatim** instead of paraphrased. The paraphrase was platform-blind and could **false-pass**; latent only because every live config row has `platform IS NULL`. | A2b v2 leg 4 **and** A2a pre-state 7 |
| **N-2** | Header no longer credits pre-state 6 with pinning the surviving set. Credit moved to the assertions that actually do it (pre-state 5 + post-state 1 + post-state 2). **No new machinery added** — the claim was wrong, not the protection. | A2b v2 header |
| **N-4** | Post-state 3 renamed honestly as a **denylist** (it never captured a baseline), and the key list replaced with `LIKE 'video%'` — the old list omitted `video_short`, which is active **and already Instagram-supported**. | A2b v2 post-state 3 |
| **S-7 back-port** | Coverage guard added: counts every row for the cell regardless of share or currency. The fix existed in the A2b v2 rollback and had not been carried to its sibling. | A2a rollback |
| **Ruling 3** | **NDIS post-state dependency REMOVED.** Replaced with a write-confinement footprint check. | A2b v2 post-state 4 |
| **N-8** *(documentation)* | Two stale brief claims corrected — they contradicted the artifacts they govern, which is exactly how M-1's ratification harm happened. | this brief |

**Deliberately NOT done, per the stop rule:** N-7's three cross-artifact inconsistencies (A2a
requires `status='ok'` where A2b matches the grid's `<> 'fail_closed'`; text-vs-boolean
`platform_support` comparison; `-1` vs `0` absent-format sentinel). All are **safe-direction** — they
can only false-abort, never false-pass — and normalising them is assertion-strengthening, not
defect-fixing. **Accepted as-is.**

### Ruling 3 — why post-state 4 changed shape rather than being tightened

The old post-state 4 pinned ndis-yarns to `image_quote 7 / total 7`, which **contradicted this
artifact's own design claim** that no other brand's state can affect its outcome — and depended on
facts ordinary governance changes falsify (`ndis/carousel is_enabled`, template assignments,
cadence). PK: *"A Property Pulse-only artifact should not refuse to apply because NDIS legitimately
changed. Its blast-radius proof should establish that it writes only PP rows."*

**Write confinement is now established STATICALLY**, which is stronger than any runtime probe: the
`INSERT`'s only source of `client_id` is `WHERE cl.client_slug = 'property-pulse'`, and the artifact
contains no `UPDATE` and no `DELETE`. It **cannot** write another brand's row. Post-state 4 now
asserts the resulting **footprint** (PP's rows are exactly the 3 intended). Post-state 3 keeps the
real safety net — no video reaches any other brand — which is a property, not a fact about NDIS.

*This was the sharpest second-order defect of the re-cut: the remedy for M-1 ("you asserted a wrong
fact about NDIS") had reintroduced an assertion of a fact about NDIS.*

### Ruling 2 — TWO INDEPENDENT FREEZE SETS

A2a is frozen **separately** so further A2b work cannot destabilise it. It is **NOT advanced and NOT
applied** — nothing can be applied until the watch clears regardless.

**A2a freeze set — INDEPENDENT, frozen 2026-08-08:**

| Artifact | sha256:16 |
|---|---|
| A2a forward | `8708ba7b952d04c8` *(was `1851151ad4dafb0f`; N-1)* |
| A2a rollback | `f1e47c4b4920703f` *(was `d89a56e5e126e5e0`; S-7 back-port)* |

**A2b v2 freeze set — INDEPENDENT:**

| Artifact | sha256:16 |
|---|---|
| A2b v2 forward | `c88c5a87f099b676` *(was `1743f4339abffdc5`; N-1/N-2/N-3/N-4 + ruling 3)* |
| A2b v2 rollback | `44b9ddbfe1548eef` — **unchanged** |

### Ruling 4 — CARRY, out of cc-0092

**The `apply_migration` embedded-`BEGIN`/`COMMIT` question is NOT a cc-0092 problem.** It is closed
by assertion, not proof, and is unprovable without a write. PK: *"Do not turn it into another
cc-0092 rabbit hole. Record it as a reusable infrastructure-proof item. If it needs proving, prove
it once independently and let future gates cite that evidence."*

**CARRY-INFRA-1 — prove once, cite thereafter:** does the Supabase `apply_migration` channel execute
a multi-statement script with an embedded `BEGIN`/`COMMIT` as ONE transaction without splitting it?
Every in-transaction assertion in this programme depends on it. Exposure for *these* artifacts is
small (`BEGIN` first, `COMMIT` last, so assertion-to-write atomicity holds either way), and both
artifacts disclose the gap honestly in-file rather than asserting it settled. Own it as
infrastructure, not per-packet.

### Stop condition for the packet

Re-audit these bounded corrections. **If no must-fix behavioural or correctness defect: freeze and
stop.** Assertion-strength findings below must-fix are recorded and accepted, not fixed.

**Why the elapsed time is not the bottleneck:** the production watch does not clear until
~2026-08-11 20:20 Sydney. Mutation is prohibited until then, so this weekend is spent getting the
packet clean at zero opportunity cost. Then: **A1 apply → A2a apply → nightly pipeline generates
Reel candidates → governed Reel transport proof → B4 permit/block → restore meaningful Instagram
video.**

## Precondition status for the A1 + A2a apply *(closed 2026-08-08 during B1; no mutation)*

Amendment 1 narrows what is actually in the B2 apply, and that discharges three of the five
preconditions **by scope rather than by work** — they attach to A3, which B2 explicitly excludes.
Recorded so nobody re-litigates them at the gate, and so the exclusion is deliberate rather than
forgotten.

| # | Precondition | Status for A1 + A2a |
|---|---|---|
| 1 | Watch gate | **OPEN — the binding one.** Not waived, not waivable by the executor. |
| 2 | N10 apply channel NAMED | **CLOSED: Supabase `apply_migration`.** Both artifacts embed `BEGIN`/`COMMIT` and their pre/post-state assertions are only atomic if the channel does not split statements. `apply_migration` honours it. ⚠ It **mints its own version** — record the version actually minted, not the filename. |
| 3 | S5 write-path contract | **N/A to this apply.** S5 concerns the `SECURITY INVOKER` A3 writers and `service_role`'s lack of USAGE on `t`. A1 and A2a are plain DML executed by the migration role, not RPC-invoked. Re-opens the moment A3 is applied. |
| 4 | F4 no swallowing handler at A3 call sites | **N/A to this apply.** A3 is not applied and not wired. Re-opens with A3. |
| 5 | R7(a) `ice_ro` views readable as `ice_readonly` | **N/A to this apply.** The three views ship with A3. Re-opens with A3. |

**Added by Amendment 1 — ordering preconditions that did not exist when this brief was issued:**

| # | Precondition | Enforcement |
|---|---|---|
| 6 | **A1 applied before A2a** | Executable — A2a pre-state assertion 3 aborts otherwise |
| 7 | **A2a rolled back before A2b** | Executable — A2b pre-state assertion 3 aborts otherwise (A2b is not in this lane's apply regardless) |

## Scope

### B1 — Author A2a and A2b *(safe during the watch; nothing applied)*

Neither exists — Gate A deferred both wholly, deliberately, so Gate A could not drift into
behavioural change.

- **A2a — proof-tier mix. `(AMENDED-1)`** ~~The MINIMUM Instagram video share sufficient to emit
  **one draft per newly-supported format**: `video_short_stat`, `video_short_stat_voice`,
  `video_short_kinetic_voice`.~~ **Superseded per Amendment 1.** A2a is now the minimum Instagram
  share sufficient to emit **one draft for `video_short_stat`** — the only reachable format. Its
  only purpose is to generate this lane's transport proof. Carries a per-row evidence note.
  - **Client-scoped, not platform-wide.** A2a is ONE `c.client_format_mix_override` row for
    **property-pulse**, NOT a rewrite of `t.platform_format_mix_default`. Verified from the live
    function: `candidate` UNIONs overrides onto defaults and `candidate_share` COALESCEs the
    override share per cell, so a single row adds one format for one client on one platform and
    leaves **every other brand** untouched. ~~leaves every other cell — and every other brand —
    untouched~~ **`(AMENDED-2)`** — the "every other cell" half was wrong: the `normalised` CTE
    renormalises PP's own cells (carousel 60→48, 3→2 slots; image_quote 40→32). Cross-brand
    isolation is the real claim. ~~Rollback = flip `is_current`.~~ **`(AMENDED-2)` Rollback
    DELETEs the row** — the artifact is authoritative here and the brief was wrong: true prior
    state is an empty table, and an `is_current` flip would collide with the unique key
    `(client_id, platform, ice_format_key, effective_from)` on same-day re-apply, breaking the
    required forward→rollback→forward lifecycle (db-rls-auditor S-10).
  - **Renormalisation is STRUCTURAL, not the artifact's job `(AMENDED-1)`.** The `normalised` CTE
    divides by `per_platform_total`, so the grid renormalises to 100% itself. A2a must NOT
    hand-renormalise; doing so would double-count.
  - **Share = 25%, and that number is derived, not chosen.** Allocation is largest-remainder
    (Hare quota) over PP's 5 enabled Instagram schedule rows. `floor(5X/(100+X)) ≥ 1 ⟺ X ≥ 25`, so
    25 is the smallest share that wins a slot **by floor alone** rather than by remainder
    competition — minimal, and deterministic **against the tiebreak**. ~~minimal AND deterministic
    under a changing surviving set~~ **`(AMENDED-3)` corrected (N-8/O-3):** 25.00 is *not* stable
    against a changing surviving set — a third surviving format at share 20 would drop video's raw
    to 0.862 and cost it the floor slot. The protection is A2a's pre-state 4, not the number.
    Computed delta:
    carousel 3→2, image_quote 2→2, `video_short_stat` 0→**1**. The entire behavioural change is
    **one carousel slot per week becomes one video slot.**
  - **`(AMENDED-2)` ⛔ THE METHOD STATED HERE WAS WRONG — read this before deriving any share.**
    ~~Named alternative: ndis-yarns (7 IG slots) → threshold `X ≥ 16.67`.~~ That solved
    `floor(7X/(100+X)) ≥ 1`, which assumes a **100-point surviving base** for NDIS. NDIS's actual
    surviving base is `image_quote 40` **alone** — its carousel returns `select_template` status
    `fail_closed` (`no_selectable_template`, no template assignment), so NDIS's live Instagram grid
    is `image_quote 100.00 → 7` with no carousel at all. The correct threshold is
    `floor(7X/(40+X)) ≥ 1 ⟺ X ≥ 6.67` — the stated figure was off by 2.5×.
    **CORRECT METHOD, and the only one to use:** largest-remainder over **that brand's actual
    surviving set** after `enabled_set` + `capability_gated` + `policy_backed` — never over the
    platform default table. Derive it from a per-client `SELECT`, not from
    `t.platform_format_mix_default`. Property Pulse was unaffected because both defaults genuinely
    do survive for PP, which is exactly why this error stayed invisible through authoring, review
    and a PK ratification (db-rls-auditor M-1/M-2).
- **A2b — material discovery mix.** Authored, **NOT applied**, carrying an explicit machine-readable
  block naming ~~the three Reel proofs~~ **`(AMENDED-3)` the ONE Reel proof (N-8)** it depends on —
  stale since Amendment 1; the frozen block reads `proof_count_required: 1`,
  `proof_formats: video_short_stat`.
- **Neither tier may be weighted toward `video_short_kinetic`** — it stays `instagram:false` with
  its audio-gap cause recorded (no audio stream, 4/4 renders). It is **not** one of the three.
- Both as `NOT_APPLIED_*` + ROLLBACK, byte-hashed, validated by the existing harness pattern.

**B1 DELIVERABLES — authored 2026-08-08, NOTHING APPLIED:**

**FREEZE RECORD — sha256 (first 16), working-copy LF, hashed in the shared default worktree.**
Any review is valid ONLY for these hashes; if a file changes, the review is stale and must be re-run
(orchestration contract rule 4). ⚠ A CRLF checkout yields different digests — always re-hash here.

**⚠ SUPERSEDED FREEZE SET — the digests below are the ones `db-rls-auditor` BLOCKed. Kept as the
audit record; see the CURRENT freeze set under Amendment 2.**

| Artifact | sha256:16 | Path |
|---|---|---|
| A2a forward | ~~`a6f4243f3c3f9f7e`~~ | `docs/briefs/artifacts/NOT_APPLIED_cc0092_a2a_instagram_proof_tier_mix_v1.sql` |
| A2a rollback | `d89a56e5e126e5e0` | `docs/briefs/artifacts/NOT_APPLIED_cc0092_a2a_instagram_proof_tier_mix_ROLLBACK_v1.sql` |
| A2b forward | ~~`65d7f533031a1ba3`~~ **SUPERSEDED by v2** | `docs/briefs/artifacts/NOT_APPLIED_cc0092_a2b_instagram_material_discovery_mix_v1.sql` |
| A2b rollback | ~~`a4af2889eb38f3ab`~~ **SUPERSEDED by v2** | `docs/briefs/artifacts/NOT_APPLIED_cc0092_a2b_instagram_material_discovery_mix_ROLLBACK_v1.sql` |

**⚠ KNOWN COVERAGE GAP — disclosed, not accepted silently.** These two packets have **no executable
offline harness**. cc-0091's A3 packets had one (57 + 31 assertions over the real artifact files via
PGlite) and it repeatedly caught defects a prose read missed — including, in this lane, an
`INSERT` arity error in A2b that would have failed at apply with 42601 and was found only by a
second manual pass. A2a and A2b currently rest on review plus their own in-transaction fail-closed
assertions. A full harness would need `m.build_weekly_demand_grid`, `select_template` and
`resolve_slot_assets` stood up in PGlite; that is judged disproportionate for two DML artifacts, but
the gap is real and belongs in the apply record.

**Two cross-artifact ordering dependencies, both made EXECUTABLE rather than prose:**

1. **A1 before A2a.** Applied first, A2a's row is inert at `capability_gated` and the lane would
   wait forever on a draft that cannot be generated — silent nothing, the failure mode cc-0091 was
   opened to end. A2a pre-state assertion 3 refuses.
2. **A2a rolled back before A2b.** `candidate_share` COALESCEs the client override **over** the
   platform default, so a live 25% override silently outranks A2b's 35% while the record claims
   otherwise. A2b pre-state assertion 3 refuses.

**A2b's proof dependency is executable too.** It refuses to apply unless a published Instagram
`video_short_stat` post exists for property-pulse — a prose "depends on B3" is exactly the
declared-but-unenforced protection class this programme exists to remove.

**A2b's 35.00 share — ✅ PK-CONFIRMED 2026-08-08.** Evidence constrained it (it restores the
2026-04-22 mix's documented 35.00 short-video weighting, which cc-0079 Slice-2 zeroed on the wrong
`platform_support` data) but did not determine it; PK elected it explicitly. Now ratified. A
different figure would require re-deriving the allocation table and both post-state assertions and
re-freezing the artifact — they hardcode the resulting slot counts and are fail-closed, so a changed
share aborts rather than silently shipping a different mix.

**cc-0093 issued (Gate 1 PASSED, PK 2026-08-08)** —
[cc-0093 brief](docs/briefs/cc-0093-capability-truth-non-creatomate-engines-brief-v1.md), T3,
authoring-only. It runs concurrently with this lane and **must not apply before B3 publishes** —
admitting the `_voice` formats mid-proof would change what Gate B is measuring.

### B2 — Apply the minimum, under PK's hand

**Minimum = A1 + A2a. A3 is NOT required and is NOT in this apply.** A3 is observability; applying
it *unwired* buys nothing for a Reel proof and widens blast radius for no evidence gain. If PK wants
A3 applied it is a separate, deliberate election with its own gate — not folded in here.

Order, each step PK-run or PK-authorised:

1. Apply **A1** (3 registry values → `true`). Record the minted migration version.
2. Verify A1 post-apply against the artifact's stated expectations.
3. Apply **A2a**.
4. Let the nightly path run. Do **not** force, hand-craft, or shortcut a draft — a hand-made draft
   proves nothing about the path.

### B3 — Transport proof

**`(AMENDED-1)`** ~~Publish **one governed Reel per newly-supported format** — three total.~~
**Superseded per Amendment 1: publish ONE governed Reel — `video_short_stat`, property-pulse,
Instagram.**

**`(AMENDED-1)` EVIDENCE SHAPE CORRECTED — `publish_method` does not exist.** The issued text
required *"`m.post_publish` row with `publish_method='reel'`"*. That column is not in the schema;
`m.post_publish` carries `status`, `platform_post_id`, `published_at`, `response_payload`
(`{"ig_media_id": …}`) and no publish-method field, and the format is not on the publish row at all.
Left uncorrected this criterion would have been unverifiable. Record instead:

- `m.post_publish`: `status='published'`, non-null `platform_post_id`, `response_payload->>'ig_media_id'`
- `m.post_draft.recommended_format = 'video_short_stat'` (format lives here, not on the publish row)
- the render's `storage_url` from `m.post_render_log`
- **independent confirmation the media is visible on the account** — from someone who is not PK. The
  Facebook root cause was precisely that self-visibility proved nothing.

**That it published as a REEL is an inference from code, not a DB fact — say so.** No column
records it. It follows from `instagram-publisher` setting `media_type='REELS'` for every format in
`IG_VIDEO_FORMATS` ([index.ts:154-158](supabase/functions/instagram-publisher/index.ts:154), `:328`).
State it that way in the result doc rather than implying the row proves it.

**This exercises the GOVERNED render branch**, not the legacy one: PP's
`c.client_creative_governance` row for `video_short_stat` is `enabled=true` (armed 2026-07-10), so
`renderGovernedVideoStat` fires. That is the path worth proving.

**The two `_voice` formats end this lane transport-UNPROVEN on Instagram, and the result doc must
say so in those words.** A1's `ffprobe` evidence shows their artifacts are spec-compliant; that is
an artifact claim, not a transport claim, and the two must not be conflated.

**The publish itself is a PK act.** The executor prepares and verifies; PK approves each release.

### B4 — Permit / block verdict on A2b

A written verdict on whether the material Instagram discovery mix may be restored, grounded in B3's
evidence. **Three successful Reels = permit. Any failure = block, with the failure classified.**
A2b is not applied by this lane under any outcome — the verdict is its input, not its execution.

### Out of scope — explicitly

- **The 30-day audience-growth experiment.** PK: *do not begin until its measurement prerequisites
  are proven.* Those are **A5** (non-follower reach, retention, shares, saves, profile visits,
  follows-gained, with Graph API field mapping per metric) plus `m.heartbeat()` wiring so a stale
  `last_observed_at` is diagnosable. **A5 is not authored.** No experiment, no growth target, no
  cadence change.
- **Applying A2b**, or any material video allocation.
- **Applying A3-1/A3-2/A3-3** — see B2.
- **Gate C** — the `Invegent Publisher` Meta app is Unpublished/In-Development, so Facebook posts
  reach only app-role holders across all four pages. Blocked on business verification pending an ATO
  document (PK, 2026-08-08). **Independent of this lane:** Instagram's Content Publishing API is
  unaffected — IG posts are publicly visible and six Reels published historically.
- **cc-0093 — the grid/renderer governance divergence** raised by Amendment 1. Nothing in that
  lane is authorised here: no template mapping, no `is_enabled` flip, no change to
  `capability_gated`. Gate B must not quietly absorb a template-governance decision.
- **LinkedIn and YouTube** — untouched.
- **Unfreezing Lane 5 `select_music`**, or closing `video_short_kinetic`'s audio gap.
- Re-opening cc-0091's carried list (R4–S10, F4, F6) beyond the preconditions named above.

## Allowed actions

- Author `NOT_APPLIED_*` + ROLLBACK artifacts for A2a/A2b; extend the harnesses; run them.
- Read the DB via `db-read.py` (R0) or read-only `execute_sql`.
- **Prepare** exact apply commands and preconditions; verify post-apply state.
- Invoke `db-rls-auditor` on the A2a/A2b artifacts; `branch-warden` before any commit;
  `apply-harness-auditor` (shadow) pre-freeze; `ask_chatgpt_review` on the frozen packet with
  `reviewed_input_hash`.
- Monitor the nightly path and report what it produces.

## Forbidden actions

- **Do NOT apply anything before the watch gate clears or PK explicitly waives it.**
- **Do NOT run any migration yourself.** Apply is PK's hand.
- **Do NOT publish, approve, or release any Reel.** Publish is PK's hand.
- **Do NOT hand-craft, force, or shortcut a draft, render, or publish** to manufacture the proof.
  A forced artifact proves nothing about the path and would make the verdict worthless.
- Do NOT apply A2b, A3-1, A3-2 or A3-3.
- Do NOT begin the 30-day experiment, or author it as though it were starting.
- Do NOT change cadence, volume, `max_per_day`, or any schedule.
- Do NOT touch Gate C, LinkedIn, YouTube, or Lane 5.
- Do NOT mark anything `proven` before B3's evidence exists.
- Do NOT clean or archive worktree `admiring-shtern-6fdb19` (6.1GB harvest evidence).

## Success criteria

- A2a + A2b authored as byte-hashed `NOT_APPLIED_*` with ROLLBACKs; ~~A2a renormalises to 100%;~~
  **`(AMENDED-1)` A2a does NOT hand-renormalise — the grid's `normalised` CTE does it;**
  A2b carries its machine-readable proof-dependency block; neither weighted to `video_short_kinetic`.
- N10, S5 and F4 stated in the apply record **before** the first apply; R7(a) proven after it.
- A1 and A2a applied under PK's hand, with the **minted** migration versions recorded and post-apply
  state verified against each artifact's stated expectations.
- **`(AMENDED-1)`** ~~Three Reels published — one per newly-supported format~~ — **ONE Reel
  published (`video_short_stat`, property-pulse, Instagram)** with a real `platform_post_id`,
  ~~`publish_method='reel'`~~ **`m.post_draft.recommended_format='video_short_stat'` (no
  `publish_method` column exists — see B3)**, and independent confirmation from someone other than
  PK that the media is visible on the account.
- **The result doc states, in those words, that `video_short_stat_voice` and
  `video_short_kinetic_voice` remain transport-UNPROVEN on Instagram**, with the four-gate finding
  and the cc-0093 handoff recorded.
- A written permit/block verdict for A2b, grounded in that evidence, with any failure classified.
- Result doc records what was applied, what was published, what was proven, and — separately and
  explicitly — **what was not**.

## Stop condition

Report per `docs/briefs/_template_result.md`, then stop. Do not apply A2b. Do not begin the
experiment. Gate B ends at the verdict.

---

## Notes

**Why the minimum is genuinely minimum.** A1 alone changes no scheduling outcome — the current
Instagram mix gives the three formats zero share, so they never enter `enabled_set` and
`platform_support` is never consulted for them (verified live at Gate A). A2a is what makes them
schedulable. That is exactly two applies, and nothing smaller produces a Reel.

**`(AMENDED-1)` mechanism correction, for precision.** The reason is sharper than "zero share":
`t.platform_format_mix_default` holds **no Instagram row at all** for any video format (live
`is_current` mix is `carousel 60 / image_quote 40` — the cc-0079 Slice-2 residue), and there are
**zero `is_current` rows in `c.client_format_mix_override`** for any client. So the video formats
produce no `candidate` row whatsoever, rather than a candidate row carrying zero. The conclusion is
unchanged and the blast-radius claim is strengthened: **A1 applied alone is inert on Instagram for
every brand**, because nothing downstream of `candidate` ever sees those formats.

**The honest risk.** Gate A proved spec compliance, not acceptance. Instagram may still reject one
of these formats for a reason no offline probe can see. That is precisely what B3 exists to find out,
and a block verdict is a legitimate, valuable outcome — not a failure of the lane.

**Timing.** Three Reels depend on the nightly cadence, so B3 is not same-day. Do not compress it by
forcing drafts.
