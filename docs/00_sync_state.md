# ICE — Sync State Index

> **This file is the lightweight session pointer index.** Per-session detail lives at `docs/runtime/sessions/YYYY-MM-DD-{slug}.md`.
>
> Restructured 2026-05-03 (G1). See `docs/runtime/archive/sync_state-pre-2026-05-03.md` for pre-restructure history.

---

## ⚠️ Session-start reading order (per memory entry 1)

1. **`docs/00_sync_state.md`** (this file) — pointer index + last 1-2 sessions inlined
2. **`docs/00_action_list.md`** — running queued/active/blocked/frozen backlog
3. Open the most-recent session file from the index below if deeper context is needed

---

## 📚 Session index (reverse chronological)

| Date | Slug | Headline | File |
|---|---|---|---|
| 2026-05-20 | v2.99-cc0016-stage-b-fab-upload-validated | **cc-0016 Stage B FAB upload/read UX validated + V-A5 PASS.** Dashboard Stage B shipped at `36fe6ad` (files: `actions/emit-friction.ts`, `components/friction-form.tsx`; typecheck PASS). CCB verified: FAB picker visible, no-attachment + one-attachment submit work, max-3 enforced, GIF rejected, >5MB rejected. Chat/backend read-only confirmed: no-attachment event `attachments=[]`, attachment event with one attachment, storage object exists, DB metadata matches object. CCD read-back confirmed: signed URL HTTP 200, Content-Type image/png, 861 bytes, PNG intact. **V-A5 now empirically PASS** (was DEFERRED across Stage A + Stage C). Smoke artefacts retained (no-attach event `2120b2f7`, attach event `75f0c981`, object `friction-evidence/9e314151-.../0_va5-smoke.png`). **cc-0016 Stage B CLOSED/PASS.** Stage A closed, Stage C closed, Stage B closed. Stage D (/operations evidence display) NEXT. Stage E future/separately-approved-only. Cowork lifecycle WARN / cc-0015 / PRV / Stage E UNCHANGED (open). 0 content-engine code changes / 0 Supabase mutations / 0 lifecycle cleanup / 0 retroactive editing / 0 fn_set_event_attachments / 0 /operations display / 0 Stage D/E / 0 dashboard edits / 0 smoke-object deletion / 0 D-01 fires. L-v2.85-e 12th consecutive. L-v2.83-a 16+ STRONG. Files changed: 3 (session file + sync_state + action_list, atomic single commit). | `docs/runtime/sessions/2026-05-20-v2.99-cc0016-stage-b-fab-upload-validated.md` |
| 2026-05-20 | v2.98-cc0016-stage-c-applied | **cc-0016 Stage C extended-emit-function APPLIED.** Migration `cc_0016_c_emit_manual_event_with_attachments` applied via `apply_migration` MCP after D-01 approval at `m.chatgpt_review` id `358c6fdd-fce3-4150-a780-9e4397fd2fc6` (verdict=agree, action_taken=proceed, risk_level=medium). 8 approved mutations applied atomically: DROP 6-arg `fn_emit_manual_event` + DROP 12-arg `emit_event` + CREATE 13-arg `emit_event` with trailing `p_attachments jsonb DEFAULT '[]'::jsonb` + CREATE 8-arg `fn_emit_manual_event` with trailing `p_event_id uuid DEFAULT NULL` + `p_attachments jsonb DEFAULT '[]'::jsonb` + REVOKE/GRANT on both new signatures (authenticated + service_role only). **cc-0017b unified emit pipeline preserved byte-stable** — `fn_emit_manual_event` delegates to `emit_event` via SELECT (no direct INSERT into `friction.event`). Attachment shape validation lives in two concordant layers (pipeline + manual). **V-C0/V-C1/V-C2/V-C3a/V-C3b/V-C3c/V-C3d/V-C3e/V-C4/V-C5/V-C6 PASS** (11/11 SQL V-checks); V-A5 (authenticated upload + read round-trip) carried to Stage B FAB ship. 3 D-01 review rows close-the-loop resolved (`56e65bb2` partial/high/escalated → resolved; `dbabb576` partial/high/escalated → resolved; `358c6fdd` agree/proceed/completed → annotated). All 3 `resolved_by='cc-0016-stage-c-apply-v2.98'`. Outstanding count 28 → **26** (–2 escalated). **cc-0016 Stage C APPLIED/CLOSED.** L-v2.85-e 13th consecutive. L-v2.83-a 17+ STRONG. L-v2.98-a/b/c NEW candidates. L46 + L48 + L58 + L62 re-exercised v2.98. Files changed: 4 (session file + sync_state + action_list + brief v1.2 changelog line, atomic single commit). | `docs/runtime/sessions/2026-05-20-v2.98-cc0016-stage-c-applied.md` |
| 2026-05-20 | v2.97-cc0016-stage-a-applied | **cc-0016 Stage A friction-capture-evidence APPLIED.** Migration `cc_0016_a_attachments_schema_and_bucket` applied via `apply_migration` MCP after D-01 third-fire approval at `m.chatgpt_review` id `9eb35144-5c70-4cc1-8086-e9ec4525bca5` (verdict=agree, action_taken=proceed). Objects created: private `friction-evidence` bucket (5MB, 3 MIME types — no GIF) + 3 storage.objects RLS policies (bucket_id-scoped only) + `friction.event.attachments jsonb NOT NULL DEFAULT '[]'` + 2 CHECK constraints (`friction_event_attachments_is_array`, `friction_event_attachments_max_3`) + `idx_friction_event_has_attachments` partial index + `friction.case_with_attachment_count` view + SELECT grant to `authenticated` + `service_role`. **V-checks: V-A1/V-A2/V-A3/V-A4/V-A4b/V-A6 PASS; V-A5 DEFERRED to Stage B** (manual upload round-trip; subsequently empirically PASS at v2.99). 34 existing `friction.event` rows received `attachments='[]'` instantaneously via DEFAULT; 29 `friction.case` rows visible in attachment-count view (all `attachment_count=0`). **Close-the-loop on 3 D-01 review rows:** `6f2b8b1a` (partial/high/escalated → resolved), `f573e684` (partial/medium/escalated → resolved), `9eb35144` (agree/proceed/completed → annotated). All 3 marked `resolved_by='cc-0016-stage-a-apply-v2.97'`. Outstanding count 28 → 26 (–2 escalated). **cc-0016 Stage A APPLIED/CLOSED.** L-v2.85-e 12th consecutive. L-v2.83-a 16+ STRONG. L-v2.97-a NEW HIGH-SIGNAL (first private storage bucket pattern). L-v2.97-b NEW minor (PG SUM(integer)=bigint). L46 + L48 re-exercised v2.97. Files changed: 3 (session file + sync_state + action_list, atomic single commit). | `docs/runtime/sessions/2026-05-20-v2.97-cc0016-stage-a-applied.md` |
| 2026-05-20 | v2.96-dashboard-slices-4a-4b-recorded | **Dashboard slices 4A–4B recorded.** Slice 4A `dashboard-status-strip-copy-links-v1` at `cd02402` VISUAL PASS; slice 4B `dashboard-drafts-count-clarity-v1` at `f5a980f` VISUAL PASS. Count mismatch = copy/semantics, not cache/backend defect. **Top alert bar count reconciliation CLOSED for UI-copy/linkification scope.** | `docs/runtime/sessions/2026-05-20-v2.96-dashboard-slices-4a-4b-recorded.md` |
| 2026-05-20 | v2.95-dashboard-slices-1-3-recorded | **Dashboard slices 1–3 recorded.** Slice 1 `af60953`; slice 2 `de4501b` + `37008e5`; slice 3 `991a92b`. "Stop Claude" overlay external/non-app. **Dashboard PHASES 46-streak deferral CLOSED by Slice 3.** | `docs/runtime/sessions/2026-05-20-v2.95-dashboard-slices-1-3-recorded.md` |
| 2026-05-20 | v2.94-cowork-brief-lifecycle-reset-and-convention | **Cowork brief lifecycle gating WARN REFRAMED + ready reset + convention patched.** WARN explicitly NOT closed. | `docs/runtime/sessions/2026-05-20-v2.94-cowork-brief-lifecycle-reset-and-convention.md` |
| 2026-05-20 | v2.93-cron85-natural-fire-closed-9check-retired | **Reconciliation daily cadence diagnostic CLOSED-PASS.** D-FR-RECON-001 v1.0 at `fc726e3c`. | `docs/runtime/sessions/2026-05-20-v2.93-cron85-natural-fire-closed-9check-retired.md` |
| 2026-05-19 | v2.92-vc3-signal-production-closed | Health_check V-C3 CLOSED-PASS. Cowork brief lifecycle gating WARN spawned. | `docs/runtime/sessions/2026-05-19-vc3-signal-production-closed.md` |
| 2026-05-19 | v2.91-cc0017e-v1.1-8item-doc-patch | cc-0017e v1.1 8-item doc patch CLOSED at `be4e6772`. | `docs/runtime/sessions/2026-05-19-cc0017e-v1.1-8item-doc-patch.md` |
| 2026-05-19 | v2.90-cc0017e-applied | cc-0017e Wave 0e APPLIED-WITH-VCHECK-CORRECTION. | `docs/runtime/sessions/2026-05-19-cc0017e-applied.md` |
| 2026-05-16 | v2.76-stage-e-close-and-window-open | cc-0014 FULLY CLOSED + 14-DAY WINDOW + FAB LIVE + cc-0015/0016 DRAFTED. | `docs/runtime/sessions/2026-05-16-v2.76-stage-e-close-and-window-open.md` |

