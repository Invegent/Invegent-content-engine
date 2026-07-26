// Hermetic tests for claim-stub-register-guard.mjs (CCF-04 PreToolUse guard).
// Node built-in test runner, no network, no DB. The pure core is exercised with
// hand-built inputs; a couple of cheap end-to-end checks confirm the guard runs
// read-only, emits nothing in --log-only, and can NEVER emit a deny decision.
//   Run: node --test .claude/hooks/claim-stub-register-guard.test.mjs

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

import {
  REGISTER_FILES,
  touchesRegister,
  classifyRegisterCut,
} from './claim-stub-register-guard.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const MODULE = join(HERE, 'claim-stub-register-guard.mjs');

// ===========================================================================
// touchesRegister — detects a staged register file (full or relative path).
// ===========================================================================
test('touchesRegister true when a register file is staged', () => {
  assert.equal(touchesRegister(['docs/00_sync_state.md']), true);
  assert.equal(touchesRegister(['src/x.ts', 'docs/00_action_list.md']), true);
  // Full-path form (git may report either).
  assert.equal(touchesRegister(['C:/repo/docs/00_sync_state.md']), true);
});

test('touchesRegister false for non-register staged sets / bad input', () => {
  assert.equal(touchesRegister(['.claude/helpers/source-truth-check.mjs', 'README.md']), false);
  assert.equal(touchesRegister([]), false);
  assert.equal(touchesRegister(null), false);
  assert.equal(touchesRegister(undefined), false);
  // A file that merely CONTAINS a register name as a substring but is a different
  // path should not false-trigger on a bare basename mid-path.
  assert.equal(touchesRegister(['docs/archive/notes-about-00_sync_state.md.bak']), false);
});

test('REGISTER_FILES is the two ICE registers', () => {
  assert.deepEqual([...REGISTER_FILES].sort(), ['docs/00_action_list.md', 'docs/00_sync_state.md']);
});

// ===========================================================================
// classifyRegisterCut — skip / info / warn / noscan.
// ===========================================================================
test('classify SKIP when not a commit or no register staged', () => {
  assert.equal(classifyRegisterCut({ hasCommit: false, registerStaged: true, scan: {} }).decision, 'skip');
  assert.equal(classifyRegisterCut({ hasCommit: true, registerStaged: false, scan: {} }).decision, 'skip');
});

test('classify NOSCAN (honest) when a register cut has no scan result', () => {
  const c = classifyRegisterCut({ hasCommit: true, registerStaged: true, scan: null });
  assert.equal(c.decision, 'noscan');
  assert.ok(/not proof of no collision/i.test(c.reason), 'absence is not proof of no collision');
});

test('classify INFO with highest + next-free when a clean register cut is detected', () => {
  const scan = {
    scan: { overallHighest: 'v6.28' },
    proposedIdentifier: 'v6.29',
    collision: { present: false, keys: [] },
  };
  const c = classifyRegisterCut({ hasCommit: true, registerStaged: true, scan });
  assert.equal(c.decision, 'info');
  assert.equal(c.highest, 'v6.28');
  assert.equal(c.proposed, 'v6.29');
  assert.ok(/not proof none exists off-scan/i.test(c.reason), 'clean is hedged, not certified');
});

test('classify WARN (never block) on a real collision — human reconciles', () => {
  const scan = {
    scan: { overallHighest: 'v6.28' },
    proposedIdentifier: null,
    collision: { present: true, keys: ['v6.28'] },
  };
  const c = classifyRegisterCut({ hasCommit: true, registerStaged: true, scan });
  assert.equal(c.decision, 'warn');
  assert.ok(c.reason.toLowerCase().includes('collision'));
  assert.ok(/human reconciles|reconcile/i.test(c.reason), 'reconcile is a human decision');
  assert.ok(/never picks a winner|never renumber/i.test(c.reason), 'claim-stub never resolves');
});

// ===========================================================================
// ZERO-AUTHORITY static guarantee — the guard can NEVER emit a deny decision.
// (The whole charter point: it informs, it never blocks a commit.)
// ===========================================================================
test('module source NEVER emits a permissionDecision deny (informs, never blocks)', () => {
  const src = readFileSync(MODULE, 'utf-8');
  assert.ok(!/permissionDecision/.test(src), 'no permissionDecision anywhere — cannot block');
  assert.ok(!/["']deny["']/.test(src), 'never references a deny decision');
  // Every exit in the module is exit(0): a scan/guard failure must never block.
  assert.ok(!/process\.exit\((?!0\))/.test(src), 'every process.exit is exit(0) — never a blocking exit code');
});

test('module imports NO fs write surface beyond the append-only dry-run log', () => {
  const src = readFileSync(MODULE, 'utf-8');
  // appendFileSync is permitted (the dry-run log, mirrors commit-branch-guard).
  for (const banned of ['writeFileSync', 'mkdirSync', 'createWriteStream', 'rmSync', 'unlinkSync', 'renameSync']) {
    assert.ok(!src.includes(banned), `does not reference ${banned}`);
  }
});

// ===========================================================================
// Integration — the guard runs read-only end to end and BLOCKS NOTHING.
// ===========================================================================
function runGuard(hookInput, args = []) {
  return spawnSync(process.execPath, [MODULE, ...args], {
    input: JSON.stringify(hookInput), encoding: 'utf-8', cwd: HERE,
  });
}

test('non-commit Bash call -> exit 0, no stdout decision', () => {
  const r = runGuard({ tool_name: 'Bash', tool_input: { command: 'ls -la' } });
  assert.equal(r.status, 0);
  assert.equal((r.stdout || '').trim(), '', 'emits no permission decision on stdout');
});

test('--log-only run emits NOTHING to stdout/stderr and exits 0 (a real git commit input)', () => {
  const r = runGuard(
    { tool_name: 'Bash', tool_input: { command: 'git commit -m "x"' } },
    ['--log-only'],
  );
  assert.equal(r.status, 0);
  assert.equal((r.stdout || ''), '', 'log-only writes nothing to stdout');
  assert.equal((r.stderr || ''), '', 'log-only writes nothing to stderr');
});

test('guard never writes a stdout deny even when handed a commit (enforcing mode)', () => {
  // Whatever the live staged state, the guard must never emit a deny JSON.
  const r = runGuard({ tool_name: 'Bash', tool_input: { command: 'git commit -m "y"' } });
  assert.equal(r.status, 0, 'never a blocking exit code');
  assert.ok(!(r.stdout || '').includes('deny'), 'no deny decision on stdout');
  assert.ok(!(r.stdout || '').includes('permissionDecision'), 'no permission decision on stdout');
});
