CLAIMED v5.22 · global-tmr-readiness-audit-v1 · main-checkout · commit-gate · 2026-07-06T22:40Z (verify register head at commit — active parallel churn)

# Result — Global TMR Readiness Audit v1 (Ultimate TMR, Phase 1)

**Packet:** `docs/briefs/global-tmr-readiness-audit-v1-packet.md` (Gate 1 D1–D6 PK-approved as recommended) · **Tier:** T1 · **Label:** SAFETY_GATE · **Completed:** 2026-07-06
**Status:** ✅ COMPLETE — read-only, zero mutation. Both legs clean: `ice-architecture-cartographer` **PASS** (spine + generic-vs-PP inventory), `db-rls-auditor` **PASS** (live per-client census, SELECT-only).

## Headline

**TMR is genuinely live for exactly one client — Property Pulse.** The governed-creative substrate (assets, template assignments, client-scoped provider templates, TMR-shape renders, shadow/drift coverage) exists **only** for PP. The other three clients render and publish at volume on the **legacy path** with effectively empty governed state. And the enabling insight: the **DB resolver layer is already client-generic**, but **five chokepoints above it are PP-hardcoded** — so the true next lane is *spine generalisation*, after which onboarding a client becomes a data exercise, not a code fork.

## Clients (from `c.client`, verified — all `status=active`)

| slug | client_id | |
|---|---|---|
| property-pulse | `4036a6b5…` | TMR pilot (live) |
| ndis-yarns | `fb98a472…` | publisher, no governed substrate |
| care-for-welfare-pty-ltd | `3eca32aa…` | publisher, thinnest footprint |
| invegent | `93494a09…` | publisher, brand-kit blocked |

## Global TMR Readiness Matrix

| Dimension | Property Pulse | NDIS Yarns | Care for Welfare | Invegent |
|---|---|---|---|---|
| Brand profile row | ✅ | ✅ | ✅ | ✅ |
| Logo | ✅ | ✅ | ✅ (client-assets) | 🔴 **NULL** |
| Brand colours | ✅ | ✅ | 🔴 none | 🔴 none |
| Brand assets (total / governed-usable) | 41 / **17** | 0 / 0 | 0 / 0 | 0 / 0 |
| Template assignments (proven / vis-approved) | **2 / 15** | 0 / 0 | 0 / 0 | 0 / 0 |
| Client-scoped provider template | 1 (proven) | none | none | none |
| Renders with **TMR shape** | **2** (only ones in fleet) | 0 | 0 | 0 |
| Shadow-loop coverage | 19 rows | none | none | none |
| Format config | 9 enabled | 9 enabled | 🔴 none (fallback) | 🔴 none (fallback) |
| Avatars (brand_avatar / active) | 14 / 1 | 14 / 1 | none | none |
| Publish proof (fb·ig·li·yt·web) | 270·45·153·102·– | 270·44·95·59·– | 23·34·25·–·40 | 49·33·42·–·– |
| **TMR status** | 🟢 **TMR-ready (live)** | 🟡 **needs asset intake** | 🔴 **not onboarded** (brand-kit incomplete) | 🔴 **not onboarded** (brand-kit blocked) |

Notes: PP live background pool = **9** governed/active (confirms the v5.20 promotion; the probe markers legitimately lag at 8 pending the next sweep). `client_avatar_profile` (HeyGen/voice config) has **0 rows fleet-wide** — no client has DB-recorded avatar/voice-clone config. `tmr_drift_probe_run` is **global** (no `client_id`) — it is a PP-scoped probe today, not per-client.

## Per-client classification (lowest-unmet-rung wins)

- **Property Pulse — TMR-ready (live).** Full brand kit; 17 governed assets; 2 production_proven + 15 visually_approved assignments; a client-scoped `production_proven` Creatomate template; the only TMR-shape renders in the fleet; 19 shadow rows. The pilot, end-to-end proven.
- **NDIS Yarns — needs asset intake.** *Furthest along of the un-onboarded:* complete brand kit (logo + colours), 9 formats enabled, 14 avatars (1 active — relevant to its avatar/video ambitions), publishing at volume. The *only* gap is governed-creative substrate (0 assets, 0 assignments, 0 provider template, 0 shadow). Onboarding starts at **asset intake**, not brand-kit remediation.
- **Care for Welfare — not onboarded (brand-kit incomplete).** Logo present but **no brand colours** and **no format config**; unique `website` publish channel (40); no avatars. Needs a brand-kit completion (colours + format config) *before* asset intake.
- **Invegent — not onboarded (brand-kit blocked).** **No logo** (`brand_logo_url` NULL) and no colours. A missing logo is a **hard-fail for governed image_quote render** (Creatomate 400 — a known ICE failure mode). Brand-kit remediation is a prerequisite before Invegent is even a TMR candidate.

## Generic-vs-PP-hardcoded inventory (the strategic finding)

