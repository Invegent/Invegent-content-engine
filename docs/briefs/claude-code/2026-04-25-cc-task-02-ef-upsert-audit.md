# CC-TASK-02 — Edge Function `.upsert()` / `onConflict:` audit

**Priority:** P2 — MEDIUM priority backlog item since 24 Apr late afternoon
**Estimated effort:** 60-90 minutes
**Risk:** LOW — read-only discovery + brief authoring
**Trigger:** PK pings `@InvegentICEbot` with this file path

---

## CONTEXT

The 24 Apr A21 audit (L6) swept all 25 DB-layer `ON CONFLICT` clauses and found **1 real dormant bug** (M11-class): v1 seed functions referencing `ON CONFLICT ON CONSTRAINT post_seed_uniq_run_item` when the actual constraint is `post_seed_uniq_run_item_platform`. Functions were orphaned so bug was dormant, but the pattern is real: SQL references to unique constraints that no longer match DB state.

Most Edge Functions use `supabase.from(table).upsert(data, { onConflict: 'col1,col2' })` rather than raw `ON CONFLICT` SQL. **Same bug class is possible** — if the `onConflict` column list doesn't match a unique constraint, Supabase returns an error at call time. Similar hit rate expected.

**This audit was explicitly scoped as a separate MEDIUM-priority follow-up** at the end of the A21 audit brief (see backlog section in `docs/00_sync_state.md`).

## SETUP — READ FIRST

1. Read `docs/00_sync_state.md` in full
2. Read `docs/briefs/2026-04-24-a21-on-conflict-audit.md` — methodology template for this audit
3. Dev workflow: direct-push to main per standing rule
4. Orphan branch sweep on `Invegent-content-engine` at session start

## OBJECTIVE

Sweep every `.upsert(` call across `supabase/functions/*/` in the `Invegent-content-engine` repo. For each call:
1. Capture file, function/route, target table, onConflict columns
2. Cross-reference onConflict columns against DB unique constraints via Supabase MCP
3. Classify severity (HIGH/MEDIUM/LOW)
4. Produce findings brief at `docs/briefs/2026-04-25-ef-upsert-audit.md`

**Do NOT fix anything in this task.** Fixes are a separate follow-up based on severity of findings.

## METHOD

### Step 1 — Enumerate call sites

From repo root:

```bash
grep -rn --include='*.ts' '\.upsert(' supabase/functions/ > /tmp/upsert_sites.txt
wc -l /tmp/upsert_sites.txt  # expect 15-40 call sites
```

For each line, extract:
- File path
- Line number
- Target table (usually `.from('schema.table').upsert(...)`)
- onConflict column list (from the `{ onConflict: 'col1,col2' }` parameter)

If the upsert does NOT have an `onConflict` param, that's a potential issue too (implicit conflict on PK or first unique constraint — brittle). Flag these separately.

### Step 2 — Cross-reference via Supabase MCP

For each unique (schema, table, onConflict) triple, query:

```sql
SELECT
  n.nspname || '.' || c.relname AS tbl,
  con.conname,
  con.contype,
  pg_get_constraintdef(con.oid) AS def
FROM pg_constraint con
JOIN pg_class c ON c.oid = con.conrelid
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE con.contype IN ('p','u')
  AND n.nspname = '{schema}' AND c.relname = '{table}';
```

Also check partial unique indexes (which can back `onConflict` too):

```sql
SELECT indexname, indexdef FROM pg_indexes
WHERE schemaname = '{schema}' AND tablename = '{table}'
  AND indexdef ILIKE '%UNIQUE%';
```

Match the EF's onConflict columns against the constraint/index column list.

### Step 3 — Classify findings

| Severity | Condition |
|---|---|
| HIGH | onConflict columns don't match ANY unique constraint or partial unique index. Upsert will fail at runtime. |
| MEDIUM | onConflict matches but the constraint has additional columns not in onConflict (partial match → likely hitting different constraint than intended) |
| MEDIUM | onConflict parameter absent but table has multiple unique constraints (ambiguous behaviour) |
| LOW | onConflict correctly matches a constraint |

### Step 4 — Write findings

Produce `docs/briefs/2026-04-25-ef-upsert-audit.md` matching the structure of `docs/briefs/2026-04-24-a21-on-conflict-audit.md`:

- Methodology section (1-2 paragraphs — how the audit was conducted)
- Summary table: count of HIGH / MEDIUM / LOW findings
- Per-finding detail: file, line, current code, constraint state, severity, recommended fix (but don't apply fix)
- Backlog recommendations: which findings become P1 fix tasks, which are deferred

## DELIVERABLES

**Files created:**
- `docs/briefs/2026-04-25-ef-upsert-audit.md` — audit findings

**Files modified:** NONE (this is audit-only; fixes come later)

**Commit message:**
```
docs(briefs): EF .upsert() / onConflict: audit — findings report

Sweep of every .upsert() call site across supabase/functions/ in Invegent-content-engine. Cross-referenced onConflict columns against pg_constraint + pg_indexes via Supabase MCP.

Findings: {X HIGH, Y MEDIUM, Z LOW}.

Follow-up tasks generated for HIGH findings — see brief's backlog section.

Complement to L6/A21 DB-layer audit (24 Apr). Same bug class as what was found in the v1 seed functions (ON CONFLICT ON CONSTRAINT mismatch), different layer.
```

## VERIFICATION CHECKLIST

- [ ] Every `.upsert(` site in `supabase/functions/` enumerated (grep count matches findings count)
- [ ] Each unique (table, onConflict) pair cross-referenced against pg_constraint + pg_indexes
- [ ] HIGH findings include specific fix SQL/TS in the brief
- [ ] Brief structure matches `docs/briefs/2026-04-24-a21-on-conflict-audit.md` (continuity)
- [ ] Orphan branch sweep performed at session start

## OUT OF SCOPE

- **Fixing any finding** — fixes happen as separate commits after PK reviews the brief
- DB-layer SQL `ON CONFLICT` (already audited — that's A21)
- Dashboard/portal `.upsert()` calls (those are frontend and operate against Supabase client-side — separate audit if warranted)
- EF tests or quality checks unrelated to upsert correctness

## EXPECTED SCALE

- 40+ Edge Functions in `supabase/functions/`
- Estimated 15-40 `.upsert()` call sites total
- A21 DB audit found 1 real bug in 25 ON CONFLICT clauses (4% hit rate). Similar rate here would mean 1-2 findings.
- If zero findings: still ship the brief. "Zero findings" is a valid audit outcome and closes the backlog item.

## COMMIT BACK TO SYNC_STATE

After this lands, add lines under "TODAY'S COMMITS" in `docs/00_sync_state.md`:
- "EF .upsert() audit CC-TASK-02 CLOSED — {N HIGH / M MEDIUM / O LOW} findings — commit {sha}"
- If any HIGH findings: add a new sprint item to the board under "New CC audit findings — fix required"
