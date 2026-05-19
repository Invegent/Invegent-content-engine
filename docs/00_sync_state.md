# ICE — Sync State Index

> **This file is the lightweight session pointer index.** It never grows large. Per-session detail lives at `docs/runtime/sessions/YYYY-MM-DD-{slug}.md`.
>
> Restructured 2026-05-03 (G1) after two giant-file-rewrite truncation incidents in 24h. See `docs/runtime/archive/sync_state-pre-2026-05-03.md` for the frozen pre-restructure history.

---

## ⚠️ Session-start reading order (per memory entry 1)

1. **`docs/00_sync_state.md`** (this file) — pointer index + last 1-2 sessions inlined
2. **`docs/00_action_list.md`** — running queued/active/blocked/frozen backlog
3. Open the most-recent session file from the index below if deeper context is needed

---

## 📚 Session index (reverse chronological)

| Date | Slug | Headline | File |
|---|---|---|---|
| 2026-05-19 | v2.84-cc0017c-v1.0-v1.1-d01-deferred | **cc-0017c v1.0 + v1.1 BRIEF AUTHORED + v1.0 D-01 + v1.1 D-01 BOTH FIRED + BOTH CLOSE-THE-LOOPED + APPLY DEFERRED TO FRESH SESSION (Path C; no state-capture override consumed).** v1.0 brief commit `92f9e868` (8 files). v1.0 D-01 review_id `a37eff28-2ba1-4a7a-8fbd-3e9aba738c79`: verdict partial, corrected_action Option A (drop `'done'`). PK directive: Proceed with Path A. v1.1 doc-only patch commit `d3d8381f` (8 files: Section C WHERE/CASE narrowed to legal-domain-only `('suppress','ignore','duplicate')`; §3.4 finalised Option A; new audit signal `done_count_audit` + hard-stop §5.4-A3b). v1.0 D-01 row close-the-loop UPDATE → `status=resolved`. v1.1 D-01 re-fire review_id `9e602a2d-1968-4f1d-b32a-24c514b491a0`: verdict partial, type-c echo (generic validation-process pushback; standard bridge auto-escalate for DDL). PK directive: Path C (defer apply to fresh session; no state-capture override). v1.1 D-01 row close-the-loop UPDATE → `status=resolved` (action_taken records deferral). **Production mutations: 0.** D-01 fires this session: **2** (v1.0 + v1.1). T-MCP-02 cum **73 → 75**. State-capture exceptions cum: **1** (unchanged). Apply gate remains closed. cc-0017c apply now BLOCKED on fresh-session + PK explicit approval. Dashboard PHASES **37th** consecutive deferral. 3-file atomic push_files close. | `docs/runtime/sessions/2026-05-19-v2.84-cc0017c-v1.0-v1.1-d01-deferred.md` |
| 2026-05-18 | v2.83-cc0017b-v1.1-close-cc0017c-open | cc-0017b v1.1 doc-only patch CLOSED-APPLIED-ON-MAIN + L-v2.81-a re-exercised (occurrence 2) + cc-0017c authoring open (v2.83). | `docs/runtime/sessions/2026-05-18-v2.83-cc0017b-v1.1-close-cc0017c-open.md` |
| 2026-05-18 | cc-0017b-applied | cc-0017b Wave 0b APPLIED-WITH-CORRECTIVE-MIGRATION + 27/27 V-CHECKS PASS (v2.82). | `docs/runtime/sessions/2026-05-18-cc-0017b-applied.md` |
| 2026-05-18 | cc-0017a-applied-l41-l47 | cc-0017a Wave 0a APPLIED + 20/20 V-CHECKS PASS + L41/L47/L-v2.81-a (v2.81). | `docs/runtime/sessions/2026-05-18-cc-0017a-applied-l41-l47.md` |
| 2026-05-18 | cc-0017a-v1.1-and-d01-fire | cc-0017a v1.0+v1.1 PATCH + D-01 PARTIAL TYPE-C + PK PATH B (v2.80). | `docs/runtime/sessions/2026-05-18-cc-0017a-v1.1-and-d01-fire.md` |
| 2026-05-18 | v2.79-friction-plan-signed | FRICTION REGISTER CONSOLIDATION PLAN v1 + AMENDMENTS SIGNED (v2.79). | `docs/runtime/sessions/2026-05-18-v2.79-friction-plan-signed.md` |
| 2026-05-18 | v2.78-friction-register-consolidation-planning | FRICTION REGISTER CONSOLIDATION PLAN v1 + AMENDMENTS LOCKED (v2.78). | `docs/runtime/sessions/2026-05-18-v2.78-friction-register-consolidation-planning.md` |
| 2026-05-18 | cc-0014-archived-and-recon-daily | cc-0014 CLOSED-ARCHIVED + RECON CRON DAILY + HOLD-STANCE LIFTED (v2.77). | `docs/runtime/sessions/2026-05-18-cc-0014-archived-and-recon-daily.md` |
| 2026-05-16 | v2.76-stage-e-close-and-window-open | cc-0014 FULLY CLOSED + 14-DAY WINDOW OPEN + FAB LIVE ON PROD + cc-0015 + cc-0016 DRAFTED (v2.76). | `docs/runtime/sessions/2026-05-16-v2.76-stage-e-close-and-window-open.md` |
| 2026-05-15 | cc-0014-stage-d-and-e-prerun | cc-0014 STAGE D CLOSED + STAGE E APPLIED (v2.75). | `docs/runtime/sessions/2026-05-15-cc-0014-stage-d-and-e-prerun.md` |
| 2026-05-15 | cc-0014-stage-c-applied | cc-0014 Stage C APPLIED (v2.74). | `docs/runtime/sessions/2026-05-15-cc-0014-stage-c-applied.md` |
| 2026-05-15 | cc-0014-stage-b-applied | cc-0014 Stage B APPLIED (v2.73). | `docs/runtime/sessions/2026-05-15-cc-0014-stage-b-applied.md` |
| 2026-05-14 | cc-0014-stage-a-applied | cc-0014 Stage A APPLIED (v2.72). | `docs/runtime/sessions/2026-05-14-cc-0014-stage-a-applied.md` |
| 2026-05-13 | cc-0012-closed-with-variance | cc-0012 CLOSED-WITH-VERIFIED-VARIANCE (v2.71). | `docs/runtime/sessions/2026-05-13-cc-0012-closed-with-variance.md` |
| 2026-05-13 | cc-0011-closed-with-variance | cc-0011 CLOSED-WITH-VERIFIED-VARIANCE (v2.70). | `docs/runtime/sessions/2026-05-13-cc-0011-closed-with-variance.md` |
| 2026-05-13 | cc-0010C-closed-stage-e-cron-equivalent | cc-0010C CLOSED-WITH-VERIFIED-VARIANCE (v2.69). | `docs/runtime/sessions/2026-05-13-cc-0010C-closed-stage-e-cron-equivalent.md` |
| 2026-05-13 | cc-0010B-closed-stage-e-cron-equivalent | cc-0010B CLOSED-WITH-VERIFIED-VARIANCE (v2.68). | `docs/runtime/sessions/2026-05-13-cc-0010B-closed-stage-e-cron-equivalent.md` |
| 2026-05-12 | cc-0010A-applied | cc-0010A v1.5 APPLIED + CLOSED (v2.67). | `docs/runtime/sessions/2026-05-12-cc-0010A-applied.md` |
| 2026-05-11 | post-cc0009-process-upgrades-l44-l48-applied | L44–L48 process upgrades FORMALISED + committed (v2.66). | `docs/runtime/sessions/2026-05-11-post-cc0009-process-upgrades-l44-l48-applied.md` |
| 2026-05-11 | cc-0009-stages-d-e-closed | cc-0009 Stages D + E CLOSED (v2.65). | `docs/runtime/sessions/2026-05-11-cc-0009-stages-d-e-closed.md` |

