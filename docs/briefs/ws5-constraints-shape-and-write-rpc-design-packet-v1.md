# WS-5 — Constraints Shape, Governed Write RPCs & Intake Validator — Design Packet (v1)

**Created:** 2026-08-01 Sydney · **Author:** Claude Code orchestrator (WS-5 lane, seed packet
`ws5-constraints-shape-and-kinetic-registration`)
**Lane:** T2 · SIDE_PROVING (dark/additive: function-only DDL, zero data written at apply, zero
consumer wired into production workers) · Phase 1 of the seed packet.
**Status:** `DESIGN_READY — NOT APPLIED`. Everything below is a proposal. **STOP at the PK apply
gate** — no migration, DML, deploy, or register cut is performed by this packet.
**Rev log:** rev-1 (2026-08-01) — `db-rls-auditor` `concerns` (0 must-fix / 4 should-fix, all
applied): C1 widened to `scope <> 'generic'` (brand rows were passing silently) · declared-input
type guards before every cast (no raw 22P02 from the validator) · free-text RPC params bounded +
secret-scanned · migration name minted `_v2` (unused `_v1` retired). Verdict + live evidence:
`docs/briefs/results/ws5-constraints-shape-design-lane-result-v1.md`.
**Governing docs:** `docs/briefs/creatomate-global-ultimate-programme-brief-v1.md` §3 WS-5 (P-7
CLOSED: first consumer = operator template-intake validation) ·
`docs/briefs/creatomate-global-ultimate-strategic-inventory-v1.md` §2.1 ·
`docs/briefs/branch-b-template-capability-contracts.md` §1/§3 (field vocabulary source) ·
`docs/briefs/ws4-pp-yt-kinetic-operator-transposition-package-v1.md` §6/§7/§9/§14 (the named
26-field capture-requirements input).

---

## 0. Non-claims (read first)

- Nothing here is applied. The SQL in §5 is the **proposed** executable; the migration version is
  minted at apply per house precedent (`apply-migration-mints-own-version`), name proposed in §6.
- No new tables, no new columns, no CHECK changes, no grant changes on any existing object, no
  selector (`select_template`) change, no worker change, no Creative Library JSON change. The only
  DDL is `CREATE FUNCTION` × 8 (3 private validators in schema `c`, 5 service-role entry points in
  `public`).
- The TMR-4 appetite columns (`image_slot_min`/`image_slot_max`/`needs_governed_background`/
  `text_overlay_safe_required`) are **not touched** — they are the named cautionary precedent for
  inert declared columns and stay out of scope.
- Phase 2 (registry capture of the kinetic template's 26 field rows) is **BLOCKED** until PK
  returns `{template_name, provider_template_id}` from the Creatomate transposition sitting. This
  packet only makes Phase 2 *possible*.
- No numeric limit is invented. Every number in the worked examples (§4) is carried from the WS-4
  package §9 (itself carried from `ai-worker/index.ts:728`) or marked `to_be_calibrated`.

## 1. Problem statement (evidence)

1. `c.creative_provider_template_field.constraints` jsonb has **zero precedent** — `db-rls-auditor`
   (2026-08-01, live sample of all 144 field rows across every registered template) found it NULL
   everywhere; no tracked migration has ever written it. Same for
   `c.creative_template_platform_suitability.constraints`. (WS-4 package §14, registration items.)
2. The TMR-3 DDL comments both columns "sanitized only (**write-RPC bounds/sanitizes**)" — but the
   write RPC was deferred four times; only `public.record_tmr_proof_event` exists
   (`20260630231747`), and it writes proof events only.
3. The WS-4 kinetic template needs ~26 field rows carrying `modification_key`, `empty_ok`, slot
   membership, collapse behaviour, and text limits — **none of which has a dedicated column**
   (WS-4 §14). Capture cannot proceed until the jsonb shape exists and is governed.
4. House anti-pattern guard (`declared-control-not-consulted`, strategic inventory §2.1): metadata
   must land **with its consumer**. P-7 (CLOSED) names that consumer: **operator template-intake
   validation** at the WS-4 registration step. §3 designs it; §7 proves zero inert fields.

## 2. The constraints shape — `tmr_field_constraints_v1` (per field row)

One jsonb object per `c.creative_provider_template_field` row. **Fail-closed:** unknown top-level
key ⇒ invalid; missing required key ⇒ invalid; every rule below is enforced by
`c.tmr_validate_field_constraints` (§5) — the shape is exactly what the validator accepts, nothing
looser. The shape deliberately does **not** duplicate existing columns (`element_name`,
`element_type`, `field_kind`, `required_for_render`, `dynamic`, `track`).

| Key | Req | Type / vocabulary | Meaning · source |
|---|---|---|---|
| `schema_version` | ✔ | literal `"tmr_field_constraints_v1"` | shape identity; consumer refuses unknown versions |
| `modification_keys` | ✔ | array of strings, each `<element_name>.<suffix>`, suffix ∈ `text·source·fill_color·time·duration·width·height`, no duplicates | the exact **suffixed** template-mode keys the worker may write for this element — cc-0049 resolution + `b1_video_stat.ts` precedent (WS-4 §5b). Prefix MUST equal the row's `element_name` |
| `slot` | ✔ | `{slot_key, activation}`; `slot_key` `^[a-z][a-z0-9_]{0,31}$`; `activation` ∈ `persistent·always·conditional` | scene membership. `persistent` = full-composition chrome/audio (no timing keys allowed); `always` = hook/CTA scene elements; `conditional` = collapsible point-slot elements (WS-4 §6.1–6.4) |
| `content_source` | ✔ | ∈ `ai_authored · worker_computed · template_fixed · governed_asset · brand_profile_colour · render_binding` | who authors the render-time value (WS-4 §6.4: counters are worker-computed, not template-fixed; `render_binding` = optional worker binding that may be empty, e.g. unbound audio) |
| `empty_ok` | ✔ | boolean | may render with empty content (branch-b §1). `render_binding` ⇒ must be `true`; `conditional` text ⇒ must be `true` (collapse guard 2 writes `""`) |
| `text_limits` | text kinds with `content_source ∈ ai_authored/worker_computed`: ✔ · other text: optional · non-text: ✘ forbidden | object; keys ⊆ `max_chars·max_lines·min_font_px`; **`max_chars` mandatory when block present**; each value a **calibration triple** (below) | branch-b §1 field limits under the never-invent discipline |
| `overflow_risk` | required iff `text_limits` present; forbidden otherwise | ∈ `low·medium·high` | branch-b §1; drives the probe checklist (§3 C9) |
| `container` | optional (text only) | `{summary (≤200 chars, req), shared_with?: [element_name…]}` | which region the text lives in; `shared_with` = elements sharing a height/space budget (branch-b B0 scrim lesson) |
| `collapse` | ✔ | `{collapsible: bool, mechanism?: array ⊆ near_zero_duration·empty_text·off_canvas}`; `conditional` ⇒ `collapsible=true` + mechanism non-empty; otherwise `collapsible=false` + mechanism absent | WS-4 §4 three-guard collapse, declared per element so the intake validator can check it |
| `asset` | required iff `content_source ∈ governed_asset/brand_profile_colour`; forbidden otherwise | governed_asset: `{resolver:"resolve_brand_assets", missing_behaviour:"fail_loud", asset_kind?}` · brand_profile_colour: `{profile_column ∈ brand_colour_primary/brand_colour_secondary, fallback_hex?: ^#[0-9A-Fa-f]{6}$}` | asset provenance, fail-loud only (WS-4 §6.1 drops the legacy client-name fallback; house governed-path invariant) |
| `baked` | optional | object ≤10 keys (`^[a-z][a-z0-9_]{0,31}$`), scalar values (string ≤64 / number / bool) | properties fixed at template build, NOT modifiable (e.g. `{"entry_direction":"270"}`, WS-4 §6.3) — surfaced on the probe checklist for transposition verification |
| `notes` | optional | string ≤500 | free text; **display-only** — echoed verbatim into the validator report for the PK gate reading, never a decision input (declared honestly, see §7) |

**The calibration triple** (every numeric limit, uniformly):

```jsonc
{ "value": 60,        // number > 0, or null
  "basis": "declared_from_source",   // declared_from_source | probe_calibrated | to_be_calibrated
  "source": "ai-worker/index.ts:728",// citation — MANDATORY for declared_from_source
  "evidence_reference": null }       // MANDATORY (id/path, non-empty) for probe_calibrated
```

Rules (fail-closed): `to_be_calibrated` ⇒ `value` must be null (a number with no basis cannot
exist); `probe_calibrated` ⇒ `evidence_reference` required; `declared_from_source` ⇒ `source`
citation required. This makes "limits marked to_be_calibrated until probe-calibrated" (P-7 wording)
machine-checkable rather than a string convention in a numeric slot (improving on branch-b §3's
`"max_chars": "to_be_calibrated"` string-in-number form).

Global sanitization (mirrors `record_tmr_proof_event` §6): whole object ≤8 KB; secret-like content
(`token|bearer|api[_-]?key|client[_-]?secret|password|authorization`) rejected.

## 2a. The platform-suitability sibling — `tmr_platform_constraints_v1`

One jsonb object per `c.creative_template_platform_suitability` row. Carries the
**composition-level** contract that is not per-element and has no column home (kinetic's variable
duration cannot live in `creative_provider_template.duration_seconds`, a single numeric). Covered
here because the seed packet names it and the kinetic capture needs it (duration bounds, scene
contract, caption-safe band).

| Key | Req | Type / vocabulary | Meaning · source |
|---|---|---|---|
| `schema_version` | ✔ | literal `"tmr_platform_constraints_v1"` | shape identity |
| `aspect` | ✔ | `{canvas_width: int>0, canvas_height: int>0, ratio: ^\d+:\d+$}` | must agree with the template row's `width`/`height` (validator C8) |
| `safe_zones` | optional | array of `{zone_key, summary (req, ≤200), keep_clear: bool, source?}` | e.g. the caption band y1300–1520 reservation (`video-worker/index.ts:965-973`, WS-4 §14) |
| `scene_contract` | required for `output_type='video'` templates (validator C8); forbidden shape violations otherwise still rejected | `{slots: [slot_key…], min_active_scenes: int, max_active_scenes: int (≥min), collapse_mechanisms: array ⊆ the §2 vocab, source?}` | the fixed-slot design + AI contract range (WS-4 §4, `ai-worker/index.ts:728`) |
| `duration_bounds_s` | optional | `{total_min?: triple, total_max?: triple, per_slot?: {slot_key: {min: triple, max: triple}…}}` | WS-4 §9 widened bounds (total 20–45 s; hook 4–8; point 5–10; cta 3–7), all `declared_from_source` until probe-calibrated |
| `notes` | optional | string ≤500 | display-only, as in §2 |

Same global sanitization + fail-closed unknown-key rule, enforced by
`c.tmr_validate_platform_constraints` (§5).

## 3. First consumer (P-7, DECIDED): `public.validate_tmr_template_intake`

A **read-only** SECDEF function (service-role-only), invoked by the orchestrator at the WS-4
registration step. It mechanically validates a template's captured registry rows against the
specialist's **declared contract** — the four P-7 clauses become checks C2/C3 (element names +
slot contract), C4 (limits marked `to_be_calibrated` until probe-calibrated), C5 (required assets
mapped). It maps to graduation-ladder rungs 2–3 (field-contract compatibility ·
dimensions/duration/output parity) — it **informs** those rungs' evidence; it decides nothing and
elevates no status.

