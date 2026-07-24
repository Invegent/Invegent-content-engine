# Brief cc-0073 — Backgrounds-only static-image asset-gap drain

**Created:** 2026-07-24 Sydney
**Author:** chat (S5 — Asset-Gap Drain)
**Executor:** Claude Code (orchestrated) — PK at every gate
**Status:** draft (awaiting Gate 1)
**Result file:** `docs/briefs/results/cc-0073-backgrounds-only-asset-gap-drain.md` (created on completion)

**Lane classification (CCF-02):** PRODUCT_PROOF · **Tier T3** (production rotation-pool change + governed INSERT/UPDATE on live selection state; Image Workflow §2 non-negotiable "full T3 chain + live proof + rollback-proven on EVERY production rotation change").
**Canonical ID:** cc-0073, allocated centrally 2026-07-24. Register block v6.60–v6.69.

---

## Task

Drain the **static-image background** asset gap for the four live clients, and only that. The
asset-gap substrate (cc-0041 schema · cc-0042 read path · cc-0043 writer · cc-0044/45 auto-close ·
cc-0046 orthogonal classification) is live; the *work* of actually filling under-supplied governed
background pools has never been done. Live probing (below) shows the real gap is **much narrower
than the ledger implies**: exactly **two** clients have a governed rotation pool of size **1**, and
the largest visible failure (YouTube) is **not an asset problem at all**.

This lane sizes the true supply gap, fixes the one governance blocker that makes the cheap remedy
possible, sources only what is genuinely missing, and proves rotation live. It does not touch the
classifier, the writer, the resolver, carousel, or video.

---

## Source context — ground truth re-derived live 2026-07-24

All figures below were recomputed against project `mbkmaxqhsohbtwsqolns` on 2026-07-24; none is
taken from register prose or from the seed.

### A. The selection spine (what actually gates a background)

- `public.select_template(slug, platform, format, intent, seed)` — `STABLE SECURITY DEFINER`,
  read live via `pg_get_functiondef`. Gate chain per candidate: **format_key match**
  (`c.creative_template_variant_candidate`) → scope → template status → **platform suitability row**
  (`c.creative_template_platform_suitability`) → **client assignment** (`c.creative_template_client_assignment`,
  status must be `visually_approved`/`client_enabled`/`production_proven`) → **passed `visual_approval`
  proof event** → **`public.resolve_slot_assets(...)` must return `status='ok'`**.
- `public.resolve_slot_assets` (v1.2, read live) models exactly two slots — `Background` and `Logo`.
  Background eligibility predicate, in order: `is_active IS TRUE` · `asset_meta->>'approved'` is
  true · a licence field present · licence not expired · `asset_meta->>'bucket' = 'brand-assets'` ·
  `platform_scope` (a **column**, not an `asset_meta` key) contains the platform when non-NULL ·
  `safe_for_text_overlay IN ('true','needs_scrim')`.
  **The resolver applies NO aspect-ratio, format, or template-fit filter.** Aspect ratio is a
  crop-quality concern, never a selection gate.
- Shared pool (`c.shared_creative_asset`) is consulted **only** when the client has a
  `c.client_asset_pool_policy` row whose `pool_policy <> 'client_only'` **and** a permitted scope.
  Absent row ⇒ `client_only` ⇒ the shared pool is structurally unreachable.
- Rotation is a seed-hash index over the eligible list, so **eligible count == rotation pool size**.

### B. Live selector probe — `select_template(client, platform, 'image_quote', NULL, 'cc0073-probe')`

| Client | facebook | instagram | linkedin | youtube |
|---|---|---|---|---|
| property-pulse | ok · `bg_perth_cbd` · 11 alts | ok · `bg_pp_city_skyline_vantage` · 10 alts | ok · same · 10 alts | **fail_closed `no_selectable_template`** |
| ndis-yarns | ok · `bg_ny_community_garden` · 0 alts | ok · same · 0 alts | ok · same · 0 alts | **fail_closed** |
| care-for-welfare-pty-ltd | ok · `bg_cfw_brand_texture_navy_waves` · 0 alts | ok · same · 0 alts | ok · same · 0 alts | **fail_closed** |
| invegent | ok · `Shared/Backgrounds/bg_shared_datacentre_server.jpg` · 0 alts | ok · same · 0 alts | ok · same · 0 alts | **fail_closed** |

