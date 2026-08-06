# Result — W-1: NDIS Content-Supply Root-Cause Diagnosis + Slot `c1f38536…` Check

**Seed:** cross-session control-tower dispatch, "W-1: NDIS content-supply root-cause diagnosis" (2026-08-06), informational-only per the sending session's own framing — executed after PK confirmed in this chat
**Governing constraints:** v6.140 watch ruling + v6.147 prohibited list — zero DB writes, zero schedule/cap change, zero deploys, zero pool mutation (all confirmed below)
**Executed by:** Claude Code (orchestrator, direct read-only `execute_sql` + repo `Read`/`Grep`)
**Completed:** 2026-08-06 Sydney
**VERSION-LESS** — no register/sync-state cut (this doc is the record), per the seed's instruction

---

## 1. Result status

`Complete` — both tasks answered with live evidence; no remediation performed or authorized.

## 2. Commit(s)

N/A — read-only diagnosis, no commits.

## 3. Files changed

- `docs/briefs/results/w1-ndis-content-supply-diagnosis-v1.md` — created (this doc)

## 4. Actions taken

**4.1 Client/vertical scope (live read).** NDIS-Yarns (`fb98a472-…`) shares verticals **11 (primary) / 12** exactly with Care For Welfare (`3eca32aa-…`) — confirmed via `c.client_content_scope`. This matches the M16 fix lane's fleet-relevance finding (`docs/briefs/results/cgu-m16-pool-health-fix-lane-result-v1.md` §4.4): the two clients read the identical `m.signal_pool` rows for verticals 11/12. Property Pulse uses 7/9/10, Invegent uses 15/16/17 — used as baseline comparators.

**4.2 Ingestion yield, last 30d (live read, `f.canonical_content_item` + `f.canonical_content_body`).**

| Client (vertical) | Items ingested 30d | Items ingested 14d | `fetch_status='success'` 30d | Success rate |
|---|---|---|---|---|
| Property Pulse (7/9/10) | 964 | 554 | 305 | 32% |
| **NDIS/CFW (11/12)** | **429** | **292** | **210** | **49%** |
| Invegent (15/16/17) | 424 | 212 | 193 | 46% |

NDIS/CFW's ingestion **success rate is not worse than baseline** — it is the best of the three. Raw volume is ~44% of Property Pulse's but close to Invegent's, and Invegent shows "zero notable skips" per the Lane-1 e2e proof (`docs/briefs/results/lane1-ice-e2e-product-proof-result-v1.md`). **Ingestion yield alone does not explain NDIS's skip rate** — the cause is downstream, in pool composition and code-path interaction (§4.3–4.5).

**4.3 `bundle_diversity_insufficient` — the TEXT-format failure (code-cited).** `m.fill_pending_slots` (`supabase/migrations/20260729143000_s9_layer1_capability_gate_fill_pending_slots.sql:710-739`): for non-`single_item` formats, the function picks the top `bundle_size_max` candidates by `effective_fitness` and requires `COUNT(DISTINCT source_domain) >= dedup_policy.same_source_diversity_min`, else `v_skip_reason := 'bundle_diversity_insufficient:got_N_need_M'`. Live policy values (`t.dedup_policy`, `t.format_synthesis_policy`, current):

| Format | `synthesis_mode` | `bundle_size_max` | `same_source_diversity_min` (default policy) |
|---|---|---|---|
| text | bundle | 2 | 2 |
| image_quote | single_item | 1 | n/a (diversity check skipped) |

