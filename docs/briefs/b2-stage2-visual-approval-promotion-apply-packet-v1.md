# Apply Packet — B2 Stage 2: Visual-Approval Promotion (13-rung ladder, rung 6)

**Created:** 2026-08-02 Sydney
**Author:** chat (Claude Code orchestrator)
**Governing lane:** seed packet `b2-visual-verdict-promotion-and-proof` (WS-1, Creatomate Global
Ultimate programme brief §3 WS-1); Stage 0 forensic reconstruction:
`docs/briefs/results/b2-visual-verdict-promotion-stage0-forensic-reconstruction-v1.md`.
**Forward SQL:** `supabase/migrations/20260802090000_b2_stage2_visual_approval_promotion_v1.sql`
**Rollback SQL:** `supabase/migrations/ROLLBACK_20260802090000_b2_stage2_visual_approval_promotion_v1.sql`
**Status:** DRAFT — pending review chain (apply-harness-auditor shadow · db-rls-auditor · external
review pinned to hash), then a **separate PK apply-gate authorization**. Not applied.

---

## 1. Task

Promote the 3 B2 Stage-1 dark `proposed` template-client assignments to `visually_approved` and
record the rung-6 proof event, per PK's direct verdict this session: **"all 3 cards are visually
passed."**

## 2. Ground truth this packet is built from

| Assignment ID | Client | Template | provider_template_name | Fresh preview render (2026-08-01) |
|---|---|---|---|---|
| `b2510001-...-000000000001` | invegent | `0e006c5c-45aa-4829-82ec-89dd282a8c56` | `generic_market_insight_card_1x1_v1` | `6a41561f-219a-4ec0-8d32-f5db47c1f280` |
| `b2510001-...-000000000002` | ndis-yarns | `1cfe0f9c-3810-4bf1-8785-083fead4eefe` | `generic_quote_card_1x1_v1` | `3c703230-d93c-4dae-8ea7-bf77678450fe` |
| `b2510001-...-000000000003` | care-for-welfare-pty-ltd | `1cfe0f9c-3810-4bf1-8785-083fead4eefe` | `generic_quote_card_1x1_v1` | `605e602f-00ed-4fd0-aeb7-13e04dcf24ae` |

Render provenance (Creatomate `api.creatomate.com`, this session, static-image JPGs, downloaded and
hashed locally):

| Candidate | render_id | bytes | sha256 |
|---|---|---|---|
| invegent_market_insight | `6a41561f-219a-4ec0-8d32-f5db47c1f280` | 70466 | `3836a2f42d70349bfcb36da424f02606811d4d9c47f5f8c0c41baf7cbdcc6705` |
| ndis_quote_card | `3c703230-d93c-4dae-8ea7-bf77678450fe` | 91268 | `fde6b894fd9db3fc0d164141c0b93381c869b7851fa5e5b89bd0d8abe028eb5d` |
| cfw_quote_card | `605e602f-00ed-4fd0-aeb7-13e04dcf24ae` | 67311 | `e42afe2cc93832e58c7492bd1b32ae3c123fd1ffce2d01e64c9dcaabb213c4d3` |

Re-verified live immediately before drafting this packet (2026-08-02): all 3 assignment rows still
read `assignment_status='proposed'`, `approved_by`/`approved_at` NULL — unchanged since B2 Stage 1
(2026-08-01 07:33:03 UTC). No other session has touched them.

## 3. What this apply does (rung 6 ONLY)

