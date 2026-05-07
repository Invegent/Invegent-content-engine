# CC Brief — Stage 3: `scripts/safe-deploy.sh`

**Brief version:** v1.1 (post-PK clarifications)  
**D-01 review_id:** `39a588d4-3fb4-41e4-a5a4-07916b6d64c7` — PASS (verdict=agree, risk=medium, confidence=high, 0 pushback_points)  
**Authored:** 2026-05-07 Sydney  
**Repo:** `Invegent/Invegent-content-engine`  
**Branch:** `main` (direct-push, 22 Apr workflow)  
**Predecessor:** Stage 2b shipped v2.48 — `m.vw_ef_drift_current` is the stable contract this consumes.  
**Owner:** Claude Code  
**Reviewer of result:** chat (acceptance verification only); ChatGPT MCP read-only.

---

## Goal

Pre-deploy gate that wraps `supabase functions deploy <ef_name>`. Hard-blocks the standing don't-redeploy three; blocks Class A drift; blocks Class B unless `--allow-warn`; PASSes otherwise. Script ships idle — no EF deploys, no Supabase mutations, no cron changes from this work.

---

## §1.5 Pre-flight (mandatory before writing script logic)

Verify against the actual repo + live database. Document deltas in commit body before code.

1. **`scripts/` conventions** — list contents; note shebang / `set` flags / error-handling style of existing bash. Note any `package.json` deploy aliases.
2. **Supabase connection method** — pick the lightest authed method available locally, in this preference order:
   - (a) `supabase` CLI authed against project `mbkmaxqhsohbtwsqolns`
   - (b) `psql` + connection string in env (note env var name)
   - (c) `curl` + service-role key in env (note env var name)
3. **`m.vw_ef_drift_current` schema** — run read-only `SELECT * FROM m.vw_ef_drift_current LIMIT 1;`. Capture exact column names for: class label, function-name identifier, severity, last-observed timestamp, SD-risk flag (or how derivable).
4. **Standing-three name match** — confirm view stores names exactly as `draft-notifier`, `heygen-avatar-creator`, `heygen-avatar-poller`. Adapt the hardcoded array if casing/hyphenation differs.
5. **Document all deltas** in commit body; adapt rather than assume.

---

## Contract

### CLI signature

```
./scripts/safe-deploy.sh <ef_name> [--check-only] [--allow-warn]
```

| Flag | Effect |
|---|---|
| `<ef_name>` | Required. Edge Function name as stored in `m.vw_ef_drift_current.function_name`. |
| `--check-only` | Run gate; do NOT invoke deploy on PASS. Default = chain deploy on PASS. |
| `--allow-warn` | Permit Class B warnings to PASS. Does NOT bypass standing-three or Class A. Default = block on warn. |

### Exit codes

| Exit | Meaning |
|---|---|
| 0 | PASS |
| 1 | BLOCK (class-driven: A, A-LE, or unwarranted B) |
| 2 | BLOCK (standing-three) |
| 3 | ABORT (pre-flight error: connection or schema) |

### Decision matrix (first match wins)

| # | Condition | Action | Exit |
|---|---|---|---|
| 1 | `<ef_name>` in `STANDING_THREE` | HARD BLOCK | 2 |
| 2 | Pre-flight error (no DB conn, view missing, required column missing) | ABORT | 3 |
| 3 | View row class ∈ {`A`, `A-LE`} | BLOCK | 1 |
| 4 | View row class ∈ {`B-RR`, `B-FD`}, `--allow-warn` NOT set | BLOCK with WARN reason | 1 |
| 5 | View row class ∈ {`B-RR`, `B-FD`}, `--allow-warn` set | PASS with WARN msg | 0 |
| 6 | Row absent OR class ∈ {`C`, `D`, `repo-only`} | PASS | 0 |

**Standing-three precedence:** check fires FIRST, before any class lookup. Even a `repo-only` classification cannot override.

### Behaviour on PASS

- Default → invoke `supabase functions deploy <ef_name>` and stream stdout/stderr
- `--check-only` → print PASS verdict and exit 0 without invoking deploy

### Standing-three encoding (top of script, with mandatory comment)

```bash
# Standing don't-redeploy list — see docs/00_sync_state.md "Carried-forward" block
# and docs/00_action_list.md "Hold-state" notes.
# Update BOTH docs BEFORE removing any name from this array.
STANDING_THREE=(
  "draft-notifier"
  "heygen-avatar-creator"
  "heygen-avatar-poller"
)
```

