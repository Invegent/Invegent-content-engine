# ICE Evidence Gap Classification — 2026-06-12

**Directive:** ICE Evidence Gap Classification Directive (PK, 12 June 2026). Read-only classification only.
**Primary input:** `docs/runtime/sessions/2026-06-12-evidence-snapshot.md` (commit `0848a03`).
**Executed by:** CCH. **Production effect:** 0 DB writes / 0 migrations / 0 code / 0 deploys / 0 cron / 0 provider calls / 0 reseed / 0 Option C work.

**Bucket definitions used:**
1 = Solved by waiting · 2 = Solved by read-only audit · 3 = Solved by instrumentation patch (observability-only code; no behaviour change) · 4 = Solved by production change (behaviour change, ops mutation, or new pipeline).
Where an action technically mutates production but uses already-deployed instrumentation under an existing gate (e.g. a worker invoke), it is marked **4-light**.

---

## 1. Avatar telemetry

- **Current evidence:** 2 meaningful `avatar_identity` rows (11 June); both client-correct presenters; both `fallback_limit1` / `stakeholder_role=null`; accrual ≈2 rows/day; 22/22 published avatar drafts realised.
- **Gap:** (a) sample size of which-face/voice-used; (b) role-fit evidence — whether the *appropriate* persona is chosen for the content.
- **Can passive waiting improve this?** **Partial.**
- **Why:** Waiting grows (a) mechanically (~10 rows by Mon 15 June, ~16 by Fri). It can **never** produce (b): every future row will read `fallback_limit1 / role null` because ai-worker does not emit `stakeholder_role` and `lookupAvatar` is LIMIT 1 — the selection mechanism contains no role signal to observe.
- **Bucket:** (a) = **1**; (b) = **3** for emit-only (ai-worker emits `stakeholder_role` into telemetry without changing selection) escalating to **4** if selection is made role-aware.
- **Next action:** none before the gate for (a); (b) is a pre-scoped wiring candidate (v3.34) held for post-gate direction.
- **Decision impact:** Gates the avatar scale-up/down and A2 policy branch. (a) confirms consistency only; (b) is what the "wrong presenter?" question actually needs.

## 2. Classifier accuracy

- **Current evidence:** 1,631 rows / 30d, 0 unclassified, all `v1`; **92.4% single-class (`analytical`)**, 90.8% even on fully-fetched bodies.
- **Gap:** accuracy / misclassification rate unmeasurable — no ground truth, no second-opinion sample.
- **Can passive waiting improve this?** **No.**
- **Why:** More rows from the same v1 classifier add volume of the same distribution. Concentration is already proven beyond doubt; accuracy requires labels that the pipeline never produces.
- **Bucket:** **2** — bounded read-only audit (sample ~50 fetched bodies, independent re-label, measure agreement + confusion pattern). No mutation; future audit run would use AI calls but writes nothing.
- **Next action:** commission the audit when PK directs (already justified by the concentration finding).
- **Decision impact:** Gates classifier-repair; partially explains format monotony; feeds the fitness-layer usefulness question inside the fork.

## 3. Advisor / format ownership

- **Current evidence:** SUFFICIENT — advisor confirmed final owner (`format-advisor-v1`, `format_decided` + prose rationale per draft); override rates LI ~70%, FB ~31%, YT ~29%, IG ~12%; direction consistent (iq→text, avatar→kinetic/stat).
- **Gap:** none material for the ownership question. Minor residual: on the avatar path `advisor_would_have` is prose-only, not structured.
- **Can passive waiting improve this?** **N/A** (no gap to close); waiting neither helps nor harms.
- **Bucket:** closed. (Optional structured `advisor_would_have` field = **3**, low priority.)
- **Next action:** none.
- **Decision impact:** This evidence is already decision-grade for the Option C comparison — it establishes that any policy envelope must sit around an advisor that actively overrides, especially on LinkedIn.

## 4. Per-format performance

- **Current evidence:** FB rows current but zero-valued (reach 0.6–1.5, 0 interactions); YT stale + partial (5/22 avatar publishes covered); IG/LI/website **zero rows**.
- **Gap:** nothing in the system can rank formats by outcome.
- **Can passive waiting improve this?** **No** (under current wiring).
- **Why:** YouTube views are accruing on the platform but are **invisible** until a collection run — the worker is manual-invoke-only and last ran 29 May. IG/LI/website have no pipeline at all. FB's zero-signal is an audience-size reality, not a collection defect — waiting changes it only on the timescale of page growth, not a review gate.
- **Bucket:** YT refresh = **4-light** (single gated invoke of the deployed `youtube-insights-worker`; no code, no deploy, existing D-01 gate; or cron = full **4**). IG/LinkedIn insights = **4** (new pipeline work). FB = no actionable bucket (evidence is accurate; the underlying signal is genuinely ~zero).
- **Next action:** the YT gated re-run before the gate — the single highest-value unlock identified in the snapshot.
- **Decision impact:** This is the **binding gap** for Option C, avatar share, and render-cost trade-offs. Every format-ranking decision routes through it.

## 5. YouTube insights freshness

