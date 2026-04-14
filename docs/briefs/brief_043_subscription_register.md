# Brief 043 — Subscription register dashboard page

**Date:** 14 April 2026  
**Phase:** 3 — Operations  
**Repo:** `invegent-dashboard`  
**Working directory:** `C:\Users\parve\Invegent-content-engine`  
**Supabase project:** `mbkmaxqhsohbtwsqolns`  
**MCPs required:** Supabase MCP, GitHub MCP  
**Estimated time:** 3–4 hours  
**Run after:** CFW acceptance test complete  

---

## Context

PK manages ~10 paid services that ICE depends on. Currently there is no single place
to see what’s running, what it costs, when it renews, and what plan level it’s on.
This brief builds a simple subscription register: a Supabase table seeded with all
current services, and a dashboard page with a table view + ability to add new rows.

---

## Task 1 — Create k.subscription_register table

```sql
CREATE TABLE IF NOT EXISTS k.subscription_register (
  subscription_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  service_name text NOT NULL,
  category text NOT NULL,       -- 'infrastructure' | 'ai' | 'visual' | 'email' | 'integration' | 'dev' | 'hosting' | 'video'
  use_case text NOT NULL,
  plan_name text,               -- e.g. 'Pro', 'Essential', 'Starter', 'Max', 'Free'
  billing_type text NOT NULL,   -- 'monthly' | 'annual' | 'usage' | 'free'
  cost_aud numeric(10,2),       -- NULL for usage-based
  cost_notes text,              -- e.g. '~$15/month at current volume'
  renewal_date date,            -- NULL for usage-based
  account_email text,           -- always pk@invegent.com
  status text NOT NULL DEFAULT 'active', -- 'active' | 'paused' | 'cancelled'
  login_url text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT NOW(),
  updated_at timestamptz NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE k.subscription_register IS
  'Registry of all paid services and subscriptions used by ICE. Manually maintained.';
```

---

## Task 2 — Seed with all current services

```sql
INSERT INTO k.subscription_register (
  service_name, category, use_case, plan_name, billing_type,
  cost_aud, cost_notes, renewal_date, account_email, status, login_url, notes
) VALUES

-- Infrastructure
('Supabase', 'infrastructure',
  'PostgreSQL database, Edge Functions, Auth, Storage, pg_cron',
  'Pro', 'monthly', 25.00, NULL, NULL,
  'pk@invegent.com', 'active', 'https://supabase.com/dashboard', NULL),

-- Hosting
('Vercel', 'hosting',
  'Deploys invegent-dashboard, invegent-portal, invegent-web. Auto-deploy on git push.',
  'Pro', 'monthly', NULL, 'Approx $20/mo depending on usage',
  NULL, 'pk@invegent.com', 'active', 'https://vercel.com', NULL),

-- AI — API costs
('Anthropic Claude API', 'ai',
  'Primary AI model for content generation (claude-sonnet-4-6). Also compliance review, diagnostics.',
  'API', 'usage', NULL, 'Approx $10-30/mo at current volume',
  NULL, 'pk@invegent.com', 'active', 'https://console.anthropic.com', NULL),

-- AI — Claude subscription (separate from API)
('Anthropic Claude (Max plan)', 'ai',
  'PK personal subscription. Used for Claude Code builds, OpenClaw remote control via Telegram.',
  'Max', 'monthly', NULL, 'Billed in USD — check console for AUD equivalent',
  NULL, 'pk@invegent.com', 'active', 'https://claude.ai', NULL),

-- AI — OpenAI API
('OpenAI API', 'ai',
  'Fallback AI model (GPT-4o) when Claude API fails.',
  'API', 'usage', NULL, 'Low volume — <$5/mo currently',
  NULL, 'pk@invegent.com', 'active', 'https://platform.openai.com', NULL),

-- AI — OpenAI subscription (separate from API)
('OpenAI ChatGPT (Plus/Pro)', 'ai',
  'PK personal subscription for ChatGPT access if used.',
  'Plus', 'monthly', NULL, 'Check if active — may not be subscribed',
  NULL, 'pk@invegent.com', 'active', 'https://chat.openai.com', 'Confirm plan level and whether still active'),

-- Visual
('Creatomate', 'visual',
  'Image and carousel generation for social posts. image-worker uses Creatomate API.',
  'Essential', 'monthly', 54.00, NULL, NULL,
  'pk@invegent.com', 'active', 'https://creatomate.com', NULL),

-- Video
('HeyGen', 'video',
  'AI avatar video generation. heygen-worker builds video_short_avatar format.',
  NULL, 'usage', NULL, 'Per video credit — check dashboard for current balance',
  NULL, 'pk@invegent.com', 'active', 'https://app.heygen.com', 'Confirm plan level'),

-- Email
('Resend', 'email',
  'Transactional email. Sends magic links (portal auth), B5 manager report, client weekly summary.',
  'Free', 'usage', NULL, 'Free tier currently — monitor volume',
  NULL, 'pk@invegent.com', 'active', 'https://resend.com', NULL),

-- Integration
('Zapier', 'integration',
  'LinkedIn publishing bridge. Routes approved drafts to LinkedIn Company Pages via webhook.',
  'Starter', 'monthly', 28.00, 'USD $19.99/mo — approx AUD $28-30',
  NULL, 'pk@invegent.com', 'active', 'https://zapier.com', 'Temporary until LinkedIn Community Management API approved'),

-- Dev
('GitHub', 'dev',
  'Source control for all 3 repos: Invegent-content-engine, invegent-dashboard, invegent-portal.',
  'Free', 'free', 0.00, NULL, NULL,
  'pk@invegent.com', 'active', 'https://github.com/Invegent', NULL);
```

