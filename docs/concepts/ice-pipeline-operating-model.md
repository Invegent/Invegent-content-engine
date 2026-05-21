# ICE — Pipeline Operating Model

> The conceptual frame for the whole system: what ICE *is*, how it runs itself, and where the human fits. This doc is bigger than the dashboard — it explains ICE. The dashboard (see `docs/dashboard-review-2026-05/12_dashboard-revamp-master-plan.md`) is the operations plane *of* this model, and should be designed against it.
>
> Created 2026-05-21 Sydney. Conceptual/durable. No build state, no SHAs, no production actions — this is the mental model, not the implementation log.

---

## The core idea: planes, not a line

ICE is easiest to misunderstand as a line of nine sequential layers (ingest → canonicalise → AI → compliance → media → publish → feedback → reconciliation → dashboard). It is not a line. Trying to lay all nine on one string is exactly what makes it feel tangled.

It is **planes stacked on top of each other**:

1. **The production pipe** — the content flow. Things pass *through* it, left to right.
2. **The diagnostic & repair shafts** — the automatic detect-and-fix layer. They drop *into* the pipe at each stage.
3. **The friction register** — the pool of cases the shafts couldn't silently resolve. The shafts' common wire feeds it.
4. **Operations & dashboard** — the human command plane, sitting *above* everything. Where you watch, clear what the shafts can't, and decide what to automate next.

Six of the nine "layers" are the pipe. Two (reconciliation/health + the friction register) are the wrap-around layer. One (dashboard/operations) is the plane on top. Feedback & analytics is the return arrow from the end of the pipe back to its start. Once split this way, it stops being a tangle.

```
┌───────────────────────────────────────────────────────────────┐
│  OPERATIONS & DASHBOARD   — watch · clear · decide what to build │  ← plane on top
└───────────────────────────────────────────────────────────────┘
        ▲                                                   │
┌───────┴───────────────────────────────────────────────────────┐
│  THE PRODUCTION PIPE — content flows left → right               │
│  ingest&signals → canonicalise&score → AI gen → compliance&     │
│  approval → media gen → publishing → live                       │
└───────────────────────────────────────────────────────────────┘
   │   │   │   │   │   │     ← diagnostic & repair shafts drop in
   ▼   ▼   ▼   ▼   ▼   ▼
┌───────────────────────────────────────────────────────────────┐
│  DIAGNOSTIC & REPAIR SHAFTS — detect + fix at each stage         │
└───────────────────────────────────────────────────────────────┘
   └──────────────── the wire ───────────────┐
                                              ▼
┌───────────────────────────────────────────────────────────────┐
│  FRICTION REGISTER — pool of open cases · healthy state = empty  │
└───────────────────────────────────────────────────────────────┘
        │ recurring pattern → build a new shaft (growth loop)
        └──────────────────────────────────────► back up to the shafts
```

---

## Plane 1 — the production pipe

Content enters as raw signal on the left and exits as a live post on the right. One direction, six stages. Each has a real worker and a real table behind it.

| Stage | What it does | Worker · cadence | Writes |
|---|---|---|---|
| Ingest & signals | Pull feeds, normalise, dedupe to canonical | `ingest-worker` · 6h | `f.feed_source` → `f.canonical_content_item` |
| Canonicalise & score | Full-text extract; score by client vertical; select | `content-fetch` · 10m, `bundler` · 2h | `f.canonical_content_body`, `m.digest_item` + `m.digest_run` |
| AI generation | Draft in brand voice from a selected item | `ai-worker` · 30m | `m.post_draft` (`needs_review`) |
| Compliance & approval | Auto-approve against rules, or human review | `auto-approver` · 30m / human | `m.post_publish_queue` |
| Media generation | Render image / video assets for the draft | media workers (Creatomate / HeyGen / ElevenLabs) | asset refs on the draft |
| Publishing → live | Push to the platform | `publisher` · 15m (+ per-platform publishers) | `m.post_publish` |

The return arrow: **feedback & analytics** (`insights-worker`, planned daily → `m.post_performance`) feeds published-post engagement back into how the bundler scores future content. It is the loop closing, not a seventh forward step.

This is the cylinder. It is the only plane content actually moves through.

