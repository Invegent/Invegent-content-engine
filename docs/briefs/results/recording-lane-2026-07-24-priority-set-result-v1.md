# Result — Recording Lane pass 4, 2026-07-24: cc-0063 + SQL, cc-0073 scrim set, cc-0053 deployment correction

**Status:** `RECORDING COMPLETE · ZERO PRODUCTION MUTATION · TWO APPLY GATES RECORDED (NEITHER APPLIED) · ONE DEPLOYMENT CORRECTION`
**Lane classification (CCF-02):** SAFETY_GATE · **T1** (docs/registers/artifacts only — no apply, no DB, no deploy)
**Date:** 2026-07-24 Sydney
**Executor:** Claude Code — session **S4 (Recording Lane)**, reopened as the serialized recorder
**Register pointer:** **v6.17**, in `docs/00_sync_state.md` and `docs/00_action_list.md`
**Predecessors:** `recording-lane-2026-07-24-gate1-round-result-v1.md` (v6.14/v6.15) · `recording-lane-2026-07-24-superseding-evidence-result-v1.md` (v6.16)

> **Recording, not applying.** Two of the three items are apply gates for production-touching changes
> (a DB migration and a data UPDATE). **Committing them records the frozen artifacts and their review
> chains; it runs neither.** Each apply is a separate PK-gated act owned by its originating session.

---

## 0. Stale-ref gate — PASS

`git fetch --prune origin`, then compared local base to the fetched upstream:

| | Value |
|---|---|
| Fetched `origin/main` | `ce3e4b8cfd65951e1719e936aa5b12d77b6573d4` |
| Local `HEAD` | `ce3e4b8…` — identical |
| Parity | 0 ahead / 0 behind |

Base is at the fetched upstream. Not stale, no divergence.

## 1. Independent hash verification — EVERY artifact, recomputed here

Per the shared-checkout protocol, every manifest hash was **recomputed by this session** (`sha256sum`),
not trusted from the manifest's stated value. **All matched.**

### Item 1 — cc-0063 (must land atomically: packet + both SQL + review record)

| Path | Manifest sha256 | Recomputed | bytes |
|---|---|---|---|
| `docs/briefs/cc-0063-brand-host-designation-gate1-packet-m2-v1.md` | `adf6276e…` | ✅ match | 33647 |
| `supabase/migrations/20260724120000_cc0063_brand_host_designation_v1.sql` | `6321c50f…` | ✅ match | 6107 |
| `supabase/migrations/20260724120100_cc0063_brand_host_designation_rollback_v1.sql` | `6f60194d…` | ✅ match | 2852 |
| `docs/briefs/cc-0063-review-record-v1.md` (mutable companion) | — | hashed at staging | 16624 |

### Item 2 — cc-0073 scrim set (verified against `_harness/cc0073_packA_contactsheet/FREEZE.sha256`)

All 9 freeze-list entries recomputed ✅ match. One (`cc-0073-decision-packs-a-b-c.md`, `87f3339b…`) is
**already committed at HEAD, byte-identical**, so it is excluded from this commit. The remaining **8**
are committed here:

| Path | sha256 | in HEAD? |
|---|---|---|
| `docs/briefs/cc-0073-backgrounds-only-asset-gap-drain.md` | `e14e6dd1…` | new |
| `docs/briefs/cc-0073-scrim-remediation-gate1-packet.md` | `c1f31a86…` | new |
| `docs/briefs/cc-0073-scrim-remediation-apply-packet-v1.md` | `fc8e7a13…` (evidence-packet pin) | new |
| `docs/briefs/cc-0073-scrim-apply-gate-final-v1.md` | `12e99624…` (apply-gate pin) | new |
| `_harness/cc0073_packA_contactsheet/contact_sheet_raw.jpg` | `dbe51d09…` | new |
| `_harness/cc0073_packA_contactsheet/contact_sheet_as_rendered.jpg` | `2defab2a…` | new |
| `_harness/cc0073_packA_contactsheet/contact_sheet_proposed_scrim62.jpg` | `378af2b6…` | new |
| `_harness/cc0073_packA_contactsheet/integrity_report.json` | `4ecc203e…` | new |

