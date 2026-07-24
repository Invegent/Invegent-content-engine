# Brief — Dashboard Redesign Gap Analysis (Stage 1, provisional)

**Created:** 2026-07-24 Sydney
**Lane:** **S6 · Dashboard Gap Analysis** (registered on the board by orchestrator directive,
2026-07-24, under PK ruling). Board: S1 Dashboard Authz (building) · S2 parked watch · S3 AGP
Identity · S4 recording · S5 Asset-Gap Drain · **S6 (this lane)**.
**Author:** S6 worker session.
**Status:** **DRAFT — Stage 1 complete, provisional. Awaiting PK Gate 1.**
**Canonical ID:** **NOT SELF-ALLOCATED.** ID allocation is a central/PK act. This document claims no
`cc-` number and no register version.
**Lane classification (CCF-02):** SIDE_PROVING · **Tier T1** (read-only design analysis; docs only).
**Result file:** to be created on completion of Stage 2.

> ## ⛔ S6 IS ANALYSIS-ONLY — standing boundary
>
> 1. **No dashboard code edit.** No file change in `C:\Users\parve\invegent-dashboard`. Authored
>    analysis documents only. **S1 holds write precedence over that repository.**
> 2. **No sequencing recommendation that places redesign before containment.** If analysis were to
>    conclude containment-first is wrong, that is a **finding surfaced to PK**, never a decision
>    taken here. *(It does not so conclude — see §8.0.)*
> 3. **No flow frozen on the current unvalidated `client` parameter.** The present `?client=` shape
>    is treated throughout as **provisional and about to change**.
>
> **Mandatory marking:** every affected page below is explicitly marked **`DEP:cc-0054`**.
>
> **Standing context honoured:** the dashboard has authentication but **ZERO authorization**; every
> authenticated account is operator-equivalent. Slice 0.5 is Gate-1 approved **for design only, not
> implemented**, and enforcement cannot be enabled until all seven caller-controllable `exec_sql`
> paths are contained. **This analysis designs no permission model and assumes no role-gated surface
> is available.**
>
> The registers' standing **"DO NOT START (unprompted): broad dashboard IA overhaul"** is cleared as
> to the *unprompted* condition by PK creating this lane. Scope remains **analysis and proposal,
> never adoption.**

---

## 0. Lane charter — what this lane is and is not

**Purpose.** Compare the Claude Design project `ICE Operator Dashboard.dc.html`
(project `3d048ee9-cebd-4bf1-a61b-4ffbbd2ba5f5`) against (1) the current `invegent-dashboard`
repository, (2) live operator journeys and capabilities, and (3) ICE Content Engine capabilities
expected to surface in the dashboard later.

**Authority rule (PK-set).** The existing Claude Design is authority for **desired operator flow and
visual intent only**. It is **not** authority for backend models, tables, statuses, or capabilities.
Where the design asserts a backend fact, this lane treats it as a design assumption to be checked,
never as a source of truth.

**Hard boundaries — observed in full for Stage 1:**

- Read-only investigation. No dashboard code change. No DB or CE change.
- No migration, edge function, worker, publisher, render or deployment change.
- No commit, no push, no production mutation.
- **No authorization or data-model decision made on behalf of another lane.**

**Concurrency.** Runs alongside S1 (Dashboard Authz), S3 (AGP Identity) and S5 (Asset-Gap Drain).
This lane is **not an implementation owner** and must not block or alter those lanes. It writes no
file in `invegent-dashboard` (owned solely by S1) and cuts no register entry.

**Actions taken in Stage 1:** read the design project via `DesignSync` read methods; read both repos
via `Read`/`Grep`/`Glob`; four read-only `ice_ro` view queries via `scripts/db-read.py`. Nothing else.

### 0.0 STALE-REF GATE + REBASE — 2026-07-24 third wake (supersedes, does not rewrite)

**Gate applied to `invegent-dashboard` before any analysis, per the new standing rule.**

```
git fetch --prune origin
fetched upstream origin/main = 6fe8d1e198d8afaff22483c36072f07a8be5d4eb   (2026-07-22T23:54:41Z)
local shared checkout HEAD    = fda2b51212eba110e6cc68de6c528dd00af41bea
divergence (HEAD...origin/main) = 0 ahead / 3 BEHIND     → GATE TRIPPED
```

**The gate caught a real staleness.** Wakes 1–2 of this lane analysed `fda2b51` — **three commits
behind**. All findings are re-based on **`6fe8d1e`**, read via `git show origin/main:<path>`.
**The shared checkout was NOT pulled, checked out, or otherwise mutated** — S1 owns that repo.

**What the three missing commits changed, and what it invalidates here:**

| Commit | Change | Effect on this analysis |
|---|---|---|
| `f0ab742` | cc-0046 Slice 0 — adds `/create/capability-matrix`, edits `sidebar.tsx` + `layout.tsx` | **Route count corrected: 32 → 33 operator routes.** The new route is **flag-gated in the nav** (conditional spread in `sidebar.tsx:74`) — present as a file, **dark** as a surface. Design coverage is now **8 of 33**. |
| `1572fbd` | Containment Batch 1 | already reflected |
| `6fe8d1e` | **Containment Batch 2** — **deletes** `app/api/onboarding/run-scans/route.ts`, validates `onboarding-scans.ts` | **§0.2's containment state was wrong.** Corrected below. |

**Re-verified at `6fe8d1e` (read-only):**

- `app/api/onboarding/run-scans/route.ts` → **DELETED**; `actions/onboarding-scans.ts` → present + validated.
  **cc-0053's two paths are CONTAINED IN PRODUCTION. 2 of 7 done; 5 remain.**
- All **five** cc-0054 sites still **PRESENT and unguarded** — including the GET-reachable
  `client-profile/page.tsx` and `pipeline-stats.ts` (the latter reached via `monitor/page.tsx`).
- **No `error.tsx`, `global-error.tsx` or `not-found.tsx` anywhere at `6fe8d1e`** — §0.5 stands
  unchanged and is confirmed against the correct base.

### 0.6 🔴 FORMAT AUTHORITY IS UNRESOLVED — binding design constraint (`cc-0079`)

`m.slot.format_chosen` is **read by nothing except telemetry**. Every renderer and publisher keys off
`post_draft.recommended_format` — the Advisor's pick. **The schedule does not own the format.**

> **Binding on the design round: no proposed operator surface may present the schedule's format as
> authoritative.** Any surface showing a slot's format must show it as *demand/allocation*, visibly
> distinct from the Advisor's *decision* and from the *final* format that rendered. Collapsing them
> into one "format" field would encode a false authority into the UI — and this lane's evidence
> (§0.9) shows the two disagree on a large fraction of production rows.

Authority itself is `cc-0079`'s to resolve. **This lane designs the display of the disagreement, never
the resolution of it.**

### 0.7 Two scheduling modes must both be expressible

The target system supports **both**, and no proposed surface may assume one:

| Mode | Who owns the format | Design implication |
|---|---|---|
| **Fixed-format slot** | the schedule (e.g. FB Mon 09:00 static · 10:00 text · 17:00 reel) | the Advisor **may not silently change it** — a surface must be able to show *"the Advisor overrode a fixed slot"* as an exception, not as normal operation |
| **Policy-driven slot** | the weekly mix, allocated against rolling percentage targets | the same divergence is *expected*; the surface must show attainment against target, not an exception |

**The same visual cannot serve both.** A divergence that is a violation in fixed mode is routine in
policy mode. Every proposed slot/format surface must therefore carry the slot's **mode** as a
first-class attribute, or it will mislabel one of the two.

### 0.8 The missing surface — a per-slot authority ledger **LIVE-UNSURFACED**

