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

## ADDENDUM — Consumption Model (21 Apr evening)

**Context:** This addendum was added after the first v1.0.2 + prompt v2 system audit run. The findings from the first two audits were all items already present in `sync_state.md`'s Watch List — not novel, not missed-by-Claude. PK initially asked whether the external layer was worth keeping. The conversation surfaced a clearer value prop that the original brief had not articulated, and one missing infrastructure piece.

### The honest data point after 2 runs

- System audit v1.0.1 (05:21Z) produced 4 findings — one spurious (stale doc), three already in Watch List.
- System audit v1.0.2 (07:30Z) produced 4 findings — all four real and actionable, but all four also already in Watch List.
- Per-commit Risk Reviewer (Grok) has produced ~4 concerns across the day's commits — all framings Claude could plausibly have arrived at unprompted.
- Total spend to date across the layer: ~$8. Total findings Claude-wouldn't-have-surfaced: **0**.

This is preserved here as an honest record. The conclusion is NOT that the layer is useless — it's that the initial framing ("insurance against Claude blind spots") was too narrow and too binary. The reframe below is what makes the architecture worth building.

### The reframe PK articulated (preserved verbatim)

> "every night, the work that we have done for the day gets evaluated by this cron jobs. And in night in the morning time when we are convening to work back on it, then we take all this feedback in consideration. And keep working through that and the new day task. So then the less scope of making any mistakes. And the future more we proceed with it, the better the system becomes and the clearer pipeline becomes."

This is **not** insurance against a catastrophic blind spot. It's a **continuous overnight feedback loop** that preps the morning session. The value compounds over time, not per-incident. The correct evaluation horizon is 3+ months of accumulated learning, not 2 audits.

### Architectural implications

**1. Storage: Supabase table, not email.**

Rejected pattern: findings arrive as email. PK has to triage them. They become another inbox task competing for morning attention.

Accepted pattern: findings write to `m.external_review_queue` (already built). The row persists indefinitely with full finding_detail as TEXT. PostgreSQL TEXT has no practical size limit (up to 1GB per value). Zero storage concern even at 9 roles × 2,000 words nightly.

Already shipped — no additional work required.

**2. Reading surface: morning digest committed to the repo.**

Risk identified: 5–9 roles running nightly produce 10,000–15,000 words of reviewer output. If every morning starts with reading 9 markdown bodies from the DB, that's 20+ minutes of meta-reading before real work begins. That friction would eventually kill the ritual.

Solution: a **consolidation digest role**. Runs last in the overnight chain (say 5am AEST after all other roles complete). Reads all the night's other role outputs from `m.external_review_queue`. Produces a single morning-ready markdown file:

```
docs/reviews/YYYY-MM-DD-overnight.md

## Must-action today
(1–3 items, if any)

## Worth knowing
(context but not blocking)

## Full reviewer outputs
- [Strategist / Gemini]: link to m.external_review_queue row
- [Engineer / GPT-4o]: link to m.external_review_queue row
- ... etc
```

File gets committed to the repo automatically by the consolidation EF. Session-start protocol extends from "read sync_state" to "read sync_state + today's overnight digest." One new file to read, maximum 500 words. Full reviewer outputs remain drillable in the queue for anything that looks worth investigating.

Schema implication: one more role in the library (`morning_digest`) with `default_context = 'previous_night_findings'`. No new tables needed.

**3. Role × task composition: flat library, not a separate task-templates table.**

PK raised a third dimension during the conversation: "roles × analytical tasks." Risk assessment, impact analysis, compliance review, pilot pitch rehearsal, objection analysis — these are task-templates that any role could theoretically apply.

Tempting design: a third table for task templates, joined to roles. Rejected. Two reasons:

1. It multiplies combinatorial complexity without clear payoff — a "Sales Advisor running Pilot Pitch Rehearsal" is behaviourally different from "Sales Advisor running Objection Analysis," not just the same role wearing a different hat.
2. Roles-as-distinct-rows are cheaper to iterate. Want a new role/task combo? Insert a row. Want to deprecate? Flip `is_active`.

Keep the library flat. One row per (persona × task) combination. `role_code` values become compound: `sales_pilot_pitch`, `sales_objection_analysis`, `engineering_risk_assessment`, `compliance_ndis_audit`, etc. Prefix discipline provides organization; database structure stays simple.

### Cost tolerance confirmed

PK stated $1–2 per night is acceptable. At full library of 5–9 nightly roles + 1 consolidation digest, at Grok Fast Reasoning pricing with cache hits, realistic range is **$1–3/night = $30–90/month**. Carves out as a separate budget line from the D157 Anthropic cap; not deducted from that $200/month ceiling.

Hard cap at $60/month recommended for first 3 months. If cost trends higher, some roles rotate to weekly cadence instead of nightly.

### Revised kill/keep criterion

Original draft criterion: "kill the layer at 4 weeks if no novel findings." That criterion was binary and tied to a frame (insurance) that doesn't match the value prop.

Revised criterion for when the library is built: **per-role 8-week calibration checkpoint.**

Every 8 weeks, for each role, ask:
- How many findings did this role produce?
- Of those, how many were tagged `valid` via the outcome tagging infrastructure?
- What's the cost per valid finding for this role?
- Is there a pattern of this role catching things other roles miss, or is it redundant with a cheaper role?

Actions at checkpoint:
- Role with 0 valid findings in 8 weeks → **pause** (`is_active = false`), not delete. Preserves the prompt for future revisit.
- Role with high cost per valid finding → swap to cheaper model (Grok instead of Gemini) and re-evaluate.
- Role with high valid rate → increase cadence or expand target scope.

This creates selection pressure toward productive roles without the binary "kill everything" failure mode.

### Morning session protocol (added when library ships)

Current session-start protocol:
1. Read `docs/00_sync_state.md` via GitHub MCP.
2. Pick up where we left off.

Post-library session-start protocol:
1. Read `docs/00_sync_state.md`.
2. Read `docs/reviews/YYYY-MM-DD-overnight.md` (today's digest). If empty / no file, skip.
3. Factor any "Must-action today" items into session planning.
4. Pick up where we left off.

This addition is the point of the whole architecture. Without step 2, the overnight findings are just a database of unread analyses. With step 2, the findings shape the day's decisions. The loop closes.

### What this addendum does NOT change

- Gate for execution: unchanged. Still requires (a) 2 weekly digests proving the simpler three-voice layer produces useful findings, (b) one concrete use case for a role not in the library.
- Build order and migration sequence: unchanged.
- The core table design (`c.external_reviewer_role`, `c.external_reviewer_model`, `m.external_review_job`): unchanged.

Addendum additions to the execution checklist:
- [ ] `morning_digest` role seeded in `c.external_reviewer_role` at migration time
- [ ] `consolidation-digest-nightly-5am-aest` pg_cron entry wired after other roles complete
- [ ] Session-start protocol doc updated in `docs/00_sync_state.md` to include step 2
- [ ] Cost budget line for external review layer separated from Anthropic budget

---

*End of brief. Parked. Revisit when gate conditions are met.*
