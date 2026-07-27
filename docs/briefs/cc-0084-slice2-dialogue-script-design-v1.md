# cc-0084 Slice 2 — ai-worker dialogue-script generation (design v1)

**Lane:** cc-0084 · **Slice:** 2 (code) · **Tier:** T3 (EF deploy) · **Executor:** ef-builder (isolated worktree, local-only)
**Governing brief:** `docs/briefs/cc-0084-multi-character-dialogue-gate1-v1.md` · **Depends on:** Slice 1 (heygen-worker v2.6.0 multi-scene, LIVE)

---

## 1. Purpose

Make **ai-worker generate** the dialogue script that Slice 1's heygen-worker already renders. New avatar format `video_short_avatar_dialogue`: from a brief + a set of participating stakeholder roles, produce an ordered `dialogue: [{speaker_role, line}]` conversation. heygen-worker v2.6.0 (already live) consumes `video_script.dialogue[]` and renders the multi-scene video — so Slice 2 only needs ai-worker to EMIT it. No schema change. The single-role monologue path (cc-0083) stays untouched.

## 2. Touchpoints (ai-worker, `supabase/functions/ai-worker/index.ts`)

- **Format routing / A2 override (~:1176-1181):** today forces `decidedFormat='video_short_avatar'` when `input_payload.format==='video_short_avatar'`. Add: when `input_payload.format==='video_short_avatar_dialogue'` → force a dialogue path.
- **Script generation (~:427-448, avatar branch):** add a NEW `generateDialogueScript(...)` alongside the monologue avatar branch — do NOT modify the monologue branch. It returns `{ format:'avatar_dialogue', dialogue:[{speaker_role, line}], render_style:'realistic', total_duration_s }`.
- **Persist (~:1355-1376):** write via `set_draft_video_script` with the dialogue object; also set `recommended_format='video_short_avatar'` (heygen-worker keys pickup on that, then detects `dialogue[]`) and `draft_format.scene_count=dialogue.length`. `approval_status='needs_review'` (unchanged flow).
- Active-role source (reuse cc-0083 pattern): the client's ACTIVE `c.brand_stakeholder.role_code` set (the same query `suggestAvatarRole` uses, ~:437-441) — every emitted `speaker_role` MUST be in it.

## 3. Dialogue generation contract

`generateDialogueScript({ brief, participatingRoles, activeRoles, ... })`:
- **Participating roles input:** `input_payload.dialogue_roles` (array of ≥2 role_codes) is the Slice-2 signal. Validate each against `activeRoles`; require **≥2 distinct valid roles** → else graceful fallback (see below). (Persona-derived roles — an LLM picking the 2 roles from a persona, à la `suggestAvatarRole` — is a later enhancement, out of Slice 2.)
- **LLM prompt:** given the brief + the 2+ participating roles (with their role_labels/persona_names), produce a natural **alternating** conversation on the brief topic: an ordered array of `{speaker_role, line}`, **2–4 turns** (cap configurable, default 4), each line concise (fits a short talking-head clip), each `speaker_role` exactly one of the participating valid roles. Return ONLY JSON `{dialogue:[{role_code, line}]}`.
- **Validation (hard):** drop/repair any turn whose `role_code` ∉ participating valid set; if after validation <2 distinct roles remain or <2 turns → fallback.
- **Fallback (never break the draft):** if roles are missing/invalid or generation fails → EITHER emit a single-role monologue via the existing avatar path (preferred — degrade to cc-0083 behaviour) OR mark the job failed with a clear reason. Choose degrade-to-monologue so a bad dialogue signal still yields a video. Best-effort, never throw into the draft lifecycle.
- **Duration:** `total_duration_s` = sum of per-turn estimates; keep the whole video within HeyGen's ~2-min ceiling (cap turns/length accordingly — carry from the brief).

## 4. Out of scope

Monologue path changes; persona-derived role selection (later); >4 turns; non-NDIS; animated; two-shot/single-frame composition (deferred phase); any schema; any publish.

## 5. Tests (ef-builder, local)

- 2 valid roles + brief → alternating `dialogue[]`, ≥2 turns, all roles in-set, JSON valid.
- A `dialogue_roles` entry not in the active set → dropped; if <2 remain → monologue fallback.
- No `dialogue_roles` / format='video_short_avatar' → unchanged monologue path (regression).
- Generation returns an out-of-set role_code in a turn → that turn repaired/dropped.
- Pure-helper unit for the validation/repair (mirror cc-0083's `promoteAvatarRole` test pattern).

## 6. Deploy (staged for PK gate)

VERSION ai-worker v2.23.0 → v2.24.0 + marker `ai-worker-cc0084-dialogue-script`. Land to origin BEFORE deploy (drift-check reads GitHub main); `safe-deploy.sh ai-worker --allow-warn`; verify_jwt=false (config-pinned); bundles-from-CWD marker grep; drift refresh; deploy-verifier PASS.

## 7. Slice 3 (after Slice 2 deploys)

End-to-end contained proof: seed a dialogue draft (brief + `dialogue_roles=['local_area_coordinator','participant']`) → ai-worker generates `dialogue[]` → heygen-worker renders the multi-scene MP4 → verify generated dialogue + correct avatars per turn + contained (LinkedIn, skipped queue). Then lane result doc + register pointers.
