CLAIMED v6.88 · dash-sched-editor-p1-docs-recovery · main · T1-docs-recovery · 2026-07-31T04:09:47Z

# Result — Dashboard Schedule/Readiness Canonical Reconciliation: T1 Docs Recovery

**Lane:** T1 (docs-only register reconciliation) · **Classification:** SAFETY_GATE (zero production/code change) · **Register version:** v6.88
**Brief:** `docs/briefs/dashboard-schedule-readiness-canonical-brief-v1.md` (the reconciliation brief) recovering `docs/briefs/authoritative-weekly-schedule-editor-phase-1-brief-v1.md` (the Phase-1 build brief being registered)
**Executor:** orchestrator (no subagent build; `db-rls-auditor` verification pass + direct git verification)
**Date:** 2026-07-31 Sydney

---

## What this closes

PK's narrow T1 instruction: recover the two orphaned Phase-1 weekly-schedule-editor documents from the stale, unmerged local branch `cc-sched-editor-p1` onto `main`, verify they still describe live production behaviour, add the missing register pointers, and confirm no other unique branch work is being silently dropped. No dashboard code touched. No IA unification started.

## 1. Files recovered

| File | Source | Verification |
|---|---|---|
| `docs/briefs/authoritative-weekly-schedule-editor-phase-1-brief-v1.md` | branch `cc-sched-editor-p1` @ `9af1100` | sha256 identical between branch blob and working-tree copy: `501985ef0f6e…3b5c4e` |
| `docs/briefs/results/authoritative-weekly-schedule-editor-phase-1-result-v1.md` | branch `cc-sched-editor-p1` @ `9af1100` | sha256 identical between branch blob and working-tree copy: `461edbdc9465…42094f4a` |

Both files were already present, byte-identical, as untracked working-tree content before this lane started (confirmed via `git show cc-sched-editor-p1:<path> \| sha256sum` vs `sha256sum <path>` — exact match, both files). Recovery = `git add` + commit of exactly these two paths onto `main`. **No other file was staged.** `cc-sched-editor-p1` (merge-base `3a63e8a`, diverged from `main` both directions) was never merged or rebased — only these two blobs were carried across, deliberately avoiding the ~240 unrelated migration files that have landed on `main` since the branch was cut.

## 2. Verification: docs match live production behaviour

