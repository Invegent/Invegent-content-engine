# Result cc-0049 — Invegent Governed Quote-Card Winner Mapping (image-worker v3.33.0)

**Reviewed source (immutable anchor):** commit `e522e54e1c278fdbdc860eacec3416555fbcb043`
(branch + annotated tag `cc-0049-invegent-quote-card-winner-mapping-reviewed-anchor`, parent `5a6c998`).
**Canonical on main:** `e232607ae7b44708e2061b8249cda46c0ebe74a6` (byte-identical cherry-pick of the anchor onto `origin/main` `194e43e`).
**Completed:** 2026-07-23 Sydney — **DEPLOYED, RUNTIME PROVEN, VISUAL PASS; PUBLISH + BACKLOG HELD.**

---

## 1. Result status

`CLOSED — DEPLOYED, RUNTIME PROVEN, VISUAL PASS; BACKLOG/PUBLISH HELD.` image-worker `v3.33.0` is live and
proven in production via a single controlled render of the Invegent governed quote-card; the proof draft and
the five backlog drafts are held (no publish, no backlog release).

## 2. Change (additive, image-worker v3.32.0 → v3.33.0)

Maps the Invegent governed quote-card **winner** from the authoritative governed element capture
(`c.creative_provider_template_field` for provider template `2140ca19-d075-49d3-9dc9-30d924805e22`), clearing the
fail-closed guard `tmr_winner_unmapped` for `generic_quote_card_1x1_v1`; adds optional contract-sourced brand
fields (attribution `Invegent — AI & Automation`, source_label `invegent.com`) and a NEW fail-closed guard
`tmr_winner_brand_fields_missing`. No legacy winner/client output changed (proven byte-identical); the
`tmr_winner_unmapped` unknown-winner guard is retained.

**Changed files: exactly 9** (all byte-identical to the reviewed anchor `e522e54`):
`_harness/cc0049/apply_contract.py`, `supabase/functions/ai-worker/creative_contract.ts`,
`supabase/functions/image-worker/{index.ts, b1_production.ts, b1_production_test.ts, branch_b_proof.ts,
cc0048_registry_recovery_test.ts, cc0049_quote_card_winner_test.ts, creative_contract.ts}`.

## 3. Integration + reconciliation (T3)

- Reviewed diff SHA-256 `git diff 5a6c998 e522e54` = **`52801b4d74535a654a3711e124e82a658d6c9fdb6ad889384f47b09d85c742f8`**;
  the integration diff `git diff 194e43e e232607` reproduces the **same hash** (the 9 files are untouched in the
  intervening `5a6c998..194e43e` range — docs/registers only, 0 runtime touches).
- All 9 blobs byte-identical to the anchor; conflict-free cherry-pick → `e232607`.
- main fast-forwarded `194e43e..e232607` (no force); `5a6c998` (v3.32.0 source) retained in history; parity clean.

## 4. Review chain

- **branch-warden:** `safe` (integration branch, isolated worktree, 9-path set exact, blobs == anchor, not-pushed pre-gate).
- **External review:** `b36ae844-1e68-4729-941b-5c4101d12a79` — **agree / proceed** (risk medium, confidence high,
  zero pushback), pinned to `reviewed_input_hash = 52801b4d…c742f8`.
- **Tests: carried evidence (173 passed / 0 failed)** on the tested commit `e522e54`. Tests were **NOT re-executed**
  in the Linux container — JSR deps blocked by egress policy (jsr.io 403); **no bypass / shim / alternate assertion
  framework** used. Basis: deterministic byte-equivalence carryover (hash reproduces, 9 blobs identical, intervening
  main docs-only, test code byte-identical). PK accepted this for the packet.
- **Post-deploy independent verify (ground truth): PASS** — deployed bundle contains only `image-worker-v3.33.0`
  (no v3.32.0 residue), cc-0049 marker `tmr_winner_brand_fields_missing`, winner mapping + provider template,
  `tmr_winner_unmapped` guard intact; `verify_jwt=false`; PP/NDIS/CFW mappings unchanged; ai-worker NOT redeployed;
  advisors name 0 cc-0049 objects; drift B-FD → A-LE (severity none).

## 5. Controlled production proof

- **Containment:** the two newly-arrived drafts (`e3d11975`, `b3a4aa42`) contained `pending→skipped` before the gate
  (fail-closed, fingerprint-invariant); joined `26aaa129`/`33a9acf9`/`e7867c8c`/`fe80a01e` → six contained.
- **Cadence control:** cron job **27** (`image-worker-15min`) paused, `26aaa129` released `skipped→pending` as the
  **sole** global-eligible image_quote draft, cron resumed for **exactly one** execution (05:15:00 UTC, `succeeded`),
  re-paused, then restored `active=true` at end-state.
- **Runtime proof:** `26aaa129` → `generated`; **one** successful `m.post_render_log` row (no duplicate; 15 prior were
  the old failed attempts); winner **`generic_quote_card_1x1_v1`**, provider template **`2140ca19-…`**,
  `fallback_taken=false`, assignment `ecba211b-5217-4790-afe5-a2f98616712f`, governed slots
  (bg `bg_shared_datacentre_server.jpg`, logo `invegent_logo_square_brand_bg`; governed/license_ok/text_safe/client_match).
  Creatomate render `654b7a6d-23ff-4071-a62d-69b6d5809c32`; storage
  `…/post-images/invegent/26aaa129-….jpg`. Note: DB brand contract absent at render
  (`contract_validation.status=warn`) — brand fields supplied by the image-worker's own cc-0049 contract; the new
  `tmr_winner_brand_fields_missing` guard did NOT fire.
- **Visual gate — PK PASS:** attribution exactly `Invegent — AI & Automation`, source `invegent.com`, footer
  `Invegent`, quote from headline, correct Invegent logo + background, no placeholder/clipping/overprint, correct
  hierarchy + brand presentation.
- **No side effects:** asset-ready trigger did not move any queue earlier; five backlog drafts remained `skipped`;
  unrelated LinkedIn text draft `6a23e01a` untouched; **no publish** occurred.

## 6. Editorial hold (post-close)

To prevent auto-publish of the proof render, draft `26aaa129` + queue `318f0d58` `scheduled_for` were aligned to
**`2026-07-31 00:00:00+00`** in one fail-closed transaction (exactly 1 draft + 1 queue row; content/approval/slot/
`image_status=generated`/queue `status=queued` all unchanged; no publish row). **This is a temporary editorial hold —
publish requires a separate PK release decision; it is NOT auto-authorized for 2026-07-31.**

## 7. Backlog disposition

Five drafts remain `image_status='skipped'`: `e7867c8c`, `fe80a01e`, `33a9acf9`, `e3d11975`, `b3a4aa42`.
Classification: **`TECHNICALLY RECOVERABLE — EDITORIAL FRESHNESS REVIEW REQUIRED`** (several carry historical /
near-historical publishing dates; technical recoverability ≠ content timeliness). **No bulk-recovery lane opened.**

## 8. Constraints respected

No rollback (v3.33.0 kept live; v3.32.0 source retained at `5a6c998` as the ready rollback). No ai-worker deploy,
backlog recovery, publish, slot mutation, F-C repair, cc-0047 work, sourcing, or drain. Cron restored `active=true`
(not left paused).

## 9. Verdict

`CLOSED — DEPLOYED, RUNTIME PROVEN, VISUAL PASS; BACKLOG/PUBLISH HELD.`
