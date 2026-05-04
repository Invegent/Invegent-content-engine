# 2026-05-04 — Dashboard Architecture Review Kickoff (laptop Sydney evening)

**Slug:** `dashboard-architecture-review-kickoff`
**Duration:** ~3h chat-side
**Headline:** ICE Dashboard Architecture Review formally kicked off — three foundational commitments locked. 11-section review document agreed; doc location BOTH repos. Plus: Cowork night-task unblock and manual run of nightly-health-check-v1 v2.1 (clean pass).

---

## Workstreams covered

### 1. Cowork night-task unblock — RESOLVED

Diagnosis: Cowork DID run on schedule at 02:03 AEST 4 May, but two compounding issues blocked useful output:

- `nightly-health-check-v1` queue row stuck at `review_required` since 2 May v2 run despite v2.1 brief patch being applied — Cowork executor filters on queue row status, so brief never re-fired (2 nights of health checks missed: 3 May + 4 May).
- Next ready row was `publish-queue-and-publish-column-purposes` (owner: cc) — Cowork picked it up because executor had no owner-gate, halted at frontmatter gate (5 of 9 v1-spec fields missing).

PK chose: fix both this session, encode owner-gate in v1 spec + executor instructions.

**Commit `e2cecc6` on main** (4 files):

- `docs/briefs/queue.md` — 2 row status flips + how-it-works update
- `docs/briefs/2026-05-03-publish-queue-and-publish-column-purposes.md` — added 5 missing v1-spec fields, renamed `id`→`brief_id`
- `docs/runtime/automation_v1_spec.md` — 4th note added under Brief frontmatter encoding owner-field semantics: `cowork | cc/cowork | cc | chat | PK | empty`
- `docs/runtime/cowork_prompt.md` — v2.1→v2.2 with owner-gate filter in step 1

### 2. Manual Cowork run — CLEAN PASS

PK ran v2.2 prompt manually. Cowork executed `nightly-health-check-v1` v2.1 cleanly:

- Run: `2026-05-04T10:51:09Z → 10:55:00Z` (~4 min, ~25.5k tokens)
- 5-of-7 thresholds hit at run-end (PK review time + Section 10 surfacing accuracy pending → both confirmed by PK)
- 0 questions, 0 corrections, 0 schema bugs, 0 production writes
- v2.1 SQL fix held first time (no recovery needed)
- Output: `docs/audit/health/2026-05-04.md`
- State: `docs/runtime/runs/nightly-health-check-v1-2026-05-04T105109Z.md`
- Cowork commits: `40166245` (deliverables) + `24de9180` (frontmatter + queue)

