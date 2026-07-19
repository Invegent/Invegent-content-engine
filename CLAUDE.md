# ICE — Orchestration Contract (subagent team v1)

This file governs how the **orchestrator** (the main Claude Code loop) drives the ICE
subagent team. It is the standing contract for command-and-review automation:
**agents reduce cognitive load; PK stays at every irreversible gate.**

## Core principle

> Subagents are pure functions: input → structured findings. The orchestrator owns
> every human gate and every external gate. No subagent asks PK, deploys, merges, or
> mutates production.

Human-in-the-loop tools (`AskUserQuestion`, plan mode) and the external-review decision
live **only at the orchestrator level** — subagents cannot reach them. A subagent's
only output is its returned JSON.

## The team (v1 — built)

| Agent | Mode | May | May NOT |
|---|---|---|---|
| `ef-builder` | write, isolated worktree | edit/write code, run local checks | deploy, migrate, push, merge |
| `branch-warden` | read-only | inspect git state | mutate any ref |
| `db-rls-auditor` | read-only | run SELECT/catalog reads, advisors | DML/DDL, apply migration, deploy |
| `security-auditor` | read-only | security triage: classify exposure, caller/blast-radius, GREEN/AMBER/RED, design remediation batches + D-01 packets | apply migration, REVOKE/GRANT, ALTER FUNCTION, write DB, edit repo, close findings |
| `creative-graph-auditor` | read-only (`Read`/`Grep`/`Glob`) | static-audit the Creative Library v2 declarative object graph (`docs/creative-library/*.json` + `registry-schema-v2.md`): JSON/schema shape, key uniqueness, reference resolution, evidence-SHAPE, runtime-import guard, vendored-registry drift; return a PASS/FAIL/ESCALATE verdict | query the DB, verify live render logs, judge style-guide conformance, approve/mark-proven any creative object, mutate/commit/deploy |
| `ice-architecture-cartographer` | read-only (`Read`/`Grep`/`Glob`) | generate a grounded, fully-cited current-architecture / operator-flow snapshot (map + Mermaid + source-of-truth table + stale list) from CE + dashboard docs/registers/worker source; classify every node `live_production`/`proven_proof_only`/`planned_not_implemented`/`carry_deferred`/`stale_uncertain`; return PASS/WARN/NO_GOVERNING_RULE | invent architecture without citation, verify live/DB/deploy/git truth, reconcile registers, build dashboard UI, approve/mark-proven, mutate/commit/deploy |
| `brief-author` | read-only (`Read`/`Grep`/`Glob`) | draft ONE brief per PK-named task in the house template, every material claim evidence-cited, register hold-states reflected in Forbidden actions, unknowns → open questions / named handoffs; return DRAFT_READY/DRAFT_BLOCKED/ESCALATE (+ findings-contract block) | write/edit any file (returned draft only — orchestrator persists), approve/issue/accept any brief, author result docs, edit registers/CLAUDE.md, choose/split/expand tasks, invent uncited facts, query DB/network/git, mark anything proven |
| `image-harvester` | network GET (allow-listed sources only) + writes confined to `_harness/image_harvester_v0/**`; `Read`/`Glob`/`Grep`/`Bash`/`Write`/`WebSearch`/`WebFetch` | licence-safe background-image sourcing per a PK mini-manifest: download candidates + full provenance (sha256 of bytes), contact sheets, honest `not_harvestable_licence_safe` returns; readable third-party signage/branding in crop area → REJECT (calibration rule); output ALWAYS passes `image-reviewer` before PK (scope condition) | touch DB/storage buckets/repo files outside its package, POST/auth'd APIs, git, deploy, offer CC/paid/AI-generated material, approve or promote anything |
| `image-reviewer` | read-only (`Read`/`Glob`/`Grep`) | pixel-level suitability + risk review of a harvest package (P0 verdict vocabulary, suggestive only), package-consistency checks, licence/rights posture from recorded metadata | fetch from network, re-harvest, write files, recompute byte-hashes (named orchestrator step), touch DB/storage/git, use approval language, decide anything — PK visual review is the only deciding act |

