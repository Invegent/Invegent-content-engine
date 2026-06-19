# Brief — Character Model v0 + Brand Host Designation (planning, docs-only)

**Created:** 2026-06-19 Sydney
**Author:** chat (Session 1, docs/register reconciliation owner)
**Status:** PLANNING — docs-only. Records the approved Character Model v0 and the clean Session-2
governance review. **Implements nothing.**
**Class:** `docs_only` — 0 DB / 0 migration / 0 code / 0 RPC / 0 EF deploy / 0 provider call / 0 marker
write / 0 avatar-selection change / 0 AGP activation. The Brand Host Designation marker write in §8 is a
**future, separately-gated** recommendation, NOT performed here.

> **Terminology:** **ICE** = the Invegent Content Engine **product**. **Invegent** is the company /
> platform owner. ICE is one product within Invegent, not the owner. "Avatar/character" below means a
> **governed identity system**, not merely a HeyGen asset.

---

## 1. Purpose

Capture the approved avatar/character **planning model** (Session-3 Character Model v0) and the
Session-2 governance review verdict, so future avatar/character work has a reviewable foundation —
**without** writing any DB marker, changing any avatar selection, or activating any telemetry.

## 2. The model — avatar/character is a governed identity system

Avatar/character is **not** "a HeyGen asset." It is a **layered identity model**:

```
intent  →  identity  →  asset  →  provider
```

with these distinct concepts (deliberately separated):

| Concept | What it is |
|---|---|
| **Brand host** | the brand's primary on-screen presenter identity (one per brand — the ceiling for now) |
| **Narrator mode** | a per-piece presentation mode (e.g. single host vs multi-perspective) — already shipped shadow/telemetry-only upstream of selection |
| **Stakeholder persona** | a governed role/voice (e.g. Support Coordinator) the content speaks as |
| **Character identity** | a named, reusable character in a future character library |
| **Avatar asset** | the concrete renderable asset (HeyGen talking-photo + voice, a `c.brand_avatar` row) |
| **Provider identity** | the provider-side id (HeyGen avatar/voice id) that actually renders |

**Sequencing (approved):** **brand host first → stakeholder personas second → character library last.**
**One host per brand is the ceiling for now.**

## 3. Live inventory (VERIFIED read-only, 2026-06-19, project `mbkmaxqhsohbtwsqolns`)

`c.brand_avatar` joined to `c.client`:

| Client | client_id | avatars | active (A2-pinned, HeyGen-backed) | render_style split | markers |
|---|---|---|---|---|---|
| Invegent | `93494a09-…` | **0** | — (host asset required later) | — | — |
| Care For Welfare | `3eca32aa-…` | **0** | — (deferred) | — | — |
| NDIS-Yarns | `fb98a472-…` | **14** | **1** — `83ff167d-a844-4e1c-9d1a-d8ff257c11bc` ("Support Coordinator (Realistic)") | **7 realistic + 7 animated** | all false/unset |
| Property Pulse | `4036a6b5-…` | **14** | **1** — `d6c422fb-9dc5-4bcc-aba6-2e6e942f2cdd` ("Buyer's Agent (Realistic)") | **7 realistic + 7 animated** | all false/unset |

- The two active hosts are both `render_style='realistic'`, `is_active=true`, **`is_primary=false`,
  `is_default_host=false`**, HeyGen-backed (`heygen_avatar_id IS NOT NULL`). Confirmed live.
- **All `is_primary`/`is_default_host` markers are currently `false`/unset across every client** (0 set).
- **VERIFIED CORRECTION to the planning note:** the dormant non-realistic inventory is
  `render_style='animated'` (7 per NY/PP, all inactive) — **not** the value `'cartoon'`. The planning
  note's "cartoon" maps to the existing **`animated`** render_style. Recording the verified term so a
  future marker/selection lane keys off the real value.

## 4. Style is asset-level for now (per user note)

- Treat **realistic / animated** as an **asset-level `render_style` / capability**, not a new character
  field. Current active hosts are **realistic**; the **animated** inventory stays **dormant / future
  style inventory**.
