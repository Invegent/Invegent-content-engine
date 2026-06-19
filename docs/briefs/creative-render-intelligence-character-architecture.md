# Brief — Creative Intelligence + Render Intelligence around Character Model v0 (architecture, docs-only)

**Created:** 2026-06-19 Sydney
**Author:** chat (Session 1, docs/register reconciliation owner)
**Status:** PLANNING / ARCHITECTURE — docs-only. Records how Creative Intelligence (CI) and Render
Intelligence (RI) should work around Character Model v0. **Implements nothing.**
**Class:** `docs_only` — 0 DB / 0 migration / 0 code / 0 RPC / 0 EF deploy / 0 provider call / 0 marker
write / 0 avatar-selection change / 0 AGP activation / 0 CI-or-RI implementation.

> **Terminology:** ICE = the Invegent Content Engine **product**; Invegent = the company / platform
> owner. Companion: `docs/briefs/character-model-v0-brand-host-designation.md` (Character Model v0).

---

## 1. Plain-English definitions

- **Creative Intelligence (CI)** = **what to say, and who says it.**
- **Render Intelligence (RI)** = **how to physically produce it.**
- **Character Model v0** = the **identity contract** between CI and RI — the shared, governed vocabulary
  of host / persona / character that CI *names* and RI *resolves*.

## 2. Separation of concerns

| Creative Intelligence (CI) owns | Render Intelligence (RI) owns |
|---|---|
| topic | provider |
| angle | avatar vs non-avatar path |
| hook | `render_style` (realistic vs animated) |
| platform targeting | asset eligibility |
| format recommendation | cost |
| narrator mode | latency |
| tone | quality |
| series structure | platform capability |
| brand host / persona **suggestion** | fallback path |

## 3. The boundary (load-bearing)

- **CI may SUGGEST identity / persona** (e.g. "speak as the Support Coordinator host", "multi-perspective
  narrator").
- **RI RESOLVES identity → an eligible asset / provider** (which concrete `c.brand_avatar` row + HeyGen
  id, or a non-avatar path), subject to eligibility, capability, cost, and fallback.
- **CI must NOT directly pick avatar assets** (no talking-photo/voice id selection in CI).
- **RI must NOT pick topic / angle / hook** (RI is identity→asset→provider, never the creative idea).

This mirrors the Character Model v0 layering: **intent → identity → asset → provider** — CI lives at
intent→identity (suggestion side); RI lives at identity→asset→provider (resolution side).

## 4. Realistic vs animated

- **Realistic and animated are style variants of the SAME host identity** — an **asset-level
  `render_style` / RI decision**, **not a separate character**, and **not a CI decision**.
- **Active hosts are realistic today.** **Animated variants are dormant / unproven** (NY/PP each carry 7
  realistic + 7 `render_style='animated'`, the animated set inactive — verified 2026-06-19, recorded in
  registers v3.68).
- **Do NOT activate animated variants yet.**
- **Do NOT conflate realistic/animated with the avatar-vs-non-avatar path** — those are two independent
  RI decisions: (a) avatar vs non-avatar *path*, and (b) *within* the avatar path, which `render_style`.

## 5. What to instrument later (record-only telemetry)

**Creative attribution completeness** (so a future Creative panel can attribute outcomes to decisions):
character/host identity · `narrator_mode` · platform · format · tone · (possibly hook / angle / topic
fields **if already available** — do not invent new fields to capture them).

**Render-path telemetry** (so RI choices are observable): provider · `render_style` · cost · latency ·
success/failure · `fallback_taken` · quality/outcome (if available).

Both are **record-only** instrumentation — capture the dimensions, do not yet optimise on them.

## 6. What NOT to automate yet

- No Creative performance panel.
- No live avatar / persona / style-driven selection (live selection stays A2-pinned; markers are
  non-consumed by live selection — see Character Model v0).
- No provider auto-switching.
- No animated-variant activation.
- No Branch B.
- No AGP activation.
- **No performance optimisation until a real engagement signal exists** (today it does not — see §8).

## 7. Recommended future slices (DO NOT IMPLEMENT YET)

- **CI slice — Creative attribution completeness (record-only):** ensure each produced piece records its
  creative decision dimensions (host identity, narrator_mode, platform, format, tone, …) so outcomes can
  later be attributed. No optimisation, no panel.
- **RI slice — Render-path telemetry (record-only):** record provider / render_style / cost / latency /
  success/failure / fallback_taken / quality per render. No auto-switching, no provider changes.

Each future slice is its own PK-gated lane with its own brief, external review, and (if any EF/code
ships) a PK deploy gate. **Neither is started by this brief.**

## 8. Dependencies (must hold before the above advances)

1. **Engagement A1 observation must land** before judging the own-brand evidence signal — A1
   (insights-worker v14.5.0 reach fallback) is **deployed but outcome-pending** (await the natural
   Invegent FB cron; see registers v3.67/`engagement` state). Until reach/engagement is trustworthy,
   P2 Creative Format Evidence stays **NOT READY** and CI optimisation cannot begin.
2. **AGP Phase 3.3 must be ON and parity-observed** before character / persona / style **drives live
   selection** — currently a standing PK block; `AVATAR_SHADOW_TELEMETRY` OFF (0 shadow rows). See
   `docs/briefs/agp-d01-gate3-phase3.3-activation-soak-runbook.md`.
3. **Real engagement / audience signal must exist** before any optimisation (vs. just attribution
   completeness). Optimising on a blind/weak signal is explicitly out.
4. **Any future EF / code deploy requires a PK gate** and **`--no-verify-jwt`** where applicable
   (preserve `verify_jwt=false` on the x-key-authed ICE EFs).
5. **The host marker DB write remains separate and gated** — Brand Host Designation
   (`is_default_host=true` for the two host ids) is its own auditable-migration + PK-gate lane (Character
   Model v0 §8), independent of CI/RI telemetry.

## 9. Scope / explicit non-goals (this lane)

Docs only. No DB mutation, no migration, no code/RPC change, no EF deploy, no provider/HeyGen call, no
token change, no marker update, no avatar-selection change, no AGP activation, no CI/RI implementation,
no new fields, no Branch B, no panel.

## 10. Provenance

Architecture/planning record. Current-state references (avatar inventory, A1 deploy state, telemetry
OFF, P2 NOT READY) were verified read-only on 2026-06-19 and are recorded in registers v3.66–v3.68. CE
HEAD `94d3f62` (0/0) at authoring. Companion to Character Model v0; all CI/RI build work is future,
per-slice, PK-gated.
