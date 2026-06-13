# Content Series v2 — Stage 3: Re-point Writer to fan_out_episode (CCD-ready brief)

**Brief ID:** `content-series-v2-stage3-writer-repoint`
**Parent:** Series v2 brief `content-series-v2-t1-integration.md` (`1607072b`). Stage 1 (episode.intent_id + persona fields) and Stage 2 (`fan_out_episode`, `retry_episode`, extended `get_content_series_detail`, approve messaging fix) deployed.
**Status:** BRIEF ONLY — no implementation. **Stage 3 is the first behaviour-changing step** (Stages 1–2 were inert/additive). Gates: CCD patch on branch → D-01 → PK exact phrase → CLI deploy → V-checks → close-out.
**Class:** `ef_deploy` — series-writer EF only. Baseline `series-writer-v1.2.0`, blob `da3d55de` (7,739 B).
**Authority impact:** none (docs-only).

---

## 1. Current writer path (exact call site, verified `da3d55de`)

`series-writer/index.ts` Deno.serve handler, the per-episode/per-platform nested loop:
- builds `systemPrompt` from brand + platform profile;
- `writeEpisode(...)` → Anthropic, returns `{title, body}`;
- **`supabase.rpc("series_post_insert", {... p_platform, p_recommended_format: ep.recommended_format ?? "image_quote", ...})`** ← **the legacy direct-draft call (the only line Stage 3 replaces)**;
- pushes `{platform, post_draft_id, status:'draft_ready'}` to results;
- after all episodes: `update_series_status` → `active` (failCount=0) or `writing` (failCount>0) ← this `writing` branch is what stranded the test series ep3–5.

`series_post_insert` is where the bypass lives (direct `m.post_draft`, no slot/intent/Advisor, one format stamped across platforms, `post_draft_id` collapse). Stage 3 replaces **the write-output step only**.

## 2. Target writer path

Replace the per-platform `series_post_insert` call (and its nested per-platform loop) with **one `fan_out_episode(episode_id)` call per episode**:
```
for each written episode:
  (episode copy is already written by writeEpisode — see §note)
  → fan_out_episode(p_episode_id)
      → create_creative_intent (intent_kind='episode', targets = eligible platforms,
        source_material = episode brief + persona, format_preference = ep.recommended_format)
      → T1 fan-out: child slot per platform → governed chain (Advisor/compliance/render/queue)
  → episode.intent_id populated; episode.status → intent_created
```
**§note on episode copy:** Stage 2's `fan_out_episode` creates intents that fan to slots; the governed slot-fill path generates the per-platform draft copy via ai-worker (platform-native, Advisor-formatted). So the writer's current `writeEpisode` Anthropic call becomes **redundant for output** — Stage 3 should stop using `writeEpisode`'s text as the persisted draft and instead pass the **episode brief/angle/hook** into `fan_out_episode` as `source_material`, letting the governed path write platform-native copy. (Do NOT redesign outline generation; do NOT redesign the episode *brief* content — only stop treating writeEpisode's output as the final per-platform draft.) If Stage 2's `fan_out_episode` already composes source_material from the episode row, the writer simply calls it and `writeEpisode` is dropped entirely — CCD confirms Stage 2's signature at build.

## 3. Episode status transition

`outline → writing → intent_created`. The writer sets the series to `writing` at start (keep), then per episode after a successful `fan_out_episode`, episode.status → `intent_created` (Stage 1/2 vocabulary). Series end-status: derive from episodes (all intent_created → `active`; any fan-out failure → `writing` retained so retry can target them — but no longer strands silently because `retry_episode` now exists). Do not introduce new ambiguous statuses.

## 4. Persona/avatar carry

`fan_out_episode` must receive `persona_label`, `avatar_preference`, `persona_notes` from the episode row (Stage 1 fields) → into intent `source_material.persona`. If Stage 2's `fan_out_episode` already reads these from the episode row directly, the writer passes nothing extra (preferred — single source of truth). **Do NOT override the Branch A avatar pin** — Stage 3 carries persona *intent* into draft_format only; the pin still governs actual avatar selection (separate avatar lane). Carry intent, not override.

## 5. Platform/format handling

