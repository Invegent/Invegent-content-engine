# Publishing Plan Pyramid — Inventory & Design Brief

> **Status:** authoritative design contract for the future client publishing-plan UI.
> **Produced:** 2026-06-29 (CE session). Source: the Control Tower inventory run this session
> (dashboard UI inventory + CE backend inventory + live-DB schema inventory) plus PK design direction.
> **Repos:** backend = `Invegent-content-engine` (this repo); UI = the SEPARATE `invegent-dashboard`
> repo (`dashboard.invegent.com`).

---

## 0. Authoritative state at time of writing

- CE register **v4.13** current; Control Tower **P1 closed end-to-end**.
- Format Mix Enforcement **Phase 1 live**; governed enrollment model **live**.
- Property Pulse enrolled via `c.client_control_tower_enrollment` (1 row); `m.format_mix_enrolled`
  is the **DB-backed STABLE** fail-closed function; `c.client_format_mix_audit` exists.
- Editable UI **not started**; Pyramid Slice 1 **not started**; variant mix **not ready**;
  Phase 1 post-fill confirmation **pending**; ACI Slice C proof **pending**.

### ⚠️ Reconciliation to preserve (do not be misled by repo text)
Some CE migration file headers still read `STATUS: NOT YET APPLIED`
(e.g. `supabase/migrations/20260628000000_format_mix_enforcement_phase1.sql`,
`supabase/migrations/20260628120000_control_tower_p1_enrollment_format_mix.sql`).
**Production truth overrides the file text:** both were applied to production via PK-authorized
`execute_sql` (apply_migration was harness-denied), then ledger-backfilled. Live DB confirms:
`c.client_control_tower_enrollment` has 1 Property Pulse active/approved/enforce row;
`m.format_mix_enrolled` is DB-backed STABLE; `c.client_format_mix_audit` exists. **Treat the stale
headers as record-only text, not production truth.**

---

## 1. Verdict

- **`READY_FOR_UI_DESIGN`** — the inventory is complete enough to design the Publishing Plan
  Pyramid read surface.
- **NOT ready for editable implementation** — the write-side, the schema-exposure path, and a
  pre-existing privilege remediation must land first (see §14). The first build slice is
  **strictly read-only** (§16; readiness in §15).

---

## 2. Naming & design principle

- **"Publishing Plan Pyramid" is the preferred, user-facing name.** "Control Tower" remains an
  acceptable **internal/backbone** term (DB objects keep names like
  `c.client_control_tower_enrollment`), but the operator-facing surface is the Pyramid.
- It is **client-specific** — one client's publishing plan at a time.
- It **starts from the client's publishing goal, not the database.** The top of the pyramid is
  "what does this client want to publish?", not a raw config table.
- It lets an operator **sit above the whole client publishing plan and drill down only where
  needed** — summary at the top, detail on demand via a side drawer.
- It must **not be another raw database table.** The existing Creative Mix audit (DB-dump style)
  is the anti-pattern to move away from; its data is reused, its presentation is replaced.

---

## 3. Pyramid hierarchy

### Layer 1 — Publishing Goal / Schedule  *(what does this client want to publish?)*
Platforms, days, times, cadence, `max_per_day`, `min_gap_minutes`, publishing enabled/disabled.
Sources: `c.client_publish_profile`, `c.client_publish_schedule`, `c.client_cadence_rule`.

### Layer 2 — Format Mix  *(what content formats fill the schedule?)*
Platform × format matrix. Each **cell = eligibility state + allocation state**: active / available /
off / blocked; allocation %; threshold / `max_per_week` if available; source (platform default vs
client override); enforcement state. Sources: `c.client_format_config`,
`t.platform_format_mix_default`, `c.client_format_mix_override`, `m.format_mix_enrolled`.

### Layer 3 — Format Variant Mix  *(which creative treatments/templates fill each format?)*
**Placeholder only for now. Do not build.** The model does not exist yet (see §11).

### Side Drawer — Eligibility / Proof / Operator Actions  *(applies to every layer)*
Explains **why** something is allowed, blocked, risky, or missing. Shows policy, smoke proof,
render proof, publisher proof, enrollment, format enablement, and the **exact required operator
action**. Opened by clicking any cell/row; read-only in v1.

