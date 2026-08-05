# M11c — Property Pulse Carousel: Migrate vs Retain vs Retire — PK Decision Packet v1

**Lane:** `m11c-pp-carousel-migrate-vs-retire`
**Created:** 2026-08-05 Sydney
**Author:** chat (Claude Code orchestrator), `cgu-final-programme-control`
**Executor (this pass):** chat (Claude Code) — read-only repo research + `db-rls-auditor` (live DB, project `mbkmaxqhsohbtwsqolns`, two passes)
**Status:** `DECISION_PACKET_READY` — no mutation performed. Zero schedules/governance rows/workers/
templates/production routes touched, in this session or the DB reads that informed it.
**Tier:** T1 (docs/read-only). This packet authorises nothing. Whichever disposition PK selects
becomes its own fresh Gate-1 brief with its own T2/T3 chain.
**Result file:** N/A — this document is the deliverable. This realizes M11b's Seed Packet C (§4.3).

---

## 0. Authoritative inputs

1. **M11a inventory + carousel-provenance addendum** — per-cell classification; PP = declared-legacy/live.
2. **M11b fleet scoping packet** (`docs/briefs/m11b-fleet-carousel-closure-scoping-packet-v1.md`,
   v6.132) — this lane's parent. M11b's own §7 flagged that its session had **no DB access**, so
   every fresh number and registry claim below supersedes M11b's necessarily-provisional picture
   where they differ (flagged explicitly at each such point, not silently).
3. **D2 result** (`docs/briefs/results/d2-pp-legacy-carousel-governance-declaration-result-v1.md`) —
   what the `client_creative_governance` row is and is not; the `tmr-drift-probe` side effect;
   PK's Option-C acceptance.
4. **CGU Final programme brief** (`docs/briefs/creatomate-global-ultimate-final-delta-audit-v1.md`,
   the ratified M11 rule, verbatim): *"Migrate every active, scheduled, or committed legacy route
   to governed by default. Explicitly retire only unused, superseded, or disproportionately
   expensive routes, with a recorded PK disposition."* This is the standing policy every disposition
   below is checked against, not an independent judgment invented here.
5. **`docs/creative-library/registry-schema-v2.md`** (A1.1) — the declarative Creative Library v2
   schema shape (Style Guide → Patterns+Assets → Template Families → Variants → Evidence, plus the
   v0.3 Capability Contract layer).
6. **`docs/briefs/tmr-template-proof-lifecycle-v1-discovery-proof-model-brief.md`** — the house
   proof-rung ladder (Rung 0 inventory → 1 smoke_render → 2 visual_approval → 3 platform_render →
   4 platform_publish/`production_proven`), reused below rather than inventing new gate names.
7. **Fresh `db-rls-auditor` reads, this session (2026-08-05)** — two passes, live `client_format_config`
   / `client_creative_governance` / TMR registry / volume / `tmr-drift-probe` cron state / rollback-table
   inventory, cited throughout §2–§7.

---

## 1. The three dispositions on the table

Per the ratified M11 rule (§0 item 4), these are not three equally-weighted options — the rule sets a
**default** and names the only exceptions to it:

