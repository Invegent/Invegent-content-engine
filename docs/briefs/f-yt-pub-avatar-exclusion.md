# Brief F-YT-PUB-AVATAR-EXCLUSION — controlled enablement of avatar publishing to YouTube

**Created:** 2026-05-25 Sydney
**Author:** chat
**Status:** ✅ IMPLEMENTED & VALIDATED (2026-05-25) — was: AUTHORED. **Option B (dimension-first) chosen and satisfied, then the publisher was enabled.**

> **✅ FINAL OUTCOME (closeout 2026-05-25):** Shipped via **youtube-publisher v1.7.0** (deployed EF v47; repo `21e372d`) — `video_short_avatar` added to the eligible-format allow-list. Sequenced per Option B: the heygen-worker portrait render (v1.2.0 dimension → v2.0.0 async) landed FIRST, so the first publish is a true 9:16 Short. Controlled supervised first publish: **40f9fa25** (portrait 720×1280) → **YouTube sfQvSM2Osus** (unlisted, NDIS-Yarns), `m.post_publish` audit row written, idempotency guard holds (0 remaining eligible). The landscape proof **ba5b34eb** was **retired (`archived_stale`)** — row + MP4 preserved, non-publishable — so only portrait avatars publish. D-01 ef_deploy `c76aea38` (GENERIC-NON-BLOCKING per L46, closed). Full closeout: `docs/operations/avatar-youtube-pipeline-status-2026-05-25.md`.
**Priority:** P2 (avatar generation + render now proven end-to-end via F-HEYGEN Option A; the only remaining gap is the publisher allow-list. No client-facing regression — avatar has never published, so this ships a differentiator, it does not restore a broken one.)
**Result file:** `docs/briefs/results/f-yt-pub-avatar-exclusion.md` (created on completion)

---

## Header / metadata

**Linked systems**
- `supabase/functions/youtube-publisher/index.ts` — **v1.6.0** (deployed version 46). Owns the draft eligibility predicate that excludes avatar.
- `supabase/functions/heygen-worker/index.ts` — **v1.1.0** (deployed version 30). Renders avatar MP4s at hardcoded `1280×720` landscape.
- `supabase/functions/ai-worker/index.ts` — **v2.13.0**. Creates avatar drafts (F-HEYGEN Option A: A2 format-honour override + A3 narration script branch).
- `m.post_draft` — the row whose `recommended_format` / `video_status` / `approval_status` / `video_url` drive publisher eligibility.
- `t."5.3_content_format"` — catalog; `video_short_avatar.platform_support` now `{youtube,facebook,linkedin,instagram}` (Option A A1 re-added `youtube` 2026-05-25 07:23). NOTE: the publisher does **not** read this table — it is informational here only.

**Dependencies**
- **F-HEYGEN-NEVER-PRODUCED** (`docs/briefs/f-heygen-never-produced.md`) — Option A validated; this brief is its downstream continuation. Avatar generation→render is now proven; publishing is the last unconnected hop.
- **F-HEYGEN-WORKER-LANDSCAPE-DIMENSION** (P3 backlog; named in migration `20260508052400_f_yt_pub_avatar_exclusion_...sql` as the proper home for the heygen-worker dimension fix and the downstream avatar→YT re-enable). This is a **hard dependency for the recommended path (Option B)** and the source of the only material risk in Option A.

**Deployment governance notes**
- **`ef_deploy` D-01 required.** Any change to `youtube-publisher` (and, under Option B, `heygen-worker`) is an Edge Function deploy → D-01 `ef_deploy` review per `docs/runtime/mcp_review_protocol.md` + ICE-PROC-001.
- **Separate, explicit PK approval phrase required** before each production mutation (deploy). Approval of this brief is **not** approval to deploy.
- **repo↔deploy sync required.** Deployed v1.6.0 / v1.1.0 are currently byte-identical to repo (verified this audit). Any edit must be committed to repo **and** deployed from `C:\Users\parve\Invegent-content-engine` (Windows MCP times out on `functions deploy`; PK deploys manually). Do not let repo and deploy drift.

---

## 2. Evidence (read-only audit, 2026-05-25)

All facts verified live via Supabase MCP `execute_sql` (read-only) + edge-function source reads. Deployed source confirmed byte-identical to repo for both functions.

- **E1 — Publisher allow-list excludes avatar.** `youtube-publisher` v1.6.0 draft SELECT (`index.ts:126-133`) ends with:
  ```ts
  .in('recommended_format', ['video_short_kinetic','video_short_stat','video_short_kinetic_voice','video_short_stat_voice'])
  ```
  `video_short_avatar` is **absent** → avatar rows are never returned → never uploaded. This is the sole gate. The publisher reads `m.post_draft` directly and does **not** consult `t."5.3_content_format"`, so the catalog's `youtube:true` has no effect on eligibility.

