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
    leaves every other cell — and every other brand — untouched. Rollback = flip `is_current`.
  - **Renormalisation is STRUCTURAL, not the artifact's job `(AMENDED-1)`.** The `normalised` CTE
    divides by `per_platform_total`, so the grid renormalises to 100% itself. A2a must NOT
    hand-renormalise; doing so would double-count.
  - **Share = 25%, and that number is derived, not chosen.** Allocation is largest-remainder
    (Hare quota) over PP's 5 enabled Instagram schedule rows. `floor(5X/(100+X)) ≥ 1 ⟺ X ≥ 25`, so
    25 is the smallest share that wins a slot **by floor alone** rather than by remainder
    competition — minimal AND deterministic under a changing surviving set. Computed delta:
    carousel 3→2, image_quote 2→2, `video_short_stat` 0→**1**. The entire behavioural change is
    **one carousel slot per week becomes one video slot.**
  - **Named alternative:** ndis-yarns (7 IG slots) → threshold `X ≥ 16.67`. Also governance-armed.
    PP is preferred on render history; switching brands requires recomputing the share.
- **A2b — material discovery mix.** Authored, **NOT applied**, carrying an explicit machine-readable
  block naming the three Reel proofs it depends on.
- **Neither tier may be weighted toward `video_short_kinetic`** — it stays `instagram:false` with
  its audio-gap cause recorded (no audio stream, 4/4 renders). It is **not** one of the three.
- Both as `NOT_APPLIED_*` + ROLLBACK, byte-hashed, validated by the existing harness pattern.

**B1 DELIVERABLES — authored 2026-08-08, NOTHING APPLIED:**

| Artifact | Path |
|---|---|
| A2a forward | `docs/briefs/artifacts/NOT_APPLIED_cc0092_a2a_instagram_proof_tier_mix_v1.sql` |
| A2a rollback | `docs/briefs/artifacts/NOT_APPLIED_cc0092_a2a_instagram_proof_tier_mix_ROLLBACK_v1.sql` |
| A2b forward | `docs/briefs/artifacts/NOT_APPLIED_cc0092_a2b_instagram_material_discovery_mix_v1.sql` |
| A2b rollback | `docs/briefs/artifacts/NOT_APPLIED_cc0092_a2b_instagram_material_discovery_mix_ROLLBACK_v1.sql` |

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

**A2b's 35.00 share is the one PK-elected parameter.** Evidence constrains it (it restores the
2026-04-22 mix's documented 35.00 short-video weighting, which cc-0079 Slice-2 zeroed on the wrong
`platform_support` data) but does not determine it. A different figure requires recomputing the
allocation table and re-freezing.

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