The writer **stops stamping `ep.recommended_format` across all platforms**. Format becomes: episode.recommended_format = *preference* passed to the intent; **Advisor chooses platform-native `format_chosen` per child**, gated by taxonomy×platform_support (the capability resolver / `get_studio_capabilities` logic that fan_out_episode + the slot-fill path already enforce). Unsupported combos (text→YouTube, text→Instagram) are blocked at fan-out and reported in `fanout_result`, not written as invalid drafts. The writer no longer needs `get_client_platform_profile_for_series` per platform for format purposes (the governed path handles it) — though it may retain platform iteration only if `fan_out_episode` expects an explicit target list; preferred is `fan_out_episode` derives targets from the series' eligible platforms.

## 6. Scheduling (Stage 3 minimum)

Preserve existing per-episode `scheduled_for` where present — pass it into `fan_out_episode` so child slots schedule from it (distinct per-platform timestamps via T1). If absent, use the governed default/next-slot behaviour the T1 path already provides. **Do NOT solve F-SLOT-SCHEDULE-FIDELITY in Stage 3** — Series v2 now uses slots so it inherits that carry; flag separately, do not fix.

## 7. Retry compatibility

Stage 3-created episodes carry `intent_id`, so `retry_episode` (Stage 2) operates on them natively (refan_out / retry_failed_children against the episode's intent). No extra retry UI in Stage 3. Confirm at build that `retry_episode` keys off `episode.intent_id` (Stage 2 contract).

## 8. Backward compatibility

Existing legacy series (intent_id NULL) remain readable via the dual-read path in `get_content_series_detail` (Stage 2). Legacy drafts not migrated/deleted. **`series_post_insert` deprecated but retained** (callable for rollback); Stage 3 removes it from the writer path only. Rollback = redeploy `series-writer-v1.2.0` (blob `da3d55de`), which restores the `series_post_insert` path; no DB rollback (Stage 1/2 objects are additive and inert to the legacy path).

## 9. Validation plan (post-deploy, read-only)

1. one-episode series through the writer → episode.intent_id populated, child slot(s) created, no direct `m.post_draft` insert by 'series-writer'.
2. multi-platform episode → N child slots, one per eligible platform, distinct timestamps.
3. YouTube child gets a video-compatible governed format (not text/image_quote) — or is blocked at fan-out with a reason.
4. Instagram child receives no text format.
5. LinkedIn children respect taxonomy capability.
6. Advisor runs per child (recommended_reason present on each child draft).
7. compliance gates per child (not post-hoc).
8. no direct draft insert (no new `created_by='series-writer'` direct rows); no direct queue insert.
9. `get_content_series_detail` shows per-episode children with states.
10. `retry_episode` can see and act on Stage 3-created children.
11. persona fields present on the episode flow into child draft_format (read-only check).

## 10. D-01 risk packet

- **writer path diff:** one RPC call swapped (`series_post_insert` per platform → `fan_out_episode` per episode) + drop/repurpose `writeEpisode` output + status transition to `intent_created`; rest of the EF unchanged. Full prior blob `da3d55de` retained.
- **rollback:** redeploy v1.2.0 (single step, CLI); no DB rollback.
- **test evidence:** Stage 1/2 deployed and inert; the legacy test series `7ddf29e7` demonstrates the defect this fixes (text/image_quote on YouTube, stranded ep3–5).
- **proof no T2:** no asset-QA/OCR/transcript touched.
- **proof no publisher/render/Advisor/compliance internals changed:** Stage 3 only re-points the writer to an existing governed RPC; those subsystems are invoked, not modified.
- **proof existing series readable:** dual-read path (Stage 2) unchanged; legacy intent_id-NULL series fall back to post_draft_id/platform_drafts.
- `known_weak_evidence`: episode-scale fan-out (5×4) load-untested live; first Stage 3 series is the validation sample with `retry_episode` available.

## 11. Explicitly out of scope

Stage 4 UI redesign; T2 rendered-asset QA / OCR / transcript; publisher hard-blocks; scheduling repair beyond preserving existing dates / default behaviour; F-SLOT-SCHEDULE-FIDELITY fix; Branch A avatar override changes; campaign abstraction; Option C; Fix 2; register reconciliation.

## 12. What CCD may implement after PK approval

A single `ef_deploy` to `series-writer`: replace the per-platform `series_post_insert` loop with one `fan_out_episode(episode_id)` per episode; carry persona fields (or rely on Stage 2 reading them from the episode row); set episode.status → `intent_created`; preserve scheduled_for into the fan-out; drop `writeEpisode` as the persisted-draft source (governed path writes copy). Deploy via Supabase CLI; commit-then-deploy (A-LE). ai-worker/Advisor/compliance/render/publisher/T1 RPCs unchanged; `series_post_insert` deprecated-in-place. Nothing before D-01 + PK phrase.
