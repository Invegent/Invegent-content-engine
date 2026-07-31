# Dashboard Template Mix + Repetition Controls — Gate-1 Brief + Design Options v1

> **Status: PROPOSED — Gate-1 draft only. Nothing here is approved, built, applied, or
> authorised.** This document is the deliverable of an overnight scope-research lane that
> explicitly took **path (b)** ("scope is genuinely ambiguous → Gate-1 brief + design
> options") instead of path (a) ("implement a UI surface"). No app code, CE code, DB
> object, or migration was created or changed by this lane. Every PK gate named in
> `Invegent-content-engine/CLAUDE.md` stands unchanged above this document.
>
> **Date:** 2026-07-30 (overnight autonomous session)
> **Repo:** `invegent-dashboard` (branch at authoring: `claude/creatomate-global-progress-r0vbuf`,
> clean tree, no commits ahead of `origin/main`)
> **Baseline health (verified this lane):** `vitest run` 362/362 pass · `tsc --noEmit` clean ·
> `next build` clean.
> **Trigger:** prepare the portfolio controls that should be ready the moment the Property
> Pulse Announcement Card graduation (cc-0089 arc) closes.

---

## 1. Decision: path (b), and why

The task asked for "an operator surface to VIEW current template mix / selector policy
state and STAGE changes (mix weights, repetition controls)". After reading the governing
docs and the live schema, the honest finding is:

- **The "view selector policy state" half is well-defined and buildable** (the cc-0089
  policy table now exists live — §2.1, §2.5) — but it needs one new CE-side read RPC,
  which is a PK-gated CE migration, not a dashboard-only build.
- **The "stage changes: mix weights + repetition controls" half has NO governing
  mechanism to control.** There is no template-mix-weight knob and no template
  repetition/cooldown knob anywhere in the selector schema or its functions (§2.2, §2.3).
  A staging UI for those knobs would be inventing CE product architecture from the
  dashboard side — exactly what the ICE contract forbids a proposal lane to do.
- **PK explicitly bounded this area TODAY.** The cc-0089 handoff ruling (2026-07-30)
  lists **"no Dashboard portfolio-weights work yet"** among its boundaries
  (`Invegent-content-engine/docs/briefs/results/creatomate-announcement-card-pk-ruling-and-handoff-v1.md`
  §4 item "Boundaries"), and the cc-0089 migration's own OUT OF SCOPE list repeats
  "Dashboard portfolio-weights". An overnight implementation would have walked straight
  through a same-day PK boundary.
- **The prior art defers exactly this surface.** The Client Creative Mix Dashboard v0
  discovery brief (`Invegent-content-engine/docs/briefs/client-creative-mix-dashboard-v0-discovery-brief.md`
  §8) names "Slice 3 — Editable Control Tower" as **DEFERRED, separately gated**, and its
  §10 puts "Editing percentages · mutation controls" out of scope. The Creative Templates
  tab shipped 2026-07-29 as **read-only visibility**, with governed controls "explicitly a
  separate, later, governed outcome per PK's original brief"
  (`Invegent-content-engine/docs/briefs/results/creative-template-portfolio-dashboard-result-v1.md` §7).

So this lane produces the Gate-1 brief + three concrete design options below, ready for PK
to pick one the moment the graduation arc closes.

---

## 2. Ground truth — what the selector's policy knobs actually are

All claims below are cited to files in the paired CE repo
(`/home/user/Invegent-content-engine`, read-only this lane) or to live read-only
verification (allowlisted Supabase MCP reads, project `mbkmaxqhsohbtwsqolns`).

### 2.1 The ONE existing selector-policy knob: `c.creative_template_selector_policy`

Source: `supabase/migrations/20260730140000_cc_0089_selector_policy_and_asset_gap_decoupling_v1.sql`.

```
c.creative_template_selector_policy (
  policy_id   uuid PK,
  template_id uuid NOT NULL -> c.creative_provider_template(id),
  platform    text NOT NULL,
  priority    integer NOT NULL DEFAULT 0,
  reason      text NOT NULL,
  created_by  text NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (template_id, platform)
)
```

Semantics (load-bearing, per the PK Gate-1 ruling encoded in the migration header):

- It is a **within-rank-bucket tiebreak only**: `COALESCE(policy.priority,0) DESC` is
  inserted *before* `t.created_at ASC, t.id ASC, vc.variant_key ASC` in
  `public.select_template`'s candidate cursor. Priority can promote a template within its
  existing rank bucket; it can **never** move a template across bucket boundaries
  (variant-intent match / `fit_status` decide buckets independently).
- It is **NOT a weight, share, or probability.** `select_template` is fully deterministic —
  confirmed in the register: "select_template is fully deterministic (no rotation) —
  promotion swaps which single template wins 100% of renders, doesn't add diversity"
  (`Invegent-content-engine/docs/00_sync_state.md` v6.83).
- It is read **EXCLUSIVELY** by `public.select_template`. `derive_asset_appetite` /
  `analyze_asset_gap` must NEVER reference it — this decoupling is PK's architectural
  ruling (2026-07-30), not a style preference. Any dashboard surface must preserve and
  ideally *display* this separation, never blur it.
- Posture: service-role-only, RLS enabled deny-by-default; schema `c` is **not
  REST-exposed** (PGRST106 gotcha, `Invegent-content-engine/CLAUDE.md` "Standing ICE
  deploy/DB gotchas") — so any dashboard read requires a `public.*` SECURITY DEFINER RPC,
  which does not exist yet for this table.

### 2.2 "Template mix weights" — NO such mechanism exists

- There is no template-family weight/share table, column, or function parameter anywhere
  in `Invegent-content-engine/supabase/migrations` (searched: `portfolio.?weight`,
  `mix weight`, `template.?mix`). The only hits are the cc-0089 OUT-OF-SCOPE notes and the
  PK boundary itself.
- What DOES exist is the **format**-mix stack — a different altitude (format per slot, not
  template per render):
  - `t.platform_format_mix_default` (`default_share_pct`, live, populated) —
    `20260422074318_create_platform_format_mix_default_d145_seed`.
  - `c.client_format_mix_override` (`override_share_pct`, versioned; **live but 0 rows for
    all clients**) — `20260422084148_create_client_format_mix_override_and_demand_grid_router`;
    population state per the creative-mix discovery brief §5 ("model EXISTS, UNPOPULATED").
  - Enforcement at slot-materialise time (Hamilton allocation), gated by
    `m.format_mix_enrolled` → `c.client_control_tower_enrollment` (PP enrolled) —
    `20260628000000_format_mix_enforcement_phase1.sql`,
    `20260628120000_control_tower_p1_enrollment_format_mix.sql`.
- Conflating "template mix" with "format mix" in a UI would misrepresent the system. If PK
  wants true template-level mix/rotation, that is a **CE selector architecture decision**
  (deterministic winner → weighted/rotating winner), which no existing doc authorises.

### 2.3 "Repetition / cooldown windows" — NO template-level mechanism exists

Repetition-adjacent mechanisms that DO exist, none of which is a template-repetition knob:

| Mechanism | Altitude | Where | Operator-configurable? |
|---|---|---|---|
| Background rotation + recent-use exclusion | asset (background) | `resolve_slot_assets` v1.5 (`20260729225034_resolve_slot_assets_v1_5_rotation_governance`); seed passthrough documented in `select_template` ("seed = background rotation only") | No (governance in function) |
| Publish spacing | publish cadence | `c.client_publish_profile.min_gap_minutes` / `max_per_day` (creative-mix discovery brief §4) | Yes, via existing governed cadence path |
| Auto-approver cooldown | approval defence-in-depth | `COOLDOWN_HOURS` constant, `supabase/functions/auto-approver/index.ts` | No (EF constant) |
| Repetition *diagnostics* (read-only) | template | `repeats_single_template` / `variety_source` in `get_creative_template_portfolio_summary` (`20260729160000_creative_template_portfolio_read_rpc_v1.sql`) — already rendered by the dashboard Creative Templates tab | Read-only display |

A "repetition window" control for template selection therefore has **nothing to write
to**. Building the control before the mechanism is scope invention → NO_GOVERNING_RULE
(§6, D-2).

### 2.4 Dashboard house patterns (for whichever option PK picks)

- **Read path:** server action → `createServiceClient().rpc('get_…', { p_client_slug })`,
  never-throw, degrade-to-empty — `actions/creative-templates.ts` (which itself documents
  the discipline, mirroring `actions/voice-config.ts`).
- **Governed write precedent (the ONLY acceptable write shape):** `actions/voice-config.ts`
  → `save_voice_config` and `actions/publish-cadence.ts` → `save_publish_cadence` — CE-side
  SECURITY DEFINER write RPC + append-only change-log table
  (`c.client_voice_config_change_log`, `c.publish_cadence_change_log`), shipped via its own
  PK-gated CE lane. The dashboard never writes tables directly.
- **Placement precedent:** client-scoped tabs in `components/clients/*Tab.tsx`, wired
  through `app/(dashboard)/clients/page.tsx` with `?client=…&tab=…` URL addressing (global
  client picker Slice 3, `docs/dashboard/global-client-picker-v1-brief.md`).

### 2.5 Live state verified this lane (read-only, allowlisted MCP only)

- `mcp Supabase list_migrations`: newest ledger entry =
  `20260730093552 · cc_0089_selector_policy_and_asset_gap_decoupling_v1` → **cc-0089 IS
  APPLIED to production.**
- `mcp Supabase list_tables (schema c)`: `c.creative_template_selector_policy` exists,
  RLS enabled, **1 row** (consistent with the migration's single governed seed row:
  `generic_announcement_card_1x1_v1` × facebook, priority=100).
- **Drift found (CE-side, reported not fixed — this lane may not edit CE):** the CE repo's
  migration file header still reads "⛔ PREPARED — NOT APPLIED", and the register head
  (`docs/00_sync_state.md` v6.86) carries no cc-0089 apply entry. The live ledger + live
  table are ground truth: applied. The CE checkout in this environment is behind the apply
  session (also note the applied ledger version `20260730093552` differs from the repo
  filename timestamp `20260730140000`). Needs the normal CE register/docs reconcile.
- **Standing release gate still open:** `task_05bf8b3d` (publisher audit-write bug) —
  "announcement_card may not enter unattended automatic selection until it's proven fixed"
  (PK ruling, handoff result doc §4.1). Any controls surface must display, and must not
  route around, this gate.
- Supabase advisor note surfaced during `list_tables` (pre-existing, not created by this
  lane): 34 `c.*` tables report RLS disabled. House docs record this as deliberate for
  schema `c` (non-REST-exposed, service-role-only; e.g. the
  `c.client_control_tower_enrollment` table comment says "RLS intentionally OFF"), but the
  advisory is repeated here verbatim-in-substance for PK visibility rather than silently
  dropped.

---

## 3. Proposed Gate-1 brief (for PK to accept/amend at gate 1)

**Task name:** Dashboard Selector Policy Visibility (+ optionally Staging) v1
**Lane class / tier (proposed):** PRODUCT_PROOF · T2 for Options 1–2 (dark/additive DB +
read-only/staging dashboard) · T3 if any write touches an active selector input (Option 3).
**Client scope:** Property Pulse first (matches every prior TMR lane).

**Objective:** give the operator one governed surface answering:
1. "Which template will ICE select right now for (client, platform, format), and why?"
2. "What selector-policy rows exist, and what did each change?"
3. (If staging is approved) "What policy change is STAGED awaiting the governed apply
   path?" — with zero production authority in the dashboard itself.

**Forbidden actions (all options):** no direct table writes from the dashboard · no
selector/Asset-Gap coupling (never present Asset Gap output as derived from selector
policy) · no mix-weight or repetition control until the CE mechanism exists (D-1/D-2) ·
no approve/enable/promote language (PK gates only) · no bypass or soft-pedal of the
`task_05bf8b3d` release gate · no new nav section (IA spec Appendix B).

### Option 1 — Read-only Selector Policy panel (RECOMMENDED v0)

Extend the existing **Creative Templates tab** (`components/clients/CreativeTemplatesTab.tsx`)
with a "Selector policy" section:

- **CE prerequisite (own PK-gated T2 CE lane):** one new read RPC, e.g.
  `public.get_selector_policy_state(p_client_slug text)` returning: policy rows
  (template name, platform, priority, reason, created_by, created_at) + per
  (platform, format) the current `select_template` outcome (selected / alternatives /
  rejected reason codes / warnings). `select_template` is STABLE (read-only), so the RPC
  can compose it exactly as the portfolio RPCs compose their sources.
- **Dashboard build:** one server action in `actions/` (portfolio-RPC discipline), one
  panel component, no writes anywhere. Renders the release-gate banner while
  `task_05bf8b3d` is open.
- Pros: smallest honest step; pure visibility; consistent with every shipped precedent.
  Cons: no staging — but staging currently has nothing governed to stage *into* beyond
  priority rows (D-3).

### Option 2 — Read + governed STAGE (propose-only) surface

Option 1 plus a staging path modeled byte-for-byte on the cc-0086 shape:

- **CE prerequisite (PK-gated T2/T3 CE lane):** a staging table (e.g.
  `c.creative_template_selector_policy_proposal`, status `proposed` only) + SECURITY
  DEFINER write RPC + append-only change log. **`select_template` never reads the staging
  table** — promotion staged→active stays a PK-gated apply (migration/execute_sql lane),
  mirroring how TMR assignment `proposed` ≠ `approved` ≠ `proven` was handled in
  `template-selection-v0-lane-a-packet.md`.
- **Dashboard build:** form writes ONLY via the write RPC to the proposal table; UI labels
  every staged row "PROPOSED — requires governed apply (PK gate)".
- Pros: real "stage changes" semantics with structurally zero production authority.
  Cons: two CE objects + write RPC = bigger CE lane; only worth it if PK expects frequent
  policy-row changes (today there is exactly 1 row).

### Option 3 — Direct governed write path (NOT recommended now)

Write RPC upserting `c.creative_template_selector_policy` directly (with change log).
Rejected for now because: it makes a dashboard form an *active selector input* (T3), the
`task_05bf8b3d` release gate is still open, and PK's same-day boundary explicitly
deferred dashboard weight/control work. Recorded only so the option space is complete.

---

## 4. Manual `dashboard-ia-lint` pass (per operator-journey-ia-v1.md §10 checks)

`dashboard-ia-lint` remains an unproven candidate agent (CE CLAUDE.md), so this is the
manual equivalent, applied to the PROPOSED Option-1/2 surface (no code exists to lint):

| # | Check (IA §10) | Finding |
|---|---|---|
| 1 | Nav label ↔ destination parity | **PASS** — no new nav item; extends the existing Creative Templates tab under `/clients`. |
| 2 | No reserved-word collisions | **WARN** — the operator vocabulary already carries "Formats" (`/system/formats`), "Creative Library", and "Creative Templates". A surface named "Template Mix" would add a fourth templates-adjacent noun; recommend the section title "Selector policy" inside the existing tab, introducing no new nav noun. |
| 3 | Canonical status vocabulary only | **PASS-BY-DESIGN (condition)** — all statuses rendered must be DB-returned strings mapped through a lib label map (the `lib/format-capability.ts` seven-state precedent). Condition: no status string invented in a component. |
| 4 | Single approval surface | **PASS-BY-DESIGN (condition)** — Options 1–2 carry no approve action; staged rows use "PROPOSED", never approval language. |
| 5 | Waiting ≠ failure colour | **PASS-BY-DESIGN (condition)** — "no policy row" / "staged" are neutral states, not red; red reserved for fail-closed selector outcomes. |
| 6 | One object name | **WARN** — TMR spans family/template/variant; the surface must pick the operator noun ("template", matching the shipped tab) and keep variant keys as secondary detail. |
| 7 | URL-addressability | **PASS** — `/clients?client=…&tab=creative-templates` query-param addressing already exists (global client picker Slice 3). |
| 8 | One primary question per page | **WARN** — the Creative Templates tab already owns "what is the graduation state of my portfolio?"; adding "what will the selector pick and why?" approaches two primary questions in one tab. Acceptable for v0 as a clearly-secondary section; a dedicated sub-view is the escape hatch if it grows. |
| 9 | Preview/submit cardinality parity (INV-1) | **N/A** — no content-request preview/submit surface involved. |
| — | Placement of governed-config surfaces generally | **NO_GOVERNING_RULE** — the IA spec's route table predates and does not govern the client-tab config panels (Schedule, Brand Host Voice, Creative Templates, Production Readiness were all added after it). See D-4. |

---

## 5. Open PK decisions (named, not guessed)

- **D-1 — Template mix weights: NO_GOVERNING_RULE.** No weight/share mechanism exists in
  `select_template` (priority = within-bucket tiebreak; winner deterministic). PK decision
  needed: should ICE have weighted/rotating template selection at all? That is a CE
  selector-architecture decision that precedes ANY dashboard mix-weights UI. (Also gated by
  PK's own 2026-07-30 boundary "no Dashboard portfolio-weights work yet" — D-5.)
- **D-2 — Template repetition/cooldown: NO_GOVERNING_RULE.** No schema or function
  implements template-level repetition windows (only background rotation, publish spacing,
  and read-only repetition diagnostics exist — §2.3). PK decision needed: should a
  repetition mechanism exist, and at which altitude (selector vs slot materialiser)?
- **D-3 — Which option (1/2/3) and when.** Recommendation: Option 1 now-ish; Option 2 only
  if policy-row churn is expected; Option 3 not until `task_05bf8b3d` is closed and PK
  lifts the boundary.
- **D-4 — IA placement ruling.** Confirm the Creative Templates tab extension (vs a
  dedicated surface), and whether the IA spec should be amended to govern client-tab
  config panels generally (the §4 NO_GOVERNING_RULE).
- **D-5 — Explicit lift of the 2026-07-30 boundary.** Any build under D-3 needs PK to
  state the cc-0089 handoff boundary ("no Dashboard portfolio-weights work yet") is
  lifted/does-not-apply for the chosen option.
- **D-6 — CE-side drift reconcile (housekeeping).** cc-0089 migration file header + CE
  register say unapplied; live ledger + live table say applied (§2.5). Needs the normal CE
  docs-only register lane (this dashboard lane cannot and did not touch CE files).

---

## 6. Evidence index

Dashboard repo (`/home/user/invegent-dashboard`):
`docs/dashboard/operator-journey-ia-v1.md` (IA spec; §10 lint checks, Appendix B) ·
`docs/dashboard/global-client-picker-v1-brief.md` (shipped shell context + `?client=` sync) ·
`actions/creative-templates.ts`, `actions/voice-config.ts`, `actions/publish-cadence.ts`
(read/write discipline) · `components/clients/CreativeTemplatesTab.tsx` + `creative-templates/*`
(placement precedent) · `lib/format-capability.ts` (status label-map precedent).

CE repo (`/home/user/Invegent-content-engine`, read-only):
`supabase/migrations/20260730140000_cc_0089_selector_policy_and_asset_gap_decoupling_v1.sql`
(+ sibling ROLLBACK) · `docs/briefs/results/creatomate-announcement-card-pk-ruling-and-handoff-v1.md`
(PK ruling + boundaries + release gate) · `docs/00_sync_state.md` v6.80–v6.86 (arc history;
determinism note) · `docs/briefs/client-creative-mix-dashboard-v0-discovery-brief.md`
(format-mix source map; Control Tower deferral) ·
`docs/briefs/results/creative-template-portfolio-dashboard-result-v1.md` (read-only tab lane) ·
`docs/briefs/template-selection-v0-lane-a-packet.md` (proposed≠approved ladder precedent) ·
`supabase/migrations/20260628000000_format_mix_enforcement_phase1.sql`,
`20260628120000_control_tower_p1_enrollment_format_mix.sql`,
`20260729160000_creative_template_portfolio_read_rpc_v1.sql`,
`20260729225034_resolve_slot_assets_v1_5_rotation_governance` (mechanism map) ·
`supabase/functions/auto-approver/index.ts` (COOLDOWN_HOURS).

Live (read-only allowlisted MCP, project `mbkmaxqhsohbtwsqolns`): `list_migrations`
(cc-0089 applied, version `20260730093552`) · `list_tables` schema `c`
(`creative_template_selector_policy` present, RLS on, 1 row).
