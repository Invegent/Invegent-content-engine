# BUILD PACKET v2 — `ice_ro` R0 views + USAGE-confined `ice_readonly` role (for the PK apply gate)

**Lane:** Permission-friction read-only DB path. **Tier:** T3. **Supersedes:** the v1 packet (preserved at `1e0dae7`; **do NOT apply v1**).
**Design:** `permission-friction-readonly-db-path-design-v2-amendment.md` (PK-directed). **Exposure baseline:** withhold-all (actor cols + secondaries excluded, per PK/orchestrator 2026-07-19).
**Branch:** `ice-readonly-build`. **LOCAL-ONLY — nothing applied, pushed, or allowlisted.**

## What changed from v1 (why v2 is stronger)
- **Unconditional write-safety.** `ice_readonly` gets USAGE on schema `ice_ro` ONLY (no `m`/`c`). The 24 PUBLIC-executable writer SECURITY DEFINER functions are **unreachable even with the raw credential in a read-write session** — proven in Part 3 *without* the wrapper. The v1 dependence on C1 (wrapper read-only) + C2 (credential confinement) is gone; those are now defence-in-depth.
- **Positive allowlist, not denylist.** Access = SELECT on 10 curated `ice_ro` views only. No broad table grants; new tables/columns are unavailable by default.
- **Confidentiality proven, not just integrity.** Views expose SAFE + IDENTIFIER columns only; all URL/body/jsonb + `*_by` columns withheld. Part 4 asserts no view leaks a withheld column. No SECRET/PII column exists in any source relation.
- **Caps + audit.** Wrapper adds a row cap (`ICE_READONLY_ROW_CAP`, default 5000) + per-call audit log (`ICE_READONLY_AUDIT_LOG`).

## Files
| File | What |
|---|---|
| `supabase/migrations/20260719150000_ice_ro_r0_views_and_confined_role.sql` | `ice_ro` schema + NOLOGIN `ice_ro_owner` + 10 R0 views + confined `ice_readonly` role + fail-closed assertions (no m/c usage; zero write grants; ≥10 view grants). |
| `scripts/db-read.py` (v2) | Single-SELECT gate + doubly-forced READ ONLY txn + row cap + audit log; DSN from env only. Gate/cap/audit smoke-tested. |
| `docs/briefs/permission-friction-readonly-db-proof-battery-v2.md` | 5-part battery: catalog · owner-sanity · **direct-credential** integrity · **confidentiality** · wrapper defence-in-depth. |

## R0 catalog (10 views, withhold-all baseline)
`slot_status` · `draft_status` · `render_status` · `publish_status` · `cron_health` · `deploy_drift_status` · `pipeline_health` · `template_registry_status` · `asset_governance_status` · `music_governance_status`. Exposure = ids/enums/timestamps/counts/booleans only.

## Ordered apply sequence (Convention-2 — pin the packet hash; mandatory STOPs)
> **`reviewed_input_hash` (SHA-256 over migration + wrapper + proof-battery-v2):** `15ec6f7aefc0c45e233561a9ee934e071b0630eec8b87e19cb84ffb40b1362d1`
> (external review `f928169b` (agree/proceed); apply-fix = GRANT ice_ro_owner TO CURRENT_USER (SET ROLE priv) + reorder ice_readonly grants into owner block.
1. **PK gate — apply the migration** (`apply_migration`, PK-run). Self-asserts and aborts atomically on any failure. STOP if not clean.
2. **Credential wiring** (out-of-band, R2). `ALTER ROLE ice_readonly PASSWORD …` + DSN → wrapper env `ICE_READONLY_DSN`. Never in repo/transcript. Set `ICE_READONLY_AUDIT_LOG` path.
3. **Proof battery v2** — `db-rls-auditor` + `security-auditor` run Parts 1–5. Integrity (Part 3) AND confidentiality (Part 4) must both pass. STOP → `ALTER ROLE ice_readonly NOLOGIN` on any deviation.
4. **PK gate — allowlist the wrapper.** Add `Bash(python scripts/db-read.py *)` to governed `.claude/settings.json` allow; **remove** `mcp__supabase__execute_sql` from `.claude/settings.local.json` allow. `execute_sql` stays `ask`; `apply_migration`/deploy hard-stops unchanged.
5. **Commit + register** via the orchestrator.

## Rollback (proven before apply)
- Instant: `ALTER ROLE ice_readonly NOLOGIN;`
- Teardown: `DROP SCHEMA ice_ro CASCADE; DROP ROLE ice_readonly; DROP ROLE ice_ro_owner;` (views drop with the schema; role grants drop with the roles) — verify nothing remains.
- Allowlist revert: remove the wrapper entry; restore prior local allow.

## Parallel PK items (not blocking build prep)
- Final exposure sign-off (withhold-all baseline).
- The **#4 read-only-MCP transport spike** — if the official Supabase `read_only=true` MCP proves safe AND can be confined to `ice_ro`-equivalent exposure, it may replace this custom wrapper as the transport. The `ice_ro` view layer is needed either way. Until the spike decides, this custom packet is the ready path.

## Security debt recorded (separate arc)
~24 write-capable SECURITY DEFINER functions in `c`/`m` depend on unrestricted PUBLIC EXECUTE. v2 does not rely on or normalize this (it confines by schema USAGE). Hand-off: a future `security-auditor` lane scopes per-function `REVOKE EXECUTE FROM PUBLIC` + explicit GRANT to real callers.
