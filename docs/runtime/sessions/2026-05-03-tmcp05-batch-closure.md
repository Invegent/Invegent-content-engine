# 2026-05-03 late evening Sydney — T-MCP-05 batch closure + grants hardening break-glass

> **Status:** T-MCP-05 closed end-to-end. 5 m.chatgpt_review rows updated to status='completed' via reusable SECURITY DEFINER function `public.close_chatgpt_review`. Post-apply ACL verification surfaced a hardening gap (anon/authenticated had inherited Supabase default EXECUTE grants); break-glass D-01 skip recorded; gap closed via second migration. T-MCP-08 candidate now has 3 vindications. New lesson candidate: post-apply ACL verification.

## Headline

PK directed Option A on T-MCP-05 close-the-loop (immediate close, not defer). Reusable SECURITY DEFINER closure function authored, plan_review fired and ESCALATED with corrected_action (validate narratives against session files), validation produced material amendments to 3 of 5 narratives, package re-presented and PK-approved, applied. Post-apply verification surfaced ACL gap missed by ChatGPT review (reviewer can only see proposed SQL, not effective post-apply ACL state). Hardening fix applied as break-glass under explicit PK direction. T-MCP-05 fully closed; reusable closure function persists for future T-MCP-02 quota closures.

Also committed earlier in session: two ready-for-night-job briefs for F-AAP-007 + B-AUDIT-CHECK5-DRIFT (commit f793ddbf).

## Two MCP review fires this session

### Fire #18 — plan_review on T-MCP-05 batch

- review_id: `1bae5068-c77a-40f1-a2a6-769fbc5988b9`
- action_type: `plan_review`
- verdict: partial / risk_level: medium / confidence: medium
- routing: escalate_explicit_flag
- corrected_action: "Conduct a full validation of the narratives against historical records to ensure their correctness and appropriateness for each closed review."
- categorisation: Lesson #62 type (a) actionable — corrected_action requested verification chat could perform; produced new knowledge

### Validation cycle (honouring corrected_action)

Three session files fetched and cross-referenced:
- `docs/runtime/sessions/2026-05-03-t02-ratification.md` (Rows 1+2)
- `docs/runtime/sessions/2026-05-03-faap001-rootcause.md` (Row 3)
- `docs/runtime/sessions/2026-05-03-faap001-002-apply.md` (Rows 4+5)

Material amendments produced:

- **Row 1**: PK's amendment direction was based on understanding "T-MCP-01" was a wrong action_list label. Session file `2026-05-03-t02-ratification.md` actually has "(T-MCP-01 first fire)" referring to TOOL LINEAGE, not row content. Narrative amended to capture both dimensions truthfully.
- **Row 2**: "T02 Gate B body-health gate live" framing imprecise — T02 is the ratification decision; the gate is Phase B body-health, deployed 2026-04-30 03:48 UTC. Amended for precision; +71.3h post-deploy framing added.
- **Row 3**: "three docs-only commits" was wrong — session file shows ONE commit with three FILES. Also: original close-out plan was ESCALATED with corrected_action accepted (do EF source inspection), nuance missing from initial draft. Both amended.
- **Row 4**: largely verified. Minor: "nightly health check will surface" is chat-side inference, acknowledged as such.
- **Row 5**: timestamp clarification. Session file said "~09:35 UTC" but MCP review row created_at was 09:36:16. Per D-01 sequence apply must follow review fire. Amended with explicit note about discrepancy.

Timestamp adjustments:
- Row 2: 03:30 → 04:00 UTC (+71.3h post-deploy fit)
- Row 3: 07:50 → 08:00 UTC (acknowledges EF source read time)

PK approved validated package — option (i) "apply now with validated narratives, no re-fire."

## Migration #1: `t_mcp_05_close_the_loop_v2_28_batch`

Function definition + 5 invocations as one apply_migration unit:
- `public.close_chatgpt_review(p_review_id uuid, p_action_taken text, p_resolved_at timestamptz, p_resolved_by text DEFAULT 'PK', p_terminal_status text DEFAULT 'completed')`
- LANGUAGE plpgsql, SECURITY DEFINER, `SET search_path = pg_catalog, public`
- 4 validation gates (terminal_status whitelist, non-empty text fields, non-null timestamptz, row exists, idempotency)
- UPDATE 4 fields by PK lookup

5 SELECT calls invoking the function on the 5 review_ids with validated narratives + timestamps.

Apply: success.

### Verification round 1 — rows

| review_id | status | resolved_by | escalation_resolved_at | narrative_chars |
|---|---|---|---|---|
| 2bab95d5-... | completed | PK | 2026-05-03 03:05:59+00 | 731 |
| 521628d0-... | completed | PK | 2026-05-03 04:00:00+00 | 507 |
| 1e5ab2eb-... | completed | PK | 2026-05-03 08:00:00+00 | 784 |
| 745482fb-... | completed | PK | 2026-05-03 09:25:00+00 | 1230 |
| d4e25cfa-... | completed | PK | 2026-05-03 09:38:00+00 | 1779 |

