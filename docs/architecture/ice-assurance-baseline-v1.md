# ICE Assurance Baseline Snapshot 2026-08-08 (Baseline v1 — dated findings)

> **This document is a dated OBSERVATION snapshot** under the durable `ice-assurance-framework-v1.md` (domains, lenses, verdict semantics, federation model, audit taxonomy, seam-audit requirement). The CURRENT inventories live here, not in the framework: the 14-internal-seam register (§2) and the agent census (§0 headline 2). Resolving findings here never obsoletes the framework; it feeds the next snapshot.

**Date:** 2026-08-08 (Sydney) · **Session type:** read-only baseline — zero code changes, zero migrations, zero deploys, zero DB mutations, zero remediation. Amended same-day with the AB-01 attribution result (`docs/briefs/results/ab01-capability-loss-attribution-v1.md`) and the D7 dashboard evidence-completion pass.
**Status:** FROZEN 2026-08-08 as **Baseline Snapshot 2026-08-08** under PK conditional-sequence ratification (final reconciliation applied; external-review chain — 9b6acdcf partial→resolved, 6bd15ed8 agree, final review pinned to the committed hashes — recorded in the lane record/commit). Register pointer: PK-owned follow-up.
**Method:** four parallel read-only evidence sweeps — (1) `ice-architecture-cartographer` (PROVEN agent, registered run) for the grounded architecture snapshot; (2) governance/audit-corpus inventory; (3) capability + data-contract evidence incl. live R0-view reads via `scripts/db-read.py` (21 read-only SELECTs, no other DB channel); (4) worker/EF surface + seam sweep. All claims below carry citations from those sweeps; live/deploy truth not verifiable read-only is marked UNKNOWN, never asserted.
**Anchors:** CE HEAD `a8f9585` · register head v6.173 (`910059d`) · prior architecture map `docs/architecture/current-ice-flow-v3.md` (2026-06-26, commit `37434fd`) — **treated as reconciliation baseline, not current truth; two of its central claims are now provably wrong** (§1.9).

---

## 0. Headline results

1. **A live production loss was found by this baseline, not by the existing assurance surface — and the same-day attribution pass (AB-01, PK-directed) both confirmed and corrected it.** Since S7/S9 enforcement went live: **242 slots terminally skipped vs 66 filled (78.6%; YouTube 93.8%)** while all 12 monitored crons read green. Attribution (`docs/briefs/results/ab01-capability-loss-attribution-v1.md`): **~47% chronic signal-pool starvation with an empty evergreen fallback** (NOT enforcement; pre-dates it; M16 fix built-not-applied) · **~29% correct enforcement** of genuinely-missing templates · **~12% FALSE capability blocks** — HeyGen/voice formats classify `unsupported_silent_degrade:format_unmapped` because the template registry models only Creatomate, so the live-proven `video_short_avatar` (136 YT publishes, 6 IG Reels) is blocked — cc-0091's defect class at a second layer · ~12% expected gates. **Causality correction:** weekly fills went 47 → 50 → 39 (≈ −20%); the initially-read "17→2/day collapse" was a normal Friday/Saturday cadence trough mis-read as a trend — materialisation is healthy and all four clients hold next-week future slots. The enforcement burst (07-29→08-03) self-terminated via S7 self-healing; steady-state skips are now almost purely supply starvation. The "skipped slots are terminal" ruling was sized against 9 slots; 242 are now permanently lost including the ~29 false blocks. Defects of this class remain invisible to the assurance surface — that demonstration stands unweakened.
2. **The assurance corpus is already dense but unfederated and partly dormant.** 14 registered agent types (11 team-table proven/registered incl. the shadow-mode apply-harness-auditor, + register-reconciler active, + 2 candidates — the framework §8 census convention), a formal Governor spec, CCF-02/CCF-04, enforcement hooks, an external-review gate — and simultaneously: two mutually-unaware finding registers (one says 0 open, the other carries ~40), a dormant audit loop (last run 2026-04-30), a four-month-stale risk register, and **no instrument at all** for the strategic, cost, and scale lenses.
3. **The evidence/observability lens is the weakest system-wide.** The capability-enforcement state (the newest and most consequential control surface) has **no read path**: `skip_reason` withheld, `blocked_by_capability` invisible, `m.post_publish` (publish truth) has no view, drift-probe rows can be 8 days stale with no freshness guard.
4. **The declared-vs-enforced and recorded-vs-actual gap is the recurring failure class**, appearing independently in: the cc-0091 registry defect, the cc-0087 migration-ledger class (which **recurred after closure** — the live S7 guard migration has no repo file), 8 deployed edge functions with no repo source, cron schedules living only in the live `cron.job` table, and systemic stale line-citations in governing packets.

---

## 1. Layer 1 / Layer 2 / Layer 3 architecture map

Node classification vocabulary (cartographer charter): `live_production` · `proven_proof_only` · `planned_not_implemented` · `carry_deferred` · `stale_uncertain`.
Full node-level citations are in the cartographer return (agent transcript, this session); the load-bearing ones are repeated here.

### D1 — Content Production Spine (L1)

| L2 subsystem | L3 components | Class | Key evidence |
|---|---|---|---|
| Ingest & pool | feed-discovery v1.2.0 · feed-intelligence v1.0.0 · email-ingest v1 · content_fetch v2.4-rpc → `f.canonical_content_body` → `m.signal_pool` | live_production | worker VERSION lines; v3 map L1 |
| | subscription-email-ingest | **stale_uncertain** | code VERSION reads `v1.0.0-disabled` (`index.ts:37`) vs live-lane records — CONFLICT |
| Demand & slotting | `m.materialise_slots` (nightly) → `m.slot` → `m.promote_slots_to_pending` → `m.fill_pending_slots` (10min) | live_production | cron jobids 72/73/75; sync v6.173 |
| | demand-grid policy (`m.build_weekly_demand_grid` + `t.platform_format_mix_default`) | live_production | **REVERSAL vs v3** (v3 classed it dormant legacy; cc-0079 Slice-2 renormalised it 2026-07-25; the IG outage propagated THROUGH it — sync:11) |
| | S7 demand-grid capability guard | live_production | applied 2026-08-01, migration `s7_demand_grid_capability_guard_v1` — **file absent from repo** (AB-04) |
| | evergreen fill path (`t.evergreen_library`) | stale_uncertain | zero rows fleet-wide, never seeded (sync:134) |
| Drafting | ai-worker v2.26.0: Format Advisor · schedule_authority_pin · S9 Layer-2 chokepoint · WS-5 stat envelope | live_production | `ai-worker/index.ts:30,182,570,793` |
| Rendering | image-worker (repo v3.38.0) · video-worker (repo v3.18.0) · heygen-worker v2.6.0 · resolve_slot_assets / select_template / select_music | live_production | deployed-vs-repo parity UNKNOWN (AB-13) |
| Approval/queue | auto-approver v1.6.0 → `m.post_publish_queue` | live_production | `auto-approver/index.ts:5` |
| Learn | insights-worker v14.5.0 · youtube-insights-worker v1.0.0 · ice-evidence-materialiser | live_production | reach figures poisoned by Meta app dev-mode (AB-08) |

