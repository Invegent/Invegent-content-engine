# Skill: Dashboard and Portal Pages

Read before building or significantly changing any Next.js page in invegent-dashboard or invegent-portal.

---

## Before building

**What data does this page need?**
Name every table and function it reads. Check those tables exist and have the columns you expect. The queue page draft_title column was missing from the original query — a 30-second schema check would have caught it.

**Where does the data come from?**
Dashboard: `exec_sql` RPC with service role key, never direct PostgREST on m/c schemas.
Portal: `getPortalSession()` → `createServiceClient()` → SQL function with explicit `p_client_id`. Never `auth_client_id()` with service role key — returns null.

**Does it need timezone handling?**
All scheduled times display in `c.client.timezone`. Use `formatAbsoluteDateTime(date, timezone)` from `lib/date.ts`. Never hardcode Sydney or use browser local time.

---

## Building

**Sort order: does earliest-first or latest-first make sense to a human reading this?**
Queue: earliest first (what's publishing next). Logs: latest first (what just happened). Think about what the user is trying to know.

**Empty state: what does the page show when there's no data?**
Every table, list, and section needs an explicit empty state. A blank white div is confusing. "No items yet. First run within 30 minutes." is clear.

**Error state: what does the page show if the query fails?**
Return `[]` from the data function, not undefined. The component handles empty arrays. It does not handle null.

**Is it in the sidebar?**
Every new page needs a nav item in `components/sidebar.tsx`. This was missed for Pipeline Log — it was built before the nav item was added.

---

## After building

**Open the page in the browser and read it as a user.**
Not as the person who built it. Does the information hierarchy make sense? Is anything confusing? The queue page sort issue was obvious the moment it was looked at — but it wasn't looked at before shipping.

**Check it on a smaller viewport.**
NDIS practice owners use phones. The portal especially. Tables that overflow on mobile need `overflow-x-auto` wrappers.

**Does it handle the live case and the empty case?**
Test with data in the DB. Test by imagining what it looks like with zero rows in every query. Both states should be readable.
