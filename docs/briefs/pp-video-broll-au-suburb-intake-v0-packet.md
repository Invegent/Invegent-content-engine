# Intake Packet — PP Video B-roll · Generic AU Suburb Aerial · FENCED

**Lane:** pp-video-broll-au-suburb-intake (2026-07-10) · **Tier:** T2 (P2 tier-right-sized — SAME shape as E1, full chain already run for this shape) · **Label:** PRODUCT_PROOF
**Status:** ✅ **APPLIED 2026-07-10** — object uploaded + fenced row `asset_id 2d62b04e-c1b5-44df-b382-59cbb991e166`; guards 1–3 pass; live pool 25→25 (neutrality held); 0 selectable B-roll. **No commit, no push.** See "Applied outcome" at the foot.
**Asset:** `_harness/pp_video_broll_v0/resource_20260710/clips/broll_pp_au_suburb_aerial_1080p.mp4`
**Replaces:** C1 (`37643438`, signage) and D1 (`31475221`, non-AU geography) — both REJECTED.

## What this does (and does NOT do)
Uploads ONE clip to the `brand-assets` bucket and inserts ONE **fenced** `c.client_brand_asset` row
(all four fences off). It is **inert**: no resolver reads video B-roll today, and no B-roll-capable
Creatomate template exists, so the row cannot enter any live pool or render. It does NOT promote,
does NOT touch the live image pool, does NOT deploy or wire any worker.

## PK decision of record (2026-07-10)
Accepted as **generic Australian suburban B-roll, restricted to national stats.**
**NOT** geo-authentic Perth the way E1 is.

> ### ⚠️ The constraint is documentation, not enforcement
> `label_constraint` on this row records the restriction. **Carry C1 means `label_constraint` is NOT
> enforced by the renderer today.** Nothing in the pipeline prevents a Perth-labelled headline from
> rendering over this Sydney footage. The field below is a note for humans and for the future
> enforcement work — it is **not a guard, and must never be cited as one.** Until C1 closes, the only
> thing standing between this clip and a mislabelled render is that the row is fenced and no
> B-roll-capable template exists.

## Asset facts (measured from the encode that will be uploaded)
- **sha256 (upload bytes):** `4c89358d842db974c16354c88fb0e920bc2bd81ad24ff5c4ef7222a413da8885` · **53,749,478 bytes**
- 1080×1920 **native 9:16** (no crop) · h264 High · yuv420p · 29.97 fps · **29.03 s** · **no audio stream**
- Trimmed **0 → 29.0 s** of the 49.98 s master. Out-point pinned by horizon scan: clean through
  t=29; a mid-rise tower enters frame-left at t=31; distant CBD skyline visible from ~t=37.
