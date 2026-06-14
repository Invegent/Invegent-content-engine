# 2026-06-14 — F-SLOT-SCHEDULE-FIDELITY Fix 1: apply close-out (PARTIALLY RESOLVED — carry stays OPEN)

**Status:** Fix 1 APPLIED / VERIFIED in production. F-SLOT-SCHEDULE-FIDELITY overall = **PARTIALLY RESOLVED**; the carry **stays OPEN (P3)**.
**D-01:** `dc6d3bde-051f-4ea3-9fca-9f09217b1033` — verdict **partial / escalate=true**. **PK approved Option A and applied despite the reviewer escalation** (decision recorded).
**Register:** docs-only reconciliation recorded at **v3.47** (`docs/00_action_list.md` + `docs/00_sync_state.md`).

---

## 1. Problem (the early-publish mechanism)
When a held publish-queue row was released on asset-ready (image/video leaving `pending`), `m.release_queue_on_asset_ready()` **collapsed `queue.scheduled_for` to `NOW()`**, discarding the intended future schedule and letting the item publish immediately — the reproducible early-publish defect within the F-SLOT-SCHEDULE-FIDELITY class.

## 2. Fix 1 (applied)
- **Function:** `m.release_queue_on_asset_ready()` — body md5 `0fa656e14c7ac44087e103ea56fd73e3` → `0cdede8d1b6037b53ba78b957b64daa7`.
- **Migration:** `fslot_schedule_fidelity_fix1_release_preserve_intent` (APPLIED).
- **Behaviour:** on asset-ready, set
  `queue.scheduled_for = GREATEST(COALESCE(post_draft.scheduled_for, linked slot.scheduled_publish_at), NOW())`
  instead of `NOW()`. The **existing `queue.scheduled_for` is intentionally NOT used as a fallback** — it may carry the artificial `+4h` hold value. **Future intended schedules stay future; past / no-intent schedules release now.**
- **Unchanged:** trigger `trg_release_queue_on_asset_ready` remained bound; `gate_queue_on_asset_status` unchanged; `publisher_lock_queue_v1` / `v2` unchanged. No schema/signature change.

## 3. Verification (production)
- Future intended schedule **stayed future**.
- Past intended schedule **released now**.
- Draft/slot with no intent **released now**.
- Trigger live rollback test leaked **0 rows**.
- Reproduced early-publish mechanism **CLOSED**.
- No production test rows leaked.

## 4. Status — carry stays OPEN
F-SLOT-SCHEDULE-FIDELITY is **PARTIALLY RESOLVED**, not closed. Open follow-ups:
1. **Portal-path drift** — `draft_approve_and_enqueue` / `portal_approve_draft` still use `get_next_scheduled_for` and can discard slot/draft intent (separate path, not covered by Fix 1).
2. **fan_out_episode past-date clamp** — past episode times are clamped to `now()+1h`; needs a separate design decision.
3. **Rule-slot semantics** — decide whether the 24h fill-window / recurring-schedule behaviour is intended or needs adjustment.

## 5. Scope / footprint
The apply (migration) was a prior lane; **this reconciliation pass is docs-only — 0 code / 0 DB schema / 0 migration apply / 0 source / 0 dashboard / 0 deploy / 0 production mutation.** No source/dashboard/register/deploy changes were made in the apply lane either (single function redefinition via migration). **Authority impact: none** (queue-release timing is downstream of the decision tree; as-built flow + T1 unchanged).