- **E2 — `ba5b34eb` passes every other predicate.** Live read of the validation draft:

  | Predicate | Required | `ba5b34eb` | Pass |
  |---|---|---|---|
  | `video_status` | `generated` | `generated` | ✅ |
  | `approval_status` | `approved` | `approved` | ✅ |
  | `video_url` | non-null | `…/post-videos/ndis-yarns/ba5b34eb…_avatar_realistic.mp4` | ✅ |
  | `draft_format->youtube_video_id` | `null` | `null` | ✅ |
  | `recommended_format` | in allow-list | `video_short_avatar` | ❌ **only failure** |
  | queue / slot / schedule row | none | n/a (direct-read publisher) | ✅ |

  Genuine artifact: `heygen_video_id=186a6e5e27bb4d3f89ba41252744c4cb`, rendered 2026-05-25 08:50, 38s narration. 4 of 5 predicates pass; the format allow-list is the entire blocker.

- **E3 — Upload path is format-agnostic.** Nothing in the upload branches on format/aspect ratio:
  - storage fetch: generic `fetch(draft.video_url)` → `arrayBuffer()` (`index.ts:141-143`);
  - MIME: hardcoded `video/mp4` (`index.ts:84`) — matches HeyGen output;
  - title/description: from `draft_title`/`draft_body` via `buildVideoMetadata` (`index.ts:103-110`), only a trivial ` #data` suffix for `stat`;
  - single `uploadType=multipart` endpoint for all videos — no short/regular split.
  → Adding avatar to the allow-list is mechanically sufficient to make it *upload*.

- **E4 — heygen-worker outputs 1280×720 landscape.** `submitHeyGenJob` hardcodes `dimension: { width: 1280, height: 720 }` (`heygen-worker/index.ts:66`) = **16:9 landscape**. `ba5b34eb` was rendered at this dimension; no dimension override is stored in `draft_format`.

- **E5 — Publisher auto-tags all uploads `#Shorts`.** `buildVideoMetadata` always sets `#Shorts` + `Short` tags, `#Shorts` in the description, and category 27 (`index.ts:106-109`) — for every video, with no aspect-ratio awareness.

- **E6 — Enabling avatar makes `ba5b34eb` immediately publish-eligible.** It satisfies all predicates except E1; the moment avatar is added to the `.in()` list it is selected on the **next youtube-publisher cron fire** and uploaded. NDIS-Yarns (`fb98a472`) has a working YouTube token (channel `UCqCTvPSR1BwhIi5Cui9_9Mw`; publisher does not gate on `publish_enabled`), so the upload would genuinely go live — `unlisted` (`index.ts:146`), so contained but real.

- **E7 — `40f9fa25` becomes eligible after render.** It is `video_status='pending'`, no `video_url` → currently ineligible, but heygen-worker will render it (to 16:9) on a future run, after which it too matches the publisher predicate. Blast radius grows as more avatar drafts render.

- **E8 — The two seed rows stay blocked.** `80d8d2b7` and `a501aa6a` are `generated`/`approved` but have **null `video_url`** → excluded by `.not('video_url','is',null)` even with avatar in the allow-list. (These are the never-rendered seed rows from F-HEYGEN-NEVER-PRODUCED E3.)

**Avatar draft inventory (all NDIS-Yarns `fb98a472`):**

| Draft | `video_status` | `video_url` | Eligible if avatar added? |
|---|---|---|---|
| `ba5b34eb` (validation) | generated | ✅ | **Yes — immediately** |
| `40f9fa25` | pending | ✗ | After render completes |
| `80d8d2b7` (seed) | generated | ✗ | No (null `video_url`) |
| `a501aa6a` (seed) | generated | ✗ | No (null `video_url`) |

---

## 3. Decision fork (PK to choose)

### Option A — Publish avatar now
- Add `'video_short_avatar'` to the publisher `.in()` allow-list immediately (the §4 diff) and deploy.
- Accept that the first uploads are **landscape 16:9 videos tagged `#Shorts`** — they will upload and go live (`unlisted`) but YouTube will classify them as **regular videos, not Shorts** (Shorts require vertical/square ≤ 3 min; 38s passes on duration, the 16:9 ratio disqualifies). The `#Shorts` tags are therefore cosmetically wrong.
- **Suitable only for controlled / unlisted validation** of the publish hop — not for production-grade output.

### Option B — Dimension-first **(RECOMMENDED — production path)**
1. First implement **F-HEYGEN-WORKER-LANDSCAPE-DIMENSION**: switch heygen-worker renders to true Shorts dimensions (**1080×1920** preferred, or **720×1280** portrait) — change `dimension` in `submitHeyGenJob` (`heygen-worker/index.ts:66`).
2. Re-render the preserved validation draft (`ba5b34eb`) at the new dimension so the first published avatar is a genuine 9:16 Short.
3. **Then** enable avatar in youtube-publisher (the §4 diff) and deploy.
4. Optionally make `#Shorts` tagging format/aspect-aware in `buildVideoMetadata` so tags match the actual ratio.

