// claim-stub-register-guard.mjs — ICE CCF-04 PreToolUse hook (register-cut scan)
//
// PURPOSE
//   When a `git commit` is about to land with a REGISTER file staged
//   (docs/00_sync_state.md / docs/00_action_list.md — i.e. a register version
//   cut), run the CCF-04 Claim Stub scan and surface the scanned-highest version,
//   the proposed next-free, and ANY collision among CLAIMED stubs — the
//   shared-worktree allocation race this session hit twice. This closes the
//   Claim-Stub adoption gap: the helper was built + merged but only ever run by
//   hand, so a register cut could collide unseen.
//
//   INFORM ONLY (CCF-04 charter). It never blocks, never resolves a collision,
//   never renumbers — claim-stub is PROPOSE-ONLY. A collision is a HUMAN
//   reconcile, surfaced, never auto-decided.
//
//   The detector is deliberately conservative: the (heavier) scan runs ONLY when
//   a register file is actually staged, so ordinary code commits pay nothing.
//
// MODES (mirror commit-branch-guard.mjs, with ONE deliberate difference)
//   enforcing (default): register cut + COLLISION -> WARN stderr + exit0
//                        (NEVER deny — zero-authority charter); register cut, no
//                        collision -> INFO stderr (highest / next-free) + exit0;
//                        not a register cut -> exit0 silent.
//   --log-only         : NON-ENFORCING dry run; log the WOULD-surface, emit
//                        NOTHING, exit 0.
//   DIFFERENCE vs the branch guard: an internal/scan error here -> exit 0 (inform,
//   NEVER block). This guard is purely advisory; a failed *scan* must never stop a
//   commit. (The branch guard fails closed because IT is a real safety gate.)

