# Result — v6.24: twelve frozen artifacts recorded · Slice 2 v4 reviewed clean · lane-count freeze · revised post-Slice-2 order

**Status:** `TWELVE ARTIFACTS RECORDED · ALL READ IN FULL · ALL HASHES VERIFIED · ZERO PRODUCTION MUTATION`
**Lane classification (CCF-02):** SAFETY_GATE · **T1** (docs/registers) · **Register pointer:** **v6.24**
**Date:** 2026-07-24 Sydney · **Executor:** Control Tower v2 (registrar)
**Predecessor:** v6.23 (`565540d`) · **Base:** `4dbe3c2` (benign automated runtime commit, ground-truthed)

> **This pass applied nothing to production.** No DML, deploy, migration, promotion or flag change.
> It records twelve authored-only artifacts and one external review. Recording a file is not approving it.

---

## 0. Stale-ref gate + base movement — PASS

`git fetch --prune`. Origin had advanced one commit while the board was idle: **`4dbe3c2`**
(`chore(runtime): record no-eligible-ready-briefs run (owner-gate skip)`, pk@invegent.com, one
append-only file `docs/runtime/runs/no-ready-briefs-2026-07-24T160214Z.md`). **Ground-truthed as benign
and unrelated per standing rule 5.1** — an automated ICE scheduled-runner record touching no lane's
content — then fast-forwarded (parity 0/0). Registers unchanged (still v6.23); all twelve lane-artifact
hashes intact across the movement.

## 1. Twelve artifacts — read IN FULL, hashes verified

Every hash recomputed by the registrar and matched. Every prose packet read in full before commit; the
SQL artifact was reviewed through its governing wrapper packet's control-by-control proof (§7) plus hash
verification.

| # | Artifact | sha256 (12) | bytes | Lane |
|---|---|---|---|---|
| 1 | `cc-0079-slice-2-apply-packet-v4.md` | `1579115675c5` | 53405 | S5 — **authoritative** Slice 2 re-cut |
| 2 | `cc-0079-slice-2-apply-packet-v3.md` | `a91143311b72` | 55343 | S5 — **WITHDRAWN** (banner-marked historical) |
| 3 | `materialised-invalid-slot-repair-packet-v1.md` | `834d4f7cfcb9` | 48846 | S8 |
| 4 | `cc-0063-step-b-gate1-brief-v1.md` | `f83b0913cdbb` | 35850 | S4 |
| 5 | `durable-platform-support-intersection-demand-grid-gate1-v2.md` | `51918f9da9f2` | 35829 | S7 |
| 6 | `creatomate-governed-video-production-gate1-packet-v1.md` | `a601523d304b` | 30749 | S3 |
| 7 | `dashboard-schedule-platform-format-planning-surface-gate1-v1.md` | `72681d72956c` | 24877 | S2 (scoping) |
| 8 | `artifacts/slice-a-get-week-format-allocation.sql` | `272f308f66a3` | 20456 | S6 (wrapper SQL) |
| 9 | `s9-cta-text-bounded-copy-dead-draft-diagnosis-packet-v1.md` | `29f6441275b4` | 19064 | S9 |
| 10 | `schedule-day-of-week-contract-repair-packet-v1.md` | `1c2230d038fd` | 18837 | S2 (Sunday) |
| 11 | `slice-a-dashboard-packet-v1.md` | `7701498728d9` | 12969 | S6 (dashboard packet) |
| 12 | `slice-a-db-wrapper-packet-v1.md` | `1c3adbf0588b` | 12960 | S6 (wrapper packet) |

## 2. 🔴 THIRTEENTH artifact discovered — the dashboard diff, NOT recorded this pass

Artifact 11 (S6's dashboard packet) pins a **thirteenth** file as its subject:
**`docs/briefs/artifacts/slice-a-dashboard-panel.diff`, sha256 `17363dd31789a3e6`, 44288 B** — verified
present on disk, hash matches its pin. **It was NOT in PK's authorized set of twelve** (the registrar's
earlier inventory `find` filter excluded `.diff` files). Per the standing rule that a finding is
surfaced, not silently folded in, **it is deliberately NOT committed at v6.24.** It carries to v6.25 or
an amendment on PK's word. No urgency: the dashboard lane does not reach its deploy gate until after
Slice 2, the wrapper, and the wrapper's §P1 — so a one-pass deferral costs nothing. **Named, not lost.**

