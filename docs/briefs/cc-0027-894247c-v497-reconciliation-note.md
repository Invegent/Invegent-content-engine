# Reconciliation note — commit `894247c` (image-agent proving runs, day-hero verdict) vs register v4.97

**Date:** 2026-07-05 · **Mode:** read-only reconciliation (PK-directed) · **Verdict: RECONCILED — no contradiction, no hold breach; bookkeeping deltas recorded below.**

## The apparent conflicts, resolved

1. **"day-hero best-pick accepted" vs the manual-source hold.** The `run2_stress` manifest was **PK-ratified** and deliberately targeted the day-hero row as a licence-trap stress case — PK exercising authority over PK's own carry, not a hold breach. The stress run found what P0 could not: a licence-safe, genuinely bright-day Perth CBD hero (Joshua Leong `gl7nkS_h4lo`, Unsplash licence, 4000×2250, clean provenance; reviewer PASS_WITH_NOTE). **PK's verdict is explicitly visual-level only:** the RUN2 record states "DB/storage intake of this image remains a separate future PK-gated lane; nothing is approved/production-safe/uploaded by this verdict."
2. **"accepted" vs v4.97's "zero images approved/promoted."** No contradiction in substance: v4.97's statement covers the cc-0027 lane's own candidates and DB/storage state — both untouched. The mm_c acceptance is a docs-level visual verdict on a different image from a PK-ratified different run, with explicit non-claims denying approval/production-safety. Independent corroboration: orchestrator DB/storage fingerprints taken repeatedly through 2026-07-05 (29 `client_brand_asset` rows · 39 `brand-assets` objects · fingerprint `198b0923…`) never moved.
3. **Effect on the standing carry:** the **bright-day Perth hero sourcing carry (P0/v4.82) is CLOSED at the visual level**; DB/storage intake of `gl7nkS_h4lo` remains an un-started, separately PK-gated lane. The auction-crowd row (mm_d) is confirmed as a genuine licence-safe gap (`not_harvestable_licence_safe`, refusal audited REFUSAL_JUSTIFIED) — unlocks are policy decisions (CC BY rule · paid/editorial exception · commissioned shoot), all PK's.

## Bookkeeping deltas (recorded, not defects)

- **Run-numbering across sessions:** three distinct executions now share the cc-0027 story — session A run 1 (`bg_*` rows, v4.97), session A registered-proof (`run2_registered_proof/`, result-doc addendum `b7d09e0`), session B runs 1+2 (`mm_a/mm_b` + `run2_stress/ mm_c/mm_d`, commit `894247c`). Future references should use package paths, not "run N".
- **Shared package-root interleaving:** session B extended the shared `inventory.json`/`metadata.csv` at the package root (14→20 entries; bytes verified consistent — session A's 20/20 recompute post-dates the extension and passed). Concrete instance of **PHASE2-FRICTION-004** (harness-package namespaces + unpushed-local-ahead coordination) for the next observation note.
- **Outstanding PK visual verdicts** now span three sets: session A's 8 (`bg_*`), session B run-1's 8 (`mm_a/mm_b`), and the 2 non-best-pick mm_c offers — the mm_c best-pick is the only image with a recorded PK verdict.
- v4.97's "8 candidates await PK visual verdicts" line is **stale in scope** (correct for its lane; the global count is larger) — no rewrite per Convention 1; this note is the reconciling record.

**Non-claims:** nothing here approves/promotes any image, closes any intake gate, or alters any lane verdict; both image agents remain CANDIDATE; D6 untouched.
