# TMR Template Proof Lifecycle v1 — Discovery + Proof Model Brief

> **Lane:** Template Proof Lifecycle v1 — Discovery + Proof Model Brief
> **Mode:** discovery + planning, **docs-only**. Zero DB / zero render / zero publish / zero proof-event / zero migration / zero dashboard edit.
> **Owner:** PK · **Date context:** 2026-07-01 07:00 Sydney
> **Repo:** CE (`Invegent-content-engine`) · **HEAD at authoring:** `312a3be26fae0af91372680c2dc297fa2af36164`
> **Register truth:** v4.60 (TMR Foundation + First Template Candidate sprint CLOSED)

---

## 1. Preflight Result

**Preflight: PASS (after one accepted fast-forward).**

| Check | Expected (directive) | Actual | Result |
|---|---|---|---|
| branch | `main` | `main` | ✅ |
| HEAD == origin/main | `d29ab75` | `312a3be` (see drift note) | ✅ (post-ff) |
| ahead/behind | `0/0` | `0/0` | ✅ |
| working tree | clean except known scrap | clean except known untracked scrap | ✅ |
| `00_sync_state.md` marker | v4.60 | v4.60 | ✅ |
| `00_action_list.md` marker | v4.60 | v4.60 | ✅ |

**Preflight drift + accepted fast-forward (recorded per directive):**

