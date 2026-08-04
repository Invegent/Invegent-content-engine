# post-cgu-v1-optimum-schedule-expansion — Frozen Apply Packet v11

**Status: FROZEN FOR REVIEW. NOT AUTHORIZED FOR LIVE APPLY. A PK execution gate follows review
completion. v11 is the sole authoritative packet for this lane — v10 is superseded.**

## v11 fixes (2026-08-04) — closes both `apply-harness-auditor` findings from the v10 round

v10's final review round returned CONCERNS with 2 findings, neither in the SQL logic that had already
been verified clean five times over, but one of them real and structural:

- **AHA-10-1 (medium, a genuine row-scope gap — fixed):** Changes 1, 2, and 10 (75 of the 111 rows)
  previously verified their own final state using a subquery that re-derived `client_id`/`platform`
  from the *same live row being checked*, rather than an independent, frozen record — unlike Changes
  3–11, which already had per-ID protection via `_expected_final_state`. A wrong-owner row (a
  `schedule_id`/`config_id` that existed live but under a different client than assumed) would have
  been silently skipped by the guarded `UPDATE` *and* silently passed by the self-referential
  post-assertion, with only the aggregate 102/9/111 CAS counts as a backstop — and those check row
  *existence*, not row *ownership*. **Fixed**: a new frozen dataset, `_expected_ownership_schedule`
  (67 rows) and `_expected_ownership_config` (8 rows), pins `row ID → expected client_id → expected
  client_slug → expected platform → expected pre-state → expected after-state` as literal values,
  authored independently of `_pre_image` and of the live tables. A new pre-check (§3.2, "5b") joins
  this dataset to the live tables and requires an exact 67/8 match on ownership+pre-state before any
  mutation runs; the guarded `UPDATE`s for Changes 1, 2, and 10 now `JOIN` to this dataset instead of
  `_pre_image`; the post-assertions independently re-join the same dataset and check both the final
  value AND that no row went missing or was reassigned. Any missing, extra, or wrong-owner row is now
  a terminal STOP at three separate points (pre-check, guarded UPDATE scope, post-assertion), not zero.
  **Before writing this fix, every literal client/platform mapping in the new dataset was independently
  re-verified against a fresh live query** — this caught and corrected a real transcription error in
  the first draft of the Change-10 ownership mapping (the NDIS-vs-PP config_id assignment was
  initially reversed), confirming exactly why this class of independent verification matters.
- **AHA-10-2 (low, cosmetic — fixed):** §5's closing line claimed all 12 automatic STOP conditions
  fire "via `RAISE EXCEPTION`" — condition 12 (rollback-table collision) actually fires via a native
  PostgreSQL DDL error on the bare `CREATE TABLE`, not an application-level `RAISE EXCEPTION`. Same
  functional outcome (transaction aborts, no partial apply), now described accurately.

**Nothing else changed from v10**: the 111-row manifest, all 11 approved mutations and their exact
after-values, the before/after volume matrix, the readiness expected-after matrix and its named
exception list, the rollback content (values — only the pre-existing v10 table names are referenced
unchanged), the carousel-containment protections, the 3 supervised-only-cell exclusions, and the §5
dashboard acceptance requirement are all byte-identical in substance to v10.

**The separate isolated-worktree packet lineage has been placed on a PK-directed read-only hold** — no
further commit, edit, or independent evolution of that lineage is authorized. This is recorded as a
statement of PK's authority over that lineage, not a technical control this document can enforce on
another session; the pre-freeze `branch-warden` check for this round independently confirms (or flags,
if not) whether that worktree has in fact stayed still since the hold was declared — see §7 (review
results) for the actual observed state, reported honestly either way.

---

## Provenance (v10 and earlier — PK-directed union, 2026-08-04, carried forward)

Two independent lineages each produced their own complete version of this packet in parallel — a
shared-default-worktree lineage (v3→v9) and an isolated-worktree lineage (its own "v5", independently
reviewed to a clean PASS/zero-findings, later self-amended in place to port 4 of v8's protections as
commit `e76391b`). A read-only convergence check found both target the identical 111 rows and produce
identical mutation outcomes, but each had independently closed real safety gaps the other had not —
and, after the first merge (v9, 3 protections), the two lineages diverged again in opposite directions:
v9 had a rollback-collision fix the isolated lineage lacked; the isolated lineage had a client-identity
resolution fix and a per-row readiness check that v9 lacked.

**PK ruled: v10 is the union of both — all five converged protections, in one document, superseding
every prior version of this packet in either lineage.**

**The five converged protections, all present in v10:**

1. **PP carousel real-lever assertion** (from v8, already in v9) — `client_format_config`'s carousel
   row for PP (`fc339e1e-5809-4b9c-9c03-2c60a4166a80`) asserted byte-identical before/after, the actual
   eligibility gate, not the schedule-row-count proxy alone.
2. **CFW/Invegent config-row existence guards** (from v8, already in v9) — both clients' 2 containing
   `client_format_config` rows (`image_quote`,`text`) asserted present and enabled, count exactly 2,
   before and after; row deletion (not disablement) is the actual fragility this protects against.
