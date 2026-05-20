# D-FR-RECON-001 — Friction Surface Reconciliation Brief

**Brief ID:** D-FR-RECON-001
**Version:** v1.0
**Status:** AUTHORED — READ-SIDE ONLY (no production mutation, no migration, no deploy)
**Authored:** 2026-05-20 Sydney
**Author:** Chat-side Claude under PK directive
**Mode:** Advisor-directed. ChatGPT may use GitHub/Supabase tools for read-only verification only.
**Strategic anchor:** Stabilises the actual friction-register baseline before PRV, cc-0016, or Wave 0f proceeds.
**D-01 required?** No. Documentation/read-side only. No DDL, DML, EF deploy, or schema change in this brief.

---

## 0. Why this brief exists

The 2026-05-19 v2.92 close summarised the friction register correctly on schema state but drifted on UI state. Two specific errors were caught by external ChatGPT review on 2026-05-20:

1. The summary claimed "no friction surface exists on the dashboard yet" — false. A live `/operations` route exists in `invegent-dashboard` and has done since cc-0014 Stage E.
2. The summary claimed cc-0016 was "gated on Wave 7" — overstated. The cc-0016 brief itself states cc-0016 is parallel-executable with cc-0015.

A third issue surfaced in the same review: documented friction counts in `docs/00_sync_state.md` and `docs/00_action_list.md` (10 tables, 19 functions, 29 cases, 29 events, 8 case_history rows) were presented as live state without live Supabase verification.

Before authoring the Platform Reconciliation View brief (rank 3 P2 v2.92), before starting cc-0016 Stage A, and before scoping Wave 0f, this brief reconciles what is genuinely live, what each pending brief adds, and what the dashboard `roadmap/page.tsx` PHASES array needs to say.

---

## 1. Existing live `/operations` surface — inventory

Verified by direct file read on `main` branch of `invegent-dashboard` on 2026-05-20.

### 1.1 — Files on main

| File | Size | Verified content |
|---|---|---|
| `app/(dashboard)/operations/page.tsx` | 2,866 B | Server component. Loads recent cases via `friction.fn_recent_cases(50)`. Renders `<CaseRow>` per case. Auth-protected via `(dashboard)` route group middleware. No env gate. Header: "cc-0014 Stage E — Operations / friction-case triage read surface." |
| `app/(dashboard)/operations/case-row.tsx` | 14,289 B | Client component. Expandable inline triage form. Calls `triageCase` server action (which wraps `friction.fn_triage_case` SECURITY DEFINER). On success: collapses row, calls `router.refresh()`. |

### 1.2 — Live read path

`/operations` server component → `createServiceClient()` → `supabase.schema("friction").rpc("fn_recent_cases", { p_limit: 50 })` → returns `FrictionCase[]` → rendered as collapsed rows.

Returned columns per row (mirrors `fn_recent_cases` output): `case_id`, `case_title`, `first_seen_at`, `last_seen_at`, `event_count`, `severity`, `category`, `triage_state`, `quality_flag`, `action_decision`, `next_review_at`, `notes`.

### 1.3 — Live write path

`triageCase` server action → `friction.fn_triage_case(...)` SECURITY DEFINER RPC → returns `TriageCaseResult { ok, error? }`. The client never writes `friction.case` directly. Server action wrapper at `@/actions/triage-case` (referenced by import on line 12 of case-row.tsx).

### 1.4 — Form fields available in the inline triage UI

- **Triage state** (`new` / `acknowledged` / `duplicate` / `ignored`)
- **Quality flag** (yes / no / unset — tri-state)
- **Category** (5 active codes hardcoded in case-row.tsx: `operator_friction`, `pipeline_integrity`, `client_commitment`, `content_quality`, `external_dependency`)
- **Action decision** (6 codes: `act_now`, `track`, `defer_intentionally`, `suppress`, `ignore`, `duplicate`)
- **Next review at** (date input — shown only when `action_decision in (track, defer_intentionally)` per `REVIEW_REQUIRED_DECISIONS`)
- **Capture reason** (6 codes: `missed_without_register`, `would_have_deferred`, `would_have_rediscovered`, `centralized_context`, `routine_log`, `other`)
- **Capture reason note** (textarea — required when capture reason is one of the three "incremental" codes per `INCREMENTAL_CAPTURE_REASONS`)
- **Suppression reason** (textarea — required when `action_decision = suppress`)
- **Notes** (textarea — always optional)