Per the graduation contract's own ladder (`docs/briefs/results/creatomate-registry-integrity-
graduation-contract-v1.md` §4), rung 6 requires "a `c.creative_template_proof_event` row,
`proof_type='visual_approval'`, `proof_status='passed'`, with a concrete evidence reference,
attached to the SPECIFIC client assignment being graduated." This packet:

1. UPDATEs each of the 3 assignment rows: `assignment_status: proposed -> visually_approved`,
   `approved_by: NULL -> 'PK'`, `approved_at: NULL -> now()`.
2. INSERTs 3 new `c.creative_template_proof_event` rows (deterministic IDs `b2520001-...-00000000000{1,2,3}`,
   matching the `b2510001-...` assignment-ID naming convention from B2 Stage 1), `proof_type='visual_approval'`,
   `proof_status='passed'`, `evidence_reference` = the render_id, `evidence_kind='creatomate_render_id_pk_visual_verdict'`,
   `assignment_id` set to the specific assignment row, `recorded_by` naming the exact PK verdict quote,
   date, and which render it covers.

## 4. Explicitly OUT of scope — NOT authorised by this apply

- **Rungs 7-9** (supervised real render through the actual worker path, real-draft render into
  `m.post_draft`, publish proof) — these are named as **separate apply gates** in the governing seed
  packet ("apply gates separate, then real render→draft→publish proof events up the 13-rung
  ladder"). This packet stops at rung 6.
- No change to `assignment_scope`, `style_guide_reference`, or any other assignment column.
- No change to any OTHER assignment row (`WHERE id = <specific row>` on every statement — no bulk
  update).
- No change to `select_template`, `classify_format_capability`, `resolve_slot_assets`, or any
  selector/capability function.
- No real editorial content — the preview renders used each template's own `default_value_safe`
  placeholder text (recorded in the proof-event `recorded_by` field), not real headline/quote copy.
  A future rung 7+ apply that generates a real draft must not treat this rung-6 approval as approval
  of specific editorial content, only of the template/branding fit.
- `task_05bf8b3d` scope check (unchanged from Stage 0D): that STOP condition gates unattended
  `announcement_card` selection specifically. Neither `market_insight_card` nor `quote_card` is
  `announcement_card`, and this apply is a PK-attended, explicit promotion, not unattended selection.
  **Not triggered by this packet** — but rungs 7-9's eventual publish step should re-confirm this
  scope check independently at that time, since it concerns a different template family.

## 5. Declared controls / assertion register (for apply-harness-auditor)

| # | Declared STOP / control | Executable mechanism |
|---|---|---|
| 1 | Each of the 3 UPDATEs only fires on `assignment_status='proposed'` (fail-closed if state drifted) | `WHERE ... AND assignment_status = 'proposed'` clause on every UPDATE |
| 2 | Every UPDATE's rowcount is checked in the SAME statement scope as the UPDATE (no separate-statement `FOUND` check — the known defect class from the graduation-contract packet) | Each UPDATE and its `GET DIAGNOSTICS v_rows = ROW_COUNT; IF v_rows <> 1 THEN RAISE EXCEPTION` live inside one `DO $$ ... $$` block |
| 3 | Every INSERT's rowcount is checked the same way | Same `DO $$ ... GET DIAGNOSTICS ... $$` pattern on each INSERT |
| 4 | Target-state assertion: exactly 3 rows visually_approved+approved_by='PK' among the 3 target IDs, and exactly 3 proof_event rows with the 3 target IDs, BEFORE commit | `DO $$ ... $$` block with `COUNT(*) ... WHERE id IN (...)` assertions, inside the same transaction, before `COMMIT` |
| 4b | **Real** pool-neutrality assertion (whole-table, not just target-state): a `b2_stage2_baseline` temp table snapshots total `visually_approved` assignment count + total `proof_event` count at transaction start; a final block asserts each grew by exactly +3 — proves nothing OTHER than these 3 rows changed either table's population | `CREATE TEMP TABLE b2_stage2_baseline ON COMMIT DROP AS SELECT ...` right after `BEGIN`, compared in a dedicated `DO $$ ... $$` block before `COMMIT` (added post-apply-harness-auditor review, finding AHA-06-1 — the original assertion was mislabeled as pool-neutrality when it only checked target-state) |
| 5 | Atomicity: the whole packet is ONE transaction (`BEGIN...COMMIT`) that must run as a single pooled call | Header comment names the requirement explicitly: one `apply_migration` call or one un-split `psql -f`/`execute_sql` run — never split |
| 6 | Rollback identity: rollback targets the exact same 6 IDs (3 assignment rows + 3 proof-event rows) the forward migration touches, nothing else | `ROLLBACK_20260802090000_...sql` — DELETE by the 3 proof-event IDs, then UPDATE-revert the 3 assignment IDs, each with its own rowcount assertion |
| 7 | Rollback state guard: each rollback UPDATE only reverts a row still in the exact forward-applied state (`assignment_status='visually_approved' AND approved_by='PK'`) — if a later apply has moved a row past rung 6, the guard excludes it and the rowcount assertion fails closed with a named exception, instead of silently reverting later legitimate state | `WHERE id = '<literal>' AND assignment_status = 'visually_approved' AND approved_by = 'PK'` on each rollback UPDATE, with a rowcount-mismatch exception naming the drift explicitly (added post-apply-harness-auditor review, finding AHA-07-1 — the original rollback guarded only on `id`, relying on an operator to manually re-check state first, which the auditor correctly flagged as a mechanical gap despite being disclosed in prose) |
| 8 | Baseline coverage: ground truth (assignment state, render IDs, sha256) captured immediately before packet authoring, not from stale memory | §2 above, re-verified live 2026-08-02 |

## 6. Forbidden actions (repeated from the governing seed packet)

- No synthetic proof-event rows for anything beyond what PK actually verdicted (only rung 6 —
  visual approval on the exact 3 rendered candidates named above).
- No assignment promotion beyond the 3 named rows.
- No render→draft→publish action of any kind in this packet.
- No deploy, no EF change, no schema/DDL change (this is DML on 2 existing tables only).

## 7. Success criteria

- All 3 assignment rows read `assignment_status='visually_approved'`, `approved_by='PK'`,
  `approved_at` set, post-apply.
- Exactly 3 new `creative_template_proof_event` rows exist, each correctly attached via
  `assignment_id` to its specific assignment row.
- `select_template` output for the 3 affected (client, platform, image_quote) cells is unchanged
  immediately after apply (still resolves to each client's PRE-EXISTING production_proven winner —
  `visually_approved` alone does not make a row selectable; `select_template`'s own
  `selectable_definition` requires `visually_approved+ AND passed visual_approval proof`, so
  **this apply may in fact newly make these templates selectable/eligible as alternatives** — this
  is expected and should be checked post-apply, not assumed away).
- No other row in either table changed.

## 8. Stop condition

Any assertion failure inside the transaction aborts the whole apply (transaction rolls back
automatically) — no partial state possible. Any review-chain finding above `concerns`
(non-blocking) halts before this packet is presented for the PK apply gate.
