# ICE — Action List

> **Single active action index for what's queued, in flight, blocked, or frozen.**
> Source-of-truth details remain in sync_state, run states, decisions, briefs, and commits.
> Read at the start of every session alongside `docs/00_sync_state.md`.
>
> Last updated: 2026-05-08 Sydney (v2.54 — video-worker v3.0.0 DEPLOYED (commit `4ae5b5a7`, F-VIDEO-QUALITY-UPGRADE-A-B-C: env-gated music default OFF, 9:16 layout fix, animation polish). verify_jwt regression diagnosed (CLI default flips `true` when no `config.toml`) and recovered same-session via `supabase functions deploy video-worker --no-verify-jwt` (cron jobid 33 401 → 200). Drift round-trip COMPLETED: scan `cb7fe77b-2011-48cf-8ffc-806d63e535aa` 2026-05-08 07:20:56 UTC, video-worker B-FD → A-LE, repo=deploy=3.0.0. Durable `supabase/config.toml` LANDED this turn covering 23 EFs (10 custom-header + 13 service-role). 4 m.chatgpt_review records closed-the-loop (`8bd6ac37`, `fa4322e5`, `ee27dd37`, `4e0e9c00`). YouTube cadence prior-session memory entry RETRACTED (Mon–Fri 5/wk both clients, not "~3-day cadence"). NEW findings: F-CRON-INGEST-STALE (P2), F-CRON-COMPLIANCE-MONITOR-STALE (P2), F-CRON-PIPELINE-AI-SUMMARY-STALE (P2), F-CRON-PIPELINE-DOCTOR-STALE (P2), F-CRON-PG-NET-TIMEOUT-5S (P2), F-CRON-AUTO-APPROVER-SECRET-INLINE (P2 sec). PHASES reconciliation now **10th** carry. Closed v2.54: video-worker verify_jwt durable fix (P3). Previous (v2.53): F-YT-NY-FORMAT-SELECTION P1 closure, ai-worker v2.12.0 deploy, NEW P3 F-YT-PUB-AVATAR-EXCLUSION.)

---

## How this file works

**At session start**, chat reads this file and:
1. Rebuilds the Today / Next 5 view
2. Runs Standing checks (S1–S29)
3. **Verifies D186 closure budget**
4. Asks PK about Personal businesses
5. Surfaces Time-bound items due today/tomorrow

**Standing rule (D-01)**: every production patch + action_list version bump that touches production state goes through ChatGPT cross-check before deploy/commit. **v2.53 application**: 1 D-01 fire this session for production-touching commit (`1ccfe9a2` ai-worker v2.12.0 deploy). Final v2.53 4-way sync close commit is doc-only (no production touch) and per protocol does not require a fire.

**Standing rule (D-186)**: closure work has a hard time budget. 20-finding cap on P0+P1 open items + 4h/week closure floor + 2-week pause trigger.

**Standing rule (D-YT-OAUTH-1, v2.39)**: invegent-dashboard `/connect` first for FB/IG/LI/YT OAuth reconnects.

**Standing rule (D-PREV-16, v2.40)**: F-EF-DRIFT-PREVENTION Option F is approved target design. Stage 1 closed v2.41. Stage 2a closed v2.44. Stage 2a verified end-to-end via S30 v2.47. Stage 2b CLOSED v2.48. Stage 3 CLOSED v2.49. **P1 SECURITY-DEFINER triage CLOSED v2.50** with three sync-only commits. **v2.53 application**: Stage 3 `safe-deploy.sh` gate had its first real use on B-FD class with `--allow-warn` flag — gate honoured; PK directive Option 3 path (manual drift fire post-commit + script with allow-warn) ran cleanly end-to-end with no bypass.

