# Generic Shared Asset Pool — Design of Record (v1)

**Created:** 2026-07-19 Sydney · **Author:** chat (orchestrator, P1 design-ratification lane)
**Status:** **⛔ SUPERSEDED 2026-07-19 — reconciled to cc-0041 (PK ruling).** This `m.shared_asset` design was authored on a v5.72 base, unaware that **cc-0041 (register v5.88) had already APPLIED** the equivalent shared-asset schema — `c.shared_creative_asset` + `c.client_asset_pool_policy` (same `asset_pool_policy` enum, `purpose_bound`, `sensitivity_class`, born-fenced posture) — live-dark on main. **cc-0041 is the design of record.** This document is retained as a historical artifact and a source of *additive* ideas for the cc-0041 evolution backlog: the **scoped-suitability table** (vs cc-0041's flat `governance_scope` enum + allow/exclude arrays — PK kept the applied flat model; scoped rows revisited only if a real multi-scope case demands it), the **1:1 licence table** (vs jsonb), **review_event/usage_event** (audit + rotation), and `cultural_review_required`. The P2 migration (`m.shared_asset` etc., on isolated branch `claude/ice-shared-asset-pool-p2-prepared`) is **RETIRED — never to be applied** (it would duplicate cc-0041's live tables). Reconciliation record: `docs/briefs/results/shared-asset-pool-cc-0041-reconciliation-v1.md`. *(The OQ-2..OQ-7 positions below were PK-ratified as a design; the design is superseded by the applied cc-0041 schema — the thinking is preserved, the tables are not built.)*

> **Original status (historical):** DESIGN-OF-RECORD — RATIFIED 2026-07-19 (PK consolidated gate; OQ-2..OQ-7 accepted as proposed). Superseded the same day on reconciliation with the already-applied cc-0041 schema.
**Lane:** P1 (assessment §5) · SIDE_PROVING · T1 (docs-only). Brief: `docs/briefs/shared-asset-pool-p1-design-ratification-brief-v1.md`.
**Consolidates:** `generic-shared-asset-pool-assessment-v1.md` §3 (proposed model) + §3.6 (convergence review). All live-state figures come from the assessment §1 (live-verified 2026-07-19, project `mbkmaxqhsohbtwsqolns`) — not re-queried here.
**Ratification structure (PK-chosen 2026-07-19):** OQ-2..OQ-7 ratify as **one consolidated gate** (§10). OQ-1 is CLOSED (Rule 3.5, register v5.73) — settled input, not re-opened.

---

## 0. What this document is

The single ratifiable design for the generic shared asset pool. It states one recommended position for each open design question, each cited to its governing precedent, for PK to ratify together. It builds nothing: no DDL, no storage, no resolver, no deploy. Every implementation step (P2 dark DDL → P5 resolver wire → P6 dashboard) remains a separate future gate at its own tier.

**Precedents this design is bound to** (assessment §2, existence-verified at brief time):
- **Music Library v0** — `supabase/migrations/20260708224532_create_music_library_v0.sql` (the shared-pool problem already solved for audio; the decisive spine).
- **TMR-4 "vertical is a tag, not a copy"** — `docs/briefs/tmr4-generic-template-tags-asset-appetite-migration-packet.md`.
- **Creative Library v2** — `docs/creative-library/creative-library-v2-architecture.md` + `registry-schema-v2.md` (sibling governed libraries; declarative registry never read at runtime).
- **NDIS Rule 3.5** — `docs/compliance/ndis_content_rules.md` Rule Group 3 (sensitive-imagery hard exclusion; OQ-1 CLOSED).

---

## 1. Design principle (from the music precedent)

> **A shared asset gets its own home (no `client_id`); client fit and client approval are expressed as SCOPED rows, never as a global flag; a client-specific asset stays exactly where it is. Client-specific always OVERRIDES generic.** (assessment §3 intro.)

