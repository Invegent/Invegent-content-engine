# B2 Register Pointer Payloads — DRAFT, version-less

**Prepared:** 2026-08-02 Sydney, by Claude Code (orchestrator). **Updated 2026-08-02** (D2 landed;
Stage-0 correction 992f359 added) for handoff to the **WS-5 metadata population closeout**
session's register-cut pass, which holds the single-owner duty for this pass.

**Status: DRAFT ONLY.** No version number assigned — per the register-cut-owner arrangement, ONE
owner allocates versions; an out-of-channel cut gets retracted. The register-cut-owner session
picks real `vX.YZ` markers for `docs/00_sync_state.md` and `docs/00_action_list.md` and pastes the
bodies below verbatim (or edits as needed) at that time.

All payloads follow the "recording compression" convention — pointer only, full evidence stays in
the linked result docs (never re-litigated here).

---

## Payload 1 — `docs/00_sync_state.md` — B2 Stage 0 (forensic reconstruction)

```
> **✅ v6.NNN — B2 visual-verdict-promotion Stage 0 — forensic reconstruction COMPLETE (T1/T2 ·
> read-only + 1 ledger backfill · PK-seeded)** — result: `docs/briefs/results/b2-visual-verdict-
> promotion-stage0-forensic-reconstruction-v1.md` (merge `474be78`; correction `992f359` — the
> doc's own "review step pending" language was stale by commit time, the review had actually run;
> corrected in place after a later register cut, v6.120, chased it and found it undocumented).
> · D1 (governed template-less text, FB/LI) verified LIVE + executed — 8/8 committed brand×FB/LI
>   text cells confirmed `governed_exempt`/`ready`. D2 (PP legacy carousel) verified DECIDED but
>   NOT executed at Stage-0 time — since landed, see Payload 3.
> · Readiness-queue `governed_exempt` rider (undocumented live drift) ledger-backfilled with exact
>   predecessor rollback, `db-rls-auditor`-confirmed code-identical to live AND review-confirmed
>   complete (concerns/non-blocking + branch-warden safe, both pre-commit). `task_05bf8b3d` sourced
>   and confirmed still-open (corrects this lane's own earlier false-negative search).
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
>   publish) remain separate, not-yet-authorised future gates for all three — natural evidence
>   accrual only, no forced renders, none of this is Ultimate-v1-blocking.
```

## Payload 3 — `docs/00_sync_state.md` — D2 (PP legacy-carousel governance declaration, APPLIED)

```
> **✅ v6.NNN — D2: PP legacy-carousel governance declaration APPLIED (T2 · SAFETY_GATE · PK
> apply-gate, PK direct "confirmed, apply it")** — result: `docs/briefs/results/d2-pp-legacy-
> carousel-governance-declaration-result-v1.md` (merge `ec1c3c8`).
> · One additive row in `c.client_creative_governance` (property-pulse × carousel, `enabled=true`)
>   declaring the pre-existing legacy carousel render pipeline (image-worker's
>   `buildCarouselSlideScript` path — NOT the TMR `generic_carousel_cover_1x1_v1` template)
>   governed for FB/IG. Real evidence: 104 total carousel drafts (exact match to the programme
>   brief's figure), 37 published FB(23)+IG(14). No proof-event DB rows — this result doc is the
>   evidence ledger, per the governing "zero synthetic proof rows" instruction.
> · **Known, disclosed, PK-accepted side effect:** `tmr-drift-probe`'s daily cron (no `format`
>   filter on its governance read) flips its daily status `ok`→`error` from the next run on, because
>   this row's `declarative_registry_ref` has nothing to resolve. PK chose Option C (accept,
>   disclosed) over Option A (build a Creative Library entry — recommended against, wrong schema
>   shape for a non-template pipeline) and Option B (patch `tmr-drift-probe` — correct long-term
>   fix, queued separately, see Payload 4). No render-path behaviour change (verified:
>   `isImageGovernanceEnabled` is only ever called with `format='image_quote'` in production code).
```

## Payload 4 — `docs/00_action_list.md` — `tmr-drift-probe` Option-B patch, OPEN carry

```
- **`tmr-drift-probe` should be patched to skip governance rows with no resolvable
  `declarative_registry_ref` instead of failing its whole daily run** (Option B from the D2
  decision card, `docs/briefs/results/d2-pp-legacy-carousel-governance-declaration-result-v1.md`
  §8/§9) — the correct long-term fix for the known side effect PK accepted short-term via Option C.
  Not scoped into D2's apply. A future, separate T2 code lane: patch
  `supabase/functions/tmr-drift-probe/index.ts`'s `fetchGovernedClients()`/coverage check, own
  build/test/review/deploy cycle. Until it lands, the probe's daily status reads `error` (not
  `ok`) starting 2026-08-02 — expected, disclosed, not a new incident if seen.
```

---

## Handoff notes for the register-cut-owner session (WS-5 metadata population closeout)

- Payloads 1–3 are **terminal-state** entries (all three lanes complete, applied, merged, pushed)
  — `docs/00_sync_state.md`, most recent first. Suggested chronological order if cut together:
  Stage 0 (`474be78`) → Stage 2 (`e9e18ad`) → D2 (`ec1c3c8`).
- Payload 4 is **not terminal** — the `tmr-drift-probe` Option-B patch is real, named, future work,
  not yet started. Belongs in `docs/00_action_list.md`'s active/carry section.
- No result-doc content is duplicated here beyond what's needed to locate the source — per
  Convention 1, long facts stay in the linked result docs, never re-written in the register.
- This session does not cut versions itself (register-cut-owner arrangement) — these payloads are
  handed off, not applied.