**Security triage lanes:** use `security-auditor` **after** `db-rls-auditor` has gathered the DB
evidence — `db-rls-auditor` collects facts (grants, defs, advisors); `security-auditor` adds the
cross-repo caller analysis, the intended-principal call, blast-radius, and the GREEN/AMBER/RED
remediation-batch + D-01 packet. **`security-auditor` is PROVEN** (2026-06-16 — D-2026-06-16-002
**Phase 1b** `store_linkedin_org_token` search_path triage: classified the lane GREEN, caught and
corrected the earlier `gen_random_uuid()` / `search_path=''` assumption (PG13+ core built-in),
produced D-01 readiness + proof/rollback reasoning, no hard-rule violations).

**Creative Library static lane:** use `creative-graph-auditor` on any Creative Library v2 registry
change BEFORE the PK gate. It is the **static** counterpart to `db-rls-auditor`: it analyses the
declarative object graph (`style_guide → patterns + assets → template_families → variants →
evidence`) for shape, key uniqueness, reference resolution, evidence-SHAPE, the runtime-import guard
(no production worker may read the declarative registry), and vendored-registry drift, and returns a
PASS/FAIL/ESCALATE verdict. It does **not** query Supabase, verify live `m.post_render_log` rows,
validate RLS/grants, audit `resolve_brand_assets()` runtime behaviour, judge style-guide
**conformance**, approve or mark `proven` any creative object, or mutate/commit/deploy — live DB /
asset / render truth is a handoff to `db-rls-auditor`, and brand-conformance judgment stays with PK.
**Status:** **PROVEN** (2026-07-18 — v5.68 D7 N7a proving run). Run as a **registered subagent** on
`docs/creative-library/ndis-yarns.json`, it returned a real **FAIL→fix→PASS**: it caught a MISSING
`validator_policy` and a downgraded/over-claimed family+variant `proof_posture`, returned normalized
`clean` after the fix with zero false proof, and confirmed the registry is NOT read at runtime
(runtime-import guard). Record: `docs/briefs/results/tmr-d7-second-brand-proof-v1.md`. Built + committed
(`37021c5`); the earlier A1.4-lane exercise (registers v3.90) was a manual smoke because the agent-type
was not registered as invocable that session.

**Status:** all three original v1 agents are **PROVEN**. `branch-warden` (logic exercised inline in
the v3.55 lane, then run as a subagent across the ef-builder proof) and `db-rls-auditor`
(live read-only smoke test, project `mbkmaxqhsohbtwsqolns`) are proven. **`ef-builder` is
PROVEN** as of the 2026-06-15 proof lane (commit `353f221`, a test-only `dedupeByMessageId`
regression in `parser_test.ts`): isolated worktree → ef-builder edit → targeted test
(12/12) → branch-warden `safe` → fast-forward merge + push to main. The next code task can
treat the code lane as routine.

**Architecture cartography lane:** use `ice-architecture-cartographer` to generate a grounded,
cited snapshot of the system as it stands (the content-production spine map + operator flow +
Mermaid + source-of-truth table + stale/unknown list) from CE + dashboard docs/registers/worker
source. It is a read-only **generator**, the counterpart to the auditors: it never invents
architecture (no node/edge without a citation), never verifies live/DB/deploy/git truth (that
is a `db-rls-auditor` handoff), never reconciles registers (`register-reconciler` handoff), and
never builds dashboard UI. **`ice-architecture-cartographer` is PROVEN** (2026-06-25 — Proving
Run #1, CE `93e2b8b` / dashboard `a82a263`: produced a fully-cited end-to-end spine map,
invented nothing, correctly returned `WARN` for out-of-scope live/git truth, and surfaced the
stale Global Client Picker v1 brief; snapshot recorded at
`docs/architecture/current-ice-flow-v1.md`).

