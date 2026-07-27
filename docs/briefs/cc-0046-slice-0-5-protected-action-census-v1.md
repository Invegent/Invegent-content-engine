# cc-0046 Slice 0.5 — Protected-Action Census & Role Map (v1)

**Created:** 2026-07-27 Sydney · **Refreshed:** 2026-07-27 (v1.1 — production re-baseline + PK rulings applied)
**Author:** orchestrator (Claude Code)
**Status:** DRAFT — read-only census; completes the §D map of the PK-approved brief
**Lane class / tier:** SAFETY_GATE · **T1** (read-only census; authorizes nothing)
**Feeds:** the enforcement lane's action→role mapping. Extends `cc-0046-slice-0-5-…-authorization-model-brief-v1.md` §D under PK's 2026-07-27 instruction to "widen §D via a read-only control census … complete the design map, not expand the first enforcement deployment."

> Enumerates **every** server-side mutation entry point in `invegent-dashboard` and proposes a role for each,
> so the design map is complete. **A complete map is not a large first deployment** — §4 proposes a tight v1
> enforcement scope separately. This authorizes no enforcement.

> ## 🔄 v1.1 refresh (2026-07-27) — production re-baseline + PK rulings
>
> **Baseline corrected.** The v1.0 census was cut against a **stale** dashboard (feature branch `b789dd8`
> compared to old `main 0856dcb`). Production `main` has since advanced to **`4f10248`** — **Dashboard Phase 1
> is LIVE**, including the weekly Format Plan tab (`79e063d`) and **per-client per-platform schedule-cap controls
> (`4f10248`, "Path A")**. The v1.0 claim that the weekly format override / schedule cap "is not on production"
> is **now false and is corrected below (Finding C-1).** Both new writers' RPCs verified live in the catalogue.
>
> **PK rulings applied (2026-07-27):**
> - **N-7 → SPLIT.** Submission approval = `governance_operator`; **user invitation = `administrator`** (the
>   `inviteUserByEmail` step is split out of `approveSubmission`).
> - **H-1 → `administrator`.** Client activation (`activateClient`) is roster growth = an authority act.
> - **D-Q2 → `administrator`** for shared/global asset promotion; client-scoped promotion may later be
>   `governance_operator` **once client scope is enforced (v2)**.
> - **K-1 → separate verified service-to-service enforcement shape** for OAuth callbacks, **not** an interactive
>   user-role check.
> - **Execution sinks → a fresh `exec_sql` + equivalent privileged-sink census is MANDATORY before enforcement
>   activates** (recorded as a hard enforcement-gate precondition).

---

## 1. Scope, method, and what was actually measured

- **Repo:** `invegent-dashboard`. **Production = `main` (`4f10248`)** — Dashboard Phase 1 live (refreshed 2026-07-27).
  The v1.0 body below was enumerated on `b789dd8`; the **two Phase-1 privileged writers now on `main`**
  (`saveScheduleCapOverride`, `saveWeekFormatOverride`) are added to §C, and the rest of the write surface is
  unchanged between `b789dd8` and `4f10248` except for the cc-0053/cc-0054 containment guards (additive) and the
  deletion of `app/api/onboarding/run-scans/route.ts` (a mutation entry **removed** — one fewer unguarded sink).
- **Live RPC cross-check (PK-requested):** the schedule/format writers exist in the live catalogue —
  `save_schedule_cap_override(p_client_id uuid, p_platform text, p_max_per_day int, p_max_per_week int)`,
  `save_week_format_override(p_client_id uuid, p_overrides jsonb)`, `save_publish_schedule(...)` — all `public`,
  SECURITY DEFINER (verified via `db-read.py` against `pg_proc`, 2026-07-27).
- **Method:** enumerate every `'use server'` export and every `app/api/**/route.ts` handler; classify each as
  MUTATION (writes DB state / triggers publish-enqueue, user-mint, email, EF-mutation, credential store, deletion)
  or READ-ONLY. Cross-repo DB-target confirmation for the substrate is a `db-rls-auditor` handoff (running).
- **Global context (unchanged):** middleware enforces session presence only — **no role check**; every mutation
  runs on the **service-role (RLS-bypassing) client**; **only 2 of ~56 mutations carry any in-handler identity
  check, and both check merely "any authenticated user," not a role.**

### 1.1 Tally
| Metric | Count |
|---|---|
| `'use server'` modules | 34 |
| Exported server actions | 66 |
| `app/api/**/route.ts` files | 40 |
| Route handlers | 51 |
| **MUTATION entries** | **~56** (25 server actions + 31 route handlers) |
| MUTATION entries with ANY in-handler identity check | **2** (`emitFriction`, `series/action` POST) |
| MUTATION entries with a **role** check | **0** |

---

