// review-packet.test.mjs — hermetic node:test suite for the CCF-04 #5 helper.
//
// The pure core is exercised with INJECTED artifact bytes / hashes (no real fs
// in unit tests). A small number of temp-file integration tests drive the CLI
// read+hash path. No network, no git, and the helper writes NO file — the tests
// assert those postures explicitly. Deterministic throughout.
//
// Run: node --test .claude/helpers/review-packet.test.mjs

import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdtempSync, writeFileSync, readFileSync, rmSync, readdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  SCHEMA,
  VERDICT,
  NORMALIZED,
  SEVERITY,
  ACTION_TYPES,
  LIGHT_PROTOCOL_TYPES,
  REQUIRED_CONTEXT_FIELDS,
  TRIAGE_CLASSES,
  DEFAULT_CONFIG,
  normalizedVerdict,
  stableStringify,
  sha256Hex,
  looksLikeRawDiff,
  analyzeContext,
  composePacket,
  assessPacket,
  composeAndValidate,
  renderResultJson,
  renderPacketJson,
} from './review-packet.mjs';

const HELPER = fileURLToPath(new URL('./review-packet.mjs', import.meta.url));
const ARTIFACT = fileURLToPath(new URL('./fixtures/review-packet/artifact-sample.txt', import.meta.url));

const sha = (s) => createHash('sha256').update(s).digest('hex');

// A well-formed FULL-protocol context (the 7 required fields, minimal + short).
function fullContext(extra = {}) {
  return {
    decision_under_review: 'Open Gate-2 review of the frozen helper candidate.',
    production_action_if_approved: 'None — review only; no deploy/merge/migrate.',
    consequence_if_delayed: 'The CCF-04 #5 slot stays open; no production impact.',
    cost_of_waiting: 'zero',
    current_evidence: 'hermetic tests green; deterministic output.',
    known_weak_evidence: 'context threshold is a conservative default (B-1).',
    default_action: 'hold the candidate frozen awaiting PK Gate 2.',
    ...extra,
  };
}

const PROPOSAL = 'Freeze the review-packet helper candidate and open external review before PK Gate 2; requesting a cross-model read of the verdict contract and fail-closed posture.';

// Build a complete, valid, pinned FULL-protocol packet whose pin matches bytes.
function completePacket(bytes = 'ARTIFACT-BYTES-v1', overrides = {}) {
  const hash = sha256Hex(bytes);
  return {
    packet: {
      schema: SCHEMA,
      action_type: 'plan_review',
      artifact_ref: { path: 'fixtures/review-packet/artifact-sample.txt', git_ref: null },
      context: fullContext(),
      hash_source: { path: 'fixtures/review-packet/artifact-sample.txt', git_ref: null, computed: true, algorithm: 'sha256' },
      proposal: PROPOSAL,
      reviewed_input_hash: hash,
      triage_labels: [],
      ...overrides,
    },
    hash,
    staleness: { readable: true, currentHash: hash },
  };
}

// ---------------------------------------------------------------------------
// Fixture 1 — COMPOSE from a well-formed request -> deterministic, self-valid.
// ---------------------------------------------------------------------------
test('F1: compose from well-formed request -> deterministic + self-valid READY', () => {
  const bytes = 'SOME ARTIFACT BYTES for compose fixture';
  const request = {
    action_type: 'plan_review',
    artifact_ref: { path: 'a/b/c.sql' },
    proposal: PROPOSAL,
    context_fields: fullContext(),
    evidence_pointers: ['path/to/test', 'review-id: none'],
    triage_labels: ['policy_decision'],
  };
  const packet = composePacket(request, { artifactBytes: bytes });
  assert.equal(packet.reviewed_input_hash, sha256Hex(bytes), 'compose pins sha256 of injected bytes');
  assert.equal(packet.hash_source.computed, true);
  assert.deepEqual(packet.context.evidence_pointers, ['path/to/test', 'review-id: none']);

  // deterministic: same request+bytes -> byte-identical canonical packet
  const packet2 = composePacket(request, { artifactBytes: bytes });
  assert.equal(stableStringify(packet), stableStringify(packet2));

  // self-valid: composed packet validates READY against the same bytes
  const res = assessPacket(packet, { staleness: { readable: true, currentHash: sha256Hex(bytes) } });
  assert.equal(res.verdict, VERDICT.READY);
  assert.equal(res.normalized, NORMALIZED.CLEAN);

  // and composeAndValidate gives the same READY end-to-end
  const cav = composeAndValidate(request, { artifactBytes: bytes });
  assert.equal(cav.verdict, VERDICT.READY);
  assert.equal(cav.mode, 'compose+validate');
});

