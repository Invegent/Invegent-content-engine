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
| 2026-05-20 | v2.97-cc0016-stage-a-applied | **cc-0016 Stage A friction-capture-evidence APPLIED.** Migration `cc_0016_a_attachments_schema_and_bucket` applied via `apply_migration` MCP after D-01 third-fire approval at `m.chatgpt_review` id `9eb35144-5c70-4cc1-8086-e9ec4525bca5` (verdict=agree, action_taken=proceed). Objects created: private `friction-evidence` bucket (5MB, 3 MIME types — no GIF) + 3 storage.objects RLS policies (bucket_id-scoped only; no path segmentation) + `friction.event.attachments jsonb NOT NULL DEFAULT '[]'` + 2 CHECK constraints (`friction_event_attachments_is_array`, `friction_event_attachments_max_3`) + `idx_friction_event_has_attachments` partial index on `(case_id) WHERE jsonb_array_length(attachments) > 0` + `friction.case_with_attachment_count` view + SELECT grant on view to `authenticated` + `service_role`. **V-checks: V-A1/V-A2/V-A3/V-A4/V-A4b/V-A6 PASS; V-A5 DEFERRED to Stage B** (manual upload round-trip). 34 existing `friction.event` rows received `attachments='[]'` instantaneously via DEFAULT; 29 `friction.case` rows visible in attachment-count view (all `attachment_count=0`). **Close-the-loop on 3 D-01 review rows:** `6f2b8b1a` (partial/high/escalated → resolved), `f573e684` (partial/medium/escalated → resolved), `9eb35144` (agree/proceed/completed → annotated). All 3 marked `resolved_by='cc-0016-stage-a-apply-v2.97'`. Outstanding count 28 → **26** (–2 escalated). **cc-0016 Stage A APPLIED/CLOSED.** Next ranked action: **cc-0016 Stage B — attachment RPC/application contract** (must enforce operator authorization before Stage B can close). Cowork lifecycle gating WARN UNCHANGED (rank 1 open). cc-0015 / PRV / mobile-viewport verification UNCHANGED. 0 dashboard repo edits / 0 new migrations beyond Stage A / 0 lifecycle cleanup / 0 storage objects created or deleted / 0 cron / 0 EF deploy / 0 Stage B/C/D/E started. L-v2.85-e 12th consecutive. L-v2.83-a 16+ STRONG. **L-v2.97-a NEW candidate**: first private storage bucket pattern shipped — track production exercise across Stage B/C/D for one calendar week before treating pattern as repeatable for PRV evidence or other future projects. **L-v2.97-b NEW (minor)**: Postgres `SUM(integer)` returns `bigint` — note for cc-0016 v1.0.1 doc patch if authored. **L46 + L48 re-exercised v2.97** (D-01 corrected_action chain culminating in approved review id + atomic migration apply). Files changed: 3 (session file + sync_state + action_list, atomic single commit). | `docs/runtime/sessions/2026-05-20-v2.97-cc0016-stage-a-applied.md` |
| 2026-05-20 | v2.96-dashboard-slices-4a-4b-recorded | **Dashboard slices 4A–4B recorded as completed visual/operator work.** Slice 4A `dashboard-status-strip-copy-links-v1` at `cd02402` — VISUAL PASS (StatusStrip copy clarified; critical/posts/drafts clusters linked; stuck-jobs link implemented but only visible when precedence permits). Slice 4B `dashboard-drafts-count-clarity-v1` at `f5a980f` — VISUAL PASS (Overview "Drafts to review" shows "Showing N of M drafts"; CCB observed `Showing 10 of 53 drafts`; M matched StatusStrip `53 drafts to review`). Count mismatch root cause confirmed: **copy/semantics, not cache/backend defect**. **Top alert bar count reconciliation CLOSED v2.96 for UI-copy/linkification scope.** Deeper backend/shared-metrics refactor remains deferred unless separately directed (not actively ranked). Cowork lifecycle gating WARN UNCHANGED (rank 1 open). cc-0015 / cc-0016 / PRV / mobile-viewport verification UNCHANGED (open). 0 production mutations / 0 Supabase mutations / 0 deploys / 0 dashboard edits this session / 0 D-01 fires / 0 application code edits / 0 memory edits / 0 backend metric refactor started. L-v2.85-e 11th consecutive. L-v2.83-a 15+ STRONG. Files changed: 3 (session file + sync_state + action_list, atomic single commit). | `docs/runtime/sessions/2026-05-20-v2.96-dashboard-slices-4a-4b-recorded.md` |
| 2026-05-20 | v2.95-dashboard-slices-1-3-recorded | **Dashboard slices 1–3 recorded as completed visual/operator work.** Slice 1 `dashboard-nav-and-ops-copy-v1` at `af60953`; slice 2 `dashboard-operations-usability-v1` + remediation at `de4501b` + `37008e5`; slice 3 `dashboard-roadmap-phases-correction-v1` at `991a92b`. "Stop Claude" overlay confirmed external/non-app. Mobile/narrow Roadmap unverified (browser resize override) — P3 carry. **Dashboard PHASES 46-streak deferral BROKEN/CLOSED by Slice 3.** | `docs/runtime/sessions/2026-05-20-v2.95-dashboard-slices-1-3-recorded.md` |
| 2026-05-20 | v2.94-cowork-brief-lifecycle-reset-and-convention | **Cowork brief lifecycle gating WARN REFRAMED + nightly-health-check-v1 ready reset + recurring-brief lifecycle convention patched.** Ready reset complete (queue.md + brief frontmatter `status: ready`); convention patched at `docs/runtime/automation_v1_spec.md` Status flow §. WARN explicitly NOT closed. | `docs/runtime/sessions/2026-05-20-v2.94-cowork-brief-lifecycle-reset-and-convention.md` |
| 2026-05-20 | v2.93-cron85-natural-fire-closed-9check-retired | **Reconciliation daily cadence diagnostic CLOSED-PASS** on first post-cc-0017e cron 85 natural fire. "9-check diagnostic" retired as undefined legacy carry. D-FR-RECON-001 v1.0 brief authored at `fc726e3c`. | `docs/runtime/sessions/2026-05-20-v2.93-cron85-natural-fire-closed-9check-retired.md` |
| 2026-05-19 | v2.92-vc3-signal-production-closed | **Health_check V-C3 + signal-production diagnostic CLOSED-PASS**. Empirically validated against 2026-05-17 v3.0 run. NEW Cowork brief lifecycle gating WARN spawned. | `docs/runtime/sessions/2026-05-19-vc3-signal-production-closed.md` |
| 2026-05-19 | v2.91-cc0017e-v1.1-8item-doc-patch | **cc-0017e v1.1 8-item backlog doc patch CLOSED** at `be4e6772`. | `docs/runtime/sessions/2026-05-19-cc0017e-v1.1-8item-doc-patch.md` |
| 2026-05-19 | v2.90-cc0017e-applied | cc-0017e Wave 0e APPLIED-WITH-VCHECK-CORRECTION. 8-item v1.1 doc patch backlog — CLOSED at v2.91. | `docs/runtime/sessions/2026-05-19-cc0017e-applied.md` |
| 2026-05-19 | v2.89-cc0017e-v1.1-doc-patch | cc-0017e v1.1 doc patch CLOSED at `587ee4ac`. | `docs/runtime/sessions/2026-05-19-cc0017e-v1.1-doc-patch.md` |
| 2026-05-19 | v2.88-cc0017e-v1.0-authored | cc-0017e Wave 0e v1.0 brief AUTHORED. | `docs/runtime/sessions/2026-05-19-cc0017e-v1.0-authored.md` |
| 2026-05-19 | v2.87-cc0017d-v1.1-doc-patch | cc-0017d v1.1 doc-only patch CLOSED at `f0367405`. | `docs/runtime/sessions/2026-05-19-cc0017d-v1.1-doc-patch.md` |
| 2026-05-19 | v2.86-cc0017d-applied-with-vcheck-correction | cc-0017d Wave 0d APPLIED-WITH-VCHECK-CORRECTION. | `docs/runtime/sessions/2026-05-19-cc0017d-applied-with-vcheck-correction.md` |
| 2026-05-19 | v2.85-cc0017c-applied-with-vcheck-correction | cc-0017c APPLIED. Friction.* Wave 0 COMPLETE. | `docs/runtime/sessions/2026-05-19-v2.85-cc0017c-applied-with-vcheck-correction.md` |
| 2026-05-19 | v2.84-cc0017c-v1.0-v1.1-d01-deferred | cc-0017c v1.0+v1.1 BRIEF AUTHORED + 2× D-01 + APPLY DEFERRED. | `docs/runtime/sessions/2026-05-19-v2.84-cc0017c-v1.0-v1.1-d01-deferred.md` |
| 2026-05-18 | v2.83-cc0017b-v1.1-close-cc0017c-open | cc-0017b v1.1 doc-only patch CLOSED + cc-0017c authoring open. | `docs/runtime/sessions/2026-05-18-v2.83-cc0017b-v1.1-close-cc0017c-open.md` |
| 2026-05-18 | cc-0017b-applied | cc-0017b Wave 0b APPLIED-WITH-CORRECTIVE-MIGRATION + 27/27 V-CHECKS PASS. | `docs/runtime/sessions/2026-05-18-cc-0017b-applied.md` |
| 2026-05-18 | cc-0017a-applied-l41-l47 | cc-0017a Wave 0a APPLIED + 20/20 V-CHECKS PASS. | `docs/runtime/sessions/2026-05-18-cc-0017a-applied-l41-l47.md` |
| 2026-05-18 | cc-0017a-v1.1-and-d01-fire | cc-0017a v1.0+v1.1 PATCH + D-01 PARTIAL TYPE-C + PK PATH B. | `docs/runtime/sessions/2026-05-18-cc-0017a-v1.1-and-d01-fire.md` |
| 2026-05-18 | v2.79-friction-plan-signed | FRICTION REGISTER CONSOLIDATION PLAN v1 SIGNED. | `docs/runtime/sessions/2026-05-18-v2.79-friction-plan-signed.md` |
| 2026-05-18 | v2.78-friction-register-consolidation-planning | FRICTION REGISTER CONSOLIDATION PLAN v1 LOCKED. | `docs/runtime/sessions/2026-05-18-v2.78-friction-register-consolidation-planning.md` |
| 2026-05-18 | cc-0014-archived-and-recon-daily | cc-0014 CLOSED-ARCHIVED + RECON CRON DAILY. | `docs/runtime/sessions/2026-05-18-cc-0014-archived-and-recon-daily.md` |
| 2026-05-16 | v2.76-stage-e-close-and-window-open | cc-0014 FULLY CLOSED + 14-DAY WINDOW + FAB LIVE + cc-0015/0016 DRAFTED. | `docs/runtime/sessions/2026-05-16-v2.76-stage-e-close-and-window-open.md` |

