# Brief cc-NNNN — Automated Image Intake v1 (backgrounds-only)

**Created:** 2026-07-27 Sydney
**Author:** brief-author (draft; orchestrator persisted)
**Executor:** Claude Code (orchestrated) — PK at every gate
**Status:** GATE 1 APPROVED 2026-07-27 (PK, with 2 corrections) — build lane OPEN

**Gate-1 decisions (LOCKED 2026-07-27):**
- (a) Trigger = **run-on-demand for v1, NO cron** → **Tier T2**.
- (b) Rejected-fingerprint store keyed on **composite (provider + provider_asset_id/source_url + sha256)** — NOT sha256 alone (catches the same provider image delivered at a different size/filename). **pHash deferred to v2.** A PK REJECT at the visual gate writes a fingerprint back.
- (c) Canonical ID = **central registrar assigns**.
- (d) Shortage rule = cc-0073 **≥4 eligible backgrounds per client×live-platform** as the v1 MINIMUM, **prioritised by upcoming scheduled demand where available**; a satisfied count ("4 exist") must NOT falsely imply the required visual categories are covered.
- (e) Providers = **existing `image-harvester` allow-list only**.
**Result file:** `docs/briefs/results/cc-NNNN-automated-image-intake-v1.md` (created on completion)

**Canonical ID:** NOT ALLOCATED — this brief does not invent one. IDs identify tasks and are allocated centrally (register race is by-construction; see Open Question (c)). Placeholder `cc-NNNN` throughout.

**Lane classification (CCF-02):** PRODUCT_PROOF. **Tier: T2 (LOCKED at Gate 1 — run-on-demand, no autonomous trigger).** New DB object (a rejected-fingerprint store) + automation code makes this **≥ T2 in all cases** (DML/new-table ≥ T2, isolated code lane, CLAUDE.md §Workflow-acceleration Convention 3). A **fully autonomous cron trigger escalates to T3** (a new autonomous production-adjacent trigger is a posture change; DML/DDL + any autonomous firing → T3). This brief recommends the tier be fixed at Gate 1 once (a) is decided, and — per the brief-author scoped note — flags that this is the **first code-lane/DB-lane brief** drafted by `brief-author`, so orchestrator + PK should read it with candidate-level scrutiny (CLAUDE.md §Brief-authoring lane).

---

## Task

Convert the proven **manual** background-intake process into **Automated Image Intake v1**. When ICE detects a governed **background-image** shortage for a client, the system automatically prepares a safe, deduplicated, licence-grounded candidate intake pack and **STOPS at the PK visual approval gate** — it promotes nothing into production. Scope is **background images only** for v1. Invegent and CFW are the first proof clients (the two clients whose manual background drain was proven end-to-end at cc-0073 D2, `docs/briefs/results/cc-0073-d2-background-pool-promotion-result.md:26-31`). The lane wires existing, individually-proven primitives into one pipeline; it does not relax any existing gate, and the PK visual verdict remains the only deciding act (CLAUDE.md §Image workflow acceleration §2 non-negotiables).

---

## Source context (cited)

