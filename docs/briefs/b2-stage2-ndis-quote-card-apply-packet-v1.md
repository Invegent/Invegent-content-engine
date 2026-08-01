# Apply Packet — B2 Stage 2: NDIS-Yarns x quote_card Visual-Approval Promotion

**Created:** 2026-08-02 Sydney
**Governing lane:** seed packet `b2-visual-verdict-promotion-and-proof`; split from the original
combined packet per PK instruction ("separate reviewed Stage-2 promotion packets... individual
apply gates").
**Forward SQL:** `supabase/migrations/20260802110000_b2_stage2_ndis_quote_card_visual_approval_v1.sql`
**Rollback SQL:** `supabase/migrations/ROLLBACK_20260802110000_b2_stage2_ndis_quote_card_visual_approval_v1.sql`
**Status:** DRAFT — pending review chain, then a separate PK apply-gate authorization. Not applied.

## 1. Task

Promote assignment `b2510001-0000-4000-8000-000000000002` (NDIS-Yarns x `generic_quote_card_1x1_v1`,
`1cfe0f9c-3810-4bf1-8785-083fead4eefe`) from `proposed` to `visually_approved`, and record the
rung-6 proof event, per PK's verdict "three visual are good" (2026-08-02).

## 2. Ground truth

- Render: `3c703230-d93c-4dae-8ea7-bf77678450fe`, 91268 bytes,
  sha256 `fde6b894fd9db3fc0d164141c0b93381c869b7851fa5e5b89bd0d8abe028eb5d`.
- Re-verified live before drafting: assignment still `proposed`, unapproved.
- **Production consequence (verified live by db-rls-auditor on the original combined packet,
  same facts apply unchanged to this single-row split):** NDIS-Yarns' current `select_template`
  winner for `image_quote` is Row 5 (`generic_market_insight_card_1x1_v1`, already
  `production_proven`) — **unchanged** by this apply. This candidate (Row 7) only becomes a newly
  eligible alternative. **No live-winner change.**

## 3. Scope

Rung 6 only. No rungs 7-9. No other assignment row touched (`WHERE id = <this row only>` on every
statement). No selector/capability function touched.

## 4. Declared controls / assertion register

Same proven pattern as the reviewed combined packet (apply-harness-auditor findings AHA-06-1 /
AHA-07-1 already incorporated from the start, not retrofitted):

| # | Control | Mechanism |
|---|---|---|
| 1 | Fail-closed on state drift | `WHERE id = '...' AND assignment_status = 'proposed'` on the UPDATE |
| 2 | Rowcount assertion in same DO block as its statement | Every UPDATE/INSERT wrapped with `GET DIAGNOSTICS`+`RAISE EXCEPTION` in one `DO $$...$$` |
| 3 | Target-state assertion | Dedicated `DO $$...$$` block, `COUNT(*)` on the 1 target ID |
| 4 | Real whole-table pool-neutrality assertion | `b2_stage2_ndis_baseline` temp table snapshot at transaction start; final block asserts `+1` exactly on both tables |
| 5 | Atomicity: single pooled call required | Header comment names it explicitly |
| 6 | Rollback identity + state guard | Rollback DELETEs the 1 proof-event ID, then UPDATE-reverts the 1 assignment ID guarded on `assignment_status='visually_approved' AND approved_by='PK'` |

## 5. Forbidden actions

No synthetic proof rows beyond the 1 named. No promotion of any other row. No render/draft/publish
action. No deploy, no DDL.

## 6. Success criteria

- Assignment reads `visually_approved`/`approved_by='PK'`/`approved_at` set.
- Exactly 1 new proof_event row, correctly attached via `assignment_id`.
- `select_template` winner for NDIS-Yarns x {facebook,instagram,linkedin} x image_quote unchanged
  post-apply (still `generic_market_insight_card_1x1_v1`) — this candidate appears only in
  `alternatives[]`.
