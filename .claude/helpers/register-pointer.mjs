// register-pointer.mjs — CCF-04 Mechanical Assistant #6 (Register Pointer Template)
//
// PURPOSE
//   A session about to cut a register version runs this to COMPOSE the canonical
//   Convention-1 register pointer from the lane's facts — the sync_state
//   blockquote block AND the action_list `current marker` line — ready to paste.
//   It PROPOSES text and RESOLVES NOTHING: the HUMAN writes + commits the pointer.
//   It is a template, not a fixer.
//
// WHAT IT IS (charter: docs/briefs/ccf-04-mechanical-assistants-charter.md;
//   Convention 1: the result doc is the canonical lane record; registers receive
//   POINTER entries only — <=5 lines: version · verdict · identity/hash ·
//   result-doc link · next gate/queue impact.)
//   Zero-authority, deterministic, PURE composition — NO git, NO network, NO fs
//   write anywhere. It mirrors the PROVEN shape of claim-stub.mjs /
//   source-truth-check.mjs: exported pure-core functions (deterministic,
//   unit-testable with injected inputs) driven by a thin main() that runs ONLY on
//   direct invocation, FAIL-CLOSED throughout.
//
// SINGLE RESPONSIBILITY (does NOT overlap its siblings)
//   It COMPOSES pointer TEXT from facts it is GIVEN. It does NOT propose the
//   version (that is claim-stub's job — run it first), does NOT allocate/cut a
//   number, does NOT read or reconcile the live registers (register-reconciler),
//   does NOT verify live/DB/deploy truth, and NEVER writes or commits.
//
// THE VERDICT CONTRACT
//   Native   : COMPOSED · CONCERNS · INCOMPLETE.
//   Normalized (CCF-02): COMPOSED->clean · CONCERNS->concerns · INCOMPLETE->block.
//   Precedence (fail-closed): INCOMPLETE > CONCERNS > COMPOSED.
//
// THE TRUST-KILLER — impossible by construction
//   A MALFORMED or PARTIAL pointer emitted as if canonical. Every missing/invalid
//   required fact (version format · title · verdict · >=1 result-doc link ·
//   next-gate · the additive-only affirmation) resolves to INCOMPLETE and the
//   composed text is WITHHELD — never a half-built pointer. A pointer that would
//   exceed the Convention-1 <=5-line budget is CONCERNS (trim), never silently
//   emitted as compliant.

import { readFileSync } from 'node:fs'; // READ-ONLY (only to load an --input payload); no write API imported
import { pathToFileURL } from 'node:url';

// ===========================================================================
// PURE CORE — no side effects, no fs write, no git, no clock. Injected facts in,
// structured result out. These are what the unit tests exercise.
// ===========================================================================

export const VERDICT = { COMPOSED: 'COMPOSED', CONCERNS: 'CONCERNS', INCOMPLETE: 'INCOMPLETE' };
export const NORMALIZED = { CLEAN: 'clean', CONCERNS: 'concerns', BLOCK: 'block' };
export const SEVERITY = { INFO: 'INFO', CONCERNS: 'CONCERNS', INCOMPLETE: 'INCOMPLETE' };
export const SCHEMA = 'ccf-04-register-pointer/v1';

// Convention-1 pointer budget: version · verdict · identity/hash · result-doc ·
// next-gate => the sync_state block body must stay within this many blockquote
// lines (header line + chained detail lines, excluding the trailing blank ">").
export const POINTER_LINE_BUDGET = 5;
const DEFAULT_GLYPH = '🧾';

export function normalizedVerdict(native) {
  if (native === VERDICT.COMPOSED) return NORMALIZED.CLEAN;
  if (native === VERDICT.CONCERNS) return NORMALIZED.CONCERNS;
  return NORMALIZED.BLOCK; // INCOMPLETE + anything unexpected -> fail-closed block
}