## 2. The complete protected-action map

**Role vocabulary:** `V` = viewer (read only; never mutates) · `G` = governance_operator · `A` = administrator.
**`v1?`** = proposed for the FIRST (tight) enforcement deployment (§4). **`guard`** = in-handler check today.

### A. Population / authority expansion → **administrator** (non-negotiable, N-7)
| Control | Site | Mechanism → target | Role | v1? |
|---|---|---|---|---|
| **Invite/create client login user** (split out of `approveSubmission`) | `actions/onboarding.ts:88` (invite step, `:~116`) | **`auth.admin.inviteUserByEmail`** | **A** | ✅ |
| Approve/reject an intake submission (the governance half) | `actions/onboarding.ts:88` `approveSubmission` / `:132` `rejectSubmission` | `approve_onboarding` / status update → `c.onboarding_submission` | **G** | ✅ |
| (future) grant / revoke role | does not exist yet → `authz.grant_role`/`revoke_role` | new SECDEF fns | **A** | ✅ |

> **✅ N-7 RULED (PK 2026-07-27): SPLIT.** Submission approval = `governance_operator`; the
> **`inviteUserByEmail` step = `administrator`.** The enforcement lane must **separate the invite from
> `approveSubmission`** so approval and user-minting are gated independently — minting an authenticated user is
> an authority act and must not be a governance power.

### B. Draft approval → live publishing → **governance_operator**
| Control | Site | Mechanism → target | Role | v1? | guard |
|---|---|---|---|---|---|
| Approve draft → **enqueue to live social publish** / reject | `app/api/drafts/action/route.ts:4` POST | `draft_approve_and_enqueue` / `draft_set_status` → `m.post_draft`,`m.post_publish_queue` | **G** | ✅ | none |
| Approve series outline / set episode schedule / approve series draft → scheduled publish | `app/api/series/action/route.ts:15` POST | `approve_series_outline` / `set_episode_schedule` / `draft_approve_and_enqueue_scheduled` | **G** | ✅ | **session-only** |

### C. Publishing cadence / schedule / format — **governance_operator** (⚠ includes your headline example)
| Control | Site | Mechanism → target | Role | v1? |
|---|---|---|---|---|
| Set per-platform weekly publish slot grid (day/time/enabled) | `actions/schedule.ts:42` `savePublishSchedule` | `save_publish_schedule` → `c.client_publish_schedule` | **G** | ✅ |
| Toggle publish enable/disable · mode · auto-approve · R6 | `app/(dashboard)/actions/publish-profile-toggle.ts:9` `updatePublishProfileToggle` | `update_publish_profile_toggle` → `c.client_publish_profile` | **G** | ✅ |
| Edit a **global** content-format's buildable flag / advisor text | `app/api/system/formats/route.ts:4` PATCH | `update_content_format` → global format catalog | **A** (global, cross-client) | ✅ |
| **Set per-platform schedule cap** (max/day, max/week) ⟵ *your headline example* | `actions/schedule-caps.ts:91` `saveScheduleCapOverride` | `save_schedule_cap_override(client, platform, max_per_day, max_per_week)` → `c.client_publish_schedule` | **G** | ✅ |
| **Weekly format override per slot** | `actions/week-format-plan.ts:91` `saveWeekFormatOverride` | `save_week_format_override(client, overrides)` → `c.client_publish_schedule.format_override` | **G** | ✅ |

> **✅ Finding C-1 (v1.1 — CORRECTED) — your headline controls ARE live on production.** As of `main 4f10248`
> (Dashboard Phase 1), the per-platform schedule cap (`save_schedule_cap_override`) **and** the weekly format
> override (`save_week_format_override`) are live, governed writers — RPCs confirmed in the catalogue. Both are
> `'use server'` on the service-role client with **no in-handler role check**, so both are today at
> authenticated-equivalent and are **governance_operator** in the map. **These are in the v1 enforcement set.**
> *(The v1.0 "not on main" claim was against the stale `0856dcb` baseline; corrected here. The read-only
> `max_per_day`/`paused_until` surfaces in `publishing-plan-pyramid.ts`/`ice-health.ts` remain reads; the cap is
> now *written* via `save_schedule_cap_override`, and pause/resume is still only the `publish_enabled` toggle.)*

### D. Creative-governance ops (the brief's original Slice-1 four) — **NONE exist as dashboard writers**
| Intended control | Dashboard writer? | Role (when built) |
|---|---|---|
| Enable/disable `client_creative_governance` | ❌ read-only (`get_client_creative_governance`) | G |
| Set `client_asset_pool_policy` | ❌ none | G |
| Promote/fence **shared/global** asset (`shared_creative_asset`) | ❌ none | **A** — RULED (D-Q2) |
| Promote/fence **client-scoped** asset (`client_brand_asset`) | ❌ none | **A** in v1; may become **G** once client scope is enforced (D-Q2, v2) |
| Template assignment + proof | ❌ only proof half (`record_tmr_proof_event`, CE-side) | G |

