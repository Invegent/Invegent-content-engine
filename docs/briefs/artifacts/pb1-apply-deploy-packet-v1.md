# Path B Apply / Deploy Packet v1 — publish-cadence controls (max_per_day)

**Lane:** schedule-cap-controls · **Deliverable B (T3)** — publish-cadence editability (the real published-volume lever). Follows Path A (schedule cap), which is live.
**Two-step nature:** applying this migration is **additive/dark** — it creates fenced RPCs + an audit table and changes NO cadence data. The **actual cadence raise** (setting a client's `max_per_day` to e.g. 3) is a SEPARATE production step you drive later; that is when published volume changes, observed over days.

Nothing herein applied/deployed/committed/pushed. Artifact for external review + the PK T3 apply/deploy gate.

## Artifacts
**DB (CE worktree `posting-cap-p1`):**
- `supabase/migrations/20260727150000_pb1_publish_cadence_write_rpc.sql` — (0) append-only audit table `c.publish_cadence_change_log` (RLS ENABLE+FORCE, no policy, REVOKE PUBLIC/anon/authenticated, **no grants** — written only by the definer RPC); (A) `public.get_publish_cadence(uuid)` (read, cadence fields only — no credentials); (B) `public.save_publish_cadence(uuid,text,integer,integer,text)` — SECURITY DEFINER, `search_path=''`, service_role-only, **UPDATE-only whitelist** (`max_per_day`,`max_queued_per_platform`,`updated_at` on the credential-bearing `c.client_publish_profile` — never tokens/`publish_enabled`), fail-closed (22004/22023/23514/23503), captures old→new to the audit log, **LinkedIn hard-clamped to max_per_day≤2** (23514), `p_changed_by` actor recorded. Bare `CREATE FUNCTION` (fail-closed on collision).
- `docs/briefs/artifacts/pb1-rollback.sql` — DROP both functions (new signatures) + DROP TABLE `c.publish_cadence_change_log`.

**Dashboard (worktree `dash-posting-cap-p1` @ 4f10248):** new `actions/publish-cadence.ts` (passes `p_changed_by` best-effort: `user.email`→`user.id`→`"dashboard"`), `lib/publish-cadence.ts`; modified `ScheduleTab.tsx` (prominent "Publishing cadence — changes REAL publishing volume" section; per-platform `max_per_day`/`max_queued` editable; LinkedIn input capped at 2; read-only min_gap/publish_enabled; not-role-restricted honesty line) + `page.tsx` (fetch `getPublishCadence`). No new route. App-only tsc PASS.

## Security posture (security-auditor)
GREEN-CONDITIONAL. The RPC object is **GREEN** (no credential path — whitelist, no dynamic SQL, no RETURNING *, no triggers, UPDATE-only; cannot enable publishing — only volume on already-live channels; bounded + reversible). Residual **AMBER = the standing dashboard authz gap** (any authed user → service_role), owned by the **role-register lane (in flight)** — strictly ≤ an already-live sibling (`update_publish_profile_toggle`). Two PK-directed guards now added: **actor audit** (`c.publish_cadence_change_log`) + **LinkedIn hard-clamp to 2**.

## Ordered apply/deploy
### Pre-checks (STOP on any)
- P0. Greenfield: both functions + `c.publish_cadence_change_log` absent live.
- P1. branch-warden safe (dashboard); CE change set exact. P2. All reviews clean; external review pinned to this packet hash.

### DB apply (PK-run; T3 HARD STOP)
1. `apply_migration` `pb1_publish_cadence_write_rpc`.
2. Post-apply verify — **WITHOUT raising any real cadence** (STOP on fail): functions `service_role`/`postgres` only; audit table locked (anon/authenticated denied). Functional as service_role: `save_publish_cadence(property-pulse,'facebook',2,<current queued>,'verify')` (2→2, a no-op value-wise) → `{ok}` + an audit row logged (old=2,new=2); a `linkedin,3` call → **23514 reject, zero write** (clamp proven); `facebook,99` → 23514 reject; a non-existent client → 23503; confirm the profile row's credential columns are byte-identical before/after the 2→2 write.

### Dashboard deploy (separate; after DB live)
3. Merge `dash-posting-cap-p1` → dashboard `origin/main` → Vercel. Browser-verify the cadence editor renders; LinkedIn input capped at 2.

### The actual cadence change (SEPARATE, your gated step — NOT this apply)
4. When you want more real output, set a client's `max_per_day` (e.g. property-pulse facebook → 3) via the editor/RPC. Published volume then rises over the following days (publisher reads `max_per_day`); observe `m.post_publish` counts. This is the production-behaviour step; do it deliberately, per client.

## STOP conditions
Greenfield violated · non-clean review · post-apply verify fail (esp. LinkedIn clamp not rejecting, or any credential column changing) · unexpected change-set file · invalidated rollback.

## Rollback
`pb1-rollback.sql` — DROP both functions + the audit table. No cadence data to unwind (any raised value is reversible by re-setting). Dashboard: revert merge.

## Review chain status
- **db-rls-auditor: CLEAN/high** (first pass + delta re-review) — whitelist airtight (only 3 cols on the credential table; only INSERT is to the audit log), UPDATE-only + 0-row RAISE, service_role-only funcs, no credential path, LinkedIn clamp correct (1..2 vs 1..10), audit table locked (RLS FORCE + owner-postgres bypass makes the definer INSERT work), greenfield, rollback exact inverse. One LOW should_fix (audit table born with residual service_role/inspector_ro SELECT via schema-c default ACL) → **FIXED** (explicit REVOKE from service_role, inspector_ro; table now literally grant-less).
- **security-auditor: GREEN-CONDITIONAL** — object GREEN (no credential path; bounded + reversible; can't enable publishing; ≤ existing live sibling); residual authz AMBER owned by the role-register lane; the two recommended guards (actor audit + LinkedIn hard-clamp) implemented.
- **dashboard-ia-lint: no-block** (NO_GOVERNING_RULE) — no IA invariant violated; ungoverned Qs (IA home/altitude of a real-throughput control; gating) noted for PK.
- **branch-warden: dashboard SAFE; CE apply-safe** (unique `pb1` filename; note: Path A double-recorded on origin/main via v6.34 — a merge-reconcile item, not an apply blocker).
- **apply-harness-auditor (shadow): PASS/clean** — every declared control present in SQL; greenfield STOP symmetric (bare CREATE on all 3 objects); check 7 (apply/rollback identity) exact inverse; no findings.
- **ask_chatgpt_review: AGREE / proceed** on hash `d2b7d32f17720facb744b91d5916b77b` (medium risk, high confidence, no pushback, no escalation; review_id `5f056a50-2533-4510-aa43-fc55e83299be`).

**Standing carry:** the cadence editor is reachable by any authed user until the role register lands (separate lane). Bounded by whitelist + value caps + now the audit log; LinkedIn hard-clamped.