*(Older sessions truncated for brevity.)*

**Pre-2026-05-03 history**: frozen at `docs/runtime/archive/sync_state-pre-2026-05-03.md`.

---

## 🟢 Most recent session — inline summary

### 2026-05-20 Sydney — v2.97: cc-0016 Stage A friction-capture-evidence APPLIED

**Outcome:** cc-0016 Stage A applied successfully after D-01 third-fire approval. Storage + schema infrastructure is now live for future evidence attachments. Stage B/C/D/E remain unstarted. Dashboard repo untouched. 6 of 7 V-checks PASS at apply time; V-A5 (authenticated upload round-trip) explicitly deferred to Stage B per directive.

**Migration applied:**

- Name: `cc_0016_a_attachments_schema_and_bucket`
- MCP call: `apply_migration` → `{"success": true}`
- D-01 third-fire approval at `m.chatgpt_review` id **`9eb35144-5c70-4cc1-8086-e9ec4525bca5`** (`verdict=agree, action_taken=proceed, risk_level=medium, requires_pk_escalation=false, status=completed`)
- PK approval phrase present in directive prompt

**Objects created (10 mutations, single atomic call):**

| Type | Name | Notes |
|---|---|---|
| Storage bucket | `friction-evidence` | private, 5 MB per-file, MIME types `image/jpeg|png|webp` (no GIF) |
| RLS policy | `friction_evidence_authenticated_read` | `FOR SELECT TO authenticated USING (bucket_id='friction-evidence')` |
| RLS policy | `friction_evidence_authenticated_insert` | `FOR INSERT TO authenticated WITH CHECK (bucket_id='friction-evidence')` |
| RLS policy | `friction_evidence_authenticated_delete` | `FOR DELETE TO authenticated USING (bucket_id='friction-evidence')` |
| Column | `friction.event.attachments` | `jsonb NOT NULL DEFAULT '[]'::jsonb` |
| CHECK constraint | `friction_event_attachments_is_array` | `jsonb_typeof(attachments) = 'array'` |
| CHECK constraint | `friction_event_attachments_max_3` | `jsonb_array_length(attachments) <= 3` |
| Partial index | `idx_friction_event_has_attachments` | `ON friction.event(case_id) WHERE jsonb_array_length(attachments) > 0` |
| View | `friction.case_with_attachment_count` | `c.*, COALESCE(SUM(jsonb_array_length(e.attachments)), 0) AS attachment_count` |
| Grant | `SELECT ON friction.case_with_attachment_count` | `TO authenticated, service_role` |

