> ## 🔖 CANONICAL ID: **cc-0051** — renumbered 2026-07-24 (governance recovery lane)
> **Former ID:** `cc-0047` · **Reason:** ID collision. `cc-0047` was independently claimed and
> **committed** by a parallel session on `origin/claude/new-session-swx6cf` (`198a841`,
> 2026-07-23T00:52:27Z) for the **AGP v2 identity-resolution planning** lane, which is
> PK-ACCEPTED at branch register v6.11. Per `CLAUDE.md` CCF-02 §Parallel-session claims, the
> **earliest committed claim keeps the number**; this lane was never committed and therefore
> never claimed, so it renumbers.
> **Alias trail:** `cc-0047` (this lane, uncommitted draft, 2026-07-22 05:18–05:29Z local-only)
> → **`cc-0051`**. Result path renamed accordingly. Reversible at PK discretion — see the
> collision ledger in `docs/briefs/results/governance-recovery-lane-2026-07-24-result-v1.md` §3.
> **Nothing in this brief's substance is changed by the renumber.**

# Brief cc-0047 — Governed Execution-Spine Coverage & Repairability Classification

**Created:** 2026-07-22 Sydney (**rev-3 final** — supersedes rev-1 assignment-repair framing and rev-2)
**Author:** Claude Code (orchestrator-direct — CCF-02 R1 substitution, §0)
**Executor:** Claude Code + PK gates
**Status:** draft — **final Gate-1 submission**
**Lane classification (CCF-02):** SAFETY_GATE · **T2 build/proof; DDL + function apply and reclassification are separate T3 PK gates**
**Result file:** `docs/briefs/results/cc-0047-governed-execution-spine-coverage.md`

---

## 0. Provenance

