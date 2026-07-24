CLAIMED (no register version — control tower records) · cc-0054 · DEPLOYED RESULT · session S1 Dashboard Authz · 2026-07-24 +1000 Sydney

# cc-0054 — DEPLOYED + VERIFIED · Dashboard `exec_sql` containment 2/7 → 7/7

**Status:** **DEPLOYED TO PRODUCTION AND VERIFIED FROM VERCEL.**
**Lane class / tier:** SAFETY_GATE · **T2** (code-only, revertable, zero DB/RLS/grant/migration).
**Repo:** `invegent-dashboard` · deploy window opened by PK-14 + orchestrator "S1 GO".

> ## Outcome
>
> **All seven caller-controllable `exec_sql` paths in the dashboard are now contained** — cc-0053's two (live since
> `6fe8d1e`) plus cc-0054's five. **This satisfies the E-Q2 precondition** that PK's D3 Option 1 requires before
> Slice 0.5 enforcement could ever be enabled.
>
> **It does NOT enable enforcement. It does NOT establish authorization** — every authenticated account remains
> operator-equivalent. **It does NOT remediate `exec_sql`** (Batch 6, unopened). Meeting a precondition is not
> exercising it; per PK, Slice 0.5 / Slice 1 **park** from here.

---

## 1. Identity — as deployed

| Item | Value |
|---|---|
| **Commit** | **`524ca6d1c25da0c37ec014c7612a6623ce38b3bd`** |
| **Base** | `6fe8d1e198d8afaff22483c36072f07a8be5d4eb` |
| **Diff sha256** | **`652615aab010777e8b37adf307c0b43a6794e596dffca551bdc23c26881b3a16`** |
| Push | **clean fast-forward** `6fe8d1e..524ca6d`, no force, no merge commit (exit 0) |
| `origin/main` after | `524ca6d` (`rev-parse` **and** `ls-remote` agree) |
| External review | `8d0510ca-147c-4fb8-9397-a872c7e3a3f6`, pinned `652615aa…` — `partial`/escalate, **escalation cleared by PK-14** |

## 2. ⭐ Deployed-SHA verification (the gate on recording 7/7)

**PK: *"Verify the deployed Vercel SHA before recording containment 7/7."* A push proves git accepted it, not that
production serves it. Verified from the Vercel API, not inferred:**

| Field | Value |
|---|---|
| **Deployment** | **`dpl_DkYuG4vHSsaoGggvREx2aRkjmGXp`** |
| **`githubCommitSha`** | **`524ca6d1c25da0c37ec014c7612a6623ce38b3bd`** ✅ matches the authorized commit |
| **`state` / `readyState`** | **READY** |
| **`aliasError`** | **null** |
| **`alias`** | **`dashboard.invegent.com`**, `invegent-dashboard.vercel.app`, +2 ✅ |
| `target` · ref · region | `production` · branch `main` · `iad1` |
| Build | `buildingAt` 1784887912301 → `ready` 1784887985419 (~73 s) |

**⇒ `dashboard.invegent.com` serves `524ca6d`. Containment 7/7 is verified, not assumed.**

## 3. Pre-push gate — re-run fresh at the moment of GO (5/5 PASS)

The prior 4/4 was treated as expired by design and **re-run in full** immediately before the push:

| # | Gate | Result |
|---|---|---|
| 1 | `fetch --prune`; `origin/main` == `6fe8d1e` (`rev-parse` + `ls-remote` agree) | **PASS** |
| 2 | Diff recomputed byte-for-byte == `652615aa…` → review still binds | **PASS** |
| 3 | **190/190 tests · 13/13 mutation proof · AC-LAYOUT \|A\|=3 unchanged · `next build` clean (65/65)** | **PASS** |
| 4 | `branch-warden` — 9/9 gates, `push_safe_to_execute: true`, dry-run classified clean FF | **`safe`** |
| 5 | 2 ahead / 0 behind, zero merge commits, `HEAD~2` == base, tree clean, zero mutation residue | **PASS** |

