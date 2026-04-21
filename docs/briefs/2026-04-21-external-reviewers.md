# Brief — External Reviewer Layer (Three-Voice Design, Approach C)

**Date:** 2026-04-21 (revised evening — shipped as three-voice, not two)
**Target repos:** `Invegent-content-engine` (EFs, migrations) + `invegent-dashboard` (on-demand button only)
**Owner:** PK
**Executor:** Claude Code
**Decision source:** D156 (external epistemic diversity layer), pulled forward from Mon 27 Apr
**Implementation decisions:** D158 (Approach C over RAG), D160 (three-voice + role-library deferred)
**Shipping commits:** `495216f` (initial two-voice deploy), `a437a6a` (Risk Reviewer added)

---

## What shipped vs what was originally specified

This brief was originally written mid-morning for a two-voice design (Strategist + Engineer). During the session, two architectural pivots happened:

1. **Engineer Reviewer hit OpenAI Tier 1 TPM ceiling (30k).** Blocked by external account-tier limit, not design. Paused rather than degraded.
2. **Risk Reviewer added as third voice on Grok 4.1 Fast.** PK-driven design change motivated by today's discovery of three silent failures across the system (ID003, CFW schedule save, discovery pipeline ingest bug). Adversarial lens added to complement Strategist (direction) and Engineer (execution quality).

Result: three reviewers in DB, two providers fully active today (Gemini + xAI once credits arrive), one paused (OpenAI pending Tier 2 graduation).

The body of this brief now describes what actually shipped. Historical two-voice framing preserved in commit history.

---

## Purpose

Every qualifying commit to `Invegent-content-engine` or `invegent-dashboard` gets reviewed by up to three external AI models with strong repo context. Findings collect in a DB queue, summarise into a weekly digest, email to PK Mon 7am AEST, and commit to `docs/reviews/` so the next session reads them at startup.

**Purpose in one sentence:** break the Claude-only development loop by putting multiple structurally-independent AI voices on every commit, with enough context to form substantive views.

