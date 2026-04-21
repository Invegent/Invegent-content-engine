# A14 — invegent-portal RLS audit findings

**Generated:** 2026-04-22
**Auditor:** Claude Code (M3 sprint item)
**Scope:** All server-side Supabase touch points in `invegent-portal` (repo head `cdeb476`, main)

---

## Summary

**Files inspected:** 24 of 24 files containing any of `createServiceClient`, `createServerClient`, `createClient`, or `createBrowserClient` were fully read. No skips.

**Call-site categorisation:**

| Category | Count | Meaning |
|---|---|---|
| A — SECURITY DEFINER RPC with session-derived `p_client_id` | 18 | Expected, safe pattern |
| B — Direct `.from()` against a table | 3 | All on `public.portal_user`, all with service-client + session-derived `email` filter |
| C — `exec_sql` with raw-string interpolation of non-literal values | 4 | Values are session/DB-derived UUIDs, cast `::uuid` inside the RPC, but the pattern is wrong |
| D — `exec_sql` with no injectable values | 1 | Pure SELECT, no runtime inputs |
| E — OAuth callback writing with URL-state-supplied client_id | 2 | Cross-tenant token poisoning surface — HIGH |

**Severity counts:**
- High severity: **2**
- Medium severity: **5**
- Low / informational: **2**

### A14 closure recommendation

**Cannot close A14** — two **high**-severity findings (HS-1, HS-2) require fix before the first external client signs, specifically before Meta App Review unlocks or LinkedIn Community Management API access comes through. The findings are narrow (OAuth callback routes) and each is a ~20-line fix. Sequence them into the sprint before A2 flips live.

The 5 medium-severity findings are all the same class — `exec_sql` with raw-string interpolation even though the values today are session- or DB-derived and `::uuid`-cast. They are not exploitable as the code stands but carry the same anti-pattern risk M2/M5/Q2 just closed on the dashboard side. Bundle into one "portal exec_sql eradication" sprint item modeled on M5 — replace each `exec_sql` with a purpose-built SECURITY DEFINER RPC.

Overall posture on the happy path (session-authenticated user hitting a read/write on their own data): **isolation holds**. Every RPC call passes `p_client_id: session.clientId` where `session.clientId` is resolved from `supabase.auth.getUser()` → `portal_user.email` → `portal_user.client_id`. The pattern is applied consistently across 18 call sites.

---

## High severity findings

### HS-1: Facebook OAuth callback trusts unsigned `state` for client_id

- **File:** `app/api/connect/facebook/callback/route.ts:17-24, 72-80`
- **Pattern:** RPC `store_platform_token` called with `p_client_id` derived from a base64-encoded URL `state` parameter with **no signature, no session cross-check**.
- **Code:**
  ```ts
  const stateRaw = searchParams.get("state");
  // ...
  const decoded = JSON.parse(Buffer.from(stateRaw, "base64url").toString());
  clientId = decoded.clientId;                 // <-- attacker-controlled
  // ...
  await service.rpc("store_platform_token", {
    p_client_id: clientId,                     // <-- written here
    p_platform: "facebook",
    p_page_access_token: page.access_token,
    // ...
  });
  ```
- **Exploit path:** Any authenticated portal user (or anyone who can initiate an OAuth dance with a valid Facebook app ID) crafts a `state` whose base64 payload contains another client's `client_id` UUID. They complete OAuth against THEIR Facebook account, the callback exchanges the `code` for their page token, then writes that page token against the victim's `c.client_publish_profile` row. Result: the victim's pipeline starts publishing the victim's draft content to the attacker's Facebook page.
- **Mitigating factor (today only):** `OAUTH_ENABLED.facebook = false` by default (`app/(portal)/connect/page.tsx:50`) — no live initiation flow exists in the codebase today. The callback route itself is always reachable though, and the gate will flip to `true` before the first external client. **So this is a pre-sales-gate blocker, not a "fine until later" item.**
- **Also:** the middleware matcher does NOT carve out `/api/connect/*`, so the callback does require an authenticated Supabase Auth session. But session identity is not cross-checked against `state.clientId`.
- **Fix:** one of:
  1. Sign the `state` payload with HMAC-SHA256 using a server-only secret, validate the signature in the callback before trusting `clientId`.
  2. Read `p_client_id` from `getPortalSession()` server-side in the callback; use `state` only to carry CSRF nonce + return URL.
  3. Both (preferred).

