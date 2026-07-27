# cc-0083 Slice D — role-lens production proof (contained) — packet v2

**Created:** 2026-07-27 Sydney · **Lane:** cc-0083 · **Slice:** D · **Tier:** T3 · **Gate:** PK proof-write gate
**Supersedes v1:** applies db-rls-auditor's 5 must-fix column completions + should-fix notes; containment verdict was **CONTAINED** (no leak path). Containment design unchanged.

---

## 1. Goal + expected matches (unchanged from v1 §1)

Four contained NDIS avatar drafts prove the script's stakeholder lens selects the matching avatar:

| # | lens (`avatar_preference`) | expected `stakeholder_role` | expected avatar | `talking_photo_id` |
|---|---|---|---|---|
| 1 | `role_code=support_coordinator; …` | support_coordinator | Sarah | `7e98bd3860f14ee18c9b4909e46ac77c` |
| 2 | `role_code=participant; …` | participant | Alex | `b3a7e888d11843d79cd66f61a8f941f4` |
| 3 | `role_code=local_area_coordinator; …` | local_area_coordinator | Marcus | `45addba04379432b8c2854097f91bce0` |
| 4 | *(no role_code — neutral narrator)* | *(unset)* | default host (Sarah) | `7e98bd38…` |

## 2. Containment — CONTAINED (db-rls-auditor verified against live definitions)

`platform='linkedin'` on all 4 + pre-inserted `post_publish_queue status='skipped'` rows. youtube-publisher direct-reads `platform='youtube'` only (excludes linkedin); fb/ig/li publishers lock only `status='queued'` queue rows (ours are `skipped`); enqueue cron 48 has a NOT EXISTS guard + `ON CONFLICT DO NOTHING`; the render-complete trigger only reschedules existing `queued` rows; linkedin-zapier additionally hard-blocks video. **Standing conditions:** never `platform='youtube'`; keep the skipped rows; run cleanup promptly after neutralize (rejection reopens the slot to `pending_fill`).

## 3. Apply SQL — insert the 4 proof units + 4 skipped queue rows (one `execute_sql`, atomic DO block, fail-closed)

```sql
DO $$
DECLARE
  v_client uuid := 'fb98a472-ae4d-432d-8738-2273231c1ef4';  -- NDIS-Yarns
  v_intent uuid; v_slot uuid; v_draft uuid;
  v_base timestamptz := now();
  r record;
  units jsonb := '[
    {"n":1,"label":"NDIS participants seeking help coordinating their supports","pref":"role_code=support_coordinator; presenter=a warm, knowledgeable support coordinator explaining how to navigate NDIS plans","notes":"Practical, reassuring."},
    {"n":2,"label":"People new to the NDIS wanting a peer perspective","pref":"role_code=participant; presenter=an NDIS participant sharing lived experience in first person","notes":"Authentic, first-person."},
    {"n":3,"label":"Community members asking how to access the NDIS","pref":"role_code=local_area_coordinator; presenter=a Local Area Coordinator explaining the NDIS access pathway","notes":"Informative, steady."},
    {"n":4,"label":"General NDIS news roundup for a broad mixed audience","pref":"","notes":"No specific stakeholder role; neutral narrator."}
  ]'::jsonb;
BEGIN
  FOR r IN SELECT value AS obj FROM jsonb_array_elements(units) LOOP
    INSERT INTO m.creative_intent
      (client_id, intent_kind, source_material, target_platforms, format_preference, status, created_by)
    VALUES (
      v_client, 'episode',
      jsonb_build_object(
        'brief', '[ICE-STAKEHOLDER-PROOF-2026-07-27] '||(r.obj->>'label'),
        'persona', jsonb_build_object(
          'persona_label',     r.obj->>'label',
          'avatar_preference', r.obj->>'pref',
          'persona_notes',     r.obj->>'notes')),
      ARRAY['linkedin'], 'video_short_avatar', 'active', 'ice-stakeholder-proof'
    ) RETURNING intent_id INTO v_intent;

    INSERT INTO m.slot
      (client_id, platform, scheduled_publish_at, fill_window_opens_at, format_preference,
       source_kind, intent_id, source_material, status, created_by)
    VALUES (
      v_client, 'linkedin',
      v_base + ((r.obj->>'n')::int * interval '1 hour'),
      v_base + ((r.obj->>'n')::int * interval '1 hour') - interval '30 minutes',
      ARRAY['video_short_avatar'], 'manual', v_intent,
      '[ICE-STAKEHOLDER-PROOF-2026-07-27] unit '||(r.obj->>'n'), 'future', 'ice-stakeholder-proof'
    ) RETURNING slot_id INTO v_slot;

    INSERT INTO m.post_draft
      (client_id, slot_id, intent_id, platform, draft_body, approval_status, created_by)
    VALUES (
      v_client, v_slot, v_intent, 'linkedin',
      '[ICE-STAKEHOLDER-PROOF-2026-07-27] placeholder — ai-worker fills draft_format',
      'needs_review', 'ice-stakeholder-proof'
    ) RETURNING post_draft_id INTO v_draft;

    INSERT INTO m.ai_job
      (client_id, platform, slot_id, post_draft_id, job_type, status, input_payload)
    VALUES (
      v_client, 'linkedin', v_slot, v_draft, 'slot_fill_synthesis_v1', 'queued',
      jsonb_build_object('format','video_short_avatar','synthesis_mode','manual','format_preference_explicit',true)
    );

    INSERT INTO m.post_publish_queue (post_draft_id, client_id, platform, status)
    VALUES (v_draft, v_client, 'linkedin', 'skipped');
  END LOOP;

  -- Fail-closed assertions (containment + count)
  IF (SELECT count(*) FROM m.post_draft WHERE created_by='ice-stakeholder-proof') <> 4 THEN
    RAISE EXCEPTION 'Slice D: expected 4 proof drafts, got %',
      (SELECT count(*) FROM m.post_draft WHERE created_by='ice-stakeholder-proof');
  END IF;
  IF EXISTS (SELECT 1 FROM m.post_draft WHERE created_by='ice-stakeholder-proof' AND platform IS DISTINCT FROM 'linkedin') THEN
    RAISE EXCEPTION 'Slice D: a proof draft is not platform=linkedin — containment breach, aborting';
  END IF;
  IF (SELECT count(*) FROM m.post_publish_queue q JOIN m.post_draft d ON d.post_draft_id=q.post_draft_id
        WHERE d.created_by='ice-stakeholder-proof' AND q.status='skipped') <> 4 THEN
    RAISE EXCEPTION 'Slice D: expected 4 skipped publish-queue rows';
  END IF;
END $$;
```

