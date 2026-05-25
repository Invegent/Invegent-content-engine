# Brief F-HEYGEN-WORKER-ASYNC-RENDER — decouple HeyGen render from the Edge Function request lifecycle

**Created:** 2026-05-25 Sydney
**Author:** chat
**Status:** ✅ IMPLEMENTED & VALIDATED (2026-05-25) — was: AUTHORED. Shipped as heygen-worker **v2.0.0** (deployed EF v33; repo `aa07252`).

> **✅ FINAL OUTCOME (closeout 2026-05-25):** Async two-phase lifecycle live and **validated end-to-end** on draft **40f9fa25**: Tick 1 (submit) returned in ~3s → `video_status='rendering'` + `heygen_video_id=9d05ae6b…`; Tick 2 (poll) → `generated` + stored MP4, **same `heygen_video_id` (no duplicate render)**. State machine `pending→rendering→generated|failed` with all guards (no-resubmit, raw error JSON, stale max-age). No schema migration (per the §0/§5 audit — `video_status` unconstrained text; `rendering` ignored by all consumers). plan_review D-01 `6fb98c05` + ef_deploy D-01 `24dcf55b` (both GENERIC-NON-BLOCKING per L46, closed). Implementation spec: `docs/briefs/f-heygen-worker-async-render-impl-plan.md`. Full closeout: `docs/operations/avatar-youtube-pipeline-status-2026-05-25.md`.
**Priority:** P2-blocking — this is the real fix for avatar rendering. The synchronous worker cannot complete renders that exceed the Supabase EF ~150s request limit, and HeyGen renders for production-length narration do exceed it. Blocks F-HEYGEN-WORKER-LANDSCAPE-DIMENSION portrait validation and all downstream avatar→YouTube enablement.
**Supersedes (operationally):** F-HEYGEN-WORKER-POLL-BUDGET — that patch (v1.3.0, 240s poll) is shown below to be unrealizable on this platform; this brief replaces the "raise the budget" approach with an architecture that removes the time ceiling entirely.
**Result file:** `docs/briefs/results/f-heygen-worker-async-render.md` (created on completion)

---

## Header / metadata

**Linked systems**
- `supabase/functions/heygen-worker/index.ts` — **v1.3.0** (deployed EF version 32). The only function in scope.
- `m.post_draft` — `video_status` (text, unconstrained), `video_url` (text), `draft_format` (jsonb). The render-lifecycle state lives here.
- HeyGen v2 generate (`/v2/video/generate`) + v1 status (`/v1/video_status.get`).
- `cron.job` jobid 44 (`heygen-worker-every-30min`, `*/30`) — the existing scheduler that will drive both phases.

**Scope**
- heygen-worker **architecture only**. No youtube-publisher enablement. No ai-worker changes (none identified as required — see §3/§9). No further render attempts in this brief. No deploys.

**Dependencies**
- **F-HEYGEN-NEVER-PRODUCED** (Option A) — the avatar pipeline this serves.
- **F-HEYGEN-WORKER-LANDSCAPE-DIMENSION** (v1.2.0) — portrait dimension; its validation is blocked until this lands.
- **F-HEYGEN-WORKER-POLL-BUDGET** (v1.3.0) — superseded approach; its §3 "preserve `heygen_video_id`" enhancement is now a **core requirement** here.
- **F-YT-PUB-AVATAR-EXCLUSION** — downstream; publisher enablement stays deferred to it.

---

## 1. Problem statement

The current heygen-worker is **synchronous within a single HTTP request**: it `submit`s a HeyGen job, then `poll`s in a loop until completion, then `download`s the MP4, `store`s it, and `update`s the DB — all before returning. This breaks when render time exceeds the **Supabase Edge Function request limit (~150s idle timeout)**: the platform 504s and terminates the function mid-poll, before it can download/store/update.

PK manually confirmed the HeyGen-side video **does eventually generate** even after the worker is killed — so the render is real and recoverable; only the worker's ability to *observe* completion within one request is the problem. The fix: the worker must **persist the HeyGen job id at submit time and poll asynchronously across subsequent cron invocations**, so no single invocation ever needs to stay alive for the full render.

---

## 2. Evidence (validation runs, 2026-05-25)

| Subject | Worker | Render time | Outcome |
|---|---|---|---|
| `ba5b34eb` | v1.1.0 (landscape, ~250-char narration) | **~111s** | ✅ succeeded — under 150s |
| `40f9fa25` #1 | v1.2.0 (120s poll budget) | 129s wall | self-timeout at 120s → clean `failed` (still under 150s) |
| `40f9fa25` #2 | v1.3.0 | ~28s | HeyGen fast-fail — **API balance exhausted** (`[object Object]`, opaque) |
| `40f9fa25` #3 | v1.3.0 (240s poll budget) | killed @ ~150s | **Supabase 504 `IDLE_TIMEOUT` (req 128089)** — EF terminated mid-poll; draft left `pending` |

