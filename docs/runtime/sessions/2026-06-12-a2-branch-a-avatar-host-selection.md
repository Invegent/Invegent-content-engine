# 2026-06-12 — A2 Branch A: avatar-host selection sheet + PK interim-host decision (primary brand host v1)

**Status:** PK-approved session record. Read-only lane + this docs commit only — **0 register edits / 0 DB change / 0 `brand_avatar` activation-deactivation / 0 new avatars / 0 config change / 0 provider call / 0 worker call / 0 D-01 / 0 production change. T1 untouched. `00_` registers untouched.**
**Actors:** CCH (inventory read + selection sheet + this record).
**Authority impact:** none yet — this records a PK *selection decision*; the Branch A config change itself remains NOT EXECUTED and gated behind a separate change brief + D-01 + PK exact approval phrase.

---

## 1. Framing (PK direction, 2026-06-12)

**Branch A = primary brand host v1, not "one avatar forever."** The pin establishes a deliberate default face per brand. The wider cast concept is preserved: supporting characters remain part of the future Branch B role-aware model, and purpose-built brand-host characters are desired later and may replace the interim hosts.

## 2. Inventory correction

Fresh dedicated read of `c.brand_avatar` ⋈ `c.brand_stakeholder` (2026-06-12): **14 active rows per brand — 7 personas × {realistic, animated} each** — NDIS Yarns 14, Property Pulse 14, no inactive rows, all `avatar_type='stock'`, all `consent_required=false`. This corrects the gate-prep file's 11/13 figure (undercount from a combined query; `docs/runtime/sessions/2026-06-12-option-c-a2-gate-prep.md` §3). Correction to be carried into registers at next register pass.

NDIS Yarns personas: support_coordinator, local_area_coordinator, plan_manager, allied_health_provider, support_worker, family_carer, participant ("Alex").
Property Pulse personas: buyers_agent, investor, mortgage_broker, real_estate_agent, first_home_buyer, landlord, tenant.

## 3. Current fallback hosts (proven live, `avatar_selected_by='fallback_limit1'`)

- **NDIS Yarns: "Alex — NDIS Participant (Realistic)"** (`talking_photo_id b3a7e888…`, role `participant`)
- **Property Pulse: "Tenant (Realistic)"** (`talking_photo_id 47a5c85c…`, role `tenant`)

## 4. Why both fallback hosts must be avoided as defaults

- **Alex — NDIS Participant:** a first-person participant persona implies lived disability experience on every script. Suitable **only** for explicitly lived-experience content; as the default face of general NDIS explainers it risks misrepresentation and is brand-governance unsafe.
- **Tenant:** the narrowest stakeholder lens in the PP cast. Broad property-market commentary fronted by a renter persona misframes the brand. Suitable **only** for tenant-perspective content.
- Both were selected arbitrarily by `LIMIT 1` (no `ORDER BY`) — nobody chose them, and there is no face-stability guarantee between renders.

## 5. PK-selected interim primary hosts (decision of record)

| Brand | Interim primary host v1 | heygen_avatar_id | Rationale |
|---|---|---|---|
| **NDIS Yarns** | **Support Coordinator (Realistic)** | `7e98bd3860f1…` | NY needs a neutral explainer / trusted guide / navigator voice; Support Coordinator ("connects participants to services, helps implement and manage their NDIS plan") is the best existing proxy. (Local Area Coordinator was runner-up but carries NDIA-affiliation optics as a standing face.) |
| **Property Pulse** | **Buyer's Agent (Realistic)** | `5d03454fbd0c…` | PP needs a market-facing commentator aligned with buyer-side / property-advisory positioning; Buyer's Agent is the best existing proxy and is directly brand-aligned with PK's Property Buyers Agent business. |

## 6. Supporting cast — preserved for Branch B

Nothing in this decision deletes the cast concept. Earmarked supporting characters (both render styles), to return under the future role-aware Branch B model:

- **NDIS Yarns:** participant (lived-experience scripts), family/carer, plan manager (budgets/funding), allied health provider (therapy/clinical), support worker (frontline care), local area coordinator (early-pathway).
- **Property Pulse:** tenant (tenant-perspective), landlord (rental two-hander), first home buyer (beginner explainers), investor (strategy), mortgage broker (rates/finance), real estate agent (vendor-side stories).

## 7. Future purpose-built brand-host characters (desired, later, non-blocking)

Create later: **"NDIS Yarns Host" / "NDIS Navigator"** and **"Property Pulse Analyst" / "Property Pulse Host"** — each requiring a `brand_stakeholder` row + HeyGen avatar creation (provider action, gated) + `brand_avatar` row. These may replace the interim primary hosts if better brand fits. **They must NOT block the immediate safety fix** — the arbitrary fallback is fronting live renders now, so the interim pin proceeds first.

## 8. Branch A execution concept (config-only — NOT EXECUTED)

Per brand, set `is_active=false` on all `c.brand_avatar` rows **except** the selected primary's Realistic row — exactly one active row per brand, because heygen-worker v2.1.1 selects `LIMIT 1` over active rows, so single-active = deterministic pin. (Animated twins deactivate too — ai-worker hardcodes `render_style:'realistic'` in avatar script gen, so this costs nothing today.) CFW/Invegent untouched. Gating when executed: preflight check that no other consumer depends on `is_active` (dashboard avatar pages, generation flows) → `apply_migration` DO block on `c.brand_avatar` → D-01 cross-review → PK exact approval phrase → post-apply verification (next render's `avatar_identity.talking_photo_id` = pinned ID). A separate Branch A change brief will be authored for PK approval; **no execution under this session record.**

## 9. Rollback path

Pure `UPDATE … SET is_active=true` re-activation. The pin touches no identity data and deletes nothing. Prior state of record: **all 28 NY+PP rows active** (14 per brand, §2). Worst case: one render cycle on the pinned host before rollback. Zero schema change, zero worker redeploy.

## 10. Constraint compliance (this lane)

Read-only: 1 SELECT (full NY+PP `brand_avatar` ⋈ `brand_stakeholder` inventory) + this session-file commit. **0 register edits / 0 DB write / 0 migration / 0 avatar activation-deactivation / 0 new avatars / 0 config change / 0 HeyGen or provider call / 0 worker call / 0 cron change / 0 D-01 / 0 production mutation. T1 untouched.** Next step: author Branch A change brief for PK approval (separate artifact; not executed).
