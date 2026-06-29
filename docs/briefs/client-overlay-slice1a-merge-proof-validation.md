# Client Overlay — Slice 1A merge-proof validation record

> **Status:** validation record (docs-only). **No implementation.** No DB tables/RPCs, no migration,
> no `execute_sql` mutation, no grant change, no dashboard UI, no editable controls, no write RPC, no
> GFCP/PPP/Creative-Library/runtime change, no deploy, no production mutation.
> **Recorded:** 2026-06-29 (CE session). **Proof method:** read-only SELECTs over the two live STABLE
> RPCs against production (project `mbkmaxqhsohbtwsqolns`); zero mutation; no object created.
> **CE state at record time:** `main == origin/main == cb678d48e696f2d450b6f1d0838b872997718544`;
> register **v4.20** current. **Verdict: `READY_FOR_PK_REVIEW`.**
> **Decides against:** `docs/briefs/client-overlay-slice0-source-data-contract-decision.md`
> (D-COV-1…6). **Format Variant Intake remains PAUSED** (variant overlay stays `not_modelled`).

---

## 1. Purpose

Record the Client Overlay Slice 1A read-only merge proof — that the v0 overlay can be assembled
**server-side from the two existing RPCs** (no new DB/RPC object), and **ratify the precedence /
reason mapping** (R-MAP1, R-MAP2) surfaced by the proof. This validates the D-COV-1 decision against
live Property Pulse data before any UI is built.

## 2. Source RPCs (both live, proven, read-only — unchanged)

- `public.get_global_format_capability_pyramid(p_platform text, p_ice_format_key text, p_include_variants boolean)` — GFCP Slice 1A (register v4.19); client-agnostic global capability matrix.
- `public.get_publishing_plan_pyramid(p_client_id uuid)` — PPP Slice 1A (register v4.14); client enablement matrix.

Both are SECURITY DEFINER, STABLE, service_role-only EXECUTE. The overlay is a **server-side join on
`(platform, ice_format_key)`** with GFCP as the spine — no alteration to either RPC, no new object.

## 3. Proof client

**Property Pulse** (`client_slug = property-pulse`; `client_id` resolved read-only from `c.client`).

## 4. Payload counts

| Source | Cells | Platforms | Formats |
|---|---|---|---|
| GFCP (`null,null,false`) | **52** (spine) | 4 (facebook, instagram, linkedin, youtube) | 13 |
| PPP (`<pp client_id>`) | **44** | 4 (same) | 13 |
| **Overlay (joined)** | **52** | 4 | 13 |

## 5. Key alignment

- **Platforms compatible:** YES — identical 4-platform set.
- **Formats compatible:** YES — both 13 `ice_format_key`s.
- **Unmatched PPP cells (orphans not in GFCP):** **0**.
- **Dropped GFCP cells:** **0** (overlay = 52 = GFCP spine).
- **GFCP cells without a PPP cell:** **8** (52 − 44) — handled by precedence as `globally_blocked`
  (global hard block) or `needs_client_setup`, never silently dropped.

## 6. Overlay matrix count

**52** = the GFCP spine count. Every global cell is represented exactly once; PPP cells are
left-joined onto the spine.

## 7. Overlay status distribution (Property Pulse) — sums to 52

| overlay_status | count |
|---|---|
| client_blocked | 15 |
| client_enabled_global_conflict | 11 |
| globally_proven_client_enabled | 10 |
| globally_blocked | 8 |
| needs_client_setup | 4 |
| conflict_review_required | 2 |
| globally_available_client_disabled | 2 |

`ready_for_client` and `client_enabled_global_unproven` did not surface for PP (PP's enabled+active
cells are either globally proven or globally conflicted, so they land in those buckets). Both would
surface for a client with configured-but-unproven enabled formats — covered by the derivation, not a
defect. Cross-client coverage of all 10 statuses is **not yet proven** (carry §13).

## 8. Sample cells by status (real, from the live proof)

| overlay_status | platform · format | global_support_state | client_cell_state | client_enabled | note |
|---|---|---|---|---|---|
| globally_proven_client_enabled | facebook · carousel | proven_in_production | active (mix 25%) | true | strongest "ready" |
| client_enabled_global_conflict | facebook · animated_text_reveal | conflict | blocked | true (mix 5%) | client uses a globally-conflicted pair (R-MAP1 case) |
| globally_blocked | facebook · animated_data | blocked | blocked | true | global hard block **overrides** client enablement |
| globally_available_client_disabled | instagram · video_short_avatar | proven_in_production | off | false | setup opportunity, not error |
| client_blocked | facebook · video_long_podcast_clip | supported_in_theory_only | blocked | false | client-side prerequisite missing |
| needs_client_setup | instagram · video_long_explainer | supported_in_theory_only | (no client cell) | — | no client config row |
| conflict_review_required | facebook · video_short_avatar | conflict | (no client cell) | — | global conflict, client not configured |

## 9. No-secret / security assessment

