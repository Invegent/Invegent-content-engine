// sql-content-gate.mjs — ICE Phase-2a PreToolUse hook (SQL-content gate)
//
// PURPOSE
//   Governs `execute_sql` MCP calls (all Supabase aliases). Hard-DENIES any
//   write / DDL / multi-statement / writable-CTE / locking / ambiguous SQL.
//   Confirmed read-only SQL emits NO decision (exit 0) so it falls through to
//   the existing settings `ask` floor — i.e. Phase 2a does NOT lower the floor;
//   read-only still prompts exactly as today. The only new behaviour is the
//   hard block on writes, which the settings layer cannot express.
//
// MODES
//   enforcing (default): allow->exit0(no output); deny->JSON deny+exit0;
//                        internal error->exit2 (FAIL CLOSED / block).
//   --log-only         : NON-ENFORCING dry run. Classifies and appends the
//                        WOULD-decision to a log file, then ALWAYS exit 0 with
//                        no decision (every call defers to the ask floor;
//                        nothing is ever blocked, not even on error).
//
// CONTRACT (verified 2026-06-19, code.claude.com/docs/en/hooks.md)
//   stdin: PreToolUse JSON { tool_name, tool_input:{ project_id, query }, ... }
//   hook deny (rank 3) beats settings ask (rank 4) -> blocked when enforcing.
//
// SAFETY POSTURE (Phase 2a): a classifier FALSE-NEGATIVE degrades to the `ask`
//   floor (today's behaviour), never to a silent allow. This gate errs toward
//   DENY. Log-only mode degrades everything to the ask floor by construction.

