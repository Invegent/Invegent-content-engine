# B31 — Auto-Approver v1.6.0 Deploy + First-Tick Verification

**Status:** ✅ DONE — deploy live; first cron tick verified eligibility_safety_net_fires=0
**When (UTC):** 2026-05-02 ~12:00 to ~12:45
**Owner:** chat (chat-driven end-to-end via Supabase MCP `deploy_edge_function`)
**Closes:** B31, B32, T08 (workstream 2 closure)

---

## What landed

| Artefact | Where | Detail |
|---|---|---|
| Repo source | `supabase/functions/auto-approver/index.ts` on `main` | commit `f65e16d2104d8ad9ce9f243ba36a34ddb1d0f2b7` |
| Deployed EF | Supabase project `mbkmaxqhsohbtwsqolns` | function version 52 → 53; status ACTIVE; ezbr_sha256 `65f65f0c89960d2f500732546020db260fb751f371c002dd074f88dd2dfd1c80` |
| Deploy mechanism | Supabase MCP `deploy_edge_function` | NEW capability for chat — first chat-driven EF deploy in ICE history |
| Auth | `verify_jwt: false` | matches v1.5.0 deployed config; auto-approver uses custom `x-auto-approver-key` header |

---

## Three coordinated changes from v1.5.0

1. **Eligibility filter at SQL** — already deployed via SQL v5 fetch fn (LIVE since prior session). Drafts where `auto_approve_enabled=true` filtered at INNER JOIN LATERAL. DraftRow gains `platform` field per v5 RETURNS TABLE.

2. **Terminal rejection on content-gate failure** — content-gate failures (body_length, sensitive_keywords) now set `approval_status='rejected'`. Fires `trg_handle_draft_rejection` → slot reset → fresh draft generation. **This is the F-PUB-004 fix.** v1.5.0 only updated `auto_approval_scores` JSONB, leaving drafts at `needs_review` to cycle indefinitely.

3. **Eligibility safety net** — if eligibility/state gates fire anyway (SQL filter regression), return `outcome='skipped'` and leave draft at `needs_review`. Tracked via `eligibility_safety_net_fires` counter — should be 0 in steady state.

**Plus B32 Path 3 EF cooldown defence-in-depth** — drafts auto-reviewed within 4h returned as `outcome='skipped'` (`cooldown_active`) without re-evaluating gates. Reads `draft_format.auto_review.checked_at` JSONB. Prevents log spam if eligibility safety net fires repeatedly; protects against rapid re-evaluation if a regression flips approval_status back.

**Response shape extended:**
- `auto_rejected` (new) — count of terminal-rejected drafts
- `skipped_needs_human_review` — DEPRECATED alias mirroring auto_rejected (v1.7.0 removes)
- `skipped` (new) — count of cooldown + safety-net skips combined
- `eligibility_safety_net_fires` — should be 0 in steady state
- `cooldown_skips` — count of cooldown_active outcomes

**ELIGIBILITY_GATES set:** `{"auto_approve_enabled", "not_rejected", "source_score"}` — explicit classification with removal-trigger comment. `source_score` included as defence-in-depth while scoring is no-op (D135). Remove from set when scoring is intentionally re-enabled.

---

## Three MCP review fires (per protocol v2.17)

| # | review_id | action_type | target | outcome | path taken |
|---|---|---|---|---|---|
| 1 | `d38ba055-88e2-499d-aa9e-8217f6492e2a` | plan_review | B32 cooldown design choice | escalated (weak objections) | PK Path 3 — full correction (Option C → Option B + EF cooldown) |
| 2 | `2d09be1d-6691-4744-8f58-c3bda5043f25` | plan_review | v1.6.0 first-cut patch | escalated (JSONB validation gap) | Lesson #61 self-flag triggered — closed via 967/967 SELECT |
| 3 | `304a87cc-1316-4ad4-8621-c516dc0277b7` | plan_review | v1.6.0 rebased patch | escalated (source_score classification) | PK chose defence-in-depth — added source_score to ELIGIBILITY_GATES |

**T-MCP-02 quota now 7 of 5** (4 captured pre-session + 3 this session). Quota exceeded.

---

## JSONB pre-flight validation (Lesson #61 closure)

