# ICE Dashboard Gap Debrief — read-only (2026-06-12)

> **Session record.** Read-only dashboard gap debrief per CCH directive 2026-06-12. No build approved by this record. Documentation-only commit — 0 code / 0 UI / 0 DB / 0 migration / 0 deploy / 0 backfill / 0 classifier change / 0 Advisor change / 0 Option C reconnection / 0 register update.
>
> State read at session start: `00_sync_state.md` v3.36 (classifier v2 repair applied + validated 2026-06-12), `00_action_list.md` v3.36, `invegent-dashboard` route inventory + spot-checks (`app/(dashboard)/` listing; `performance/page.tsx` read).

---

## A. Current dashboard state

`invegent-dashboard` has 26 routes. Operationally relevant:

- **Monitor section** (tabbed): Flow, Pipeline, Visuals, Compliance, AI Costs, Performance
- **Performance**: FB engagement (per-client reach/reactions/shares, format breakdown, top 20 posts — gated behind a "Standard Access" collapse) + Approval Patterns tab (auto-approver gates, per-client pass rates, weekly trend)
- **Operations**: friction register with filter bar + 5 saved views (cc-0015 Stage B) + `/operations/pools` Repair Board v0
- **ef-drift**: EF deploy/repo drift register
- **Failures, queue, drafts, inbox, pipeline-log, diagnostics**: pipeline state surfaces
- **Clients, connect, feeds, content-studio, system/subscriptions, costs, roadmap, reviews**

Strengths: pipeline plumbing (drafts/queue/failures), friction register, EF drift, approval analytics, FB engagement.

## B. Dashboard gaps

1. **Zero classifier visibility.** The +9 telemetry columns landed 2026-06-12 (v3.36); nothing reads them. Nobody can see v1 vs v2 counts, rule_matched vs defaulted, or class distribution — the exact blindness that let 92.4% analytical flattening run undetected.
2. **Zero Advisor visibility.** v3.34 proved ai-worker `callFormatAdvisor` is the *final* format decision-maker and routinely overrides the slot fill — yet no panel shows override rate, direction, or the avatar A2 exception. `advisor_would_have` exists only as prose in draft_format.
3. **No format-mix view.** Format distribution by client/platform/time doesn't exist anywhere (F-FORMAT-MIX-UNWIRED). The performance page has format breakdown *of engagement* only — and its FORMAT_LABELS map doesn't include `video_short_avatar`, `image_quote_*` variants or slides, so avatar rows render as raw codes.
4. **Render health partial.** `m.post_render_log` (1,484 creatomate + heygen rows now flowing) has no panel — failure rates, provider errors, retry patterns, credits_used null-rate invisible.
5. **Chain health gaps.** The Failures panel keys on `dead_reason` — which is exactly why CFW compliance skips false-alarmed for 5 weeks (v3.32: the reason lives in `draft_format.compliance_skip/reason`, not `dead_reason`). Stuck/orphan chains (advisor-respin orphan slides, YT queue orphans) have no surface.
6. **Performance coverage blind spots.** No staleness indicator (NY-fb insights stopped 2026-05-23, found only via a friction pass); 62 YouTube rows exist but the page is FB-only framed; no per-platform coverage map.
7. **No policy/Option C readiness view** — mix-table legality (~19% illegal cells), policy freshness, blocked-status. Lower urgency since Option C is parked until the gate.

## C. Audit findings not currently visible

- Defaulted-vs-rule-matched conflation (62/70 of the backfilled analytical rows were *defaults*, not classifications)
- ~4,371 remaining v1 rows
- Advisor override behaviour and the A2 hardcode (slot says image_quote → published as text/stat)
- Avatar share (~8%/12%) and which avatar identity was used (`avatar_identity` telemetry now live, unviewed)
- HeyGen render outcomes; provider error/retry patterns
- CFW/Invegent intentional-skip volume (false "silent loss")
- Insights staleness per client×platform
- FB photo HTTP 500 transient pattern on PP

## D. Recommended panels