- Initial fetch found `origin/main` had advanced `d29ab75 → 312a3be` — local was **0 ahead / 1 behind**, so the directive's literal expectation (`HEAD == origin/main == d29ab75`) failed. Per the directive's stop-on-failure rule I halted and reported.
- The single drift commit `312a3be` (`Invegent`, 2026-07-01 02:02 +10:00) was inspected read-only: **`chore(runtime): no eligible ready briefs for Cowork run 2026-06-30T160201Z (owner-gate skip)`** — it adds exactly one file, `docs/runtime/runs/no-ready-briefs-2026-06-30T160201Z.md` (24 insertions). It touches **no register, no TMR schema, no proof logic** — a benign autonomous Cowork owner-gate-skip run log.
- PK approved **Option A**: `git merge --ff-only origin/main` (provably conflict-free — local was a strict ancestor, 0 ahead). Fast-forward applied (`Updating d29ab75..312a3be`). Re-run preflight passed cleanly: `HEAD == origin/main == 312a3be`, `0/0`, tree clean, registers still v4.60, and the ff confirmed to have added only the Cowork run-log file.
- **Working tree untracked scrap (unchanged, pre-existing, not this lane's):** `.claude/settings.local.json.bak-20260629-180125`, `_harness/`, and 7 stale brief drafts (`aci-slice-c-…`, `branch-b-lane-b1-v2-…` ×2, `h3-1-…` ×2, `h3-2-…`, `h3-3-…`). None touched.

---

## 2. Current Ground Truth

Source: v4.60 closeout register (`docs/00_sync_state.md`), read-only re-verified at v4.57 and v4.59 (2026-06-30), plus the schema + read-RPC migration source in repo.

**Seeded template (governed inventory candidate ONLY):**
- provider `creatomate` · provider_template_id `490ad9ea-7473-49e4-9d3c-e1ae8a12d790` · name `news_quote_insight_1x1_v1`
- `static_image`, 1080×1080, 1:1 · family `generic.real_estate.market_insight_card`
- `status = inventory_captured` · `inventory_status = captured_from_docs` · `inventory_hash` present

**Live registry counts (register-of-record, read-only re-verified v4.59):**

| Table | Rows | Notes |
|---|---|---|
| `c.creative_template_family` | 1 | `generic.real_estate.market_insight_card` |
| `c.creative_provider_template` | 1 | the seeded template |
| `c.creative_provider_template_field` | 9 | element inventory |
| `c.creative_template_platform_suitability` | 5 | **0 `platform_safe` / 0 `production_proven`** |
| `c.creative_template_variant_candidate` | 2 | `market_update.v1` (strong_candidate) · `quote_card.v1` (needs_template_edit); both `format_key` NULL = no binding |
| `c.creative_template_client_assignment` | 1 | Property Pulse, `proposed` / `pilot_only` (NOT enabled) |
| `c.creative_template_inventory_audit` | 1 | `no_secret_assertion` + `no_mutation_assertion` = true |
| **`c.creative_template_proof_event`** | **0** | **no proof of any kind** |

**Read RPC (`public.get_tmr_template_list()`) current output:** 1 row · `lifecycle_rollup = needs_template_edit` · `blocker_summary = [needs_template_edit, no_render_proof, no_publish_proof]` · `proof_summary = []`.

**What the template is NOT (explicit, per register):** not render-proven, not publish-proven, not production-proven, not platform-safe, not enabled, not bound, not Format Mix eligible, not production-usable.

---

## 3. Proof Event Schema Findings

Source: `supabase/migrations/20260630042316_tmr3_template_metadata_registry.sql:186-201` (table `c.creative_template_proof_event`).

**Q: What table stores template proof events?** `c.creative_template_proof_event` — in schema `c` (non-REST-exposed, service-role-only, RLS deny-all, EXECUTE/DML granted to `service_role` only). No browser reachability.

**Q: What proof event types exist / are implied?** `proof_type` is CHECK-constrained to exactly four (`:192-193`):
1. `smoke_render` — a controlled render demonstrating the template produces a valid asset.
2. `visual_approval` — a human (PK) judgment that the rendered asset is acceptable.
3. `platform_render` — render proven on a real platform path.
4. `platform_publish` — actually published successfully.

These form a **conservative proof ladder**: `smoke_render → visual_approval → platform_render → platform_publish`.

**Q: What fields are required to create a legitimate proof event?**
- Hard-required by DDL: `template_id` (NOT NULL, FK → `c.creative_provider_template`) and `proof_type` (NOT NULL, CHECK).
- `proof_status` is **CHECK-constrained but NULLABLE** — vocab `passed | failed | pending | superseded` (`:194`). A legitimate *passed* proof must set `proof_status='passed'` explicitly (NULL is not a pass).
- Strongly-required-by-governance (not DDL): `evidence_reference`, `evidence_kind`, `occurred_at`, `recorded_by`, and (where applicable) `assignment_id`, `platform`, `placement`. The table comment (`:201`) states production-proven anywhere requires a real `platform_publish` proof whose `evidence_reference` is validated against real `m.*` evidence **by the future write-RPC, never by inference** — i.e. there is no write-RPC yet, so legitimate proof rows cannot be created safely until one exists (see §11).

**Q: What distinguishes smoke vs publish vs production proof?**
- **smoke render proof** = the template rendered to a valid asset in a non-publishing context. Weakest rung. *Does not* assert platform fit or production safety.
- **publish proof** = `platform_publish` with `proof_status='passed'` and a validated `m.post_publish` evidence reference.
- **production proof** = the registry's `production_proven` state, which the read RPC encodes **only** via a passed `platform_publish` proof_event (`:174-177`, `:62`). Never from smoke or visual approval.

**Q: What evidence references are needed?** `evidence_reference` is a free-text **soft ref (no FK)** intended to point at `m.post_render_log` / `m.post_publish` ids (`:195`), with `evidence_kind` labelling what it points to. Because it is a soft ref, it can also legitimately point at a non-production smoke artifact (see §4/§7).

**Q: What must NEVER be stored?** No raw provider payloads, no secrets/keys/billing, no Creatomate API responses. The schema deliberately stores **counts / labels / ids / hashes only** (table + column comments throughout the migration). The audit table enforces per-capture `no_secret_assertion` / `no_mutation_assertion` attestations (`:179-180`).

---

## 4. Render Evidence Source Findings

Source: `supabase/migrations/20260502102054_audit_post_render_log_column_purposes.sql` (canonical column-purpose audit of `m.post_render_log`); producer = `supabase/functions/image-worker/index.ts`.

**Q: Where would a legitimate render result be recorded today?** `m.post_render_log` is the canonical production render-evidence table. Every production render (image-worker → Creatomate) writes one row via `public.write_render_log`. Key columns: `id` (uuid PK — the natural `evidence_reference` target), `post_draft_id` (FK `m.post_draft`), `client_id`, `ice_format_key`, `render_engine` (`'creatomate'`), Creatomate render id, `status` (`succeeded | failed | timeout`), `output_url` (Creatomate URL), `storage_url` (public Supabase Storage URL), `render_duration_ms`, `error_message`, `render_spec` (jsonb, currently NULL except the governed PP `image_quote` branch + heygen avatar identity), `created_at`.

**⚠️ Decisive constraint — `m.post_render_log` is production-coupled.** Two columns make a *clean* TMR smoke-render row impossible without touching production:
1. `m.post_render_log.ice_format_key` is **FK-constrained to the governed `t."5.3_content_format".ice_format_key`** (image-worker v3.10.2 "GATE C", cited at `image-worker/index.ts:183-189`). The TMR variant `market_update.v1` has `format_key = NULL` (no binding) — there is **no governed format key** to write, and inventing/borrowing one would be a Format Mix binding (forbidden by this lane).
2. `post_draft_id` is an FK to a real `m.post_draft`. A TMR template smoke render is not tied to a real draft.

**Therefore: writing a genuine `m.post_render_log` row for the TMR smoke render would force production coupling** (a real draft + a governed format key) — which violates "no production data mutation" and "no Format Mix binding". This is a real finding, not a preference.

**Q: What metadata should the proof capture?** From the smoke render: storage object path/URL of the rendered asset, Creatomate render id, output dimensions (assert 1080×1080), `status='succeeded'`, render duration, and a content hash of the rendered bytes. All non-secret, all id/label/hash-grade — fits the schema's "no payload" rule.

**Q: What minimum evidence is enough to say "render-proven candidate"?** A `smoke_render` proof_event with `proof_status='passed'` whose `evidence_reference` points at a retrievable, non-production rendered asset (e.g. a `_smoke/` storage object) produced from the real Creatomate template `490ad9ea…` with safe test data, dimensions verified 1080×1080. That is **render-proven candidate** — and nothing more.

**Q: What is still insufficient for platform safety / production proof?** A smoke render says nothing about platform fit (`platform_safe` needs per-platform review/proof), nothing about publish success (`platform_publish`), and nothing about production (`production_proven` needs a passed `platform_publish`). Critically (see §5), in the current read RPC a `smoke_render` proof **does not clear `no_render_proof`** — that blocker is keyed to `platform_render`, a strictly higher rung.

---

## 5. Read RPC / Dashboard Projection Findings

Source: `supabase/migrations/20260630050000_tmr_read_rpc_v1.sql`.

**Q: How do proof events appear in `get_tmr_template_list()`?** Via `proof_summary` — a per-template aggregation of **counts by `(proof_type, proof_status)` only** (`:127-135`): `[{proof_type, proof_status, n}]`. No payload, no evidence body. It aggregates **all four** proof types.

**Q: How would `proof_summary` change after a smoke render proof?** It would gain one entry: `{proof_type:'smoke_render', proof_status:'passed', n:1}`. That is the *only* list-level change.

**Q: How would lifecycle/blocker logic change?** **It would NOT change** — this is the key projection finding:
- `lifecycle_rollup` is an inline weakest-gate CASE (`:52-64`). Its render/publish gates are `has_render_proof` and `has_publish_proof`, which are computed (`:170-177`) as `EXISTS` of a **`platform_render`** (resp. **`platform_publish`**) proof with `proof_status='passed'`. **`smoke_render` and `visual_approval` are not counted by any rollup gate.**
- `blocker_summary` (`:75-89`): `no_render_proof` fires on `not has_render_proof` (i.e. no passed `platform_render`); `no_publish_proof` on `not has_publish_proof`. A smoke render leaves both set.
- **`needs_template_edit` is a hard pin.** The rollup checks `has_needs_edit` (any variant with `fit_status='needs_template_edit'`) at CASE position 4 (`:57`), *before* all platform/assignment/proof gates. While `quote_card.v1` sits at `needs_template_edit`, `lifecycle_rollup` is pinned at `needs_template_edit` **regardless of any render proof**. (Direct input to §9.)

**Net:** after a smoke render proof, the list row shows `lifecycle_rollup = needs_template_edit` (unchanged), `blocker_summary = [needs_template_edit, no_render_proof, no_publish_proof]` (unchanged), `proof_summary = [{smoke_render, passed, 1}]` (changed). This is honest and correct: a smoke render is candidate-grade evidence, not a lifecycle advance.

**Q: Does the dashboard need changes after proof is inserted?** **No change is required at the read-contract level** — the contract already projects proof:
- `get_tmr_template_list().proof_summary` (counts) — already present.
- `get_tmr_template_detail().proof_events` (`:228-231`): array of `{proof_type, proof_status, evidence_reference_type (=evidence_kind), evidence_reference_id (=evidence_reference), occurred_at}` — already present.

**Q: Does the detail drawer already expose proof history?** The **RPC** carries it; whether the `/create/templates` **dashboard UI drawer renders** the `proof_events` array is a separate display question in the **separate `invegent-dashboard` repo** (out of scope to edit here; not inspected this lane). If the drawer does not yet render `proof_events`, that is a dashboard-display follow-up — **not a blocker for proof insertion**, because the data is already in the contract. Recommend a read-only dashboard inspection (no edit) as an optional pre-step of a later lane.

---

## 6. Proposed Proof Lifecycle

A conservative ladder mapped to the schema vocab. Each rung is a **separate PK-gated action**; none is implemented in this lane.

| Rung | proof_type | What it asserts | Read-RPC effect | Gate |
|---|---|---|---|---|
| 0 | *(none)* | inventory candidate only | current state | — |
| 1 | `smoke_render` (passed) | template renders to a valid asset (non-publishing) | adds to `proof_summary`; **no** rollup/blocker change | PK-gated render + PK-gated proof insert |
| 2 | `visual_approval` (passed) | PK eyes-on accepts the rendered asset | adds to `proof_summary`; **no** rollup/blocker change | PK visual gate + proof insert |
| 3 | `platform_render` (passed) | render proven on a real platform path | **clears `no_render_proof`**; can lift rollup if `needs_template_edit` resolved + platform gates met | later lane (real platform path) |
| 4 | `platform_publish` (passed) | published successfully, evidence validated vs `m.post_publish` | **clears `no_publish_proof`**; enables `production_proven` rollup | production lane (publish) |

**Target of Template Proof Lifecycle v1:** reach **Rung 1 (+ optionally Rung 2)** = **render-proven candidate**. Rungs 3–4 (platform-safe / production-proven) are explicitly **out of scope** and remain separate, later, gated lanes.

**Hard prerequisite (no proof rows yet possible):** there is **no write-RPC** for proof events. Per the schema comment, legitimate proof rows must be created by a future SECURITY DEFINER write-RPC that validates `evidence_reference` — **never** by a raw insert and never by inference. So even Rung 1 requires, first, a proof write-path. (See §11.)

---

## 7. Smoke Render Proof Model

**Goal:** render `news_quote_insight_1x1_v1` (Creatomate template `490ad9ea…`) once, safely, non-publishing, to prove it produces a valid 1080×1080 asset — then (separately, PK-gated) record a `smoke_render` proof.

**Render path (design only — render is a hard stop here):**
- **Inputs:** safe synthetic test data only (no real client content, no PII). Fill the template's dynamic fields (the 9-element inventory) with neutral placeholder copy sized to the `market_update.v1` strong-candidate shape.
- **Mechanism:** reuse the **proven non-publishing governed-render mechanism** (Branch B Lane B-Proof / B0, proven live 2026-06-24/25, `_smoke/` storage prefix, zero publish/zero mutation) as the reference pattern. The exact Creatomate call (template-id render of `490ad9ea…` + modifications vs an image-worker build path) is to be specified and reviewed in the **Smoke Render Packet** lane — the current image-worker builds payloads inline and does not render from a stored Creatomate template id, so the call shape is a packet-level decision.
- **Output:** the rendered asset written to a **`_smoke/` storage object** (non-publishing prefix). **No** `m.post_draft`, **no** `m.post_render_log` row (per §4: post_render_log is production-coupled via FK ice_format_key + post_draft_id — avoid it), **no** publish, **no** Format Mix binding, **no** client enablement.
- **Captured evidence:** `_smoke/` object path/URL, Creatomate render id, dimensions (assert 1080×1080), status, duration, content hash. All non-secret.

**Evidence model for the proof_event:**
- `proof_type='smoke_render'`, `proof_status='passed'` (only if dimensions + retrievable asset verified), `template_id` = seeded template id, `evidence_reference` = the `_smoke/` storage object path, `evidence_kind` = e.g. `smoke_render_storage_object`, `occurred_at` = render time, `recorded_by` = session/operator label. **No raw Creatomate payload, no secret.**
- **Alternative considered + rejected for this template:** writing a real `m.post_render_log` row and referencing its `id`. Rejected because it forces a governed `ice_format_key` (Format Mix binding — forbidden) and a real draft (production mutation — forbidden). Surfaced for PK visibility; recommendation is the decoupled `_smoke/` artifact.

**Boundaries (all enforced in the future packet):** safe test data · no live publishing · no Format Mix connection · no auto-selection · no client production enablement · no raw provider payload persisted.

---

## 8. PK Visual Approval Model

- **Is PK visual approval required before proof insertion?** Two distinct proof rungs, two distinct answers:
  - The **`smoke_render`** proof is *machine* evidence (did it render to a valid asset?). It can be recorded once the render is verified — it does **not** require human aesthetic judgment first.
  - The **`visual_approval`** proof is the *human* gate (does PK accept how it looks?). It is required before the template advances toward any platform/production use, and it is recorded as its own `proof_type='visual_approval'` row.
- **Order (recommended): smoke render proof BEFORE visual approval.** Sequence:
  1. Run the safe smoke render → produce the `_smoke/` asset.
  2. (PK-gated) record the `smoke_render` (passed) proof referencing the asset.
  3. PK views the `_smoke/` asset → gives or withholds visual approval.
  4. (PK-gated) record a `visual_approval` proof (`passed` = accepted, `failed` = rejected) referencing the same asset.
  Rationale: the machine proof produces and anchors the artifact PK actually looks at; keeping the two as separate proof events preserves the schema's "proof is separate from capability and from human judgment" intent, and a rejection is auditable as a `visual_approval/failed` row rather than a silent deletion.
- **Note:** neither rung changes `lifecycle_rollup` or `blocker_summary` (§5). "Render-proven candidate, PK-visually-approved" lives in `proof_summary` / `proof_events`, not in the rollup — which is the honest representation.

---

## 9. quote_card.v1 Recommendation

**Issue (given):** the template lacks proper `quote_text` + attribution/source fields; it is a market-insight / news card, not a true quote card. (`news_quote_insight_1x1_v1`'s name "may mislead" — exactly the TMR-1 §1 hazard.)

**Coupling that makes this decision matter (from §5):** while any variant has `fit_status='needs_template_edit'`, `lifecycle_rollup` is **pinned at `needs_template_edit`** (CASE position 4, before all platform/proof gates). So `quote_card.v1` currently blocks the *whole template* from ever showing progression in the rollup, even if `market_update.v1` becomes render-proven.

**Options (per directive):**
1. **Keep `needs_template_edit`** — honest *only if* there is real intent to edit the Creatomate template to add quote fields (which is effectively Option 3). Otherwise it is misleading and it pins the rollup.
2. **Reclassify / remove** — set `quote_card.v1.fit_status='unsuitable'` (this template is not, and will not without provider edits be, a quote card). Clears the `has_needs_edit` pin; the rollup would then compute to `platform_candidate` (inventory captured, fields present, candidate platforms, but 0 `platform_safe`) — a *more honest* state.
3. **Future template-edit lane** — add proper `quote_text` + attribution fields. Likely a **new provider template** (a real quote card), not an in-place edit of a market-insight card.

**Recommendation (a PK product call — recorded, NOT implemented):**
> **Option 2 now (reclassify `quote_card.v1` → `unsuitable`), with Option 3 deferred as optional.** The template is a market-insight card; `unsuitable` is the truthful classification for a quote-card variant, it unpins the rollup so `market_update.v1` can carry the proof lifecycle, and it removes a misleading blocker. If PK wants a genuine quote card, open a *separate* future lane for a new "true quote card" provider template (new fields, new inventory, its own proof lifecycle) — do not bend this market-insight template into one.

**This lane does not implement the decision.** Reclassifying a variant row is a DB mutation (`UPDATE c.creative_template_variant_candidate`) and is therefore its **own dedicated PK-gated micro-lane** — **PK decision (2026-07-01): kept separate, NOT folded into the Smoke Render Packet**, because this is a template-taxonomy / lifecycle correction, not proof execution, and the Smoke Render Packet already carries enough risk (proof write-path, smoke storage evidence, provider render handling, visual-approval sequencing, proof-insert rules). Hard stop: do not "fix" `quote_card.v1` without this separate approved micro-lane.

---

## 10. Safety Boundaries

This lane (Discovery + Proof Model Brief) mutated **nothing**:

- **0** proof_event rows · **0** `platform_safe` · **0** `production_proven` · **0** enablement · **0** Format Mix binding.
- **0** provider renders · **0** publishes · **0** fake render/publish evidence.
- **0** DB query-mutation · **0** `execute_sql` · **0** `apply_migration` · **0** migration files written · **0** ledger change · **0** seed re-run.
- **0** dashboard code edits · **0** broad Creative Library rollout · **0** `quote_card.v1` change.
- **0** live DB reads this lane (grounded on repo schema/RPC source + the v4.59 read-only-verified register counts). Only git read commands + an authorized fast-forward (§1) + repo file reads were performed.

Every action identified as needing a render, DB apply, migration, write-RPC, or provider call has been converted into a proposed PK-gated next lane (§6, §7, §11) rather than performed.

**Non-claims (explicit):** the template remains an inventory candidate only. It is **not** render-proven, publish-proven, production-proven, platform-safe, enabled, bound, Format Mix eligible, or production usable. A future smoke render would make it at most a **render-proven candidate** — still none of the above.

---

## 11. Recommended Next Lane

**PK-ratified sequence (2026-07-01) — three ordered lanes, the variant correction kept SEPARATE from proof execution:**

### Step 1 — Commit this brief (docs-only)
Commit the Discovery + Proof Model Brief after final review. Docs-only, no DB / render / publish / proof. (This step.)

### Step 2 — `TMR Template Variant Reclassification — quote_card.v1 Micro-lane`
A small, dedicated, PK-gated lane — **NOT folded into the Smoke Render Packet** (PK decision: taxonomy/lifecycle correction ≠ proof execution).
- **Purpose:** reclassify `quote_card.v1` away from `needs_template_edit` / quote suitability (the current template is a market-insight card, not a true quote card); preserve `market_update.v1` as the strongest valid variant.
- **Do NOT:** add fields · edit provider template design · render · publish · insert proof events · enable or bind the template.
- **Expected result:** the template is no longer pinned by a false quote-card variant; `lifecycle_rollup` becomes more honest (`needs_template_edit` → `platform_candidate`, per §5) **before** any smoke proof begins; a genuine quote card is handled later as a new template / template-edit lane.
- **Mechanism note:** this is a single guarded `UPDATE c.creative_template_variant_candidate` (fit_status → `unsuitable`) — a DB mutation, so it carries its own review → PK apply gate (db-rls-auditor read-only confirm of the one-row target → PK exact-approval apply), but it is deliberately tiny and isolated.

### Step 3 — `Template Proof Lifecycle v1 — Smoke Render Packet`
A PK apply/render hard-stop packet that must prepare — for PK approval, and **still** not enable production / publish / bind Format Mix / mark production-proven:
1. **Proof write-path first (prerequisite).** No proof write-RPC exists today; the schema forbids raw inserts and inference. Specify a `SECURITY DEFINER` write-RPC (or explicitly PK-gated controlled insert) that validates `evidence_reference` and records a `smoke_render` proof — authored, reviewed (db-rls-auditor → security-auditor → external review), PK-apply-gated, exactly like the read-RPC chain.
2. **Safe smoke render spec.** Exact Creatomate call for template `490ad9ea…` + safe synthetic modifications, `_smoke/` non-publishing storage target (reuse the proven B-Proof/B0 mechanism), evidence capture (path, render id, 1080×1080 assertion, hash). No `m.post_render_log` row (§4), no draft, no publish.
3. **Sequenced proof inserts (PK-gated):** `smoke_render` (passed) → PK visual approval → `visual_approval` (passed/failed) — per §8.
4. **No Format Mix binding · no production-proven claim · no publish.**

**Optional read-only pre-steps (any time, no edit):** (a) re-confirm live registry counts via the read RPC; (b) read-only inspect whether the `/create/templates` detail drawer renders `proof_events` (separate dashboard repo).

Each of variant reclassification apply, render, write-RPC apply, and proof insert is its own irreversible gate requiring PK authorization.

---

## 12. Final Verdict

```
READY_FOR_PK_REVIEW
```

Preflight passed (after the accepted, recorded fast-forward). Discovery is complete and evidence-grounded against repo schema/RPC source + the v4.60/v4.59 register-of-record. No missing evidence blocks the brief — the open items (`quote_card.v1` disposition; smoke-render evidence target; proof write-path) are **design/product decisions for PK**, captured here with recommendations, not gaps. Nothing was mutated, rendered, published, or proven.
