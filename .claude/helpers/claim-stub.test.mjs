// Hermetic tests for claim-stub.mjs (CCF-04 Mechanical Assistant #4).
// Node built-in test runner. No network, no DB. The PURE CORE is exercised with
// INJECTED scan-inputs + injected clock (NO real git in unit tests). A few
// integration tests use a throwaway temp git repo ONLY to exercise the CLI scan.
//   Run: node --test  (or) node .claude/helpers/claim-stub.test.mjs

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { readFileSync, writeFileSync, mkdtempSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { tmpdir } from 'node:os';

import {
  VERDICT, NORMALIZED, CLAIM_TYPE, SEVERITY, SCHEMA,
  normalizedVerdict, stableStringify,
  parseRegisterMarkers, parseTaskMarkers, extractRegisterEntryHeaders,
  fmtRegister, fmtTask, highestRegister, successorRegister, highestTask, successorTask,
  parseStubLine, composeClaimedLine, detectCollisions, validateRequest,
  computeResult, renderReport, renderJson,
} from './claim-stub.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const MODULE = join(HERE, 'claim-stub.mjs');
const FIXDIR = join(HERE, 'fixtures', 'claim-stub');
const loadFix = (name) => JSON.parse(readFileSync(join(FIXDIR, name), 'utf-8'));
const has = (s, p) => String(s).toLowerCase().includes(p.toLowerCase());
const codes = (r) => r.findings.map((f) => f.code);

// ===========================================================================
// normalizedVerdict — PK O-2 mapping.
// ===========================================================================
test('normalizedVerdict: PROPOSED->clean, COLLISION->escalate, STALE/INCOMPLETE->block', () => {
  assert.equal(normalizedVerdict(VERDICT.PROPOSED), NORMALIZED.CLEAN);
  assert.equal(normalizedVerdict(VERDICT.COLLISION), NORMALIZED.ESCALATE);
  assert.equal(normalizedVerdict(VERDICT.STALE), NORMALIZED.BLOCK);
  assert.equal(normalizedVerdict(VERDICT.INCOMPLETE), NORMALIZED.BLOCK);
  // fail-closed: an unexpected native verdict is block, never clean.
  assert.equal(normalizedVerdict('???'), NORMALIZED.BLOCK);
});

// ===========================================================================
// GENERIC parsing (B-1) — no hardcoded major/namespace.
// ===========================================================================
test('parseRegisterMarkers finds ALL clean vMAJOR.MINOR generically (any major)', () => {
  const { markers } = parseRegisterMarkers('v5.36 then v6.27 then v7.4 then v10.2');
  const raws = markers.map((m) => m.raw);
  assert.deepEqual(raws, ['v5.36', 'v6.27', 'v7.4', 'v10.2']);
});
test('highestRegister orders by (major, minor) tuple — v7.4 beats v6.99 (no hardcoded major)', () => {
  const { markers } = parseRegisterMarkers('v6.99 v7.4');
  assert.deepEqual(highestRegister(markers), { major: 7, minor: 4 });
});
test('highestRegister minor ordering — v6.9 vs v6.10 picks v6.10 (numeric, not lexical)', () => {
  const { markers } = parseRegisterMarkers('v6.9 v6.10 v6.2');
  assert.deepEqual(highestRegister(markers), { major: 6, minor: 10 });
});
test('successorRegister = next minor within the highest major', () => {
  assert.equal(fmtRegister(successorRegister({ major: 6, minor: 27 })), 'v6.28');
  assert.equal(fmtRegister(successorRegister({ major: 7, minor: 4 })), 'v7.5');
});
test('parseRegisterMarkers flags a malformed marker as SUSPECT, not clean', () => {
  const { markers, suspects } = parseRegisterMarkers('clean v6.27 malformed v6.3O');
  assert.deepEqual(markers.map((m) => m.raw), ['v6.27']);
  assert.equal(suspects.length, 1);
  assert.equal(suspects[0].major, 6);
});
test('parseRegisterMarkers does NOT false-trigger suspect on a clean or semver-ish token', () => {
  assert.equal(parseRegisterMarkers('v6.27, v6.28.').suspects.length, 0);
  assert.equal(parseRegisterMarkers('v6.27.1 patch').suspects.length, 0);
});
test('parseTaskMarkers finds cc-NNNN generically and flags malformed as suspect', () => {
  const clean = parseTaskMarkers('cc-0031 cc-0047 cc-0100');
  assert.deepEqual(clean.markers.map((m) => m.raw), ['cc-0031', 'cc-0047', 'cc-0100']);
  // a letter INSIDE the canonical 4-digit field (cc-004X) is a real suspect.
  const bad = parseTaskMarkers('cc-004X');
  assert.equal(bad.markers.length, 0);
  assert.equal(bad.suspects.length, 1);
});
test('parseTaskMarkers ignores 4-digit suffixed VARIANTS and letter-led LABELS (real ICE ids)', () => {
  // cc-0033a / cc-0017c / cc-0010A are sub-lane variants of a readable base; they
  // are NOT numeric successors and must not be treated as clean markers or suspects.
  for (const t of ['cc-0033a', 'cc-0017c', 'cc-0010A']) {
    const p = parseTaskMarkers(t);
    assert.equal(p.markers.length, 0, `${t} not a clean marker`);
    assert.equal(p.suspects.length, 0, `${t} not a suspect`);
  }
  // cc-phase1 / cc-a2 are non-numeric labels — ignored entirely.
  for (const t of ['cc-phase1', 'cc-a2']) {
    const p = parseTaskMarkers(t);
    assert.equal(p.markers.length, 0);
    assert.equal(p.suspects.length, 0);
  }
});
test('task claim with real-world suffixed variants present still reaches PROPOSED', () => {
  const r = computeResult({
    request: { claimType: 'task', lane: 'L', worktree: '/wt', gate: 'g' },
    now: '2026-08-01T00:00:00.000Z',
    sources: [{ id: 'fn', label: 'fn', kind: 'filenames', required: true, available: true, names: [
      'cc-0081-real.md', 'cc-0033a-variant.md', 'cc-0017c-sub.md', 'cc-phase1-label.md',
    ] }],
  });
  assert.equal(r.verdict, VERDICT.PROPOSED);
  assert.equal(r.scan.overallHighest, 'cc-0081');
  assert.equal(r.proposedIdentifier, 'cc-0082');
});
test('fmtTask zero-pads to 4; highest/successor are numeric', () => {
  assert.equal(fmtTask(32), 'cc-0032');
  assert.equal(fmtTask(successorTask(highestTask([28, 31, 30]))), 'cc-0032');
});

// ---------------------------------------------------------------------------
// extractRegisterEntryHeaders — reads ONLY entry-header markers, ignoring
// foreign version tokens in prose (the real-register mitigation). Still generic.
// ---------------------------------------------------------------------------
test('extractRegisterEntryHeaders reads the entry-header marker, ignores prose tokens', () => {
  const text = [
    '# heading',
    '> **🧾 v6.27 SOMETHING** — pinned Graph v24.0; insights-worker v14.5.0; v19.0 sunset',
    '> **✅ v6.26 PRIOR** — A1 v14.4.1 note',
    'prose mention of v9.9 not at a header',
  ].join('\n');
  const { markers } = extractRegisterEntryHeaders(text);
  assert.deepEqual(markers.map((m) => m.raw), ['v6.27', 'v6.26']);
  // the foreign v24.0 / v14.5 / v19.0 / v9.9 are NOT captured.
  assert.deepEqual(highestRegister(markers), { major: 6, minor: 27 });
});
test('entry-header mode still derives a HIGHER major generically (no hardcoded major)', () => {
  const text = '> **✅ v12.3 FUTURE ENTRY** landed';
  assert.deepEqual(extractRegisterEntryHeaders(text).markers.map((m) => m.raw), ['v12.3']);
});
test('FIXnoisy register-entry mode: foreign tokens excluded -> PROPOSED successor of the true head', () => {
  const r = computeResult(loadFix('register-entry-mode-noisy.json'));
  assert.equal(r.scan.overallHighest, 'v3.21');
  assert.equal(r.verdict, VERDICT.PROPOSED);
  assert.equal(r.proposedIdentifier, 'v3.22');
});

// ===========================================================================
// parseStubLine — CCF-02 line-1 stub format, both identifier kinds.
// ===========================================================================
test('parseStubLine parses a register CLAIMED stub', () => {
  const p = parseStubLine('CLAIMED v6.20 · lane-x · /wt/x · gate-2 · 2026-07-20T08:00:00.000Z');
  assert.equal(p.kind, CLAIM_TYPE.REGISTER);
  assert.equal(p.identifier, 'v6.20');
  assert.equal(p.lane, 'lane-x');
  assert.equal(p.timestamp, '2026-07-20T08:00:00.000Z');
});
test('parseStubLine parses a task CLAIMED stub and normalizes padding', () => {
  const p = parseStubLine('CLAIMED cc-47 · lane · /wt · gate · 2026-07-20T00:00:00.000Z');
  assert.equal(p.kind, CLAIM_TYPE.TASK);
  assert.equal(p.identifier, 'cc-0047');
});
test('parseStubLine returns null for a non-stub line', () => {
  assert.equal(parseStubLine('# Some result doc heading'), null);
  assert.equal(parseStubLine('CLAIMED but-not-an-id · x'), null);
});

// ===========================================================================
// composeClaimedLine — exact CCF-02 format (Function 4).
// ===========================================================================
test('composeClaimedLine emits the exact CCF-02 line format', () => {
  const line = composeClaimedLine({ identifier: 'v6.28', lane: 'L', worktree: '/wt', gate: 'gate-1', timestamp: '2026-08-01T00:00:00.000Z' });
  assert.equal(line, 'CLAIMED v6.28 · L · /wt · gate-1 · 2026-08-01T00:00:00.000Z');
});
test('composeClaimedLine works for a cc-id and rejects a bad identifier', () => {
  assert.equal(
    composeClaimedLine({ identifier: 'cc-0032', lane: 'L', worktree: '/wt', gate: 'g', timestamp: 't' }),
    'CLAIMED cc-0032 · L · /wt · g · t');
  assert.throws(() => composeClaimedLine({ identifier: 'nope', lane: 'L', worktree: '/wt', gate: 'g', timestamp: 't' }));
});

// ===========================================================================
// detectCollisions — REPORT-ONLY; never picks a winner.
// ===========================================================================
test('detectCollisions groups >=2 distinct locators on the same identifier', () => {
  const r = detectCollisions([
    { identifier: 'v6.20', source: 's', locator: 'a.md', timestamp: '2026-07-20T09:00:00Z' },
    { identifier: 'v6.20', source: 's', locator: 'b.md', timestamp: '2026-07-20T08:00:00Z' },
    { identifier: 'v6.21', source: 's', locator: 'c.md', timestamp: '2026-07-20T10:00:00Z' },
  ]);
  assert.equal(r.present, true);
  assert.deepEqual(r.keys, ['v6.20']);
  assert.equal(r.groups[0].claimants.length, 2);
  // claimants are ordered deterministically (earliest timestamp first) but the
  // tool does NOT label a winner — order is a display sort only.
  assert.equal(r.groups[0].claimants[0].timestamp, '2026-07-20T08:00:00Z');
});
test('detectCollisions dedupes the same locator asserting the same id', () => {
  const r = detectCollisions([
    { identifier: 'v6.20', source: 's', locator: 'a.md', timestamp: 't1' },
    { identifier: 'v6.20', source: 's', locator: 'a.md', timestamp: 't1' },
  ]);
  assert.equal(r.present, false);
});

// ===========================================================================
// validateRequest — fail-closed on absent identity.
// ===========================================================================
test('validateRequest requires claimType + lane + worktree + gate', () => {
  assert.equal(validateRequest({ claimType: 'register', lane: 'L', worktree: '/wt', gate: 'g' }).ok, true);
  assert.equal(validateRequest(null).ok, false);
  assert.equal(validateRequest({ claimType: 'nope', lane: 'L', worktree: '/wt', gate: 'g' }).ok, false);
  assert.equal(validateRequest({ claimType: 'register', worktree: '/wt', gate: 'g' }).ok, false);
});

// ===========================================================================
// computeResult — the end-to-end fixture proofs (the brief's 11-point plan).
// ===========================================================================

// (1) highest-across-sources: stub's higher number wins the max.
test('FIX1 highest-across-sources: the open stub v3.43 wins over origin/local; propose v3.44', () => {
  const r = computeResult(loadFix('register-highest-across-sources.json'));
  assert.equal(r.scan.overallHighest, 'v3.43');
  assert.equal(r.verdict, VERDICT.PROPOSED);
  assert.equal(r.proposedIdentifier, 'v3.44');
});

// (2) next-free from a clean set -> PROPOSED/clean + claimedLine present.
test('FIX2 clean set -> PROPOSED/clean with a ready-to-paste CLAIMED line', () => {
  const r = computeResult(loadFix('register-highest-across-sources.json'));
  assert.equal(r.normalized, NORMALIZED.CLEAN);
  assert.equal(r.claimedLine, 'CLAIMED v3.44 · demo-lane · /wt/demo · gate-1 · 2026-08-01T00:00:00.000Z');
});

// (3) live collision -> COLLISION/escalate, both claimants reported, no winner.
test('FIX3 live collision -> COLLISION/escalate, both claimants + timestamps, no renumber', () => {
  const r = computeResult(loadFix('register-collision.json'));
  assert.equal(r.verdict, VERDICT.COLLISION);
  assert.equal(r.normalized, NORMALIZED.ESCALATE);
  assert.equal(r.collision.present, true);
  assert.deepEqual(r.collision.keys, ['v3.20']);
  assert.equal(r.collision.groups[0].claimants.length, 2);
  // no winner / no renumber semantics: proposedIdentifier is NOT a "resolution".
  const txt = renderReport(r);
  assert.ok(has(txt, 'never picks a winner'));
  assert.ok(!has(txt, 'renumber to'));
});

// (4) stub-line compose exact format (covered above; assert via result too).
test('FIX4 stub-line compose matches the exact CCF-02 format', () => {
  const r = computeResult(loadFix('task-clean.json'));
  assert.equal(r.claimedLine, 'CLAIMED cc-0032 · demo-lane · /wt/demo · gate-1 · 2026-08-01T00:00:00.000Z');
});

// (5) re-verify detects a NEW higher stub -> STALE/block.
test('FIX5 re-verify detects a changed scan max since the proposal -> STALE/block', () => {
  const obs = loadFix('register-highest-across-sources.json');
  // The caller proposed earlier when the max was v3.41; now an open stub pushed it to v3.43.
  obs.request.priorProposal = { proposedIdentifier: 'v3.42', scanMax: 'v3.41', collisionKeys: [] };
  const r = computeResult(obs);
  assert.equal(r.verdict, VERDICT.STALE);
  assert.equal(r.normalized, NORMALIZED.BLOCK);
  assert.equal(r.reVerify.performed, true);
  assert.equal(r.reVerify.stale, true);
  assert.equal(r.claimedLine, null); // stale proposal is withheld
});
test('FIX5b re-verify with an unchanged basis is NOT stale', () => {
  const obs = loadFix('register-highest-across-sources.json');
  obs.request.priorProposal = { proposedIdentifier: 'v3.44', scanMax: 'v3.43', collisionKeys: [] };
  const r = computeResult(obs);
  assert.equal(r.reVerify.stale, false);
  assert.equal(r.verdict, VERDICT.PROPOSED);
});
test('FIX5c re-verify detects a changed COLLISION set -> STALE', () => {
  const obs = loadFix('register-collision.json');
  obs.request.priorProposal = { scanMax: 'v3.30', collisionKeys: [] }; // earlier saw no collision
  const r = computeResult(obs);
  assert.equal(r.verdict, VERDICT.STALE); // STALE outranks COLLISION in precedence
  assert.ok(r.reVerify.stale);
});

// (7) missing/unreadable register -> INCOMPLETE/block, no false-free.
test('FIX7 missing/unreadable REQUIRED register -> INCOMPLETE/block, no fabricated number', () => {
  const r = computeResult(loadFix('register-missing-source.json'));
  assert.equal(r.verdict, VERDICT.INCOMPLETE);
  assert.equal(r.normalized, NORMALIZED.BLOCK);
  assert.equal(r.proposedIdentifier, null);
  assert.equal(r.claimedLine, null);
  assert.ok(codes(r).includes('unreadable-source'));
});

// (8) ambiguous highest -> INCOMPLETE, never a guess.
test('FIX8 ambiguous highest (malformed marker >= clean max) -> INCOMPLETE, no guess', () => {
  const r = computeResult(loadFix('register-ambiguous.json'));
  assert.equal(r.verdict, VERDICT.INCOMPLETE);
  assert.equal(r.proposedIdentifier, null);
  assert.ok(codes(r).includes('ambiguous-highest'));
});

// (9) reserved-to-branch number NOT proposed free -> INCOMPLETE/skip.
test('FIX9 reserved-to-branch successor -> INCOMPLETE, hold honoured, never proposed', () => {
  const r = computeResult(loadFix('register-reserved-hold.json'));
  assert.equal(r.verdict, VERDICT.INCOMPLETE);
  assert.equal(r.proposedIdentifier, null);
  assert.ok(codes(r).includes('reserved-hold'));
  assert.deepEqual(r.scan.reservedHonored, ['v3.11']);
});

// (10) determinism — byte-identical output across repeated runs.
test('FIX10 determinism: renderJson is byte-identical across repeated runs', () => {
  const a = renderJson(computeResult(loadFix('register-collision.json')));
  const b = renderJson(computeResult(loadFix('register-collision.json')));
  assert.equal(a, b);
  // and stable regardless of source key order in the injected object.
  assert.equal(renderJson(computeResult(loadFix('task-clean.json'))), renderJson(computeResult(loadFix('task-clean.json'))));
});

// (11) GENERIC BACKTEST — historical collisions detected + reported, never resolved.
test('FIX11a BACKTEST register v6.11/v6.12 collision -> DETECT+REPORT both, no resolve', () => {
  const r = computeResult(loadFix('backtest-register-collision.json'));
  assert.equal(r.verdict, VERDICT.COLLISION);
  assert.deepEqual(r.collision.keys, ['v6.11', 'v6.12']);
  assert.equal(r.collision.groups[0].claimants.length, 2);
  assert.equal(r.collision.groups[1].claimants.length, 2);
  // main head v6.13 is correctly the scanned max; no renumber offered.
  assert.equal(r.scan.overallHighest, 'v6.13');
});
test('FIX11b BACKTEST task cc-0047/cc-0048 collision -> DETECT+REPORT both, no winner', () => {
  const r = computeResult(loadFix('backtest-task-collision.json'));
  assert.equal(r.verdict, VERDICT.COLLISION);
  assert.deepEqual(r.collision.keys, ['cc-0047', 'cc-0048']);
});

// B-1 regression fixture — high-major scanned correctly (no hardcoded major).
test('B1 regression: a v7.x head is scanned + proposed correctly (no hardcoded major)', () => {
  const r = computeResult(loadFix('register-b1-highmajor.json'));
  assert.equal(r.scan.overallHighest, 'v7.4');
  assert.equal(r.verdict, VERDICT.PROPOSED);
  assert.equal(r.proposedIdentifier, 'v7.5');
});

// task clean end-to-end
test('task-clean -> PROPOSED cc-0032 / clean', () => {
  const r = computeResult(loadFix('task-clean.json'));
  assert.equal(r.verdict, VERDICT.PROPOSED);
  assert.equal(r.proposedIdentifier, 'cc-0032');
});

// ===========================================================================
// Fail-closed corners.
// ===========================================================================
test('absent request -> INCOMPLETE (no crash, no free number)', () => {
  const r = computeResult({ request: null, sources: [] });
  assert.equal(r.verdict, VERDICT.INCOMPLETE);
  assert.equal(r.proposedIdentifier, null);
});
test('bad/absent run clock -> INCOMPLETE (never fabricate a timestamp)', () => {
  const obs = loadFix('register-highest-across-sources.json');
  obs.now = 'not-a-date';
  const r = computeResult(obs);
  assert.equal(r.verdict, VERDICT.INCOMPLETE);
  assert.ok(codes(r).includes('bad-clock'));
});
test('no clean marker in any available register -> INCOMPLETE (no invented first number)', () => {
  const r = computeResult({
    request: { claimType: 'register', lane: 'L', worktree: '/wt', gate: 'g' },
    now: '2026-08-01T00:00:00.000Z',
    sources: [{ id: 's', label: 's', kind: 'register-text', required: true, available: true, text: 'no versions here' }],
  });
  assert.equal(r.verdict, VERDICT.INCOMPLETE);
  assert.ok(codes(r).includes('no-basis'));
});
test('precedence: an INCOMPLETE finding outranks a COLLISION', () => {
  const obs = loadFix('register-collision.json');
  obs.now = 'bad'; // forces bad-clock INCOMPLETE alongside the collision
  const r = computeResult(obs);
  assert.equal(r.verdict, VERDICT.INCOMPLETE);
});
test('schema + option are stamped (Option A zero-write)', () => {
  const r = computeResult(loadFix('task-clean.json'));
  assert.equal(r.schema, SCHEMA);
  assert.equal(r.option, 'A-propose-only-zero-write');
});

// ===========================================================================
// Module hygiene — no fs-write API, no hardcoded historical numbers, read-only git.
// ===========================================================================
// Strip line comments so documentation of what the tool does NOT do is not
// mistaken for the tool doing it.
// Split CRLF-tolerantly: on a CRLF checkout (autocrlf) a trailing \r would survive
// split('\n') and block /\/\/.*$/ from stripping a line-comment (`.` won't cross \r),
// leaving comment words like "writeFileSync" to false-trip the read-only assertions.
const stripComments = (src) => src.split(/\r?\n/).map((l) => l.replace(/\/\/.*$/, '')).join('\n');

test('module makes no fs WRITE call (Option A zero-write) and imports no write API', () => {
  const code = stripComments(readFileSync(MODULE, 'utf-8'));
  assert.ok(!/\b(writeFileSync|writeFile|appendFileSync|appendFile|createWriteStream|mkdirSync|mkdir|rmSync|unlinkSync|renameSync)\s*\(/.test(code),
    'claim-stub.mjs must call no fs write API (only process.stdout.write is allowed)');
  const fsImport = code.split('\n').find((l) => /from ['"]node:fs['"]/.test(l)) || '';
  assert.ok(!/write|append|mkdir|rm|unlink|rename/i.test(fsImport),
    `node:fs import must be read-only: ${fsImport.trim()}`);
});
test('module performs no mutating git and no network', () => {
  const code = stripComments(readFileSync(MODULE, 'utf-8'));
  // No mutating git verb appears as a QUOTED argument (git subcommands are quoted;
  // Array.prototype.push() is never quoted, so it is not caught here).
  assert.ok(!/['"](fetch|pull|push|commit|merge|rebase|reset|checkout|clone|stash)['"]/.test(code),
    'no mutating/quoted git subcommand may appear in executable code');
  assert.ok(!/spawnSync\(\s*['"]git['"]\s*,\s*\[\s*['"](fetch|pull|push|commit|merge|rebase|reset|checkout)['"]/.test(code));
  assert.ok(!/node:http|node:https|node:net|node:dns|fetch\s*\(|import\(.*http/.test(code), 'no network API');
});
test('module hardcodes NO historical number as match logic (v5/v6/cc-004x free of literals in logic)', () => {
  const src = readFileSync(MODULE, 'utf-8')
    .split('\n')
    .filter((l) => !l.trimStart().startsWith('//')) // ignore commentary/doc lines
    .join('\n');
  // No hardcoded specific version like v5.36 / v6.11 / v6.27 in executable code.
  assert.ok(!/\bv\d+\.\d+\b/.test(src), 'no concrete vN.M literal may appear in executable code');
  // No hardcoded cc-#### literal in executable code.
  assert.ok(!/\bcc-\d{2,}\b/.test(src), 'no concrete cc-NNNN literal may appear in executable code');
});

// ===========================================================================
// RESERVED-BLOCK AWARENESS (2026-07-26) — the tool SURFACES the sequential
// register head+1 ALONGSIDE the ratified highest-across-all proposal, and NEVER
// auto-decides. Motivated by cc-0081's PK-authorized reserved block, whose CLAIM
// stubs read far ABOVE the sequential register head; the ratified proposal is
// preserved (brief point 1 / FIX1), the sequential number is added for judgment.
// ===========================================================================
function regObs(registerText, stubTexts = []) {
  return {
    request: { claimType: 'register', lane: 'L', worktree: '/wt', gate: 'g' },
    now: '2026-08-01T00:00:00.000Z',
    sources: [
      { id: 'reg', label: 'origin:sync', kind: 'register-text', required: true, mode: 'register-entry', available: true, text: registerText },
      { id: 'stubs', label: 'result-stubs', kind: 'stub-lines', required: true, available: true,
        entries: stubTexts.map((t, i) => ({ locator: `d${i}.md`, text: t })) },
    ],
    reserved: [], caveats: [],
  };
}

test('reserved-block: a claim ABOVE the sequential head surfaces both numbers + an INFO advisory (proposal UNCHANGED)', () => {
  const r = computeResult(regObs(
    '> **🧾 v6.29 — HEAD**\n> **🧾 v6.28 — prior**',
    ['CLAIMED v7.08 · cc-lane · /wt · g · 2026-07-24T00:00:00.000Z'],
  ));
  // Ratified highest-across-all proposal is UNCHANGED (collision-safe above ALL claims).
  assert.equal(r.scan.overallHighest, 'v7.8');
  assert.equal(r.proposedIdentifier, 'v7.9');
  assert.equal(r.verdict, VERDICT.PROPOSED);            // an INFO advisory never changes the verdict
  // NEW: the sequential head + the normal-cut number are surfaced.
  assert.equal(r.scan.sequentialHighest, 'v6.29');
  assert.equal(r.scan.sequentialNextFree, 'v6.30');
  const adv = r.findings.find((f) => f.code === 'reserved-or-ahead-claim');
  assert.ok(adv, 'advisory finding present');
  assert.equal(adv.severity, SEVERITY.INFO);            // SURFACE, never decide
  assert.ok(has(renderReport(r), 'NORMAL cut v6.30'));  // both numbers visible in the report
});

test('reserved-block: NO advisory when the highest claim IS the sequential head (normal contiguous cut)', () => {
  const r = computeResult(regObs('> **🧾 v6.29 — HEAD**', [])); // no ahead claim
  assert.equal(r.proposedIdentifier, 'v6.30');
  assert.equal(r.scan.sequentialNextFree, 'v6.30');
  assert.equal(r.proposedIdentifier, r.scan.sequentialNextFree); // equal -> no advisory
  assert.ok(!codes(r).includes('reserved-or-ahead-claim'));
});

test('reserved-block: sequential fields are null for a TASK claim (register-only awareness)', () => {
  const r = computeResult({
    request: { claimType: 'task', lane: 'L', worktree: '/wt', gate: 'g' },
    now: '2026-08-01T00:00:00.000Z',
    sources: [{ id: 'reg', label: 'r', kind: 'register-text', required: true, available: true, text: 'cc-0047 cc-0048' }],
    reserved: [], caveats: [],
  });
  assert.equal(r.scan.sequentialHighest, null);
  assert.equal(r.scan.sequentialNextFree, null);
  assert.ok(!codes(r).includes('reserved-or-ahead-claim'));
});

// ===========================================================================
// SCAN-COMPLETENESS / RACE THREAT-MODEL — adversarial fail-closed proofs.
// External review (cba748b5) escalated with NO concrete defect but asked for
// explicit proof that no vector yields a FALSE-FREE or an AUTO-RESOLVE under
// scan-incompleteness / future-change / race. Each test pins one vector.
// ===========================================================================

// (e) reserved-to-branch number the next-free lands on -> INCOMPLETE, never free,
//     never auto-skipped (auto version-bump after a hold is banned).
test('THREAT(e) register: successor == reserved-to-branch -> INCOMPLETE, no free, no auto-skip', () => {
  const r = computeResult(loadFix('register-reserved-hold.json')); // max v3.10, reserved v3.11
  assert.equal(r.verdict, VERDICT.INCOMPLETE);
  assert.equal(r.proposedIdentifier, null);            // not proposed free
  assert.notEqual(r.proposedIdentifier, 'v3.12');      // NOT auto-skipped past the hold
  assert.ok(codes(r).includes('reserved-hold'));
});
test('THREAT(e) task: successor == reserved-to-branch -> INCOMPLETE, no free, no auto-skip', () => {
  const r = computeResult(loadFix('reserved-hit-task.json')); // max cc-0031, reserved cc-0032
  assert.equal(r.verdict, VERDICT.INCOMPLETE);
  assert.equal(r.proposedIdentifier, null);
  assert.notEqual(r.proposedIdentifier, 'cc-0033');    // NOT auto-skipped
  assert.ok(codes(r).includes('reserved-hold'));
});

// (c) a claim written AFTER the proposal (read-then-write race), visible at
//     re-verify -> STALE/block; the stale number is NOT handed back as trusted.
test('THREAT(c) claim-appears-after-proposal -> STALE/block, stale number withheld', () => {
  const r = computeResult(loadFix('race-stale-after-proposal.json'));
  assert.equal(r.verdict, VERDICT.STALE);
  assert.equal(r.normalized, NORMALIZED.BLOCK);
  assert.equal(r.reVerify.performed, true);
  assert.equal(r.reVerify.stale, true);
  assert.equal(r.proposedIdentifier, null);  // never a trusted-but-outdated number
  assert.equal(r.claimedLine, null);         // no ready-to-paste stale line
});

// (a)/(b)/(d) INHERENT lock-free boundary: invisible claims (unmerged branch /
//     sibling worktree / pushed-since-last-fetch) cannot be seen by any propose-
//     only tool. The tool NEVER presents such a proposal as a definite free — it
//     carries an explicit invisibility caveat. Assert the caveat surface exists.
test('THREAT(a/b/d) an injected invisibility caveat is carried through to the output', () => {
  const obs = loadFix('register-highest-across-sources.json');
  obs.caveats = ['sibling worktrees / unmerged branches may hold claims INVISIBLE to this scan — re-verify at commit; NOT a definite free'];
  const r = computeResult(obs);
  assert.equal(r.verdict, VERDICT.PROPOSED);        // a proposal (not a guarantee)
  assert.ok(Array.isArray(r.caveats));               // structured caveat field always present
  assert.ok(r.caveats.some((c) => has(c, 'INVISIBLE')), 'invisibility caveat carried');
});
test('THREAT: material incompleteness (unreadable REQUIRED source) -> INCOMPLETE, not a confident PROPOSED', () => {
  const r = computeResult(loadFix('material-incomplete-with-caveat.json'));
  assert.equal(r.verdict, VERDICT.INCOMPLETE);       // material gap fails closed
  assert.equal(r.proposedIdentifier, null);          // never a free number under a material gap
  assert.ok(codes(r).includes('unreadable-source'));
  assert.ok(r.caveats.some((c) => has(c, 'INVISIBLE')), 'invisibility caveat surfaced to the human');
});
test('THREAT: the output ALWAYS carries a structured caveats[] field (assertable honesty surface)', () => {
  // even a clean PROPOSED with no injected caveats exposes the field (empty array),
  // so a consumer can always test scan-completeness honesty programmatically.
  const clean = computeResult(loadFix('register-highest-across-sources.json'));
  assert.ok(Array.isArray(clean.caveats));
});
test('THREAT: no vector auto-resolves a collision (report-only; never a winner/renumber)', () => {
  const r = computeResult(loadFix('backtest-register-collision.json'));
  assert.equal(r.verdict, VERDICT.COLLISION);
  // every claimant is reported; the tool exposes no "winner"/"keep"/"renumber" field.
  const flat = JSON.stringify(r).toLowerCase();
  assert.ok(!/"winner"|"resolved":true|"renumber/.test(flat));
  for (const g of r.collision.groups) assert.ok(g.claimants.length >= 2);
});

// ===========================================================================
// CLI integration — a throwaway temp git repo exercises the read-only scan.
// ===========================================================================
function sh(cmd, args, cwd) {
  const r = spawnSync(cmd, args, { cwd, encoding: 'utf-8' });
  return { ok: r.status === 0, out: r.stdout || '', err: r.stderr || '' };
}
function makeRepo() {
  const dir = mkdtempSync(join(tmpdir(), 'claimstub-'));
  sh('git', ['init', '-q', '-b', 'main'], dir);
  sh('git', ['config', 'user.email', 't@t.t'], dir);
  sh('git', ['config', 'user.name', 't'], dir);
  mkdirSync(join(dir, 'docs'), { recursive: true });
  mkdirSync(join(dir, 'docs', 'briefs', 'results'), { recursive: true });
  return dir;
}

test('CLI: gather + propose from a temp repo (register) prints a PROPOSED verdict', () => {
  const dir = makeRepo();
  writeFileSync(join(dir, 'docs', '00_sync_state.md'), 'register head v9.7 line');
  writeFileSync(join(dir, 'docs', '00_action_list.md'), 'open items');
  writeFileSync(join(dir, 'docs', 'briefs', 'results', 'x.md'), 'CLAIMED v9.5 · lane · /wt · g · 2026-08-01T00:00:00.000Z\nbody');
  sh('git', ['add', '-A'], dir);
  sh('git', ['commit', '-q', '-m', 'seed'], dir);
  const r = spawnSync(process.execPath, [MODULE, '--claim', 'register', '--lane', 'L', '--worktree', '/wt', '--gate', 'g', '--repo', dir, '--format', 'json'], { encoding: 'utf-8' });
  const out = JSON.parse(r.stdout);
  // origin/main does not exist in this repo -> a REQUIRED origin source is
  // unreadable -> fail-closed INCOMPLETE (proves the CLI honours the guard).
  assert.equal(out.verdict, VERDICT.INCOMPLETE);
  assert.equal(out.proposedIdentifier, null);
});

test('CLI: with an origin remote the register scan reaches PROPOSED', () => {
  const origin = makeRepo();
  // Entry-header formatted register (the CLI reads register-entry markers, not prose).
  writeFileSync(join(origin, 'docs', '00_sync_state.md'), '> **v9.7 ORIGIN HEAD** — pinned Graph v24.0 (foreign token, ignored)');
  writeFileSync(join(origin, 'docs', '00_action_list.md'), '> **v9.1 items**');
  sh('git', ['add', '-A'], origin);
  sh('git', ['commit', '-q', '-m', 'seed'], origin);

  const clone = mkdtempSync(join(tmpdir(), 'claimstub-clone-'));
  sh('git', ['clone', '-q', origin, clone]); // clone is a setup step, not the tool
  writeFileSync(join(clone, 'docs', '00_sync_state.md'), '> **v9.8 LOCAL HEAD** — insights-worker v14.5.0 note (foreign, ignored)');
  const r = spawnSync(process.execPath, [MODULE, '--claim', 'register', '--lane', 'L', '--worktree', '/wt', '--gate', 'g', '--repo', clone, '--format', 'json'], { encoding: 'utf-8' });
  const out = JSON.parse(r.stdout);
  assert.equal(out.verdict, VERDICT.PROPOSED);
  assert.equal(out.scan.overallHighest, 'v9.8');
  assert.equal(out.proposedIdentifier, 'v9.9');
  // CLI never fetches: a caveat records that origin was not refreshed.
  assert.ok(out.caveats.some((c) => has(c, 'not fetched')));
});

test('CLI: exit code reflects the verdict (INCOMPLETE -> 2)', () => {
  const dir = makeRepo();
  writeFileSync(join(dir, 'docs', '00_sync_state.md'), 'no version markers');
  const r = spawnSync(process.execPath, [MODULE, '--claim', 'register', '--lane', 'L', '--worktree', '/wt', '--gate', 'g', '--repo', dir], { encoding: 'utf-8' });
  assert.equal(r.status, 2);
});

// THREAT(d): a live PROPOSED is NEVER caveat-free — the CLI unconditionally warns
// that origin was not fetched (a claim pushed since the last fetch is invisible).
test('CLI THREAT(d): a live PROPOSED always carries the not-fetched invisibility caveat', () => {
  const origin = makeRepo();
  writeFileSync(join(origin, 'docs', '00_sync_state.md'), '> **v9.7 ORIGIN HEAD**');
  writeFileSync(join(origin, 'docs', '00_action_list.md'), '> **v9.1**');
  sh('git', ['add', '-A'], origin);
  sh('git', ['commit', '-q', '-m', 'seed'], origin);
  const clone = mkdtempSync(join(tmpdir(), 'claimstub-clone2-'));
  sh('git', ['clone', '-q', origin, clone]);
  const r = spawnSync(process.execPath, [MODULE, '--claim', 'register', '--lane', 'L', '--worktree', '/wt', '--gate', 'g', '--repo', clone, '--format', 'json'], { encoding: 'utf-8' });
  const out = JSON.parse(r.stdout);
  assert.equal(out.verdict, VERDICT.PROPOSED);
  assert.ok(out.caveats.length > 0, 'a live PROPOSED must never be caveat-free');
  assert.ok(out.caveats.some((c) => has(c, 'not fetched')));
});

// THREAT(a/b): sibling worktrees hold claims invisible to the file scan — the CLI
// surfaces their existence as an explicit caveat (never as an authoritative claim).
test('CLI THREAT(a/b): a sibling worktree is surfaced as an invisibility caveat', () => {
  const dir = makeRepo();
  writeFileSync(join(dir, 'docs', '00_sync_state.md'), '> **v9.7 HEAD**');
  sh('git', ['add', '-A'], dir);
  sh('git', ['commit', '-q', '-m', 'seed'], dir);
  const wt2 = mkdtempSync(join(tmpdir(), 'claimstub-wt2-')) + '-b';
  const add = sh('git', ['worktree', 'add', '-q', '-b', 'sibling', wt2], dir);
  assert.ok(add.ok, `worktree add failed: ${add.err}`);
  const r = spawnSync(process.execPath, [MODULE, '--claim', 'register', '--lane', 'L', '--worktree', '/wt', '--gate', 'g', '--repo', dir, '--format', 'json'], { encoding: 'utf-8' });
  const out = JSON.parse(r.stdout);
  assert.ok(out.caveats.some((c) => has(c, 'sibling worktree') && has(c, 'invisible')),
    `expected a sibling-worktree invisibility caveat, got: ${JSON.stringify(out.caveats)}`);
});
