// Hermetic tests for m13-blueprint-capture-diff.mjs (M13 Build Pack diff engine).
// Node built-in test runner. No network, no DB, no live Creatomate call anywhere
// in this suite. Fixtures live under fixtures/m13-blueprint-capture-diff/.
//   Run: node --test .claude/helpers/m13-blueprint-capture-diff.test.mjs

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

import {
  FINDING_CLASS,
  SEVERITY,
  VERDICT,
  RESERVED_FIELD_CLASS_NAMES,
  DURATION_TOLERANCE_SECONDS,
  validateBlueprint,
  validateCapture,
  findMissingInCapture,
  findDimensionOutputMismatch,
  findExtraInCapture,
  findFieldClassMismatch,
  rollupVerdict,
  diffBlueprintCapture,
  formatReport,
} from './m13-blueprint-capture-diff.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const MODULE = join(HERE, 'm13-blueprint-capture-diff.mjs');
const FIX = join(HERE, 'fixtures', 'm13-blueprint-capture-diff');

function fixturePath(name) {
  return join(FIX, name);
}
function loadJson(name) {
  return JSON.parse(readFileSync(fixturePath(name), 'utf-8'));
}
function blueprint() {
  return loadJson('blueprint-pp-carousel-cover-v1.json');
}

// ===========================================================================
// FULL-PACKET VERDICTS (the acceptance controls) — every fixture pair.
// ===========================================================================

test('clean pair -> verdict clean, zero findings', () => {
  const bp = blueprint();
  const cap = loadJson('capture-pp-carousel-cover-clean.json');
  const r = diffBlueprintCapture(bp, cap);
  assert.equal(r.ok, true);
  assert.equal(r.verdict, VERDICT.CLEAN, `expected clean, got ${r.verdict}: ${JSON.stringify(r.findings)}`);
  assert.equal(r.findings.length, 0);
  assert.ok(r.structural_diff_result, 'structural_diff_result is populated on a clean diff');
  assert.equal(r.structural_diff_result.blueprint_id, bp.blueprint_id);
  assert.equal(r.structural_diff_result.capture_id, cap.capture_id);
  assert.equal(r.structural_diff_result.verdict, VERDICT.CLEAN);
  assert.match(r.structural_diff_result.diffed_at, /^\d{4}-\d{2}-\d{2}T/, 'diffed_at looks like an ISO timestamp');
});

test('missing-element capture -> verdict blocked, missing_in_capture finding for SlideIndicator', () => {
  const bp = blueprint();
  const cap = loadJson('capture-missing-element.json');
  const r = diffBlueprintCapture(bp, cap);
  assert.equal(r.ok, true);
  assert.equal(r.verdict, VERDICT.BLOCKED, `expected blocked, got ${r.verdict}`);
  const f = r.findings.filter((x) => x.class === FINDING_CLASS.MISSING_IN_CAPTURE);
  assert.equal(f.length, 1);
  assert.equal(f[0].severity, SEVERITY.BLOCK);
  assert.equal(f[0].element_key, 'SlideIndicator');
});

test('dimension-mismatch capture -> verdict blocked, dimension_output_mismatch finding on output_type', () => {
  const bp = blueprint();
  const cap = loadJson('capture-dimension-mismatch.json');
  const r = diffBlueprintCapture(bp, cap);
  assert.equal(r.ok, true);
  assert.equal(r.verdict, VERDICT.BLOCKED, `expected blocked, got ${r.verdict}`);
  const f = r.findings.filter((x) => x.class === FINDING_CLASS.DIMENSION_OUTPUT_MISMATCH);
  assert.equal(f.length, 1);
  assert.equal(f[0].severity, SEVERITY.BLOCK);
  assert.ok(f[0].detail.includes('output_type'), 'names the disagreeing field');
  // no false-positive missing/extra findings — the element sets still match 1:1
  assert.equal(r.findings.filter((x) => x.class === FINDING_CLASS.MISSING_IN_CAPTURE).length, 0);
  assert.equal(r.findings.filter((x) => x.class === FINDING_CLASS.EXTRA_IN_CAPTURE).length, 0);
});

