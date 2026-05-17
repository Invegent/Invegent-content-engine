# cc-0014 Friction Register Capture Experiment — Closing Note

**Brief:** cc-0014 — Friction Register Capture Experiment (v1.1 final, brief frozen at commit `34305092f4`)
**Closed:** 2026-05-18 09:21 AEST (Day 4 of 14-day window)
**Closure status:** `archived` (per friction.experiment_run.status enum)
**Closed by:** PK reframing decision; chat-applied migration `cc_0014_close_archived`
**Decision ref:** D-IOL-001 in `docs/06_decisions.md`

---

## What happened

Brief cc-0014 specified a 14-day operational window (2026-05-15 06:20 UTC → 2026-05-29 06:20 UTC) followed by a Day-19 verdict against five pre-locked success criteria + invalidation gates. The window was closed at Day 4 by operator decision, not by brief mechanics. Status set to `archived`, which is the brief's neutral terminal state (CHECK enum includes `planned / running / passed / failed / invalid / archived`).

## Why closed early

Three factors emerged within the first 4 days that made the verdict ritual non-evaluable:

1. **Manual FAB source proven faster than designed for.** Brief assumed 14 days were needed to validate manual capture as a source. By Day 3, PK had filed 3/3 in-window manual events, triaged them, and validated the flow as a real operational workflow. Manual as a source is empirically proven; further window time adds no signal on this dimension.

2. **Reconciliation source under-frequenced.** cron 85 ran weekly per the existing pre-cc-0014 schedule (`30 17 * * 0`). In a 14-day window this produces at most 2 fires — insufficient to evaluate criterion 3 (≥2 sources × ≥3 events). The brief did not specify a cadence change; the cadence was inherited and remained a quiet defect.

3. **Health_check source produced zero signal across Days 1–4.** Root cause traced to the Cowork pipeline brief being stuck at `status: review_required` since 2026-05-04, which caused Cowork's owner-gate to skip it on every nightly fire. Commit `9215de77` (2026-05-17) reset the brief to v3.0 `status: ready`, but V-C3 live verification remained PENDING as of closure. Zero signal here is upstream defect, not register defect.

Day-19 verdict against the locked criteria on this trajectory would have read INVALID due to insufficient signal density (criterion 3 unachievable). That's a procedural verdict, not an insight verdict.

## What was reframed

The register stopped being an experiment requiring verdict and became standing operational infrastructure. The schema, triggers, emitters, and FAB are all production. The follow-up work is no longer "score the experiment" but "improve signal production into the register" (recon daily cadence applied this session; health_check diagnostic pending; cc-0015 pool view and cc-0016 evidence capture now unblocked).

This reframing is logged as D-IOL-001 in `docs/06_decisions.md`.

## What the locked criteria would have said at closure

Not scored. Day-4 scoring against criteria designed for Day-14 windows would have been performative: outcomes were predetermined by window length, not by signal quality. The `criteria_snapshot` JSONB remains immutable on the archived row as the audit trail of what would have been scored had the window run to completion.

For record:

- **Criterion 1** (≥6 non-duplicate quality cases): ~3 — would not have passed
- **Criterion 2** (≥2 distinct real categories): ~1 — would not have passed
- **Criterion 3** (≥2 sources × ≥3 events): 1 source × 3 — would not have passed
- **Criterion 4** (≥3 action decisions + ≥1 high-intent): likely partial
- **Criterion 5** (≥1 incremental case with note): plausibly 1 — would have passed marginally
- **Invalidation gates**: emit_error ratio negligible; triage discipline within thresholds; manual submission well under 30s; health_check verification failure days approaching the 3-day threshold

A full Day-14 run was unlikely to reach PASS thresholds without recon and health_check producing signal. Closing early acknowledges this honestly rather than producing a forced INVALID verdict at Day 19.

## Brief §14 commitments

The brief's Section 14 enumerated three closure paths: pass, fail, invalid. `archived` is the brief's neutral terminal state that does not invoke any of the three paths' specific commitments. Nonetheless, the substantive commitments that map onto post-close work:

- **Pass-path next-layer design (triage/resolution architecture)** — cc-0015 friction-pool-view brief already drafted (commit `9a5dc155`), now unblocked for execution. This is the natural next layer.
- **Pass-path health_check pg_cron migration scope** — folded into the infrastructure diagnostic phase. The Cowork dual-write (Option Z) remains in place; pg_cron migration deferred pending diagnostic findings.
- **Fail-path table archival** — not invoked. Schema, emitters, triggers, UI all stay live in production.
- **Fail-path postmortem within 14 days** — this file satisfies it.

## What changed this session at closure

1. Migration `cc_0014_close_archived` applied. friction.experiment_run.status: running → archived. Notes captures rationale verbatim.
2. Migration `cc_0014_recon_daily_cadence` applied. cron 85 schedule weekly → daily.
3. D-IOL-001 logged in `docs/06_decisions.md`.
4. IOL hold-stance lifted. cc-0015 + cc-0016 unblocked.
5. Publisher recovery sequence (music activation, IG cron 53 re-enable, YT diagnostic) now actionable in normal queue.

## What did NOT change

- friction.* schema (stable)
- 3 emitter design (manual / reconciliation / health_check)
- Manual FAB live on dashboard.invegent.com
- /operations triage route
- 4 active triggers in friction.* (3 ACTIVE-while-running are now dormant since no run is `running`; promotion BEFORE INSERT trigger remains always-active)
- Cowork brief v3.0 at HEAD `bc32e86`
- All other ICE pipeline behaviour
- DELETE-protection on friction.event and friction.case lifts mechanically once no run is `running`. This is desired — allows future maintenance.

## Cumulative D-01 history for cc-0014 (final)

| review_id | brief version / session | verdict | classification | resolution |
|---|---|---|---|---|
| `903cfd8e` | v1.0 D-01 (v2.72) | partial | type-(b) | PK-resolved Path A re-fire; close-the-loop UPDATE resolved 2026-05-17 |
| `873985f7` | v1.1 D-01 (v2.72) | partial | type-(c) | PK-resolved state-capture override per L62; brief frozen v1.1; close-the-loop UPDATE resolved 2026-05-17 |
| `3ff74643` | close-as-passed (2026-05-17) | partial | type-(b) | Pushback accepted; revised plan to archived instead of passed |
| `6a90cacf` | close-as-archived (2026-05-18) | partial | type-(c) | PK explicit approval stood per L62; archived applied |
| `94bd6835` | recon daily cadence (2026-05-18) | partial | type-(c) | PK explicit approval stood per L62; daily cadence applied |

Total D-01 fires for cc-0014: **5**. State-capture exceptions: **0** (no override consumed; L62 type-(c) classification handled all overrides on PK explicit approval rather than via the override budget).

## Lessons reaffirmed at closure

- **L62**: type-(b) vs type-(c) classification on D-01 escalations. Three of five D-01 fires for cc-0014 were type-(c) generic consistency-bias. Honest classification prevented over-rotation on procedurally correct but substantively empty objections.
- **Mid-experiment reframing is legitimate** when the framing itself is wrong, distinct from changing criteria mid-experiment when the data is uncomfortable. The latter violates pre-registration discipline; the former is good calibration. cc-0014 closure is the former.
- **`archived` as honest terminal state** for closed-pre-verdict cases. Better than overclaiming `passed` or underclaiming `failed`.

## Forward links

- D-IOL-001 — Friction Register as Standing Infrastructure (decision)
- cc-0015 friction-pool-view brief — pooled resolution UI + dashboard_ui category split + Stage F operator surface copy (unblocked)
- cc-0016 friction-capture-evidence brief — image attachments + 18-month lifecycle (unblocked, parallel-executable)
- Reconciliation daily cadence diagnostic — first daily fire 2026-05-19 03:30 AEST; observe whether weekly→daily produces drift detection that weekly missed
- Health_check diagnostic — V-C3 reconciliation against next Cowork fire post-`9215de77`; root-cause investigation if zero signal continues past 3 daily fires

---

*Postmortem closes the brief §14 "within 14 days" commitment. Brief cc-0014 fully closed.*
