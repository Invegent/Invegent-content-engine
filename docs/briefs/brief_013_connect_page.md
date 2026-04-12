# Claude Code Brief 013 — Platform OAuth Connect Page

**Date:** 12 April 2026  
**Status:** READY TO RUN  
**Decisions:** D088  
**Repo:** `invegent-portal` (UI) + `Invegent-content-engine` (DB functions)  
**Working directory:** `C:\Users\parve\invegent-portal`  
**Supabase project:** `mbkmaxqhsohbtwsqolns`  
**MCPs required:** GitHub MCP, Supabase MCP  
**Estimated time:** 3–5 hours  

---

## Context

The portal sidebar now links to `/connect`. That page is a stub.
This brief builds the real connect page — where clients connect their social media
pages so Invegent can publish on their behalf.

### How platforms are determined

A client's platforms come from their service agreement → service package → channels.
The join chain:
```
c.client_service_agreement (client_id, service_package_id, status='active')
  → c.service_package_channel (service_package_id, channel_code, is_included=true)
  → c.platform_channel (channel_code, platform)
```
Distinct platforms from that chain = what the client is entitled to publish on.

Example: CFW (Starter package) → platform = 'facebook' only.

Connection status comes from `c.client_publish_profile`:
- Row exists AND `page_access_token IS NOT NULL` AND `publish_enabled = true` → Connected
- Otherwise → Not connected

### Important constraints

- **Facebook OAuth for external clients is blocked until Meta Standard Access is confirmed.**
  For now: show the Facebook connect card but disable the button with a notice:
  "Platform connection coming soon — your content is being prepared by Invegent."
- **LinkedIn OAuth** — build the routes but they will not work until API is approved.
  Same treatment: show card, disabled button, "coming soon" notice.
- **The connect page must still look good and complete** even when buttons are disabled.
  Clients should feel the portal is professional, not broken.

---

## Task 1 — DB: SECURITY DEFINER function get_client_connect_status()

Create this function in Supabase via `apply_migration`.

```sql
CREATE OR REPLACE FUNCTION public.get_client_connect_status(p_client_id UUID)
RETURNS TABLE (
  platform TEXT,
  channel_codes TEXT[],
  is_connected BOOLEAN,
  page_name TEXT,
  page_id TEXT,
  token_expires_at TIMESTAMPTZ
) SECURITY DEFINER SET search_path = public AS $$
BEGIN
  RETURN QUERY
  SELECT
    pc.platform,
    array_agg(DISTINCT spc.channel_code) AS channel_codes,
    COALESCE(
      (
        SELECT (cpp.page_access_token IS NOT NULL AND cpp.publish_enabled = true)
        FROM c.client_publish_profile cpp
        WHERE cpp.client_id = p_client_id
          AND cpp.platform = pc.platform
        LIMIT 1
      ),
      false
    ) AS is_connected,
    (
      SELECT cpp.page_name
      FROM c.client_publish_profile cpp
      WHERE cpp.client_id = p_client_id
        AND cpp.platform = pc.platform
      LIMIT 1
    ) AS page_name,
    (
      SELECT cpp.page_id
      FROM c.client_publish_profile cpp
      WHERE cpp.client_id = p_client_id
        AND cpp.platform = pc.platform
      LIMIT 1
    ) AS page_id,
    (
      SELECT cpp.token_expires_at
      FROM c.client_publish_profile cpp
      WHERE cpp.client_id = p_client_id
        AND cpp.platform = pc.platform
      LIMIT 1
    ) AS token_expires_at
  FROM c.client_service_agreement csa
  JOIN c.service_package_channel spc
    ON spc.service_package_id = csa.service_package_id
    AND spc.is_included = true
  JOIN c.platform_channel pc
    ON pc.channel_code = spc.channel_code
  WHERE csa.client_id = p_client_id
    AND csa.status = 'active'
  GROUP BY pc.platform
  ORDER BY pc.platform;
END;
$$ LANGUAGE plpgsql;

GRANT EXECUTE ON FUNCTION public.get_client_connect_status(UUID) TO authenticated, service_role;
```

