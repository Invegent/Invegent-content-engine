# T1 — Content Studio Creative Intent / Content Package parent (CCD implementation brief)

**Brief ID:** `content-studio-t1-creative-intent`
**Parent decision:** `docs/briefs/content-studio-decision-brief.md` (`e5529365`), §B rows 4–5; T1 line approved by PK.
**Builds on:** T0 governed manual-slot path — close-out `docs/runtime/sessions/2026-06-13-t0-content-studio-governed-path-closeout.md` (`38b0d0a3`, PASS WITH CARRY). **T1 must not reopen T0** unless a blocking dependency is found (none identified).
**Status:** BRIEF ONLY — not implemented, no migration SQL written. Gates: CCD patch on branch → D-01 → PK exact phrase → CLI/migration deploy → V-checks → close-out.
**Class:** mixed — one DDL migration (`apply_migration`) + one RPC + ai-worker untouched + dashboard save-path extension.

---

## 1. Objective and success criteria

**Objective:** allow one operator idea to become **one or more governed, platform-native sibling drafts**, grouped under a single parent, each traversing the existing T0/automated governed chain unchanged.

**Success criteria:**
1. One idea targeting N platforms produces N manual slots (one per platform) under one parent `intent_id`, each filling to a governed draft via the existing path.
2. Every sibling draft carries the parent link and is independently Advisor-formatted, compliance-gated, threshold-approved, rendered, queued, published — no shared shortcut.
3. Partial failure is first-class: if 1 of N platforms is invalid/unsupported, the valid ones proceed and the parent records per-platform outcome.
4. Zero regression to T0 single-platform path and the automated pipeline.
5. No bypass of any kind (draft/queue/compliance/Advisor/canonical-pool).

## 2. Proposed abstraction

A new parent table **`m.creative_intent`** (schema `m` — it is a publishing-pipeline object, beside slot/draft; confirmed no existing intent/package abstraction — `c.service_package*` are unrelated billing tables).

