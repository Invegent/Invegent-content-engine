# Brief 044 — Platform connections — dynamic platform rendering

**Date:** 14 April 2026
**Phase:** 3 — Dashboard quality
**Repo:** `invegent-dashboard`
**Working directory:** `C:\Users\parve\Invegent-content-engine`
**MCPs required:** GitHub MCP
**Estimated time:** 2–3 hours
**Deploy:** Vercel auto-deploys on git push

---

## Problem

Two dashboard views show platform connection status:
1. `/connect` (Config → Connect) — hardcoded to Facebook + LinkedIn only. Missing Instagram, YouTube, Invegent.
2. `/clients` Connect tab — hardcoded to Facebook + LinkedIn + YouTube. Missing Instagram.

Both read from `c.client_publish_profile` but with hardcoded platform columns instead of reading dynamically. Any new platform added to the DB doesn’t appear without a code change.

Also: LinkedIn shows “Expiry unknown” because the Zapier webhook URL is stored in `page_access_token` with no `token_expires_at`. This is correct behaviour — but the label should read “Active (Zapier bridge)” not “Token expiry unknown”.

---

## Root cause

`/connect/page.tsx` query:
```sql
LEFT JOIN c.client_publish_profile fb ON fb.client_id = c.client_id AND fb.platform = 'facebook'
LEFT JOIN c.client_publish_profile li ON li.client_id = c.client_id AND li.platform = 'linkedin'
```
Hardcoded to two platforms. Result type has fixed columns `fb_*` and `li_*`.

`/clients/page.tsx` Connect tab: similar pattern, hardcoded to facebook + linkedin + youtube.

---

## Solution

Replace hardcoded platform JOINs with a single aggregated query that returns all platforms as a JSONB array per client. Frontend maps over the array to render whatever platforms exist.

### Platform config (frontend constant)

```typescript
const PLATFORM_CONFIG: Record<string, {
  label: string;
  icon: 'facebook' | 'linkedin' | 'instagram' | 'youtube';
  color: string;
}> = {
  facebook:  { label: 'Facebook',  icon: 'facebook',  color: 'text-blue-600' },
  linkedin:  { label: 'LinkedIn',  icon: 'linkedin',  color: 'text-blue-700' },
  instagram: { label: 'Instagram', icon: 'instagram', color: 'text-pink-600' },
  youtube:   { label: 'YouTube',   icon: 'youtube',   color: 'text-red-600'  },
};

// Display order
const PLATFORM_ORDER = ['facebook', 'instagram', 'linkedin', 'youtube'];
```

### New query for `/connect/page.tsx`

Replace the existing `getConnections()` function with:

```typescript
type PlatformProfile = {
  platform: string;
  page_name: string | null;
  page_id: string | null;
  token_expires_at: string | null;
  publish_enabled: boolean;
  has_token: boolean;
  is_zapier: boolean; // page_access_token starts with https://hooks.zapier.com
};

type ClientConnection = {
  client_id: string;
  client_name: string;
  client_slug: string | null;
  platforms: PlatformProfile[];
};

async function getConnections(): Promise<ClientConnection[]> {
  const rows = await sql<{
    client_id: string;
    client_name: string;
    client_slug: string | null;
    platform: string;
    page_name: string | null;
    page_id: string | null;
    token_expires_at: string | null;
    publish_enabled: boolean;
    has_token: boolean;
    is_zapier: boolean;
  }>(`
    SELECT
      c.client_id,
      c.client_name,
      c.client_slug,
      cpp.platform,
      cpp.page_name,
      cpp.page_id,
      cpp.token_expires_at,
      cpp.publish_enabled,
      (cpp.page_access_token IS NOT NULL AND cpp.page_access_token != '') AS has_token,
      (cpp.page_access_token LIKE 'https://hooks.zapier.com%') AS is_zapier
    FROM c.client c
    JOIN c.client_publish_profile cpp ON cpp.client_id = c.client_id
      AND cpp.status = 'active'
    WHERE c.status = 'active'
    ORDER BY c.client_name, cpp.platform
  `);

  // Group by client
  const clientMap = new Map<string, ClientConnection>();
  for (const row of rows) {
    if (!clientMap.has(row.client_id)) {
      clientMap.set(row.client_id, {
        client_id: row.client_id,
        client_name: row.client_name,
        client_slug: row.client_slug,
        platforms: [],
      });
    }
    clientMap.get(row.client_id)!.platforms.push({
      platform: row.platform,
      page_name: row.page_name,
      page_id: row.page_id,
      token_expires_at: row.token_expires_at,
      publish_enabled: row.publish_enabled,
      has_token: row.has_token,
      is_zapier: row.is_zapier,
    });
  }

  // Sort platforms within each client by PLATFORM_ORDER
  for (const client of clientMap.values()) {
    client.platforms.sort((a, b) =>
      PLATFORM_ORDER.indexOf(a.platform) - PLATFORM_ORDER.indexOf(b.platform)
    );
  }

  return Array.from(clientMap.values());
}
```