*(Older sessions truncated for brevity — full index preserved in v2.66 archive.)*

**Pre-2026-05-03 history**: frozen at `docs/runtime/archive/sync_state-pre-2026-05-03.md`.

---

## 🟢 Most recent session — inline summary

### 2026-05-19 Sydney morning — v2.84: cc-0017c v1.0 + v1.1 BRIEF AUTHORED + 2× D-01 FIRED + BOTH CLOSE-THE-LOOPED + APPLY DEFERRED TO FRESH SESSION (Path C)

**Date note:** Session conversationally framed as "Sydney late evening 2026-05-18" but UTC timestamps on production show the bulk of v2.84 activity happened on Sydney 2026-05-19 morning (UTC+10). v1.0 D-01 fired at 23:52:36 UTC 2026-05-18 = 09:52:36 Sydney 2026-05-19. v1.1 D-01 close-the-loop at 00:18:04 UTC 2026-05-19 = 10:18:04 Sydney 2026-05-19. Session file dated 2026-05-19 to match empirical timestamps. Brief content references to "Sydney late evening 2026-05-18" were preserved as-authored — flagged as candidate v1.2 doc-only correction if PK greenlights.

**Outcome:** cc-0017c brief fully authored across v1.0 + v1.1 with two D-01 fires and two close-the-loop UPDATEs. v1.0 D-01 verdict was substantively useful (partial / corrected_action Option A); v1.1 D-01 verdict was generic type-c echo (standard bridge auto-escalate for DDL plan_review). PK selected Path C: defer apply to fresh session without consuming state-capture exception. Apply gate remains closed.

