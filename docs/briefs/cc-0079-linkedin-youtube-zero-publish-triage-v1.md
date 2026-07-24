# cc-0079 — LinkedIn / YouTube "Zero-Publish" Triage (read-only)

> **Lane:** cc-0079 (extends the schedule→format-authority architecture lane) · **Type:** READ-ONLY diagnosis
> **Tier:** T1 · **Class:** SAFETY_GATE (triage of a reported production symptom)
> **Status:** COMPLETE — findings only. Authorises no build, apply, deploy, queue mutation, or platform action.
> **Author base (stale-ref gate PASSED):** CE fetched with prune → `origin/main = ce3e4b8…`, HEAD `ce3e4b8…`, parity **0/0**, branch `main`. Live reads via `ice_ro` R0 + read-only `execute_sql` SELECTs + worker source at HEAD, 2026-07-24.

---

## 0 · Headline

**The premise is a measurement artifact. Both platforms are publishing successfully. Neither needs containment.**

"153 drafts, zero published in 30 days" counts `m.post_draft.approval_status = 'published'`. **LinkedIn and YouTube publishers never write that value** — one by omission, one by design. The authoritative publication records show the opposite:

| Platform | `m.post_publish status=published` (30d) | draft `approval_status='published'` (all time) | actually shipping? |
|---|---|---|---|
| linkedin | **68** | **0** | **yes** |
| youtube | **38** (+ 34 drafts at `video_status='published'`) | **0** | **yes** |
| facebook | 74 | 74 | yes |
| instagram | 64 | 64 | yes |

Facebook and Instagram reconcile the draft to `approval_status='published'`; LinkedIn and YouTube do not, and never have (`approval_status='published'` count for LI+YT = 0 across all time). That single fact produces the entire "zero-publish" signal.

**Stage that owns the defect: status reconciliation** — the per-platform publisher writeback and the choice of which column is authoritative for "published". **Not** schedule, Advisor, render, transport, or platform response.

---

## 1 · Method

Traced each platform independently along: demand slot → draft → approval → due → render/provider eligibility → publisher pickup → transport → platform response → reconciliation. All figures are scheduled-slot drafts (`m.slot.source_kind='scheduled'`, joined via `filled_draft_id`) created in the trailing 30 days, except the cross-platform reconciliation counts which are unfiltered by source to establish the baseline.

---

## 2 · LinkedIn

### 2.1 Fulfilment ladder (scheduled slots, 30d)

| Stage | Count | Evidence |
|---|---|---|
| approved drafts | 56 | `m.post_draft` |
| → with a `post_publish status=published` record | **54** | `post_publish` join |
| → with no publish record | 1 | |
| dead (never published) | 28 | `approval_status='dead'` |
| queue rows created (any status) | 4 | `post_publish_queue` |
| queue: published / queued(future) / skipped | 1 / 1 / 2 | |
| queue skips | 2 | `last_error='asset_guard_blocked:image_required_but_failed'` |
| `post_publish` failed | 2 | same guard reason |
| drafts at `approval_status='published'` | **0** | — |

**54 of 56 approved LinkedIn drafts have a real published record. The transport works.**

### 2.2 Root cause — reconciliation gap by OMISSION