Status distribution: 12 escalated / 6 completed (pre-session) → 8 escalated / 11 completed (post-apply). Math reconciles cleanly: 12 − 5 (closed this batch) + 1 (new fire #18 itself in escalated state) = 8 escalated; 6 + 5 = 11 completed.

### Verification round 2 — function ACL: GAP SURFACED

Expected per migration source (REVOKE ALL FROM PUBLIC + GRANT EXECUTE TO service_role):
- service_role only

Actual:
- anon: EXECUTE
- authenticated: EXECUTE
- postgres: EXECUTE
- service_role: EXECUTE

**Root cause**: Supabase default ACL grants EXECUTE on public-schema functions individually to anon/authenticated/service_role, not via PUBLIC pseudo-role. REVOKE ALL FROM PUBLIC was a no-op against those role-specific grants.

**Risk**: function is SECURITY DEFINER. Any anon/authenticated caller could close any pending escalated review row with arbitrary action_taken text. Idempotency guard prevents re-close, not first-close.

**Why ChatGPT plan_review missed it**: reviewer sees only proposed SQL, not effective post-apply ACL state.

## Migration #2: `t_mcp_05_close_chatgpt_review_grants_hardening`

Two-line REVOKE under explicit PK break-glass direction:
```sql
REVOKE EXECUTE ON FUNCTION public.close_chatgpt_review(uuid, text, timestamptz, text, text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.close_chatgpt_review(uuid, text, timestamptz, text, text) FROM authenticated;
```

D-01 status: **BREAK-GLASS SKIP** recorded. PK explicit ("pragmatic skip of D-01 is recorded as a break-glass fix for an active security gap introduced in the current session"). Honoured Lesson #36 forward-evolution naming (no `_corrected` suffix; this is hardening, not bug fix in original SQL).

Apply: success.

### Verification round 3 — function ACL post-hardening: clean

- postgres: EXECUTE (superuser, cannot revoke)
- service_role: EXECUTE (intended)
- anon: revoked
✅
- authenticated: revoked ✅

Gap closed.

## Note on PK "Verification Complete" message mid-session

PK's mid-session message claimed the REVOKE statements had been applied with verification complete. Direct ACL query showed grants unchanged from pre-fix state. Possibilities: (a) PK's message was framed as a directive for chat to execute, (b) PK ran SQL externally that didn't take effect, (c) report was generated from another tool and didn't actually fire DDL. Trust-but-verify discipline caught the discrepancy. Chat applied REVOKE itself and verified clean state. Worth noting as pattern: even authoritative-sounding status reports require ground-truth verification for production-state claims.

## Mutations log

| When | Action | Type |
|---|---|---|
| Session-start | Read `docs/00_sync_state.md` + `docs/00_action_list.md` via GitHub MCP | Read |
| Session | Two briefs drafted + pushed (F-AAP-007 + B-AUDIT-CHECK5-DRIFT) | Git push f793ddbf |
| Session | `m.chatgpt_review` schema lookup via `information_schema.columns` | sql_read |
| Session | 5-row state lookup (current state, action_taken, etc.) | sql_read |
| Session | SECURITY DEFINER function search + status vocab check | sql_read |
| Session | plan_review MCP fire (review_id `1bae5068-...`) ESCALATED | DML auto by EF |
| Session | 3 session files fetched for narrative validation | Read (GitHub MCP) |
| Session | Migration #1 `t_mcp_05_close_the_loop_v2_28_batch` applied | DDL via apply_migration |
| Session | Verification round 1: 5-row state | sql_read |
| Session | Verification round 2: function ACL (gap surfaced) | sql_read |
| Session | Migration #2 `t_mcp_05_close_chatgpt_review_grants_hardening` applied | DDL via apply_migration (break-glass D-01 skip) |
| Session | Verification round 3: function ACL post-hardening | sql_read |
| (this commit) | Session record + sync_state + action_list v2.29 + 2 migration .sql files for repo traceability | Git |

**Production DML**: 0 (all mutations via DDL apply_migration; the 5 UPDATEs ran inside SECURITY DEFINER function as postgres). **DDL**: 2 migrations. **EF deploys**: 0.

## Standing rules honoured + exceptions

- **D-01**: honoured for migration #1 (plan_review fire #18, ESCALATED, corrected_action honoured via validation cycle, no re-fire required since amendments were narrative precision not plan substance change). Migration #2 was BREAK-GLASS SKIP under explicit PK direction — recorded as session-local exception, not standing-rule erosion.
- **D-170**: chat applies migrations only. Both migrations applied via Supabase MCP `apply_migration`. ✅
- **D-186**: closure budget +~0.7h end-to-end. Trailing-14-day 13.1h → ~13.8h. Above 8.0 floor.
- **Lesson #62**: type (a) actionable correctly applied for plan_review pushback. Validation produced new knowledge (3 material amendments). Distinct from type (c) consistency-bias.
- **Lesson #36**: forward-evolution naming used for migration #2 (no `_corrected` suffix — this is hardening, not bug fix in original SQL).
- **G1 convention**: this file at `docs/runtime/sessions/`. ✅
- **4-way sync**: docs (this file) + sync_state + action_list updated in this commit; memory edit pending; dashboard skipped (T-MCP-05 is ops housekeeping, not roadmap).

## Lessons captured

### T-MCP-08 reinforced — 3rd vindication; promotable to canonical

Three instances now:
1. v2.27 plan_review (`1e5ab2eb`): EF source inspection corrected_action → root cause confirmed
2. v2.28 sql_destructive (`745482fb`): replay test corrected_action → measured 96 rows, math reconciled
3. v2.28-late plan_review (`1bae5068`): narrative validation corrected_action → 3 material amendments

Pattern shape:
> On MCP escalation where corrected_action requests downstream verification that is one tool-call away from chat, escalation is high-value. The verification produces measured evidence that either confirms, refutes, or amends the original proposal. Distinct from Lesson #62 type-(c) consistency-bias which restates caveats already in the proposal.

Criterion to promote candidate → canonical: 3 vindications met. Promote in next action_list bump.

### NEW lesson candidate — Post-apply ACL verification

**Pattern**: ChatGPT plan_review on a CREATE FUNCTION + GRANT/REVOKE migration cannot verify effective post-apply ACL state. Supabase's default role-specific grants on public-schema functions are not affected by REVOKE FROM PUBLIC.

**Rule candidate**:
> For migrations involving function privileges in Supabase public schema, post-apply verification MUST query `information_schema.routine_privileges` directly and confirm grant table matches intent. REVOKE FROM PUBLIC alone is insufficient — anon and authenticated may still hold individual EXECUTE grants from Supabase defaults.

**First instance**: this session. Second instance pending to promote to canonical.

### Verification cycle compounding signal

This session's verification cycle compounded findings at each layer:
- Plan_review pushback → narrative validation cycle → 3 amendments + reframing
- Apply verification round 1 (rows) → clean
- Apply verification round 2 (ACL) → gap surfaced
- Hardening apply → verification round 3 → clean

Same pattern as F-AAP-001 → F-AAP-002 → F-AAP-007 cycle (audit-cycle compounding). Each verification surfaces the next layer's gap. Healthy. Worth tracking as stat: "verification rounds per apply" (here: 3 rounds for 1 logical action).

## Closure budget impact

This session block: ~0.7h end-to-end:
- Two brief drafts (F-AAP-007 + B-AUDIT-CHECK5-DRIFT) for night-job: ~10min
- T-MCP-05 schema lookup + 5-row review + UPDATE drafting: ~10min
- plan_review MCP fire + 3-session-file validation cross-reference: ~15min
- Migration #1 design + apply + 2 verification rounds: ~10min
- ACL gap surface + migration #2 design + apply + verification round 3: ~10min
- Session-end reconciliation (this commit): ~10min

Trailing-14-day: 13.1h (post-v2.28) + 0.7h (this) = ~13.8h. Comfortably above 8.0 floor.

Open findings P0+P1: T-MCP-05 closed (was a P3 task, not P0+P1, so no count change). Net P0+P1 unchanged.

T-MCP-02 quota: 17 of 5 → **18 of 5** (one new fire #18 this session, `1bae5068-...`).

## Open items / next session

1. **Personal businesses check-in** (P0 standing).
2. **T05 Meta dev support contact** (P1-urgent unchanged).
3. **F-AAP-007 fix** — brief committed at `f793ddbf` in `docs/briefs/2026-05-04-or-later-faap007-fix.md`. Check whether night-job ran pre-flight; if yes, review pre-flight report and proceed to apply path.
4. **B-AUDIT-CHECK5-DRIFT fix** — brief committed at `f793ddbf`. Same flow as F-AAP-007.
5. **B-AUDIT-V4-PEERS-EF read-only audit** (P3, CC-suitable) unchanged.
6. **publish-queue-and-publish CC brief execution** (P2) unchanged.
7. **T-MCP-05-NEW** — close-the-loop UPDATE on the new fire #18 row `1bae5068-...` from this session. Self-similar to T-MCP-05 batch; can use the new `public.close_chatgpt_review` function directly. PK confirmation required.

## Pattern signals captured

- **T-MCP-08** lesson promotable to canonical after this 3rd vindication.
- **New lesson candidate**: post-apply ACL verification must be explicit and distinct from migration intent verification.
- **ChatGPT plan_review limitation**: cannot see post-apply effective state; covers proposed SQL only. Implication: any migration that includes ACL changes needs an explicit post-apply ACL verification step.
- **Trust-but-verify on status reports**: even authoritative-sounding mid-session reports of state changes require ground-truth verification for production-state claims (PK's "Verification Complete" message did not match actual ACL state; chat caught via direct query).

---

## End of segment

T-MCP-05 closed via reusable SECURITY DEFINER function. Hardening gap discovered post-apply via direct ACL verification, closed via break-glass under explicit PK direction. 5 review_ids closed with validated narratives. Function persists for future closure work. Closure budget +~0.7h, trailing-14-day ~13.8h above floor. Two new MCP review rows during session (fire #18 self-similar follow-up logged for next session closure).