> **⚠ Finding D-1 — confirms brief N-8/D.5 from the dashboard side:** the four governance ops have **no governed
> write RPC reachable from the dashboard**; all creative surfaces are read-only. **Slice 0.5 gating them is moot
> until the CE-side governed-write lane (D-Q4) exists.** Mapped for completeness; **not v1-enforceable.**

### E. Content authoring & creative intent → **governance_operator**
| Control | Site | Mechanism | Role | v1? |
|---|---|---|---|---|
| Submit governed manual slot | `app/api/post-studio/save/route.ts:10` POST | `create_manual_slot` → `m.slot` | G | ✅ |
| Submit creative intent → fan out slots | `app/api/post-studio/intent/route.ts:10` POST | `create_creative_intent` → `m.creative_intent`,`m.slot` | G | ✅ |
| Create content series | `app/api/series/save/route.ts:50` POST | `create_content_series` (Branch B → 409) | G | ✅ |
| Generate+persist series outline / episode drafts | `app/api/series/outline/route.ts`, `.../write/route.ts` POST | EF `series-outline` / `series-writer` | G | ✅ |

### F. Brand avatars / host designation → **governance_operator**
| Control | Site | Mechanism | Role | v1? |
|---|---|---|---|---|
| **Designate/assign brand avatar (host identity)** | `app/(dashboard)/actions/avatars.ts:46` `assignAvatar` | `assign_brand_avatar` | G | ✅ |
| Clear avatar · toggle stakeholder active · kick poller | `avatars.ts:63,74,87` | `clear_brand_avatar` / `toggle_brand_stakeholder_active` / invoke `heygen-worker` | G | ✅ |

### G. Client profile / voice / prompts config → **governance_operator**
| Control | Site | Mechanism → target | Role | v1? |
|---|---|---|---|---|
| Edit brand identity/model config | `app/api/client-profile/brand/[clientId]/route.ts:21` PATCH | direct `.update` → `c.client_brand_profile` | G | ✅ |
| Edit per-platform profile | `app/api/client-profile/platform/[clientId]/route.ts:20` PATCH | direct `.update` → `c.client_platform_profile` | G | ✅ |
| Create/edit content prompt · upsert voice prompt | `client-profile/prompts/[clientId]/route.ts:19,62`; `app/(dashboard)/actions/voice.ts:18` | insert/update / `upsert_content_type_prompt` → `c.content_type_prompt` | G | ✅ |

### H. Client activation / enrolment
| Control | Site | Mechanism | Role | v1? |
|---|---|---|---|---|
| **Activate/enrol a client from a submission** | `app/(dashboard)/actions/onboarding-scans.ts:53` `activateClient` | `activate_client_from_submission` | **A** — RULED (H-1) | ✅ |
| Run brand scan / AI-profile bootstrap on a submission | `onboarding-scans.ts:8,26` (`app/api/onboarding/run-scans/route.ts` **DELETED** by Phase 1 / cc-0053) | EF `brand-scanner`/`ai-profile-bootstrap` | G | — |
| Request more info / reject / mark ready | `actions/onboarding.ts:57,132,152` | RPC / `exec_sql` UPDATE → `c.onboarding_submission` | G | ✅ |

> **✅ H-1 RULED (PK 2026-07-27): `administrator`.** `activateClient` expands the client roster — an authority act.

### I. Feeds & discovery → **governance_operator**
`create_feed_source` (`feeds/create`), `feed_assign_client`/`feed_unassign_from_client` (`feeds/assign|unassign`),
`feed_deactivate`, `review_feed_suggestion` (`feeds/suggestions/review`), `add_client_discovery_seeds`
(`discovery-keywords.ts:43`), YouTube channel subscribe + force-ingest (`video-analyser.ts` ×2 modules),
`analyseYouTubeVideo`. **All → G.** v1: defer (lower blast radius) unless PK includes.

### J. Compliance rules → **governance_operator**
`mark_compliance_review` / trigger AI review (`compliance/route.ts:32`), `toggle_compliance_rule_active` /
`upsert_compliance_rule` (`compliance/rules/route.ts:25,53`). **→ G.**

