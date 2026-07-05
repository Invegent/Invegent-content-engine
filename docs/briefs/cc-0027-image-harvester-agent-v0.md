# Brief cc-0027 — image-harvester-agent-v0 (two-stage licence-safe image harvesting: harvest → review, PK-only approval)

**Created:** 2026-07-05 Sydney
**Author:** chat (drafted by `brief-author` CANDIDATE agent — provisional proving pass accepted by PK 2026-07-05; brief-author NOT promoted)
**Executor:** Claude Code (orchestrator) with PK gates
**Status:** issued (PK gate 1 passed 2026-07-05 with the decisions in §PK below)
**Result file:** `docs/briefs/results/cc-0027-image-harvester-agent-v0.md` (created on completion)

---

## PK gate-1 decisions (2026-07-05 — govern this lane)

- **Q1:** Named CANDIDATE exceptions to the CCF-02 "no new agents" deferral granted for **`image-harvester` and `image-reviewer` only**. Neither joins the CLAUDE.md standing team table while candidate. No other agent is opened.
- **Q2:** Proving rows = a **fresh 2-row mini-manifest** (NOT Batch 3/P1, no held rows): **row 1** neutral residential/suburb background; **row 2** property transaction / contract / keys background. Excluded outright: faces, auction crowds, agency branding, readable house numbers, Perth-specific/manual-source subjects.
- **Q3:** cc-number assigned **cc-0027** after re-reading the brief registry (highest existing cc-0026).
- **Q4:** New capability class accepted **for image-harvester only**: network **GET** + local writes confined to `_harness/image_harvester_v0/**`. `image-reviewer` remains read-only over the harvested package.
- **Q5:** Conservative licence defaults: **CC BY-SA = licence hold · CC BY = hold pending a PK rule · AI-generated imagery = excluded for v0.**
- **Hard boundaries (PK-restated, non-negotiable):** no DB mutation · no storage upload · no approval · no promotion · no `production_use_allowed` claim · no TMR/B1 background pool change · no commit/push without PK gate.
- **Goal restated:** build the two candidate agents and prove them on 2 sample rows only. Success = PK can review the package and recommendations. **Success does NOT mean any image is approved.**

---

## Task

Define — and prove on the 2 PK-designated sample rows — a safe two-stage image-harvesting workflow for ICE: **stage 1 `image-harvester`** collects candidate images and full provenance metadata from licence-safe sources only into a local `_harness/` package; **stage 2 `image-reviewer`** returns a per-candidate suitability + risk summary for PK. This mechanizes the proven manual PP background intake P0 pipeline — licence-safe harvest → PK visual review → coverage recon → fenced DB intake (docs/00_sync_state.md v4.82) — but v0 stops BEFORE the intake step: **no DB write, no storage upload, no approval, and no promotion occurs in v0, and the current TMR/B1 production background pool is untouched.** PK remains the ONLY approval authority at every point; both stages propose, never decide.

## Source context

- `docs/00_sync_state.md` (v4.82) — the manual precedent lane this workflow mechanizes, and the standing holds this brief carries: CC BY-SA licence-hold; auction-crowd/day-hero/Perth-aerial manual-sourcing carries; B3/B4 (P1) + B5 (P2) deferred; orphan `Brisbane_CBD_ Suburbs.jpg` separate lane.
- `_harness/pp_background_intake_p0/REVIEW_REPORT.md` — harvest-side precedent: workbook rows, package layout (`images/`, `final/`, `sheets/`, metadata workbook, `inventory.json`), licence/rights rules, the honest `not_harvestable_licence_safe` outcome class (row 8).
- `_harness/pp_background_intake_p0/PK_HANDOFF.md` — review-side precedent: PK verdict taxonomy (PASS / PASS_WITH_NOTE / PASS_GENERIC_ONLY / PARTIAL_FIT_ONLY / NOT_REVIEWED), blocked classes (BLOCKED_LICENCE_HOLD / BLOCKED_RIGHTS), metadata field standard, boundary language v0 inherits ("nothing approved, inserted, bound, rendered, published, or marked production-safe").
- `_harness/pp_background_coverage_recon/COVERAGE_RECON_PACKET.md` — contact-sheet + sha256 inventory package precedent.
- `docs/00_sync_state.md` (v4.87) — quadruple-fencing intake pattern for the SUCCESSOR lane (explicitly not v0).
- `docs/00_sync_state.md` (v4.92 + v4.95) — B1/TMR pool coupling: v4.92's rotation-alignment coupling and v4.95's Option D (TMR now controls the PP image_quote production slice). The pool-untouched boundary stands under either mechanism.
- `docs/00_sync_state.md` (v4.85 + v4.94) — CCF-02 "no new agents" deferral + the single-agent brief-author exception precedent; this lane's two agents enter under their own named PK exceptions (§PK Q1).
- `CLAUDE.md`, `docs/briefs/_template_brief.md`, `docs/briefs/_template_result.md` — contract + formats.

## Scope

**In scope:** (1) the two candidate agent definitions (`.claude/agents/image-harvester.md`, `.claude/agents/image-reviewer.md`) per §Notes 1–2; (2) allowed tools + forbidden actions per stage; (3) source/licence rules (§Notes 3, as amended by PK Q5); (4) output JSON contracts (§Notes 4); (5) contact-sheet + metadata-package requirements (§Notes 5); (6) a proving run on exactly the 2 PK-designated rows (§PK Q2); (7) all artifacts local to `_harness/image_harvester_v0/` plus returned JSON.