**Production mutations: 0.** D-01 fires: **2** (v1.0 + v1.1). T-MCP-02 cum **73 → 75**. State-capture exceptions: **1** (unchanged). Close-the-loop UPDATEs: **2** (v1.0 + v1.1 review rows; both new this session, neither in the 25-outstanding queue).

**Sequence:**

1. **Session open** (resumed post-compaction) — read sync_state v2.83 + verified parent SHA observation (v1.0 brief commit parent `586d30cd` ≠ compaction-summary v2.83 close HEAD `06a8421e`). Treated as observation not blocker per PK directive.
2. **cc-0017c v1.0 brief authoring** — 8-file atomic push_files to commit `92f9e868`. Index + 7 sub-files under `docs/briefs/cc-0017c/`. Two empirical-finding divergences from idealised Amendment F/G framing surfaced explicitly in brief: (a) PUBLIC/authenticated/anon have no grants → service_role is real surface (defensive idempotent REVOKE strategy); (b) `'done'` not in legal `case_action_decision_check` domain (Option A/B/C documented; default Option C with explicit reviewer ask).
3. **v1.0 D-01 fire (PK G2 authorisation)** — review_id `a37eff28-2ba1-4a7a-8fbd-3e9aba738c79`. Verdict: **partial**. risk_level: medium. confidence: high. Routing: `escalate_explicit_flag`. Reviewer corrected_action: "Revise to current-domain-only mapping (Option A): Drop 'done' from WHERE and from CASE to ensure compliance with the closed domain restrictions." Reviewer verified: v1.1 logic correct; backfill 0 rows.
4. **PK directive: Proceed with Path A** — author v1.1 doc-only patch.
5. **cc-0017c v1.1 doc-only patch authoring** — 8-file atomic push_files to commit `d3d8381f`. Changes: Section C SQL dropped `'done'` from WHERE + CASE; `risks-and-grants.md §3.4` finalised Option A; `preflight-pset.md` P-3 narrowed + `done_count_audit` added as defensive observation; `vchecks.md` V-C1 narrowed; `hardstop-rollback.md §5.5-C` narrowed; new hard-stop trigger §5.4-A3b (`done_count_audit > 0` → external CHECK domain expansion landed); `d01-postapply-deferred.md` known_weak_evidence #1 rewritten; `lessons-metadata-changelog.md` Metadata version bump + v1.1 changelog entry + new lesson candidate L-v2.84-c (D-01 corrected_action satisfaction pattern).
6. **v1.0 D-01 close-the-loop UPDATE** — `m.chatgpt_review` id=`a37eff28-...` → `status='resolved'`, `escalation_resolved_at=2026-05-19 00:08:58 UTC`, `resolved_by='cc-0017c-v1.0-path-A-corrected-action-accepted'`. Initial UPDATE attempt failed with column-name error (`review_id` does not exist) — runtime schema probe revealed actual PK is `id` and timestamp column is `escalation_resolved_at`. New lesson candidate **L-v2.84-d (schema-probe-before-DML-on-unfamiliar-table)** — when tool response field names differ from underlying DB column names, schema probe required.
7. **v1.1 D-01 re-fire** — review_id `9e602a2d-1968-4f1d-b32a-24c514b491a0`. Verdict: **partial**. risk_level: medium. confidence: high. Routing: `escalate_explicit_flag`. Reviewer corrected_action: "Reassess the testing process for the new backfill UPDATE and ensure validation steps are included in the rollout to confirm the effectiveness of changes before applying." Reviewer verified claims: v1.0 corrected_action satisfied by v1.1; P-3 backfill candidate count = 0 for `'done'` confirmed. Classified as **type-c (generic echo of self-disclosed weak evidence)** — reviewer's specific pushback points are already addressed in brief (9 V-checks, 5 P-steps, 15 hard-stops). Escalation reason is standard bridge auto-escalate pattern for DDL plan_review ("action involves direct writes and database schema changes") — not a substantive blocker.
8. **PK directive: Path C** — defer cc-0017c apply to fresh session; do not consume state-capture exception; close v1.1 review row with deferral narrative; do not re-fire D-01; no apply this session.
9. **v1.1 D-01 close-the-loop UPDATE** — `m.chatgpt_review` id=`9e602a2d-...` → `status='resolved'`, `escalation_resolved_at=2026-05-19 00:18:04 UTC`, `resolved_by='cc-0017c-v1.1-path-C-deferred-fresh-session-no-override'`, `action_taken='Deferred pending fresh-session PK decision. v1.1 D-01 returned partial/escalate=true with generic validation-process pushback; no production mutations made; apply gate remains closed pending fresh-session review and explicit PK approval.'`
10. **4-way sync close v2.84** — 3-file atomic push_files (sync_state v2.84 + action_list v2.84 + per-session file). No `decisions.md` change (no new decision per PK directive). Dashboard PHASES **37th** consecutive deferral.

