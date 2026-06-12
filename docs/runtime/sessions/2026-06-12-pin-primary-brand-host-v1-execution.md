# 2026-06-12 — EXECUTION RECORD: `pin_primary_brand_host_v1` APPLIED (cc-a2-branch-a-host-pin, Branch A interim primary brand host v1)

**Status:** EXECUTED in production `mbkmaxqhsohbtwsqolns` under full gate chain.
**Approval chain:** brief `docs/briefs/cc-a2-branch-a-host-pin.md` (commit `bdc320ef`) → Stage 0 preflight ALL-PASS (read-only, same session) → D-01 fired → escalation accepted by PK as type-(c)/non-blocking with corrected action absorbed → **PK exact approval phrase received: `PK APPROVES APPLY pin_primary_brand_host_v1`** → `apply_migration` → V-checks ALL-PASS.
**Registers:** NOT updated (separate approval required). T1 untouched. No avatars created; no HeyGen/provider/worker calls; no forced render; no Advisor/ai-worker/format-policy/Option C change.

---

## 1. D-01 review

- **review_id:** `ab14f105-0ec0-4122-b707-a36d178774bb`
- **Result:** `escalate=true`, verdict `partial`, risk `medium`, confidence `medium`. Verified claims: UPDATE-only, nothing deleted, straightforward rollback, preconditions/assertions prevent erroneous updates. Pushback points (LIMIT-1 long-term stability unproven on 2 data points; future dashboard re-activation could un-pin) classified per protocol as **type-(c) echoes of self-disclosed weak evidence** — no genuine type-(b) blocking objection. **PK accepted the escalation as type-(c)/non-blocking** and directed absorption of the corrected action: (1) record the dashboard reactivation / un-pin discipline note (§6); (2) Stage 3 passive telemetry confirmation on next scheduled render (§7).

## 2. Migration applied

`apply_migration` name **`pin_primary_brand_host_v1`** — single DO block, UPDATE-only on `c.brand_avatar`, with pinned-row preconditions (exists / active / correct client / realistic / exact `heygen_avatar_id`) and post-update assertions (13 deactivated per brand; exactly 1 active per brand; active row = pinned row) aborting the transaction via `RAISE EXCEPTION` on any mismatch.

**Apply incident (transparent):** the first apply attempt aborted on `42883: function min(uuid) does not exist` — a syntax fault in the **assertion plumbing** of the prepared block (Postgres has no `min(uuid)` aggregate). The DO block is transactional: both UPDATEs rolled back; a read-only re-check confirmed state untouched (14/14 active both brands). Re-applied with `min(brand_avatar_id::text)::uuid` in the two verification reads — **the UPDATE statements and approved scope were unchanged**. Second apply: `success`. Lesson noted: add `min/max(uuid)` to the PG-compat pre-author checklist alongside the reserved-word check.

**Pins applied:**
- **NDIS Yarns → Support Coordinator (Realistic)** — `brand_avatar_id 83ff167d-a844-4e1c-9d1a-d8ff257c11bc`, heygen `7e98bd3860f14ee18c9b4909e46ac77c`, voice `P2AIevlJPypjV8xL6zXE`
- **Property Pulse → Buyer's Agent (Realistic)** — `brand_avatar_id d6c422fb-9dc5-4bcc-aba6-2e6e942f2cdd`, heygen `5d03454fbd0c469692f1a27ccbe6a000`, voice `D2UxCOjgDceKldjA4JrK`

## 3. Row counts

| Metric | Before | After |
|---|---|---|
| NY total / active / inactive | 14 / 14 / 0 | 14 / **1** / 13 |
| PP total / active / inactive | 14 / 14 / 0 | 14 / **1** / 13 |
| NY+PP total rows | 28 | 28 (0 deleted) |
| Rows deactivated | — | **26** |
| CFW / Invegent `brand_avatar` rows | 0 / 0 | 0 / 0 (untouched) |

## 4. V-check results (read-only, immediately post-apply) — ALL PASS

- **V1 ✅** NY active-count = 1 and the active row IS `83ff167d…` Support Coordinator (Realistic) / heygen `7e98bd38…`.
- **V2 ✅** PP active-count = 1 and the active row IS `d6c422fb…` Buyer's Agent (Realistic) / heygen `5d03454f…`.
- **V3 ✅** NY+PP total rows still 28.
- **V4 ✅** 26 rows deactivated (13 per brand), 0 deleted.
- **V5 ✅** CFW and Invegent unchanged — both still have zero `brand_avatar` rows (out of scope).
- **V6 ✅** Rollback SQL remains valid — all 26 target `brand_avatar_id`s exist (28 total − 2 active = 26 inactive).