- **Current evidence:** worker deployed + verified (v1.0.0); 62 rows, last collected **29 May** — 14 days stale; the entire post-29-May avatar cohort uncollected.
- **Gap:** staleness.
- **Can passive waiting improve this?** **No — waiting strictly worsens it.**
- **Why:** No cron exists; staleness grows one day per day. Meanwhile platform-side view data matures, so a re-run *after* a short wait collects richer numbers than one today — but the wait without the run yields nothing.
- **Bucket:** **4-light** (gated manual invoke, no code) now; **4** (cron + durable rotation/collision alerting, per the standing brief) for a durable fix.
- **Next action:** schedule the gated invoke just before the w/c 15 June gate so the gate sees both fresh and matured numbers.
- **Decision impact:** Direct precondition for Area 4; without it the gate re-encounters the same gap and rolls forward.

## 6. Render cost evidence

- **Current evidence:** `credits_used` **null on all 1,502 render rows**; only proxy is duration (heygen ~30 min/render; creatomate seconds).
- **Gap:** no cost data for any engine.
- **Can passive waiting improve this?** **No.**
- **Why:** The workers never write the field; future rows will be null too.
- **Bucket:** **3** — capture credits/cost from provider responses in heygen-worker / video-worker / image-worker (observability-only; needs EF deploys under the normal gates, no behaviour change).
- **Next action:** scope as a small telemetry patch series, post-gate.
- **Decision impact:** Blocks render-cost optimisation and the cost side of avatar scale-up/down; without it, cost arguments stay qualitative (duration-based).

## 7. Policy mix table readiness

- **Current evidence:** COMPLETE — 22 rows, all current, frozen since 22 Apr seed; shares sum 100/platform; the 4 illegal cells pinned exactly (IG×kinetic 20%, IG×stat_voice 15%, LI×kinetic 15%, LI×stat_voice 10%).
- **Gap:** none evidential. The remaining item is a **decision** (keep / formally retire / reseed-and-reconnect), not missing evidence.
- **Can passive waiting improve this?** **No.**
- **Why:** The table is dormant and unwired; nothing writes to it; its state is fully characterised.
- **Bucket:** no evidence bucket. The reseed itself = **4**, blocked behind the fork decision (correctly).
- **Next action:** none until the fork decision.
- **Decision impact:** Evidence side is done; this area is now purely on the decision ledger.

## 8. Narrative-vs-format evidence

- **Current evidence:** zero structured evidence — format is a proxy (kinetic=scenes, stat=stat_reveal, avatar=first-person); no narrative dimension is captured anywhere in the chain.
- **Gap:** structural absence of the variable itself.
- **Can passive waiting improve this?** **No.**
- **Why:** A dimension that is never recorded cannot accumulate.
- **Bucket:** **2 first** — a retrospective read-only audit can label existing `draft_body` / `video_script` content by narrative structure and test whether narrative type varies independently of format (cheap first evidence, zero mutation). **3** for ongoing capture (tag drafts at generation time) if the audit shows the dimension matters.
- **Next action:** optional post-gate audit candidate; explicitly not a reason to delay the fork decision (per v3.35 record).
- **Decision impact:** Keeps narrative-vs-format an open question on evidence rather than intuition; the audit decides whether it ever becomes a build question.

---

## Bucket summary

| Area | Bucket | Waiting helps? |
|---|---|---|
| Avatar telemetry — sample size | 1 | Yes |
| Avatar telemetry — role-fit | 3 → 4 | No |
| Classifier accuracy | 2 | No |
| Advisor / format ownership | closed | n/a |
| Per-format performance (YT) | 4-light (invoke) | No (until a run) |
| Per-format performance (IG/LI) | 4 | No |
| Per-format performance (FB) | none (signal genuinely ~0) | No |
| YouTube insights freshness | 4-light now, 4 durable | No — worsens |
| Render cost | 3 | No |
| Policy mix table | decision, not evidence (reseed = 4) | No |
| Narrative-vs-format | 2 first, then 3 | No |

**Net:** of all identified gaps, exactly **one** improves by passive waiting (avatar_identity sample size), and it is the least decision-relevant of the set. Everything that gates the fork is bucket 2/3/4.

---

## Special test

**Does waiting until week commencing 2026-06-15 materially improve architecture decision quality under current wiring?**

**Answer: Only for specific metrics.**

Specifically: (1) `avatar_identity` sample size grows ~2/day to ~10 rows by Monday — enough to confirm selection *consistency*, nothing more; (2) YouTube view counts mature platform-side, which makes a pre-gate insights re-run more informative than one run today — but that maturation is invisible without the run. Every other gap — format ranking, role-fit, classifier accuracy, render cost, narrative dimension — is structurally incapable of improving by waiting, because the missing data is either never collected (cost, role, narrative), never labelled (classifier), or never refreshed (YT insights, IG/LI insights). **The calendar is not the gating variable; the gated `youtube-insights-worker` invoke is.** Holding the w/c 15 June gate remains correct, but its decision quality is determined by whether that one invoke happens first, not by the days in between.

---

**Authority impact:**
none