*(Older sessions truncated for brevity. v2.77–v2.89 per prior index.)*

**Pre-2026-05-03 history**: frozen at `docs/runtime/archive/sync_state-pre-2026-05-03.md`.

---

## 🟢 Most recent session — inline summary

### 2026-05-20 Sydney — v2.99: cc-0016 Stage B FAB upload/read UX validated + V-A5 PASS

**Outcome:** cc-0016 Stage B (FAB evidence upload/read UX) shipped in Invegent-dashboard at `36fe6ad575a125870c9ac7eeb25a0da605a9c7d3` and verified across three layers. **V-A5 (storage round-trip) carried from Stage A/C is now empirically PASS.** Stage B CLOSED/PASS. No content-engine code changes, no Supabase mutations, no dashboard edits this session.

**Stage B facts:**

| Fact | Value |
|---|---|
| Dashboard commit | `36fe6ad575a125870c9ac7eeb25a0da605a9c7d3` |
| Files changed | `actions/emit-friction.ts`, `components/friction-form.tsx` |
| Typecheck | PASS |
| V-A5 | **PASS** (was DEFERRED) |

**CCB frontend verified:** FAB picker visible; no-attachment submit; one-attachment submit; max 3 enforced; GIF rejected; >5MB rejected.

**Chat/backend read-only confirmed:** no-attachment event `attachments=[]`; attachment event with one attachment; storage object exists in friction-evidence; DB metadata matches object.

