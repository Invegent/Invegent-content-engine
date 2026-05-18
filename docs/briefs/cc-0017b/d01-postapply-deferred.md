# cc-0017b § 6–8 — D-01 Framing, Post-apply Commitments, Deferred Decisions

**Part of:** [`cc-0017b-friction-register-unified-emit-event.md`](../cc-0017b-friction-register-unified-emit-event.md)
**Prev:** [`hardstop-rollback.md`](hardstop-rollback.md) **Next:** [`lessons-metadata-changelog.md`](lessons-metadata-changelog.md)

---

## 6. D-01 framing

Before applying the migration, fire D-01 via `ask_chatgpt_review` with these fields:

### decision_under_review

> Apply cc-0017b Wave 0b unified emit_event migration (`cc_0017b_friction_unified_emit_event`) to the live `friction.*` schema in Supabase `mbkmaxqhsohbtwsqolns`. Second execution step of the Friction Register Consolidation Plan v1 + amendments + §5.5. Migration is a **substantial behavioural change**: introduces canonical `friction.emit_event` entrypoint, rewrites the BEFORE INSERT trigger function on `friction.event` to use GUC-bypass + defence-in-depth, migrates the 3 existing emit_* functions to thin wrappers, adds `dynamic_context` jsonb column on `friction.event`, extends `event.category_source` CHECK with `'category_override'` (one new value; NOT adding `'severity_override'` per PK directive 2026-05-18 — severity override provenance stored in `dynamic_context` instead), seeds 3 emission_rule rows. Backward-compatible: all 3 wrapper signatures preserved exactly; existing callers (cron 85 trigger, Cowork nightly brief, FAB dashboard) require zero changes.

### production_action_if_approved

> Run `apply_migration` MCP call with the SQL union of [`migration-sql-part-a.md`](migration-sql-part-a.md) Steps 1–6 and [`migration-sql-part-b.md`](migration-sql-part-b.md) Steps 7–11 — single atomic transaction. After apply returns success, run the 27 V-checks (V-B1–V-B27) sequentially via `execute_sql`. If all V-checks pass (modulo V-B22 which may be SKIPPED-BY-PK-DIRECTION), close cc-0017b Wave 0b with a 4-way atomic sync (sync_state v2.82 + action_list v2.82 + per-session file + dashboard PHASES if reconciled). If any V-check fails, hard-stop and roll back per [`hardstop-rollback.md`](hardstop-rollback.md).

### consequence_if_delayed

> Wave 1 (cc-0018 — compliance reviewer emission) cannot begin without 0b's `emit_event` entrypoint and `emission_rule` registry being live. 10 pending compliance reviews from May 1 remain invisible in `/operations`. 16 daily reconciliation drift events (cron 85) continue to be emitted via the legacy md5 path with the broken-EXISTS-lookup attach logic — each emission spawns its own case; the spine continues to accumulate at ~16 cases/day. The 444 dead items + 116 past-due + 141 fixer escalations + 6 unacknowledged slot_alerts + 7 open `m.pipeline_incident` rows remain invisible because Waves 1–6 all depend on 0b. Operator backlog grows weekly without visibility.

### cost_of_waiting

