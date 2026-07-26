// Hermetic tests for register-pointer.mjs (CCF-04 Mechanical Assistant #6).
// Node built-in test runner, no network, no DB, no git. The pure core is
// exercised with injected facts; a few CLI checks confirm it runs read-only and
// fail-closed. Run: node --test .claude/helpers/register-pointer.test.mjs

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

import {
  VERDICT, NORMALIZED, POINTER_LINE_BUDGET,
  normalizedVerdict, validateInputs,
  composeSyncStateBlock, syncStateBlockText, composeActionListMarker, pointerLineCount,
  computeResult, renderJson, renderReport,
} from './register-pointer.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const MODULE = join(HERE, 'register-pointer.mjs');

// A minimal VALID fact set (header + verdict + next-gate => 3 lines, under budget).
function baseReq(over = {}) {
  return {
    version: 'v6.29',
    title: 'CCF-04 REGISTER-POINTER-TEMPLATE BUILT',
    date: '2026-07-26 Sydney',
    verdict: 'built + tested (30 hermetic)',
    resultDocs: ['docs/briefs/results/ccf-04-register-pointer-build-result-v1.md'],
    nextGate: 'PK Gate-2 ruling',
    additive: true,
    ...over,
  };
}

// ===========================================================================
// validateInputs — every required fact, version format, additive affirmation.
// ===========================================================================
test('validateInputs passes on a complete fact set', () => {
  assert.equal(validateInputs(baseReq()).ok, true);
});

test('validateInputs fails on each missing required field', () => {
  for (const f of ['version', 'title', 'date', 'verdict', 'nextGate']) {
    const req = baseReq(); delete req[f];
    const r = validateInputs(req);
    assert.equal(r.ok, false, `${f} missing -> invalid`);
    assert.ok(r.errors.some((e) => e.field === f), `flags ${f}`);
  }
});

test('validateInputs rejects a malformed version (must be vMAJOR.MINOR)', () => {
  for (const bad of ['6.29', 'v6', 'v6.x', 'version 6.29', 'v6.29.0']) {
    const r = validateInputs(baseReq({ version: bad }));
    assert.equal(r.ok, false, `${bad} rejected`);
    assert.ok(r.errors.some((e) => e.field === 'version'));
  }
});

test('validateInputs requires at least one result-doc (Convention 1)', () => {
  assert.equal(validateInputs(baseReq({ resultDocs: [] })).ok, false);
  assert.equal(validateInputs(baseReq({ resultDocs: undefined })).ok, false);
});

test('validateInputs requires additive === true explicitly (no history rewrite)', () => {
  assert.equal(validateInputs(baseReq({ additive: false })).ok, false);
  assert.equal(validateInputs(baseReq({ additive: undefined })).ok, false);
  assert.equal(validateInputs(baseReq({ additive: 'yes' })).ok, false);
  assert.equal(validateInputs(baseReq({ additive: true })).ok, true);
});

// ===========================================================================
// Composition fidelity — exact canonical register format.
// ===========================================================================
test('composeSyncStateBlock renders the canonical header + chained detail lines', () => {
  const lines = composeSyncStateBlock(baseReq({ glyph: '🧾', identity: 'commit abc1234' }));
  assert.match(lines[0], /^> \*\*🧾 v6\.29 — CCF-04 REGISTER-POINTER-TEMPLATE BUILT\*\* — records: `docs\/briefs\/results\/ccf-04-register-pointer-build-result-v1\.md`\.$/);
  assert.ok(lines.some((l) => /^> · \*\*Verdict:\*\* /.test(l)));
  assert.ok(lines.some((l) => /^> · \*\*Identity:\*\* commit abc1234\.$/.test(l)));
  assert.match(lines[lines.length - 1], /^> · \*\*NEXT GATE:\*\* PK Gate-2 ruling\.$/);
});

test('glyph defaults to 🧾 when absent', () => {
  const lines = composeSyncStateBlock(baseReq());
  assert.ok(lines[0].startsWith('> **🧾 v6.29 —'));
});

