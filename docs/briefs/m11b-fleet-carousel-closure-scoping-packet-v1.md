# M11b — Fleet Carousel Legacy-Routing Closure: Scoping Packet v1

**Lane:** `m11b-fleet-carousel-scoping`
**Created:** 2026-08-05 Sydney
**Author:** chat (Claude Code orchestrator)
**Executor (this pass):** chat (Claude Code) — read-only repo research + `db-rls-auditor` (DB access unavailable this session, see §7)
**Status:** `SCOPING_COMPLETE` — no mutation performed. Zero schedules/governance rows/workers/production
carousel routes touched.
**Tier:** T1 (docs/read-only, scoping) — the packet itself is T1; every closure lane it seeds is its
own separate, higher-tier (T2) PK-gated apply.
**Result file:** N/A this pass — this document is the deliverable. Each closure-lane seed packet
below gets its own `docs/briefs/<slug>-packet-v1.md` + Gate-1 approval + result doc when PK
authorises it to proceed.

---

## 0. Authoritative inputs (incorporated, not re-derived)

This packet treats the following as ground truth and does not re-litigate them:

1. **M11a inventory** — `docs/briefs/results/m11a-legacy-routing-inventory-result-v1.md` §6/§7 —
   the per-cell governed/legacy classification, and **Finding 1** (carousel is real, high-volume,
   ungoverned production for 3 of 4 clients, not a PP-only concern as the CGU Final baseline
   assumed).
2. **Carousel-provenance addendum** — same result doc, §12 (2026-08-04) — the per-client real
   upstream control (`c.client_format_config` vs `c.client_creative_governance`), live-vs-historical
   disposition, and the confirmation that `c.client_publish_schedule.format_override` is dead code
   repo-wide (never read by any edge function for format selection).
3. **D2 result** — `docs/briefs/results/d2-pp-legacy-carousel-governance-declaration-result-v1.md`
   — what "PP's declared-legacy governance" actually is (an additive `client_creative_governance`
   row, not a render-path gate), its disclosed `tmr-drift-probe` side effect, and its own explicit
   finding that a real migration (Creative Library v2 template-family extension) is "its own
   design-gate lane," not a same-day fix.
4. **post-cgu-v1-optimum-schedule-expansion packet v11 + apply result** —
   `docs/briefs/post-cgu-v1-optimum-schedule-expansion-packet-v11.md` §1.1/§1.2 and
   `docs/briefs/results/post-cgu-v1-optimum-schedule-expansion-apply-result-v1.md` — **applied live
   2026-08-04T10:20 UTC**, independently re-verified same day (DB + dashboard UI). This is the
   single most important supersession: it closed NDIS's carousel `client_format_config` exposure
   (Change 11) and reconfirmed CFW/Invegent's existing containment (Protection 2) and PP's
   untouched declared-legacy lever (Protection 1). **A 7-day monitoring watch is live through
   2026-08-11** with a standing constraint: no automatic cap raise, no further schedule/config
   mutation during the watch window.
5. **CGU Final programme brief** — `docs/briefs/creatomate-global-ultimate-final-delta-audit-v1.md`
   §2.2 (M11 row) and §0f — the ratified retirement default: *"migrate every active/scheduled/
   committed legacy route to governed by default; explicit retirement reserved for unused/
   superseded/disproportionately-expensive routes, each with a recorded PK disposition."* This is
   the standing policy this packet's dispositions must justify against, not invent independently.

This packet does not repeat those documents' own evidence tables verbatim; it synthesises them into
the fleet-wide inventory and disposition below and adds the code-level route citations M11a's own
scope didn't require (M11a scoped to governed/legacy classification per cell, not the exact
draft→render→publish call chain).

---

## 1. Fleet inventory — carousel code/data surfaces (shared across all 4 clients)

Carousel has **no client-specific code branch anywhere in the pipeline** — the same functions run
for all four clients; only *data* (config/governance rows) differs per client. This matters for
closure: a code change to any of these surfaces affects all four clients simultaneously.

