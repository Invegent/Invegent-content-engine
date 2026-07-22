CLAIMED v6.08 · cc-0046 Slice 0.1 — Capability surface IA reconciliation · worktree claude/dashboard-operator-capability-slice-0-k2soo3 · gate: PK ruling 2026-07-22 (analysis accepted, retirement authorized) · 2026-07-22 09:5x +1000 Sydney

# Result — cc-0046 Slice 0.1: Capability surface IA reconciliation (READ-ONLY analysis → dark retirement)

**Parent lane:** cc-0046 Dashboard Operator-Capability Arc · Slice 0 result `docs/briefs/results/dashboard-operator-capability-arc-result-v1.md` (CE `98725a8`, register v6.07 — Slice 0 ACCEPTED `PRODUCTION-ENABLED · VERIFIED LIVE · READ-ONLY PROVEN`)
**Opened by:** PK ruling 2026-07-22 §4 of the Slice 0 acceptance — Advisory 2 upheld as a *confirmed IA reconciliation requirement, not a naming preference*.
**Lane class / tier:** PRODUCT_PROOF · **Slice 0.1 analysis = T1** (read-only, nothing written to the app) · **retirement execution = T3** (production env-var change + redeploy; PK-run)
**Repo:** `invegent-dashboard` (dashboard is a separate repo from CE — see `docs/` note in the Slice 0 record)
**Status:** `IA RECONCILED · ROUTE RETAINED DARK · FORMAT CAPABILITY CONFIRMED AS OWNER`

> **Scope fence:** Slice 0.1 was read-only analysis + presentation design, followed by a *minimal flag retirement only*.
> **No** file deletion, **no** redirect, **no** `next.config.mjs` change, **no** nav-code removal, **no** rename, **no** port
> of any feature, **no** RPC/CE/DB/migration change. Slice 0.5 remains unauthorized; Slice 1 remains blocked on Slice 0.5.

---

## 1. The question

Two live production surfaces answered the same operator question after Slice 0 was enabled:

- **A — `/create/capability-matrix`** (cc-0046 Slice 0, new, flag-gated, enabled 2026-07-21)
- **B — `/create/format-capability`** (pre-existing, contract `gfcp.v0`)

`dashboard-ia-lint` had flagged only the adjacent nav word "Capability" as an advisory WARN. Live production
review at the Slice 0 activation gate showed the overlap was materially larger than the label: both surfaces
render a capability matrix over the **same 13 formats × 4 platforms**, two nav items apart in the CREATE group.
PK ruled this a confirmed IA reconciliation requirement and opened this slice.

## 2. Source-verified side-by-side comparison

`dashboard-ia-lint` produced the comparison but **could not read Surface A's source** — Slice 0's files exist only
on `origin/main @ f0ab7422` and are absent from the local checkout, and the agent has no git access. Every
Surface-A claim it made was therefore `live-observed` only. **The orchestrator closed that gap directly**, reading
both surfaces' source and verifying the load-bearing claim. Citations below are from source unless marked.

### 2.1 The decisive finding — A is B's Layer A

**Surface A's entire matrix is Surface B's single "Layer A · Declared support" line.** Both read the same
`platform_support` field and render the same three-way declared-support distinction over identical axes:

- **A** — `components/capability-matrix/CapabilityMatrixView.tsx`: `const support = f.platform_support ?? {}` (:288)
  → `label = "Supported"` (:321) / `label = "Not supported"` (:324); the surface's own legend (:230-233) states
  *"Each cell shows declared platform support from the format taxonomy. Supported = declared true; Not supported =
  declared false; — = platform key absent from the taxonomy (not modelled), distinct from a declared 'no'."*
- **B** — `components/format-capability/GlobalFormatCapabilityPyramid.tsx:284-293`:
  `LayerLine layer="A · Declared support"` → `cell.platform_support === "supported" ? "supported" :
  cell.platform_support === "unsupported" ? "not supported" : "unknown"`.

A is **not a different view** of capability. It is one line of B's nine-layer proof chain promoted to a full page,
minus layers B–G and minus the diagnostics.

### 2.2 Full comparison

