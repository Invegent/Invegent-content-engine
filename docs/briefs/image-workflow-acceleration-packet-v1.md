# Image Workflow Acceleration Packet v1 (RATIFIED)

**Author:** orchestrator · **Date:** 2026-07-06 · **Status:** ✅ RATIFIED rev-2 — PK ratified all six (P1–P6) on 2026-07-06 over an explicit `policy_decision` escalation (no concrete defect on the table). In force from v5.23.
**Ratification record:** rev-1 external review `2866370a-8258-456e-9e35-6f1ecb063fe0` (partial/escalate) raised one actionable item — "define shape" — which rev-2 fixed (mechanical 10-check structural-diff gate); rev-2 external review `634bbb74-1c8e-4d80-845e-c509d3e2ab07` (partial/escalate, hash `dd3c3156…`) **verified the P2 tightening landed and found no concrete defect**, escalating only the irreducible production-policy judgment to PK (`requires_pk_escalation`, "requires human judgment"). Per the triage contract, `policy_decision → PK decision gate`; PK decided: ratify all six. §2 non-negotiables intact.
**Rev-2 change:** P2's "same shape" tightened from prose to a mechanical structural-diff gate (10 mandatory checks, any-diff→new-shape, when-in-doubt→new-shape); per-apply byte-verify + pool-neutrality assertion run on every intake regardless of shape. P1/P3/P4/P5/P6 unchanged.
**Class:** orchestration-contract amendment (governs the cc-0027 image sourcing→intake→promotion lanes)
**Composes with:** Workflow Acceleration Conventions 1–3 · CCF-02 orchestration contract · the cc-0027 two-stage image workflow · Option D (resolver pool is production-live).

---

## 1. Problem statement (evidence-grounded)

The harvesting *mining* is fast (minutes). The slowness is the **per-asset governance ceremony**, run at maximum strength at every step, one asset at a time, twice. Evidence from the market-data lane and its siblings:

- **Solo is ~8× the per-asset cost of batch.** Market-data crossed the entire apparatus alone — re-source loop → full intake ceremony (v5.17) → full promotion ceremony (v5.20). The v5.12 batch moved **8 images through one intake gate**. Same safety, a fraction of the per-asset ceremony.
- **The full adversarial chain runs even where it is near-valueless.** `db-rls-auditor` took **~28 min** on the market-data intake and **~9 min** on the promotion, both returning zero-must-fix. External review **misread fenced INSERT-only intakes as "irreversible deletions" three times** (v5.12 `fe9d7372`, v5.14 `511ae9a8`, and only cleared on v5.17 after explicit framing). On a double-fenced insert that *cannot* reach production, that chain is mostly ceremony — its real value is on the T3 production-rotation step.
- **Intake and promotion are two separate full gates, and the register is touched twice.** One nugget = up to **4 PK round-trips** (visual verdict · intake hash gate · promotion T3 gate · register) and **2 commit/push lanes**. PK round-trips are wall-clock measured in the gaps *between sessions* — this is where "days" accumulate.
- **Re-source loops are the hidden tax.** Market-data's first pick died on legible "Morris Charts" text at the crop-proof, forcing an entire re-source run. Most picks that die, die here (legible text/signage).

**One-line diagnosis:** the harvester finds gold in minutes; the slowness is that every nugget is assayed, vaulted, and logged *individually, twice, at maximum strength* — instead of by the pan-load.

---

## 2. Non-negotiables (UNCHANGED — this packet does not touch these)

