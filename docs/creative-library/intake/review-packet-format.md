# PK Review-Packet Format — Creative Library Intake v0 (deliverable B)

> The **review packet** is what PK reviews **before any asset is uploaded or governed**.
> It is produced by the `creative-library-intake` subagent (proposal-only) and is the
> single human gate in the intake flow: **ICE proposes → PK approves → ICE governs**.
> One packet per candidate asset (template packets are analogous — see the agent spec).

## Required sections

| Field | Meaning |
|---|---|
| `candidate_ref` | Candidate preview/reference — a viewable reference (source URL and/or a description/thumbnail reference). **No image is downloaded or uploaded at packet stage** — PK views the source reference. |
| `proposed_asset_key` | Proposed `asset_key` (stable, `^[a-z0-9_]+$`); lives in `asset_meta`. |
| `proposed_storage_path` | Proposed `source_path` (bucket-relative) the asset *would* occupy if approved + uploaded. Indicative only — no upload happens at packet stage. |
| `source_url` | Where the candidate came from (licence evidence). |
| `license_summary` | Plain-language licence summary + the licence identifier (e.g. `CC0`, `CC-BY-4.0`, `client-owned`, `licensed:<provider>#<id>`). **If missing/ambiguous → `blocked_license`.** |
| `attribution_requirement` | Whether visible attribution is required, and the exact attribution text if so. |
| `suggested_metadata` | The proposed creative metadata (location/scene_type/mood/topic_fit/safe_for_text_overlay/has_people/has_text/aspect_ratio/dominant_colours/visual_style/property_context/platform_fit/notes) per the manifest schema. |
| `creative_score` | The advisory Creative Score (asset) — see creative-score.md. Advisory only. |
| `subagent_notes` | The subagent's reasoning, caveats, and any licensing/consent gaps it flagged. |
| `pk_decision` | PK's decision — one of: `approve` · `approve_with_edits` · `reject` · `blocked_license`. |
| `pk_comments` | PK's free-text comments (required for `approve_with_edits`, `reject`, `blocked_license`). |
| `pk_decided_by` | Person who decided (PK). |
| `pk_decided_at` | Decision timestamp (ISO-8601). |

## Decision semantics

- **approve** → candidate becomes `approved`; eligible for the governance lane as-proposed.
- **approve_with_edits** → `approved` **after** the edits in `pk_comments` are applied to the
  manifest (e.g. corrected `asset_key`, metadata, storage path). The governance packet must
  reflect the edited values.
- **reject** → `rejected`; not governed.
- **blocked_license** → `blocked_license`; **hard stop** — cannot be governed until a valid
  licence is supplied and the packet is re-reviewed. `license_confidence` does not override this.

## JSON template

```json
{
  "packet_version": "v0",
  "kind": "asset",
  "client_slug": "property-pulse",
  "candidate_ref": { "source_url": "", "description": "", "thumbnail_ref": null },
  "proposed_asset_key": "",
  "proposed_storage_path": "",
  "source_url": "",
  "license_summary": "",
  "license": "",
  "attribution_requirement": { "required": null, "attribution_text": null },
  "suggested_metadata": {
    "asset_type": "other",
    "usage": "",
    "location": null,
    "scene_type": null,
    "mood": null,
    "topic_fit": [],
    "safe_for_text_overlay": null,
    "has_people": null,
    "has_text": null,
    "aspect_ratio": null,
    "dominant_colours": [],
    "visual_style": null,
    "property_context": null,
    "platform_fit": [],
    "notes": null
  },
  "creative_score": {
    "visual_quality": null,
    "brand_fit": null,
    "location_fit": null,
    "text_overlay_suitability": null,
    "topic_fit": null,
    "license_confidence": null,
    "reuse_potential": null,
    "overall_score": null
  },
  "subagent_notes": "",
  "pk_decision": null,
  "pk_comments": null,
  "pk_decided_by": null,
  "pk_decided_at": null
}
```

> After a packet is decided, the resolved values flow into the asset-intake manifest
> (`approval_status`, `approved`, `approved_by`, `approved_at`, edited metadata). Only an
> `approved` manifest with a valid `license` proceeds to the existing PK-gated governance
> lane (INSERT into `c.client_brand_asset`) — which remains a separate lane with its own gates.
