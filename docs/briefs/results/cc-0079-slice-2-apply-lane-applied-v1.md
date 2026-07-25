# cc-0079 Slice 2 — Apply Lane Result: APPLIED & PROVEN (v1)

> **Lane:** cc-0079 Slice 2 (data-only mix renormalization of `t.platform_format_mix_default`) · **Session:** S1 (independent apply hand) · **Type:** APPLY-lane result
> **Outcome:** **APPLIED — committed — five-point post-apply proof PASSED.** The schedule no longer allocates unpublishable formats for Property Pulse.
> **Applied artifact:** `docs/briefs/cc-0079-slice-2-apply-packet-v4.md`, sha256 **`1579115675c5ff605ef864d33a42eb95fa279ecf20263a71a1666b60dbfb0b0e`**, 53405 B — extracted byte-exact from ref `c8f8578` and submitted as ONE `execute_sql` call.
> **Base:** CE `origin/main == HEAD == c8f8578` (v6.24), parity 0/0. **Target:** project `mbkmaxqhsohbtwsqolns` (`content_engine`, PG 17.6). **Applied:** 2026-07-25 (UTC).

---

## 1 · Authorization chain (all gates clean before mutation)

| Gate | Result |
|---|---|
| ① stale-ref (twice: at gate run + immediately pre-apply) | PASS — `c8f8578` == origin/main == ls-remote, parity 0/0 |
| ② hash v4 from ref | PASS — `1579115675c5…` / 53405 B, byte-identical to reviewed+pinned |
| ③ project | PASS — `mbkmaxqhsohbtwsqolns` = `content_engine` |
| external review | `600ac75e-d4fa-46a9-b937-5d1e55dfbc3c` · `agree`/`proceed` · pinned to `1579115675c5…` — not re-run (byte-identical), per PK |
| ④ `db-rls-auditor` on v4 hash | **clean/pass** — zero must-fix, zero should-fix; M-1/M-2/M-3 closures confirmed, no regression, §9 FK finding confirmed live |
| ⑤ §7.2 step-5 platform_support re-check | PASS — 7 frozen `after_share` values, nothing newly publishable |
| ⑥ 17-row identity live | PASS — 17==17, 0 drift, A0=0, 4 platforms, YT 5, 0 dup pairs |
| §9 lineage decision | **PK ruled Option A — ship v4 as written, no `superseded_by`, no v5** |
| ⑦ PK apply gate | **PK authorized apply** |

## 2 · The apply — committed

Executed §4 verbatim from ref `c8f8578` as a single `execute_sql` call (channel C-1). The transaction returned its one result set and committed:

```
status                 : APPLY OK -- all assertions passed
rows_retired           : 17
rows_inserted          : 7
applied_effective_from : 2026-07-25
txn_xid                : 3884220
```

**`effective_from = 2026-07-25`** — the DB's `CURRENT_DATE` rolled from 2026-07-24 to 2026-07-25 (UTC) between gate ⑥ and execution. Immaterial to correctness: A0 asserted zero collision at that date in-transaction and passed; all prior rows are `2026-04-22`.

**The 7 new rows (rollback delete-targets — recorded verbatim):**

| platform | format | share | mix_default_id |
|---|---|---|---|
| facebook | image_quote | 40.00 | `24557edf-3648-4c17-8b7e-5a92538c8ee8` |
| facebook | carousel | 33.33 | `b8d61a9e-95ed-465b-89f1-eca31de95e1f` |
| facebook | text | 26.67 | `7d222f21-fcfb-4374-81a4-668e55000e40` |
| instagram | carousel | 60.00 | `d80eaa64-18f6-49cd-9333-3e57769ad272` |
| instagram | image_quote | 40.00 | `198ba57c-c019-4d0e-a1fd-66cb94dca9a7` |
| linkedin | text | 57.14 | `1cea40bd-e08b-4e2a-9d80-b47d0172ec9e` |
| linkedin | image_quote | 42.86 | `8d9c2b15-aabf-40f0-b37b-3a15622d5920` |

## 3 · Five-point post-apply proof (PK's required set) — ALL PASS

