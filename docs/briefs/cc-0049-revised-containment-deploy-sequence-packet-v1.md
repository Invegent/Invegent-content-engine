> ## 🔖 CANONICAL ID: **cc-0049** — RETAINED (no collision found)
> Verified 2026-07-24 against `origin/main` and all `origin/*` refs: no competing claim on
> `cc-0049` exists. Ledger: `docs/briefs/results/governance-recovery-lane-2026-07-24-result-v1.md` §3.

# cc-0049 — Revised Containment / Deploy / First-Render Sequence (packet v1)

> **Status:** DRAFT — awaiting PK gate. Authorises nothing on its own.
> **Supersedes:** the execution seed dated 2026-07-22 (pre-08:15Z world model).
> **Tier:** T3 (production DML · EF deploy · irreversible-adjacent).
> **Lane class:** SAFETY_GATE (incident recovery) with a PRODUCT_PROOF visual gate — PK to confirm.
> **Patch under change:** unchanged. Branch `cc-0049-invegent-quote-card-winner-mapping`, commit `e522e54`, base `5a6c998`.

---

## 1. Why the original sequence was re-cut

Three Step-1 precheck failures. None is a defect in the patch; all three are staleness in the
*containment plan*, which was written against live state that has since moved.

### STOP-1 — reviewed diff hash irreproducible

| | |
|---|---|
| Seed-recorded | `2292d07e5c5bcbb3e49dd30fe2993f532ab33d7e60d0b71b5b269c2321496ccb` |
| Recomputed `git diff 5a6c998 e522e54` | `52801b4d74535a654a3711e124e82a658d6c9fdb6ad889384f47b09d85c742f8` |

Swept 14 diff renderings × 8 encodings — no match. No stored copy of the reviewed diff survives in
any session scratchpad, so the divergence cannot be attributed to a rendering convention.
CLAUDE.md external-review rule 4 makes this a machine STOP.

**Counter-evidence (mitigating, not clearing):** commit identity is exact (`e522e54`, clean tree,
single commit, fast-forward descendant of current `origin/main` = `5a6c998`), the patch body is the
approved design, tests reproduce exactly at **173 passed / 0 failed** (image-worker + ai-worker) with
the cc-0049 file at **6 blocks / 8 labelled cases**, and `VERSION = 'image-worker-v3.33.0'`.

### STOP-2 — the intended render target is no longer eligible

A natural worker run failed `26aaa129` at **08:15:05Z**. It is `image_status='failed'`, not `pending`.
**Zero** Invegent drafts currently match the image-worker scan.

### STOP-3 — containment premise inverted, and the containment set was under-scoped

The seed assumed pipeline-fixer would reset `33a9acf9` from `failed`→`pending`. It will not.
`image_quote` ∈ `CAPPED_FORMATS`, `RENDER_ATTEMPT_CAP = 5`
(`supabase/functions/pipeline-fixer/index.ts:29-31`), and `fixFailedImages` dead-letters over-cap
drafts rather than resetting them.

| draft | platform | image_status | failed renders | vs cap | dead_reason | fixer action |
|---|---|---|---|---|---|---|
| `26aaa129` | facebook | failed | 14 | over | NULL | dead-letter |
| `33a9acf9` | instagram | failed | 14 | over | NULL | dead-letter |
| `fe80a01e` | instagram | failed | 37 | over | NULL | dead-letter |
| `e7867c8c` | facebook | failed | 59 | over | NULL | dead-letter |

**Four** failed drafts, not two. All still inside the fixer's 120-minute age filter, so nothing has
fired yet. Consequence: neither the unwanted drafts nor the wanted one can change state on their own —
so "observe the normal authorized worker path" can never produce a render. A controlled render now
requires an explicit, single-row reset.

---

## 2. Verified-clean preconditions (carried forward)