**⚠ One file beyond the enumerated freeze list is included, as a stated judgment call, not silently:**
`_harness/cc0073_packA_contactsheet/FREEZE.sha256` itself. It is the integrity manifest for the four
binary evidence files above; committing the binaries without their in-repo hash anchor would reproduce
the exact "pins hashes to files nobody can independently check" problem that makes item 1 atomic. A
manifest cannot list its own hash, so it is not in the freeze list by construction. **If the intent
was to exclude it, it is a one-path `git rm --cached` follow-up.**

**Why the 4 `_harness` binaries are in a docs-recording lane:** the evidence packet (`fc8e7a13…`) pins
their sha256 hashes; by the same atomicity rule as item 1's SQL, a packet and the evidence it pins must
travel together. I viewed all four before committing — three contact sheets (raw 1:1 crops · the 40%
"as rendered" defect · the 62% remediation) and the integrity report. **All backgrounds are
person-free**; the integrity report records 7 of 8 sha256 matches with the 8th (`cfw_navy_waves`)
carrying `sha256_recorded: null` because it is the live client asset, not a shared row.

### Item 3 — cc-0053 deployment correction (single doc)

`docs/briefs/results/cc-0053-batch-2-retrospective-deployment-and-governance-record-v1.md` — read in
full.

## 2. What was recorded, by item

### Item 1 — cc-0063 Brand Host Designation: packet + both migration files + review record

The frozen Gate-1 packet (`adf6276e…`), its forward and rollback migration SQL, and the mutable
`cc-0063-review-record-v1.md` companion. **The migration is NOT applied — committing the `.sql` files
records the artifacts; apply is a separate PK-gated act by S3.** Both SQL files carry an explicit
`⛔ DESIGN — NOT APPLIED` header.

**🔴 The apply is blocked at PK on two gates, both recorded:**
1. **External review #2 (`5ee6c901-…`) is `partial` and ESCALATED** (`escalate: true`,
   `requires_pk_escalation: true`). This is a **change from review #1**, which did not escalate — same
   artifacts, stronger routing. Per the standing contract, bridge auto-escalation is a hard stop →
   PK. **No concrete defect was found**; the escalation rests on residual risk (carry **C-2**: the
   A→B→C invariant has zero database enforcement — `public.assign_brand_avatar` is a one-click path to
   step C) and a `policy_decision` (is a designation write acceptable at T2 while the invariant it
   establishes is only governance-enforced). PK owns that call.
2. **The T2 apply gate itself**, never delegated.

The review chain is otherwise complete: `db-rls-auditor` `concerns` (no DB defect, pinned to the two
SQL hashes which are byte-unchanged), positive+negative guard simulation, rollback round-trip fidelity
over all 28 rows, a live 13/13 pre-state fingerprint, and the `heygen-worker` fence verified live
(fn 43, `verify_jwt=false`).

**Hash-integrity note recorded by S3, preserved:** discharging review #1's asks added packet §13.8,
moving the *packet* hash past review #1's pinned value — which is why the packet was then **frozen** at
`adf6276e…` and all later evidence routed to the mutable review record instead. **The two SQL files
were never touched** and remain at the hashes both the DB review and review #2 turn on.

### Item 2 — cc-0073 shared-background scrim remediation: full packet set

The parent brief, the Gate-1 packet, the final apply packet (`fc8e7a13…`), the apply-gate-final
(`12e99624…`), and the four evidence artifacts. **The scrim UPDATE is NOT applied** — every packet
carries `NOTHING APPLIED` and the apply is a T3 PK gate owned by S5.

**The recorded finding:** all 8 `c.shared_creative_asset` rows are crop-proofed at
`pass_1x1_scrim62` (62%) while `resolve_slot_assets` applies 40% for `safe_for_text_overlay=true` —
the text-safety proof validated at a density production never applies (the §2-non-negotiable defect
first surfaced at v6.16). The remediation writes `scrim_opacity_override='62'` on all 8 rows;
live blast radius is **S8 (Invegent) only** (the other 7 are fenced). It restores the crop-proof
density, and explicitly does **not** claim to restore the quote_card template's authored 72%
(recorded as a cc-0051 residual). **ST-9 (scale discipline: write `62`, never `0.62`) is blocking.**
The apply's own gate requires a post-apply PK visual PASS (V3/L5) as the deciding act.

