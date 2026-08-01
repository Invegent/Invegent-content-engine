# Creatomate Global Ultimate — Strategic Inventory & One-Week Execution Plan (v1)

> **Status:** DRAFT — strategic inventory, not an implementation brief. Authored 2026-08-01 from a
> four-thread repo sweep (capability-expansion state · asset-gap system · template-registry metadata ·
> digest/specialist threads). Repo = source of truth; every material claim below is file-cited.
> Nothing in this doc approves, applies, or deploys anything. PK gates unchanged.
>
> **Question answered:** "Given everything already built, what is the optimal execution plan to reach
> Creatomate Global Ultimate with the least rework?" — inventory first, then sequence.

---

## 0. The single most important finding

**"Creatomate Global Ultimate" is not defined anywhere in either repo.** Two independent lanes
already recorded this verbatim:

- `capability-expansion-format-reachability-gate1-brief-v1.md` §8 (branch `claude/gate-1-capability-expansion-paw1ew`, commit `fde6bbc`): "There is NO 'Creatomate Global Ultimate' contract anywhere in this repo (repo-wide case-insensitive grep: zero matches)."
- `s5-cross-brand-evidence-schedule-plan-v1.md` (commit `7b80ee4`): "'Creatomate Global Ultimate' does not exist as a term in either repo."

Every remaining task is currently being evaluated against a milestone that has no acceptance
criterion. Section 5 proposes one. **Ratifying it is the highest-leverage single act available this
week** — it converts an open-ended programme into a checklist.

Also corrected: **"S4" is not this programme.** S4 = NDIS controlled render
(`creatomate-global-capability-map-v2-delta.md:30`); the capability-expansion programme is the S6
lane. No repo doc equates them.

---

## 1. Foundations COMPLETE — treat as permanent, do not redesign

| Foundation | Evidence | Note |
|---|---|---|
| **Template registry (TMR-3/TMR-4 schema)** | 8 tables in `20260630042316_tmr3_template_metadata_registry.sql` + tags/appetite cols in `20260711065353` | Fields, platform suitability, variant candidates, assignments, proof events, audit — all live |
| **13-rung graduation contract** | `results/creatomate-registry-integrity-graduation-contract-v1.md` §4 | The de-facto authority both S5/S6 lanes already treat as the contract (OQ1: PK has not formally ratified it) |
| **`select_template` + selector policy** | `20260703035154` + client-scope rung `20260719010700` + cc-0089 policy table `20260730140000` | Ranking = intent → fit_status → policy.priority → created_at. Working; known drift hazard §6 |
| **Capability classification (7-state)** | `classify_format_capability` v1 `20260728034955` / v2 publisher-path `20260729120000` | Live, composed by the readiness queue |
| **Client Production Readiness Queue** | `results/cc-0088-client-production-readiness-queue-result-v1.md` (v6.78) | THE live client×platform×format truth surface — the instrument for measuring Ultimate |
| **Capability→publisher enforcement (S9)** | v6.58 resolver + v6.68 publisher guards + v6.70–v6.85 releases | Silent-degrade is now fenced at both boundaries |
| **Asset intake/promotion machinery** | `automated-image-intake-v1-runbook.md` (S1→S8), intake framework, harvester/reviewer agents | End-to-end proven (v6.36); PK visual gate is the only deciding act |
| **Asset-gap SUBSTRATE** | cc-0041 schema `20260719160000` · cc-0042 appetite v2 `20260719190000` · cc-0043 writer `20260719210000` · cc-0044/45 autoclose · cc-0046 orthogonal (subject×failure) classifier `20260721100000/110000` | Built, live, reviewed — **and idle** (§3.2) |
| **Multi-signal synthesis** | `t.format_synthesis_policy` + `synth_bundle_v1` job type (`ai-worker/index.ts:1440-1462`; slot-filler bundle branch `20260729143000:704-730`) | "Feed → one post" is already "N feeds → one synthesised post" — load-bearing for the digest question §5.4 |
| **Schedule authority + editor Phase 1** | `format_override` col/RPC/materialiser (v6.88 recovery); cap controls A+B | Settled per PK's own framing |
| **B1 truth alignment (Slice B1)** | `results/capability-expansion-b1-result-v1.md` (v6.94) | Cross-client proof-event trail reconciled; opens the B2 gate |

