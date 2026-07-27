# Result — Schedule-Cap Controls, Path B (editable publish cadence / max_per_day)

**Date:** 2026-07-27 Sydney · **Tier:** T3 (write on credential-bearing `c.client_publish_profile`) · **Lane class:** PRODUCT_PROOF
**Brief:** `docs/briefs/schedule-cap-controls-brief-v1.md` · **Packet:** `docs/briefs/artifacts/pb1-apply-deploy-packet-v1.md` (hash `d2b7d32f17720facb744b91d5916b77b`)
**Verdict:** COMPLETE — applied + deployed. The *capability* is live; the actual cadence raise is a deliberate PK step (not done here).

## Outcome
Super-user, per-(client,platform) editable **publish cadence** — `max_per_day` (the sole per-day published-volume throttle; all clients were 2) + `max_queued_per_platform`. This is the lever that makes "20/week" real (fb/ig/yt → 3 ≈ 21/week; **LinkedIn hard-clamped to 2** by design). PK elected B into the lane ("include max_per_day so I can actually raise output").

## Shipped
- **DB (applied via `apply_migration` `pb1_publish_cadence_write_rpc`):** append-only audit table `c.publish_cadence_change_log` (RLS ENABLE+FORCE, no policy, REVOKE PUBLIC/anon/authenticated **+ service_role/inspector_ro** → literally grant-less; written only by the definer RPC). `public.get_publish_cadence(uuid)` (read — cadence fields only, no credentials). `public.save_publish_cadence(uuid,text,integer,integer,text)` — SECURITY DEFINER, `search_path=''`, **service_role-only**, **UPDATE-only column-whitelist** (`max_per_day`/`max_queued_per_platform`/`updated_at` on the credential-bearing table — never tokens/`publish_enabled`), fail-closed (22004/22023/23514/23503), captures old→new + `changed_by` to the audit log, **LinkedIn hard-clamp `max_per_day≤2`**. Bare `CREATE FUNCTION`. Rollback `pb1-rollback.sql`.
- **Dashboard (deployed — `invegent-dashboard` `main` @ `ee02b96`, ff from `4f10248`, Vercel):** `actions/publish-cadence.ts` (passes `changed_by` best-effort user.email→id→"dashboard") + `lib/publish-cadence.ts`; `ScheduleTab.tsx` "Publishing cadence" section (prominent "changes REAL publishing volume" banner; LinkedIn input capped at 2; read-only min_gap/publish_enabled; not-role-restricted honesty line); `page.tsx` fetch. No new route.

## Review chain (T3)
db-rls-auditor **clean** (first pass + delta; the one LOW grant-residue finding fixed) · security-auditor **GREEN-CONDITIONAL** (object GREEN — no credential path, bounded+reversible, can't enable publishing, ≤ existing live sibling; residual authz AMBER → role-register lane; the two guards it recommended — actor audit + LinkedIn clamp — implemented) · dashboard-ia-lint **no-block** · branch-warden **safe** · apply-harness-auditor shadow **PASS/clean** (check-7 exact inverse) · external `5f056a50` **AGREE/proceed** (no escalation).

## Post-apply proof (live, no real cadence raised)
Greenfield re-confirmed. RPCs `postgres`/`service_role` only; audit table RLS-forced with **no non-owner grants**. `save_publish_cadence(property-pulse,'facebook',2,20,'pb1-verify')` (2→2 no-op) → `{ok}`, one audit row logged (old=2,new=2, by=pb1-verify); **credential-column md5 byte-identical before/after** (`bccc63c0…`); pp fb cadence unchanged at 2. Fail-closed rejects: `linkedin,3` → 23514 (clamp), `facebook,99` → 23514 (bounds), non-existent client → 23503 — all zero write.

## The actual output increase (PK's next step, NOT done here)
Set a client's `max_per_day` higher via the editor/RPC (e.g. property-pulse fb → 3). Published volume then rises over the following days (publisher reads `max_per_day` at `publisher/index.ts:435-443`); observe `m.post_publish` counts. Deliberate, per client. LinkedIn stays 2.

## Carries
- **Authz (standing):** the cadence editor is reachable by any authed user until the **role register** lands (separate lane, running). Bounded by the whitelist + value caps + the append-only audit + LinkedIn clamp; strictly ≤ the already-live `update_publish_profile_toggle` sibling.
- **Record:** committed on isolated branch `posting-cap-p1` (unpushed); **Path A already recorded on `origin/main` via v6.34** — this branch's Path A commit is a duplicate to reconcile; Path B record rides the same branch. Merge/register-pointer left to PK.
- **Rendered-UI visual acceptance:** PK (auth-gated).
- IA (dashboard-ia-lint NO_GOVERNING_RULE): whether a real-throughput control belongs on the `/clients` schedule tab / should be ungated — PK product decision, deferred.

## Lane status
Schedule-Cap Controls lane COMPLETE (Path A scheduling + Path B cadence, both live). The remaining systemic item (role-gating the super-user controls) is the separate role-register lane already running.