test('multiple result docs are joined with " · " and back-ticked', () => {
  const lines = composeSyncStateBlock(baseReq({
    resultDocs: ['docs/briefs/results/a.md', 'docs/briefs/results/b.md'],
  }));
  assert.ok(lines[0].includes('records: `docs/briefs/results/a.md` · `docs/briefs/results/b.md`.'));
});

test('syncStateBlockText ends with the trailing blank blockquote line', () => {
  assert.ok(syncStateBlockText(baseReq()).endsWith('\n>'));
});

test('composeActionListMarker renders the single current-marker line', () => {
  const m = composeActionListMarker(baseReq());
  assert.match(m, /^> Last updated: 2026-07-26 Sydney — \*\*current marker v6\.29 — CCF-04 REGISTER-POINTER-TEMPLATE BUILT\*\* — records: `docs\/briefs\/results\/ccf-04-register-pointer-build-result-v1\.md`\. NEXT GATE: PK Gate-2 ruling\.$/);
});

test('identity line is omitted when no identity is supplied', () => {
  const lines = composeSyncStateBlock(baseReq());
  assert.ok(!lines.some((l) => l.includes('Identity:')));
});

// ===========================================================================
// computeResult — COMPOSED (clean), text present in BOTH forms.
// ===========================================================================
test('computeResult COMPOSED on a clean fact set, emits both blocks', () => {
  const r = computeResult(baseReq());
  assert.equal(r.verdict, VERDICT.COMPOSED);
  assert.equal(r.normalized, NORMALIZED.CLEAN);
  assert.ok(r.composed && typeof r.composed.syncStateBlock === 'string');
  assert.ok(r.composed.actionListMarker.includes('current marker v6.29'));
  // The propose-only reminder is always present (INFO, never changes verdict).
  assert.ok(r.findings.some((f) => f.code === 'propose-only'));
});

// ===========================================================================
// FAIL-CLOSED — missing/invalid required fact -> INCOMPLETE, text WITHHELD.
// ===========================================================================
test('computeResult INCOMPLETE withholds the composed text entirely', () => {
  const r = computeResult(baseReq({ verdict: '' }));
  assert.equal(r.verdict, VERDICT.INCOMPLETE);
  assert.equal(r.normalized, NORMALIZED.BLOCK);
  assert.equal(r.composed, null, 'no partial/malformed pointer is ever emitted');
});

test('non-additive request is INCOMPLETE, no text', () => {
  const r = computeResult(baseReq({ additive: false }));
  assert.equal(r.verdict, VERDICT.INCOMPLETE);
  assert.equal(r.composed, null);
});

test('a thrown/garbage request fails closed to INCOMPLETE', () => {
  assert.equal(computeResult(null).verdict, VERDICT.INCOMPLETE);
  assert.equal(computeResult({ _error: 'boom' }).verdict, VERDICT.INCOMPLETE);
});

// ===========================================================================
// CONCERNS — well-formed but flagged: overlong / non-standard result-doc path.
// CONCERNS STILL emits text (a human decides whether to trim/confirm).
// ===========================================================================
test('over-budget pointer is CONCERNS but still emits the (trimmable) text', () => {
  const req = baseReq({
    identity: 'commit abc',
    details: ['detail one', 'detail two', 'detail three'], // 1+1+1+3+1 = 7 > 5
  });
  assert.ok(pointerLineCount(req) > POINTER_LINE_BUDGET);
  const r = computeResult(req);
  assert.equal(r.verdict, VERDICT.CONCERNS);
  assert.equal(r.normalized, NORMALIZED.CONCERNS);
  assert.ok(r.composed, 'CONCERNS still emits well-formed text for the human to trim');
  assert.ok(r.findings.some((f) => f.code === 'overlong-pointer'));
});