| Disposition | What it means here | Standing against the ratified default |
|---|---|---|
| **A — Governed migration** | Wire PP carousel into the Creative Library v2 / TMR registry as a real, `select_template`-routed, proof-bearing capability, retiring the bespoke worker-embedded pipeline. | **The default**, if carousel is active/scheduled/committed (it is — §2). |
| **B — Explicit legacy retention** | Formally accept the current declared-legacy state as a **standing, PK-recorded exception** rather than an interim/pending state — i.e., stop treating "declared-legacy" as a waypoint toward migration and instead rule it a deliberate permanent posture. | **Not currently a valid default per M11** — inertia alone is explicitly disqualified (§0 item 4: "explicitly retire only... unused, superseded, or disproportionately expensive" — retention-as-such isn't a named exception at all; it would need its own recorded rationale, e.g. "disproportionately expensive to migrate," argued explicitly, not assumed). |
| **C — Retirement** | Turn PP carousel off: `client_format_config.is_enabled=false`, plus a governance row recording the retirement (matching the CFW/Invegent pattern from M11b §2.3/§2.4). | Valid **only** if PK finds carousel's migration cost genuinely disproportionate relative to its production value (§6/§8), or independently decides the format itself should be dropped — not a default, and not free of real content-mix cost (§8). |

**This packet's own reading of the evidence (§2–§8): Option B is not well-supported as a standing
disposition** — carousel is neither unused, superseded, nor (on the fresh evidence in §6) obviously
disproportionately expensive to migrate; it would require PK to argue an exception the ratified rule
doesn't clearly grant. The real decision is **A vs C**, and §9 gives acceptance criteria for both.

---

## 2. Current route and volume

**Route** (shared fleet code, no PP-specific branch — full citations in M11b §1, reconfirmed current
this session):

- **Draft eligibility:** `ai-worker/index.ts` `fetchFormatContext()` offers `carousel` because PP's
  `c.client_format_config` row (`fc339e1e-…`) has `is_enabled=true` — confirmed unchanged, seeded
  2026-03-20, never touched since (`updated_at == created_at`).
- **Format selection:** `callFormatAdvisor()` (Claude) picks `carousel` for "3+ distinct structured
  points and minimum 200 words" content.
- **Render:** `image-worker/index.ts:1208–1256` — picks up `recommended_format='carousel'`,
  `image_status='pending'` (deliberately **no** `approval_status` gate, to avoid an approval/image
  deadlock — v3.9.2 fix, see inline comment at line 1209). Calls `callContentAdvisor` (Claude) for a
  3–6 slide spec, then per slide calls `buildCarouselSlideScript(...)` — a **locally-built Creatomate
  direct-source render**, never `select_template`, never a stored `provider_template_id` — and writes
  each slide via `upsert_carousel_slide` into `m.post_carousel_slide`. Render-time gate is only the
  client-level `isImageEnabled(clientId)` toggle; `isImageGovernanceEnabled` is hardcoded to
  `format='image_quote'` only and is never called with `'carousel'`.
- **Publish:** `publisher/index.ts:429-437` (Facebook, organic multi-photo) and
  `instagram-publisher/index.ts` (native carousel container) both read `m.post_carousel_slide` by
  `post_draft_id` **format-agnostically** — they do not know or care whether the slides came from the
  legacy pipeline or a governed one. **LinkedIn cannot currently publish carousel at all**: both
  LinkedIn publishers hard-block it —
  `linkedin-zapier-publisher/media_action.ts` `resolveZapierAction()`'s method allowlist is exactly
  `text`/`image` (anything else → `block: method_not_enabled_v0`, confirmed at the current call site,
  `mediaPublishSupported:true` since v1.3.0, which only unlocked `image`, not `carousel`); the
  non-zapier `linkedin-publisher` is **repo-only, not deployed** (no `cron.job` entry) and blocks
  carousel too. (§2.1: historical LinkedIn carousel publishes exist in `m.post_publish`, all dated
  ≤2026-06-15 — they predate the current block, not evidence of a live path today.)

**Governance-record state:** D2's `client_creative_governance` row (`d2510001-…`) exists, `enabled=true`,
unchanged since 2026-08-02T03:43:40Z. It is **not consulted by the render path** — declarative
record-keeping only, confirmed by direct code read. Its one live consumer is `tmr-drift-probe` (§7).

**Volume (fresh, 2026-08-05, `db-rls-auditor`):**

| Window | PP carousel drafts | Approval breakdown | FB published | IG published | LI published* |
|---|---|---|---|---|---|
| 90d | 45 | published 31 · approved 8 · rejected 4 · voided 2 | 16 | 15 | 8* |
| 14d | 2 | — | 1 | 1 | 0* |

\* **LI figure is stale, not current — see §2.1.** `m.post_carousel_slide`: 247 rows / 90d (12 in the
last 14d) across the 45 PP drafts — confirms slides are actively being generated, not just drafted.

**This is real, ongoing, current production on Facebook + Instagram** — 2 new drafts in the last 14
days is modest but non-zero, and the format has not decayed the way NDIS's/CFW's did (M11b §2.2/§2.3:
15–42 days since last render at closure time). PP carousel is the one client×format cell in the whole
fleet carousel inventory that is still actively producing. LinkedIn is a different picture (§2.1).

### 2.1 Resolved — LinkedIn carousel "published" rows are historical, not current

**Resolved by a targeted follow-up `db-rls-auditor` read (full row-level dates).** All 17 all-time
`m.post_publish` rows for PP+carousel+LinkedIn (8 of which land inside the 90-day trailing window,
hence §2's "8") run **2026-04-25 → 2026-06-15** — the most recent is **51 days before this packet**.
**Zero rows of any status (published/blocked/failed) exist after 2026-06-15** — the pipeline hasn't
even attempted a LinkedIn carousel publish in nearly two months, not merely stopped succeeding at one.
This is consistent with the current hard-block (§2) having been introduced or tightened sometime after
2026-06-15 and holding since; whoever next touches `linkedin-zapier-publisher`/`media_action.ts` can
cross-reference that file's history against this boundary date to confirm.

**One further caveat, worth carrying forward rather than treated as settled:** every one of those 17
rows' `platform_post_id` is shaped `zapier-li-<unix-ms-timestamp>` (e.g. `zapier-li-1781481607318`) —
**a synthetic ID the zapier-publisher code itself fabricates**, not a real LinkedIn URN
(`urn:li:share:...`). The `response_payload` shows a genuine-looking Zapier catch-hook 200 ack, which
only proves the webhook call to Zapier was accepted — Zapier's own downstream automation could still
have silently failed to produce a real multi-image LinkedIn post (no `permalink`/`external_post_id`
column exists on `m.post_publish` to check further). So even PP's **historical** LinkedIn-carousel
volume is not confirmed-delivered with the same confidence as the FB/IG figures above — a minor point
for this packet (LinkedIn carousel is not part of the current, live picture regardless), but worth
naming so no future lane treats "8 published" as proven LinkedIn delivery.

**Net effect on this packet:** PP carousel's current, live production is **Facebook + Instagram only**.
LinkedIn carousel is dormant, has been for ~7 weeks, and its historical "success" rows carry a
provenance caveat of their own. §8's retirement-impact figure is scoped accordingly.

---

## 3. Exact missing governance/provenance surfaces

Cross-referencing the D2 record, the render path, and the TMR/Creative Library v2 registry (fresh
`db-rls-auditor` read — **this corrects a premise in M11b's own §4.3 scope**, which (working without
DB access) assumed carousel had *no* template-family presence; it has one, but stalled):

1. **`declarative_registry_ref` is NULL on the D2 governance row** — no Creative Library JSON entry
   backs it (confirmed: `property-pulse.json` mentions "carousel" only in the brand-constitution
   purpose string, no Pattern/Template Family/Variant object). This is the direct cause of §7's
   `tmr-drift-probe` failure.
2. **The render path does not consult `client_creative_governance` at all** — D2's row governs nothing
   live; it is a record of a decision, not an enforced gate. Contrast with `image_quote`, where
   `isImageGovernanceEnabled` is the actual gate.
3. **TMR registry presence exists but stalled at Rung 2 of the proof ladder (§5), never advanced:**
   3 provider templates — `generic_carousel_cover_1x1_v1`, `_body_1x1_v1`, `_closing_1x1_v1`
   (ids `15ef4676…`, `fcdf3bb3…`, `756a5b89…`) — created 2026-07-02, `status='smoke_rendered'`,
   assigned **exclusively to Property Pulse** 2026-07-03 (`assignment_status='visually_approved'`,
   not `production_proven`). All 3 have `required_field_mapping_status='pending'` on their
   `creative_template_variant_candidate` row — the mapping from the template's Creatomate dynamic
   fields to ICE's logical content fields (the shape §7's Capability Contract `fields` block would
   encode: `ai_authored`/`derived`/`renderer_fixed`) was **never finished**, over a month later.
   `creative_template_platform_suitability` (9 rows: 3 templates × FB/IG/LI) never advanced past
   `candidate` — no per-platform suitability review was ever recorded.
