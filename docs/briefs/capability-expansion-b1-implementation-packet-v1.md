# S6 · B1 Implementation Packet v1 — cross-client truth alignment on the two proven card templates

**Created:** 2026-07-31 Sydney · **Lane:** S6 capability expansion, Slice B1 (Gate-1 approved with amendments 2026-07-31)
**Governing brief:** `docs/briefs/capability-expansion-format-reachability-gate1-brief-v1.md` (commit `fde6bbc`)
**Status:** AUTHORED — awaiting shadow harness audit → external review → **PK apply gate. NOTHING APPLIED.**
**Tier:** T2 (production DML, additive governance-trail rows only, selection-neutral — see §6) · Lane class: SAFETY_GATE
**Result file:** `docs/briefs/results/capability-expansion-b1-result-v1.md` (on completion)

> **Headline honest finding:** the assignment-status promotions B1 was scoped to propose are **already live
> and already truthful** — NDIS + CFW on the market-insight card and Invegent on the quote card sit at
> `assignment_status='production_proven'` with genuine client-attributed render→draft→publish chains
> (§3). The 2026-07-29 graduation matrix is **stale on those cells** (§8). What is actually missing is the
> **governance trail**: none of the three promoted assignments carries the `platform_publish` proof event
> that registry practice requires for `production_proven` (the column comment on
> `c.creative_provider_template.status` names it; only PP's market-insight assignment has one,
> `5a1b4304`, 2026-07-05). **This packet proposes exactly three additive proof-event INSERTs and nothing
> else.** It re-decides no promotion, changes no status, and touches no selection input.

---

## 1. Exact rows proposed (the complete write set)

Three INSERTs into `c.creative_template_proof_event` (schema: `20260630042316_tmr3_template_metadata_registry.sql:192-194`; live CHECK vocabulary re-confirmed 2026-07-31: `proof_type IN ('smoke_render','visual_approval','platform_render','platform_publish')`, `proof_status IN ('passed','failed','pending','superseded')`).

| # | assignment_id | client | template (internal id · provider id) | proof_type | proof_status | occurred_at (cited publish) | evidence_reference cites |
|---|---|---|---|---|---|---|---|
| W1 | `c4737728-eb87-462f-aa79-ce6b321ba8ef` | ndis-yarns (`fb98a472-…`) | generic_market_insight_card_1x1_v1 (`0e006c5c-…` · provider `48cba556-…`) | platform_publish | passed | `2026-07-19 22:00:18.134+00` | post_publish `6210dae9-ce92-4008-ac96-1e2175a7cea0` (facebook) · render_log `a62650db-e2a9-456a-951c-c86349b44682` · draft `0f00d7d0-4574-479c-8438-6c72484f69e2` — first published row AFTER the assignment was created (2026-07-18 10:39Z); 16 client-attributed publishes total (fb/ig/li) |
| W2 | `60e43a0e-8ac3-497d-b823-8d41c2aa123b` | care-for-welfare-pty-ltd (`3eca32aa-…`) | generic_market_insight_card_1x1_v1 (same) | platform_publish | passed | `2026-07-30 23:10:09.254+00` | post_publish `951eae29-fb77-4135-aa37-3a11b082b2f2` (facebook — the platform of the PK visual gate) · render_log `b2883ff3-5940-4365-a284-12967e9eb817` · draft `51cc9770-e22b-4951-98ae-f2b7513c5163`; earliest post-assignment publish overall was website 2026-07-21 (`140673af`); 10 publishes total (fb/ig/website) |
| W3 | `ecba211b-5217-4790-afe5-a2f98616712f` | invegent (`93494a09-…`) | generic_quote_card_1x1_v1 (`1cfe0f9c-…` · provider `2140ca19-…`) | platform_publish | passed | `2026-07-26 22:10:17.187+00` | post_publish `33814cef-fc15-4c29-9eb2-9c9288349d39` (facebook) · render_log `beff3c64-ad6b-4217-9aae-b438a86e0855` · draft `e4ce17c6-fd3a-41b4-8c49-39e656851151` — first post-assignment publish (assignment created 2026-07-20 09:16Z); 11 publishes total (fb/ig/li) |

