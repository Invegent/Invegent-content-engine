# F-SERIES-AVATAR-DIFFERENTIATION (Branch B) — Architecture Brief

> **Status:** ARCHITECTURE BRIEF (read-only discovery). No implementation, no DB mutation, no deploy, no register update, no avatar creation, no A2-pin change, no worker change. **Authority impact: none.** No D-01 (read-only authoring).
> **Date:** 2026-06-15 (Sydney). **Lane:** F-SERIES-AVATAR-DIFFERENTIATION (Branch B, P3 DEFERRED).
> **Prereqs now complete:** persona capture (v3.49) + format diversity (v3.53).
> **Evidence:** heygen-worker v2.1.1 source; ai-worker v2.14.0 source; `c.brand_avatar` + `c.brand_stakeholder` schema + full per-brand inventory; recent `avatar_identity` payloads; `creative_intent.source_material.persona` samples; A2 Branch-A pin (`cc-a2-branch-a-host-pin.md`, v3.41). All read-only.

---

## 1. Executive diagnosis

**The persona→avatar infrastructure is ~95% built and largely inert.** Everything needed to render a different avatar per persona already exists for NDIS-Yarns and Property Pulse — it is simply not wired end to end, and the avatar supply is pinned to one host per brand.

- The **role taxonomy exists and is active**: `c.brand_stakeholder` holds 7 roles per brand (NY + PP), all `is_active=true`, with `demographic_hint` populated (PP also has `character_brief`).
- The **per-role avatar bindings exist**: `c.brand_avatar` holds a HeyGen avatar + voice for each role × render_style (realistic + animated) — 14 rows per brand, every one carrying a real `heygen_avatar_id` and `heygen_voice_id`.
- **heygen-worker already honours role**: `lookupAvatar()` filters `c.brand_avatar ⋈ c.brand_stakeholder` by `bs.role_code = stakeholderRole` **whenever `stakeholderRole` is non-null**. Role-aware selection is coded and live.

**Two blockers stop differentiation:**

1. **`stakeholder_role` is never populated on drafts.** ai-worker's `video_short_avatar` script branch returns exactly `{format, narration_text, render_style:'realistic', total_duration_s}` — no role, no persona read. Empirically every recent avatar draft has `stakeholder_role = NULL` and `avatar_selected_by = 'fallback_limit1'`. heygen-worker therefore calls `lookupAvatar` with `stakeholderRole = null` → role-less `LIMIT 1` (no `ORDER BY`).
2. **Only one `brand_avatar.is_active = true` per brand** (the A2 Branch-A pin, v3.41: NY → `support_coordinator/realistic`, PP → `buyers_agent/realistic`). Even a correct role filter would have nothing to differentiate among. Result: **every NY avatar render uses `7e98bd38…`, every PP render uses `5d03454f…`** — the same face for every persona.

**Data gap:** CFW + Invegent have **zero** `brand_stakeholder` rows and **zero** `brand_avatar` rows. They carry personas in `creative_intent` but have no avatar identities to render — they cannot be differentiated without a data build (out of scope here).

**Persona shape caveat (drives the mapping design):** the captured persona is **free-text narrative, not an enumerated role**. `persona_label` is largely the **audience** ("Mia — First-Home Buyer…", "Jordan and Mum — Participant and Carer…", often composite/multi-role); `avatar_preference` is free-text **presenter** direction ("Warm, experienced OT voice", "Calm, peer-level female presenter"); `persona_notes` is tone. None is a `role_code`. So the persona→role step is a free-text→closed-set classification, not a lookup.

---

## 2. Current avatar-selection flow map

