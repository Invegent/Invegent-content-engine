# Intake Packet — PP Video B-roll · Perth Skyline (E1) · FENCED

**Lane:** pp-video-broll-perth-intake (2026-07-08) · **Tier:** T3 (production storage + governed-registry DML; FIRST video asset; NEW shape) · **Label:** PRODUCT_PROOF
**Status:** ✅ **APPLIED 2026-07-09** — fenced row `asset_id 42211c0f-6d06-4780-950a-a4a1d61b880b` + object stored; all four guards passed; live pool 25→25 (neutrality held).
**Asset:** `_harness/pp_video_broll_v0/clips/broll_pp_perth_skyline_e1_1080p.mp4` (1080p HD encode — the 4K master exceeded the project storage upload limit; PK-approved right-size 2026-07-09)

## What this does (and does NOT do)
Uploads ONE clip to the `brand-assets` bucket and inserts ONE **fenced** `c.client_brand_asset` row (approved=false, is_active=false, approval_status=`intake_candidate`). It is **inert**: no resolver reads video B-roll today, so the row cannot enter any live pool. It does NOT promote, does NOT touch the live image pool, does NOT deploy or wire any worker.

## Asset facts (verified)
- sha256 (local bytes): `ca832fe2c0bf1e15759950520b321d3c144c403d387db29a606b913c7defae72` · 59,268,092 bytes
- 1920×1080 (16:9) · h264 · 29.97fps · **16.05s** · **no audio stream** · HD encode of the same Perth clip (id 31663066) the v5 proof used (identical footage, lower resolution)
- Source: Pexels "Aerial View of Perth City Skyline in Spring" (id 31663066), Pexels License (free commercial, no attribution)
- Content: verifiable **Perth WA** CBD skyline — Swan River, Kings Park, Elizabeth Quay, CBD towers, blue sky. Geo-authentic.
- Text-safety/crop proof: v5 render `footage_v5_perth_gradient.mp4` (sha `11a7105c…`) + frames `renders/frames_v5/` — gradient scrim, all text legible, no legible third-party signage in frame. PK visual-approved the design direction ("I love it", 2026-07-08).

## Shape decisions (why this is a NEW shape → full chain, not image-shape reuse)
- Table `c.client_brand_asset`, `asset_type='other'` (same as static backgrounds).
- `asset_meta.usage='broll_background'` — NEW value (vs image `'background'`); `mime='video/mp4'`; NEW video keys `duration_s/fps/has_audio/motion/loopable`. → mechanically a new shape; full db-rls-auditor + external review required.
- Bucket `brand-assets`, new path prefix `Property_Pulse/Broll/`.

## Upload target
`brand-assets/Property_Pulse/Broll/broll_pp_perth_skyline.mp4`
→ public URL `https://mbkmaxqhsohbtwsqolns.supabase.co/storage/v1/object/public/brand-assets/Property_Pulse/Broll/broll_pp_perth_skyline.mp4`

## Governed FENCED INSERT (exact)
```sql
insert into c.client_brand_asset
  (client_id, asset_type, asset_name, asset_url, is_active, platform_scope, asset_meta)
values (
  '4036a6b5-b4a3-406e-998d-c2fe14a8bbdd',
  'other',
  'Perth city skyline (aerial B-roll) background video',
  'https://mbkmaxqhsohbtwsqolns.supabase.co/storage/v1/object/public/brand-assets/Property_Pulse/Broll/broll_pp_perth_skyline.mp4',
  false,                                   -- is_active fence
  array['youtube']::text[],                -- video publish target; inert while fenced (DECISION D-scope below)
  jsonb_build_object(
    'mime','video/mp4', 'bytes',59268092, 'usage','broll_background',
    'width',1920, 'height',1080, 'duration_s',16.05, 'fps',29.97,
    'has_audio',false, 'motion','calm_slow_aerial', 'loopable','loop_point_at_16s_smooth_later',
    'bucket','brand-assets',
    'sha256','ca832fe2c0bf1e15759950520b321d3c144c403d387db29a606b913c7defae72',
    'license','Pexels License', 'license_type','pexels_license',
    'license_url','https://www.pexels.com/license/', 'attribution_required',false,
    'approved',false, 'production_use_allowed',false, 'approval_status','intake_candidate',
    'asset_key','broll_pp_perth_skyline',
    'geography','au_wa_perth',
    'label_constraint','Verifiable Perth WA CBD (Swan River/Kings Park/Elizabeth Quay). Label Perth/WA OK (it IS Perth). Geo-authentic for PP.',
    'source_site','pexels', 'source_pexels_id','31663066',
    'source_url','https://www.pexels.com/video/aerial-view-of-perth-city-skyline-in-spring-31663066/',
    'original_download_url','https://videos.pexels.com/video-files/31663066/13490523_1920_1080_30fps.mp4',
    'aspect_ratio','16:9', 'render_crop','cover-crop to 9:16 (centre: skyline+river)', 'source_resolution','1920x1080 HD (4K master right-sized for storage limit; same footage)',
    'visual_style','footage_video',
    'safe_for_text_overlay','needs_gradient_scrim',
    'text_safety','no legible third-party signage in the v5 gradient-scrim proof (orchestrator visual review)',
    'ai_exclusion','n/a — real drone footage (Pexels), not AI-generated',
    'visual_review_verdict','ACCEPT_VISUAL_ONLY',
    'template_ref','video_short_stat_footage_v5_perth_source.json (gradient scrim design of record)',
    'proof_artifacts','_harness/video_tmr/footage_proof_v1_result.md; renders/footage_v5_perth_gradient.mp4 (sha 11a7105c…)',
    'intake_lane_batch','pp-video-broll-perth-intake (2026-07-08)',
    'pk_design_approval','PK "I love it" 2026-07-08 — design direction (footage+gradient); clip promotion is a SEPARATE future gate'
  )
);
```