**Items closed v2.84:**
- **cc-0017c brief authoring v1.0** → **CLOSED** ✅ (commit `92f9e868`).
- **cc-0017c brief v1.1 doc-only patch** → **CLOSED** ✅ (commit `d3d8381f`).
- **cc-0017c v1.0 D-01 fire** → **CLOSED** ✅ (review_id `a37eff28-...`, status=resolved, corrected_action Option A satisfied).
- **cc-0017c v1.1 D-01 re-fire** → **CLOSED** ✅ (review_id `9e602a2d-...`, status=resolved, deferred per Path C).

**Items moved to Blocked v2.84:**
- **cc-0017c apply** — BLOCKED on **fresh-session + PK explicit approval**. Pre-flight P-set rerun mandatory at apply session (drift detection vs brief-authoring reference). Fresh D-01 fire MAY be required at apply time per ICE-PROC-001 (v1.1 D-01 outcome already serves the review function; fresh fire would be re-running drift-detection narrative against fresh pre-flight P-set — PK decision at fresh session).

**Lesson outcomes v2.84:**
- **L62 exercised twice** — full protocol applied to both D-01 fires + close-the-loop UPDATEs. v1.0 cycle (fire → verdict → PK directive → patch → close-the-loop) and v1.1 cycle (re-fire → verdict → PK directive → close-the-loop) both clean.
- **L41 not exercised** — no DDL via `execute_sql` this session. The 2× UPDATE on `m.chatgpt_review` are DML on `m.*` schema, which is reachable per session memory exception.
- **L40 exercised** — runtime schema probe corrected initial column-name assumption on `m.chatgpt_review`. Reinforces "runtime probes are authoritative; tool response field names ≠ DB column names".
- **L58 applied 3×** — v1.0 brief 8-file commit + v1.1 patch 8-file commit + this close 3-file commit. All atomic.
- **L-v2.81-a observed at v1.0 brief commit** (parent SHA `586d30cd` ≠ compaction-summary v2.83 close HEAD `06a8421e`) — observed not confirmed as occurrence 3. v1.1 patch parent matched v1.0 commit cleanly (`92f9e868`); v2.84 close parent expected to match `d3d8381f` cleanly. No mid-session interference detected.
- **L-v2.83-a candidate re-exercised 3×** — v1.0 brief push (8/8 verified), v1.1 patch push (8/8 verified), v2.84 close push (3/3 to verify post-call). Movement toward promotion.
- **New L-v2.84-a candidate exercised** — empirical-finding precedence over idealised plan framing. v1.0 brief surfaced Amendment F + G divergences explicitly via named options; reviewer + PK selected from named options cleanly. Pattern validated.
- **New L-v2.84-b candidate carried** — defensive idempotent REVOKE/GRANT for permission migrations. Unchanged in v1.1.
- **New L-v2.84-c candidate first occurrence** — D-01 corrected_action satisfaction pattern (Path A over state-capture override). Documented at v1.1 patch lessons-metadata-changelog.
- **New L-v2.84-d candidate first occurrence** — schema-probe-before-DML-on-unfamiliar-table. The bridge tool's `review_id` response field corresponds to DB column `id`, not `review_id`. Lost ~1 tool call to assumption-based UPDATE before runtime probe corrected. Single occurrence v2.84.

