# 2026-06-08 Sydney — OBS Stage 0 foundation + read-only diagnostic + HeyGen telemetry D-01

**Session window:** 2026-06-07 ~08:00 UTC → 2026-06-08 ~16:00 UTC (consolidated multi-turn arc; Sydney AEST).
**Headline:** Applied the isolated OBS Stage 0 foundation, then challenged + diagnosed the asset-policy question read-only (recommendation C — hold 0A), and prepared + D-01'd a HeyGen render-telemetry EF patch (undeployed).
**Outcome:** OBS Stage 0 foundation COMPLETE but dormant (0A/read-path BLOCKED); `heygen-worker v2.1.0` committed undeployed with D-01 `0d9bb255` OPEN/escalated awaiting PK exact-phrase approval. Production `mbkmaxqhsohbtwsqolns` schema untouched.

---

## Stages / work units this session

### Stage 1 — OBS Stage 0 foundation (isolated project)

#### D-01
- review_id: `fd3e519a-17d0-45eb-94a9-cab27a407612`
- action_type: `sql_destructive`
- verdict / risk / confidence: partial / medium / medium
- routing: escalate_explicit_flag
- **L46 classification:** GENERIC-NON-BLOCKING (type-b/c — pushback echoed CCH's own declared `known_weak_evidence`; `verified_claims` confirmed additive-only + production-not-affected)
- PK approval phrase: "PK APPROVES OBS STAGE 0 FOUNDATION MUTATION on invegent-obs-stage0" (exact phrase given)

#### Apply
- Mechanism: `apply_migration` (by CCD, against the ISOLATED OBS project ref — NOT the production-bound CCH MCP)
- Migration name: `obs_stage0_observation_foundation`
- Target: `invegent-obs-stage0` (ap-northeast-2) ONLY
- Result: success. OBS now holds: schema `obs`; evidence_class/stage/population/eligibility enums; append-only `obs.observation` (idempotency key `(post_draft_id, observer_version, stage)`; per-cell evidence_class+stage enforced via `obs.value_cells_valid()`; provenance cols; append-only trigger; indexes incl. idempotency unique + GIN on value_cells). Note: applied schema differs in detail from the CCH draft (no `row_evidence_class` column; validation via `value_cells_valid()`) — corrected in action-list row via commit `8fa800e5`.

#### Post-mutation truth check
Production `mbkmaxqhsohbtwsqolns` re-checked post-apply: **no `obs` schema, no `obs.observation`** — isolation held.

#### Close-the-loop
- `m.chatgpt_review` row `fd3e519a` resolved via `public.close_chatgpt_review`: `status='completed'`, `resolved_by='PK (exact-phrase approval) + CCD (applied to invegent-obs-stage0 only)'`, `escalation_resolved_at=2026-06-08 05:07:04 UTC`.

### Stage 2 — Stage 0 value challenge + read-only diagnostic (NO build)
- Value challenge concluded **C** (hold 0A; foundation dormant; highest-value next work = source-side telemetry).
- Read-only diagnostic (Q1/Q3/Q5/Q7) executed against production and persisted at `docs/build-specs/asset-policy-stage0/06_stage0_readonly_diagnostic_2026-06-08.md` (commit `f5c00e04`; README cross-ref `4bd5bd25`).
- Key findings: **YouTube is NOT 100% avatar** — realized published avatar ≈19.7% vs intended 10%; advisor overrides the hard-coded avatar slot default ~76% (this corrects a prior working assumption). `client_format_config` is **not enforced** as a live gate (CFW + Invegent publish with zero config rows; NY/PP publish avatar absent from config). Pipeline health: ai_job 98.9% success; queue/render healthy; render log Creatomate-only (HeyGen renders unlogged). Residual gaps (HeyGen cost, per-destination realized format, point-in-time provenance) are **source-instrumentation gaps, not observer-read gaps** → reduced 0A not currently justified.

### Stage 3 — HeyGen render telemetry patch + D-01 (NO deploy)
- Read-only plan concluded: code-only, NO schema change; reuse engine-agnostic `public.write_render_log`.
- Patch committed: `supabase/functions/heygen-worker/index.ts` → **v2.1.0**, commit `690a295b9d936b6a92992821fd8db286031221e0` (undeployed). Best-effort, idempotent (per `post_draft_id`+`render_engine='heygen'`+`provider_job_id`), non-fatal; logs terminal outcomes (succeeded/failed/timeout) into `m.post_render_log`; `credits_used=null`; no new HeyGen calls; no secrets.

#### D-01
- review_id: `0d9bb255-7dce-43bf-865f-5ee2eb300c5f`
- action_type: `ef_deploy`
- verdict / risk / confidence: partial / medium / medium
- routing: escalate_explicit_flag
- **L46 classification:** GENERIC-NON-BLOCKING (type-b/c — echoed CCH's declared caveats; `verified_claims` confirmed engine-agnostic RPC, FK target, column-consistency). `corrected_action` already folded into CCD pre-deploy checklist; no code change required.
- PK approval phrase: **NOT YET GIVEN** — review OPEN/escalated; deploy BLOCKED.

#### Apply / Close-the-loop
- **None.** No deploy. `0d9bb255` remains `status='escalated'`, `resolved_by=null` — deliberately NOT closed (awaiting PK decision).

---

## GENERIC-NON-BLOCKING log (L46)

| review_id | action_type | Missing field(s) | Reviewer text (abbrev) | Rationale |
|---|---|---|---|---|
| `fd3e519a` | sql_destructive | no new defect/evidence | "assumptions about system behaviour require human judgment" | Echoed CCH's own `known_weak_evidence` (isolation unverifiable-by-design). Resolved by PK approval. |
| `0d9bb255` | ef_deploy | no new defect/evidence | "deployment readiness involves significant assumptions… require human judgment" | Echoed CCH's declared caveats (guard/lifecycle reasoned-not-run; consumer scan deferred to CCD). Routed to PK; OPEN. |

**Override trigger watch:** two consecutive GNB classifications on the asset-policy/OBS+telemetry programme. These are distinct actions (sql_destructive vs ef_deploy), not the same action re-fired, so the third-fire-needs-PK rule is not triggered. Note for next session.

---

## Production mutations this session

1. `apply_migration obs_stage0_observation_foundation` — 2026-06-08 — applied by CCD to the **isolated** OBS project `invegent-obs-stage0` ONLY; **production not touched**.
2. `public.close_chatgpt_review(fd3e519a, …, 'completed')` — 2026-06-08 05:07:04 UTC — close-the-loop write to `m.chatgpt_review` (the only production-data write this arc).

**No production schema mutation to `mbkmaxqhsohbtwsqolns`. No EF deploy (heygen-worker v2.1.0 committed, undeployed). No OBS observer / read-path / CDC / 0A / 0B. No env / Vault / secret change. No cron change.**

---

## Truth Check (session close)

| Check | Result | Mismatch? |
|---|---|---|
| Open review rows this session | `fd3e519a` completed; `0d9bb255` escalated/OPEN | no |
| Latest result/diagnostic pointer | `docs/build-specs/asset-policy-stage0/06_stage0_readonly_diagnostic_2026-06-08.md` (commit `f5c00e04`) | no |
| `origin/main` HEAD | `7eaede9ba97e4e66318615cd1868d9b9c4cda6ff` | no |
| OBS observer/runtime in code | none (48 EFs scanned; no obs observer) | no |
| `00_sync_state.md` / `00_action_list.md` deltas | OBS row already updated (`49bb156f`/`8fa800e5`); this session adds: HeyGen telemetry row + OBS diagnostic-C nuance — **routed to CCD surgical str_replace (>80 KB)** | pending CCD |

**Mismatch declarations:** none. The only pending sync deltas are the two large-`00_` patches, which are CCD's lane (below).

---

## Lessons captured this session

- **L (vindicated)** — Read-only diagnosis can fully answer a "does reality diverge from intent" question without building an observer; challenge the build before building it. OBS 0A was correctly held.
- **L (vindicated)** — "Realized output" must be measured from publish/render records, not from the slot-default layer: the "YouTube 100% avatar" assumption was a slot-layer artefact; realized output diverges because the advisor re-decides (~76% override).
- **L (vindicated)** — `>80 KB 00_` files never full-re-emitted from CCH; routed to CCD surgical str_replace every time this arc.

---

## Follow-up findings opened

### F-HEYGEN-RENDER-TELEMETRY
**Status:** OPEN — Severity P3. Patch committed (`690a295b`, v2.1.0) but undeployed; D-01 `0d9bb255` OPEN awaiting PK exact-phrase approval + CCD pre-deploy checks. Closes the HeyGen-renders-invisible-in-`post_render_log` gap when deployed.
**Surfaced at:** `docs/00_action_list.md` (HeyGen telemetry row — pending CCD patch); this session file.

### Source-instrumentation backlog (from diagnostic)
**Status:** OPEN — candidates, not scheduled. (1) HeyGen render telemetry (above, in flight). (2) Publisher realized-format write to `post_publish`. (3) Fill-time policy-input snapshot on the draft. Each its own gated plan → D-01 → PK approval.

---

## State at session close

- OBS Stage 0 foundation COMPLETE, isolated, dormant; 0A observer/read-path BLOCKED (needs fresh plan + new D-01 + PK approval).
- `heygen-worker` v2.1.0 committed (`690a295b`), **undeployed**; D-01 `0d9bb255` OPEN/escalated; CCD blocked pending PK approval.
- Production `mbkmaxqhsohbtwsqolns`: unchanged except the `m.chatgpt_review` close-the-loop row for `fd3e519a`.
- 4-way sync commits: per-session file (this) + sync_state + action_list deltas → **the two large-`00_` deltas are CCD surgical str_replace (see patches below in chat)**; dashboard roadmap N/A (internal infra); memory = background.

**Next major work:** PK decision on `0d9bb255` (approve → CCD pre-deploy checks + CLI deploy heygen-worker v2.1.0 → verify → close loop). OBS 0A remains held per diagnostic recommendation C.