### HS-2: LinkedIn OAuth callback has the identical pattern

- **File:** `app/api/connect/linkedin/callback/route.ts:16-22, 55-63`
- **Pattern:** Same shape as HS-1 — unsigned base64 `state` → `clientId` → `store_platform_token`.
- **Exploit path:** Identical to HS-1 but for LinkedIn Company Page tokens.
- **Fix:** Same options as HS-1. Should be fixed in the same change so the sign-and-verify helper is shared between the two callbacks.

---

## Medium severity findings

All 5 medium findings are the same pattern: `exec_sql` with `${value}` string interpolation inside a template-literal query body. None are currently exploitable because the interpolated values are either UUID-regex-validated, session-derived, or DB-sourced UUIDs — and every one is cast `::uuid` inside the RPC body so non-UUID strings fail with a clean 22P02 rather than executing injected SQL. But the pattern is exactly the anti-pattern M2/M5/Q2 just spent three sprints closing on the dashboard side. Leaving it in the portal means it will eventually be copied-and-extended by someone (including a future Claude Code session) and break.

### MS-1: `actions/portal.ts:20` — verifyDraftOwnership

- **Code:**
  ```ts
  const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-.../i;
  if (!UUID_RE.test(draftId) || !UUID_RE.test(clientId)) return false;
  const { data } = await service.rpc("exec_sql", {
    query: `SELECT 1 FROM m.post_draft pd
            WHERE pd.post_draft_id = '${draftId}'::uuid
              AND (pd.client_id = '${clientId}'::uuid OR ...)`,
  });
  ```
- **Defence-in-depth:** UUID regex pre-check rejects anything non-UUID shape. `clientId` is session-derived, `draftId` is user-supplied but regex-guarded.
- **Why medium not low:** the regex check is on the Category-C list of reasons a Q2-era audit would have accepted a dashboard bug. Wrong pattern.
- **Fix:** convert the whole function body to a new SECURITY DEFINER RPC `public.verify_draft_ownership(p_draft_id uuid, p_client_id uuid) returns boolean`. Replace `exec_sql` call with that.

### MS-2: `lib/portal-auth.ts:36` — resolve client_name from client_id

- **Code:**
  ```ts
  const { data: rows } = await service.rpc("exec_sql", {
    query: `SELECT client_name FROM c.client WHERE client_id = '${portalUser.client_id}'::uuid LIMIT 1`,
  });
  ```
- **Interpolated value source:** `portalUser.client_id` read from DB on previous line (`.from("portal_user").select(...).eq("email", user.email)`). Postgres-enforced UUID column, cannot contain SQL. Low real risk.
- **Fix:** replace with `.rpc("get_client_name_by_id", { p_client_id: portalUser.client_id })`, where that RPC is a one-line SECURITY DEFINER function. Or, change `portalUser.client_id` to include the client_name in a single portal_user + client join RPC — would collapse two calls to one.

### MS-3: `lib/portal-data.ts:34` — getClientBrandProfile

- **Code:** `WHERE client_id = '${clientId}'::uuid`
- **Callers (all verified):** `app/(portal)/layout.tsx:19` → `session.clientId`. Session-derived.
- **Fix:** new SECURITY DEFINER RPC `public.get_client_brand_profile(p_client_id uuid) returns table(...)`.

### MS-4: `lib/portal-data.ts:57` — getPortalDraftsCount