test('extra-element capture (non-colliding) -> verdict concerns, ADVISORY only, never escalates', () => {
  const bp = blueprint();
  const cap = loadJson('capture-extra-element.json');
  const r = diffBlueprintCapture(bp, cap);
  assert.equal(r.ok, true);
  assert.equal(r.verdict, VERDICT.CONCERNS, `expected concerns, got ${r.verdict}: ${JSON.stringify(r.findings)}`);
  const f = r.findings.filter((x) => x.class === FINDING_CLASS.EXTRA_IN_CAPTURE);
  assert.equal(f.length, 1);
  assert.equal(f[0].element_key, 'DecorativeAccentShape');
  assert.equal(f[0].severity, SEVERITY.ADVISORY, 'a non-colliding extra element never escalates to BLOCK');
  assert.ok(!r.findings.some((x) => x.severity === SEVERITY.BLOCK), 'no BLOCK finding present -> concerns, not blocked');
});

test('field-class-mismatch capture -> verdict concerns, ADVISORY-only, never escalates', () => {
  const bp = blueprint();
  const cap = loadJson('capture-field-class-mismatch.json');
  const r = diffBlueprintCapture(bp, cap);
  assert.equal(r.ok, true);
  assert.equal(r.verdict, VERDICT.CONCERNS, `expected concerns, got ${r.verdict}: ${JSON.stringify(r.findings)}`);
  const f = r.findings.filter((x) => x.class === FINDING_CLASS.FIELD_CLASS_MISMATCH);
  assert.equal(f.length, 1);
  assert.equal(f[0].element_key, 'Headline');
  assert.equal(f[0].severity, SEVERITY.ADVISORY, 'field_class_mismatch is ADVISORY-only in v1, per packet §5');
  assert.ok(!r.findings.some((x) => x.severity === SEVERITY.BLOCK), 'no BLOCK finding present -> concerns, not blocked');
});

test('malformed JSON file -> main() fails closed to incomplete (JSON.parse boundary)', () => {
  const res = spawnSync(
    process.execPath,
    [MODULE, fixturePath('blueprint-pp-carousel-cover-v1.json'), fixturePath('capture-malformed-invalid-json.json')],
    { encoding: 'utf-8', cwd: HERE },
  );
  const out = (res.stdout || '') + (res.stderr || '');
  assert.match(out, /verdict\s*:\s*incomplete/i, 'CLI reports incomplete on unparseable Capture JSON');
  assert.match(out, /not valid JSON/i, 'CLI names the JSON parse failure');
  assert.equal(res.status, 2, 'fail-closed exit code on unassessable input');
});

// ===========================================================================
// PURE-CORE VALIDATION — missing-required-field fail-closed path (inline
// objects; no fixture file needed, mirrors apply-harness-auditor's mix of
// fixture-based + inline-snippet tests).
// ===========================================================================

test('validateBlueprint fails closed on a missing required field (blueprint_id)', () => {
  const bp = blueprint();
  delete bp.blueprint_id;
  const errors = validateBlueprint(bp);
  assert.ok(errors.some((e) => e.includes('blueprint_id')));
});

test('validateBlueprint fails closed when elements[] is not an array', () => {
  const bp = blueprint();
  bp.elements = 'not-an-array';
  const errors = validateBlueprint(bp);
  assert.ok(errors.some((e) => e.includes('elements[]')));
});

test('validateBlueprint requires duration_seconds only when output_type looks like video/motion', () => {
  const bpStatic = blueprint();
  assert.equal(validateBlueprint(bpStatic).length, 0, 'static jpg Blueprint needs no duration_seconds');
  const bpVideo = blueprint();
  bpVideo.output_type = 'mp4';
  const errors = validateBlueprint(bpVideo);
  assert.ok(errors.some((e) => e.includes('duration_seconds')), 'video output_type without duration_seconds fails closed');
});

