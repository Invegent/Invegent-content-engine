# F-precondition 4 — 0A allowlist / denylist lint config (draft)

**PRE-BUILD PLANNING ONLY. Concept config — NOT a wired lint file.**

Purpose: make 0A purity and evidence-class presence mechanically enforced at
build time — a build that violates any rule fails, no reviewer vigilance
required.

```yaml
# stage0_0A_purity.lint  (DRAFT - concept config, not wired)
scope:
  applies_to: ["observer/0A/**"]          # 0A capture code + 0A schema defs
  excludes:   ["observer/0B/**"]          # 0B is where comparison is legal

evidence_class:
  required_on_every_field: true           # artefact 1 hard rule
  required_on_every_metric: true
  allowed_values: [observed_fact, reconstructed_fact, inferred_value,
                   speculative_counterfactual, unknown_unavailable]
  stage_required: true                    # 0A | 0B mandatory
  zero_fill_forbidden: true               # artefact 2

stage_0A:
  allowed_fields:                         # exhaustive; anything else fails
    - slot_format_chosen
    - advisor_recommended_format
    - requested_format_type
    - render_output_type
    - video_status
    - image_status
    - render_log_row_count
    - render_engine_raw_values
    - draft_format_contains_heygen_keys
    - provider_log_present
    - client_format_config_row_count
    - format_listed
    - is_buildable
    - publish_destination_present
    - catalog_render_engine_raw
    - slide_count
    - heygen_submitted_at
    - heygen_rendered_at
    - row_presence_flags
    - source_provenance
    - unknown_counts
  allowed_evidence_classes_0A:            # 0A may NOT infer or speculate
    - observed_fact
    - reconstructed_fact
    - unknown_unavailable

  forbidden_field_names:                  # exact + regex; build fails on match
    - values_differ
    - provider_inferred
    - "*_differ"
    - "*_mismatch"
    - "*_override*"
    - "*_fallback*"          # unless a source-recorded fallback event field, explicitly allowlisted
    - "*_violation*"
    - "*_expected*"
    - "*cost_delta*"
    - "*agree*"
    - "*disagree*"
    - "*should*"

  forbidden_terms_in_identifiers_and_strings:
    - difference boolean        # any boolean over two 0A fields
    - mismatch
    - override
    - fallback (interpretive)
    - violation
    - expected state
    - agreement / disagreement
    - cost delta
    - should-have-been
    - inferred (in 0A scope)

  forbidden_constructs_0A:
    - comparison_operator_between_two_captured_fields   # e.g. A != B, A == B
    - boolean_derived_from_two_fields
    - any reference to 0B reason codes (*_CF)
    - any inference/heuristic assignment

transform_exclusivity:
  only_sanctioned_0A_to_comparison_path: stage0_transform
  fail_if_other_module_reads_0A_for_comparison: true

fail_mode: hard            # any violation fails the build, non-overridable
```

## Note on `*_fallback*`

The only legitimate 0A use is a field that records a fallback **event the
source system itself logged** (not an interpretation). If such a source field
exists, it must be explicitly allowlisted by exact name with a `source_ref`
proving it is source-recorded; otherwise all fallback terms are denied in 0A.
