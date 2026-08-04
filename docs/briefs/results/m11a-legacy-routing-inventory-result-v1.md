# Result M11a — Legacy-routing inventory (governed vs legacy, per committed cell)

**Brief file:** `docs/briefs/m11a-legacy-routing-inventory-seed-packet-v1.md`
**Executed by:** chat (Claude Code orchestrator) + `Explore` (static code) + `db-rls-auditor` (live DB evidence, read-only)
**Completed:** 2026-08-04 Sydney

---

## 1. Result status

`Complete` — with two findings that go **beyond** the brief's own anticipated scope and are
flagged for PK before the §6 schedule-expansion approval, not silently absorbed into this
inventory's routine output.

## 2. Commit(s)

N/A — this result doc is the only new file; no DB/repo mutation occurred (read-only throughout,
per the brief's own Forbidden actions, confirmed §5 below).

## 3. Files changed

- `docs/briefs/results/m11a-legacy-routing-inventory-result-v1.md` — created (this file).

## 4. Actions taken

- Re-confirmed the brief's own static code citations (`B1_VIDEO_GOVERNED_FORMAT`/
  `B1_VIDEO_KINETIC_GOVERNED_FORMAT` strict-`===` fallthrough, `image_quote`'s governed fork,
  carousel's D2 declared-legacy-pipeline pattern, `kinetic_voice`'s format-list-only eligibility).
- **Resolved the brief's one open static question:** grepped and read
  `supabase/functions/ai-worker/index.ts:651-684` and
  `supabase/migrations/20260801120000_backfill_readiness_queue_governed_exempt_rider_v1.sql` —
  `text`'s "governed-exempt rider" (D1) is real and named exactly that in the migration filename.
  `text` is **capability-exempt** (`render_engine='none'`), not a `select_template` governed/legacy
  fork at all — `public.is_capability_exempt_format('text')` live-confirmed `true`.
- Ran `db-rls-auditor` (read-only) against `c.client_creative_governance` (the full governance
  ledger, all rows, all 4 clients × 5 formats) and `m.post_render_log`/`m.post_draft`/
  `m.post_publish` for 90-day real-occurrence evidence per cell, using `render_spec ? 'template'`
  as the governed/legacy discriminator (TMR/`select_template` audit block present vs absent/null).
- Cross-referenced live occurrence evidence against the governance ledger's row-creation
  timestamps per client×format, which surfaced **Finding 2** below (a routing pathway the brief
  did not anticipate).
- Cross-referenced carousel's real production volume against governance-ledger coverage across
  all 4 clients (not just PP), which surfaced **Finding 1** below.

## 5. Constraints confirmed

- No DDL/DML of any kind — confirmed; every query was `SELECT`, zero writes.
- `kinetic_voice`'s format-list memberships were inventoried, not modified — confirmed.
- No other CGU Final must-have work (M1/M2/M4/M6/M7/M8/M9/M10/M12/M13/M14/M16/M18) was touched —
  confirmed, this session was scoped to M11a only.
- This inventory's completion is **not** treated as authorisation to expand schedule volume (§6)
  — confirmed; if anything, Finding 1 below argues for *more* caution before that approval, not
  less.
- PP's carousel declared-legacy-pipeline pattern was reported as its own category, not folded into
  "governed" — confirmed, and extended into a second new category (Finding 1) the brief's original
  four-way taxonomy didn't name.

---

## 6. Per-cell inventory (25 committed cells)

Discriminator: `render_spec ? 'template'` in `m.post_render_log` (true = live `select_template`/TMR
audit evidence present; false/null = legacy-composed or pre-governance). Counts are 90-day,
succeeded renders unless noted.