test('validateCapture fails closed on a missing required field (capture_id)', () => {
  const cap = loadJson('capture-pp-carousel-cover-clean.json');
  delete cap.capture_id;
  const errors = validateCapture(cap);
  assert.ok(errors.some((e) => e.includes('capture_id')));
});

test('validateCapture fails closed when normalized_elements[] is not an array', () => {
  const cap = loadJson('capture-pp-carousel-cover-clean.json');
  cap.normalized_elements = null;
  const errors = validateCapture(cap);
  assert.ok(errors.some((e) => e.includes('normalized_elements[]')));
});

test('diffBlueprintCapture returns incomplete (not a fabricated clean) when Blueprint is missing a required field', () => {
  const bp = blueprint();
  delete bp.blueprint_id;
  const cap = loadJson('capture-pp-carousel-cover-clean.json');
  const r = diffBlueprintCapture(bp, cap);
  assert.equal(r.ok, false);
  assert.equal(r.verdict, VERDICT.INCOMPLETE);
  assert.equal(r.structural_diff_result, null, 'no structural_diff_result is fabricated on an incomplete input');
  assert.equal(r.findings.length, 0);
  assert.ok(r.errors.length > 0);
});

test('diffBlueprintCapture returns incomplete when Capture is missing a required field', () => {
  const bp = blueprint();
  const cap = loadJson('capture-pp-carousel-cover-clean.json');
  delete cap.normalized_elements;
  const r = diffBlueprintCapture(bp, cap);
  assert.equal(r.ok, false);
  assert.equal(r.verdict, VERDICT.INCOMPLETE);
  assert.equal(r.structural_diff_result, null);
});

test('diffBlueprintCapture returns incomplete on totally non-object input (not merely empty object)', () => {
  const r1 = diffBlueprintCapture(null, {});
  assert.equal(r1.verdict, VERDICT.INCOMPLETE);
  const r2 = diffBlueprintCapture('not an object', 'also not an object');
  assert.equal(r2.verdict, VERDICT.INCOMPLETE);
  const r3 = diffBlueprintCapture([1, 2, 3], { capture_id: 'x' });
  assert.equal(r3.verdict, VERDICT.INCOMPLETE);
});

// ===========================================================================
// EACH FINDING-CLASS CHECK IN ISOLATION — fires when the defect is present,
// silent when absent (mirrors the apply-harness-auditor per-check test shape).
// ===========================================================================

test('findMissingInCapture: silent on a full match, fires per dropped element', () => {
  const bp = blueprint();
  const capClean = loadJson('capture-pp-carousel-cover-clean.json');
  assert.equal(findMissingInCapture(bp, capClean).length, 0);
  const capMissing = loadJson('capture-missing-element.json');
  const findings = findMissingInCapture(bp, capMissing);
  assert.equal(findings.length, 1);
  assert.equal(findings[0].class, FINDING_CLASS.MISSING_IN_CAPTURE);
  assert.equal(findings[0].severity, SEVERITY.BLOCK);
});

test('findDimensionOutputMismatch: silent when aspect_ratio/output_type/duration agree', () => {
  const bp = blueprint();
  const capClean = loadJson('capture-pp-carousel-cover-clean.json');
  assert.equal(findDimensionOutputMismatch(bp, capClean).length, 0);
});

test('findDimensionOutputMismatch: fires on aspect_ratio disagreement', () => {
  const bp = blueprint();
  const cap = loadJson('capture-pp-carousel-cover-clean.json');
  cap.aspect_ratio = '4:5';
  const findings = findDimensionOutputMismatch(bp, cap);
  assert.equal(findings.length, 1);
  assert.equal(findings[0].severity, SEVERITY.BLOCK);
  assert.ok(findings[0].detail.includes('aspect_ratio'));
});

