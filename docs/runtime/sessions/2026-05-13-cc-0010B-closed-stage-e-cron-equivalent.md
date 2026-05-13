# Session — 2026-05-13 Sydney — cc-0010B CLOSED-WITH-VERIFIED-VARIANCE (v2.68)

**Headline:** ice-evidence-materialiser EF v2 deployed (after F4 path (b) hotfix); first post-v2 cron fire `c256dc99-…` succeeded with 30 rows_inserted in 3.5 sec; PK accepted cron runtime proof as Stage E-equivalent variance; cc-0010B closed; cc-0010C unblocked.

---

## Arc

Session opened mid-stream with cc-0010B Stages A + B + C v1 + D complete (Stages C v1 + D landed earlier in this same session pre-compaction) and Stage E HELD pending PK direction on the F4 defect surfaced by the first cron pre-fire (turn 9, pre-compaction). The Stage E directive observation revealed `r.reconciliation_run` id `feff354a-f051-4e8a-acf4-2f79c8459421` had failed at 2026-05-13 00:30:04 UTC with FK violation `ice_publication_evidence_post_publish_queue_id_fkey`. Per Lesson #62 type-(b), the manual Stage E D-01 was withheld and escalated to PK with three fix candidates.

PK directives drove: F4 path (b) selection → Stage B hotfix branch + commit + merge → Stage C v2 redeploy → post-v2 cron observation → governance close-out → final cc-0010B close.

## Stages reified

| Stage | Action | D-01 review_id | Verdict | Status this session |
|---|---|---|---|---|
| C v1 | Initial EF deploy via Supabase MCP | `1729498a-49cf-41ef-b8b9-6ecbccc9c211` | clean agree, zero pushback | closed (turn 6 close-the-loop) |
| D | pg_cron jobid 83 install via apply_migration | `140dacb9-5cf1-4cb4-bbf3-b8495a00b0aa` | clean agree, zero pushback | closed (turn 8 close-the-loop) |
| E (initial) | HELD per L62 type-(b) escalation (cron pre-fire observation) | — (no D-01 fired) | — | escalated → F4 selected |
| B hotfix | Branch + commit `62f319c` (F4 path (b) in lib/materialiser.ts) | — (source patch only; no D-01 for branch+commit per session-internal pattern) | — | pushed to origin |
| B hotfix merge | FF-merge hotfix branch to main | `446dcd34-b36b-4b8b-b19e-5397d228f057` | clean agree, zero pushback | closed (turn 23 close-the-loop) |
| C v2 redeploy | Re-deploy EF from main @ `62f319c` | `7247fdf7-e1d8-41b6-b9d3-66283c4826ed` | clean agree, zero pushback | closed (turn 23 close-the-loop) |
| E (cron equivalent) | First post-v2 cron fire `c256dc99-484c-4206-80f5-7b4054c31532` succeeded with 30 inserts | — (PK accepted as variance, no manual fire) | — | CLOSED-WITH-VERIFIED-VARIANCE |

## Key events (chronological, this session post-compaction)

### Turn 13 — Stage B hotfix branch + commit
Created `feat/cc-0010B-fk-hotfix-publish-queue-null` from main (`e8e55399`). Two surgical replacements in `lib/materialiser.ts`: (1) F4 JSDoc paragraph above `buildEvidenceFromPublish`; (2) one code line `post_publish_queue_id: pp.queue_id` → `null` with inline F4 comment. Commit `62f319c8554b25ee06cf680bc548cf87f24521ba`. Pushed to origin. github MCP `create_branch` timed out at 4 min (local Claude Desktop MCP server unresponsive); recovered via Windows-MCP PowerShell driving local git. Cross-verified via Invegent GitHub bridge: blob `654c502ec0d679e8b9643ab9b5b63dca94c34baf`, 12047 bytes.

### Turn 16-17 — Stage B hotfix merge to main
D-01 `446dcd34-…` fired and returned clean agree zero pushback. FF-merge of hotfix branch to main; main HEAD advanced `e8e5539` → `62f319c`. Clean push. Cross-verified on `ref=main`: blob `654c502…` present.

### Turn 19 — Stage C v2 D-01
D-01 `7247fdf7-…` fired and returned clean agree zero pushback. Fifth consecutive clean pass-through this session (cumulative streak across v2.67 v1.5 + 4 v2.68 fires).

### Turn 20-21 — Stage C v2 redeploy with Supabase MCP failure + CLI recovery
Supabase MCP `deploy_edge_function` failed TWICE with `InternalServerErrorException: Function deploy failed due to an internal error` (request_ids `req_011CayjGWY42S9kNSR9Sqi2S`, `req_011CayjTp6Hm6E8Kqho8infX`). Both attempts atomic-rolled back; `list_edge_functions` confirmed v1 unchanged. Pivoted to directive''s "Approved command" — `supabase functions deploy ice-evidence-materialiser --no-verify-jwt --project-ref mbkmaxqhsohbtwsqolns` via Windows-MCP PowerShell on PK local machine. Pre-flight L41 verified local HEAD = `62f319c` (matches deploy ref). CLI deploy succeeded in 2.2 sec, exit 0; all 4 assets uploaded. EF advanced v1 → v2; new `ezbr_sha256 2bb6a1fc7386cbf875b3f532973bf63d4e16d2127cc09b909e034139cd351bdd`.