- Worktree `C:\Users\parve\AppData\Local\Temp\claude\cc0048-build-wt` clean; HEAD `e522e54`.
- `5a6c998` == current `origin/main` == deployed v3.32.0 source. Fast-forward confirmed.
- Local `main` checkout is 21 behind `origin/main` (bootstrap-reported; unrelated to this lane).
- Image-worker scan (`index.ts:910`) is exactly
  `approval_status='approved' AND image_status='pending' AND recommended_format='image_quote' LIMIT 3`
  — **no** `dead_reason`, attempt or defer filter. Confirmed from source.
- `image_status='skipped'` is publish-safe **and** fixer-invisible:
  - `publisher/guard.ts:42` + `linkedin-publisher/guard.ts:72` publish only on
    `generated && image_url`; anything else falls through to
    `block: image_required_but_skipped` (`guard.ts:78`).
  - `publisher/asset_backstop.ts` / `instagram-publisher/asset_backstop.ts:92` define readiness as
    `generated && !!image_url` only.
  - `fixFailedImages` filters `image_status='failed'` — `skipped` rows are invisible to it.
  - The image-worker itself writes `skipped` natively when image generation is disabled
    (`index.ts:915`), and never re-scans it. This is an established, reversible state.
- No cross-client scan contention: Invegent is the only client with pending/failed `image_quote`.
- `6a23e01a` is `recommended_format='text'`, `image_status='pending'` — permanently outside the
  `image_quote` scan. Untouched by this sequence.

### Publish queue — current truth

| queue_id | draft | platform | status | scheduled_for |
|---|---|---|---|---|
| `318f0d58` | `26aaa129` | facebook | **queued** | 2026-07-22 22:06Z |
| `e2a817fb` | `33a9acf9` | instagram | **queued** | 2026-07-23 00:36Z |
| `de2aac39` | `e7867c8c` | facebook | skipped | 2026-07-21 22:06Z |
| `e2bfb6a1` | `fe80a01e` | instagram | failed | 2026-07-22 00:45Z |
| `653bd32e` | `6a23e01a` | linkedin | **queued** | 2026-07-23 02:36Z |

`318f0d58`, `e2a817fb` and `653bd32e` are deferred (see below). The two extra failed drafts already
hold terminal queue states (`skipped` / `failed`) and carry no publish risk.

> **PK ruling 2026-07-22 — `653bd32e` HELD.** This is an Invegent **text** post that would otherwise
> auto-publish **2026-07-23 02:36Z**. It is unaffected by the image incident, but PK has elected to
> hold it alongside the two image rows. Note this defers the **queue row only** — draft `6a23e01a`
> itself is still not mutated, per the standing seed boundary.

---

## 3. Revised sequence

Execute strictly in order. Any STOP voids the remainder and requires a fresh gate.

### Step 0 — retire STOP-1 (prerequisite)

Re-run `ask_chatgpt_review` on the **recomputed** hash `52801b4d…` against the current
`git diff 5a6c998 e522e54`. Record the new `reviewed_input_hash` + review ID.

**STOP if:** verdict is not clean, or the returned hash ≠ `52801b4d…`.

*Rationale: cheaper and safer than waiving rule 4. The patch is unchanged, so a clean re-review is
expected; what it buys is a valid, reproducible pin.*

### Step 1 — containment transaction (single fail-closed txn)

**Change from seed:** contain **all four** failed drafts, not one — including `26aaa129`. Moving the
render target to `skipped` too makes the entire set invisible to pipeline-fixer, so no `dead_reason`
can be written under us while we deploy. `26aaa129` is then released deliberately in Step 4.

