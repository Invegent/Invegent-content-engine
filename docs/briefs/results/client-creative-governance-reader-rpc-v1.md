# Result — client-creative-governance reader RPC (public.get_client_creative_governance)

**Brief file:** `docs/briefs/client-creative-governance-reader-rpc-v1.md`
**Executed by:** Claude Code (orchestrated) + PK (apply gate)
**Completed:** 2026-07-19 Sydney

> Lane origin: the **D-B** decision from the Static-Image Governance Dashboard. Provides the
> reader RPC that unblocks a future dashboard governance-enablement panel (Slice 3).

---

## 1. Result status

`Complete` — reader RPC authored, full T3 review chain clean, applied to production (PK-gated),
post-apply verified. Ships **dark** (no consumer yet).

## 2. Commit(s)

- Committed in this lane on `feat/get-client-creative-governance-rpc` → fast-forwarded to `main`
  (migration file + brief + this result doc). See the lane commit for the hash.
- **Applied ledger version:** `20260719012947` (name `create_get_client_creative_governance_rpc_v1`).
  `apply_migration` minted its own wall-clock version; the repo file was **renamed** from the
  provisional `20260719120000_…` to `20260719012947_…` so repo ↔ ledger agree.

## 3. Files changed

- `supabase/migrations/20260719012947_create_get_client_creative_governance_rpc_v1.sql` — created (applied)
- `docs/briefs/client-creative-governance-reader-rpc-v1.md` — created (Gate-1 brief)
- `docs/briefs/results/client-creative-governance-reader-rpc-v1.md` — created (this doc)

## 4. Actions taken

- Gate 1: drafted the brief (via `brief-author`), PK approved as recommended — DEC-1 nullable
  `p_client_slug` · DEC-2 jsonb · DEC-3 closed 7-column projection · DEC-4 name · DEC-5 **T3** ·
  DEC-6 DB-RPC-only scope.
- Authored `public.get_client_creative_governance(p_client_slug text DEFAULT NULL) RETURNS jsonb`
  in an isolated worktree off `origin/main cb5234d2`, mirroring the proven `list_active_clients`
  posture (STABLE · SECURITY DEFINER · `search_path` pinned · `COALESCE(…,'[]')` · COMMENT ·
  `REVOKE EXECUTE FROM PUBLIC, anon, authenticated` · `GRANT EXECUTE TO service_role`).
- Review chain (T3): `db-rls-auditor` **PASS** (SQL correct; definer-reads-under-RLS satisfied —
  owner postgres, BYPASSRLS + table owner + `force_rls=false`; first reader; ACL/atomicity sound)
  · `security-auditor` **GREEN** (minimal grant, privilege-neutral, non-secret projection, bound
  param, no fence weakened) · external review `5cc28f49` agree/proceed (hash `99f7c997`) ·
  `branch-warden` safe.
- PK apply gate: temporary lift of the `apply_migration` deny (removed → applied → **restored**),
  applied via `apply_migration` (project `mbkmaxqhsohbtwsqolns`).
- Post-apply verification (read-only): ACL `anon`=false / `authenticated`=false / `service_role`=true;
  `get_client_creative_governance(NULL)` → 3 rows; NDIS → 1 (`image_quote`); PP → 2
  (`image_quote` + `video_short_stat`), all `enabled=true`; `get_advisors(security)` shows **zero**
  new findings attributable to the function.

## 5. Constraints confirmed

- No change to any existing object — only the one new function created — confirmed
- No data change (no INSERT/UPDATE/DELETE) — confirmed
- No change to `c.client_creative_governance` table — confirmed
- No grant to anon/authenticated (service_role only; explicit named revoke) — confirmed
- No REST exposure of schema `c` — confirmed
- No dashboard code change (Slice 3 is a separate lane) — confirmed
- No EF deploy — confirmed
- `apply_migration` deny-list temporarily lifted only for this apply, then **restored** — confirmed

## 6. Open issues

- **Durability caveat (low, `db-rls-auditor`):** the definer read depends on the function owner
  being a BYPASSRLS/owner role. Because `force_rls=false`, if the function were ever re-created
  under a non-privileged owner it would silently return an empty array rather than error. Applying
  via `apply_migration` (as postgres) yields the correct owner — future-maintenance note only.
- `geo_scope` is still not exposed to the dashboard eligibility panel — unrelated to this lane
  (it's a `resolve_slot_assets` return-shape gap, carried on the dashboard side).

## 7. Next recommended step

Dashboard **Slice 3** (separate dashboard lane): wire `public.get_client_creative_governance`
into `/creative-library` to replace the current register-sourced governance note with a live
governance-enablement panel (per client×format `enabled`), consumed via the dashboard's
service-role client.

---

## 8. Verification

**Verdict:** `Pass`

**Notes:**
- Output matched the brief (all DEC-1..DEC-6 as approved; closed projection; nullable slug).
- Constraints respected (additive, read-only, service-role-only; deny-list restored).
- No unexpected files changed (branch-warden: exactly the migration; brief + result doc added at commit).
- Success criteria met, incl. the post-apply ACL assert (anon/authenticated absent, service_role present).
- New risks: only the low force_rls owner caveat above.
- Follow-up: dashboard Slice 3.

## 9. Learning notes

- `apply_migration` is blocked by a `deny` rule in `.claude/settings.local.json` (deny **overrides**
  allow) — adding to the allow list does nothing; the temporary lift must remove the deny entry, then
  restore it. The pre-existing allow entry for `mcp__supabase__apply_migration` was inert behind the
  deny all along.
- `apply_migration` mints its own ledger version (wall-clock at apply) and keeps the name — rename
  the repo file to the applied version to keep repo ↔ ledger aligned.
- Reusable pattern: `list_active_clients` is the canonical mirror for a read-only, service-role-only
  `public` reader over the service-fenced `c` schema.