Requirement (PK): surface **per slot** — scheduled demand · allocated format · Advisor recommendation ·
final format · publication outcome.

**Finding: this is fully derivable read-only from the existing curated `ice_ro` views today, with no
new backend.** Verified by construction:

- `ice_ro.slot_status` → `platform` · `scheduled_publish_at` · `format_preference` (demand) ·
  `format_chosen` (allocation) · `status` · `filled_draft_id`
- `ice_ro.draft_status` → joins on `slot_id` → `recommended_format` (Advisor/final) ·
  `approval_status` · `image_status` / `video_status`

So the highest-value missing operator surface in the entire analysis is **buildable from the
zero-prompt read path**, and needs **no** new table, RPC or worker change.

**Two constraints on it, both non-negotiable:**

1. **Read-only.** There is **no operator write path to schedule or format anywhere in the dashboard** —
   every change today is a hand-run SQL statement, and `/clients` Pyramid is *deliberately* read-only.
   **This lane proposes no write path.** Introducing one is a separate governed lane with its own gate.
2. **`DEP:cc-0054` — CONVEYANCE.** The surface is client-scoped and inherits whatever client-scoping
   contract cc-0054 establishes. It touches no cc-0054 target file.

### 0.9 Evidence — two distinct failure classes, and why one visual cannot show both

Read-only, `ice_ro.slot_status ⋈ ice_ro.draft_status`, 30-day slot window:

| Platform | Aligned drafts | published | Diverged drafts | published |
|---|---|---|---|---|
| facebook | 72 | **90.3%** | 30 | **40.0%** |
| instagram | 63 | **92.1%** | 31 | **29.0%** |
| linkedin | 6 | **0%** | 99 | **0%** |
| youtube | 28 | **0%** | 20 | **0%** |

*(“Diverged” = `slot.format_chosen IS DISTINCT FROM draft.recommended_format`.)*

**Class A — silent degradation (FB/IG).** Divergence roughly halves the publish rate: 90→40 on
Facebook, 92→29 on Instagram. Nothing errors. Nothing turns red. **This is exactly the class that a
green health tile would hide.**

**Class B — dead platform (LinkedIn, YouTube).** **153 drafts, 0 published**, and *alignment makes no
difference* — LinkedIn's 6 aligned rows publish 0%, YouTube's 28 aligned rows publish 0%. Divergence
is not the cause here.

**The design consequence is sharp, and it corrects a naïve reading of the directive.** The
platform-invalid Advisor picks are real — `text` on YouTube ×4, confirmed — **but they are 4 of 48
YouTube drafts.** A surface that flags only platform-invalid recommendations would catch those four
and **declare the other 44 healthy, while zero of them published.**

> **Requirement: any health or status surface proposed by this lane must carry BOTH axes —
> format-authority divergence AND absolute publish outcome — because each one is blind to the other's
> failure class.** A single composite "health" indicator cannot express this and must not be proposed.

### 0.10 Zero-publish visibility — "how would an operator have SEEN this before 30 days of silence?"

**Framing (PK):** the pipeline root-cause of the 153-draft LinkedIn+YouTube zero-publish is **S7's
(`cc-0079`), not this lane's.** This lane designs only the *visibility* that would have surfaced it on
day 1 instead of day 30. Read-only; **no fix, no write path.**

**Stale-ref gate re-run (§0.0 rule): dashboard `origin/main` = `6fe8d1e`, unchanged since the prior
wake; the §0.0 rebase remains current.** Read via `git show origin/main:<path>`; shared checkout not
pulled.

#### 0.10a The stage funnel — the surface's spine (read-only, no backend change)

Per-platform, 30-day slot window, `ice_ro.slot_status ⋈ ice_ro.draft_status`:

| Platform | demand | draft | approved | rendered | published | **stalls at** |
|---|---|---|---|---|---|---|
| facebook | 138 | 102 | 83 | 75 | **77** | — flows |
| instagram | 135 | 94 | 81 | 72 | **67** | — flows |
| linkedin | 156 | 105 | 68 | **7** | **0** | 🔴 **RENDER** (68 approved → 7 rendered) |
| youtube | 65 | 48 | 45 | **0** | **0** | 🔴 **RENDER** (45 approved → 0 rendered) |

**The dead-platform class has a *visible location*, not just a red dot.** Both stalled platforms clear
demand, draft and approval, then collapse at render — LinkedIn renders 10% of approved, YouTube 0%.
An operator watching an **approved→rendered** ratio per platform would have seen this **on the first
day approvals stopped converting**, without any pipeline diagnosis.

> **Requirement V-1 — the health surface's spine is a per-platform STAGE FUNNEL, not a status dot.**
> Stages: **demand · draft created · approved · rendered · queued/due · transported · platform-accepted ·
> reconciled.** Each platform renders *where its count collapses*. This lane defines the funnel
> skeleton and populates the first five stages from `ice_ro` today; **S7 will return which stage owns
> each platform's defect, and the surface must have a slot to render that verdict per platform** — not
> overwrite the funnel with a single colour.

#### 0.10b The reconciliation class is real — internal status is not trustworthy alone

`ice_ro.publish_status` (the queue/transport view) and `ice_ro.draft_status` (the internal draft view)
**disagree** on published counts in the same window — e.g. Instagram shows 67 published drafts but
**zero** `published` queue rows in the window; LinkedIn shows 1 published queue row against 0 published
drafts. **This lane does not diagnose the discrepancy** (S7 is quantifying externally-published-yet-
unreconciled rows) — but it **confirms the class exists**, which is sufficient to make it a design
requirement.

> **Requirement V-2 — no surface may trust internal draft status as ground truth for "published".** A
> publication-outcome cell must be able to render **three** states, not two: *published-and-reconciled*
> · *internal-only (queue/platform has not confirmed)* · *external-published-but-unreconciled* (the
> platform says live, ICE does not agree). A green "published" that reads only `draft.approval_status`
> is a **false green** exactly where reconciliation has drifted. The view carries the signals for this
> (`publish_status.status`, `acknowledged_at`, `publish_origin`, `last_error_code`); the surface must
> expose them, not collapse them.

#### 0.10c Why this cannot be a composite indicator — restated with the new evidence

§0.9 established two failure axes. The funnel makes the reason concrete:

- **Facebook diverged rows publish at 40%** — a *silent-degradation* signal that lives at the
  **format-authority** axis (§0.6) and shows up as a *reduced* conversion, never a stall.
- **LinkedIn/YouTube publish at 0%** — a *dead-platform* signal that lives at the **stage-funnel**
  axis and shows up as a *collapse* at a specific stage, independent of format alignment.

A single "health" number would have to average a 40%-degraded platform and a 0%-dead platform into
one figure that describes neither. **Requirement V-3 — the surface carries three independent readouts
per platform: (1) stage funnel with a stall marker, (2) format-authority divergence, (3) publish-
outcome reconciliation state. None may be collapsed into the others.**

> **All three requirements are satisfiable read-only from `ice_ro` today for stages demand→rendered
> and for the reconciliation signals — no new backend.** The per-platform *stall verdict* (V-1's last
> slot) is the one field that depends on S7. **There is still no operator write path** (§0.8); this
> surface would let an operator *see* a stall, never *act* on it from the UI — naming that gap, not
> filling it.

### 0.1 Classification vocabulary (applied to every proposed surface)

| Mark | Meaning |
|---|---|
| **LIVE** | Live capability, already surfaced in the dashboard today |
| **LIVE-UNSURFACED** | Live capability in the CE with no dashboard surface |
| **APPROVED-UPCOMING** | Approved/accepted capability not yet built |
| **DEPENDENT** | Unresolved design dependency — blocked on S1 / S3 / S5 |
| **CONCEPT** | Future concept, no approval, no substrate |