### Proven substrate this lane automates
- **Manual runbook:** `docs/briefs/asset-governed-intake-framework-v1.md` §0 — the reusable S8 procedure that turns "gap X needs assets" into a frozen, fenced-first manifest stopping at the PK apply gate. v1 automates this flow. Its operating rule is binding: *licence-safe, rotation-capable pool SUFFICIENCY, not maximum volume; the Asset Gap Register is the authoritative backlog — no harvesting outside it* (`asset-governed-intake-framework-v1.md:15`).
- **Image agents (PROVEN-SCOPED, always coupled):** `image-harvester` sources licence-safe candidates + full provenance/sha256; `image-reviewer` reviews; harvester output ALWAYS passes reviewer before PK (CLAUDE.md team table + §Image sourcing/review lane; `.claude/agents/image-harvester.md:18-26`).
- **Image Workflow Acceleration v1 P1–P6** (CLAUDE.md §Image workflow acceleration): batch-first (P1), review-once-per-*shape* via a mechanical structural-diff gate (P2), text/signage reject at discovery (P5), concurrent independent reviews (P6). **§2 non-negotiables (UNCHANGED, binding on v1):** PK visual verdict the only deciding act · crop-proof before any accept · licence safety + sha256 provenance · pool-neutrality machine-assertion on EVERY intake · fenced-until-approved default · CAS/fail-closed.
- **Asset-gap substrate (demand/eligibility source):** cc-0041 schema (`m.asset_gap_suggestion` + 4 tables) · cc-0042 read path (appetite from DYNAMIC slots, not the NULL TMR-4 columns) · cc-0043 analyzer writer live · cc-0046 orthogonal gap classification vocabulary — re-derived live and cited at `cc-0073-backgrounds-only-asset-gap-drain.md:83-97` (§D) and `:109-120` (§F, ledger `m.asset_gap_suggestion`). (Underlying result docs `docs/briefs/results/cc-0042-appetite-inventory-read-path.md` and `docs/briefs/results/cc-0046-orthogonal-gap-classification.md` are cited via cc-0073 §Documents `:139-143`; not independently re-read by the drafter — see Evidence gaps.)
- **Eligibility truth (what a machine must measure):** `cc-0073-backgrounds-only-asset-gap-drain.md:42-52` (§A) — `resolve_slot_assets` v1.2 background predicate: `is_active` · `asset_meta->>'approved'` · a licence field present + not expired · `asset_meta->>'bucket'='brand-assets'` · `platform_scope` (a COLUMN) contains the platform when non-NULL · `safe_for_text_overlay IN ('true','needs_scrim')`; **NOT `approval_status`**. **Eligible-count == rotation pool size** (`:52`). `c.client_asset_pool_policy` gates shared-pool reachability: `client_only` vs `client_preferred` vs `best_fit` (`:49-51`, `:80-81`).
- **Manual promotion proven end-to-end for the two proof clients:** `docs/briefs/results/cc-0073-d2-background-pool-promotion-result.md:26-31` — Invegent 1→4 and CFW 2→4 eligible backgrounds on fb/ig/li, pool-neutral to PP/NDIS, sha256 + rollback-identity + PK visual PASS. This is the manual baseline the automation must reproduce without manual sourcing.
- **Storage/fence model:** `c.shared_creative_asset` (rich fences default-closed: `approval_status='intake_candidate'`, `is_active=false`, `production_use_allowed=false`, `brand_neutral=false`, `participant_neutral=false`, `licence_allows_multi_entity_use=false`, `purpose_bound=false`, `sensitivity_class='unknown'`) — `asset-governed-intake-framework-v1.md:27-40` (§1.1); `c.client_brand_asset` (lean; `is_active` defaults **open** so intake MUST set `is_active=false` explicitly) — `:44-52` (§1.2); `brand-assets` bucket + sha256 in `asset_meta` — `:56` (§1.3).
- **Provider allow-list (current):** Unsplash standard licence · Pexels licence · Wikimedia Commons CC0/public-domain ONLY. Hold-list (never offer): CC BY-SA; CC BY (pending PK rule). Excluded: AI-generated, paid tiers, identifiable people, readable signage/branding — `.claude/agents/image-harvester.md:57-67`.
- **NDIS staged real-imagery lane (binding fence):** CLAUDE.md §NDIS sensitive real-imagery intake — Phase 2 (identifiable adults) CLOSED, Phase 3 HELD; `image-harvester` may source ONLY Phase-1 real, person-free / non-identifying backgrounds; an unfilled specialist role is never permission to proceed. v1 background sourcing must respect this even though the two named proof clients are Invegent + CFW (not NDIS).
- **Register head (asserted):** `docs/00_sync_state.md:9-13` — v6.31 records cc-0073 D2 CLOSED + PK visual PASS; origin DIVERGED, cc-0073 D2 docs recording awaits a PK commit/push. No new production window is open (`:13`).

---

## Scope

**In scope (v1 = BACKGROUND IMAGES ONLY):**
1. A **demand→shortage detector**: read actual asset demand from the schedule and the asset-gap analysis substrate (cc-0041/42/43/46) and identify which client / platform / visual category is under-supplied. Machine predicate (Gate-1 locked): cc-0073 **≥4 eligible backgrounds per client×live-platform** (via the §A resolver predicate) as the v1 MINIMUM, with detected shortages **prioritised by upcoming scheduled demand where available**. A satisfied count ("4 exist") must NOT be treated as proof the required visual categories are covered (Gate-1 correction 2).
2. **Automated sourcing** of candidate backgrounds from **approved providers only** via `image-harvester` (candidate: exactly the current allow-list; Open Question (e)).
3. **Automated filtering** through the existing gates: brand / people / signage / licence / quality via `image-reviewer` + the crop-proof text-safety gate; harvester output ALWAYS passes reviewer before PK (CLAUDE.md §Image sourcing/review lane).
4. **Duplicate + previously-rejected detection**: dedup accepted candidates against (i) the existing eligible/fenced pool and (ii) a NEW previously-rejected fingerprint store keyed on **composite (provider + provider_asset_id/source_url + sha256)** — NOT sha256 alone, so the same provider image at a different size/filename is still caught (Gate-1 correction 1). Perceptual/pHash dedup is **deferred to v2**.
5. **Upload of accepted candidates into a FENCED intake state** (fences default-closed per §1.1 / explicit `is_active=false` per §1.2), with sha256 provenance in `asset_meta` and pool-neutrality machine-assertion on every intake (§2 non-negotiable).
6. **Shortlist emit**: assemble a visual shortlist (contact sheet + reviewed, hashed, crop-proofed candidates) for PK.
7. **Hard stop at the PK visual approval gate** — the pipeline promotes NOTHING; the existing approval gate is unchanged.
8. **Proof for Invegent + CFW** (Success criteria / Proof matrix below).

