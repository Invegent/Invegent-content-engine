# §2 — Target IA Mapping

## Purpose

Map every current dashboard route into the locked final-form IA from `00_overview.md` (Now / Clients / Create / Investigate / Reports / Admin) with a fate decision (keep / merge / rename / retire / defer), rationale, and confidence level for each. Resolve where current overlaps consolidate, identify what's missing from the target IA, and surface open questions that feed §3–§6.

## Section-numbering note (transparency)

The 11-section structure committed in `00_overview.md` had §2 as **"Operator workflow map (PK's Tuesday rhythm)"** with target file `02_operator_workflow.md`. PK re-scoped §2 in this session to be **target IA mapping** (`02_target_ia_mapping.md`, this file). The original Operator workflow content has not been written and is not lost — it will need to slot in elsewhere (likely §3 or merged into Decision Criteria) per PK's direction in a later session.

`00_overview.md` is **not** updated in this session per PK's "files changed" minimisation; reconciliation of the 11-section table is deferred until PK signals.

## Method

- Started from §1 inventory.
- Read source for routes where §1 was inferential: `/queue`, `/monitor`, `/pipeline-log`, `/diagnostics`, `/failures`, `/compliance`, `/visuals`, `/performance`, `/content-studio`, `/system/formats`. Findings updated below where they correct §1.
- Each fate decision draws on the locked IA + the locked foundational decisions in `00_overview.md` (especially **Strategic renovation, staged migration** — existing pages are evidence, not sacred or disposable).
- Sources NOT read this session (confidence on those rows is bounded accordingly): `/inbox`, `/drafts`, `/clients`, `/client-profile`, `/feeds`, `/connect`, `/onboarding`, `/costs`, `/system/subscriptions`, `/roadmap`.

### Fate categories

- **Keep** — page survives in roughly current form. Move to new IA section, perhaps minor relabel.
- **Merge** — page's content folds into another page; this route either redirects or retires.
- **Rename** — page survives but gets a new label/URL/heading consistent with new IA terminology.
- **Retire** — route disappears entirely. Content captured elsewhere or judged unnecessary.
- **Defer** — fate not yet decided; needs §3–§6 work to commit.

(Multiple categories may apply, e.g. Keep + Rename + Refactor.)

### Confidence levels

- **HIGH** — direct evidence in source, clear target, low ambiguity. Safe to commit fate now.
- **MEDIUM** — defensible position with one or more reasonable alternatives. §6 should confirm.
- **LOW** — provisional only. Open decision blocks committing — hold for §3–§6.

---

## Findings since §1 that correct or sharpen the inventory

These are points where §1's inferences were wrong or thin, now corrected from source.

1. **`/visuals` is purely observability, NOT a creation+log split.** It contains: Render Log (last 50, `m.post_render_log`), Format Advisor Decisions (last 50, `m.post_visual_spec`), Format Performance (30-day rolling, `m.post_format_performance`). No creation UI on the page. **The "two-products split" hypothesis from §1 is incorrect.** Visuals → INVESTIGATE > Visual Pipeline as a single move. No carve-out.

2. **`/compliance` review queue is policy-change alerts, not draft compliance flags.** compliance-monitor (cron, 1st of month 9am UTC) SHA-256 hashes policy URLs (e.g. NDIS policy sites). compliance-reviewer v1.1.0 (LLM) analyses changed pages and writes `affected_rules` + `new_rules_suggested`. The "review queue items feed Inbox" framing from §1 is correct but the items are **policy-change alerts**, not draft-level flags. The Rules tab uses `<ComplianceRulesPanel />`. The split-into-two-products is **already** internal as inner tabs.

3. **`/performance` already contains the Calibration content** as inner tab "Approval Patterns" — drafts checked, pass rate, gate failure reasons, per-client breakdown, weekly trend, calibration commentary. The new REPORTS > Calibration is a **promotion from inner tab to peer tab, not a new build**.

4. **`/diagnostics` is the Tier 2 LLM diagnostic agent** — daily 6am AEST report. Health-score gauge, per-client findings (`cadence_status`, `posts_7d`/`posts_prev_7d`), recommendations, predicted issues. H1 brands itself "Monitor". Closest existing thing to an "agent status surface" — strong candidate to seed INVESTIGATE > Agents.

