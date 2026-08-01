# Brief cc-NNNN — Capability expansion beyond the S5 evidence surface: data-driven cross-brand / cross-platform format reachability (Gate-1)

**Created:** 2026-07-31 Sydney
**Author:** brief-author (draft)
**Executor:** Claude Code (orchestrator + subagent chain) — PK at every gate
**Status:** draft — awaiting PK Gate 1
**Result file:** `docs/briefs/results/cc-NNNN-capability-expansion-format-reachability.md` (created on completion)

> **cc- ID NOT self-allocated** — the control tower allocates centrally (precedent: `docs/briefs/durable-platform-support-intersection-demand-grid-gate1-v2.md:10`).
> **Lane classification (CCF-02):** SAFETY_GATE (planning/investigation lane) · **Tier T1 for THIS lane** (docs + read-only investigation only). Each capability slice below names its OWN tier for its OWN future lane; nothing in this brief authorises any of them to start.
> **Boundary with S5 (PK-supplied, load-bearing):** S5 is separately handling the seven-day evidence schedule and cap amendments. This lane must NOT duplicate S5 or alter its schedule/apply work in any way. (PK-supplied ground truth; no repo doc for the seven-day schedule was located by the author — see Notes N1.)

---

## Task

Define — and validate against live evidence where marked — the shortest governed path from today's S5 evidence surface to genuinely data-driven, cross-brand, cross-platform format reachability. The S5 surface exists and is proven: `public.classify_format_capability` returns exactly one of SEVEN mutually-exclusive statuses (`ready · asset_shortage · template_missing · pipeline_missing · governance_unproven · unsupported_silent_degrade · publisher_path_missing`, + fail-closed `unknown`) (`docs/briefs/results/shared-capability-contract-classifier-result-v1.md:28`; 7th status: `docs/briefs/results/shared-capability-contract-classifier-publisher-path-extension-result-v1.md:11`), consumed read-only by the Dashboard Format Capability Indicator (`docs/briefs/results/format-capability-indicator-v1-result.md:13`) and the Client Production Readiness Queue (`docs/00_sync_state.md:67-69`). What does NOT yet exist is breadth: Property Pulse holds most of the proven format surface and the only format-mix steering; CFW/Invegent/NDIS reach production through a handful of cells. This brief (a) names the structural blockers with citations, (b) orders six capability slices onto them, (c) states the coverage each opens, (d) classifies each slice data-only vs code/deploy with a risk tier, (e) names dependencies and stop conditions, (f) recommends the smallest first Gate-1 packet, (g) maps every selectability-touching slice onto the ratified 13-rung graduation ladder, and (h) flags one naming ambiguity for PK. The executor of THIS lane performs docs + read-only investigation only: live-verify the marked claims (named `db-rls-auditor` handoffs), close the open questions PK rules on, and freeze the first packet for its own separate Gate 1.

## Source context