---

## 4. Files / routes inspected (dashboard repo)

| Area | Route / file |
|---|---|
| Clients hub (10 tabs: overview·profile·voice·digest·connect·feeds·schedule·avatars·onboarding·creative-mix) | `app/(dashboard)/clients/page.tsx` |
| Schedule | `components/clients/ScheduleTab.tsx` + `actions/schedule.ts` |
| Overview publish toggles | `app/(dashboard)/components/clients/PublishProfileToggles.tsx` + `actions/publish-profile-toggle.ts` |
| Voice & Formats | `app/(dashboard)/components/clients/VoiceFormatsTab.tsx` + `actions/voice.ts` |
| Creative Mix (Slice 1 + 2, read-only) | `components/clients/ProductionEvidenceCard.tsx`, `components/clients/CreativeConfigGapCard.tsx` + `actions/client-creative-evidence.ts`, `actions/client-creative-config-audit.ts` |
| Avatars | `app/(dashboard)/components/clients/AvatarTab.tsx` + `actions/avatars.ts` |
| Digest / Connect / Feeds / Onboarding / Profile | `DigestPolicyTab.tsx` + `actions/digest-policy.ts`; inline Connect (`page.tsx`); `feeds/feeds-client.tsx`; Onboarding forms; `client-profile/ClientProfileShell.tsx` (+ duplicate route `app/(dashboard)/client-profile/page.tsx`) |
| Client selection | `lib/client-context.tsx`, `components/global-client-picker.tsx`, in-page `ClientPill` row (`page.tsx`) |

## 5. DB / functions / actions inspected (live project `mbkmaxqhsohbtwsqolns`)

Tables: `c.client_publish_profile`, `c.client_publish_schedule`, `c.client_cadence_rule`,
`c.client_format_config`, `c.client_format_mix_override`, `c.client_control_tower_enrollment`,
`c.client_format_mix_audit`, `t.platform_format_mix_default`, `t.format_synthesis_policy`,
`t.format_quality_policy`, `t.class_format_fitness`, `t."5.3_content_format"`, `m.slot`,
`c.client_publish_profile_audit`, `c.client_channel(_allocation)`, `c.brand_avatar`,
`c.client_avatar_profile`, `c.client_ai_profile`.
Functions: `m.format_mix_enrolled`, `m.materialise_slots`, `m.build_weekly_demand_grid`,
`m.allocate_week_formats`, `m.fill_pending_slots`.
Dashboard server actions: `schedule.ts`, `publish-profile-toggle.ts`, `voice.ts`, `avatars.ts`,
`digest-policy.ts`, `client-creative-evidence.ts`, `client-creative-config-audit.ts`.

## 6. Current UI map

