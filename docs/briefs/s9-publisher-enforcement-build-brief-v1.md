# Brief — S9 Publisher Enforcement build (Objective 2 — publisher chokepoint)

**Created:** 2026-07-29 Sydney · **Author:** orchestrator
**Executor:** `ef-builder` (isolated worktree) → `branch-warden` → `db-rls-auditor` → external review → PK gate 2 → deploy → `deploy-verifier`
**Status:** DRAFT — **awaiting PK Gate-1 approval. Nothing built.**
**Lane class:** SAFETY_GATE · **Tier: T3** (production dequeue path + the irreversible public-upload claim)
**Worktree:** `C:/Users/parve/ice-worktrees/s9-publisher-enforcement`, branch `lane/s9-publisher-enforcement`, off `origin/main @ c8e4fad`
**Result file:** `docs/briefs/results/s9-publisher-enforcement-build-result-v1.md` (on completion)

---

## Task

Build the publisher-side half of S9 Capability Enforcement — architecture packet §3 "Objective 2".
**Requirement (PK):** a blocked/non-Ready draft must never enter any publisher queue or be published,
**even when already approved**, and **even when a publisher is schedule-blind**.

The resolver half (Objective 1, Layers 1+2) is **LIVE** as of v6.58, so the signal this lane consumes
now exists in production: `m.post_draft.final_format_authority = 'blocked_by_capability'` with
`recommended_format = NULL` and the classifier's verbatim status in `final_format_reason`.

## Source context (live-verified this session unless marked)

- `docs/briefs/s9-capability-enforcement-architecture-gate1-v1.md` §3 — the governing design; §1.4 the
  publisher dequeue map. **PK ruling 2: WordPress excluded from v1.**
- `docs/briefs/results/s9-resolver-enforcement-build-gate1-result-v1.md` — Objective 1 result (v6.58).
  **PK rulings carried in:** capability-skipped slots are **terminal**; the exemption set is exactly
  `{text}` and must not expand without a fresh PK policy gate.
- **`m.publisher_lock_queue_v1`** — live body is **94 chars**: `SELECT * FROM m.publisher_lock_queue_v2(...)`.
  Confirmed a **pure delegating wrapper**, so one edit in v2 is inherited by every v1 caller.
  `src_md5 54a6af1f965d40be2c7769d7e57e8ed2`.
- **`m.publisher_lock_queue_v2`** — live body `src_md5 d3fa9f82937ad7f9cbad79ad21ce0b46`, 2684 chars,
  SECURITY DEFINER, owner `postgres`, `search_path='pg_catalog, public, m, c'`, acl `(default)`.
  **⚠ NEW FINDING — it never joins `m.post_draft`.** Its `eligible` CTE reads only
  `m.post_publish_queue q` ⋈ `c.client_publish_profile cpp` ⋈ a lateral `m.post_publish` stats
  subquery. So the architecture's "add a predicate excluding the blocked-state marker" is **not a
  predicate tweak — it requires introducing a `m.post_draft` lookup that does not exist today.**
- **`m.post_publish_queue.post_draft_id`** exists and is **nullable** — so the lookup is possible.
  Live population: **835 rows total, 0 with NULL `post_draft_id`; 31 `queued`, 0 with NULL.**
  `publish_origin` values in use: `feed`, `studio`.
- **`m.auto_approver_fetch_drafts(p_limit)`** — live `src_md5 1bf1dbf52ce56fd51b2f81c059dcfe29`,
  SECURITY DEFINER, `search_path='m, c, public'`. Its only draft-eligibility filter is
  `WHERE pd.approval_status = 'needs_review'` — **confirmed zero capability awareness.**
- **`youtube-publisher` v1.15.0** (deployed version 60) — bypasses the lock queue entirely:
  direct `.from('post_draft')` SELECT at `index.ts:299-307` gating on `video_status='generated'`,
  `approval_status IN ('approved','published')`, `youtube_video_id IS NULL`, and a `scheduled_for`
  release check; then an independent atomic pre-claim `UPDATE … draft_format.yt_publish_claim_at`
  described in-file as "the last guard before the irreversible public upload".
