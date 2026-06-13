# Content Series v2 — Governed Integration with T1 (CCD-ready implementation brief)

**Brief ID:** `content-series-v2-t1-integration`
**Parent audit:** `docs/runtime/sessions/2026-06-13-content-series-architecture-audit.md` (`f4e3b40d`). Builds on T1 (`633b3217`), capability-alignment (`9e05b766`), operator-dashboard (`33d3d1e7`).
**Status:** BRIEF ONLY — no implementation, no migration SQL. Gates: CCD patch (DB migration + RPCs + EF + UI, staged) → D-01 → PK exact phrase → deploy → V-checks → close-out.
**Class:** mixed (DDL migration + RPCs + series-writer EF change + UI). **Largest brief in the Studio line — stage it.**
**Authority impact:** none (docs-only).

---

## 1. Current legacy flow (where it bypasses T0/T1)

```
create_content_series → series-outline EF → save_series_outline (outline_ready)
→ approve_series_outline (approved) → series-writer EF → series_post_insert (per platform)
→ m.post_draft DIRECT (created_by='series-writer', needs_review)
```
Bypass points: direct `m.post_draft` insert (no slot, no creative_intent — verified slot=NULL/intent=NULL on all series drafts); Advisor never runs (recommended_reason NULL); compliance only post-hoc-sweeps (not a gate); one episode format stamped across all platforms unvalidated (text/image_quote landed on YouTube in the test); `post_draft_id` collapses to first platform; no retry backend; persona/avatar intent lost at outline.

## 2. Target Series v2 flow

```
series idea (+persona/avatar intent) → episode plan (persona-aware, format preference per episode)
→ outline approval → FOR EACH episode: create_creative_intent (intent_kind='episode', targets = selected platforms, source_material = episode brief + persona)
→ T1 fan-out: one child slot per platform (distinct timestamps) → m.fill_pending_slots
→ governed chain per child: ai-worker → Advisor (format gated by taxonomy×platform_support) → compliance gate → auto-approval → render → queue → publish
→ episode.status + series.status derived from children; retry = re-run create_creative_intent for that episode
```
Series becomes a **producer of T1 creative_intents** — one per episode — and inherits every T1 governance property.

## 3. DB changes (described; no SQL yet)

- **`c.content_series_episode.intent_id`** uuid NULL FK → `m.creative_intent` (the bridge; one intent per episode). ON DELETE SET NULL.
- **Episode persona/avatar fields:** `persona_label` text NULL (e.g. "Priya — First-Time Investor"), `avatar_preference` text NULL (an avatar/stakeholder-role hint), `persona_notes` text NULL. These carry into the intent's `source_material` jsonb and onward to `draft_format`.
- **Episode status rollup:** episode.status derived from its intent's children (computed on read, per F-INTENT-STATUS-ROLLUP — no stored-status trigger in v2; reuse the derive-on-display pattern). Series.status likewise derived.
- **`post_draft_id` (single) — DEPRECATE, do not drop:** retained for backward read compatibility; v2 linkage is episode→intent→children. `platform_drafts` jsonb likewise retained read-only for legacy series; v2 reads children via `get_creative_intent_detail`.
- **No change** to `m.creative_intent`/`m.slot`/`m.post_draft` schema beyond what T1 already shipped (intent_id FKs exist). No new status enums forced — use existing draft/slot/approval vocabularies.

## 4. RPC / API changes

- **create/approve outline:** `create_content_series` + `save_series_outline` largely unchanged; **`approve_series_outline` fixed** — accept `outline_ready` (as now) but return a clear, non-failure response if already advanced (idempotent-ish: report current state without surfacing as an error); approval remains outline-level.
- **write/fan-out (replaces `series_post_insert`):** new `fan_out_episode(p_episode_id)` → builds `source_material` (episode brief + persona fields), calls **`create_creative_intent`** with `intent_kind='episode'`, targets = the series' selected+eligible platforms, format_preference = episode.recommended_format (preference only); writes `episode.intent_id`; the existing T1 path fans to child slots. series-writer EF orchestrates per-episode calls instead of direct inserts.
- **retry/regenerate:** `retry_episode(p_episode_id, p_mode)` where mode ∈ {regenerate_outline_item, refan_out, retry_failed_children}: re-runs generation or re-fans the intent for that episode only; preserves or replaces per mode (§8).
- **read:** `get_content_series_detail` extended to return, per episode, its intent_id + child outcomes (delegating to `get_creative_intent_detail`); `get_series_episodes` returns derived statuses.
- **deprecate:** `series_post_insert` (keep callable for rollback; remove from the v2 writer path).