```sql
BEGIN;

-- 1a. Render containment: all four failed Invegent image_quote drafts → skipped
UPDATE m.post_draft
SET image_status = 'skipped',
    updated_at   = now()
WHERE post_draft_id IN (
        '26aaa129-9ebb-4fce-a1a7-509be62ca468',
        '33a9acf9-de8d-4f27-8ecb-4215cf7e7aa3',
        'fe80a01e-8c15-422b-8821-f1e1be493469',
        'e7867c8c-a687-4cbe-8e64-5b9fe58d8541')
  AND image_status       = 'failed'
  AND approval_status    = 'approved'
  AND recommended_format = 'image_quote'
  AND dead_reason IS NULL
RETURNING post_draft_id, image_status, dead_reason;
-- ASSERT: exactly 4 rows.

-- 1b. Publish containment: defer the three live queued rows ≥48h
--     (653bd32e = the text post, HELD per PK ruling 2026-07-22 — queue row only,
--      draft 6a23e01a is NOT mutated)
UPDATE m.post_publish_queue
SET scheduled_for = TIMESTAMPTZ '2026-07-25 00:00:00+00',
    updated_at    = now()
WHERE queue_id IN (
        '318f0d58-1d4a-4bdc-b98d-01f138816fc6',
        'e2a817fb-e753-4772-9262-b6dadb3ee7b1',
        '653bd32e-6314-4cdd-917c-29df847af0d0')
  AND status = 'queued'
RETURNING queue_id, post_draft_id, platform, status, scheduled_for;
-- ASSERT: exactly 3 rows; all status still 'queued';
--         drafts are 26aaa129 + 33a9acf9 + 6a23e01a.

COMMIT;
```

**STOP if:** either assert fails · any row outside the named 4 + 3 changes · any `status` or
`approval_status` value moves · any non-Invegent row is touched.

**Post-transaction proof (read-only):** zero rows match the image-worker scan · all four drafts
`skipped` with `dead_reason` NULL · draft `6a23e01a` unchanged (`text` / `pending`) · all three queue
rows `queued` at 2026-07-25 · `skipped` still blocks publish per §2.

> Deferred schedules are **not** auto-restored. Republishing requires a fresh PK decision.

### Step 2 — reconcile and deploy

1. Fast-forward `origin/main` to `e522e54`. No rewrite, squash or amend.
2. Refresh drift: `drift-check?write=true&slug=image-worker` — reclassify stale A-LE → B-FD
   **before** deploying (safe-deploy hard-blocks A-LE).
3. Deploy **from the cc-0049 worktree** (`supabase functions deploy` bundles from CWD — deploying
   from `main` would ship the wrong bytes):

```bash
cd "C:/Users/parve/AppData/Local/Temp/claude/cc0048-build-wt"
bash scripts/safe-deploy.sh image-worker --allow-warn
```

4. Do **not** deploy `ai-worker`, despite its file appearing in the diff.

**Verify (run `deploy-verifier`):** unauthenticated GET → HTTP 200 · version string
`image-worker-v3.33.0` · `verify_jwt` remains **false** · deployed bundle contains the cc-0049
marker (bundles-from-CWD guard) · drift resolved · unknown winners still fail closed with
`tmr_winner_unmapped`.

**STOP if** any check fails → execute Step 5 rollback, leave containment in place.

### Step 3 — release exactly one render target

**New step — replaces the seed's "observe the natural path", which cannot fire.**

```sql
UPDATE m.post_draft
SET image_status = 'pending',
    updated_at   = now()
WHERE post_draft_id = '26aaa129-9ebb-4fce-a1a7-509be62ca468'
  AND image_status = 'skipped'
  AND approval_status = 'approved'
  AND recommended_format = 'image_quote'
RETURNING post_draft_id, image_status;
-- ASSERT: exactly 1 row.
```

**Pre-flight STOP:** re-confirm immediately before running that the scan returns **zero** rows —
i.e. the other three are still `skipped`. If any has drifted back to `pending`, STOP.

### Step 4 — controlled render + runtime proof

Let the normal worker path pick it up (scan limit 3, one eligible row).

**Prove:** exactly one new successful Invegent render · no render attempt against `33a9acf9`,
`fe80a01e`, `e7867c8c` · no image-worker action on `6a23e01a` · winner = `generic_quote_card_1x1_v1` ·
assignment `ecba211b…` · provider template `2140ca19…` · governed TMR evidence row present ·
storage output exists · no duplicate render · no publish side effect.

### Step 5 — mandatory visual gate (PK)

