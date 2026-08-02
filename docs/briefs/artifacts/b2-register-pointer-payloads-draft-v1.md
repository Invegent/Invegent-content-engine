# B2 Register Pointer Payloads — DRAFT, version-less

**Prepared:** 2026-08-02 Sydney, by Claude Code (orchestrator), for the next
`docs-register-cut-continuation` session, per PK instruction ("draft the pointer payloads now").

**Status: DRAFT ONLY.** No version number assigned — per the register-cut-owner arrangement, ONE
owner allocates versions; an out-of-channel cut gets retracted. The register-cut-owner session
picks a real `vX.YZ` for `docs/00_sync_state.md` and `docs/00_action_list.md` and pastes the
bodies below verbatim (or edits as needed) at that time.

All three payloads follow the "recording compression" convention — ≤5 lines, pointer only, full
evidence stays in the linked result docs (never re-litigated here).

---

## Payload 1 — `docs/00_sync_state.md` — B2 Stage 0 (forensic reconstruction)

```
> **✅ v6.NNN — B2 visual-verdict-promotion Stage 0 — forensic reconstruction COMPLETE (T1/T2 ·
> read-only + 1 ledger backfill · PK-seeded)** — result: `docs/briefs/results/b2-visual-verdict-
> promotion-stage0-forensic-reconstruction-v1.md` (merge `474be78`).
> · D1 (governed template-less text, FB/LI) verified LIVE + executed — 8/8 committed brand×FB/LI
>   text cells confirmed `governed_exempt`/`ready`. D2 (PP legacy carousel) verified DECIDED but
>   NOT executed — no governance row, no proof event (see Payload 3, still open).
> · Readiness-queue `governed_exempt` rider (undocumented live drift) ledger-backfilled with exact
>   predecessor rollback, `db-rls-auditor`-confirmed code-identical to live. `task_05bf8b3d`
>   sourced and confirmed still-open (corrects this lane's own earlier false-negative search).
```

## Payload 2 — `docs/00_sync_state.md` — B2 Stage 2 (visual-approval promotions, rung 6)

```
> **✅ v6.NNN — B2 Stage 2: three visual-approval promotions APPLIED, incl. Invegent live-winner
> flip row 7→row 5 (T3 · SAFETY_GATE · PK apply-gate ×3, PK direct "yes proceed")** — results:
> `docs/briefs/results/b2-stage2-{ndis-quote-card,cfw-quote-card,invegent-market-insight}-apply-
> result-v1.md` (merges `3dd207a`/`ef0eee9`/`e9e18ad`).
> · NDIS-Yarns + Care for Welfare × quote_card: promoted `proposed→visually_approved`, zero live
>   `select_template` output change (both independently re-verified live post-apply).
> · **Invegent × market_insight_card: intended, PK-authorised live flip** — `select_template`
>   winner for image_quote moved Row 7 (`generic_quote_card_1x1_v1`)→Row 5
>   (`generic_market_insight_card_1x1_v1`) across facebook/instagram/linkedin/website, confirmed
>   by live before/after evidence captured on both sides of the apply. Rungs 7–9 (render→draft→
>   publish) remain separate, not-yet-authorised future gates for all three.
```

## Payload 3 — `docs/00_action_list.md` — D2 declaration, OPEN (not a sync_state terminal entry)

```
- **B2/D2 — PP legacy-carousel governance declaration: DRAFTED + REVIEWED, BLOCKED on a PK
  scope decision.** Branch `lane/d2-pp-legacy-carousel-governance` (`91b4dfc`, local-only, not
  yet pushed/merged). Evidence ledger: `docs/briefs/results/d2-pp-legacy-carousel-governance-
  declaration-result-v1.md` — 104 total PP carousel drafts confirmed (matches programme brief
  exactly), 37 published FB(23)+IG(14). `db-rls-auditor` found the packet's own "zero production
  behaviour change" claim incomplete: `tmr-drift-probe`'s daily cron (no `format` filter) will
  flip status `ok`→`error` once this row lands, because `declarative_registry_ref` has nothing to
  resolve. **Waiting on PK's choice of 3 named options** (create a Creative Library registry
  entry / patch `tmr-drift-probe` to skip unresolvable formats / accept the daily false-error as
  disclosed) before this can proceed to its own apply gate.
```

---

## Handoff notes for the register-cut-owner session

- Payloads 1 and 2 are **terminal-state** entries (work is complete, applied, merged, pushed) —
  they belong in `docs/00_sync_state.md` per the normal "current marker" convention, most recent
  first.
- Payload 3 is **not terminal** — D2 is blocked on a PK decision, not done. It belongs in
  `docs/00_action_list.md`'s active/blocked section, not `00_sync_state.md`, until it either lands
  (gets its own terminal pointer then) or PK explicitly defers/retires it.
- Suggested version ordering if cut together: Stage 0 before Stage 2 (chronological — Stage 0
  landed first, `474be78`, before Stage 2's three merges). D2 has no version yet since nothing
  landed for it.
- No result-doc content is duplicated here beyond what's needed to locate the source — per
  Convention 1, long facts stay in the linked result docs, never re-written in the register.