**CCD read-back confirmed:** signed URL HTTP 200; Content-Type image/png; Content-Length 861 bytes; PNG bytes intact.

**Smoke artefacts (retained as V-A5 evidence — DO NOT DELETE):**
- No-attachment smoke event `2120b2f7-219f-4d0d-be56-512d81430873`
- Attachment smoke event `75f0c981-1180-4047-9aa3-f725bec6eb9b`
- Storage object `friction-evidence/9e314151-be65-434e-8588-c913012f6591/0_va5-smoke.png` (861 bytes, image/png)

**cc-0016 stage ledger:**

| Stage | Status |
|---|---|
| A | CLOSED |
| C | CLOSED |
| **B** | **CLOSED/PASS (v2.99)** |
| D | NEXT (/operations evidence display) |
| E | FUTURE — separately approved only |

**Items closed v2.99:** cc-0016 Stage B (CLOSED/PASS); V-A5 (PASS).

**Next ranked action:** cc-0016 Stage D — /operations evidence display/thumbnails. Goal: make attached evidence visible from operator surface. Stage D must NOT implement lifecycle cleanup, must NOT add retroactive attachment editing, must NOT change upload flow unless required.

**Items explicitly NOT closed (per directive):** Cowork lifecycle gating WARN (core rank 1); cc-0015 (gated on Gate 11 closing 2026-05-26); PRV (deferred per D-FR-RECON-001 §7.D); Stage E lifecycle cleanup (future/separately-approved); mobile/narrow viewport verification (P3); backend/shared-metrics refactor (deferred carry).

