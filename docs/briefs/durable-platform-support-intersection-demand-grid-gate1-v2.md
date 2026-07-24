# Brief cc-NNNN — durable `platform_support` intersection inside `m.build_weekly_demand_grid` (v2)

**Created:** 2026-07-24 Sydney
**Version:** v2 — supersedes v1 (`c6292b5f9524fa6e3055313bccbd0a0af5f632e6e00141e5c3bf5f723144f2e1`, 32,798 bytes), which remains on disk unmodified. v2 records PK's decision on §6, this lane's new position in the production sequence, the hardening of proof P2, and the reassignment of residual R1 to S8. **No design content was changed** — every recommendation, figure and non-claim in v1 stands as authored.
**Author:** S7 (chat) — **AUTHORING ONLY, Gate-1 design brief**
**Executor:** {PK decides — not self-assigned}
**Status:** draft
**Result file:** `docs/briefs/results/cc-NNNN-durable-platform-support-intersection.md` (created on completion)

> **cc- ID NOT self-allocated.** The control tower allocates centrally. No register version claimed.
> **Lane classification (CCF-02):** SAFETY_GATE · **Tier T3** (see §7). **Priority 1 successor** — this lane exists only because cc-0079 Slice 2 (priority 1) is a data patch over a structural gap; it names which priority it serves and stops there.
> **This brief opens no window.** Exactly one production-mutation window exists and cc-0079 Slice 2 (S1) holds it.
>
> **🟢 PK DECISION ON §6 — RULED, CLOSED (2026-07-24).** PK accepted the allocation-equivalence proof and ruled it does **NOT** make Slice 2 unnecessary, on the reasoning §6 gave: the stored mix must accurately represent current governed intent, and leaving `linkedin / carousel = 40%` recorded as current while production deliberately ignores it would create a misleading operator surface and let invalid intent be copied into future overrides. **§12 open question 1 is therefore CLOSED — do not re-raise it.**
>
> **📍 SEQUENCE — THIS LANE IS THIRD.** PK's production order after Slice 2 is **proven**: (1) repair the three already-materialised invalid slots — **assigned to S8, not this lane** · (2) prove downstream consistency · (3) **then** this durable read-time intersection enters its own implementation and review window. Design-only until (3) opens.
>
> **🔒 PROOF P2 HARDENED FROM ADVISORY TO REQUIRED.** PK: the durable change *"should then be demonstrably allocation-neutral on live data. That is the safest state in which to ship it."* v1's §9 P2 made zero-delta **conditional** on Slice 2 applying first. It is now **unconditional**: P2 must assert zero-delta, not merely correctness. See §9.
>
> **⛔ PK RULING ON THIS LANE (received 2026-07-24, after v1 was first frozen):** *"S7 remains design-only. It may define the durable platform-support/grid correction but must not implement it while the Slice 2 production window is active."* Design authority is **full** — placement, invalid-entry disposition, renormalization semantics, override coverage, consuming path, tier, gates, stop conditions, rollback, proof. Implementation is **closed** while S1's window is open (halted and being re-cut, but still S1's): no function written, no migration authored for apply, no DML run. **This artifact complies as authored** — §3's SQL is illustrative design text, explicitly a non-claim, and nothing here was executed.

**Stale-ref gate — PASS.** `git fetch --prune` run at author time. `HEAD == origin/main == ad4a6a944027897672764c1540f53890e027c2ee`, parity `0 0`, confirmed independently by `git ls-remote origin refs/heads/main`. The seed's base line was re-derived, not trusted.

---

## Task

Design — **not build** — a durable control that prevents the weekly demand grid from ever allocating a content format to a platform that cannot publish it. Today `m.build_weekly_demand_grid` does not consult `platform_support` at all: it filters candidate formats by client enablement and by synthesis/quality policy, then normalises shares — and platform capability is never one of the filters. cc-0079 Slice 2 corrects today's rows as data; nothing prevents tomorrow's rows from re-introducing the defect silently. This brief answers where the intersection belongs, what an invalid entry should do, how shares re-weight, how it interacts with Slice 2, how client overrides are covered, and what proof would demonstrate the control is actually consumed by production.

---

## Source context

