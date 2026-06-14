# Series v2 Live-Run Reconciliation — PP Series 1a3e5596 (read-only)

**Status:** Read-only reconciliation of the live PP Series v2 run. No mutation. Decides what to fix before Stage 4/UI.
**Evidence base:** PP series `1a3e5596-40be-4cf6-9465-5130d2c164fb`, 5 episodes, 14 accepted children (all `fill_function`, 0 bypass), 10 published / 4 queued, prior two traces + this lane's schedule/asset probe.
**Authority impact:** none.

---

## 1. Issue table

| # | Issue | Root cause | Severity | Fix lane |
|---|---|---|---|---|
| 1 | Ideas shows 5 episode-intents as 5 ungrouped rows | Episode→intent is 1:1 (by design); no series→intent grouping in the read model | Med (UX confusion) | **Stage 4 UI** |
| 2 | Count semantics (2/4) conflate rejected fan-out with failures | `fanout_result` mixes accepted/rejected; UI denominator includes capability-rejected targets | Med | **Stage 4 UI** |
| 3 | YouTube rejected on all 5 episodes | Outline EF picks one static format/episode without platform-awareness; YT is video-only → correct gate, wrong upstream choice | High (operator expectation) | **Stage 3.5** |
| 4 | Instagram text episode rejected | Same root as #3 (outline not platform-aware; IG excludes text) | Med | **Stage 3.5** |
| 5 | Persona/avatar NULL despite explicit request | Outline never extracts persona into Stage-1 fields; carry chain empty at source | High (feature absent) | **Avatar/persona lane** (not 3.5/4) |
| 6 | Asset-less FB publish (post `962399936961457_122114734587268380`, draft `1d34577bbb5a`) | Image render `failed`, publisher released anyway — no post-render gate | **High (live unsafe)** | **T2** (+ interim publisher safety) |
| 7 | Schedule: published times unrelated to slot schedule | Slot `scheduled_publish_at` not honoured by queue/publisher; publishes cluster on cron ticks | High | **Scheduling lane** |
| 8 | Retry semantics for fan-out-rejected targets unclear | `retry_episode` (Stage 2) keys off intent children; rejected targets never became slots | Med | **Stage 3.5** (semantics) |
| 9 | Stage 4 readiness | — | — | gated on 3.5 + safety |

## 2. Root cause per issue (detail)

**#1/#2 (representation + counts) — UI-layer only.** The backend is correct: one episode = one creative_intent = N child slots; `fanout_result` records accepted vs rejected per target. The confusion is purely that the Ideas list renders episode-intents flat and counts "published/accepted" without separating capability-rejected targets. No backend change needed.

**#3/#4 (platform-unaware outline) — the real upstream defect.** The series-outline EF assigns one `recommended_format` per episode (image_quote/carousel/text here) with no awareness of the series' platform set. The fan-out capability gate then *correctly* rejects YT (no static formats) and IG-text — but the rejections are systemic and predictable, so YouTube produced **zero** output across the whole series. The gate is right; the outline is platform-blind. Fix is upstream format selection, not the gate.

**#5 (persona) — extraction never happens.** Operator brief explicitly said "different avatars/personas"; episodes are literal personas; yet `persona_label/avatar_preference/persona_notes` are NULL on all 5. Stage 3 *carries* persona if present, but nothing *extracts* it from the brief/outline into the Stage-1 fields. This is the avatar/persona lane's job, and it must resolve the Branch A pin interaction (pin currently sole selector; persona would need to override per-intent — a governance decision, not a quick patch).

**#6 (asset-less publish) — confirmed, live, T2-class.** Draft `1d34577bbb5a` / FB post `962399936961457_122114734587268380`: `image_status=failed`, `image_url` absent, `publish=published`. Same defect class as the prior 44-row leak. The publisher has no "asset present + QA passed" gate. **One PP post is live without its image right now.**