| Dimension | **A — `/create/capability-matrix`** | **B — `/create/format-capability`** |
|---|---|---|
| Primary operator question | **Three** on one page: declared support · live template inventory · live governance state (live-observed) | **One**, stated in code: *"System-wide platform × format capability · read-only · evidence & reconciliation view"* (`create/format-capability/page.tsx:19-21`) |
| Live data source(s) | `t."5.3_content_format"` + `ice_ro.template_registry_status` + `ice_ro.asset_governance_status`, via SECURITY DEFINER `exec_sql`; sources named inline in the UI | ONE RPC `public.get_global_format_capability_pyramid(p_platform=null, p_ice_format_key=null, p_include_variants=false)`, service-role, server-side (`actions/global-format-capability.ts:184-188`); contract `gfcp.v0` (:24) |
| Axes | 3: platform × format × **format-type**, rows grouped by `format_category` (Image / Animated image / Video / Text / Uncategorised); 13 × 4 | 2, format-major: rows = formats, cols = platforms (`:457`, `:589-671`); platform order pinned `facebook, instagram, linkedin, youtube` (`:177-184`); 52 cells |
| Cell vocabulary | **3** values: Supported / Not supported / — | **9** evidence-graded states: Proven in production · Smoke-proven · Configured & enforceable · Configured not proven · Policy only no proof · Supported in theory only · Ungoverned · Conflict/diagnostic · Blocked (`actions/global-format-capability.ts:26-35`; component `:96-106`), each with operator-language help (`:36-55`) |
| Proof / governance overlay | None on the matrix. Governance + templates appear as two **separate** panels beside it | 9-layer per-cell proof chain in a drawer: A declared support · B configured default (+mix %) · C synthesis/quality/fitness policy · D render proof · E publish proof · F creative proof · variant model (`:281-339`) |
| Conflict diagnostics | **None** | Load-bearing: 4 coded diagnostics — `default_without_support`, `publish_evidence_without_support`, `channel_outside_model`, `render_without_publish` (`:152-165`, `:705-752`); a named "not modelled yet" gap list distinct from conflicts (`:754-765`); explicit *never auto-fixed / not the canonical source of truth* stance (`actions/global-format-capability.ts:14-16`) |
| Error handling | **Per-source error cards** — one source can fail without blanking the page | Single all-or-nothing error card (`page.tsx:26-33`; action `:197-221`) |
| Intended operator action | None — reading surface | None; read-only enforced and stated four times (`page.tsx:7`, component `:64-66`, `:255`, `:527`) |
| Client scoping | System-wide, no client axis | System-wide, client-agnostic by contract — no client param (`actions:14-16`, `:184-188`); *"no client picker"* (`page.tsx:7`) |
| Nav | "Capability Matrix" (flag-gated insert, `components/sidebar.tsx` CREATE group) | "Format Capability" (`sidebar.tsx:115`); h1 "Format Capability" (`page.tsx:18`) — **label↔h1 parity holds** |

### 2.3 Why the alternatives were rejected

- **Merge** → converts B from a one-question page into a three-question board; that is the exact IA §5 violation.
  A's two extra panels already have owners: `/create/templates` (`create/templates/page.tsx:34`) and
  `/creative-library` (`creative-library/page.tsx:34`; `components/creative-library/GovernanceEnablement.tsx:7`).
- **Drill-down** → backwards. A is the *coarse* surface and B the rich one; making the poorer, wider page the
  parent buries B's diagnostics at a third level.
- **Retain both with distinct names** → requires two non-colliding nav labels that do not exist. CREATE already
  carries two primary-noun collisions (`sidebar.tsx:113-118`: "Formats"/"Format Capability" share *Format*;
  "Creative Library"/"Creative Intake" share *Creative*). A third capability-flavoured label makes a three-way
  collision — a BLOCK under IA §10 check 2. **The naming problem being unsolvable is itself evidence the jobs are
  not distinct.**

## 3. PK IA RULING (2026-07-22)

Source-level comparison **accepted**. `/create/capability-matrix` duplicates the coarse `platform_support` layer
already contained within `/create/format-capability`; the latter is the **richer and more defensible owner** of the
capability question (evidence chain, maturity states, conflict diagnostics, known-gap handling); the new route's
unique contributions **do not justify a second top-level capability surface**.

**Durable owner:** route `/create/format-capability` · nav label `Format Capability`. **Not renamed in this slice.**

**Retirement model: dark retirement, not deletion.** The Slice 0 implementation **remains in the repository,
flag-gated and inert**. No file deletion, no redirect, no `next.config.mjs` change, no nav-code removal — this
resolves the live IA collision immediately while preserving full reversibility.

## 4. Retirement execution + evidence (2026-07-22)