Live `slot_fill_attempt` aggregation, last 7 days, NDIS client only: **26 `bundle_diversity_insufficient:got_1_need_2` skips, all `chosen_format='text'`** (LinkedIn 15, Facebook 11), average `pool_size_at_attempt` 35.9–38.9 — the pool clears the min-size gate (`min_pool_size_for_format=3` for text) comfortably, then fails purely on source concentration: the top-2-by-fitness picks both landed on the same `source_domain`. NDIS/vertical-11 pool composition (live): 49 distinct source domains active, but only 70 active rows total (≈1.4 items/source) and only 25 of those sources have a body-health-passing item at all (§4.5) — concentration is real, not a data artifact. This class is **structurally distinct from `pool_thin`** (confirmed independently here, matching the M16 result's §4.4 finding) — it is reached only *after* the pool clears the size gate, and never consults `check_pool_health()`. **The M16 fix (Option C) does not and cannot address this class.**

**4.4 `pool_thin;no_eligible_evergreen` — the IMAGE_QUOTE-format failure (code + data cited).** Live 7-day aggregation: **26 `pool_thin` skips, all `chosen_format='image_quote'`** (Instagram 15, Facebook 4, LinkedIn 9), **`avg_pool_size_at_attempt = 0.0`** — literally zero qualifying candidates, not merely "thin." Root cause, traced to live data:
- `t.format_quality_policy` (live): `image_quote` requires `min_fitness_threshold=60`.
- `t.reuse_penalty_curve` (live): `reuse_count=2` → `fitness_multiplier=0.65`.
- Live query of vertical 11/12's `m.signal_pool`, filtered by the exact `body_health_pass` predicate `fill_pending_slots` itself uses (`fetch_status='success' AND word_count>=300`, migration lines 600-607): **64 body-healthy rows exist across both verticals — and every single one has `reuse_count >= 2`** (`body_healthy_low_reuse = 0`). Most score `fitness_score_max=88`; `88 × 0.65 = 57.2 < 60` — **every body-healthy item in the NDIS/CFW pool fails the image_quote fitness bar on reuse decay alone**, giving `v_pool_count = 0` before any relax is attempted.
- The relax path (`IF check_pool_health(...)->>'health' = 'red'`) would drop the threshold to 50, and the **existing relax-branch arithmetic already clears it** (`57.2 >= 50`) — but `m.check_pool_health()` is live-confirmed to still return `'green'` for verticals 11/12 today (the exact masking defect the M16 fix lane diagnosed and built a fix for, `docs/briefs/results/cgu-m16-pool-health-fix-lane-result-v1.md` §4.1–4.2), so the relax branch never fires. **This is the identical defect M16 diagnosed for CFW — independently re-confirmed here live for NDIS, not merely inferred from the earlier "plausible" fleet-relevance note** (M16 §4.4 called this "plausible, not certain" for `pool_thin`; this session's live read makes it certain for NDIS).

**4.5 `no_eligible_evergreen` — trivial, fleet-wide (live read).** `t.evergreen_library` has **zero rows, globally** — not filtered for NDIS, not filtered by format; the table has never been populated for any client or format. Every `no_eligible_evergreen` skip, for every client, is explained by this single fact. This is not an NDIS-specific gap.

**4.6 Slot `c1f38536-67f5-421f-a314-900fc0122221` check (Task 2).** Live state: `client_id=4036a6b5-…` (**Property Pulse**, not NDIS — the follow-on pointer is a Lane-1 e2e-proof carry, unrelated to W-1's NDIS scope), `platform=youtube`, `status='filled'`, `scheduled_publish_at=2026-08-13 07:00:00+00`, `filled_draft_id=452f58b9-484e-4272-84f1-646fdb0d39bd`. The bound draft (`m.post_draft`): `video_status='failed'`, `video_url=NULL`, `dead_reason='manual_terminal:known_timeout_08-13_retry_proof_done'` — a **terminal, unrecovered failure**, matching the Lane-1 e2e proof's finding exactly (`docs/briefs/results/lane1-ice-e2e-product-proof-result-v1.md` §4.3, §6). **Disposition, clarified beyond Lane-1's read:**
- **No bad-content-publish risk.** `supabase/functions/youtube-publisher/index.ts:455` selects only `video_status='generated'` drafts — this draft (`'failed'`) will never be picked up by the publisher. The fail-closed gate holds.
- **The real risk is a silent schedule miss.** `m.slot` still shows `status='filled'` (not re-opened); no code path was found (independently re-checked, consistent with Lane-1's own audit) that re-opens or backfills a slot once its bound draft reaches terminal. Absent action before **2026-08-13 07:00 UTC**, this Property Pulse YouTube slot will pass its `scheduled_publish_at` with no output and no record of the miss beyond the draft's own `dead_reason`.
- **Open discrepancy, disclosed not resolved:** the draft's `dead_reason` string (`manual_terminal:known_timeout_08-13_retry_proof_done`) reads as a hand-authored annotation rather than a standard automated code (the F-VIDEO-RENDER-RETRY enum values are short and mechanical), and `video_render_attempts=1` in the live row does not match Lane-1's cited "5 real ~128s timeout cycles" for the same draft. Most likely explanation: this row was the evidence case for the v3.12.0/v3.13.0 retry-proof lane and was annotated at that time — not investigated further here (out of scope for a read-only pass; named for PK, not asserted as a problem).

## 5. Constraints confirmed (per the governing watch ruling's prohibited list)

- Zero DB writes — confirmed: every query this session was a plain `SELECT` via `execute_sql`/schema introspection; no `INSERT`/`UPDATE`/`DELETE`/DDL executed
- Zero schedule/cap change — confirmed, not touched
- Zero deploy — confirmed, not touched
- Zero pool mutation — confirmed; `m.signal_pool`, `t.evergreen_library`, `t.dedup_policy`, `t.format_synthesis_policy`, `t.format_quality_policy`, `t.reuse_penalty_curve` all read-only
- Watch evidence untouched — confirmed, no write to any live table

## 6. Open issues

1. **Draft `452f58b9…`'s `dead_reason` provenance** (§4.6) — not independently resolved this pass; worth a one-line PK confirmation that it was written deliberately during the F-VIDEO-RENDER-RETRY proof, not an unaccounted-for write.
2. **Text bundle-diversity remediation has no design-level fix yet** — unlike `pool_thin` (already addressed by the parked M16 fix), `bundle_diversity_insufficient` is untouched by any authored fix. Options are sketched in §7 but none are built.
3. This diagnosis reused the M16 lane's live baselines for `check_pool_health`/`fill_pending_slots` bodies rather than re-pulling fresh `pg_get_functiondef` — both were read via `Grep`/`Read` of the migration file plus fresh live-data queries against the tables the functions consult, not a fresh function-body pull. If PK wants function-body freshness re-verified before any apply decision, that is a fast follow-up, not done here.

## 7. Next recommended step

No remediation performed (per the watch ruling). For the watch verdict, three bounded options, tier-estimated, **none built/applied**:

1. **Land the existing M16 fix (`NOT_APPLIED_m16_pool_health_option_c_and_b_v1.sql`)** — already authored, isolated-built, hermetic-fixture-covered (not live-executed). §4.4 above independently confirms (not just infers) that Option C's decay-visible `check_pool_health` would unmask the relax branch for NDIS's `image_quote` `pool_thin` class, and the relax arithmetic already clears the relaxed threshold (57.2 ≥ 50) — **this is very likely a live fix for half of NDIS's skip volume**, once it lands. **Tier: T3** (touches two live SECURITY-relevant selection functions) — requires hermetic-fixture live execution, `db-rls-auditor` review, external review pinned to hash, `branch-warden` re-verification, explicit PK apply gate. Already watch-gated to ~2026-08-11 20:20 Sydney per the M16 result doc.
2. **Text bundle-diversity — three sub-options, none built:** (a) switch NDIS/CFW's effective `dedup_policy` from `default` (`same_source_diversity_min=2`) to the already-existing `lenient` policy (`=1`) — cheapest, but `fill_pending_slots` currently hardcodes `policy_name='default'` (line 190), so this requires either a global default-policy change (fleet-wide blast radius, not recommended) or a code change to select policy per client/vertical (new capability, **T3**); (b) broaden NDIS's ingested-source set for verticals 11/12 so more distinct sources carry simultaneously-fresh content, reducing same-day clustering — a source-configuration change, no code touched, **T1/T2**, but effect is probabilistic and lagged; (c) change the bundle-picking algorithm to actively re-sample for diversity instead of taking a strict fitness-ranked top-N — a real code change to `fill_pending_slots`, **T3**, higher blast radius, not scoped further here.
3. **Populate `t.evergreen_library`** — currently zero rows fleet-wide, so `no_eligible_evergreen` fires unconditionally for every client/format. Even a small seed set per format/vertical would give the fallback path real capacity for the first time, benefiting all four clients, not just NDIS. **Tier: T1/T2** (content authoring + governed INSERT, no function code change) — the cheapest lever of the three and the only one addressing a total (not partial) gap.

Slot `c1f38536…`: **name the action, do not perform it** — before 2026-08-13 07:00 UTC, PK should decide whether to (a) manually re-open the slot for a fresh fill attempt, (b) accept the missed slot as-is, or (c) authorize building the "re-open a slot after terminal draft failure" mechanism that Lane-1 and this session both confirm does not exist today.

---

## 8. Verification (chat fills this)

**Verdict:** `Pass`

**Notes:**

- Both seed tasks answered with live-read evidence, code-cited where the seed asked for it (§4.3's `fill_pending_slots` citation, §4.6's `youtube-publisher` citation).
- Constraints respected: read-only throughout, confirmed in §5.
- One material correction to the seed's framing: the M16 result doc's W-1 fleet-relevance note called the `pool_thin` connection "plausible, not certain" for NDIS; this session's live per-format pool read (§4.4) makes it certain, not merely plausible — worth propagating back to the M16 record if PK wants that memory updated.
- New finding not anticipated by the seed: the `bundle_diversity_insufficient` (text) and `pool_thin` (image_quote) skip classes are **fully format-segregated** in the live data (zero overlap) — every text skip is diversity-driven, every image_quote skip is reuse-decay-driven. This sharpens the watch verdict: two independent problems, not one diffuse "NDIS supply is thin" story.
- Follow-up: none required from this doc; three bounded options are named for the watch verdict per §7, no action taken.

## 9. Learning notes (chat fills this)

- The M16 result doc already did excellent code-path analysis for `pool_thin` vs `bundle_diversity_insufficient`, but its NDIS-specific claim was explicitly caveated as unverified ("plausible... not independently re-verified with a live per-format NDIS read"). This session closed exactly that gap with four live queries. Reusable pattern: when a prior lane's finding is fleet-relevant-by-shared-vertical but stops short of a live per-client re-check, that re-check is usually cheap (a handful of `execute_sql` reads) and converts a "plausible" into a "confirmed."
- `mcp__supabase__execute_sql` truncates/errors on wide raw-row dumps (hit the token ceiling twice on ungrouped `slot_fill_attempt` pulls); aggregating with `GROUP BY`/`COUNT`/`AVG` server-side before returning is the reliable pattern for this table going forward.
