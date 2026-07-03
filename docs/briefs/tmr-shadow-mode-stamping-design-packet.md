# TMR Shadow-Mode Stamping — Design Packet (Gate 1)

**Created:** 2026-07-03 Sydney · **From:** v4.79 (`select_template` live + dark; decision spine complete, zero callers)
**Status:** design only — awaiting PK Gate 1 decisions. **No build, no apply, no DDL, no render, no publish, no runtime/dashboard change.**

## 1. Goal

Record what TMR **would have selected** for real Property Pulse drafts/posts — durable, queryable, comparable against what production **actually did** — without changing production behaviour by even one byte. Shadow evidence is the confidence gate between "the spine works dark" and any future pilot.

## 2. Verified ground truth (read-only, 2026-07-03)

- **Retroactive pool exists:** 17 succeeded `creative_library_b1_production` renders across **14 distinct PP drafts** (latest 2026-07-02) — each carries `render_spec` with the actual template (`fb9820f8…`, off-TMR-registry), `background_key`, and asset keys.
- **Natural cadence has resumed:** **10 drafts now carry the ACI `draft_format.contract` stamp** (v4.06 recorded zero; the pending-evidence gap has since filled naturally). Forward shadow will see real events without manufactured drafts.
- The dark spine (`select_template` → `resolve_slot_assets`) answers deterministically for any (client, platform, format, seed) — including *historical* inputs.

## 3. Design

### 3a. Shadow record home — NEW dedicated table (proposed)

`c.tmr_shadow_decision` — one row per shadowed event:
`id · post_draft_id · render_log_id (nullable) · client_id · platform · format · seed_used · computed_at · selector_output jsonb (full select_template payload — winner, provider_template_id, proof evidence, slot_resolution, alternatives, rejected+reasons, warnings) · production_actual jsonb (template/provider/background/asset keys lifted from render_spec / draft) · divergence jsonb (see 3c) · selector_version text · registry_context jsonb (counts of selectable/proposed at compute time)`.
Service-fenced like its schema-c siblings (RLS-on-0-policies, no anon/authenticated grants). **Why a new table, not jsonb on existing rows:** zero coupling to production writers (`m.post_draft.draft_format` is ACI's surface; `render_spec` is the workers' — shadow must never contend with either), trivially rollback-able (DROP TABLE), and naturally queryable for the future dashboard panel.

### 3b. Population mechanics — two phases, separately gated