**Out of scope (explicitly, do NOT build in v1):**
- Logo / brand-kit intake automation.
- Music / audio-bed intake automation (`post-music` bucket, Music Library).
- Video B-roll intake (explicitly later — licensing / duration / aspect / motion / scene / edit complexity).
- Automated **replenishment** driven by rotation depth + future schedule demand (a later lane).
- Any **production promotion** — no flip of `is_active` / `production_use_allowed` / `approval_status`, no `allowed_clients` widening, no publish, no rotation change. That is the existing manual PK-gated promotion path (cc-0073 D2), untouched here.
- Any change to the classifier, the analyzer writer, the read-path functions, `resolve_slot_assets`, or `select_template` (the cc-0051 boundary, `cc-0073-backgrounds-only-asset-gap-drain.md:232-233`).
- NDIS Phase 2 (CLOSED) / Phase 3 (HELD) imagery of any kind.
- Non-background asset classes; carousel / video demand.

### Pipeline stages — EXISTING primitives vs NEW build

| Stage | Component | Status |
|---|---|---|
| Read demand from schedule + gap analysis | cc-0041/42/43 substrate + `m.asset_gap_suggestion` | **EXISTS** (`cc-0073 §D/§F`) |
| Eligibility / rotation-depth measurement | §A resolver predicate; eligible-count==pool-size | **EXISTS** (`cc-0073 §A/§C`) |
| Shortage detection (client/platform/category machine predicate) | — | **NEW** — the demand→shortage detector wiring + the machine predicate (Open Q (d)) |
| Source candidates from approved providers | `image-harvester` | **EXISTS** (allow-list `image-harvester.md:57`) |
| Brand/people/signage/licence/quality filter | `image-reviewer` + crop-proof | **EXISTS** (CLAUDE.md §Image sourcing/review lane, §2) |
| Duplicate detect vs existing pool | sha256 in `asset_meta` (§1.1) | **PARTIAL** — sha256 exists; the comparison/dedup logic is **NEW** |
| Previously-rejected detection | — | **NEW** — a rejected-fingerprint store (sha256 + optional perceptual hash). **NONE EXISTS TODAY** (grep of `supabase/**` for reject/fingerprint tables returned zero). DB design + perceptual-hash scope = Open Q (b) |
| Fenced INSERT into intake state | `c.shared_creative_asset` / `c.client_brand_asset` fenced-first | **EXISTS** (`asset-governed-intake-framework-v1.md §1.1/§1.2`) |
| Pool-neutrality machine-assertion | in-txn fail-closed assertion | **EXISTS** pattern (cc-0073 D2 assertion 3d) — reused, not re-invented |
| Shortlist emit for PK | contact sheets (harvester package) | **PARTIAL** — contact-sheet build exists; the assembled PK-facing shortlist artifact is **NEW** |
| Orchestration glue (tie all stages, enforce stop-at-fence) | — | **NEW** |

---

## Allowed actions