**Explicitly NOT in scope:** internal pipeline guardrails (D157's job), runtime bug detection in the signal pipeline, commit-gating. This layer is advisory — a strategic + architectural + adversarial second opinion on the build work itself.

---

## The three reviewers

| Role | Lens | Model | Provider | Context | Status |
|---|---|---|---|---|---|
| **Strategist** | "Is this the right thing to build? Defensible direction?" | Gemini 2.5 Pro | Google | Full repo (500k–700k tokens) | ✅ Active |
| **Engineer** | "Does this match the brief? Over-engineered? Missing simplification? Verifiable?" | GPT-4o | OpenAI | Focused commit context (~100k tokens) | ⏸ Paused — OpenAI Tier 1 TPM 30k blocks full-context calls |
| **Risk** | "What breaks? What silently succeeds without working? What is this quietly assuming?" | Grok 4.1 Fast Reasoning | xAI | Full repo | ✅ Active in DB — waiting on xAI credit top-up for first live run |

Three lenses, three providers, three structurally-independent AI cultures. No single vendor sees the full review surface. Rules belong to roles, so rotation between models is a DB-only operation.

**Why three, not two.** The original two-voice design (Strategist + Engineer) was re-evaluated when three silent failures surfaced on 21 Apr across three subsystems — none of which would have been caught by asking "is this the right thing?" or "is this well-built?" All three passed those checks at their time of commit. The gap was the adversarial axis: "assume this is reporting success dishonestly — where is it actually failing?" Risk Reviewer fills that gap. D156's stated purpose (epistemic diversity) is better served by three distinct lenses than by two.

**Why these three models specifically.** PK's standing rule: only top-tier AI models from major Western providers. Anthropic ruled out (the reviewer cannot be Claude). Gemini, GPT, Grok are the three remaining candidates that meet the bar. DeepSeek / Qwen / other open-source Chinese models ruled out for NDIS compliance and vendor-reputation reasons — see D160 for detail.

**Context split rationale.**
- Strategist and Risk get full repo. Direction needs scope. Adversarial needs to see cross-file interactions where silent failures hide.
- Engineer gets focused ~100k. Code review is about the commit + its immediate context. Also constrained by OpenAI's Tier 1 TPM. When Tier 2 unlocks, Engineer stays on focused context by design, not as a workaround.

**Engineer Reviewer focused-context priority order** (fill ~100k tokens from the top):
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
- `app/**/*.ts` (invegent-dashboard, invegent-portal)
- `app/**/*.tsx`

Does NOT fire on README edits, .gitignore changes, typo-only commits, lockfile updates, non-main branches.

Rationale: the reviewer costs real money per call. Firing on every typo would 3-5× the bill.

---

## Architecture — Approach C (full repo + prompt caching)

See D158 for full reasoning. Summary:

- Repo currently 400-700k tokens — fits Gemini 2.5 Pro and Grok 4.1 Fast context windows with headroom
- Prompt caching holds marginal cost at ~$30-50/month across all three reviewers
- RAG explicitly ruled out — adds silent-failure surfaces (retrieval miss, chunking drift) to the system specifically built to catch silent failures
- Bridge to RAG documented if repo grows past ~1.5M tokens; not before

---

## Database schema

### Tables (migration `d156_external_reviewer_layer`, applied 21 Apr)

```sql
-- The reviewers themselves. Three rows now.
CREATE TABLE c.external_reviewer (
  reviewer_key      text PRIMARY KEY,           -- 'strategist' | 'engineer' | 'risk'
  display_name      text NOT NULL,
  provider          text NOT NULL,              -- 'gemini' | 'openai' | 'xai'
  model             text NOT NULL,              -- 'gemini-2.5-pro' | 'gpt-4o' | 'grok-4-1-fast-reasoning'
  api_key_secret    text NOT NULL,              -- 'ICE_GEMINI_API_KEY' | 'OPENAI_API_KEY' | 'ICE_XAI_API_KEY'
  system_prompt     text NOT NULL,
  is_active         boolean NOT NULL DEFAULT true,
  notes             text,                       -- 'paused: OpenAI Tier 1 TPM 30k insufficient'
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);

-- Rules belong to role (reviewer_key), not model. 4 rules per reviewer = 12 total.
CREATE TABLE c.external_reviewer_rule (
  rule_id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reviewer_key      text NOT NULL REFERENCES c.external_reviewer(reviewer_key),
  rule_key          text NOT NULL,
  rule_text         text NOT NULL,
  category          text NOT NULL,
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
  commit_sha           text NOT NULL,
  commit_repo          text NOT NULL,
  commit_message       text,
  commit_author        text,
  commit_timestamp     timestamptz,
  severity             text NOT NULL,                  -- 'info' | 'warn' | 'critical'
  finding_summary      text NOT NULL,
  finding_detail       text NOT NULL,
  referenced_rules     text[] DEFAULT ARRAY[]::text[],
  referenced_artifacts text[] DEFAULT ARRAY[]::text[],
  tokens_input         int,
  tokens_output        int,
  cost_usd             numeric(10,6),
  cache_hit            boolean NOT NULL DEFAULT false,
  is_read              boolean NOT NULL DEFAULT false,
  read_at              timestamptz,
  action_taken         text,
  included_in_digest   uuid,
  created_at           timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_review_queue_unread ON m.external_review_queue (is_read, created_at DESC);
CREATE INDEX idx_review_queue_commit ON m.external_review_queue (commit_sha);

-- Digest runs. One per digest (weekly cron OR on-demand).
CREATE TABLE m.external_review_digest (
  digest_id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trigger_type      text NOT NULL,
  triggered_by      text,
  window_start      timestamptz NOT NULL,
  window_end        timestamptz NOT NULL,
  commits_reviewed  int NOT NULL DEFAULT 0,
  findings_total    int NOT NULL DEFAULT 0,
  findings_critical int NOT NULL DEFAULT 0,
  findings_warn     int NOT NULL DEFAULT 0,
  findings_info     int NOT NULL DEFAULT 0,
  github_file_path  text,
  github_commit_sha text,
  email_sent_at     timestamptz,
  email_resend_id   text,
  status            text NOT NULL DEFAULT 'running',
  error             text,
  created_at        timestamptz NOT NULL DEFAULT now()
);
```

### Rule summary — 12 rules total, 4 per reviewer

**Strategist rules** (category = direction | scope | cost | reversibility):
- `direction_check` — advance a committed priority or flag as tangent
- `scope_check` — match brief, flag crept scope
- `cost_check` — flag unbudgeted recurring costs
- `reversibility_check` — flag one-way doors

**Engineer rules** (category = brief_alignment | complexity | simplification | verification):
- `brief_alignment` — match brief, no unexplained additions or gaps
- `over_engineering_check` — flag complexity not justified by brief
- `simpler_approach` — flag missed simpler alternatives
- `verification_path` — flag changes with no way to verify

**Risk rules** (category = silent_failure | worst_case | missing_guardrail | hidden_assumption):
- `silent_failure_detection` — where could success be reported without the thing actually working
- `worst_case_production` — worst thing that could happen over 7 days in production at current scale
- `missing_guardrail` — upstream failure, missing secret, API change, cron not firing, empty table — where is this assuming happy path
- `hidden_assumption` — what is silently depended on that could change without notice

Full rule text is in `c.external_reviewer_rule`, editable without redeploy.

---

## Edge Function `external-reviewer` v1.2.0

- **Invocation:** GitHub webhook (HMAC-verified) OR retroactive call (`x-ai-worker-key` header + `?retroactive=true&shas=sha1,sha2`)
- **Flow:** receive → path filter → fetch repo tarball + commit diff → for each active reviewer: load rules + assemble prompt + call provider with caching → parse JSON → write to queue → log cost
- **Dispatch:** providers are `gemini`, `openai`, `xai` — dispatch by `provider` column in `c.external_reviewer`
- **Error handling:** one reviewer fails → log failure, continue with others. All fail → write critical `reviewer_error` rows.
- **No retry, no idempotency guard.** If GitHub retries the webhook we get duplicate reviews. Acceptable given low frequency.

## Edge Function `external-reviewer-digest` v1.1.0

- **Invocation modes:** weekly cron (Mon 7am AEST, jobid 66) or on-demand POST
- **Flow:** determine window → query findings → assemble markdown → commit to `docs/reviews/YYYY-MM-DD-digest.md` → send via Resend → mark findings as digested
- **Zero LLM calls.** Aggregation only.

## Dashboard `/reviews` page

- Single on-demand "Run digest now" button (commit `1a7aabf` in invegent-dashboard)
- Sidebar link added
- Deliberately minimal — findings list and outcome-tagging UI deferred to future brief

---

## Secrets (all provisioned 21 Apr)

| Secret | Purpose | Status |
|---|---|---|
| `ICE_GEMINI_API_KEY` | Strategist | ✅ |
| `OPENAI_API_KEY` | Engineer (when unpaused) | ✅ (pre-existing from ai-worker) |
| `ICE_XAI_API_KEY` | Risk Reviewer | ✅ set 21 Apr 03:34 UTC |
| `GITHUB_PAT_INVEGENT` | Fetch repo tarball + commit digest file | ✅ |
| `GITHUB_WEBHOOK_SECRET` | HMAC verification on incoming webhook | ✅ |
| `RESEND_API_KEY` | Digest email | ✅ (pre-existing) |

---

## Provider readiness notes (discovered 21 Apr)

**Gemini (Google):** standard tier sufficient. No blockers. Current model `gemini-2.5-pro`.

**OpenAI:** Tier 1 default gives 30k TPM on gpt-4o. Full-context reviews exceed this. Tier 2 unlocks at $50 cumulative API spend + 7-day wait since first payment. Adding credit to balance does NOT advance tier — only API consumption counts. Engineer Reviewer paused in DB until Tier 2 graduates naturally via organic spend, OR PK explicitly drives spend by flipping ai-worker fallback to OpenAI for a batch.

**xAI:** Tier 1 default gives 500k TPM and 2M context window. No tier graduation blocker. Credits work on team account — PK provisioned xAI account 21 Apr evening, credit top-up pending at session close.

Future reviewer additions should verify provider tier requirements early in the build, not discover them mid-flight.

---

## Acceptance criteria — state at end of 21 Apr session

✅ Met:
- Migration applied; 3 reviewers + 12 rules seeded
- `external-reviewer` EF v1.2.0 deployed, callable via webhook (HMAC) and retroactive (worker-key auth)
- `external-reviewer-digest` EF v1.1.0 deployed, manually callable
- Retroactive reviews executed on 4 commits (`d12a52c`, `202037c`, `495216f`, `1a7aabf`). Strategist completed all 4 with info-severity findings (including self-review on deploy commits). Risk returned 403 on all 4 (xAI credits zero at time).
- On-demand digest produced (`b09f062a-f92b-47e5-9052-c696ac764a53`), succeeded, 2 commits / 2 findings / 0 critical / 0 warn / 2 info
- GitHub file written at `docs/reviews/2026-04-21-digest.md` (46 lines, 3-reviewer coverage block, correctly shows Engineer paused)
- Email sent to pk@invegent.com (Resend ID `160fe650-41d3-437c-affd-cb8331860d6a`)
- Weekly cron scheduled (jobid 66, Mon 7am AEST)
- Dashboard `/reviews` page + API route + sidebar link deployed

🔴 Needs PK manual action:
1. **GitHub webhooks on both repos** — Invegent-content-engine + invegent-dashboard. Settings → Webhooks → Add. Payload URL `https://mbkmaxqhsohbtwsqolns.supabase.co/functions/v1/external-reviewer`. Content type `application/json`. Secret = value of `GITHUB_WEBHOOK_SECRET`. Events = "Just the push event".
2. **xAI team credits** — top up at https://console.x.ai/team/... so Risk Reviewer fires on next commit.
3. **First-live-review verification** — once webhooks configured, make any commit to a qualifying path and confirm a row appears in `m.external_review_queue` within ~2 min.

⏸ Deferred by design:
- OpenAI Tier 2 bump — waiting for natural API spend to reach $50. Engineer stays paused until then. Honest gap disclosed in digest header.

---

## Ongoing operation — what to expect

**Costs:** roughly $30-50/month once all three reviewers active. Cached calls dominate. Tracked via `m.ai_usage_log` with `content_type='external_review'` so D157 cost panel (when built) reports it.

**Read cadence:** weekly email Monday 7am. Expect 1,500-3,000 words. Hit the on-demand button mid-week if a specific review is wanted.

**Rule tuning:** first 4 weeks, expect to add/remove/rewrite ~2-4 rules per reviewer. Rules are in DB, editable without redeploy. If reviewers over-produce info-severity noise, tighten severity calibration in system prompts rather than reading less.

**Evaluation gate** (per D160): after 3 weekly digests or first live-commit cycle, the layer has earned its keep if (a) at least 2 findings changed what was about to be built, OR (b) at least 1 finding prevented a silent failure, OR (c) enough "aligned" reviews that PK stops double-checking. If none of those, options are rotate roles, tune rules, or retire the layer.

---

## Deliberately deferred to future briefs

- **`docs/briefs/2026-04-21-reviewer-role-library.md`** — roles as library (content writer, salesman, compliance auditor, future-maintainer, drift detector) × any model × any commit set. Captured per PK's session reframe. Execute when evidence justifies: 2+ weekly digests of real output + at least one concrete use case for a role not currently in the library.
- **Outcome tagging** (`m.external_review_finding_outcome`) — valid/noise/debatable per finding to measure which reviewer produces signal vs noise. Not yet built. Light addition when rebuild happens.
- **Per-commit email instead of weekly digest** — only if weekly cadence proves too slow. Default assumption is weekly is right.
- **Rules editor in dashboard** — DB-only for now. Add UI only if PK is editing rules frequently enough that DB access is annoying.
- **Cross-repo reviews** (dashboard commit implies backend commit and vice versa) — interesting but premature.
- **Third-party human review (D156 Stage 3)** — gated on first revenue.
- **RAG** — gated on repo > 1.5M tokens.

---

## Session-discovery notes preserved for future context

Three silent failures were discovered on 21 Apr during this build:

1. **CFW schedule save** — dashboard UI shows "Saved ✓" but `c.client_publish_schedule` has zero rows for CFW. Server action swallowing error silently.
2. **Discovery pipeline ingest** — `f.feed_discovery_seed` has 9 provisioned feeds from D125, all marked active, all assigned to clients. Zero items ingested in 5 days because discovery writes `config.url` but ingest reads `config.feed_url`.
3. **ID003 retry loop** (already documented) — success reported across 1,200+ LLM calls over 4 days while cumulative bill grew. Fixed in v2.9.0.

These were found because PK and Claude happened to look. None were found by ICE's own monitoring. All three are exactly the class of thing Risk Reviewer is designed to catch at commit time before they ship. The first real live-commit test of the reviewer layer should produce interesting signal on this axis.

---

*End of brief. System live in two-voice form (Strategist active, Engineer paused, Risk DB-ready) awaiting GitHub webhook config + xAI credit top-up for full three-voice operation.*