### 1.5 — UI affordances present

- Collapsed row shows: severity badge, case title, category, relative time since last_seen_at, event count (×N), triage state badge.
- Expanded row shows inline form with conditional fields described above.
- Save button + Cancel button. Inline error display on validation failure.

### 1.6 — Capture surface (FAB)

Per `docs/00_action_list.md` v2.92: "Production FAB live on dashboard.invegent.com". Env-gated by `DASHBOARD_FRICTION_FAB_ENABLED=true`. Calls `friction.fn_emit_manual_event` SECURITY DEFINER RPC. **Not opened in this brief's verification pass — relying on documented state. Confirm path on next session if needed.**

### 1.7 — Known omissions (what is NOT in the live `/operations`)

These are explicit gaps relative to what cc-0015 + cc-0016 would add:

- **No filter bar.** All 50 most-recent cases shown, no category/triage_state/source filtering at the URL or UI level.
- **No saved views.** No "Dashboard pool", "Reconciliation pool", "Pipeline pool" presets.
- **No batch select / batch resolve.** Each case triaged individually.
- **No pool count widget on the status strip.**
- **No pool session tracking.** No `friction.pool_session` table exists.
- **No `dashboard_ui` category.** Dashboard-UI friction is currently filed under `operator_friction`.
- **No inline help text** on dropdown options beyond minimal one-line hints on Quality flag / Next review / Suppression reason. No per-option descriptions. No FrictionFieldHelp component or source-of-truth help-copy dict.
- **No `incremental` action_decision option** in the UI dropdown (the brief cc-0015 Section 8.6 references this as a 7th option; case-row.tsx currently exposes 6).
- **No attachments / evidence display.** No thumbnails, no lightbox.
- **No source badges** on rows (where the event was emitted from: health_check / manual / reconciliation / etc).
- **No case_history timeline** visible in the expanded row.
- **No pool dashboard widget** anywhere on the dashboard.

The above are not bugs in the live surface — they are the explicit scope of cc-0015 + cc-0016 + future work. They are listed so reviewers can see at a glance what each pending brief adds.

---

## 2. cc-0015 friction-pool-view delta

Verified by direct read of `docs/briefs/cc-0015-friction-pool-view.md` on 2026-05-20.

### 2.1 — Scope summary

Authored 2026-05-16 by chat-side Claude with PK approval (session v2.76). Status: AUTHORED, PENDING_EXECUTION. Strategic anchor: "Operationalises the register as a pool consumed in concentrated sessions, not a queue triaged one-at-a-time."

### 2.2 — What cc-0015 adds beyond live `/operations`

Stage-by-stage, scoped only to what is missing today:

| Stage | Adds beyond current `/operations` |
|---|---|
| **A — Schema additions** | New `dashboard_ui` category row in `friction.category`. New `friction.pool_session` table tracking when a pool review session happens. |
| **B — Pool view UI** | Filter bar (category / triage_state / source multi-selects). Saved views dropdown (5 pools: Dashboard / Reconciliation / Pipeline / All Track / All New). Source badges on case rows. URL-params-driven for bookmarkability. Extends `fn_recent_cases` with `p_categories text[]`, `p_triage_states text[]`, `p_sources text[]`, `p_sort_by text`. |
| **C — Batch resolution** | Checkbox column on case rows. Sticky batch action bar appearing when ≥1 selected. Per-case loop calling existing `fn_triage_case` once per case (no new backend function). Confirmation modal. Partial-failure tolerance. |
| **D — Pool dashboard widget** | New `friction.fn_pool_counts()` RPC returning `(pool_label, case_count, oldest_first_seen_at)`. Status-strip element showing live counts per pool, clickable to filtered view. |
| **E — Pool session tracking** | Two new SECURITY DEFINER RPCs: `fn_start_pool_session`, `fn_end_pool_session`. UI buttons on pool views. Session banner during active session. Writes to `friction.pool_session` (Stage A table). |
| **F — Operator surface copy** | New `app/lib/friction-help-copy.ts` single source of truth. New `FrictionFieldHelp` component imported by both FAB form and triage form. Per-option help text for every dropdown. Adds inline help describing what `severity`, `category`, `quality_flag`, `capture_reason`, `capture_reason_note`, `action_decision`, `next_review_at`, and pool sessions actually mean. Likely adds `incremental` as a 7th `action_decision` option (per brief §8.6 dropdown enumeration). |
| **G — Process doc** | New file at `docs/process/ICE-PROC-002-pooled-resolution.md`. Codifies weekly pool cadence (Fri 0900 Sydney), triage defaults, suppression discipline, anti-patterns. Doc-only, no code. |

