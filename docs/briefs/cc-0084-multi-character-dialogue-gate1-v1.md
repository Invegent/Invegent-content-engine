# Brief cc-0084 — multi-character dialogue avatar videos (cut-based)

**Created:** 2026-07-27 Sydney · **Author:** chat (orchestrator) · **Executor:** Claude Code (orchestrated ICE lane)
**Status:** draft · **Result file:** `docs/briefs/results/cc-0084-multi-character-dialogue.md` (on completion)
**Lane class:** PRODUCT_PROOF · **Tier:** T3 (EF deploys + live HeyGen renders)
**Task ID:** cc-0084 proposed (claim-stub verify before any register cut). Follows cc-0083 (role-lens single-role selection, PROVEN v6.35).

---

## Task

Build **multi-character dialogue** avatar videos: two governed stakeholder characters conversing in a single video (e.g. Local Area Coordinator ↔ participant, or Support Coordinator ↔ participant). Delivered as a **cut-based intercut** — each speaker's turn is its own HeyGen scene, stitched into one MP4 as a back-and-forth conversation. Prove it on NDIS-Yarns with the 3 active characters (Sarah/Alex/Marcus), contained (no publish).

The building blocks are already provisioned (cc-0083): 3 active NDIS avatars, a per-role resolver (`lookupAvatar`), and free-form `video_script` jsonb. This lane wires **multi-scene rendering** + **dialogue-script generation** on top — **no schema change required**.

## Source context

