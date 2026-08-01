# Result — D2: PP Legacy-Carousel Governance Declaration (Facebook + Instagram)

**Brief:** Creatomate Global Ultimate programme brief §1.2 (D2, DECIDED 2026-08-01); scoped by PK
direct instruction this session ("treat D2 as not executed. Prepare the explicit PP
legacy-carousel governance declaration for Facebook and Instagram, with a truthful result
document as the evidence ledger and zero synthetic proof rows").
**Executed by:** Claude Code (orchestrator)
**Completed (this pass):** 2026-08-02 Sydney — **PREPARED, NOT APPLIED.** Pending review chain +
PK apply gate, same discipline as every other DB-touching lane this session.

---

## 1. Result status

`Partial` — packet prepared and evidence gathered; **no DML has been executed.** `db-rls-auditor`
review (§8) found the packet's own "zero production behaviour change" claim materially incomplete
(a real, verified daily-cron side effect on `tmr-drift-probe`, distinct from the render-gate claim
which IS correct) — stopping here for a PK decision, not proceeding to external review or an
apply gate until that's resolved.

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

**Does NOT change any production behaviour today.** Verified by reading `image-worker/index.ts`
directly: the runtime governance gate `isImageGovernanceEnabled(supabase, clientId, format)` is
called **exactly once** in production code, hardcoded to `format='image_quote'` (line 1082) —
**never** with `'carousel'`. The carousel render block runs unconditionally on any
carousel-format pending draft, gated only by the separate, unrelated `isImageEnabled(clientId)`
client-level toggle. It does not consult `c.client_creative_governance` at all. **This INSERT is a
pure declarative/record-keeping act** — it formally closes D2 as decided-and-recorded and gives
any future code that might read this table for `carousel` the correct governed state from day
one, but it flips no live gate. Stated plainly so this is never mistaken later for a behavioral
change.

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
  **Not resolved in this pass — surfaced to PK as a decision, per the auditor's three named
  options:** (a) point `declarative_registry_ref` at a real Creative Library entry (none currently
  exists — would require creating one, out of this packet's scope), (b) patch
  `tmr-drift-probe` to skip/scope its declarative-coverage check to formats it actually knows how
  to check (a code change with its own review/deploy cycle), or (c) explicitly accept the daily
  false-error status as a disclosed, PK-approved side effect. **This packet does not pick one —
  that choice belongs to PK, not to this reconstruction.**
- Evidence numbers (§5) and the render-gate claim were independently re-verified by
  `db-rls-auditor` and confirmed exact — only the *scope* of the "zero behaviour change" claim was
  wrong, not the underlying facts.
- No collision, ID, grant, RLS, or `ON CONFLICT`/rowcount-assertion issue found — those all
  verified clean.
- If a future code change ever wires `c.client_creative_governance` into the carousel render path
  itself (separate from the drift-probe issue above), this row's `enabled=true` will become
  load-bearing for the render gate for the first time — worth a note at that point, not a concern
  today.

## 9. Next recommended step

Run the same review chain as the B2 Stage-2 promotion packet (`db-rls-auditor` at minimum, given
the low blast radius already established here), then present for a separate PK apply gate — not
bundled with Stage 2's promotion decision.