- **Deployed publisher set re-verified live** (`list_edge_functions`): `publisher` (Facebook),
  `instagram-publisher`, `linkedin-zapier-publisher`, `youtube-publisher`, `wordpress-publisher`,
  plus `auto-approver`. **`linkedin-publisher` is confirmed NOT deployed** — the architecture packet's
  "dead code" claim still holds, even though the file calls `publisher_lock_queue_v2` at `index.ts:64`.
- **`trg_gate_queue_on_asset_status`** — a pre-existing **BEFORE INSERT** trigger on
  `m.post_publish_queue` running `m.gate_queue_on_asset_status()`. It reads `recommended_format` from
  `m.post_draft` and **delays** (`scheduled_for := GREATEST(scheduled_for, NOW()+4h)`) when an
  image/video asset is not ready. **It is precedent for enqueue-time draft inspection**, and it is
  **blind to a capability block**: a blocked draft has `recommended_format = NULL`, which matches
  neither its image list nor its video list, so it is neither delayed nor stopped.

## Scope

**In scope**

1. **FB / Instagram / LinkedIn — one shared DB edit.** Add a capability exclusion to
   `m.publisher_lock_queue_v2`'s `eligible` CTE, keyed on `q.post_draft_id → m.post_draft`. Inherited by
   `publisher` and `instagram-publisher` (via the v1 wrapper) and `linkedin-zapier-publisher` (v2 direct)
   with **no EF code change** on those three.
2. **YouTube — two edits**, because it bypasses the queue:
   (a) add the exclusion to the `post_draft` SELECT predicate (`index.ts:299-307`);
   (b) add a **per-row re-check immediately before** the `yt_publish_claim_at` claim UPDATE, closing the
   TOCTOU window the file already defends against for other conditions.