**Verification:**
```sql
SELECT * FROM public.get_client_connect_status('3eca32aa-e460-462f-a846-3f6ace6a3cae'::uuid);
```
Expected: 1 row, platform='facebook', is_connected=false (no token set yet).

---

## Task 2 — DB: SECURITY DEFINER function store_platform_token()

This will be called by the OAuth callback routes after a successful OAuth flow.
Create it now even though OAuth is not live yet.

```sql
CREATE OR REPLACE FUNCTION public.store_platform_token(
  p_client_id UUID,
  p_platform TEXT,
  p_page_access_token TEXT,
  p_page_id TEXT,
  p_page_name TEXT,
  p_expires_at TIMESTAMPTZ DEFAULT NULL
)
RETURNS BOOLEAN SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO c.client_publish_profile (
    client_id,
    platform,
    page_access_token,
    page_id,
    page_name,
    token_expires_at,
    publish_enabled,
    mode,
    status,
    updated_at
  )
  VALUES (
    p_client_id,
    p_platform,
    p_page_access_token,
    p_page_id,
    p_page_name,
    p_expires_at,
    true,
    'auto',
    'active',
    now()
  )
  ON CONFLICT (client_id, platform)
  DO UPDATE SET
    page_access_token = EXCLUDED.page_access_token,
    page_id = EXCLUDED.page_id,
    page_name = EXCLUDED.page_name,
    token_expires_at = EXCLUDED.token_expires_at,
    publish_enabled = true,
    status = 'active',
    updated_at = now();

  RETURN true;
END;
$$ LANGUAGE plpgsql;

GRANT EXECUTE ON FUNCTION public.store_platform_token(UUID, TEXT, TEXT, TEXT, TEXT, TIMESTAMPTZ) TO service_role;
```

Note: `store_platform_token` is granted to service_role only — it is called from
the OAuth callback API route using the service client, never directly from the browser.

**Verification:**
```sql
-- Check functions exist
SELECT routine_name, routine_type
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name IN ('get_client_connect_status', 'store_platform_token');
```
Expected: 2 rows.

Also check if `c.client_publish_profile` has a unique constraint on (client_id, platform).
If not, add one:
```sql
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_schema = 'c'
      AND table_name = 'client_publish_profile'
      AND constraint_type = 'UNIQUE'
      AND constraint_name LIKE '%client_id%platform%'
  ) THEN
    ALTER TABLE c.client_publish_profile
      ADD CONSTRAINT client_publish_profile_client_platform_unique
      UNIQUE (client_id, platform);
  END IF;
END $$;
```

---

## Task 3 — Portal data helper

**File:** `lib/portal-data.ts` (already exists — ADD to it, do not replace)

Add this function:

```typescript
export type PlatformConnectStatus = {
  platform: string;
  is_connected: boolean;
  page_name: string | null;
  page_id: string | null;
  token_expires_at: string | null;
};

export async function getClientConnectStatus(
  clientId: string
): Promise<PlatformConnectStatus[]> {
  const service = createServiceClient();
  const { data, error } = await service.rpc("get_client_connect_status", {
    p_client_id: clientId,
  });
  if (error || !data) return [];
  return data as PlatformConnectStatus[];
}
```

---

## Task 4 — Build the /connect page

**File:** `app/(portal)/connect/page.tsx` (replace the stub entirely)

This is a server component. It reads connect status and renders platform cards.

