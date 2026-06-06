# F-precondition 2 — Evidence-class lattice rule (concept)

**PRE-BUILD PLANNING ONLY.**

## Lattice (total order, least -> most certain)

```
unknown_unavailable < speculative_counterfactual < inferred_value < reconstructed_fact < observed_fact
```

Encoded as an ordered enum with integer ranks so composition is a `min()`:
`unknown_unavailable=0, speculative_counterfactual=1, inferred_value=2,
reconstructed_fact=3, observed_fact=4`.

## Composition rule (least-certain-wins)

For any composite `C` derived from inputs `i1..in`,
`class(C) = argmin_rank( class(i1), ..., class(in) )`.
A derivation may **never** assign its output a class of higher rank than its
lowest input (no laundering an inference into a fact).

## Unknown-propagation rule (absolute)

If **any** input has `evidence_class = unknown_unavailable`, then
`class(C) = unknown_unavailable` and `value(C) = null` — **unless** `C` is
explicitly declared an *unknown-count metric* (a metric whose semantic is "how
many inputs were unknown"), in which case the unknown is the thing being
counted, not an input to a value.

## Derived prohibitions (each a checkable assertion)

- **No zero-fill:** an `unknown_unavailable` input may not be substituted with
  `0`, `''`, `false`, or any default before entering a composite (e.g. unknown
  HeyGen credits never become `0`).
- **No unknown in mismatch math:** an `unknown_unavailable` value may not appear
  in a mismatch metric's numerator or denominator unless the metric is an
  unknown-count metric (e.g. no cost delta while HeyGen cost is unknown; no
  provider mismatch when one side is `provider_unknown`).
- **No silent class drop:** a rollup that emits a value without an
  `evidence_class`, or that aggregates across classes without recording the
  resulting `min` class, fails review.
- **0B summary disclosure:** any 0B summary must surface its
  `speculative_counterfactual` share; a summary that omits it fails review.

## Stage cap (0B)

0B (comparison-stage) outputs are capped at `speculative_counterfactual` even
when their 0A inputs are facts, because the *comparison* is the counterfactual
act. Composition gives `min`; the stage cap then lowers to
`speculative_counterfactual`. The stage cap is never *raised* by composition.

## Worked checks (for the review harness)

- `cost_delta_cf` with one input `heygen_credits = unknown_unavailable`
  => output `unknown_unavailable`, value `null`. PASS if null; FAIL if a number.
- `provider_mismatch_cf` where `provider_inferred_cf` present but
  `provider_observed_cf` absent (`unknown`) => output `unknown_unavailable`.
- `advisor_slot_difference_cf` from two `observed_fact` 0A inputs => output
  `speculative_counterfactual` (stage cap applied).
