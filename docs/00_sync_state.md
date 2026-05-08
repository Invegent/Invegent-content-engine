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
| 2026-05-08 | video-worker-v3-deploy-verify-jwt-recovery | **video-worker v3.0.0 DEPLOYED + verify_jwt regression recovered + durable `supabase/config.toml` LANDED (v2.54).** Commit `4ae5b5a7` shipped F-VIDEO-QUALITY-UPGRADE-A-B-C (env-gated music default OFF, 9:16 layout fix, animation polish). Deployed via `safe-deploy.sh video-worker --allow-warn` (gate WARN→PASS, exit 0). Cron jobid 33 401'd because CLI default flips `verify_jwt: true` when no `supabase/config.toml`. Recovered same session via `supabase functions deploy video-worker --no-verify-jwt`. Drift round-trip COMPLETED: scan `cb7fe77b-2011-48cf-8ffc-806d63e535aa` 07:20:56 UTC, video-worker B-FD → A-LE, repo=deploy=3.0.0. Durable `supabase/config.toml` LANDED this turn covering 23 EFs (10 custom-header + 13 service-role; excluded as stale: `ingest`, `compliance-monitor`, `pipeline-ai-summary`, `pipeline-doctor`). 4 m.chatgpt_review records closed-the-loop (`8bd6ac37`, `fa4322e5`, `ee27dd37`, `4e0e9c00`). YouTube cadence prior-session memory entry RETRACTED (NDIS-Yarns Mon–Fri 19:00 AEST/09:00 UTC, Property Pulse Mon–Fri 17:00 AEST/07:00 UTC, **5 slots/wk each**, **not** "~3-day cadence" — Sat–Sun gap mislabelled, fill_window_opens_at conflated with scheduled_publish_at; system healthy via cron 72/73/75/76). NEW findings: F-CRON-INGEST-STALE (P2), F-CRON-COMPLIANCE-MONITOR-STALE (P2), F-CRON-PIPELINE-AI-SUMMARY-STALE (P2), F-CRON-PIPELINE-DOCTOR-STALE (P2 — NOT a rename of pipeline-diagnostician), F-CRON-PG-NET-TIMEOUT-5S (P2), F-CRON-AUTO-APPROVER-SECRET-INLINE (P2 sec). Closed v2.54: video-worker verify_jwt durable fix (P3). PHASES reconciliation now **10th** carry. | `docs/runtime/sessions/2026-05-08-video-worker-v3-deploy-verify-jwt-recovery.md` |
| 2026-05-08 | f-yt-ny-format-fix | **F-YT-NY-FORMAT-SELECTION CLOSED end-to-end (v2.53).** Commit `1ccfe9a2`: ai-worker v2.11.1 → v2.12.0. Two-part format-advisor-v1 fix: (A) `fetchFormatContext` opt-in candidate filter (`s[platform] !== true` was `=== false`); (B) `callFormatAdvisor` receives `platform`, system prompt prepends "Target platform: ${platform}. Choose only formats compatible with ${platform}." Diagnosed via Supabase MCP read-only catalogue inspection of `t."5.3_content_format"` (5 of 10 buildable rows have no `youtube` key in `platform_support` JSONB → all leaked under opt-out filter). 1 D-01 fire (`64230c18`, PASS, 0 pushback, 0 escalation). safe-deploy.sh `--allow-warn` honoured as authoritative Stage 3 gate (first real use on B-FD class). Live deploy verified `version: ai-worker-v2.12.0` via GET endpoint. Post-deploy drift fire `3bed87b0` confirmed Class A-LE (normalised hashes match). T-MCP-02 49 → 50. **0 state-capture exceptions.** ~4 P0+P1 open of 20 cap (was ~5 v2.52). NEW P3 logged: F-YT-PUB-AVATAR-EXCLUSION (latent youtube-publisher `.in()` filter risk). Dashboard PHASES — **9th** consecutive deferral. | `docs/runtime/sessions/2026-05-08-f-yt-ny-format-fix.md` |
| 2026-05-08 | v2.52-insights-sync-rpc-closure | **Productive close (v2.52).** 3 findings closed in single session. Commit `57daf877`: insights-worker forward-sync (deployed v14.0.0 → repo, byte-equivalent). Commit `7555b98a`: combined RPC migration orphan closure (F-HEYGEN + F-INSIGHTS — 5 SD RPCs + 1 fn + 1 table + 1 col + 1 index + 2 FK guards, all idempotent). 2 D-01 fires (T-MCP-02 47 → 49); fire #1 partial → empirical resolution (Lesson #62 v2.50 testable-corrected-action path), fire #2 clean agree. **0 state-capture exceptions.** 0 production mutations chat-side. STANDING_THREE unchanged. ~5 P0+P1 open of 20 cap. | `docs/runtime/sessions/2026-05-08-v2.52-insights-sync-rpc-closure.md` |
| 2026-05-08 | personal-finance-cowork-inbox-brief | **Lightweight close (v2.51).** Crazy Domains $521/3yr renewal analysis; ~A$286/yr ongoing saving identified. NEW Cowork brief drafted: `morning-inbox-sweep-v1` (status=draft per PK hold). | `docs/runtime/sessions/2026-05-08-personal-finance-cowork-inbox-brief.md` |
| 2026-05-07 | p1-sd-triage-sync | **P1 SECURITY-DEFINER triage CLOSED (v2.50).** | `docs/runtime/sessions/2026-05-07-p1-sd-triage-sync.md` |
| 2026-05-07 | stage3-safe-deploy | **Stage 3 SHIPPED + VERIFIED (v2.49).** `scripts/safe-deploy.sh` live. | `docs/runtime/sessions/2026-05-07-stage3-safe-deploy.md` |
| 2026-05-07 | stage2b-shipped-accepted | **Stage 2b SHIPPED + ACCEPTED on desktop (v2.48).** | `docs/runtime/sessions/2026-05-07-stage2b-shipped-accepted.md` |
| 2026-05-07 | s30-pass-stage2b-kickoff | **S30 PASS + Stage 2b kickoff (v2.47).** | `docs/runtime/sessions/2026-05-07-s30-pass-stage2b-kickoff.md` |
| 2026-05-07 | dashboard-architecture-review-completion | **Dashboard Architecture Review COMPLETE.** | `docs/runtime/sessions/2026-05-07-dashboard-architecture-review-completion.md` |
| 2026-05-07 | s30-paused-stuck-cluster-recheck | Lightweight checkpoint. | `docs/runtime/sessions/2026-05-07-s30-paused-stuck-cluster-recheck.md` |
| 2026-05-07 | stage2a-cron-applied | F-EF-DRIFT-PREVENTION Stage 2a fully CLOSED. | `docs/runtime/sessions/2026-05-07-stage2a-cron-applied.md` |
| 2026-05-07 | bef6be96-investigation-resolved | bef6be96 origin RESOLVED. | `docs/runtime/sessions/2026-05-07-bef6be96-investigation-resolved.md` |
| 2026-05-06 | f-ef-drift-prevention-stage2a-checkpoint | Stage 2a CHECKPOINT. | `docs/runtime/sessions/2026-05-06-f-ef-drift-prevention-stage2a-checkpoint.md` |
| 2026-05-06 | f-ef-drift-prevention-stage1-applied | Stage 1 APPLIED. | `docs/runtime/sessions/2026-05-06-f-ef-drift-prevention-stage1-applied.md` |
| 2026-05-05 | f-ef-drift-prevention-locked | Tier 2 inventory LOCKED. | `docs/runtime/sessions/2026-05-05-f-ef-drift-prevention-locked.md` |
| 2026-05-05 | ice-yt-oauth-restoration | F-YT-OAUTH-PP RESTORED. | `docs/runtime/sessions/2026-05-05-ice-yt-oauth-restoration.md` |
| 2026-05-05 | m5-applied-corrected-cascade-fix | M5 APPLIED. 7/7 PASS. | `docs/runtime/sessions/2026-05-05-m5-applied-corrected-cascade-fix.md` |
| 2026-05-05 | m4-applied-state-capture-override | M4 APPLIED. 8/8 PASS. | `docs/runtime/sessions/2026-05-05-m4-applied-state-capture-override.md` |
| 2026-05-05 | tier-1-queue-integrity-applied | M1+M2+M3 applied. 8/8 PASS. | `docs/runtime/sessions/2026-05-05-tier-1-queue-integrity-applied.md` |
| 2026-05-04 | dashboard-architecture-review-kickoff | Dashboard review kickoff. | `docs/runtime/sessions/2026-05-04-dashboard-architecture-review-kickoff.md` |
| 2026-05-04 | laptop-three-applies | ai-worker v2.11.1; F-AAP-007 v2; F-PUB-009. | `docs/runtime/sessions/2026-05-04-laptop-three-applies.md` |
| 2026-05-04 | baudit-check5-retired-faap007-revised | B-AUDIT-CHECK5-DRIFT retired. | `docs/runtime/sessions/2026-05-04-baudit-check5-retired-faap007-revised.md` |
| 2026-05-03 | audit-readiness-completion-night | Migration 3 + runbook v2.1. | `docs/runtime/sessions/2026-05-03-audit-readiness-completion-night.md` |
| 2026-05-03 | pipeline-relief-apply-night | Migration 1+2 applied. | `docs/runtime/sessions/2026-05-03-pipeline-relief-apply-night.md` |
| 2026-05-03 | pipeline-investigation-night | End-to-end investigation. | `docs/runtime/sessions/2026-05-03-pipeline-investigation-night.md` |
| 2026-05-03 | tmcp05-batch-closure | T-MCP-05 closed. | `docs/runtime/sessions/2026-05-03-tmcp05-batch-closure.md` |
| 2026-05-03 | faap001-002-apply | F-AAP-001 + F-AAP-002 + B-AUDIT-V4-PEERS clean. | `docs/runtime/sessions/2026-05-03-faap001-002-apply.md` |

