# Brief cc-0033 — Wire the headline capability contract into the ai-worker writer prompt (+ calibrate real headline capacity)

**Created:** 2026-07-10 Sydney  
**Author:** brief-author (draft) + orchestrator (candidate-level scrutiny corrections)  
**Executor:** Claude Code (ef-builder code lane)  
**Status:** draft  
**Result file:** `docs/briefs/results/cc-0033-headline-capability-contract-wiring.md` (created on completion)

---

## Task

Close the deferred half of the ACI foundation so the headline capability contract stops being decorative and becomes load-bearing.

`docs/creative-library/registry-schema-v2.md:180-186` defines a Capability Contract as *"the **source of truth the runtime consumes** via a vendored projection."* Today it is not consumed by anything that shapes the headline:

- The contract declares `headline max_chars: 90` (`supabase/functions/ai-worker/creative_contract.ts:144-149`).
- At **write** time it is resolved (`ai-worker/index.ts:993`) and used ONLY to stamp additive provenance (`ai-worker/index.ts:1102-1103`). The stamp shape carries identity/provenance and **no field limits at all** (`ai-worker/contract_stamp.ts:10-18`) — so the number physically cannot reach the render path.
- The authoring prompt gives the model **no character or line budget**: `image_headline: 10-15 word pull quote for the visual overlay` (`ai-worker/index.ts:643`).
- At **render** time the fail-safe throws on a hardcoded, self-described PROVISIONAL constant, not the contract (`image-worker/b1_production.ts:35-40, 75-85`), and the validator is WARN-ONLY, always resolving `limit_source: 'fallback_constant'` because the contract carries no `limits` object (`image-worker/contract_validation.ts:8, 51-55`).

Consequence, observed live: a PP card published 2026-07-05 rendered with the headline wrapped to 4 lines, **overprinting the subtitle** and making the middle of the card unreadable.

This lane (1) **empirically calibrates** the real headline capacity, (2) wires that calibrated budget from the contract into the ai-worker authoring prompt so the model writes to fit, (3) gives the contract a real `limits` shape so `limit_source` can become `'contract'`, and (4) decides whether the render-time backstop reads the contract instead of the constant.

**`90` is the wrong kind of limit.** It is a raw character count standing in for what is really a line-count / rendered-height capability in a fixed-position template.

## Source context