**① 0-of-15 invalid allocation** — re-run through the live `m.build_weekly_demand_grid` → `m.allocate_week_formats(shares, 5)`:

| platform | allocation (post-apply) | invalid_of_5 |
|---|---|---|
| facebook | `image_quote · carousel · image_quote · carousel · text` | **0** |
| instagram | `carousel · image_quote · carousel · carousel · image_quote` | **0** |
| linkedin | `text · image_quote · text · text · image_quote` | **0** |
| youtube | `video_short_kinetic · video_short_kinetic · video_short_kinetic_voice · video_short_stat · video_short_stat_voice` | **0** |

FB/IG/LI allocation strings match the packet's §1 AFTER table **character-for-character**. **6 of 15 invalid → 0 of 15.** (YouTube was already 0 and remains 0.)

**② FB, IG and LI remain PRESENT in the demand grid** — the direct M-2-catastrophe check: `grid_platform_count = 4`, platforms = `facebook,instagram,linkedin,youtube`. No platform vanished. The exact silent-outage failure mode S1 traced in the v2 halt did **not** occur.

**③ YouTube unchanged** — post-apply fingerprint `db67ce6cdfe394e80cbec9dcee422c22` **== the pre-apply fingerprint** captured before the halt; YT current rows = 5. Byte-identical, untouched.

**④ All executable assertions actually RAN** — the `APPLY OK -- all assertions passed` result row is only reachable after every `DO $$ … $$` block (A-DRIFT, A0, G-ATOMIC×2, A1, A2, A3/A3b/A3c/A5, A4, A6) completed without raising. Any failure would have aborted the call with a `RAISE EXCEPTION` and rolled back — no result row. `rows_retired=17` / `rows_inserted=7` are `GET DIAGNOSTICS`/count-of-capture values from inside those blocks. This is positive evidence of execution, not mere absence-of-error.

**⑤ Rollback available and exact** — verified live:
- The 7 new rows exist, `is_current=true`, correct shares, `effective_from=2026-07-25`, `evidence_source='cc-0079-slice-2'`.
- The 17 originals: **all 17 still present** (none deleted) and **all 17 now `is_current=false`** (flag-flipped only).
- Post-apply current shape: **FB 3 / IG 2 / LI 2 / YT 5**, every platform summing to **100.00**; `total_current = 12`.
- §6.1 rollback is executable as written with the 7 UUIDs above; `superseded_by` was never populated (Option A), so R1's DELETE has no FK referents.

## 4 · What this lane did and did not do

**Did:** made `t.platform_format_mix_default` accurately represent current governed intent — the stored mix now contains only platform-publishable formats, renormalized weight-preserving (FB 30:25:20→40:33.33:26.67 · IG 30:20→60:40 · LI 20:15→57.14:42.86). Per PK's v6.24 rationale, this stops an invalid recorded intent (`linkedin/carousel=40%`) from being a misleading operator surface or being copied into future overrides.

**Did not:** build platform+format planning in the dashboard UI (separate scoping lane). Did not change `m.build_weekly_demand_grid`, client overrides (none exist), the Advisor (Slice 1 → S3), or transport. The durable fix — a `platform_support` intersection inside the grid function — remains a named **code** successor (S7), to run **after** this proof, where it should be demonstrably allocation-neutral.

## 5 · Scope honesty & non-claims

Only PP is `format_mix`-enrolled; the §1 comparison uses N=5 (PP's enabled cadence) and live grid shares — other clients/cadences differ. The v2 §8 `policy_decision` (FB 3 / IG 2 / LI 2) was **closed by PK at v6.22** — not re-raised. Q4 (`animated_text_reveal`/`animated_data` supported on zero platforms) remains open and is not decided here. `superseded_by` lineage (S-2) was **PK-ruled Option A** — deferred deliberately; the retired→successor mapping lives in this document and the packet, not in the data. This lane was NOT combined with Slice 1, cc-0080, or any other DB window. No YouTube row was touched. Nothing was committed to git or deployed by this lane; the only production change is the committed DML above.

**Next in PK's order:** S8 three-slot repair of already-materialised invalid slots (hard deadline 2026-07-26 01:50 UTC) → prove downstream consistency → S7 durable function change.
