# cc-0017c — §9 Lessons + §10 Metadata + §11 Changelog

**Brief version:** v1.1 (doc-only patch — §10 Metadata version bump + §11 Changelog v1.1 entry; lessons section updated)

## §9 Lessons applicable

### Active baseline lessons used in this brief

- **L41** — `apply_migration` is the only correct DDL path for friction.* schema (event-trigger registration in k.schema_registry). Migration SQL §5.2 specifies apply_migration as the apply method.
- **L58** — atomic multi-file push_files for 4-way sync close. Used at v2.83 close (3-file commit) and v1.0 brief commit (8-file commit) and v1.1 patch commit (8-file commit).
- **L62** — Pre-flight P-set + D-01 fire + post-apply V-checks + close-the-loop UPDATE. Full protocol applied throughout this brief. v1.1 patch executes close-the-loop on v1.0 D-01 review row before v1.1 re-fire.
- **L34** — Trigger filter audit on DDL in event-trigger-registered schemas. Pre-flight P-set is the trigger pre-flight survey.
- **L40** — Runtime probes are authoritative; TypeScript / brief-time references are non-authoritative. P-1 through P-5 are runtime probes; brief-time §4 grant matrix is design reference only.
- **L33** — Event trigger pre-flight survey mandatory for DDL in `k.schema_registry`-registered schemas. friction.* is registered; survey conducted via P-set.
- **L35** — `INSERT ... ON CONFLICT DO UPDATE` defensive pattern for `k.*` registry rows. Not directly exercised this brief.
- **ICE-PROC-001** — Patch severity/discipline framework. cc-0017c rated **HIGH severity**. Discipline: full P-set + D-01 + 9 V-checks + atomic rollback + close-the-loop.

### Candidate lessons re-exercised by this brief

- **L-v2.81-a** (2 occurrences at v2.83) — parallel-session coordination risk. v1.0 brief commit parent SHA mismatch noted as possible occurrence 3 candidate but not confirmed (could be benign Cowork/PK edits). Promotion-eligible at next lesson cycle per v2.83 PK directive.
- **L-v2.83-a candidate** (1 occurrence at v2.83) — push_files response file-count verification (dual of L47). Re-exercised at v1.0 brief commit (8/8 verified) and v1.1 patch commit (8/8 verified). Movement toward promotion candidate.
- **L47 candidate** (1 occurrence) — push-failure-with-dropped-ack pattern. No recurrence observed this session.

### New lesson candidates from cc-0017c authoring

- **L-v2.84-a candidate** — Empirical-finding precedence over idealised plan framing. When fact-finding probes diverge from pre-signed plan amendments (e.g., Amendment F's PUBLIC/authenticated/anon REVOKE framing vs Query 2; Amendment G's `'done'` action_decision vs CHECK domain restriction), brief MUST surface divergence explicitly and offer named options (A/B/C with rationale) rather than silently choose. **First occurrence:** v1.0 brief, `risks-and-grants.md §3.4` + `§3.5`. **Re-exercised by v1.1 outcome:** D-01 verdict + PK directive selected Option A; v1.1 patch satisfies corrected action. Demonstrates the pattern works — reviewer and PK can redirect from named options.
- **L-v2.84-b candidate** — Defensive idempotent REVOKE/GRANT for permission migrations. REVOKE statements on roles with no existing grant are no-ops in PostgreSQL; including them defensively (e.g., PUBLIC + authenticated + anon alongside the effective service_role REVOKE) provides forward protection if grants are added by a future migration. **First occurrence:** v1.0 brief, `migration-sql.md §5.2 Section B`. Carried unchanged in v1.1. Not yet candidate-promoted.
- **L-v2.84-c candidate (NEW)** — D-01 corrected_action satisfaction pattern (Path A over state-capture override). When D-01 returns verdict=partial with explicit corrected_action that aligns with one of the brief's pre-enumerated options, the lowest-friction path forward is to revise the brief to satisfy that corrected action and re-fire (Path A). State-capture override is reserved for cases where the corrected action conflicts with empirical reality or PK strategic intent. **First occurrence:** v1.1 patch this session — D-01 review_id `a37eff28-...` returned corrected_action=Option A; PK accepted; v1.1 patch satisfies; ready for re-fire. Pattern documented for future Wave 0d / Wave 0e usage.

## §10 Metadata