**Hard stops respected v2.99:**
- 0 content-engine production code changes for Stage B
- 0 Supabase schema/function mutations in Stage B
- 0 Supabase mutations this session (read-only verification)
- 0 lifecycle cleanup / 0 retroactive editing / 0 fn_set_event_attachments
- 0 /operations evidence display / 0 Stage D/E work
- 0 Invegent-dashboard edits / 0 smoke-object deletion / 0 test-event cleanup
- 0 closure of Cowork WARN / cc-0015 / PRV / Stage E
- 0 D-01 fires / 0 memory edits / 0 decisions.md edits

**Sync close mechanics v2.99 (atomic single-commit per L-v2.85-e — 12th consecutive):** session file + sync_state + action_list in one push.

**v2.99 honest limitations:**
- Cross-session: v2.97 (Stage A close) + v2.98 (Stage C close) NOT loaded in chat context at v2.99 authoring time; recorded as placeholders. **RECONCILED v2.99.1** — placeholders replaced by the original headlines drawn from commit `2885b0d` (v2.98 close state). Ancestry verified clean: `307822b` (v2.97) and `2885b0d` (v2.98) are both ancestors of `b54f014` (v2.99); session files for both exist at the recorded paths. This was a relay/context wording issue, not a repo regression.
- Chat did not fetch dashboard HEAD or verify `36fe6ad` independently. Per directive payload.
- CONSTRAINT 1 operator-authorisation negative-path test not explicitly asserted in directive (acceptable under single-operator posture; gap flagged for multi-operator hardening).
- T-MCP-02 cum ~92 unchanged (0 D-01 v2.99). State-capture exceptions cum 1.
- friction.* schema state assumed unchanged from Stage C apply; not re-probed.

---

### 2026-05-20 Sydney — v2.96 close (brief)

Dashboard slices 4A–4B recorded as completed visual/operator work. Slice 4A `dashboard-status-strip-copy-links-v1` at `cd02402`; slice 4B `dashboard-drafts-count-clarity-v1` at `f5a980f`. Count mismatch root cause: copy/semantics, not cache/backend defect. Top alert bar count reconciliation CLOSED for UI-copy/linkification scope. Backend/shared-metrics refactor deferred (not actively ranked).

*(Full detail at `docs/runtime/sessions/2026-05-20-v2.96-dashboard-slices-4a-4b-recorded.md`.)*

---

## 🟡 Next session priorities (rebuilt v2.99)

**Core ICE ranks:**

1. **Cowork brief lifecycle gating WARN — `nightly-health-check-v1`** — P2 carry, rank 1. Closure waits on PK observation of next 16:00 UTC fire under v2.94 convention. **Secondary (P3):** 3 no-fire scheduler days (2026-05-16, 2026-05-18, 2026-05-19).
2. **cc-0016 Stage D — /operations evidence display/thumbnails** — **P2, rank 2 (NEW v2.99; promoted from "cc-0016 Stage A" which is now closed)**. Make attached evidence visible from operator surface. Likely read-side only (existing view + signed URLs); confirm at brief authoring. Must NOT implement lifecycle cleanup / retroactive editing / upload-flow changes.
3. **Wave 0f scoping** — P3, rank 3. Opportunistic during Gate 11 window.
4. **Platform Reconciliation View brief authoring** — P2 carry, rank 4 (deferred per D-FR-RECON-001 §7.D).
5. **5-row close-the-loop batch / Pre-sales / `purge_test_case` helper case_history extension** — P2/P3 carry, rank 5.