The bucket/table an asset lives in never implies eligibility. Eligibility is decided per asset, per scope, fail-closed: absence of an explicit `suitable` row ⇒ not eligible for that scope. This is the same shape PK already ratified for music.

---

## 2. Data model

**Six tables, mirroring the music library** (assessment §3.1, §3.5; music v0 migration). *Revised from four → six at the `db-rls-auditor` design review (2026-07-19): music v0's scoped-approval audit trail and rotation source-of-truth were missing, yet §4 requires a scoped review-event and §6 requires rotation history.*

1. **Shared asset table** (`m.shared_asset`, working name) — the generic asset, **no `client_id`**. Real columns for identity + `asset_meta` jsonb for descriptors (§3). Four fences default-off (`is_active` + `asset_meta.approved`/`production_use_allowed`/`approval_status`). **`UNIQUE(asset_key)`** (mirroring music `track_key UNIQUE`) — the natural dedup / ON-CONFLICT target that the client-scoped composite `(client_id, asset_key)` loses when `client_id` is dropped.
2. **Scoped suitability table** (`m.shared_asset_suitability`) — one row per (`scope_kind ∈ {client, vertical, platform, format}`, `scope_value`, `fit_status ∈ {unknown, candidate, suitable, not_suitable, blocked, needs_review}`). Exclusions are first-class `blocked` rows — the vertical-shared / global-generic distinction expressed as data, not a flat enum (§3.6 override 2). **`UNIQUE(asset_id, scope_kind, scope_value)`** — idempotent scoped rows + an ON-CONFLICT upsert target; prevents a duplicate `suitable` row perturbing the §5 scoped-delta count (improves on music, which lacks this UNIQUE).
3. **1:1 licence table** (`m.shared_asset_license`) — separate rights record, fail-closed booleans (NULL ⇒ not allowed): commercial / social / modification / paid_ads / attribution / content_id (+ expiry). The stricter shared-pool licence bar (§7).
4. **Scoped approval audit trail** (`m.shared_asset_review_event`, music `m.music_review_event` parity) — scoped approval "recorded, never inferred": the table §4's scoped review-events live in. Without it, "approved for scope S" has no audit home.
5. **Usage / rotation source of truth** (`m.shared_asset_usage_event`, music `m.music_usage_event` parity) — rotation-cooldown history; the home for the §6 rotation + the `purpose_bound`-excluded-from-auto-rotation behaviour.
6. **Per-client preference table** (`c.client_asset_profile`, working name — the `c.client_music_profile` precedent) — preferred/banned assets **and the new `asset_pool_policy`** (§6 / OQ-6). The only client-keyed table. **PK = `client_id` REFERENCES `c.client(client_id)`** (music got the client_id-not-a-surrogate lesson right — mirror it), **RLS-ENABLED deny-all** (the music `c.client_music_profile` posture — NOT `c.client_brand_asset`'s RLS-off grant-based shape; the two precedents differ and the stronger music posture is chosen).

**RLS / grant posture (all six — carry to P2 DDL):** RLS-enabled deny-all + `REVOKE ALL FROM PUBLIC, anon, authenticated` (all three named, not PUBLIC alone) + `GRANT` writes to `service_role` only, on the REST-unexposed `m.*`/`c.*` schemas. **Load-bearing caveat** (db-rls-auditor): anon/authenticated already hold schema-`c` USAGE (`20260707010000_grant_service_role_select_client.sql`), so `c.client_asset_profile` must **never** receive a table-level grant to anon/authenticated — the REVOKE discipline is what keeps it unreachable.

**Data home (OQ-2):** new shared tables — **do NOT** make `c.client_brand_asset.client_id` nullable. Every resolver + intake assertion assumes single-client ownership (`client_id NOT NULL`, assessment §1.1); a nullable/sentinel overload silently breaks the per-client pool assertions and `WHERE client_id=…` isolation (risk 4.8). New tables isolate the shared model from the proven client-scoped path.

**Schema placement (OQ-4):** shared asset + suitability + licence in **`m.*`** (alongside the music library); per-client preference in **`c.*`** (alongside `client_*_profile`). Mirrors music's split exactly.

---

## 3. Suitability vocabulary (two layers, mirroring music)

**(a) Intrinsic descriptors** (what the asset *is* — brand-independent; on the shared row / `asset_meta`):
- `brand_neutral` (fail-closed: only `true` may enter the pool),
- `vertical` / `industry_tags[]`, `use_case` / `context_tags[]`, `tone` — **reuse the TMR-4 namespaces** (`vertical/use_case/tone/motion_treatment/length_class/aspect_fit`), not a forked taxonomy,
- `geo_scope` (reuse the live vocabulary), `palette`, `has_people` (fail-closed: people-forward ⇒ not pool-eligible without explicit review), `has_text`/legible-signage flag,
- `safe_for_text_overlay` (template-relative — §5/risk 4.4), `suggested_scrim_opacity`,
- **`sensitivity_class`** + **`cultural_review_required`** (new — OQ-7): richer than the bare `has_people` boolean; `cultural_review_required=true` gives the already-named First-Nations cultural sign-off requirement (D7 exit-test) a real field,
- `ai_exclusion` / provenance (existing clearance-note convention).

**(b) Scoped fit + exclusions** — the `m.music_suitability` shape (§2 table 2). A generic asset can be `suitable` for property-pulse, `not_suitable` for ndis-yarns, and `blocked` for a named competitor **simultaneously** — the expressiveness a flat `governance_scope` enum cannot provide.

All additive; every new eligibility-touching key is a "new shape" under the image-workflow P2 mechanical structural-diff gate.

---

## 4. Fences + scoped approval

- **Same four fences**, default-off, fenced-until-approved (assessment §3.5).
- **Approval is SCOPED, never global** (music precedent): "approved" means "approved **for scope S**" — a `suitable` suitability row + a scoped review-event, answering PK's "approved for whom?". 
- **PK visual verdict remains the only deciding act**; the crop-proof/text-safety gate is re-affirmed **per template geometry** the asset will actually serve (risk 4.4).
- **`purpose_bound` (new — OQ-7):** a distinct no-auto-rotation class. A consent-bound / participant / story- or campaign-bound asset must not enter **automatic rotation even within its own client** (today, if `is_active`+`approved`, `resolve_slot_assets` rotation could pick it). `purpose_bound=true` fences it out of automatic selection; an explicit operator/PK pick is still allowed. This strictly strengthens Rule 3.5 enforcement.

---

## 5. Pool-neutrality — the replacement invariant (OQ-5, the load-bearing change)

Today's invariant — *"an intake must not change any client's per-client eligible count"* (assessment §1.5) — cannot survive a shared pool: a generic asset **legitimately raises every eligible client's count at once**. Replacement:

- **Scoped-delta invariant:** a shared intake may change eligible counts **only for the exact set of scopes named in its approved suitability rows**, and **by exactly the asset(s) in the change set** — asserted in-transaction, fail-closed, as a per-scope delta (generalising the existing `batch_intake_apply.sql` WITH-replica assertion from "delta must be 0" to "delta must equal the approved scope set"). Any client **not** in the approved scope set must see **delta 0** (no silent leak — risk 4.5).
- **Assertion replica ↔ resolver co-versioning (db-rls-auditor must-fix, folded in 2026-07-19):** the in-transaction eligible-count REPLICA in this assertion MUST compute eligibility with the **same union SQL as resolver-v2** (client ∪ scoped-generic, §6). The existing `batch_intake_apply.sql` replica is implicitly client-scoped and would **not see a shared asset's contribution at all** — a naive port would assert "delta 0 everywhere" and **silently pass a real scoped leak at the promotion step (P5)**. The §5 assertion and the §6 resolver-v2 union are therefore **co-versioned and share one eligibility SQL definition** — a hard P4/P5 build requirement. (While an asset is fully fenced, delta-0-everywhere holds under either replica, so the gap bites only at scoped-approval/promotion — but it is pinned here so P4/P5 cannot miss it.)
- **Per-client static assertion unchanged for client-scoped intakes** (the proven T2 path is untouched).
- **Non-waivable per-apply guards remain** (image-workflow P2): byte-verify + public-URL sha256 + branch-warden. The pool assertion is *redefined*, never dropped.
- A **fenced** shared intake raises no count until scoped approval flips, so it still asserts **delta 0 everywhere**.

---

## 6. Resolver model (additive, dark-shipped, T3 to wire)

- **Union step:** candidates = client-scoped assets **∪** generic assets whose scoped-suitability includes a `suitable` row for this client/vertical **and** no `blocked` row for this client. The full existing filter chain (licence / text-safety / platform / output-as-input `bucket='brand-assets'`) applies to generic candidates **plus** the `brand_neutral=true` + no-`blocked` gates and the stricter licence gate (§7).
- **Per-client `asset_pool_policy` (new — OQ-6)** governs the union:
  - `client_only` — client assets only; **never** fall back to shared; fail-closed / request-sourcing when the client pool is empty (real exclusivity need),
  - `client_preferred` (**default**) — client first, shared fills gaps (today's implicit behaviour; client always OVERRIDES generic, TMR-4 "template wins" precedence),
  - `best_fit` — score client + shared together with a client bias (**deferred to a later phase**; not v1).
- **Pool-attribution in explainability (new):** extend the existing `selected/rejected/reason` contract (assessment §1.6) to name the source pool ("selected from: ndis vertical-shared; N client-exclusive alternatives available").
- **Shape:** a new resolver version (`resolve_slot_assets` v2 / a `resolve_shared_assets` helper), shipped **dark** first, proven in isolation, then wired — a **T3 lane** (resolver on the live PP path, risk 4.6): PP byte-identical no-regression proof before wiring. `resolve_brand_assets` (by-key) stays untouched.
- **`production_use_allowed` is NOT a live fence today** (assessment §1.2 — written by intake, read by no resolver). Making it an active eligibility gate is part of this T3 resolver change, **not** a metadata toggle — recorded so it is never assumed to fence before that lane ships (§3.6 override 3).

---

## 7. Licence bar (OQ-3)

- **Shared-pool admits only licences provably multi-entity commercial + no-attribution.** Live mix is Pexels + Unsplash — both royalty-free, no per-entity restriction, commercial reuse permitted (verify current text at the licence lane).
- **CC BY / CC BY-SA / AI-generated excluded** (already ICE policy). **Paid-stock = per-asset exception**, never blanket (fail-closed `paid_ads_allowed`, `content_id_safe` for video).
- **Normalise** the stale `license_type='pexels'` (9 rows, 0 eligible) vs `'pexels_license'` inconsistency at the licence lane.

---

## 8. Storage (no new bucket — §3.6 override 1)

- **Reuse `brand-assets`.** The resolver output-as-input guard checks `bucket='brand-assets'`; a new `creative-assets/` bucket would break it. Generic assets live under a **prefix** — `brand-assets/_shared/verticals/<vertical>/Backgrounds/<asset_key>.jpg` (global-generic under `_shared/global/`). Reuses the `fonts/`+`wasm/` non-client-prefix precedent and the music `global/` convention.
- **Client folders retained unchanged** for genuinely client-only assets. **No bulk move** — reclassifying an existing asset as generic is a deliberate, per-asset, PK-gated action in a later phase (copy bytes, new shared row, sha256-verified, old row retired). Folders are organisational; the DB is authoritative.

---

## 9. Consistency-check vs precedents

| Precedent | Consistency | Cite |
|---|---|---|
| **Music Library v0** | Direct generalisation — shared table (no `client_id`), scoped suitability, 1:1 fail-closed licence, scoped approval, per-client preference table. Images add `sensitivity_class`/`purpose_bound`/`cultural_review_required` (image-specific) + `asset_pool_policy` (a preference-table column). No contradiction. | `20260708224532_create_music_library_v0.sql`; assessment §2.1, §3 |
| **TMR-4 "vertical is a tag"** | Suitability vocabulary reuses the TMR-4 namespaces; `vertical` is a scope value, never a copied library. No fork. | `tmr4-…-packet.md`; assessment §2.2 |
| **Creative Library v2** | Assets stay a governed library; the declarative registry describes and is **never read at runtime** — the DB governs, the resolver selects. This design touches only the DB/resolver side, consistent with the sibling-library model. | `creative-library-v2-architecture.md`, `registry-schema-v2.md`; assessment §2.3 |
| **NDIS Rule 3.5** | The sensitive-class exclusion cites Rule 3.5 (settled); `purpose_bound` (§4) strengthens it. Brand/affiliation-neutrality stays with `brand_neutral` (risk 4.1) per OQ-D. | `ndis_content_rules.md` Rule Group 3 |

`creative-graph-auditor` (declarative consistency) + `db-rls-auditor` (schema/RLS/grant design review) verdicts are recorded at the review stage of this lane, not asserted here.

---

## 10. OQ resolution table — for consolidated PK ratification

| OQ | Question | Recommended position (PROPOSAL) | Precedent / cite |
|---|---|---|---|
| **OQ-2** | Data home | **New shared tables** (music model); do NOT nullable `client_id`. | music v0; assessment §3.1, risk 4.8 |
| **OQ-3** | Licence bar | Multi-entity commercial + no-attribution only (Pexels/Unsplash admitted, verify text); CC BY/CC BY-SA/AI-gen excluded; paid-stock per-asset; normalise `pexels`/`pexels_license`. | assessment §4.2, §7 above |
| **OQ-4** | Schema placement | Shared asset+suitability+licence in **`m.*`**; per-client preference in **`c.*`**. | music split; assessment §6 |
| **OQ-5** | Pool-neutrality | Adopt the **scoped-delta invariant** (§5); keep per-client static for client-scoped intakes; per-apply guards non-waivable. | assessment §3.4; `batch_intake_apply.sql` |
| **OQ-6** | `asset_pool_policy` | Adopt enum; **`client_preferred` default**; **`client_only` in v1**; **`best_fit` deferred**. | §3.6; `c.client_music_profile` precedent |
| **OQ-7** | `purpose_bound` / sensitivity | Adopt `purpose_bound` (blocks auto-rotation; explicit pick allowed) + `sensitivity_class` + `cultural_review_required`. | §3.6; Rule 3.5; D7 exit-test |

Ratifying this table ratifies the design. Each row is a proposal; PK ratifies the set together (PK-chosen consolidated structure). **✅ RATIFIED 2026-07-19 — PK accepted all six positions as proposed at the consolidated gate.**

---

## 11. What this does NOT do (boundaries / non-claims)

- No table created, no DDL, no migration — **P2** is a separate future T2 gate; `db-rls-auditor` must re-run MCP-enabled before any DDL (the P0 orchestrator-read substitution is T1-only).
- No storage/prefix change (**P3**), no resolver edit (**P4/P5**), no deploy, no promotion, no approval of any asset.
- No dashboard UI (**P6**, separate `invegent-dashboard` repo).
- `production_use_allowed` is **not** claimed to fence today. `best_fit` is **not** in v1.
- OQ-1 is not re-opened. Nothing is ratified or proven by this document — PK ratification at §10 is the deciding act.

---

## 12. Review record + Findings-contract block (CCF-02 §2)

**Review chain (P1):**
- **`creative-graph-auditor`: PASS** (2026-07-19) — design does not contradict the Creative Library v2 declarative model; runtime-import guard holds (resolver selects from the DB, not the registry); §3 vocabulary reuses TMR-4 namespaces without registry-schema drift. No object-graph under audit (no `*.json` changed).
- **`db-rls-auditor`: `concerns` → addressed** (2026-07-19) — no high-severity exposure/grant/RLS gap; a faithful generalisation of the proven music-v0 posture. Concerns folded into this DoR: §5 replica↔resolver co-versioning (must-fix), §2 four→six tables (review_event + usage_event restored), §2 RLS posture pinned to the music RLS-enabled deny-all shape, §2 `UNIQUE(asset_key)` + `UNIQUE(asset_id, scope_kind, scope_value)`. **R1 substitution NAMED:** the auditor's `mcp__supabase__*` tools were not wired this session, so advisors + live grant/RLS + live resolver-body re-verification were NOT run — grounded on repo artifacts instead. T1-only stopgap; **P2 MUST re-run `db-rls-auditor` MCP-enabled (incl. `get_advisors` security+performance) before any DDL.**
- **external review: `partial → escalate`** (review_id `20f7b813`, reviewed_input_hash `0a4194cd9a928f8f03b9552e378a40f4b94731bf342bf5f2cff9f9da1da94669` = this DoR's design content). No concrete defect; high confidence. The escalation is a `policy_decision` + `runtime_verification_required`: the reviewer holds that the data-protection adequacy of client-specific eligibility (the scoped-delta leak-prevention) requires human oversight and cannot be fully verified at design time. Both are already routed — PK ratification is the human oversight; the runtime proof of leak-prevention is a NAMED gate (P2 MCP-enabled `db-rls-auditor` + `get_advisors`; P4/P5 dark-ship + PP byte-identical + scoped-delta proven before promotion + rollback). Not a fixable defect — terminates at the PK gate. *(This §12 annotation records the verdict; it does not alter the reviewed design content.)*

**Findings contract:**
- **verdict** — normalized: `concerns` · native: DESIGN_OF_RECORD_READY_FOR_PK (creative-graph PASS; db-rls concerns folded in; the residual `concerns` is the R1 MCP-less substitution — a named P2 precondition, not an unaddressed defect).
- **confidence** — High on the design spine (direct music-precedent generalisation, live-grounded via assessment §1). Medium on live-DB soundness pending the MCP-enabled P2 auditor pass.
- **must_fix (before P2 DDL):** (1) re-run `db-rls-auditor` MCP-enabled (advisors + live resolver bodies + music-v0 grants). (2) P4/P5 must co-version the §5 assertion replica with the resolver-v2 union SQL.
- **should_fix (carry to P2 DDL):** `UNIQUE(asset_key)`; `UNIQUE(asset_id, scope_kind, scope_value)`; `c.client_asset_profile` PK=`client_id` FK + RLS-enabled deny-all; the review_event + usage_event tables (now in §2).
- **observations:** after the six-table revision the design drops nothing from music v0; `production_use_allowed` treatment is internally consistent + matches assessment §1.2 live verification (not independently re-verified live this session — R1).
- **evidence:** assessment §1 (live 2026-07-19), music v0 migration, `batch_intake_apply.sql:100-114`, `grant_service_role_select_client.sql`, creative-library v2 architecture + registry-schema, TMR-4 packet, Rule 3.5.
- **scope_boundary:** docs-only design ratification. No DDL/storage/resolver/deploy/promotion; no live DB apply; dashboard (P6) untouched.
- **open_questions:** OQ-2..OQ-7 recommended positions (§10) — PK ratifies, consolidated.
- **recommended_next_gate:** external review pinned to this hash → PK consolidated ratification → (on ratify) the P2 dark-DDL lane with an MCP-enabled `db-rls-auditor`.
- **non_claims:** nothing built, ratified, or proven; no schema exists; the six-table model + OQ positions are proposals; live-DB soundness not independently verified this session (R1).