### C. Eligible background pool size (resolver predicate, recomputed per platform)

| Client | fb | ig | li | yt | rows total | notes |
|---|---|---|---|---|---|---|
| property-pulse | **22** | **18** | **18** | **0** | 24 | every row carries a `platform_scope`; **none includes `youtube`** |
| ndis-yarns | **21** | 21 | 21 | 21 | 32 | `platform_scope` NULL on all rows (⇒ `platform_scope_unbacked` warning) |
| care-for-welfare-pty-ltd | **1** | 1 | 1 | 1 | 1 | single navy-waves texture |
| invegent | **0 client** | 0 | 0 | 0 | 0 | falls through to shared pool |

- `c.shared_creative_asset`: **8 rows**, all `asset_kind='static_background'`, all
  `governance_scope='global_generic'`, all declaring `aspect_ratio ['1:1']`, all
  `safe_for_text_overlay=true`, all Pexels-licensed with `sha256` provenance and
  `crop_proof=pass_1x1_scrim62`. **Exactly one is live** — `0ba46053-b22b-40c7-b5c5-5bfc8b52d0a1`
  (`bg_shared_datacentre_server`, `is_active=true`, `production_use_allowed=true`,
  `approval_status='governed'`) — and it is **allowlisted exclusively to Invegent**
  (`allowed_clients=[93494a09-…]`). The other **7 are `intake_candidate` / `is_active=false`**.
- `c.client_asset_pool_policy`: **exactly one row** — Invegent, `client_preferred`,
  `allow_global_shared=true`, `allow_vertical_shared=false`, `policy_version='cc-0044-invegent-v1'`.
  PP, NDIS and CFW have **no row** ⇒ all three are `client_only` ⇒ the shared pool cannot reach them.

### D. Template appetite from DYNAMIC SLOTS (the cc-0042 lesson applied)

`c.creative_provider_template_field` totals: `background` 18 rows / **14 dynamic**; `logo` 18/18;
`image` 1/1. For `output_type='static_image'`:

- **Dynamic image `Background` (required_for_render=true)** — announcement · auction_snapshot ·
  carousel_cover · linkedin_landscape (1.91:1) · listicle · market_insight · news_summary ·
  portrait_feed (4:5) · quote_card · story_static (9:16) · testimonial · youtube_thumbnail (16:9) ·
  `news_static_centered_scrim_1x1_v1` (PP client-scoped, `production_proven`).
- **`BackgroundSolid` (element_type `shape`, `dynamic=false`)** — before_after · carousel_body ·
  carousel_closing · stat_hero. These templates need **no governed background at all**.
- The TMR-4 appetite columns (`image_slot_min/max`, `needs_governed_background`,
  `text_overlay_safe_required`) are **NULL on every live static-image template** — confirming they
  must not be used as the appetite source.

### E. Why YouTube fails — and it is NOT supply

`select_template('care-for-welfare-pty-ltd','youtube','image_quote',…)->'rejected'` returns
**`platform_unsuitable / no_suitability_row_for_platform` for all 11 generic candidates**, plus
`wrong_scope/client_scoped_other_client` for the PP-owned template. Across the whole registry the
**only** template with a `youtube` suitability row is `generic_youtube_thumbnail_16x9_v1`, whose
`format_key` is `youtube_thumbnail` — never `image_quote`. So YouTube image_quote is unreachable for
**every** client on template configuration alone. CFW/NDIS/Invegent each have ≥1 eligible background
on youtube; PP has 0 only because its `platform_scope` allowlists omit youtube. **No amount of
sourcing changes this outcome.**

### F. Ledger state (`m.asset_gap_suggestion`) — 8 rows, 4 resolved / 4 open

| id (short) | client | platform | format | subject/failure | primary_route | status |
|---|---|---|---|---|---|---|
| `3b7b0d36` | CFW | linkedin | carousel | assignment / unassigned | governance_gap | open |
| `273626e5` | invegent | linkedin | carousel | assignment / unassigned | governance_gap | open |
| `0532d311` | CFW | facebook | carousel | assignment / unassigned | governance_gap | open |
| `22d3df93` | property-pulse | youtube | **video_short_stat** | platform_config / misconfigured | template_gap | open |
| `73fdc325` | CFW | facebook | image_quote | — | governance_gap | resolved |
| `2a5a11c8` / `24c673a0` / `cf02a8e4` | invegent | ig / li / fb | image_quote | — | governance_gap | resolved (→ shared `0ba46053`) |

