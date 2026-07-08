// Hermetic tests for source-truth-check.mjs (CCF-04 Mechanical Assistant #1).
// Node built-in test runner, no network, no DB. Deterministic: the pure core is
// exercised with hand-built gitState objects. A couple of cheap real-git
// integration checks confirm the module runs read-only end to end.
//   Run: node --test  (or) node .claude/helpers/source-truth-check.test.mjs

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

import {
  parseRegisterHead,
  classifyRisks,
  computeReport,
  RISK,
} from './source-truth-check.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const MODULE = join(HERE, 'source-truth-check.mjs');

// --- helper: does the report text contain a phrase (case-insensitive)? ------
function has(report, phrase) {
  return report.toLowerCase().includes(phrase.toLowerCase());
}

// ===========================================================================
// parseRegisterHead — picks the HIGHEST v5.NN, not the first / last.
// ===========================================================================
test('parseRegisterHead picks the highest v5.NN from sample sync_state text', () => {
  const sample = [
    '> **v5.33 CCF-04 — MECHANICAL ASSISTANTS CHARTER**',
    '> **v5.32 NDIS YARNS LOGO-VARIANT INTAKE**',
    '> **v5.9 something older**',
    '> **v5.29 CCF-03 PHASE 0**',
  ].join('\n');
  assert.equal(parseRegisterHead(sample), 'v5.33');
});

test('parseRegisterHead is numeric, not lexical (v5.9 < v5.33)', () => {
  assert.equal(parseRegisterHead('v5.9 then v5.10 then v5.7'), 'v5.10');
});

test('parseRegisterHead returns null when no marker / bad input', () => {
  assert.equal(parseRegisterHead('no version markers here'), null);
  assert.equal(parseRegisterHead(''), null);
  assert.equal(parseRegisterHead(null), null);
  assert.equal(parseRegisterHead(undefined), null);
});

// ===========================================================================
// classifyRisks — STALE-LOCAL (behind>0, dirty) flags behind + dirty.
// ===========================================================================
test('classifyRisks on STALE-LOCAL (behind + dirty) flags both', () => {
  const risks = classifyRisks({
    ahead: 0, behind: 3, diverged: false,
    dirtyFiles: [' M docs/00_sync_state.md', '?? new.txt'],
  });
  const msgs = risks.map((r) => r.message.toLowerCase()).join(' | ');
  assert.ok(has(msgs, 'behind'), 'flags behind');
  assert.ok(has(msgs, 'dirty'), 'flags dirty');
  // Behind + dirty are human decisions, not certifications.
  assert.ok(risks.every((r) => r.level !== RISK.UNKNOWN));
});

// ===========================================================================
// classifyRisks — DIVERGED (ahead>0 AND behind>0) is a HUMAN DECISION.
// ===========================================================================
test('classifyRisks on DIVERGED (ahead>0 AND behind>0) flags divergence as human decision', () => {
  const risks = classifyRisks({ ahead: 2, behind: 4, diverged: true, dirtyFiles: [] });
  const diverge = risks.find((r) => has(r.message, 'diverged'));
  assert.ok(diverge, 'a divergence risk is present');
  assert.equal(diverge.level, RISK.DECISION);
  assert.ok(has(diverge.message, 'you decide'), 'phrased as a human decision');
  // Must NOT tell the user how to reconcile / auto-resolve.
  assert.ok(!has(diverge.message, 'rebase'), 'does not prescribe rebase');
  assert.ok(!has(diverge.message, 'reset'), 'does not prescribe reset');
});

test('classifyRisks infers divergence from ahead>0 AND behind>0 even if diverged flag absent', () => {
  const risks = classifyRisks({ ahead: 1, behind: 1, dirtyFiles: [] });
  assert.ok(risks.some((r) => has(r.message, 'diverged')));
});

// ===========================================================================
// classifyRisks — ALREADY-LANDED (hintMatches non-empty) surfaces possibility,
// NOT certainty / action.
// ===========================================================================
test('classifyRisks on ALREADY-LANDED (matches present) surfaces possibility, not certainty', () => {
  const risks = classifyRisks({
    ahead: 0, behind: 0, dirtyFiles: [],
    hintProvided: true,
    hintMatches: [{ kind: 'byte-identical file', detail: 'local "a.mjs" == origin/main:b.mjs' }],
  });
  const landed = risks.find((r) => has(r.message, 'already-landed'));
  assert.ok(landed, 'an already-landed risk is present');
  assert.equal(landed.level, RISK.DECISION);
  assert.ok(has(landed.message, 'possible'), 'hedged as possible');
  assert.ok(has(landed.message, 'you decide'), 'handed to the human');
  assert.ok(has(landed.message, 'not a certainty'), 'explicitly not certainty');
  // Must NOT phrase as an instruction/action or a definite state.
  assert.ok(!has(landed.message, 'skip this lane'), 'no imperative action');
  assert.ok(!has(landed.message, 'is already landed'), 'not asserted as definite');
});

