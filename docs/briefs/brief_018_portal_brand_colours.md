# Claude Code Brief 018 — Portal CSS Custom Properties Per Client

**Date:** 12 April 2026
**Status:** READY TO RUN
**Decisions:** D087, D088
**Repo:** `invegent-portal`
**Working directory:** `C:\Users\parve\invegent-portal`
**Supabase project:** `mbkmaxqhsohbtwsqolns`
**Estimated time:** 1–2 hours

---

## What this brief does

When a client logs into the portal, their brand colours and logo are injected
as CSS custom properties on the root element. Every component that uses those
variables automatically reflects the client's brand.

The colours come from `c.client_brand_profile`:
- `brand_colour_primary` → `--brand-primary`
- `brand_colour_secondary` → `--brand-secondary`
- `accent_hex` → `--brand-accent`
- `brand_logo_url` → used in sidebar instead of the generic "I" badge

Default fallback (when no brand profile exists): cyan-500 (`#06b6d4`),
which is the current hardcoded colour throughout the sidebar.

---

## Task 1 — Add getBrandProfile() to lib/portal-data.ts

Add to the existing file (do not replace):

```typescript
export type ClientBrandProfile = {
  brand_colour_primary: string | null;
  brand_colour_secondary: string | null;
  accent_hex: string | null;
  brand_logo_url: string | null;
  brand_name: string | null;
};

export async function getClientBrandProfile(
  clientId: string
): Promise<ClientBrandProfile> {
  const service = createServiceClient();
  const { data } = await service.rpc("exec_sql", {
    query: `
      SELECT brand_colour_primary, brand_colour_secondary, accent_hex,
             brand_logo_url, brand_name
      FROM c.client_brand_profile
      WHERE client_id = '${clientId}'::uuid
      LIMIT 1
    `,
  });
  if (Array.isArray(data) && data[0]) {
    return data[0] as ClientBrandProfile;
  }
  return {
    brand_colour_primary: null,
    brand_colour_secondary: null,
    accent_hex: null,
    brand_logo_url: null,
    brand_name: null,
  };
}
```

---

## Task 2 — Update PortalLayout to fetch brand profile and inject CSS vars

**File:** `app/(portal)/layout.tsx`

Replace entirely:

```typescript
import { redirect } from "next/navigation";
import { getPortalSession } from "@/lib/portal-auth";
import { getPortalDraftsCount, getClientBrandProfile } from "@/lib/portal-data";
import PortalSidebar from "@/components/portal-sidebar";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function PortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getPortalSession();
  if (!session) redirect("/login");

  const [draftsCount, brand] = await Promise.all([
    getPortalDraftsCount(session.clientId),
    getClientBrandProfile(session.clientId),
  ]);

  // Build CSS custom properties from brand profile
  // Fall back to Invegent cyan if no brand colours set
  const primary = brand.brand_colour_primary ?? "#06b6d4";
  const secondary = brand.brand_colour_secondary ?? "#a5f3fc";
  const accent = brand.accent_hex ?? "#0891b2";

  const brandCssVars = [
    `--brand-primary: ${primary}`,
    `--brand-secondary: ${secondary}`,
    `--brand-accent: ${accent}`,
  ].join("; ");

  return (
    <div className="flex min-h-screen bg-slate-50" style={{ ["--brand-primary" as any]: primary, ["--brand-secondary" as any]: secondary, ["--brand-accent" as any]: accent }}>
      {/* Sidebar */}
      <PortalSidebar
        clientName={session.clientName}
        clientId={session.clientId}
        draftsCount={draftsCount}
        brandLogoUrl={brand.brand_logo_url ?? null}
        brandPrimary={primary}
      />

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        <main className="flex-1 p-4 md:p-6 max-w-3xl w-full mx-auto pb-24 md:pb-6">
          {children}
        </main>
      </div>
    </div>
  );
}
```

Note: The inline style approach with CSS custom properties on the root div
propagates to all children automatically via CSS inheritance.

---

## Task 3 — Update PortalSidebar to accept and use brand props

**File:** `components/portal-sidebar.tsx`

Update the component props type to accept `brandLogoUrl` and `brandPrimary`:

```typescript
// Update the props destructuring at the top of the component:
{
  clientName,
  clientId,
  draftsCount,
  brandLogoUrl,
  brandPrimary,
}: {
  clientName: string;
  clientId: string;
  draftsCount: number;
  brandLogoUrl?: string | null;
  brandPrimary?: string;
}
```

