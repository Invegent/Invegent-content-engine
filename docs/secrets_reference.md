# ICE — Secrets Reference

## What This Document Is

A registry of every credential, API key, and secret that ICE uses.
**No actual values are stored here.** This document tells you what exists,
where it lives, and what to do when it needs rotating.

The actual values live in two places:
- **Supabase Vault** — used by Edge Functions at runtime
- **Vercel Environment Variables** — used by Next.js apps at build/runtime
- **Google Password Manager** — master account passwords only

---

## Master Account Passwords
*Stored in Google Password Manager. These are login credentials, not API keys.*

| Account | URL | Notes |
|---|---|---|
| Supabase | supabase.com | Project: `mbkmaxqhsohbtwsqolns` (ap-southeast-2) |
| Anthropic | console.anthropic.com | Primary AI provider |
| OpenAI | platform.openai.com | Fallback AI provider |
| Vercel | vercel.com | Team: `pk-2528s-projects` |
| GitHub | github.com | Org: `Invegent` |
| Meta Developer | developers.facebook.com | App: Invegent Publisher |
| Google Workspace | admin.google.com | `feeds@invegent.com` account |
| Resend | resend.com | Email delivery |

---

## Supabase Vault Secrets
*Stored in `vault.secrets`. Accessed by Edge Functions via `Deno.env.get()`.
To view/update: Supabase Dashboard → Project Settings → Vault.*

| Secret name | What it is | Used by |
|---|---|---|
| `anthropic_api_key` | Claude API key | ai-worker, series-outline, series-writer |
| `openai_api_key` | OpenAI API key (fallback) | ai-worker |
| `ai_worker_api_key` | Internal auth key for ai-worker | ai-worker cron job, dashboard |
| `publisher_api_key` | Internal auth key for publisher + image-worker | publisher cron, image-worker cron, linkedin-publisher cron |
| `ingest_api_key` | Internal auth key for ingest function | ingest cron job |
| `project_url` | `https://mbkmaxqhsohbtwsqolns.supabase.co` | All cron jobs that call Edge Functions |
| `service_role_key` | Supabase service role key | draft-notifier, insights-worker, email-ingest |
| `publishable_key` | Supabase anon/publishable key | ai-worker cron, publisher cron |
| `gmail_client_id` | Gmail OAuth2 client ID | email-ingest |
| `gmail_client_secret` | Gmail OAuth2 client secret | email-ingest |
| `gmail_refresh_token` | Gmail OAuth2 refresh token | email-ingest |

---

## Vercel Environment Variables
*Set per project in Vercel Dashboard → Project → Settings → Environment Variables.
These are separate copies of the same secrets, used by Next.js apps.*

### invegent-dashboard (dashboard.invegent.com)
| Variable | What it is |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon/publishable key |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key (server-side only) |
| `AI_WORKER_API_KEY` | Same as vault `ai_worker_api_key` — for series API routes |

### invegent-portal (portal.invegent.com)
| Variable | What it is |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon/publishable key |
| `RESEND_API_KEY` | Resend email API key — for magic link emails |
| `NOTIFY_FROM` | From address for magic link emails (`noreply@invegent.com`) |

### invegent-web (invegent.com)
| Variable | What it is |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon/publishable key |

---

## Meta / Facebook
*Managed in Meta Developer Portal. Not stored in Supabase vault — stored
directly in `c.client_publish_profile.page_access_token` per client.*

| Credential | Where it lives | Notes |
|---|---|---|
| App ID | Meta Developer Portal + hardcoded as `FB_APP_ID` env var | Invegent Publisher app |
| App Secret | Vercel env var `FB_APP_SECRET` on dashboard | Used for token validation |
| Page Access Tokens | `c.client_publish_profile.page_access_token` (DB) | One per client Facebook page. Long-lived tokens, expire ~60 days. Dashboard shows expiry warning. |

---

## LinkedIn
*Managed via LinkedIn Developer Portal.*

| Credential | Where it lives | Notes |
|---|---|---|
| Community App credentials | LinkedIn Developer Portal | App ID: `78im589pktk59k` |
| Org Access Token | `c.client_publish_profile.page_access_token` (DB) for LinkedIn platform rows | Stored same as Facebook tokens |

---

## Gmail OAuth (email-ingest)
*OAuth2 credentials for `feeds@invegent.com` Google Workspace account.*

| Credential | Where it lives | Notes |
|---|---|---|
| Client ID | Supabase Vault `gmail_client_id` | From Google Cloud Console |
| Client Secret | Supabase Vault `gmail_client_secret` | From Google Cloud Console |
| Refresh Token | Supabase Vault `gmail_refresh_token` | Generated via OAuth Playground. Does not expire unless revoked. |

---

## Rotation Procedures

### When to rotate
- Supabase service role key: if compromised or annually
- AI provider keys: if compromised or if bill looks wrong
- Publisher / worker API keys: if compromised
- Facebook page tokens: auto-expire ~60 days — dashboard shows warning banner
- Gmail refresh token: only if Google revokes it (rare)

### How to rotate a Supabase vault secret
1. Generate new value at the provider
2. Supabase Dashboard → Project Settings → Vault → edit secret
3. Update matching Vercel env var if it exists there too
4. Redeploy affected Vercel apps (trigger via Vercel dashboard)
5. Cron jobs pick up vault changes automatically on next execution

### How to rotate a Facebook page token
1. Re-authenticate via dashboard → Connect tab → Reconnect Facebook
2. New long-lived token is stored in `c.client_publish_profile`
3. Check expiry in dashboard → Overview → Token Health

### How to rotate GitHub Personal Access Token
1. GitHub → Settings → Developer Settings → Personal Access Tokens
2. Generate new token with repo + workflow scopes
3. Update in Claude Code config: `~/.claude/settings.json` or equivalent

---

## Key IDs (non-secret, safe to store here)

| Item | Value |
|---|---|
| Supabase Project ID | `mbkmaxqhsohbtwsqolns` |
| Supabase Region | ap-southeast-2 (Sydney) |
| Vercel Team ID | `team_kYqCrehXYxW02AycsKVzwNrE` |
| Vercel Team Slug | `pk-2528s-projects` |
| Vercel Dashboard Project ID | `prj_iLsaEFCAqeuQjSdlbtfpfXC3jhxg` |
| Vercel Portal Project ID | `prj_EpPsX7gCu5wGbiSJr1SA3CmjVlAa` |
| Vercel Web Project ID | `prj_tXhG43iaqHBtVZpvU3osyG7dLLDZ` |
| Meta App ID | In Meta Developer Portal |
| LinkedIn App ID | `78im589pktk59k` |
| NDIS Yarns client_id | `fb98a472-ae4d-432d-8738-2273231c1ef4` |
| Property Pulse client_id | `4036a6b5-b4a3-406e-998d-c2fe14a8bbdd` |
| NDIS Yarns client_ai_profile_id | `3cbcd894-fee4-4511-bfe3-f03de422794a` |

---

## What NOT to put in this document
- Actual API key values
- Actual secret strings
- Passwords
- Access tokens

If you find a value in a Google Sheet or document, move it to the
appropriate vault location above and delete it from the sheet.
The sheet is not a secure store.