**#7 (scheduling) — worse than F-SLOT-SCHEDULE-FIDELITY drift.** Evidence: ep1 children scheduled 14:54–14:56 but **published 14:20–14:40 (before their slot time)**; ep2 scheduled 14:54–14:56 but published 20:30 / 00:00 / 00:01 (5–9h late). Publishes cluster on publisher cron ticks with no relationship to `scheduled_publish_at`. This isn't the small slot→queue minute-drift of F-SLOT-SCHEDULE-FIDELITY — it's that **series-child schedules aren't being honoured at all**. Scheduling lane, and bigger than first scoped.

**#8 (retry) — semantics gap.** `retry_episode` operates on an episode's intent children. Fan-out-rejected targets (YT/IG-text) **never became children**, so retry can't "retry" them — they'd need a *re-fan-out with a corrected format*. Current retry modes don't cover "outline chose a format incompatible with a selected platform → regenerate that episode with a platform-compatible preference."

## 3. Severity summary

- **High / safety:** #6 (live asset-less publish), #7 (schedules ignored), #3 (YT silently produces nothing), #5 (requested feature absent).
- **Med:** #1, #2, #4, #8.

## 4. Recommended fix lane per issue

- **Stage 3.5 (pre-Stage-4, governed-path correctness):** #3, #4 (platform-aware outline format selection), #8 (retry semantics for format/platform mismatch).
- **Stage 4 (UI):** #1 (series-parent grouping), #2 (count language).
- **T2:** #6 (post-render QA gate + publisher hard-rule) — with an **interim publisher safety patch** recommended ahead of full T2 (see §6).
- **Scheduling lane:** #7.
- **Avatar/persona lane:** #5.

## 5. Display-language recommendations (#2, for Stage 4)

Per episode/series, show four distinct buckets, never a bare "2/4":
- **Published** (live) · **Scheduled/Queued** (accepted, awaiting publish) · **In progress** (filling/generating/review) · **Not targeted** (rejected at fan-out — "{platform}: format not supported", *not* counted as failure). Denominator = **accepted** targets; rejected shown separately as "N platform/format combinations not supported". Example: "Episode 1 — 3 published, 0 scheduled; YouTube not targeted (image_quote unsupported)."

## 6. Stage 4 readiness verdict

**Do NOT start Stage 4 yet.** Two High/safety items must land first:
1. **Interim publisher safety (ahead of full T2):** a minimal publisher guard — *do not release image/carousel/video-format posts when `image_status`/`video_status`='failed' or asset URL is NULL*. This is the smallest patch that stops live asset-less publishes (#6) and should arguably precede further Series testing. Full T2 QA (OCR/transcript/visual) remains the larger lane.
2. **Stage 3.5 platform-aware outline (#3/#4):** otherwise every Series with YouTube selected silently produces nothing on YT — Stage 4 UI would just surface that confusion prettily.

Scheduling (#7) and persona (#5) are High but **don't block Stage 4 UI** structurally — they're parallel lanes; however #7 should be flagged loudly because operators will see posts at wrong times. Stage 4 can then build on correct, safe behaviour.

## 7. Issue → brief classification (your §5)

| Issue | Brief |
|---|---|
| #3, #4, #8 | **Stage 3.5 brief** (platform-aware outline + retry semantics) |
| #1, #2 | **Stage 4 UI brief** |
| #6 | **Interim publisher safety patch** (now) → **T2 brief** (full) |
| #7 | **Scheduling lane brief** |
| #5 | **Avatar/persona lane brief** |

## 8. Exact recommended next directive

**Author the interim publisher-safety patch brief first** (highest severity, live unsafe, smallest scope): a publisher guard blocking release of asset-requiring formats when the asset is missing/failed — gated D-01 → PK phrase → deploy. **Then the Stage 3.5 brief** (platform-aware outline format selection + retry-for-format-mismatch) so Series stops silently dropping YouTube. Stage 4 UI follows once both land. Scheduling (#7) and persona (#5) lanes scoped in parallel but sequenced after safety.

Recommended directive wording: *"Author interim publisher-safety patch brief: block asset-less publish for image/carousel/video formats; read-only evidence from PP series; D-01 gated; does not wait for full T2."*

## 9. Constraint compliance

This lane: 1 read-only SELECT (this reconciliation) + prior traces. 0 code/DB/deploy/retry/rerun/provider/publisher/register changes. The asset-less post is reported, not touched (operator action). Nothing mutated.
