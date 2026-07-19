CLAIMED v5.95 · Video D6 Lane 4b (video-worker voice rewire → c.client_voice_config) · worktree ice-wt-video-d6-lane4b (merged) · gate: CLOSED (deployed + PK visual+audio PASS) · 2026-07-19

# Result — Video D6 Lane 4b: voice rewire → read `c.client_voice_config` — CLOSED. **VIDEO D6 ARC COMPLETE.**

**Status:** ✅ CLOSED — PK visual+audio PASS on the spine+DB-voice parity smoke. **This closes the entire Video D6 arc.** **Lane class:** PRODUCT_PROOF (generalization). **Tier:** T3 (code + EF deploy).
**Brief:** `docs/briefs/video-d6-lane4b-voice-rewire-gate1-brief-v1.md`. **Deployed:** video-worker `v3.8.0 → v3.9.0`.
**Commit:** `68751f3` (rewire, rebased onto `f0a4c39`) on `main`/origin.

## What shipped

video-worker voice resolution now reads the governed table `c.client_voice_config` (Lane 4a), retiring the hardcoded `VOICE_ENV_BY_CLIENT_ID` map (Option Y — all sites, map dropped).

- New async `resolveGovernedVoice(supabase, clientId)`: service-role read of `c.client_voice_config WHERE client_id=$1 AND enabled` (mirrors the existing `isVideoGovernanceEnabled` read). Returns `{voiceId, method:'db:client_voice_config'}` or fail-closed `{null,'unresolved'}` — **never throws inside the resolver** (any no-row/disabled/null/empty/error → unresolved); callers keep their existing `if (!voiceId) throw` fail-loud.
- All **3** call sites rewired (`renderGovernedVideoStat` production, `governed_video_stat_smoke`, legacy `processDraft` `_voice`).
- **DELETED:** `VOICE_ENV_BY_CLIENT_ID`, the slug-alias fallback, `UUID_RE`, and the env-based `getVoiceIdForDraft`. `ELEVENLABS_API_KEY` unchanged.

**Behavior-preserving (evidence-checked):** the map's only real consumers are PP + NDIS, both in the table with **identical** voice IDs (NDIS hash-verified == secret in L4a). Evidence for the review's slug-alias pushback: no client outside PP/NDIS matches the alias patterns (query empty); the one other voice-draft producer (`3eca32aa`, last 2026-05-25) doesn't match the aliases either → already failed closed under the old code → unchanged. `client_id` PK guarantees `.maybeSingle()` never hits the 2+-row path.

## Proof chain (T3)

- **ef-builder:** isolated worktree; `deno test -A video-worker/` → **96 passed / 0 failed** (+7 new resolver tests); `deno check` clean; scope = exactly 3 files. (Impl note: `supabase` param type loosened to `{schema:(s)=>any}` to avoid TS2589; runtime unchanged.)
- **branch-warden:** `safe` (HEAD `bdca17e`, base, isolated; benign docs-only main drift → rebased onto `f0a4c39`).
- **db-rls-auditor:** `clean` high confidence — service_role SELECT present, PostgREST reachable (precedent parity with `client_creative_governance`), anon/auth denied, both rows present+enabled+non-empty, `.maybeSingle()` zero-row→null (fail-closed correct).
- **external review `c56169dc`:** `partial` (one `missing_evidence`/`scope_design_concern` — slug-alias) → **resolved with the DB evidence above**; PK accepted.

## Deploy + live proof (Convention-2 sequence, no STOP tripped)

1. Rebased onto `f0a4c39` (hash `2a6d0064` preserved) → FF main → **pushed** `68751f3` (parity 0/0).
2. Drift refresh: A-LE → **B-FD**.
3. `CREATOMATE_API_KEY` rotation confirmed (PK).
4. `safe-deploy.sh video-worker --allow-warn` → **v3.9.0 live**, exit 0; `verify_jwt=false` intact.
5. Post-deploy: deployed VERSION=`v3.9.0`; bundle carries `resolveGovernedVoice` + `db:client_voice_config`; **0 executable `VOICE_ENV_BY_CLIENT_ID`** (map gone); drift back to clean A-LE.
6. **Parity smoke** `governed_video_stat_smoke` → **succeeded** (render_log `def2195f`, `resolver_used=true`, `audio{voiceover:true, music_bed:true}`). The smoke requires a VO (throws if unresolved) + the map is gone → success proves `resolveGovernedVoice` read the table end-to-end and generated the VO from the table-stored PP voice ID. Same voice ID → **audio identical** to the L3-proven render `e37affd9`. **PK visual+audio PASS.** Fail-closed proven at unit (7 tests) + DB level.

## Live state — VIDEO D6 COMPLETE

The governed PP `video_short_stat` production path is **fully generalized**: spine-driven template + governed background-baked + governed logo (Lane 3) **and** governed voice from `c.client_voice_config` (Lane 4b) — **zero client hardcodes**, matching the image path. A new client's governed video needs only data (registry mapping + voice row + governance flip), no code deploy.

## Video D6 arc summary (all closed)
- **Lane 1** (v5.89 predecessor work): comment reconciliation + audio proof.
- **Lane 2** (v5.83): registry mapping — `select_template` resolves the video path (A baked-bg + A2 client-scope rung).
- **Lane 3** (v5.89): code de-hardcode D6-8/6/7 — production render spine-driven (video-worker v3.8.0).
- **Lane 4a** (v5.92): `c.client_voice_config` governed table applied dark.
- **Lane 4b** (v5.95, this): voice rewire — worker reads the table, map dropped (video-worker v3.9.0). **ARC CLOSED.**

## Carries (none blocking)
- `4b4e3d6` (parallel deploy-verifier v5.94) is a local-unpushed duplicate colliding with origin's v5.94 (shared-pool) — that lane's to reconcile; NOT touched here (R4).
- Full-spine video background (Option B, deferred; would revisit D2). Second-brand (NDIS) video enable = its own gate (needs baked template + governance flip + proof).
