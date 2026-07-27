# Brief cc-0083 — avatar role-lens selection + persona identity

**Created:** 2026-07-26 Sydney
**Author:** chat (orchestrator)
**Executor:** Claude Code (orchestrated ICE lane)
**Status:** draft
**Result file:** `docs/briefs/results/cc-0083-avatar-role-lens-selection.md` (created on completion)

**Lane class:** PRODUCT_PROOF · **Tier:** T3 (production code deploy + DDL + governed DML + live render proof)
**Task ID:** cc-0083 proposed as next-free above cc-0082 — **claim-stub verification required before any register-version cut** (reserved-block aware; cc-0081 holds v7.00–09).

---

## Task

Make the video **script** drive which NDIS stakeholder persona speaks. When a script has a clear stakeholder lens (Support Coordinator, Participant, Local Area Coordinator, Plan Manager, Support Worker, Allied Health Provider, Family/Carer), the governed avatar for that role is selected and rendered; when no clear role exists **or** the intended role has no active avatar for the client, the client's **default host** is used. Give each character a **separate persona name and role** (e.g. "Sarah — Support Coordinator"). Prove it end-to-end: three scripts with three different stakeholder lenses produce three correctly-matched characters, and a fourth script with no clear role produces the default host.

The plumbing is ~80% present but severed at one seam and starved of active characters. This lane wires the seam, stands up the characters (no HeyGen generation needed — the assets already exist), adds the persona-name field, and proves the behaviour on live renders.

## Source context

**The selection seam (code):**
- `supabase/functions/ai-worker/index.ts:423-513` — `suggestAvatarRole()` already maps an episode persona → one of the brand's **active** `c.brand_stakeholder.role_code` values, but writes it to the **inert** `video_script.avatar_role_suggestion` (`:1330-1334`). ai-worker does **not** write the consumed `stakeholder_role` field (`:97-102`, `:1326-1329`). Current ai-worker VERSION ≈ v2.22.0.
- `supabase/functions/heygen-worker/index.ts:132-158` — `lookupAvatar()` already role-filters (`AND bs.role_code = '${stakeholderRole}'`, `:146`) and reads the role from `fmt.stakeholder_role ?? vs.stakeholder_role ?? null` (`:474`). The role predicate has **never fired** because nothing writes the field. On no eligible avatar it currently **fails closed** (`no_eligible_avatar`, ~`:499-506`). VERSION `heygen-worker-v2.4.1` (cc-0063 Step B).
- Selection order (already governed): `ORDER BY ba.is_default_host DESC, ba.is_primary DESC, ba.created_at ASC, ba.brand_avatar_id ASC` (`heygen-worker/index.ts:140`).
- Avatar identity flows into the **HeyGen** payload, not Creatomate: `character.talking_photo_id` = `ba.heygen_avatar_id`, `voice.voice_id` = `ba.heygen_voice_id` (`heygen-worker/index.ts:167-174`). Avatar is confirmed **outside** the `resolve_slot_assets` resolver spine — no `resolve_*` migration is implicated.

**The data model:**
- `c.brand_stakeholder` (`role_code`, `role_label`, `demographic_hint`, `character_brief`, `sort_order`, `is_active`) — the role/persona carrier. **No persona-name column exists** (live read 2026-07-26).
- `c.brand_avatar` (`brand_avatar_id`, `stakeholder_id`→stakeholder, `client_id`, `render_style`, `is_active`, `is_default_host`, `is_primary`, `heygen_avatar_id`, `heygen_voice_id`, `avatar_type`, consent fields). Column enum + constraints: `docs/briefs/multi-avatar-onboarding-and-proof-contract-gate1-v3.md:53-77`.
- Constraints that bound activation: `uq_brand_avatar_default_host_per_client_style` (INV-1, one default host per client×style), `ck_default_host_must_be_active` (INV-2, `is_default_host ⟹ is_active`, live+validated), and the **non-unique** `is_active` index — **multi-active is legal** (INV-4).

