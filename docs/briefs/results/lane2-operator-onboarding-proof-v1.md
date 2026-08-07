# Lane 2 — Operator & Onboarding Proof (read-only rehearsal, v1)

**Status:** read-only rehearsal, not the formal M9 replay. No code/DB/deploy changes made.
**Scope:** `invegent-dashboard` (operator UI) cross-referenced against `Invegent-content-engine/docs`.
**Ground truth used:** Vercel API (`list_deployments`, project `invegent-dashboard`) confirms the current
PRODUCTION deployment (`dpl_3EDMiRMqbfeXkibaX6cYbnziWcZm`, created 2026-08-06) is commit
`b3440ec24e6be7f40e877e503a2c381c2c3b45df` on branch `main` — identical to `origin/main` HEAD. All findings
below are read from that commit via `git show origin/main:<path>`, **not** from any local working-tree
checkout. This distinction mattered in practice: the locally checked-out branch
(`tmr-template-intake-ui-v0`, commit `b789dd8`) is materially behind — it is missing
`WeekFormatAllocation.tsx`, `WeekFormatPlanTab.tsx`, `BrandHostVoiceTab.tsx`, the Asset Gap tab, and the
Production Readiness Queue tab, all of which exist and are live on `main`. Early findings drawn from the
wrong checkout were discarded and re-verified — see Friction item F-10.

**Connection to M9:** `docs/briefs/m9-zero-code-day1-onboarding-package-v1.md` §5 names **Prerequisite P-1**
— a dashboard-visibility audit of exactly `WeekFormatAllocation.tsx`, `WeekFormatPlanTab.tsx`,
`CreativeConfigGapCard.tsx`, `PublishingPlanPyramid.tsx`, `production-readiness-queue.ts`,
`client-creative-config-audit.ts` — as a named blocking prerequisite before the formal M9 replay can run.
This document reads that same file set and records findings either way, so it is direct evidence toward
P-1 — but P-1 is PK's to formally clear, not self-clearing by this rehearsal.

---

## 1. Operator journey (against the 7 requested outcomes)

### Understand the active schedule — PARTIAL
No single view shows "this week, all clients." Three fragments exist:
- **Overview** (`/overview`, `actions/operator-briefing.ts:61-62`) — cross-client, but hard-capped to the
  next 24h (`scheduled_for BETWEEN NOW() AND NOW()+24h`, `LIMIT 20`).
- **Queue** (`/queue`, `queue/page.tsx:215-282`) — cross-client, no date cap, but a flat status table
  (Client/Platform/Post/Scheduled For/Status), mixing past and future, not a calendar.
- **Schedule tab** (`/clients?tab=schedule`, `ScheduleTab.tsx:232-337`) — a real day×time grid, but
  per-client only and shows the *recurring template* of enabled slots, not actual dated posts.
- **Weekly format plan** (`/clients?tab=format-plan`, `WeekFormatPlanTab.tsx:220-229`) — per-client,
  per-slot "Desired format + Capability to deliver it," explicitly separates "what format" from "when"
  (cadence lives on Schedule tab).

### Identify supported formats — GOOD (per client), WEAK (cross-client)
- `/clients?tab=creative-mix` → **Publishing Plan Pyramid** (`PublishingPlanPyramid.tsx:692-968`): a real
  format × platform matrix, `Active / Available / Off / Blocked` states, click-through cell drawer with
  plain-language blocked reasons ("Not supported on this platform," "Needs synthesis policy," etc. —
  `blockedReasonLabel`, lines 137-152) and suggested operator actions. This is a genuinely strong,
  honestly-labelled surface — "not evaluated" is shown instead of a fabricated "proven," per its own
  header comment (lines 20-26).
- `/clients?tab=format-plan` → **Weekly Format Plan** shows a "not publishable" count per client
  (`WeekFormatAllocation.tsx:77-90`).
- No cross-client rollup exists — an operator must open each client individually to build a mental map of
  which formats are live where.

### Identify missing assets — GOOD (per client, scattered), WEAK (no single readiness badge)
- `/clients?tab=asset-gap` → **Asset Gap tab** (`AssetGapTab.tsx:270`, live from
  `ice_ro.asset_gap_backlog`), cross-referenced against the same cell's Production Readiness row.
- `/clients?tab=production-readiness` → **Production Readiness Queue** carries a real
  `minimum_required_pool` field (`lib/production-readiness-queue.ts:181`) plus `capability_status`/
  `capability_reason` — i.e. floor-vs-actual asset-pool visibility genuinely exists in production, contrary
  to what the stale-branch read initially suggested.