```typescript
import { redirect } from "next/navigation";
import { getPortalSession } from "@/lib/portal-auth";
import { getClientConnectStatus } from "@/lib/portal-data";
import { CheckCircle2, AlertCircle, ExternalLink } from "lucide-react";

export const dynamic = "force-dynamic";

// Platform display config
const PLATFORM_CONFIG: Record<string, {
  label: string;
  colour: string;
  bg: string;
  icon: string;
  description: string;
}> = {
  facebook: {
    label: "Facebook",
    colour: "text-blue-700",
    bg: "bg-blue-50 border-blue-200",
    icon: "f",
    description: "Connect your Facebook Page so Invegent can publish posts on your behalf.",
  },
  linkedin: {
    label: "LinkedIn",
    colour: "text-sky-700",
    bg: "bg-sky-50 border-sky-200",
    icon: "in",
    description: "Connect your LinkedIn Company Page to publish professional content.",
  },
  instagram: {
    label: "Instagram",
    colour: "text-pink-700",
    bg: "bg-pink-50 border-pink-200",
    icon: "ig",
    description: "Connect your Instagram Business account for visual content.",
  },
  youtube: {
    label: "YouTube",
    colour: "text-red-700",
    bg: "bg-red-50 border-red-200",
    icon: "yt",
    description: "Connect your YouTube channel for short-form video content.",
  },
};

// All platforms are currently in "coming soon" mode for external clients.
// When Meta Standard Access is confirmed, set FACEBOOK_OAUTH_ENABLED=true in env.
// When LinkedIn API is approved, set LINKEDIN_OAUTH_ENABLED=true in env.
const OAUTH_ENABLED: Record<string, boolean> = {
  facebook: process.env.FACEBOOK_OAUTH_ENABLED === "true",
  linkedin: process.env.LINKEDIN_OAUTH_ENABLED === "true",
  instagram: false,
  youtube: false,
};

export default async function ConnectPage() {
  const session = await getPortalSession();
  if (!session) redirect("/login");

  const platforms = await getClientConnectStatus(session.clientId);
  const allConnected = platforms.length > 0 && platforms.every((p) => p.is_connected);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-semibold text-slate-900">Connect your platforms</h1>
        <p className="text-sm text-slate-500 mt-1">
          Invegent publishes content to your social media pages on your behalf.
          Connect each platform below to give us permission to post.
        </p>
      </div>

      {/* All connected banner */}
      {allConnected && (
        <div className="flex items-center gap-3 bg-emerald-50 border border-emerald-200 rounded-xl p-4">
          <CheckCircle2 size={18} className="text-emerald-600 shrink-0" />
          <p className="text-sm text-emerald-800 font-medium">
            All platforms connected — Invegent is ready to publish.
          </p>
        </div>
      )}

      {/* No platforms yet */}
      {platforms.length === 0 && (
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-6 text-center">
          <p className="text-sm text-slate-400">
            Your platform allocation is being set up. Check back shortly.
          </p>
        </div>
      )}

      {/* Platform cards */}
      <div className="space-y-4">
        {platforms.map((p) => {
          const config = PLATFORM_CONFIG[p.platform] ?? {
            label: p.platform,
            colour: "text-slate-700",
            bg: "bg-slate-50 border-slate-200",
            icon: p.platform[0].toUpperCase(),
            description: `Connect your ${p.platform} account.`,
          };
          const oauthEnabled = OAUTH_ENABLED[p.platform] ?? false;

          return (
            <div
              key={p.platform}
              className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm"
            >
              <div className="flex items-start gap-4">
                {/* Platform icon */}
                <div className={`w-10 h-10 rounded-xl ${config.bg} border flex items-center justify-center shrink-0`}>
                  <span className={`text-xs font-bold ${config.colour}`}>
                    {config.icon}
                  </span>
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-semibold text-slate-900">{config.label}</span>
                    {p.is_connected ? (
                      <span className="flex items-center gap-1 text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                        <CheckCircle2 size={11} />
                        Connected
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-xs text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">
                        <AlertCircle size={11} />
                        Not connected
                      </span>
                    )}
                  </div>

                  {/* Connected detail */}
                  {p.is_connected && p.page_name && (
                    <p className="text-xs text-slate-500 mb-2">
                      Page: <span className="font-medium text-slate-700">{p.page_name}</span>
                    </p>
                  )}

                  <p className="text-xs text-slate-400 mb-3">{config.description}</p>

                  {/* Connect / reconnect button */}
                  {p.is_connected ? (
                    <a
                      href={`/api/connect/${p.platform}`}
                      className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-slate-700 border border-slate-200 rounded-lg px-3 py-1.5 hover:bg-slate-50 transition-colors"
                    >
                      <ExternalLink size={12} />
                      Reconnect
                    </a>
                  ) : oauthEnabled ? (
                    <a
                      href={`/api/connect/${p.platform}`}
                      className="inline-flex items-center gap-1.5 text-xs font-medium text-white bg-cyan-600 hover:bg-cyan-700 rounded-lg px-4 py-1.5 transition-colors"
                    >
                      Connect {config.label}
                    </a>
                  ) : (
                    <div className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-400 bg-slate-50 border border-slate-200 rounded-lg px-4 py-1.5 cursor-not-allowed">
                      Connection coming soon
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Footer note */}
      <p className="text-xs text-slate-400 text-center">
        Invegent only requests permission to publish to your pages.
        We never access your personal profile, messages, or friends.
      </p>
    </div>
  );
}
```