test('findDimensionOutputMismatch: fires when Blueprint declares duration_seconds and Capture omits it', () => {
  const bp = blueprint();
  bp.output_type = 'mp4';
  bp.duration_seconds = 12;
  const cap = loadJson('capture-pp-carousel-cover-clean.json');
  cap.output_type = 'mp4'; // keep output_type aligned so only duration disagrees
  const findings = findDimensionOutputMismatch(bp, cap);
  assert.ok(findings.some((f) => f.detail.includes('duration_seconds')));
});

test('findDimensionOutputMismatch: silent when duration_seconds matches exactly (tolerance placeholder is 0)', () => {
  assert.equal(DURATION_TOLERANCE_SECONDS, 0);
  const bp = blueprint();
  bp.output_type = 'mp4';
  bp.duration_seconds = 12;
  const cap = loadJson('capture-pp-carousel-cover-clean.json');
  cap.output_type = 'mp4';
  cap.duration_seconds = 12;
  const findings = findDimensionOutputMismatch(bp, cap);
  assert.ok(!findings.some((f) => f.detail.includes('duration_seconds')));
});

test('findExtraInCapture: silent on a full match, ADVISORY on a non-colliding extra', () => {
  const bp = blueprint();
  const capClean = loadJson('capture-pp-carousel-cover-clean.json');
  assert.equal(findExtraInCapture(bp, capClean).length, 0);
  const capExtra = loadJson('capture-extra-element.json');
  const findings = findExtraInCapture(bp, capExtra);
  assert.equal(findings.length, 1);
  assert.equal(findings[0].severity, SEVERITY.ADVISORY);
});

test('findExtraInCapture: escalates to BLOCK when the extra element_key collides with a reserved field_class name', () => {
  const bp = blueprint();
  const cap = loadJson('capture-pp-carousel-cover-clean.json');
  // inject an extra element whose element_key IS a reserved field_class name
  cap.normalized_elements = [
    ...cap.normalized_elements,
    { element_key: 'governed_asset', element_type: 'unknown', detected_field_class: 'unknown' },
  ];
  assert.ok(RESERVED_FIELD_CLASS_NAMES.has('governed_asset'));
  const findings = findExtraInCapture(bp, cap);
  assert.equal(findings.length, 1);
  assert.equal(findings[0].element_key, 'governed_asset');
  assert.equal(findings[0].severity, SEVERITY.BLOCK, 'collision with a reserved field_class name escalates extra_in_capture to BLOCK');

  // and the escalation actually flips the full diff verdict to blocked
  const r = diffBlueprintCapture(bp, cap);
  assert.equal(r.verdict, VERDICT.BLOCKED);
});

test('findFieldClassMismatch: silent on a full match, fires (ADVISORY) on disagreement, silent for a missing element (owned by missing_in_capture instead)', () => {
  const bp = blueprint();
  const capClean = loadJson('capture-pp-carousel-cover-clean.json');
  assert.equal(findFieldClassMismatch(bp, capClean).length, 0);

  const capMismatch = loadJson('capture-field-class-mismatch.json');
  const findings = findFieldClassMismatch(bp, capMismatch);
  assert.equal(findings.length, 1);
  assert.equal(findings[0].severity, SEVERITY.ADVISORY);

  const capMissing = loadJson('capture-missing-element.json');
  // SlideIndicator is absent entirely (not merely mismatched) -> not reported here
  const findingsMissing = findFieldClassMismatch(bp, capMissing);
  assert.ok(!findingsMissing.some((f) => f.element_key === 'SlideIndicator'));
});

// ===========================================================================
// VERDICT ROLLUP
// ===========================================================================

test('rollupVerdict: clean/concerns/blocked precedence', () => {
  assert.equal(rollupVerdict([]), VERDICT.CLEAN);
  assert.equal(
    rollupVerdict([{ class: FINDING_CLASS.EXTRA_IN_CAPTURE, severity: SEVERITY.ADVISORY }]),
    VERDICT.CONCERNS,
  );
  assert.equal(
    rollupVerdict([
      { class: FINDING_CLASS.EXTRA_IN_CAPTURE, severity: SEVERITY.ADVISORY },
      { class: FINDING_CLASS.MISSING_IN_CAPTURE, severity: SEVERITY.BLOCK },
    ]),
    VERDICT.BLOCKED,
    'a single BLOCK finding among advisories still rolls up to blocked',
  );
});

