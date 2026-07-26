# Result — Global Client Picker Slice 3 (promotion to production)

**Brief file:** `invegent-dashboard:docs/dashboard/global-client-picker-completion-slice3-brief.md` (Slice 3) + carry `docs/dashboard/global-client-picker-v1-brief.md`
**Repo:** `invegent-dashboard` (separate from CE — dashboard lane)
**Executed by:** Claude Code (orchestrator), under PK gates
**Completed:** 2026-07-27 Sydney

---

## 1. Result status

`Complete` — Slice 3 merged to `main` and live in production (deploy integrity confirmed on the exact verified commit). Authed in-production click-through is gated behind Vercel deployment-protection SSO + the app's Supabase login and was not driven by Claude; the four behavioral proofs were verified live on the byte-identical commit in the local preview (PK authenticated).

## 2. Commit(s)

Branch `s2-gcp-slice3` → merged to `main` via fast-forward push (`2808d18..07d9c42`); GitHub PR [invegent-dashboard#9](https://github.com/Invegent/invegent-dashboard/pull/9).

- `a6c527d` — feat: Slice 3 authoritative `{id,slug,name}` identity + per-route `?client=` URL sync (reviewed in a prior session).
- `655e9c8` — fix: remount client-profile shell on client change (prior session).
- `67dc097` — fix: deterministic `updated_at` formatting (`Intl.DateTimeFormat`, `en-AU` / `Australia/Sydney`) to remove a React hydration mismatch on the Brand Identity tab.
- `07d9c42` — fix: stop a rapid-switch URL-echo race that could silently revert the operator's newest client pick.

Production deployment: `dpl_99D9s96ZiCQ9RfTWXyVbK7zWwnLW` — `state=READY`, `target=production`, `githubCommitSha=07d9c429…`, ref `main`.

## 3. Files changed (the two fixes this lane added)

- `app/(dashboard)/client-profile/ClientProfileShell.tsx` — modified (deterministic timestamp helper).
- `lib/client-url-sync.ts` — modified (optional `locked` input to the pure decision fn; suppresses URL→picker while locked).
- `lib/use-client-url-sync.ts` — modified (per-route lock via `lockedRef`/`activePathRef`, reset on route change).
- `tests/client-url-sync.test.ts` — modified (+3 tests: locked stale-echo re-drive, locked deep-link suppression, unlocked hydration regression guard).

## 4. Actions taken

- Diagnosed the client-profile hydration defect (locale/tz-dependent `toLocaleString`) and ported the fix (byte-identical, blob `3b48a2d`) from the stray `tmr-template-intake-ui-v0` working copy onto the correct `s2-gcp-slice3` branch, where the defect actually lived.
- Diagnosed PK's rapid-switch bug: async `router.replace` echoes landing out of order let a superseded param be mis-read as a fresh deep-link, reverting the newest pick. Fixed by locking out URL→picker hydration once the picker has driven a route's `?client=` (lock reopens on route change → deep-link/reload hydration preserved).
- Local verification on the branch: `tsc --noEmit` clean · **253/253** unit tests · `next build` green.
- Live preview verification (local, PK authenticated, on commit `07d9c42`):
  - Rapid-switch — both of PK's reported failing sequences (PP→CFW→INV→NDIS; PP→INV→NDIS→PP) now settle on the **last** pick across URL · picker · profile dropdown · localStorage · rendered brand colour.
  - `/client-profile` content matches the selected client (PP `#1E2532`; CFW `#233141`).
  - Deep-link hydration — full-load `?client=CFW` opens the picker on CFW, overriding stored PP.
  - Creative Library fail-visible — unsupported client renders an explicit amber "isn't governed for this client yet" panel; never renders PP data (guarded in `page.tsx` before any data fetch).
  - Console clean (no hydration warnings).
- Final external review (`review_id 49a3c44f`, pinned to diff sha256 `dfe1c950…73b5f`): verdict `partial`, medium risk, **no concrete defect** (generic edge-case caution + the documented in-route back/forward trade). PK cleared the non-clean verdict at an explicit gate.
- Merged PR #9 to `main` (fast-forward push) after PK clearance → Vercel production deploy READY on `07d9c42`.

## 5. Constraints confirmed

- No production DB / migration / RPC change — dashboard code only.
- No silent client fallback reintroduced — Creative Library fails visibly (PK decision 3 upheld).
- Push and production merge performed only under explicit PK authorization; the non-clean external review was surfaced and cleared by PK, not overridden.

## 6. Open issues

- **Known behavioral trade (documented, in-scope-excluded):** after the first picker-driven change on a route, browser back/forward that only changes `?client=` within that same route no longer moves the picker. Deep-link-on-load, reload, and share all still work. Not required by the Slice 3 brief; the deliberate cost of guaranteeing rapid-switch correctness.
- **Production authed click-through not performed by Claude** — blocked by Vercel deployment-protection SSO + Supabase app login (credentials not held). Behavior is established via deploy-integrity (prod runs the exact verified commit) + identical-code local proof. A PK authed spot-check in prod is optional confirmation.
- **Stray working-tree edit** on `invegent-dashboard` `tmr-template-intake-ui-v0` (the original uncommitted hydration edit) left untouched; can be reverted so it isn't double-committed.

## 7. Next recommended step

Global Client Picker Slice 3 is complete. Next outcome (PK-flagged priority): schedule format picker — put a format dimension on the schedule slot (Gap A) and seed it from the existing `get_week_format_allocation` allocator (Gap C), opened as a fresh Gate-1 brief (with S6's facts-only assessment + two live-verified memory corrections folded in).

## 8. Verification

**Verdict:** `Pass with notes`

**Notes:**

- Output matched the brief: authoritative identity + `?client=` sync live; both regressions PK found are fixed and verified.
- Constraints respected; no unexpected files changed (4 files across the two fixes; write-set matched the approved set).
- Success criteria met on the deployed commit; the one note is the authed in-prod click-through being credential-gated (established by deploy-integrity + identical-code proof instead).
- New risk: the documented back/forward-within-route trade — acceptable per brief scope.
- Follow-up: optional PK authed prod spot-check; revert the stray `tmr-template-intake-ui-v0` edit.

## 9. Learning notes

- Two-way URL↔state sync via async `router.replace` has an inherent out-of-order-echo race under rapid input; a per-route "picker has driven the URL → stop hydrating from the URL" lock is a robust, order-independent fix that still honours deep-link-on-load and reload (both occur before any write).
- A fix landing on the wrong branch (hydration edit on `tmr-template-intake-ui-v0` instead of `s2-gcp-slice3`) is a shared-checkout hazard; ground-truth which branch/worktree holds the target work before editing.