| Stage | Surface | Citation |
|---|---|---|
| **Draft-format selection** | `ai-worker/index.ts` `fetchFormatContext()` — offers `carousel` in the advisor's palette only if `EXISTS (... c.client_format_config WHERE is_enabled=true AND format='carousel') OR NOT EXISTS (... any config row for this client)` | `supabase/functions/ai-worker/index.ts:1188-1197` |
| **Format advisor** | `callFormatAdvisor()` — Claude picks `carousel` when content has "3+ distinct structured points and minimum 200 words" | `supabase/functions/ai-worker/index.ts:1234-1250` |
| **Render** | `image-worker/index.ts` carousel block — picks up `recommended_format='carousel'`, `image_status='pending'` (no `approval_status` gate, by design, to avoid a scoring deadlock); calls `callContentAdvisor` (Claude, 3-6 slide spec) → `buildCarouselSlideScript()` per slide (a **locally-built Creatomate direct-source script — never `select_template`, never a stored template row**) → `upsert_carousel_slide` RPC → `m.post_carousel_slide` rows. Render-time gate is only the client-level `isImageEnabled(clientId)` toggle — **no format-specific governance gate exists in the render path**; `isImageGovernanceEnabled` is hardcoded to `'image_quote'` only and is never called with `'carousel'` (confirmed both by D2's own migration comment and independently re-read this session) | `supabase/functions/image-worker/index.ts:1208-1256` |
| **Publish — Facebook** | `publisher/index.ts` — organic multi-photo carousel via Graph API (v1.6.0); loads `m.post_carousel_slide` rows, uploads each as unpublished, posts as one multi-photo status | `supabase/functions/publisher/index.ts:429-526` |
| **Publish — Instagram** | `instagram-publisher/index.ts` — creates a carousel child container per slide (`is_carousel_item:'true'`), polls each, then creates + polls the parent carousel container before publishing | `supabase/functions/instagram-publisher/index.ts:374-404, 820-850` |
| **Publish — LinkedIn** | `linkedin-zapier-publisher/guard.ts` `classifyLinkedinFormat()` classifies `carousel` correctly, but `media_action.ts`'s `resolveZapierAction()` **hard-BLOCKs it** (`method_not_enabled_v0`) — carousel publishing to LinkedIn has never been enabled at any client, independent of upstream eligibility | `supabase/functions/linkedin-zapier-publisher/guard.ts:26,81-85`, `media_action.ts:10`, `media_action_test.ts:56-58` |
| **Cross-cutting side effect** | `tmr-drift-probe/index.ts` `fetchGovernedClients()` reads `c.client_creative_governance WHERE enabled=true` with **no format filter** — any client×carousel governance row (declared or newly added) feeds this daily cron and, absent a `declarative_registry_ref`, throws `declarative_registry_ref_missing` → daily status flips `ok`→`error`. This is PP's known, disclosed D2 side effect; it will recur for **any** new carousel governance row this packet's closure lanes propose, unless Option-B (named carry, not yet built) lands first | `supabase/functions/tmr-drift-probe/index.ts:246,419,691` |
| **Eligibility lever (the real one)** | `c.client_format_config` — row presence + `is_enabled` per (client, format). This is the **only** live lever for carousel draft-eligibility. `client_publish_schedule.format_override` is dead code for format selection (confirmed repo-wide, zero read sites) | addendum §12 |

### 1.1 Dashboard-side surfaces (invegent-dashboard, checked this session)

The dashboard has **no client-specific carousel branching in production code** — every carousel
reference found is a generic, client-agnostic label/order entry, and the three governing tables
(`client_format_config`, `client_creative_governance`, `client_publish_schedule`) are always queried
format-agnostically (no `WHERE ice_format_key='carousel'` filter exists anywhere in the repo). The
one client-aware carousel reference is a **test fixture only** (`tests/format-capability-regression.
test.ts:40-46`, an NDIS-Yarns oracle asserting `unsupported_silent_degrade` must never silently flip
to `ready` — it mocks the live `classify_format_capability` RPC, it is not app logic).

Concretely, a closure lane touching carousel disposition should be aware of:

- **Client Schedule tab** (`app/(dashboard)/clients/page.tsx:724-809`) renders
  `PublishingPlanPyramid` (carousel label + `FORMAT_ORDER_HINT`,
  `components/clients/PublishingPlanPyramid.tsx:57,184`) and `ClientCapabilityOverlay` — this is
  where an operator would see any per-client carousel eligibility change from Seed Packets A/B.
- **Global format-capability view** (`components/format-capability/GlobalFormatCapabilityPyramid.
  tsx:19`, `app/(dashboard)/create/format-capability/page.tsx`) — a fleet-wide, not per-client, view.
- **A static, hardcoded "carousel format: active, health: green" row** on the Pipeline Flow view's
  Image Worker node (`components/pipeline-flow/NodeDetailPanel.tsx:199`) — this is a cosmetic
  constant, not live-data-driven, so it will not itself go stale as clients close carousel, but it
  also will never reflect any client's actual disposition — worth a note if a future closure lane
  wants the dashboard to show real per-client state here.
- **Carousel is explicitly out of QA v0 scope** (`actions/render-qa.ts:26-38`,
  `QA_V0_CREATOMATE_FORMATS`) — consistent with this packet's own finding that carousel has no
  governed QA/evidence path; not a dashboard gap to fix, just a confirming cross-reference.
- **No IA/governing doc exists for a legacy-vs-governed-vs-disabled disposition model for any
  format** (`docs/dashboard/operator-journey-ia-v1.md` covers draft/publish *status* pills, not
  format eligibility; `docs/dashboard/static-image-governance-v1-brief.md` covers
  `client_creative_governance` generally but never mentions carousel and has no "disabled" category).
  A future closure lane that wants the dashboard to visibly represent "retired"/"contained" state
  would be writing net-new IA spec, not amending an existing one.

**Net effect for this packet's scope:** none of Seed Packets A/B/C need to touch dashboard code —
the existing UI already renders whatever `client_format_config`/`client_creative_governance` state
exists, generically and correctly, for all four clients. The one open item is documentation (no
disposition-display spec exists), named here for whoever eventually wants the dashboard to show
"retired" distinctly from merely absent/disabled.

---

## 2. Per-client disposition

Task vocabulary (`live legacy` / `declared legacy` / `historically contained` / `unused`) is applied
per client below. Where the evidence spans more than one label, both are named rather than forcing a
single clean tag the evidence doesn't support — that overlap is itself load-bearing for the closure
lane design in §4.

### 2.1 Property Pulse — **DECLARED LEGACY, live, ongoing**

| Field | Value |
|---|---|
| **Draft/render/publish route** | Shared fleet route (§1) — FB via `publisher/index.ts`, IG via `instagram-publisher/index.ts`. LinkedIn carousel was never a committed PP cell. |
| **Real production control** | `c.client_format_config` row `fc339e1e-5809-4b9c-9c03-2c60a4166a80` (`client_id 4036a6b5-b4a3-406e-998d-c2fe14a8bbdd`), `is_enabled=true` — the draft-eligibility lever. Render-path has **no** carousel-specific gate (only the client-level `isImageEnabled` toggle). |
| **Governance-row state** | `c.client_creative_governance` id `d2510001-0000-4000-8000-000000000001` — `format='carousel'`, `contract_ref='property_pulse.carousel.legacy_pipeline'`, `declarative_registry_ref=NULL`, `render_label='image_worker_legacy_carousel_v1'`, `enabled=true` (D2, applied 2026-08-02). **This row is declarative record-keeping only — it is not consulted by the render path**; its only live consumer is `tmr-drift-probe`'s daily sweep (known side effect, disclosed, accepted by PK as Option C). |
| **Schedule/config interaction** | v11 packet's **Protection 1** independently asserts this config row stays `is_enabled=true`, both pre- and post-apply, by design — PP is the one client this whole schedule-expansion programme deliberately left untouched. |
| **Current volume** | 90d (M11a): FB 129 succeeded/38 failed, IG 127/11. Post-level (D2 §5, same underlying data): 104 total carousel drafts, 37 actually published (23 FB + 14 IG); 629 `m.post_carousel_slide` rows. **Live and ongoing** as of the last independently verified date (2026-08-04). |
| **Disposition** | **Retain declared-legacy pending an explicit migrate-vs-retire decision — NOT a default "leave forever."** Per the CGU Final ratified rule (§0, item 5), an active/committed/high-volume route defaults to **migrate**, with retirement reserved for the disproportionate-cost exception, PK-recorded. D2 itself already found that a real migration means extending the Creative Library v2 schema to represent a non-template-family multi-slide object — explicitly named as its own design-gate lane, not attempted here. **Closure Seed Packet C (§4.3)** scopes that feasibility question; it does not resolve it. |

### 2.2 NDIS Yarns — **HISTORICALLY CONTAINED (as of 2026-08-04)** — was live legacy (incidental) before

| Field | Value |
|---|---|
| **Draft/render/publish route** | Identical shared fleet route (§1) — no NDIS-specific code ever existed. |
| **Real production control** | Same `c.client_format_config` mechanism, NDIS's own row `61e4f143-f0cf-4a9b-853c-f592daf82aaf` (`client_id fb98a472-ae4d-432d-8738-2273231c1ef4`). **Flipped `is_enabled` true→false 2026-08-04T10:20 UTC** (v11 packet Change 11), independently re-verified live + on the dashboard schedule tab (§4.5 of the apply result: "Off on FB+IG — Change 11 closure ✓"). |
| **Governance-row state** | **None, ever.** NDIS carousel was never formally declared in `c.client_creative_governance` — it was the exact "undeclared-legacy" category M11a's Finding 1 named. Its closure to date is a **config-layer** action, not a governance-layer one. |
| **Schedule/config interaction** | 13 `client_publish_schedule` rows with explicit `format_override='carousel'` were also flipped `enabled`→`false` in the same v11 apply (belt-and-braces; `format_override` itself is dead code for eligibility, per §0 item 2). |
| **Current volume** | 90d pre-closure (M11a): FB 57/4, IG 32/1 (89 succeeded); last render **2026-07-20** — already 15+ days decayed before the config closure landed. Since closure: **expected zero, not independently re-verified this session** — DB access was unavailable (§7); this is a named gap, not an assumption of continued closure. |
| **Disposition** | **Contain (done at config layer) → needs an explicit closure record at the governance layer to be complete.** Recommend a PK ruling: either (a) add a `c.client_creative_governance` row (`enabled=false`, documenting the closure) so NDIS carries the same kind of durable, self-documenting record PP has (declared, not silent), or (b) an explicit PK decision that config-layer closure alone is sufficient and no governance row is needed. Either is fine; leaving it unaddressed is not — it is the one client where "closed" currently rests entirely on a config flag with no accompanying declaration. |

### 2.3 Care For Welfare — **HISTORICALLY CONTAINED (since 2026-08-02)**

| Field | Value |
|---|---|
| **Draft/render/publish route** | Identical shared fleet route (§1). |
| **Real production control** | **Row-presence itself**, not a carousel-specific disable — CFW's `c.client_format_config` went from 0 rows (fail-open, full palette via the advisor's `NOT EXISTS` fallback) to 2 rows (`image_quote`, `text`, both `is_enabled=true`, added 2026-08-02) — which flips the fallback to a strict allowlist that structurally excludes carousel as a side effect, not as its stated purpose. |
| **Governance-row state** | **None.** Undeclared-legacy per Finding 1; the containment above was never a deliberate carousel decision until v11's own **Protection 2** named and asserted it explicitly ("row presence is what contains carousel; deletion fails open"). |
| **Schedule/config interaction** | Zero `format_override='carousel'` rows ever existed for CFW (addendum, confirmed by tracing every historical carousel draft). |
| **Current volume** | 90d pre-closure: FB 11, IG 60/4, LI 100/4 (171 succeeded — the highest non-PP carousel volume in the fleet); last render **2026-06-23** (42+ days decayed by 2026-08-04). Since 2026-08-02: expected zero — **not independently re-verified this session** (§7). |
| **Disposition** | **Contain (done, but structurally fragile) → convert to an explicit disable + formalise as retired.** The current containment is an accidental side effect of an unrelated 2-row addition; **deleting** either row (not disabling it — a plausible future edit by someone unaware of this dependency) silently reopens the full palette, including carousel. Recommend an explicit `carousel` row (`is_enabled=false`) added to `c.client_format_config` for CFW, plus a `c.client_creative_governance` row recording the retirement (CFW *did* deliver real carousel posts historically — 171 succeeded renders is real production, so this is a genuine retirement of a once-live route, not a "never happened" case like Invegent below). |

