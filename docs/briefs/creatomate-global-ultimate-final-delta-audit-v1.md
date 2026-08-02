# Creatomate Global Ultimate — v1 → Final Delta Audit (rev-3, PK-accepted baseline)

**Lane classification:** T1 (docs/read-only) · SIDE_PROVING · audit + packet preparation only.
**Status:** **The proposed CGU Final programme.** PK has accepted the reconciled baseline (rev-2)
and directed four final amendments (rev-3, this revision) plus a commit. **Committed to `main` as
a proposal — NOT registered, NOT ratified.** No register pointer has been cut; no implementation
starts until PK issues the CGU-v1 final verdict.
**Scope:** Creatomate-side production pipeline only. HeyGen remains out of scope (parked
2026-08-02) — not analysed, not assumed as a dependency.
**Why rev-2 exists:** rev-1 (same filename, superseded in place — never committed, so no
historical-rewrite concern) was built from memory snapshots up to ~8 days stale and described a
"PP `video_short_stat`-only" baseline that PK correctly identified as materially wrong. This
revision is a reconciliation pass against the actual governing document already ratified-in-draft
in this repo (`docs/briefs/creatomate-global-ultimate-programme-brief-v1.md`, rev-2, 2026-08-01)
and the live final-readiness measurement taken 2026-08-02
(`docs/briefs/results/cgu-final-readiness-audit-result-v1.md`, on branch
`lane/cgu-final-readiness-audit`, pushed to origin, not yet merged to main).
**Method:** every claim is cited to a file, or to a live read-only DB query run in this session
(`execute_sql`/`db-read.py` against project `mbkmaxqhsohbtwsqolns`, timestamped 2026-08-02), or
marked `[UNVERIFIED — needs a fresh check]`. Where a memory conflicted with a live read, the live
read wins and the conflict is named, not silently resolved.
**Authority:** nothing below authorises any write, deploy, schedule change, or migration.

---

## 0. Correction log (what rev-1 got wrong, and the live facts that replace it)