Independent re-verification against LIVE state (not a re-read of the docs' own claims), performed by a read-only `db-rls-auditor` pass plus direct git ancestry checks:

**Database (project `mbkmaxqhsohbtwsqolns`) — 5/5 PASS:**
1. `c.client_publish_schedule.format_override` — column present, `text`, nullable. PASS.
2. `public.save_week_format_override` — live `pg_get_functiondef` confirms `SECURITY DEFINER`, `SET search_path TO ''`, two-pass fail-closed validation (`COALESCE((platform_support->>platform)::boolean, false)` rejects both explicit-`false` and absent-key), UPDATE gated on `ROW_COUNT<>0`. Grants: only `service_role`/`postgres` have EXECUTE (`information_schema.role_routine_grants` + `pg_proc.proacl`) — no PUBLIC/anon/authenticated. PASS.
3. `public.get_week_format_allocation` — live definition additively carries `format_override`, `effective_format` (`COALESCE(format_override, assigned_format)`), `effective_is_valid` alongside the untouched original fields. PASS.
4. Live `m.materialise_slots` (catalog `pg_get_functiondef`, not the repo migration file) — contains `IF v_rule.format_override IS NOT NULL THEN v_format_pref := ARRAY[v_rule.format_override]; END IF;` positioned after the existing allocator/legacy computation, so it overrides only when set and falls back unchanged otherwise. PASS.
5. Write path exercised — 10 live rows in `c.client_publish_schedule` currently carry non-null `format_override` values (`video_short`, `carousel`, `image_quote`, `text`, `video_long_podcast_clip`). PASS.

Zero discrepancies between the recovered docs' claims and live catalog state.

**Dashboard (`invegent-dashboard`) — confirmed via local worktree `dashboard-wt-w2-planner`:**
- Commit `79e063d1fbab3f7ffff7193fd14c93c3be4c8a22` ("feat(schedule): add Weekly Format Plan tab to /clients (Phase 1)") confirmed an **ancestor of `origin/main`** via `git merge-base --is-ancestor`.
- `components/clients/WeekFormatPlanTab.tsx` confirmed present in `origin/main`'s tree.
- No dashboard file was read, edited, or touched beyond this read-only ancestry/tree check — no dashboard code was modified by this lane.

**Conclusion:** the recovered docs accurately describe the currently-live production implementation, end to end, DB and dashboard.

## 3. Register pointers added

- `docs/00_sync_state.md` — new top entry **v6.88** (inserted above the previous v6.87 top entry; v6.14–v6.87 not amended).
- `docs/00_action_list.md` — new **current marker v6.88**; the prior v6.87 current-marker line demoted to a `Previous marker` line, unedited in content.

Version chosen per `claim-stub.mjs`: register head was v6.87 (sync_state/action_list agree); a separate reserved block exists ahead at v7.x (PK-authorized, unrelated cc-0081-family work per prior CCF-04 correction) — this lane is a normal sequential cut, **v6.88**, not a continuation of that reserved block. `claim-stub` output recorded the proposal; this stub line (top of file) is the human-written claim per Option A of the protocol.

## 4. Schedule editing vs readiness/capability visibility — recorded as two separate, jointly-sufficient surfaces

Per the canonical reconciliation brief (`dashboard-schedule-readiness-canonical-brief-v1.md`): this Phase-1 lane (schedule *editing* — setting a weekly format per slot) and `cc-0088`'s Client Production Readiness Queue (v6.78, LIVE — platform×format *readiness*, blocked-capability reasons, Asset Gap routing, evidence/proof-window status) are **two distinct, already-live dashboard surfaces that jointly satisfy the current operator outcome**. Neither needs to be rebuilt or merged into the other to close PK's stated outcome; whether they should be visually unified into one IA surface is a separate, not-yet-authorized product question (named, not started — see below).

## 5. Portfolio-mix / repetition-controls exclusion — preserved

Restated unchanged from `docs/briefs/results/creatomate-global-capability-map-v2-delta.md:31` and `docs/00_action_list.md` v6.78's own carry note: Template Portfolio Mix / Repetition Controls stay **explicitly PK-paused** — no governed CE mechanism (portfolio-weight policy) exists yet. This lane did not touch, imply progress on, or shorten that pause. General, project-wide exclusion, not domain-specific.

## 6. Confirmation: `cc-sched-editor-p1` remaining unique work

**NOT fully empty — reported honestly, not silently closed.** `comm` between `git ls-tree -r cc-sched-editor-p1` and `git ls-tree -r main` shows 9 branch-unique files total; the 2 docs recovered here account for 2 of the 9. The remaining **7 files are still unique to the branch** and are explicitly OUT of this T1 docs-only scope:

- `supabase/migrations/20260727100000_p1a_schedule_format_override_surface.sql`
- `supabase/migrations/20260727100100_p1c_materialise_slots_honour_format_override.sql`
- `docs/briefs/artifacts/p1-apply-deploy-packet-v1.md`
- `docs/briefs/artifacts/p1-base-get_week_format_allocation-live.sql`
- `docs/briefs/artifacts/p1-base-materialise_slots-live.sql`
- `docs/briefs/artifacts/p1a-rollback.sql`
- `docs/briefs/artifacts/p1c-rollback.sql`

These are the repo-record of the migrations already applied live (verified above) — the production DB is unaffected either way, but `main`'s git history currently has **no record** of the migration SQL that produced its own live schema (the `migration-ledger ≠ git history` failure mode). All 7 are already present, byte-identical, as untracked working-tree content (same origin as the 2 docs), so recovering them later is a repeat of the same low-risk mechanical process — just not authorized in this pass, which was scoped to "the two documents" only.

**`cc-sched-editor-p1` should NOT be deleted yet** — it is the only remaining reference copy of those 7 files' history until they are separately recovered or the working-tree untracked copies are committed some other way.

## 7. Commit / push evidence

See below (filled after commit).

---

## Stop condition

Report per this template, then stop. No further action without a fresh PK instruction — in particular, no recovery of the 7 remaining branch-unique files, no dashboard code change, no IA unification, without a separate named gate.