- **Do NOT introduce new character fields yet.** **Style selection is deferred.** No character library
  schema, no persona→avatar mapping table, no new columns in this lane.

## 5. Session-2 governance review — CLEAN TO DOC

- **Verdict: CLEAN TO DOC.**
- The NDIS/PP active avatars are **stock / licensed HeyGen avatars**: `avatar_type=stock`,
  `consent_required=false`, **no uploaded source footage**, **no custom generation record**.
- ⇒ **No personal-likeness consent gap** blocks documenting this model or planning the future dormant
  marker write.
- **Light carry (optional, later):** provider-side verification of the HeyGen stock avatar IDs would
  require a **PK-gated provider lookup** (a HeyGen API call) — not done here, not required for docs.

## 6. Live-behaviour boundary (precise wording — important)

- **The current live `lookupAvatar` does NOT consume `is_primary` / `is_default_host`.** Live avatar
  selection is driven by the **A2 pin** (the single active avatar per client × render_style), not by
  markers.
- The **only** reader of the markers today is the **dormant shadow resolver**
  (`public.resolve_and_record_avatar_shadow`), and only for **telemetry ordering** — and it is **OFF**
  (`AVATAR_SHADOW_TELEMETRY` unset; `r.avatar_resolution_shadow` row count = 0, verified).
- ⇒ Correct phrasing is: **markers are non-consumed by *live selection*** — **NOT** "non-consumed
  everywhere" (the dormant shadow resolver does read them when its flag is on, which it is not).
- **No Branch B. No persona-driven selection. No marker-driven live selection.** All remain unbuilt /
  unauthorised.

## 7. Future pillar relationships

- **Creative Intelligence:** characters should later be recorded as **attribution dimensions** (which
  character/host drove which outcome) — **not optimised yet**, because **P2 Creative Format Evidence is
  NOT READY** (engagement/reach signal too weak / partially blind; Invegent reach blind spot open
  pending Engagement A1 outcome).
- **Render Intelligence:** characters provide the **"who"**; Render Intelligence chooses the
  **"how / provider / style / cost / quality"** within platform- and format-capability constraints.
- **AGP:** any **selection-driving** use of markers/personas waits until **AGP Phase 3.3 shadow
  telemetry is activated and parity-observed** (see
  `docs/briefs/agp-d01-gate3-phase3.3-activation-soak-runbook.md`) — currently a standing PK block.

## 8. Recommended later implementation — Brand Host Designation (GATED, not now)

A **future, separately-gated** dormant-marker write (documented here for planning; **NOT performed**):

- **Action:** set **only `is_default_host = true`** for the two active hosts:
  - `83ff167d-a844-4e1c-9d1a-d8ff257c11bc` (NDIS-Yarns)
  - `d6c422fb-9dc5-4bcc-aba6-2e6e942f2cdd` (Property Pulse)
- **Exclude Invegent** (no avatar asset exists yet) and **exclude CFW** (deferred).
- **Mechanism:** DB write via an **auditable migration only** (`apply_migration`), never ad-hoc DML.
- **Gates:** **PK gate + external review required** before apply.
- **Safety:** **zero live-selection change** (live `lookupAvatar` doesn't read the marker; A2 pin
  unchanged), **reversible** (single `UPDATE … SET is_default_host=false` rollback), additive dormant
  metadata only.
- **Not now:** no implementation in this lane; this is the recommended next gated step.

## 9. Scope / explicit non-goals (this lane)

Docs only. No DB mutation, no migration, no code/RPC change, no EF deploy, no provider/HeyGen call, no
token change, **no marker update**, no avatar-selection change, no AGP activation, no Creative/Render
implementation, no new character fields, no Branch B.

## 10. Provenance

Current-state facts in §3 / §6 verified **read-only** on 2026-06-19 (`c.brand_avatar` SELECTs +
`r.avatar_resolution_shadow` row count = 0 + live deploy state). CE HEAD `46cd166` (0/0) at authoring.
DRAFT planning record; the §8 marker write is a future PK-gated lane.