- `docs/briefs/shared-capability-contract-classifier-gate1-v1.md` + `docs/briefs/results/shared-capability-contract-classifier-result-v1.md` — the S5 classifier: six-status contract, service_role-only, ships dark, enforcement explicitly a separate R3 lane (result §4, §8).
- `docs/briefs/shared-capability-contract-classifier-publisher-path-extension-gate1-v1.md` + its result — 7th status `publisher_path_missing`; the concrete gap it exposed: **CFW and Invegent have zero `c.client_publish_profile` rows for youtube** (result :25, :34).
- `supabase/migrations/20260628120000_control_tower_p1_enrollment_format_mix.sql` — DB-backed format-mix enrolment (`c.client_control_tower_enrollment`) replacing the hardcoded PP-only gate; **seeded PP-only**; write RPCs / grants explicitly deferred to P2 (:1-43); `control_type` CHECK admits only `'format_mix'` (:74-75).
- `supabase/migrations/20260628000000_format_mix_enforcement_phase1.sql` — `m.build_weekly_demand_grid` / `m.materialise_slots` / `m.allocate_week_formats` (cited by line in `docs/briefs/durable-platform-support-intersection-demand-grid-gate1-v2.md:34-36`).
- `supabase/migrations/20260725223652_r3a_resolver_shadow_columns_and_resolve_final_format_v4.sql` — R3a resolver enforcement in SHADOW posture: decision written to additive columns only, `recommended_format`'s live writer unchanged until a separate R3c flip gate (:26-29).
- `docs/briefs/results/creatomate-registry-integrity-graduation-contract-v1.md` — **the authoritative 13-rung graduation ladder** (§4, :385-431) + rung-12 non-transferability (:423-427) + the no-schema-enum carry (:433-438).
- `docs/briefs/results/creatomate-template-graduation-matrix-v1.md` — live 27-row template inventory (2026-07-29): only 3 of 27 ever produced a real render (:12); rows 20-25 fenced, rows 21-24 have **no worker code path at all** (:13-14); row 5 `generic_market_insight_card_1x1_v1` PRODUCTION for PP with NDIS/CFW at `visually_approved` (:27); row 7 `generic_quote_card_1x1_v1` production-ready data-only, Invegent `visually_approved` (:29); row 19 `video_stat_reveal_9x16_v2` the live `video_short_stat` winner with a flagged 38% timeout rate (:41); row 4 the only YouTube-dim static, BLOCKED proof-required (:26).
- `docs/00_sync_state.md` v6.74–v6.87 — batch1 REJECT→repair→publish-proof→PK ruling chain (:52-55, :45-48, :36-41, :28-32); S9 arc closed, **YouTube NOT publishing-operational fleet-wide** (:24); B-roll governance applied v6.76 (:82-86) + monitoring baseline v6.79 (:59-63); readiness queue live v6.78 (:67-69); asset-graduation read model v6.87 (:9-10).
- `docs/00_action_list.md` — carries encoded below: CFW+Invegent YouTube never connected (:557), OPTION-C fork PARKED (:588), `t.platform_format_mix_default` wired into nothing / do NOT wire independently (:591), F-AIW-PREF-COL-HARDCODE = hard prerequisite before any platform preferred-format config (:592), YT queue-orphan carry (:590).
- `docs/briefs/durable-platform-support-intersection-demand-grid-gate1-v2.md` — the demand grid **never consults `platform_support`** (:28); S7 lane is design-only and sequenced third (:16, :20); `animated_text_reveal` + `animated_data` are `supported=false` on every platform they appear on (:57).
- `docs/briefs/video-broll-intake-v1-gate1-brief-v1.md` — Gate-1 ratified but execution explicitly NOT authorized (:5-7); real B-roll pool = 1 governed clip vs ratified floor 3 min / 8 target (:58-59).
- `docs/briefs/cc-0073-backgrounds-only-asset-gap-drain.md` — the Asset Gap lane and the `select_template` gate chain (:36-40).
- `docs/briefs/format-capability-indicator-v1-brief.md`, `docs/briefs/cc-0088-client-production-readiness-queue-brief-v1.md` — the two live dashboard consumers of the S5 surface.
- `docs/briefs/ndis-sensitive-real-imagery-intake-policy-v1.md` — staged NDIS real-imagery fences (Phase 2 CLOSED, Phase 3 HELD; summarised in `CLAUDE.md`).
- `CLAUDE.md` — Convention 3 risk tiers (DML/DDL ≥ T2; callers/grants/deploy/publish/secrets → T3), CCF-02 lane classification, PK hard stops.

---

## §1 · Current structural blockers (evidence-cited)