- `m.build_weekly_demand_grid(p_client_id uuid, p_week_start date)` — STABLE, plpgsql, **4330 bytes**, `md5(pg_get_functiondef) = 2dff1dab88fb1f9e3f341ea6f9f843c7` (live, read at author time). Repo text: [supabase/migrations/20260628000000_format_mix_enforcement_phase1.sql:274](supabase/migrations/20260628000000_format_mix_enforcement_phase1.sql:274).
- `m.materialise_slots(p_days_forward integer)` — SECURITY DEFINER, `md5 = e5b340b7be143a8679c68308a48c4f18`. Repo text: [supabase/migrations/20260628000000_format_mix_enforcement_phase1.sql:440](supabase/migrations/20260628000000_format_mix_enforcement_phase1.sql:440).
- `m.allocate_week_formats(p_formats jsonb, p_n integer)` — IMMUTABLE, pure, **no platform parameter**.
- [docs/briefs/cc-0079-slice-2-apply-packet-v2.md](docs/briefs/cc-0079-slice-2-apply-packet-v2.md) §1/§2/§9 — the data-only renormalization and its named code successor (this lane).
- [docs/briefs/results/cc-0079-slice-2-apply-lane-halt-v1.md:136](docs/briefs/results/cc-0079-slice-2-apply-lane-halt-v1.md:136) — repeats the same successor.
- [docs/briefs/dashboard-schedule-platform-format-planning-surface-gate1-v1.md](docs/briefs/dashboard-schedule-platform-format-planning-surface-gate1-v1.md) — reaches the same structural conclusion from the UI side.
- Cron `jobid 72` `materialise-slots-nightly`, schedule `0 15 * * *`, `active=true`, body `SELECT m.materialise_slots(7);`.

---

## 1 · Ground truth — verified this lane, not inherited

Every figure below was re-derived live. Catalog reads via `python scripts/db-read.py` (R0); `t.*` / `c.*` / `m.*` data reads via `execute_sql` (R1) — R0 has no USAGE on schema `t` (`42501 permission denied for schema t`), an expected residual, named here rather than worked around.

| Seed claim | Verdict | Evidence |
|---|---|---|
| `candidate` CTE = `t.platform_format_mix_default WHERE is_current` **UNION** `c.client_format_mix_override` | **CONFIRMED** | live `pg_get_functiondef` |
| Platform with zero current rows vanishes from the grid, no error | **CONFIRMED** | every downstream CTE partitions by `platform`; `per_platform_total` groups by platform |
| 22 rows, all `is_current=true`, no history | **CONFIRMED** | `SELECT … FROM t.platform_format_mix_default` — 22 rows, 22 current, 0 retired |
| `idx_platform_format_mix_default_current` non-unique, keyed on `platform` alone | **CONFIRMED** | `CREATE INDEX … USING btree (platform) WHERE (is_current = true)` |
| No uniqueness enforcement on `is_current` | **CONFIRMED, with nuance** | the only UNIQUE is `(platform, ice_format_key, effective_from)`. Two `is_current=true` rows for the same (platform, format) at different `effective_from` are permitted. **Nuance:** `candidate_share` groups by (platform, format) and takes `max(share_pct)` — duplicates collapse to the max rather than double-counting. Corruption is silent-arbitrary, not additive. |
| Valid formats: FB 3 · IG 2 · LI 2 · YT 5 | **CONFIRMED, matches PK's v6.22 ruling exactly** | see §2 |
| `platform_support` read as `COALESCE((f.platform_support->>d.platform)::boolean, false)` — fail-closed default | **CONFIRMED** | verbatim in `m.create_manual_slot_internal` |
| `animated_text_reveal` + `animated_data` supported on zero platforms | **CONFIRMED** | both `supported=false` on every platform they appear on |
| Zero user triggers on the mix table | **CONFIRMED** | all constraint triggers are RI |

**Corrections / additions the seed did not carry:**

