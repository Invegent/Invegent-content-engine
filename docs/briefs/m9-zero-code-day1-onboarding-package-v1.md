# M9 — Zero-Code Day-1 Client Format-Mix Onboarding Package (v1, design spec)

**Created:** 2026-08-05 Sydney · **Author:** orchestrator (docs-only lane `m10-m9-docs-foundation`)
**Status:** DRAFT — satisfies the **spec-authoring half only** of M9's finite acceptance test
(`docs/briefs/creatomate-global-ultimate-final-delta-audit-v1.md:398`). The **replay half** — executing
this package end-to-end against a real brand with zero worker-code changes — is explicitly **not
performed** by this document and stays gated behind the §6 schedule-expansion PK approval, which has not
yet been obtained (`creatomate-global-ultimate-final-delta-audit-v1.md:581-583`). M9 stays **OPEN** in the
register until both halves close and PK ratifies.
**Class:** docs_only — 0 code / 0 DB / 0 migration / 0 RPC / 0 deploy / 0 replay execution by this document.
**Extracted from:** the one real precedent that exists — NDIS Yarns' S6 Slice A zero-code format-mix
enrolment (`docs/briefs/results/s6-slice-a-ndis-format-mix-enrolment-applied-v1.md`, applied 2026-08-01).
**Replay-target default (PK ruling, §0f, 2026-08-04):** an existing active brand entering a genuinely new
governed format-mix, the same evidentiary shape as NDIS's original proof; an isolated fixture brand only if
no real brand is eligible at execution time
(`creatomate-global-ultimate-final-delta-audit-v1.md:224-225,593-595`).
**Governing milestone:** M9, `docs/briefs/creatomate-global-ultimate-final-delta-audit-v1.md:398`.

> **Explicitly NOT the same thing as `docs/09_client_onboarding.md`.** That document is a whole-new-client
> acquisition SOP (contract → first publish, ~4–6 hours across 13 raw-SQL-editor steps, `:34-35`) for a
> client that does not exist yet. This package governs an **already-active, already-onboarded brand**
> entering a **new governed format-mix** — a narrower, later-stage, zero-code operation. This document
> does not modify, retire, or supersede `09_client_onboarding.md`; the two apply to different situations.

---

## 0. What this package is — and is not

**Is:** a documented, reusable spec for the governance rows, asset/config state, and proof evidence a
brand needs **already in place** so that flipping one allocation-eligibility switch
(`c.client_control_tower_enrollment`) is safe, and the brand starts receiving the new format in its weekly
allocation — with a content-engine code diff of **zero**.

**Is not:** a new-client acquisition flow (§ header note above); the replay execution itself (§7 defines
what "done" looks like, it does not authorize doing it); a claim that any specific brand is ready today
(§7 names the live facts that must be independently re-verified at execution time, not assumed from this
document).

---

## 1. Required client data

The brand must already be an **active** client — `c.client.status='active'`, already carrying the identity,
platform profiles, publish credentials, and tracking infrastructure that
`docs/09_client_onboarding.md` covers for a brand-new acquisition. **This package's "zero-code" claim is
scoped entirely to an existing brand adding a new format-mix; it presupposes, and does not re-derive, a
completed prior onboarding.**

---

## 2. Assets and governance rows — the Day-1 package, precisely

Three layers, ordered by when they must be true. Layer C (the actual enrolment) is the only layer any prior
zero-code precedent has exercised; Layers A and B are prerequisites that precedent presupposed already true
rather than created.

### Layer A — Creative substrate (must exist and be PK-approved BEFORE Layer C)

