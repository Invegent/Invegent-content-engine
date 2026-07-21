# Brief — Dashboard Operator-Capability Arc (v1): governance CRUD, 3-axis matrix, Content Studio editing + leftovers

**Created:** 2026-07-21 Sydney  
**Author:** chat  
**Executor:** Claude Code (fresh session scoped to `invegent-dashboard`) + PK gates  
**Status:** issued — **gate-1 APPROVED (PK 2026-07-21)**; build in a fresh session scoped to `invegent-dashboard`; external review `f4139c7d` (partial→PK, no defect; authz resolved role-gated); cc-NNNN claimed at that session's gate 1 per CCF-02  
**Result file:** `docs/briefs/results/dashboard-operator-capability-arc-result-v1.md` (per slice on completion)

---

## Task

The cc-0044 backend now lets ICE onboard and govern a client through **data, not code** — but an operator
can only *drive* that data through SQL / Claude Code. The governance and creative surfaces of the dashboard
(`/creative-library`, `/create/format-capability`, `/create/templates`) are **read-only**, while the rest of
the app already writes freely (Content Studio, Inbox, Feeds, Compliance, Onboarding). This arc closes that
gap: make an operator able to run the cc-0044 content-governance loop **through the dashboard UI** — see the
true state (a platform × format × format-type matrix wired to live CE truth), and *act* on it (enable
governance, set pool policy, promote/fence assets, assign templates + proofs) — plus finish the standing
Content Studio editing gap and the dashboard leftovers. Delivered in **slices**, read-only-first, with every
production-governance write behind the same guardrails cc-0044 used.

## Source context

**CE side (what the UI must comply with):**
- `CLAUDE.md` — ICE orchestration contract; the T1/T2/T3 tiers, PK gates, and the cc-0044 governance model.
- `docs/briefs/results/cc-0044-cpd-invegent-onboarding-result-v1.md` — the five governed operations an operator
  now does via `execute_sql`: shared-bg promote, pool policy, governance enable, assignment+proof, auto-close.
- The cc-0044 backend RPCs/tables: `resolve_slot_assets`, `select_template`, `run_asset_gap_analysis`,
  `c.client_creative_governance`, `c.client_asset_pool_policy`, `c.client_brand_asset`,
  `c.shared_creative_asset`, `m.asset_gap_suggestion`.
- The 10 `ice_ro` R0 views (`CLAUDE.md` Operator read path) — esp. `template_registry_status`,
  `asset_governance_status`, `music_governance_status`, `render_status`, `publish_status` — the honest,
  secret-free read surface the dashboard *should* consume for governance visibility.

**Dashboard side (grounded map, `/workspace/invegent-dashboard`, HEAD `fda2b51`):**
- Stack: Next.js 14 App Router; server components + client islands; **three Supabase clients**, and the
  dominant data path is the **service-role client** (`lib/supabase/service.ts:5`) calling RPCs, incl. a generic
  `exec_sql` read RPC (`lib/supabase/sql.ts:11`). **No role/permission model** — `middleware.ts` gates only
  *session existence*; service-role bypasses RLS.
- Read-only governance/creative surfaces to make writable: `/creative-library`
  (`app/(dashboard)/creative-library/page.tsx:5-10` "No writes"); loaders `actions/creative-library.ts`
  (`list_client_governed_assets` :372, `resolve_slot_assets` :427, `get_client_creative_governance` :493).