Additionally, every surface carries a **`DEP:cc-0054`** flag where its current implementation reads
the unvalidated `client` request parameter into a dynamic-SQL path.

### 0.2 The cc-0054 dependency surface — mandatory marking

**The security fact (S1's, not this lane's):** `app/(dashboard)/client-profile/page.tsx` interpolates
`searchParams.client` straight into `exec_sql`, which runs as `postgres`, and is reachable by a plain
**GET** — more reachable than either path Batch 1 closed. **S1 holds write precedence** over it and
the other cc-0054 targets, and **cc-0054 must land before any redesign implementation touches those
files.**

**Why this binds design, not just engineering:** a redesign that rebuilds a page around today's
`?client=` parameter re-opens the exact hole cc-0054 exists to close — **invisibly**, because the
parameter looks like ordinary routing.

#### ⚠ CORRECTION — this lane's first-run intersection was wrong and is SUPERSEDED

The 2026-07-24 first run listed **seven** pages as the target class, derived from a **heuristic proxy**:
*file reads `searchParams.client`* ∩ *same file calls `exec_sql`*. That proxy is not a dataflow
analysis and it was wrong in **both** directions. The authoritative set is
`docs/briefs/cc-0054-dashboard-exec-sql-caller-controlled-containment-brief-v1.md` §4 (committed,
post-adversarial-review). **S1's list governs; this lane's earlier list is withdrawn.**

- **Over-marked (6 files, NOT targets):** `clients` · `inbox` · `drafts` · `queue` · `failures` ·
  `pipeline-log`. Verified read-only: on these pages `activeClient` is used **only for in-memory
  JavaScript array filtering** (`.filter(...)`) and never reaches SQL. S1's exclusion is correct.
- **Under-marked (4 real targets missed):** `app/api/visuals/route.ts` ·
  `app/api/feeds/available/route.ts` · `actions/pipeline-stats.ts` ·
  `app/(dashboard)/actions/digest-policy.ts`.

**Lesson recorded:** co-occurrence of two patterns in one file is not evidence of a dataflow. This
lane will not re-derive S1's census again; it consumes it.

#### The authoritative five (cc-0054 §4) — mapped onto this analysis

| # | Site | Reach | Where it appears in this analysis |
|---|---|---|---|
| **S-1** | `app/(dashboard)/client-profile/page.tsx` | **GET** | context surface |
| **S-2** | `app/api/visuals/route.ts` | **GET** | backs `/visuals`; a system surface (§5 SYSTEM) |
| **S-3** | `app/api/feeds/available/route.ts` | **GET** | backs `/feeds`; the missing front half of the spine (§2.15) |
| **S-4** | `actions/pipeline-stats.ts` | **GET** *(and POST)* | 🔴 **backs the live flow diagram — see §0.2b** |
| **S-5** | `app/(dashboard)/actions/digest-policy.ts` | POST | not referenced by this analysis |

**Four of five are GET-reachable** (S-4 via `monitor/page.tsx:50-51, 63`). Total caller-controllable
sites = **seven**: cc-0053 = 2, cc-0054 = 5. `discovery-keywords.ts:32` was a census false positive
and must not be actioned. **PK D3 = Option 1 — enforcement is blocked until all seven land, so
cc-0053 alone does not unblock it.**

#### 0.2b 🔴 The one proposal that lands on a target: the flow map

Verified read-only: `actions/pipeline-stats.ts` (**S-4**) is the **sole data source** for the live
pipeline diagram — consumed by `app/(dashboard)/monitor/page.tsx:63`,
`components/pipeline-flow/PipelineFlowDiagram.tsx:34,189` (including a client-side refresh) and
`components/pipeline-flow/NodeDetailPanel.tsx:4`.

**§5 proposes splitting the flow map in two and building the system diagram to carry live per-stage
numbers. Those numbers come from S-4.** This is therefore the single concrete proposal in this
analysis that **would require touching a cc-0054 target**, and it is **blocked until cc-0054 lands**.

**Revised blast radius — smaller and differently placed than the first run reported.** Inbox, Queue
and the Dropped/terminal-state surface are **NOT** target-class files; implementing them touches no
cc-0054 target. They remain `DEP` only on the *conveyance* question below.

**Consequence for this analysis:** the proposed IA (§5) and screen list (§6) remain client-scoped
almost throughout, so **every client-scoped row keeps `DEP:cc-0054`** — but the marking is now split
into two grades: **`TARGET`** (implementation touches a cc-0054 file) and **`CONVEYANCE`** (the
surface inherits whatever client-scoping contract cc-0054 establishes). **No proposed flow is drawn
as depending on the current shape of the `client` parameter.**

### 0.3 Finding — two incompatible client-selection mechanisms 🔴

Verified read-only. The dashboard has **two parallel client-selection systems**:

| | Mechanism | Drives | Reaches SQL? |
|---|---|---|---|
| **A** | `GlobalClientPicker` → `ClientProvider` React context + `localStorage` | the four Content Studio surfaces only | **No** — never leaves the client |
| **B** | `searchParams.client` on server-rendered pages | the seven pages in §0.2 | **Yes** — into `exec_sql` as `postgres` |

**The shipped global picker does not drive the `?client=` pages at all.** They are separate systems
that happen to select the same concept.

**The design implicitly assumes one picker drives everything.** Realising that means bridging A into
B — making the picker write `?client=` into URLs — which would **turn the shipped, innocuous picker
into a direct feed for the injection sink**, and do so invisibly.

> **Recorded as a conflict with S1's security model. This lane proposes no bridge, and the provisional
> IA below no longer assumes a unified picker.** How client identity is safely conveyed to
> server-rendered surfaces is a **cc-0054 output**, not a design choice. The design should show client
> scope as a *state*, and leave the conveyance mechanism unspecified.

### 0.4 Finding — the safe validator is currently a 2-client allowlist

`creative-library/page.tsx` is the one client-scoped page that **does** validate:
`raw === 'ndis-yarns' ? 'ndis-yarns' : 'property-pulse'`. Structurally contained — and structurally
**frozen at two of four live clients**.

So the containment pattern in the repo today and the design's multi-client switcher **collide**: the
safe shape is an allowlist, the design assumes N clients. Whether cc-0054's validation admits a
roster-driven set determines whether a global client switcher can drive these surfaces *at all*.

> **Surfaced to PK and S1 as a capability consequence of the containment design. Not a request to
> change cc-0054's shape, and not a design decision taken here.**

### 0.5 Finding — there is NO error-state substrate in the repo 🔴

Verified read-only: **`app/` contains no `error.tsx`, no `global-error.tsx`, and no `not-found.tsx`
anywhere.** A route that throws renders a raw 500.

**This is a first-order design finding, not an engineering aside.** A large share of what this
analysis proposes *is* error and edge-state treatment:

| Proposal | What it assumes |
|---|---|
| Waiting-vs-stuck visual separation (§3.2) | a state layer that can render "degraded but fine" |
| Reason-carrying fail states with reassurance (§1.3) | a place for a reason to be shown instead of a crash |
| Fail-closed platform display (§7, S5) | a non-fatal representation of "cannot be served" |
| Terminal side-exits — rejected / dead / voided / skipped (§4.2, §4.3) | the page survives an empty or terminal result |
| Incident awareness (§4.8) | the shell renders when a panel's data source is unavailable |

**None of it has a substrate.** Today the failure mode of every one of those surfaces is *the whole
route 500s* — the opposite of the "normal waiting must not look like failure" principle the design is
built on.