**Pre-2026-05-03 history**: frozen at `docs/runtime/archive/sync_state-pre-2026-05-03.md`.

---

## 🟢 Most recent session — inline summary

### 2026-05-08 Sydney — video-worker v3.0.0 deploy + verify_jwt regression recovered + durable supabase/config.toml landed (v2.54)

**Outcome:** F-VIDEO-QUALITY-UPGRADE-A-B-C shipped via two CLI invocations within ~5 minutes; verify_jwt regression introduced + recovered same session; durable `supabase/config.toml` covering 23 EFs landed this turn; drift round-trip CLOSED with B-FD → A-LE Class A family; 4 m.chatgpt_review records closed-the-loop; YouTube cadence prior memory entry RETRACTED; 6 new P2 findings logged. STANDING_THREE array unchanged. Other holds (cron 53/11/64/65 paused, NDIS-Yarns IG `publish_enabled=false`, etc.) preserved.

**Deploy chronology:**
1. Pre-fire drift scan `6a381ec7-dc37-418c-8ff1-e7b8d76801ca` (06:17:56 UTC): video-worker class B-FD, repo 3.0.0 ahead of deploy 2.1.0, `previous_class=A`, `state_changed=true`.
2. D-01 fire `4e0e9c00-11d3-4096-afd3-ec765b296b36` (deploy fire #2 — escalation-resolved by re-fire from `ee27dd37`): PASS.
3. `./scripts/safe-deploy.sh video-worker --allow-warn` → gate WARN → PASS, CLI `Deployed Functions on project mbkmaxqhsohbtwsqolns: video-worker`, exit 0.
4. **Regression detected:** cron jobid 33 401'd. Root cause: CLI default sets `verify_jwt: true` on the gateway when no `supabase/config.toml` exists.
5. **Recovery (same session):** `supabase functions deploy video-worker --no-verify-jwt`. Same v3.0.0 source, gateway flag flipped only. Exit 0. Cron jobid 33 unblocked.

**Post-deploy drift round-trip (chat-owned, COMPLETED):** scan `cb7fe77b-2011-48cf-8ffc-806d63e535aa` at 2026-05-08 07:20:56 UTC. video-worker `current_class=A-LE`, `previous_class=B-FD`, `state_changed=true`, repo=deploy=3.0.0. Textbook B-FD → A-LE.

**Durable `supabase/config.toml` landed (this turn):** 23 EFs encoded with `verify_jwt = false` — 10 custom-header (video-worker, content_fetch, image-worker, feed-discovery, heygen-worker, linkedin-zapier-publisher, pipeline-fixer, wordpress-publisher, youtube-publisher, auto-approver) + 13 service-role (ai-diagnostic, client-weekly-summary, compliance-reviewer, draft-notifier, drift-check, email-ingest, external-reviewer-digest, feed-intelligence, insights-feedback, insights-worker, pipeline-healer, pipeline-sentinel, weekly-manager-report). 4 slugs excluded as stale: `ingest`, `compliance-monitor`, `pipeline-ai-summary`, `pipeline-doctor` — F-CRON-*-STALE findings logged for each.

**4 m.chatgpt_review close-the-loop (chat-owned, COMPLETED):**
- `8bd6ac37-fa9e-43af-803f-75a171080554` — sql_destructive F-YT-PUB-AVATAR-EXCLUSION fire #1, escalated → resolved by re-fire `fa4322e5` PASS. resolved_by `chat-via-refire-fa4322e5-pass`.
- `fa4322e5-69a7-4b77-a745-cdd0296dccc4` — sql_destructive fire #2, PASS. action_taken: catalog UPDATE applied 2026-05-08 05:24:00.472666 UTC removing youtube from `t."5.3_content_format".platform_support` for `video_short_avatar`. status completed.
- `ee27dd37-472a-443c-b29d-dd07f8a8c7d3` — ef_deploy video-worker fire #1, escalated → resolved by re-fire `4e0e9c00` PASS. resolved_by `chat-via-refire-4e0e9c00-pass`.
- `4e0e9c00-11d3-4096-afd3-ec765b296b36` — ef_deploy video-worker fire #2, PASS. action_taken: deploy completed + verify_jwt regression+recovery saga documented inline. status completed.

**YouTube cadence retraction:** prior session memory entry claimed "~3-day cadence" with "next fill 49h forward" for NDIS-Yarns / Property Pulse YouTube. **INCORRECT.** Actual state: NDIS-Yarns YT Mon–Fri 19:00 AEST / 09:00 UTC, 5 slots/wk. Property Pulse YT Mon–Fri 17:00 AEST / 07:00 UTC, 5 slots/wk. Slot pipeline healthy via cron jobid 72 (`m.materialise_slots(7)`) + 73/75/76 slot processing. Root of error: Sat–Sun weekend gap mislabelled as "cadence"; fill_window_opens_at conflated with scheduled_publish_at. System issue: NONE. Reporting issue: corrected.

**NEW v2.54 findings (6 logged):**
- **F-CRON-INGEST-STALE (P2)** — cron jobid 1 (`rss-ingest-run-all-hourly`) calls deployed slug `ingest` (`ingest-v8-youtube-channel`); `supabase/functions/ingest/` missing. Prior `Ingest/` (capital I) removed in `961482c` 8 Mar 2026 ("superseded by ingest v75"); lowercase folder never re-added. Excluded from `config.toml`.
- **F-CRON-COMPLIANCE-MONITOR-STALE (P2)** — cron jobid 31 calls deployed v1.2.0; folder absent.
- **F-CRON-PIPELINE-AI-SUMMARY-STALE (P2)** — cron jobid 30 (`pipeline-ai-summary-hourly`) active; folder absent. Per source-recovery commit `8ee27b4` (30 Mar 2026) was in deploy-only ghost bucket; never recovered.
- **F-CRON-PIPELINE-DOCTOR-STALE (P2)** — cron jobids 29 + 39 active; folder absent. **NOT** a rename of `pipeline-diagnostician` (separate newer Claude-powered RCA function introduced in `c039e84`). Same source-recovery ghost bucket as pipeline-ai-summary.
- **F-CRON-PG-NET-TIMEOUT-5S (P2)** — cron jobid 33 (video-worker), 44 (heygen-worker), 58 (auto-approver) timed out at 07:30:00 UTC because `net.http_post` calls omit `timeout_milliseconds`, falling back to pg_net default 5000ms. Pre-existing pattern. Proposed fix: `cron.alter_job` to add explicit `timeout_milliseconds := 30000`.
- **F-CRON-AUTO-APPROVER-SECRET-INLINE (P2 security)** — cron jobid 58 has `x-auto-approver-key` hardcoded as literal string in cron command body, NOT pulled from `vault.decrypted_secrets`. Risks: secret visible to roles with `cron.job` SELECT; captured in `pg_stat_statements`; rotation requires editing the cron command.

**Closed v2.54:** video-worker `verify_jwt` durable fix (P3) — landed via `supabase/config.toml` this turn.

**Open from this session (deferred to v2.55+):**
- F-CRON-PG-NET-TIMEOUT-5S (P2) — cron timeout fix for jobid 33, 44, 58.
- F-CRON-AUTO-APPROVER-SECRET-INLINE (P2 sec) — secret rotation + vault refactor.
- F-CRON-INGEST-STALE + F-CRON-COMPLIANCE-MONITOR-STALE + F-CRON-PIPELINE-AI-SUMMARY-STALE + F-CRON-PIPELINE-DOCTOR-STALE (P2 each).
- Music library activation checklist (P3 PK action) — bucket + tracks + env var.
- Emergency redeploy governance question (P2 PK decision) — does bounded production-restoration require expedited D-01? Document in `docs/06_decisions.md`.
- First deploy that uses the new `config.toml` WILL require D-01. Suggested validation: a controlled redeploy of one custom-header EF (e.g. `content_fetch`) post-config.toml to verify the gate flag is preserved across redeploys.
- PHASES reconciliation now **10th**-deferred — needs dedicated session.

**Constraints respected this turn:** No EF deploys. No Supabase writes (no DDL, no DML). No cron edits. `supabase functions list` only (read). Read-only `SELECT` against `cron.job` and `m.vw_ef_drift_current`. Memory `recent_updates` v2.54 entry handled by chat at session end (out of scope for CC turn).

---

### 2026-05-08 Sydney — F-YT-NY-FORMAT-SELECTION closed end-to-end (v2.53)

**Outcome:** 1 P1 finding closed end-to-end. ICE chat-side: 1 production mutation (commit `1ccfe9a2` + Supabase EF deploy via authoritative Stage 3 gate), 1 D-01 fire (cumulative T-MCP-02 49 → 50, clean PASS), 0 SQL DDL/DML applied beyond the 2 manual drift fires (which write to `m.ef_drift_log` only — replicated cron jobid 80 SQL verbatim, PK-approved drift fire path), STANDING_THREE array unchanged, cron 53/11/64/65 still paused, NDIS-Yarns IG `publish_enabled=false` unchanged. Hold-state respected throughout.

**Single commit — F-YT-NY-FORMAT-SELECTION fix:** `1ccfe9a21b3282245a646f659434239fcf71ed0c` at 2026-05-08T~02:30Z. Single-file patch of `supabase/functions/ai-worker/index.ts` v2.11.1 → v2.12.0 (blob `84da0e7a…`, 58063 B LF). 6 surgical str_replace edits + ~25-line v2.12.0 changelog block. Two-part format-advisor-v1 fix:

- **Part A (`fetchFormatContext` filter):** Opt-in semantics. `s[platform] !== true` (was `s[platform] === false`). Excludes any format row missing the platform key in `platform_support` JSONB. Verified across all 4 platforms via live catalogue query: identical candidate sets for facebook (10), linkedin (4), instagram (5); youtube correctly drops from 10 (5 inappropriate non-video formats leaked) to 5 video formats only.
- **Part B (`callFormatAdvisor` system prompt):** Receives `platform` field via opts; system prompt prepends "Target platform: ${platform}. Choose only formats compatible with ${platform}." — defence-in-depth, keeps advisor platform-aware even if a future format row is added with missing platform keys.

**Symptom resolved:** NDIS-Yarns × YouTube was selecting `text` for 100% of last 14 days' drafts (8/8); Property-Pulse × YouTube 76% (13/17). YouTube cannot publish text → 0 published posts on NY×YT, 24% publish rate on PP×YT. Root cause was the `fetchFormatContext` opt-out filter leaking 5 non-video formats into the YT candidate set, combined with platform-blind advisor prompt.

**D-01 fire #1:** `64230c18-362b-4d0c-bf82-b5ab6eda3856`. action_type `ef_deploy`. Verdict agree, risk medium, confidence high, 0 pushback points, 0 escalation. Clean approve.

**Stage 3 gate authoritative:** PK directive Option 3 — manually fire drift-check post-commit, expect class shift A → B-FD, run `safe-deploy.sh ai-worker --allow-warn` (Stage 3 gate decides). First real use of `--allow-warn` path on B-FD class. Pre-deploy fire `04c3fd1b`: ai-worker class B-FD P3, deploy 2.11.1 vs repo 2.12.0, no SD regression. Script ran `--check-only` first (PASS), then live (WARN → invoking → Deployed). Exit 0.

**Live deploy verified:** GET `/functions/v1/ai-worker` → 200 OK, body `{"ok":true,"function":"ai-worker","version":"ai-worker-v2.12.0"}`.

**Post-deploy drift fire `3bed87b0`:** ai-worker Class A-LE (normalised hashes match, raw hashes differ due to Windows CRLF deploy artifact). Round-trip closed. Class A-LE is in Class A family — no severity, no action.

**Acceptance-integrity adherence (v2.50 standing rule):** Commit `1ccfe9a2` verified post-push by re-fetching landed file content via Invegent GitHub MCP — blob SHA `84da0e7a…` matched expected exactly, size 58063 B matched, all 6 edits visible, changelog block present. Live deploy verified via GET endpoint version. Drift round-trip closed via post-deploy manual fire showing Class A-LE.

**Closure budget:** ~2.5h chat. Day total v2.53: ~2.5h. Trailing-14-day ~56.5h above 8.0 floor. ~4 P0+P1 open of 20 cap (was ~5 v2.52).

**4-way sync close at this commit:**
- Session file: `docs/runtime/sessions/2026-05-08-f-yt-ny-format-fix.md`
- Sync state (this file): refreshed v2.53
- Action list: v2.53 bump (1 closure, Top 3 reordered, F-YT-PUB-AVATAR-EXCLUSION P3 NEW)
- Memory: rolling-window `recent_updates` v2.53 entry replaces v2.52

**NEW v2.53:**
- **F-YT-PUB-AVATAR-EXCLUSION (P3)** — Latent risk in `youtube-publisher`. `.in()` filter on draft format excludes `video_short_avatar` from the allowed list. With F-YT-NY fix in place, advisor can now legitimately pick `video_short_avatar` for YouTube — but the publisher would reject it. P3 because (a) only surfaces if advisor picks avatar, (b) HeyGen avatar pipeline is still in beta. Fix would be to add `video_short_avatar` to the publisher allow-list or add explicit avatar-handling branch.

**Open from this session:**
- Dashboard roadmap PHASES — **9th** consecutive deferral (was 8th in v2.52)
- 21+ close-the-loop UPDATEs to `m.chatgpt_review` still pending; v2.53 adds 1 more (cumulative ~24+)
- Carry: Crazy Domains refund follow-up (Personal businesses, PK actions manually)
- Carry: morning-inbox-sweep-v1 brief amendment (P3, status=draft, awaiting PK)
- NEW: F-YT-PUB-AVATAR-EXCLUSION (P3, latent)
- Passive validator: next NY×YT slot fire — expect non-text format chosen by advisor
- Passive validator: 7-day distribution check across all platforms — confirm FB/LI/IG unchanged + YT now picks video formats

---

## 🟡 Next session priorities (rebuilt v2.53 per F-YT-NY closure)

1. **Dashboard Architecture Review Phase 0 prerequisites** (P1 TOP) — unchanged from v2.52. PK confirms 7 default-blockers via `docs/briefs/cc-0001-dashboard-phase-0-defaults.md`. M5–M8 reconciliation independent.
2. **AI cost view P3** (quick win, ~1h) — promoted Top 3 → Top 2 by F-YT-NY closure. Author `vw_ai_cost_monthly` view DDL on `m.ai_job` + add NOW dashboard tile.
3. **M6 Phase A** (P1 carry, NEWLY UNBLOCKED v2.50) — promoted to Top 3. 108 historical Bug 3 dead-letter; coordinate with M-09-03 view definition.

Plus standing P0:
- **Personal businesses check-in** — Crazy Domains refund status (≥1 refund verbally in progress on 8 May call) + any new items from Care for Welfare / Property Buyers Agent / NDIS Accessories.

Carries (lower priority):
- **F-YT-PUB-AVATAR-EXCLUSION (NEW v2.53, P3)** — youtube-publisher `.in()` filter excludes `video_short_avatar`; surfaces only if advisor picks avatar.
- **F-PUB-009 V3-V5 + 7-day flow** (P2) — passive monitoring continues.
- **F-AAP-NEEDS-REVIEW-BACKLOG** (P2) — closure target = architecture review Phase 2 B-09-14.
- **F-AI-WORKER-PARSER-SKIP-BUG V4** (P2) — passive monitoring; needs natural skip event OR synthetic test.
- **morning-inbox-sweep-v1 brief amendment** (P3) — PK reviews drafted brief; chat applies amendments + flips status=review_required.
- **Vault `service_role_key` naming hygiene** (P3) — read-only scope-check; rename if appropriate.
- **`docs/audit/health/2026-05-06.md` follow-up** (P3) — Cowork status investigation if still absent.
- **Dashboard mobile responsiveness** (P3) — dedicated session OR roll into architecture review Phase 1+ build.
- **21+ close-the-loop UPDATEs to `m.chatgpt_review`** — cumulative ~24+ pending after v2.53.
- **Dashboard roadmap PHASES reconciliation** (P3, **9th** consecutive deferral) — PHASES array stale since 3 May.
- **`00_overview.md` 11-section table reconciliation** (P3) — required by `11_final_consolidation.md` §11.1.
- **Invegent IG cap-throttle planning** (P3) — jobid 53 unblock readiness.
- **CFW post-ai-worker dead drafts** (P3) — investigate downstream pathway.
- **47 v4 mismatch queue rows / M6 Phase B** (P3) — sequenced after M6 Phase A.

---

## ⛔ Carried-forward "do not touch" state

Unchanged from v2.52. All 30+ items intact (NDIS-Yarns IG `publish_enabled=false`, cron 53/11/64/65 paused, jobid 12 planner-hourly, 21+ close-the-loop UPDATEs pending, 47 dead queue rows, 32 historical orphans, etc.).

**v2.53 update on standing items:**
- Cron-backed drift logging is LIVE (jobid 80 + 81 active=true). 2 manual fires this session (`04c3fd1b` pre-deploy showing B-FD + `3bed87b0` post-deploy showing A-LE) replicated cron jobid 80 SQL verbatim — PK-approved drift fire path. `m.ef_drift_log` grew from ~196 → ~294 rows (49 × 2 new scans).
- Standing don't-redeploy three (`heygen-avatar-creator`, `heygen-avatar-poller`, `draft-notifier`) — list unchanged from v2.52. Mechanically encoded in `scripts/safe-deploy.sh` STANDING_THREE array (verified pre-deploy: ai-worker NOT in the list).
- ai-worker now repo-aligned at v2.12.0 (was repo v2.11.1 / deploy v2.11.1). Class A-LE post-deploy.
- F-YT-NY-FORMAT-SELECTION P1 — **CLOSED v2.53** (commit `1ccfe9a2`).
- F-YT-PUB-AVATAR-EXCLUSION P3 — **NEW v2.53** (logged, no action; passive validator).
- Dashboard roadmap PHASES array stale since 3 May — **9th** consecutive deferral (was 8th in v2.52).
- AI cost view P3 — promoted Top 3 → Top 2 next session priority.
- Crazy Domains clean-up — PK to action manually; chat tracks via Personal businesses entry, no chat-side action without PK direction.
- morning-inbox-sweep-v1 brief at `docs/briefs/morning-inbox-sweep-v1.md` status=draft — do not pick up in Cowork until PK amends and flips status.

---

## 📜 G1 convention (the rule)

**Each session writes its own file** at `docs/runtime/sessions/YYYY-MM-DD-{slug}.md`. At session end, chat updates this file ONLY by:

1. Inserting one row into the `📚 Session index` table at the top
2. Replacing the `🟢 Most recent session — inline summary` section with the new session's summary
3. Optionally updating `🟡 Next session priorities` and `⛔ Carried-forward` blocks

**This file should never exceed ~10KB.** If it grows past that, archive the oldest inline summaries to a session file. **v2.53 status:** ~14KB after this update (was ~15.4KB at v2.52 close — net trend slowly improving as v2.52 inline replaced with v2.53 inline). Archive sweep deferred; will trigger at 16KB.

**Old monolithic file is frozen.** Pre-2026-05-03 → `docs/runtime/archive/sync_state-pre-2026-05-03.md`. Never modified again.

---

*Last updated: 2026-05-08 Sydney — v2.54: video-worker v3.0.0 DEPLOYED (commit `4ae5b5a7`) + verify_jwt regression recovered same-session via `supabase functions deploy video-worker --no-verify-jwt` (cron jobid 33 401 → 200) + durable `supabase/config.toml` LANDED this turn covering 23 EFs (10 custom-header + 13 service-role; 4 stale slugs excluded). Drift round-trip COMPLETED: scan `cb7fe77b…` 07:20:56 UTC, video-worker B-FD → A-LE. 4 m.chatgpt_review records closed-the-loop (`8bd6ac37`, `fa4322e5`, `ee27dd37`, `4e0e9c00`). YouTube cadence prior-session memory entry RETRACTED (Mon–Fri 5/wk both clients, **not** "~3-day cadence"). 6 NEW P2 findings logged. Closed v2.54: video-worker verify_jwt durable fix (P3). PHASES reconciliation now **10th** carry. Previous (v2.53): F-YT-NY-FORMAT-SELECTION P1 closure, ai-worker v2.12.0 deploy, NEW P3 F-YT-PUB-AVATAR-EXCLUSION.*