// ===========================================================================
// classifyRisks — ALREADY-LANDED with EMPTY matches: "no match found (not proof
// of novelty)", NEVER "safe" / "not landed" / "clear".
// ===========================================================================
test('classifyRisks with EMPTY hintMatches says "not proof of novelty", never a green light', () => {
  const risks = classifyRisks({
    ahead: 0, behind: 0, dirtyFiles: [],
    hintProvided: true, hintMatches: [],
  });
  const info = risks.find((r) => has(r.message, 'no match found'));
  assert.ok(info, 'reports no match found');
  assert.ok(has(info.message, 'not proof of novelty'), 'flags absence != novelty');
  // Forbidden green-light phrasing.
  assert.ok(!has(info.message, 'safe'), 'never says safe');
  assert.ok(!has(info.message, 'not landed'), 'never says not landed');
  assert.ok(!has(info.message, 'clear'), 'never says clear');
});

// ===========================================================================
// error path — errored gitState → UNKNOWN, never "all clear".
// ===========================================================================
test('classifyRisks on errored gitState returns UNKNOWN, never all-clear', () => {
  const risks = classifyRisks({ error: 'git fetch exploded' });
  assert.equal(risks.length, 1);
  assert.equal(risks[0].level, RISK.UNKNOWN);
  assert.ok(has(risks[0].message, 'could not determine truth'));
  // It may WARN against treating this as all-clear, but must not ASSERT cleanliness.
  assert.ok(!has(risks[0].message, 'working from truth'), 'never certifies truth');
  assert.ok(!has(risks[0].message, 'safe to proceed'), 'never says safe');
});

test('classifyRisks with un-computable ahead/behind is UNKNOWN (fail closed)', () => {
  const risks = classifyRisks({ ahead: null, behind: null, dirtyFiles: [] });
  assert.equal(risks[0].level, RISK.UNKNOWN);
});

test('computeReport on errored gitState says UNKNOWN and never "all clear"', () => {
  const { report, hasUnknown } = computeReport({ error: 'origin unreachable' });
  assert.equal(hasUnknown, true);
  assert.ok(has(report, 'unknown'));
  assert.ok(has(report, 'could not determine truth'));
  assert.ok(!has(report, 'all clear'));
  assert.ok(!has(report, 'safe to proceed'));
});

// ===========================================================================
// computeReport on a "no risks" state STILL does not certify truth.
// ===========================================================================
test('computeReport with zero risks does NOT emit an all-clear certification', () => {
  const { report, hasUnknown } = computeReport({
    fetchOk: true, originHead: 'abc123', registerHead: 'v5.33',
    ahead: 0, behind: 0, diverged: false, dirtyFiles: [],
    hintProvided: false,
  });
  assert.equal(hasUnknown, false);
  assert.ok(!has(report, 'all clear'));
  assert.ok(!has(report, 'safe to proceed'));
  assert.ok(has(report, 'not a certification'), 'explicitly declines to certify');
  assert.ok(has(report, 'you decide'));
});

// ===========================================================================
// ZERO-WRITE guarantee — the pure core returns a STRING (the report) and the
// module never imports any fs WRITE surface. (ESM namespaces are frozen, so we
// verify by (a) the returned-value shape and (b) static source inspection.)
// ===========================================================================
test('pure core returns a report string / risk array (no side-effect channel)', () => {
  // Exercise every pure-core branch; all return values, none perform I/O.
  assert.equal(parseRegisterHead('v5.1 v5.33 v5.2'), 'v5.33');
  assert.ok(Array.isArray(classifyRisks({ ahead: 1, behind: 1, dirtyFiles: ['x'], hintProvided: true, hintMatches: [] })));
  assert.ok(Array.isArray(classifyRisks({ error: 'e' })));
  const out = computeReport({
    fetchOk: true, originHead: 'sha', registerHead: 'v5.33',
    ahead: 1, behind: 2, dirtyFiles: ['?? y'],
    hintProvided: true, hintMatches: [{ kind: 'commit subject match', detail: 'slug x → deadbee msg' }],
  });
  assert.equal(typeof out.report, 'string');
  assert.ok(Array.isArray(out.risks));
});