// ---------------------------------------------------------------------------
// Fixture 2 — VALIDATE a complete full-protocol packet -> READY / clean.
// ---------------------------------------------------------------------------
test('F2: complete full-protocol packet (pinned+matching) -> READY / clean', () => {
  const { packet, staleness } = completePacket();
  const res = assessPacket(packet, { staleness });
  assert.equal(res.verdict, VERDICT.READY);
  assert.equal(res.normalized, NORMALIZED.CLEAN);
  assert.equal(res.protocolWeight, 'full');
  assert.equal(res.hashState.state, 'current');
  assert.equal(res.hasWarnings, false);
});

// ---------------------------------------------------------------------------
// Fixture 3 — context exceeds size threshold -> OVERSIZED-CONTEXT (oversize).
// ---------------------------------------------------------------------------
test('F3: oversized context -> OVERSIZED-CONTEXT / block (reason=oversize)', () => {
  const big = 'x'.repeat(9000); // > 8192 default threshold, single line (not a diff)
  const { packet, staleness } = completePacket('B', { context: fullContext({ current_evidence: big }) });
  const res = assessPacket(packet, { staleness });
  assert.equal(res.verdict, VERDICT.OVERSIZED_CONTEXT);
  assert.equal(res.normalized, NORMALIZED.BLOCK);
  assert.ok(res.contextSize.overThreshold);
  const reasons = res.checks.filter((c) => c.severity === SEVERITY.OVERSIZED).map((c) => c.reason);
  assert.ok(reasons.includes('oversize'));
  assert.ok(!reasons.includes('raw-diff-blob'), 'plain long text is not a diff blob');
});

// ---------------------------------------------------------------------------
// Fixture 4 — raw-diff blob in context -> OVERSIZED-CONTEXT (raw-diff-blob).
// ---------------------------------------------------------------------------
test('F4: raw-diff blob -> OVERSIZED-CONTEXT / block (reason=raw-diff-blob)', () => {
  const diff = '@@ -1,3 +1,4 @@\n-removed line\n+added line\n context line\n+another added';
  const { packet, staleness } = completePacket('C', { context: fullContext({ current_evidence: diff }) });
  const res = assessPacket(packet, { staleness });
  assert.equal(res.verdict, VERDICT.OVERSIZED_CONTEXT);
  const reasons = res.checks.filter((c) => c.severity === SEVERITY.OVERSIZED).map((c) => c.reason);
  assert.ok(reasons.includes('raw-diff-blob'));
});

test('F4b: many leading +/- lines (no @@ marker) still detected as raw-diff-blob', () => {
  const lines = [];
  for (let i = 0; i < 20; i++) lines.push(i % 2 ? `+add ${i}` : `-del ${i}`);
  const diff = lines.join('\n');
  assert.equal(looksLikeRawDiff(diff, DEFAULT_CONFIG), 'raw-diff-blob');
  assert.equal(looksLikeRawDiff('a normal short structured string', DEFAULT_CONFIG), null);
});

// ---------------------------------------------------------------------------
// Fixture 5 — reviewed_input_hash absent/unpinned -> HASH-UNPINNED-OR-STALE.
// ---------------------------------------------------------------------------
test('F5: unpinned hash -> HASH-UNPINNED-OR-STALE / block', () => {
  const { packet, staleness } = completePacket('D', { reviewed_input_hash: null });
  const res = assessPacket(packet, { staleness });
  assert.equal(res.verdict, VERDICT.HASH_UNPINNED_OR_STALE);
  assert.equal(res.normalized, NORMALIZED.BLOCK);
  assert.equal(res.hashState.state, 'unpinned');
});

test('F5b: malformed (non-hex64) hash -> HASH-UNPINNED-OR-STALE', () => {
  const { packet, staleness } = completePacket('D', { reviewed_input_hash: 'not-a-real-hash' });
  const res = assessPacket(packet, { staleness });
  assert.equal(res.verdict, VERDICT.HASH_UNPINNED_OR_STALE);
  assert.equal(res.hashState.state, 'unpinned');
});

