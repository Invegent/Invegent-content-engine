# ICE — Decisions Log

## Purpose

Every significant architectural, strategic, or product decision
is recorded here with context and reasoning.

---

## D001–D100 — See earlier commits

---

## D101–D125 — See 16 Apr 2026 commits

---

## D126 — Topbar Critical Count Fix
**Date:** 17 April 2026 | **Status:** ✅ BUILT (Brief C)

Topbar now shows COUNT(DISTINCT client_id) among open CRITICAL incidents.

---

## D127 — Incident Deduplication + Auto-Resolution
**Date:** 17 April 2026 | **Status:** ✅ BUILT (migration)

`insert_pipeline_incident` patched — idempotent. `auto_resolve_pipeline_incidents()` cron #63 every 30 min.
**17 Apr fix v2:** Rewrote to join through digest_item → digest_run (post_draft.client_id was NULL).
Backfilled client_id on all existing post_draft rows. Resolved NY/PP/CFW incidents immediately.

---

## D128 — Token Expiry Badge Fix
**Date:** 17 April 2026 | **Status:** ✅ BUILT (Brief C)

NULL + has token → grey "Expiry not tracked". NY/PP Facebook show real expiry dates.

---

## D129 — Pipeline Health Card on Overview
**Date:** 17 April 2026 | **Status:** ✅ BUILT (Brief B)

---

## D130 — Collapse Engagement Tables Behind Dev-Tier Banner
**Date:** 17 April 2026 | **Status:** ✅ BUILT (Brief A)

---

## D131 — Sidebar Reorganisation
**Date:** 17 April 2026 | **Status:** ✅ BUILT (Brief A)

Performance + AI Costs + Compliance moved to MONITOR.

---

## D132 — Clickable Overview Stat Cards
**Date:** 17 April 2026 | **Status:** ✅ BUILT (Brief A)

---

## D133 — Cost Page Projections
**Date:** 17 April 2026 | **Status:** ✅ BUILT (Brief B)

---

## D134 — Onboarding Moved to Clients Tab
**Date:** 17 April 2026 | **Status:** ✅ BUILT (Brief C)

---

## D135 — Pipeline Selection Gap Fixed
**Date:** 17 April 2026 | **Status:** ✅ FIXED (migration)

`public.select_digest_candidates()` + cron #62 every 30 min. 550 candidates promoted, pipeline unblocked 17 Apr.

---

## D136 — Schedule Grid Icon Fix
**Date:** 17 April 2026 | **Status:** ✅ BUILT (Brief A)

---

## D137 — Onboarding Run Scans + Activation Flow
**Date:** 17 April 2026 | **Status:** ✅ BUILT (Brief E + G)

Run Scans button, scan results panel, Activate Client button with client dropdown.
`public.activate_client_from_submission(UUID, UUID)` migration applied 17 Apr.

---

## D138 — YouTube Discovery Route in Feed Discovery Pipeline
**Date:** 17 April 2026 | **Status:** ✅ BUILT (Brief D138+D139)

`seed_type = 'youtube_keyword'` routes to YouTube Data API. feed-discovery v1.1.0 deployed.

---

## D139 — Feed Source Taxonomy: Content Origin + Provenance
**Date:** 17 April 2026 | **Status:** ✅ BUILT (Brief D138+D139 + migration)

`f.feed_source.content_origin` + `added_by` columns added and backfilled.
Feeds page shows content origin badges + "Auto-discovered" teal provenance badges.

---

## D140 — Digest Item Scoring Disabled — Pending Future Build
**Date:** 17 April 2026 | **Status:** 🔲 Future build — Phase 3

**Problem discovered:** QA on 17 Apr 2026 revealed auto-approver pass rate was 6.7% overall
and 0% per-client. Root cause: `m.digest_item.final_score = 0.0` on all drafts.

**Why all scores are 0:**
The old bundler Edge Function computed `final_score` on `digest_item` during the scoring/selection
step. When D135 (Pipeline Selection Gap) was fixed on 17 Apr, `select_digest_candidates()` was
introduced to promote candidates — but it does not compute scores. The scoring logic was inside
the old bundler which was no longer running. Result: every digest_item has `final_score = 0`.

**Immediate fix applied (17 Apr):**
`auto-approver v1.5.0` deployed with `min_score = 0` for all clients. The score gate is now a
no-op. The auto-approver now only blocks on:
1. `auto_approve_enabled = false`
2. `approval_status = 'rejected'` (human previously rejected)
3. `body_length` — too short (< 80 chars) or too long (> 1800/2000 chars)
4. `sensitive_keywords` — blocklist match

**Future build required — Digest Item Scoring:**
`select_digest_candidates()` or a new `score-worker` needs to compute `final_score` on
`m.digest_item` based on:
- Source weight (`c.client_source.weight`) — already on the table, just not being used
- Content recency — days since published
- Fetch quality — did Jina get the full text or give up?
- Relevance — topic match to client vertical scope

**When to build:** Phase 3, after CFW content session and auto-approver pass rate is stable.
Scoring is a quality improvement, not a blocking issue. The body_length and keyword gates
are sufficient to catch the worst drafts in the interim.

**Decision:** Keep `min_score = 0` until scoring is implemented. Do not raise it until
`final_score` is actually being computed on new digest items.

---

## D138+D139 — Client Switch Stale State Fix
**Date:** 17 April 2026 | **Status:** ✅ FIXED

`VoiceFormatsTab`, `DigestPolicyTab`, `AvatarTab` all now get `key={activeClientId}`.
Forces React remount on client switch — no hard refresh needed.

---

## Decisions Pending

| Decision | Context | Target |
|---|---|---|
| D140 — Digest item scoring | Build score-worker or extend select_digest_candidates | Phase 3 |
| D138 — YouTube discovery route | ✅ Built | Done |
| D139 — Feed source taxonomy | ✅ Built | Done |
| NDIS Support Catalogue data load | Tables exist. Needs NDIA Excel from ndia.gov.au | Phase 3 |
| Legal review of service agreement | L001 — hard gate before external client #1 | Before C1 |
| F1 Prospect demo generator | Hold until NDIS Yarns has 60+ days data | ~mid-June 2026 |
| LinkedIn Community Management API | Evaluate Late.dev if still pending 13 May 2026 | 13 May 2026 |
| D124 — Boost Configuration UI | Meta Standard Access dependency | Phase 3.4 |
| RSS.app discovery dashboard page | Seed management UI — add/view/manage without SQL | Phase 3 |
| Cowork daily inbox task | Gmail MCP — archive noise, surface actions | Phase 4 |
| Model router | ai-job → model_router → claude OR openai | Phase 4 |
| SaaS vs managed service | When 10 clients served 3+ months | Phase 4 |
| Meta App Review | In Review. Contact dev support if stuck after 27 Apr 2026 | Waiting |
| animated_data advisor conflict | Fix in Format Library page | Immediate |
| Assign 12 unassigned feeds to clients | Via Feeds page — 9 discovery + 3 legacy | Immediate |
| CFW content session | Review first CFW drafts, tune AI profile, write prompts | Next session |
| Confirm TBC subscription costs | Vercel, HeyGen, Claude Max, OpenAI | Next session |
