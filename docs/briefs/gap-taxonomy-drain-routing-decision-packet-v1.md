# Gap Taxonomy & Drain Routing — Decision Packet v1

> **Type:** Architecture analysis / decision packet. **NOT** a brief, migration, or implementation.
> **Scope of this lane:** analysis only — no migrations, code, worker implementation, browser actions,
> or provider calls were performed. All findings below rest on **read-only** live queries against
> project `mbkmaxqhsohbtwsqolns` (function bodies + `select_template`/`derive_asset_appetite`/
> `resolve_slot_assets` re-runs + assignment/suitability reads), captured 2026-07-21.
> **This packet does not begin the Gate-1 brief.** It ends with a recommendation on whether that
> brief is the correct next artifact.

---

## 0. Executive summary

1. **The current 3-value `gap_type` (`template_gap` / `governance_gap` / `asset_gap`) is a *routing* label, not a *diagnosis*.** It records the first `select_template` reject bucket, which conflates *what* is missing with *why* it is blocked. `governance_gap` in particular is a catch-all that hides at least four distinct underlying states.
2. **Proposed fix:** an **orthogonal** classification — `subject_kind` × `failure_state` × `remediation_route` × `automation_class` × `governance_state` — with the legacy `gap_type` retained only as a **derived compatibility value**. Routing keys on the *diagnosed cause*, never the surface reject code.
3. **Live reclassification of the 8 tickets shows no open ticket is a clean, sourceable asset gap.** The three that were (Invegent `image_quote`) already drained via the shared pool. The four open tickets are **3× unassigned-configuration** (Invegent + CFW carousels) and **1× misconfiguration** (Property Pulse youtube video-stat, missing platform-suitability row). **Auto-sourcing has zero eligible open tickets today.**
4. **Consequence for Phase 1:** the backgrounds-only sourcing drain is the right long-term hero, but it is currently *starved* — the real open blockers are configuration/assignment repair and appetite-ambiguity, which sit **upstream** of sourcing. The Gate-1 brief must account for this.
5. **Creatomate:** the documented public API exposes rendering and template retrieval but **no documented template creation/update endpoint**. Template drainage is therefore an **operator-build packet**, never an auto-launched browser action.

---

## 1. Current-state diagnosis (live evidence)

### 1.1 The reject-code pipeline (authoritative)

`select_template` evaluates each candidate template for a `(client, platform, format)` through an **ordered, short-circuiting** gate chain. The **surface reject code is only the first gate that failed** for that template; `analyze_asset_gap` then aggregates across candidates and picks a `primary_route` by priority (governance > template > asset). This is why the recorded route is a lossy summary.

Gate order and the code each emits:

| Order | Gate | Reject code(s) | What it actually means |
|---|---|---|---|
| 1 | Scope | `wrong_scope` | Template is `client`-scoped but owned by a different client, or scope is `brand`/other. Template exists; not usable for this client. |
| 2 | Template status | `status_below_smoke` | Template row has not reached `smoke_rendered`+. The **template itself** is immature. |
| 3 | Platform suitability | `platform_unsuitable` (`no_suitability_row_for_platform` / `suitability_status_negative`) | Template exists + assigned-eligible, but **no/negative platform-suitability row** for this platform. **Misconfiguration.** |
| 4 | Client assignment | `no_assignment` | A qualifying template **exists** but there is **no assignment row** linking it to this client. **Unassigned — NOT absent.** |
| 4 | Client assignment | `assignment_not_approved` | Assignment exists, status `proposed`. **Exists, unapproved.** |
| 4 | Client assignment | `assignment_blocked` | Assignment status `blocked`/`deprecated`. **Held/blocked.** |
| 4 | Client assignment | `not_visually_proven` (`assignment_approved_but_no_visual_rung`) | Assignment `approved` but no visual rung reached. **Exists, unproven.** |
| 5 | Visual proof | `not_visually_proven` (`no_passed_visual_approval_proof_on_assignment`) | Assignment visually-approved+ but no **passed** `visual_approval` proof event. **Exists, unproven.** |
| 6 | Asset resolution | `assets_fail_closed:<reason>` (e.g. `no_governed_background`, `missing_required_logo`) | Everything upstream passed; the **asset itself is absent**. This is the **only true asset-absent signal**. |

