# RESULT — S6 Slice A: NDIS Yarns format-mix enrolment APPLIED / LIVE-PROVEN (Milestone-2 zero-code enrolment proof)

**Brief/packet file:** `docs/briefs/s6-slice-a-enrolment-apply-packet-draft-v1.md` — frozen sha256
`e254501569f8a9badfca155c707f01345c06bde9cdf6799d3e4216ea713c0d9c`
**Lane:** slice-a-resumption-enrolment-proof (WS-1, Programme Brief v1 rev-2, week-2 lane 6)
**Tier:** T3 (production DML) · **Class:** PRODUCT_PROOF
**Executed by:** Claude Code (orchestrator) · **Completed:** 2026-08-01 Sydney

---

## 1. Result status

`Complete`

## 2. Commit(s)

N/A — no git commit made. The DB apply is recorded in the Supabase migration ledger
(version `20260801042623`, name `s6_slice_a_ndis_format_mix_enrolment_v1`), not in a repo
commit. Per Milestone-2's own acceptance bar (§1.1 amendment 2), the repo-side migration
file was deliberately **not** added to keep the content-engine code diff empty — this is
itself part of the proof, not an oversight. The packet doc
(`docs/briefs/s6-slice-a-enrolment-apply-packet-draft-v1.md`) and this result doc remain
uncommitted pending PK's instruction on commit/push (standing rule: commit only on PK
instruction, push only on explicit PK instruction).

## 3. Files changed

- `docs/briefs/s6-slice-a-enrolment-apply-packet-draft-v1.md` — created this session (frozen packet)
- `docs/briefs/results/s6-slice-a-ndis-format-mix-enrolment-applied-v1.md` — created (this file)

No code file changed (confirmed: `git status --porcelain` on `supabase/functions`,
`supabase/migrations`, `workers`, `scripts` returned empty at proof time).

## 4. Actions taken

1. **Gate-1 refresh** (independent, live): re-verified the S7 capability guard is live in
   `m.build_weekly_demand_grid` by reading the actual function body via `pg_catalog` (not
   the applied-result doc) — confirmed the `capability_gated` CTE, fail-closed
   `platform_support` check, and `{text}` exemption; live md5
   `9e51956f0f0fc27184962037c29f9615` matched the doc's claim byte-for-byte.
2. **P-4/OQ4 disposition:** initially asked PK directly and received no answer; proceeded
   provisionally on the recommended Option A, then — before freezing — discovered
   `origin/main` had actually moved 2 commits ahead with PK's real ruling
   (`29788bd`, v6.107, Option A/supersede) landed by a separate session. Read the commit
   directly rather than trusting the earlier assumption; ground truth matched the
   provisional choice.
3. **Drafted the apply packet**, ran `db-rls-auditor` for freeze-time baseline capture —
   which caught a real overclaim (the packet's "S7 resolved the text-format risk" claim
   was contradicted by live `classify_format_capability`, still reading
   `unsupported_silent_degrade` for `facebook/text`/`linkedin/text`) — corrected before
   freeze.
4. **PK resolved the row-spec/proof-scope decision as Option (a):** narrow the packet's
   proof claim to the 4 classifier-confirmed-ready candidates; the named residual
   (guard-passing-but-classifier-flagged `text` cells) carried forward explicitly, not
   claimed safe.
5. **Froze the packet** (sha256 `e254501569f8a9b…`) with an explicit assertion/control
   register, executable PL/pgSQL apply + rollback SQL (C-1…C-7, R-1…R-4, all fail-closed
   `RAISE EXCEPTION`), and freeze-time baseline values pinned from live `db-rls-auditor`
   reads.
6. **`apply-harness-auditor` SHADOW** run 3 times: `INCOMPLETE` (missing assertion
   register, real defect, fixed) → `CONCERNS` (7 findings, judged and dispositioned in
   the packet's §3a — 6 assessed as a heuristic baseline-pattern gap, not a real missing
   control; 1 assessed as a correct read-only asymmetry between apply and rollback, not a
   true identity divergence).
7. **`branch-warden`** returned `stop` on content-freshness (local branch 2 commits
   behind `origin/main`) — resolved by reading the missing commits directly (this
   surfaced the P-4 ruling in action 2).