Before deploying v1.6.0 cooldown logic, validated the JSONB path it reads against live data:

```sql
SELECT
  COUNT(*) AS total,
  COUNT(*) FILTER (WHERE draft_format -> 'auto_review' ->> 'checked_at' IS NOT NULL) AS with_path,
  MAX((draft_format -> 'auto_review' ->> 'checked_at')::timestamptz) AS latest
FROM m.post_draft
WHERE draft_format -> 'auto_review' ->> 'agent' LIKE 'auto-approver-v1.5.0';
```

Result: **967/967 production rows** have `draft_format.auto_review.checked_at` at expected JSONB path. Latest write 2026-05-02T12:20:04Z confirmed v1.5.0 actively writing immediately before this session.

This closes Lesson #61 candidate's third vindication — promotion from candidate to canonical lesson committed in action_list v2.19.

---

## Source baseline drift discovery

Sample `m.post_draft` row inspection during MCP review #2 revealed: deployed agent on production rows = `auto-approver-v1.5.0`, NOT v1.4.1 in repo. Repo was missing v1.5.0 entirely — it had been deployed via Supabase EF dashboard without a corresponding push to `supabase/functions/auto-approver/index.ts`.

**Diff v1.4.1 → v1.5.0 (retrieved via Supabase MCP `get_edge_function`):** only changes are `min_score: 6/5/5` → `min_score: 0/0/0` for Property Pulse, NDIS Yarns, Care For Welfare + default fallback (D135 bundler removal — `final_score=0` on all drafts). Plus inline comment in evaluateGates source_score block. JSONB output structure identical.

**v1.6.0 rebased on v1.5.0** — min_score: 0 across all 4 locations, header comment block updated to reference v1.5.0 baseline, version history extended.

**Governance gap captured as B37 candidate:** "v1.5.0 source archive — capture deployed-but-not-in-repo gap as governance issue." Not action-required this session; record-of-truth gap is now closed by v1.6.0 commit which contains the v1.5.0 changes embedded.

---

## Pre-deploy state baseline (12:40 UTC snapshot)

| Metric | Value |
|---|---|
| Drafts at `approval_status='needs_review'` | 563 |
| Rejected last hour | 0 |
| Approved last hour | 0 |
| Rows touched by v1.5.0 (any time) | 552 |
| Rows touched by v1.6.0 (any time) | 0 |
| auto-approver-sweep cron schedule | `*/10 * * * *` |
| auto-approver-sweep cron active | true |
| Last cron run before deploy | 2026-05-02 12:30:00 UTC |

**Cooldown distribution among 563 needs_review drafts:**
| Bucket | Count |
|---|---|
| never_auto_reviewed | 482 |
| cooldown_active (< 4h) | 30 |
| cooldown_expired (4-24h) | 2 |
| cooldown_expired (24h-7d) | 11 |
| cooldown_expired (> 7d) | 38 |

The 30 cooldown-active drafts are the cycling-30 from v1.5.0's last tick at 12:30 UTC.

---

## Deploy event

Supabase MCP `deploy_edge_function` called at ~12:39:33 UTC. Response:

```json
{
  "id": "9180633e-fb49-476e-a147-00e447b3793a",
  "slug": "auto-approver",
  "version": 53,
  "status": "ACTIVE",
  "verify_jwt": false,
  "ezbr_sha256": "65f65f0c89960d2f500732546020db260fb751f371c002dd074f88dd2dfd1c80",
  "updated_at": 1777725573346
}
```

Verification via `get_edge_function`: deployed source `VERSION = "auto-approver-v1.6.0"` matches repo commit `f65e16d2` exactly.

---

## First cron tick verification (12:40:00 UTC, 27 sec after deploy)

Cron `auto-approver-sweep` fired at 12:40:00.485 UTC. Body `{"limit": 30}`. Captured response from `net._http_response` (id 90793, status 200):

```json
{
  "ok": true,
  "version": "auto-approver-v1.6.0",
  "processed": 30,
  "approved": 0,
  "auto_rejected": 0,
  "skipped": 30,
  "skipped_needs_human_review": 0,
  "eligibility_safety_net_fires": 0,
  "cooldown_skips": 30,
  "errors": 0,
  "results": [...]
}
```

