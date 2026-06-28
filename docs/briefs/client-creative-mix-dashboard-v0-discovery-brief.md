# Brief — Client Creative Mix Dashboard v0 — DISCOVERY (read-only planning)

**Created:** 2026-06-28 Sydney
**Author:** Claude Code (Session 2 — independent review/proof lane)
**Status:** PLANNING / DISCOVERY ONLY. No UI, no DB mutation, no migration, no dashboard code. Local-only.
**Repo note:** the **dashboard UI lives in the separate `invegent-dashboard` repo** (dashboard.invegent.com, Vercel `prj_iLsaEFCAqeuQjSdlbtfpfXC3jhxg`), **not** this CE repo. This brief is the CE-side planning artifact + source map; the UI build is a dashboard-repo task.

> This document DESCRIBES and SCOPES the sprint. It does not build UI, query at runtime, mutate the DB, or change any worker/advisor/selector/schedule.

---

## 1. Sprint purpose
**Client Creative Mix Dashboard v0** — make a client's creative configuration (intended) and production evidence (actual) visible at the client level, **Property Pulse first**, **read-only first**. It is the operator layer over the now-live ACI capability-contract spine (B1 stamp → B2 echo → Slice C warn-only validation). It answers: *"Are we producing what the client is configured to produce?"*

## 2. Corrected sprint framing (post Session-2 review + grounding)
The two halves are **not** equally ready. Verified read-only grounding (see §4/§5) shows:
- **Evidence/History view leads** — it is **sourceable today** from real data.
- **Config view is reframed as a "Config-Gap Audit"** — the config *model is richer than first assumed* but **partially unpopulated**; the audit's job is to show what is set vs defaulted vs missing.
- **A true editable Control Tower is deferred** to a later, separately-gated sprint (needs the config model populated + guardrails).

> **Correction to the Session-2 review:** the earlier review stated "per-client format target-% config does not exist." That was **imprecise**. The *model* exists (`c.client_format_mix_override.override_share_pct`) but is **empty (0 rows, all clients)**; effective mix therefore comes from the DB-backed defaults table `t.platform_format_mix_default`. Per-client *enablement*, *schedule*, and *cadence* config all exist and are **populated** for PP. Only **variant-level** config is genuinely absent. The brief below uses the verified picture.

## 3. Two surfaces

### A. Production Evidence / History (LEADS — data-backed today)
Per selected client (PP first): historical **format mix**, historical **variant/contract mix**, draft → render → publish evidence (counts + last-seen), **legacy/no-contract vs governed/proven** split, and a **validation** column that reads **PENDING** until Slice C natural proof lands (`m.post_render_log.render_spec.contract_validation` currently has **0 rows**).

### B. Client Creative Config-Gap Audit (SECOND — mostly gap-surfacing)
Per selected client: platform **schedule/cadence**, **coarse + per-format enablement**, **preferred_format** fields, **format target-% (override vs default vs missing)**, **variant allowlist (absent)**, **variant target-% (absent)** — every value **source-labelled** (client / profile / schedule / config / override / default / hardcoded / registry / missing). It deliberately exposes gaps; it does not invent values.

---

## 4. Source map checklist (VERIFIED this session — existence + PP population)

