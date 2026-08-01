# Result — S6 Slice A: NDIS Yarns format-mix enrolment dry-run

**Brief file:** `docs/briefs/s6-slice-a-ndis-format-mix-enrolment-gate1-brief-v1.md` (draft, PK Gate-1 approved for investigation + read-only dry-run only)
**Executed by:** Claude Code (orchestrator)
**Completed:** 2026-07-31 Sydney

---

## 1. Result status

`Complete` — dry-run executed, gate evaluated. **Verdict: STOP.** No apply-packet proposal follows (per the brief's own gate: a frozen packet is returned only after PASS).

**⚠ ADDENDUM 2026-08-01 (additive — original STOP finding below is unchanged and remains correct as of its own date):** both of this STOP's two independent reasons are now cleared. §6 reason 1 (unsupported allocations reach the grid) is closed by S7's live capability guard (`docs/briefs/results/s7-demand-grid-capability-guard-applied-v1.md`, v6.106). §6 reason 2 / §4.8 (OQ4 ambiguity) is closed by PK's ruling — Option A, supersede (`docs/briefs/results/p4-oq4-disposition-decided-v1.md`, v6.107). **Slice A's STOP is lifted; resumption itself is a separate, not-yet-scoped execution lane** — this addendum records the gate clearing only, it does not constitute a fresh PASS or re-run this dry-run's evidence.

## 2. Commit(s)

N/A — read-only investigation, zero writes. (The Gate-1 brief itself, `s6-slice-a-ndis-format-mix-enrolment-gate1-brief-v1.md`, remains uncommitted pending PK's decision on how to file this dry-run's outcome.)

## 3. Files changed

- `docs/briefs/results/s6-slice-a-ndis-dry-run-result-v1.md` — created (this file)

No other file changed. No DB write of any kind (verified — every statement executed this pass was `SELECT`, `information_schema`/`pg_catalog` introspection, or a call to a `STABLE`/`IMMUTABLE` function; zero `INSERT`/`UPDATE`/`DELETE`/DDL).

## 4. Required outcomes — findings

### 4.1 Exact proposed `c.client_control_tower_enrollment` row

Mirroring the live Property Pulse seed row's shape (the only precedent), the row this slice would propose is:

| column | value |
|---|---|
| `client_id` | `fb98a472-ae4d-432d-8738-2273231c1ef4` (ndis-yarns) |
| `platform` | `NULL` (client-scoped, matching the PP seed row — the grid itself is per-platform internally) |
| `control_type` | `'format_mix'` |
| `enabled` | `true` |
| `rollout_stage` | `'enforce'` |
| `approval_status` | `'approved'` |
| `status` | `'active'` |
| `effective_from` | (apply date) |
| `effective_until` | `NULL` |
| `version` | `1` |
| `changed_by` | (packet identity string) |
| `approved_by` | `'PK'` |
| `reason` / `notes` | governed enrolment, this slice |
| `is_current` | `true` |

This row is **specified, not proposed for apply** — see verdict below.

### 4.2 Before/after simulation on `m.build_weekly_demand_grid`

**Before (current, unenrolled):** `m.format_mix_enrolled(ndis) = false` (confirmed — zero rows in `c.client_control_tower_enrollment` for NDIS). Per `m.materialise_slots`' own logic, every slot's `format_preference` comes from (a) `c.client_publish_schedule.format_override` when set, else (b) the platform's `preferred_format_*` column on `c.client_publish_profile`, else (c) empty. NDIS has `preferred_format_facebook='image_quote'` and no preferred format set for instagram/linkedin/youtube.

**After (simulated — `m.build_weekly_demand_grid` called directly, live, STABLE, zero side effects):**

| platform | ice_format_key | share_pct | weekly_slot_count |
|---|---|---|---|
| facebook | image_quote | 40.00 | 11 |
| facebook | carousel | 33.33 | 9 |
| facebook | text | 26.67 | 8 |
| instagram | carousel | 60.00 | 17 |
| instagram | image_quote | 40.00 | 11 |
| linkedin | text | 57.14 | 8 |
| linkedin | image_quote | 42.86 | 6 |
| youtube | video_short_kinetic | 33.33 | 9 |
| youtube | video_short_kinetic_voice | 27.78 | 8 |
| youtube | video_short_stat | 22.22 | 6 |
| youtube | video_short_stat_voice | 16.67 | 5 |

(`video_short_avatar`, the fifth global YT default, does not appear — NDIS's `c.client_format_config` does not enable it; correctly excluded by the existing client-enablement filter, independent of anything Slice A changes.)

### 4.3 Complete representative-cycle allocation, joined to platform-support and capability state

`platform_support` read exactly per the S7 design brief's own predicate (`durable-platform-support-intersection-demand-grid-gate1-v2.md:106`): `COALESCE((t."5.3_content_format".platform_support ->> platform)::boolean, false)`, joined on `ice_format_key` (verified against the live taxonomy table — the earlier `format_key` join used in a first-pass query was wrong and silently produced two false negatives; corrected and re-run). Capability state read via `public.classify_format_capability('ndis-yarns', platform, format)` — the live S5 seven-status classifier.

| platform | format | platform_support | capability status | reason |
|---|---|---|---|---|
| facebook | image_quote | **true** | **ready** | selectable, `production_proven` |
| facebook | carousel | **true** | **unsupported_silent_degrade** | `no_selectable_template` (7 publishes/90d) |
| facebook | text | **true** | **unsupported_silent_degrade** | `format_unmapped` (20 publishes/90d) |
| instagram | image_quote | **true** | **ready** | selectable, `production_proven` |
| instagram | carousel | **true** | **unsupported_silent_degrade** | `no_selectable_template` (3 publishes/90d) |
| linkedin | image_quote | **true** | **ready** | selectable, `production_proven` |
| linkedin | text | **true** | **unsupported_silent_degrade** | `format_unmapped` (70 publishes/90d) |
| youtube | video_short_stat | **true** | **ready** | selectable, `visually_approved` |
| youtube | video_short_kinetic | **true** | **unsupported_silent_degrade** | `format_unmapped` (3 publishes/90d) |
| youtube | video_short_kinetic_voice | **true** | **unsupported_silent_degrade** | `format_unmapped` (5 publishes/90d) |
| youtube | video_short_stat_voice | **true** | **unsupported_silent_degrade** | `format_unmapped` (3 publishes/90d) |

**7 of 11 (64%) of the grid's own computed candidates are `unsupported_silent_degrade`.** All 7 already carry real 90-day publish history under that status — this is NOT a hypothetical future failure mode; it is the classifier's live read of an already-occurring pattern (these formats are reaching production via NDIS's existing `format_override`-pinned schedule slots, entirely independent of Slice A).

### 4.4 Zero `platform_support=false` allocations — CONFIRMED

**0 of 11** grid candidates are `platform_support=false`. This narrow check passes cleanly, both for the actual live candidate set (above) and for a targeted check on NDIS's own latent config (below).

### 4.5 No mutation or dependency on S5/S7/Track-B/publish-profiles/schedules/production-queues

Confirmed. Every read this pass was `SELECT`/catalog-introspection or a call into a `STABLE`(`m.build_weekly_demand_grid`, `public.classify_format_capability`) / `IMMUTABLE` (`m.allocate_week_formats`) function — none of which write. Tables read (all read-only): `c.client_control_tower_enrollment`, `c.client_publish_schedule`, `c.client_publish_profile`, `c.client_format_config`, `c.client_format_mix_override`, `c.client`, `t.platform_format_mix_default`, `t."5.3_content_format"`, plus `m.post_publish`/`m.post_render_log`/`c.creative_template_client_assignment` indirectly via `classify_format_capability`'s own internals. No `m.slot`, `m.post_publish_queue`, S5 config, or Track-B/cc-0079/cc-0080 row was written. The dry-run's *conclusions* also do not require any of these surfaces to be in a different state than today — they are a direct read of current live fact, not a projection contingent on a future change.

### 4.6 Structural vs. accidental safety — **ACCIDENTAL, not structural**

`m.build_weekly_demand_grid`'s function body contains **zero reference to `platform_support`** (re-confirmed by direct `pg_get_functiondef` read, §4.2 of the prior B1/dry-run session and re-verified this pass) — there is no code-level join, filter, or guard against it anywhere in the automated demand path, exactly as the S7 design brief already found for Property Pulse. The reason today's *live* candidate set for NDIS happens to be 0/11 `platform_support=false` is **not** because anything prevents an unsupported format from entering — it is because `t.platform_format_mix_default` (the only source of mix *candidates*, absent a client override, which NDIS has none of) simply does not yet contain a row for any `platform_support=false` format on any platform.

This is demonstrably fragile, not incidental-but-safe: NDIS's own `c.client_format_config` **already has `animated_data` and `animated_text_reveal` enabled (`is_enabled=true`, platform-unscoped)** — both of which are `platform_support=false` on every one of NDIS's platforms (facebook/instagram/linkedin all `false`; youtube has no key, fail-closed `false`). These two formats do **not** currently appear in the grid's output only because they are absent from `t.platform_format_mix_default`, a table Slice A does not own, does not freeze, and has no control over. The moment any future lane (most plausibly Slice D, animated-format graduation) adds an `is_current=true` mix-default or client-override row for either format on any platform, NDIS's enrolment — exactly as specified in §4.1, unchanged — would immediately begin allocating a genuinely `platform_support=false` format, with **zero code-level guard catching it**, because the grid still performs no such check. Safety today is a coincidence of two independently-owned tables' current contents, not a property Slice A's own packet can freeze or guarantee.

### 4.7 OQ3 — may Slice A precede the S7 fix on a per-enrolment dry-run proof?

**Answered, from this evidence: no, not on a one-time dry-run alone.** §4.6 shows the dry-run's PASS-on-`platform_support` result is a snapshot of two other tables' current contents, not a guarantee. A dry-run proof of this shape would need to be re-run before every future change to `t.platform_format_mix_default` or `c.client_format_mix_override` to remain valid — that is not a one-time Gate-1 artifact, it is a standing operational obligation nothing currently enforces. Either the durable S7 intersection fix lands first, or Slice A's own apply must add an equivalent guard scoped at minimum to NDIS (e.g., a `CHECK`-free but query-time assertion mirroring §106 of the S7 brief, evaluated at enrolment-apply time AND re-asserted before every future mix-table change — not a one-shot check).

### 4.8 OQ4 — is the Track-B queue still current?

**Ambiguous — cannot be resolved from live evidence, and is therefore treated as a STOP per the brief's own gate.** The only repo record of the queue ("Slice 2 awaiting 'S7 GO — Slice 2 window open'", `docs/briefs/cc-0079-slice-2-external-review-record-v1.md:5`) is echoed in `docs/00_sync_state.md` at a **v6.20** entry (2026-07-24) — 7 days stale relative to today (v6.94) — with no later entry found that records the window opening, closing, or being superseded. The governing capability-expansion brief itself (authored today, commit `fde6bbc`) still carries this as an open question rather than a closed one. Absent a closure record, this cannot be affirmed current OR stood down from live evidence alone — it is a PK-owned fact, not a derivable one.

## 5. Practical exposure (context, not a substitute for the verdict above)

Of NDIS's 98 currently-enabled `c.client_publish_schedule` rows, **97 (99%) already carry a non-null `format_override`**, which always wins over any grid-computed preference in `m.materialise_slots` regardless of enrolment. Only **one** row (`facebook`, Sunday 08:00) would actually be affected today. Simulating that row's exact ordinal position against the real `m.allocate_week_formats` apportionment: it resolves to **`image_quote`** — `platform_support=true`, capability `ready`. So the practical, real-world effect of enrolling NDIS *today, with today's schedule* would in fact be safe for the one slot it actually touches. **This is explicitly excluded from the PASS decision** per the gate's own bar ("does not rely on downstream containment") — the `format_override` coverage that makes today safe is owned by a different lane (the Weekly Schedule Editor), is not frozen or guaranteed by Slice A's packet, and could change independently at any time, silently re-exposing the 7 unsupported candidates found in §4.3.

## 6. Gate verdict

**STOP.** Two independent, sufficient reasons under the brief's own stated gate:

1. **§4.3 — unsupported allocations do appear** when the grid's own candidate output is joined to capability state (not just the narrower `platform_support` flag): 7 of 11 (64%), each with real supporting publish history. The gate's bar is "zero unsupported allocations," not "zero `platform_support=false` allocations" — the narrower check alone is insufficient because §4.6 shows it passes for reasons unrelated to actual safety.
2. **§4.8 — the Track-B queue relationship is ambiguous**, triggering the gate's named STOP condition directly.

Additionally, §4.6/§4.7 show that what safety exists is **accidental** (two independently-owned tables' current contents) and would in a live, ongoing sense **rely on downstream containment** (the Weekly Schedule Editor's `format_override` coverage) to stay safe in practice — the third disqualifying condition the gate named.

**No frozen apply-packet proposal follows.** Per the gate's own instruction, a packet is returned only after PASS.

## 7. Open issues

- The exact single-row enrolment specified in §4.1 remains available for reuse in a future packet, unchanged — nothing here invalidates its shape.
- A future PASS attempt would need at least one of: (a) the durable S7 `platform_support` intersection landed in `m.build_weekly_demand_grid` itself, (b) an equivalent standing guard Slice A's own apply owns and re-asserts (not a one-shot dry-run), or (c) a materially narrower proposal — e.g. enrolling NDIS only for the platforms/formats already both `platform_support=true` AND capability `ready` (facebook/instagram/linkedin `image_quote`, youtube `video_short_stat`), which would sidestep §4.3 entirely, at the cost of not exercising the grid's full share-weighted logic.
- PK ruling still needed on OQ4 (Track-B queue currency) independent of this dry-run's outcome — it blocks Slice A specifically because Slice A is format-policy-adjacent, per the governing brief's own Forbidden actions.

## 8. Next recommended step

Two non-exclusive options for PK to choose between, neither executed here:

1. **Escalate §4.6's finding as a standing gap**, independent of Slice A: NDIS's `c.client_format_config` already enables two `platform_support=false` formats client-wide with no guard — worth a named PK decision on whether that config should be corrected now (data-only, zero code) regardless of whether Slice A proceeds, since it is latent risk for ANY future lane that adds those formats to the global mix-default table.
2. **Re-scope Slice A** to the narrower "already-ready-and-supported" proposal named in §7, and re-run this dry-run against the narrower shape — if PK wants to keep moving on the zero-code-onboarding objective without waiting on S7.

---

## 9. Verification

**Verdict:** `Pass with notes` — the dry-run itself ran clean and fully answered every required-outcome item; the *enrolment* it evaluated does not clear the gate, which is the correct and intended outcome of a dry-run designed to catch exactly this.

**Notes:**

- All 8 required outcomes were produced with live evidence, not assumption.
- The first-pass `platform_support` join used the wrong column (`format_key` instead of `ice_format_key`), producing 2 false negatives (`text` on facebook/linkedin appeared to have no taxonomy row); caught and corrected before this report was finalized by cross-checking against the S7 design brief's own verbatim predicate.
- Constraints respected: zero writes, zero touch to S5/S7/Track-B/schedules/queues/profiles.

## 10. Learning notes

- `t."5.3_content_format"` carries **two** near-identical key columns (`format_key` and `ice_format_key`) with different values for at least one row (`text_post` vs `text`) — a real footgun for any future read against this table; always join on `ice_format_key` to match the `c.client_format_config`/grid vocabulary, never `format_key`.
- `platform_support=true` is a necessary but **not sufficient** safety bar — `classify_format_capability`'s `unsupported_silent_degrade` status catches a materially larger, already-live set of risky (platform, format) pairs than the platform_support check alone. Any future dry-run of this shape should join capability state from the start, not add it as an afterthought.
- `format_override` on `c.client_publish_schedule` is a powerful, currently near-total (99% for NDIS) masking layer over the entire format-mix enrolment mechanism — worth naming explicitly in the governing brief as a factor that changes the real-world urgency/risk calculus of Slice A, separate from the grid's own correctness.
