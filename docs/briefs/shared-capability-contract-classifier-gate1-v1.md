# Brief — Shared Capability Contract classifier (define + build, read-only)

**Created:** 2026-07-28 Sydney
**Author:** brief-author (draft) · orchestrator scrutiny applied
**Executor:** Claude Code (ef-builder — DB migration lane) + db-rls-auditor
**Status:** **PK GATE-1 APPROVED 2026-07-28** — T3 brief approved; sequence = db-rls-auditor live-grounding → design gate (host shape + final design) BEFORE any SQL is frozen. Host shape leaning **DB RPC** (confirm at design gate); RPC adjacency = **coexist-distinct** working assumption (reconfirm at design gate). No build/DB-mutation/commit until the design gate + T3 apply gate.
**Result file:** `docs/briefs/results/shared-capability-contract-classifier-result-v1.md` (on completion)

**Lane class:** SIDE_PROVING / PRODUCT_PROOF (both S2 + S8 block on it) · **Tier: T3** (new SECURITY DEFINER + service_role-grant callable).
**Routed from:** S2-Dashboard cross-session relay (facts-only). S5-ICE Engineering owns the interface definition + build.

---

## ⛳ PK GATE-1 DECISIONS OUTSTANDING (surfaced 2026-07-28; PK not yet answered)

**Q-A — Approve this T3 brief?** (define + build a read-only classifier, corrected mechanism below). Options presented:
(a) Approve → db-rls-auditor live-grounding → design gate (recommended); (b) Approve + settle host shape now (evidence favours a
service_role-only SECURITY DEFINER DB RPC); (c) Hold/revise.

**Q-B — Relationship to the existing live `public.get_global_format_capability_pyramid` RPC?** Coexist-distinct / Converge-reconcile /
Decide-after-grounding.

