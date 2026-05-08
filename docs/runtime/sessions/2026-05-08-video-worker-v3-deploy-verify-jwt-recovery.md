# 2026-05-08 Sydney — video-worker v3.0.0 deploy + verify_jwt regression recovered (mid-v2.53)

**Outcome:** F-VIDEO-QUALITY-UPGRADE-A-B-C shipped via two CLI invocations within ~5 minutes:
1. `./scripts/safe-deploy.sh video-worker --allow-warn` → gate WARN/PASS, CLI `Deployed Functions on project mbkmaxqhsohbtwsqolns: video-worker`, exit 0. Repo `4ae5b5a` v3.0.0 took the slot, replacing deployed v2.1.0.
2. **Regression detected:** cron jobid 33 began 401'ing. Root cause: CLI default sets `verify_jwt: true` on the gateway when there is no `supabase/config.toml`. Cron post calls without a JWT.
3. **Recovery (same session):** `supabase functions deploy video-worker --no-verify-jwt`. Same v3.0.0 source, only the gateway flag flipped. Exit 0. Cron jobid 33 unblocked.

Two new P2 findings logged from a parallel investigation of cron auth patterns (auto-approver, compliance-monitor, ingest). Hold-state preserved: `STANDING_THREE` untouched, no other EFs deployed, no DB DDL/DML, no cron schedule changes.

---

## 1. Deploy chronology

| Time (UTC, approx) | Action | Outcome |
|---|---|---|
| Earlier | Pre-fire drift scan `6a381ec7-dc37-418c-8ff1-e7b8d76801ca` (06:17:56 UTC) | video-worker class B-FD, repo 3.0.0 ahead of deploy 2.1.0, `previous_class=A`, `state_changed=true`, severity P3 |
| Earlier | D-01 fire `4e0e9c00-11d3-4096-afd3-ec765b296b36` | PASS (per chat) |
| Earlier | `safe-deploy.sh video-worker --allow-warn` | WARN line printed, gate PASS, CLI invoked, `Deployed Functions on project mbkmaxqhsohbtwsqolns: video-worker`, exit 0 |
| Mid-session | Cron jobid 33 begins returning 401 | verify_jwt regression surfaced |
| Same session | `supabase functions deploy video-worker --no-verify-jwt` | exit 0; gateway flag flipped to `verify_jwt: false` without source change |

Live deployed source unchanged across the two invocations — only the gateway auth flag differs.

## 2. verify_jwt regression — root cause and durable fix path

The CLI's gateway default is `verify_jwt: true` whenever there is no `supabase/config.toml`. A previous deploy of video-worker had `verify_jwt: false` set (matching the cron's auth-less invocation pattern). The first deploy of v3.0.0 today regressed that to `true` because the repo has never carried a `config.toml`.

Recovery used the explicit CLI override `--no-verify-jwt`. This is correct for the immediate fix but is not durable — any future deploy that omits the flag will re-regress. The durable fix is a `supabase/config.toml` with per-function `verify_jwt` settings tracked in repo. **Out of scope this session** (queued as a follow-up; see "open queued work" below).

## 3. Cron auth-pattern survey (Part 2 investigation)

Read `cron.job` rows for jobids 1, 31, 58 via service-role `exec_sql` SELECT. Cross-checked each slug against `m.vw_ef_drift_current` and against `supabase/functions/<slug>/`.

| jobid | jobname | schedule | active | auth in cron call | repo folder | drift class | status |
|---|---|---|---|---|---|---|---|
| 58 | `auto-approver-sweep` | `*/10 * * * *` | yes | header `x-auto-approver-key` (literal value) | `supabase/functions/auto-approver/` PRESENT | C (body-drift; banner equal at 1.6.0) | OK — needs `verify_jwt = false` once `config.toml` lands |
| 31 | `compliance-monitor-monthly` | `0 9 1 * *` | yes | none beyond `Content-Type` (no auth header) | MISSING | D (`repo_path_status=missing`; deploy 1.2.0; notes "Deployed slug has no repo directory.") | **F-CRON-COMPLIANCE-MONITOR-STALE — P2 (NEW)** |
| 1 | `rss-ingest-run-all-hourly` | `0 */6 * * *` | yes | header `x-ingest-key` (vault secret) | MISSING | D (`repo_path_status=missing`; deploy `ingest-v8-youtube-channel`) | **F-CRON-INGEST-STALE — P2 (NEW)** |

### 3.1 ingest — git-history rename hunt

Git log shows the prior repo location was `supabase/functions/Ingest/index.ts` (capital I). It was removed in commit `961482c` on 2026-03-08:

```
chore: remove stale Ingest folder (superseded by ingest v75)
 supabase/functions/Ingest/index.ts | 637 -------------------------------------
```

The removal note says "superseded by ingest v75" but the lowercase `ingest/` folder was never re-added, so the deployed slug (currently `ingest-v8-youtube-channel`) no longer has a corresponding repo source. This explains the Class D classification.

**Conclusion:** ingest is stale. Per brief direction, **exclude from `config.toml`** when that work lands, and pursue F-CRON-INGEST-STALE separately.