This also **interacts with cc-0054**: that brief specifies a per-site failure contract precisely
because a throw escaping a server component has nowhere to land. Containment will introduce
*deliberate* rejection paths (invalid client → reject), and **there is currently no designed
treatment for what an operator sees when that happens.**

> **Recorded as a design gap with an engineering precondition. Error-boundary introduction is a
> dashboard code change owned by S1 — not proposed, not sequenced, not designed here.** The design
> round should nonetheless *specify the error and empty states it needs*, so the substrate, when it
> is built by its owner, is built to a known target.

---

## 1. Gaps versus the current dashboard repository

**Baseline.** `invegent-dashboard` `main` @ `fda2b51` — 33 operator routes, 40 API routes, Next.js
App Router, shipped shell = `Sidebar` + `StatusStrip` + `GlobalClientPicker` + `<main>`.
Design = one component, 9 in-component pages, all data hardcoded, self-dated **25 June 2026**.

### 1.1 Coverage

The design maps onto **8 of 33** live routes (24%).

| Design page | Live route | Fidelity |
|---|---|---|
| Today | `/overview` (h1 "Operator Briefing") | partial — design drops incidents, token health, diagnostics, 24h schedule |
| Create content | `/content-studio` (Create) | close — correctly withholds the undecided *campaign* tier |
| Ideas | `/content-studio` (Ideas) | close |
| Idea detail | `/content-studio` → `IntentDetail` | design **ahead** (stepper), but step order wrong (§3.1) |
| Series | `/content-studio` (Series) | close |
| Inbox | `/inbox` + `/drafts` | design **ahead** — merges two surfaces into one |
| Queue | `/queue` | close, minus four waiting states |
| Performance | `/performance` | better framing, far less data |
| Flow map | `/monitor` → `PipelineFlowDiagram` | design **behind** — 7 static nodes vs 16 live (§3.3) |

**25 live routes with no design representation:** `/clients` · `/client-profile` · `/feeds` ·
`/onboarding` · `/connect` (+`/select-page`) · `/creative-library` · `/create/templates` (+`/shadow`) ·
`/create/backgrounds` · `/create/creative-intake` · `/create/format-capability` · `/system/formats` ·
`/system/subscriptions` · `/costs` · `/compliance` · `/reviews` · `/roadmap` · `/diagnostics` ·
`/operations` (+`/pools`) · `/pipeline-log` · `/visuals` · `/failures` · `/ef-drift` · `/monitor`
(beyond the diagram) · **`/create/capability-matrix`** *(added at `f0ab742`; flag-gated **dark** in the
nav — a file, not a reachable surface)*.

*Counts re-derived at `6fe8d1e` per §0.0: **33 operator routes**, design covers **8**.*

> **Interpretation is a PK decision, not a finding.** If the design is a *replacement*, these 25 are
> missing. If it is a *narrower daily operator surface* beside the existing console, they are
> correctly out of scope — but the design must then say so and show how the two shells relate.
> This lane recommends the second reading (§5) and does not decide it.

### 1.2 Divergence from the governing dashboard brief

Governing artefact: `invegent-dashboard/docs/dashboard/operator-journey-ia-v1.md`.
**Standing caveat: that spec was never ratified** — its own §11 lists "G-1 — IA spec v1 accepted by
PK" as a hard gate ahead of all its recommendations. So the design round is running without a
ratified IA to conform to. **Recommend PK ratify or supersede it as part of this lane's Gate 1.**

| # | Design | Governing artefact | Effect |
|---|---|---|---|
| 1.2.a | Nav `WORKSPACE / PIPELINE / OUTCOMES` | locked five-section `NOW / CLIENTS / CREATE / REPORTS / ADMIN` | a silent third IA |
| 1.2.b | Noun = **Brand** | Noun = **Client** everywhere (`c.client`, `ClientProvider`, `/clients`) | re-opens debt D6 in a new place |
| 1.2.c | "Pipeline" used as a nav section | IA §8 D5 bans reusing the word | reintroduces a removed collision |
| 1.2.d | Ideas/Series/Inbox/Queue as four peers | ratified hierarchy: request → episode (idea container) → platform posts; **Series is the bucket** | flattens the settled model (re-opens D12/D17) |
| 1.2.e | Global brand picker proposed | **already shipped** (`GlobalClientPicker` in `layout.tsx`) | design is behind reality |
| 1.2.f | Status labels hardcoded inline (`tokenOf`) | IA §6.2: no surface may invent a status string outside `lib/intent-status.ts` | vocabulary drift (§3.2) |

### 1.3 Where the design is genuinely ahead of the repo (verified)

1. **7-step platform-journey stepper.** `IntentDetail.tsx` has no stepper — verified. Best idea in
   the design.
2. **Inbox absorbs Drafts** — resolves standing debt **D8** and **D3** outright.
3. **`WORKED` / `TRY NEXT` learning cards.** `/performance` has reach ranking, format performance
   and gate-failure reasons but **no plain-language learning prose** — verified.
4. **Unified "needs your attention"** with inline actions and a real empty state.
5. **Reason-beside-state with reassurance** on failed lanes ("Safe to retry — nothing was published").
6. **Reduced-motion switch + a single themed accent** — more design-system discipline than ships today.

---

## 2. Gaps versus the current ICE Content Engine

CE `main` @ `495abe3`, register marker **v6.15**. The design predates registers v4.02 → v6.15
(~115 recorded lanes). Everything below landed after the design was drawn.

| # | CE capability | State | Dashboard today | Design |
|---|---|---|---|---|
| 2.1 | **Autonomous slot-filling spine** — scheduled/breaking ingress, fill windows, skipped slots | **LIVE** | partial (`/queue`, `/monitor`) | **absent** — see §4.1 |
| 2.2 | **Shared creative asset pool** (`c.shared_creative_asset`, resolver v1.2 reads it) | **LIVE-UNSURFACED** | none | none |
| 2.3 | **Client asset-pool policy** (`c.client_asset_pool_policy`; absent row ⇒ `client_only` ⇒ shared pool structurally unreachable) | **LIVE-UNSURFACED** | none | none |
| 2.4 | **Asset demand intelligence** — cc-0041 schema · cc-0042 read path · cc-0043 writer (live, producing suggestion + observation rows) | **LIVE-UNSURFACED** | none | none |
| 2.5 | **Rotation-pool depth & eligibility predicate** | **LIVE**, partially surfaced | `/creative-library` SlotEligibility shows selected/rejected + `reason_code` + warnings + scrim; `/create/backgrounds` shows promotion recommendations. **Pool *size*, rotation depth and the cross-client gap view are not surfaced.** | none |
| 2.6 | **`select_template` fail-closed outcomes** (e.g. `no_selectable_template` on **youtube for all four clients**, `image_quote`) | **LIVE-UNSURFACED** | none | none |
| 2.7 | **Template registry / TMR spine** (17 families, 19 templates, 7 RPCs) | **LIVE** | `/create/templates` (+ shadow) | none |
| 2.8 | **Video governance** — governed `video_short_stat`, shared generic spine, `c.client_voice_config` | **LIVE** | partial (`/performance`, video tracker) | YouTube treated as *just a platform* |
| 2.9 | **Avatar / brand-host identity** | **LIVE (degraded)** + **DEPENDENT on S3** | `/clients` AvatarTab; HeyGen node on `/monitor` | none |
| 2.10 | **Music Library v0** (7 tables, public bucket, 1 selectable track, flag off) | **APPROVED-UPCOMING**, dark | none | none |
| 2.11 | **Dashboard authorization model** (Slice 0.5 brief PK-APPROVED; 3 roles) | **APPROVED-UPCOMING** + **DEPENDENT on S1** | **none — auth but zero authz** | a decorative "Operator" chip only |
| 2.12 | **Actor identity / approval attribution** — every audit actor column is free text, some hardcoded; no FK to `auth.users` | **LIVE (deficient)** | none | none |
| 2.13 | **Deploy governance** — drift classes, `deploy-verifier`, safe-deploy path | **LIVE** | `/ef-drift`, `/diagnostics`, `/pipeline-log` | none |
| 2.14 | **Compliance gate** (live pipeline stage) | **LIVE** | `/compliance` | only a `Blocked` chip, unexplained |
| 2.15 | **Feeds / ingest / scoring front half** | **LIVE** | `/feeds`, `/monitor` | collapsed into one "Ingest" box |
| 2.16 | **Costs / subscriptions** | **LIVE** | `/costs`, `/system/subscriptions` | none |
| 2.17 | **Active production incidents** (e.g. `brand_payload_contract_unresolved`; cc-0052 rollback) | **LIVE** | `/overview` "Open incidents" | **no incident concept at all** |
| 2.18 | **R0 read path** (`ice_ro`, 10 curated views) | **LIVE** | used server-side in places | n/a (infrastructure) |

