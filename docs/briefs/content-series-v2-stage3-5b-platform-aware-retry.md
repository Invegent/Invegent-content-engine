# Content Series v2 — Stage 3.5b: Platform-Aware retry_episode (CCD-ready brief)

**Brief ID:** `content-series-v2-stage3-5b-platform-aware-retry`
**Parent:** Stage 3.5 read-first `ac25fc5f`, Stage 3.5a deployed+reconciled (v3.45). Sibling of 3.5a (outline) — this is the retry half.
**Status:** BRIEF ONLY — read-only discovery complete, no implementation. Gates: CCD patch → D-01 → PK exact phrase → apply_migration → V-checks → close-out.
**Class:** `sql_destructive` — single `CREATE OR REPLACE FUNCTION public.retry_episode(...)` via `apply_migration` (RPC redefinition; no schema/table change).
**Authority impact:** none (docs-only brief).

---

## 1. Executive diagnosis

`retry_episode` re-creates a rejected child slot by passing **`v_intent.format_preference`** — the episode's original format — back into `create_manual_slot_internal`. When the child was rejected because that format is invalid for the platform (the live PP case: `image_quote`/`carousel`/`text` → YouTube), retry reproduces the identical `(platform, format)` pair and `create_manual_slot_internal` returns the same `format_not_supported_on_platform` rejection. So retry is a **no-op for the exact failures it most needs to fix.** Everything else about retry is correct (published/in-flight protection, dead-slot audit preservation); the single gap is that it never re-resolves format suitability. Stage 3.5a fixed the *outline* so new series stop proposing impossible combos; 3.5b fixes *retry* so already-failed children can be repaired.

## 2. Exact source files / functions

- **`public.retry_episode(p_episode_id uuid, p_mode text, p_created_by text)`** — len 7,802, md5 `d85366fd`. **The only change site.**
- **`m.create_manual_slot_internal(p_client_id, p_platform, p_brief, p_format_preference, p_scheduled_for, p_created_by, p_intent_id, p_slot_confidence)`** — md5 `9ec86b61`. The rejection site: checks `platform_support[platform]` for the preferred format, returns `{ok:false, error:'format_not_supported_on_platform', format, platform}`. **Unchanged** — retry must stop feeding it a known-bad format.
- **`public.get_studio_capabilities(p_client_id uuid)`** — the resolver (same one Stage 3.5a uses). **Reuse; no change.** It uses the *same* `platform_support` + state logic `create_manual_slot_internal` enforces, so a format the resolver marks valid for a platform will pass the slot gate by construction.

## 3. Current retry data flow

```
retry_episode(episode_id, mode)
  → load episode + intent
  → mode guard (refan_out | retry_failed_children; regenerate_outline_item → not_available_in_stage2)
  → per target platform: classify children (has_published / has_in_flight / has_dead / n_children)
      - has_published → SKIP (already_published)                 [PROTECTED]
      - has_in_flight → SKIP (in_flight_preserved)               [PROTECTED]
      - dead/failed (or none, for refan_out) → RE-CREATE:
            create_manual_slot_internal(..., p_format_preference = v_intent.format_preference, ...)  ← BUG: stale format
      - old dead slot LEFT IN PLACE for audit
  → recompute intent status from live (non-dead) children
  → append retry summary to fanout_result (audit)
```
**Fields reused on retry (your Q2):** `v_intent.source_material->>'brief'` (child brief), `v_intent.client_id`, `v_intent.format_preference` (**the stale one**), `v_ep.intent_id`, a fresh `now()+1h` base timestamp. **Eligible states (Q3):** dead/failed children (and, for `refan_out`, platforms with zero children). **Protected states (Q4/Q5/Q6):** published (`slot.status='published'` OR `draft.approval_status='published'` OR `post_publish.status='published'`) → never touched; in-flight (anything not published and not dead/failed) → preserved/skipped. **Audit preserved (Q7):** old dead slots are never deleted or mutated; a new slot is created under the same intent; the retry summary (mode, recreated, retried, skipped) is appended to `creative_intent.fanout_result`.

## 4. Minimal implementation plan

One change, inside the per-platform re-create branch of `retry_episode`: **before calling `create_manual_slot_internal`, re-resolve a valid format for that platform** instead of passing `v_intent.format_preference` blindly.

