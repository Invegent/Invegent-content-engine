# Invegent Work Journal Source Type — Follow-up Brief

**Status:** SCOPE ONLY — not implemented.
**Created:** 24 Apr 2026 during A11b Invegent session.
**Parent brief:** `docs/briefs/2026-04-24-invegent-brand-profile-v0.1.md`
**Purpose:** Define what a new ICE source type for "internal work journal" content would look like, so when we want to build it we have the design handy and don't have to rediscover it.

## Why this exists

Invegent's content model (per v0.1 brand profile) is dual-stream:
- Stream A — external signals (existing ICE plumbing handles this)
- Stream B — **internal work journal: the actual work being done across Invegent and its products**

Stream B has no ICE source_type_code today. This brief scopes what it needs.

## What Stream B actually is

The work PK does across Invegent's orbit generates naturally structured artefacts already:

| Source | Git-tracked? | Content-readiness | Cost to capture |
|---|---|---|---|
| GitHub commit messages (Invegent org, 3 repos) | ✅ | High — atomic content nuggets | Low |
| `docs/06_decisions.md` entries (D001–D168+) | ✅ | Highest — each decision is a structured learning | Low |
| Session sync docs (`docs/00_sync_state.md`, session closes) | ✅ | High — already written at session-close quality | Low |
| Brief files in `docs/briefs/` | ✅ | High — already content-shaped | Low |
| Incident write-ups (`docs/incidents/`) | ✅ | Very high — ID003, ID004 writeups are essentially ready-to-publish content | Low |
| Claude Code session logs | 🟡 | Medium — lots of noise to filter | Medium-high |
| Claude chat session summaries (conversations like this one) | 🟡 | High but unstructured | Medium (needs capture discipline) |
| Voice notes / `@InvegentICEbot` Telegram messages | 🟡 | Very high (authentic PK voice) | Medium |
| Cowork task outcomes (weekly reconciliation) | ✅ | Medium — better as aggregated summaries | Low |

**Starting set: top 5 rows — all git-tracked, all production-ready, all PK already produces as part of normal session discipline.** Nothing extra to write.

## Proposed design

### New source_type_code

`source_type_code = 'git_work_journal'`