3. **Rollback collision safety** (from v8, already in v9) — durable rollback tables created with a bare
   `CREATE TABLE`, no `IF NOT EXISTS`; a naming collision aborts the whole apply transaction instead of
   silently reusing possibly-stale pre-image data. **v10 additionally renames these tables with a
   unique v10 identifier** (fixing a v9 finding: v9 reused a table name containing the literal string
   `_v5_`, which could collide with the isolated lineage's own, separate, still-live v5 packet).
4. **Live client-identity resolution** (ported from isolated-worktree commit `e76391b`, new in v10) —
   before any mutation, all 4 client_ids are independently re-resolved from `c.client` by slug via
   `SELECT ... INTO STRICT`, using Postgres-native `NO_DATA_FOUND`/`TOO_MANY_ROWS` exception handling
   (a literal single-row-per-slug guard, not an aggregate count), then cross-checked against this
   document's pinned UUIDs. This is the direct fix for the fabricated-client-id failure class that
   caused a real defect earlier in this session's shared-worktree lineage (v3).
5. **Per-row readiness-queue validation, expected-after matrix** (ported from `e76391b`'s concept,
   redesigned per PK's explicit instruction — see §3.2 "Protection 5" and §1.5) — not a blanket
   "nothing may go non-ready" check (which would false-positive on this packet's own intended Layer-2
   demotions and NDIS carousel closure), and not the old, coarser "aggregate ready-count must not
   decrease" check either (removed in v10, superseded by this precise version). Instead: any cell that
   regresses from `ready` to not-`ready` is checked against a **named exception list** — the 3
   supervised-only cells and NDIS carousel are the only permitted regressions; any other regression, or
   any unexpected new appearance, is a STOP.

**v9's own 2 findings, also fixed in v10:**
- Rollback table naming collision risk — fixed by protection 3's rename (above).
- Rollback prose inaccuracy (claimed the row-existence `DO` block is the first failure point when the
  preceding `UPDATE ... FROM` statements would themselves error first if the durable tables never
  existed) — corrected in §3.4.

**Explicitly declared: v5 (both the isolated worktree's original and its `e76391b` amendment), v8, v9,
and v10 are all SUPERSEDED and EXECUTION-INELIGIBLE as of this document.** None of them should be used
at any future execution gate — v11 supersedes all of them as the sole authoritative packet for this
lane. **The isolated worktree's independent packet lineage is on a PK-directed read-only hold** — no
further amendment to that lineage is authorized; v11, assembled here without touching that worktree, is
where this work continues. (Per standing practice all session, the isolated worktree itself was not read from or written
to beyond the read-only inspection already reported to PK — this declaration is recorded here, in the
authoritative document, not by editing that worktree's files.)

**Preserved unchanged from the prior lineages, per PK's explicit instruction:** the same 102 schedule
rows + 9 config rows (111 total), the same 11 approved mutations and their exact after-values, the same
before/after volume matrix (98→31/week NDIS), the same 3 supervised-only-cell exclusions, and the same
§5-item-8 dashboard acceptance requirement.

---

## 0. Corrections from v4 (v5's own history — unchanged, carried forward verbatim)

`apply-harness-auditor`'s review of v4 (isolated-worktree copy) returned **INCOMPLETE** with 5
findings. Each was closed in v5, not merely narrated as closed:

1. **AHA-01-1 (§2.1 arithmetic gap, 59/31 vs claimed 67/39) — CLOSED.** Every one of the 67 removed
   NDIS rows now has an exact `schedule_id` and a verified-live `format_override` category — see
   the rebuilt §2.1 table and its full per-row appendix.
2. **AHA-02-1 (Changes 3–9 lack client/platform preconditions) — CLOSED.** Every `UPDATE` in §3.2
   for Changes 3–9 now carries an explicit `AND client_id = '<X>' AND platform = '<Y>'` guard.
3. **AHA-03-1 (6 of 9 cells lack post-state assertions) — CLOSED.** §3.2's post-assertion block now
   verifies the exact final state of every one of the 111 touched rows.
4. **AHA-04-1 (execution channel not named) — CLOSED.** §3.2 and §3.4 (rollback) each now name the
   exact required channel: one `mcp__supabase__execute_sql` call per script, never split.
5. **AHA-05-1 (Change 11 rollback not integrated/proven) — CLOSED.** §3.4's post-assertion includes
   a named, specific check that Change 11's config row restores to `is_enabled=true` exactly.

**Second-round findings (same-day re-review, before v5's own freeze) — both CLOSED:**

6. **AHA-06-1 (Change 10 lacked the client-identity guard every other change already carries) —
   CLOSED.** Change 10's `UPDATE` and its post-assertion both add `AND client_id IN (...)`.
7. **AHA-07-1 (rollback's generic checks only validated matched rows, not restoration
   completeness) — CLOSED.** §3.4 now asserts row-existence counts before the value-mismatch check.

**Fresh live re-verification, 2026-08-04:** all 111 target rows (102 schedule + 9 config) reconfirmed
in their assumed pre-image state. Manifest reconfirmed: **102 schedule rows + 9
`client_format_config` rows = 111 total.**

---

## 1. Structural enforcement (PK items 1 & 2 — not prose, mechanism + assertion)

### 1.1 Fleet carousel — classification and proof (unchanged across all versions)

**Confirmed live legacy scope: PP, NDIS, and CFW all carry real `carousel` production/history.**
Invegent shows a small amount (5 renders, one draft, 90+ days ago) but carries no live exposure
channel and is excluded from further scope.

**Classification for PP, NDIS, and CFW: `legacy_routed / frozen_pending_M11b`.**

| Client | Evidence | Live status (as of 2026-08-04) |
|---|---|---|
| Property Pulse | `render_spec IS NULL` on every FB/IG carousel render; `c.client_creative_governance` declares it governed-legacy (D2) | **Live, ongoing, committed cell.** This packet touches zero PP FB/IG rows. Its real eligibility lever (`client_format_config`) is directly asserted, §1.5, protection 1. |
| NDIS-Yarns | `render_spec IS NULL` on every carousel render (89 succeeded/90d, last render **2026-07-20**); `c.client_format_config` still has `carousel` `is_enabled=true` (config_id `61e4f143-f0cf-4a9b-853c-f592daf82aaf`, seeded 2026-03-20) | **Historical/decaying (nothing in 15+ days), but the exposure channel is still live and open today.** Never a committed NDIS cell. Closed by Change 11. |
| Care For Welfare | `render_spec IS NULL` on every carousel render (171 succeeded/90d, last render **2026-06-23**); `c.client_format_config` has no `carousel` row at all (only `image_quote`+`text`, both added 2026-08-02) | **Historical/decaying (42+ days); exposure channel structurally closed today.** Never a committed CFW cell. The 2 rows that ARE the containment now have an existence guard, §1.5, protection 2. |
| Invegent | 5 succeeded renders, all one draft, one 25-second window, 2026-06-10; no `client_format_config` carousel row | **Dormant, channel structurally closed.** Excluded from further scope. Same existence guard as CFW. |

**Root-cause finding (code + live DB, cited):** carousel selection for a `format_override = NULL`
schedule row is decided by the AI format-advisor (`ai-worker/index.ts:1181-1253`), gated by
`c.client_format_config.is_enabled` for that client×format (or an open fallback if no config row
exists for that client — `index.ts:1193-1196`). **It is never decided by
`client_publish_schedule.format_override`** — traced through every historical carousel draft's
provenance:
- **CFW's/Invegent's** carousel drafts (CFW: 14 drafts/171 slide-renders, 2026-04-24→06-23;
  Invegent: 1 draft/5 slide-renders, 2026-06-10) all predate the 2026-08-02 `client_format_config`
  rows that now restrict both to `image_quote`+`text`.
- **NDIS's** carousel drafts trace to the same advisor mechanism, but NDIS's `client_format_config`
  row for `carousel` has been `is_enabled=true` since 2026-03-20 and **still is today**. **Zero of
  NDIS's real carousel drafts came from an explicit `format_override='carousel'` schedule row.**

**PK's four-item proof, evaluated per client (unchanged):**

1. **No direct carousel volume increase.** PP: zero rows touched. NDIS: 13 explicit
   `format_override='carousel'` rows go `enabled=true`→`false` — a decrease. CFW/Invegent: zero
   rows ever had `format_override='carousel'` — nothing to increase.
2. **No indirect increase from redistribution.** Carousel eligibility for a `NULL`-override slot
   depends only on `client_format_config.is_enabled`, never on sibling `format_override` state.
3. **After-grid ≤ baseline.** PP: unchanged. CFW/Invegent: already effectively zero going forward.
   NDIS: Change 11 (§1.2) is what actually reduces it.
4. **NDIS concentration proof.** Change 11 is what actually closes NDIS's pre-existing, independent,
   still-open channel.

### 1.2 Change 11: NDIS `client_format_config` carousel closure (unchanged)

```sql
-- Change 11: NDIS client_format_config carousel closure (config_id verified live, 2026-08-04)
UPDATE c.client_format_config
SET is_enabled = false
WHERE config_id = '61e4f143-f0cf-4a9b-853c-f592daf82aaf'
  AND client_id = 'fb98a472-ae4d-432d-8738-2273231c1ef4'
  AND ice_format_key = 'carousel';
```

**Rollback: see §3.4 — the master rollback is the sole authoritative reversal path for this and
every other change in this packet.**

**Effect:** closes the `OR NOT EXISTS(...)`-independent, config-gated advisor channel for NDIS
carousel permanently (until a deliberate future re-enable). Does not build any TMR/governed-provenance
tracking — that remains M11b's own, separately-scoped work (§6).

### 1.3 Three supervised-only cells — structural enforcement (unchanged)

| Cell | Mechanism | Assertion (run post-apply) |
|---|---|---|
| PP YT `video_short_kinetic` | Change 9 disables 4 of PP's 5 enabled YT rows and forces `format_override='video_short_stat'` on the retained row. | `SELECT count(*) FROM c.client_publish_schedule WHERE client_id='4036a6b5-b4a3-406e-998d-c2fe14a8bbdd' AND platform='youtube' AND enabled=true AND format_override <> 'video_short_stat';` → must be **0**. |
| NDIS YT `video_short_stat` | Change 2 disables **all 28** of NDIS's enabled YT rows. | `SELECT count(*) FROM c.client_publish_schedule WHERE client_id='fb98a472-ae4d-432d-8738-2273231c1ef4' AND platform='youtube' AND enabled=true;` → must be **0**. |
| CFW LI `image_quote` | Change 5 forces `format_override='text'` on all 5 of CFW's enabled LI rows. | `SELECT count(*) FROM c.client_publish_schedule WHERE client_id='3eca32aa-e460-462f-a846-3f6ace6a3cae' AND platform='linkedin' AND enabled=true AND format_override <> 'text';` → must be **0**. |

### 1.4 Change 11 and the supervised cells share one structural property

All four (Change 11's NDIS carousel closure, and the three supervised-only cells) deliberately remove
unattended, schedule-driven exposure for their respective cell. None of the four are expected to keep
showing `ready` in the live production-readiness queue afterward, precisely because that queue's
`overall_state` is schedule-reachability-sensitive — this is not a defect, it's the intended effect,
and is exactly why §1.5 protection 5's readiness check uses a named exception list rather than a blanket
"nothing may go non-ready" rule.

### 1.5 The five converged protections, in full

| # | Protection | Mechanism | Assertion (§3.2) |
|---|---|---|---|
| 1 | PP carousel — real lever | PP's `client_format_config` carousel row (`fc339e1e-…`) captured pre-mutation, compared post-mutation. | Must equal its pre-image value (1, enabled) exactly, before and after. |
| 2 | CFW/Invegent containment | Both clients' 2 containing `client_format_config` rows (`image_quote`,`text`) — deletion, not disablement, is the actual fragility. | Count must equal **2**, enabled, before and after, for each client independently. |
| 3 | Rollback collision safety | Durable rollback tables created with bare `CREATE TABLE` (no `IF NOT EXISTS`), uniquely named for v10. | A naming collision aborts the transaction; stale data can never be silently reused. |
| 4 | Live client-identity resolution | All 4 client_ids re-resolved from `c.client` by slug via `SELECT ... INTO STRICT`, cross-checked against pinned UUIDs. | `NO_DATA_FOUND`/`TOO_MANY_ROWS` on zero or multiple matches; `RAISE EXCEPTION` on any pin drift. |
| 5 | Readiness expected-after matrix | Every cell `ready` before, for all 4 clients, snapshotted; any regression not in the named exception list (the 3 supervised cells + NDIS carousel) is a STOP; any unexpected new `ready` appearance is also a STOP. | Two set-difference checks against a named allowlist — not a blanket "nothing may change" rule. |

---

## 2. NDIS cleanup proof (PK item 3 — exact, enumerated; unchanged across all versions)

### 2.1 Removed demand (67 rows) — exact per-platform, per-format breakdown

| Format removed | Facebook | Instagram | YouTube | Total | Committed for NDIS? |
|---|---|---|---|---|---|
| `video_long_podcast_clip` | 7 | 0 | 7 | **14** | No |
| `video_long_explainer` | 0 | 0 | 7 | **7** | No |
| `carousel` | 6 | 7 | 0 | **13** | No — never committed for NDIS |
| `video_short` | 4 | 7 | 3 | **14** | No |
| `video_short_avatar` | 0 | 7 | 4 | **11** | No |
| `video_short_kinetic_voice` | 0 | 0 | 4 | **4** | No — D4/M15 scope rider |
| `video_short_stat_voice` | 0 | 0 | 3 | **3** | No — same rider |
| NULL-override FB safety row (`fcc9042d-…`) | 1 | 0 | 0 | **1** | Ambiguous by construction |
| **Total** | **18** | **21** | **28** | **67** | |

**Exact `schedule_id` per category (full traceability — every one of the 67 accounted for):**

- `video_long_podcast_clip` (14): FB — `b68d689e…`, `965b3d09…`, `722a79b0…`, `792b5730…`,
  `3eea8e57…`, `9454330d…`, `c4b040ea…` (7); YT — `2204aa6c…`, `eb31b6dc…`, `27032abb…`,
  `f040361b…`, `deb81600…`, `11fe1ffd…`, `8f66f05b…` (7).
- `video_long_explainer` (7): YT only — `cc78b906…`, `2209a43a…`, `8ecb3dca…`, `46a1d126…`,
  `5d63f6da…`, `005825db…`, `67656b73…`.
- `carousel` (13): FB — `3404a622…`, `3e044993…`, `6fee130f…`, `afcf6ede…`, `00200f6e…`,
  `e850df9f…` (6); IG — `cb022c88…`, `633db37f…`, `39d5ac62…`, `ef0677a9…`, `c038a040…`,
  `953b8fea…`, `747b5c92…` (7).
- `video_short` (14): FB — `760e45d9…`, `5da5170b…`, `515d29ae…`, `3e273d85…` (4); IG —
  `00e1c92b…`, `a69bdae4…`, `11890abb…`, `f0e3664f…`, `bef7d0d6…`, `2fe80416…`, `2c0d8f18…` (7);
  YT — `95153ba2…`, `ba95b4ab…`, `b9b53d59…` (3).
- `video_short_avatar` (11): IG — `d2d87149…`, `f3092ee5…`, `ed82fd5c…`, `ff35d328…`,
  `fcb62704…`, `14d73efc…`, `d3c96a3c…` (7); YT — `e5d4dd4c…`, `713252b4…`, `5c31ac01…`,
  `3824b3f4…` (4).
- `video_short_kinetic_voice` (4): YT only — `48469965…`, `60262d20…`, `051762a3…`, `5d65eb5e…`.
- `video_short_stat_voice` (3): YT only — `5b2cdba0…`, `33dfa214…`, `d8d77bce…`.
- NULL-override FB safety row (1): `fcc9042d…`.

18 (FB) + 21 (IG) + 28 (YT) = **67**, matching §3.1's Change 1 (39) + Change 2 (28) exactly.

**Live skip_reason evidence (trailing 14d):**
`capability_blocked:template_missing` ×22 FB+YT (`video_long_podcast_clip`) + ×10 YT
(`video_long_explainer`); `capability_blocked:unsupported_silent_degrade:carousel` ×20 FB+IG;
`unsupported_silent_degrade:video_short` ×18; `unsupported_silent_degrade:video_short_avatar` ×14;
`unsupported_silent_degrade:video_short_kinetic_voice` ×6; `unsupported_silent_degrade:video_short_stat_voice` ×2.

**Conclusion: 100% of removed demand is `unsupported` (all 67 rows, exact-id verified) and
additionally `fail-closing` live today for the skip-reason-documented majority.**

### 2.2 Retained demand (31 rows) — proof of "ready/governed" (unchanged)

| Format retained | Rows | R1 (`get_client_production_readiness_queue`) | R2 (proof event / exemption) | M11a routing |
|---|---|---|---|---|
| `image_quote` FB | 5 | `ready` | Proof `b0a98eda…`, 2026-07-19 | `governed_routed` |
| `text` FB | 5 | `ready`, `governed_exempt` | Note-C exemption | `not_applicable` |
| `image_quote` IG | 7 | `ready` | Proof `c9150001…002`, 2026-08-01 | `governed_routed` |
| `image_quote` LI | 7 | `ready` | Proof `c9150001…003`, 2026-07-27; live 2026-08-04 | `governed_routed` |
| `text` LI | 7 | `ready`, `governed_exempt` | Note-C exemption | `not_applicable` |
| **Total** | **31** | all `ready` | all proven or correctly exempt | zero `legacy_routed`/`mixed` |

### 2.3 Before/after volume — declared and realized (unchanged)

| | Declared (row count) | Realized (render-log-visible successes, 30d rate) |
|---|---|---|
| **Before** | **98/week** (FB28+IG28+LI14+YT28) | ≈12.4/week |
| **After** | **31/week** (FB10+IG7+LI14+YT0) | ≈8.2/week `image_quote`-visible (unchanged) + text's own unaffected rate |
| **Change** | **-67/week declared (-68%)** | **~0 change to committed-cell realized output** |

---

## 3. Frozen packet — exact manifest and CAS-guarded SQL

### 3.1 Manifest (11 changes) — unchanged, all row counts identical to v5/v9

| # | Target | Client | Scope | Rows touched | Action |
|---|---|---|---|---|---|
| 1 | `client_publish_schedule` | ndis-yarns | Facebook (uncommitted-format + 1 NULL-safety row) | **18** | `enabled=false` |
| 1 | `client_publish_schedule` | ndis-yarns | Instagram (uncommitted-format) | **21** | `enabled=false` |
| 2 | `client_publish_schedule` | ndis-yarns | All YouTube rows | **28** | `enabled=false` |
| 3 | `client_publish_schedule` | care-for-welfare-pty-ltd | Facebook | **5** (3 format_override set, 2 disabled) | mix + reduce |
| 4 | `client_publish_schedule` | care-for-welfare-pty-ltd | Instagram | **5** (3 format_override set, 2 disabled) | reduce |
| 5 | `client_publish_schedule` | care-for-welfare-pty-ltd | LinkedIn | **5** | force `text` (Layer-2 enforcement) |
| 6 | `client_publish_schedule` | invegent | Facebook | **5** (3 format_override set, 2 disabled) | mix + reduce |
| 7 | `client_publish_schedule` | invegent | Instagram | **5** (3 format_override set, 2 disabled) | reduce |
| 8 | `client_publish_schedule` | invegent | LinkedIn | **5** | force 4-text/1-image split |
| 9 | `client_publish_schedule` | property-pulse | YouTube | **5** (1 format_override set, 4 disabled) | reduce (Layer-2 enforcement) |
| 10 | `client_format_config` | property-pulse + ndis-yarns | 4 format keys × 2 clients | **8** | `is_enabled=false` |
| 11 | `client_format_config` | ndis-yarns | 1 format key (`carousel`) | **1** | `is_enabled=false` |
| | | | | **Total: 111 rows** (**102 schedule + 9 config**) | |

18+21+28+5+5+5+5+5+5+5 = **102 schedule rows**. 8+1 = **9 config rows**. 102+9 = **111 total**.
**v10 and v11 add zero new mutation rows** — all five protections (§1.5) plus v11's row-scope hardening
for Changes 1/2/10 (see the v11 fixes note at the top of this document) are additional in-transaction
verification (identity resolution) or assertions (carousel levers, existence guards, readiness matrix),
never new `UPDATE` targets.

### 3.2 CAS-guarded single-transaction SQL

**Execution channel:** this entire script — from the first `BEGIN;` through the terminal `COMMIT;` —
**MUST be submitted as the `query` parameter of exactly ONE call to the `mcp__supabase__execute_sql`
MCP tool** (Supabase project `mbkmaxqhsohbtwsqolns`). Never split across multiple tool calls, never
pasted incrementally, never chunked by a pooled-connection wrapper.

```sql
BEGIN;

-- ══ Protection 4: live client-identity resolution — literal single-row-per-slug guard ══
DO $$
DECLARE v_pp uuid; v_ndis uuid; v_cfw uuid; v_inv uuid;
BEGIN
  BEGIN
    SELECT client_id INTO STRICT v_pp FROM c.client WHERE client_slug='property-pulse' AND status='active';
  EXCEPTION
    WHEN NO_DATA_FOUND THEN RAISE EXCEPTION 'CLIENT RESOLUTION FAIL: zero active clients for slug=property-pulse.';
    WHEN TOO_MANY_ROWS THEN RAISE EXCEPTION 'CLIENT RESOLUTION FAIL: multiple active clients for slug=property-pulse.';
  END;
  IF v_pp IS DISTINCT FROM '4036a6b5-b4a3-406e-998d-c2fe14a8bbdd'::uuid THEN
    RAISE EXCEPTION 'STOP: property-pulse client_id drifted from the frozen, verified value. Got %.', v_pp; END IF;

  BEGIN
    SELECT client_id INTO STRICT v_ndis FROM c.client WHERE client_slug='ndis-yarns' AND status='active';
  EXCEPTION
    WHEN NO_DATA_FOUND THEN RAISE EXCEPTION 'CLIENT RESOLUTION FAIL: zero active clients for slug=ndis-yarns.';
    WHEN TOO_MANY_ROWS THEN RAISE EXCEPTION 'CLIENT RESOLUTION FAIL: multiple active clients for slug=ndis-yarns.';
  END;
  IF v_ndis IS DISTINCT FROM 'fb98a472-ae4d-432d-8738-2273231c1ef4'::uuid THEN
    RAISE EXCEPTION 'STOP: ndis-yarns client_id drifted from the frozen, verified value. Got %.', v_ndis; END IF;

  BEGIN
    SELECT client_id INTO STRICT v_cfw FROM c.client WHERE client_slug='care-for-welfare-pty-ltd' AND status='active';
  EXCEPTION
    WHEN NO_DATA_FOUND THEN RAISE EXCEPTION 'CLIENT RESOLUTION FAIL: zero active clients for slug=care-for-welfare-pty-ltd.';
    WHEN TOO_MANY_ROWS THEN RAISE EXCEPTION 'CLIENT RESOLUTION FAIL: multiple active clients for slug=care-for-welfare-pty-ltd.';
  END;
  IF v_cfw IS DISTINCT FROM '3eca32aa-e460-462f-a846-3f6ace6a3cae'::uuid THEN
    RAISE EXCEPTION 'STOP: care-for-welfare-pty-ltd client_id drifted from the frozen, verified value. Got %.', v_cfw; END IF;

  BEGIN
    SELECT client_id INTO STRICT v_inv FROM c.client WHERE client_slug='invegent' AND status='active';
  EXCEPTION
    WHEN NO_DATA_FOUND THEN RAISE EXCEPTION 'CLIENT RESOLUTION FAIL: zero active clients for slug=invegent.';
    WHEN TOO_MANY_ROWS THEN RAISE EXCEPTION 'CLIENT RESOLUTION FAIL: multiple active clients for slug=invegent.';
  END;
  IF v_inv IS DISTINCT FROM '93494a09-cc89-41d1-b364-cb63983063a6'::uuid THEN
    RAISE EXCEPTION 'STOP: invegent client_id drifted from the frozen, verified value. Got %.', v_inv; END IF;
END $$;

-- ══ 0. Pre-execution readiness baseline, DETAIL level (Protection 5 — replaces the old aggregate check) ══
CREATE TEMP TABLE _readiness_before_detail AS
SELECT cl.client_slug, cell->>'platform' AS platform, cell->>'format' AS format
FROM c.client cl
CROSS JOIN LATERAL jsonb_array_elements(public.get_client_production_readiness_queue(cl.client_slug)) AS cell
WHERE cl.client_slug IN ('property-pulse','ndis-yarns','care-for-welfare-pty-ltd','invegent')
  AND cell->>'overall_state' = 'ready';

-- ══ Protection 5: named exception list — the ONLY cells permitted to regress from ready ══
CREATE TEMP TABLE _readiness_expected_exceptions (client_slug text, platform text, format text, reason text);
INSERT INTO _readiness_expected_exceptions VALUES
  ('property-pulse', 'youtube', 'video_short_kinetic', 'Layer-2 supervised-only: zero unattended schedule volume; proof-event capability unaffected (no proof-event table touched by this packet)'),
  ('ndis-yarns', 'youtube', 'video_short_stat', 'Layer-2 supervised-only: zero unattended schedule volume; proof-event capability unaffected'),
  ('care-for-welfare-pty-ltd', 'linkedin', 'image_quote', 'Layer-2 supervised-only: zero unattended schedule volume; proof-event capability unaffected'),
  ('ndis-yarns', 'facebook', 'carousel', 'Change 11: intended containment, carousel config closed'),
  ('ndis-yarns', 'instagram', 'carousel', 'Change 11: intended containment, carousel config closed');
-- Note: if a listed cell was never `ready` before this packet ran (e.g. NDIS carousel may already
-- read non-ready via the render-time template gap noted in §1.1), its absence from
-- _readiness_before_detail means it simply never enters the regression check below — harmless, not
-- an error, and does not require a matching pre-existing 'ready' row for this list to be valid.

-- ══ 1. Pre-image capture (rollback source, §3.4) ══
CREATE TEMP TABLE _pre_image AS
SELECT schedule_id, client_id, platform, enabled, format_override, 'schedule'::text AS kind
FROM c.client_publish_schedule
WHERE schedule_id IN (
  -- Change 1 FB (18 ids)
  '3404a622-c796-4f42-85d7-dadd8c61e8d8','b68d689e-4b41-4e66-988f-9dd2090019a7',
  '760e45d9-542c-4b8b-b329-53ba77c22381','965b3d09-d297-4479-9249-7957b13be7a3',
  '3e044993-6839-457c-a9fa-57038006c1eb','722a79b0-8279-4021-9158-d742797f4309',
  '5da5170b-a299-47d4-a4ac-d748e5f5210d','6fee130f-3fd6-473c-8c1c-1f1106c95f86',
  '792b5730-37f1-485d-8630-e6d2efdb2d33','afcf6ede-d8e8-4577-9975-f165a75444ca',
  '3eea8e57-2372-4992-852f-69181d2ec9b4','515d29ae-e733-4baf-ab4a-05789b634a9b',
  '00200f6e-01ee-4af0-b783-5b0c56648668','c4b040ea-a461-4213-9db2-b5e5f507e4e8',
  '3e273d85-7779-4a79-bea7-9504900f1559','e850df9f-9e9f-478b-86a7-36a63db09f6a',
  '9454330d-0a6e-492c-b683-4d59652f0887','fcc9042d-1132-4955-bccd-efa67fb24ab5',
  -- Change 1 IG (21 ids)
  'cb022c88-38af-48ec-a584-aae32dc4c03d','00e1c92b-cdae-482d-809a-697309db5d7c',
  'd2d87149-4440-43c9-a4b3-8ac434cc93b9','633db37f-d79a-4653-9794-e91cf6807ab6',
  'a69bdae4-f040-4a03-ab37-20cb9b45253c','f3092ee5-3fdf-408e-a4e0-29a5b72215d4',
  '39d5ac62-c953-48e9-bea7-29ab9eec4038','11890abb-02ae-46db-a5b1-55891b8b75da',
  'ed82fd5c-3f13-4394-a3a1-f3c33429673f','ef0677a9-e87b-4a04-8a06-6b6b36562d86',
  'f0e3664f-417f-46d6-b57e-e85105252469','ff35d328-f5bf-4b53-aefc-334745d79b99',
  'c038a040-b3cc-4fdc-91d3-dfa925efc1e5','bef7d0d6-f1d4-4851-a0c1-c52414d81b38',
  'fcb62704-8563-41fc-a162-b6c055f877c0','953b8fea-a1cb-4e52-888c-71e0e68f8535',
  '2fe80416-c4fb-47d8-b8c9-1e5e55d5828f','14d73efc-6d43-4aff-a4e6-58df436d105c',
  '747b5c92-61b9-4745-9ef5-2df4bd3e25e2','2c0d8f18-b8ed-408c-9240-59c2d93f1655',
  'd3c96a3c-e8c4-4132-a57d-e760bc6de9c1',
  -- Change 2: NDIS YT (28 ids)
  'cc78b906-62f2-43ab-9cec-402bc5d54275','2204aa6c-e153-414d-ad3c-f8f38d8cc386',
  '95153ba2-ff9c-4846-b920-ab9c1cce8857','e5d4dd4c-aace-460f-ab90-f3e0bf5fea73',
  '2209a43a-2577-41cd-a7e5-90075b07af77','eb31b6dc-0b90-43aa-a5be-793f6c3d2be8',
  '48469965-41fd-4dd5-895a-de6eb8df54d0','5b2cdba0-03a3-407c-a123-7abbeb8971f1',
  '8ecb3dca-98d3-47ed-94d3-58e6ca564e15','27032abb-8d4a-4a96-88a8-5a07b0cba40b',
  '713252b4-510a-4f04-995c-e85e6736e0f7','ba95b4ab-666f-45c0-9f00-cc72b88155a5',
  '46a1d126-2933-4da9-b45c-78670f92ed2c','f040361b-e897-4135-af0f-38ab94d8857d',
  '60262d20-42a3-4b0a-8e31-f27bb9e11384','33dfa214-bd09-455d-807c-75dc1bb12f64',
  'deb81600-90e0-494c-b7f6-af551b6f07f9','5d63f6da-b57b-40c3-834b-a0aa9499c913',
  '5c31ac01-c310-4b39-ae87-a3c1157d0339','b9b53d59-92be-4b39-a0e5-b9e40fec39ad',
  '11fe1ffd-747d-4e9d-869c-d9523048a301','005825db-a3e7-4a29-9691-3f1c1982bb54',
  '051762a3-c517-44ab-96cf-c73cd6a18350','d8d77bce-e041-4c22-bde4-94f3356bd71b',
  '8f66f05b-5be3-4e81-bcdc-6772c10087f6','67656b73-3e83-4233-a5c7-b9b201dc7705',
  '5d65eb5e-6aa3-4085-9e0f-54af94d5e9fd','3824b3f4-af5c-4ec0-b664-268d25dd69ce',
  -- Change 3-9: CFW/Invegent/PP (35 ids)
  '433c52c1-9385-4a5e-83ae-96c5c603f915','cb3e86fa-0b7b-4ab0-8b98-93de30bc699f',
  'f9e49b40-9e04-4548-860f-875c907ad8d8','6966af5b-5a2e-4f0c-81e0-0e20b3c6afb1',
  '90b8583e-b77d-498d-ba03-52e64c727a6b','e2024323-c0e0-468d-ac84-ff7e6cc90c66',
  '9e0ce8da-861a-4b22-ab5e-415d1330e6dc','544a05d8-bcb4-4c36-a336-ebfc99237d54',
  'ce03f531-b40c-4705-b40d-1480c78aa48b','525ab2af-cb29-4a4b-a7e6-d85597838410',
  '4bb57dbb-fa45-40a4-a749-2ff4ca39f2ce','0a3958a8-87e5-48fe-8ab9-aeb6b57cf9d4',
  'fd359088-507c-4b83-80da-b4736c51e64f','9e826d46-29e3-40da-839a-ca19bf61bfe7',
  '8ad8f4e9-a07e-41ad-873f-852287846daa','1fd9a842-4db0-4292-a760-8155874b33ac',
  'a7ea2dc4-8adf-439b-9d9e-ba985fce5548','c1abb720-4060-496d-8312-97cb9286c04d',
  '1bddacbc-af9c-4adb-b764-b9d44c75b44b','5ad2665f-c0f8-4add-a6fe-b876c4bceeba',
  '8f6c2266-8e37-4ba0-b1b6-57434432f4ff','6c52b1d4-bdbc-48fc-9e21-9b5d139b70f8',
  'fd8aae40-6c75-4dcb-bb2b-6ae36e51793e','3fb1c2e6-b427-4b5d-bd7b-589e38663f0d',
  'ff5927b4-184d-4a57-948d-7623e75f7008','b66abd5a-5541-4de0-acfa-60a53d36bb9b',
  '1a6c4fde-030e-44f4-9d22-9ca00b4c9fa1','10fb5b91-c580-4a10-bb5a-625fec75ff37',
  'e22560a5-d584-468f-8c9d-accc921c330a','135a32a0-4a45-4687-af3a-839b40eb6cf2',
  'e951069c-e995-4cc8-a56e-b4c33291683f','abdc58c4-8aff-4483-bd91-bc2c248b6932',
  'f1cc1c32-0759-4ab7-a748-a70f8ae9aade','71a9fbd3-7ed1-41f9-b776-b63adfa3ad8b',
  'bf705fed-6f90-49c8-becd-10b07c64b09c'
);

CREATE TEMP TABLE _pre_image_cfg AS
SELECT config_id, client_id, ice_format_key, is_enabled, 'config'::text AS kind
FROM c.client_format_config
WHERE config_id IN (
  -- Change 10 (8 ids)
  'ca8a085d-7abb-47b8-a32f-4357ca74c479','e3edf302-97ec-4a6d-9eb2-b26b11b567a9',
  'da5b5c8c-ab31-433f-8069-b6562d8461c9','2a1932a9-08d2-4ad4-8b7d-c89b54e469b9',
  '8a2df44a-ee15-4795-8ce5-fc2019cec716','fdb3fc40-8374-439c-b67c-763121ac9961',
  '487dcde2-c313-4725-a4e1-6c1d8aa8a070','a6f0a8bd-e14c-4a90-9f68-ec2e5006f233',
  -- Change 11 (1 id)
  '61e4f143-f0cf-4a9b-853c-f592daf82aaf'
);

-- ══ 2. Durable rollback persistence — Protection 3, v10 identifier (fixes v9's naming-collision finding) ══
-- Bare CREATE TABLE (no IF NOT EXISTS): a naming collision aborts the transaction rather than silently
-- reusing possibly-stale pre-image data. Named uniquely for v10 so it cannot collide with either the
-- isolated worktree's own v5 packet OR this lineage's earlier v9 (which reused a "_v5_" name).
CREATE TABLE c._rollback_post_cgu_v1_schedule_v10_20260804 AS SELECT * FROM _pre_image;
CREATE TABLE c._rollback_post_cgu_v1_schedule_v10_20260804_cfg AS SELECT * FROM _pre_image_cfg;

-- ══ 3. PP carousel pre-mutation baseline (schedule-row proxy, kept from v5/v9) ══
CREATE TEMP TABLE _pp_carousel_baseline AS
SELECT count(*) AS cnt FROM c.client_publish_schedule
WHERE client_id = '4036a6b5-b4a3-406e-998d-c2fe14a8bbdd' AND platform IN ('facebook','instagram') AND enabled = true;

-- ══ 3b. Protection 1: PP carousel REAL lever baseline ══
CREATE TEMP TABLE _pp_carousel_config_baseline AS
SELECT count(*) AS cnt FROM c.client_format_config
WHERE config_id = 'fc339e1e-5809-4b9c-9c03-2c60a4166a80' AND is_enabled = true;

-- ══ 3c. Protection 2: CFW/Invegent config-row existence baseline ══
CREATE TEMP TABLE _cfw_invegent_config_baseline AS
SELECT 'cfw' AS which, count(*) AS cnt FROM c.client_format_config
WHERE client_id = '3eca32aa-e460-462f-a846-3f6ace6a3cae' AND ice_format_key IN ('image_quote','text') AND is_enabled = true
UNION ALL
SELECT 'invegent', count(*) FROM c.client_format_config
WHERE client_id = '93494a09-cc89-41d1-b364-cb63983063a6' AND ice_format_key IN ('image_quote','text') AND is_enabled = true;

-- ══ 4. Expected-final-state table for Changes 3-9 (precise per-row proof) ══
CREATE TEMP TABLE _expected_final_state (schedule_id uuid, expected_enabled boolean, expected_override text);
INSERT INTO _expected_final_state VALUES
  -- Change 3: CFW FB
  ('433c52c1-9385-4a5e-83ae-96c5c603f915', true, 'image_quote'),
  ('f9e49b40-9e04-4548-860f-875c907ad8d8', true, 'text'),
  ('90b8583e-b77d-498d-ba03-52e64c727a6b', true, 'text'),
  ('cb3e86fa-0b7b-4ab0-8b98-93de30bc699f', false, NULL),
  ('6966af5b-5a2e-4f0c-81e0-0e20b3c6afb1', false, NULL),
  -- Change 4: CFW IG
  ('e2024323-c0e0-468d-ac84-ff7e6cc90c66', true, 'image_quote'),
  ('544a05d8-bcb4-4c36-a336-ebfc99237d54', true, 'image_quote'),
  ('525ab2af-cb29-4a4b-a7e6-d85597838410', true, 'image_quote'),
  ('9e0ce8da-861a-4b22-ab5e-415d1330e6dc', false, NULL),
  ('ce03f531-b40c-4705-b40d-1480c78aa48b', false, NULL),
  -- Change 5: CFW LI (all force text)
  ('4bb57dbb-fa45-40a4-a749-2ff4ca39f2ce', true, 'text'),
  ('0a3958a8-87e5-48fe-8ab9-aeb6b57cf9d4', true, 'text'),
  ('fd359088-507c-4b83-80da-b4736c51e64f', true, 'text'),
  ('9e826d46-29e3-40da-839a-ca19bf61bfe7', true, 'text'),
  ('8ad8f4e9-a07e-41ad-873f-852287846daa', true, 'text'),
  -- Change 6: Invegent FB
  ('1fd9a842-4db0-4292-a760-8155874b33ac', true, 'image_quote'),
  ('c1abb720-4060-496d-8312-97cb9286c04d', true, 'text'),
  ('5ad2665f-c0f8-4add-a6fe-b876c4bceeba', true, 'text'),
  ('a7ea2dc4-8adf-439b-9d9e-ba985fce5548', false, NULL),
  ('1bddacbc-af9c-4adb-b764-b9d44c75b44b', false, NULL),
  -- Change 7: Invegent IG
  ('8f6c2266-8e37-4ba0-b1b6-57434432f4ff', true, 'image_quote'),
  ('fd8aae40-6c75-4dcb-bb2b-6ae36e51793e', true, 'image_quote'),
  ('ff5927b4-184d-4a57-948d-7623e75f7008', true, 'image_quote'),
  ('6c52b1d4-bdbc-48fc-9e21-9b5d139b70f8', false, NULL),
  ('3fb1c2e6-b427-4b5d-bd7b-589e38663f0d', false, NULL),
  -- Change 8: Invegent LI
  ('b66abd5a-5541-4de0-acfa-60a53d36bb9b', true, 'text'),
  ('1a6c4fde-030e-44f4-9d22-9ca00b4c9fa1', true, 'text'),
  ('e22560a5-d584-468f-8c9d-accc921c330a', true, 'text'),
  ('135a32a0-4a45-4687-af3a-839b40eb6cf2', true, 'text'),
  ('10fb5b91-c580-4a10-bb5a-625fec75ff37', true, 'image_quote'),
  -- Change 9: PP YT
  ('f1cc1c32-0759-4ab7-a748-a70f8ae9aade', true, 'video_short_stat'),
  ('e951069c-e995-4cc8-a56e-b4c33291683f', false, NULL),
  ('abdc58c4-8aff-4483-bd91-bc2c248b6932', false, NULL),
  ('71a9fbd3-7ed1-41f9-b776-b63adfa3ad8b', false, NULL),
  ('bf705fed-6f90-49c8-becd-10b07c64b09c', false, NULL);

-- ══ 4b. Frozen expected-ownership dataset for Changes 1, 2, 10 (fixes AHA-10-1, v11) ══
-- Independent of the live rows being validated: every expected_client_id/expected_client_slug/
-- expected_platform value below is a LITERAL, frozen at authoring time — none of it is derived from
-- _pre_image or from the live c.client_publish_schedule/c.client_format_config tables. This closes
-- the exact gap the prior round found: Changes 1/2/10 previously verified their own scope using a
-- subquery that re-derived client_id/platform from the same live row being checked, which could not
-- detect a wrong-owner row. This dataset gives those 75 rows the same independent per-ID protection
-- Changes 3-11 already had via _expected_final_state.
CREATE TEMP TABLE _expected_ownership_schedule (
  schedule_id uuid, expected_client_id uuid, expected_client_slug text,
  expected_platform text, expected_pre_enabled boolean, expected_after_enabled boolean
);
INSERT INTO _expected_ownership_schedule VALUES
  -- Change 1, Facebook (18) -- ndis-yarns
  ('3404a622-c796-4f42-85d7-dadd8c61e8d8', 'fb98a472-ae4d-432d-8738-2273231c1ef4', 'ndis-yarns', 'facebook', true, false),
  ('b68d689e-4b41-4e66-988f-9dd2090019a7', 'fb98a472-ae4d-432d-8738-2273231c1ef4', 'ndis-yarns', 'facebook', true, false),
  ('760e45d9-542c-4b8b-b329-53ba77c22381', 'fb98a472-ae4d-432d-8738-2273231c1ef4', 'ndis-yarns', 'facebook', true, false),
  ('965b3d09-d297-4479-9249-7957b13be7a3', 'fb98a472-ae4d-432d-8738-2273231c1ef4', 'ndis-yarns', 'facebook', true, false),
  ('3e044993-6839-457c-a9fa-57038006c1eb', 'fb98a472-ae4d-432d-8738-2273231c1ef4', 'ndis-yarns', 'facebook', true, false),
  ('722a79b0-8279-4021-9158-d742797f4309', 'fb98a472-ae4d-432d-8738-2273231c1ef4', 'ndis-yarns', 'facebook', true, false),
  ('5da5170b-a299-47d4-a4ac-d748e5f5210d', 'fb98a472-ae4d-432d-8738-2273231c1ef4', 'ndis-yarns', 'facebook', true, false),
  ('6fee130f-3fd6-473c-8c1c-1f1106c95f86', 'fb98a472-ae4d-432d-8738-2273231c1ef4', 'ndis-yarns', 'facebook', true, false),
  ('792b5730-37f1-485d-8630-e6d2efdb2d33', 'fb98a472-ae4d-432d-8738-2273231c1ef4', 'ndis-yarns', 'facebook', true, false),
  ('afcf6ede-d8e8-4577-9975-f165a75444ca', 'fb98a472-ae4d-432d-8738-2273231c1ef4', 'ndis-yarns', 'facebook', true, false),
  ('3eea8e57-2372-4992-852f-69181d2ec9b4', 'fb98a472-ae4d-432d-8738-2273231c1ef4', 'ndis-yarns', 'facebook', true, false),
  ('515d29ae-e733-4baf-ab4a-05789b634a9b', 'fb98a472-ae4d-432d-8738-2273231c1ef4', 'ndis-yarns', 'facebook', true, false),
  ('00200f6e-01ee-4af0-b783-5b0c56648668', 'fb98a472-ae4d-432d-8738-2273231c1ef4', 'ndis-yarns', 'facebook', true, false),
  ('c4b040ea-a461-4213-9db2-b5e5f507e4e8', 'fb98a472-ae4d-432d-8738-2273231c1ef4', 'ndis-yarns', 'facebook', true, false),
  ('3e273d85-7779-4a79-bea7-9504900f1559', 'fb98a472-ae4d-432d-8738-2273231c1ef4', 'ndis-yarns', 'facebook', true, false),
  ('e850df9f-9e9f-478b-86a7-36a63db09f6a', 'fb98a472-ae4d-432d-8738-2273231c1ef4', 'ndis-yarns', 'facebook', true, false),
  ('9454330d-0a6e-492c-b683-4d59652f0887', 'fb98a472-ae4d-432d-8738-2273231c1ef4', 'ndis-yarns', 'facebook', true, false),
  ('fcc9042d-1132-4955-bccd-efa67fb24ab5', 'fb98a472-ae4d-432d-8738-2273231c1ef4', 'ndis-yarns', 'facebook', true, false),
  -- Change 1, Instagram (21) -- ndis-yarns
  ('cb022c88-38af-48ec-a584-aae32dc4c03d', 'fb98a472-ae4d-432d-8738-2273231c1ef4', 'ndis-yarns', 'instagram', true, false),
  ('00e1c92b-cdae-482d-809a-697309db5d7c', 'fb98a472-ae4d-432d-8738-2273231c1ef4', 'ndis-yarns', 'instagram', true, false),
  ('d2d87149-4440-43c9-a4b3-8ac434cc93b9', 'fb98a472-ae4d-432d-8738-2273231c1ef4', 'ndis-yarns', 'instagram', true, false),
  ('633db37f-d79a-4653-9794-e91cf6807ab6', 'fb98a472-ae4d-432d-8738-2273231c1ef4', 'ndis-yarns', 'instagram', true, false),
  ('a69bdae4-f040-4a03-ab37-20cb9b45253c', 'fb98a472-ae4d-432d-8738-2273231c1ef4', 'ndis-yarns', 'instagram', true, false),
  ('f3092ee5-3fdf-408e-a4e0-29a5b72215d4', 'fb98a472-ae4d-432d-8738-2273231c1ef4', 'ndis-yarns', 'instagram', true, false),
  ('39d5ac62-c953-48e9-bea7-29ab9eec4038', 'fb98a472-ae4d-432d-8738-2273231c1ef4', 'ndis-yarns', 'instagram', true, false),
  ('11890abb-02ae-46db-a5b1-55891b8b75da', 'fb98a472-ae4d-432d-8738-2273231c1ef4', 'ndis-yarns', 'instagram', true, false),
  ('ed82fd5c-3f13-4394-a3a1-f3c33429673f', 'fb98a472-ae4d-432d-8738-2273231c1ef4', 'ndis-yarns', 'instagram', true, false),
  ('ef0677a9-e87b-4a04-8a06-6b6b36562d86', 'fb98a472-ae4d-432d-8738-2273231c1ef4', 'ndis-yarns', 'instagram', true, false),
  ('f0e3664f-417f-46d6-b57e-e85105252469', 'fb98a472-ae4d-432d-8738-2273231c1ef4', 'ndis-yarns', 'instagram', true, false),
  ('ff35d328-f5bf-4b53-aefc-334745d79b99', 'fb98a472-ae4d-432d-8738-2273231c1ef4', 'ndis-yarns', 'instagram', true, false),
  ('c038a040-b3cc-4fdc-91d3-dfa925efc1e5', 'fb98a472-ae4d-432d-8738-2273231c1ef4', 'ndis-yarns', 'instagram', true, false),
  ('bef7d0d6-f1d4-4851-a0c1-c52414d81b38', 'fb98a472-ae4d-432d-8738-2273231c1ef4', 'ndis-yarns', 'instagram', true, false),
  ('fcb62704-8563-41fc-a162-b6c055f877c0', 'fb98a472-ae4d-432d-8738-2273231c1ef4', 'ndis-yarns', 'instagram', true, false),
  ('953b8fea-a1cb-4e52-888c-71e0e68f8535', 'fb98a472-ae4d-432d-8738-2273231c1ef4', 'ndis-yarns', 'instagram', true, false),
  ('2fe80416-c4fb-47d8-b8c9-1e5e55d5828f', 'fb98a472-ae4d-432d-8738-2273231c1ef4', 'ndis-yarns', 'instagram', true, false),
  ('14d73efc-6d43-4aff-a4e6-58df436d105c', 'fb98a472-ae4d-432d-8738-2273231c1ef4', 'ndis-yarns', 'instagram', true, false),
  ('747b5c92-61b9-4745-9ef5-2df4bd3e25e2', 'fb98a472-ae4d-432d-8738-2273231c1ef4', 'ndis-yarns', 'instagram', true, false),
  ('2c0d8f18-b8ed-408c-9240-59c2d93f1655', 'fb98a472-ae4d-432d-8738-2273231c1ef4', 'ndis-yarns', 'instagram', true, false),
  ('d3c96a3c-e8c4-4132-a57d-e760bc6de9c1', 'fb98a472-ae4d-432d-8738-2273231c1ef4', 'ndis-yarns', 'instagram', true, false),
  -- Change 2, YouTube (28) -- ndis-yarns
  ('cc78b906-62f2-43ab-9cec-402bc5d54275', 'fb98a472-ae4d-432d-8738-2273231c1ef4', 'ndis-yarns', 'youtube', true, false),
  ('2204aa6c-e153-414d-ad3c-f8f38d8cc386', 'fb98a472-ae4d-432d-8738-2273231c1ef4', 'ndis-yarns', 'youtube', true, false),
  ('95153ba2-ff9c-4846-b920-ab9c1cce8857', 'fb98a472-ae4d-432d-8738-2273231c1ef4', 'ndis-yarns', 'youtube', true, false),
  ('e5d4dd4c-aace-460f-ab90-f3e0bf5fea73', 'fb98a472-ae4d-432d-8738-2273231c1ef4', 'ndis-yarns', 'youtube', true, false),
  ('2209a43a-2577-41cd-a7e5-90075b07af77', 'fb98a472-ae4d-432d-8738-2273231c1ef4', 'ndis-yarns', 'youtube', true, false),
  ('eb31b6dc-0b90-43aa-a5be-793f6c3d2be8', 'fb98a472-ae4d-432d-8738-2273231c1ef4', 'ndis-yarns', 'youtube', true, false),
  ('48469965-41fd-4dd5-895a-de6eb8df54d0', 'fb98a472-ae4d-432d-8738-2273231c1ef4', 'ndis-yarns', 'youtube', true, false),
  ('5b2cdba0-03a3-407c-a123-7abbeb8971f1', 'fb98a472-ae4d-432d-8738-2273231c1ef4', 'ndis-yarns', 'youtube', true, false),
  ('8ecb3dca-98d3-47ed-94d3-58e6ca564e15', 'fb98a472-ae4d-432d-8738-2273231c1ef4', 'ndis-yarns', 'youtube', true, false),
  ('27032abb-8d4a-4a96-88a8-5a07b0cba40b', 'fb98a472-ae4d-432d-8738-2273231c1ef4', 'ndis-yarns', 'youtube', true, false),
  ('713252b4-510a-4f04-995c-e85e6736e0f7', 'fb98a472-ae4d-432d-8738-2273231c1ef4', 'ndis-yarns', 'youtube', true, false),
  ('ba95b4ab-666f-45c0-9f00-cc72b88155a5', 'fb98a472-ae4d-432d-8738-2273231c1ef4', 'ndis-yarns', 'youtube', true, false),
  ('46a1d126-2933-4da9-b45c-78670f92ed2c', 'fb98a472-ae4d-432d-8738-2273231c1ef4', 'ndis-yarns', 'youtube', true, false),
  ('f040361b-e897-4135-af0f-38ab94d8857d', 'fb98a472-ae4d-432d-8738-2273231c1ef4', 'ndis-yarns', 'youtube', true, false),
  ('60262d20-42a3-4b0a-8e31-f27bb9e11384', 'fb98a472-ae4d-432d-8738-2273231c1ef4', 'ndis-yarns', 'youtube', true, false),
  ('33dfa214-bd09-455d-807c-75dc1bb12f64', 'fb98a472-ae4d-432d-8738-2273231c1ef4', 'ndis-yarns', 'youtube', true, false),
  ('deb81600-90e0-494c-b7f6-af551b6f07f9', 'fb98a472-ae4d-432d-8738-2273231c1ef4', 'ndis-yarns', 'youtube', true, false),
  ('5d63f6da-b57b-40c3-834b-a0aa9499c913', 'fb98a472-ae4d-432d-8738-2273231c1ef4', 'ndis-yarns', 'youtube', true, false),
  ('5c31ac01-c310-4b39-ae87-a3c1157d0339', 'fb98a472-ae4d-432d-8738-2273231c1ef4', 'ndis-yarns', 'youtube', true, false),
  ('b9b53d59-92be-4b39-a0e5-b9e40fec39ad', 'fb98a472-ae4d-432d-8738-2273231c1ef4', 'ndis-yarns', 'youtube', true, false),
  ('11fe1ffd-747d-4e9d-869c-d9523048a301', 'fb98a472-ae4d-432d-8738-2273231c1ef4', 'ndis-yarns', 'youtube', true, false),
  ('005825db-a3e7-4a29-9691-3f1c1982bb54', 'fb98a472-ae4d-432d-8738-2273231c1ef4', 'ndis-yarns', 'youtube', true, false),
  ('051762a3-c517-44ab-96cf-c73cd6a18350', 'fb98a472-ae4d-432d-8738-2273231c1ef4', 'ndis-yarns', 'youtube', true, false),
  ('d8d77bce-e041-4c22-bde4-94f3356bd71b', 'fb98a472-ae4d-432d-8738-2273231c1ef4', 'ndis-yarns', 'youtube', true, false),
  ('8f66f05b-5be3-4e81-bcdc-6772c10087f6', 'fb98a472-ae4d-432d-8738-2273231c1ef4', 'ndis-yarns', 'youtube', true, false),
  ('67656b73-3e83-4233-a5c7-b9b201dc7705', 'fb98a472-ae4d-432d-8738-2273231c1ef4', 'ndis-yarns', 'youtube', true, false),
  ('5d65eb5e-6aa3-4085-9e0f-54af94d5e9fd', 'fb98a472-ae4d-432d-8738-2273231c1ef4', 'ndis-yarns', 'youtube', true, false),
  ('3824b3f4-af5c-4ec0-b664-268d25dd69ce', 'fb98a472-ae4d-432d-8738-2273231c1ef4', 'ndis-yarns', 'youtube', true, false);

CREATE TEMP TABLE _expected_ownership_config (
  config_id uuid, expected_client_id uuid, expected_client_slug text,
  expected_pre_enabled boolean, expected_after_enabled boolean
);
INSERT INTO _expected_ownership_config VALUES
  -- Change 10: ndis-yarns (4) -- live-reverified 2026-08-04 via c.client_format_config JOIN c.client
  ('ca8a085d-7abb-47b8-a32f-4357ca74c479', 'fb98a472-ae4d-432d-8738-2273231c1ef4', 'ndis-yarns', true, false),
  ('e3edf302-97ec-4a6d-9eb2-b26b11b567a9', 'fb98a472-ae4d-432d-8738-2273231c1ef4', 'ndis-yarns', true, false),
  ('da5b5c8c-ab31-433f-8069-b6562d8461c9', 'fb98a472-ae4d-432d-8738-2273231c1ef4', 'ndis-yarns', true, false),
  ('2a1932a9-08d2-4ad4-8b7d-c89b54e469b9', 'fb98a472-ae4d-432d-8738-2273231c1ef4', 'ndis-yarns', true, false),
  -- Change 10: property-pulse (4) -- live-reverified 2026-08-04
  ('8a2df44a-ee15-4795-8ce5-fc2019cec716', '4036a6b5-b4a3-406e-998d-c2fe14a8bbdd', 'property-pulse', true, false),
  ('fdb3fc40-8374-439c-b67c-763121ac9961', '4036a6b5-b4a3-406e-998d-c2fe14a8bbdd', 'property-pulse', true, false),
  ('487dcde2-c313-4725-a4e1-6c1d8aa8a070', '4036a6b5-b4a3-406e-998d-c2fe14a8bbdd', 'property-pulse', true, false),
  ('a6f0a8bd-e14c-4a90-9f68-ec2e5006f233', '4036a6b5-b4a3-406e-998d-c2fe14a8bbdd', 'property-pulse', true, false);

-- ══ 5. CAS guard — arithmetic, prior-state, and strengthened pre-execution reverification ══
DO $$
DECLARE v_count int;
BEGIN
  SELECT count(*) INTO v_count FROM _pre_image;
  IF v_count <> 102 THEN
    RAISE EXCEPTION 'CAS FAIL: expected 102 pre-image schedule rows, found %. Data has drifted since packet freeze — ABORT.', v_count;
  END IF;
  SELECT count(*) INTO v_count FROM _pre_image_cfg;
  IF v_count <> 9 THEN
    RAISE EXCEPTION 'CAS FAIL: expected 9 pre-image config rows (8 Change-10 + 1 Change-11), found %. ABORT.', v_count;
  END IF;
  IF (SELECT count(*) FROM _pre_image) + (SELECT count(*) FROM _pre_image_cfg) <> 111 THEN
    RAISE EXCEPTION 'CAS FAIL: combined schedule+config pre-image does not equal 111. ABORT.';
  END IF;
  IF (SELECT count(*) FROM _pre_image WHERE enabled=false) <> 0 THEN
    RAISE EXCEPTION 'CAS FAIL: one or more target schedule rows were already disabled at freeze time. ABORT, re-derive.';
  END IF;
  IF (SELECT count(*) FROM _pre_image_cfg WHERE is_enabled=false) <> 0 THEN
    RAISE EXCEPTION 'CAS FAIL: one or more target config rows were already disabled. ABORT, re-derive.';
  END IF;
  IF (SELECT count(*) FROM _pre_image WHERE schedule_id IN (SELECT schedule_id FROM _expected_final_state)
      AND format_override IS NOT NULL) <> 0 THEN
    RAISE EXCEPTION 'CAS FAIL: one or more override-setting rows already carry a non-NULL format_override — frozen assumption violated. ABORT, re-derive, do not overwrite blindly.';
  END IF;
  IF (SELECT count(*) FROM _expected_final_state e WHERE NOT EXISTS (SELECT 1 FROM _pre_image p WHERE p.schedule_id = e.schedule_id)) <> 0 THEN
    RAISE EXCEPTION 'CAS FAIL: _expected_final_state references a schedule_id not present in _pre_image. ABORT.';
  END IF;
  IF (SELECT is_enabled FROM _pre_image_cfg WHERE config_id = '61e4f143-f0cf-4a9b-853c-f592daf82aaf') IS DISTINCT FROM true THEN
    RAISE EXCEPTION 'CAS FAIL: NDIS carousel config row is not is_enabled=true as frozen. ABORT.';
  END IF;

  -- Protections 1-2: pre-image sanity for the 3 baselines
  IF (SELECT cnt FROM _pp_carousel_config_baseline) <> 1 THEN
    RAISE EXCEPTION 'CAS FAIL: expected PP carousel config row enabled=true (1) before this packet, got %. Re-derive.', (SELECT cnt FROM _pp_carousel_config_baseline);
  END IF;
  IF (SELECT cnt FROM _cfw_invegent_config_baseline WHERE which='cfw') <> 2 THEN
    RAISE EXCEPTION 'CAS FAIL: expected CFW to have exactly 2 enabled containing config rows before this packet, got %. Re-derive.', (SELECT cnt FROM _cfw_invegent_config_baseline WHERE which='cfw');
  END IF;
  IF (SELECT cnt FROM _cfw_invegent_config_baseline WHERE which='invegent') <> 2 THEN
    RAISE EXCEPTION 'CAS FAIL: expected Invegent to have exactly 2 enabled containing config rows before this packet, got %. Re-derive.', (SELECT cnt FROM _cfw_invegent_config_baseline WHERE which='invegent');
  END IF;
END $$;

-- ══ 5b. Frozen-ownership pre-check for Changes 1, 2, 10 (v11, fixes AHA-10-1) ══
-- Independently joins _expected_ownership_schedule/_config to the LIVE tables -- NOT to _pre_image --
-- so a wrong-owner, missing, or extra row is caught here, before any mutation, using ONLY the frozen
-- literals authored in §4b. Any mismatch of any kind is a terminal STOP.
DO $$
DECLARE v_count int; v_expected int;
BEGIN
  SELECT count(*) INTO v_expected FROM _expected_ownership_schedule;
  IF v_expected <> 67 THEN
    RAISE EXCEPTION 'CAS FAIL: frozen ownership dataset itself has % schedule rows, expected 67. Authoring error — ABORT.', v_expected;
  END IF;
  SELECT count(*) INTO v_expected FROM _expected_ownership_config;
  IF v_expected <> 8 THEN
    RAISE EXCEPTION 'CAS FAIL: frozen ownership dataset itself has % config rows, expected 8. Authoring error — ABORT.', v_expected;
  END IF;

  -- Every frozen schedule row must have a matching LIVE row: same id, same client, same platform, same pre-state
  SELECT count(*) INTO v_count
  FROM _expected_ownership_schedule eo
  JOIN c.client_publish_schedule cps ON cps.schedule_id = eo.schedule_id
  WHERE cps.client_id = eo.expected_client_id
    AND cps.platform = eo.expected_platform
    AND cps.enabled = eo.expected_pre_enabled;
  IF v_count <> 67 THEN
    RAISE EXCEPTION 'CAS FAIL: only % of 67 frozen schedule rows matched live ownership+pre-state exactly — missing, extra, or wrong-owner row detected. ABORT, re-derive, do not proceed.', v_count;
  END IF;

  -- Every frozen config row must have a matching LIVE row: same id, same client, same pre-state
  SELECT count(*) INTO v_count
  FROM _expected_ownership_config eo
  JOIN c.client_format_config cfc ON cfc.config_id = eo.config_id
  WHERE cfc.client_id = eo.expected_client_id
    AND cfc.is_enabled = eo.expected_pre_enabled;
  IF v_count <> 8 THEN
    RAISE EXCEPTION 'CAS FAIL: only % of 8 frozen config rows matched live ownership+pre-state exactly — missing, extra, or wrong-owner row detected. ABORT, re-derive, do not proceed.', v_count;
  END IF;
END $$;

-- ══ 6. Change 1: NDIS FB (18) + IG (21) — disable, guarded UPDATE JOINs to the frozen ownership dataset ══
UPDATE c.client_publish_schedule cps SET enabled = false
FROM _expected_ownership_schedule eo
WHERE cps.schedule_id = eo.schedule_id
  AND eo.expected_platform = 'facebook'
  AND cps.client_id = eo.expected_client_id
  AND cps.platform = eo.expected_platform;
UPDATE c.client_publish_schedule cps SET enabled = false
FROM _expected_ownership_schedule eo
WHERE cps.schedule_id = eo.schedule_id
  AND eo.expected_platform = 'instagram'
  AND cps.client_id = eo.expected_client_id
  AND cps.platform = eo.expected_platform;

-- ══ 7. Change 2: NDIS YT (28) — disable, guarded UPDATE JOINs to the frozen ownership dataset ══
UPDATE c.client_publish_schedule cps SET enabled = false
FROM _expected_ownership_schedule eo
WHERE cps.schedule_id = eo.schedule_id
  AND eo.expected_platform = 'youtube'
  AND cps.client_id = eo.expected_client_id
  AND cps.platform = eo.expected_platform;

-- ══ 8. Change 3: CFW FB — client_id + platform guards ══
UPDATE c.client_publish_schedule SET format_override = 'image_quote'
  WHERE schedule_id = '433c52c1-9385-4a5e-83ae-96c5c603f915' AND client_id = '3eca32aa-e460-462f-a846-3f6ace6a3cae' AND platform = 'facebook';
UPDATE c.client_publish_schedule SET format_override = 'text'
  WHERE schedule_id IN ('f9e49b40-9e04-4548-860f-875c907ad8d8','90b8583e-b77d-498d-ba03-52e64c727a6b')
    AND client_id = '3eca32aa-e460-462f-a846-3f6ace6a3cae' AND platform = 'facebook';
UPDATE c.client_publish_schedule SET enabled = false
  WHERE schedule_id IN ('cb3e86fa-0b7b-4ab0-8b98-93de30bc699f','6966af5b-5a2e-4f0c-81e0-0e20b3c6afb1')
    AND client_id = '3eca32aa-e460-462f-a846-3f6ace6a3cae' AND platform = 'facebook';

-- ══ 9. Change 4: CFW IG — guarded ══
UPDATE c.client_publish_schedule SET format_override = 'image_quote'
  WHERE schedule_id IN ('e2024323-c0e0-468d-ac84-ff7e6cc90c66','544a05d8-bcb4-4c36-a336-ebfc99237d54','525ab2af-cb29-4a4b-a7e6-d85597838410')
    AND client_id = '3eca32aa-e460-462f-a846-3f6ace6a3cae' AND platform = 'instagram';
UPDATE c.client_publish_schedule SET enabled = false
  WHERE schedule_id IN ('9e0ce8da-861a-4b22-ab5e-415d1330e6dc','ce03f531-b40c-4705-b40d-1480c78aa48b')
    AND client_id = '3eca32aa-e460-462f-a846-3f6ace6a3cae' AND platform = 'instagram';

-- ══ 10. Change 5: CFW LI — guarded (Layer-2 enforcement) ══
UPDATE c.client_publish_schedule SET format_override = 'text'
  WHERE schedule_id IN ('4bb57dbb-fa45-40a4-a749-2ff4ca39f2ce','0a3958a8-87e5-48fe-8ab9-aeb6b57cf9d4','fd359088-507c-4b83-80da-b4736c51e64f','9e826d46-29e3-40da-839a-ca19bf61bfe7','8ad8f4e9-a07e-41ad-873f-852287846daa')
    AND client_id = '3eca32aa-e460-462f-a846-3f6ace6a3cae' AND platform = 'linkedin';

-- ══ 11. Change 6: Invegent FB — guarded ══
UPDATE c.client_publish_schedule SET format_override = 'image_quote'
  WHERE schedule_id = '1fd9a842-4db0-4292-a760-8155874b33ac' AND client_id = '93494a09-cc89-41d1-b364-cb63983063a6' AND platform = 'facebook';
UPDATE c.client_publish_schedule SET format_override = 'text'
  WHERE schedule_id IN ('c1abb720-4060-496d-8312-97cb9286c04d','5ad2665f-c0f8-4add-a6fe-b876c4bceeba')
    AND client_id = '93494a09-cc89-41d1-b364-cb63983063a6' AND platform = 'facebook';
UPDATE c.client_publish_schedule SET enabled = false
  WHERE schedule_id IN ('a7ea2dc4-8adf-439b-9d9e-ba985fce5548','1bddacbc-af9c-4adb-b764-b9d44c75b44b')
    AND client_id = '93494a09-cc89-41d1-b364-cb63983063a6' AND platform = 'facebook';

-- ══ 12. Change 7: Invegent IG — guarded ══
UPDATE c.client_publish_schedule SET format_override = 'image_quote'
  WHERE schedule_id IN ('8f6c2266-8e37-4ba0-b1b6-57434432f4ff','fd8aae40-6c75-4dcb-bb2b-6ae36e51793e','ff5927b4-184d-4a57-948d-7623e75f7008')
    AND client_id = '93494a09-cc89-41d1-b364-cb63983063a6' AND platform = 'instagram';
UPDATE c.client_publish_schedule SET enabled = false
  WHERE schedule_id IN ('6c52b1d4-bdbc-48fc-9e21-9b5d139b70f8','3fb1c2e6-b427-4b5d-bd7b-589e38663f0d')
    AND client_id = '93494a09-cc89-41d1-b364-cb63983063a6' AND platform = 'instagram';

-- ══ 13. Change 8: Invegent LI — guarded ══
UPDATE c.client_publish_schedule SET format_override = 'text'
  WHERE schedule_id IN ('b66abd5a-5541-4de0-acfa-60a53d36bb9b','1a6c4fde-030e-44f4-9d22-9ca00b4c9fa1','e22560a5-d584-468f-8c9d-accc921c330a','135a32a0-4a45-4687-af3a-839b40eb6cf2')
    AND client_id = '93494a09-cc89-41d1-b364-cb63983063a6' AND platform = 'linkedin';
UPDATE c.client_publish_schedule SET format_override = 'image_quote'
  WHERE schedule_id = '10fb5b91-c580-4a10-bb5a-625fec75ff37' AND client_id = '93494a09-cc89-41d1-b364-cb63983063a6' AND platform = 'linkedin';

-- ══ 14. Change 9: PP YT — guarded (Layer-2 enforcement) ══
UPDATE c.client_publish_schedule SET format_override = 'video_short_stat'
  WHERE schedule_id = 'f1cc1c32-0759-4ab7-a748-a70f8ae9aade' AND client_id = '4036a6b5-b4a3-406e-998d-c2fe14a8bbdd' AND platform = 'youtube';
UPDATE c.client_publish_schedule SET enabled = false
  WHERE schedule_id IN ('e951069c-e995-4cc8-a56e-b4c33291683f','abdc58c4-8aff-4483-bd91-bc2c248b6932','71a9fbd3-7ed1-41f9-b776-b63adfa3ad8b','bf705fed-6f90-49c8-becd-10b07c64b09c')
    AND client_id = '4036a6b5-b4a3-406e-998d-c2fe14a8bbdd' AND platform = 'youtube';

-- ══ 15. Change 10: format_config hygiene — guarded UPDATE JOINs to the frozen ownership dataset ══
UPDATE c.client_format_config cfc SET is_enabled = false
FROM _expected_ownership_config eo
WHERE cfc.config_id = eo.config_id
  AND cfc.client_id = eo.expected_client_id;

-- ══ 16. Change 11: NDIS carousel config closure (§1.2) ══
UPDATE c.client_format_config SET is_enabled = false
WHERE config_id = '61e4f143-f0cf-4a9b-853c-f592daf82aaf' AND client_id = 'fb98a472-ae4d-432d-8738-2273231c1ef4' AND ice_format_key = 'carousel';

-- ══ 17. Post-image assertions — per-cell coverage for every one of the 111 touched rows, plus Protections 1-2 ══
DO $$
DECLARE v_count int; v_before int; v_after int;
BEGIN
  -- Changes 1+2 (67 rows, FB+IG+YT) — independent per-ID join against the frozen ownership dataset
  -- (v11, fixes AHA-10-1): NOT a self-referential re-scope from the live row being checked.
  SELECT count(*) INTO v_count
  FROM _expected_ownership_schedule eo
  JOIN c.client_publish_schedule cps ON cps.schedule_id = eo.schedule_id
  WHERE cps.client_id IS DISTINCT FROM eo.expected_client_id
     OR cps.platform IS DISTINCT FROM eo.expected_platform
     OR cps.enabled IS DISTINCT FROM eo.expected_after_enabled;
  IF v_count <> 0 THEN RAISE EXCEPTION 'POST-ASSERT FAIL: % of the 67 Change 1/2 rows did not land in their expected final state (or ownership drifted).', v_count; END IF;

  -- Missing/extra check: exactly 67 frozen rows must still exist live under the expected owner
  SELECT count(*) INTO v_count
  FROM _expected_ownership_schedule eo
  WHERE EXISTS (SELECT 1 FROM c.client_publish_schedule cps WHERE cps.schedule_id = eo.schedule_id AND cps.client_id = eo.expected_client_id);
  IF v_count <> 67 THEN RAISE EXCEPTION 'POST-ASSERT FAIL: only % of 67 frozen Change 1/2 rows still exist under their expected owner post-apply — missing or reassigned row.', v_count; END IF;

  -- NDIS YT — also the named PK-item-2 supervised-cell guarantee (all NDIS YT enabled=0, by any owner)
  SELECT count(*) INTO v_count FROM c.client_publish_schedule
    WHERE client_id='fb98a472-ae4d-432d-8738-2273231c1ef4' AND platform='youtube' AND enabled=true;
  IF v_count <> 0 THEN RAISE EXCEPTION 'POST-ASSERT FAIL: NDIS YT still has % enabled rows.', v_count; END IF;

  -- PP YT kinetic (named PK-item-2 supervised-cell guarantee)
  SELECT count(*) INTO v_count FROM c.client_publish_schedule
    WHERE client_id='4036a6b5-b4a3-406e-998d-c2fe14a8bbdd' AND platform='youtube' AND enabled=true AND format_override <> 'video_short_stat';
  IF v_count <> 0 THEN RAISE EXCEPTION 'POST-ASSERT FAIL: PP YT kinetic still schedulable, % rows.', v_count; END IF;

  -- CFW LI image_quote (named PK-item-2 supervised-cell guarantee)
  SELECT count(*) INTO v_count FROM c.client_publish_schedule
    WHERE client_id='3eca32aa-e460-462f-a846-3f6ace6a3cae' AND platform='linkedin' AND enabled=true AND format_override <> 'text';
  IF v_count <> 0 THEN RAISE EXCEPTION 'POST-ASSERT FAIL: CFW LI image_quote still schedulable, % rows.', v_count; END IF;

  -- Changes 3-9 (35 rows) — exact per-row final-state proof, all in one comparison
  SELECT count(*) INTO v_count
  FROM _expected_final_state e
  JOIN c.client_publish_schedule cps ON cps.schedule_id = e.schedule_id
  WHERE cps.enabled IS DISTINCT FROM e.expected_enabled
     OR cps.format_override IS DISTINCT FROM e.expected_override;
  IF v_count <> 0 THEN RAISE EXCEPTION 'POST-ASSERT FAIL: % of the 35 Change 3-9 rows did not land in their expected final state.', v_count; END IF;

  -- Change 10 (8 config rows) — independent per-ID join against the frozen ownership dataset (v11)
  SELECT count(*) INTO v_count
  FROM _expected_ownership_config eo
  JOIN c.client_format_config cfc ON cfc.config_id = eo.config_id
  WHERE cfc.client_id IS DISTINCT FROM eo.expected_client_id
     OR cfc.is_enabled IS DISTINCT FROM eo.expected_after_enabled;
  IF v_count <> 0 THEN RAISE EXCEPTION 'POST-ASSERT FAIL: % of the 8 Change 10 rows did not land in their expected final state (or ownership drifted).', v_count; END IF;

  SELECT count(*) INTO v_count
  FROM _expected_ownership_config eo
  WHERE EXISTS (SELECT 1 FROM c.client_format_config cfc WHERE cfc.config_id = eo.config_id AND cfc.client_id = eo.expected_client_id);
  IF v_count <> 8 THEN RAISE EXCEPTION 'POST-ASSERT FAIL: only % of 8 frozen Change 10 rows still exist under their expected owner post-apply — missing or reassigned row.', v_count; END IF;

  -- Change 11 (1 config row) — disabled
  IF (SELECT is_enabled FROM c.client_format_config WHERE config_id = '61e4f143-f0cf-4a9b-853c-f592daf82aaf') IS DISTINCT FROM false THEN
    RAISE EXCEPTION 'POST-ASSERT FAIL: NDIS carousel config row not disabled.';
  END IF;

  -- STOP condition: PP FB/IG enabled-row count byte-identical (schedule-row proxy, real in-transaction check)
  SELECT cnt INTO v_before FROM _pp_carousel_baseline;
  SELECT count(*) INTO v_after FROM c.client_publish_schedule
    WHERE client_id='4036a6b5-b4a3-406e-998d-c2fe14a8bbdd' AND platform IN ('facebook','instagram') AND enabled=true;
  IF v_before <> v_after THEN
    RAISE EXCEPTION 'STOP: PP FB/IG enabled row count changed % -> % during this transaction — carousel/format redistribution risk. Automatic abort per PK standing rule.', v_before, v_after;
  END IF;

  -- Protection 1: PP carousel REAL lever unchanged
  SELECT cnt INTO v_before FROM _pp_carousel_config_baseline;
  SELECT count(*) INTO v_after FROM c.client_format_config WHERE config_id = 'fc339e1e-5809-4b9c-9c03-2c60a4166a80' AND is_enabled = true;
  IF v_before <> v_after THEN
    RAISE EXCEPTION 'STOP: PP carousel config lever changed % -> % — this must stay untouched, declared-legacy D2.', v_before, v_after;
  END IF;

  -- Protection 2: CFW containing config rows must remain present+enabled
  SELECT count(*) INTO v_count FROM c.client_format_config
    WHERE client_id = '3eca32aa-e460-462f-a846-3f6ace6a3cae' AND ice_format_key IN ('image_quote','text') AND is_enabled = true;
  IF v_count <> 2 THEN
    RAISE EXCEPTION 'STOP: CFW containing config rows changed, now % (expected 2) — row presence is what contains carousel; deletion fails open.', v_count;
  END IF;

  -- Protection 2: Invegent containing config rows must remain present+enabled
  SELECT count(*) INTO v_count FROM c.client_format_config
    WHERE client_id = '93494a09-cc89-41d1-b364-cb63983063a6' AND ice_format_key IN ('image_quote','text') AND is_enabled = true;
  IF v_count <> 2 THEN
    RAISE EXCEPTION 'STOP: Invegent containing config rows changed, now % (expected 2) — same fragility as CFW.', v_count;
  END IF;

  -- Total row-existence sanity checks
  SELECT count(*) INTO v_count FROM c.client_publish_schedule WHERE schedule_id IN (SELECT schedule_id FROM _pre_image);
  IF v_count <> 102 THEN RAISE EXCEPTION 'POST-ASSERT FAIL: expected 102 schedule rows in scope, found %.', v_count; END IF;
  SELECT count(*) INTO v_count FROM c.client_format_config WHERE config_id IN (SELECT config_id FROM _pre_image_cfg);
  IF v_count <> 9 THEN RAISE EXCEPTION 'POST-ASSERT FAIL: expected 9 config rows in scope, found %.', v_count; END IF;
END $$;

-- ══ Protection 5: readiness expected-after matrix (replaces the old aggregate check) ══
DO $$
DECLARE v_unexpected_regressions int; v_unexpected_appearance int;
BEGIN
  CREATE TEMP TABLE _readiness_after_detail AS
  SELECT cl.client_slug, cell->>'platform' AS platform, cell->>'format' AS format
  FROM c.client cl
  CROSS JOIN LATERAL jsonb_array_elements(public.get_client_production_readiness_queue(cl.client_slug)) AS cell
  WHERE cl.client_slug IN ('property-pulse','ndis-yarns','care-for-welfare-pty-ltd','invegent')
    AND cell->>'overall_state' = 'ready';

  -- Any cell ready BEFORE, not ready AFTER, and NOT in the named exception list = unnamed regression = STOP
  SELECT count(*) INTO v_unexpected_regressions
  FROM _readiness_before_detail b
  WHERE NOT EXISTS (SELECT 1 FROM _readiness_after_detail a WHERE a.client_slug=b.client_slug AND a.platform=b.platform AND a.format=b.format)
    AND NOT EXISTS (SELECT 1 FROM _readiness_expected_exceptions e WHERE e.client_slug=b.client_slug AND e.platform=b.platform AND e.format=b.format);
  IF v_unexpected_regressions <> 0 THEN
    RAISE EXCEPTION 'STOP: % cell(s) regressed from ready to not-ready outside the named exception list (PP kinetic, NDIS stat, CFW LI image_quote, NDIS carousel) — unexpected redistribution or unnamed-lane regression.', v_unexpected_regressions;
  END IF;

  -- Any cell NOT ready before, ready AFTER = an unexpected appearance/expansion — not authorized by this packet
  SELECT count(*) INTO v_unexpected_appearance
  FROM _readiness_after_detail a
  WHERE NOT EXISTS (SELECT 1 FROM _readiness_before_detail b WHERE b.client_slug=a.client_slug AND b.platform=a.platform AND b.format=a.format);
  IF v_unexpected_appearance <> 0 THEN
    RAISE EXCEPTION 'STOP: % cell(s) became newly ready that were not ready before — unexpected expansion, not authorized by this packet.', v_unexpected_appearance;
  END IF;
END $$;

COMMIT;
```

### 3.3 Manifest re-verification

- **102 schedule rows**: 18 (NDIS FB) + 21 (NDIS IG) + 28 (NDIS YT) + 5×7 (Changes 3–9) = 18+21+28+35 = **102**. ✓
- **9 `client_format_config` rows**: 8 (Change 10) + 1 (Change 11) = **9**. ✓
- **111 total affected rows**: 102 + 9 = **111**. ✓ (all 5 protections assert on rows already inside or
  adjacent to this set; the mutation-target count stays 111.)

### 3.4 Exact inverse rollback — durable, integrates Change 11, proves exact reversal

**Execution channel:** this rollback script, like the apply script (§3.2), must be submitted as
exactly ONE `mcp__supabase__execute_sql` call — a separate call from the apply, run only if the
apply's own commit already landed and a revert is needed.

```sql
BEGIN;
UPDATE c.client_publish_schedule cps SET enabled = pi.enabled, format_override = pi.format_override
FROM c._rollback_post_cgu_v1_schedule_v10_20260804 pi WHERE cps.schedule_id = pi.schedule_id;
UPDATE c.client_format_config cfc SET is_enabled = pi.is_enabled
FROM c._rollback_post_cgu_v1_schedule_v10_20260804_cfg pi WHERE cfc.config_id = pi.config_id;

DO $$
DECLARE v_count int;
BEGIN
  -- Row-existence completeness: confirm all 102/9 durable pre-image rows are still present BEFORE
  -- trusting a JOIN-based "0 mismatches" as proof of a complete restoration.
  SELECT count(*) INTO v_count FROM c.client_publish_schedule
    WHERE schedule_id IN (SELECT schedule_id FROM c._rollback_post_cgu_v1_schedule_v10_20260804);
  IF v_count <> 102 THEN RAISE EXCEPTION 'ROLLBACK FAIL: expected 102 schedule rows still present to restore, found %. Restoration is incomplete, not merely mismatched.', v_count; END IF;
  SELECT count(*) INTO v_count FROM c.client_format_config
    WHERE config_id IN (SELECT config_id FROM c._rollback_post_cgu_v1_schedule_v10_20260804_cfg);
  IF v_count <> 9 THEN RAISE EXCEPTION 'ROLLBACK FAIL: expected 9 config rows still present to restore, found %. Restoration is incomplete, not merely mismatched.', v_count; END IF;

  -- Generic: every schedule row restored to its exact pre-image
  SELECT count(*) INTO v_count FROM c.client_publish_schedule cps
    JOIN c._rollback_post_cgu_v1_schedule_v10_20260804 pi ON cps.schedule_id=pi.schedule_id
    WHERE cps.enabled IS DISTINCT FROM pi.enabled OR cps.format_override IS DISTINCT FROM pi.format_override;
  IF v_count <> 0 THEN RAISE EXCEPTION 'ROLLBACK FAIL: % of 102 schedule rows did not restore to their exact pre-image.', v_count; END IF;

  -- Generic: every config row restored (covers Change 10's 8 + Change 11's 1 = 9)
  SELECT count(*) INTO v_count FROM c.client_format_config cfc
    JOIN c._rollback_post_cgu_v1_schedule_v10_20260804_cfg pi ON cfc.config_id=pi.config_id
    WHERE cfc.is_enabled IS DISTINCT FROM pi.is_enabled;
  IF v_count <> 0 THEN RAISE EXCEPTION 'ROLLBACK FAIL: % of 9 config rows did not restore to their exact pre-image.', v_count; END IF;

  -- Change 11 named, specific proof of exact reversal
  IF (SELECT is_enabled FROM c.client_format_config WHERE config_id = '61e4f143-f0cf-4a9b-853c-f592daf82aaf') IS DISTINCT FROM true THEN
    RAISE EXCEPTION 'ROLLBACK FAIL: NDIS carousel config row (Change 11) did not restore to is_enabled=true.';
  END IF;
END $$;
COMMIT;

-- Cleanup, only after rollback is confirmed successful and no longer needed as evidence:
-- DROP TABLE c._rollback_post_cgu_v1_schedule_v10_20260804, c._rollback_post_cgu_v1_schedule_v10_20260804_cfg;
```

**Corrected failure-point prose (fixes v9's AHA-02-1 finding):** if the durable pre-image tables never
existed (e.g. the apply transaction never actually committed), the **two `UPDATE ... FROM` statements
above** will themselves error with "relation does not exist" — this is the actual first failure point,
not the `DO` block's row-existence check. That check exists for a *different* scenario: the tables
exist but are missing rows (a partial/corrupted persistence), which is a real possibility distinct from
non-existence and is exactly what it's designed to catch. Both failure modes are loud, not silent —
there is no scenario in which this rollback silently no-ops.

---

## 4. Before/after capture (schedule rows + demand grid + readiness state)

```sql
-- A. Schedule rows (full snapshot, all 4 clients, all platforms)
SELECT client_id, platform, day_of_week, enabled, format_override, count(*)
FROM c.client_publish_schedule GROUP BY 1,2,3,4,5 ORDER BY 1,2,3;

-- B. Weekly demand grid / skip reasons (NDIS focus, but run for all 4 clients)
SELECT client_id, platform, skip_reason, count(*) FROM m.slot
WHERE created_at > now() - interval '14 days' AND skip_reason IS NOT NULL
GROUP BY 1,2,3 ORDER BY 4 DESC;

-- C. Readiness expected-after matrix, standalone re-confirmation (mirrors §3.2's in-transaction check)
SELECT cl.client_slug, cell->>'platform' AS platform, cell->>'format' AS format
FROM c.client cl
CROSS JOIN LATERAL jsonb_array_elements(public.get_client_production_readiness_queue(cl.client_slug)) AS cell
WHERE cl.client_slug IN ('property-pulse','ndis-yarns','care-for-welfare-pty-ltd','invegent')
  AND cell->>'overall_state' = 'ready';
-- Diff against the pre-apply run of the same query. Every regression must be one of exactly 4 named
-- cells (PP kinetic YT, NDIS stat YT, CFW LI image_quote, NDIS carousel FB/IG). Any other regression,
-- or any new appearance, is a STOP requiring investigation before this lane is accepted.

-- D. NDIS client_format_config carousel row, confirm is_enabled=false post-apply
SELECT config_id, ice_format_key, is_enabled FROM c.client_format_config
WHERE config_id = '61e4f143-f0cf-4a9b-853c-f592daf82aaf';

-- E. PP carousel real lever, confirm UNCHANGED post-apply
SELECT config_id, ice_format_key, is_enabled FROM c.client_format_config
WHERE config_id = 'fc339e1e-5809-4b9c-9c03-2c60a4166a80';
-- Before: true. After: true (unchanged). Any other value is a STOP.

-- F. CFW/Invegent containing config rows, confirm still present+enabled
SELECT client_id, ice_format_key, is_enabled FROM c.client_format_config
WHERE client_id IN ('3eca32aa-e460-462f-a846-3f6ace6a3cae','93494a09-cc89-41d1-b364-cb63983063a6')
  AND ice_format_key IN ('image_quote','text');
-- Before and after: 4 rows total (2 per client), all is_enabled=true. Fewer rows or any false is a STOP.
```
Diff A and B pre/post. PP FB/IG carousel's row count in A must be byte-identical pre/post (enforced
in-transaction, §3.2). D, E, and F must show exactly the stated expected values.

**Final lane acceptance also requires a dashboard verification pass** against the approved four-brand
schedule matrix — confirming the live dashboard's displayed schedule/cap state for PP, NDIS, CFW, and
Invegent matches exactly what this packet declares as the post-apply state (§3.1's manifest, this
section's capture). This is a post-apply acceptance step, not something this document performs.

---

## 5. STOP conditions

1. Client-identity resolution fails — zero/multiple active clients per slug, or drift from the pinned
   UUID → in-transaction, automatic, first action in the transaction.
2. Any CAS pre-image assertion fails (schedule≠102, config≠9, any row already mutated) → in-transaction,
   automatic.
3. **(v11, fixes AHA-10-1) Any of Changes 1/2/10's 75 rows is missing, extra, or has a wrong owner
   relative to the frozen `_expected_ownership_schedule`/`_expected_ownership_config` dataset** — checked
   independently at three separate points: the pre-mutation ownership+pre-state join (must match exactly
   67+8), the guarded `UPDATE`'s own join scope, and the post-assertion's independent re-join → all
   in-transaction, automatic.
4. Any per-change row count mismatch (Changes 1–11, now uniformly covered — Changes 3–11 via
   `_expected_final_state`, Changes 1/2/10 via `_expected_ownership_*` per item 3) → in-transaction,
   automatic.
5. Any Layer-2 cell (PP kinetic, NDIS stat, CFW LI image_quote) retains unattended schedule volume →
   in-transaction, automatic.
6. Any change in PP FB/IG schedule row count (schedule-row proxy) → in-transaction, automatic.
7. **PP's actual carousel lever (`client_format_config`) changes at all** → in-transaction, automatic.
8. NDIS carousel config row not disabled post-apply → in-transaction, automatic.
9. CFW's or Invegent's 2 containing `client_format_config` rows change count or drop below 2 →
   in-transaction, automatic.
10. **Any readiness-queue cell regresses from `ready` to not-`ready` outside the 4 named exceptions (PP
    kinetic YT, NDIS stat YT, CFW LI image_quote, NDIS carousel FB/IG)** → in-transaction, automatic.
11. **Any readiness-queue cell newly appears as `ready` that was not ready before** → in-transaction,
    automatic.
12. Final schedule/config row-count totals don't match 102/9 → in-transaction, automatic.
13. A durable rollback table naming collision at creation → the whole apply transaction aborts via a
    native PostgreSQL DDL error on the bare `CREATE TABLE` (uniquely named for v10, unchanged in v11 —
    still not an application-level `RAISE EXCEPTION`), rather than silently proceeding on stale rollback
    data.
14. Rollback's own post-restore diff is non-zero → STOP, escalate to PK with the exact row-level diff;
    durable rollback tables remain available for manual reconciliation.
15. Final lane acceptance requires a dashboard verification pass against the approved four-brand
    schedule matrix — a post-apply acceptance step, not something this document performs (see §4).
16. `state_1_capability_proven` proof-event count changes before/after → executable query named in
    `packet-v4.md` §4.C; human/db-rls-auditor-run (this packet's mutations touch zero rows in
    `c.creative_template_proof_event`, so this is structurally invariant by construction, not merely
    hoped-for — but re-confirming live remains a recommended human step).

All conditions 1–13 cause automatic `ROLLBACK` — via `RAISE EXCEPTION` for conditions 1–12, and via a
native PostgreSQL DDL abort (the bare `CREATE TABLE` collision itself, not an application-level `RAISE
EXCEPTION`) for condition 13 — no partial apply is possible either way.

---

## 6. M11b — recorded here, not in the canonical CGU Final proposal

**M11b — Fleet carousel governed-provenance migration.** Confirmed live legacy scope (§1.1): PP
carousel, NDIS carousel, CFW carousel. Classification: `legacy_routed / frozen_pending_M11b` for
all three. Tier: must-have candidate, **PENDING PK TIER RULING** — not started, not implemented by
this lane. This schedule lane's only actions regarding the fleet carousel finding are: (a) the
structural zero-change assertions for PP, including the real lever (§1.5, protection 1), (b) Change 11
closing NDIS's live config-gated exposure channel (§1.2), (c) the CFW/Invegent existence guards (§1.5,
protection 2), and (d) this record. The actual M11b migration is explicitly **out of scope for this
lane** and must be recorded, scoped, and tiered separately — **never by editing
`docs/briefs/creatomate-global-ultimate-final-delta-audit-v1.md` directly.**

**Also flagged, not resolved:** ~21% of all `m.post_render_log` rows tagged `ice_format_key='carousel'`
system-wide correspond to a draft whose own recorded format decision was something else (`text`/
`image_quote`) — majority pattern for CFW/Invegent specifically. Needs a source-code read of the legacy
image-worker render dispatcher, out of this lane's DB-only scope. Recommend attaching to M11b's own
scoping.

---

## 7. Explicit non-claims

This document does not apply any mutation, does not authorize itself, does not build the M11b
migration (§6), does not resolve the `ice_format_key='carousel'` labeling ambiguity (§6), does not
raise any LinkedIn cadence, does not activate CFW or Invegent YouTube, does not promote any Layer-2
cell, does not authorize the PP YT stat raise past 1/week, does not touch or modify the isolated
worktree in any way, and does not perform the dashboard verification named in §5 item 14 (that is a
post-apply acceptance step for a later gate). It requires `apply-harness-auditor` → `branch-warden` →
`ask_chatgpt_review` → a PK execution gate before anything runs. No schedule or config changes are
authorized by this document alone. **v5 (both the isolated worktree's original and its `e76391b`
amendment), v8, v9, and v10 are declared superseded and execution-ineligible by this document — v11 is
the sole authoritative packet for this lane going forward.**

---