Required PASS: quote text present and sourced from `headline` · attribution exactly
`Invegent — AI & Automation` · source label exactly `invegent.com` · footer exactly `Invegent` ·
no surviving placeholder (`Quote text goes here…`, `Attribution name, role`, `Source label`,
`Footer`) · no clipping · acceptable wrapping and line breaks · no collision or overprint · correct
logo and background · acceptable hierarchy and brand identity.

**On PASS:** keep the three drafts `skipped` · keep both publish rows deferred · publish nothing ·
**STOP for PK**.

**On FAIL:** keep containment · preserve render evidence · rollback if the defect is in the patch ·
**STOP**.

---

## 4. Rollback

After the fast-forward, `main` is `e522e54`, so rollback needs an explicit checkout of the prior
source:

```bash
git worktree add <tmp> 5a6c998
cd <tmp> && bash scripts/safe-deploy.sh image-worker --allow-warn
```

Verify version reverts to `image-worker-v3.32.0`. Containment (Step 1) stays in place through any
rollback — it is independent of the deploy and independently reversible.

**Validate this path before Step 2**, per T3.

---

## 5. Not authorized by this packet

- Recovering `33a9acf9`, `fe80a01e` or `e7867c8c` (a second render is a fresh gate).
- Publishing anything, or restoring the original schedules.
- Mutating draft `6a23e01a` itself (its queue row `653bd32e` is deferred per PK ruling; the draft is
  untouched).
- Restoring `653bd32e`'s original schedule — releasing the held text post is a fresh PK decision.
- Deploying `ai-worker`.
- Fixing F-C retry-cap behaviour, or clearing any `dead_reason`.
- Reopening template design, cc-0047 (paused), or cc-0048 C-1/C-2 closure.
- Any care-for-welfare remediation — the `brand_payload_contract_unresolved` incident remains open
  and **is not addressed by this patch**, which maps Invegent only.

---

## 5A. EXECUTION RECORD — Steps 0 and 1 COMPLETE (2026-07-22)

**Step 0 — external review: CLEAR.**
Round 1 `f9fe7a87-57e3-4e23-9676-211791035299` → `partial` / medium / **escalate**, single pushback:
possible property-pulse regression from the new `tmr_winner_brand_fields_missing` throw.
Evidence gathered (live `select_template` probes, PP 30-day render history, contract grep), then
round 2 `ac09b1a2-1ec2-4665-a070-f2ff5913ca78` → **`agree` / proceed / escalate=false / confidence
high**, zero pushback, zero unverified claims. Both rounds pinned to `52801b4d…`; the diff did not
change between them — only the evidence did (`missing_evidence` triage route).

Refutation of record: PP's `select_template` returns `generic_market_insight_card_1x1_v1`
(assignment `7806fa5e`, **production_proven**); quote-card sits in `alternatives[0]`, unselected.
PP image_quote is healthy (59 succeeded/30d, latest 2026-07-22 02:15Z). And on the only path that
could reach the new throw, behaviour is fail-closed **both** before (`tmr_winner_unmapped`) and
after (`tmr_winner_brand_fields_missing`) — the patch cannot cause a wrong-brand render.

**Step 1 — containment: APPLIED 2026-07-22 09:31:48.83Z**, single fail-closed `DO` block.

Two live-state surprises handled en route:
- A **first attempt at 09:2x aborted itself** — assertion `expected 4, got 1` → full rollback,
  nothing written. Between packet approval and execution, a job at **09:15:04Z** reset three of the
  four drafts `failed`→`pending` (it was **not** pipeline-fixer, which runs at :25/:55; candidates
  are pipeline-doctor :15/:45 or pipeline-sentinel). The image-worker then re-failed `26aaa129`.
- Guard therefore widened from `image_status='failed'` to `IN ('failed','pending')` — **same four
  IDs, same target state, still asserting exactly 4**. Recorded as a deliberate deviation.