## 3. Slice 2 — v4 is the sole authoritative packet; v3 withdrawn; review CLEAN

**v4 (`1579115675c5…`, 53405 B) is the only apply packet.** It closes the three halt defects as
executable code: M-1 (assertions are `DO … RAISE EXCEPTION`, not comments), M-2 (`G-ATOMIC` xid-anchor —
fragmented execution autocommits, mints a new xid, and aborts before mutating; plus `A3c` detects the
zero-current-rows catastrophe directly), M-3 (in-transaction full-table snapshot, YouTube included).

**v3 (`a91143311b72…`, 55343 B) is WITHDRAWN and recorded as banner-marked historical evidence only.**
Its own header carries `⛔ WITHDRAWN — DO NOT APPLY, DO NOT REVIEW`, records it exceeded PK's three-repair
authorization (it added S-1/S-4/S-5/O-4 and two unauthorized assertions A7/A8), and states it was never
reviewed. **The registrar confirmed the banner meets all five of PK's conditions** (non-executable ·
excluded from indexes · excluded from apply instructions · superseded-by-v4 recorded · cannot be
mistaken for an approved packet) and committed it **unedited** — editing would have changed its hash.
**S5 withdrew v3 itself, before any reviewer flagged it.**

**Fresh external review — CLEAN, first pass.** `review_id` **`600ac75e-d4fa-46a9-b937-5d1e55dfbc3c`** ·
verdict `agree` · `proceed` · `escalate: false` · `requires_pk_escalation: false` · zero pushback ·
**pinned to `1579115675c5…`**. The stale v2 review (`f46949d3…`, pinned to `73dd7413…`) is void and must
not be cited. No triage class applies (clean verdict). The reviewer's one "unverified claim" (A3 cannot
detect zero-current-rows) was registrar-verified TRUE by construction — which is exactly why A3b/A3c exist.

**⚠ v4 §9 — a NEW PK decision the halt did not carry.** The `superseded_by` self-FK is
**`ON DELETE NO ACTION`**. If PK elects S-2 (populate lineage), the rollback's R1 DELETE would fail with
an FK violation — so electing lineage **requires a v5 re-cut** (new hash → new review → new auditor run).
Ship-as-written (no lineage) keeps the rollback exactly as specified. **On the decision sheet.**

## 4. S8 — zero downstream dependencies, and a HARD DEADLINE

**Three future Property Pulse slots**, pinned live by identity: `4d81ae7c…` LinkedIn `carousel`
2026-07-27 · `cdb9cc97…` LinkedIn `carousel` 2026-07-28 · `a8c70f51…` Instagram `video_short_kinetic`
2026-07-30. Neither Slice 2 nor S7's durable fix repairs them (they are downstream of both).

**Zero downstream dependencies — the safe case.** All three are empty, unfilled `status='future'` rows:
`filled_draft_id`/`intent_id`/`format_chosen`/`filled_at` all NULL, and **0 rows across all five
inbound-FK tables** (`post_draft`, `ai_job`, `slot_fill_attempt`, `slot_alerts`,
`ice_publication_evidence`). The repair orphans nothing. `A-DEP` re-asserts every check at apply time
and aborts if any changed. The packet's `P-PRECOND` **machine-enforces PK's ordering** — it aborts
unless Slice 2 is already applied (every current mix row publishable · FB 3/IG 2/LI 2/YT 5).

**🔴 HARD DEADLINE — PK must see this.** `m.slot` has no `platform_support` gate anywhere in the fill
path (the 12 historical LinkedIn-carousel skips were `bundle_diversity_insufficient`, coincidental, not
protective). Slot `4d81ae7c…`'s fill window effectively opens **2026-07-26 01:50 UTC** (promoter fires 10
min early). **If Slice 2's apply and this repair both slip past that, the slot self-fills `carousel` on
LinkedIn — a format LinkedIn cannot publish — silently.** S8 took no action; it is PK's sequencing fact.
Three levers, all PK's: (a) apply Slice 2 + repair inside the window [what the packet implements];
(b) authorise the repair BEFORE Slice 2 — needs a v2 packet re-derived against pre-Slice-2 policy, not a
waiver; (c) accept one mis-formatted fill and repair after.

