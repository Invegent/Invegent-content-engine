# cc-0091 A3 — Option A design: close the observability seam

**Created:** 2026-08-08 Sydney · **Author:** Claude Code (cc-0091 Gate A, A3)
**Status:** DESIGN — **no code written, nothing applied.**
**Decision:** PK chose **Option A** (fill with fallback, record the degradation) 2026-08-08.
**Supersedes the sizing in:** `cc0091-a3-design-finding-silent-degradation-path-v1.md` (that
finding's *location* stands; its *sizing* was too large — see §2).

---

## 1. A3 is far smaller than the brief assumed — the model already exists

The brief mandates a three-state model (`SUPPORTED` / `UNSUPPORTED_WITH_CAUSE` / `UNPROVEN`).
**ICE already has a richer one, live**, in `public.classify_format_capability`:

| status | routed_lane |
|---|---|
| `ready` | — |
| `template_missing` | `template_creatomate_heygen` |
| `governance_unproven` | `governance_proof` |
| `asset_shortage` | **`asset_gap_s8`** |
| `pipeline_missing` | `engineering` |
| `publisher_path_missing` | — |
| **`unsupported_silent_degrade`** | — |
| `unknown` / `capability_check_error` | — |

It already emits `reason_code`, `evidence`, and **already routes to the Asset Gap machinery**
(`asset_gap_s8`). `m.fill_pending_slots` already enforces it (S9, `v_cap_status IS DISTINCT FROM
'ready'` blocks), already fail-closes on classifier error without aborting the batch, and already
records `skip_reason` to `m.slot_fill_attempt`.

**Do not build a parallel three-state model.** The brief's requirement is already over-satisfied by
live infrastructure. A3's job is to fix *where the classifier is pointed*, not to replace it.

## 2. The actual defect: the classifier is asked about the wrong format

`m.fill_pending_slots` line 122:

```sql
v_cap_format := COALESCE(v_slot.format_preference[1], 'image_quote');
```

then line 145:

```sql
v_cap_evidence := public.classify_format_capability(v_cap_slug, v_slot.platform, v_cap_format);
```

**The default is applied BEFORE the capability check.** If the requested format was dropped
upstream, `v_cap_format` is already `image_quote` by the time the classifier sees it. The classifier
dutifully returns `ready` for `image_quote`, the gate passes, and the slot fills static.

**The mechanism built to catch silent degradation cannot see this one, because the degradation
happened before it was consulted.** There is even a status named `unsupported_silent_degrade` that
will never fire for this path.

## 3. Where the request is actually lost

Two sites, neither of which records anything:

1. **`m.build_weekly_demand_grid` → `capability_gated` CTE.** Fail-closed
   `COALESCE((cf.platform_support ->> es.platform)::boolean, false)`, shipped
   `20260801023502 s7_demand_grid_capability_guard_v1` (2026-08-01). Formats failing the gate are
   **dropped from the result set with no emission.** The paired `v_dropped_pref` observability
   counter from the same design **never landed** (verified: live `m.materialise_slots` has no such
   counter).
2. **`m.fill_pending_slots` → the `COALESCE(..., 'image_quote')` default**, 4 sites. Substitutes
   with no record of what was wanted.

By the time (2) runs, (1)'s information is unrecoverable. `fill_pending_slots` **cannot** know what
was requested — so the record must be emitted at (1), and (2) must record that it defaulted.

## 4. Option A implementation — two emissions, zero behaviour change

**Nothing about which slot fills, or with what, changes.** Volume unchanged. Output unchanged.

**A3-1 — emit at the drop site (`m.build_weekly_demand_grid`).**
Add a `platform_dropped` CTE capturing rows `enabled_set` MINUS `capability_gated` — the formats
that carried a mix share but failed the capability gate. For each, record:
`client_id · platform · ice_format_key · share_pct · capability_state · reason_code · evidence`,
where state/reason come from `public.classify_format_capability` (reused, not reimplemented) and
`platform_support` key-presence distinguishes **absent** (`UNPROVEN`) from **explicit false**
(`UNSUPPORTED_WITH_CAUSE`).
The function is `STABLE` and `RETURNS TABLE`, so it cannot write. **Emission target is therefore a
companion function or a materialiser-side write — see §6 open question.**

**A3-2 — record the default at the fill site (`m.fill_pending_slots`).**
Where `format_preference` is empty and the code falls to `'image_quote'`, write
`m.slot_fill_attempt.pool_snapshot` (jsonb, already present, nullable) with
`{"format_defaulted": true, "requested_format": null, "applied_format": "image_quote",
"reason": "no_surviving_format_preference"}`. **`decision` and `skip_reason` are NOT changed** —
the slot still fills; this is annotation only, so the S9 gate and every existing consumer are
byte-unaffected.

**A3-3 — surface.** Both emissions are readable by the dashboard through the existing
capability-pyramid surfaces, and A3-1's records carry `routed_lane` already, so
`asset_gap_s8`-routed drops are consumable by the Asset Gap machinery with no new contract.

## 5. Test that fails if the silent path is reachable

Hermetic, per the brief's success criterion:

1. Seed a format with `platform_support` **key absent** for a platform → assert the resolved state
   is `UNPROVEN`, **not** `UNSUPPORTED_WITH_CAUSE` and **not** `SUPPORTED`. Fails if `null` is
   coerced to `false`.
2. Seed a format with explicit `false` → assert `UNSUPPORTED_WITH_CAUSE`.
3. Seed a mix share for a format failing the capability gate → assert **a drop record is emitted**.
   **This test fails if the drop is silent** — the required negative test.
4. Assert the filled slot is still produced and its `decision` is unchanged → proves zero behaviour
   change.

## 6. Open questions — PK decisions, not assumptions

- **Q1 — where do drop records land?** `m.build_weekly_demand_grid` is `STABLE` / `RETURNS TABLE`
  and cannot write. Options: (a) a new `m.format_capability_drop` table written by the
  *materialiser* which already calls the grid; (b) extend the grid's return shape with a drop
  column (changes a live contract — riskier); (c) a separate observer function run on the same
  cadence. **Recommend (a)** — no live contract changes, and it mirrors where `v_dropped_pref` was
  originally designed to live.
- **Q2 — retention.** Drop records on a nightly cadence across 4 brands × 4 platforms will
  accumulate. Needs a retention rule before apply, not after.
- **Q3 — does A3-1 belong in Gate A at all?** It touches `m.build_weekly_demand_grid` /
  `m.materialise_slots` — the nightly path, T3. Gate A applies nothing, so authoring is in scope;
  but if PK prefers Gate A to stay purely non-production-touching, **A3-2 alone** (annotation-only,
  no live contract change) is a coherent smaller Gate A, with A3-1 moving to Gate B alongside A2a.

## Non-claims

- Not claimed: that the three-state model needs building. It exists and is richer.
- Not claimed: that the 55% IG / 61% LI defaults are all capability drops — still unseparable, and
  separating them is precisely what A3-1 delivers.
- Not claimed: any fix to the live YouTube `image_quote` hole (8 slots). Still flagged, still unfixed.
- Not done: no code, no migration, no function altered, nothing applied.
