# MCP Review Protocol

> **Active from 2026-05-02 Saturday afternoon Sydney session.**
> Captures PK feedback after the first real fire of `ask_chatgpt_review` on T02 Gate B exit decision (review_id `2bab95d5-36bb-47f8-88e4-75b4887d458f`). Supplements the standing rule from D-01.

## Why this exists

Generic calls to `ask_chatgpt_review` produce generic objections (silent regression abstractly, doc hygiene). Specific calls produce specific challenges (n=3 sample size against a <5% target). The 7 call-side fields below are the minimum scaffolding needed for the reviewer to engage the actual decision rather than the generic shape of decisions.

Routing is binary (proceed / apply_corrected / escalate); human decisions are not. When the corrected action is defensible AND override is also defensible, Claude's job is to make the choice legible to PK — not to default to either path.

---

## Call-side: required context fields

When Claude fires `ask_chatgpt_review`, the `context` object must include — at minimum — the following named fields. Other context (locks, exit conditions, references) is encouraged but optional.

| Field | Purpose |
|---|---|
| `decision_under_review` | One-sentence statement of what is actually being decided |
| `production_action_if_approved` | What concretely happens if PK proceeds (SQL applied, EF deployed, doc updated, etc.) |
| `consequence_if_delayed` | What concretely happens if the decision slips by 24h / 48h / a week |
| `cost_of_waiting` | Quantified where possible — production downtime, lost capability, audit gap, zero |
| `current_evidence` | The real signal Claude has gathered (queries run, files read, observations captured) |
| `known_weak_evidence` | Where the evidence is statistically thin, narratively suggestive, or otherwise weaker than headline counts imply |
| `default_action` | What the protocol or brief says happens if no decision is made — the no-action baseline |

The 7 fields above are the minimum. A call missing any of them should be tagged in the proposal text as a known protocol gap.

---

## Response-side: when the tool returns `escalate=true`

Applies to all `escalate_*` routing decisions: `escalate_disagree`, `escalate_high_risk`, `escalate_low_confidence`, `escalate_explicit_flag`, `escalate_partial_no_correction`, `escalate_schema_invalid`, `escalate_timeout`, `escalate_refusal`.

1. **Do not proceed automatically.** Even when the `corrected_action` returned by ChatGPT looks reasonable, the routing layer has explicitly flagged for human review. Auto-applying the correction would defeat the purpose of the cross-check.

2. **Separate strong objections from weak.** ChatGPT typically returns 2–4 pushback points at once. Some are abstract (silent regression hypothetically; doc hygiene). Some have empirical substance (n=3 sample size against a <5% target). Claude calls the difference explicitly so PK isn't reading them as equally weighty.

3. **State the lowest-risk default.** Usually the no-action baseline (whatever the brief says happens if nothing is decided). Useful as the anchor against which other paths are evaluated.

4. **State the cost of waiting.** Often this is zero — particularly for `plan_review` action_types where no production action has been taken yet. When cost of waiting is zero, accepting the corrected action is usually the right call by default.

5. **Recommend a path.** Not "here are options, you pick." Claude actually recommends one path and explains why, giving PK something concrete to push against.

6. **Record PK's override or acceptance reason.** Once PK chooses, the reason is captured in:
   - The audit memo (e.g. `docs/audit/runs/2026-05-02-t02-extension.md`)
   - The close-the-loop UPDATE on `m.chatgpt_review` (`action_taken`, `resolved_by`, `escalation_resolved_at`) once that procedure is operationalised

---

## Worked example: T02 Gate B exit (2026-05-02)

The first fire used a *partial* version of this protocol. Context included `obs_window`, `phase_b_patch`, `exit_default_rule`, `carried_forward_locks_unrelated_to_phase_b`, `what_could_go_wrong`, `session_meta` — useful but unstructured. It did **not** include explicit:

- `production_action_if_approved` (would have been: "ratification only — no SQL, no EF redeploy, no config change. Doc memo + action_list update.")
- `consequence_if_delayed` (would have been: "doc ratification slips by N hours; obs window extends; no production impact.")
- `cost_of_waiting` (would have been: "zero — nothing depends on T02 ratification today.")
- `default_action` (would have been: "exit on schedule per brief — Sat 2 May ~+48h.")

These were buried in the proposal prose rather than structured. Despite the gap, the review still produced one substantive concern (n=3 shadow ai_jobs sample size against <5% target). The protocol is a sharpening of what worked, not a fix for a broken first fire.

On the response side, Claude's actual handling honoured the protocol implicitly:
- Separated weak (silent regression abstract, doc hygiene) from strong (n=3 sample size)
- Stated the default (exit on schedule per brief)
- Stated cost of waiting (zero)
- Presented three paths with reasoning

What was missing: an explicit recommended path. Path A was presented as one of three options rather than as Claude's recommendation. Codifying step 5 ensures the next fire makes the recommendation explicit.

---

## Action types and protocol weight

| `action_type` | Protocol weight |
|---|---|
| `sql_destructive` | Full protocol mandatory |
| `ef_deploy` | Full protocol mandatory |
| `config_change` | Full protocol mandatory |
| `plan_review` | Full protocol mandatory; cost of waiting often zero |
| `sql_read` | Light protocol — 7 fields encouraged but not blocking |
| `finding_classification` | Light protocol |
| `other` | Judgement call — default to full protocol |

---

## References

- D-01 standing rule: every production patch and action_list version bump from v2.5 onward goes through ChatGPT cross-check before deploy/commit
- T-MCP-04: codification of D-01 in standing prompt — this doc is one half; the project system prompt update in claude.ai is the other half (still pending PK)
- First fire: `m.chatgpt_review` row `2bab95d5-36bb-47f8-88e4-75b4887d458f`
- T02 audit memo: `docs/audit/runs/2026-05-02-t02-extension.md`
- T-MCP-05: close-the-loop UPDATE on the first escalation row (operationalises step 6 of response-side protocol)
