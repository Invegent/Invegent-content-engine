# Result — TMR Shadow-Mode Stamping — S0 Retroactive Batch

**Design authority:** `docs/briefs/tmr-shadow-mode-stamping-design-packet.md` (v4.80-accepted) · **Completed:** 2026-07-03 Sydney
**Status:** ✅ APPLIED + VERIFIED — **ICE's first shadow dataset exists: 17 would-have-vs-did records, production provably untouched**

## 1. What was applied (PK approval pinned to all three hashes, re-verified pre-apply)

| Artifact | sha256 | Applied as |
|---|---|---|
| `supabase/migrations/20260703064651_create_tmr_shadow_decision_v1.sql` | `14f29d3f…d8b108` | migration `create_tmr_shadow_decision_v1`, ledger version `20260703064651` (applied byte-identical; repo file renamed from the 20260703160000 draft stamp to the ledger version — content hash unchanged) |
| `_harness/s0-shadow-retroactive-batch.sql` | `1b969314…319d0a` | one-shot batch via execute_sql (byte-identical; all fail-loud assertions passed) |
| `_harness/s0-isolation-probes.sql` | `68b35cb1…411c36` | PRE + POST probes (read-only) |

Sequence executed exactly as accepted: migration → PRE-probe → batch → POST-probe → invariant diff → divergence report.

## 2. Production-isolation PROOF (the PK-accepted external-review requirement)

PRE vs POST invariant diff — **byte-identical on every production table**:

| Table | count | max(created_at) | max(updated_at) |
|---|---|---|---|
| m.post_draft | 2639 = 2639 | identical | identical |
| m.post_render_log | 2702 = 2702 | identical | n/a |
| m.post_publish_queue | 802 = 802 | identical | identical |
| m.post_publish | 1543 = 1543 | identical | n/a |
| **c.tmr_shadow_decision (expected delta)** | **0 → 17** | — | as designed |

Isolation was proven, not asserted. Production crons remained active throughout.

## 3. The shadow dataset (17 rows, batch_label `s0-retroactive-2026-07`)

- **Classification: 17× `expected_structural_divergence`** — exactly the pre-apply prediction (production's B1 template `fb9820f8…` is not in the TMR registry; per the ratified taxonomy this is structural, not selector failure). Zero `selector_fail_closed`, zero `selector_disagreement`.
- **Selector: 17/17 `ok`.** Winner deterministic on every row: **`generic_quote_card_1x1_v1`** (registry-order tiebreak; no variant intent supplied in S0).
- **Platform fence demonstrated live:** facebook rows (12) carry 8 ranked alternatives; instagram rows (5) carry 7 — the LinkedIn landscape card correctly rejected `platform_unsuitable` on instagram.
- **Asset comparison:** logo agrees 17/17 (`pp_logo_primary` both sides); **background agrees 5/17** — quantifying the design-predicted FNV-same-hash/different-list-order effect (B1 rotates `[perth,brisbane,sydney]`, resolver ranks `[perth,sydney,brisbane]`). A real calibration datum for any future alignment decision.
- **Every row carries** the full selector payload (selected + provider_template_id + proof evidence + slot_resolution + alternatives + rejected + warnings + context), production_actual (render_spec extract incl. rendered_at), divergence notes, `registry_context` (`selectable_count 10 / proposed 6 / visual_proofs 10` + the R2 stale-at-compute semantics label), `seed_used = post_draft_id`, `selector_version select_template_v1@20260703035154`, `computed_at`.

## 4. Gate trail

Design packet PK-accepted (v4.80, external design review escalation ACCEPTED → isolation-proof requirement) → ef-builder isolated worktree → 47/47 hermetic tests (all four real artifacts in PGlite), independently re-run 47/47 → branch-warden safe (`a3b3ffb`, artifacts byte-verified) → db-rls-auditor **PASS zero-must-fix** (incl. full read-only live dry-run predicting 17× structural + 0.077s selector runtime + probe-column verification) → security-auditor n/a-with-reason (no DEFINER, sibling-mirror grants, posture covered) → external review **agree/proceed zero-pushback** (`review_id f9dde79f-623b-468c-a108-51e509e1936c`, all hashes pinned) → PK three-hash approval → applied → this verification.

## 5. Non-claims / boundaries held

No render · no publish · no runtime caller · no dashboard caller · no Format Mix binding · no production enablement · no production_proven claim · no platform_publish proof · **no S1 forward stamping · no B1 registry capture** · no follow-on lanes started. Shadow rows grant no status and are consumed by nothing at runtime. Post-apply advisor state: one new INFO `rls_enabled_no_policy` lint on the shadow table, identical to siblings (intended posture, predicted).

## 6. Rollback (standing)

`DELETE FROM c.tmr_shadow_decision WHERE batch_label = 's0-retroactive-2026-07';` (exactly 17) or `DROP TABLE c.tmr_shadow_decision;` (zero references).

## 7. Carries (recorded, NOT started)

S1 forward stamping (own gate; cron-EF recommendation) · B1 registry capture before S1 (upgrades template comparability) · background-rotation order alignment decision (now data-backed: 5/17 agreement) · thin dashboard shadow/creative-plan panel · prior standing carries.