5. **`/pipeline-log` is the Tier 1 doctor + hourly AI summary + health snapshots.** `m.pipeline_doctor_log` runs at :15 and :45 auto-fixing stuck items. `m.pipeline_ai_summary` hourly LLM. `m.pipeline_health_log` every 30 min, 48-row table. Hardcoded `ndis_published_today` + `pp_published_today` schema columns and "NDIS" + "PP" UI columns/cards. H1 also brands "Monitor".

6. **The hidden operating concept "Monitor" spans 6 routes.** `/monitor`, `/pipeline-log`, `/diagnostics`, `/visuals`, `/compliance`, `/performance`/`/costs` all share the same `MONITOR_TABS` `<SectionTabs />` and "Monitor" H1. The new IA breaks this section-tab grouping intentionally (these distribute across NOW > Pipeline, INVESTIGATE > {Flow, Pipeline Log, Visual Pipeline, Agents}, REPORTS > {Performance, Costs}, ADMIN > Compliance Rules, NOW > Inbox). Migration plan must strip MONITOR_TABS from all 6 pages.

7. **`/failures` unions 3 tables** (`m.post_draft` `approval_status='dead'`, `m.post_publish_queue` `status='dead'`, `m.ai_job` `status='dead'`). It is broader than `/queue?status=dead` (which only covers `post_publish_queue`). Genuine partial overlap, not full duplicate. There is **no requeue button** today — §1's claim of "one-click requeue" was wrong.

8. **`/content-studio` has THREE modes** — single (`PostStudioForm`), series (`SeriesList`/`NewSeriesForm`/`SeriesDetail`), analyse (`ChannelSubscriptions`). The "analyse" mode renders source/channel subscription management, which is conceptually mismatched under Create.

9. **Hardcoded client references** appear in `/monitor` (`CLIENT_TABS = [NDIS-Yarns, Property Pulse, Care For Welfare]` — Invegent brand absent) and in `/pipeline-log` (`m.pipeline_health_log` schema columns `ndis_published_today` + `pp_published_today`, plus matching UI columns/cards). Brittle for any new client.

10. **`/system/formats` is an editor for the format advisor.** `t."5.3_content_format"` rows. Toggle `is_buildable`. Edit `advisor_description`. Confirms PK's memory — 17 formats, `format-advisor-v1`. Direct map to CREATE > Formats.

---

## Provisional migration table

