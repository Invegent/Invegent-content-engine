# F-precondition 3 — Single named 0A->0B transform contract

**PRE-BUILD PLANNING ONLY.**

## Name

`stage0_transform` — the ONLY sanctioned path from raw 0A state to 0B
comparison logic.

## Contract

- **Input:** raw 0A `value_cell`s for a given `(post_draft_id,
  observer_version)`. 0A cells are read-only to the transform.
- **Output:** 0B `value_cell`s / `metric`s, each `stage=0B`, each classed per
  artefact 2.
- **Direction:** one-way. The transform NEVER writes back to any 0A field and
  NEVER writes to any production schema. It writes only 0B rows in the isolated
  `obs` boundary.
- **Exclusivity:** no other module, query, view, or report may derive a
  comparison/inference/mismatch from 0A cells. Any 0A->comparison path that is
  not `stage0_transform` fails review (enforced by artefact 4 import/reference
  scan + the defence-in-depth gates).
- **Responsibility split (contractual):**
  - 0A stores `A` and `B` only — raw values, no relationship between them.
  - 0B (via `stage0_transform`) performs ALL difference, inference, fallback
    determination, provider resolution, publisher/destination evaluation,
    policy/client-format reading, mix delta, and mismatch logic.
- **Gating:** `stage0_transform` may run only after 0A evidence-quality
  thresholds pass. If 0A coverage for a dimension is below threshold, the
  transform emits `unknown_unavailable` for that dimension rather than a
  low-confidence comparison.
- **Determinism & provenance:** given the same 0A cells + same
  `policy_input_snapshot` + same `observer_version`, the transform is
  deterministic; every 0B output records the 0A `source_ref`s it consumed.
- **No side effects:** no provider/API calls, no production reads (it consumes
  already-captured 0A cells, not live tables), no routing/selection output.

## Interface sketch (concept)

```
stage0_transform(
  inputs:  Map<field_name, ValueCell@0A>,
  policy_snapshot: ProvenanceRef,
  thresholds: CoverageThresholds
) -> List<ValueCell@0B | Metric@0B>
# invariants: read-only on inputs; output stage==0B for all;
#             class(output) per lattice; no production write; no API call
```