### Updated `getTokenBadge()` for all platforms

Replace the existing function with one that handles Zapier tokens:

```typescript
function getTokenStatus(p: PlatformProfile): {
  label: string;
  classes: string;
  isConnected: boolean;
} {
  if (!p.has_token || !p.page_id) {
    return {
      label: 'Not connected',
      classes: 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400',
      isConnected: false,
    };
  }
  // Zapier bridge — token is a webhook URL, not an OAuth token
  if (p.is_zapier) {
    return {
      label: 'Active — Zapier bridge',
      classes: 'bg-violet-50 text-violet-700 dark:bg-violet-900/20 dark:text-violet-400',
      isConnected: true,
    };
  }
  if (!p.token_expires_at) {
    return {
      label: 'Connected — expiry unknown',
      classes: 'bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400',
      isConnected: true,
    };
  }
  const expires = new Date(p.token_expires_at);
  const daysUntil = Math.floor((expires.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
  if (daysUntil <= 0)
    return { label: 'Token expired — reconnect now', classes: 'bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400', isConnected: true };
  if (daysUntil <= 7)
    return { label: `Expires in ${daysUntil}d — reconnect soon`, classes: 'bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400', isConnected: true };
  if (daysUntil <= 30)
    return { label: `Valid — ${daysUntil}d remaining`, classes: 'bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400', isConnected: true };
  return {
    label: `Valid until ${formatDate(expires)} (${daysUntil}d)`,
    classes: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400',
    isConnected: true,
  };
}
```

### Platform icon component

Add a small inline SVG icon switcher:

```typescript
function PlatformIcon({ platform }: { platform: string }) {
  if (platform === 'facebook') return (
    <svg className="w-3.5 h-3.5 text-blue-600 shrink-0" fill="currentColor" viewBox="0 0 24 24">
      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
    </svg>
  );
  if (platform === 'linkedin') return (
    <svg className="w-3.5 h-3.5 text-blue-700 shrink-0" fill="currentColor" viewBox="0 0 24 24">
      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
    </svg>
  );
  if (platform === 'instagram') return (
    <svg className="w-3.5 h-3.5 text-pink-600 shrink-0" fill="currentColor" viewBox="0 0 24 24">
      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/>
    </svg>
  );
  if (platform === 'youtube') return (
    <svg className="w-3.5 h-3.5 text-red-600 shrink-0" fill="currentColor" viewBox="0 0 24 24">
      <path d="M23.498 6.186a3.016 3.016 0 00-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 00.502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 002.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 002.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
    </svg>
  );
  return <span className="w-3.5 h-3.5 text-slate-400 shrink-0 text-xs">{platform[0].toUpperCase()}</span>;
}
```

### Updated page render

Replace the client cards section with dynamic platform rendering:

```typescript
// Summary bar — dynamic per platform
const platformCounts: Record<string, number> = {};
const platformTotal: Record<string, number> = {};
for (const client of connections) {
  for (const p of client.platforms) {
    if (!platformTotal[p.platform]) platformTotal[p.platform] = 0;
    if (!platformCounts[p.platform]) platformCounts[p.platform] = 0;
    platformTotal[p.platform]++;
    if (p.has_token) platformCounts[p.platform]++;
  }
}
const summaryParts = PLATFORM_ORDER
  .filter(p => platformTotal[p])
  .map(p => `${PLATFORM_CONFIG[p]?.label ?? p}: ${platformCounts[p] ?? 0}/${platformTotal[p]}`);
```