**Zero rows route to `governed_sourcing`** — confirmed live, and this brief does not change that.

### G. Repo / render evidence

- `supabase/functions/image-worker/index.ts:952` and `:833` are the **only** production
  `select_template` call sites in image-worker, and both pass `p_format: 'image_quote'`.
  `video-worker/index.ts:994,1177` pass `video_short_stat`. **No call site anywhere passes
  `carousel`.** Carousel renders through `buildCarouselSlideScript` in the legacy branch
  (`image-worker/index.ts:1054–1101`), which never touches `select_template` or
  `resolve_slot_assets`. The seed's standing evidence is confirmed, not contradicted.
- `m.post_render_log`, last 30 days: image_quote `succeeded` — PP 54 (last 2026-07-23 02:15Z) ·
  invegent 40 (last 2026-07-23 06:30Z) · CFW 36 (last 2026-07-23 15:30Z) · NDIS 34 (last
  2026-07-23 15:30Z). **The `brand_payload_contract_unresolved` outage recorded in memory is no
  longer reproducing** — invegent's last failure was 2026-07-23 03:30Z followed by a success at
  06:30Z; CFW's last failure was 2026-07-22 06:30Z followed by a success 2026-07-23 15:30Z. Live
  render capacity for the proof matrix exists.

### Documents

- `CLAUDE.md` — binding. Image Workflow Acceleration P1–P6; NDIS staged real-imagery lane; R0 read path.
- `docs/briefs/seeds/orchestrator-control-packet-v1.md` — session control.
- `docs/briefs/results/cc-0046-orthogonal-gap-classification.md` — classification vocabulary.
- `docs/briefs/results/cc-0042-appetite-inventory-read-path.md` — appetite-from-dynamic-slots lesson.
- `docs/briefs/ndis-sensitive-real-imagery-intake-policy-v1.md` — Phase 2 CLOSED, Phase 3 HELD.

---

## The five-way finding split

### 1. Genuine `governed_sourcing` — **1 confirmed, 1 PK-elective**

- **F1 · care-for-welfare-pty-ltd: rotation pool = 1 (CONFIRMED).** One eligible background
  (`bg_cfw_brand_texture_navy_waves`) serves all three live platforms; 36 successful renders in 30
  days all carry the identical background. Seed-hash rotation over a 1-element list is a constant.
  This is a true asset-supply gap: nothing in template, assignment, suitability or governance is
  wrong — there is simply not enough governed material. **Drainable by sourcing.**
  *Caveat:* the cheapest remedy is not sourcing at all — see F5. Sourcing is required only for the
  portion PK wants CFW-branded rather than generic.
- **F2 · invegent: rotation pool = 1, but sourcing is OPTIONAL (PK-elective).** Invegent has zero
  client backgrounds and reaches exactly one shared asset. **Seven already-harvested,
  already-reviewed shared candidates sit fenced** (`intake_candidate`, `is_active=false`) with full
  provenance and passing crop proofs. Promoting a subset is a governance act, not a sourcing act,
  and would take Invegent from 1 → up to 8 with **zero new harvesting**. New Invegent-specific
  sourcing is warranted only if PK wants brand-distinct imagery beyond the generic pool.

**Not sourcing gaps:** property-pulse (22/18/18 — healthy) and ndis-yarns (21 on every platform —
healthy). Neither is below rotation safety on any live platform.

### 2. Assignment / configuration repair — **no reclassification proposed**

- **F3 · PP `platform_scope` omits youtube on all 24 background rows.** This is why PP alone shows
  0 eligible on youtube. It is a configurable fence on existing, already-approved assets — a
  config decision, not a supply gap. **Held, not actioned here**, because it would be pointless
  while F4 stands.
- The three carousel ledger rows **remain `(assignment, unassigned)`** and the PP YouTube row
  **remains `(platform_config, misconfigured)`**. This brief proposes no reclassification of any
  ledger row and performs no assignment. Per §G, assigning a carousel template would auto-close
  those tickets while gaining **zero** capability, because no production call site passes
  `carousel` to the spine.

### 3. Template gap — **the dominant finding, and it is out of this lane's hands**

