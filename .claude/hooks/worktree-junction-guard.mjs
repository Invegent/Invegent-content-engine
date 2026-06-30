// worktree-junction-guard.mjs — ICE CCF-01 Phase 1 PreToolUse hook (Guard 3)
//
// PURPOSE
//   Governs `Bash` tool calls. BLOCKS `git worktree remove` when the target
//   worktree's node_modules is a junction / reparse point (symlink). Removing
//   such a worktree deletes the LINK TARGET's contents — the 2026-06-22 incident
//   where `git worktree remove --force` wiped the MAIN repo's node_modules.
//
//   The remedy (per runbook) is to remove the node_modules junction FIRST
//   (in PowerShell, not cmd-from-bash which silently fails), then remove the
//   worktree. This guard never removes anything and never approves a removal.
//
// MODES (mirror sql-content-gate.mjs)
//   enforcing (default): allow -> exit0 (no output); deny -> JSON deny + exit0;
//                        internal error -> exit2 (FAIL CLOSED / block).
//   --log-only         : NON-ENFORCING dry run; log WOULD-decision, exit 0.
//
// SAFETY POSTURE: if the target path cannot be resolved, fail CLOSED (deny with
//   a manual-verify instruction) — we never allow a worktree removal we could
//   not prove safe.

import { readFileSync, appendFileSync, readlinkSync, existsSync } from 'node:fs';
import { pathToFileURL, fileURLToPath } from 'node:url';
import { dirname, join, isAbsolute, resolve } from 'node:path';

export function splitSegments(command) {
  if (typeof command !== 'string') return [];
  return command.split(/&&|\|\||;|\n|\|/g).map((s) => s.trim()).filter(Boolean);
}

const WORKTREE_REMOVE_RE = /\bgit\b(?:\s+-[^\s]+|\s+--\S+)*\s+worktree\s+remove\b/i;

export function isWorktreeRemoveSegment(segment) {
  return WORKTREE_REMOVE_RE.test(segment);
}

// Extract the worktree target path token: the first non-flag argument after
// `remove`. Returns null if none can be identified.
export function extractTarget(segment) {
  const m = segment.match(/\bworktree\s+remove\b([\s\S]*)$/i);
  if (!m) return null;
  // Tokenise the tail, honouring simple single/double quotes.
  const tail = m[1].trim();
  const tokens = tail.match(/"[^"]*"|'[^']*'|\S+/g) || [];
  for (const t of tokens) {
    if (t.startsWith('-')) continue; // skip flags like --force
    return t.replace(/^['"]|['"]$/g, '');
  }
  return null;
}

// Pure classifier. nodeModulesState ∈ 'reparse' | 'real' | 'absent' | 'unresolved'.
export function classifyWorktreeRemove(command, probe) {
  const segments = splitSegments(command);
  const removes = segments.filter(isWorktreeRemoveSegment);
  if (removes.length === 0) {
    return { decision: 'allow', reason: 'no git worktree remove segment' };
  }
  for (const seg of removes) {
    const target = extractTarget(seg);
    if (!target) {
      return {
        decision: 'deny',
        reason: 'git worktree remove with no resolvable target path — cannot prove the ' +
          'node_modules is not a junction; verify manually before removing',
      };
    }
    const state = probe(target);
    if (state === 'reparse') {
      return {
        decision: 'deny',
        reason: `target "${target}" has a node_modules junction/reparse point; removing the ` +
          'worktree would delete the LINK TARGET (main repo node_modules, 2026-06-22 incident). ' +
          'Remove the node_modules junction FIRST in PowerShell, then re-run',
      };
    }
    if (state === 'unresolved') {
      return {
        decision: 'deny',
        reason: `cannot resolve node_modules state for target "${target}"; failing closed — ` +
          'verify the junction manually before removing',
      };
    }
    // 'real' or 'absent' -> safe to proceed for this segment.
  }
  return { decision: 'allow', reason: 'no junctioned node_modules in any remove target' };
}

// fs probe (impure): is <target>/node_modules a reparse point?
export function probeNodeModules(target) {
  try {
    const base = isAbsolute(target) ? target : resolve(process.cwd(), target);
    const nm = join(base, 'node_modules');
    if (!existsSync(nm)) return 'absent';
    // readlink succeeds on Windows junctions AND symlinks; throws EINVAL on a
    // real directory. This is the most reliable cross-platform reparse test.
    try {
      readlinkSync(nm);
      return 'reparse';
    } catch (e) {
      if (e && e.code === 'EINVAL') return 'real';
      if (e && e.code === 'ENOENT') return 'absent';
      return 'unresolved';
    }
  } catch {
    return 'unresolved';
  }
}

export function extractCommand(toolInput) {
  if (!toolInput || typeof toolInput !== 'object') return null;
  if (typeof toolInput.command === 'string') return toolInput.command;
  return null;
}

const LOG_ONLY = process.argv.includes('--log-only');
const LOG_PATH =
  process.env.WORKTREE_GUARD_LOG ||
  join(dirname(fileURLToPath(import.meta.url)), '.worktree-guard-dryrun.log');

function logLine(obj) {
  try { appendFileSync(LOG_PATH, JSON.stringify(obj) + '\n'); } catch { /* noop */ }
}

function main() {
  let raw;
  try {
    raw = readFileSync(0, 'utf-8');
  } catch (e) {
    if (LOG_ONLY) { logLine({ ts: new Date().toISOString(), event: 'stdin_read_error', error: e.message }); process.exit(0); }
    process.stderr.write(`[worktree-junction-guard] cannot read stdin, failing closed: ${e.message}\n`);
    process.exit(2);
  }
  let input;
  try {
    input = JSON.parse(raw);
  } catch (e) {
    if (LOG_ONLY) { logLine({ ts: new Date().toISOString(), event: 'json_parse_error', error: e.message }); process.exit(0); }
    process.stderr.write(`[worktree-junction-guard] cannot parse hook JSON, failing closed: ${e.message}\n`);
    process.exit(2);
  }
  try {
    const tool = input.tool_name;
    const command = extractCommand(input.tool_input);
    if (tool !== 'Bash' || command == null) {
      if (LOG_ONLY) { logLine({ ts: new Date().toISOString(), mode: 'log-only', tool, would_decision: 'allow', reason: 'out-of-scope tool/command' }); }
      process.exit(0);
    }
    const { decision, reason } = classifyWorktreeRemove(command, probeNodeModules);

    if (LOG_ONLY) {
      logLine({
        ts: new Date().toISOString(), mode: 'log-only', tool,
        would_decision: decision, reason, command_preview: command.slice(0, 300),
      });
      process.exit(0);
    }

    if (decision === 'allow') process.exit(0);
    const out = {
      hookSpecificOutput: {
        hookEventName: 'PreToolUse',
        permissionDecision: 'deny',
        permissionDecisionReason: `[worktree-junction-guard] ${reason}.`,
      },
    };
    process.stdout.write(JSON.stringify(out));
    process.exit(0);
  } catch (e) {
    if (LOG_ONLY) { logLine({ ts: new Date().toISOString(), event: 'internal_error', error: e.message }); process.exit(0); }
    process.stderr.write(`[worktree-junction-guard] internal error, failing closed (block): ${e.message}\n`);
    process.exit(2);
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main();
}