```
series-outline v1.5.0
  └─ captures persona_label / avatar_preference / persona_notes  (v3.49)
     └─ save_series_outline → c.content_series_episode (persona columns)

fan_out_episode  (per-platform format resolver, v3.53)
  └─ carries persona → creative_intent.source_material.persona   (rich free-text; verified)
     └─ create_manual_slot_internal → child slot + ai_job

ai-worker v2.14.0   ← FORMAT decided here; ROLE never derived here
  ├─ callFormatAdvisor → decidedFormat
  ├─ A2 override: if input_payload.format == 'video_short_avatar' → force format (FORMAT only)
  ├─ assemblePrompts: injects brand_identity / platform_voice / content_type prompts
  │     → persona reaches the TEXT (draft_title/draft_body) via the seed
  └─ generateVideoScript('video_short_avatar')
        → { format, narration_text, render_style:'realistic'(hardcoded), total_duration_s }
        → set_draft_video_script → draft_format.video_script        ← NO stakeholder_role

heygen-worker v2.1.1   ← AVATAR IDENTITY decided here
  runSubmitPhase:
    render_style     = fmt.render_style ?? vs.render_style ?? 'realistic'
    stakeholder_role = fmt.stakeholder_role ?? vs.stakeholder_role ?? null   ← always NULL today
    if preset talking_photo_id present → use it            (avatar_selected_by='preset')
    else lookupAvatar(clientId, stakeholderRole=NULL, 'realistic'):
        SELECT ba.heygen_avatar_id, ba.heygen_voice_id
        FROM c.brand_avatar ba JOIN c.brand_stakeholder bs ON bs.stakeholder_id=ba.stakeholder_id
        WHERE ba.client_id=? AND ba.is_active=true AND ba.render_style=?
          [AND bs.role_code=? ONLY IF stakeholderRole non-null]
        LIMIT 1                              ← no ORDER BY → arbitrary-first; here = the 1 pinned avatar
        avatar_selected_by = stakeholderRole ? 'role_filter' : 'fallback_limit1'
    submit to HeyGen; write draft_format.avatar_identity =
        { talking_photo_id, voice_id, render_style, stakeholder_role(null), avatar_selected_by }
  runPollPhase (terminal): copy avatar_identity verbatim → m.post_render_log.render_spec
```

**Where the decision actually lives:** the avatar *preference* ("use an avatar on YouTube") is set upstream in `m.materialise_slots` (A2) and re-asserted as a *format* override in ai-worker; the avatar *identity* is resolved in **`heygen-worker.lookupAvatar`**. The missing link is the **role**, which has no home today.

---

## 3. Existing schema / data inventory

**`c.brand_stakeholder`** (role taxonomy): `stakeholder_id` (pk), `client_id`, `role_code` (NOT NULL), `role_label` (NOT NULL), `role_description`, `demographic_hint`, `sort_order`, `is_active` (default true), `character_brief` (jsonb), `refinement_notes`, `brief_version`, `last_generated_at`.

**`c.brand_avatar`** (avatar binding): `brand_avatar_id` (pk), `stakeholder_id` (FK→brand_stakeholder), `client_id`, `heygen_avatar_id`, `heygen_voice_id`, `render_style` (default 'realistic'), `avatar_type` (default 'stock'), `avatar_display_name`, `is_active` (default false), `consent_*`, `avatar_gen_status` (default 'empty'), gen/image fields.

The schema **fully supports per-role avatars**: a role (`brand_stakeholder`) → one-or-more avatars (`brand_avatar`, one per render_style) carrying provider identities, gated by `is_active`.

**Per-brand inventory (live):**

| Brand | brand_stakeholder roles (all is_active) | brand_avatar rows | active avatars | inactive (ready, with HeyGen IDs+voices) | character_brief |
|---|---|---|---|---|---|
| NDIS-Yarns | 7 (participant, support_coordinator, local_area_coordinator, allied_health_provider, plan_manager, support_worker, family_carer) | 14 (role × {realistic, animated}) | **1** — `support_coordinator/realistic` (`7e98bd38…`) | 13 | empty (all NY) |
| Property Pulse | 7 (first_home_buyer, investor, mortgage_broker, buyers_agent, real_estate_agent, landlord, tenant) | 14 (role × {realistic, animated}) | **1** — `buyers_agent/realistic` (`5d03454f…`) | 13 | populated (all PP) |
| Care For Welfare | **0** | **0** | 0 | 0 | n/a |
| Invegent | **0** | **0** | 0 | 0 | n/a |

`avatar_type='stock'` and `avatar_gen_status='empty'` throughout — these are stock HeyGen avatars (no custom-generation/consent dependency for the happy path). The A2 pin is represented purely as `brand_avatar.is_active` (no separate pin table); it deactivated 13 of 14 rows per brand.

---

## 4. Persona-to-avatar design options

**Option A — keep one brand host (status quo).** No code, no data, fully brand-consistent. No differentiation. This is today's behaviour and remains the **safety fallback**, not the end state.

**Option B1 — deterministic `persona_label` → `stakeholder_role` mapping.** A static lookup/synonym table mapping persona labels to role_codes. *Problem:* `persona_label` is free-text and largely the **audience** persona, often composite; exact/substring matching is brittle and will miss most real labels. `avatar_preference` is a better signal but still free text. Viable only as a thin curated override, not the primary resolver.