- **F4 · YouTube image_quote is unreachable for all four clients** — `no_suitability_row_for_platform`
  on every candidate (§E). The only youtube-suitable template sits under a different `format_key`.
  This is a template/registry configuration gap. It is **larger in blast radius than the entire
  backgrounds gap** and is not fixable by sourcing. **Finding for PK; no ledger row currently
  represents it** (the one youtube ledger row is `video_short_stat`, a different lane).
- **F6 · latent aspect-ratio exposure.** `generic_portrait_feed_card_4x5_v1` (4:5) and
  `generic_linkedin_landscape_card_1200x628_v1` (1.91:1) are selectable `image_quote` candidates
  for PP today (they appear among its 10–11 alternatives) and rank only by registry order. Since
  the resolver applies no aspect filter, any change to ranking order would render those templates
  with backgrounds cropped from unrelated ratios. Note only — no action proposed.

### 4. Governance gap — **the cheapest real unlock**

- **F5 · the shared pool is structurally unreachable for PP, NDIS and CFW.** No
  `c.client_asset_pool_policy` row exists for them ⇒ `client_only`. Promoting shared backgrounds
  therefore does **nothing** for CFW until a pool-policy row exists. This single row is the
  precondition for the low-cost CFW remedy.
- **F7 · the only live shared asset is exclusively allowlisted to Invegent**
  (`0ba46053.allowed_clients=[invegent]`), so the "shared" pool currently shares with nobody.
  Widening it is a per-asset PK gate.
- **F8 · seven fenced shared candidates are drain-ready without any harvesting** — reviewed,
  hashed, crop-proofed. Promotion is a per-asset PK visual gate (Image Workflow §2), never automatic.

### 5. No action required

- property-pulse and ndis-yarns background supply on facebook / instagram / linkedin.
- All `BackgroundSolid` templates (before_after · carousel_body · carousel_closing · stat_hero) —
  they declare no dynamic background and have no appetite.
- The four `resolved` ledger rows.
- NDIS Phase 2 / Phase 3 imagery — CLOSED / HELD; no sourcing is planned or permitted here.

---

## Scope

**In scope**

1. Stand up a `c.client_asset_pool_policy` row for **care-for-welfare-pty-ltd** (and, if PK elects,
   for property-pulse / ndis-yarns) so the shared pool becomes reachable — F5.
2. Per-asset PK-gated promotion of a PK-chosen subset of the **7 fenced shared backgrounds**, with
   allowlists widened to the clients PK names — F7/F8.
3. Governed sourcing of **CFW-scoped person-free static backgrounds** to lift CFW's rotation pool
   to the PK-set floor, only for the portion not satisfied by (2) — F1.
4. Optional, only on explicit PK election: Invegent-specific background sourcing — F2.
5. Live rotation proof: distinct backgrounds across seeds, per client, per platform.

**Out of scope**

- Video (all formats, incl. the PP `video_short_stat` youtube ledger row), carousel remediation,
  execution-spine implementation.
- Any change to `analyze_asset_gap`, `run_asset_gap_analysis`, the cc-0046 classifier,
  `resolve_slot_assets`, or `select_template` — **cc-0051 handoff**.
- Any ledger reclassification, assignment creation, or ticket closure.
- Any template registry / suitability-row change — F4 is reported, not fixed.
- Logo, avatar, music, and every non-background asset class.
- NDIS Phase 2 (CLOSED) and Phase 3 (HELD) imagery of any kind.
- PP `platform_scope` youtube widening (F3) — held behind F4.

---

## Allowed actions

- Read-only DB via `python scripts/db-read.py` (R0 views) and SELECT-only `execute_sql`.
- `image-harvester` → `image-reviewer` (in that order, always coupled) for CFW sourcing only, under
  a PK-approved mini-manifest, batch-first (P1), person-free subjects only.
- Author the intake INSERT + the pool-policy INSERT + per-asset promotion UPDATEs, each presented
  for a PK gate, each with a written and validated rollback.
- Run the full T3 chain: `db-rls-auditor` → `security-auditor` if grants are implicated →
  `ask_chatgpt_review` pinned to the artifact hash → `branch-warden` → PK gate.
- Post-apply live proof via `select_template` / `resolve_slot_assets` probes and real renders.

## Forbidden actions

- **No unilateral apply, deploy, promote, publish, push, or ledger write.** Every irreversible step
  is a PK gate (CLAUDE.md hard stop).
