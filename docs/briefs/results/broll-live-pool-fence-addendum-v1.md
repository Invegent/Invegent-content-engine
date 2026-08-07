# Addendum — third live-pool fence (`2d62b04e`) + measured pool-depletion cliff

**Addendum to:** `docs/briefs/results/broll-live-pool-fence-result-v1.md` (committed `d5a7d5c`,
register v6.164). **That doc is NOT amended** — no historical rewrite. It records two fences and
lists `2d62b04e` as an open PK judgment left deliberately live; this addendum records PK's ruling
on that item and supersedes it on that point only. Everything else in v1 stands.
**Executed by:** Claude Code (orchestrator), first-hand
**Completed:** 2026-08-07 Sydney
**VERSION-LESS** — register payload at §8.

---

## 1. Result status

`Complete`. Third and final asset fenced on PK ruling. **Live PP B-roll pool 4 → 3.**
The substantive output of this lane is not the fence — it is **§4, the first measured characterisation
of resolver behaviour under pool depletion**, which was previously unknown and assumed.

## 2. What was executed

Single statement, 1 row, `c.client_brand_asset`, identical in shape to the v1 fence:
`is_active=false` · `approved=false` · `approval_status='fenced_signage_defect'` + `fenced_at`/`by`/`reason`.

```sql
UPDATE c.client_brand_asset
SET is_active = false,
    asset_meta = asset_meta || jsonb_build_object(
      'approved', false, 'production_use_allowed', false,
      'approval_status', 'fenced_signage_defect',
      'fenced_at', now()::text, 'fenced_by', 'PK',
      'fenced_reason', '<PK ruling 2026-08-07, reaffirmed after pool-depletion risk was quantified …>')
WHERE asset_id = '2d62b04e-c1b5-44df-b382-59cbb991e166' AND is_active = true;
```

**Target:** `2d62b04e-c1b5-44df-b382-59cbb991e166` · "Generic AU suburban aerial" · Pexels `31663307`.

**Two defects, one row:**
1. **Third-party brand mark** — McDonald's golden arches identifiable on a retail strip in the delivered
   1080×1920 frame at 1:1 (~15px). A brand *mark*, **no readable wordmark** — materially weaker than the
   `f84ac010` ("Fremantle") and `e6e24358` ("Owen Hodge") wordmark cases. Fenced for consistency with the
   Amazon-logo reject precedent from the Invegent sourcing lane, on PK's explicit ruling.
2. **Declared-generic-vs-specific label** — `asset_name` says "Generic AU suburban aerial" while
   `geography='au_nsw_sydney_hurstville'`. The row's own `label_constraint` concedes the constraint is
   **not machine-enforced** (carry C1).

**Nothing was retracted on this row.** Unlike the two v1 fences, `2d62b04e` carried `review_notes = null`
— it never asserted a signage verification. This is the **unrecorded**, not the **falsely recorded**,
class (v1 §8.2).

## 3. Gate trail — two escalations, neither overridden

| Review | Verdict | Outcome |
|---|---|---|
| `259de9d5-01d7-4799-8c2b-1db59d348a0f` | partial / escalate | **NOT APPLIED.** Pushback: resolver behaviour at reduced pool not assured. This was the same gap the orchestrator had already flagged as unverified in the proposal |
| — | — | Gap closed **empirically** (§4), not by argument |
| `5dd6b9d6-a6bf-4841-ac29-bfe3d09a0487` | partial / escalate | **NOT APPLIED ON REVIEW.** Its `verified_claims` accepted the new evidence (no functional failure at 3 · effective pool 2 · no graceful video degradation); it escalated on **operational safety** — a `policy_decision`, which routes to PK, not to a fix |
| PK | reaffirmed | **Applied.** PK's original ruling predated the depletion findings, so the new facts were put to PK before applying rather than after. PK confirmed with them in hand |

Per CLAUDE.md triage routing, `policy_decision` → PK decision gate; it is not a defect to fix and not a
verdict to re-litigate by resubmission. The proposal was **not** resubmitted a third time to obtain a
cleaner verdict.

## 4. MEASURED: resolver behaviour under pool depletion (previously unknown)

**Method.** `public.resolve_slot_assets` is `provolatile='s'` (STABLE, read-only, no side effects), so it
is safe to call. Each scenario was tested as: `BEGIN;` apply simulated fences; call the resolver against
the live PP video template; `ROLLBACK;`. **Both simulations verified clean afterwards** — row states
restored and `asset_meta` md5 digests byte-identical to pre-simulation (`dd9504f6…` for the single-row
case; 4 active / 7 total for the pool-0 case). Zero residue.

| Eligible pool | `status` | `fail_reason` | Behaviour |
|---|---|---|---|
| **3** (post-fence) | **`ok`** | null | Resolves a real background. `pool_after_geo`=3, **`pool_after_recent_use`=2** |
| **0** (all fenced) | **`fail_closed`** | **`no_governed_background`** | Slot does not fill; 11 rejected candidates enumerated |

**Three findings that outlive this fence:**

1. **There is no minimum-pool threshold in the resolver.** No `POOL>=N` gate exists. Pool size affects
   *variety*, not *success*, until it reaches zero. The recorded "POOL=6 MET" figure is a governance
   threshold, not a mechanical one.