**Fixes applied vs v1** (per db-rls-auditor contract): `creative_intent.target_platforms=ARRAY['linkedin']`; `slot.fill_window_opens_at` set 30m before `scheduled_publish_at` (satisfies `fill_window_opens_at <= scheduled_publish_at`); 4 DISTINCT `scheduled_publish_at` (base + n·1h → no `idx_slot_unique_active` collision); `post_draft.draft_body` placeholder; `ai_job.platform='linkedin'` (FK-valid). `intent_kind='episode'` passes the relaxed CHECK; `creative_intent.format_preference` is scalar text.

## 4. Execution sequence (after PK gate)

1. Run §3 (insert). Verify: 4 tagged drafts, all `platform='linkedin'`, 4 skipped queue rows.
2. Trigger **ai-worker** (cron `ai-worker-every-5m` jobid 5, or `POST /ai-worker` `x-ai-worker-key` if key available). **Checkpoint A:** each draft's `draft_format.video_script.stakeholder_role` = expected role (units 1-3), unset (unit 4); `recommended_format='video_short_avatar'`, `video_status='pending'`.
3. Flip the 4 drafts `approval_status='approved'` (heygen pickup; safe under containment).
4. Trigger **heygen-worker** (cron jobid 44, or `POST /heygen-worker` `x-heygen-worker-key`=PUBLISHER_API_KEY). **Checkpoint B (load-bearing):** `draft_format.avatar_identity` per draft — `talking_photo_id` matches the expected avatar; `requested_stakeholder_role` + `role_fallback_to_default_host` telemetry.
5. Let renders complete; read `m.post_render_log.render_spec.avatar_identity`.
6. **Neutralize** all 4 (`approval_status='rejected'`, `video_status='archived_stale'`), then **cleanup promptly** (§6) — rejection reopens the slot to `pending_fill`.

## 5. Success criteria / gate

- Units 1-3: `stakeholder_role` = expected AND `talking_photo_id` = expected avatar (3 DISTINCT ids) AND `role_fallback_to_default_host=false`.
- Unit 4: `stakeholder_role` unset AND selected = default host (Sarah) — the no-clear-role fallback.
- Containment: no new `m.post_publish` rows for these drafts; queue rows stay `skipped`.
- **STOP** if any selected character ≠ its lens (PK gate), or if any containment assertion trips.

## 6. Cleanup (child-first, prompt)

Neutralize (§4.6), then delete by `created_by='ice-stakeholder-proof'`: `m.ai_job` → `m.post_publish_queue` → `m.post_draft` → `m.slot` → `m.creative_intent`. (FK `intent_id` is SET NULL, not CASCADE — delete children explicitly.)

## 7. Runtime handoffs (db-rls-auditor open questions — verified at execution)

- Checkpoint A depends on the deployed ai-worker (v2.23.0) picking up `job_type='slot_fill_synthesis_v1'` and firing the A2 avatar override → `suggestAvatarRole` → `promoteAvatarRole`. Traced in the liveness report (ai-worker/index.ts:1176-1181, 1355-1376); confirmed live at Checkpoint A.
- `is_active` on `c.brand_stakeholder` is true for all 7 roles (role list the LLM sees), but only 3 have active AVATARS — units 1-3 map to those 3; unit 4 yields null. No 4th avatar activation needed.
