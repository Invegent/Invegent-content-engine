# Brief — External Reviewer Layer (Approach C)

**Date:** 2026-04-21
**Target repos:** `Invegent-content-engine` (EFs, migrations) + `invegent-dashboard` (on-demand button only)
**Owner:** PK
**Executor:** Claude Code
**Decision source:** D156 (external epistemic diversity layer), pulled forward from Mon 27 Apr
**Prior discussion:** session of 21 Apr 2026 — reframed from internal-pipeline-guardrails to outside-looking-in review of Claude's build work

---

## Purpose

Every commit Claude makes to `Invegent-content-engine` or `invegent-dashboard` gets reviewed by two external AI models (Gemini 2.5 Pro + GPT-4.1) with **full repo context**. Findings are collected in a DB queue, summarised into a weekly digest, emailed to PK, and committed to `docs/reviews/` so Claude reads them at next session start.

**Purpose in one sentence:** break the Claude-only development loop by putting two independent AI voices on every commit, with enough context to form substantive views.

**Explicitly NOT in scope:** internal pipeline guardrails (that was the previous framing). This layer does not replace unit tests, does not gate commits, does not catch runtime bugs in the signal pipeline. It is a strategic + architectural second opinion on the build work itself.

---

## Architecture decision — Approach C (locked)

The session-of-21-Apr discussion considered four approaches:

- **A. Diff-only review** — rejected, too little context
- **B. Full repo, every review, no caching** — rejected, ~$170-400/month
- **C. Full repo with prompt caching** — **SELECTED**, ~$30-50/month realistic
- **D. ChatGPT/Gemini workspace UIs (manual paste)** — rejected, not autonomous enough given the discipline failure mode

**Why C over RAG (pgvector-based retrieval):** ICE repo fits inside Gemini 2.5 Pro's 2M context window (currently 400-700k tokens). The entire problem RAG solves — repo too big for context — does not apply here. RAG adds silent failure modes (retrieval misses, chunking drift, re-indexing staleness) that undermine the reviewer's purpose. RAG is documented as a **planned future investment, not mandatory** — revisit in 12-18 months if repo growth pushes past 1.5M tokens OR if other use cases (natural language repo search, dashboard context panels, client portal memory) justify it in their own right.

**Consequence:** every review sees every file, every decision, every incident, every brief. No retrieval step to fail silently.

---

## The three reviewers

| Role | Model | Provider | Context window | Prompt | Fires on |
|---|---|---|---|---|---|
| **Strategist** | Gemini 2.5 Pro | Google | Full repo (500k–700k tokens) | "Is this the right thing to be building? Is the direction defensible?" | Every qualifying commit to main |
| **Engineer Reviewer** | GPT-4o | OpenAI | Focused commit context (~100k tokens) | "Does this implementation match the brief? Any over-engineering? Missing simplification?" | Every qualifying commit to main |
| **Risk Reviewer** | Grok 4.1 Fast Reasoning | xAI | Full repo | "What breaks? What silently succeeds without working? What is this quietly assuming?" | Every qualifying commit to main |

Three distinct voices, three distinct providers. No one vendor sees the whole review surface alone. All are advisory. None gate commits. All write to the same queue table. All outputs surface in the same weekly digest and the same on-demand digest.

**Why three voices, not two.** The original brief specified two. First-week testing surfaced that the most painful failures in April 2026 (D155 7-day silent stall, ID003 silent cost loop, three silent failures in one day) were not "wrong direction" and not "poor implementation" — they were **silent failures in the gap between what the code said it did and what actually happened**. Neither Strategist nor Engineer is naturally oriented to look for that. A dedicated adversarial lens is. Added 2026-04-21.

