# Result — Shared Capability Contract classifier (define + build)

**Brief file:** `docs/briefs/shared-capability-contract-classifier-gate1-v1.md`
**Executed by:** Claude Code (orchestrator-driven)
**Completed:** 2026-07-28 Sydney (apply live + proven; record-commit HELD for PK)

---

## 1. Result status

`Complete (apply live + proven)` — `public.classify_format_capability` is applied to production, ledgered, and proven 6/6 correct. **Record-keeping HELD** per PK: lane files + result doc + register pointer are authored but NOT committed to main; no push; downstream (S2/S8) not yet notified.

## 2. Commit(s)

- Production DDL applied via `execute_sql` under the PK T3 apply gate (raw `apply_migration` is house-deny-listed). Function live in project `mbkmaxqhsohbtwsqolns`.
- Ledger row: `supabase_migrations.schema_migrations` version `20260728034955`, name `classify_format_capability_v1`.
- **No git commit yet** (PK hold before lane commit).

## 3. Files (authored, in isolated worktree `lane/shared-capability-classifier` @ base `7baa4f0`; uncommitted)

- `supabase/migrations/20260728034955_classify_format_capability_v1.sql` — the classifier (renamed from `NOT_APPLIED_…` to permanent identity; content sha256 `44770731aded356bc1fb3d9ab5f6219ace21d1b35937713a3b6e22dd54028629`, 18357 bytes, unchanged by rename).
- `_harness/classify_format_capability_v1_proof/PROOF_classify_format_capability_live_validation.sql` — read-only post-apply proof (expectations corrected to the proven silent-degrade precedence outcomes).
- `docs/briefs/shared-capability-contract-classifier-gate1-v1.md` — Gate-1 brief (main worktree, uncommitted).
- `docs/briefs/results/shared-capability-contract-classifier-result-v1.md` — this file.

## 4. What was built

`public.classify_format_capability(p_client_slug text, p_platform text, p_format text) RETURNS jsonb` — read-only SECURITY DEFINER classifier (owner postgres, STABLE, `search_path=''`, **service_role-only** EXECUTE), the Shared Capability Contract both S2 (Format Capability Indicator) and S8 (Asset Gap Register) block on. Given a `(client, platform, format)` cell it returns `{ status, reason_code, routed_lane, evidence }` — exactly one of six statuses (`ready · asset_shortage · template_missing · pipeline_missing · governance_unproven · unsupported_silent_degrade`) plus a fail-closed `unknown`. Composes `public.select_template` (governance authority) + `public.resolve_slot_assets` (shortage-vs-pipeline split via direct call) + `m.post_publish` (silent-degrade overlay). **Ships dark — no production consumer wired; enforcement is a separate future R3 lane.**

**PK design rulings baked in:** silent-degrade = 6th mutually-exclusive status, **precedence-first** (blocker preserved in `reason_code`); grant = **service_role only**; host = **DB RPC**; adjacency to `get_global_format_capability_pyramid` = **coexist-distinct** (its `proven_in_production` is NEVER read as Ready — the two disagree by design on the safety-critical cells).

## 5. Chain + proof (all clean)

- **brief-author** DRAFT_READY (findings clean); orchestrator verified the load-bearing select_template-collapse finding against source.
- **db-rls-auditor live-grounding**: settled 3 of 4 open design Qs with live evidence (shortage-vs-pipeline via nested resolution; silent-degrade must be composed from publish evidence — `final_format_authority` is ~1% covered; pyramid contradicts select_template by design).
- **db-rls-auditor migration review**: `pass`, zero must-fix (all 10 columns + 3 PKs verified live; every jsonb key emitted; grant service_role-only; zero new advisors).
- **branch-warden**: `safe` (isolated worktree, authored-only).
- **apply-harness-auditor**: N/A (plain CREATE FUNCTION + grants; no in-SQL declared-vs-enforced assertion harness).
- **external review** (`ask_chatgpt_review`): `agree`/proceed, risk medium, confidence high, no pushback; review_id `c0493a53`, pinned to `reviewed_input_hash = 44770731…`.
- **PK T3 apply gate**: authorized (Convention-2 conditional sequence, pinned). Steps 1–4 executed; STOPs never tripped.
- **Post-apply metadata readback**: owner postgres · secdef true · volatile `s` · `search_path=""` · svc_exec true · anon_exec false · auth_exec false.
- **Post-apply proof (6 cells):** ready×3 (FB/IG/LI image_quote) direct PASS; `video_short_avatar` YT → `unsupported_silent_degrade` (54 publishes/90d) PASS; **carousel IG + video_short_stat YT → `unsupported_silent_degrade`** — grounded in 3 recent publishes each; the precedence rule correctly overriding the naive expected blocker (preserved in `reason_code=no_selectable_template`). **All 6 correct per the ratified design.**
- **get_advisors (security):** zero new findings attributable to the function.

## 5a. Notable safety finding

The classifier surfaced that NDIS-Yarns **carousel and video_short_stat are ALSO silently auto-publishing ungoverned** (not just `video_short_avatar`) — fail-closed in `select_template` yet publishing live within 90 days, routed to `enforcement_r3`. This is precisely the blind spot the Shared Capability Contract was built to expose (governing rule: "capability readiness controls execution" — enforcement is the separate R3 lane).

## 6. Constraints confirmed (forbidden items — confirmed NOT done)

- Read-only classification only — no INSERT/UPDATE/DELETE, no DDL-in-body, no enforcement; does not touch the auto-publish / resolver_fallback / legacy path. Confirmed (function body + db-rls-auditor).
- service_role-only; REVOKE PUBLIC + anon + authenticated confirmed live (`anon_exec=false`, `auth_exec=false`).
- Ships dark — no production consumer wired.
- No new agent built.
- No worker/publisher/`select_template`/`resolve_slot_assets` behaviour changed; no production data/pool/fence mutation.
- Pyramid `proven_in_production` never mapped to `ready`.

## 7. Open issues / carries

- **PK hold:** commit lane files + result doc + register pointer to main, then push. Awaiting authorization.
- **Downstream unblock notice (S2 + S8):** facts-only relay pending PK go.
- **`c_silent_degrade_window` = 90 days** is a single tunable line — PK may revisit if the window should differ per platform/format.
- **Ledger `statements`** stores an apply-provenance note + hash pointer (the committed migration file is canonical source), not the re-embedded DDL — noted for a future drift/audit reader.

## 8. Next recommended step

PK authorizes the record commit (+ push) and the downstream unblock notice. Then the two blocked lanes (S2 Format Capability Indicator, S8 Asset Gap Register) can consume the interface. cc-0080-style enforcement of capability→execution remains a separate future R3 lane.