`dashboard-ia-lint` is built and committed (`3fa45bd`) as a read-only **candidate** (dashboard
IA conformance linter; `Read`/`Grep`/`Glob`; PASS/WARN/BLOCK/NO_GOVERNING_RULE) — **not yet
proven**, so it is intentionally not listed in the team table above; it stays candidate until
it has audited at least one real dashboard diff.

`deploy-verifier` is built and committed (`a52e788`) as a read-only **candidate** — a post-deploy
verification **Deployment Governor** (realizes the one named in `docs/governance/governor-architecture.md`
§3/§10; `Read`/`Grep`/`Glob`/read-only `Bash`/`get_edge_function`/`list_edge_functions`/`get_advisors`;
PASS/MISMATCH). It recomputes live deploy state and classifies marker-in-deployed-bundle (the
bundles-from-CWD "old code shipped" guard, naming its source) · VERSION==repo · `verify_jwt` (401→502
guard) · drift class (A-LE/B-FD, read/flag only); **advisory only** — it never deploys, redeploys,
refreshes drift, approves, or decides. **Not yet proven** — it stays a candidate (and intentionally
out of the team table above) until its `governor-architecture.md` §9 read-only backtest passes at a
PK gate (wrong-source→MISMATCH · known-good→PASS with zero false-MISMATCH · stale-A-LE→correct drift
class), the same discipline that proved `branch-warden`/`ef-builder`.

**Brief-authoring lane:** use `brief-author` to draft the gate-1 brief for any PK-named task —
it reads template/registers/CLAUDE.md/prior briefs/source as evidence and returns the draft as
JSON only (the orchestrator writes files; gate 1 is unchanged — a PROVEN brief-author still
only proposes). **`brief-author` is PROVEN** (2026-07-05 — 3 same-day proving lanes: cc-0027
Image Harvester brief [lane PASS v4.97], CCF-02 Phase 1 packet skeleton [ratified v4.96],
Creatomate Provider Reconciliation packet [lane PASS, TMR-GOV-PROVIDER-1 ratified v4.98]; all
drafts PK-accepted at gate 1, zero charter violations; promotion review
`docs/briefs/brief-author-promotion-review-v1.md`, external review `74ba8e6e` → PK decision).
**PK scoped note:** proven on docs/planning-shaped briefs — its first code-lane or DB-lane
brief gets candidate-level scrutiny before breadth is treated as proven.

**Image sourcing/review lane:** `image-harvester` + `image-reviewer` are **PROVEN-SCOPED**
(2026-07-05 PK promotion with mitigations — promotion review
`docs/briefs/image-agents-promotion-review-v1.md`, hash `45a4b2b6…`): proven for **governed
background-image sourcing/review under PK-gated intake/promotion** (evidence: cc-0027 v4.97 ·
registered runs · day-hero stress proof · the v5.01→v5.02 product chain with witnessed live
selection `wit-1`). NOT yet proven (candidate-level scrutiny on first attempt): people-forward
images · auction/crowd imagery · CC BY / CC BY-SA unlocks · paid-stock exception flows ·
commissioned-shoot sourcing · non-Property-Pulse brands · automatic approval or promotion.
**Standing conditions:** harvester output always passes image-reviewer before PK presentation;
readable-signage decisions named in every lane's result doc.

Not yet built (v2, do not assume they exist): `ef-deployer` (gated, non-autonomous),
`pipeline-medic`.

## External review gate (cross-model adversary)

Before **any** risky action, the orchestrator calls `ask_chatgpt_review`
(`mcp__5c3caad6-6105-4a61-819a-d18615a18d43__ask_chatgpt_review`). Risky =
production SQL (DML/DDL), EF deploy, config change affecting clients, or any plan with
multiple coordinated steps. Rules:

