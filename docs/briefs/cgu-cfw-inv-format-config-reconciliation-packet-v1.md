# Apply Packet — CGU: CFW/Invegent `client_format_config` reconciliation (PK decision #5)

**Authorizing decision:** PK 2026-08-02 (#5, recorded `docs/briefs/results/cgu-final-readiness-audit-result-v1.md`
§6b): authorize the data-only reconciliation that clears `runtime_reachable=false` on the six blocked
✅ image_quote cells (CFW/INV × FB/IG/LI) — the readiness queue's own named `next_required_outcome`
("Reconcile platform_support/client_format_config").
**Tier:** T2/T3 — data-only DML, **but a real, disclosed live-behaviour change** (§3). PK apply gate required.
**Channel (pinned):** ONE `mcp__supabase__execute_sql` call containing exactly the §4 DO block.

## 1. Root cause (live-read 2026-08-02)

`runtime_reachable` (queue RPC, migration `20260801120000…rider_v1.sql` lines 208–233) requires
`platform_support[platform]=true` **AND** an `is_enabled=true` `c.client_format_config` row for
(client, format) matching the platform (or a NULL-platform default). **CFW and Invegent have ZERO
`client_format_config` rows** — live-read confirmed empty for both — so every cell fails the second
EXISTS. PP and NDIS each carry 9 NULL-platform rows (house convention), which is why their cells read
`reach=true`.

## 2. The reconciliation: 4 NULL-platform rows

Per client (CFW, INV): one row for `image_quote` and one for `text`, `platform=NULL`, `is_enabled=true`
— mirroring the PP/NDIS "Seeded … existing formats retroactively gated" convention exactly.

**Why `text` must be included even though decision #5 named only image_quote:** the ONLY code reader of
this table is ai-worker's advisor palette (`supabase/functions/ai-worker/index.ts:1014–1019`), and its
semantics are: **zero rows for a client = all buildable formats offered; ANY row = the config becomes a
restrictive allowlist.** Inserting image_quote-only rows would silently remove `text` from CFW/INV's
advisor palette and kill their live text publishing (INV LinkedIn text = 49 publishes/90d, last
2026-07-31; CFW LinkedIn text = 11/90d — both D1-governed committed cells). Including `text` preserves
the live publishing surface exactly.

## 3. Disclosed live-behaviour change (the honest part)

Because config-presence flips the advisor palette from "all buildable" to an allowlist, this apply
**restricts CFW/INV's advisor palette to {image_quote, text} ∩ platform_support** — formats like
carousel/avatar/video_* stop being offerable by the Advisor for these two brands. Live 90d evidence
shows their actual July+ publishing is exactly image_quote + text (everything else last fired May/June
on since-contained legacy paths), so the restriction matches observed production AND closes a latent
degrade source (the Advisor can today still propose carousel/avatar for CFW/INV — formats that are ⏸
deferred or capability-blocked). This is a containment improvement, but it is a CHANGE and is applied
only on PK's explicit gate over this packet.

Predicted cell flips (re-run contract R1): the 6 CFW/INV image_quote cells `blocked`→`ready`
(`reach` true on FB/IG/LI; YT unchanged — `platform_support.youtube` false/null for image_quote and the
platform is `publisher_path_missing` anyway). CFW/INV FB/LI `text` cells: `reach` flips true (cosmetic —
they are already `ready` via the D1 overlay).

**Additional benign queue-output diffs (db-rls-auditor re-derivation, 2026-08-02 — NOT stop conditions):**
the queue's `cfg_cells` CTE cross-joins NULL-platform config rows over all four platforms, so per client
the R1 re-run will ALSO show: new `instagram/text` and `youtube/text` cells (blocked/not_configured —
`text` platform_support: instagram=false, youtube absent), and the existing `youtube/image_quote` cell's
`is_probe_cell` flips true→false (its state may shift not_configured→blocked). ~6 extra output-row diffs
across the two clients, all benign and expected — the post-apply R1 diff should be read against THIS
list, not the six named flips alone.

**CFW-LI evidence-decay check (folded in per PK):** CFW×LinkedIn×image_quote has ZERO publishes in 90d
(last: none in window; queue shows no scheduled LI slot for CFW, `next_occurrence_source='none'`).
Reconciliation makes the cell `ready` but state-1 still requires publish proof — after this apply the
cell needs either one natural LI publish (schedule row exists? — `has_schedule_row` read false at audit)
or PK acceptance of >90d-old evidence. **Named residual, not resolved by this packet.**