- **Asset pool**, per target platform: **≥4 governed backgrounds** (the ratified floor actually applied
  when bringing Care For Welfare/Invegent up from 0–1 backgrounds, cc-0073 D0 gate — stricter than this
  register's own proposed floor of 3, `docs/briefs/ice-asset-gap-register-v1.md:113,332-334,375-386`),
  target depth 8–12; **1 promoted primary logo minimum**; brand colours filled (primary+secondary target).
  If the format is voiced video: **3 minimum / 8–10 target music beds**, **3 minimum / 8 target B-roll
  clips**. Sourcing goes through `image-harvester` + `image-reviewer`, always PK-visual-gated — no asset
  auto-promotes (CLAUDE.md, image-harvester/image-reviewer rows).
- **Voice config**, if the format needs voice: one `c.client_voice_config` row (`elevenlabs_voice_id`,
  `enabled=true`). This is now a **live, dashboard-editable, zero-code** surface — RPC
  `save_voice_config`/`get_voice_config` (upsert-capable, `SECURITY DEFINER`, `service_role`-only,
  `supabase/migrations/20260729150000_cc0086_voice_config_write_rpc_v1.sql`), dashboard panel
  `invegent-dashboard/components/clients/BrandHostVoiceTab.tsx` — shipped and applied 2026-07-29
  (`docs/briefs/results/cc-0086-brand-host-voice-config-result-v1.md:16-55`). At last verified read, only
  Property Pulse and NDIS Yarns had a row at all; Care For Welfare and Invegent had none
  (`docs/briefs/cc-0086-brand-host-voice-config-brief-v1.md:47-53`) — a real, still-open instance of
  exactly the gap this package exists to close for.
- **Creative Library v2 declarative registry entries** — a Style Guide, ≥1 Template Family with a variant
  reaching `proof_status=proven`, the Patterns it composes, and a Capability Contract with a deterministic
  `gate`/`maps_to_variant` (`docs/creative-library/registry-schema-v2.md` §1–§3, §7). **This layer is
  declarative documentation only — it is not itself the runtime gate** (`registry-schema-v2.md:168-175`,
  §6 posture: "not consumed by production workers"). The runtime gate is Layer B below.
- **Provider template registry rows**: `c.creative_provider_template` at `status ≥ smoke_rendered`,
  `c.creative_template_client_assignment` at `assignment_status ≥ visually_approved` **with a passed
  `visual_approval` proof event on that specific assignment**, and a platform-suitability row present —
  this is the actual `select_template` eligibility gate (see M10 §2 for the full decision chain;
  `supabase/migrations/20260703035154_create_select_template_v1.sql:19-45`).

### Layer B — Runtime governance gate

- **`c.client_creative_governance` row**: `(client_id, format, enabled=true, contract_ref,
  declarative_registry_ref, render_label)` — schema
  `supabase/migrations/20260707000000_create_client_creative_governance_v1.sql:34-71`.
  **Open verification item:** at authoring (2026-07-07) this table was explicitly "dark/additive — no
  worker, publisher, gate, or enablement path reads it yet," with one seed row only
  (`:16-20,62-71`). **Whether a subsequent v2 live-gate rewire has since landed was not independently
  confirmed in this pass — replay execution MUST verify this table's current read-status live before
  relying on it as the operative gate.**
- **`c.client_format_config` row(s)** per platform, if the format needs an explicit enable/cap. **Note the
  asymmetry against Layer C's enrolment table: absence of a `client_format_config` row defaults the format
  OPEN (available)**, not closed — an explicit `is_enabled=false` row is the only way to hard-disable
  (`supabase/migrations/20260428055331_audit_f002_p1_column_purposes_corrected.sql:131-133`).
  `max_per_week` (nullable — NULL means no per-format throttle) is the other governed column confirmed via
  consumer queries. **No `CREATE TABLE` for this table exists in tracked migrations — the full column DDL
  could not be cited from repo source in this pass and must be read live (`information_schema`) before
  replay execution treats this layer as fully specified.**

### Layer C — Allocation-eligibility switch (the one real zero-code precedent)

The entire NDIS S6 Slice A enrolment — the only zero-code format-mix enrolment ICE has actually executed —
was exactly **two rows**, presupposing Layers A and B already true:

1. **One `c.client_control_tower_enrollment` row**: `client_id`, `platform` (NULL = client-scoped, or a
   specific platform), `control_type='format_mix'`, `enabled=true`, `rollout_stage='enforce'`,
   `approval_status='approved'`, `status='active'`, `effective_from=<date>`, `version=1`,
   `changed_by`/`approved_by`/`reason`/`notes` naming the authorizing packet and PK ruling. Bound by the
   invariant `enabled=false OR (status='active' AND approval_status='approved' AND
   rollout_stage='enforce')` (`supabase/migrations/20260628120000_control_tower_p1_enrollment_format_mix.sql:51-97`).
   Unique index enforces one current-active row per `(client_id, platform, control_type)`.
2. **One `c.client_format_mix_audit` append-only row**: `action='enroll_format_mix_slice_a'`,
   `before_data=NULL`, `after_data=to_jsonb(inserted row)`, `actor`, `approval_status`, `request_source`,
   `version_to=1` (`docs/briefs/s6-slice-a-enrolment-apply-packet-draft-v1.md:65-67`).

Applied as **one fail-closed `DO $$ … $$` migration** with pre-image assertions (C-1…C-6) and a symmetric
rollback (R-1…R-4) — the house pattern to reuse for any future replay
(`docs/briefs/s6-slice-a-enrolment-apply-packet-draft-v1.md:69-262`).

**What this switch does NOT do:** it does not create readiness — it only flips the allocation-eligibility
gate `m.format_mix_enrolled(client_id)` that `m.materialise_slots` reads via the S7 capability guard in
`m.build_weekly_demand_grid`. Layers A and B must already be true, or the switch is safe-but-useless (the
brand becomes eligible for an allocation it cannot actually fulfill).

**A refinement over the precedent, named explicitly:** S6 Slice A deliberately did **not** commit its
migration `.sql` file to the repo, specifically to keep the content-engine git diff at literal zero
(`docs/briefs/results/s6-slice-a-ndis-format-mix-enrolment-applied-v1.md:17-25`). This was separately
flagged as a live, **unresolved** migration-ledger-vs-git drift hazard (`docs/00_action_list.md`, the
`tmr-drift-probe` carry line). **This package recommends a cleaner reading for future replays: "zero code
diff" should mean zero diff in worker/application code (`supabase/functions/**` and the dashboard repo),
not zero diff in the migration ledger.** Committing the migration file is auditability, not a code change,
and avoids re-creating the same unresolved drift hazard on a second replay. This is a spec refinement, not
a criticism of the precedent's actual safety — the S6 Slice A apply itself passed every fail-closed
assertion it declared.

---

## 3. Provider configuration

No client-specific Creatomate account/API-credential configuration is required for a Day-1 format-mix
enrolment. Provider template IDs are already registered platform-wide in `c.creative_provider_template`;
per-client scoping happens entirely at the assignment (`c.creative_template_client_assignment`) and
governance-row (Layer B) level, not at the provider-account level. Creatomate key rotation / managed
storage is a separate, standing must-have (M11's parallel security lane, M18,
`creatomate-global-ultimate-final-delta-audit-v1.md:407`) — **explicitly not part of Day-1 onboarding and
not touched by this package.**

---

## 4. Readiness and proof ladder

The **canonical, currently-applied** template proof ladder — the one actually used to reconcile live
template rows (`docs/briefs/results/creatomate-registry-integrity-graduation-contract-v1.md` §1.2) — is the
ladder a new format-mix's templates must have already climbed before Day-1:

| # | State | Requires | Dimensionality |
|---|---|---|---|
| 1 | `candidate` | Registry knows the provider template; not yet visually reviewed | provider-template-only |
| 2 | `visually_approved` | PK approved a rendered preview for a specific client | client + format |
| 3 | `ready_for_proof` | Field contract mapped, asset resolution wired, dimensions match; no real render attempted | template + format |
| 4 | `render_proven` | ≥1 real render succeeded through the actual worker path | template + format |
| 5 | `real_draft_proven` | Render consumed into a genuine `m.post_draft` for a specific client | client + format + template |
| 6 | `publish_proven` | Draft actually published | client + format + platform |
| 7 | `production_proven` | Sustained, repeated, **client-attributed** real usage — never inherited from another client or a template-level aggregate | client + format (+ platform) |
| 8 | `blocked` | No path to `render_proven` today (fence, missing prerequisite, unreachable object) | usually template + format |
| 9 | `retired` | Provider object deleted/superseded — never selectable again, propagates everywhere | provider-template-wide |

Binding rule: **no rung is skippable by having a later one** — a successful render does not retroactively
supply a visual approval that was never given.

**Two things this package deliberately does NOT adopt, named rather than silently resolved:**
- The earlier 5-rung discovery-brief proposal
  (`docs/briefs/tmr-template-proof-lifecycle-v1-discovery-proof-model-brief.md` §6) is **superseded** by
  the 9-state ladder above and should not be cited as current.
- The WS-5 PP-kinetic lane's own "rung 6…13" numbering
  (`docs/briefs/results/ws5-constraints-shape-design-lane-result-v1.md:243-266`) is an **unreconciled local
  variant** that does not match the 9-state ladder's own numbering (there, visual approval is rung 2, not
  6). This package flags the inconsistency for PK rather than silently picking a side — a future replay
  should not import the "rung 6" language without reconciling it first.