1. **Format-mix steering is single-client by data, not by code anymore — but still PP-only.** The hardcoded gate was replaced by `c.client_control_tower_enrollment`, seeded so the gate stays TRUE for PP and FALSE for everyone else (`supabase/migrations/20260628120000_...sql:16-18, 32-36`). No write RPC or enrolment API exists (:27-30 — P2 deferred), so enrolling any other brand is currently a raw governed DML act.
2. **The demand grid can allocate formats a platform cannot publish.** `m.build_weekly_demand_grid` does not consult `platform_support` at all (`durable-platform-support-intersection-demand-grid-gate1-v2.md:28`); the durable fix is a design-only S7 lane sequenced third behind cc-0079 Slice-2 proof (:16, :20). Any enrolment expansion inherits this gap.
3. **Template reachability is concentrated on PP.** Only 3 of 27 registry templates have ever produced a real render; 22 have zero render history (`creatomate-template-graduation-matrix-v1.md:12`). NDIS/CFW sit at `visually_approved` on the proven market-insight card (:27), Invegent on the quote card (:29). Broadening beyond those is "an action, not a pure data edit" — the 13 unproven statics each need a real render→draft→publish proof per client (:73-75).
4. **YouTube is not publishing-operational fleet-wide.** All five video formats classify `unsupported_silent_degrade` on YT; the text/image_quote carve-out plays no part there; "YouTube is NOT publishing-operational until Creatomate Global supplies at least one supported, selector-reachable format" (`docs/00_sync_state.md:23-24`). Separately, CFW+Invegent have no `c.client_publish_profile` youtube rows (`shared-capability-contract-classifier-publisher-path-extension-result-v1.md:25`) and were never OAuth-connected (`docs/00_action_list.md:557`); youtube-publisher also bypasses `m.post_publish_queue` entirely (`docs/00_sync_state.md:22`; carry `docs/00_action_list.md:590`).
5. **Animated formats are structurally closed at TWO layers:** `animated_text_reveal`/`animated_data` are `supported=false` on every platform in the taxonomy (`durable-...-gate1-v2.md:57`) — and even the fenced animated/video template batch (matrix rows 20-25) is deliberately fail-closed, with rows 21-24 having **no worker render path even if un-fenced** (`creatomate-template-graduation-matrix-v1.md:13-14`). PK-supplied framing: animated remains `template_missing` in the six-status vocabulary.
6. **The one live video format has a flagged reliability problem.** Row 19 (`video_short_stat` winner) carries 8✓/5⏱ renders — a 38% timeout rate flagged at classification (`creatomate-template-graduation-matrix-v1.md:41`); zero natural renders have exercised the new B-roll rotation governance yet (`docs/00_sync_state.md:60-63`), and the governed B-roll pool is 1 clip vs a ratified floor of 3 (`video-broll-intake-v1-gate1-brief-v1.md:58-59`).
7. **The Dashboard still models the six-status contract.** The classifier now returns `publisher_path_missing`, which the dashboard fail-closes to a generic "Unknown" (`...publisher-path-extension-result-v1.md:47`); the seven-state update is the named-but-unstarted next step (:53). Unavailable cells are therefore visible only degraded, and only `asset_shortage` routes to the Asset Gap lane (`docs/00_sync_state.md:68`).
8. **Selector ranking and Asset Gap demand share a tiebreak.** PK ruled (v6.84) these must be separate governed decisions and the selector-ranking packet stays UNAPPLIED (`docs/00_sync_state.md:31-32`); `task_05bf8b3d` is a standing release gate on announcement_card unattended selection (:29). Every slice below must respect both.

## §2 · Ordered capability slices (PK's six priorities)

Recommended execution order: **B1 → F → A → E → C → B2 → D** (cheapest governed wins first; heaviest code lanes last). Each slice is its own future Gate-1 lane; PK's priority letters are preserved.

