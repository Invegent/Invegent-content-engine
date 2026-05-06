# Session — 2026-05-07 Sydney — bef6be96 Investigation Resolved

**Slug:** bef6be96-investigation-resolved
**Outcome:** F-EF-DRIFT-PREVENTION Stage 2a UNBLOCKED — keep both scans, document, proceed to cron migration.
**Closure:** ~30–40 min chat. No row mutations. No production impact.

## What happened

PK directed a read-only origin investigation of the unexpected `bef6be96-…` scan in `m.ef_drift_log`. Investigation traced the prior 49-row scan to the same `postgres` DB role and chat-authored SQL fingerprint as the v2.42 chat session itself.

## Investigation method

Readonly queries against:
- `net._http_response` request ID range 96450–96490 — full timeline of drift-check and surrounding pipeline calls
- `pg_stat_statements` filtered to `userid::regrole = postgres` and time window 02:24–04:30 UTC 6 May — recovered the exact SQL blocks that fired both scans
- `cron.job` — no matching entry (rules out scheduled origin)
- `net.http_request_queue` — empty for the relevant IDs (request side flushed by `net` worker after response)
- Past chats search — confirmed v2.42 session content matches the chat-side narrative for a2124145 only; no separate session content found for bef6be96

## Smoking gun

`pg_stat_statements` row at 03:24:06 UTC, `postgres` role:

> `-- Generate ONE scan_id, fire all 5 write chunks with that same scan_id`
> `-- Each chunk processes a disjoint slug slice so concurrent writes are race-free.`
> `WITH scan AS (SELECT gen_random_uuid() AS scan_id), url_base AS (...), posted AS (SELECT net.http_post(...) ×5)`

Fingerprint match with v2.42 chat session: same DB role, same MCP secret-resolution convention (`vault.decrypted_secrets`), chat-style English comments, CTE-block structure.

## PK decision

**Keep both scans.** No row mutation. Document and proceed.

Rationale (PK directive verbatim):
- bef6be96 traced to chat workflow, not external
- Both scans byte-identical per slug
- `m.vw_ef_drift_current` correctly uses the latest scan
- Deleting only bef6be96 would corrupt a2124145's `previous_class` / `state_changed` semantics
- Deleting both is unnecessary — data is accurate; the issue is chain-of-custody documentation only

## Required actions executed

1. ✅ `docs/audit/findings/2026-05-06-ef-drift-duplicate-scan-origin.md` created
2. ✅ `docs/00_sync_state.md` updated to v2.43 — investigation resolved, Stage 2a unblocked
3. ✅ `docs/00_action_list.md` updated to v2.43 — bef6be96 origin investigation closed; cron migration now top P1
4. ✅ Lesson candidate #68 captured in finding doc
5. (next) memory edit
6. (next) propose cron migration design + D-01 review

## Next concrete step

Apply the cron migration for daily drift-check + 90-day retention (per PK directive). Design + D-01 review before apply.

Deferred: Stage 2b (dashboard panel), Stage 3 (safe-deploy.sh), P1 SECURITY-DEFINER triage, NY×YT format selection, M6 Phase A — all still BLOCKED behind cron migration close per PK.

## Standing rules honoured

- D-01: read-only investigation, no fires required for this session (cron migration will require D-01 next)
- D170: no DDL/DML applied this session
- D186: closure budget +~30–40 min, well within 20-finding cap and 8h floor
- G1: this file is the per-session detail; sync_state inline summary updated; pointer index row added
- Lesson #61 P1–P5 pre-flight: not applicable (read-only)