**Section 10 Priority 1 — 5 true-stuck items in 3 clusters (FILED for tomorrow's diagnosis):**

1. **linkedin × property-pulse**: 2 items, earliest stuck 2026-05-01 21:00 UTC (~2.5 days), residual from 2 May v2-patch trigger
2. **youtube × property-pulse**: 2 items, earliest 2026-05-03 10:00 UTC — UNEXPECTED (YouTube is ingest-only architecturally per `docs/briefs/2026-04-08-youtube-channel-ingest.md`)
3. **youtube × ndis-yarns**: 1 item, scheduled today 09:00 UTC — UNEXPECTED, points at upstream config bug

Secondary signal: S17 escalation rate 52% (13/25 in 7d) > 40% threshold (T-MCP-06 signal, climbing).

Two minor Cowork deviations from spec, both deliberate: (a) brief frontmatter went `ready→review_required` directly skipping `running` (sensible for Tier 0); (b) 2 commits instead of preferred-single for Tier 0 (acceptable under "up to 3 for Tier 1+" allowance).

**Commit `46255fde`**: queue row + brief frontmatter `review_required → ready` for next nightly fire ~02:00 AEST 5 May (manual recurring-brief reset convention). The 5 May 02:00 AEST run is the real test of v2.2 autonomous owner-gate; today's manual run was rehearsal.

### 3. ICE Dashboard Architecture Review — KICKED OFF

PK switched context: requested summary of current dashboard, target state, gap analysis, deep-dive on future shape, then redevelop. Four rounds of review iteration:

**Round 1 (initial proposal)** — layered cockpit + client switcher; page-by-page audit; market research synthesis (agency tools, modern admin patterns, multi-tenant patterns).

**Round 2 (PK provided two reviewer notes)** — Reviewer 1 proposed formal 11-section review document with operating-model framing. Reviewer 2 pushed binary Inbox-first vs Per-client cycle. Adopted Reviewer 1's structure; deferred Reviewer 2's binary as premature commitment.

**Round 3 (PK provided external standards research)** — GOV.UK service standard, NZ digital govt IA, Google SRE golden signals, IBM Carbon, Atlassian nav, WCAG 2.2, layered operational cockpit. Extended with own research (editorial CMS, AI agent observability, content moderation queue UX). Six refinements emerged: typed Attention sub-queues with severity tiers; four-surface model (doorbell/inbox/page/audit); Now is clearance not monitoring; agent observability is distinct from pipeline observability; state-machine view of content lifecycle; annotation queues for human-in-loop agent corrections.

**Round 4 (PK said "sky's the limit, don't be constrained by current dashboard")** — Reframed entirely. Proposed five radical departures: Brief replaces Overview (LLM-generated narrative briefing); Inbox is the only daily surface; Clients are worlds not switchers; Agents as first-class colleagues with profiles; multi-channel dashboard (Telegram + email + voice + web).

**PK's three foundational decisions (LOCKED):**

1. **Strategic renovation** — design from first principles, implement through staged migration. Existing pages as evidence/source material, not sacred and not disposable.
2. **Multi-channel: Brief + alerts on Telegram only** — web is primary for everything else. No mobile inbox, no voice approval flows, no Telegram-driven decisions. Web is the workspace; non-web is the nudge.
3. **Agents as status surface, not full colleague framing** — each agent gets a status card on Overview + section in Investigate. Exception items feed Inbox naturally. NO calibration UI, NO threshold tuning, NO simulator, NO agent profile pages as MVP. Defer "colleague" framing to v2.

**Refreshed final-form IA (6 sections, ~18 nav items):**

```
NOW (3): Overview, Inbox, Pipeline
CLIENTS (4): All Clients, Feeds, Onboarding, Connect
CREATE (2): Content Studio, Formats
INVESTIGATE (4): Flow, Pipeline Log, Visual Pipeline, Agents
REPORTS (1 nav, 3 tabs): Performance + Costs + Calibration
ADMIN (4): Reviews, Compliance Rules, Subscriptions, Roadmap
```

Compliance / Performance / Visuals each split because they're two products in one page (review-queue vs rules; content outcomes vs agent calibration; logs vs creation).

**Doc location decision (LOCKED):** BOTH repos — review document lives in `Invegent-content-engine/docs/dashboard-review-2026-05/`, link from `invegent-dashboard/docs/architecture-review/`.

**Effort estimate for full review:** ~9-10 hours of chat work spread across 3 sessions, then code work after.

**11-section structure (Reviewer 1's framework, slightly adapted):**

| § | Section | Effort |
|---|---|---|
| 1 | Current-state inventory | ~1.5h |
| 2 | Operator workflow map (PK's Tuesday rhythm) | ~1h |
| 3 | Decision criteria | ~30 min |
| 4 | IA option comparison (5 options scored) | ~1h |
| 5 | Recommended target IA | ~30 min |
| 6 | Page-by-page fate table | ~2h |
| 7 | Brief + Telegram channel plan (NEW vs Reviewer 1) | ~30 min |
| 8 | Layer 1/2 boundary (dashboard vs portal) | ~30 min |
| 9 | New product objects (`m.attention_item`, agent status, scope primitive) | ~1h |
| 10 | Migration sequence | ~1h |
| 11 | Risks + open decisions | continuous |

**Five open decisions deferred to §3 conversation:**

1. Agent integration shape — overlays vs Investigate section
2. Pipeline state-machine surface — replace Queue or keep both
3. Reviews as own section vs nested in Admin
4. Roadmap fate — Admin / separate deployment / markdown-only
5. Layer 1/2 boundary — Performance for clients goes to portal, ops Performance stays here

**§1 starts:** next session whenever — no rush per PK.

---

## Standing rules honoured

- **D-01**: queue/docs/workflow maintenance below D-01 production-patch threshold — no ChatGPT review fired this session.
- **D-170**: chat applies via Supabase MCP — none needed (no DB work this session).
- **Lesson #51**: pre-flight P1-P5 honoured before each commit (cowork unblock + queue reset).
- **G1 convention**: this session file IS the per-session detail; sync_state update demotes prior summary to index.
- **D182 closure-first**: closure work this session ~30 min Cowork unblock; architecture work doesn't count to closure budget per standing memory rule.
- **D186**: closure budget +0.5h, trailing-14d ~19.0h (above 8.0 floor). Pause trigger NOT active.

## Closure budget metrics

- This session closure work: ~30 min (Cowork unblock + queue reset)
- Architecture review work: ~2.5h (does not count toward closure budget per standing rule — product/architecture work is in invegent-dashboard repo conceptually)
- Trailing-14d: ~19.0h (above 8.0 floor)
- Net P0+P1 open: 4 (unchanged from v2.34)

## What's next (carry-forward to v2.35)

**Tomorrow morning (~02:00 AEST 5 May):** autonomous Cowork run is the real test of v2.2 owner-gate. Today was rehearsal.

**P1 carry-overs:**

- T05 Meta dev support contact (P1-urgent)
- CFW LI V3-V5 acid test next fill cycle ~2026-05-06 03:04 UTC (parser fix + F-PUB-009 simultaneous test)
- 3 stuck-item clusters from health check (LinkedIn-PP residual, YouTube-PP unexpected, YouTube-NY unexpected)

**P2:**

- F-AAP-NEEDS-REVIEW-BACKLOG (28 drafts) — top P2
- F-PUB-009 7-day flow check

**Architecture review:**

- Dashboard Architecture Review §1 — start next session whenever PK signals

## v2.35 honest limitations

- Architecture review work consumed significant chat tokens this session (4 rounds + 3 batches of market research). Budget for §1 next session should anticipate similar token weight.
- Tomorrow morning's autonomous Cowork run remains untested — today's manual run validated the v2.1 SQL fix and the v2.2 prompt under PK execution but not the v2.2 owner-gate's autonomous behaviour.
- Three Cowork-surfaced stuck-item clusters (LinkedIn-PP residual, YouTube-PP, YouTube-NY) deferred to tomorrow's diagnosis, not investigated this session.
- Dashboard roadmap page (`app/(dashboard)/roadmap/page.tsx` in invegent-dashboard) NOT updated this session. The architecture review is meta-work; PK to decide next session whether the roadmap page should reflect it.
- The 11-section review structure is provisional — sections may merge or split as §1-§3 conversations surface real shape.

---

*End of session.*
