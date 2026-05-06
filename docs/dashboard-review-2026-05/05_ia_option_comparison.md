# §5 — IA Option Comparison

## Purpose

Define and evaluate three meaningfully different IA options against the §4 decision framework, then commit a recommended direction.

PK's standing instruction for this section: **do not default to the current locked IA without challenge.** At least one option must seriously question the 6-section structure, the role of Investigate, whether Reports is separate or embedded, and whether Now becomes the true operating system. This document does that.

## Section-numbering note (transparency)

In the kickoff structure §5 was "Recommended target IA" and §4 was "IA option comparison." After three earlier re-slottings (§2 Target IA Mapping, §3 Operator Workflow Map, §4 Decision Criteria), this section now carries both the option comparison and the recommendation. The original §5 "Recommended target IA" is absorbed here. `00_overview.md`'s 11-section table remains out-of-sync; reconciliation deferred per files-changed minimisation.

## How decisions are scored in this section

Per §4.5 (Decision Application Rules):

- **Principle veto.** Any P1–P7 violation removes the option from comparison.
- **Anti-pattern veto.** Any AP1–AP7 trigger removes the option.
- **Axis scoring.** A1–A7 each as HIGH (good) / MEDIUM / LOW. Aggregate informative, not decisive.
- **Trade-off application.** Default biases (T1–T6) win unless explicit countervailing evidence.
- **Migration cost.** A7 is a real veto when cost exceeds available capacity (Q3 unresolved — see §5.6).
- **"Good enough":** passes all 7 principles + clean on all 7 anti-patterns + ≤2 LOWs across axes + migration cost fits capacity.

Axis convention: HIGH = good (fast / low load / low risk / easy to find / few deps / adapts well / low cost); LOW = bad on that axis.

---

## 5.1 Three Candidate IAs

### Option A — Locked 6-Section IA (current proposal as committed in `00_overview.md`)

**Structure.**

```
NOW          (3): Overview, Inbox, Pipeline
CLIENTS      (4): All Clients, Feeds, Onboarding, Connect
CREATE       (2): Content Studio, Formats
INVESTIGATE  (4): Flow, Pipeline Log, Visual Pipeline, Agents
REPORTS  (1 nav, 3 tabs): Performance + Costs + Calibration
ADMIN        (4): Reviews, Compliance Rules, Subscriptions, Roadmap
```

~18 nav items. Six top-level sections. Reports gets a dedicated section because Calibration deserves promotion from inner tab to peer tab.

**Design intent.** Map the operator's loop stages onto sidebar sections directly: Now is the daily entry, Investigate is the diagnostic depth, Reports is the weekly cadence, Admin is the monthly cadence + ICE-level config. CREATE separates authoring from monitoring. CLIENTS centralises all per-client surfaces.

**What it solves.**

- Eliminates the hidden "Monitor" cluster that today couples 6 pages.
- Promotes Calibration from inner tab to peer tab in REPORTS — weekly cadence gets a clean home (P6).
- Splits the two-products-in-one-page violations (`/compliance`, `/performance`) into clean siblings.
- Promotes `/onboarding` to nav under CLIENTS (closes a discoverability gap).
- Conservative migration cost — closest to current dashboard structure.

**What it risks.**

- INVESTIGATE as a named section *invites* observability-first design. Each page within it must be policed against AP2 (observability without action) by §6 fate decisions — the structure does not enforce actionability.
- Cross-section handoff load is highest of the three options. Inbox absorbs from Compliance + Visuals + Agents + Drafts; Inbox → Admin Compliance Rules; Calibration → failed draft; Diagnostics → action. Each is a candidate for AP4 (cross-section dependency without linkage).
- Six sections + ~18 nav items is more than today's 5 sidebar groups + 16 items — cognitive load grows slightly.
- The track record: existing dashboard triggers 6 of 7 anti-patterns today. A relies on §6 discipline catching all of them next time — a thin guarantee.

### Option B — Operational Consolidation (INVESTIGATE folds into NOW)

**Structure.**

```
NOW          (7): Overview, Inbox, Pipeline, Flow, Pipeline Log, Visual Pipeline, Agents
CLIENTS      (4): All Clients, Feeds, Onboarding, Connect
CREATE       (2): Content Studio, Formats
REPORTS  (1 nav, 3 tabs): Performance + Costs + Calibration
ADMIN        (4): Reviews, Compliance Rules, Subscriptions, Roadmap
```

Five top-level sections. NOW becomes the operational section — daily entry through deep-investigation lives under one section. REPORTS and ADMIN preserve cadence-separate weekly and monthly homes.