import { readFileSync, appendFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { pathToFileURL, fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';

import { hasGitCommit, extractCommand } from './commit-branch-guard.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(HERE, '..', '..');
const CLAIM_STUB = join(HERE, '..', 'helpers', 'claim-stub.mjs');

// The register files whose staging signals a version cut.
export const REGISTER_FILES = ['docs/00_sync_state.md', 'docs/00_action_list.md'];

// ---------------------------------------------------------------------------
// PURE CORE — deterministic, no I/O. These are what the tests exercise.
// ---------------------------------------------------------------------------

// Does the staged-name set include a register file? Path-suffix match so it works
// whether git reports full or relative paths.
export function touchesRegister(stagedNames) {
  const names = Array.isArray(stagedNames) ? stagedNames : [];
  return names.some((n) =>
    typeof n === 'string' && REGISTER_FILES.some((r) => n === r || n.endsWith('/' + r) || n.endsWith(r)));
}

// Classify what to surface. scan is claim-stub's parsed JSON result (or null when
// the scan could not run / parse — treated as an honest "could not scan", never a
// clean all-good and never a block).
//   decision: 'skip' | 'info' | 'warn' | 'noscan'
export function classifyRegisterCut({ hasCommit, registerStaged, scan }) {
  if (!hasCommit || !registerStaged) {
    return { decision: 'skip', reason: 'not a register-cut commit (no register file staged)' };
  }
  if (!scan || typeof scan !== 'object') {
    return {
      decision: 'noscan',
      reason: 'register cut detected but the claim-stub scan did not produce a result — ' +
        'run it by hand (node .claude/helpers/claim-stub.mjs --claim register ...); absence is NOT proof of no collision',
    };
  }
  const highest = scan.scan && scan.scan.overallHighest ? scan.scan.overallHighest : 'UNKNOWN';
  const proposed = scan.proposedIdentifier || null;
  const collisionKeys = scan.collision && Array.isArray(scan.collision.keys) ? scan.collision.keys : [];
  if (scan.collision && scan.collision.present) {
    return {
      decision: 'warn',
      reason: `register-cut COLLISION — ${collisionKeys.length} identifier(s) claimed by >=2 lanes: ` +
        `[${collisionKeys.join(', ')}]. A HUMAN reconciles (earliest-committed-timestamp keeps it); ` +
        'claim-stub never picks a winner or renumbers',
      highest, proposed, collisionKeys,
    };
  }
  return {
    decision: 'info',
    reason: `register cut — scanned highest ${highest}, next-free ${proposed || 'UNKNOWN (see claim-stub verdict)'}; ` +
      'no collision in the scanned claimant set (NOT proof none exists off-scan)',
    highest, proposed, collisionKeys,
  };
}

// ---------------------------------------------------------------------------
// IMPURE probes. Never throw; degrade to a safe "could not determine" so the
// guard informs at most and NEVER blocks a commit on its own failure.
// ---------------------------------------------------------------------------

function git(args) {
  try {
    const r = spawnSync('git', args, { cwd: REPO_ROOT, encoding: 'utf-8', maxBuffer: 64 * 1024 * 1024 });
    return r.status === 0 ? (r.stdout || '') : null;
  } catch { return null; }
}

export function gatherStagedNames() {
  const out = git(['diff', '--cached', '--name-only']);
  if (out == null) return [];
  return out.split('\n').map((s) => s.trim()).filter(Boolean);
}

// Run the claim-stub register scan read-only; return parsed JSON or null.
function runClaimStubScan() {
  try {
    const r = spawnSync(process.execPath, [
      CLAIM_STUB, '--claim', 'register',
      '--lane', 'hook:register-cut-scan', '--worktree', REPO_ROOT,
      '--gate', 'pre-commit-register-scan', '--format', 'json',
    ], { cwd: REPO_ROOT, encoding: 'utf-8', timeout: 30000, maxBuffer: 64 * 1024 * 1024 });
    const text = (r.stdout || '').trim();
    if (!text) return null;
    return JSON.parse(text);
  } catch { return null; }
}

const LOG_ONLY = process.argv.includes('--log-only');
const LOG_PATH =
  process.env.CLAIM_STUB_GUARD_LOG ||
  join(HERE, '.claim-stub-guard-dryrun.log');

function logLine(obj) {
  try { appendFileSync(LOG_PATH, JSON.stringify(obj) + '\n'); } catch { /* noop */ }
}

function main() {
  let raw;
  try {
    raw = readFileSync(0, 'utf-8');
  } catch (e) {
    // Inform-only guard: even a stdin failure must NOT block a commit.
    if (LOG_ONLY) logLine({ ts: new Date().toISOString(), event: 'stdin_read_error', error: e.message });
    process.exit(0);
  }
  let input;
  try {
    input = JSON.parse(raw);
  } catch (e) {
    if (LOG_ONLY) logLine({ ts: new Date().toISOString(), event: 'json_parse_error', error: e.message });
    process.exit(0);
  }
  try {
    const tool = input.tool_name;
    const command = extractCommand(input.tool_input);
    const hasCommit = tool === 'Bash' && command != null && hasGitCommit(command);
    if (!hasCommit) {
      if (LOG_ONLY) logLine({ ts: new Date().toISOString(), mode: 'log-only', tool, would_decision: 'skip', reason: 'no git commit in scope' });
      process.exit(0);
    }
    const stagedNames = gatherStagedNames();
    const registerStaged = touchesRegister(stagedNames);
    // Only pay for the scan when a register file is actually staged.
    const scan = registerStaged ? runClaimStubScan() : null;
    const c = classifyRegisterCut({ hasCommit, registerStaged, scan });

    if (LOG_ONLY) {
      logLine({
        ts: new Date().toISOString(), mode: 'log-only', tool,
        would_decision: c.decision, reason: c.reason,
        highest: c.highest ?? null, proposed: c.proposed ?? null,
        collisionKeys: c.collisionKeys ?? [],
        command_preview: (command || '').slice(0, 300),
      });
      process.exit(0);
    }

    if (c.decision === 'skip') process.exit(0);
    // Every non-skip decision INFORMS via stderr and defers (exit 0). NEVER deny.
    const tag = c.decision === 'warn' ? 'WARN' : c.decision === 'noscan' ? 'NOTE' : 'INFO';
    process.stderr.write(`[claim-stub-register-guard] ${tag}: ${c.reason}.\n`);
    process.exit(0);
  } catch (e) {
    // Inform-only: a guard failure NEVER blocks a commit.
    if (LOG_ONLY) logLine({ ts: new Date().toISOString(), event: 'internal_error', error: e.message });
    else process.stderr.write(`[claim-stub-register-guard] non-fatal (inform-only, not blocking): ${e.message}\n`);
    process.exit(0);
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main();
}