## 4. What is contained (7/7)

| Owner | Sites |
|---|---|
| **cc-0053** (live since `6fe8d1e`) | `api/onboarding/run-scans/route.ts` (**deleted**) · `actions/onboarding-scans.ts` |
| **cc-0054** (this deploy) | `client-profile/page.tsx` ×3 getters · `api/visuals/route.ts` · `api/feeds/available/route.ts` · `pipeline-stats.ts` ×5 fragments · `digest-policy.ts` |

**Four of cc-0054's five were GET-reachable by URL** — no POST, no `Next-Action` header, no bundle inspection.

## 5. Post-deploy verification — what was proven, and the one step that was NOT

**Verified (no authentication required):**

- **Deployed SHA + READY + production alias** — §2. This is the primary proof and it is complete.
- **The app is serving and middleware is intact.** All four surfaces plus both API routes return **HTTP 307 →
  `/login`** unauthenticated: `/`, `/client-profile`, `/monitor`, `/feeds`, `/visuals`, `/api/visuals`,
  `/api/feeds/available`. **No 500s** — a module-level break from the guards would surface as a 500, not a redirect.
- The login page renders correctly (`Invegent — Content Engine — Operations Dashboard`).

> ### ⚠ NOT verified, and NOT claimed: the authenticated positive path.
>
> **`middleware.ts` matches `/api/**` and every dashboard route, so an unauthenticated request is redirected
> BEFORE the page or route handler runs. The 307s above therefore do NOT exercise the guards at all.** The
> meaningful proof — that real production client ids still flow through `/client-profile`, `/monitor`, `/feeds`,
> `/visuals` — requires a genuine operator session.
>
> **I did not perform it: entering credentials is prohibited, and I will not do so to manufacture evidence.**
> **This is a one-click check for PK, and it is the correct residual risk to name rather than paper over:** these
> guards' risk profile is **over-rejection, not under-rejection**, so the failure mode to watch for is a legitimate
> id being refused, not a malicious one getting through.
>
> **Do NOT probe production with a malformed id** — that behaviour is already proven by the 13/13 mutation suite.

**The Vercel-log gate stays CLOSED, not open.** Production runtime logs return empty over both 30-day and 3-hour
windows, so the external reviewer's suggested post-deploy monitoring **cannot be satisfied by anyone**. Per PK:
*"Do not invent an impossible Vercel-log gate."* **It is not an open item and no substitute was constructed.**

## 6. Rollback (ready, unused)

Vercel instant-rollback to **`dpl_F8Npuxdd2yZ7xgSaRpQgaHP2i9mr`** (= `6fe8d1e`, `isRollbackCandidate: true`), or
`git revert 524ca6d 164732b` + push. **No DB state to unwind, no grant to restore, no migration to reverse.**

## 7. Carries — parked per PK, not lost

| Item | State |
|---|---|
| **cc-0055** `upsertDigestPolicy` — unvalidated privileged **write** (bound-param RPC, not injection) | Gate-1 authored; **PARKED, do not build** |
| **C-2** `assign_brand_avatar` sets `is_active=true` unconditionally; the only partial-unique index guards `is_default_host`, **not** `is_active` | **Scoped finding, handed over.** Time-sensitive once cc-0063 lands |
| Slice 0.5 implementation / Slice 1 enforcement | **PARKED** — design done, Gate-1 approved, recorded |
| Batch 6 (`exec_sql` re-ownership) | Unopened; **not expanded into** |

## 8. Non-claims

**No exploitation is claimed, attempted, or demonstrated** — no payload was constructed and **no production probe
with malformed input was made**. This deploy does **not** establish authorization, does **not** remediate
`exec_sql`, does **not** enable enforcement, and does **not** address the ~18 SECURITY DEFINER functions reachable
directly over PostgREST by any authenticated principal, `cron.job` persistence, or the Edge Functions' own handling
of their inputs. **The authenticated positive path is NOT verified (§5)** and is explicitly outstanding. Zero
database mutation was performed by this lane.
