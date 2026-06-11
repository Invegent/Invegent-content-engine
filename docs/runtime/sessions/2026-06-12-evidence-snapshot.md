# ICE Evidence Snapshot — 2026-06-12

**Directive:** ICE Evidence Snapshot Directive (PK, 12 June 2026). Read-only discovery only.
**Snapshot taken:** 2026-06-12 ~06:15 Sydney (directive nominated 6:00 PM; executed at session time — noted honestly, not material to a state snapshot).
**Executed by:** CCH (read-only `execute_sql` + GitHub reads only).
**Production effect:** 0 migrations / 0 data writes / 0 policy / 0 slot / 0 render / 0 publisher / 0 cron changes / 0 provider calls.

---

## 1. Avatar telemetry — status: **INSUFFICIENT** (but accruing correctly)

- **Avatar drafts (all-time, `recommended_format='video_short_avatar'`): 28** — NY 14 (9 published, 2 generated Apr-stale, 2 pending-but-rejected, 1 archived_stale), PP 13 (all published), CFW 1 (Instagram, failed — single anomaly: avatar format on a non-YouTube platform, 2026-06-01).
- **22 published avatar drafts, 22/22 carry `youtube_video_id`** (realised rate now 100% — up from the v3.33 18/22 read).
- **`m.post_render_log` heygen rows: 4** (all succeeded, 10–11 June, ~30 min render duration each). **Meaningful `avatar_identity` payloads: 2** (the 11 June pair; the 10 June pair pre-dated/part-populated v2.1.1).
- **Presenter selection (the 2 telemetry rows):**
  - PP 11 Jun 08:00 → `talking_photo 47a5c85c…` = **“Tenant (Realistic)”** (PP-owned avatar, role `tenant`).
  - NY 11 Jun 10:00 → `talking_photo b3a7e888…` = **“Alex — NDIS Participant (Realistic)”** (NY-owned avatar, role `participant`).
- **Brand-appropriateness:** both selections are **client-correct** (no cross-client wrong-presenter case observed). Both `avatar_selected_by = "fallback_limit1"` and `stakeholder_role = null` — confirming in production telemetry that selection is still **arbitrary-first LIMIT 1** and ai-worker still never emits a role, despite a 29-avatar role-tagged inventory (NY 14 active, PP 14 active across 7 roles × 2 styles each, +CFW none).
- **Concentration:** avatar usage is YouTube-only in practice (1 CFW IG anomaly), NY+PP only, 1 render/client/day cadence → **telemetry accrues ≈2 rows/day**.
- **Is `avatar_identity` telemetry sufficient for decision-making?** Not yet on volume (n=2). More importantly: **waiting will not produce role-fit evidence** — every future row will read `fallback_limit1 / role null` until ai-worker emits `stakeholder_role`. Time fixes sample size of *which face was used*; it cannot produce evidence about *role-appropriate selection*, which is an instrumentation/wiring gap, not a runtime-volume gap.

## 2. Classifier accuracy — status: **INSUFFICIENT** (concentration finding; no ground truth)

- 30-day `f.canonical_content_body`: **1,631 rows, 0 unclassified**, all `classifier_version=v1`.
- **Class distribution: `analytical` 1,507/1,631 = 92.4%.** Others: educational_evergreen 56, stat_heavy 49, human_story 7, timely_breaking 6, multi_point 6.
- Concentration **holds on fully-fetched bodies** (435/479 = 90.8% analytical), so it is not purely a thin-input/title-only artefact — either the feed mix genuinely is near-monoclass or the classifier collapses to a default.
- **Consequence for the chain:** with >90% of content in one class, `t.class_format_fitness` contributes almost no differentiation to format choice — the fitness layer is effectively a constant. Weak classification is therefore a **plausible partial explanation** for format monotony upstream of the Advisor, but the Advisor demonstrably differentiates anyway (see §3).
- **Misclassification rate is unmeasurable** — no labelled ground truth, no second-opinion sampling exists. That is an instrumentation gap, not a runtime gap.

## 3. Format distribution & Advisor behaviour — status: **SUFFICIENT**