### D2 — Capability & Scheduling Authority (L1) — *new domain since v3*

| L3 component | Class | Key evidence |
|---|---|---|
| `t."5.3_content_format".platform_support` (opt-in jsonb matrix) | live_production | enforced `ai-worker/index.ts:1203`; **3 values proven wrong** by cc-0091 A1 (11 ffprobe probes) |
| `classify_format_capability()` (7/8 statuses) | live_production | migration `20260728034955`; caveat: does NOT consult `platform_support` — `ready` ≠ reachable (sync:790) |
| S7 grid guard · S9 Layer-1 (`fill_pending_slots`) · S9 Layer-2 (resolver) · S9 publisher chokepoints (6 guards, 4 platforms) | live_production | full control matrix §4.2; fail-closed by construction |
| cc-0091 Gate A (registry correction + A3 drop-surface artifacts) | planned_not_implemented | Gate-A PK-approved READY TO ISSUE, NOTHING APPLIED (sync:9-13) |
| R3a universal resolver (9 shadow columns + `resolve_final_format`) | carry_deferred / **shadow partially breached** | shadow-only proven; but `final_format_authority` is now load-bearing at publish time without an R3c flip (AB-16) |
| Weekly Schedule Editor P1 `format_override` · schedule expansion v11 (111 rows) | live_production | sync:664, 403-406; text format remains un-pinned (weakest hop) |

### D3 — Creative & Asset Governance (L1)

| L3 component | Class | Key evidence |
|---|---|---|
| Creative Library v2 registry + 13-rung graduation + `select_template` ranking | live_production | **reclassified from proof-only vs v3**; governed image_quote for all 4 clients (sync:411) |
| Template library: 28 templates / 17 families | live_production | **only 1 family `active`, 15 `draft`** — the structural cause of `template_missing` skips (AB-06); zero heygen rows despite 90 heygen renders |
| WS-5 declared contracts · WS-4 PP-YT kinetic (`ready`) | live_production | sync:434, 474-476 |
| Asset Gap register + backlog + demand loop · graduation read model | live_production | action:80; sync:676 |
| Background pools + signage fences (b-roll pool 3/effective 2) | live_production | below POOL=6 floor; intake armed, not executed |
| Music Library v0: eligible pool = **1 track** | live_production | Lane 5 FROZEN pending pool of 4 → **on the critical path for IG video restoration** (AB-07) |
| 4-brand harvest corpora · music batch-2 (12 at gate) · M13 lanes 3/5 · M1 loudness | carry_deferred / proven_proof_only | sync:92-95, 61-66, 159-168 |

### D4 — Distribution & Publishing (L1)

| L3 component | Class | Key evidence |
|---|---|---|
| publisher v1.12.0 (FB) · instagram-publisher v2.6.0 · linkedin-zapier-publisher v1.4.0 · wordpress-publisher v1.0.0 | live_production | VERSION lines; wordpress outside S9 scope (PK ruling) |
| youtube-publisher v1.18.0: queue bypass · release gate · S9 guards ×2 · fail-closed pause gate | live_production | `index.ts:124-188,461,573`; deployed 1.18.0 == working tree, drift probe stale (AB-14) |
| linkedin-publisher v1.4.0 (direct) | carry_deferred | repo-only, undeployed by own header |
| Publish truth: `m.post_publish` (durable) + queue-purge trigger | live_production | "published" has **3 representations, no agreement on any platform** (AB-05) |
| `publish_status_v2` view + RPC (corrected read) | carry_deferred | authored + fully reviewed, NOT APPLIED, watch-gated (sync:39-42) |

### D5 — Observability & Health (L1)

| L3 component | Class | Key evidence |
|---|---|---|
| pipeline sentinel/diagnostician/healer/fixer · obs-observer · system-auditor | live_production | obs-observer repo-only/not deployed — sole consumer of `m.slot.format_chosen` |
| ice_ro R0 views (10) via `db-read.py` | live_production | blind-spot register §4.3; publish_status known-broken |
| drift-check v1.0.8 · tmr-drift-probe v2.1.0 | live_production | entrypoint-hash-only; probe rows can be 8d stale, no freshness guard (AB-14) |
| CGU Final 7-day watch (verdict due ~2026-08-11 20:20 Syd) | live_production | gates all production mutation |

### D6 — Governance & Orchestration (L1)

| L3 component | Class | Key evidence |
|---|---|---|
| Subagent team (12 proven/registered) + PK gates + external review bridge (`reviewed_input_hash` + triage classes) | live_production | CLAUDE.md team table |
| CCF-02 findings contract + lane classification · CCF-04 helpers (2 hook-wired) · enforcement hooks (5, two can BLOCK) | live_production | CLAUDE.md; `.claude/hooks/` |
| Governor architecture (Phase-0 spec): 2 of 5 named governors realized (branch-warden, deploy-verifier) | planned_not_implemented (3 of 5) | `governor-architecture.md` §10-11; spec not updated for deploy-verifier promotion |
| ChatGPT audit loop (`docs/audit/`): inventory/evidence/findings + severity rubric + closure SLAs | **stale_uncertain — DORMANT** | last run 2026-04-30; 2 of 5 roles ever written; closure-effectiveness 28.6% vs ≥50% target |
| Watch-expiry sitting agenda (apply wave, 9 artifact sets queued) | carry_deferred | sync:21,169 |

### D7 — Dashboard & Operator Surface (L1) — *verified FIRSTHAND at ratification (evidence-completion pass, `origin/main` = `7f0cb61`, 2026-08-07)*