| Current route | Current purpose | Target IA destination | Fate | Rationale | Confidence |
|---|---|---|---|---|---|
| `/overview` | "Operator Briefing" — system status banner, drafts to review, open incidents (`m.incident`), pipeline health card (`m.ai_diagnostic_report`), token expiry alerts, today's publish schedule, 4 quick stats | NOW > Overview | Keep + Rebuild around Brief + Agent status | Already aligned with locked IA. Rebuild adds Brief surface (LLM narrative briefing) + first-class agent status row on top of existing zones. Heading already = "Operator Briefing" — fits. | HIGH |
| `/inbox` | Draft review queue (source unread this session) | NOW > Inbox | Keep | Direct map. Will absorb policy-change alerts from /compliance review queue + format-advisor low-confidence escalations (future). | HIGH |
| `/drafts` | Older draft list. Sidebar Inbox match string covers it. | n/a (alias or retire) | Retire OR keep as alias | Functional duplicate. Low cost either way. PK preference. | MEDIUM |
| `/queue` | Flat row-level table over `m.post_publish_queue`. Status filter tabs (queued / published / failed / dead / all) + client filter. | NOW > Pipeline | Rename OR Replace | Pure rename if state-machine reframe rejected (Open Decision 2). If reframe accepted, current Queue is rebuilt and either retires or moves to INVESTIGATE > Pipeline Log as the row-level back-end view. | LOW (Open Decision 2) |
| `/monitor` | Pipeline Flow Diagram (interactive nodes, auto-refresh 30s) + section tabs to /pipeline-log, /visuals, /compliance, /costs, /performance | INVESTIGATE > Flow | Keep + Decouple | Visualisation survives. Drop `MONITOR_TABS`. `CLIENT_TABS` hardcoded list must become data-driven from `c.client`. | HIGH on fate, MEDIUM on shape |
| `/pipeline-log` | Tier 1 pipeline-doctor (auto-fix every 30 min) + hourly AI summary + 48-row health snapshots table. Hardcoded NDIS + PP columns. H1 = "Monitor". | INVESTIGATE > Pipeline Log | Keep + Rename + Refactor | Maps cleanly. Refactor: drop `ndis_published_today`/`pp_published_today` hardcoded columns (schema migration); rename H1 from "Monitor" to "Pipeline Log"; remove `MONITOR_TABS`. Tier 1 doctor status may also bubble to NOW > Overview agent-status row. | MEDIUM |
| `/diagnostics` | Tier 2 LLM daily diagnostic agent — health gauge, per-client findings (`cadence_status`), recommendations, predicted issues. H1 = "Monitor". | INVESTIGATE > Agents (seed) + cards on Overview | Keep + Rename + Re-home | Strongest existing candidate to seed INVESTIGATE > Agents (status MVP per locked decision 3). Health gauge belongs on Overview agent-status row. Could merge into Pipeline Log if §6 decides Agents MVP is "Diagnostics-only" and that's too thin to justify a section. | MEDIUM |
| `/failures` | Cross-table dead-letter view (post_draft + post_publish_queue + ai_job dead items). No requeue button. | INVESTIGATE > Pipeline Log (sub-view) + NOW > Inbox (action items) | Merge | Dead items per pipeline stage surface in Pipeline Log row-level view. Action-required dead items feed Inbox. /failures route retires once both surfaces absorb the content. /queue?status=dead remains a valid sub-filter. | MEDIUM |
| `/performance` | Two inner tabs: Engagement (Facebook insights — per-client summaries, top 20 posts, format breakdown) + Approval Patterns (auto-approver pass rate, gate failures, per-client, weekly trend) | REPORTS > Performance tab + REPORTS > Calibration tab | Split | Engagement → Performance tab. Approval Patterns → Calibration tab. Promote from inner tabs to peer tabs in new Reports section. Layer 1/2 boundary (ops vs client) per Open Decision 5 — ops view stays here, client view moves to portal. | HIGH |
| `/costs` | AI cost tracking per client + model (source unread this session) | REPORTS > Costs tab | Keep + Rename | Direct map. Section tabs go. | HIGH on fate, LOW on shape |
| `/compliance` | Two inner tabs: Review Queue (policy-change alerts via compliance-monitor + compliance-reviewer LLM) + Rules (`<ComplianceRulesPanel />`) | NOW > Inbox (review queue items) + ADMIN > Compliance Rules (Rules tab) | Split | Already split internally. Promote inner tabs to separate surfaces. Review-queue items are policy-change alerts (operator decides whether to update rules) — feeding Inbox is consistent with Inbox-as-exception-surface. Rules tab moves to Admin. | HIGH |
| `/content-studio` | Three modes: single (`PostStudioForm`), series (`SeriesList`/`NewSeriesForm`/`SeriesDetail`), analyse (`ChannelSubscriptions`) | CREATE > Content Studio (single + series) + CLIENTS > Feeds or Connect (analyse mode) | Split | Single + series stay under Create as named in IA. The "analyse" mode is source/channel subscription management — conceptual mismatch under Create. Move to Clients section. §6 to confirm Feeds vs Connect home (needs `ChannelSubscriptions` source read). | HIGH on single+series, MEDIUM on analyse-home |
| `/visuals` | Render log + Format Advisor decisions + Format Performance (3 observability surfaces) | INVESTIGATE > Visual Pipeline | Keep + Rename | Direct map. Drop `MONITOR_TABS`. Format Performance overlaps with /performance Engagement — see Consolidations. | HIGH |
| `/clients` | Client list + summary cards (source unread this session) | CLIENTS > All Clients | Keep + Rename | Direct map. | HIGH |
| `/client-profile` | Single-client deep-dive (`ClientProfileShell.tsx`, ~42 KB). Drill-down from /clients. | CLIENTS > All Clients > [client] (drill-down) | Keep | Drill-down preserved. No IA-level change. | HIGH |
| `/feeds` | Feed source management (`f.feed_source`, give-up rates, health) (source unread this session) | CLIENTS > Feeds | Keep | Direct map. Likely absorbs ChannelSubscriptions from /content-studio analyse mode if §6 confirms. | HIGH |
| `/connect` | OAuth/platform connection (D-YT-OAUTH-1 standing rule canonical surface) (source unread this session) | CLIENTS > Connect | Keep | Direct map. | HIGH |
| `/onboarding` | Client onboarding wizard (`page.tsx` ~37 KB). Not in sidebar nav today. (source unread this session) | CLIENTS > Onboarding | Keep + Promote to nav | Direct map. Add sidebar entry under Clients. | HIGH on fate, MEDIUM on shape |
| `/system/formats` | Format Library — read+toggle `is_buildable`, edit `advisor_description` for `t."5.3_content_format"`. Configures format-advisor agent. 17 ICE formats today. | CREATE > Formats | Keep + Rename + URL flatten | Direct map. URL flattens from `/system/formats` to `/formats`. | HIGH |
| `/system/subscriptions` | Subscription / billing config (source unread this session) | ADMIN > Subscriptions | Keep + Rename + URL flatten | Direct map. URL flattens from `/system/subscriptions` to `/subscriptions`. | HIGH on fate, LOW on shape |
| `/reviews` | External Reviews — Gemini 2.5 Pro + GPT-4.1 per-commit reviewers + weekly digest button (`m.external_review_queue`, `/api/run-digest`) | ADMIN > Reviews | Keep | Direct map (subject to Open Decision 3). Naming disambiguation vs `m.chatgpt_review` per §1 — §6 to commit. | LOW (Open Decision 3) |
| `/roadmap` | PHASES roadmap page (source unread this session) | ADMIN > Roadmap | Defer | Hold current page as-is until Open Decision 4 commits one of: keep in dashboard / split deploy / markdown-only. | LOW (Open Decision 4) |
| `/actions` | Server actions backing other pages (not a route) | n/a | Keep | Backing logic. Not affected by IA. | HIGH |