// ---------------------------------------------------------------------------
// Fixture 6 — pinned hash does NOT match current bytes -> HASH (stale).
// ---------------------------------------------------------------------------
test('F6: pinned hash != current bytes -> HASH-UNPINNED-OR-STALE (stale)', () => {
  const { packet } = completePacket('E', { reviewed_input_hash: sha256Hex('OLD BYTES') });
  const res = assessPacket(packet, { staleness: { readable: true, currentHash: sha256Hex('NEW BYTES') } });
  assert.equal(res.verdict, VERDICT.HASH_UNPINNED_OR_STALE);
  assert.equal(res.hashState.state, 'stale');
});

// ---------------------------------------------------------------------------
// Fixture 7 — a required field missing -> INCOMPLETE.
// ---------------------------------------------------------------------------
test('F7: missing full-protocol context field -> INCOMPLETE / block', () => {
  const ctx = fullContext();
  delete ctx.default_action;
  const { packet, staleness } = completePacket('F', { context: ctx });
  const res = assessPacket(packet, { staleness });
  assert.equal(res.verdict, VERDICT.INCOMPLETE);
  assert.equal(res.normalized, NORMALIZED.BLOCK);
  assert.ok(res.checks.some((c) => c.field === 'context.default_action' && c.severity === SEVERITY.INCOMPLETE));
});

test('F7b: missing proposal -> INCOMPLETE', () => {
  const { packet, staleness } = completePacket('F', { proposal: null });
  assert.equal(assessPacket(packet, { staleness }).verdict, VERDICT.INCOMPLETE);
});

test('F7c: trivial (below floor) proposal -> INCOMPLETE (mechanical floor only)', () => {
  const { packet, staleness } = completePacket('F', { proposal: 'ok' });
  assert.equal(assessPacket(packet, { staleness }).verdict, VERDICT.INCOMPLETE);
});

test('F7d: missing artifact_ref -> INCOMPLETE', () => {
  const { packet, staleness } = completePacket('F', { artifact_ref: { path: null, git_ref: null } });
  assert.equal(assessPacket(packet, { staleness }).verdict, VERDICT.INCOMPLETE);
});

// ---------------------------------------------------------------------------
// Fixture 8 — light-protocol missing the 7 fields -> READY WITH warning.
// ---------------------------------------------------------------------------
test('F8: light-protocol (sql_read) missing 7 context fields -> READY + non-blocking warning', () => {
  const bytes = 'LIGHT BYTES';
  const hash = sha256Hex(bytes);
  const packet = {
    schema: SCHEMA,
    action_type: 'sql_read',
    artifact_ref: { path: 'fixtures/review-packet/artifact-sample.txt', git_ref: null },
    context: { evidence_pointers: ['ice_ro.slot_status query'] },
    proposal: PROPOSAL,
    reviewed_input_hash: hash,
    triage_labels: [],
  };
  const res = assessPacket(packet, { staleness: { readable: true, currentHash: hash } });
  assert.equal(res.verdict, VERDICT.READY);
  assert.equal(res.normalized, NORMALIZED.CLEAN);
  assert.equal(res.protocolWeight, 'light');
  assert.equal(res.hasWarnings, true);
  assert.ok(res.warnings.length >= 7, 'each missing light-protocol field is a non-blocking warning');
});

// ---------------------------------------------------------------------------
// Fixture 9 — invalid/unknown action_type -> INCOMPLETE.
// ---------------------------------------------------------------------------
test('F9: invalid action_type -> INCOMPLETE / block', () => {
  const { packet, staleness } = completePacket('G', { action_type: 'frobnicate' });
  const res = assessPacket(packet, { staleness });
  assert.equal(res.verdict, VERDICT.INCOMPLETE);
  assert.ok(res.checks.some((c) => c.field === 'action_type' && c.severity === SEVERITY.INCOMPLETE));
});

test('F9b: missing action_type -> INCOMPLETE', () => {
  const { packet, staleness } = completePacket('G', { action_type: null });
  assert.equal(assessPacket(packet, { staleness }).verdict, VERDICT.INCOMPLETE);
});

// ---------------------------------------------------------------------------
// Fixture 10 — determinism: byte-identical output across repeated runs.
// ---------------------------------------------------------------------------
test('F10: deterministic byte-identical output on unchanging input', () => {
  const { packet, staleness } = completePacket('H');
  const a = renderResultJson(assessPacket(packet, { staleness }));
  const b = renderResultJson(assessPacket(packet, { staleness }));
  assert.equal(a, b);

  const req = { action_type: 'plan_review', artifact_ref: { path: 'x.sql' }, proposal: PROPOSAL, context_fields: fullContext() };
  assert.equal(
    renderPacketJson(composePacket(req, { artifactBytes: 'ZZ' })),
    renderPacketJson(composePacket(req, { artifactBytes: 'ZZ' })),
  );
});