---

## 3. Obsolete parts of the old design

### 3.1 Wrong — approve/render order 🔴 **must fix**

Design stepper: `Create → Draft → **Render** → **Approve** → Queue → Publish → Learn`.
Live order (`lib/intent-status.ts`): `needs_review` resolves **before** `approved`, and "Rendering"
is reachable **only once `approval_status === 'approved'`**.

Correct: `Generating → Awaiting your approval → Approved → Rendering → Queued → Published → Learn`.

**Why it matters as design, not pedantry:** it inverts the meaning of the screen. As drawn, the
operator rubber-stamps a finished artifact. In reality **approval is the gate that spends the render
budget**. Every Approve affordance should read as *authorising the render*, with render progress
appearing after it.

### 3.2 Obsolete — status vocabulary

The design hardcodes its own map and omits four canonical states:
**waiting for render · due now · time pending · held by cadence.**
"Held by cadence" is a *modifier*, not a state, and must never read as an error. Its absence is the
single highest-risk visual omission: normal throttling renders identically to a stall.

It also flattens two altitudes the IA spec separates — intent rollup (`Building/Partial/Completed`)
vs platform-child detail (`Rendering/Queued/Scheduled`).

### 3.3 Obsolete — the flow map

Seven hardcoded boxes with `Publish = proof-only` and `Learn = planned`. Both are live. `/monitor`
already ships a **data-backed 16-node** diagram in three layers (signal / pipeline / output) with
per-node health and drill-in metrics, plus a feedback edge. The design's version is a regression.
It also omits **Compliance**, **Auto-Approver** and **Dead Letter** — the three stages where
operator-visible outcomes are actually decided.

### 3.4 Obsolete — fixture data

- Brand **"Perth Home Watch"** — zero occurrences across CE registers and `_harness`. Fictional.
- **"Invegent Studio"** — real slug is `invegent`.
- **Care for Welfare** — a real live client, entirely absent.
- **"Mara Reyes · Operator"** — implies a role model that does not exist (§2.11).
- **Website** listed as a platform with a "Blog post" format — live publishers are LinkedIn,
  Facebook, Instagram, YouTube. **Flagged as an open question, not asserted as an error.**

### 3.5 Superseded — proposals already shipped

Global client picker (shipped), compact Create control (shipped), preview/submit cardinality parity
(shipped as INV-1). The design should stop proposing these.

---

## 4. Missing operator journeys

### 4.1 The autonomous journey — **the structural gap** 🔴

The design's only journey is *operator has an idea → drafts appear → approve → publish*. Live ingress
measured read-only 2026-07-24 (`ice_ro.slot_status` by `source_kind` / `intent_id`):