- Canonical `origin/main` = **`8a885df`** (fetched; the seed's `b3065c5` is an ancestor). Local checkout 20 behind, 280 changed paths → **all repo evidence read from `origin/main`**, never the working tree.
- **Substitution (CCF-02 R1):** orchestrator-direct; the decisive evidence required live `execute_sql` reads plus worker-source greps that `brief-author` cannot perform. Gate 1 unchanged.
- All investigation read-only. Nothing applied, written to production, committed, or deployed.
- rev-1 (`cc-0047-governed-assignment-repair-loop-brief.md`) is marked SUPERSEDED in place; its findings A/B/C are accepted and carried forward as §2.

## 1. Task

Build the **repairability prerequisite** ICE lacks: a governed-execution-spine coverage contract that must be satisfied before any gap ticket may route to `config_repair` or become eligible for an automated repair proposal. The purpose is deliberately negative — **stop ICE proposing or executing repairs for configuration production does not consume.**

## 2. Accepted prior findings (rev-1, PK-accepted)

- **A.** An assignment write alone can never repair `(assignment, unassigned)`: `select_template` filter (d) requires `visually_approved+`; filter (e) then requires a passed `visual_approval` proof bound to that `assignment_id`. `record_tmr_proof_event` does **not** validate `visual_approval` evidence — it is an unfalsifiable human attestation.
- **B.** `select_template` has exactly four call sites, all format-hardcoded (`image_quote` ×2, `video_short_stat` ×2). **None passes `carousel`.**
- **C.** Assignment identity is `(template_id, client_id)`, not per-platform; carousel is a 3-part composite → the 3 tickets are 2 repair units.

## 3. Client-attribution contract (PK revision 1)

`client_id IS NULL` is **not** evidence that client-scoped coverage is absent. Attribution is resolved by an ordered, authoritative-lineage-only contract:

| Order | Source | Basis |
|---|---|---|
| 1 | `m.post_render_log.client_id` | direct column |
| 2 | `m.post_render_log.post_draft_id` → `m.post_draft.client_id` | FK lineage |
| 3 | `m.post_render_log.slide_id` → `m.post_carousel_slide.post_draft_id` → `m.post_draft.client_id` | FK lineage |
| — | otherwise | **`unknown`** |

**Conflict rule:** if two resolvable sources disagree → `conflict` → **fails closed** (never silently prefers the direct column).
**Prohibited:** inferring client identity from free text, seeds, labels, URLs, filenames, storage paths, or timing. *(Distinct from render **origin**, §5 — a label may classify production-vs-smoke origin; it may never name a client.)*

### 3.1 Re-evaluation of the four `video_short_stat` proofs — my rev-2 statement was wrong

All four qualifying proofs resolve to:

| render_log_id | `client_id` | `post_draft_id` | `slide_id` | draft lineage | attribution |
|---|---|---|---|---|---|
| `686abc64` | NULL | NULL | NULL | none | **unknown** |
| `636f89e3` | NULL | NULL | NULL | none | **unknown** |
| `def2195f` | NULL | NULL | NULL | none | **unknown** |
| `e37affd9` | NULL | NULL | NULL | none | **unknown** |

**No lineage exists at any tier** — not merely a null column. Zero conflicts.

**Corrected verdict:** `video_short_stat` client scope = **`inconclusive` (attribution unknown)** — *not* "client coverage absent", which is what rev-2 implied. The distinction matters: `inconclusive` routes to manual triage and makes no claim either way, whereas an absence claim would have been unevidenced. These rows carry `seed='governed_video_stat_smoke_v1'`; **that string was deliberately not used** to reach the verdict, per the prohibition above.

### 3.2 Attribution audit across all formats (live)

| format | gov proofs | direct | lineage | unknown | **conflict** |
|---|---|---|---|---|---|
| `image_quote` | 31 | 29 | 0 | 2 | **0** |
| `video_short_stat` | 4 | 0 | 0 | 4 | **0** |
| all others | 0 | — | — | — | 0 |

Zero conflicts project-wide today — so the fail-closed conflict path has **no live fixture** and must be proven hermetically (§8).

## 4. Coverage verdicts (PK revision 2)

| Verdict | Condition | Downstream posture |
|---|---|---|
| `covered` | ≥1 qualifying proof at the requested scope, within the cadence-aware freshness window | repair **may be considered** |
| `stale` | qualifying proof(s) exist but all older than the window | re-proof / manual review |
| `unintegrated` | **zero** qualifying proofs **AND positive evidence of an active production path bypassing the governed spine** | capability backlog |
| `inconclusive` | anything else — no evidence either way · malformed/partial provenance · declared↔observed disagreement · attribution `conflict` · attribution `unknown` at client scope | manual triage |

**`unintegrated` is a positive-evidence verdict, never an absence verdict.** It requires ≥1 successful render lacking governed evidence within the activity window. A quiet format — no governed proof *and* no bypass renders — is **`inconclusive` or `stale`, never `unintegrated`.**

**Freshness is cadence-aware, not a fixed calendar window:**
`window = max(absolute_floor, k × observed_median_inter_proof_interval)` — computed per format (and per client at client scope), with `k` and `absolute_floor` as named, PK-set parameters, never literals. A format that renders twice a month is not stale at day 20.

Live cadence measured (why this matters): `image_quote`/property-pulse mean inter-proof gap **19.5 h**, last proof ~3 h ago; `image_quote`/ndis-yarns mean gap **9.7 h**, last proof ~31 h ago (≈3.2× its own cadence). A fixed 30-day window calls both fresh and discriminates nothing; a cadence-aware window flags ndis-yarns for attention while leaving a genuinely slow format alone.

## 5. Normalized governed-execution evidence contract (PK revision 3)

**A generic `tmr` key is explicitly insufficient.** Both live JSON locations are supported and normalized into one contract; a row qualifies only if every required provenance field resolves.

**Extraction** (both shapes, verified live):

```
tmr_block  := COALESCE(render_spec->'tmr', render_spec->'template'->'tmr')
tmpl_block := render_spec->'template'
```
*(Necessary because the workers diverge: image-worker's `resolver_used`/`fallback_taken` live in `template`, video-worker's inside `template->'tmr'`. Verified empirically — a single-location probe produced a false verdict for one worker or the other in every variant tried.)*

| Contract field | Normalized from | R | Live availability |
|---|---|---|---|
| selected template identity | `provider_template_id`, `registry_template_id`, `variant_key`, `winner`/`implementation_id` | ✔ | both |
| selector status | `selector_status` = `ok` | ✔ | both |
| governed assignment | `assignment_id` | ✔ | both |
| selector/contract version | `contract_version`, `contract_ref`, `contract_validation.status` | ○ | **image only** |
| producer + version | `label` (`creative_library_b1_production` / `…_video_stat_production` / `…_b1_smoke`), `render_engine` | ✔ | both |
| render origin | derived from `label` → `production` \| `smoke` \| `unknown` | ✔ | both |
| originating draft/slot | `post_draft_id`, `slide_id` | ○ | both (may be NULL) |
| client attribution + source | §3 contract → `{client_id, source}` | ✔ | both |
| successful render | `status='succeeded'` | ✔ | both |
| evidence timestamp | `created_at` (+ `contract_validation.evaluated_at`) | ✔ | both |
| resolver executed | `resolver_used`, `fallback_taken` | ○ | both (differing paths) |

R = ✔ required, ○ recorded-when-present.

**Fail-closed rule:** a row carrying a `tmr` key but missing any **required** field is **not** a qualifying proof and contributes to `inconclusive` — never silently to `unintegrated`. Contract-version absence on the video path is recorded as a provenance limitation, not treated as failure (it would otherwise fail a genuinely governed format).

## 6. Live coverage results under the final contract (read-only, 2026-07-22)

| format | gov proofs | bypass successes (active path) | last gov proof | **path verdict** | **client-scope verdict** |
|---|---|---|---|---|---|
| `image_quote` | 31 | 706 (last 2026-07-20) | 2026-07-22 02:15Z | **covered** | **covered** for `property-pulse` (22, direct) and `ndis-yarns` (7, direct); 2 proofs `unknown` (smoke origin) |
| `video_short_stat` | 4 | 34 (last 2026-07-10, predates governance) | 2026-07-20 06:10Z | **covered** | **inconclusive — attribution unknown** (§3.1) |
| `carousel` | **0** | **1308** (135 in 30 d, last 2026-07-20) | — | **unintegrated** | unintegrated |
| `video_short_avatar` | 0 | 87 (26 in 30 d) | — | unintegrated | unintegrated |
| `video_short_kinetic` | 0 | 44 (10 in 30 d) | — | unintegrated | unintegrated |
| `video_short_kinetic_voice` | 0 | 16 (6 in 30 d) | — | unintegrated | unintegrated |
| `video_short_stat_voice` | 0 | 24 (6 in 30 d) | — | unintegrated | unintegrated |

Two consequences worth PK's eye:

- **`image_quote` is simultaneously `covered` and running an active bypass path** (706 successful non-governed renders). Format-level coverage does **not** imply every client is on the spine — direct vindication of requiring client scope before any repair.
- **No format is currently quiet.** Every format has recent renders, so the `inconclusive`-because-quiet case has **no live fixture** and is proven hermetically (§8.4). Stated explicitly rather than left as an implied pass.

## 7. Diagnosis extension and subordinate diagnosis (PK revisions 4 + 5)

### 7.1 Additive vocabulary extension

```
subject_kind = execution_path · failure_state = unintegrated
→ remediation_route = capability_backlog · automation_class = backlog
```

Verified live — both values are genuinely absent today:

- `asset_gap_suggestion_subject_kind_check` admits 9 values; `execution_path` is **not** among them.
- `asset_gap_suggestion_failure_state_check` admits 11 values; `unintegrated` is **not** among them.
- `asset_gap_route('execution_path','unintegrated')` currently returns `manual_triage`/`no_automation` — the fail-closed default for unmapped pairs (safe, but not the required routing).

Reusing the already-admitted `(template, unsupported)` pair (which already routes `capability_backlog`/`backlog` with zero DDL) was considered and **rejected**: it would conflate PK's ruled `format_unmapped` meaning with "has templates, production never consumes them."

Artifacts to update: **CHECK vocabularies · route/automation mapping · valid-pair tests · full pair-space invariant tests.** Pair space grows 9×11=99 → 10×12=120; **all 21 new pairs must be proven non-sourcing**, re-establishing `(static_background, absent)` as the sole pair deriving `governed_sourcing`/`governed_auto_sourcing`.

### 7.2 Subordinate diagnosis preserved

For the three carousel tickets the **binding** diagnosis becomes `(execution_path, unintegrated)` → `capability_backlog`, while the prior `(assignment, unassigned)` is **retained as a subordinate diagnosis inside `diagnostic_evidence`** — observable, queryable, and explicitly **non-triggering** while spine coverage is absent.

Proposed evidence shape (additive, no column change):

```jsonc
"subordinate_diagnosis": {
  "subject_kind": "assignment", "failure_state": "unassigned",
  "classifier_version": "cc0046-backfill-v1",
  "suppressed_by": "execution_path_unintegrated",
  "repair_eligible": false,
  "note": "mechanical cause; not actionable until spine coverage is covered"
}
```

Nothing is lost: a ticket records both *what is mechanically missing* and *why fixing it would change nothing today*.

### 7.3 Where the prerequisite sits

Coverage is a **gate in front of routing**, not a replacement for classification. `diagnose_gap` still determines the mechanical cause; the coverage verdict then **downgrades** any `config_repair` routing to `capability_backlog` (or `manual_triage` when `inconclusive`) whenever coverage is not `covered` at the required scope.

## 8. Proof matrix (PK revision 7 — every required proof, with pass conditions)

| # | Proof | Pass condition |
|---|---|---|
| 1 | `image_quote` covered **with client attribution** | verdict `covered`; 29/31 proofs attributed `direct`; per-client `covered` for property-pulse (22) and ndis-yarns (7); derived **solely** from qualifying rows; flips to non-covered on an evidence-free fixture even with the declared row present |
| 2 | `video_short_stat` path coverage + **corrected** client scope | path `covered` via `render_spec->'template'->'tmr'`; client scope `inconclusive (attribution unknown)` after all three lineage tiers return no row — **asserting absence of lineage, not a null column**; no free-text/seed inference used |
| 3 | `carousel` unintegrated despite legacy success | verdict `unintegrated` **and** 1308 successful legacy renders asserted together in one fixture; positive bypass evidence present |
| 4 | quiet/no-evidence format → `inconclusive` | hermetic (no live fixture — §6): a format with zero governed proofs **and** zero bypass renders returns `inconclusive`, **never** `unintegrated` |
| 5 | stale formerly-covered evidence → `stale` | hermetic: qualifying proof aged past its cadence-aware window → `stale` (not `unintegrated`); and a slow-cadence format with a proportionally old proof stays `covered` |
| 6 | declared ↔ observed disagreement → `inconclusive` | declared `governed` + zero observed proofs → `inconclusive`; declared `legacy` + observed proofs → `inconclusive`; both directions asserted |
| 7 | attribution `conflict` fails closed | hermetic (zero live conflicts): render-log client ≠ draft-lineage client → `conflict` → `inconclusive`, never the direct column silently winning |
| 8 | assignment alone cannot govern the carousel path | hermetic: inject assignment + passed visual proof for a carousel template → `select_template` returns `ok`, yet coverage stays `unintegrated` and routing stays `capability_backlog` |
| 9 | tickets remain open + subordinate diagnosis observable | all three remain `status='open'`; `select_template` still `fail_closed`; subordinate `(assignment, unassigned)` present and queryable in `diagnostic_evidence`, flagged `repair_eligible:false`; row diff limited to classification columns |
| 10 | zero tickets newly eligible for autonomous repair | enumerate every ticket's `(verdict, route, automation)` before/after → eligible count **0 → 0**; across all **120** pairs, `(static_background, absent)` remains the sole `governed_sourcing` derivation |
| 11 | cc-0046 + legacy compatibility | legacy analyzer/writer output keys byte-identical (additive-only diff); `resolve_slot_assets` unchanged; PP/YouTube `(platform_config, misconfigured)` and all 4 resolved historical rows unchanged; extended CHECKs still reject unknown values |

Plus: order-independence (shuffled input → identical verdict) and rollback proven apply→rollback→zero-orphans **before** any T3 gate.

## 9. Non-negotiable behaviour (PK revision 6)

Reclassifying the carousel tickets must **not**: resolve or close them · create assignments · create visual-approval proofs · change production rendering · create repair proposals.

**Non-closure is structural, not merely intended.** The auto-close pass (`run_asset_gap_analysis`, cc-0045 `20260720140000` L253–297) flips `open`→`resolved` **only** when `select_template(...)->>'status'='ok'` **and** a resolved asset id is present. Reclassification touches classification columns only; `select_template` still returns `fail_closed`/`no_selectable_template` for all three tickets. The close condition is therefore untouched **by construction** — and proof §8.9 asserts it rather than assuming it.

Also non-negotiable: no manufactured proof for renders production does not consume · no repair proposal where coverage is absent, stale or inconclusive · ambiguity always fails closed.

## 10. Scope

**In scope:** classifier/capability substrate only — the coverage contract, its derivation from normalized execution evidence, the client-attribution contract, the `(execution_path, unintegrated)` additive extension, the routing prerequisite, subordinate-diagnosis retention, reclassification of the three carousel tickets, and §8.

**Out of scope:** assignment proposal engine · assignment mutation · visual-proof creation · carousel worker rewire · template creation · platform-config repair · image/video sourcing · drain activation · any production apply without its own PK gate.

## 11. Allowed actions

Read-only DB (R0 wrapper for catalog; `execute_sql` SELECT-only for `c.*`/`m.*`) · author migration/function/rollback/proof artifacts **in an isolated worktree**, unapplied · hermetic proofs on an ephemeral PG instance · prepare exact apply/rollback for later PK T3 gates.

## 12. Forbidden actions

- No `INSERT`/`UPDATE`/`DELETE` on `c.creative_template_client_assignment`, `c.creative_template_proof_event`, `c.creative_template_platform_suitability`.
- **No `visual_approval` proof event, ever.**
- No `apply_migration`; no `execute_sql` write; no `deploy_edge_function`; no merge; no push — outside an explicit PK T3 gate.
- No `run_asset_gap_analysis` with `p_dry_run=false`. **Gotcha:** the reconcile dry-run skips the write path, so FK/CHECK errors surface only at `p_dry_run=false`.
- No ticket status transition; no direct `status='resolved'` UPDATE; no repair proposal of any kind.
- No template creation, status promotion, suitability edit, sourcing, drain activation, browser automation, carousel worker change.
- No client-identity inference from free text, seeds, labels, URLs, filenames or timing.
- Hold-states untouched: NDIS production video enablement OFF; diverged `invegent-dashboard` main; orphaned `AddTemplateDraftWizard.tsx`.

## 13. STOP conditions

Sole-sourcing invariant fails on any of the 120 pairs · any carousel ticket changes status · any legacy output key changes · any ticket becomes newly eligible for autonomous repair · an attribution `conflict` resolves to anything but fail-closed · declared↔observed drift cannot be represented as `inconclusive` · a required provenance field silently defaults · rollback unproven · any non-clean review verdict · unexpected origin movement · **any proposal to write an assignment or visual proof.**

## 14. Phased rollout

- **Phase 1 (T2):** build contract + extension + hermetic/live-read proofs in an isolated worktree. Nothing applied. Full review chain (`db-rls-auditor` + `branch-warden` + external review pinned to artifact hash).
- **Phase 2 (T3, own PK gate):** apply CHECK + function extension.
- **Phase 3 (T3, own PK gate):** reclassify the three carousel tickets, §8.9/§8.10 run before and after.

## 15. Success criteria

- Verdicts reproduce §6 exactly, derived from evidence, never from declaration.
- All eleven §8 proofs pass.
- The three carousel tickets remain `open` and visible, binding diagnosis `(execution_path, unintegrated)` → `capability_backlog`/`backlog`, subordinate `(assignment, unassigned)` observable and non-triggering.
- Zero tickets eligible for autonomous repair, before and after.
- Nothing applied, closed, deployed or merged outside its named PK gate.

## 16. Stop condition

Report per `docs/briefs/_template_result.md`, then stop. **Next gate: PK approval of this brief. No build, commit, migration, reclassification or production action is authorized.**

---

## 17. Recorded future lanes — NOT opened, NOT scheduled

**F-1 — PP YouTube platform-configuration repair investigation.** Ticket `22d3df93`, `(platform_config, misconfigured)`/`config_repair`. Candidate for ICE's first real governed repair automation: its format `video_short_stat` has a genuine `select_template` production call site and **path-scope `covered`**. **Hard precondition for that lane:** its client scope is currently **`inconclusive` — attribution unknown** (§3.1); it must establish client-scoped coverage through authoritative lineage before proposing any repair.

**F-2 — Carousel governed-spine onboarding.** The actual remediation the three carousel tickets represent: routing the carousel branch through `select_template`/`resolve_slot_assets` as `image_quote` was under Option D. T3 worker change affecting live rendering for multiple clients, plus 3 assignments + 3 PK visual gates per client. The only work that legitimately closes those tickets.

**Generic assignment proposal engine:** remains **deferred** until a genuine production-consumed assignment gap exists for live proof. None exists today. It does not follow from cc-0047.

## 18. Notes and named carries

- Any apply is `execute_sql` at a T3 gate (`apply_migration` is harness-deny-listed) with post-hoc ledger backfill, per cc-0044/cc-0046 precedent.
- **Carry:** image/video TMR evidence shapes diverge (§5). The contract absorbs it; converging the workers on one evidence shape would let the contract get stricter. Own future lane.
- **Carry:** the video path stamps no `contract_version`/`contract_ref`. Recorded as a provenance limitation, not a failure — adding it would strengthen §5.
- **Carry:** `visual_approval` proofs are not platform-scoped (filter (e) ignores `platform`), so PP's facebook-only proofs satisfy LinkedIn calls. Governance question, out of scope.
- **Carry:** `image_quote` runs 706 successful bypass renders alongside its governed path — worth a separate look at which clients are still off-spine.
- **R0 gap:** `information_schema` is privilege-filtered for `ice_readonly` (schema `c` → 0 rows); `pg_catalog` routes fine. Per CLAUDE.md a signal for a future `ice_ro` view, not a workaround.