---

## Task 5 — OAuth API routes (Facebook)

Create the initiation and callback routes. These will return a "coming soon" response
unless `FACEBOOK_OAUTH_ENABLED=true` in Vercel env vars.

### Initiation route
**File:** `app/api/connect/facebook/route.ts`

```typescript
import { NextRequest, NextResponse } from "next/server";
import { getPortalSession } from "@/lib/portal-auth";

export async function GET(request: NextRequest) {
  const session = await getPortalSession();
  if (!session) return NextResponse.redirect(new URL("/login", request.url));

  if (process.env.FACEBOOK_OAUTH_ENABLED !== "true") {
    return NextResponse.redirect(new URL("/connect?error=coming_soon", request.url));
  }

  const appId = process.env.FACEBOOK_APP_ID!;
  const redirectUri = `${process.env.NEXT_PUBLIC_PORTAL_URL}/api/connect/facebook/callback`;

  // State encodes clientId for security verification in callback
  const state = Buffer.from(JSON.stringify({
    clientId: session.clientId,
    ts: Date.now(),
  })).toString("base64url");

  const scopes = [
    "pages_manage_posts",
    "pages_read_engagement",
    "pages_show_list",
  ].join(",");

  const oauthUrl = new URL("https://www.facebook.com/v19.0/dialog/oauth");
  oauthUrl.searchParams.set("client_id", appId);
  oauthUrl.searchParams.set("redirect_uri", redirectUri);
  oauthUrl.searchParams.set("scope", scopes);
  oauthUrl.searchParams.set("state", state);
  oauthUrl.searchParams.set("response_type", "code");

  return NextResponse.redirect(oauthUrl.toString());
}
```

### Callback route
**File:** `app/api/connect/facebook/callback/route.ts`

```typescript
import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const stateRaw = searchParams.get("state");
  const error = searchParams.get("error");

  const portalUrl = process.env.NEXT_PUBLIC_PORTAL_URL!;

  if (error || !code || !stateRaw) {
    return NextResponse.redirect(`${portalUrl}/connect?error=oauth_failed`);
  }

  // Decode state
  let clientId: string;
  try {
    const decoded = JSON.parse(Buffer.from(stateRaw, "base64url").toString());
    clientId = decoded.clientId;
    if (!clientId) throw new Error("missing clientId");
  } catch {
    return NextResponse.redirect(`${portalUrl}/connect?error=invalid_state`);
  }

  const appId = process.env.FACEBOOK_APP_ID!;
  const appSecret = process.env.FACEBOOK_APP_SECRET!;
  const redirectUri = `${portalUrl}/api/connect/facebook/callback`;

  try {
    // Exchange code for short-lived user token
    const tokenRes = await fetch(
      `https://graph.facebook.com/v19.0/oauth/access_token?` +
      `client_id=${appId}&redirect_uri=${encodeURIComponent(redirectUri)}` +
      `&client_secret=${appSecret}&code=${code}`
    );
    const tokenData = await tokenRes.json();
    if (!tokenData.access_token) throw new Error("no access token");

    // Exchange for long-lived user token
    const llRes = await fetch(
      `https://graph.facebook.com/v19.0/oauth/access_token?` +
      `grant_type=fb_exchange_token&client_id=${appId}` +
      `&client_secret=${appSecret}&fb_exchange_token=${tokenData.access_token}`
    );
    const llData = await llRes.json();
    const userToken = llData.access_token;

    // Get pages this user manages
    const pagesRes = await fetch(
      `https://graph.facebook.com/v19.0/me/accounts?access_token=${userToken}`
    );
    const pagesData = await pagesRes.json();
    const pages = pagesData.data as Array<{
      id: string;
      name: string;
      access_token: string;
    }>;

    if (!pages || pages.length === 0) {
      return NextResponse.redirect(`${portalUrl}/connect?error=no_pages`);
    }

    // Use first page (single-page clients) — multi-page selection UI is future work
    const page = pages[0];

    // Calculate expiry (~60 days for long-lived page tokens)
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 60);

    // Store via SECURITY DEFINER function
    const service = createServiceClient();
    await service.rpc("store_platform_token", {
      p_client_id: clientId,
      p_platform: "facebook",
      p_page_access_token: page.access_token,
      p_page_id: page.id,
      p_page_name: page.name,
      p_expires_at: expiresAt.toISOString(),
    });

    return NextResponse.redirect(`${portalUrl}/connect?success=facebook`);
  } catch (err) {
    console.error("Facebook OAuth callback error:", err);
    return NextResponse.redirect(`${portalUrl}/connect?error=oauth_error`);
  }
}
```

---

## Task 6 — OAuth API routes (LinkedIn)

Same pattern. Build now, activate via env var later.

### Initiation route
**File:** `app/api/connect/linkedin/route.ts`

```typescript
import { NextRequest, NextResponse } from "next/server";
import { getPortalSession } from "@/lib/portal-auth";