## 4. Forward SQL (the exact, single `execute_sql` payload)

```sql
DO $$
DECLARE v_cfw uuid; v_inv uuid; v_pre int; v_post int;
BEGIN
  SELECT client_id INTO v_cfw FROM c.client WHERE client_slug='care-for-welfare-pty-ltd';
  SELECT client_id INTO v_inv FROM c.client WHERE client_slug='invegent';
  IF v_cfw IS NULL OR v_inv IS NULL THEN RAISE EXCEPTION 'G1 STOP: client row missing'; END IF;

  -- G2 (the load-bearing precondition): BOTH clients still have ZERO config rows.
  -- If any row exists, the zero-rows->allowlist analysis in this packet is stale: ABORT.
  IF EXISTS (SELECT 1 FROM c.client_format_config WHERE client_id IN (v_cfw, v_inv)) THEN
    RAISE EXCEPTION 'G2 STOP: a client_format_config row now exists for CFW/INV — packet analysis stale';
  END IF;

  -- G2b (AHA-02-1 remediation): the "no allocation change" blast-radius claim rests on CFW/INV
  -- being format-mix UNENROLLED. Guard it at apply time, not only at review time.
  IF EXISTS (SELECT 1 FROM c.client_control_tower_enrollment
              WHERE client_id IN (v_cfw, v_inv) AND control_type='format_mix') THEN
    RAISE EXCEPTION 'G2b STOP: CFW/INV now format-mix enrolled — blast-radius analysis stale';
  END IF;

  SELECT count(*) INTO v_pre FROM c.client_format_config;

  INSERT INTO c.client_format_config (client_id, ice_format_key, is_enabled, platform, notes)
  VALUES
    (v_cfw, 'image_quote', true, NULL, 'CGU reconciliation (PK decision 5, 2026-08-02, cgu-cfw-inv-format-config-reconciliation-packet-v1.md) — live-publishing format; config-presence restricts advisor palette to this allowlist (disclosed)'),
    (v_cfw, 'text',        true, NULL, 'CGU reconciliation (PK decision 5, 2026-08-02) — D1-governed live format; included to preserve live text publishing under allowlist semantics'),
    (v_inv, 'image_quote', true, NULL, 'CGU reconciliation (PK decision 5, 2026-08-02, cgu-cfw-inv-format-config-reconciliation-packet-v1.md) — live-publishing format; config-presence restricts advisor palette to this allowlist (disclosed)'),
    (v_inv, 'text',        true, NULL, 'CGU reconciliation (PK decision 5, 2026-08-02) — D1-governed live format; included to preserve live text publishing under allowlist semantics');

  SELECT count(*) INTO v_post FROM c.client_format_config;
  IF v_post - v_pre <> 4 THEN RAISE EXCEPTION 'G3 STOP: expected exactly 4 rows, got %', v_post - v_pre; END IF;
END $$;
```

## 5. Rollback (restores zero-rows semantics byte-exactly)

```sql
DO $$
DECLARE v_n int;
BEGIN
  DELETE FROM c.client_format_config cfc
   USING c.client cl
   WHERE cl.client_id = cfc.client_id
     AND cl.client_slug IN ('care-for-welfare-pty-ltd','invegent')
     AND cfc.notes LIKE 'CGU reconciliation (PK decision 5, 2026-08-02%';
  GET DIAGNOSTICS v_n = ROW_COUNT;
  IF v_n <> 4 THEN RAISE EXCEPTION 'ROLLBACK STOP: expected 4 rows, deleted %', v_n; END IF;
END $$;
```

Pre-image = zero rows (G2 asserts it), so provenance-qualified DELETE (notes prefix — the D4
registration-rollback lesson: never identity-only) restores the exact pre-apply state: zero rows,
advisor palette back to all-buildable default.

## 6. Blast radius (reader inventory — CORRECTED per db-rls-auditor must-fix, 2026-08-02)

The original "complete inventory" here named only two readers; the auditor's live `pg_proc` search
found FOUR DB-side readers plus one indirect. The corrected, complete list:

- **`ai-worker` advisor palette** (`index.ts:1015-1018`) — the §3 restriction; only code reader in `supabase/functions/**` (repo-wide grep, auditor-confirmed).
- **Readiness-queue RPC** `runtime_reachable` + its `cfg_cells` universe — the intended flip (+ the §3 benign extra cells).
- **`m.resolve_final_format` (R3a SHADOW resolver)** — called best-effort from ai-worker for any
  client's draft build, **log-only** (shadow, never enforcing). Its `p3_client` gate is a pure EXISTS
  with NO zero-rows→all fallback, so this apply changes its shadow allowed-set for CFW/INV from
  "nothing passes" to `{image_quote, text}` — an alignment improvement, but a real reader-behaviour
  change. **Operator note for the shadow-divergence monitoring lane: expect a CFW/INV
  divergence-rate shift dated from this apply; do not misattribute it.**
- **`public.get_publishing_plan_pyramid`** — reporting-only RPC; its cell universe /
  `client_format_enabled` / `max_per_week` enrichment for CFW/INV changes. No production writer reads it.
- **`m.build_weekly_demand_grid` (S7)** `enabled_set` CTE — reads the same table. **Mechanism, stated
  precisely (auditor correction):** the grid itself contains NO enrolment check and is callable for any
  client_id; the guard lives in `m.materialise_slots` (`v_enrolled := m.format_mix_enrolled(client_id)`;
  the grid call sits inside `IF v_enrolled`). CFW/INV are not format-mix enrolled
  (`c.client_control_tower_enrollment` = PP + NDIS only, live-confirmed), so no allocation change.
  **Guarded at apply time by G2b** (per `apply-harness-auditor` shadow finding AHA-02-1: aborts if
  either client becomes format-mix enrolled before the apply lands). Indirect reader
  `public.get_week_format_allocation` (calls the grid; reporting-only) inherits the same non-effect.
- No RLS/grant/DDL change. Table posture (auditor-read): `relacl` = postgres + `inspector_ro` read only,
  schema `c` not PostgREST-exposed; a data-only DML cannot add advisor findings (verified zero).

## 7. Review chain (2026-08-02 — packet STOPPED at PK apply gate)

- `apply-harness-auditor` (SHADOW, clears no gate): **CONCERNS** — one low finding AHA-02-1
  (enrolment precondition review-time-only) → **remediated executably as G2b** in §4; all other
  checks clean, check-7 rollback identity verified exact.
- `db-rls-auditor`: **concerns, high confidence** — SQL payload confirmed sound (G2 zero-rows live-true
  for both clients · rollback provenance pattern matches all-and-only the 4 rows · schema/constraint/
  FK/ACL fit verified · queue-flip re-derivation confirmed against live baseline · zero-rows→allowlist
  ai-worker semantics confirmed by code read · enrolment = PP+NDIS only, live). Must-fix was the §6
  reader-inventory omission (R3a shadow resolver + publishing-plan pyramid) and §3's incomplete
  predicted-diff list — **both corrected in place above; the SQL payload is byte-unchanged from what
  the auditor verified.** Open question for PK carried: whether R1 comparison uses the full §3 diff
  list (recommended, adopted here) — and the R3a shadow-divergence operator note (§6) stands.
- **Hash freeze:** sha256 `7503e1e76b5dfa3da338d082f0fc263e79506d3af7a9bacf259ec751fdbb1d8f`
  (this file at commit `cb21a8b`, i.e. §1–§6 + the chain text above; this freeze line and the
  external-review record below were appended after hashing — any edit to §1–§6 voids the review).
- **External review: `partial` → auto-escalated to PK** (`review_id aba9169b-9deb-46ff-bf01-eeb32254541a`,
  pinned to the frozen hash). No `concrete_defect` raised. Triage classification: **`policy_decision`**
  (whether the disclosed advisor-palette restriction is the right product call — exactly the judgment
  the PK apply gate exists to make) + **`runtime_verification_required`** (post-apply impact check —
  satisfied by the named R1 re-run gate against the full §3 predicted-diff list). Reviewer's two
  pushback points restate the packet's own disclosed change and the shadow-divergence note; both are
  presented to PK unresolved-by-machine, as the contract requires.
- **Apply authority: NOT granted by this chain.** The apply is a separate PK act against this exact packet.