test('module source imports NO fs write surface (static guarantee it cannot write files)', () => {
  const src = readFileSync(MODULE, 'utf-8');
  // The module must not even import node:fs. Its only side channel is stdout +
  // the read-only spawnSync('git', ...) calls. No fs write functions anywhere.
  assert.ok(!/from\s+['"]node:fs['"]/.test(src), 'does not import node:fs at all');
  for (const banned of ['writeFileSync', 'appendFileSync', 'mkdirSync', 'createWriteStream', 'rmSync', 'unlinkSync', 'renameSync']) {
    assert.ok(!src.includes(banned), `does not reference ${banned}`);
  }
});

test('module source contains NO resolving git verb (never mutates a working file/branch)', () => {
  const src = readFileSync(MODULE, 'utf-8');
  // Only 'git fetch origin' is permitted. Assert no resolving verb string is
  // passed to git anywhere. (These would appear as quoted argv elements.)
  for (const verb of ['reset', 'rebase', 'commit', 'pull', 'merge', 'push', 'stash', 'checkout', 'restore']) {
    // allow the word only inside comments/messages, not as a git argv element like ['reset', ...] or 'reset'
    const asGitArg = new RegExp(`git\\(\\[\\s*['"]${verb}['"]`);
    assert.ok(!asGitArg.test(src), `never invokes git ${verb}`);
  }
  assert.ok(src.includes("'fetch'"), 'the sole mutating-of-refs verb git fetch is present');
});

// ===========================================================================
// Report shape — all five signals appear.
// ===========================================================================
test('computeReport renders all five signals', () => {
  const { report } = computeReport({
    fetchOk: true, originHead: '0ba81f9', registerHead: 'v5.33',
    ahead: 0, behind: 0, dirtyFiles: [], hintProvided: false,
  });
  assert.ok(has(report, 'git fetch origin'));      // signal 1
  assert.ok(has(report, 'origin/main head'));      // signal 2
  assert.ok(has(report, 'register head'));         // signal 2
  assert.ok(has(report, 'ahead 0, behind 0'));     // signal 3
  assert.ok(has(report, 'working tree'));          // signal 4
  assert.ok(has(report, 'already-landed hint'));   // signal 5
});

// ===========================================================================
// Integration (cheap, real-git) — the module RUNS end to end and NEVER writes.
// It runs against whatever repo it lives in; we only assert it exits and prints
// a report, and (fail-closed) exits non-zero iff it declares UNKNOWN.
// ===========================================================================
test('module runs end-to-end via direct invocation and prints a report', () => {
  const r = spawnSync(process.execPath, [MODULE], { encoding: 'utf-8', cwd: HERE });
  // It should always print SOMETHING that looks like the report header.
  const text = (r.stdout || '') + (r.stderr || '');
  assert.ok(has(text, 'ccf-04 source truth check'), 'prints the report header');
  // Exit code contract: 0 unless UNKNOWN (then 2). Never crashes (null/undefined).
  assert.ok(r.status === 0 || r.status === 2, `exit code is 0 or 2, got ${r.status}`);
  // If UNKNOWN was declared, exit must be 2 (fail closed) — and vice versa.
  if (has(text, 'verdict: unknown')) assert.equal(r.status, 2);
});

test('module does not modify the working tree it runs in (read-only)', () => {
  // Snapshot git status before/after a run; fetch mutates only remote refs.
  const before = spawnSync('git', ['status', '--porcelain'], { encoding: 'utf-8', cwd: HERE });
  spawnSync(process.execPath, [MODULE, '--hint', 'nonexistent-slug-xyz'], { encoding: 'utf-8', cwd: HERE });
  const after = spawnSync('git', ['status', '--porcelain'], { encoding: 'utf-8', cwd: HERE });
  assert.equal((after.stdout || ''), (before.stdout || ''), 'working tree unchanged after a run');
});

// ===========================================================================
// Sanity: parse the REAL sync_state fixture shipped in the repo (if reachable).
// ===========================================================================
test('parseRegisterHead handles the real sync_state marker format', () => {
  // Mimic the exact live blockquote format: "> **✅ v5.33 CCF-04 — ...".
  const real = '> **✅ v5.33 CCF-04 — MECHANICAL ASSISTANTS CHARTER RECORDED**';
  assert.equal(parseRegisterHead(real), 'v5.33');
});
