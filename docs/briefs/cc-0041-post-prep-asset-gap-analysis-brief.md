# Brief cc-0041 — Post-prep asset-gap analysis → suggestion table → routine harvest (design + schema)

**Created:** 2026-07-19 Sydney · **Revised:** 2026-07-19 (rev-3 — FINAL design, per PK Gate-1 "ARCHITECTURE APPROVED WITH FINAL TARGETED REVISION")
**Author:** chat (Post-Prep Asset-Gap Analysis lane)
**Executor:** Claude Code (design only) — DDL apply + analyzer + routine are later separate PK gates
**Status:** draft (final design; submitting for Gate-1 sign-off before any DDL)
**Result file:** `docs/briefs/results/cc-0041-post-prep-asset-gap-analysis.md` (created on completion)

**Tier (split, per rev-2 ruling #9):**
| Sub-step | Tier |
|---|---|
| This Gate-1 design brief (design/docs only) | **T1** |
| Prereq 0A shared-asset suitability substrate · 0B `c.client_asset_pool_policy` | **T3** (additive DB) |
| Read-only appetite/inventory derivation (`derive_asset_appetite` + eligibility check, ships dark) | **T2** |
| `m.asset_gap_suggestion` + `m.asset_gap_observation` + RLS migration **and** the analyzer that writes them | **T3** |
| Automated harvester drain routine | **separate future T3** |
| Asset promotion | **existing PK-controlled hard gate (unchanged)** |

**Lane class (CCF-02):** SIDE_PROVING. **Combined-gap decision (PK):** option (a) — a governance/template-masked asset shortfall is **recorded as demand evidence** but is **not drainable** until the masking gap clears.

---

## Task

Design — **not apply** — the demand-intelligence loop: for a prepared post, derive its asset appetite *before* inventory resolution (deterministically), evaluate eligible inventory across the pools its client policy permits, emit a **dual-axis** verdict (remediation route × asset-demand state), and record a detected asset gap as an aggregated, client-specific row in a new operational queue that a routine later drains — for **`drainable`, `open`, `static_background`** rows only — via the governed image-harvester (→ image-reviewer → PK visual gate; **never** auto-promote).

This rev-3 brief adopts all seven final corrections and returns: the dual-axis classifier, the final appetite signature, the two prerequisite schemas/interfaces, the deterministic candidate-selection rule, the revised table columns + child observation table, and the drain query — then STOPs before any DDL/analyzer/scheduling/harvesting.

## Source context (evidence — verified in source this lane)

- `_harness/lane_seeds/post-prep-asset-gap-analysis-lane-seed-v1.md` — originating idea; generic-bucket suitability dependency.
- `supabase/migrations/20260711065353_tmr4_generic_template_tags_and_asset_appetite.sql` — appetite substrate: `c.creative_provider_template.{image_slot_min,image_slot_max,needs_governed_background,text_overlay_safe_required}` + tag tables (`vertical/use_case/tone/motion_treatment/length_class/aspect_fit`; template overrides family within a namespace).
- `supabase/migrations/20260703035154_create_select_template_v1.sql` — **verified:** composes `resolve_slot_assets` at step f, reached **only** after scope→status→platform→assignment→proof (a–e) pass; per-candidate reasons in `rejected[]`; **reads no appetite column/tag, returns no appetite metadata**. Candidate scan order is deterministic: `t.created_at ASC, t.id ASC, vc.variant_key ASC`.
- `supabase/migrations/20260703002813_create_resolve_slot_assets_v1.sql` — **verified:** read-only asset-only check on `c.client_brand_asset` for a *given* template+client; **ignores** assignment/proof/suitability. `ok` = fillable; `fail_closed` `no_governed_background`/`missing_required_logo`. Correct primitive for the **independent** asset check that defeats governance masking.
- `m.post_draft(post_draft_id)` — the prepared post; nullable-FK `ON DELETE SET NULL` precedent: `20260618090000_agp_d01_3_avatar_shadow_resolver_telemetry.sql`.
- CLAUDE.md — image-workflow §2 (PK visual verdict is the only deciding act) · CCF-04 (remove the toil of noticing, never the judgment of accepting) · NDIS sensitive real-imagery staged lane (sensitivity fences).
- Memory: `client-brand-asset-fence-model` (only `is_active` is a column; `approved`/`safe_for_text_overlay` are `asset_meta` keys) · `generic-template-library-tmr4` · `image-workflow-acceleration-v1`.

## Scope

**In scope (design only):**
1. **Prerequisites first (§Prereqs):** 0A shared-asset suitability substrate · 0B `c.client_asset_pool_policy`. The analyzer cannot truthfully say it "checked every permitted pool" until both exist.
2. **Deterministic pre-resolution appetite projection** (`derive_asset_appetite`) — maps the post to a deterministically ranked candidate template set (pre-governance), derives a canonical appetite per candidate, and either evaluates the unambiguous top appetite or classifies ambiguity as `template_gap / ambiguous_asset_appetite` (§Deterministic rule).
3. **Pool-policy-aware inventory evaluation** honoring per-asset `governance_scope` and the client's pool policy; a MISS exists only after **all permitted pools** are checked. Asset check run **independently** via `resolve_slot_assets` so governance masking cannot hide demand.
4. **Dual-axis classifier** (§Artifact A): `primary_route` × asset-demand state.
5. **Queue schema** `m.asset_gap_suggestion` (aggregated, client-specific) + child `m.asset_gap_observation` (§Artifacts C/E) — additive, fenced, RLS deny-all, service-role-only. **Columns proposed here; DDL is the next gate.**
6. **Routine consumer spec** — drains only `drainable/open/static_background`; bounded governed manifest; fenced candidates only; cannot approve/promote/broaden.

**Out of scope (hard):** no auto-approval/promotion/publish; no eligibility or pool-policy broadening; no live draft mutation; no synchronous draft-prep change; no migration/RPC/EF/cron applied this lane; no new harvest source/licence policy; v1 drainable scope = `static_background` only (video B-roll & logo gaps recorded but not drained by the background harvester); no edits to `select_template`/`resolve_slot_assets` (surface defects, don't patch).

## Allowed / Forbidden actions

**Allowed:** read repo/migrations/registers/CLAUDE.md; read-only live-schema confirmation via db-rls-auditor (no collision on the two new `m.` tables; confirm whether 0A metadata already exists; confirm where pool policy could live); write the design packet + artifacts to `docs/briefs/`; run db-rls-auditor + `ask_chatgpt_review` (hash-pinned, `reviewed_input_hash` mandatory) on the **design**.

**Forbidden:** any `apply_migration`/`execute_sql` DDL·DML/`deploy_edge_function`/cron/push; any mutation of `m.post_draft`, `c.client_brand_asset`, `c.creative_*`, or production; marking anything proven/approved/promoted/governed; real harvesting; new appetite/tag vocabulary without a PK decision. Honor holds: NDIS real-imagery staged (person-free Phase-1, own gate); D6 Lane 3/4 untouched; sensitivity fences enforced in the eligibility contract, never bypassed.

## Success criteria

- Appetite derived **before** resolution and **deterministically**; ambiguous equally-ranked appetites → `template_gap/ambiguous_asset_appetite`, no sourcing.
- Dual-axis verdict: `primary_route` routes remediation; `asset_gap_detected`+`asset_gap_drainability` govern demand recording and drainability. A governance/template-masked asset gap is recorded (`blocked_by_governance`/`blocked_by_template`) but never drained.
- Inventory MISS defined only after all client-policy-permitted pools checked; asset check independent of governance state.
- `m.asset_gap_suggestion` client-specific (signature includes `client_id`), aggregated, with the seven-state lifecycle, routing/drainability/scope fields, queue-safety fields, and **no** licence/sha; `m.asset_gap_observation` child carries per-post evidence. `resolved` requires a promoted asset + successful recheck.
- Both prerequisites (0A, 0B) specified; absence of a pool-policy row means `client_only` (fail-safe).
- Drain query exactly as §Artifact D. db-rls-auditor `clean/pass`; external review recorded with `reviewed_input_hash` == design sha256; non-clean verdicts routed per CCF triage.

## Stop condition

Report this final design + artifacts to PK for Gate-1 sign-off. **STOP before any DDL, analyzer, scheduling, or harvesting.**

---

# Prereqs (explicit inputs — required before analyzer/table DDL)

## Step 0A — shared/generic asset suitability substrate (eligibility contract the inventory check reads)

**PK ruling (2026-07-19) — Option B, greenfield.** db-rls-auditor (project `mbkmaxqhsohbtwsqolns`, read-only) confirmed there is **no shared-asset concept in governance today**: `c.client_brand_asset.client_id` is NOT NULL with 0 null rows (127 assets, each hard-bound to one of 4 clients) and **zero** rows carry any `governance_scope`/`vertical_key`/`shared`/`generic`/`scope` key. So 0A is **100% greenfield**, and PK ruled we express a shared asset in a **dedicated new governed table `c.shared_creative_asset`** — NOT by relaxing the live `c.client_brand_asset` NOT-NULL `client_id`. Client-bound assets stay exactly as-is in `c.client_brand_asset` (implicitly `governance_scope = client_scoped`); the new table holds shared/generic/vertical-shared/purpose-bound assets carrying the full eligibility contract below. This leaves the 127 live client assets and the `resolve_slot_assets` read path **untouched**.

**Consequence for the inventory check (two-source read).** Because shared assets live in a separate table, the *independent* asset check is no longer `resolve_slot_assets` alone (it reads only `c.client_brand_asset` for one client). The analyzer's eligibility step = **(1)** the existing untouched `resolve_slot_assets` over the client's own assets **+ (2)** a new read-only shared-pool eligibility evaluation over `c.shared_creative_asset`, restricted to the `governance_scope`s the client's pool policy permits (§0B) and gated by `allowed/excluded_clients`, `vertical_key`, `sensitivity_class`, `purpose_bound`, `production_use_allowed`. A **MISS** exists only when **both** sources return no eligible fill for the appetite across **all** permitted pools. (v1: `c.shared_creative_asset` is empty at launch, so the shared branch initially returns nothing — but the contract must be honest for `client_preferred`/`best_fit`. Populating it is the governed harvester's job, downstream.) This shared-pool evaluator is read-only, ships dark, and is **design-only** this lane (T2 sub-step); it does not edit `resolve_slot_assets`.

Per-asset fields on **`c.shared_creative_asset`** (greenfield — all new columns; `asset_type`/`platform_scope`/`is_active` mirror the `c.client_brand_asset` real-column names db-rls-auditor confirmed, so the two sources read alike):

```
governance_scope            global_generic | vertical_shared | client_scoped | purpose_bound
vertical_key                e.g. ndis | null
allowed_clients[]           explicit allow-list (empty = governed by scope)
excluded_clients[]          explicit deny-list
asset_kind                  static_background (v1) | logo | image | video_broll
subject_tags[]              sorted
use_case_tags[]             sorted
tone_tags[]                 sorted
platform_suitability[]      fb|ig|li
aspect_ratio[]              supported aspects/crops
brand_neutral               bool
participant_neutral         bool
sensitivity_class           person_free | ...
purpose_bound               bool  (purpose-bound never auto-enters the reusable pool)
licence_allows_multi_entity_use  bool  (a shared asset must permit multi-entity use)
production_use_allowed      bool  (fence)
```

## Step 0B — client asset-pool policy (governed one-to-one object)

`c.client_asset_pool_policy` (proposed, **greenfield**) — one row per client; **no row ⇒ `client_only`** (fail-safe). **PK confirmed (2026-07-19)** the "exclusive-images toggle" is **UI/planned-only — not persisted in the DB** (db-rls-auditor found no such column on `c.client`; closest is `c.client_creative_governance`, a per-*format* enablement toggle, unrelated to asset sharing). So there is nothing to align with or supersede — this table is the first persistent home for pool policy. **Posture note (db-rls-auditor):** schema `c` grants USAGE to anon AND authenticated (unlike schema `m`), so this table's DDL MUST enable RLS + `REVOKE ALL FROM anon, authenticated` (PUBLIC-only revoke is insufficient), mirroring `c.creative_template_family_tag`. Same applies to `c.shared_creative_asset`.

```
client_id                 uuid  PK/unique → c.client(client_id)
pool_policy               client_only | client_preferred | best_fit
allow_vertical_shared     bool
allow_global_shared       bool
client_asset_score_bias   numeric   (ranking bias toward client-owned assets)
minimum_fit_score         numeric   (floor below which an asset is not a HIT)
policy_version            text
updated_at                timestamptz
```

Pool evaluation: `client_only` → client-scoped only. `client_preferred` → client, then permitted shared. `best_fit` → score all permitted pools together. A MISS exists **only after every permitted pool has been checked**.

# Artifact A — Dual-axis classifier (exact)

**Output 1 — `primary_route` (who must act first).** Precedence `system_error > template_gap > governance_gap > asset_gap`.

| `primary_route` | Trigger |
|---|---|
| `system_error` | `select_template.fail_reason='client_not_found'`; any raised exception; resolver unavailable |
| `template_gap` | `fail_reason='format_unmapped'`; `no_selectable_template` where all `rejected[]` ∈ {`wrong_scope`,`status_below_smoke`,`platform_unsuitable`}; **no candidate template/family found**; **`ambiguous_asset_appetite`** (§Deterministic rule) |
| `governance_gap` | for the appetite's candidate template, `rejected[].reason_code ∈ {no_assignment, assignment_not_approved, assignment_blocked, not_visually_proven}` |
| `asset_gap` | no template/governance gap on the candidate template, and the inventory check confirms shortfall |

**Output 2 — asset-demand state (independent; from the direct `resolve_slot_assets` on the candidate template + pool-policy evaluation).**

```
asset_gap_detected:     true | false
asset_gap_drainability:
  drainable            → no template/governance gap · slot_kind = static_background · unambiguous appetite
  blocked_by_template  → a template_gap (incl. ambiguous_asset_appetite) masks the slot
  blocked_by_governance→ a governance_gap masks the slot
  triage_only          → slot_kind ≠ static_background (video_broll, or logo → governed logo intake, not the background harvester)
```

Example: `{ "primary_route": "governance_gap", "asset_gap_detected": true, "asset_gap_drainability": "blocked_by_governance" }` — recorded for demand intelligence, not drained.

**Rule:** `asset_gap_detected` is computed **independently** of `primary_route` (defeats governance masking). The harvester claims only rows that are explicitly `drainable` (see §Artifact D). `system_error` never writes a suggestion.

# Artifact B — Final appetite signature (client-specific aggregation key)

Deterministic hash (sha256 of the canonicalized ordered tuple) → `appetite_signature`; partial-unique while a row is live keeps demand aggregated **per client appetite**.

```
appetite_signature = hash(
  client_id,                       -- v1: keep operational demand client-specific
  client_pool_policy,
  sourcing_target_scope,           -- the scope the harvester should seek for this gap
  vertical_key,
  platform,
  format,
  slot_kind,
  image_slot_min,                  -- canonical slot requirements
  image_slot_max,
  needs_governed_background,
  text_overlay_safe_required,
  aspect_ratio,                    -- crop/orientation requirement
  subject_tags[],  use_case_tags[],  tone_tags[],   -- each sorted
  location,
  sensitivity_restrictions,        -- person_free / participant_neutral flags (sorted)
  asset_kind_version,
  appetite_policy_version          -- policy change re-partitions cleanly
)
```

A repeated MISS **updates** `demand_count`, `last_seen_at`, `latest_source_post_id`, `priority_score`, and inserts an `m.asset_gap_observation` child — never a duplicate live row for the same signature. Cross-client shared-demand is discovered **later** via a derived view grouping open client-level gaps by `vertical + tags + aspect + slot requirements + sensitivity`; the operational queue does **not** conflate client-specific work with global market demand.

# Artifact C — Proposed columns — `m.asset_gap_suggestion` (design; DDL is the next gate)

| Column | Type | Purpose / rule |
|---|---|---|
| `id` | `uuid` PK | Row identity. |
| `appetite_signature` | `text` NOT NULL | Aggregation key (Artifact B). Partial-unique while `status ∈ (open,queued,harvesting,candidates_ready)`. |
| `client_id` | `uuid` NOT NULL → `c.client(client_id)` | Owning client (also in the signature). |
| `client_pool_policy` | `text` NOT NULL CHECK `(client_only|client_preferred|best_fit)` | Policy in force when the MISS was confirmed. |
| `permitted_governance_scopes` | `text[]` NOT NULL | Where the resolver was allowed to look. |
| `preferred_scope_order` | `text[]` NOT NULL | How existing assets were ranked. |
| `sourcing_target_scope` | `text` NOT NULL CHECK `(global_generic|vertical_shared|client_scoped|purpose_bound)` | What the harvester should seek. (`client_only` ⇒ all three effectively client-scoped.) |
| `vertical_key` | `text` NULL | e.g. `ndis`. |
| `platform` | `text` NULL | fb/ig/li (null = agnostic). |
| `format` | `text` NOT NULL | `format_key`. |
| `slot_kind` | `text` NOT NULL CHECK `(static_background|logo|image|video_broll)` | v1 drainable = `static_background`. |
| `appetite_descriptor` | `jsonb` NOT NULL | Canonical appetite (slot min/max, needs_governed_background, text_overlay_safe_required, aspect/crop, subject/use_case/tone tags, sensitivity, candidate `template_id`/`family_id`). Evidence, not authority. |
| `why_needed` | `text` NOT NULL | Asset-only reason (`no_governed_background`/`missing_required_logo`/`assets_fail_closed:*`). |
| `primary_route` | `text` NOT NULL CHECK `(system_error|template_gap|governance_gap|asset_gap)` | Remediation route (Output 1). |
| `asset_gap_detected` | `boolean` NOT NULL | Output 2. |
| `asset_gap_drainability` | `text` NOT NULL CHECK `(drainable|blocked_by_template|blocked_by_governance|triage_only)` | Output 2 (replaces `also_blocked_by`). |
| `status` | `text` NOT NULL default `open` CHECK `(open|queued|harvesting|candidates_ready|resolved|dismissed|failed)` | Lifecycle (Artifact F). |
| `demand_count` | `int` NOT NULL default `1` | Observations for this signature (mirrors the observation child count). |
| `priority_score` | `numeric` NULL | Derived; not scored this lane. |
| `first_seen_at` / `last_seen_at` | `timestamptz` NOT NULL | Demand window. |
| `latest_source_post_id` | `uuid` NULL → `m.post_draft(post_draft_id)` `ON DELETE SET NULL` | Most recent triggering draft. |
| `source_of_demand` | `text` NULL | Latest analyzer run/batch id. |
| `analyzer_version` | `text` NULL | Analyzer that last wrote the row (queue safety). |
| `inventory_policy_version` | `text` NULL | Eligibility/pool-policy version used (queue safety). |
| `attempt_count` | `int` NOT NULL default `0` | Drain attempts (retry control). |
| `next_retry_at` | `timestamptz` NULL | Backoff for `failed`→retry. |
| `claimed_by` | `text` NULL | Routine instance that claimed the row. |
| `claim_expires_at` | `timestamptz` NULL | Claim lease expiry (prevents stuck `queued`/`harvesting`). |
| `last_error_code` | `text` NULL | Last dispatch/harvest error. |
| `harvest_manifest_ref` | `text` NULL | Pointer to the governed mini-manifest. |
| `candidates_ref` | `text` NULL | Pointer to the fenced harvest package (set at `candidates_ready`); **not** an approval. |
| `resolved_asset_id` | `uuid` NULL → `c.client_brand_asset(asset_id)` | Set only at `resolved` — the promoted asset that makes the recheck HIT. |
| `dismissed_reason` | `text` NULL | Human triage note. |
| `created_at` / `updated_at` | `timestamptz` NOT NULL | Bookkeeping. |

**Posture (design):** additive; RLS deny-all; `revoke all … from public, anon, authenticated`; `grant select,insert,update,delete … to service_role`; non-REST-exposed (all access via governed SECDEF RPC, TMR-4 mirror). **No `license`/`sha256` columns.** Rollback = `DROP TABLE` of both new tables (child first) — in the DDL file at the next gate.

# Artifact E — Child observation table — `m.asset_gap_observation`

Per-observation evidence (replaces the ever-mutating `sample_post_ids` array; gives reliable demand-count provenance while the aggregate stays compact):

```
id             uuid PK
suggestion_id  uuid NOT NULL → m.asset_gap_suggestion(id) ON DELETE CASCADE
source_post_id uuid NULL → m.post_draft(post_draft_id) ON DELETE SET NULL
analyzer_run   text
observed_at    timestamptz NOT NULL default now()
evidence_codes text[]   -- the reason/route codes observed for this post (why_needed, primary_route, drainability)
```

`demand_count` on the parent is the count of its observation children (or a maintained denormalization — decided at the DDL gate). Same RLS/grant posture as the parent.

# Artifact D — Drain query (exact — implements option (a))

The future routine claims **only**:

```sql
SELECT * FROM m.asset_gap_suggestion
WHERE asset_gap_detected = true
  AND asset_gap_drainability = 'drainable'
  AND status = 'open'
  AND slot_kind = 'static_background'
-- ORDER BY priority_score DESC NULLS LAST, first_seen_at ASC
-- claim: set status='queued', claimed_by, claim_expires_at, attempt_count = attempt_count + 1
```

Rows that are `blocked_by_template` / `blocked_by_governance` / `triage_only` are demand evidence only and are never claimed until the masking gap clears (which flips drainability on the next analyzer pass).

# Artifact F — Lifecycle (rev-2 ruling #7, unchanged)

```
open ─claim→ queued ─dispatch→ harvesting ─harvest returns→ candidates_ready
      (PK visual gate + intake + promotion, existing)              │
                                    (inventory recheck == HIT) ─────┴→ resolved
weak/rejected candidates ───────────────────────────────────────────→ queued/open (retry)
unrecoverable error ────────────────────────────────────────────────→ failed (next_retry_at)
human "not worth sourcing" ─────────────────────────────────────────→ dismissed (terminal)
```

`candidates_ready` makes **nothing** production-eligible. `resolved` only when a promoted governed asset makes the same appetite check return HIT (candidate creation ≠ resolution). Promotion stays the existing PK hard gate.

# Deterministic candidate-selection rule (§rev-3 correction #3)

1. Produce the **deterministically ranked pre-governance candidate set** (reuse `select_template`'s candidate query + its `created_at ASC, id ASC, variant_key ASC` order; apply tag match).
2. Derive a **canonical appetite** per candidate (the slot-requirement fields in Artifact B).
3. **Unambiguous top candidate** → evaluate that appetite.
4. **Equally-ranked candidates with materially different canonical appetites** → `primary_route = template_gap`, `reason = ambiguous_asset_appetite`, `asset_gap_drainability = blocked_by_template`. **Do not source** until template intent is resolved.
5. Candidates with the **same canonical appetite** may be collapsed. *Materially different* = differing `image_slot_min`/`image_slot_max`, `needs_governed_background`, `text_overlay_safe_required`, aspect/crop, or sensitivity posture.

---

## Ground-truth resolved by db-rls-auditor (read-only, project `mbkmaxqhsohbtwsqolns`, verdict `concerns`→resolved by PK)

- **0A shared-pool — RESOLVED (Option B).** No shared-asset concept exists today (`client_id` NOT NULL, 0 shared rows). PK ruled a dedicated new `c.shared_creative_asset` table (above); `c.client_brand_asset` and `resolve_slot_assets` untouched.
- **0B home — RESOLVED (greenfield).** Exclusivity toggle is UI/planned-only, not in the DB; `c.client_asset_pool_policy` is the first persistent home. No row ⇒ `client_only`.
- **Real columns confirmed:** on `c.client_brand_asset`, only `is_active`/`platform_scope`/`asset_type`/`asset_url`/`asset_name`/`notes` are real columns; `approved`/`approval_status`/`production_use_allowed`/`safe_for_text_overlay`/`aspect_ratio`/`license`/`usage` etc. are `asset_meta` keys. The design's `platform_suitability` → use the existing **`platform_scope` column**.
- **All three new tables ABSENT** (`m.asset_gap_suggestion`, `m.asset_gap_observation`, `c.client_asset_pool_policy`) + `c.shared_creative_asset` → clear to create; all FK targets are valid uuid PKs.
- **Posture to mirror:** TMR-4 tag tables = RLS on, `force_rls=false`, 0 policies, grants `postgres`/`service_role`/`inspector_ro` only. New tables reproduce this (a benign `rls_enabled_no_policy` INFO advisor per table is expected, not a defect). Advisor baseline captured — nothing attributable to this lane.

## Open items carried to the DDL gate

- **Partial-unique index (db-rls-auditor flag):** the aggregation contract needs `UNIQUE (appetite_signature) WHERE status IN (open,queued,harvesting,candidates_ready)`; a plain unique would wrongly block re-opening a signature after `resolved`/`dismissed`. The analyzer's `ON CONFLICT` target must name this exact partial index.
- **SECDEF EXECUTE trap:** any analyzer/RPC created later must `REVOKE EXECUTE FROM anon, authenticated` (known ICE lint — ~40 pre-existing instances).
- **Covering indexes:** new FKs (`client_id`, `latest_source_post_id`, `resolved_asset_id`, `suggestion_id`, `source_post_id`) each get a covering index.
- **`demand_count` maintenance:** count-of-children vs maintained denormalization — DDL-gate decision.
- **Migration-name collision** against the applied ledger is checked at the DDL step.
- **Optional:** PK may run `brief-author` for an adversarial second draft before the DDL gate.