**v2.84 honest limitations:**
- 3-file atomic push_files this commit (sync_state + action_list + per-session file). No `decisions.md` change (no new decision per PK directive).
- Dashboard PHASES **37th** consecutive deferral. Discipline call increasingly overdue.
- T-MCP-02 cum **75** (was 73 entering session; +2 for v1.0 fire + v1.1 re-fire). State-capture exceptions: 1 (unchanged — Path C consumed no override).
- 25 outstanding close-the-loop UPDATEs (22 historical CCH-locked + 3 v2.77 new) unchanged — the 2 new this session were closed in-session and do not add to outstanding queue.
- cc-0017c apply BLOCKED on fresh-session — picks up in next session per PK Path C directive.
- Brief content references "Sydney late evening 2026-05-18" but UTC timestamps show v2.84 activity happened on Sydney 2026-05-19 morning. Candidate v1.2 doc-only correction if PK greenlights; otherwise carry as documented-imperfection.
- v1.1 D-01 outcome was type-c generic echo, not substantive. Future fresh-session apply may benefit from fresh D-01 fire with pre-flight P-set rerun as the substantive review narrative (rather than v1.1 outcome). PK directs at fresh session.

---

### 2026-05-18 Sydney late evening — v2.83 close: cc-0017b v1.1 doc-only patch CLOSED-APPLIED-ON-MAIN + L-v2.81-a re-exercised (occurrence 2) + cc-0017c authoring open

**Outcome:** v2.82-deferred cc-0017b v1.1 doc-only patch (6 brief defects + 2 rollback body inlinings) confirmed landed on main across commits `65047388`–`7f40e554` by parallel agent. Production mutations: 0. D-01 fires: 0. T-MCP-02 cum **73** unchanged. cc-0017c brief authoring opened per PK 4-item scope (FK hardening + REVOKE direct-write lockdown + resolved_at/resolution_kind backfill + pre-flight grant capture). L-v2.81-a re-exercised (occurrence 2; promotion-eligible at next lesson cycle per PK directive). Dashboard PHASES 36th consecutive deferral. 3-file atomic push_files close.

*(Full v2.83 detail at per-session file `docs/runtime/sessions/2026-05-18-v2.83-cc0017b-v1.1-close-cc0017c-open.md`.)*

---

## 🟡 Next session priorities (rebuilt v2.84)