### Item 3 — cc-0053: Batch 2 was ALREADY LIVE (superseding correction)

**Recorded as superseding evidence; no committed record is edited.** Containment Batch 2 was
implemented, merged, pushed and **deployed to production on 2026-07-22 23:54 UTC**
(`dpl_F8Npuxdd2yZ7xgSaRpQgaHP2i9mr`, commit `6fe8d1e`, serving `dashboard.invegent.com`) — ~36 hours
**before** its Gate 1 was approved and before every register (v6.14, v6.16) and packet that called it
"NOT IMPLEMENTED". Those records were already false when written.

The correction the registers must carry: **cc-0053's 2 `exec_sql` paths are ALREADY CONTAINED IN
PRODUCTION.** The E-Q2 arithmetic supersedes v6.16's "cc-0053 = 2 · pending": **7 total, 2 (cc-0053)
contained, 5 (cc-0054) still open** — re-verified at fresh `6fe8d1e`. PK D3 is unchanged (enforcement
blocked until all seven contained); **the remaining blocker is cc-0054 alone.** The root cause was the
same stale-remote-tracking-ref trap the ledger already records: every earlier `origin/main` read
resolved against a ref fetched before `6fe8d1e` existed locally. This session's own implementation
branch `423f864` is ABANDONED per PK ruling (stale base, duplicate work). The retrospective also
records **AC-LAYOUT's first real execution**: derived from `middleware.ts` (not a glob), `|A|=3`
(vs the stale baseline of 1), all three partitioned (`emitFriction` guarded; `login`/`logout` in the
exception register) → PASS — empirically confirming the v6.16 unsoundness finding.

### Item 4 — cc-0079 architecture brief: NOT DONE (correctly)

S7 had not handed over a frozen path + hash when this pass reached item 4. Per the directive, items
1–3 are recorded and item 4 waits for its own freeze. **Not chased, not inferred.**

## 3. PK rulings / gate states recorded

- **cc-0063 apply:** blocked at PK — external review escalation (`policy_decision`) + the T2 apply
  gate. Migration **recorded, not applied**.
- **cc-0073 apply:** blocked at PK — T3 apply gate; recorded, not applied. Sequenced **before** any
  CFW policy row / promotion / sourcing.
- **cc-0053:** Batch 2 already live; Gate-1-after-the-fact; `423f864` abandoned; cc-0054 is the sole
  remaining E-Q2 blocker.
- Both apply gates are **conditional on this recording landing durably** (the originating sessions
  reference these committed paths as their evidence base).

## 4. What this lane changed

**Files created:** this document.

**Files brought under version control (16, all read + hash-verified):**
- Item 1 (4): cc-0063 packet · forward SQL · rollback SQL · review record.
- Item 2 (9): 4 cc-0073 docs · 4 `_harness` evidence files · `FREEZE.sha256` (the flagged addition, §1).
- Item 3 (1): the cc-0053 retrospective.
- Registers (2): the v6.17 pointer.

**Files NOT committed, deliberately:** `cc-0073-decision-packs-a-b-c.md` (already at HEAD, identical) ·
`cc-0050-*` (VOID) · the modified `pp-video-tmr-template-workbook-v1.xlsx` · every other untracked
path in the shared checkout · any cc-0079 artifact (not frozen).

**Production mutations: 0.** No apply, migration run, DML, deploy, promotion, ledger write, flag
change, branch mutation, or push. **Recording SQL files ≠ running them.** `branch-warden` ran in mode
`authorized-main-docs` before the commit with origin parity re-verified immediately beforehand.

## 5. Next gate

> **PK owns two apply gates** — cc-0063 (settle the `5ee6c901` escalation, then the T2 migration apply)
> and cc-0073 (the T3 scrim UPDATE, then a post-apply visual PASS). **cc-0053 needs no gate** — it is a
> completed correction; the open work it points to is **cc-0054** (the 5 remaining `exec_sql` paths),
> the sole remaining E-Q2 enforcement blocker.

**cc-0079 waits for S7's freeze. `cc-0078` remains reserved and inactive — its inventory has not begun.**

**Push remains a PK hard stop.**