| Tab | Purpose | Editable? | Data source | Mutation path → table | Prod impact | Relationship to Pyramid |
|---|---|---|---|---|---|---|
| Overview | Per-platform publish/generation status + credential health | Mode/Publish/R6/Auto-approve **yes**; Images/Video/Token **read-only** | `getPublishProfiles` (SQL on `c.client_publish_profile`) | `update_publish_profile_toggle` → `c.client_publish_profile` | Yes (gates publisher) | **Layer 1 eligibility input** (link, don't move) |
| Voice & Formats | Per-(platform×job) task prompts + read-only avatar roster | task_prompt **yes**; schema hint + roster read-only | `getContentTypePrompts`; `get_brand_*` | `upsert_content_type_prompt` → `c.content_type_prompt` | Yes (AI drafts) | Supporting (low) |
| Schedule | Weekly publish time-slots per platform | **yes** (grid + add/remove times) | `get_publish_schedule` | `save_publish_schedule` → `c.client_publish_schedule` | Yes (publisher cron) | **Layer 1 host / the Pyramid's home tab** |
| Creative Mix | Read-only production evidence + config-gap audit | **read-only** | `getClientCreativeEvidence`, `getClientCreativeConfigAudit` (SELECT-only) | none | No (display) | **Direct precursor — becomes Layer 2 read-side** |
| Profile | Brand / platform / prompts / generation settings | yes | SQL helpers | `PATCH /api/client-profile/{brand,platform,prompts}` → `c.client_brand_profile`/`c.client_platform_profile`/`c.content_type_prompt` | Yes | Supporting (med) |
| Avatars | Avatar/persona assignment + HeyGen poll | yes | `get_brand_stakeholders`/`get_brand_avatars` | `assign/clear_brand_avatar`, `toggle_brand_stakeholder_active`; EF `heygen-worker` | Yes (render identity) | **Layer 3 / variant eligibility input** (link) |
| Digest | Bundler policy | yes | `getDigestPolicy` | `upsert_client_digest_policy` → `c.client_digest_policy` | Yes | Out of scope |
| Connect | OAuth credential connect | links | `getPublishProfiles`/`getYoutubeChannels` | `/api/<platform>/auth` | Yes (creds) | Layer 1 eligibility input |
| Feeds | Feed sources / suggestions | yes | `getFeeds` | feeds actions | Yes (ingestion) | Out of scope |
| Onboarding | Discovery seeds/keywords | yes | `getDiscoverySeeds` | `actions/discovery-keywords.ts` | Yes (discovery) | Out of scope |

## 7. Backend / data-source map (concept → source of truth)

| Concept | Source |
|---|---|
| Publishing enablement | `c.client_publish_profile.publish_enabled` (+ `c.client_channel.is_enabled`) |
| Schedule / cadence | `c.client_publish_schedule.(day_of_week, publish_time, enabled)`; `c.client_cadence_rule.(posts_per_period, period_unit, weekdays, preferred_local_times)` |
| Format enablement | `c.client_format_config.(ice_format_key, is_enabled, platform)` (platform precedence; fail-closed) |
| Format-mix defaults (global) | `t.platform_format_mix_default.(platform, ice_format_key, default_share_pct, is_current)` |
| Client overrides | `c.client_format_mix_override.(ice_format_key, override_share_pct, is_current)` — **0 rows globally** |
| max_per_day / min_gap | `c.client_publish_profile.(max_per_day, min_gap_minutes)` (publisher-enforced) |
| max_per_week | `c.client_format_config.max_per_week` (**not enforced anywhere yet**); `c.client_channel_allocation.posts_per_week` |
| Slot format selection | `m.slot.format_preference[]` → `m.slot.format_chosen` |
| Governed enrollment | `c.client_control_tower_enrollment` + `m.format_mix_enrolled` |
| Policy / quality / fitness | `t.format_synthesis_policy`, `t.format_quality_policy`, `t.class_format_fitness`, `t."5.3_content_format"` |
| Avatar / persona capability | `c.brand_avatar`, `c.client_avatar_profile`, `c.client_ai_profile.persona` |
| Variant / contract capability | **No config table** — runtime-stamped into `draft_format.contract` / `render_spec` only |
| Smoke / proof evidence | `m.post_render_log` (render_spec contract echo + warn-only `contract_validation`); `docs/creative-library/*` declarative contracts |

## 8. Ownership classification

| Capability | Class |
|---|---|
| Format enablement (`c.client_format_config`) | **Pyramid core** (read now, edit later) |
| Format-mix defaults (`t.platform_format_mix_default`) | **Pyramid core (read)** — exposure-gated (§14) |
| Client overrides (`c.client_format_mix_override`) | **Pyramid core (write target)** — empty today |
| Governed enrollment (`c.client_control_tower_enrollment`) | **Pyramid core** — live |
| Creative Mix audit + Production Evidence cards | **Supporting evidence** — become Layer 2 read-side |
| Quality/synthesis/fitness policy (`t.*`) | **Supporting evidence** — exposure-gated |
| Schedule/cadence (`ScheduleTab`, `c.client_publish_schedule`) | **Remain in existing tab** (host the Pyramid here) |
| Platform publish enablement (Overview toggles) | **Linked from Pyramid, not moved** |
| Avatars roster / Avatars tab | **Linked from Pyramid, not moved** |
| max_per_day (`c.client_publish_profile`) | **Linked, publisher-enforced** |
| `/client-profile` standalone route | **Retire / merge** |
| Dual content-type-prompt editors | **Retire / merge** |
| Variant allowlist / target % / binding | **Needs new development** |
| max_per_week enforcement | **Needs new development** (column exists, unenforced) |
| Per-client tier wiring into Schedule | **Needs new development** (`service_tier` exists, not wired) |
| `m.materialise_slots` anon EXECUTE; `c.client_ai_profile` anon SELECT | **Unsafe / not ready** (pre-existing; remediate via security-auditor + PK gate) |

## 9. Format Mix Matrix — read-only design (v1)

- **Rows = platforms** (facebook, instagram, linkedin, youtube).
- **Columns = formats** (the `t."5.3_content_format"` universe, filtered to platform-supported).
- **Cell states:** `active` / `available` / `off` / `blocked`.
- **Cell shows:** allocation % (effective: override → default); source badge (platform default vs
  client override); threshold / `max_per_week` if available; enforcement state (enrollment +
  rollout_stage).
- **Blocked cells** show the missing prerequisite(s) (see §10) and the exact operator action.
- **Click opens a read-only side drawer** with the full resolution chain.
- **No inline editing, no save button, no mutation in v1.**

## 10. Eligibility model (prerequisites, not optional labels)

A cell is **blocked** unless ALL hold:
1. platform supports format
2. client has format enabled (`c.client_format_config.is_enabled`)
3. synthesis policy exists (`t.format_synthesis_policy`) — else `format_policy_missing`
4. quality policy exists (`t.format_quality_policy`)
5. render path exists (worker supports the format)
6. publisher path exists + publishing enabled (`is_publish_eligible` / `c.client_publish_profile`)
7. smoke/proof passed where required (governed contract proof, ACI formats)
8. Control Tower / enrollment active+enforce (`m.format_mix_enrolled`)
9. format safe for that platform/client

If any prerequisite is missing: the cell is **blocked**, the **backend must later reject
activation/allocation** (server-side, not UI-trusted), and the **UI must explain the exact operator
action required**.

## 11. Variant Mix — future reuse (do NOT build)

The same matrix pattern later extends to variants (sub-rows under each format cell). **The model
does not exist yet.** Missing pieces: variant **allowlist**; variant **target %**;
**client/platform/format/variant binding**; **selector enforcement** (resolver is hardcoded
PP+image_quote today); **template/contract proof**; **brand-asset proof**; **smoke/proof status**
per variant. Today variants exist only as runtime evidence in `render_spec.variant_key`
(production-evidence-only, not an allowlist). Build the format matrix first; variants are a later
extension once a `c.client_format_variant_*` model is designed.

## 12. Retire / merge recommendations

- **`/client-profile` standalone route** — merge/retire into `?tab=profile` (full duplicate).
- **Duplicate content-type-prompt editors** (Voice & Formats vs Profile shell) — merge to one
  (neither is complete: Voice&Formats has `promo_v1`; Profile shell has
  `output_schema_hint`/`notes`/`is_active`).
- **Creative Mix database-style audit** — restyle as supporting evidence / matrix diagnostics
  (keep the data, drop the DB-dump presentation).
- **Overview platform toggles** — link as Layer 1 eligibility inputs, **not blindly moved**.
- **Schedule remains the host** for the Pyramid because it answers "when"; format mix answers
  "what".

## 13. Schedule tab review

- **Day boundary:** order is Mon–Sat then **Sun last** (`DAY_ORDER`); no vertical-divider logic —
  separation is table columns only. If Sun-last confuses operators, divide the weekend visually.
- **Platform icon density:** all 4 platforms always render per day-cell (greyed if unconnected) —
  noisy; consider hiding unconnected platforms behind a toggle.
- **Tier limits are currently decorative** — `tier` is hardcoded `"standard"` (`page.tsx`); the
  real `c.client_format_config.service_tier` is not wired in.
- **Matrix placement:** the Format Mix Matrix should sit **below cadence as a distinct section**
  on the Schedule tab (one page, visually partitioned) — not a new tab, not interleaved.
- **Avoid density** by leaning on the pyramid layers + side drawer rather than packing one flat view.

## 14. Risks & hard stops

1. **Schema exposure (high):** schema `t` has **no usage for any app role** → the Pyramid
   **cannot read** format-mix defaults / quality / fitness over REST *even with the service-role
   key* (PGRST106-class, same shape as the `op.*` incident). Schema `m` is service-role-only. A
   read surface **must** go via a **service-role read RPC or a view in an exposed schema** — not
   direct PostgREST table reads.
2. **Pre-existing privilege smell (high, not introduced by this work):** `m.materialise_slots` is a
   SECURITY-DEFINER writer with `EXECUTE` granted to anon/authenticated → recommend
   `REVOKE EXECUTE FROM anon, authenticated` (PUBLIC-only revoke is insufficient on Supabase) via
   security-auditor + PK gate before broadening UI near it. `m.fill_pending_slots` /
   `m.build_weekly_demand_grid` have unpinned `search_path`.
3. **Sensitive data:** `c.client_publish_profile` holds secrets (`page_access_token`);
   `c.client_ai_profile` has anon SELECT + RLS-no-policy. Never surface on an anon path —
   service-role + explicit column allowlist only.
4. **No write-side yet:** `c.client_format_mix_override` is empty globally; editing implies a new
   governed write RPC + audit (deferred). v1 is strictly read-only.
5. **Client-selection model:** `/clients` uses `?client=<slug>` URL param; the global picker uses
   context + localStorage keyed on UUID. Decide which model the Pyramid consumes **before** any
   editable UI.
6. **No variant work** until the variant model exists (§11).
7. **No editable controls** until server-side validations + an audit path exist.

## 15. Implementation Readiness Addendum

Added before any build, to connect the last month of ICE work to the Publishing Plan Pyramid and to
fix exactly what Slice 1 includes, excludes, and depends on.

### 15.1 Last-month capability map (how recent ICE work feeds the Pyramid)

| Recent ICE work | Contribution to the Pyramid | In Slice 1? |
|---|---|---|
| Publishing reliability / YouTube recovery / publisher guards (asset-guard, publish_origin) | **Publishing confidence & platform state** — Layer 1 eligibility signal (publish path proven, throttles, paused state) | Read-only signal only |
| Content Studio T0/T1 | **Operator-created content path** — feeds planned volume, but a different surface | **No** (not Slice 1) |
| Series v2 | **Future input into planned content volume / creative planning** | **No** (not Slice 1) |
| Avatar governance / AGP / A2 (shadow resolver, brand-host) | **Avatar/persona eligibility + future variant proof layer** (Layer 3) | Read-only eligibility input later; not Slice 1 |
| Creative Library / ACI / Branch B (capability contracts, B0 governed template) | **Contract/template proof + governed creative paths** — the proof spine behind variant eligibility | Evidence source; variant build is later |
| Format Mix Enforcement Phase 1 | **Backend now obeys format mix for Property Pulse** at materialise time | Layer 2 enforcement truth (read) |
| Control Tower P1 | **Governed enrollment model replaces the hardcoded PP gate** (`c.client_control_tower_enrollment` + DB-backed `m.format_mix_enrolled`) | Layer 2 enforcement state (read) |
| Creative Mix dashboard slices (evidence + config-gap audit) | **Evidence / config-gap source** to be restyled into Pyramid diagnostics (not rebuilt) | Reused as Layer 2 read-side |
| Security / governance remediation (search_path, REVOKE, RLS posture) | **The reason write/edit paths remain gated** — privilege must be safe before editable UI | Constraint, not a feature |
| Insights workers / performance evidence | **Future feedback layer** (did the mix perform?) | **No** (not a Slice 1 blocker) |

### 15.2 Slice 1 explicit exclusions

Publishing Plan Pyramid **Slice 1 is read-only only** and must **NOT** include: editable format
controls · dry-run save/activation flow · write RPCs · variant mix implementation · multi-client
rollout · schedule behaviour changes · publisher/render changes · Insights Fix 2 · OBS work ·
Gmail ingest · PRV deploy · YouTube onboarding debt · avatar character expansion · broader ledger
drift reconciliation · Slice C proof execution · Phase 1 post-fill confirmation execution.

### 15.3 Evidence maturity labels (use in cells + side drawers)

A format must **not look fully safe merely because it appears in config.** The Pyramid should label
each cell/format with its real maturity:

- **Proven in production** — observed working end-to-end (render + publish evidence).
- **Configured and enforced** — config present and the enforcement gate is active.
- **Configured but not smoke-proven** — config present, no governed smoke/proof yet.
- **Policy exists but no render/publish proof** — synthesis/quality policy present, never produced.
- **Supported in theory only** — platform/worker could support it, no client config.
- **Blocked** — a prerequisite is missing (see §10); shows the exact operator action.
- **Not modelled yet** — no backing model exists (e.g. variant mix).

### 15.4 Operational mode labels (client/control state)

- **legacy** — no governed enrollment; pre-Control-Tower behaviour.
- **shadow** — enrollment present, observing only, not enforcing.
- **pilot** — enforcing for a limited scope.
- **enforce** — fully enforced.
- **editable-disabled** — read-only surface only; no write path wired.
- **editable-ready** — write path + server-side validation + audit exist.

**Current Property Pulse truth:** Format Mix = **enforce** · Enrollment = **governed DB row**
(`c.client_control_tower_enrollment`, 1 active/approved/enforce row) · Variant Mix = **not modelled**
· Editable UI = **disabled**.

### 15.5 Carry impact matrix

| Carry | Blocks Slice 1 read-only? | Blocks editable later? | Note |
|---|---|---|---|
| Phase 1 post-fill confirmation | No | No | Matters for confidence, not a read-only blocker |
| ACI Slice C proof | No | No | Matters for ACI/contract confidence; label affected cells accordingly |
| `t.*` / `m.*` exposure problem | **Yes — unless solved via service-role RPC/server action** | Yes | `t` unreachable by any role over REST; `m` service-role-only — the data contract MUST route around it |
| `m.materialise_slots` anon/auth EXECUTE (SECDEF writer) | No | **Should be remediated before broad editable UI** | Pre-existing privilege smell; security-auditor + PK gate |
| `m.fill_pending_slots` / `m.build_weekly_demand_grid` search_path | No | Should be remediated before editable | Unpinned search_path; hygiene before write paths |
| Global picker URL/client mismatch | No (URL-param Slice 1 is fine) | **Yes — blocks editable/activation UI** | Decide picker model before editable |
| Variant model missing | No (placeholder only) | **Yes — blocks variant matrix** | Needs `c.client_format_variant_*` model |
| `max_per_week` not enforced | No | No | Read-only display ok, but must be **labelled configured/not enforced** |
| Broader historical ledger drift | No | No | Admin debt; separate PK-gated reconciliation |
| v4.08 B1/B2 clarification | No | No | No production `render_spec.contract` echo observed yet; reconcile separately |
| Duplicate `/client-profile` + prompt editors | No | No | Retire/merge later (§12); not a Pyramid blocker |

## 16. Recommended next implementation slice

**Publishing Plan Pyramid Slice 1A — read-only data contract (service-role read RPC or safe server
action) for the matrix.**

Build order is **data contract first, UI second**:
- **Slice 1A (next):** author and prove a **service-role read RPC or safe server action** that
  resolves the full matrix shape (Layer 1 schedule summary + Layer 2 platform × format cells with
  eligibility/allocation/source/enforcement/maturity, and the side-drawer detail payload). This is
  what resolves the `t.*`/`m.*` exposure problem cleanly. **Prove the data contract before any UI.**
- **Slice 1B (after 1A proven):** render the read-only matrix + side drawer UI on the Schedule tab
  (Layer 1 summary, Layer 2 matrix, Layer 3 variant **placeholder only**), consuming the 1A
  contract. Reuse existing Creative Mix config-audit logic where possible.

Hard constraints for both: **no writes · no editing · no variant implementation · no schedule
behaviour change.**

---

## Cross-references
- Inventory source: this session's Control Tower inventory run (dashboard UI + CE backend + live DB).
- Related briefs: `docs/briefs/aci-slice-c-contract-validation-warn-only-brief.md`;
  `docs/dashboard/operator-journey-ia-v1.md`; `docs/dashboard/global-client-picker-v1-brief.md`
  (separate `invegent-dashboard` repo).
- Live objects: `c.client_control_tower_enrollment`, `c.client_format_mix_audit`,
  `m.format_mix_enrolled` (P1, applied to production; migration headers stale — see §0).