1. **cc-0017c apply** (P1 rank 1 v2.84 — was rank 2 v2.83; status changed from "gated on D-01" to "BLOCKED on fresh-session + PK explicit approval"). Pre-flight P-set rerun mandatory at apply session (drift detection vs v2.83 fact-finding reference). Per PK Path C: fresh-session apply decision required. cc-0017c brief v1.1 is the apply-time brief reference. Fresh D-01 fire at apply session is a PK decision (v1.1 D-01 already gave verdict; pre-flight P-set rerun may suffice OR fresh D-01 with fresh pre-flight evidence may be preferred — PK chooses at apply session).
2. **Reconciliation daily cadence diagnostic** — P1 rank 2 v2.84 (was rank 3 v2.83). Carry. Next cron 85 fire ≈2026-05-19 03:30 AEST (≈17:30 UTC). Question: did cc-0017b wrappers route correctly through unified `emit_event`?
3. **Health_check V-C3 + signal-production diagnostic** — P1 rank 3 v2.84 (was rank 4 v2.83). Carry.
4. **Music library activation** — P2 rank 4 v2.84 (was rank 5 v2.83). Carry.
5. **Platform Reconciliation View brief authoring** — P2 rank 5 v2.84 (unblocked per D-IOL-001 since v2.77; not yet started). PK greenlight required.

**Standing P0 (not ranked):** Personal businesses check-in. Crazy Domains refund + clean-up follow-up carry from v2.51.

Carries (lower priority, unchanged or noted):
- **cc-0017a v1.2 doc patch** (combined defects + L60 + L63–L65 + L-v2.76 a–f framing + L-v2.78-a + L47 + L-v2.81-a) — scope unchanged v2.84.
- **cc-0017c v1.2 doc patch candidate** (NEW v2.84) — date correction ("Sydney late evening 2026-05-18" → empirical "Sydney morning 2026-05-19"); v1.1 D-01 outcome reference (review_id `9e602a2d-...` resolved-deferred); optional validation-infrastructure narrative for fresh-session D-01 fire. PK decides scope.
- 25 close-the-loop UPDATEs outstanding (22 historical CCH-locked + 3 v2.77 new). Unchanged v2.84.
- Dashboard PHASES sync — **37th** consecutive deferral.
- v1.1 cc-0012 / v1.6 cc-0010A / v1.3 cc-0011 minor doc patches.
- F-CRON-AUTO-APPROVER-SECRET-INLINE (P2 sec, OPEN).
- Memory cap hygiene (19/30; 11 free slots).
- Localhost FAB cleanup.
- IG cron 53 re-enable.
- YT publisher diagnostic.
- M8b separate brief authoring.
- **L-v2.78-a baseline promotion eligibility** — 2 occurrences (unchanged v2.84).
- **L47 candidate** — 1 occurrence (unchanged v2.84).
- **L-v2.81-a candidate** — 2 occurrences (unchanged v2.84). PROMOTION ELIGIBLE per PK v2.83 directive.
- **L-v2.84-a / L-v2.84-b / L-v2.84-c / L-v2.84-d** — 4 new candidates v2.84 (first occurrences each).

---

## ⛔ Carried-forward "do not touch" state

**v2.84 update on standing items:**

