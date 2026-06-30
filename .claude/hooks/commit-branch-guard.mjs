// commit-branch-guard.mjs — ICE CCF-01 Phase 1 PreToolUse hook (Guard 2)
//
// PURPOSE
//   Governs `Bash` tool calls containing `git commit`. Guards the shared-worktree
//   branch race (a commit landing on the wrong branch / a detached HEAD).
//
//   - DETACHED HEAD commit -> BLOCK (deterministic hazard).
//   - Commit while on `main` -> WARN, NOT block (the docs/register lane commits
//     to main legitimately — U3).
//   - Otherwise -> WARN with branch + ahead/behind parity (inform, never block).
//
//   This guard cannot know the INTENDED branch, so it only hard-blocks the one
//   unambiguous hazard (detached HEAD) and informs otherwise. It never approves.
//   "Inform" = write to stderr and exit 0 (defer to the normal flow); it never
//   emits an `allow` decision (that would auto-approve).
//
// MODES (mirror sql-content-gate.mjs)
//   enforcing (default): allow -> exit0 silent; warn -> stderr + exit0;
//                        deny -> JSON deny + exit0; internal error -> exit2 (block).
//   --log-only         : NON-ENFORCING dry run; log WOULD-decision, exit 0,
//                        emit NOTHING to stderr/stdout (no behavioural effect).

import { readFileSync, appendFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { pathToFileURL, fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

export function splitSegments(command) {
  if (typeof command !== 'string') return [];
  return command.split(/&&|\|\||;|\n|\|/g).map((s) => s.trim()).filter(Boolean);
}

// Global git flags that consume a SEPARATE following token as their value
// (so the value is not mistaken for the subcommand). `-c name=val` / `--opt=val`
// carry their value in the same token and need no special handling.
const VALUE_FLAGS = new Set([
  '-C', '-c', '--git-dir', '--work-tree', '--namespace', '--super-prefix', '--exec-path',
]);

// Resolve the git SUBCOMMAND for a single shell segment, skipping global options
// and their values. Returns the lowercased subcommand, or null if not a git call.
export function gitSubcommand(segment) {
  if (typeof segment !== 'string') return null;
  const tokens = segment.match(/"[^"]*"|'[^']*'|\S+/g) || [];
  const gi = tokens.findIndex((t) => t === 'git');
  if (gi === -1) return null;
  for (let i = gi + 1; i < tokens.length; i++) {
    const t = tokens[i];
    if (t.startsWith('-')) {
      // A value-taking flag in separate-token form swallows the next token.
      if (VALUE_FLAGS.has(t) && !t.includes('=')) i++;
      continue;
    }
    return t.replace(/^['"]|['"]$/g, '').toLowerCase();
  }
  return null;
}

export function hasGitCommit(command) {
  return splitSegments(command).some((s) => gitSubcommand(s) === 'commit');
}

// Pure classifier over (command, gitState).
// gitState = { detached: bool, branch: string|null }
export function classifyCommit(command, gitState) {
  if (!hasGitCommit(command)) {
    return { decision: 'allow', reason: 'no git commit segment' };
  }
  if (gitState && gitState.detached) {
    return {
      decision: 'deny',
      reason: 'commit on a DETACHED HEAD — the commit would not advance any branch ' +
        '(shared-worktree branch-race hazard). Check out the intended branch first',
    };
  }
  const branch = gitState && gitState.branch ? gitState.branch : 'unknown';
  if (branch === 'main') {
    return {
      decision: 'warn',
      reason: 'committing directly to main — confirm this is the docs/register lane and ' +
        'not a code change that belongs on a feature branch/worktree',
    };
  }
  return {
    decision: 'warn',
    reason: `committing on branch "${branch}" — confirm this is the intended branch ` +
      'before the commit lands',
  };
}

export function extractCommand(toolInput) {
  if (!toolInput || typeof toolInput !== 'object') return null;
  if (typeof toolInput.command === 'string') return toolInput.command;
  return null;
}

// Impure git probe. Never throws; degrades to { detached:false, branch:null }
// on any error so the guard can still inform without breaking.
export function gatherGitState() {
  try {
    const r = spawnSync('git', ['symbolic-ref', '-q', '--short', 'HEAD'], { encoding: 'utf-8' });
    if (r.status === 0) {
      const branch = (r.stdout || '').trim();
      return { detached: branch === '', branch: branch || null };
    }
    // Non-zero from symbolic-ref => detached HEAD.
    return { detached: true, branch: null };
  } catch {
    return { detached: false, branch: null };
  }
}

const LOG_ONLY = process.argv.includes('--log-only');
const LOG_PATH =
  process.env.COMMIT_GUARD_LOG ||
  join(dirname(fileURLToPath(import.meta.url)), '.commit-guard-dryrun.log');

function logLine(obj) {
  try { appendFileSync(LOG_PATH, JSON.stringify(obj) + '\n'); } catch { /* noop */ }
}

function main() {
  let raw;
  try {
    raw = readFileSync(0, 'utf-8');
  } catch (e) {
    if (LOG_ONLY) { logLine({ ts: new Date().toISOString(), event: 'stdin_read_error', error: e.message }); process.exit(0); }
    process.stderr.write(`[commit-branch-guard] cannot read stdin, failing closed: ${e.message}\n`);
    process.exit(2);
  }
  let input;
  try {
    input = JSON.parse(raw);
  } catch (e) {
    if (LOG_ONLY) { logLine({ ts: new Date().toISOString(), event: 'json_parse_error', error: e.message }); process.exit(0); }
    process.stderr.write(`[commit-branch-guard] cannot parse hook JSON, failing closed: ${e.message}\n`);
    process.exit(2);
  }
  try {
    const tool = input.tool_name;
    const command = extractCommand(input.tool_input);
    if (tool !== 'Bash' || command == null || !hasGitCommit(command)) {
      if (LOG_ONLY) { logLine({ ts: new Date().toISOString(), mode: 'log-only', tool, would_decision: 'allow', reason: 'no git commit in scope' }); }
      process.exit(0);
    }
    const gitState = gatherGitState();
    const { decision, reason } = classifyCommit(command, gitState);

    if (LOG_ONLY) {
      logLine({
        ts: new Date().toISOString(), mode: 'log-only', tool, would_decision: decision,
        reason, branch: gitState.branch, detached: gitState.detached,
        command_preview: command.slice(0, 300),
      });
      process.exit(0);
    }

    if (decision === 'allow') process.exit(0);
    if (decision === 'warn') {
      // Inform without approving or blocking: stderr + defer.
      process.stderr.write(`[commit-branch-guard] WARN: ${reason}.\n`);
      process.exit(0);
    }
    const out = {
      hookSpecificOutput: {
        hookEventName: 'PreToolUse',
        permissionDecision: 'deny',
        permissionDecisionReason: `[commit-branch-guard] ${reason}.`,
      },
    };
    process.stdout.write(JSON.stringify(out));
    process.exit(0);
  } catch (e) {
    if (LOG_ONLY) { logLine({ ts: new Date().toISOString(), event: 'internal_error', error: e.message }); process.exit(0); }
    process.stderr.write(`[commit-branch-guard] internal error, failing closed (block): ${e.message}\n`);
    process.exit(2);
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main();
}