- **C1 — Only ONE client is enrolled.** `m.format_mix_enrolled()` returns `true` for `property-pulse` only; `invegent`, `ndis-yarns`, `care-for-welfare-pty-ltd` are all `false`. `m.materialise_slots` calls the grid **only when enrolled**. Today's blast radius is one client; the durable fix is primarily protection for future enrolment.
- **C2 — There are ZERO current `c.client_format_mix_override` rows for ANY client**, not merely for Property Pulse. Override coverage is entirely latent.
- **C3 — `platform_support` is read by FOUR functions, none of them on the automated demand path:** `m.create_manual_slot_internal`, `public.get_global_format_capability_pyramid`, `public.get_publishing_plan_pyramid`, `public.get_studio_capabilities`. The manual slot path **fails closed with a named error** (`format_not_supported_on_platform`); the automated path has no check whatsoever. **That asymmetry is the defect in one sentence.**
- **C4 — the filter-then-renormalize pattern already exists and is proven live.** `t.platform_format_mix_default` holds 5 YouTube rows summing to 100 (incl. `video_short_avatar` at 10). The live grid returns only **4** YouTube rows at `33.33 / 27.78 / 22.22 / 16.67` — summing to 100.00, ratio-preserved from `30:25:20:15`. A format was dropped upstream (`enabled_set` / `policy_backed`) and the surviving shares re-weighted **automatically, with no signal of any kind**. This is simultaneously the strongest argument for §4's answer and the clearest live example of the silent-degradation failure mode §3 warns about.

---

## 2 · The gap, in numbers (independently reproduced)

`m.build_weekly_demand_grid('property-pulse', date_trunc('week', CURRENT_DATE))` joined to `platform_support`:

| platform | invalid formats still in the grid | invalid `weekly_slot_count` |
|---|---|---|
| linkedin | `carousel` (40% — largest share) · `video_short_kinetic` · `video_short_stat_voice` | **3 of 5** |
| instagram | `video_short_kinetic` · `video_short_stat_voice` · `animated_data` · `animated_text_reveal` | **2 of 5** |
| facebook | `video_short_kinetic` · `video_short_kinetic_voice` · `animated_text_reveal` | **1 of 5** |
| youtube | none | 0 of 5 |

**6 of 15 (40%).** This independently reproduces cc-0079 Slice 2 §1 — which the v6.22 registrar explicitly recorded as *carried from the packet, not independently reproduced*. **That gap is now closed: the figure is confirmed by a separate hand on a separate lane.**

---

## 3 · Design question 1 — where the intersection belongs

Four candidate sites were considered. Three are rejected on structural grounds, not preference.

**(a) `m.allocate_week_formats` — REJECTED, structurally impossible.** Its signature is `(p_formats jsonb, p_n integer)`. It receives an already-built array of `{key, share}` and **has no platform argument at all**. It is also `IMMUTABLE`, so it cannot look anything up. Intersecting here requires a signature change to a function called from a SECURITY DEFINER cron path — strictly more blast radius for strictly less coverage.

**(b) A `CHECK` constraint on `t.platform_format_mix_default` — REJECTED, not expressible.** `platform_support` lives on a different table (`t."5.3_content_format"`). A `CHECK` cannot reference another table. It would also be *wrong even if possible*: `platform_support` is mutable, so a row valid at insert can become invalid later without any write to the mix table.

**(c) A trigger on the mix tables — REJECTED as the primary control, RECOMMENDED as an optional second layer.** A `BEFORE INSERT OR UPDATE` trigger catches bad authoring at write time with a clear error, which is genuinely useful. But it **cannot** catch the case that actually worries us: a later flip of `platform_support` on `t."5.3_content_format"` silently invalidating rows already stored. Write-time validation is necessary-but-insufficient; read-time intersection is the one that holds under every mutation order.

**(d) `m.build_weekly_demand_grid` — RECOMMENDED (the minimum viable durable control).**

Insert one CTE between `enabled_set` and `policy_backed`, mirroring `policy_backed`'s existing shape exactly:

```sql
  platform_capable AS (
    SELECT es.platform, es.ice_format_key, es.share_pct
    FROM enabled_set es
    WHERE EXISTS (
      SELECT 1 FROM t."5.3_content_format" cf
       WHERE cf.ice_format_key = es.ice_format_key
         AND cf.is_active = true
         AND COALESCE((cf.platform_support ->> es.platform)::boolean, false)
    )
  ),
```

…and repoint `policy_backed`'s `FROM enabled_set es` at `platform_capable`. **Nothing else in the function changes.**

Why this position specifically:

1. It is **downstream of the `candidate` UNION**, so it covers defaults **and** client overrides in one expression (answers §7 / design question 5).
2. It is **upstream of `per_platform_total` / `normalised`**, so the existing renormalization applies to the survivors with **zero new arithmetic** (answers design question 3).
3. It **preserves the fail-closed `COALESCE(…, false)` default** verbatim from `m.create_manual_slot_internal` — an unknown platform key, a null `platform_support`, or a malformed JSON value all resolve to *not supported*.
4. It adds `cf.is_active = true`, matching the manual path, which the current grid also omits.
5. It is a `CREATE OR REPLACE` of a `STABLE` function with an **unchanged signature and unchanged return columns** — no dependent object is invalidated.

**Recommended shape overall:** (d) is the required minimum and delivers the outcome alone. (c) is an optional write-time complement PK may commission separately; it must never be proposed as a substitute for (d).

---

## 4 · Design question 2 — what happens to an invalid entry

**Recommendation: DROP, with observability moved OUT of the grid — not silent, and not fail-closed-throw.**

The three options and their real costs:

| Option | Cost |
|---|---|
| **Fail closed (RAISE)** | `m.build_weekly_demand_grid` is called inside `m.materialise_slots`'s `FOR v_rule IN …` loop, which runs as one nightly SECURITY DEFINER cron transaction (jobid 72). A raise for one bad mix row aborts **the entire materialisation for every client and every platform**, silently, until someone reads cron history. The blast radius of the guard exceeds the blast radius of the defect it guards. **Rejected.** |
| **Silent drop** | Zero new code, matches the existing house pattern — and is exactly ICE's signature failure mode. §1/C4 is the proof: `video_short_avatar` already disappears from YouTube's grid every night with no signal anywhere. Adopting it again would make the control invisible to the operator whose schedule it is silently reshaping. **Rejected as the whole answer.** |
| **Drop + observability (RECOMMENDED)** | The drop itself must be silent *inside the grid* — the function is `STABLE` and therefore **cannot write telemetry**; making it `VOLATILE` to log would be a far larger change than the fix. So observability goes where writes are already legal. |

Concretely, three layers, in decreasing order of necessity:

1. **The grid drops the row** (required — the fix itself).
2. **A read-only diagnostic view** — proposed name `ice_ro.format_mix_platform_conflicts`, one row per `is_current` mix/override entry whose `platform_support` is false, with platform, format, stored share, and the share that would be reweighted away. Secret-free, R0-servable, and it closes the "coverage gap → new view, not a workaround" rule in `CLAUDE.md`. **This is what makes the drop non-silent**, and it works *before* the fix ships (it is the pre-apply proof in §9).
3. **A count in `m.materialise_slots`' return jsonb** — e.g. `formats_dropped_platform_unsupported` — optional, small, and the natural place because that function is already `VOLATILE`/SECURITY DEFINER and already returns a summary object. **Flagged as scope-expanding**: it touches a second production function. PK's call whether it rides or waits.

**Named residual:** even layer 3 is a per-run count, not an alert. Nothing in ICE currently pages on it. The brief does not claim otherwise.

---

## 5 · Design question 3 — renormalization semantics

**Recommendation: re-weight the survivors, preserving ratio. This requires NO new code — it is what the function already does.**

`per_platform_total` sums the surviving shares per platform and `normalised` computes `share_pct * 100.0 / total_share`. Placing `platform_capable` upstream of these means the existing arithmetic reweights automatically.

Verified live (§1/C4): YouTube's mix stores `30:25:20:15:10`; one entry is dropped upstream today; the grid returns `33.33:27.78:22.22:16.67` — sum 100.00, ratios preserved. The behaviour is not theoretical.

