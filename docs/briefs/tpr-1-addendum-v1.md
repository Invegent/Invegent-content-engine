CLAIMED · tpr-1-addendum-v1 · main-checkout `C:\Users\parve\Invegent-content-engine` · Gate-1 ratification · 2026-07-29

# TPR-1 Addendum v1 — Three-Surface Output-Parity Comparison

**Created:** 2026-07-29 Sydney · **Status: PROPOSED — awaiting PK ratification.**
**Author:** orchestrator (direct) · **Type:** additive amendment to standing requirement **TPR-1**.
**Lane classification:** SAFETY_GATE · **Tier: T1** (governance text only — no code, no DDL/DML, no
deploy, no resolver change).
**Result file:** `docs/briefs/results/broll-rotation-readiness-handoff-v1.md` (companion lane record).

---

## 1. What TPR-1 says today

> **TPR-1 (Template Parity), ratified v6.48 (`docs/00_sync_state.md:48`):** any repoint of a governed
> format's default template MUST diff the **output spec** (resolution / duration / codec) of outgoing
> vs. incoming and state the delta at Gate 1.

TPR-1 exists because the v6.48 B-roll activation shipped a silent 1080×1920/12s → 720×1280/8s product
downgrade that three independent review rounds (`db-rls-auditor`, `apply-harness-auditor`, external)
all missed. A selector repoint is a **product output change**, and no control covered it.

## 2. Why an addendum is needed

The v6.54 B-roll Parity Activation (`b7568ce`, video-worker **v3.15.0** `d5ddca1`) closed that gap by
**correcting the output at render time** rather than in the saved provider object. The consequence is
recorded as a disclosed trade-off in the apply packet
(`docs/briefs/broll-parity-activation-v1-apply-packet.md` §7(2)):

- The registry row for `dd5fd75e` still reads `width=720 / height=1280 / duration_seconds=8`, and is
  **correct to do so** — those columns describe the **provider object**, which really is 720×1280/8s.
  Editing them to 1080/1920/12 would make the registry describe something untrue: precisely the error
  class TPR-1 exists to prevent.
- The 1080×1920/12s that production actually renders is produced **by code**, at render time, by
  `B1_VIDEO_TEMPLATE_OUTPUT_PARITY` (`supabase/functions/video-worker/b1_video_stat.ts:146`).

**Therefore TPR-1's cheap check —
`SELECT width, height, duration_seconds FROM c.creative_provider_template` — now returns a misleading
answer for any template carrying a parity overlay.** Run as written today, TPR-1 would report a
1080×1920/12s production default as a 720×1280/8s one. The rule is sound; its evidence source is now
incomplete.

Live-verified 2026-07-29, this addendum's own basis:

| Surface | Value for `46c5c4ac` (registry `dd5fd75e`) | Source |
|---|---|---|
| **A** — saved provider-template specification | `720 × 1280`, `duration_seconds = 8` | `c.creative_provider_template` (live read) |
| **B** — worker-applied production overlay | `1080 × 1920`, per-element `.duration = 12` (8 elements) | `b1_video_stat.ts:146` `B1_VIDEO_TEMPLATE_OUTPUT_PARITY` |
| **C** — measured rendered output | `1080 × 1920 / 00:00:12.00` | ffmpeg-measured, post-activation render on the real production signature (`docs/briefs/results/broll-parity-activation-v1-result.md`) |

A ≠ C. Only B explains the difference. A rule that reads A alone is wrong about production.

---

## 3. The addendum (proposed text — additive; removes nothing from TPR-1)

