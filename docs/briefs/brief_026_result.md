# Brief 026 Result — invegent.com Rebuild

**Executed:** 13 April 2026
**Executor:** Claude Code (Opus 4.6)
**Repo:** invegent-web
**Commit:** bf71fe4

---

## Task Results

| Task | Description | Status |
|------|-------------|--------|
| 1 | Check repo / scaffold | Already Next.js 14 — no scaffold needed |
| 2 | lib/proof-stats.ts (live data) | COMPLETED |
| 3 | app/page.tsx (8 sections) | COMPLETED |
| 4 | app/privacy/page.tsx | COMPLETED |
| 5 | Build | PASS — 0 errors |
| 6 | Commit and push | COMPLETED — bf71fe4 |

---

## All 8 Sections Built

1. **Hero** — "Your NDIS practice posts every day. Without you touching it." Dark bg, cyan accent, proof strip with live stats
2. **Problem** — "You know you should be on social media" — three pain points + competitor line
3. **How it works** — 3 cards: Signals, Drafts, Published
4. **Live proof** — NDIS Yarns stats (total published, this week, compliance flags) + 3 recent post previews
5. **Who built this** — PK avatar + bio: CPA, NDIS Plan Manager, OT practice administrator. Full blockquote
6. **Pricing** — 3 tiers: Starter $500, Standard $800 (highlighted), Premium $1,500. All with "Book a demo" CTA
7. **FAQ** — 5 questions, accordion style using HTML details/summary
8. **Final CTA** — "Ready to show up for your NDIS community?" Dark bg, demo button + email

## Technical Details

- **Live data:** lib/proof-stats.ts queries Supabase exec_sql for NDIS Yarns client_id. Falls back to hardcoded "127 posts, 14 this week" if Supabase env vars not available (e.g. during local build)
- **revalidate = 3600** on main page (hourly ISR)
- **Privacy page:** at /privacy with full policy text
- **CTA:** All "Book a demo" buttons link to mailto:hello@invegent.com?subject=ICE Demo Request
- **Footer:** Privacy link, ABN 39 769 957 807, copyright

## Build Notes

- Existing proof/* pages made force-dynamic to avoid build failure without env vars
- Supabase clients return null gracefully when env vars missing (safe for build)
- No new npm dependencies added
- PipelineFlow component no longer imported (was old page dependency)
- Build output: 6 routes, all under 96KB first load

## Env vars needed in Vercel (invegent-web project)

For live proof stats to work, these must be set in Vercel:
- `NEXT_PUBLIC_SUPABASE_URL` = https://mbkmaxqhsohbtwsqolns.supabase.co
- `SUPABASE_SERVICE_ROLE_KEY` = (service role key)

Without these, the fallback hardcoded values render instead.