4. **No `platform_publish` proof event exists for any of the 3 templates** — 6 proof events total,
   3× `smoke_render` (passed) + 3× `visual_approval` (passed), and nothing beyond. Per
   registry-schema-v2 §5's binding proof discipline, none of the 3 variants may claim `proven` without
   a real `render_log_id` from an actual production render — none exists.
5. **No Capability Contract exists** for PP carousel at all (§7's `capability_contracts[]` — the layer
   that would let a governed renderer deterministically resolve which variant to use). This is
   necessary but, per point 6, **not sufficient** as currently schema-shaped.
6. **The schema has no primitive for an ordered multi-slide sequence.** A Capability Contract's `gate`
   is deterministic on `{client_id, recommended_format}` alone and `maps_to_variant` binds to exactly
   **one** `template_variant_key` (registry-schema-v2 §7). The 3 existing templates are 3 *separate*
   Template Families (`generic.carousel.cover` / `.body` / `.closing`), each presumably with its own
   variant — but nothing in the schema lets a contract say "cover, then body ×N, then closing" for one
   `(client_id, 'carousel')` gate. **This is the real, structural migration gap** — not "no templates
   exist" (they do, stalled), but "no schema concept exists for binding an ordered N-slide sequence to
   one governed format." Compounding this: the legacy pipeline's slide count is **dynamic** (Claude
   picks 3–6 per post), which the existing 3-fixed-role templates don't obviously reconcile without a
   PK-level design decision (fixed 3-slide cover/body/closing structure, replacing the legacy
   pipeline's variable length, vs. a more complex variable-length contract shape).
7. **No dashboard disposition surface exists** (M11b §1.1, reconfirmed): no IA doc defines a
   legacy/governed/retired display model for any format; not a gap this packet's dispositions need to
   fix, but the dashboard will not visibly distinguish "migrated," "retained," or "retired" carousel
   without separate, net-new IA work.

---

## 4. Code, schema, worker, and dashboard impacts

**Draft/format-selection (`ai-worker`):** no change under any disposition — eligibility is already
purely config-driven (`client_format_config`); the advisor's palette logic is format-agnostic to how a
format renders once selected.

**Render (`image-worker`):**
- **Migrate:** the carousel block (lines 1208-1256) would be rewritten to resolve each slide's template
  via a governed selector (a `select_template`-equivalent, scoped per slide role) instead of
  `buildCarouselSlideScript()`'s direct Creatomate JSON composition, and to stamp
  `evidence_fields_for_renderer` (variant_key/contract_ref/contract_version/selector_reason) the way
  governed `image_quote` renders already do. The `upsert_carousel_slide` write shape can stay
  unchanged if the migration preserves `m.post_carousel_slide` as the publish-side contract (§4,
  Publish, below) — this is a design choice, not a given.
- **Retain/Retire:** no render-code change either way; retire only touches config/governance rows.

**Publish (`publisher`, `instagram-publisher`):** **zero code impact under Migrate**, confirmed by
direct read — both read `m.post_carousel_slide` by `post_draft_id` + `image_status='generated'`,
with no awareness of render provenance. A migration that keeps writing to the same table in the same
shape needs no publish-side change at all. Retire needs no publish-side change either (the format
simply stops being drafted).

**LinkedIn:** unaffected by this decision either way while carousel stays LinkedIn-hard-blocked at v0
(§2) — a future LinkedIn carousel media path is a separate, unscoped lane regardless of PP's
migrate/retain/retire outcome here.

**Schema (Creative Library v2 / TMR registry):** the real work under Migrate, per §3 point 6 — extends
registry-schema-v2 §7 (or introduces a new declarative primitive) to represent an ordered sequence of
variants bound to one governed format/gate. This is genuinely new design, not configuration — it
affects the schema doc, the `creative-graph-auditor`'s static-audit rules (which would need a new
check for sequence-shaped contracts), and any future non-PP client that might want a governed carousel
(the schema change would be reusable fleet-wide, though no other client currently has carousel
eligibility open — M11b §2.2-§2.4).

