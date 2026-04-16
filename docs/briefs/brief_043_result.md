# Brief 043 — Result

**Date completed:** 16 April 2026
**Status:** ✅ Complete

## What was built

- `k.subscription_register` table created in Supabase
- 11 rows seeded (all current ICE services)
- 3 SECURITY DEFINER functions: `get_subscriptions()`, `add_subscription()`, `update_subscription()`
- `/api/subscriptions` route in invegent-dashboard (GET + POST)
- `/system/subscriptions` dashboard page
  - Summary bar: fixed monthly total, active count, usage-based count, needs-confirmation count
  - Category filter pills
  - Table with billing + status badges, TBC amber flag, link icons
  - Inline Add service form

## Verified
- Row count: 11 ✅
- Fixed monthly total: $107/mo (Supabase $25 + Creatomate $54 + Zapier $30)
- GitHub = free, Resend = free, Claude/OpenAI/HeyGen = usage-based (excluded from fixed total)

## Items needing PK confirmation

| Service | What to confirm |
|---|---|
| Vercel | Pro or Hobby? Exact monthly cost |
| HeyGen | Subscription plan or pure credit-based? |
| OpenAI ChatGPT | Still subscribed? Which plan? |
| Anthropic Claude Max | Exact AUD monthly cost |

Update directly in Supabase Studio → k.subscription_register, or via the dashboard Add form.
