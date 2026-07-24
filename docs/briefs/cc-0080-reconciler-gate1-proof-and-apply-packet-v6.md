# cc-0080 — Reconciler Gate-1 Proof + Apply Packet (v6, two-surface re-cut)

> **Lane:** cc-0080 · **Type:** re-cut packet — PK Rulings A + B · **Tier:** T3 · **APPLY HARD-BLOCKED**
> **Supersedes:** packet v5 (`987ab1ae…`). Single current packet.
> **Apply order: LAST** — S8 security containment → CFW policy/pilot → cc-0080. Do not combine windows.
> **Author base (stale-ref gate PASSED):** CE `origin/main == HEAD == 052a9ba`, parity 0/0.

---

## 0 · 🔴 THE PIN CHANGED — DELIBERATELY

```
NEW ARTIFACT : supabase/migrations/NOT_APPLIED_cc0080_reconcile_publish_status_v3.sql
NEW SHA256   : 713ab4aeba9b543840c10033dfb7e0babe5f1399935dfc5fd3c66d4334ef16dd
BYTES        : 23774
TARGET       : Supabase project mbkmaxqhsohbtwsqolns
BASE REF     : 052a9ba3ec8f1b7251bfe8e0eb399a3e51a5fcb9

DEAD PIN     : d227fefc… (v2) — the delta re-review AND S9's independent
               verification against it are VOID.
```

**This is the authorised outcome of Ruling B, not an accident.** Dead logic was not retained to preserve a pin. The v3 artifact must go back through a **focused** re-review (scoped to this delta) before it can approach an apply gate, and it must then be **committed to a ref** so the apply hand can hash `git show <ref>:<path>`.

---

## 1 · RULING B — queue surface REMOVED from scope

Cut entirely: the queue advance, its six-column audit, and its queue rollback branch. `m.publish_status_reconcile_audit.entity` is now `CHECK (entity IN ('slot','draft'))` and `new_value` is `NOT NULL` again (the nullable "column cleared" marker existed only for the queue).

**Why (my own finding, verified):** `m.cleanup_queue_on_publish_v1` **DELETEs** the queue row when a published `m.post_publish` row is inserted — so "a queued/failed queue row with a matching published post_publish" is structurally impossible on queue-consuming platforms. Live cohort **0**. This is also what explains the 68 LinkedIn published records whose `queue_id` no longer resolves. Dormant, unexercised machinery carrying a **known-unfaithful** rollback was pure risk.

### 1.1 FUTURE CONTRACT — recorded, not deleted

Written into the artifact header so a later lane does not rediscover it. Queue reconciliation becomes required again **if and only if queue retention changes** (`cleanup_queue_on_publish_v1` stops deleting on publish, or any path retains queued/failed rows past a successful publish). **Trigger indicator:** the read-only return counter `anomaly_queue_rows_with_published_publish` becomes non-zero. When it does, the future lane must re-establish: **(a)** an allow-list `{queued,failed}` — never a deny-list (live vocabulary includes dead/purged/skipped); **(b)** the six-column audit, because `tr_publish_queue_reset_on_success_v1` clears five columns on `status→'published'`; **(c)** a resolution for `tg_publish_queue_backoff_368_v1`, which re-fires on rollback (guard satisfied by construction), re-clobbers four audited columns, mutates un-audited `scheduled_for`, and at `err_368_streak>=3` writes `c.client_publish_profile` — outside the declared blast radius; **(d)** PK's standing ruling that a tripped queue STOP is **TERMINAL — freeze and re-review, never roll the queue surface back.**

### 1.2 A defect I caught in my own re-cut

My first draft of the trigger indicator dropped the platform restriction. Verified live: it returned **22, not 0** — it was sweeping in the known **YouTube orphan** rows (YT publishes off-queue, so those rows were never the publish vehicle). As written it would have been **permanently non-zero and worthless as a trigger**. Corrected: the indicator is restricted to queue-consuming platforms (**0**), and the YouTube orphans are reported separately as `anomaly_youtube_orphan_queue` (**37**). Two distinct signals, neither masking the other.

---

## 2 · RULING A — ONE frozen execution model

**The model, frozen — not a menu:**

> **A single SERIALIZABLE transaction, AND quiescence of the writers named below.**

**Quiescence is REQUIRED, not conditional — stated explicitly as ruled.** I verified that relevant writers demonstrably sit **outside** the reconciler's transaction: they are pg_cron jobs and Edge Functions on their own connections. SERIALIZABLE therefore converts interleaving into an abort-and-retry; it does **not** prevent those writers from running. Named writers on the two surfaces (jobid in brackets):

| Surface | Writers to quiesce |
|---|---|
| `m.slot.status` | promote-slots-to-pending-every-5m **(73)** · fill-pending-slots-every-10m **(75)** · recover-stuck-fill-in-progress-every-15m **(76)** · try-urgent-breaking-fills-every-15m **(77)** · materialise-slots-nightly **(72)** |
| `m.post_draft` | auto-approver-sweep **(58)** · publisher-every-10m **(7,** facebook — writes `approval_status='published'`**)** · instagram-publisher-every-15m **(53)** · wordpress-publisher-every-6h **(55)** · ai-worker-every-5m **(5)** · dead-letter-sweep-daily **(20)** · pipeline-fixer-30min **(36)** · pipeline-healer-every-15m **(50)** |
| `m.post_publish` (truth source — a new row mid-run changes the cohort) | linkedin-zapier-publisher-every-20m **(54)** · youtube-publisher-every-30min **(34)** |

