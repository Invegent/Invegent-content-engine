# Template Selection v0 — Lane A Packet — PP Assignment Proposal + format_key Backfill

**Created:** 2026-07-03 Sydney
**Design authority:** `docs/briefs/template-selection-v0-design-packet.md` (PK Gate 1 approved 2026-07-03: ladder mandatory · visual proof hard gate · assignment model approved · format_key direction approved · suitability permissive-with-warning · content_type ranker · B1 gap = carry · RPC approved-but-not-built)
**Status:** ✅ **APPLIED + VERIFIED 2026-07-03** (PK approval pinned to hash `ff340f2b…`; see §8)
**Mutation proposed:** data-only DML, 2 statements, 32 rows total. **No DDL · no function · no runtime caller · no render · no publish · no dashboard · no selectability · no visual-approval claim · no production/Format Mix claim.**

---

## 1. Exact data mutation

**Artifact:** `_harness/lane-a-pp-assignment-proposal-formatkey-backfill.sql`
**sha256 (reviewed_input_hash):** `ff340f2b9f5af09a224f9b0ea25ac295898b75d52b7bae280e96bf0f8e26ca97`
One `DO $$` block (single transaction), each statement followed by an exact row-count assertion (raise + full abort on mismatch):

- **A — format_key backfill (UPDATE, 16 rows):** `c.creative_template_variant_candidate.format_key` NULL → PK-approved values (design packet §5): 11 rows → `image_quote` (market_update.v1 ×4, announcement, quote_card, stat_card, educational, comparison, testimonial, news_summary), 3 → `carousel`, 1 → `youtube_thumbnail`, 1 → `story_image`. Guarded `format_key IS NULL` (pre-state verified: NULL on all 16).
- **B — PP proposed assignments (INSERT, 16 rows):** one `assignment_status='proposed'`, `assignment_scope='generic_allowed'` row per generic `smoke_rendered` template for client `4036a6b5…` (property-pulse). `NOT EXISTS`-guarded — **mandatory, the table has no unique constraint on (template_id, client_id)** (verified via pg_constraint). `approved_by/at` NULL (L2 of the ladder — your batch approval is a separate later act).
- Both scope/status values verified against the live CHECK constraints (`generic_allowed` ∈ scope enum; `proposed` ∈ status enum, which also encodes the ladder: proposed→approved→visually_approved→client_enabled→production_proven).
- Accidental re-run = clean abort (step A matches 0 rows post-apply → assertion raises before B).

## 2. Eligibility evidence (L1, computed live 2026-07-03)

All 16 generic templates returned **`resolve_slot_assets('property-pulse','facebook','image_quote', id) → status='ok'`** — zero fail-closed, warnings limited to `platform_scope_unbacked` (all 16, known backfill carry) + `optional_slot_unfilled:FaceObject` (thumbnail only). Platform-suitability rows exist for every template (55 rows / 5 platforms, all `candidate` = permissive-with-warning doctrine). Proposal set = the full L1-passing set of 16.

## 3. Before / after row counts (before verified live 2026-07-03)

| Table | Before | After (expected) |
|---|---|---|
| `creative_template_variant_candidate` — `format_key IS NULL` | **16** (all) | **0** (11 image_quote / 3 carousel / 1 youtube_thumbnail / 1 story_image) |
| `creative_template_client_assignment` — total | **0** | **16** (all PP · `proposed` · `generic_allowed` · `approved_by` NULL) |
| `creative_template_proof_event` — `assignment_id IS NOT NULL` | **0** | **0** (unchanged — no visual proof claimed) |
| Selectable set (ladder L5) | **0** | **0** (unchanged by design — proposed ≠ approved ≠ proven) |

## 4. Reversibility plan

Commented in the artifact; both steps independently reversible, zero collateral:
- **B:** `DELETE … WHERE client_id=PP AND assignment_status='proposed' AND approved_by IS NULL` (expect 16; pre-state = 0 rows total, so the guard over-protects future PK-approved rows).
- **A:** `UPDATE … SET format_key=NULL WHERE format_key IN (the 4 values)` (expect 16; pre-state = all NULL, verified).
Readers (corrected per db-rls-auditor): **no production render/publish/selection path** reads either table (`resolve_slot_assets`/`resolve_brand_assets` reference neither; zero views/triggers; nothing reads `format_key`; the selector RPC is not built — PK Gate 1 decision 8). Three **display/validation** RPCs do read them: `get_tmr_template_list` + `get_tmr_template_detail` (TMR dashboard will show 16 `proposed` assignments post-apply; lifecycle rollup unchanged — approval requires status ≥ `approved`, which stays false) and `record_tmr_proof_event` (the new rows become valid targets for FUTURE operator-recorded proof events — the intended ladder behaviour, not a selectability path).

## 5. Verification queries (post-apply, read-only)