**Design intent.** "NOW is where work happens" taken structurally. The operator's stages 1–4 (Entry, Review, Investigation, Action per §3) all live within NOW. Stage 5 (Reporting) is separate because its cadence is weekly, not daily. ADMIN is separate because its cadence is monthly. The hidden "Monitor" cluster that today couples 6 pages becomes the explicit internal nav of NOW.

This option directly questions the role of INVESTIGATE: instead of being a peer section, it becomes depth-within-NOW. The operator never has to decide "is this a Now problem or an Investigate problem?" — they're the same problem at different depths.

**What it solves.**

- Structurally addresses AP2 (observability without action). Operational and investigative pages side-by-side in the same section encourage operators to flow between them.
- Structurally addresses AP4 (cross-section dependency without linkage). Inbox → Pipeline Log handoff is intra-section, not cross-section. Pipeline Log → Inbox dead-item action item is intra-section.
- Structurally addresses AP5 (section-tab coupling). The current MONITOR_TABS coupling becomes legitimate internal nav of NOW — not a cross-section anti-pattern.
- Preserves cadence homes (REPORTS weekly, ADMIN monthly) so P6 holds.
- Clearer mental model: "daily work lives in NOW; trends in REPORTS; config in ADMIN".

**What it risks.**

- NOW with 7 nav items risks AP1 at the section level (multiple products under one heading). Mitigation: §6 may need to introduce internal grouping within NOW (e.g. expandable groups: "Daily" + "Investigate") — but this re-introduces the pattern Option A explicitly avoids.
- INVESTIGATE-as-explicit-section in A serves as a *signal* to the operator that this is where forensic work happens. B loses that affordance — forensic surfaces sit alongside daily ones, which can blur urgency.
- Calibration is less prominent than in A. REPORTS is still its home, but Calibration's link to auto-approver health (an agent surface) doesn't appear under "NOW > Agents" — cross-section pull from REPORTS into NOW for headline calibration metrics is needed.

### Option C — Brief-as-OS (Brief is the daily surface; sidebar is reference library)

**Structure.**

```
BRIEF (default landing; the daily operating surface)
  - Narrative briefing
  - Inbox (action items only)
  - Pipeline alerts
  - Agent status row
  - Action queue (requeue / acknowledge / one-tap)

SIDEBAR REFERENCE LIBRARY (collapsed by default; opt-in visits)
  - Clients   (directory + drill-down)
  - Create    (authoring tools)
  - Investigate (full observability — reference, not workflow)
  - Reports   (analytical, weekly cadence visit)
  - Admin     (config, monthly cadence visit)
```

One dominant surface (Brief) + five reference sections in a collapsed sidebar. The daily loop never leaves Brief.

**Design intent.** The most radical extension of locked decision 2: if Brief is real, why does the sidebar need a "Now" section at all? Now becomes Brief, not a section heading. Everything else exists for explicit reference visits, not daily flow.

This option directly questions all four of PK's challenges:
- **6-section structure:** eliminated. One operating surface + five reference sections.
- **Role of Investigate:** demoted from peer section to reference library. Investigation is forensic, not workflow.
- **Reports separate or embedded:** preserved as separate, but de-emphasised — Reports is a weekly reference visit, not a daily surface.
- **Now becomes the true operating system:** No — BRIEF becomes the operating system. "Now" as a section disappears because it would duplicate Brief.

**What it solves.**

- Strongest structural enforcement of every §4 principle. P2 (actionability) is enforced because Brief excludes purely observational items. P3 (workflow continuity) is enforced because the daily loop never crosses sections. P6 (cadence respect) is enforced because Brief is daily-only by structure; Reports is weekly by structure; Admin is monthly by structure.
- Maximum operator efficiency for the daily loop — one read + one tap.
- Brief-as-OS philosophy aligns with locked decision 2 (Brief on Telegram). Web Brief is the canonical version; Telegram Brief is the nudge to come read it.
- Anti-pattern resistance is highest. AP4 (cross-section dependency without linkage) basically can't happen because there are no daily cross-section flows.

**What it risks.**

- Highest migration cost. Brief surface doesn't exist; building it well is the primary work. Reference library reorganisation is also non-trivial.
- Highest product risk. If Brief is poorly designed, the operator falls back to sidebar reference — same as A's daily flow but with extra navigation overhead. Brief misfire = downside ceiling at "sidebar nav like today."
- Calibration trend visibility depends on operator habit (weekly Reports visit). If visits are skipped, A3 (error risk) inflates — a borderline-approval pattern climbing in Calibration goes unseen until next visit.
- Discoverability of action affordances within Brief is unproven. Brief design discipline is the load-bearing piece; designing Brief poorly retroactively breaks the IA premise.
- Brief itself becomes a candidate for AP1 (Brief tries to do too much). The bonus anti-pattern "Brief-as-firehose" from §4.4 is most likely to trigger here.