### 2.4 Invegent — **HISTORICALLY CONTAINED (config layer, since 2026-08-02) + UNUSED (real-world outcome)**

| Field | Value |
|---|---|
| **Draft/render/publish route** | Identical shared fleet route (§1), plus one additional structural fact: LinkedIn carousel publishing is hard-BLOCKed at v0 for every client (§1), so even a generated Invegent LI carousel could never have posted. |
| **Real production control** | Same row-presence mechanism as CFW (`client_id 93494a09-cc89-41d1-b364-cb63983063a6`), 0→2 rows (`image_quote`+`text`), 2026-08-02, same fragility. |
| **Governance-row state** | **None.** |
| **Schedule/config interaction** | Zero `format_override='carousel'` rows ever existed (same as CFW). |
| **Current volume — corrected** | M11a's own §6 table cites "5 succeeded" carousel renders for Invegent — the addendum's own follow-up investigation corrects this: those 5 are successful **slide-image renders**, not delivered carousel **posts**. Of the underlying drafts, 2 were voided pre-publish and 3 were silently downgraded to plain text by a since-fixed (v1.3.0, 2026-07-06) Zapier bridge bug. **Zero real carousel posts were ever delivered for Invegent** — the cleanest "never actually used" case in the fleet, distinct from CFW's genuine historical volume. |
| **Disposition** | **Explicit retire, highest-confidence case in the fleet.** Recommend the same config-hardening as CFW (explicit `is_enabled=false` carousel row, closing the same row-deletion fragility) **plus** a `c.client_creative_governance` row with a `contract_ref` naming this a retirement of a route that never produced a real delivered post — e.g. `invegent.carousel.retired_never_live`. This is the one client where "retire" needs no migrate-vs-retire judgment call at all: there is no live behaviour to preserve. |

