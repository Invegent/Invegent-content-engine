# ICE Knowledge Capture & Authority Promotion Audit (read-only evidence capture)

**Date:** 2026-06-11 Sydney
**Session role:** CCH (read-only discovery + doc commit)
**Status of this document:** SESSION EVIDENCE — not authority. No authoritative current-state doc exists yet (that absence is this audit's finding). The seven-point recommendation in §9 is a **proposed v3.35 governance proposal**, NOT an applied process change.
**Companion documents:** `2026-06-11-content-decision-trace-audit.md` (`6fd5f4d`), `2026-06-11-slot-level-decision-tree-decomposition.md` (`b74c8e50`), and the in-chat documentation authority audit of 2026-06-11 (not separately committed; its findings are folded in here).
**Walls honoured:** docs-only · 0 production mutation · 0 DB write · 0 D-01 · 0 deploy · 0 provider call · 0 cron change. All discovery read-only (repo listings + `cron.job` read).

## Core question

When ICE learns something important — from cron jobs, Cowork jobs, CCH/CCD/ChatGPT sessions, runtime reports, deploys, incidents, or audits — how is that knowledge captured, where does it live, and how does it become authoritative?

## 1 — Executive verdict

**ICE has a strong knowledge-CAPTURE system and no knowledge-PROMOTION system.** Capture is disciplined and multi-layered — session docs, run markers, version banners, carries, DB registers, 69 cron jobs emitting evidence. Promotion to authority is **absent as a rule and ad hoc in practice**: no job, no protocol step, and no owner moves verified findings from evidence into the documents the repo designates as authoritative.

The chain: **Discovery → Evidence works. Evidence → Decision works. Decision → Authoritative Documentation is broken.**

The gap was masked by the "trust the DB" escape valve in `00_docs_index.md` and by CCH memory + `00_sync_state.md` carrying current truth for returning operators while the authority tier silently fossilised at the March-2026 (digest-era) architecture.

## 2 — Knowledge capture map

| Mechanism | Trigger | Writes to | Captures | Owner | Authority level | Notes |
|---|---|---|---|---|---|---|
| Session docs | CCH session close | `docs/runtime/sessions/` | evidence, decisions, findings | CCH | Evidence | Disciplined since G1; unindexed |
| Run/handover markers | overnight Cowork close | `docs/runtime/runs/` (55 files: no-ready-briefs near-daily, deploy/run records, column-purpose runs) | facts, state | Cowork/CCD | Runtime marker | Markers only; no read-back path |
| Nightly health check | Cowork 02:00 AEST | `docs/audit/health/{date}.md` | pipeline facts | Cowork | Evidence | Emits, never promotes |
| `00_sync_state.md` banners | version cycle close | sync_state | decisions + state deltas | CCH (CCD for size) | Operational register | Changelog, not explainer |
| `00_action_list.md` carries | findings | action_list | tasks, gates | CCH/CCD | Action register | Tasks, not truth |
| D-01 reviews | pre-mutation | `m.chatgpt_review` | decision evidence | bridge | Evidence (DB) | Close-the-loop disciplined |
| Friction register | shaft emissions | `friction.*` | operational cases | DB | Evidence (DB) | Backlog-not-log; 1 emission rule enabled |
| Drift/health/audit crons | schedules | `m.ef_*`, `m.system_audit_log`, health snapshots, `k.*` catalog | runtime facts | pg_cron | Evidence (DB) | 69 jobs; zero write docs |
| Briefs + results | build cycles | `docs/briefs/`, `docs/briefs/results/` | intent + outcomes | CCH→CCD | Evidence | ICE-PROC-001 routes patches |
| CCH memory | per session | Anthropic memory | working truth | CCH | **Unofficial authority** | Recency-biased; invisible to the repo and to any non-CCH reader |
| Column-purpose runs | one-off sessions | `runtime/runs/*-purposes-*` | schema semantics | CCH | Evidence | Valuable; fully buried |

## 3 — Knowledge promotion map

| Path | Classification |
|---|---|
| Runtime event → session note | **Manual but disciplined** (session protocol) |
| Session note → sync_state banner | **Manual but disciplined — impaired**: >80KB registers force CCD routing (v3.34 spec `b77f4f98` pending is the live example) |
| Finding → action_list carry | **Manual but disciplined** — same impairment |
| Audit evidence → architecture doc | **ABSENT** — no rule, no owner; one accidental success (Stage-0 `build-specs/asset-policy-stage0/`, promoted only because the gate process demanded a spec folder + index entry) |
| Architecture change → docs index | **Manual and ad hoc** — index updated 2026-06-08 for OBS yet omits 13 directories (incl. `runtime/`, `concepts/`) and three `00_` files (`00_action_list.md`, `00_session_state.md`, `00_tools_register.md`) |
| Closed carry → historical record | **Manual but disciplined** (closure budget, archive headers) |
| Deploy/runtime fact → current authority | **ABSENT** for docs — drift-check covers EF versions only, and its register is itself stale (youtube-publisher row) |

## 4 — Authority map (tiers)

- **T1 Authoritative current state:** EMPTY for architecture/pipeline. Nothing in the repo accurately and discoverably explains how ICE works today.
- **T2 Operational state register:** `00_sync_state.md`.
- **T3 Action/carry register:** `00_action_list.md`, `00_session_state.md`, `00_tools_register.md`.
- **T4 Session evidence:** `runtime/sessions/`, `runtime/runs/`, `audit/health/`, `briefs/` + `briefs/results/`, `m.chatgpt_review`, `friction.*`.
- **T5 Historical design:** `03_blueprint.md` (pipeline flow + four agents), `01_README.md`, `02_scope.md`, `04_phases.md`, `concepts/ice-pipeline-operating-model.md` (digest-era halves; "slots have no backing table" now false).
- **T6 Strategy/reference:** `07–11`, `15`, `20–23`.
- **T7 Runtime marker:** no-ready-briefs markers, heartbeats, health snapshots.
- **T8 Stale/misleading:** `03_blueprint.md`'s pipeline sections *as marked 🟢 living by the index*, `01_README.md` status block, `04_phases.md` "YOU ARE HERE", the index's authority designations themselves.

Key principle confirmed by the evidence: **a file being "living" does not make it authoritative.** `03_blueprint.md` is living-by-label and wrong-by-content on the decision tree (digest chain; no `m.slot`, no fill, no format advisor, no render layer, no YT/IG/website publishers).

## 5 — Automated jobs and overnight jobs

`cron.job` register read live: **69 jobs (66 active)**. Knowledge-relevant emitters: `drift-check-daily-fire` (EF register), `pipeline-health-snapshot-30m`, `ice-system-audit-weekly` (`m.system_audit_log`), `friction-verification-daily`, `k-schema-refresh-weekly` (data catalog), `pipeline-doctor-log-harvester`, `pipeline-ai-summary-hourly`, `weekly-manager-report`, `external-reviewer-digest-weekly`, `client-weekly-summary`. Cowork adds: nightly health doc, run markers, weekly Monday reconciliation (registers/roadmap only).

**Finding: automated jobs exclusively emit evidence. Zero automated paths promote anything into documentation authority, and no job detects documentation drift** — drift-check watches EF versions; nothing watches whether the designated architecture doc still describes the system.

Bonus finding: `digest-selector-every-30m` still fires every 30 minutes feeding the dead digest path — the cron register quietly maintains the superseded architecture. (Observation only; any change is gated.)

## 6 — Chat/session capture (F)

Committed: session close docs (`runtime/sessions/`), run markers, briefs/results, audit reports. Chat-only: intermediate analysis, and at least one full audit (the 2026-06-11 documentation authority audit existed only in conversation until folded into this document). What decides whether a session becomes a doc: PK directive or CCH judgment — no written rule. Session docs are NOT indexed, are promoted into `00_` files only via the manual banner cycle, are NEVER promoted into architecture docs, and there is NO promotion checklist.

## 7 — Five examples traced (discovery → evidence → promotion)

1. **v3.34 content decision trace audit:** session doc `6fd5f4d` → registers *pending CCD* (`b77f4f98`) → architecture: never → index: never. Discoverable only via the sync_state banner once CCD applies.
2. **Slot-level decomposition `b74c8e50`:** session doc only; 4 carries proposed in-doc (queued v3.35); registers not yet; architecture/index never.
3. **Documentation authority audit (2026-06-11):** was **chat-only — zero repo capture** until this document. The finding that authority is broken was itself unpromoted.
4. **HeyGen telemetry:** code (v2.1.0/v2.1.1) + DB register + `m.post_render_log` evidence + carry → closure pending v3.34. The render layer **does not exist in any authority-tier doc** — `03_blueprint.md` predates it entirely.
5. **A2 / format-narrative findings:** fragmented across ≥3 sync_state banners + an amended carry + two session docs. The most consequential architectural fact of the quarter — *the format advisor is the live decision-maker; the YouTube format is hardcoded in `m.materialise_slots`* — has no home a reviewer would find.
6. *(Contrast — promotion working)* **Stage-0/OBS:** `build-specs/asset-policy-stage0/` + index entry updated 2026-06-08 — promoted because the gated process required it. Proof the org promotes when a process step demands it, and only then.

## 8 — Failure-mode causal chain (G) and risk

(1) The March-era index crowned `03_blueprint.md` as living authority → (2) the slot rebuild landed through briefs + sync_state banners with **no rule requiring authority-doc updates**, so the blueprint was never touched → (3) the `00_` files grew into append-only changelogs past 80KB, stripping CCH of direct register edits and adding CCD latency to every promotion → (4) session docs became de-facto truth but the index never learned `runtime/` exists → (5) the index's "trust the DB" valve removed the pain signal that would have forced repair → (6) with no owner and no detector, drift compounded silently.

**Risk:** a new operator, a fresh CCH instance after memory loss, or an external reviewer reconstructs ICE from the blueprint and confidently operates the wrong system. This amplifies the solo-founder bottleneck (Risk 6 in `05_risks.md`): current truth lives in one person plus one model's memory.

## 9 — Recommendation — PROPOSED v3.35 governance proposal (not applied)

A promotion system, not more docs:

1. **One T1 doc:** `docs/architecture/current-ice-decision-tree.md` — what ICE is; current production pipeline; current decision tree; decision ownership table; known gaps; links to evidence reports; mandatory `last_verified` date; update rules. CCD-owned for size.
2. **Authority section in `00_docs_index.md`:** explicit T1 list (≤4 files); all other docs labelled by tier; demote `03_blueprint.md`'s pipeline sections to 🟡 snapshot with a pointer to T1.
3. **Promotion rule (smallest fix; repairs the chain):** every session completion report MUST end with one of two lines — *"Authority impact: none"* or *"Authority impact: patch queued → {file}"* — same standing as the walls confirmation.
4. **Session-doc rule:** standard header "EVIDENCE — not authority; current state lives at {T1 doc}"; evidence older than 30 days is never cited as current state.
5. **Action-list rule:** carries are tasks; truth-of-record lands in T1, never in a carry.
6. **Authority drift rule:** add one line to the monthly checklist in `05_risks.md` — "T1 `last_verified` < 30 days old?" — and have the Monday Cowork reconciliation flag breaches automatically.
7. **CCD ownership formalised** for all >80KB authority/register files; CCH authors patch specs (the v3.34 `b77f4f98` pattern, made standing).

## 10 — Final question — answered

Does ICE have a reliable path from Discovery → Evidence → Decision → Authoritative Documentation? **No.** Discovery → Evidence is reliable; Evidence → Decision is reliable (D-01 + PK gates); **Decision → Authoritative Documentation does not exist.** The break sits precisely between "PK approved the finding" and "any document a stranger would read reflects it." Smallest governance fix: **rule 3 + rule 2** — a mandatory authority-impact line in every completion report, and a T1 section in the index so the line has somewhere to point. The T1 doc is then built once and kept alive by the rule.

---

*Evidence base: full docs-tree listing (56 entries), `00_docs_index.md` (b539020a), `concepts/ice-pipeline-operating-model.md` (199127c5), `docs/runtime/` + `runs/` listings (55 markers), `docs/cowork/tasks/`, live `cron.job` read (69 jobs), founding docs 01–07, and the two 2026-06-11 evidence reports. All read-only.*