// --- deterministic canonical JSON (stable key ordering) --------------------
export function stableStringify(value) {
  const seen = new WeakSet();
  const walk = (v) => {
    if (v === null || typeof v !== 'object') return v;
    if (seen.has(v)) return '[Circular]';
    seen.add(v);
    if (Array.isArray(v)) return v.map(walk);
    const out = {};
    for (const k of Object.keys(v).sort()) out[k] = walk(v[k]);
    return out;
  };
  return JSON.stringify(walk(value), null, 2);
}

const VERSION_RE = /^v\d+\.\d+$/;
const RESULT_DOC_RE = /^docs\/briefs\/results\/[^\s/]+\.md$/;

function isNonEmptyString(v) { return typeof v === 'string' && v.trim() !== ''; }

// Validate the injected facts. Returns { ok, errors:[{field,msg}] }.
export function validateInputs(req) {
  const errors = [];
  const bad = (field, msg) => errors.push({ field, msg });
  if (!req || typeof req !== 'object' || Array.isArray(req)) {
    return { ok: false, errors: [{ field: 'request', msg: 'request is not a JSON object' }] };
  }
  if (!isNonEmptyString(req.version)) bad('version', 'required non-empty string');
  else if (!VERSION_RE.test(req.version.trim())) bad('version', `must match vMAJOR.MINOR (got ${JSON.stringify(req.version)}); run claim-stub to propose it`);
  if (!isNonEmptyString(req.title)) bad('title', 'required non-empty string (the pointer headline)');
  if (!isNonEmptyString(req.date)) bad('date', 'required non-empty string (the action_list marker date — never fabricated; supply it)');
  if (!isNonEmptyString(req.verdict)) bad('verdict', 'required non-empty string (the lane outcome)');
  if (!isNonEmptyString(req.nextGate)) bad('nextGate', 'required non-empty string (next gate / queue impact)');
  // Convention 1: the result doc is the canonical record — at least one is required.
  const docs = Array.isArray(req.resultDocs) ? req.resultDocs.filter(isNonEmptyString) : [];
  if (docs.length === 0) bad('resultDocs', 'required — at least one result-doc path (Convention 1: the result doc is the canonical lane record)');
  // The additive-only affirmation must be an explicit true — a register cut never
  // rewrites history; refuse to compose a pointer that does not affirm it.
  if (req.additive !== true) bad('additive', 'must be explicitly true — a register cut is ADDITIVE ONLY (no history rewrite); the tool refuses to compose a non-additive pointer');
  return { ok: errors.length === 0, errors };
}

// Compose the sync_state blockquote pointer block (array of lines). PURE.
export function composeSyncStateBlock(req) {
  const glyph = isNonEmptyString(req.glyph) ? req.glyph.trim() : DEFAULT_GLYPH;
  const docs = (req.resultDocs || []).filter(isNonEmptyString).map((d) => `\`${d.trim()}\``).join(' · ');
  const lines = [];
  lines.push(`> **${glyph} ${req.version.trim()} — ${req.title.trim()}** — records: ${docs}.`);
  lines.push(`> · **Verdict:** ${req.verdict.trim()}.`);
  if (isNonEmptyString(req.identity)) lines.push(`> · **Identity:** ${req.identity.trim()}.`);
  for (const d of (Array.isArray(req.details) ? req.details : [])) {
    if (isNonEmptyString(d)) lines.push(`> · ${d.trim().replace(/\.*$/, '')}.`);
  }
  lines.push(`> · **NEXT GATE:** ${req.nextGate.trim()}.`);
  return lines;
}

// The trailing blank blockquote line that closes a sync_state entry.
export function syncStateBlockText(req) {
  return composeSyncStateBlock(req).join('\n') + '\n>';
}

// Compose the single action_list `current marker` line. PURE.
export function composeActionListMarker(req) {
  const docs = (req.resultDocs || []).filter(isNonEmptyString).map((d) => `\`${d.trim()}\``).join(' · ');
  return `> Last updated: ${req.date.trim()} — **current marker ${req.version.trim()} — ${req.title.trim()}** — ` +
    `records: ${docs}. NEXT GATE: ${req.nextGate.trim()}.`;
}

