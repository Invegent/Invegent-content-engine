# WS-3 (a) — Asset Gap backlog read view — T2 apply packet v1

**Created:** 2026-08-01 Sydney
**Author:** Claude Code (orchestrator)
**Executor:** PK (apply is a hard stop)
**Status:** `frozen — awaiting PK T2 apply gate`
**Tier:** **T2** (additive, dark, read-only DB object; no production authority)
**Lane class (CCF-02):** SAFETY_GATE
**Governing brief:** `docs/briefs/creatomate-global-ultimate-programme-brief-v1.md` §3 WS-3(a), §6 week-1 item 3
**Result file:** `docs/briefs/results/ws3-asset-gap-read-view-result-v1.md` (created on completion)

---

## Task

Create ONE secret-free `ice_ro` read view over `m.asset_gap_suggestion`, following the
cc-0090 pattern, so the Asset Gap backlog is readable through the zero-prompt operator
read path (`python scripts/db-read.py`) instead of only through gated `execute_sql`.
This is the read half of WS-3; it is independent of the live-writer/scheduler packet
(P-5A/P-5B) and can land without it.

## Source context

- `docs/briefs/creatomate-global-ultimate-programme-brief-v1.md` §3 WS-3(a) — "secret-free
  `ice_ro` read view over `m.asset_gap_suggestion` (cc-0090 pattern)".
- `supabase/migrations/20260719150000_ice_ro_r0_views_and_confined_role.sql` — G-RO v2:
  the `ice_readonly` confinement model and the R0 exposure rule this packet obeys.
- `supabase/migrations/20260731001557_cc_0090_asset_graduation_read_model_v1.sql` — the
  immediate precedent (4 additive views, per-view + schema-total grant assertions).
- `supabase/migrations/20260719160000_cc_0041_asset_gap_analysis_schema_v1.sql` — the
  base table's DDL, constraints and posture.
- Live state, read 2026-08-01 (project `mbkmaxqhsohbtwsqolns`):
  `m.asset_gap_suggestion` = 43 columns (37 from cc-0041 + 6 from cc-0046); 8 rows
  (4 `open`, 4 `resolved`), unchanged since 2026-07-20. `ice_ro` holds 14 views and
  `ice_readonly` holds exactly 14 SELECT grants.

## Artifacts (frozen — apply is valid ONLY against these hashes)

| File | sha256 |
|---|---|
| `docs/briefs/artifacts/ws3-asset-gap-backlog-view-v1.sql` | `8d5ca12d763f69f0d3f9d804fef40bc97a80d15322add52cd4fe20f62d2e8985` |
| `docs/briefs/artifacts/ws3-asset-gap-backlog-view-v1-rollback.sql` | `7d41520f2de6e3d3840311ef82635d3b34e22679b75c4fb9a4331c3a9121e014` |

Frozen 2026-08-01 (re-stamped after the review pass). A byte change to either file
invalidates every review below and voids the gate (STOP condition 1).

**Intended migration name:** `ws3_asset_gap_backlog_read_view_v1` — no collision in the live
ledger (full read 2026-08-01). Pinned here so name and hash freeze together.

**Re-stamp reason.** `db-rls-auditor` passed the artifact at its first hash
(`13a20f15…22e2`) with three low should-fix items and no must-fix. Two were applied — the
`security_invoker` detector now matches `true`/`on`/`yes`/`1` rather than the literal
`'true'` only, and a `has_table_privilege` belt was added alongside the grantee-name check
so a PUBLIC-inherited grant could not hide. The third (a wording correction to the
blast-radius claim) is applied in §2 below.

## Scope

**In scope:** one `CREATE VIEW ice_ro.asset_gap_backlog`; its `ice_readonly` SELECT grant;
the defensive `REVOKE` from `PUBLIC`/`anon`/`authenticated`; in-transaction fail-closed
assertions; a symmetric rollback.

**Out of scope (deliberately, each named):**
- A view over `m.asset_gap_observation`. The programme brief specifies a view over
  `m.asset_gap_suggestion`; adding a second is scope the gate did not admit. → OQ-2.
- A `demand_count` ⇄ `count(*) of m.asset_gap_observation` reconciliation column. cc-0041
  §D-c parked this as an analyzer-lane item; it stays parked. → OQ-2.
- Any change to `m.asset_gap_suggestion`, to `public.run_asset_gap_analysis`, to the
  `ice_readonly` role, or to any of the 14 existing `ice_ro` views.
- Anything in the live-writer/scheduler packet. Separate artifact, separate gate (P-5B).

## Allowed actions (at the gate, PK-run)

- Apply `ws3-asset-gap-backlog-view-v1.sql` as ONE migration call.
- Run the read-only post-apply verification in §7.

## Forbidden actions

- Applying this packet under the programme brief's ratification. The programme brief
  states plainly that **no apply, deploy, migration, or DML of any kind is authorised by
  programme-level approval**; this needs its own PK act.