---

## 3. Recommended migration sequence

Ordered by ascending complexity/risk and by how much of each lane's decision is already made vs.
still open — not by client alphabetically:

1. **Seed Packet A — NDIS formal closure record** (§4.1). Config-layer closure already applied and
   independently verified 2026-08-04; this lane only adds the missing governance-layer declaration
   (or gets an explicit PK ruling that none is needed). Lowest risk, smallest surface, fastest to
   land.
2. **Seed Packet B — CFW + Invegent fence-hardening + retirement records** (§4.2). Same mechanism,
   same 2026-08-02 origin date, bundleable as one lane; converts two fragile, accidental
   containments into deliberate, self-documenting ones. Can run in parallel with Seed Packet A (no
   shared rows).
3. **Seed Packet C — PP migrate-vs-retire feasibility** (§4.3). Read-only design/scoping only — no
   apply. This is the one genuinely open, hard question in the fleet and the only lane whose output
   is a decision, not a closure. Deliberately sequenced last: it depends on nothing above, but its
   answer (a Creative Library v2 schema extension, or an explicit PK retirement ruling) is real new
   design work that should not block the two already-largely-decided closures above it.
4. **(Future, not seeded here)** — whichever build lane Seed Packet C's output recommends (a TMR
   template-family migration build, or a PP retirement-and-sunset apply) — its own fresh Gate-1
   brief, scoped only once C's feasibility read lands.

