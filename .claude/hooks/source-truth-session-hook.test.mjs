// Hermetic-ish tests for source-truth-session-hook.mjs (CCF-04 SessionStart adapter).
// The adapter is a thin transport (no pure logic of its own), so the contract is
// integration-shaped: it runs the helper and MUST emit valid SessionStart JSON,
// always exit 0, never certify truth, and never emit a blocking/deny channel.
//   Run: node --test .claude/hooks/source-truth-session-hook.test.mjs

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const HERE = dirname(fileURLToPath(import.meta.url));
const MODULE = join(HERE, 'source-truth-session-hook.mjs');

function runHook() {
  // SessionStart hooks may receive JSON on stdin; this adapter ignores it. Give
  // it an empty object so it behaves like the real invocation.
  return spawnSync(process.execPath, [MODULE], {
    input: '{}', encoding: 'utf-8', cwd: HERE, timeout: 40000, maxBuffer: 16 * 1024 * 1024,
  });
}

test('emits valid SessionStart additionalContext JSON and exits 0', () => {
  const r = runHook();
  assert.equal(r.status, 0, 'always exits 0 (never breaks session start)');
  const out = JSON.parse(r.stdout);
  assert.equal(out.hookSpecificOutput.hookEventName, 'SessionStart');
  const ctx = out.hookSpecificOutput.additionalContext;
  assert.equal(typeof ctx, 'string');
  assert.ok(ctx.length > 0, 'additionalContext is non-empty');
  assert.ok(/source truth check/i.test(ctx), 'labels the panel');
});

test('never certifies truth and never emits a blocking/deny channel', () => {
  const r = runHook();
  const out = JSON.parse(r.stdout);
  const ctx = out.hookSpecificOutput.additionalContext.toLowerCase();
  assert.ok(!ctx.includes('all clear'), 'never says all clear');
  assert.ok(!ctx.includes('safe to proceed'), 'never says safe to proceed');
  // A SessionStart hook must not carry a permission decision.
  assert.ok(!('permissionDecision' in out.hookSpecificOutput), 'no permission decision on a SessionStart hook');
  assert.ok(!r.stdout.includes('deny'), 'no deny channel');
});

test('module source is a transport only — imports NO fs write surface', () => {
  const src = readFileSync(MODULE, 'utf-8');
  assert.ok(!/from\s+['"]node:fs['"]/.test(src), 'does not import node:fs (pure transport, no file writes)');
  for (const banned of ['writeFileSync', 'appendFileSync', 'mkdirSync', 'createWriteStream', 'rmSync', 'unlinkSync']) {
    assert.ok(!src.includes(banned), `does not reference ${banned}`);
  }
  // Every exit is exit(0): a SessionStart adapter must never break startup.
  assert.ok(!/process\.exit\((?!0\))/.test(src), 'every process.exit is exit(0)');
});