1. **PK visual verdict is the only deciding act** on brand/suitability. No agent approves an image.
2. **Text-safety crop proof** (1:1 centre-crop, 1080, scrim per spec) before any accept — the authoritative legibility test.
3. **Licence safety** — allow-listed sources only, sha256-from-bytes provenance, honest `not_harvestable_licence_safe` returns.
4. **Pool-neutrality machine-assertion** on every intake — in-transaction, fail-closed → ROLLBACK. This is the real production guard (a fenced `is_active=false` row is rejected at `resolve_slot_assets`' first filter).
5. **Every T3 production-rotation change keeps the full chain**: `db-rls-auditor` + external review (hash-pinned) + **PK gate** + named live pre-check STOPs + **rollback proven before apply** + post-apply live proof (pool + witnessed selection).
6. **Fenced-until-approved default** (`is_active=false`, `approved=false`, `production_use_allowed=false`, `intake_candidate`).
7. **CAS-guarded, fail-closed transactions**; commit/push only on PK instruction; shared-worktree HEAD re-verify before commit.

The goal is to shrink *ceremony*, never these guards.

---

## 3. Proposed changes (numbered, ratify item-by-item)

### P1 — Batch-first is the default unit of work
The default sourcing unit is a **theme-set manifest** (N candidates across related rows), not a single asset. One harvest → one `image-reviewer` pass → one orchestrator crop-proof pass → **one PK visual gate** for the whole set. Solo sourcing runs only by explicit PK exception (e.g. a one-off re-source like market-data). *Evidence: v5.12 (8-in-one) vs market-data (1-in-one, twice).*

### P2 — Tier-right-sized intake review (the biggest single time saving)
A **fenced INSERT-only** intake (all four fences set, no DDL/GRANT, following the proven template) is structurally incapable of touching production. Therefore:
- **Keeps (per apply, non-negotiable):** orchestrator byte-verify + upload public-URL sha256 verify + **pool-neutrality in-txn assertion** + `branch-warden`.
- **Full chain runs ONCE per shape, not per asset:** `db-rls-auditor` + external review run on the **first** intake of a new *shape*. Subsequent inserts that pass the mechanical same-shape gate below ride on that verification.
- **"Same shape" is a MECHANICAL structural-diff gate, not a judgement call.** Before any insert may ride on a prior shape's verification, the orchestrator diffs it against the proven template and confirms **ALL** of the following; **any diff on any item → new shape → full chain**:
  1. **same target table**;
  2. **same `asset_type`**;
  3. **identical written-column set** (exact column list, no additions/removals);
  4. **all four fences present and false**: `is_active`, `asset_meta.approved`, `asset_meta.production_use_allowed`, `asset_meta.approval_status` (= `intake_candidate`);
  5. **`asset_meta` carries the same eligibility-relevant key set**: `usage`, `bucket`, `license`/`license_type`, `safe_for_text_overlay`, `sha256`, `asset_key`;
  6. **no new eligibility-touching `asset_meta` keys** beyond that set;
  7. **`bucket` must be `brand-assets`**;
  8. **no DDL**;
  9. **no GRANT/REVOKE**;
  10. **no ON CONFLICT / upsert**.
  - **When in doubt, classify as a new shape and run the full chain.**
- **Per-apply guards run on EVERY intake regardless of shape (never waived):** orchestrator byte-verify + upload public-URL sha256 verify + the **in-transaction, fail-closed pool-neutrality machine-assertion** (RAISE EXCEPTION → full ROLLBACK) + `branch-warden`. So even a row that wrongly rode a prior shape cannot change the pool — it fails closed.
- **Why this is safe:** the auditor's value on a proven-pattern fenced insert is schema-shape conformance (it once caught the `asset_type` CHECK in v4.87) — a *shape* property verified once per shape by a mechanical diff, not per row by judgement; and the machine pool-neutrality assertion is the belt-and-suspenders that runs on every apply. It returned zero-must-fix on every conforming market-data/batch insert since. External review's fenced-insert misreads confirm low marginal value there.
- **Escalation stays free:** any diff, any doubt, any non-fenced field → full chain.

### P3 — PK may fast-path certain assets at the visual gate (collapse intake+promotion)
At the **visual gate**, PK may mark an accepted asset **"→ promote directly"**. That asset skips the fenced-candidate dwell and runs **one T3 lane**: upload → governed INSERT (`approved=true`) → full T3 chain → PK gate → apply → live proof. Assets PK wants to park stay fenced (intake only), unchanged.
- **Preserved:** it is still a single T3 gate with the full chain, live proof, rollback-proven, and PK's explicit production-change acknowledgement. "Combining" only removes the *dwell* between two ceremonies for assets PK already knows they want live.
- **Default stays conservative:** fenced-first remains the default for anything uncertain; fast-path is an explicit per-asset PK choice, never automatic. (This is a deliberate relaxation of the current "never combine intake and promotion" rule, scoped to PK's explicit per-asset election.)

### P4 — One register touch per terminal state
A batch's terminal state is recorded in **one** register pointer (Convention 1), not one per asset per sub-step. A batch of intakes = one pointer; a batch of promotions = one pointer. *Evidence: market-data touched registers twice (v5.17, v5.20) for a single asset.*

### P5 — Harder discovery-time text/signage reject (cut re-source loops)
`image-harvester` rejects candidates with legible text/signage at **discovery**, before they reach the crop-proof, reducing HOLD→re-source loops. Calibration only (no new capability); the crop-proof remains the authoritative gate. *Evidence: market-data's whole re-source run was caused by legible text surviving to the crop-proof.*

### P6 — Run independent review stages concurrently
On any lane, `db-rls-auditor`, external review, and `branch-warden` that do not depend on each other are launched **concurrently**, not serially. Minor but free wall-clock.

---

## 4. Worked example — market-data, then vs. under v1

| Step | As it actually ran | Under v1 (if part of a themed batch, PK fast-pathed) |
|---|---|---|
| Sourcing | solo re-source run (text-fail loop) | in a themed data/abstract batch; harder text-reject (P5) avoids the loop |
| Reviews | full db-rls (28m) + external on intake, **again** full on promotion | full chain once for the shape (P2), then full T3 chain once at promotion (P3) |
| DB gates | intake gate **+** promotion gate (2 PK round-trips, 2 sessions) | **one** T3 gate (P3) |
| Register | v5.17 **+** v5.20 (two T1 lanes) | one pointer for the batch's terminal state (P4) |
| PK round-trips | 4 | 2 (visual gate + one T3 gate) |

Same safety properties (§2). Roughly half the round-trips and one full review chain removed, per asset — more as batch size grows.

---

## 5. How it composes with existing tiers/conventions

- **Convention 1 (recording compression):** P4 is a direct application.
- **Convention 2 (conditional sequence approval):** a fast-pathed asset (P3) is a natural Convention-2 sequence — PK pins the hash, names upload→apply→verify, states STOPs.
- **Convention 3 (risk-tiered chains):** P2 is the T2 tier doing what it already permits (scope-relevant auditors, not maximal); P3/§2.5 keep T3 at full strength. DML/DDL ≥ T2, production-touching → T3 — unchanged.
- **CCF-02 findings contract & claim protocol:** unchanged.

---

## 6. What PK ratifies

Accept/reject each independently (P1–P6). Recommended: **P1, P2, P4, P5, P6** are low-risk ceremony-trimming with all §2 guards intact; **P3** is the one genuine policy relaxation (fenced-first default gives way to a PK-elected fast-path) and deserves the closest look.

**Next gates:** (1) PK marks accept/reject per item; (2) on the ratified set, orchestrator runs `ask_chatgpt_review` hash-pinned to the final packet; (3) PK ratification → CLAUDE.md / cc-0027 workflow text amended → register pointer. No workflow changes until then.