> Per-day cost is moderate (cases accumulating, backlog growing). Every wave skipped extends the plan timeline ~3–5 days. The 10-wave plan was scoped for ~10 weeks of execution; 0b is the unblocker for Waves 1–6. Delay beyond ~5 days warrants reconsidering whether locks (especially Amendment E's dynamic_context provenance, Amendment G's reopen marker semantics, §5.5 Clarification 1's N=14d) need re-verification before proceeding.

### current_evidence

> 1. Read-only introspection 2026-05-18 Sydney evening pre-D-01 confirmed all 7 expected schema-state items: 3 emit_* function exact signatures; CHECK constraints on event.reported_by (5-value enum) + event.category_source (3-value enum); 4 triggers in place; emission_rule + notification_policy column shapes match cc-0017a spec; UNIQUE (source, source_event_id) ALREADY enforced on friction.event; transition-window NULL count = 0 (no cases created since cc-0017a apply at 06:56:10 UTC).
> 2. Empirical drift_type universe in r.cadence_drift_log = single value `'observer_stale'` (12 rows); reconciliation events in friction.event = single problem_key `'observer_stale'` (9 events).
> 3. Empirical health_check problem_key universe = 5 values all matching `'true-stuck-*'` pattern → 3-tier wrapper logic (explicit field → parse → emit_error) covers all observed shapes.
> 4. Event fingerprint format: ALL 32-char md5 (legacy); case fingerprint format: ALL 64-char sha256 (cc-0017a backfill). Cross-format documented and acceptable.
> 5. Wave 0a closed with 20/20 V-check PASS at v2.81.
> 6. PK directives 2026-05-18 incorporated: GUC trigger bypass (cleaner than WHEN clause), source_event_id idempotency (schema already enforces via UNIQUE), p_category_override added (extension to Amendment E), reported_by enum-safe mappings (system/system/pk), reopen marker semantics locked (`resolution_kind='reopened'` as transient state marker + `reopen_count` as monotonic recurrence counter; severity REPLACES on reopen per PK directive), category_source NOT extended with `'severity_override'` (provenance in dynamic_context instead per PK directive), `'category_override'` added only for non-manual paths.
> 7. Migration body is single atomic transaction. PostgreSQL DDL semantics guarantee all-or-nothing.
> 8. Rollback path (§5.5) tested in principle — DROPs new objects + restores cc-0014 function bodies verbatim. Requires apply-time P2 body capture for 5.5.5c and 5.5.5d.
> 9. Apply timing recommendation: outside 03:30 AEST (cron 85) and 02:00 AEST (cron 86) windows.
> 10. emission_rule seed list (3 rules) is complete for current production emitters; new condition_keys require INSERT (strict contract per Decision 5).
> 11. 27 V-checks cover: schema state (V-B1–V-B9), happy-path semantics (V-B10–V-B12), reopen semantics (V-B13–V-B14), override semantics (V-B15–V-B17), failure modes (V-B18–V-B19), trigger defence (V-B20–V-B21), wrapper end-to-end (V-B22–V-B24), invariant safeguard (V-B25), security (V-B26), cleanup (V-B27).

### known_weak_evidence

> 1. **V-B22** (synthetic reconciliation INSERT) has live side effects on `r.cadence_drift_log`. Skip-by-direction option exists; apply session decides at runtime.
> 2. **V-B25 concurrency invariant** is exercised via sequential dispatch (10 calls in a DO block). True concurrent dispatch would require `pg_background` or external pgbench — out of scope for in-migration V-check. The race-retry pattern in `fn_attach_or_create_inner_v1` is theoretically sound (`FOR UPDATE` row lock + `unique_violation` catch + max 1 retry) but not exercised under true contention this session. Wave 1+ production load will surface any race issues empirically.
> 3. The **3-tier condition_key resolution** in `fn_emit_health_check_findings` depends on the Cowork nightly brief's JSON contract. If the brief's output changes between cc-0017b apply and the next nightly fire (highly unlikely without explicit edit), the wrapper might emit_error-skip more findings than expected. V-B23 tests all 3 tiers explicitly.
> 4. The **`dynamic_context` column** accepts arbitrary jsonb without size cap. A misbehaved caller could write very large payloads. No CHECK enforces size in v1; can be added later if misused.
> 5. The **legacy md5 event fingerprints** on the 22 existing events remain forensic-only. Cross-format dedupe between historical events and future sha256 events does not work; this was documented in cc-0017a v1.1 risks and remains acceptable.
> 6. The **Cowork nightly brief's current JSON output does NOT yet include an explicit `condition_key` field** per finding — tier 1 of the wrapper's resolution will not fire under current production conditions. Tier 2 (parse `true-stuck-*` fallback) covers all 5 current problem_keys. Future Cowork brief amendments (out of scope here) could add the explicit field to push more findings through tier 1.
> 7. The **`severity_override` value is intentionally NOT added** to the category_source CHECK enum (per PK directive). The audit lives in `dynamic_context`. A reviewer querying `WHERE category_source = 'severity_override'` would get zero rows — they should query `WHERE dynamic_context ? 'severity_override'` instead. Documented as query-pattern note in §7 post-apply commitments.
> 8. The **rollback paths 5.5.5c and 5.5.5d** (`fn_emit_health_check_findings` body + `fn_emit_manual_event` body) are NOT included verbatim in this brief — the apply session must capture them from pre-flight P2 output. Intentional (avoid stale snapshots in brief) but introduces a dependency on apply-time discipline.

### default_action

> If D-01 returns `partial` with type-(b) substantive findings: address each in a v1.1 patch (per cc-0017a v1.0→v1.1 precedent), re-fire D-01. If D-01 returns `partial` with type-(c) generic consistency-bias only: proceed to apply per the satisfy-corrected-action path (Path A) with explicit rationale in the close-the-loop UPDATE on `m.chatgpt_review`. If D-01 returns `escalate=true` with material concerns: hard-stop, address, re-fire. If D-01 approval is delayed > 5 days from authoring: re-verify pre-flight P-set fully (especially P5/P6/P7/P8/P11/P12 — emission_rule rows, CHECK constraints, function bodies) against any inter-session drift before proceeding. cc-0017a precedent: Path B (apply in separate session) is permitted but raises L-v2.81-a coordination risk; recommend designating a single applying chat per Path B clearance.

---

## 7. Post-apply commitments

### Pass path (all required V-checks PASS)

Close cc-0017b with **4-way atomic sync** via `push_files`:

1. **`docs/00_sync_state.md` → v2.82** — cc-0017b CLOSED-APPLIED; Wave 1 (cc-0018 compliance) execution gate now open. Per-session file at `docs/runtime/sessions/YYYY-MM-DD-cc-0017b-applied.md` referenced inline.
2. **`docs/00_action_list.md` → v2.82** — cc-0017b moved from Active P1 rank 1 to Closed; Wave 1 brief authoring promoted to Ready.
3. **`docs/runtime/sessions/YYYY-MM-DD-cc-0017b-applied.md`** — per-session detail file with: P-set output capture (including P2 function bodies for future rollback reference), V-check results table, migration version returned by apply_migration, any SKIPPED-BY-PK-DIRECTION notes, close-the-loop fields.
4. **`app/(dashboard)/roadmap/page.tsx`** in invegent-dashboard — PHASES array Wave 0b status + lastUpdated. **OR** 35th consecutive deferral logged in sync_state if PK opts to roll the dashboard reconciliation forward.

Additional close-out actions:
- Close-the-loop `UPDATE` on `m.chatgpt_review` for the D-01 fire — status=`resolved`, `action_taken` describes the satisfy path, `resolved_by` set to authoring chat slug.
- Update memory entries: phase status (Phase 3 unchanged; cc-0017b adds to closed-build inventory), pending items (remove cc-0017b, promote cc-0018).
- **Document the `severity_override` query-pattern note** in `docs/06_decisions.md`: "to find emissions with severity overrides, query `dynamic_context ? 'severity_override'`, NOT `category_source = 'severity_override'`. The latter returns zero rows per PK directive 2026-05-18."
- Wave 1 (cc-0018 compliance reviewer) authoring may begin.

### Fail path (any hard-stop)

1. Run rollback SQL from [`hardstop-rollback.md`](hardstop-rollback.md) (including verbatim cc-0014 bodies from pre-flight P2 capture).
2. Verify post-rollback state matches cc-0017a Wave 0a baseline (re-run pre-flight P1–P11; should match v2.81 state).
3. Author v1.1 patch addressing the specific failure mode.
4. Re-fire D-01.
5. Log the failure + remediation in `docs/runtime/sessions/YYYY-MM-DD-cc-0017b-failed.md`.

### What this brief does NOT unlock

- Wave 0c (REVOKE direct INSERT + NOT NULL on case.dedupe_fingerprint + FK from event.source + emission_rule_history trigger) — separate brief
- Any Wave 1+ emitter wiring (compliance, doctor, sentinel dual-write, slot_alerts, token) — separate briefs
- Telegram lifecycle trigger — Wave 2 (cc-0023)
- Pool view — Wave 7 (cc-0015)

### What this brief enables

- All future friction emissions through the canonical `emit_event` entrypoint
- Per-emitter rule changes without function-body edits (INSERT/UPDATE `emission_rule` rows)
- Severity and category overrides per-emission with full audit provenance in `dynamic_context`
- Idempotent replay protection at schema + function level (UNIQUE + EXCEPTION catch → `idempotent_replay` disposition)
- Dedupe via sha256 canonical fingerprint with race-safe attach + 14-day reopen window + predecessor link
- GUC bypass discipline for defence-in-depth direct-INSERT auditing (`BYPASS-DEFENCE` emit_error rows)

---

## 8. Open decisions deferred to Wave 0c / later waves

1. **Adding `'severity_override'` to category_source enum** — explicitly deferred (PK directive 2026-05-18: store provenance in `dynamic_context`). If future analysis shows querying jsonb is too slow at scale, revisit and add the enum value with backfill from `dynamic_context` audit.
2. **Per-source tunable reopen window** — v1 locks 14 days globally. v2 work if empirical data shows different sources need different windows.
3. **`emission_rule_history` audit trigger** — Wave 0c (paired with Amendment F REVOKE work). Logs every emission_rule INSERT/UPDATE/DELETE.
4. **CHECK constraint on `dynamic_context` size** — Wave 0c or later maintenance if column starts misuse.
5. **Renaming `fn_promote_event_to_case` → `fn_attach_or_create_v2`** — purely cosmetic; defer to a cleanup wave.
6. **Adding a separate `severity_source` column** — rejected for v1 per Amendment E + PK directive. Revisit only if `dynamic_context` query performance becomes a problem.
7. **Backfilling `resolved_at` on existing 22 cases** — Wave 0c (none currently in closed state per v2.81 audit; new cases closed via emit_event reopen path get correct semantics).
8. **Telegram notification on case INSERT** — Wave 2 (cc-0023).
9. **Pool view design with 1-week empirical volume data** — Wave 7 (cc-0015).
10. **Cross-source dedupe** (same underlying problem reported by sentinel + doctor) — v2 work after empirical examples surface.
11. **REVOKE direct INSERT on friction.event from authenticated** — Wave 0c (Amendment F). emit_event already has the GRANT in 0b in preparation.
12. **FK constraint from `friction.event.source` to `friction.source.source_code`** + DROP CHECK on event.source — Wave 0c (decouples source registry from hardcoded enum).

---

**Next:** [`lessons-metadata-changelog.md`](lessons-metadata-changelog.md) — lessons reference + authoring metadata + changelog.