export async function GET(request: NextRequest) {
  const session = await getPortalSession();
  if (!session) return NextResponse.redirect(new URL("/login", request.url));

  if (process.env.LINKEDIN_OAUTH_ENABLED !== "true") {
    return NextResponse.redirect(new URL("/connect?error=coming_soon", request.url));
  }

  const clientId = process.env.LINKEDIN_CLIENT_ID!;
  const redirectUri = `${process.env.NEXT_PUBLIC_PORTAL_URL}/api/connect/linkedin/callback`;

  const state = Buffer.from(JSON.stringify({
    clientId: session.clientId,
    ts: Date.now(),
  })).toString("base64url");

  const oauthUrl = new URL("https://www.linkedin.com/oauth/v2/authorization");
  oauthUrl.searchParams.set("response_type", "code");
  oauthUrl.searchParams.set("client_id", clientId);
  oauthUrl.searchParams.set("redirect_uri", redirectUri);
  oauthUrl.searchParams.set("state", state);
  oauthUrl.searchParams.set("scope", "w_member_social r_organization_social");

  return NextResponse.redirect(oauthUrl.toString());
}
```

### Callback route
**File:** `app/api/connect/linkedin/callback/route.ts`

```typescript
import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const stateRaw = searchParams.get("state");
  const error = searchParams.get("error");

  const portalUrl = process.env.NEXT_PUBLIC_PORTAL_URL!;

  if (error || !code || !stateRaw) {
    return NextResponse.redirect(`${portalUrl}/connect?error=oauth_failed`);
  }

  let clientId: string;
  try {
    const decoded = JSON.parse(Buffer.from(stateRaw, "base64url").toString());
    clientId = decoded.clientId;
  } catch {
    return NextResponse.redirect(`${portalUrl}/connect?error=invalid_state`);
  }

  const liClientId = process.env.LINKEDIN_CLIENT_ID!;
  const liSecret = process.env.LINKEDIN_CLIENT_SECRET!;
  const redirectUri = `${portalUrl}/api/connect/linkedin/callback`;

  try {
    // Exchange code for access token
    const tokenRes = await fetch("https://www.linkedin.com/oauth/v2/accessToken", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        code,
        redirect_uri: redirectUri,
        client_id: liClientId,
        client_secret: liSecret,
      }),
    });
    const tokenData = await tokenRes.json();
    if (!tokenData.access_token) throw new Error("no access token");

    // Get organization (company page)
    const orgRes = await fetch(
      "https://api.linkedin.com/v2/organizationAcls?q=roleAssignee&role=ADMINISTRATOR&projection=(elements*(organization~(id,localizedName)))",
      { headers: { Authorization: `Bearer ${tokenData.access_token}` } }
    );
    const orgData = await orgRes.json();
    const org = orgData?.elements?.[0]?.["organization~"];

    const expiresAt = new Date();
    expiresAt.setSeconds(expiresAt.getSeconds() + (tokenData.expires_in || 5184000));

    const service = createServiceClient();
    await service.rpc("store_platform_token", {
      p_client_id: clientId,
      p_platform: "linkedin",
      p_page_access_token: tokenData.access_token,
      p_page_id: org?.id ? String(org.id) : null,
      p_page_name: org?.localizedName ?? null,
      p_expires_at: expiresAt.toISOString(),
    });

    return NextResponse.redirect(`${portalUrl}/connect?success=linkedin`);
  } catch (err) {
    console.error("LinkedIn OAuth callback error:", err);
    return NextResponse.redirect(`${portalUrl}/connect?error=oauth_error`);
  }
}
```

---

## Task 7 — Connect banner on portal home page

**File:** `app/(portal)/page.tsx`

The home page already imports from `@/actions/dashboard`. Add connect status check.

At the top of `PortalHomePage`:
1. Import `getClientConnectStatus` from `@/lib/portal-data`
2. Call `const platforms = await getClientConnectStatus(session.clientId);`
3. Compute `const hasUnconnected = platforms.some(p => !p.is_connected);`
4. If `hasUnconnected`, render this banner ABOVE the stats row:

```tsx
{hasUnconnected && (
  <Link
    href="/connect"
    className="flex items-center gap-3 bg-amber-50 border border-amber-200 rounded-2xl p-4 hover:bg-amber-100 transition-colors"
  >
    <AlertTriangle size={18} className="text-amber-500 shrink-0" />
    <div className="flex-1">
      <p className="text-sm font-medium text-amber-900">Connect your platforms to start publishing</p>
      <p className="text-xs text-amber-700 mt-0.5">Invegent needs permission to post to your social pages.</p>
    </div>
    <span className="text-sm font-medium text-amber-700 shrink-0">Connect →</span>
  </Link>
)}
```

Import `AlertTriangle` from lucide-react (already imported in the file — check first).

---

## Task 8 — Vercel env vars

The OAuth routes need these env vars set in Vercel for invegent-portal.
Do NOT set them — just confirm they are documented.

Write to `docs/briefs/brief_013_env_vars_needed.md` in Invegent-content-engine:

```
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
```

---

## Task 9 — Build, commit, deploy

```bash
cd C:\Users\parve\invegent-portal
npm run build
```

Fix any errors. Then:
```bash
git add -A
git commit -m "feat: platform OAuth connect page + Facebook/LinkedIn routes (D088)"
git push origin main
```

Vercel auto-deploys. Confirm portal.invegent.com/connect loads and shows
the Facebook card (not connected, button disabled with "coming soon").

---

## Task 10 — Write result file

Write `docs/briefs/brief_013_result.md` in Invegent-content-engine:
- Each task: COMPLETED / FAILED / SKIPPED
- DB function verification results
- Unique constraint: added or already existed
- Build: PASS / FAIL
- Commit SHA
- Notes

---

## Error handling

- If `c.client_publish_profile` has no unique constraint on (client_id, platform),
  add it as shown in Task 2. If it already exists, skip.
- If `getPortalDashboardData()` in page.tsx does not return `session`,
  call `getPortalSession()` separately to get clientId for the connect banner.
- If AlertTriangle is not already imported in page.tsx, add it.
- OAuth routes returning 404 is fine — they won't be triggered until env vars are set.
- If LinkedIn org lookup returns no results, store token without page_id/page_name.
  The token is still valid for org lookups at publish time.

---

## What this brief does NOT include

- Multi-page selector (if a client manages multiple Facebook pages) — future
- Token refresh automation — future
- Disconnect / revoke flow — future
- Instagram OAuth — after Meta App Review
- YouTube OAuth — already handled separately via youtube-publisher
