CLAIMED v5.10 · tmr-pilot-closeout · shared-main-docs · commit-gate · 2026-07-06T00:15Z

# TMR Pilot — CLOSEOUT (2026-07-02 → 2026-07-06)

**Status:** ✅ **PILOT COMPLETE.** TMR (Template/Creative registry + decision spine) went from "registry captures templates, controls nothing" to **controlling PP image_quote production end-to-end with a self-running verification loop** — in four days, through ~20 PK-gated lanes, with zero broken content published and every decision evidence-backed.

## 1. The closed loop (each link live + proven)

`select_template` (winner: registry truth + approval ladder + proofs) → `resolve_slot_assets` (governed assets + Scrim 48) → image-worker v3.22.0+ renders the winner (fail-closed D1 allowlist) → `stamp_tmr_shadow_forward` verifies render-vs-selector (**now AUTOMATIC: cron jobid 91 `tmr-shadow-stamp-hourly`, `5 * * * *`** — first unattended tick 2026-07-06T00:05:00Z stamped natural render `94afdff5…` as `agreement` in 0.6s, zero human involvement) → publisher ships (first TMR publish `6e8c2705…`, facebook, 2026-07-05T21:30Z, on schedule) → `production_proven` recorded with publish evidence (D6, hash-pinned) → **PK visual gate pass on the live Facebook post** (screenshot on record).

## 2. Proof milestones (canonical result docs hold the evidence)

| Date | Milestone | Record |
|---|---|---|
| 07-02 | 16-template generic library captured into the registry (v4.71/72) | tmr registry migrations |
| 07-03 | Decision spine live+dark: `resolve_slot_assets` (v4.76) · `select_template` (v4.79) · shadow S0 17 rows (v4.81) · dashboard shadow panel (v4.83) · B1 capture (v4.84) · stamper live+idle (v4.86) | per-lane results |
| 07-03/04 | Selectable set 10→**16** (Lane 2, v4.89) · Scrim **48** + governed override (Lane 3, v4.91) · rotation aligned, equivalence 514/514 (Lane 4, v4.92) | lane results |
| 07-04/05 | **Incident:** legacy B1 template deleted provider-side → PP image_quote down 27h (fail-safe held) → **Option D: TMR takes production control** (v4.95, fn87/v3.22.0); first TMR render `23024f4c…`; **S1 live proof: first `agreement` shadow row** | `option-d-tmr-live-b1-result.md` |
| 07-05 | Provider Reconciliation v0 (16==16, zero drift) → **TMR-GOV-PROVIDER-1 ratified** → dead-ref cleanup D/B/W all deployed (registry v0.4 · dashboard truth · workers −751 lines, 410 guards) | `creatomate-provider-reconciliation-v0-result.md`, lane D/B/W results |
| 07-05/06 | First TMR publish on schedule → **D6 `production_proven`** (selectable-16 invariant held) → **PK visual pass** → **hourly cron live, automation proven** (D-01 artifact `5a2c7f09…`, review `57e3ade3…`) | `option-d-tmr-live-b1-result.md` §7 + this doc |

## 3. End state (live truth at closeout)

- **Production:** PP image_quote = TMR winner-driven (`generic_market_insight_card_1x1_v1`, `production_proven`); rotation/scrim/logo = governed resolver data; no hardcoded creative constants remain in the production path.
- **Verification:** shadow stamping hourly-automatic; 19 rows (17 S0 structural + 2 forward `agreement`); dashboard shadow panel + truthful B1 card in prod.
- **Governance:** approval ladder proven end-to-end; TMR-GOV-PROVIDER-1 + TMR-GOV-TESTIMONIAL-1 in force; provider↔registry↔code reconciled with zero drift; every historical proof preserved.
- **Safety posture:** every failure mode observed during the pilot failed CLOSED (46-render logo incident, template-deletion outage, retired-mode probes) — nothing broken ever published.

## 4. Handoff — what leaves the pilot as standing work (all recorded, none started)

Contract v3 (`policy: tmr_spine`; removes the last legacy pins) · periodic provider-inventory drift probe (registry = only deletion guard for 15/16 generics) · dashboard vendor re-sync (day-hero+ pool growth) · stamper-v2 (logo_match NULL on TMR specs · platform-source asymmetry) · format-bridge 11-template pool tightening · `CREATOMATE_GENERICS_API_KEY` secret split · intent-driven selection + multi-format expansion (quote_card mapping etc.) · location-aware v2 · VIDEOS (re-author; Gate-D2 template deleted) · multi-brand rollout (the productization step — needs a second brand's asset kit + assignments).

## 5. Product-proof ledger (charter gates)

Gate 1 S1 live proof ✅ · Gate 2 cron ✅ (this doc) · Gate 3 shadow soak ✅ (S0+forward, agreement stream now automatic) · **Gate 4 TMR controls a production slice ✅ (Option D + D6 + visual pass)** · Gate 5 Lane A publish/render safety gates — **NEXT** (the volume unblock) · Gate 6 cockpit — queued · Gate 7 production soak — running passively from today.