**Dashboard:** **no change required under any disposition** for existing surfaces (M11b §1.1,
reconfirmed) — `client_format_config`/`client_creative_governance` state already renders generically
and correctly for all clients. The one true gap (no legacy/governed/retired *display* distinction) is
orthogonal to this decision and not blocking any of the three options.

---

## 5. Proof ladder

Reusing the house rung model (§0 item 6) rather than inventing new terminology. Current state for the
3 existing carousel templates:

| Rung | What it asserts | PP carousel status today |
|---|---|---|
| 0 | Inventory candidate | ✅ done (2026-07-02) |
| 1 | `smoke_render` passed | ✅ done, all 3 templates (2026-07-02T12:42:40Z) |
| 2 | `visual_approval` passed | ✅ done, all 3 templates (2026-07-03T14:09:57Z) — but **`assignment_status` is `visually_approved`, not `production_proven`**, and `platform_suitability` never left `candidate` |
| 3 | `platform_render` passed (real platform path) | ❌ not started — blocked on §3 point 6's schema gap + finishing `required_field_mapping` |
| 4 | `platform_publish` passed, evidence validated vs `m.post_publish` | ❌ not started |

**To reach Migrate's finish line, in order:** (a) PK design decision on fixed-vs-variable slide count
(§3 point 6); (b) schema extension for sequence-shaped Capability Contracts (§4, Schema); (c) complete
`required_field_mapping` on the 3 existing variant candidates (or new ones, if (a) changes the
template set); (d) author + PK-ratify the Capability Contract(s); (e) `creative-graph-auditor`
static-audit pass on the extended registry; (f) worker code change (image-worker carousel block) +
`ef-builder`/`branch-warden`/tests, isolated worktree; (g) Rung 3 proof (a real, non-publishing or
gated platform render); (h) PK visual approval on the Rung-3 output; (i) Rung 4 proof (a real
production publish, evidence-validated); (j) only then does `select_template` actually get wired in
for carousel — until (j), any earlier step is preparation, not a live behaviour change, matching the
"declarative only, no runtime change" discipline registry-schema-v2 §6 requires throughout.

