# image-harvester + image-reviewer — Promotion Review (CANDIDATE → PROVEN-SCOPED)

**Created:** 2026-07-05 Sydney · **Lane:** T1 docs/governance · **Label:** SAFETY_GATE · **Decision owner:** PK (CCF-02 ladder step 4)
**Charters under review — byte-unchanged since build through every run:** `.claude/agents/image-harvester.md` `b09ebf2b462283822006a322c6a85a5f24626b42d735236b22a47dfb58a219ee` · `.claude/agents/image-reviewer.md` `f582915ab69b49b607d5576c0df7e873f43996802744e7f4725a3ae5cff5b7a3` (both reviewed pre-execution in cc-0027, review `0dc99a6f` agree; committed `1550689`, register v4.97)

## Proving record (both agents, 2026-07-05, two sessions)

| Evidence | What it proves |
|---|---|
| **cc-0027 two-row mini-proof** (session A run 1; v4.97 workflow PASS) | end-to-end two-stage workflow on the PK mini-manifest: 8 candidates, 8/8 constraint-clean, 7 honest rejects (city-identified, faces), full provenance, contact sheets, DB/storage invariants byte-identical, 14/14 hashes verified |
| **Registered-type harvester run** (session A; review `8e333186` agree; result-doc addendum `b7d09e0`) | the registered type executes its contract cleanly; **rejection discipline live**: Unsplash+ **paid-tier refusal** at the licence gate + a **readable-label candidate downloaded → inspected → failed → deleted**; run-1 evidence kept byte-intact (20/20) via sub-path isolation |
| **Session B run 1** (`mm_a/mm_b`, commit `894247c`) | second independent execution; 11 downloads, 8 offered; **image-reviewer's independent Villanova catch** — upgraded a harvester warning to REJECT_PROPOSED because "VILLANOVA COLLEGE" is readable inside the 1:1 centre crop; plus same-frame-duplicate proof and attribution resolution. **The two-stage design caught a stage-1 misjudgment — the exact failure mode the reviewer exists for** |
| **Day-hero stress proof** (session B `run2_stress`, PK-ratified manifest) | both failure directions clean: licence-trap row NAVIGATED (12 screened, 3 offered, 9 rejects all pixel-justified, zero CC material offered) and fail-closed row EXERCISED (`not_harvestable_licence_safe`, empty-return audited REFUSAL_JUSTIFIED with retained search evidence); harvester improved run-over-run (zero description/pixel mismatches after the run-1 Villanova miss); reviewer added the mm_c-03 half-res branding downgrade + a latent-risk note |
| **Product outcome chain** — day-hero best-pick PK-accepted (visual) → **v5.01 double-fenced intake** (T2, pool-neutral proven, `b2a10008…`) → **v5.02 live production promotion** (T3, CAS-guarded, per-platform fence proven, Option-D pool 5→6 fb/li) → **witnessed live selection: seed `wit-1` on the production market_insight template SELECTS the day-hero** | the agents' output traversed every PK gate into governed production and was **witnessed being selected live** — the sourcing→review→intake→promotion pipeline delivered real production value, with the agents touching none of the gated steps themselves |
| **Boundary record across all runs** | zero DB/storage mutation by either agent ever (session A fingerprints byte-identical all day; v5.01/v5.02 were separate PK-gated lanes with their own full chains); writes always confined to the harness package; GET-only network; zero approval-language violations by the reviewer; all runs externally reviewed pre-execution |

## Ladder assessment