2. **Effective selection pool is smaller than eligible pool.** At eligible=3, recent-use exclusion
   (`recent_use_level: excluded_2`) strips 2, leaving **2** to select from. Confirmed identically in
   simulation and against the live resolver post-fence.
3. **Video backgrounds have NO shared-pool fallback.** The shared-pool branch is gated on
   `NOT v_bg_is_video` — video is client-only. Unlike still images, there is **no safety net beneath the
   client B-roll pool**. Failure at zero is fail-closed (correct design: it does not silently ship a
   wrong asset), but the slot does not fill.

## 5. Post-apply verification (against the LIVE resolver, not the simulation)

| Metric | Result |
|---|---|
| Eligible pool | **4 → 3** — `broll_pp_au_nsw_suburb_skyline`, `broll_pp_au_nsw_suburb_waterway`, `broll_pp_generic_apartment_abstract` |
| Target still in pool | **0** |
| Total PP broll rows | **7** — unchanged, nothing deleted |
| Live resolver `status` | **`ok`**, `fail_reason` null |
| Live selection made | `broll_pp_generic_apartment_abstract` (`aa55659e`) |
| `pool_after_recent_use` (live) | **2** — matches simulation exactly |

## 6. Rollback (validated; held outside the DB)

```sql
UPDATE c.client_brand_asset
SET is_active = true,
    asset_meta = asset_meta
      || jsonb_build_object('approved', true, 'production_use_allowed', true,
                            'approval_status', 'governed')
       - 'fenced_at' - 'fenced_by' - 'fenced_reason',
    updated_at = now()
WHERE asset_id = '2d62b04e-c1b5-44df-b382-59cbb991e166';
```

Prior state: `is_active=true` · `approved=true` · `production_use_allowed=true` ·
`approval_status='governed'` · `asset_meta` md5 **`dd9504f696c16910984dd5a882b3d158`**.

Combined with v1 §6.3, **all three fences are independently reversible.**

## 7. Open issues

1. **⚠ POOL AT 3 — HALF THE RECORDED "POOL=6 MET" THRESHOLD, EFFECTIVE SELECTION 2, NO BACKFILL.**
   **This should be treated as the LAST fence before backfill.** A fourth would leave effective selection
   at 1; three more reach the `fail_closed` cliff, which for video has no fallback. Refill is the
   watch-gated 2026-08-07 corpus — **this makes the intake election materially more urgent than when the
   pool stood at 6.** Not a defect; a named, quantified operating constraint.
2. **Remaining pool has thin visual variety.** Of the 3, two (`9cf9d01a`, `4653144c`) are tonally similar
   residential aerials and the third (`aa55659e`) is a near-static balcony abstract. Effective variety is
   arguably nearer 2 than 3, compounding finding §4.2.
3. **`42211c0f`** (fenced, untouched) still carries `safe_for_text_overlay='needs_gradient_scrim'`, a value
   the resolver does not recognise. Inert while fenced; would misbehave if promoted as-is.
4. **`f84ac010`'s geo label remains uncorrected** (`au_wa_perth_cottesloe`, actually Fremantle). Harmless
   while fenced — **must not be un-fenced with the label intact.**
5. **`still-background-signage-verification-v1`** (v1 §8.2) — 44 live still-image background rows with no
   recorded signage verification. Named, NOT started, NOT authorized.
6. The seven PK decisions from `broll-video-sourcing-4brand-result-v1.md` §7 carry unchanged.

**Recorded as fact, not complaint:** all three fences were triggered by defects found through a fresh
harvest coincidentally re-sourcing the same provider IDs. Nothing in the pipeline re-checks live pool
contents against the rules they were admitted under (v1 §8.3 structural recommendation, still unadopted).

---

## 8. Register payload (version-less — pointer only, per Convention 1)

```
B-roll LIVE POOL: THIRD fence applied (2d62b04e, PK ruling reaffirmed after risk quantification).
McDonald's brand mark ~15px at 1:1 + declared-generic-vs-Hurstville label defect. review_notes was
NULL - nothing retracted (unrecorded class, not false-claim class).
Reviews 259de9d5 partial/NOT-APPLIED -> gap closed EMPIRICALLY -> 5dd6b9d6 partial/escalate as
policy_decision -> PK reaffirmed with the new facts -> applied. Not resubmitted for a cleaner verdict.
POOL 4->3 (was 6 this morning). Live resolver post-fence: status=ok, selected apartment_abstract.
MEASURED CLIFF (rolled-back txns, digests verified clean): pool 3 = ok but pool_after_recent_use=2
(effective selection 2) · pool 0 = fail_closed / no_governed_background · VIDEO HAS NO SHARED-POOL
FALLBACK (branch gated on NOT v_bg_is_video) · no minimum-pool threshold exists in the resolver.
=> TREAT AS LAST FENCE BEFORE BACKFILL; intake election now materially more urgent.
All 3 fences independently reversible; rollback SQL + prior-state md5s outside the DB.
Result: docs/briefs/results/broll-live-pool-fence-addendum-v1.md
Predecessor d5a7d5c NOT amended. Next gate: PK decisions + intake election.
```