### 2.3 — Estimated effort per cc-0015 brief

Stage A: ~1.5h. Stage B: ~3h. Stage C: ~2h. Stage D: ~1.25h. Stage E: ~1.75h. Stage F: ~3-4h. Stage G: ~1.5-2h. **Total ~12-15h across ~3 sessions.**

### 2.4 — Gate status

Per v2.92 action_list: "DRAFTED commit `9a5dc155`. Wave 0e gate cleared v2.90; still gated on 1-week observation window." Gate 11 (1-week observation 2026-05-19 → 2026-05-26) is Day 1 of 7 at v2.92. Earliest start: 2026-05-26.

---

## 3. cc-0016 friction-capture-evidence delta

Verified by direct read of `docs/briefs/cc-0016-friction-capture-evidence.md` on 2026-05-20.

### 3.1 — Sequencing — corrected statement

**cc-0016 is parallel-executable with cc-0015. It is NOT technically gated on Wave 7.**

The brief itself states this twice:

- Header: "Depends on: cc-0014 complete + Day-19 verdict resolved. Does not depend on cc-0015 (parallel-executable)."
- Footer: "Parallel-executable with cc-0015 — does not depend on it."

The "Wave 7 → Wave 8" sequencing in `docs/00_action_list.md` is a current process gate (Gate 11 1-week observation window applies to both), not an inherent technical dependency. The action_list framing of cc-0016 as gated on cc-0015 was inaccurate when written and remains so.

This brief corrects the record. Sequencing of cc-0015 and cc-0016 is a PK call, not a brief constraint.

### 3.2 — Scope summary

Authored 2026-05-16 by chat-side Claude with PK approval (session v2.76). Status: AUTHORED, PENDING_EXECUTION. Strategic anchor: "Addresses the 'words are a lossy codec for visual friction' gap exposed in v2.76 first-week capture pattern."

### 3.3 — What cc-0016 adds beyond live `/operations` + FAB

| Stage | Adds beyond current state |
|---|---|
| **A — Storage bucket + schema column** | New Supabase Storage bucket `friction-evidence` (private, signed-URL only, 5MB per file, MIME-allow-list of jpeg/png/webp). New `friction.event.attachments` jsonb column with CHECK constraints (`jsonb_typeof = 'array'` + `jsonb_array_length <= 3`). RLS policies on `storage.objects` scoped to bucket. New helper view `friction.case_with_attachment_count`. |
| **B — FAB upload UX** | Drag-and-drop / paste / file-picker upload zone in FAB form. Client-side validation (MIME + size + count). Thumbnail strip in form with remove button per attachment. Client-side UUID generation for event_id so storage path can be `{event_id}/{filename}` without rename. New components: `FrictionAttachmentPicker.tsx` + extension of `FrictionFAB.tsx`. |
| **C — Extended emit function** | Extends `friction.fn_emit_manual_event` signature with `p_event_id uuid DEFAULT NULL` and `p_attachments jsonb DEFAULT '[]'::jsonb`. Backward-compatible with cc-0014 6-arg callers (default parameters). Validates attachment structure server-side. |
| **D — Attachment display** | Adds `attachments_summary` to `fn_recent_cases` return shape. New components: `AttachmentThumbnail.tsx` (fetches signed URL on mount, caches client-side), `AttachmentLightbox.tsx` (fullscreen modal, keyboard nav). Thumbnail strip renders in `CaseRow.tsx` when count > 0. |
| **E — Lifecycle / cleanup** | New SECURITY DEFINER RPC `friction.fn_cleanup_old_attachments()`. Deletes attachments older than 18 months from both storage and `friction.event.attachments`. New pg_cron job `friction-attachment-cleanup-weekly` running Sunday 02:30 UTC. |