**S8 also found ~50 PAST slots with unpublishable formats — correctly OUT of scope** (already published/
filled/skipped/failed; repairing history is a rewrite, not a repair). Named, not actioned.

## 5. S9 — the `cta_text` premise is FALSIFIED; latent, not live

**There is not now and has never been a production dead draft from `cta_text` overflow.** The single gate
trip in all history was cc-0038's own deliberate synthetic proof (draft `1f5633de…`, padded to 133 chars,
rolled back to 61, now `published`). Forward exposure zero: max observed `cta_text` is 66 vs the 90 bound;
0 drafts over any of the four bounds. **It is a latent structural defect and a pre-enablement precondition
for broad video, NOT a live incident and NOT a current blocker.** Exposure today = 1 client × 1 format
(property-pulse × `video_short_stat`); everything else runs the ungated legacy path.

**S9 recommends Option B — bounded regeneration before persistence** (re-prompt with the explicit bound,
N=2, falling through to visible rejection), exporting the four constants from `b1_video_stat.ts` so there
is one source of truth and one measurement (`String.length`). Option C (governed shortening) is **not
available** — `cta_text`'s declared policy is `hard_gate_throw`; the only `truncate_optional` policy in
the contract is on a different field. Silent truncation off the table, per PK. **Two adjacent findings
named-not-bundled:** (1) 36 failed video drafts carry `dead_reason IS NULL` (observability gap, its own
Gate 1); (2) `ai-worker:1173` `set_draft_video_script` error-discard (its own Gate 1). Neither displaces
the program. **S9 is PARKED** — retain Option B; do not move ahead of active priorities.

## 6. S6 — two artifacts, two gates, wrapper satisfies all thirteen controls

Split exactly as PK required: **artifact 1 = DB wrapper** `public.get_week_format_allocation` (T2,
additive, read-only), **artifact 2 = dashboard code** — separate hashes, reviews, gates, rollbacks.
**Order fixed: wrapper first**; the dashboard renders a red failure block without it. All thirteen
PK-mandated wrapper controls addressed, most proven live pre-apply (controls 9/10/11 correctly deferred
to post-apply, script supplied). The wrapper proved `service_role` **cannot** call the allocator by
`SET ROLE` probe (42501 on schema `t` / on the function), and rejected routing through `exec_sql` on
posture. **Live finding, vindicating PK's fail-visible requirement:** property-pulse is the ONLY
format-mix-enrolled client — the other three hit `not_enrolled_legacy_fallback` and would have rendered
an empty panel indistinguishable from healthy without the explicit `allocation_status`. Dashboard code:
`tsc`/`next build` exit 0, 222/222 tests (32 new), isolated worktree, no `ScheduleTab`/`cc-0054` target
touched. **S6 recommends letting Slice 2 proceed on its own merits — the BEFORE oracle is already
captured, so the live 6→0 demo is nice-to-have, not a reason to sequence Slice 2 behind four gates.**

## 7. S7 v2 — supersedes v1, records the ruling, hardens the proof

v2 (`51918f9da9f2…`) supersedes v1 (`c6292b5f…`, on disk unmodified) with **no design change** — it
records: PK's §6 ruling (Slice 2 applies first) **closes its open question 1**; the lane is **sequenced
THIRD**; proof **P2 is hardened from advisory to REQUIRED zero-delta**; and residual **R1 reassigned to
S8**. The allocation-equivalence finding stands: the read-time intersection produces **identical slot
assignments** to Slice 2 (0 invalid of 5 every platform), so after Slice 2 applies the intersection is a
**provable no-op on live data** — the safest state to ship it. Slice 2 is still worth applying because it
makes the *stored* data true. v2 adds: only PP is enrolled (blast radius one client, mostly future
protection); the empty-platform fallback `v_preferred_fmt` is **not platform-validated** (benign by
coincidence, R2). Recommended intersection site: one CTE in `m.build_weekly_demand_grid`, drop + a
read-only `ice_ro` diagnostic view for observability (never fail-closed-RAISE inside the nightly cron).

## 8. S4 — Q1 absorbed, rank 1 reserved by evidence, Route A proof