Terminal `fail_reason` values: `client_not_found`, `format_unmapped` (no candidate maps this format at all — a genuine **template-absent** signal), `no_selectable_template` (candidates existed, all rejected).

**Key correction (per instruction #2): `no_assignment` does not mean "template absent."** It means a qualifying template exists but is not linked to this client. Template-absent is signalled only by `format_unmapped` (nothing maps the format) — a different code entirely.

### 1.2 The eight tickets under live re-diagnosis

Re-ran `select_template` + `derive_asset_appetite` for every open ticket and read the assignment/suitability rows.

**Open tickets:**

| Ticket | Client / platform / format | Recorded (route / why / drain) | **Live reject** | **Diagnosed true cause** |
|---|---|---|---|---|
| `273626e5` | invegent / linkedin / carousel | governance_gap / ambiguous_asset_appetite / blocked_by_template | `no_assignment` ×3 → `no_selectable_template` | **Template-assignment ABSENT** (Invegent has no carousel assignment). Appetite *also* ambiguous (multi-part family). |
| `0532d311` | cfw / facebook / carousel | governance_gap / ambiguous / blocked_by_template | `no_assignment` ×3 | **Template-assignment ABSENT** (CFW has no carousel assignment). |
| `3b7b0d36` | cfw / linkedin / carousel | governance_gap / ambiguous / blocked_by_template | `no_assignment` ×3 | **Template-assignment ABSENT.** |
| `22d3df93` | property-pulse / youtube / video_short_stat | template_gap / no_governed_background / blocked_by_template | `platform_unsuitable` (`no_suitability_row_for_platform`) | **MISCONFIGURATION** — video template is assigned+proven for PP, but **no youtube platform-suitability row** (rows exist only for fb/ig/li). A real 9:16 background gap sits *behind* the config block. |

**Resolved tickets:**

| Ticket | Client / platform / format | Recorded | **Diagnosed true cause (from current evidence)** |
|---|---|---|---|
| `2a5a11c8` | invegent / instagram / image_quote | governance_gap → resolved via **shared** asset | `quote_card` is assigned+proven for Invegent; drained by supplying a shared background → **terminal cause = static_background ABSENT (drainable); drained Route B.** |
| `24c673a0` | invegent / linkedin / image_quote | governance_gap → resolved via **shared** asset | Same → **asset-absent, drainable; drained Route B.** |
| `cf02a8e4` | invegent / facebook / image_quote | governance_gap → resolved via **shared** asset | Same → **asset-absent, drainable; drained Route B.** |
| `73fdc325` | cfw / facebook / image_quote | governance_gap → resolved via **client** asset (Route A) | **UNRESOLVED from current evidence** — CFW's current assignment set (only `generic_market_insight_card`) does not cleanly show an assigned `image_quote`/`quote_card` template, so how this `image_quote` ticket reached a producible state is not corroborable now. Marked unresolved rather than guessed. |

**Headline:** the recorded `governance_gap` label was correct-but-lossy on all four Invegent image_quote/resolved cases (the *point-in-time* block was governance-flavoured; the *terminal* drain was asset-supply). None of the **four open** tickets is a static-background asset gap that sourcing would close.

### 1.3 Why every open carousel ticket also reads "ambiguous"

The carousel is a **multi-template family**: the *cover* variant needs a governed background (`material_key = true|true|false|static_background`), while *body*/*closing* need none (`…|none`). `derive_asset_appetite` cannot collapse these to one canonical appetite → returns `ambiguous`, which forces `asset_gap_drainability = blocked_by_template` regardless of route. So the ambiguity is a **structural (per-variant appetite) problem**, orthogonal to the assignment problem — a second reason these are not sourcing candidates.

---

## 2. Proposed schema semantics (orthogonal classification)

Replace **routing-on-`gap_type`** with five orthogonal axes. `gap_type` is kept as a **derived** column for back-compat and dashboards only; nothing routes on it.

### 2.1 `subject_kind` — *what* the demand concerns
`static_background` · `logo` · `image` · `video_broll` · `template` · `template_assignment` · `platform_config` · `unknown`

### 2.2 `failure_state` — *why* it is blocked (diagnosed state of the subject)
`absent` (exists nowhere) · `unassigned` (exists, not linked to client) · `unapproved` (assigned, status `proposed`) · `unproven` (approved, no passed visual proof) · `blocked` (blocked/deprecated/held) · `misconfigured` (exists+assigned, required config row missing/negative) · `ambiguous` (appetite indeterminable) · **`unresolved`** (evidence insufficient — the honest default; never guess)

### 2.3 `remediation_route` — *what action* closes it
`governed_sourcing` · `operator_approval` · `operator_template_build` · `config_repair` · `manual_triage` · `capability_backlog` · `none`

### 2.4 `automation_class` — *how much* can be automated
`auto_prepare_human_approve` (automation prepares candidates; human is terminal approver) · `auto_detect_human_execute` (automation detects+packages; human performs the change) · `manual_only` · `deferred`

### 2.5 `governance_state` — fence/approval posture of any candidate in play
`none` · `fenced_candidate` · `reviewer_passed` · `human_approved` · `promoted_governed` · `rejected`

### 2.6 Legacy `gap_type` as a derived value
Derivation (compatibility only):

| (`subject_kind`, `failure_state`) | Derived legacy `gap_type` |
|---|---|
| (`template_assignment`, `unassigned`/`unapproved`/`unproven`/`blocked`) | `governance_gap` |
| (`platform_config`, `misconfigured`) | `template_gap` |
| (`template`, `absent`) | `template_gap` |
| (`static_background`/`logo`/`image`, `absent`) | `asset_gap` |
| (anything, `unresolved`) | `governance_gap` (conservative — never implies "go source") |
| client-not-found / system | `system_error` |

**Routing rule:** the engine routes on (`subject_kind`, `failure_state`) → `remediation_route`. `gap_type` is output, never input.

---

## 3. Reject-code reclassification (surface code → diagnosed causes → route)

Per instruction #2, each current reject code maps to *possible* underlying causes; routing follows the **diagnosed** cause, which may require one extra probe (assignment/suitability/proof read) before it is certain.

| Surface reject code | Possible underlying causes | Probe to disambiguate | `subject_kind` / `failure_state` | `remediation_route` |
|---|---|---|---|---|
| `format_unmapped` | No template variant maps this format | (none — definitive) | `template` / `absent` | `operator_template_build` |
| `no_assignment` | Template exists but not assigned to client | read `creative_template_client_assignment` (absent) | `template_assignment` / `unassigned` | `config_repair` |
| `assignment_not_approved` | Assignment `proposed` | read assignment status | `template_assignment` / `unapproved` | `operator_approval` |
| `not_visually_proven` | Assignment approved but no passed proof | read `creative_template_proof_event` | `template_assignment` / `unproven` | `operator_approval` |
| `assignment_blocked` | Assignment `blocked`/`deprecated` | read assignment status | `template_assignment` / `blocked` | `manual_triage` |
| `wrong_scope` | Client-scoped-other / `brand` scope | read template scope + owner | `template` / `misconfigured` or `absent` | `config_repair` or `operator_template_build` |
| `status_below_smoke` | Template row immature | read template status | `template` / `unproven` | `operator_approval` (of the template) |
| `platform_unsuitable` | No/negative suitability row for platform | read `creative_template_platform_suitability` | `platform_config` / `misconfigured` | `config_repair` |
| `assets_fail_closed:no_governed_background` | Governed background genuinely absent | confirm no eligible client/shared asset | `static_background` / `absent` | **`governed_sourcing`** |
| `assets_fail_closed:missing_required_logo` | Client logo absent | confirm no eligible logo | `logo` / `absent` | `governed_sourcing` (logo lane — deferred) |
| appetite `ambiguous` (not a reject code; from `derive_asset_appetite`) | Multi-variant conflicting appetite; thin descriptor | inspect candidate `material_key`s | subject per-variant / `ambiguous` | `manual_triage` + classifier fix (never source) |

**Only `assets_fail_closed:no_governed_background` on a static-background slot, with no upstream block and unambiguous appetite, is a sourcing candidate.** Every other code routes elsewhere.

---

## 4. Drain-routing matrix

| # | Condition (diagnosed) | `remediation_route` | `automation_class` | Fenced? | Terminal act | Phase |
|---|---|---|---|---|---|---|
| R1 | `static_background` **absent**, appetite unambiguous, no upstream block | `governed_sourcing` (harvester → reviewer prep) | `auto_prepare_human_approve` | Yes | **PK visual approval** → promote → reconcile | **Phase 1** |
| R2 | Existing candidate/template **unapproved / unproven** | `operator_approval` (surface to approval queue) | `auto_detect_human_execute` | n/a (already exists) | PK approval + proof | Near-term |
| R3 | Template **genuinely absent** (`format_unmapped`) | `operator_template_build` + governed template intake | `auto_detect_human_execute` (build packet only) | Yes (result re-enters intake) | PK build + governance | Deferred (build automation) |
| R4 | **Assignment / configuration absent** (`no_assignment`, `platform_unsuitable`) | `config_repair` | `auto_detect_human_execute` | n/a | Operator config change + approval | Near-term |
| R5 | **Blocked / held** (`assignment_blocked`, sensitive holds) | `manual_triage` | `manual_only` | n/a | Human decision | Always manual |
| R6 | `video_broll` **absent** | (deferred lane) | `deferred` | — | — | **Deferred proving lane** |
| R7 | **Unsupported provider capability** (e.g. build template via API) | `capability_backlog` (NOT an asset gap) | `deferred` | — | Product decision | Backlog |

**Current ledger mapped onto the matrix:** 3 open tickets → **R4** (config repair); 1 open ticket → **R4 then R1** (youtube suitability repair first, *then* a real 9:16 background source); 3 resolved → **R1** (already drained); 1 resolved → **unresolved**. **Zero open tickets are R1-ready today.**

---

## 5. Phase-1 lifecycle (narrow)

**Scope fences (all mandatory):**
- **Client:** Property Pulse only.
- **Subject:** `static_background` only.
- **Failure state:** `absent` only — never `unassigned`, `misconfigured`, `ambiguous`, or `unresolved`.
- **Provider allow-list:** approved sources only (research supports **Pexels** as the clean fit for a download→sha256→store pipeline; Unsplash's hotlinking/attribution model conflicts and is excluded from Phase 1).
- **Appetite:** must be unambiguous (`status = ok`, `needs_governed_background = true`, aspect resolved).
- **No upstream block:** `select_template`'s *only* failing gate is the asset (gate 6).

**Lifecycle (statuses already exist in `m.asset_gap_suggestion`):**
```
open
  → [eligibility filter: R1-ready?]  — if not, route per matrix; do NOT source
  → queued            (claimed_by set)
  → harvesting        (auto: search → dedupe → download → provenance → reviewer prep)
  → candidates_ready  (fenced package; harvest_manifest_ref / candidates_ref set)
  → [PK VISUAL APPROVAL — terminal deciding act]
  → (promotion INSERT approved=true) + (reconcile close-pass)
  → resolved
```
**Invariants:** candidate creation reaches only `candidates_ready` — it **does not resolve the ticket**. Resolution requires **promotion + reconciliation** (the existing auto-close pass flips `open→resolved` only when `select_template` returns `ok` with a real asset filling the slot). Everything sourced stays **fenced** (`is_active=false`, `production_use_allowed=false`, `approval_status=intake_candidate`) until PK approves. Automation prepares; PK decides; the loop closes itself.

**Live caveat:** as of 2026-07-21 there is **no R1-ready open ticket**. Phase 1 therefore needs one of: (a) the classifier precision to isolate a true `(static_background, absent)` verdict once one occurs, plus a controlled Property-Pulse background gap as the proving fixture; or (b) explicit acceptance that the drain idles until a real PP background gap appears. This is a Gate-1 decision, not an implementation detail.

---

## 6. Creatomate template drainage

**Recorded conclusion (verbatim, per instruction #6):**
> *"The documented public API exposes rendering and template retrieval but no documented template creation/update endpoint."*

Evidence: the public REST surface is `POST /v1/renders` (render), `GET /v1/templates`, `GET /v1/templates/{id}` (read). No `POST`/`PUT`/`PATCH`/`DELETE` on templates; templates are authored in the editor UI. Rendering ad-hoc JSON via the `source` field is possible but produces an **ungoverned** render, not a stored governed template.

**Design:** a `template`-absent gap (R3) produces an **automatically prepared operator-build packet** — a specification of the template to build (format, aspect, slot structure, appetite, reference variants, governance target) — that a human executes in the Creatomate editor, after which the result re-enters the normal governed template intake. The build **may optionally** be executed through a **PK-launched, Creatomate-confined, browser-assisted session** (session scoped to Creatomate only, human-supervised, human-approved). It **must never auto-launch from a ticket.** (Deep-research basis: general-purpose browser agents on authenticated sessions are unsafe by default — prompt/plan injection, credential exfiltration, ~85% reliability; the safe pattern is a confined, code-boundaried, human-approved assist.)

---

## 7. Provider-governance fields (every sourced candidate)

Every candidate produced by a `governed_sourcing` drain MUST carry, before it can reach the approval queue:

1. **Provider + source URL** — the platform and the exact origin page.
2. **Creator attribution** — named creator/photographer.
3. **Licence + terms snapshot** — licence name/type and a snapshot of the terms *as retrieved* (terms change without notice).
4. **Retrieval timestamp** — when the bytes were fetched.
5. **Original file hash** — sha256 of the actual downloaded bytes.
6. **Visible-person / brand / property indicators** — flags for people, readable signage/branding, identifiable property.
7. **Commercial-use + attribution requirements** — whether commercial marketing use is permitted and whether attribution is required.
8. **Automated reviewer results** — the image-reviewer verdict + notes (suggestive only).
9. **Human approval evidence** — PK's terminal decision record (who, when, verdict) — populated at approval, required for resolution.

(Maps onto the existing `c.shared_creative_asset.asset_meta` provenance model — `sha256`, `license`, `source_url`, `creator`, `safe_for_text_overlay`, `crop_proof`, etc. — extended with the person/brand/property indicators and the reviewer/human-approval evidence.)

---

## 8. Explicit deferrals (out of scope for this design/Phase 1)

1. **Video / b-roll drain** — separate proving lane; licensing/API for video providers is un-researched and differs from images.
2. **People-forward and NDIS-sensitive content** — remains behind the staged NDIS imagery gates; never auto-sourced.
3. **Generative image/video providers** — excluded; AI-generated-content provenance/licence ambiguity.
4. **Autonomous browser template creation** — never; only PK-launched, confined, human-approved assist.
5. **Multi-provider fallback orchestration** — single approved provider per subject in Phase 1; no cross-provider failover.
6. **Production deployment** — this packet and its successor brief stop at design/local; deploy remains the PK hard gate.

---

## 9. Migration / compatibility strategy

- **Additive only.** Add the five axis columns (`subject_kind`, `failure_state`, `remediation_route`, `automation_class`, `governance_state`) to `m.asset_gap_suggestion`. Keep `primary_route` and `asset_gap_drainability` as **derived / back-compat** — populated from the axes, never routed on.
- **`failure_state = 'unresolved'` is a first-class value**, so the analyzer can honestly record "cannot distinguish" instead of forcing a wrong route. The existing `gap_drainable_requires_static_bg` constraint stays; a new guard should require `remediation_route = 'governed_sourcing'` ⇒ `failure_state = 'absent'` AND `subject_kind IN (asset kinds)`.
- **Analyzer change is the real work:** `analyze_asset_gap` must (a) probe past the first reject code to the diagnosed cause, (b) resolve multi-variant carousel appetite (fix the `ambiguous` collapse), (c) populate the axes. This is a code lane (ef-builder), gated, later.
- **No destructive change, no historical rewrite.** Existing rows get axes back-filled by a one-time derivation from their stored fields where unambiguous, else `unresolved`.
- **This packet proposes semantics only.** The DDL + analyzer diff are separate, individually-gated lanes.

---

## 10. Risks & STOP conditions

| Risk | STOP condition |
|---|---|
| **Misrouting to sourcing** — sourcing an image for an `unassigned`/`misconfigured`/`ambiguous` ticket (wasteful and wrong; describes **all 4 open tickets today**) | **Never** dispatch `governed_sourcing` unless `failure_state = absent` AND `subject_kind` is an asset kind AND `select_template`'s only failing gate is the asset. |
| **Ambiguous appetite masking** | Never auto-source while appetite is `ambiguous`; route to classifier fix / triage. |
| **Outward-facing network action** (auto-sourcing) | Allow-list providers only; batch per theme; rate limit; kill switch; re-read licence at retrieval time. |
| **Candidate mistaken for resolution** | Candidate creation may reach only `candidates_ready`; any path that flips `resolved` on candidate creation is a hard STOP. Resolution only via promotion + reconcile. |
| **Fencing breach** | Sourced assets are born fenced; any candidate reaching `production_use_allowed=true` before PK approval is a hard STOP. |
| **Browser template build auto-launch** | Never auto-launch; confined to Creatomate; human-supervised; human-approved. |
| **Provider licence drift** | A candidate without a fresh licence-terms snapshot + sha256 + provenance cannot enter the approval queue. |
| **Guessing a classification** | Where evidence cannot distinguish the failure state, record `unresolved` — never a guessed route. |

---

## 11. Recommended next gate

**Recommendation: proceed to a Gate-1 brief for the backgrounds-only drain loop — but scoped and sequenced to reflect the live finding, not as a standalone sourcing worker.**

The backgrounds-only drain (R1, Property Pulse, static backgrounds, Pexels, fenced, PK-terminal) is the correct next artifact **provided the brief also carries its true dependencies**, because the diagnosis shows sourcing is currently starved:

1. **Classifier precision is a hard dependency, not a follow-up.** The Gate-1 brief must include the `analyze_asset_gap` upgrade that (a) diagnoses past the surface reject code to the true `failure_state`, and (b) resolves multi-variant appetite so a clean `(static_background, absent)` verdict can even be emitted. Without it, R1 never fires and R4/R5 tickets risk being mis-sent to sourcing.
2. **Name the proving fixture.** Since no R1-ready open ticket exists, the brief must either designate a controlled Property-Pulse background gap as the proving case or explicitly accept idle-until-real-gap.
3. **Config-repair (R4) is the actual current unblocker** and should be acknowledged as a **sibling lane** (the four open tickets need assignment/suitability repair, not sourcing) — even if Phase 1 does not build it, the brief should not imply sourcing will clear the current ledger.

If PK prefers a smaller first step, an alternative is a **precursor packet/lane** that lands the orthogonal classification + config-repair routing first, then the sourcing drain — but the single Gate-1 brief above, with the classifier dependency built in, is the recommended path.

**This packet does not begin that brief.**

---

*Evidence base: live read-only queries on `mbkmaxqhsohbtwsqolns` (2026-07-21) — function definitions (`select_template`, `analyze_asset_gap`, `derive_asset_appetite`, `run_asset_gap_analysis`); live re-runs for the 4 open tickets; assignment + platform-suitability reads. Deep-research inputs (Creatomate API surface, browser-automation safety, Pexels/Unsplash licensing) per task `wcdg27ynk`. No mutations performed.*