### 3.4 — D-01 requirement before Stage A

**Stage A introduces DDL on `friction.event` + a new Supabase Storage bucket with RLS. A D-01 ChatGPT cross-review fire is mandatory before Stage A apply per ICE-PROC-001 patch severity framework.** Subsequent stages may bundle D-01 fires depending on what is actually being changed at apply time.

The brief itself flags this at §9 ("Fire one D-01 before Stage A") with 7 specific framing questions.

### 3.5 — Estimated effort per cc-0016 brief

Stage A: ~1h. Stage B: ~3-4h. Stage C: ~1.5h. Stage D: ~2-3h. Stage E: ~1.5h. **Total ~8-10h across ~2 sessions.**

### 3.6 — Gate status

Per v2.92 action_list: "DRAFTED commit `f35f8ea4`. Wave 0e gate cleared v2.90; still gated on Wave 7." Per this brief: the "gated on Wave 7" framing is a process choice, not a technical dependency. PK decides whether to break the convention or honour it.

---

## 4. roadmap/page.tsx PHASES — correction items

Verified by direct read of `app/(dashboard)/roadmap/page.tsx` on `invegent-dashboard` main on 2026-05-20.

### 4.1 — Stale claims to correct

The roadmap file currently carries:

- `LAST_UPDATED = "Updated 2026-05-08 Sydney · mid-v2.53..."` — 12 days stale at time of this brief.
- An inline note in the same string: "PHASES array reconciliation: 9th deferral per v2.53 carry". Current action_list state at v2.92: **45th consecutive deferral.** A 36-deferral gap.

### 4.2 — Friction register absent from the roadmap

The PHASES array contains **zero rows for the friction register**. Search for any of these strings on `roadmap/page.tsx` returns no matches:

- "friction"
- "cc-0014" (the experiment brief / Stage E that built `/operations`)
- "cc-0017" (Waves 0, 0d, 0e — base schema, mutation functions, case_history)
- "D-IOL-001" (the 2026-05-18 reframe from experiment to standing infrastructure)

The roadmap is silent on the existence of the entire friction register schema (`friction.case`, `friction.event`, `friction.case_history`, 10 tables total per documented state), the `/operations` route, the FAB capture surface, and the Cowork `nightly-health-check-v1` signal-production layer that dual-writes findings into `friction.event`.

### 4.3 — Required corrections (when the PHASES reconciliation is actually executed — out of scope for this brief, listed for the eventual session)

1. **Remove or correct the "9th deferral" string.** Replace with the current count and a pointer to `docs/00_action_list.md` as the source of truth for deferral count.
2. **Add a `Friction register infrastructure` group** to the PHASES array. Status: active. Cover at minimum: cc-0014 (archived as timing artefact, NOT a revert), cc-0017a/b/c/d/e (Wave 0/0d/0e applied), D-IOL-001 reframe, `/operations` route live, FAB capture live, Cowork health-check v3.0 dual-write live.
3. **Distinguish live friction infrastructure from deferred dashboard polish.** Polish items (cc-0015 pool view / cc-0016 evidence / case_history timeline) belong in a separate group from infrastructure that is already running.
4. **Convert the "45 deferrals" into an explicit remediation item** in the PHASES array with a stop-condition. Recommendation: a single PHASES reconciliation pass produces an explicit "current as of v2.NN" baseline, and from that point the deferral counter resets to zero. The 45-deferral count is itself signal that ad-hoc per-session updates are not the right cadence; a dedicated reconciliation session per friction-register milestone is.
5. **Stop treating cc-0014 archival as a revert.** D-IOL-001 (2026-05-18) reframed cc-0014 from "experiment" to "standing operational infrastructure". The cc-0014 Stage E dashboard code at `app/(dashboard)/operations/` remained on main and is what serves `/operations` today. Any roadmap entry that implies cc-0014 was reverted or removed is wrong.

### 4.4 — Out of scope for this brief

This brief does NOT modify `roadmap/page.tsx`. It documents what the eventual reconciliation must address. The actual edit is a separate session of work, executed by CC against `invegent-dashboard` repo, with PK approval on the resulting PHASES diff.

---

## 5. Verification appendix