*(Alternative names considered: `work_journal`, `build_log`, `operator_notebook`. Picking `git_work_journal` because it's explicit about where the content lives and mirrors the existing `youtube_channel` naming pattern from the YouTube brief.)*

### New ingest pattern

Unlike RSS (one-way pull from external URL) or newsletter_email (Postmark inbound), `git_work_journal` pulls from GitHub via authenticated API. The ingest granularity is per-commit, per-decision-entry, per-brief-file, per-incident-file.

**Feed config shape:**
```
source_type_code = 'git_work_journal'
config = {
  "github_org": "Invegent",
  "repos": ["Invegent-content-engine", "invegent-dashboard", "invegent-portal"],
  "watch_paths": [
    "docs/06_decisions.md",
    "docs/00_sync_state.md",
    "docs/briefs/",
    "docs/incidents/"
  ],
  "watch_commits": true,
  "commit_filter": {
    "min_commit_message_length": 80,
    "exclude_commit_types": ["chore", "style", "ci"],
    "include_commit_types": ["feat", "fix", "docs", "perf", "refactor", "incident"]
  }
}
```

### Ingest adapter behaviour

New `git-work-journal-ingest` Edge Function, cron every 4 hours (lower cadence than RSS because work doesn't accrete every 10 minutes).

For each watched artefact type, emit one `f.raw_content_item` per logical unit:

- **Per commit** — one item, with commit message + diff summary as raw text, SHA as canonical identifier
- **Per decision entry** — one item per D-number (parse `docs/06_decisions.md` for new D-entries since last successful ingest run)
- **Per brief file** — one item per new file under `docs/briefs/`
- **Per incident file** — one item per new file under `docs/incidents/`
- **Per sync_state major update** — one item, but only when the update is substantive (non-trivial diff); skip cosmetic updates

Deduplication against previous runs via commit SHA + file path for files.

### Canonicalisation

Standard canonicalisation (`f.canonical_content_item`) with the git commit or file path as the canonical URI. No "body fetch" required because the raw content IS the body — skip the `f.canonical_content_body` Jina reader step entirely for this source type (saves ~30% of typical pipeline cost).

### Scoring adjustments

Current bundler scoring is tuned for external signals (recency, relevance to client verticals). `git_work_journal` signals need different scoring:

- **Recency matters less** — a decision entry from 3 weeks ago might still be the right content today
- **Intrinsic-structure matters more** — commit messages with good bodies, decision entries with explicit "Options Considered" / "Reasoning" structure, briefs with clear frame → all higher-scoring than unstructured commits
- **Publishing-suitability markers** — explicit markers like "publishable: true" in commit footers, or content that follows the "story shape" (here's what broke, here's what I tried, here's what worked) score higher
- **Learning-density proxy** — commits with file churn across 5+ files + a > 500-char commit body are usually significant work worth writing about; tiny single-file commits usually aren't

Proposed: add a `scoring_profile` column to `c.client_source` that points to a scoring function by name. Default is `external_signal_v1`. Invegent's Stream B sources would use `work_journal_v1`.

### Client configuration

When Invegent goes live with Stream B:
- One `c.client_source` row per repo + a "combined" row if we want to score cross-repo patterns
- `scoring_profile = 'work_journal_v1'`
- `c.client_digest_policy.scope` narrowed to `{"source_types": ["git_work_journal", "rss"]}` so both streams flow into the same digest run

### New content_type_prompt rows for Invegent

Once Stream B is flowing, two additional job_types make sense beyond `rewrite_v1` / `synth_bundle_v1`:

- `work_reflection_v1` — single work-journal item → reflective first-person post. Input is the raw commit/decision/brief; output is a post reflecting on what was built / learned / decided.
- `work_synthesis_v1` — multiple work-journal items from the past week → weekly-roundup synthesis post. Input is a bundle of commits/decisions/incidents; output is a "here's what happened this week in building X" post.

These would sit alongside the standard `rewrite_v1` / `synth_bundle_v1` task prompts (which still apply to Stream A external signals).

## Implementation effort estimate

| Phase | Scope | Effort |
|---|---|---|
| 1 | New source_type_code + migration + config schema | 1 hour |
| 2 | `git-work-journal-ingest` Edge Function (commit watching only first) | 2-3 hours |
| 3 | Extend ingest to decision entries + brief files + incident files | 2-3 hours |
| 4 | New `scoring_profile` column + `work_journal_v1` scorer | 2 hours |
| 5 | `work_reflection_v1` + `work_synthesis_v1` task prompts for Invegent | 1 hour |
| 6 | End-to-end test with 1 real recent commit → published draft | 1 hour |
| **Total** | | **~9-11 hours** |

Could be compressed to ~6 hours if phases 1-3 are collapsed into a single "ingest commits only" MVP, deferring docs/ artefact watching to a later iteration.

## Dependencies and gates

- **Blocks:** Invegent actually publishing to LinkedIn / YouTube (needs Stream B for the "building in public" half of the content mix)
- **Does not block:** CFW, NDIS Yarns, Property Pulse — they don't need this source type
- **Gated on:** PK wanting Invegent to actually start publishing (no urgency right now — Phase 3 priority)

## Priority

**LOW-MEDIUM.** Invegent publishing isn't a Phase gate or a pre-sales item. It becomes medium-priority when:
- At least one CFW draft has been generated with the new prompt stack and reviewed
- PK decides Invegent should actually publish (vs stay a branding placeholder)
- Router MVP (R4/R5/R6) is further along — doesn't make sense to build new source types when the downstream router is still being designed

**Suggested window:** after first CFW pilot external client onboards, as part of the "prove ICE works by publishing Invegent in public" moment. That's likely 2-3 months out.

## Open design questions (for the implementation session)

1. **Privacy filter** — some commits / decisions / briefs may contain client-identifying info or credentials. Need an explicit "publishable" signal or pre-filter. Candidates: `PUBLIC: true` marker in commit footers, allow-list paths, deny-list patterns (regex for secrets / emails / names).
2. **Author attribution** — commits are attributed to "Invegent <pk@invegent.com>" (per recent sync_state commits). That's fine, but when content gets drafted from a commit, should the post explicitly say "I built X" or "we built X"? Voice profile says first-person PK, but historical commits include collaborative Claude-assisted work — how much of that goes into the voice?
3. **Stream B scoring weight** — when Stream A and Stream B items compete for digest slots, what's the ratio? Proposed default: 60% Stream B / 40% Stream A (Invegent's differentiator IS the building-in-public content; external signals are supporting context). Adjustable per-client.
4. **Retroactive ingest** — do we ingest historical git-work-journal content (go back to Nov 2025 when ICE started) or only forward from implementation date? Suggest forward-only to avoid drowning the first digest_run in 6 months of accumulated work, with a separate "highlight reel" ingest that picks ~10 banger historical items manually.

## What this brief does NOT scope

- The tougher capture mechanisms — Claude chat summaries, voice notes, Telegram bot messages. Those are real content sources but each has its own significant design problem. Separate brief when they become priority.
- Cross-brand content flow — whether something written for Invegent can auto-generate a companion post for NDIS Yarns if relevant. Interesting future work, out of scope here.
- The publishing side — this brief only covers ingestion. Publishing is handled by existing publisher Edge Functions once the content_type_prompt produces a draft.

## Canonical status

Scope document only. Not implemented. Revisit when Invegent publishing becomes a priority, or sooner if the Stream A-only approach proves insufficient.