**Built** ✓ (cc-0027 PK exceptions, reviewed, committed) · **Exercised** ✓ (harvester: 4 executions across 2 sessions incl. registered-type; reviewer: 3 executions, all registered-type-era) · **Verdict confirmed** ✓ (PK accepted the packages; the day-hero verdict and its v5.01/v5.02 successor gates all passed with the agents' evidence load-bearing and never the failure point) · **Promoted** — PK's decision at this gate.

**Honest limitations on record:** the harvester signage-severity weak edge assessed in full below (external-review request `4701ef73`) · reviewer cannot recompute byte-hashes (by design — a named orchestrator checklist step) · all evidence is one day, background imagery, Property Pulse context — which is exactly why the promotion is SCOPED.

## Calibration-miss risk assessment (added per external review `4701ef73`)

**Nature — severity misclassification, not detection failure, and not a one-off.** Two instances of the same class across the record: (1) session B run 1 — harvester SAW and recorded the Villanova signage but graded it a warning; the reviewer re-graded REJECT_PROPOSED (readable inside the 1:1 crop). (2) Stress run — harvester offered `rachelclaire 6761495`; the reviewer downgraded it PARTIAL_FIT_ONLY (readable corporate branding exactly in the 1:1 text band, legible at half-res). In both cases the harvester detected and disclosed the feature — its **severity judgment on readable third-party signage/branding is the known weak edge**. (The registered-type run shows the discipline CAN fire: a readable-label candidate was inspect-fail-DELETED there.)

**Why the risk is contained, structurally:** (a) stage-2 review is an independent pixel-level re-grade of every candidate — both instances were caught by the designed control, not by luck; (b) no autonomous path exists from harvester output to any consequence: reviewer → PK visual gate → separate PK-gated intake → separate PK-gated promotion; worst case is a weak candidate reaching the PK visual gate, which exists precisely to judge candidates.

**Mitigations bundled into the promotion edits (making the fix contractual, not aspirational):**
1. **Charter calibration line (harvester):** "readable third-party signage, branding, or names inside the plausible crop area → REJECT with reason, never warn-and-offer." (One-line addition to its licence/rights rules at the promotion edit.)
2. **Two-stage coupling made a scope condition:** PROVEN-SCOPED status is conditional on harvester output ALWAYS passing image-reviewer before any PK presentation — harvester-only packages are out of scope of the promotion.
3. **Watch item:** the next lane's signage-class decisions are named in its result doc (repeat instances re-open the calibration question at PK's discretion).

**Residual risk after mitigations:** a mis-graded candidate costs PK one wasted look at the visual gate. No production, DB, storage, or approval surface is reachable by the failure mode.

## Scoped promotion wording (PK verbatim — becomes the charter scope fence)

**PROVEN for governed background-image sourcing/review under PK-gated intake/promotion.**
**Not yet proven for:** people-forward images · auction/crowd imagery · CC BY / CC BY-SA unlocks · paid-stock exception flows · commissioned-shoot sourcing · non-Property-Pulse brands · automatic approval or promotion.

## Proposed promotion edits (applied ONLY on PK approval)

1. Both agent headers: CANDIDATE → **PROVEN-SCOPED** with the proving record + the scope fence verbatim + the findings-contract appendix (lazy adoption at edit time; native verdicts map HARVEST_COMPLETE/REVIEW_COMPLETE→clean, *_PARTIAL→concerns, *_BLOCKED→block) **+ the two calibration mitigations from the risk assessment (harvester signage-REJECT line; two-stage coupling as a scope condition).**
2. CLAUDE.md: add both rows to the v1 team table (toolsets unchanged: harvester GET+harness-confined-writes per its PK-accepted capability class; reviewer Read/Glob/Grep) and replace the "remain CANDIDATES outside this table" prose with the PROVEN-SCOPED note + scope fence.
3. Register pointers (Convention 1), version claimed per protocol at edit time (working tree currently shows an uncommitted parallel v5.03 claim — next free number determined at cut).

**Non-claims:** nothing here promotes the agents — PK does, or doesn't · no image/asset is approved or promoted by this packet · no DB/storage/render/publish/deploy surface touched · no new agents · D6 untouched · the scope fence means every listed not-yet-proven category runs at candidate-level scrutiny (or its own PK exception) when first attempted.