Per directive D-FR-RECON-001, this section is mandatory.

### 5.1 — Files opened and read in this session

Direct GitHub MCP `get_file_contents` reads on 2026-05-20:

| Repo | Path | Ref | SHA | Size | Used for |
|---|---|---|---|---|---|
| Invegent-content-engine | docs/00_sync_state.md | main | 23612def | 20,688 B | v2.92 state baseline |
| Invegent-content-engine | docs/00_action_list.md | main | 721099cb | 35,426 B | active queue, gate status |
| Invegent-content-engine | docs/briefs/cc-0015-friction-pool-view.md | main | 1c85ce86 | 20,302 B | §2 delta |
| Invegent-content-engine | docs/briefs/cc-0016-friction-capture-evidence.md | main | e628acbc | 24,760 B | §3 delta, parallel-executable claim |
| invegent-dashboard | app/(dashboard)/operations/page.tsx | main | d5bfcf82 | 2,866 B | §1.1, §1.2 |
| invegent-dashboard | app/(dashboard)/operations/case-row.tsx | main | 56e212e3 | 14,289 B | §1.3, §1.4, §1.5, §1.7 |
| invegent-dashboard | app/(dashboard)/roadmap/page.tsx | main | 8dc75b8a | 44,247 B | §4 |

### 5.2 — Directory listings used

- `invegent-dashboard:app/(dashboard)/operations/` — confirms 2-file layout: page.tsx + case-row.tsx, no other files.
- `Invegent-content-engine:docs/briefs/` — confirms cc-0015 + cc-0016 briefs exist on main.

### 5.3 — Claims verified directly from repo

| Claim | Verified by |
|---|---|
| `/operations` route exists | Direct file read of page.tsx on main |
| `/operations` calls `friction.fn_recent_cases(50)` | Direct read of page.tsx line: `supabase.schema("friction").rpc("fn_recent_cases", { p_limit: RECENT_LIMIT })` with `RECENT_LIMIT = 50` |
| Triage UI exists with the documented form fields | Direct read of case-row.tsx (CATEGORIES, TRIAGE_STATE_OPTIONS, ACTION_DECISION_OPTIONS, CAPTURE_REASON_OPTIONS, INCREMENTAL_CAPTURE_REASONS, REVIEW_REQUIRED_DECISIONS arrays) |
| Triage writes via `friction.fn_triage_case` SECURITY DEFINER | Direct read of case-row.tsx import: `triageCase` from `@/actions/triage-case`; case-row never writes `friction.case` directly |
| cc-0016 is parallel-executable with cc-0015 | Direct read of cc-0016 brief header and footer |
| roadmap/page.tsx claims "9th deferral" | Direct read of LAST_UPDATED string |
| roadmap PHASES has zero rows referencing the friction register | Direct read of entire file, no matches for "friction", "cc-0014", "cc-0017", "D-IOL-001" |
| roadmap LAST_UPDATED = 2026-05-08 | Direct read of LAST_UPDATED string |

### 5.4 — Claims sourced from docs only (NOT live-verified in this brief)

These claims come from `docs/00_sync_state.md` and `docs/00_action_list.md` and were NOT independently verified against the live Supabase project `mbkmaxqhsohbtwsqolns` in this session:

| Claim | Source doc |
|---|---|
| friction.* schema has 10 tables | sync_state v2.92 carry block |
| friction.* schema has 19 functions | action_list v2.92 |
| 29 cases + 29 events in friction.case + friction.event | action_list v2.92 |
| 8 case_history rows backfilled | action_list v2.92 |
| `friction.fn_triage_case` is 11-arg only (legacy 10-arg dropped) | action_list v2.92, sync_state v2.90 |
| `friction.fn_emit_health_check_findings(text,text,jsonb)→jsonb` SECURITY DEFINER owner=postgres exists | sync_state v2.92 V-C3 close |
| 5 health_check events on 2026-05-17 reconcile 1:1 with markdown finding_ids | sync_state v2.92 V-C3 close |
| FAB capture surface live on dashboard.invegent.com | action_list v2.92 standing carry |
| 22 outstanding close-the-loop UPDATEs on m.chatgpt_review | action_list v2.92 |