The active LinkedIn path is `linkedin-zapier-publisher` (the 68 published records all carry `queue_id` — queue-driven; the Zapier POST fires and the post is live, per the source's own comment). Its success path:

- `linkedin-zapier-publisher/index.ts:346-360` — INSERT `m.post_publish` with `status='published'`.
- **No `m.post_draft` update anywhere on this path.** `approval_status` stays `'approved'`.

Contrast the native publisher, which does reconcile:

- `linkedin-publisher/index.ts:187` — `.update({ approval_status: "published", … })`.

So the writeback exists in the repo, on the wrong (inactive) publisher. The active Zapier publisher omits it.

### 2.3 Cause tree (ranked)

1. **[owns the symptom] Reconciliation omission** — `linkedin-zapier-publisher` never advances `approval_status`. Accounts for 54/54 published-but-"approved" drafts. **Reporting defect, zero content impact.**
2. **28 `dead` drafts — SEPARATE anomaly, carry forward.** `recommended_format=NULL`, `image_status='pending'`, `dead_reason=NULL`, yet their `m.ai_job` rows all show `status='succeeded'`. A draft whose synthesis job succeeded should carry a format; these are dead with the format nulled. Span 2026-06-24 → 2026-07-19 (appears to have stopped). This is a dead-letter path anomaly, **not** part of the reconciliation story and not caused by format authority. Needs its own read-only lane.
3. **2 governed guard blocks** — `asset_guard_blocked:image_required_but_failed`: an `image_quote` LinkedIn draft whose image render failed was correctly held (queue `skipped` + `post_publish failed`, draft preserved, reason recorded). **Working as designed**, not a silent loss.

### 2.4 LinkedIn verdicts

- **Root cause:** reconciliation omission in `linkedin-zapier-publisher`.
- **Owning stage:** reconciliation (publisher writeback).
- **Narrowest repair lane:** T2, single EF. Add the draft writeback to the Zapier publisher's success path (mirror `linkedin-publisher:187`) **or** point publish-rate telemetry at `m.post_publish` instead of `approval_status`. Prefer the writeback — it also unblocks the §7 slot→outcome reconciliation in the architecture brief.
- **Containment required:** **NO.** Posts are shipping (54/56). The dead-draft anomaly (finding 2) is worth a separate lane but is not currently active and is not an outage.

---

## 3 · YouTube

### 3.1 Fulfilment ladder (scheduled slots, 30d)

| Stage | Count | Evidence |
|---|---|---|
| approved drafts | 39 | |
| → `video_status='published'` | **34** | `post_draft` |
| → with `post_publish status=published` | 34 | `post_publish` (no `queue_id` — separate path) |
| approved but not published | 5 | = 4 invalid `text` + 1 `video_status='failed'` |
| dead | 1 | |
| drafts at `approval_status='published'` | **0** | — |

**34 of 39 approved YouTube drafts published as video.** Transport works.

### 3.2 Root cause — reconciliation gap by DESIGN

YouTube does not use the publish queue. `youtube-publisher` reads approved video drafts directly and on success:

- `youtube-publisher/index.ts:318, :368, :410` — `.update({ video_status: 'published', draft_format, … })`.
- It **deliberately does not touch `approval_status`.** `index.ts:44-47` and `asset_backstop.ts:60-62` state YouTube treats `approval_status='published'` as *cross-platform* truthful state (the draft was published to Facebook), so its per-platform published marker is `video_status`, and its SELECT gate accepts `approval_status IN ('approved','published')` (`:262`).

So for YouTube the authoritative "published" signal is `video_status='published'` + the `post_publish` record — never `approval_status`. Any metric reading `approval_status` will always report zero for YouTube, correctly-by-design yet misleadingly.

### 3.3 The 5 non-published, decomposed

- **4 invalid `text` drafts** — the §9.2 palette-blind Advisor defect (Slice 1 target). YouTube cannot publish `text`; these are the only genuine format-caused losses, and they are a minority.
- **1 `video_status='failed'`** — a single render/submit failure (`video_short_avatar`), within normal failure rate.

### 3.4 Token health (memory flagged a recurring OAuth testing-mode 7-day cap)

**Functionally live — verified by behaviour, not config.** YouTube published 38 posts in the window, most recent **2026-07-22**. A biting token cap would have halted publishing entirely; it did not. `m.platform_token_health` holds no youtube/linkedin rows, so I did not rely on it. The historical OAuth cap is **not currently active**.

### 3.5 YouTube verdicts

- **Root cause:** reconciliation by design — `approval_status` is intentionally not the YouTube published marker; the measurement read the wrong column. Secondary: 4 invalid-`text` losses (Slice 1).
- **Owning stage:** reconciliation (metric definition) primarily; Advisor for the 4 `text` losses.
- **Narrowest repair lane:** telemetry/definition fix — publish-rate and demand-fulfilment reads must consult `m.post_publish` / `video_status`, **not** `approval_status`. Do **not** force `approval_status='published'` on YouTube; that column is deliberately cross-platform. The 4 `text` losses are closed by Slice 1 independently.
- **Containment required:** **NO.** Publishing at 34/39; the shortfall is understood and minor.

---

## 4 · Cross-cutting conclusion (feeds architecture-brief §7)

This triage is a concrete instance of the §7 demand-fulfilment reconciliation gap. The authoritative outcome lives in `m.post_publish`, disconnected from both `m.slot.status` (stuck at `filled`) and `m.post_draft.approval_status` (stuck at `approved`). Because "published" has **three different representations** — `approval_status='published'` (FB/IG), `video_status='published'` (YT), and `m.post_publish.status='published'` (all) — **no single query answers "did this scheduled demand publish?" correctly across all four platforms.** That is the reconciliation contract §7 must define, and this triage is its proof case.

**No format-authority change is required to fix the reported symptom.** The zero-publish report is a reconciliation/telemetry defect. The only format-caused losses are the 4 YouTube `text` drafts, already scoped to Slice 1.

---

## 4b · Queue-sweep corroboration (folded in from the control-tower read-only queue/dead sweep)

An independent queue sweep found: 15 currently-`failed` queue rows **all Instagram** (several carrying `:status=published` in the error string), **zero** LinkedIn / YouTube failed rows; dead queue 464 cumulative but **0 in the last 30 days**; LI 108 / YT 41 dead all historical migration artifacts. The sweep inferred the LI/YT population is "lost before becoming a live-failed queue row."

**This evidence is correct and fully consistent with the §0 root cause — it confirms it and disproves the "lost" inference.** Verified against the queue directly:

- **YouTube is not a queue consumer.** All 38 published `post_publish` records have `queue_id = NULL`; `youtube-publisher` reads approved drafts directly and writes `video_status='published'`. **Zero YT failed queue rows is architectural, not loss.** Artifact found: **24 orphaned YT `queued` rows, `attempt_count=0`, all scheduled 2026-05-25 → 2026-06-24 (>30d old)** — enqueued by a generic path, never consumed because YT ignores the queue. Stranded bookkeeping, not the current cohort, not a loss of current demand.
- **LinkedIn cannot emit a `failed` queue row via the active publisher.** All 68 current published records reference queue rows **that no longer exist** in `post_publish_queue` (verified: 68/68 missing) — on success `linkedin-zapier-publisher:370` sets the row `published`, then a retention sweep purges it. On **failure**, `:392` requeues to `status='queued'` (+15-min backoff), **never** `failed`. So the active LinkedIn path structurally produces neither a surviving success row nor a `failed` row. No perpetual-requeue backlog exists (1 future `queued` row only; no high-retry pile).
- **The IG `:status=published`-on-failed rows are the SAME reconciliation gap on a THIRD surface.** The draft published but the queue row was left `failed`. So the reconciliation gap spans **three** tables: `post_draft.approval_status` (LI/YT never advance), `post_publish_queue.status` (IG left `failed` / LI purged-or-`published`), and only **`m.post_publish` is authoritative**. This extends §4.

**Correct reading of "the queue is clean":** clean queue + 68/38 `post_publish=published` records = **successful publish with missing draft-status reconciliation**, not silent pre-enqueue loss. No new suspect stage opens; the "draft never enqueued / never picked up / silent no-op" branch resolves to: YT off-queue by design (benign), LI enqueue→publish→purge (benign), draft-status never reconciled (the defect). Containment stays **NO** for both.

## 5 · Scope / non-claims

Read-only. No queue mutation, no forced publish, no manufactured draft, no platform action, no writeback applied. Containment was assessed and **declined for both platforms** — per directive, containment is not designed here. The 28-draft LinkedIn dead-letter anomaly (§2.3.2) is flagged for a separate lane and is **not** diagnosed to root cause here. Token health asserted from publish behaviour, not from credential inspection.

**Evidence basis:** CE `ce3e4b8`; live `m.post_publish` / `m.post_draft` / `m.post_publish_queue` / `m.ai_job` reads and `linkedin-zapier-publisher` / `linkedin-publisher` / `youtube-publisher` source at HEAD, 2026-07-24.