- `docs/creative-library/registry-schema-v2.md:180-186, 227` — Capability Contract = the source of truth the runtime consumes via a **vendored projection**; **no production worker imports the JSON at runtime** (runtime-import guard).
- `supabase/functions/ai-worker/creative_contract.ts:124-196` — vendored PP image_quote contract. `fields.ai_authored[0]` = `{ field: 'headline', required: true, max_chars: 90, policy: 'hard_gate_throw' }` (`:144-149`). Resolver gates strictly on `client_id` + `'image_quote'` (`:210-221`).
- `supabase/functions/ai-worker/contract_stamp.ts:10-18` — `ContractStamp` = variant_key / contract_ref / contract_version / selector_reason / registry_version / source_commit / resolved_at. **No `max_chars`. No `limits`.** This is the structural break in the loop.
- `supabase/functions/ai-worker/index.ts:643` — the `image_headline` instruction; **no budget**. `:993` resolve; `:1100-1104` additive stamp only. Header `:20-32`: *"ADDITIVE METADATA ONLY … no AI-prompt change."*
- `supabase/functions/image-worker/b1_production.ts:35-40` — `B1_HEADLINE_MAX_CHARS = 90; // PROVISIONAL / to_be_calibrated`.
- `supabase/functions/image-worker/b1_production.ts:75-85` — `assertHeadlineWithinGate` throws fail-loud on that constant (no truncation, no AI rewrite): a too-long headline **fails the draft** (`image_status='failed'`), it does not overlap.
- `supabase/functions/image-worker/contract_validation.ts:8, 51-55` — WARN-ONLY; `limit_source` → `'fallback_constant'` whenever `contract.limits` is not an object, which it never is.
- `supabase/functions/image-worker/b1_production.ts:152-161` — `TMR_WINNER_TEXT_FIELDS`: the winner→field **name map only** (`Headline.text`, `Subtitle.text`, …). **It carries no geometry.**
- **Layout geometry is NOT in this repo.** Element position/size for `generic_market_insight_card_1x1_v1` lives provider-side in Creatomate template `48cba556-0a53-4001-90f0-05420d10efc0` (verified from `m.post_render_log.render_spec->'tmr'->>'provider_template_id'` on a succeeded governed render). **This is why capacity must be established by probe render, not read from source.**
- Live triage evidence (orchestrator read-only query, CCF-02 R1 — DB is not this lane's subject): `m.post_render_log` where `render_spec->>'label' = 'creative_library_b1_production'` and `status='succeeded'`, n=23 since 2026-06-26 — headline length **min 52 / avg 65 / max 78** chars; **11 of 23 (48%) are ≥60 chars**. Extracted from `contract_validation.checks[name='headline'].detail`.
- `docs/briefs/results/pp-static-tmr-cross-platform-quality-proof-v1-result.md` — logs 4 carries (C1 geo-pairing, C2 scrim contrast, C3 sold_sign crop, C4 LinkedIn). Grep confirms **no headline/subtitle overlap entry**. This lane newly logs that defect.
- `CLAUDE.md` — §Risk-tiered review chains, §PK gates, §Standing ICE deploy/DB gotchas, CCF-02 R1/R4.

## Scope

**In scope:**
1. **Calibration.** Empirically establish the real headline capacity — the char count (and/or line budget) at which the headline wraps past the safe line budget for the fixed `Subtitle.text` position. Probe renders go to `_smoke/` **only**: no drafts, no publish, no `m.post_draft` writes.
2. Define the `limits` shape the vendored contract must carry so `contract_validation.limit_source` resolves to `'contract'`.
3. Wire the calibrated capability from the contract into the **ai-worker authoring prompt** so the model writes to fit.
4. Keep `assertHeadlineWithinGate` as the render-time fail-safe backstop; decide (PK) whether its constant is replaced by a contract read.
5. Newly log the 2026-07-05 headline/subtitle overlap as a defect.

**Out of scope:** format selection / TMR spine / render selection (`buildTmrRenderPlan` untouched beyond the headline budget); carries C1–C4; subtitle-derivation policy beyond what calibration requires; any non-PP client or non-`image_quote` format (resolver returns null — `creative_contract.ts:210-221`); any edit to `docs/creative-library/*.json` **unless** PK elects it (then a `creative-graph-auditor` static pass is required before the gate).

## Allowed actions

- Read repo, docs, registers, and `m.post_render_log` as evidence.
- Perform calibration probe renders to `_smoke/` only, capturing the wrap threshold with visual evidence (cropped proofs / contact sheet). No drafts, no publish, no DB writes.
- In an **isolated worktree** (code lane): edit the ai-worker authoring prompt to carry the calibrated budget; add the `limits` shape to the vendored contract projection(s); optionally wire `assertHeadlineWithinGate` / `contract_validation` to read the contract limit **if** PK approves that design at the gate.
- Run hermetic deno tests for the changed pure modules.
- **Prepare — not execute —** the ai-worker (and, if changed, image-worker) deploy plan with `--no-verify-jwt` confirmed.

## Forbidden actions

- **No runtime JSON import.** No worker may read `docs/creative-library/*.json` at runtime; a contract change is a vendored-projection edit only (`registry-schema-v2.md:183-184, 227`).
- **No probe render to production surfaces.** `_smoke/` only — no `m.post_draft`, no publish, no scheduler, no live post.
- **Deploy/merge/migrate is a HARD STOP for PK** (`CLAUDE.md` §PK gates). Any `supabase functions deploy` MUST carry `--no-verify-jwt` or it flips `verify_jwt`→true and breaks `x-series-key`-only callers. `deploy_edge_function` / `apply_migration` are deny-listed hard-stops; any autonomous apply needs an explicit PK-authorised temporary lift, restored byte-exact afterwards.
- **No silent behaviour tightening.** Do NOT ship a tighter effective limit without PK's explicit decision — tightening converts a silently-ugly render into a **failed/blocked draft**.
- **No change to format selection, the TMR spine, or render selection** beyond the headline budget wiring.
- **R4 / parallel-session hygiene.** In-flight lanes (PP video TMR v5.44, Music Library) hold unpushed commits; claim the register version via a result-doc stub and **never push another session's unpushed commit** without explicit PK authorization.

## Success criteria

- The real headline capacity is **empirically established** from `_smoke/` probe renders, evidence recorded in the result doc — not assumed. (The believed ~55–60 char safe budget is an open question the lane resolves, not an input.)
- The ai-worker authoring prompt carries the calibrated budget (`index.ts:643` region changed) so the model writes to fit.
- The vendored contract carries a `limits` shape such that `contract_validation` resolves `limit_source: 'contract'` (`contract_validation.ts:51-55`) for a freshly-stamped draft.
- `assertHeadlineWithinGate` is either preserved on the constant or wired to the contract per PK's decision; the fail-loud consequence is documented.
- The 2026-07-05 overlap is logged as a defect, closing the gap in `pp-static-tmr-cross-platform-quality-proof-v1-result.md`.
- Hermetic tests for the changed pure modules pass; the change set contains exactly the approved files.

## Stop condition

Report result per `docs/briefs/_template_result.md`, then stop. Deploy of ai-worker (and image-worker if changed) is a **separate PK gate** — prepare the exact command(s) with `--no-verify-jwt`, run external review on the final diff, and STOP for PK.

---

## Notes

**Tier / label (PK confirms at Gate 1):** proposed **T3** — the lane touches a live production render path and requires at least an ai-worker deploy (deploy → T3; doubt → higher tier). Lane label proposed **PRODUCT_PROOF** (wiring the write-to-fit capability loop) with a **SAFETY_GATE** dimension (it fixes a live overprint defect); PK picks the single label.

**Chain:** ef-builder in an isolated worktree → branch-warden `safe` → db-rls-auditor (required in every T3 chain) → external review pinned to the final diff hash → PK deploy gate.

### PK decisions required (at or before Gate 1)

1. **Accept the tightening?** A tighter effective limit converts a silently-ugly overprinted render into a **failed/blocked draft** whenever the writer produces a too-long headline. This is a product/policy call, not a defect to fix silently. (Mitigation: wiring the writer prompt first should make blocks rare — but the backstop will still fire.)
2. **Should `assertHeadlineWithinGate` read the contract** instead of `B1_HEADLINE_MAX_CHARS`? Determines whether writer budget and render backstop stay in sync from one source, and the fail-loud blast radius.
3. **Vendored-projection only, or also the declarative registry?** If `docs/creative-library/property-pulse.json` changes, a `creative-graph-auditor` static pass is required before the gate.

### Provenance / scrutiny notes

- Drafted by `brief-author`; this is its **first code-lane brief** (PK scoped-note → candidate-level scrutiny applied, not treated as proven breadth).
- **Orchestrator correction applied:** the draft cited `b1_production.ts:153-160` as "the collision geometry." That range is the field-**name** map only and carries no geometry. Layout position lives provider-side in Creatomate template `48cba556-…`, not in this repo — which is the reason calibration must be empirical. Corrected above.
- **Orchestrator correction applied:** the render-log distribution was verified by orchestrator read-only query (CCF-02 R1 permits triage evidence where the DB is not the lane's subject), not merely asserted. `db-rls-auditor` remains in the T3 chain.
- Not verified by this draft: live git HEAD / unpushed-commit state (→ `branch-warden` before the worktree cut); whether `property-pulse.json` already carries a field-limit shape (→ read before electing PK decision 3).