`recorded_by` (identical, deterministic, all three): `S6 B1 platform_publish trail alignment (PK apply gate, packet capability-expansion-b1-implementation-packet-v1)`.

**Explicitly NOT proposed:** any `assignment_status` change (all already truthful) · any PP row (PP quote-card stays `visually_approved` — live evidence shows **zero** PP renders on the quote card, so its current status is correct) · any template-level `c.creative_provider_template.status` bump (both templates still read `smoke_rendered`; a bump is selection-neutral — the selector only floors at `smoke_rendered` — but it touches rows shared with PP, so it is **deferred as a named PK option, recommended NOT in this window**) · any row for the video template `c11bb8ab`/row 19 (NDIS/YouTube-lane baseline, PK boundary) · any enrolment/schedule/cap/mix row (S5 surface).

## 2. Current live state (read 2026-07-31, orchestrator `execute_sql`, read-only)

- Templates: `0e006c5c` (provider `48cba556`, market-insight) and `1cfe0f9c` (provider `2140ca19`, quote) — both `scope='generic'`, `status='smoke_rendered'`, `client_id IS NULL`.
- Assignments on the two templates (complete set, 5 rows): PP×market-insight `production_proven` (7806fa5e, since 2026-07-05) · NDIS×market-insight `production_proven` (c4737728, 2026-07-18) · CFW×market-insight `production_proven` (60e43a0e, 2026-07-20) · PP×quote `visually_approved` (7e95190e) · INV×quote `production_proven` (ecba211b, 2026-07-20). All `approved_by='PK'`, `assignment_scope='generic_allowed'`.
- Proof events (complete set, 6 rows): visual_approval/passed on all five assignments' lanes + **exactly one** platform_publish (PP×market-insight, `5a1b4304`, 2026-07-05). None on the three 2026-07-18/20 promotions — the gap this packet closes.
- No triggers on either table (live `pg_trigger` read: 0 non-internal).

## 3. Per-client evidence status (rungs 7–9, client-attributed, live join `m.post_render_log` → `m.post_draft` → `m.post_publish status='published'`, template identity via `render_spec→tmr→registry_template_id`)

| client × template | renders (succeeded) | drafts | publishes | platforms | window |
|---|---|---|---|---|---|
| NDIS × market-insight | 16/16 | 16 | **16** | fb, ig, li | 2026-07-18 → 07-31 (+1 pre-assignment li publish 2026-06-07, excluded from the citation) |
| CFW × market-insight | 12/12 | 12 | **10** | fb, ig, website | 2026-07-21 → 07-31 |
| INV × quote | 13/13 | 13 | **11** | fb, ig, li | 2026-07-23 → 07-31 |
| PP × market-insight | 33/33 | 31 | 31 | fb, ig, li | 2026-07-05 → 07-30 (context only — untouched) |
| PP × quote | **0** | 0 | 0 | — | — (confirms PP quote stays `visually_approved`) |

**Rung 10 live-verified read-only** (`public.select_template` confirmed `provolatile='s'` STABLE, write-free in all three repo definitions and live): `ndis-yarns`/`care-for-welfare-pty-ltd` × facebook × image_quote → market-insight card `selected`; `invegent` × facebook × image_quote → quote card `selected`; full reason chains recorded (format_match · generic_scope · platform_declared · assignment_visually_approved · visual_proof_passed · assets_resolved).

**Every proposed template is genuinely rendered and governed:** both cards render exclusively through the governed TMR path (renders carry `resolver_used=true`, governed asset keys, selector reasons in `render_spec`), and every promotion cites a PK-passed visual_approval proof event (cc-0044 CP-D / D7 lanes).

## 4. Data-versus-code classification

**Pure data.** Three additive DML INSERTs into one `c.*` table. Zero DDL, zero code, zero deploy, zero EF/cron/schedule change, zero dashboard change. Rollback is pure data (§7).