1. **Call on the FINAL diff/plan.** If `ef-builder` changes the diff after a review,
   re-call. Never treat an approval of an earlier diff as still valid.
2. The bridge auto-escalates to PK on disagree / high risk / low confidence / refusal /
   timeout. Treat any non-clean verdict as **stop → surface to PK**.
3. Reviews are idempotent per UTC day on identical inputs — fine for cost; do not
   exploit it to skip re-review after a change.
4. **`reviewed_input_hash` is mandatory.** Every review result/report must record the
   hash of the **exact** packet/diff it reviewed. A review is valid **only** for that hash:
   if the packet/diff changes, the review is **stale** and must be re-run. The orchestrator
   STOPs when `reviewed_input_hash` ≠ the current packet/diff hash (this machine-enforces
   rule 1 — an approval never carries across a change).
5. **Mandatory triage classification.** Every review result must carry one or more of these
   triage classes (ranked when more than one applies) — a non-clean verdict is never handled
   generically:
   - `concrete_defect` — a real bug in the diff/plan.
   - `missing_evidence` — a claim is unverified.
   - `structural_DDL_DML_escalation` — touches DDL/DML / schema / grant state.
   - `policy_decision` — a judgment call, not a defect.
   - `scope_design_concern` — out-of-scope or architectural.
   - `runtime_verification_required` — needs post-deploy/post-apply proof.

**Triage routing** (the orchestrator routes by class):

- `concrete_defect` → **stop → fix → re-review**.
- `missing_evidence` → **stop → gather evidence → re-review**.
- `structural_DDL_DML_escalation` → **PK judgment gate** (hard stop).
- `policy_decision` → **PK decision gate** (PK decides; not a defect to "fix").
- `scope_design_concern` → **PK / product decision gate**.
- `runtime_verification_required` → proceed **only if** an explicit post-deploy/post-apply
  verification gate is named; otherwise treat as stop.

## PK gates (hard stops — orchestrator must pause for PK)

- **Plan approval.** Before executing a multi-step plan, present it (plan mode) and wait.
- **Deploy / merge / migrate.** This is a HARD STOP. The orchestrator prepares the exact
  command and preconditions, runs external review, then **stops for PK**. PK runs or
  authorises the irreversible step. Deploy is where past incidents happened; it stays manual.

## Standing ICE deploy/DB gotchas (enforce at the gate)

- `supabase functions deploy` without `--no-verify-jwt` flips `verify_jwt`→true and
  breaks `x-series-key`-only callers (401→502). Confirm the flag in any EF deploy plan.
- Revoking from `PUBLIC` alone is insufficient — also `REVOKE ... FROM anon, authenticated`
  for service-role-only objects.
- Reads over REST against an unexposed schema fail with PGRST106 — route via RPC or an
  exposed schema.
- Migration name = permanent identity. A revision gets a NEW number + distinct name,
  never the same name with different SQL.
- Re-verify HEAD/branch before any commit (shared-worktree race); prefer isolated worktrees.

## The proof lane (v1 end-to-end flow)

```
PK gives task
 → orchestrator drafts brief (docs/briefs/_template_brief.md format) → PK approves (gate 1)
 → ef-builder: local-only change in an ISOLATED worktree
 → branch-warden: verify HEAD / branch / parity / diff   (verdict must be "safe")
 → db-rls-auditor: review IF the DB was touched          (verdict must be "pass")
 → orchestrator calls ask_chatgpt_review on the final diff/plan
 → PK approves/rejects (gate 2 — deploy/merge HARD STOP)
 → only then: deploy/merge (PK-run)
 → orchestrator writes result (docs/briefs/_template_result.md format)
```

The orchestrator parses each subagent's JSON verdict and only advances when it is clean;
any `stop`/`block`/`concerns` or non-clean external review halts the lane and surfaces to PK.

## The docs-only register lane (first-class, lighter than the code lane)