- **Advisor is confirmed the final format owner.** Recent drafts carry full advisor telemetry in `draft_format.ai`: `format_advisor_key=format-advisor-v1`, `format_decided`, prose `format_reason`, model/provider/tokens.
- **30-day slot→final (filled slots):**
  - **Facebook** (slot always `image_quote`, 85): final iq 50, NULL 13 (compliance skips), stat 8, text 7, kinetic 4, stat_voice 3 → **override ≈31%** of non-null outcomes.
  - **Instagram** (72): iq 60, text 4, NULL 4, carousel 3, avatar 1 → **override ≈12%**.
  - **LinkedIn** (86): **text 36**, NULL 30, iq 17, carousel 3 → **override ≈70%** — the Advisor systematically rewrites LinkedIn `image_quote` slots to `text`. The slot layer's LinkedIn preference is effectively decorative.
  - **YouTube** (slot always `video_short_avatar` via the hardcoded A2 override, 31): avatar 22, kinetic 3, stat_voice 3, kinetic_voice 2, text 1 → even the "deterministic" avatar pin is displaced in **9/31 (~29%)** of outcomes (incl. 1 YT `text` orphan — F-YT-QUEUE-ORPHAN-RECURRENCE class).
- **Override direction:** consistently *away from* image_quote toward text (LI/FB) and away from avatar toward kinetic/stat (YT). Per-client 30-day final mix recorded in the raw data (NY/PP diversified across 7–8 formats; Invegent iq-heavy; **CFW 48/96 drafts NULL-format** = intentional compliance skips, the known v3.32 class).

## 4. Per-format performance — status: **INSUFFICIENT**

- **Coverage:** `m.post_performance` = FB 524 rows (current — last collected 11 June) + YT 62 rows (**stale — last collected 29 May**, manual-invoke worker never re-run). **Instagram, LinkedIn, website: ZERO performance rows** (no insights pipeline).
- **Facebook (30d):** publishing healthy (52/66 iq ok; the 14 not-ok are the transient photo-500 class) but the engagement signal is effectively **zero** — avg reach 0.6–1.5, 0 reactions/comments/shares across all formats, `engagement_rate` null. FB data cannot rank formats.
- **YouTube (30d, partial/stale):** avatar avg impressions **35.2** (n=5 perf rows of 22 publishes), stat **10.5** (13), stat_voice 9.2 (5), kinetic **0.7** (18), kinetic_voice 0.4 (8). **Directionally avatar > stat ≫ kinetic on views**, but absolute numbers are tiny (≤36 impressions) and 17 of the 22 avatar publishes have no perf row at all because the insights worker hasn't run since 29 May.
- **Conclusion:** the single biggest evidence gap for the Option C / avatar-share decision is **not time — it is one gated re-run (or cron) of `youtube-insights-worker`** over the post-29-May publishes.

## 5. Render cost & failure — status: **MIXED** (failures sufficient; cost insufficient)

- 30-day renders: creatomate **301 succeeded / 14 failed (4.4%)**; heygen **4/4 succeeded** since telemetry landed.
- **All 14 failures are one signature:** transient EF-side fetch errors from Backblaze B2 (Creatomate output download) — carousel 7 + image_quote 7. No format-logic failures, no heygen failures, no orphaned render chains: every `video_status='pending'` video draft ≤60 days old (5 rows) is `approval_status='rejected'`, i.e. correctly un-rendered, not stuck.
- **Cost exposure cannot be quantified:** `credits_used` is **null on every row** (1,502 all-time). Avatar cost proxy is duration only (~30 min/poll-cycle, 2/day). Render-cost optimisation has no data to optimise against.

## 6. Policy subsystem — status: **SUFFICIENT** (read state confirmed)

