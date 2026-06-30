// Offline fixture tests for worktree-junction-guard.mjs (CCF-01 Phase 1, Guard 3).
// No real fs needed for the classifier — the fs probe is injected. Run:
//   node worktree-junction-guard.test.mjs
import {
  classifyWorktreeRemove, isWorktreeRemoveSegment, extractTarget, probeNodeModules, extractCommand,
} from './worktree-junction-guard.mjs';
import { spawnSync } from 'node:child_process';
import { readFileSync, existsSync, rmSync, mkdtempSync, mkdirSync, symlinkSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { tmpdir } from 'node:os';

const HOOK = join(dirname(fileURLToPath(import.meta.url)), 'worktree-junction-guard.mjs');
const TEST_LOG = join(tmpdir(), 'worktree-guard-dryrun.test.log');

let pass = 0, fail = 0; const failures = [];
function check(name, got, want) {
  if (got === want) pass++; else { fail++; failures.push(`  ✗ ${name}: got "${got}", want "${want}"`); }
}
function checkTrue(name, cond) { check(name, !!cond, true); }

// ---- classifier with injected probe --------------------------------------
const reparse = () => 'reparse';
const real = () => 'real';
const absent = () => 'absent';
const unresolved = () => 'unresolved';

check('DENY/junction', classifyWorktreeRemove('git worktree remove ../wt', reparse).decision, 'deny');
check('DENY/junction --force', classifyWorktreeRemove('git worktree remove --force ../wt', reparse).decision, 'deny');
check('DENY/no target', classifyWorktreeRemove('git worktree remove --force', real).decision, 'deny');
check('DENY/unresolved', classifyWorktreeRemove('git worktree remove ../wt', unresolved).decision, 'deny');
check('ALLOW/real nm', classifyWorktreeRemove('git worktree remove ../wt', real).decision, 'allow');
check('ALLOW/absent nm', classifyWorktreeRemove('git worktree remove ../wt', absent).decision, 'allow');
check('ALLOW/not a remove', classifyWorktreeRemove('git worktree list', reparse).decision, 'allow');
check('ALLOW/not git', classifyWorktreeRemove('rm -rf ../wt', reparse).decision, 'allow');
// chained: one benign list + one junction remove still denies
check('DENY/chained', classifyWorktreeRemove('git worktree list && git worktree remove ../wt', reparse).decision, 'deny');

// ---- target extraction ----------------------------------------------------
check('target/basic', extractTarget('worktree remove ../wt'), '../wt');
check('target/skip flag', extractTarget('worktree remove --force ../wt'), '../wt');
check('target/quoted', extractTarget('worktree remove "C:/a b/wt"'), 'C:/a b/wt');
check('target/none', extractTarget('worktree remove --force'), null);
checkTrue('isWorktreeRemoveSegment', isWorktreeRemoveSegment('git worktree remove x'));
check('isWorktreeRemoveSegment false', isWorktreeRemoveSegment('git worktree add x'), false);
check('extractCommand', extractCommand({ command: 'x' }), 'x');

// ---- real fs probe: symlinked node_modules => reparse, real dir => real ----
{
  const tmp = mkdtempSync(join(tmpdir(), 'wtprobe-'));
  // real directory case
  const realWt = join(tmp, 'real'); mkdirSync(join(realWt, 'node_modules'), { recursive: true });
  check('probe/real dir', probeNodeModules(realWt), 'real');
  // absent case
  const absWt = join(tmp, 'absent'); mkdirSync(absWt, { recursive: true });
  check('probe/absent', probeNodeModules(absWt), 'absent');
  // symlink (reparse) case — may require privilege on Windows; tolerate skip
  const linkWt = join(tmp, 'linked'); mkdirSync(linkWt, { recursive: true });
  const targetDir = join(tmp, 'target'); mkdirSync(targetDir, { recursive: true });
  let symlinkOk = true;
  try { symlinkSync(targetDir, join(linkWt, 'node_modules'), 'junction'); }
  catch { symlinkOk = false; }
  if (symlinkOk) check('probe/reparse', probeNodeModules(linkWt), 'reparse');
  else { pass++; console.log('  (skipped probe/reparse — symlink/junction not permitted here)'); }
  rmSync(tmp, { recursive: true, force: true });
}

// ---- end-to-end spawn -----------------------------------------------------
function runHook(stdin, { args = [], env = {} } = {}) {
  const r = spawnSync(process.execPath, [HOOK, ...args], { input: stdin, encoding: 'utf-8', env: { ...process.env, ...env } });
  return { code: r.status, out: (r.stdout || '').trim(), err: (r.stderr || '').trim() };
}
function readLog() {
  return existsSync(TEST_LOG) ? readFileSync(TEST_LOG, 'utf-8').trim().split('\n').filter(Boolean).map((l) => JSON.parse(l)) : [];
}
// ENFORCING: no-target remove fails closed (deny) regardless of fs
{
  const r = runHook(JSON.stringify({ tool_name: 'Bash', tool_input: { command: 'git worktree remove --force' } }));
  let d = '(none)'; try { d = JSON.parse(r.out).hookSpecificOutput.permissionDecision; } catch {}
  check('ENF/no-target deny', d, 'deny');
}
// ENFORCING: benign command defers silently
{
  const r = runHook(JSON.stringify({ tool_name: 'Bash', tool_input: { command: 'git worktree list' } }));
  check('ENF/benign no-output', r.out, '');
}
// ENFORCING: malformed fails closed
{
  const r = runHook('not json');
  check('ENF/malformed exit2', r.code, 2);
}
// LOG-ONLY: never blocks
rmSync(TEST_LOG, { force: true });
const LOGENV = { WORKTREE_GUARD_LOG: TEST_LOG };
{
  const r = runHook(JSON.stringify({ tool_name: 'Bash', tool_input: { command: 'git worktree remove --force' } }), { args: ['--log-only'], env: LOGENV });
  check('LOG/exit0', r.code, 0);
  check('LOG/no stdout', r.out, '');
}
{
  const lines = readLog();
  checkTrue('LOG/recorded would-deny', lines.some((l) => l.would_decision === 'deny'));
}
rmSync(TEST_LOG, { force: true });

console.log(`\nworktree-junction-guard fixtures: ${pass} passed, ${fail} failed (${pass + fail} total)`);
if (failures.length) { console.log(failures.join('\n')); process.exit(1); }
console.log('ALL PASS');