**Live NDIS-Yarns inventory (read 2026-07-26, project `mbkmaxqhsohbtwsqolns`):** 7 roles × 2 styles = 14 avatars. **All 14 carry non-empty `heygen_avatar_id` + `heygen_voice_id` (renderable stock avatars).** Only `support_coordinator / realistic` is `is_active=true, is_default_host=true`; the other 13 are fenced `is_active=false`. `role_label` holds the role only ("Support Coordinator") — **no name folded in**. Live `role_code` for the participant is `participant` (the cast doc's `ndis_participant` is stale).

**Persona cast names** (from `docs/video/avatar-profiles-ndis-yarns.md`, an otherwise-stale creation doc): Alex (Participant), **Sarah** (Support Coordinator), Marcus (Local Area Coordinator), Priya (Allied Health Provider), James (Plan Manager), Caleb (Support Worker), Diane (Family/Carer).

**Governing prior work:** `docs/briefs/character-model-v0-brand-host-designation.md` (six-concept model, sequencing), `docs/briefs/creative-render-intelligence-character-architecture.md` (CI suggests identity / RI resolves it), `docs/briefs/cc-0063-step-b-*` (the designation-consuming resolver), `docs/briefs/multi-avatar-onboarding-and-proof-contract-gate1-v3.md` (multi-active onboarding + discriminating two-character proof).

## Scope

**In scope (NDIS-Yarns, realistic style only):**
- **Slice A** — schema + data: add a `persona_name` column to `c.brand_stakeholder` (PK-gated DDL); populate the 7 NDIS persona names; make the dashboard display name read `persona_name — role_label` (`heygen-avatar-poller/index.ts:195`).
- **Slice B** — code seam: ai-worker promotes its already-computed role suggestion into the **consumed** field (`video_script.stakeholder_role`), **confidence-gated** (write only when the lens is clear; else leave null → default host); heygen-worker's no-eligible-avatar branch **falls back to the default host** instead of failing closed.
- **Slice C** — governed DML: activate 2 additional NDIS realistic avatars (Participant/Alex + Local Area Coordinator/Marcus) alongside the existing Support Coordinator/Sarah → 3 distinct-role active characters. Reversible; INV-1/INV-2 preserved (Sarah stays the sole default host).
- **Slice D** — proof: 3 distinct-lens scripts + 1 no-role script → live HeyGen renders → verify matched characters + default-host fallback + persona identity, with telemetry evidence.

**Out of scope:**
- **Multi-character dialogue** (two personas conversing in one video) — this is the explicitly-named *following* outcome, not this lane.
- Any HeyGen avatar generation / new avatar assets (not needed — stock assets exist).
- Property Pulse and all other clients; the **animated** render style; the shadow telemetry path (`AVATAR_SHADOW_TELEMETRY` / `resolve_and_record_avatar_shadow` / Phase 3.3 soak) — this lane wires the **live consumed** field, not the shadow resolver.
- Changing which avatar is the default host; adding `is_primary` designations; touching `resolve_slot_assets` or any Creatomate path.

## Allowed actions

- Read-only investigation across CE repo, docs, registers, and live DB (read-only SELECT).
- Draft slice sub-briefs / apply packets for each slice; run the ICE review chain per slice (db-rls-auditor on the DDL/DML; apply-harness-auditor shadow on any apply packet; branch-warden; ef-builder in an isolated worktree for code; external review pinned to hash on T3 artifacts).
- Prepare exact migration SQL (persona_name DDL), governed activation DML, and code diffs — **staged for the PK gate, not applied autonomously.**

## Forbidden actions

- **No deploy, migration apply, DML, merge, or push without the explicit PK gate.** Deploy/apply/DML are hard stops (§ PK gates).
- Do **not** enable `AVATAR_SHADOW_TELEMETRY` or touch the Phase 3.3 activation soak — that flag-enable is a standing PK BLOCK (`docs/briefs/agp-d01-gate3-phase3.3-activation-soak-runbook.md:6`) and is unrelated to this live-seam lane.
- Do **not** alter the default host, INV-1, or INV-2; do not activate animated avatars; do not touch other clients.
- Do **not** build multi-character dialogue.
- Honour all active hold-states in `docs/00_sync_state.md` at execution time.
- Deploy gotchas to enforce at the gate: `--no-verify-jwt` on EF deploy (else `x-series-key` callers 401→502); bundles-from-CWD (grep the deployed bundle for the marker); `scripts/safe-deploy.sh` + drift refresh; `apply_migration` mints its own version identity.

## Success criteria (the proof)

1. **Three distinct lenses → three matched characters.** Three scripts, each written from a different stakeholder lens (e.g. Support Coordinator, Participant, Local Area Coordinator), each render selects the avatar whose `role_code` matches the lens — three *different* characters, each with the correct `heygen_avatar_id`/`voice_id` and the correct persona name+role.
2. **Default host only when no clear role.** A fourth script with no clear stakeholder lens renders the client's default host (Support Coordinator/Sarah), telemetry `avatar_selected_by='default_host'`.
3. **Identity requirement met.** Each of the three characters presents a separate persona name and role ("Sarah — Support Coordinator", "Alex — NDIS Participant", "Marcus — Local Area Coordinator"), sourced from `persona_name` + `role_label`.
4. **Evidence recorded.** Per-render telemetry (`draft_format.avatar_identity`, `m.post_render_log.render_spec.avatar_identity`, `avatar_selected_by`) shows role-matched selection for the three and default-host fallback for the fourth; live HeyGen render IDs captured.

## Stop condition

When all four criteria are met and evidenced, write the result per the result template and stop. If any slice review or live pre-check trips a STOP, halt the sequence and surface to PK for a fresh gate.

---

## Notes — proposed slice sequence + apply order

Recommended apply order (each its own PK gate unless PK grants a Convention-2 pinned sequence):

1. **Slice A (persona_name DDL + data)** — additive, dark, lowest risk. Column is nullable; populating names changes no selection behaviour.
2. **Slice C (activate 2 avatars)** — governed DML; makes the two extra roles eligible *before* the role signal turns on, so the first role-matched request already has a carrier.
3. **Slice B, heygen-worker half (default-host fallback)** — deploy the robust fallback *before* the role signal, so a role with no carrier degrades to default host rather than failing.
4. **Slice B, ai-worker half (write consumed `stakeholder_role`, confidence-gated)** — deployed **last**; this is the switch that turns the role signal on.
5. **Slice D (proof)** — run the 4 scripts, capture evidence.

Rationale: the seam is turned on only after its carriers (active avatars) and its safety net (default-host fallback) are in place, so no intermediate state can fail a live render.

**Open design details for the slice sub-briefs (not blockers):**
- The confidence threshold/vocabulary at which ai-worker writes `stakeholder_role` vs leaves it null (Slice B). Default proposal: write only on high-confidence, single-role suggestions; anything ambiguous or multi-role → null → default host.
- Whether `persona_name` is per-stakeholder (one name per role per client — sufficient for single-role selection) or later needs to be per-avatar (relevant only to the *following* dialogue outcome). Proposal: per-stakeholder now.
- Exact proof-input mechanism for setting a script's persona lens (episode/series persona intent vs a direct draft field) — resolved in the Slice D sub-brief.