These are not assumed false. They are flagged as undocumented-by-live-probe in this session. Any reader of this brief should treat them as documented state, not verified live state.

### 5.5 — Cron 85 status — marked unverified

Per v2.92: "First post-cc-0017e cron 85 fire still pending. Next scheduled 2026-05-19 17:30 UTC ≈ 2026-05-20 03:30 AEST."

This brief does NOT confirm whether the natural fire landed. Confirmation requires read-only SQL access to `cron.job_run_details` on the live Supabase project, which is out of scope for this read-only-via-GitHub session. **Status: UNVERIFIED in this brief. Becomes verifiable in the next session that runs the 9-check diagnostic.**

### 5.6 — Tooling boundary respected

- 0 Supabase mutations.
- 0 `apply_migration` calls.
- 0 `execute_sql` calls (read or write).
- 0 EF deploys.
- 0 production code changes to `invegent-dashboard`, `invegent-portal`, or `Invegent-content-engine` source.
- 1 documentation commit (this brief, to `docs/briefs/d-fr-recon-001-friction-surface-reconciliation.md`).
- 0 D-01 fires (none required — documentation only).

---

## 6. Three drift corrections — explicit summary

The acceptance criteria of this brief require three drift corrections be made explicit. They are:

### 6.1 — `/operations` already exists

Status: live on main. Reached via `/operations` route in `invegent-dashboard`. Built under cc-0014 Stage E. Was NOT removed when cc-0014 was archived as timing artefact at D-IOL-001 — archival was a framing change (experiment → standing infrastructure), not a code revert.

Any summary that says "no friction surface exists on the dashboard yet" is wrong.

The correct framing is: "The dashboard has a basic cc-0014 Stage E friction capture/triage surface at `/operations`. It does not yet have the pooled-resolution, batch-resolve, evidence-attachment, case-detail-with-history-timeline, or PRV-grade surfaces. Those are what cc-0015, cc-0016, and future work add."

### 6.2 — cc-0016 is parallel-executable with cc-0015

Verified by direct read of `docs/briefs/cc-0016-friction-capture-evidence.md` header and footer. The brief states explicitly that cc-0016 does not depend on cc-0015. Any summary or action_list framing that gates cc-0016 on cc-0015 is a process choice, not a technical constraint.

### 6.3 — Documented friction counts are not live-verified counts

`docs/00_sync_state.md` and `docs/00_action_list.md` carry counts (10 tables / 19 functions / 29 cases / 29 events / 8 case_history rows) that represent documented state at the end of v2.92. They are not live-probed in this brief. Any consumer of those counts should treat them as the most recent documented value, not as a fresh live query result. Live verification requires Supabase read access in a session where that probe is in scope.

---

## 7. Next-work recommendation

After PK accepts this corrected baseline, the directive's acceptance criteria require a clear next-work recommendation across four options.

### A. Retry cron 85 read-only verification

**Recommendation: do this first, opportunistically.** It is short (~30 min), pure read-only, has been pending since the cc-0017e apply at v2.90, and closes a P1 rank 1 carry that has been sitting open across three sessions (v2.90, v2.91, v2.92). The natural cron 85 fire was scheduled 2026-05-19 17:30 UTC ≈ 2026-05-20 03:30 AEST. If the fire has landed and the 9-check diagnostic passes, that's one open item closed cleanly. If it has not landed or has failed, that surfaces a real issue worth investigating before any new build work.

### B. Decide whether to start cc-0016 Stage A

**Recommendation: PK call. Both options defensible.**

- **Start cc-0016 Stage A now (parallel to Gate 11 observation window):** Honours the brief's parallel-executable framing. Concrete production progress while cc-0015 is gated. Requires D-01 fire before DDL/storage/RLS work (Stage A touches `friction.event` + Storage bucket + RLS policies). Estimated ~1h of build + ~15-30 min of D-01 cycle.
- **Hold cc-0016 until cc-0015 is at least at Stage A or B:** Honours the conventional "Wave N+1 follows Wave N" sequencing baseline that has been the discipline for cc-0017a → cc-0017e. Loses time but preserves an established pattern. Justifiable if the pattern itself is valued.

There is no technical reason to choose one over the other. It is a discipline-vs-throughput trade-off.

### C. Scope Wave 0f