`public.classify_format_capability` is the read-only, non-gating, operator/dashboard-facing rollup of
ladder position (`ready/asset_shortage/template_missing/pipeline_missing/governance_unproven/
unsupported_silent_degrade/publisher_path_missing`) — useful for §5/§7's verification steps, but it "does
NOT gate, block, or change any production behaviour" (`supabase/migrations/20260728034955_classify_format_capability_v1.sql:20-24`).

---

## 5. Dashboard visibility

**Honest, partially-verified status — not a clean "yes" or "no."**

- **Shipped and live:** the global client picker (Slices 1–3, `main==a6c527d`, 2026-07-26) syncs
  `?client=` across `/client-profile`, `/creative-library`, `/clients`
  (`invegent-dashboard/docs/dashboard/global-client-picker-v1-brief.md:1-19`). `monitor`/`pipeline-log`
  remain cross-client aggregates, explicitly not covered.
- **Dashboard components referencing format-mix/readiness concepts exist** —
  `components/clients/WeekFormatAllocation.tsx`, `WeekFormatPlanTab.tsx`, `CreativeConfigGapCard.tsx`,
  `PublishingPlanPyramid.tsx`, and actions `production-readiness-queue.ts`,
  `publishing-plan-pyramid.ts`, `client-creative-config-audit.ts` (confirmed present by name/grep; **not
  read in full in this pass**).