| # | rev-1 claim | Correction | Evidence |
|---|---|---|---|
| 1 | "CGU v1 = PP `video_short_stat` only" | CGU already governs 25 committed cells across 4 clients × up to 4 platforms × 5 format families (image_quote, text, carousel, video_short_stat, video_short_kinetic). PP-stat-only was true in late July; it is not true now. | `creatomate-global-ultimate-programme-brief-v1.md` §1.2 target matrix; readiness audit §2 |
| 2 | (not claimed, but assumed) PP kinetic is unbuilt | PP kinetic is **deployed, activated, `overall_state='ready'`, `runtime_reachable=true`**; `video-worker` v3.16.2 live, `deploy-verifier` content-PASS; only rungs 8–9 (a real draft + publish through Wednesday's natural slot) remain. | readiness audit row #33; `docs/00_sync_state.md` v6.121 |
| 3 | (not claimed) NDIS YouTube stat is unbuilt | NDIS YT stat is `ready`/`ready`/`true` with a **PK-authorized supervised production-proof lane** in flight (force-fill precedent from the PP 3-consecutive lane); zero governed evidence exists yet, but the lane is scoped and gated, not conceptual. | readiness audit row #30, §4-C, §6b item 4 |
| 4 | (not claimed) B2/D1/D2/D3 status | All four are **decided and executed**: D1 (governed text, all brands) live via the governed-exempt rider; D2 (PP legacy carousel) **applied** 2026-08-02 03:43:40Z; D3 (CFW/INV YouTube deferred) recorded state-2; B2 (three template-family promotions to NDIS/CFW/Invegent) applied 2026-08-02, all `visually_approved` and live-selectable, one (Invegent market-insight-card) now the live selector winner on 4 platforms. | readiness audit §2, §6b, §6c; `b2-visual-verdict-promotion-stage0-forensic-reconstruction-v1.md` |
| 5 | "89% of PP video is legacy" | Recalculated from live 90-day publish counts (not the 18-slot July sample rev-1's figure came from): PP YouTube — the only platform where video is a committed matrix cell — carries 44 publishes/90d (16 stat + 28 kinetic), of which **exactly 2 are governed** ⇒ **~95.5% legacy, not 89%**, and this number is about to move materially once kinetic's natural slot lands 2026-08-03T07:00Z. See §2. | readiness audit rows #29, #33 |
| 6 | "Music: 0 selectable tracks (content_id_safe gate)" | **False today.** Live-verified 2026-08-02: `select_music('format','video_short_stat')` returns 1 row (Drifting Piano), and its license row has `content_id_safe=true`. The 0-eligible state described in an older memory was itself later corrected (the license row was updated after 2026-07-10) — this pass re-verified against the live table directly rather than trusting either doc. | live `execute_sql`, this session |
| 7 | "Voice: PP + NDIS only, CFW/Invegent blind" | **Still true, live-reconfirmed 2026-08-02** (unlike #6, nothing changed here — a voice-config *editing* surface shipped 2026-07-29 (`cc-0086`) but zero new client rows were added). | live `execute_sql`, this session; `cc-0086-brand-host-voice-config-result-v1.md` |
| 8 | "WS-3 Asset Gap: dry-run only, dormant" | **WS-3 is closed per its own Definition of Done as of 2026-08-02.** Live scheduled writer (cron `jobid=94`, `p_dry_run=false`, live-fired 2026-08-01), secret-free read view (`ice_ro.asset_gap_backlog`, applied 2026-08-02), routing complete on all 4 brands (zero unrouted non-ready cells), and a **deliberate two-register model** (not a merge — the markdown register is a superset the DB analyzer structurally cannot represent 9 of 15 items of; PK-accepted Option C). Only a dashboard panel over this now-live backlog is new work. | `ws3-asset-gap-read-view-result-v1.md`, `ws3-asset-gap-live-writer-result-v1.md`, `ws3-asset-gap-routing-loop-proof-result-v1.md`, `ws3-asset-gap-register-reconciliation-result-v1.md` |
| 9 | "WS-5 template metadata: dark/unpopulated" | **WS-5 DoD met.** Governed write RPC live (Phase 1, 2026-08-01); 3 templates now carry live, validator-confirmed calibrated constraints (kinetic `9ad024cc` + `generic_market_insight_card_1x1_v1` + `generic_quote_card_1x1_v1`, the last two applied 2026-08-02 as register v6.126); the WS-4 intake-validation consumer is live and reads them. | `ws5-constraints-shape-phase1-designed`, `ws5-metadata-population-closeout-result-v1.md` |
| 10 | Template graduation ladder treated as a "Final workstream" (WS-T) | **Wrong framing — it is inherited infrastructure**, ratified 2026-08-01 as the formal proof authority (P-2 closed). It has no remaining deliverable of its own; it is the tool every other workstream uses. Removed as a standalone workstream in this revision. | `creatomate-global-ultimate-programme-brief-v1.md` §1.4 |

### 0b. rev-3 amendments (PK-directed, accepted baseline stands unchanged)

PK accepted rev-2's reconciled baseline in full and directed four amendments before commit —
these are additive/corrective, not further baseline reconciliation:

1. **New must-have M11 — governed legacy-path migration & retirement**, added to close the exact
   trap rev-1's percentage framing couldn't: a cell can be `ready` in the readiness queue while a
   real fraction of its actual scheduled occurrences still silently execute a legacy code-composed
   route (the precedent: `video_short_stat_voice` "reads governed, routes legacy" naming trap; PP
   YouTube's 2-of-44 real governed-occurrence rate, §1). **No percentage gate** — acceptance is
   binary per cell (§2.2).
2. **M9 resolved**, not left as an open decision: a literal 5th live client is explicitly NOT a
   Final blocker; Final instead requires proving the zero-code onboarding *contract* is a reusable
   package (Day-1 governed setup + a no-code replay), demonstrated on an existing brand or an
   isolated fixture. A literal 5th client becomes the first *post-Final* commercial validation of
   that package.
3. **Music reclassified**: basic capability (≥1 selectable Content-ID-safe track) moves to
   Inherited (§2.1) — it is MET. A new must-have, M12, carries the *quality* question (depth,
   rotation, monotony avoidance) forward, with minimum library depth surfaced as an open PK
   decision rather than assumed.
4. **Appendix B (first-week operating plan) restored** (§7), rebuilt against the reconciled
   baseline, not rev-1's stale one.

---

## 1. Exact current baseline (2026-08-02)

**Governing documents (already exist, already partially ratified — this audit does not replace
them):**
- `docs/briefs/creatomate-global-ultimate-programme-brief-v1.md` (rev-2) — defines Milestone 1
  (Governed Boundary Complete) and Milestone 2 (Ultimate), the 25-cell target matrix, D1–D4,
  WS-1…WS-6. **Status: DRAFT rev-2, awaiting final PK ratification (P-1 still open per its own §4.3
  table)** — treat its content as the working definition, not yet as a closed contract.
- `docs/briefs/results/cgu-final-readiness-audit-result-v1.md` — the live measurement against that
  matrix, 2026-08-02, on the unmerged branch `lane/cgu-final-readiness-audit`. This is the most
  current ground truth in the repo for cell-level state.

**Milestone 1 (Governed Boundary Complete):** PASS under its own operational rule ("zero unowned
non-ready target cells" — met) with one cosmetic disposition recorded (INV FB/IG carousel
queue-absence accepted as state-2, PK ruling 2026-08-02). Strict-letter reading needs only
bookkeeping, not new governance work.

**Milestone 2 (Ultimate, as currently defined by the rev-2 brief):** **22 of 25 committed cells are
state-1** (ready + a recorded `platform_publish` proof event), after three same-day applies
(Packets A, B, A2). Remaining 3:
1. **PP YT `video_short_kinetic`** — rungs 8–9 only; natural slot **2026-08-03T07:00:00Z**.
   ⚠ `youtube-publisher` is schedule-blind — approving the resulting draft auto-publishes publicly
   within ≤30 min.
2. **NDIS YT `video_short_stat`** — PK-authorized supervised force-fill lane (run-sheet exists on
   the readiness-audit branch), zero governed evidence today.
3. **CFW × LinkedIn `image_quote`** — zero 90-day publishes; needs a PK evidence ruling (accept
   >90d-old evidence, or wait for a fresh natural publish) — the only image_quote cell without a
   resolvable proof-event path.
The Milestone-2 zero-code enrolment-proof clause is **already satisfied** (NDIS, empty CE code
diff, v6.113).

**D1–D4 disposition:** all four DECIDED and EXECUTED (D1/D2/D3 live; D4 in flight, see above).
No open design question remains on any of the four — only the mechanical closure of the 3 cells
above.

**B2 (template-family expansion to NDIS/CFW/Invegent):** three promotions applied 2026-08-02, all
`visually_approved` and live-selectable (not yet `production_proven` — render/draft/publish rungs
7–9 are future, separately-gated):
- Invegent → `generic_market_insight_card_1x1_v1`: **live selector winner** on all 4
  platforms/placements (flipped from `generic_quote_card_1x1_v1`).
- NDIS → `generic_quote_card_1x1_v1`: applied, selector winner unchanged.
- CFW → `generic_quote_card_1x1_v1`: applied, selector winner unchanged.

**WS-3 Asset Gap:** CLOSED per its own DoD (read view + live scheduled writer + full 4-brand
routing + a deliberate, PK-accepted two-register model). No remaining build work. A dashboard
panel over the now-live backlog was never part of WS-3's scope and is genuinely new work (§3).

**WS-5 Template Metadata:** Phase 1 (write RPC) live; 3 templates populated with live calibrated
constraints; WS-5's own DoD ("2–3 production-proven templates populated" + a live consumer) is met.

**Music (live-verified this session):** `select_music('format','video_short_stat')` returns exactly
1 row — Drifting Piano, `content_id_safe=true`, CC0, no attribution required. **A Content-ID-safe
governed music bed already exists and is selectable.** 8 further tracks remain fenced
(`intake_candidate`).

**Voice (live-verified this session):** `property-pulse` and `ndis-yarns` have a configured
ElevenLabs voice; `care-for-welfare-pty-ltd` and `invegent` do not. Unchanged from before
2026-07-28 — a voice-config editing UI shipped 2026-07-29 but added zero new rows.

**B-roll:** pool = 6 clips, resolver v1.5 live (recent-use avoidance + geography compatibility),
4 of 6 clips Sydney-concentrated (3 distinct localities), `platform_scope` still inert at the
production call site (`p_platform=NULL` always). **Dated 2026-07-30, not independently re-verified
live this pass** — no evidence of change found, but flagged per the reconciliation discipline this
audit is itself modeling.

**Legacy-vs-governed video share (recalculated):** PP YouTube 90-day publishes = 44 (16 stat + 28
kinetic), 2 governed ⇒ **~95.5% legacy on the one platform where video is committed**. Cross-platform
(FB/IG/LI) legacy video share is **[UNVERIFIED — not a committed matrix cell, not re-derived this
pass]**. This YouTube number will shift as soon as kinetic's 2026-08-03 slot and the NDIS supervised
lane land. **This figure is retained as descriptive context only — per PK direction (§0b), Final
does not gate on any percentage threshold.** The actual gate is M11 (§2.2): every scheduled cell is
either provably governed or explicitly retired/deferred, checked per-cell, not in aggregate.

**Audio standards, monitoring, cost controls, provider-neutral render contract:** unchanged from
the prior pass — no evidence of new work found. Carried forward with original dates
(2026-07-24 → 2026-08-01); **not independently re-verified live this session** (lower priority given
the specific corrections PK asked for). Treat these four sections' currency as roughly one week
older than everything else in this document.

**Register head:** v6.126 (`docs/00_sync_state.md`, `docs/00_action_list.md`). Known disclosed
carry: `tmr-drift-probe` daily status reads `error` (not `ok`) starting 2026-08-02 — an accepted
side effect of the D2 apply, Option-B patch queued and unbuilt. Not a new incident if seen.

---

## 2. Restructured programme: three tiers

### 2.1 Inherited from CGU v1 — closed, permanent, not reopened by Final

- Template registry (TMR-3/4 schema) + the 9-state/13-rung graduation ladder, **ratified as the
  formal proof authority** (P-2, 2026-08-01).
- `select_template` + selector policy (cc-0089).
- `classify_format_capability` v2 (seven-state) + the Client Production Readiness Queue — the
  measuring instrument for both milestones; no new measurement machinery gets built for Final.
- **WS-2 S7 Capability Enforcement** — COMPLETE, live v6.106. Demand-grid guard, self-healing on
  template graduation.
- S9 capability→publisher enforcement (resolver + publisher boundaries), both live.
- Asset intake/promotion machinery (image-harvester/image-reviewer, PK visual gate as the only
  deciding act) — proven, unchanged non-negotiable.
- **WS-3 Asset Gap Activation** — CLOSED per DoD (live writer, read view, full routing, two-register
  model). Only its dashboard surface is new work (§3, must-have item 8).
- **WS-4 Creatomate Specialist** charter + the operator-transposition loop (AI proposes → PK
  transposes in the editor → ICE registers → system proves → template becomes selectable) — the
  pattern is proven once (PP kinetic) and is the reusable mechanism for any future template family,
  not a one-off.
- **WS-5 Template Metadata** Phase 1 — write RPC live, 3 templates populated, consumer live. Future
  population of *more* templates reuses this machinery; it is not new infrastructure.
- **WS-6 Dashboard Capability Visibility** — COMPLETE (Slice F, landed pre-existing, v6.100).
- D1 (governed text carve-out), D2 (PP legacy carousel), D3 (CFW/INV YouTube deferred) — decided
  and executed. Only D4 (kinetic) has open mechanical rungs, tracked as a Milestone-2 closure item,
  not a Final workstream.
- Production Reliability lane (fail-closed audio-*presence* gate, visible retry/recovery,
  schedule-safe publish) — all 3 fixes deployed and live-proven.
- B-roll re-activation + resolver v1.5 — live (depth/diversity is a genuine remaining gap, carried
  into §2.2 as its own must-have, not reopening the activation itself).
- The registered specialist-agent team and the CCF-02/CCF-04 orchestration contract (this
  document's own operating rules).
- **Basic governed music capability** — `select_music()` live and correct; ≥1 selectable
  Content-ID-safe track (Drifting Piano) exists today, live-verified. **MET, reclassified from
  must-have in rev-3** (§0b). Only the *depth/rotation/monotony* question remains open work,
  tracked as M12 (§2.2) — a quality workstream, not a basic-capability gap.
- **The zero-code capability-enrolment demonstration itself** (NDIS, v6.113, empty CE code diff) —
  the one-off proof is done and stays done. What is NOT yet inherited is turning that one-off into
  a documented, reusable Day-1 package — that is M9 (§2.2, resolved scope, §0b).

### 2.2 CGU Final must-have — finite, gates Final's declaration

Every row states a bounded, checkable acceptance test. Final is declared when every row reads
`MET`.

| # | Capability | Current state (2026-08-02) | Finite acceptance test | Status |
|---|---|---|---|---|
| M1 | Automated loudness measurement | Presence-only audio gate live (`video-worker` v3.14.0); true LUFS measurement exists only as an offline harness tool, never wired to a live render | A live LUFS value is written to `render_spec.qa.loudness_lufs` for every voiced/music-bed render in a 20-render sample; a deliberately silent-but-voiced test render is caught pre-publish | **OPEN** |
| M2 | Governed voice for all 4 active clients | PP + NDIS configured, live-reconfirmed; CFW + Invegent have zero rows in `c.client_voice_config` | 4/4 clients produce one audible, correctly-attributed governed voice render each, via the same controlled single-draft protocol used for the PP/NDIS recovery | **OPEN** (2/4) |
| ~~M3~~ | ~~≥1 Content-ID-safe governed music bed~~ | **MOVED to Inherited, §2.1 — MET, not a must-have.** `select_music('format','video_short_stat')` returns Drifting Piano, `content_id_safe=true`, live-verified this session | — | **MET (inherited)** — the depth/rotation question continues as M12, below |
| M4 | Deeper, truthful B-roll coverage | Pool=6, 4/6 Sydney-concentrated (3 distinct localities); `platform_scope` inert at the production call site | ≥3 distinct AU localities represented with ≥2 clips each in the eligible pool (not just ≥3 total localities on 6 clips); `platform_scope` is either provably enforced or formally documented as intentionally unenforced — no third, undocumented state | **OPEN** |
| M5 | Multiple production-proven governed video families | Per the programme's own definition, "production-proven" = readiness-queue state-1 (ready + recorded proof event). Today: PP `video_short_stat` and PP `video_short_kinetic` are the only two committed video families; kinetic is 1 slot from its first governed publish, stat needs its accepted publishes' proof events recorded (already PK-authorized, in the same packet as the trail-alignment work) | Both PP `video_short_stat` and PP `video_short_kinetic` reach state-1; **"multiple" is met at exactly 2 families** unless PK elects to require a 3rd (e.g. NDIS stat, which is already a separate in-flight Milestone-2 cell) | **IN FLIGHT** — closes automatically as Milestone-2's remaining 3 cells close; not separate new work |
| M6 | One production-proven multi-scene format | Creatomate has no multi-scene lane in this repo at all — confirmed explicitly out of scope in `video-broll-intake-v1-gate1-brief-DRAFT.md` | One PK-approved, audibly+visually verified, reproducible multi-scene render exists, within the 2-min render-ceiling budget | **OPEN** — zero prior art; largest single lift in this table |
| M7 | Render monitoring + cost capture | Cron-health Layer-1 live; render-path cost/queue-depth observability does not exist; `render_spec` cost fields uncaptured; no LLM-cost-guardrail design was ever built for render providers | `render_spec` carries a non-null cost/credit value for a sample of recent Creatomate renders; a documented weekly cost figure exists (even if the honest figure today is "previously unknown, now observed") | **OPEN** |
| M8 | Dashboard Asset Gap Register | WS-3's backlog (`ice_ro.asset_gap_backlog`) is live and populated; **no dashboard UI reads it** — the only UI surface today (Static-Image Governance Dashboard) is a different, already-closed surface | A dashboard panel shows the same open-gap count as a direct ledger read, refreshes on the writer's own cadence, passes `dashboard-ia-lint` | **OPEN** — the one item WS-3's own closure explicitly deferred |
| M9 | Zero-code onboarding contract: Day-1 package + no-code replay proof | **RESOLVED SCOPE (PK, §0b): a literal 5th client is NOT required for Final.** The one-off zero-code enrolment demonstration (NDIS, v6.113) is done and inherited (§2.1), but it has never been written up as a reusable, documented contract — there is no "governed Day-1 setup package" spec (what voice/music/asset-pool/format-governance rows a new-to-a-format brand needs on day one) and no second replay proving the pattern generalizes rather than being a NDIS-specific artifact | Author the Day-1 governed setup package as a spec (voice config + starter background/B-roll pool + ≥1 governed format's governance rows + client_format_config), then **replay it end-to-end with zero worker-code changes** on either an existing brand entering a *new* format-mix (the same shape as NDIS's original proof) or an isolated fixture brand created for this purpose | **OPEN** — smaller, well-scoped deliverable now that the literal-5th-client ambiguity is removed |
| M10 | Docs-only provider-neutral render contract (Creatomate-scoped) | One aspirational sketch exists (`render-provider-creatomate-capability-audit.md` §7); zero abstraction in code | A design doc exists, extracted from ≥2 real format implementations (stat + kinetic, once both close), that a future provider-abstraction lane could implement against without re-deriving this programme's learnings (TPR-1, the silent-template trap, the audio-presence-vs-loudness gap) | **OPEN**, but cheap — docs-only, no code |
| M11 | Governed legacy-path migration & retirement | **NEW, PK-directed (§0b).** No repo-wide accounting exists of which scheduled Creatomate format×client×platform occurrences actually execute the governed builder vs a legacy code-composed route. Known live instances of the trap this targets: PP YouTube's 2-of-44 real governed-occurrence rate (§1); the historical `video_short_stat_voice` naming trap ("reads governed, routes legacy" — `B1_VIDEO_GOVERNED_FORMAT` string-matches the base format key only, so voice-suffixed variants silently miss the governed fork); legacy `video_short_kinetic`/`_kinetic_voice` composing in code with no `select_template` call at all pre-D4 | **Per-cell, binary, no percentage gate:** for every scheduled Creatomate format×client×platform cell, either (a) it demonstrably routes through the governed selector + asset resolver + metadata + QA + evidence path for its real scheduled occurrences (not just readiness-queue eligibility), or (b) the legacy route is explicitly retired (code removed/disabled) or explicitly PK-deferred with a recorded reason. Zero cells remain on a silent, undocumented legacy route | **OPEN** — starts with an inventory (cheap, T1); closure lanes follow per finding |
| M12 | Music depth, rotation & monotony avoidance | Basic capability MET (M3, inherited, §2.1) — but exactly 1 track means every governed video plays identical music indefinitely; PK has previously rejected a fully-silent video and accepted a single-track 70%-bed render once, but a *week* of the same bed on every video is a real, untested aesthetic question, not yet asked | A PK-set minimum selectable-library-depth target (§5 open decision) is met, with rotation producing a measurably non-uniform aural experience across a sample week of renders (reuse the existing B-roll rotation-uniformity proof method — seed distribution across the eligible pool) | **OPEN** — blocked on the PK depth-number decision (§5) before any sourcing work is scoped |

### 2.3 Optional / post-Final — explicitly deferred, does not gate Final

- **A literal 5th commercial live client — resolved (§0b, §5): explicitly NOT a Final blocker.**
  Becomes the **first post-Final commercial validation** of the M9 Day-1 package, once that
  package is proven (on an existing brand or fixture) inside Final itself.
- `video_short_kinetic_voice` and any B-roll/imagery-backed kinetic variant — explicitly out of
  scope of every visual approval recorded to date (v6.115 scope rider); each needs its own probes
  and a fresh visual verdict.
- CFW/Invegent YouTube (D3, PK-deferred, promotable later without moving Final's finish line).
- Weekly Digest format family, animated formats (Slice D), Asset Gap subject-type expansion
  (music/avatar/voice/feed-volume/provider) — all explicitly named OUT of Ultimate v1 in the
  ratified programme brief §1.3, unchanged by this reconciliation.
- LinkedIn cadence raise beyond the existing max-2/day design — a standing lever, not pulled by
  default.
- A second render provider (implementation, as opposed to M10's design-only doc) — no provider is
  named, scoped, or assumed here.
- R3a `resolve_final_format` shadow-predicate consolidation (three parallel predicate
  implementations) — a named carry, not blocking.

### 2.4 Hard exclusions — never in scope, by standing charter rule (not "deferred," permanently out)

- **Automated Asset Gap *closure*** (as opposed to detection, which is done). PK visual approval
  remains, by design, the only act that promotes an asset to production — CLAUDE.md's Image
  Workflow §2 non-negotiables are unchanged by anything in this programme and are not up for
  reconsideration in a Final scoping pass.
- Browser-automated Creatomate template creation — no template-create API exists; this is a
  standing out-of-scope rule, not a backlog item.

---

## 3. Workstream dependencies and order (must-have items only — inherited items need no sequencing)

```
Phase 0 (already in flight, not new work — closes automatically)
  Milestone-2's remaining 3 cells: PP kinetic rungs 8-9 (slot 2026-08-03T07:00Z) ·
  NDIS YT stat supervised lane · CFW-LI evidence ruling
  → this closes M5 as a side effect; do not schedule it as separate work

Phase 1 — Foundation (measure before you gate; nothing else is trustworthy without this)
  M1   Loudness measurement            ← blocks: M2 acceptance quality, M6's reproducibility bar, M12's rotation proof
  M7   Render monitoring + cost capture ← blocks: any future cost-control decision (not itself a must-have here)
  M11a Legacy-routing INVENTORY (which scheduled cells are governed/legacy/retired, incl. voice-suffix
       naming-trap variants) ← no dependency, cheap (T1), start immediately — everything in Phase 2's
       M11b closure work is scoped BY this inventory's findings

Phase 2 — Close known content gaps
  M2   Voice for CFW + Invegent         ← needs: M1 (a voice proof needs a real loudness number, not presence-only)
  M4   B-roll depth + platform_scope truth ← needs: M1 (combined B-roll+VO QA proof pattern)
  M11b Per-cell legacy migration/retirement closures ← needs: M11a inventory + Phase 0 closed (3 of the
       cells M11 must classify are exactly Phase 0's remaining cells)
  M12  Music depth/rotation sourcing    ← needs: the PK depth-number decision (§5) FIRST, then reuses the
       proven fenced-first sourcing pattern (same shape as the B-roll batch-2 lane)

Phase 3 — New capability
  M6   Multi-scene production-proven format ← needs: Phase 0 closed (a 2nd video family gives multi-scene
                                                something real to compose from) + the 2-min render-ceiling
                                                budget question resolved
  M10  Provider-neutral contract (design)  ← needs: Phase 0 closed (needs ≥2 real format implementations
                                                to extract a real shared shape, not 1); benefits from M11a's
                                                inventory to know the real (not nominal) format count

Phase 4 — Operational surfacing
  M8   Dashboard Asset Gap Register     ← needs: nothing further — WS-3's backlog is already live;
                                            this can start immediately, in parallel with everything above
  M9   Day-1 package + replay proof     ← needs: nothing structurally if replayed on an isolated fixture
                                            brand (can start immediately, parallel to everything above);
                                            becomes dependent on M2 completing first ONLY if PK elects to
                                            replay specifically on CFW or Invegent
```

**Rule preserved from rev-1:** no item is sequenced ahead of the measurement it needs to prove
itself — M1 and M7 are the two "measure first" foundations, same discipline TPR-1 and the audio-
presence gate already taught this programme twice.

---

## 4. Estimated implementation lanes

Counting distinct PK-gated packets/lanes, not calendar time (this programme's own history shows
lane duration varies from same-day to multi-day depending on review-chain findings).

| Item | Est. lanes | Tier | Notes |
|---|---|---|---|
| Phase 0 closure (3 cells) | 3 (already scoped/authorized) | T3 (2), T2 (1) | Not new scoping — PK already authorized all three (§6b of the readiness audit); this is execution, not planning |
| M1 Loudness | 1–2 | T2 | 1 design lane (how to run ffmpeg-equivalent from a Deno EF) + 1 wiring lane; could collapse to 1 if the design is simple |
| M2 Voice ×2 clients | 1 (config) + 2 (proof) = 3 | T2 | Config addition is trivial; the blocker is PK sourcing/approving 2 ElevenLabs voice IDs — a content decision, not an engineering one |
| M4 B-roll depth | 1 sourcing batch + 1 design-decision lane (`platform_scope`) | T2 (sourcing), T2/T3 (scope decision) | Sourcing reuses the proven fenced-first batch pattern; the scope decision is PK's, not engineering's |
| M6 Multi-scene | 1 design spike + 1 template-authoring lane (WS-4 pattern) + 1 proof lane | T3 throughout | Largest lift in this table; reuses the WS-4 operator-transposition loop, not a new mechanism |
| M7 Monitoring/cost capture | 1 (capture only) | T1/T2 | Pure additive logging — cheapest lane in this table |
| M8 Dashboard Asset Gap Register | 1 IA-lint pass + 1 build lane | T2 | Can start now; WS-3's backlog is already live to build against |
| M10 Provider-neutral contract | 1 docs lane | T1 | Docs-only; cheapest lane in the whole must-have list; wait for Phase 0 to give it 2 real formats |
| M9 Day-1 package + replay proof | 1 spec-authoring lane + 1 replay lane | T1 (spec), T2/T3 (replay) | No longer a pure decision gate (§0b) — a literal 5th client is off the table, so this is now bounded, buildable work |
| M11 Governed legacy-path migration & retirement | 1 inventory lane (M11a) + N closure lanes (M11b, count TBD; at minimum 2 known naming-trap variants: `video_short_stat_voice`, `video_short_kinetic_voice`) | T1 (inventory), T2/T3 per closure | Inventory is cheap and should run first regardless of priority — the only way to bound this workstream's real size |
| M12 Music depth/rotation | 0 lanes until §5's depth number is set, then 1 sourcing batch + 1 rotation-proof lane | T2 (sourcing), T1 (proof, reuses B-roll's uniformity method) | Blocked on a PK number, not on engineering capacity |

**Total estimated new-work lanes (excluding Phase 0, which is already authorized/in-flight, and
excluding M11b/M12 pending their inventory/PK-number prerequisites): ~15–19 lanes**, most T2,
three T3 (M6's template/worker path, possibly M4's `platform_scope` decision, and any M11b closure
that touches live selection behavior).

**First three implementation lanes proposed** (cheapest, highest-leverage, fewest dependencies —
none require a further PK decision to start):
1. **M11a — legacy-routing inventory.** T1, read-only, no dependency. Bounds M11's real size before
   anything else in that workstream is scoped, and directly informs M10's real format count.
2. **M7 — render cost/queue-depth capture** (observability only, no cap proposed). T1/T2, pure
   additive logging, no dependency, cheapest lane that unblocks a real future cost conversation.
3. **M8 — Dashboard Asset Gap Register.** T2, WS-3's backlog is already live to build against;
   `dashboard-ia-lint` pass first, then the panel. No dependency on anything else in this table.

---

## 5. Open PK decisions

1. **M9 — replay target.** Now that a literal 5th client is off the table (§0b), PK still needs to
   choose: replay the Day-1 package on an *existing* brand entering a genuinely new format-mix (the
   same evidentiary shape as NDIS's original proof), or on a purpose-built isolated fixture brand
   (cleaner separation from live client data, but a slightly less real-world proof). Recommend: an
   existing brand if one has a natural new-format-mix candidate in the pipeline anyway; fixture
   otherwise.
2. **M12 — minimum music library depth.** How many Content-ID-safe selectable tracks constitute
   "enough" rotation to avoid the monotony risk? No number is proposed here — this blocks M12's
   sourcing scope entirely until set (§3, §4).
3. **M4 — `platform_scope` enforcement:** wire it live (degrades the current single-scope-wrong
   clip's routing until the pool is scope-correct) or formally document it as decorative metadata.
4. **M6 — render-ceiling budget:** how many scenes / what duration cap is acceptable under the
   existing 2-minute EF wall-clock constraint, before any multi-scene template is authored.
5. **M11 — retirement authority.** Once the M11a inventory surfaces legacy-routed cells, does
   closure default to *migrate to governed* or *explicitly retire*, or is that a per-cell call? A
   default posture (recommend: migrate unless migration cost is disproportionate to the cell's real
   volume, per M11a's findings) would let M11b lanes proceed without a PK gate on every single cell.
6. **Programme brief's own still-open P-1 (final ratification)** is a precondition this document
   inherits, not resolves — Final's finish line technically waits on rev-2 of the programme brief
   itself being ratified, separate from anything in this audit.
7. **Whether to close the 3 remaining Milestone-2 cells (Phase 0) before or in parallel with
   starting must-have work** — nothing here blocks starting M1/M7/M8/M11a immediately; M5/M10/M11b
   benefit from Phase 0 closing first.

---

## 6. Appendix — `post-ultimate-schedule-expansion-v1` (rebuilt from the 22/25 readiness matrix)

**Status: proposal only, superseding rev-1's PP-only-baseline appendix entirely. No cap, cadence,
or mix below is authorised.**

### 6.1 Baseline this appendix now measures against (not rev-1's PP-only baseline)

- 25 committed cells across 4 clients; 22 state-1 today; 3 closing via already-authorized lanes
  (Phase 0, §3).
- Governed formats live or closing: `image_quote` (12/12 cells routed or state-1), `text` (8/8
  state-1 via D1), `carousel` (PP FB/IG state-1 via D2; NDIS/CFW deferred), `video_short_stat` (PP
  closing, NDIS closing), `video_short_kinetic` (PP closing 2026-08-03).
- CFW/INV YouTube: explicitly deferred (D3) — not part of any expansion mix below.
- LinkedIn cadence: max 2/day by design — any raise is Open PK Decision, not proposed here.

### 6.2 Proposed mixes (each gated on a specific §2.2/§3 item — not a schedule)

| Mix | Client(s) | Cell(s) | Proposed cap | Unlocked by |
|---|---|---|---|---|
| E1 | PP, NDIS | the 22 already-state-1 cells | unchanged — already live | nothing; this is the current baseline, not an expansion |
| E2 | PP | `video_short_kinetic` YT, post-graduation | match current legacy kinetic cadence, no increase at first | Phase 0 item 1 closing (2026-08-03) |
| E3 | NDIS | `video_short_stat` YT, post-proof | 1/week initial | Phase 0 item 2 (supervised lane) closing |
| E4 | CFW | LinkedIn `image_quote` | resume at existing cadence once evidence ruling made | Phase 0 item 3 (PK evidence ruling) |
| E5 | CFW, Invegent | any video format | none proposed | **blocked on M2** — 0/2 voice-configured; do not expand video onto voice-blind clients |
| E6 | CFW, Invegent | YouTube, any format | none proposed | **blocked on D3** — explicitly deferred, not reopened by this appendix |
| E7 | any | LinkedIn cadence raise | none proposed | Open PK Decision (§5), Path-B lever exists but unpulled |
| E8 | 5th client | tbd | tbd | **Moved out of Final scope entirely (§2.3, §0b)** — a literal 5th client is post-Final commercial validation, not a Final-lane expansion; no mix proposed here or later in this appendix |
| E9 | any cell M11a finds silently legacy-routed | n/a | **zero expansion** — a cell caught mid-migration or awaiting a retirement ruling gets no volume increase until M11b closes it | M11 closure (§2.2) |

### 6.3 Rollback and proof discipline (unchanged from rev-1 — still the correct pattern)

Every expansion row ships with a single, digest-exact, self-verifying `execute_sql` rollback,
reusing the pattern already proven twice in this codebase (B-roll parity activation, registry-
integrity repair). Before/after readiness-queue snapshots (the same shape as the 25-cell matrix in
§1 of this document) are mandatory for every row — a cell moving from `ready` to any failure state
is an automatic STOP.

---

## 7. Appendix B — first-week operating plan (restored, rebuilt against the reconciled baseline)

**Status: measurement plan only. Applies once PK ratifies a §6 expansion mix — this section defines
how it will be watched, not what will run. Every figure below is the reconciled 2026-08-02 baseline,
not rev-1's stale one.**

### 7.1 Governed-versus-legacy share

- Baseline to watch against: PP YouTube 2-of-44 governed (§1) — track this ratio weekly per cell,
  not as a single programme-wide percentage (per M11's own no-percentage-gate principle, §2.2). A
  cell either has a real governed occurrence in the week or it doesn't; report per-cell counts.
- Watch specifically for the naming-trap class M11 targets: any `_voice`-suffixed format publishing
  in the week should be checked against whether it actually hit the governed fork, not assumed from
  its base format key.

### 7.2 Render / publish success

- Render terminal-fail rate and timeout-retry rate, read directly off the Reliability lane's
  existing classifiers (`classifyRenderFailure`) — already instrumented; Week 1 just needs daily
  reading.
- Publish-anomaly count: any draft reaching `publish_proven` outside its scheduled window (the
  schedule-blind-autopublish class, already fixed once for `youtube-publisher` v1.14.0) — Week 1 is
  a live re-confirmation given kinetic's imminent first natural YouTube publish.

### 7.3 QA

- M1's LUFS pass rate, once M1 lands: target 100% of voiced/music-bed renders carry a non-null
  measurement. If M1 hasn't landed by Week 1, report "presence-only gate still the ceiling" rather
  than omitting the section.
- TPR-1 spec-match on any template involved in a Week-1 render — output spec on record and diffed
  against the prior default, per the standing rule.
- PK visual-approval pass rate on first-render-per-newly-closed-cell (the 3 Phase-0 cells, once
  closed).

### 7.4 Repetition

- Music: with exactly 1 selectable track today (M3, inherited/met), Week 1 will show 100% repeat —
  this is expected and not a failure, but it is the exact evidence M12's PK depth-number decision
  should be made against. Report it plainly.
- B-roll: distinct-locality count actually exercised in the week, against the known baseline (3
  distinct localities across 6 clips, Sydney-concentrated, §1).
- Rotation seed distribution: reuse the existing uniformity check (40+ seeds, near-uniform
  distribution expected) for any pool a Week-1 mix draws from.

### 7.5 Asset Gap movement

- WS-3's live writer (cron `jobid=94`) fires daily — report the actual open/resolved delta in
  `ice_ro.asset_gap_backlog` across the week, now that this is a live-moving number rather than the
  frozen 8-row ledger rev-1 had to caveat.
- Cross-check the markdown register's 9 structurally-unrepresentable pool-depth items by hand (they
  will never appear in the DB delta by construction, per the two-register model, §1).

### 7.6 Fallback behavior

- Confirm zero `unsupported_silent_degrade` cells produced a live publish during the week (S7/S9
  containment should make this structurally impossible — Week 1 is a live re-confirmation, not a
  new build).
- For any cell M11a flags as legacy-routed but not yet closed: confirm it degrades to a *named,
  logged* legacy path, not a silent one — the inventory step itself should make "silent" impossible
  to claim by Week 1's end, even before closure lands.

### 7.7 Format distribution

- Per-client, per-format publish counts for the week, same shape as §1's readiness-matrix table —
  this is the natural weekly re-run of a subset of the same measurement, not new instrumentation.
- Explicitly flag any format publishing outside the 25-cell committed matrix (would indicate either
  a matrix gap or an enforcement gap — should be zero, per Milestone 1).

### 7.8 Provider cost

- M7's capture (once landed): report an actual weekly Creatomate cost/credit figure. If M7 hasn't
  landed by Week 1, say so explicitly — "unknown, not yet captured" — rather than omitting the
  section, consistent with this document's own no-silent-gaps discipline.
- No cap exists to breach today, and none is proposed here — Week 1's job is producing the first
  real number a future cap could be sized against.

---

## 8. Non-claims

This document does not ratify the programme brief's rev-2 (P-1 remains PK's act), does not resolve
the M9 replay-target choice, the M11 retirement-authority default, or the M12 depth number (§5),
does not authorise any expansion mix in §6 or the Appendix B measurement plan's activation, does
not build any must-have item, and does not register or ratify itself as the CGU Final programme —
only commits it to `main` as PK's accepted proposal. It corrects rev-1's stale baseline, carries
PK's four rev-3 amendments, and gives PK a finite must-have list plus the specific decisions in §5
to rule on next.
