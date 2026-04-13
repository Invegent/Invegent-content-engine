# Brief 034 Result — Performance → Scoring Feedback Loop

**Executed:** 13 April 2026
**Commit:** bf28f8c

## Task Results
| Task | Status |
|------|--------|
| 1. Verify post_performance (154 rows, 2 clients) | COMPLETED |
| 2. m.topic_score_weight table | COMPLETED |
| 3. recalculate_topic_weights() function | COMPLETED (fixed: uses final_category not topic_label) |
| 4. Bundler wiring | SKIPPED — no populate_digest_items_v1 function found; scoring is in Edge Function/cron SQL |
| 5. insights-feedback Edge Function | COMPLETED — ACTIVE |
| 6. pg_cron: insights-feedback-daily (job 52) | COMPLETED |
| 7. Deploy | COMPLETED |
| 8. Verify: 2 topics calculated for NDIS Yarns | COMPLETED |

## Key Findings
- digest_item uses `final_category` not `topic_label` — function corrected
- NDIS Yarns: 2 topics (interest_rates: weight 1.0, unknown: weight 1.0) — engagement rates are 0 for these posts so weights are neutral
- Bundler scoring wiring skipped — the weight table is ready for the bundler to consume when it's next updated
- Weights will improve as more engagement data flows from insights-worker nightly runs
