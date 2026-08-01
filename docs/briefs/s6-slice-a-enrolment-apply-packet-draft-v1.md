# APPLY PACKET — S6 Slice A NDIS Yarns format-mix enrolment (v1, FROZEN)

> **PK decisions recorded 2026-08-01:**
> - **P-4/OQ4:** resolved as ground truth — `origin/main` `29788bd` (v6.107,
>   `docs/briefs/results/p4-oq4-disposition-decided-v1.md`) records PK's Option A
>   (supersede) ruling. Not inferred; read directly from the commit.
> - **Proof brand:** **NDIS Yarns** — PK-confirmed this session ("keep it ndis").
> - **§8 row-spec blocker:** PK-resolved this session — **Option (a)**: the packet's
>   §6 proof claim is narrowed to the 4 classifier-`ready` candidates
>   (`facebook/image_quote`, `instagram/image_quote`, `linkedin/image_quote`,
>   `youtube/video_short_stat`). **Named residual (not eliminated, per PK's own chosen
>   option's stated limitation):** the enrolment row itself is client-scoped, not
>   format-scoped — the guard still allows `facebook/text` and `linkedin/text` to
>   allocate if any schedule row's `format_override` is ever cleared on those slots,
>   even though `classify_format_capability` reads them as `unsupported_silent_degrade`
>   today. This packet's proof does not claim those two cells are safe; it only proves
>   the 4 classifier-`ready` cells. See §6.3.
>
> **Lane:** slice-a-resumption-enrolment-proof (WS-1, Programme Brief v1 rev-2, week-2 lane 6)
> **Tier:** T3 (production DML — changes live slot materialisation for a client)
> **Class:** PRODUCT_PROOF (Milestone-2 §1.1 zero-code enrolment proof; Gate-1 confirms)
> **Apply authority:** separate PK T3 gate, never this document. This freeze only pins
> the packet for the review chain (db-rls-auditor already run; external review +
> apply-harness-auditor shadow next); it does not authorise apply.

---

## 0. Gate-1 refresh evidence (completed 2026-08-01, this session)

| Check | Result | Source read |
|---|---|---|
| S7 guard live in `m.build_weekly_demand_grid` | **CONFIRMED** — `capability_gated` CTE present between `enabled_set` and `policy_backed`; `COALESCE((cf.platform_support->>platform)::boolean, false)` fail-closed; exemption exactly `{text}`; `select_template` status `<> 'fail_closed'` for all non-text | Live `pg_catalog` read via `db-read.py` (`pg_proc`/`pg_get_functiondef`), NOT the doc |
| Live full-definition md5 | `9e51956f0f0fc27184962037c29f9615` — **matches** applied-result doc claim byte-for-byte | Same live read; doc `docs/briefs/results/s7-demand-grid-capability-guard-applied-v1.md:10` |
| Dry-run §4.6 animated-format risk (NDIS `animated_data`/`animated_text_reveal` enabled with `platform_support=false`) | **STRUCTURALLY CLOSED** — the guard excludes them at code level even if a future mix-default row appears (FB/IG/LI explicitly `false`; YT key absent → fail-closed) | Live guard body |
| Dry-run STOP reason 1 (7/11 `unsupported_silent_degrade` candidates) | **PARTIALLY resolved.** Grid-level: guard now emits only 6 candidates (down from 11), all `platform_support=true`. Classifier-level: **NOT resolved** — live `classify_format_capability` still reports `unsupported_silent_degrade` for `facebook/text` + `linkedin/text` (2 of 6 emitted). See blocking note above. | `db-rls-auditor` live read, 2026-08-01 (this session) |
| Dry-run STOP reason 2 (OQ4) | **RESOLVED — PK ruled Option A** (`origin/main` `29788bd`, v6.107, 2026-08-01) | Git ground truth, this session |
| Worktree state | HEAD `5737553`, branch `claude/reverent-wu-d7e674`, clean, isolated worktree — but **behind origin/main by 2 commits** (`29788bd`, `5dc8470`) as of this session's `branch-warden` check | `branch-warden` live read, 2026-08-01 |

## 1. The change (data-only DML — zero CE code)

One governed enrolment row for **NDIS Yarns** (`client_id fb98a472-ae4d-432d-8738-2273231c1ef4`)
into `c.client_control_tower_enrollment`, plus one append-only provenance row into
`c.client_format_mix_audit` (house precedent: P1 seed migration
`20260628120000_control_tower_p1_enrollment_format_mix.sql:197`). No DDL, no grants, no
function change, no config/schedule/template change, no preferred-format config
(F-AIW-PREF-COL-HARDCODE respected — nothing here touches `preferred_format_*`).

Row spec (identical to dry-run §4.1, verified against live table shape this session —
21 columns, constraints `cte_*`, partial unique `cte_one_current_active_uq` on
`(client_id, platform, control_type) NULLS NOT DISTINCT WHERE is_current AND status='active'`):

| column | value |
|---|---|
| `enrollment_id` | `7b93af4e-224e-4709-be4b-8bb58ae42249` **(FROZEN)** |
| `client_id` | `fb98a472-ae4d-432d-8738-2273231c1ef4` |
| `platform` | `NULL` (client-scoped; matches PP seed precedent) |
| `control_type` | `'format_mix'` |
| `enabled` | `true` |
| `rollout_stage` | `'enforce'` · `approval_status` `'approved'` · `status` `'active'` (jointly required by `cte_enabled_only_when_enforced_chk`) |
| `effective_from` | `2026-08-01` **(FROZEN)** |
| `effective_until` | `NULL` · `version` `1` · `is_current` `true` |
| `changed_by` | `'packet:s6-slice-a-ndis-format-mix-enrolment-v1'` **(FROZEN)** · `approved_by` `'PK'` (valid only after the PK T3 apply authorisation names this packet's hash) |
| `reason`/`notes` | `'Governed Slice-A enrolment, Milestone-2 zero-code capability-enrolment proof (NDIS Yarns), per PK P-4 Option A ruling (v6.107) and packet docs/briefs/s6-slice-a-enrolment-apply-packet-draft-v1.md'` |

Audit row: `action='enroll_format_mix_slice_a'`, `before_data=NULL`,
`after_data=to_jsonb(inserted row)`, `actor=` packet identity, `approval_status='approved'`,
`request_source='slice_a_apply_packet_v1'`, `version_to=1`.

## 2. Apply channel + executable harness

**Channel (named, single-call, atomic):** one `apply_migration` call, migration name
`s6_slice_a_ndis_format_mix_enrolment_v1` (permanent identity; a revision gets a NEW name).
The entire apply is one PL/pgSQL `DO $$ … $$` block — one statement, one server-side call,
composes correctly across a pooled connection (no multi-call transaction assumption). Every
STOP below is an executable `RAISE EXCEPTION`, never a comment (cc-0079 Slice-2 failure class).

### Assertion / control register

| Assertion | Enforcement (where in SQL) | Expected / check |
|---|---|---|
| C-1 | apply DO block, baseline | NDIS `format_mix` row count = 0 pre-insert |
| C-2 | apply DO block, baseline | `client_slug` = `'ndis-yarns'` for the target `client_id` |
| C-3 | apply DO block, baseline | live guard md5 = `9e51956f0f0fc27184962037c29f9615` (drift → abort) |
| C-4 | apply DO block, pre + post | active `format_mix` count = 1 pre-insert; PP row byte-identical (`to_jsonb` compare) post-insert |
| C-5 | apply DO block, final | `m.format_mix_enrolled(ndis)` = `true` after insert |
| C-6 | apply DO block | enrolment `INSERT` affects exactly 1 row (`NOT FOUND` → abort) |
| C-7 | apply DO block | audit `INSERT` affects exactly 1 row (`NOT FOUND` → abort) |
| R-1 | rollback DO block | rollback `DELETE` affects exactly 1 row (`ROW_COUNT` via `GET DIAGNOSTICS`) |
| R-2 | rollback DO block | NDIS `format_mix` row count = 0 post-rollback |
| R-3 | rollback DO block | `m.format_mix_enrolled(ndis)` = `false` after rollback |
| R-4 | rollback DO block | rollback audit `INSERT` affects exactly 1 row |

### Executable apply SQL (frozen; runs inside `apply_migration`)

```sql
DO $$
DECLARE
  v_pre_ndis_count  int;
  v_client_slug     text;
  v_guard_md5       text;
  v_pre_active_count int;
  v_pp_pre_image    jsonb;
  v_pp_post_image   jsonb;
  v_gate_after      boolean;
BEGIN
  -- C-1: NDIS format_mix baseline must be zero rows before insert
  SELECT count(*) INTO v_pre_ndis_count
    FROM c.client_control_tower_enrollment
   WHERE client_id = 'fb98a472-ae4d-432d-8738-2273231c1ef4'
     AND control_type = 'format_mix';
  IF v_pre_ndis_count <> 0 THEN
    RAISE EXCEPTION 'C-1: NDIS format_mix baseline non-zero (found %), aborting', v_pre_ndis_count;
  END IF;

  -- C-2: client identity must resolve to ndis-yarns
  SELECT client_slug INTO v_client_slug
    FROM c.client WHERE client_id = 'fb98a472-ae4d-432d-8738-2273231c1ef4';
  IF v_client_slug IS DISTINCT FROM 'ndis-yarns' THEN
    RAISE EXCEPTION 'C-2: client_slug mismatch (found %), aborting', v_client_slug;
  END IF;

  -- C-3: guard-regression check — live definition must match the frozen md5
  SELECT md5(pg_get_functiondef(p.oid)) INTO v_guard_md5
    FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
   WHERE n.nspname = 'm' AND p.proname = 'build_weekly_demand_grid';
  IF v_guard_md5 IS DISTINCT FROM '9e51956f0f0fc27184962037c29f9615' THEN
    RAISE EXCEPTION 'C-3: guard drift detected (found %), aborting', v_guard_md5;
  END IF;

  -- C-4a: pool-neutrality baseline — exactly 1 active+current format_mix row (PP) pre-insert
  SELECT count(*) INTO v_pre_active_count
    FROM c.client_control_tower_enrollment
   WHERE control_type = 'format_mix' AND is_current = true AND status = 'active';
  IF v_pre_active_count <> 1 THEN
    RAISE EXCEPTION 'C-4: pre-apply active format_mix count expected 1, found %, aborting', v_pre_active_count;
  END IF;

  -- C-4b: PP pre-image byte-capture for the post-apply comparison
  SELECT to_jsonb(e) INTO v_pp_pre_image
    FROM c.client_control_tower_enrollment e
   WHERE e.client_id = '4036a6b5-b4a3-406e-998d-c2fe14a8bbdd'
     AND e.control_type = 'format_mix' AND e.is_current = true;
  IF v_pp_pre_image IS NULL THEN
    RAISE EXCEPTION 'C-4: PP pre-image not found, aborting';
  END IF;

  -- C-6: insert the NDIS enrolment row (explicit frozen enrollment_id)
  INSERT INTO c.client_control_tower_enrollment (
    enrollment_id, client_id, platform, control_type, enabled,
    rollout_stage, approval_status, status,
    effective_from, effective_until, version,
    changed_by, approved_by, reason, notes, is_current
  ) VALUES (
    '7b93af4e-224e-4709-be4b-8bb58ae42249'::uuid,
    'fb98a472-ae4d-432d-8738-2273231c1ef4'::uuid,
    NULL, 'format_mix', true,
    'enforce', 'approved', 'active',
    '2026-08-01'::date, NULL, 1,
    'packet:s6-slice-a-ndis-format-mix-enrolment-v1', 'PK',
    'Governed Slice-A enrolment, Milestone-2 zero-code capability-enrolment proof (NDIS Yarns), per PK P-4 Option A ruling (v6.107) and packet docs/briefs/s6-slice-a-enrolment-apply-packet-draft-v1.md',
    'Governed Slice-A enrolment, Milestone-2 zero-code capability-enrolment proof (NDIS Yarns), per PK P-4 Option A ruling (v6.107) and packet docs/briefs/s6-slice-a-enrolment-apply-packet-draft-v1.md',
    true
  );
  IF NOT FOUND THEN
    RAISE EXCEPTION 'C-6: enrolment INSERT reported no row, aborting';
  END IF;

  -- C-7: append-only audit row
  INSERT INTO c.client_format_mix_audit (
    client_id, platform, control_type, action,
    before_data, after_data, actor, approval_status,
    reason, request_source, version_from, version_to
  )
  SELECT e.client_id, e.platform, e.control_type, 'enroll_format_mix_slice_a',
         NULL::jsonb, to_jsonb(e), 'packet:s6-slice-a-ndis-format-mix-enrolment-v1',
         'approved', 'Governed Slice-A enrolment, this packet', 'slice_a_apply_packet_v1', NULL, 1
    FROM c.client_control_tower_enrollment e
   WHERE e.enrollment_id = '7b93af4e-224e-4709-be4b-8bb58ae42249'::uuid;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'C-7: audit INSERT reported no row, aborting';
  END IF;

  -- C-4c: post-apply pool-neutrality — PP row byte-unchanged
  SELECT to_jsonb(e) INTO v_pp_post_image
    FROM c.client_control_tower_enrollment e
   WHERE e.client_id = '4036a6b5-b4a3-406e-998d-c2fe14a8bbdd'
     AND e.control_type = 'format_mix' AND e.is_current = true;
  IF v_pp_post_image IS DISTINCT FROM v_pp_pre_image THEN
    RAISE EXCEPTION 'C-4: PP row mutated by this apply, aborting';
  END IF;

  -- C-5: gate flip — m.format_mix_enrolled(ndis) must now read true
  SELECT m.format_mix_enrolled('fb98a472-ae4d-432d-8738-2273231c1ef4') INTO v_gate_after;
  IF v_gate_after IS DISTINCT FROM true THEN
    RAISE EXCEPTION 'C-5: gate flip failed, format_mix_enrolled=% after apply, aborting', v_gate_after;
  END IF;
END $$;
```

**Apply identity set — rows this block WRITES (the set the rollback must exactly reverse):**
`enrollment_id=7b93af4e-224e-4709-be4b-8bb58ae42249` ·
`client_id=fb98a472-ae4d-432d-8738-2273231c1ef4` (target). *(The block also READS, but never
writes, the Property Pulse row for the C-4 non-regression compare — that identity is
deliberately excluded from this written-set list since the rollback correctly does not touch
it either; see §4 point 3 for that UUID.)*

## 3. Rollback (written now, validated before freeze)

`s6_slice_a_ndis_format_mix_enrolment_v1_rollback`: single `DO $$ … $$` block, same
single-call channel as the apply. **Declared exemption to byte-exact identity:**
`c.client_format_mix_audit` is append-only provenance by design — rollback restores the
*enrolment* table exactly and adds its own audit trail rather than deleting the apply's
audit row; this is named here explicitly so apply-harness-auditor check 7 (apply/rollback
identity) judges the declared contract, not an implied one. Rehearsal: live
`BEGIN…ROLLBACK` of apply-then-rollback before freeze (S7 §9 precedent), zero persistence.

```sql
DO $$
DECLARE
  v_rows_deleted    int;
  v_post_ndis_count int;
  v_gate_after      boolean;
BEGIN
  -- R-1: delete the exact frozen enrolment row
  DELETE FROM c.client_control_tower_enrollment
   WHERE enrollment_id = '7b93af4e-224e-4709-be4b-8bb58ae42249'::uuid;
  GET DIAGNOSTICS v_rows_deleted = ROW_COUNT;
  IF v_rows_deleted <> 1 THEN
    RAISE EXCEPTION 'R-1: rollback delete expected 1 row, deleted %, aborting', v_rows_deleted;
  END IF;

  -- R-2: NDIS format_mix baseline restored to zero
  SELECT count(*) INTO v_post_ndis_count
    FROM c.client_control_tower_enrollment
   WHERE client_id = 'fb98a472-ae4d-432d-8738-2273231c1ef4'
     AND control_type = 'format_mix';
  IF v_post_ndis_count <> 0 THEN
    RAISE EXCEPTION 'R-2: post-rollback NDIS baseline non-zero (found %), aborting', v_post_ndis_count;
  END IF;

  -- R-3: gate flip-back — m.format_mix_enrolled(ndis) must now read false
  SELECT m.format_mix_enrolled('fb98a472-ae4d-432d-8738-2273231c1ef4') INTO v_gate_after;
  IF v_gate_after IS DISTINCT FROM false THEN
    RAISE EXCEPTION 'R-3: gate flip-back failed, format_mix_enrolled=% after rollback, aborting', v_gate_after;
  END IF;

  -- R-4: append-only rollback audit row (does not delete the apply's audit row)
  INSERT INTO c.client_format_mix_audit (
    client_id, platform, control_type, action,
    before_data, after_data, actor, approval_status,
    reason, request_source, version_from, version_to
  ) VALUES (
    'fb98a472-ae4d-432d-8738-2273231c1ef4'::uuid, NULL, 'format_mix',
    'rollback_enroll_format_mix_slice_a', NULL, NULL,
    'packet:s6-slice-a-ndis-format-mix-enrolment-v1_rollback', 'approved',
    'Rollback of governed Slice-A enrolment, this packet', 'slice_a_apply_packet_v1_rollback', 1, NULL
  );
  IF NOT FOUND THEN
    RAISE EXCEPTION 'R-4: rollback audit INSERT reported no row, aborting';
  END IF;
END $$;
```

**Rollback identity set (every UUID this block reads or writes):**
`enrollment_id=7b93af4e-224e-4709-be4b-8bb58ae42249` (deleted) ·
`client_id=fb98a472-ae4d-432d-8738-2273231c1ef4` (target, verified back to zero rows) —
**identical to the apply block's written/target identity above**; PP's `client_id` is
deliberately absent here because the rollback never reads or writes the PP row (it was
never touched by the apply either, per C-4).

## 3a. `apply-harness-auditor` SHADOW review — author judgment (2026-08-01)

Run three times against successive revisions of this packet (`node
.claude/helpers/apply-harness-auditor.mjs`). First run: `INCOMPLETE` (AHA-10-1, no
assertion/control register — **real, fixed** by adding the register table + executable
SQL above). Current run: `CONCERNS`, 7 findings, all `medium`. Per the tool's own charter
("CONCERNS/INCOMPLETE is an author-review signal only... it never judges whether an
assertion expresses the RIGHT invariant"), author judgment on each, recorded here rather
than silently dismissed:

- **AHA-06-1…06-6 (baseline-scope coverage):** the tool's check 6 wants a **full-table
  snapshot** pattern to recognise a declared baseline; this packet's baselines (C-1 row
  count, C-4 `to_jsonb` pre-image) are targeted single-purpose queries, not full-table
  snapshots — a real, narrower pattern the heuristic doesn't recognise. Two of the six
  flagged "scopes" (`'m'`, `'build_weekly_demand_grid'`) are incidental substring matches
  on the guard function's schema-qualified name inside a `RAISE EXCEPTION` message, not
  actual non-regression assertions. The four remaining (the two client UUIDs, the
  enrolment UUID, `'active'`) **are** real values the SQL evaluates — but each is checked
  directly by its own named assertion (C-1/C-2/C-4/C-5 in the register above) with an
  explicit fail-closed `RAISE EXCEPTION`, not left silently unchecked. **Judgment: not
  remediated — assessed as a heuristic-pattern gap (narrower-than-full-table baselines
  aren't recognised), not a real missing control.** A future packet could satisfy this
  literally by adding a redundant full-row snapshot; not done here as it would add
  complexity without closing a real gap.
- **AHA-07-1 (apply/rollback identity divergence):** the apply block reads (but never
  writes) the Property Pulse row for the C-4 non-regression compare; the rollback
  correctly never touches PP, since the apply never wrote to it either. The tool's
  mechanical set-diff flags this read-only asymmetry as a divergence regardless of cause.
  **Judgment: not remediated — the one identity that is actually written by both apply and
  rollback (`enrollment_id=7b93af4e-224e-4709-be4b-8bb58ae42249`, `client_id=fb98a472-…`)
  is present, identical, and byte-pinned in both executable SQL blocks** (verify: apply
  §2 `INSERT`/`RAISE` clauses vs rollback §3 `DELETE`/`RAISE` clauses both reference these
  exact literals). The flagged "divergence" is PP's read-only identity, not a missing
  reversal.

**This section is itself the CCF-04-required author disposition of a non-clean SHADOW
verdict — not a claim that AHA passed.** SHADOW mode: this clears no gate regardless of
disposition; `db-rls-auditor`, external review, `branch-warden`, and the PK T3 gate all
still run/apply unchanged above it.

## 3b. Rehearsal note

The apply/rollback DO blocks above are frozen-final text. Live `BEGIN…ROLLBACK` rehearsal
(applying then rolling back, zero persistence) is a pre-apply step for the PK T3 gate, not
yet run as of this freeze — named here as an explicit remaining step, not silently assumed
done.

## 4. Freeze-time re-verification (completed 2026-08-01)

**Live values below were captured by `db-rls-auditor` this session via `execute_sql`
against `mbkmaxqhsohbtwsqolns` and are now pinned into §1 above.**

1. C-1 anchor (NDIS `format_mix` rows): **0** ✓
2. C-2 anchor (`client_id` ↔ `client_slug`): `fb98a472-ae4d-432d-8738-2273231c1ef4` ↔
   `'ndis-yarns'` ✓ confirmed
3. C-4 pre-image (PP current row, `enrollment_id=bd2c2ebe-21ae-493c-94d5-93bd54392a43`):
   `status=active, enabled=true, is_current=true, rollout_stage=enforce,
   approval_status=approved, effective_from=2026-06-01, effective_until=null, version=1,
   changed_by='migration:20260628120000', approved_by='PK',
   created_at=2026-06-28T10:27:21.32422+00:00` — full byte content captured, ready to pin.
4. C-4 baseline count (active+current `format_mix` rows, pre-apply): **1** (PP only) ✓
5. Guard regression check (C-3 target value): `md5(pg_get_functiondef(...))` =
   `9e51956f0f0fc27184962037c29f9615` — **re-confirmed live, unchanged since this morning's
   S7 apply** ✓
6. Live AFTER matrix (NDIS, re-run this session): `facebook/image_quote` 60%/17,
   `facebook/text` 40%/11, `instagram/image_quote` 100%/28, `linkedin/text` 57.14%/8,
   `linkedin/image_quote` 42.86%/6, `youtube/video_short_stat` 100%/28 — matches applied-result
   doc claim.
7. Practical exposure: **1 row**, unchanged from dry-run (`facebook`, Sunday 08:00,
   `format_override IS NULL` → resolves `image_quote`, `ready`).
8. **Classifier cross-check — the open blocker:** 4 of 6 emitted candidates `ready`; 2
   (`facebook/text`, `linkedin/text`) `unsupported_silent_degrade`. See top-of-file note and
   the decision below.

**Remaining before hash:** PK's ruling on the row-spec question (below), then generate
`enrollment_id`, set `effective_from`, compute packet sha256.

## 5. Review chain (all pinned to the frozen sha256; none run yet)

`db-rls-auditor` (live facts: constraints, grants posture unchanged, gate-function semantics)
→ external review (`reviewed_input_hash` mandatory; triage classes routed per contract)
→ `branch-warden` (fresh, immediately before any commit — shared checkout volatile)
→ `apply-harness-auditor` **SHADOW** (advisory; clears nothing)
→ **PK T3 apply gate (hard stop; separate sitting or Convention-2 pinned sequence)**.

## 6. The proof (post-apply, read-only — Milestone 2 §1.1 acceptance)

1. `m.format_mix_enrolled('fb98a472-…')` → `true`.
2. Grid readback == the freeze-pinned AFTER matrix, and a join-proof query showing **every**
   emitted (platform, format) satisfies the guard predicate: `platform_support=true` AND
   (`text` OR `select_template` non-fail-closed) — zero guard-failing candidates.
3. `classify_format_capability` proof, **scoped per PK's Option (a) ruling**: assert `ready`
   on exactly the 4 classifier-confirmed candidates — `facebook/image_quote`,
   `instagram/image_quote`, `linkedin/image_quote`, `youtube/video_short_stat`. The packet
   makes **no safety claim** about `facebook/text` / `linkedin/text` — both still read
   `unsupported_silent_degrade` live; they remain guard-passing-but-classifier-flagged, a
   named residual carried forward (see top-of-file note), not resolved by this apply.
4. **Zero-code evidence:** the lane's full CE change set is docs-only — `git diff` empty on
   all code paths (`supabase/functions/**`, `supabase/migrations/**` repo files, workers,
   scripts). The enrolment is data + this packet's documentation. (The `apply_migration`
   ledger row lives in the DB, not the repo — the repo-side migration file is deliberately
   NOT added, keeping the CE code diff empty; ledger provenance recorded in the result doc.
   If PK prefers the migration SQL also landed in-repo for the ledger↔git parity carry
   (memory: migration-ledger drift), that is a docs-lane add and still zero *code*.)
5. Result doc per `_template_result.md`; one register pointer (Convention 1).

## 7. Standing STOPs carried verbatim (seed packet)

F-AIW-PREF-COL-HARDCODE (no preferred-format config — none set here) · anchor/live-state
mismatch vs dry-run evidence → stop and report · fifth-brand onboarding OUT (existing brands
only) · fresh branch-warden before every commit · Track-B queue per PK's P-4 ruling only.

## 8. §8 decision — RESOLVED (PK, 2026-08-01): Option (a)

PK ruling: **Option (a)** — narrow the packet's §6 proof claim to the 4 classifier-`ready`
candidates; do not claim `facebook/text`/`linkedin/text` are safe. This does not change the
row spec (§1) or the DML itself — the enrolment remains client-scoped, matching the PP
precedent — it changes only what this packet's post-apply proof (§6.3) asserts. The named
residual (guard-passing-but-classifier-flagged `text` cells on FB/LI, currently dormant only
via `format_override` coverage on NDIS's one live-exposed unoverridden slot) is carried
forward explicitly, not resolved, and is not a Slice-A blocker per this ruling — it is
recorded as a live, named risk for a future D1 evidence-lane closure (Option (b), still
available later).

**Freeze status: FROZEN.** Packet sha256 below. Chain proceeds: db-rls-auditor already
clean-on-facts/block-on-overclaim (overclaim now corrected) → external review (pinned to
this hash) → apply-harness-auditor SHADOW → PK T3 apply gate.

**Packet sha256 (this file, post-freeze-edit, computed via `sha256sum`):** see review-chain
record in the result doc — computed at commit time from the exact frozen bytes below this
line.

— FROZEN 2026-08-01 · row spec §1, harness §2, rollback §3, proof scope §6.3 and this §8 are
the frozen content; review chain proceeds against this exact text —
