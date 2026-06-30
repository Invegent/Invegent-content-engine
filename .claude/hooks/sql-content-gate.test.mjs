// Offline fixture tests for sql-content-gate.mjs (Phase 2a + W1).
// No network, no DB, no settings. Run: node sql-content-gate.test.mjs
import {
  classifySql, extractSql, isExecuteSqlTool, EXECUTE_SQL_ALIASES, MATCHER,
} from './sql-content-gate.mjs';
import { spawnSync } from 'node:child_process';
import { readFileSync, existsSync, rmSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { tmpdir } from 'node:os';

const HOOK = join(dirname(fileURLToPath(import.meta.url)), 'sql-content-gate.mjs');
const TEST_LOG = join(tmpdir(), 'sql-gate-dryrun.test.log');

let pass = 0, fail = 0;
const failures = [];
function check(name, got, want) {
  if (got === want) { pass++; }
  else { fail++; failures.push(`  ✗ ${name}: got "${got}", want "${want}"`); }
}
function checkTrue(name, cond) { check(name, !!cond, true); }

// ---- read-only → allow (defers to ask floor) -----------------------------
const ALLOW = [
  ['plain select', 'SELECT 1'],
  ['qualified select', 'SELECT * FROM m.post_format_performance WHERE rolling_window_days = 30'],
  ['lowercase + padding', '   select count(*) from c.brand_avatar   '],
  ['read-only CTE', 'WITH r AS (SELECT id FROM t ORDER BY created_at DESC LIMIT 5) SELECT * FROM r'],
  ['explain select', 'EXPLAIN SELECT * FROM t'],
  ['show', 'SHOW search_path'],
  ['leading block comment', '/* probe */ SELECT now()'],
  ['trailing semicolon (single stmt)', 'SELECT now();'],
  ['parenthesised select', '(SELECT 1)'],
  ['values', 'VALUES (1),(2)'],
  ['function read', 'SELECT pg_sleep(0)'],
  ['table shorthand', 'TABLE t'],
];
for (const [name, sql] of ALLOW) check(`ALLOW/${name}`, classifySql(sql).decision, 'allow');

// ---- write / DDL / ambiguous → deny --------------------------------------
const DENY = [
  ['insert', 'INSERT INTO t (a) VALUES (1)'],
  ['update', 'UPDATE t SET a=1 WHERE id=2'],
  ['delete', 'DELETE FROM t WHERE id=1'],
  ['delete no where', 'delete from t'],
  ['drop', 'DROP TABLE t'],
  ['alter', 'ALTER TABLE t ADD COLUMN x int'],
  ['truncate', 'TRUNCATE t'],
  ['grant', 'GRANT SELECT ON t TO anon'],
  ['revoke', 'REVOKE SELECT ON t FROM anon'],
  ['create', 'CREATE TABLE t (id int)'],
  ['refresh matview', 'REFRESH MATERIALIZED VIEW mv'],
  ['writable CTE', 'WITH x AS (INSERT INTO t VALUES (1) RETURNING id) SELECT * FROM x'],
  ['multi-statement', 'SELECT 1; DROP TABLE t'],
  ['select for update', 'SELECT * FROM t FOR UPDATE'],
  ['select for no key update', 'SELECT * FROM t FOR NO KEY UPDATE'],
  ['comment-hidden drop', '/* SELECT */ DROP TABLE t'],
  ['line-comment then drop', '-- harmless\nDROP TABLE t'],
  ['select into', 'SELECT * INTO new_t FROM t'],
  ['explain analyze insert', 'EXPLAIN ANALYZE INSERT INTO t VALUES (1)'],
  ['do block', 'DO $$ BEGIN PERFORM 1; END $$'],
  ['merge', 'MERGE INTO t USING s ON t.id=s.id WHEN MATCHED THEN UPDATE SET a=1'],
  ['call proc', 'CALL my_proc()'],
  ['vacuum', 'VACUUM'],
  ['set session', 'SET search_path = public'],
  ['begin tx', 'BEGIN'],
  ['unknown starter', 'BANANA SELECT 1'],
  ['empty string', ''],
  ['whitespace only', '   '],
  ['comment only', '/* only a comment */'],
];
for (const [name, sql] of DENY) check(`DENY/${name}`, classifySql(sql).decision, 'deny');

// ---- extractSql + no-SQL ambiguity → deny --------------------------------
check('extract/query key', extractSql({ query: 'SELECT 1' }), 'SELECT 1');
check('extract/sql key', extractSql({ sql: 'SELECT 2' }), 'SELECT 2');
check('extract/none → null', extractSql({ foo: 1 }), null);
check('classify/null SQL', classifySql(extractSql({ foo: 1 })).decision, 'deny');

// ---- three-alias matcher coverage ----------------------------------------
check('aliases/count', EXECUTE_SQL_ALIASES.length, 3);
checkTrue('alias/supabase', isExecuteSqlTool('mcp__supabase__execute_sql'));
checkTrue('alias/claude_ai', isExecuteSqlTool('mcp__claude_ai_Supabase__execute_sql'));
checkTrue('alias/uuid', isExecuteSqlTool('mcp__39a0f413-34bd-42f5-a856-0ad78bb503ef__execute_sql'));
check('alias/reject Bash', isExecuteSqlTool('Bash'), false);
check('alias/reject bogus', isExecuteSqlTool('mcp__other__execute_sql'), false);
for (const a of EXECUTE_SQL_ALIASES) checkTrue(`matcher contains ${a}`, MATCHER.includes(a));

// ---- end-to-end spawn helper ---------------------------------------------
function runHook(stdin, { args = [], env = {} } = {}) {
  const r = spawnSync(process.execPath, [HOOK, ...args], {
    input: stdin, encoding: 'utf-8', env: { ...process.env, ...env },
  });
  return { code: r.status, out: (r.stdout || '').trim(), err: (r.stderr || '').trim() };
}
function readLog() {
  return existsSync(TEST_LOG)
    ? readFileSync(TEST_LOG, 'utf-8').trim().split('\n').filter(Boolean).map((l) => JSON.parse(l))
    : [];
}

// ===== ENFORCING MODE (default) — must still block DML/DDL =================
{
  const r = runHook(JSON.stringify({ tool_name: 'mcp__supabase__execute_sql', tool_input: { project_id: 'p', query: 'SELECT 1' } }));
  check('ENF/readonly exit', r.code, 0);
  check('ENF/readonly no-output', r.out, '');
}
{
  const r = runHook(JSON.stringify({ tool_name: 'mcp__claude_ai_Supabase__execute_sql', tool_input: { project_id: 'p', query: 'DELETE FROM t' } }));
  check('ENF/dml exit', r.code, 0);
  let d = '(unparseable)';
  try { d = JSON.parse(r.out).hookSpecificOutput.permissionDecision; } catch {}
  check('ENF/dml decision', d, 'deny');
}
{
  // enforcing on the UUID alias too (coverage of the third alias end-to-end)
  const r = runHook(JSON.stringify({ tool_name: 'mcp__39a0f413-34bd-42f5-a856-0ad78bb503ef__execute_sql', tool_input: { project_id: 'p', query: 'DROP TABLE t' } }));
  let d = '(unparseable)';
  try { d = JSON.parse(r.out).hookSpecificOutput.permissionDecision; } catch {}
  check('ENF/uuid-alias dml decision', d, 'deny');
}
{
  const r = runHook('this is not json'); // malformed → fail closed
  check('ENF/malformed fails-closed (exit2)', r.code, 2);
}

// ===== LOG-ONLY MODE — must NEVER block ===================================
rmSync(TEST_LOG, { force: true });
const LOGENV = { SQL_GATE_LOG: TEST_LOG };

{ // DML in log-only: exit 0, NO deny output, but logged as would_decision deny
  const r = runHook(JSON.stringify({ tool_name: 'mcp__supabase__execute_sql', tool_input: { project_id: 'p', query: 'DROP TABLE t' } }), { args: ['--log-only'], env: LOGENV });
  check('LOG/dml exit-0 (never blocks)', r.code, 0);
  check('LOG/dml no stdout decision', r.out, '');
}
{ // read-only in log-only: exit 0, no output, logged as allow
  const r = runHook(JSON.stringify({ tool_name: 'mcp__supabase__execute_sql', tool_input: { project_id: 'p', query: 'SELECT 1' } }), { args: ['--log-only'], env: LOGENV });
  check('LOG/readonly exit-0', r.code, 0);
  check('LOG/readonly no stdout', r.out, '');
}
{ // malformed stdin in log-only: exit 0 (does NOT fail closed during dry run)
  const r = runHook('not json at all', { args: ['--log-only'], env: LOGENV });
  check('LOG/malformed exit-0 (never blocks)', r.code, 0);
}

// verify the log captured the would-decisions
{
  const lines = readLog();
  const dml = lines.find((l) => l.would_decision === 'deny' && /DROP TABLE/.test(l.sql_preview || ''));
  checkTrue('LOG/recorded would-deny for DML', dml);
  checkTrue('LOG/recorded matched_alias true', dml && dml.matched_alias === true);
  checkTrue('LOG/recorded would-allow for SELECT', lines.some((l) => l.would_decision === 'allow'));
  checkTrue('LOG/recorded parse error event', lines.some((l) => l.event === 'json_parse_error'));
}
rmSync(TEST_LOG, { force: true });

// ---- report --------------------------------------------------------------
console.log(`\nsql-content-gate fixtures: ${pass} passed, ${fail} failed (${pass + fail} total)`);
if (failures.length) { console.log(failures.join('\n')); process.exit(1); }
console.log('ALL PASS');
