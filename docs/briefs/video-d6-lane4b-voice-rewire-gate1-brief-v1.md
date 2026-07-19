# Brief — Video D6 Lane 4b: video-worker voice rewire → read `c.client_voice_config` — Gate-1

**Status:** Gate-1 DRAFT for PK admission. **Lane class:** PRODUCT_PROOF (generalization). **Tier:** T3 (production code + EF deploy). **This is the FINAL Video D6 step.**
**Base HEAD:** `ef42ee9` (origin/main, parity 0/0). **Predecessor:** Lane 4a v5.92 — `c.client_voice_config` applied + populated (PP+NDIS), dark.
**Governing:** arc brief `docs/briefs/video-d6-unblock-arc-gate1-brief-v1.md`; L4a result `docs/briefs/results/video-d6-lane4a-voice-config-table-result-v1.md`; [[voice-path-getbrand-uuid-fallback-rootcause]].

## Goal

Rewire video-worker voice resolution to read the governed `c.client_voice_config` table (applied dark in L4a), retiring the hardcoded `VOICE_ENV_BY_CLIENT_ID` map. Completes D6-9 and the whole Video D6 arc — the video path fully generalized (spine + governed voice, zero client hardcodes).

## Current state (grounded)

- `getVoiceIdForDraft` (pure, env-injected, [voice_id.ts](../../supabase/functions/video-worker/voice_id.ts)): client_id → `VOICE_ENV_BY_CLIENT_ID[clientId]` → env value; then slug-alias fallback (real slugs only); else null → caller fails loud.
- **3 call sites** (all share the map): [index.ts:958](../../supabase/functions/video-worker/index.ts:958) `renderGovernedVideoStat` (GOVERNED production) · [index.ts:1133](../../supabase/functions/video-worker/index.ts:1133) governed `governed_video_stat_smoke` · [index.ts:1018](../../supabase/functions/video-worker/index.ts:1018) `processDraft` (LEGACY kinetic/stat `_voice`).
- The map only ever holds PP + NDIS — the only real voice clients — and **both are now in `c.client_voice_config`** (L4a; NDIS value hash-verified == secret, PP from its secret). The slug-alias only matches pp/ndis/property. So the table is behavior-preserving for the realistic set.

## The rewire (T3 code)

- New async `resolveGovernedVoice(supabase, clientId): {voiceId, method}` — a service-role SELECT on `c.client_voice_config WHERE client_id = $1 AND enabled` (mirrors the existing `isVideoGovernanceEnabled` direct read in the same worker). Returns `{voiceId, method:'db:client_voice_config'}` or `{null,'unresolved'}` (fail-loud in the caller, unchanged).
- Replace the `getVoiceIdForDraft` calls per the scope decision below. Keep any pure validation as a testable helper; the DB read lives in the caller (purity preserved where it matters).

## Design decision for PK (Gate-1) — scope

- **Option Y — rewire ALL 3 sites, drop the map entirely** (*recommended*). `c.client_voice_config` becomes the single authoritative source for every voice path; delete `VOICE_ENV_BY_CLIENT_ID` + the slug-alias fallback + the now-dead `getVoiceIdForDraft` env plumbing. Behavior-preserving for PP+NDIS (same voice IDs via the table); stricter fail-closed for any other client (which the map only ever matched loosely via slug-alias, or not at all). Fullest de-hardcode — completes D6-9.
- **Option X — rewire only the 2 governed sites** (958, 1133); leave `processDraft` legacy voice (1018) on the env map. Minimal, zero legacy-path change — but the hardcode survives (map retained for legacy), so D6-9 is only partially closed.

*Recommendation: Y* — the map's only real consumers (PP, NDIS) are in the table with verified-identical IDs, so Y is behavior-preserving for production and removes the hardcode entirely. If you prefer zero risk to the legacy path, X keeps the map for legacy and I note D6-9 as partially-closed.

## Proof (exit)
- Hermetic tests (validation helper; DB-read mocked or covered by the live smoke).
- **Parity proof:** post-deploy `governed_video_stat_smoke` → the render resolves the PP voice via the table (`method='db:client_voice_config'`, **same voice ID** → audio byte-identical to prior). PK confirm (audio identical; a full visual gate is optional since only the voice-resolution source changed, not the render).
- **Fail-closed proof:** `resolveGovernedVoice` for a client with no `enabled` row → null → caller throws (no silent bad voice).
- **ENEL0 (Y only):** grep the deployed bundle confirms `VOICE_ENV_BY_CLIENT_ID` is gone.
- Chain: ef-builder (isolated worktree) · branch-warden `safe` · db-rls-auditor (read-only — the new SELECT path; the table already audited in L4a) · external review pinned to the final diff hash.

## In scope
- `video-worker/` only: `voice_id.ts` (→ DB-backed resolver, or removed if fully replaced) + `index.ts` (call sites + `VERSION` bump) + tests. Legacy `isKinetic`/`isStat`/spine/audio otherwise unchanged.

## Out of scope / Forbidden
- **No** change to `c.client_voice_config` schema/rows (L4a done). **No** `ELEVENLABS_API_KEY` posture change. **No** spine/`select_template` change. **No** image/ai-worker change. **No** new brand enablement, no publish.
- **No deploy** without the T3 chain + PK gate 2. **No push** without a PK gate. (Deploy via `scripts/safe-deploy.sh video-worker --allow-warn`; `verify_jwt` stays false; VERSION bump for drift reclassification.)

## Preconditions
- `CREATOMATE_API_KEY` (rotated, confirmed L3) + ElevenLabs available for the parity smoke render.

## Stop condition
Lane 4b STOPs at the PK deploy gate (gate 2) after the parity proof. On PASS, Video D6 is fully closed.