- **Source master:** `2160×3840` 4K portrait, 404,726,903 bytes, sha256
  `bdb57aa5896a818b253bd43524b15e3407ded8d84dc93f38d3ea16c3e519b633` (right-sized: the 4K master is
  2× over the 200 MB storage limit, same problem E1's master hit). Encode is byte-deterministic.
- **Source:** Pexels "Aerial View of Suburban Sydney Neighborhood" (id `31663307`), Macourt Media —
  the same uploader as E1's Perth clip. Pexels License (free commercial, no attribution).
- **Content:** Hurstville, Sydney NSW. Terracotta tile + Colorbond roofs, brick veneer, rooftop solar,
  eucalypts, backyard pools, left-hand kerbside parking. Verifiably Australian; **not Perth.**
- **Text-safety:** no legible third-party signage across 7 sampled full-res frames + two 2× zooms
  (`zoom_31663307_t30_{0,1}.jpg`). Encode re-proofed at t=0/7/14/21/28 (`encode_proof_sheet.jpg`).
  A residential construction site appears mid-clip; its hoarding carries no legible text at any zoom.
- **Motion:** slow forward aerial drift. Within the calm-motion rule.

## P2 mechanical shape-diff vs E1 → **SAME SHAPE** (verified against E1's live row, not its packet text)

| # | Check | Result |
|---|---|---|
| 1 | same table `c.client_brand_asset` | ✅ |
| 2 | same `asset_type='other'` | ✅ |
| 3 | identical written-column set (`client_id, asset_type, asset_name, asset_url, is_active, platform_scope, asset_meta`) | ✅ |
| 4 | all four fences present-and-false | ✅ |
| 5 | same eligibility-relevant `asset_meta` keys (usage·bucket·license·license_type·safe_for_text_overlay·sha256·asset_key) | ✅ |
| 6 | no new eligibility-touching keys — identical 38-key set as E1 (`jsonb_object_keys` on `42211c0f…`) | ✅ |
| 7 | `bucket='brand-assets'` | ✅ |
| 8 | no DDL | ✅ |
| 9 | no GRANT/REVOKE | ✅ |
| 10 | no `ON CONFLICT`/upsert | ✅ |

→ **T2, tier-right-sized.** The full `db-rls-auditor` + external chain ran once for this shape at E1
(review `16ba8adb`). Per-apply guards below are **NOT** waived.

## Upload target
`brand-assets/Property_Pulse/Broll/broll_pp_au_suburb_aerial.mp4`
→ `https://mbkmaxqhsohbtwsqolns.supabase.co/storage/v1/object/public/brand-assets/Property_Pulse/Broll/broll_pp_au_suburb_aerial.mp4`

## Governed FENCED INSERT (exact)
```sql
insert into c.client_brand_asset
  (client_id, asset_type, asset_name, asset_url, is_active, platform_scope, asset_meta)
values (
  '4036a6b5-b4a3-406e-998d-c2fe14a8bbdd',
  'other',
  'Generic AU suburban aerial (B-roll) background video',
  'https://mbkmaxqhsohbtwsqolns.supabase.co/storage/v1/object/public/brand-assets/Property_Pulse/Broll/broll_pp_au_suburb_aerial.mp4',
  false,                                   -- is_active fence
  array['youtube']::text[],                -- mirrors E1; inert while fenced
  jsonb_build_object(
    'mime','video/mp4', 'bytes',53749478, 'usage','broll_background',
    'width',1080, 'height',1920, 'duration_s',29.03, 'fps',29.97,
    'has_audio',false, 'motion','calm_slow_aerial', 'loopable','no_loop_point_identified',
    'bucket','brand-assets',
    'sha256','4c89358d842db974c16354c88fb0e920bc2bd81ad24ff5c4ef7222a413da8885',
    'license','Pexels License', 'license_type','pexels_license',
    'license_url','https://www.pexels.com/license/', 'attribution_required',false,
    'approved',false, 'production_use_allowed',false, 'approval_status','intake_candidate',
    'asset_key','broll_pp_au_suburb_aerial',
    'geography','au_nsw_sydney_hurstville',
    'label_constraint','GENERIC AU SUBURB ONLY. Footage is Hurstville, Sydney NSW — NOT Perth. Use only with national/AU-wide stats. Must NEVER be labelled Perth or WA. NOTE: this constraint is NOT machine-enforced (carry C1: label_constraint is not read by the renderer) — it is documentation only.',
    'source_site','pexels', 'source_pexels_id','31663307',
    'source_url','https://www.pexels.com/video/aerial-view-of-suburban-sydney-neighborhood-31663307/',
    'original_download_url','https://videos.pexels.com/video-files/31663307/13490632_2160_3840_30fps.mp4',
    'aspect_ratio','9:16', 'render_crop','none — native 9:16 portrait',
    'source_resolution','2160x3840 4K portrait master (sha bdb57aa5…), trimmed 0–29.0s and scaled to 1080x1920 for the 200 MB storage limit',
    'visual_style','footage_video',
    'safe_for_text_overlay','needs_gradient_scrim',
    'text_safety','no legible third-party signage across 7 sampled full-res frames + two 2x zooms; encode re-proofed at t=0/7/14/21/28 (orchestrator visual review 2026-07-10)',
    'ai_exclusion','n/a — real drone footage (Pexels), not AI-generated',
    'visual_review_verdict','ACCEPT_GENERIC_AU_ONLY',
    'template_ref','none — no B-roll-capable template exists yet; background-footage lane is later',
    'proof_artifacts','_harness/pp_video_broll_v0/resource_20260710/RESOURCE_SHORTLIST_FINDING.md; encode_proof_sheet.jpg; trimscan_sheet.jpg; horizon_scan.jpg; zoom_31663307_t30_{0,1}.jpg',
    'intake_lane_batch','pp-video-broll-au-suburb-intake (2026-07-10)',
    'pk_design_approval','PK 2026-07-10 — accept as generic-AU suburban B-roll, national stats only; explicitly NOT geo-authentic Perth. Fenced-first, no promotion.'
  )
);
```

## Per-apply guards (NEVER waived)
1. **Byte-verify** local file sha256 == `4c89358d…` immediately before upload.
2. **Post-upload public-URL sha256** == `4c89358d…` (re-download the object, re-hash).
3. **Pool-neutrality assertion (in-txn, fail-closed):** pinned to the exact live selector predicate.
   **MEASURED 2026-07-10 = 25.** Assert identical before and after; ROLLBACK on mismatch.
   ```sql
   select count(*) from c.client_brand_asset
   where client_id='4036a6b5-b4a3-406e-998d-c2fe14a8bbdd'
     and asset_meta->>'usage' in ('background','logo')
     and is_active=true and (asset_meta->>'approved')::boolean is true
     and coalesce(asset_meta->>'bucket','')='brand-assets';   -- must remain 25
   ```
   (Excluded from the live pool three ways: `usage='broll_background'` ∉ `('background','logo')`;
   `is_active=false`; `approved=false`.)
4. **branch-warden** clean before/after.

## Rollback (validated before apply)
`delete from c.client_brand_asset where asset_id = <returned id>;` + delete the storage object
`Property_Pulse/Broll/broll_pp_au_suburb_aerial.mp4`. Row is fenced+inert, so rollback is complete
and side-effect-free. Identical to E1's proven rollback.

## 🛑 BLOCKER — what PK must do
**There is no storage-upload tool in this session.** Same blocker as E1. Two ways forward:

- **(a) PK uploads via the Supabase dashboard.** Upload
  `_harness/pp_video_broll_v0/resource_20260710/clips/broll_pp_au_suburb_aerial_1080p.mp4`
  to bucket `brand-assets`, path `Property_Pulse/Broll/`, object name
  `broll_pp_au_suburb_aerial.mp4`. Then I run guard 2 (public-URL sha256) and the fenced INSERT.
- **(b) PK authorises a service-role key** for a scripted upload.
  Gotcha from E1: the new-format `sb_secret_` key needs **both** `apikey` **and**
  `Authorization: Bearer` headers on the storage REST API (Bearer-only → 403 "Invalid Compact JWS").
  This is a **read-only secret USE** → T2 + Gate-1 secret-handling rider (never in transcript).

The INSERT must run via MCP owner identity — `service_role` is SELECT-only on this table (E1 finding).

## Review chain status
- [x] Pixel verification (geography · signage · motion · trim point) — orchestrator, 2026-07-10
- [x] P2 mechanical shape-diff vs E1 live row — **SAME SHAPE** → tier-right-sized
- [x] Pool-neutrality baseline measured — **25**
- [x] PK visual verdict + Sydney-vs-Perth decision — **ACCEPT, generic-AU, national stats only**
- [ ] `db-rls-auditor` — **not required** (same shape; chain ran at E1). Substitution named here per CCF-02 R1.
- [ ] external review — **not required** (same shape, no DDL/grant/deploy)
- [x] PK apply gate — **cleared** (PK "go ahead and move it forward", 2026-07-10; upload authorised separately)
- [x] `branch-warden` — **stop**, resolved to benign (see Applied outcome). Ran POST-apply, not pre-apply.

---

# Applied outcome (2026-07-10)

- **Object:** `brand-assets/Property_Pulse/Broll/broll_pp_au_suburb_aerial.mp4`, storage id
  `fe35641d-6d76-42bd-a744-a34153055077`. Uploaded with `x-upsert:false` (no silent overwrite).
- **Row:** `asset_id 2d62b04e-c1b5-44df-b382-59cbb991e166` — fenced. `is_active=false`,
  `approved=false`, `production_use_allowed=false`, `approval_status=intake_candidate`,
  `usage=broll_background`, `platform_scope=['youtube']`, **38 asset_meta keys**.
- **Guard 1 (byte-verify):** PASS — local sha256 `4c89358d…` == packet.
- **Guard 2 (public-URL sha256):** PASS — object re-downloaded anonymously (no key), re-hashed
  `4c89358d…`, 53,749,478 bytes, `content_type: video/mp4`.
- **Guard 3 (in-txn fail-closed pool-neutrality):** PASS — asserted 25 before, 25 after, inside the
  `DO` block; would have raised and rolled back on any drift. Independent post-read confirms **25**.
- **Selectability proof:** `broll_background` rows = 2 (E1 + this), **selectable = 0**.
- **Key-set parity vs E1:** symmetric difference **0** (0 keys new-not-in-E1, 0 keys E1-not-in-new)
  — same-shape claim holds against the live rows, not just the packets.
- **Guard 4 (branch-warden):** returned **`stop`**, and it was **run after the apply, not before** —
  a real sequencing deviation from the packet, recorded here rather than smoothed over. Its stop
  reasons, adjudicated:
  1. *HEAD drifted; commit `9b9063c` unreachable from HEAD.* **Benign, resolved.** The parallel
     audio-gate session committed `9b9063c`, then rebased onto `origin/main` (which had picked up
     runtime bot commit `f24877a`), yielding `0e0560f`. `git patch-id --stable` is **identical**
     (`18f85bed…`) for both. Rebased, not lost.
  2. *Parallel session moving HEAD in a shared worktree.* True and known; this lane wrote no tracked
     files, so no interaction.
  3. *Two tracked-dirty files outside the lane set* (`.claude/settings.json` +17 lines,
     `pp-video-tmr-template-workbook-v1.xlsx`). **Pre-existing, not this lane's.** Flagged: a
     `git add -A` would sweep them. Any future commit of this packet must stage by explicit path.
  4. *Not an isolated worktree.* True; this was a DB/storage lane with no repo mutation.
  None of (1)–(4) bear on the validity of the storage write or the INSERT, which are git-independent.
- **Secret handling:** service-role key read from a PK-designated local file into a shell variable,
  used for one storage POST, never printed/copied/persisted. Read-only **use**, no posture change.
  Confirmed E1's gotcha: the `sb_secret_` format needs **both** `apikey` and `Authorization: Bearer`.
- **Rollback (validated, unused):**
  `delete from c.client_brand_asset where asset_id='2d62b04e-c1b5-44df-b382-59cbb991e166';`
  + `DELETE /storage/v1/object/brand-assets/Property_Pulse/Broll/broll_pp_au_suburb_aerial.mp4`.
  Row is fenced+inert; rollback is complete and side-effect-free.

## Still true after this lane
- The clip is **NOT promoted** and **cannot render**: no B-roll-capable Creatomate template exists.
- `label_constraint` remains **documentation, not enforcement** (carry C1 open).
- Repo state: three untracked paths, nothing staged, nothing committed, nothing pushed.
