# ICE — Decisions Log

## Purpose

Every significant architectural, strategic, or product decision
is recorded here with context and reasoning.

---

## D001–D043 — See previous commits

---

## D044–D057 — See commit 9b810f0 (31 Mar 2026)

---

## D058 — Property Pulse Compliance-Aware System Prompt
**Date:** 31 March 2026 | **Status:** ✅ Live

**Decision:**
Embed financial compliance rules directly into the PP `brand_identity_prompt`.
PP is investment/property content — key regulatory framework is ASIC/AFSL rules,
NCCP for credit, and general financial advice prohibition for unlicensed operators.

**Five hard-block groups added:**
- Investment returns — no specific return projections, past performance disclaimer, no market timing directives
- Credit and lending — no loan product recommendations, no borrowing capacity advice
- Tax and depreciation — concepts fine, specific advice not; especially CGT timing and SMSF
- Product promotion — no unlicensed financial products, schemes, or syndicates
- Disclaimer rule — when to include (investment/tax/lending content) vs when not (pure data reporting)

---

## D059 — m.post_format_performance Aggregation
**Date:** 31 March 2026 | **Status:** ✅ Live

**Decision:**
Create `public.refresh_post_format_performance()` SQL function to aggregate
`m.post_performance` by `ice_format_key` per client for 7-day, 30-day, and all-time windows.
Runs via pg_cron daily at 3:15am UTC (after insights-worker at 3:00am).
Unique constraint on `(client_id, ice_format_key, rolling_window_days)` for upsert.
Initial run: 20 rows populated. Data sparse (new pages) but infrastructure ready.

---

## D060 — YouTube Pipeline Activation (Both Clients)
**Date:** 1 April 2026 | **Status:** ✅ Live

**Problem:**
D055 remap trigger was blocking all video formats for both clients.
YouTube OAuth tokens were identical (both pointing to same Google account, not channel-scoped).
youtube-publisher was using brittle slug-based env var name construction instead of DB lookup.

**Sequence of fixes:**
1. Generated fresh PP OAuth token via OAuth Playground (Property Pulse Brand Account)
2. Generated fresh NDIS OAuth token via OAuth Playground (pk@invegent.com — owns NDIS Yarns channel)
3. Created `client_publish_profile` rows for YouTube — both clients
4. Set `video_generation_enabled = true` on both clients' Facebook profiles
5. Dropped `trg_remap_video_format` trigger (D055) — no longer needed
6. youtube-publisher v1.1.0: fixed silent failure bug — `video_status` now set to `failed` on upload error instead of remaining `generated`
7. youtube-publisher v1.2.0: replaced brittle slug-based env var name construction with DB-driven `credential_env_key` lookup from `c.client_publish_profile`. Adding a new YouTube client now requires only a DB row, no code change.

**Credential naming:**
- PP: `YOUTUBE_REFRESH_TOKEN_PP` stored in Supabase secrets + password manager
- NDIS: `YOUTUBE_REFRESH_TOKEN_NDIS` stored in Supabase secrets + password manager

**YouTube channels:**
- NDIS Yarns: `UCqCTvPSR1BwhIi5Cui9_9Mw`
- Property Pulse: `UCudcAtOaVbYNc-9mXvou7Wg`

**Outstanding:** PP test video (Gold Coast housing, 28s kinetic) is rendered and queued.
YouTube upload pending secret propagation confirmation.

**Source committed:** `supabase/functions/youtube-publisher/index.ts` now in GitHub.

---

## D061 — OpenClaw Installed (Telegram Remote Control)
**Date:** 1 April 2026 | **Status:** ✅ Live

**Decision:**
Install OpenClaw as a Telegram-based remote control interface for ICE operations.
Allows querying pipeline status and issuing commands from phone via Telegram.

**Setup:**
- OpenClaw version: 2026.3.31
- Telegram bot: @InvegentICEbot (token in password manager)
- Model: `anthropic/claude-sonnet-4-6` via Max plan (`claude setup-token` auth)
- Gateway: Windows login item (auto-starts on boot)
- Auth profile: `anthropic:anthropic-max` (setup-token method)

**Runtime requirement:**
Gateway starts automatically but `openclaw tui` must be run manually after each restart.
One PowerShell window running `openclaw tui` must stay open for the bot to respond.

**Future:** Scope a SOUL.md for the ICE operations context so the agent understands
the pipeline and can answer questions about draft counts, publish status, etc.

---

## Decisions Pending

| Decision | Context | Target Date |
|---|---|---|
| YouTube secrets propagation | Supabase CLI set command fails with // in token — use dashboard edit or find CLI workaround | Next session |
| YouTube upload test confirm | Reset and test after secrets confirmed | Next session |
| OpenClaw SOUL.md | Define ICE context for the agent so it understands the pipeline | Phase 3 |
| Cowork → Supabase conversion | Move nightly reconciler + auditor to Edge Functions (laptop independence) | Next session |
| AI Diagnostic Tier 2 — auditor improvements | Add 3 new checks: config completeness, post-publish verification, video staleness | Phase 3 |
| Instagram publisher | 0.5 days after Meta App Review approved | Phase 3 |
| Prospect demo generator | ~2 days Claude Code | Phase 3 |
| Client health weekly report (email) | ~2 days Claude Code | Phase 3 |
| Invegent brand pages setup | Own ICE client | Phase 3 |
| Model router implementation | When AI costs become significant | Phase 4 |
| SaaS vs managed service long-term | When 10 clients served for 3+ months | Phase 4 |
| YouTube Stage C — HeyGen avatar | Phase 4 | Phase 4 |
