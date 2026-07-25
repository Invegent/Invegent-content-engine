// Hermetic tests for hash-checkpoint.mjs (CCF-04 Mechanical Assistant #2).
// Node built-in test runner. No network, no DB. The PURE CORE is exercised with
// injected observations (NO real sleeps, NO real git). A few integration tests
// use a throwaway temp git repo ONLY for exact-ref reproduction.
//   Run: node --test  (or) node .claude/helpers/hash-checkpoint.test.mjs

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { readFileSync, readdirSync, writeFileSync, mkdtempSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { tmpdir } from 'node:os';

import {
  VERDICT, NORMALIZED, SEVERITY, SOURCE, PURPOSE, LIFECYCLE,
  DEFAULT_QUIET_INTERVAL_SEC, FREEZE_MIN_INTERVAL_SEC,
  PHRASE_STABLE_NOT_IMMUTABLE, PHRASE_IMMUTABLE,
  normalizedVerdict, stableStringify, normalizePath, validateRequest,
  checkOwnerState, checkReadStability, resolveRefStatus, comparePins, computeRollup,
  computeResult, renderJson, renderReport, gatherObservations,
} from './hash-checkpoint.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const MODULE = join(HERE, 'hash-checkpoint.mjs');
const FIXDIR = join(HERE, 'fixtures', 'hash-checkpoint', 'observations');

const loadFix = (name) => JSON.parse(readFileSync(join(FIXDIR, name), 'utf-8'));
const has = (s, p) => String(s).toLowerCase().includes(p.toLowerCase());
const checksOf = (r) => r.findings.map((f) => f.check);
const sevSet = (r) => new Set(r.findings.map((f) => f.severity));

// ===========================================================================
// normalizedVerdict — PK O-3 mapping: only STABLE is clean; ALL else block.
// ===========================================================================
test('normalizedVerdict maps STABLE->clean and every other verdict->block (O-3)', () => {
  assert.equal(normalizedVerdict(VERDICT.STABLE), NORMALIZED.CLEAN);
  assert.equal(normalizedVerdict(VERDICT.UNSTABLE), NORMALIZED.BLOCK);
  assert.equal(normalizedVerdict(VERDICT.INCOMPLETE), NORMALIZED.BLOCK);
  // O-3 override: MISMATCH is BLOCK, never escalate/clean.
  assert.equal(normalizedVerdict(VERDICT.MISMATCH), NORMALIZED.BLOCK);
});

// ===========================================================================
// validateRequest — malformed/absent required field is NOT ok (=> INCOMPLETE).
// Never infers purpose from a filename.
// ===========================================================================
test('validateRequest accepts a well-formed request and defaults quietInterval', () => {
  const v = validateRequest({ artifacts: [{ path: 'a.md' }], lane: 'L', purpose: PURPOSE.AUTHOR_FREEZE });
  assert.equal(v.ok, true);
  assert.equal(v.normalized.quietInterval, DEFAULT_QUIET_INTERVAL_SEC);
});
test('validateRequest rejects missing artifacts / lane / purpose / bad quiet', () => {
  assert.equal(validateRequest(null).ok, false);
  assert.equal(validateRequest({ lane: 'L', purpose: PURPOSE.AUTHOR_FREEZE }).ok, false);
  assert.equal(validateRequest({ artifacts: [{ path: 'a' }], purpose: PURPOSE.AUTHOR_FREEZE }).ok, false);
  assert.equal(validateRequest({ artifacts: [{ path: 'a' }], lane: 'L' }).ok, false); // no purpose
  assert.equal(validateRequest({ artifacts: [{ path: 'a' }], lane: 'L', purpose: 'guess-from-name' }).ok, false);
  assert.equal(validateRequest({ artifacts: [{ path: 'a' }], lane: 'L', purpose: PURPOSE.AUTHOR_FREEZE, quietInterval: -3 }).ok, false);
});

// ===========================================================================
// checkOwnerState — idle-bracketed vs active vs absent/stale/unvalidatable.
// NEVER infers idle from anything but supplied owner-state.
// ===========================================================================
test('checkOwnerState idle at start AND end -> idle', () => {
  const r = checkOwnerState([{ at: 100, status: 'idle' }, { at: 900, status: 'idle' }], 200, 800);
  assert.equal(r.status, 'idle');
});
test('checkOwnerState active at either end -> active (owner still writing)', () => {
  const r = checkOwnerState([{ at: 100, status: 'writing' }, { at: 900, status: 'idle' }], 200, 800);
  assert.equal(r.status, 'active');
});
test('checkOwnerState absent samples -> incomplete', () => {
  assert.equal(checkOwnerState([], 200, 800).status, 'incomplete');
  assert.equal(checkOwnerState(undefined, 200, 800).status, 'incomplete');
});
test('checkOwnerState stale samples that do not bracket the interval -> incomplete', () => {
  // both samples BEFORE the last read => no end evidence.
  const r = checkOwnerState([{ at: 100, status: 'idle' }, { at: 150, status: 'idle' }], 200, 800);
  assert.equal(r.status, 'incomplete');
});
test('checkOwnerState unvalidatable timestamp/status -> incomplete', () => {
  assert.equal(checkOwnerState([{ at: 'not-a-time', status: 'idle' }], 200, 800).status, 'incomplete');
  assert.equal(checkOwnerState([{ at: 100 }], 200, 800).status, 'incomplete');
});

// ===========================================================================
// checkReadStability — repeated size/mtime/inode/hash; create/delete/rename.
// ===========================================================================
const mk = (at, hash, over = {}) => ({ at, exists: true, size: 10, mtimeMs: 5, inode: 1, hashRaw: hash, hashLF: hash, ...over });
test('checkReadStability two identical reads -> stable', () => {
  assert.equal(checkReadStability([mk(1, 'h'), mk(2, 'h')]).status, 'stable');
});
test('checkReadStability differing hash -> unstable', () => {
  assert.equal(checkReadStability([mk(1, 'h'), mk(2, 'g')]).status, 'unstable');
});
test('checkReadStability changed size or mtime or inode -> unstable', () => {
  assert.equal(checkReadStability([mk(1, 'h'), mk(2, 'h', { size: 11 })]).status, 'unstable');
  assert.equal(checkReadStability([mk(1, 'h'), mk(2, 'h', { mtimeMs: 6 })]).status, 'unstable');
  assert.equal(checkReadStability([mk(1, 'h'), mk(2, 'h', { inode: 2 })]).status, 'unstable');
});
test('checkReadStability single read -> incomplete (cannot confirm stability)', () => {
  assert.equal(checkReadStability([mk(1, 'h')]).status, 'incomplete');
});
test('checkReadStability never-exists -> incomplete; partial-exists -> unstable', () => {
  assert.equal(checkReadStability([{ at: 1, exists: false }, { at: 2, exists: false }]).status, 'incomplete');
  assert.equal(checkReadStability([mk(1, 'h'), { at: 2, exists: false }]).status, 'unstable');
});
test('checkReadStability a read error -> incomplete (fail closed, never stable)', () => {
  assert.equal(checkReadStability([mk(1, 'h'), { at: 2, exists: true, error: 'EACCES' }]).status, 'incomplete');
});

// ===========================================================================
// resolveRefStatus — exact SHA vs moved ref vs symbolic-resolved vs error.
// ===========================================================================
test('resolveRefStatus single exact SHA -> exact', () => {
  const r = resolveRefStatus({ requestedRef: 'a'.repeat(40), resolvedShas: ['a'.repeat(40)], isExactShaInput: true });
  assert.equal(r.status, 'exact');
  assert.equal(r.resolvedSha, 'a'.repeat(40));
});
test('resolveRefStatus two distinct SHAs -> moved (ref moved between observations)', () => {
  const r = resolveRefStatus({ requestedRef: 'main', resolvedShas: ['a'.repeat(40), 'b'.repeat(40)], isExactShaInput: false });
  assert.equal(r.status, 'moved');
});
test('resolveRefStatus symbolic ref resolving to one SHA -> exact + record-the-SHA note', () => {
  const r = resolveRefStatus({ requestedRef: 'main', resolvedShas: ['c'.repeat(40)], isExactShaInput: false });
  assert.equal(r.status, 'exact');
  assert.ok(r.reasons.join(' ').toLowerCase().includes('pin the sha'));
});
test('resolveRefStatus error -> incomplete; none -> none', () => {
  assert.equal(resolveRefStatus({ error: 'bad ref' }).status, 'incomplete');
  assert.equal(resolveRefStatus(null).status, 'none');
});

// ===========================================================================
// comparePins — enumerate every pin + source; disagreement -> mismatch; never
// selects an authoritative value.
// ===========================================================================
test('comparePins agreeing pins -> no mismatch, all enumerated', () => {
  const r = comparePins({ author: 'x', reviewer: 'x' }, 'x');
  assert.equal(r.mismatch, false);
  assert.deepEqual(r.entries.map((e) => e.source).sort(), ['author', 'observed', 'reviewer']);
});
test('comparePins disagreeing pins -> mismatch with independent enumeration', () => {
  const r = comparePins({ author: 'x', reviewer: 'y', applyHand: 'z', register: 'x', committedRef: 'x' }, 'x');
  assert.equal(r.mismatch, true);
  // every supplied pin is enumerated with its own source label.
  const sources = r.entries.map((e) => e.source);
  for (const s of ['author', 'reviewer', 'apply-hand', 'register', 'committed-ref', 'observed']) assert.ok(sources.includes(s));
});

// ===========================================================================
// computeRollup — deterministic, order-independent, stable-sorted.
// ===========================================================================
test('computeRollup is order-independent (stable sort + path normalization)', () => {
  const a = computeRollup([{ path: 'b/y.md', hash: '2' }, { path: 'a/x.md', hash: '1' }]);
  const b = computeRollup([{ path: 'a\\x.md', hash: '1' }, { path: 'b/y.md', hash: '2' }]);
  assert.equal(a.rollup, b.rollup);
});
test('computeRollup changes when any member hash changes', () => {
  const a = computeRollup([{ path: 'a', hash: '1' }, { path: 'b', hash: '2' }]);
  const b = computeRollup([{ path: 'a', hash: '1' }, { path: 'b', hash: '3' }]);
  assert.notEqual(a.rollup, b.rollup);
});
test('normalizePath normalizes separators without lowercasing/absolutizing', () => {
  assert.equal(normalizePath('a\\B\\c.md'), 'a/B/c.md');
  assert.equal(normalizePath('a//b/'), 'a/b');
});

// ===========================================================================
// FIXTURE-DRIVEN — the 16-plan (+ extras) mapped to expected native verdicts.
// ===========================================================================
const EXPECT = {
  '01-changed-between-reads.json': VERDICT.UNSTABLE,
  '02-stable-working-tree.json': VERDICT.STABLE,
  '03-owner-active-stable-bytes.json': VERDICT.UNSTABLE,
  '04-stable-no-ref.json': VERDICT.STABLE,
  '05-committed-ref-immutable.json': VERDICT.STABLE,
  '06-crlf-vs-lf.json': VERDICT.STABLE,
  '07-rollup-one-file-changed.json': VERDICT.UNSTABLE,
  '08-create-delete-during-obs.json': VERDICT.UNSTABLE,
  '09-review-vs-author-pin.json': VERDICT.MISMATCH,
  '10-apply-hand-ref-differs.json': VERDICT.MISMATCH,
  '11-missing-owner-state.json': VERDICT.INCOMPLETE,
  '12-rename-between-obs.json': VERDICT.UNSTABLE,
  '13-equal-bytes-diff-paths.json': VERDICT.STABLE,
  '14-superseded.json': VERDICT.STABLE,
  '15-determinism.json': VERDICT.STABLE,
  '16-backtest-moving-artifact.json': VERDICT.UNSTABLE,
  '17-symbolic-ref-moved.json': VERDICT.UNSTABLE,
  '18-malformed-request.json': VERDICT.INCOMPLETE,
  // --- adversarial timing/race fixtures (strengthening pass) ---
  '19-torn-partial-read.json': VERDICT.UNSTABLE,
  '20-identical-bytes-mtime-moved.json': VERDICT.UNSTABLE,
  '21-inode-changed-same-content.json': VERDICT.UNSTABLE,
  '22-path-swap-same-content.json': VERDICT.UNSTABLE,
  '23-content-only-differs-coincident-meta.json': VERDICT.UNSTABLE,
  '24-committed-ref-pin-not-reproduce.json': VERDICT.MISMATCH,
  '25-owner-idle-but-fs-unstable.json': VERDICT.UNSTABLE,
};
for (const [file, want] of Object.entries(EXPECT)) {
  test(`fixture ${file} -> ${want}`, () => {
    const r = computeResult(loadFix(file));
    assert.equal(r.verdict, want, `${file} verdict`);
    assert.equal(r.normalized, want === VERDICT.STABLE ? NORMALIZED.CLEAN : NORMALIZED.BLOCK);
  });
}

// ---- targeted phrase / finding assertions from the brief ------------------
test('stable working tree reports "STABLE BUT NOT IMMUTABLE" and is NEVER immutable', () => {
  const r = computeResult(loadFix('02-stable-working-tree.json'));
  assert.equal(r.immutable, false);
  assert.equal(r.phrase, PHRASE_STABLE_NOT_IMMUTABLE);
  assert.ok(has(renderReport(r), PHRASE_STABLE_NOT_IMMUTABLE));
  assert.ok(!has(renderReport(r), PHRASE_IMMUTABLE));
});
test('exact-commit-SHA reproduction reports "IMMUTABLE CHECKPOINT"', () => {
  const r = computeResult(loadFix('05-committed-ref-immutable.json'));
  assert.equal(r.immutable, true);
  assert.equal(r.phrase, PHRASE_IMMUTABLE);
  assert.equal(r.lifecycle, LIFECYCLE.COMMITTED_IMMUTABLE);
  assert.ok(has(renderReport(r), PHRASE_IMMUTABLE));
});
test('owner-active outranks a lucky quiet read (NOT stable even with stable bytes)', () => {
  const r = computeResult(loadFix('03-owner-active-stable-bytes.json'));
  assert.equal(r.verdict, VERDICT.UNSTABLE);
  assert.ok(checksOf(r).includes(1)); // writer-state finding fired
});
test('CRLF-vs-LF difference is reported EXPLICITLY (check 8), not silently equal', () => {
  const r = computeResult(loadFix('06-crlf-vs-lf.json'));
  const eol = r.findings.find((f) => f.check === 8);
  assert.ok(eol, 'a check-8 finding exists');
  assert.ok(has(JSON.stringify(eol), 'line ending') || has(JSON.stringify(eol), 'crlf'));
  // committed LF blob still authoritative => the checkpoint stays STABLE/immutable.
  assert.equal(r.verdict, VERDICT.STABLE);
});
test('equal bytes at distinct declared paths are reported, NOT collapsed (check 3)', () => {
  const r = computeResult(loadFix('13-equal-bytes-diff-paths.json'));
  const nc = r.findings.find((f) => f.check === 3);
  assert.ok(nc, 'a check-3 not-collapsed finding exists');
  assert.equal(r.artifacts.length, 2, 'both artifacts retained as distinct identities');
});
test('pin disagreements enumerate independently and route MISMATCH->block (never choose)', () => {
  const r = computeResult(loadFix('10-apply-hand-ref-differs.json'));
  assert.equal(r.verdict, VERDICT.MISMATCH);
  const mm = r.findings.find((f) => f.check === 6 && f.severity === SEVERITY.MISMATCH);
  assert.ok(mm);
  // never SELECTS a winner — must defer to the human, not name an authoritative pin.
  assert.ok(has(JSON.stringify(mm), 'human'), 'defers to a human');
  assert.ok(!has(JSON.stringify(mm), 'the authoritative pin is'), 'never names a winner');
  assert.ok(!has(JSON.stringify(mm), 'use pin'), 'never instructs which pin to use');
});
test('superseded checkpoint is distinguishable from current (check 10)', () => {
  const sup = computeResult(loadFix('14-superseded.json'));
  const cur = computeResult(loadFix('05-committed-ref-immutable.json'));
  assert.equal(sup.lifecycle, LIFECYCLE.SUPERSEDED);
  assert.notEqual(cur.lifecycle, LIFECYCLE.SUPERSEDED);
  assert.ok(r10Fired(sup));
});
function r10Fired(r) { return r.findings.some((f) => f.check === 10); }
test('symbolic branch moving between observations -> UNSTABLE (or MISMATCH), never immutable', () => {
  const r = computeResult(loadFix('17-symbolic-ref-moved.json'));
  assert.ok(r.verdict === VERDICT.UNSTABLE || r.verdict === VERDICT.MISMATCH);
  assert.equal(r.immutable, false);
});
test('BACKTEST: historical moving-artifact case returns UNSTABLE from GENERIC rules', () => {
  const r = computeResult(loadFix('16-backtest-moving-artifact.json'));
  assert.equal(r.verdict, VERDICT.UNSTABLE);
  // the module must not special-case these hashes — proven by the source scan below.
});

// ===========================================================================
// HIGHEST-SEVERITY RULE — no false STABLE. Any ambiguity => UNSTABLE/INCOMPLETE.
// Every non-STABLE fixture must NOT be immutable and must NOT print the phrases.
// ===========================================================================
test('no non-STABLE fixture ever claims STABLE/IMMUTABLE phrasing (no false pin)', () => {
  for (const [file, want] of Object.entries(EXPECT)) {
    if (want === VERDICT.STABLE) continue;
    const r = computeResult(loadFix(file));
    assert.notEqual(r.verdict, VERDICT.STABLE, `${file} must not be STABLE`);
    assert.equal(r.immutable, false, `${file} must not be immutable`);
    const rep = renderReport(r);
    assert.ok(!has(rep, PHRASE_IMMUTABLE), `${file} must not print IMMUTABLE CHECKPOINT`);
  }
});
test('a validation/parse failure fails closed to INCOMPLETE, never STABLE', () => {
  assert.equal(computeResult({ request: {}, artifacts: [] }).verdict, VERDICT.INCOMPLETE);
  assert.equal(computeResult(null).verdict, VERDICT.INCOMPLETE);
  assert.equal(computeResult(undefined).verdict, VERDICT.INCOMPLETE);
});
test('a working-tree freeze below the 60s floor cannot certify (INCOMPLETE, provisional)', () => {
  const base = loadFix('02-stable-working-tree.json');
  // shrink the observed interval to 5s but keep bytes stable + owner idle.
  const short = JSON.parse(JSON.stringify(base));
  short.artifacts[0].reads[1].at = '2026-07-25T10:00:05.000Z';
  short.request.ownerState = [{ at: '2026-07-25T09:59:58.000Z', status: 'idle' }, { at: '2026-07-25T10:00:06.000Z', status: 'idle' }];
  const r = computeResult(short);
  assert.equal(r.verdict, VERDICT.INCOMPLETE);
  assert.ok(has(JSON.stringify(r.findings), String(FREEZE_MIN_INTERVAL_SEC)));
});

// ===========================================================================
// ADVERSARIAL TIMING/RACE — each catchable vector must fail closed. These prove
// there is NO false STABLE / false IMMUTABLE under the modelled race conditions.
// ===========================================================================
test('(a) torn/partial read: partial vs complete content differs across reads -> UNSTABLE (content-hash)', () => {
  const r = computeResult(loadFix('19-torn-partial-read.json'));
  assert.equal(r.verdict, VERDICT.UNSTABLE);
  assert.equal(r.immutable, false);
});
test('(c) identical bytes but mtime moved sub-interval (a rewrite) -> UNSTABLE (mtime signal)', () => {
  const r = computeResult(loadFix('20-identical-bytes-mtime-moved.json'));
  assert.equal(r.verdict, VERDICT.UNSTABLE);
  // proves the content-hash alone is NOT what makes it stable — a rewrite is caught.
  assert.ok(has(JSON.stringify(r.findings), 'mtime'));
});
test('(e) atomic rename-over: inode changed, same content -> UNSTABLE (file-identity)', () => {
  const r = computeResult(loadFix('21-inode-changed-same-content.json'));
  assert.equal(r.verdict, VERDICT.UNSTABLE);
  assert.ok(has(JSON.stringify(r.findings), 'inode'));
});
test('(f) path/symlink swap to identical-content different object -> UNSTABLE (inode+mtime)', () => {
  const r = computeResult(loadFix('22-path-swap-same-content.json'));
  assert.equal(r.verdict, VERDICT.UNSTABLE);
  assert.equal(r.immutable, false);
});
test('(b/d) content differs while size AND mtime coincidentally equal -> UNSTABLE (content-hash backstop)', () => {
  const r = computeResult(loadFix('23-content-only-differs-coincident-meta.json'));
  assert.equal(r.verdict, VERDICT.UNSTABLE);
  assert.ok(has(JSON.stringify(r.findings), 'content hash changed'));
});
test('(h) committed-ref pinned hash does NOT reproduce -> MISMATCH, never IMMUTABLE', () => {
  const r = computeResult(loadFix('24-committed-ref-pin-not-reproduce.json'));
  assert.equal(r.verdict, VERDICT.MISMATCH);
  assert.equal(r.immutable, false);
  assert.notEqual(r.phrase, PHRASE_IMMUTABLE);
});
test('(g) O-2 boundary: owner-state supplied "idle" but fs UNSTABLE -> still UNSTABLE (fs-stability required regardless of owner claim)', () => {
  const r = computeResult(loadFix('25-owner-idle-but-fs-unstable.json'));
  assert.equal(r.verdict, VERDICT.UNSTABLE);
  // owner said idle, yet the bytes moved -> BOTH-signal: a truthful-looking owner
  // claim can NEVER upgrade an fs-unstable artifact to STABLE.
  assert.equal(r.immutable, false);
});
test('adversarial sweep: NONE of the timing/race fixtures ever yields STABLE/IMMUTABLE', () => {
  for (const file of ['19-torn-partial-read.json', '20-identical-bytes-mtime-moved.json', '21-inode-changed-same-content.json', '22-path-swap-same-content.json', '23-content-only-differs-coincident-meta.json', '24-committed-ref-pin-not-reproduce.json', '25-owner-idle-but-fs-unstable.json']) {
    const r = computeResult(loadFix(file));
    assert.notEqual(r.verdict, VERDICT.STABLE, `${file} must not be STABLE`);
    assert.equal(r.immutable, false, `${file} must not be immutable`);
    assert.ok(!has(renderReport(r), PHRASE_IMMUTABLE), `${file} must not print IMMUTABLE CHECKPOINT`);
  }
});

// ===========================================================================
// DETERMINISM — byte-identical JSON across repeated runs on unchanging input.
// ===========================================================================
test('computeResult + renderJson is byte-identical across repeated runs', () => {
  for (const file of Object.keys(EXPECT)) {
    const a = renderJson(computeResult(loadFix(file)));
    const b = renderJson(computeResult(loadFix(file)));
    assert.equal(a, b, `${file} deterministic`);
  }
});
test('stableStringify sorts keys so ordering never perturbs output', () => {
  const a = stableStringify({ b: 1, a: { d: 4, c: 3 } });
  const b = stableStringify({ a: { c: 3, d: 4 }, b: 1 });
  assert.equal(a, b);
});

// ===========================================================================
// STATIC SOURCE GUARANTEES — no fs WRITE, no network, no git MUTATION, and no
// hardcoded fixture answers / historical hashes/filenames baked into logic.
// ===========================================================================
const SRC = readFileSync(MODULE, 'utf-8');
test('module references NO fs write surface (cannot write/delete/rename files)', () => {
  for (const banned of ['writeFileSync', 'appendFileSync', 'mkdirSync', 'rmSync', 'rmdirSync', 'unlinkSync', 'renameSync', 'createWriteStream', 'writeSync', 'truncateSync', 'copyFileSync', 'openSync']) {
    assert.ok(!SRC.includes(banned), `does not reference ${banned}`);
  }
});
test('module makes NO network calls', () => {
  for (const banned of ["'node:http'", "'node:https'", "'node:net'", "'node:dgram'", "'node:tls'", 'fetch(', 'XMLHttpRequest']) {
    assert.ok(!SRC.includes(banned), `no network surface: ${banned}`);
  }
});
test('module invokes NO git mutation verb (read-only git only)', () => {
  for (const verb of ['add', 'commit', 'checkout', 'reset', 'rebase', 'merge', 'push', 'pull', 'fetch', 'stash', 'restore', 'clean', 'tag', 'branch', 'switch']) {
    const asArg = new RegExp(`\\bgit(Bytes)?\\(\\[\\s*['"]${verb}['"]`);
    assert.ok(!asArg.test(SRC), `never invokes git ${verb}`);
  }
  // The read-only verbs it IS allowed to use:
  for (const verb of ['rev-parse', 'show', 'ls-tree']) {
    // presence is fine; just confirm at least the core reproduction verbs exist.
  }
  assert.ok(SRC.includes("'rev-parse'") && SRC.includes("'show'"), 'uses read-only rev-parse/show');
});
test('module does NOT hardcode fixture answers or historical hashes/filenames', () => {
  // historical hashes/filenames from the brief may appear ONLY as fixture data,
  // NEVER inside detection logic.
  for (const needle of ['191e2daf', '07d61a16', 'd409376b', '1af25e02', 'halt-doc', 'S1', 'S3']) {
    assert.ok(!SRC.includes(needle), `logic must not encode "${needle}"`);
  }
  // and no fixture filename baked in
  for (const f of readdirSync(FIXDIR)) assert.ok(!SRC.includes(f), `logic must not reference fixture ${f}`);
});

// ===========================================================================
// INTEGRATION (throwaway temp git repo) — real read-only git reproduction.
// This is the ONLY place a real git process is spawned.
// ===========================================================================
function sh(cmd, args, cwd) {
  const r = spawnSync(cmd, args, { cwd, encoding: 'utf-8' });
  if (r.status !== 0 && cmd === 'git') throw new Error(`git ${args.join(' ')} failed: ${r.stderr}`);
  return (r.stdout || '').trim();
}
function makeRepo() {
  const dir = mkdtempSync(join(tmpdir(), 'hc-git-'));
  sh('git', ['init', '-q'], dir);
  sh('git', ['config', 'user.email', 'test@example.com'], dir);
  sh('git', ['config', 'user.name', 'test'], dir);
  sh('git', ['config', 'commit.gpgsign', 'false'], dir);
  return dir;
}

test('committed-ref reproduction from a real exact SHA -> IMMUTABLE CHECKPOINT', () => {
  const dir = makeRepo();
  mkdirSync(join(dir, 'src'), { recursive: true });
  writeFileSync(join(dir, 'src', 'index.ts'), 'export const x = 1;\n');
  sh('git', ['add', '.'], dir);
  sh('git', ['commit', '-q', '-m', 'seed'], dir);
  const sha = sh('git', ['rev-parse', 'HEAD'], dir);

  const req = { artifacts: [{ path: 'src/index.ts', sourceIdentity: SOURCE.COMMITTED_REF }], lane: 'itest', purpose: PURPOSE.APPLY_HANDOFF, repo: dir, ref: sha };
  const obs = gatherObservations(req);
  const r = computeResult(obs);
  assert.equal(r.verdict, VERDICT.STABLE);
  assert.equal(r.immutable, true);
  assert.equal(r.phrase, PHRASE_IMMUTABLE);
  assert.equal(obs.artifacts[0].gitBlob.present, true);
});

test('a wrong expected hash against a real ref -> MISMATCH (does not reproduce)', () => {
  const dir = makeRepo();
  writeFileSync(join(dir, 'a.txt'), 'hello\n');
  sh('git', ['add', '.'], dir);
  sh('git', ['commit', '-q', '-m', 'seed'], dir);
  const sha = sh('git', ['rev-parse', 'HEAD'], dir);
  const req = { artifacts: [{ path: 'a.txt', sourceIdentity: SOURCE.COMMITTED_REF, expectedHash: 'deadbeef'.repeat(8) }], lane: 'itest', purpose: PURPOSE.APPLY_HANDOFF, repo: dir, ref: sha };
  const r = computeResult(gatherObservations(req));
  assert.equal(r.verdict, VERDICT.MISMATCH);
  assert.equal(r.immutable, false);
});

test('gatherObservations reads a working-tree file twice read-only and never modifies the repo', () => {
  const dir = makeRepo();
  writeFileSync(join(dir, 'w.txt'), 'stable\n');
  sh('git', ['add', '.'], dir);
  sh('git', ['commit', '-q', '-m', 'seed'], dir);
  const before = sh('git', ['status', '--porcelain'], dir);
  const req = { artifacts: [{ path: 'w.txt' }], lane: 'itest', purpose: PURPOSE.AUTHOR_FREEZE, repo: dir, quietInterval: 0.05, ownerState: [] };
  const obs = gatherObservations(req);
  assert.equal(obs.artifacts[0].reads.length, 2, 'read twice');
  const after = sh('git', ['status', '--porcelain'], dir);
  assert.equal(after, before, 'working tree unchanged after a run');
  // below the 60s floor => cannot certify a freeze => fail closed to INCOMPLETE.
  assert.equal(computeResult(obs).verdict, VERDICT.INCOMPLETE);
});

test('the CLI main() runs end-to-end (--format json) and prints a valid result', () => {
  const dir = makeRepo();
  writeFileSync(join(dir, 'f.ts'), 'const y = 2;\n');
  sh('git', ['add', '.'], dir);
  sh('git', ['commit', '-q', '-m', 'seed'], dir);
  const sha = sh('git', ['rev-parse', 'HEAD'], dir);
  const reqPath = join(dir, 'req.json');
  writeFileSync(reqPath, JSON.stringify({ artifacts: [{ path: 'f.ts', sourceIdentity: SOURCE.COMMITTED_REF }], lane: 'cli', purpose: PURPOSE.APPLY_HANDOFF, repo: dir, ref: sha }));
  const r = spawnSync(process.execPath, [MODULE, '--input', reqPath, '--format', 'json'], { encoding: 'utf-8' });
  assert.equal(r.status, 0, 'STABLE exits 0');
  const out = JSON.parse(r.stdout);
  assert.equal(out.verdict, VERDICT.STABLE);
  assert.equal(out.phrase, PHRASE_IMMUTABLE);
});

test('the CLI main() fails closed on a malformed request (non-zero, INCOMPLETE)', () => {
  const dir = mkdtempSync(join(tmpdir(), 'hc-bad-'));
  const reqPath = join(dir, 'bad.json');
  writeFileSync(reqPath, '{ not valid json ');
  const r = spawnSync(process.execPath, [MODULE, '--input', reqPath], { encoding: 'utf-8' });
  assert.notEqual(r.status, 0, 'non-zero on failure');
  assert.ok(has(r.stdout, 'INCOMPLETE') || has(r.stdout, 'fail-closed'));
});