| L3 component | Class | Key evidence (dashboard repo, origin/main) |
|---|---|---|
| Operator Cockpit v1 — 4 tabs + summary cards, `/cockpit` = sole ALL-CLIENTS route | live_production | `app/(dashboard)/cockpit/page.tsx`; `lib/client-url-sync.ts:36`. Published counts queue-derived with a first-class self-declared caveat (`components/cockpit/PublicationEvidenceTable.tsx:44-45`, source `actions/cockpit-evidence.ts:48-97`) |
| 15 client tabs incl. asset-gap, capability overlay, schedule editor (write), format-plan (write), production-readiness | live_production | `app/(dashboard)/clients/page.tsx:509,793,832,900,912` |
| **P-1 readiness-queue surface — register claim "DARK, zero components" is FALSE** | live_production | consumed by cockpit + clients pages and ≥6 lib/component modules (`actions/production-readiness-queue.ts:46`; `app/(dashboard)/cockpit/page.tsx:38`); residual: `lib/production-readiness-queue.ts:3` header still says backend RPC "NOT YET DEPLOYED" — stale vs CE register (RPC live 2026-07-30) |
| Slice-A contract pin `slice_a_allocation_v1` — **TWO hard-reject consumers, one a write path** | live_production | `lib/week-format-allocation.ts:145-150` + `lib/week-format-plan.ts:179-184`; a CE-side version bump breaks both |
| `/create/capability-matrix` (reads `ice_ro.template_registry_status` + `asset_governance_status`) | stale_uncertain | feature-flagged in nav (`components/sidebar.tsx:74-76`) — operator reachability depends on env flag |
| M13 Lane-4 build-pack display | proven_proof_only | confirmed only on branch `e90a469` (zero `buildpack` hits on origin/main) |

Parity note: local checkout is a feature branch (`tmr-template-intake-ui-v0`); local `main` is 11 behind `origin/main`. `b3440ec` is the **M8.2 scheduled_demand contract fix, merged into origin/main** (register shorthand "M8 panel pushed" imprecise).

### D8 — Security & Authorization (L1)

| L3 component | Class | Key evidence |
|---|---|---|
| `authz.user_role` + F-DEL-1 last-admin guard | live_production (**enforcement OFF — inert**) | activation is a separate hash-pinned T3 package (`fc7a1f87…`) |
| `exec_sql` (total-authority primitive) | live_production — **contained, not removed** | E-Q2 met at `ee02b96`; 74 worker call sites; 26 fns/74 sites census carried |
| ice_readonly / ice_ro confinement + NOLOGIN kill switch | live_production | proven 2026-07-19 (writes blocked 42501) |
| EF perimeter: 13 EFs with `verify_jwt=false` and zero in-handler auth · `PUBLISHER_API_KEY` shared across 13 EFs under 12 header names · inline secret in cron 58 · Gemini key in URL query · `linkedin-publisher` accepts `?key=` | live_production (posture) | seam sweep §3.3; AB-17 |
| M18 Creatomate key rotation + Bitwarden | live_production | storage-migration half owed |

### D9 — External Integrations (L1)

| L3 component | Class | Key evidence |
|---|---|---|
| Creatomate (render) · HeyGen (avatar; legacy API sunsets ~Oct 2026) · ElevenLabs · Jina · rss.app · Resend · Telegram · Zapier→LinkedIn · YouTube Data API · WordPress REST · GitHub · Supabase Mgmt API · Gmail | live_production | seam sweep §2.3 |
| Meta Graph via `Invegent Publisher` app | **stale_uncertain** | app Unpublished/In-Development → **all FB/IG posts invisible to the public**; transport works, audience reach broken; PK-owned, blocked on business verification (AB-08) |

### 1.9 v3-map supersession (for the next `current-ice-flow-v4.md`)

- v3 §4 "demand grid dormant/legacy, does NOT power slotting" — **wrong**; it is a live format-mix authority (revived, not retired).
- v3 §5 "Creative Library = B1-v1 PP-only single green edge" — **wrong**; governed image_quote spans all 4 clients/12 cells + governed video.
- v3 anchor versions (image-worker v3.14.1 etc.) are dozens of versions stale.
- `docs/architecture/current-ice-decision-tree.md` was flagged stale by v3 itself and is now doubly so.

---

## 2. Interface / seam map

### 2.1 Internal seams (DB-mediated — the dominant coupling style; only ONE worker→worker HTTP call exists in the fleet)

| # | Seam | Endpoints | Channel | Failure behaviour | Assurance note |
|---|---|---|---|---|---|
| S-01 | signal pool → slotting | `m.signal_pool` → materialise/fill crons | m-schema tables + pg_cron | skip_reason recorded but **not readable via R0** | AB-02 |
| S-02 | demand-mix authority | `t.platform_format_mix_default` (+S7 guard) → slot `format_preference` | table read at grid time | capability-dropped formats emit **nothing** (no drop record) | AB-01/AB-03 |
| S-03 | slot → draft | `m.slot_fill_attempt` → ai-worker | table poll (cron 5) | `COALESCE(…, 'image_quote')` default applied BEFORE capability check (4 sites) | cc-0091 A3 |
| S-04 | draft → render | `m.post_draft.recommended_format` (exact-string coupling) → image/video/heygen workers | table poll; claim RPCs atomic (`claim_pending_video_drafts` 15-min TTL) | transient-vs-terminal split; render-log write swallowed by design | — |
| S-05 | governed selection | render workers → `select_template` / `resolve_slot_assets` / `select_music` | SECDEF RPCs, service-role-only, `search_path=''` | fail-closed with reason codes; ai-worker must mirror video-worker's args exactly | — |
| S-06 | capability classification | S7/S9/dashboard → `classify_format_capability` / readiness queue | RPC | fail-closed wrapper in ai-worker (`:608-647`) | `ready`≠reachable caveat |
| S-07 | render → publish queue | auto-approver → `m.post_publish_queue` → FB/IG/LI publishers via `publisher_lock_queue_v1/v2` | queue table + enqueue cron 48 | rich backoff taxonomy; **cron 48 absent from cron_health** | AB-02 |
| S-08 | YT direct path | youtube-publisher → `m.post_draft` directly (queue bypass) | claim RPC + release gate + pause DENY-ladder + S9 guards ×2 | orphan queue rows regenerate (F-YT-QUEUE-ORPHAN-RECURRENCE) | — |
| S-09 | publish truth | publishers → `m.post_publish` (durable) + `trg_cleanup_queue_on_publish_v1` (queue purge) | insert + trigger | 3 representations of "published"; no reconciliation contract | AB-05 |
| S-10 | operator R0 read | operator/orchestrator → 10 `ice_ro` views | `db-read.py`, allowlisted, zero-prompt | blind-spot register §4.3 | AB-02 |
| S-11 | dashboard → DB | invegent-dashboard (Vercel) → RPCs + `exec_sql` server actions | supabase-js, service-role key | dashboard has authentication but **zero authorization** | AB-09 |
| S-12 | EF invocation auth | pg_cron/`net.http_post` → workers | HTTP + `x-*-key` headers (verify_jwt=false posture) | fire-and-forget: cron success ≠ EF success; 5s default timeout hazard (cc-0006 raised 3 jobs to 30s) | AB-10/AB-17 |
| S-13 | worker→worker HTTP (sole instance) | mcp-chatgpt-bridge → chatgpt-review-worker | Bearer `INTERNAL_WORKER_TOKEN` | — | — |
| S-14 | shared DB pool channel | any multi-call SQL sequence over pooled MCP path | **transactions DO NOT COMPOSE across calls** (proven: different backends/xids) | silent partial-commit hazard (the "three platforms vanish" shape) | AB-11 |