**Standing rule across the whole sequence (per the task's own instruction):** no client's carousel
draft/render/publish **volume** may increase between now and each lane's own closure — every seed
packet below carries its own CAS assertion of this, reusing the v11 packet's own proven pattern
(pre/post row-count and enabled-state snapshots, hard `RAISE EXCEPTION` on any unexpected change).

---

## 4. Closure-lane seed packets

Each seed packet below is a **scope description for a future Gate-1 brief**, not itself an apply
packet — no SQL is frozen here. Per this lane's own Forbidden-actions instruction, none of these may
be executed without a fresh, separate PK gate.

### 4.1 Seed Packet A — NDIS carousel formal closure record

- **Affected surfaces:** `c.client_creative_governance` (one new row, additive INSERT only) — or,
  if PK rules a governance row unnecessary, no DB surface at all (a documentation-only closure).
  No code change. No worker touch.
- **Sequencing:** independent of B and C; can start as soon as PK approves its Gate-1 brief.
- **Proof requirements:**
  - A **fresh** `db-rls-auditor` read (this session could not obtain one, §7) confirming: NDIS's
    carousel `client_format_config` row is still `is_enabled=false`; zero carousel drafts/renders
    for NDIS since 2026-08-04T10:20 UTC.
  - `branch-warden` safe pre-commit.
  - `apply-harness-auditor` shadow-mode pass on the frozen packet (the "no re-open" assertion is
    exactly the kind of declared-vs-enforced check it exists to catch).
  - Post-apply independent re-verification: the new row exists, `enabled=false`, correct
    `contract_ref`.
- **Rollback:** `DELETE` the inserted row (restores the true pre-state of "no row" — matches
  apply/rollback identity; setting `enabled=true` would be wrong, since no row existed before).
- **PK gates:** Gate 1 (brief approval) → T2 chain (`db-rls-auditor` + `branch-warden` +
  `apply-harness-auditor` shadow) → PK apply gate (hard stop, this is a DML write) → result doc.
- **No-volume-increase guard:** CAS-asserted pre/post — carousel occurrence count for NDIS must be
  identical (expected: 0) immediately before and after this apply; any nonzero delta is an automatic
  abort, not a judgment call.

### 4.2 Seed Packet B — CFW + Invegent fence-hardening and retirement records

- **Affected surfaces:** `c.client_format_config` — 2 new rows (CFW carousel `is_enabled=false`,
  Invegent carousel `is_enabled=false`). `c.client_creative_governance` — 2 new rows (CFW
  `contract_ref='care_for_welfare.carousel.legacy_pipeline_retired'`, Invegent
  `contract_ref='invegent.carousel.retired_never_live'`). No code change.
- **Sequencing:** independent of A; can run concurrently.
- **Proof requirements:**
  - Fresh `db-rls-auditor` read confirming both clients' current 2-row containment (`image_quote`,
    `text`, both `is_enabled=true`) is unchanged, and zero carousel activity for both since
    2026-08-02.
  - Existence-check before insert (idempotency guard — must not collide with a row that doesn't
    exist yet per the addendum, but must fail loud rather than silently upsert if one somehow does).
  - `apply-harness-auditor` shadow pass, `branch-warden` safe.
  - Post-apply: re-derive the CFW/Invegent config row count (now 3 each: `image_quote`, `text`,
    `carousel`) and confirm the pre-existing 2 rows are byte-identical to their pre-image (this
    reuses v11's own Protection-2 pattern directly).
- **Rollback:** `DELETE` all 4 new rows (2 config + 2 governance) — restores exact pre-state.
- **PK gates:** Gate 1 → T2 chain → PK apply gate (DML) → result doc.
- **No-volume-increase guard:** identical CAS pattern to A, run independently for each client;
  additionally assert the pre-existing `image_quote`/`text` rows' `is_enabled` values are unchanged
  (this lane must not touch the containment fence's original two rows at all, only add a third).

### 4.3 Seed Packet C — PP carousel migrate-vs-retire feasibility (read-only)

- **Affected surfaces:** none mutated. Reads only: `docs/creative-library/property-pulse.json` +
  `registry-schema-v2.md` (confirm still no carousel template-family entry), `c.creative_provider_
  template` / `c.creative_template_client_assignment` (confirm no PP carousel-family rows exist
  there either, via `db-rls-auditor`), `image-worker/index.ts`'s carousel block (confirm the bespoke
  pipeline is unchanged since D2).
- **Sequencing:** independent of A/B; can start immediately, but its findings are the actual input
  to the one open PK decision in this fleet.
- **Proof requirements:** a named, cited feasibility estimate covering at minimum: (a) Option
  MIGRATE — what a Creative Library v2 multi-slide/carousel template-family extension would need
  (schema shape, `creative-graph-auditor` static-audit readiness), scoped as its own future
  design-gate lane, not built here; (b) Option RETIRE — an explicit sunset plan for PP's real,
  ongoing ~100/90d volume (operational-impact sign-off, not silent); (c) naming that Option
  "leave declared-legacy indefinitely" is **not** a valid default per the CGU Final ratified rule
  (§0 item 5) without an explicit PK exception recorded — inertia is not itself a disposition.
- **Rollback:** N/A — no mutation performed by this lane.
- **PK gates:** Gate 1 (brief approval) only. No apply gate — this lane produces a decision input,
  not a change. Whichever option PK selects becomes its own future Gate-1 brief with its own T2/T3
  chain.
- **No-volume-increase guard:** trivially satisfied (no mutation); the seed packet should re-assert
  v11's own Protection-1 constraint (PP's carousel config lever stays `is_enabled=true`, untouched)
  for the duration of this design lane, since a future, unrelated schedule/config edit could
  otherwise drift it without anyone here re-checking.

