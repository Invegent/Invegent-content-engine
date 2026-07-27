# Automated Image Intake v1 — Orchestration Runbook (Slice 3)

**Lane:** Automated Image Intake v1 (backgrounds-only) · run-on-demand · Tier T2 build / T3 per-intake apply.
**Brief:** `docs/briefs/automated-image-intake-v1.md` (Gate-1 approved). **Proof clients:** Invegent + CFW.
**Principle:** automate the *preparation* of a fenced, reviewed shortlist; **the PK visual verdict stays the
only deciding act. Zero auto-promotion. The pipeline STOPS at the PK gate.**

This runbook is the deterministic procedure the orchestrator runs on demand. Steps 1/6/7 are pure
functions/queries; steps 2–5 invoke the PROVEN image agents; step 8 hands to PK.

## Stages

**S1 — Detect (deterministic, live).** `SELECT * FROM m.detect_background_shortage(p_floor)` as
service_role. Take rows `WHERE is_shortage` ordered by `priority_rank`. Each row = a client×platform
with `shortfall` = how many backgrounds short of the floor, plus `category_spread` (shared-pool tag
diversity — do NOT treat a satisfied count as category coverage). *Proof note:* the pool currently sits
at the floor (4) post-cc-0073, so the proof runs a **seeded-real** shortage — `p_floor := 6` — which
flags Invegent + CFW shortfall 2 (validated live). This is the "demand grew past supply" case.

**S2 — Manifest (deterministic → agent input).** For each shortage, compose an `image-harvester`
mini-manifest: person-free background subjects appropriate to the client (Invegent = abstract/tech/
office-neutral; CFW = warm/community/care-neutral, person-free), count = `shortfall` + a small buffer,
providers = the allow-list ONLY (Unsplash std · Pexels · Wikimedia CC0), aspect 1:1, text-safe-at-scrim
required. NDIS fences apply even though NDIS is not a proof client.

**S3 — Harvest (agent, PROVEN-SCOPED).** Invoke `image-harvester` with the S2 manifest. It downloads
candidates into `_harness/image_harvester_v0/**`, records full provenance (provider/license/license_url/
source_url/download_url/sha256 of actual bytes), builds a contact sheet, and REJECTs legible signage/
branding at discovery (P5). Output = a harvest package.

**S4 — Review (agent, PROVEN-SCOPED, always coupled to S3).** Invoke `image-reviewer` on the S3 package:
per-candidate suitability + risk (P0 vocabulary), package-consistency, licence posture. Suggestive only.

**S5 — Crop-proof (deterministic).** Render each surviving candidate through the generic quote/insight
template at scrim 62 (the cc-0073 render recipe) and confirm text-safety. This is the authoritative
text-safety gate.

**S6 — Dedup (deterministic, live).** Build the candidate fingerprint array {provider, provider_asset_id
(from source_url/download_url), sha256, source_url} and call
`SELECT * FROM m.filter_new_candidates(:candidates)` as service_role. Keep only `is_new = true`; log every
excluded candidate with its `exclusion_reason` (dup_pool_* / rejected_*). This is where Slice-1's reject
store and the existing pool gate the flow — nothing previously rejected or already held is re-offered.

**S7 — Fenced intake (PK-GATED, per Image Workflow §2 — never waived).** For the `is_new` survivors,
author a fenced INSERT into `c.shared_creative_asset` (the cc-0044/cc-0073 intake pattern):
`approval_status='intake_candidate'`, `is_active=false`, `production_use_allowed=false`, all fences
default-closed, `allowed_clients={}`; full provenance (sha256 recorded == public-URL sha256 verified);
`brand-assets` bucket; single atomic call with the in-txn fail-closed **pool-neutrality assertion**
(every other client's eligible set byte-identical pre/post). Runs through the T3 chain (db-rls-auditor →
external review pinned to hash → branch-warden) and a **PK apply gate**. No fence flips, no allowlist,
no promotion.

**S8 — Shortlist → PK visual gate (STOP).** Assemble the PK-facing shortlist: the contact sheet + each
fenced candidate's render, provenance, reviewer verdict, crop-proof, and the dedup log. Present for the
**PK visual verdict — the only deciding act.** The pipeline halts here. Promotion (flip fences / widen
`allowed_clients`) is the SEPARATE, existing manual PK-gated path (cc-0073 D2), never automatic.

## Proof (the PK acceptance criterion)
A detected shortage (S1, seeded floor 6) → candidates sourced without manual naming (S2–S3) →
filtered brand/people/signage/licence/quality (S4–S5) → **rejected fingerprints + pool dups excluded
(S6)** → fenced intake (S7) → PK shortlist (S8), for Invegent + CFW, with **zero production promotion**
(pre/post: no fence flip, no allowlist change, all clients' eligible sets unchanged except the fenced
additions which are non-eligible by construction).

## Guardrails (carried verbatim from §2 non-negotiables)
PK visual verdict = only deciding act · crop-proof before accept · licence + sha256 provenance ·
pool-neutrality machine-assertion on every intake · fenced-until-approved default · CAS/fail-closed ·
allow-listed providers only · person-free, no legible signage · NDIS Phase 2 CLOSED / Phase 3 HELD.

## Build status
- S1 detector `m.detect_background_shortage` — APPLIED (Slice 2).
- S6 dedup `m.filter_new_candidates` — authored + logic-proven; db-rls-auditor + PK apply gate pending (Slice 3a).
- S2 manifest / S7 intake packet / S8 shortlist — orchestration templates (this runbook); exercised by the proof run.
- S3/S4/S5 — existing proven primitives (image-harvester / image-reviewer / crop-proof recipe).