| Ingress | Slots | Share |
|---|---|---|
| **scheduled** — a slot came due, the system filled it | 1,156 | 83% |
| **breaking** — a high-signal item claimed a slot | 80 | 6% |
| **manual** — operator-initiated (the design's only path) | 164 | **12%** |

**~88% of content is produced with nobody having an idea.** The design depicts the minority path as
the whole product.

**Design consequence — and it is a simplification, not an expansion:** "Today" stops being a to-do
list and becomes a **status-and-exceptions** screen. The operator's job is not to produce content; it
is to **intervene where the system escalates**. Two ingress lanes converge on one shared spine.

### 4.2 The empty-slot journey

**306 scheduled slots are `skipped`** — the fill window opened and nothing was good enough. A normal,
frequent, designable state with no representation anywhere.

### 4.3 The terminal-drop journey

`ice_ro.draft_status` by `approval_status`: published 843 · approved 781 · **rejected 472** ·
**dead 369** · **voided 367** · draft 15. **Over 40% of drafts end in a state the design has no
vocabulary for.** The design has `Failed`/`Blocked` for live faults but nothing for *made, judged,
dropped*. A live Dead Letter stage exists. The flow needs a **terminal side-exit** visually distinct
from failure.

### 4.4 The auto-approval journey

A live auto-approver handles much of the flow. The design implies a universal human yes, and frames
"Inbox zero" as an achievement rather than the steady state. Missing: *"what did the system approve
without me?"*

### 4.5 The supply journey — **DEPENDENT on S5**

"This client's rotation pool is thin / this platform cannot be served at all." Live truth today:
two clients have a governed background pool of **1**, and `image_quote` on **youtube** fails closed
for **all four clients**. No operator journey exists for noticing, diagnosing or draining that.

### 4.6 The identity journey — **DEPENDENT on S3**

Brand-host designation, ambiguity when a brand has more than one legitimately active identity, and
identity resolution. No journey; no surface.

### 4.7 The governed-action journey — **DEPENDENT on S1**

What a viewer sees versus what a governance operator may do; why an action is unavailable; who
approved what. No journey; no surface; no actor identity.

### 4.8 The incident journey

"The render path is broken for this client." `/overview` has an incidents panel; the design has no
incident concept. An operator console that cannot say this will mislead.

---

## 5. Provisional updated information architecture

**Recommended posture (provisional, for PK ruling):** the design becomes the **operator daily
surface** — a narrow, high-craft shell over the *content* journey — and the existing console retains
the *system, governance and admin* surfaces. Two shells, one nav bridge, no duplication. This is
provisional; §7 lists what must reconcile before it is review-ready.

```
DAILY                                  ← the design's territory
  Today            status + exceptions, built from the 4 operator acts     LIVE          DEP:cc-0054
  Inbox            escalations only (not the universal queue)              LIVE          DEP:cc-0054
  Queue            with 4 distinct waiting flavours                        LIVE          DEP:cc-0054

CONTENT
  Ideas            BOTH ingress lanes, marked                              LIVE          DEP:cc-0054
    └ Idea detail  corrected stepper + side-exits                          LIVE          DEP:cc-0054
  Series           bucket over idea containers                             LIVE          DEP:cc-0054
  Create           framed as the deliberate exception                      LIVE          DEP:cc-0054
  Dropped          rejected / dead / voided / skipped                      LIVE-UNSURF.  DEP:cc-0054

DEMAND & FORMAT AUTHORITY                                                  DEPENDENT · cc-0079
  Slot ledger      demand · allocated · advisor · final · outcome (§0.8)   LIVE-UNSURF.  DEP:cc-0054
                   read-only · no write path proposed · mode-aware (§0.7)
  Platform health  THREE readouts, never collapsed (§0.10c):
                   (1) stage funnel + stall marker (§0.10a)                 LIVE-UNSURF.  DEP:cc-0054
                   (2) format-authority divergence (§0.9)                   LIVE-UNSURF.  DEP:cc-0054
                   (3) publish reconciliation state — 3-valued (§0.10b)     LIVE-UNSURF.  DEP:cc-0054
                   per-platform stall VERDICT slot → filled by S7/cc-0079   DEPENDENT · cc-0079

SUPPLY                                                                     DEPENDENT · S5
  Pool health      rotation depth per client × platform                    LIVE-UNSURF.  DEP:cc-0054
  Gaps & sourcing  demand intelligence (cc-0041/42/43)                     LIVE-UNSURF.  DEP:cc-0054
  Approvals        fenced → promoted, per-asset PK gate                    LIVE (partial) DEP:cc-0054

IDENTITY                                                                   DEPENDENT · S3
  Brand host       designation + governed ambiguity                        DEPENDENT     DEP:cc-0054

OUTCOMES
  Performance      closing the loop back into scoring                      LIVE          DEP:cc-0054
  Learn cards      WORKED / TRY NEXT on real data                          APPROVED-UPC. DEP:cc-0054

SYSTEM             (retained by the existing console, linked not rebuilt)
  Flow             live 16-node data flow                                  LIVE          DEP:cc-0054
  Incidents        open incidents, token health, drift                     LIVE          —
  Admin            roles, guarded actions, audit                           DEPENDENT · S1
```

> **Every client-scoped surface above is `DEP:cc-0054`** — which, in a product where client scope is
> the primary axis, is very nearly all of them. That is the honest reading, not over-marking:
> **client selection is the spine of this IA, and how it is safely conveyed is unresolved.**
>
> **Client scope is therefore drawn as a STATE, never as a mechanism.** No proposed surface specifies
> how the selected client reaches the server, no diagram encodes `?client=`, and no unified-picker
> flow is proposed (§0.3). The conveyance is a cc-0054 output.

**Two diagrams, not one** — this is the core IA correction:

- **Operator journey** (what a human participates in): two ingress lanes → one spine → four
  side-exits. The human acts at exactly four points — approve/reject an escalation · unblock ·
  retry/abandon · schedule/reschedule. Everything else is watched.
- **System data flow** (what content passes through): three bands — signal / pipeline / output —
  with the **Insights → Scoring feedback edge**, which the design omits entirely and which is what
  makes this a system rather than a conveyor belt.

Merging these two is the source of the current convolution. Stage health and content status are
different vocabularies and must not share a colour scale.

---

## 6. Screen-by-screen change list

| Screen | Change | Class | Dep | cc-0054 |
|---|---|---|---|---|
| **Today** | Rebuild around the four operator acts, not a to-do list. Add "the system handled N without you." Retain incidents + token health from `/overview` or link them. | LIVE | — | **DEP** |
| **Create** | Keep. Reframe as the deliberate exception, not the front door. Keep *campaign* withheld (P-2 open). | LIVE | — | **DEP** |
| **Ideas** | Show both ingress lanes and mark which is which. Add filters for terminal states. | LIVE | — | **DEP** |
| **Idea detail** | **Fix stepper order** (Approve → Render). Present Approve as *authorising the render*. Add side-exits. Keep the stepper — it is the design's best asset. | LIVE | — | **DEP** |
| **Inbox** | Reframe as **escalations**. Empty is normal. Add "auto-approved without you" context. | LIVE | — | CONVEYANCE *(not a target — corrected)* |
| **Queue** | Add four waiting flavours — held by cadence · waiting for render · due now · time pending — visually distinct from "stuck". | LIVE | — | CONVEYANCE *(not a target — corrected)* |
| **Series** | No flow change. | LIVE | — | **DEP** |
| **Performance** | Keep framing; back `WORKED`/`TRY NEXT` with real performance data; read as closing the loop. | LIVE / APPROVED-UPCOMING | — | **DEP** |
| **Flow map** | **Split in two** (§5). Build the system diagram to carry live per-stage numbers — a hardcoded version is wrong within a week. | LIVE | — | 🔴 **TARGET — S-4 `actions/pipeline-stats.ts`. The only proposal here that touches a cc-0054 file. Blocked until cc-0054 lands.** |
| **Dropped** *(new)* | Terminal states: rejected / dead / voided / skipped slots. Likely a filter on Ideas, not a screen. Needs an error/empty substrate (§0.5). | LIVE-UNSURFACED | — | CONVEYANCE *(not a target — corrected)* |
| **Pool health** *(new)* | Rotation depth per client × platform; fail-closed platforms; shared-pool reachability. **Provisional only.** | LIVE-UNSURFACED | **S5** | **DEP** |
| **Supply gaps** *(new)* | Demand-intelligence output; sourcing → review → fenced → promoted. **Provisional only.** | LIVE-UNSURFACED | **S5** | **DEP** |
| **Brand host** *(new)* | Designation + governed ambiguity. **Provisional only — do not model resolution semantics.** | DEPENDENT | **S3** | **DEP** |
| **Role-aware shell** | Disabled-with-reason pattern; capability slots; attribution slot. **Provisional pattern only — no role names, no permission model designed.** | DEPENDENT | **S1** | **DEP** (enforcement blocked until all 7 paths contained) |
| **Incidents** | Either surface open incidents in the daily shell or link out. | LIVE | — | — |
| **Connections** | Token expiry health. Either surface or link out. | LIVE | — | — |
| **Slot authority ledger** *(new)* | **Per slot: scheduled demand · allocated format · Advisor recommendation · final format · publication outcome — as five distinct fields, never collapsed (§0.6).** Carries the slot's **mode** (fixed vs policy, §0.7) as a first-class attribute. **Read-only; no write path proposed.** Buildable from `ice_ro` views today. | LIVE-UNSURFACED | **cc-0079** for authority resolution | CONVEYANCE |
| **Platform health** *(revised §0.10)* | **Three independent readouts per platform, never collapsed (V-1/2/3): (1) stage funnel demand→…→reconciled with a stall marker; (2) format-authority divergence; (3) 3-valued publish-reconciliation state (reconciled / internal-only / external-unreconciled).** Funnel stages demand→rendered + reconciliation signals build from `ice_ro` today; the per-platform **stall verdict** slot is filled by S7. No composite health number. Read-only. | LIVE-UNSURFACED | **cc-0079** (stall verdict only) | CONVEYANCE |
| **Client context / switcher** | **NO mechanism proposed.** Show client scope as a state only. Do not design a unified picker (§0.3), do not encode `?client=`. | DEPENDENT | **S1** | **DEP · blocking** |
| **Music, avatar-format, cost surfaces** | Not designed this round. | APPROVED-UPCOMING / CONCEPT | — | — |

> **Reading the cc-0054 column (corrected):** **TARGET** = implementing this screen touches one of the
> five authoritative cc-0054 files — **exactly one row qualifies, the Flow map, via S-4.**
> **CONVEYANCE** = the screen is client-scoped and inherits whatever client-scoping contract cc-0054
> establishes, but touches no target file. **No row may be implemented against the parameter's current
> shape**, and every row proposing an error, empty or degraded state also depends on §0.5.
>
> Two further surfaces this analysis mentions but does not propose rebuilding sit on targets:
> `/visuals` (**S-2**) and `/feeds` (**S-3**). If a later round proposes surfacing either, it inherits
> the same block.

---

## 7. Explicit dependency map

> **Binding rule:** this lane proposes *provisional treatments* for these areas and **hard-codes no
> unresolved backend assumption**. No decision below is made on another lane's behalf.

### S1 — Dashboard Authz (`cc-0046` Slice 0.5 → Batch 2 `cc-0053` → **`cc-0054`**)

**S1 holds write precedence over `invegent-dashboard` absolutely.** S6 authors documents only.

**`cc-0054` is a blocking precondition, not a coordination note.** It contains the five
caller-controllable `exec_sql` sites listed in §0.2 (four GET-reachable). **No redesign implementation
may touch a cc-0054 target file before cc-0054 lands.** Per the corrected mapping that is **one
proposal in this analysis — the Flow map, via S-4 `actions/pipeline-stats.ts`** — plus `/visuals`
(S-2) and `/feeds` (S-3) if a later round proposes surfacing them.

**Enforcement gate (PK D3 = Option 1):** blocked until **all seven** caller-controllable sites land —
cc-0053's two AND cc-0054's five. cc-0053 alone does not unblock it.

**Error-state substrate (§0.5) is also S1's to introduce** if it is introduced at all — this lane
specifies the states the design needs, and proposes no code and no sequencing for them.

Two conflicts with S1's security model are recorded above and are S1's to resolve, not S6's:
**§0.3** (bridging the shipped context-based picker to `?client=` would feed the sink) and
**§0.4** (the repo's only safe validator is a 2-client allowlist, which caps multi-client capability).

**Enforcement note:** enforcement cannot be enabled until all **seven** caller-controllable `exec_sql`
paths are contained (`cc-0053` closes two; `cc-0054` the rest). **This analysis designs no permission
model and assumes no role-gated surface is available.**

#### Slice 0.5 design surface (unchanged from below, all provisional)

| Design element | Blocked on | Provisional treatment |
|---|---|---|
| Role-aware navigation | the `[A]`-class ruling; role source A2 vs alternatives | Design a **capability-gated** shell: surfaces declare a required capability; the shell hides or disables. **Do not name roles in the design.** |
| Guarded / disabled actions | which actions are guarded, and by what | Design one **disabled-with-reason** pattern (control + reason + who can). Pattern is role-agnostic. |
| Administrator-only flows | whether an admin surface exists at all | Reserve an ADMIN slot in the IA. Do not design its contents. |
| Actor attribution on approvals | ICE has no actor identity; audit columns are free text, some hardcoded | Design an **attribution slot** ("approved by · when"). **Do not imply the data exists.** |
| Read-only viewer mode | role model | Provisional: every action affordance needs a defined non-actionable state. |

**Note carried, not decided:** S1's own packet records that Slice 0.5 does **not** unblock Slice 1
(no governed write RPC for 3 of 4 operations), and that Batch 2 is an integrity precondition to
enforcement (E-Q2). Any design implying enforcement is ready is premature.

### S3 — AGP Identity (`cc-0047`)

| Design element | Blocked on | Provisional treatment |
|---|---|---|
| Brand-host designation surface | what designation means, who holds it | Reserve an identity slot beside Logo/Background in the governed-asset model. **Do not model semantics.** |
| Identity ambiguity resolution | how legitimate ambiguity is created and governed | Do not design. Note as a future surface. |
| Avatar/persona in the content journey | persona input is dark; selection is 100% `fallback_limit1` | Show avatar as an **asset class**, not a working selector. |

**Constraint honoured:** this lane makes no reference to, and proposes nothing touching,
`heygen-worker`.

### S5 — Asset-Gap Drain (`cc-0073`, brief draft awaiting Gate 1)

| Design element | Blocked on | Provisional treatment |
|---|---|---|
| Pool-health surface | the true supply gap; whether pool size is the right metric | Design a **depth-per-client × platform** readout. Mark provisional; do not encode thresholds. |
| Fail-closed platform display | whether YouTube fail-closed is an asset gap or a capability gap — S5 says **not an asset problem** | Design a *reason-carrying* fail state; **do not attribute a cause**. |
| Sourcing → approval journey | rotation/promotion flow and its gates | Reuse the existing fenced → PK visual gate → promoted vocabulary. **Do not design an approval control** — promotion is a per-asset PK act. |
| Shared-pool reachability | `client_asset_pool_policy` semantics | Represent reachability as a state, not a toggle. |

### S7 — Demand→Publish Root-Cause (`cc-0079`)

| Design element | Blocked on | Provisional treatment |
|---|---|---|
| Per-platform **stall verdict** (the funnel's last slot, §0.10a) | S7's diagnosis of which stage owns each platform's defect | Design a **verdict slot** the funnel renders per platform. Populate stages demand→rendered from `ice_ro` now; leave the verdict slot data-driven, **do not guess the cause**. |
| Format authority (`format_chosen` vs `recommended_format`, §0.6) | S7/cc-0079 owns authority resolution | Display the disagreement as demand vs decision vs final. **Design no resolution.** |
| Reconciliation quantification (§0.10b) | S7 is counting externally-published-yet-unreconciled rows | Design the **3-valued** outcome cell; the counts are S7's, the states are the design's. |

**Constraint honoured:** this lane diagnoses no pipeline stage and proposes no fix or write path. It
designs the surface that would have made the 30-day silence visible on day 1.

### Write-path gap (named, not filled)

**There is no operator write path to schedule or format anywhere in the dashboard** — every change is
a hand-run SQL statement, and `/clients` Pyramid is deliberately read-only. Both new surfaces (slot
ledger §0.8, platform health §0.10) are **read-only by necessity, not choice**. An operator could
*see* a fixed-slot format override or a render stall and still have **no in-UI way to correct it**.
**This lane names that gap and designs around it; it does not propose the write path.** Introducing one
is a separate governed lane (its own gate, its own tier, an authz precondition — enforcement is blocked
until all seven `exec_sql` paths are contained).

### Cross-lane

| Item | Status |
|---|---|
| IA spec v1 ratification (G-1) | **unratified** — recommend PK settle at this lane's Gate 1 |
| P-2 campaign taxonomy | open — design correctly withholds it |
| "Website" as a publish target | **open question for PK** — affects Create, preview, every lane |
| Replacement vs companion shell | **open question for PK** — re-scopes §1.1 entirely |

---

## 8. Recommended order for updating the Claude Design project

### 8.0 Sequencing constraint — containment precedes redesign implementation

**Design-side steps 1–4 below touch the Claude Design project only and are safe to run now, in
parallel with S1.** They change no dashboard file.

**Implementation of any redesigned screen is a separate, later act, and `cc-0054` gates it** for every
target-class file (§0.2). This lane does not sequence implementation and does not propose an order
that would place redesign before containment.

**Finding, stated as a finding and not a decision:** analysis **agrees** containment-first is correct
here, and for a design-specific reason beyond the security one — **cc-0054 determines how client
identity is safely conveyed to server-rendered surfaces (§0.3), and client scope is the primary axis
of this entire IA.** Designing the conveyance before cc-0054 defines it would mean designing it
twice. Containment-first is not merely a safety constraint on this lane; it is a **prerequisite for
the design being correct at all.**

### 8.1 Design-project update order

Ordered by *unblocks-the-most-per-edit*. Steps 1–4 need no other lane; 5–6 are provisional-only.
**None of these steps is an implementation step.**

| # | Step | Needs | Why this slot |
|---|---|---|---|
| **1** | **Settle the two framing questions** — replacement vs companion; Client vs Brand | PK | Every later edit depends on both. Cheapest possible decision, largest blast radius. |
| **2** | **Correct the flows** — approve-before-render; split the flow map in two; add the feedback edge | none | Pure correction; no new screens; makes the design defensible. |
| **3** | **Add the missing states** — four waiting flavours; terminal side-exits; auto-approved path; skipped slot | none | Mostly chips and empty states inside existing screens. Highest legibility gain per edit. |
| **4** | **Re-frame the two ingress lanes** — Today as status + exceptions; Ideas showing both lanes; Create as the deliberate exception | step 1 | The structural correction. Do it once framing is fixed, not before. |
| **4b** | **Design the slot authority ledger** (§0.8) — five distinct fields, mode-aware, read-only | none | **Highest-value missing surface, and buildable from `ice_ro` today with no backend change.** Independent of every other lane; needs no write path. Do this early. |
| **4c** | **Design two-axis platform health** (§0.9) — divergence AND publish outcome | none | Single-composite health is unbuildable without hiding a failure class. Cheap, and prevents a green-tile lie. |
| **5** | **Provisional supply surfaces** — pool health, supply gaps | S5 Gate 1 direction | Design shells only; label DEPENDENT; no thresholds, no causes. |
| **6** | **Provisional governance patterns** — capability-gated shell, disabled-with-reason, attribution slot | S1 `[A]` ruling direction | Patterns, not role names. Re-verify after S1 lands. |
| **7** | **Replace fixture data** — drop Perth Home Watch, add Care for Welfare, rename Invegent Studio | PK confirm roster | Cosmetic but removes a credibility hazard in review. |
| **8** | **Hold** — identity surfaces, music, costs, admin contents | S3 / later gates | Do not design. Reserve slots only. |

**Do not** rebuild the system/infra surfaces into the design at any step — link, don't duplicate,
until step 1 says otherwise.

---

## 9. Boundary — design-only versus later dashboard implementation

### 9.1 Design-only (this lane and the design round; no code)

- Screen composition, IA, nav grouping, naming *within the design*.
- Flow diagrams (operator journey, system data flow).
- State vocabulary **selection** — choosing which canonical states to render and how.
- Visual patterns: waiting-vs-stuck treatment, terminal side-exit, disabled-with-reason,
  attribution slot, capability-gated shell.
- Provisional shells for supply/identity/governance surfaces, clearly labelled DEPENDENT.

### 9.2 Explicitly NOT design decisions — later, gated, other owners

| Item | Owner | Gate |
|---|---|---|
| **How client identity reaches a server-rendered surface** (§0.3) | **S1 · `cc-0054`** | blocking precondition |
| **Whether validated client scope can be roster-driven or stays an allowlist** (§0.4) | **S1 · `cc-0054`** | capability consequence |
| Role model, permissions, guarded actions, enforcement | **S1** | PK `[A]` ruling → T2/T3; blocked until all 7 paths contained |
| Any `exec_sql` / dynamic-SQL remediation | **S1** (Batch 2 / Batch 6) | T2 / T3 |
| **Any edit to a cc-0054 target file** | **S1** | `cc-0054` must land first |
| Brand-host designation semantics, identity resolution, anything in `heygen-worker` | **S3** | new PK gate |
| Pool thresholds, rotation changes, asset promotion, sourcing | **S5** | T3 + PK visual gate per asset |
| Status vocabulary **additions** (new strings) | dashboard | `lib/intent-status.ts` first, then consumed |
| Any dashboard code change | **S1** (sole writer of that repo) | its own gate |
| Register entries / task IDs / version numbers | orchestrator + PK | central allocation |

### 9.3 Standing constraint

A design that renders a control implies the control exists. **No proposed surface may imply an
action, a role, a threshold or a data field that is not independently established by its owning
lane.** Where the design needs to show something unestablished, it shows a *reserved slot*, not a
working control.

### 9.4 The `?client=` rule (binding on the design round)

**No proposed screen, diagram or flow may depend on the current shape of the `client` request
parameter.** Client scope is drawn as a **state** the surface is in — never as a mechanism, a URL
shape, or a picker wiring. This is not stylistic: enshrining today's parameter in a proposed IA would
re-open the hole `cc-0054` exists to close, and would do it invisibly because the parameter reads as
ordinary routing.

Concretely, the design round must **not**: encode `?client=` in any diagram or spec · propose the
shipped context picker writing into URLs · assume a client switcher can span all four clients
(§0.4) · treat client conveyance as settled.

---

## 9b. Handoff — frozen paths and hashes

Per the shared-checkout protocol: **the shared git index is not a handoff channel.** S6 authored one
file; it is untracked and uncommitted, and S6 will not stage, commit or push it.

| Path | Status | sha256 |
|---|---|---|
| `docs/briefs/dashboard-redesign-gap-analysis-brief-v1.md` | untracked (`??`), **frozen** | reported in the S6 handoff message — a hash cannot be embedded in the file it hashes; recompute with `sha256sum` to verify |

**Anchors:** CE `origin/main` = `ce3e4b8`, parity 0/0. **Dashboard read at fetched `origin/main` =
`6fe8d1e`** (stale-ref gate §0.0; shared checkout left at `fda2b51`, **not** pulled or checked out).
**S6 touched no file in `invegent-dashboard`** and never ran `git add -A` or `git commit -a`.
The only git operation S6 performed on that repo was `git fetch --prune origin` — a ref update,
no working-tree effect.
Rendered companion (design-review convenience only, not a governed artefact):
artifact `05032251-79cc-4205-890b-2ee866a04dda`.

---

## 10. Stop condition

**Stage 1 ends here.** Nothing is implemented. Nothing is mutated. No register entry is cut, no ID
claimed, no commit made.

**Stage 2 is not started** and must not be, until S1 (roles, permission visibility, guarded actions,
administrator-only flows), S5 (pool health, sourcing gaps, suitability, rotation, operator approval)
and S3 (brand-host designation, identity resolution) have reconciled. Designs touching those areas
are **provisional and not review-ready**.

### Open questions for PK (Gate 1)

1. **Replacement or companion shell?** Re-scopes §1.1 and §5 entirely.
2. **Client or Brand** as the operator noun?
3. **Ratify, supersede or leave open** `operator-journey-ia-v1.md` (G-1)?
4. **Is "Website" a real publish target?**
5. **Allocate a `cc-` ID and register block to this lane**, or keep it unnumbered as analysis?

---

## Appendix — evidence

- Design: `DesignSync` read methods, project `3d048ee9-cebd-4bf1-a61b-4ffbbd2ba5f5`,
  `ICE Operator Dashboard.dc.html` (840 lines; `tokenOf` L629, `stepVM` L698, flow nodes L802,
  brands L613, platforms L620).
- Dashboard `fda2b51`: `components/sidebar.tsx`, `app/(dashboard)/layout.tsx`,
  `components/pipeline-flow/{PipelineFlowDiagram,NodeDetailPanel}.tsx`, `lib/intent-status.ts`,
  `app/(dashboard)/{overview,performance,monitor}/page.tsx`,
  `app/(dashboard)/content-studio/components/Intents/IntentDetail.tsx`,
  `components/creative-library/SlotEligibility.tsx`, route enumeration (33 pages / 40 API routes),
  `docs/dashboard/operator-journey-ia-v1.md`.
- CE `495abe3`: `docs/00_sync_state.md` (v5.87→v6.15), `docs/00_action_list.md` (v6.15),
  `docs/briefs/seeds/{S1-dashboard-authz,S3-agp-identity}-seed-packet-v1.md`,
  `docs/briefs/cc-0073-backgrounds-only-asset-gap-drain.md`, `CLAUDE.md`.
- Read-only DB (R0 path, `scripts/db-read.py`): `ice_ro.slot_status` grouped by
  `source_kind` / `intent_id IS NULL` / `status`; `ice_ro.draft_status` grouped by
  `approval_status`. No writes, no DML, no `execute_sql`.
- Negative checks (grep over dashboard `app`/`components`/`lib`/`actions`, node_modules excluded):
  no hits for `shared_creative_asset`, `asset_gap`, `appetite`, `client_voice_config`, `authz`;
  `music` appears only in `/roadmap` copy.
