# Result — D2: PP Legacy-Carousel Governance Declaration (Facebook + Instagram)

**Brief:** Creatomate Global Ultimate programme brief §1.2 (D2, DECIDED 2026-08-01); scoped by PK
direct instruction this session ("treat D2 as not executed. Prepare the explicit PP
legacy-carousel governance declaration for Facebook and Instagram, with a truthful result
document as the evidence ledger and zero synthetic proof rows").
**Executed by:** Claude Code (orchestrator)
**Completed (this pass):** 2026-08-02 Sydney — **PREPARED, NOT APPLIED.** Pending review chain +
PK apply gate, same discipline as every other DB-touching lane this session.

**PK DECISION (2026-08-02, direct chat):** presented with a 3-option decision card for the
`tmr-drift-probe` side effect (§8) — PK confirmed "go with your recommendation": **Option C —
apply as-is, accept the daily `tmr-drift-probe` status flip (`ok`→`error`) as a disclosed,
known side effect.** Option B (patch `tmr-drift-probe` to skip rows with no resolvable
`declarative_registry_ref` instead of failing the whole run) is the correct long-term fix but was
explicitly named as **out of scope for this closeout — queued as a follow-up carry, not
applied here.** Option A (fabricate/build a Creative Library registry entry for the legacy
pipeline) was recommended against: the Creative Library v2 schema is template-family/variant
shaped and this pipeline has no template family, so a real Option-A fix means extending that
schema — its own design-gate lane, not a same-day fix.

---

## 1. Result status

`Complete` — **APPLIED 2026-08-02.** Migration `d2_pp_legacy_carousel_governance_declaration_v1`
applied live to project `mbkmaxqhsohbtwsqolns` via `mcp__supabase__apply_migration`, one pooled
call, per PK's explicit apply-gate confirmation ("confirmed, apply it"). Post-apply independent
verification: `c.client_creative_governance` id `d2510001-0000-4000-8000-000000000001` —
`client_id`=property-pulse, `format='carousel'`, `contract_ref='property_pulse.carousel.legacy_
pipeline'`, `declarative_registry_ref=NULL`, `render_label='image_worker_legacy_carousel_v1'`,
`enabled=true`, `created_at='2026-08-02 03:43:40.710635+00'`. This result document remains the
accepted Ultimate-v1 evidence ledger for D2 — no proof-event rows exist or were needed.

## 2. Commit(s)

N/A yet — will be committed to a lane branch once the review chain runs, before any apply.

## 3. Files changed

- `supabase/migrations/20260802100000_d2_pp_legacy_carousel_governance_declaration_v1.sql` — created (not applied)
- `supabase/migrations/ROLLBACK_20260802100000_d2_pp_legacy_carousel_governance_declaration_v1.sql` — created
- `docs/briefs/results/d2-pp-legacy-carousel-governance-declaration-result-v1.md` — this file (the evidence ledger)

## 4. What "the legacy carousel pipeline" actually is

Identified by reading `supabase/functions/image-worker/index.ts` (lines ~1208–1256) directly —
**not assumed from the programme brief's wording.** It is a bespoke, worker-code-embedded render
path, structurally separate from the TMR/Creatomate template registry:

1. Picks up `m.post_draft` rows with `recommended_format='carousel'`, `image_status='pending'`.
2. Calls Anthropic directly (`callContentAdvisor`) to produce a 3–6 slide spec (hook / point / cta).
3. For each slide, calls `buildCarouselSlideScript(...)` — a **locally-built Creatomate
   direct-source render script**, not a stored/selected template row from
   `c.creative_provider_template`. This never touches `select_template` or
   `c.creative_template_client_assignment`.
4. Writes each slide via the `upsert_carousel_slide` RPC into `m.post_carousel_slide`.

**This is a different system from the TMR-registered `generic_carousel_cover_1x1_v1` template**
found during B2 Stage 0 (`docs/briefs/results/b2-visual-verdict-promotion-stage0-forensic-
reconstruction-v1.md` §5) — that template IS `select_template`-routed and was approved
2026-07-03, four weeks before D2 was decided. D2 governs the legacy pipeline described above; the
TMR template is untouched by this declaration.

## 5. Real evidence (live query, 2026-08-02, project `mbkmaxqhsohbtwsqolns`)

| Metric | Value |
|---|---|
| Total `m.post_draft` rows, property-pulse, `recommended_format='carousel'` | **104** |
| Of those, rows with ≥1 `m.post_publish` row (any status) | 55 |
| Actually **published** on Facebook | 23 (2026-03-20 → 2026-07-26) |
| Actually **published** on Instagram | 14 (2026-06-14 → 2026-07-17) |
| **Total FB+IG published** | **37** |
| `m.post_carousel_slide` rows across those 104 drafts | 629 |

**The programme brief's "104 real drafts" figure is exactly correct** — it matches total carousel
drafts, not published-post count. This is stated plainly because the two numbers (104 drafts vs.
37 actual FB+IG publishes) are easy to conflate; both are real, they just measure different things.

## 6. What this declaration does — and, honestly, does not do

**Does:** one additive `INSERT` into `c.client_creative_governance`
(`client_id`=property-pulse, `format='carousel'`, `contract_ref='property_pulse.carousel.legacy_pipeline'`,
`render_label='image_worker_legacy_carousel_v1'`, `enabled=true`), formally recording D2 as decided
**and** governed, matching the shape of PP's existing `video_short_stat`/`image_quote` governance
rows in the same table.

**Does NOT change any render behaviour today** — verified by reading `image-worker/index.ts`
directly: the runtime governance gate `isImageGovernanceEnabled(supabase, clientId, format)` is
called **exactly once** in production code, hardcoded to `format='image_quote'` (line 1082) —
**never** with `'carousel'`. The carousel render block runs unconditionally on any
carousel-format pending draft, gated only by the separate, unrelated `isImageEnabled(clientId)`
client-level toggle. It does not consult `c.client_creative_governance` at all.

**CORRECTED 2026-08-02:** this section originally claimed "no production behaviour change" without
qualification — `db-rls-auditor` found that overstated. It holds for the render path only; it does
**not** hold for `tmr-drift-probe`'s daily cron, which reads this table with no format filter and
will flip its daily status `ok`→`error` once this row exists (§8 has the full mechanism). **PK
decided (2026-08-02) to accept that side effect as disclosed** rather than block the declaration on
it — see header. This INSERT is otherwise a declarative/record-keeping act — it formally closes D2
as decided-and-recorded and gives any future code that might read this table for `carousel` the
correct governed state from day one.

**No proof-event rows are written.** `c.creative_template_proof_event.template_id` is `NOT NULL`
and references `c.creative_provider_template` — the legacy carousel pipeline has no such row (it
is not a registered Creatomate template), so writing a proof event here would require fabricating
a `template_id` that does not truthfully describe this pipeline. Per the governing instruction
("zero synthetic proof rows"), **this result document is the evidence ledger** for D2 — the real
numbers in §5 are the proof, not a forced DB row. This is a deliberate, disclosed scope decision.
`declarative_registry_ref` is left `NULL` in the migration for the same honesty reason: no
Creative Library declarative-registry entry exists for this legacy pipeline (checked
`docs/creative-library/property-pulse.json` — no carousel family/pattern entry, only a passing
mention in the brand-constitution purpose string).

## 7. Constraints confirmed

- No DDL, no schema change — one additive `INSERT` on an existing table.
- No selector/capability function touched.
- No proof-event fabrication.
- No apply performed in this pass.

## 8. Open issues

- **`db-rls-auditor` found the §6 "zero production behaviour change" claim materially incomplete
  — a real regression, not yet resolved.** The claim was verified only against `image-worker`'s
  carousel/image_quote render gate (correctly, that consumer is unaffected). It missed
  `supabase/functions/tmr-drift-probe/index.ts`'s `fetchGovernedClients()`, which reads
  `c.client_creative_governance WHERE enabled = true` with **no `format` filter**, and runs daily
  via the live cron `tmr-drift-probe-daily` (`35 17 * * *`). Once this row exists, the daily sweep
  picks it up; because `declarative_registry_ref` is `NULL` (honestly, per §6 — no such registry
  entry exists), `fetchDeclarativeRegistry()` throws `declarative_registry_ref_missing`, which
  `computeVerdict()` treats as a run-level error — **`tmr-drift-probe`'s daily status would flip
  from `ok` to `error` starting with the first cron fire after this migration lands, and stay
  there until fixed.** This is a genuine, verified (not hypothetical) production side effect.
  **RESOLVED 2026-08-02 — PK elected Option C** (see header): apply as-is, accept the daily
  `tmr-drift-probe` status flip (`ok`→`error`) as a disclosed, known side effect. Option B (patch
  `tmr-drift-probe` to skip/scope its declarative-coverage check to formats it actually knows how
  to check) is the correct long-term fix and is **queued as a named follow-up carry** — not part
  of this apply. Option A (a Creative Library registry entry) was recommended against — the
  schema doesn't cleanly fit a non-template pipeline without its own design-gate change.
- Evidence numbers (§5) and the render-gate claim were independently re-verified by
  `db-rls-auditor` and confirmed exact — only the *scope* of the "zero behaviour change" claim was
  wrong, not the underlying facts.
- No collision, ID, grant, RLS, or `ON CONFLICT`/rowcount-assertion issue found — those all
  verified clean.
- If a future code change ever wires `c.client_creative_governance` into the carousel render path
  itself (separate from the drift-probe issue above), this row's `enabled=true` will become
  load-bearing for the render gate for the first time — worth a note at that point, not a concern
  today.
- **NEW CARRY (2026-08-02): `tmr-drift-probe` should be patched (Option B) to skip governance rows
  with no resolvable `declarative_registry_ref` instead of failing its whole daily run.** Not
  scoped into this apply — a future, separate T2 code lane (own build/test/review/deploy cycle).
  Until it lands, `tmr-drift-probe`'s daily status will read `error` (not `ok`) starting from the
  first cron run after this migration applies — expected, disclosed, not a new incident if seen.

## 9. Next recommended step

**Done.** `branch-warden` safe, external review agree/proceed (`review_id ddd62a6c-d853-4410-8689-
5467a29ce445`), PK apply-gate confirmed, applied and independently verified live. D2 is closed.
Remaining carry: hand the `tmr-drift-probe` Option-B patch off as a named follow-up in the lane's
closing pointer payloads — not part of this lane's remaining work.