| Source | Exists? | PP rows | Carries | Confidence / use |
|---|---|---|---|---|
| `c.client` | ✅ | 1 | client identity, `client_slug` | HIGH — client resolution |
| `c.client_publish_profile` | ✅ | per-platform | `publish_enabled`, `max_per_day`, `min_gap_minutes`, `image_generation_enabled`, `video_generation_enabled`, `preferred_format_facebook/linkedin/instagram`, `auto_approve_enabled`, `paused_*` | HIGH — coarse enablement + caps + single preferred format/platform (NOT a mix %) |
| `c.client_format_config` | ✅ | **9** | `platform`, `ice_format_key`, `is_enabled`, `max_per_week`, `service_tier` | HIGH — **per-client per-format enablement** (real, populated) |
| `c.client_format_mix_override` | ✅ | **0** | `platform`, `ice_format_key`, `override_share_pct`, `reason`, `effective_from`, `is_current`, `superseded_by` | HIGH — **THE per-client format target-% model — EXISTS but EMPTY (0 rows, all clients)** |
| `t.platform_format_mix_default` | ✅ | n/a (22 total) | `platform`, `ice_format_key`, `default_share_pct`, `evidence_source`, `is_current` | HIGH — **DB-backed defaults** (the research doc, tabled). **Default, NOT client config** — label as such |
| `c.client_publish_schedule` | ✅ | **35** | `platform`, `day_of_week`, `publish_time`, `enabled` | HIGH — per-client per-platform schedule (real, populated) |
| `c.client_cadence_rule` | ✅ | **4** | `platform`, `cadence_type`, `posts_per_period`, `period_unit`, `weekdays`, `preferred_local_times`, `expected_format`, `timezone`, `is_active`, `suppression_dates` | HIGH — per-client cadence (real, populated); note `expected_format` is a format hint at cadence level |
| `m.slot` | ✅ | (TBD) | slot-driven schedule instances | MED — confirm role vs schedule/cadence in Slice 0 |
| `m.post_draft` | ✅ | many | `recommended_format`, `image_status`, `approval_status`, `draft_format.contract` (B1 stamp), `dead_reason` | HIGH — draft evidence + contract stamp |
| `m.ai_job` | ✅ | many | generation job state | MED — generation evidence |
| `m.post_render_log` | ✅ | 315 (PP image_quote) | `render_spec` (label, `variant_key`/`contract_ref`/`contract_version`/`selector_reason` echo, `contract_validation`), `status`, `ice_format_key` | HIGH — **render evidence + contract identity + validation** |
| `m.post_publish_queue` | ✅ | many | queue state, `dead_reason`, `attempt_count` | HIGH — publish-attempt evidence |
| `m.post_publish` | ✅ | many | published rows | HIGH — publish evidence |
| `docs/creative-library/property-pulse.json` | ✅ (docs) | 1 contract | `property_pulse.image_quote.news_card.v1` only | HIGH as **registry truth** — but **NOT assumed runtime-readable** by the dashboard (see §7 read-path decision) |
| `docs/research/platform_format_mix_defaults.md` | ✅ (docs) | — | research/defaults narrative | LOW for runtime — superseded by `t.platform_format_mix_default`; **default, not client config** |
| `docs/dashboard/operator-journey-ia-v1.md` | ✅ (dashboard repo) | — | accepted IA spec | **NOT in CE repo** — read in `invegent-dashboard` during Slice 0 |
| existing dashboard server-action patterns | ✅ (dashboard repo) | — | service-role `.rpc()` / read patterns, `@/lib/intent-status` | reuse; discover in dashboard repo |

## 5. Missing-data map (VERIFIED — precise, not assumed)
- **Per-client format target-% : model EXISTS, UNPOPULATED.** `c.client_format_mix_override` has **0 rows** (PP and all clients). No client has an active % override → effective format mix = `t.platform_format_mix_default` (platform defaults). Audit must render this as **"% = platform default; no client override (MISSING_CONFIG)"** — never as if client-configured.
- **Per-client variant target-% : ABSENT.** No variant-level table found (no `client_variant_*`). No client↔variant binding, no variant %.
- **Variant allowlist : ABSENT as data.** Variants exist only in the docs registry; **exactly one** real governed PP contract: `property_pulse.image_quote.news_card.v1`. `market_stat`/`suburb_tip` etc. do **not** exist.
- **Slice C validation evidence : NOT YET PRESENT.** `m.post_render_log.render_spec.contract_validation` = **0 rows** (Slice C deployed; first natural governed render pending). Validation columns ship **PENDING**.
- **Governed vs legacy production (PP image_quote):** 315 renders total; only **~9** carry governed contract identity; the remainder carry no `render_spec`/contract = **legacy** (directional — the legacy/governed predicate is formalised in §6 during Slice 0).
- **Format enablement is split across two tables** (`client_publish_profile.*_generation_enabled` coarse booleans + `preferred_format_*`; and `client_format_config.is_enabled` per-format). Slice 0 must reconcile which is authoritative for display.

## 6. Status predicate definitions (deterministic — map to data, not vibes)
Each row's status is derived from explicit evidence predicates (finalise exact column logic in Slice 0):
- **PROVEN** — a contract is stamped on the draft (`m.post_draft.draft_format.contract` with non-empty `variant_key`/`contract_ref`/`contract_version`) **AND** echoed in a succeeded `m.post_render_log.render_spec` (`variant_key` present, `status='succeeded'`) **AND** (once Slice C evidence exists) `render_spec.contract_validation.status='pass'`. Until Slice C rows exist, the strongest attainable is "governed identity echoed" → report as **PROVEN (identity); validation PENDING**.
- **PENDING** — configured/expected but the awaited evidence row is not yet present (e.g. governed identity echoed but `contract_validation` absent → validation PENDING; or a registered variant with no render yet).
- **WARN** — evidence present but partial/mismatched/stale: `contract_validation.status='warn'`, OR contract identity mismatch (echoed `variant_key` ≠ expected), OR `fallback_taken=true` on a governed render.
- **FAILED** — an eligible event occurred but expected evidence is missing/failed: governed draft with render `status IN ('failed','timeout')`, or `image_status='failed'` where a governed render was expected.
- **LEGACY** — production rows with no contract identity (`render_spec` NULL, or no `variant_key`, and label ≠ `creative_library_b1_production`). Pre-/no-contract content.
- **PLANNED** — declared in registry or enabled in config (`client_format_config.is_enabled=true`, or a registry contract) but **no production evidence** yet.
- **UNSUPPORTED** — format/variant not executable by the provider path (enabled/declared but no governed template/impl or no renderer for it).
- **MISSING_CONFIG** — an expected config row is absent and a default governs in its place (e.g. no `client_format_mix_override` row → % is default-derived; no `client_format_config` row for a format produced).