---

## Consolidations — where current overlaps go

§1 listed 7 overlaps. §2 commits a destination (or a Defer) for each, plus two new overlaps surfaced this session.

1. **Inbox vs Drafts (`/inbox` vs `/drafts`).** Inbox absorbs Drafts. `/drafts` retires or aliases. **Confidence: MEDIUM** (PK preference deferred).

2. **Overview "Drafts to review" vs `/inbox`.** Overview keeps a *digest* card linking to Inbox; Inbox is the only place to act. The existing `<DraftActionButtons />` on Overview let the operator approve/reject inline, but the full queue lives at Inbox. Keep as-is. **Confidence: HIGH.**

3. **Overview "Open incidents" + "Publishing schedule" vs `/monitor` + `/queue`.** Overview keeps the digest cards; full surfaces live in their target IA homes (Pipeline / Flow). Existing pattern stays. **Confidence: HIGH.**

4. **Monitor / Pipeline Log / Failures / Diagnostics overlap.** Resolved: Flow stays at /monitor (INVESTIGATE > Flow). Pipeline Log at /pipeline-log with refactor (INVESTIGATE > Pipeline Log). Failures dissolves — rows surface in Pipeline Log row-level view + Inbox action items. Diagnostics seeds INVESTIGATE > Agents. **Confidence: MEDIUM** — §6 may revisit if "Agents seeded by Diagnostics alone" is too thin for MVP.

5. **Performance ops vs client.** Layer 1/2 boundary per Open Decision 5. Ops view (current page Engagement tab) stays in REPORTS. Client view (when built) moves to portal (`invegent-portal`). **Confidence: LOW** (Open Decision 5).

6. **Compliance review queue vs Rules.** Already inner-tab split. Promote to separate surfaces: Inbox (review queue) + Admin > Compliance Rules (Rules tab). **Confidence: HIGH.**

