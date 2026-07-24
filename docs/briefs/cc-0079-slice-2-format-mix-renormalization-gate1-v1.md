# cc-0079 Slice 2 — Format-Mix Renormalization Against `platform_support` (Gate-1, DATA-ONLY)

> **Lane:** cc-0079 Slice 2 · **Type:** Gate-1 brief · **Tier:** T2 (dark/additive DB data change, versioned supersede) · **Class:** PRODUCT_PROOF
> **Status:** DRAFT — authored + reviewable. **NOT APPLIED.** No migration run, no DML executed, no deploy, no commit, no push.
> **Author base (stale-ref gate PASSED):** CE `origin/main = ce3e4b8…`, HEAD `ce3e4b8…`, parity 0/0, `main`. Live reads 2026-07-24.

---

## 1 · Problem (Fault A, from the architecture brief §4.3)

`t.platform_format_mix_default` allocates format share **without consulting `t."5.3_content_format".platform_support`**. The mix engine (`m.build_weekly_demand_grid`) intersects the candidate set with client enablement and synth+quality policy, but **never with platform support**. Result: a large fraction of allocated share is for formats the platform cannot publish.

| Platform | Platform-invalid share | Worst single invalid entry |
|---|---|---|
| facebook | **25%** | 3 video/animated formats, `facebook:false` |
| instagram | **50%** | `video_short_kinetic` 20% + `video_short_stat_voice` (no ig key) 15% |
| linkedin | **65%** | **`carousel` 40%, `linkedin:false`** |
| youtube | 0% | — (all five entries valid) |

This is the mechanism behind the LinkedIn text-dominance and part of the FB/IG override churn: the Advisor was correctly refusing illegal allocations.

---

## 2 · Scope

**IN:** produce a corrected, versioned set of `t.platform_format_mix_default` rows in which every entry is platform-valid, **preserving the relative weighting among the surviving valid formats** (renormalise, do not flatten). Data-only.

**OUT:** any code/function change (including the durable `build_weekly_demand_grid` platform-support intersection — see §6); the two zero-platform `animated_*` formats' fate (open PK Q4); YouTube (already valid); client overrides (none exist); Advisor logic (Slice 1). No apply in this lane.

---

## 3 · Validity basis (live `platform_support`, 2026-07-24)

`✓` supported · `✗`/`–` unsupported (explicit false OR key absent — both treated unsupported per the `s[platform] !== true` rule at `ai-worker/index.ts:424`):

| format | FB | IG | LI |
|---|---|---|---|
| image_quote | ✓ | ✓ | ✓ |
| carousel | ✓ | ✓ | ✗ |
| text | ✓ | ✗ | ✓ |
| animated_text_reveal | ✗ | ✗ | ✗ |
| animated_data | – | ✗ | – |
| video_short_kinetic | ✗ | ✗ | ✗ |
| video_short_kinetic_voice | ✗ | – | – |
| video_short_stat_voice | ✗ | – | – |

---

## 4 · Before / after allocation (the exact proposed data)

Renormalization rule: `new_share = old_share × 100 / Σ(valid old_share)`. Relative weighting among valid formats is exactly preserved; only invalid formats are removed and the remainder rescaled.

### Facebook — valid Σ = 75 (image_quote 30 + carousel 25 + text 20)

| format | before | valid? | **after** |
|---|---|---|---|
| image_quote | 30 | ✓ | **40.00** |
| carousel | 25 | ✓ | **33.33** |
| text | 20 | ✓ | **26.67** |
| video_short_kinetic | 10 | ✗ | remove |
| video_short_kinetic_voice | 10 | ✗ | remove |
| animated_text_reveal | 5 | ✗ | remove |

### Instagram — valid Σ = 50 (carousel 30 + image_quote 20)

| format | before | valid? | **after** |
|---|---|---|---|
| carousel | 30 | ✓ | **60.00** |
| image_quote | 20 | ✓ | **40.00** |
| video_short_kinetic | 20 | ✗ | remove |
| video_short_stat_voice | 15 | ✗ | remove |
| animated_data | 10 | ✗ | remove |
| animated_text_reveal | 5 | ✗ | remove |

### LinkedIn — valid Σ = 35 (text 20 + image_quote 15)

| format | before | valid? | **after** |
|---|---|---|---|
| text | 20 | ✓ | **57.14** |
| image_quote | 15 | ✓ | **42.86** |
| carousel | 40 | ✗ | remove |
| video_short_kinetic | 15 | ✗ | remove |
| video_short_stat_voice | 10 | ✗ | remove |

### YouTube — unchanged (all valid; Σ=100)

`video_short_kinetic 30 · video_short_kinetic_voice 25 · video_short_stat 20 · video_short_stat_voice 15 · video_short_avatar 10`.

---

## 5 · Material consequence PK must ratify (this is a `policy_decision`, not a defect fix)

Renormalization **collapses the valid inventory**: FB → 3 formats, IG → **2**, LI → **2**. This is truthful — it exposes that the buildable, platform-valid format library for IG and LinkedIn is genuinely thin (carousel + image_quote on IG; text + image_quote on LI). The mix will look less diverse **because the diversity was never publishable.** This intersects open Q4 (the two zero-platform `animated_*` formats — invalid everywhere; this brief removes them from FB/IG regardless of Q4's resolution, but Q4 governs whether they should exist in the mix at all). PK decides whether thin-but-valid is acceptable or whether new platform-valid formats must be onboarded first.

---

## 6 · Apply shape, versioning, and the durable-fix note

- **Apply mechanism (for the successor apply lane, not this one):** supersede via the table's existing `is_current` versioning — insert corrected rows `is_current=true`, mark superseded rows `is_current=false`. Migration name = permanent identity; a revision gets a new number. `db-rls-auditor` on the exact DML before any apply. Pool-neutral, additive, no DDL, no grant change.
- **Rollback:** re-flip `is_current` — old rows back to `true`, new rows to `false`. Fully reversible; no data destroyed. Capture the pre-change row set (§4 "before" column is the baseline) before apply.
- **Durable fix is NOT this lane.** A data edit drifts if `platform_support` later changes. The robust fix is a **platform-support intersection inside `m.build_weekly_demand_grid`** (a function/code change, T2 code, out of scope here). Recommendation: land Slice 2 data now for immediate correctness, then schedule the function-layer intersection so the mix is self-correcting. Named, not built.

---

## 7 · Proof (read-only, before any apply)

| # | Proves | Method | Pass |
|---|---|---|---|
| S2-P1 | every proposed row is platform-valid | join proposed rows to `platform_support` | zero invalid |
| S2-P2 | relative weighting preserved | ratio of any two valid formats before == after | equal within rounding |
| S2-P3 | per-platform Σ = 100 | sum proposed shares | 100.00 ±0.01 |
| S2-P4 | allocator behaviour changes as intended | replay `m.allocate_week_formats` over a week with old vs new grid | new allocation contains no platform-invalid format |
| S2-P5 | Amendment B still inert | proposed formats all carry synth+quality policy | true (verified §6.2 architecture brief) |
| S2-P6 | rollback restores byte-identical prior grid | dry-run the `is_current` re-flip | prior row set recovered |

---

## 8 · Non-claims

Does not apply anything. Does not decide Q4 (`animated_*`). Does not change the Advisor, the mix function, or any client override. Does not claim the resulting thin mix is a good product outcome — that is PK's call (§5). Assumes no new formats are onboarded first (if they are, recompute). Evidence: live `t.platform_format_mix_default` + `t."5.3_content_format".platform_support`, CE `ce3e4b8`, 2026-07-24.