- **Secret scan PASS** — `access_token` / `credential_env_key` / `destination_id` /
  `page_access_token` / `client_secret` / `output_url` / `storage_url` all absent across both source
  payloads.
- The only `client_id` present is the **selected client's own** id (PPP `client_summary`) — the safe
  client reference the overlay needs, **not** a cross-client leak; GFCP is client-agnostic.
- The overlay carries a **whitelisted subset** of two already-sanitised payloads; it derives nothing
  secret client-side. The browser never calls either RPC (server-side merge via the service-role
  client only).

## 10. Performance / sizing assessment

Two STABLE read RPC calls + a pure-derivation join; both returned promptly. Combined source payloads
≈ **114 KB** (GFCP ~64 KB + PPP ~50 KB) fetched **server-side**; the merged overlay (52 cells) is
smaller than the sum and is what reaches the browser. **Acceptable for a server-side dashboard
merge.** It is larger than a single RPC — the named input to the "new RPC only if a later review
proves needed" clause — but not a v0 blocker.

## 11. Decision: no new backend RPC needed for v0

**Confirmed (D-COV-1).** The full, correct overlay was produced from the two existing RPCs + a
server-side join, with no new DB object, grant, or migration. A future overlay RPC remains
**optional**, justified only if a later performance/payload review demands it. **v0 ships as a
server-side merge.**

## 12. Mapping ratification (PK)

### R-MAP1 — global conflict outranks a client block (RATIFIED)
**Ratified.** When a cell is **both** client-blocked **and** globally-conflicted, the
`overlay_status` is the **global conflict/review status** (`client_enabled_global_conflict` if the
client enabled it, else `conflict_review_required`), **but** the client block is **preserved** in
`blocked_reasons[]` / `review_actions[]` so it is not lost.
**Rationale:** a global conflict is higher-value operator intelligence and must not be hidden under a
client-level block. *(Proof example: facebook · animated_text_reveal — client cell `blocked`, global
`conflict`, client enabled → `client_enabled_global_conflict`, with the client block retained as a
reason.)*

### R-MAP2 — keep `globally_available_client_disabled` separate from `needs_client_setup` (RATIFIED)
**Ratified.** These are **distinct** states with **different operator actions**:
- `globally_available_client_disabled` — a **client cell exists** but is inactive/off (a known,
  deliberate disable) → operator action = *enable/enroll* (setup opportunity).
- `needs_client_setup` — **no client cell exists** / config is missing → operator action = *create
  the config* (first-time setup).
**Rationale:** conflating them would hide whether the client has *considered and disabled* a pair vs
*never configured* it. *(Proof examples: instagram · video_short_avatar `off` →
`globally_available_client_disabled`; instagram · video_long_explainer no cell → `needs_client_setup`.)*

## 13. Remaining risks / carries

- **Client selection model** — the overlay needs a `client_id`; the dashboard `?client=<slug>` vs
  global-picker/localStorage mismatch (pre-existing carry) must be resolved for the client-context
  placement. *(carry)*
- **10-status display density** — the precise 10-status vocabulary is rich; Slice 1B may group for
  display (ready / caution / blocked / setup / review) while keeping the exact status underneath. *(open)*
- **Variant `not_modelled`** — variant overlay intentionally absent (Format Variant Intake paused);
  Layer 3 stays an honest placeholder. *(constraint)*
- **Cross-client coverage not yet proven** — only Property Pulse exercised; `ready_for_client` /
  `client_enabled_global_unproven` did not surface for PP and should be confirmed against another
  client (e.g. one with configured-but-unproven enabled formats) before/at Slice 1B. *(carry)*
- **Sizing** — ~114 KB combined server-side fetch; revisit only if more clients/formats inflate it. *(carry)*

## 14. Recommended next gate

**Client Overlay Slice 1B — read-only dashboard UI in the client context** (Client / Schedule /
Publishing Plan area), consuming a **server-side merge** of the two RPCs (no new RPC), rendering the
overlay matrix with the ratified R-MAP1/R-MAP2 statuses, a read-only drawer, and the `not_modelled`
variant placeholder. Read-only — no enable/disable/save/dry-run controls. Resolve the client-selection
carry (R §13) as part of placement. Gated; PK-reviewed; deployed only behind the standard dashboard
gate trail. *(Slice 1B is NOT started by this record.)*

---

## Cross-references

- Slice 0 decision: `docs/briefs/client-overlay-slice0-source-data-contract-decision.md` (D-COV-1…6;
  status vocabulary; precedence; payload shape).
- GFCP: `docs/briefs/global-format-capability-pyramid-slice1a-backend-brief.md`,
  `…-slice1a-review-packet.md`; register v4.19.
- PPP: `docs/briefs/ppp-slice1a-data-contract-validation.md`; register v4.14.
- Live source objects (read-only, unchanged): `public.get_global_format_capability_pyramid(text,text,boolean)`,
  `public.get_publishing_plan_pyramid(uuid)`.
