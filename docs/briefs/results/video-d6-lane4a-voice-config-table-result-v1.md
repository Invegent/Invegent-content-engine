CLAIMED v5.92 · Video D6 Lane 4a (client_voice_config governed table) · main (no worktree — docs+dark DDL) · gate: CLOSED (DDL applied + populated + verified) · 2026-07-19

# Result — Video D6 Lane 4a: D6-9 voice map → governed table (dark) — CLOSED

**Status:** ✅ CLOSED — `c.client_voice_config` applied, populated (PP+NDIS), verified. **Ships DARK** (no runtime reader until Lane 4b). **Lane class:** PRODUCT_PROOF (generalization). **Tier:** T2.
**Brief:** `docs/briefs/video-d6-lane4-voice-governance-gate1-brief-v1.md`. **Base HEAD:** `a43a301`.
**Migration:** `supabase/migrations/20260719180000_create_client_voice_config_v1.sql` (hash `c3bf6f0c…` at review; renumbered from `20260719170000` on a ledger collision — see below).

## What shipped

A governed `c.client_voice_config` table (Option B — stores the ElevenLabs voice ID **value**; voice IDs are public identifiers, NOT credentials; `ELEVENLABS_API_KEY` unchanged). Replaces the hardcoded `VOICE_ENV_BY_CLIENT_ID` code map so a new client's voice is added via **data, not a code deploy**. Columns: `client_id` (PK, FK→`c.client` ON DELETE CASCADE), `elevenlabs_voice_id` (text, non-empty CHECK), `enabled` (bool default true), `created_at`/`updated_at`.

**Security posture** — a faithful mirror of `c.client_creative_governance`: RLS **enabled, 0 policies** (deny-all), `force_rls=false`; grants `service_role` SELECT/INSERT/UPDATE/DELETE + `inspector_ro` SELECT only; **zero anon/authenticated/public grants**; service_role (BYPASSRLS) is the runtime reader/writer. Atomic apply; rollback = `DROP TABLE`.

## Proof chain (T2)

- **db-rls-auditor:** ✅ **clean/pass**, high confidence, 0 must-fix — faithful mirror, no REST/anon path, FK targets confirmed PK, atomic, clean rollback. 2 low deferrable notes (no `updated_at` trigger; `inspector_ro` SELECT is RLS-row-blocked — both identical to the mirror).
- **external review `5bc38793`:** ✅ **agree / medium / high / proceed** (pinned to migration hash `c3bf6f0c…`).
- **PK apply gate:** authorized (DDL apply); population PK-run (secret rider — values never in transcript).

## Apply + verification

- **DDL applied** via PK-authorized `execute_sql` (`apply_migration` deny-listed). Post-apply readback: `rls_enabled=true` · `force_rls=false` · `policy_count=0` · zero anon/auth/public grants.
- **Population** (PK-run INSERT, values from the EF secret store — never in transcript): 2 rows — PP `4036a6b5-…` + NDIS `fb98a472-…`, both `elevenlabs_voice_id` non-empty (len 20, valid ElevenLabs shape), `enabled=true`. **NDIS row hash-verified** against `ELEVENLABS_VOICE_ID_NDIS` (`sha256 bccec010…` == secret) — no paste error; PP sourced from its secret (not shell-reachable, so not hash-checked here — L4b render is the definitive parity proof).
- **Advisor delta:** exactly **1 new INFO** (`rls_enabled_no_policy`, same as the mirror), **0 new ERROR/WARN**.
- **Ledger:** ⚠ original version `20260719170000` collided with a parallel lane (`cc_0042_appetite_inventory_read_path_v1`) → **renumbered `20260719180000`**; file renamed + ledger backfilled (statements + rollback) under the new version. Migration identity = new number [[apply-migration-mints-own-version]].

## Live state

`c.client_voice_config` is live and correctly fenced, holding the PP + NDIS voice IDs. **Nothing reads it yet** — video-worker still resolves voice via `VOICE_ENV_BY_CLIENT_ID` (unchanged, byte-identical). The table activates only at Lane 4b.

## NEXT — Lane 4b (T3 code + deploy), FENCED (own PK gate)
Rewire video-worker voice resolution to read `c.client_voice_config` (DB read in the caller; pure helper keeps validation), drop the `VOICE_ENV_BY_CLIENT_ID` map + slug-alias fallback (table authoritative, fail-closed), deploy, parity proof (a governed PP video render resolves the same PP voice via the table → method `db:client_voice_config`, audio identical) + fail-closed proof for an unconfigured client. Completes Video D6 — the video path fully generalized (spine + governed voice, no client hardcodes).