Verify:
```sql
SELECT service_name, category, plan_name, billing_type, cost_aud, status
FROM k.subscription_register
ORDER BY category, service_name;
```

Expected: 11 rows.

---

## Task 3 — Create SECURITY DEFINER functions for dashboard

The k schema requires SECURITY DEFINER for DML.

```sql
-- Read all subscriptions
CREATE OR REPLACE FUNCTION public.get_subscriptions()
RETURNS TABLE(
  subscription_id uuid, service_name text, category text, use_case text,
  plan_name text, billing_type text, cost_aud numeric, cost_notes text,
  renewal_date date, account_email text, status text, login_url text, notes text,
  created_at timestamptz, updated_at timestamptz
)
LANGUAGE sql SECURITY DEFINER
AS $$
  SELECT subscription_id, service_name, category, use_case,
    plan_name, billing_type, cost_aud, cost_notes,
    renewal_date, account_email, status, login_url, notes,
    created_at, updated_at
  FROM k.subscription_register
  ORDER BY category, service_name;
$$;

-- Insert new subscription
CREATE OR REPLACE FUNCTION public.add_subscription(
  p_service_name text,
  p_category text,
  p_use_case text,
  p_plan_name text DEFAULT NULL,
  p_billing_type text DEFAULT 'monthly',
  p_cost_aud numeric DEFAULT NULL,
  p_cost_notes text DEFAULT NULL,
  p_renewal_date date DEFAULT NULL,
  p_account_email text DEFAULT 'pk@invegent.com',
  p_login_url text DEFAULT NULL,
  p_notes text DEFAULT NULL
) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE v_id uuid;
BEGIN
  INSERT INTO k.subscription_register (
    service_name, category, use_case, plan_name, billing_type,
    cost_aud, cost_notes, renewal_date, account_email, login_url, notes
  ) VALUES (
    p_service_name, p_category, p_use_case, p_plan_name, p_billing_type,
    p_cost_aud, p_cost_notes, p_renewal_date, p_account_email, p_login_url, p_notes
  ) RETURNING subscription_id INTO v_id;
  RETURN v_id;
END;
$$;

-- Update subscription status or plan
CREATE OR REPLACE FUNCTION public.update_subscription(
  p_id uuid,
  p_status text DEFAULT NULL,
  p_plan_name text DEFAULT NULL,
  p_cost_aud numeric DEFAULT NULL,
  p_notes text DEFAULT NULL
) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER
AS $$
BEGIN
  UPDATE k.subscription_register SET
    status    = COALESCE(p_status, status),
    plan_name = COALESCE(p_plan_name, plan_name),
    cost_aud  = COALESCE(p_cost_aud, cost_aud),
    notes     = COALESCE(p_notes, notes),
    updated_at = NOW()
  WHERE subscription_id = p_id;
END;
$$;
```

---

## Task 4 — Build dashboard page

Create `app/(dashboard)/system/subscriptions/page.tsx` in `invegent-dashboard`.

**Design spec:**
- Route: `/system/subscriptions` (under the System nav zone)
- Summary bar at top: total fixed monthly cost (AUD), count of active services
- Category filter pills: All | Infrastructure | AI | Visual | Email | Integration | Dev | Hosting | Video
- Table columns: Service | Category | Plan | Billing | Cost | Use case | Status | Link
- Status badge: active (green) | paused (amber) | cancelled (grey)
- Billing badge: monthly (blue) | usage (purple) | free (grey) | annual (teal)
- Cost column: show `$X.00/mo` for fixed, `Usage` for variable, `Free` for free
- Each row has a link icon that opens the login_url in a new tab
- “+ Add service” button opens an inline form at the top of the table

**Add service form fields:**
- Service name (text, required)
- Category (select: infrastructure | ai | visual | email | integration | dev | hosting | video)
- Use case (text, required)
- Plan name (text)
- Billing type (select: monthly | annual | usage | free)
- Monthly cost AUD (number, optional)
- Cost notes (text, optional)
- Login URL (text, optional)
- Notes (text, optional)
- Submit → calls `/api/subscriptions` POST route

**API route:** Create `app/api/subscriptions/route.ts`:
- GET: calls `get_subscriptions()` RPC
- POST: calls `add_subscription()` RPC with body fields

**Navigation:** Add “Subscriptions” link under the System zone in the dashboard sidebar.

---

## Task 5 — Deploy

```bash
# In invegent-dashboard repo
git add app/(dashboard)/system/subscriptions/ app/api/subscriptions/
git commit -m "feat: subscription register page — all ICE services with cost and plan"
git push origin main
# Vercel auto-deploys
```

---

## Task 6 — Verify

- Navigate to `dashboard.invegent.com/system/subscriptions`
- Confirm 11 rows showing
- Confirm total fixed monthly cost displays correctly: $25 + $54 + $28 = $107/mo fixed
  (Vercel Pro, Claude Max, OpenAI Plus not confirmed — mark as TBC)
- Test “+ Add service”: add a test row, confirm it appears
- Test category filter pills work
- Test link icons open correct URLs

---

## Task 7 — Write result file

Write `docs/briefs/brief_043_result.md`:
- Table created and seeded: yes/no, row count
- Dashboard page live: URL
- Any rows that need PK to confirm plan/cost details
- Any errors

---

## Data to confirm manually (PK)

These rows are seeded with placeholder data and need PK to update:
- **Vercel** — confirm whether on Pro or free tier, actual monthly cost
- **HeyGen** — confirm plan name and whether subscription or pure credit-based
- **OpenAI ChatGPT** — confirm whether actively subscribed and which plan
- **Anthropic Claude Max** — confirm exact monthly AUD cost
- **Zapier** — confirm plan once set up (Brief 042)