// ---------------------------------------------------------------------------
// Fixture 11 — artifact unreadable -> HASH-UNPINNED-OR-STALE (fail-closed).
// ---------------------------------------------------------------------------
test('F11: unreadable artifact -> HASH-UNPINNED-OR-STALE (never a fabricated pin)', () => {
  const { packet } = completePacket('I');
  const res = assessPacket(packet, { staleness: { readable: false } });
  assert.equal(res.verdict, VERDICT.HASH_UNPINNED_OR_STALE);
  assert.equal(res.hashState.state, 'unreadable');
});

test('F11b: pinned but staleness NOT provided -> HASH (unverified, fail-closed)', () => {
  const { packet } = completePacket('I');
  const res = assessPacket(packet, {}); // staleness undefined
  assert.equal(res.verdict, VERDICT.HASH_UNPINNED_OR_STALE);
  assert.equal(res.hashState.state, 'pinned-unverified');
});

// ---------------------------------------------------------------------------
// Fixture 12 — GENERIC BACKTEST: reconstruct a REAL session review-packet shape
// (proposal-heavy + minimal structured context + pinned hash) -> READY, and the
// composed form is bridge-valid. Real hash used ONLY as fixture DATA.
// ---------------------------------------------------------------------------
test('F12: backtest real-session packet shape -> READY + bridge-valid composed form', () => {
  const bytes = readFileSync(ARTIFACT);          // real bytes as fixture DATA
  const request = JSON.parse(readFileSync(fileURLToPath(
    new URL('./fixtures/review-packet/request-backtest.json', import.meta.url)), 'utf-8'));
  // compose pins the CURRENT bytes; validate against the same bytes -> READY
  const res = composeAndValidate(request, { artifactBytes: bytes });
  assert.equal(res.verdict, VERDICT.READY, 'real-session-shaped packet validates READY');
  assert.equal(res.normalized, NORMALIZED.CLEAN);
  assert.equal(res.packet.reviewed_input_hash, sha256Hex(bytes), 'pinned to the exact current bytes');
  // bridge-valid: context minimal + under threshold + no raw diff
  assert.ok(!res.contextSize.overThreshold);
  assert.equal(res.contextSize.rawDiffFields.length, 0);
  assert.ok(res.contextSize.bytes < DEFAULT_CONFIG.contextSizeThresholdBytes);
  // triage label recognised (labelled, not routed)
  assert.deepEqual(res.triageLabels, ['policy_decision']);

  // No hardcoded hash: mutate the bytes -> the SAME packet shape now goes STALE
  const staleRes = assessPacket(res.packet, { staleness: { readable: true, currentHash: sha256Hex(Buffer.concat([bytes, Buffer.from('X')])) } });
  assert.equal(staleRes.verdict, VERDICT.HASH_UNPINNED_OR_STALE, 'no baked match logic — a byte change makes it stale');
});

// ---------------------------------------------------------------------------
// Trust-killer battery: NO malformed packet ever validates READY.
// ---------------------------------------------------------------------------
test('no-false-READY: a battery of defective packets never returns READY', () => {
  const { packet: base, staleness } = completePacket('J');
  const mutations = [
    { ...base, action_type: null },
    { ...base, action_type: 'nope' },
    { ...base, proposal: null },
    { ...base, proposal: 'x' },
    { ...base, artifact_ref: { path: null } },
    { ...base, reviewed_input_hash: null },
    { ...base, reviewed_input_hash: 'zzz' },
    { ...base, context: { current_evidence: '@@ -1 +1 @@\n+a\n-b' } },
    { ...base, context: fullContext({ current_evidence: 'y'.repeat(9000) }) },
    { ...base, context: null },
    null,
    undefined,
    42,
  ];
  for (const m of mutations) {
    const res = assessPacket(m, { staleness });
    assert.notEqual(res.verdict, VERDICT.READY, `mutation must not be READY: ${String(JSON.stringify(m)).slice(0, 60)}`);
  }
  // and a stale/unreadable/unverified base is never READY
  assert.notEqual(assessPacket(base, { staleness: { readable: true, currentHash: sha256Hex('other') } }).verdict, VERDICT.READY);
  assert.notEqual(assessPacket(base, { staleness: { readable: false } }).verdict, VERDICT.READY);
  assert.notEqual(assessPacket(base, {}).verdict, VERDICT.READY);
});