**Input — the declared contract** (`tmr_intake_declared_contract_v1`), authored from the WS-4
package (or any future specialist package):

```jsonc
{
  "contract_version": "tmr_intake_declared_contract_v1",
  "template": { "provider": "creatomate", "scope": "generic",
                "output_type": "video", "width": 1080, "height": 1920 },
  "platforms": [ { "platform": "youtube", "placement": "default" } ],
  "elements": [
    { "element_name": "HookHeadline", "field_kind": "text",
      "required_for_render": true, "constraints": { /* §2 shape */ } },
    …one entry per element (26 for the kinetic template)…
  ]
}
```

**Two modes:**
- `p_template_id IS NULL` → **declared-only mode**: validates the contract itself (shape of every
  element's constraints, key uniqueness, cross-references). Usable **now, in Phase 1**, to
  machine-check the kinetic contract JSON before PK ever opens the Creatomate editor — the
  consumer has a life before any capture exists.
- `p_template_id` given → **capture-check mode**: everything above **plus** comparison against the
  live registry rows.

**Checks** (each hard failure is a structured finding; verdict = `pass` only at zero hard
failures):

| # | Check | Consumes |
|---|---|---|
| C1 | Template row exists; `provider`/`scope`/`output_type`/`width`/`height` equal declared. Additionally, **any** `scope <> 'generic'` (both `client` AND `brand` — the schema CHECK admits three values, the live selector admits only `generic`) raises the dedicated hard finding `scope_not_generic_selector_invisible` (the cc-0089 footgun: a non-generic row is silently never selectable — WS-4 §14; widened from client-only per db-rls-auditor rev-1) | template row + declared.template |
| C2 | Element-name set equality, case-sensitive, both directions → `missing_declared[]` / `unexpected_captured[]` hard findings | `element_name` rows vs declared.elements |
| C3 | Per element: `field_kind` + `required_for_render` equal declared; captured `constraints` non-NULL, shape-valid (§2 re-validated), and **jsonb-equal to declared** (divergence = hard finding with both md5s — capture must mirror the contract; a post-probe calibration re-run passes the *updated* contract) | every §2 key via shape validation + equality; `schema_version` |
| C4 | Calibration discipline: emit `calibration_required[]` = every `{element, limit_key}` whose triple has `basis='to_be_calibrated'` (not a failure at intake; the list is the probe-work queue and blocks *graduation*, not capture). Any number without a valid basis is already a C3 shape failure | `text_limits`, `duration_bounds_s` triples |
| C5 | Required assets mapped: every `governed_asset` element → `required_assets[]` (resolver + fail-loud verified by shape); every `brand_profile_colour` element → profile column named; every `render_binding` element → `optional_bindings[]` (must be `empty_ok=true`) | `content_source`, `asset`, `empty_ok` |
| C6 | Slot contract: `conditional` ⇒ collapse declared with ≥1 mechanism (<3 ⇒ **warning** `collapse_mechanisms_below_recommended`, the WS-4 §4 defense-in-depth idiom); `conditional` text ⇒ `empty_ok=true` (hard) | `slot`, `collapse`, `empty_ok` |
| C7 | Modification-key audit: union of all elements' keys duplicate-free across the template (hard); `persistent` elements carry no `.time`/`.duration` keys and `always`/`conditional` elements carry both (enforced per-element by the §2 shape; re-checked template-wide here) | `modification_keys`, `slot.activation` |
| C8 | Per declared platform: suitability row exists (capture mode) with valid §2a constraints; `aspect` agrees with the template row's `width`/`height` (hard); `output_type='video'` ⇒ `scene_contract` + `duration_bounds_s` present (hard) | §2a: `aspect`, `scene_contract`, `duration_bounds_s`, `safe_zones` (echoed into the probe checklist) |
| C9 | Probe checklist: every text element with `overflow_risk='high'` or any `to_be_calibrated` limit → `probe_checklist[]` entry `{element, container.summary, limits_tbc, baked, notes}` — the operator/probe work list, feeding WS-4 §14's content checks | `overflow_risk`, `container.summary`, `baked`, `notes` |
| C10 | `container.shared_with` references resolve to declared element names (hard if dangling) | `container.shared_with` |

**Output:** `{verdict: pass|fail, mode, hard_failure_count, findings[], warnings[],
calibration_required[], required_assets[], optional_bindings[], probe_checklist[]}` — structured,
suitable for attachment to the capture lane's result doc at the PK gate.

## 4. Worked examples (kinetic template, from the WS-4 package — the named input)

**`HookHeadline`** (text, AI-authored, always-active, high overflow risk — WS-4 §6.2/§9):

```jsonc
{ "schema_version": "tmr_field_constraints_v1",
  "modification_keys": ["HookHeadline.text","HookHeadline.time","HookHeadline.duration"],
  "slot": { "slot_key": "hook", "activation": "always" },
  "content_source": "ai_authored", "empty_ok": false,
  "text_limits": {
    "max_chars": { "value": 60, "basis": "declared_from_source", "source": "ai-worker/index.ts:728", "evidence_reference": null },
    "max_lines": { "value": null, "basis": "to_be_calibrated", "source": null, "evidence_reference": null } },
  "overflow_risk": "high",
  "container": { "summary": "960x700 fixed box at x60 y560 (WS-4 §9: probe sweep 40/50/60 chars)" },
  "collapse": { "collapsible": false } }
```

**`Point3Headline`** (text, AI-authored, conditional/collapsible — WS-4 §4/§6.3):

```jsonc
{ "schema_version": "tmr_field_constraints_v1",
  "modification_keys": ["Point3Headline.text","Point3Headline.time","Point3Headline.duration"],
  "slot": { "slot_key": "point3", "activation": "conditional" },
  "content_source": "ai_authored", "empty_ok": true,
  "text_limits": {
    "max_chars": { "value": 55, "basis": "declared_from_source", "source": "ai-worker/index.ts:728", "evidence_reference": null },
    "max_lines": { "value": null, "basis": "to_be_calibrated", "source": null, "evidence_reference": null } },
  "overflow_risk": "medium",
  "container": { "summary": "880px wide column x100 y480; divider at y870", "shared_with": ["Point3Body"] },
  "collapse": { "collapsible": true, "mechanism": ["near_zero_duration","empty_text","off_canvas"] } }
```

**`Logo`** (governed asset, persistent chrome, fail-loud — WS-4 §6.1):

```jsonc
{ "schema_version": "tmr_field_constraints_v1",
  "modification_keys": ["Logo.source"],
  "slot": { "slot_key": "chrome", "activation": "persistent" },
  "content_source": "governed_asset", "empty_ok": false,
  "collapse": { "collapsible": false },
  "asset": { "resolver": "resolve_brand_assets", "missing_behaviour": "fail_loud", "asset_kind": "logo" },
  "notes": "Deliberately drops the legacy client-name-text fallback (WS-4 §6.1)" }
```

**`Background`** (brand-colour shape, persistent — WS-4 §6.1/§10):

```jsonc
{ "schema_version": "tmr_field_constraints_v1",
  "modification_keys": ["Background.fill_color"],
  "slot": { "slot_key": "chrome", "activation": "persistent" },
  "content_source": "brand_profile_colour", "empty_ok": false,
  "collapse": { "collapsible": false },
  "asset": { "profile_column": "brand_colour_primary", "fallback_hex": "#0A2A4A" } }
```

**`VoiceAudio`** (optional render binding, silent-capable — WS-4 §6.5/§11):

```jsonc
{ "schema_version": "tmr_field_constraints_v1",
  "modification_keys": ["VoiceAudio.source"],
  "slot": { "slot_key": "audio", "activation": "persistent" },
  "content_source": "render_binding", "empty_ok": true,
  "collapse": { "collapsible": false },
  "notes": "source:'' renders silent (creatomate-api-gotchas); v1 mission unbound per WS-4 §11" }
```

**Platform suitability** (`youtube`/`default`, §2a):

```jsonc
{ "schema_version": "tmr_platform_constraints_v1",
  "aspect": { "canvas_width": 1080, "canvas_height": 1920, "ratio": "9:16" },
  "safe_zones": [ { "zone_key": "caption_band", "summary": "y1300-1520 reserved clear for future voice/caption variant",
                    "keep_clear": true, "source": "video-worker/index.ts:965-973" } ],
  "scene_contract": { "slots": ["hook","point1","point2","point3","cta"],
                      "min_active_scenes": 3, "max_active_scenes": 5,
                      "collapse_mechanisms": ["near_zero_duration","empty_text","off_canvas"],
                      "source": "ai-worker/index.ts:728 via WS-4 §4" },
  "duration_bounds_s": {
    "total_min": { "value": 20, "basis": "declared_from_source", "source": "WS-4 §9 (widened from ai contract 25-40s)", "evidence_reference": null },
    "total_max": { "value": 45, "basis": "declared_from_source", "source": "WS-4 §9", "evidence_reference": null },
    "per_slot": {
      "hook":  { "min": { "value": 4, "basis": "declared_from_source", "source": "WS-4 §9", "evidence_reference": null },
                 "max": { "value": 8, "basis": "declared_from_source", "source": "WS-4 §9", "evidence_reference": null } },
      "point": { "min": { "value": 5, "basis": "declared_from_source", "source": "WS-4 §9", "evidence_reference": null },
                 "max": { "value": 10, "basis": "declared_from_source", "source": "WS-4 §9", "evidence_reference": null } },
      "cta":   { "min": { "value": 3, "basis": "declared_from_source", "source": "WS-4 §9", "evidence_reference": null },
                 "max": { "value": 7, "basis": "declared_from_source", "source": "WS-4 §9", "evidence_reference": null } } } } }
```

## 5. Proposed executable SQL (the migration body — NOT APPLIED)

Conventions carried from `record_tmr_proof_event` (`20260630231747`): `SECURITY DEFINER` +
`set search_path = ''` on every `public` entry point; jsonb error returns (never exceptions for
validation failures); mandatory `REVOKE … FROM public, anon, authenticated` (Supabase default ACL
auto-grants EXECUTE on new functions); service-role-only `GRANT`. Insert paths are **insert-only**
(no upsert/`ON CONFLICT` — unique-violation caught and returned as an error). Updates are **CAS**
(`p_expected_current_md5`), fail-closed. The whole body runs in ONE transaction via a single
`apply_migration` (or single byte-identical `execute_sql`) call — the named single-call channel.

```sql
-- Migration: tmr5_field_constraints_write_rpcs_and_intake_validator_v2
-- (the _v1 name was retired UNUSED at design-review rev-1 — never frozen, never applied;
--  recorded so that name is never reused with different SQL, per migration-name permanence)
-- WS-5 Phase 1: constraints jsonb shape (tmr_field_constraints_v1 / tmr_platform_constraints_v1),
-- governed write RPCs for c.creative_provider_template_field / c.creative_template_platform_suitability,
-- and the P-7 first consumer public.validate_tmr_template_intake.
-- Function-only DDL. No table/column/grant change on existing objects. No data written at apply.
-- ⛔ APPLY IS PK-GATED. Prepared, NOT applied.

begin;

-- ── 0. Fail-closed precondition: nothing may pre-exist (fresh v1; a rerun fails loud) ──
do $do$
begin
  if to_regprocedure('c.tmr_validate_limit_triple(jsonb)') is not null
     or to_regprocedure('c.tmr_validate_field_constraints(text,text,jsonb)') is not null
     or to_regprocedure('c.tmr_validate_platform_constraints(jsonb)') is not null
     or to_regprocedure('public.record_tmr_template_field(uuid,text,text,text,boolean,jsonb,text,text,boolean,text,text,text)') is not null
     or to_regprocedure('public.set_tmr_field_constraints(uuid,text,jsonb,text,text,text)') is not null
     or to_regprocedure('public.record_tmr_platform_suitability(uuid,text,jsonb,text,text,text,text)') is not null
     or to_regprocedure('public.set_tmr_platform_constraints(uuid,text,text,jsonb,text,text)') is not null
     or to_regprocedure('public.validate_tmr_template_intake(uuid,jsonb)') is not null then
    raise exception 'tmr5_abort_function_already_exists';
  end if;
end
$do$;

-- ── 1. c.tmr_validate_limit_triple — the calibration-triple rule (§2) ──────────────────
create function c.tmr_validate_limit_triple(p jsonb)
returns text language plpgsql immutable set search_path = '' as $$
declare k text;
begin
  if p is null or jsonb_typeof(p) <> 'object' then return 'limit_not_object'; end if;
  for k in select jsonb_object_keys(p) loop
    if k not in ('value','basis','source','evidence_reference') then
      return 'limit_unknown_key:' || k;
    end if;
  end loop;
  if not (p ? 'value') or not (p ? 'basis') then return 'limit_missing_value_or_basis'; end if;
  if jsonb_typeof(p->'basis') <> 'string'
     or p->>'basis' not in ('declared_from_source','probe_calibrated','to_be_calibrated') then
    return 'limit_invalid_basis';
  end if;
  if p->>'basis' = 'to_be_calibrated' then
    if jsonb_typeof(p->'value') <> 'null' then return 'limit_tbc_must_have_null_value'; end if;
  else
    if jsonb_typeof(p->'value') <> 'number' then return 'limit_value_must_be_number'; end if;
    if (p->>'value')::numeric <= 0 then return 'limit_value_must_be_positive'; end if;
  end if;
  if p->>'basis' = 'probe_calibrated'
     and (jsonb_typeof(p->'evidence_reference') is distinct from 'string'
          or btrim(coalesce(p->>'evidence_reference','')) = '') then
    return 'limit_probe_calibrated_requires_evidence';
  end if;
  if p->>'basis' = 'declared_from_source'
     and (jsonb_typeof(p->'source') is distinct from 'string'
          or btrim(coalesce(p->>'source','')) = '') then
    return 'limit_declared_requires_source_citation';
  end if;
  return null;
end $$;

-- ── 2. c.tmr_validate_field_constraints — the §2 shape, fail-closed ────────────────────
create function c.tmr_validate_field_constraints(
  p_element_name text, p_field_kind text, p jsonb)
returns text language plpgsql immutable set search_path = '' as $$
declare
  k text; mk text; err text; v_act text; v_src text; n int;
begin
  -- element name gate FIRST (it is interpolated into a regex below; alnum+underscore only)
  if p_element_name is null or p_element_name !~ '^[A-Za-z][A-Za-z0-9_]{0,63}$' then
    return 'invalid_element_name';
  end if;
  if p is null or jsonb_typeof(p) <> 'object' then return 'constraints_not_object'; end if;
  if length(p::text) > 8192 then return 'constraints_too_large'; end if;
  if p::text ~* '(access[_-]?token|refresh[_-]?token|bearer|api[_-]?key|client[_-]?secret|password|authorization)' then
    return 'constraints_secret_like_content_rejected';
  end if;
  if p->>'schema_version' is distinct from 'tmr_field_constraints_v1' then
    return 'constraints_wrong_schema_version';
  end if;
  for k in select jsonb_object_keys(p) loop
    if k not in ('schema_version','modification_keys','slot','content_source','empty_ok',
                 'text_limits','overflow_risk','container','collapse','asset','baked','notes') then
      return 'constraints_unknown_key:' || k;
    end if;
  end loop;

  -- modification_keys: required array of unique, prefixed, suffix-vocab keys
  if jsonb_typeof(p->'modification_keys') is distinct from 'array' then
    return 'modification_keys_required_array';
  end if;
  for mk in select jsonb_array_elements_text(p->'modification_keys') loop
    if mk !~ ('^' || p_element_name || '\.(text|source|fill_color|time|duration|width|height)$') then
      return 'modification_key_invalid:' || mk;
    end if;
  end loop;
  select count(*) - count(distinct x) into n
    from jsonb_array_elements_text(p->'modification_keys') t(x);
  if n > 0 then return 'modification_keys_duplicate'; end if;

  -- slot
  if jsonb_typeof(p->'slot') is distinct from 'object' then return 'slot_required_object'; end if;
  for k in select jsonb_object_keys(p->'slot') loop
    if k not in ('slot_key','activation') then return 'slot_unknown_key:' || k; end if;
  end loop;
  if (p->'slot'->>'slot_key') is null or (p->'slot'->>'slot_key') !~ '^[a-z][a-z0-9_]{0,31}$' then
    return 'slot_key_invalid';
  end if;
  v_act := p->'slot'->>'activation';
  if v_act is null or v_act not in ('persistent','always','conditional') then
    return 'slot_activation_invalid';
  end if;
  if v_act = 'persistent' then
    if exists (select 1 from jsonb_array_elements_text(p->'modification_keys') t(x)
               where x ~ '\.(time|duration)$') then
      return 'persistent_element_must_not_carry_timing_keys';
    end if;
  else
    if not (p->'modification_keys' ? (p_element_name || '.time'))
       or not (p->'modification_keys' ? (p_element_name || '.duration')) then
      return 'scene_element_missing_timing_keys';
    end if;
  end if;

  -- content_source + empty_ok
  v_src := p->>'content_source';
  if v_src is null or v_src not in
     ('ai_authored','worker_computed','template_fixed','governed_asset','brand_profile_colour','render_binding') then
    return 'content_source_invalid';
  end if;
  if jsonb_typeof(p->'empty_ok') is distinct from 'boolean' then return 'empty_ok_required_boolean'; end if;
  if v_src = 'render_binding' and not (p->'empty_ok')::boolean then
    return 'render_binding_requires_empty_ok';
  end if;

  -- text_limits / overflow_risk (kind- and source-conditional)
  if p_field_kind = 'text' then
    if v_src in ('ai_authored','worker_computed') and jsonb_typeof(p->'text_limits') is distinct from 'object' then
      return 'text_limits_required_for_authored_text';
    end if;
  else
    if p ? 'text_limits' then return 'text_limits_only_for_text'; end if;
    if p ? 'overflow_risk' then return 'overflow_risk_only_for_text'; end if;
    if p ? 'container' then return 'container_only_for_text'; end if;
  end if;
  if p ? 'text_limits' then
    if jsonb_typeof(p->'text_limits') <> 'object' then return 'text_limits_not_object'; end if;
    for k in select jsonb_object_keys(p->'text_limits') loop
      if k not in ('max_chars','max_lines','min_font_px') then
        return 'text_limits_unknown_key:' || k;
      end if;
      err := c.tmr_validate_limit_triple(p->'text_limits'->k);
      if err is not null then return 'text_limits.' || k || ':' || err; end if;
    end loop;
    if not (p->'text_limits' ? 'max_chars') then return 'text_limits_max_chars_required'; end if;
    if p->>'overflow_risk' is null or p->>'overflow_risk' not in ('low','medium','high') then
      return 'overflow_risk_required_with_text_limits';
    end if;
  elsif p ? 'overflow_risk' then
    return 'overflow_risk_requires_text_limits';
  end if;

  -- container (optional, text only — non-text rejected above)
  if p ? 'container' then
    if jsonb_typeof(p->'container') <> 'object' then return 'container_not_object'; end if;
    for k in select jsonb_object_keys(p->'container') loop
      if k not in ('summary','shared_with') then return 'container_unknown_key:' || k; end if;
    end loop;
    if jsonb_typeof(p->'container'->'summary') is distinct from 'string'
       or btrim(coalesce(p->'container'->>'summary','')) = ''
       or length(p->'container'->>'summary') > 200 then
      return 'container_summary_invalid';
    end if;
    if p->'container' ? 'shared_with' then
      if jsonb_typeof(p->'container'->'shared_with') <> 'array' then return 'shared_with_not_array'; end if;
      for mk in select jsonb_array_elements_text(p->'container'->'shared_with') loop
        if mk !~ '^[A-Za-z][A-Za-z0-9_]{0,63}$' then return 'shared_with_invalid_name:' || mk; end if;
      end loop;
    end if;
  end if;

  -- collapse (required; conditional ⇒ collapsible + mechanisms)
  if jsonb_typeof(p->'collapse') is distinct from 'object' then return 'collapse_required_object'; end if;
  for k in select jsonb_object_keys(p->'collapse') loop
    if k not in ('collapsible','mechanism') then return 'collapse_unknown_key:' || k; end if;
  end loop;
  if jsonb_typeof(p->'collapse'->'collapsible') is distinct from 'boolean' then
    return 'collapsible_required_boolean';
  end if;
  if v_act = 'conditional' then
    if not (p->'collapse'->'collapsible')::boolean then return 'conditional_slot_must_be_collapsible'; end if;
    if jsonb_typeof(p->'collapse'->'mechanism') is distinct from 'array'
       or jsonb_array_length(p->'collapse'->'mechanism') = 0 then
      return 'conditional_slot_requires_collapse_mechanism';
    end if;
    for mk in select jsonb_array_elements_text(p->'collapse'->'mechanism') loop
      if mk not in ('near_zero_duration','empty_text','off_canvas') then
        return 'collapse_mechanism_invalid:' || mk;
      end if;
    end loop;
    if p_field_kind = 'text' and not (p->'empty_ok')::boolean then
      return 'conditional_text_must_be_empty_ok';
    end if;
  else
    if (p->'collapse'->'collapsible')::boolean then return 'non_conditional_slot_must_not_be_collapsible'; end if;
    if p->'collapse' ? 'mechanism' then return 'collapse_mechanism_only_for_conditional'; end if;
  end if;

  -- asset (required iff governed_asset / brand_profile_colour; forbidden otherwise)
  if v_src in ('governed_asset','brand_profile_colour') then
    if jsonb_typeof(p->'asset') is distinct from 'object' then return 'asset_required_object'; end if;
    if v_src = 'governed_asset' then
      for k in select jsonb_object_keys(p->'asset') loop
        if k not in ('resolver','missing_behaviour','asset_kind') then return 'asset_unknown_key:' || k; end if;
      end loop;
      if p->'asset'->>'resolver' is distinct from 'resolve_brand_assets' then return 'asset_resolver_invalid'; end if;
      if p->'asset'->>'missing_behaviour' is distinct from 'fail_loud' then return 'asset_missing_behaviour_must_be_fail_loud'; end if;
      if (p->'asset' ? 'asset_kind') and (p->'asset'->>'asset_kind') !~ '^[a-z][a-z0-9_]{0,31}$' then
        return 'asset_kind_invalid';
      end if;
    else
      for k in select jsonb_object_keys(p->'asset') loop
        if k not in ('profile_column','fallback_hex') then return 'asset_unknown_key:' || k; end if;
      end loop;
      if p->'asset'->>'profile_column' is null
         or p->'asset'->>'profile_column' not in ('brand_colour_primary','brand_colour_secondary') then
        return 'asset_profile_column_invalid';
      end if;
      if (p->'asset' ? 'fallback_hex') and (p->'asset'->>'fallback_hex') !~ '^#[0-9A-Fa-f]{6}$' then
        return 'asset_fallback_hex_invalid';
      end if;
    end if;
  else
    if p ? 'asset' then return 'asset_only_for_asset_sources'; end if;
  end if;

  -- baked (optional; bounded scalar map)
  if p ? 'baked' then
    if jsonb_typeof(p->'baked') <> 'object' then return 'baked_not_object'; end if;
    select count(*) into n from jsonb_object_keys(p->'baked');
    if n > 10 then return 'baked_too_many_keys'; end if;
    for k in select jsonb_object_keys(p->'baked') loop
      if k !~ '^[a-z][a-z0-9_]{0,31}$' then return 'baked_key_invalid:' || k; end if;
      if jsonb_typeof(p->'baked'->k) not in ('string','number','boolean') then
        return 'baked_value_must_be_scalar:' || k;
      end if;
      if jsonb_typeof(p->'baked'->k) = 'string' and length(p->'baked'->>k) > 64 then
        return 'baked_value_too_long:' || k;
      end if;
    end loop;
  end if;

  -- notes (optional; display-only)
  if p ? 'notes' then
    if jsonb_typeof(p->'notes') <> 'string' or length(p->>'notes') > 500 then
      return 'notes_invalid';
    end if;
  end if;

  return null;
end $$;

-- ── 3. c.tmr_validate_platform_constraints — the §2a shape, fail-closed ────────────────
create function c.tmr_validate_platform_constraints(p jsonb)
returns text language plpgsql immutable set search_path = '' as $$
declare k text; k2 text; mk text; err text; n int; v_min int; v_max int;
begin
  if p is null or jsonb_typeof(p) <> 'object' then return 'constraints_not_object'; end if;
  if length(p::text) > 8192 then return 'constraints_too_large'; end if;
  if p::text ~* '(access[_-]?token|refresh[_-]?token|bearer|api[_-]?key|client[_-]?secret|password|authorization)' then
    return 'constraints_secret_like_content_rejected';
  end if;
  if p->>'schema_version' is distinct from 'tmr_platform_constraints_v1' then
    return 'constraints_wrong_schema_version';
  end if;
  for k in select jsonb_object_keys(p) loop
    if k not in ('schema_version','aspect','safe_zones','scene_contract','duration_bounds_s','notes') then
      return 'constraints_unknown_key:' || k;
    end if;
  end loop;

  -- aspect (required)
  if jsonb_typeof(p->'aspect') is distinct from 'object' then return 'aspect_required_object'; end if;
  for k in select jsonb_object_keys(p->'aspect') loop
    if k not in ('canvas_width','canvas_height','ratio') then return 'aspect_unknown_key:' || k; end if;
  end loop;
  if jsonb_typeof(p->'aspect'->'canvas_width') is distinct from 'number'
     or jsonb_typeof(p->'aspect'->'canvas_height') is distinct from 'number'
     or (p->'aspect'->>'canvas_width')::numeric <= 0
     or (p->'aspect'->>'canvas_height')::numeric <= 0 then
    return 'aspect_canvas_invalid';
  end if;
  if (p->'aspect'->>'ratio') is null or (p->'aspect'->>'ratio') !~ '^\d+:\d+$' then
    return 'aspect_ratio_invalid';
  end if;

  -- safe_zones (optional)
  if p ? 'safe_zones' then
    if jsonb_typeof(p->'safe_zones') <> 'array' then return 'safe_zones_not_array'; end if;
    for n in 0 .. jsonb_array_length(p->'safe_zones') - 1 loop
      if jsonb_typeof(p->'safe_zones'->n) <> 'object' then return 'safe_zone_not_object'; end if;
      for k in select jsonb_object_keys(p->'safe_zones'->n) loop
        if k not in ('zone_key','summary','keep_clear','source') then
          return 'safe_zone_unknown_key:' || k;
        end if;
      end loop;
      if (p->'safe_zones'->n->>'zone_key') is null
         or (p->'safe_zones'->n->>'zone_key') !~ '^[a-z][a-z0-9_]{0,31}$' then
        return 'safe_zone_key_invalid';
      end if;
      if jsonb_typeof(p->'safe_zones'->n->'summary') is distinct from 'string'
         or btrim(coalesce(p->'safe_zones'->n->>'summary','')) = ''
         or length(p->'safe_zones'->n->>'summary') > 200 then
        return 'safe_zone_summary_invalid';
      end if;
      if jsonb_typeof(p->'safe_zones'->n->'keep_clear') is distinct from 'boolean' then
        return 'safe_zone_keep_clear_required_boolean';
      end if;
    end loop;
  end if;

  -- scene_contract (optional at shape level; C8 requires it for video templates)
  if p ? 'scene_contract' then
    if jsonb_typeof(p->'scene_contract') <> 'object' then return 'scene_contract_not_object'; end if;
    for k in select jsonb_object_keys(p->'scene_contract') loop
      if k not in ('slots','min_active_scenes','max_active_scenes','collapse_mechanisms','source') then
        return 'scene_contract_unknown_key:' || k;
      end if;
    end loop;
    if jsonb_typeof(p->'scene_contract'->'slots') is distinct from 'array'
       or jsonb_array_length(p->'scene_contract'->'slots') = 0 then
      return 'scene_contract_slots_required';
    end if;
    for mk in select jsonb_array_elements_text(p->'scene_contract'->'slots') loop
      if mk !~ '^[a-z][a-z0-9_]{0,31}$' then return 'scene_contract_slot_invalid:' || mk; end if;
    end loop;
    if jsonb_typeof(p->'scene_contract'->'min_active_scenes') is distinct from 'number'
       or jsonb_typeof(p->'scene_contract'->'max_active_scenes') is distinct from 'number' then
      return 'scene_contract_range_required';
    end if;
    v_min := (p->'scene_contract'->>'min_active_scenes')::int;
    v_max := (p->'scene_contract'->>'max_active_scenes')::int;
    if v_min < 1 or v_max < v_min or v_max > 10 then return 'scene_contract_range_invalid'; end if;
    if p->'scene_contract' ? 'collapse_mechanisms' then
      if jsonb_typeof(p->'scene_contract'->'collapse_mechanisms') <> 'array' then
        return 'scene_contract_mechanisms_not_array';
      end if;
      for mk in select jsonb_array_elements_text(p->'scene_contract'->'collapse_mechanisms') loop
        if mk not in ('near_zero_duration','empty_text','off_canvas') then
          return 'scene_contract_mechanism_invalid:' || mk;
        end if;
      end loop;
    end if;
  end if;

  -- duration_bounds_s (optional)
  if p ? 'duration_bounds_s' then
    if jsonb_typeof(p->'duration_bounds_s') <> 'object' then return 'duration_bounds_not_object'; end if;
    for k in select jsonb_object_keys(p->'duration_bounds_s') loop
      if k not in ('total_min','total_max','per_slot') then return 'duration_bounds_unknown_key:' || k; end if;
      if k in ('total_min','total_max') then
        err := c.tmr_validate_limit_triple(p->'duration_bounds_s'->k);
        if err is not null then return 'duration_bounds.' || k || ':' || err; end if;
      end if;
    end loop;
    if p->'duration_bounds_s' ? 'per_slot' then
      if jsonb_typeof(p->'duration_bounds_s'->'per_slot') <> 'object' then
        return 'per_slot_not_object';
      end if;
      for k in select jsonb_object_keys(p->'duration_bounds_s'->'per_slot') loop
        if k !~ '^[a-z][a-z0-9_]{0,31}$' then return 'per_slot_key_invalid:' || k; end if;
        if jsonb_typeof(p->'duration_bounds_s'->'per_slot'->k) <> 'object' then
          return 'per_slot_entry_not_object:' || k;
        end if;
        for k2 in select jsonb_object_keys(p->'duration_bounds_s'->'per_slot'->k) loop
          if k2 not in ('min','max') then return 'per_slot_entry_unknown_key:' || k2; end if;
          err := c.tmr_validate_limit_triple(p->'duration_bounds_s'->'per_slot'->k->k2);
          if err is not null then return 'per_slot.' || k || '.' || k2 || ':' || err; end if;
        end loop;
      end loop;
    end if;
  end if;

  -- notes
  if p ? 'notes' then
    if jsonb_typeof(p->'notes') <> 'string' or length(p->>'notes') > 500 then
      return 'notes_invalid';
    end if;
  end if;

  return null;
end $$;

-- ── 4. public.record_tmr_template_field — governed INSERT-ONLY field capture ───────────
create function public.record_tmr_template_field(
  p_template_id         uuid,
  p_element_name        text,
  p_element_type        text,
  p_field_kind          text,
  p_required_for_render boolean,
  p_constraints         jsonb,
  p_element_id          text default null,
  p_track               text default null,
  p_dynamic             boolean default true,
  p_default_value_safe  text default null,
  p_style_summary       text default null,
  p_recorded_by         text default null
) returns jsonb
  language plpgsql volatile security definer set search_path = ''
as $$
declare
  v_tid uuid; v_err text; v_new uuid;
begin
  select id into v_tid from c.creative_provider_template where id = p_template_id;
  if v_tid is null then
    return jsonb_build_object('error','template_not_found','template_id',p_template_id);
  end if;
  if p_element_name is null or p_element_name !~ '^[A-Za-z][A-Za-z0-9_]{0,63}$' then
    return jsonb_build_object('error','invalid_element_name','element_name',p_element_name);
  end if;
  if p_field_kind is null or p_field_kind not in
     ('text','image','logo','background','shape','audio','video') then
    return jsonb_build_object('error','invalid_field_kind','field_kind',p_field_kind);
    -- 'unknown' is in the column CHECK but deliberately NOT capturable through this RPC:
    -- a governed capture must know what it is capturing.
  end if;
  if p_required_for_render is null then
    return jsonb_build_object('error','required_for_render_must_be_explicit');
  end if;
  -- free-text params: bounded + secret-scanned (record_tmr_proof_event sanitization precedent)
  if length(coalesce(p_element_type,'')) > 64 or length(coalesce(p_element_id,'')) > 128
     or length(coalesce(p_track,'')) > 64 or length(coalesce(p_default_value_safe,'')) > 500
     or length(coalesce(p_style_summary,'')) > 500 or length(coalesce(p_recorded_by,'')) > 128 then
    return jsonb_build_object('error','free_text_param_too_long');
  end if;
  if (coalesce(p_default_value_safe,'') || ' ' || coalesce(p_style_summary,''))
     ~* '(access[_-]?token|refresh[_-]?token|bearer|api[_-]?key|client[_-]?secret|password|authorization)' then
    return jsonb_build_object('error','secret_like_param_rejected');
  end if;
  if p_constraints is null then
    return jsonb_build_object('error','constraints_required');
  end if;
  v_err := c.tmr_validate_field_constraints(p_element_name, p_field_kind, p_constraints);
  if v_err is not null then
    return jsonb_build_object('error','constraints_invalid','detail',v_err);
  end if;
  begin
    insert into c.creative_provider_template_field
      (template_id, element_id, element_name, element_type, track, dynamic, field_kind,
       default_value_safe, style_summary, constraints, required_for_render)
    values
      (v_tid, p_element_id, p_element_name, p_element_type, p_track, p_dynamic, p_field_kind,
       p_default_value_safe, p_style_summary, p_constraints, p_required_for_render)
    returning id into v_new;
  exception when unique_violation then
    return jsonb_build_object('error','field_already_exists','element_name',p_element_name);
  end;
  return jsonb_build_object('ok',true,'field_id',v_new,'element_name',p_element_name,
                            'constraints_md5',md5(p_constraints::text),'recorded_by',p_recorded_by);
end $$;

-- ── 5. public.set_tmr_field_constraints — CAS UPDATE (legacy-row population + probe calibration) ──
create function public.set_tmr_field_constraints(
  p_template_id          uuid,
  p_element_name         text,
  p_constraints          jsonb,
  p_expected_current_md5 text default null,   -- null ⇒ current constraints MUST be NULL (first write)
  p_field_kind           text default null,   -- optional backfill when the legacy row's kind is NULL
  p_recorded_by          text default null
) returns jsonb
  language plpgsql volatile security definer set search_path = ''
as $$
declare
  v_row record; v_err text; v_cur_md5 text; v_kind text;
begin
  select f.id, f.field_kind, f.constraints into v_row
    from c.creative_provider_template_field f
   where f.template_id = p_template_id and f.element_name = p_element_name
   for update;
  if not found then
    return jsonb_build_object('error','field_not_found','element_name',p_element_name);
  end if;
  if length(coalesce(p_recorded_by,'')) > 128 then
    return jsonb_build_object('error','free_text_param_too_long');
  end if;
  if p_constraints is null then
    return jsonb_build_object('error','constraints_required');
  end if;
  -- field_kind resolution: never silently retype
  if v_row.field_kind is null then
    if p_field_kind is null then
      return jsonb_build_object('error','field_kind_missing_supply_p_field_kind');
    end if;
    if p_field_kind not in ('text','image','logo','background','shape','audio','video') then
      return jsonb_build_object('error','invalid_field_kind','field_kind',p_field_kind);
    end if;
    v_kind := p_field_kind;
  else
    if p_field_kind is not null and p_field_kind is distinct from v_row.field_kind then
      return jsonb_build_object('error','field_kind_mismatch','current',v_row.field_kind,'supplied',p_field_kind);
    end if;
    v_kind := v_row.field_kind;
  end if;
  v_err := c.tmr_validate_field_constraints(p_element_name, v_kind, p_constraints);
  if v_err is not null then
    return jsonb_build_object('error','constraints_invalid','detail',v_err);
  end if;
  -- CAS, fail-closed
  if v_row.constraints is null then
    if p_expected_current_md5 is not null then
      return jsonb_build_object('error','cas_expected_value_but_current_null');
    end if;
  else
    v_cur_md5 := md5(v_row.constraints::text);
    if p_expected_current_md5 is null or p_expected_current_md5 <> v_cur_md5 then
      return jsonb_build_object('error','cas_mismatch','current_md5',v_cur_md5);
    end if;
  end if;
  update c.creative_provider_template_field
     set constraints = p_constraints,
         field_kind  = v_kind
   where id = v_row.id;
  return jsonb_build_object('ok',true,'field_id',v_row.id,
                            'previous_md5',v_cur_md5,'new_md5',md5(p_constraints::text),
                            'recorded_by',p_recorded_by);
end $$;

-- ── 6. public.record_tmr_platform_suitability — governed INSERT-ONLY, no status elevation ──
create function public.record_tmr_platform_suitability(
  p_template_id        uuid,
  p_platform           text,
  p_constraints        jsonb,
  p_placement          text default 'default',
  p_suitability_status text default 'candidate',
  p_reason             text default null,
  p_recorded_by        text default null
) returns jsonb
  language plpgsql volatile security definer set search_path = ''
as $$
declare
  v_tid uuid; v_err text; v_new uuid;
begin
  select id into v_tid from c.creative_provider_template where id = p_template_id;
  if v_tid is null then
    return jsonb_build_object('error','template_not_found','template_id',p_template_id);
  end if;
  if p_platform is null or p_platform not in
     ('facebook','instagram','linkedin','youtube','wordpress') then
    return jsonb_build_object('error','invalid_platform','platform',p_platform);
  end if;
  if p_placement is null or p_placement !~ '^[a-z][a-z0-9_]{0,31}$' then
    return jsonb_build_object('error','invalid_placement','placement',p_placement);
  end if;
  -- proof-adjacent statuses (platform_safe / production_proven / blocked) are NOT writable here:
  -- suitability elevation is a separate governed act, mirroring record_tmr_proof_event's
  -- "no status elevation" rule.
  if p_suitability_status is null or p_suitability_status not in
     ('unknown','candidate','not_suitable','needs_review') then
    return jsonb_build_object('error','suitability_status_not_writable','status',p_suitability_status);
  end if;
  if length(coalesce(p_reason,'')) > 500 or length(coalesce(p_recorded_by,'')) > 128 then
    return jsonb_build_object('error','free_text_param_too_long');
  end if;
  if coalesce(p_reason,'')
     ~* '(access[_-]?token|refresh[_-]?token|bearer|api[_-]?key|client[_-]?secret|password|authorization)' then
    return jsonb_build_object('error','secret_like_param_rejected');
  end if;
  if p_constraints is null then
    return jsonb_build_object('error','constraints_required');
  end if;
  v_err := c.tmr_validate_platform_constraints(p_constraints);
  if v_err is not null then
    return jsonb_build_object('error','constraints_invalid','detail',v_err);
  end if;
  begin
    insert into c.creative_template_platform_suitability
      (template_id, platform, placement, suitability_status, reason, constraints, last_reviewed_at)
    values
      (v_tid, p_platform, p_placement, p_suitability_status, p_reason, p_constraints, now())
    returning id into v_new;
  exception when unique_violation then
    return jsonb_build_object('error','suitability_row_already_exists',
                              'platform',p_platform,'placement',p_placement);
  end;
  return jsonb_build_object('ok',true,'suitability_id',v_new,'platform',p_platform,
                            'constraints_md5',md5(p_constraints::text),'recorded_by',p_recorded_by);
end $$;

-- ── 7. public.set_tmr_platform_constraints — CAS UPDATE (probe calibration of duration bounds) ──
create function public.set_tmr_platform_constraints(
  p_template_id          uuid,
  p_platform             text,
  p_placement            text,
  p_constraints          jsonb,
  p_expected_current_md5 text default null,
  p_recorded_by          text default null
) returns jsonb
  language plpgsql volatile security definer set search_path = ''
as $$
declare
  v_row record; v_err text; v_cur_md5 text;
begin
  select s.id, s.constraints into v_row
    from c.creative_template_platform_suitability s
   where s.template_id = p_template_id and s.platform = p_platform and s.placement = p_placement
   for update;
  if not found then
    return jsonb_build_object('error','suitability_row_not_found','platform',p_platform,'placement',p_placement);
  end if;
  if length(coalesce(p_recorded_by,'')) > 128 then
    return jsonb_build_object('error','free_text_param_too_long');
  end if;
  if p_constraints is null then
    return jsonb_build_object('error','constraints_required');
  end if;
  v_err := c.tmr_validate_platform_constraints(p_constraints);
  if v_err is not null then
    return jsonb_build_object('error','constraints_invalid','detail',v_err);
  end if;
  if v_row.constraints is null then
    if p_expected_current_md5 is not null then
      return jsonb_build_object('error','cas_expected_value_but_current_null');
    end if;
  else
    v_cur_md5 := md5(v_row.constraints::text);
    if p_expected_current_md5 is null or p_expected_current_md5 <> v_cur_md5 then
      return jsonb_build_object('error','cas_mismatch','current_md5',v_cur_md5);
    end if;
  end if;
  update c.creative_template_platform_suitability
     set constraints = p_constraints, updated_at = now(), last_reviewed_at = now()
   where id = v_row.id;
  return jsonb_build_object('ok',true,'suitability_id',v_row.id,
                            'previous_md5',v_cur_md5,'new_md5',md5(p_constraints::text),
                            'recorded_by',p_recorded_by);
end $$;

-- ── 8. public.validate_tmr_template_intake — the P-7 FIRST CONSUMER (read-only) ────────
create function public.validate_tmr_template_intake(
  p_template_id       uuid,     -- null ⇒ declared-only mode
  p_declared_contract jsonb
) returns jsonb
  language plpgsql stable security definer set search_path = ''
as $$
declare
  v_mode text := case when p_template_id is null then 'declared_only' else 'capture_check' end;
  v_t record;
  findings jsonb := '[]'::jsonb;
  warnings jsonb := '[]'::jsonb;
  calibration_required jsonb := '[]'::jsonb;
  required_assets jsonb := '[]'::jsonb;
  optional_bindings jsonb := '[]'::jsonb;
  probe_checklist jsonb := '[]'::jsonb;
  hard int := 0;
  el jsonb; k text; mk text; err text; n int;
  v_name text; v_kind text; v_req boolean; v_dc jsonb;
  v_captured record;
  v_plat jsonb; v_prow record;
  seen_names text[] := '{}';
  all_mod_keys text[] := '{}';
  tbc jsonb;
begin
  -- declared contract envelope, fail-closed
  if p_declared_contract is null or jsonb_typeof(p_declared_contract) <> 'object'
     or p_declared_contract->>'contract_version' is distinct from 'tmr_intake_declared_contract_v1' then
    return jsonb_build_object('verdict','fail','mode',v_mode,'hard_failure_count',1,
      'findings',jsonb_build_array(jsonb_build_object('code','declared_contract_invalid_envelope')));
  end if;
  for k in select jsonb_object_keys(p_declared_contract) loop
    if k not in ('contract_version','template','platforms','elements') then
      return jsonb_build_object('verdict','fail','mode',v_mode,'hard_failure_count',1,
        'findings',jsonb_build_array(jsonb_build_object('code','declared_contract_unknown_key','key',k)));
    end if;
  end loop;
  if jsonb_typeof(p_declared_contract->'template') is distinct from 'object'
     or jsonb_typeof(p_declared_contract->'platforms') is distinct from 'array'
     or jsonb_typeof(p_declared_contract->'elements') is distinct from 'array'
     or jsonb_array_length(p_declared_contract->'elements') = 0 then
    return jsonb_build_object('verdict','fail','mode',v_mode,'hard_failure_count',1,
      'findings',jsonb_build_array(jsonb_build_object('code','declared_contract_sections_invalid')));
  end if;
  -- template section: fail-closed key set + types BEFORE any cast (no raw 22P02 on bad input)
  if exists (select 1 from jsonb_object_keys(p_declared_contract->'template') t(k2)
             where k2 not in ('provider','scope','output_type','width','height'))
     or jsonb_typeof(p_declared_contract->'template'->'provider') is distinct from 'string'
     or jsonb_typeof(p_declared_contract->'template'->'scope') is distinct from 'string'
     or jsonb_typeof(p_declared_contract->'template'->'output_type') is distinct from 'string'
     or jsonb_typeof(p_declared_contract->'template'->'width') is distinct from 'number'
     or jsonb_typeof(p_declared_contract->'template'->'height') is distinct from 'number' then
    return jsonb_build_object('verdict','fail','mode',v_mode,'hard_failure_count',1,
      'findings',jsonb_build_array(jsonb_build_object('code','declared_template_section_invalid')));
  end if;

  -- C1: template row (capture mode only)
  if v_mode = 'capture_check' then
    select id, provider, scope, output_type, width, height
      into v_t from c.creative_provider_template where id = p_template_id;
    if v_t.id is null then
      return jsonb_build_object('verdict','fail','mode',v_mode,'hard_failure_count',1,
        'findings',jsonb_build_array(jsonb_build_object('code','template_not_found')));
    end if;
    if v_t.scope <> 'generic' then
      findings := findings || jsonb_build_object('code','scope_not_generic_selector_invisible',
        'scope',v_t.scope,
        'detail','live select_template admits only scope=''generic'' (cc-0089); a non-generic (client OR brand) row is silently never selectable');
      hard := hard + 1;
    end if;
    for k in select unnest(array['provider','scope','output_type']) loop
      if (p_declared_contract->'template'->>k) is distinct from
         (case k when 'provider' then v_t.provider when 'scope' then v_t.scope else v_t.output_type end) then
        findings := findings || jsonb_build_object('code','template_attr_mismatch','attr',k,
          'declared',p_declared_contract->'template'->>k,
          'captured',case k when 'provider' then v_t.provider when 'scope' then v_t.scope else v_t.output_type end);
        hard := hard + 1;
      end if;
    end loop;
    if (p_declared_contract->'template'->>'width')::numeric is distinct from v_t.width::numeric
       or (p_declared_contract->'template'->>'height')::numeric is distinct from v_t.height::numeric then
      findings := findings || jsonb_build_object('code','template_canvas_mismatch',
        'declared',(p_declared_contract->'template'->>'width') || 'x' || (p_declared_contract->'template'->>'height'),
        'captured',coalesce(v_t.width::text,'∅') || 'x' || coalesce(v_t.height::text,'∅'));
      hard := hard + 1;
    end if;
  end if;

  -- per-declared-element pass (C3 declared-side shape, C4, C5, C6, C9; accumulate names/keys)
  for el in select jsonb_array_elements(p_declared_contract->'elements') loop
    -- fail-closed element envelope: object, known keys, typed fields — BEFORE any cast
    if jsonb_typeof(el) <> 'object' then
      findings := findings || jsonb_build_object('code','declared_element_not_object');
      hard := hard + 1; continue;
    end if;
    if exists (select 1 from jsonb_object_keys(el) t(k2)
               where k2 not in ('element_name','field_kind','required_for_render','constraints')) then
      findings := findings || jsonb_build_object('code','declared_element_unknown_key',
        'element',coalesce(el->>'element_name','∅'));
      hard := hard + 1; continue;
    end if;
    if jsonb_typeof(el->'required_for_render') is distinct from 'boolean'
       or jsonb_typeof(el->'field_kind') is distinct from 'string' then
      findings := findings || jsonb_build_object('code','declared_element_types_invalid',
        'element',coalesce(el->>'element_name','∅'));
      hard := hard + 1; continue;
    end if;
    v_name := el->>'element_name';
    v_kind := el->>'field_kind';
    v_req  := (el->>'required_for_render')::boolean;
    v_dc   := el->'constraints';
    if v_name is null or v_name !~ '^[A-Za-z][A-Za-z0-9_]{0,63}$' then
      findings := findings || jsonb_build_object('code','declared_element_name_invalid','element',coalesce(v_name,'∅'));
      hard := hard + 1; continue;
    end if;
    if v_name = any(seen_names) then
      findings := findings || jsonb_build_object('code','declared_element_duplicate','element',v_name);
      hard := hard + 1; continue;
    end if;
    seen_names := seen_names || v_name;
    err := c.tmr_validate_field_constraints(v_name, coalesce(v_kind,'unknown'), v_dc);
    if err is not null then
      findings := findings || jsonb_build_object('code','declared_constraints_invalid','element',v_name,'detail',err);
      hard := hard + 1; continue;
    end if;
    -- C7 accumulation
    select all_mod_keys || coalesce(array_agg(x), array[]::text[]) into all_mod_keys
      from jsonb_array_elements_text(v_dc->'modification_keys') t(x);
    -- C4: calibration ledger
    if v_dc ? 'text_limits' then
      for k in select jsonb_object_keys(v_dc->'text_limits') loop
        if v_dc->'text_limits'->k->>'basis' = 'to_be_calibrated' then
          calibration_required := calibration_required ||
            jsonb_build_object('element',v_name,'limit',k);
        end if;
      end loop;
    end if;
    -- C5: asset routing
    if v_dc->>'content_source' = 'governed_asset' then
      required_assets := required_assets || jsonb_build_object('element',v_name,
        'resolver',v_dc->'asset'->>'resolver','asset_kind',v_dc->'asset'->>'asset_kind');
    elsif v_dc->>'content_source' = 'brand_profile_colour' then
      required_assets := required_assets || jsonb_build_object('element',v_name,
        'profile_column',v_dc->'asset'->>'profile_column');
    elsif v_dc->>'content_source' = 'render_binding' then
      optional_bindings := optional_bindings || jsonb_build_object('element',v_name);
    end if;
    -- C6: collapse depth advisory
    if v_dc->'slot'->>'activation' = 'conditional'
       and jsonb_array_length(v_dc->'collapse'->'mechanism') < 3 then
      warnings := warnings || jsonb_build_object('code','collapse_mechanisms_below_recommended',
        'element',v_name,'count',jsonb_array_length(v_dc->'collapse'->'mechanism'));
    end if;
    -- C9: probe checklist
    tbc := '[]'::jsonb;
    if v_dc ? 'text_limits' then
      for k in select jsonb_object_keys(v_dc->'text_limits') loop
        if v_dc->'text_limits'->k->>'basis' = 'to_be_calibrated' then tbc := tbc || to_jsonb(k); end if;
      end loop;
    end if;
    if v_dc->>'overflow_risk' = 'high' or jsonb_array_length(tbc) > 0 then
      probe_checklist := probe_checklist || jsonb_build_object('element',v_name,
        'container',v_dc->'container'->>'summary','limits_tbc',tbc,
        'baked',coalesce(v_dc->'baked','{}'::jsonb),'notes',v_dc->>'notes');
    end if;
    -- C3: capture comparison
    if v_mode = 'capture_check' then
      select f.field_kind, f.required_for_render, f.constraints into v_captured
        from c.creative_provider_template_field f
       where f.template_id = p_template_id and f.element_name = v_name;
      if not found then
        findings := findings || jsonb_build_object('code','element_missing_from_capture','element',v_name);
        hard := hard + 1;
      else
        if v_captured.field_kind is distinct from v_kind then
          findings := findings || jsonb_build_object('code','field_kind_mismatch','element',v_name,
            'declared',v_kind,'captured',v_captured.field_kind);
          hard := hard + 1;
        end if;
        if v_captured.required_for_render is distinct from v_req then
          findings := findings || jsonb_build_object('code','required_for_render_mismatch','element',v_name,
            'declared',v_req,'captured',v_captured.required_for_render);
          hard := hard + 1;
        end if;
        if v_captured.constraints is null then
          findings := findings || jsonb_build_object('code','captured_constraints_missing','element',v_name);
          hard := hard + 1;
        elsif v_captured.constraints <> v_dc then
          findings := findings || jsonb_build_object('code','constraints_diverge_from_declared','element',v_name,
            'declared_md5',md5(v_dc::text),'captured_md5',md5(v_captured.constraints::text));
          hard := hard + 1;
        end if;
      end if;
    end if;
  end loop;

  -- C10: shared_with resolution (against the declared element set)
  for el in select jsonb_array_elements(p_declared_contract->'elements') loop
    v_dc := el->'constraints';
    if v_dc ? 'container' and v_dc->'container' ? 'shared_with' then
      for mk in select jsonb_array_elements_text(v_dc->'container'->'shared_with') loop
        if not (mk = any(seen_names)) then
          findings := findings || jsonb_build_object('code','shared_with_unresolved',
            'element',el->>'element_name','references',mk);
          hard := hard + 1;
        end if;
      end loop;
    end if;
  end loop;

  -- C2: unexpected captured rows (reverse direction)
  if v_mode = 'capture_check' then
    for v_name in
      select f.element_name from c.creative_provider_template_field f
       where f.template_id = p_template_id and not (f.element_name = any(seen_names))
    loop
      findings := findings || jsonb_build_object('code','unexpected_captured_element','element',v_name);
      hard := hard + 1;
    end loop;
  end if;

  -- C7: cross-element modification-key uniqueness
  select count(*) - count(distinct x) into n from unnest(all_mod_keys) t(x);
  if n > 0 then
    findings := findings || jsonb_build_object('code','modification_keys_duplicate_across_elements','duplicates',n);
    hard := hard + 1;
  end if;

  -- C8: platforms
  for v_plat in select jsonb_array_elements(p_declared_contract->'platforms') loop
    if jsonb_typeof(v_plat) <> 'object' or (v_plat->>'platform') is null then
      findings := findings || jsonb_build_object('code','declared_platform_invalid');
      hard := hard + 1; continue;
    end if;
    if v_mode = 'capture_check' then
      select s.constraints into v_prow
        from c.creative_template_platform_suitability s
       where s.template_id = p_template_id
         and s.platform = v_plat->>'platform'
         and s.placement = coalesce(v_plat->>'placement','default');
      if not found then
        findings := findings || jsonb_build_object('code','platform_suitability_row_missing',
          'platform',v_plat->>'platform','placement',coalesce(v_plat->>'placement','default'));
        hard := hard + 1;
      elsif v_prow.constraints is null then
        findings := findings || jsonb_build_object('code','platform_constraints_missing',
          'platform',v_plat->>'platform');
        hard := hard + 1;
      else
        err := c.tmr_validate_platform_constraints(v_prow.constraints);
        if err is not null then
          findings := findings || jsonb_build_object('code','platform_constraints_invalid',
            'platform',v_plat->>'platform','detail',err);
          hard := hard + 1;
        else
          if (v_prow.constraints->'aspect'->>'canvas_width')::numeric is distinct from v_t.width::numeric
             or (v_prow.constraints->'aspect'->>'canvas_height')::numeric is distinct from v_t.height::numeric then
            findings := findings || jsonb_build_object('code','platform_aspect_disagrees_with_template',
              'platform',v_plat->>'platform');
            hard := hard + 1;
          end if;
          if v_t.output_type = 'video'
             and (not (v_prow.constraints ? 'scene_contract')
                  or not (v_prow.constraints ? 'duration_bounds_s')) then
            findings := findings || jsonb_build_object('code','video_platform_constraints_incomplete',
              'platform',v_plat->>'platform',
              'detail','scene_contract and duration_bounds_s required for output_type=video');
            hard := hard + 1;
          end if;
        end if;
      end if;
    end if;
  end loop;

  return jsonb_build_object(
    'verdict', case when hard = 0 then 'pass' else 'fail' end,
    'mode', v_mode,
    'hard_failure_count', hard,
    'findings', findings,
    'warnings', warnings,
    'calibration_required', calibration_required,
    'required_assets', required_assets,
    'optional_bindings', optional_bindings,
    'probe_checklist', probe_checklist);
end $$;

-- ── 9. Grants: service-role-only; REVOKE mandatory (default ACL grants EXECUTE to PUBLIC) ──
revoke execute on function c.tmr_validate_limit_triple(jsonb) from public, anon, authenticated;
revoke execute on function c.tmr_validate_field_constraints(text,text,jsonb) from public, anon, authenticated;
revoke execute on function c.tmr_validate_platform_constraints(jsonb) from public, anon, authenticated;
revoke execute on function public.record_tmr_template_field(uuid,text,text,text,boolean,jsonb,text,text,boolean,text,text,text) from public, anon, authenticated;
revoke execute on function public.set_tmr_field_constraints(uuid,text,jsonb,text,text,text) from public, anon, authenticated;
revoke execute on function public.record_tmr_platform_suitability(uuid,text,jsonb,text,text,text,text) from public, anon, authenticated;
revoke execute on function public.set_tmr_platform_constraints(uuid,text,text,jsonb,text,text) from public, anon, authenticated;
revoke execute on function public.validate_tmr_template_intake(uuid,jsonb) from public, anon, authenticated;

grant execute on function c.tmr_validate_limit_triple(jsonb) to service_role;
grant execute on function c.tmr_validate_field_constraints(text,text,jsonb) to service_role;
grant execute on function c.tmr_validate_platform_constraints(jsonb) to service_role;
grant execute on function public.record_tmr_template_field(uuid,text,text,text,boolean,jsonb,text,text,boolean,text,text,text) to service_role;
grant execute on function public.set_tmr_field_constraints(uuid,text,jsonb,text,text,text) to service_role;
grant execute on function public.record_tmr_platform_suitability(uuid,text,jsonb,text,text,text,text) to service_role;
grant execute on function public.set_tmr_platform_constraints(uuid,text,text,jsonb,text,text) to service_role;
grant execute on function public.validate_tmr_template_intake(uuid,jsonb) to service_role;

commit;

-- ── ROLLBACK (reference only — NOT executed; byte-exact reverse of every object created) ──
--   drop function if exists public.validate_tmr_template_intake(uuid,jsonb);
--   drop function if exists public.set_tmr_platform_constraints(uuid,text,text,jsonb,text,text);
--   drop function if exists public.record_tmr_platform_suitability(uuid,text,jsonb,text,text,text,text);
--   drop function if exists public.set_tmr_field_constraints(uuid,text,jsonb,text,text,text);
--   drop function if exists public.record_tmr_template_field(uuid,text,text,text,boolean,jsonb,text,text,boolean,text,text,text);
--   drop function if exists c.tmr_validate_platform_constraints(jsonb);
--   drop function if exists c.tmr_validate_field_constraints(text,text,jsonb);
--   drop function if exists c.tmr_validate_limit_triple(jsonb);
```

## 6. Apply plan, harness, and STOP conditions (for the PK gate — nothing executed now)

- **Tier:** T2 (dark/additive DB: function-only DDL, no data written, no consumer wired into any
  production worker; the intake validator is invoked only by the orchestrator at a PK-gated
  registration step). DML/DDL ≥ T2 per Convention 3; nothing here touches callers/grants of
  existing objects, deploy, publish, or secrets, so T3 is not triggered.
- **Migration name (permanent identity):**
  `tmr5_field_constraints_write_rpcs_and_intake_validator_v2` — version timestamp minted at apply
  (house precedent). Any revision after review = a NEW name, never this name with different SQL.
  (`…_v1` retired unused at design-review rev-1; never reuse it.)
- **Apply channel (named, single-call):** one `apply_migration` call carrying §5 byte-exact; if
  harness-denied, the TMR-3/TMR-4 fallback — ONE byte-identical `execute_sql` call (the
  `begin;…commit;` wrapper makes the single call atomic) + immediate ledger backfill. Never split
  across pooled calls.
- **Executable safety harness:** the §0 `DO` block is the fail-closed precondition — if ANY of the
  8 function signatures already exists, the transaction RAISES and nothing applies (this also makes
  an accidental rerun fail loud instead of silently replacing). `CREATE FUNCTION` (not
  `OR REPLACE`) everywhere for the same reason.
- **Declared STOPs (Convention 2 vocabulary):** packet-hash mismatch at the gate · the §0
  precondition raising · any non-clean review verdict · unexpected files in the change set ·
  rollback invalidated. A tripped STOP voids the sequence; resumption needs a fresh PK gate.
- **Rollback:** the 8 `DROP FUNCTION` statements above — exact-signature reverse of exactly the 8
  objects created, validated against the §0 precondition's own list (apply/rollback identity is
  1:1 by construction; no data to restore because none is written).