**Why re-weight rather than let the platform lose the share:** if invalid shares simply vanished without reweighting, LinkedIn's shares would sum to 35 and the allocator would still distribute all 5 slots across them by *relative* weight — `m.allocate_week_formats` divides by `v_total_share`, not by 100. The two options therefore produce **identical allocations** for the non-empty case. Re-weighting is preferred because it makes `share_pct` in the grid's *output* mean what it says (a percentage of that platform's week), which the S2 dashboard surface will read.

**The genuinely different case is the empty one, and it is a hole:** if every format for a platform is invalid, `policy_backed`/`platform_capable` yields no rows, the platform disappears from the grid, `v_shares_json` is NULL, `v_assignment` is empty, `v_chosen` stays NULL — and `m.materialise_slots` **falls back to `v_preferred_fmt` from `c.client_publish_profile.preferred_format_*`, which is not platform-validated anywhere.** For YouTube the fallback is hardcoded `'video_short_avatar'`. Today this is benign (the only non-null preferred format live is `image_quote` on facebook, which is valid; IG/LI are NULL, and `m.fill_pending_slots` then defaults to `COALESCE(format_preference[1],'image_quote')`, also valid on both). **It is benign by coincidence, not by construction.** Named as a residual in §11 — closing it means touching `m.materialise_slots`, which is a scope decision for PK, not an assumption for this brief.

---

## 6 · Design question 4 — interaction with cc-0079 Slice 2 (**directly affects whether PK should still apply Slice 2**)

> **⚠ PRE-APPLY-GATE FINDING — PK asked for this before Slice 2's apply gate, not after.** It is answered below and was surfaced to the control tower on delivery of v1, ahead of this section being read in full. **Headline: the read-time intersection would make Slice 2's data change unnecessary FOR ALLOCATION — the two produce identical slot assignments — but NOT unnecessary for data truth.** The recommendation is still to apply Slice 2, and the reason is not the slots.

**Finding: COMPLEMENTARY, not conflicting — and allocation-equivalent.**

I computed the intersection's allocation independently of the packet, by feeding the valid-only shares through the real `m.allocate_week_formats(shares, 5)`:

| platform | allocation the durable fix would produce | Slice 2 §1 "AFTER" |
|---|---|---|
| facebook | `image_quote · carousel · image_quote · carousel · text` | **identical** |
| instagram | `carousel · image_quote · carousel · carousel · image_quote` | **identical** |
| linkedin | `text · image_quote · text · text · image_quote` | **identical** |

**0 invalid of 5 on every platform, matching Slice 2 exactly.** This is expected once §5 is understood — Slice 2 renormalizes by hand precisely what the grid's `normalised` CTE would do automatically.

Consequences PK should weigh:

- **They do not conflict.** After Slice 2 applies, the intersection matches zero rows and is a **provable no-op on live data** — which is the safest possible condition under which to ship a change to a production function.
- **The durable fix alone would achieve the allocation outcome**, so Slice 2 is not strictly required for the *slots*.
- **Slice 2 is still worth applying, for a reason that is not about allocation:** it makes the **stored** data true. Leave it unapplied and `t.platform_format_mix_default` keeps asserting `linkedin / carousel = 40%` as current. That row is what the S2 dashboard planning surface would render, what an operator authoring a client override would copy, and what any future reader would treat as the intended mix — while production silently never honours it. That is ICE's declared-control-never-read failure mode running in reverse: a **declared intent that production deliberately ignores**.
- **Recommended sequencing: Slice 2 first, as already queued and reviewed, then this lane.** Slice 2 holds the only open window, its rollback is written and identity-pinned, and applying it first converts this lane's apply into a zero-delta change with a trivial proof. Landing the durable fix first would not be wrong, but it would ship a function change whose effect on live data is non-zero and would leave the stored mix untrue.

**This lane does not decide it.** Gate 1 is PK's.

---

## 7 · Design question 5 — client overrides

`c.client_format_mix_override` UNIONs into `candidate` **before** `candidate_share`. Because `platform_capable` is proposed downstream of `candidate_share`, override rows are filtered by the same expression with no additional code. An intersection placed *inside* the defaults arm of the UNION would be a half-fix; the recommended position is not.

Two facts that matter:

- The override arm contributes `NULL::numeric` share in the UNION and receives its real value through the correlated subquery in `candidate_share`. An override naming an invalid format therefore survives every current filter and lands in the grid at full weight.
- **Zero current override rows exist for any client** (verified, §1/C2). The exposure is entirely latent — which is precisely the profile of a defect that reappears the day someone uses the feature.

---

## 8 · The anti-trap requirement — which production path consumes this control

ICE's signature failure is a control that is declared and scored PASS while no production path reads it (`slot.format_chosen` is the standing example). The chain below was traced in live function bodies and worker source, not assumed:

```
cron jobid 72 'materialise-slots-nightly' (0 15 * * *, active)
  └─ m.materialise_slots(7)                       [SECURITY DEFINER]
       └─ IF m.format_mix_enrolled(client) THEN   ← property-pulse only, today
            m.build_weekly_demand_grid(client, week_monday)   ← ★ THE INTERSECTION LANDS HERE
              └─ jsonb_agg({key, share}) → m.allocate_week_formats(shares, n)
                   └─ v_assignment[v_ordinal] → v_chosen → v_format_pref
                        └─ INSERT INTO m.slot (…, format_preference, …)  ON CONFLICT DO NOTHING
                             └─ m.fill_pending_slots: v_chosen_format := COALESCE(slot.format_preference[1],'image_quote')
                                  └─ UPDATE m.slot SET format_chosen = v_chosen_format
                                  └─ job payload 'format_preference_explicit' → ai-worker
                                       └─ supabase/functions/ai-worker/index.ts:960
```

The control is consumed. **How that consumption is proven is §9 — the claim is not accepted on the strength of this diagram.**

---

## 9 · Proof design

**P0 — pre-apply counterfactual (read-only, runnable today).** Join the live grid output to `platform_support` for all four PP platforms; expect exactly the 6-of-15 table in §2. Feed valid-only shares through `m.allocate_week_formats(shares, 5)`; expect the three §6 assignments. Establishes the baseline the apply must move.

**P1 — post-apply, live data.** Re-run P0's first query. **PASS = zero grid rows with `supported = false`, on every platform, for every enrolled client.** Then re-derive the allocation from the *grid's own* output: **0 invalid of 5** per platform.

**P2 — allocation-equivalence, and ZERO-DELTA (REQUIRED, not advisory — PK, v2).** Post-apply grid+allocator output must equal the §6 table. **In addition, P2 must assert the change is zero-delta on live data: the grid's output and the resulting allocation are identical immediately before and immediately after the function replacement, for every enrolled client and every platform.** This is only achievable because PK sequenced Slice 2 (and the S8 slot repair, and downstream-consistency proof) ahead of this lane — by the time the function is replaced, there is no invalid row left for the intersection to remove, so a correct fix *must* change nothing. **A non-zero delta at P2 is a STOP**, not a pass-with-note: it means either the intersection removed something it should not have, or the preconditions this lane was sequenced behind did not actually hold. Capture the before-state in the same session as the apply — a delta measured against a stale baseline proves nothing.

**P3 — the durability proof (this is the one that distinguishes a real control from a declared one).** P1/P2 only prove the fix is correct for *today's* rows — which Slice 2 already made valid. They cannot prove tomorrow's rows are safe. The definitive test is transaction-scoped:

```sql
BEGIN;
  -- insert one is_current mix row for a format whose platform_support is false
  -- (and, separately, one c.client_format_mix_override row, same shape)
  SELECT … FROM m.build_weekly_demand_grid(<client>, <week>) …;   -- assert the row is ABSENT
ROLLBACK;
```

**This is DML and requires explicit PK authorization even though it is transaction-scoped and rolls back.** It is named here, not assumed. **Without P3, the control is proven only against data that was already clean — which is exactly the trap this lane was created to avoid.** If PK declines P3, the honest verdict is *fix applied, durability asserted but not demonstrated*, and it must be recorded that way.

**P4 — override coverage.** The override arm of P3, run separately. Without it, §7 is argued but untested.

**P5 — no collateral change.** YouTube's grid rows and shares (`33.33 / 27.78 / 22.22 / 16.67`) unchanged; the three non-enrolled clients unaffected (they never reach the grid); `m.slot` insert counts for the next nightly run consistent with prior runs.

---

## 10 · Tier, blast radius, gates, stop conditions, rollback

**Tier: T3.** Per `CLAUDE.md` §risk-tiered review chains, "production-touching / deploy / publish" is T3 and nothing is waived. This is a `CREATE OR REPLACE` of a live function that decides what content gets produced and published. It is not a dark/additive change and must not be de-escalated to T2 on the grounds that the diff is small.

**Blast radius.** Direct: `m.build_weekly_demand_grid`, one function, signature and return columns unchanged. Reachable: `m.materialise_slots` (nightly, all clients), `m.match_demand_to_canonicals`, `m.diagnose_match_pool_adequacy` — the two latter also call the grid and would see the narrowed candidate set; **their behaviour under a narrower grid has NOT been analysed in this lane and is an open question (§12), not a claim.** Effective today: `property-pulse` only (§1/C1). Not touched: transport, publishing, the Advisor chain, the dashboard, YouTube's mix, client overrides (none exist).

**Gates.**
1. **Gate 1 — PK approves this brief.** Not self-approved.
2. `db-rls-auditor` on the final function diff — **mandatory, not substitutable**: the DB is this lane's subject (CCF-02 R1).
3. External review (`ask_chatgpt_review`) pinned to the final diff hash; `reviewed_input_hash` recorded; any change voids it.
4. `branch-warden` → `safe` before commit.
5. **Gate 2 — PK apply gate.** Hard stop. PK runs or authorises the apply.
6. Post-apply P1/P2/P5 **before** the lane is called closed; P3/P4 per PK's ruling.

**Stop conditions (a trip voids the remainder; resumption needs a fresh PK gate).**
- Base ref moved and was not independently verified benign.
- Live `platform_support` no longer matches the FB 3 / IG 2 / LI 2 / YT 5 state PK ruled at v6.22.
- More than one `is_current=true` row exists for any (platform, format) — the H2 hazard; the grid's `max()` collapse makes the outcome arbitrary and the proof meaningless.
- Any non-clean auditor or external-review verdict.
- P1 returns any row with `supported = false`.
- P2 shows an allocation that differs from §6 in an unexplained way.
- The deployed function definition does not match the reviewed text (compare `md5(pg_get_functiondef(...))` against the reviewed artifact — the same discipline `deploy-verifier` applies to edge functions).
- Slice 2's window is still open and this lane would contend for it.

**Rollback.** `CREATE OR REPLACE FUNCTION m.build_weekly_demand_grid(...)` back to the current definition, pinned by `md5 = 2dff1dab88fb1f9e3f341ea6f9f843c7` (4330 bytes), text recoverable from the live catalog at apply time and from [supabase/migrations/20260628000000_format_mix_enforcement_phase1.sql:274](supabase/migrations/20260628000000_format_mix_enforcement_phase1.sql:274). Rollback must be **captured and validated before apply**, not reconstructed after. It is fast, in-transaction, and touches no data — but note it restores the defect, so a rollback is an incident, not a neutral undo.

**Migration discipline.** New migration number and a distinct name (migration name = permanent identity; a revision is never the same name with different SQL). `apply_migration` mints its own version stamp — the repo filename and the applied ledger version will diverge; decide rename-or-record before commit.

---

## 11 · Residual gaps this fix does NOT close (named, not fixed)

- **R1 — already-materialised future slots are never repaired. → REASSIGNED TO S8 (PK, v2). NOT THIS LANE'S TO REPAIR.** S8 runs it as a contained repair lane — read-only investigation and packet authoring, **no mutation before Slice 2 is applied and proven** — and is instructed to pin the affected rows independently rather than inherit the description below. The rows named here are this lane's *observation at author time*, not a handoff payload; S8 must re-derive them. Route any S8 question through the control tower, not directly. `m.materialise_slots` inserts `ON CONFLICT DO NOTHING` and runs 7 days forward. Slots already written keep their stale `format_preference`. **This is live right now, not hypothetical: 3 future Property Pulse slots currently carry unpublishable formats** — instagram `video_short_kinetic` (2026-07-30) and linkedin `carousel` ×2 (2026-07-27, 2026-07-28). Neither Slice 2 nor this fix touches them. Repairing them is a separate data lane with its own gate.
- **R2 — the `v_preferred_fmt` fallback in `m.materialise_slots` is not platform-validated** (§5). Benign today by coincidence.
- **R3 — H2: no partial-unique on `is_current`.** Two current rows for one (platform, format) remain possible; the grid resolves by `max()`, i.e. arbitrarily. Slice 2 handles this with a post-apply assertion; nothing prevents recurrence structurally.
- **R4 — no alerting.** §4 layer 2 makes conflicts *observable*; nothing watches the view.

---

## 12 · Open questions for PK

1. ~~**Does Slice 2 still apply?**~~ — **CLOSED by PK 2026-07-24. Slice 2 applies FIRST**, on §6's reasoning (stored mix must represent governed intent; a misleading operator surface would let invalid intent propagate into future overrides). This lane is sequenced third, behind S8's slot repair and a downstream-consistency proof. **Do not re-raise.**
2. **Is P3 (transaction-scoped DML durability proof) authorised?** Without it the control is asserted, not demonstrated (§9).
3. **Does the `m.materialise_slots` drop-counter (§4 layer 3) ride in this lane or wait?** It expands the change to a second production function.
4. **Q4 (`animated_text_reveal` / `animated_data`, supported on zero platforms) — surfaced, NOT decided here.** An intersection removes them from every platform, not just FB/IG, and therefore from the pipeline entirely. This is the same open Q4 the Slice 2 packet §8 flagged; PK's v6.22 ruling settled the *valid-format counts*, not the fate of the zero-platform formats. If PK's intent is to onboard them, this fix does not block that — but it makes their current unusability explicit rather than latent.
5. **The two other grid callers** (`m.match_demand_to_canonicals`, `m.diagnose_match_pool_adequacy`) under a narrowed candidate set — analysed in neither this lane nor Slice 2. Should that analysis be a precondition of Gate 2?

**Not a dependency:** this design does **not** require the Advisor chain (Slice 1 / `ai-worker` `:404→:427→:472`, PARKED by PK inside cc-0078). The intersection sits entirely upstream of format authority, in the grid that produces the slot's `format_preference`. The Advisor's authority is untouched and unexamined here. No STOP is raised on that ground.

---

## Scope

**In scope:** design of the `platform_support` intersection for the demand-grid read path; disposition of invalid entries; renormalization semantics; interaction with Slice 2; override coverage; tier/gates/stop conditions/rollback/proof.

**Out of scope:** cc-0079 Slice 2's data apply (S1 executes, S5 re-cuts) · Slice 1 / the `ai-worker` format chain (PARKED by PK inside cc-0078 — **not un-parked, not absorbed**) · the Advisor's authority (arch brief R3) · the dashboard surface (S2/S6) · avatar and video work · repair of already-materialised slots (R1) · alerting (R4).

## Allowed actions

- Read-only investigation of DB catalog, function bodies, live grid/allocator output, and repo source.
- Authoring this brief and returning it for PK's Gate 1.

## Forbidden actions

- No code written. No migration authored for apply. No DML. No deploy.
- **No implementation of the durable correction while the cc-0079 Slice 2 production window is active** (PK ruling, header). Design authority does not extend to writing the function, and a halted-but-uncut S1 window still counts as active.
- No `cc-` ID self-allocation. No register version claimed.
- No self-approval — Gate 1 is PK's.
- No production-mutation window opened; Slice 2 holds the only one.
- No commit, no push. The git index is not a handoff channel.
- No un-parking of Slice 1 / cc-0078; no expansion into unrelated dashboard, safety, cleanup, or registry work (PK blocker rule).

## Success criteria

- Every one of the six seed questions answered with an argued recommendation, not an assertion.
- Every inherited ground-truth claim independently re-verified, with corrections named (§1/C1–C4).
- The consuming production path traced in live source, and the proof that would demonstrate consumption specified — including the one proof (P3) that would distinguish a real control from a declared one.
- Unknowns surfaced as open questions (§12), not resolved by assumption.

## Stop condition

Brief frozen and returned to the control tower with path + sha256. **No apply, no commit, no push.** Next action is PK's Gate 1.

---

## Notes

**Non-claims.** Nothing was applied; no DML was run; no function was replaced. The intersection SQL in §3 is illustrative design text, not a migration. §6's allocation table was computed by calling the live read-only `m.allocate_week_formats` with hand-supplied valid-only shares — it is a faithful counterfactual, not an observation of production output. Live counts and identities are as of 2026-07-24 and must be re-verified at apply. `m.match_demand_to_canonicals` and `m.diagnose_match_pool_adequacy` were identified as grid callers but their behaviour under a narrowed grid was **not** analysed. The claim that the control is consumed by production (§8) is argued from traced source and is **not** yet demonstrated by a passing proof — P1/P3 are what would demonstrate it.