All 6 directive verification points PASS:
1. Function ACTIVE ✓
2. Version bumped (1 → 2) ✓
3. verify_jwt=false ✓
4. F4 path (b) present in deployed source (post_publish_queue_id: null in publish path) ✓
5. Queue path preserved (q.queue_id in queue helper) ✓
6. Unauth POST probe HTTP 401 ✓

### Turn 23 — Post-v2 cron observation + governance close-out
Observation at 2026-05-13 02:13:22 UTC found:
- Pre-v2 cron fires: 3 (all FAILED with FK violation; PK forensic-accepted per turn 12)
- Post-v2 cron fires: **1 SUCCEEDED**
- First post-v2 fire `r.reconciliation_run` id `c256dc99-484c-4206-80f5-7b4054c31532`:
  - started_at 2026-05-13 02:00:03.317543 UTC (≈2 min 36 sec after v2 deploy)
  - finished_at 2026-05-13 02:00:06.821 UTC
  - duration_ms 3503
  - rows_processed=72, rows_inserted=30, rows_updated=0, rows_skipped=42
  - error_summary NULL
  - summary_json horizon 2026-05-13 → 2026-05-20 (7d default); window draft_rows_fetched=38, queue_rows_fetched=60, publish_rows_fetched=20

Governance close-out: 2 D-01 rows (`446dcd34-…` + `7247fdf7-…`) closed in single atomic UPDATE → status=`resolved`, resolved_by=`PK`, escalation_resolved_at=2026-05-13 02:15:14.476556 UTC. action_taken enriched with 822 + 1029 chars respectively.

### Turn 25 — Final cc-0010B close-out (this turn)
PK accepted cron runtime proof as Stage E-equivalent evidence. cc-0010B Stage E marked CLOSED-WITH-VERIFIED-VARIANCE (variance: cron-triggered runtime execution vs manual fire). L45 declaration table recorded (F1, F2, F3, F4, E1). 4-way sync close: result file + session file + sync_state + action_list.

## Production mutations this session

| Mechanism | Count | Notes |
|---|---:|---|
| `apply_migration` (Stage D) | 1 (pre-compaction) | cron jobid 83 |
| `deploy_edge_function` MCP (Stage C v1) | 1 (pre-compaction) | v1 ACTIVE |
| `deploy_edge_function` MCP (Stage C v2) | 2 (failed, this session) | Clean atomic rollback both times |
| `supabase functions deploy` CLI (Stage C v2 recovery) | 1 (this session) | v1 → v2 in 2.2 sec |
| GitHub commits (production payload) | 2 | `62f319c` (Stage B hotfix; merged) + this close-out commit |
| `m.chatgpt_review` UPDATEs (close-the-loop) | 4 | All → status=`resolved` |
| ChatGPT MCP D-01 fires | 4 | All clean agree, zero pushback |
| `r.ice_publication_evidence` rows materialised | 30 | From first post-v2 cron fire — these are the materialiser''s production output |

## Metrics at session close

- T-MCP-02 cum: **64** (+4 from 60 at v2.67 close)
- State-capture exceptions: **0** (all 4 D-01s clean pass-through)
- L46 baseline: **5 consecutive clean pass-through D-01s** (cc-0010A v1.5 → Stage C v1 → Stage D → Stage B merge → Stage C v2) — longest streak to date
- L40 reified end-to-end at runtime (TS-compile-vs-FK-runtime gap caught + fixed + validated)
- L52 + L53 NEW lesson candidates v2.68

## Pattern firsts

1. First multi-stage F4 hotfix cycle (defect → Stage B remediation → Stage C v2 redeploy → Stage E cron equivalent)
2. First **CLOSED-WITH-VERIFIED-VARIANCE** result status
3. First Supabase MCP deploy failure → CLI recovery (2 MCP failures vs 1 CLI success on same payload)
4. First runtime proof from production cron accepted as Stage E equivalent (PK variance acceptance)
5. First 5-consecutive-clean-pass-through D-01 streak ending in a single session
6. First L40 reified end-to-end at production runtime
7. First L62 type-(b) escalation BEFORE D-01 fire (cron pre-fire observation pre-empted manual Stage E D-01 budget)

## What''s next

- cc-0010C reconciliation-matcher EF authoring (UNBLOCKED v2.68) → rank 1
- v1.6 cc-0010A doc patch (3 items: result_jsonb rename + r.set_updated_at trigger audit + m.post_publish.queue_id non-FK semantics docs) → rank 2
- 5-row prior cc-NNNN close-the-loop batch (10 sessions overdue) → rank 3
- 24-row historical escalated batch → rank 4

---

*Session file authored 2026-05-13 Sydney by chat (Claude). Result file at `docs/briefs/results/cc-0010B-ice-evidence-materialiser.md`. 4-way sync close in single commit alongside sync_state v2.68 + action_list v2.68 updates.*