- **Named live pre-checks (orchestrator closes BEFORE apply — db-rls-auditor rev-1 residuals;
  either failing = STOP):**
  1. re-verify via `execute_sql` (R1, prompts as designed — `ice_readonly` is schema-blocked from
     `c.*`, 42501 live-proven) that `constraints IS NULL` on **all** rows of both target tables
     (the packet's cited same-day 144-row sample re-confirmed at apply time);
  2. confirm the live PostgREST exposed-schema list (prior recorded evidence says `c` IS exposed —
     the §9 REVOKEs close that surface either way, but the fact should be current at the gate).
- **Post-apply verification (read-only, db-read.py-routable catalog reads):**
  1. 8 functions exist; the 5 public entry points have `prosecdef = true` and
     `proconfig = {search_path=""}`;
  2. ACLs: anon/authenticated EXECUTE = false, service_role EXECUTE = true, on all 8;
  3. zero rows written anywhere (`count(*)` unchanged on both target tables);
  4. `get_advisors` security scan — no new finding.
- **Post-apply acceptance smoke (BEGIN…ROLLBACK on prod, house pattern):** one transaction that
  calls the RPCs with (a) the §4 `HookHeadline` example against a throwaway template row → `ok`,
  (b) a duplicate insert → `field_already_exists`, (c) a constraints object with an unknown key →
  `constraints_invalid`, (d) a TBC triple carrying a number → `limit_tbc_must_have_null_value`,
  (e) `validate_tmr_template_intake(null, <kinetic declared contract>)` → structured verdict —
  then ROLLBACK (nothing persists). Script authored at apply time from this packet's §4 examples.

## 7. Zero-inert-fields proof (the P-7 discipline)

Every key in both shapes is consumed by the §3 validator (check IDs) **and** enforced at write
time by the §5 validators:

| Shape key | Write-time enforcement | Intake-consumer check |
|---|---|---|
| `schema_version` | wrong version rejected | C3 shape re-validation |
| `modification_keys` | prefix/suffix/dup rules | C7 (template-wide uniqueness; timing-key/activation coherence) |
| `slot` | vocab + activation/timing coherence | C6, C7 |
| `content_source` | vocab; drives `asset` requirement | C5 (asset routing) |
| `empty_ok` | boolean; `render_binding`/conditional-text rules | C5, C6 |
| `text_limits` | triple discipline | C4 (calibration ledger) |
| `overflow_risk` | vocab, text-only | C9 (probe checklist) |
| `container` | summary bound; name pattern | C9 (`summary`), C10 (`shared_with`) |
| `collapse` | conditional-slot coherence | C6 |
| `asset` | resolver/fail-loud/profile-column vocab | C5 |
| `baked` | bounded scalar map | C9 (surfaced for transposition verification) |
| `notes` | length bound | **display-only** — echoed into C9 output for the PK gate reading; declared honestly as presentation, not decision input |
| `aspect` (§2a) | required, positive ints | C8 (agreement with template row) |
| `safe_zones` | shape rules | C8/C9 (echoed into probe context) |
| `scene_contract` | slot/range/mechanism rules | C8 (required for video) |
| `duration_bounds_s` | triple discipline | C4, C8 |

**Named future consumers (deferred, each its own PK-gated lane — not built here):** (1) the
render-preflight hard-gate in image/video-worker (branch-b §7 — reads `text_limits`, `asset`,
`empty_ok` before the Creatomate POST); (2) a `select_template` eligibility filter (branch-b §6 —
reads `text_limits`/`overflow_risk` at selection). Neither is assumed; the shape survives without
them because the intake validator already reads every field.

## 8. Open questions — named PK decisions (at the gate, not assumed)

- **Q1 — modification-key suffix vocabulary** frozen at 7 (`text·source·fill_color·time·duration·
  width·height`)? Covers every key the WS-4 package and `b1_video_stat.ts` use today; any
  extension (e.g. `volume`) = a `schema_version` bump, not a silent widening. *(Recommend: yes.)*
- **Q2 — platform vocabulary** for suitability writes frozen at the 5 named publisher platforms
  (`facebook·instagram·linkedin·youtube·wordpress`)? The column has no CHECK; the RPC imposing a
  vocabulary is deliberate. *(Recommend: yes — matches the S9 named-platform posture.)*
- **Q3 — suitability status ceiling:** `record_tmr_platform_suitability` refuses
  `platform_safe`/`production_proven`/`blocked` (elevation stays a separate governed act). Confirm
  this mirrors the proof-RPC's "no status elevation" rule as intended. *(Recommend: yes.)*
- **Q4 — audit trail:** should the Phase-2 kinetic capture also append one
  `c.creative_template_inventory_audit` row per capture batch (direct service-role insert,
  `capture_method='manual_sanitized_export'`, both assertions true)? *(Recommend: yes — the table
  exists for exactly this; noted for the Phase-2 packet, not this migration.)*
- **Q5 — WS-5 DoD breadth:** the programme brief wants constraints populated for **2–3
  production-proven templates**. This packet enables that via `set_tmr_field_constraints`
  (CAS-from-NULL on the existing 144 rows), but the per-template population lanes (which templates,
  whose declared contracts) are separate follow-on T2 lanes after the kinetic capture proves the
  loop. *(Recommend: kinetic first, then the B0/stat templates from the branch-b §3 sample.)*

## 9. Phase 2 (BLOCKED — recorded for continuity, not started)

Blocked until PK returns `{template_name, provider_template_id}` from the transposition sitting.
Then: capture lane (T2) = insert the `creative_provider_template` row **`scope='generic'`** (the
§3 C1 footgun check exists precisely for this) + 26 `record_tmr_template_field` calls from the
declared contract + 1 `record_tmr_platform_suitability` (youtube/default, §4 example) + 1 audit
row (Q4) → `validate_tmr_template_intake(template_id, contract)` must return `pass` →
`db-rls-auditor` pass on the actual written rows → hand off to probe renders (the §3
`calibration_required` list is the probe queue) → PK visual verdict → 13-rung graduation.

---

*Review chain (this packet):* `db-rls-auditor` → external review pinned to this file's sha256 →
`apply-harness-auditor` (SHADOW — its verdict clears no gate) → **STOP at the PK apply gate.**
Review outcomes are recorded in the lane result doc, not by editing the reviewed sections above.
