# cc-0080 — Reconciler Gate-1 Proof + Apply Packet (v2, post-review)

> **Lane:** cc-0080 · **Type:** Gate-1 delta re-review packet (BUILD v2, **APPLY HARD-BLOCKED**) · **Tier:** T3 (broad cross-table backfill; SoD control ON)
> **Supersedes:** `cc-0080-reconciler-gate1-proof-and-apply-packet-v1.md` (`f6e22a7a…`) after independent review returned **`concerns` · 3 MUST-FIX**.
> **Status:** author-only. No apply, no run, no row mutated. Counts are read-only SELECTs, 2026-07-24.
> **Author base (stale-ref gate PASSED this turn):** CE fetched with prune → `origin/main == HEAD == 800a02ecc07c2a41101134b776c3f412e586501b`, parity 0/0, `main`. **(v1 pinned the now-stale `043c3946…` — corrected here, MUST-FIX 2.)**

---

## 0 · ARMED PIN (MUST-FIX 1 — the gate is now operative)

```
ARTIFACT : supabase/migrations/NOT_APPLIED_cc0080_reconcile_publish_status_v2.sql
SHA256   : d227fefcf9ea90bd4a93f1dfde5e81ae4e5ff70717e8aa1d51211647331e1982
BYTES    : 20279
TARGET   : Supabase project mbkmaxqhsohbtwsqolns  (ICE production)
BASE REF : 800a02ecc07c2a41101134b776c3f412e586501b
```

The v1 packet's pin was the literal placeholder `<SEE FREEZE BLOCK …>` and no freeze block existed in-repo — so apply step 1 ("abort if ≠ pinned hash") **could not execute**. Finding accepted without reservation: the control PK added for this lane was documentary, not operative. It is now a real value, above, in the artifact itself. **Note the hash is NOT v1's `6949bb44…`** — that was the superseded v1 SQL; the v2 fixes changed the bytes, exactly as the reviewer anticipated.

**MUST-FIX 2 remains OPEN and is an explicit apply precondition, not something I can close:** both the `.sql` and this packet are untracked working-tree files. A different hand cannot fetch bytes that are not on a ref. **No SoD apply may proceed until S4 has committed the artifact and the apply hand can `git show <ref>:<path>` and hash *that*.** I do not commit; I freeze and hand off.

---

## 1 · What changed in v2 (each finding verified live before encoding)