- Call `get_studio_capabilities(v_intent.client_id)` once at the top of retry (single call, reused across the platform loop).
- For each platform about to be re-created, compute its valid format set = formats with `supported=true AND state ∈ {enabled, enabled_unproven}` (same predicate as 3.5a).
- **Choose the retry format for that platform:**
  - if `v_intent.format_preference` is in the platform's valid set → keep it (no behaviour change for combos that were valid all along);
  - else if the platform's valid set is non-empty → pick a deterministic valid format (e.g. first sorted; prefer one matching the intent's preference family if cheap, but first-valid is the minimal safe rule);
  - else (no valid format for this platform) → **do not create a doomed slot**; record `{platform, status:'rejected', reason:'no_valid_format_for_platform'}` in the retry summary (fail loud per-platform, consistent with 3.5a's empty-set behaviour).
- Everything else byte-unchanged: published/in-flight protection, dead-slot audit retention, intent-status recompute, fanout_result append.

**Question 8 — can retry safely call `get_studio_capabilities`?** Yes. It is STABLE SECURITY DEFINER, read-only, already invoked in the same governed surface (3.5a), and keyed on the intent's `client_id` which retry already has. One call per retry invocation (not per platform) keeps it cheap.

**Question 9 — minimum change:** re-resolve format per platform before re-create; keep original if still valid, pick a valid alternative if not, fail-loud-per-platform if none. ~15–25 lines inside the existing loop; no new RPC, no schema change, no signature change.

## 5. Validation plan (post-apply, read-only + controlled)

1. Retry (`retry_failed_children`) on a dead YouTube child whose intent preference was `image_quote` → new slot created with a **video** format, **accepted** (not re-rejected).
2. Retry on a dead child whose format was valid all along (e.g. FB image_quote) → format **unchanged**, slot recreated as before (no regression).
3. Retry on a platform with **no** valid format → records `no_valid_format_for_platform`, **no slot created** (fail loud, no doomed slot).
4. Published child → still **never** touched (re-confirm protection intact).
5. In-flight child → still **preserved/skipped**.
6. Dead slots from prior attempts → still present (audit retained); new slot under same intent.
7. `fanout_result` retry summary still appended; intent status recomputed correctly.
8. `refan_out` on a platform with zero children → re-resolves + creates a valid slot.
9. No production series mutated except a disposable test series used for the controlled checks.

## 6. Risk assessment

- **Behaviour change scope:** only the *format chosen on re-create*; protection/audit/status logic untouched. A retry can now *succeed* where it previously *no-op-rejected* — strictly an improvement.
- **Wrong-format-family risk:** picking "first valid" could swap an episode from (say) a static intent to a video format on a video-only platform — but that is exactly the point on YouTube, and it can never produce an *invalid* combo (resolver = gate predicate). Diversity/per-platform-optimal is explicitly out of scope (Stage 4+).
- **Resolver/gate divergence:** none expected — both read `platform_support` + the same state rules; if they ever diverged the `create_manual_slot_internal` gate is still the hard backstop (a bad pick is rejected, never published invalid).
- `known_weak_evidence`: as with 3.5a, on a mixed video-only+static set the per-platform re-resolution may pick narrow formats; acceptable interim, same residual already accepted in 3.5a.

## 7. Stop / escalation conditions

- If re-resolution would require changing `create_manual_slot_internal` or the intent's stored `format_preference` (it must not — retry chooses per-slot, leaving the intent's preference as historical record) → stop, re-scope.
- If a valid format for a platform exists per the resolver but `create_manual_slot_internal` still rejects it → resolver/gate divergence bug; stop and investigate before shipping.
- Any sign retry would touch a published/in-flight child → stop (must remain impossible).

## 8. D-01 requirement

**Yes.** `CREATE OR REPLACE FUNCTION public.retry_episode` is a production RPC redefinition → `sql_destructive` D-01 (`ask_chatgpt_review`) + PK exact phrase before `apply_migration`. Rollback: re-apply the prior `retry_episode` definition (md5 `d85366fd`) via `apply_migration`; no data migration, no schema change.

## 9. Explicitly out of scope

Stage 4 (UI); format diversity / per-platform-optimal formats; schedule fidelity (#7); persona capture (#5); fan_out_episode redesign; any change to `create_manual_slot_internal`, the capability gate, Advisor, compliance, render, publisher; the `regenerate_outline_item` mode (remains a series-writer-EF concern). This lane is strictly retry_episode platform-awareness.

## 10. What CCD may implement after PK approval

A single `apply_migration` redefining `public.retry_episode`: add a `get_studio_capabilities(client_id)` call, re-resolve a valid format per platform before `create_manual_slot_internal` (keep-if-valid / pick-valid / fail-loud-if-none), all protection/audit/status logic byte-unchanged. D-01'd; no schema change; rollback = re-apply md5 `d85366fd`. Nothing before D-01 + PK phrase.
