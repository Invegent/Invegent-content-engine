# Result cc-0073 — WINDOW 1: CFW pool policy (`best_fit`) — APPLIED, INERT, PROVEN

**Manifest:** `docs/briefs/cc-0073-manifest-A-policy-cfw-bestfit-v1.md`
**Applied at pinned hash:** `b00e87d9a85e272e7de3f9a6f5acf0ca791d6a8efc59ea64514662cfdda29c5d`
(re-derived immediately before apply and confirmed to match; the earlier `030256b8…` was **superseded
and not used**)
**Executed by:** chat (S5), in the PK-opened policy window · **Completed:** 2026-07-24 Sydney
**Tier:** T3 · **Change class:** data-only, ONE row, INSERT
**Write path:** direct `execute_sql` DML — **no `apply_migration`, no migration version minted**

## 1. Result status

`Complete` — applied, **inert as required**, and proven on **both** sides.

## 2. Pre-apply gates

| Gate | Result |
|---|---|
| Stale-ref | PASS — `fetch --prune`; upstream `052a9ba3ec8f1b7251bfe8e0eb399a3e51a5fcb9`, HEAD identical, parity 0/0 |
| Manifest hash | PASS — recomputed `b00e87d9…`, matches pinned |
| G1 — CFW has no policy row | PASS — 0 |
| G2 — table baseline | PASS — exactly 1 row (invegent, `client_preferred`, `cc-0044-invegent-v1`) |
| Shared-pool baseline | PASS — 1 active / 7 fenced |

## 3. The change

```sql
INSERT INTO c.client_asset_pool_policy
  (client_id, pool_policy, allow_global_shared, allow_vertical_shared,
   client_asset_score_bias, minimum_fit_score, policy_version, updated_at)
VALUES ('3eca32aa-e460-462f-a846-3f6ace6a3cae','best_fit',true,false,0,NULL,
        'cc-0073-cfw-bestfit-v1', now());
```

Wrapped in a `DO` block asserting: 1 row inserted · 2 policy rows total · shared pool still 1 active.
All three held (the block would have rolled back otherwise).

## 4. 🔴 A5 — the two-sided proof

### Why the predicate matters

The original A5 check counted `reason_code IN ('inactive','production_use_not_allowed',
'not_in_allowlist')`. That returns **7 before any policy row exists**, because CFW has 7 fenced
**client LOGO** assets rejected as `inactive` on the `Logo` slot — nothing to do with the shared pool.
**It would have passed identically whether or not the shared loop ever ran: a false PASS that looked
like proof.** Corrected to discriminate on `slot='Background'` AND
`asset_key LIKE 'Shared/Backgrounds/%'`, which is how the resolver emits shared-pool rejections
(`asset_key = COALESCE(sa.asset_meta->>'asset_key', sa.id::text)`).

### Baseline (captured read-only, pre-apply) → Post-apply

| platform | bg | scrim | **shared_bg_rejections** | logo_rejections (control) |
|---|---|---|---|---|
| facebook | `bg_cfw_brand_texture_navy_waves` | 48 | **0 → 8** | 7 → 7 |
| instagram | `bg_cfw_brand_texture_navy_waves` | 48 | **0 → 8** | 7 → 7 |
| linkedin | `bg_cfw_brand_texture_navy_waves` | 48 | **0 → 8** | 7 → 7 |

Shared-pool rejection reasons post-apply: `["inactive","not_in_allowlist"]` — i.e. **7 × `inactive`
(the fenced seven) + 1 × `not_in_allowlist` (S8, allowlisted to Invegent)**, exactly as predicted.

| Half | Claim | Verdict |
|---|---|---|
| **Reachability** | the shared loop is now demonstrably **running and rejecting**, not merely absent from errors | **PASS** — 0 → 8 on all three platforms |
| **Inertness** | `bg` and `scrim` byte-identical to the captured baseline | **PASS** — `bg_cfw_brand_texture_navy_waves` / `48`, unchanged on all three |

