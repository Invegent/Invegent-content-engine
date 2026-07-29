# Creatomate Global — Registry Integrity and Graduation Contract v1

> **STATUS: APPLIED 2026-07-29.** PK authorized apply after reviewing the §0.3/§2.3/§3.4 correction
> below (the row-17 "already excluded" claim was wrong — see §6a). The default packet (§3.1, excluding
> the row-19 PK-elective, which PK separately declined) was executed as one transaction via a single
> `mcp__supabase__execute_sql` call; every fail-closed rowcount assertion passed, zero exceptions raised.
> Post-apply verification (§7) confirms all 9 values landed exactly as proposed and the required
> `select_template` diff matches the corrected prediction exactly: winners unchanged for all 5
> client/platform pairs tested; row 17 now rejected (`status_below_smoke`) and absent from
> property-pulse's `alternatives[]` for both facebook and instagram; the four promoted assignments echo
> `production_proven`; nothing else in any response changed. Rollback file remains valid and unused.
>
> **Type:** Registry-repair PROPOSAL + reusable graduation contract, now applied. The rest of this
> document is preserved as-authored (including the pre-apply "nothing has been applied" framing below)
> for the audit trail; §6a and this banner are the record of what actually happened. Data pulled live (db-rls-auditor + direct `execute_sql` SELECTs, 2026-07-29) against
> `c.creative_provider_template` + `c.creative_template_client_assignment` + `c.creative_template_variant_candidate`
> + `c.creative_template_platform_suitability` + `c.creative_template_proof_event` + `m.post_render_log`/`post_draft`/`post_publish`,
> and against `supabase/migrations/20260703035154_create_select_template_v1.sql` (the live selector RPC,
> read directly — not paraphrased from memory) + `supabase/functions/image-worker/index.ts` (confirmed
> the production `image_quote` branch calls it at line 952) + `supabase/functions/video-worker/b1_video_stat.ts`.
> Builds on `docs/briefs/results/creatomate-template-graduation-matrix-v1.md` (2026-07-29, commit `8e1c0ff`)
> but **re-verifies every cited number independently rather than restating it**, and corrects two places
> where that matrix's framing is now stale (§0.2).
>
> **Boundaries honored:** no template activated, no selector ranking changed, no new worker format wired,
> no client-specific proof claimed from another client's evidence, not combined with B-roll activation,
> the uncommitted `supabase/functions/video-worker/{b1_video_stat.ts,b1_video_stat_test.ts,index.ts}`
> changes already in the working tree were not read for content and are untouched by anything here.

---

## 0. Headline findings

1. **A same-day event already changed video-selector state, independent of this packet.** A "B-roll
   Parity Activation v1" (commit `d5ddca1`, DB write at `2026-07-29T05:30:02Z`, `reviewed_by='PK'`)
   demoted row 19 (`c11bb8ab`) and row 26 (`03bc6a3c`) from `fit_status='strong_candidate'` to
   `'candidate'` and promoted row 27 (`46c5c4ac`) to `'strong_candidate'` as "PP default for
   `video_short_stat`." This landed 16 minutes after the graduation-matrix doc's commit — the matrix's
   "row 19 = current live winner" framing is now stale. **This packet does not touch any `fit_status`
   value and treats this event as read-only context**, per the explicit boundary against combining with
   B-roll activation.
2. **Per-client evidence attribution changes two of the matrix's headline framings.** `m.post_render_log`
   and `m.post_draft` carry their own `client_id` column — proof is directly attributable, not inferred.
   Doing that attribution surfaces:
   - **Row 7:** 100% of the 11 renders/11 drafts/8 publishes trace to **invegent only**. Property-pulse's
     `visually_approved` assignment on this same template has **zero** of its own evidence, despite the
     matrix listing "PP + Invegent both `visually_approved`" as if the proof were shared.
   - **Row 19:** of the 8 succeeded renders in the aggregate count, only **3** are attributable to a
     client (property-pulse); the other 5 have neither `client_id` nor `post_draft_id` set. Counting only
     PP's own attempts, PP's timeout rate is **5 of 8 = 62.5%**, not the aggregate 38% the matrix and this
     packet's headline both cite. NDIS's assignment on row 19 has **zero** of its own evidence.
   - **Row 5**, by contrast, genuinely has independent proof for all three assigned clients (PP 32/30/28,
     NDIS 14/14/12, CFW 10/10/8) — the matrix's "optional NDIS/CFW parity" suggestion is upgraded here
     from optional to evidenced (§2.1).
