# 2026-06-13 — T0 Content Studio Governed Path: CLOSE-OUT (PASS WITH CARRY)

**Status:** T0 formally closed. Deployed under PK exact approval (D-01 `493c8728-5ae6-4a79-be73-6a94195b1494`, T0 scope). This record is the close-out evidence; register reconciliation is HELD (bundles with Fix 1 V-check results at the next CCD pass).
**Authority impact:** none (read-only close-out audit + this docs commit; no production mutation this lane).

---

## 1. T0 objective

Content Studio Single Post now enters ICE as **governed manual intent via a manual slot**, not via direct draft insert + queue-save auto-approve bypass. Manual input is allowed; manual bypass is removed. The operator brief + format preference are submitted to `public.create_manual_slot`, which materialises a `source_kind='manual'` slot carrying the brief; the standard slot-fill machinery then runs the identical governed chain (ai-worker → Advisor → compliance → auto-approval → render → queue → publish).

## 2. Deployment facts

- content-engine `main`: **`6978a12`** (merge of `feat/t0-manual-slot-governed-studio`; patch `7a29677c`).
- dashboard `main`: **`45f5328`** (merge of `feat/t0-studio-governed-save`; patch `933c61af`).
- ai-worker **v2.14.0 ACTIVE, deployment 111**.
- dashboard production deploy **READY: `dpl_2gPXpQKkzZAQ5xufqPFPsn1DtqL3`**.
- migration **`20260613005951` / `t0_manual_slot_governed_studio`** applied and verified (adds `m.slot.source_material` + `created_by`; `create_manual_slot` SECURITY DEFINER, service_role-only; `m.fill_pending_slots` manual branch — slot-carried brief, no canonical pool/dedup/evergreen, unchanged paths md5 `0e2ca3ba` proven byte-identical; `manual_post_insert` DEPRECATED comment + anon/authenticated EXECUTE revoked, retained for rollback). PGlite validation 39/39 (Cases A–D).

## 3. Verification slot

`55ec9b57-ab1e-4a2a-afb9-07c3eb9ff789` (client CFW; platform facebook; `created_by='content-studio:t0-live-verification'`; brief "We have two Support Coordinator position…"; preference `[image_quote]`).

## 4. End-to-end evidence (natural traversal, ~30 min)

window opens 01:05 → **fill** 01:10:00 (`slot_fill_attempt.decision=filled`, `chosen_format=image_quote`) → **ai_job** `6915e1a8` (`slot_fill_synthesis_v1`, status `succeeded`) → **draft** `fa53844f` (`created_by=fill_function`, `slot_id` linked, body 1195 chars) → **Advisor** (`recommended_format=image_quote` honouring preference, `recommended_reason` present) → **compliance** (`compliance_flags=[]` — ran clean) → **auto-approval** (`approved` by `auto-agent-v1`, `auto_approval_scores` present) → **render** (`image_status=generated`, `image_url` present — before queue) → **queue** 01:25 (single row `55d175c6`) → **publish** 01:35:15.

## 5. Publish evidence

- FB post ID **`1326372269667930`** (destination `109127508036155`, CFW page).
- `post_publish` `bce1ce0a…`: status `published`, **published 2026-06-13 01:35:15 UTC**, `attempt_no=1`, `error=null`.
- No retry, no dead-letter routing, no queue error.

## 6. Governance evidence

- `selected_canonical_ids = 0` → **slot-carried brief used; no canonical-pool fallback** (no cross-client pool selection).
- **No `manual_post_insert` usage** (0 `manual-studio` drafts since deploy; dashboard save route no longer calls it).
- **No direct queue bypass** — queue row created 01:25, 15 min after the draft, after approval *and* render; single governed enqueue.
- **No approval bypass** — threshold path via `auto-agent-v1` with scores (not a stamp; not queue-save auto-approve).
- **Compliance ran** (`[]`, not NULL).
- **Advisor ran** (format choice + reason).
- **Render completed before queue** (image asset present pre-enqueue).
- Duplicate integrity: 1 draft / 1 ai_job (by draft and by slot) / 1 fill attempt / 1 queue row — zero duplicates.
- Regression scan (48h, non-manual): 14 filled + 2 skipped fills; 7 `fill_function` drafts at 7/7 format, 7/7 compliance, 7/7 autoscore — automated path unchanged under v2.14.0.
- Legacy: `manual_post_insert` exists, DEPRECATED-commented, anon + authenticated EXECUTE revoked, retained for rollback; `create_manual_slot` service-role-only.

## 7. Close-out verdict

**PASS WITH CARRY.** Every governance control was exercised by a real production item and held; no regressions; rollback anchored (dashboard revert `45f5328` → Vercel redeploy; ai-worker redeploy v2.13.0 blob `8204a5c7`; DB re-apply pre-T0 `fill_pending_slots`, new columns/RPC inert if left).

## 8. Carries (separate from T0; not T0 defects)

- **F-SLOT-SCHEDULE-FIDELITY — P3, pre-existing/systemic:** slot `scheduled_publish_at` vs queue `scheduled_for` drift (verification item queued 01:30 vs slot 02:05; 8/19 *automated* fills in 14 days also >5 min early — predates the 00:59 T0 deploy). Register at reconciliation.
- **Post-publish queue-row deletion / dangling `queue_id` — P4 lineage-hygiene note, PK call:** published posts' queue rows are deleted (0/7 retained in 48h), leaving `post_publish.queue_id` dangling; observation only.
- **Fix 1 V-check — separate and PENDING:** next natural insights cycle 2026-06-13 03:00–03:15 UTC; shape-based predicates; bundles with F-INSIGHTS-DEPLOY-VERSION-DRIFT into the held register reconciliation.
- Minor T1-input note (not a reopen): manual slots created with `slot_confidence` NULL — NULL is non-replaceable under `try_urgent_breaking_fills` (`<= 0.65`), but the non-negotiable specified *explicitly high* confidence; address as one line in the T1/cleanup pass.

## 9. Recommendation

**T0 formally CLOSED.** **T1 (creative-intent parent) may open** after this close-out is committed, on its own gated brief per the decision brief (`docs/briefs/content-studio-decision-brief.md`, `e5529365`) sequencing. **T2 (post-render asset QA) remains DEFERRED.**

## 10. Constraint compliance (this lane)

Close-out audit: 2 read-only SQL sweeps + 2 repo commit listings + this docs commit. **0 code / 0 DB / 0 deploy / 0 forced runs / 0 new tests / 0 provider-publisher calls / 0 register edits.** T1 untouched. Registers held at v3.42 parity pending the bundled reconciliation.
