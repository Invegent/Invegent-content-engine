# Brief 013 — Env vars needed in Vercel (invegent-portal)

Set these in Vercel dashboard → invegent-portal → Settings → Environment Variables:

NEXT_PUBLIC_PORTAL_URL=https://portal.invegent.com

# Set to "true" ONLY when Meta Standard Access is confirmed:
FACEBOOK_OAUTH_ENABLED=false
FACEBOOK_APP_ID=<from Meta App dashboard>
FACEBOOK_APP_SECRET=<from Meta App dashboard — keep secret, not NEXT_PUBLIC_>

# Set to "true" ONLY when LinkedIn API is approved:
LINKEDIN_OAUTH_ENABLED=false
LINKEDIN_CLIENT_ID=78im589pktk59k
LINKEDIN_CLIENT_SECRET=<from LinkedIn app dashboard — keep secret>