3. **CORRECTED (post-review, pre-apply check): row 17 is a LIVE alternative for property-pulse today —
   not already excluded.** The original version of this document asserted row 17 was already excluded
   from selection by `scope='client'` failing `select_template`'s step (a), making the repair pure
   defense-in-depth with zero live output change. That was based on reading
   `supabase/migrations/20260703035154_create_select_template_v1.sql` — **the only `select_template`
   migration file that exists anywhere in the repo** — without separately confirming the migration file
   matches what is actually deployed. It does not. Querying the live function directly
   (`pg_get_functiondef`) shows the DEPLOYED `select_template` carries an extension not present in that
   file, its own inline comment calling it **"v0.x (A2)"**: a `scope='client'` template IS selectable,
   but only for the client that owns it (`t.client_id = caller`). **This extension has no corresponding
   migration file anywhere in the repo — untracked schema drift**, flagged here as an independent fact,
   not something this packet fixes. Row 17 is owned by property-pulse (`t.client_id` = PP's client_id),
   so under the LIVE function it passes the scope check for PP specifically and appeared, confirmed live
   just before apply, in PP's `image_quote` `alternatives[]` for both facebook and instagram — one
   tie-break away from becoming the winner if PP's row-5 assignment were ever touched. It is correctly
   excluded for NDIS/CFW/invegent (`reason_code='wrong_scope', detail='client_scoped_other_client'`),
   which is why earlier spot-checks against those clients looked consistent with the original (wrong)
   claim. **Net effect on the repair itself: unchanged and, if anything, more clearly justified** —
   retiring row 17 removes a real, live, provider-deleted-but-still-offered alternative for PP, not a
   no-op. See §3.4 (corrected) for the full accounting.
4. **The registry's status/assignment enums do not have a literal "retired" value.** Checked directly
   against the live `CHECK` constraints (§1.3). The canonical ladder below uses `retired` as a
   **conceptual** state; the closest legal literal for template-level `status` and client-level
   `assignment_status` is `deprecated`, and for `platform_suitability`/`fit_status` (which have no
   `deprecated` value at all) it is `blocked`. This asymmetry is a pre-existing schema fact, not
   something this packet fixes — flagged as a carry in §4.

---

## 1. Canonical proof states

Nine states, ordered as PK specified. Each entry gives the required evidence, whether it is
provider-template-specific / client-specific / format-specific / platform-specific, and — because the
live schema's enums are fixed `CHECK` constraints (verified directly, not assumed) — the exact legal
DB literal(s) that state maps to today, where one exists.

### 1.1 The four physical enums this ladder maps onto (verified live via `pg_constraint`)

| Column | Table | Legal `CHECK` values |
|---|---|---|
| `status` | `c.creative_provider_template` | `discovered, inventory_requested, inventory_captured, inventory_verified, classified, field_mapped, governance_reviewed, smoke_rendered, visually_approved, platform_safe, client_enabled, production_proven, deprecated, blocked` |
| `assignment_status` | `c.creative_template_client_assignment` | `proposed, approved, visually_approved, client_enabled, production_proven, deprecated, blocked` |
| `suitability_status` | `c.creative_template_platform_suitability` | `unknown, candidate, not_suitable, needs_review, platform_safe, production_proven, blocked` |
| `fit_status` | `c.creative_template_variant_candidate` | `unknown, candidate, strong_candidate, weak_candidate, needs_template_edit, unsuitable, blocked` |

None of these four enums contains a literal `ready_for_proof`, `render_proven`, `real_draft_proven`,
`publish_proven`, or `retired`. This is expected and not a defect: the DB's `status`/`assignment_status`
columns encode a coarse **workflow/governance stage**; the fine-grained proof milestones this packet's
canonical ladder distinguishes are **verified against the fact tables** (`m.post_render_log`/`post_draft`/
`post_publish`), not stored as a status literal. A row can sit at DB `status='smoke_rendered'` for months
after real production proof exists elsewhere (row 5's template-level `status` has never been bumped past
`smoke_rendered` despite 60 real renders and a `production_proven` PP assignment) — this is the registry's
existing, apparently-accepted practice (assignment-level status is the operative gate `select_template`
actually reads; template-level `status` is a floor/capture-time marker). This packet does not change that
practice — see §2's per-row rulings for what is and is not touched.

### 1.2 The nine states

| # | State | Meaning | Evidence required | Dimensionality |
|---|---|---|---|---|
| 1 | **candidate** | The provider template is known to the registry (captured from a provider read, docs, or manual entry) but has not yet been visually reviewed by PK. | A `c.creative_provider_template` row exists with `inventory_status` in `captured_from_docs/captured_from_provider_read/captured_from_manual_entry/captured_from_render_probe/verified`; no `c.creative_template_proof_event` row of `proof_type='visual_approval'` exists yet for any assignment. | provider-template-specific only. Not client/format/platform-specific — a template either exists in the registry or it doesn't. |
| 2 | **visually_approved** | PK looked at an actual rendered preview (need not be through the real production pipeline — a controlled/manual Creatomate render is sufficient) and approved the design/look for a specific client. | A `c.creative_template_proof_event` row: `proof_type='visual_approval'`, `proof_status='passed'`, `assignment_id` pointing at that client's assignment, with a concrete `evidence_reference` (an image/video file or Creatomate render id — not a bare claim). | **client-specific** + **format-specific** (approval is granted per client×format pairing — the same template can read right for one client's brand and wrong for another's). Not platform-specific (the look doesn't vary by which social platform posts it). |
| 3 | **ready_for_proof** | Beyond the visual sign-off, every mechanical prerequisite for a REAL production-pipeline render is satisfied: the template's field contract is mapped to worker code, governed asset resolution is wired, and dimensions/duration/output type match the target format — but no real render through the actual worker path has been attempted yet. | `c.creative_template_variant_candidate` row present (not fenced at `variant_candidate=0`) with `fit_status` in `candidate/strong_candidate`; `c.creative_provider_template_field` rows exist covering every element the target format's worker code reads (not just one field — see row 26 caveat, §2.5); zero `m.post_render_log` rows for this `provider_template_id`. | provider-template-specific + **format-specific** (the field contract is a property of the template×format shape). Not client-specific (readiness is about the template mechanics, not which client) or platform-specific. |
| 4 | **render_proven** | At least one REAL render succeeded through the actual production worker path (image-worker's `b1` branch or video-worker's `renderGovernedVideoStat` — not a manual probe or capture-time smoke test; the registry's own `smoke_rendered` status value is explicitly NOT this — see §1.1). | ≥1 `m.post_render_log` row, `status='succeeded'`, keyed to the `provider_template_id` via `render_spec->'tmr'->>'provider_template_id'` / `render_spec->'template'->>'provider_template_id'`. | provider-template-specific + format-specific. **Not** by itself client-specific — this milestone proves the template mechanically works; it does not transfer any single client's trust. |
| 5 | **real_draft_proven** | The successful render was consumed into a genuine `m.post_draft` row (an actual content-pipeline draft a human/queue could act on), for a specific client. | ≥1 `m.post_draft` row traceable (via `post_draft_id`) from a `render_proven` render, with `m.post_render_log.client_id` (or the draft's own `client_id`) identifying the client. | **client-specific** (a draft always belongs to a client) + format-specific + provider-template-specific. Not yet platform-specific — a draft isn't platform-bound until publish. |
| 6 | **publish_proven** | The draft was actually published — a `m.post_publish` row with `status='published'`, not merely attempted. | ≥1 succeeded `m.post_publish` row joined through that client's draft. | **client-specific** + format-specific + **platform-specific** (this is the first state where platform matters — a template can be `publish_proven` on facebook for a client without yet being proven on linkedin for the same client). |
| 7 | **production_proven** | Sustained, repeated, client-attributed real production usage exists (not a single one-off), and PK is willing to trust this client×format×[platform] combination as a default. **A template must never reach this state for a given client from another client's proof, or from template-level aggregate proof — the evidence must be attributable to that client's own render/draft/publish activity** (§0.2; enforced row-by-row in §2). | Multiple client-attributed render/draft/publish rows over a real time span (not one probe), a recorded PK approval, and — where a reliability concern exists in the same evidence (e.g. a client-attributable timeout rate) — that risk stated alongside, never hidden by the promotion. | client-specific + format-specific; platform-specific only where the worker's publish path is itself platform-gated (image-worker is per-platform; video-worker's `video_short_stat` calls `select_template(p_platform=null)` by design, so platform-specificity collapses for video — noted, not treated as a gap). |
| 8 | **blocked** | No path to `render_proven` exists today, for one of: (a) an explicit governance fence (a migration-level assertion holding `variant_candidate=0`, or a manual `blocked`/`not_suitable` value); (b) a missing prerequisite (no field-contract match, no worker render function for the shape); (c) the provider object cannot be confirmed to exist/reachable. | The explicit fencing assertion (cite the migration), OR a confirmed field-contract gap, OR a confirmed absence of worker code for the format (grep returns zero hits). | Usually provider-template-specific + format-specific (a worker-path gap is about the template×format pairing). Can be client-specific in the narrow case of a per-client asset-resolution gap — rare, not seen in rows 1–27. |
| 9 | **retired** | Was previously in a proven state, but the underlying provider template object has been deleted/replaced upstream, or has been formally superseded — it must never be selectable again regardless of what any stored status column still says. | Confirmed provider non-existence: **this environment has no live Creatomate API read tool**, so confirmation is via independent corroboration of a vendored-registry `provider_status` field AND worker-code acknowledgment (both must agree — see row 17, §2.3), or an explicit PK supersede decision naming the successor `provider_template_id`. | **provider-template-specific**, and propagates to EVERY client assignment / platform-suitability / variant-candidate row referencing that template — this is why row 17's repair touches four tables at once (§3), not one. |

---

## 2. Row reconciliation (rows 5, 7, 17, 19, 26)

Live-pulled 2026-07-29 (see the exact SQL cited in each subsection; project `mbkmaxqhsohbtwsqolns`,
SELECT-only throughout).

### 2.1 Row 5 — `48cba556-0a53-4001-90f0-05420d10efc0` (generic_market_insight_card_1x1_v1)

| client | assignment_id | assignment_status (live) | own render/draft/publish | own proof_event |
|---|---|---|---|---|
| property-pulse | `7806fa5e-9fe1-4955-a5b3-3095d5ab6d5c` | `production_proven` | 32 renders / 30 drafts / 28 publishes (27 published, 1 failed) | passed, 2026-07-03 |
| ndis-yarns | `c4737728-eb87-462f-aa79-ce6b321ba8ef` | `visually_approved` | 14 renders / 14 drafts / 12 publishes (all published) | passed, 2026-07-18 |
| care-for-welfare-pty-ltd | `60e43a0e-8ac3-497d-b823-8d41c2aa123b` | `visually_approved` | 10 renders / 10 drafts / 8 publishes (7 published, 1 failed) | passed, 2026-07-20 |
| (unattributed — `client_id`+`post_draft_id` both null, orphaned probes) | — | — | 4 renders, 0 drafts, 0 publishes | — |

**Ruling: PROMOTE NDIS and CFW to `production_proven`.** Task boundary required client-specific proof
before any such label — both clients now have it, independently attributed (not shared with PP's 32, not
template-level aggregation): NDIS clears `real_draft_proven`+`publish_proven` with 14 drafts/12 publishes
across a 9-day span; CFW with 10 drafts/8 publishes across a 7-day span. Neither shows an elevated failure
pattern (CFW's 1 failure is at the publish stage, not render — a platform-side failure, not a template
reliability signal). PP's existing `production_proven` is untouched. **This is the strongest-evidenced
change in the packet.**

Template-level `status` (`smoke_rendered`) is left untouched — see §1.1's note that this column is not
currently bumped even for PP's much larger, older proof; touching it for the first time on this row alone
would be an inconsistent, out-of-scope precedent (not something PK's rulings asked for on row 5).

### 2.2 Row 7 — `2140ca19-d075-49d3-9dc9-30d924805e22` (generic_quote_card_1x1_v1)

| client | assignment_id | assignment_status (live) | own render/draft/publish | own proof_event |
|---|---|---|---|---|
| invegent | `ecba211b-5217-4790-afe5-a2f98616712f` | `visually_approved` | 11 renders / 11 drafts / 8 publishes (7 published, 1 failed) | passed, 2026-07-20 |
| property-pulse | `7e95190e-030d-4c01-9f2e-706a2932c991` | `visually_approved` | **0 / 0 / 0** | passed, 2026-07-03 |

**Ruling: PROMOTE invegent to `production_proven`; leave property-pulse unchanged.** Invegent's evidence
is unambiguous — 100% attributable, zero renders lost, sustained 2026-07-23→2026-07-29, `publish_proven`
on 3 platforms. Property-pulse has a passed visual-approval proof event but **zero** of its own
render/draft/publish activity on this specific `provider_template_id` — every one of the 11 renders
traces to invegent. Per the task's explicit rule (a template must not become `production_proven` for a
client from another client's proof), PP's assignment must stay at `visually_approved`. This directly
corrects the matrix's framing, which read "PP + Invegent both `visually_approved`... 11/11/8" as if the
proof applied jointly.

### 2.3 Row 17 — `fb9820f8-3fee-4448-b324-3d500fa74b40` (news_static_centered_scrim_1x1_v1)

Live values confirmed unchanged since the matrix pull (`updated_at` still `2026-07-03T12:29:23Z` on the
template row): `status='production_proven'`, PP `assignment_status='production_proven'`, both
`platform_suitability` rows (facebook, instagram) `='production_proven'`, `fit_status='strong_candidate'`.

**Selectability — CORRECTED:** row 17 is `scope='client'`, `t.client_id`=property-pulse. Confirmed live,
just before apply, that it appears in PP's `image_quote` `alternatives[]` for facebook and instagram
today (rank_reasons `fit_strong_candidate` + `registry_order_tiebreak`), and is correctly excluded for
NDIS/CFW/invegent (`wrong_scope`/`client_scoped_other_client`) — because the DEPLOYED `select_template`
function admits `client`-scoped templates for their owning client (an undocumented "v0.x (A2)" extension
with no matching migration file — §0.3). This is not the "already excluded, defense-in-depth only" state
the first draft of this document claimed.

**Provider existence — re-confirmed myself, two independent sources, both still agree:**
- `docs/creative-library/property-pulse.json:235-236` — `"provider_status": "retired_provider_deleted"`
  paired with `"provider_template_id": "fb9820f8-3fee-4448-b324-3d500fa74b40"`.
- `supabase/functions/image-worker/index.ts:931-932` — verbatim: *"The dead legacy template (fb9820f8…,
  deleted provider-side) and the hardcoded rotation are GONE (D5)."*

No live Creatomate API check exists in this environment (no tool has network access to the Creatomate
account); this is the strongest available corroboration — two independent artifacts (a data file and a
worker-code comment, written at different times for different purposes) agreeing the template is gone,
plus 24 days of zero render-log activity since 2026-07-05 despite the template still being nominally
`production_proven` and selectable-by-status.

**Additional staleness found beyond the matrix, on the same row:** `inventory_source` free text literally
says *"17 succeeded production render_specs"* — the actual count is **21 succeeded + 5 failed**. A second,
independent stale value on the same row (§3 corrects it, appending rather than rewriting — see the
forward SQL's comment on why).

**Ruling: RETIRE.** Template `status`, PP `assignment_status`, both platform-suitability rows, and the
`fit_status` all flip off `production_proven`/`strong_candidate` — four independent tables, because
retirement is provider-template-specific and must propagate everywhere that template is referenced
(§1.2 state 9's dimensionality). See §3.4 for the code-traced proof this changes zero live selector output
(row 17 is already excluded today, for an unrelated reason).

### 2.4 Row 19 — `c11bb8ab-18bd-45ff-aedd-0a59cb3773ab` (video_stat_reveal_9x16_v2)

| client | assignment_id | assignment_status (live) | own render/draft/publish | own proof_event |
|---|---|---|---|---|
| property-pulse | `1ee1a547-08b8-4ce8-8045-d545be16c699` | `visually_approved` | 3 succeeded + 5 timeout / 4 drafts / 3 publishes (all youtube, published) | passed (2× — 2026-07-19, 2026-07-20) |
| ndis-yarns | `aa2179eb-800e-4d0f-a323-925705942b73` | `visually_approved` | **0 / 0 / 0** | passed, 2026-07-20 |
| (unattributed) | — | — | 5 succeeded, 0 drafts, 0 publishes | — |

**Ruling: NO DEFAULT PROMOTION — thin-but-real evidence on PP, held as a PK-elective, not an automatic
correction; NDIS untouched.** Two things are true at once and both must stay visible: (1) PP does have
real, client-attributed evidence clearing `real_draft_proven` and `publish_proven` — 3 successful
end-to-end publishes, not zero; (2) counting only PP's own attributable attempts (3 succeeded, 5 timeout
= 8 total), PP's timeout rate is **62.5%**, materially worse than the 38% aggregate figure that both the
matrix and this packet's own headline (§0.2) cite, because 5 of the aggregate's 8 nominal "successes" have
no client attribution at all and cannot be counted as anyone's proof. `production_proven` is meant to
signal "trust this by default"; a coin-flip-adjacent reliability record on the only attributable evidence
undercuts that signal even though the evidence technically clears the lower proof-milestone bar. The
forward SQL packet (§3) includes this promotion as an explicit, commented-out PK-elective block — PK can
uncomment and apply it, or hold. NDIS's assignment has zero of its own evidence and is not offered as an
option at all. Per boundary, `fit_status` on this row is **not** touched by this packet regardless of
which way PK elects (that value was already moved today by the B-roll Parity Activation — §0.1).

### 2.5 Row 26 — `03bc6a3c-985a-4488-b008-67632372783c` (Stat Reveal 9×16 — Governed AV v2)

Live: `status='visually_approved'`, PP `assignment_status='visually_approved'`, `fit_status='candidate'`
(demoted from `strong_candidate` by the same B-roll Parity event — §0.1), passed `visual_approval`
proof_event (2026-07-26). **Zero** `m.post_render_log` rows match this `provider_template_id` — confirmed
again live today, no change since the matrix pull. Only one `c.creative_provider_template_field` row is
recorded (`Logo`) — the rest of the field contract is unverified from either DB or code.

**Ruling: remains `ready_for_proof` — no status change proposed.** It clears `candidate` and
`visually_approved`; it does not clear `render_proven` because no real render has ever been attempted.
It is provisionally "ready" only in the sense that it has the governance rows the fenced rows 20–25 lack —
full field-contract confirmation (every element the video-worker path reads, not just `Logo`) remains an
open pre-render check, same open item the matrix flagged. Not included in the repair SQL at all.

---

## 3. Registry-repair packet

Full SQL: [`docs/briefs/artifacts/creatomate-registry-repair-packet-v1-forward.sql`](../artifacts/creatomate-registry-repair-packet-v1-forward.sql)
· rollback: [`docs/briefs/artifacts/creatomate-registry-repair-packet-v1-rollback.sql`](../artifacts/creatomate-registry-repair-packet-v1-rollback.sql).
**Neither file has been executed.**

### 3.1 Proposed old→new (default packet — excludes the row 19 PK-elective)

| Row | Table | Target (id) | Column | Old | New |
|---|---|---|---|---|---|
| 17 | `creative_provider_template` | `fb9820f8…` | `status` | `production_proven` | `deprecated` |
| 17 | `creative_provider_template` | `fb9820f8…` | `inventory_source` | *(17-count text)* | *(same text, append retirement note + count correction)* |
| 17 | `creative_template_client_assignment` | `c0b10001…0004` (PP) | `assignment_status` | `production_proven` | `deprecated` |
| 17 | `creative_template_platform_suitability` | `9cb2a8bd…` (facebook) | `suitability_status` | `production_proven` | `blocked` |
| 17 | `creative_template_platform_suitability` | `9b69fd31…` (instagram) | `suitability_status` | `production_proven` | `blocked` |
| 17 | `creative_template_variant_candidate` | `c0b10001…0003` | `fit_status` | `strong_candidate` | `blocked` |
| 5 | `creative_template_client_assignment` | `c4737728…` (NDIS) | `assignment_status` | `visually_approved` | `production_proven` |
| 5 | `creative_template_client_assignment` | `60e43a0e…` (CFW) | `assignment_status` | `visually_approved` | `production_proven` |
| 7 | `creative_template_client_assignment` | `ecba211b…` (invegent) | `assignment_status` | `visually_approved` | `production_proven` |

**PK-elective, not in the default packet:** row 19 PP assignment `1ee1a547…` `visually_approved` →
`production_proven` (§2.4). Row 7 PP, row 19 NDIS, row 26: explicitly no change, by ruling.

### 3.2 Evidence

Every value above is cited with its live source query in §2 and in the forward SQL file's inline
comments. No value in this table was carried forward from the matrix doc without independent
re-verification (§0.2 documents the two places that independent re-check changed the picture).

### 3.3 Rollback

The rollback file restores every touched column to the **exact captured pre-image**, including the full,
untruncated original `inventory_source` string (captured verbatim before drafting the forward file, not
reconstructed from memory) — byte-identical revert, not an approximation.

### 3.4 Affected selector outcomes (CORRECTED — traced against the LIVE deployed function, `pg_get_functiondef`, not the repo migration file)

- **Row 17 — this DOES change a live output, and that is the intended fix.** The deployed
  `select_template` admits `scope='client'` templates for their owning client (§0.3's undocumented "A2"
  extension) — property-pulse owns row 17, so today it appears in PP's `image_quote` `alternatives[]`
  for facebook and instagram. After this repair (`status`/`assignment_status`/`suitability_status` all
  moved off their passing values, `fit_status`→`blocked`), row 17 is rejected at step (b)
  `status_below_smoke` (or step (d) `assignment_blocked` — whichever the loop reaches first; both now
  independently fail it) for EVERY client, including PP. **Confirmed pre-apply baseline (this session,
  immediately before applying):** `select_template('property-pulse','facebook','image_quote',NULL,NULL)`
  and the `instagram` call both list row 17 (`template_id c0b10001-0000-4000-8000-000000000002`) in
  `alternatives[]`. Post-apply, the same two calls must show row 17 in `rejected[]` instead, and it must
  be ABSENT from `alternatives[]`. The **winner is unaffected either way** — row 5 (`48cba556`) already
  wins both calls today (earlier `created_at` among `strong_candidate`s) and nothing in this packet
  changes row 5's `fit_status` or `created_at`. For NDIS/CFW/invegent, row 17 was already excluded
  (`wrong_scope`/`client_scoped_other_client` — correctly, since they don't own it) and remains excluded,
  now for an additional, independent reason too.
- **Rows 5, 7 promotions:** `select_template` step (d) checks `assignment_status IN
  ('visually_approved','client_enabled','production_proven')` — all three values already pass this
  check identically. Promoting `visually_approved`→`production_proven` does not change whether these
  candidates clear step (d) (they already did), and ranking (step 3) uses `fit_status` +
  `created_at`/`id`, never `assignment_status`. The only observable difference is the `assignment_status`
  string echoed back inside the `selected`/`alternatives` JSON payload — confirmed against the live
  function body, not just the stale migration file. No winner, ranking, or `rejected[]` content changes
  for these two rows.
- **No `variant_candidate.fit_status` value is touched for rows 5, 7, or 19.** Row 17's `fit_status` IS
  touched and DOES change row 17's own membership in `alternatives[]` (the point above) — it does not
  change the RANKING or WINNER for any other row. "Do not change selector ranking" is honored in the
  sense that matters (no template's relative rank among survivors is reordered, no new winner emerges) —
  it does not mean literally zero bytes of any response change, which the first draft of this section
  incorrectly claimed for row 17.

### 3.5 Safety / no-accidental-selectability proof

- **This section's individual claims (status/assignment/suitability enum exclusions) hold regardless of
  the §0.3/§3.4 scope correction** — they were verified against the enum `CHECK` constraints directly,
  not against the stale migration file, so they were not affected by the migration-vs-deployed
  discrepancy. What the correction changes is only the BASELINE this repair moves row 17 away from: not
  "already excluded, this is redundant," but "currently a live PP alternative, this repair removes it."
- Row 17 cannot be resurrected into selectability by this repair even if `scope`/ownership rules change
  again in the future (a real, live risk given §0.3's undocumented drift already changed this once
  without a tracked migration): `status='deprecated'` fails step (b) `status_below_smoke` (deprecated is
  not in the five-value passing set); `assignment_status='deprecated'` independently fails step (d)
  `assignment_blocked`; `suitability_status='blocked'` independently fails step (c) `platform_unsuitable`.
  Any one of these three alone is sufficient; all three now hold at once, deliberately redundant BECAUSE
  the deployed function has already proven itself capable of diverging from what the tracked migration
  history implies.
- No row this packet touches is moved to a MORE selectable state at any gate the RPC evaluates — every
  literal change either (a) moves row 17 further from selectable at four independent gates, or (b)
  changes an `assignment_status` value that was already passing the same gate before the change (§3.4).
- The forward SQL wraps all writes in one transaction with a fail-closed rowcount assertion for every
  UPDATE, each assertion living **inside the same `DO $$...$$` block as its UPDATE** (`GET DIAGNOSTICS`
  reads that block's own `ROW_COUNT`) — a 0-row or unexpected-count match RAISEs and rolls back the
  entire transaction.

### 3.5a CCF-04 static audit (apply-harness-auditor, shadow mode, advisory)

Run against the packet before this doc was finalized. Verdict: **INCOMPLETE** (fail-closed — this tool
never issues a fabricated PASS on a parse/logic defect). Four findings, all addressed in the file version
described above:

1. **(high, fixed)** The first-drafted SQL split each UPDATE and its `IF NOT FOUND` check into two
   separate top-level statements. `FOUND`/`ROW_COUNT` do not carry across separate top-level statements —
   a bare `DO $$ IF NOT FOUND ... $$` block right after an UPDATE always sees `FOUND=false` regardless of
   the UPDATE's actual result, so 7 of 8 assertions would have fired unconditionally on the very first run
   and the packet could never have committed. **Fixed:** every UPDATE now lives inside the same `DO`
   block as its `GET DIAGNOSTICS`-based assertion.
2. **(high, fixed)** No execution channel was named for the "single pooled call" atomicity claim.
   **Fixed:** the forward and rollback files now name the requirement explicitly (single `psql -f` run,
   or one un-split `execute_sql` call) and instruct falling back to `apply_migration` if that can't be
   guaranteed.
3. **(medium, addressed)** The "zero selector output change" claim (§3.4) was backed only by static
   code-tracing, with its live verification left as optional trailing comments. **Addressed, not fully
   automated:** the post-apply `select_template` diff is now labeled a **required** checklist step in the
   forward file, not an optional note — it remains a manual step (this session has no automated
   before/after-COMMIT diff harness), and PK should treat a mismatch there as a hard STOP, not a
   footnote.
4. **(medium, fixed)** The rollback file's UPDATEs were unconditional with no rowcount check.
   **Fixed:** each rollback UPDATE now carries the same `GET DIAGNOSTICS`-based assertion as the forward
   file (rowcount only — it does not verify the pre-rollback state equals the forward-applied value,
   which the auditor flagged as a residual, named risk if the DB has drifted since apply).

Per the tool's shadow-mode charter, this PASS/fix cycle **clears no gate** — `db-rls-auditor`,
external review, and the PK apply gate below are unchanged and still required.

### 3.6 Dashboard implications

Per memory (`static-image-governance-dashboard.md`), a Creative Library governance surface exists at
`/creative-library?client=...` in the separate `invegent-dashboard` repo. This packet does not read or
modify that repo's code, so the exact query it issues against these columns was **not independently
re-verified this session** — flagged, not assumed. If that dashboard reads `status`/`assignment_status`
directly (the most likely shape given the memory note), the practical implication is: row 17 currently
displays as `production_proven` (misleading — matches the DB staleness this packet corrects) and rows
5/7's newly-evidenced clients would newly display as `production_proven` (matching reality). **Recommend
a quick visual check of `/creative-library?client=ndis-yarns`, `?client=care-for-welfare-pty-ltd`, and
`?client=invegent` after apply**, alongside the SQL-level post-apply verification queries at the bottom
of the forward file.

---

## 4. Final graduation ladder (reusable checklist)

Each rung states what must be TRUE, which of the nine canonical states (§1.2) it corresponds to, and
where the evidence lives. A template does not skip a rung by having a later one — e.g. a real render
(rung 8) does not retroactively satisfy PK visual approval (rung 7) if no proof_event exists.

1. **Provider existence** — the `provider_template_id` is confirmed to exist on the Creatomate account.
   *No live API-read tool exists in this environment* — today this is confirmed by agreement between the
   vendored `docs/creative-library/*.json` `provider_status` field and independent worker-code
   corroboration (row 17 precedent, §2.3), not a direct API call. → maps to **candidate** existing at all;
   its *absence* is what defines **retired** (§1.2 state 9).
2. **Field-contract compatibility** — every element name the target worker code reads
   (`Background`/`Logo`/`Scrim`/format-specific text fields for static; `StatValue`/`StatLabel`/
   `ContextLine`/`CtaText`/`Logo`/`Background`/`VoiceAudio`/`MusicBed` for `video_short_stat`) has a
   matching `c.creative_provider_template_field` row. → part of **ready_for_proof**.
3. **Dimensions/duration/output parity** — the template's declared dimensions/duration/output_type match
   the target format's contract exactly (no silent scaling assumed). → part of **ready_for_proof**.
4. **Governed asset resolution** — `public.resolve_slot_assets` (or the format's equivalent) succeeds for
   at least one real client/seed combination for this template, without a fail-closed reason. → part of
   **ready_for_proof**; also gates §3's step (f) at selection time, permanently, for every future call.
5. **Audio support where applicable** — for any format with `VoiceAudio`/`MusicBed` slots, confirm the
   required-vs-optional behavior matches the format's contract (`VoiceAudio` required/fail-loud,
   `MusicBed` optional/silent-capable-by-design per house convention) — not assumed from the format
   family alone. → part of **ready_for_proof**.
6. **PK visual approval** — a `c.creative_template_proof_event` row, `proof_type='visual_approval'`,
   `proof_status='passed'`, with a concrete evidence reference, attached to the SPECIFIC client
   assignment being graduated. → **visually_approved** (§1.2 state 2). Note this packet's own ordering:
   this can be satisfied via a controlled/manual render, before rung 2–5 are fully verified through the
   real pipeline (row 26 is the live example — visually approved, not yet render-proven).
7. **Supervised render** — a REAL render through the actual worker path (not a manual probe) succeeds at
   least once, for the client being graduated. → **render_proven** (§1.2 state 4), and — because it is
   attributed via `client_id` — simultaneously begins the client-specific evidence trail rungs 8–9 need.
8. **Real-draft render** — that render was consumed into an actual `m.post_draft`, not a throwaway.
   → **real_draft_proven** (§1.2 state 5).
9. **Publish proof** — the draft was actually published (`m.post_publish.status='published'`), for the
   specific client and platform. → **publish_proven** (§1.2 state 6).
10. **Selector eligibility** — confirm `select_template` actually returns this template as `selected` (or
    a legitimate `alternatives[]` entry) for the client/platform/format in question, tracing the exact
    filter chain (§3.4's method) rather than assuming eligibility from status values alone — a row can
    have every status column "right" and still be excluded by an unrelated column (row 17's `scope`,
    §0.3), so this rung is a live RPC call, not a status read.
11. **Rollback proof** — a byte-exact reverse of every proposed write exists and is validated against the
    captured pre-image BEFORE the forward change is applied (this packet's §3.3/§3.5 pattern) — never
    written after the fact from memory.
12. **Production promotion** — `assignment_status` (and, per existing registry practice, optionally
    `status`) moves to `production_proven`, gated on client-attributable evidence only (§1.2 state 7's
    non-transferability rule) — never inherited from another client, never from template-level aggregate
    counts alone, and any reliability risk visible in that same evidence travels with the promotion
    rather than being smoothed over (row 19 precedent, §2.4).
13. **Post-promotion health monitoring** — after promotion, the render/timeout/publish-failure rate for
    that specific client×template combination continues to be watched, not just checked once at
    promotion time (row 19's 62.5% PP-attributable timeout rate is exactly the kind of fact a
    one-time-only check would have missed if promotion had been granted and never revisited).

**Carry (not fixed by this packet):** the schema's status enums have no literal `retired`/`ready_for_proof`/
`render_proven`/`real_draft_proven`/`publish_proven` values (§0.4, §1.1) — the canonical ladder above is a
judgment framework layered on the existing four enums plus the fact tables, not a schema change. If a
future DDL lane wants to make the ladder's intermediate rungs directly queryable (e.g. a dedicated
`proof_milestone` column or table), that is a distinct, separate proposal — out of scope here by the same
boundary that kept this packet data-only.

---

## 5. What this packet explicitly does NOT do

Per task boundaries: no template's `fit_status`/selector ranking is changed (rows 19/26/27's ranking
state, already moved by the same-day B-roll Parity Activation, is left exactly as found); no template is
activated (row 26 stays `ready_for_proof`, not promoted); no new worker format is wired (rows 21–24's
"needs new worker code" finding from the matrix is unchanged and untouched); no client-specific proof is
claimed from another client's evidence (rows 7-PP and 19-NDIS are explicitly left unchanged, by name, with
the zero-evidence fact stated); this is not combined with B-roll activation (§0.1's event is treated as
read-only context, nothing about it is proposed, approved, or reversed here); the uncommitted
`video-worker` files already in the working tree were not opened for content and nothing here depends on
or modifies them.

**Completion rule:** this document stops at the reviewed registry-repair apply gate. Next steps, in
order: `apply-harness-auditor` static review of the forward SQL (declared-STOP/atomicity/rollback-identity
checks — shadow-mode, advisory only) → `ask_chatgpt_review` on the final SQL+doc pair, hash-pinned →
PK apply gate. **No SQL in this packet is executed until PK explicitly authorizes it there.**
**(Superseded by §7 — PK authorized apply on 2026-07-29 and it was executed; see the status banner at
the top of this document.)**

## 7. Apply record (2026-07-29)

- **Row 19 decision:** PK — "leave row 19 as-is, no change." Recorded before apply; the PK-elective block
  in the forward SQL was left commented out, not executed.
- **Pre-apply safety check caught a real defect in this document, not in the SQL:** running the required
  pre-apply `select_template` baseline (§3.4/§6a) before executing anything surfaced that the deployed
  `select_template` function diverges from its only tracked migration file (§0.3) — falsifying the
  original "row 17 already excluded, zero output change" claim given to the external reviewer. PK was
  told directly, the document was corrected in place (§0.3, §2.3, §3.4, §3.5, §6a), and PK then
  authorized applying the corrected packet. The proposed SQL itself required no change — only the written
  justification did.
- **Execution:** hashes re-verified unchanged from the reviewed pin immediately before running (forward
  `979d84d0…4999c0`, rollback `815c16ef…9a7ebf6` — both matched). The forward file's 9 UPDATEs (excluding
  the row-19 PK-elective) were submitted as ONE `mcp__supabase__execute_sql` call, `BEGIN`→`COMMIT`,
  satisfying the file's own single-connection execution-channel requirement. Result: empty result set,
  no `RAISE EXCEPTION` — every fail-closed rowcount assertion passed on the first attempt.
- **Post-apply verification, all 9 target values (direct `SELECT`, immediately after commit):**
  `fb9820f8` template `status`→`deprecated`; PP assignment (`c0b10001…0004`)→`deprecated`; both platform
  suitability rows (facebook, instagram)→`blocked`; variant_candidate `fit_status`→`blocked`; NDIS
  (`c4737728…`) and CFW (`60e43a0e…`) row-5 assignments→`production_proven`; invegent (`ecba211b…`)
  row-7 assignment→`production_proven`. Explicitly re-confirmed UNCHANGED: row-19 PP (`1ee1a547…`) and
  NDIS (`aa2179eb…`) both still `visually_approved`; row-7 PP (`7e95190e…`) still `visually_approved`.
- **Post-apply `select_template` diff, all 5 client/platform calls re-run and compared to the pre-apply
  baseline captured earlier in this session:**
  - `property-pulse/facebook` and `property-pulse/instagram`: winner unchanged (`48cba556`, row 5).
    Row 17 (`c0b10001…0002`) moved from `alternatives[]` to `rejected[]`
    (`reason_code=status_below_smoke, detail=status=deprecated`) — the intended, corrected effect.
    `alternatives[]` count dropped from 11 to 10 (row 17's removal only); every remaining
    alternative/rejection entry identical to baseline.
  - `ndis-yarns/facebook`: winner unchanged (`48cba556`); only the echoed `assignment_status` in
    `selected` changed (`visually_approved`→`production_proven`). Row 17 was already, and remains,
    `rejected` (`wrong_scope`/`client_scoped_other_client`) — untouched by this packet, correctly.
  - `care-for-welfare-pty-ltd/facebook`: same pattern as NDIS — winner unchanged, only the echoed
    `assignment_status` changed.
  - `invegent/facebook`: winner unchanged (`2140ca19`, row 7); only the echoed `assignment_status`
    changed. Row 17 unaffected (`wrong_scope`), as expected.
  - **No unexpected diffs of any kind** — every change observed matches the corrected §3.4 prediction
    exactly, nothing else moved.
- **Rollback:** not executed; remains available at
  `docs/briefs/artifacts/creatomate-registry-repair-packet-v1-rollback.sql` if ever needed.
- **Follow-up not actioned in this apply (named, not solved):** the undocumented `select_template`
  "v0.x (A2)" client-scope-ownership extension (§0.3) has no matching migration file anywhere in the
  repo — a real schema-drift fact independent of this packet, worth a `register-reconciler` or
  `db-rls-auditor` pass in its own right.

## 6. External review (`ask_chatgpt_review`) — see §6a for a post-review correction

**§6a Post-review correction (before apply):** the `proposal` text sent to the reviewer below asserted
row 17 was "ALREADY excluded from every selector call today because its scope='client' fails the RPC's
first filter... zero change to select_template's live JSON output." A required pre-apply baseline check
(run after this review, before executing any SQL) falsified that: the LIVE deployed `select_template`
function differs from the repo's only migration file for it and admits row 17 for its owning client
(property-pulse) — see §0.3/§2.3/§3.4 for the full correction. **This does not reopen or invalidate the
review's escalation** — the reviewer's `requires_pk_escalation: true` and the routing to a PK decision
gate stand regardless of this detail, and PK reviewed and authorized apply with the corrected picture in
hand, not the original one. Recorded here rather than silently editing the review record itself, since
the review call cannot be un-sent.

- **review_id:** `e16aa3fa-35c4-46f9-9984-6ce733edcd02`
- **reviewed_input_hash (pin):** forward SQL `979d84d0a417bd2b6e769948607b3b83cf11aa38d9380e30032efc76154999c0`
  · rollback SQL `815c16eff5883c397f3b93fb8e433c010bbd5b3f131c69ff163826f449a7ebf6` · this doc
  `9d1f50b99701aa0232ef80040d57a590a0584cc51a7307fa6829b24ab9f83b81`. **Any future edit to any of the
  three files invalidates this review** — re-run before an apply gate if any hash changes.
- **Verdict:** `partial`, risk `medium`, confidence `high`, **`requires_pk_escalation: true`** (explicit
  escalate flag). Per the standing triage rule, a non-clean verdict is a stop, not something to
  interpret past — this is exactly the reviewed-gate stopping point named in the task.
- **Triage:** the reviewer's two live pushback items map to `runtime_verification_required` (row 17's
  "zero live selector output change" claim — already named as a required, not optional, post-apply diff
  step in the forward file, §3.5a item 3) and `policy_decision` (row 19's handling — see below).
- **Row 19, explicit alternative surfaced by review:** the reviewer's `verified_claims` flagged the
  62.5% attributable timeout rate as "warranting consideration for explicit downgrading rather than
  remaining a PK-elective." This packet's default position (§2.4) is to leave row 19 exactly as found
  and offer promotion only as an opt-in — the reviewer's suggestion was a **third option** (actively mark
  it down) this packet does not adopt by default. **PK decision (2026-07-29): leave row 19 exactly as-is,
  no change.** The commented-out PK-elective promotion block in the forward SQL is not to be uncommented;
  the reviewer's explicit-downgrade alternative is declined; row 19's `assignment_status` values for both
  property-pulse and ndis-yarns remain untouched by this packet, unconditionally.
- The reviewer's other two items (`unverified_claims`: client-perception impact, monitoring-system
  readiness) are **out of scope for this packet** — this is a registry-data correction with no client
  communication or dashboard-visible client-facing surface named anywhere in scope; noted for completeness
  but not actioned.
