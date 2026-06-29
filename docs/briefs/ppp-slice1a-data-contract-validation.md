# Publishing Plan Pyramid — Slice 1A data-contract validation

Validation record for `public.get_publishing_plan_pyramid(uuid)`
(`supabase/migrations/20260629120000_ppp_slice1a_get_publishing_plan_pyramid_rpc.sql`).

**Method:** the function body was run as a read-only `SELECT` against **live production**
(project `mbkmaxqhsohbtwsqolns`) for Property Pulse and a non-PP client (Care For Welfare) **before**
the function was created — i.e. validated against real data with **zero mutation and no function
created during validation**. The migration packages that exact, validated SQL. No PGlite harness is
used because the contract joins ~10 live `c.*`/`t.*`/`m.*` objects whose real rows are the point of
the validation; an offline seed would not prove correctness against production config.

## How to re-run (read-only)

Run the function body (or, after apply, `SELECT public.get_publishing_plan_pyramid('<client_id>')`)
for a client and inspect the payload. Property Pulse = `4036a6b5-b4a3-406e-998d-c2fe14a8bbdd`;
Care For Welfare = `3eca32aa-e460-462f-a846-3f6ace6a3cae`.

## Required validations (1–20) — results

| # | Check | Result |
|---|---|---|
| 1 | All expected platforms for PP | PASS — 4 (facebook, instagram, linkedin, youtube) |
| 2 | Known format keys returned | PASS — 44 platform×format cells across the active `ice_format_key` universe |
| 3 | PP format_mix enrollment shows enforce / governed row | PASS — `format_mix_control` = `{enrolled:true, mode:"enforce", approval_status:"approved", enrollment_row_present:true}` |
| 4 | Variant mix returns not_modelled placeholder | PASS — `variant_mix_status:"not_modelled"` + 7 `missing_model_pieces` |
| 5 | Editable status returns disabled | PASS — `editable_status:"disabled"` |
| 6 | Default mix values match `t.platform_format_mix_default` | PASS — e.g. facebook image_quote 30%, carousel 25%, text 20%, video_short_kinetic 10%; youtube video_short_kinetic 30% |
| 7 | Override source shows none / DEFAULT_ONLY where no override | PASS — PP has 0 override rows; every cell `mix_source` ∈ {platform_default, none}, `override_share_pct` null |
| 8 | Enabled formats match `c.client_format_config` | PASS — PP's 9 enabled formats reflected; formats with no config row → `client_format_enabled:false` (off/blocked) |
| 9 | Policy presence matches `t.format_synthesis_policy` / `t.format_quality_policy` | PASS — formats lacking policy (`video_long_*`, `video_short`) → `blocked` with `format_policy_missing:*` |
| 10 | Blocked reasons populated when prerequisites missing | PASS — `platform_unsupported`, `format_policy_missing:synthesis/quality` populated |
| 11 | max_per_week displayed if present, labelled not enforced | PASS — `max_per_week` surfaced (null for PP); `max_per_week_enforced:false` always (not enforced anywhere yet) |
| 12 | No secrets returned | PASS — `contains_secret_marker:false` (payload text contains no `access_token`/`credential_env_key`) |
| 13 | No tokens returned | PASS — `page_access_token` never selected |
| 14 | No raw unsafe profile fields | PASS — only client_id/slug/name; `c.client.profile` jsonb not returned |
| 15 | No DB mutation during read | PASS — function is `STABLE`, body is SELECT-only; validation ran as SELECT, no function created during validation |
| 16 | No table grants widened | PASS — migration only `CREATE FUNCTION` + REVOKE/GRANT on the function; no table grants touched |
| 17 | RPC EXECUTE grants least-privilege | PASS — REVOKE from PUBLIC/anon/authenticated; GRANT EXECUTE to `service_role` only |
| 18 | Existing production behaviour unchanged | PASS — additive read-only function; reads existing objects; mutates nothing |
| 19 | No UI files changed | PASS — Slice 1A is data-contract only; 2 files (migration + this harness) |
| 20 | No dashboard deploy | PASS — none performed |

## Non-PP safety (Care For Welfare)

`enrolled=false`, `mode="legacy"`, state_counts `{off:7, blocked:22}` — **zero `active` cells**.
Confirms non-PP clients are not misrepresented as enrolled and do not inherit PP's enforcement.

## PP payload summary (recorded)

- `client_summary`: Property Pulse, format_mix enforce/approved/governed-row, editable disabled, variant not_modelled.
- `schedule_summary`: 4 platforms.
- `format_matrix`: 44 cells — eligibility states `{active:10, off:2, blocked:32}`.
- Sample `facebook · image_quote`: `active`, `effective_mix_pct:30`, `mix_source:platform_default`,
  `evidence_maturity:"Configured and enforced"`, `enrollment_status:"enforced"`, full `detail_payload`.
- `variant_placeholder`: not_modelled + 7 missing model pieces.

## Honest finding (surfaced, not introduced)

Some `t.platform_format_mix_default` rows exist for (platform, format) pairs that
`t."5.3_content_format".platform_support` marks `false` (e.g. facebook `animated_text_reveal` has a
5% default but `platform_support.facebook=false`). The contract treats `platform_support` as the
eligibility source of truth → those cells are `blocked:platform_unsupported` while the default share
is still shown in `detail_payload`. This reveals a real defaults-vs-support inconsistency in `t.*`
for later cleanup; it is not caused by this contract.

## Status

NOT YET APPLIED — PK-gated apply. Reviewed by db-rls-auditor + external review. Slice 1B (UI) is a
separate later slice that will consume this contract via the dashboard service-role client.