1. `SELECT format_key, count(*) FROM c.creative_template_variant_candidate GROUP BY 1` → `image_quote 11 / carousel 3 / youtube_thumbnail 1 / story_image 1 / NULL 0`.
2. `SELECT assignment_status, assignment_scope, count(*) FROM c.creative_template_client_assignment GROUP BY 1,2` → exactly `proposed / generic_allowed / 16`; `approved_by IS NULL` on all; all `client_id` = PP.
3. `SELECT count(*) FROM c.creative_template_proof_event WHERE assignment_id IS NOT NULL` → **0** (no visual-approval claim).
4. Re-run the §2 eligibility probe → unchanged `ok`×16 (mutation touches nothing the resolver reads).
5. Idempotency probe (optional): re-running the DO block must RAISE (0-row assertion) with no data change.

## 6. Review chain

| Review | Status |
|---|---|
| db-rls-auditor | **run this lane — verdict appended §6a** |
| security-auditor | **n/a with reason:** data-only DML; no SECURITY DEFINER / grant / storage / runtime surface touched |
| external review | **run on the exact artifact hash — verdict appended §6b** |
| PK apply gate | **HARD STOP — pending** |

### 6a. db-rls-auditor (2026-07-03, read-only) — verdict `concerns`, SQL clean, one packet-wording fix (applied above)

All 8 checks **PASS** against live data: VALUES map covers exactly the 13 live variant_keys, simulated UPDATE matches **16**, simulated INSERT-SELECT yields **16** (client uuid live-resolves to `property-pulse`); `generic_allowed`/`proposed` valid per live CHECK constraints (`format_key` = plain nullable text, no CHECK/FK); pre-state confirmed (16 NULL / 0 assignments / 0 assignment-proofs); no unique constraint on (template_id, client_id) → NOT EXISTS guard correctly mandatory; no triggers, no views; explicit `updated_at` correct, INSERT defaults (`now()`, `gen_random_uuid()`) verified; RLS-enabled-0-policies service-fenced posture pre-existing (apply runnable by postgres or service_role); single-transaction DO block → no partial state; re-run = clean abort; rollback statements match exactly 16+16 point-in-time with the B guard protecting future approved rows; **ladder integrity confirmed — nothing becomes selectable** (`has_assignment_appr` in the dashboard RPC requires status ≥ approved → stays false). Observations recorded: `client_id` has no FK to `c.client` (uuid live-verified instead); advisors show only the pre-existing RLS-INFO class, nothing new. Sole must-fix was the §4 reader-accuracy wording — corrected in place; **artifact hash `ff340f2b…` unchanged and valid**.

### 6b. external review (2026-07-03) — verdict `agree` / decision `proceed`

`review_id 2d226717-1696-49a5-ab26-125cc62cccdd` · `reviewed_input_hash ff340f2b9f5af09a224f9b0ea25ac295898b75d52b7bae280e96bf0f8e26ca97` (== artifact) · risk **low** · confidence **high** · **zero pushback points, zero unverified claims, no escalation**. Verified: pre-apply-only review, 16+16 row targeting, auditor-clean SQL, and the critical property that nothing becomes selectable.

## 7. Apply / no-apply recommendation

**APPLY.** Grounds: PK-ratified design authority (Gate 1); live-verified pre-state and simulated row-matches (exactly 16 + 16); CHECK-constraint compliance; single-transaction atomicity with fail-loud assertions; clean re-run behaviour; point-in-time-exact rollback with zero collateral; no production reader; ladder integrity preserved (selectable set stays empty — `proposed` ≠ approved ≠ proven); auditor concerns resolved as packet wording only (artifact untouched); external review agree/low/high with no pushback. Apply as **postgres or service_role** (the only granted principals), re-verifying `sha256 == ff340f2b…` immediately before execution. Post-apply: run §5 verification queries → append results → register update — each on PK instruction.

## 8. Apply result (2026-07-03 — PK approved, hash re-verified `MATCH` immediately pre-apply)

Applied via `execute_sql` (postgres) as the exact artifact DO block; both 16-row assertions passed (no exception). **Post-apply verification — 9/9 PASS:**

| Check | Result |
|---|---|
| `format_key` NULL count | **0** ✅ |
| Format distribution | `image_quote 11 / carousel 3 / youtube_thumbnail 1 / story_image 1` ✅ |
| PP assignments | **16** ✅ |
| Non-`proposed` assignments | **0** ✅ |
| `approved_by`/`approved_at` set | **0** ✅ |
| Non-`generic_allowed` scope | **0** ✅ |
| Assignment-scoped proof events | **0** ✅ (no visual-approval claim) |
| **Selectable set (ladder L5)** | **0** ✅ (approved∧visually-proven = empty) |
| Resolver/runtime behaviour | unchanged — `resolve_slot_assets` PP happy path still `ok` / `bg_perth_cbd` ✅ |
| Idempotent re-run probe | **clean abort** — raised `updated 0 rows, expected exactly 16` at step A, transaction rolled back, zero effect ✅ |

**Recorded carry (PK-directed):** `c.creative_template_client_assignment.client_id` has **no FK to `c.client`** — a typo'd uuid would insert silently (this apply's uuid was live-verified). Candidate schema-hardening FK for a future PK-gated migration lane.

**Boundaries held:** no visual approval · no render · no publish · no selector build · no runtime caller · no dashboard change (display RPCs naturally show the 16 proposed rows — display/validation only) · no production / Format Mix claim.