## Per-apply guards (NEVER waived — run in the apply transaction / around it)
1. **Byte-verify** local file sha256 == `ca832fe2…` immediately before upload.
2. **Post-upload public-URL sha256** == `ca832fe2…` (download the just-uploaded object, re-hash).
3. **Pool-neutrality assertion (in-txn, fail-closed):** pinned to the EXACT live selector predicate (db-rls-auditor). Assert this count is IDENTICAL before and after, ROLLBACK on mismatch. **MEASURED NOW = 25.**
   ```sql
   select count(*) from c.client_brand_asset
   where client_id='4036a6b5-b4a3-406e-998d-c2fe14a8bbdd'
     and asset_meta->>'usage' in ('background','logo')
     and is_active=true and (asset_meta->>'approved')::boolean is true
     and coalesce(asset_meta->>'bucket','')='brand-assets';   -- must remain 25
   ```
   (Row is excluded from the live pool three ways: usage='broll_background' ∉ ('background','logo') scanned by `resolve_slot_assets`; is_active=false; approved=false.)
4. **branch-warden** clean before/after (no repo mutation in this lane; git parity check).

## Rollback (proven before apply)
`delete from c.client_brand_asset where asset_id = <returned id>;` + delete the uploaded storage object `Property_Pulse/Broll/broll_pp_perth_skyline.mp4`. Row is fenced+inert, so rollback is complete and side-effect-free.

## Open items for PK
- **Upload mechanism (BLOCKER):** storage upload needs the Supabase service-role key (T3 secret) or PK uploads the mp4 via the dashboard. No storage-upload tool is available in this session. **How do you want the upload done?**
- **D-scope — platform_scope on the fenced row:** proposed `['youtube']` (video's proven publish target). Inert while fenced. OK, or mirror fb/ig/li, or leave null?
- **Apply authorization:** the upload + INSERT is the T3 hard stop. Approve as a Convention-2 sequence (pinned to this packet hash) or step-by-step.

## Review chain status
- [x] db-rls-auditor (read-only) — **pass** (2 should_fix incorporated: guard-3 pinned to usage IN (background,logo)=25; INSERT identity = owner not service key)
- [x] external review — **agree** on 4K packet (review_id 16ba8adb, hash d31bae22); re-review on 1080p re-pin **partial→PK-escalate** (review_id eff07386, hash c2b96dd4) = `policy_decision` (quality sign-off, no defect) → **PK cleared "proceed"**
- [x] branch-warden — **safe** (main @ eb50f56, even with origin, no in-flight op)
- [x] PK apply gate — **cleared** (PK "apply" + "proceed"; platform_scope=['youtube'])

## Applied outcome (2026-07-09)
- **Asset (right-sized):** 1080p HD, sha256 `ca832fe2c0bf1e15759950520b321d3c144c403d387db29a606b913c7defae72`, 59,268,092 bytes (4K master 413'd the storage limit; PK raised project upload limit to 200 MB).
- **Object:** `brand-assets/Property_Pulse/Broll/broll_pp_perth_skyline.mp4` (storage id b9334ce3-b3d6-4fac-bd1d-2d826c530834) · guard-2 public-URL sha256 verified == local.
- **Row:** `asset_id 42211c0f-6d06-4780-950a-a4a1d61b880b` — fenced (is_active=false, approved=false, production_use_allowed=false, approval_status=intake_candidate, usage=broll_background, platform_scope=['youtube']).
- **Pool-neutrality:** live-eligible bg/logo pool 25 → 25 (in-txn fail-closed assertion + independent post-read).
- **Rollback handle (if needed):** `delete from c.client_brand_asset where asset_id='42211c0f-6d06-4780-950a-a4a1d61b880b';` + delete the storage object. Row is fenced+inert.
- **Auth gotcha:** the new-format `sb_secret_` key needs BOTH `apikey` + `Authorization: Bearer` headers for the storage REST API (Bearer-only → 403 "Invalid Compact JWS"); INSERT ran via MCP owner identity (service_role is SELECT-only on this table).
