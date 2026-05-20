# ICE — Action List

> **Single active action index for what's queued, in flight, blocked, or frozen.**
> Source-of-truth details remain in sync_state, run states, decisions, briefs, and commits.
> Read at the start of every session alongside `docs/00_sync_state.md`.
>
> Last updated: 2026-05-20 Sydney (**v2.98 — cc-0016 Stage C extended emit function APPLIED**. Migration `cc_0016_c_emit_manual_event_with_attachments` applied via `apply_migration` MCP after D-01 approval at `m.chatgpt_review` id `358c6fdd-fce3-4150-a780-9e4397fd2fc6` (verdict=agree, action_taken=proceed, risk_level=medium, requires_pk_escalation=false). 8 approved mutations applied atomically: DROP 6-arg `fn_emit_manual_event` + DROP 12-arg `emit_event` + CREATE 13-arg `emit_event` with trailing `p_attachments jsonb DEFAULT '[]'::jsonb` + CREATE 8-arg `fn_emit_manual_event` with trailing `p_event_id uuid DEFAULT NULL` + `p_attachments jsonb DEFAULT '[]'::jsonb` + REVOKE/GRANT on both new signatures (authenticated + service_role only). **cc-0017b unified emit pipeline preserved byte-stable** — `fn_emit_manual_event` delegates to `emit_event` via SELECT (no direct INSERT into `friction.event`). Attachment shape validation lives in two concordant layers. **V-C0/V-C1/V-C2/V-C3a/V-C3b/V-C3c/V-C3d/V-C3e/V-C4/V-C5/V-C6 PASS** (11/11 SQL V-checks); V-A5 (authenticated upload + read round-trip) carried to Stage B FAB ship. 3 D-01 review rows close-the-loop resolved (`56e65bb2` partial/high/escalated → resolved; `dbabb576` partial/high/escalated → resolved; `358c6fdd` agree/proceed/completed → annotated). All 3 `resolved_by='cc-0016-stage-c-apply-v2.98'`. Outstanding count **28 → 26** (–2 escalated). **cc-0016 Stage C APPLIED/CLOSED.** Next ranked action: **cc-0016 Stage B — dashboard FAB upload/read UX** (Stage C now provides the backend RPC contract; Stage B scope shifts forward to dashboard FAB implementation). **Forward constraints recorded**: Stage B can't close without FAB-layer per-event operator authorization; V-A5 carried to Stage B FAB ship; no lifecycle cleanup or destructive deletion until separately approved; no dashboard evidence UI until Stage B ships. Cowork lifecycle gating WARN UNCHANGED at core rank 1 (open). cc-0015 / PRV / mobile-viewport verification UNCHANGED. 0 Invegent-dashboard edits / 0 new migrations beyond Stage C / 0 storage objects created or deleted / 0 lifecycle cleanup / 0 retroactive attachment editing / 0 `fn_set_event_attachments` / 0 cron / 0 EF deployed / 0 Stage B/D/E started / 0 alteration of reviewer history. **L-v2.98-a NEW candidate (MEDIUM-SIGNAL)**: DROP-then-CREATE explicit pattern for SECURITY DEFINER signature extensions. **L-v2.98-b NEW candidate (MEDIUM-SIGNAL)**: Type-C echo pushback classification methodology. **L-v2.98-c NEW candidate (minor)**: Supabase MCP execute_sql role testing via `SET LOCAL ROLE`. L46 + L48 + L58 + L62 re-exercised v2.98. L-v2.85-e 13th consecutive. L-v2.83-a 17+ STRONG.) **Today/Next 5 core ranks v2.98**: Cowork lifecycle WARN → rank 1 (unchanged); **cc-0016 Stage B (dashboard FAB upload/read UX) → rank 2 (reframed from "Stage B backend RPC contract" v2.97 after Stage C APPLIED/CLOSED — Stage C provides the backend RPC; Stage B scope now is dashboard implementation)**; Wave 0f scoping → rank 3 (unchanged); PRV → rank 4 (deferred, unchanged); close-the-loop → rank 5 (unchanged; 26 outstanding). **Dashboard work ranked v2.98 (unchanged from v2.97 except cc-0016 evidence UI now Stage B-implementable)**: cc-0015 UI → D1 (gated on Gate 11); cc-0016 UI → D2 (Stage C backend live; Stage B FAB implementation is now the dashboard work-stream); PRV surface → D3 (deferred); mobile viewport verification → D4 (P3).

---

## How this file works

At session start, chat reads this file and: (1) rebuilds Today/Next 5; (2) runs Standing checks (S1–S29); (3) verifies D186 closure budget; (4) asks PK about Personal businesses; (5) surfaces Time-bound items.

**Standing rules unchanged from v2.96.** D-01 + D-186 + D-YT-OAUTH-1 + D-PREV-16 + Lesson #62 (L46) + #68 + v2.46-v2.58 + L33–L65 + L-v2.76-a-f + L-v2.78-a + L47 + L-v2.81-a + **L-v2.83-a (STRONG; 17+ v2.98)** + L-v2.84-a/b/c/d + L-v2.85-a (HIGH-SIGNAL; 4 occurrences — promotion-eligible) + L-v2.85-b/c/d carried + **L-v2.85-e PROMOTION-CONFIRMED 13th consecutive v2.98 (carries forward from v2.88)** + 5 L-v2.86 candidates + **L-v2.88-a (2 occurrences — watcher)** + L-v2.88-b/c/d candidates + L-v2.89-a candidate (carry) + **L-v2.90-a through L-v2.90-f candidates** (a/b HIGH-SIGNAL; c/d/e/f candidates) + **L-v2.97-a HIGH-SIGNAL (private storage bucket pattern; carrying)** + **L-v2.97-b minor (PG SUM(integer)=bigint; carrying)** + **L-v2.98-a NEW MEDIUM-SIGNAL (DROP-then-CREATE explicit for SECURITY DEFINER signature extensions)** + **L-v2.98-b NEW MEDIUM-SIGNAL (Type-C echo pushback classification methodology)** + **L-v2.98-c NEW minor (Supabase MCP execute_sql role testing via SET LOCAL ROLE)**. **D-IOL-001 (v2.77)** carried. **D-CC-0017B-Q1** carried.

**v2.98 ADDITIONS:**

- **cc-0016 Stage C extended emit function APPLIED v2.98.** Migration `cc_0016_c_emit_manual_event_with_attachments` applied via `apply_migration` MCP. D-01 approval at `m.chatgpt_review` id `358c6fdd-fce3-4150-a780-9e4397fd2fc6` (verdict=agree, action_taken=proceed, risk_level=medium, requires_pk_escalation=false, status=completed). PK explicit approval phrase present in apply directive.

- **8 approved mutations applied (all in single `apply_migration` call):**
  - DROP FUNCTION `friction.fn_emit_manual_event(text,text,text,text,jsonb,text)` (6-arg pre-patch)
  - DROP FUNCTION `friction.emit_event(text,text,text,text,timestamptz,jsonb,text,jsonb,text,text,text,jsonb)` (12-arg pre-patch)
  - CREATE OR REPLACE FUNCTION `friction.emit_event(...13-arg)` with trailing `p_attachments jsonb DEFAULT '[]'::jsonb`; body byte-stable to cc-0017b production source captured at HEAD `307822b` plus the documented additions (`p_attachments` parameter, array-shape validation, `attachments` column populated in INSERT)
  - CREATE OR REPLACE FUNCTION `friction.fn_emit_manual_event(...8-arg)` with trailing `p_event_id uuid DEFAULT NULL` + `p_attachments jsonb DEFAULT '[]'::jsonb`; delegates to `friction.emit_event` via SELECT (no direct INSERT into `friction.event`); per-attachment validation runs before delegation
  - REVOKE EXECUTE on `friction.emit_event(13-arg)` FROM PUBLIC
  - GRANT EXECUTE on `friction.emit_event(13-arg)` TO `authenticated, service_role`
  - REVOKE EXECUTE on `friction.fn_emit_manual_event(8-arg)` FROM PUBLIC
  - GRANT EXECUTE on `friction.fn_emit_manual_event(8-arg)` TO `authenticated, service_role`

- **V-check matrix v2.98 (11 PASS + 1 DEFERRED):**
  - V-C0 new signatures live; no overload coexistence → **PASS** (exactly one row per `proname` in `pg_proc`)
  - V-C1 6-arg backward-compat call returns uuid, `attachments='[]'`, `case_id IS NOT NULL`, `form_version='v1'` → **PASS** (event_id `9a1882c5`; case_id `14cd78fb`)
  - V-C2 8-arg call with valid PNG attachment stores verbatim, pipeline attaches case, `form_version='v2'`, client UUID preserved → **PASS** (event_id `49ba8414`; case_id `5b3aba30`)
  - V-C3a 4 attachments rejected → **PASS** (`attachments limited to 3 per event` P0001)
  - V-C3b `video/mp4` rejected → **PASS** (`attachment mime_type video/mp4 not allowed` P0001)
  - V-C3c missing `storage_path` rejected → **PASS** (`each attachment must include storage_path and mime_type` P0001)
  - V-C3d missing `mime_type` rejected → **PASS** (`each attachment must include storage_path and mime_type` P0001)
  - V-C3e non-array rejected → **PASS** (`attachments must be a JSON array` P0001)
  - V-C4 grants correct on both signatures → **PASS** (authenticated + service_role allowed; anon + public denied)
  - V-C5 service_role direct call works → **PASS** (`SET LOCAL ROLE service_role` then `fn_emit_manual_event` returned event_id `39bcf497`)
  - V-C6 0 residual `cc-0016-test%` rows → **PASS** (3 test events + 3 orphan cases cleaned up; `friction.event` count back to 34 baseline)
  - V-A5 authenticated upload + read round-trip → **DEFERRED to Stage B FAB ship** (manual frontend test; cannot be SQL-tested)

- **Existing-row state after apply:**
  - `friction.event` row count: 34 (unchanged) — V-C1/V-C2/V-C5 created 3 test events, V-C6 deleted them; baseline restored
  - `friction.case` row count: 29 (unchanged) — 3 orphaned test cases also deleted in V-C6
  - cc-0017b pipeline still active — V-C1 and V-C2 both attached `case_id IS NOT NULL` via `fn_attach_or_create_inner_v1`

- **Close-the-loop on 3 D-01 review rows v2.98:**
  - `56e65bb2-2799-4b13-87de-c9c453fb17ec` (partial/high/escalated, first Stage C v1.1 fire) → `escalation_resolved_at` set, `resolved_by='cc-0016-stage-c-apply-v2.98'`, action_taken appended with Path A Type-B resolution chain to approved row `358c6fdd`
  - `dbabb576-5b40-4e72-91cb-461c3b9499a4` (partial/high/escalated, second Stage C v1.1 fire — 3 Type-C echoes) → `escalation_resolved_at` set, `resolved_by='cc-0016-stage-c-apply-v2.98'`, action_taken appended with Type-C echo resolution chain to approved row `358c6fdd`
  - `358c6fdd-fce3-4150-a780-9e4397fd2fc6` (agree/proceed/completed, third Stage C v1.1 fire = approved) → `escalation_resolved_at` set, `resolved_by='cc-0016-stage-c-apply-v2.98'`, action_taken appended with apply outcome + V-check matrix + 8-mutation summary
  - **Verdict / risk / escalation history preserved on all 3 rows** (only close-the-loop fields written)
  - **Outstanding count: 28 → 26** (–2 escalated rows transitioned to escalation_resolved; `358c6fdd` was already `status=completed` and not counted in outstanding tally)

- **Forward constraints recorded v2.98:**
  1. Stage B cannot close until the dashboard/FAB application layer verifies the authenticated operator is allowed to attach evidence to the event/case (function-layer validation enforces shape only; per-event ownership is the FAB's responsibility).
  2. V-A5 (authenticated upload + read round-trip) carried to Stage B FAB ship.
  3. No lifecycle cleanup or destructive deletion until separately approved with dry-run/report (Stage E remains explicitly out of scope).
  4. No dashboard evidence UI until Stage B ships (Stage D follows Stage B).
  5. cc-0015 / PRV / Cowork WARN unchanged from v2.97.

- **Hard stops respected v2.98:**
  - 0 Invegent-dashboard touched
  - 0 new migrations beyond the approved Stage C
  - 0 storage objects created or deleted
  - 0 lifecycle cleanup / 0 destructive deletion
  - 0 retroactive attachment editing
  - 0 `fn_set_event_attachments` created
  - 0 operator-authorization checks added to Stage C (deferred to Stage B per brief v1.1 §5)
  - 0 cron created / 0 EF deployed
  - 0 Stage B / Stage D / Stage E work started
  - 0 closure of cc-0015 / PRV / Cowork WARN
  - 0 alteration of reviewer verdict / risk / escalation history fields (only close-the-loop resolution fields written)
  - 0 dashboard evidence UI / 0 FAB upload UI / 0 `/operations` evidence display
  - 0 deviation from D-01 approved scope
  - 0 `execute_sql` for DDL (`apply_migration` only)

- **Sync close mechanics v2.98 (atomic single-commit per L-v2.85-e baseline — 13th consecutive occurrence):**
  1. Per-session detail `docs/runtime/sessions/2026-05-20-v2.98-cc0016-stage-c-applied.md`.
  2. sync_state + action_list + brief v1.2 changelog line + session file committed in one atomic push (CCD local-git Path C).

  L-v2.89-a fallback (1+1+1) ready but not invoked.

- **L-v2.85-e re-applied 13th consecutive occurrence** (v2.86 → v2.98). Promotion-confirmed v2.88 carries forward.
- **L-v2.83-a re-applied** at sync close commit. Cumulative **17+ STRONG**.
- **L46 re-exercised v2.98** (D-01 corrected_action chain `56e65bb2` (Type-B) → `dbabb576` (3 Type-C echoes) → `358c6fdd` (approved); brief patched v1.0 → v1.1 mid-chain).
- **L48 re-exercised v2.98** (single atomic `apply_migration` call covering 8 mutations — DROP + DROP + CREATE + CREATE + 4 REVOKE/GRANT).
- **L58 re-exercised v2.98** (CCD local-git Path C for brief patch + sync close).
- **L62 re-exercised v2.98** (Type-C echo classification on dbabb576 pushbacks — overload shadowing, pipeline regression, schema clarity — all 3 structurally resolved in brief v1.1 design).
- **L-v2.97-a** carried (private storage bucket pattern continues to exercise across Stage B/C; track until calendar week elapses from v2.97).
- **L-v2.97-b** carried (`SUM(integer)=bigint`).
- **L-v2.98-a NEW candidate (MEDIUM-SIGNAL, watcher)**: DROP-then-CREATE explicit pattern for SECURITY DEFINER signature extensions. PostgreSQL treats different `proargnames` lengths as distinct functions, not REPLACE targets. Tag for re-exercise next time a function signature extends.
- **L-v2.98-b NEW candidate (MEDIUM-SIGNAL, methodology)**: Type-C echo pushback classification — cite design element + V-check that proves structural resolution in next D-01 corrected_action rather than re-patching brief.
- **L-v2.98-c NEW candidate (minor, tooling)**: Supabase MCP `execute_sql` runs as `postgres` superuser. To test grants for non-superuser roles, use `SET LOCAL ROLE <role>` within the same transaction. Temp tables created by the superuser are NOT writable by the role-switched session.
- **L-v2.85-a / L-v2.86-a / L-v2.88-a / L-v2.89-a / L-v2.90-a-f**: not re-exercised v2.98.
- **L40 / L41 / L47**: not exercised v2.98.

- **No new L-v2.98-X candidates beyond a + b + c above.**

- **Closed Active rows v2.98:** cc-0016 friction-capture-evidence Stage C (P2 backend) → **APPLIED/CLOSED** ✅.
- **Promoted Active rows v2.98:** cc-0016 Stage B (was "Stage B backend RPC/application contract" v2.97 → **reframed v2.98 as "dashboard FAB upload/read UX" — the backend RPC contract is now live as of Stage C apply; Stage B's remaining work is the dashboard implementation**).
- **Spawned Active rows v2.98:** none.

- **Dashboard PHASES**: closed/broken v2.95. No new file-touch v2.98.
- **NO decisions.md change v2.98.**
- **Session compaction event v2.98:** 1 (mid-session compaction during the Stage C extraction + apply phase; lossless via summary-then-resume).
- **Production mutations v2.98:** 1 (`apply_migration` for `cc_0016_c_emit_manual_event_with_attachments`, applied in the apply turn before this sync close) + 3 close-the-loop UPDATEs on `m.chatgpt_review` (DML on review-tracking table; out of D-01 scope by convention) + V-C1/V-C2/V-C5 created 3 test events + 3 cases; V-C6 deleted all 6 (net 0 production data change).
- **D-01 fires v2.98: 0 new fires** (the 3 cc-0016 Stage C v1.1 fires happened upstream during preflight/extraction work; v2.98 sync close only records the close-the-loop).
- **T-MCP-02 cum v2.98: ~89** (3 new D-01 fires from cc-0016 Stage C v1.1 chain accumulated upstream; ~86 v2.97 + 3 = 89).
- **State-capture exceptions v2.98: 0.** Cumulative: 1 unchanged.
- **Close-the-loop UPDATEs v2.98: 3** (the 3 cc-0016 Stage C review rows). Outstanding count 28 → 26.

**v2.97 ADDITIONS:**

- **cc-0016 Stage A friction-capture-evidence APPLIED v2.97.** Migration `cc_0016_a_attachments_schema_and_bucket` applied via `apply_migration` MCP. D-01 third-fire approval at `m.chatgpt_review` id `9eb35144-5c70-4cc1-8086-e9ec4525bca5` (verdict=agree, action_taken=proceed, risk_level=medium, requires_pk_escalation=false, status=completed). PK explicit approval phrase present in apply directive.

- **10 atomic mutations created (all in single `apply_migration` call):**
  - 1 private storage bucket `friction-evidence` (public=false, file_size_limit=5242880, allowed_mime_types=['image/jpeg','image/png','image/webp']; no GIF per D-01 scope)
  - 3 storage.objects RLS policies (`friction_evidence_authenticated_{read,insert,delete}`, all `TO authenticated USING/WITH CHECK (bucket_id='friction-evidence')`; no path segmentation, no `split_part`, no `LIKE` path-prefix, no `auth.uid()` join)
  - 1 column `friction.event.attachments jsonb NOT NULL DEFAULT '[]'::jsonb`
  - 2 CHECK constraints (`friction_event_attachments_is_array` = `jsonb_typeof(attachments) = 'array'`; `friction_event_attachments_max_3` = `jsonb_array_length(attachments) <= 3`)
  - 1 partial functional index `idx_friction_event_has_attachments ON friction.event(case_id) WHERE jsonb_array_length(attachments) > 0`
  - 1 view `friction.case_with_attachment_count` (`c.*, COALESCE(SUM(jsonb_array_length(e.attachments)), 0) AS attachment_count`)
  - 1 GRANT statement covering both `authenticated` and `service_role`

- **V-check matrix v2.97 (6 PASS + 1 DEFERRED):**
  - V-A1 bucket shape (name, public=false, 5MB, MIME types) → **PASS**
  - V-A2 column shape (jsonb, default '[]', NOT NULL) → **PASS**
  - V-A3 CHECK constraints reject non-array + >3 items → **PASS** (2 expected `check_violation` errors; 0 leaked rows)
  - V-A4 anon deny (`SET ROLE anon` returns 0 rows) → **PASS**
  - V-A4b authenticated + service_role scoped read on empty bucket → **PASS** (both return 0; both queries succeed)
  - V-A5 authenticated upload + read round-trip → **DEFERRED to Stage B** (manual frontend test)
  - V-A6 view shape → **PASS** (29 rows = base case count; all `attachment_count=0` of type `bigint`)

- **Existing-row state after apply:**
  - `friction.event` row count: 34 (unchanged); all 34 received `attachments='[]'::jsonb` instantaneously via DEFAULT — no existing INSERTers needed code changes
  - `friction.case` row count: 29 (unchanged); all 29 visible in `friction.case_with_attachment_count` view with `attachment_count=0`

- **Close-the-loop on 3 D-01 review rows v2.97:**
  - `6f2b8b1a-888d-41a0-9ab9-1fbbf65bcce8` (partial/high/escalated, first fire) → escalation_resolved_at set, `resolved_by='cc-0016-stage-a-apply-v2.97'`, action_taken annotated with corrected_action chain reference
  - `f573e684-6cbf-4eef-8b32-1d0aeb1c9ff7` (partial/medium/escalated, second fire) → escalation_resolved_at set, `resolved_by='cc-0016-stage-a-apply-v2.97'`, action_taken annotated with corrected_action chain reference
  - `9eb35144-5c70-4cc1-8086-e9ec4525bca5` (agree/proceed/completed, third fire = approved) → `resolved_by='cc-0016-stage-a-apply-v2.97'`, action_taken annotated with apply outcome + V-check matrix
  - **Verdict / risk / escalation history preserved on all 3 rows** (only close-the-loop fields written)
  - **Outstanding count: 28 → 26** (–2 escalated rows transitioned to escalation_resolved)

- **Forward constraints recorded v2.97:**
  1. Stage B cannot close until attachment authorization is enforced in the RPC/application layer.
  2. No lifecycle cleanup or destructive deletion until separately approved with dry-run/report.
  3. No dashboard evidence UI until backend Stage B contract is ready.

- **Hard stops respected v2.97:**
  - 0 Invegent-dashboard touched
  - 0 new migrations beyond the approved Stage A migration (Stage A itself was the only `apply_migration` this session)
  - 0 storage objects created or deleted (bucket was created empty; remains empty post-apply)
  - 0 lifecycle cleanup / 0 destructive deletion
  - 0 cron created / 0 EF deployed
  - 0 Stage B / Stage C / Stage D / Stage E work started
  - 0 closure of cc-0015 / PRV / Cowork lifecycle WARN
  - 0 alteration of reviewer verdict / risk / escalation history fields (only close-the-loop resolution fields written)
  - 0 dashboard evidence UI / 0 attachment RPC / 0 FAB upload UI / 0 /operations evidence display
  - 0 deviation from D-01 third-fire approved scope

- **Sync close mechanics v2.97 (atomic single-commit per L-v2.85-e baseline — 12th consecutive occurrence):**
  1. Per-session detail `docs/runtime/sessions/2026-05-20-v2.97-cc0016-stage-a-applied.md`.
  2. sync_state + action_list + session file committed in one atomic push (CCD local-git Path C).

  L-v2.89-a fallback (1+1+1) ready but not invoked.

- **L-v2.85-e re-applied 12th consecutive occurrence** (v2.86 → v2.97). Promotion-confirmed v2.88 carries forward.
- **L-v2.83-a re-applied** at sync close commit. Cumulative **16+ STRONG**.
- **L46 re-exercised v2.97** (D-01 corrected_action chain culminating in approved review id `9eb35144`).
- **L48 re-exercised v2.97** (single atomic `apply_migration` call covering DDL + storage bucket + RLS + view + grants — 10 mutations).
- **L-v2.97-a NEW HIGH-SIGNAL candidate**: first private storage bucket pattern shipped. Track production exercise across Stage B/C/D for one calendar week before treating pattern as repeatable for PRV evidence or other future projects.
- **L-v2.97-b NEW minor candidate**: Postgres `SUM(integer)` returns `bigint`. View `attachment_count` column is `bigint` (not `integer`). Flag for cc-0016 v1.0.1 doc patch if authored.
- **L-v2.85-a / L-v2.86-a / L-v2.88-a / L-v2.89-a / L-v2.90-a-f**: not re-exercised v2.97.
- **L40 / L41 / L58 / L62**: not exercised v2.97.

- **No new L-v2.97-X candidates beyond a + b above.**

- **Closed Active rows v2.97:** cc-0016 friction-capture-evidence Stage A (P2 core rank 2 v2.96) → **APPLIED/CLOSED** ✅.
- **Promoted Active rows v2.97:** cc-0016 Stage B (was implicit "next stage" v2.96 → **rank 2 v2.97 reframed as the next gating action**).
- **Spawned Active rows v2.97:** none (Stage B/C/D/E pre-existed in the brief; v2.97 just promotes Stage B from implicit to explicit ranking).

- **Dashboard PHASES**: closed/broken v2.95. No new file-touch v2.97.
- **NO decisions.md change v2.97.**
- **Session compaction event v2.97:** 0.
- **Production mutations v2.97:** 1 (`apply_migration` for `cc_0016_a_attachments_schema_and_bucket`) + 3 close-the-loop UPDATEs on `m.chatgpt_review` (DML on review-tracking table; out of D-01 scope by convention).
- **D-01 fires v2.97: 0 new fires** (the cc-0016 chain happened upstream; v2.97 only records the close-the-loop).
- **T-MCP-02 cum v2.97: ~86 unchanged** (no new fires; the 3 cc-0016 fires were counted upstream).
- **State-capture exceptions v2.97: 0.** Cumulative: 1 unchanged.
- **Close-the-loop UPDATEs v2.97: 3** (the 3 cc-0016 review rows). Outstanding count 28 → 26.

**v2.96 ADDITIONS:**

- **Dashboard slices 4A–4B RECORDED v2.96 as completed visual/operator work** in Invegent-dashboard (cross-repo state recording; no Invegent-dashboard edits this session):
  - **Slice 4A: `dashboard-status-strip-copy-links-v1`** at `cd0240265507035cc93b8fb95927593f7c6b0da1` — VISUAL PASS. StatusStrip copy clarified; critical / posts / drafts clusters linked; stuck-jobs link implemented but only visible when precedence permits.
  - **Slice 4B: `dashboard-drafts-count-clarity-v1`** at `f5a980fea3a8411823285501307c2a52b3cf3de0` — VISUAL PASS. Overview "Drafts to review" now shows "Showing N of M drafts". CCB observed `Showing 10 of 53 drafts`; M matched StatusStrip `53 drafts to review`.

- **Count mismatch root cause confirmed v2.96: copy/semantics, not cache or backend defect.** Previously top bar ("4 critical alerts · 35 posts this week · 53 in inbox") and Overview banner ("5 published today · 116 overdue in queue · 4 critical incidents") read disagreeing numbers because each surface counted different things under similar labels. Clarified copy + N-of-M wording resolves the operator-confusion vector.

- **No mutating browser actions performed during CCB verification** (per directive).

- **Top alert bar count reconciliation CLOSED v2.96 for UI-copy/linkification scope** (was rank D1 v2.95 / spawned v2.95). Operator-confusion vector resolved. **Deeper backend/shared-metrics refactor remains deferred unless separately directed; not actively ranked.**

- **Remaining dashboard work ranked v2.96** (D-rank shifted up after D1 closure):
  - **Rank D1 (was D2 v2.95):** cc-0015 friction-pool-view UI (slice 5) — P2; backend already shipped; gated on Gate 11 observation window closing 2026-05-26.
  - **Rank D2 (was D3 v2.95):** cc-0016 evidence UI (slice 6) — P2; backend-gated (Stage A `friction.event` + Storage bucket + RLS policies; D-01 required).
  - **Rank D3 (was D4 v2.95):** Platform Reconciliation View surface (slice 7) — P2; PRV brief authoring deferred per D-FR-RECON-001 §7.D.
  - **Rank D4 (was D5 v2.95):** Mobile/narrow viewport verification — P3 carry; real-device or CCD viewport test; not blocking.
  - **Deferred carry (not actively ranked):** Backend/shared-metrics refactor — the deeper question behind the count mismatch (should both surfaces share a single metrics service). Deferred unless separately directed.

- **Items explicitly NOT closed v2.96 (per directive):**
  - Cowork brief lifecycle gating WARN (`nightly-health-check-v1`) — core rank 1; preserved open.
  - cc-0015 (Wave 7) — DRAFTED at `9a5dc155`; still gated on Gate 11 closing 2026-05-26.
  - cc-0016 (Wave 8) — DRAFTED at `f35f8ea4`; backend-gated.
  - PRV brief authoring — deferred per D-FR-RECON-001 §7.D.
  - Mobile/narrow viewport verification — P3 carry.
  - Backend/shared-metrics refactor — deferred; not actively ranked.

- **Hard stops respected v2.96:**
  - 0 production mutations / 0 Supabase mutations / 0 deploys
  - 0 Invegent-dashboard edits this session (slices shipped upstream by CCD; chat did not touch dashboard repo)
  - 0 closure of the Cowork lifecycle WARN (directive explicitly preserves)
  - 0 marking of cc-0015 / cc-0016 / PRV as implemented
  - 0 backend/shared-metrics refactor started
  - 0 application code edits (in either repo)
  - 0 memory edits / 0 decisions.md edits
  - 0 D-01 fires
  - 0 force-run of cron 85 / 0 force-run of `nightly-health-check-v1`

- **Sync close mechanics v2.96 (atomic single-commit per L-v2.85-e baseline — 11th consecutive occurrence):**
  1. Per-session detail file `docs/runtime/sessions/2026-05-20-v2.96-dashboard-slices-4a-4b-recorded.md`.
  2. sync_state + action_list + session file committed in **one atomic push** (CCH-side `push_files` MCP).

  L-v2.89-a fallback (1+1+1) ready but not invoked v2.96.

- **L-v2.85-e re-applied 11th consecutive occurrence** (v2.86 → v2.96); promotion-confirmed v2.88 carries forward.
- **L-v2.83-a re-applied** at sync close commit. Cumulative **15+ STRONG**.
- **L-v2.88-a NOT re-occurring v2.96** — cross-repo recording session, not directive-loop.
- **L-v2.89-a NOT actively exercised v2.96** — atomic commit in flight; fallback ready.
- **L-v2.85-a HIGH-SIGNAL / L-v2.86-a HIGH-SIGNAL / L-v2.90-a-f NOT re-exercised v2.96** (doc-sync only).
- **L40 / L41 / L46 / L58 / L62 NOT exercised v2.96** (no DB / no DDL / no D-01 / no apply).

- **No new L-v2.96-X candidates surfaced.** Cross-repo recording session.

- **Closed Active rows v2.96:** Top alert bar count reconciliation (P2 rank D1 v2.95) → **CLOSED for UI-copy/linkification scope** by slices 4A + 4B ship.
- **Spawned Active rows v2.96 (deferred carry):** Backend/shared-metrics refactor — deferred unless separately directed; not actively ranked.
- **Promoted Active rows v2.96:** Dashboard D-ranks D2→D1, D3→D2, D4→D3, D5→D4 after D1 closure.

- **NO decisions.md change v2.96.** Doc-sync close.
- **Session compaction event v2.96:** 0.
- **Production mutations v2.96: 0.**
- **D-01 fires v2.96: 0.**
- **T-MCP-02 cum v2.96: ~86 unchanged.**
- **State-capture exceptions v2.96: 0.** Cumulative: 1 unchanged.
- **Close-the-loop UPDATEs v2.96: 0** (no D-01 fired). 22 outstanding unchanged.

---

## 📊 Closure budget tracking (per D186)

| Metric | Current | Limit | Status |
|---|---|---|---|
| Open findings + investigations (P0+P1) | 0 (recon daily diagnostic CLOSED-PASS v2.93; dashboard PHASES streak CLOSED v2.95; top alert bar count reconciliation CLOSED v2.96 for UI scope) | 20 | ✅ within budget |
| Trailing-14-day closure hours | ~35h (cumulative v2.83–v2.96) | 8.0 floor | ✅ above floor |
| Pause trigger active? | NO | — | New automation authoring allowed |

**v2.97 cycle: ~1.5h total** (preflight + memo + apply_migration + 6 V-checks + 3 close-the-loop UPDATEs + sync close drafting). 1 schema mutation (cc-0016 Stage A migration). 0 new D-01 fires (cc-0016 chain happened upstream). 1 atomic git commit (sync_state + action_list + session file in single push per L-v2.85-e baseline — 12th consecutive). **State-capture exception count v2.97: 0** (cumulative 1).

**v2.96 cycle: ~1h total** (cross-repo state recording; no diagnostic SQL; sync close drafting). 0 schema mutations. 0 D-01 fires. 1 atomic git commit. State-capture exception count v2.96: 0.

---

## ⭐ Today / Next 5 (core ICE ranks)

> Last rebuilt: 2026-05-20 Sydney (v2.97 — cc-0016 Stage A APPLIED/CLOSED; cc-0016 Stage B promoted to core rank 2 from implicit-next-stage; other ranks unchanged).

| Rank | Item | Priority | Why now | Next action |
|---|---|---|---|---|
| 1 | **Cowork brief lifecycle gating WARN — `nightly-health-check-v1`** | **P2 carry, rank 1 (unchanged from v2.94/v2.95/v2.96)** | Ready reset complete v2.94 + convention patched at `docs/runtime/automation_v1_spec.md` Status flow §. WARN explicitly NOT closed v2.97. | chat → PK | Observe next 16:00 UTC fire under new convention. |
| 2 | **cc-0016 friction-capture-evidence — Stage B (attachment RPC + operator authorization)** | **P2, rank 2 v2.97 (reframed from "Stage A" v2.96 after Stage A APPLIED/CLOSED)** | Stage A backend infrastructure live (private bucket, attachments column, CHECK constraints, view, partial index, RLS policies). Stage B is the next gating action: define attach-evidence RPC/Server Action contract; enforce per-event operator authorization in the application layer (Stage A RLS is bucket-scoped only, not per-event). **Stage B cannot close until that authorization is enforced.** **No lifecycle cleanup or destructive deletion until separately approved with dry-run/report.** | PK → chat | When PK directs. |
| 3 | **Wave 0f scoping** | **P3 brief-authoring only, opportunistic during Gate 11 observation window per D-FR-RECON-001 §7.C** | Brief-authoring is non-mutating. Candidates: items B/E/F/G deferred from cc-0017e + `purge_test_case` helper case_history extension (L-v2.90-d). | chat → PK | When PK directs (recommended during Gate 11 window 2026-05-19 → 2026-05-26). |
| 4 | **Platform Reconciliation View brief authoring** | **P2 carry, deferred per D-FR-RECON-001 §7.D** | Recommended to defer until corrected friction-register baseline accepted. | PK → chat | When PK directs. |
| 5 | **5-row close-the-loop batch sweep / Pre-sales criteria refinement / `purge_test_case` helper case_history extension** | **P2/P3 carry** | **26 outstanding close-the-loop UPDATEs** (down from 28 v2.96 — 2 cc-0016 Stage A escalated rows transitioned this session). | chat → PK | When PK directs. |

## ⭐ Dashboard work (separately ranked v2.96, D-rank shifted)

| Rank | Item | Priority | Why now | Next action |
|---|---|---|---|---|
| D1 | **cc-0015 friction-pool-view UI** (slice 5) | P2 carry, **promoted from D2 v2.95** | Backend already shipped. Gated on Gate 11 observation window closing 2026-05-26. | PK → chat (Wave 7) | When window closes 2026-05-26. |
| D2 | **cc-0016 evidence UI** (slice 6) | P2 carry, **D2 unchanged from v2.96; gating reframed from generic "backend-gated" to "Stage B-gated" v2.97** | Stage A APPLIED v2.97 — schema/bucket/RLS infrastructure live. Stage B (attachment RPC + operator authorization) is the remaining backend prerequisite before dashboard evidence UI can build. | PK → chat (Wave 8) | After Stage B RPC + authorization contract lands. |
| D3 | **Platform Reconciliation View surface** (slice 7) | P2 carry, **promoted from D4 v2.95** | PRV brief authoring deferred per D-FR-RECON-001 §7.D. | PK → chat | When PRV brief authored + PK-accepted. |
| D4 | **Mobile/narrow viewport verification** (carry from slice 3) | **P3 carry, promoted from D5 v2.95** | Visual-audit browser runtime overrode `resize_window`. Not blocking. | CCD or PK | Real-device verification. |

**Deferred carry (not actively ranked):**
- **Backend/shared-metrics refactor** — the deeper question behind the v2.95 count mismatch (should both surfaces share a single metrics service). Deferred unless separately directed.

**Standing P0:** Personal businesses check-in. Crazy Domains carry from v2.51.

**Secondary follow-up (separate from core rank 1, lower priority)**: **3 no-fire scheduler days** for `nightly-health-check-v1` — 2026-05-16, 2026-05-18, 2026-05-19. P3 scheduler/agent-uptime investigation.

**Passive observation v2.96**: Cron 82-86 firing normally. PRV v1 operator views queryable. friction.* state: 10 tables, 19 functions (fn_triage_case 11-arg only), 29 cases + 29 events, 8 case_history rows. Cowork brief `nightly-health-check-v1` v3.0 reset to `ready` v2.94. **Dashboard `dashboard.invegent.com`**: slices 1–3 + 4A–4B all shipped + visually verified.

---

## 🟢 Dashboard slices — STATUS BLOCK (UPDATED v2.96)

**Status v2.96: Slices 1–3 + 4A–4B all RECORDED as completed visual/operator work in Invegent-dashboard. Cross-repo recording only; no dashboard edits this session.**

**Slices completed (per directive payloads v2.95 + v2.96):**
- Slice 1 `dashboard-nav-and-ops-copy-v1` at `af60953` — VISUAL PASS (v2.95).
- Slice 2 `dashboard-operations-usability-v1` + remediation at `de4501b` + `37008e5` — VISUAL PASS (v2.95).
- Slice 3 `dashboard-roadmap-phases-correction-v1` at `991a92b` — VISUAL PASS (v2.95).
- **Slice 4A `dashboard-status-strip-copy-links-v1` at `cd0240265507035cc93b8fb95927593f7c6b0da1` — VISUAL PASS (v2.96).**
- **Slice 4B `dashboard-drafts-count-clarity-v1` at `f5a980fea3a8411823285501307c2a52b3cf3de0` — VISUAL PASS (v2.96).**

**Slices remaining (ranked D1–D4 v2.96):**
- Slice 5: cc-0015 friction-pool-view UI — gated.
- Slice 6: cc-0016 evidence UI — backend-gated.
- Slice 7: PRV surface — deferred.
- Mobile viewport verification: P3 carry.

**Closed observations:**
- "Stop Claude" overlay confirmed external/non-app (v2.95).
- Top alert bar count reconciliation closed for UI-copy/linkification scope (v2.96).

**Deferred carries (not actively ranked):**
- Backend/shared-metrics refactor (the deeper scope behind slice 4 reconciliation).
- `/ef-drift` + `/onboarding` orphan-route confirmation (whether shipped in slice 1 nav).

---

## 🟢 Friction Register Consolidation Plan v1 + amendments — STATUS BLOCK (v2.96 unchanged from v2.94/v2.95)

**Status v2.96: ✅ Wave 0 + Wave 0d + Wave 0e COMPLETE. Gates 10+12+13 CLOSED. Gate 11 (1-week observation 2026-05-19 → 2026-05-26) ACTIVE. Day count not refreshed v2.96. Wave 0f scoping rank 3 carry.**

---

## 🟢 cc-0017e Wave 0e — STATUS BLOCK (unchanged v2.96)

Production state unchanged from v2.90+v2.91. friction.case_history table; fn_triage_case 11-arg patched; 5 cc-0017d mutation functions patched byte-stable; 8 backfill rows.

---

## 🟢 Cowork brief `nightly-health-check-v1` — STATUS BLOCK (unchanged v2.96)

Status v2.96: FROZEN at v3.0. Signal-production contract empirically validated v2.92 (V-C3 CLOSED-PASS). Lifecycle gating WARN unchanged — core rank 1; directive explicitly preserved as open v2.96. Brief reset to `status: ready` v2.94; convention patched v2.94 at `docs/runtime/automation_v1_spec.md` Status flow §. Closure waits on PK observation of next 16:00 UTC fire.

---

## 🟢 cc-0017d / cc-0017c / cc-0017b / cc-0017a / cc-0014 / cc-0015 / cc-0016 / cc-0012 / cc-0010A/B/C / cc-0011 / cc-0009 — STATUS BLOCKS

**v2.96 updates:** unchanged from v2.94/v2.95. Gate 11 day count not refreshed v2.96.

---

## 🟢 Process Upgrades — STATUS BLOCK (UPDATED v2.96)

**L41**: cumulative v2.80-v2.96 = 11 (no new exercises v2.96).
**L40 / L46 / L58 / L62**: not exercised v2.96.
**L-v2.78-a / L-v2.81-a**: 2 occurrences each, promotion-eligible.
**L-v2.83-a**: **15+ occurrences v2.96** (re-applied at sync close commit). STRONG CANDIDATE confirmed.
**L-v2.84-a/b/c/d**: unchanged.
**L-v2.85-a HIGH-SIGNAL**: 4 occurrences (unchanged v2.96).
**L-v2.85-b/c/d**: not re-exercised v2.96.
**L-v2.85-e**: **re-applied v2.96 — 11th consecutive occurrence** (v2.86 → v2.96). Atomic sync_state + action_list + session-file single commit. PROMOTION-CONFIRMED v2.88 carries forward.
**L-v2.86-a HIGH-SIGNAL**: not re-exercised v2.96.
**L-v2.86-b/c/d/e**: not re-exercised v2.96.
**L-v2.88-a**: 2 occurrences (v2.88 + v2.91); NOT re-occurring v2.96. Watcher carries forward.
**L-v2.88-b/c/d**: realised v2.90; carry forward.
**L-v2.89-a**: atomic commit in flight v2.96; fallback ready but not actively exercised.
**L-v2.90-a-f**: codified documentationally v2.91. Not empirically re-exercised v2.96. Watchers.

---

## 🔄 Standing session-start checks

S1–S29 unchanged. S30 closed PASS v2.47.

---

## 🔴 Time-bound

- **1-week empirical observation window** — 2026-05-19 → 2026-05-26. Wave 7 (cc-0015) gated. Day count not refreshed v2.96.
- **First cc-0017e-post-apply cron 85 fire** → **CLOSED-PASS v2.93** (carry unchanged).
- **Cowork `nightly-health-check-v1` lifecycle gating WARN** — core rank 1 carry; directive explicitly preserved as open v2.96.
- **Dashboard slices 1–3 + 4A–4B visual PASS recorded v2.95 + v2.96** — cross-repo state recording.
- No new v2.96 calendar items.

---

## 🛠 Meta-tooling — ChatGPT Review MCP

v2.96: **0 D-01 fires.** T-MCP-02 cum **~86 unchanged** v2.96. L46 NOT exercised v2.96 (no D-01). L62 NOT exercised v2.96. State-capture exceptions v2.96: 0 (cum 1). Close-the-loop UPDATEs v2.96: 0. **22 outstanding unchanged net.**

---

## 🤖 Cowork automation (D182)

**v2.96 update:** Cron 82/83/85/86 firing normally. **Cron 85 first post-cc-0017e natural fire CLOSED-PASS v2.93** unchanged. V-C3 signal-production CLOSED-PASS v2.92 carry unchanged. **Cowork brief lifecycle gating WARN** — core rank 1 carry; directive explicitly preserved as open v2.96.

---

## 🟡 Active

| ID | Item | Priority | Status | Owner | Next action |
|---|---|---|---|---|---|
| **Dashboard slice 4A — `dashboard-status-strip-copy-links-v1`** | StatusStrip copy + linkification + stuck-jobs link (precedence-gated) | RECORDED v2.96 | **CLOSED-VISUAL-PASS** at `cd0240265507035cc93b8fb95927593f7c6b0da1` | n/a (recorded) | n/a |
| **Dashboard slice 4B — `dashboard-drafts-count-clarity-v1`** | Overview "Drafts to review" shows "Showing N of M drafts" | RECORDED v2.96 | **CLOSED-VISUAL-PASS** at `f5a980fea3a8411823285501307c2a52b3cf3de0`. CCB observed `Showing 10 of 53 drafts`; M matched StatusStrip `53 drafts to review`. | n/a (recorded) | n/a |
| **Top alert bar count reconciliation (UI-copy/linkification scope)** | Was rank D1 v2.95 (P2 backend-adjacent). Root cause: copy/semantics, not cache/backend defect. | RECORDED v2.96 | **CLOSED for UI-copy/linkification scope** by slices 4A + 4B. | n/a (recorded) | n/a |
| **Backend/shared-metrics refactor** | Deeper scope behind v2.95 count mismatch. Should both surfaces share a single metrics service? | **DEFERRED carry v2.96** | OPEN. Not actively ranked. | n/a | When separately directed. |
| **Dashboard slice 1 — `dashboard-nav-and-ops-copy-v1`** | Sidebar nav + /operations subtitle | RECORDED v2.95 | **CLOSED-VISUAL-PASS** at `af60953` | n/a (recorded) | n/a |
| **Dashboard slice 2 — `dashboard-operations-usability-v1` + remediation** | Save guardrail + FAB severity default + Overview deep-links | RECORDED v2.95 | **CLOSED-VISUAL-PASS** at `de4501b` + `37008e5` | n/a (recorded) | n/a |
| **Dashboard slice 3 — `dashboard-roadmap-phases-correction-v1`** | 4 D-FR-RECON-001 §4 corrections + layout + "Stop Claude" investigation | RECORDED v2.95 | **CLOSED-VISUAL-PASS** at `991a92b`. "Stop Claude" overlay confirmed external/non-app. | n/a (recorded) | n/a |
| **Mobile/narrow Roadmap layout verification** | Visual-audit browser runtime overrode `resize_window` | **P3 carry v2.95** | OPEN. Not blocking. | CCD or PK | Real-device verification. |
| **Cowork brief lifecycle gating WARN — `nightly-health-check-v1`** | Reframed v2.94; ready reset complete; convention patched. Directive explicitly preserved as open v2.96. | **P2 carry, core rank 1 (unchanged from v2.94/v2.95)** | OPEN. Closure waits on PK observation of next 16:00 UTC fire. | chat → PK | Observe next 16:00 UTC fire. |
| **3 no-fire scheduler days — `nightly-health-check-v1`** | 2026-05-16, 2026-05-18, 2026-05-19 | **P3 secondary follow-up** | OPEN. Distinct from core rank 1. | chat → PK | Read-only probe. |
| **cc-0016 friction-capture-evidence — Stage A** (Wave 8) | Applied 2026-05-20 v2.97; migration `cc_0016_a_attachments_schema_and_bucket` via `apply_migration` after D-01 third-fire approval `9eb35144-...` | **P2, ✅ APPLIED/CLOSED v2.97** | APPLIED. 6 V-checks PASS; V-A5 deferred to Stage B. 10 mutations atomic. 0 deviation from D-01 scope. | — | Stage B is next (see core rank 2). |
| **cc-0016 friction-capture-evidence — Stage B (attachment RPC + operator authorization)** (Wave 8) | Stage A APPLIED v2.97; Stage B is the next ranked action | **P2, core rank 2 v2.97 (reframed from "Stage A")** | NOT STARTED. RPC/Server Action contract + per-event operator authorization in application layer required before close. | PK → chat | When PK directs. |
| **Wave 0f scoping** | Brief-authoring only; opportunistic during Gate 11 | **P3, core rank 3 (unchanged)** | NOT STARTED. | chat → PK | When PK directs. |
| **Platform Reconciliation View brief** | Deferred per D-FR-RECON-001 §7.D | **P2 carry, core rank 4 (unchanged)** | NOT STARTED. | PK → chat | When PK directs. |
| **5-row close-the-loop batch / Pre-sales / `purge_test_case` helper case_history extension** | 22 outstanding CCH + 1 T-MCP-05 meta + Pre-sales 3-clock criteria + helper coverage gap | **P2/P3 carry, core rank 5 (unchanged)** | OPEN. | chat → PK | When PK directs. |
| **Music library activation** | video-worker v3.0.0 env-var gated | P2 carry | PENDING PK. | PK + chat | Bucket + tracks + env + smoke. |
| **vchecks.md V-B4 doc patch** | Correct V-B4 to 12-param signature | P3 carry | Doc-only. | chat → PK | PK decides scope. |
| **cc-0017c v1.2 doc patch candidate** | Date correction + 3 D-01 references + V-B4 signature correction | P3 carry | Doc-only. | chat → PK | PK decides scope. |
| **cc-0015 friction-pool-view brief** (Wave 7) | Authored PENDING_EXECUTION | P2 (Wave 7; still gated on 1-week window closing 2026-05-26) | DRAFTED commit `9a5dc155`. | chat → PK (Wave 7) | When window closes 2026-05-26. |
| **cc-0016 friction-capture-evidence brief** (Wave 8) | Authored PENDING_EXECUTION | P2 (Wave 8; parallel-executable per D-FR-RECON-001 §3) | DRAFTED commit `f35f8ea4`. | chat → PK (Wave 8) | When PK directs. |
| **Invegent IG cap-throttle planning** | jobid 53 unblock | P2 carry | OBSERVED. | chat → PK | Verify + dry-run + re-enable. |
| **F-YT-PUB-AVATAR-EXCLUSION** | youtube-publisher filter | P2 carry | LOGGED. | chat → PK | Audit m.post_draft. |
| **cc-0013 Dashboard Phase 0** | 7 confirm-defaults | P2 carry | OPEN. | PK | When PK directs. |
| **L-v2.78-a baseline promotion** | Reviewer convergence | P3 carry | 2 occurrences, eligible. | chat → next lesson cycle | Promote alongside L-v2.81-a. |
| **L47 baseline promotion** | list_recent_commits before retry | P3 carry | 1 occurrence. | chat → next session | Consider co-promotion with L-v2.85-e. |
| **L-v2.81-a baseline promotion** | Parallel-session coordination | P3 carry | 2 occurrences, eligible. | chat → next lesson cycle | Promote. |
| **L-v2.83-a promotion** | push_files response file-count verification | **P3 (15+ occurrences v2.96; STRONG CANDIDATE)** | Re-applied at sync close commit v2.96. | chat → next lesson cycle | Promote. |
| **L-v2.84-a/b/c candidates** | Empirical precedence / idempotent REVOKE/GRANT / Path A corrected_action | P3 carry | 1 occurrence each. | chat → next session | Watcher. |
| **L-v2.84-d candidate** | Schema-probe-before-DML | P3 carry (2 occurrences) | Related to L-v2.90-a. | chat → next session | Promote-eligible co-promotion candidate. |
| **L-v2.85-a (HIGH-SIGNAL)** | V-check function signature probe at brief authoring | P3 (4 occurrences; promotion-eligible; not re-exercised v2.96) | Promotion-eligible carries forward. | chat → next lesson cycle | Promote. |
| **L-v2.85-b** | Inline V-check rewrite Path 1 / Path B-prime | P3 (carry; not re-exercised v2.96) | v2.90 ×4. | chat → next session | Watcher. |
| **L-v2.85-c** | SECURITY DEFINER bypass post REVOKE | P3 (1 occurrence) | Not re-exercised v2.96. | chat → next session | Watcher. |
| **L-v2.85-d** | Postgres-owner cleanup migration | P3 (REALIZED v2.86; re-exercised v2.90; not re-exercised v2.96) | Carries forward. | chat → next session | Watcher. |
| **L-v2.85-e** | push_files length budget — split-commit mitigation | **P3 (PROMOTION-CONFIRMED v2.88; 11th consecutive occurrence v2.96)** | Atomic single-commit close v2.96. | chat → next lesson cycle | **PROMOTE.** |
| **L-v2.86-a candidate (HIGH-SIGNAL)** | Pre-apply syntactic validation via transactional EXEC | P3 (PARTIALLY exercised v2.90; not re-exercised v2.96) | Lesson scope clarified v1.1. | chat → next session | Watcher. |
| **L-v2.86-b/c/d/e candidates** | out_-prefix / ROWTYPE quoting / CHECK pre-validation / slash-prefix fixture convention | P3 (b+c exercised v2.90 byte-stable; d+e unchanged; none re-exercised v2.96) | Carry. | chat → next session | Cross-brief carry. |
| **L-v2.88-a candidate** | Identical PK-directive loop | **P3 (2 occurrences v2.88 + v2.91; NOT re-occurring v2.96; watcher)** | Carries forward. | chat → next lesson cycle | Pair-promote with L-v2.85-e. |
| **L-v2.88-b/c/d candidates** | V-Z3 alignment / probe re-verification gate / in-function INSERT pattern | P3 (b realised v2.90; c REALISED v2.90; d realised v2.90; none re-exercised v2.96) | Carry forward. | chat → next lesson cycle | Promote after one more cycle. |
| **L-v2.89-a candidate** | push_files atomic timeout → 1+1+1 fallback | P3 (1 occurrence v2.89; not re-exercised v2.96 — atomic in flight; fallback ready) | Watcher. | chat → next session | Pair-promote with L-v2.85-e. |
| **L-v2.90-a (HIGH-SIGNAL)** | V-D fixture constraint-surface probing | P3 (1 occurrence v2.90; codified documentationally v2.91; not re-exercised v2.96) | Caught 2 defects at v2.90 apply. | chat → next session | Watcher; pair with L-v2.84-d. |
| **L-v2.90-b (HIGH-SIGNAL)** | CREATE OR REPLACE FUNCTION arity change → explicit DROP | P3 (1 occurrence v2.90; codified documentationally v2.91; not re-exercised v2.96) | Caught Defect 3. | chat → next session | Watcher. |
| **L-v2.90-c** | V-D fixture naming purge_test_case regex | P3 (1 occurrence v2.90; codified documentationally v2.91; not re-exercised v2.96) | Caught Defect 4. | chat → next session | Watcher. |
| **L-v2.90-d** | Shadow tables + helper coverage gap audit | P3 (1 occurrence v2.90; codified documentationally v2.91; not re-exercised v2.96) | Caught Defect 5. | chat → next session | Watcher. |
| **L-v2.90-e** | Close-the-loop SQL template schema validation | P3 (1 occurrence v2.90; codified documentationally v2.91; not re-exercised v2.96) | Caught Defects 6 + 7. | chat → next session | Watcher. |
| **L-v2.90-f** | Risk/grants verification clauses match actual lockdown scope | P3 (1 occurrence v2.90; codified documentationally v2.91; not re-exercised v2.96) | Caught Defect 8. | chat → next session | Watcher. |
| **Brief v1.2 doc patches (cc-0017a/c)** | Combined defects + lesson framing | P3 carry | DRAFT scope. | chat → future | Single doc patch when PK greenlights. |
| **Minor doc patches** (cc-0010A/0011/0012) | Various | P3 carry | HOLD. | chat → future | Doc-only. |
| **F-K-SCHEMA-REGISTRY-R-STALE-DESCRIPTION + L34 audit** | 3 geography rows | P3 carry | OPEN. | chat → future | Cleanup brief. |
| **AI cost view** | `vw_ai_cost_monthly` | P3 quick win | Carry. | chat → future | DDL + tile. |
| **Publisher latent config** | verify_jwt = false doc patch | P3 carry | OPEN. | chat → future | Single-file commit. |
| **M8b separate brief** | Function rename | P3 carry | NOT AUTHORED. | PK → chat | When PK directs. |
| **94-row un-publishable legacy cohort** | SQL filter per cc-0007 | P3 carry | LOGGED. | PK → chat | If PK directs. |
| **F-CRON-AUTO-APPROVER-SECRET-INLINE** | Cron jobid 58 secret | P2 sec OPEN | PK approval gate. | chat → future | PK authorisation. |
| **morning-inbox-sweep-v1** | PK personal-email triage | P3 carry | DRAFT exists. | PK → chat | PK reviews. |
| **22 escalated m.chatgpt_review rows** | 21 CCH + 1 T-MCP-05 meta | P3 carry gated | Untouched per CCH. | chat → future PK | Hold. |
| **Memory cap hygiene** | 19/30 (11 free) | P3 carry | — | chat → future | As needed. |
| **Parallel agent coordination (L47)** | informational | P3 carry | No interference v2.96. | chat → future | Passive. |
| **Other carries** | Dashboard mobile / F-PUB-009 / CFW dead drafts / Vault service_role_key / 00_overview / F-AAP-NEEDS-REVIEW / F-AI-WORKER-PARSER-SKIP-BUG / 4× F-CRON-*-STALE / Emergency redeploy / f4a0dd85 health-check / feature branch `feature/cc-0009-stage-b-ef-source` / 3 pre-v2 forensic rows / Localhost FAB cleanup / 3 v2.77 D-01 close-the-loops | P2/P3 various | Unchanged from v2.86-v2.95. | various | various |

**Closed v2.96:**
- **Top alert bar count reconciliation (UI-copy/linkification scope)** — was rank D1 v2.95 → **CLOSED** by slices 4A + 4B ship.
- **Dashboard slice 4A** → RECORDED-CLOSED-VISUAL-PASS.
- **Dashboard slice 4B** → RECORDED-CLOSED-VISUAL-PASS.

**Spawned v2.96 (deferred carry):**
- **Backend/shared-metrics refactor** — the deeper scope behind v2.95 count mismatch. Deferred unless separately directed; not actively ranked.

**Promoted v2.96:** Dashboard D-ranks D2→D1, D3→D2, D4→D3, D5→D4 after D1 closure.

**Closed earlier:** v2.95 dashboard slices 1–3 + PHASES 46-streak deferral + "Stop Claude" investigation; v2.93 Reconciliation daily cadence diagnostic; v2.92 Health_check V-C3; v2.91 cc-0017e v1.1 8-item doc patch; v2.90 cc-0017e apply; v2.89 cc-0017e v1.1 column-name patch; v2.88 Wave 0e brief authoring; v2.87 cc-0017d v1.1 doc patch; v2.86 cc-0017d apply; v2.85 cc-0017c apply; v2.84 brief authoring + 2× D-01; v2.83 cc-0017b v1.1 doc patch; v2.82 cc-0017b apply; v2.81 cc-0017a apply; v2.80 cc-0017a authoring; v2.79 PK approval gate.

---

## 💼 Personal businesses

- **Crazy Domains refund + clean-up follow-up** (carry from v2.51) — PK manual. Re-check next session.

*(Standing P0 to ask at next session start.)*

---

## 🌱 Future ideation

Unchanged from v2.76-v2.95.

---

## 📌 Backlog

**v2.96 state changes:**
- **Dashboard slices 4A–4B RECORDED v2.96** as completed visual/operator work (cross-repo state recording).
- **Top alert bar count reconciliation CLOSED v2.96** for UI-copy/linkification scope (was rank D1 v2.95).
- **Backend/shared-metrics refactor** added as deferred carry (not actively ranked).
- Dashboard D-ranks shifted: D2→D1, D3→D2, D4→D3, D5→D4 after slice 4 closure.
- Cowork brief lifecycle gating WARN unchanged at core rank 1 — directive explicitly preserved as open.
- cc-0015 / cc-0016 / PRV unchanged — directive explicitly preserved as open.
- Mobile/narrow viewport verification unchanged (P3 carry).
- T-MCP-02 cum ~86 unchanged.
- State-capture exceptions cum 1 unchanged.
- friction.* schema state: unchanged from v2.90-v2.95.
- L-v2.85-e mitigation re-applied **11th consecutive occurrence v2.96** (promotion-confirmed v2.88 carries forward).
- L-v2.83-a re-applied at sync close commit. Cumulative **15+ STRONG**.
- L-v2.88-a NOT re-occurring v2.96. Watcher (2 occurrences total) carries forward.
- L-v2.85-a HIGH-SIGNAL not re-exercised v2.96 (doc-sync only). 4 occurrences, promotion-eligible carries forward.
- L-v2.90-a-f not re-exercised v2.96. Watchers.
- **No decisions.md change v2.96.**

---

## 🧊 Frozen / Deferred

Unchanged from v2.85-v2.95. Plus: **Backend/shared-metrics refactor** added v2.96 as deferred carry.

---

## 🎓 Canonical Lessons

L37–L65 + L-v2.76-a-f + L-v2.78-a + L47 + L-v2.81-a + L-v2.83-a + L-v2.84-a-d + L-v2.85-a-e + L-v2.86-a-e + L-v2.88-a-d + L-v2.89-a + L-v2.90-a-f candidates carried per v2.96.

- **L40 / L41 / L46 / L58 / L62**: not exercised v2.96 (doc-sync only).
- **L-v2.76-a-f**: not re-exercised v2.96.
- **L-v2.78-a**: 2 occurrences (unchanged).
- **L47**: 1 occurrence (unchanged).
- **L-v2.81-a**: 2 occurrences (unchanged).
- **L-v2.83-a**: **15+ occurrences v2.96** (re-applied at sync close commit). STRONG CANDIDATE confirmed.
- **L-v2.84-a/b/c**: 1 occurrence each (unchanged).
- **L-v2.84-d**: 2 occurrences unchanged; related to L-v2.90-a.
- **L-v2.85-a HIGH-SIGNAL**: 4 occurrences (unchanged v2.96).
- **L-v2.85-b**: 4× v2.90; not re-exercised v2.96.
- **L-v2.85-c**: 1 occurrence (unchanged).
- **L-v2.85-d**: REALIZED v2.86 + re-exercised v2.90; not re-exercised v2.96.
- **L-v2.85-e**: **PROMOTION-CONFIRMED v2.88; 11th consecutive occurrence v2.96**.
- **L-v2.86-a (HIGH-SIGNAL)**: PARTIALLY exercised v2.90; not re-exercised v2.96.
- **L-v2.86-b/c**: exercised v2.90 byte-stable; not re-exercised v2.96.
- **L-v2.86-d/e**: unchanged.
- **L-v2.88-a**: 2 occurrences (v2.88 + v2.91); NOT re-occurring v2.96. Watcher.
- **L-v2.88-b**: realised v2.90 (V-Z3 live).
- **L-v2.88-c**: REALISED v2.90 (probe re-verification at apply).
- **L-v2.88-d**: realised v2.90.
- **L-v2.89-a**: 1 occurrence v2.89; not re-exercised v2.96.
- **L-v2.90-a-f**: codified documentationally v2.91; not empirically re-exercised v2.96. Watchers.

All candidates recommended for promotion at appropriate cycle once empirical evidence accumulates. **L-v2.85-e + L-v2.85-a + L-v2.83-a remain the highest-priority promotions at next lesson cycle; L-v2.88-a now eligible (2 occurrences); L-v2.90-a + L-v2.90-b (both HIGH-SIGNAL) join the watch.**

---

## v2.97 honest limitations

- All v2.31–v2.96 limitations apply.
- **V-A5 unverified** — authenticated upload + read round-trip is a manual frontend test in Stage B. Cannot be exercised until Stage B RPC + dashboard UI exist.
- **Stage A RLS policies are bucket-scoped only, not per-event-scoped.** Any authenticated session can read/insert/delete any object in `friction-evidence`. Per-event operator authorization is intentionally pushed to the Stage B RPC/application layer per the brief's single-operator scope. If the deployment ever becomes multi-operator, per-event RLS would need to be added.
- **`attachment_count` column type in the view is `bigint`** (Postgres `SUM(integer)` returns `bigint`). Downstream consumers should not assume `integer`. Flag for cc-0016 v1.0.1 doc patch.
- **First private storage bucket pattern in this project** — 4 pre-existing buckets are all `public=true`. Rehearsal-quality of the private-bucket RLS pattern depends on Stage B/C/D production exercise; L-v2.97-a remains a candidate until that exercise lands.
- **No evidence rows yet** — bucket is empty. Rollback at this point is safe (no data loss); after Stage B introduces uploaded objects, rollback would destroy operator-uploaded evidence.
- **26 outstanding close-the-loop UPDATEs unchanged net from v2.96** apart from the 2 cc-0016 Stage A escalated rows that transitioned this session.
- **No fresh production state change beyond Stage A** v2.97 — no Stage B/C/D/E work, no new migrations, no storage objects, no cron, no EF deploys, no application code edits in either repo.
- **Memory cap 19/30** unchanged.
- **L-v2.97-a is a HIGH-SIGNAL candidate, not a baseline** — needs Stage B/C/D production exercise before promotion-eligible.

## v2.96 honest limitations

- All v2.31–v2.95 limitations apply.
- **Cross-repo state recording only** — chat did not fetch dashboard repo HEAD or independently verify the listed commits. Commit SHAs (`cd0240265507035cc93b8fb95927593f7c6b0da1` / `f5a980fea3a8411823285501307c2a52b3cf3de0`) are recorded per PK directive payload.
- **"VISUAL PASS" reflects CCB operator browser walkthrough**, not automated test coverage. Numbers cited (`Showing 10 of 53 drafts`; `53 drafts to review`) are per directive payload.
- **Closure of top alert bar count reconciliation is scoped to UI-copy/linkification only.** The deeper question — should both surfaces share a single metrics service — remains deferred. If the same operator-confusion vector resurfaces under different copy, the deferred backend refactor would need separate authorisation.
- **Stuck-jobs link in slice 4A is "only visible when precedence permits"** — the precedence rule itself is not described in the directive; chat did not inspect dashboard code. CCD code audit would surface the rule if needed.
- **No fresh production state change v2.96.** friction.* state, T-MCP-02 cum (~86), state-capture exceptions (cum 1), 22 outstanding close-the-loop UPDATEs all unchanged net from v2.95.
- **Cowork lifecycle gating WARN explicitly preserved as open** at core rank 1 — directive did not authorise closure.
- **Gate 11 day count not refreshed v2.96** — chat did not recompute calendar arithmetic this directive.
- **Memory cap 19/30** unchanged.
- **Action_list size at v2.96**: minor net change (ADDITIONS block + dashboard slices 4A–4B Active rows + D-rank shift); compaction not yet warranted.
- **Per-session files v2.96**: 1 — `docs/runtime/sessions/2026-05-20-v2.96-dashboard-slices-4a-4b-recorded.md`.
- **Doc-sync v2.96**: 1-commit atomic per L-v2.85-e baseline (sync_state + action_list + session file in single push). L-v2.89-a fallback (1+1+1) ready but NOT invoked v2.96.
- **Close-the-loop UPDATEs v2.96: 0** (no D-01 fired). 22 outstanding unchanged.
- **State-capture exceptions v2.96: 0**. Cumulative: 1.
- **Production mutations v2.96: 0.**
- **No decisions.md change.**
- **No Wave 0f work started v2.96.**
- **No mid-session compaction event v2.96.**
- **No backend/shared-metrics refactor started v2.96.**

---

## Changelog

- **v2.97 (2026-05-20 Sydney, cc-0016 Stage A friction-capture-evidence APPLIED):**
  - Build arc: pull main (HEAD `63130385`, v2.96) → preflight (bucket / column / policy / constraint / index / view name collisions all 0; 0 running experiment_run; 34 friction.event rows; 29 friction.case rows) → `apply_migration` MCP call for `cc_0016_a_attachments_schema_and_bucket` (10 atomic mutations) → V-A1 + V-A2 + V-A3 + V-A4 + V-A4b + V-A6 PASS via execute_sql (V-A5 deferred to Stage B) → close-the-loop UPDATE on 3 `m.chatgpt_review` rows (6f2b8b1a + f573e684 escalated → resolved; 9eb35144 completed → annotated) → outstanding count 28 → 26 → sync_state + action_list + new session file edits → atomic single-commit push.
  - cc-0016 Stage A APPLIED via D-01 third-fire approval at `m.chatgpt_review` id `9eb35144-5c70-4cc1-8086-e9ec4525bca5` (verdict=agree, action_taken=proceed, risk_level=medium, requires_pk_escalation=false). First D-01 fire (6f2b8b1a) returned partial/high/escalated; second fire (f573e684) returned partial/medium/escalated; Path A corrected_action memo addressed three reviewer pushback points (storage RLS performance + battle-testedness + CHECK constraint cost); third fire returned agree/proceed.
  - 10 mutations created atomically: 1 private `friction-evidence` bucket (5MB, 3 MIME types — no GIF) + 3 storage.objects RLS policies (bucket_id-scoped only; verified no path segmentation) + 1 column `friction.event.attachments jsonb NOT NULL DEFAULT '[]'::jsonb` + 2 CHECK constraints (`friction_event_attachments_is_array`, `friction_event_attachments_max_3`) + 1 partial index `idx_friction_event_has_attachments ON (case_id) WHERE jsonb_array_length(attachments) > 0` + 1 view `friction.case_with_attachment_count` + 1 GRANT statement covering authenticated + service_role.
  - 6 V-checks PASS at apply time: V-A1 (bucket shape), V-A2 (column shape), V-A3 (CHECK rejects), V-A4 (anon deny), V-A4b (authenticated + service_role scoped read on empty bucket), V-A6 (view shape). V-A5 (authenticated upload + read round-trip) DEFERRED to Stage B per directive.
  - Existing-row state after apply: 34 friction.event rows received `attachments='[]'` instantaneously via DEFAULT (no INSERTer code change needed); 29 friction.case rows visible in `friction.case_with_attachment_count` view with all `attachment_count=0` of type `bigint`.
  - 3 D-01 review rows close-the-loop resolved: `6f2b8b1a` + `f573e684` escalated → escalation_resolved_at set + resolved_by='cc-0016-stage-a-apply-v2.97' + action_taken annotated with corrected_action chain; `9eb35144` completed → resolved_by set + action_taken annotated with apply outcome + V-check matrix. Verdict / risk / escalation history preserved on all 3. Outstanding close-the-loop count 28 → 26.
  - Today/Next 5 core rank 2 reframed: cc-0016 Stage A (v2.96) → cc-0016 Stage B (attachment RPC + operator authorization) v2.97. Dashboard D2 unchanged in rank but reframed from generic "backend-gated" to "Stage B-gated".
  - Forward constraints recorded: Stage B cannot close until attachment authorization enforced in RPC/application layer; no lifecycle cleanup or destructive deletion until separately approved with dry-run/report; no dashboard evidence UI until backend Stage B contract is ready.
  - L-v2.85-e re-applied **12th consecutive occurrence** v2.97 (v2.86 → v2.97).
  - L-v2.83-a re-applied at sync close commit. Cumulative **16+ STRONG**.
  - L46 re-exercised (D-01 corrected_action chain culminating in approved review id).
  - L48 re-exercised (single atomic apply_migration call covering DDL + storage + RLS + view + grants).
  - **L-v2.97-a NEW HIGH-SIGNAL candidate**: first private storage bucket pattern shipped in this project. 4 pre-existing buckets all public. Track production exercise across Stage B/C/D for one calendar week before treating pattern as repeatable for PRV evidence or other future projects.
  - **L-v2.97-b NEW minor candidate**: Postgres `SUM(integer)` returns `bigint`. View `attachment_count` is `bigint`. Flag for cc-0016 v1.0.1 doc patch.
  - L-v2.85-a / L-v2.86-a / L-v2.88-a / L-v2.89-a / L-v2.90-a-f not re-exercised v2.97.
  - L40 / L41 / L58 / L62 not exercised v2.97.
  - Production mutations: 1 migration via apply_migration + 3 close-the-loop UPDATEs on m.chatgpt_review. Net schema deltas: +1 column + 2 CHECK constraints + 1 index + 1 view + 1 grant + 1 bucket + 3 RLS policies.
  - No decisions.md change. No mid-session compaction event. No state-capture override.
  - Hard-stop discipline preserved end-to-end: 0 Invegent-dashboard touched; 0 new migrations beyond Stage A; 0 storage objects created or deleted (bucket created empty, remains empty); 0 lifecycle cleanup; 0 cron; 0 EF deployed; 0 Stage B/C/D/E started; 0 application code edits; 0 closure of cc-0015 / PRV / Cowork lifecycle WARN; 0 alteration of reviewer verdict / risk / escalation history (only close-the-loop fields written).
  - Closure budget: ~1.5h v2.97 (preflight + memo + apply + V-checks + close-the-loop + sync close drafting). Trailing-14-day ~33h+.
  - Doc-sync: atomic single-commit per L-v2.85-e baseline (sync_state + action_list + session file).

## Earlier changelog

- v1.0–v2.91: per commit history.
- v2.92 (2026-05-19 Sydney evening): Health_check V-C3 signal-production CLOSED-PASS + Cowork-cadence WARN spawned.
- v2.93 (2026-05-20 Sydney): Reconciliation daily cadence diagnostic CLOSED-PASS + 9-check matrix retired + D-FR-RECON-001 documented.
- v2.94 (2026-05-20 Sydney): Cowork brief lifecycle gating WARN REFRAMED + nightly-health-check-v1 ready reset + recurring-brief lifecycle convention patched.
- v2.95 (2026-05-20 Sydney): Dashboard slices 1–3 RECORDED as completed visual/operator work. Dashboard PHASES 46-streak deferral CLOSED.
- **v2.96 (2026-05-20 Sydney, Dashboard slices 4A–4B RECORDED + top alert bar count reconciliation CLOSED for UI scope):**
  - Build arc: pull main → read v2.95 close state → record directive payload (2 slices + observations + items NOT closed) → edit action_list (header + ADDITIONS + Today/Next 5 + dashboard ranking + Active + status blocks + Backlog + Lessons + Limitations + Changelog) → edit sync_state (index + inline + Next priorities + do-not-touch + footer) → write per-session file → atomic single-commit `push_files` (3 files).
  - Dashboard slice 4A `dashboard-status-strip-copy-links-v1` at `cd0240265507035cc93b8fb95927593f7c6b0da1` — VISUAL PASS. StatusStrip copy + linkification + precedence-gated stuck-jobs link.
  - Dashboard slice 4B `dashboard-drafts-count-clarity-v1` at `f5a980fea3a8411823285501307c2a52b3cf3de0` — VISUAL PASS. Overview "Drafts to review" shows N-of-M wording (CCB observed `Showing 10 of 53 drafts`; M matched `53 drafts to review`).
  - Count mismatch root cause confirmed: copy/semantics, not cache or backend defect.
  - **Top alert bar count reconciliation CLOSED v2.96 for UI-copy/linkification scope** (was rank D1 v2.95).
  - **Backend/shared-metrics refactor** added v2.96 as deferred carry (not actively ranked).
  - Dashboard D-ranks shifted up by one (D2→D1, D3→D2, D4→D3, D5→D4).
  - Cowork brief lifecycle gating WARN UNCHANGED — core rank 1; directive explicitly preserved as open.
  - cc-0015 / cc-0016 / PRV UNCHANGED — directive explicitly preserved as open.
  - Mobile/narrow viewport verification UNCHANGED (P3 carry).
  - 0 D-01 fires; T-MCP-02 cum ~86 unchanged. State-capture exceptions cumulative 1 unchanged.
  - L-v2.85-e re-applied **11th consecutive occurrence** v2.96 (v2.86–v2.96). Promotion-confirmed v2.88 carries forward. Atomic single-commit close.
  - L-v2.83-a re-applied at sync close commit. Cumulative **15+ STRONG**.
  - L-v2.88-a NOT re-occurring v2.96 (cross-repo recording, not directive-loop). Watcher carries forward.
  - L-v2.89-a NOT actively exercised v2.96 (atomic commit in flight; fallback ready).
  - L-v2.85-a HIGH-SIGNAL NOT re-exercised v2.96.
  - L-v2.90-a-f NOT empirically re-exercised v2.96.
  - L40 / L41 / L46 / L58 / L62 NOT exercised v2.96.
  - No new L-v2.96-X candidates surfaced.
  - Production mutations: 0. Net schema deltas: 0. Supabase mutations: 0. apply_migration: 0. Edge-Function deploys: 0. Application code edits (either repo): 0. Backend metric refactor started: 0.
  - No decisions.md change.
  - No mid-session compaction event.
  - No state-capture override.
  - Hard-stop discipline preserved end-to-end: 0 closure of Cowork lifecycle WARN; 0 marking of cc-0015 / cc-0016 / PRV as implemented; 0 Invegent-dashboard edits; 0 application code edits; 0 force-run of cron 85; 0 force-run of `nightly-health-check-v1`; 0 backend/shared-metrics refactor started.
  - Closure budget: ~1h v2.96 (cross-repo state recording; sync close drafting). Trailing-14-day ~35h.
  - Doc-sync: atomic single-commit per L-v2.85-e baseline (sync_state + action_list + session file).