---

## Plane 2 — diagnostic & repair shafts

The shafts drop *into* the pipe at each stage. They are **not** stages the content flows through — they reach down into a stage, check whether something is stuck or broken, and fix it: requeue a frozen item, retry a failed render, reset an orphaned job. This is the pipeline-doctor plus the agents (auto-approver, format-advisor, ai-diagnostic, compliance-reviewer).

Every shaft is two halves:

- a **detect** half — notice the problem automatically, and
- a **repair** half — fix it automatically (or, if it can't, hand it on).

That is why the name is *diagnostic **& repair*** shafts, not just diagnostic. A shaft that only detects is half-built.

Every shaft is wired to a common bus — the wire — and the wire feeds the friction register. When a shaft acts (a fix, a stuck item it couldn't clear, a flag), it emits onto the wire.

Each shaft, to be fully described, answers: what does it detect? what does it repair? which pipe stage does it attach to? how often does it fire? how many cases does it fix automatically vs. escalate to the friction register?

---

## The friction register — a backlog, not a log

This is the single most important reframe in the model.

A **log** is something you inspect after the fact. A **register** is something you **drain**. The friction register is a register: a pool of **open cases that still need resolution**, not a history of events.

A case lands there when a shaft hits something it can't silently auto-resolve. A case *leaves* the register two ways:

- **automatically** — a shaft repairs it, or
- **manually** — you clear it from the operations plane.

A case is *closed*, not merely recorded.

The healthy steady state is an **empty register**. "Empty" is the state you drain *toward*, not a literal always-zero invariant: cases will still appear — a feed breaks, a render stalls — and a register that briefly fills and clears fast is healthy. The alarm is a register that **accumulates** — anything sitting there unresolved. So "the register should be null at any given time" is read precisely as: *nothing should sit there unresolved.*

This maps to: reconciliation & health (the `r.*` schema + the nightly health check) emitting to the friction register (`friction.event`), which is the operational surface today at `/operations` and, when cc-0015 ships, the friction-pool-view.

---

## The growth loop — why the shaft set keeps expanding

This is the engine of the whole design, and it is what makes ICE improve itself rather than just run.

When the **same kind** of case keeps pooling in the friction register, that recurring pattern is the signal to build for it: first a **detection** tool (notice it automatically), then a **repair** tool (fix it automatically). That new detect+repair pair becomes a **new shaft**. Next time that problem occurs, it is auto-fixed instead of reaching the register.

So the shaft set is not fixed. It **grows by consuming the friction register's recurring patterns.** Over time more case-types become auto-fixed, fewer reach the human, and the register drains faster on its own. The pipeline trends toward running uninterrupted with minimal human touch.

The reframe that makes it click: **the friction register is not a failure surface — it is the product backlog for your automation.** A problem pooling there isn't the system breaking; it's the system telling you which shaft to build next. (This is exactly why the register was promoted from a time-boxed experiment to standing infrastructure under D-IOL-001.)

A mature friction-pool view therefore shows recurring patterns, not just rows — something like:

| Recurring pattern | Cases | Oldest | Current handling | Recommended next step |
|---|---|---|---|---|
| Instagram API rate limit | 44 | 2h | manual review | build detect + throttle shaft |
| Render stuck after generation | 12 | 6h | retry manually | build repair shaft |
| Compliance hard block | 5 | 1d | human approval | improve policy classifier |

That table is where the system starts improving itself: each row is either *immediate work* (clear this case now) or *system improvement* (this case-type deserves a new shaft).

---

## Plane 4 — operations & dashboard

The human command plane on top. Not a menu of pages — the plane from which you watch the pipe, watch the shafts, watch the register drain, clear what the shafts can't, and decide what to automate next.

The questions this plane should answer, in order:

- What is flowing? (pipe health)
- What is stuck? (pipe + shaft state)
- What did the shafts fix? What did they fail to fix? (shaft activity)
- What is still sitting in the register? (open cases, ageing)
- Which recurring pattern should become the next shaft? (the automation backlog)

That is a materially more powerful framing than "Queue / Monitor / Operations."

---

## One-line version

> ICE is a production pipe with diagnostic & repair shafts dropped into every stage; the shafts report to a friction register whose healthy state is empty; and the recurring problems that pool there are the backlog from which new shafts get built — so the system automates more of itself over time. The dashboard is the operations plane on top, from which you watch, clear, and decide what to automate next.

---

## Design direction for the dashboard (implication, not a re-lock)

This model gives the dashboard its grammar. The mapping below is **design direction** — it shows where the surfaces *want* to go. It does **not** re-open or replace the §6-locked IA, which remains the build spec. Today's dashboard does not have all these final surfaces; nothing changes wholesale on the strength of this doc.

| Plane | Wants to become | Locked-IA home today |
|---|---|---|
| Production pipe | The core of the future Pipeline page (the swimlane) | NOW > Pipeline (replaces `/queue`) |
| Diagnostic & repair shafts | A map of the automation — detect/repair/stage/fire-count/auto-fix vs escalate per shaft | NOW > Investigate > Agents (+ Flow, Pipeline Log) |
| Friction register | An active *pool* view (open cases by stage + recurring pattern + ageing + next-shaft candidate), not an event log | NOW > Operations today → cc-0015 friction-pool-view |
| Operations plane | The NOW > Overview command-centre: Brief, alerts, pipe health, shaft health, register count, ageing, recommended next action, next shaft to build | NOW > Overview |

Directional notes (to reconcile deliberately, **not** locked here):

- **`/operations` may eventually be renamed or absorbed into a Friction Register surface**, because this model makes the register the real operational pool. Logged as a direction; the locked IA keeps `/operations` transitional under Investigate until cc-0015 supersedes it.
- The Overview command-centre should eventually surface the **two kinds of work** the register implies: *immediate ops* ("clear this case now") and *system improvement* ("this case-type deserves a new shaft").
- Whether **Friction Register becomes its own NOW item** (peer to Overview/Inbox/Pipeline) is a real IA question this model raises. It is **not** decided here; it is a candidate to put to PK alongside the cc-0015 build, weighed against the §6.9 deferral of an `m.chatgpt_review` surface and the existing `/operations` slot.

---

## Open question carried forward — pipeline stage names

PK's desired Pipeline flow has been written as: Feeds → Slots → Ingest → AI Generation → Asset Production → Compliance → Published. Two of those names do **not** map cleanly onto the production pipe above, and must be reconciled before the Pipeline swimlane is wired:

- **"Slots"** has no backing table in the canonical state model (`pending_draft → drafting → needs_review → queued → publishing → published`). It is most likely a **scheduling / capacity** concept that sits *beside* the pipe (which slot a post fills, on which day), not a stage content flows *through*. If so, it belongs as a cadence/capacity surface, not a swimlane lane.
- **"Asset Production"** corresponds to **media generation**, which is real work but is **not currently a first-class pipeline state** — render status surfaces under Visual Pipeline today. Decision needed: surface render status inline in the Pipeline swimlane, or keep it in Visual Pipeline.

Until these are resolved, the Pipeline swimlane should be treated as a wireframe, not a spec. (Mirrors the gap log in §12.)

---

## Honest limitations

- This is a conceptual model, deliberately clean. The real system has edges the planes gloss: an item can be `dead` in one table while alive in another; some shafts (e.g. cap-throttle) are scheduling concerns that blur the pipe/shaft line; media generation spans several external services. The model is for *thinking*, not a substitute for the blueprint (`docs/03_blueprint.md`) or the state model (`§6.5`).
- The plane→surface mapping is direction, not a locked IA change. §6 remains the build spec; this doc must not be cited to justify reopening locked decisions.
- "Empty register = healthy" is an asymptote. A maturing system will often have a non-empty, fast-draining register; that is healthy. Accumulation is the signal, not non-zero count.
- Worker names, cadences, and tables are as documented in the blueprint at time of writing; verify against live state (`docs/00_sync_state.md`) before relying on them for a build.

---

*Created 2026-05-21 Sydney. Durable concept doc. The operating model behind ICE — production pipe + diagnostic & repair shafts + friction register (a backlog, not a log) + operations plane, with the growth loop that turns recurring friction into new shafts. Referenced by §12 Dashboard Revamp Master Plan. Conceptual only — no build state, no production actions.*