### 3.2 compliance-monitor — no rename evidence

No commit in `git log --diff-filter=D` references `compliance-monitor` under `supabase/functions/`. The deployed slug appears never to have had a repo source in this repo's history (or it was moved before history begins for that path). Drift view classifies as Class D `repo_path_status=missing`.

**Conclusion:** stale; cannot be ingested into `config.toml` without first authoring or recovering the source.

### 3.3 auto-approver — no stale finding

Folder present at `supabase/functions/auto-approver/index.ts`. Drift class C means banner versions match (both 1.6.0) but bodies diverge — this is the body-drift trap, not a missing-source problem. **No new finding.** When `config.toml` work lands, include `auto-approver` with `verify_jwt = false` (cron uses its own header `x-auto-approver-key`, not a JWT).

## 4. Drift round-trip (chat-owned)

Chat owns the post-deploy round-trip (cron-pattern probe, 07:30 UTC fire check, drift fire to confirm Class A-LE with repo=deploy=3.0.0). Not run from this session per brief direction. Will be captured at v2.54 sync_state close.

## 5. m.chatgpt_review close-the-loop (chat-owned)

Per brief: "Close the four reviews from this session and do the 4-way sync close." Chat owns review-row closure. Review IDs to be enumerated by chat at v2.54 close (only `4e0e9c00-11d3-4096-afd3-ec765b296b36` is referenced in the deploy briefs received this session; the other three review IDs are not in the work surfaces visible from CC's side and will be filled by chat at sync close).

## 6. YT cadence retraction (chat-owned)

Brief mentions a "YT cadence retraction" to cover in this session file. No in-repo evidence (no commit, no migration, no doc edit) of a cadence-retraction decision visible from CC's side this session. The most recent YT-adjacent work in repo is yesterday's `F-YT-NY-FORMAT-SELECTION` closure (v2.53, commit `1ccfe9a2`) and the `F-YT-PUB-AVATAR-EXCLUSION` P3 logging. Cadence retraction is presumably a chat-side / operational decision; the substantive description belongs in v2.54 sync_state when chat closes the session.

## 7. Hold-state assertions

| Constraint | Status |
|---|---|
| `STANDING_THREE` array in `scripts/safe-deploy.sh` | unchanged |
| Other EFs deployed | none (only video-worker, twice) |
| Cron schedules altered | none |
| DB DDL / DML executed | none (only read-only `SELECT` via `exec_sql` for drift view + `cron.job` survey) |
| `supabase/config.toml` | not created (deferred — durable fix for verify_jwt regression vector) |
| Files modified in repo | session file (this) + action_list deltas (this turn). No `supabase/functions/<slug>/index.ts` edits. |

## 8. Acceptance integrity (per v2.50 standing rule)

- Deploy CLI confirmation lines captured (`Deployed Functions on project mbkmaxqhsohbtwsqolns: video-worker`).
- exit code captured (0).
- Pre-fire drift run id captured (`6a381ec7…`) — matches the brief's pre-fire scan.
- D-01 review id quoted from brief (`4e0e9c00…`); CC did not fire its own review.
- Cron auth survey results sourced from live `cron.job` table via service-role SELECT (not from documentation).
- Folder existence verified by direct `[ -d supabase/functions/<slug> ]` checks (not from documentation).
- `m.vw_ef_drift_current` queried for each slug; `repo_path_status` field used to corroborate folder check.
- No acceptance asserted on summary/signal alone.

## 9. Open queued work (NOT ACTIONED THIS SESSION)

- **Durable verify_jwt fix:** create `supabase/config.toml` with per-function settings. Include `auto-approver` (verify_jwt=false). Do NOT include `ingest` or `compliance-monitor` (stale slugs, see findings 3.1 + 3.2).
- **F-CRON-INGEST-STALE (P2)** — re-author `supabase/functions/ingest/` to align with deployed `ingest-v8-youtube-channel`, OR formally retire the deployed slug. Decision belongs to PK.
- **F-CRON-COMPLIANCE-MONITOR-STALE (P2)** — same shape as ingest.
- **YT cadence retraction** — chat to fill at v2.54 close.
- **m.chatgpt_review close-the-loop** — chat to fill at v2.54 close (4 reviews).
- **Memory `recent_updates` v2.54 entry** — explicitly out of scope per PK direction; chat handles at next session start.
- **Drift round-trip post-deploy** — chat to run at v2.54 close (expect Class A-LE, repo=deploy=3.0.0).
- **PHASES array full reconciliation** — 9th carry-forward deferral; this session adds only the video-worker v3.0.0 entry + LAST_UPDATED bump per PK direction.

## 10. Commits

- This session file: this turn's content-engine commit (see action_list `Mid-v2.53` block).
- Action_list deltas: same commit as session file.
- Dashboard `roadmap/page.tsx` PHASES + LAST_UPDATED: separate commit, separate repo (`Invegent/invegent-dashboard`).

T-MCP-02 cumulative: unchanged (CC fired no D-01 reviews this session — deploy used the brief's pre-fire `4e0e9c00`).