- **A real, unresolved contradiction:** the dashboard's own accepted operator-journey IA
  (`invegent-dashboard/docs/dashboard/operator-journey-ia-v1.md`) — a 7-beat spine, Create → Track →
  Approve → Render → Queue/Schedule → Publish → Learn — **never mentions format-mix or brand-governance
  administration UI anywhere.** That spine is about content production, not about administering
  `client_control_tower_enrollment`/`client_creative_governance`/`client_format_config` state. This
  directly contradicts the apparent existence of the components named above.

**This package does not resolve the contradiction** — it names it as an open item (§9) and recommends a
dedicated dashboard-visibility read (or a `dashboard-ia-lint` pass, once that agent is proven) **before**
replay execution claims an operator can see a brand's Day-1 package completeness in one place. Replay
execution should treat "can an operator see this brand's readiness state today" as a finding to make, not
an assumption to carry in.

---

## 6. Operator decisions

| Decision | Who | Evidence required | Gate tier |
|---|---|---|---|
| Asset pool sufficiency (≥4 backgrounds/platform, logo, colours) | PK (visual) | `image-reviewer` package + PK visual sign-off | T2, per image-workflow §2 non-negotiables |
| Template visual approval → `assignment_status='visually_approved'` | PK | `visual_approval` proof event, `passed`, concrete evidence reference | T2 |
| Governance-row creation/enable (`client_creative_governance`, `client_format_config`) | PK apply gate | `db-rls-auditor` + `branch-warden` clean | T2 (dark/additive DB) |
| Replay-target brand selection | PK, **at execution time, not pre-committed here** | §0f default (existing brand) vs. fixture fallback, decided against live eligibility | governance decision |
| Allocation-eligibility enrolment flip (`c.client_control_tower_enrollment`) | PK apply gate | full chain: `db-rls-auditor`, `branch-warden`, external review pinned to hash, rollback validated | T2/T3 per CLAUDE.md's risk-tiered review chains (DML ≥ T2) |
| §6 schedule-expansion approval | PK | — a **separate, not-yet-obtained** gate the *replay* (not this spec) requires before execution | hard PK gate, `creatomate-global-ultimate-final-delta-audit-v1.md:581-583` |

---

## 7. Replay acceptance criteria

**This section defines what "done" looks like when PK clears the §6 gate and authorizes execution — it is
not itself that authorization, and no replay is performed by this document.**

**Preconditions to independently, live-verify before replay** (not to assume from this document):
1. Whether `c.client_creative_governance`'s live-gate read path has landed since its 2026-07-07 dark/additive
   state (§2 Layer B).
2. The exact `c.client_format_config` DDL/semantics (needs a live `information_schema` read — §2 Layer B).
3. Dashboard visibility depth (§5) — what an operator can actually see before/during the replay.
4. The target brand's real, current asset-pool depth and ladder position for the target format (§2 Layer A,
   §4) — do not assume from this document's examples.
5. Per M11a: confirm the target client×format×platform cell is not **already** quietly legacy-routing under
   the same format key before treating the replay as "a genuinely new format-mix" — a governance-row-timing
   window (M10 §9) can make a cell look new when legacy traffic already exists under it.

**Zero-code-diff verification method:** `git diff` against `supabase/functions/**` and any dashboard
application code paths must be empty. Per §2 Layer C's refinement, the migration `.sql` file itself
**should** be committed for auditability — "zero code diff" is scoped to worker/application code, not the
migration ledger.

**Post-replay independent verification — mirroring the CGU-v1 R1/R2/R3 method
(`docs/briefs/results/cgu-v1-final-reread-and-verdict-v1.md:9-25`):**
- **R1 — queue:** `classify_format_capability`/the production-readiness queue shows the target cell(s)
  `ready`, with zero new unowned non-`ready` cells introduced.
