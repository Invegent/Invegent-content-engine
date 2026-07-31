# Result S6 · B1 — cross-client truth alignment on the two proven card templates

**Packet:** `capability-expansion-b1-implementation-packet-v1.md` (rev-2, frozen `e1052fc1…10fc`, commit `e611c2c` on branch `claude/gate-1-capability-expansion-paw1ew`, NOT on main)
**Review record:** `capability-expansion-b1-review-record-v1.md` (same commit)
**Executed by:** Claude Code (orchestrator) — PK apply gate, Convention-2 conditional sequence approval
**Completed:** 2026-07-31 Sydney

---

## 1. Result status

`Complete`

## 2. Commit(s)

- N/A — no code/repo commit for the apply itself (the packet lived off-main by design; nothing in this repo changed by the DB write). This result doc + register pointers are recorded in a separate docs-only commit (see repo commit below, added by the orchestrator after this file was written).

## 3. Files changed

- `docs/briefs/results/capability-expansion-b1-result-v1.md` — created (this file)
- `docs/00_sync_state.md` — modified (pointer entry)
- `docs/00_action_list.md` — modified (pointer entry)

No other repo files touched. No code, no migration file, no worker/dashboard change.

## 4. Actions taken

1. **Located + verified the pinned packet.** PK named branch `claude/gate-1-capability-expansion-paw1ew` @ commit `e611c2c`. Fetched read-only via `git fetch` + `git show <sha>:<path>` (no checkout, no branch switch). Computed sha256 of the packet blob — **matched `e1052fc1921df90667a722bf6ee10b6722fb73da81c0b02fd29c31799fec10fc` exactly**.
2. **Dispatched a fresh `db-rls-auditor` subagent**, pinned to the same commit/hash, with PK's 8-point required-outcome checklist (column/constraint verification, `template_id`→assignment mapping, cited-publish client attribution, no pre-existing proof event, G1–G4/G3b vs live state, rollback symmetry + zero pre-image, protected-surface non-interference). The agent independently re-fetched the packet from git, re-verified the hash itself, and ran live reads against project `mbkmaxqhsohbtwsqolns` via `mcp__supabase__execute_sql` (the "no live DB path reaches subagents" structural gap recorded in the rev-1/rev-2 history did **not** recur this session — Supabase MCP tools were reachable). **Verdict: PASS, zero must-fix findings**, all 8 checklist items PASS with cited live evidence.
3. **Reverified hash + all guards live immediately before execution** (orchestrator, independent of the auditor's earlier run, to catch any drift in the interim): hash re-matched; G1=3, G2=0, G3=3, G3b=3, rollback pre-image=0 — identical to the auditor's findings, no drift.
4. **Executed the exact §7 single `DO $$ … $$` block** in one `execute_sql` call (project `mbkmaxqhsohbtwsqolns`) — byte-identical to the frozen packet text. No exception raised; all guards (G1–G4, G3b) passed inside the transaction.
5. **Post-apply verification (read-only):**
   - One-row-per-event readback of the three new rows — all values exact (see §5.1 below).
   - Proof-event count scoped to the two named templates: **9** (6 pre-existing assignment-linked rows + 3 new), exactly matching the packet's §7 expectation. (A same-scope table-wide count came back 11 on first pass because it also included 2 pre-existing template-level `smoke_render` rows with `assignment_id IS NULL` from 2026-07-02 — unrelated to this apply, present before it, not new. Full table dump confirmed no anomaly.)
   - `assignment_status` on all three assignments: still `production_proven` (unchanged).
   - `c.creative_template_selector_policy` row count unchanged.
   - PP Facebook `client_publish_profile`: `publish_enabled=true, paused_until=NULL, paused_reason=NULL` — unchanged, no S5 interference.
   - `public.select_template()` re-run for all three clients (facebook × image_quote): NDIS → market-insight `0e006c5c…` selected; CFW → market-insight `0e006c5c…` selected; Invegent → quote-card `1cfe0f9c…` selected — **identical winners, identical reason chains, identical `assignment_status`** to pre-apply. Selection-neutrality confirmed live, not just by static SQL-text inspection.
6. **No STOP condition tripped** at any point (no hash mismatch, no guard failure, no duplicate event, no unexpected origin movement, no rollback-predicate change).

### 5.1 Inserted event identifiers (exact readback)

| # | proof_event id | assignment_id | client | template_id | proof_type | proof_status | occurred_at |
|---|---|---|---|---|---|---|---|
| W1 | `b0a98eda-96fe-448a-86a9-9046fdf86f12` | `c4737728-eb87-462f-aa79-ce6b321ba8ef` | ndis-yarns | `0e006c5c-45aa-4829-82ec-89dd282a8c56` | platform_publish | passed | 2026-07-19 22:00:18.134+00 |
| W2 | `c33c42fb-8bb9-44da-9255-9b4211434d68` | `60e43a0e-8ac3-497d-b823-8d41c2aa123b` | care-for-welfare-pty-ltd | `0e006c5c-45aa-4829-82ec-89dd282a8c56` | platform_publish | passed | 2026-07-30 23:10:09.254+00 |
| W3 | `fca718f4-2391-43ba-b514-f47a2634c5cd` | `ecba211b-5217-4790-afe5-a2f98616712f` | invegent | `1cfe0f9c-3810-4bf1-8785-083fead4eefe` | platform_publish | passed | 2026-07-26 22:10:17.187+00 |

All three carry `platform='facebook'`, `evidence_kind='production_publish'`, `recorded_by='S6 B1 platform_publish trail alignment (PK apply gate, packet capability-expansion-b1-implementation-packet-v1)'`, `created_at≈2026-07-31 05:26:19 UTC` (the apply timestamp) — exactly and only the packet's proposed rows.

## 5. Constraints confirmed

- No `assignment_status` change — confirmed unchanged (still `production_proven` ×3).
- No PP row / no PP quote-card touch — confirmed (PP quote-card `visually_approved` untouched, zero PP rows in the write set).
- No template-level `status` bump — confirmed (deferred per packet, not executed).
- No touch to selector policy, S5 (schedule/cadence/cap tables or functions), PP Facebook `client_publish_profile`, NDIS YouTube/video rows, or any enrolment/schedule/cap/mix row — confirmed by live re-read post-apply (§4.5) and by the executed SQL text itself (single INSERT target: `c.creative_template_proof_event`).
- No DDL, no GRANT/REVOKE — confirmed (pure DML, `apply-harness-auditor` shadow PASS + `db-rls-auditor` live PASS both confirm).
- Rollback validated pre-apply (pre-image = 0) and remains valid post-apply (predicate uniquely identifies exactly these 3 rows via the packet-unique `recorded_by` string).

## 6. Open issues

None. The one apparent discrepancy during post-apply verification (table-wide proof-event count reading 11 against an expected "9") was resolved as a scoping artifact of the orchestrator's own follow-up query (it inadvertently included 2 pre-existing, unrelated `assignment_id IS NULL` `smoke_render` rows) — not a defect in the apply. The correctly-scoped count (assignment-linked rows on the two named templates) came back exactly 9, as the packet predicted.

## 7. Next recommended step

- Matrix-staleness handoff to `register-reconciler`: `creatomate-template-graduation-matrix-v1.md` (2026-07-29) still shows NDIS/CFW row 5 and Invegent row 7 at `visually_approved`; live state has read `production_proven` since 2026-07-18/20 (predates the matrix) — packet §8, unchanged by this apply, not this packet's write set.
- Optional, explicitly deferred by the packet: template-level `status` bump on the two generic templates from `smoke_rendered` (selection-neutral per the selector's `smoke_rendered`-floor rule, but shared with PP) — a named PK option, not recommended in this window.

---

## 8. Verification (chat fills this)

**Verdict:** `Pass`

**Notes:**

- Output matched the frozen packet exactly — SQL executed byte-identical to packet §7, verified via independent hash check both by the `db-rls-auditor` subagent and by the orchestrator immediately pre-execution.
- All constraints respected (§5). Only the one intended table was written.
- No unexpected files changed (docs-only, this result doc + 2 register pointers).
- Success criteria (3 additive `platform_publish` proof-event rows, one per cited client-attributed publish, correctly attributed and mapped) met and live-confirmed post-apply.
- New risks: none identified. The pre-existing RLS-enabled-no-explicit-policy posture on `c.creative_template_proof_event` (deny-all to non-bypassrls roles) is unchanged and was already the established pattern for schema `c` governance tables (INFO-level advisor finding, not introduced by this packet).
- Follow-up: `register-reconciler` handoff for the stale graduation matrix (§7 above); no other follow-up.

## 9. Learning notes (chat fills this)

- The "no live DB path reaches subagents" structural gap recorded against the packet-authoring session did **not** reproduce in this session — `db-rls-auditor` had full `mcp__supabase__execute_sql` reach and ran a genuine live pass. Worth noting in future gate messages: the structural-gap caveat is session-dependent, not a standing limitation of the agent type.
- The packet's own "expect 9 rows total" language (§7) was scoped to assignment-linked proof events on the two named templates; a naive `WHERE template_id IN (...)` recount (without also filtering to assignment-linked rows) picks up unrelated template-level `smoke_render` rows and will read high. Future packets doing a similar post-apply count check should state the exact filter predicate, not just an expected number, to avoid this ambiguity.