- `/clients?tab=creative-mix` → **Creative Config-Gap Audit** shows format enablement, effective mix, and a
  named "Variant Config Gap" section that explicitly labels missing allowlist/target-%/binding as
  `MISSING_CONFIG` (`CreativeConfigGapCard.tsx:151-172`) rather than hiding the gap.
- Gap: these three panels answer "missing assets" from three different angles and never sum to one
  "is this client's asset pool sufficient" badge — an operator has to cross-reference tabs by hand.

### Understand why a cell is blocked — GOOD
The Publishing Plan Pyramid's cell drawer (`PublishingPlanPyramid.tsx:460-470`) puts blocked reasons in a
prominent red-boxed "Blocked because" list, followed by a blue "Operator actions" suggestion list — this is
the single best-answered outcome of the seven. `classify_format_capability`'s rollup vocabulary
(`asset_shortage`/`template_missing`/`pipeline_missing`/`governance_unproven`/
`unsupported_silent_degrade`/`publisher_path_missing`, per `docs/briefs/m9-zero-code-day1-onboarding-package-v1.md:192-195`)
is surfaced as plain operator language, not raw codes.

### Identify human approvals — PARTIAL (works, but fragmented and silent on consequences)
- `/inbox` and `/drafts` both render one-click "✓ Approve / ✕ Reject" (`draft-actions.tsx:31-48`) when
  `approval_status='needs_review'`. No confirmation dialog, no stated reason the draft needs review, and
  **no text anywhere warning that approving can trigger near-immediate publish** (YouTube auto-publishes
  within ~30 min of approval per `youtube-publisher-schedule-blind-autopublish` — this warning does not
  appear in the UI).
- A **third**, legacy approval surface still exists: `EpisodeRow.tsx:198-202` mounts an inline "Approve"
  button on Series episodes alongside the modern read-only pills — the documented D2/D3 debt in
  `operator-journey-ia-v1.md:594-597` is confirmed still live, not cleaned up.
- Creative-asset/template visual approval (the PK-visual-gate that governs what `image-harvester`/
  `image-reviewer` produce) has **no UI presence at all** — `/creative-library` is explicitly read-only
  ("No writes, no mutations... no proof assignment," `creative-library/page.tsx:5-10`). That approval
  happens entirely outside this dashboard, in the offline PK-visual-gate workflow this CLAUDE.md governs.

### Locate post-publication evidence — WEAK
`/performance` shows a formatted `published_at` date and, when no draft title exists, a fallback string
carved out of the raw `platform_post_id` — never a clickable link (`performance/page.tsx:213-239`, no
`<a href>` to an external platform post anywhere in the file). `/compliance` carries zero publish data.
`/monitor` is confirmed cross-client machinery telemetry only, not publish evidence. **An operator cannot
click through from this dashboard to the actual live post on Facebook/LinkedIn/YouTube/Instagram** — the
best available evidence is an internal status word plus a date.

### Determine inputs to introduce a client or new format — WEAK, correctly gated to SQL by design
Two genuinely different operations, confirmed distinct in the docs and in what UI exists:
- **New client** (`docs/09_client_onboarding.md`, 13 steps, ~4–6h): 8 of 13 steps are explicit
  `-- Run in Supabase SQL editor` blocks; the other 3 (Steps 2/5/9) are also manual/undocumented-in-UI.
  `/onboarding`'s `getClients()` only lists already-`status='active'` clients
  (`onboarding-scans.ts:44-51`) — there is **no "create new client" control anywhere** in the dashboard.
  `/connect` genuinely replaces Step 8 (OAuth-driven, no SQL).
- **Existing brand, new format-mix** (M9 spec, Layers A/B/C): Layer A (asset pool) is partially
  UI-visible (previous section); voice config (`/clients?tab=brand-host-voice`,
  `BrandHostVoiceTab.tsx`) is a genuine save-capable RPC-backed control — confirmed live on `main`. Layer B
  (`client_creative_governance`) is shown **read-only** in Creative Config-Gap Audit, no write path found.
  Layer C (`client_control_tower_enrollment`, the actual allocation-eligibility switch) has **zero
  dashboard references anywhere** — it is, by the M9 doc's own design, a hand-authored fail-closed
  migration (`docs/briefs/m9-zero-code-day1-onboarding-package-v1.md:127-129`), never a UI action.

---

## 2. Friction register