- Existing matrices (format × platform, read-only): `components/format-capability/GlobalFormatCapabilityPyramid.tsx:593`
  (`get_global_format_capability_pyramid`), `components/clients/PublishingPlanPyramid.tsx:812` ("Format Mix
  Matrix"), `components/clients/ClientCapabilityOverlay.tsx:248`. Studio capability matrix API
  `app/api/studio/capabilities/route.ts` (`get_studio_capabilities`).
- Template registry (TMR) read-only + **empty**: `/create/templates`
  (`app/(dashboard)/create/templates/page.tsx:8-11`; `actions/tmr-templates.ts:22-24` "live but empty"). It
  does **not** consume `template_registry_status` (grep: not found).
- Content Studio (already a write surface, create+approve only): `/content-studio`
  (`app/(dashboard)/content-studio/page.tsx`), modes create/ideas/series/analyse; create paths
  `create_creative_intent`/`create_manual_slot`/`create_content_series`; **no edit-existing / delete affordance found**.
- Global Client Picker v1 **shipped** but Content-Studio-scoped (`components/global-client-picker.tsx`,
  `lib/client-context.tsx`); **Slice 3 deferred** (`docs/dashboard/global-client-picker-v1-brief.md §8-9`).
- Known hazards: vendored creative-library registry **"goes STALE SILENTLY"** (`actions/creative-library.ts:686`);
  orphaned `AddTemplateDraftWizard.tsx` + diverged dashboard `main` (CE register v5.99); `docs/dashboard/
  static-image-governance-v1-brief.md` (PROPOSAL, unbuilt); `docs/dashboard/operator-journey-ia-v1.md` (IA spec).

## Scope

**In scope — delivered as slices (read-only first, then writes; each slice its own gate):**

- **Slice 0 — Truth-wired 3-axis matrix (READ-ONLY).** Add the **format-type** axis to the visibility so the
  operator sees **platform × format × format-type**, and wire the governance/template surfaces to **live CE
  truth** (the `ice_ro` views — `template_registry_status`, `asset_governance_status`) instead of the vendored
  stale snapshot / empty TMR. Honest "stale/empty" states replaced with live coverage. No writes.
- **Slice 0.5 — Governance role model (PREREQUISITE for S1).** Introduce the dashboard's first minimal
  role/permission model: a `governance` role. Only governance-role users see and can invoke the S1
  governance-write affordances; every other authenticated user stays read-only on those surfaces. Closes the
  "any authenticated user reaches every write" gap (`middleware.ts` gates only session existence; all writes
  use the service-role key). This is the **authz decision PK made 2026-07-21 (role-gated)** and the external
  review's escalated critical-path item — it **gates S1 and must land first.**
- **Slice 1 — Operator governance CRUD (the core; GATED BY S0.5's role model).** In-UI write affordances for the cc-0044 operations,
  each replacing an `execute_sql` step: (a) enable/disable `client_creative_governance(client,format)`;
  (b) set/change `client_asset_pool_policy` (client_only / client_preferred / best_fit · allow_global_shared);
  (c) promote/fence a shared background or brand asset (fenced→governed CAS flip); (d) assign a template +
  record `visual_approval` proof. Fenced-until-approved default; pool-neutrality preserved; CAS/fail-closed;
  in-UI human-approval gate; full audit. **Each is a production-governance write → its own T3 lane.**
- **Slice 2 — Content Studio editing.** Add **edit** (and where safe, delete/withdraw) affordances for
  existing drafts / intents / series — not just create + approve. Grounded in the existing Content Studio
  component + write-RPC structure.
- **Slice 3 — Leftovers sweep.** GCP Slice 3 (`?client=` URL sync + aggregate-page opt-in filters); dispose
  the `static-image-governance-v1` proposal (build or retire); resolve the orphaned `AddTemplateDraftWizard.tsx`
  + diverged dashboard `main`; kill the vendored-registry silent-staleness (Slice 0 makes it live); run
  `dashboard-ia-lint` against the IA spec on each surface.

**Out of scope:**
- Any change to CE backend behaviour, RPCs, EFs, migrations, or the cc-0044 governance semantics — the UI
  *drives* the existing backend; it does not redefine it. New CE RPCs, if genuinely needed for a write the UI
  can't safely do via existing functions, are a **separate CE-side brief/gate**, not this arc.
- cc-0044 closeout (done, register v6.06) and its deferred arcs (NDIS prod video, fenced backgrounds, CFW B1).
- Auth provider replacement; building a full RBAC system beyond the minimal authz decision named below.

## Allowed actions

- Read-only mapping/analysis of both repos; consume `ice_ro` views and existing read RPCs.
- Dashboard code changes on a dedicated dashboard branch, **behind a feature flag**, slice by slice, in the
  fresh dashboard session.
- Wire the UI to **existing** CE read RPCs/views and **existing** write RPCs where they already exist.
- Per write slice: run the ICE chain (branch-warden; `db-rls-auditor` on any new/changed DB interaction;
  `dashboard-ia-lint`; external review pinned to the diff hash) and stop at the PK gate before deploy.

## Forbidden actions

- No production-governance write ships without: the T3 chain, an in-UI human-approval step, fenced-until-
  approved default, pool-neutrality assertion, CAS/fail-closed, a written+validated rollback, and the PK gate.
- Do not add any S1 governance write reachable by **any** authenticated user — the **Slice 0.5 `governance`
  role gate must be in place first** (PK decision 2026-07-21). Service-role + no-role-model must not silently
  become "anyone can promote a production asset."
- No CE backend/RPC/migration/EF/deploy change under this arc. No touching the diverged dashboard `main`
  reflexively. No `git push`/deploy without the PK gate. Do not un-fence/promote any real asset as a test.
- Do not treat the vendored registry as truth; do not ship visibility that can silently go stale.

## Success criteria (per slice; the arc is done when all pass)

- **S0:** the operator sees a live platform × format × format-type matrix sourced from `ice_ro` views (not the
  vendored snapshot / empty TMR); staleness is impossible or visibly flagged; read-only, no regressions.
- **S0.5:** a `governance` role gates the S1 write affordances — a non-governance user sees those surfaces
  read-only and cannot invoke a governance write; a governance user can; enforced server-side (not just hidden
  buttons); audited. No regression to existing (non-governance) write paths.
- **S1:** an operator completes each of the five cc-0044 governed operations **entirely through the UI** on a
  test/staging path, with the human-approval gate, audit row, pool-neutrality, and rollback all demonstrated —
  and zero `execute_sql` needed for that operation. Each op's T3 chain is clean and PK-gated.
- **S2:** an operator can edit an existing draft/intent/series through Content Studio; existing create/approve
  paths unregressed.
- **S3:** GCP Slice 3 shipped or explicitly parked; the leftover items each dispositioned (built/retired/tracked);
  `dashboard-ia-lint` PASS (or NO_GOVERNING_RULE surfaced) on the touched surfaces.
- **Arc:** the authz decision for sensitive writes is made and enforced; every write slice deployed under the
  PK gate; register + result docs record each slice.

## Stop condition

Per slice: report per the result template, stop at the PK gate before any deploy. The arc advances one slice
at a time; a slice's gate is not consent for the next.

---

## Notes

- **Recommended order & why:** S0 first (read-only, makes the operator *trust* what they see and de-risks the
  writes by surfacing true state); then S1 (the highest-value gap — governance CRUD); S2 and S3 can interleave.
  S1's four operations are independent T3 lanes and can ship one at a time (pool-policy or governance-enable are
  the gentlest first targets; asset-promotion is the most sensitive — do it last, with the most scrutiny).
- **Authz for sensitive governance writes — RESOLVED (PK 2026-07-21): role-gated.** A minimal `governance`
  role/permission model (Slice 0.5) gates every S1 write; non-governance users stay read-only on those
  surfaces. This closes the "any authenticated user reaches every write / service-role bypasses RLS" gap the
  external review escalated (review `f4139c7d`, partial→PK). Slice 0.5 lands before S1; still keep the
  per-write in-UI confirm + audit + fenced-default + CAS + pool-neutrality on top of the role gate.
- **First build session:** a fresh session scoped to `invegent-dashboard`, on its own branch. This brief is
  that session's gate-1 input; the cc-NNNN number is claimed there per CCF-02.
- This brief is scoped to the dashboard arc only; cc-0044 is closed (register v6.06).
