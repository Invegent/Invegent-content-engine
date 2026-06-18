# AGP D-01 Gate #3 — Shadow Resolver + Telemetry — Implementation Brief

**Lane:** AVATAR-GOVERNANCE-PLANNING · **Gate:** D-01 #3 · **Status:** DESIGN (awaiting PK Gate-1) · **Date:** 2026-06-18
**Authority impact:** none at design time. The build (later phases) is **shadow/telemetry only** — production selection is byte-identical throughout. Branch B NOT AUTHORISED; #4 cutover remains separately BLOCKED.

> Design-only artifact. No build, migration, deploy, backfill, telemetry-table creation, or `lookupAvatar`/A2-pin change is authorised by this brief. Those are later, separately-gated steps.

---

## A. Discovery evidence (read-only, 2026-06-18)

### A.1 Live resolution path (the only selection site)
- **Entry point:** `heygen-worker` EF, `runSubmitPhase()` — `supabase/functions/heygen-worker/index.ts:306`. Avatar is resolved **exactly once**, at submit; the poll phase copies the frozen result verbatim and never re-derives (`index.ts:197–201`; test `index.test.ts:192–220`).
- **Resolver:** `lookupAvatar(supabase, clientId, stakeholderRole, renderStyle)` — `index.ts:61–82`, executed via the `public.exec_sql` raw-SQL RPC:

  ```sql
  SELECT ba.heygen_avatar_id, ba.heygen_voice_id
  FROM c.brand_avatar ba
  JOIN c.brand_stakeholder bs ON bs.stakeholder_id = ba.stakeholder_id
  WHERE ba.client_id = '<clientId>'
    AND ba.is_active = true
    AND ba.render_style = '<renderStyle>'
    [AND bs.role_code = '<stakeholderRole>']   -- only when a role is provided
  LIMIT 1
  ```

- **Inputs:** `client_id`, `stakeholder_role` (often null), `render_style` (set upstream by `ai-worker.generateVideoScript`, `ai-worker/index.ts:232–253`).
- **Outputs consumed:** `heygen_avatar_id` (→ talking_photo_id), `heygen_voice_id`, plus `avatar_selected_by ∈ {preset, role_filter, fallback_limit1}`. Frozen into `draft_format.avatar_identity` (`index.ts:360–371`); copied to `post_render_log.render_spec.avatar_identity` at poll.
- **`is_primary` / `is_default_host`:** not referenced anywhere in code (confirmed) — markers are dormant.

### A.2 The "A2 pin" (determinism rule)
Determinism is the conjunction of **(1) `is_active = true`**, **(2) exact `render_style` match**, **(3) optional `role_code` filter**, and **(4) `LIMIT 1` with NO `ORDER BY`**. Points 1–3 fix the candidate set; point 4 returns the first row in **unspecified executor order** (in practice heap/PK order). **Key fragility:** when a candidate set has >1 row (e.g., a client with multiple same-role stakeholders on the fallback path), the live pick is *deterministic only by accident of storage order* — Postgres does not guarantee it. This is precisely the gap the governance markers + an explicit order are meant to close, and the single most important thing Gate-3 telemetry must measure.

### A.3 Dormant governance fields + uniqueness (DB, live)
- `c.brand_avatar.is_primary` — `boolean NOT NULL DEFAULT false` (ord 24); `is_default_host` — `boolean NOT NULL DEFAULT false` (ord 25). All rows false (no backfill).
- Partial unique indexes:
  - `uq_brand_avatar_primary_per_role_style` — `UNIQUE (stakeholder_id, render_style) WHERE is_primary` → ≤1 primary per stakeholder+style.
  - `uq_brand_avatar_default_host_per_client_style` — `UNIQUE (client_id, render_style) WHERE is_default_host` → ≤1 default-host per client+style.