- Bundling this apply with the WS-3(b) live-writer/scheduler apply. They are separate
  artifacts at separate tiers; P-5B is never folded into another approval.
- Granting anything to `anon`, `authenticated`, `PUBLIC`, or `inspector_ro`.
- Adding `USAGE` on schema `m` or `c` to `ice_readonly` (the load-bearing G-RO v2 control).
- Widening the exposed column set beyond §3 without a fresh gate.

---

## 1. Why this is T2 and not T3

Additive, read-only, and reversible by a single `DROP VIEW`. It creates no table, no
function, no DML path, no grant to any PostgREST-reachable role, and touches no existing
object. `ice_readonly` cannot reach schema `m` or `c` and holds zero write privileges —
both re-asserted in-transaction by the apply (assertion 6), so the confinement is
verified rather than assumed.

The one real risk in this shape is **over-exposure through the schema-wide catch-all
grant** (`GRANT SELECT ON ALL TABLES IN SCHEMA ice_ro`), which is evaluated at execution
time. Assertion 5 pins the post-apply total at exactly 15, so an unrelated relation
landing in `ice_ro` between authoring and apply aborts the migration rather than being
silently granted. This is the cc-0090 `db-rls-auditor` should-fix, carried forward.

## 2. Blast radius — live-verified, not assumed

`grep` for `asset_gap_suggestion`, `asset_gap_observation`, `run_asset_gap_analysis` over
this repository's two code roots — `app/` and `supabase/functions/` (there is no `src/` or
`lib/` here) — returns **zero functional hits** (2026-08-01); the single match is a prose
comment at `supabase/functions/image-worker/index.ts:45`. No worker or edge function reads
these tables. This view is therefore the **first** consumer of `m.asset_gap_suggestion`, not
an additional one, and it cannot regress any production path.

**Scope limit on that claim:** the dashboard lives in a separate repository
(`invegent-dashboard`) and was not searched. The claim is verified for this repo only.

## 3. Exposure decision — what is surfaced and what is withheld

The R0 rule (G-RO v2 header) admits SAFE + IDENTIFIER columns only: ids, enums,
timestamps, counts, booleans, bounded codes. All freeform/jsonb/URL columns and all
`*_by` actor labels are withheld to R1 (`execute_sql`).

**Surfaced (37 columns).** All of the above classes. Two judgement calls, both recorded:
- `appetite_signature` — live-sampled 2026-08-01: a bare 64-char sha256 hex digest with
  no embedded content. An identifier, so it is surfaced. It is also the aggregation key
  the register reconciliation needs.
- `why_needed`, `last_error_code`, `failure_state`, `subject_kind`, `evidence_confidence`
  — bounded analyzer-generated codes, not operator prose. Surfaced.
- `source_of_demand` — the analyzer's `p_run_id` passthrough, so it is **caller-supplied
  free text**, not a bounded code: live values mix generated `agr_<sha256>` ids with
  hand-authored run labels (`cpd-invegent-live-close-fixed-20260720`). Surfaced anyway —
  it is a run label with no confidentiality class, and it is the only way to attribute a
  backlog row to the run that produced it. Named here because it is the one surfaced
  column that is not strictly a bounded identifier.

**Withheld (6 columns), each with its reason:**

| Column | Type | Reason |
|---|---|---|
| `appetite_descriptor` | jsonb | freeform canonical appetite payload |
| `diagnostic_evidence` | jsonb | freeform cc-0046 classifier evidence |
| `dismissed_reason` | text | operator-written freeform |
| `claimed_by` | text | actor label — G-RO v2 withholds all `*_by` labels |
| `harvest_manifest_ref` | text | harvest-package path pointer |
| `candidates_ref` | text | fenced harvest-package path pointer |

No column of `m.asset_gap_suggestion` contains a secret or PII; the withholding rule here
is the R0 *shape* discipline, not a confidentiality finding.

## 4. Naming

`ice_ro.asset_gap_backlog`. "Backlog" rather than "status" because the row set is a
demand queue with a lifecycle, not a point-in-time status projection — and because the
programme brief's definition of done calls it "the backlog".

## 5. Rollback

`docs/briefs/artifacts/ws3-asset-gap-backlog-view-v1-rollback.sql`: one `DROP VIEW`, plus
a post-rollback assertion restoring the `ice_readonly` grant total to exactly 14 —
symmetric with the apply's total-15 assertion. Grants on a view are dropped with the view,
so no separate `REVOKE` is needed. Apply and rollback touch exactly the same one object.

## 6. Open questions (for PK — NOT resolved by this packet)

