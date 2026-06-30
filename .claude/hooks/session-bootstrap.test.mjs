// Offline fixture tests for session-bootstrap.mjs (CCF-01 Phase 1, bootstrap).
// Tests the pure formatter + an end-to-end run (real repo). Run:
//   node session-bootstrap.test.mjs
import { formatContext, registerHead, gatherGit } from './session-bootstrap.mjs';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const HOOK = join(dirname(fileURLToPath(import.meta.url)), 'session-bootstrap.mjs');

let pass = 0, fail = 0; const failures = [];
function check(name, got, want) {
  if (got === want) pass++; else { fail++; failures.push(`  ✗ ${name}: got "${got}", want "${want}"`); }
}
function checkTrue(name, cond) { check(name, !!cond, true); }

// ---- formatter (pure) -----------------------------------------------------
{
  const ctx = formatContext(
    { branch: 'main', detached: false, head: 'abc1234', dirtyCount: 3, ahead: 1, behind: 0, worktreeCount: 5 },
    [{ path: 'docs/00_sync_state.md', head: 'SYNC HEAD LINE' }, { path: 'docs/00_action_list.md', head: 'ACTION HEAD LINE' }],
  );
  checkTrue('fmt/has branch', /branch: main/.test(ctx));
  checkTrue('fmt/has head', /HEAD: abc1234/.test(ctx));
  checkTrue('fmt/has dirty', /3 changed path/.test(ctx));
  checkTrue('fmt/has parity', /ahead 1, behind 0/.test(ctx));
  checkTrue('fmt/has worktrees', /active worktrees: 5/.test(ctx));
  checkTrue('fmt/as recorded', /AS RECORDED \(not reconciled\)/.test(ctx));
  checkTrue('fmt/sync register', /SYNC HEAD LINE/.test(ctx));
  checkTrue('fmt/action register', /ACTION HEAD LINE/.test(ctx));
  checkTrue('fmt/no-approval note', /does not reconcile registers or grant any approval/.test(ctx));
}
{
  const ctx = formatContext(
    { branch: null, detached: true, head: null, dirtyCount: null, ahead: null, behind: null, worktreeCount: null },
    [],
  );
  checkTrue('fmt/detached marker', /DETACHED HEAD/.test(ctx));
}

// ---- registerHead on a missing file degrades gracefully -------------------
checkTrue('regHead/missing graceful', /could not read/.test(registerHead('docs/__nope__.md')));
// ---- registerHead on a real register returns text -------------------------
checkTrue('regHead/real non-empty', registerHead('docs/00_sync_state.md').length > 0);

// ---- gatherGit returns a shaped object (real repo) ------------------------
{
  const g = gatherGit();
  checkTrue('gather/has branch key', Object.prototype.hasOwnProperty.call(g, 'branch'));
  checkTrue('gather/detached bool', typeof g.detached === 'boolean');
}

// ---- end-to-end: emits SessionStart additionalContext JSON, exit 0 --------
{
  const r = spawnSync(process.execPath, [HOOK], { input: '', encoding: 'utf-8' });
  check('e2e/exit0', r.status, 0);
  let parsed = null; try { parsed = JSON.parse(r.stdout); } catch {}
  checkTrue('e2e/json output', parsed && parsed.hookSpecificOutput);
  check('e2e/event name', parsed && parsed.hookSpecificOutput.hookEventName, 'SessionStart');
  checkTrue('e2e/has additionalContext', parsed && typeof parsed.hookSpecificOutput.additionalContext === 'string');
  checkTrue('e2e/context mentions branch', parsed && /branch:/.test(parsed.hookSpecificOutput.additionalContext));
}

console.log(`\nsession-bootstrap fixtures: ${pass} passed, ${fail} failed (${pass + fail} total)`);
if (failures.length) { console.log(failures.join('\n')); process.exit(1); }
console.log('ALL PASS');
