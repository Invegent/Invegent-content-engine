CLAIMED v5.19 · ap5-stamper-v2-close · main-checkout · commit-gate · 2026-07-06T22:05Z

# Result — AP-5 — Stamper v2 CLOSED as verified-low-risk (Autopilot sprint 5/5 — sprint CLOSE)

**Lane:** TMR Autopilot + Safety Closure, lane 5/5 (final) · **Tier:** T1 · **Label:** RECORD_ONLY · **Completed:** 2026-07-06
**PK decision (Gate 1):** close AP-5 as verified-low-risk — **no migration, no DB-function change, no EF change, no dashboard change, no cron change, no render, no publish, no promotion.** The two named stamper-v2 carries were investigated read-only against live data and found **latent**, not active defects; the hardening is deferred to a carry.

## What AP-5 was (the named carries)

"Stamper v2" was two carries recorded against the live S1 shadow stamper `public.stamp_tmr_shadow_forward` (v1, migration `20260703130939`; cron jobid 91, hourly :05) at Option-D go-live (`docs/briefs/results/option-d-tmr-live-b1-result.md` §3):
1. `logo_match` stamped NULL on the TMR-shaped `render_spec` (evaluation-input gap, not a mismatch).
2. Platform-source asymmetry — the worker sources platform from `m.slot`; the stamper reads `m.post_draft.platform`.

## Findings (read-only investigation, live project `mbkmaxqhsohbtwsqolns`, 2026-07-06)

1. **`logo_match` carry — VERIFIED LATENT / STALE (no active defect).** The current Option-D `render_spec` carries `template.asset_keys` including the logo — e.g. render `94afdff5…`: `render_spec->'template'->'asset_keys' = ["bg_perth_cbd","pp_logo_primary"]`. The worker sets this deliberately (`image-worker/b1_production.ts:185` — *"logoAssetKey is exposed for symmetry (template.asset_keys carries both)"*). The stamper reads exactly that path (v1 line 218 → the `logo_match` test at lines 259-260), so on the current render_spec shape `logo_match` evaluates correctly. Both live S1-forward shadow rows stamp **`logo_match: true`** (`94afdff5…`, `23024f4c…`). The "NULL logo" carry predates the Option-D render_spec shape — no NULL-logo defect remains on live renders.
2. **Platform-source asymmetry — VERIFIED LATENT (zero live divergence).** Across all 19 B1 renders, `post_draft.platform` vs `m.slot.platform` divergence = **0 of 19** (slot present on 12; the other 7 have no slot row, so no asymmetry to observe). The stamper's `post_draft.platform` has never differed from the render's platform in practice. Purely theoretical.
3. **Stamper-v2 hardening is NOT required to close the Autopilot sprint.** Neither carry is an active bug; both are robustness gaps that only bite under render_spec shapes / multi-platform drafts that do not currently occur. The shadow table holds 19 rows (17 S0 retroactive + 2 S1-forward), **all classified `agreement`** — no misclassification observed.
4. **AP-1…AP-4 already delivered the sprint's real safety + self-report loop.** The daily drift probe (jobid 92) is active and self-reports `status=ok` with `lagging_markers=[]` (AP-4, v5.18); provider axis clean (16==16); render sanity clean (0 violations). The shadow stamper is secondary evidence, consumed by nothing at runtime; its two latent carries do not gate loop health.

## Decision & scope

**AP-5 closed as verified-low-risk, RECORD_ONLY.** No code/DB/EF/dashboard/cron/render/publish/promotion change made or proposed. AP-2/AP-4 probe code untouched; the stamper v1 function stays live as-is.

## Carry forward (low priority)

- **Stamper-v2 hardening** — do only *if* the B1 `render_spec` shape changes such that `template.asset_keys` no longer carries the logo (→ `logo_match` would silently read `false` instead of unknown), **or** if a `post_draft.platform` vs `m.slot.platform` divergence ever appears in a shadow run. Fix at that time = a `stamp_tmr_shadow_forward_v2` successor migration (robust logo evaluation + platform sourced from the render/slot). Not scheduled.

## Sprint closure

**TMR Autopilot + Safety Closure sprint COMPLETE (AP-1 → AP-5).** The proven TMR governance loop now runs itself and self-reports health: S1 hourly shadow stamping (cron 91) + automatic agreement stamping · periodic provider/registry/pool/render drift probe (cron 92, AP-2) · no-silent-drift proven after pool changes (AP-1) · display/dashboard sweep on pool change (AP-3) · capability contract v3 = permanent end of per-key contract lag, loop green with zero lagging markers (AP-4) · stamper-v2 carries verified latent and deferred (AP-5). No open sprint lanes.
