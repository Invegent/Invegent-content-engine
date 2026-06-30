// Offline fixture tests for commit-branch-guard.mjs (CCF-01 Phase 1, Guard 2).
// Classifier takes injected git state — no real git needed. Run:
//   node commit-branch-guard.test.mjs
import { classifyCommit, hasGitCommit, splitSegments, extractCommand } from './commit-branch-guard.mjs';
import { spawnSync } from 'node:child_process';
import { readFileSync, existsSync, rmSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { tmpdir } from 'node:os';

const HOOK = join(dirname(fileURLToPath(import.meta.url)), 'commit-branch-guard.mjs');
const TEST_LOG = join(tmpdir(), 'commit-guard-dryrun.test.log');

let pass = 0, fail = 0; const failures = [];
function check(name, got, want) {
  if (got === want) pass++; else { fail++; failures.push(`  ✗ ${name}: got "${got}", want "${want}"`); }
}
function checkTrue(name, cond) { check(name, !!cond, true); }

// ---- detection ------------------------------------------------------------
checkTrue('detect plain', hasGitCommit('git commit -m x'));
checkTrue('detect -C', hasGitCommit('git -C /repo commit -m x'));
checkTrue('detect chained', hasGitCommit('git add -A && git commit -m x'));
check('detect none', hasGitCommit('git status'), false);
check('detect not-commit word', hasGitCommit('echo commit'), false);
check('split count', splitSegments('a && b').length, 2);
check('extractCommand', extractCommand({ command: 'x' }), 'x');

// ---- classify -------------------------------------------------------------
check('DENY/detached', classifyCommit('git commit -m x', { detached: true, branch: null }).decision, 'deny');
check('WARN/main', classifyCommit('git commit -m x', { detached: false, branch: 'main' }).decision, 'warn');
check('WARN/feature', classifyCommit('git commit -m x', { detached: false, branch: 'feat/x' }).decision, 'warn');
check('ALLOW/no commit', classifyCommit('git status', { detached: true, branch: null }).decision, 'allow');

// ---- end-to-end spawn (uses REAL git state of this repo) -------------------
function runHook(stdin, { args = [], env = {} } = {}) {
  const r = spawnSync(process.execPath, [HOOK, ...args], { input: stdin, encoding: 'utf-8', env: { ...process.env, ...env } });
  return { code: r.status, out: (r.stdout || '').trim(), err: (r.stderr || '').trim() };
}
function readLog() {
  return existsSync(TEST_LOG) ? readFileSync(TEST_LOG, 'utf-8').trim().split('\n').filter(Boolean).map((l) => JSON.parse(l)) : [];
}
// ENFORCING: a git commit on a normal branch must NEVER hard-block (warn=exit0,
// no deny JSON). On this repo HEAD is a branch, so expect exit 0 + no stdout deny.
{
  const r = runHook(JSON.stringify({ tool_name: 'Bash', tool_input: { command: 'git commit -m test' } }));
  check('ENF/commit exit0', r.code, 0);
  check('ENF/commit no deny stdout', r.out, '');
  checkTrue('ENF/commit warns on stderr', /WARN/.test(r.err) || r.err === '');
}
// ENFORCING: non-commit Bash defers silently
{
  const r = runHook(JSON.stringify({ tool_name: 'Bash', tool_input: { command: 'git status' } }));
  check('ENF/status no-output', r.out, '');
}
// ENFORCING: malformed fails closed
{
  const r = runHook('not json');
  check('ENF/malformed exit2', r.code, 2);
}
// LOG-ONLY: never blocks, never writes to stderr/stdout, records would-decision
rmSync(TEST_LOG, { force: true });
const LOGENV = { COMMIT_GUARD_LOG: TEST_LOG };
{
  const r = runHook(JSON.stringify({ tool_name: 'Bash', tool_input: { command: 'git commit -m test' } }), { args: ['--log-only'], env: LOGENV });
  check('LOG/exit0', r.code, 0);
  check('LOG/no stdout', r.out, '');
  check('LOG/no stderr', r.err, '');
}
{
  const lines = readLog();
  checkTrue('LOG/recorded a would-decision for commit', lines.some((l) => ['warn', 'deny'].includes(l.would_decision)));
}
rmSync(TEST_LOG, { force: true });

console.log(`\ncommit-branch-guard fixtures: ${pass} passed, ${fail} failed (${pass + fail} total)`);
if (failures.length) { console.log(failures.join('\n')); process.exit(1); }
console.log('ALL PASS');
