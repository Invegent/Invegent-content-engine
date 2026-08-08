# AB-01 Capability-Loss Attribution — Result v1 (diagnostic only)

**Date:** 2026-08-08 · **Lane:** AB-01 attribution (PK-directed follow-on to `docs/architecture/ice-assurance-baseline-v1.md`) · **Tier:** diagnostic read-only.
**Channel:** 6 gated `execute_sql` reads (all single SELECTs / STABLE-function probes) + 3 zero-prompt catalog reads via `db-read.py`. **Zero remediation: no migration, no worker change, no policy change, no slot re-opened, no schedule change, no capability declaration change.**
**Mission:** explain the 242 terminal skips (2026-07-29 → 08-08). Do not fix them.

---

## 1. Attribution of the 242 skipped slots

`m.slot.skip_reason` read directly (grouped client × platform × requested format × reason × date range):

| Bucket | n | % | Classification |
|---|---|---|---|
| **Supply starvation** — `pool_thin` / `bundle_diversity_insufficient:got_1_need_2`, always suffixed `;no_eligible_evergreen` | **~113** | 46.7% | **NOT capability enforcement.** Chronic content-supply failure + empty evergreen fallback |
| **Capability-blocked: correct enforcement** — `capability_blocked:template_missing:*` on `video_long_explainer` / `video_long_podcast_clip` (42) and the **retired legacy key `video_short`** (18) | ~50 | 20.7% | Working as designed — no template exists for these. The `video_short` requests are themselves a residual schedule-data defect (a retired key still being demanded) |
| **Capability-blocked: FALSE blocks** — `capability_blocked:unsupported_silent_degrade:*` on `video_short_avatar` (17), `video_short_kinetic_voice` (8), `video_short_stat_voice` (4+) | **~29** | 12.0% | **Capability-model coverage defect** (root cause #2 below). `video_short_avatar` is live-proven: 136 YT publishes + 6 IG Reels |
| **Capability-blocked: policy-correct, product-questionable** — NDIS `carousel` FB/IG (20) | ~20 | 8.3% | Correct per declared governance (carousel governance enabled for 1 client only), though a legacy carousel render path exists (1,325 lifetime successes). PK policy call |
| `publish_path_disabled` (cc-0019 gate / NDIS-YT containment) | 25 | 10.3% | Expected — clustered 07-28/29, tapered |
| `compliance_skip` (CFW relevance filter) | 5 | 2.1% | Expected, reasons are specific and sensible |

### The two questions PK named

**Why were `{text}` slots (52) skipped?** — **Not the carve-out.** Zero `capability_blocked:*:text` rows exist. All 52 carry `bundle_diversity_insufficient`/`pool_thin` + `no_eligible_evergreen` — pure supply starvation. The carve-out is verified working end-to-end: live probe `classify_format_capability(*, linkedin, 'text')` returns `unsupported_silent_degrade:format_unmapped`, and the Layer-1 gate (live `pg_get_functiondef` read) exempts exactly that status class via `is_capability_exempt_format('text')` → text passes the gate and then dies in pool selection.

**Why were `{image_quote}` slots (34+) skipped?** — Same: `pool_thin;no_eligible_evergreen` on every row. Not capability, not template governance.

---

## 2. Root causes (smallest set)

1. **Signal-pool supply starvation with an empty evergreen fallback** (~47% of all loss; chronic — the same reason family runs at 2–17/day continuously since at least 07-08, pre-dating enforcement). NDIS + CFW dominant; PP text/carousel affected. Every starvation skip ends `;no_eligible_evergreen` because `t.evergreen_library` has zero rows fleet-wide. **Existing items:** M16 CFW/NDIS pool-starvation defect — fix BUILT, NOT APPLIED, queued at the watch gate; evergreen seeding election (baseline AB-22).
2. **Capability truth is structurally incomplete for non-Creatomate formats.** The template registry / `select_template` model only Creatomate; HeyGen-rendered (`video_short_avatar`) and voice formats classify `unsupported_silent_degrade:format_unmapped` (live probes confirm) and are therefore blocked by S9 and silently dropped by S7 grids — despite `video_short_avatar` being the single most publish-proven video format in the system. This is cc-0091 A1's defect class (unvalidated capability truth driving enforcement) appearing at a **second layer**: A1 proved it for `platform_support`; this proves it for the classifier/template-registry leg. ~29 slots wrongly terminal + ongoing suppression of avatar demand at grid time.
3. **Correct enforcement of genuinely-missing capability** (~50 slots): `video_long_*` have no templates; legacy `video_short` key still present in schedule demand (small data-hygiene defect).
4. **The terminal-skip policy converts every transient or false cause into permanent demand loss.** All 242 are unrecoverable by design, including the ~29 false blocks. (PK-ruled v1 behaviour, ruled against a 9-slot sizing.)
5. **The 07-29 → 08-03 burst was transitional, and S7 self-healed it.** Capability-blocked skips: 4 → 18 → 20 → 18 → 17 → 17 → 4 → 1 → 1 → 0 → 0. Post-08-04, the steady-state skip mix is almost purely supply starvation. The enforcement wave drained the pre-S7 backlog once; it is not an ongoing bleed.

## 3. Causality correction (pre vs post enforcement)

Weekly fills: **wk 07-20: 47 · wk 07-27: 50 · wk 08-03: 39** (≈ −20%, not −88%). The baseline's "17→2 drafts/day" read a normal weekly cadence trough as a cliff: Friday/Saturday fills of 0–5 recur in every prior week (07-10/11: 0/3 · 07-17/18: 3/5 · 07-24/25: 0/3); 08-07/08 = Fri/Sat = 2/2 with NDIS the only client holding weekend schedule rows. Materialisation is healthy: all four clients hold future slots for 08-09 → 08-14 at expected weekly volumes (the 07-27 run pre-materialised the horizon), all schedules intact, `is_publish_eligible` true everywhere except Invegent/CFW YouTube (expected). **Verdict: enforcement is NOT the driver of current daily throughput; the real weekly loss (~20%) decomposes into the one-time capability drain + growing supply starvation.** AB-01's headline in the baseline should be revised accordingly at ratification — the 78.6% skip-rate damage figure stands; the "throughput collapsing" trend framing does not.

## 4. Anomalies recorded (not chased)

- **A-1:** 2 PP YouTube skips show requested `{video_short_kinetic}` but reason `…:video_short_stat_voice` / `…:video_short_kinetic_voice` — classified format ≠ current `format_preference[1]`. Suggests the slot's preference array changed post-skip or a non-Layer-1 writer. Cosmetic at n=2; note for the A3 annotation lane.
- **A-2:** NDIS YouTube: `enabled_rows=0` in `c.client_publish_schedule` yet NDIS-YT slots were created through 08-02 and `is_publish_eligible('ndis-yarns','youtube')=true` — the YT containment posture is expressed inconsistently across surfaces (schedule-disable vs eligibility vs S9 pause gate). Consistent with the known "0% by design" posture; flagging the representation split only.
- **A-3:** Sunday-dated future slots exist (08-09) despite the documented Sunday-unschedulable defect — likely timezone offset in the date read; not investigated (dormant-defect status unchanged).

## 5. Decision options for PK (no action taken)

| Option | Addresses | Effort/state |
|---|---|---|
| **(a) Apply the M16 pool-starvation fix** (already built, watch-gated) + decide the evergreen seeding election | Root cause 1 — the largest and still-active bucket | Already authored; rides the watch-expiry sitting |
| **(b) Extend capability truth to non-Creatomate engines** (model HeyGen in the registry, or an engine-aware exemption analogous to the `text` carve-out — scoped so genuine gaps still block) | Root cause 2 — stops ongoing false suppression of avatar/voice demand | New Gate-1 lane; interacts with cc-0091 Gate A and should ride with it |
| **(c) Revisit terminal-skip policy** — at minimum a re-open path for skips whose cause is later proven false (class-scoped, not blanket) | Root cause 4 | Policy decision; the 242 stay lost either way unless PK elects retroactive re-open |
| **(d) Purge the legacy `video_short` key** from schedule demand | Root cause 3 residual (18 slots' class) | Small data-hygiene lane |
| **(e) NDIS carousel governance enrolment** (or leave blocked) | The 20-slot carousel bucket | PK product call |
| **(f) Apply cc-0091 A3 observability artifacts at Gate B** | Would have made every bucket here self-evident without a gated read | Already authored, watch-gated ~08-11 |

**Recommendation (non-binding):** (a) and (f) are already-built and waiting; (b) is the one genuinely new lane this diagnostic surfaces; (c) can be decided with (b)'s result in hand.

## 6. Evidence annex — the false-block conclusion rests on THREE independent legs, not probes alone

(Added at external review `9b6acdcf` which flagged sole-probe reliance as unverified.)

1. **Live classifier probes (this session):** `classify_format_capability` returns `unsupported_silent_degrade:format_unmapped` for `video_short_avatar` on ndis-yarns/youtube, ndis-yarns/instagram, and for `video_short_kinetic_voice` on property-pulse/youtube — i.e. the classifier asserts these formats silently degrade and must be blocked.
2. **Live publish/render record (this session, independent reads via the confined `ice_ro` path):** `draft_status` shows `video_status='published'` = **136 on YouTube** (the format's platform of record); `render_status` shows engine `heygen` / `video_short_avatar` = **90 succeeded / 0 failed**; cc-0091 A1 (11 `ffprobe` artifact probes, PK-ratified determination `910059d`) records `video_short_avatar` **live-proven with 6 Instagram Reels**. A format cannot simultaneously be "unsupported, silently degrades" and have a 100% render success record with 142 real publishes.
3. **Structural mechanism (read from source/registry, explains WHY the classifier is wrong):** `ice_ro.template_registry_status` contains **zero `heygen` rows** — all 28 registry templates are `creatomate` — and `select_template` therefore returns `format_unmapped` for any HeyGen-rendered format by construction; the classifier's silent-degrade overlay converts that into `unsupported_silent_degrade`. The Layer-1/Layer-2 exemption covers only `render_engine='none'` (exactly `{text}`), so HeyGen formats fall through to the block. The mechanism is the same classifier-coverage artefact the code's own carve-out comment describes for `text` (`m.fill_pending_slots` live definition, S9 Layer-1 block) — applied to an engine the carve-out was not extended to.

Alternative explanations considered and rejected: (a) "avatar is genuinely no longer capable" — contradicted by leg 2 (renders and publishes continued through 2026-07-27 with zero failures); (b) "the blocks are platform-specific correctness (e.g. IG)" — the same status returns on YouTube, the format's proven home; (c) "carve-out malfunction" — excluded by the zero `capability_blocked:*:text` rows and the function-definition read. What this diagnostic does NOT claim: that avatar demand *should* bypass governance (that is PK's option (b) decision), nor that the ~29 false-blocked slots should be retroactively re-opened (option (c)).

---

*Evidence: all SQL inline in the session transcript; skip_reason families verified against the live `m.fill_pending_slots` definition (S9 Layer-1 gate, cc-0019 gate, pool-selection reasons all read from `pg_get_functiondef`). Classifier probes run live via `SELECT public.classify_format_capability(…)`.*