**For Retire:** no proof ladder — it's a config/governance apply (T2 DML), proof is the standard
post-apply CAS/re-verification pattern used for CFW/Invegent (M11b §4.2), not a render proof ladder.

---

## 6. Migration and rollback cost

**Migration cost — lower than M11b's own (DB-access-free) estimate implied**, because the TMR
groundwork already exists further along than assumed:

| Step | Tier | Notes |
|---|---|---|
| (a) PK slide-structure decision | — | a decision, not a build lane |
| (b) Schema extension (sequence contracts) | T2 (design) | the one genuinely novel piece; affects `registry-schema-v2.md` + `creative-graph-auditor` |
| (c) Finish `required_field_mapping` | T1/T2 | scope unknown — not independently sized this session (flagged gap, not estimated) |
| (d) Author + ratify Capability Contract(s) | T1 (docs) | reuses (b)'s new schema shape |
| (e) `creative-graph-auditor` pass | T1 | existing tool, new check needed for (b)'s shape |
| (f) Worker code change | T2 | isolated worktree, `ef-builder` + `branch-warden` + tests — the carousel block is self-contained (lines 1208-1256), bounded blast radius |
| (g)-(i) Proof lane (Rung 3-4) | T2/T3 | real render + PK visual gate + real publish, evidence-validated |

Rough shape: **1 design lane + 1-2 registry/docs lanes + 1 code lane + 1 proof lane** — smaller than
"its own big design-gate lane" framing in D2/M11b, which is fair given neither had visibility into the
existing TMR inventory. Still real, multi-lane work, not a same-day fix.