---

## 5.2 Evaluation against §4

### Option A scoring

**Principles check (§4.1).**

| Principle | A | Notes |
|---|---|---|
| P1 Operator-first | PASS | Sections named per operator concepts |
| P2 Actionability over observability | PASS-with-risk | INVESTIGATE invites observability-first; depends on §6 discipline per page |
| P3 Workflow continuity | PASS-with-risk | Highest cross-section handoff load of three options |
| P4 Web is workspace | PASS | No conflict |
| P5 Existing pages are evidence | PASS | Closest to current; preserves most surfaces with renames |
| P6 Cadence respect | PASS | Clean separation: NOW daily, REPORTS weekly, ADMIN monthly |
| P7 Auto-actions auditable | NEUTRAL | Doesn't structurally address; §6 dependent |

**Anti-pattern exposure (§4.4).**

| AP | A | Notes |
|---|---|---|
| AP1 Two products in one page | CLEAN-with-effort | Splits /compliance, /performance — IA-level OK if §6 holds |
| AP2 Observability without action | RISK | Highest of three; INVESTIGATE structure invites the pattern |
| AP3 Hidden critical actions in SQL | NEUTRAL | Not addressed by IA structure alone |
| AP4 Cross-section dependency without linkage | RISK | Highest of three; six sections create most handoffs |
| AP5 Section-tab coupling across IA-distant pages | TRIGGER → must remediate | MONITOR_TABS spans 6 pages now distributed across 4 sections (NOW, INVESTIGATE, REPORTS, ADMIN) — removal cost is highest of three options |
| AP6 Hardcoded reference data | NEUTRAL | Not addressed by IA |
| AP7 Silent auto-actions | NEUTRAL | Not addressed by IA |

**Axis scoring (§4.2).**

| Axis | A | Reason |
|---|---|---|
| A1 Speed to action | M | Six sections + ~18 items; daily flow crosses 2–3 sections |
| A2 Cognitive load | M | Six section-models; INVESTIGATE adds named depth |
| A3 Error risk | H | Calibration peer-tab visibility supports weekly review habit |
| A4 Discoverability | M | Section names match operator concepts; ~18 items growing |
| A5 Cross-section dependency | L | Highest dep load of three; AP4 risk vector |
| A6 Automation compatibility | M | Inbox shape doesn't enforce, but doesn't break |
| A7 Migration cost | H | Lowest cost of three (closest to today) |

**Aggregate: 2H / 4M / 1L.** Passes "≤2 LOWs" gate.

**Trade-offs (§4.3).**

- T1 (consolidation vs clarity): Inbox absorbs multiple types — default supports A's Inbox shape.
- T3 (power vs simplicity): A keeps backlog/daily distinct via section nav — default OK.
- T4 (real-time vs stable): Cleanest separation — NOW real-time, REPORTS stable, ADMIN stable.
- T6 (visualisation vs row table): Flow + Pipeline Log both under INVESTIGATE — default "keep both" preserved with clean handoff.

### Option B scoring

**Principles check.**

| Principle | B | Notes |
|---|---|---|
| P1 Operator-first | STRONG PASS | NOW is structurally the operator's section |
| P2 Actionability over observability | STRONG PASS | Operational + investigative pages co-located — structural enforcement |
| P3 Workflow continuity | PASS | Daily loop within NOW; cross-section only on cadence boundaries |
| P4 Web is workspace | PASS | No conflict |
| P5 Existing pages are evidence | PASS | Same pages preserved, different parent section |
| P6 Cadence respect | PASS | REPORTS preserved as weekly home; ADMIN as monthly home |
| P7 Auto-actions auditable | PASS | Pipeline-doctor surfacing within NOW Pipeline Log |

**Anti-pattern exposure.**

| AP | B | Notes |
|---|---|---|
| AP1 Two products in one page | RISK at section level | NOW with 7 nav items risks becoming "NOW does too many things" — manageable with internal grouping but creates a sub-pattern |
| AP2 Observability without action | CLEANER | Co-location reduces the structural invitation to AP2 |
| AP3 Hidden critical actions in SQL | NEUTRAL | Same as A |
| AP4 Cross-section dependency without linkage | REDUCED | Most former cross-section flows become intra-NOW |
| AP5 Section-tab coupling | CLEANER REMEDIATION | MONITOR_TABS becomes legitimate NOW internal nav rather than cross-section coupling |
| AP6 Hardcoded reference data | NEUTRAL | Same as A |
| AP7 Silent auto-actions | NEUTRAL | Same as A |

**Axis scoring.**

