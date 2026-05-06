# Session — 2026-05-07 Sydney — S30 Paused / Stuck-Cluster Recheck Checkpoint

**Slug:** s30-paused-stuck-cluster-recheck
**Outcome:** Lightweight checkpoint after S30 deferred (premature). Read-only re-evaluation of 3 stuck-item clusters and F-AI-WORKER-PARSER-SKIP-BUG forward acid test. Mid-hold pre-fire setup audit + vault investigation + dashboard architecture review doc location query. Zero production mutations across the entire session.
**Closure:** ~45 min combined (options 6+4 + checkpoint sync + mid-hold audit + vault investigation + dashboard doc lookup + 4-way sync). Combined day ~10h.

## Why this session

PK directed S30 forward verification (first automated drift-check fire). Investigation revealed S30 was premature: server time at 04:45 UTC; cron schedule `0 17 * * *` means first natural fire is 17:00 UTC = 03:00 AEST tomorrow, ~11.5h away. Per PK directive, no manual triggers — the cron state is correct, just hasn't fired yet.

PK then directed read-only ICE work while waiting: option 6 (3 stuck-item clusters re-evaluation) and option 4 (F-AI-WORKER-PARSER-SKIP-BUG V3–V5 acid test). After the v2.45 lightweight checkpoint commit (`65273dd1`), PK directed several follow-up actions within the same chat session, all read-only.

## Checkpoint findings (9 items per PK directive)