// ---------------------------------------------------------------------------
// Pure-core unit checks.
// ---------------------------------------------------------------------------
test('normalizedVerdict: only READY is clean', () => {
  assert.equal(normalizedVerdict(VERDICT.READY), NORMALIZED.CLEAN);
  for (const v of [VERDICT.INCOMPLETE, VERDICT.OVERSIZED_CONTEXT, VERDICT.HASH_UNPINNED_OR_STALE]) {
    assert.equal(normalizedVerdict(v), NORMALIZED.BLOCK);
  }
});

test('enumerations match the protocol', () => {
  assert.deepEqual([...ACTION_TYPES].sort(), ['config_change', 'ef_deploy', 'finding_classification', 'other', 'plan_review', 'sql_destructive', 'sql_read'].sort());
  assert.deepEqual([...LIGHT_PROTOCOL_TYPES].sort(), ['finding_classification', 'sql_read']);
  assert.equal(REQUIRED_CONTEXT_FIELDS.length, 7);
  assert.ok(TRIAGE_CLASSES.has('policy_decision'));
});

test('analyzeContext: measures bytes, per-field cap, and raw-diff fields', () => {
  const a = analyzeContext({ a: 'short', b: 'z'.repeat(5000) }, DEFAULT_CONFIG);
  assert.ok(a.perFieldOversize.some((p) => p.field === 'b'));
  const d = analyzeContext({ e: { nested: '@@ -1 +1 @@\n+x\n-y' } }, DEFAULT_CONFIG);
  assert.ok(d.rawDiffFields.some((f) => f.field === 'e.nested'));
});

test('triage label out of vocabulary -> non-blocking WARNING (still READY)', () => {
  const { packet, staleness } = completePacket('K', { triage_labels: ['not_a_real_class'] });
  const res = assessPacket(packet, { staleness });
  assert.equal(res.verdict, VERDICT.READY);
  assert.ok(res.checks.some((c) => c.field === 'triage_labels' && c.severity === SEVERITY.WARNING));
});

test('config override: a tiny threshold flags an otherwise-fine context', () => {
  const { packet, staleness } = completePacket('L');
  const res = assessPacket(packet, { staleness, config: { contextSizeThresholdBytes: 10 } });
  assert.equal(res.verdict, VERDICT.OVERSIZED_CONTEXT);
  assert.equal(res.config.thresholdIsBridgeConfirmed, false, 'provenance flag always false');
});

// ---------------------------------------------------------------------------
// CLI integration (temp-file read+hash path). The helper writes NO file.
// ---------------------------------------------------------------------------
function runHelper(args, cwd) {
  return spawnSync(process.execPath, [HELPER, ...args], { cwd, encoding: 'utf-8' });
}