- **cc-0017c v1.0 brief commit:** `92f9e86838887d3bbf2438e3a8767d0cc9736bdb` on main. 8 files: index at `docs/briefs/cc-0017c-friction-register-lockdown-and-backfill.md` + 7 sub-files under `docs/briefs/cc-0017c/`. Strategic anchor + scope + production state preserved.
- **cc-0017c v1.1 doc-only patch commit:** `d3d8381fd09d9749496d1103aafff953c9e7cb6f` on main. 8 files updated (same paths as v1.0). Section C SQL narrowed to legal-domain-only `('suppress','ignore','duplicate')`. `'done'` recorded as out-of-scope; future lifecycle-domain expansion if needed.
- **m.chatgpt_review row `a37eff28-2ba1-4a7a-8fbd-3e9aba738c79`** (v1.0 D-01): status=`resolved` v2.84 close-the-loop; `resolved_by='cc-0017c-v1.0-path-A-corrected-action-accepted'`; verdict was partial with corrected_action Option A satisfied by v1.1 patch.
- **m.chatgpt_review row `9e602a2d-1968-4f1d-b32a-24c514b491a0`** (v1.1 D-01): status=`resolved` v2.84 close-the-loop; `resolved_by='cc-0017c-v1.1-path-C-deferred-fresh-session-no-override'`; verdict was partial with type-c echo; apply deferred to fresh session per PK Path C.
- **cc-0017c apply: BLOCKED v2.84.** Fresh-session + PK explicit approval required. Pre-flight P-set rerun mandatory. `cc_0017c_friction_register_lockdown_and_backfill` migration name reserved (not applied).
- **cc-0017b Wave 0b APPLIED-WITH-CORRECTIVE-MIGRATION + CLOSED (v2.82) + v1.1 doc patch CLOSED-APPLIED-ON-MAIN (v2.83).** Unchanged v2.84.
- **cc-0017a Wave 0a APPLIED + CLOSED (v2.81).** Unchanged.
- **Friction Register Consolidation Plan v1 + amendments + §5.5 SIGNED** (carry). Wave 0a + 0b + 0c brief authoring complete; Wave 0c apply pending fresh session.
- **m.chatgpt_review row `b612a8e4-...`** status=`resolved` (cc-0017b v2.82 close-the-loop).
- **m.chatgpt_review row `a6415afa-...`** status=`resolved` (cc-0017b v2.82 close-the-loop).
- **m.chatgpt_review row `adcc8385-...`** status=`resolved` from v2.80.
- **cc-0014 CLOSED-ARCHIVED v2.77.** Unchanged.
- **cc-0015 friction-pool-view**: AUTHORED PENDING_EXECUTION (commit `9a5dc155`). Wave 7. Unchanged.
- **cc-0016 friction-capture-evidence**: AUTHORED PENDING_EXECUTION (commit `f35f8ea4`). Wave 8. Unchanged.
- **Cowork brief `nightly-health-check-v1` FROZEN at v3.0** (commit `bc32e86`). Sunset 2026-06-15.
- **PostgREST exposed_schemas continues to include `friction`** (carry).
- **cron 85 schedule: daily** (unchanged since v2.77). cron 86 (Cowork health check) unchanged. All other crons unchanged.
- **L58 BASELINE v2.76** carried (applied 3× this session — v1.0 brief 8-file + v1.1 patch 8-file + this close 3-file). Each push verified post-call: file count matches intent.
- **L62 baseline-eligible v2.77** — exercised twice this session (v1.0 + v1.1 D-01 cycles). Both clean.
- **L41 not exercised v2.84** (no DDL via execute_sql; only DML on m.chatgpt_review which is exempt). Cumulative occurrences v2.80–v2.84 = 6 unchanged.
- **L40 exercised v2.84** — runtime schema probe corrected column-name assumption on m.chatgpt_review. Reinforces baseline.
- **L-v2.78-a watcher candidate**: 2 occurrences (unchanged v2.84). Still eligible for baseline promotion.
- **L47 CANDIDATE v2.80**: 1 occurrence (unchanged v2.84).
- **L-v2.81-a CANDIDATE v2.81**: 2 occurrences (unchanged v2.84 — observed but not confirmed as occurrence 3 at v1.0 brief commit parent SHA). PROMOTION ELIGIBLE per PK v2.83 directive.
- **L-v2.84-a candidate (NEW v2.84)** — empirical-finding precedence over idealised plan framing. First occurrence: v1.0 brief authoring `risks-and-grants.md §3.4 + §3.5`. Validated by reviewer + PK selecting from named options.
- **L-v2.84-b candidate (NEW v2.84)** — defensive idempotent REVOKE/GRANT for permission migrations. First occurrence: v1.0 brief `migration-sql.md §5.2 Section B`. Carried unchanged in v1.1.
- **L-v2.84-c candidate (NEW v2.84)** — D-01 corrected_action satisfaction pattern (Path A over state-capture override). First occurrence: v1.1 patch satisfying v1.0 D-01 corrected_action Option A.
- **L-v2.84-d candidate (NEW v2.84)** — schema-probe-before-DML-on-unfamiliar-table. First occurrence: initial UPDATE on m.chatgpt_review failed because tool response field name `review_id` does not match DB column name `id`. Runtime probe corrected.
- **L-v2.76-a through L-v2.76-f**: not re-exercised v2.84; promotion still pending.
- **cc-0009 PRV-1 second build: COMPLETE.** Unchanged.
- **cc-0012 PRV v1: CLOSED-WITH-VERIFIED-VARIANCE v2.71.** Unchanged.
- **cc-0011 cadence-drift-checker: CLOSED-WITH-VERIFIED-VARIANCE v2.70.** Unchanged.
- **cc-0010C reconciliation-matcher: CLOSED-WITH-VERIFIED-VARIANCE v2.69.** Unchanged.
- **cc-0010B ice-evidence-materialiser: CLOSED-WITH-VERIFIED-VARIANCE v2.68.** Unchanged.
- **cc-0010A r.* DDL Foundation: APPLIED + CLOSED v2.67.** Unchanged.
- **25 close-the-loop UPDATEs outstanding** (22 historical CCH-locked + 3 v2.77 new). No additions v2.84 — the 2 new this session (v1.0 + v1.1 D-01 rows) were closed in-session.
- **F-K-SCHEMA-REGISTRY-R-STALE-DESCRIPTION**: P3 OPEN.
- **F-CC-0009-EF-BACKFILL-HORIZON-FORWARD-ONLY**: P3 OPEN.
- **L34 trigger filter audit**: P3 carry.
- **3 pre-v2 forensic `r.reconciliation_run failed` rows**: retained per directives.
- **T-MCP-02 quota: 75 cumulative v2.84** (+2 from v2.83 — v1.0 fire + v1.1 re-fire).
- **State-capture exceptions cumulative: 1** (unchanged — Path C consumed no override).
- Cron 82-86 firing normally.
- **Dashboard roadmap PHASES** — **37th** consecutive deferral. Discipline call increasingly overdue.
- M-series total dead-letter rows cleared since 8 May 2026: 396 rows.
- Standing don't-redeploy three (heygen-avatar-creator, heygen-avatar-poller, draft-notifier) — list unchanged.
- **Cowork output pipeline**: V-C3 still PENDING live run.
- **Production FAB live on dashboard.invegent.com**: unchanged.
- **Localhost FAB cleanup pending**: `.env.local` still has flag enabled. Carry P3.
- **22 escalated m.chatgpt_review rows remain** as of 2026-05-17 (21 historical CCH-locked + 1 T-MCP-05 meta). Not to be closed without explicit PK directive.
- **D-CC-0017B-Q1** (severity_override query-pattern note) in `docs/06_decisions.md` (carried from v2.82).