### 2.2 External seams

Creatomate `/v2/renders` + `/v1/templates` (image/video-worker, tmr-drift-probe) · HeyGen v1/v2/api2 + upload (3 EFs) · ElevenLabs TTS (video-worker prod, voice-preview) · Meta Graph v19.0 (publisher, instagram-publisher, insights-worker) · YouTube Data API (upload + read) · Zapier webhook (linkedin-zapier-publisher; synthetic IDs) · WordPress REST (custom UA required) · Anthropic (7 EFs) · OpenAI (3) · xAI (2) · Gemini (1 — **key in URL query string**) · GitHub API (5 EFs incl. drift-check tarball reads) · Supabase Management API (drift-check) · Gmail/OAuth (2) · Resend (4) · Telegram (2) · Jina (2) · rss.app (1). Full endpoint/citation table in the seam-sweep return.

### 2.3 Single points of failure (grounded)

1. **pg_cron scheduler** — ~45 jobs from one `cron.job` table; commands live ONLY in the live table (not migrations); `net.http_post` fire-and-forget so `job_run_details` records dispatch, not outcome.
2. **`SUPABASE_SERVICE_ROLE_KEY`** — runtime identity for essentially every EF; also doubles as an inbound auth credential (tmr-drift-probe).
3. **`PUBLISHER_API_KEY`** — one credential behind 12 header names across 13 EFs (rotation = fleet-wide simultaneous break risk).
4. **`exec_sql`** — 74 worker call sites + dashboard server actions; the perimeter performs no authz.
5. **Single governed video template parity point** — `B1_VIDEO_TEMPLATE_OUTPUT_PARITY` keyed to exactly one provider template id; registry is the ONLY deletion guard for 15/16 live-selectable generics (27h-outage precedent → TMR-GOV-PROVIDER-1 guard ratified).
6. **Meta `Invegent Publisher` app** — single app identity for all 4 FB pages + IG; its dev-mode status currently nullifies all FB/IG audience reach.
7. **`heygen` legacy API** — sunset ~Oct 2026; `video_short_avatar` is the only live-proven IG video format and highest-volume YT format, and is **ungoverned** (zero registry rows, zero governance rows).

---

## 3. Canonical audit lenses and their existing instruments

| Lens | Existing instrument(s) | Instrument status |
|---|---|---|
| L1 Strategic | none standing (one-off audits; D156 digests PAUSED) | **GAP** |
| L2 Architectural | ice-architecture-cartographer (generator); no conformance auditor | PARTIAL — describes, never evaluates vs target |
| L3 Technical | ef-builder lane + hermetic tests + external review; hooks | live (per-lane, not recurring) |
| L4 Flow | pipeline sentinel/healer/fixer, pipeline_health, cron_health | live but **capability-blind** (proven by AB-01) |
| L5 Capability | classify_format_capability, S7/S9, creative-graph-auditor, tmr-drift-probe | live enforcement; **no observability read path** |
| L6 Data/contract | db-rls-auditor, creative-graph-auditor, CCF-02 findings contract, m.run_system_audit() (12 invariants, weekly) | live |
| L7 Governance/authz | db-rls-auditor + security-auditor (PROVEN), advisors, sql-content-gate hook, R0 confinement | live |
| L8 Failure/recovery | deploy-verifier (PROVEN), apply-harness-auditor (SHADOW), deploy hooks, TMR-GOV-PROVIDER-1 guard; **1 runbook** | PARTIAL — thin runbooks, D165/D168 deferred |
| L9 Evidence/observability | drift-check EF, tmr-drift-probe, hash-checkpoint, EF drift log, nightly health (stale), R0 views | PARTIAL — enumerated blind spots §4.3 |
| L10 Operator truth | source-truth-check + session-bootstrap hooks, branch-warden, register-reconciler, claim-stub | live for git/register truth; **register federation missing** |
| L11 Scale/portability | none (Risk 7 in a 4-month-stale register) | **GAP** |
| L12 Cost/performance | none standing (Financial Auditor role never written; M7 cost lane unapplied; `credits_used` never vendor-populated) | **GAP** |

---

## 4. Master audit matrix

Verdicts: **P** PASS · **~** PARTIAL · **F** FAIL · **?** UNKNOWN · **–** N/A. Justifications for every non-PASS cell follow in §4.1.

| Domain \ Lens | L1 Strat | L2 Arch | L3 Tech | L4 Flow | L5 Cap | L6 Data | L7 Gov/Az | L8 Fail/Rec | L9 Evid | L10 OpTruth | L11 Scale | L12 Cost |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| D1 Spine | ~ | ~ | ~ | **F** | ~ | ~ | P | **F** | **F** | ~ | ? | ? |
| D2 Capability | ~ | ~ | ~ | **F** | ~ | **F** | P | **F** | **F** | ~ | ? | – |
| D3 Creative/Asset | ~ | P | ~ | ~ | ~ | ~ | P | ~ | P | P | ? | ? |
| D4 Distribution | ~ | ~ | ~ | ~ | ~ | **F** | ~ | ~ | **F** | **F** | ? | ? |
| D5 Observability | – | ~ | ~ | **F** | **F** | ~ | P | ~ | ~ | **F** | ? | ? |
| D6 Governance | ~ | P | P | P | – | ~ | P | ~ | ~ | ~ | ~ | ? |
| D7 Dashboard | ~ | ~ | ~ | ~ | ~ | ~ | **F** | ~ | ~ | ~ | ? | ? |
| D8 Security/Authz | ~ | ~ | ~ | – | – | ~ | ~ | ~ | P | ~ | ? | – |
| D9 External | **F** | ~ | ~ | ~ | ~ | ~ | ~ | ~ | ~ | ~ | ? | ? |