// Count the SUBSTANTIVE pointer lines (header + chained "· " detail lines).
export function pointerLineCount(req) {
  return composeSyncStateBlock(req).length;
}

// ===========================================================================
// The assessment: facts in, composed pointer + verdict out. Deterministic + pure.
// Fail-closed: any missing/invalid required fact -> INCOMPLETE, text WITHHELD.
// ===========================================================================
export function computeResult(inputs) {
  const req = inputs || {};
  const findings = [];
  let seq = 0;
  const add = (code, severity, fields) => {
    seq += 1;
    findings.push({
      id: `RP-${String(seq).padStart(2, '0')}`,
      code, severity,
      field: fields.field ?? null,
      observed: fields.observed ?? null,
      whyItMatters: fields.whyItMatters,
      suggestedAction: fields.suggestedAction,
    });
  };

  const v = validateInputs(req);
  if (!v.ok) {
    for (const e of v.errors) {
      add('bad-input', SEVERITY.INCOMPLETE, {
        field: e.field,
        whyItMatters: `invalid/absent required fact: ${e.field} — ${e.msg}`,
        suggestedAction: 'supply every required fact; a malformed/partial pointer is NEVER emitted as canonical',
      });
    }
    return finalize(findings, req, { composed: null });
  }

  // Non-standard result-doc location: a CONCERNS nudge, not a block (a variant
  // path may be legitimate, but Convention 1 expects docs/briefs/results/*.md).
  for (const d of req.resultDocs.filter(isNonEmptyString)) {
    if (!RESULT_DOC_RE.test(d.trim())) {
      add('nonstandard-result-doc', SEVERITY.CONCERNS, {
        field: 'resultDocs', observed: d,
        whyItMatters: 'a result-doc link is not under docs/briefs/results/*.md — Convention 1 expects the canonical result-doc location',
        suggestedAction: 'confirm the path is the canonical result doc; fix it if it is a stray/relative link',
      });
    }
  }

  // Convention-1 <=5-line budget on the sync_state block body.
  const lineCount = pointerLineCount(req);
  if (lineCount > POINTER_LINE_BUDGET) {
    add('overlong-pointer', SEVERITY.CONCERNS, {
      field: 'details', observed: `${lineCount} lines`,
      whyItMatters: `the sync_state pointer body is ${lineCount} lines, over the Convention-1 <=${POINTER_LINE_BUDGET}-line budget (version · verdict · identity · result-doc · next-gate)`,
      suggestedAction: 'trim extra detail lines — long facts belong in the result doc, not the register pointer',
    });
  }

  // Honest INFO reminders (never change the verdict).
  add('propose-only', SEVERITY.INFO, {
    whyItMatters: 'this composes pointer TEXT only — the HUMAN writes + commits it; nothing is allocated or written',
    suggestedAction: 'run claim-stub first to confirm the version is free; run register-reconciler before the cut; keep the edit additive (no history rewrite)',
  });

  return finalize(findings, req, { composed: {
    syncStateBlock: syncStateBlockText(req),
    actionListMarker: composeActionListMarker(req),
    pointerLineCount: lineCount,
  } });
}

// Roll findings into a native verdict (INCOMPLETE > CONCERNS > COMPOSED), then
// normalize. On any non-COMPOSED-blocking verdict the composed text is withheld.
function finalize(findings, req, ctx) {
  const has = (sev) => findings.some((f) => f.severity === sev);
  let verdict = VERDICT.COMPOSED;
  if (has(SEVERITY.INCOMPLETE)) verdict = VERDICT.INCOMPLETE;
  else if (has(SEVERITY.CONCERNS)) verdict = VERDICT.CONCERNS;

  // INCOMPLETE withholds the text entirely (never a partial/malformed pointer).
  // CONCERNS still emits the composed text (it is well-formed, just needs a human
  // trim / path confirmation) — the human decides whether to paste as-is.
  const composed = verdict === VERDICT.INCOMPLETE ? null : ctx.composed;

  return {
    schema: SCHEMA,
    mode: 'propose-only-zero-write',
    verdict,
    normalized: normalizedVerdict(verdict),
    composed,
    findings,
  };
}