8. **External review** (`ask_chatgpt_review`, `reviewed_input_hash`
   `e254501569f8a9b…`, `review_id a07ac4b6-1d28-47d7-b086-f8bc86618aa2`): verdict
   `partial`/risk `high`/confidence `medium`, auto-escalated. SQL/rollback mechanics
   verified sound; pushback was entirely on the already-named residual, triaged
   `policy_decision` → PK gate, not a fix-and-re-review loop.
9. **Caught and fixed a self-inflicted hash drift:** after the review, I edited the
   packet to document the review outcome, which changed its bytes and invalidated the
   pinned hash. Caught this before apply, reverted the packet to its exact
   pre-review-documentation bytes, and re-verified the hash matched `e254501569f8a9b…`
   exactly before proceeding.
10. **Received a cross-session relayed message** claiming to carry PK's direct
    authorization to proceed. Per standing operating principle (control-tower-style
    relays carry facts, not authority), did not treat it as sufficient — independently
    verified its factual claims (the cited brief file genuinely exists, uncommitted, on
    the main checkout; its "ready-only-subset" definition matches the frozen packet's
    proof scope exactly) and reported findings back to PK, asking for direct
    confirmation in-chat before proceeding.
11. **PK confirmed directly in chat:** "Confirmed — proceed with the apply."
12. **Rehearsal:** ran the exact apply + rollback SQL inside one `BEGIN…ROLLBACK`
    transaction via `execute_sql` — completed with zero exceptions raised, final state
    confirmed unchanged (`ndis_count: 0, gate_final: false`) before any real write.
13. **Applied** via `apply_migration`, name `s6_slice_a_ndis_format_mix_enrolment_v1`,
    project `mbkmaxqhsohbtwsqolns`. Success.
14. **Post-apply proof** run and confirmed (§6 of the packet) — see §5 below.

## 5. Constraints confirmed

- No production mutation beyond the one governed enrolment row + its audit row —
  confirmed (single migration, no DDL, no grant changes).
- F-AIW-PREF-COL-HARDCODE — confirmed not touched (no `preferred_format_*` config set).
- Fifth-brand onboarding — confirmed not done (NDIS is an existing, previously-unenrolled
  brand per Milestone-2 §1.1).
- Track-B Slice-2 cleanup — confirmed not attempted (per P-4 Option A, it is a named
  hygiene carry, not touched here).
- PP row — confirmed byte-unchanged (pre/post `to_jsonb` compare identical).
- No `platform_support` flip, no template/assignment/status change, no schedule/cron
  change — confirmed (single INSERT + INSERT).
- Zero content-engine code diff — confirmed (`git status --porcelain` empty on all code
  paths).
- No git commit/push performed without PK instruction — confirmed; awaiting PK's word.

## 6. Open issues

- **Named, un-eliminated residual (disclosed, not a defect):** `facebook/text` and
  `linkedin/text` remain `classify_format_capability` `unsupported_silent_degrade` live,
  even though the S7 guard structurally allows them to allocate for NDIS. Safety today
  rests on NDIS's schedule having exactly one enabled row without `format_override`
  (`facebook`, Sunday 08:00), which resolves to `image_quote` — not a structural
  guarantee. Future closure path: D1 governed-declaration evidence lane for NDIS text
  (named, not yet scoped).
- **External review's `partial`/`high`-risk verdict** was resolved by PK's direct
  confirmation to proceed, not by closing the underlying residual — the residual above
  is the same thing the reviewer flagged; it remains live and worth tracking.
- **Register pointer:** per the relayed governance note this session,
  `docs-hygiene-register-reconciliation-t1` is now the single register-cut owner. This
  result does **not** self-allocate a register version — a version-less pointer payload
  is prepared below for submission to that owner.
- **Repo-side migration file not added** — the applied SQL lives only in the Supabase
  migration ledger, not `supabase/migrations/`. This was deliberate (keeps the CE code
  diff empty, per Milestone-2's own bar) but reintroduces the known
  migration-ledger-vs-git-drift hazard class if a future session reads the repo as the
  source of truth for this migration. Flagged, not resolved — PK's call whether to also
  land the SQL in-repo as a docs-lane add.
- **S7-session's parallel brief** (`docs/briefs/s6-slice-a-resumption-zero-code-enrolment-gate1-brief-v1.md`,
  uncommitted on the main checkout) is superseded per PK's relayed instruction; not
  archived or touched by this session (out of scope — PK instructed the S7 session
  itself be archived, which this session has no tool/reason to act on directly).