Surgical edits to docs/registers (e.g. `00_sync_state.md`, `00_action_list.md`, session
notes) do **not** need `ef-builder` or an isolated worktree. This lane is proven (v3.55):

```
PK gives docs/register task (verify-or-abort, exact payload)
 → orchestrator reads LOCAL HEAD (authoritative) → verify-or-abort on exact anchors
 → orchestrator applies surgical edits directly on main (no worktree, no ef-builder)
 → branch-warden in mode "authorized-main-docs": confirm HEAD/parity + file set == approved set
 → readback + diff verification (changed files must equal the approved set, nothing else)
 → commit only on PK instruction; push only on explicit PK instruction
```

Rules for this lane:

- **Local HEAD is authoritative.** The GitHub/MCP bridge and remote state can be **stale** —
  never treat them as source of truth for a local apply. Derive anchors from local files.
- **Surgical only.** No full-file re-emission, no historical rewrite; touch exactly the
  approved file set.
- **Verify-or-abort.** If any supplied anchor does not match local exactly → STOP and
  return the actual local lines for a re-cut. Never approximate or hand-reconcile.
- **Commit-message policy.** Use the **exact** message PK specifies. Do **not** append a
  `Co-Authored-By` trailer (or any trailer) to register/docs commits unless PK explicitly
  asks. (The default harness trailer caused friction in v3.55.)
- **Push is still a hard stop.** Local commit on PK instruction; push only when PK says so.
  On push rejection (diverged remote), do NOT force-push — inspect the remote commit
  read-only, and only fast-forward/rebase when provably conflict-free, else surface to PK.

## Workflow acceleration conventions (v1 — conventions 1–3 ratified 2026-07-05)

> Source packet: `docs/briefs/ice-workflow-acceleration-convention-packet.md` (hash `df4c31bd…`,
> external review `4864c9cf…`). PK ratified conventions 1 and 2 on 2026-07-05. Convention 3
> (risk-tiered review chains) was ratified 2026-07-05 via
> `docs/briefs/ccf-02-phase1-orchestration-contract-packet.md` (hash `f967c81e…`, external review
> `09cac646…`) — successor text; supersedes the pending §3 draft in the original conventions packet.

1. **Recording compression.** The result doc is the canonical lane record. `00_sync_state.md`
   and `00_action_list.md` receive POINTER entries only (≤5 lines: version · verdict · identity/
   hash · result-doc link · next gate/queue impact). Long facts are written once, in the result doc.
   Result docs stay full-evidence and are never compressed; no historical rewrite of old entries.

2. **Conditional sequence approvals.** PK may approve a multi-step sequence (incl. deploy/apply/
   push) in one gate when the approval pins the artifact hash, names the ordered steps, and
   states STOP conditions. Mandatory STOPs (non-removable): hash mismatch · unexpected origin
   movement (unless independently verified benign and unrelated) · any non-clean review verdict ·
   named live pre-check failure · deployed/applied artifact mismatch · unexpected files in the
   change set · invalidated rollback path. A tripped STOP voids the remainder of the sequence;
   resumption requires a fresh PK gate. This is how PK exercises deploy authority in one
   sitting — not a delegation of it. Non-negotiables (§4 of the packet) are unchanged.

3. **Risk-tiered review chains.** Gate 1 assigns a tier; doubt/mixed scope → higher tier.
   T1 (docs/read-only): verify-or-abort + branch-warden + readback; external review only on
   escalation triggers. T2 (dark/additive DB · isolated code · read-only dashboard · candidate
   agents): scope-relevant auditors + branch-warden + hermetic tests + external review pinned to
   hash; rollback written+validated before apply. T3 (production-touching / deploy / publish /
   posture / secrets / irreversible): full chain + independent lead re-verification + explicit PK
   gate (or a Convention-2 sequence) + named live pre-check STOPs + rollback proven before apply;
   nothing waived. DML/DDL ≥ T2; callers/grants/deploy/publish/secrets → T3; escalation up free,
   de-escalation needs a fresh Gate 1. Triage classes and Conventions 1–2 unchanged.

