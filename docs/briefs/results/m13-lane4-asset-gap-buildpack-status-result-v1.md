# Result — M13 Lane 4: Asset Gap Build-Pack status display (v1)

**Brief file:** control-tower seed relay (session `local_aac5adf2-b0c4-458f-a67c-8262f198b51d`, informational/no-authority; PK confirmed "go ahead" in the receiving session 2026-08-06, and supplied the dashboard repo path)
**Executed by:** Claude Code (orchestrator) + `dashboard-ia-lint` (pre-implementation audit) + `branch-warden` (pre-commit)
**Completed:** 2026-08-06 Sydney
**Lane classification:** T2 (isolated dashboard branch, UNDEPLOYED, read-only UI, zero backend surface) · executes the M13 scoping packet §8 Lane 4, pulled forward by PK's item-J pre-ruling

---

## 1. Result status

`Complete` — panel designed, IA-linted (WARN, zero blocks), implemented, unit-tested (13/13), typechecked and production-built clean, visually verified in a live dev-server session (populated + empty states), committed on an isolated branch, and pushed for evidence. **No merge, no PR, no deploy** — the branch stops at evidence, per the seed's scope.

## 2. Commit(s)

- `e90a469` — `feat(clients): read-only Build Pack status panel on Asset Gap tab (M13 Lane 4)` — on branch `claude/m13-lane4-asset-gap-buildpack-status` (dashboard repo), based off `dashboard-operator-cockpit-v1` @ `7bb9336` (== origin tip at branch time), pushed to origin. NOT merged anywhere.

## 3. Files changed

