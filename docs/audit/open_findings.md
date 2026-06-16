# ICE Audit — Open Findings Register

> **Active findings only.** Closed findings stay visible (status changes from `open` to `closed-{type}`) but their resolution is filled in. Closed findings older than 90 days may be archived to `runs/` and removed from this file — but never deleted.

> **Scope:** This register is the audit working file. See `docs/audit/00_audit_loop_design.md` for the architecture, `docs/audit/roles/` for role definitions, and `docs/audit/snapshots/` for evidence.

> **Closure types:** `closed-explanatory` · `closed-action-taken` · `closed-action-pending` · `closed-redundant` · `closed-redundant-lesson-N` *(introduced 2026-05-03 R01 calibration v2)* · `closed-noted` (for Info-tier observations that auto-close after 30 days).

> **Finding ID conventions** *(introduced 2026-05-03 R01 calibration v2)*: `D-YYYY-MM-DD-NNN` for Data findings (full severity range), `P-YYYY-MM-DD-NNN` for Process findings (LOW ceiling unless escalation justified). Pre-2026-05-03 findings retain their original `F-YYYY-MM-DD-D-NNN` IDs unchanged.

---

## Summary

| Severity | Open | Closed (last 30d) |
|---|---|---|
| Critical | 0 | 0 |
| High | 1 | 2 |
| Medium | 0 | 4 |
| Low | 0 | 2 |
| Info | 0 | 0 |

**Last audit run:** 2026-04-30 Data Auditor (4 findings, all closed same day)  
**Last role calibration:** 2026-05-03 R01 calibration v2 (`docs/runtime/sessions/2026-05-03-r01-calibration.md`)  
**Next scheduled run:** TBD — Data Auditor's default rotation slot is Tuesday

---

## Closure effectiveness — historical

Retroactive grading of cycles 1-2 against the Decision 6 metric:

| Cycle | Date | Findings closed | Structural | Symptomatic | Pending | Effectiveness |
|---|---|---|---|---|---|---|
| 1 | 2026-04-28 | 3 | 2 (F-001 sentinel + grace pattern; F-003 detector function) | 0 | 1 (F-002 backlog with phased plan) | **67%** |
| 2 | 2026-04-30 | 4 | 0 | 3 (F-001 DDL drop; F-003 brief refresh; F-004 brief refresh) | 1 (F-002 backlog with row-count trigger) | **0%** |
| **Trailing 3-cycle average** | — | 7 | 2 | 3 | 2 | **28.6%** |

**Soft target: ≥ 50% structural.** Current trailing average below threshold. The 2026-05-03 R01 calibration session is the structural response — Decisions 5, 6, 7 introduce mechanisms that should pull future cycles back above the soft target.

---

## Open findings

