# cc-0080 — Publish-Status Reconciliation Contract (Gate-1 Brief)

> **Lane:** cc-0080 (register block v6.90–v6.99) · **Type:** READ-ONLY architecture / diagnosis brief · **Tier:** T1
> **Class:** SAFETY_GATE (telemetry-integrity defect; no content at risk)
> **Status:** DRAFT — authored only. Authorises NO status write, NO draft touch, NO queue mutation, NO deploy, NO commit.
> **Distinct from:** cc-0079 (schedule→format authority) and cc-0078 (exec_sql silent failure). Do not conflate.
> **Evidence base:** `docs/briefs/cc-0079-linkedin-youtube-zero-publish-triage-v1.md` (sha256 `a8ab0119…`) — referenced, not duplicated.
> **Author base (stale-ref gate PASSED):** CE `origin/main = 043c3946…`, HEAD `043c3946…`, parity 0/0, `main`. Live reads + worker source at HEAD, 2026-07-24.

---

## 1 · The defect in one sentence

**Publication truth is authoritative only in `m.post_publish` (written by all six publishers), while the three operator-facing status surfaces reconcile back to it inconsistently per publish path — so `m.post_draft.approval_status` and `m.post_publish_queue.status` lie about whether a scheduled post shipped.**

Independently confirmed both directions: LinkedIn published **68**, YouTube **~37** in the trailing 30-day window (`m.post_publish`), while `approval_status='published'` for LI+YT = **0 all-time**. The orchestrator's own digest ("153 drafts, 0 published = dead platforms") was produced by reading `approval_status` and is the canonical false-red this lane exists to prevent.

> Count note: YouTube is 37 (latest independent cut) vs 38 (earlier cut) — one post crossed the trailing-30d boundary between reads. Window-sensitive, not a discrepancy.

---

## 2 · The reconciliation contract (§ directive item 1)

### 2.1 Authoritative table

**`m.post_publish` is the single source of publication truth.** Verified: all six publishers INSERT into it on a real send — `publisher` (facebook), `instagram-publisher`, `linkedin-publisher`, `linkedin-zapier-publisher`, `youtube-publisher`, `wordpress-publisher`. A row with `status='published'` + `platform_post_id` + `published_at` is the definition of "this draft shipped to this platform." Nothing else is.

### 2.2 How each dependent surface must reconcile to it

| Surface | Meaning it should carry | Reconciliation rule against `m.post_publish` |
|---|---|---|
| `m.post_draft.approval_status` | lifecycle state of the draft | when a published `post_publish` row exists for the draft's platform, the draft is terminal-published — but see §2.3 (the cross-platform caveat that makes a naive `approval_status='published'` write unsafe) |
| `m.post_publish_queue.status` | work-item state | a queue row whose draft has a published `post_publish` row must be `published`, never left `failed`/`queued`; if purged, that is acceptable (LI) provided the purge only ever removes rows with a published record |
| `m.slot.status` (cc-0079 §7) | demand fulfilment | a slot whose `filled_draft_id` has a published `post_publish` row is `published`, not stuck at `filled` — this is the cc-0079 handoff, named here for completeness |

### 2.3 The cross-platform caveat (why the contract is per-path, not one-size)

`approval_status` is a **single per-draft column**, but YouTube deliberately treats `approval_status='published'` as *cross-platform* truthful state and uses `video_status='published'` as its own per-platform marker (`youtube-publisher/index.ts:44-47`, `asset_backstop.ts:60-62`). Therefore the reconciliation contract must be **per publish path**, and the reconciler must not blindly stamp `approval_status='published'` on a YouTube draft. In the scheduled-slot model each slot creates one single-platform draft (`m.slot.platform` → one `filled_draft_id`), so the cross-platform concern is largely legacy — but the contract must still respect it rather than assume it away.

---

## 3 · Per-path writeback map (§ directive item 2 — file:line evidence)

