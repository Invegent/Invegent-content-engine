# cc-0009 Stage A — Result

**Brief:** `docs/briefs/cc-0009-r-schema-and-cadence-rule-generator.md` @ commit `ae301a92`
**Process freeze:** ICE-PROC-001 @ `860fd0a9`
**Applied:** 2026-05-11 01:38 UTC (Sydney: 11:38 AEST)
**Migration name:** `cc_0009_r_schema_and_helpers`
**Routing:** Lesson #62 type-(c) generic escalation — PK explicit type-(c) override

---

## Routing summary

Stage A D-01 was fired twice via `action_type=plan_review` (forced from `sql_destructive` by KOI-02 — Anthropic GitHub issue [#56757](https://github.com/anthropics/claude-code/issues/56757), Claude.ai not surfacing per-tool approval prompts for `sql_destructive` on individual Pro plans). Both fires returned identical generic pushback:

| Fire | review_id | verdict | risk | pushback | new specific evidence |
|---|---|---|---|---|---|
| #1 | `1a097da6-fceb-4898-b2f5-5d58753558fa` | partial | high | 4 generic concerns | n/a |
| #2 | `52f4ae5d-8dea-4bc2-aa4e-c5c10ca03ca2` | partial | high | Same 4 generic concerns, verbatim echo | **None** |

All three Lesson #62 type-(c) distinguishing markers present:
1. Identical pushback wording across fires (verbatim echo of refire packet's labels)
2. Non-empty but generic `corrected_action` ("strengthen justification" / "provide more concrete evidence")
3. No specific empirical scenario raised — every pushback restated as generic concern category

PK issued explicit override phrase: "Proceed with type-(c) override for cc-0009 Stage A only. Run final read-only drift check first. If drift is GREEN, apply exactly one migration: `cc_0009_r_schema_and_helpers`. Then run V1–V8 verification and close the loop. Do not proceed to Stage B."

Both review rows closed via `apply_migration` UPDATE (per L36): `status='resolved'`, `action_taken='applied — V1-V8 PASS post-apply under PK type-(c) override'`, `resolved_by='cc-0009-stage-a-apply-2026-05-11'`, `escalation_resolved_at=2026-05-11 01:39:31 UTC`.

---

## Drift check — GREEN

Final read-only check executed within ~60s pre-apply window. Zero divergence from baseline:

| Check | Baseline | Final | Status |
|---|---|---|---|
| schema `r` exists | true | true | ✓ (CCH R12 acceptable) |
| `r.reconciliation_run` exists | false | false | ✓ |
| `r.expected_publication` exists | false | false | ✓ |
| `r.normalise_text` exists | false | false | ✓ |
| `r.to_sydney_local_date` exists | false | false | ✓ |
| `pgcrypto` / `pg_cron` / `pg_net` installed | true / true / true | true / true / true | ✓ |
| `c.client_cadence_rule` fingerprint | 14/14/14 | 14/14/14 | ✓ |
| cc_0009 migration name collisions | 0 | 0 | ✓ |
| event triggers enabled | 2 | 2 | ✓ |
| `k.*` unique constraints intact | 2 | 2 | ✓ |
| cron job at `5 16 * * *` UTC | 0 | 0 | ✓ |

---

## Apply

| Field | Value |
|---|---|
| Migration name | `cc_0009_r_schema_and_helpers` |
| Apply mechanism | Supabase MCP `apply_migration` (chat-driven, per D-170) |
| Result | `{"success": true}` |
| Transaction | Single unit |
| Rollback executed | None — apply succeeded; V1–V8 all PASS |

**Migration content (per brief §2.1–§2.5 + §3.5–§3.6 verbatim):**
1. `CREATE SCHEMA IF NOT EXISTS r` + grants for `service_role` / `anon` / `authenticator` + `ALTER DEFAULT PRIVILEGES`
2. `CREATE TABLE r.reconciliation_run` (14 columns, 4 CHECK + PK + self-FK + 2 indexes)
3. `CREATE TABLE r.expected_publication` (17 columns, 4 CHECK + PK + UNIQUE generator idempotency key + 2 FKs + 2 indexes; `matched_match_id` declared as bare `uuid` per L38 deferral)
4. `CREATE OR REPLACE FUNCTION r.normalise_text(text)` IMMUTABLE — R7 narrowed body
5. `CREATE OR REPLACE FUNCTION r.to_sydney_local_date(timestamptz)` IMMUTABLE — PRV-0 §4.2 verbatim
6. `INSERT ... ON CONFLICT DO UPDATE` into `k.table_registry` for both new tables (L35 trigger-aware UPSERT)
7. CTE-driven `INSERT ... ON CONFLICT DO UPDATE` into `k.column_registry` for all 31 columns

---

## V-checks — all PASS

### V1 — schema + grants
| Check | Result |
|---|---|
| `schema_r_exists` | true |
| `service_role` USAGE | true |
| `anon` USAGE | true |
| `authenticator` USAGE | true |

### V2 — tables exist with expected shape
| Check | Result |
|---|---|
| `r.reconciliation_run` exists | true |
| `r.expected_publication` exists | true |
| `rr_col_count` | 14 |
| `ep_col_count` | 17 |
| `rr_constraints` (PK + 4 CHECK + 1 FK) | 6 |
| `ep_constraints` (PK + 4 CHECK + 2 FK + 1 UNIQUE) | 8 |
| `total_indexes` | 7 (≥5 required) |

### V3 — function signatures
| Function | Return type |
|---|---|
| `r.normalise_text(text)` | `text` |
| `r.to_sydney_local_date(timestamptz)` | `date` |

### V4a — `r.normalise_text` R7 transforms + R13 idempotency
All 8 transform tests pass; all 4 idempotency assertions return `true`:
- `'Hello World'` → `'hello world'`
- `'  trim  spaces  '` → `'trim spaces'`
- `'Multiple    internal    spaces'` → `'multiple internal spaces'`
- `'Café résumé naïve'` → `'café résumé naïve'` (unicode preserved)
- `'Punctuation, stays! Here.'` → `'punctuation, stays! here.'` (punctuation preserved)
- `'https://example.com @user #tag 🚀'` → unchanged (URL/mention/hashtag/emoji preserved per R7 narrowing)
- `NULL` → `NULL`
- `''` → `''`
- `f(f(x)) = f(x)` confirmed for all 4 representative inputs (R13)

### V4b — `r.to_sydney_local_date` DST verification
| Input (UTC) | Output (Sydney date) | DST regime |
|---|---|---|
| `now()` (2026-05-11 01:38 UTC) | `2026-05-11` | AEST (UTC+10) |
| `2026-06-15 14:00:00+00` | `2026-06-16` | AEST (UTC+10) |
| `2026-01-15 13:00:00+00` | `2026-01-16` | AEDT (UTC+11) |
| `2026-05-09 23:30:00+00` (boundary) | `2026-05-10` | AEST (UTC+10) |
| `2026-12-31 14:00:00+00` (boundary) | `2027-01-01` | AEDT (UTC+11) |

### V5 — `k.table_registry` rows
| schema_name | table_name | status | allowed_ops | pii_risk | has_use_cases | has_join_keys | has_rules | has_advisory |
|---|---|---|---|---|---|---|---|---|
| r | reconciliation_run | active | upsert | none | true | true | true | true |
| r | expected_publication | active | upsert | none | true | true | true | true |

`allowed_ops='upsert'` (not stub default `'read-only'`) proves UPDATE branch of ON CONFLICT executed — L35 trigger-aware UPSERT pattern from cc-0008 v5 reified cleanly.

### V6 — `k.column_registry` coverage
| Table | column_rows | purposes_populated | fk_columns | fk_column_names |
|---|---|---|---|---|
| `reconciliation_run` | 14 | 14 | 1 | `[parent_run_id]` |
| `expected_publication` | 17 | 17 | 2 | `[client_id, cadence_rule_id]` |

`matched_match_id` correctly `is_foreign_key=false` per L38 cross-brief deferral. cc-0010 ALTER TABLE will re-add the FK after `r.reconciliation_match` is created.

### V7 — row counts both = 0
| Table | rows |
|---|---|
| `r.reconciliation_run` | 0 |
| `r.expected_publication` | 0 |

Stage E (first backfill invocation) will populate `expected_publication`. `reconciliation_run` is populated by EFs starting from Stage C deployment.

### V8 — constraint integrity detail
**`r.reconciliation_run` — 6 constraints:**
- CHECK: `run_type`, `trigger`, `status`, `recon_run_finished_when_done`
- FK: `parent_run_id` → `reconciliation_run(reconciliation_run_id)` (self-ref, ON DELETE SET NULL)
- PK: `reconciliation_run_pkey`

**`r.expected_publication` — 8 constraints:**
- CHECK: `platform`, `expected_status`, `expected_window_valid`, `expected_status_match_pair`
- FK: `client_id` → `c.client(client_id)` (ON DELETE CASCADE)
- FK: `cadence_rule_id` → `c.client_cadence_rule(cadence_rule_id)` (ON DELETE RESTRICT)
- PK: `expected_publication_pkey`
- UNIQUE: `(client_id, platform, expected_local_date, cadence_rule_id)` — generator idempotency key per R9

No FK on `matched_match_id` — confirmed L38 deferral.

---

## Anomalies

None.

---

## Rollback status

Not executed. Apply succeeded; V1–V8 all PASS; no HALT conditions fired.

Rollback path remains available per brief §9.3 if a future state surface invalidates V-checks (no such surface currently exists).

---

## Lessons captured (candidates, not yet promoted)

- **L37 candidate** — multi-stage cc-NNNN brief authoring pattern (cc-0009 is first multi-stage brief; Stages A–E with independent gate cycles)
- **L38 candidate** — cross-brief FK deferral: `matched_match_id` declared bare in cc-0009, FK added in cc-0010 ALTER TABLE
- **L39 candidate** — feature-branch + PR + PK-approval workflow for CC code per CCH R11 (will be exercised in Stage B)

Promotion to global lesson registry deferred until cc-0010 empirically vindicates L38 and Stage B exercises L39.

---

## KOI activity during this session

- **KOI-01** — mcp-chatgpt-bridge OAuth re-auth: triggered, recovered via Option 2b (PK rotated `MCP_BRIDGE_BEARER_TOKEN`, updated EF Secrets, completed consent). New stable client `mcp_0973af50…` authed in 12s.
- **KOI-02 NEW** — Anthropic GitHub issue #56757 (filed 7 May 2026): "MCP Tool Permissions Not Persisting Between Chats in claude.ai Projects". On individual Pro plans, Claude.ai's per-tool approval prompt does not surface for `sql_destructive` action_type, returning misleading `"This connector requires additional permissions"` error. Workaround: route reviews via `action_type=plan_review` (semantically: reviewing a plan, the actual destructive apply is a separate Supabase MCP call). To be added to tools register as KOI-02 in next session.

---

## Stop condition reached

Per PK directive: "Do not proceed to Stage B. Do not fire new D-01. Do not batch additional work."

Stage B (EF source on feature branch per CCH R11) is the next gate. Independent pre-flight + D-01 + PK approval + execution + V-checks + close-the-loop cycle required.

---

**Confirmation:** `cc-0009 Stage A executed under PK type-(c) override. Verification complete.`