## 5. Scheduling model

Per **episode-platform child** (i.e. per slot), via the T1 fan-out: each `create_creative_intent` target gets a `scheduled_for` derived from the episode's intended date with **distinct per-platform timestamps** (respecting `idx_slot_unique_active`). Default = next available slot from client cadence (`get_next_publish_slot`-style); operator may override per episode (a single episode date that the fan-out spreads across platforms by minutes). Relationship to **F-SLOT-SCHEDULE-FIDELITY**: Series v2 now *uses slots* (unlike legacy), so it inherits that carry — the slot→queue drift applies; note it, do not fix here (separate carry). Manual slots created non-replaceable (high confidence), per the T0 non-negotiable.

## 6. Platform/format model

Uses the **shared capability resolver** (capability-alignment brief `9e05b766`): one episode targets multiple platforms; **each episode-platform child gets its own format decision** — the episode's `recommended_format` is a *preference* passed to the intent, but **Advisor chooses the platform-native `format_chosen` per child**, gated by taxonomy `is_buildable` × `platform_support`. Unsupported combos blocked at fan-out (e.g. text→YouTube rejected before a slot is created, surfaced as a per-target rejection in `fanout_result`). This structurally fixes the test's text/image_quote-on-YouTube defect.

## 7. Persona/avatar handling