**PK executed the irreversible steps; orchestrator verification was read-only throughout.** PK **deleted** the
`DASHBOARD_CAPABILITY_MATRIX_ENABLED` variable (Production scope) rather than setting it `false` — equivalent,
since the gate is `process.env.DASHBOARD_CAPABILITY_MATRIX_ENABLED === "true"` (absent ⇒ dark) — then redeployed.

**Confirmed gotcha, recorded for reuse:** deleting the variable **did not take effect on the running deployment**.
A read of live production between the delete and the redeploy showed the surface still fully rendering with a
fresh request-time read (`2026-07-22T01:32:09Z`) and the nav item still present. Vercel binds env vars into the
deployment at build time, so an env change reaches production only via a **new deployment**. The redeploy was
therefore required, not optional.

**Retirement deployment identity:**
- **`dpl_H5Ysoyd9HfUezMHBUNvygek1yXvk`** — `state/readyState = READY`, `target = production`, `source = redeploy`,
  `action = redeploy`, `originalDeploymentId = dpl_6KgpPCbNkceTzgnehRMsB3QhEuvK`.
- **`githubCommitSha = f0ab74229318b9616fb731f72d47ae5d1dca9f7a`**, ref `main`, `githubCommitVerification = verified`
  → **the exact same reviewed commit as Slice 0; env-only rebuild, ZERO code change.** Built 2026-07-22 01:28Z →
  ready 01:29Z. `aliasError: null`; alias `dashboard.invegent.com` (+ `invegent-dashboard.vercel.app`, `…-git-main-…`).
- **The implementation remains in the repository, flag-gated and inert** — no file deleted, no redirect added, no
  `next.config.mjs` change, no nav code removed, per the PK retirement model.

**Authenticated production verification — all PASS:**

| Check | Observed live |
|---|---|
| "Capability Matrix" gone from navigation | **Absent.** CREATE group now reads exactly: Content Studio · Creative Library · Formats · **Format Capability** · Template Registry · Creative Intake · Background Assets (7 items, the pre-Slice-0 set) ✅ |
| `/create/capability-matrix` returns to its inert notice | Renders exactly `Capability Matrix is not enabled in this environment.` — no matrix, no inventory panel, no governance panel ✅ |
| `/create/format-capability` remains healthy | Full surface intact: 52 cells · 4 platforms · 13 formats; Proven 15 · Smoke-proven 1 · Configured & enforceable 1 · Policy only 5 · Theory only 10 · Conflict/diagnostic 12 · Blocked 8 · Conflicts 12; platform capability summary, per-cell proof-chain buttons, and the Diagnostics section all present ✅ |
| `/create/templates` unaffected | Template Registry renders 25 templates · 17 families · 1 production proven · 24 needs-attention ✅ |
| `/creative-library` unaffected | Renders fully — B1 TMR winner panel, live governance enablement (image_quote + video_short_stat), 30 governed assets, slot eligibility (2 selected / 6 rejected), latest production render 2026-07-22 02:15 ✅ |
| Nearby Create routes | No regression across the CREATE group ✅ |
| Client-side errors | **No console errors or exceptions** ✅ |

**Verification-method note (honesty):** an early nav read appeared to show the whole CREATE/REPORTS/ADMIN block
missing. This was **a viewport artifact, not a regression** — the sidebar is its own scroll container and at
1422×650 those groups sat below the fold; a transiently unresponsive renderer compounded it. Confirmed by
screenshot + scrolling the sidebar, after which the full nav read normally. **No PASS was recorded until the
artifact was explained.**

**Rollback availability:** the prior production deployments remain READY and instant-rollback eligible —
`dpl_6KgpPCbNkce…` (the flag-enabled build) and `dpl_7X4A1M…` (the original dark build), both the same
`f0ab7422`. Note the precise semantics: because env vars bind at build time, **instant-rollback to
`dpl_6KgpPCbNkce…` would restore the ENABLED surface** (that build carries `=true`), while rolling back to
`dpl_7X4A1M…` restores the dark state. Re-enabling via the env var + a redeploy is the other route. No code
revert is required in either direction.

**No rollback trigger fired.** No CE, DB, EF, migration, RPC, code, or nav-code change was made in this step.

## 5. Stale operator copy — recorded, deliberately not fixed now

Surface A carries the sentence *"25 live templates — the honest replacement for the empty Template Registry"*
(the same premise appears in the Slice 0 commit message). **The claim is factually stale:** `/create/templates`
renders **25 templates / 17 families** from the same source — the Template Registry is populated, not empty, and
is neither superseded nor non-live.