- `supabase/functions/heygen-worker/index.ts:182-189` — `submitHeyGenJob` builds `video_inputs` as an array but **hardcodes one element** (one speaker). Multi-scene = N elements, each a speaker's `talking_photo_id` + `voice_id` + line. `:147-173` `lookupAvatar` is a pure per-role resolver (already called twice per submit in cc-0083). Submit/poll: `HEYGEN_GENERATE` v2 `/video/generate` (`X-Api-Key`), status `/v1/video_status.get`.
- `supabase/functions/ai-worker/index.ts:427-448` — `generateVideoScript` avatar branch returns a **single** `narration_text`. A new `avatar_dialogue` branch returns an ordered `dialogue: [{speaker_role, line}]`.
- `public.set_draft_video_script` RPC merges the whole `video_script` jsonb verbatim under `draft_format.video_script` — **free-form, no shape validation** → a `dialogue[]` array persists with zero DDL.
- Active NDIS realistic avatars: support_coordinator/**Sarah** `7e98bd38` (`P2AIevlJ…`) · participant/**Alex** `b3a7e888` (`WaFYykjE…`) · local_area_coordinator/**Marcus** `45addba0` (`tweVhPmv…`). (Live role_code is `participant`.)
- Prior "dialogue" artifacts are all **doc/telemetry-only, unwired**: dead `c.client_brand_profile.persona_dialogue_mode` flag; `avatar-profiles-ndis-yarns.md:159` "dual-stakeholder scripts" note; `f-series-avatar-differentiation.md:146` "multi-avatar dialogue explicitly out of scope (never implemented)". Clean build.
- Governing predecessor: `docs/briefs/results/cc-0083-avatar-role-lens-selection.md`.

## Scope

**In scope (NDIS-Yarns, realistic, cut-based, 2 characters):**
- **Slice 1 — heygen-worker multi-scene render.** Detect a `dialogue[]` on the draft's `video_script`; resolve each distinct `speaker_role` via `lookupAvatar` (reused per role); build **N `video_inputs` scenes** in turn order (each = that speaker's talking_photo + voice + line). Deploy. **Validate with a HAND-AUTHORED 2-scene NDIS draft** (dialogue written directly into `video_script`, no ai-worker) → render → inspect the stitched MP4. This is the earliest possible HeyGen multi-scene validation (no standalone test — the key is EF-only).
- **Slice 2 — ai-worker `avatar_dialogue` script branch.** New format that, from a brief + a 2-role persona signal, returns an ordered `dialogue: [{speaker_role, line}]` (roles ∈ the client's active stakeholder set). Deploy.
- **Slice 3 — end-to-end contained proof.** A persona/brief → ai-worker dialogue script → heygen multi-scene render → verify: correct 2 characters, correct turn order, correct avatar per speaker, one stitched MP4. Contained (`platform='linkedin'`, skipped queue rows, per the cc-0083 containment recipe). No publish.

**Out of scope:**
- **Side-by-side / two-shot** (both characters in one shared frame) — HeyGen composition features the capability audit flags as unconfirmed/deferred; a separate lane if pursued.
- 3+ characters; non-NDIS clients; the animated render style; any publish; any schema change; changing the single-role cc-0083 path (dialogue is a NEW additive format, `avatar` monologue unchanged).

## Allowed / Forbidden actions

**Allowed:** read-only investigation; ef-builder in an isolated worktree (local-only) for the ai-worker + heygen-worker changes; hand-author a contained test draft's `video_script`; run the ICE review chain per slice (branch-warden · external review pinned to hash · db-rls-auditor if any DML); stage deploys for the PK gate.
**Forbidden:** no deploy/DML/merge/push without the PK gate (hard stops); no publish — every test/proof draft `platform='linkedin'` + `post_publish_queue status='skipped'`, never `platform='youtube'` (cc-0083 containment is mandatory and unchanged); do not touch the single-role monologue path, other clients, or animated style; honour active `docs/00_sync_state.md` holds. Deploy gotchas enforced at the gate: land to origin BEFORE deploy (drift-check hashes GitHub main), `--no-verify-jwt` preserved (config.toml-pinned), bundles-from-CWD grep, drift refresh.

## Success criteria (the proof)

1. A single NDIS video renders **two distinct characters in a conversation** (turn order preserved), each turn spoken by the correct governed avatar+voice for its `speaker_role`.
2. The dialogue script is generated by ai-worker (Slice 2/3) from a brief + 2-role signal — not hand-authored (hand-authoring is only the Slice-1 render validation).
3. One stitched MP4; telemetry records the per-scene avatar identities and scene count > 1.
4. Contained: 0 external posts for any test/proof draft.
5. The single-role monologue path (cc-0083) is unaffected (regression-free).

## Stop condition

When the end-to-end proof (Slice 3) renders a correct 2-character dialogue, contained, with no monologue regression — write the result per the result template and stop. **Named risk STOP:** if the Slice-1 validation shows HeyGen does NOT stitch multi-scene `video_inputs` into a usable conversational video (e.g. only renders the first scene, or produces an unusable artifact), HALT and surface to PK — the cut-based approach itself is then in question (re-scope decision).

---

## Notes — the hard part + apply order

- **The open risk is HeyGen's multi-scene behavior**, validated at Slice 1 (earliest cheap point): does a multi-element `video_inputs[]` stitch into a clean back-and-forth video? The array is documented to support it, but the codebase has never built it and the capability audit flags multi-character as unvalidated. Slice 1 validates the render capability with a hand-authored draft BEFORE ai-worker script-gen is built — so the risk is retired for the cost of one heygen-worker change + one render.
- **Apply order:** Slice 1 (heygen-worker render + validate) → Slice 2 (ai-worker dialogue script) → Slice 3 (proof). heygen-worker must handle `dialogue[]` before ai-worker emits it (fail-safe: a `dialogue[]` with an unknown/inactive `speaker_role` falls back to the default host for that scene, reusing cc-0083's fallback).
- **Open design details for the slice sub-briefs:** the `dialogue[]` element shape (`{speaker_role, line}` + optional per-scene background); turn/scene count cap (start 2–4 turns); how the 2-role persona signal is expressed to ai-worker (two `role_code`s in `avatar_preference`, or a `dialogue_roles` list); the 2-min render ceiling interaction (a multi-scene video is longer — confirm it renders within HeyGen's window).
