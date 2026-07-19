# Brief — shared-asset-pool P1 declarative design ratification

**Created:** 2026-07-19 Sydney
**Author:** chat (brief-author draft; orchestrator persists)
**Executor:** Claude Code (orchestrator design/authoring lane) + PK (ratification)
**Status:** draft — awaiting PK Gate-1 approval
**Result file:** `docs/briefs/results/shared-asset-pool-p1-design-ratification.md` (created on completion)

**Lane class:** SIDE_PROVING · **Tier:** T1 (docs-only design ratification). Justification: the assessment's §5 P1 row scopes this phase as "docs only; consistency-check vs music v0 + TMR-4 + creative-library v2" at **Tier T1** (`generic-shared-asset-pool-assessment-v1.md`); the parent P0 lane is itself `SIDE_PROVING · T1`. This lane touches no DB, storage, resolver, or deploy — it produces a document and takes it to ratification. Doubt/mixed scope escalates the tier up freely (Convention 3); de-escalation needs a fresh Gate 1.

---

## Task

Author a single **design-of-record** document (`docs/briefs/shared-asset-pool-design-of-record-v1.md` — confirmed not to exist at HEAD; this lane creates it) that consolidates the proposed model (`generic-shared-asset-pool-assessment-v1.md` §3) plus the convergence review (§3.6) into one ratifiable design, and pins a single **recommended resolved position** for each still-open question **OQ-2 through OQ-7**, each cited to its governing precedent. The positions are **proposals for PK to ratify** — the design-of-record proposes; PK ratifies; this lane resolves nothing on PK's behalf. Then run the design review chain and take the document to PK ratification. Docs-only: no schema is built and nothing is ratified or proven by the executor.

**OQ-1 is already CLOSED** (NDIS Sensitive-Real-Imagery Rule 3.5 ratified 2026-07-19, register v5.73 — `docs/00_sync_state.md`); the design-of-record cites Rule 3.5 as settled governing input for the sensitive-class exclusion and must NOT re-open it.

## Source context

- `generic-shared-asset-pool-assessment-v1.md` — P0 assessment/design packet (DRAFT, pre-Gate-1): §3 model (§3.1 storage · §3.2 suitability schema · §3.3 resolver · §3.4 pool-neutrality scoped-delta · §3.5 fences/scoped-approval), §3.6 convergence review, §4 risks, §5 P1 row + phase boundaries, §6 OQ-2..OQ-7, findings-contract block.
- `supabase/migrations/20260708224532_create_music_library_v0.sql` — Music Library v0, the decisive shared-pool precedent (`m.music_track` global no-`client_id`, `m.music_suitability` scoped fit, 1:1 licence with fail-closed booleans, scoped approval).
- `docs/briefs/tmr4-generic-template-tags-asset-appetite-migration-packet.md` — TMR-4 "vertical is a tag, not a copy"; the suitability vocabulary reuses these namespaces rather than forking.
- `docs/creative-library/creative-library-v2-architecture.md` + `registry-schema-v2.md` — Creative Library v2: Assets and Patterns are sibling governed libraries; declarative registry never read at runtime.
- `docs/compliance/ndis_content_rules.md` Rule Group 3 (Rule 3.5) — settled citation for the sensitive-imagery hard exclusion (OQ-1 CLOSED).
- `CLAUDE.md` — CCF-02 findings-contract + lane classification; Convention 3 risk-tiers; R1 db-rls-auditor substitution note; external-review hash-pinning.

## Scope

**In scope:**
- Authoring the single design-of-record doc consolidating §3 + §3.6 into a ratifiable design.
- Pinning one recommended position for **each** of OQ-2, OQ-3, OQ-4, OQ-5, OQ-6, OQ-7, each a **proposal for PK to ratify**, each cited to its governing precedent.
- The consistency-check of the design against Music Library v0 + TMR-4 + Creative Library v2.
- Running the P1 review chain: `creative-graph-auditor` (declarative/registry consistency), `db-rls-auditor` (schema/RLS/grants design review — MCP-enabled preferred per R1; substitution NAMED in the result doc if not), external review pinned to the design-of-record doc hash, then PK ratification.
- One register pointer at lane close (Convention 1), on PK instruction only.