test('CLI: validate a temp packet with a matching pin -> READY, exit 0, no file written', () => {
  const dir = mkdtempSync(join(tmpdir(), 'rp-cli-'));
  try {
    const artifactPath = join(dir, 'artifact.sql');
    writeFileSync(artifactPath, 'CLI ARTIFACT BYTES v1\n');
    const hash = sha(readFileSync(artifactPath));
    const packet = {
      schema: SCHEMA,
      action_type: 'plan_review',
      artifact_ref: { path: artifactPath },
      context: fullContext(),
      proposal: PROPOSAL,
      reviewed_input_hash: hash,
      triage_labels: [],
    };
    const inputPath = join(dir, 'packet.json');
    writeFileSync(inputPath, JSON.stringify(packet));
    const before = readdirSync(dir).sort();

    const r = runHelper(['--mode', 'validate', '--input', inputPath], dir);
    assert.equal(r.status, 0, r.stderr);
    const out = JSON.parse(r.stdout);
    assert.equal(out.verdict, VERDICT.READY);
    assert.equal(out.hashState.state, 'current');

    const after = readdirSync(dir).sort();
    assert.deepEqual(after, before, 'helper wrote no new file');
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('CLI: validate with a wrong pin -> HASH-UNPINNED-OR-STALE, exit 4', () => {
  const dir = mkdtempSync(join(tmpdir(), 'rp-cli-'));
  try {
    const artifactPath = join(dir, 'artifact.sql');
    writeFileSync(artifactPath, 'CURRENT BYTES\n');
    const packet = {
      schema: SCHEMA, action_type: 'plan_review', artifact_ref: { path: artifactPath },
      context: fullContext(), proposal: PROPOSAL, reviewed_input_hash: sha('DIFFERENT BYTES'), triage_labels: [],
    };
    const inputPath = join(dir, 'packet.json');
    writeFileSync(inputPath, JSON.stringify(packet));
    const r = runHelper(['--mode', 'validate', '--input', inputPath], dir);
    assert.equal(r.status, 4, r.stderr);
    assert.equal(JSON.parse(r.stdout).verdict, VERDICT.HASH_UNPINNED_OR_STALE);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('CLI: compose from a temp request (no hash) -> pins current bytes -> READY, exit 0', () => {
  const dir = mkdtempSync(join(tmpdir(), 'rp-cli-'));
  try {
    const artifactPath = join(dir, 'artifact.sql');
    writeFileSync(artifactPath, 'COMPOSE ME\n');
    const request = {
      action_type: 'plan_review', artifact_ref: { path: artifactPath },
      proposal: PROPOSAL, context_fields: fullContext(), evidence_pointers: ['p1'],
    };
    const inputPath = join(dir, 'request.json');
    writeFileSync(inputPath, JSON.stringify(request));
    const r = runHelper(['--mode', 'compose', '--input', inputPath], dir);
    assert.equal(r.status, 0, r.stderr);
    const out = JSON.parse(r.stdout);
    assert.equal(out.verdict, VERDICT.READY);
    assert.equal(out.packet.reviewed_input_hash, sha(readFileSync(artifactPath)));
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('CLI: unreadable artifact_ref -> HASH-UNPINNED-OR-STALE, exit 4', () => {
  const dir = mkdtempSync(join(tmpdir(), 'rp-cli-'));
  try {
    const packet = {
      schema: SCHEMA, action_type: 'plan_review', artifact_ref: { path: join(dir, 'does-not-exist.sql') },
      context: fullContext(), proposal: PROPOSAL, reviewed_input_hash: sha('x'), triage_labels: [],
    };
    const inputPath = join(dir, 'packet.json');
    writeFileSync(inputPath, JSON.stringify(packet));
    const r = runHelper(['--mode', 'validate', '--input', inputPath], dir);
    assert.equal(r.status, 4, r.stderr);
    assert.equal(JSON.parse(r.stdout).hashState.state, 'unreadable');
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('CLI: malformed JSON input -> fail-closed INCOMPLETE, exit 2 (never READY)', () => {
  const dir = mkdtempSync(join(tmpdir(), 'rp-cli-'));
  try {
    const inputPath = join(dir, 'bad.json');
    writeFileSync(inputPath, '{ not valid json ');
    const r = runHelper(['--mode', 'validate', '--input', inputPath], dir);
    assert.equal(r.status, 2, r.stderr);
    assert.equal(JSON.parse(r.stdout).verdict, VERDICT.INCOMPLETE);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('CLI: committed raw-diff fixture -> OVERSIZED-CONTEXT, exit 3', () => {
  const helpersDir = fileURLToPath(new URL('.', import.meta.url));
  const fixture = 'fixtures/review-packet/packet-oversized.json';
  const r = runHelper(['--mode', 'validate', '--input', fixture, '--repo', helpersDir], helpersDir);
  assert.equal(r.status, 3, r.stderr);
  const out = JSON.parse(r.stdout);
  assert.equal(out.verdict, VERDICT.OVERSIZED_CONTEXT);
  assert.ok(out.contextSize.rawDiffFields.length > 0);
});

test('CLI: --emit packet prints the canonical packet on the first line', () => {
  const dir = mkdtempSync(join(tmpdir(), 'rp-cli-'));
  try {
    const artifactPath = join(dir, 'a.sql');
    writeFileSync(artifactPath, 'BYTES\n');
    const request = { action_type: 'plan_review', artifact_ref: { path: artifactPath }, proposal: PROPOSAL, context_fields: fullContext() };
    const inputPath = join(dir, 'req.json');
    writeFileSync(inputPath, JSON.stringify(request));
    const r = runHelper(['--mode', 'compose', '--emit', 'packet', '--input', inputPath], dir);
    assert.equal(r.status, 0, r.stderr);
    const packet = JSON.parse(r.stdout);
    assert.equal(packet.schema, SCHEMA);
    assert.equal(packet.reviewed_input_hash, sha(readFileSync(artifactPath)));
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