**Dashboard work (separately ranked v2.99):**

1. **D1**: cc-0016 Stage D /operations evidence display (also core rank 2 — it is the active dashboard build). P2.
2. **D2**: cc-0015 friction-pool-view UI (slice 5) — P2, Gate 11 closes 2026-05-26.
3. **D3**: PRV surface — P2, brief authoring deferred.
4. **D4**: Mobile/narrow viewport verification — P3 carry.

**Standing P0:** Personal businesses check-in. Crazy Domains refund + clean-up carry from v2.51.

Carries: cc-0015 (Wave 7, gated on Gate 11 closing 2026-05-26); cc-0016 Stage E (future/separately-approved); cc-0017c v1.2 doc patch; cc-0017a v1.2 doc patch; vchecks.md V-B4 doc patch; minor doc patches; F-CRON-AUTO-APPROVER-SECRET-INLINE; backend/shared-metrics refactor (deferred); lesson promotions (L-v2.83-a STRONG 16+; **L-v2.85-e PROMOTION-CONFIRMED 12th consecutive v2.99**; L-v2.85-a HIGH-SIGNAL 4 occurrences; L62 strongly reinforced via cc-0016 6-fire series; L-v2.88-a watcher CLOSED for cc-0016; L-v2.90-a-f watchers).

---

## ⛔ Carried-forward "do not touch" state

**v2.99 updates on standing items:**

- **cc-0016 Stage B CLOSED/PASS v2.99.** Dashboard commit `36fe6ad`. V-A5 PASS. Smoke artefacts retained.
- **cc-0016 Stage A CLOSED** (v2.97-assumed; reconcile session file next session). Bucket + column + 2 CHECK + index + view + GRANT.
- **cc-0016 Stage C CLOSED** (v2.98-assumed; reconcile session file next session). emit_event 13-arg + fn_emit_manual_event 8-arg; cc-0017b pipeline preserved.
- **cc-0016 Stage D** — NEXT; /operations evidence display; core rank 2 v2.99.
- **cc-0016 Stage E** — future/separately-approved-only. Stage A CONSTRAINT 2 carries.
- **V-A5 smoke object** `friction-evidence/9e314151-be65-434e-8588-c913012f6591/0_va5-smoke.png` — DO NOT DELETE; V-A5 evidence.
- **Smoke events** `2120b2f7` + `75f0c981` — DO NOT cleanup unless separately directed.
- **Cowork brief lifecycle gating WARN** — Not closed v2.99. Core rank 1 unchanged.
- **cc-0015 / PRV** unchanged — directive explicitly preserves as open.
- **Dashboard slices 1–3 + 4A–4B RECORDED** v2.95 + v2.96 (carry).
- **Top alert bar count reconciliation CLOSED for UI-copy scope v2.96** (carry).
- **Dashboard PHASES 46-streak deferral CLOSED v2.95** (carry).
- **"Stop Claude" overlay external/non-app v2.95** (carry).
- **Mobile/narrow Roadmap layout unverified** — P3 carry.
- **Backend/shared-metrics refactor** — deferred carry; not actively ranked.
- **Reconciliation daily cadence diagnostic CLOSED-PASS v2.93** — carry.
- **D-FR-RECON-001 v1.0 at `fc726e3c`** — carry.
- **cc-0017a/b/c/d/e APPLIED**, **cc-0014 CLOSED-ARCHIVED** — unchanged.
- **Cowork brief `nightly-health-check-v1` FROZEN at v3.0**; reset to `ready` v2.94.
- **cron 82-86** firing normally.
- **L41**: cumulative — no new exercises v2.99 (read-only session).
- **L40 / L46 / L58 / L62**: L62 strongly reinforced via cc-0016 series; L40/L46/L58 not exercised v2.99.
- **L-v2.83-a**: **16+ occurrences v2.99**. STRONG CANDIDATE confirmed.
- **L-v2.85-a HIGH-SIGNAL**: 4 occurrences (unchanged v2.99).
- **L-v2.85-e**: **PROMOTION-CONFIRMED v2.88; 12th consecutive occurrence v2.99**.
- **L-v2.88-a**: watcher CLOSED for cc-0016 (no identical-loop pattern across 7 fires). 2 prior occurrences (v2.88 + v2.91) carry forward for other contexts.
- **L-v2.90-a-f**: not empirically re-exercised v2.99 (Stage C apply at v2.98). Watchers.
- **22 close-the-loop UPDATEs baseline** — Stage C 3 rows assumed resolved at apply (v2.98); net not recomputed this session.
- **T-MCP-02 quota: ~92 cumulative v2.99** unchanged (0 D-01 v2.99).
- State-capture exceptions: 1 unchanged.
- Standing don't-redeploy three (heygen-avatar-creator, heygen-avatar-poller, draft-notifier).
- **Production FAB live on dashboard.invegent.com** — now with evidence-upload UX (Stage B).
- **Localhost FAB cleanup pending** (`.env.local`).
- **D-CC-0017B-Q1** + **D-IOL-001** (v2.77) carried.