- No reclassification of any `m.asset_gap_suggestion` row; no `status` change; no ticket closure.
- No template assignment, no `creative_template_platform_suitability` row, no template status change.
- No edit to the classifier, the writer, or the resolver (cc-0051 boundary).
- No sourcing of identifiable people, minors, participant stories, clinical/personal-care, or
  First-Nations-specific imagery. NDIS Phase 2 is CLOSED and Phase 3 HELD; an unfilled specialist
  role is never permission to proceed.
- No CC BY / CC BY-SA / AI-generated / paid-stock material without a per-asset PK exception.
- No promotion of any asset that has not passed a PK **visual** verdict — the only deciding act.
- No `git add -A`, no `git commit -a`, no push. Three commits await a PK push gate
  (`f1312a3`, `e2343a8`, `495abe3`) — do not amend, revert, reorder or push them.
- Pool-neutrality machine-assertion and byte-verify + public-URL sha256 are **never** waived on any
  intake, regardless of shape (Image Workflow §2).

---

## Drain order

Strictly sequential; each step is its own PK gate. A tripped stop condition voids the remainder.

- **D0 — Gate 1.** PK rules on this brief, on the five-way split, and sets: the **rotation floor**
  (recommended: **≥4 eligible backgrounds per client per live platform**; 1 is the current CFW and
  Invegent state), which of F2/F3 to elect, and which clients get a pool-policy row.
- **D1 — Governance unlock (F5).** Insert the CFW `c.client_asset_pool_policy` row
  (`client_preferred`, `allow_global_shared=true`, `allow_vertical_shared=false`). Cheapest,
  highest-leverage, fully reversible (DELETE the row). T3 chain + PK gate.
  *Pre-check:* CFW currently resolves to its own asset; `client_preferred` consults shared **only
  when the client list is empty**, so with 1 client asset present this row alone changes **nothing**
  — which is exactly why D1 is safe to land first and why D2 must follow.
- **D2 — Shared promotion (F7/F8).** PK picks from the 7 fenced candidates; widen
  `allowed_clients` (or clear it) per asset; set `is_active`/`production_use_allowed`/
  `approval_status` per asset. Per-asset PK visual gate. Rollback = restore prior fence values.
  *Note:* under `client_preferred` this raises CFW's pool only if CFW's own list is emptied, which
  we will **not** do. Therefore D2's benefit to CFW requires PK to elect `best_fit` at D1 instead of
  `client_preferred`. **This is a genuine policy fork and is D0's decision, not the executor's.**
- **D3 — CFW sourcing (F1).** Only for the shortfall D1+D2 cannot close. Batch-first manifest →
  `image-harvester` → `image-reviewer` → crop proof → PK visual gate → fenced intake → per-asset
  promotion. Person-free, licence-safe, text-free crop area.
- **D4 — Invegent (F2), only if elected at D0.** Same shape as D3.
- **D5 — Live proof.** Run the proof matrix below, then write the result doc.

---

## Success criteria

1. **Rotation floor met.** For every client PK names, and for each of facebook / instagram /
   linkedin, the recomputed eligible-background count is **≥ the D0 floor**, evidenced by the same
   predicate used in §C.
2. **Rotation is observably real.** For each such client×platform, `select_template(…, seed=S)` over
   **≥5 distinct seeds** returns **≥3 distinct `asset_key` values**. Today CFW and Invegent return
   1 distinct value across all seeds — that is the measured baseline to beat.
3. **Pool neutrality preserved.** After every intake and every promotion, the eligible pool for
   every client **not** named in that step is byte-identical to its pre-apply snapshot. Asserted
   in-transaction, fail-closed.
4. **No classification drift.** `m.asset_gap_suggestion` is unchanged in `subject_kind`,
   `failure_state`, `primary_route` and `status` for all 8 rows, verified by pre/post diff. The
   three carousel rows and the PP YouTube row are provably untouched.
5. **Live render proof.** ≥1 real production render per changed client×platform, `succeeded` in
   `m.post_render_log`, with a **PK visual PASS** on the rendered card (geometry, no cross-client
   leak, background contrast, scrim behaviour).
6. **Provenance complete.** Every new asset row carries `sha256` of the actual bytes, source URL,
   licence + licence URL, `crop_proof`, and reviewer verdict; the public-URL hash matches the
   recorded hash.