Verified post-state: all four drafts `skipped`, `dead_reason` NULL · `6a23e01a` untouched
(`text`/`pending`, `updated_at` still 04:30:06Z) · queue rows `318f0d58`, `e2a817fb`, `653bd32e` all
`queued` at **2026-07-25 00:00Z** · terminal rows `de2aac39`/`e2bfb6a1` unchanged ·
**image-worker scan-eligible count = 0** — the 15-minute failed-render churn is stopped.

---

## 5B. 🛑 NEW BLOCKING DEFECT — trigger `m.release_queue_on_asset_ready` breaks Step 4

Discovered by pre-write trigger inspection; **neither review round saw it** (it was not in evidence).

```
CREATE TRIGGER trg_release_queue_on_asset_ready
AFTER UPDATE OF image_status, video_status ON m.post_draft
FOR EACH ROW EXECUTE FUNCTION m.release_queue_on_asset_ready()
```

It fires when `OLD.image_status = 'pending' AND NEW.image_status <> 'pending'` and, for
`image_quote`, rewrites `scheduled_for` on any `queued` row of that draft sitting >30 min out:
`scheduled_for = GREATEST(COALESCE(draft.scheduled_for, slot.scheduled_publish_at), NOW())`.

| step | transition | fires? |
|---|---|---|
| 1a containment | `failed`/`pending` → `skipped` | fired for the `pending` ones — **handled** by ordering 1a before 1b |
| 3 release | `skipped` → `pending` | no (OLD ≠ pending) |
| **4 successful render** | **`pending` → `generated`** | **YES** |

**Simulated, not written:** for `26aaa129` the trigger would set queue row `318f0d58` to
**2026-07-22 22:06:00+00** — because both `post_draft.scheduled_for` and `slot.scheduled_publish_at`
are 22:06Z today — and `deferred_row_would_be_in_scope = true`.

**Impact:** a successful Step-4 render would silently **undo the publish deferral** and re-arm the
Facebook post to publish the same day, ~13 h later, with no human action. That directly violates the
seed's "no publish side effect" and "do not publish" boundaries.

**Candidate remedies (PK to choose — none applied):**
1. Also defer `m.post_draft.scheduled_for` (and/or `m.slot.scheduled_publish_at`) for `26aaa129` to
   2026-07-25, so the trigger's `GREATEST()` recomputes to the held value. Self-consistent; makes
   draft and queue agree rather than diverge. **Recommended.**
2. Move the queue row off `status='queued'` for the render window so the trigger's filter excludes
   it. Rejected unless PK wants it — the packet forbids status changes.
3. Re-apply the deferral immediately after the render as a mandatory Step 4b. Works (the re-armed
   time is ~13 h out, so no true publish race) but is repair-after-the-fact, not prevention.

**Until PK rules, Steps 2–5 are BLOCKED.** Containment is stable and holds indefinitely.

---

## 5C. Sections 1–3 CLOSED · Section 4 STOP (2026-07-22)

**§1 Reset actor IDENTIFIED — `pipeline-doctor` (not pipeline-fixer).**
Deployed EF, **no local source dir** (entrypoint `source\index.ts`, standalone deploy) — which is why
every repo grep missed it. cron jobid **29**, schedule `15,45 * * * *` (every 30 min).
Code path `checkImageWorker` → "Fix 1":

```js
.update({ image_status: "pending", updated_at: nowIso() })
.eq("image_status", "failed")
.not("approval_status", "eq", "published")
```

Predicate is `image_status='failed' AND approval_status<>'published'` — **no client, format, age or
attempt-cap filter**. Unlike pipeline-fixer it has *no* render-attempt cap, so it resets failed
renders forever. This, not pipeline-fixer, drove the 09:15:04Z reset and the incident's churn.

**Containment gate — PASSED.** `skipped` proven invisible to every automated writer:

| writer | predicate | reaches `skipped`? |
|---|---|---|
| image-worker scan (`index.ts:910`) | `image_status='pending'` | no (and it *writes* `skipped` itself) |
| pipeline-fixer `fixFailedImages` | `image_status='failed'` | no |
| **pipeline-doctor** Fix 1 | `image_status='failed'` | no |
| pipeline-doctor Fix 2 | `='pending'`, writes only `updated_at` | no |
| `m.fill_pending_slots` | unconditional in `ON CONFLICT`, but gated by `slot.status='pending_fill'` | no — all 5 slots are `filled` |
| `m.promote_slots_to_pending` | `slot.status='future'` | no |
| `m.recover_stuck_slots` | `slot.status='fill_in_progress'` | no |
| `m.release_queue_on_asset_ready` | reads only; writes `post_publish_queue` | no |
| `public.series_post_insert` | INSERT of a new draft | no |
| `public.upsert_carousel_slide` | writes `m.post_carousel_slide` | no |
| publisher readiness | `generated && image_url`, else `image_required_but_skipped` | blocks |

The `fill_pending_slots` path is closed transitively: reaching it needs `slot.status='pending_fill'`,
and the only two writers of that value require `'future'` or `'fill_in_progress'`. Ours are `filled`.
Queue rows are also safe from doctor CHECK 7 (`no_image_url:status=failed` is not transient).

**Empirical confirmation:** across 1 pipeline-doctor run and 9 other recovery runs after containment,
all four drafts held `updated_at = 09:31:48.831851` — zero writes.

**§2 Schedule alignment APPLIED** (10:14:53Z). Preconditions all held: draft `scheduled_for` non-NULL
(2026-07-22 22:06Z); trigger `COALESCE(NEW.scheduled_for, slot…)` evaluates the **draft first**.
`m.post_draft.scheduled_for` for `26aaa129` set to the held queue value **2026-07-25 00:00:00+00**,
read dynamically from the queue row (no literal). Slot deliberately **not** mutated.
Simulation: `trigger_would_set = 2026-07-25 00:00:00+00` = `queue_held`, **`hold_preserved = true`**.

**§3 Containment reconfirmed:** four drafts `skipped`/approved · scan-eligible **0** · `6a23e01a`
untouched (`text`/`pending`, `updated_at` 04:30:06Z) · three queue rows `queued` @ 2026-07-25 ·
**0 publishes** since containment.

**§4 STOP — `origin/main` moved.** Now `1740938c` (was `5a6c998`); `e522e54` is **not** a
fast-forward descendant (`ahead 1 / behind 2`). Everything else passes: tree clean, HEAD `e522e54`,
diff `52801b4d…` **matches**, tests **173/0**, review `ac09b1a2` agree/proceed, branch-warden reports
no wrong-branch/stray-commit risk.

The two new commits are **docs-only** (dashboard security Batch 1 closeout): `docs/00_action_list.md`,
`docs/00_sync_state.md`, and two brief/result docs. **Zero overlap** with the patch's 9 files;
`merge-tree` is conflict-free and the rebased diff is byte-identical (`52801b4d…`, same patch-id).
Sections 5–8 not executed.

**Original-hash mystery SOLVED.** `2292d07e…` reproduces exactly as
`git diff 5a6c998 e522e54 -- supabase/ ':!…/cc0049_quote_card_winner_test.ts'` — a **7-of-9-file**
scoped diff. The new 160-line test and `_harness/cc0049/apply_contract.py` were outside the round-1
reviewed input. The round-2 pin `52801b4d…` covers **all 9 files**, so current review scope is
strictly broader.

---

## 6. PK rulings (2026-07-22)

1. **STOP-1 disposition** — ✅ **RULED: re-review** on `52801b4d…`. No waiver. Step 0 is live.
2. **Containment breadth** — ✅ **RULED: all four** drafts. Removes the pipeline-fixer race entirely.
3. **`653bd32e`** — ✅ **RULED: HOLD.** Deferred with the two image rows; queue row only, draft
   `6a23e01a` not mutated.
4. **Lane class** — ⏳ still unassigned. Not gating: the sequence runs under T3 either way. To be
   stamped at the result-doc stage.