## Image workflow acceleration (v1 — P1–P6 ratified 2026-07-06)

> Source packet: `docs/briefs/image-workflow-acceleration-packet-v1.md` (RATIFIED, hash `dd3c3156…`).
> Governs the cc-0027 image sourcing→intake→promotion lanes. PK ratified all six over an explicit
> `policy_decision` escalation (rev-1 review `2866370a` raised "define shape" → fixed; rev-2 review
> `634bbb74` verified the fix, no concrete defect, escalated only the human-judgment policy call).
> Trims ceremony; the §2 non-negotiables below are unchanged.

- **P1 — Batch-first is the default.** The unit of work is a theme-set manifest (N candidates across
  related rows), one `image-reviewer` pass, one crop-proof pass, one PK visual gate for the whole set.
  Solo sourcing runs only by explicit PK exception.
- **P2 — Tier-right-sized intake review.** The full `db-rls-auditor` + external chain runs ONCE per
  *shape*, not per asset. **"Same shape" is a MECHANICAL structural-diff gate** (any diff → new shape →
  full chain; when in doubt → new shape): same table · same `asset_type` · identical written-column set ·
  all four fences present-and-false (is_active/approved/production_use_allowed/approval_status) ·
  same eligibility-relevant `asset_meta` key set (usage·bucket·license/license_type·safe_for_text_overlay·
  sha256·asset_key) · no new eligibility-touching keys · bucket=brand-assets · no DDL · no GRANT/REVOKE ·
  no ON CONFLICT/upsert. **Per-apply guards NEVER waived (every intake, any shape):** byte-verify +
  public-URL sha256 + the in-txn fail-closed pool-neutrality assertion + branch-warden.
