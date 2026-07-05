# Brief cc-NNNN — creatomate-provider-reconciliation-v0

**Created:** 2026-07-05 Sydney
**Author:** chat (drafted by brief-author v1, CANDIDATE — proving run; PK gate 1 unchanged)
**Executor:** Claude Code (orchestrator + subagents per leg; PK at every gate)
**Status:** draft
**Result file:** `docs/briefs/results/cc-NNNN-creatomate-provider-reconciliation-v0.md` (created on completion)

---

## Task

Run a read-only, three-leg reconciliation of every Creatomate template reference ICE holds — static repo references (Leg 1), Supabase TMR registry truth (Leg 2), and live Creatomate provider truth (Leg 3, GET/list only) — and join them into a coverage matrix, gap findings, and a **standing pre-cleanup guard checklist** for PK ratification. This lane executes the recorded incident carry "provider-side deletion guard (template-inventory audit vs live constants before any Creatomate cleanup)" (`docs/briefs/option-d-tmr-live-b1-slice-packet.md` §5; `docs/briefs/results/option-d-tmr-live-b1-result.md` §5.4), born from the 2026-07-04 outage in which the legacy B1 production template `fb9820f8…` was deleted provider-side during a template cleanup and PP image_quote production went down (packet §1). Classification: **SAFETY_GATE side lane**, PK-approved in design 2026-07-05. **Pause rule: the Property Pulse D6 publish proof outranks this lane** — D6 (`production_proven` recording after publish evidence, publish expected Monday ~21:30Z) is the next PK gate on the Option D lane (packet §3 D6; result §5.1; `docs/00_sync_state.md` v4.95 "next gates"). This lane is PK-fixed in design: three legs, existing proven capabilities only — explicitly **no new agent, no extension of `ice-architecture-cartographer`, no tool additions to it** (PK design statement, 2026-07-05; charter toolset `.claude/agents/ice-architecture-cartographer.md:4`).

## Source context