**Option B is the recommended production path.** It produces a correctly-classified Short on first publish, resolves the exact dimension defect that caused the original 2026-05-08 avatar→YT exclusion, and avoids shipping mislabeled landscape "Shorts" to a live channel. Option A is acceptable only as a throwaway unlisted validation of the publish wiring.

---

## 4. Minimal implementation diff (the publisher change — identical under both options)

**Current** (`supabase/functions/youtube-publisher/index.ts:132`):
```ts
.in('recommended_format', [
  'video_short_kinetic',
  'video_short_stat',
  'video_short_kinetic_voice',
  'video_short_stat_voice'
])
```

**Proposed:**
```ts
.in('recommended_format', [
  'video_short_kinetic',
  'video_short_stat',
  'video_short_kinetic_voice',
  'video_short_stat_voice',
  'video_short_avatar'
])
```

One added array element. No other publisher change required for eligibility. (Option B additionally changes `heygen-worker/index.ts:66` dimension and, optionally, `buildVideoMetadata` tag logic — both out of scope of this single diff but part of Option B's sequenced work.)

---

## 5. Validation plan (at execution time — read-only first)

**Pre-snapshot:** version-probe both functions (GET); confirm deployed == repo; record current avatar-draft inventory (table above); confirm `ba5b34eb` still `generated`/`approved`/non-null `video_url`/`youtube_video_id` null.

**Publish checks:**
1. **Selection** — after deploy, confirm the publisher's SELECT returns the avatar draft (e.g. one supervised invoke, or inspect logs).
2. **Upload succeeds** — `m.post_publish` gains a `platform='youtube'` row for the draft; `results[].status='published'`; `video_size_mb`/`duration_ms` recorded.
3. **YouTube classification of the resulting video:**
   - Shorts vs regular video (Option A expectation: regular; Option B expectation: Short);
   - dimensions / aspect ratio of the uploaded asset (16:9 under A; 9:16 under B);
   - metadata correctness — title/description from draft, `#Shorts` tags present, category 27; under B confirm tags match the ratio if §3-B4 taken.
4. **Persistence** — `m.post_draft.draft_format->youtube_video_id` and `youtube_url` populated; `video_status='published'`.

**Regression checks:**
- kinetic/stat formats still select and publish normally (allow-list addition is additive — confirm no behaviour change for the existing 4 formats);
- no duplicate publish — the `.is('draft_format->youtube_video_id', null)` guard still blocks re-upload of an already-published draft;
- `youtube_video_id` persisted correctly so the idempotency guard holds across cron fires.

---

## 6. Rollback

- **Redeploy the prior youtube-publisher version** (current deployed v1.6.0 / version 46; repo == deploy verified this audit) — restores the avatar-excluding allow-list.
- **Remove `video_short_avatar` from the allow-list** in repo and redeploy (the inverse of the §4 diff).
- **Validation drafts:** preserve or remove `ba5b34eb` / any avatar drafts published during validation **per PK instruction** — including unlisting/deleting any YouTube asset uploaded during a rolled-back validation run. (Option B additionally: revert `heygen-worker` dimension to its prior value if that deploy is also rolled back.)
- Idempotency: because publish sets `youtube_video_id`, a rolled-back-then-re-enabled draft will **not** double-publish.

---

## 7. Explicit current-state warning

- **Avatar is STILL excluded from YouTube publishing today.** The deployed youtube-publisher v1.6.0 allow-list does not contain `video_short_avatar`; no avatar draft can publish until this brief's governed change is approved and deployed.
- **`ba5b34eb` is currently inert and safe.** While avatar is excluded it cannot be selected by the publisher; it is the preserved, validated proof of F-HEYGEN Option A and should be **preserved, not voided**, until its fate is decided as part of the chosen option (Option B → re-render at 9:16; Option A → it becomes the deliberate first publish).
- **Do not silently add avatar to the allow-list outside this governed path.** The single-line diff is deceptively trivial: it immediately makes a real client draft go live on a real channel and re-activates a path a prior migration deliberately disabled for an unresolved dimension reason. Any enablement must run through Option A or B with `ef_deploy` D-01 + explicit PK approval.

---

## Stop condition
Brief authored + committed. **Do not implement, do not deploy, do not edit any function.** Next step is PK's A-vs-B decision, then the `ef_deploy` D-01 chain drives execution in a separate supervised session.

## Forbidden actions (until PK decision + D-01 + approval phrase)
- Do **not** edit, deploy, or invoke youtube-publisher or heygen-worker.
- Do **not** add avatar to the allow-list.
- Do **not** mutate `ba5b34eb`, `40f9fa25`, or the seed rows.
- Honour all active hold-state in `docs/00_sync_state.md`.