Records PK's precedence ruling and states the **intentional divergence** from the shadow resolver
verbatim (shadow superseded on ordering — a carry, not an edit). **Rank 1 ("explicit governed
assignment") resolved by evidence: no such mechanism exists** — recorded as a RESERVED, currently-
inapplicable position; no field manufactured. Stage-2 proof is **Route A** (constructed-set replay,
hermetic + read-only live-engine SQL, **zero production mutation**); Route C (real rows) explicitly not
recommended — it is materially the step-C condition, which is CLOSED. Reason-code vocabulary pinned so
Candidate B's win reads `default_host` (the shadow `shadow_rule` derivation must NOT be reused). **Does
not claim Step B closes C-2.** Six live questions (Q2–Q7) with recommendations. `:92` bounded to one site.

## 9. Lane-count freeze (PK) + revised post-Slice-2 order

**Board frozen at nine sessions.** No tenth lane before Slice 2 is applied and proven; any new finding is
**carried work** unless it is an immediate blocker to one of the five named priorities (Slice 2 apply ·
the three invalid-slot repairs · schedule-planning surface · governed Creatomate video · AGP).

**Immediate order (PK):** (1) Slice 2 apply + proof → (2) repair the three materialised slots (S8) →
(3) prove downstream consistency → (4) return to declared priorities: **dashboard schedule planning**
(S6 wrapper under its T2 DB gate, then Slice A under its dashboard gate, then the format↔writable-row
join slice; Sunday repair stays in this program under its own gate) → **Creatomate video** (S3, after the
dashboard's next controlled gate; first proof = governed smoke render, no publication, no broad
enablement; `cta_text` bounded-regeneration required before broad enablement but not blocking packet
prep or the initial smoke) → **AGP multi-character** (S4, approved precedence, two-candidate Stage-2, no
C-2 claim). **S7's durable intersection is NOT auto-ahead** of dashboard/video/AGP — scheduled as later
platform-format hardening unless shown required for Slice A correctness.

## 10. Post-Slice-2 proof requirements (PK, for S1)

After apply: the 0-of-15 result · **FB/IG/LI remain PRESENT in the demand grid** · YouTube unchanged ·
**all executable assertions actually RAN** · rollback remains available and exact. S1 hashes v4 from the
git ref (now committed at v6.24) and confirms it is exactly `1579115675c5…`; **byte-identical to the
reviewed artifact ⇒ no re-review needed** merely because it is now committed; any byte differing ⇒ STOP
for a fresh exact-hash review.

## 11. Remaining PK-owned items

- **🔴 Published `2f89e33f…` Facebook item** — parked, PK-owned, does not block the program. ICE cannot
  observe or remove it.
- **Slice 2 §9 `superseded_by` lineage** — ship-as-written (Option A) vs elect S-2 (needs v5). Decision sheet.
- **The thirteenth artifact** (dashboard diff `17363dd3…`) — authorize for v6.25 or amendment.
- **The consolidated decision sheet** — the remaining lane questions (S4 Q2–Q7 · S6 · S2 Sunday ·
  S3 · S7), ordered by PK's five criteria; several already closed by prior rulings. Prepared next.
- **S8 hard deadline** `2026-07-26 01:50 UTC` for slot `4d81ae7c…` — the sequencing lever choice.

## 12. What this lane changed

**Committed:** this result + the twelve artifacts (read in full, hashes verified) + both registers.
**NOT committed:** the thirteenth dashboard diff (§2) · S7 v1 (superseded, on disk) · everything else
untracked. **No prior register entry amended; no history rewritten.** **Production mutations: 0.**
`branch-warden` ran before commit with parity re-verified immediately beforehand.

## 13. Next gate

> **Slice 2:** S1 hashes v4 from the committed ref → gate chain → **PK apply gate ⑦**. No mutation before it.
> **Then** S8's three-slot repair (own review + auditor + PK gate + window), beating the 2026-07-26 deadline.
> **S6 wrapper** → T2 DB gate; **Slice A** → dashboard gate; both need their own reviews.
> **S4 / S3 / S7 / S2-Sunday:** each awaits its own gate in the §9 order.
> **🔴 `2f89e33f…` remains a separate PK action.**