- **OQ-1 — `dismissed_reason` exposure.** Withheld per the R0 rule, but it is the one
  withheld column an operator draining the backlog would plausibly want ("why was this
  dismissed?"). Surfacing it means admitting one freeform column into R0. Withholding is
  the conservative default and the packet ships that way; PK may elect otherwise, which
  is a column-set change and therefore a fresh gate.
- **OQ-2 — second view / demand-count reconciliation.** Both deliberately excluded (§Scope).
  If the DB-generated register (§WS-3(c)) later needs per-observation evidence, that is a
  follow-on T2 lane, not an amendment to this one.
- **OQ-3 — `ice_ro.format_mix_capability_gaps`.** The programme brief §3 WS-2 names this
  as a separate follow-on diagnostic view. It is NOT in this packet and remains unbuilt.

## 7. Post-apply verification (read-only)

```bash
python scripts/db-read.py "SELECT status, count(*) FROM ice_ro.asset_gap_backlog GROUP BY status ORDER BY 1"
```

Expected at apply time (live baseline 2026-08-01): `open` = 4, `resolved` = 4.

```bash
python scripts/db-read.py "SELECT client_slug, platform, format, slot_kind, subject_kind, failure_state, primary_route, asset_gap_drainability, demand_count FROM ice_ro.asset_gap_backlog WHERE status='open' ORDER BY client_slug, platform"
```

Expected: the four open rows recorded in
`docs/briefs/results/ws3-asset-gap-register-reconciliation-result-v1.md` §2.

Both commands must succeed **through `db-read.py`** (i.e. as `ice_readonly`, zero prompt).
If either returns a permission error, the grant did not take and the apply is a MISMATCH.

## 8. STOP conditions (Convention 2 — non-removable)

A tripped STOP voids the remainder of the sequence; resumption requires a fresh PK gate.

1. Artifact sha256 ≠ the hash pinned in the external review's `reviewed_input_hash`.
2. Any in-transaction assertion raises (all six are executable `RAISE`s, not comments).
3. `ice_ro` holds anything other than 14 relations immediately before apply.
4. `branch-warden` returns anything other than `safe`.
5. `db-rls-auditor` returns anything other than normalized `clean`.
6. Any non-clean external review verdict.
7. §7 verification fails after apply.

## 9. Review record — chain COMPLETE, verdict NOT clean

| Stage | Verdict | Pinned to |
|---|---|---|
| `db-rls-auditor` round 1 | `pass` / clean, 0 must-fix, 3 low should-fix | hash `13a20f15…22e2` |
| *(2 should-fix applied → re-freeze)* | | |
| `db-rls-auditor` round 2 | **`pass`** — both amendments confirmed correct; the view's SELECT body was compiled live and returned all 8 rows with no join loss | hash `8d5ca12d…8985` (current) |
| `branch-warden` | **`stop`** — not about this artifact; see the lane result doc §4 | — |
| `ask_chatgpt_review` | **`partial`** / medium risk / high confidence / **escalate to PK** — review_id `82ca26aa-fdf6-4bf0-9b36-7b94595f9352` | hash `8d5ca12d…8985` (current) |

**Triage of the external review (CCF-02 classes):** both pushback points are
`policy_decision` / `scope_design_concern`. Neither is a `concrete_defect`, and the reviewer
raised no unverified-evidence claim about the SQL itself. Per the standing routing rule,
`policy_decision` → **PK decision gate**; PK decides, it is not a defect to "fix".

**PK-D1 — INNER vs LEFT JOIN to `c.client`.** The reviewer suggests LEFT to survive a deleted
client row. Counter-evidence, live: `client_id` is `NOT NULL` and carries an FK to
`c.client(client_id)` with **NO ACTION on delete** — deliberately chosen at cc-0041 so demand
evidence is never silently orphaned; a client row therefore *cannot* be deleted while a
suggestion references it. Zero orphans exist. Recommendation: **keep INNER** — LEFT would
add a `client_slug IS NULL` state that the FK makes unreachable. PK's call.

**PK-D2 — the hardcoded schema-wide grant total of 15.** The reviewer flags brittleness as the
schema grows. That brittleness is the *point*: `GRANT ... ON ALL TABLES IN SCHEMA ice_ro` is
evaluated at execution time, so without the pin an unrelated relation landing in `ice_ro`
between authoring and apply would be silently granted to `ice_readonly`. The pin converts
that into an abort. It is also the precedent — cc-0090 pinned 14 and was applied on that
basis. Cost is a one-line edit per future `ice_ro` migration. Recommendation: **keep**. PK's call.

**Lane state:** the chain is complete and the verdict is not clean, so the lane **halts here
and surfaces to PK** rather than proceeding to the apply gate. A PK ruling on D1 and D2
either clears it as-is or produces a re-cut (new hash → fresh review).

## Success criteria

- `ice_ro.asset_gap_backlog` exists, non-`security_invoker`, with exactly one
  `ice_readonly` SELECT grant and zero `PUBLIC`/`anon`/`authenticated` grants.
- `ice_readonly` schema-wide SELECT total = 15; no `USAGE` on `m`/`c`; zero write privileges.
- Both §7 reads succeed through `db-read.py` and return the expected baseline.
- Rollback validated before apply (§5) and demonstrably symmetric.

## Stop condition

Report per the result template, then stop. **Apply is a PK hard stop; the authoring lane
does not apply this packet.**