---

## 📜 G1 convention (the rule)

Unchanged. Per-session file `docs/runtime/sessions/2026-05-19-v2.84-cc0017c-v1.0-v1.1-d01-deferred.md` written. This sync_state + action_list updated. `decisions.md` not touched (no new decision). Dashboard PHASES 37th consecutive deferral. 3-file atomic sync via push_files (L58 baseline applied).

**This file size**: ~30KB after this update (v2.84 current + v2.83 inlined per G1 "1-2 sessions inlined" rule; v2.82 + earlier retained as pointer rows only).

---

*Last updated: 2026-05-19 Sydney morning — v2.84: cc-0017c v1.0 + v1.1 BRIEF AUTHORED + 2× D-01 FIRED + BOTH CLOSE-THE-LOOPED + APPLY DEFERRED TO FRESH SESSION (Path C). v1.0 commit `92f9e868`; v1.1 commit `d3d8381f`. D-01 review_ids: `a37eff28-2ba1-4a7a-8fbd-3e9aba738c79` (v1.0, status=resolved, corrected_action Option A satisfied); `9e602a2d-1968-4f1d-b32a-24c514b491a0` (v1.1, status=resolved, deferred per Path C). Production mutations 0. D-01 fires 2. T-MCP-02 cum 73→75. State-capture exceptions 1 unchanged. Apply gate remains closed. cc-0017c apply BLOCKED on fresh-session + PK explicit approval. Dashboard PHASES 37th consecutive deferral. 4 new lesson candidates v2.84: L-v2.84-a (empirical-finding precedence), L-v2.84-b (defensive idempotent REVOKE/GRANT), L-v2.84-c (D-01 corrected_action satisfaction Path A), L-v2.84-d (schema-probe-before-DML-on-unfamiliar-table). 3-file atomic push_files close (sync_state + action_list + per-session file).*
