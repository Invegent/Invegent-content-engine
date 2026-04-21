# Brief — Reviewer Role Library (Deferred Capture)

**Date captured:** 2026-04-21 (during external reviewer build session)
**Status:** ❄️ Deferred — not yet to execute. Gate for execution below.
**Source:** PK session reframe on 21 Apr during implementation of the external reviewer layer
**Parent decision:** D156
**Related decisions:** D160 (three-voice implementation that this reframe extends)

---

## What this brief captures

During the external reviewer build on 21 Apr, PK raised a reframe that goes beyond the three-voice layer shipped that day. This brief preserves the reframe in full so it can be executed later without re-deriving the reasoning.

**The reframe in PK's own words (two excerpts from the session):**

> "The idea should be to have as many roles that we want as a file. So when we say, look, yes, we have run this rule with the Grok or with the ChatGPT, and next review that we want maybe we can simply run a salesman kind of pitch for all the three models and have a look at it. Or maybe we can run engineering question that what risk do we have when we commit all of these changes that we have made in next three to four weeks. So we can run the same questions to all three. So the thing is, you know, the ocean is as big as it is. And by defining more roles, it doesn't hurt us we can run them anytime."

> "I'm not very excited with these ideas because these ideas are becoming burdensome. But the thing is, I have to get this project going with very limited resources, and I cannot hire any person. So having these roles will be help, especially coming out of different models. So therefore, yes, we have to build it. At some point of time. And at this point of time, we can go ahead with what we have."

Both excerpts preserved because they capture the honest tension: the architecture substitutes for a team PK cannot hire, so it genuinely serves him, but it is also meta-work competing with content work for scarce solo-founder time. The correct rhythm is build-when-needed, not build-speculatively. This brief sits parked until needed.

---

## What the reframe changes

Today's three-voice layer treats roles as *fixed reviewer assignments*. Strategist = Gemini. Engineer = GPT. Risk = Grok. Cron fires them all.

The reframe reshapes roles as a *library of lenses* independent of models. Any role can run on any model against any commit set, on demand.

Three axes become independent where they were coupled:

| Axis | Today (D160) | Reframe |
|---|---|---|
| Role (the lens / the question being asked) | Fixed to reviewer row | Library — pick at invocation time |
| Model (the voice / which AI answers) | Fixed to reviewer row | Pool — pick at invocation time |
| Invocation (when / what is reviewed) | Weekly cron or on-demand button, commit-triggered | On-demand with target set — single commit, commit range, time window |

---

## Use cases the reframe unlocks

Cases PK named during the session:

- *"Run Salesman role across all three models on last 4 weeks of commits"* — test the pitch against a sceptical buyer before the first client conversation
- *"Run the engineering risk question against all three models for the last 3-4 weeks of changes"* — quarterly risk audit on accumulated changes rather than per-commit
- *"Run a compliance reviewer against the pilot agreement draft"* — NDIS compliance lens on a legal document, not a code commit

Additional candidate roles that would fit naturally into the library:

- **Content Reviewer** — human-voice check on AI-generated drafts before publication
- **Future-Maintainer** — "six months from now, would a new Claude session / PK / hired developer understand why this was done"
- **Drift Detector** — multi-commit pattern analysis, not per-commit. "Are we building toward something coherent or accumulating scope without convergence?"
- **Cost Reviewer** — economic lens on infrastructure changes ("what's the monthly bill impact of this commit?")
- **Compliance Auditor** — NDIS / Privacy Act / Spam Act lens on content and legal drafts
- **Buyer-Risk Reviewer** — simulated paying-client review of pilot agreements, onboarding docs, SLAs

Library grows over time as needs emerge. Not all roles need to exist on day one.

---

## Proposed architecture for when this executes

### Schema changes

**New table — `c.external_reviewer_role`** (the library of lenses):

```sql
CREATE TABLE c.external_reviewer_role (
  role_code        text PRIMARY KEY,       -- 'strategist' | 'engineer' | 'risk' | 'salesman' | 'compliance' | ...
  display_name     text NOT NULL,
  purpose          text NOT NULL,          -- one-paragraph description of the lens
  system_prompt    text NOT NULL,          -- the instructions, without rules (rules join separately)
  default_model    text,                   -- hint for invocation; not enforced
  default_context  text NOT NULL,          -- 'full_repo' | 'focused_commit' | 'document_only'
  is_active        boolean NOT NULL DEFAULT true,
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now()
);
```

**New table — `c.external_reviewer_model`** (the pool of voices):

```sql
CREATE TABLE c.external_reviewer_model (
  model_code       text PRIMARY KEY,       -- 'gemini-2.5-pro' | 'gpt-4o' | 'grok-4-1-fast-reasoning'
  provider         text NOT NULL,          -- 'gemini' | 'openai' | 'xai'
  api_key_secret   text NOT NULL,
  context_limit    int NOT NULL,           -- token ceiling
  is_active        boolean NOT NULL DEFAULT true,
  notes            text,
  created_at       timestamptz NOT NULL DEFAULT now()
);
```

**Rules keyed on `role_code`** (existing table restructured):

```sql
-- c.external_reviewer_rule gains role_code column; reviewer_key column deprecated
ALTER TABLE c.external_reviewer_rule ADD COLUMN role_code text REFERENCES c.external_reviewer_role(role_code);
-- Backfill from existing reviewer_key values
-- Drop reviewer_key column once backfilled
```