| Client | Format | Platform(s) | Real-occurrence verdict | Evidence |
|---|---|---|---|---|
| property-pulse | `image_quote` | FB, IG, LI | **GOVERNED** | Cutover 2026-06-24 (predates the governance row, 2026-07-07 — a pre-existing hardcoded PP gate the table later formalised, per `image-worker/index.ts:1079-1082`). 64 governed / 89 legacy(pre-cutover) succeeded, 90d. |
| ndis-yarns | `image_quote` | FB, IG, LI | **GOVERNED** | Cutover ~2026-07-18 (governance row 2026-07-18). 23 governed / 83 legacy(pre-cutover). |
| care-for-welfare-pty-ltd | `image_quote` | FB, IG, LI | **GOVERNED** | Cutover ~2026-07-22 (governance row 2026-07-20). 18 governed / 93 legacy(pre-cutover). |
| invegent | `image_quote` | FB, IG, LI | **GOVERNED** | Cutover ~2026-07-23 (governance row 2026-07-20). 19 governed / 108 legacy(pre-cutover). |
| property-pulse | `text` | FB, LI | **CAPABILITY-EXEMPT** | `is_capability_exempt_format('text')=true`; no `select_template` fork exists by design (render_engine='none'). 4 FB / 66 LI published, 90d — real occurrences confirmed, correctly exempt, not silently blocked. |
| ndis-yarns | `text` | FB, LI | **CAPABILITY-EXEMPT** | Same. 19 FB / 66 LI published. |
| care-for-welfare-pty-ltd | `text` | FB, LI | **CAPABILITY-EXEMPT** | Same. 1 FB / 10 LI published. |
| invegent | `text` | FB, LI | **CAPABILITY-EXEMPT** | Same. 3 FB / 49 LI published. |
| property-pulse | `carousel` | FB, IG | **DECLARED-LEGACY-GOVERNED** | Governance row exists (`property_pulse.carousel.legacy_pipeline`, D2, 2026-08-02); 100% of sampled succeeded renders have `render_spec IS NULL` (never `select_template`-routed, exactly as D2's migration states) — but the legacy route **is** declared/owned. FB 129/38, IG 127/11 (succeeded/failed), 90d. |
| property-pulse | `video_short_stat` | YouTube | **MIXED — transitioning, was legacy** | Governance row created 2026-07-09. True-governed: 3 succeeded (07-10→07-27) + 5 governed-path-but-timed-out. Legacy: 1 succeeded pre-cutover (06-24), 6 failed. `_voice` variant: 100% legacy (7 occurrences, all statuses) — permanent, code never matches it. |
| ndis-yarns | `video_short_stat` | YouTube | **MIXED — just switched on** | Governance row created 2026-08-02 (2 days before this audit). 1 true-governed succeeded (08-02); 1 legacy succeeded pre-audit (05-07). `_voice` variant: 100% legacy (2 occurrences). |
| property-pulse | `video_short_kinetic` | YouTube | **MIXED — was legacy until 3 days before this audit** | Governance row created 2026-08-01. True-governed: 1 succeeded (08-03) + 1 governed-path failed same day. Legacy-despite-base-key-match: 11 succeeded (06-24→07-26) + 8 succeeded pre-audit (05-06→06-15). `_voice` variant: 100% legacy (15 occurrences across statuses) — permanent. |

**Naming-trap variants, explicitly confirmed:** `video_short_stat_voice` and
`video_short_kinetic_voice` never carry `select_template` evidence in any of the 24 sampled rows
across both clients/both formats (0/24) — 100% legacy, matching the static
`B1_VIDEO_GOVERNED_FORMAT`/`B1_VIDEO_KINETIC_GOVERNED_FORMAT` strict-`===` fallthrough at
`video-worker/index.ts:1628,1641,1645-1646`. This is permanent (a code-level exclusion), not a
transition-in-progress state like the base-key rows above.

**`kinetic_voice` eligibility-location handoff (for a future M11b closure lane):**
`ai-worker/index.ts:346`, `youtube-publisher/index.ts:306`, `image-worker/index.ts:607`, publisher
`asset_backstop.ts` files, and the `VIDEO_FORMATS`/`ELIGIBLE_FORMATS`/`isKinetic` checks in several
migrations. No `classify_format_capability` entry exists (checked both
`20260728034955_classify_format_capability_v1.sql` and
`20260729120000_classify_format_capability_v2_publisher_path.sql` — no match in either) — DB
evidence independently confirms zero true-governed `kinetic_voice` occurrences (0/15 PP, 0/9 NDIS,
90d), consistent with "eligibility without implementation."

---

## 7. Findings beyond the brief's original scope — flag for PK before §6 approval

The brief's own four-way taxonomy (governed / legacy / declared-legacy-governed / capability-exempt)
did not anticipate either of these. Both were surfaced by live DB evidence, not assumed.

### Finding 1 — Carousel is real, high-volume production for 3 of 4 clients with ZERO governance declaration

The Final proposal's own baseline (§1/§6.1) describes carousel as "PP FB/IG state-1 via D2;
NDIS/CFW deferred" — implying only PP has live carousel activity worth tracking. **Live evidence
contradicts that premise.** In the same 90-day window:

| Client | Carousel activity (succeeded/failed) | Governance row? |
|---|---|---|
| property-pulse | FB 129/38, IG 127/11 | **Yes** — declared-legacy (D2) |
| care-for-welfare-pty-ltd | FB 11, IG 60/4, LI 100/4 (171 succeeded) | **None** |
| ndis-yarns | FB 57/4, IG 32/1 (89 succeeded) | **None** |
| invegent | LI 5 succeeded | **None** |

All three non-PP clients run the **identical** `render_spec IS NULL` legacy carousel path as PP —
but unlike PP, they have no `c.client_creative_governance` row of any kind, not even PP's own
declared-legacy declaration. This is a **third category** the brief's taxonomy didn't name:
**UNDECLARED-LEGACY** — real, substantial, ungoverned production with no governance-table record
at all. CFW's 171 succeeded carousel renders in 90 days is not a marginal or edge-case volume.

**Why this matters for §6:** the schedule-expansion plan's own baseline (§6.1) currently reads
carousel as a PP-only concern. It is not. Any expansion mix touching CFW/NDIS/Invegent should
account for this undeclared volume, not treat those clients' carousel activity as dormant.

### Finding 2 — A third legacy pathway: base-key format matches are not reliably governed either

The brief's known trap was the `_voice` suffix (permanent, code-level exclusion). Live evidence
surfaced a **second, time-bound** legacy pathway: even an exact base-key match
(`fmt === 'video_short_stat'`/`'video_short_kinetic'`, no `_voice` suffix) legacy-routes until that
client's `c.client_creative_governance` row actually exists — the code match alone is necessary
but not sufficient. Per-client cutover evidence:

- PP `video_short_stat`: governed only from 2026-07-09 on (governance row date) — everything
  before, despite a matching format key, is legacy.
- PP `video_short_kinetic`: governed only from 2026-08-01 on — **3 days before this audit ran.**
  11 base-key-matched succeeded renders (2026-06-24→07-26) were legacy despite the "right" format
  key, simply because the governance row didn't exist yet.
- NDIS `video_short_stat`: governed only from 2026-08-02 on — **2 days before this audit ran.**

**Reconciliation against the prior "2 of 44" figure** (Final proposal §1, from the CGU-v1 readiness
audit): this session's distinct-draft count for PP YouTube video_stat/kinetic is 47 (vs. 44 cited
— explained by 3 additional elapsed days), and the true-governed count is now 5 (not 2) —
consistent with PP kinetic's governance row having been created 2026-08-01, inside this audit's
own 90-day window, adding new governed occurrences since the prior count ran. **Direction and
severity are confirmed, not contradicted** — a small minority of real occurrences are governed,
the `_voice` trap is real and ongoing, and it is now clear the trap is compounded by a second,
narrower "governance-row-doesn't-exist-yet" legacy window per client.