| Axis | B | Reason |
|---|---|---|
| A1 Speed to action | H | Five sections; daily flow within NOW; one section transition for trends |
| A2 Cognitive load | H | Five sections vs six; "daily/weekly/monthly" maps directly to NOW/REPORTS/ADMIN |
| A3 Error risk | H | Calibration in REPORTS preserves weekly visibility |
| A4 Discoverability | H | Fewer sections; clearer mental model |
| A5 Cross-section dependency | M | NOW absorbs most former cross-section deps; some remain (NOW ↔ ADMIN, NOW ↔ REPORTS) |
| A6 Automation compatibility | M | Inbox shape inside NOW doesn't structurally enforce, similar to A |
| A7 Migration cost | M | Higher than A (page parent reorganisation, internal NOW nav design) but bounded — same pages, different homes |

**Aggregate: 4H / 3M / 0L.** Passes "≤2 LOWs" gate. Best aggregate of three options.

**Trade-offs.**

- T1 (consolidation): NOW consolidates operational surfaces — default strongly supports B.
- T3 (power vs simplicity): Daily Inbox stays simple within NOW; backlog filters via NOW > Inbox internal affordances. OK.
- T4 (real-time vs stable): Real-time on NOW pages, stable on REPORTS — clean.
- T6 (visualisation vs row table): Flow + Pipeline Log both within NOW — cross-link can be tighter than in A; default supported.

### Option C scoring

**Principles check.**

| Principle | C | Notes |
|---|---|---|
| P1 Operator-first | STRONGEST PASS | Brief is literally designed around the operator's morning entry |
| P2 Actionability over observability | STRONGEST PASS | Brief by definition surfaces actionable items only |
| P3 Workflow continuity | STRONGEST PASS | Daily loop never crosses sections |
| P4 Web is workspace | PASS | Brief on web is canonical; Telegram is nudge per locked decision 2 |
| P5 Existing pages are evidence | PASS | Pages preserved as reference library content |
| P6 Cadence respect | STRONGEST PASS | Cadences enforced by structure (Brief = daily; Reports = weekly visit; Admin = monthly visit) |
| P7 Auto-actions auditable | PASS | Brief surfaces auto-action events as ack queue |

**Anti-pattern exposure.**

| AP | C | Notes |
|---|---|---|
| AP1 Two products in one page | RISK at Brief level | Brief tries to integrate Brief narrative + Inbox + alerts + agent status + action queue — the bonus anti-pattern "Brief-as-firehose" from §4.4 is highest risk here |
| AP2 Observability without action | CLEANEST | Reference library is opt-in; Brief excludes observability-only items |
| AP3 Hidden critical actions in SQL | NEUTRAL | Not structurally addressed |
| AP4 Cross-section dependency without linkage | CLEANEST | Daily loop is single-surface |
| AP5 Section-tab coupling | CLEANEST | No section coupling possible — sidebar is reference, not workflow |
| AP6 Hardcoded reference data | NEUTRAL | Same as A, B |
| AP7 Silent auto-actions | CLEANEST | Brief explicitly surfaces auto-action ack queue |

**Axis scoring.**