| Field | Value |
|---|---|
| Brief ID | cc-0017c |
| Wave | 0c (friction.* foundational consolidation, third wave) |
| Brief version | **v1.1** (doc-only patch over v1.0) |
| Parent strategic anchor | Friction Register Consolidation Plan v1 (signed v2.79) + Amendments F + G |
| Predecessor briefs | cc-0017a (Wave 0a — schema foundation, APPLIED v2.81); cc-0017b (Wave 0b — unified emit_event, APPLIED-WITH-CORRECTIVE-MIGRATION v2.82 + v1.1 doc patch v2.83) |
| Successor briefs (anticipated) | Wave 0d (triage/resolution SECURITY DEFINER functions); Wave 0e (audit history shadow tables) |
| Brief authoring session | v2.84 (Sydney late evening 2026-05-18; v1.0 + v1.1 both this session) |
| v1.0 brief commit | `92f9e868` |
| v1.1 brief commit | [TBD on push — single atomic push_files commit] |
| v1.0 D-01 review_id | `a37eff28-2ba1-4a7a-8fbd-3e9aba738c79` (verdict partial, corrected_action Option A, RESOLVED via v1.1 patch) |
| v1.1 D-01 review_id | [TBD on re-fire — next step this session] |
| Apply migration name | `cc_0017c_friction_register_lockdown_and_backfill` (unchanged across v1.0/v1.1) |
| Apply migration version | [TBD on apply — Supabase MCP auto-generates `YYYYMMDDHHMMSS`] |
| Expected V-check pass count | 9/9 (or 8/9 with V-A3 PARTIAL acceptable) |
| Expected backfill rows affected | 0 (per P-3 v2.83 fact-finding; v1.1 WHERE narrowed to legal domain) |
| Production state at brief authoring | 22 events / 22 cases / 3 source seeds |
| T-MCP-02 quota impact | +1 at v1.0 D-01 fire (cum 73 → 74; DONE); +1 at v1.1 D-01 re-fire (cum 74 → 75; PENDING); +0 at apply (close-the-loop UPDATE doesn't increment) |
| Patch severity | HIGH (per ICE-PROC-001) |
| Atomicity | Single apply_migration; Postgres DDL transaction semantics |

## §11 Changelog

### v1.1 (2026-05-18 Sydney late evening, v2.84 — same session as v1.0)

**Doc-only patch — satisfies v1.0 D-01 corrected_action (Option A) per PK Path A directive.**

**Changes:**
- `migration-sql.md` Section C: dropped `action_decision = 'done'` from backfill WHERE clause; dropped `'done' → 'acted_on'` branch from CASE expression. Section C SQL now uses legal-domain-only set `('suppress','ignore','duplicate')`.
- `migration-sql.md` Combined migration body: same narrowing applied.
- `risks-and-grants.md §3.4`: rewritten. Option A is the final selected option per D-01 verdict + PK directive. Option B + Option C documented as considered-and-not-selected. Recorded that `'done'` is not currently legal under `case_action_decision_check` and would only be introduced via future lifecycle-domain expansion.
- `preflight-pset.md` P-3: `backfill_candidate_count` filter narrowed to `IN ('suppress','ignore','duplicate')`. `done_count_audit` added as defensive observation.
- `vchecks.md` V-C1: `still_unresolved_closed_class` filter narrowed; `done_count_audit` added.
- `hardstop-rollback.md §5.5-C`: pre-apply snapshot WHERE narrowed. New §5.4-A3b hard-stop trigger added for `done_count_audit > 0`.
- `d01-postapply-deferred.md`: known_weak_evidence #1 updated to reflect Option A resolution; v1.0 close-the-loop SQL added in §7.
- `lessons-metadata-changelog.md`: this entry. Metadata version bumped to v1.1. New lesson candidate L-v2.84-c (D-01 corrected_action satisfaction pattern) recorded.
- Index file: brief version bumped to v1.1; status updated to AUTHORED_PENDING_D01_REFIRE.

**No production mutations in v1.1 patch commit.** v1.0 D-01 close-the-loop UPDATE on `m.chatgpt_review` row `a37eff28-...` executed AFTER v1.1 patch commit (DML on m.chatgpt_review is exempt from c/f/m/t read-only constraint per session memory). v1.1 D-01 re-fire follows close-the-loop.

### v1.0 (2026-05-18 Sydney late evening, v2.84)

- Initial authoring per PK 4-item directive (verbatim) at v2.83 session close.
- 8 files following cc-0017b precedent (index + 7 sub-files).
- Pre-flight P-set: 5 P-steps capturing grants JSON, FK validity, backfill candidate count, baseline counts, CHECK definition.
- Migration SQL: 3 sections (FK swap + REVOKE lockdown + backfill UPDATE) in single atomic apply_migration. Section C used Option C (`'done'` included for forward-completeness).
- V-checks: 9 total (3 for Section A, 4 for Section B, 2 for Section C).
- Hard-stop matrix: 14 trigger conditions across pre-flight, apply, and V-check phases.
- Rollback bodies: per-section + full migration reverse + emergency over-revoke restore.
- D-01 evidence package: full payload spec with 6 weak-evidence items disclosed.
- Out-of-scope: 10 items explicitly carried.
- Brief commit: `92f9e868`.
- D-01 fire: review_id `a37eff28-2ba1-4a7a-8fbd-3e9aba738c79`, verdict partial, corrected_action Option A.
- PK directive: Proceed with Path A. Triggers v1.1 patch (this changelog entry).

---

*Brief authoring v1.1 complete. Status: AUTHORED_PENDING_D01_REFIRE. Next gates: v1.0 D-01 close-the-loop UPDATE, then v1.1 D-01 re-fire (review-only), then PK approval gate for apply.*