- Read-only DB via `python scripts/db-read.py` (R0 views) and SELECT-only `execute_sql` for demand/eligibility measurement (CLAUDE.md §Operator read path).
- Build the automation code in an ISOLATED worktree via `ef-builder`, with hermetic tests; `branch-warden` verifies HEAD/branch/parity (CLAUDE.md §The proof lane).
- Design (and, on PK Gate-1 approval + a T2/T3 apply gate) create the NEW rejected-fingerprint DB object, presented as its own reviewed apply packet with a written + validated rollback (DML/new-table ≥ T2).
- Invoke `image-harvester` → `image-reviewer` (in that order, always coupled) under a PK-approved mini-manifest, batch-first (P1), person-free subjects only, providers restricted to the allow-list.
- Assemble the fenced-intake INSERT(s) and the shortlist artifact, each presented for a PK gate, each fenced-first, each with byte-verify + public-URL sha256 + the in-txn fail-closed pool-neutrality assertion (§2, never waived).
- Run the tier-appropriate review chain: scope-relevant auditors (`db-rls-auditor` when the DB is the subject) → `ask_chatgpt_review` pinned to the artifact hash → `branch-warden`, then the PK gate (CLAUDE.md §External review gate, §Risk-tiered review chains).
- Read-only live probes (`select_template` / `resolve_slot_assets`) to measure before/after eligible counts for the proof.

## Forbidden actions

- **No auto-promotion. No production write past the fence.** The pipeline never flips `is_active` / `production_use_allowed` / `approval_status`, never widens `allowed_clients`, never publishes, never changes rotation. The **PK visual verdict is the only deciding act** (CLAUDE.md §Image workflow §2).
- No unilateral apply, deploy, migrate, merge, or push — every irreversible step is a PK hard stop (CLAUDE.md §PK gates).
- No sourcing outside the approved-provider allow-list; no CC BY / CC BY-SA / AI-generated / paid-stock without a per-asset PK exception (`image-harvester.md:60-63`).
- No identifiable people, minors, participant stories, clinical/personal-care, First-Nations-specific imagery; readable third-party signage/branding in the crop area → REJECT at discovery, never warn-and-offer (`image-harvester.md:64-67`, Image Workflow P5). **NDIS Phase 2 CLOSED / Phase 3 HELD** — an unfilled specialist role is never permission to proceed (CLAUDE.md §NDIS sensitive real-imagery intake).
- No harvesting outside the Asset Gap Register backlog; no volume padding — sufficiency, not maximum volume (`asset-governed-intake-framework-v1.md:15`).
- No change to the classifier / analyzer writer / read-path / `resolve_slot_assets` / `select_template` (cc-0051 boundary).
- No touching of the cc-0073 D2 recording state: origin is DIVERGED and the D2 docs recording awaits a PK commit/push (`docs/00_sync_state.md:13`); do not amend, reorder, or push unpushed commits.
- Pool-neutrality machine-assertion + byte-verify + public-URL sha256 are NEVER waived on any intake, any shape (Image Workflow §2 / P2).
- Build scope must not silently expand to logo / music / video / replenishment (out-of-scope list).

## Success criteria + Proof matrix

**The PK proof:** a detected background shortage automatically reaches a **fenced, reviewed visual shortlist** for Invegent and CFW **WITHOUT manual sourcing and with ZERO production promotion.**

| # | Criterion | Method | Gate |
|---|---|---|---|
| S1 | A real (or seeded-real) background shortage is detected by the machine predicate for Invegent and for CFW, without a human naming the gap | run the detector against live demand/eligibility (§A predicate); output names client×platform×category | build/proof |
| S2 | Candidates sourced from allow-listed providers only, with full provenance | `image-harvester` manifest: source URL, licence name+URL, sha256, dims per candidate | proof |
| S3 | All candidates passed `image-reviewer` + crop-proof before any PK presentation | reviewer verdict + crop-proof recorded per candidate | proof |
| S4 | Duplicates AND previously-rejected assets detected and excluded | dedup vs existing pool (sha256) + vs the new rejected-fingerprint store; excluded items logged with reason | proof |
| S5 | Accepted candidates land in a FENCED intake state (fences default-closed / explicit `is_active=false`), pool-neutral | fence-column readback; in-txn fail-closed pool-neutrality assertion passes; sha256 in `asset_meta` | intake gate |
| S6 | A PK-facing visual shortlist is emitted (contact sheet + reviewed candidates) | shortlist artifact produced for both proof clients | proof |
| S7 | ZERO production promotion occurred | pre/post diff shows no change to `is_active`/`production_use_allowed`/`approval_status`/`allowed_clients`; no publish; rotation pools of ALL clients byte-identical pre/post | proof |
| S8 | The PK visual approval gate is reached and is unchanged (pipeline STOPS there) | pipeline halts awaiting PK; no auto-advance | proof |
| S9 | No spine mutation | `pg_get_functiondef` of `resolve_slot_assets` + `select_template` byte-identical pre/post | proof |
| S10 | Rollback for the new DB object written + validated before apply | dry-run reverse statement restores pre-state | apply gate |