`✓` writes it · `✗` does not · `n/a` not applicable to this path. Authoritative column (`m.post_publish`) written by every path.

| Publisher / path | active? | `m.post_publish` | `post_draft.approval_status` | `post_publish_queue.status` |
|---|---|---|---|---|
| `publisher` — facebook | yes | ✓ insert | ✓ `'published'` **:508** | ✓ reconciled |
| `instagram-publisher` — happy | yes | ✓ insert **:853** | ✓ `'published'` **:874** | ✓ `'published'` **:867** |
| `instagram-publisher` — timeout / asset-hold fail | yes | ✓ may already exist | ✗ stranded | ✗ left `'failed'` at attempt cap → the 15 `:status=published`-in-error rows |
| `linkedin-publisher` — native | **NO (inactive)** | ✓ insert | ✓ `'published'` **:187** | ✓ |
| `linkedin-zapier-publisher` — **ACTIVE** | yes | ✓ insert **:346** | ✗ **NONE** | ✓ `'published'` **:370** (then retention-purged); on failure requeues `'queued'` **:392**, never `'failed'` |
| `youtube-publisher` — off-queue | yes | ✓ insert | ✗ **NONE by design** (:44-47); writes `video_status='published'` **:318/:368/:410** | n/a — bypasses queue (`queue_id=NULL` on all 37) |

**The pattern:** every path writes the authoritative row; **only Facebook, Instagram-happy and the *inactive* native LinkedIn publisher reconcile `approval_status`.** The two paths that actually carry LinkedIn and YouTube production — `linkedin-zapier-publisher` and `youtube-publisher` — do not, one by omission and one by design. Instagram's failure path additionally strands the queue surface.

Corroborating queue facts (from the triage evidence base, verified): the 68 LinkedIn published records reference queue rows that **no longer exist** (retention purge of `published` rows); YouTube has 24 orphaned `queued` rows (`attempt_count=0`, >30d) it never consumes because it is off-queue. Neither is loss — both are the reconciliation gap on the queue surface.

---

## 4 · False-green / false-red surface impact (§ directive item 3)

The defect corrupts operator truth in **both** directions. S6's V-2 outcome cell requires exactly three states; this brief supplies the logic behind each.

| Cell state | Definition (from `m.post_publish` truth) | Current population | Risk |
|---|---|---|---|
| **reconciled** | published `post_publish` row **and** internal status advanced | FB, IG-happy | correct |
| **external-published-but-unreconciled** (false-RED) | published `post_publish` row **but** `approval_status`/queue lagging | **LI 68 + YT ~37 per window** | operator sees LI/YT as unpublished → duplicate manual reposts, wasted regeneration, false "platform is dead" (the exact digest error) |
| **internal-only** (false-GREEN guard) | internal status says published/approved **but NO** `post_publish` row | to be measured | a draft claiming success that never shipped — the inverse danger; the cell must catch it, not just the false-red |

The three-state cell is computed by LEFT JOINing the draft/queue/slot surfaces to `m.post_publish` on `(post_draft_id, platform)` and comparing. The cell is a **read** — it needs the reconciliation *logic*, not necessarily the reconciliation *write*, to become truthful on the dashboard. That decoupling matters for §5.

---

## 5 · Narrowest repair (§ directive item 4)

Two mutually-compatible strategies; the recommendation is staged.

### Option A — fix the writeback at each deficient publisher
Add `approval_status` reconciliation to `linkedin-zapier-publisher` (mirror `linkedin-publisher:187`); decide a per-platform published marker for `youtube-publisher` that respects the cross-platform caveat (§2.3); fix the Instagram timeout path to not strand the queue row.
- **Pros:** closes the gap at source; no new component.
- **Cons:** 3+ publisher edits across transport code (adjacent to the "does not change transport" non-goal); does **not** backfill the existing 68+37 unreconciled rows; must be re-solved for every future publisher; the YT case forces a semantics decision inside transport code.