import { readFileSync, appendFileSync } from 'node:fs';
import { pathToFileURL, fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

// ---- Canonical execute_sql aliases (single source of truth) ---------------
// Every callable Supabase execute_sql entry point. The settings `matcher`
// (when wired, later gate) and the Phase-1 `ask` list must cover ALL of these.
export const EXECUTE_SQL_ALIASES = [
  'mcp__supabase__execute_sql',
  'mcp__claude_ai_Supabase__execute_sql',
  'mcp__39a0f413-34bd-42f5-a856-0ad78bb503ef__execute_sql',
];
// Proposed PreToolUse matcher string (regex alternation). Not wired here.
export const MATCHER = EXECUTE_SQL_ALIASES.join('|');
export function isExecuteSqlTool(name) {
  return EXECUTE_SQL_ALIASES.includes(name);
}

// Write / DDL verbs that may appear EMBEDDED inside an otherwise read-looking
// statement (writable CTE, EXPLAIN <write>, multi-clause). The first-token
// whitelist below independently rejects any statement that *starts* with a
// non-read verb, so this list only needs the mutating verbs.
const WRITE_KEYWORDS = [
  'insert', 'update', 'delete', 'merge', 'truncate', 'alter', 'drop', 'create',
  'grant', 'revoke', 'comment', 'reindex', 'vacuum', 'refresh', 'call', 'do',
  'copy', 'lock', 'notify', 'reassign', 'cluster', 'security', 'import',
  'prepare', 'execute', 'analyze',
];

// Only these may BEGIN a statement for it to be considered read-only.
const READ_STARTERS = ['select', 'with', 'explain', 'show', 'table', 'values'];

function stripComments(sql) {
  // Remove /* block */ then -- line comments. May over-strip inside string
  // literals that contain these sequences; that only ever causes OVER-denial,
  // which is the safe direction for this gate.
  let s = sql.replace(/\/\*[\s\S]*?\*\//g, ' ');
  s = s.replace(/--[^\n\r]*/g, ' ');
  return s;
}

export function classifySql(rawSql) {
  if (rawSql == null || typeof rawSql !== 'string') {
    return { decision: 'deny', reason: 'no SQL string found in tool input (ambiguous)' };
  }
  const trimmed = rawSql.trim();
  if (trimmed === '') {
    return { decision: 'deny', reason: 'empty SQL (ambiguous)' };
  }

  let body = stripComments(trimmed).trim();
  if (body === '') {
    return { decision: 'deny', reason: 'SQL contains only comments (ambiguous)' };
  }

  // Multi-statement: strip one trailing ';' then any remaining ';' => batch.
  const noTrail = body.replace(/;\s*$/, '');
  if (noTrail.includes(';')) {
    return { decision: 'deny', reason: 'multiple statements detected (semicolon-separated batch)' };
  }
  const lower = noTrail.toLowerCase();

  // Locking reads.
  if (/\bfor\s+(no\s+key\s+)?(update|share)\b/i.test(noTrail)) {
    return { decision: 'deny', reason: 'locking read (FOR UPDATE/SHARE) — treated as write' };
  }

  // SELECT ... INTO creates a table.
  if (/\bselect\b[\s\S]*\binto\b/i.test(noTrail)) {
    return { decision: 'deny', reason: 'SELECT ... INTO creates a table (DDL)' };
  }

  // Embedded write/DDL verb anywhere (catches writable CTEs, EXPLAIN <write>).
  for (const kw of WRITE_KEYWORDS) {
    if (new RegExp('\\b' + kw + '\\b', 'i').test(lower)) {
      return { decision: 'deny', reason: `write/structural keyword detected: ${kw.toUpperCase()}` };
    }
  }

  // First significant token must be a recognised read-only starter.
  const m = noTrail.replace(/^[\s(]+/, '').match(/^([a-zA-Z_]+)/);
  const firstTok = m ? m[1].toLowerCase() : null;
  if (!firstTok || !READ_STARTERS.includes(firstTok)) {
    return { decision: 'deny', reason: `does not begin with a read-only keyword (got: ${firstTok || 'none'})` };
  }

  return { decision: 'allow', reason: 'read-only statement' };
}

export function extractSql(toolInput) {
  if (!toolInput || typeof toolInput !== 'object') return null;
  for (const k of ['query', 'sql', 'statement', 'q']) {
    if (typeof toolInput[k] === 'string') return toolInput[k];
  }
  const strings = Object.values(toolInput).filter((v) => typeof v === 'string');
  if (strings.length === 0) return null;
  return strings.sort((a, b) => b.length - a.length)[0];
}

// ---- log-only (dry-run) plumbing -----------------------------------------
const LOG_ONLY = process.argv.includes('--log-only');
const LOG_PATH =
  process.env.SQL_GATE_LOG ||
  join(dirname(fileURLToPath(import.meta.url)), '.sql-gate-dryrun.log');

function logLine(obj) {
  // Logging must NEVER affect the tool call — swallow all logging errors.
  try { appendFileSync(LOG_PATH, JSON.stringify(obj) + '\n'); } catch { /* noop */ }
}

function main() {
  let raw;
  try {
    raw = readFileSync(0, 'utf-8');
  } catch (e) {
    if (LOG_ONLY) { logLine({ ts: new Date().toISOString(), event: 'stdin_read_error', error: e.message }); process.exit(0); }
    process.stderr.write(`[sql-content-gate] cannot read stdin, failing closed: ${e.message}\n`);
    process.exit(2);
  }
  let input;
  try {
    input = JSON.parse(raw);
  } catch (e) {
    if (LOG_ONLY) { logLine({ ts: new Date().toISOString(), event: 'json_parse_error', error: e.message }); process.exit(0); }
    process.stderr.write(`[sql-content-gate] cannot parse hook JSON, failing closed: ${e.message}\n`);
    process.exit(2);
  }
  try {
    const tool = input.tool_name;
    const sql = extractSql(input.tool_input);
    const { decision, reason } = classifySql(sql);

    if (LOG_ONLY) {
      // NON-ENFORCING: record the would-be decision, then always defer.
      logLine({
        ts: new Date().toISOString(), mode: 'log-only', tool,
        matched_alias: isExecuteSqlTool(tool), would_decision: decision,
        reason, sql_preview: (sql || '').slice(0, 200),
      });
      process.exit(0);
    }

    if (decision === 'allow') {
      process.exit(0); // defer to settings ask floor — no output
    }
    const out = {
      hookSpecificOutput: {
        hookEventName: 'PreToolUse',
        permissionDecision: 'deny',
        permissionDecisionReason:
          `[sql-content-gate] ${reason}. Ad-hoc DML/DDL via execute_sql is blocked; ` +
          `route production writes through the gated migration/PK path.`,
      },
    };
    process.stdout.write(JSON.stringify(out));
    process.exit(0);
  } catch (e) {
    if (LOG_ONLY) { logLine({ ts: new Date().toISOString(), event: 'internal_error', error: e.message }); process.exit(0); }
    process.stderr.write(`[sql-content-gate] internal error, failing closed (block): ${e.message}\n`);
    process.exit(2);
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main();
}