**Live production surface today** (from the off-main four-brand matrix, live-verified 2026-07-31):
`image_quote` = all four brands × FB/IG/LI `production_proven`; `text` on FB/LI via the template-less
carve-out; PP `carousel` on FB+IG via the legacy pipeline only. **YouTube: zero governed operational
cells for any brand.** Animated formats: `platform_support=false` everywhere.

---

## 2. Foundations that EXIST but need EXPANSION (not redesign)

### 2.1 Template metadata — the schema is ahead of the data
The metadata-rich registry PK sketched is **~70% already schema'd, ~10% populated, 0% consumed**:

- Representable today: duration (`duration_seconds`), per-platform fit (`creative_template_platform_suitability`), format-type mapping (`variant_candidate.format_key/fit_status`), motion style + length class + use-case + tone + vertical (tag tables), family-level purpose (`creative_purpose`), asset-slot needs (derived from real dynamic slots by `derive_asset_appetite` — deliberately not the inert TMR-4 columns), rich evidence (proof events + graduation ladder).
- **Empty escape hatches:** `creative_provider_template_field.constraints` jsonb and `platform_suitability.constraints` jsonb have **never been written by any tracked migration** — they are the natural home for text-length / CTA / logo-placement / contrast metadata.
- Missing entirely: per-template purpose, scene count, CTA-support rollup (`has_cta_slot` derivable but not derived), structured logo placement, avatar-need, numeric confidence score.
- **No governed write RPC exists** for these tables (TMR-3 defers to "the future write-RPC" four times; only `record_tmr_proof_event_v1` was built).
- The per-template capability contract was **fully designed and never built**: `branch-b-template-capability-contracts.md` (PK-approved docs-only 2026-06-25) specifies per-field max_chars/max_lines/min_font, logo/background constraints, overflow risks, and the 5-tier preflight ladder. Its proposed `docs/creative-library/template-contracts/` directory does not exist.

⚠ **Anti-pattern guard (house lesson "declared control production never reads"):** `select_template`
consumes NONE of this metadata today — its inputs are status ladders, fit_status, policy priority,
created_at. New metadata must land **with its consumer** (selector eligibility filter or preflight),
never as inert declared columns — TMR-4's four NULL-everywhere columns are the cautionary precedent
(`cc-0073-backgrounds-only-asset-gap-drain.md:94-96`).

### 2.2 Asset Gap — substrate built, loop idle, two disconnected registers
- The writer `run_asset_gap_analysis` genuinely auto-creates AND auto-closes rows — but `p_dry_run`
  **defaults true**, **no cron/EF/script invokes it**, **nothing reads the table** (one comment hit
  in all app code), and **no `ice_ro` view exposes it**. 8 rows, unchanged since 2026-07-20.
- The markdown register (`ice-asset-gap-register-v1.md`) and the DB ledger are **two disconnected
  systems** — the register's P0-1 "was sourced from a direct probe, not the persisted ledger; no
  corresponding row ever existed in `m.asset_gap_suggestion`."
- cc-0046 already generalised the schema to a *(subject × failure)* matrix covering `template`,
  `assignment`, `platform_config`, `appetite` — broader than backgrounds. NOT representable yet:
  music, avatar/voice, feed-volume, digest-capability, provider-capability, brand-data (CHECK
  vocabulary expansions, each a PK decision; each new type also needs its own detector — the
  current detector only sees resolver failures for background/logo/image).
- Governance invariant to preserve: `governed_auto_sourcing` is mechanically restricted to
  `(static_background, absent)`; cc-0089 decoupling rule: selector ranking never feeds gap analysis.

### 2.3 Capability visibility — one label behind
`classify_format_capability` v2 (seven-state) is live; the dashboard's shared Format Capability
Indicator still renders six states (`publisher_path_missing` shows as "Unknown") — Slice F.
A separate shipped panel (`PlatformReadinessSummary.tsx`, 2026-07-29) already displays the seventh
state, side-stepping the shared indicator. F is a label/lib update in `invegent-dashboard`, zero
DB change, parallel-safe with everything.