**Out of scope:** any DB write (DML/DDL/migration/RPC mutation); any storage upload; approval/promotion/activation of any asset; any change to TMR/B1 production pool membership or any governed/active asset row; adding either agent to the CLAUDE.md team table (stays candidate); the B3/B4/B5 harvest batches; the P0 manual-source holds; the successor fenced DB-intake lane (separate PK-gated lane, v4.87 pattern); dashboard UI; cron/automation; video assets.

## Allowed actions

**Orchestrator:** create `_harness/image_harvester_v0/`; author the mini-manifest rows exactly per PK Q2; run stage 1 then stage 2; run the external review gate on the final agent-spec/plan packet before executing; capture read-only pre/post invariant baselines and hand post-lane verification to `db-rls-auditor`; present package + JSONs + contact sheets to PK; write the result doc; stop before any commit (PK gate).

**`image-harvester` (candidate, PK-excepted):** query ONLY allow-listed licence-safe sources (§Notes 3); network **GET only**; download candidates to `_harness/image_harvester_v0/images/`; copy best-picks to `final/` named per proposed asset keys; compute sha256 from actual downloaded bytes; write metadata CSV/JSON + contact sheets under the same package root; return the manifest JSON (§Notes 4). Writes strictly inside `_harness/image_harvester_v0/**` — nothing else, ever.

**`image-reviewer` (candidate, PK-excepted):** read-only over the stage-1 package (file + image reading); verify package hashes; return per-candidate suitability + risk JSON (§Notes 4). No writes, no network.

## Forbidden actions

**Hard v0 boundaries (PK-restated):** no DB mutation of any kind (the intake step is OUT of v0; successor lane uses the v4.87 quadruple-fencing pattern under its own gates) · no storage upload (no writes to `brand-assets/` or any bucket) · no approval/promotion/activation/`production_use_allowed` change, and no output may describe any asset as approved/active/selectable/production-safe · TMR/B1 production background pool untouched (v4.92 coupling + v4.95 Option D; no v0 recommendation may instruct a pool change outside a future PK-gated lane) · no commit/push without explicit PK instruction.

**Hold-states carried:** no building/registering agents beyond the two PK-excepted candidates; no team-table edit while candidate · no B3/B4/B5 batch harvesting · CC BY-SA → BLOCKED_LICENCE_HOLD, never offered · CC BY → hold pending PK rule (Q5) · AI-generated imagery → excluded (Q5) · manual-source holds (auction crowd, bright-day Perth skyline hero, Perth-specific suburb aerial) are not targets · orphan `Brisbane_CBD_ Suburbs.jpg` untouched.

**Rights/licence hard rules:** no identifiable people without model release (and per PK Q2: no faces at all in this run) · no agency branding, readable house numbers, auction crowds, Perth-specific subjects (Q2) · no paid-licence sources (Unsplash+/Getty) · no candidate offered without the full provenance field set incl. licence name+URL and sha256 — a candidate that cannot be fully evidenced is dropped, never padded · unverified photographers / PII detail → warning-flagged, never a best-pick.

**Process:** external review on the final spec/plan packet before execution; any non-clean verdict halts the lane · neither agent asks PK anything, mutates anything outside its envelope, or approves anything — subagents are pure functions returning JSON.

## Success criteria

- Both candidate agent files exist with tools + forbidden actions matching this brief and PK Q4's envelopes.
- Proving run executed on exactly the 2 PK rows: each feasible row yields ≥1 candidate or an explicit `not_harvestable_licence_safe` finding — never an unsafe or padded candidate.
- 100% of offered candidates carry the full metadata field set with sha256 computed from actual downloaded bytes.
- Contact sheet(s) cover 100% of downloaded candidates; best-picks in `final/` under proposed asset-key filenames.
- Reviewer JSON per candidate: suitability class + risk classes + usage-constraint note, ZERO approval language.
- Post-lane invariants verified read-only (db-rls-auditor): `c.client_brand_asset` count unchanged · storage listing unchanged · `resolve_brand_assets` / TMR-B1 pool membership unchanged.
- PK can complete a visual review from the package alone; any PK outcome (including full rejection) completes v0.

## Stop condition

Report per `docs/briefs/_template_result.md`, then stop — before any commit. STOP-and-surface immediately on: any step requiring a DB or storage write; any licence situation outside §Notes 3 / PK Q5; any discovery that a sample row intersects the TMR/B1 pool, a governed asset, or a held batch; any mismatch between PK's designated rows and the run.

---

## Notes

*(§1 harvester scope, §2 reviewer scope, §3 licence rules, §4 JSON contracts, §5 package requirements, and §6 proving plan are as accepted at gate 1 — see the brief-author draft recorded in the lane; §3 operates under PK Q5's conservative defaults; §6 step 1 decisions are resolved in §PK above. §7's register-head uncertainty is resolved: this brief is issued against CE HEAD `151b850`, register head v4.95.)*

**Mini-manifest (PK Q2, authoritative for the proving run):**

| row_key | description | constraints |
|---|---|---|
| `bg_generic_residential_suburb` | neutral residential/suburb background (generic AU-plausible, not city-identified) | no faces · no agency branding · no readable house numbers · not Perth-labelled · text-overlay-friendly composition preferred |
| `bg_property_transaction_keys` | property transaction / contract / keys background | no faces · no identifiable signatures/PII on documents · no agency branding · text-overlay-friendly composition preferred |