And for each client card, replace the hardcoded Facebook+LinkedIn grid with:

```tsx
<div className="grid sm:grid-cols-2 gap-3">
  {client.platforms.map((p) => {
    const status = getTokenStatus(p);
    const config = PLATFORM_CONFIG[p.platform];
    return (
      <div key={p.platform} className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5 mb-1">
            <PlatformIcon platform={p.platform} />
            <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">
              {p.page_name ?? config?.label ?? p.platform}
            </span>
            {!p.publish_enabled && (
              <span className="text-xs text-slate-400">(disabled)</span>
            )}
          </div>
          <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-semibold ${status.classes}`}>
            {status.label}
          </span>
        </div>
        <a
          href={`/api/connect/${p.platform}?client_id=${client.client_id}`}
          className="shrink-0 inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-700 hover:bg-slate-800 text-white transition-colors"
        >
          {status.isConnected ? 'Reconnect' : 'Connect'}
        </a>
      </div>
    );
  })}
</div>
```

---

## Task list for Claude Code

### Task 1 — Update `/connect/page.tsx`

File: `app/(dashboard)/connect/page.tsx` in `invegent-dashboard`

1. Read the current file first
2. Replace `ClientConnection` type with the new multi-platform type
3. Replace `getConnections()` with the new grouped query
4. Add `PLATFORM_CONFIG`, `PLATFORM_ORDER`, `PlatformIcon` component
5. Replace `getTokenBadge()` with `getTokenStatus()`
6. Update the summary bar to use dynamic platform counts
7. Replace the hardcoded Facebook+LinkedIn grid with the dynamic `client.platforms.map()` render
8. Keep the instruction cards at top (Facebook, LinkedIn) but add Instagram and YouTube cards

### Task 2 — Update the Connect tab in `/clients/page.tsx`

File: `app/(dashboard)/clients/page.tsx` in `invegent-dashboard`

1. Read the current file first
2. Find the Connect tab render section — search for `platform === 'facebook'` or similar hardcoded platform logic
3. Apply the same pattern: dynamic platforms from `client.platforms` array instead of hardcoded columns
4. Reuse `PlatformIcon` and `getTokenStatus()` — extract to a shared util file if needed: `lib/platform-status.ts`
5. The Connect tab can be more compact than the full Connect page — 3 columns on desktop (fb, li, ig, yt) in a tight grid

### Task 3 — Shared util (if needed)

If both files need `PlatformIcon`, `getTokenStatus`, `PLATFORM_CONFIG` — extract to:
`lib/platform-status.ts` — export all shared types and functions

Then import in both pages.

### Task 4 — Push and verify

```bash
cd C:\Users\parve\Invegent-content-engine  # wrong dir
# NOTE: invegent-dashboard is a separate repo
# Claude Code: use GitHub MCP push_files directly, do not use local git
```

Use GitHub MCP `push_files` to commit to `invegent-dashboard` repo, branch `main`.
Vercel auto-deploys. Check `dashboard.invegent.com/connect` after deploy.

### Task 5 — Write result file

Write `docs/briefs/brief_044_result.md` in `Invegent-content-engine`:
- Both pages updated: yes/no
- Platforms showing on Connect page: list
- Zapier LinkedIn badge: shows 'Active — Zapier bridge'?
- All 4 clients visible on Connect page?
- Any errors

---

## Expected result

**Connect page (`/connect`):**
- Shows all 4 clients: Care For Welfare, Invegent, NDIS Yarns, Property Pulse
- Each client shows all configured platforms (facebook, instagram, linkedin, youtube where applicable)
- LinkedIn shows purple “Active — Zapier bridge” badge
- Facebook shows green “Valid until X (Nd)” badge
- Instagram shows green “Connected — expiry unknown” badge (no token_expires_at set)
- YouTube shows green “Valid until Apr 2031” for NY and PP, nothing for CFW/Invegent

**Clients → Connect tab:**
- Same dynamic rendering, all platforms visible
- Consistent status badges with Connect page
- No hardcoded platform columns