**New table — `m.external_review_job`** (the invocations):

```sql
CREATE TABLE m.external_review_job (
  job_id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  role_code          text NOT NULL REFERENCES c.external_reviewer_role(role_code),
  model_code         text NOT NULL REFERENCES c.external_reviewer_model(model_code),
  target_type        text NOT NULL,       -- 'single_commit' | 'commit_range' | 'time_window' | 'document'
  target_refs        jsonb NOT NULL,      -- {shas: [...]} or {from: sha, to: sha} or {start: ts, end: ts} or {path: '...'}
  triggered_by       text NOT NULL,       -- 'webhook' | 'cron' | 'dashboard_ondemand' | 'api'
  triggered_by_user  text,
  status             text NOT NULL DEFAULT 'queued',  -- 'queued' | 'running' | 'succeeded' | 'failed'
  findings_queue_ids uuid[] DEFAULT ARRAY[]::uuid[],  -- FK to external_review_queue rows
  tokens_input       int,
  tokens_output      int,
  cost_usd           numeric(10,6),
  error              text,
  started_at         timestamptz,
  completed_at       timestamptz,
  created_at         timestamptz NOT NULL DEFAULT now()
);
```

Existing `m.external_review_queue` retained. One row per role×model×commit finding, as today. Joins to `m.external_review_job` via `job_id`.

### Edge Function changes

`external-reviewer` refactored to accept an explicit `{role_code, model_code, target}` at invocation. Webhooks configure a default fan-out (e.g. "fire strategist + engineer + risk on every qualifying commit"). On-demand calls specify their own role × model × target combination.

### Dashboard additions

- Role library page — view/edit roles, view/edit rules per role
- Invocation page — "run role X with model Y against target Z" as an explicit form
- Findings feed — filter by role, model, target, severity

### Outcome tagging (fold into this build)

`m.external_review_finding_outcome` table — valid / noise / debatable per finding, tagged by PK reading the digest. Four columns: `finding_id`, `outcome`, `note`, `tagged_at`. Dashboard buttons on each finding. Over 30-50 tagged findings, patterns emerge: which role × model combinations have high valid rates, which produce noise, which catch things others miss. This is the evaluation substrate that makes rotation decisions informed rather than gut-feel.

---

## Gate for execution

Do NOT execute this brief until BOTH of these are true:

1. **At least 2 weekly digests of real output** from the current three-voice layer (not counting retroactive reviews). The purpose: prove the simpler architecture produces useful findings before building a more complex one.
2. **At least one concrete use case for a role not currently in the library.** "We will eventually want Salesman" is not concrete. "I am planning the first pilot conversation in 2 weeks and want to run Salesman against the current pilot agreement draft across all three models before sending" is concrete.

Both conditions protect against building architecture for hypothetical needs.

---

## What NOT to do between now and execution

- **Do not start the refactor incrementally.** A half-migrated schema is worse than today's simpler schema. Execute in one sprint or not at all.
- **Do not add roles to the current `c.external_reviewer` table without the library architecture.** It would mean editing the refactor target mid-flight.
- **Do not build a role on the side as a one-off.** If a role is worth building, it's worth building in the library. If it's not worth the library build cost, the role isn't worth building yet.

---

## What IS fine to do in the meantime

- **Rotate existing role → model assignments by SQL** as D160 permits. `UPDATE c.external_reviewer SET model = 'X' WHERE reviewer_key = 'Y'` is free and reversible. If curious whether Gemini performs better as Engineer than as Strategist, rotate and see.
- **Write new roles as prompt drafts in `docs/briefs/draft-roles/`** without wiring them to anything. Useful prep for when the library exists.
- **Pause reviewers in DB** (`is_active = false`) to reduce the three-voice output if it produces too much noise. Reversible.

---

## Cost forecast for the refactor

Build time estimate: 1-2 days of focused Claude Code work after the gate criteria are met. Infrastructure cost change: minimal — same models, same providers, same prompt caching. Potentially slight increase if PK runs many ad-hoc invocations on long commit ranges.

Execution risk: the refactor touches the only external-review system in production. A careful migration plan matters. Recommended sequence when executing:

1. Add new tables alongside existing (no schema break yet)
2. Write new EF version that accepts role/model/target explicitly
3. Shadow-run: webhook fans out to new system in parallel with old, compare outputs for 1 week
4. Cut over weekly cron to new system
5. Deprecate old table/EF after 1 week of clean operation

---

## Open design questions (to resolve at execution, not now)

- **How granular should "target" be?** Single commit vs commit range vs time window is clear. Should also support "target = specific file" or "target = specific PR"? Probably yes.
- **Should ad-hoc invocations count against the D157 cost budget?** Probably yes, with a separate budget line. Watch for pattern: PK triggering ad-hoc reviews during anxiety spikes rather than for genuine need.
- **Should outcome tags feed back into reviewer calibration?** E.g. if Gemini-as-Engineer has 30% valid rate and Gemini-as-Strategist has 70%, should the system suggest rotation? Probably display the stats, not auto-suggest.
- **Weekly digest stays or becomes optional?** If ad-hoc invocation is the primary surface, the weekly digest might become redundant. Probably keep it as a passive "here's what happened this week" check-in.

---

*End of brief. Parked. Revisit when gate conditions are met.*
