// deploy-verify-jwt-guard.mjs — ICE CCF-01 Phase 1 PreToolUse hook (Guard 1)
//
// PURPOSE
//   Governs `Bash` tool calls. BLOCKS any `supabase functions deploy` command
//   segment that is MISSING `--no-verify-jwt`. Deploying without that flag flips
//   verify_jwt -> true (CLI default), which breaks x-series-key-only callers
//   (401 -> HTTP 502). This is the documented Series-v2 live-502 incident.
//
//   This guard NEVER approves a deploy. Blocking a malformed deploy is not
//   approval of a well-formed one — deploy remains a PK hard stop. A command
//   with no `supabase functions deploy` segment emits NO decision (defers).
//
// MODES (mirror sql-content-gate.mjs)
//   enforcing (default): allow -> exit0 (no output); deny -> JSON deny + exit0;
//                        internal error -> exit2 (FAIL CLOSED / block).
//   --log-only         : NON-ENFORCING dry run. Classifies, appends the
//                        WOULD-decision to a log, then ALWAYS exit 0 with no
//                        decision (never blocks, not even on error).
//
// CONTRACT
//   stdin: PreToolUse JSON { tool_name: 'Bash', tool_input: { command }, ... }
//   hook deny (rank 3) beats settings ask -> blocked when enforcing.

import { readFileSync, appendFileSync } from 'node:fs';
import { pathToFileURL, fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

// Split a shell command line into independently-executed segments so a chained
// `a && supabase functions deploy x` is judged segment-by-segment (a deploy
// segment lacking the flag is caught even if an EARLIER segment is benign).
export function splitSegments(command) {
  if (typeof command !== 'string') return [];
  return command
    .split(/&&|\|\||;|\n|\|/g)
    .map((s) => s.trim())
    .filter(Boolean);
}

const DEPLOY_RE = /\bsupabase\b[\s\S]*?\bfunctions\b[\s\S]*?\bdeploy\b/i;
const FLAG_RE = /--no-verify-jwt\b/i;

export function isDeploySegment(segment) {
  return DEPLOY_RE.test(segment);
}

// Returns { decision: 'allow'|'deny', reason }.
export function classifyDeploy(command) {
  const segments = splitSegments(command);
  const offending = segments.filter((s) => isDeploySegment(s) && !FLAG_RE.test(s));
  if (offending.length > 0) {
    return {
      decision: 'deny',
      reason:
        '`supabase functions deploy` is missing --no-verify-jwt; the CLI default ' +
        'flips verify_jwt=true and breaks x-series-key-only callers (401 -> HTTP 502, ' +
        'Series-v2 incident)',
    };
  }
  return { decision: 'allow', reason: 'no unguarded supabase functions deploy segment' };
}

export function extractCommand(toolInput) {
  if (!toolInput || typeof toolInput !== 'object') return null;
  if (typeof toolInput.command === 'string') return toolInput.command;
  return null;
}

// ---- log-only (dry-run) plumbing -----------------------------------------
const LOG_ONLY = process.argv.includes('--log-only');
const LOG_PATH =
  process.env.DEPLOY_GUARD_LOG ||
  join(dirname(fileURLToPath(import.meta.url)), '.deploy-guard-dryrun.log');

function logLine(obj) {
  try { appendFileSync(LOG_PATH, JSON.stringify(obj) + '\n'); } catch { /* noop */ }
}

function main() {
  let raw;
  try {
    raw = readFileSync(0, 'utf-8');
  } catch (e) {
    if (LOG_ONLY) { logLine({ ts: new Date().toISOString(), event: 'stdin_read_error', error: e.message }); process.exit(0); }
    process.stderr.write(`[deploy-verify-jwt-guard] cannot read stdin, failing closed: ${e.message}\n`);
    process.exit(2);
  }
  let input;
  try {
    input = JSON.parse(raw);
  } catch (e) {
    if (LOG_ONLY) { logLine({ ts: new Date().toISOString(), event: 'json_parse_error', error: e.message }); process.exit(0); }
    process.stderr.write(`[deploy-verify-jwt-guard] cannot parse hook JSON, failing closed: ${e.message}\n`);
    process.exit(2);
  }
  try {
    const tool = input.tool_name;
    const command = extractCommand(input.tool_input);
    // Only Bash is in scope; anything else defers silently.
    if (tool !== 'Bash' || command == null) {
      if (LOG_ONLY) { logLine({ ts: new Date().toISOString(), mode: 'log-only', tool, would_decision: 'allow', reason: 'out-of-scope tool/command' }); }
      process.exit(0);
    }
    const { decision, reason } = classifyDeploy(command);

    if (LOG_ONLY) {
      logLine({
        ts: new Date().toISOString(), mode: 'log-only', tool,
        would_decision: decision, reason, command_preview: command.slice(0, 300),
      });
      process.exit(0);
    }

    if (decision === 'allow') process.exit(0); // defer — no output
    const out = {
      hookSpecificOutput: {
        hookEventName: 'PreToolUse',
        permissionDecision: 'deny',
        permissionDecisionReason:
          `[deploy-verify-jwt-guard] ${reason}. Re-run the deploy WITH --no-verify-jwt, ` +
          `then proceed through the PK deploy gate.`,
      },
    };
    process.stdout.write(JSON.stringify(out));
    process.exit(0);
  } catch (e) {
    if (LOG_ONLY) { logLine({ ts: new Date().toISOString(), event: 'internal_error', error: e.message }); process.exit(0); }
    process.stderr.write(`[deploy-verify-jwt-guard] internal error, failing closed (block): ${e.message}\n`);
    process.exit(2);
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main();
}