## 5. Rollback SQL (held ready; restores all 28 rows active)

```sql
UPDATE c.brand_avatar SET is_active = true, updated_at = now()
WHERE brand_avatar_id IN (
  -- NDIS Yarns (13)
  'def60dc5-e164-4327-91fd-9732d9d377e9','d8b120bd-bf1c-4474-b8c1-60847961febe',
  '43a0bcec-34cd-428d-91da-480c4e1bef36','46f429a2-01ea-45fd-b979-f65e1ca0e556',
  '1f789894-23b6-42b1-bcfd-d8d6df832227','e792744c-0963-4270-a82a-64894e0a49be',
  '3c013cfd-58e9-49ba-86c7-5632ca9ebca9','67d63cc2-3a6c-4982-9518-c80e5f9fd237',
  '8a570aee-29f8-41b5-b3c7-33ccb108846c','97e1aa1c-b8fd-4251-b6d3-488cc1c11ab3',
  'a86ee55b-1ef9-4135-9c96-5cac3f942751','e0480c84-3ab8-4ba9-98ba-acc633656417',
  '5fa041cd-3eeb-42d4-87e8-6f937a98eca7',
  -- Property Pulse (13)
  '79fb3457-0a94-4402-9883-c2cb14250a41','5b59c12e-7ba3-4e60-88aa-66ce2c027b0a',
  'b5141b9b-236a-4350-a258-2a7061786158','780eed30-2c6a-42db-a9aa-71d0ff7a0e4b',
  'f994af6f-b0fa-4f3b-8224-8cc6234b49c5','72d338a3-a36c-4a09-a6c9-5d28f6bc4fbb',
  '5b9b8b2b-02dc-4fce-a383-dcb6364926c1','c04b0be4-7eba-412d-9649-b25086254ed3',
  '167e207f-44fd-4150-8c05-e9bb7248e789','b51c900c-c107-4cab-9b2b-0f260f668a3b',
  'da849f7b-df52-419d-bc41-b973bef642da','1ac2904b-0cc8-4957-9bf6-bb381a77f0f1',
  '8ea306dd-0151-4eea-b4b6-ffa3c0040c6b'
);
```
(If executed, run via `apply_migration` under its own approval. Full 28-row manifest with names/roles/voices is in this session's preflight and in `docs/runtime/sessions/2026-06-12-a2-branch-a-avatar-host-selection.md`.)

## 6. Dashboard reactivation / un-pin discipline note (D-01 corrected action, part 1)

The dashboard RPC `public.assign_brand_avatar(p_brand_avatar_id, …)` sets `is_active=true` on any row by ID — **any future dashboard avatar action can silently break the single-active pin**, returning heygen-worker's `LIMIT 1` to arbitrary selection. Standing discipline until Branch B ships: do not activate additional NY/PP avatar rows from the dashboard without an explicit re-pin decision. `get_brand_avatars` returns all rows with `is_active` status, so the deactivated cast remains visible (flagged, not hidden). Candidate for a register carry note at the next register pass.

## 7. Stage 3 — passive telemetry watch (D-01 corrected action, part 2)

**Watch requirement (NO forced render, NO worker invocation):** on the next scheduled NY and PP avatar renders, `m.post_render_log.render_spec->avatar_identity->talking_photo_id` must equal `7e98bd3860f14ee18c9b4909e46ac77c` (NY) / `5d03454fbd0c469692f1a27ccbe6a000` (PP), with `avatar_selected_by='fallback_limit1'` now deterministic. Note: 2 stale NY drafts at `video_status='pending'` (since 06-04, awaiting approval) would inherit the pinned host if approved — desired. If a future script ever carried `render_style='animated'` or a non-matching `stakeholder_role`, `lookupAvatar` would return null and that submit would fail — currently impossible (ai-worker hardcodes realistic; role always null); Branch B consideration.

## 8. Constraint compliance

Mutations this lane: **1 applied migration (`pin_primary_brand_host_v1`, 26 UPDATEs, 0 deletes) — nothing else.** 0 avatars created / 0 HeyGen or provider calls / 0 worker invocations / 0 forced renders / 0 Advisor / 0 ai-worker / 0 format-policy / 0 Option C / 0 register edits / 0 T1 changes. D-01 fired once (`ab14f105`); PK exact approval phrase received before apply; first-apply syntax abort rolled back cleanly and was verified before re-apply.
