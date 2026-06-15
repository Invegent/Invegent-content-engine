# F-SERIES-AVATAR-DIFFERENTIATION — Stage 1.5 (Hybrid Narrator) Close-out

**Date:** 2026-06-15 Sydney
**Lane:** CCH reconciliation (docs-only)
**Verdict:** DEPLOYED / VERIFIED WITH OBSERVATIONS
**PK narrator-model decision:** Option C (Hybrid) — default Brand Host; opt-in Multi-Perspective presenter mode.
**Authority impact:** none (series-outline is upstream content planning; as-built decision flow + T1 unchanged; avatar selection untouched).

## What shipped (prior lanes this arc)

- **series-outline v1.5.0 → v1.6.0** (Stage 1.5 Hybrid narrator). Commit `d5ee38997a4239ed3755340e12c7aaa3940ed36e`; content SHA `66b908b219b1f36410668694b8ad0eed2f785c48`; 21,362 bytes. Deployed via Supabase CLI `--no-verify-jwt` (CCD lane); `verify_jwt=false` preserved in committed source.
- **D-01 `c02ab9af-c384-42e9-8fcf-44a003fd5025`** — verdict agree / low / high; `pushback_points: []`; escalate=true solely for the PK exact-phrase deploy gate (type-(a) governance requirement, not a substantive objection).
- **PK exact-phrase approval:** "PK APPROVES F-SERIES-AVATAR-DIFFERENTIATION STAGE 1.5 SERIES-OUTLINE V1.6.0 DEPLOY".

## What v1.6.0 does (additive, opt-in, shadow-only downstream)

- `detectMultiPerspective(title, topic, goal, roles)` — conservative detector: fires on (1) an explicit multi-perspective signal phrase (18 phrases) OR (2) ≥3 distinct active brand roles named. Otherwise → Brand Host (default path byte-identical to v1.5.0).
- Multi-Perspective mode: reads active `c.brand_stakeholder` (read-only, same shape ai-worker shadow suggester reads), injects the closed role taxonomy, instructs `avatar_preference = "role_code=<code>; presenter=<plain English>"`, varies per episode, never invents a role, falls back to `brand_host`. Wrapped in try/catch → on failure brandRoles=[] → Brand Host.
- Adds `narrator_mode` + `narrator_mode_trigger` to the success JSON response (telemetry; NOT persisted to DB — known limitation).
- **No schema change / no migration / no consumed `stakeholder_role` write / no heygen-worker change / no ai-worker change / no avatar activation.** `save_series_outline` call + args unchanged.

## Verification evidence (T+0 generation layer, T+1 render layer; all read-only)

Three test series:
- PP multi-perspective `505263e5-d0f4-48e2-b6d3-d36b92a54682` (5 ep) — role-encoded: investor, first_home_buyer, investor, buyers_agent, landlord (4 distinct/5).
- NY multi-perspective `d7139b3c-f9ec-4fcf-9a4d-f92dbc547a6f` (5 ep) — participant, family_carer, support_coordinator, support_worker, allied_health_provider (5 distinct/5).
- PP control `89ee28ae-5760-4d3e-8f49-b6bfd94eb425` (3 ep) — NOT role-encoded; single CPA host ("same presenter across series"). Brand Host preserved.

Findings:
1. Multi-perspective series generate taxonomy-driven presenter diversity; control preserves Brand Host. Prior Seven-Perspectives convergence broken on the identical topic.
2. All 9 distinct role_codes 100% taxonomy-compliant (active `c.brand_stakeholder` members); 0 invented roles.
3. Stage 1 shadow suggester consumes the richer `avatar_preference` cleanly — NY ep2 family_carer (0.99), ep3 support_coordinator (0.97), ep4 support_worker (0.98); PP ep2 first_home_buyer (0.99); all `role_source=llm`.
4. Consumed `stakeholder_role` NULL on every row (avatar_identity + video_script). Avatar selection `avatar_selected_by=fallback_limit1` wherever rendered.
5. A2 pin holds: NY renders talking_photo `7e98bd3860f14ee18c9b4909e46ac77c` (Support Coordinator), PP `5d03454fbd0c469692f1a27ccbe6a000` (Buyer's Agent). Diverse suggestions → single pinned host rendered = DESIGNED OUTCOME.
6. Format diversity (v3.53) holds: FB→carousel/text (no video), IG→video_short_avatar/carousel, LI→text, YT→video_short_avatar/kinetic_voice. No platform dropped.
7. Cross-publish: 0 non-YouTube drafts stamped with YouTube publish data. Assetless publish: 0 (asset-guard held).

## Observations (non-blocking — NONE caused by Stage 1.5)

- **PP ElevenLabs voice-config gap** — 1 failed render (PP YT ep1 `video_short_kinetic_voice`, engine `creatomate+elevenlabs`, "No ElevenLabs voice ID configured for client"). Pre-existing; not the avatar path; would fail identically on v1.5.0.
- **NY carousel image-gen failure blocked by asset guard** — NY ep4 FB `asset_guard_blocked:carousel_image_failed`. Guard correctly prevented an assetless publish. Known CFW-class silent image-gen loss.
- **`narrator_mode` not persisted** — only in the EF response. Future additive telemetry tweak if stored mode is wanted.
- **Duplicate/superseded control series `2d4ab2b8`** (status `writing`) — harmless; not audited.
- **Control series still completing naturally** — only 1 draft at T+1; mid-pipeline, not a gap.

## Carry change

- **CLOSED:** F-SERIES-AVATAR-DIFFERENTIATION Stage 1.5 (Hybrid narrator generation) → DEPLOYED / VERIFIED WITH OBSERVATIONS.
- **OPENED:** **AVATAR-GOVERNANCE-PLANNING (Branch B readiness)** — P3, planning-only (NO implementation): dormant avatar inventory review; `lookupAvatar` hardening review; `stakeholder_role` consumption planning; Branch B readiness assessment. Each downstream step remains its own gate (D-01 + PK phrase). No avatar activation, no Stage 2 start authorised by this close.

## Branch-B planning blocker statement

**No unresolved item blocks Branch B (Avatar Governance) PLANNING.** The two render/publish observations are pre-existing, non-v1.6.0, and orthogonal to avatar governance. Branch B *implementation* (avatar activation, role consumption, `lookupAvatar` hardening) remains separately gated and is NOT authorised by this close.

## Lane footprint

Docs-only reconciliation. 0 code / 0 DB / 0 migration / 0 deploy / 0 avatar activation / 0 stakeholder_role consumption / 0 heygen / 0 ai-worker / 0 queue / 0 production mutation this pass. (The v1.6.0 commit + CLI deploy were prior lanes.)