## 8. Open issues

- Finding 1 (carousel) and Finding 2 (base-key pre-governance legacy window) are new information
  that should inform M11b's scoping and, per PK's own sequencing directive (§0f), the §6
  schedule-expansion plan's approval — neither is resolved by this inventory itself.
- `db-rls-auditor`'s own verdict on this pass was `concerns` (not `clean`) — specifically because
  of Findings 1 and 2, not because of any defect in the read-only method itself. No DB/repo
  mutation occurred; the "concerns" describes production state, not this session's conduct.
- Not independently re-verified: whether `image_quote`'s governed cutover is simultaneous across
  FB/IG/LI within a single client (inferred from the code citation that the gate is
  client+format-scoped, not platform-scoped — not independently re-derived from a platform-split
  query). Low risk given the code citation, but named rather than silently assumed.
- `ndis-yarns × video_short_kinetic` (not a committed matrix cell — kinetic is PP-only) also shows
  real recent occurrences, 100% legacy, zero governance declaration — the same shape as Finding 1
  but for a non-committed cell. Noted for completeness, not scored against the 25-cell baseline.

## 9. Next recommended step

Two parallel next steps, neither of which is authorised to start by this inventory alone:

1. **M11b scoping** (per §3/§4 of the Final proposal) — this inventory is the sizing input it was
   built for. The real scope is larger than "2 known `_voice` naming-trap variants": it now
   includes the base-key pre-governance-row window (Finding 2) and the undeclared-legacy carousel
   clients (Finding 1).
2. **PK review before §6 approval** — Findings 1 and 2 are exactly the kind of evidence the §0f
   sequencing directive asked M11a to surface before the schedule-expansion plan is approved.
   Recommend PK see both findings before ruling on any §6 mix, especially any mix touching CFW,
   NDIS, or Invegent carousel volume.

---

## 10. Verification (chat fills this)

**Verdict:** `Pass with notes` — the inventory itself is complete and every success criterion in
the brief is met (per-cell table, naming-trap confirmation, `kinetic_voice` location handoff,
`text` exemption confirmed, zero mutations). The "notes" are Findings 1 and 2, which exceed the
brief's own anticipated scope and are surfaced explicitly rather than smoothed into routine output.

**Notes:**
- Output matches the brief's success criteria in full.
- Constraints respected — confirmed §5 above.
- No unexpected files changed — only this result doc.
- New risks: Finding 1 (undeclared carousel legacy volume, 3 clients) and Finding 2 (base-key
  pre-governance legacy window) — both flagged for PK, neither silently resolved.