**Both halves hold. Either alone would not have been a pass:** "nothing broke" is not evidence the
unlock worked, and reachability without byte-identical output would mean the window was not inert.
The `logo_rejections` control stayed at 7, confirming nothing unrelated moved.

## 5. Post-apply verification

| # | Check | Result |
|---|---|---|
| A1/A3 | Policy table = 2 rows, correct values | PASS — CFW `best_fit`/true/false/`cc-0073-cfw-bestfit-v1`; invegent unchanged |
| A2 | Invegent row untouched | PASS — `client_preferred`/true/false/`cc-0044-invegent-v1`, `updated_at` still `2026-07-20T08:57:02.524173+00` |
| A4 | CFW output unchanged | PASS — see §4 |
| A5 | Shared pool reached + fenced | PASS — see §4 |
| A6 | No other client changed | PASS — invegent `bg_shared_datacentre_server` @62 ×3 · ndis-yarns `bg_ny_library_reading_nook` @55 ×3 · property-pulse kitchen/mortgage/subdivision @48 — all byte-identical to the pinned-seed baseline |
| A7 | Spine unmutated | PASS — `resolve_slot_assets` md5 `75d59925316ccde39073113557504596`, `select_template` md5 `41df4745707d0396f145d32d7ffd7483` |
| — | Shared fences untouched | PASS — 1 active / 1 production_use_allowed / 7 fenced / **8 at `scrim_opacity_override='62'`** |
| — | Ledger frozen | PASS — 8 rows, 4 open, 3 carousel `(assignment, unassigned)`, 1 PP-YouTube `(platform_config, misconfigured)` |

## 6. Constraints confirmed

- **No promotion** — all 8 shared assets remain at their prior fence values; 7 still `intake_candidate`.
- **No S3 promotion** — the pilot is untouched and awaits PK's visual PASS.
- **No Invegent asset touched** — its policy row, its allowlist and its resolution are unchanged.
- **Policy and promotion not bundled** — this window changed exactly one row in one table.
- **No CFW expansion beyond the policy row.**
- No resolver/template change · no ledger mutation · no commit/register/push.

## 7. Rollback (validated, unused)

```sql
DELETE FROM c.client_asset_pool_policy
 WHERE client_id='3eca32aa-e460-462f-a846-3f6ace6a3cae'
   AND policy_version='cc-0073-cfw-bestfit-v1';
```
Restores byte-identical prior state (no row). `client_id` is the PK, so a re-run of the INSERT raises
a duplicate-key error rather than silently double-applying.

## 8. What this window did and did not establish

**Established:** CFW's shared-pool path is **structurally open and verified working** — the resolver
consults `c.shared_creative_asset`, evaluates all 8, and correctly rejects every one on governance
grounds. The unlock is real and proven **without changing a single rendered pixel**.

**Not established:** nothing about whether any shared asset *should* be promoted, how a CFW card
looks with one, or the 50/50 rotation. Those are Window 2, gated behind PK's visual PASS on
`_harness/cc0073_candidate_renders_20260724/CFW_PILOT_5050_pair.jpg`.

**Standing expectation for the Window 2 visual gate** (restated so the pilot is not judged on the
wrong metric): at N=2 the chance two consecutive CFW posts share a background is **50%**. Selection is
memoryless (`hash(seed) mod count`). **That is correct behaviour, not pilot failure** — the pilot
proves visual acceptance of a sector-neutral shared asset on a CFW card, not rotation richness.
Anti-repeat remains a recorded cc-0051 handoff.

## 9. Open / next

- **Window 2 (pilot, `eb202701…`) is NOT open.** Awaiting PK's visual PASS, then an explicit
  "S5 GO — pilot window open". Not chained from this window.
- **Invegent** — five real-template renders surfaced, per-candidate verdicts outstanding. No
  promotion action taken. Standing constraint: no Invegent **client-scoped** background while
  `client_preferred`, or the first one suppresses its entire shared pool.
- B-v1 (`ae5041ae…`) retained-not-withdrawn as the full-expansion design.

---

**Window 1 CLOSED.** Nothing staged; the git index was not used as a handoff channel. S4 records.
