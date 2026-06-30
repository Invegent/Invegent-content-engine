// Offline fixture tests for deploy-verify-jwt-guard.mjs (CCF-01 Phase 1, Guard 1).
// No network, no deploy. Run: node deploy-verify-jwt-guard.test.mjs
import { classifyDeploy, isDeploySegment, splitSegments, extractCommand } from './deploy-verify-jwt-guard.mjs';
import { spawnSync } from 'node:child_process';
import { readFileSync, existsSync, rmSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { tmpdir } from 'node:os';

const HOOK = join(dirname(fileURLToPath(import.meta.url)), 'deploy-verify-jwt-guard.mjs');
const TEST_LOG = join(tmpdir(), 'deploy-guard-dryrun.test.log');

let pass = 0, fail = 0; const failures = [];
function check(name, got, want) {
  if (got === want) pass++; else { fail++; failures.push(`  ✗ ${name}: got "${got}", want "${want}"`); }
}
function checkTrue(name, cond) { check(name, !!cond, true); }

// ---- DENY: deploy missing the flag ---------------------------------------
const DENY = [
  ['plain deploy', 'supabase functions deploy ai-worker'],
  ['npx deploy', 'npx supabase functions deploy ai-worker'],
  ['deploy with other flags', 'supabase functions deploy ai-worker --project-ref abc'],
  ['chained, deploy unguarded', 'echo hi && supabase functions deploy x'],
  ['chained, only first guarded', 'supabase functions deploy a --no-verify-jwt && supabase functions deploy b'],
];
for (const [n, c] of DENY) check(`DENY/${n}`, classifyDeploy(c).decision, 'deny');

// ---- ALLOW: flag present, or not a deploy --------------------------------
const ALLOW = [
  ['deploy with flag', 'supabase functions deploy ai-worker --no-verify-jwt'],
  ['deploy with flag + extras', 'supabase functions deploy ai-worker --no-verify-jwt --project-ref abc'],
  ['npx deploy with flag', 'npx supabase functions deploy x --no-verify-jwt'],
  ['both deploys guarded', 'supabase functions deploy a --no-verify-jwt && supabase functions deploy b --no-verify-jwt'],
  ['not a deploy', 'git status'],
  ['supabase but not deploy', 'supabase functions list'],
  ['secrets set mentions deploy word', 'supabase secrets set FOO=deploy'],
];
for (const [n, c] of ALLOW) check(`ALLOW/${n}`, classifyDeploy(c).decision, 'allow');

// ---- helpers --------------------------------------------------------------
checkTrue('isDeploySegment true', isDeploySegment('supabase functions deploy x'));
check('isDeploySegment false', isDeploySegment('git commit'), false);
check('splitSegments count', splitSegments('a && b ; c').length, 3);
check('extractCommand', extractCommand({ command: 'x' }), 'x');
check('extractCommand none', extractCommand({ foo: 1 }), null);

// ---- end-to-end spawn -----------------------------------------------------
function runHook(stdin, { args = [], env = {} } = {}) {
  const r = spawnSync(process.execPath, [HOOK, ...args], { input: stdin, encoding: 'utf-8', env: { ...process.env, ...env } });
  return { code: r.status, out: (r.stdout || '').trim(), err: (r.stderr || '').trim() };
}
function readLog() {
  return existsSync(TEST_LOG) ? readFileSync(TEST_LOG, 'utf-8').trim().split('\n').filter(Boolean).map((l) => JSON.parse(l)) : [];
}

// ENFORCING: unguarded deploy blocks
{
  const r = runHook(JSON.stringify({ tool_name: 'Bash', tool_input: { command: 'supabase functions deploy x' } }));
  check('ENF/deploy exit', r.code, 0);
  let d = '(none)'; try { d = JSON.parse(r.out).hookSpecificOutput.permissionDecision; } catch {}
  check('ENF/deploy deny', d, 'deny');
}
// ENFORCING: guarded deploy defers silently
{
  const r = runHook(JSON.stringify({ tool_name: 'Bash', tool_input: { command: 'supabase functions deploy x --no-verify-jwt' } }));
  check('ENF/guarded exit', r.code, 0);
  check('ENF/guarded no-output', r.out, '');
}
// ENFORCING: non-Bash defers
{
  const r = runHook(JSON.stringify({ tool_name: 'Read', tool_input: { file_path: 'x' } }));
  check('ENF/non-bash no-output', r.out, '');
}
// ENFORCING: malformed fails closed
{
  const r = runHook('not json');
  check('ENF/malformed exit2', r.code, 2);
}
// LOG-ONLY: never blocks, records would-deny
rmSync(TEST_LOG, { force: true });
const LOGENV = { DEPLOY_GUARD_LOG: TEST_LOG };
{
  const r = runHook(JSON.stringify({ tool_name: 'Bash', tool_input: { command: 'supabase functions deploy x' } }), { args: ['--log-only'], env: LOGENV });
  check('LOG/deploy exit0', r.code, 0);
  check('LOG/deploy no stdout', r.out, '');
}
{
  const r = runHook('not json', { args: ['--log-only'], env: LOGENV });
  check('LOG/malformed exit0', r.code, 0);
}
{
  const lines = readLog();
  checkTrue('LOG/recorded would-deny', lines.some((l) => l.would_decision === 'deny' && /deploy/.test(l.command_preview || '')));
  checkTrue('LOG/recorded parse error', lines.some((l) => l.event === 'json_parse_error'));
}
rmSync(TEST_LOG, { force: true });

console.log(`\ndeploy-verify-jwt-guard fixtures: ${pass} passed, ${fail} failed (${pass + fail} total)`);
if (failures.length) { console.log(failures.join('\n')); process.exit(1); }
console.log('ALL PASS');