Represents: one operator creative idea + its shared source material + fan-out target set + lifecycle status. Does **not** represent: the content itself (that's the drafts), the schedule (slots), render state (drafts), or series structure.

Columns (described, not SQL):
- `intent_id` uuid PK.
- `client_id` uuid NOT NULL → `c.client`.
- `intent_kind` text NOT NULL — `single | package` for T1 (`episode | skit` reserved, not implemented).
- `source_material` jsonb NOT NULL — the operator brief / URL / notes (same carrier shape as the T0 slot `source_material`; lives on the parent, copied down to each child slot at fan-out so the slot-fill manual branch is unchanged).
- `format_preference` text NULL — optional single preference applied to all children unless per-target overridden (Advisor-overridable downstream, as T0).
- `target_platforms` text[] NOT NULL — the requested fan-out set (audit/provenance; the authoritative children are the slots).
- `status` text NOT NULL — `draft | fanning_out | active | partial | complete | failed` (lifecycle; see §5 partial handling).
- `created_by` text NOT NULL — operator attribution (`content-studio:<context>`), same convention as T0.
- `created_at` / `updated_at` timestamptz.

Relationships:
- **→ client:** FK, every intent client-scoped.
- **→ drafts:** new nullable `m.post_draft.intent_id` uuid FK → `m.creative_intent` (the sibling-grouping link; NULL for all existing/automated drafts — additive, inert).
- **→ slots:** new nullable `m.slot.intent_id` uuid FK → `m.creative_intent`. Each fanned-out slot carries the parent; the draft inherits it at fill (or the fill manual branch copies slot.intent_id → draft.intent_id).
- **→ series episodes:** **none in T1** — note only that a future lane may point `content_series_episode` at an intent to unify; not built, not assumed.

## 3. Flow design

```
T0 (unchanged, still valid for single platform):
  Studio → create_manual_slot → fill (manual branch) → governed draft → … → publish

T1 (one idea → many):
  Studio (idea + platform set + optional format pref)
   → create_creative_intent  [NEW RPC: writes m.creative_intent, then fans out]
      → for each target platform: create a manual slot (reusing T0 logic)
        carrying intent_id + per-platform schedule (distinct timestamps to respect
        idx_slot_unique_active) + slot-carried source_material
   → existing m.fill_pending_slots manual branch fills each slot independently
   → each → ai-worker (Advisor + compliance + auto-approval) → render → queue → publish
   → each draft.intent_id = parent; parent.status reflects aggregate outcome
```
The per-platform child path **is exactly T0**. T1 adds only the parent + the fan-out loop.

## 4. Required DB changes (described; no SQL yet)

- **New table `m.creative_intent`** (columns §2). RLS consistent with `m.slot` (service-role write; no anon/authenticated). Index on `(client_id, status)` for dashboard listing; index on `created_at`.
- **New column `m.slot.intent_id`** uuid NULL, FK → `m.creative_intent(intent_id)` ON DELETE SET NULL (a deleted intent must not cascade-destroy in-flight slots/published lineage).
- **New column `m.post_draft.intent_id`** uuid NULL, FK → same, ON DELETE SET NULL.
- **Constraints:** fan-out must respect the existing partial unique index `idx_slot_unique_active (client_id, platform, scheduled_publish_at)` for live statuses — so two children for the *same* platform (rare, but possible if an operator wants 2 FB variants) MUST get distinct `scheduled_publish_at`; the RPC assigns distinct timestamps by construction.
- **Indexes:** `m.post_draft(intent_id)` and `m.slot(intent_id)` partial-where-not-null for sibling lookup.
- **Rollback considerations:** all three additions are additive and nullable/inert — existing readers and the automated pipeline ignore them. Rollback = drop the RPC + table + two columns in reverse FK order; no data backfill, no existing-row mutation. The new RPC is the only writer of `intent_id`; T0's `create_manual_slot` continues to write `intent_id=NULL` (single posts remain parentless, which is correct).

## 5. Required RPC / API changes

- **New RPC `public.create_creative_intent`** (SECURITY DEFINER, service-role only — same posture as `create_manual_slot`). Params (described): `p_client_id`, `p_intent_kind`, `p_source_material jsonb` (or brief text + url), `p_targets jsonb` (array of `{platform, format_preference?, scheduled_for?}`), `p_created_by`. Behaviour: validate client; insert `m.creative_intent` (status `fanning_out`); for each target, **call the same validated path `create_manual_slot` uses** (reuse, do not duplicate: extract T0's validation+insert into a shared internal or call it per target) passing `intent_id`; collect per-target results; set parent status from the aggregate.
- **Linking:** children carry `intent_id` on the slot; the `m.fill_pending_slots` manual branch copies `slot.intent_id → draft.intent_id` at draft creation (one line; T0 branch already sets draft fields there). No ai-worker change.
- **Failure handling (per target):** each target validated independently (platform eligibility via `is_publish_eligible`; format via taxonomy + `platform_support`, same gates as T0). Invalid target → recorded as `{platform, status:'rejected', reason}` in the RPC result; valid targets still created. RPC is transactional **per intent + valid children** (the parent and all *accepted* children commit together; rejected targets are reported, not inserted) — no half-written slot.
- **Partial platform success representation:** parent `status` = `active` (all accepted), `partial` (some targets rejected at creation OR some children later fail to fill/publish while others succeed), `complete` (all children published), `failed` (zero children created). A read RPC/ view `get_creative_intent_detail(intent_id)` returns parent + per-child slot/draft/queue/publish state for the UI. Child-level later failures (fill skip, render fail) do **not** roll back siblings — surfaced via the detail view; parent recomputed to `partial`.

## 6. Platform / format handling

Unchanged from T0's governed rules, applied per target: **taxonomy-driven** (formats from `t."5.3_content_format"`), **platform-support-gated** (`platform_support[platform]=true`), **buildability-gated** (`is_buildable=true`; the GIF contradiction flip from decision-brief row 10 is a *separate* cleanup, not T1 — until flipped, those formats remain offerable-but-risky, so T1 should not surface them), **Advisor-overridable** (operator `format_preference` is a preference; Advisor chooses `format_chosen` downstream exactly as T0 proved). No new format logic — T1 reuses T0's validation verbatim.

## 7. Governance rules (T1 must preserve)

- No direct draft insertion — children are created only as slots, filled by the governed branch.
- No direct queue bypass — queue rows arise only post-approval+render, as T0.
- No compliance bypass — each child independently compliance-gated.
- No Advisor bypass — each child independently Advisor-formatted.
- No canonical-pool contamination — children carry `source_material` on the slot; `selected_canonical_ids` must be 0 for every manual child (validation case §9).
- No T2 assumptions — no asset-QA fields, no publisher hard-blocks, no OCR/transcript anything.
- Children inherit T0's non-replaceable posture (high `slot_confidence`; note the open T0 carry that manual slots currently set confidence NULL — T1 should set it explicitly high per the non-negotiable, fixing that carry in passing rather than inheriting the NULL).

## 8. UI impact summary (high-level only — no detailed design)

Studio conceptually shifts from "compose one post" to "capture one idea, choose where it goes": one source input (brief/URL/notes), a multi-platform selector (gated to connected + eligible platforms), optional per-platform format preference, one "Submit to Pipeline" action that calls `create_creative_intent`. Results show as a **grouped set** — one parent card with N sibling children, each showing its independent governed state (drafting → review/approved → rendered → queued → published) and per-child rejection reasons. Preview remains an aid only. No queue-save, no bypass affordance. Detailed UI is a separate design pass.

## 9. Validation plan (live + local)

Local (PGlite/staging, before deploy):
1. one idea → one platform → one intent, one slot, one draft, `draft.intent_id`=parent.
2. one idea → two platforms → one intent, two slots (distinct timestamps), two independent drafts both linked.
3. one platform invalid (publish-ineligible) → rejected in result, other platform proceeds, parent `partial`.
4. one format unsupported for a platform → that target rejected with taxonomy reason, others proceed.
5. partial fan-out failure (one child fails to fill) → siblings unaffected, parent recomputes `partial`.
6. no queue bypass — every child's queue row appears only after approval+render.
7. parent correctly links all outputs — `get_creative_intent_detail` returns every child with state.

Live (post-deploy, one real low-risk intent, CFW or Invegent): one idea → two platforms, traced end-to-end exactly as the T0 verification slot was; confirm `selected_canonical_ids=0` on both children, both published, parent `complete`. No forced runs — natural cron.

## 10. D-01 risk packet outline

Expected risks to surface: (a) **new parent abstraction** — mitigated: additive table, nullable FKs, automated pipeline provably ignores `intent_id`; (b) **draft/slot linkage** — single copy point in the existing manual fill branch; (c) **partial-failure semantics** — explicit status model + per-target transactional boundary; (d) **rollback** — pure additive, drop-in-reverse, no backfill; (e) **data lineage** — children fully lineated (slot→draft→queue→publish) plus parent grouping, no orphans; (f) **no effect on automated pipeline** — `create_manual_slot` and `fill_pending_slots` automated/scheduled/breaking branches byte-unchanged (CCD to prove via md5 as T0 did); (g) **fan-out timestamp collision** vs `idx_slot_unique_active` — RPC assigns distinct per-platform timestamps. `known_weak_evidence`: live validation is one intent; per-platform variation under load unobserved (acceptable — natural accrual + detail view).

## 11. Explicitly out of scope

T2 post-render QA, OCR, transcript checks, rendered-asset compliance, publisher hard-blocks; series redesign (future linkage noted only, §2); campaign abstraction; newsletter/reddit publishers; UI rebuild; Advisor internals; render-worker rewrites; the GIF buildability flip (separate cleanup); register reconciliation (held).

## 12. What CCD may implement after PK approval

On PK's exact approval phrase following D-01: (1) migration creating `m.creative_intent` + `m.slot.intent_id` + `m.post_draft.intent_id` (additive, nullable, FK ON DELETE SET NULL) + indexes; (2) `public.create_creative_intent` RPC reusing T0's validated per-platform path and fanning out with distinct timestamps + high slot_confidence; (3) one-line `intent_id` copy in the `m.fill_pending_slots` manual branch; (4) `get_creative_intent_detail` read RPC; (5) dashboard save-path extension to call the new RPC with the multi-platform target set and render the grouped result. ai-worker, Advisor, compliance, render workers, publisher, automated pipeline: **unchanged**. Nothing implemented before D-01 + PK phrase.