**Option B2 — LLM-assisted role extraction in ai-worker.** Add a step in ai-worker (which already holds the persona-bearing seed and makes LLM calls) that maps `{persona_label, avatar_preference, persona_notes}` to **one `role_code` from the brand's closed set** (read from `c.brand_stakeholder`), and emits it as `stakeholder_role` on the draft. Robust to free text; output constrained to valid roles; reuses existing infra. Risk: a chosen role may have no active avatar → must fall back safely.

**Option B3 — explicit per-brand persona/avatar mapping table.** A new `c.*` table mapping (client, persona signal) → `stakeholder_role` / `brand_avatar`. Deterministic, auditable, operator-controlled. *Problem:* persona_labels are open-ended, so it cannot pre-enumerate every label; best as a **curated override layer** on top of B2 for stable, high-value mappings — not the sole mechanism.

**Option B4 — heygen-worker fallback resolver only.** Infer role inside heygen-worker. *Problem:* heygen-worker sees only `draft_format` (narration + render_style), not the structured persona — it is the wrong layer for content understanding, and would require threading persona into the render worker. Weakest option; rejected as primary.

---

## 5. Recommended architecture

**Role-as-contract, hybrid resolver, default-host safety net.**

1. **Contract = `stakeholder_role`** (a `role_code` from `c.brand_stakeholder`) written onto the draft (`draft_format.stakeholder_role` and/or `video_script.stakeholder_role`) **before render**. heygen-worker already consumes this field — **no heygen-worker change is needed for the happy path** once a safe fallback exists (see §6 Stage 2).
2. **Primary resolver = B2** (LLM-assisted extraction in ai-worker), constrained to the brand's active `role_code` set, because persona is free-text. Prefer `avatar_preference` (presenter signal) over `persona_label` (audience signal); use `persona_notes` as context.
3. **Optional override = B3** (a thin, operator-curated per-brand mapping table) layered above B2 for stable mappings — future, not required for v1.
4. **Default fallback host = Option A semantics, always.** Each brand keeps one designated default host (today's pinned avatar). "No matching active avatar" resolves to the default host; **render never fails**.
5. **The A2 pin must be relaxed for differentiation** (activate ≥N realistic role avatars per brand) — but that is a **brand-consistency governance decision**, flagged here, not made. Crucially, role emission can be made **inert until the pin is relaxed** (see §6), which decouples the risky brand decision from the plumbing and enables a low-risk rollout.

Answers to Q9/Q10/Q11 fall out of this: **hybrid (LLM-assisted, role-constrained) not pure-deterministic; yes, default host + persona-specific avatars; no-match → default host, never fail.**

---

## 6. Minimal staged implementation plan

Each stage is independently gated (own D-01 + PK phrase) and independently reversible. **The ordering is a hard safety requirement** — see Risk R1.

- **Stage 1 — shadow role emission (zero render impact).** ai-worker derives a *suggested* role (B2) and writes it to an **observability-only field that heygen-worker does NOT read** (e.g. `draft_format.persona_role_suggested` + into `avatar_identity` as `resolved_role`/`role_source`/`persona_signal`). Renders are byte-unchanged (still `fallback_limit1` to the pinned host). Lets us measure mapping quality against real personas before anything consumes it. (ai-worker `ef_deploy`.)
- **Stage 2 — make `lookupAvatar` role-tolerant (safety net).** heygen-worker change: role filter first; **if it returns no active row, retry role-less** (current behaviour) instead of returning null. This guarantees that setting a real `stakeholder_role` can never null-out the avatar and throw at submit. Must land **before** any real role is consumed, including before the pin is relaxed. (heygen-worker `ef_deploy`.)
- **Stage 3 — relax the A2 pin (brand governance + avatar supply).** Activate ≥N `realistic` role avatars per brand (`brand_avatar.is_active` flips). This is the actual differentiation enabler and a **brand-consistency decision for PK** (same decision surface as the Option C / A2 format-policy fork). (`sql_destructive` D-01; reversible is_active flips.)
- **Stage 4 — promote the suggested role to the consumed field.** ai-worker writes the resolved role into `stakeholder_role` (the field heygen-worker reads). With Stage 2's fallback in place and Stage 3's avatars active, `lookupAvatar` now resolves role → distinct avatar (`role_filter`), falling back to the default host on any miss. Differentiation goes live. (ai-worker `ef_deploy`.)

CFW + Invegent remain default-host/none until a separate **data build** (create stakeholders + avatars) — explicitly out of scope (no avatar creation here).

---

## 7. Data requirements per brand

- **NDIS-Yarns:** roles ✓ (7 active), avatars ✓ (14 provisioned, 1 active). To differentiate: activate chosen `realistic` role avatars (Stage 3). Gap: `character_brief` empty for all NY roles — not required for selection, but needed if later enriching narration per role.
- **Property Pulse:** roles ✓, avatars ✓ (14, 1 active), `character_brief` populated ✓. To differentiate: activate chosen `realistic` role avatars (Stage 3).
- **Care For Welfare / Invegent:** **zero** stakeholders and **zero** avatars. Require a full data build before any avatar differentiation; until then they must never route avatar (guard) — they have no fallback host either.
- **render_style axis:** only `realistic` is emitted by ai-worker and only `realistic` avatars are active. Keep `realistic` as the v1 differentiation axis; `animated` (already provisioned) is a later axis.

---

## 8. Risks and rollback

- **R1 (HIGH) — premature role consumption with pin=1 breaks renders.** If `stakeholder_role` is written to the consumed field while only one avatar is active and the resolved role ≠ the pinned role, `lookupAvatar` returns null and submit **throws** ("No active avatar"). *Mitigation:* Stage 1 shadow field + Stage 2 role-tolerant fallback **before** Stage 4. Never set the consumed field early.
- **R2 — resolver picks a role with no active avatar.** Acceptable: falls back to default host (Stage 2), logged in `avatar_identity`.
- **R3 — brand-consistency dilution.** The A2 pin was a deliberate single-host brand decision; relaxing it (Stage 3) is PK's brand call, not a technical default.
- **R4 — composite / multi-role personas** ("The Support Network — Coordinator, Plan Manager, and Provider"). A single talking-head must pick one primary presenter; multi-avatar dialogue is **explicitly out of scope** (documented intent, never implemented).
- **R5 — CFW/Invegent have no avatars.** Must never route avatar to them without a data build; guard/skip.
- **Rollback:** Stages 1/2/4 are EF redeploys of the prior version (no data migration). Stage 3 is reversible `is_active` flips (re-pin). No stage is one-way.

---

## 9. D-01 requirements

- **This brief:** read-only authoring → **no D-01**. Authority impact: none.
- **Stage 1** (ai-worker shadow emit): `ef_deploy` D-01 + PK exact phrase.
- **Stage 2** (heygen-worker role-tolerant lookupAvatar): `ef_deploy` D-01 + PK exact phrase.
- **Stage 3** (activate role avatars / relax A2 pin): `sql_destructive` D-01 + PK exact phrase, **plus an explicit brand-consistency decision** (A2-pin governance).
- **Stage 4** (promote role to consumed field): `ef_deploy` D-01 + PK exact phrase.
- DDL/DML on `c.*` only via `apply_migration`; EF deploys via Supabase CLI (CCD lane), never the MCP deploy wrapper. Every change closes "Authority impact: …".

---

## 10. Stop / escalation conditions

- **STOP** if any change would write `stakeholder_role` into the **consumed** field while the pin is still at 1 active avatar (Risk R1) — sequence Stage 2 + Stage 3 first.
- **ESCALATE to PK** the A2-pin relax (Stage 3) as a **brand-consistency decision**, not a technical default; it shares the decision surface with the Option C / A2 format-policy fork (gate review w/c 2026-06-15).
- **STOP / guard** any path that would route avatar to CFW or Invegent (zero avatars, no fallback host) until a data build lands.
- **ESCALATE** composite/multi-role personas with no single derivable presenter → default host (multi-avatar dialogue is out of scope).
- **ESCALATE** if Stage 1 shadow telemetry shows the LLM role extraction is unreliable → reconsider weighting toward the B3 override table before promoting to consumption.
- **Boundary reminder:** this lane does not create avatars, activate inactive avatars, change A2 pins, modify heygen-worker/ai-worker, mutate data, or update registers.

---

## Appendix A — Discovery questions answered

1. **Where is avatar selection decided today?** `heygen-worker.lookupAvatar` (runSubmitPhase) — role-less `LIMIT 1` over `c.brand_avatar` (`is_active`, `render_style`). The avatar *preference* (use avatar on YouTube) is set in `m.materialise_slots` (A2) + re-asserted as a *format* override in ai-worker; the avatar *identity* is heygen-worker.
2. **Fields heygen-worker uses:** `stakeholder_role` (`fmt.stakeholder_role ?? vs.stakeholder_role ?? null` — currently null); `avatar_identity` (it *writes* this at submit and copies to `post_render_log`; it does **not read** it for selection); `brand_avatar` (`heygen_avatar_id`, `heygen_voice_id`, `is_active`, `render_style`, `stakeholder_id`); `brand_stakeholder` (`role_code` via join); `draft_format` (render_style, stakeholder_role, narration_text, preset talking_photo_id/avatar_id, voice_id); `video_script` (render_style/stakeholder_role/narration_text fallbacks).
3. **Where could persona be translated?** series-outline (captures persona, pre-render, no role); fan_out_episode (carries persona, but a SQL fn — no LLM); **ai-worker (recommended — has persona-bearing seed + LLM + writes video_script)**; heygen-worker (only sees draft_format — wrong layer); dedicated resolver (clean but more infra). → B2 in ai-worker, optional B3 override.
4. **Schema that exists:** `c.brand_avatar` + `c.brand_stakeholder` (full columns in §3); `role_code` (NOT NULL) is the role vocab, `stakeholder_role` is the draft field heygen-worker reads; active flags (`brand_avatar.is_active` default false; `brand_stakeholder.is_active` default true); provider fields (`heygen_avatar_id`, `heygen_voice_id`, `render_style`, `avatar_type`, `avatar_display_name`, `consent_*`). Fully supports per-role avatars.
5. **Active avatars per brand:** NY 1, PP 1, CFW 0, Invegent 0.
6. **Inactive/unused available:** NY 13, PP 13 — all with HeyGen IDs + voices (realistic + animated per role); CFW 0, Invegent 0.
7. **Does the A2 pin need relaxing?** Yes for differentiation (it is the single-active-avatar constraint) — but it's a brand-governance decision; flag, don't change. Role emission can be inert until it's relaxed.
8. **Safest mapping persona → role/avatar/talking_photo_id:** emit a `role_code` from the brand's closed `brand_stakeholder` set, derived from persona (prefer `avatar_preference` over `persona_label`, `persona_notes` as context) via constrained LLM extraction (B2), optionally overridden by a per-brand table (B3); heygen-worker's existing `lookupAvatar` then resolves role → `brand_avatar` → `heygen_avatar_id` (talking_photo_id) + `heygen_voice_id`; always fall back to the default host.
9. **Deterministic or LLM-assisted?** Hybrid: LLM-assisted, role-constrained as primary (persona is free text); deterministic override table for stable mappings; deterministic default-host fallback. Pure `persona_label` string-match is too brittle.
10. **Default fallback host + persona-specific avatars?** Yes — exactly the recommended model.
11. **No matching avatar?** Resolve to the brand default host; never fail the render. (Requires Stage 2 to make `lookupAvatar` fall back instead of returning null.)
12. **Record in `avatar_identity`:** keep `{talking_photo_id, voice_id, render_style, stakeholder_role, avatar_selected_by}`; add `resolved_role`, `role_source` (llm | override_table | default | preset), `persona_signal` (the label/preference that drove it), `fallback_reason`, and `confidence` (if LLM). Continue copying verbatim into `post_render_log.render_spec`.
13. **Minimal implementation path:** the §6 four-stage plan — shadow-emit role → role-tolerant `lookupAvatar` → relax A2 pin (governance) → promote role to the consumed field. Differentiation goes live only at Stage 4, after the safety net (Stage 2) and avatar supply (Stage 3) are in place.

## Appendix B — Evidence (all read-only)

- **heygen-worker v2.1.1** (function version 35): `lookupAvatar` role filter (inert when role null, `LIMIT 1`, no `ORDER BY`); submit precedence preset → role_filter/fallback_limit1; `avatar_identity` written at submit, copied to `post_render_log` at terminal.
- **ai-worker v2.14.0** (function version 111): `generateVideoScript('video_short_avatar')` → `{format, narration_text, render_style:'realistic', total_duration_s}` (no role, no persona read); A2 override forces *format* only; `assemblePrompts` injects brand/platform/content-type prompts (persona → text).
- **Empirical drafts** (recent `video_short_avatar`): `video_script` keys `[format, narration_text, render_style, total_duration_s]`; `stakeholder_role` NULL; `avatar_selected_by='fallback_limit1'`; NY → `7e98bd38…`, PP → `5d03454f…` on every row.
- **Persona payloads** (`creative_intent.source_material.persona`, intent_kind='episode'): free-text; `persona_label` = audience (often composite), `avatar_preference` = free-text presenter direction, `persona_notes` = tone. CFW personas present despite zero avatars.
- **Inventory:** §3 tables (live `c.brand_stakeholder` + `c.brand_avatar`).
- **A2 pin:** `cc-a2-branch-a-host-pin.md` + live `brand_avatar.is_active` = 1 per brand (NY support_coordinator/realistic; PP buyers_agent/realistic).
