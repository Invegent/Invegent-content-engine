CLAIMED v5.13 · ap2-tmr-drift-probe · main-checkout · commit-gate · 2026-07-06T09:40Z

# Result — AP-2 — TMR Provider/Registry Drift Probe v0 (Autopilot sprint 2/5)

**Packet:** `docs/briefs/ap2-tmr-drift-probe-v0-packet.md` (Gate 1 D-AP2-1..5 PK-approved) · **Tier:** T3 · **Label:** SAFETY_GATE · **Completed:** 2026-07-06
**Status:** ✅ DEPLOYED + CRON LIVE + BLIND-ACCEPTANCE PASSED — the manual provider-reconciliation guard is now a scheduled, self-running probe.

## 1. What shipped

New EF `tmr-drift-probe` v1.0.0 (drift-check sibling pattern): three read-only checks per run — (a) provider↔registry (GET `/v1/templates` vs `c.creative_provider_template`; `fb9820f8` allowlisted `known_historical`), (b) per-platform resolver-pool vs build-time-vendored markers (union rule so the ig 5-key fence can't mask fb/li's 6), (c) render sanity (last 20 B1 renders' `background_key` ∈ union pool; pre-Option-D specs classed `legacy_shape`, not violation). Writes exactly one evidence row per run to `c.tmr_drift_probe_run` (RLS default-deny, service-role-only), fails LOUD. Daily cron `tmr-drift-probe-daily` jobid **92** @ `35 17 * * *` UTC (offset past drift-check jobid 80 @ 17:00 and the occupied 17:30 slot — db-rls C1).

## 2. Identity + apply record

- Lane commit `323ea6d` (base `59214af`), diff hash **`fc9d44b1e687d89062569fafc23da8e68cf5bf5b2640abb8b8fcbdbc9a6fa8d2`** (post-audit fold-ins: inbound Bearer auth, legacy-shape classification, pagination guard; C1 cron-slot text) — supersedes pre-fix `9de5400`/`97201c41…`.
- Applied live: table migration `20260706024858 create_tmr_drift_probe_run_v1`; grant migration `20260706071613 grant_tmr_drift_probe_reads` (`GRANT SELECT ON c.client_brand_asset, m.post_render_log TO service_role`; external review `7d4b06b6…`); EF deployed `--no-verify-jwt`; cron jobid 92; vault `service_role_key` healed to the real `sb_secret_` (len 41) — PK via SQL Editor.

## 3. Two real defects found + fixed mid-lane (the lane earned its keep)

1. **EF auth defect** — the built handler enforced no inbound auth (`verify_jwt=false` + zero check = anyone with the URL could invoke, disclosing the provider inventory in the 200 body). security-auditor GREEN-with-observation → folded a strict `Authorization == Bearer ${SUPABASE_SERVICE_ROLE_KEY}` check (401 otherwise), matching the `cadence-drift-checker` house pattern. Surfaced `drift-check`'s own larger unauth+`write=true` exposure as a future-lane observation.
2. **service_role grant gap** — the probe reads `c.client_brand_asset` + `m.post_render_log` directly (independent-replica design, deliberately not via the SECDEF resolver it audits); service_role lacked SELECT on both. The **first supervised run recorded `status='error'` (`permission denied…`) — an HONEST visible failure, never a false success** (the fail-loud design working). Fixed by the T3-reviewed grant migration; re-run passed.
   Third-order: the cron's `net.http_post` Bearer reads vault `service_role_key`, which had been a 15-char stub for 5 months (harmless until AP-2 became the first EF to validate it) — healed; the fix serves every future house cron.

## 4. Blind acceptance (the proving criterion — PASSED exactly)

Supervised run `94fcbf7e…` (200, 969ms) + cron-path preflight (`net.http_post`→vault→EF, 200): **status `drift`, pool_drift true, lagging = exactly `[marker_declarative, marker_contract, marker_dashboard]`** each missing only `bg_pp_perth_cbd_skyline_day_wide` (day-hero, the sole live diff) · **provider clean 16==16** (`provider_drift false`, missing/unregistered/renamed all ∅, `fb9820f8` known_historical) · per-platform pools fb/li=6, ig=5 (platform_scope fence), union=6 · **render 0 violations + 1 legacy_shape** (`c3c7489b…` 2026-06-26). The probe independently rediscovered today's real drift and **nothing false** — the AP-1 acceptance case met to the key.

## 5. Chain

deno 24/24 (incl. blind-acceptance fixture, legacy-shape, pagination, auth) · db-rls-auditor pass (filter-chain replica verified clause-for-clause vs LIVE `resolve_slot_assets` prosrc; grant migration pass) · security-auditor GREEN (EF + grant) · branch-warden safe · external review agree ×2 (`afb…`-class EF diff + grant `7d4b06b6…`) · PK conditional sequence executed: identity pre-check (EF env == sb_secret, proven by the 200) → migration → deploy → grant fix → acceptance → vault heal → cron-path preflight → cron. Zero STOPs beyond the two self-caught defects (both fixed in-lane).

## 6. Carries

C3 pg-boolean-prefix + C4 ms-tiebreak (v1.1 code comments) · ICE Health card surfacing of probe results (D-AP2-4 named follow-up) · `drift-check` unauth/`write=true` retrofit (security observation) · the 3 lagging markers the probe now flags are AP-3 (doc/dashboard sweep) + AP-4 (contract v3) work — the probe will report `ok` once those land. Repo recording: lane commit `323ea6d` + grant migration file + this result + registers = PK commit/merge gate (branch-warden-verified given parallel-session churn).

## 7. Boundaries held

Provider GET-only · probe writes only its own table · no dashboard/worker-production/template/asset-promotion/D6 change · no AP-3/4/5 work · cron scheduled only after acceptance passed.
