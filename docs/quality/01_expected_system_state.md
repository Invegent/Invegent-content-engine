# ICE — Expected System State
## Layer 1 Foundation Document — QA Framework

This document defines what the ICE pipeline should produce at each stage.
It is the specification that drives the automated test runner (B3) and
the system audit function (B4).

**How to use:**
- Before any build: confirm expected state is documented for affected stage
- After any build: verify actual output matches expected state
- Weekly: audit function checks all invariants automatically
- When a bug is found: add the failure condition as a permanent test

**How to calibrate:**
Expected ranges are based on actual observed production data.
Update the ranges when system characteristics change.
Date-stamp all calibration updates.

---

## PIPELINE STAGE EXPECTATIONS

### Stage 1 — ingest-worker
**Runs:** Every 6 hours via pg_cron
**Expected outputs per run:**
```
f.raw_content_item rows created:    20 – 200 per run
f.content_item rows normalised:     15 – 180 per run  
f.canonical_content_item new:       5 – 100 per run (deduplication reduces)
Feed give-up rate per source:       < 70%
Active feeds silent > 48 hours:     0
Feeds returning errors:             0
```
**Failure conditions:**
- 0 new raw_content_items in a 6-hour window → pipeline stalled
- Any single feed at give-up rate > 70% for 2 consecutive weeks → deprecate feed
- ingest_run record with status != 'complete' after 30 minutes → stuck run

**Calibration note:** Ranges to be confirmed from live data. Update with actuals.
**Last calibrated:** Not yet calibrated — requires C1 (Insights back-feed) and live observation.

---

### Stage 2 — content-fetch
**Runs:** Every 10 minutes via pg_cron
**Expected outputs per run:**
```
f.canonical_content_body status='success':       > 30% of attempts
f.canonical_content_body status='give_up_*':     < 70% of attempts
Items stuck in 'pending_fetch' > 2 hours:        0
Jina fetch timeout rate:                         < 20%
```
**Failure conditions:**
- Success rate drops below 20% → Jina API issue or systematic paywall change
- Items stuck in pending_fetch > 2 hours → dead letter candidate

**Calibration note:** Current give-up rate is known to be high (272 paywall URLs).
Baseline should reflect post-feed-quality-fix state.

---

### Stage 3 — bundler (digest)
**Runs:** Every 2 hours via pg_cron
**Expected outputs per run:**
```
m.digest_run created:                      1 per client per run
m.digest_item rows per digest_run:         5 – 30 per client
Items with relevance_score > threshold:    > 60% of digest items
Digest runs with 0 items:                  0 for active clients
```
**Failure conditions:**
- digest_run created but 0 digest_items → scoring failure or no relevant content
- digest_run not created for active client in > 3 hours → bundler stalled

---

### Stage 4 — ai-worker
**Runs:** Every 30 minutes via pg_cron
**Expected outputs per run:**
```
m.post_draft created per digest_item:      ≥ 80% within 2 hours of digest
Compliance HARD_BLOCK rate:                < 5% of drafts
Compliance SOFT_WARN rate:                 < 30% of drafts
Drafts stuck in 'generating' > 30 min:    0
AI API error rate:                         < 5% of calls
```
**Failure conditions:**
- Draft rate drops below 50% → AI API issue or prompt failure
- Any draft stuck in 'generating' > 30 minutes → ai_job dead letter candidate
- HARD_BLOCK rate > 10% → compliance rules too aggressive or content quality issue

---

### Stage 5 — auto-approver
**Runs:** Every 30 minutes via pg_cron
**Expected outputs:**
```
Drafts auto-approved per week:             > 70% of all drafts
Drafts flagged for human review:           < 30% of all drafts
Drafts stuck in 'needs_review' > 48 hrs:  0 (human must action)
Auto-approver run errors:                  0
```
**Failure conditions:**
- Auto-approval rate < 50% → threshold miscalibrated or content quality degraded
- Human review backlog > 10 items → manual intervention required

---

### Stage 6 — publisher
**Runs:** Every 15 minutes via pg_cron
**Expected outputs:**
```
Posts published per client per day:        ≥ 1 (active clients in auto mode)
Posts published per client per week:       5 – 7
Publish failures without retry:            0
m.post_publish record within 15 min       
  of post_publish_queue.due_at:            100%
Post_publish_queue items locked > 2 hrs:   0
```
**Failure conditions:**
- Active client with 0 posts in 48 hours → critical alert
- publish failure rate > 5% → Meta API issue
- Queue item in 'locked' state > 2 hours → worker timed out, needs manual unlock

---

### Stage 7 — compliance-monitor
**Runs:** Monthly (1st of month) via pg_cron
**Expected outputs:**
```
Policy URLs checked:                       5 (all monitored URLs)
Hash comparison completed:                 5/5
m.compliance_review_queue items created    
  when hash changed:                       ≥ 0 (0 is valid if no changes)
Review queue cleared within 7 days:        100%
```
**Failure conditions:**
- compliance-monitor run not recorded in month → cron failure
- Review queue items older than 7 days → human has not actioned

---

## SYSTEM INVARIANTS

These must be true at all times. Checked by system audit function.

### Structural Invariants
```
□ All 25 Edge Functions deployed and status = ACTIVE
□ All pg_cron jobs exist with correct schedules
□ All Vault secrets present (existence check, not value)
□ RLS policies exist on all client-scoped m and c tables
□ k schema catalog table count matches actual schema table count
□ k.vw_table_summary returns rows for all 8 schemas
```

### Operational Invariants
```
□ Both clients have active publish profiles (status = 'active')
□ Both clients have platform tokens with expires_at > now() + 7 days
□ Feed source count ≥ 10 per client vertical (active feeds only)
□ No m.ai_job in 'generating' state for > 1 hour
□ No m.post_publish_queue item in 'locked' state for > 2 hours
□ Dead letter queue item count has not grown vs 24 hours ago
□ No m.ingest_run in 'running' state for > 1 hour
```

### Data Integrity Invariants
```
□ Every m.post_draft has a valid digest_item_id
□ Every m.post_publish has a valid post_publish_queue_id
□ Every m.digest_item has a valid digest_run_id
□ No m.post_draft with approval_status = 'approved' older than 24 hours
  without a corresponding m.post_publish_queue entry
□ No orphaned m.ai_job records (ai_job without corresponding digest_item)
```

### Compliance Invariants
```
□ Zero m.post_publish records where source draft had compliance_status = 'HARD_BLOCK'
□ m.compliance_review_queue has no items older than 7 days
□ All active clients have compliance rules configured (get_compliance_rules returns > 0 rows)
□ compliance-monitor has run within the last 35 days
```

---

## CALIBRATION LOG

Record here whenever expected ranges are updated and why.

| Date | Stage | Metric | Old Value | New Value | Reason |
|---|---|---|---|---|---|
| Apr 2026 | All | Initial | — | Ranges TBC | Document created, calibration pending live data |

---

## REGRESSION TEST LOG

Every bug fixed adds a permanent test. Record here.

| Date | Bug | Permanent Test Added |
|---|---|---|
| Mar 2026 | Error 368 infinite retry loop | publisher retry count never exceeds configured max |
| — | — | — |

---

*Document owner: PK*
*Review cycle: Calibrate after any significant pipeline change*
*Last updated: April 2026*
