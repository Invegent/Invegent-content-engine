# ICE Assurance Routine v1

**Status:** ACTIVE (tranche 1) — built + first run recorded + **daily cron WIRED per PK instruction 2026-08-08**: Windows scheduled task `ICE Assurance Routine v1 daily`, first trigger **2026-08-12 08:00 Sydney (after the mutation-watch expiry ~2026-08-11 20:20)**, then daily. Launcher `.claude/routines/run-assurance-routine.ps1` → `node scripts/assurance/routine-v1.mjs --daily`.

**Daily-mode contract (PK-specified):** stateless, read-only, inform-only — incapable of remediation, gating, approval, or register mutation; exit code always 0. Full check output preserved in ordinary execution logs (`_harness/assurance_routine/logs/YYYY-MM-DD-routine-v1.md` + task console log); operator attention raised ONLY for **NEW FLAG / RECOVERED / UNKNOWN** (delta vs the latest durable run record — derived from artifacts, no hidden state) via `_harness/assurance_routine/ATTENTION-latest.md` + best-effort toast; unchanged known FLAGs are listed as standing, never re-alerted. Manual mode (no `--daily`) still writes notable-run records under `docs/architecture/assurance-runs/`. **Change-triggered assurance stays OUT of the cron:** AR-04 deploy verification runs via the `deploy-verifier` agent at the deploy lifecycle event (standing post-deploy instruction), never on schedule. AR-02/03/11 join the daily run automatically the moment their check functions replace the stubs — no rewiring needed.
**Parent:** `ice-assurance-framework-v1.md` (frozen `db68f7b`) §6 — deterministic checks detect drift, agents classify, PK decides. Every check below satisfies the Governor MUST-contract: stateless · read-only · recomputes from source · idempotent · **never decides** (output is inform-only; a FLAG clears or holds nothing).
**Runner:** `scripts/assurance/routine-v1.mjs` — zero-authority; DB access exclusively via the allowlisted read-only `scripts/db-read.py` path (`ice_ro` views + world-readable catalog); everything else is local file/git reads. Fail-closed: any check error → UNKNOWN, never a fabricated OK.

## Check registry (AR-01…AR-11 = the frozen snapshot §6.1 list)

| ID | Check | Tranche | Cadence (proposed) | Source | Statuses |
|---|---|---|---|---|---|
| AR-01 | Skip-rate / throughput threshold (7d skip share; drafts 7d vs prior 7d — same-length windows to absorb weekday seasonality) | **1 built** | daily | `ice_ro.slot_status`, `ice_ro.draft_status` | OK/FLAG/UNKNOWN |
| AR-02 | Capability drop recording + digest | stub | daily | **blocked on cc-0091 A3-1 apply (Gate B)** — becomes the 11th view | STUB |
| AR-03 | Migration ledger ⟷ `supabase/migrations/` diff | stub | weekly | needs a gated ledger read or a future secret-free `ice_ro` ledger view (per the R0 coverage-gap rule: new view, never a widened allowance) | STUB |
| AR-04 | Deployed bundle-hash ⟷ repo parity + probe-freshness guard | stub | post-deploy + weekly | `deploy-verifier` agent lane (not a script — needs Management API) | STUB |
| AR-05 | Register federation count (audit register vs action-list open F-*/SEC-*) | **1 built** | weekly | local parse of the two registers | OK/FLAG/UNKNOWN |
| AR-06 | Ghost-EF detector (config.toml slugs ⟷ `supabase/functions/` dirs, vs known-accepted baseline) | **1 built** | weekly | local | OK/FLAG |
| AR-07 | Untracked-but-cited file detector (untracked `docs/**` paths cited by the two register heads) | **1 built** | weekly | local git + registers | OK/FLAG |
| AR-08 | Secret-hygiene scan (EF handlers with no inbound auth marker vs baseline; query-param key acceptance) | **1 built** | weekly | local grep of `supabase/functions/**` | OK/FLAG |
| AR-09 | R0 view blind-spot regression (view census + sensitive-column absence) | **1 built** | weekly | catalog via `db-read.py` | OK/FLAG/UNKNOWN |
| AR-10 | Template/asset/music governance coverage | **1 built** | weekly | `ice_ro.template_registry_status` / `asset_governance_status` / `music_governance_status` | OK/FLAG/UNKNOWN |
| AR-11 | Stale-citation lint for governing packets (cited `file:line` still resolves) | stub | monthly | local | STUB |

**Baselines:** AR-06/AR-08 compare against the accepted state frozen in Baseline Snapshot 2026-08-08 (AB-17/AB-18) so standing known findings do not re-FLAG every run; only NEW entrants FLAG. Baseline lists live in the runner header and change only with a snapshot update.
**Escalation:** FLAG → orchestrator triage per framework §6 (agent classification where ambiguous; material/critical → PK). UNKNOWN is fail-closed and reported, never suppressed.
**Run records:** `docs/architecture/assurance-runs/YYYY-MM-DD-routine-v1.md` (first: 2026-08-08).
**Not in v1:** any hook/cron wiring · any write path · any gate authority · dashboard surface (the framework §7 coverage ledger render is a later, PK-gated lane).