| # | Finding | Evidence |
|---|---|---|
| F-1 | No cross-client "this week" schedule view exists; the three closest surfaces each cover a different slice (24h cross-client / per-client template / per-client format+cadence) | `operator-briefing.ts:61-62`, `ScheduleTab.tsx:232-337`, `WeekFormatPlanTab.tsx:220-229` |
| F-2 | Nav label≠destination collisions (Pipeline→Queue, Flow→Monitor, Agents→Diagnostics) — documented as D4/D5 in the accepted IA spec, still unresolved (Wave A of §11 sequencing not executed) | `operator-journey-ia-v1.md:598-601` |
| F-3 | **New, previously undocumented label≠destination case:** `/compliance`'s own `<h1>` reads "Monitor," not "Compliance" | `app/(dashboard)/compliance/page.tsx:301` |
| F-4 | Three approval surfaces (Inbox, Drafts, legacy Series inline Approve) instead of one — confirmed still live, not just historically documented | `EpisodeRow.tsx:198-202`, `PlatformStatusPills.tsx:104,132-138` |
| F-5 | Approve/Reject is one click, no confirmation, no stated review reason, and no warning about downstream auto-publish timing (YouTube publishes within ~30 min of approval per prior register finding) | `draft-actions.tsx:31-48`; grep for "auto-publish"/"30 min" in dashboard finds no such copy |
| F-6 | No clickable link to a live published post anywhere in the dashboard — Performance shows a date + a bare platform-post-ID string | `performance/page.tsx:213-239` |
| F-7 | Asset-pool floor visibility exists but is split across three tabs (asset-gap, production-readiness, creative-mix) with no single per-client "ready" rollup badge | `AssetGapTab.tsx`, `lib/production-readiness-queue.ts:181`, `CreativeConfigGapCard.tsx:151-172` |
| F-8 | No "create new client" control anywhere in the UI — Step 1 of net-new onboarding is unavoidably raw SQL | `onboarding-scans.ts:44-51`; grepped repo for create_client/"Add Client", no hits |
| F-9 | The actual format-mix allocation-eligibility switch (`client_control_tower_enrollment`, M9 Layer C) has zero dashboard surface — by design, per the M9 spec, but worth naming as a hard boundary | `m9-zero-code-day1-onboarding-package-v1.md:127-129`; zero repo references |
| F-10 | **Deploy-truth risk:** the dashboard repo carries several long-lived diverged branches with overlapping filenames (`tmr-template-intake-ui-v0` b789dd8, `dashboard-wt-format-capability-indicator` 6f64854, `claude/cc-0088-production-readiness-queue`, others). Reading the wrong local checkout produces materially wrong conclusions about what's live — this rehearsal only resolved it by querying the Vercel API directly | Vercel `list_deployments`; `git merge-base --is-ancestor` showed `tmr-template-intake-ui-v0` and `main` are mutually non-ancestors |
| F-11 | "Campaign" content-taxonomy tier remains an open, unimplemented product decision (P-2) — an operator building a multi-post campaign has no such option | `operator-journey-ia-v1.md:717-725` |

---

## 3. Onboarding input checklist

**A. Net-new client** (`docs/09_client_onboarding.md`, ~4–6h, 13 steps) — mostly SQL:

| Input | Reachable via UI today? |
|---|---|
| `c.client` row (identity, slug, status) | **No — SQL only** |
| Brand profile (colours, logo, persona, system prompt) | Partial — `/onboarding` "Activate" writes this from a submission, but only for a row that already exists |
| Platform profile / content scope | **No — SQL only** |
| Feed sources | Partial — discovery keywords via `/clients` onboarding tab; real source weighting is SQL |
| Audience policy | **No — SQL only** |
| Publish profile / platform credentials | **Yes** — `/connect` (OAuth) |
| Auto-approver config (`client_ai_profile`) | **No — SQL only** |
| Digest/publishing policy | **Yes** — `/clients?tab=digest` |
| Final `status='active'` flip | **No — SQL only** |

**B. Existing brand, new format-mix** (M9 spec Layers A/B/C):