7. **Visuals creation vs log.** §1 hypothesis was wrong — `/visuals` is observability-only, no creation UI on the page. No split needed. Single move to INVESTIGATE > Visual Pipeline. **Confidence: HIGH.**

8. **`/performance` Format Performance vs `/visuals` Format Performance** (newly identified §2). Both surface engagement-by-format. Performance is post-keyed via `m.post_performance` + format breakdown. Visuals is format-keyed via `m.post_format_performance` 30-day rolling. §6 to commit: keep both as different lenses, OR consolidate into Reports as a sub-section. **Confidence: LOW.**

9. **`/reviews` (external reviewer) vs `m.chatgpt_review` (D-01 in-conversation)** (carry-over from §1). The `m.chatgpt_review` records have NO dashboard surface today — queried via SQL only. Naming collision risk if a surface is added later. §6 should propose: rename one of them, OR scope-prefix surfaces (e.g. `/reviews/external` + `/reviews/chatgpt-mcp`). **Confidence: LOW.**

---

## Missing target pages/modules required by the final IA

What the locked IA requires that the dashboard does NOT have today, with the closest existing seed where one exists.

| Missing module | New IA home | Closest existing seed | Notes |
|---|---|---|---|
| **Brief surface** (LLM narrative briefing, with Telegram push) | NOW > Overview | `m.ai_diagnostic_report` summary card on /overview; `m.pipeline_ai_summary` hourly | Probably needs new `m.brief` table or similar. Telegram delivery is system-level dependency (locked decision 2). |
| **Telegram channel plumbing** | (system-level, not a page) | None | New build. Brief composition + alert delivery destinations. |
| **Agent status row on Overview** | NOW > Overview | `<PipelineHealthCard />` on /overview reads single `m.ai_diagnostic_report` row; partial | Becomes per-agent (auto-approver, format-advisor, compliance-reviewer, ai-diagnostic, pipeline-doctor, ai-worker parser, etc.). Each agent gets a status card. |
| **INVESTIGATE > Agents section** | INVESTIGATE > Agents | `/diagnostics` (Tier 2 LLM agent surface) | Status MVP only per locked decision 3. NO calibration UI / threshold tuning / simulator. May need additional agent run lists / annotation queue inputs to Inbox. |
| **NOW > Pipeline state-machine view** (if Open Decision 2 confirms reframe) | NOW > Pipeline | `/queue` (row-level table) | New build IF the reframe wins. Could coexist with Queue as row-level back-end view. |
| **Format-advisor low-confidence escalation → Inbox** | NOW > Inbox | `/visuals` Format Advisor Decisions log shows decisions but no escalation pathway | Pattern: agents surface exceptions to Inbox; format-advisor lacks the pathway today. |
| **Brand/client switcher in sidebar header** | (sidebar header) | None | No switcher today; nav is global. Kickoff Round 4 floated "Clients are worlds, not switchers" — reframed in locked decisions. §6 to commit final shape. |
| **Sidebar search** | (sidebar header) | None | Not in locked IA explicitly. Surface in §11 risks. |

---

## Operating-concept work surfaced by §2 (out of scope but adjacent)

Not strictly part of fate-mapping but flagged because they affect migration sequence (§10):

- The hidden `MONITOR_TABS` section-tab grouping couples 6 pages. Migration plan must remove these tabs across all 6 affected files (`/monitor`, `/pipeline-log`, `/diagnostics`, `/visuals`, `/compliance`, `/performance`), OR rebuild as one consolidated INVESTIGATE shell.
- Hardcoded NDIS + PP references in `m.pipeline_health_log` schema (`ndis_published_today`, `pp_published_today`) and matching `/pipeline-log` UI must become data-driven before the IA migration ships, OR the new INVESTIGATE > Pipeline Log inherits the brittleness. This is a schema change, not just UI.
- `/monitor` `CLIENT_TABS` hardcoded array must become data-driven from `c.client` (Invegent brand currently invisible there).
- All 6 "Monitor"-branded H1s (`/monitor`, `/pipeline-log`, `/diagnostics`, `/visuals`, `/compliance`, `/performance`) need renaming to match the new IA labels.