**PK ruling:** the sentence becomes **non-user-visible once the route is dark**, so it does **not** warrant a
separate production copy-only deployment. The defect is recorded here and must be corrected or deleted **when the
route is next edited, absorbed, or removed**. No review/deployment cycle is to be spent on copy inside a surface
being retired. **The earlier authorization for a standalone copy-only follow-up is superseded by this ruling.**

## 6. Unique-contribution disposition — follow-up candidates, NOT ported

**Nothing was ported into Format Capability during Slice 0.1.** The following are recorded as explicit follow-up
candidates only:

1. **`format_category` row grouping** (Image / Animated image / Video / Text / Uncategorised). Note for any future
   port: `format_category` is **absent from the `gfcp.v0` contract** — `FormatEntry` carries only
   `{ice_format_key, display_label}` (`actions/global-format-capability.ts:113-116`), and no `format_category`
   reference exists anywhere in B's action or components. A display-side static map beside the existing
   `FORMAT_DESCRIPTIONS` precedent (`GlobalFormatCapabilityPyramid.tsx:13-33`, declared *"display copy only (NOT
   from the payload; no contract change)"*) would need no contract, RPC, or DB change; adding `format_category` to
   the RPC would be a backend change and a higher tier.
2. **Independent direct-taxonomy cross-check of the GFCP RPC.** A read `t."5.3_content_format"` directly; B reads
   the same declaration *through* the RPC. Retiring A removes the only surface that could catch an RPC-side bug by
   disagreeing with B. **Honest cheaper substitute:** a `db-read.py` / `execute_sql` spot-check at review time —
   not a second production page.
3. **Per-source fail-loud / read-isolation pattern** (one source failing without blanking the page).
4. **Template + governance inventory links or summaries.**

**Binding condition on any future port:** it must first demonstrate that it **strengthens the primary Format
Capability question** rather than turning that page into a multi-purpose dashboard. **The Template Registry and
Creative Library remain the canonical owners of their inventories.**

## 7. Deferred questions + documentation gaps

**Ungoverned questions returned to PK (the governing IA docs do not answer them):**
- **Q1** — may two production routes own one operator question, and which owns it? *(Answered by §3 for this pair;
  the general rule is still unwritten — IA §5 fixes one question per page but is silent on one page per question,
  and its ownership table names no `/create/*` surface.)*
- **Q2** — is "capability maturity" a sanctioned status axis distinct from the §6.1 lifecycle vocabulary, which
  vocabulary is canonical, and is the operator-facing taxonomy noun `format` / `format category` / `format-type`?
  (A introduced "format-type" as a fourth term.) **OPEN.**
- **Q3** — does the URL-addressability expectation (D7) extend beyond Content Studio to `/create/*` diagnostics?
  B's per-cell proof drawer is `useState`-only (`GlobalFormatCapabilityPyramid.tsx:443`) and so unshareable. **OPEN.**
- **Q4** — disposition of A's two borrowed panels. *(Answered by §6: canonical owners keep them.)*
- **Q5** — `Formats` → `Format Library` relabel. **PK ruled OUT OF SCOPE for Slice 0.1.** It would close both the
  label≠destination mismatch (`sidebar.tsx:114` vs `system/formats/page.tsx:42`) and half the "Format" noun
  collision, in one string. Carried as IA debt.

**Confirmed governance gaps → `register-reconciler` (separate documentation reconciliation item; the flag
retirement was explicitly NOT blocked on this work):**
- `docs/dashboard/operator-journey-ia-v1.md` §2.1 route inventory lists **3** CREATE routes; the live sidebar has
  **7** (`sidebar.tsx:112-118`) — `/create/format-capability`, `/create/templates`, `/create/creative-intake`,
  `/create/backgrounds` and `/create/capability-matrix` are all absent.
- §5's ownership table assigns a primary question to every Content Studio / NOW surface and to **no** `/create/*`
  surface — the direct cause of Q1/Q2/Q4 being ungoverned.
- The doc still carries `> **Status:** PROPOSAL` while describing shipped production state.

**Without that reconciliation the next capability surface will be judged against the same empty rulebook.**

## 8. Stop condition

Slice 0.1 closed as **`IA RECONCILED · ROUTE RETAINED DARK · FORMAT CAPABILITY CONFIRMED AS OWNER`**.
**Slice 0.5 remains unauthorized. Slice 1 remains blocked on Slice 0.5.** No governance writes, role-model
implementation, Content Studio edits, RPC changes, CE/backend changes, migrations, route deletion, redirects, or
unrelated navigation cleanup are authorized. Any further work requires a fresh PK gate.
