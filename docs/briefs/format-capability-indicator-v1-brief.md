# Brief — Format Capability Indicator v1 (S2 - Dashboard)

**Created:** 2026-07-28 Sydney
**Author:** S2 - Dashboard (orchestrator)
**Executor:** Claude Code (S2), build in `invegent-dashboard` repo
**Status:** draft — **awaiting PK Gate-1**
**Result file:** `docs/briefs/results/format-capability-indicator-v1.md` (on completion)

**Lane class:** PRODUCT_PROOF · **Tier:** T2 (read-only dashboard surface consuming a read-only classifier). ⚠ See "Scope boundary — surface vs enforce": the *enforcement* half (pipeline cannot silently fall back) is a separate T3 Engineering/Publishing change, NOT this lane.

---

## Task

Add a capability indicator to the dashboard **Format Plan** so that, for every scheduled **client × platform × format** cell, the operator sees both what they *want* (Desired) and whether ICE can *actually deliver it through a governed path today* (Capability), with the **exact blocking reason**, not just a red warning. Formats ICE cannot yet deliver stay schedulable (they record the demand signal) but render as **`Planned — blocked by capability`** — they must not read as "will publish". This closes the gap the NDIS-Yarns review exposed: today, un-deliverable formats degrade *silently* to a legacy render that auto-publishes.

## Source context

- `[[capability-demand-architecture]]` memory + this session's NDIS-Yarns review — the motivating evidence. NDIS is governed end-to-end for `image_quote` (FB/IG/LI) + `text` only; carousel + all video formats fail `select_template` and silently legacy-fall-back to public auto-publish.
- **S5 - ICE Engineering — Shared Capability Contract** (seed packet sent 2026-07-28): the six-status classifier this dashboard *consumes*. `(client, platform, format) → {Ready · Asset shortage · Template missing · Pipeline missing · Governance unproven · Unsupported/silent-degrade}` + exact reason + routed lane. **This lane builds against that interface; it does not define it.**
- `invegent-dashboard` repo — current **Format Plan tab** (Weekly Schedule Editor Phase 1: `format_override` col + `save_week_format_override` RPC + materialiser). Exact components TBD — first build step is to survey them.
- `docs/dashboard/operator-journey-ia-v1.md` + `docs/dashboard/global-client-picker-v1-brief.md` — the governing IA docs; `dashboard-ia-lint` must PASS against them.
- `[[global-client-picker-slice3-shipped]]` — per-route `?client=` selection model the Format Plan already uses.

## Scope

**In scope:**
- Consume the S5 capability classifier per Format Plan cell (against a stubbed/mocked interface until S5 lands).
- Render the six statuses with **exact reason + the lane the gap routes to** (Ready green; each blocker its own labelled state).
- The **`Planned — blocked by capability`** cell state: Desired format is recorded (demand signal preserved) while Capability shows the blocker; the cell must not present as production-ready.
- Read-only surfacing of Desired vs Capability side-by-side.

**Out of scope (route elsewhere — do NOT build here):**
- Defining/implementing the classifier → **S5 Engineering**.
- The register that drains asset shortages → **S8 (Demand-driven Gap Register)**.
- **Enforcement** — actually preventing the pipeline's silent legacy fallback / blocking public production for non-Ready formats. That is a resolver/publisher change (Engineering + Publishing reliability), **T3, separate lane**. This dashboard *surfaces* the state; the pipeline *enforces* it. Do not conflate.

## Allowed actions

- Survey the current Format Plan surface in `invegent-dashboard` (read-only) and design the indicator integration.
- Build the read-only indicator UI + the `Planned — blocked by capability` state against a mocked contract interface.
- Run `dashboard-ia-lint` and iterate to PASS.

## Forbidden actions

- No production pipeline / resolver / publisher changes; no enabling or gating public production from this lane.
- No deploy, no merge — hand the diff + plan back for the PK gate.
- Do not implement the "cannot silently fall back" enforcement (surface only).
- Do not proceed to build the real data path until the **S5 contract interface is defined** (mock until then).
- Active hold-states per `docs/00_sync_state.md` apply.

## Success criteria

- Every Format Plan cell shows **Ready** or the **exact blocker + routed lane**; verified against the NDIS-Yarns matrix (image_quote/text → Ready; carousel → Template/Pipeline gap; video_short_avatar → Governance unproven; video_long_* → Unsupported).
- Non-Ready formats remain schedulable but render as **`Planned — blocked by capability`**, never as production-ready.
- `dashboard-ia-lint` returns **PASS** against the two governing IA docs.
- Reason text is human-readable and names the owning lane, per PK's "exact reason, not just a red warning".

## Stop condition

Report result per result template, then stop for the PK gate. No deploy/merge without PK.

---

## Notes

- **Sequencing:** this lane can start now on survey + mocked-interface UI, but its real data path is blocked on the S5 contract. Coordinate the interface shape with S5 before wiring live.
- **Governing rule (PK):** "Desired schedule creates demand. Capability readiness controls execution."
- The `Unsupported/silent-degrade` status is the safety-relevant one — it is what surfaces the current NDIS silent-legacy-auto-publish behaviour to the operator.
