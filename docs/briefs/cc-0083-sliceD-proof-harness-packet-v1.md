# cc-0083 Slice D — role-lens production proof (contained) — packet v1

**Created:** 2026-07-27 Sydney · **Lane:** cc-0083 · **Slice:** D (production proof)
**Tier:** T3 (production DML on a publish-live client + real HeyGen renders) · **Gate:** PK proof-write gate
**Governing brief:** `docs/briefs/cc-0083-avatar-role-lens-selection-gate1-v1.md`
**PK proof gate:** stop if deploy verification fails (PASSED) or a selected character ≠ the script's stakeholder lens.

---

## 1. Goal

Prove in production that the **script's stakeholder lens selects the matching governed avatar**, via the now-deployed seam (ai-worker v2.23.0 writes `stakeholder_role`; heygen-worker v2.5.0 role-matches / default-host fallback). Four contained NDIS-Yarns avatar drafts:

| # | persona `avatar_preference` | ai-worker should write `stakeholder_role` | heygen should select | expected `talking_photo_id` |
|---|---|---|---|---|
| 1 | `role_code=support_coordinator; presenter=…` | support_coordinator | **Sarah** | `7e98bd3860f14ee18c9b4909e46ac77c` |
| 2 | `role_code=participant; presenter=…` | participant | **Alex** | `b3a7e888d11843d79cd66f61a8f941f4` |
| 3 | `role_code=local_area_coordinator; presenter=…` | local_area_coordinator | **Marcus** | `45addba04379432b8c2854097f91bce0` |
| 4 | unclear (no `role_code`, vague audience) | *(unset)* | **default host (Sarah)** | `7e98bd38…` + `role_fallback`/no-role |

Draft 4 proves "default_host only when no clear role" — the confidence gate (<0.6) leaves `stakeholder_role` unset → heygen resolves the default host.

## 2. Containment (MANDATORY — NDIS publishes live on 4 platforms)

- **All 4 proof drafts use `platform='linkedin'`.** heygen renders regardless of platform (no platform filter in its submit predicate, `heygen-worker/index.ts:467-472`); youtube/facebook/instagram publishers never match `platform='linkedin'`; **both LinkedIn lanes hard-block video → `status='skipped'`** (`linkedin-zapier-publisher/index.ts:47-49,206`). Result: full render, zero external post.
- **NEVER `platform='youtube'`** — youtube-publisher self-selects from `post_draft` with no queue/dry-run gate (`youtube-publisher/index.ts:259-265`).
- **Belt-and-suspenders:** pre-insert `m.post_publish_queue (post_draft_id, platform='linkedin', status='skipped')` for each proof draft so the enqueue cron (jobid 48) `ON CONFLICT (post_draft_id, platform) DO NOTHING` can never create a `queued` row.
- **Post-capture neutralize:** once each draft's avatar selection is captured, flip `approval_status='rejected'`, `video_status='archived_stale'` (rejected by every publisher and by heygen submit) — removes any residual publish eligibility.
- **Tagging:** every row carries `created_by='ice-stakeholder-proof'` and sentinel `[ICE-STAKEHOLDER-PROOF-2026-07-27]` in `source_material`, for identify + cleanup.

## 3. Row plan (per proof unit — 4×) — SHAPES for db-rls-auditor to validate against live schema

Direct-insert path (most controlled; the governed studio RPCs do NOT write a persona). Order per unit:

1. `m.creative_intent` — `client_id=NDIS`, `intent_kind='episode'`, `source_material` = `{ "brief":"[ICE-STAKEHOLDER-PROOF-2026-07-27] <lens>", "persona": { "persona_label":…, "avatar_preference":"role_code=<code>; presenter=…", "persona_notes":… } }`, `format_preference` avatar, `created_by='ice-stakeholder-proof'`.
2. `m.slot` — `client_id=NDIS`, `platform='linkedin'`, `format_preference='{video_short_avatar}'`, `source_kind='manual'`, `intent_id=<intent>`, `source_material` sentinel, `created_by='ice-stakeholder-proof'`, a near-term `scheduled_publish_at`.
3. `m.post_draft` — `client_id=NDIS`, `slot_id=<slot>`, `intent_id=<intent>`, `platform='linkedin'`, `recommended_format` initially null/needs_review (ai-worker sets `video_short_avatar`), `approval_status='needs_review'`, `created_by='ice-stakeholder-proof'`.
4. `m.ai_job` — `client_id=NDIS`, `slot_id=<slot>`, `post_draft_id=<draft>`, `job_type='slot_fill_synthesis_v1'`, `status='queued'`, `input_payload` = `{ "format":"video_short_avatar", "synthesis_mode":"manual", "format_preference_explicit":true }`, `created_by='ice-stakeholder-proof'`.

**db-rls-auditor must return:** the exact NOT NULL / CHECK / FK / default columns for `m.creative_intent`, `m.slot`, `m.post_draft`, `m.ai_job`, `m.post_publish_queue` so the final INSERTs are complete and valid; confirm `intent_kind='episode'` and `source_kind='manual'` pass live CHECKs; confirm the unique keys (`post_draft(slot_id)`, `ai_job(post_draft_id,job_type)`) won't collide; confirm no trigger auto-enqueues/publishes on insert; and confirm the containment analysis (platform routing + LinkedIn video block + enqueue ON CONFLICT) against live definitions.

## 4. Execution sequence (after PK gate)

1. Insert the 4 units + 4 `post_publish_queue` skipped rows (one governed `execute_sql`/migration, fail-closed assertion: exactly 4 tagged drafts, all `platform='linkedin'`).
2. Trigger ai-worker (cron `ai-worker-every-5m` jobid 5, or `POST /ai-worker` with `x-ai-worker-key` if the key is available). Verify each draft now has `draft_format.video_script.stakeholder_role` = the expected role for units 1-3, unset for unit 4. **Checkpoint A** (the ai-worker half of the proof).
3. Flip the 4 drafts `approval_status='approved'` (heygen pickup) — safe under `platform='linkedin'` containment.
4. Trigger heygen-worker (cron jobid 44, or `POST /heygen-worker` with `x-heygen-worker-key`=PUBLISHER_API_KEY). It submits to HeyGen and freezes `draft_format.avatar_identity` (with `requested_stakeholder_role` + `role_fallback_to_default_host`). **Checkpoint B** (the selection proof — the load-bearing observable).
5. Let renders complete; read `m.post_render_log.render_spec.avatar_identity` per draft.
6. **Neutralize** all 4 (`approval_status='rejected'`, `video_status='archived_stale'`) once selection is captured.

## 5. Success criteria (the proof)

- Unit 1 → `stakeholder_role='support_coordinator'` AND selected `talking_photo_id='7e98bd38…'` (Sarah), `role_fallback_to_default_host=false`.
- Unit 2 → `stakeholder_role='participant'` AND `talking_photo_id='b3a7e888…'` (Alex).
- Unit 3 → `stakeholder_role='local_area_coordinator'` AND `talking_photo_id='45addba0…'` (Marcus).
- Unit 4 → `stakeholder_role` unset AND selected = default host `7e98bd38…` (Sarah), telemetry shows no-role/default.
- **Three distinct `talking_photo_id`s across units 1-3** (the discriminating check) + persona name/role via `persona_name`+`role_label`.
- **Containment proof:** zero external posts — `m.post_publish` gains no new NDIS rows for these drafts; LinkedIn queue rows stay `skipped`.
- **Gate:** any selected character ≠ its lens → STOP and surface to PK.

## 6. Cleanup / reversibility

Identify by `created_by='ice-stakeholder-proof'`. Neutralize (§4.6), then remove child-first: `m.ai_job` → `m.post_publish_queue` → `m.post_draft` → `m.slot` → `m.creative_intent`. Rendered MP4s (LinkedIn-contained) may be left in storage or deleted; they never posted.

## 7. Non-claims

Proof exercises the deployed seam on NDIS realistic avatars only. It does not activate new avatars, change production cadence, or publish. It does not prove multi-character dialogue (the named following outcome).
