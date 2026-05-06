# Finding — Duplicate `m.ef_drift_log` Baseline Scan Origin (Resolved)

**Date:** 2026-05-06 / 2026-05-07 Sydney
**Status:** RESOLVED — keep-both (PK)
**Severity:** P3 (audit / chain-of-custody, no data corruption)
**Related:** F-EF-DRIFT-PREVENTION Stage 2a CHECKPOINT (sync_state v2.42)

## Summary

`m.ef_drift_log` contained 98 rows after the v2.42 session's intentional 49-row baseline write. The unexpected prior 49-row scan (`bef6be96-dbca-4a1f-ba29-f9bbcb95f1b3`) was traced to the same `postgres` DB role and chat-authored SQL fingerprint as the v2.42 chat session. Most likely cause: a discarded first write attempt that the chat session then re-did sequentially without recording the discarded attempt in the session register.

PK decision: **keep both scans**. No row mutation. Document and proceed.

## The two scans

| | bef6be96 | a2124145 |
|---|---|---|
| `drift_check_run_id` | `bef6be96-dbca-4a1f-ba29-f9bbcb95f1b3` | `a2124145-a519-4fbf-b0b0-1da28782f152` |
| First row UTC | 2026-05-06 03:24:10.159 | 2026-05-06 03:30:33.025 |
| Last row UTC | 2026-05-06 03:24:10.954 | 2026-05-06 03:32:44.817 |
| Total rows | 49 | 49 |
| `is_first_observation=true` | 49 | 0 |
| Write pattern | 5 parallel chunks via single SQL block | 5 sequential chunks via per-chunk SQL blocks |
| Net request IDs | 96457–96461 | 96479–96484 |
| Per-slug content | byte-identical (same hashes/classes) | byte-identical (same hashes/classes) |

## Evidence (observation)

`pg_stat_statements` recovered the exact SQL block that fired bef6be96 — same `postgres` user role as the v2.42 chat session, chat-style English comments, same MCP secret-resolution convention (`vault.decrypted_secrets`):

```sql
-- Generate ONE scan_id, fire all 5 write chunks with that same scan_id
-- Each chunk processes a disjoint slug slice so concurrent writes are race-free.
WITH scan AS (SELECT gen_random_uuid() AS scan_id),
     url_base AS (
       SELECT (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = $1) || $2 AS u,
              jsonb_build_object($3, $4, $5, $6 || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = $7)) AS hdrs
     ),
     posted AS (
       SELECT s.scan_id,
              net.http_post(url := b.u || s.scan_id::text || $8, headers := b.hdrs, body := $9::jsonb, ...) -- ×5
       ...
```

The bef6be96 actor's full pre-write trace (all `postgres` role, all chat-style SQL):

| UTC | Activity |
|---|---|
| 02:27:21 | `m.ef_drift_log` column inventory |
| 02:30:39 | `apply_migration` MCP — patched `write_ef_drift_log` to accept `p_run_id` (D-01 `0a9012e7`) |
| 02:31:10 | Round-trip semantic verification of new writer fn |
| 02:56–03:17 | Single-slug response reads |
| 03:21:09 | Fire chunks 2+3 dry-run concurrently |
| 03:21:48 | Read chunks 2+3, fire chunks 4+5 |
| 03:22:48 | Read all 4 dry-run chunk responses |
| 03:24:06 | **Fire all 5 write chunks parallel, shared scan_id** = bef6be96 |
| 03:24:57 | Per-chunk write status read |

This trace is structurally indistinguishable from the v2.42 chat session.

### Ruled out

- pg_cron — no matching `cron.job` entry
- Cowork shell — would not produce chat-style SQL or use `vault.decrypted_secrets` MCP convention
- Supabase Studio manual — would not produce CTE-block style or formatted English comments
- DB function/trigger — SQL is too high-level
- ChatGPT MCP — review-only, doesn't execute SQL
- External actor — would need Supabase MCP credentials + chat playbook; implausible

## Interpretation

**Most likely cause (medium-high confidence):** Same v2.42 chat session, two write attempts, only the second recorded in the session register.

Reconstructed sequence:
1. v2.42 chat fires parallel-block write at 03:24:06 UTC = bef6be96 (likely without formal D-01 review fire at that point)
2. Chat notices protocol slip OR becomes uncertain about parallel-write atomicity
3. Chat runs additional sequential dry-runs at 03:25–03:27 (verification phase)
4. Chat fires formal D-01 review (`d53c9918`), gets state-capture override per PK pre-authorisation
5. Chat fires sequential write at 03:30:30+ UTC = a2124145, recording only this in the session register
6. Chat treats residual bef6be96 rows as "unexpected prior scan from unidentified caller"

**Lower-confidence alternative:** A separate concurrent Claude session (PK device / Code / automation). PK denied parallel sessions; no positive evidence supports this alternative over the discarded-first-attempt theory.

## Production impact

**None.**

- Both scans byte-identical per slug
- `m.vw_ef_drift_current` returns 49 latest-per-slug (a2124145)
- Drift detection works correctly going forward — a2124145's `state_changed=false` and populated `previous_class` correctly reflect bef6be96 prior state
- No client-facing pipeline impact, no data corruption

## Decision: keep both (PK, 2026-05-07)

- bef6be96 traced to same chat workflow, not Cowork / pg_cron / dashboard / Studio / external
- Both scans byte-identical per slug
- `m.vw_ef_drift_current` correctly uses latest scan
- Deleting only bef6be96 would corrupt a2124145's `previous_class` / `state_changed` semantics (computed against bef6be96 as prior)
- Deleting both is unnecessary — data is accurate; only chain-of-custody documentation was missing

## Remediation

- **No data mutation.** No row deletions. No `notes`-field annotations.
- This finding doc IS the chain-of-custody record.
- Stage 2a unblocks — proceed to apply daily drift-check + 90-day retention pg_cron.

## Lesson candidate #68

> **All fired writes must be tracked inline. A discarded first attempt cannot fall out of session memory just because a later formally-authorised replay supersedes it.**

When chat fires a write that it later discards/replaces:
- Acknowledge the fired write explicitly in the session record at the moment of firing
- Record the discard rationale and any cleanup intent inline
- If discard → replay sequence is intentional, log both outcomes side by side
- Never let a discarded write sit silently in production data and surface later as "unidentified caller"

Complements Lesson #62 (state-capture override discipline). #62 governs ChatGPT review escalations; #68 governs chat's own discarded actions.

Defer canonical promotion until one reuse, per Canonical Lessons convention.

## References

- v2.42 sync_state inline summary: `docs/00_sync_state.md`
- v2.42 session file: `docs/runtime/sessions/2026-05-06-f-ef-drift-prevention-stage2a-checkpoint.md`
- F-EF-DRIFT-PREVENTION brief: `docs/briefs/2026-05-05-f-ef-drift-prevention.md`
- Writer fn migration: `f_ef_drift_prevention_writer_accept_run_id` (applied 2026-05-06 02:30:39 UTC)
- D-01 chain: `0a9012e7` (writer fn agree), `d53c9918` (chunked-write escalated → state-capture override per PK pre-auth)
- pg_stat_statements snapshot: investigated 2026-05-06/07 Sydney by chat