**STANDING RULE (Lesson #62, v2.41 + v2.50 refinement)**: When ChatGPT MCP echoes Claude's self-disclosed weak evidence as objections, default is NOT automatic state-capture override. **v2.50 refinement**: When the corrected_action is **low-cost and testable**, prefer empirical verification over override. When the corrected_action is **non-testable** (vague, tautological, no concrete acceptance criteria), override remains the default with PK approval as state-capture exception per existing protocol. **v2.53 application**: D-01 fire #1 for ai-worker v2.12.0 deploy returned clean agree / 0 pushback / 0 escalation; no test of the rule needed this session.

**STANDING RULE (Lesson candidate #68, v2.43)**: All fired writes must be tracked inline.

**STANDING RULE (v2.46 — Dashboard Architecture Review)**: All architecture-level decisions live in `docs/dashboard-review-2026-05/`. Reopen triggers in `11_final_consolidation.md` §11.7. Amendment-doc protocol at `docs/dashboard-review-2026-05/amendments/`.

**STANDING RULE (v2.47 — Documentation framing)**: Sync_state framing of cron timing always anchors to **UTC clock-time + Sydney clock-time** for the upcoming fire window, not "tonight" without qualifier.

**STANDING RULE (v2.48 — Pre-flight discovery as standard CC pattern)**: §1.5-style pre-flight discovery (verify route convention, auth gate, UI library, schema column names, against actual repo + database before coding) is now the default brief pattern for any CC dashboard/portal/web/script work.

**STANDING RULE (v2.50 — Acceptance integrity)**: Acceptance is not complete until the actual review artifact is received and reviewed, regardless of artifact type. A "looks good" / "passed" / "matches" signal alone is NOT sufficient to declare acceptance. Chat does not advance state, close items, or trigger sync close on the basis of an unverified summary. **v2.53 application**: Production-touching commit `1ccfe9a2` verified post-push by re-fetching landed file content via GitHub MCP — blob SHA `84da0e7a…` matched expected exactly, size 58063 B matched, all 6 edits visible. Live deploy verified via GET endpoint returning `version: ai-worker-v2.12.0`. Drift round-trip closed via post-deploy manual fire showing Class A-LE. No acceptance asserted on summary signal alone.

---

## 📊 Closure budget tracking (per D186)

| Metric | Current | Limit | Status |
|---|---|---|---|
| Open findings + investigations (P0+P1) | ~4 (was ~5 v2.52; F-YT-NY-FORMAT-SELECTION P1 closed) | 20 | ✅ within budget |
| Trailing-14-day closure hours | ~56.5h | 8.0 floor | ✅ above floor |
| Pause trigger active? | NO | — | New automation authoring still allowed |

**This session's closure hours: ~2.5h** (investigation + code patch + D-01 fire + commit + manual drift fire + Windows env survey + safe-deploy.sh `--check-only` + live deploy + GET verify + post-deploy drift + 4-way sync close).

**Day total v2.53: ~2.5h.**

**State-capture exception count v2.53: 0** (D-01 fire #1 returned clean agree; no escalation, no override).

---

## ⭐ Today / Next 5 — REBUILT v2.53

> **Last rebuilt:** 2026-05-08 Sydney (v2.53).
> **F-YT-NY-FORMAT-SELECTION closure removed it from the queue.** Top 3 reordered.

| Rank | Item | Priority | Why now | Next action |
|---|---|---|---|---|
| 1 | **Dashboard Architecture Review Phase 0 prerequisites** | **P1 TOP** | Unchanged from v2.52. First chat-actionable P1 after F-YT-NY closure. | PK confirms 7 default-blockers via `docs/briefs/cc-0001-dashboard-phase-0-defaults.md`. M5–M8 reconciliation independent. |
| 2 | **AI cost view** | P3 quick win | Promoted from Top 3 → Top 2 by F-YT-NY closure | Author `vw_ai_cost_monthly` on `m.ai_job` (read-only DDL) + add NOW dashboard tile. ~1h estimate. |
| 3 | **M6 Phase A** | P1 carry | NEWLY UNBLOCKED v2.50; promoted from "carries" → Top 3 by F-YT-NY closure | 108 historical Bug 3 dead-letter; coordinate with M-09-03 view definition. |
| 4 | **Personal businesses check-in** | P0 standing | Carry from v2.52: Crazy Domains refund follow-up | PK reports any time-sensitive items + Crazy Domains clean-up status. |
| 5 | **morning-inbox-sweep-v1 brief amendment** (carry from v2.51) | P3 | PK held for cool-headed amendment | PK reviews drafted brief; proposes amendments next session; chat applies + flips status=review_required; PK schedules in Cowork. |

**Carry-forward unchanged from v2.52 except for the F-YT-NY closure and the Top 3 reorder.**

---

## 🟢 F-EF-DRIFT-PREVENTION — STATUS BLOCK (unchanged from v2.52)

**Stage status:**
- Stage 1: CLOSED v2.41
- Stage 2a: CLOSED v2.44; verified end-to-end via S30 v2.47
- Stage 2b: CLOSED v2.48 — `dashboard.invegent.com/ef-drift` live, 5/5 SQL + 7/7 PK visual PASS
- Stage 3: CLOSED v2.49 — `scripts/safe-deploy.sh` live, A1–A8 PASS. **v2.53 NEW: first real use on B-FD class with `--allow-warn` ran cleanly** (ai-worker v2.12.0 deploy, exit 0).
- P1 SECURITY-DEFINER triage: CLOSED v2.50 — 3 sync-only commits as closure artifacts
- F-INSIGHTS-RPC-MIGRATIONS-MISSING: CLOSED v2.52 — repo-parity migration commit `7555b98a`
- F-HEYGEN-RPC-MIGRATIONS-MISSING: CLOSED v2.52 — repo-parity migration commit `7555b98a`

**Cron status (all live):**
- jobid 80 `drift-check-daily-fire` — `0 17 * * *` UTC, `active=true`. Tonight's fire 17:00 UTC 8 May (~03:00 AEST 9 May Sydney) should re-confirm A-LE on ai-worker.
- jobid 81 `ef-drift-log-retention-90d` — `15 17 * * *` UTC, `active=true`
- 2 manual fires this session (`04c3fd1b` pre-deploy + `3bed87b0` post-deploy) replicated cron jobid 80 SQL verbatim — PK-approved drift fire path. `m.ef_drift_log` grew ~196 → ~294 rows (49 × 2 new scans).

**Adjacent open finding:** None remaining. All RPC migration orphan findings closed v2.52.

---

## 🟢 ICE Dashboard Architecture Review — STATUS BLOCK

**Status:** COMPLETE at v2.46. 12 docs at `docs/dashboard-review-2026-05/`.

**v2.53 update on hard blockers (unchanged from v2.52):**
- ✅ S30 cleared v2.47 — first hard blocker DONE.
- 🔲 M5–M8 reconciliation — second hard blocker still pending.
- 🔲 7 Phase 0 confirmation-blocker defaults — pending PK confirm/override.

**Phase 0 still gated. Remains Top-1 next session priority v2.53.**

---

## 🟢 Tier 1 + M4 + M5 + F-YT-OAUTH-PP queue integrity & stability remediation — STATUS BLOCK

Unchanged from v2.52. M6–M8 still pending. M6 Phase A unblocked since v2.50 (promoted to Top 3 v2.53).

---

## 🔄 Standing session-start checks

S1–S29 unchanged. S30 closed PASS v2.47.

---

## 🔴 Time-bound (calendar-driven deadlines)

Unchanged from v2.52.

---

## 🛠 Meta-tooling — ChatGPT Review MCP (T-MCP-02 quota at 50 of 5)

**v2.53 application**: 1 D-01 fire this session. Cumulative T-MCP-02: 49 → 50. Cumulative T-MCP-08: 2 (unchanged). State-capture exceptions v2.53: **0**.

**Fire ledger this session:**
- Fire #1 (`64230c18`): ef_deploy for ai-worker v2.11.1 → v2.12.0. Verdict agree / proceed / risk=medium / confidence=high. 0 pushback. Clean approve. (Bug analysis, two-part fix decision, and acceptance criteria all acknowledged.)

**Close-the-loop UPDATEs to `m.chatgpt_review`:** v2.53 adds 1 more (cumulative ~24+ pending). Carried as P3 backlog.

---

## 🤖 Cowork automation (D182)

**v2.53 status (carry from v2.52):** `docs/briefs/morning-inbox-sweep-v1.md` committed status=draft per PK hold. NOT scheduled in Cowork until PK amends and flips status=review_required.

**Existing Cowork status (unchanged):** Weekly reconciliation Mon 7am AEST + ICE Nightly Health Check daily 02:00 AEST. `docs/audit/health/2026-05-06.md` still absent — carry as P3 follow-up. Sunset review: 12 May 2026.

---

## 🟡 Active

| ID | Item | Priority | Status | Owner | Next action |
|---|---|---|---|---|---|
| **Dashboard Architecture Review Phase 0 prerequisites** | 7 confirm-defaults + M5–M8 reconciliation | P1 TOP (v2.53) | S30 cleared v2.47; M5–M8 + defaults pending | PK | Review §11.4 items 3–9; confirm defaults via `docs/briefs/cc-0001-dashboard-phase-0-defaults.md`. M5–M8 reconciliation independent. |
| **AI cost view** (carry from v2.49) | `vw_ai_cost_monthly` view on `m.ai_job` + NOW dashboard tile | P3 → Top 2 (v2.53) | Backlog | chat → next session | Author view DDL (read-only); add NOW dashboard tile. ~1h estimate. |
| **M6 Phase A** | 108 historical Bug 3 dead-letter | P1 | NEWLY UNBLOCKED v2.50; Top 3 (v2.53) | PK → chat → next session | Coordinate with M-09-03 view definition. |
| **F-YT-PUB-AVATAR-EXCLUSION** (NEW v2.53) | youtube-publisher `.in()` filter excludes `video_short_avatar` | P3 | LOGGED, no chat action | chat → future (passive) | Validator: any future NY×YT or PP×YT slot where advisor picks `video_short_avatar` will reveal it. Fix when triggered: add `video_short_avatar` to publisher allow-list OR add explicit avatar-handling branch. |
| **morning-inbox-sweep-v1 brief amendment** (carry from v2.51) | PK personal-email morning triage | P3 | DRAFT exists at `docs/briefs/morning-inbox-sweep-v1.md` (status=draft); held by PK pending amendment | PK → chat | PK reviews drafted brief; proposes amendments next session; chat applies amendments + flips status=review_required; PK schedules in Cowork. |
| **Dashboard mobile responsiveness — system-wide** | Whole-dashboard gap | P3 | OBSERVED | chat → dedicated session OR Phase 1+ | Either dedicated session OR roll into architecture review Phase 1+ build sequence. |
| **47 v4 mismatch queue rows** (M6 Phase B) | Pre-M4 legacy artifacts | P3 | Sequenced after M6 Phase A | Backlog | After M6 Phase A. |
| **F-PUB-009 V3-V5 + 7-day flow** | Forward acid-test | P2 | Passive monitoring | chat → next session | Continue passive monitoring. |
| **Invegent IG cap-throttle planning** | jobid 53 unblock readiness | P3 | OBSERVED | chat → T05 unblock session | Plan cap-throttle / rate-limit handling. |
| **CFW post-ai-worker dead drafts** | Drafts dying after AI succeeds | P3 | OBSERVED | chat → future session | Investigate downstream pathway. |
| **Vault `service_role_key` naming hygiene** | 15-char value; misleadingly named | P3 | OBSERVED | chat → future session | Read-only scope-check; rename if appropriate. |
| **`docs/audit/health/2026-05-06.md` follow-up** | Cowork 02:00 AEST cron 6 May did not push | P3 | Carried | chat → next session if still absent | Investigate Cowork status. |
| **`00_overview.md` 11-section table reconciliation** | Architecture review changed actual section structure | P3 | Required updates in `11_final_consolidation.md` §11.1 | chat → future session | Update `00_overview.md`. ~15 min. |
| **F-AAP-NEEDS-REVIEW-BACKLOG** | 28 drafts pending review | P2 | Closure target = architecture review Phase 2 B-09-14 | chat → Phase 2 session | After Phase 0 + Phase 1: bulk approve UI in Phase 2. |
| **Dashboard roadmap PHASES reconciliation** | PHASES array stale since 3 May | P3 | Carried v2.45 → v2.54 (**10th deferral**) | chat → dedicated session | Open `app/(dashboard)/roadmap/page.tsx` and bring PHASES + LAST_UPDATED current. |
| **F-AI-WORKER-PARSER-SKIP-BUG V4** | Forward acid-test inconclusive | P2 | Passive monitoring | chat → future | V4 needs natural skip event OR synthetic test. |
| **F-CRON-COMPLIANCE-MONITOR-STALE** (NEW mid-v2.53) | cron jobid 31 calls deployed slug `compliance-monitor` (v1.2.0) but `supabase/functions/compliance-monitor/` does not exist in repo (drift Class D, `repo_path_status=missing`). Cron has no auth header beyond `Content-Type`. | P2 | LOGGED | PK → future session | Decide: re-author repo source to align with deployed body, OR retire the deployed slug + cron. Exclude from `supabase/config.toml` until decision. |
| **F-CRON-INGEST-STALE** (NEW mid-v2.53) | cron jobid 1 calls deployed slug `ingest` (v `ingest-v8-youtube-channel`) but `supabase/functions/ingest/` does not exist in repo. Prior path `supabase/functions/Ingest/index.ts` (capital I) was removed in commit `961482c` 2026-03-08 ("superseded by ingest v75"); lowercase folder never re-added. Drift Class D, `repo_path_status=missing`. Cron uses header `x-ingest-key` (vault secret). | P2 | LOGGED | PK → future session | Same shape as compliance-monitor: re-author repo source OR retire deployed slug + cron. Exclude from `supabase/config.toml`. |
| **F-CRON-PIPELINE-AI-SUMMARY-STALE** (NEW v2.54) | cron jobid 30 (`pipeline-ai-summary-hourly`, `55 * * * *`, active) calls deployed slug but `supabase/functions/pipeline-ai-summary/` does not exist in repo. Per source-recovery commit `8ee27b4` (30 Mar 2026) it was in the deploy-only ghost bucket of 9 functions; never recovered to repo. | P2 | LOGGED | PK → future session | Same shape as F-CRON-INGEST-STALE: re-author repo source OR retire deployed slug + cron. Excluded from `supabase/config.toml`. |
| **F-CRON-PIPELINE-DOCTOR-STALE** (NEW v2.54) | cron jobids 29 (`pipeline-doctor-every-30m`, `15,45 * * * *`, active) and 39 (`pipeline-doctor-log-harvester`, `17,47 * * * *`, active) call deployed slug but `supabase/functions/pipeline-doctor/` does not exist in repo. Same source-recovery ghost bucket as pipeline-ai-summary. **NOT** a rename of `pipeline-diagnostician` (that is a separate newer Claude-powered RCA function introduced in `c039e84`). | P2 | LOGGED | PK → future session | Same shape as F-CRON-INGEST-STALE: re-author repo source OR retire deployed slug + 2 crons. Excluded from `supabase/config.toml`. |
| **F-CRON-PG-NET-TIMEOUT-5S** (NEW v2.54) | Affects cron jobid 33 (video-worker), jobid 44 (heygen-worker), jobid 58 (auto-approver). All three timed out at 2026-05-08 07:30:00 UTC because their `net.http_post` calls omit `timeout_milliseconds`, falling back to pg_net default 5000ms. Functions periodically respond just over 5s, racing the deadline. Cron table records "succeeded" because SQL completes, but HTTP outcome is null. Pre-existing pattern — also seen pre-deploy at 03:00, 03:30, 04:00 UTC same day. | P2 | LOGGED | chat → future session | Defer until after F-EF-DEPLOY-VERIFY-JWT-DURABLE landed (this turn). Independent fix, no dependency. Proposed: `UPDATE cron.job SET command = …` to add explicit `timeout_milliseconds := 30000` for jobid 33, 44, 58. |
| **F-CRON-AUTO-APPROVER-SECRET-INLINE** (NEW v2.54, security) | Cron jobid 58 `auto-approver-sweep` (`*/10 * * * *`) has the `x-auto-approver-key` secret value hardcoded as a literal string inside the cron command body, NOT pulled from `vault.decrypted_secrets` like every other custom-header cron does. Risks: (1) secret visible to any role with `cron.job` SELECT access; (2) secret captured in `pg_stat_statements`/query history; (3) rotation requires editing the cron command (not just rotating the vault entry). | P2 (security) | LOGGED | chat → future session (PK approval required for rotation) | PK to authorise secret rotation; chat refactors cron command via `cron.alter_job` to fetch from vault matching the pattern in jobid 1/4/27/33; verify via pre/post drift. |
| **Music library activation checklist** (NEW v2.54; **amended 8 May doc-only**) | Activates the background music feature shipped (gated OFF) in video-worker v3.0.0. Three steps: (1) create Supabase Storage bucket `post-music` with public-read access; (2) upload 9 mp3 files to exact bucket paths `news/track-1.mp3` … `news/track-3.mp3`, `upbeat/track-1.mp3` … `upbeat/track-3.mp3`, `calm/track-1.mp3` … `calm/track-3.mp3`; (3) set Edge Function env var `VIDEO_WORKER_MUSIC_ENABLED=true`. video-worker v3.0.0 ships music gated OFF; activation requires no second deploy. | P3 (PK action) | PENDING PK ACTION | PK | PK to action when music tracks are ready. **Note (8 May, doc-only amendment):** alternative architecture proposed in `docs/briefs/music-architecture-v0.1-draft.md` (commit `ee17dfa`) — draft research artifact only. Stage 0 provider prompt sandbox + 5 vendor/license confirmations pending (see brief §[Required Confirmations]). Does NOT retire this 9-MP3/video-worker v3.0.0 activation path; both paths stay alive until PK Stage 0 outcome. No build authority — future schema / EF / CRON / deploy work still requires its own brief + D-01 + apply approval per stage. |
| **Emergency redeploy governance question** (NEW v2.54) | The 2026-05-08 emergency `supabase functions deploy video-worker --no-verify-jwt` recovery was executed without a D-01 fire because it was bounded production auth restoration: flag-only change, no source modification, restoring prior production state. Standing rule D-01 requires ChatGPT MCP review before every production patch. Decision needed: should future emergency production-restoration fixes require expedited D-01, or are they exempt when bounded and reversible? | P2 (PK decision) | PENDING PK DECISION | PK | PK rules; chat documents in `docs/06_decisions.md`. |

**Closed v2.54:** video-worker `verify_jwt` durable fix (P3) — landed via `supabase/config.toml` in v2.54 commit. Covers 23 EFs (10 custom-header + 13 service-role). Original chat-side designation: F-EF-DEPLOY-VERIFY-JWT-DURABLE P1. Excluded as stale: `ingest`, `compliance-monitor`, `pipeline-ai-summary`, `pipeline-doctor` (all 4 confirmed missing during pre-flight folder check; corresponding F-CRON-*-STALE findings logged).

**Closed v2.53:** F-YT-NY-FORMAT-SELECTION P1 (commit `1ccfe9a2`).

**Closed v2.52:** insights-worker P1 functional drift (commit `57daf877`); F-HEYGEN-RPC-MIGRATIONS-MISSING (commit `7555b98a`); F-INSIGHTS-RPC-MIGRATIONS-MISSING (commit `7555b98a` — logged + closed same session).

**Closed v2.51:** (none — lightweight session, no closures.)
**Closed v2.50:** P1 SECURITY-DEFINER triage.
**Closed v2.49:** F-EF-DRIFT-PREVENTION Stage 3.
**Closed v2.48:** Stage 2b dashboard drift panel.
**Closed v2.47:** S30.
**Closed v2.46:** Dashboard Architecture Review of 2026-05.
**Closed v2.44:** F-EF-DRIFT-PREVENTION Stage 2a finalisation.
**Closed v2.43:** bef6be96 origin investigation.
**Closed v2.41:** F-EF-DRIFT-PREVENTION Stage 1.
**Closed v2.40:** F-EF-DRIFT-PREVENTION investigation phase.

---

## 💼 Personal businesses

**v2.53 carry from v2.52 (unchanged):**

- **Crazy Domains refund + clean-up follow-up** (carry from v2.51) — PK called CD on 2026-05-08; at least one invoice refund verbally confirmed in progress. Remaining clean-up still PK to action manually:
  1. Cancel Website Builder auto-renewal (saves ~$251/yr ongoing)
  2. Disable Premium DNS auto-renewal (saves $26/yr; move DNS to Cloudflare — free)
  3. Disable Domain Guard on .com auto-renewal (saves $9/yr)
  4. Before Nov 2026: transfer invegent.com to Cloudflare Registrar (~A$15/yr); transfer invegent.com.au to VentraIP or similar (~A$25–35/yr). Total ongoing cost ~A$40–50/yr vs current ~A$326/yr.
  5. Decline the $521/3yr renewal quote from CD.

  **Total annual saving once cleaned up: ~A$286/yr ongoing. Three-year saving: ~A$860.**

  Not chat scope — PK actions manually. Re-check status next session.

*(no other items flagged at v2.53 close — standing P0 to ask at next session start.)*

---

## 📌 Backlog

**v2.53 changes**:

- **CLOSED v2.53**: F-YT-NY-FORMAT-SELECTION P1 (commit `1ccfe9a2`).
- **NEW v2.53**: F-YT-PUB-AVATAR-EXCLUSION P3 — youtube-publisher `.in()` filter excludes `video_short_avatar` from allowed format list. Latent risk: surfaces only if format-advisor picks avatar format for YouTube. HeyGen avatar pipeline still in beta. Fix when triggered: add to allow-list or add explicit branch.
- **PROMOTED v2.53**: AI cost view P3 → Top 2 next session priority (was Top 3 v2.52).
- **PROMOTED v2.53**: M6 Phase A P1 carry → Top 3 next session priority (was carry-forward v2.52).
- **CARRIED v2.53**: Dashboard roadmap PHASES — **9th** consecutive deferral (was 8th in v2.52).
- **CARRIED v2.53**: All v2.52 items unchanged except F-YT-NY closure and Top 3 reorder.

**v2.52 changes** (still active where not closed v2.53): per v2.52.

**v2.51 + v2.50 + v2.49 + v2.48 + v2.47 + v2.46 + v2.45 + v2.44 + v2.43 + v2.42 + v2.41 + v2.40 + v2.39 + v2.38 + v2.37 + v2.36 + v2.35 + v2.34 + v2.33 changes**: per v2.47.

**Carried from v2.31**: per v2.47.

---

## 🧊 Frozen / Deferred

Unchanged.

---

## 🎓 Canonical Lessons

Unchanged from v2.52. Lesson #62 v2.50 refinement intact (not exercised this session — D-01 fire returned clean agree).

---

## v2.53 honest limitations

- All v2.31–v2.52 limitations apply.
- **Memory at 30-edit cap pre-session.** v2.53 update folds carry-forward bits from v2.52 (Crazy Domains follow-up + morning-inbox-sweep-v1 brief status) into a single rolling `recent_updates` entry — both threads still tracked but in compressed form.
- **Dashboard roadmap PHASES still stale** — **9th** consecutive deferral. Risk unchanged from v2.52: roadmap doesn't reflect Stage 2b ship, Stage 3 ship, P1 SD triage closure, insights-worker drift closure, RPC migration orphan closures, OR this F-YT-NY closure. Reconciliation will need a dedicated session.
- **21+ close-the-loop UPDATEs to `m.chatgpt_review`** still pending — v2.53 adds 1 more (this session's D-01 fire `64230c18`); cumulative pending ~24+.
- **F-YT-NY-FORMAT-SELECTION format choice was unverified empirically** — no synthetic NY×YT job fired post-deploy to observe advisor live behaviour. Verification deferred to next natural slot fire (passive validator). The deploy verification chain (GET endpoint + post-deploy drift A-LE) confirms code is live; advisor behaviour confirmation requires actual job fire.
- **CRLF vs LF normalisation artifact**: Local Windows checkout has 950-byte size delta vs GitHub blob due to CRLF line-endings. Deployed binary has CRLF. Drift-checker handles this via `*_hash_normalised` columns. No functional impact but raw hashes will continue to differ from blob SHA until a Linux-native deploy happens.
- **F-YT-PUB-AVATAR-EXCLUSION logged on inference, not observation**. Risk identified during F-YT-NY analysis from code-read of `youtube-publisher.in()` filter. Validator: any future NY×YT or PP×YT slot where advisor picks `video_short_avatar` will reveal it.
- **Push truncation incident**: First `github:push_files` call for ai-worker v2.12.0 was truncated mid-content due to combined output budget across multi-tool turn. Retry in fresh turn with no preamble succeeded. Acceptance integrity verified post-push by re-fetching landed file content. Not a recurring issue but worth flagging — large file pushes should ideally be in their own turn with minimal preamble.
- **No D-01 fire for the v2.53 4-way sync close commit** — doc-only, no production state touch. Documented in protocol notes above.

---

## Changelog

- v1.0–v2.52: per previous changelog.
- **v2.53 (2026-05-08 Sydney, F-YT-NY-FORMAT-SELECTION closure):**
  - **ai-worker v2.11.1 → v2.12.0** — Single-file patch of `supabase/functions/ai-worker/index.ts` via 6 surgical str_replace edits + ~25-line v2.12.0 changelog block (commit `1ccfe9a2`, blob `84da0e7a…`, 58063 B LF). Two-part format-advisor-v1 fix:
    - **Part A (`fetchFormatContext`)**: Opt-in candidate filter. `s[platform] !== true` (was `s[platform] === false`). Excludes any format row missing the platform key in `platform_support` JSONB.
    - **Part B (`callFormatAdvisor`)**: Receives `platform` field via opts; system prompt prepends "Target platform: ${platform}. Choose only formats compatible with ${platform}."
  - **D-01 fire #1** — `64230c18`. action_type ef_deploy. Verdict agree / proceed / risk=medium / confidence=high. 0 pushback. 0 escalation. Clean approve.
  - **safe-deploy.sh `--allow-warn` honoured** — Stage 3 gate authoritative. PK directive Option 3 path: manual drift fire post-commit (scan `04c3fd1b`, ai-worker class A → B-FD), then `safe-deploy.sh ai-worker --allow-warn` (gate prints WARN, exec's `supabase functions deploy ai-worker`, exit 0). First real use of `--allow-warn` path on B-FD class.
  - **Live deploy verified** — GET `/functions/v1/ai-worker` → 200 OK, body `{"ok":true,"function":"ai-worker","version":"ai-worker-v2.12.0"}`.
  - **Post-deploy drift fire** — scan `3bed87b0`. ai-worker class B-FD → A-LE (state_changed=true), normalised hashes match. Round-trip closed.
  - **F-YT-PUB-AVATAR-EXCLUSION (P3) NEW v2.53** — Latent risk identified during F-YT-NY analysis. youtube-publisher `.in()` filter excludes `video_short_avatar` from allowed format list. Logged for passive validation.
  - **Top 3 reordered**: Dashboard Architecture Review Phase 0 prerequisites (P1 TOP, unchanged) → AI cost view (P3 quick win, promoted from Top 3) → M6 Phase A (P1 carry, promoted from carry-forward).
  - **State-capture exception count v2.53: 0**.
  - **Closure budget**: ~2.5h chat. Day total v2.53: ~2.5h. Trailing-14-day ~56.5h above 8.0 floor. ~4 P0+P1 open of 20 cap (was ~5 v2.52).
  - **1 production mutation chat-side**: ai-worker v2.12.0 deploy via authoritative Stage 3 gate. No additional SQL DDL/DML applied beyond the 2 manual drift fires (write to `m.ef_drift_log` only — replicated cron jobid 80 SQL verbatim, PK-approved drift fire path). STANDING_THREE array unchanged (verified pre-deploy: ai-worker NOT in the list). Hold-state respected throughout.
  - **Acceptance-integrity adherence**: Commit `1ccfe9a2` verified post-push by re-fetching landed file content via GitHub MCP. Live deploy verified via GET endpoint. Drift round-trip closed via post-deploy manual fire. No acceptance asserted on summary signal alone.
  - **Carried**: Crazy Domains refund follow-up (Personal businesses); morning-inbox-sweep-v1 brief amendment (P3); Dashboard roadmap PHASES — **9th** consecutive deferral.
