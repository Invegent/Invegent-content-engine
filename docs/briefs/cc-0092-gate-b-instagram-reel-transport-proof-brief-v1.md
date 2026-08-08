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

- **A2a — proof-tier mix.** The MINIMUM Instagram video share sufficient to emit **one draft per
  newly-supported format**: `video_short_stat`, `video_short_stat_voice`,
  `video_short_kinetic_voice`. Its only purpose is to generate this lane's transport proof. Must
  renormalise to 100% and carry a per-row evidence note.
- **A2b — material discovery mix.** Authored, **NOT applied**, carrying an explicit machine-readable
  block naming the three Reel proofs it depends on.
- **Neither tier may be weighted toward `video_short_kinetic`** — it stays `instagram:false` with
  its audio-gap cause recorded (no audio stream, 4/4 renders). It is **not** one of the three.
- Both as `NOT_APPLIED_*` + ROLLBACK, byte-hashed, validated by the existing harness pattern.

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

Publish **one governed Reel per newly-supported format** — three total. For each, record:
`m.post_publish` row with `publish_method='reel'`, a real `platform_post_id`, `status='published'`,
the render's `storage_url`, and **independent confirmation the media is visible on the account**.

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

- A2a + A2b authored as byte-hashed `NOT_APPLIED_*` with ROLLBACKs; A2a renormalises to 100%;
  A2b carries its machine-readable proof-dependency block; neither weighted to `video_short_kinetic`.
- N10, S5 and F4 stated in the apply record **before** the first apply; R7(a) proven after it.
- A1 and A2a applied under PK's hand, with the **minted** migration versions recorded and post-apply
  state verified against each artifact's stated expectations.
- **Three Reels published — one per newly-supported format — each with a real `platform_post_id`,
  `publish_method='reel'`, and independent confirmation the media is visible on the account.**
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

**The honest risk.** Gate A proved spec compliance, not acceptance. Instagram may still reject one
of these formats for a reason no offline probe can see. That is precisely what B3 exists to find out,
and a block verdict is a legitimate, valuable outcome — not a failure of the lane.

**Timing.** Three Reels depend on the nightly cadence, so B3 is not same-day. Do not compress it by
forcing drafts.