## 7. IA placement recommendation (provisional — confirm in dashboard repo)
The accepted IA spec (`docs/dashboard/operator-journey-ia-v1.md`) is **governed in the `invegent-dashboard` repo and is not present in CE**; Slice 0 must read it there. Provisional placement, to be confirmed against the spec and **`dashboard-ia-lint`** before any UI:
- **Production Evidence / History → REPORTS / analytics zone** (the spec already carries an "Analyse → REPORTS" item). Retrospective, metric-shaped.
- **Config-Gap Audit → client detail page** (a read-only "creative config" section). Client-scoped operating view.
- **Both consume the global client picker** (the open *global client-picker → top-right* carry) — do not invent a local client selector.
- **One-page-section vs tabs is an IA decision**, not chosen here — defer to the spec.
- **`dashboard-ia-lint` must review** the proposed surface before UI implementation.

## 8. Proposed implementation slices
- **Slice 0 — Discovery / source-map (read-only).** In `invegent-dashboard` (read IA spec + server-action patterns) **+** CE Supabase read-only: finalise source map, status predicates (exact SQL), legacy/governed predicate, registry read-path decision (§ below), IA placement. **No UI, no DB writes.** Output: source map + missing-data map + SQL plan + IA decision.
- **Slice 1 — Production Evidence / History (read-only UI).** Historical format mix, variant/contract mix, draft/render/publish counts, legacy vs governed, validation = PENDING until Slice C lands.
- **Slice 2 — Config-Gap Audit (read-only UI).** Schedule/cadence, enablement, preferred_format, format-% (override vs default vs MISSING_CONFIG), variant gaps — all source-labelled.
- **Slice 3 — Editable Control Tower (DEFERRED, separately gated).** Requires a populated config model + guardrails; out of this sprint.

**Registry read-path decision (must resolve in Slice 0):** the dashboard must **not** assume `docs/creative-library/*.json` is runtime-readable. Decide among: (a) a DB-backed registry view/RPC, (b) a vendored projection imported at build, (c) a small read API. Reading docs JSON from a separate Vercel app is awkward and brushes the runtime-import guard.

## 9. Anti-fabrication guardrails (hard)
- **Every displayed value carries a source label:** `client` / `profile` / `schedule` / `cadence` / `config` / `override` / `registry` / `default` / `hardcoded` / `missing`.
- **Do not display a target percentage as client config unless an `override_share_pct` row exists.** With 0 override rows today, format % must read **"default (platform)"** or **MISSING_CONFIG**, never as an active client setting.
- **Defaults shown only as defaults** (`t.platform_format_mix_default`), explicitly labelled — never promoted to "client config."
- **Planned/registry-only variants must not be shown as enabled/active.**
- **No fabricated example percentages** (the proposal's 50%/70% examples are illustrative only and must not appear as data).
- Avoids the `F-YT-EXPIRY-DISPLAY-FAKE` masking anti-pattern (no plausible-looking values standing in for real state).

## 10. Out of scope
Editing percentages · mutation controls · any new DB model/table/migration · Format Advisor changes · Variant Selector changes · schedule generation changes · Slice C proof work · avatar/video/scene expansion · multi-brand rollout beyond PP · performance learning/auto-optimisation · dashboard Slice C validation visibility until proof lands.

## 11. Recommended directive for Session 3 (dashboard read-only discovery)
> **Session 3 — Client Creative Mix Dashboard v0, Slice 0 discovery (read-only).**
> Work in the **`invegent-dashboard` repo** + CE Supabase **read-only**. Property Pulse only.
> Produce: (1) a grounded **source map** (confirm/extend §4, incl. `m.slot` role and the enablement-authority reconciliation); (2) the **missing-data map** (§5); (3) **exact SQL / server-action plan** for the Evidence view and the Config-Gap Audit, with the **legacy/governed** and **status** predicates from §6 written as concrete queries; (4) the **registry read-path decision** (§8); (5) the **IA placement** read against `docs/dashboard/operator-journey-ia-v1.md` + a `dashboard-ia-lint` pre-check.
> **Rules:** read-only; no UI; no DB mutation; no migration/new tables; no Advisor/Selector/schedule change; no Slice C proof work; no avatar/video/scene; **no fabricated config values**; do not present default/hardcoded values as client config; do not assume docs registry JSON is runtime-readable.
> **First deliverable:** the source map + SQL plan + IA decision — **no dashboard code** until that is reviewed.

---

## Validation
- **Doc-only change** — this single planning file under `docs/briefs/`.
- **No code changes**, no DB/migration/deploy, no dashboard implementation, no Slice C proof work.
- All grounding this session was **read-only** (information_schema + row-count SELECTs + repo grep/glob).