- Base uniqueness: `brand_avatar_stakeholder_id_render_style_key` — `UNIQUE (stakeholder_id, render_style)` → one avatar row per (stakeholder, style). ⇒ Candidate multiplicity arises **across stakeholders within a (client, render_style)** (role path: multiple stakeholders sharing a `role_code`; fallback path: all of a client's stakeholders).
- Support index: `brand_avatar_client_id_render_style_is_active_idx (client_id, render_style, is_active)`.

**Marker semantics derived:** `is_primary` disambiguates which stakeholder's avatar is canonical for a role (role path); `is_default_host` disambiguates the client's canonical host when no role is given (fallback path).

---

## B. Architecture (proposed build — later phases)

Three additive, production-inert components:

1. **`public.resolve_avatar_shadow(p_client_id uuid, p_stakeholder_role text, p_render_style text) → jsonb`** *(design only)* — a pure, read-only function (SECURITY DEFINER, service_role-only, `SET search_path = public`, fully schema-qualified — consistent with the just-hardened posture; not via `exec_sql`). Returns a decision record:
   - the **candidate set** (all rows matching the live filter: client + is_active + render_style + optional role), each with `{brand_avatar_id, stakeholder_id, role_code, heygen_avatar_id, heygen_voice_id, is_primary, is_default_host, created_at}`;
   - the **shadow pick** under an explicit deterministic order (B.2);
   - the **rule applied** + per-candidate **rejection reasons**.
   It does not read or write production selection state.

2. **`r.avatar_resolution_shadow` telemetry table** *(design only — DDL deferred to a PK-gated `apply_migration`; NOT created now)* — one row per real resolution (model in §D).

3. **heygen-worker shadow hook** *(design only)* — immediately **after** the real `lookupAvatar` returns (the authoritative live pick), call `resolve_avatar_shadow` with the identical inputs, then `INSERT` one telemetry row capturing live pick + shadow record. Constraints:
   - `lookupAvatar` is not modified; the hook is a separate, additive call.
   - Wrapped in try/catch — **fail-open**: any shadow/telemetry error is swallowed + logged; the render proceeds on the live pick regardless.
   - Gated by an env feature flag (`AVATAR_SHADOW_TELEMETRY=on/off`); default off until enabled (toggle without redeploy).
   - The **actual** live pick (from `lookupAvatar`) is recorded — not a re-derivation — so live truth is exact.

### B.2 Deterministic shadow order (the explicit pin)

```
ORDER BY is_primary DESC,            -- role path: prefer marked primary (dormant => no effect yet)
         is_default_host DESC,       -- fallback path: prefer marked default host (dormant => no effect)
         created_at ASC,             -- stable tiebreak
         brand_avatar_id ASC         -- total order guarantee (never ties)
LIMIT 1
```

During Gate-3 (markers all false) the two marker keys are inert, so the shadow pick = "live candidate set under a *total deterministic order*." Any shadow≠live therefore isolates **live's unordered-LIMIT-1 nondeterminism** — the baseline we must quantify before markers are ever backfilled.

---

## C. Sequence diagram

```
ai-worker.generateVideoScript --> draft_format.video_script {render_style, stakeholder_role, narration}
                                           |
heygen-worker.runSubmitPhase (per pending video_short_avatar draft)
   |  inputs: clientId, stakeholderRole(|null), renderStyle
   |-[preset?]- draft_format.talking_photo_id present --> use preset --------------+
   |                                                                               |
   |- live: lookupAvatar(clientId, role, style) -- exec_sql --> c.brand_avatar (LIMIT 1, unordered)
   |        '--> LIVE pick {avatar_id, voice_id, selected_by}  <-- AUTHORITATIVE (drives render)
   |                                                                               |
   |- shadow hook  [flag on]  (try/catch, fail-open) ------------------------------|
   |     '- resolve_avatar_shadow(clientId, role, style)                           |
   |          '--> {candidate_set, shadow_pick, rule, rejections}                  |
   |     '- INSERT r.avatar_resolution_shadow {live pick, shadow rec, drift_class, agree}
   |                                                                               |
   '- submitHeyGenJob(LIVE pick) --> markRendering(draft_format.avatar_identity = LIVE pick) <-+
                                              |  (shadow NEVER influences this)
   runPollPhase --> writeRenderLog(copies avatar_identity verbatim; no re-lookup)
```

Production path = the LIVE branch only. The shadow branch is a side-effect-free observer.

---

## D. Telemetry model (`r.avatar_resolution_shadow` — design)

| column | type | purpose |
|---|---|---|
| `id` | uuid pk | — |
| `resolved_at` | timestamptz | event time |
| `post_draft_id` | uuid | link to the draft (FK m.post_draft) |
| `client_id` / `stakeholder_role` / `render_style` | uuid / text / text | resolution inputs |
| `live_avatar_id` / `live_voice_id` / `live_selected_by` | text | actual live pick (from `lookupAvatar`) |
| `shadow_avatar_id` / `shadow_voice_id` | text | shadow pick |
| `shadow_rule` | text | `primary` / `default_host` / `tiebreak_created_at` / `tiebreak_id` / `empty` |
| `candidate_set` | jsonb | full ordered candidate list w/ markers (replay) |
| `rejection_reasons` | jsonb | per-candidate why-not |
| `candidate_count` | int | size of set |
| `agree` | boolean | `shadow_avatar_id IS NOT DISTINCT FROM live_avatar_id` |
| `drift_class` | text | `none` / `ordering_drift` / `marker_drift` / `candidate_empty` / `multi_primary` / `multi_default_host` / `input_anomaly` |
| `brand_avatar_snapshot_hash` | text | hash of the (client,style) avatar rows at decision time → deterministic replay |
| `created_by_run_id` | uuid | EF run correlation |

**Deterministic replay:** `resolve_avatar_shadow` is pure over (inputs + current `c.brand_avatar` rows); `candidate_set` + `brand_avatar_snapshot_hash` let any later run re-evaluate the same decision offline and confirm the recorded outcome.

---

## E. Parity methodology

- **agree** = shadow pick ID equals live pick ID (null-safe).
- **Drift classes & expected Gate-3 (dormant) distribution:**
  - `none` — agree (expected majority).
  - `ordering_drift` — candidate_count > 1, markers all false, shadow's total-order pick ≠ live's unordered pick. **Expected, informative** — each instance names a (client, role, style) where live is nondeterministic. Must be fully enumerable and explained.
  - `marker_drift` — shadow preferred a marked primary/default_host. **Must be 0 during Gate-3** (markers dormant); non-zero ⇒ a stray marker → investigate.
  - `candidate_empty` — no active avatar; live throws, shadow records (no pick). Parity = "both no-selection."
  - `multi_primary` / `multi_default_host` — should be impossible (partial unique indexes); capture as governance-integrity alarm if ever seen.
  - `input_anomaly` — null/blank `render_style` etc.
- **Success threshold (to exit Gate-3 toward a backfill gate):** over a soak window (≥ all `video_short_avatar` resolutions for ≥2 weeks **or** ≥ N=50 resolutions, whichever first): 0 telemetry-induced render incidents; 0 unexplained `marker_drift`/`multi_*`/`input_anomaly`; 100% of `ordering_drift` cases enumerated with a named candidate set; candidate sets verified correct vs the live filter.
- **Acceptable drift:** `ordering_drift` is acceptable and is the finding (it documents where governance markers will later impose determinism). `none` + explained `ordering_drift` = healthy.
- **Unexplained drift = stop:** any `marker_drift`, `multi_*`, `input_anomaly`, or a render incident attributable to the hook → abort (§F).

---

## F. Rollout & abort

**Rollout (Gate-3 only):** (1) build the 3 components in an isolated worktree (ef-builder); (2) external review on final diff; (3) PK deploy gate → apply telemetry-table migration (PK-gated) + deploy heygen-worker with flag **off**; (4) flip flag **on**; (5) accrue telemetry over the soak window; (6) produce the Gate-3 parity readout. *(Backfilling markers and #4 cutover are explicitly out of Gate-3 and remain separately gated.)*

**Abort/rollback:** flip `AVATAR_SHADOW_TELEMETRY=off` → hook no-ops instantly (zero production impact, since the live path was never altered). If abandoning: drop `r.avatar_resolution_shadow` + `resolve_avatar_shadow` (additive objects; no production dependency). **Because production selection is never wired to the shadow, rollback is a flag flip — not a code revert.**

---

## G. Implementation phases (later — each its own gate)

- **3.0 (this brief):** design + PK Gate-1 approval.
- **3.1:** build `resolve_avatar_shadow` (SQL) + `r.avatar_resolution_shadow` (table DDL) + heygen-worker shadow hook (flag-gated, fail-open) — isolated worktree, local tests (incl. determinism + parity unit tests), no deploy.
- **3.2:** branch-warden + external review on final diff → PK deploy gate (migration apply + EF deploy with `--no-verify-jwt`, flag off).
- **3.3:** flag on; soak; monitor telemetry.
- **3.4:** Gate-3 parity readout → decision on a separate marker-backfill gate (which, with telemetry already live, would then measure intended divergence) → only after that, a #4 cutover proposal.

---

## H. Acceptance criteria (Gate-3 "done")

1. Live selection provably unchanged (heygen-worker live branch byte-identical; `lookupAvatar` untouched; flag-off = no-op).
2. Telemetry table populated for ≥ the soak window with correct candidate sets.
3. Parity readout published: `agree` rate, full `ordering_drift` enumeration, `marker_drift=0`, `multi_*=0`, `input_anomaly` triaged.
4. Zero telemetry-induced incidents; rollback (flag-off) demonstrated.
5. Deterministic replay demonstrated on a sample.

---

## I. Risk analysis (the 7 cases)

| Case | Handling |
|---|---|
| Multiple primaries | Prevented by `uq_brand_avatar_primary_per_role_style`; shadow asserts ≤1, else `drift_class=multi_primary` + tiebreak fallback (never throws). |
| Zero primaries | Normal in Gate-3 (all false): marker keys inert → shadow = candidate set under total tiebreak order. |
| Missing avatars (empty set) | Live throws (null → heygen-worker error, unchanged). Shadow records `candidate_empty`, does not throw (telemetry-only). |
| Null `render_style` | Shadow records `input_anomaly`, no pick; flag for review (confirm `ai-worker` always sets render_style). Live behavior unchanged. |
| Client without markers | All clients in Gate-3 — shadow = live filter + deterministic order; expected. |
| Deterministic ordering | Shadow uses a total order (`is_primary DESC, is_default_host DESC, created_at ASC, brand_avatar_id ASC`) — never ties; the explicit fix for live's unordered `LIMIT 1`. |
| Hook failure / latency | try/catch fail-open + feature flag; shadow never blocks or alters the render; telemetry write best-effort. |

---

## J. PK Gate-1 approval section

**Decision under review:** approve this Gate-3 design to proceed to build (Phase 3.1), shadow/telemetry only.
**Production action if approved:** none yet — next is a local build in an isolated worktree (no deploy/migration until the separate Phase-3.2 PK deploy gate).
**Consequence if delayed:** avatar governance stays at "schema dormant"; Branch B avatar differentiation stays blocked.
**Standing guarantees:** no production behaviour change · `lookupAvatar`/A2 pin unmodified · no avatar activation · no Branch B · no `stakeholder_role` changes · no backfill · no telemetry table created yet · markers stay dormant · live path byte-identical.
**This review does NOT authorise** any build, migration, deploy, marker backfill, or #4 cutover — those are later, separately-gated steps.

**Exact PK Gate-1 phrase (when ready):**

> `PK APPROVES AGP D-01 GATE-3 DESIGN — PROCEED TO SHADOW-RESOLVER BUILD (PHASE 3.1, LOCAL-ONLY, NO DEPLOY)`