**Already generic** (client-parameterised, zero PP literal): `select_template(p_client_slug,…)` (`migrations/20260703035154…:81`) and `resolve_slot_assets(p_client_slug,…)` (`migrations/20260703002813…:48`). The resolver mechanism does not assume PP.

**PP-hardcoded — must generalise before a second client (5 chokepoints):**
1. **The live Option-D gate** — `isB1GovernedImageQuote(clientId)` returns true only for the PP UUID (`image-worker/b1_production.ts:69-71`, wired `index.ts:652`). *This single literal decides whether TMR runs at all;* every non-PP client falls through to legacy.
2. **`B1_GOVERNED_CLIENT_SLUG='property-pulse'`** fed to the generic resolver (`b1_production.ts:33`).
3. **The capability-contract resolver** — `resolveCreativeContract` + the frozen `PP_IMAGE_QUOTE_NEWS_CARD_V1` contract, keyed on the PP UUID, **duplicated** in `image-worker/creative_contract.ts:124-221` and `ai-worker/creative_contract.ts` (identical). No multi-client lookup structure.
4. **The entire drift probe** — `PP_CLIENT_ID` literal (`tmr-drift-probe/index.ts:99`), the B1 label filter (`:102`), and the vendored PP-only `POOL_MARKERS`/`EIGHT_KEY_POOL` (`markers.ts:77-103`). Single-client health coverage.
5. **The declarative Creative Library exists only as `property-pulse.json`** — a second client needs its own declarative registry + vendored projections.

**PP-hardcoded but acceptable** (does not block generalisation): `TMR_WINNER_TEXT_FIELDS` (template-keyed, not client-keyed, `b1_production.ts:152`); the `fb9820f8` historical provider ref (correctly quarantined); and — notably — the AP-4 `policy:tmr_spine` rebind, which is the *target end-state pattern* (a governed field with no hardcoded list).

## Safety exposure (dimension 10 — partial, honest)

All four clients publish at volume on the **legacy path**; only PP's 2 image_quote renders carry the governed (fail-loud) TMR shape. So the governed-safety guarantees cover ~0% of live output today. The Lane A / B1–B5 backlog (asset-missing publish, render-on-dead-drafts, approve→publish stuck, video-without-QA) applies **fleet-wide** on the legacy path. **Not enumerated this pass:** per-client B1–B5 counts (would need a dedicated query pass) — flagged as a fast follow-up, not resolved here.

## Recommended rollout order (the deliverable — a recommendation, PK decides)

1. **Spine Generalisation v1 (prerequisite, gates everything else).** De-hardcode the 5 chokepoints into a client-registry lookup: gate → registry-driven, contract resolver → per-client lookup, drift probe → per-client (or client-loop), declarative registry → one file per client. This is Phase 5's "global resolver" made concrete and small (5 named sites). **Until this lands, every new client is a code fork.**
2. **NDIS Yarns onboarding (first second-client).** Highest readiness (brand kit + avatars + format config already present). Onboard via asset intake → NDIS declarative registry → template mapping → render proof → publish proof. Exercises the generalised spine on the best-prepared client.
3. **Care for Welfare** — after a brand-kit completion micro-lane (colours + format config), then onboard.
4. **Invegent** — brand-kit remediation (logo + colours) is a hard prerequisite; then onboard. Lowest priority given the blocker.

**Cross-cutting, in parallel:** close **Lane A publish/render safety gates** before scaling volume on any client (legacy-path exposure is fleet-wide); generalise the **drift probe** to per-client as part of step 1 so each onboarded client gets health coverage.

## Phase-2 note (informs, does not design)

The "TMR passport" should be a **thin layer over structures that already exist and are populated for PP** — `c.client_brand_profile`, `c.client_format_config`, `c.client_brand_asset`, `c.creative_template_client_assignment`, `c.creative_provider_template` — plus a per-client declarative registry. The audit found **no need for the six net-new `*_policy` tables** the roadmap sketched; Phase 2 is a reconciliation + checklist/view over existing tables, defined in its own later Gate-1 lane.

## What this audit did NOT verify (open items)

- **`resolve_brand_assets` DDL is absent from `supabase/migrations/**`** — it is referenced by the workers and used live by PP, but no `CREATE FUNCTION` for it exists in the repo → possible **repo↔prod migration drift / an undocumented live function**. Worth a follow-up (fetch live `pg_get_functiondef`, add to repo).
- Per-client B1–B5 safety-gate counts (see Safety exposure).
- HeyGen/ElevenLabs live provider status (recorded state only per D4 — DB shows 0 avatar-profile rows fleet-wide; render-time voice resolves via worker `getVoiceId`, not a client config table).
- No live external-provider calls made; no render/publish attempted; deployment/cron liveness taken from register + code evidence (not re-invoked).

## Boundaries honoured

Read-only throughout — no DML/DDL, no promotion/intake, no template/asset/registry/schema/dashboard/cron/EF/worker change, no external-provider calls, no render, no publish. The audit **recommends** a rollout order; it does not decide it, and it did not design the onboarding contract, global resolver, or global dashboard — those remain later PK-gated lanes this matrix informs.