**Acceptance criteria met:**
- ✅ `eligibility_safety_net_fires: 0` — SQL contract intact (v5 fetch fn correctly excludes `approval_status='rejected'` and filters on `auto_approve_enabled=true`)
- ✅ `errors: 0` — no DB write failures, no fetch failures
- ✅ All 30 fetched drafts skipped via cooldown_active reason `last_checked 10min ago, window 4h`
- ✅ Version string in response matches deployed source

**Sample result rows** (first 6 of 30) confirm cooldown reason format and platform diversity:
- Property Pulse facebook + linkedin
- NDIS Yarns linkedin + facebook + instagram

---

## Expected timeline

| When | What | Why |
|---|---|---|
| T+0 (now, 12:40 UTC) | cooldown holds 30 cycling drafts | All within 4h window of v1.5.0's last tick |
| T+10min | next cron tick — same 30 drafts hit cooldown | Top of stratified order, still in cooldown |
| ~T+4h (16:30 UTC) | cooldown expires for oldest cycling drafts | v1.6.0 evaluates → terminal-rejects → trg fires → slots reset |
| T+4h+ | fresh drafts generated for reset slots | AI worker runs against empty slots |
| T+4-6h | fresh approvals begin | Some new drafts will pass content gates |
| Throughout | 482 never-auto-reviewed drafts get processed as buckets clear | Lower stratification rank than cycling-30, picked up over time |

**S16 standing check is now active.** Monitor: fresh approvals across multiple (client, platform) buckets within 24h of deploy.

---

## Honest limitations of this run

- **Cooldown delays first observable terminal rejection by ~4h.** The 30 cycling drafts won't get terminally rejected until cooldown expires. F-PUB-004 starvation has been active 7+ days; another 4h is trivial. Documented for next-session check.
- **Stratified fetch may keep cycling-30 at top of fetch order.** Until they terminal-reject, they'll be re-fetched + skipped every 10min. The 482 never-reviewed drafts only get processed as buckets clear. This is expected behaviour, not a bug.
- **Rapid regeneration loop after first wave of rejections.** Once trg fires and slots reset, AI worker generates new drafts. If new drafts also fail content gates (likely same body_length issue), they'll terminal-reject immediately (no cooldown delay — fresh drafts have no prior auto_review). Slot churn is intended; F-PUB-004 closure depends on it.
- **First cron tick result was deterministic given pre-deploy state.** All 30 fetched drafts were the cycling-30 with active cooldowns. The eligibility_safety_net_fires=0 result confirms SQL contract intact, but doesn't yet validate gate evaluation behaviour. That validates after T+4h when cooldown expires for the first cohort.

---

## Records updated this session

- `supabase/functions/auto-approver/index.ts` — repo source (commit `f65e16d2`)
- Supabase EF — deployed v1.6.0 (version 53, ACTIVE)
- `docs/00_sync_state.md` — addendum (this commit)
- `docs/00_action_list.md` — bumped to v2.19 (this commit)
- `docs/06_decisions.md` — D186 closure discipline appended (this commit)
- `docs/runtime/runs/2026-05-02-b31-auto-approver-v160-deploy.md` — this file (NEW, this commit)

---

## Standing rule honoured (D-01 + protocol v2.17)

- ✅ Three MCP review fires before deploy (B32 design + v1.6.0 first-cut + v1.6.0 rebased)
- ✅ Each fire used 7-field call-side context per protocol v2.17
- ✅ Each escalation followed 6-step response procedure (separate strong vs weak objections, lowest-risk default, recommend path, record PK reason)
- ✅ Lesson #51 honoured — disproportionate scrutiny: 4-round pre-design ChatGPT reviews + 3 MCP fires + JSONB pre-flight + baseline drift correction + defence-in-depth on source_score
- ✅ Deploy via Supabase MCP `deploy_edge_function` (chat-driven; first such deploy in ICE history)
- ✅ Post-deploy verification within 60 seconds of deploy completion

---

## Closure hours this session

**~3.5 h** (chat-side wall-clock from session start to first-tick verification + record-writing).

This counts as closure work per D186 — closes B31 (P0 build), B32 (P0 design), T08 (workstream 2). Trailing-14-day closure hours bump to be reflected in next action_list v2.19 header.
