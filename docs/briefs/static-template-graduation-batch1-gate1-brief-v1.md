# Brief — Static Template Graduation Batch 1 (image-quote layouts)

**Created:** 2026-07-29 Sydney
**Author:** brief-author (draft), orchestrator (persisted)
**Executor:** Claude Code (orchestrator + subagent chain)
**Status:** APPROVED — PK Gate 1, 2026-07-29. Decisions: (1) scope ceiling = **readiness + proposal only** (the code-change spec is a named future Gate 1, not a Gate-2 step of this lane); (2) candidate set = **proposed default** (`generic_stat_hero_card_1x1_v1`, `generic_announcement_card_1x1_v1`, `generic_carousel_cover_1x1_v1`). The carousel cover/body/closing coupling question (open question #3) and the rung-6 mechanism question (open question #4) are **not yet ruled on** — both are carried into execution as named open items in the result doc, since neither blocks rungs 1/3/4 evidence-gathering for the cover template alone.
**Result file:** `docs/briefs/results/static-template-graduation-batch1-result-v1.md` (created on completion)

---

## Task

Advance a PK-confirmed subset (proposed: 2-3) of the 13 zero-render-history generic static `image_quote` template families toward production readiness, following the ratified 9-state proof ladder / 13-rung checklist (`docs/briefs/results/creatomate-registry-integrity-graduation-contract-v1.md` §1.2, §4). **A load-bearing code-level finding, confirmed this brief, changes what "graduation" can mean for this batch today:** image-worker's `buildTmrRenderPlan` enforces a fail-closed, per-template-name allowlist (`TMR_WINNER_TEXT_FIELDS`, `supabase/functions/image-worker/b1_production.ts:199-241`) that currently contains **exactly two entries** — `generic_market_insight_card_1x1_v1` (row 5) and `generic_quote_card_1x1_v1` (row 7), the two already-production templates. Any other winner name throws `tmr_winner_unmapped` (`b1_production.ts:301-320`) and this is the ONLY render path that exists — both the production `image_quote` loop (`image-worker/index.ts:952,958`) and the supervised `governed_image_quote_smoke` entrypoint (`index.ts:833-840`) call the same `buildTmrRenderPlan`. **This means, confirmed by static code read (not inferred), that zero of the 13 candidate families can reach a real render through any existing image-worker entrypoint today — rung 2 (field-contract compatibility) fails for all 13, universally, not conditionally per-family.** This is the direct, decisive answer to the graduation matrix's open question #4 (`creatomate-template-graduation-matrix-v1.md` §6 item 4). Given the standing task boundary — a family whose fields don't match needs new/extended worker code, a bigger, separately-gated task, not silently folded into this batch — the realistic terminal artifact for THIS brief is a **graduation-readiness + code-change-proposal packet**, not an executed status-promotion SQL packet. PK confirmation of this reframing is needed before Gate 1 executes.

## Source context

- `docs/briefs/results/creatomate-template-graduation-matrix-v1.md` — full 27-row live inventory (2026-07-29); §2.1 documents the 13 unproven families' shared field contract (Background/Scrim/Logo + 1-2 family-specific text fields); §4.2 / §5.1 name this exact batch as requiring a real proof run, and explicitly defer WHICH 2-3 templates to PK/demand, not data.
- `docs/briefs/results/creatomate-registry-integrity-graduation-contract-v1.md` — canonical 9-state proof ladder (§1.2) and 13-rung reusable checklist (§4) this batch must follow rung-by-rung; §2's per-client evidence-attribution rule (a promotion must never draw on another client's or template-level-aggregate proof) governs the eventual (future, code-lane-gated) promotion step; this packet is APPLIED (2026-07-29) — rows 5, 7, 17 are already resolved and are NOT part of this batch.
- `docs/briefs/results/creatomate-migration-integrity-closeout-v1-result.md` — immediately-preceding closed lane; its own §7 stop condition names this batch as the next queued Creatomate Global outcome.
- `supabase/functions/image-worker/b1_production.ts:199-241` (the `TMR_WINNER_TEXT_FIELDS` allowlist + its own comment that v1 ships a vendored text-field mapping for `generic_market_insight_card_1x1_v1` ONLY) and `:301-320` (`buildTmrRenderPlan`'s fail-closed throw `tmr_winner_unmapped`) — the field-contract-compatibility pre-check named in the task, now resolved (negatively, universally) rather than open.
- `supabase/functions/image-worker/index.ts:952,958` (production `image_quote` loop calling `select_template` then `buildTmrRenderPlan`) and `:833-840` (the supervised smoke entrypoint, same call chain) — confirms there is no alternate render path that bypasses the allowlist.
- `supabase/migrations/20260702124329_tmr_registry_additive_capture_batches35_generic_static_v2.sql:57-178` — confirms the family-specific field NAMES (`CategoryBadge`, `Rating`, `SlideNumber`, etc.) already exist as `c.creative_provider_template_field` rows in the registry for the 13 families; the gap is purely on the worker-code side, not a missing-data problem.
- `c.creative_provider_template` (27 rows, project `mbkmaxqhsohbtwsqolns`) — the live registry table this batch's rungs 1/3/4 read against; live re-verification is a `db-rls-auditor` handoff, not something the brief-author agent queried directly (it has no DB access).
- `CLAUDE.md` — orchestration contract: agent roster, Convention 3 risk tiers (T2 minimum for isolated code / additive DB reads; escalates to T3 for any real render/draft/publish or worker-code change), standing deploy/DB gotchas, CCF-02 findings-contract shape.

## Scope

**In scope:**
1. PK confirms (or overrides) the specific candidate set for "Batch 1" from the 13 eligible families. **Proposed default (NOT a decision — PK's to confirm/override):** 3 templates chosen for visual/use-case diversity —
   - `54b305c8…` `generic_stat_hero_card_1x1_v1` (stat-style card)
   - `a75e7139…` `generic_announcement_card_1x1_v1` (announcement style) — alternate option: `1dcb4c91…` `generic_testimonial_card_1x1_v1` (testimonial style)
   - `c9a59faa…` `generic_carousel_cover_1x1_v1` (carousel style) — **note:** a usable carousel post plausibly needs its cover+body+closing sub-templates together (`c9a59faa…`/`c4c0fc9d…`/`8aeb946c…`); if PK wants a carousel represented, confirm whether that means graduating the single cover template alone or the 3-part carousel set as a unit.
   (IDs as given by the matrix's 8-hex-char citation; full UUID confirmation against live `c.creative_provider_template` is the first `db-rls-auditor` step, not assumed here.)
2. For each PK-confirmed candidate, run the graduation-ladder rungs that are achievable WITHOUT new worker code, as static/read-only checks:
   - **Rung 1 (provider existence):** confirm the registry row (`db-rls-auditor`).
   - **Rung 2 (field-contract compatibility):** already answered by this brief for the class as a whole (universal FAIL — no `TMR_WINNER_TEXT_FIELDS` entry exists for any of the 13); the per-candidate deliverable is documenting the EXACT diff between the candidate's `c.creative_provider_template_field` rows (already captured, per migration `20260702124329…`) and what would need to be added to `TMR_WINNER_TEXT_FIELDS`/`TMR_WINNER_LAYOUT_GUARD`.
   - **Rung 3 (dimensions/duration/output parity):** confirm against the target format contract via registry data only (`db-rls-auditor`).
   - **Rung 4 (governed asset resolution):** the Background/Logo slot contract is shared across the whole generic-card family (matrix §2.1) and already proven live for rows 5/7 via `resolve_slot_assets`; confirm live (`db-rls-auditor`) that `resolve_slot_assets` succeeds for at least one real client/seed for each candidate's Background/Logo slots — this is a read-only RPC call, not a render.
   - **Rung 5 (audio):** n/a — static images.
   - **Rung 6 (PK visual approval):** **flagged, not assumed achievable within this brief** — see Open Questions; no existing entrypoint can produce a real preview render for an unmapped family (per the finding above), so this rung's evidence path (an actual rendered preview, per the ladder doc's own text, "need not be through the real production pipeline") needs a named mechanism PK confirms, or stays open.
3. Produce a **graduation-readiness + code-change-proposal packet** (docs-only artifact) per confirmed candidate: current state on rungs 1/3/4, the exact field-mapping gap (rung 2), and a scoped, minimal proposed addition to `TMR_WINNER_TEXT_FIELDS`/`TMR_WINNER_LAYOUT_GUARD` (spec only — field names, no executable diff) modeled exactly on the existing 2 entries, for PK to elect as the next gate (its own ef-builder T2 lane) or hold.
4. Register-pointer update per Convention 1 (≤5 lines) naming this batch's terminal state.

**Out of scope:**
- Any real render, draft, or publish attempt for any of the 13 families (confirmed structurally blocked — see Task) — this stays out of scope until a separately-gated ef-builder lane adds the required field mapping.
- Any actual code change to `b1_production.ts`/`index.ts` (the proposal in item 3 above is a spec, not a diff or commit — executing it is a fresh Gate 1).
- Rows 5, 7, 17, 19, 26, 27 (already resolved or under active PK-elective hold per the registry-integrity contract) — no touch.
- Rows 20-25 (fenced ICE reskin video batch) and row 26/27 (video family) — separate lane, separate worker-code project for 4 of the 6.
- Any change to `select_template` ranking/selector logic, RLS, grants, or DDL.
- Any publish to a live client-facing platform.
- The carousel 3-template question (item 1 above) resolving itself silently to "3 separate unrelated single templates" — if PK wants carousel represented, the cover/body/closing coupling needs an explicit ruling, not a default assumption.

## Allowed actions

- Read `c.creative_provider_template`, `c.creative_template_client_assignment`, `c.creative_template_variant_candidate`, `c.creative_template_platform_suitability`, `c.creative_provider_template_field`, `c.creative_template_proof_event` for the PK-confirmed candidates (`db-rls-auditor`, SELECT-only, via `ice_ro`/`db-read.py` where an R0 view covers it, else `execute_sql` read).
- Call `resolve_slot_assets` read-path (or equivalent) for the candidates' Background/Logo slots to verify rung 4 — a read/RPC call, not a write.
- Grep/read `image-worker` source further if needed to confirm the exact field names each candidate's target rendering would require.
- Draft the readiness packet + code-change proposal as a docs-only artifact.
- Register-pointer update per Convention 1, on explicit PK instruction to commit.

## Forbidden actions

- Do NOT attempt a real render, draft, or publish for any of the 13 families through any existing image-worker entrypoint (production loop or `governed_image_quote_smoke`) — confirmed above that both throw `tmr_winner_unmapped`; attempting one anyway would just produce a failed draft (`image_status='failed'`), consuming a real draft slot for no evidence.
- Do NOT write or propose an executable diff to `b1_production.ts`/`index.ts` inside this lane — the code-change item is a NAMED PROPOSAL for a future, separately-gated ef-builder T2 lane, per the task's explicit boundary against silently folding worker-code changes into this batch.
- Do NOT touch `fit_status`, `assignment_status`, or `status` for rows 5, 7, 17, 19, 26, or 27 — all resolved or under an active PK-elective hold (row 19) per the applied registry-integrity contract.
- Do NOT touch the fenced rows 20-25 or attempt to un-fence any `variant_candidate=0` assertion.
- Do NOT change `select_template` selector/ranking code or logic.
- Do NOT deploy, migrate, GRANT/REVOKE, or perform any DDL/DML — this lane is investigation + proposal only.
- Do NOT treat a PASS on rungs 1/3/4 as "graduated" — per the ladder's own rule (§4 preamble), a later rung never retroactively satisfies an earlier or unrelated one, and rung 2's universal FAIL for this class means no candidate advances past `candidate`/`ready_for_proof`-pending-code today regardless of rungs 1/3/4's outcome.
- Standing CLAUDE.md deploy/DB gotchas apply to any future ef-builder/deploy lane this brief's proposal spawns: `--no-verify-jwt` on any EF redeploy, explicit `REVOKE ... FROM anon, authenticated` (not `PUBLIC` alone) on any new service-role-only object, migration name = permanent identity.

## Success criteria

- PK has explicitly confirmed (or overridden) the specific candidate set for Batch 1, including a ruling on the carousel cover/body/closing coupling question if a carousel template is included.
- For each confirmed candidate: rungs 1, 3, 4 are checked with live evidence (not assumed), and rung 2's field-mapping gap is documented exactly (which `c.creative_provider_template_field` element names exist vs. which `TMR_WINNER_TEXT_FIELDS` entry would be needed).
- A concrete, PK-reviewable code-change proposal (field mapping + layout-guard spec, modeled on the existing 2 entries) exists per candidate, named as its own future ef-builder T2 gate.
- Zero renders, drafts, or publishes attempted; zero code committed; zero registry status mutated for any of the 13 candidates.
- Result doc + register pointer (Convention 1) recorded, naming this as the readiness/proposal terminus, not a graduation.

## Stop condition

Report the readiness + code-change-proposal packet per the result template, then stop. Do not proceed to an ef-builder code lane, a real render attempt, or any status promotion without a fresh PK Gate 1 on the follow-on lane this packet proposes.

---

## Notes

**The single most important fact for PK to read before this executes:** the task as named ("multiple visually distinct image-quote layouts into the production portfolio") assumed a data-only or proof-run path similar to rows 5/7. That assumption does not hold for any of the 13 remaining families — `b1_production.ts`'s `TMR_WINNER_TEXT_FIELDS` is a hand-curated, fail-closed allowlist with exactly 2 entries, and adding a family requires a genuine code change (new map entries + likely a layout guard, given row 5's `TMR_WINNER_LAYOUT_GUARD` was needed to fix a real overprint defect — cc-0033a). This is not a per-family unknown to discover during execution; it is a universal, already-confirmed fact. The brief is drafted to still be useful (candidate selection + rungs 1/3/4 evidence + a scoped code proposal) without silently expanding into a code lane or silently pretending the batch can complete data-only.

## Open questions (PK Gate 1)

1. **Candidate set** — confirm or override the proposed default (stat hero card, announcement-or-testimonial card, carousel cover). Which 2-3 (or however many) of the 13 families should Batch 1 actually cover?
2. **Scope ceiling** — given the universal rung-2 blocker, should this lane's own execution extend to drafting the actual worker-code change (field-mapping + layout-guard spec, still no executable diff/commit) as a named Gate-2 step of the *same* lane, or should the code-change proposal be handed off as a separate, later-named brief entirely?
3. **Carousel framing** (only if a carousel template is in scope) — is a single carousel-cover template a meaningful graduation unit on its own, or does "carousel" only make sense as the cover+body+closing 3-part set graduated together?
4. **Rung 6 mechanism** — is there an existing captured preview/render from the 2026-07-02 template-capture that could ground a PK visual-approval rung without building a new render mechanism first, or does that also need to wait on the worker-code fix?