// ---------------------------------------------------------------------------
// Report renderer — deterministic string from a result. No I/O.
// ---------------------------------------------------------------------------
export function renderReport(result) {
  const L = [];
  L.push('=== CCF-04 Register Pointer Template (PROPOSE-ONLY · composes text · writes nothing) ===');
  L.push('');
  if (result.composed) {
    L.push('--- sync_state pointer block (the HUMAN pastes + commits this) ---');
    L.push(result.composed.syncStateBlock);
    L.push('');
    L.push('--- action_list current marker (replace the prior marker line) ---');
    L.push(result.composed.actionListMarker);
    L.push('');
    L.push(`(sync_state pointer body: ${result.composed.pointerLineCount} line(s); Convention-1 budget <=${POINTER_LINE_BUDGET})`);
  } else {
    L.push('--- NO pointer composed (fail-closed) — see findings; a partial pointer is never emitted ---');
  }
  L.push('');
  L.push('--- FINDINGS (each is a HUMAN DECISION — this tool resolves nothing) ---');
  if (result.findings.length === 0) {
    L.push('  (no findings)');
  } else {
    for (const f of result.findings) {
      L.push(`  [${f.severity}] ${f.id} (${f.code})${f.field ? ` {${f.field}}` : ''}`);
      L.push(`      why : ${f.whyItMatters}`);
      L.push(`      do  : ${f.suggestedAction}`);
    }
  }
  L.push('');
  L.push(`VERDICT : ${result.verdict}  (normalized: ${result.normalized})`);
  L.push('Advisory only; no register written, no version allocated. You decide.');
  L.push('=========================================================================================');
  return L.join('\n');
}

export function renderJson(result) { return stableStringify(result); }

// ===========================================================================
// THIN main() — loads injected facts (--json inline / --input file), calls the
// pure core, prints the report. Runs ONLY on direct invocation. NEVER writes a
// file. FAIL-CLOSED throughout.
// ===========================================================================
function argValue(argv, flag) {
  const i = argv.indexOf(flag);
  return (i === -1 || i + 1 >= argv.length) ? null : argv[i + 1];
}

const EXIT = { COMPOSED: 0, CONCERNS: 3, INCOMPLETE: 2 };

export function main(argv = process.argv.slice(2)) {
  let result;
  try {
    const jsonArg = argValue(argv, '--json');
    const inputPath = argValue(argv, '--input');
    let inputs;
    if (jsonArg) inputs = JSON.parse(jsonArg);
    else if (inputPath) inputs = JSON.parse(readFileSync(inputPath, 'utf-8'));
    else {
      process.stdout.write(
        'register-pointer: supply facts via --json \'<obj>\' or --input <file.json>.\n' +
        'Required: version (vMAJOR.MINOR) · title · date · verdict · resultDocs[] · nextGate · additive:true.\n' +
        'Optional: glyph · identity · details[].\n');
      process.exitCode = 2;
      return;
    }
    result = computeResult(inputs);
    const format = argValue(argv, '--format') || 'text';
    process.stdout.write((format === 'json' ? renderJson(result) : renderReport(result)) + '\n');
  } catch (e) {
    // Final fail-closed net: any error -> INCOMPLETE, never a clean-sounding pointer.
    const fallback = computeResult({ _error: e.message });
    process.stdout.write(renderReport(fallback) + '\n');
    process.stdout.write(`(fail-closed: ${e.message})\n`);
    process.exitCode = EXIT.INCOMPLETE;
    return;
  }
  process.exitCode = EXIT[result.verdict] ?? EXIT.INCOMPLETE;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main();
}