## 5. Collision check — S5 and the NDIS/YouTube lane

- **Write-surface disjointness PROVEN:** S5's apply functions (`save_publish_cadence`, `save_schedule_cap_override` — repo grep; `save_publish_schedule` — live `pg_proc.prosrc` read, **zero** `creative%` references) never touch `c.creative_*`; no triggers exist on S5's tables or B1's tables. B1 writes only `c.creative_template_proof_event`.
- **PK parallelism conditions all satisfied:** no shared rows (disjoint tables) · no evidence-window baseline change (proof events are read by no scheduler/allocator/classifier input; the selector reads only `proof_type='visual_approval'` — cc-0089 body step e — so `platform_publish` rows are **selection-neutral by construction**) · PP facebook image_quote untouched (no PP row in the write set) · YouTube publisher untouched.
- **NDIS/YouTube lane boundary respected:** row-19/video and all YouTube suitability/assignment rows excluded; the NDIS evidence cited here is the NDIS **static-card** chain, not YouTube-lane baseline.
- **Observed live fact surfaced to PK/S5 (not S6's to act on):** PP facebook `paused_until` now reads `2026-08-03T12:00:00Z` — later than the `2026-08-01 10:33Z` expiry S5's runbook (`s5-apply-runbook-v1.md` S0.1) was scheduled around. S5's own S0 pre-check will trip its STOP; recorded here because the S5 apply timing may move. B1 has no dependency on that pause either way.
- **Timing independence:** because the surfaces are disjoint and the writes selection-neutral, B1's apply does not need to sequence before/after S5's window; PK may still choose to serialise it for operator simplicity.

## 6. Tier and risk

T2 proposed (production DML ≥ T2 per Convention 3; not T3 because: no publish posture, no callers/grants/deploy/secrets, selection-neutral additive rows, byte-exact rollback). PK may raise to T3 at the gate; escalation up is free.

## 7. Apply + rollback (rung 11 — rollback validated BEFORE apply)

**Channel (named, single-call, atomic):** ONE `execute_sql` call (Supabase MCP, PK-run at the apply gate) containing a single `DO $$ … $$` block — a single statement, therefore a single transaction; no pooled multi-call composition.

**Apply (executable; every STOP is an enforced RAISE, not a comment):**

```sql
DO $$
DECLARE v_n int;
BEGIN
  -- G1: assignments still production_proven (else ABORT)
  SELECT count(*) INTO v_n FROM c.creative_template_client_assignment
   WHERE id IN ('c4737728-eb87-462f-aa79-ce6b321ba8ef','60e43a0e-8ac3-497d-b823-8d41c2aa123b','ecba211b-5217-4790-afe5-a2f98616712f')
     AND assignment_status='production_proven';
  IF v_n <> 3 THEN RAISE EXCEPTION 'B1 ABORT G1: expected 3 production_proven assignments, got %', v_n; END IF;
  -- G2: no existing platform_publish proof on any of the three (else ABORT — pre-image must be absence)
  SELECT count(*) INTO v_n FROM c.creative_template_proof_event
   WHERE assignment_id IN ('c4737728-eb87-462f-aa79-ce6b321ba8ef','60e43a0e-8ac3-497d-b823-8d41c2aa123b','ecba211b-5217-4790-afe5-a2f98616712f')
     AND proof_type='platform_publish';
  IF v_n <> 0 THEN RAISE EXCEPTION 'B1 ABORT G2: platform_publish proof already present (n=%), packet stale', v_n; END IF;
  -- G3: the three cited publish rows still exist, status published (else ABORT)
  SELECT count(*) INTO v_n FROM m.post_publish
   WHERE post_publish_id IN ('6210dae9-ce92-4008-ac96-1e2175a7cea0','951eae29-fb77-4135-aa37-3a11b082b2f2','33814cef-fc15-4c29-9eb2-9c9288349d39')
     AND status='published';
  IF v_n <> 3 THEN RAISE EXCEPTION 'B1 ABORT G3: expected the 3 cited published rows, got %', v_n; END IF;
  -- W1..W3
  INSERT INTO c.creative_template_proof_event (assignment_id, proof_type, proof_status, occurred_at, evidence_reference, recorded_by) VALUES
  ('c4737728-eb87-462f-aa79-ce6b321ba8ef','platform_publish','passed','2026-07-19 22:00:18.134+00',
   'First post-assignment client-attributed publish: post_publish 6210dae9-ce92-4008-ac96-1e2175a7cea0 (facebook 2026-07-19) · render_log a62650db-e2a9-456a-951c-c86349b44682 · draft 0f00d7d0-4574-479c-8438-6c72484f69e2; 16 NDIS-attributed publishes fb/ig/li 2026-07-18→07-31. Packet: docs/briefs/capability-expansion-b1-implementation-packet-v1.md',
   'S6 B1 platform_publish trail alignment (PK apply gate, packet capability-expansion-b1-implementation-packet-v1)'),
  ('60e43a0e-8ac3-497d-b823-8d41c2aa123b','platform_publish','passed','2026-07-30 23:10:09.254+00',
   'Client-attributed facebook publish: post_publish 951eae29-fb77-4135-aa37-3a11b082b2f2 (2026-07-30) · render_log b2883ff3-5940-4365-a284-12967e9eb817 · draft 51cc9770-e22b-4951-98ae-f2b7513c5163; earliest post-assignment publish website 2026-07-21 (140673af-2f65-4251-95c6-23c50615d625); 10 CFW-attributed publishes fb/ig/website 2026-07-21→07-31. Packet: docs/briefs/capability-expansion-b1-implementation-packet-v1.md',
   'S6 B1 platform_publish trail alignment (PK apply gate, packet capability-expansion-b1-implementation-packet-v1)'),
  ('ecba211b-5217-4790-afe5-a2f98616712f','platform_publish','passed','2026-07-26 22:10:17.187+00',
   'First post-assignment client-attributed publish: post_publish 33814cef-fc15-4c29-9eb2-9c9288349d39 (facebook 2026-07-26) · render_log beff3c64-ad6b-4217-9aae-b438a86e0855 · draft e4ce17c6-fd3a-41b4-8c49-39e656851151; 11 Invegent-attributed publishes fb/ig/li 2026-07-23→07-31. Packet: docs/briefs/capability-expansion-b1-implementation-packet-v1.md',
   'S6 B1 platform_publish trail alignment (PK apply gate, packet capability-expansion-b1-implementation-packet-v1)');
  -- G4: exactly 3 rows landed (fail-closed row count)
  GET DIAGNOSTICS v_n = ROW_COUNT;
  IF v_n <> 3 THEN RAISE EXCEPTION 'B1 ABORT G4: expected 3 inserts, got %', v_n; END IF;
END $$;
```

**Rollback (byte-exact reverse; pre-image = absence, validated pre-apply by G2):** same single-call channel:

```sql
DO $$
DECLARE v_n int;
BEGIN
  DELETE FROM c.creative_template_proof_event
   WHERE assignment_id IN ('c4737728-eb87-462f-aa79-ce6b321ba8ef','60e43a0e-8ac3-497d-b823-8d41c2aa123b','ecba211b-5217-4790-afe5-a2f98616712f')
     AND proof_type='platform_publish'
     AND recorded_by='S6 B1 platform_publish trail alignment (PK apply gate, packet capability-expansion-b1-implementation-packet-v1)';
  GET DIAGNOSTICS v_n = ROW_COUNT;
  IF v_n <> 3 THEN RAISE EXCEPTION 'B1 ROLLBACK ABORT: expected 3 deletions, got % (manual reconcile — do not retry blind)', v_n; END IF;
END $$;
```

Identity: rollback predicate = exactly the three inserted rows (assignment set × proof_type × the packet-unique `recorded_by` string); apply and rollback cover the identical row set; no other writer uses that `recorded_by` value (live G2 shows zero platform_publish rows on these assignments today).

**Post-apply verification (read-only):** re-run the §2 proof-event read → expect 9 rows total (6 + 3); re-run one `select_template` call per client → verdicts unchanged (selection-neutrality confirmed live); `db-rls-auditor` post-apply pass in a DB-capable session.

## 8. Matrix contradiction record (surfaced per the brief's stop condition — not silently reconciled)

`creatomate-template-graduation-matrix-v1.md` (2026-07-29) reports NDIS/CFW (row 5) and Invegent (row 7) at `visually_approved`; live `updated_at` shows all three at `production_proven` since 2026-07-18/20 — **before** the matrix date. The matrix also implies row 7's 11 renders include PP; live attribution shows they are Invegent's (PP quote-card: zero). Register/matrix correction is a `register-reconciler` handoff, not part of this packet's write set.

**Governance observation (for PK, no action proposed):** the three 2026-07-18/20 promotions were applied by their lanes (cc-0044 CP-D / D7) without the platform_publish proof event registry practice requires. This packet closes that trail gap with evidence that genuinely post-dates the promotions in 2 of 3 cases (NDIS's first post-assignment publish 07-19; CFW's 07-21; INV's 07-26) — the trail becomes honest, and rung-13 monitoring continues regardless.

## 9. Rung-by-rung graduation mapping (13-rung contract, `creatomate-registry-integrity-graduation-contract-v1.md` §4)

| Rung | Status for the three client×template pairs |
|---|---|
| 1 provider existence | HOLDS — both provider ids live-rendering daily through 2026-07-31 (strongest possible existence proof) |
| 2–5 field/dims/assets/audio | HOLDS — governed TMR render path in production (`resolver_used=true`, governed asset keys); audio n/a (static) |
| 6 PK visual approval | HOLDS — passed visual_approval proof events on all three assignments (2026-07-18/20, PK-recorded) |
| 7 supervised render | HOLDS — client-attributed succeeded renders (16/12/13) via the real worker path |
| 8 real-draft render | HOLDS — renders consumed into real `m.post_draft` rows (16/12/13) |
| 9 publish proof | HOLDS in fact (16/10/11 published rows) — **this packet adds the missing proof-event record of it** |
| 10 selector eligibility | HOLDS — live `select_template` calls (STABLE, read-only) return each template `selected` for its client |
| 11 rollback proof | THIS PACKET §7 — validated against live pre-image before any apply |
| 12 production promotion | ALREADY DONE by prior PK-gated lanes; this packet re-decides nothing, records the evidence trail |
| 13 post-promotion health | ONGOING — 0 failed renders in-window on all three chains; monitoring continues (no action here) |

No rung is bypassed; no rung is claimed by inheritance — every row above is client-attributed.

## 10. Next explicit gate

1. `apply-harness-auditor` (registered SHADOW — advisory only, clears nothing) on this packet — done before freeze, result recorded below the freeze line.
2. External review (`ask_chatgpt_review`) pinned to this file's frozen sha256; any non-clean → triage per CLAUDE.md.
3. **PK APPLY GATE (hard stop):** PK runs (or authorises as a Convention-2 sequence) the §7 apply — one execute_sql call. STOP conditions: packet-hash mismatch · G1/G2/G3 abort · any non-clean review · unexpected origin movement · rollback invalidated.
4. Post-apply verification (§7) + result doc + one register pointer (Convention 1) + matrix-staleness handoff to `register-reconciler`.

**Named substitution (CCF-02 R1, recorded):** the registered `db-rls-auditor` had no live DB path this session (no `ice_readonly` DSN provisioned; Supabase MCP toolset not attached to subagents) and fail-closed with repo-static findings (id-trap, selector purity, S5-disjointness-minus-one). The live reads in §2–§3/§5 were run by the orchestrator via `execute_sql`, read-only, queries recorded in the session transcript. A fresh `db-rls-auditor` live pass is required at/after the apply gate in a DB-capable session.