**Out of scope / excluded:**
- Any DDL, migration, or schema built — P2 dark-DDL is a separate future T2 gate.
- Any storage change / `_generic/` prefix — P3. Any resolver edit / resolver v2 — P4/P5.
- Any promotion or approval of any asset; any deploy.
- Dashboard IA / `/creative-library` UI (P6, separate `invegent-dashboard` repo, out of session scope).
- Re-opening OQ-1 (CLOSED). Resolving any OQ on PK's behalf (OQ-2..OQ-7 are PROPOSALS; PK ratifies).

## Allowed actions

- Read the assessment, named precedents, registers, and CLAUDE.md as evidence.
- Author the design-of-record doc (docs-only write, after Gate-1 approval).
- Invoke `creative-graph-auditor` and `db-rls-auditor` in read-only design-review mode; run external review pinned to the exact doc hash.
- Surface every non-clean review verdict to PK; record all citations.
- Cut exactly one register pointer at lane close, on explicit PK instruction, exact PK message, no added trailer (docs-only register-lane rules).

## Forbidden actions

- **No DDL, no migration, no `apply_migration`, no schema created** — P2 is its own future T2 gate; the assessment's boundary line forbids it for this arc (⛔ no DB write · no migration · no storage change · no resolver edit · no deploy · no promotion · no approval).
- **No storage/bucket/prefix change** (P3). **No resolver edit** (P4/P5). **No deploy/merge/migrate** (PK hard stop).
- **No promotion, no approval, no marking anything proven or ratified** — ratification is PK's act; the executor proposes only.
- **Do NOT resolve OQ-2..OQ-7 as decided** — proposals only; PK ratifies.
- **Do NOT re-open OQ-1** — CLOSED via Rule 3.5, register v5.73.
- **Do NOT treat the P0 orchestrator DB-read substitution as a T2/T3 precedent** — T1-only stopgap; P2 must re-run `db-rls-auditor` MCP-enabled.
- **Do NOT edit CLAUDE.md or any register beyond the single PK-instructed lane-close pointer** (Convention 1).
- **Respect active parallel-lane fences:** the TMR lanes own `b1_production.ts` / image-worker / video-worker / music-library artifacts; Creatomate/TMR-4 intake stays UNOPENED. This lane is docs-only and disjoint — must not touch them.
- **Do NOT let `production_use_allowed`-as-fence (or any live-behaviour claim) enter the design as fact** — it is written-but-read-by-no-resolver today; treating it as an active fence is a future T3 resolver change, not a design assertion.

## Success criteria

- The design-of-record doc exists and consolidates §3 + §3.6 into a single ratifiable design (`Status:` = design-of-record, not proven/ratified until PK acts).
- **Every one of OQ-2..OQ-7 carries exactly one recommended position**, each a proposal for PK, each cited to its governing precedent.
- The consistency-check vs Music Library v0 + TMR-4 + Creative Library v2 is documented with citations; no contradiction, OR any contradiction surfaced explicitly to PK.
- The review chain runs and is **clean** (or every non-clean verdict surfaced to PK, not resolved by the executor): `creative-graph-auditor` verdict recorded; `db-rls-auditor` verdict recorded (MCP-enabled-vs-substitution status NAMED per R1); external review recorded with `reviewed_input_hash` == the exact doc hash.
- **PK ratifies** at the gate. One register pointer cut at lane close (≤5 lines, Convention 1), on PK instruction.

## Stop condition

Return the design-of-record to PK for ratification; **stop there.** Nothing proceeds to P2 (DDL) or later without its own PK gate. Any non-clean review verdict halts the lane to PK — the executor does not fix a design decision on its own. Report per the result template, then stop.

---

## Notes

- The assessment already carries a recommendation for each OQ (§6 + §3.6 for OQ-6/OQ-7); the design-of-record consolidates and cites these — it does not invent or decide them.
- The db-rls-auditor design review at P1 is **docs/design consistency** (schema shape / RLS-posture / grant-model review of the *proposed* tables), not a live-DB apply; if the session lacks Supabase-MCP, the substitution is named in the result doc, and P2 must re-run the auditor MCP-enabled before any DDL.
- Register/queue truth (HEAD, current register version) is asserted by the orchestrator at execution time.

## PK Gate-1 decision that shapes the lane

- **Ratification structure:** does the design-of-record resolve OQ-2..OQ-7 as **one consolidated ratification** at a single PK gate, or does PK want **OQ-5 (scoped-delta pool-neutrality — the load-bearing governance change)** ratified as its own isolated decision? This changes the gate structure of the lane.