## Stop conditions

Any one halts the lane and surfaces to PK; the remainder is void and resumption needs a fresh gate:
- The reviewed artifact/diff hash changes (external review goes stale — CLAUDE.md §External review gate rule 4).
- Any non-clean subagent verdict or non-clean external review.
- Pool-neutrality assertion fails, or any client's eligible set changes.
- Any production fence flips, or any publish/rotation change is detected.
- A `resolve_slot_assets` / `select_template` definition differs pre/post.
- Byte hash ≠ public-URL hash, or any licence field missing/ambiguous.
- A candidate shows readable third-party signage/branding in the crop area or any identifiable person — REJECT at discovery, never "fix in crop".
- A provider outside the allow-list is reached, or a hold-list/excluded licence is offered.
- Any NDIS Phase 2/3 subject is encountered.
- Rollback path invalidated at the gate; unexpected origin movement; files outside the approved change set.

## Stop condition (lane)

When criteria are met, report per `docs/briefs/_template_result.md`, then stop. Do not promote, do not open replenishment or the logo/music/video lanes, do not queue follow-on work without a fresh PK gate.

---

## Gate-1 decisions (RESOLVED 2026-07-27 — retained for traceability)

> All five resolved by PK at Gate 1; the locked summary is in the header block. Original questions + rulings below (a→run-on-demand/T2 · b→composite provider+asset_id/url+sha256, pHash v2, REJECT writes back · c→central registrar · d→≥4 floor prioritised by scheduled demand, count≠category-coverage · e→existing allow-list).

**(a) Trigger model for v1 — the central scope/architecture fork.** Fully autonomous cron (the system fires the whole pipeline on a schedule when it detects a shortage) **vs** run-on-demand end-to-end (an operator/PK invokes the pipeline, which then runs shortage→shortlist without further manual sourcing). This decision fixes the TIER (autonomous cron → T3; on-demand → T2) and the whole architecture. The drafter recommends **on-demand for v1** (lower blast radius, no new autonomous trigger posture), with autonomous cron as a later lane — but this is PK's call, not the executor's.
**(b) Previously-rejected fingerprint store — design + perceptual-hash scope.** No such store exists today (grep confirmed). Questions: table location (`m.*` vs `c.*`), key(s) recorded (sha256 exact is certain), and **whether perceptual/near-duplicate hashing (e.g. pHash) is in v1 scope or deferred** (exact-sha256-only is simpler and fail-closed; perceptual dedup adds a tuning/false-positive surface). What populates it — does a PK REJECT at the visual gate write a fingerprint back?
**(c) Canonical task ID.** This brief does NOT invent one. IDs identify tasks and are allocated centrally (the read-then-write register race is by construction — `docs/00_sync_state.md:209` / cc-0047/48 precedent). Needs central allocation before the register block is cut.
**(d) Machine predicate for "under-supplied / visual category."** Reuse the cc-0073 floor — **≥4 eligible backgrounds per client×live-platform** measured by the §A resolver predicate (eligible-count==pool-size, `cc-0073 §C:52`)? And how is "visual category" defined as a machine key (per-platform? per format-family? the cc-0046 classification vocabulary?)? The drafter recommends the ≥4 floor as the starting predicate but does not decide it.
**(e) Approved-provider set.** Is v1's provider set EXACTLY the current `image-harvester` allow-list (Unsplash standard · Pexels · Wikimedia CC0), with CC BY / CC BY-SA / AI-gen / paid excluded (`image-harvester.md:57-63`)? Any change is a policy decision, not an executor call.

## Handoffs

- **→ db-rls-auditor:** all live DB/eligibility ground truth (current per-client×platform eligible counts, fence-column defaults, grants on the new store) — the drafter recorded these from cc-0073/framework docs as ASSERTED, not live-verified.
- **→ branch-warden:** HEAD/branch/parity and the origin-diverged unpushed state before any build/commit.
- **→ register-reconciler / central ID allocation:** the canonical `cc-NNNN` (Open Question (c)).

## Notes

- This is `brief-author`'s **first code-lane/DB-lane draft** (new DB table + automation code). Per the promotion scoped note (CLAUDE.md §Brief-authoring lane), orchestrator + PK should review this draft with candidate-level scrutiny before treating brief-author breadth as proven.
- The manual counterpart is fully worked at `docs/briefs/asset-governed-intake-framework-v1.md`; v1 automation should treat that runbook's fenced-first, sufficiency-not-volume discipline as its specification.