test('a result-doc outside docs/briefs/results/*.md is CONCERNS, not a block', () => {
  const r = computeResult(baseReq({ resultDocs: ['docs/notes/somewhere.md'] }));
  assert.equal(r.verdict, VERDICT.CONCERNS);
  assert.ok(r.composed, 'still composes; the path is a human confirm, not a hard error');
  assert.ok(r.findings.some((f) => f.code === 'nonstandard-result-doc'));
});

test('INCOMPLETE beats CONCERNS (precedence, fail-closed)', () => {
  // Over-budget (CONCERNS) AND missing verdict (INCOMPLETE) -> INCOMPLETE wins.
  const r = computeResult(baseReq({ verdict: '', details: ['a', 'b', 'c', 'd', 'e'] }));
  assert.equal(r.verdict, VERDICT.INCOMPLETE);
  assert.equal(r.composed, null);
});

// ===========================================================================
// Verdict mapping + determinism + zero-write guarantee.
// ===========================================================================
test('normalizedVerdict maps the three natives (fail-closed default = block)', () => {
  assert.equal(normalizedVerdict(VERDICT.COMPOSED), NORMALIZED.CLEAN);
  assert.equal(normalizedVerdict(VERDICT.CONCERNS), NORMALIZED.CONCERNS);
  assert.equal(normalizedVerdict(VERDICT.INCOMPLETE), NORMALIZED.BLOCK);
  assert.equal(normalizedVerdict('anything-else'), NORMALIZED.BLOCK);
});

test('renderJson is deterministic (byte-identical across runs on identical input)', () => {
  const a = renderJson(computeResult(baseReq()));
  const b = renderJson(computeResult(baseReq()));
  assert.equal(a, b);
});

test('module source imports NO fs write surface (cannot write a register)', () => {
  const src = readFileSync(MODULE, 'utf-8');
  for (const banned of ['writeFileSync', 'appendFileSync', 'mkdirSync', 'createWriteStream', 'rmSync', 'unlinkSync', 'renameSync']) {
    assert.ok(!src.includes(banned), `does not reference ${banned}`);
  }
  // No git, no network — pure composition (readFileSync is only for --input).
  assert.ok(!/spawnSync|child_process|node:https?|fetch\(/.test(src), 'no git/network surface');
});

test('renderReport shows the WITHHELD note on a fail-closed result', () => {
  const rep = renderReport(computeResult(baseReq({ title: '' })));
  assert.ok(/NO pointer composed/i.test(rep));
  assert.ok(/VERDICT : INCOMPLETE/.test(rep));
});

// ===========================================================================
// CLI — read-only, fail-closed exit codes.
// ===========================================================================
function runCli(args) {
  return spawnSync(process.execPath, [MODULE, ...args], { encoding: 'utf-8', cwd: HERE });
}

test('CLI --json on a clean payload -> COMPOSED, exit 0, prints both blocks', () => {
  const r = runCli(['--json', JSON.stringify(baseReq())]);
  assert.equal(r.status, 0);
  assert.ok(r.stdout.includes('current marker v6.29'));
  assert.ok(r.stdout.includes('sync_state pointer block'));
});

test('CLI --json missing a field -> INCOMPLETE, exit 2, withholds text', () => {
  const req = baseReq(); delete req.nextGate;
  const r = runCli(['--json', JSON.stringify(req)]);
  assert.equal(r.status, 2);
  assert.ok(/NO pointer composed/i.test(r.stdout));
});

test('CLI --format json emits parseable canonical JSON', () => {
  const r = runCli(['--json', JSON.stringify(baseReq()), '--format', 'json']);
  assert.equal(r.status, 0);
  const parsed = JSON.parse(r.stdout);
  assert.equal(parsed.schema, 'ccf-04-register-pointer/v1');
  assert.equal(parsed.verdict, 'COMPOSED');
});

test('CLI with no input prints usage and exits 2 (never a silent empty pointer)', () => {
  const r = runCli([]);
  assert.equal(r.status, 2);
  assert.ok(/required/i.test(r.stdout));
});