### 4.1 Cell justifications (non-PASS cells; each names the covering finding/programme item where one exists)

**D1 Spine.** Strat~: sustained output decline (~20% weekly, chronic supply starvation) contradicts volume objectives; no strategic instrument (gap L1). Arch~: map was 43 days stale with two false central claims — corrected only by this baseline (AB-19). Tech~: `image_quote` lifetime failure rate 49.4% (817/1655; post-2026-07-23 fix the rate recovered — memory-corroborated), `video_short_stat` timeouts current (2026-08-08). Flow **F**: AB-01 attributed — 78.6% of touched slots terminally lost in-window, weekly fills −20% (47→50→39); the dominant ongoing driver is chronic pool starvation + empty evergreen, not enforcement (the initially-read "17→2/day" cliff was a weekend cadence trough, corrected at attribution). Cap~: enforcement live + fail-closed; over-blocking confined to the non-Creatomate false-block class (~29 slots); the `{text}` carve-out is verified working — all 52 text skips were supply starvation. Data~: 5 of 8 format-authority concepts unrepresented (cc-0079 §2); `recommended_format` "final by accident of being last writer". Fail/Rec **F**: skipped slots TERMINAL, no re-open/backfill path (PK-ruled, but ruled against a 9-slot sizing — AB-01); slot `c1f38536` time-bound decision open. Evid **F**: skip_reason/blocked-state unobservable (AB-02). OpTruth~: cockpit live, published counts known-incomplete. Scale/Cost ?: no instrument.

