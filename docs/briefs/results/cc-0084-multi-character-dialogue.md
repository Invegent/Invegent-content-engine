# Result — cc-0084 Multi-Character Dialogue (PROVEN in production)

**Date:** 2026-07-28 Sydney · **Lane:** cc-0084 · **Tier:** T3 · **Verdict:** ✅ PROVEN (cut-based)
**Governing brief:** `docs/briefs/cc-0084-multi-character-dialogue-gate1-v1.md` · **Register cut:** v6.41
**Follows:** cc-0083 role-lens single-role selection (v6.35).

---

## Outcome

Two governed stakeholder characters now **converse in a single video** — a **cut-based** multi-scene conversation (each turn is one speaker's HeyGen scene, stitched into one MP4). **ai-worker generates** the dialogue script from a brief + participating roles; **heygen-worker renders** it multi-scene. No schema change. The single-role monologue path (cc-0083) is untouched.

## The proof (Slice 3, end-to-end, contained)

A brief + `dialogue_roles=['local_area_coordinator','participant']` →
- **ai-worker generated** a 4-turn alternating conversation: LAC → participant → LAC → participant (natural back-and-forth on NDIS access).
- **heygen-worker resolved** each turn's avatar (Marcus `45addba0` / Alex `b3a7e888` / Marcus / Alex) → built **4 `video_inputs` scenes** → HeyGen rendered one MP4.
- `video_status=generated`, `render_status=succeeded`, `scene_count=4`, `mode=dialogue`.
- **Containment:** 0 `post_publish` rows (LinkedIn + skipped queue — cc-0083 recipe). Nothing posted.

(Slice 1 was separately validated on a hand-authored 3-turn draft — HeyGen accepted + rendered a multi-element `video_inputs[]`, retiring the "does HeyGen stitch multi-scene" risk before ai-worker work began.)

## The arc (3 slices + 1 fix)

- **Slice 1** — heygen-worker **v2.4.1→v2.6.0**: `submitHeyGenJob` generalized to N `video_inputs` scenes (monologue payload byte-identical); `runSubmitPhase` detects `video_script.dialogue[]` → `buildDialogueScenes` (per-role **cached** `lookupAvatar` + cc-0083 per-scene default-host fallback, turn order); telemetry `avatar_identity{mode:'dialogue', scene_count, dialogue_identities[]}`. Commit landed to origin; deploy-verifier content PASS; validated live.
- **Slice 2** — ai-worker **v2.23.0→v2.24.0→v2.24.1**: new format `video_short_avatar_dialogue`; `generateDialogueScript` (reuses the active-role query; LLM alternating conversation from `input_payload.source_material` + `dialogue_roles`; hard validate/repair against the active stakeholder set; caps 4 turns / 320 chars). Emits `video_script.dialogue[{speaker_role,line}]` + `draft_format.scene_count`; **fail-safe** — any miss degrades to the monologue path.
  - **v2.24.1 fix** (bug caught by the Slice 3 live proof at Checkpoint A): the scene_count stamp was a full `.update({draft_format:{...draftMeta,scene_count}})` AFTER `set_draft_video_script`, **clobbering the just-merged `video_script`** (heygen then found no `dialogue[]`). Fixed by `persistDialogueDraft`: scene_count stamp FIRST, then `set_draft_video_script`'s `||` merge adds `video_script` on top. External review agree/proceed (high confidence, `88b0edd1`).
- **Slice 3** — the end-to-end contained proof above.

Per-slice chain: ef-builder (tests green — heygen 23/23, ai-worker 64/64 incl. the persist-order regression test) · branch-warden · external review pinned to hash · deploy-verifier content PASS · verify_jwt=false · live proof · contained.

## Standing facts / carry

1. **HeyGen `video_inputs` is an array** — multi-element = a **cut-based** (intercut) multi-speaker video, one talking head per scene. Confirmed accepted + rendered live (Slice 1 + 3).
2. **Dialogue contract (no schema):** `video_script.dialogue = [{speaker_role, line}]` (free-form jsonb via `set_draft_video_script`'s `||` merge); heygen reads `turn.speaker_role`/`turn.line`; `draft_format.scene_count` drives `qa.scene_count`. Roles validated against the client's ACTIVE `c.brand_stakeholder` set; unknown/inactive role in a turn → default-host fallback for that scene.
3. **⚠ jsonb write-order gotcha:** `set_draft_video_script` is a `||` MERGE; a plain supabase `.update({draft_format:...})` is a **full-column REPLACE** — never do a replace-update to `draft_format` AFTER a video_script merge, or it clobbers video_script. Order additive writes so the merge runs last (see [[cc0083-role-lens-avatar-selection-live]] for the deploy/harness gotchas).

## Following outcome (next phase) — single-frame two-shot

The user asked whether HeyGen can put both characters **in one shared frame** ("in a room together"). Research finding: **yes, via a different endpoint** — **Cinematic Avatar** (`POST /v3/videos`, `type:cinematic_avatar`, `avatar_id` = array of up to 3 "looks", "multiple looks let HeyGen feature more than one avatar in the same shot"). **But** it is **generative/prompt-driven (Seedance)**, capped at **15s**, and does **NOT** confirm precise per-character scripted lip-sync — a different capability class (short cinematic establishing shots), not long scripted dialogue. Unconfirmed whether existing `talking_photo` avatars qualify as "looks." **Deferred phase:** would need a paid test render to confirm scripted-voice + avatar compatibility before committing; the cut-based sequence (this lane) remains the controllable option for long scripted conversations. (Sources: developers.heygen.com/cinematic-avatar, /avatar-shots.)

## Closeout

Proof drafts (`created_by IN ('ice-dialogue-proof','ice-dialogue-proof-s3')`) neutralized to `voided` then torn down child-first. LinkedIn-contained MP4s never posted.