---

## 5. Version-less register payload

*(For `docs/00_action_list.md` / `docs/00_sync_state.md` pointer entries — no version number
assigned here per CCF-02's parallel-session claim discipline; the claiming session numbers this at
commit time.)*

> **M11b fleet-carousel closure — SCOPING COMPLETE (T1, docs-only; zero code/DB/deploy/merge
> change).** Produces the authoritative closure plan for fleet carousel legacy routing across all 4
> clients, incorporating M11a's result + carousel-provenance addendum + the now-applied
> post-cgu-v1-optimum-schedule-expansion v11 apply (NDIS carousel `client_format_config` closed
> 2026-08-04T10:20 UTC, CFW/Invegent containment reconfirmed, PP declared-legacy lever untouched).
> Per-client disposition: PP declared-legacy/live (migrate-vs-retire still open); NDIS historically
> contained (config-layer only, governance-layer record still open); CFW historically contained
> (fragile row-presence fence, retirement record still open — 171 real historical posts); Invegent
> historically contained + unused (zero real carousel posts ever delivered, cleanest retire case).
> Seeds 3 bounded closure lanes (A: NDIS governance record: B: CFW+Invegent fence-hardening +
> retirement records; C: PP migrate-vs-retire feasibility, read-only) — none authorised to start by
> this scoping lane itself, each needs its own fresh Gate-1 brief. **DB access was unavailable this
> session (§7) — no client's current live carousel state was independently re-verified today; every
> seed packet's own proof requirements name a fresh `db-rls-auditor` read as a precondition, not an
> assumption.** Standing constraint for the whole M11b programme: no carousel draft/render/publish
> volume increase for any client until its own closure lane lands, CAS-asserted per lane. Record:
> `docs/briefs/m11b-fleet-carousel-closure-scoping-packet-v1.md`.