**D2 Capability.** Strat~: right architecture, but unvalidated registry data drove an irreversible mix decision (cc-0091 root class). Arch~: capability predicate expressed in **three places** (consolidation carried, not done); enrolment fork is whole-client binary. Tech~: S9 Layer-2 `text` exemption lacks the `platform_support` intersection S7 has (AB-15); `preferred_format_facebook` read for all platforms (F-AIW-PREF-COL-HARDCODE). Flow **F**: the enforcement drain burst (07-29→08-03) self-terminated via S7 self-healing, but capability-dropped demand still vanishes silently at the grid (no drop records) and skipped slots stay terminal — AB-01/AB-03. Cap~: 3 registry values proven wrong, correction approved NOT applied (cc-0091 Gate A); kinetic UNPROVEN (no audio, blocked on music pool — AB-07). Data **F**: registry defect live; `format_category` NULL for all 7 video formats; A3 drop-surface artifacts NOT_APPLIED. Fail/Rec **F**: terminal skips + rollback restores future behaviour only. Evid **F**: zero drop records at both loss sites (grid CTE emits nothing; COALESCE sites unannotated) — AB-03. OpTruth~: capability panel live; readiness-queue RPC consumed by cockpit + clients surfaces (the register's "dark" claim was false — AB-27).

**D3 Creative/Asset.** Strat~: calibration coverage 16/20 templates zero-coverage (action:70). Tech~: single-template parity overlay + one-clip B-roll condition; b-roll pool below governance floor. Flow~: **15 of 17 template families `draft`** → `select_template` fail-closes → structural driver of `template_missing` skips (AB-06). Cap~: governance coverage is 5 rows / 4 formats; `video_short_avatar` entirely ungoverned despite being the IG-video-proven + YT-dominant format (AB-06). Data~: heygen path absent from template registry; 1 orphan template row. Fail/Rec~: registry is the only deletion guard (guard ratified but procedural). Scale ?: harvest corpus terminal, music pool 1.

**D4 Distribution.** Strat~: IG video mix-blocked (cc-0091); FB reach nullified (AB-08). Arch~: YT queue-bypass + wordpress exclusion are deliberate but leave a non-uniform enforcement surface. Tech~: linkedin direct publisher dead code calling `publisher_lock_queue_v2`. Flow~: FB's 12-day enqueue gap is attributed upstream (thinned demand + supply starvation, AB-01), not a publisher defect. Cap~: wordpress-publisher has **zero** capability predicate; blast radius bounded only by `approval_status` (PK-ruled exclusion, recorded). Data **F**: AB-05 (3 representations, live-proven disagreement on every platform: FB 706/39/142 · YT 0/136/0). Gov/Az~: shared `PUBLISHER_API_KEY`; `?key=` query-param acceptance. Fail/Rec~: YT orphan queue rows regenerating. Evid **F**: `publish_status` sources the queue; `m.post_publish` has NO view; fix authored NOT applied. OpTruth **F**: no single query answers "did scheduled demand publish?"; cockpit counts queue-derived.

**D5 Observability.** Arch~: Governor spec has 3 of 5 governors unbuilt (Packet, Closure, Register Generator); spec not updated for deploy-verifier promotion. Tech~: drift-probe rows lack a freshness guard — stale B-RR indistinguishable from fresh (AB-14). Flow **F** / OpTruth **F**: **all 12 crons green + a boolean `has_stuck_items` while 242 terminal losses accumulated and weekly fills declined ~20%** — the defining demonstration (AB-01/AB-02). Cap **F**: no capability read path anywhere (B-11); A3-1's `ice_ro.format_capability_drop_status` would be the first, and is Gate-B blocked. Data~: cron_health covers only 12 registered jobs; cron 48 (S9 enqueue guard) and cron 75 uncovered. Fail/Rec~: `cron.job_run_details` records dispatch not outcome (3 of 4 live defects invisible; D165 deferred). Evid~: 8 ghost EFs deployed with no repo source; 4 active cron jobs target sourceless slugs; drift-check hashes entrypoints only.

**D6 Governance.** Strat~: audit loop dormant; closure-effectiveness 28.6% vs ≥50%; D185/D186 sunsets passed unrenewed. Data~: register federation missing (AB-12); generated-summary format (§7 of Governor spec) unbuilt. Fail/Rec~: exactly 1 runbook + rollback runbook for the recorded incident classes. Evid~: 67 untracked files cited by committed docs (13 by sync_state itself); evidence-homeless class recurred (control-tower scoreboard incident); `_harness/` gitignored → cc-0087 root cause. OpTruth~: two registers contradict each other (0 vs ~40 open). Scale~: solo-founder bottleneck + ceremony cost recorded, unmeasured.

**D7 Dashboard** (firsthand at origin/main, ratification pass). Gov/Az **F — now firsthand-confirmed**: `middleware.ts` checks user existence only; `git grep` for role/RBAC symbols over app/actions/lib/components returns **zero**; only 3 of 46 `'use server'` files re-check even user existence; **60 direct `exec_sql` call sites + a generic `sql()` helper imported by 15 more modules; ~18 sites string-interpolated** (`WHERE client_id = '${clientId}'` class); **2 sites are DML** (`actions/onboarding.ts:146-168`, hand-rolled quote-doubling) — so "exec_sql is SELECT-only" is false repo-wide, and `app/(dashboard)/roadmap/page.tsx:232` displays "exec_sql eradicated" to operators against 60 live sites (AB-26). Containment branches exist but are UNMERGED (`claude/cc0046-requirerole-inert`, `claude/containment-batch-1`). Tech~ (was ?): determinable and decent — typed contracts, provenance lines, hard-reject version gates, loud-failure branches, negative-control injection tests in `tests/`. Fail/Rec~ (was ?): loud-fail branches + tests present. Data~: the `slice_a_allocation_v1` pin now has TWO hard-reject consumers incl. a write path. `next` pinned 14.2.35 exact (CVE-2025-29927 floor held).

**D8 Security/Authz.** Arch~: role model exists but inert. Tech~: 13 no-auth EFs behind `verify_jwt=false`; inline secret in cron 58 (F-CRON-AUTO-APPROVER-SECRET-INLINE); Gemini key in URL; service-role key doubling as inbound credential (AB-17). Data~: advisor residuals documented (92 mutable search_path etc. — expected posture). Gov/Az~: D-002 closed to gold standard; exec_sql contained not removed; fresh sink census MANDATORY before enforcement (carried). Evid P: D-002/RLS closure evidence is exemplary — the model the baseline should generalize. OpTruth~: `subscription-email-ingest` code-vs-register conflict.

**D9 External.** Strat **F**: Meta app dev-mode nullifies the audience value of ALL FB/IG publishing (AB-08 — the single largest product-value defect, PK-owned, blocked on business verification); HeyGen legacy sunset ~Oct 2026 with the dependent format ungoverned. Evid~: insights reach figures poisoned by the same defect. Others ~/?: single-vendor render points; `credits_used` never populated (cost blind).

### 4.2 Capability control matrix (declared vs enforced — from the capability sweep, 15 controls)

C1 platform_support filter (LIVE, `ai-worker:1203`) · C2 advisor palette confinement (LIVE, platform-blind `text` fallback) · C3 mix renormalisation (APPLIED 2026-07-25) · C4 S7 grid guard (LIVE — **migration file absent from repo**) · C5 S9 L1 fill-time (LIVE — skips TERMINAL) · C6 S9 L2 resolver (LIVE) · C7 S9 L3 render-dispatch (deliberately not built) · C8 FB/IG/LI dequeue guard (LIVE) · C9 YT guards ×2 (LIVE) · C10 auto-approver guard (LIVE) · C11 enqueue guards cron48+trigger (LIVE) · C12 wordpress (EXCLUDED by PK ruling) · C13 text carve-out (LIVE — no platform_support intersection on S9 side) · C14 drop observability (NOT_APPLIED — Gate B) · C15 AP-4 contract binding (DRAFT, awaiting Gate 1).

### 4.3 R0 view blind-spot register (verified against live output)

B-1 `cron_health`: 12 registered jobs only — cron 48/75 uncovered · B-2 `slot_status`: `skip_reason` withheld — 242 terminal skips countable, unattributable · B-3 `render_status`: error/output columns withheld — failures untriageable via R0 · B-4 `pipeline_health`: no capability/skip dimension; snapshot-log shape · B-5 `draft_status`: predates R3a/S9 — ALL format-authority columns absent; `blocked_by_capability` unobservable · B-6 `publish_status`: sources the queue, not `m.post_publish` (YT 0/136 published, IG 1/202); truth table has no view · B-7 `deploy_drift_status`: no freshness guard on `last_checked_at` · B-8 `template_registry_status`: LEFT-JOIN orphans; zero heygen rows · B-10 `music_governance_status`: `text_overlay_safe` NULL 9/9 · **B-11 (cross-cutting): the capability lens has no read path at all.**

---

## 5. Deduplicated finding register

Severity: 🔴 critical · 🟠 high · 🟡 medium · ⚪ low/recorded. "Covered by" names the existing finding/programme item — findings already fully owned elsewhere are marked (existing); genuinely new observations from this baseline are marked **(NEW)**.

| ID | Finding | Sev | Covered by / owner |
|---|---|---|---|
| AB-01 | **242 terminal slot losses in 10d (YT 93.8%) — ATTRIBUTED (same-day gated read):** ~47% chronic pool starvation + empty evergreen (`{text}`/`{image_quote}` skips fully explained here — carve-out verified working) · ~29% correct enforcement (missing `video_long_*` templates + retired `video_short` key) · **~12% false blocks: capability model blind to non-Creatomate engines** (avatar/voice `format_unmapped` despite live proof) · ~12% expected gates. Weekly fills −20% (47→50→39), not the initially-read cliff. All 242 permanently lost under the terminal-skip ruling (sized at 9) | 🔴 | Result: `docs/briefs/results/ab01-capability-loss-attribution-v1.md`. Existing: M16 fix (built, NOT applied) · AB-22 evergreen · cc-0091 Gate A/B. **NEW lane needed:** capability truth for non-Creatomate engines (option b) · terminal-skip policy revisit (option c) |
| AB-02 | The capability-block state has no observability path: `skip_reason` withheld (B-2), format-authority columns absent from `draft_status` (B-5), `pipeline_health` capability-blind (B-4), cron 48 outside `cron_health` (B-1) | 🔴 | Partially → cc-0091 A3-1 (`NOT_APPLIED`, would add the 11th view); rest **(NEW)** |
| AB-03 | Both capability loss sites record nothing: grid `capability_gated` CTE drops silently; `COALESCE(…,'image_quote')` defaults before the check at 4 sites (909/1157 fills chose image_quote in 60d) | 🔴 | cc-0091 A3 artifacts (authored, Gate-B gated) |
| AB-04 | Migration-ledger class RECURRED post-closure: `s7_demand_grid_capability_guard_v1` live with no repo file; +4 untracked migrations unverified; +6 version-mismatched files; process fix deferred undecided | 🟠 | cc-0087 residuals (§6 of its result doc) + **(NEW: recurrence evidence)** |
| AB-05 | "Published" has 3 representations with zero agreement on any platform (FB 706/39/142 · YT 0/136/0 · LI 0/6/13); `m.post_publish` has no R0 view; no reconciliation contract defined | 🟠 | cc-0079 LinkedIn/YT triage + publish-truth arc (v6.169 fix authored NOT applied) + Cockpit Task 3 |
| AB-06 | Template governance is the structural driver of `template_missing` skips: 1 of 17 families `active`; 16/20 templates zero calibration coverage; heygen path absent from the registry; `video_short_avatar` ungoverned entirely | 🟠 | intersects M13/M14 lanes + action:70 inventory; framing **(NEW)** |
| AB-07 | IG video restoration critical path runs through the music gate: kinetic lacks an audio stream (4/4), Lane 5 FROZEN pending pool=4, live eligible pool=1; batch-2 (12 tracks) at final apply gate | 🟠 | cc-0091 A1 dependency-of-record + music batch-2 + Lane 5 freeze |
| AB-08 | Meta `Invegent Publisher` app Unpublished → all FB/IG audience reach nullified across 4 pages; insights reach figures poisoned | 🔴 | (existing) cc-0091 Gate C, PK-owned, blocked on business verification |
| AB-09 | Dashboard: authentication but zero authorization; authz substrate inert; `exec_sql` total-authority primitive contained not removed; fresh sink census mandatory before enforcement | 🟠 | (existing) dashboard authz triage arc + cc-0046 Slice 0.5 + T3 activation package (hash-pinned, held) |
| AB-10 | Cron topology exists only in the live `cron.job` table (not migrations); `net.http_post` fire-and-forget → dispatch success masks EF failure (2,258-silent-failures precedent); D165 cron failure-rate monitoring still deferred | 🟠 | (existing) D165 🔲 + cc-0006 record; consolidation **(NEW)** |
| AB-11 | Pooled DB channel cannot hold transactions across calls (proven, different backends/xids) — multi-statement guards over MCP degrade to silent partial commits | 🟠 | (existing) S1 test record sync:1135; AHA check-5 targets this class |
| AB-12 | Two mutually-unaware finding registers: `docs/audit/open_findings.md` = 0 open; `00_action_list.md` ≈ 40 open F-*/SEC-*; no federation instrument exists | 🟠 | **(NEW)** — nearest owner: register-reconciler (charter reconciles docs-vs-git, not register-vs-register) |
| AB-13 | Deployed-vs-repo worker parity unverifiable read-only; repo VERSIONs exceed last register-cited deploys (image-worker 3.38.0, video-worker 3.18.0); F-INSIGHTS-DEPLOY-VERSION-DRIFT says VERSION self-report untrustworthy — want bundle-hash drift | 🟡 | (existing) F-INSIGHTS-DEPLOY-VERSION-DRIFT P3; handoff → deploy-verifier / db-rls-auditor |
| AB-14 | Drift probe silently skipped `youtube-publisher` (the most safety-critical EF) for 8 days; stale rows indistinguishable from fresh; current B-RR reading is probably a stale-probe artifact | 🟡 | **(NEW)** — instrument defect in `deploy_drift_status`/probe cycle |
| AB-15 | S9 Layer-2 `text` exemption lacks the `platform_support` intersection S7 has — a platform where text is unsupported can still reach the exemption | 🟡 | **(NEW)** — build-time re-verification named in capability sweep (D-6) |
| AB-16 | R3a shadow boundary partially breached: `final_format_authority` load-bearing at publish time with no R3c flip and no recorded posture change | 🟡 | **(NEW)** (D-11); R3a arc owner |
| AB-17 | Secret-hygiene cluster: `PUBLISHER_API_KEY` behind 12 header names/13 EFs; 13 no-auth EFs; inline secret in cron 58; Gemini key in URL query; `?key=` query param on linkedin-publisher; service-role key as inbound credential | 🟡 | partially (existing) F-CRON-AUTO-APPROVER-SECRET-INLINE; cluster consolidation **(NEW)** |
| AB-18 | 8 ghost EFs deployed with no repo source (incl. `ingest` v133 ACTIVE on cron); 3 repo-only EFs never deployed (incl. `obs-observer`, sole `format_chosen` consumer); 4 active cron jobs target sourceless slugs | 🟡 | (existing, scattered) F-CRON-INGEST-STALE + operational-defect triage portfolio; consolidation **(NEW)** |
| AB-19 | Governing-doc staleness is systemic: v3 architecture map wrong on 2 central claims; every ai-worker line citation in the S9 architecture packet stale; risk register 4 months stale; decision sunsets (D185/D186) passed unrenewed | 🟡 | **(NEW framing)**; register-reconciler + this baseline's successor |
| AB-20 | Audit loop dormant (last run 2026-04-30, 2/5 roles written, closure-effectiveness 28.6% vs ≥50%); strategic/cost/scale lenses have NO instrument; runbook coverage = 1 | 🟡 | (existing pieces: D162/D184/D186 deferrals) — gap consolidation **(NEW)** |
| AB-21 | Evidence-durability cluster: 67 untracked files cited by committed docs; 1,824-file untriaged corpus; `_harness/` gitignore as cc-0087 root cause; evidence-homeless completion claims (control-tower incident) | 🟡 | (existing) shared-checkout durability sweep `c62b971` — recommendations unexecuted |
| AB-22 | Ungoverned pieces (no governing rule exists): slot re-open/backfill after terminal failure · evergreen supply (zero rows fleet-wide) · audio loudness normalisation in the render path | 🟡 | (existing, named) cartographer `ungoverned` list; each needs a PK election |
| AB-23 | `creatomate+elevenlabs` engine label: 14 attempts 0 successes (dead since 2026-06-23); `video_short_stat` timeouts current; 24 stale YT `queued` rows from 06-24 inflate queue figures | ⚪ | **(NEW, low)** — fold into next pipeline hygiene lane |
| AB-24 | `subscription-email-ingest` VERSION says `-disabled` while registers treat it live | ⚪ | **(NEW)** → register-reconciler + deploy-state read |
| AB-25 | Latent Sunday defect: `day_of_week=0` unschedulable (`isodow` vs `dow` split now spans two functions); all 12 Sunday rows disabled | ⚪ | (existing) schedule weekend/dow truth memory + p1a header; dormant |
| AB-26 | Dashboard `exec_sql` posture worse than recorded: 2 **DML** sites via `exec_sql` (`actions/onboarding.ts:146-168`, hand-rolled escaping) falsify the repo-wide "SELECT-only" description; ~18 interpolated sites (cc-0054 class, named "unremediated" in code); `roadmap` page shows operators "exec_sql eradicated" against 60 live call sites + 15 `sql()` importers | 🟠 | (existing arc) dashboard authz triage / cc-0054; DML-via-exec_sql + false operator-facing claim **(NEW)** |
| AB-27 | Register-truth defects found by the D7 firsthand pass: "P-1 readiness queue DARK/zero components" false (≥8 consuming modules); `b3440ec` mischaracterised; stale "NOT YET DEPLOYED" header on a live RPC; `/create/capability-matrix` reachability depends on an unrecorded env flag | 🟡 | **(NEW)** → register-reconciler |

Existing open items NOT re-listed individually (already owned, register-visible): the ~40 F-*/SEC-* rows in `00_action_list.md` §Active (F-OPTIONC-ENGAGEMENT-EVIDENCE-NULL P2, F-INSIGHTS-FIX2-AGGREGATION-OWNERSHIP P2, SEC-CFW-TOKEN-ROTATION P2, etc.), cc-0091 Gate A/B/C queue, the watch-expiry sitting agenda's nine artifact sets, and the PK decision stack. This register **federates by reference**, it does not duplicate them.

---

## 6. Automated recurring vs periodic human audits

Per the Governor contract's deterministic-first rule: pure recompute → script/SQL (no LLM); classification → read-only agent; decisions → PK, never automated.

### 6.1 Automatable recurring checks (deterministic; candidates for scripts/views/crons — each would enter via its own gated lane)

| Check | Recompute | Nearest existing asset |
|---|---|---|
| Skip-rate / throughput threshold (drafts/day, skip%, per-platform fill ratio) | SQL over `m.slot`/`m.post_draft` | A3-1 drop surface (NOT_APPLIED) + `pipeline_health` extension |
| Capability drop recording + weekly drop digest | A3-1/A3-2/A3-3 artifacts as authored | cc-0091 Gate B |
| Migration ledger ⟷ `supabase/migrations/` diff | list_migrations vs git ls | cc-0087 method, one-shot → recurring |
| Deployed bundle hash ⟷ repo (all spine EFs, not entrypoint-only) | deploy-verifier logic on a cadence + freshness guard on probe rows | deploy-verifier (PROVEN) + drift-check |
| Cron coverage: `cron.job` enumeration ⟷ `cron_health` registration ⟷ repo EF dirs (ghost/orphan detector) | SQL + fs listing | seam sweep tables |
| Register federation count: open findings in `docs/audit/open_findings.md` ⟷ `00_action_list.md` F-* rows | text parse | Register Generator (specified, unbuilt — Governor §7) |
| Secret-hygiene scan: inline secrets in cron commands, query-param keys, no-auth EF handlers | grep + `cron.job` read | seam sweep §3.3 method |
| Untracked-but-cited file detector | git status ⟷ citation grep | durability sweep `c62b971` method |
| View blind-spot regression (columns the views must expose once v2 lands) | catalog read | this doc §4.3 |
| Template-family governance coverage (draft-family count, zero-coverage calibration count) | `template_registry_status` | action:70 inventory |
| Stale-citation linter for governing packets (cited file:line still matches) | grep | AB-19 |

### 6.2 Recurring agent-run audits (classification needed; existing agents, existing charters)

- `register-reconciler` — monthly + before any major arc: doc-drift classification (extend charter or pair with the federation script for register-vs-register).
- `ice-architecture-cartographer` — per-quarter or after any arc that changes the spine; its diff-vs-prior-map section is the architectural-drift detector.
- `creative-graph-auditor` — per registry change (already standing).
- `deploy-verifier` — after every PK deploy (already standing) + the periodic parity sweep above.
- `apply-harness-auditor` — per apply packet, shadow (already standing; promotion review is an open PK item).
- `dashboard-ia-lint` — per dashboard diff (candidate; needs its first real diff).

### 6.3 Periodic human/PK audits (never automated)

- **Strategic lens review** (no instrument exists; this is a PK sitting agenda item, quarterly): does the architecture still serve the product objective — e.g. AB-01's enforcement-vs-throughput trade is a strategy call, not a defect fix.
- **Risk register refresh** (`05_risks.md`, 4 months stale) + decision-sunset sweep (D185/D186 expired unrenewed).
- **Capability policy decisions**: terminal-skip recovery policy, evergreen seeding election, loudness enforcement election, wordpress capability inclusion.
- **Cost lens**: stand up or explicitly decline the Financial Auditor role; `credits_used` vendor-population question.
- **All PK gates unchanged**: approval/promotion/deploy/enforcement are never automated (CCF-02 Phase-3 posture).

---

## 7. Items needing PK attention (ranked)

1. **AB-01** — ATTRIBUTED (same-day). Decisions now on PK's desk (result doc §5): (a) apply the built M16 pool-starvation fix + evergreen election — the largest still-active bucket; (b) NEW Gate-1 lane: extend capability truth to non-Creatomate engines (stops false avatar/voice blocking; rides with cc-0091 Gate A); (c) terminal-skip policy revisit (class-scoped re-open for proven-false blocks); (d) purge the legacy `video_short` key; (e) NDIS carousel governance call; (f) cc-0091 A3 observability at Gate B.
2. **AB-08** — Meta app business verification remains the highest product-value unlock (PK-owned).
3. **AB-04** — commit the S7 guard migration file (docs-only lane) and decide the cc-0087 process fix so the class stops recurring.
4. **AB-12** — elect the register-federation instrument (script-shaped, Governor §7's Register Generator is the specified home).
5. **AB-02/AB-03** — cc-0091 Gate B (A3 artifacts) is already authored and would close the largest observability hole; it is watch-gated to ~2026-08-11.
6. Adopt this document's §6.1 list as the seed backlog for the assurance system, each item entering by its own Gate-1 brief.

---

*Provenance: agent returns (cartographer WARN verdict; three Explore sweeps) recorded in this session's transcript; 21 live reads via `scripts/db-read.py` only; no other DB channel; no file outside this document was created or modified.*
