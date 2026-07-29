# Result — Client Platform Readiness Summary (dashboard)

**Brief file:** `docs/briefs/client-platform-readiness-summary-gate1-v1.md`
**Repo:** `invegent-dashboard` (separate from this one).
**Executed by:** chat (orchestrator-driven: `db-rls-auditor` grounding, `ef-builder` isolated-worktree build, manual code review, `branch-warden`, external review, PK visual approval, PK deploy authorization).
**Completed:** 2026-07-29 Sydney — built, reviewed, PK-authorized, merged, deployed, production-verified, all in one session.

---

## 1. Result status

`Complete — merged and live in production`, with an explicit recorded PK gate at every stage: PK reviewed the rendered panel visually before merge, then explicitly said "yes go ahead" to push/merge/deploy. No gate bypass this lane (contrast with the process finding recorded in `docs/briefs/results/format-capability-indicator-v1-result.md` §10, which this lane's discipline was designed to avoid repeating).

## 2. Commit(s)

- `invegent-dashboard` commit `a8ebd05acebfd37ea23a1bf1ff8ded22af53f3cb`, branch `platform-readiness-summary-v1`, forked from `origin/main` at `aa8209faf8cd29731b16f6a7d61f41e5b846cc1b`.
- Pushed to `origin/platform-readiness-summary-v1`, then fast-forward-pushed directly onto `origin/main` (`git push origin platform-readiness-summary-v1:main`) — a clean fast-forward, `origin/main` had not moved since the fork (re-verified immediately before push).
- Vercel auto-deployed on the `main` push: production deployment `dpl_8R4hNrh5av4k6pDBY3Ueoudz6eUW`, `state: READY`, `target: production`, alias `dashboard.invegent.com`, build completed in 38s with zero build errors.

## 3. Files changed (invegent-dashboard)

- `lib/platform-readiness.ts` — created. Pure types + helpers: `PLATFORM_READINESS_PLATFORMS` (fixed 4-platform list), `PUBLISHER_PATH_PROBE_FORMAT`, `buildCapabilityPair`, `isCurrentlyPaused`, `buildPlatformReadinessRow`, `computeSafeForNewDemand`.
- `components/clients/PlatformReadinessSummary.tsx` — created. Read-only server component rendering the panel; reuses `CapabilityCell` verbatim.
- `app/(dashboard)/clients/page.tsx` — modified. Wires the new panel into the existing "schedule" tab, above `<ScheduleTab>`, using data already fetched for that tab (`publishProfiles`, `scheduleSlots`, `allocationResult`) plus one new call to the existing, unmodified `getFormatCapabilityMap`.
- `tests/platform-readiness.test.ts` — created. 19 Vitest cases (fixture-based, no live DB).
- **Confirmed unchanged (byte-identical to `origin/main`):** `lib/format-capability.ts`, `actions/format-capability.ts`, `components/format-capability/CapabilityCell.tsx`, `components/clients/WeekFormatPlanTab.tsx`, `actions/week-format-plan.ts` — verified independently by `ef-builder`, then re-verified independently by `branch-warden`.

## 4. Actions taken

- `db-rls-auditor` grounded the build live, read-only, before any code was written: confirmed exact schema of `c.client_publish_profile` / `c.client_publish_schedule`; confirmed `classify_format_capability`'s `publisher_path_missing` check fires on `c.client_publish_profile` row-existence alone (tested live with both a real format string and SQL `NULL` — identical result); confirmed CFW/YouTube is a true double-absence (0 profile rows, 0 schedule rows); confirmed PP/YouTube is a *different* live state (profile + schedule exist, but `unsupported_silent_degrade` at the template layer) that the panel must not conflate with CFW's case; reconfirmed the classifier's grant is still `service_role`-only.
- `ef-builder` built the panel in an isolated worktree (`C:/Users/parve/ice-wt/dash-platform-readiness-v1`), forked from `origin/main` tip, on branch `platform-readiness-summary-v1`. Local checks: `tsc --noEmit` clean, Vitest 340/340 (321 baseline + 19 new, zero regressions), `next build` clean (65 pages).
- Manual code review (chat) of the full diff: confirmed correct reuse of `getFormatCapabilityMap`/`CapabilityCell`, correct fail-closed defaults (`format: null` → local `unknown`, never an RPC guess), correct `paused_reason`-without-`paused_until` handling (shown, but never treated as blocking). One cosmetic nit noted (a redundant/mislabeled assertion in one `isCurrentlyPaused` test) — not worth a fix cycle, does not affect shipped behaviour.
- `branch-warden`: **safe** — HEAD exact (`a8ebd05`), fork point exact (`aa8209f`, no drift), working tree clean, the 5 protected files byte-identical to `origin/main`, no contamination of any other worktree or the shared main checkout, `origin/main` unmoved.
- External review (`ask_chatgpt_review`): **agree/proceed**, risk low, confidence high, zero pushback. `review_id 349ea5e5-9ca0-4af4-8b9e-f5f82aaa4e55`, pinned to `reviewed_input_hash 85963fffa690f0f3173d4c1fae8277bea6b2593a219107153dff077eaed92731` (sha256 of the reviewed diff).
- PK did a live visual check on a local preview (worktree dev server, port 3010) against real clients. This surfaced LinkedIn and YouTube showing "Unsupported — silent degrade risk" for Property Pulse, which looked unexpected against an earlier smoke test that had used an arbitrary probe format. Chat independently re-verified this live, read-only, directly against the DB before treating it as correct: queried `get_week_format_allocation` for Property Pulse's real current-week allocated formats (LinkedIn → `text`, YouTube → `video_short_kinetic`, both `format_mix_allocator`-sourced, not fallback), then re-ran `classify_format_capability` with those exact real values — reproduced the identical `unsupported_silent_degrade`/`format_unmapped` result, with live evidence of 69 (LinkedIn) and 28 (YouTube) posts published in the last 90 days with no currently-selectable template. Confirmed this is a genuine, pre-existing production finding the panel correctly surfaces for the first time — not a bug in the panel's format-selection logic.
- PK explicitly authorized push/merge/deploy ("yes go ahead") after that verification. Chat re-confirmed `origin/main` had not moved, pushed the branch, fast-forward-merged onto `main`, and confirmed the resulting Vercel production deployment: build clean (38s, zero errors), zero runtime errors on `/clients` in the 30 minutes following deploy.

## 5. Constraints confirmed

- Read-only visibility only — no publisher profile, schedule row, or `publish_enabled` write anywhere in the diff.
- `public.classify_format_capability` itself untouched — no migration, no grant change; reconfirmed still `service_role`-only (+ owner `postgres`) both before the build and via the classifier's own unmodified caller.
- The existing Weekly Format Plan tab and everything it depends on (`lib/format-capability.ts`, `actions/format-capability.ts`, `CapabilityCell.tsx`, `WeekFormatPlanTab.tsx`, `actions/week-format-plan.ts`) is byte-identical to pre-change `origin/main` — confirmed twice, independently.
- No fake/unscheduled rows added to the Weekly Format Plan — this is a wholly separate new panel.
- No template-promotion or portfolio-weight code touched.
- CFW proof: YouTube row appears despite zero schedule rows, displays "Publisher path missing" (not "Unknown"); Facebook/Instagram/LinkedIn unchanged (PK-verified visually, matches live ground truth).
- PP proof: all four platforms display real live readiness (Facebook/Instagram → Ready; LinkedIn/YouTube → the genuine `unsupported_silent_degrade` finding, independently re-verified against the DB); existing Format Plan tab untouched.

## 6. Open issues

- The live finding surfaced by this panel — Property Pulse currently has no selectable template for its actually-scheduled LinkedIn (`text`) and YouTube (`video_short_kinetic`) formats, with 69 and 28 posts respectively published in the last 90 days on that ungoverned path — is a genuine, pre-existing production risk, **not created by this lane**, and **not remediated by this lane** (read-only visibility was the entire scope). This is now visible to PK for the first time and is a candidate for its own follow-up lane (template registration for those two format/platform pairs, or an R3 enforcement decision) — not started, not scoped here.
- A live authenticated browser click-through of the production `/clients` page was not performed by chat — the login is credential-gated and entering a password is outside chat's action boundary regardless of context. PK performed the visual verification directly instead (see §4). Production-side verification by chat was limited to build/runtime-error telemetry (clean) — sufficient given PK's own visual pass covered the actual rendered UI.
- One cosmetic test nit (§4) left as-is — not functionally significant.

## 7. Next recommended step

None required to close this lane. A future, separately-scoped lane could pick up the LinkedIn/YouTube `format_unmapped` finding for Property Pulse (§6) if PK wants it remediated — no code should be written for that until PK names it as a task.

---

## 8. Verification (chat fills this)

**Verdict:** `Pass`

**Notes:**

- Output matches PK's brief exactly — all 9 required per-platform fields shown, canonical classifier reused unmodified, CFW/PP proof requirements met and PK-verified visually against real data.
- Full review chain ran clean end-to-end with an explicit, recorded PK gate at both the pre-merge visual-review point and the deploy-authorization point — no gate bypass.
- The one surprising result (PP LinkedIn/YouTube showing a blocked status) was investigated to ground truth rather than assumed to be either a bug or accepted at face value, and confirmed genuine.
- No unexpected files changed; the diff's blast radius is exactly the 4 files listed in §3.

## 9. Learning notes (chat fills this)

- Live-verifying a PK-flagged "does this look right?" moment against the database directly (rather than either dismissing it or blindly trusting the earlier smoke-test assumption) turned a "did I ship a bug" question into a confirmed, evidence-backed production finding — worth doing whenever a screenshot doesn't match a prior assumption, even under time pressure to reach the deploy gate.
- Fast-forward-pushing an isolated-worktree branch directly onto `origin/main` (`git push origin <branch>:main`) without touching the shared main checkout avoided any risk of the shared-worktree branch race documented in prior sessions' memory — worth using as the default merge mechanic for this kind of single-branch, no-conflict dashboard change.
- The credential-entry boundary (never type a password on the user's behalf, regardless of context or whose system it is) meant chat could not do its own authenticated visual smoke test; PK's own visual check was the correct substitute, and chat's job was to make that check easy (exact navigation steps, exact expected values) rather than to route around the boundary.