### 2.4 Zero-code brand onboarding — one mechanism away
`image_quote` reaching `production_proven` for all four brands with **no worker-code change** is the
existence proof the pattern works. The remaining generalisation is Slice A (enrol brands beyond the
hardcoded PP into `c.client_control_tower_enrollment`), which is **HALTED at a STOP** from its own
dry-run: NDIS's `client_format_config` already enables `animated_data`/`animated_text_reveal`
(unsupported everywhere) and `m.build_weekly_demand_grid` reads `platform_support` **nowhere** —
today's safety is "a coincidence of two independently-owned tables' contents"
(`results/s6-slice-a-ndis-dry-run-result-v1.md` §4.6–§4.7 — currently **untracked working-tree
files**, as is the Slice-A brief). The dry-run answered OQ3: a one-time check is not enough; A needs
the S7 `platform_support` intersection in the demand grid, an equivalent standing guard, or a
re-scope. **This is a PK ruling, and it is the true blocker on the onboarding-generalisation path.**

---

## 3. Sequence: what is genuinely sequential vs parallel

### 3.1 Hard dependency chains (cannot be parallelised away)
1. **B1 → B2** (truth baseline before broadening assignments). B1 done ⇒ **B2 gate is open now.**
2. **(B2 or D) → C** (YouTube onboarding needs a YT-supported selector-reachable format; plus a
   PK-side OAuth act for CFW/Invegent). C is the most-blocked slice; YT restores 0% until then.
3. **PK guard ruling → A** (see §2.4).
4. **Worker path → un-fencing → graduation** inside D (animated formats; rows 21–24 have no worker
   code path at all — largest lift, last).
5. **First natural B-roll render → E** (passive trigger; monitor armed since v6.79; not schedulable).

### 3.2 Genuinely parallel lanes (disjoint artifacts, separate gates)
- **B2** (CE registry/proof lanes) — the only slice that opens new publish cells today.
- **F** (invegent-dashboard, no DB change).
- **Asset-gap activation** (scheduler + read view + register reconciliation — touches nothing the
  capability slices touch; cc-0089 decoupling makes this mechanical, not just convenient).
- **Metadata/contract population** (registry data + a write RPC + a selector/preflight consumer —
  serialises with B2 only at the PK gate if both touch the same template rows).
- **Specialist charter + digest design** (docs-only).

Standing constraint: all build lanes converge on the **PK deploy/apply chokepoint** — one writer per
edge function; same-EF lanes serialise at the deploy gate (`00_action_list.md:42`).

### 3.3 Named STOPs / risks the week must respect
- `task_05bf8b3d` — standing release gate on unattended `announcement_card` selection (STOP for B2).
- F-AIW-PREF-COL-HARDCODE — must fix before any platform-specific preferred-format config (fences A).
- OQ4 (Track-B queue currency) — PK-owned, 7 days stale, STOP for A.
- **PP LinkedIn `text` (69/90d) + PP YouTube `video_short_kinetic` (28/90d)** = 97 posts/90d on
  `unsupported_silent_degrade` with zero governing template, on the flagship client, **explicitly
  unowned** (`capability-map-v3-delta.md` §2–§3). Biggest un-adopted risk item in the programme.
- Register hygiene: v6.94 was assigned twice across branches; the S6 governing brief + B1 packet are
  **not on `main`**; Slice-A brief/result are untracked. One T1 docs lane closes all of this.

---

## 4. Permanent subsystems vs one-off work (question 5 of the inventory ask)

**Should become permanent subsystems:**
1. **Asset Gap System** — substrate exists; needs activation (§5.1). This is the future "ICE writes
   its own tickets" surface, including the Content-QA-contractor intake path.
2. **Template Metadata / Intelligence layer** — schema exists; needs a governed writer, data, and a
   consumer (§5.2). This is what eventually replaces created_at-order ranking with capability-based
   choice.
3. **Capability readiness surface** — already permanent (readiness queue + classifier). Extend,
   don't rebuild.
4. **Creatomate specialist lane** — justified with a corrected charter (§5.3).

**Remain one-off gated lanes:** B2 proof lanes, C (OAuth + profile rows), D (animated worker path),
E (reliability study), F (dashboard label), solid-background structural fix, PP LI-text/YT-kinetic
gap closure.

---

## 5. The three headline questions

### 5.1 Q1 — Is Asset Gap post-Ultimate? **No — it is part of Ultimate. VALIDATED, with a precision.**
The dependency argument is confirmed by the repo: capability expansion consumes governed assets and
templates; the intake framework forbids harvesting outside the register; and the register is
currently a hand-written markdown file disconnected from a live-but-idle DB ledger. But the work is
**activation, not construction** — the build PK is imagining mostly exists:

- **(a) Turn the loop on:** schedule `run_asset_gap_analysis(p_dry_run⇒false)` (writer, idempotency,
  advisory locks, autoclose all exist; needs only a cron + a T2/T3 gate).
- **(b) Give it a read path:** one secret-free `ice_ro` view over `m.asset_gap_suggestion`
  (the cc-0090 pattern, tenth-view precedent; currently NOTHING can read it outside service-role).
- **(c) One register, not two:** generate the markdown register from the DB ledger (or retire the
  markdown to commentary). Precondition for "ICE creates tickets automatically" to be true.
- **Defer:** subject_kind expansion to music/avatar/feed-volume/provider — each needs its own
  detector, not just an enum value; sequence AFTER the loop is live on the types it already covers.
- **Do NOT persist `classify_format_capability` output** — the readiness queue already computes
  capability gaps live and fresher; persisting would create a second stale register. Asset gaps
  persist (they need lifecycle/claims); capability gaps stay computed.

### 5.2 Q2 — Is the Creatomate Specialist justified? **Yes as a lane — but the charter must change.**
The "template builder" framing is impossible and prohibited: **Creatomate has no template-create
API** (`cc-0032-governed-video-combo-audio-vo-music-bed.md:30` — "PK-authored in the Creatomate
editor (no template-create API)"), browser automation is a standing out-of-scope rule, and there is
currently **no safe template-metadata read path** (`format-variant-quote-card…-inventory.md` verdict
`BLOCKED_NO_SAFE_READ_PATH` — key lives only in EF env; no MCP/connector). Template authoring in the
editor stays a PK/human act.

What IS automatable — and already partially designed — is the **architect** role:
registry + metadata + capability-contract stewardship; JSON **source-mode** evolution (both modes
already ship on `/v2/renders`: full source-mode scene graphs in `video-worker`
`buildKineticTextSpec`/`buildStatRevealSpec`, template-mode elsewhere — source mode is the eventual
"generate layouts instead of fixed templates" path, and it is repo-side, PK-gatable, and free of the
no-create-API constraint); the CI-4C→CI-4H connector slices (`provider-inventory-read-access-
pattern-v1.md` §12, none implemented) to close the read gap; probe-render capacity calibration
("layout geometry is NOT in this repo… capacity must be established by probe render" —
`cc-0033-headline-capability-contract-wiring.md:38`). Prior direction-of-travel note agrees:
"template creation should be declarative JSON / API-driven (not fragile browser automation)"
(`creative-asset-selection-v0-brief.md:99`).

**Recommendation:** stand it up as a registered read-only agent charter (like the other 13) named
for what it is — a **template-registry/contract architect**, candidate-level until proven, its first
lanes being metadata population + contract calibration, NOT template creation.

### 5.3 Q3 — The real definition of "Global Ultimate" (proposed acceptance criterion)
The term is undefined (§0). Proposed, built on instruments that already exist:

> **Creatomate Global Ultimate is reached when, for a PK-ratified target matrix of
> client × platform × format cells:**
> 1. **Every target cell is `ready`** per `classify_format_capability` (seven-state) **and carries a
>    live `platform_publish` proof event** (graduation rung 10+) — or is explicitly PK-deferred with
>    a named reason in the readiness queue. No cell is `unsupported_silent_degrade` silently.
> 2. **A new brand can be onboarded to every already-proven format using only governed data, governed
>    assets, and dashboard/schedule configuration — zero worker-code changes** — demonstrated by an
>    onboarding run whose CE diff is empty (the Invegent/CFW `image_quote` promotions are the
>    existence proof; Slice A generalises the last hardcoded enrolment).
> 3. **Every blocked target cell exists as a routed row in the activated gap system** — the backlog
>    is generated, not authored.
>
> The **measuring instrument is the Client Production Readiness Queue** — Ultimate is the state in
> which it reports zero unowned non-ready target cells.

Two PK decisions make this real: **ratify the target matrix** (which cells are in scope — e.g. is
YouTube-for-CFW in, is animated in v1?), and **ratify the 13-rung contract as the proof authority**
(closes OQ1). Weekly Digest is then cleanly OUT of Ultimate v1 — it is a genuinely new format family
(§5.4), the first *post*-Ultimate expansion, precisely because Ultimate's definition is "widen and
fill the existing pattern," and digest breaks the pattern.

### 5.4 Weekly Digest — real, valuable, and post-Ultimate
No client-facing digest format exists anywhere (the three "digest" senses in the repo are pipeline
vocabulary, the reviewer-findings email, and SHA-256). But the distance is shorter than it looks:
**N→1 synthesis already ships** (`synth_bundle_v1` + `format_synthesis_policy` bundle branch with
source-diversity tracking). What is genuinely missing: weekly-window cadence trigger (scheduler is
per-slot/per-day), multi-item provenance on the draft (`digest_item_id` is single and dead — 0/281 PP
drafts), a repeating-layout render primitive (template-mode `modifications` is a flat fixed-key dict
— variable-length lists force source mode or per-count templates), synthesis/quality policy rows,
the 13-rung chain, and a multi-asset publish path (LI/YT have none). **This week:** a one-page
design note naming those seven gaps, so the digest becomes a scoped future format-family lane rather
than a gravitational pull on current work.

---

## 6. Recommended one-week execution plan (minimise rework, maximise parallelism)

Ordered by leverage; lanes 2–5 run in parallel once Lane 1's rulings land. Every lane keeps its
normal tier/review chain; nothing here pre-approves anything.

| # | Lane | Type | Why now |
|---|---|---|---|
| **1** | **Definition & rulings gate (PK, ~1 sitting):** ratify the Ultimate acceptance criterion + target matrix (§5.3) · ratify the 13-rung contract (OQ1) · rule on the Slice-A guard question (S7 intersection vs standing guard vs re-scope, §2.4) · adopt or defer the PP LI-text/YT-kinetic degrade cell · resolve OQ4 | T1 decisions | Everything downstream is currently steering without a finish line; A is dead until ruled |
| **2** | **B2 first tranche:** extend 1–2 template families to NDIS/CFW/Invegent through real render→draft→publish proof (respect `task_05bf8b3d`) | T2/T3 proof lanes | Only startable slice that opens new publish cells; its prerequisite (B1) just closed |
| **3** | **Asset Gap activation v1:** `ice_ro` gap view + scheduled live writer run + register⇄ledger reconciliation (§5.1 a–c) | T2 + one T3 gate | Converts the dependency into a system; smallest build for largest strategic claim |
| **4** | **Slice F seven-state indicator** (invegent-dashboard) | T2, parallel-safe | Zero-risk, closes the visibility gap the readiness queue already exposes |
| **5** | **Metadata seed WITH consumer:** governed write RPC for registry metadata + populate `constraints` for the 2–3 production-proven templates from the branch-b contract design + wire ONE consumer (headline max_chars preflight or selector eligibility) | T2 | Proves the intelligence layer on the anti-"declared control never read" pattern; calibration by probe render |
| **6** | **Docs/registry hygiene (T1):** land the S6 governing brief + Slice-A brief/result on `main`; reconcile the v6.94 double-assignment; update the stale cc-0046 "UNAPPLIED" result doc | T1 docs lane | The programme's own governing documents are currently off-main/untracked |
| **7** | **Charters & designs (docs-only, fill spare capacity):** Creatomate architect agent charter (§5.2) · Weekly Digest gap note (§5.4) · Content-QA-contractor intake path sketch (feeds the gap register; schema expansion deferred) | T1 | Cheap now, expensive to improvise later |

**Explicitly NOT this week:** Slice C (blocked on B2/D + PK OAuth), Slice D (largest lift, last),
Slice E (trigger hasn't fired), digest implementation, subject_kind schema expansion, any wholesale
selector redesign.

---

## 7. Standing risks carried into the week
- Untracked deployed drift on `select_template` (client-scope rung had no migration until backfilled;
  follow-up "not actioned") — verify via `pg_get_functiondef` before any selector-adjacent change.
- Creatomate upstream deletion is undetectable in-repo (row-17 precedent: `production_proven` in DB,
  template deleted provider-side) — argues for CI-4 read-path slices under the specialist lane.
- Render reliability: row-19 `video_short_stat` 62.5% PP-attributable timeout rate; 2-min ceiling;
  blocking poll near the ~150s EF wall clock — feeds Slice E when its trigger fires.
- `BackgroundSolid` structural fix (drafted, unissued) unlocks three template rows in one move —
  candidate for the B2 tranche.
- NDIS animated-format config enabled with no guard (§2.4) — the Slice-A ruling closes it.

— End v1 —