| Layer | Input | Reachable via UI today? |
|---|---|---|
| A | Asset pool depth vs floor (≥4 backgrounds/platform, 1 logo, colours) | View-only (Asset Gap / Production Readiness tabs); sourcing itself is the offline `image-harvester`/`image-reviewer`/PK-visual lane, never dashboard |
| A | Voice config (`elevenlabs_voice_id`, enabled) | **Yes, write-capable** — `/clients?tab=brand-host-voice` |
| A | Creative Library v2 registry rows (style guide, template family, patterns) | No — declarative docs/JSON, not dashboard-editable |
| A | Provider template registry rows / visual approval | View-only — `/clients?tab=creative-templates` |
| B | `client_creative_governance` row | View-only, no write path found |
| B | `client_format_config` row(s) | View-only in Creative Config-Gap Audit |
| C | `client_control_tower_enrollment` (the actual eligibility switch) | **No — hand-authored migration only, by design** |
| C | `client_format_mix_audit` append-only row | **No — part of the same migration** |

---

## 4. Current product-boundary statement

**The dashboard is a genuinely strong *read-only situational-awareness* tool and a *partial* content
production tool. It is not, and does not claim to be, a client/format-mix administration tool.**

An operator can today: create and track single-post/series content requests, approve or reject drafts,
watch a 24h cross-client publish window or a per-client weekly grid, connect/reconnect platform OAuth,
edit digest policy and voice config, and inspect — per client, across several distinct tabs — format
eligibility, blocked reasons, asset-pool gaps, and governance-row state, all with consistently honest
"not evaluated"/"not modelled"/"MISSING_CONFIG" labelling rather than fabricated status.

An operator cannot today: create a new client, flip the format-mix allocation-eligibility switch, write a
`client_creative_governance`/`client_format_config` row, click through to a live published post, or see one
cross-client "what's scheduled this week" view. These are not oversights hidden from the operator — the
Publishing Plan Pyramid and Creative Config-Gap Audit both explicitly and repeatedly label themselves
"Read-only... nothing here saves, edits, activates, or runs anything." The boundary is intentional and
stated in the UI's own copy; this rehearsal confirms that boundary is honestly drawn where it exists, and
names the places (F-6, F-7, F-9) where the *visibility* side of the boundary itself has gaps.

---

## 5. Demonstration script

1. **Schedule** — open `/overview` (24h cross-client feed) → `/clients?tab=schedule` for one client (day×
   time grid) → `/clients?tab=format-plan` (per-slot format + capability). State plainly: "these three
   views together approximate a schedule; none alone is the full picture."
2. **Formats** — `/clients?tab=creative-mix`, click a `Blocked` cell in the Publishing Plan Pyramid, show
   the red "Blocked because" panel and blue "Operator actions" panel.
3. **Missing assets** — `/clients?tab=asset-gap`, then `/clients?tab=production-readiness`, point out
   `minimum_required_pool` vs actual count.
4. **Approvals** — `/inbox`, show a `needs_review` card and the one-click Approve/Reject; name the missing
   consequence-warning as a live gap (F-5).
5. **Publish evidence** — `/performance`, show the `published_at` date and the non-clickable post-ID string;
   name the gap (F-6) rather than imply a link exists.
6. **New client vs new format-mix** — open `/onboarding` and `/connect` to show what's UI-driven, then read
   the first SQL block of `docs/09_client_onboarding.md` aloud to show what still isn't.

---

## 6. Readiness verdict by capability

| Capability | Verdict | One-line reason |
|---|---|---|
| Understand active schedule | **PARTIAL** | Three fragments, no unified cross-client week view (F-1) |
| Identify supported formats | **GOOD** (per-client) | Publishing Plan Pyramid is honest and well-labelled; no cross-client rollup |
| Identify missing assets | **PARTIAL** | Real floor-vs-actual data exists but scattered across 3 tabs (F-7) |
| Understand why a cell is blocked | **GOOD** | Best-answered outcome — plain-language reasons + suggested actions |
| Identify human approvals | **PARTIAL** | Works, but 3 surfaces (F-4) and no consequence warning (F-5) |
| Locate post-publication evidence | **WEAK** | No clickable link to the live post anywhere (F-6) |
| Introduce a client or new format-mix | **WEAK, by design** | Net-new client is correctly SQL-gated (13-step SOP); format-mix Layer C has zero UI surface intentionally |
| **Overall (non-developer operability)** | **PARTIAL** | Strong situational awareness once you know which of ~15 tabs to open; weak on cross-client rollups, publish proof, and (by design) administration writes |

**Not covered by this rehearsal, flagged for the formal M9 replay / P-1:** whether `client_creative_governance`'s
live-gate read path has landed since its 2026-07-07 dark/additive state, and the exact
`client_format_config` DDL — both named as open verification items in the M9 spec itself, not resolved
here.