**Machine-enforced (new R8):** a live pass **RAISEs** unless `current_setting('transaction_isolation') = 'serializable'`, with an error naming both the isolation requirement and the quiescence precondition. The frozen model is now code, not prose. Quiescence cannot be enforced in-function and remains a named apply-lane precondition.

**The rehearsal must run under this SAME model.** A rehearsal under weaker isolation is a green light earned under easier conditions than the ones that matter — explicitly forbidden.

---

## 3 · What cc-0080 now is

A **two-surface** reconciler: `m.slot.status` (**752**) and `m.post_draft.approval_status` (**315**), both re-verified live this turn against the v3 predicates. Smaller, sharper, and the largest reversible surface finally gets a rehearsed reverse gear.

**Dry-run expectations (assert at the gate):**

| Return key | Expected |
|---|---|
| `slot_advanced` / `slot_audit_rows_written` | **752 / 752** |
| `draft_approval_advanced` / `draft_audit_rows_written` | **315 / 315** |
| `ledger_divergence` | **false** |
| `anomaly_negative_terminal_with_publish` | ~140 |
| `anomaly_slot_skipped_draft_not_approved` | 3 |
| `anomaly_multiplatform_drafts` | 28 |
| `anomaly_youtube_approval_excluded` | **144** (per v5 §1's corrected definition — not 145) |
| `anomaly_queue_rows_with_published_publish` | **0** (future-contract trigger) |
| `anomaly_youtube_orphan_queue` | 37 (known artifact, not actionable) |

**New in v3, closing the TOCTOU visibility gap:** the function now returns `*_audit_rows_written` alongside each `*_advanced` count plus a computed `ledger_divergence` boolean, so an audit/update mismatch is **machine-visible at the gate** instead of silent.

---

## 4 · Errata corrected in the re-cut (the legitimate window)

Both wrong "verified live" claims in the v2 header are fixed in v3:

1. *"all three audited tables `relrowsecurity=true`"* — **was false**: `m.slot` is `relrowsecurity=FALSE`.
2. *"FORCE would block this SECURITY DEFINER function's own INSERTs"* — **was false**: `postgres` has `rolbypassrls=true`, and BYPASSRLS overrides FORCE.

The **decision** (ENABLE-not-FORCE) was and remains correct; only the reasons were wrong. Correct rationale now in the artifact: RLS is ENABLEd because it neutralises the inherited `{inspector_ro=r/postgres}` default ACL (`inspector_ro` has `rolbypassrls=false`); FORCE is omitted because it adds no protection when the sole writer is a BYPASSRLS owner while creating a failure mode for any future non-bypassing writer. **House default elsewhere remains RLS + FORCE — this exception does not generalise.**

---

## 5 · Apply sequence

**Preconditions (all blocking):** focused re-review of the v3 delta · artifact committed to a ref · **branch rehearsal green under the §2 frozen model** · `db-rls-auditor` run by the apply hand on the exact v3 DDL/DML · PK re-opens the gate (currently **CLOSED**).

1. `git show <ref>:…_v3.sql | sha256sum` → **abort** unless `713ab4ae…` (23774 B).
2. Confirm project == `mbkmaxqhsohbtwsqolns` → abort if different.
3. Rename to a real timestamped migration identity (`apply_migration` mints its own wall-clock version and ignores the filename — decide rename-or-record before commit).
4. `db-rls-auditor` on the exact v3 DDL/DML.
5. Apply definitions only — no rows touched (`p_dry_run` defaults true).
6. `SELECT m.reconcile_publish_status(true);` → assert the §3 table.
7. **Branch rehearsal under the §2 frozen model** (SERIALIZABLE + quiescence): `(false)` → `rollback(batch_id)` → assert restored counts and capture the `m.post_draft` `published→approved` restore fidelity **empirically**. (Static trigger census says clean — `m.slot` has no triggers; `trg_handle_draft_rejection` gates on `'rejected'` so it is a no-op in both directions; `trg_release_queue_on_asset_ready` is column-scoped and never fires on this SET list. **Static proof does not substitute — prove it.**)
8. Quiesce the §2 writers → prod apply `(false)` inside `SET TRANSACTION ISOLATION LEVEL SERIALIZABLE` → capture `batch_id` → restore the writers.

**STOP conditions:** any count deviating from the immediately-preceding dry-run · `ledger_divergence = true` · any anomaly cohort larger than §3 · rehearsal not green · isolation guard raising (means the model was not honoured) · **`anomaly_queue_rows_with_published_publish > 0` → queue retention changed → the §1.1 future contract is live; STOP and re-review** · a serialization failure (retry the whole transaction; never partially re-run).

---

## 6 · Non-claims

Nothing applied; no row mutated. The rehearsal is **not run and not mine** — I authored the reconciler, and the SoD control requires an executing hand that is neither author nor reviewer. The v3 delta has **not** been reviewed; the prior review and S9's verification are void by design. Cohort counts are live 2026-07-24 and must be re-derived at apply. The queue surface is out of scope with its future contract recorded. Quiescence is enforced procedurally, not in code. Evidence: live `cron.job`, `m.*`, `pg_class`/`pg_roles`/`pg_default_acl` reads on `mbkmaxqhsohbtwsqolns` at CE `052a9ba`.