---

## 📜 G1 convention (the rule)

Unchanged. v2.99 per-session file `docs/runtime/sessions/2026-05-20-v2.99-cc0016-stage-b-fab-upload-validated.md` written and committed atomically alongside sync_state + action_list per L-v2.85-e baseline (**12th consecutive occurrence**). CCH-side `push_files` MCP single atomic commit. `decisions.md` not touched. L-v2.89-a fallback (1+1+1) ready but **not invoked v2.99**.

**This file size**: ~21KB after this update.

---

*Last updated: 2026-05-20 Sydney — v2.99: cc-0016 Stage B FAB upload/read UX validated + V-A5 PASS. Dashboard Stage B at `36fe6ad575a125870c9ac7eeb25a0da605a9c7d3` (files: `actions/emit-friction.ts`, `components/friction-form.tsx`; typecheck PASS). CCB + chat backend + CCD read-back all verified. V-A5 empirically PASS (signed URL HTTP 200, image/png, 861 bytes, PNG intact). Smoke artefacts retained: no-attach event `2120b2f7`, attach event `75f0c981`, object `friction-evidence/9e314151-be65-434e-8588-c913012f6591/0_va5-smoke.png`. **cc-0016 Stage B CLOSED/PASS.** Stage A closed, Stage C closed, Stage B closed. Stage D (/operations evidence display) NEXT — core rank 2. Stage E future/separately-approved-only. Cowork lifecycle WARN / cc-0015 / PRV / Stage E UNCHANGED (open). 0 content-engine code changes / 0 Supabase mutations / 0 lifecycle cleanup / 0 retroactive editing / 0 fn_set_event_attachments / 0 /operations display / 0 Stage D/E / 0 dashboard edits / 0 smoke-object deletion / 0 D-01 fires / 0 memory edits / 0 decisions.md edits. T-MCP-02 cum ~92 unchanged. State-capture exceptions cum 1. L-v2.85-e 12th consecutive. L-v2.83-a 16+ STRONG. L-v2.88-a watcher CLOSED for cc-0016. Per-session detail `docs/runtime/sessions/2026-05-20-v2.99-cc0016-stage-b-fab-upload-validated.md`. 3-file atomic single-commit. Cross-session note: v2.97 + v2.98 not loaded in chat context — reconcile session files next session.*