- **R2 — proof events:** a real proof-event/publish-evidence chain exists for the new cell — at minimum a
  `platform_render` proof event; `platform_publish` if the replay runs to an actual publish.
- **R3 — provenance:** a real draft with `created_by`/`slot_backed` fields consistent with the governed
  fill → advisor → synthesis → render → publish chain — not a synthetic or manually forced draft.

**Replay is not authorized by this document.** It remains gated behind the §6 schedule-expansion PK
approval (§6 table, last row).

---

## 8. Acceptance matrix (for this document)

| # | Required content | Grounded in | Status |
|---|---|---|---|
| 1 | Required client data (§1) | `09_client_onboarding.md` scope contrast | PASS |
| 2 | Assets and governance rows (§2, Layers A–C) | S6 Slice A packet, cc-0086, asset-gap register, registry-schema-v2, TMR-3 schema | PASS |
| 3 | Provider configuration (§3) | Provider-template registry scope, M18 exclusion | PASS |
| 4 | Readiness and proof ladder (§4) | Graduation contract §1.2 (canonical), superseded/unreconciled ladders named | PASS |
| 5 | Dashboard visibility (§5) | Client picker brief, operator-journey IA, named contradiction | PASS WITH NAMED GAP |
| 6 | Operator decisions (§6) | CLAUDE.md tiering, image-workflow §2 non-negotiables | PASS |
| 7 | Replay acceptance criteria (§7) | CGU-v1 R1/R2/R3 method, zero-diff refinement | PASS |
| — | **M9's own finite acceptance test, spec half** (delta-audit `:398`): *"Author the Day-1 governed setup package as a spec"* | This document | **DRAFT COMPLETE — pending PK ratification** |
| — | **M9's own finite acceptance test, replay half**: *"replay it end-to-end with zero worker-code changes"* | Not attempted by this document | **OPEN — gated behind §6 approval** |

---

## 9. Dependencies

```
§6 schedule-expansion PK approval ─────────────────────→ replay execution authorized
                                                            (this document does NOT clear this gate)
M11a inventory (avoid replaying into a cell already
  quietly legacy-routed under the same format key) ────→ informs replay-target selection
cc-0086 voice-config surface (live) ──────────────────→ satisfied, reusable as-is
Asset-pool sourcing lane (image-harvester/-reviewer,
  PK-gated) ─────────────────────────────────────────→ may itself be a prerequisite lane if the
                                                            target brand's pool is below floor —
                                                            not assumed pre-existing
```

- **§6 schedule-expansion PK approval** blocks the **replay only**, not this spec.
- **M11a's inventory** informs which brand/format-mix combination is genuinely new vs. already quietly
  legacy-routed.
- **cc-0086's voice-config surface** is already live and satisfied — no further build needed there.
- **Asset-pool sourcing**, if the target brand's pool is below the §2 Layer A floor, is a separate,
  PK-gated lane in its own right — this package does not assume any brand's pool is already sufficient.

---

## 10. Exclusions (out of scope — this document)

Replay execution · true fifth-brand (net-new client) onboarding — that remains
`docs/09_client_onboarding.md`'s domain, unchanged · any DB/migration/RPC write · resolving whether
`c.client_creative_governance`'s live-gate rewire has landed · resolving the exact `c.client_format_config`
DDL · a dashboard-visibility audit (named handoff, §9/§11, not performed here) · reconciling the WS-5
"rung 6–13" proof numbering against the canonical 9-state ladder (§4, named not resolved) · closing M9 in
the register (a PK ratification act).

---

## 11. Open questions / named handoffs

1. **`c.client_creative_governance` live-gate status** — verify whether the v2 rewire deferred at
   2026-07-07 authoring has since landed, before any replay treats this table as the operative runtime
   gate (§2 Layer B).
2. **`c.client_format_config` exact DDL** — no `CREATE TABLE` exists in tracked migrations; a live
   `information_schema` read is required before replay treats this layer as fully specified (§2 Layer B).
3. **Dashboard visibility depth** — the named contradiction between the operator-journey IA (no
   format-mix-governance UI mentioned) and the components found by name (§5) needs a dedicated read or a
   `dashboard-ia-lint` pass before replay assumes either "no visibility" or "full visibility."
4. **The WS-5 kinetic lane's "rung 6–13" numbering** is inconsistent with the canonical 9-state ladder and
   is flagged, not resolved, here (§4).
5. **Migration-ledger-vs-git commit convention** — this package recommends committing the migration file on
   future replays (§2 Layer C); PK should confirm or override this refinement before the first replay.
