# Brief 018 Result — Portal CSS Custom Properties Per Client

**Executed:** 12 April 2026
**Executor:** Claude Code (Opus 4.6)
**Repo:** invegent-portal

---

## Task Results

| Task | Description | Status |
|------|-------------|--------|
| 1 | Add getClientBrandProfile() to lib/portal-data.ts | COMPLETED |
| 2 | Update layout.tsx — fetch brand profile, inject CSS vars | COMPLETED |
| 3 | Update portal-sidebar.tsx — brand logo, active colours, avatar | COMPLETED |
| 4 | npm run build | PASS — 0 errors |
| 5 | Commit and push | COMPLETED — 8b4b54b |
| 6 | Write result file | COMPLETED |

---

## Details

### Task 1 — portal-data.ts
- Added ClientBrandProfile type with brand_colour_primary, brand_colour_secondary, accent_hex, brand_logo_url, brand_name
- getClientBrandProfile() queries c.client_brand_profile via exec_sql
- Returns null fallbacks for all fields when no profile exists

### Task 2 — layout.tsx
- Fetches brand profile in parallel with drafts count via Promise.all
- Injects --brand-primary, --brand-secondary, --brand-accent as CSS custom properties on root div
- Passes brandLogoUrl and brandPrimary props to PortalSidebar
- Fallback: #06b6d4 (cyan-500), #a5f3fc (cyan-200), #0891b2 (cyan-600)

### Task 3 — portal-sidebar.tsx
- Updated props to accept brandLogoUrl and brandPrimary
- Brand badge: shows client logo img if URL provided, with onError fallback to hide img (shows "I" behind)
- Active nav items: inline style with brandPrimary at 8% opacity bg + full colour text (removed hardcoded cyan Tailwind classes)
- Avatar circle: inline style with brandPrimary at 12% opacity bg + full colour text
- Mobile tab bar: active tabs use brandPrimary colour via inline style
- All colour references use the primary prop with #06b6d4 fallback

### Build
- 0 TypeScript errors
- CSS custom properties typed via `as React.CSSProperties` cast

---

## Files Changed

| File | Action |
|------|--------|
| lib/portal-data.ts | MODIFIED — added ClientBrandProfile type + getClientBrandProfile() |
| app/(portal)/layout.tsx | REPLACED — parallel fetch, CSS vars injection, brand props |
| components/portal-sidebar.tsx | REPLACED — brand logo, dynamic active colours, avatar colours |

---

## Notes

- Clients without a brand profile see exactly the same cyan sidebar as before — zero visual regression
- When a brand scan is run and colours extracted, the portal automatically picks them up on next page load
- No page-level components were modified — only layout and sidebar
- The logo img onError handler hides the image on load failure; the "I" text renders behind it as fallback
