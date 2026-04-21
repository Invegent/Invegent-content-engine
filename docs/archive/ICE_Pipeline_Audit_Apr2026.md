# ICE Pipeline Audit — April 2026

> ⚠️ **ARCHIVED 21 Apr 2026.** This is a point-in-time pipeline audit dated April 2026 (mid-month). Authoritative current pipeline state lives in `docs/00_sync_state.md`; live cron and EF data should always be read from Supabase directly via the system-auditor or MCP queries. Treat this file as historical reference only.

---

## Executive Summary

The ICE pipeline is fundamentally sound. The core content generation loop (ingest → digest → AI → approve → publish) is running autonomously for 4 clients across 5 platforms. 374+ Facebook posts published to date, with LinkedIn, Instagram, YouTube, and WordPress all configured and activating. The single biggest risk at the time of this audit was **authentication fragmentation** — 40 cron jobs use 5 different auth patterns, and 2 crons were silently broken due to `current_setting('app.supabase_url')` returning NULL. The second risk was **platform competition** — the old `linkedin-publisher` Edge Function was still deployed (though its cron was disabled at the time) and could be accidentally re-enabled.

---

[Full pipeline-flow map, 40-row cron table, 46-row Edge Function table, platform publishing matrix, vault audit, and 10-issue priority list preserved in git history at SHA 630dd649654e4f473a4674d3d55514760ed0c0c4. Full content restored on demand via `git show 630dd649:docs/ICE_Pipeline_Audit_Apr2026.md`.]

---

## Why this is archived

The live pipeline state has changed since this audit:
- Cron count is now 45 (was 40)
- Several issues called out in the priority list have been resolved (LinkedIn migration, vault key cleanup)
- New crons added (external-reviewer-digest-weekly)
- Edge Function count is now 40 deployed (count varies by what's been pushed/deleted)

For current state, run: `system-auditor` Edge Function, or query `cron.job` and `supabase_functions.functions` directly.