- **Phase S0 (this design's build lane): retroactive batch, no new infrastructure.** A PK-gated, hash-pinned one-shot harness walks the 14 historical drafts/17 renders, calls `select_template('property-pulse', platform, 'image_quote', null, seed = post_draft_id)` per event, and INSERTs shadow rows. No cron, no EF, no worker, no production-path code — the same lane pattern as every apply so far. **Immediate yield: a complete would-have vs did dataset from day one, sidestepping cadence entirely.**
- **Phase S1 (future, own gate): forward stamping.** Two candidate mechanisms, decision deferred:
  (i) **small cron EF `tmr-shadow-stamper`** — reads recent PP drafts/renders, writes only to the shadow table; total isolation from production paths (recommended);
  (ii) **ai-worker stamp extension** — most faithful draft-time timing, but touches a production worker (bigger gate, couples to ACI surface).
  S1 is NOT designed in detail here; S0's data will inform it.

### 3c. Divergence taxonomy (the honest-comparison rules)

- `expected_structural_divergence` — production's B1 template (`fb9820f8…`) is **not in the TMR registry** (recorded carry), so template-level mismatch is expected on ~every historical row and must be classed as structural, NOT as selector disagreement. (The B1-capture carry lane would upgrade this to genuine comparability — dependency noted, not required for S0.)
- `background_divergence` — both systems FNV-1a the draft id, but B1 rotates over canonical order `[perth, brisbane, sydney]` while the resolver ranks `[perth, sydney, brisbane]` — same hash, different index mapping ⇒ genuine, explainable background differences. Reported per row, never averaged away.
- `agreement` / `selector_disagreement` / `selector_fail_closed` (shadow failed closed where production rendered — the most interesting class) — each row gets exactly one primary class + notes.

### 3d. Boundaries (hard, all phases)

Shadow reads production tables and writes ONLY `c.tmr_shadow_decision`. Never touches `m.post_draft`, `render_spec`, queue, publisher, workers, dashboard, Format Mix, enablement. Shadow rows grant no status and are consumed by nothing at runtime. A shadow failure can never fail a render (S0 is offline; S1-i is isolated by construction).

## 4. PK decisions at this gate

1. **Record home:** new `c.tmr_shadow_decision` table (recommended) — vs jsonb on existing rows.
2. **v0 = retroactive batch (S0)** over the 17/14 historical pool (recommended) — vs waiting for forward events only.
3. **Forward mechanism (S1) deferred** to its own gate, with cron-EF isolation as the standing recommendation — ratify the deferral.
4. **Divergence taxonomy** (3c) — ratify, esp. classing B1 template mismatch as structural.
5. **B1 registry capture** carry: schedule before S1 (upgrades comparability) or leave parked.
6. **Seed convention:** shadow uses `seed = post_draft_id` (mirrors B1's rotation input; makes background comparison meaningful) — ratify.

## 5. S0 build lane preview (if approved, next gate)

One migration (CREATE TABLE, service-fenced) + one PK-gated batch INSERT harness (hash-pinned, exact-count assertions, rollback = DELETE by batch marker / DROP TABLE) + hermetic tests + the standard review chain (db-rls-auditor · security-auditor [new table, no DEFINER → likely n/a] · external review) + result doc. Expected output: ~17 shadow rows and the first "TMR would-have vs production did" report for your review.

**Production-isolation verification step (added per external review 2026-07-03 — mandatory in the S0 build lane):** the claim "shadow touches nothing production" is verified with evidence, not asserted: (a) db-rls-auditor confirms from catalog + code that NOTHING reads `c.tmr_shadow_decision` (no function/view/trigger/worker) and that the batch harness performs zero writes outside it; (b) pre/post-apply invariant probes — `m.post_draft`, `m.post_render_log`, queue, and publisher tables byte-count/checksum unchanged by the S0 run; (c) the batch runs while production crons remain active precisely because isolation is structural (read-only against production tables), with the invariant probes proving it after the fact.

## 6. Risks

- **R1 over-reading structural divergence** as selector failure — mitigated by the taxonomy (decision 4).
- **R2 stale-at-compute semantics:** S0 computes with TODAY's registry state (10 selectable), not the state at render time (0 selectable then) — every S0 row is honestly labelled `computed_at` with `registry_context`; shadow says "what TMR would pick NOW for that event", which is the operationally useful question. Recorded, not hidden.
- **R3 scope creep into S1/dashboard** — bounded by decision 3 and the packet's §3d.

## 7. External review record (2026-07-03)

`ask_chatgpt_review` on this packet (design hash at review time `d9b4e5d9a772402bff4b78f456163e6abd0c16c295a0e813da98f072d3386a51`): **verdict `partial` · risk medium · confidence medium · decision `escalate_explicit_flag` → surfaced to PK at this gate (which is exactly where this packet stops).** `review_id 38d288cb-07c5-48cb-acea-32bfa74dacd5`. **Triage:** no `concrete_defect`; classes `runtime_verification_required` (its corrected_action — "add a validation step to ensure no unforeseen production interaction" — is now folded into §5 verbatim-in-spirit as the mandatory production-isolation verification step) + `scope_design_concern` (design-oversight = PK's Gate 1 decision, i.e. this gate). Verified by the reviewer: the dedicated-table decoupling, the divergence taxonomy, the ground-truth counts. Its two cautions (design complexity; production-interaction assumption needs evidence) are answered by keeping S0 infrastructure-free (no cron/EF/worker) and by the new §5 verification step. *This packet was amended AFTER the review to incorporate the reviewer's requirement — the S0 build-lane artifacts will carry their own fresh review chain and hashes.*
