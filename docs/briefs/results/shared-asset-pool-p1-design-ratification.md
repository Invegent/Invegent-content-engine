# Result — shared-asset-pool P1 declarative design ratification

**Brief file:** `docs/briefs/shared-asset-pool-p1-design-ratification-brief-v1.md`
**Executed by:** Claude Code (orchestrator) + PK (Gate-1 approval + consolidated ratification)
**Completed:** 2026-07-19 Sydney
**Lane:** P1 (assessment §5) · SIDE_PROVING · T1 (docs-only design ratification)

---

## 1. Result status

`Complete` — the shared-asset-pool **design-of-record** is authored, reviewed, and **PK-ratified** (OQ-2..OQ-7 accepted as proposed at one consolidated gate). Nothing was built; P2 (dark DDL) and every later phase remain separate future gates.

## 2. Commit(s)

- Committed this lane on branch `claude/ice-spiral-discussion-wrfsqx` (design-of-record + brief + this result doc + v5.74 register pointers). Push is a separate PK hard stop.
- Stable review identity: external review `20f7b813` on reviewed_input_hash `0a4194cd9a928f8f03b9552e378a40f4b94731bf342bf5f2cff9f9da1da94669`.

## 3. Files changed

- `docs/briefs/shared-asset-pool-design-of-record-v1.md` — created (the ratified design-of-record)
- `docs/briefs/shared-asset-pool-p1-design-ratification-brief-v1.md` — created (the Gate-1 brief)
- `docs/briefs/results/shared-asset-pool-p1-design-ratification.md` — created (this result doc)
- `docs/00_sync_state.md`, `docs/00_action_list.md` — modified (v5.74 pointer)

## 4. Actions taken

- **Gate 1:** brief-author drafted the P1 lane brief (DRAFT_READY); PK approved as scoped + chose a **single consolidated** ratification structure for OQ-2..OQ-7.
- **Authored the design-of-record** consolidating assessment §3 + §3.6 into a ratifiable design; pinned one recommended, precedent-cited position per OQ-2..OQ-7 (proposals for PK).
- **Review chain:**
  - `creative-graph-auditor` **PASS** — no contradiction with the Creative Library v2 declarative model; runtime-import guard holds (resolver selects from the DB, not the registry).
  - `db-rls-auditor` **`concerns` → all folded in** — no high-severity exposure/grant/RLS gap; concerns addressed in the DoR: §5 assertion-replica ↔ resolver-v2 co-versioning (must-fix), model **four → six tables** (restored `m.shared_asset_review_event` + `m.shared_asset_usage_event`, music parity), `c.client_asset_profile` RLS pinned to the stronger music RLS-enabled-deny-all posture, `UNIQUE(asset_key)` + `UNIQUE(asset_id, scope_kind, scope_value)`.
  - external review **`partial → escalate`** (`20f7b813`) — no concrete defect; escalation = `policy_decision` + `runtime_verification_required` (human-oversight on data-protection adequacy), routed to the PK gate; the runtime proof it asks for is already a named future gate.
- **PK consolidated ratification** of all six positions; DoR stamped RATIFIED.

## 5. Constraints confirmed

- No DDL, no migration, no schema created; no storage/prefix change; no resolver edit; no deploy; no promotion or approval of any asset.
- OQ-1 not re-opened (Rule 3.5 settled). No OQ resolved on PK's behalf — all six were PK-ratified.
- Dashboard (P6) untouched (separate `invegent-dashboard` repo). No CLAUDE.md change.
- Surgical/additive edits; branch-warden verified the change set == approved set.

## 6. Open issues

- **R1 substitution (must clear before P2):** `db-rls-auditor` ran MCP-less this session — `get_advisors`, live grant/RLS, and live resolver-body re-verification were NOT run. This is a T1-only stopgap; **P2 must re-run `db-rls-auditor` MCP-enabled** before any DDL.
- **P4/P5 build requirement:** the §5 scoped-delta assertion replica must be co-versioned with the resolver-v2 union SQL, or a client-scoped replica would silently pass a scoped leak at promotion. Pinned in the DoR; enforced at the P4/P5 T3 gate with dark-ship + PP byte-identical + scoped-delta proof + rollback.
- **should_fix carried to P2 DDL:** `UNIQUE(asset_key)`, `UNIQUE(asset_id, scope_kind, scope_value)`, `c.client_asset_profile` PK=`client_id` FK + RLS-enabled deny-all.

## 7. Next recommended step

**P2 — dark, additive DDL** (new `m.*` shared/suitability/licence/review/usage tables + `c.*` preference, four fences, deny-all/service-role posture, empty; no resolver read). A separate future T2 gate: migration packet → MCP-enabled `db-rls-auditor` + `get_advisors` → external (hash-pinned) → PK apply hard-stop; rollback written + validated. Not started here.

---

## 8. Verification

**Verdict:** `Pass`

**Notes:**

- Output matches the brief and PK's Gate-1 + ratification decisions.
- Constraints respected (docs-only; nothing built/applied/promoted).
- No unexpected files changed — branch-warden confirmed the change set.
- Success criteria met: DoR authored; each OQ-2..OQ-7 carries a ratified precedent-cited position; review chain run and recorded (creative-graph PASS, db-rls concerns-folded, external hash-pinned); PK ratified; register pointer cut.
- New risk carried, not hidden: the R1 MCP-less substitution and the P4/P5 co-versioning requirement are named as hard P2/P4 preconditions.

## 9. Learning notes

- The `db-rls-auditor` earned the lane: it caught a real leak-at-promotion hole (client-scoped assertion replica vs shared-pool union) and a shape-completeness gap (dropped audit/usage tables) that a single authoring pass shipped. Folding the fixes before the PK gate is the intended "concerns → fix → advance" flow.
- Loop-termination discipline held again: the external `partial → escalate` was a governance/runtime-verification sign-off, not a defect — re-reviewing it forever would be ceremony drag. Terminating at the PK gate, with the runtime proof deferred to a named P2/P4/P5 gate, was correct.
- Reusable pattern: when a design defers verification (leak-prevention proven only at runtime), name the exact downstream gate that proves it in the design-of-record itself — the reviewer's "needs human oversight" then has a concrete home instead of blocking the design.