### Update the brand badge in the desktop sidebar top section

Find the existing Invegent brand section at the top of the desktop sidebar.
It currently shows a hardcoded cyan-500 square with "I".

Replace the brand icon with:
```tsx
{/* Brand icon — client logo if available, else Invegent I */}
<div
  className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 overflow-hidden"
  style={{ backgroundColor: brandPrimary ?? "#06b6d4" }}
>
  {brandLogoUrl ? (
    <img
      src={brandLogoUrl}
      alt="Brand logo"
      className="w-full h-full object-contain p-0.5"
      onError={(e) => {
        // Fallback to "I" if image fails to load
        (e.target as HTMLImageElement).style.display = "none";
      }}
    />
  ) : (
    <span className="text-white font-bold text-xs">I</span>
  )}
</div>
```

### Update active nav item colour to use brand primary

Find the active nav item className. It currently has hardcoded `bg-cyan-50 text-cyan-700`.

Change the active state to use inline style instead of Tailwind classes:
```tsx
// For each nav link, change from:
className={`... ${
  pathname === href
    ? "bg-cyan-50 text-cyan-700"
    : "text-slate-500 hover:text-slate-800 hover:bg-slate-50"
}`}

// To:
className={`... ${
  pathname === href
    ? "font-medium"
    : "text-slate-500 hover:text-slate-800 hover:bg-slate-50"
}`}
style={pathname === href ? {
  backgroundColor: `${brandPrimary ?? "#06b6d4"}15`,  // 15 = ~8% opacity hex
  color: brandPrimary ?? "#06b6d4",
} : {}}
```

### Update the avatar circle in the client footer

Find the client avatar circle in the sidebar footer (currently `bg-cyan-100` with `text-cyan-700`).
Change to use brand colours:
```tsx
<div
  className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-sm font-semibold"
  style={{
    backgroundColor: `${brandPrimary ?? "#06b6d4"}20`,
    color: brandPrimary ?? "#06b6d4",
  }}
>
  {initials}
</div>
```

### Update mobile bottom tab bar active colour

Find the mobile bottom tab active state. Currently hardcoded `text-cyan-600`.
Change to use inline style:
```tsx
style={pathname === href ? { color: brandPrimary ?? "#06b6d4" } : {}}
className={`... ${pathname === href ? "" : "text-slate-400"}`}
```

---

## Task 4 — Build and verify

```bash
cd C:\Users\parve\invegent-portal
npm run build
```

Expected: 0 errors.
If TypeScript complains about inline style with CSS custom property keys,
use `as React.CSSProperties` cast or `style={{ "--brand-primary": primary } as any}`.

---

## Task 5 — Commit and push

```bash
git add -A
git commit -m "feat: portal CSS custom properties per client — brand colours + logo in sidebar (D087/D088)"
git push origin main
```

Vercel auto-deploys.
To verify: log into `portal.invegent.com` as `parveenkumar11@hotmail.com`.
CFW has no brand profile yet (no scan run), so you should see the
default cyan fallback — same as before, which confirms the fallback works.

---

## Task 6 — Write result file

Write `docs/briefs/brief_018_result.md` in Invegent-content-engine:
- Tasks 1–5: COMPLETED / FAILED
- Build: PASS / FAIL
- Commit SHA
- Notes

---

## Error handling

- If `style` prop complains about CSS custom property keys in TypeScript,
  cast the entire style object: `style={{ "--brand-primary": primary, ... } as React.CSSProperties}`
- If `brandLogoUrl` image fails to load (Storage URL expired or 404),
  the `onError` handler hides the img tag — the "I" fallback is still visible
  because it sits behind the image in the DOM. Adjust z-index or conditional
  rendering if needed.
- Do not change any page-level components — only layout.tsx and portal-sidebar.tsx.
- The `#06b6d4` fallback is Tailwind's `cyan-500` — matches the current hardcoded colour exactly.
  No visual change for clients without a brand profile.

---

## What this brief does NOT include

- Per-page brand colour usage (buttons, links, headers on individual pages)
- Dark mode brand colour variants
- Brand colour picker in client portal settings
- Automatic brand colour refresh when c.client_brand_profile is updated