7. **Rollback proven before apply**, for each of D1–D4, and re-verified as still valid at the gate.
8. **Findings F3, F4, F6 recorded and handed off**, not silently actioned.

## Proof matrix

| # | Check | Method | Gate |
|---|---|---|---|
| P1 | Eligible count ≥ floor | §C predicate, per client×platform, pre/post | D5 |
| P2 | ≥3 distinct backgrounds over 5 seeds | `select_template` seed sweep | D5 |
| P3 | Pool neutrality for untouched clients | in-txn fail-closed assertion + pre/post snapshot diff | every apply |
| P4 | Ledger unchanged (8 rows, 4 open) | pre/post diff on the six classification columns | every apply |
| P5 | Byte + public-URL sha256 match | recompute from downloaded bytes and from the public URL | every intake |
| P6 | Live render succeeded | `m.post_render_log` row, status `succeeded` | D5 |
| P7 | PK visual PASS | PK inspects the rendered card | D5 |
| P8 | Rollback validated | dry-run the reverse statement, confirm it restores the snapshot | before every apply |
| P9 | No spine mutation | `pg_get_functiondef` of `select_template` + `resolve_slot_assets` byte-identical pre/post | D5 |

## Stop conditions

Any one of these halts the lane and surfaces to PK; the remainder of the sequence is void and
resumption requires a fresh gate.

- The artifact hash under review changes (external review goes stale — CLAUDE.md rule 4).
- Any non-clean subagent verdict or non-clean external review.
- Pool-neutrality assertion fails, or an untouched client's eligible set changes.
- Any `m.asset_gap_suggestion` classification column changes.
- A `select_template`/`resolve_slot_assets` definition differs pre/post.
- Byte hash ≠ public-URL hash, or any licence field missing/ambiguous.
- A harvest candidate shows readable third-party signage/branding in the crop area, or any person
  becomes identifiable — REJECT at discovery (P5 of the image workflow), never "fix in crop".
- Evidence contradicts §E or §G (e.g. a production call site is found that passes `carousel`, or a
  youtube suitability row appears) — report as a finding; do **not** act on it.
- Rollback path invalidated at the gate.
- Unexpected origin movement, or files outside the approved change set.

## Stop condition (lane)

Report per `docs/briefs/_template_result.md`, then stop. Do not open cc-0051, do not touch video or
carousel, do not queue follow-on work without a fresh PK gate.

---

## Open questions for PK (Gate 1)

1. **Rotation floor?** Recommend **≥4** eligible backgrounds per client per live platform.
2. **D2 policy fork.** Under `client_preferred`, CFW's single client asset suppresses the shared
   pool entirely, so promotion buys CFW nothing. Options: (a) `best_fit` for CFW so client and
   shared assets rank together — cheapest path to a real pool; (b) stay `client_preferred` and
   source CFW-branded backgrounds (D3) instead; (c) both. **This is the lane's central decision.**
3. **Does Invegent get brand-specific sourcing (F2/D4), or is promoting shared candidates enough?**
4. **F4 — YouTube image_quote is dead for all four clients on template configuration.** Is that a
   new lane, a cc-0051 handoff, or an accepted limitation? No ledger row currently represents it.
5. **F3 — PP `platform_scope` youtube omission**: leave held behind F4, or open separately?
6. Confirm the NDIS pool (21) and PP pool (22/18/18) need **no** work — this brief asserts they do not.

## Handoffs

- **→ cc-0051 (execution-spine coverage):** F4 (no youtube suitability row for any `image_quote`
  candidate) and F6 (resolver applies no aspect-ratio filter while multi-ratio templates are
  selectable). Also: youtube image_quote demand produces **no** ledger row despite being universally
  unreachable — a classifier-coverage question, recorded here, decided there.
- **→ PK product decision:** whether `carousel` should ever reach the governed spine. Until then the
  three carousel ledger rows stay open and unassigned by design.

## Notes

- Reads were routed through `python scripts/db-read.py` (R0) where a view served them; `m.*` and
  `c.*` reads and the read-only `select_template`/`resolve_slot_assets` probes used SELECT-only
  `execute_sql`, as expected.
- The memory entry recording an ongoing `brand_payload_contract_unresolved` outage for invegent and
  care-for-welfare is **stale** — both clients have succeeded renders after their last failure
  (§G). Worth correcting outside this lane.
- No file in this lane has been committed. Author-only, per session hygiene.