**Recommendation: do this opportunistically during the Gate 11 observation window.** Wave 0f is brief-authoring only, no production touch. Candidates already identified per v2.91 lessons-metadata changelog:

- Items B/E/F/G deferred from cc-0017e v1.0 brief authoring
- `purge_test_case` helper case_history coverage extension (L-v2.90-d)

Authoring while cc-0015 is gated converts dead time into ready inventory for the next post-window apply window. Estimated effort: ~2-3h chat to produce a Wave 0f brief, optionally splitting into sub-files per the cc-0017a-e pattern.

### D. Defer PRV design until the corrected baseline is accepted

**Recommendation: defer until corrected baseline lands.** The Platform Reconciliation View brief at rank 3 P2 v2.92 was flagged as the "next practical planning item per PK directive". The external review on 2026-05-20 raised a valid concern: designing PRV on top of a partially-wrong baseline of what `/operations` already provides risks duplicating affordances that exist, or designing around gaps that have actually already been filled.

PRV design should begin only after:

1. PK has accepted this reconciliation brief, AND
2. cc-0015 (which adds the operator-grade view machinery PRV would likely consume or extend) is at least scoped against the corrected baseline, AND
3. cc-0016's parallel-executable status is acknowledged in the action_list (so PRV does not assume sequential delivery of evidence display when it may actually arrive earlier).

This is not an indefinite hold. It is a defer-until-baseline-accepted. The brief itself can be authored in 1-2 sessions once those three conditions are met.

---

## 8. Open questions for PK

These are PK-decision items raised by this brief. Listed for clarity, not for execution in this session.

1. **Should the action_list v2.93 close carry an explicit correction of the cc-0016-gated-on-Wave-7 framing?** If yes, this brief is the source; the correction is a one-line update to the relevant Active table row.
2. **Should `roadmap/page.tsx` reconciliation be assigned a calendar slot, or kept on the deferral counter?** §4.4 recommends a dedicated session per milestone rather than per-session updates. PK has standing authority to schedule this.
3. **Is the established Wave N → Wave N+1 sequencing discipline more valuable than throughput gained by running cc-0016 parallel to cc-0015?** §7.B presents both options. PK decides.
4. **Does this brief itself count toward the deferral counter on `roadmap/page.tsx`?** Recommendation: no. This is a reconciliation brief, not a roadmap-touching change. The deferral counter measures untouched-PHASES sessions.
5. **Should cron 85 verification (§7.A) be the first item in the next session, or held until PK directs?** No production risk either way.

---

## 9. Honest limitations

- This brief reconciles documented baseline only. It does not validate live Supabase state.
- The FAB capture surface (§1.6) is treated as live per action_list documentation; no file was opened to confirm exact behaviour. If FAB behaviour diverges from what cc-0016 Stage B assumes, that would be a Stage B authoring defect to catch at D-01 time.
- No claim is made about portal.invegent.com or invegent.com — both are outside friction-register scope.
- No claim is made about Wave 0f scope until it is actually authored.
- This brief assumes the userMemories block in chat is current at the time of writing. If the memory block diverges from `docs/00_sync_state.md` at next session start, sync_state is authoritative.

---

## 10. Acceptance

Acceptance criteria from directive D-FR-RECON-001:

- [x] Brief exists in `docs/briefs/` with a cc/D-style name consistent with repo conventions — `d-fr-recon-001-friction-surface-reconciliation.md`.
- [x] Corrects the three known drift points — §6.1, §6.2, §6.3.
- [x] Inventory of existing live `/operations` surface — §1.
- [x] cc-0015 delta — §2.
- [x] cc-0016 delta with parallel-executable status — §3.1.
- [x] cc-0016 Stage A D-01 requirement explicit — §3.4.
- [x] roadmap/page.tsx PHASES correction items — §4.
- [x] Verification appendix — §5.
- [x] Live counts marked unverified — §5.4.
- [x] Cron 85 marked unverified — §5.5.
- [x] Next-work recommendation across A/B/C/D — §7.

---

*Brief D-FR-RECON-001 v1.0. Authored 2026-05-20 Sydney. Status: AUTHORED, READ-SIDE ONLY. No production mutation. No D-01 required for this brief (documentation-only). PK acceptance gates next moves on §7.*
