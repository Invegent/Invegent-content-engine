# Result — Option D — TMR-Live B1 Slice (image-worker v3.22.0)

**Packet:** `docs/briefs/option-d-tmr-live-b1-slice-packet.md` (Gate 1 D1–D7 PK-approved; chain recorded in packet header) · **Completed:** 2026-07-05 Sydney
**Status:** ✅ DEPLOYED + LIVE-PROVEN — **TMR controls the PP image_quote production slice (product-proof gate 4); PP image_quote service RESTORED; the outstanding S1 live stamping proof CLOSED with the shadow table's first `agreement` row.**

## 1. What shipped

The PP-gated B1 production branch now consumes the TMR decision spine: one `select_template` RPC per draft returns the winner template + embedded slot_resolution (governed Background/Logo URLs + Scrim 48), rendered via the winner's Creatomate template in the ICE project. Legacy rotation constants and the dead template pointer are deleted (Option D's "the constant dies" fulfilled — the Lane-4 silent-re-divergence hazard is structurally closed). D1 fail-closed winner allowlist (v1: `generic_market_insight_card_1x1_v1` only; unmapped winner → loud failure, never a guessed layout). Fail-closed on every selector/slot path; no legacy fallback exists.

## 2. Identity + sequence execution (PK conditional sequence, zero STOPs tripped)

PK pin `3bf13a3553560b7d76b040685317d52158fb7146766a71e452a48f646a34f97d` (code diff) + reviewed harness `6fe644a2…` → commit **`82f5c55`** (byte-exact decomposition verified twice: orchestrator + branch-warden) → warden **safe** → ff-merge + push (`4e8805f → 82f5c55`, parity 0/0) → **pre-deploy live probe PASS** (ok / mapped winner / complete mods, Scrim 48) → deploy image-worker `--no-verify-jwt` → **fn v87 ACTIVE, runtime reports `image-worker-v3.22.0`** (stale-VERSION carry closed), verify_jwt=false proven (open GET 200) → D7: draft `8bbbd34c…` was already auto-reset to pending (an existing retry sweep had been re-queuing it — 5 legacy failures overnight, all fail-safe) → **00:30:17Z first TMR-controlled production render SUCCEEDED** (`render_log 23024f4c…`, `render_spec.tmr` present, `background_key=bg_brisbane_cbd`, draft `generated`, Monday's facebook post rescued) → supervised `stamp_tmr_shadow_forward()` → `{scanned:1, stamped:1, remaining_unshadowed:0}` with PRE/POST production probes byte-identical (drafts 2644 · renders 2709 · queue 806 · publishes 1543; shadow 17→18).

## 3. The S1 live proof (closed)

Stamped row (`s1-forward-v1`): **`primary_class='agreement'`, `background_match=true`, `template_match=true`**, selector winner == production winner — the first agreement row ever (all 17 S0 rows were expected structural divergence). The stamper's live stamping path is now proven end-to-end on a natural production render. Remaining S1 item: the hourly `cron.schedule` gate (sql_destructive D-01, PK).

## 4. Review chain (pinned to `3bf13a35…`)

deno **90/90 + 17/17** · PGlite shape-proof vs real migrations **24/24 ×2** · branch-warden safe ×2 · db-rls-auditor **concerns → 1 must-fix FIXED** (top-level `render_spec.background_key` restored; without it every Option-D render would have stamped `background_match=false`, inverting this proof — the auditor's catch made §3 possible) · security-auditor **GREEN zero-remediation** (first production caller of the SECDEF spine: zero privilege gain, no injection surface, fail-closed verified, blast radius same-or-better) · external review **agree/proceed zero-pushback** (`review_id afb6d83f-9b5f-4387-879b-875069226394`).

## 5. Carries

1. `production_proven` registry recording for market_insight after publish evidence (D6 — next PK gate, publish expected Monday ~21:30Z slot).
2. S1 hourly cron gate (D-01).
3. Stamper-v2: `logo_match` stamped NULL on the TMR-shaped render_spec (evaluation input gap, not a mismatch) + platform-source asymmetry (worker: m.slot; stamper: post_draft) — one small successor migration when convenient.
4. Incident carries (standing): provider-side deletion guard · `CREATOMATE_GENERICS_API_KEY` secret split · known-degraded opt-in branches (manual_render/draft_proof/template_smoke still reference deleted templates) · format-bridge 11-template pool tightening · contract v3 (`policy: tmr_spine`).
5. m.slot read error-vs-no-row conflation (security-auditor LOW; optional hardening).

## 6. Boundaries held

PP image_quote slice only · every non-PP client + other format byte-unchanged · no publisher/queue/dashboard/Format-Mix/cron change · ai-worker runtime untouched (contract stays v2, staleness recorded) · no migration · registry statuses untouched (D6 pending) · rollback floor honestly recorded (fn84 restores code not service; irrelevant now that v3.22.0 is proven live).

## 7. D6 ADDENDUM — production_proven RECORDED (2026-07-05/06, PK conditional apply on hash `af74058b…`)

The first TMR-controlled render **published to Facebook on schedule**: `post_publish 6e8c2705-1b52-431f-bb1c-9c696af0d8a1`, `published_at 2026-07-05T21:30:23Z`, image identity == render `23024f4c…` (verified). D6 recording applied (artifact `_harness/option-d-production-proven-recording.sql`, hash re-verified pre-apply; all fail-loud asserts passed incl. the A2 publish-evidence gate): assignment `7806fa5e…` (PP × `generic_market_insight_card_1x1_v1`) **`visually_approved` → `production_proven`** + one `platform_publish/passed` proof event at the publish timestamp. Post-apply: selectable set still **16** (invariant held); `production_proven` total = 2 (this + the historical `fb9820f8` row). **The Option D evidence chain is complete end-to-end: select → resolve → render → shadow-agree → publish → production_proven.**

**PK VISUAL GATE PASS (2026-07-06, screenshot on record):** post live on the Property Pulse Facebook page — market_insight layout, bg_brisbane_cbd background, Scrim 48 legibility, pp_logo_primary, badge/date/footer all present; rendered artifact matches the recorded decision chain field-for-field.
