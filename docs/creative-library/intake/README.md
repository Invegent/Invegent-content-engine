# Creative Library Intake v0 — scaffolding (Lane 1)

> **Status:** doc/config scaffolding only. Lane 1 produces the *foundation* (schema,
> review-packet format, subagent spec, score definitions) needed **before** any real
> asset/template proposal packet is produced. **No runtime behaviour, no DB, no
> storage, no provider calls, no uploads, no governance inserts, no render.**

## Intake principle

> **ICE proposes → PK approves → ICE governs → Dashboard shows status.**

ICE (via the proposed `creative-library-intake` subagent) only ever **proposes**
candidates and prepares review packets. **PK is the sole approver.** Only after PK
approval does ICE **govern** the asset/template (the existing Lane 1/Lane 2 governance
+ registry lanes), and the production dashboard (`/creative-library`) surfaces the
resulting status read-only.

## Hard rule — no license → no governance

**An asset cannot be governed without an explicit, recorded licence.** If the licence
is missing, ambiguous, or unverifiable, the candidate is `blocked_license` and MUST
NOT proceed to governance — regardless of Creative Score or `license_confidence`.
`license_confidence` is an advisory signal only; it **never** overrides this rule.

## Deliverables (this lane)

| File | Deliverable |
|---|---|
| [asset-intake-manifest.schema.json](asset-intake-manifest.schema.json) | **A** — JSON-compatible schema for a proposed asset (governance + creative metadata + intake lifecycle). |
| [review-packet-format.md](review-packet-format.md) | **B** — the packet PK reviews before any asset is uploaded/governed. |
| [creative-library-intake.agent.md](creative-library-intake.agent.md) | **C** — specification for the proposed `creative-library-intake` subagent (proposal-only). |
| [creative-score.md](creative-score.md) | **D** — advisory Creative Score definitions (asset + template). |

## Governance storage mapping (c.client_brand_asset columns vs asset_meta JSONB)

The intake manifest is a *superset* of what is stored. When (post-PK-approval) an asset
is governed into `c.client_brand_asset`, fields map as follows — **no migration in
Lane 1; no new columns are introduced:**

- **Real constrained columns** (existing table): `asset_type` (stays a **CHECK-constrained**
  column — only the allowed enum values), `client_id` (resolved from `client_slug`),
  `asset_url` (derived from `source_path` → public bucket URL), `asset_name`, `is_active`,
  `platform_scope`.
- **`asset_meta` JSONB** (flexible, no schema migration): `asset_key`, `usage`, `source_path`,
  `bucket`, the **licence / source / approval trail** (`license`, `source_url`,
  `attribution_required`, `approved`, `approved_by`, `approved_at`, `approval_status`),
  and **all creative metadata** (`location`, `scene_type`, `mood`, `topic_fit`,
  `safe_for_text_overlay`, `has_people`, `has_text`, `aspect_ratio`, `dominant_colours`,
  `visual_style`, `property_context`, `platform_fit`, `notes`).

Rule of thumb: **`asset_type` is the only constrained column the intake touches; `asset_key`,
licence/source/approval trail, and all flexible creative metadata live in `asset_meta`** —
unless/until a real column is later introduced via a separate, PK-gated migration lane.

## Intake lifecycle (status values)

`candidate → pending_review → { approved | rejected | blocked_license } → governed`

- **candidate** — proposed by the subagent; not yet packaged for PK.
- **pending_review** — packaged into a review packet, awaiting PK decision.
- **approved** — PK approved (with or without edits); eligible for governance.
- **rejected** — PK declined; not governed.
- **blocked_license** — licence missing/ambiguous; blocked by the hard rule.
- **governed** — written to `c.client_brand_asset` via the existing governance lane (terminal).

## Scope / boundaries (Lane 1)

Docs/config only · repo files only · **no** code / DB / storage / provider call / image
download / upload / governance insert / render / dashboard change. Carries for Lane 2 are
listed in the lane result, not here.