---

## 6. Fleet-wide summary table

| Client | Disposition | Governance row? | Config-layer state (last verified 2026-08-04) | 90d volume (pre-closure where applicable) | Closure lane |
|---|---|---|---|---|---|
| Property Pulse | Declared legacy, live | Yes (D2, `enabled=true`) | Untouched, `is_enabled=true` | FB 129/38, IG 127/11 (37 real posts of 104 drafts) | C (feasibility only) |
| NDIS Yarns | Historically contained (2026-08-04) | None | Closed, `is_enabled=false` | FB 57/4, IG 32/1 (89 succeeded, decaying since 07-20) | A |
| Care For Welfare | Historically contained (2026-08-02) | None | Contained via row-presence (fragile) | FB 11, IG 60/4, LI 100/4 (171 succeeded, decaying since 06-23) | B |
| Invegent | Historically contained (2026-08-02) + unused | None | Contained via row-presence (fragile) | 5 slide-renders, **0 real posts ever delivered** | B |

---

## 7. Open issues / evidence caveats

- **DB access was unavailable to this session** — no `mcp__supabase__*` tool was bound and
  `scripts/db-read.py` fails closed (no `ICE_READONLY_DSN`/`ICE_READONLY_DSN_FILE` credential
  present). None of the five live-state checks planned for this packet (current
  `client_format_config`/`client_creative_governance` carousel rows per client, 24-48h occurrence
  counts, `tmr-drift-probe` cron health, rollback-table presence) were independently re-verified
  today. This packet relies on the **last independently verified state**: the 2026-08-04 v11 apply
  result doc's own post-apply DB read + live dashboard check. Every closure-lane seed packet above
  names a fresh live re-verification as its own precondition — this scoping packet does not carry
  that gap forward as settled fact.
- **Dashboard-repo carousel touchpoints were checked this session** (§1.1) — no client-specific
  branching in production code, no table query filters on carousel specifically, and no existing IA
  doc defines a legacy/governed/disabled disposition model for any format. This is settled evidence,
  not a gap.
- **NDIS/CFW governance-layer closure is a genuine open policy question**, not a defect — config-
  layer closure is real and independently verified, but whether it needs a matching
  `client_creative_governance` record (for parity with PP, and for `tmr-drift-probe`'s
  no-format-filter sweep to have something to find) is a PK call, named explicitly in Seed Packets A
  and B rather than assumed either way.
- **Any new `client_creative_governance` row for carousel will trip `tmr-drift-probe`'s known
  `declarative_registry_ref_missing` failure mode** (same mechanism as PP's D2 side effect) unless
  the still-open Option-B patch (`tmr-drift-probe` skip-if-unresolvable-registry-ref) lands first.
  Seed Packets A and B should either accept this as a disclosed, known side effect (matching PK's
  prior Option-C ruling for D2) or be sequenced after the Option-B patch — a decision for whoever
  authors those lanes' actual Gate-1 briefs, named here so it isn't rediscovered from scratch.

## 8. Stop condition

This scoping packet is complete. Per the lane's own instruction, **no schedule, governance row,
worker, or production carousel route was mutated in producing it.** Report to PK for review; do not
begin Seed Packet A, B, or C without its own separate Gate-1 brief and PK approval.