| Axis | C | Reason |
|---|---|---|
| A1 Speed to action | H | Brief is one read + one tap |
| A2 Cognitive load | H | Daily mental model is just "Brief"; reference library is on-demand recall |
| A3 Error risk | M | Calibration trend visibility depends on weekly habit; if visits skipped, error risk rises |
| A4 Discoverability | M | Brief is highly discoverable; reference library per-page discoverability uncertain |
| A5 Cross-section dependency | H | Lowest dep load of three options |
| A6 Automation compatibility | H | Brief shape adapts to backlog vs cleared state by definition (it surfaces what's left) |
| A7 Migration cost | L | Brief is from-scratch; reference library reorganisation; product risk on top |

**Aggregate: 4H / 2M / 1L.** Passes "≤2 LOWs" gate.

**Trade-offs.**

- T1 (consolidation): Brief is maximum consolidation — default strongly supports C.
- T3 (power vs simplicity): Brief is maximum simplicity for daily; reference library provides power on demand — default strongly supports C.
- T4 (real-time vs stable): Brief is stable per session; sidebar reference can be either — cleanest of three.
- T6 (visualisation vs row table): Both live in Investigate reference library — cleanest separation but loses operational urgency.

### At-a-glance comparison

| Dimension | Option A | Option B | Option C |
|---|---|---|---|
| **Sections** | 6 | 5 | 1 (Brief) + 5 reference |
| **Total nav items** | ~18 | ~18 | Brief + 5 sidebar groups |
| **Daily loop crosses sections?** | Often | Rarely | Never |
| **Principle violations** | 0 (with risk on P2, P3) | 0 | 0 |
| **Anti-pattern triggers** | AP5 high (must remediate); AP2/AP4 risk | AP1 risk at NOW level | AP1 risk at Brief level |
| **Axis aggregate (H/M/L)** | 2/4/1 | **4/3/0** | 4/2/1 |
| **Migration cost** | Lowest | Moderate | Highest |
| **Product risk** | Lowest | Moderate | Highest |
| **Aligns with locked decision 2 (Brief)** | Brief lives on Overview | Brief lives on NOW > Overview | Brief IS the surface |
| **Aligns with locked decision 1 (staged migration)** | Strongest | Moderate | Weakest |

---

## 5.3 Comparative analysis (no hedging)

### Best for operator workflow (§3)

**Winner: B and C tied; A trails.**

- C wins on the daily loop in isolation (entry through action without leaving Brief).
- B wins on the full operator workflow including investigation and trend review (NOW absorbs investigation; REPORTS preserves weekly trend habit).
- A trails because the daily flow crosses sections more often (Overview → Inbox → Investigate > Pipeline Log → back to Inbox → Admin > Compliance Rules) and each crossing is a P3 friction point.

### Minimises critical risks

**Winner: B.**

- Critical risks identified across §3: action gap (CRITICAL severity at requeue dead item), broken handoffs, cross-section dependency without linkage, silent auto-fixes, alert fatigue.
- A doesn't structurally address any of these — leaves them to §6 discipline. Track record of §6 discipline is poor (6 of 7 anti-patterns triggered today).
- B structurally addresses 3 of 7 anti-patterns (AP2, AP4, AP5) by collapsing INVESTIGATE into NOW. Reduces risk surface meaningfully.
- C structurally addresses more anti-patterns but introduces a new dominant risk (Brief misfire), which is itself critical because Brief becomes the only daily surface.

### Reduces action gap

**Winner: C, then B, then A.**

- C's Brief explicitly surfaces actionable items — the action gap from §3 cannot survive a Brief that excludes non-actionable signals.
- B's NOW co-locates investigation and operation, which encourages adding action affordances (requeue / retry / ack) to the surfaces that need them.
- A's INVESTIGATE-as-section preserves the structural separation between "see the problem" and "do something about it" — the action gap is most likely to persist.

None of the three options structurally guarantees the missing affordances (requeue dead item, retry render, etc.) get built. Q5 from §4 (capacity reservation for anti-pattern remediation) gates this regardless of IA choice.

### Avoids known anti-patterns

**Winner: C marginally over B; A trails.**

- C has the strongest structural anti-pattern resistance EXCEPT for AP1 at the Brief level (Brief-as-firehose).
- B has cleaner anti-pattern resistance than A on AP4 + AP5; comparable on the rest.
- A inherits the most legacy anti-pattern remediation work (AP5 across 6 pages, plus AP2 / AP4 vigilance per page).

**Important distinction:** anti-pattern *avoidance* in design ≠ anti-pattern *remediation* in current code. All three options pay the same remediation cost on AP5, AP6, AP7 because those exist in the current dashboard regardless of target IA.

---

## 5.4 Recommended IA Direction: **Option B**

### Why B wins

B is the strongest synthesis of operator-workflow optimisation, structural anti-pattern resistance, and bounded migration cost. The decision rests on three load-bearing observations:

**1. Track record of §6 discipline is poor.** The current dashboard triggers 6 of 7 anti-patterns. Surviving renovation requires *structural* enforcement of the principles in §4, not faith in §6 catching everything. A relies on faith. B structurally enforces P2 (actionability), P3 (workflow continuity), and resists AP2, AP4, AP5 by collapsing INVESTIGATE into NOW.

**2. C's product risk concentrates the bet too narrowly.** Brief-as-OS is the right philosophical extension of locked decision 2, but it makes Brief the load-bearing piece of the entire daily loop. If Brief is poorly designed, the fallback is sidebar navigation — i.e. a worse version of A. The downside ceiling is acceptable, but the *upside* of C is gated entirely on Brief design quality, which is unproven. B captures most of C's principle benefits (P2, P3 stronger; P6 same) without putting all weight on Brief.

**3. Migration cost difference between A and B is small; benefit difference is large.** B's migration cost is higher than A only because page parent reorganisation and internal NOW nav design require thought. The same pages are kept; the same MONITOR_TABS removal cost applies; the same hardcoded-data cleanup applies. The marginal cost of B over A is bounded — perhaps one extra phase in §10. The benefit — 4H/3M/0L axis aggregate vs A's 2H/4M/1L, plus structural anti-pattern resistance — is meaningful.

**Citing §4:** B PASSES all P1–P7. CLEAN on AP4, AP5; RISK at AP1 (NOW overload) but mitigable with internal NOW grouping. Axis aggregate beats A and matches C without C's migration cost. T1 and T3 default biases (consolidation, simplicity-for-daily) align. T4 and T6 default biases preserved.

### Compromises being accepted

- **NOW with 7 nav items risks AP1 at section level.** §6 must commit on NOW internal organisation — flat list, expandable groups, or progressive disclosure. The current expectation is some form of internal grouping ("Daily" + "Investigate" labels within NOW), which re-introduces a sub-section pattern. This is acceptable because it lives within one parent section rather than splitting workflow across two.
- **Calibration is in REPORTS, not under an Agents-status home.** Auto-approver health visibility is preserved by REPORTS' weekly cadence prominence. Headline calibration metrics (e.g. pass-rate trending down) bubble up to NOW > Overview agent-status row, but the deep view stays in REPORTS. Acceptable because P6 (cadence respect) wins.
- **INVESTIGATE-as-explicit-signal disappears.** A's named INVESTIGATE section tells the operator "this is forensic depth." B fuses forensic and operational. This is intentional — operator stops asking "is this a Now problem or an Investigate problem?" — but loses an affordance for deliberate forensic work. §6 should consider whether Pipeline Log (the deepest forensic surface) gets visual differentiation within NOW.
- **Brief surface lives within NOW > Overview, not as a top-level surface.** This compromises C's strongest insight. §6 should preserve Brief design discipline (one read + one tap; agent status row; action queue) within NOW > Overview, even though Brief is not its own section.
- **Migration cost is moderate, not lowest.** Q3 from §4 (capacity envelope) is unresolved — B's recommendation is contingent on PK confirming that moderate migration cost fits available capacity. If capacity is genuinely tight, A is the fallback.

### What §6 must handle to make B viable

1. **Symptom → surface routing within NOW.** Every incident type (stuck queue / dead item / failed render / agent recommendation / drift detection / token expiry / compliance alert) must have a single landing page within NOW. §6 commits this routing table.
2. **NOW internal organisation.** Flat 7-item list vs grouped sub-nav (Daily / Investigate) vs expandable groups vs progressive disclosure. PK direction needed.
3. **Brief surface scope within NOW > Overview.** Locked decision 2 says Brief on Telegram. Web Brief design — narrative + agent status + action queue — lives in NOW > Overview. Define Brief content scope; commit overlap (or not) with the rest of NOW > Overview's zones.
4. **Pipeline state-machine reframe (Open Decision 2 from `00_overview.md`).** Drives `/queue` fate within NOW > Pipeline.
5. **Section-tab elimination plan.** MONITOR_TABS removed across 6 page files; replaced with NOW internal nav. Sequencing in §10.
6. **Hardcoded-data remediation as gating.** Schema-level NDIS+PP fields require a migration; §6 commits whether this gates the IA migration ship or follows.
7. **Inbox shape inside NOW.** Q1 from §4 (consolidation vs clarity for typed exceptions) needs a commit before Inbox absorbs Compliance + format-advisor + agent annotations.
8. **Layer 1/2 boundary on Performance (Open Decision 5 from `00_overview.md`).** REPORTS in B preserves Performance as ops-only after portal split; §8 commits the boundary.
9. **Reviews placement (Open Decision 3 from `00_overview.md`).** B keeps Reviews under ADMIN; §6 commits or revisits.
10. **Roadmap fate (Open Decision 4 from `00_overview.md`).** B keeps Roadmap under ADMIN as default; §6 commits.
11. **Symptom routing from Overview «quick stat» cards.** Today the cards link to /queue + /monitor; under B they should link by symptom into NOW > Pipeline / Pipeline Log / Flow as appropriate.
12. **Agent status row design.** Per-agent status cards on NOW > Overview, seeded by the existing PipelineHealthCard pattern but expanded.

---

## 5.5 Rejected Options

### Option A — Locked 6-section IA

**Why rejected.** A is defensible but loses to B on three of the load-bearing axes (A1 speed to action, A2 cognitive load, A4 discoverability) and on structural anti-pattern resistance (AP2, AP4, AP5). The argument for A is migration cost — it is closest to today — but the marginal cost of B over A is bounded (page parent reorganisation, NOW internal nav design), while B's marginal benefit is meaningful (4H aggregate vs 2H, structural enforcement of three principles).

The deeper rejection is that A relies on §6 discipline catching every anti-pattern next time. The current dashboard triggers 6 of 7 anti-patterns despite being designed by the same team. Faith-based architecture is a poor risk model.

**What A got right (preserve in B's §6 work).**

- Section-naming clarity: Now / Investigate / Reports / Admin map to operator concepts. B keeps the same names where they survive (NOW, REPORTS, ADMIN); INVESTIGATE folds into NOW but its named pages (Flow, Pipeline Log, Visual Pipeline, Agents) preserve the concept.
- Calibration promotion to peer tab: B preserves this. Best decision in A; carry forward.
- /onboarding promotion to nav under CLIENTS: B preserves. Closes a discoverability gap regardless of IA shape.
- Compliance + Performance + Visuals split decisions: B preserves. Two-products-in-one-page anti-pattern fixes apply identically.
- Conservative migration philosophy: B inherits via locked decision 1.

### Option C — Brief-as-OS

**Why rejected.** C's principle scoring is strongest. Its anti-pattern resistance is strongest (except AP1 at Brief). Its operator-workflow alignment is highest for the daily loop. And yet:

1. **Brief is unproven.** Designing Brief well is the load-bearing piece. We have no design specification, no precedent within the codebase, no prior LLM-narrative-briefing surfaces, and no operator-shoes pressure-test. Recommending C means betting v1 on a surface that hasn't been drafted.
2. **Migration cost is highest.** A7 LOW score is real. §4 Q3 (capacity envelope) is unresolved; recommending C without resolving Q3 is gambling on capacity that hasn't been quantified.
3. **Calibration trend visibility relies on operator habit.** Weekly Reports visit must happen for A3 (error risk) to stay HIGH. Habit-based architecture is fragile when the operator is solo and time-constrained.
4. **The downside ceiling is acceptable but the upside is gated.** If Brief misfires, fallback is sidebar nav — not catastrophic. But the *upside* of C is entirely conditional on Brief design quality. The risk-adjusted return is worse than B.

**What C got right (preserve in B's §6 work).**

- **Brief-as-OS philosophy.** B should bring this discipline into NOW > Overview design even though Brief is not a top-level section. §7 (Brief + Telegram channel plan) is where this lives.
- **Reference library framing.** When §6 fates investigation surfaces within NOW, the framing should be "these pages are forensic reference; they are visited deliberately, not by accident." Resists AP2 (observability without action) drift.
- **Cadence enforcement as structure, not convention.** B preserves REPORTS and ADMIN as cadence-separate; §6 should resist any attempt to fold their content into NOW for convenience.
- **Sidebar discipline (fewer items, on-demand visit).** Even within B, NOW with 7 items pushes the sidebar count up. C's discipline argues for collapsing further where possible — e.g. Diagnostics-as-Agents-section may not need its own NOW entry if Pipeline Log can absorb the Tier 2 reports.
- **Brief excludes purely observational signals.** When designing the agent status row on NOW > Overview, the items shown should be exception-worthy, not status-of-everything. AP2 resistance.

---

## 5.6 Open Questions blocking §6

Only questions that block final IA commitment AND must be resolved before §6 page-fate decisions can be locked. §3 and §4 open questions are not duplicated here.

### Q1 — NOW internal organisation under Option B

NOW with 7 nav items (Overview, Inbox, Pipeline, Flow, Pipeline Log, Visual Pipeline, Agents) approaches sidebar-overload. Three shapes:

- **(a) Flat list of 7.** Simplest; risks AP1 at section level.
- **(b) Grouped sub-nav within NOW.** E.g. "Daily" group (Overview, Inbox, Pipeline) + "Investigate" group (Flow, Pipeline Log, Visual Pipeline, Agents). Re-introduces the sub-section pattern Option A explicitly avoids, but contained within one parent.
- **(c) Progressive disclosure.** Overview / Inbox / Pipeline visible by default; Flow / Pipeline Log / Visual Pipeline / Agents under expandable "Investigate" toggle. Hybrid of (a) and (b).

**Why blocker.** §6 cannot commit page-by-page fates within NOW until shape is known.

**Proposed resolution.** PK direction. Default if no preference: (b) grouped sub-nav, because it preserves the "Investigate" mental affordance from Option A inside NOW.

### Q2 — Brief surface scope within NOW > Overview

Brief on Telegram is locked. Web Brief design (narrative + agent status row + action queue) lives in NOW > Overview, but its content scope vs the existing zones (drafts-to-review card, open-incidents card, schedule, quick stats) is unclear. Three shapes:

- **(a) Brief replaces the card zones.** Brief narrative integrates everything; cards retire.
- **(b) Brief sits above the card zones.** Brief is the integrative summary; cards remain as quick affordances.
- **(c) Brief is on Telegram only; web Overview keeps cards.** Web has no Brief surface.

**Why blocker.** Brief surface design quality is the load-bearing piece B inherits from C's philosophy. Without committing scope, NOW > Overview design is unconstrained.

**Proposed resolution.** PK direction. Default if no preference: (b), because cards offer one-tap affordances that Brief narrative cannot.

### Q3 — Pipeline state-machine reframe (Open Decision 2 from `00_overview.md`)

Does NOW > Pipeline replace `/queue` as a state-machine view, or coexist with the row-level table?

**Why blocker.** Drives `/queue` fate within NOW. §2 fated `/queue` as Rename-or-Replace with LOW confidence pending this decision.

**Proposed resolution.** PK direction. Default if no preference: replace; row-level table moves to NOW > Pipeline Log as the forensic counterpart.

### Q4 — Inbox shape (Q1 from §4 carried forward)

Flat single-list Inbox vs typed sub-tabs (drafts / policy alerts / format escalations / agent annotations). §4 default bias is consolidation; T1+T3 collide. Resolution belongs here because Inbox shape gates §6 fates for `/compliance` review queue, `/visuals` format-advisor escalations, and future agent annotation routing.

**Why blocker.** Three different §6 fate decisions depend on this.

**Proposed resolution.** PK direction. Default if no preference: flat list with severity sort + filter chips for type. Re-evaluate post-ship if scanning fragments.

### Q5 — Capacity envelope for migration (Q3 from §4 carried forward)

Migration cost (A7) is a real veto. B's recommendation is contingent on "moderate migration cost fits available capacity." Without quantifying capacity, A7 is hand-waved.

**Why blocker.** If capacity is tight, A is the fallback. §6 fate decisions and §10 migration sequencing both need a capacity envelope.

**Proposed resolution.** PK confirms a per-phase envelope (chat hours / migrations / EF deploys / page rewrites). Default if no preference: 8–12 chat hours per phase, 2–3 migrations max per phase, 1–2 page rewrites per phase, ship-blocker anti-patterns prioritised.

### Q6 — Anti-pattern severity ordering (Q2 from §4 carried forward)

AP1–AP7 are vetoes for new design. The current dashboard triggers six. §10 needs to know which existing-system instances must be fixed before B's IA migration ships, vs which can ship-and-fix.

**Why blocker.** §6 fate decisions can only commit if "ship-blocker / ship-and-fix" is known per anti-pattern instance.

**Proposed resolution.** §6 introduces a tag per anti-pattern instance. Default if no preference: AP3 (hidden critical actions in SQL — specifically requeue dead item) is ship-blocker. AP6 (hardcoded NDIS+PP schema) is ship-blocker because the schema columns survive into the new IA. AP5 (MONITOR_TABS removal) is ship-blocker per page touched. Others ship-and-fix.

---

## Honest limitations

- The three options are designed to be meaningfully different but are not exhaustive. A fourth option (e.g. "per-client cockpit" — sidebar shape is one entry per client, with global settings as a separate section) was sketched but eliminated in early drafting because it conflicts with locked decision 3 (agents as status, not colleagues) by treating clients as colleagues.
- Axis scoring is operator-shoes assessment, not derived from a quantitative rubric. §4 explicitly accepts this; §5 inherits the limitation.
- The Option C product-risk argument depends on "Brief is unproven." If PK signals readiness to invest in a Brief design specification before §6, C re-enters the running. The recommendation is not foreclosed against C; it is contingent on capacity and design effort that hasn't been authorised.
- Option B's NOW-with-7-items risk depends on Q1 resolution. If the honest answer to Q1 is "7 flat items is fine," B is unambiguously the right answer. If the honest answer is "7 items requires sub-nav that re-introduces complexity," B's advantage over A narrows.
- All three options assume the locked decisions in `00_overview.md` survive (strategic renovation; web-as-workspace; agents-as-status MVP). If any of those decisions are revisited, the option scoring needs revision.
- Migration cost (A7) is the softest axis. Q5 above resolves it. Until resolved, B's recommendation carries an asterisk.
- Comparison favourable to B may reflect an availability bias — B keeps more of the locked IA's structure than C does, which makes B's downside easier to imagine. C's actual upside is harder to imagine because Brief is unbuilt. Honest acknowledgement: if Brief turns out to be excellent, C is the right answer in retrospect. The recommendation reflects risk-adjusted current-best-bet, not certainty.
- Layer 2 (portal) considerations are deferred to §8. Several B vs C distinctions (e.g. cross-section Reports embedding) may shift when Layer 1/2 boundary is committed.
- Cowork (autonomous brief execution) is not an operator surface and was not factored into IA option design. If Cowork's role expands to dashboard-driven, IA assumptions revisit.

---

*Created 2026-05-06 (Sydney). §5 of 11 in the dashboard architecture review. Inputs: kickoff session record, `00_overview.md`, `01_current_state_inventory.md`, `02_target_ia_mapping.md`, `03_operator_workflow_map.md`, `04_decision_criteria.md`. No new source reads this session. Recommendation: **Option B — Operational Consolidation** (subject to PK confirmation on Q1–Q6). Next: §6 Page-by-page fate.*