- **A. Classifier v2 Health — build.** Highest leverage; telemetry is fresh and the review gate (w/c 2026-06-15) needs it. All read from `f.canonical_content_body` new columns. Show v1/v2 split, class distribution, rule_matched vs defaulted (esp. defaulted-analytical count), top firing rules, underused classes, body_available/insufficient_content rates, matched_rule_name drill.
- **B. Advisor Override — build.** Direct evidence input to the A2/format-policy fork (the gating decision). Slot format vs final format, override yes/no, rate by client/platform, direction matrix. Caveat: rationale is prose-only in draft_format — surface what's stored, don't pretend structure exists.
- **C. Format Mix — build.** Cheap (group-by over post_draft/post_publish), feeds both the Option C gate and monotony detection. Fix FORMAT_LABELS to cover all live formats while in there.
- **D. Pipeline Health — extend, don't build.** Failures/queue/pipeline-log mostly cover it. The genuine gaps: stuck/orphan chain detection and an intentional-skip vs failure split (read `draft_format.compliance_skip`).
- **E. Render Health — build small.** One table over `m.post_render_log`: count by format/provider, failure rate, credits_used null-rate, `avatar_identity` populated-rate. The avatar_identity column directly arms the review gate.
- **F. Performance Visibility — extend.** Add a per-client×platform freshness rollup (latest collected_at, stale flag >72h) to the existing Performance page; acknowledge YouTube rows.
- **G. Policy/Option C Readiness — do not build yet.** Option C is a parked reference hypothesis; a readiness panel pre-empts a decision PK hasn't made. One-off SQL at the gate suffices.

## E. Weekend MVP scope

**MVP (build):**

1. Classifier v2 Health panel (Panel A) — full
2. Advisor Override panel (Panel B) — slot-vs-final + override rate; matrix only if time allows
3. Format Mix panel (Panel C) — client × platform × format, 30/90d toggle
4. FORMAT_LABELS completion (trivial, fold into C)

**Nice-to-have (next):** Render Health table (E); insights freshness strip on Performance (F); intentional-skip split in Failures (D).

All MVP work is read-only SELECTs via existing server-action patterns — no migration needed *if* read paths exist. Flag for CCD: `f.*` is not PostgREST-exposed, so Panel A likely needs either a `public` SECURITY DEFINER read RPC (separate gated migration, D-01) or the established service-role server-route pattern. That RPC is the one possible DB artefact in the weekend scope and should be scoped first.

## F. Non-goals this weekend

No Option C/policy panel, no Advisor logic changes, no classifier backfill, no reclassify trigger buttons, no mutation surfaces of any kind (read-only panels only), no v1 backfill UI, no avatar selection changes, no render retry actions, no new cron, no schema beyond an optional read-RPC.

## G. Handoff notes for CCD

- **Panel A source:** `f.canonical_content_body` — `classifier_version`, `content_class`, `classification_method`, `matched_rule_id/_name/_priority`, `matched_signal`, `input_used`, `body_available`, `defaulted`, `insufficient_content`. Aggregate by class × method; split v1/v2; defaulted-analytical is the headline number. Verify exact column names against the live schema pre-build (L-v2.85-a class).
- **Panel B source:** `m.post_draft.draft_format` (advisor outputs, `advisor_would_have` prose) joined to slot format preference (`m.slot` / fill-attempt lineage per the v3.34 trace audit). Override = slot format ≠ final `recommended_format`.
- **Panel C source:** `m.post_draft`/`m.post_publish` group-bys; respect the v3.33 lesson — avatar realised output = YouTube `video_status`+`youtube_video_id`, not social approval_status.
- **Read path:** mirror the cc-0020 pattern — `public.*` SECURITY DEFINER read RPCs, service_role-only EXECUTE, `search_path=''`, STABLE; sql_destructive D-01 + PK phrase for the migration; or a service-role server route if no new function is needed.
- Place panels under the Monitor tab group; follow Slice 0A tokens; CCB visual pass before merge; standard FF-merge → Vercel flow.

---

## Verdict

**Is the dashboard currently sufficient for ICE operations? No.**

It's strong on pipeline plumbing and friction, but every major finding of the last two weeks (classifier flattening, defaulted conflation, advisor overrides, CFW false silent-loss, NY-fb insights staleness) was found by manual audit, not by the dashboard. The decision-layer (classify → advise → format) is operationally invisible, and that's where the open decisions sit.

Authority impact:
none