**Rollback cost — low, for every step.** The legacy render path is not being deleted at any point
before step (j) actually flips it off — it keeps running until the governed path is proven and wired
in, so every step through (i) is reversible by simply not proceeding to (j). Once (j) lands, rollback
is a worker-code revert (git revert the `select_template` wiring, restore `buildCarouselSlideScript`)
— no DB rollback needed, since `m.post_carousel_slide`'s shape is unchanged either way (§4, Publish).
No rollback table exists for the D2 governance row or any TMR carousel object today (§2, fresh check)
— none is needed, since every step here is additive (new contract/registry objects) until (j).

**Retirement cost** — one T2 DML apply (2 rows: `client_format_config.is_enabled=false` +
1 governance row), same proven pattern as CFW/Invegent (M11b §4.2). Technically cheap. **Not** cheap
in content-mix terms — see §8.

---

## 7. Operational risk of retaining legacy (Option B / status quo)

- **`tmr-drift-probe-daily` confirmed `status='error'` on all 15 sampled runs (2026-07-21→2026-08-04)**,
  citing the exact disclosed cause (`declarative_registry_ref_missing` for PP's D2 row) every time —
  a real, live, ongoing effect, not hypothetical. **Important correction to how this should be read:**
  the same daily run *also* fails on two unrelated causes (an NDIS pattern-shape mismatch, a CFW 404) —
  so retaining or even retiring PP's carousel governance row **alone** would not turn the probe green;
  don't let this packet's disposition carry more probe-health weight than it actually has. Separately:
  at the `pg_cron` orchestration layer the job shows `latest_run_status='succeeded'` with no active
  alert — the daily error is invisible to cron-level health monitoring (a documented gap on that
  monitoring table, not new), so this is a quiet, easy-to-forget failure mode, not a paged one.
- **The render path is entirely outside static-audit and QA coverage.** `creative-graph-auditor`
  audits the declarative registry graph — the legacy pipeline isn't in it (never wired to
  `select_template`). `actions/render-qa.ts`'s `QA_V0_CREATOMATE_FORMATS` explicitly excludes carousel
  (M11b §1.1). Content is Claude-generated per-render with no fixed structure and no evidence spine
  (`m.post_render_log` isn't written for this path) — correctness regressions here would be invisible
  to every governance mechanism this project has built.
- **Policy risk:** the ratified M11 rule (§0 item 4) does not treat "retain indefinitely" as a
  self-justifying default — it requires an affirmative, recorded exception. Continuing without one is
  a standing, low-grade non-compliance with CGU Final's own closing rule, not neutral.
- **No new risk from the D2 row itself beyond the drift-probe noise** — confirmed unchanged, no grant/
  RLS/exposure issue (fresh advisor scan, this session).

---

## 8. Retirement impact (Option C)

- **Real, current production loss, scoped to Facebook + Instagram.** 45 drafts/90d, 31 published
  (16 FB + 15 IG, current and live — §2.1), 247 slides/90d — this is not a decayed, historical format
  like NDIS's or CFW's; it is actively producing on those two platforms. Retirement is the only option
  here with a genuine, immediate content-mix cost, unlike CFW/Invegent's retirements (M11b §2.3/§2.4),
  which formalised an *already-contained*, already-near-zero state. LinkedIn is excluded from this
  figure — it has been dormant since 2026-06-15 regardless of this decision (§2.1), so retiring PP
  carousel costs nothing on LinkedIn specifically.
- **Content would redistribute, not disappear**, per PP's other currently-enabled formats
  (`client_format_config`, fresh read): `text`, `image_quote`, `video_short_kinetic`,
  `video_short_stat` remain enabled. The advisor would route "3+ structured points" content to one of
  these instead — most likely `image_quote` or a video format, not a 1:1 replacement for the
  multi-slide carousel presentation.
- **Operator-visible change**: the format disappears from the Client Schedule tab's
  `PublishingPlanPyramid` (M11b §1.1) — a real, if small, dashboard-visible shift, not a silent one.
- **Mechanically cheap, well-precedented** (§6) — the actual apply is low-risk; the cost here is
  entirely upstream, in the marketing/content-mix judgment, not the engineering.

---

## 9. Recommended disposition and acceptance criteria

**This packet's reading of its own evidence: Migrate is the better-supported default** under the
ratified M11 rule — carousel is active, current, and not disproportionately expensive relative to
what was previously assumed (§6), because real TMR groundwork already exists, stalled rather than
absent. Retire remains a legitimate, PK-available choice if the schema-extension work (§3 point 6,
§6b) is judged not worth it against ~10 published posts/month — that is a proportionality call this
packet surfaces but does not make.

**Acceptance criteria, either way:**

**If Migrate:**
1. PK slide-structure decision recorded (§5a) before any registry/contract work starts.
2. Schema extension for sequence-shaped Capability Contracts lands as its own docs-only T1/T2 lane,
   reviewed by `creative-graph-auditor`, before any contract is authored against it.
3. All 3 (or redesigned) variant candidates reach `required_field_mapping_status='complete'` and a
   real Capability Contract is PK-ratified for each governed slide role.
4. Rung 3 (`platform_render`) and Rung 4 (`platform_publish`) proof events exist with real
   `render_log_id`s before `select_template` is wired into `image-worker`'s carousel block.
5. `m.post_carousel_slide`'s shape is preserved (or the publish-side impact is re-assessed and
   re-verified zero, per §4) so `publisher`/`instagram-publisher` need no change.