**invegent-dashboard repo (branch `claude/m13-lane4-asset-gap-buildpack-status`):**
- `lib/m13-build-pack-status.ts` — created (static snapshot module: types, closed enums, 2 transcribed rows, `buildPackStatusForClient` filter, the honesty-contract header)
- `components/clients/BuildPackStatusPanel.tsx` — created (read-only server component; `// IA: primary-question` marker per the lint's recommendation)
- `tests/m13-build-pack-status.test.ts` — created (13 vitest cases incl. the pinned no-`live_read`-until-Lane-5 honesty invariant)
- `app/(dashboard)/clients/page.tsx` — modified (one import block + sibling render inside the existing `asset-gap` tab conditional; the existing `key={activeClientId}` remount behavior preserved by moving the key to a wrapper div)

**CE repo (working-tree only, this lane's design/record):**
- [docs/briefs/artifacts/m13-lane4-asset-gap-buildpack-status-design-v1.md](../artifacts/m13-lane4-asset-gap-buildpack-status-design-v1.md) — created (the pre-implementation design the IA lint audited)
- `docs/briefs/results/m13-lane4-asset-gap-buildpack-status-result-v1.md` — this file
- `.claude/launch.json` — one preview entry added (`m13-lane4-preview`, port 3012), local tooling only

## 4. What was built

A **read-only "Build Pack status (M13)" panel** rendered as a sibling sub-section below the existing M8 `AssetGapTab` (same-tab-sibling precedent: `PublishingPlanPyramid`/`ClientCapabilityOverlay` on the schedule tab). v1 is a **static snapshot** — no live registry exists (Lane 3 unbuilt), so the two rows are hand-transcribed from repo-committed CE artifacts, and the panel says so in a persistent, non-dismissable amber banner.

**The honesty contract (the design's core decision):** `diff_verdict` is never rendered alone — it always appears with `capture_provenance` (`none`/`fixture`/`self_check`/`live_read`), because a "clean" diff against a hand-authored fixture or self-check Capture proves tooling self-consistency, not that a live Creatomate template matches. Both current rows are pre-Lane-5, so both render "Clean" with an explicit *"tooling self-consistency only — not a live-template verification"* caveat; `fixture`/`self_check` provenance pills are deliberately neutral-toned (slate), never positive. A unit test pins that no snapshot row may claim `live_read` until Lane 5 actually performs one.

Rows (both `property-pulse`): `blueprint_pp_carousel_cover_v1` (Lane-1 fixture pair; real template registered but never live-captured) and `blueprint_m6_triptych_v1` (this session's M6 Blueprint; no template exists yet).

## 5. Verification chain

1. **`dashboard-ia-lint` (pre-implementation, on the design doc):** **WARN, zero blocks.** Confirmed the same-tab-sibling pattern is real shipped precedent; confirmed the panel's domain vocabulary is the same carve-out class as `OverlayStatus`/`EligibilityState` (not a violation of the twelve-state content vocabulary); corrected one precision point (client-scoping is the Clients page's own local `?client=` mechanism, not the global-picker context — that context has no `client_slug`); recommended the `// IA: primary-question` marker (added) and a re-lint against the real diff (see §7).
2. **Unit tests:** 13/13 pass (`tests/m13-build-pack-status.test.ts` + the existing M8 `tests/asset-gap.test.ts` regression suite, both run).
3. **`tsc --noEmit`:** clean (after one real catch — `client_slug` is `string | null` on `ClientRow`; fixed with `?? ""`, which the filter treats as the honest empty state).
4. **`npm run build`:** clean production build.
5. **Visual verification (live dev server, port 3012, PK-authenticated session):** Property Pulse → both rows render with banner, provenance pills, and caveats; NDIS-Yarns → honest empty state ("No Build Pack artifacts for this client yet"); one console error (`SyntaxError: Invalid or unexpected token`) reproduces identically on the overview tab which does not render this panel — **pre-existing on the base branch, not introduced by this change** (see §6 open issues).
6. **`branch-warden` (pre-commit):** verdict **safe** — branch/HEAD/file-set exactly as declared, `.env.local` confirmed gitignored, main checkout unaffected.
7. **`dashboard-ia-lint` re-run on the real diff (post-commit):** **WARN, zero blocks.** The prior audit's IA-marker recommendation confirmed resolved; the keyed-div wrapper confirmed to preserve the page's `key={activeClientId}` remount discipline; the real `AssetGapTab` read and confirmed non-conflicting (different row grain, no duplicated surface, same tone vocabulary). Four residual advisories, all non-blocking: (i) three pill labels inline in the component rather than exported from the module (style drift), (ii) the static snapshot's documented drift carry until Lane 3, (iii) the tab now hosts two adjacent primary questions — flagged for a PK glance only if a third accretes, (iv) a third verbatim copy of the local `Pill` helper (DRY, cosmetic).

## 6. Open issues

- **Pre-existing console error on the base branch** (`Uncaught SyntaxError: Invalid or unexpected token`, every page incl. ones without this panel). Possibly related to the same class as the `6f64854` NUL-byte fix. Out of scope here; worth a look whenever the cockpit branch is next touched.
- **Merge-time note (branch-warden advisory):** local `dashboard-operator-cockpit-v1` has one unpushed commit (`e52951a`, cockpit-only files, disjoint from this lane's file set) past the pinned base — a later merge into the local base branch will not be a plain fast-forward. Not a stop for this lane.
- **The snapshot is manually maintained by design.** New Blueprint artifacts in the CE repo do NOT auto-appear; the module header and on-screen banner both say so. Replaced (not extended) by a live read when Lane 3 lands.

## 7. Constraints confirmed

- No deploy, no PR, no merge to any shared branch — confirmed not done (branch push for evidence only, per the seed's explicit allowance).
- No approval/promotion/graduation affordance anywhere in the UI — confirmed (zero interactive elements; the panel and module headers restate the M13 four hard exclusions).
- No fabricated status — every rendered claim traces to a committed CE artifact path shown on the row; `real_template_registered` is kept independent of Capture state.
- No backend surface — no fetch, no RPC, no Supabase, no schema, no migration.
- Main dashboard checkout untouched (isolated worktree; branch-warden verified).

## 8. Next recommended step

The verification chain is complete (incl. the real-diff re-lint, §5 item 7). The branch waits for its PK gate alongside normal dashboard batching; when M13 Lane 3 lands, replace `lib/m13-build-pack-status.ts`'s static snapshot with the live registry read (the component's props contract was designed to survive that swap).