**Context split rationale.** Strategist and Risk get full repo — direction lens wants scope, adversarial lens needs to see cross-file interactions (silent failures often hide in upstream/downstream coupling the commit doesn't touch). Engineer gets focused ~100k — code review is about the commit and its immediate context; also OpenAI's default org TPM (30k) forces this. When OpenAI tier is bumped, Engineer stays on focused context by design, not workaround.

**Engineer Reviewer focused-context priority order (from top, fill ~400k chars / ~100k tokens):**
1. Commit diff + full post-change state of files the commit touched
2. Briefs in `docs/briefs/` referenced in commit message or sharing a date prefix with changed files
3. `docs/06_decisions.md` entries dated in the last 30 days (fallback: last 200 lines)
4. `docs/00_sync_state.md` (current snapshot)
5. Last 10 commit messages from same repo preceding this one
6. Top-up remaining budget with `docs/15_pre_post_sales_criteria.md` + `docs/03_blueprint.md`

If the budget is exhausted before item 6, the most relevant material is already included — by design.

---

## Qualifying commits — path filter

The reviewer fires when the commit touches ANY of:

- `supabase/functions/**/*.ts`
- `supabase/migrations/**/*.sql`
- `docs/briefs/**/*.md`
- `docs/06_decisions.md`
- `docs/incidents/**/*.md`
- `docs/15_pre_post_sales_criteria.md`
- `docs/04_phases.md`
- `docs/03_blueprint.md`
- `docs/05_risks.md`
- `docs/07_business_context.md`
- `app/**/*.ts` (invegent-dashboard repo, invegent-portal repo)
- `app/**/*.tsx`

**Explicitly does NOT fire on:**
- `README.md` edits
- `.gitignore` changes
- Typo-only commits to existing docs (harder to detect automatically — accept that some noise will slip through)
- Package lock file updates
- Commits to non-main branches

**Rationale:** the reviewer costs real money per call. Firing on every commit including typos would 3-5x the bill.

---

## Database schema

### New tables (migration name: `d156_external_reviewer_layer`)

```sql
-- The reviewers themselves. Two rows to start.
CREATE TABLE c.external_reviewer (
  reviewer_key      text PRIMARY KEY,           -- 'strategist' | 'engineer'
  display_name      text NOT NULL,              -- 'Strategist' | 'Engineer Reviewer'
  provider          text NOT NULL,              -- 'gemini' | 'openai'
  model             text NOT NULL,              -- 'gemini-2.5-pro' | 'gpt-4.1'
  api_key_secret    text NOT NULL,              -- 'ICE_GEMINI_API_KEY' | 'OPENAI_API_KEY'
  system_prompt     text NOT NULL,              -- full voice + schema, assembled with rules at runtime
  is_active         boolean NOT NULL DEFAULT true,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);

-- The rules each reviewer checks against. ~8 per reviewer.
CREATE TABLE c.external_reviewer_rule (
  rule_id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reviewer_key      text NOT NULL REFERENCES c.external_reviewer(reviewer_key),
  rule_key          text NOT NULL,              -- snake_case identifier
  rule_text         text NOT NULL,              -- the instruction
  category          text NOT NULL,              -- 'direction' | 'scope' | 'cost' | 'reversibility' | 'brief_alignment' | 'complexity' | 'simplification' | 'verification'
  example_good      text,
  example_bad       text,
  is_active         boolean NOT NULL DEFAULT true,
  sort_order        int NOT NULL DEFAULT 0,
  created_at        timestamptz NOT NULL DEFAULT now(),
  UNIQUE (reviewer_key, rule_key)
);

-- Every review finding. One row per reviewer per commit.
CREATE TABLE m.external_review_queue (
  review_id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reviewer_key         text NOT NULL REFERENCES c.external_reviewer(reviewer_key),
  commit_sha           text NOT NULL,                  -- full SHA
  commit_repo          text NOT NULL,                  -- 'Invegent-content-engine' | 'invegent-dashboard' | 'invegent-portal'
  commit_message       text,
  commit_author        text,
  commit_timestamp     timestamptz,
  severity             text NOT NULL,                  -- 'info' | 'warn' | 'critical'
  finding_summary      text NOT NULL,                  -- <= 200 chars
  finding_detail       text NOT NULL,                  -- full reasoning
  referenced_rules     text[] DEFAULT ARRAY[]::text[], -- rule_keys that fired
  referenced_artifacts text[] DEFAULT ARRAY[]::text[], -- 'D155', 'ID003', 'A27', 'brief_043' etc.
  tokens_input         int,
  tokens_output        int,
  cost_usd             numeric(10,6),
  cache_hit            boolean NOT NULL DEFAULT false,
  is_read              boolean NOT NULL DEFAULT false,
  read_at              timestamptz,
  action_taken         text,                            -- filled before dismiss
  included_in_digest   uuid,                            -- FK to digest once assembled
  created_at           timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_review_queue_unread ON m.external_review_queue (is_read, created_at DESC);
CREATE INDEX idx_review_queue_commit ON m.external_review_queue (commit_sha);

-- Digest runs. One row per digest produced (weekly cron OR on-demand).
CREATE TABLE m.external_review_digest (
  digest_id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trigger_type      text NOT NULL,                -- 'weekly_cron' | 'on_demand'
  triggered_by      text,                         -- null for cron, 'pk@invegent.com' for manual
  window_start      timestamptz NOT NULL,         -- since previous digest's window_end
  window_end        timestamptz NOT NULL,
  commits_reviewed  int NOT NULL DEFAULT 0,
  findings_total    int NOT NULL DEFAULT 0,
  findings_critical int NOT NULL DEFAULT 0,
  findings_warn     int NOT NULL DEFAULT 0,
  findings_info     int NOT NULL DEFAULT 0,
  github_file_path  text,                         -- docs/reviews/2026-04-28-weekly-digest.md
  github_commit_sha text,                         -- commit that wrote the digest file
  email_sent_at     timestamptz,
  email_resend_id   text,                         -- Resend message ID
  status            text NOT NULL DEFAULT 'running',  -- 'running' | 'succeeded' | 'failed'
  error             text,
  created_at        timestamptz NOT NULL DEFAULT now()
);
```

### Seed data — reviewers

Two rows in `c.external_reviewer`:

**Row 1: Strategist (Gemini 2.5 Pro)**

`system_prompt` template (rules appended at runtime):

```
You are the STRATEGIST for the Invegent Content Engine (ICE). Your role is to
review code commits from an outside-in strategic perspective. You read the full
repository context on every call, including all briefs, decisions, incidents,
and sync_state.

Your voice: direct, brief, sceptical of work that looks busy but doesn't move
toward committed priorities. You are PK's second opinion when Claude (the
executing AI) has been the only voice. You are not a cheerleader.

Your job is to answer four questions for every commit:

1. DIRECTION — is this work advancing a committed priority (pre-sales gate,
   PK's personal businesses, Phase 3 expansion) or is it a tangent?
2. SCOPE — does this commit match the brief that motivated it, or has it
   crept?
3. COST — does this make ICE more expensive to operate long-term?
4. REVERSIBILITY — is this decision easy to reverse if wrong, or a one-way
   door?

Output schema (JSON only, no prose around it):

{
  "overall_severity": "info" | "warn" | "critical",
  "summary": "<= 200 char one-liner capturing the headline finding",
  "detail": "200-800 word reasoning covering direction, scope, cost, reversibility",
  "referenced_rules": ["rule_key", ...],
  "referenced_artifacts": ["D155", "ID003", "A27", "brief_043", ...]
}

severity calibration:
- info: commit is aligned, no concern
- warn: worth PK's attention, not urgent
- critical: work appears to contradict a prior decision, introduce substantial cost,
  or create a one-way door that PK probably hasn't considered

If the commit is genuinely fine, say so plainly. Do NOT invent concerns to
justify your existence. An info finding of "aligned with D157, matches brief
043, sensible" is valuable and honest. Your job is signal, not volume.

RULES YOU MUST APPLY: {rules block injected here}

COMMIT UNDER REVIEW: {commit context injected here}

FULL REPOSITORY CONTEXT: {repo blob injected here, cached across calls}
```

**Row 2: Engineer Reviewer (GPT-4.1)**

`system_prompt` template:

```
You are the ENGINEER REVIEWER for the Invegent Content Engine (ICE). Your
role is to review code commits for implementation quality. You read the full
repository context on every call, including all briefs that motivated the work.

Your voice: direct, pragmatic, sceptical of complexity. You are PK's second
opinion on whether Claude (the executing AI) has over-engineered, under-tested,
or missed a simpler approach. You are not a code linter — you do not flag
style issues. You are an architectural reviewer who reads code like a senior
engineer reviewing a pull request from a competent junior.

Your job is to answer four questions for every commit:

1. BRIEF ALIGNMENT — if a brief exists for this work, does the code implement
   what the brief specified? Missing pieces? Extra pieces?
2. OVER-ENGINEERING — is there complexity not justified by the brief?
3. SIMPLIFICATION — is there a materially simpler approach the author missed?
4. VERIFICATION — how will we know if this is correct? If there is no test,
   no manual verification step, no way to detect a regression, flag it.

Output schema (JSON only, no prose around it):

{
  "overall_severity": "info" | "warn" | "critical",
  "summary": "<= 200 char one-liner capturing the headline finding",
  "detail": "200-800 word reasoning covering brief alignment, over-engineering, simplification, verification",
  "referenced_rules": ["rule_key", ...],
  "referenced_artifacts": ["D155", "ID003", "brief_043", "file:path/to/file.ts", ...]
}

severity calibration:
- info: implementation matches brief, reasonable complexity, verifiable
- warn: minor scope creep, some unjustified complexity, or a clear missing verification
- critical: substantial divergence from brief, or a missing verification on something
  that handles money/clients/publishing

If the commit is genuinely fine, say so plainly. "Matches brief, reasonable
scope, verifiable via X" is valuable and honest.

RULES YOU MUST APPLY: {rules block injected here}

COMMIT UNDER REVIEW: {commit context injected here}

FULL REPOSITORY CONTEXT: {repo blob injected here, cached across calls}
```

### Seed data — rules (8 total, 4 per reviewer)

**Strategist rules:**

| rule_key | category | rule_text |
|---|---|---|
| `direction_check` | direction | Every commit should visibly advance one of the committed priorities: pre-sales gate closure (docs/15), PK personal businesses (Care for Welfare, Property Pulse, NDIS Yarns), Phase 3 expansion, or structural safety (cost guardrails, monitoring, external review). Flag commits that appear orthogonal to all of these. |
| `scope_check` | scope | If the commit references a brief (via commit message or docs/briefs/), compare scope. Flag if commit does materially more or less than the brief specified without explanation in the commit message. |
| `cost_check` | cost | Flag commits that add recurring costs (new SaaS subscriptions, new API-calling Edge Functions, new cron jobs running frequently) without the cost being documented in k.subscription_register or discussed in a decision. |
| `reversibility_check` | reversibility | Flag commits that create one-way doors: schema migrations that drop columns, decisions that lock vendor choices, public commitments (client communications, published content) that can't be retracted. Warn when a lower-commitment alternative exists. |

**Engineer Reviewer rules:**

| rule_key | category | rule_text |
|---|---|---|
| `brief_alignment` | brief_alignment | If a brief exists (docs/briefs/), the commit should implement what the brief specified. Flag missing pieces AND unexplained additions. Extra pieces are often scope creep; missing pieces are often forgotten requirements. |
| `over_engineering_check` | complexity | Flag complexity not justified by the brief: new abstractions used once, configuration for non-existent use cases, layers of indirection where a direct call would work. The reference heuristic: "could this be deleted without the brief's requirements being violated?" If yes, it's over-engineering. |
| `simpler_approach` | simplification | Flag cases where a materially simpler implementation exists. Examples: custom cron logic where pg_cron already provides what's needed; custom SQL where an existing RPC exists; new Edge Function where an existing one could be extended. |
| `verification_path` | verification | Every commit that changes production behaviour should have a verification path: a query to run, a file to check, a dashboard panel, a log line to grep. Flag commits where there is no stated way to know the change worked. |

---

## The review Edge Function — `external-reviewer`

**File:** `supabase/functions/external-reviewer/index.ts`
**Invocation:** GitHub webhook (POST from GitHub on commit to main)
**Auth:** webhook secret in header `x-hub-signature-256` (GitHub's standard HMAC)

**Flow per invocation:**

1. **Receive webhook payload.** Parse commit SHA, repo name, author, message, changed files.

2. **Path filter.** Check `changed_files` against the qualifying path filter above. If no qualifying path touched, return 200 with `{skipped: true, reason: 'no_qualifying_paths'}`. Do not call any LLM.

3. **Fetch full repo blob.** Use GitHub API to fetch tarball of the repo at this commit SHA. Decompress. Concatenate all relevant text files into a single blob. Relevant = `.ts`, `.tsx`, `.sql`, `.md`, `.json` (config only, not lock files). Exclude `node_modules`, `.next`, `.vercel`, lockfiles. Expected size: 400-700k tokens currently. Include a header that lists total file count and total char count so the model knows the scope.

4. **Fetch commit diff.** GitHub API `/repos/{owner}/{repo}/commits/{sha}` gives patches.

5. **For each active reviewer in `c.external_reviewer`:**
   a. Load active rules from `c.external_reviewer_rule` where `reviewer_key = <this reviewer>`
   b. Assemble the full system prompt with rules injected + commit context + full repo blob
   c. Call the appropriate provider (Gemini or OpenAI) with caching enabled:
      - **Gemini:** use `Content Caching` API. On first call within cache TTL, create cached content with the repo blob. Subsequent calls within ~1h reuse cache at 25% cost.
      - **OpenAI:** use automatic prompt caching. Ensure the repo blob appears at the start of the prompt, with the commit-specific context at the end. OpenAI caches the first ~1024+ tokens automatically when identical prefixes are seen.
   d. Parse JSON response
   e. Insert row into `m.external_review_queue` with all fields populated
   f. Log cost to `m.ai_usage_log` with `content_type = 'external_review'`

6. **Return** `{ok: true, commit_sha, reviews: [...summaries]}`

**Error handling:**
- If GitHub API fails to fetch repo → log + return 500 + no DB writes (digest will notice the gap next run)
- If one reviewer fails but the other succeeds → write the successful one, log the failure
- If both fail → write error rows to `m.external_review_queue` with `severity='critical'` and `summary='reviewer_error: <details>'`. PK sees these in the digest.

**Explicit non-requirements:**
- No retry logic. If a review fails, it stays failed. The weekly digest will surface the gap.
- No idempotency guard in this EF (unlike ai-worker). If GitHub retries the webhook, we get duplicate reviews. Acceptable cost given the low frequency and the value of never missing a commit.

---

## The digest Edge Function — `external-reviewer-digest`

**File:** `supabase/functions/external-reviewer-digest/index.ts`
**Invocation modes:**
1. **Weekly cron** — `external-reviewer-digest-weekly` at Monday 7am AEST (UTC+10 / +11 depending on DST). Cron command: `SELECT net.http_post(url := '...external-reviewer-digest', body := '{"trigger_type": "weekly_cron"}');`
2. **On-demand** — POST request with body `{"trigger_type": "on_demand", "triggered_by": "<pk email>"}`

**Flow per invocation:**

1. **Determine window.** Window start = `MAX(window_end) FROM m.external_review_digest WHERE status = 'succeeded'` (or repo-creation-date for first run). Window end = `now()`. If window contains zero unreviewed commits → short-circuit, return `{skipped: true, reason: 'no_new_findings'}` without creating a digest row.

2. **Insert `m.external_review_digest` row** with `status='running'`.

3. **Query findings** from `m.external_review_queue` where `created_at BETWEEN window_start AND window_end AND included_in_digest IS NULL`.

4. **Assemble markdown.** Structure:

```markdown
# ICE External Review Digest — {YYYY-MM-DD}

**Trigger:** {weekly_cron | on_demand}
**Window:** {window_start} to {window_end}
**Commits reviewed:** {N}
**Findings:** {total} total ({critical} critical, {warn} warn, {info} info)
**Cost:** ${sum}

---

## Critical findings

{for each critical finding, sorted by commit_timestamp DESC:
### [{reviewer}] {commit_sha[:7]} — {finding_summary}

{finding_detail}

Referenced: {referenced_artifacts as comma-separated list}
Rule(s): {referenced_rules as comma-separated list}
Commit: [{commit_sha[:7]}](github.com/Invegent/{repo}/commit/{sha}) — {commit_message}
}

---

## Warnings

{same structure, warn severity}

---

## Informational

{for info, just one-liners per commit:
- [{reviewer}] {commit_sha[:7]}: {finding_summary}
}

---

## This week's commits under review

{table of commit_sha, author, message, reviewers that covered it}

---

## Notes for next session

{automatically generated — list of unread critical + warn findings from THIS digest for Claude to pick up}
```

5. **Commit markdown to GitHub** at `docs/reviews/YYYY-MM-DD-digest.md` in `Invegent-content-engine`. Commit message: `docs: external review digest {YYYY-MM-DD} ({trigger_type})`. Use GitHub API (same auth pattern as the existing GitHub MCP — service account PAT in secret).

6. **Send email via Resend** to `pk@invegent.com`. Subject: `ICE Review Digest — {YYYY-MM-DD} — {critical_count} critical, {warn_count} warn`. Body: the markdown rendered to simple HTML (Resend handles this natively from markdown).

7. **Update `m.external_review_queue`** — set `included_in_digest = <digest_id>` for all findings covered.

8. **Update `m.external_review_digest`** — set `status='succeeded'`, populate all counts, `github_file_path`, `github_commit_sha`, `email_sent_at`, `email_resend_id`.

9. **Return** summary.

**Cost tracking:** digest EF itself has zero LLM calls. All the cost was already incurred in the individual review EF runs. The digest aggregates and reports.

---

## On-demand trigger — dashboard button

**File:** `app/(dashboard)/roadmap/page.tsx` or new `app/(dashboard)/reviews/page.tsx`
**My recommendation:** new page `/reviews` — keeps concerns separated, allows future expansion of review-related UI.

**Minimal first version** — just the button, nothing else. Future versions add a findings list, drill-downs, etc.

```tsx
// app/(dashboard)/reviews/page.tsx — minimal
"use client";
import { useState } from 'react';

export default function ReviewsPage() {
  const [status, setStatus] = useState<'idle' | 'running' | 'done' | 'error'>('idle');
  const [result, setResult] = useState<string | null>(null);

  async function runDigest() {
    setStatus('running');
    setResult(null);
    try {
      const r = await fetch('/api/run-digest', { method: 'POST' });
      const d = await r.json();
      if (d.ok) {
        setStatus('done');
        setResult(d.skipped
          ? 'No new findings since last digest.'
          : `Digest sent to pk@invegent.com. Covered ${d.commits_reviewed} commits, ${d.findings_total} findings.`);
      } else {
        setStatus('error');
        setResult(d.error ?? 'Unknown error');
      }
    } catch (e: any) {
      setStatus('error');
      setResult(e?.message ?? 'Fetch failed');
    }
  }

  return (
    <div className="p-6 max-w-2xl space-y-6">
      <div>
        <h1 className="text-xl font-bold text-slate-900 dark:text-white">External Reviews</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          Weekly digest runs Mon 7am AEST. Use this button to trigger a digest on-demand.
        </p>
      </div>

      <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6">
        <button
          onClick={runDigest}
          disabled={status === 'running'}
          className="px-4 py-2 rounded-lg bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-sm font-medium disabled:opacity-50"
        >
          {status === 'running' ? 'Running…' : 'Run digest now'}
        </button>
        {result && (
          <p className={`mt-4 text-sm ${status === 'error' ? 'text-red-600' : 'text-slate-600 dark:text-slate-400'}`}>
            {result}
          </p>
        )}
      </div>
    </div>
  );
}
```

**Next.js API route** — `app/api/run-digest/route.ts`:

```ts
export async function POST() {
  const resp = await fetch(
    `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/external-reviewer-digest`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
      },
      body: JSON.stringify({
        trigger_type: 'on_demand',
        triggered_by: 'pk@invegent.com',
      }),
    }
  );
  const data = await resp.json();
  return Response.json(data);
}
```

**Sidebar link:** add "Reviews" to the left sidebar in `invegent-dashboard` so PK can find it.

---

## Secrets required

Supabase Edge Function secrets that must be set before deploy:

| Secret name | Purpose | Status |
|---|---|---|
| `ICE_GEMINI_API_KEY` | Strategist calls | ✅ set per PK screenshot 21 Apr |
| `OPENAI_API_KEY` | Engineer Reviewer calls | ✅ already exists (ai-worker fallback) |
| `GITHUB_PAT_INVEGENT` | Fetch repo tarball + commit digest files | Needs confirmation — check if already set |
| `GITHUB_WEBHOOK_SECRET` | Verify webhook HMAC | Needs creation — random 32-byte hex |
| `RESEND_API_KEY` | Send digest email | ✅ already exists (verified for transactional) |

---

## GitHub webhook setup

Both `Invegent-content-engine` and `invegent-dashboard` need a webhook configured. Manual step for PK (GitHub UI doesn't like automated webhook creation without OAuth app setup):

1. Go to each repo → Settings → Webhooks → Add webhook
2. Payload URL: `https://mbkmaxqhsohbtwsqolns.supabase.co/functions/v1/external-reviewer`
3. Content type: `application/json`
4. Secret: the value of `GITHUB_WEBHOOK_SECRET`
5. Events: "Just the push event"
6. Active: ✅

**Note:** `invegent-portal` webhook optional for now. Portal changes are less architecturally significant than dashboard and backend.

---

## Build order (rebased for Tue 21 Apr)

| Day | Task | Repo | Notes |
|---|---|---|---|
| **Today / Wed 22 Apr** | Apply migration `d156_external_reviewer_layer`. Seed reviewers + rules. | Invegent-content-engine | DB-only, zero LLM cost to verify |
| **Wed 22 Apr** | Build `external-reviewer` Edge Function. Test manually via curl with a known commit SHA. | Invegent-content-engine | First real reviews: retroactive on `d12a52c` (ai-worker v2.9.0) + `202037c` (roadmap) |
| **Thu 23 Apr** | Build `external-reviewer-digest` Edge Function + cron + Resend integration | Invegent-content-engine | Verify digest writes to GitHub + email arrives |
| **Thu 23 Apr** | Build dashboard Reviews page + on-demand button + API route | invegent-dashboard | Minimal, ~1 hour |
| **Thu 23 Apr evening** | Configure webhooks on both repos. First live reviews. | GitHub UI | PK-manual step |
| **Fri 24 Apr** | Monitor, read first digest, tune rules based on what the reviewers actually flag | — | Real-world calibration. Add rules or relax them as needed. |

---

## Acceptance criteria

- [ ] Migration applied, 2 reviewers + 8 rules seeded
- [ ] `external-reviewer` EF deployed, callable via GitHub webhook
- [ ] Retroactive review of `d12a52c` (ai-worker v2.9.0) completes — both reviewers write findings to queue
- [ ] Retroactive review of `202037c` (roadmap three-tab) completes
- [ ] `external-reviewer-digest` EF deployed, manually callable via POST
- [ ] On-demand run creates digest row, writes GitHub file, sends email
- [ ] Weekly cron scheduled (Mon 7am AEST)
- [ ] Dashboard /reviews page deployed, button works
- [ ] Webhooks configured on both `Invegent-content-engine` and `invegent-dashboard`
- [ ] First live review fires on a real commit (not retroactive) and lands in queue within 2 minutes
- [ ] First email received by pk@invegent.com
- [ ] First digest file committed to `docs/reviews/YYYY-MM-DD-digest.md`

---

## Ongoing operation — what PK should expect

**Costs:** $30-50/month realistic given current commit volume. Cached calls dominate; cache misses on weekend/overnight single-commits drive the variance. Tracked in `m.ai_usage_log` with `content_type='external_review'` so the D157 AI Costs panel can report it.

**Read cadence:** weekly email Monday 7am. Expect 1,500-3,000 words. If you want to read findings mid-week, hit the on-demand button — it only produces output if there's unreviewed material since the last digest.

**Rule tuning:** first 4 weeks, expect to add/remove/rewrite ~2-4 rules per reviewer as you see what they flag vs miss. Rules are in DB, editable without redeploy.

**Failure mode to watch for:** reviewer generates noise (lots of info-severity findings that don't help). Fix: tighten the severity calibration in the system prompt, or add a "suppress info-only findings from digest" rule. Pattern to watch: reviewer generating useful findings that PK doesn't read. Fix: reduce digest volume by raising severity thresholds, NOT by reading less.

**First-week success metric:** did either reviewer flag something on `d12a52c` that PK agreed was a real concern? If yes, pattern validated. If no, both reviewers are useless for the purpose. We'd need to fix the system prompt before going further.

---

## Future investments (deliberately NOT in this spec)

- **RAG via pgvector** — if repo grows past 1.5M tokens OR if dashboard needs semantic context, build then. Not before. (See session-of-21-Apr discussion.)
- **Third reviewer (Pattern Watcher)** — earliest at week 6 when there's enough history to justify it.
- **Per-commit email instead of weekly digest** — only if PK finds the weekly cadence too slow. Default assumption is weekly is right.
- **Rules editor in dashboard** — DB-only for now. Add UI only if PK is editing rules frequently enough that DB access is annoying.
- **Cross-repo reviews** (e.g. flag when a dashboard commit should have had a matching backend commit) — interesting but premature.

---

*End of brief. PK to confirm path (reviews page location), then Claude Code can execute.*