- **PK confirmed** (manual HeyGen dashboard check, post-#3) that the #3 video **did generate on HeyGen's side** — proving the failure was the EF lifecycle, not HeyGen.
- **v1.3.0 introduced a new failure mode:** for renders in the 150–240s range, the worker is 504-killed before it can write any terminal state, leaving the draft stuck `video_status='pending'` → the every-30-min cron re-submits it → **duplicate external renders + wasted HeyGen balance on a loop that can never succeed**. (Observed and manually halted during #3 by setting the draft to `failed`.)
- Net: raising the poll budget was the wrong axis. The ceiling is the EF request lifetime (~150s), which no in-request poll budget can exceed.

---

## 3. Proposed lifecycle (two-phase, cron-driven)

Both phases run inside the same `heygen-worker` invocation on each `*/30` cron tick (Phase B first, then Phase A, so a freshly-submitted draft isn't polled in the same tick). Each phase touches few rows and returns well under 150s.

### Phase A — submit (was: the whole job)
- **Select** eligible avatar drafts: `recommended_format='video_short_avatar'` AND `video_status='pending'` AND `approval_status IN ('approved','published')` (limit small, e.g. MAX_SUBMITS=3).
- Resolve avatar/voice/narration exactly as today (`lookupAvatar`, `video_script.narration_text`, brand colour, dimension 720×1280).
- **Guard:** if `draft_format->>'heygen_video_id'` already present, do **not** resubmit (skip to rendering) — prevents duplicate external renders.
- Call HeyGen `/v2/video/generate` **once**.
- **Immediately persist and return** (no polling):
  - `video_status='rendering'`
  - `draft_format.heygen_video_id`
  - `draft_format.heygen_submitted_at = now()`
  - render metadata (`render_style`, `dimension`, `narration` ref) in `draft_format`
- Returns in a few seconds (submit only).

### Phase B — poll (new)
- **Select** in-flight drafts: `recommended_format='video_short_avatar'` AND `video_status='rendering'` AND `draft_format->>'heygen_video_id' IS NOT NULL` (limit small, e.g. MAX_POLLS=5).
- For each, poll HeyGen `/v1/video_status.get?video_id=…` **a bounded number of times per tick** (e.g. 1–3 attempts, NOT a 120s+ loop — keep each invocation short; the *next cron tick* is the real "wait").
- Branch on status:
  - **processing/pending** → leave `video_status='rendering'` unchanged (picked up next tick).
  - **completed** → download MP4 → `storage.upload` to `post-videos` → set `video_url`, `video_status='generated'`, `draft_format.rendered_at=now()`, `heygen_video_url`.
  - **failed** → `video_status='failed'`, persist **raw HeyGen error JSON** (`JSON.stringify(data.data?.error)` — fixes the v1.3.0 `[object Object]` defect), `heygen_failed_at=now()`.
- Returns quickly regardless (a few short status GETs).

This decouples render duration from any single request: a 3-minute HeyGen render simply spans ~1–6 cron ticks, each invocation finishing in seconds.

---

## 4. State-machine requirements

**Allowed `video_status` values (avatar path):** `pending` → `rendering` → `generated` | `failed`.

- `pending` — created by ai-worker (A3); awaiting submit.
- `rendering` — **new**; HeyGen job submitted, `heygen_video_id` persisted, awaiting completion.
- `generated` — MP4 stored, `video_url` set; eligible for downstream (publisher still excludes avatar — unchanged).
- `failed` — submit error, HeyGen render failure, or stale-timeout (below); raw error persisted.

**Guards:**
1. **No resubmit if `heygen_video_id` exists** — Phase A skips any draft already carrying an id (defends against a `pending` row that was mid-submit, and against duplicate external renders).
2. **No duplicate external render** — a draft is only ever submitted once; Phase B never submits.
3. **Raw HeyGen error persisted** — on `failed`, store the stringified error object (and HTTP status if available), not `[object Object]`.
4. **Stale `rendering` detection / max age** — if `now() - heygen_submitted_at > STALE_RENDER_MAX` (e.g. 30 min, ≥ HeyGen's worst-case render time), Phase B marks the draft `failed` with a `stale_render_timeout` reason (and records the last-seen HeyGen status) so a genuinely stuck/lost job doesn't poll forever. Tunable; start conservative.
5. **(Recommended) idempotent storage path** — keep the existing deterministic `clientSlug/draftId_avatar_style.mp4` path with `upsert:true`, so a re-download is safe.

---

## 5. Migration / schema decision

**No schema migration is necessary.** Read-only recon (2026-05-25) confirmed:
- `m.post_draft.video_status` is **`text`, nullable, with NO CHECK constraint and no enum** → the new value `'rendering'` is accepted with zero DDL.
- `heygen_video_id`, `heygen_submitted_at`, `heygen_failed_at`, `rendered_at`, `heygen_video_url` are **not columns** — they already live in `draft_format` (jsonb), which is exactly where the current worker writes `heygen_video_id`/`heygen_error`.

**Recommendation: use the existing `draft_format` JSONB + the unconstrained `video_status` text — no new columns, no migration.** This is the lowest-risk path and matches current conventions. Consequently **no `sql_destructive` D-01 is required** for the core change; it is a pure `ef_deploy`.

**Required pre-implementation audit (not a migration, but a safety check):** enumerate consumers that filter on `video_status` and confirm none mis-handle the new `'rendering'` value. Known-safe by inspection: youtube-publisher (filters `='generated'` → won't publish a rendering draft), other publishers similarly value-specific. Flag for explicit check: dashboards, draft-notifier, any pipeline-health/sentinel queries, and any `video_status='pending'`-based metrics. Add a JSONB GIN/expression index only if Phase B's `rendering` scan proves slow (unlikely at current volume — defer).

---

## 6. Rollback

- **Redeploy v1.3.0 or v1.2.0** to revert to the synchronous worker.
- **`rendering` drafts remain fully recoverable** because `heygen_video_id` is persisted at submit: a one-off status poll (or a re-deploy of the async worker) can still fetch + store the completed MP4 without re-rendering. No external render is lost or duplicated by a rollback.
- Interim cleanup if rolling back: any draft left in `video_status='rendering'` should be either (a) hand-polled to completion via its `heygen_video_id`, or (b) set to `failed` — so the synchronous worker (which doesn't understand `rendering`) doesn't ignore them. No DB structure to revert (none was changed).

---

## 7. Validation plan (at execution time — read-only first; one controlled subject)

1. Pre: GET `/health` = new version; confirm repo == deploy; pick **one** controlled avatar draft (reset `40f9fa25` to `pending` under explicit PK instruction, or next eligible). Do **not** touch `ba5b34eb`.
2. **Submit phase:** one supervised invoke → confirm it **returns quickly** (seconds) and the draft becomes `video_status='rendering'` with a non-null `draft_format.heygen_video_id` and `heygen_submitted_at`.
3. **Poll phase:** on a later invoke (or wait for a cron tick) → confirm the draft transitions `rendering → generated`, with `video_url` set and a stored MP4 in `post-videos`. Confirm **no duplicate** HeyGen submit occurred (same `heygen_video_id` throughout).
4. **Inspect MP4:** confirm portrait (height > width, ideally 720×1280) and record visual quality (full-frame vs letterboxed) — this finally completes the F-HEYGEN-WORKER-LANDSCAPE-DIMENSION check.
5. **Failure path:** (optional) confirm a forced/failed render records raw HeyGen error JSON, not `[object Object]`.
6. **Regression / safety:** confirm youtube-publisher still excludes avatar (no publish), and that a `rendering` draft is not mishandled by any other consumer (per §5 audit). **No publisher enablement.**

---

## 8. Governance

- **`plan_review` D-01** — fire on this brief / the coordinated implementation plan once PK greenlights.
- **`ef_deploy` D-01** — the heygen-worker v2.0.0 deploy. PK deploys manually from `C:\Users\parve\Invegent-content-engine`; repo↔deploy sync required.
- **`sql_destructive` D-01** — **not anticipated** (no migration per §5). If the pre-implementation audit unexpectedly requires a constraint/column/index change, that DDL fires its own `sql_destructive` D-01 via `apply_migration` (never `execute_sql`/`db push`), with L33–L35 / L61 pre-flight as applicable.
- **Explicit PK approval phrase required before each production mutation** (deploy, and any migration if one arises). Honour all active hold-state in `docs/00_sync_state.md`.

---

## Stop condition
Brief authored + committed. **Do not implement, do not deploy, do not migrate, do not render.** Next step is PK greenlight → `plan_review` D-01 → implementation in a separate supervised session.

## Forbidden actions (until PK approval + D-01 chain + approval phrase)
- Do **not** edit, deploy, or invoke heygen-worker.
- Do **not** apply any migration (none expected; if one arises it is separately gated).
- Do **not** change youtube-publisher, the catalog, cron, or any publish behaviour.
- Do **not** run further render attempts; do **not** mutate `ba5b34eb`.

---

## Recommended implementation version: **heygen-worker v2.0.0**
This is a behavioural/architectural change (synchronous → async/stateful, new `rendering` status, two-phase lifecycle) — a **major** version bump from the v1.x synchronous line is the honest signal. (v1.1.0–v1.3.0 were all variations of the same synchronous model; v2.0.0 marks the model change.)