### D-2026-06-16-002  ·  HIGH  ·  open  (systemic SECURITY DEFINER exposure)
**Role:** db-rls-auditor (read-only confirmation) · **Raised:** 2026-06-16 Sydney
**Issue:** The `advance_avatar_*` exposure closed in D-2026-06-16-001 is **not isolated** — it is one instance of a systemic pattern across the `public` schema:
- **85** SECURITY DEFINER functions in `public` that are exposed and **mutating** (run with owner rights and write data).
- **43** of those also **lack a pinned `search_path`** (`function_search_path_mutable` — search_path-injection surface).
- **125** functions are **public + anon-executable** (callable without signing in).
- **125** functions are **public + authenticated-executable**.
**Highest-risk subset:** credential/token-writing SECURITY DEFINER functions within the 85 (functions that write secrets / credentials / tokens) — the priority lockdown targets; precise enumeration deferred to Phase 1 (see next step).
**Scope vs D-2026-06-16-001:** D-001 remediated **only** `advance_avatar_*` (2 functions). The remaining systemic surface is untouched.
**Status:** OPEN — Phase 1 (5 GREEN), Phase 1b (`store_linkedin_org_token` search_path), the `upsert_publish_profile` revoke, and Phase 2 Batch-1 (6 pipeline/notifier/crosspost RPCs) all APPLIED + VERIFIED (2026-06-16); remaining systemic SECURITY DEFINER surface still open.
**Recommended remediation: Partially applied.** Phase 1 credential/schedule-writer lockdowns, Phase 1b `search_path` hardening, and the standalone `upsert_publish_profile` lockdown have been completed and verified. Remaining work is the broader **Phase 2** systemic SECURITY DEFINER remediation (caller-confirmed, batched, D-01 reviewed, PK-gated). Standing approach: `REVOKE EXECUTE FROM anon, authenticated, PUBLIC` (service_role retained) + pin `search_path`, highest-risk first; PUBLIC-only revoke is insufficient on Supabase.
**Next gated step:** (1) **optional 0011 `search_path` riders** — `crosspost_facebook_to_linkedin` + `upsert_publish_profile` (low severity; bodies already safe); (2) **Phase 2 Batch-2** — planning / caller-confirmation for the next systemic-surface batch (each caller-confirmed + D-01); (3) **standard governance path** thereafter.
**Source:** CCH systemic SECURITY DEFINER exposure scan, 2026-06-16 (counts above). This register pass is docs-only — no SQL run by CCD this task.
**Phase 1 — APPLIED + VERIFIED (2026-06-16):** migration `sec_d_2026_06_16_002_phase1_oauth_publish_rpc_lockdown` (version `20260616054727`) via Supabase `apply_migration`; review `d90b9d87` resolved PK-approved; PK phrase recorded. **REVOKE EXECUTE FROM PUBLIC, anon, authenticated** (service_role retained; no body/search_path/schema/data change) on the 5 GREEN functions:
- `store_youtube_channel_token(uuid,text,text,text,text,timestamptz)` — caller: invegent-dashboard YouTube OAuth callback (service-role).
- `store_linkedin_org_token(uuid,text,text,text,timestamptz)` — caller: invegent-dashboard LinkedIn OAuth callback (service-role). **search_path pinned in Phase 1b (see below).**
- `store_facebook_page_token(uuid,text,text,text,text,timestamptz)` — caller: invegent-dashboard Facebook callback + select-page (service-role).
- `store_platform_token(uuid,text,text,text,text,timestamptz)` — callers: **invegent-portal/app/api/connect/facebook/callback/route.ts + invegent-portal/app/api/connect/linkedin/callback/route.ts**, both via **`createServiceClient()` (`SUPABASE_SERVICE_ROLE_KEY`)** — service-role provenance confirmed.
- `save_publish_schedule(uuid,text,jsonb)` — caller: invegent-dashboard schedule server action (service-role).
**Verification (read-only):** all 5 now anon=false / authenticated=false / service_role=true (ACL `{postgres, service_role}`); security advisor 0028/0029 cleared for all 5. **EXCLUDED from Phase 1:** `upsert_publish_profile` — now reclassified **MANUAL-ONLY** (see classification note below). **Remaining systemic surface (broader 85 SECDEF set) stays OPEN.**
**Phase 1b — APPLIED + VERIFIED (2026-06-16):** migration `sec_d_2026_06_16_002_phase1b_store_linkedin_org_token_search_path` via Supabase `apply_migration`; review `55394b25-2f58-4ca9-b943-df496a3ba49f` (proceed / agree / low risk / high confidence); PK approval phrase received; ledger provenance recorded against `55394b25`. Pinned `search_path` on `store_linkedin_org_token` to close advisor 0011 `function_search_path_mutable`. **Verification (read-only):** `proconfig` = `search_path=""` (empty path); `service_role=true`, `anon=false`, `authenticated=false` (ACL unchanged); advisor 0011 cleared for `store_linkedin_org_token`; **function body unchanged** (bare `ALTER ... SET search_path = ''`; `gen_random_uuid()` resolves from `pg_catalog` on PG17). No grant / schema / data change.
**`upsert_publish_profile` — classification: MANUAL-ONLY (2026-06-16; AMBER resolved).** `public.upsert_publish_profile(uuid,text,text,text,text,text,bool,bool)` — single overload, **SECURITY DEFINER**, owner **postgres**; writes **`c.client_publish_profile`** (incl. token-like `page_access_token`) via `ON CONFLICT (client_id, platform)`. **Grants at audit time included PUBLIC/anon/authenticated/service_role** (Phase 1 had not touched it); advisors 0028/0029/0011 were all active at that point. **Caller audit (db-rls-auditor `aee385136f4959dcc` + security-auditor `ad006b3dc97129511`):** **zero runtime RPC callers** across content-engine / dashboard / portal / web; the only evidenced invocation is the **manual `SELECT public.upsert_publish_profile(...)`** onboarding SQL in `docs/briefs/brief_042_linkedin_zapier_bridge.md` (run as postgres in the SQL editor); **Zapier is outbound-only** (the `linkedin-zapier-publisher` EF reads the webhook URL and POSTs out — it does not call this RPC). **Outcome: standalone revoke APPLIED + VERIFIED — see Resolution block below.**
**`upsert_publish_profile` standalone revoke — APPLIED + VERIFIED (2026-06-16):** migration `sec_d_2026_06_16_002_upsert_publish_profile_rpc_lockdown` (version `20260616081743`) via Supabase `apply_migration`; review `34ca4492`; PK approval phrase received. **REVOKE EXECUTE FROM PUBLIC, anon, authenticated** (postgres + service_role retained; no body / schema / data change). **Verification (read-only):** grants now `anon=false / authenticated=false / service_role=true` (ACL `{postgres, service_role}`); security advisors **0028 + 0029 cleared** for `upsert_publish_profile`; **advisor 0011 `function_search_path_mutable` still present** (search_path pin deferred — optional rider, out of scope; body's only object ref is already schema-qualified); **function body unchanged** (grant-only change; SECURITY DEFINER + signature intact). **Rollback:** `GRANT EXECUTE ON FUNCTION public.upsert_publish_profile(uuid,text,text,text,text,text,boolean,boolean) TO anon, authenticated, PUBLIC;` (single statement; no data impact).
**Phase 2 Batch-1 — APPLIED + VERIFIED (2026-06-16):** migration `sec_d_2026_06_16_002_phase2_batch1_pipeline_rpc_lockdown` (version `20260616092242`) via Supabase `apply_migration`; review `34e6d809-4c13-4d35-8b0b-ca0798ca6279`; PK approval phrase received. **REVOKE EXECUTE FROM PUBLIC, anon, authenticated** (service_role + postgres retained; no body / search_path / schema / data change) on 6 internal RPCs, each caller-confirmed to a single content-engine service-role Edge Function:
- `mark_drafts_notified(uuid[])` — draft-notifier EF; writes `m.post_draft.notification_sent_at`.
- `crosspost_facebook_to_linkedin(integer,integer)` — linkedin-zapier-publisher EF; disabled no-op since D154.
- `heal_reset_stuck_queue(uuid)` — pipeline-healer EF; resets `m.post_publish_queue`.
- `heal_reset_stuck_ai_jobs(uuid)` — pipeline-healer EF; resets `m.ai_job`.
- `resolve_pipeline_incident(uuid,text,text)` — pipeline-healer EF; updates `m.pipeline_incident`.
- `set_draft_video_script(uuid,jsonb)` — ai-worker EF; updates `m.post_draft`.
**Verification (read-only):** all 6 now `anon=false / authenticated=false / service_role=true` (ACL `{postgres, service_role}`). Security advisor: 4 of 6 cleared (mark_drafts_notified, heal_reset_stuck_queue, heal_reset_stuck_ai_jobs, set_draft_video_script). **`resolve_pipeline_incident` — advisor-cache lag:** still listed under anon/authenticated SECDEF-executable, but live grants prove `anon=false`/`authenticated=false` (revoke confirmed at the grant level; advisor expected to refresh). **`crosspost_facebook_to_linkedin` — advisor 0011 `function_search_path_mutable` remains** (no pinned search_path; expected/out-of-scope — optional rider). Function bodies unchanged (grant-only). **Rollback:** per-function `GRANT EXECUTE … TO anon, authenticated, PUBLIC` (no data impact).

### D-2026-06-16-001  ·  HIGH  ·  closed-action-taken  (remediated + verified 2026-06-16)
**Role:** db-rls-auditor (read-only confirmation) · **Raised:** 2026-06-16 Sydney
**Issue:** Two pre-existing `public.advance_avatar_*` SECURITY DEFINER functions are executable by `anon` and `authenticated` (and PUBLIC) and mutate `c.brand_avatar` with owner (postgres) rights — an unauthenticated REST/RPC caller can drive avatar generation-state transitions:
- `public.advance_avatar_to_creating(p_brand_avatar_id uuid, p_group_id text, p_image_url_list jsonb)` (oid 92380) — sets group_id/image_url_list, flips `avatar_gen_status`→'training'.
- `public.advance_avatar_to_training(p_brand_avatar_id uuid, p_group_id text)` (oid 92367).
Both `prosecdef=true`, owner=postgres; `proacl` grants EXECUTE to anon, authenticated, PUBLIC, service_role. Confirmed via Supabase security advisor (`anon_security_definer_function_executable`, `authenticated_security_definer_function_executable`). Related advisor flag: `function_search_path_mutable` (no `SET search_path`) on both.
**Provenance:** PRE-EXISTING — migration `20260409122159_heygen_avatar_secdef_functions`; unrelated to `agp_d01_2_migration_brand_avatar_priority_default_markers` (20260616015419). Surfaced during v3.58 verification.
**Repo/prod drift:** `advance_avatar_to_training` has no repo migration capturing its current definition (only `advance_avatar_to_creating`, in `supabase/migrations/20260508003500_f_heygen_rpc_migrations_missing.sql`, which explicitly deferred grant hardening — never written).
**Status:** CLOSED-ACTION-TAKEN — lockdown applied + verified 2026-06-16 (see Resolution below).
**Recommended remediation (NOT applied; PK-gated, separate lane):** via a NEW sequentially-named migration — `REVOKE EXECUTE ON FUNCTION public.advance_avatar_to_creating(uuid, text, jsonb), public.advance_avatar_to_training(uuid, text) FROM anon, authenticated, PUBLIC;` (leaving service_role only); add `SET search_path = ''` to both; re-capture `advance_avatar_to_training` in repo for parity. PUBLIC-only revoke is insufficient on Supabase.
**Evidence:** db-rls-auditor read-only confirmation (agentId a0e5e7c3d491298b6), 2026-06-16.
**Resolution (2026-06-16) — CLOSED-ACTION-TAKEN, lockdown applied + verified:**
- **Migration:** `sec_d_2026_06_16_001_advance_avatar_rpc_lockdown` (via Supabase `apply_migration`).
- **D-01 review:** `f3b2fd2a-3948-454f-acd1-bfa7fb4a6af4`.
- **Grants:** `REVOKE EXECUTE` from PUBLIC, anon, authenticated on both `advance_avatar_to_creating(uuid, text, jsonb)` and `advance_avatar_to_training(uuid, text)`; **service_role retained**.
- **Hardening:** `search_path` pinned on both functions (closes `function_search_path_mutable`).
- **Function bodies unchanged**; **`c.brand_avatar` data unchanged** (no backfill, no DML).
- **Advisor:** `advance_avatar_*` findings **cleared** (no longer flagged under `anon_/authenticated_security_definer_function_executable`).
- **Rollback:** available (re-grant EXECUTE if needed).
- **Residual:** broader systemic SECURITY DEFINER / `search_path` exposure across other functions noted as **separate and non-blocking** (out of scope for this finding).

---

## Recently closed (last 30 days)

### Cycle 2 — 2026-04-30 Data Auditor

#### F-2026-04-30-D-001  ·  MEDIUM  ·  closed-action-taken
**Role:** Data Auditor · **Closed:** 2026-04-30 evening Sydney  
**Issue:** `m.ai_job` had two UNIQUE indexes over identical column tuple `(post_draft_id, job_type)` — `ux_ai_job_post_draft_job_type` and `ux_ai_job_unique`. Both bare unique indexes (no constraint backing). Cleanup explicitly deferred in the 27 Apr migration `stage_12_053_fill_pending_slots_ai_job_upsert`.  
**Action taken:** Migration `audit_drop_redundant_ai_job_unique_index` applied via Supabase MCP per D170. Dropped `ux_ai_job_post_draft_job_type` (verbose duplicate); kept `ux_ai_job_unique` as canonical. UPSERT path preserved end-to-end (resolves on column tuple, not index name). Pre/post verification: 6 → 5 indexes on `m.ai_job`.  
**Severity-honest note:** Could have been HIGH given the explicit deferral; auditor's MEDIUM rating was conservative but still actionable.  
**Calibration v2 retroactive classification (2026-05-03):** Severity FP — deflation. Anchor 1 (Deferral-aware grading) would have caught this: explicit prior deferral aged out → severity floor HIGH. Closure type: **symptomatic** (DDL drop without constraint to prevent recurrence; cross-cycle pattern still possible).  
**Run file:** `runs/2026-04-30-data.md`

#### F-2026-04-30-D-002  ·  MEDIUM  ·  closed-action-pending
**Role:** Data Auditor · **Closed:** 2026-04-30 evening Sydney  
**Issue:** `m.slot` missing index on `filled_draft_id`. Auditor expected the index per role definition; Phase B / Phase C will lookup slots via this column.  
**Action pending:** B19 backlog item created in `docs/00_action_list.md`. Trigger to promote: `m.slot.n_live_tup > 5000` OR EXPLAIN-evidenced seq scan with measurable cost (whichever fires first). At current 159 live tuples, Postgres correctly chooses seq scans (idx_scan_pct on the table is already 97.1% via existing indexes for queries that benefit). Adding the index now would yield no measurable improvement.  
**Forward note:** Audit role expectations could be refined to be row-count-aware ("index expected OR table is below threshold size"). Captured for next role iteration.  
**Calibration v2 retroactive classification (2026-05-03):** Severity FP — inflation. Anchor 2 (Row-count-aware grading) would have caught this: 159 < 5000 threshold → grade LOW (or Observation) with promotion trigger. Closure type: **pending** (backlog with row-count trigger captured; not yet executed).  
**Run file:** `runs/2026-04-30-data.md`

#### F-2026-04-30-D-003  ·  LOW  ·  closed-action-taken (calibration v2: re-classified as Process — would be P-2026-04-30-001 under new convention)
**Role:** Data Auditor · **Closed:** 2026-04-30 evening Sydney  
**Issue:** Snapshot Section 15 omitted `f.canonical_content_body` despite Data Auditor role naming it as a hot table; Phase B body-health gate makes its indexes auditor-relevant.  
**Action taken:** Verified `f.canonical_content_body` has all expected indexes (PK on `canonical_id`, `idx_ccb_status` on `fetch_status`, `idx_ccb_active_pick` partial composite supporting the body-health gate filter pattern, plus two more for classifier and retention paths). No DDL change needed. Snapshot brief refreshed at this commit — Section 15 now includes `f.canonical_content_body` as the 5th hot table.  
**Calibration v2 retroactive classification (2026-05-03):** Process FP — about audit infrastructure (snapshot brief), not data model. Under new ID convention this would be `P-2026-04-30-001`. Step 0 (Brief consistency check, Decision 4) would have caught this at the start of the cycle as a Process finding. Closure type: **symptomatic** (single brief refresh; Step 0 mechanism prevents recurrence going forward).  
**Run file:** `runs/2026-04-30-data.md`

#### F-2026-04-30-D-004  ·  LOW  ·  closed-action-taken (calibration v2: re-classified as Process — would be P-2026-04-30-002 under new convention)
**Role:** Data Auditor · **Closed:** 2026-04-30 evening Sydney  
**Issue:** Snapshot Section 13 reported a count of 162 public functions but did not itemise them; auditor cannot verify intentional RPC exposures vs misplaced/legacy functions from a count alone.  
**Action taken:** Snapshot brief refreshed at this commit — Section 13 now emits a JSON array of `{name, args, return_type}` objects. Tomorrow's run will produce the full inventory. Classification (`rpc_exposed | compatibility | legacy | unknown`) deferred to a future iteration: requires either grep-of-EF-source evidence (out of Tier 0 scope) or human judgment. Mechanical inventory is sufficient for cycle 3.  
**Calibration v2 retroactive classification (2026-05-03):** Process FP — about audit infrastructure (snapshot brief), not data model. Under new ID convention this would be `P-2026-04-30-002`. Step 0 (Brief consistency check, Decision 4) would have caught this at the start of the cycle. Closure type: **symptomatic** (single brief refresh).  
**Run file:** `runs/2026-04-30-data.md`

---

### Cycle 1 — 2026-04-28 Data Auditor

### F-2026-04-28-D-001  ·  HIGH  ·  closed-action-taken
**Role:** Data Auditor · **Closed:** 2026-04-28 · **Scope expanded mid-closure**
**Issue:** Phase B / slot-driven tables created 22-27 Apr 2026 had no purpose registered in `k.table_registry` (31 tables across c, f, m, t schemas).
**Action taken:** Backfilled ALL 56 ICE tables that were missing purpose — original scope was 31 Phase B tables, operator extended to also close the 25 older entries (pre-22 Apr) in the same session.
- Migration 1: `20260428040000_audit_f001_phase_b_table_purposes_backfill` (commit `491e157`) — 31 Phase B tables.
- Migration 2: `20260428043000_audit_f001_followup_older_table_purposes_backfill` (commit `8b2d669`) — 25 older tables.
- **Coverage: 72.0% → 100.0% across all 7 ICE schemas (200/200 ICE tables documented).**
- Schema verification performed on uncertain entries (`c.brand_stakeholder` / `c.brand_avatar` / `c.client_avatar_profile` chain, `c.platform_channel`).
**Forward discipline:** New tables ship with purpose registered at creation, not retroactively (Lesson #35).
**Calibration v2 retroactive classification (2026-05-03):** Severity grade accurate. Closure type: **structural** (PENDING_DOCUMENTATION sentinel + 14-day grace + DEFERRED escape hatch deployed via slice 1 audit recurrence prevention; structural mechanism deployed in same closure window).
**Run file:** `runs/2026-04-28-data.md`

### F-2026-04-28-D-002  ·  MEDIUM  ·  closed-action-pending
**Role:** Data Auditor · **Closed:** 2026-04-28
**Issue:** `c` and `f` schemas at 0% column-purpose coverage in `k.column_registry` (479 + 195 = 674 columns).
**Action pending → action-taken via 4-shift same-day apply:** Three-phase plan executed (P1 + P2 + P3) plus 4th-shift LOW resolution. c+f coverage 0% → 21.1%. F-002 transitions to closed-action-taken at end of session.
**30 Apr update:** Phase D ARRAY mop-up advanced c+f from 0% to 22.1%. Slot-core / post-publish / pipeline-health-pair / operator-alerting-trio briefs each advanced m schema from 9.2% → 39.94%. Cycle 2 observation O-001 carries this forward; not re-raised as a new finding.  
**Calibration v2 retroactive classification (2026-05-03):** Severity grade accurate. Closure type: **pending → ultimately structural** (multi-phase backfill not in itself a structural mechanism, but cycle 1 produced PENDING_DOCUMENTATION sentinel that prevents new column gaps from accumulating without operator awareness).  
**Run file:** `runs/2026-04-28-data.md`

### F-2026-04-28-D-003  ·  MEDIUM  ·  closed-action-taken
**Role:** Data Auditor · **Closed:** 2026-04-28
**Issue:** Two `stage_12_053_fill_pending_slots_ai_job_upsert` migrations applied 1 hour apart on 27 April with different SQL (20360 vs 18707 chars, different hashes). The 052 pair has different names so is fine; the 053 pair is a real discipline gap.
**Action taken:** Forward rule locked at `docs/audit/decisions/migration_naming_discipline.md` (commit `1157671d`): a migration name is a permanent identity; fix iterations get a new sequential number AND a distinguishing suffix. Detector function `k.fn_check_migration_naming_discipline()` deployed via audit slice 1 migration (commit `27ff3b3`).
**Forward discipline:** Migration names are permanent (Lesson #36).
**Calibration v2 retroactive classification (2026-05-03):** Severity grade accurate. Closure type: **structural** (detector function `k.fn_check_migration_naming_discipline()` deployed; future violations surface automatically).  
**Run file:** `runs/2026-04-28-data.md`

---

## Audit run history

| Run date | Role | Findings raised | Findings still open | Run file | Closure effectiveness |
|---|---|---|---|---|---|
| 2026-04-28 | Data Auditor | 3 (1H, 2M) | 0 | `runs/2026-04-28-data.md` | 67% structural |
| 2026-04-30 | Data Auditor (cycle 2) | 4 (2M, 2L) | 0 | `runs/2026-04-30-data.md` | 0% structural |

---

## Forward-discipline lessons captured

*Lessons added during cycles that subsequent audit runs must respect. The pre-raise lesson-honor check (Decision 7) requires the auditor to consult this section before raising any candidate finding.*

### Canonical lessons (active, with mechanism)

- **Lesson #35** — New tables ship with both table and column purposes at creation time, not retroactively. **Mechanism:** PENDING_DOCUMENTATION sentinel + 14-day grace + DEFERRED escape hatch (deployed via migration `20260428051500_audit_slice1_pending_documentation_sentinel`). Source: F-2026-04-28-D-001 closure.
- **Lesson #36** — A migration name is a permanent identity once applied. Fix iterations get a new sequential number AND a distinguishing suffix. **Mechanism:** detector function `k.fn_check_migration_naming_discipline()` returns same-name-different-SQL violations on demand. Source: F-2026-04-28-D-003 closure.
- **Lesson #37** — ChatGPT external review of CC proposals before apply. **Mechanism:** chatgpt-review-worker MCP tool deployed 2026-05-02; protocol codified at `docs/runtime/mcp_review_protocol.md` v2.17. Source: F-2026-04-28-D-002 Phase A closure.
- **Lesson #38** — Verification = count-delta not time-window (refresh bumps `updated_at`). **Mechanism:** standing rule for any closure migration that updates `k.column_registry` rows. Source: F-2026-04-28-D-002 Phase B closure.
- **Lesson #39** — Chat sanity-samples JSONB shape across rows — single-row checks miss cross-row diversity. **Mechanism:** standing rule baked into V3 brief wording for JSONB documentation work. Source: F-2026-04-28-D-002 Phase C closure.
- **Lesson #40** *(promoted candidate → canonical 2026-05-03 R01 calibration v2)* — Tool errors are not semantically meaningful. MCP tool errors (404, empty result, connection error, schema mismatch) are not necessarily semantic absences. Cross-check with a different tool, a second MCP server, or shell access before treating tool errors as ground truth. **Mechanism:** standing pre-flight rule for inventory-style work (branches, files, rows) — prefer authoritative cross-source verification when available. Source: `candidates_cycle_2.md` C2-CAND-002 (chat-side phase-1 branch hygiene inventory, 2026-04-28 evening).
- **Lesson #41** *(promoted candidate → canonical 2026-05-03 R01 calibration v2)* — Audit role expectations should be row-count-aware where applicable. "Index expected on column X" must be qualified "OR table is below threshold size where seq scan is correct". **Mechanism:** Section 5 of `data_auditor.md` rewritten with row-count-conditioned expectations + 5,000-row threshold + EXPLAIN check + `pg_stat_user_tables` promotion query. Cross-references Calibration Anchor 2 (row-count-aware grading). Source: F-2026-04-30-D-002 closure.
- **Lesson #42** *(promoted candidate → canonical 2026-05-03 R01 calibration v2)* — When a brief specifies a hot-table list against a role definition, the brief should mirror the role's full hot-table set. **Mechanism:** Step 0 (Brief consistency check) added to `data_auditor.md` "How you work each cycle" — auditor verifies brief covers role-defined surfaces before reading the snapshot. Brief gaps trip Process findings. Source: F-2026-04-30-D-003 closure.

### Promotion rules

If a future audit run re-raises a finding that overlaps with one of these canonical lessons, the auditor must apply the pre-raise lesson-honor check (`data_auditor.md` § Output format):

- Mechanism is operational → Observation referencing the lesson, not a finding
- Mechanism is broken or missing → **Process finding** (P-prefix), not a Data finding
- Lesson exists with no mechanism → Data finding with explicit promotion proposal

A closure that adopts a promotion proposal counts as **structural** for closure-effectiveness purposes (Decision 6).

---

## Calibration history

| Date | Session file | Trigger | Decisions made |
|---|---|---|---|
| 2026-05-03 | `docs/runtime/sessions/2026-05-03-r01-calibration.md` | Severity miscalibration + closure effectiveness 28.6% (below 50% target) + 2 unpromoted lesson candidates | 7 decisions: split D/P findings; compact severity table + Calibration Anchors; row-count-aware indexing; Step 0 brief check; pre-raise overlap + recurrence escalation; Closure effectiveness metric; lesson-honor closure type. Lessons #40, #41, #42 promoted candidate → canonical. |
