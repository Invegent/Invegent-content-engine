// m13-blueprint-capture-diff.mjs — M13 Governed Template Build Pack, Lane 1/2.
//
// PURPOSE
//   Mechanically compare a Blueprint document (the intended, provider-neutral
//   template contract — docs/creative-library/m13-blueprint-capture-schema-v1.md
//   §1) against a Creatomate Capture document (the actual, read-only witness of
//   a live template — same doc §2), and report a structural_diff_result whose
//   verdict feeds the M13 Build Pack's "mismatches block graduation" rule
//   (scoping packet docs/briefs/m13-governed-template-build-pack-scoping-packet-v1.md
//   §5). It never itself grants graduation.
//
// WHAT IT IS (mirrors the CCF-04 zero-authority-helper pattern of
// .claude/helpers/apply-harness-auditor.mjs)
//   Pure-core, exported, deterministic, unit-testable functions driven by a
//   thin main() that runs only on direct invocation. FAIL-CLOSED: malformed or
//   incomplete input never produces a fabricated "clean" verdict.
//
// COMPARISON BASIS (packet §5)
//   Blueprint.elements[] vs Capture.normalized_elements[], keyed on element_key.
//   Four independently-reportable finding classes:
//     - missing_in_capture         BLOCK      a Blueprint element_key has no
//                                              matching Capture entry.
//     - dimension_output_mismatch  BLOCK      aspect_ratio / output_type /
//                                              duration_seconds disagree beyond
//                                              a stated tolerance placeholder.
//     - extra_in_capture           ADVISORY   a Capture element_key has no
//                                              matching Blueprint entry — UNLESS
//                                              it collides with a reserved
//                                              field_class name, which escalates
//                                              that one finding to BLOCK (packet
//                                              §5: "unless the extra element
//                                              collides with a reserved
//                                              field-class name").
//     - field_class_mismatch       ADVISORY   ONLY, never escalated in v1 —
//                                              detected_field_class is stated as
//                                              "best-effort" (packet §5);
//                                              promoting this class to BLOCK is a
//                                              named future decision, not made
//                                              here.
//   Verdict rollup: clean (no findings) / concerns (advisory findings only) /
//   blocked (any BLOCK finding) — CCF-02 findings-contract vocabulary named in
//   CLAUDE.md.
//
// OUT OF SCOPE (the crux — it must NOT do these)
//   - call the Creatomate API (no GET/POST/network of any kind)
//   - read or write any DB / the live Creative Library registry
//   - decide graduation, or write a graduation/proof status anywhere
//   - judge business/payload correctness of field VALUES (only structure)
//   - implement multi-object/sequence behaviour (Blueprint elements[] entries
//     may carry a dormant, nullable sub_sequence_key seam — see schema doc
//     §1.1 — but this engine does not read or act on it in v1)
//
// FAIL-CLOSED POSTURE
//   Any missing-required-field / malformed input => verdict "incomplete" (never
//   a fabricated "clean"), for both the Blueprint and the Capture independently.
//   Any unexpected internal error during the diff walk itself is also caught
//   and mapped to "incomplete", matching apply-harness-auditor's assess().
//
// NO fs WRITE anywhere. The ONLY fs use is reading the two input files (already
// user-supplied paths) in main(). NO network. NO child process. NO git.

import { readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

// ===========================================================================
// PURE CORE — no side effects, no fs, no network. These are what tests exercise.
// ===========================================================================

export const FINDING_CLASS = {
  MISSING_IN_CAPTURE: 'missing_in_capture',
  DIMENSION_OUTPUT_MISMATCH: 'dimension_output_mismatch',
  EXTRA_IN_CAPTURE: 'extra_in_capture',
  FIELD_CLASS_MISMATCH: 'field_class_mismatch',
};

export const SEVERITY = { BLOCK: 'BLOCK', ADVISORY: 'ADVISORY' };

// CCF-02 findings-contract vocabulary, matching the Lane 1 brief's own wording
// ("clean" / "concerns" / "blocked") and the fail-closed "incomplete" state.
export const VERDICT = {
  CLEAN: 'clean',
  CONCERNS: 'concerns',
  BLOCKED: 'blocked',
  INCOMPLETE: 'incomplete',
};

// The Blueprint field_class enum (schema doc §1.1). An extra Capture element
// whose element_key collides with one of these names is escalated from
// ADVISORY to BLOCK — packet §5's "unless it collides with a reserved
// field-class name" clause.
export const RESERVED_FIELD_CLASS_NAMES = new Set([
  'ai_authored',
  'derived',
  'renderer_fixed',
  'governed_asset',
]);

// A stated, to-be-calibrated tolerance placeholder for duration_seconds
// disagreement (packet §5: "beyond a to-be-calibrated tolerance"). Zero in v1
// — no calibration data exists yet; any disagreement blocks. A future lane may
// raise this once real render-timing variance is characterised.
export const DURATION_TOLERANCE_SECONDS = 0;

// ---------------------------------------------------------------------------
// VALIDATION — fail-closed input checks. Returns an array of human-readable
// error strings; empty array means the document has every field this engine
// needs to run the diff (it does NOT validate the full schema doc, only the
// subset the comparison basis depends on).
// ---------------------------------------------------------------------------

function isNonEmptyString(v) {
  return typeof v === 'string' && v.length > 0;
}

export function validateBlueprint(blueprint) {
  const errors = [];
  if (blueprint === null || typeof blueprint !== 'object' || Array.isArray(blueprint)) {
    return ['Blueprint input is not a JSON object'];
  }
  for (const field of ['blueprint_id', 'blueprint_version', 'schema_version', 'aspect_ratio', 'output_type']) {
    if (!isNonEmptyString(blueprint[field])) errors.push(`Blueprint missing required field: ${field}`);
  }
  if (!Array.isArray(blueprint.elements)) {
    errors.push('Blueprint missing required field: elements[] (must be an array)');
  } else {
    blueprint.elements.forEach((el, i) => {
      if (el === null || typeof el !== 'object') {
        errors.push(`Blueprint.elements[${i}] is not an object`);
        return;
      }
      if (!isNonEmptyString(el.element_key)) errors.push(`Blueprint.elements[${i}] missing element_key`);
      if (!isNonEmptyString(el.field_class)) errors.push(`Blueprint.elements[${i}] missing field_class`);
    });
  }
  // duration_seconds is CONDITIONAL — required only when output_type looks
  // like video/motion (schema doc §1: "required for video/motion Blueprints;
  // absent for static").
  if (isNonEmptyString(blueprint.output_type) && /mp4|mov|webm|video|motion/i.test(blueprint.output_type)) {
    if (typeof blueprint.duration_seconds !== 'number') {
      errors.push('Blueprint missing conditionally-required field: duration_seconds (output_type indicates video/motion)');
    }
  }
  return errors;
}

export function validateCapture(capture) {
  const errors = [];
  if (capture === null || typeof capture !== 'object' || Array.isArray(capture)) {
    return ['Capture input is not a JSON object'];
  }
  for (const field of ['capture_id', 'capture_version', 'schema_version', 'aspect_ratio', 'output_type']) {
    if (!isNonEmptyString(capture[field])) errors.push(`Capture missing required field: ${field}`);
  }
  if (!Array.isArray(capture.normalized_elements)) {
    errors.push('Capture missing required field: normalized_elements[] (must be an array)');
  } else {
    capture.normalized_elements.forEach((el, i) => {
      if (el === null || typeof el !== 'object') {
        errors.push(`Capture.normalized_elements[${i}] is not an object`);
        return;
      }
      if (!isNonEmptyString(el.element_key)) errors.push(`Capture.normalized_elements[${i}] missing element_key`);
      if (el.detected_field_class === undefined || el.detected_field_class === null) {
        errors.push(`Capture.normalized_elements[${i}] missing detected_field_class`);
      }
    });
  }
  return errors;
}

// ---------------------------------------------------------------------------
// FINDING factory
// ---------------------------------------------------------------------------

function mkFinding({ findingClass, severity, elementKey, detail }) {
  return {
    class: findingClass,
    severity,
    element_key: elementKey === undefined ? null : elementKey,
    detail,
  };
}

// ===========================================================================
// THE FOUR FINDING-CLASS CHECKS — each a pure function over the (already
// validated) Blueprint + Capture pair, returning an array of findings.
// ===========================================================================

// 1 — missing_in_capture (BLOCK): a Blueprint element_key has no Capture match.
export function findMissingInCapture(blueprint, capture) {
  const capKeys = new Set(capture.normalized_elements.map((el) => el.element_key));
  const findings = [];
  for (const el of blueprint.elements) {
    if (!capKeys.has(el.element_key)) {
      findings.push(
        mkFinding({
          findingClass: FINDING_CLASS.MISSING_IN_CAPTURE,
          severity: SEVERITY.BLOCK,
          elementKey: el.element_key,
          detail: `Blueprint element "${el.element_key}" (field_class=${el.field_class}) has no matching entry in Capture.normalized_elements[] — the human transposition appears to have dropped this field (packet §5, class 1).`,
        }),
      );
    }
  }
  return findings;
}

// 2 — dimension_output_mismatch (BLOCK): top-level aspect_ratio / output_type /
//     duration_seconds disagree beyond DURATION_TOLERANCE_SECONDS.
export function findDimensionOutputMismatch(blueprint, capture) {
  const findings = [];
  if (blueprint.aspect_ratio !== capture.aspect_ratio) {
    findings.push(
      mkFinding({
        findingClass: FINDING_CLASS.DIMENSION_OUTPUT_MISMATCH,
        severity: SEVERITY.BLOCK,
        elementKey: null,
        detail: `aspect_ratio disagrees: Blueprint declares "${blueprint.aspect_ratio}", Capture reports "${capture.aspect_ratio}".`,
      }),
    );
  }
  if (blueprint.output_type !== capture.output_type) {
    findings.push(
      mkFinding({
        findingClass: FINDING_CLASS.DIMENSION_OUTPUT_MISMATCH,
        severity: SEVERITY.BLOCK,
        elementKey: null,
        detail: `output_type disagrees: Blueprint declares "${blueprint.output_type}", Capture reports "${capture.output_type}".`,
      }),
    );
  }
  const bpDuration = blueprint.duration_seconds;
  if (typeof bpDuration === 'number') {
    const capDuration = typeof capture.duration_seconds === 'number' ? capture.duration_seconds : null;
    const disagrees =
      capDuration === null || Math.abs(capDuration - bpDuration) > DURATION_TOLERANCE_SECONDS;
    if (disagrees) {
      findings.push(
        mkFinding({
          findingClass: FINDING_CLASS.DIMENSION_OUTPUT_MISMATCH,
          severity: SEVERITY.BLOCK,
          elementKey: null,
          detail: `duration_seconds disagrees beyond tolerance (${DURATION_TOLERANCE_SECONDS}s, a to-be-calibrated placeholder per packet §5): Blueprint declares ${bpDuration}, Capture reports ${capDuration === null ? 'absent/non-numeric' : capDuration}.`,
        }),
      );
    }
  }
  return findings;
}

// 3 — extra_in_capture (ADVISORY, unless the element_key collides with a
//     reserved field_class name, which escalates that finding to BLOCK).
export function findExtraInCapture(blueprint, capture) {
  const bpKeys = new Set(blueprint.elements.map((el) => el.element_key));
  const findings = [];
  for (const el of capture.normalized_elements) {
    if (!bpKeys.has(el.element_key)) {
      const collides = RESERVED_FIELD_CLASS_NAMES.has(el.element_key);
      findings.push(
        mkFinding({
          findingClass: FINDING_CLASS.EXTRA_IN_CAPTURE,
          severity: collides ? SEVERITY.BLOCK : SEVERITY.ADVISORY,
          elementKey: el.element_key,
          detail: collides
            ? `Capture element "${el.element_key}" has no matching Blueprint entry AND its element_key collides with a reserved field_class name (${[...RESERVED_FIELD_CLASS_NAMES].join(', ')}) — escalated to BLOCK per packet §5's "unless the extra element collides with a reserved field-class name" clause.`
            : `Capture element "${el.element_key}" (detected_field_class=${el.detected_field_class}) has no matching Blueprint entry — advisory only; a human may have added a decorative/undeclared element the Blueprint never specified (packet §5, class 2).`,
        }),
      );
    }
  }
  return findings;
}

// 4 — field_class_mismatch (ADVISORY-ONLY in v1 — never escalated).
export function findFieldClassMismatch(blueprint, capture) {
  const capByKey = new Map(capture.normalized_elements.map((el) => [el.element_key, el]));
  const findings = [];
  for (const el of blueprint.elements) {
    const capEl = capByKey.get(el.element_key);
    if (!capEl) continue; // already reported by findMissingInCapture
    if (capEl.detected_field_class !== el.field_class) {
      findings.push(
        mkFinding({
          findingClass: FINDING_CLASS.FIELD_CLASS_MISMATCH,
          severity: SEVERITY.ADVISORY,
          elementKey: el.element_key,
          detail: `Blueprint declares field_class="${el.field_class}" for "${el.element_key}"; Capture's best-effort detection reads detected_field_class="${capEl.detected_field_class}" — advisory only in v1 (packet §5: "detected_field_class is best-effort... promoting this class to blocking is a named future decision, not made here").`,
        }),
      );
    }
  }
  return findings;
}

export const CHECKS = [
  findMissingInCapture,
  findDimensionOutputMismatch,
  findExtraInCapture,
  findFieldClassMismatch,
];

// ===========================================================================
// VERDICT ROLLUP + THE PUBLIC DIFF ENTRY POINT
// ===========================================================================

export function rollupVerdict(findings) {
  if (findings.some((f) => f.severity === SEVERITY.BLOCK)) return VERDICT.BLOCKED;
  if (findings.length > 0) return VERDICT.CONCERNS;
  return VERDICT.CLEAN;
}

// diffBlueprintCapture: the pure core entry point. Takes two ALREADY-PARSED
// JSON objects (never file paths, never JSON text — that boundary lives only
// in main()). Fail-closed: any validation failure or unexpected internal error
// returns verdict "incomplete", never a fabricated "clean".
//
// `nowIso` is an injectable clock (defaults to real time) purely so tests can
// assert on structural_diff_result.diffed_at deterministically if desired —
// it introduces no fs/network dependency.
export function diffBlueprintCapture(blueprint, capture, { nowIso } = {}) {
  const blueprintErrors = validateBlueprint(blueprint);
  const captureErrors = validateCapture(capture);
  const errors = [...blueprintErrors, ...captureErrors];
  if (errors.length > 0) {
    return {
      ok: false,
      verdict: VERDICT.INCOMPLETE,
      findings: [],
      structural_diff_result: null,
      errors,
    };
  }

  try {
    const findings = [];
    for (const check of CHECKS) findings.push(...check(blueprint, capture));
    const verdict = rollupVerdict(findings);
    const diffedAt = nowIso || new Date().toISOString();
    const structural_diff_result = {
      blueprint_id: blueprint.blueprint_id,
      blueprint_version: blueprint.blueprint_version,
      capture_id: capture.capture_id,
      capture_version: capture.capture_version,
      verdict,
      findings,
      diffed_at: diffedAt,
    };
    return { ok: true, verdict, findings, structural_diff_result, errors: [] };
  } catch (e) {
    return {
      ok: false,
      verdict: VERDICT.INCOMPLETE,
      findings: [],
      structural_diff_result: null,
      errors: [`internal diff error: ${e && e.message ? e.message : e}`],
    };
  }
}

// ---------------------------------------------------------------------------
// Human-readable report (printed by main; findings enumerated independently of
// the rolled-up verdict, matching the CCF-04 helper convention).
// ---------------------------------------------------------------------------
export function formatReport(result, blueprintLabel, captureLabel) {
  const lines = [];
  lines.push('=== m13-blueprint-capture-diff (M13 Build Pack · READ-ONLY · ADVISORY · decides nothing) ===');
  lines.push('');
  lines.push(`blueprint: ${blueprintLabel || '(in-memory)'}`);
  lines.push(`capture  : ${captureLabel || '(in-memory)'}`);
  lines.push(`verdict  : ${result.verdict}`);
  if (result.ok === false) {
    lines.push('');
    lines.push('FAIL-CLOSED — input could not be assessed:');
    for (const e of result.errors) lines.push(`  - ${e}`);
  } else {
    lines.push(`findings : ${result.findings.length} (always fully enumerated, independent of the top verdict)`);
    lines.push('');
    if (result.findings.length === 0) {
      lines.push('No structural mismatch between Blueprint.elements[] and Capture.normalized_elements[].');
      lines.push('This is NOT a graduation grant and NOT a judgment of field VALUE/business correctness.');
      lines.push('PK visual approval is still the only act that graduates a template.');
    } else {
      for (const f of result.findings) {
        lines.push(`[${f.class}] severity=${f.severity}${f.element_key ? ` element_key=${f.element_key}` : ''}`);
        lines.push(`  ${f.detail}`);
        lines.push('');
      }
    }
  }
  lines.push('--- boundary (this tool NEVER does these) ---');
  lines.push('  call the Creatomate API · read/write the DB or live registry · grant graduation ·');
  lines.push('  judge field-VALUE/business correctness · bypass PK visual approval.');
  lines.push('=================================================================================');
  return lines.join('\n');
}

// ===========================================================================
// THIN main() — reads the two input files (the ONLY fs use), prints the
// report. Runs only on direct invocation. Fail-closed. Non-zero exit on
// unreadable/unparseable input or a BLOCKED verdict, so a wrapper can detect
// either. NO network, NO child process, NO git, NO writes.
// ===========================================================================
export function main(argv = process.argv.slice(2)) {
  const positional = argv.filter((a) => !a.startsWith('-'));
  const [blueprintPath, capturePath] = positional;
  if (!blueprintPath || !capturePath) {
    process.stdout.write('usage: node m13-blueprint-capture-diff.mjs <blueprint.json> <capture.json> [--json]\n');
    process.exitCode = 2;
    return;
  }

  const readJson = (path) => {
    let text;
    try {
      text = readFileSync(path, 'utf-8');
    } catch (e) {
      return { ok: false, error: `could not read file "${path}": ${e && e.message ? e.message : e}` };
    }
    try {
      return { ok: true, value: JSON.parse(text) };
    } catch (e) {
      return { ok: false, error: `"${path}" is not valid JSON: ${e && e.message ? e.message : e}` };
    }
  };

  const bp = readJson(blueprintPath);
  const cap = readJson(capturePath);
  if (!bp.ok || !cap.ok) {
    const errors = [bp.ok ? null : bp.error, cap.ok ? null : cap.error].filter(Boolean);
    const result = { ok: false, verdict: VERDICT.INCOMPLETE, findings: [], structural_diff_result: null, errors };
    process.stdout.write(formatReport(result, blueprintPath, capturePath) + '\n');
    process.exitCode = 2;
    return;
  }

  const result = diffBlueprintCapture(bp.value, cap.value);
  process.stdout.write(formatReport(result, blueprintPath, capturePath) + '\n');
  if (argv.includes('--json')) {
    process.stdout.write(JSON.stringify(result.structural_diff_result ?? { ok: result.ok, errors: result.errors }, null, 2) + '\n');
  }
  // Fail-closed exit: 2 on an unassessable input, 1 on a BLOCKED verdict, 0
  // otherwise (clean or concerns — advisory findings do not fail the process).
  if (result.ok === false) process.exitCode = 2;
  else if (result.verdict === VERDICT.BLOCKED) process.exitCode = 1;
  else process.exitCode = 0;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main();
}
