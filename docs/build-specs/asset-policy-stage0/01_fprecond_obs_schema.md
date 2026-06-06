# F-precondition 1 — `obs` row + 0A/0B output schema (concept, not DDL)

**PRE-BUILD PLANNING ONLY. Concept/schema only — NOT executable DDL.**

## Principle

Every captured or derived value is an *evidence-tagged cell*, not a bare
column. No value is schema-valid without (a) an `evidence_class` and (b) a
`stage`. The schema is expressed as a per-field contract so the lint gate
(artefact 4) and the lattice rule (artefact 2) can both bind to it.

## Row identity & provenance (every `obs` row carries)

| Field | Concept | Notes |
|---|---|---|
| `obs_row_id` | surrogate id | append-only; not from production |
| `post_draft_id` | join key | from observed draft |
| `observer_version` | code+policy snapshot version | part of idempotency key |
| `stage` | enum `0A` \| `0B` | discriminator; MANDATORY |
| `population` | enum `slot_origin` \| `digest_origin` \| `seed_origin` | observation population |
| `eligibility` | enum `terminal` \| `in_flight` \| `indeterminate` | perturbation/terminal-state handling |
| `observed_at` | timestamp | observation moment |
| `policy_input_snapshot` | provenance blob | which `is_current` taxonomy/mix + `client_format_config` snapshot + `publisher_matrix_version` |

**Idempotency key:** `(post_draft_id, observer_version, stage)`.

## Per-value envelope (the unit every captured/derived value uses)

```
value_cell := {
  name:           <field name>,
  value:          <scalar | array | null>,
  evidence_class: one of { observed_fact, reconstructed_fact,
                           inferred_value, speculative_counterfactual,
                           unknown_unavailable },   # MANDATORY
  stage:          0A | 0B,                          # MANDATORY
  source_ref:     <table.column or derivation id>   # provenance
}
```

**Hard schema rule:** a `value_cell` missing `evidence_class` or `stage` is
schema-invalid (rejected at write and at lint). `null` value is permitted only
with `evidence_class = unknown_unavailable` (a known-absent fact) — a `null`
under any other class is invalid (forbids silent gaps masquerading as facts).

## 0A output fields

All `stage=0A`, all raw. Classes restricted to `observed_fact` |
`reconstructed_fact` | `unknown_unavailable`. **Never** `inferred_value` or
`speculative_counterfactual` in 0A.

| 0A field | Permitted class(es) |
|---|---|
| `slot_format_chosen` | observed_fact / unknown_unavailable |
| `advisor_recommended_format` | observed_fact / unknown_unavailable |
| `requested_format_type` | observed_fact / reconstructed_fact |
| `render_output_type` | observed_fact / unknown_unavailable |
| `video_status`, `image_status` | observed_fact / unknown_unavailable |
| `render_log_row_count`, `slide_count` | observed_fact |
| `render_engine_raw_values` (set) | observed_fact / unknown_unavailable |
| `draft_format_contains_heygen_keys` | observed_fact |
| `provider_log_present` | observed_fact |
| `client_format_config_row_count` | observed_fact |
| `format_listed`, `is_buildable` | observed_fact |
| `publish_destination_present` | observed_fact |
| `catalog_render_engine_raw` | observed_fact |
| `heygen_submitted_at`, `heygen_rendered_at` | observed_fact / unknown_unavailable |
| row presence/absence, unknown counts | observed_fact |

## 0B output fields

All `stage=0B`, all `speculative_counterfactual` (or the least-certain class of
their 0A inputs, per artefact 2). Each metric also carries the metric envelope
below.

| 0B field/code | Class |
|---|---|
| `advisor_slot_difference_cf` | speculative_counterfactual |
| `provider_observed_cf` / `provider_inferred_cf` / `provider_unknown_cf` | observed/inferred/unknown as resolved |
| `video_to_image_fallback_cf` | speculative_counterfactual |
| `taxonomy_allowed_formats_cf`, `publisher_shippable_cf`, `client_allowed_formats_cf`, `policy_allowed_set_cf` | speculative_counterfactual |
| `mix_delta_cf` | speculative_counterfactual (or unknown if any input unknown) |
| reason codes `*_CF` | speculative_counterfactual |

## Metric envelope (mandatory for any 0B composite metric)

```
metric := {
  name, value,
  evidence_class,                 # per lattice (artefact 2)
  numerator_class, denominator_class,
  exclusions:  [<reason codes excluded>],
  unknown_count: <int>            # how many inputs were unknown_unavailable
}
```

A 0B metric missing any of `numerator_class`, `denominator_class`,
`exclusions`, `unknown_count` is invalid.
