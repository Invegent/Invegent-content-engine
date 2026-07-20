# Result — cc-0044 Checkpoint E: video-path data-only convergence (PP + NDIS)

**Completed:** 2026-07-20 Sydney · **Lane:** build lane + PK at every irreversible gate · **Brief:** `docs/briefs/cc-0044-ultimate-tmr-proof-1-data-only-onboarding.md` (Checkpoint E) · **Baseline:** `_harness/cc0044_cp0_livetruth/CP0_BASELINE_MATRIX.md`.

## Outcome (proven)
> PP and NDIS Yarns use the **same generic video template `c11bb8ab`**, with every client difference —
> **background, logo, voice, brand intro** — supplied entirely through **governed data**, proven by
> automated governed smokes through the deployed spine, with **zero client-specific code**.

The D2 baked-bg divergence is retired: the video path now mirrors the image path's data-only property.
**NDIS production video enablement remains OFF** (`c.client_creative_governance` untouched — separate PK gate).

## Steps, evidence, artifacts

**Step 1 — Option B code (v3.10.0).** `b1_video_stat.buildGovernedVideoStatPlan` binds `Background.source`
OPTIONALLY (present→governed dynamic bg; absent/blank→omit, baked-bg byte-unchanged); the smoke entrypoint
de-hardcodes its voice client to `smokeBody.client_id`. Reviewed diff sha `66255db3`; branch-warden safe;
external review a3485b46. Deployed CE `main e8c8679` (fn v64, verify_jwt=false); deploy-verifier PASS; drift clean.

**Step 2 — dark scope-only convergence (V-A).** `c.creative_provider_template a3d8472d` scope client→generic,
client_id PP→NULL. Rationale: `UNIQUE(provider, provider_template_id)` forbids a duplicate registry row on
`c11bb8ab` (one Creatomate template = one registry row, shared via assignments). db-rls-auditor pass · external
review 85f59237 (agree) · forward.sql sha `66b9ea16` · rollback `10a90775`. Applied 2026-07-20 via execute_sql
(PK gate). Verified: PP unchanged (baked bg via assignment 1ee1a547); NDIS `wrong_scope→no_assignment`.
Backfill: `supabase/migrations/20260720040000_video_c11bb8ab_scope_client_to_generic_v1.sql`. Harness `_harness/cc0044_cpE_step2_scopeflip/`.

**Controlled renders (bootstrap for the proofs).** Direct Creatomate renders (bypass select_template) with each
client's resolved governed assets, produced with PK-provided keys (local env keys were invalid; Creatomate 403 =
Cloudflare UA block → browser User-Agent). PP `f607a66d` (bg_pp_family_backyard_summer + pp_logo_primary + voice
YCxe + "Property Pulse" intro); NDIS `233ab253` (bg_ny_morning_light_home + ny_logo_mark_only + voice iami +
"NDIS Yarns" intro). **PK visual+audio PASS both.** Recipe/manifest `_harness/cc0044_cpE_coupled_proof/`.

**Step 3 — governed video enablement (coupled).** One atomic txn: (1) template-level dynamic `Background` field
on a3d8472d (mirror `0e006c5c`'s `bd38617e`); (2) fresh PP `visual_approval` proof vs f607a66d (supersedes baked
`58c8ac8f`); (3) NDIS `visually_approved` assignment + passed proof vs 233ab253. In-txn fail-closed postcondition
(both selectors ok + Background.source). db-rls-auditor pass · external review 0b709641 (partial→PK gate, no
defect) · forward.sql sha `a5f15afa` · rollback `e775fc2c`. Applied 2026-07-20 via execute_sql (PK-run). Verified
post-apply: PP `ok`+dynamic bg, NDIS `no_assignment→ok`+dynamic bg, CFW/Invegent unchanged. Backfill:
`supabase/migrations/20260720130000_video_c11bb8ab_bgfield_pp_reproof_ndis_assign_v1.sql`. Harness `_harness/cc0044_cpE_step3_enable/`.

**Step 5 — narration de-hardcode (v3.11.0).** `composeGovernedVideoNarration(fields, brandIntro?)` — governed
`brand_name` intro (neutral fallback), retires the hardcoded "Market update."; getBrand exposes raw `brandName`.
Diff sha `3ef1ff91`; branch-warden safe; external review 722cdb41. Deployed CE `main fb98dab` (fn v65,
verify_jwt=false); deploy-verifier PASS (all 3 markers present, retired hardcode absent); drift refreshed A-LE/clean.

**Step 6 — final governed smokes (both PASS).** Fired via pg_net (`x-video-worker-key` read inline from vault
`publisher_api_key`, never surfaced). PP render `a00cdc4e`, NDIS render `cd53ec0d` — both `ok` / provider
`c11bb8ab` / **version v3.11.0**; the deployed spine auto-resolved each client's governed Background + Logo, VO +
music bed. Smoke path is fixed (`_smoke/governed_video_stat_v1.mp4`) → ran sequentially. Commands `_harness/cc0044_cpE_coupled_proof/STEP6_GOVERNED_SMOKE_COMMANDS.md`.

## Guardrails honoured
No proof written before a real PK-reviewed render (controlled renders first, PK PASS, then proofs referencing
them) · NDIS production video stays OFF · deploys via safe-deploy.sh (verify_jwt via config.toml) · execute_sql
+ backfill for DDL/DML (apply_migration deny-listed) · external review re-pinned per artifact; hash preserved
across rebase · keys handled without entering the transcript (vault-inline for the smoke; PK-provided files for
the controlled renders).

## Open carries (recording only)
- **DB ledger rows** for the two backfilled migrations — `supabase_migrations.schema_migrations` currently omits
  the execute_sql-applied migrations (a standing multi-lane reconciliation; several lanes owe it). Insert SQL is
  ready if PK wants the DB ledger reconciled now (see the register-recording handoff).
- **Register pointer** entries (this recording) + commit of the two migration files (PK commit gate).
- The `20260720120000` parallel asset-gap migration and prior execute_sql migrations remain a separate ledger
  reconciliation, not owned by this lane.