- `docs/briefs/option-d-tmr-live-b1-slice-packet.md` — §1 incident (fb9820f8 deleted from the Default Project, ~2026-07-02/03; "one account, two projects"); §2 discovery that the live PP winner is `generic_market_insight_card_1x1_v1` (48cba556…); §3 D6; §5 incident carries incl. this lane's deliverable + `CREATOMATE_GENERICS_API_KEY` secret-split carry.
- `docs/briefs/results/option-d-tmr-live-b1-result.md` — §5 carries (D6 pending; "known-degraded opt-in branches (manual_render/draft_proof/template_smoke still reference deleted templates)"); §6 boundaries held (registry statuses untouched, D6 pending).
- `docs/00_sync_state.md` (v4.95 entry, line 9) — current truth: Option D deployed + live-proven; pending gates D6 · S1 hourly cron (D-01) · register commit.
- `docs/00_action_list.md` (TMR queue table, lines 104–115) — item 5: 5 background intake candidates remain fenced; promotion coupling hazard recorded.
- `.claude/agents/ice-architecture-cartographer.md` — Leg 1 owner: PROVEN read-only cartographer, `Read`/`Grep`/`Glob` only (lines 3–4, 9–18), never verifies live truth (lines 40–42), dashboard-repo docs already in its input base (lines 63–65).
- `CLAUDE.md` — team table (`db-rls-auditor` read-only, may run SELECT/catalog reads, may NOT DML/DDL/deploy); external-review gate rules; docs-lane conventions.
- **Known static reference sites (Leg 1 starting ground — a floor, not the ceiling; the sweep must find what this list misses):**
  - `supabase/functions/image-worker/manual_render.ts:33-43` — `PP_NEWS_STATIC_16x9` → provider `48cba556-0a53-4001-90f0-05420d10efc0` (16:9); `:52-62` — `NEWS_STATIC_CENTERED_SCRIM_1x1` → provider `fb9820f8-3fee-4448-b324-3d500fa74b40` (deleted).
  - `supabase/functions/image-worker/tmr_smoke.ts:46-47` — `TMR_SMOKE_TEMPLATE_ID = 490ad9ea-7473-49e4-9d3c-e1ae8a12d790` (`news_quote_insight_1x1_v1`).
  - `supabase/functions/image-worker/b1_production.ts:152` — `TMR_WINNER_TEXT_FIELDS` (D1 allowlist; provider IDs arrive at runtime from `select_template`, not hardcoded — `b1_production.ts:220-222` fails closed on a missing `provider_template_id`); test pin `b1_production_test.ts:170` (`WINNER_PROVIDER_ID = 48cba556…`).
  - `supabase/functions/image-worker/index.ts:553` — `template_smoke` branch `TEMPLATE_ID = '48cba556…'`; `index.ts:4` (header comment: fb9820f8 DELETED); `index.ts:37` (manual_render 1:1 branch will fail — known-degraded); `index.ts:62,543` (tmr_template_smoke renders 490ad9ea); `index.ts:274` + `branch_b_proof.ts:16-17` (`creative_library_draft_proof` branch).
  - `supabase/functions/image-worker/creative_contract.ts:132` AND `supabase/functions/ai-worker/creative_contract.ts:132` — both vendored contract copies pin `fb9820f8…`.
  - `docs/creative-library/property-pulse.json:189,229,273,330` + `docs/creative-library/property-pulse-template-family-news-v1.md:60` + `docs/creative-library/format-variant-intake-pp-image-quote-pilot-v1.md:71,214` — declarative-registry references to all three IDs.
  - `supabase/functions/video-worker/template_smoke.ts:64` — video path is Creatomate **composition/direct-source** (`provider: 'creatomate'`, no stored template ID found by this draft's grep) — grounds the static-vs-video gap map; the sweep must confirm or refute "no video template IDs" itself.
  - Test files carrying IDs: `manual_render_test.ts:65,81,100` · `template_smoke_test.ts:8,46` · `creative_contract_test.ts:76,82` (image-worker) · `creative_contract_test.ts:82` (ai-worker).
- **Leg 2 registry objects:** schema `c` TMR registry — `c.creative_provider_template` + fields/variants/proofs/assignments, created/extended by `supabase/migrations/20260630042316_tmr3_template_metadata_registry.sql`, `20260702111455_…`, `20260702124329_…`; 16 generic templates all `visually_approved`/selectable + the Lane-0 B1 client-scoped capture (`docs/00_sync_state.md` v4.89 entry: "selectable==16 … the Lane-0 B1 client assignment would inflate to 17").
- `_harness/option-d-production-proven-recording.sql` — exists (verified); **untouchable D6 artifact**.

## Scope

**In scope:** (1) Leg 1 — static sweep of THIS repo (`Invegent-content-engine`) for every Creatomate template-ID / template-constant reference: worker source + tests, vendored contracts, `docs/creative-library/**`, docs/briefs, `_harness/**`; each reference cited `path:line` with the ID, the asserted identity/format, and the consuming branch. (2) Leg 2 — read-only registry matrix from schema `c` (provider templates, fields, statuses, client assignments, proof/approval state). (3) Leg 3 — orchestrator-only GET/list calls to the Creatomate API: template ids, names, dimensions, metadata; nothing else. (4) Join — coverage matrix (every ID × {repo refs, registry row, provider row}) · stale/deleted-reference list · repurposed-ID findings · registered-but-provider-missing · provider-exists-but-not-registered · code-referenced-but-missing · static/video template gap map · **standing pre-cleanup guard checklist** (the durable deliverable, drafted for PK ratification).

**Out of scope:** fixing anything found (every remediation = its own future PK-gated lane) · the D6 `production_proven` recording (separate PK gate — packet §3 D6) · S1 hourly cron (separate D-01 — result §5.2) · format-bridge 11-template pool tightening (PARKED carry — packet §3 D1) · contract v3 `policy: tmr_spine` (separate carry — packet §3 D4) · `CREATOMATE_GENERICS_API_KEY` secret split (separate carry — result §5.4) · promotion/deactivation of the 5 fenced backgrounds (action list item 5) · the dashboard repo at `C:\Users\parve\invegent-dashboard` (vendored-registry copy exists per the creative-graph-auditor drift check, CLAUDE.md team table — **inclusion is an open PK scope decision, see Notes Q1; default = defer, record as a named coverage gap in the matrix**).

## Allowed actions

- **Leg 1 (owner: `ice-architecture-cartographer`, as-is — Read/Grep/Glob only, no tool additions):** read/grep/glob this repo; return a cited static reference sweep (every template-ID reference: `path:line`, ID, asserted identity, consuming code path, live-vs-degraded branch classification per existing header comments). Output contract: cited list + explicit "searched-but-not-found" statement of the patterns swept; live/deploy truth is a declared non-claim (charter lines 40–42).
- **Leg 2 (owner: `db-rls-auditor`, read-only):** SELECT/catalog reads over schema `c` registry objects only; return the registry matrix (provider_template_id · name · format/dimensions asserted · status · client assignment · proof rows). No DML/DDL (CLAUDE.md team table).
- **Leg 3 (owner: orchestrator ONLY — never a subagent):** GET/list Creatomate API calls; key from local shell env `CREATOMATE_ICE_PROJECT_API_KEY` via secure handoff — **never pasted in chat, never written to any file, never echoed in output**; record only ids/names/dimensions/metadata. If the key is absent or insufficient → STOP, surface to PK for the degraded-mode decision (Notes, Degraded mode).
- **Join (orchestrator):** compile the eight join deliverables; write the result doc + register pointer entries only at the normal recording gate (Convention 1, CLAUDE.md).
- External review of the joined findings packet before PK ratification of the guard checklist (CLAUDE.md external-review gate), if the orchestrator or PK deems the checklist ratification risky-class.

## Forbidden actions

Verbatim PK hard boundaries (2026-07-05 design):

- no Creatomate POST/PATCH/DELETE
- no template edits
- no renders
- no DB writes
- no storage writes
- no registry status changes
- no secret changes
- no deploy
- no worker changes
- no dashboard changes
- no D6 artifact changes (`_harness/option-d-production-proven-recording.sql` untouchable)
- no queued publish changes

Standing hold-states carried from the registers (a defective draft omits these):

- **D6 outranks this lane.** If the PP publish lands or the D6 gate needs attention, this lane pauses immediately (`docs/00_sync_state.md` v4.95 next-gates; result §5.1).
- Registry statuses stay exactly as deployed — `visually_approved` until the D6 PK-gated flip (packet §3 D6; result §6 "registry statuses untouched (D6 pending)").
- No S1 cron change — the hourly `cron.schedule` gate is its own sql_destructive D-01 (result §5.2).
- No promotion/deactivation of the 5 fenced P0 backgrounds (`docs/00_action_list.md` item 5).
- No edits to `docs/00_sync_state.md` / `docs/00_action_list.md` outside the lane's own PK-gated recording step (v4.95 register commit itself still pending — sync_state line 9).
- No exploitation of Leg 3 access for anything beyond list/GET (the secret-split carry, result §5.4, is NOT this lane).
- Subagents never call the Creatomate API — Leg 3 is orchestrator-only by PK design; `ice-architecture-cartographer` and `db-rls-auditor` have no network/DB-write capability respectively and must not be asked to work around that.

## Success criteria

- **Coverage matrix complete and cited:** every Creatomate template ID found by any leg appears as a matrix row with all three columns populated (repo refs `path:line` · registry row or explicit absence · provider row or explicit absence); no cell asserted without a citation or an explicit "absent, verified by <leg>".
- **Validation case 1 rediscovered blind — `fb9820f8…`:** the lane independently classifies it code-referenced (both `creative_contract.ts:132` copies; `manual_render.ts:62`) + registry-present (Lane-0 capture, `docs/briefs/results/lane0-b1-registry-capture-result.md`; `property-pulse.json:229,273`) + **provider-missing** (deleted — the 2026-07-04 outage, packet §1). A sweep that misses this fails the lane.
- **Validation case 2 rediscovered blind — `490ad9ea…`:** classified from `tmr_smoke.ts:46` + `docs/creative-library/format-variant-intake-pp-image-quote-pilot-v1.md:214`, with its live provider status determined by Leg 3 (recorded repo-side as a known-degraded smoke reference, result §5.4).
- **Validation case 3 rediscovered blind — `48cba556…` (repurposed ID):** the lane surfaces the documented conflict — PP 16:9 news identity (`manual_render.ts:36-43` `pp-news-centred-scrim-16x9`; `property-pulse.json:189,330`; `property-pulse-template-family-news-v1.md:60`; `index.ts:553` template_smoke) vs `generic_market_insight_card_1x1_v1` 1:1 identity (packet §2; `b1_production_test.ts:165-170`; sync_state v4.91 live winner) — and resolves which identity the provider actually holds via Leg 3, WITHOUT editing either record.
- **Zero mutation footprint:** 0 Creatomate writes · 0 renders · 0 DB writes · 0 storage writes · 0 repo file changes outside the PK-gated result/register recording step · secret never appears in any transcript, file, or output.
- **Standing pre-cleanup guard checklist drafted** and presented to PK for ratification (ratification itself = PK act, not a lane success claim).
- Every leg's output declares its non-claims (Leg 1: no live truth; Leg 2: no provider truth; Leg 3: no repo/registry interpretation).

## Stop condition

Report result per `docs/briefs/_template_result.md`, then stop. Additionally, STOP mid-lane and surface to PK immediately when: (a) the D6 gate becomes actionable (pause rule — D6 outranks this lane); (b) any forbidden-action boundary is about to be tripped by any leg; (c) `CREATOMATE_ICE_PROJECT_API_KEY` is missing/insufficient → PK decides degraded mode (manual UI export, lane labeled **DEGRADED**) or halt; (d) Leg 3 reveals an active production template missing provider-side (a live outage signal, not just an audit finding) — that is an incident, and it outranks the audit; (e) any leg returns a non-clean verdict.

---

## Notes

**Degraded mode (PK-defined):** if API access is unavailable or insufficient, Leg 3 falls back to a manual Creatomate UI export performed by PK; the lane and its result doc are labeled **DEGRADED**, and the guard checklist must state which cells rest on the manual export rather than API truth.

**Two-project coverage risk (surfaced, not resolved):** the incident record states "one account, two projects" and places the deleted `fb9820f8…` in the **Default Project**, while Option D renders from the **ICE project** (packet §1, §2). If `CREATOMATE_ICE_PROJECT_API_KEY` scopes to a single project, a single-key Leg 3 cannot see Default-Project inventory → partial-DEGRADED. PK decision needed before Leg 3 runs (open question Q2).

**Recorded-conflict note (do not pre-resolve):** result §5.4 describes the degraded opt-in branches as referencing "deleted templates", but `template_smoke`'s `48cba556…` may be repurposed-live rather than deleted (packet §2 says the ICE-project templates exist). The lane's matrix, not this brief, settles it.

**Open questions for PK (gate 1):**
1. **Dashboard repo scope:** include the vendored registry copy at `C:\Users\parve\invegent-dashboard` in Leg 1 (the cartographer's charter already lists dashboard inputs, charter lines 63–65) or defer it and record a named coverage gap? Default in this draft: defer + record.
2. **Second-project access:** provide Default-Project listing access (second key / UI export) or accept partial-DEGRADED for Default-Project inventory?
3. **Brief numbering:** template mandates `cc-NNNN`; recent lanes ship as named packets (e.g. `option-d-tmr-live-b1-slice-packet.md`). Orchestrator/PK to assign the identity at issue.
4. **Checklist ratification chain:** does the guard-checklist ratification take the external-review gate (risky-class judgment), or is a read-only audit's docs-only deliverable light-lane? Draft assumes external review before ratification; PK may waive.