**V-check matrix:**

| # | V-check | Result |
|---|---|---|
| V-A1 | Bucket shape (name, public=false, 5 MB, MIME types) | **PASS** — exact match to D-01 scope |
| V-A2 | `attachments` column shape | **PASS** — `jsonb, default '[]'::jsonb, NOT NULL` |
| V-A3 | CHECK constraints reject non-array + >3 items | **PASS** — 2 expected `check_violation` errors; 0 leaked rows |
| V-A4 | anon deny | **PASS** — `SET ROLE anon` returns 0 rows |
| V-A4b | authenticated + service_role scoped read on empty bucket | **PASS** — both return 0; both queries succeed without error |
| V-A5 | authenticated upload + read round-trip | **DEFERRED to Stage B** (manual frontend test) |
| V-A6 | View `friction.case_with_attachment_count` returns expected shape | **PASS** — 29 rows = base case count; all `attachment_count = 0` (bigint per PG's `SUM(integer)` → bigint, satisfies "integer ≥ 0" intent) |

**Existing-row state after apply:**

- `friction.event` row count: 34 (unchanged); all 34 received `attachments = '[]'::jsonb` instantaneously via DEFAULT
- `friction.case` row count: 29 (unchanged); all 29 visible in `friction.case_with_attachment_count` with `attachment_count = 0`

**Close-the-loop on 3 D-01 review rows (per directive):**

| `id` | Created (UTC) | Before status / action_taken | After | Status |
|---|---|---|---|---|
| `6f2b8b1a-888d-41a0-9ab9-1fbbf65bcce8` | 2026-05-20 07:32:25 | `escalated` / `escalate_explicit_flag` | escalation_resolved_at set, `resolved_by='cc-0016-stage-a-apply-v2.97'`, action_taken annotated with corrected_action chain to 9eb35144 | RESOLVED |
| `f573e684-6cbf-4eef-8b32-1d0aeb1c9ff7` | 2026-05-20 07:44:10 | `escalated` / `escalate_explicit_flag` | escalation_resolved_at set, `resolved_by='cc-0016-stage-a-apply-v2.97'`, action_taken annotated with corrected_action chain to 9eb35144 | RESOLVED |
| `9eb35144-5c70-4cc1-8086-e9ec4525bca5` | 2026-05-20 07:49:45 | `completed` / `proceed` | `resolved_by='cc-0016-stage-a-apply-v2.97'`, action_taken annotated with apply outcome + V-check matrix + objects-created summary | COMPLETED (already; annotated) |

Verdict / risk / escalation history preserved on all 3 rows (only close-the-loop resolution fields written).

**Outstanding close-the-loop count: 28 → 26** (the 2 escalated rows transitioned to escalation_resolved). 26 remaining are unrelated to cc-0016 Stage A.

**Items closed v2.97:**

- **cc-0016 Stage A — friction-capture-evidence storage + schema preflight** → **APPLIED/CLOSED**. Backend infrastructure live. Downstream stages (B/C/D/E) remain pending and are the new gating items.

**Items NOT closed v2.97 (per directive):**

- **cc-0016 Stage B** (attachment RPC/application contract) — next ranked action; must enforce operator authorization before Stage B can close.
- **cc-0015 (Wave 7) UI** — gated on Gate 11 observation window closing 2026-05-26; unchanged.
- **Platform Reconciliation View brief authoring** — deferred per D-FR-RECON-001 §7.D; unchanged.
- **Cowork brief lifecycle gating WARN** — rank 1 open; unchanged.
- **Mobile/narrow viewport verification** — P3 carry; unchanged.

**Hard stops respected v2.97:**

- 0 Invegent-dashboard touched
- 0 new migrations beyond the approved Stage A (Stage A itself was the only migration this session)
- 0 storage objects created or deleted
- 0 lifecycle cleanup
- 0 cron created
- 0 EF deployed
- 0 Stage B/C/D/E work started
- 0 closure of cc-0015 / PRV / Cowork WARN
- 0 alteration of reviewer verdict / risk / escalation history (only close-the-loop fields written)

**Sync close mechanics v2.97 (atomic single-commit per L-v2.85-e baseline — 12th consecutive occurrence):**

1. Per-session detail `docs/runtime/sessions/2026-05-20-v2.97-cc0016-stage-a-applied.md`.
2. sync_state + action_list + session file committed in one atomic CCD local-git push.

L-v2.89-a fallback (1+1+1) ready but not invoked.

**Lesson exercise v2.97:**

- **L-v2.85-e** re-applied **12th consecutive occurrence** (v2.86 → v2.97). Promotion-confirmed v2.88 carries forward.
- **L-v2.83-a** re-applied at sync close commit. Cumulative **16+ STRONG**.
- **L46** re-exercised v2.97 (D-01 corrected_action chain culminating in approved review id `9eb35144` after 2 escalated fires).
- **L48** re-exercised v2.97 (single atomic `apply_migration` call covering DDL + storage bucket + RLS policies + view + grants — 10 mutations).
- **L-v2.97-a NEW candidate** (HIGH-SIGNAL): first private storage bucket pattern shipped in this project. Track production exercise across Stage B/C/D for one calendar week before treating pattern as repeatable for PRV evidence or other future projects that need private operator-only buckets.
- **L-v2.97-b NEW candidate** (minor): Postgres `SUM(integer)` returns `bigint`. View `attachment_count` is `bigint` rather than `integer`. Functional equivalence satisfies V-A6 intent; flag for cc-0016 v1.0.1 doc patch if authored.
- **L-v2.85-a / L-v2.86-a / L-v2.88-a / L-v2.89-a / L-v2.90-a-f**: not re-exercised v2.97 (no new corrected_action chains beyond cc-0016).
- **L40 / L41 / L58 / L62**: not exercised v2.97.

**Forward constraints recorded v2.97 (per directive):**

1. **Stage B cannot close until attachment authorization is enforced in the RPC/application layer.** The current `friction_evidence_authenticated_*` RLS policies are bucket-scoped only — any authenticated session can read/insert/delete any object in the bucket. Per-event authorization (operator owns the event, or operator is PK) must live in the attach-evidence RPC or Server Action.
2. **No lifecycle cleanup or destructive deletion until separately approved with dry-run/report.** The 18-month auto-delete behaviour from brief §6 is Stage E and remains explicitly out of scope.
3. **No dashboard evidence UI until backend Stage B contract is ready.** Dashboard repo edits are blocked on Stage B RPC + authorization contract landing first.

**v2.97 honest limitations:**

- V-A5 unverified — authenticated upload + read round-trip is a manual frontend test in Stage B.
- The 3 storage.objects RLS policies are bucket-scoped only, not per-event-scoped. Operator authorization is intentionally pushed to the application layer (Stage B RPC) per the brief's single-operator scope. If the deployment shape ever becomes multi-operator, per-event RLS would need to be added.
- `attachment_count` column type in the view is `bigint`. Downstream consumers should not assume `integer`.
- Outstanding 26 close-the-loop UPDATEs not addressed this session — out of directive scope.
- Stage A produced no evidence rows yet; bucket is empty.
- L-v2.97-a is a candidate, not a baseline — needs Stage B/C/D production exercise before promotion-eligible.

---

### 2026-05-20 Sydney — v2.96 close (brief)

Dashboard slices 4A–4B RECORDED as completed visual/operator work. Slice 4A `dashboard-status-strip-copy-links-v1` at `cd02402` — VISUAL PASS (StatusStrip copy + links). Slice 4B `dashboard-drafts-count-clarity-v1` at `f5a980f` — VISUAL PASS (Overview "Showing N of M drafts"; M=53 matched StatusStrip). Top alert bar count reconciliation CLOSED v2.96 for UI-copy/linkification scope. Backend/shared-metrics refactor deferred (not actively ranked). 0 dashboard edits this session (cross-repo state recording only).

*(Full detail at `docs/runtime/sessions/2026-05-20-v2.96-dashboard-slices-4a-4b-recorded.md`.)*

---

### 2026-05-20 Sydney — v2.96 inline detail (preserved below for context)

### 2026-05-20 Sydney — v2.96: Dashboard slices 4A–4B recorded as completed visual/operator work

**Outcome:** Two Invegent-dashboard slices have shipped + been visually verified since v2.95. Together they close the top alert bar count reconciliation item (formerly dashboard rank D1 v2.95) for the UI-copy/linkification scope. Root cause confirmed as copy/semantics, not cache/backend defect. Deeper backend/shared-metrics refactor remains deferred unless separately directed.

**Slices recorded v2.96:**

| # | Slice | Commit | Status |
|---|---|---|---|
| 4A | `dashboard-status-strip-copy-links-v1` | `cd0240265507035cc93b8fb95927593f7c6b0da1` | VISUAL PASS |
| 4B | `dashboard-drafts-count-clarity-v1` | `f5a980fea3a8411823285501307c2a52b3cf3de0` | VISUAL PASS |

**Observations recorded v2.96:**

1. Slice 4A — StatusStrip copy clarified; critical/posts/drafts clusters linked; stuck-jobs link implemented but only visible when precedence permits.
2. Slice 4B — Overview "Drafts to review" now shows "Showing N of M drafts". CCB observed `Showing 10 of 53 drafts`; M matched StatusStrip `53 drafts to review`.
3. **Count mismatch root cause: copy/semantics, not cache/backend defect.** Each surface counted different things under similar labels. Clarified copy + N-of-M wording resolves the operator confusion vector.
4. No mutating browser actions performed during CCB verification.

**Items closed v2.96:**

- **Top alert bar count reconciliation (UI-copy/linkification scope)** — formerly dashboard rank D1 v2.95. CLOSED by slices 4A + 4B.

**Items explicitly NOT closed (per directive):**

- Cowork brief lifecycle gating WARN — core rank 1 unchanged.
- cc-0015 friction-pool-view (Wave 7) — gated on Gate 11 closing 2026-05-26.
- cc-0016 friction-capture-evidence (Wave 8) — backend-gated.
- Platform Reconciliation View — deferred per D-FR-RECON-001 §7.D.
- Mobile/narrow viewport verification — P3 carry.
- Backend/shared-metrics refactor — deferred; not actively ranked.

**Hard stops respected v2.96:**

- 0 production mutations / 0 Supabase mutations / 0 deploys
- 0 Invegent-dashboard edits this session
- 0 closure of Cowork lifecycle WARN
- 0 marking of cc-0015 / cc-0016 / PRV as implemented
- 0 backend/shared-metrics refactor started
- 0 application code edits / 0 memory edits / 0 decisions.md edits
- 0 D-01 fires / 0 force-run of cron 85 / 0 force-run of `nightly-health-check-v1`

**Sync close mechanics v2.96 (atomic single-commit per L-v2.85-e baseline — 11th consecutive occurrence):**

1. Per-session detail `docs/runtime/sessions/2026-05-20-v2.96-dashboard-slices-4a-4b-recorded.md`.
2. sync_state + action_list + session file committed in one atomic push.

L-v2.89-a fallback (1+1+1) ready but not invoked.

**v2.96 honest limitations:**

- Cross-repo state recording only — chat did not fetch dashboard HEAD. Commit SHAs recorded per PK directive payload.
- "VISUAL PASS" = CCB browser walkthrough; numbers cited (`Showing 10 of 53`; `53 drafts to review`) are per directive payload.
- Closure scoped to UI-copy/linkification only. The deeper question — should both surfaces share a metrics service — remains deferred. If the same operator-confusion vector resurfaces under different copy, the deferred refactor would need separate authorisation.
- Stuck-jobs link precedence rule not inspected this session.
- Gate 11 day count not refreshed v2.96.
- No fresh production state change v2.96.

---

### 2026-05-20 Sydney — v2.95 close (brief)

Dashboard slices 1–3 RECORDED as completed visual/operator work. Slice 1 `dashboard-nav-and-ops-copy-v1` at `af60953` (sidebar nav + /operations subtitle). Slice 2 `dashboard-operations-usability-v1` + remediation at `de4501b` + `37008e5` (Save guardrail + FAB severity default + Overview deep-links). Slice 3 `dashboard-roadmap-phases-correction-v1` at `991a92b` (4 D-FR-RECON-001 §4 corrections + layout + "Stop Claude" investigation). "Stop Claude" overlay confirmed external/non-app. Mobile/narrow Roadmap layout unverified (P3 carry). **Dashboard PHASES 46-streak deferral BROKEN/CLOSED by Slice 3.** Top alert bar count reconciliation spawned as P2 carry (closed v2.96 by slices 4A+4B).

*(Full detail at `docs/runtime/sessions/2026-05-20-v2.95-dashboard-slices-1-3-recorded.md`.)*

---

## 🟡 Next session priorities (rebuilt v2.97)

**Core ICE ranks v2.97:**

1. **Cowork brief lifecycle gating WARN — `nightly-health-check-v1`** — P2 carry, rank 1 (unchanged). Ready reset complete v2.94; convention patched. Closure waits on PK observation of next 16:00 UTC fire under v2.94 convention. **Secondary (P3):** 3 no-fire scheduler days (2026-05-16, 2026-05-18, 2026-05-19).
2. **cc-0016 friction-capture-evidence — Stage B (attachment RPC + operator authorization)** — **P2, rank 2 v2.97 (reframed from "Stage A" v2.96 → "Stage B" v2.97 after Stage A APPLIED/CLOSED)**. Next ranked action. Stage B must define the attach-evidence RPC/Server Action contract AND enforce per-event operator authorization in the application layer before Stage B can close. The Stage A RLS policies are bucket-scoped only — they do not enforce per-event ownership. **No lifecycle cleanup or destructive deletion until separately approved with dry-run/report.**
3. **Wave 0f scoping** — P3, rank 3 (unchanged). Opportunistic during Gate 11 window.
4. **Platform Reconciliation View brief authoring** — P2 carry, rank 4 (unchanged; deferred per D-FR-RECON-001 §7.D).
5. **5-row close-the-loop batch / Pre-sales / `purge_test_case` helper case_history extension** — P2/P3 carry, rank 5 (unchanged). 26 outstanding close-the-loop UPDATEs net (down from 28 v2.96 — the 2 cc-0016 escalated rows transitioned this session).

**Dashboard work (separately ranked v2.97 — UNCHANGED from v2.96):**

1. **D1**: cc-0015 friction-pool-view UI (slice 5) — P2, Gate 11 closes 2026-05-26.
2. **D2**: cc-0016 evidence UI (slice 6) — P2, **now Stage B-gated** (was generically "backend-gated" v2.96; Stage A APPLIED removed the schema/bucket gate; Stage B RPC + operator authorization is the remaining backend prerequisite).
3. **D3**: PRV surface (slice 7) — P2, brief authoring deferred.
4. **D4**: Mobile/narrow viewport verification — P3 carry.

**Standing P0:** Personal businesses check-in. Crazy Domains refund + clean-up carry from v2.51.

Carries: cc-0015 friction-pool-view (Wave 7, still gated on observation window closing 2026-05-26); **cc-0016 friction-capture-evidence Stage A APPLIED v2.97 — Stage B/C/D/E pending**; cc-0017c v1.2 doc patch; cc-0017a v1.2 doc patch; vchecks.md V-B4 doc patch; minor doc patches (cc-0010A/0011/0012); F-CRON-AUTO-APPROVER-SECRET-INLINE; backend/shared-metrics refactor (deferred carry, not ranked); lesson promotions (L-v2.78-a + L-v2.81-a eligible; **L-v2.83-a STRONG 16+**; L-v2.84-a/b/c/d watching; L-v2.85-a HIGH-SIGNAL 4 occurrences; **L-v2.85-e PROMOTION-CONFIRMED 12th consecutive v2.97**; L-v2.86-a/b/c/d/e watching; L-v2.88-a/b/c/d candidates; L-v2.89-a candidate; **L-v2.90-a through L-v2.90-f** (a/b HIGH-SIGNAL; c/d/e/f candidates); **L-v2.97-a NEW (HIGH-SIGNAL): first private storage bucket pattern**; **L-v2.97-b NEW (minor): PG SUM(integer)=bigint**).

---

## ⛔ Carried-forward "do not touch" state

**v2.97 updates on standing items:**

- **cc-0016 Stage A APPLIED v2.97** — friction-capture-evidence storage + schema infrastructure live. Migration `cc_0016_a_attachments_schema_and_bucket` applied via `apply_migration` MCP. 10 mutations atomic: 1 private bucket + 3 RLS policies + 1 column + 2 CHECK constraints + 1 partial index + 1 view + 1 grant statement (covering 2 roles). D-01 third-fire approved at `m.chatgpt_review` id `9eb35144-5c70-4cc1-8086-e9ec4525bca5`. 3 D-01 review rows close-the-loop resolved (28 → 26 outstanding). 6 V-checks PASS; V-A5 deferred to Stage B.
- **cc-0016 Stage B is the next ranked action** — attachment RPC/Server Action contract + per-event operator authorization in the application layer. Bucket-scoped RLS policies do NOT enforce per-event ownership — that is application-layer responsibility.
- **L-v2.97-a NEW candidate (HIGH-SIGNAL)**: first private storage bucket pattern shipped. Track production exercise across Stage B/C/D for one calendar week before treating pattern as repeatable for PRV evidence or other future projects.
- **L-v2.97-b NEW candidate (minor)**: Postgres `SUM(integer)` returns `bigint`. View `attachment_count` column is `bigint`. Flag for cc-0016 v1.0.1 doc patch.
- **Forward constraints recorded v2.97**: (a) Stage B cannot close until attachment authorization enforced in RPC/application layer. (b) No lifecycle cleanup / destructive deletion until separately approved with dry-run/report. (c) No dashboard evidence UI until backend Stage B contract is ready.
- **Dashboard slices 4A–4B RECORDED v2.96** as completed visual/operator work — carry unchanged.
- **Top alert bar count reconciliation CLOSED v2.96** for UI-copy/linkification scope. Backend/shared-metrics refactor remains deferred carry; not actively ranked.
- **Dashboard slices 1–3 RECORDED v2.95** — carry.
- **"Stop Claude" overlay confirmed external/non-app v2.95** — carry.
- **Mobile/narrow Roadmap layout unverified** — P3 carry.
- **Dashboard PHASES 46-streak deferral CLOSED v2.95** — carry.
- **Cowork brief lifecycle gating WARN** — Not closed v2.97 (directive explicitly preserves). Core rank 1 unchanged.
- **cc-0015 / PRV** unchanged — directive explicitly preserves as open.
- **Reconciliation daily cadence diagnostic CLOSED-PASS v2.93** — carry.
- **D-FR-RECON-001 v1.0 brief at `fc726e3c`** — carry.
- **Health_check V-C3 CLOSED-PASS v2.92** — carry.
- **cc-0017e Wave 0e APPLIED-WITH-VCHECK-CORRECTION v2.90 + v1.1 8-item doc patch CLOSED v2.91** — unchanged.
- **Friction Register Consolidation Plan** — Gate 13.a–d CLOSED; Gate 11 ACTIVE (day count not refreshed v2.97).
- **Wave 0f** — brief-authoring rank 3 (carry).
- **cc-0017a/b/c/d/e APPLIED**, **cc-0014 CLOSED-ARCHIVED** — unchanged.
- **Cowork brief `nightly-health-check-v1` FROZEN at v3.0**. Brief reset to `ready` v2.94; next fire eligible.
- **cron 82-86** firing normally.
- **friction.* schema state v2.97**: 10 tables (unchanged) + **`friction.event.attachments jsonb NOT NULL DEFAULT '[]'` NEW v2.97** + 19 functions (unchanged) + 1 new view `friction.case_with_attachment_count` + 1 new partial index `idx_friction_event_has_attachments` + 2 new CHECK constraints. 34 events all have `attachments='[]'`. 29 cases visible in view (all `attachment_count=0`).
- **storage.buckets v2.97**: 5 buckets total (4 pre-existing public + 1 NEW private `friction-evidence`).
- **storage.objects RLS v2.97**: 4 policies total (1 pre-existing `service_role_full_access` catch-all + 3 NEW `friction_evidence_authenticated_{read,insert,delete}` bucket-scoped).
- **L41**: cumulative v2.80-v2.97 = 11 (no new exercises v2.97).
- **L40 / L58 / L62**: not exercised v2.97.
- **L46 + L48 re-exercised v2.97** (D-01 corrected_action chain + atomic migration apply).
- **L-v2.78-a / L-v2.81-a**: 2 occurrences each, promotion-eligible.
- **L-v2.83-a**: **16+ occurrences v2.97**. STRONG CANDIDATE confirmed.
- **L-v2.85-a HIGH-SIGNAL**: 4 occurrences (unchanged v2.97).
- **L-v2.85-e**: **PROMOTION-CONFIRMED v2.88; 12th consecutive occurrence v2.97**.
- **L-v2.86-a HIGH-SIGNAL**: not re-exercised v2.97.
- **L-v2.88-a**: 2 occurrences (v2.88 + v2.91); NOT re-occurring v2.97.
- **L-v2.89-a**: atomic commit in flight v2.97; fallback ready but not invoked.
- **L-v2.90-a-f**: codified v2.91. Not empirically re-exercised v2.97. Watchers.
- **L-v2.97-a NEW HIGH-SIGNAL candidate** (private storage bucket pattern).
- **L-v2.97-b NEW minor candidate** (PG SUM(integer)=bigint).
- **26 close-the-loop UPDATEs outstanding** (down from 28 v2.96; –2 from cc-0016 escalated rows transitioning).
- **T-MCP-02 quota: ~86 cumulative v2.97** unchanged (no new D-01 fires this session — the cc-0016 chain fires happened upstream).
- State-capture exceptions: 1 unchanged.
- M-series total dead-letter rows cleared since 8 May 2026: 396.
- Standing don't-redeploy three (heygen-avatar-creator, heygen-avatar-poller, draft-notifier).
- **Production FAB live on dashboard.invegent.com** unchanged.
- **Localhost FAB cleanup pending** (`.env.local`).
- **D-CC-0017B-Q1** carried.
- **D-IOL-001** (v2.77) carried.

---

## 📜 G1 convention (the rule)

Unchanged. v2.97 per-session file `docs/runtime/sessions/2026-05-20-v2.97-cc0016-stage-a-applied.md` written and committed atomically alongside sync_state + action_list per L-v2.85-e baseline (**12th consecutive occurrence** — promotion-confirmed v2.88 carries forward). CCD local-git Path C used (no MCP write paths). `decisions.md` not touched. L-v2.89-a fallback (1+1+1) ready but **not invoked v2.97**.

**This file size**: ~30KB after this update.

---

*Last updated: 2026-05-20 Sydney — v2.97: **cc-0016 Stage A friction-capture-evidence APPLIED.** Migration `cc_0016_a_attachments_schema_and_bucket` applied via `apply_migration` MCP after D-01 third-fire approval at `m.chatgpt_review` id `9eb35144-5c70-4cc1-8086-e9ec4525bca5` (verdict=agree, action_taken=proceed). 10 mutations atomic: 1 private `friction-evidence` bucket (5MB, 3 MIME types — no GIF) + 3 bucket_id-scoped storage.objects RLS policies + `friction.event.attachments jsonb NOT NULL DEFAULT '[]'` + `friction_event_attachments_is_array` + `friction_event_attachments_max_3` CHECK constraints + `idx_friction_event_has_attachments` partial index + `friction.case_with_attachment_count` view + SELECT grant to authenticated + service_role. **V-A1/V-A2/V-A3/V-A4/V-A4b/V-A6 PASS; V-A5 DEFERRED to Stage B** (manual upload round-trip). 34 events received `attachments='[]'` instantaneously via DEFAULT; 29 cases visible in attachment-count view. **3 D-01 review rows close-the-loop resolved**: 6f2b8b1a + f573e684 (escalated → resolved) + 9eb35144 (completed → annotated); all marked `resolved_by='cc-0016-stage-a-apply-v2.97'`. Outstanding count **28 → 26** (–2 escalated). Forward constraints recorded: Stage B cannot close until attachment authorization enforced in RPC/application layer; no lifecycle cleanup until separately approved with dry-run/report; no dashboard evidence UI until backend Stage B contract is ready. **L-v2.97-a NEW HIGH-SIGNAL candidate**: first private storage bucket pattern shipped. **L-v2.97-b NEW minor**: PG SUM(integer)=bigint (view column type). L46 + L48 re-exercised. 0 Invegent-dashboard touched / 0 new migrations beyond Stage A / 0 storage objects created or deleted / 0 lifecycle cleanup / 0 cron / 0 EF deployed / 0 Stage B/C/D/E started / 0 closure of cc-0015 / PRV / Cowork WARN. T-MCP-02 cum ~86 unchanged. State-capture exceptions cum 1 unchanged. L-v2.85-e 12th consecutive — promotion-confirmed carries forward. L-v2.83-a 16+ STRONG. Per-session detail `docs/runtime/sessions/2026-05-20-v2.97-cc0016-stage-a-applied.md`. 3-file atomic single-commit this push (session file + sync_state + action_list).*