6. Legacy `buildCarouselSlideScript` path stays live and reachable (not deleted) until Rung 4 proof
   is PK-accepted — the switch-over is the last step, not an early one.
7. Post-migration: D2's `declarative_registry_ref` gets populated (closes the `tmr-drift-probe`
   cause named in §7, though not the other two unrelated causes) and the governance row is updated to
   reflect the real registry entry, not left pointing at the retired legacy `contract_ref`.

**If Retire:**
1. Same proven pattern as CFW/Invegent (M11b §4.2): `client_format_config.is_enabled=false` +
   1 new `client_creative_governance` row recording the retirement, with an honest `contract_ref`
   (this is a real retirement of a live route with genuine volume — the `contract_ref` and any result
   doc should say so plainly, not borrow Invegent's "never live" framing, per M11b §2.4's own
   distinction).
2. Fresh `db-rls-auditor` pre-apply read confirming current state unchanged since this packet.
3. CAS-asserted no-volume-increase guard through the apply, reusing the v11/M11b pattern.
4. `apply-harness-auditor` shadow pass + `branch-warden` safe + full T2 chain, PK apply gate (hard
   stop, DML).
5. Content-mix impact (§8) explicitly acknowledged in the apply's own result doc, not silently
   absorbed into a generic "closure" framing.

**Neither path is authorised by this packet.** Whichever PK selects needs its own fresh Gate-1 brief.

---

## 10. Related lanes — held, not touched by this packet

M11b's Seed Packets A (NDIS formal governance closure) and B (CFW+Invegent fence-hardening +
retirement) remain **queued, not started**, per standing instruction: both stay held until the active
seven-day schedule-expansion monitoring watch closes (armed 2026-08-04 ~20:20 Sydney → 2026-08-11
~20:20 Sydney, `docs/00_sync_state.md` v6.130). This packet does not open, scope-expand, or advance
either — noted here only because whoever eventually authors A/B's own Gate-1 briefs must **explicitly
account for the `tmr-drift-probe` side effect**, and this session's fresh evidence changes that
accounting in one respect worth carrying forward: **the probe's daily `error` status is not
attributable to any single client's governance row** — PP's D2 row, an NDIS declarative-registry
shape mismatch, and a CFW 404 all fire independently on every sampled run. A/B's packets should not
frame "add a governance row for NDIS/CFW" as something that will turn the probe green — it won't,
until the still-open `tmr-drift-probe` Option-B patch (skip-if-unresolvable-registry-ref, named in D2
§8 and M11b §7) lands, independent of A/B/C's own dispositions.

---

## 11. Stop condition

This decision packet is complete. Per this lane's own instruction, **no PP schedule, configuration,
governance row, template, or production route was mutated in producing it.**
Report to PK for review; do not begin implementing Migrate, Retain, or Retire without a fresh,
separate Gate-1 brief and PK approval.