### Output format

- **BLOCK / WARN paths:** emit raw JSON of the matched view row FIRST, then human-readable reason line. Standing-three BLOCK emits synthetic JSON `{"reason":"standing-three","function_name":"<name>"}` even when no view row exists.
- **PASS path (default deploy chain):** print literal command on its own line BEFORE invoking:
  ```
  [safe-deploy] invoking: supabase functions deploy <ef_name>
  ```
  Then stream the CLI output.
- **PASS path (`--check-only`):** print `[safe-deploy] PASS <name> (class=<value_or_none>)` and exit 0; skip the invoking line.

---

## Clarifications applied in v1.1 (PK direction before D-01 fire)

1. **Schema fail-fast (exit 3):** Pre-flight asserts `function_name` AND `class` columns exist on `m.vw_ef_drift_current`. Either missing → ABORT exit 3 with explicit message naming the missing column.

2. **Row-absence rule:** `m.vw_ef_drift_current` is treated as **advisory drift log, not full inventory**. Absent row for `<ef_name>` = PASS. State this rule as a contract assumption at the top of the script + in `scripts/README.md`.

3. **Raw JSON on BLOCK/WARN:** All BLOCK and WARN code paths emit the matched view row as raw JSON BEFORE the human-readable reason. Single-line vs pretty is CC's call. Standing-three BLOCK emits a synthetic JSON noting `"reason":"standing-three"`.

4. **Connection error messages:** ABORT exit 3 must state which method was attempted and which env/config it expected. Examples:
   - `[safe-deploy] ABORT: supabase CLI not authenticated. Expected: 'supabase login' against project mbkmaxqhsohbtwsqolns.`
   - `[safe-deploy] ABORT: psql connection failed. Expected env: SUPABASE_DB_URL.`
   - `[safe-deploy] ABORT: curl method failed. Expected env: SUPABASE_SERVICE_ROLE_KEY + SUPABASE_PROJECT_REF.`

5. **PASS path deploy preview:** Before invoking deploy, the script must print the literal command on its own line. `--check-only` skips this line entirely.

---

## Acceptance tests (CC reports actual outputs in commit body)

| # | Command | Expected |
|---|---|---|
| A1 | `./scripts/safe-deploy.sh` (no args) | Usage; exit 1 |
| A2 | `./scripts/safe-deploy.sh draft-notifier --check-only` | BLOCK exit 2; reason=standing-three |
| A3 | `./scripts/safe-deploy.sh heygen-avatar-creator --check-only` | BLOCK exit 2 |
| A4 | `./scripts/safe-deploy.sh heygen-avatar-poller --check-only` | BLOCK exit 2 |
| A5 | `./scripts/safe-deploy.sh insights-worker --check-only` | BLOCK exit 1 (B-RR per S30) |
| A6 | `./scripts/safe-deploy.sh insights-worker --check-only --allow-warn` | PASS exit 0 with WARN |
| A7 | `./scripts/safe-deploy.sh nonexistent-fn --check-only` | PASS exit 0 (row absent) |
| A8 | `chmod +x scripts/safe-deploy.sh` confirmed | Executable bit set |

A5 expected reason adapts if classification has shifted by run time; matrix logic must still hold.

---

## Files

- `scripts/safe-deploy.sh` — NEW
- `scripts/README.md` — NEW or APPENDED (one-paragraph usage)

No other files modified. No `package.json` script entry this iteration.

---

## Out of scope

- CI / GitHub Actions hook → Phase 4 / B-09 follow-up
- Multi-EF batch deploy
- Modifying `m.vw_ef_drift_current` itself (treated as stable contract)
- Updating the standing-three list (requires sync_state + action_list update first, then doc-driven CC update)

---

## Constraints respected

- No EF deploys (script ships idle; deploys happen only when humans run it later)
- No Supabase mutations (read-only `SELECT` only)
- No cron changes
- Standing-three not redeployed; merely encoded as gate logic

---

## Commit

- Direct-push to `main`
- Subject: `Stage 3: safe-deploy.sh — pre-deploy drift gate`
- Body must include:
  - §1.5 deltas (what was found vs assumed)
  - A1–A8 actual outputs
  - Final SHA reported back to chat for v2.49 sync_state entry

---

## D-01 fingerprint

review_id: `39a588d4-3fb4-41e4-a5a4-07916b6d64c7`  
verdict: agree · risk_level: medium · confidence: high · pushback_points: 0 · corrected_action: none  
T-MCP-02 cumulative: 43