### K. Social OAuth credential storage → **special class (flag K-1)**
Facebook/YouTube/LinkedIn callbacks + FB select-page store tokens (`store_*_token`) — `app/api/{facebook,youtube,linkedin}/callback/route.ts`, `facebook/select-page/route.ts`.
**✅ K-1 RULED (PK 2026-07-27): a separate verified service-to-service enforcement shape — NOT an interactive
user-role check.** These are OAuth-redirect callbacks (provider redirect carrying `state`/cookie), not in-session
button POSTs, so a `requireRole()` gate does not fit. They are **out of the role-register's interactive scope**;
their integrity is enforced by verified service-to-service means (e.g. `state`/PKCE binding + a verified
service/worker credential), owned by a separate enforcement track. **Do NOT wrap them with `requireRole()`.**

### L. Diagnostics / digest / friction / subscriptions → **governance_operator**
AI diagnostic (`diagnostics/route.ts:40`), pipeline diagnostician (`diagnostics/run`), reviewer digest
(`run-digest`), `triageCase` (`triage-case.ts:100` — comment claims route protection, **no in-handler check**),
`upsertDigestPolicy` (`digest-policy.ts:25`), `add_subscription`/`update_subscription`/`review_subscription_candidate`.
**→ G.** `emitFriction` already self-guards (session + env flag). v1: defer most; include `upsertDigestPolicy`
(privileged client-config write, cc-0055).

### M. Auth session — n/a
`login`/`logout` (`actions/auth.ts`) — these *are* authentication; not role-gated.

---

## 3. Findings that shape the design

- **F-CENSUS-1 — the surface is ~56, not "4 + adjacent."** The brief's §D (4 Slice-1 ops + a few adjacents) is a
  small slice of the real privileged surface. A role model that gates only §D leaves ~50 mutations at
  authenticated-equivalent. **The complete map is the deliverable; v1 enforcement is a subset (§4).**
- **F-CENSUS-2 — 0 of 56 has a role check; 2 have any identity check.** Confirms "auth but zero authz" at the
  action granularity, not just the route granularity.
- **F-CENSUS-3 (v1.1 CORRECTED) — your headline controls ARE live on production `4f10248`** (C-1): the schedule
  cap (`save_schedule_cap_override`) and weekly format override (`save_week_format_override`) are governed writers,
  today at authenticated-equivalent, mapped **G** and **in the v1 set**. (The prior "no production writer" was a
  stale-baseline error.)
- **F-CENSUS-4 — the four creative-governance ops have no dashboard writer** (D-1) — Slice-0.5 gating is moot until
  the CE governed-write lane exists (D-Q4).
- **F-CENSUS-5 — OAuth credential callbacks are a distinct enforcement class** (K-1 RULED: service-to-service, not
  `requireRole()`).
- **F-CENSUS-6 — `approveSubmission` conflates approve (G) with invite (A)** — **N-7 RULED: SPLIT** (approval G,
  invite A); the enforcement lane must separate the invite step.

## 4. Proposed v1 enforcement scope (tight — a complete map is not a big deployment)

Enforce role on the **highest-blast-radius, live-on-main** controls first; everything else stays mapped-but-later.

**v1 set (administrator):** the **invite step** split out of `approveSubmission` (N-7) · future role grant/revoke ·
global format edit (`update_content_format`) · `activateClient` (H-1 RULED A).
**v1 set (governance_operator):** submission approve/reject (`approveSubmission` approval half / `rejectSubmission`) ·
draft approve/reject (`drafts/action`) · series approve/publish (`series/action`) · `savePublishSchedule` ·
**`saveScheduleCapOverride` (schedule cap)** · **`saveWeekFormatOverride` (format override)** ·
`updatePublishProfileToggle` · avatar `assignAvatar`/`clearAvatar` · client-profile brand/platform/prompt/voice
edits · `upsertDigestPolicy` · post-studio slot/intent.
**Deferred (mapped, later slice):** feeds/discovery (I) · compliance rules (J) · diagnostics/digest (L) ·
creative-governance (D, blocked on the CE write lane, D-Q4).
**Out of the interactive role scope (separate track):** OAuth credential callbacks (K, K-1 RULED
service-to-service).

## 5. Rulings & remaining handoffs
**Ruled by PK 2026-07-27 (applied above):** N-7 = SPLIT (approval G / invite A) · H-1 = `administrator` ·
D-Q2 = `administrator` for shared/global promotion (client-scoped may become G once client scope is enforced) ·
K-1 = separate verified service-to-service shape (not `requireRole()`).

**Hard enforcement-gate precondition (PK-mandated):** a **fresh `exec_sql` + equivalent privileged-sink census**
MUST run and be reconciled **before enforcement is activated** — the role model is only as strong as the
containment of every path that reaches `postgres`/`service_role`. This is a precondition of *enforcement enable*,
**not** of the inert substrate apply.

**Still open (not blocking):** D-1 / D-Q4 — the four creative-governance writers do not exist on the dashboard;
their role rows activate when the CE governed-write lane is built. Not this lane's to build.

**Zero mutation. Read-only census. Authorizes no enforcement.**