- `t.platform_format_mix_default`: **22 rows, all `is_current`, untouched since the 2026-04-22 seed**; shares sum to exactly 100 per platform; no rows reference inactive formats.
- **Taxonomy-illegal cells confirmed and pinned: 4/22 (18.2% — the recorded "~19%")**, all via `platform_support` value mismatch:
  - instagram × video_short_kinetic (20%) — `instagram:false`
  - instagram × video_short_stat_voice (15%) — no instagram key
  - linkedin × video_short_kinetic (15%) — `linkedin:false`
  - linkedin × video_short_stat_voice (10%) — no linkedin key
  - (IG 35% and LI 25% of seeded share is illegal; FB and YT seeds are clean.)
- **Reconnection technically plausible without redesign?** The table is structurally intact and versioned, but a straight reconnect would route 25–35% of IG/LI demand to unsupported formats — **a reseed of the 4 cells is a hard prerequisite** to any reconnection. Not done, not proposed here.

---

## A. Evidence already available today (decision-grade)

1. Advisor override behaviour: rates, direction, per-platform, with recorded rationale (§3).
2. The slot layer's format preference is largely ceremonial on LinkedIn (70% override) and meaningfully advisory elsewhere.
3. Mix-seed state and the exact 4 illegal cells (§6).
4. Render reliability by format/engine; the single transient failure class (§5).
5. Avatar pipeline health: 22/22 published-realised; no stuck chains; selection mechanics confirmed in production telemetry (client-correct, role-arbitrary).
6. Classifier concentration: 92% single-class (§2).

## B. Evidence missing today

1. **Per-format engagement that can rank formats** — YT insights stale 14 days; IG/LI/website have none; FB signal is zero-valued.
2. **Role-fit avatar evidence** — structurally unobtainable until ai-worker emits `stakeholder_role` (wiring, not waiting).
3. **Render cost** — `credits_used` never populated.
4. **Classifier accuracy ground truth** — no labels, no audit sample.

## C. Gaps: runtime-volume vs instrumentation

- **Runtime volume will fix:** avatar_identity sample size (≈2/day); YT engagement maturation on recent videos (views need days to accrue).
- **Instrumentation/ops must fix (time will NOT):** YT insights re-run/cron (B1); role emission (B2); credits capture (B3); classifier audit sample (B4).

## D. Earliest sensible review date

**Hold the scheduled gate: w/c 2026-06-15.** Do not reopen architecture today. By Monday the telemetry adds ~8 avatar_identity rows (~10 total) — enough to confirm selection consistency, not enough to rank formats. **Recommended pre-gate action (the one high-value unlock): a single gated manual re-run of `youtube-insights-worker`** (own D-01 per the standing gate) so the 22 avatar + recent stat/kinetic publishes have fresh performance rows at the gate. Without that re-run, the gate will re-encounter gap B1 and likely roll forward again.

## E. Decision readiness

| Decision | Readiness | Basis |
|---|---|---|
| Option C implementation | **Not ready** | Per-format performance absent (B1); avatar telemetry n=2 |
| Policy reconnection | **Not ready** | 4 illegal cells live; no performance evidence for envelope values |
| Mix-table reseed | **Blocked** (on the Option C / fork direction) | The 4-cell fix is objective and ready to author, but reseeding a dormant table is pointless before the keep/retire decision |
| Narrative-vs-format | **Not ready** | No narrative-dimension instrumentation exists; remains open by design |
| Avatar scale-up / scale-down | **Not ready** | Only 5/22 avatar publishes have perf rows; unblocks after B1 re-run + a few days of view accrual |
| Classifier repair | **Ready to commission a bounded audit; NOT ready to change the classifier** | 92.4% concentration is decision-grade justification for an audit; no ground truth yet to justify a fix |
| Render-cost optimisation | **Blocked** | `credits_used` never populated (instrumentation) |

## Future implementation candidates — not approved

(Listed per directive; none proposed for execution.)
1. `youtube-insights-worker` gated re-run and/or cron (existing standing gate).
2. ai-worker `stakeholder_role` emission + role-aware `lookupAvatar` (wiring-only; pre-identified v3.34).
3. Mix-table 4-cell reseed (only if the fork lands on reconnect).
4. `credits_used` capture in render workers.
5. Bounded classifier audit (sample ~50 fetched bodies, second-opinion label, measure agreement).

---

**Authority impact:**
none