| # | Finding | Disposition |
|---|---|---|
| MUST-1 | SoD pin was an unfilled placeholder | **FIXED** — §0, real hash |
| MUST-2 | artifact untracked; base ref stale | **base ref fixed**; tracking is an apply precondition (§0) — cannot be closed by the author |
| MUST-3a | queue predicate a deny-list | **FIXED** — explicit allow-list `('queued','failed')`; verified live vocabulary dead=464, purged=137, skipped=32, queued=26, failed=15 |
| MUST-3b | rollback lossy (trigger clears 5 cols) | **FIXED** — trigger body read and confirmed; all 6 columns audited + restored; `new_value` made nullable |
| SHOULD | slot negative-terminal guard | **FIXED, with a correction — see §2** |
| SHOULD | R3 no DISTINCT / no GET DIAGNOSTICS | **FIXED** — `DISTINCT ON (post_draft_id)` + `GET DIAGNOSTICS`, consistent with R2/R4 |
| SHOULD | `search_path ''` stronger | **FIXED** — all refs schema-qualified; `gen_random_uuid()`/`now()` are pg_catalog builtins |
| SHOULD | R7 claim "service_role invokes" false | **FIXED (doc)** — owner-only **by design** for a one-shot SoD-gated backfill; no grant added. A scheduled sweep would need a separately-gated GRANT |
| SHOULD | audit table lacks RLS | **FIXED** — `ENABLE ROW LEVEL SECURITY`, deliberately **not** `FORCE` (FORCE applies to the owner and would block this SECURITY DEFINER function's own INSERTs) |
| SHOULD | LinkedIn forward coupling undisclosed | **DISCLOSED** — §4 |

---

## 2 · Correction to the review (count right, label wrong) — and I had the same bug

The review reported "3 of 755 advances belong to **dead/rejected/voided** drafts." Live verification of the full candidate set:

| draft `approval_status` across the 755 slot candidates | n |
|---|---|
| published | 390 |
| approved | 362 |
| **draft** | **3** |
| dead / rejected / voided | **0** |

The **count of 3 and the target of 752 are exactly right**; the state label is not. The 3 are LinkedIn slots at `slot.status='failed'` whose draft never left `'draft'` yet carries a published `post_publish` — an anomaly in its own right.

**Consequence, and my own error:** I first encoded the guard as a *deny-list* on `('dead','rejected','voided')`. Verified live: that changed **nothing** — still 755, 0 skipped. It would have shipped a guard that silently did no work, and it was the **same deny-list anti-pattern MUST-3a flags for the queue**, reintroduced by me at the slot surface. v2 now uses an **allow-list**: the draft must be `IN ('approved','published')`. **Verified: 755 → 752.** No deny-list predicate remains anywhere in the function (grep-verified).

---

## 3 · Dry-run counts (v2 predicates, live)

### 3.1 Would advance

| Surface | Count | Change vs v1 |
|---|---|---|
| `slot.status → published` | **752** | 755 → 752 (allow-list guard) |
| `approval_status → published` | **315** (LI 308 · IG 4 · website 3) | unchanged |
| `queue.status → published` | **0** | unchanged (allow-list and deny-list both yield 0 today — the fix is drift protection, not a today-delta) |

### 3.2 Refused / surfaced (never written)

| Cohort | Count |
|---|---|
| draft `dead`/`rejected`/`draft` with a published record | ~140 |
| YouTube `approval_status` advances excluded by rule | 144 |
| slots skipped by the new allow-list guard | **3** |
| YouTube orphan queue rows | 37 |
| Instagram `failed` rows with no matching published record | 15 |
| multi-platform drafts (excluded from `approval_status`) | 28 |

---

## 4 · Disclosed forward coupling (LinkedIn) — not fixed here

Verified: **both** LinkedIn publishers gate `if (draft.approval_status !== 'approved')` — `linkedin-publisher:97` and `linkedin-zapier-publisher:175` (the **active** path) — and neither accepts `'published'`, unlike `youtube-publisher:262` (`.in('approval_status', ['approved','published'])`). After the 308 LI drafts advance to `published`, any **future** re-queue of one soft-fails and re-queues every 60 min (`not_approved:published`) rather than duplicate-posting. Safe, but it burns queue ticks silently. **Options:** pair a publisher change mirroring `youtube-publisher:262`, or accept and monitor. Named here so it is not discovered post-apply.

---

## 5 · Idempotency · rollback · YT rule (unchanged in substance)

- **Idempotency:** every advance requires its source state (`slot IN ('filled','failed')` + draft `IN ('approved','published')`, `approval_status='approved'`, `queue IN ('queued','failed')`). Post-advance none match → re-run = 0 on all three surfaces.
- **Rollback:** now complete. Queue restores all six columns (`status`, `last_error`, `last_error_code`, `last_error_subcode`, `last_error_at`, `err_368_streak`). Restoring `status` *away from* `'published'` does not re-fire `tr_publish_queue_reset_on_success_v1` (it fires only on a transition **to** `'published'`), so the restored error columns persist. Per-row fail-closed: restores only if the current value still equals what the batch wrote.
- **YouTube rule:** `pp.platform <> 'youtube'` in R3 (count and apply paths); 144 exclusions counted and returned so review can verify the guard fired. YT's only reconciled surface is `slot.status` (per-platform-safe). YT queue orphans flagged, never written.

---

## 6 · SoD apply sequence (unchanged, now executable)

Preconditions: **PK opens the apply gate** AND **the artifact is committed to a ref** (MUST-FIX 2). Then, by a hand that did not author/review:

1. `git show <ref>:supabase/migrations/NOT_APPLIED_cc0080_reconcile_publish_status_v2.sql | sha256sum` → **abort** unless `d227fefc…` (20279 bytes).
2. Confirm target project == `mbkmaxqhsohbtwsqolns` → **abort** if different.
3. Rename to a real timestamped migration identity (name = permanent identity).
4. `db-rls-auditor` on the exact DDL/DML (1 table + index + RLS + 2 functions + revokes).
5. Apply definitions only — no rows touched (`p_dry_run` defaults true).
6. `SELECT m.reconcile_publish_status(true);` → assert **752 / 315 / 0** and the §3.2 anomaly counts.
7. On a branch/clone: `(false)` → validate → `rollback(batch_id)` → assert restored counts match and surfaces are byte-identical to pre-apply.
8. Prod apply `(false)`, capture `batch_id`. **STOP** on: any count deviating from the immediately-preceding dry-run · any anomaly cohort larger than §3.2 · `queue_advanced > 0` (today's expectation is 0 — a non-zero means the queue drifted and needs re-review) · rollback validation not green.

---

## 7 · Non-claims

Nothing applied; no row mutated. MUST-FIX 2 (tracking) is **open by design** — only S4/PK can close it. Counts drift with new publishes; the apply hand re-runs the dry-run immediately before apply and compares. The reconciler is dry-run-proven, **not** apply-proven. The LinkedIn coupling (§4) and the ~140 negative-terminal anomalies and 15 IG post_publish-missing rows are disclosed, not resolved. Evidence: live reads on `mbkmaxqhsohbtwsqolns`; CE `800a02e`; trigger `tg_publish_queue_reset_on_success_v1` and both LI publisher gates read at HEAD.