- **Code:** `WHERE client_id = '${clientId}'::uuid AND approval_status = 'needs_review'`
- **Callers:** `app/(portal)/layout.tsx:18` → `session.clientId`. Session-derived.
- **Fix:** RPC `public.get_portal_drafts_count(p_client_id uuid) returns int`. Or fold into the existing `get_portal_home_stats` RPC.

### MS-5: exec_sql in OAuth callbacks could be wrapped too

- Strictly the OAuth callbacks don't use `exec_sql` — they call the proper RPC. Flagging here because the HS-1/HS-2 fix should also consider whether `store_platform_token` should take the session identity as a separate parameter so it can enforce "session user's client_id matches the one being written to" inside the function body. This would catch MS-class bugs in future OAuth callbacks automatically.
- Not a bug today — a design note for the HS-1/HS-2 fix.

---

## Low / informational findings

### LS-1: `portal_user` direct `.from()` access bypasses RLS silently

- **Files:**
  - `app/(auth)/callback/route.ts:76` — `.from("portal_user").select("portal_user_id, client_id, user_id").eq("email", user.email!)`
  - `app/(auth)/callback/route.ts:94` — `.from("portal_user").update({ user_id, updated_at }).eq("portal_user_id", portalUser.portal_user_id)`
  - `lib/portal-auth.ts:28` — `.from("portal_user").select("client_id").eq("email", user.email)`
- **Risk:** RLS is enabled on `public.portal_user` with 1 policy — but all 3 call sites use `createServiceClient()` which bypasses RLS. The email filter in every query is session-derived (`supabase.auth.getUser().email`), so today these are safe.
- **Why informational:** functional isolation is correct; RLS is belt-and-braces that isn't engaged here. If a future refactor ever switches one of these callers to `createServerClient()` (the authenticated SSR client), the existing policy would start mattering. Worth the mental note, not a bug.

### LS-2: `c.client_publish_schedule` has RLS enabled but zero policies (dashboard-side, but surfaced here)

- Query: `SELECT ... FROM pg_class WHERE relname='client_publish_schedule'` returned `rls_enabled=true, policy_count=0`.
- This means any non-owner role querying this table gets zero rows. Service role bypasses so the dashboard (operator) and portal don't notice. But anyone who tries a direct anon/authenticated query sees nothing.
- Portal doesn't touch this table directly today — it comes up through `get_publish_schedule` / `save_publish_schedule` RPCs in the dashboard side only.
- Flagging here because it's the same "RLS is theatre if no one tests it at the non-service-role level" class of issue.

---

## Out of scope (per brief), flagged for later

- **`app/onboard/update/page.tsx`** — public, unauthenticated route (behind middleware public whitelist for `/onboard`). Uses `createPublicClient()` (browser client with anon key) to call `validate_update_token(p_submission_id, p_token)` and `update_onboarding_submission(p_submission_id, p_token, p_updates)`. Magic-link-token pattern, not auth-bypass. Both submission_id and token are URL-supplied; the RPC validates them server-side. Safe by design — token unguessable, server-side validation gates the update. Noted for completeness; not a finding.
- **`actions/onboarding.ts:59`** — `getPackagesForForm` uses `exec_sql` with no interpolated runtime values (pure SELECT listing public service packages). Not exploitable, but is in the "wrong pattern" bucket for the same reason as MS-2 through MS-4 — bundle into the exec_sql-eradication sprint item.
- **Signed-in browser client at `app/(auth)/login/page.tsx:23`** — login form uses `createClient()` (browser, anon key) for `signInWithOtp`. Standard Supabase Auth; no data path.
- **`middleware.ts`** uses anon key + cookies to gate all non-public routes. Public routes: `/login`, `/callback`, `/auth`, `/onboard`. Middleware correctly redirects unauthenticated users to `/login` for everything else. Solid.

---

## RLS status cross-reference

Tables touched directly or indirectly by portal code, with their current RLS posture:

| Table | Schema | RLS | Policies | Touched by portal | Notes |
|---|---|---|---|---|---|
| `portal_user` | public | ✅ on | 1 | Direct `.from()` (LS-1) | Service client bypasses; email filter is session-derived |
| `post_draft` | m | ✅ on | 2 | via exec_sql (MS-1, MS-4), via RPCs | Service client bypasses; client_id filter in every path |
| `post_publish` | m | ✅ on | 1 | via RPCs only | Safe |
| `post_publish_queue` | m | ✅ on | 1 | via RPCs only | Safe |
| `post_performance` | m | ✅ on | 1 | via RPCs only | Safe |
| `audience_asset` | m | ✅ on | 1 | via RPCs only | Safe |
| `audience_performance` | m | ✅ on | 1 | via RPCs only | Safe |
| `client_audience_policy` | c | ✅ on | 1 | Not touched by portal | — |
| `client_publish_schedule` | c | ✅ on | 0 | Not touched by portal | LS-2: RLS on + zero policies = deny-all for non-service roles |
| `system_audit_log` | m | ✅ on | 1 | Not touched by portal | — |
| `client` | c | ❌ off | 0 | via exec_sql (MS-2) | Filter by session-derived client_id |
| `client_brand_profile` | c | ❌ off | 0 | via exec_sql (MS-3) | Filter by session-derived client_id |
| `client_publish_profile` | c | ❌ off | 0 | via RPC (`store_platform_token`) | **Write target of HS-1/HS-2** — function body trusts `p_client_id` supplied by caller |
| All other `c.*`, `m.*`, `f.*`, `t.*`, `k.*` tables | — | ❌ off | 0 | Not touched by portal | 128 tables RLS-off total |

**Summary:** 10 of 138 tables RLS-on. Portal code touches 3 RLS-on tables (all via service client, all with application-layer client_id filter). Portal also touches 3 RLS-off tables via `exec_sql` (MS-2, MS-3 plus the dedup-style read in `getPortalDraftsCount`) and writes to `c.client_publish_profile` via an RPC that trusts the caller-supplied client_id (HS-1/HS-2).

---

## Patterns observed

**Good signals:**

1. **Session derivation is consistent.** Every RPC that takes a `p_client_id` is passed `session.clientId` resolved via `getPortalSession()`. The session resolver is the single chokepoint (`lib/portal-auth.ts`), and it uses the Supabase Auth server session as the source of truth. No route reads `client_id` from URL params or request body and passes it to a data RPC. This is the single most important isolation guarantee in the codebase today — if you trust `supabase.auth.getUser()`, the portal is tenant-isolated.
2. **Every `/api/portal/*` route gates on `getPortalSession()`** before touching data, returning 401 on miss. Every server component (`page.tsx`) calls `redirect("/login")` on miss. Consistent.
3. **Middleware matcher is correctly scoped.** Public routes whitelisted explicitly; everything else requires a session. Matcher excludes static assets but not API routes — API routes inherit session gating.
4. **Draft operations have ownership double-check.** `actions/portal.ts` approve/reject draft paths call `verifyDraftOwnership(draftId, session.clientId)` before the mutation RPC. Belt-and-braces: even if the RPC `draft_approve_and_enqueue` had a missing client_id filter, the pre-check would catch it.
5. **Onboarding form uses a separate public client with a token-gated RPC.** Clean separation from the authenticated portal surface; can't cross-contaminate.

**Bad signals:**

1. **`exec_sql` is a present anti-pattern.** Even when the interpolated values are safe today, the pattern encourages "just inline one more field" drift. The same pattern wore three different fixes on the dashboard side this week (M2, M5, Q2 for the dashboard feeds create route).
2. **OAuth state is trusted.** Classic OAuth CSRF protection requires state to be either (a) signed and bound to the session, or (b) a server-generated nonce cross-checked on return. Neither is in place. Even if the clientId attack weren't available, the standard OAuth CSRF attack still would be.
3. **Service-role client is the default everywhere.** This is a deliberate design choice (RLS-off tables are accessed via service role), but it means RLS provides almost no isolation in practice. A single bug in an RPC body that forgets a `WHERE client_id = p_client_id` clause is enough to leak cross-tenant. No RLS safety net exists because the client bypasses it.
4. **No centralised "client query" helper.** Each call site independently threads `session.clientId` through. Correct today; brittle over time. One path that forgets is enough.

