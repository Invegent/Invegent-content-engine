# Brief — Video D6 Lane 4: D6-9 voice map → governed table — Gate-1

**Status:** Gate-1 DRAFT for PK admission. **Lane class:** PRODUCT_PROOF (generalization). **Tier:** T2 (dark table) → T3 (rewire + deploy) — split recommended.
**Base HEAD:** `1602f06` (origin/main, parity 0/0). **Predecessor:** Lane 3 v5.89 — video path spine-driven live (v3.8.0).
**Governing:** arc brief `docs/briefs/video-d6-unblock-arc-gate1-brief-v1.md`; [[voice-path-getbrand-uuid-fallback-rootcause]].

## Goal

Replace the hardcoded `VOICE_ENV_BY_CLIENT_ID` code map ([voice_id.ts:22](../../supabase/functions/video-worker/voice_id.ts:22)) with a **governed DB table**, so a new client's voice is added via data — no code edit, no deploy. This completes Video D6 (the last of D6-6/7/8/9) and the "any client without code changes" generalization goal.

## Current state (grounded)

- `VOICE_ENV_BY_CLIENT_ID`: `client_id` → **env-secret NAME** (`ELEVENLABS_VOICE_ID_PP`, `ELEVENLABS_VOICE_ID_NDIS`); the env secret holds the actual ElevenLabs voice ID *value*.
- `getVoiceIdForDraft` (pure, injectable env): (1) client_id → env-name → value; (2) slug-alias fallback (real slugs only, never a UUID); (3) unresolved → caller fails loud.
- **Scope is bounded:** only `video-worker` consumes it (`index.ts` + `voice_id.ts` + test). No other worker, no duplicate.
- **Not broken:** the map is already client_id-keyed + fail-closed. This lane is de-hardcoding for generalization, NOT a bug fix (lowest-urgency of the four D6 items).

## Design decisions for PK (Gate-1)

1. **What the table holds — the posture question.**
   - **B — voice ID value in the table** (`client_id → elevenlabs_voice_id`) — *recommended*. ElevenLabs voice IDs are public-ish identifiers (config, not credentials — the secret is `ELEVENLABS_API_KEY`, unchanged). Fullest de-hardcode: removes both the code map AND the env indirection; a new client's voice is pure data. Populating PP+NDIS needs the two current voice-ID values once — either a **read-only secret USE** of `ELEVENLABS_VOICE_ID_PP`/`_NDIS` (T2 + secret-handling rider, USE-only, never in transcript) or PK supplies them.
   - **A — env-name indirection** (`client_id → env_secret_name`) — de-hardcodes the map but keeps the value in secrets; runtime reads table → env var. No value ever enters the DB. Smaller posture change, but a new client still needs a new env secret set (partial generalization).
2. **Runtime read mechanism.**
   - **ii — direct service-role SELECT** in the worker — *recommended*: mirrors the existing `isVideoGovernanceEnabled` governance read in the same worker; minimal surface.
   - **i — RPC `select_voice(client_id, format)`** returning the voice fail-closed: mirrors the `select_template` spine; heavier, but centralizes fail-closed logic and is reusable.
3. **Fallback disposition.** Keep the env-map + slug-alias as a transitional fallback, or make the table authoritative + fail-closed (drop the map, mirroring how Lane 3 dropped the direct-bind)? *Recommended:* table authoritative, fail-closed if absent — but only after the table is fully populated + proven (so L4b drops the map).
4. **Table shape.** Per-client (`client_id` PK), format-agnostic — matches current behavior exactly. Reserve a nullable `format` + `enabled` flag for future per-format voices? *Recommended:* per-client + `enabled`, no format column (YAGNI; add later if needed).

## Proposed lane split
- **L4a (T2, dark):** create `c.client_voice_config` (RLS deny-all · service_role SELECT · service_role DML · anon/auth/public=0 · non-REST) + populate PP+NDIS. No runtime reader yet. db-rls-auditor + external + PK apply gate; rollback = drop table.
- **L4b (T3, code+deploy):** rewire `getVoiceIdForDraft`/caller to read the table (DB read in the caller; pure helper keeps validation), drop the map per decision 3, deploy video-worker, parity proof (a governed PP video render still resolves the same PP voice → `getVoiceIdForDraft` method changes, output identical).

## In scope
- L4a: one additive table `c.client_voice_config` + RLS + PP/NDIS rows.
- L4b: `video-worker` voice resolution rewire (DB-backed) + tests + deploy.

## Out of scope / Forbidden
- **No** change to `ELEVENLABS_API_KEY` or any API-key secret posture. **No** new brand enablement. **No** image/ai-worker change.
- **No** DDL/DML until the L4a apply gate; **no** deploy until the L4b PK gate; **no** publish.
- No touching the spine (`select_template`/`resolve_slot_assets`) — voice is a separate axis.

## Required proof
- L4a: table + RLS verified (deny-all, service-role only, non-REST); PP+NDIS rows correct; advisor delta benign.
- L4b: hermetic tests; a governed PP video render resolves the same PP voice via the table (method `db:client_voice_config`), audio identical; fail-closed proof for an unconfigured client.

## Stop condition
L4a STOPs at the PK apply gate; L4b STOPs at the PK deploy gate. Nothing beyond the admitted sub-lane without a fresh PK gate.