Carry chain: `episode.persona_label/avatar_preference/persona_notes` → intent `source_material.persona` → slot → `draft_format.avatar_identity` → heygen-worker. **Per-episode** persona (the common case — Priya/Gary/Colleen as distinct episodes); **per-platform** avatar not required for v1 (same persona across an episode's platforms). **Branch A pin interaction:** the pin is currently the sole avatar selector (lookupAvatar role-less LIMIT 1). For Series v2, an episode `avatar_preference` should be an **explicit override candidate** — but since multi-avatar wiring was documented-but-never-implemented, v2 should **carry the persona field through to draft_format and heygen input without yet overriding the pin**, and flag the pin-vs-persona resolution as its own gated decision (the avatar multi-persona engine). I.e. v2 *preserves* persona intent structurally (fixing the total-loss defect) but does not unilaterally override the Branch A governance — that's a separate avatar-governance lane.

## 8. Retry semantics

`retry_episode(episode_id, mode)`:
- **regenerate_outline_item** — re-run outline EF for one episode (needs the insert-only `save_series_outline` wart fixed → an UPDATE path for a single episode row).
- **refan_out** — episode written but intent fan-out failed/partial: re-call `create_creative_intent` for missing/failed targets only; preserve succeeded children.
- **retry_failed_children** — specific child slots dead/skipped: re-create those slots under the existing intent (do not duplicate succeeded ones).
- Preserve-vs-replace: default **preserve succeeded, replace failed**; never duplicate a published child. This is the real backend the current UI affordance lacks.

## 9. Approval state machine (fixed)

```
series: draft → outline_ready → approved → fanning_out → active → (derived: partial|complete|failed)
episode: outline → intent_created → (derived from children: in_flight|partial|complete|failed)
child draft: needs_review → approved (auto-agent threshold or human) → … → published  | dead/skipped (compliance/skip)
```
- Outline approval stays outline-level (the valid guard), but `approve_series_outline` no longer surfaces "already advanced" as a failure.
- **Child draft approval = the governed T1 path** (auto-agent threshold or human), not series-level — fixes the "no per-episode approval after writing" gap.
- Compliance rejection of a child → that child `dead`, episode derives `partial`, **retry-eligible** via `retry_episode`.
- Terminal: published (success) / dead (compliance/skip, retry-eligible) / rejected.

## 10. Visibility model

Operator sees (reusing T1 visibility + operator-dashboard surfaces): series status (derived), per-episode status (derived), **per-platform child** status (slot/draft/approval/render/queue/publish), verbatim failure reasons, schedule per child, **format chosen per child** (Advisor's, not just the episode preference), `selected_canonical_ids_count` governance chip, and a retry control per failed episode/child. No SQL needed to explain any outcome.

## 11. Migration / compatibility strategy

- **Existing completed series** (e.g. the NDIS physio series, `active`): leave as-is on the legacy linkage; v2 reads fall back to `post_draft_id`/`platform_drafts` when `intent_id` is NULL.
- **Partially-written test series `7ddf29e7`** (ep1–2 written/rejected, ep3–5 stuck `outline`): not auto-migrated; either abandon or re-run under v2 once live (operator choice). Document, don't auto-touch.
- **Legacy drafts:** untouched; `series_post_insert` retained callable (rollback) but off the v2 path.
- **Old jsonb/post_draft_id:** read-compatibility only; v2 writes intent_id.
- No backfill of historical series into intents.

## 12. Validation plan

1. 5 episodes × 4 platforms → 5 intents, ≤20 child slots, each governed.
2. YouTube children only video-compatible formats (text/image_quote→YT rejected at fan-out, shown in fanout_result).
3. Instagram receives no text child (platform_support=false → blocked).
4. LinkedIn respects taxonomy (image_quote/carousel/text allowed; kinetic/stat blocked).
5. Episode persona survives → child `draft_format` carries persona; heygen input shows it (read-only check).
6. retry_episode on a failed episode re-fans only failed children; succeeded untouched; no duplicates.
7. No direct draft bypass (every series child has intent_id + slot_id; created_by ≠ 'series-writer' direct insert).
8. No queue bypass (children queue only post-approval+render).
9. Advisor runs per child (recommended_reason present).
10. Compliance gates per child (not post-hoc).
11. Series detail explains every outcome without SQL.

## 13. D-01 risk packet outline

(a) **larger architecture change** — mitigate by staging: Stage 1 DB (episode.intent_id + persona fields, additive/nullable) → Stage 2 fan_out_episode + retry RPCs → Stage 3 series-writer EF re-point → Stage 4 UI; each its own commit, D-01 reviewable as a set; (b) **state migration** — none forced; legacy series read-compatible, no backfill; (c) **retry semantics** — explicit preserve/replace rules §8, never duplicate published; (d) **scheduling ambiguity** — inherits T1 slot model + F-SLOT-SCHEDULE-FIDELITY carry (noted, not fixed); (e) **avatar/persona governance** — v2 carries persona but does NOT override Branch A pin (separate lane) — bounded; (f) **legacy compatibility** — series_post_insert retained, dual-read path; (g) **no T2** — render QA explicitly out. `known_weak_evidence`: fan-out at episode scale (5×4=20 slots) load-untested; first live series is the validation sample with retry available.

## 14. Explicitly out of scope

T2 rendered-asset QA / OCR / transcript; publisher hard-blocks; Option C; Fix 2 (done); register reconciliation (held); new platform publishers; campaign abstraction (note only: a campaign could later group multiple series-intents — future fit, not built); the avatar multi-persona override engine (v2 carries persona but defers pin-override to that lane); full UI redesign beyond the Series v2 operation surface.

## 15. What CCD may implement after PK approval (staged)

Stage 1: migration — `episode.intent_id` FK + persona fields (additive, nullable). Stage 2: `fan_out_episode`, `retry_episode`, extended `get_content_series_detail`, fixed `approve_series_outline`. Stage 3: series-writer EF re-pointed from `series_post_insert` to per-episode `create_creative_intent` fan-out; capability-resolver-gated formats. Stage 4: UI — persona fields, per-child outcome surface, retry control. Each stage D-01'd; ai-worker/Advisor/compliance/render/publisher/T1 internals unchanged; `series_post_insert` deprecated-in-place. Nothing before PK approval.