- **P3 — PK may fast-path an asset at the visual gate** ("→ promote directly"): one T3 lane
  (upload → governed INSERT approved=true → full T3 chain → PK gate → apply → live proof) instead of
  intake-then-promotion. Fenced-first stays the default; fast-path is an explicit per-asset PK election.
  (This deliberately relaxes the prior "never combine intake and promotion" rule, scoped to PK's choice.)
- **P4 — One register pointer per batch terminal state** (Convention 1 applied), not per asset per step.
- **P5 — `image-harvester` rejects legible text/signage at discovery** (before the crop-proof) to cut
  re-source loops; the crop-proof remains the authoritative text-safety gate.
- **P6 — Independent review stages run concurrently** (`db-rls-auditor`/external/`branch-warden`).

**§2 non-negotiables (UNCHANGED):** PK visual verdict is the only deciding act · text-safety crop proof
before any accept · licence safety + sha256 provenance · pool-neutrality machine-assertion on EVERY
intake · full T3 chain + live proof + rollback-proven on EVERY production rotation change · fenced-until-
approved default · CAS/fail-closed. The goal is to shrink ceremony, never these guards.

## NDIS sensitive real-imagery intake (staged lane — ratified 2026-07-19)

> Source policy: `docs/briefs/ndis-sensitive-real-imagery-intake-policy-v1.md` (rev-2, hash
> `93825466…`, external review `02efbc94` agree/med/high). Governs any move of NDIS Yarns
> backgrounds beyond abstract into REAL imagery. **Adds gates to the image-workflow §2
> non-negotiables above; subtracts none.** Closeout-only ratification — authorises NO sourcing.

- **Staged phases:** Phase 0 abstract (live) · **Phase 1 REAL but PERSON-FREE / non-identifying**
  (accessible environments, assistive tech without a user, hands-with-no-identity, distant/soft-focus
  where identity/disability/service-status is not inferable — enters the rotation pool; opens only via
  its **own** Gate-1 brief) · **Phase 2 identifiable adults — CLOSED** · **Phase 3** minors ·
  participant stories · clinical/personal-care · First-Nations-specific — **HELD + purpose-bound**.
- **Evidence-based rights rule (not free-vs-paid):** identifiable-people imagery is prohibited by
  default; it proceeds only on **asset-specific documented rights** covering commercial+social use AND
  disability/accessibility/NDIS-adjacent context AND no false participant claim. A platform copyright
  licence or payment alone is insufficient (disability info = sensitive health info, OAIC).
- **Two held specialist prerequisites (NOT appointed):** a **disability-led representation reviewer**
  (Phase 2, PASS/PASS-WITH-RESTRICTIONS/REJECT) and a **First-Nations adviser + community-consultation**
  route (cultural content). **An unfilled specialist role is NEVER permission to proceed** — the
  dependent phase stays closed/hard-blocked; a lane that finds either prerequisite unmet STOPs and
  surfaces to PK. Roles are stood up only by a separate deliberate PK decision, never to satisfy the doc.
- **Purpose-binding:** participant + culturally specific imagery attaches to an individually approved
  story/campaign and NEVER auto-enters the reusable background pool, even after approval.
- **Charter fences (§I):** `image-harvester` sources only Phase-1 person-free NDIS backgrounds
  (candidate-level, fenced-first) and cannot source Phase 2/3; `image-reviewer` gains an
  identity-leak+dignity+exclusion+cultural-flag checklist (suggestive only; cultural element → ESCALATE,
  never PASS). Real-people/cultural imagery is always candidate-level + mandatory human review.

## CCF-02 orchestration contract (Phase 1 — ratified 2026-07-05)

- **Findings contract:** subagents/auditors return the 10-field findings JSON
  (verdict{normalized,native} · confidence · must_fix · should_fix · observations · evidence ·
  scope_boundary · open_questions · recommended_next_gate · non_claims — schema + vocabulary map:
  packet §2). Orchestrator advances only on normalized `clean`; concerns→fix-or-PK; block→halt;
  escalate→PK. Adopted lazily per agent as a T1 charter edit; no tool/permission changes.
- **Lane classification:** Gate 1 admits every lane under exactly one of PRODUCT_PROOF /
  SAFETY_GATE / SIDE_PROVING / PARKED, alongside its tier. PARKED runs only on explicit PK
  override.
- **Parallel-session claims:** before cutting any register entry, claim via the result-doc stub
  (`CLAIMED vX.YZ · lane · worktree · gate · timestamp` as line 1), after fetch + head read +
  stub scan; re-verify at commit; earlier timestamp keeps the number, later claimant renumbers.
- **Phase 2/3 refinements (ratified 2026-07-05):** R1 orchestrator read-only checks OK for
  invariant fingerprints + triage evidence where the DB is not the lane's subject; db-rls-auditor
  required when it is, and in every T3 chain — substitutions named in the lane record. R2 secret
  POSTURE change = T3; read-only secret USE = T2 + mandatory Gate-1 secret-handling rider (which
  secret · conveyance · never-in-transcript · use-vs-change). R3 lanes mid-flight at a contract
  ratification pick up new requirements at their next gate. R4 one harness sub-root per
  session/run; shared-root files append-only with attribution; never push another session's
  unpushed commit without explicit PK authorization.
- **Phase 3 posture:** automation is limited to four zero-authority helpers (hash checkpoints ·
  claim stubs · review-packet template · register-pointer template), each its own future
  PK-gated T2 lane; judgment stays manual; approval/promotion/deploy/enforcement are never
  automated. CCF-02's phase plan is complete — the contract is living and amends only by PK
  ratification. (Synthesis packet: `docs/briefs/ccf-02-phase3-synthesis-packet.md`, hash
  `63211221…`, reviews `0fe63030`/`e28e39ad` partial→PK ratified as-is 2026-07-05.)