- Follow-up: M11b scoping should treat this result doc, not the original brief's own naming-trap
  count, as the authoritative starting scope.

## 12. Addendum (2026-08-04, same day) — carousel-provenance investigation, per-client disposition

Prompted by this result's own Finding 1 (undeclared-legacy carousel volume, 3 non-PP clients) and by
PK's direct instruction not to trust `client_format_config` as protective for the
`post-cgu-v1-optimum-schedule-expansion` apply packet without proving the production lineage first. Four
parallel read-only investigations (one per client, `db-rls-auditor`, zero mutations) extended Finding 1
with the exact upstream control per client and a live-vs-historical disposition:

| Client | Disposition | Real control (verified in code, not assumed) |
|---|---|---|
| property-pulse | `live_legacy_route` | `c.client_format_config` row `config_id=fc339e1e-5809-4b9c-9c03-2c60a4166a80` (`carousel`, `is_enabled`) — consumed at `ai-worker/index.ts:1193-1196`. Genuinely live (40 drafts/90d, most recent ~9d old at investigation time), matches this result's own D2 declared-legacy finding. Not touched by the schedule packet, by design — this is the intentionally-accepted declared-legacy route. |
| care-for-welfare-pty-ltd | `historical_route_now_contained` | `c.client_format_config` row-presence itself: zero rows → fail-open (all buildable formats offered); CFW went from 0 rows to 2 (`image_quote`,`text`, both `is_enabled=true`) on 2026-08-02, which flips `ai-worker/index.ts:1192-1197`'s `NOT EXISTS` fallback to a strict allowlist, structurally excluding carousel. Zero carousel activity in 7d/14d. **Fragility:** holds only while those 2 rows continue to exist — deletion (not disablement) would silently reopen the full palette. |
| ndis-yarns | `live_legacy_route` | Same `client_format_config` mechanism, but NDIS's `carousel` row (`config_id=61e4f143-f0cf-4a9b-853c-f592daf82aaf`) is still `is_enabled=true` — never touched. Current silence (0 activity in 7d/14d) is an **incidental** render-time `select_template` fail-closed gap (no live template resolves for NDIS carousel today), not a deliberate control — could resume the moment a template graduates, with zero further change. The schedule packet's own carousel-protection assertion checked CFW's config row instead of NDIS's own — a real bug, now corrected in packet v5. |
| invegent | `historical_route_now_contained` | Same row-presence mechanism as CFW (0→2 rows, 2026-08-02), holding 8/8 real drafts since. Additional correction to this result's own §6 table: Invegent's "5 succeeded" carousel-render figure reflects successful *slide-image renders*, not delivered carousel posts — 2 drafts were voided pre-publish and 3 were silently downgraded to plain text by a since-fixed (v1.3.0, 2026-07-06) Zapier bridge bug. Zero real carousel posts were ever delivered for Invegent. Same fragility caveat as CFW (row-deletion would reopen). LinkedIn additionally carries an independent downstream backstop (`linkedin-zapier-publisher`'s hard `text\|image` allowlist); Instagram does not — a defense-in-depth gap, not a live route. |

**Also confirmed, independently, across all four investigations:** `c.client_publish_schedule.format_override`
is **never read by any edge function in this repository** (repo-wide grep, zero matches) — it is dead
code with respect to format selection. The live, effective gate for every client is exclusively
`c.client_format_config`. This means the schedule-mutation apply packet's `format_override` writes
change posting cadence/mix among already-eligible formats, but cannot themselves open or close carousel
eligibility in either direction — confirmed structurally, not just by absence of a counterexample.

**Follow-up recorded, not actioned here:** NDIS's carousel `client_format_config` row is being frozen
(`is_enabled=false`) as part of packet v5, closing this result's Finding-1 gap for that one client. PP
remains intentionally untouched (already declared, D2). CFW/Invegent's fragility (row-deletion reopens
the palette) is now an explicit assertion in packet v5 rather than an unmonitored assumption. This
addendum does not re-open or re-score M11a's own completion — it supplements Finding 1 with the
per-client mechanism detail M11b scoping will need.

## 11. Learning notes (chat fills this)

- The brief's own taxonomy (governed/legacy/declared-legacy-governed/capability-exempt) was a good
  starting hypothesis but incomplete — real evidence surfaced a genuine 5th/6th category
  (undeclared-legacy, and a governance-row-timing window). Future inventory-shaped briefs in this
  programme should expect live evidence to expand, not just fill in, their starting taxonomy.
- Cross-referencing governance-ledger row-creation timestamps against occurrence-level evidence
  (not just "does a row exist now") was what surfaced Finding 2 — a reusable pattern for auditing
  any governance cutover in this codebase, not just this one.
