# Apply Packet — B2 Stage 2: Invegent x market_insight_card Visual-Approval Promotion

**⚠ THIS PACKET CHANGES A LIVE PRODUCTION SELECTOR WINNER — the row-7→row-5 flip named in the
original B2 seed packet. Read fully before the apply gate.**

**Created:** 2026-08-02 Sydney
**Governing lane:** seed packet `b2-visual-verdict-promotion-and-proof`; split from the original
combined packet per PK instruction ("separate reviewed Stage-2 promotion packets... individual
apply gates").
**Forward SQL:** `supabase/migrations/20260802113000_b2_stage2_invegent_market_insight_visual_approval_v1.sql`
**Rollback SQL:** `supabase/migrations/ROLLBACK_20260802113000_b2_stage2_invegent_market_insight_visual_approval_v1.sql`
**Status:** DRAFT — pending review chain, then a separate PK apply-gate authorization. Not applied.

## 1. Task

Promote assignment `b2510001-0000-4000-8000-000000000001` (Invegent x
`generic_market_insight_card_1x1_v1`, `0e006c5c-45aa-4829-82ec-89dd282a8c56`, Row 5) from
`proposed` to `visually_approved`, and record the rung-6 proof event, per PK's verdict "three
visual are good" — given specifically on the v2 sitting card that stated: *"Your approval on this
card specifically authorises that flip."*

## 2. Ground truth

- Render: `6a41561f-219a-4ec0-8d32-f5db47c1f280`, 70466 bytes,
  sha256 `3836a2f42d70349bfcb36da424f02606811d4d9c47f5f8c0c41baf7cbdcc6705`.
- Re-verified live before drafting: assignment still `proposed`, unapproved.

## 3. Exact production consequence — verified, not estimated

Invegent's **current, live** `select_template` winner for `image_quote` is **Row 7**
(`generic_quote_card_1x1_v1`, `1cfe0f9c-3810-4bf1-8785-083fead4eefe`, assignment
`ecba211b-5217-4790-afe5-a2f98616712f`, `production_proven`) — this is Invegent's real,
currently-serving image_quote template.

Row 5 (this candidate) and Row 7 share an **identical `created_at`**
(`2026-07-02 11:12:41.987075+00`) and have **zero** `c.creative_template_selector_policy`
priority rows, so `select_template`'s tiebreak falls through to raw `template.id ASC` ordering,
which favours Row 5 (`0e006c5c...` sorts before `1cfe0f9c...`). **The instant this migration
commits, Row 5 becomes selectable and `select_template`'s winner for Invegent x
{facebook, instagram, linkedin, website} x image_quote flips from Row 7 to Row 5 — immediately,
with no further apply step.** Verified live by `db-rls-auditor` via direct `select_template` calls
against production, not inferred from status columns.

**Reversibility:** confined to Invegent only. NDIS/CFW/PP are unaffected by this packet (they
either don't hold this specific assignment or their own tiebreak resolves differently). The
rollback restores Row 7 as the winner again (Row 7's own `production_proven` assignment is
untouched in either direction).

## 4. Scope

Rung 6 only. No rungs 7-9. No other assignment row touched. No selector/capability function
touched — the flip is a **read-time consequence** of `select_template`'s existing tiebreak logic
reacting to this row's new state, not a direct change to any selector code or ranking rule.

## 5. Declared controls / assertion register (mechanically enforced — this section ONLY)

Same proven pattern as the NDIS/CFW packets. Per `apply-harness-auditor` review (findings AHA-01-1/
AHA-02-1/AHA-04-1, fixed below), this table now lists **only controls with real executable
enforcement** — the post-commit verification step is deliberately NOT in this table; see §5a.

| # | Control | Mechanism |
|---|---|---|
| 1 | Fail-closed on state drift | `WHERE id = '...' AND assignment_status = 'proposed'` on the UPDATE |
| 2 | Rowcount assertion in same DO block as its statement | Every UPDATE/INSERT wrapped with `GET DIAGNOSTICS`+`RAISE EXCEPTION` in one `DO $$...$$` |
| 3 | Target-state assertion | Dedicated `DO $$...$$` block, `COUNT(*)` on the 1 target ID |
| 4 | Real whole-table pool-neutrality assertion | `b2_stage2_invegent_baseline` temp table snapshot at transaction start; final block asserts `+1` exactly on both tables |
| 5 | Atomicity: single pooled call required | Migration + rollback headers now name the channel explicitly: one `mcp__supabase__apply_migration` call with the full script as `query`, or one un-split `psql -f` run — never split across tool calls (fixed post-AHA-04-1; the original header only used the descriptive phrase "single-pooled-call atomicity" without naming a channel) |
| 6 | Rollback identity + state guard | Rollback DELETEs the 1 proof-event ID, then UPDATE-reverts the 1 assignment ID guarded on `assignment_status='visually_approved' AND approved_by='PK'` |

## 5a. Post-commit operator checklist (manual, NOT mechanically enforced — deliberately separate from §5)

`apply-harness-auditor` (finding AHA-01-1) correctly flagged that the item below cannot be an
in-transaction "hard STOP": by the time it could run, the migration has already committed and the
live winner has already flipped. It is a **required human action taken immediately after commit**,
not a control this file enforces on itself. Listing it in §5 alongside mechanically-enforced
controls would overstate what the SQL actually guarantees — so it lives here instead:

- [ ] Immediately after commit, re-run `select_template('invegent', <each of facebook/instagram/
      linkedin/website>, 'image_quote', NULL, NULL)` and confirm the winner is now Row 5
      (`0e006c5c-45aa-4829-82ec-89dd282a8c56`) as predicted.
- [ ] **If the winner is anything other than Row 5:** something about the predicted tiebreak was
      wrong. Treat this as grounds to run the paired rollback immediately, not as a footnote to
      note and move past.

## 6. Forbidden actions

No synthetic proof rows beyond the 1 named. No promotion of any other row. No render/draft/publish
action. No deploy, no DDL. No change to Row 7's own assignment or `select_template`/
`creative_template_selector_policy` — the flip is accepted as a consequence, not engineered via a
separate change.

## 7. Success criteria

- Assignment reads `visually_approved`/`approved_by='PK'`/`approved_at` set.
- Exactly 1 new proof_event row, correctly attached via `assignment_id`.
- **`select_template` winner for Invegent x {facebook,instagram,linkedin,website} x image_quote
  is Row 5 (`0e006c5c...`) post-apply — this IS the expected, PK-authorised outcome, not a
  regression.** Row 7 becomes an alternative (not the winner) going forward.