// ===========================================================================
// REPORT FORMATTING — sanity only (not asserting exact prose).
// ===========================================================================

test('formatReport names the verdict and never claims approval language', () => {
  const bp = blueprint();
  const cap = loadJson('capture-pp-carousel-cover-clean.json');
  const r = diffBlueprintCapture(bp, cap);
  const text = formatReport(r, 'blueprint.json', 'capture.json');
  assert.ok(text.includes('verdict'));
  assert.ok(text.toLowerCase().includes('clean'));
  assert.ok(!/\bapproved\b/i.test(text), 'the report never claims an approval');
});

// ===========================================================================
// CLI / main() — end-to-end via child process (mirrors apply-harness-auditor's
// spawnSync coverage).
// ===========================================================================

test('CLI clean pair -> exit 0, prints verdict: clean', () => {
  const r = spawnSync(
    process.execPath,
    [MODULE, fixturePath('blueprint-pp-carousel-cover-v1.json'), fixturePath('capture-pp-carousel-cover-clean.json')],
    { encoding: 'utf-8', cwd: HERE },
  );
  const text = (r.stdout || '') + (r.stderr || '');
  assert.ok(text.includes('m13-blueprint-capture-diff'), 'prints the report header');
  assert.match(text, /verdict\s*:\s*clean/i);
  assert.equal(r.status, 0, 'a clean diff exits 0');
});

test('CLI blocked pair -> exit 1, prints verdict: blocked', () => {
  const r = spawnSync(
    process.execPath,
    [MODULE, fixturePath('blueprint-pp-carousel-cover-v1.json'), fixturePath('capture-missing-element.json')],
    { encoding: 'utf-8', cwd: HERE },
  );
  const text = (r.stdout || '') + (r.stderr || '');
  assert.match(text, /verdict\s*:\s*blocked/i);
  assert.equal(r.status, 1, 'a blocked diff exits 1 (never the JSON-fail-closed exit 2)');
});

test('CLI --json flag emits a structural_diff_result object with the packet §5 shape', () => {
  const r = spawnSync(
    process.execPath,
    [MODULE, fixturePath('blueprint-pp-carousel-cover-v1.json'), fixturePath('capture-pp-carousel-cover-clean.json'), '--json'],
    { encoding: 'utf-8', cwd: HERE },
  );
  assert.equal(r.status, 0);
  const jsonStart = r.stdout.indexOf('{');
  const parsed = JSON.parse(r.stdout.slice(jsonStart));
  for (const key of ['blueprint_id', 'blueprint_version', 'capture_id', 'capture_version', 'verdict', 'findings', 'diffed_at']) {
    assert.ok(key in parsed, `structural_diff_result missing "${key}"`);
  }
});

test('module does not modify the working tree it runs in (read-only, no fs writes)', () => {
  const before = spawnSync('git', ['status', '--porcelain'], { encoding: 'utf-8', cwd: HERE });
  spawnSync(
    process.execPath,
    [MODULE, fixturePath('blueprint-pp-carousel-cover-v1.json'), fixturePath('capture-extra-element.json')],
    { encoding: 'utf-8', cwd: HERE },
  );
  const after = spawnSync('git', ['status', '--porcelain'], { encoding: 'utf-8', cwd: HERE });
  assert.equal(after.stdout || '', before.stdout || '', 'working tree unchanged after a run');
});

test('no network access anywhere in the module source (static guard)', () => {
  const src = readFileSync(MODULE, 'utf-8');
  assert.ok(!/\bfetch\s*\(/.test(src), 'no fetch() call in the diff engine');
  assert.ok(!/node:https?\b/.test(src), 'no http(s) module import');
  assert.ok(!/node:child_process/.test(src), 'no child_process import');
});
