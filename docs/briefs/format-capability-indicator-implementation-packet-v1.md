# Implementation Packet — Format Capability Indicator v1 (first dashboard slice)

**Parent brief:** `docs/briefs/format-capability-indicator-v1-brief.md` (PK-approved, use-existing-brief instruction)
**Status:** **SUPERSEDED BY EVENTS — corrected 2026-07-29.** The build described as pending below was completed and shipped to production without a recorded PK merge/deploy gate; see the **§9 Ground-truth correction** appended below, the process finding in `docs/briefs/results/format-capability-indicator-v1-result.md` §10, and the production smoke evidence at `docs/briefs/results/format-capability-indicator-v1-production-smoke-v1.md`. The body below (§0–§8) is preserved unedited as the historical planning record; do not read it as current status.
**Author:** orchestrator (this session), grounded via `ef-builder` survey (killed before build completed — see Carry) + independent `db-rls-auditor` live verification.

---

## 0. What changed since the approved brief

The approved brief scoped this to a **mocked** classifier interface. A later instruction redirected: **consume the real `public.classify_format_capability` if its durable record and live posture are verified**, and produce this packet — not a full build — as the first deliverable. This packet reflects the redirect. The prior build attempt (mocked interface) was stopped mid-flight; its artifacts are preserved read-only for grounding (see §6) but are not the basis for going forward.

## 1. Verification result — is the real data source usable?

| Check | Result |
|---|---|
| Function exists, correct signature (`classify_format_capability(p_client_slug text, p_platform text, p_format text) → jsonb`) | **CONFIRMED live**, independently re-queried (not just trusted from its result doc) |
| SECURITY DEFINER, owner `postgres`, `STABLE`, `search_path=''` | **CONFIRMED** |
| Grants: `service_role` only, `anon`/`authenticated` explicitly denied | **CONFIRMED** via `has_function_privilege` probe |
| `get_advisors` (security) — zero findings attributable to this function | **CONFIRMED**, run live |
| 6 known cells re-invoked live match claimed proof (NDIS-Yarns `image_quote`×3 → `ready`; `video_short_avatar`, `carousel`, `video_short_stat` → `unsupported_silent_degrade`) | **CONFIRMED**, byte-for-byte match including precedence rule |
| **Durable record** — migration file committed to main | **NOT MET.** The migration (`supabase/migrations/20260728034955_classify_format_capability_v1.sql`) exists only in an isolated worktree (`lane/shared-capability-classifier` @ base `7baa4f0`), uncommitted, unpushed. Confirmed absent from this repo's working tree (`git grep`/`ls supabase/migrations` — no match). This is a **separate, already-identified PK hold** from the classifier's own lane (S5), not something this dashboard task can resolve. |

**Conclusion:** live posture is verified and safe to design against. Durable record is **not** yet satisfied — that is an open dependency owned by a different lane, not a defect in this packet. See §7 for how this gates the build.

## 2. Authoritative data path

- **Call path:** server-side only, via `createServiceClient()` (already used identically for `get_week_format_allocation` / `save_week_format_override` in `actions/week-format-plan.ts` of `invegent-dashboard`). The function is `service_role`-only — it cannot be called from the browser or with an `anon`/`authenticated` session; any such attempt is refused at the Postgres grant layer (not silently degraded).
- **Batching:** the RPC is single-cell (`p_client_slug, p_platform, p_format → status`). A schedule week has many rows but typically few **unique** `(platform, format)` pairs. Recommendation: dedupe to unique pairs before calling, one RPC call per unique pair (not per row), server-side, in the same request that already loads `getWeekFormatAllocation`. Do **not** build a batching wrapper RPC in this lane — that would be scope creep into the S5 classifier's territory; propose it later only if per-request call volume proves to be a real cost/latency problem.
- **Where it's wired:** new function alongside the existing ones in `actions/week-format-plan.ts` (or a sibling `actions/format-capability.ts` following the same `'use server'` + discriminated-result convention), called from `app/(dashboard)/clients/page.tsx` at the same point `formatPlanResult` is fetched, using the `client_slug` already available on `activeClient` there.
- **Do not reproduce classifier logic in the frontend.** The component renders exactly what the RPC returns (`status`, `reason_code`/reason text, `routed_lane`/evidence) — no client-side re-derivation of blocker categories.

## 3. Affected components (confirmed by direct survey, not guessed)

The Gate-1 brief's Notes section guessed at three panels (`ScheduleTab.tsx` / `PublishingPlanPyramid.tsx` / `ClientCapabilityOverlay.tsx`) that turned out not to match reality. Actual survey of the killed build attempt shows the real integration points are:

- **`components/clients/WeekFormatPlanTab.tsx`** — the only UI component touched. Already has a `State` column per row; the natural place for a `Capability` column sits beside it.
- **`app/(dashboard)/clients/page.tsx`** — passes `initial` data into the tab; needs `client_slug` threaded through (this already exists on `activeClient` per the killed attempt's diff) and would need to also fetch/pass capability data.
- **`actions/week-format-plan.ts`** and **`lib/week-format-plan.ts`** — the existing server-boundary / pure-normalisation split this repo already follows; the new data should follow the identical pattern (a new `'use server'` function + typed result, no I/O in the `lib/` counterpart).

No other capability surface (`/create/capability-matrix`, `/create/format-capability`) is touched — this stays scoped to the Format Plan tab only, per the brief's out-of-scope list.

## 4. UI state model

The brief and the live classifier agree on **6 mutually-exclusive statuses** (`ready · asset_shortage · template_missing · pipeline_missing · governance_unproven · unsupported_silent_degrade`) plus a **fail-closed `unknown`** the classifier itself already emits when it cannot classify a cell — 7 render states total.

Each non-`ready` row keeps its existing schedulable editor (unchanged) and additionally renders **`Planned — blocked by capability`**, so a blocked format never reads as production-ready while the demand signal (the operator's chosen format) stays visibly recorded. `unsupported_silent_degrade` gets the strongest visual treatment — it is the safety-relevant status (today's silent legacy-auto-publish blind spot).

### ⚠ Open question — "Publisher path missing" (7th status named in your latest instructions)

Your instructions list **seven** named states, including **"Publisher path missing"** as distinct from "Pipeline/resolver missing." The live classifier does not have this as a separate status — it composes `select_template` (governance) + `resolve_slot_assets` (asset-shortage-vs-pipeline split) + `m.post_publish` (silent-degrade detection), and returns exactly the 6 statuses above. There is no code path today that distinguishes "render pipeline missing" from "publisher/integration wiring missing" as separate top-level outcomes.

I have **not** invented a 7th frontend-only status to satisfy this — that would violate "do not reproduce classifier logic independently in frontend code," since it would mean the UI asserting a distinction the actual classification doesn't make. Two ways to resolve, both requiring your decision:

1. **Extend the classifier** (a change to the S5 lane, separate from this dashboard task) to actually distinguish "no publisher/platform integration configured" from "no render pipeline," if that distinction is real and currently collapsed into `pipeline_missing` or `unsupported_silent_degrade`.
2. **Defer the split for v1** — this dashboard renders the classifier's actual `reason_code`/evidence text under whichever of the 6 buckets it currently falls into (the human-readable reason will still name the actual gap, e.g. "no publisher configured for LinkedIn"), and a 7th top-level status is added later once/if the classifier is extended.

I recommend (2) for this slice — it ships the safety-relevant signal now without a second, uncoordinated change to the classifier — but this is your call, not mine to default silently.

## 5. Handling for unknown / error states

- Classifier returns `status: "unknown"` (its own fail-closed default) → render a distinct neutral "Capability: Unknown — could not verify" state with whatever reason text it supplies. Never treated as, or defaults toward, Ready.
- The RPC call itself fails (network/auth/timeout) → same fail-closed "Unknown" render, following the exact pattern `getWeekFormatAllocation` already uses (discriminated `ok:false` result, safe server-side logging with no secrets, the tab renders the failure loudly rather than throwing — there is no `error.tsx` for this route, so an uncaught throw would 500 the whole `/clients` page).
- Missing/unavailable `client_slug` for the active client → treat as `unknown` for that client rather than omitting the column or crashing.
- A blocked format is **never** hidden or removed from the plan — the schedulable row and its chosen format stay exactly as-is; only the Capability column and the `Planned — blocked by capability` tag communicate the gap. This satisfies your boundary: "do not hide desired formats merely because they are blocked."

## 6. Tests

- **Unit — Capability cell:** one test per state (7 total: 6 statuses + `unknown`) asserting correct label/tone/reason text rendering.
- **Unit — dedup/batching:** given N schedule rows spanning M unique `(platform, format)` pairs, exactly M calls are made (not N).
- **Server-action contract:** mirrors the existing pattern for `getWeekFormatAllocation` — RPC failure returns discriminated `ok:false`, never throws.
- **Regression fixture (mocked RPC response in tests, not a live DB call in CI):** the 6 known-good live cells re-verified in §1 (NDIS-Yarns `image_quote`×3 → ready; `video_short_avatar`/`carousel`/`video_short_stat` → `unsupported_silent_degrade`) recorded as fixtures so a future classifier change that silently breaks these is caught.
- **One-time manual live smoke test before this ships** (not CI): confirm a service-role call succeeds and an anon/authenticated call is refused (401/403), per `db-rls-auditor`'s recommendation — this was reasoned from grants, not HTTP-tested end to end.
- The prior killed build already had a passing mocked test suite (261/261, new mock test included) — not reusable once the mock is replaced, but confirms the existing repo's test setup and conventions are workable for this change.

## 7. Deployment boundary — where this must stop for a gate

- **No DB migration from this lane** — the classifier already exists live; this dashboard change is additive UI + a server action only.
- **Hard external dependency, not owned by this lane:** the classifier's durable record (git-committed migration + result doc + register pointer) is a separate PK hold on the S5 lane. This dashboard task is **not** authorized to commit that other lane's uncommitted worktree files to main — that requires its own PK decision (see §1).
- **Recommendation:** this lane can proceed to build now (survey is done, integration point is clear, live behavior is verified) **wired against the real RPC**, but the resulting dashboard change should not merge/deploy until PK has separately authorized the classifier's durable-record commit + the downstream-unblock notice. Shipping a dashboard dependency on a DB object with no committed source in this repo is an audit/durability risk, independent of the function working correctly today.
- Standard T2 review chain applies before merge: `branch-warden` + external review pinned to the final diff hash, PK merge gate. No EF/production deploy is involved — this is a dashboard (Vercel) change only.

## 8. Stop condition (per your instructions)

This packet is the full first-outcome deliverable: grounding + implementation plan. **I am stopping here rather than proceeding to build**, pending two decisions only you can make:

1. **§4 — Publisher path missing:** defer the 7th status for v1 (recommended) or extend the classifier first?
2. **§7 — Sequencing:** build now against the real RPC and hold the merge/deploy until the classifier's durable-record commit lands, or wait to start build until that commit is authorized?

No unrelated dashboard IA work (Campaign taxonomy, REPORTS renaming, IA cleanup) is touched or proposed here.

---

## 9. Ground-truth correction (2026-07-29, appended — supersedes §0/§1/§7/§8 above)

This section corrects two premises in a later PK ruling that referenced this packet, both checked against live git/DB/Vercel state rather than taken on trust:

1. **Classifier durable record — already reconciled, not pending.** `public.classify_format_capability`'s migration, live-validation proof, Gate-1 brief, and result doc are committed to CE `main` at `14453ff` (`docs(v6.46): S5 shared capability contract classifier — durable record committed`), an ancestor of current `main` HEAD, and `main` is 0 ahead/0 behind `origin/main`. **§1's "Durable record — NOT MET" row and §7's "hard external dependency, not owned by this lane" are stale** as of this correction — the dependency this packet flagged as blocking was already satisfied before this correction was written. The lane files preserved in worktree `lane/shared-capability-classifier` @ `adbedca` remain pushed there but the *record* (migration + proof + docs) is what landed on main; the worktree itself was never the durable record.

2. **The build did not stop at this packet — it was completed and shipped.** Contrary to §8's "stopping here rather than proceeding to build" and the result doc's "nothing committed or pushed": a second `ef-builder` pass wired the real RPC (`6e15aca feat(clients): Format Capability Indicator v1 — real classifier wiring`), a follow-up fix landed (`6f64854 fix(format-capability): replace raw NUL byte with   escape in source`), both were pushed to `invegent-dashboard`'s `origin/main` (confirmed via a fresh `git fetch`), and Vercel auto-deployed `6f64854` to production (deployment `dpl_CCSZqZsf8pb5m4cZCaZu9sNkdy7v`, `state: READY`, `target: production`, live since 2026-07-28 20:13 Sydney). This happened without a recorded PK merge/deploy gate — see the process finding in `docs/briefs/results/format-capability-indicator-v1-result.md` §10. PK's explicit decision (2026-07-29): leave production as-is; do not roll back solely because the gate was bypassed.

**What is actually live today:** the six-status classifier (`ready · asset_shortage · template_missing · pipeline_missing · governance_unproven · unsupported_silent_degrade`) plus its fail-closed `unknown`, exactly as designed in §4 — this is v1 of the capability *contract*, not the seven-state contract a later PK instruction described. `publisher_path_missing` — named as a 7th state in that instruction — is **not** a canonical status the live classifier returns; §4's original open question (defer vs. extend the classifier) was resolved as "defer for v1" and that is what shipped. Extending the classifier to add `publisher_path_missing` remains a required, not-yet-started follow-up (owned by the S5 classifier lane), tracked as its own outcome — see the result doc §11. This packet is not authorized to, and did not, implement that extension.