1. **S30 paused** until first natural cron fire at 17:00 UTC / 03:00 AEST tomorrow.
2. **PP×YT cluster CLEARED** — 4 publishes confirmed at 2026-05-05 09:15–09:45 UTC with real platform_post_ids (`1_YU6Yc_FfI`, `vRTXpKrf56k`, `fD3_BmOegaY`, `FU6AwvULcAs`); no new `invalid_grant` errors anywhere in last 7 days.
3. **LinkedIn-PP residual cluster CLEARED** — PP-LI 17 publishes/7d, 2/24h, 0 failed; bottleneck = normal cap throttle.
4. **NY×YT cluster STILL BLOCKED** by F-YT-NY-FORMAT-SELECTION — 8 ready rows all `format=text` (YouTube can't publish text natively); 2 dead avatar test rows from 04-09 (latent per carry-forward). State unchanged from v2.42.
5. **Invegent IG backlog observed** — 6 queued rows `attempts=0` since 04-27. Same root cause as NY-IG (41 overdue) and PP-IG (57 overdue): `instagram-publisher-every-15m` jobid 53 `active=false` since 05-01 (intentional carry-forward). Note: when T05 resolves and IG publisher re-enables, ~104 overdue posts will fire — cap-throttle and rate-limit considerations apply.
6. **No NULL `scheduled_for` rows** in active queue (M4 fix held; F-AI-WORKER-PARSER-SKIP-BUG didn't regress).
7. **Active publisher crons all green** — `enqueue-publish-queue-every-5m` 288/0, `publisher-every-10m` 288/0, `linkedin-zapier-publisher-every-20m` 72/0, `youtube-publisher-every-30min` 48/0, `wordpress-publisher-every-6h` 4/0 (last fires 1–15 min ago). `instagram-publisher-every-15m` paused jobid 53 = intentional carry-forward, not new.
8. **F-AI-WORKER-PARSER-SKIP-BUG forward acid test:**
   - **V3 PASS** — 28 ai_jobs across 14 client/platform combos in last 48h, 0 V3 bug fingerprints (`skip=true ∧ body_len > 0`)
   - **V5 PASS** — 4 drafts progressed to publish queue; all 4 have `scheduled_for` non-null (combined with cluster-level 0 NULL check)
   - **V4 INCONCLUSIVE** — 0 natural skip events in 48h; skip path simply hasn't been exercised. Not a bug, just absence of trigger. Synthetic test would require mutation (out of scope per read-only directive).
9. **No production mutations occurred** during these checks. Read-only throughout. No DML, no DDL, no cron triggers, no EF deploys, no close-the-loop UPDATEs, no Stage 2b/3, no P1 triage, no NY×YT fix, no M6.

## Side observations (not blocking, flagged for Stage 2b dashboard panel design)

- Several CFW drafts in last 48h went `approval_status='dead'` post-ai-worker. AI job succeeded; draft died downstream. Possible drift in cap-throttle / approval pathway. NOT in F-AI-WORKER-PARSER-SKIP-BUG scope.
- Invegent has no `c.client_channel` rows but Invegent FB and LI publish fine — routing must use a different mechanism for this brand. Not a current issue, just an inconsistency.
- 32 historical `post_draft_not_found` orphan rows (16 NY-FB + 16 PP-FB) confirmed as expected carry-forward state per M6 Phase A scope (still BLOCKED).

## Mid-hold work (post-v2.45 checkpoint, same chat session)

### Additional reads (read-only)

- **05:38 UTC**: PK directed "try now" — S30 re-checked; jobid 80+81 still 0 runs ever; held.
- **05:48 UTC**: PK directed comprehensive setup verification of cron infrastructure. Read-only audit performed.

### Setup audit findings

All correct EXCEPT one initial flag-then-cleared:

| Component | State |
|---|---|
| pg_cron 1.6.4 + pg_net 0.19.5 + supabase_vault 0.3.1 | ✅ loaded |
| jobid 80 owner=postgres, db=postgres, localhost:5432, schedule `0 17 * * *` | ✅ |
| jobid 81 schedule `15 17 * * *` | ✅ |
| `cron.timezone=GMT` (= UTC), server tz=UTC | ✅ no schedule offset |
| Writer fn `public.write_ef_drift_log(p_rows jsonb, p_run_id uuid)` | ✅ matches v2.43 D-01 spec |
| `m.ef_drift_log` state | ✅ 98 rows, 2 distinct scans, unchanged |
| Vault `project_url` (40 chars, matches project ref) | ✅ |
| Vault `service_role_key` (15 chars, value `98FsMNpZ-faTcgn`) | ⚠️ initially flagged |
| No conflicting cron at 17:00 UTC daily slot | ✅ (2 neighbours fire at minute :17 hourly, different schedule) |

### Vault investigation + resolution

PK provided two dashboard screenshots:
1. Settings → API Keys → Legacy anon, service_role: real service_role JWT is **219 chars** (`eyJhbGci...`)
2. Integrations → Vault → Secrets: vault entry `service_role_key` (added Feb 3, 2026): **15 chars** confirmed

So vault `service_role_key` is NOT the dashboard's service_role JWT — they are different things.

Resolution path: read drift-check EF source v1.0.8 at `supabase/functions/drift-check/index.ts` (sha `bb0931dc...`). Confirmed:

- EF auth: `verify_jwt:false` in config → inbound `Authorization: Bearer <anything>` is accepted, never validated by the EF
- EF env: `SUPABASE_SERVICE_ROLE_KEY` is auto-injected by Supabase platform with the real JWT
- EF uses auto-injected JWT internally to call `write_ef_drift_log` via PostgREST RPC

**The cron's auth chain:**

| Hop | Auth | Source |
|---|---|---|
| Cron → drift-check EF | `Bearer 98FsMNpZ-faTcgn` (vault) | accepted (`verify_jwt:false`) |
| EF → Management API | `Bearer sbp_...` | `MANAGEMENT_API_TOKEN` env |
| EF → GitHub raw | `Bearer ghp_...` | `GITHUB_PAT` env |
| EF → Postgres writer fn | `Bearer eyJ...` (real JWT, 219 chars) | auto-injected `SUPABASE_SERVICE_ROLE_KEY` |

The 15-char vault value sits on the first hop — and that hop doesn't validate it. **Cron will work tonight without vault change.** PK confirmed: no vault edit.

P3 hygiene cleanup logged + Lesson candidate #69 captured (vault entries shadow-named after auto-injected env vars create ambiguity). Captured in commit `ef021b40`.

### Dashboard architecture review doc location query (informational, no edits)

PK asked for the location of the dashboard revamp document with ChatGPT design back-and-forth + market research. Located via session index:

- **Kickoff session file**: `docs/runtime/sessions/2026-05-04-dashboard-architecture-review-kickoff.md` — captures the 4 review rounds (Reviewer 1 11-section structure, Reviewer 2 binary; GOV.UK + NZ digital + Google SRE + Carbon + Atlassian + WCAG market research; editorial CMS + AI agent observability + content moderation queue UX research), 3 foundational decisions (strategic renovation, Telegram-only multi-channel, agents-as-status-surface), refreshed 6-section IA (Now / Clients / Create / Investigate / Reports / Admin), 11-section structure with effort estimates totalling ~9–10h across 3 sessions, and 5 deferred decisions for §3.
- **Target review doc location (decided, not yet built)**: `docs/dashboard-review-2026-05/`
- **Cross-link target**: `invegent-dashboard/docs/architecture-review/`
- **§1 work**: not yet started ("next session whenever — no rush" per kickoff)

The standalone 11-section review document does not exist as separate files yet. All current content is in the kickoff session file. PK now has the location pointer for future reference. No file edits in this lookup.

## Closure budget

- Options 6 + 4 + checkpoint sync: ~35 min
- Mid-hold audit + vault investigation + dashboard doc lookup + 4-way sync close: ~10 min
- **Session total: ~45 min**
- Combined day total: ~10h
- Trailing-14-day: ~36.25h (well above 8.0 floor)
- P0+P1 open: 8 — unchanged from v2.44 (cluster re-eval + parser acid test were monitoring tasks, vault investigation closed via cleared flag, not closures)

## Session-close 4-way sync (this commit)

- **Session file** (this file): mid-hold work + amendments captured
- **Sync state** (`docs/00_sync_state.md`): inline summary refreshed with mid-hold extension, footer updated
- **Action list** (`docs/00_action_list.md`): already amended in commit `ef021b40` with v2.45 Mid-hold pre-fire setup audit block + P3 vault hygiene + Lesson candidate #69 — no further change
- **Memory** (entry #14): refreshed to v2.45 close state (50 char headroom retained)
- **Dashboard roadmap** (`app/(dashboard)/roadmap/page.tsx` in invegent-dashboard): LAST_UPDATED bumped only. PHASES array unchanged — it has been stale since 3 May (v2.34 onwards not reflected); full reconciliation deferred to a dedicated session, not appropriate mid-hold-state.

## Standing rules honoured

- D-01: 0 fires this session (read-only)
- D170: no DDL/DML applied
- D186: closure budget +~45 min; combined day ~10h; trailing-14-day ~36.25h above floor
- Lesson #61: not applicable (read-only)
- Lesson #68: not applicable (no fired writes)
- G1: this file is the per-session detail; sync_state inline summary updated; pointer index row added
- Lesson candidate #69 (NEW v2.45): vault entries shadow-named after auto-injected env vars create ambiguity; observation only, not promoted

## Hold-state continues until natural fire

Wait for natural cron fire 17:00 UTC tonight = 03:00 AEST tomorrow. Run S30 around 17:15 UTC / 03:15 AEST tomorrow.

**Hold-state rules per PK directive remain in force:**
- No Stage 2b / Stage 3 / P1 triage / NY×YT / M6
- No manual cron triggers
- No DML / DDL
- No close-the-loop UPDATEs
- No vault edits
- DO NOT REDEPLOY heygen-avatar-creator / heygen-avatar-poller / draft-notifier (P1 SECURITY-DEFINER regression-risk)
- Do not delete rows from `m.ef_drift_log` (98-row keep-both preserved)