**Sanity-check routes walked through manually (per brief's sanity gate):**

- `actions/dashboard.ts:getPortalDashboardData` → calls three RPCs in `Promise.all`, every one with `p_client_id: session.clientId`. Session from `getPortalSession()`. Clean. ✅
- `app/api/portal/calendar/route.ts:GET` → 401 on missing session, validates `year` + `month` as parsed ints within range, passes session-derived `p_client_id` to `get_portal_calendar`. Clean. ✅
- `actions/portal-inbox.ts:approveDraft` → session guard, RPC call with both `p_client_id: session.clientId` AND `p_draft_id: draftId`. RPC server-side validates ownership. Clean. ✅

Three random routes, three clean. Not a fluke — the pattern is consistently followed where it's followed. The issues are narrow and well-bounded.

---

## Fix list for A14 closure

Ordered. Each item sized for a single sprint slot.

1. **[HS-1/HS-2 — before A2 unlock]** Sign `state` in OAuth initiation + verify in both callbacks.
   - Create `lib/oauth-state.ts` with `signState(payload, secret)` / `verifyState(signed, secret)` using HMAC-SHA256.
   - Require `OAUTH_STATE_SECRET` in env (generate + rotate via standard secret-management).
   - Update FB and LI callback routes to verify the signature AND cross-check `state.clientId === getPortalSession().clientId`.
   - Update initiation flow (client-side or server-side, wherever it lives) to sign state before redirect.
   - This is the A14 blocker — ~60-90 min of work + a test against the preview URL.

2. **[MS-1 to MS-4 — bundle as one sprint item]** Portal `exec_sql` eradication.
   - New SECURITY DEFINER RPCs: `verify_draft_ownership`, `get_client_name_by_id` (or fold into an existing RPC), `get_client_brand_profile`, `get_portal_drafts_count`.
   - Replace the 4 call sites with `.rpc(...)` calls following the M5 pattern (destructure `{ data, error }`, throw on error with structured logging).
   - Delete `exec_sql` from portal entirely after these land + MS-5's `getPackagesForForm` is replaced.
   - Modeled on M5 — ~90 min per pair of sites.

3. **[LS-1 — deferred, doc-only]** In `lib/portal-auth.ts` and `app/(auth)/callback/route.ts`, add a comment clarifying that the `.from("portal_user")` direct access is safe ONLY while using the service client + session-derived email filter. If the client ever switches to `createServerClient` (user-scoped), the current RLS policy on portal_user will need to be audited against the new query shape.

4. **[LS-2 — deferred, dashboard-side]** Either add policies to `c.client_publish_schedule` or flip RLS off. Zero-policies + RLS-on is a foot-gun (deny-all for non-service roles, including any future authenticated portal access). Coordinate with whichever sprint covers the schedule editor work.

5. **[Follow-on, not A14-scoped]** Centralise session-derived `client_id` threading. Wrap all portal data fetches so `session.clientId` is never threaded through call sites by hand. This is structural not acute — appropriate for post-first-client hardening.

Items 1 and 2 together close A14. Items 3–5 are follow-ons that can live in the backlog.

---

## Verification gates — compliance

| Gate | Status |
|---|---|
| Coverage gate — all files with `createServiceClient`/`createServerClient`/`createClient` read in full | ✅ 24 of 24 files inspected, listed above |
| Categorisation gate — every Supabase call site categorised A/B/C/D/E | ✅ Done in Summary counts |
| Cross-reference gate — every table named in Category B/C queries has RLS status noted | ✅ RLS table above |
| Sanity gate — 2-3 random routes walked end-to-end | ✅ Three routes walked in "Patterns observed" |

End of audit. No code changed. M3 complete.
