# v3.52 — F-AVATAR-RENDER-LATENCY-RECOVERY Fix 1 close-out (PARTIAL COMPLETE — Fix 1 DEPLOYED / VERIFIED; lane stays OPEN)

**Date:** 2026-06-15 (Sydney)
**Status:** Fix 1 APPLIED & VERIFIED in production. Overall lane = **PARTIAL COMPLETE / OPEN** (forward mechanism repaired; historical population + recovery-policy decisions remain open).
**D-01:** `6516ed5a-8fea-4d20-af6a-304b9cd70a3d` (agree / low risk / high confidence / proceed). **PK-approved.**
**Register:** docs-only reconciliation at **v3.52** (`docs/00_action_list.md` + `docs/00_sync_state.md`).
**Authority impact:** none — queue hold/release timing is downstream of the decision tree; as-built flow + T1 unchanged.

---

## Part A — Root cause
`video_short_avatar` was omitted from the video-format IN-list in BOTH queue trigger functions:
- `m.gate_queue_on_asset_status()` (BEFORE INSERT on `m.post_publish_queue`) — so a pending avatar render's queue row was **not held** by the +4h gate.
- `m.release_queue_on_asset_ready()` (AFTER UPDATE OF image_status,video_status on `m.post_draft`) — so once the avatar video rendered, the queue row was **not released-with-preserved-schedule** like the other video formats.
Net effect: avatar drafts were exposed to early publish and lacked the intended-schedule recovery the other video formats already get.

## Part B — Implementation (list-only)
Migration `favatar_render_latency_recovery_fix1_gate_release_add_avatar` (commit `c7a41af`) added `'video_short_avatar'` to the video-format IN-list in both functions:
`(…,'video_short_kinetic_voice','video_short_stat_voice')` → `(…,'video_short_stat_voice','video_short_avatar')`.
**Unchanged:** image-format IN-list, the `+4h` hold, the Fix-1 release expression `GREATEST(COALESCE(post_draft.scheduled_for, slot.scheduled_publish_at), NOW())`, the `status='queued' AND scheduled_for > NOW()+30min` guard, LANGUAGE/SECURITY posture, and both triggers (`CREATE OR REPLACE` kept `trg_gate_queue_on_asset_status` + `trg_release_queue_on_asset_ready` bound).
- gate md5: `38fd402d845dbddca76c1d82b84760c8` → `658a09eb52712be1291c7245e35015c0`
- release md5: `81a3838841efaf60c11c40154ac8cd25` → `dbeda9b9b6518b0eaddb5620db7104f2`

## Part C — Verification
Pre-apply: PGlite **12/12** (real migration + bound triggers). Post-apply (live):
- Both function md5s changed (above); both triggers remained bound (2).
- `video_short_avatar` present in both video lists; absent from both image lists.
- Live controlled `BEGIN…ROLLBACK` test: avatar pending → queue **held +4h**; avatar generated → **released to the intended slot time (+120m)** (no NOW()-collapse, not stuck at +4h); a `failed` queue row **untouched** (release guard `status='queued'`); transaction rolled back → **0 test rows leaked**; **0** production/queue rows mutated.

## Part D — Remaining carries (lane OPEN)
- **Historical 20-row contaminated population** — avatar rows already contaminated by the YouTube cross-publish incident; NOT recovered this lane.
- **Instagram generated/published-readiness question** — whether IG avatar children are correctly gated/released end-to-end.
- **Recovery-sweep design** — how late/stuck avatar renders are swept and re-queued (forward fix protects new rows; an active recovery sweep is unbuilt).
- **YT historical-remediation dependency** — ties to YT-CROSSPUB-HISTORICAL-REMEDIATION (P2 OPEN).

## Part E — Rollback
Re-apply the two prior function bodies (baseline md5: gate `38fd402d845dbddca76c1d82b84760c8`, release `81a3838841efaf60c11c40154ac8cd25` — video list without `video_short_avatar`). No schema change, no data migration, triggers stay bound.

---

**Carry status after reconciliation (all remain OPEN):** YT positive-publish watch; YT-CROSSPUB-HISTORICAL-REMEDIATION; F-SERIES-FORMAT-DIVERSITY; F-SERIES-AVATAR-DIFFERENTIATION (Branch B); F-AVATAR-RENDER-LATENCY-RECOVERY (remaining phases). **Overall lane NOT marked complete.** Docs-only; 0 production mutation; 0 D-01 this pass.