3. **`auto-approver` guard — MANDATORY, not optional.** Exclude capability-blocked rows from
   `m.auto_approver_fetch_drafts` (or the EF's `evaluateGates`). Without it, a blocked draft left at
   `needs_review` is silently re-approved on the next tick.
4. **Independent re-check at dequeue.** The publisher-side gate must **not** trust `approval_status` as
   a safety proxy — it re-checks capability every time, regardless of approval state (architecture §1.4).
5. Backfill migration files capturing the live `publisher_lock_queue_v1`/`v2` bodies (no tracked
   migration exists for either — a real provenance gap), plus the forward change and a proven rollback.
6. Hermetic/local tests + a written deploy plan for PK gate 2.

**Out of scope**
- **WordPress** (PK ruling 2) — though note it **is** deployed; NDIS-Yarns remains unreachable on it
  (all three `c.client.profile` gate keys NULL). Future caller/dequeue census item.
- `linkedin-publisher` (undeployed dead code) · Layer 3 render-dispatch · R3a→R3c · dashboard UI ·
  any change to `select_template`, `resolve_slot_assets`, `classify_format_capability`, or the now-live
  Layer 1/2 resolver code.
- **Lifting any part of the NDIS containment pause** — remains PK's separate, per-platform, ordered act.
- Any deploy/apply/push — this lane stops at a reviewed diff + deploy plan for PK gate 2.

## Open questions for PK (Gate 1) — I have NOT chosen these

1. **NULL `post_draft_id` policy.** The column is nullable (today 0 rows, but the schema permits it, and
   `public.manual_post_insert` exists). Should a queue row with **no draft link** be
   **(a) still eligible** (fail-open — manual/operator posts keep publishing, matches today's behaviour),
   or **(b) excluded** (fail-closed — safest, but would silently stop any future unlinked manual post)?
   **My recommendation: (a) fail-open, explicitly documented**, because the capability contract is a
   property *of a draft*, and a row with no draft has no capability claim to violate. This is the one
   place where the lane's default "fail closed" does not obviously apply, so it should be a ruling, not
   my judgement call.
2. **Enqueue-side defence in depth.** `public.draft_approve_and_enqueue` and
   `…_scheduled` both set `approval_status='approved'` **and** INSERT into `m.post_publish_queue`, with
   **no capability check** — a second entry point the architecture §3 did not name. The dequeue predicate
   (item 1) does stop such a row from being *published*, so this is defence-in-depth, not a hole.
   Options: **(a)** dequeue-only (architecture as written); **(b)** also block at enqueue in those two
   functions; **(c)** add the check to the existing `trg_gate_queue_on_asset_status` BEFORE INSERT
   trigger, which already inspects the draft — cheapest, one place, covers *every* INSERT path including
   any future one. **My recommendation: (a) + (c)** — the trigger is existing precedent and closes the
   class rather than two named functions. Flagging because it widens the diff beyond §3.
3. **YouTube release ordering.** Architecture §5 fixes the containment-release order Facebook →
   Instagram → LinkedIn → **YouTube last**. This lane *builds* all four; it does not release any. Confirm
   the build may cover all four together (the shared v2 edit makes splitting FB/IG/LI artificial).

## Allowed actions

`ef-builder` in the isolated worktree: edit `youtube-publisher/index.ts`; author migrations for
`m.publisher_lock_queue_v2`, `m.auto_approver_fetch_drafts` (+ any PK-approved item from Q2), each
pulled **fresh** via `pg_get_functiondef` before editing; write tests; run `deno check`; produce a deploy
plan. Hand off to `db-rls-auditor` and `branch-warden`; run external review pinned to the final hash.

## Forbidden actions

- **No deploy, apply, migrate, merge, or push** — PK gate 2 is a hard stop.
- **Do not touch the NDIS containment pause.**
- **Do not trust `approval_status` as a capability proxy** anywhere in the design.
- **Do not modify the live Layer 1/Layer 2 resolver objects** (`m.fill_pending_slots`,
  `public.is_capability_exempt_format`, `ai-worker`) — they are proven and in production.
- **Do not expand the `{text}` exemption set** — PK ruling, needs its own policy gate.
- **Do not assume any repo migration is the live body** for `publisher_lock_queue_v1`/`v2` — none exists.
- Do not build WordPress enforcement.

## Success criteria

- A blocked draft is **provably not dequeued** by `publisher_lock_queue_v2` for facebook, instagram and
  linkedin — demonstrated against a synthetic blocked row in an **aborted transaction** (no real queue
  row consumed).
- YouTube: blocked drafts excluded at **both** the SELECT and the pre-claim re-check; the TOCTOU window
  is closed (a draft blocked *between* SELECT and claim does not upload).
- `auto-approver` provably cannot approve a capability-blocked draft.
- **Zero regression:** Ready and exempt-`text` drafts still dequeue and publish normally on all four
  platforms; existing lock/claim/retry/dead-letter mechanics (`attempt_count`, `dead_reason`,
  `last_error*`) are untouched.
- `db-rls-auditor` `pass` · `branch-warden` `safe` · external review clean/agree pinned to the final hash.
- A written deploy plan + a **proven** rollback for every object touched.

## Stop condition

Halt on any non-clean verdict and surface to PK. On a clean chain, stop and present the reviewed diff +
deploy plan at **PK gate 2** — do not deploy, apply, or push.

## Evidence gaps (residual, none blocking)

- No live capability-blocked draft exists yet (`blocked_drafts = 0`); the first real one is expected
  ~2026-07-30 07:00 UTC. All proofs must therefore use a **synthetic** blocked row inside an aborted
  transaction — which is also required because blocked slots are terminal (PK ruling 1).
- `crosspost_facebook_to_linkedin` recorded as a documented no-op since D154 — **not re-verified live
  this session**; the executor should confirm before relying on it.