> ### TPR-1.a — Effective-spec sourcing
>
> The TPR-1 output-spec diff is performed on a template's **EFFECTIVE** output spec, not its stored
> one. The effective spec is computed from **three surfaces**, and the Gate-1 statement must name the
> value each surface supplied:
>
> - **Surface A — saved provider-template specification.** `width` / `height` / `duration_seconds`
>   from `c.creative_provider_template` for the outgoing and incoming `provider_template_id`.
> - **Surface B — worker-applied production overlay.** The render-time correction the production
>   worker will apply to that `provider_template_id`, read from the code constant that owns it
>   (today: `B1_VIDEO_TEMPLATE_OUTPUT_PARITY` in `supabase/functions/video-worker/b1_video_stat.ts`).
>   Absent entry ⇒ empty overlay ⇒ effective spec = Surface A.
> - **Surface C — measured rendered output.** The resolution and duration **measured from the
>   produced file** (not provider-reported alone) on a render made at the **real production call
>   signature**.
>
> **Effective spec = A overlaid by B, and it MUST be confirmed by C.**
>
> ### TPR-1.b — Mandatory Gate-1 declarations
>
> A repoint proposal is not TPR-1-complete until it states, for BOTH outgoing and incoming templates:
> A, B, the derived effective spec, and its `source` (`provider_template_default` or
> `render_time_parity_overlay`); plus the C measurement for the incoming template; plus the
> outgoing-vs-incoming **delta on effective specs**, explicitly named as `specs_match = true|false`.
>
> ### TPR-1.c — Overlay-registry divergence is DECLARED, never silently reconciled
>
> When a template carries a Surface-B overlay, its registry row **stays truthful to the provider
> object** and is NOT edited to match the rendered output. The divergence is a required disclosure in
> the repoint packet, not a defect to be "fixed" by mutating the registry.
>
> ### TPR-1.d — Per-render machine-checkability
>
> Every governed render of a format under TPR-1 stamps its effective output spec and that spec's
> source into `render_spec` (today: `render_spec.template.tmr.output_spec`, shipped v3.15.0,
> `b1_video_stat.ts:321`). This makes the output contract checkable **per render** rather than
> inferred from a registry row, and is the evidence source for any post-activation audit.
>
> ### TPR-1.e — Overlay completeness
>
> Where Surface B sets a per-element property (e.g. `.duration`), the overlay MUST cover **every**
> element the composition contains. A composition's length is the **max** element duration, so one
> missed element renders its content short against a longer composition — a silent partial-parity
> failure that Surface C would catch only if the measurement inspects content, not just container
> length. Overlay completeness is asserted in the worker's hermetic tests, and named at Gate 1.
>
> ### TPR-1.f — Containment (unchanged, restated)
>
> A Surface-B overlay may set **output geometry only**. It must never set a governed binding — a
> resolver-selected asset (`*.source`), an AI-authored text slot, or an audio level. This is enforced
> in code by `assertParityOverlayDisjoint` (`b1_video_stat.ts`) plus the merge order (governed keys
> applied AFTER the overlay). Any proposal that would widen an overlay beyond geometry is **not** a
> TPR-1 matter — it is a fresh reviewed build.

---

## 4. Scope and boundaries

**In scope:** the evidence sourcing and Gate-1 declaration requirements of TPR-1.

**Out of scope / explicitly unchanged by this addendum:**
- ❌ TPR-1's trigger condition (still: any repoint of a governed format's default template).
- ❌ The live template winner (`46c5c4ac` / registry `dd5fd75e`) — not touched.
- ❌ The parity overlay itself — not removed, not widened, not edited.
- ❌ `resolve_slot_assets` v1.4 — not touched.
- ❌ Voice, music, and selector ranking — not touched.
- ❌ Any clip sourcing or promotion.

**This addendum authorises no apply, no deploy, no repoint.** It changes what a *future* repoint must
prove at Gate 1.

## 5. Effect if ratified

1. The next repoint of any governed format's default template must produce a three-surface table and a
   `specs_match` verdict on **effective** specs.
2. The v6.54 activation is retrospectively TPR-1.a-complete — it already measured both sides and
   recorded `specs_match = true`; this addendum codifies what that lane did ad hoc.
3. The carry "TPR-1 addendum proposed, NOT ratified" (`docs/00_sync_state.md:13`) closes.

## 6. Non-claims

- This addendum does **not** claim the current one-clip B-roll pool is production-ready. Pool
  sufficiency is a separate concern, handled in the companion handoff document.
- It does **not** claim any control now prevents a template from being repointed with a bad output
  spec — TPR-1 remains a **declaration requirement at a human gate**, not a machine-enforced block.
- It does **not** assert that Surface C is automated. It is a measured human/lane step today.

## 7. Stop condition

Ratified or rejected by PK. No execution follows from this document.