### Option B — a governed reconciliation sweep (RECOMMENDED as primary)
One read-mostly reconciler that treats `m.post_publish` as truth and advances lagging `post_draft` / `post_publish_queue` / `slot` status for any row with a published record — idempotent, backfills history, single point of correctness, touches **no** publisher transport.
- **Pros:** covers all six paths and every future one; backfills the existing false-red population in one pass; respects the YT caveat centrally (the sweep can set the operator-facing reconciled state / a per-platform marker without forcing `approval_status` in the publisher); reversible; directly powers the S6 V-2 cell.
- **Cons:** new scheduled component; must be idempotent and fail-closed (never mark reconciled without a genuine `post_publish` row); is corrective, not preventive — the source gap persists until Option A layers on top.

### Recommendation
**B first, A as defense-in-depth.** The sweep makes `m.post_publish` authoritative everywhere in one governed place, backfills the 68+37 rows, and delivers the three-state cell — without touching transport (honouring the non-goal). Then, optionally, tighten `linkedin-zapier-publisher`'s writeback at source so the sweep has less to correct. The sweep must be **read-of-truth / write-of-derived-status only**: it never publishes, never re-sends, never fabricates a `post_publish` row, and only ever advances a status when a real published record justifies it.

> Note: for the operator dashboard alone (S6 V-2), the *read logic* of §4 is sufficient with **zero writes** — the three-state cell can be computed live from the join. The write (sweep) is what makes the internal tables self-consistent for downstream consumers (dedup, demand-fulfilment, analytics). Both are named; the read-only cell can ship independently and first.

---

## 6 · Explicit non-goals (§ directive item 5)

Does **not** change any publisher's transport or send logic. Does **not** touch the Advisor or the format-authority path (cc-0079). Does **not** re-send, force-publish, or fabricate a publication. Does **not** mutate status, drafts, or queue rows in this lane (read-only diagnosis). Does **not** root-cause the 15 Instagram timeout/asset-hold `failed` rows to their trigger — named as a distinct sub-case for verification, not resolved here. Does **not** resolve the cc-0079 `m.slot.status` demand-fulfilment gap — referenced as the adjacent handoff (§2.2).

---

## 7 · Proof matrix (read-only verifiable; sweep rows gated on a future apply lane)

| # | Proves | Method | Pass |
|---|---|---|---|
| C-P1 | `m.post_publish` is universal truth | confirm all 6 publishers insert on send | true (verified §2.1) |
| C-P2 | LI/YT never advance `approval_status` | count `approval_status='published'` for LI/YT | 0 all-time (verified) |
| C-P3 | published-but-unreconciled population | LEFT JOIN draft→`post_publish` | LI 68 / YT ~37 in window |
| C-P4 | three-state cell is total | classify every LI/YT scheduled draft into reconciled / unreconciled / internal-only | zero unclassifiable |
| C-P5 | *(sweep, future apply)* idempotence | run reconciler twice | second run advances nothing |
| C-P6 | *(sweep, future apply)* fail-closed | draft with no `post_publish` row | never marked reconciled |
| C-P7 | *(sweep, future apply)* YT caveat respected | reconcile a YT draft | operator-facing state set without an unsafe cross-platform `approval_status` stamp |
| C-P8 | Instagram queue-strand covered | reconcile the 15 stale `failed` rows | queue status corrected from `post_publish` truth |

---

## 8 · Non-claims

Read-only; nothing applied. `m.post_publish` asserted authoritative from the write-side (all six insert) and the read-side (LI/YT counts) — not from an exhaustive audit of every historical row. The sweep is recommended, not designed or costed. The internal-only (false-green) population is named but not yet measured. The YT per-platform-marker choice is a PK/design decision this brief scopes but does not make. Evidence: worker source at CE `043c394`; live `m.post_publish` / `m.post_draft` / `m.post_publish_queue` reads, 2026-07-24; triage base `a8ab0119…`.