- **Slice A — Generalise format-mix enrolment beyond hardcoded PP.** Enrol NDIS (strong scheduled demand — PK-supplied) and later CFW/Invegent via governed rows in `c.client_control_tower_enrollment` (data-only DML; the read function `m.format_mix_enrolled` already consumes the table — migration :19-21). Prerequisites that must be RULED, not assumed: (i) the grid's missing `platform_support` intersection (§1.2 — enrol-before-fix risks allocating unpublishable formats to a newly enrolled brand; see Open Question 3); (ii) F-AIW-PREF-COL-HARDCODE must be fixed before ANY platform-specific preferred-format config is set (`docs/00_action_list.md:592`); (iii) no wiring of the PARKED `t.platform_format_mix_default` subsystem (:588, :591). R3a resolver stays SHADOW; no R3c flip is part of this slice (`20260725223652_...sql:26-29`).
- **Slice B — Broaden reusable template assignments for NDIS Yarns, CFW, Invegent.** Two distinct parts. **B1 (data-only truth alignment):** promote client assignments where client-attributable evidence already exists — matrix marks row 5 NDIS/CFW and row 7 (incl. Invegent) as data-only moves (`creatomate-template-graduation-matrix-v1.md:27, :29, :93, :111`) — but ladder rung 12 forbids inheriting evidence across clients (:423-427), so each promotion is gated on a live per-client evidence read (db-rls-auditor handoff; the graduation-contract forward file may already have applied part of this — verify, don't assume). **B2 (new-assignment broadening):** extend additional template families to the three brands; per matrix :73-75 this requires per-client rungs 7–10 (real render → real draft → publish proof), never a status edit. NDIS template work stays inside Phase-0/Phase-1 imagery fences (`ndis-sensitive-real-imagery-intake-policy-v1.md`).
- **Slice C — Explicit governed YouTube onboarding path.** Sequence: (1) PK-side per-client OAuth connect for CFW/Invegent (first-time connect, not reconnect — `docs/00_action_list.md:557`); (2) governed creation of `c.client_publish_profile` youtube rows (clears `publisher_path_missing`); (3) a YT-supported, selector-reachable format graduated via Slice B2/D (without it, release restores 0% volume by design — `docs/00_sync_state.md:23-24`); (4) publisher-mechanics carries resolved or explicitly accepted (queue-bypass :22, orphan carry `docs/00_action_list.md:590`). Fleet-wide YT operationality is the AND of (1)-(4).
- **Slice D — Graduate animated formats from `template_missing` to selectable+proven.** Largest lift; three coordinated layers, none skippable: (i) taxonomy — flip `platform_support` for the animated formats on PK-chosen platforms (currently false everywhere, `durable-...-gate1-v2.md:57`); (ii) worker code — new render path for the listicle/quote video families (matrix :14); (iii) template graduation — un-fence rows 20-25 candidates through ALL 13 rungs (§7 below). No un-fencing before a worker path exists; no selectability before rung 10.
- **Slice E — `video_short_stat` reliability + quota/cost guardrails.** Observation-first: quantify the row-19 timeout class (`creatomate-template-graduation-matrix-v1.md:41`) against `m.post_render_log` (`credits_used`, durations, retries); let the armed B-roll monitor's first natural render land (no forced renders — `docs/00_sync_state.md:63`); define quota/cost guardrail thresholds as a design artifact; any enforcement (cron/worker change) is its own later T2/T3 lane. Feed the B-roll pool floor gap (1 vs 3) to the already-ratified intake lane WHEN PK opens it (`video-broll-intake-v1-gate1-brief-v1.md:5-7`).
- **Slice F — Make unavailable platform×format cells visible to Dashboard + Asset Gap lane.** Update `invegent-dashboard` to the seven-state contract (the named next step, `...publisher-path-extension-result-v1.md:53`), surfacing `publisher_path_missing` as its own labeled state instead of "Unknown"; keep `responsible_lane` fail-closed and `asset_shortage`→Asset Gap as the ONLY Asset Gap route (`docs/00_sync_state.md:68`); no shared-tiebreak coupling per the v6.84 decoupling ruling (:31-32).

## §3 · Coverage gained per slice (which client×platform×format cells open)

- **A:** opens no publish cell directly; converts cross-brand format-mix steering from PP-hardcoded-equivalent data to governed multi-brand data (steering quality across every already-`ready` cell of an enrolled brand).
- **B1:** aligns NDIS×{fb,ig,li}×image_quote and CFW/Invegent image_quote-family cells to truthful `production_proven` where per-client evidence exists (already selector-eligible at `visually_approved` per the `select_template` gate chain, `cc-0073-...md:39-40` — B1 is truth + graduation-state, not new eligibility).
- **B2:** each newly proven family opens {NDIS,CFW,Invegent}×{platform}×{format} cells one proof at a time — e.g. portrait 4:5, story 9:16, linkedin 1200×628 statics (matrix rows 3, 8, 9). PP carousel is already ready on FB+IG via the live legacy pipeline (PK-supplied + `docs/00_sync_state.md:54`); extending carousel to other brands rides that legacy path, NOT the unwired TMR carousel templates (v6.80 Part B verdict, :54).
- **C:** opens the youtube COLUMN: CFW×yt and Invegent×yt cells move `publisher_path_missing`→(next blocker); all four brands×yt×(first supported video format) become reachable once (3) lands.
- **D:** opens `animated_text_reveal`/`animated_data` cells on exactly the platforms PK flips in the taxonomy — currently zero.
- **E:** opens no new cell; protects the existing PP×{ig,yt}×video_short_stat cells (PK-supplied: PP IG video_short_stat is selectable through the B-roll template) from silent reliability/cost failure.
- **F:** opens no cell; makes every CLOSED cell honestly visible and routable, which is what makes the whole expansion "data-driven".

## §4 · Data-only vs code/deployment + risk tier per slice (Convention 3)

| Slice | Classification | Tier (execution lane) |
|---|---|---|
| A | Data-only DML (enrolment rows); optional P2 write-RPC = DDL, separate | Investigation T1 · enrolment apply **T3** (changes live slot materialisation for a client) |
| B1 | Data-only DML on `c.creative_template_client_assignment`/status | **T2 dark-verify → T3 at apply** (live selection state; rollback byte-exact per ladder rung 11) |
| B2 | Action lanes: real renders/drafts/publishes + data | **T3** (publish-touching) |
| C | Data (profile rows) + PK-side OAuth (secrets) + dependency on B2/D | **T3** (publish posture + secret-adjacent; Gate-1 secret-handling rider per CCF-02 R2) |
| D | Code (new worker path, EF deploy) + taxonomy data + template graduation | worker build T2 (isolated) · deploy + taxonomy flip **T3** |
| E | Observation/design T1; any guardrail enforcement later | **T1 now**; enforcement lanes T2/T3 when named |
| F | Dashboard code only (read-only surface); no DB change | **T2** |

## §5 · Dependencies and stop conditions per slice

- **A** depends on: PK ruling on grid-intersection ordering (OQ3); F-AIW-PREF-COL-HARDCODE if preferred-format config is touched. STOP: any enrolment row whose effect on `m.materialise_slots` cannot be predicted and dry-run proven; any allocation of a `platform_support=false` format to the newly enrolled brand in dry-run; any need to touch S7's design scope.
- **B1** depends on: live per-client evidence read (rung 12). STOP: evidence for a client×template is not client-attributable → that promotion is OFF the batch, never inherited; live state differs from the matrix snapshot → re-ground before any write.
- **B2** depends on: B1 truth baseline; worker mappings (only 4 templates are in `TMR_WINNER_TEXT_FIELDS` — `creatomate-global-static-graduation-batch1-gate1-brief-v1.md:30`). STOP: `task_05bf8b3d` unresolved blocks announcement_card unattended selection (`docs/00_sync_state.md:29`); any selector-ranking change = separate lane under the v6.84 ruling (:31-32); NDIS imagery beyond Phase-0/1 = hard stop (policy §phases).
- **C** depends on: PK OAuth acts; one YT-supported format from B2/D. STOP: an unfilled prerequisite is NEVER permission to proceed; profile-row creation without a supported format ships dark only, disclosed as restoring 0% volume (v6.85 precedent, `docs/00_sync_state.md:23-24`).
- **D** depends on: PK product choice of platforms/formats; new worker code proven hermetically before any un-fencing. STOP: un-fencing a template whose worker path does not exist (matrix :14); any rung skipped (§7); taxonomy flip without a named consumer-impact dry-run.
- **E** depends on: first natural B-roll render (passive — no forced renders, `docs/00_sync_state.md:63`). STOP: any guardrail that would mutate cron/worker behaviour inside this slice — that is a separate gated lane.
- **F** depends on: nothing DB-side (classifier already live). STOP: any temptation to reimplement decision logic in the dashboard (v6.78 rule: pure composition, `docs/00_sync_state.md:68`); any Asset-Gap route beyond `asset_shortage`.

## §6 · Smallest first Gate-1 packet (recommended)

**Slice B1 as a standalone data-only packet:** live-verify per-client evidence for matrix rows 5 and 7 (NDIS, CFW, Invegent), then promote ONLY the client assignments whose evidence is client-attributable, with byte-exact rollback proven pre-apply (ladder rungs 11–12), one register pointer per batch (Convention 1). Rationale: zero code, zero deploy, opens/aligns real cross-brand cells immediately, exercises the graduation ladder end-to-end at minimum blast radius, and produces the truth baseline every later slice reads. Second-smallest (parallel-safe, different repo): **Slice F** seven-state dashboard update. This recommendation is a proposal only — PK chooses at Gate 1.

## §7 · Alignment to the ratified 13-rung graduation ladder

Every slice that makes a template/format selectable maps onto `docs/briefs/results/creatomate-registry-integrity-graduation-contract-v1.md` §4 (:385-431) and never bypasses it: **B1** = rung 12 (+ rung 11 rollback proof), valid only where rungs 7–10 already hold per client — rung 12's non-transferability (:423-427) overrides the matrix's shorthand "data-only extend" wherever evidence is not client-attributed. **B2** = rungs 2–10 per client×template, then 11–13. **C** = the first YT-supported format must independently hold rungs 9–10 ON YOUTUBE for the client being opened (rung 10 is a live `select_template` call, not a status read — :415-419). **D** = full rungs 1–13 from `classified` upward, with rung 2 (field-contract compatibility) impossible until the new worker code exists. **E** = rung 13 (post-promotion health monitoring) operationalised for row 19 — the ladder itself names the 62.5%-timeout precedent as the reason this rung exists (:428-431). Carry acknowledged: the ladder's intermediate rungs have no schema enum (:433-438) — no slice may invent one without its own DDL lane.

## §8 · Naming/contract ambiguity flag for PK

There is **NO "Creatomate Global Ultimate" contract anywhere in this repo** (repo-wide case-insensitive grep: zero matches). The authoritative graduation authority is the **13-rung graduation contract**: `docs/briefs/results/creatomate-registry-integrity-graduation-contract-v1.md` §4. The nearby LANE name "Creatomate Global: Static Graduation Batch 1" (`docs/briefs/creatomate-global-static-graduation-batch1-gate1-brief-v1.md:1`) and the register's "Creatomate Global" lane-family prefix (`docs/00_sync_state.md:28, :36, :45, :52`) could be mistaken for a contract name — they are execution lanes GOVERNED BY the 13-rung contract, not contracts themselves. **PK decision needed only if** PK intended "Creatomate Global Ultimate" to name a real artifact: name it or confirm the 13-rung contract as sole ladder authority; this brief proceeds on the latter.

---

## Scope

**In scope:** docs + read-only investigation to validate §1–§8 (live reads via named `db-rls-auditor` handoffs; catalog reads via R0 `db-read.py` where a view serves); closing the Open Questions PK rules on; freezing the §6 first packet for its own Gate 1; the result doc.
**Out of scope:** ALL execution of slices A–F; anything S5 owns (seven-day evidence schedule, cap amendments); any production mutation of any kind; dashboard code; register edits beyond the closing pointer.

## Allowed actions

- Read repo docs/registers/migrations/worker source; read-only live verification through `db-rls-auditor` (and R0 views) for the claims marked "verify live".
- Author the result doc and the frozen §6 first-packet draft (as a draft for ITS own Gate 1 — not issued).
- Surface every unresolved fork to PK as a named decision.

## Forbidden actions

- **No production mutation of any kind:** no DML/DDL, no migration apply, no EF deploy, no cron/schedule change, no enrolment row, no template status/assignment/suitability/fit_status change, no `platform_support` flip, no publish, no OAuth flow, no queue/profile mutation, no un-fencing.
- **No S5 overlap:** do not touch, duplicate, or amend the seven-day evidence schedule or cap-amendment work (PK-supplied boundary).
- **`task_05bf8b3d` release gate:** announcement_card must not enter unattended automatic selection until proven fixed (`docs/00_sync_state.md:29`).
- **Selector-ranking packet stays UNAPPLIED**; selector ranking vs Asset Gap demand derivation remain separate governed decisions (v6.84 ruling, `docs/00_sync_state.md:31-32`).
- **13-rung ladder is never bypassed** for anything selectability-touching (§7).
- **PARKED/blocked items stay untouched:** cc-0078 build PARKED and cc-0080 apply hard-blocked (`docs/00_sync_state.md:504, :524`); OPTION-C / format-policy fork PARKED — do not wire `t.platform_format_mix_default` (`docs/00_action_list.md:588, :591`); S7 durable-intersection lane is design-only, sequenced third (`durable-...-gate1-v2.md:16, :20`); B-roll intake execution NOT authorized by its ratified Gate-1 (`video-broll-intake-v1-gate1-brief-v1.md:5-7`); no forced `video_short_stat`/B-roll renders (`docs/00_sync_state.md:63`); the **Track B strictly-serial queue** (S8 lever → S5 policy → S5 pilot → Slice 2 → cc-0080, awaiting "S7 GO — Slice 2 window open", `docs/briefs/cc-0079-slice-2-external-review-record-v1.md:5`) is not reordered, jumped, or absorbed by any slice in this brief — currency of the queue re-confirmed at Gate 1 (OQ4).
- **F-AIW-PREF-COL-HARDCODE:** no platform-specific preferred-format config may be set before that fix (`docs/00_action_list.md:592`).
- **NDIS imagery fences:** nothing beyond Phase-0 abstract / a separately Gate-1-opened Phase-1 person-free lane; Phase 2 CLOSED, Phase 3 HELD; unfilled specialist roles are never permission (`docs/briefs/ndis-sensitive-real-imagery-intake-policy-v1.md`; `CLAUDE.md` §NDIS).
- R3a resolver stays SHADOW — no R3c flip discussion folded in (`20260725223652_...sql:26-29`).
- No new agents; no secrets in any artifact; deploy/merge/migrate remain PK hard stops (`CLAUDE.md`).

## Success criteria

- Every "verify live" claim in §1–§3 confirmed or corrected by a named read-only handoff, with deltas recorded (matrix/live divergence explicitly listed, not silently reconciled).
- Open Questions 1–5 each carry a PK ruling or an explicit PK deferral.
- §6 first packet frozen as a draft with pinned scope, tier, rollback shape, and stop conditions — awaiting its OWN Gate 1.
- Zero production mutations; result doc written per `docs/briefs/_template_result.md`; one register pointer (Convention 1).

## Stop condition

Report result per the result template, then stop. If any live read contradicts a load-bearing claim in this brief (e.g. row-5/7 assignment states have moved), STOP that section and surface to PK before drafting the first packet on top of it.

---

## Open questions (PK)

- **OQ1 — Naming/contract:** Does "Creatomate Global Ultimate" name any intended artifact, or is the 13-rung graduation contract confirmed as the sole authoritative ladder? (Repo grep: zero matches for the phrase — see §8.) **PK decision.**
- **OQ2 — B1 evidence:** Which client×template promotions in Slice B1 actually have client-attributable evidence live today? (Verification via db-rls-auditor, not a policy call; the graduation-contract forward file may already have applied some.)
- **OQ3 — Ordering:** May Slice A enrolment (e.g. NDIS) precede the S7 durable `platform_support` intersection landing, on the strength of a per-enrolment dry-run proof, or must the durable fix land first? **PK decision.**
- **OQ4 — Track B queue currency:** The Track B strictly-serial queue hold (S8 lever → S5 policy → S5 pilot → Slice 2 → cc-0080, `docs/briefs/cc-0079-slice-2-external-review-record-v1.md:5`) is encoded in Forbidden actions. PK to confirm whether that queue is still current and whether any slice in this brief must sequence behind it (in particular Slice A, which is format-policy-adjacent). **PK decision.**
- **OQ5 — Slice C sequencing:** May CFW/Invegent youtube publish-profile rows be created dark (clearing `publisher_path_missing` while restoring 0% volume, v6.85 precedent) ahead of a YT-supported format, or does profile creation wait for the format? **PK decision.**

## Notes

- **N1 (PK-supplied facts carried, not independently repo-confirmed):** S5's seven-day evidence schedule/cap work; NDIS strong scheduled demand; "PP carousel ready on Facebook and Instagram" (consistent with the live legacy carousel pipeline, `docs/00_sync_state.md:54`, but "ready" as a classifier verdict for PP cells was not live-read by the author); "PP Instagram video_short_stat selectable through the B-roll template"; "brand kits complete across all four brands" (no contradicting evidence found; not independently verified).
- **N2:** `image_quote` production-path client-scope race carry `task_500c9698` (`docs/00_sync_state.md:55`) is adjacent to Slice B2 and should be re-checked at that slice's Gate 1.
- **N3:** service-role key rotation is still outstanding on PK's side (`docs/00_sync_state.md:24`) — relevant context for Slice C secret handling.
- **N4:** The Track B strictly-serial queue hold is recorded at `docs/briefs/cc-0079-slice-2-external-review-record-v1.md:5` (spelled "Track B", space-separated — an earlier hyphenated grep missed it). It is now encoded in Forbidden actions; its currency and its bearing on Slice A ordering are OQ4.