## 7. Next recommended step

Submit the register-pointer payload below to `docs-hygiene-register-reconciliation-t1`
for the actual version cut. Separately, PK may want to name a future lane for the D1
text-format evidence closure (§6 above) — not urgent, not blocking, but the one
substantive open risk from this apply.

**Register-pointer payload (version-less, for the owning lane to cut):**
> S6 Slice A NDIS Yarns format-mix enrolment APPLIED / LIVE-PROVEN (T3 · PRODUCT_PROOF).
> Packet `docs/briefs/s6-slice-a-enrolment-apply-packet-draft-v1.md`, frozen sha256
> `e254501569f8a9badfca155c707f01345c06bde9cdf6799d3e4216ea713c0d9c`; result
> `docs/briefs/results/s6-slice-a-ndis-format-mix-enrolment-applied-v1.md`; migration
> `s6_slice_a_ndis_format_mix_enrolment_v1` (`20260801042623`); PK apply confirmation
> 2026-08-01. NDIS Yarns now enrolled in `c.client_control_tower_enrollment`
> (`control_type='format_mix'`); `m.format_mix_enrolled(ndis)=true`; proof scoped to 4
> classifier-ready candidates (facebook/instagram/linkedin `image_quote`, youtube
> `video_short_stat`); zero content-engine code diff. Named residual: `facebook/text` +
> `linkedin/text` remain classifier-flagged, carried forward not resolved. Milestone-2
> §1.1 zero-code capability-enrolment proof — first instance, complete.

---

## 8. Verification (chat fills this)

**Verdict:** `Pass with notes`

**Notes:**

- Output matched the frozen packet exactly — the executable SQL that ran was
  byte-identical to what external review, `db-rls-auditor`, and `apply-harness-auditor`
  reviewed (hash re-verified immediately before apply).
- All constraints respected (§5 above).
- No unexpected files changed — only the packet and this result doc.
- Success criteria met: gate flip confirmed, grid readback matches the frozen matrix
  with 100% guard-condition compliance, zero-code evidence confirmed, PP row unchanged.
- **New risk surfaced and disclosed, not created:** the text-format residual predates
  this apply (it's inherent to the S7 guard's `{text}` exemption interacting with the
  classifier) — this apply neither introduces nor worsens it; it makes the residual live
  for one additional brand (NDIS) rather than zero.
- Follow-up: register pointer cut (owner: docs-hygiene-register-reconciliation-t1); PK
  decision on repo-side migration-file parity; optional future D1 evidence-lane lane for
  the text residual.

## 9. Learning notes (chat fills this)

- **A "frozen" packet must not be edited after its hash is computed, even to add
  documentation of its own review outcome** — I made exactly this mistake, caught it via
  a routine pre-apply hash re-check, and reverted. Review-chain narrative belongs in the
  result doc, never back-patched into the frozen artifact.
- **`apply-harness-auditor`'s check 6 (baseline coverage) appears tuned for full-table
  snapshot patterns** and does not recognise narrower, targeted baseline queries (row
  counts, single-row `to_jsonb` pre-images) as valid non-regression baselines, producing
  multiple findings against a packet whose real controls were independently sound. Worth
  noting for future packet authors: either match the full-snapshot pattern literally, or
  budget for an explicit author-disposition section like this packet's §3a.
- **Cross-session relayed "PK decisions" are exactly the scenario the control-tower
  relay-mode-facts-only principle exists for** — this one turned out to be accurate on
  every checkable fact, but treating it as sufficient authority on its own (rather than
  requiring PK's own direct confirmation in this chat) would have been the wrong
  precedent to set for a hard T3 production-DML gate, independent of whether this
  particular instance was genuine.
- Reusable pattern: rehearsing the apply+rollback SQL inside one `BEGIN…ROLLBACK` via
  `execute_sql` immediately before the real `apply_migration` call is a cheap, high-value
  final check — it caught nothing wrong here, but would have caught a syntax or logic
  error before it touched production.