---

## Open questions feeding §3–§6

Each is a fate decision NOT yet committed. §3 Decision Criteria should rank these by stakes; §6 commits.

1. **State-machine reframe (Open Decision 2 from `00_overview.md`).** Does NOW > Pipeline replace `/queue` as a state-machine view, or coexist with the row-level table? Drives /queue from Rename to Replace.
2. **Diagnostics-as-MVP-Agents.** Is INVESTIGATE > Agents adequately seeded by relocating `/diagnostics`, or does MVP Agents need additional surfaces (per-agent run lists / annotation queue input)?
3. **Compliance review-queue items as Inbox items.** Should policy-change alerts feed the same Inbox as draft review items, or is Inbox draft-only with policy-change alerts going to a separate sub-route under Now?
4. **`/content-studio` analyse-mode home.** `ChannelSubscriptions` belongs under Clients (Feeds or Connect) — which one? Needs `ChannelSubscriptions` component source read in §6.
5. **`/failures` retire-vs-keep.** Does /failures route retire entirely, or stay as a cross-stage dead-letter dashboard distinct from Pipeline Log row-level view?
6. **`/drafts` alias-vs-retire.** Low cost either way; PK preference.
7. **Format Performance home (Performance vs Visuals).** Where does engagement-by-format live? §6 to commit.
8. **`/reviews` naming disambiguation vs `m.chatgpt_review`.** §6 to propose rename or scope prefix.
9. **Roadmap (Open Decision 4 from `00_overview.md`).** Keep / split deploy / markdown-only.
10. **Reviews placement (Open Decision 3 from `00_overview.md`).** Own top-level vs Admin nest.
11. **Layer 1/2 boundary on Performance (Open Decision 5 from `00_overview.md`).** Ops vs client split. §8 home.
12. **Sidebar switcher / search affordances.** Locked IA didn't address them; §6 to confirm posture.
13. **Hardcoded-client cleanup as gating.** Should the IA migration block on data-driven client lists across `/monitor` + `/pipeline-log` + `m.pipeline_health_log` schema, or does it ship and the cleanup follows? Affects §10 migration sequence.
14. **§2 absorbing original §2 ("Operator workflow map").** Does the Operator workflow map become §3, merge with Decision Criteria, or get cut?

---

## Honest limitations

- Sources read this session: `/overview`, `/reviews`, `/queue`, `/monitor`, `/pipeline-log`, `/diagnostics`, `/failures`, `/compliance`, `/visuals`, `/performance`, `/content-studio`, `/system/formats`. Sources NOT read: `/inbox`, `/drafts`, `/clients`, `/client-profile`, `/feeds`, `/connect`, `/onboarding`, `/costs`, `/system/subscriptions`, `/roadmap`. Confidence levels reflect this.
- Components inside `app/(dashboard)/components/` and `components/` were not enumerated. Component-level fate is §6 work.
- `ChannelSubscriptions` (used in `/content-studio` analyse mode) was identified by name only — source not read.
- The portal repo (`invegent-portal`) was not inventoried — Layer 1/2 work is §8.
- API routes (`/api/run-digest`, `/api/compliance`, `/api/diagnostics`) were noted but not read.
- Edge Functions backing the agents (compliance-reviewer, ai-diagnostic, pipeline-doctor, format-advisor, etc.) were not inventoried — fate assumes existing functionality survives migration.
- All fate rationale assumes the locked IA in `00_overview.md` survives §3–§5 unchanged. If §3 Decision Criteria flips a foundational position, fate decisions in this table will need revision.
- The §2 re-scoping (PK redirected this section from "Operator workflow map" to "Target IA mapping") leaves `00_overview.md`'s 11-section table out-of-sync. Reconciliation deferred.
- Confidence labels are PK's-shoes assessments, not derived from a formal scoring rubric. §3 should commit a rubric.

---

*Created 2026-05-06 (Sydney). §2 of 11 in the dashboard architecture review. Inputs: §1 inventory, kickoff session record, 12 source reads enumerated above. Next: §3 Decision Criteria (or original Operator workflow map, depending on PK direction).*