**Q-1 (design) — Host shape:** DB RPC (SECDEF, service_role-only) vs edge function vs dashboard server action. Evidence favours a DB RPC
(`get_global_format_capability_pyramid` §D2: `t.*`/`m.*`/`c.*` are not REST-reachable; resolvers are themselves service_role SECDEF).
**Q-2 (design) — shortage-vs-pipeline:** call `resolve_slot_assets` directly vs extend `select_template` to expose supply counts.
**Q-3 (design) — silent-degrade source:** the authoritative live worker/publisher signal for `Unsupported/silent-degrade` (NOT derivable
from `select_template`; the seed's `legacy_advisor_ineligible` code does not exist in-repo).

## 🔎 Orchestrator scrutiny note (candidate-level — brief-author's first code/DB brief)

Verified the load-bearing finding against source: `create_select_template_v1.sql:276–281` records a **rejected** candidate as only the
collapsed string `assets_fail_closed:<fail_reason>`, while only the **survivor** keeps the full `slot_resolution` jsonb (line 310). So for a
FAILING cell the supply detail is hidden → the classifier MUST call `resolve_slot_assets` directly to separate **Asset shortage** (supply
count) from **Pipeline missing** (structural). Confirmed. Governance-unproven codes (`not_visually_proven` from
`c.creative_template_proof_event` `proof_type='visual_approval'`/`proof_status='passed'`, lines 262–271) are real, not invented. The S2 seed's
`legacy_advisor_ineligible` literal has NO repo match — brief-author correctly refused to build on it.

---

## ✅ DESIGN GATE — DECIDED (PK, 2026-07-28) + normative spec

**PK decisions:** (1) Silent-degrade = **6th mutually-exclusive status, PRECEDENCE WINS** — for a fail-closed cell that is live-auto-publishing, `unsupported_silent_degrade` outranks the underlying blocker; the blocker is preserved in `reason_code`. (2) Grant = **service_role only**. (Evidence-settled: host = DB RPC; adjacency = coexist-distinct, pyramid NEVER read as Ready; shortage-vs-pipeline via `select_template` nested resolution / a direct `resolve_slot_assets` call with the candidate `template_id`.)

**Classifier RPC (target):** `public.classify_format_capability(p_client_slug text, p_platform text, p_format text)` → `jsonb { status, reason_code, routed_lane, evidence }`. SECURITY DEFINER, owner `postgres`, `search_path=''` (pinned), STABLE, **service_role-only EXECUTE** (`REVOKE FROM PUBLIC, anon, authenticated`; grant only `service_role`). Additive migration; ships **dark** (no consumer wired this lane). Read-only — no writes, no enforcement.

**Normative logic (precedence order):**
1. `v_st := public.select_template(p_client_slug, p_platform, p_format, NULL, NULL)`.
2. **Silent-degrade overlay FIRST (precedence):** if `v_st.status='fail_closed'` AND ∃ `m.post_publish(status='published')` for (client, platform, format) within the recency window (**default 90 days — tunable constant, flag at build**) → `status='unsupported_silent_degrade'`, `reason_code=<v_st.fail_reason>` (blocker preserved), `routed_lane='enforcement_r3'`, `evidence={publish_count, latest_published_at, sample_ids}`.
3. Else map `v_st`:
   - `status='ok'` → **ready** · routed_lane none · evidence = selected template id/variant.
   - `fail_reason='format_unmapped'` (rejected[] empty) → **template_missing** · routed_lane `template_creatomate_heygen`.
   - `fail_reason='no_selectable_template'` by rejected[].reason_code:
     - `no_assignment` | `assignment_not_approved` | `assignment_blocked` | `not_visually_proven` → **governance_unproven** · routed_lane `governance_proof`.
     - `platform_unsuitable` | `wrong_scope` | `status_below_smoke` → **template_missing** · routed_lane `template_creatomate_heygen`.
   - A candidate rejected with `reason_code LIKE 'assets_fail_closed:%'` (template selectable + governed but assets failed): the classifier **calls `public.resolve_slot_assets(client, platform, format, <that template_id>, NULL)` directly** and reads the per-slot `rejected[]` cardinality —
     - empty `rejected[]` (zero candidates of required usage) OR `fail_reason='missing_required_logo'` structural → **pipeline_missing** · routed_lane `engineering`.
     - non-empty `rejected[]` (governed assets exist, all fenced) → **asset_shortage** · routed_lane `asset_gap_s8` · evidence = eligible vs rejected counts + reason_codes.
4. Any unrecognized `fail_reason`/`reason_code` NOT grounded in resolver source → fail-closed to a safe `unknown` (NEVER fabricate a status); surface for review.

**Proof approach:** correctness is proven against the db-rls-auditor live validation set (NDIS image_quote FB/IG/LI → ready; carousel IG → governance_unproven/no_assignment; video_short_avatar YT → unsupported_silent_degrade [47 publishes]; video_short_stat YT → template_missing/platform_unsuitable) via a read-only proof run AFTER apply (a SECDEF RPC composing live-data functions can't be unit-tested hermetically without the data). Post-apply live proof is a named T3-gate step.

## 🔬 Live-grounding findings (db-rls-auditor, 2026-07-28, project mbkmaxqhsohbtwsqolns — READ-ONLY)

Verdict: **concerns (design, not code defect)** — resolver grants are clean; the three composed sources answer different questions and disagree on the safety-critical cells.

1. **Grants clean / host reachable.** `select_template`, `resolve_slot_assets`, `get_global_format_capability_pyramid` all SECURITY DEFINER, owner `postgres`, EXECUTE = `{postgres, service_role}` only (no anon/authenticated/PUBLIC). A postgres-owned SECDEF classifier RPC can invoke all three. **If the classifier must be dashboard(`authenticated`)-callable it needs its OWN `GRANT EXECUTE TO authenticated` + `REVOKE FROM anon`** (default-ACL trap) — a T3 build item.
2. **Shortage-vs-Pipeline IS distinguishable — via `select_template`'s NESTED `slot_resolution`, not standalone `resolve_slot_assets`** (the latter returns `template_not_found` without a `template_id`). Rule (verified live): `fail_reason ∈ {no_governed_background, missing_required_logo}` with **empty `rejected[]`** = Pipeline missing (zero candidates of the required usage); **non-empty `rejected[]`** (per-asset `reason_code`) = Asset shortage (governed assets exist but all fenced). Live: NDIS image_quote resolved 2 selected / 18 rejected — the cardinality signal is present.
3. **Silent-degrade is REAL, LIVE, and ~99% UNMARKED (safety-critical).** NDIS `video_short_avatar` YT: `select_template`=fail_closed(`format_unmapped`) yet **47 published to YouTube** via the legacy heygen path (carousel: 11 published). Only **1 of 47** carries a `final_format_authority` stamp (shadow-era since 2026-07-26; `format_mode` NULL on all 2882 drafts). **The classifier cannot rely on `final_format_authority`** — silent-degrade must be COMPOSED: `select_template=fail_closed` **AND** recent `m.post_publish(status='published')` for the cell.
4. **The pyramid CONTRADICTS `select_template` by design.** `get_global_format_capability_pyramid('youtube','video_short_avatar')` = `proven_in_production` (because the legacy path published it), while `select_template` = fail_closed. Pyramid = all-time, governance-BLIND publish evidence; `select_template` = the governance authority. **The classifier MUST NOT map pyramid `proven_in_production` → Ready.** → Adjacency = coexist-distinct, confirmed by evidence.

NDIS mapping-validation set (live): image_quote FB/IG/LI = **ok**; carousel IG = fail_closed `no_selectable_template`/`no_assignment` (templates exist, unassigned); video_short_avatar YT = fail_closed `format_unmapped` (empty rejected — structural + silently auto-publishing); video_short_stat YT = fail_closed `no_selectable_template`/`platform_unsuitable`.

## Task

Define the **Shared Capability Contract** and build ONE **read-only, callable capability classifier** that answers, for a single
`(client, platform, format)` cell, exactly one of six statuses — **Ready · Asset shortage · Template missing · Pipeline missing ·
Governance unproven · Unsupported/silent-degrade** — plus the **exact reason code** and the **owning lane the gap routes to**. This is the
interface the S2 Dashboard Format Capability Indicator (`docs/briefs/format-capability-indicator-v1-brief.md:20`) and the S8 Asset Gap Demand
Register both consume; it must exist first, so both are blocked on it. The classifier is **classification only** — it reports capability; it
does not gate, block, or change any production behaviour (see Forbidden actions). PK scope decision: define the contract AND build the callable
classifier in THIS lane.

## Source context

- `supabase/migrations/20260703035154_create_select_template_v1.sql` — `public.select_template(p_client_slug, p_platform, p_format, p_variant_intent, p_seed)`, read-only TMR selector. Returns `status` (`ok`|`fail_closed`), `selected`, `slot_resolution`, `alternatives[]`, `rejected[]` (per-candidate `reason_code`), `warnings[]`, `fail_reason`. Composes `public.resolve_slot_assets` for the winner (line 277). Service-role-only SECURITY DEFINER, STABLE, `search_path=''` (lines 91-92, 414-416). Ships dark.
- `supabase/migrations/20260720150000_resolve_slot_assets_v1_2_shared_pool_fallback.sql` — `public.resolve_slot_assets(...)`. `fail_reason` ∈ {`template_not_found`, `client_not_found`, `no_governed_background` (line 394), `missing_required_logo` (line 454)} + full `rejected[]` per-asset `reason_code`s (lines 210-244; shared-pool fence codes 322-349). Same SECDEF/service_role posture. **Broad shared-pool activation is BLOCKED** pending analyzer↔resolver text-safety alignment (header lines 34-39) — do not disturb.
- `supabase/migrations/20260630000000_gfcp_slice1a_get_global_format_capability_pyramid_rpc.sql` — already-live ADJACENT capability RPC (`public.get_global_format_capability_pyramid`, PROVEN 2026-06-29). Client-AGNOSTIC + production-evidence-based (render/publish logs), NOT the per-cell resolver-grounded classifier this task wants. Its §D2 (lines 15-20) is the load-bearing precedent for the DB-RPC host shape (schema `t.*`/`m.*`/`c.*` not REST-readable → only a postgres-owned SECDEF fn can read them).
- `docs/briefs/format-capability-indicator-v1-brief.md` — the S2 consumer brief. Confirms the six-status vocabulary, that S2 is blocked on this contract (`:49`), and the surface-vs-enforce boundary (`:36`).
- `docs/briefs/results/governed-broll-consumption-v1-result.md` + `…-slice-a-result.md` — the S1 "Governed B-roll" lane that exercised the `select_template → resolve_slot_assets` spine end-to-end (Slice A names `resolve_slot_assets` as the selection "danger point"). Mechanism evidence base; do not re-derive.
- `docs/briefs/resolver-enforcement-r3-contract-gate1-v1.md` — grounds that the five-predicate capability GATE, `final_format_authority='resolver_fallback'` stamping, and silent-fallback removal are a SEPARATE R3 enforcement lane (lines 64, 172-178, 254). This classifier must not become that gate.
- `docs/00_sync_state.md:9` — register head **v6.41** (the S2 relay stated ~v6.33; noted, not reconciled).

## Scope

**In scope:**
- **Define the contract**: input `(client, platform, format)`; output `{ status ∈ six-enum, reason_code, routed_lane, evidence }`. The reason_code→status mapping below is the contract's normative core.
- **Build one read-only callable classifier** for a single cell (and, if the chosen shape allows cheaply, a client-scoped sweep), grounded on `select_template` **and** (per the verified finding) `resolve_slot_assets` directly for fail-closed cells.
- **reason_code → six-status mapping (normative):**
  - **Ready** ← `select_template.status='ok'`.
  - **Template missing** ← `fail_reason ∈ {format_unmapped, no_selectable_template}` or all candidates rejected `{wrong_scope, status_below_smoke, platform_unsuitable}` → routes Creatomate/HeyGen lane.
  - **Governance unproven** ← candidate rejected `{no_assignment, assignment_not_approved, assignment_blocked, not_visually_proven}` (lines 240-271) → routes governance/proof lane. **From the assignment/proof reason code, NOT a supply count.**
  - **Asset shortage** ← template+assignment+proof READY but `resolve_slot_assets` shows eligible-but-too-few / fenced governed assets (supply COUNT) → routes Asset Gap (S8).
  - **Pipeline missing** ← `assets_fail_closed` from a structural/wiring gap (`missing_required_logo`, usage-predicate gap, or zero candidate assets of the required usage) → routes Engineering.
  - **Unsupported/silent-degrade** ← the format falls out of the governed spine and the live worker/publisher path degrades to a legacy render that auto-publishes. **Requires a named worker/publisher evidence source (open Q-3).** Must be surfaceable for the live NDIS case.
- **Critical boundary (enforced in the mapping):** "Governance unproven" ≠ "Asset shortage" (assignment/proof reason code vs `resolve_slot_assets` supply count). Conflating them hands S8 formats it cannot fix.
- Hermetic tests proving the six statuses discriminate on real cells, incl. the NDIS silent-degrade case and the unproven-vs-shortage boundary.

**Out of scope (route elsewhere):**
- **Enforcement** of "capability readiness controls execution": gating/blocking execution, changing the silent-degrade / `resolver_fallback` / legacy-render / auto-publish path, or modifying any worker/publisher/`select_template`/`resolve_slot_assets` behaviour. Separate future PK-gated R3 lane (`resolver-enforcement-r3-contract-gate1-v1.md:254`).
- Building the S2 dashboard indicator UI (S2 lane) and the S8 register (S8 lane).
- Reconciling / superseding `get_global_format_capability_pyramid` (adjacency documented, not merged — open Q-B).
- Any change to production data, pool policies, fences, or publish behaviour.

## Allowed actions

- Read the resolver definitions, S1 B-roll results, and the adjacency RPC as evidence; design the contract object + mapping.
- In an isolated worktree, author the classifier (SQL migration for the RPC shape, or the chosen alternative) + hermetic tests; run tests locally.
- Run `db-rls-auditor` (DB is the subject — mandatory in the T3 chain) and `branch-warden`; `apply-harness-auditor` in shadow if a harness is authored; external review pinned to the final artifact hash.
- Prepare (not run) the exact apply + rollback for the PK T3 gate.

## Forbidden actions

- **READ-ONLY CLASSIFICATION ONLY (mandatory scope fence).** Reports capability status; does NOT gate/block execution, modify the auto-publish / silent-degrade / `resolver_fallback` path, or change any worker/publisher/`select_template`/`resolve_slot_assets` behaviour. Enforcement is an explicitly separate future PK-gated lane.
- No mutation of production data; no publish-behaviour change; no fence weakening; no touching any client asset-pool policy (shared-pool activation hold stands).
- No DDL/table change beyond the additive new function. If a DB RPC: additive, SECURITY DEFINER, `search_path=''`/pinned, service-role-only EXECUTE (REVOKE PUBLIC **and** anon, authenticated), ship **dark** (no production consumer wired this lane).
- No deploy/merge/apply without the PK T3 gate; no worker EF deploy (verify_jwt gotcha applies if any EF is proposed).
- Do not treat any reason_code not grounded in resolver source as real — STOP and surface (e.g. `legacy_advisor_ineligible` does not exist), never invent.
- Active hold-states per `docs/00_sync_state.md` apply (cc-0046 Slice 0.5 enforcement OFF; do not entangle with authz enforcement).

## Success criteria

- Returns exactly one of six statuses for a `(client, platform, format)` cell, with exact reason_code + routed lane, on real cells.
- **NDIS-Yarns live grounding discriminated correctly:** `image_quote` FB/IG/LI + `text` → Ready; `carousel`/video formats failing `select_template` → the correct blocker; ≥1 format that currently degrades silently to a legacy auto-publishing render (e.g. YT `video_short_avatar`) → **Unsupported/silent-degrade**.
- **Unproven-vs-shortage boundary holds on real data:** unapproved/unproven-only cell → Governance unproven (never Asset shortage); template+proof-ready but supply-short → Asset shortage (routes S8) — on distinct real cells.
- Reason text human-readable, names the owning lane.
- `db-rls-auditor` PASS; `branch-warden` safe; external review clean-or-PK on the pinned hash; hermetic tests green.
- Provably **inert on production**: no consumer wired, no behaviour change (dark-ship verification).

## Stop condition

Report per the result template, then stop for the PK T3 gate. No apply/deploy/merge without PK.

---

## Tier justification

**T3.** Convention 3 puts DML/DDL ≥ T2 and new privileged callables (grants) → T3. The classifier is a new SECURITY DEFINER function with a
service_role EXECUTE grant — a new privileged read surface over `c.*`/`m.*`/`t.*` — so even read-only/additive/dark-shipped, the apply is T3
(full chain + db-rls-auditor + external review pinned to hash + rollback proven before apply + explicit PK gate). Design + hermetic build carry
T2 rigor; the apply gate is T3.

## Notes

- Governing rule (PK): "Desired schedule creates demand. Capability readiness controls execution." This lane builds the *readiness* signal only.
- `alternatives[]` trap (grounded): `selected` carries `provider_template_id` (line 299) but `alternatives[]` entries do NOT — the classifier must read routing identity from `selected`, never `alternatives[]`.
- Recommended sequence: PK Gate-1 → db-rls-auditor live-grounds the 3 handoff items (real `resolve_slot_assets` granularity; which formats live-auto-publish; live grants/reachability) → finalize design + host shape → freeze → T3 apply gate.
