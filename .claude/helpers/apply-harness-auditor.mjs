// apply-harness-auditor.mjs — CCF-04 zero-authority advisory analyzer.
//
// PURPOSE
//   Mechanically inspect an ICE "apply packet" (a markdown file describing a
//   production DML/DDL apply with a safety harness) and flag every place where
//   the packet DECLARES a protection that its executable SQL does not actually
//   enforce. It exists to catch the failure class where a named STOP condition
//   is only a comment, a BEGIN/COMMIT is assumed to compose across a pooled
//   channel that splits it, or an assertion's required baseline input is missing.
//
// WHAT IT IS (charter: docs/briefs/ccf-04-mechanical-assistants-charter.md)
//   Zero-authority, purely READ-ONLY, ADVISORY. It removes the manual toil of
//   hand-checking harness-claim <-> SQL fidelity WITHOUT removing judgment: it
//   never approves an apply, never judges business/payload correctness, never
//   judges architecture, and never replaces db-rls-auditor. Every finding is
//   advisory input to the human gates above it.
//
//   It mirrors the PROVEN shape of source-truth-check.mjs: exported pure-core
//   functions (deterministic, unit-testable without any external dependency)
//   driven by a thin main() that runs only on direct invocation, FAIL-CLOSED.
//
// FAIL-CLOSED POSTURE
//   Any internal/parse error => verdict INCOMPLETE (never a fabricated PASS)
//   plus a non-zero exit. An unassessable harness is never routed as clean.
//
// OUT OF SCOPE (the crux — it must NOT judge)
//   - payload / business-decision correctness (are the numbers right?)
//   - migration architecture / whether DDL is well designed
//   - RLS / privilege / grant safety (a db-rls-auditor handoff)
//   - whether production should be mutated / whether a gate passes
//   - whether an assertion expresses the RIGHT invariant (only whether a
//     declared control is mechanically present and internally complete)
//   - any live/DB/deploy/git truth (read-only static text only)
//
// NO fs WRITE anywhere. The ONLY fs use is reading the input file in main().
// NO network. NO child process. NO git.

import { readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

// ===========================================================================
// PURE CORE — no side effects, no fs, no network. These are what tests exercise.
// ===========================================================================

export const SEVERITY = { HIGH: 'high', MEDIUM: 'medium', LOW: 'low' };
export const VERDICT = { PASS: 'PASS', CONCERNS: 'CONCERNS', INCOMPLETE: 'INCOMPLETE' };

// --- tiny generic utilities ------------------------------------------------

function splitLines(text) {
  return String(text).split(/\r?\n/);
}

function escapeRegExp(s) {
  return String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

const UUID_RE =
  /\b[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}\b/g;

// A control-name token: caps-led, with at least one digit OR a hyphen, so it
// looks like an assertion/STOP id (A1, A3c, G-ATOMIC, A-DRIFT, R0) and not an
// ordinary SQL keyword or English word. Generic — derives NOTHING from any
// specific packet.
function isControlToken(raw) {
  if (typeof raw !== 'string') return false;
  const t = raw.trim();
  if (t.length < 2 || t.length > 24) return false;
  if (!/^[A-Z][A-Za-z0-9-]*$/.test(t)) return false;
  const hasDigit = /[0-9]/.test(t);
  const hasHyphen = /-/.test(t);
  if (!hasDigit && !hasHyphen) return false;
  // exclude obvious non-controls that could otherwise slip through
  const BANNED = new Set(['UTF-8', 'ISO-8601', 'SHA-256', 'SHA-1', 'BASE-64']);
  if (BANNED.has(t.toUpperCase())) return false;
  return true;
}

// A stricter shape for an EXECUTABLE-ASSERTION / STOP id, used when extracting
// DECLARED controls. It rejects tokens that structurally look like
// option/finding ids or PostgreSQL error codes so that a packet merely
// DISCUSSING a prior finding (M-1), an option (O-4), a session/probe (S1/P3)
// or a SQLSTATE (P0001) is never mistaken for a DECLARED control. Generic.
function isAssertionId(raw) {
  if (!isControlToken(raw)) return false;
  const t = raw.trim();
  if (/^[A-Z]-\d+$/.test(t)) return false; // option/finding ids: O-4, M-1, S-1, Q-4
  if (/\d{4,}/.test(t)) return false; // SQLSTATE-like codes: P0001, 23505
  if (/^[A-Z0-9]{5}$/.test(t) && /\d/.test(t)) return false; // 5-char alnum code with a digit
  // A hyphen followed by a LOWERCASE letter marks a descriptive adjective
  // (PK-directed, S5-proposed, PK-approved), never a control id. Real hyphenated
  // control ids keep their second segment uppercase (A-DRIFT, G-ATOMIC, A-PROBE).
  if (/-[a-z]/.test(t)) return false;
  return true;
}

// Evidence / provenance language: a token cited near these words denotes a
// session, probe, or proof — not a runtime control the harness enforces.
const EVIDENCE_CONTEXT =
  /\b(proven|proved|proves|proving|probe[ds]?|session|witness(?:ed)?|\blive\b|proof|evidence|discovered|recorded|authored|cited)\b/i;

// ---------------------------------------------------------------------------
// PARSER — turn packet text into a structured, generic model.
// ---------------------------------------------------------------------------

function parseSections(lines) {
  const secs = [];
  for (let i = 0; i < lines.length; i++) {
    const m = /^(#{1,6})\s+(.*\S)\s*$/.exec(lines[i]);
    if (m) secs.push({ level: m[1].length, title: m[2].trim(), headingLine: i + 1 });
  }
  return secs;
}

function sectionForLine(sections, lineNo) {
  let best = null;
  for (const s of sections) {
    if (s.headingLine <= lineNo && (!best || s.headingLine > best.headingLine)) best = s;
  }
  return best ? best.title : '(preamble)';
}

// Fenced code blocks. Anything fenced ```sql, OR a fence whose content clearly
// contains SQL, is treated as executable SQL. Line numbers are ABSOLUTE
// (1-based, matching the source file) so findings can cite them.
function parseSqlBlocks(lines) {
  const blocks = [];
  let inFence = false;
  let lang = '';
  let buf = [];
  let openLine = 0;
  for (let i = 0; i < lines.length; i++) {
    const fm = /^\s*```(\w*)\s*$/.exec(lines[i]);
    if (fm) {
      if (!inFence) {
        inFence = true;
        lang = (fm[1] || '').toLowerCase();
        buf = [];
        openLine = i + 1;
      } else {
        // closing fence
        const code = buf.map((x) => x.text).join('\n');
        const looksSql =
          lang === 'sql' ||
          /\b(BEGIN|COMMIT|ROLLBACK|SELECT|INSERT|UPDATE|DELETE|CREATE\s+TEMP|DO\s+\$\$|RAISE\s+EXCEPTION|GET\s+DIAGNOSTICS)\b/i.test(
            code,
          );
        if (looksSql) {
          blocks.push({
            startLine: openLine + 1,
            endLine: i,
            code,
            codeLines: buf.slice(),
          });
        }
        inFence = false;
        lang = '';
        buf = [];
      }
      continue;
    }
    if (inFence) buf.push({ lineNo: i + 1, text: lines[i] });
  }
  return blocks;
}

// PL/pgSQL DO $$ ... $$; blocks, found inside the SQL blocks. Each carries the
// mechanical flags the checks need. Line numbers absolute.
function parseDoBlocks(sqlBlocks) {
  const out = [];
  for (const b of sqlBlocks) {
    const L = b.codeLines;
    let i = 0;
    while (i < L.length) {
      if (/\bDO\s+\$[A-Za-z0-9_]*\$/.test(L[i].text)) {
        const body = [];
        let j = i;
        for (; j < L.length; j++) {
          body.push(L[j]);
          const isOneLiner = j === i && /\bDO\s+\$[A-Za-z0-9_]*\$[\s\S]*\$[A-Za-z0-9_]*\$\s*;/.test(L[j].text);
          const isEnd = j > i && /\$[A-Za-z0-9_]*\$\s*;/.test(L[j].text);
          if (isOneLiner || isEnd) break;
        }
        const code = body.map((x) => x.text).join('\n');
        out.push({
          startLine: body[0].lineNo,
          endLine: body[body.length - 1].lineNo,
          code,
          hasRaiseException: /\bRAISE\s+EXCEPTION\b/i.test(code),
          hasRaiseNotice: /\bRAISE\s+NOTICE\b/i.test(code),
          hasGetDiagRowcount: /\bGET\s+DIAGNOSTICS\b[^;]*\bROW_COUNT\b/i.test(code),
          hasExceptionHandler: /\bEXCEPTION\s+WHEN\b/i.test(code),
          hasBareRaise: /\bRAISE\s*;/i.test(code),
        });
        i = j + 1;
      } else {
        i++;
      }
    }
  }
  return out;
}

function parseSqlComments(sqlBlocks) {
  const comments = [];
  for (const b of sqlBlocks) {
    for (const cl of b.codeLines) {
      const m = /--\s?(.*\S)?\s*$/.exec(cl.text);
      // only treat as a comment line when -- starts the trimmed line or follows
      // code + whitespace; we keep it simple: any -- with trailing text.
      if (m && /(^|\s)--/.test(cl.text)) {
        const idx = cl.text.indexOf('--');
        const text = cl.text.slice(idx + 2).trim();
        if (text) comments.push({ lineNo: cl.lineNo, text });
      }
    }
  }
  return comments;
}

// Markdown tables. Returns [{headerCells, rows:[[cells...]], headerLine}].
function parseTables(lines) {
  const tables = [];
  let i = 0;
  while (i < lines.length) {
    const isRow = (s) => /^\s*\|.*\|\s*$/.test(s);
    if (isRow(lines[i]) && i + 1 < lines.length && /^\s*\|?[\s:|-]+\|?\s*$/.test(lines[i + 1]) && lines[i + 1].includes('-')) {
      const headerLine = i + 1;
      const cells = (s) =>
        s.trim().replace(/^\|/, '').replace(/\|$/, '').split('|').map((c) => c.trim());
      const headerCells = cells(lines[i]);
      const rows = [];
      let j = i + 2;
      const rowLineNos = [];
      while (j < lines.length && isRow(lines[j])) {
        rows.push(cells(lines[j]));
        rowLineNos.push(j + 1);
        j++;
      }
      tables.push({ headerCells, rows, rowLineNos, headerLine });
      i = j;
    } else {
      i++;
    }
  }
  return tables;
}

// Strip markdown emphasis / code ticks from a cell to get a bare token.
function bareCell(c) {
  return String(c).replace(/[`*_]/g, '').trim();
}

// Named controls are extracted ONLY from STRUCTURALLY CREDIBLE control sources,
// never from arbitrary narrative prose. This is the difference between a packet
// DECLARING an executable control named X and a packet merely DISCUSSING a prior
// finding / option / SQLSTATE that happens to look token-like. The credible
// sources are:
//   (A) a genuine assertion/control REGISTER table — a table whose header has
//       BOTH a name column (assert/stop/control/guard) AND an enforcement/
//       expected/status mapping column (this excludes defect-history tables);
//   (B) an explicitly-labelled STOP register — a section titled with STOP, or an
//       inline "STOP conditions" label — and only tokens WITHIN that block;
//   (C) machine-recognisable executable control declarations — a token used as a
//       RAISE EXCEPTION message prefix (an actual guard name in the SQL).
// A stricter id shape (isAssertionId) additionally rejects option/finding ids
// (O-4, M-1, S-1) and SQLSTATE codes (P0001) even inside a credible block.
function parseNamedControls(lines, sections, tables, sqlLines) {
  const controls = new Map(); // name -> {name, origin, section, line}
  const add = (name, origin, line) => {
    if (!controls.has(name)) {
      controls.set(name, { name, origin, line, section: sectionForLine(sections, line) });
    }
  };

  // (A) genuine assertion/control register table
  const registerTables = [];
  for (const t of tables) {
    const hdr = t.headerCells.map((h) => h.toLowerCase());
    const nameCol = hdr.some((h) => /assert|\bstop\b|control|guard/.test(h));
    const mapCol = hdr.some((h) => /enforc|expected|\bwhere\b|status|\bcheck\b|origin/.test(h));
    if (nameCol && mapCol) {
      registerTables.push(t);
      for (let r = 0; r < t.rows.length; r++) {
        const first = bareCell(t.rows[r][0] || '');
        if (isAssertionId(first)) add(first, 'assertion register', t.rowLineNos[r]);
      }
    }
  }

  // (B) explicitly-labelled STOP register — scoped to the block, not the packet.
  const stopBlocks = [];
  const bySection = [...sections].sort((a, b) => a.headingLine - b.headingLine);
  for (let si = 0; si < bySection.length; si++) {
    if (/\bstop\b/i.test(bySection[si].title)) {
      const start = bySection[si].headingLine;
      const next = bySection.find((s) => s.headingLine > start);
      stopBlocks.push([start, next ? next.headingLine - 1 : lines.length]);
    }
  }
  for (let i = 0; i < lines.length; i++) {
    // an inline "STOP conditions" label (not a heading) opens a small block
    if (!/^\s*#{1,6}\s/.test(lines[i]) && /\bstop\b[\s\S]{0,20}condition/i.test(lines[i])) {
      stopBlocks.push([i + 1, Math.min(lines.length, i + 6)]);
    }
  }
  for (const [s, e] of stopBlocks) {
    for (let i = s - 1; i < e && i < lines.length; i++) {
      // an evidence/provenance line inside a STOP block cites a session/probe/
      // proof, not a runtime control — do not harvest control tokens from it.
      if (EVIDENCE_CONTEXT.test(lines[i])) continue;
      const toks = (lines[i].match(/[A-Z][A-Za-z0-9-]{1,23}/g) || []).map((x) => x.replace(/[.,;:]$/, ''));
      for (const tok of toks) if (isAssertionId(tok)) add(tok, 'declared STOP register', i + 1);
    }
  }

  // (C) machine-recognisable executable guard declarations (RAISE prefixes).
  for (const l of sqlLines || []) {
    const m = /RAISE\s+EXCEPTION\s+'([A-Z][A-Za-z0-9-]{1,23})\b/i.exec(l.text);
    if (m && isAssertionId(m[1])) add(m[1], 'executable guard', l.lineNo);
  }

  return { controls: [...controls.values()], registerTables };
}

// Execution-channel detection: is a single-call / single-session channel NAMED?
function parseChannel(lines, tables) {
  const text = lines.join('\n');
  const patterns = [
    /sanctioned\s+channel/i,
    /single[-\s](?:call|execution|session)/i,
    /\bone\s+call\b/i,
    /as\s+one\s+file\b/i,
    /whole\s+script[\s\S]{0,60}?once\b/i,
    /submit[\s\S]{0,60}?as\s+a\s+single/i,
    /entire\s+(?:script|block)[\s\S]{0,40}?single/i,
    /single[\s\S]{0,40}?execution/i,
    // psql single-file / single-transaction invocations are one session, one txn
    /\bpsql\b[^\n]*\s-f\b/i,
    /--single-transaction\b/i,
    /\bpsql\b[^\n]*\bON_ERROR_STOP\b/i,
    // "run/execute as one file" or "as one invocation"
    /\b(?:run|execute[d]?|submit(?:ted)?)\b[\s\S]{0,40}?\bas\s+one\s+(?:file|invocation)\b/i,
    /\bone\s+invocation\b/i,
  ];
  let line = null;
  for (let i = 0; i < lines.length; i++) {
    if (patterns.some((p) => p.test(lines[i]))) {
      line = i + 1;
      break;
    }
  }
  // a table whose header mentions "channel" also counts
  let channelTable = false;
  for (const t of tables) {
    if (t.headerCells.some((h) => /channel/i.test(h))) {
      channelTable = true;
      if (line === null) line = t.headerLine;
    }
  }
  const named = line !== null || channelTable || patterns.some((p) => p.test(text));
  return { named, line };
}

function parseUuidGroups(lines, sections) {
  const groups = [];
  let cur = null;
  for (let i = 0; i < lines.length; i++) {
    const found = lines[i].match(UUID_RE);
    if (found && found.length) {
      if (!cur) {
        cur = {
          startLine: i + 1,
          endLine: i + 1,
          uuids: [],
          contextLines: lines.slice(Math.max(0, i - 3), i).join(' '),
          section: sectionForLine(sections, i + 1),
        };
      }
      cur.endLine = i + 1;
      for (const u of found) cur.uuids.push(u.toLowerCase());
    } else if (cur && lines[i].trim() === '') {
      // blank line ends a contiguous group only if the next non-blank has no uuid
      // (keep simple: a single blank line does not end the group)
    } else if (cur) {
      groups.push(cur);
      cur = null;
    }
  }
  if (cur) groups.push(cur);
  return groups;
}

// Baselines = snapshot relations the packet captures to compare against. Each is
// modelled by its DATA SCOPE, not by proximity to an assertion:
//   kind 'FULL'     — snapshots a relation with no categorical scope filter
//                     (an in-transaction full-table snapshot is a VALID baseline
//                     that covers every scope);
//   kind 'FILTERED' — snapshots only rows matching `col IN (...)` / `col = 'v'`
//                     (records col + the included value set).
// A snapshot is recognised as a CREATE TEMP TABLE ... AS SELECT ... FROM <rel>,
// or a SELECT ... FROM <rel> introduced by baseline/snapshot/pre-apply language.
function parseBaselines(sqlBlocks) {
  const baselines = [];
  for (const b of sqlBlocks) {
    const L = b.codeLines;
    for (let i = 0; i < L.length; i++) {
      const createM = /\bCREATE\s+TEMP\s+TABLE\s+(\w+)/i.exec(L[i].text);
      const ctxBefore = L.slice(Math.max(0, i - 2), i).map((x) => x.text).join(' ');
      const proseIntro =
        /\bSELECT\b/i.test(L[i].text) && /\bbaseline\b|\bsnapshot\b|pre-?apply|before-?image/i.test(ctxBefore);
      if (!createM && !proseIntro) continue;

      // accumulate the statement to its terminating ';'
      const stmt = [];
      let j = i;
      for (; j < L.length; j++) {
        stmt.push(L[j].text);
        if (/;/.test(L[j].text)) break;
      }
      const text = stmt.join('\n');
      // only a relation snapshot qualifies (must SELECT FROM a relation)
      if (!/\bSELECT\b/i.test(text) || !/\bFROM\b/i.test(text)) {
        i = j;
        continue;
      }
      const name = createM ? createM[1] : null;

      // classify the data scope
      let kind = 'FULL';
      let col = null;
      let values = null;
      const inM = /\bWHERE\b[\s\S]*?(\b\w+)\s+IN\s*\(([^)]*)\)/i.exec(text);
      const eqM = /\bWHERE\b[\s\S]*?(\b\w+)\s*=\s*'([^']+)'/i.exec(text);
      if (inM) {
        const vals = (inM[2].match(/'([^']*)'/g) || []).map((s) => s.replace(/'/g, ''));
        if (vals.length) {
          kind = 'FILTERED';
          col = inM[1];
          values = new Set(vals);
        }
      } else if (eqM && !/\b(is_current|true|false)\b/i.test(eqM[0])) {
        // a categorical equality scope (not a boolean state filter)
        kind = 'FILTERED';
        col = eqM[1];
        values = new Set([eqM[2]]);
      }
      baselines.push({ name, kind, col, values, line: L[i].lineNo });
      i = j;
    }
  }
  return baselines;
}

// Executable assertions that compare current state against a baseline, linked to
// their baseline BY NAME (the real data dependency) — never by nearest query.
// Each records the baseline name(s) it references and the categorical scope
// value(s) it evaluates (`col = 'v'`, excluding boolean state predicates).
function parseBaselineAssertions(doBlocks, baselines) {
  const names = baselines.map((b) => b.name).filter(Boolean);
  const out = [];
  for (const d of doBlocks) {
    const baselineNames = names.filter((n) => new RegExp('\\b' + escapeRegExp(n) + '\\b').test(d.code));
    const generic = /\bbaseline\b|\bsnapshot\b|pre-?apply|before-?image/i.test(d.code);
    if (baselineNames.length === 0 && !generic) continue;
    const values = [];
    let col = null;
    const re = /(\b\w+)\s*=\s*'([^']+)'/gi;
    let m;
    while ((m = re.exec(d.code)) !== null) {
      if (/\b(is_current|true|false)\b/i.test(m[0])) continue;
      col = m[1];
      values.push(m[2]);
    }
    out.push({ baselineNames, generic, col, values: [...new Set(values)], startLine: d.startLine, endLine: d.endLine });
  }
  return out;
}

// Baseline-comparison language shared by comment-only and register-declared
// non-regression assertions ("identical to the pre-apply snapshot", "verify X
// unchanged vs pre-image", "vs the baseline").
const BASE_CMP =
  /\b(identical|unchanged|untouched|no\s+(?:difference|change)|match(?:es)?|\bsame\b|compared?|byte-?identical|restore[sd]?)\b/i;
const BASE_TERM = /\b(baseline|snapshot|pre-?apply|pre-?image|before-?image)\b/i;
const BASE_VS = /\b(vs|versus|against)\b[\s\S]{0,30}?(baseline|snapshot|pre-?apply|pre-?image)/i;
function isBaselineComparisonText(t) {
  return (BASE_CMP.test(t) && BASE_TERM.test(t)) || BASE_VS.test(t);
}
// A NON-REGRESSION assertion protects an entity from change. It NAMES the entity
// it protects — often as unquoted prose ("<Entity> untouched", "<Entity> must
// not change"). Detected separately from the baseline-comparison phrasing so a
// pre-image is not required in the sentence itself.
const NONREG =
  /\b(untouched|unchanged|unaffected|not\s+(?:being\s+)?(?:modified|changed|touched)|must\s+not\s+change|no\s+change|left\s+alone|preserved|remains?\s+the\s+same|stays?\s+the\s+same|\bintact\b)\b/i;
function isNonRegressionText(t) {
  return isBaselineComparisonText(t) || NONREG.test(t);
}
function scopeLiterals(t) {
  return (t.match(/'([^']+)'/g) || []).map((s) => s.replace(/'/g, ''));
}
// Common words that must never be treated as a protected ENTITY even if they
// happen to appear as a data value somewhere. Generic, domain-agnostic.
const SCOPE_STOPWORDS = new Set([
  'the', 'and', 'or', 'vs', 'its', 'is', 'are', 'a', 'an', 'to', 'of', 'in', 'on', 'by', 'for',
  'row', 'rows', 'region', 'regions', 'platform', 'platforms', 'table', 'data', 'state', 'mix',
  'apply', 'current', 'value', 'values', 'count', 'all', 'each', 'snapshot', 'baseline', 'preimage',
  'unchanged', 'untouched', 'unaffected', 'identical', 'same', 'change', 'changed', 'modified',
  'true', 'false', 'null', 'set', 'this', 'that', 'not', 'must', 'else', 'with', 'from', 'into',
]);
const SIMPLE_TOKEN = /^[A-Za-z][A-Za-z0-9_-]{1,38}$/;

// Corroborated domain/partition values: the value set of the mutated relation as
// evidenced by the packet itself. A prose-named entity is only accepted as a
// real scope if it appears here — this is the false-positive ground so arbitrary
// capitalized narrative nouns are never grabbed. Sources: quoted SQL literals
// (WHERE IN / = '…' / VALUES), baseline filter values, and the cells of
// NON-control-register data/summary tables.
function parseDomainValues(sqlText, baselines, tables) {
  const vals = new Set();
  const addTok = (raw) => {
    const t = String(raw).trim();
    if (SIMPLE_TOKEN.test(t) && !/^\d+$/.test(t)) vals.add(t.toLowerCase());
  };
  for (const q of sqlText.match(/'([^']*)'/g) || []) addTok(q.replace(/'/g, ''));
  for (const b of baselines) if (b.values) for (const v of b.values) addTok(v);
  for (const t of tables) {
    const hdr = t.headerCells.map((h) => h.toLowerCase());
    const isControlReg =
      hdr.some((h) => /assert|\bstop\b|control|guard/.test(h)) &&
      hdr.some((h) => /enforc|expected|\bwhere\b|status|\bcheck\b|origin/.test(h));
    if (isControlReg) continue; // don't mine control-register ids as domain values
    for (const row of t.rows) for (const cell of row) addTok(bareCell(cell));
  }
  return vals;
}

// Comment-only assertions that CLAIM a baseline comparison — detected so a
// needed-but-absent baseline is flagged even when no executable DO block exists.
function parseBaselineClaimComments(sqlComments) {
  const out = [];
  for (const c of sqlComments) {
    if (isBaselineComparisonText(c.text)) {
      const q = scopeLiterals(c.text);
      out.push({ lineNo: c.lineNo, value: q.length ? q[0] : null, text: c.text });
    }
  }
  return out;
}

// Unified list of assertions that evaluate a specific SCOPE against a pre-image,
// from ALL sources — executable DO blocks, comment non-regression claims, and
// register-declared non-regression rows. For prose (comment/register) claims the
// scope may be a QUOTED literal OR an unquoted entity name, but an unquoted name
// is accepted ONLY when it is a CORROBORATED domain/partition value (in
// domainValues) — this grounds the extraction against arbitrary proper nouns.
// Each entry: {col|null, value, kind, location, line}. Check 6 measures COVERAGE
// against this list.
function parseScopeAssertions(baselineAssertions, sqlComments, registerTables, domainValues) {
  const out = [];
  // grounded prose-entity words in a non-regression assertion's text
  const proseEntities = (text) => {
    const found = new Set();
    for (const w of text.match(/[A-Za-z][A-Za-z0-9_-]{1,38}/g) || []) {
      const lw = w.toLowerCase();
      if (SCOPE_STOPWORDS.has(lw)) continue;
      if (domainValues.has(lw)) found.add(lw);
    }
    return [...found];
  };

  // (1) executable comparisons: categorical scope predicates already parsed
  for (const a of baselineAssertions) {
    for (const v of a.values) {
      out.push({ col: a.col, value: v, kind: 'executable', line: a.startLine, location: `assertion DO block at lines ${a.startLine}-${a.endLine}` });
    }
  }
  // (2) comment non-regression claims: quoted literals + grounded prose entities
  for (const c of sqlComments) {
    if (!isNonRegressionText(c.text)) continue;
    const scopes = new Set([...scopeLiterals(c.text).map((v) => v.toLowerCase()), ...proseEntities(c.text)]);
    for (const v of scopes) out.push({ col: null, value: v, kind: 'comment', line: c.lineNo, location: `non-regression comment at line ${c.lineNo}` });
  }
  // (3) register-declared non-regression rows: quoted literals + grounded prose
  for (const t of registerTables) {
    for (let r = 0; r < t.rows.length; r++) {
      const rowText = t.rows[r].join(' ');
      if (!isNonRegressionText(rowText)) continue;
      const scopes = new Set([...scopeLiterals(rowText).map((v) => v.toLowerCase()), ...proseEntities(rowText)]);
      for (const v of scopes) out.push({ col: null, value: v, kind: 'register', line: t.rowLineNos[r], location: `assertion register row at line ${t.rowLineNos[r]}` });
    }
  }
  return out;
}

// A declared, ordered sequence of named steps: a numbered list under a heading
// mentioning sequence/steps/order that references control tokens.
function parseDeclaredSequence(lines, sections) {
  const seq = [];
  // find headings that look like a sequence
  const seqHeadings = sections.filter((s) => /\bsequence\b|\bsteps?\b|\border\b/i.test(s.title));
  for (const h of seqHeadings) {
    // scan from the heading to the next heading of same-or-higher level
    const next = sections
      .filter((s) => s.headingLine > h.headingLine)
      .sort((a, b) => a.headingLine - b.headingLine)[0];
    const end = next ? next.headingLine - 1 : lines.length;
    let order = 0;
    for (let i = h.headingLine; i < end; i++) {
      if (/^\s*\d+\.\s+/.test(lines[i])) {
        const toks = lines[i].match(/[A-Z][A-Za-z0-9-]{1,23}/g) || [];
        for (const raw of toks) {
          const tok = raw.replace(/[.,;:]$/, '');
          if (isAssertionId(tok)) {
            seq.push({ token: tok, order: order });
          }
        }
        order++;
      }
    }
  }
  return seq;
}

export function parsePacket(text) {
  const lines = splitLines(text);
  const sections = parseSections(lines);
  const tables = parseTables(lines);
  const sqlBlocks = parseSqlBlocks(lines);
  const sqlLines = sqlBlocks.flatMap((b) => b.codeLines);
  const sqlText = sqlBlocks.map((b) => b.code).join('\n');
  const doBlocks = parseDoBlocks(sqlBlocks);
  const sqlComments = parseSqlComments(sqlBlocks);
  const sqlRaiseLines = sqlLines.filter((l) => /\bRAISE\s+EXCEPTION\b/i.test(l.text)).map((l) => l.lineNo);
  const { controls, registerTables } = parseNamedControls(lines, sections, tables, sqlLines);
  const channel = parseChannel(lines, tables);
  const uuidGroups = parseUuidGroups(lines, sections);
  const baselines = parseBaselines(sqlBlocks);
  const baselineAssertions = parseBaselineAssertions(doBlocks, baselines);
  const baselineClaimComments = parseBaselineClaimComments(sqlComments);
  const domainValues = parseDomainValues(sqlText, baselines, tables);
  const scopeAssertions = parseScopeAssertions(baselineAssertions, sqlComments, registerTables, domainValues);
  const declaredSequence = parseDeclaredSequence(lines, sections);

  // transaction / atomicity signals
  const hasBegin = /\bBEGIN\s*;/i.test(sqlText) || /(^|\n)\s*BEGIN\b/i.test(sqlText);
  const hasCommit = /\bCOMMIT\s*;/i.test(sqlText) || /(^|\n)\s*COMMIT\b/i.test(sqlText);
  const anyBlockHasBoth = sqlBlocks.some(
    (b) => /\bBEGIN\b/i.test(b.code) && /\bCOMMIT\b/i.test(b.code),
  );
  const atomicityProse =
    /single[-\s]transaction|one\s+transaction|atomic(?:ity)?|as\s+one\s+(?:call|transaction)|single\s+call/i.test(
      lines.join('\n'),
    );
  const atomicityAsserted = (hasBegin && hasCommit) || atomicityProse;

  const multiCallProse =
    /statement[-\s]by[-\s]statement|one\s+statement\s+at\s+a\s+time|each\s+statement[\s\S]{0,40}?separate|across\s+(?:two|multiple|separate)\s+calls|separate\s+calls?\b|in\s+(?:a\s+)?different\s+call|BEGIN\s+in\s+one\s+call/i;
  // fragmentation as the METHOD, not as a forbidden thing: match the prose only
  // when it is NOT immediately negated by a forbid/never/must-not marker.
  let multiCall = false;
  let multiCallLine = null;
  for (let i = 0; i < lines.length; i++) {
    if (multiCallProse.test(lines[i])) {
      const negated = /\b(forbidden|forbid|never|must\s+not|do\s+not|prohibit|is\s+a\s+stop|not\s+permitted)\b/i.test(
        lines[i],
      );
      if (!negated) {
        multiCall = true;
        multiCallLine = i + 1;
        break;
      }
    }
  }
  const fragmentByFence = hasBegin && hasCommit && !anyBlockHasBoth;

  const xidGuardPresent = doBlocks.some(
    (d) => d.hasRaiseException && /pg_current_xact_id|txid_current/i.test(d.code),
  );

  const hasControlRegister = registerTables.length > 0 || controls.length > 0;

  return {
    text,
    lines,
    sections,
    tables,
    sqlBlocks,
    sqlLines,
    sqlText,
    doBlocks,
    sqlComments,
    sqlRaiseLines,
    namedControls: controls,
    registerTables,
    channel,
    uuidGroups,
    baselines,
    baselineAssertions,
    baselineClaimComments,
    domainValues,
    scopeAssertions,
    declaredSequence,
    hasBegin,
    hasCommit,
    fragmentByFence,
    multiCall,
    multiCallLine,
    xidGuardPresent,
    atomicityAsserted,
    hasControlRegister,
    sectionForLine: (n) => sectionForLine(sections, n),
  };
}

// ---------------------------------------------------------------------------
// FINDING factory
// ---------------------------------------------------------------------------

function mkFinding({
  checkId,
  seq,
  severity,
  packetSection,
  executableLocation,
  declaredControl,
  observedImplementation,
  consequence,
  recommendedAuthorAction,
  incompleteTrigger = false,
}) {
  const nn = String(checkId).padStart(2, '0');
  return {
    findingId: `AHA-${nn}-${seq}`,
    checkId,
    severity,
    packetSection,
    executableLocation,
    declaredControl,
    observedImplementation,
    consequence,
    recommendedAuthorAction,
    incompleteTrigger,
  };
}

// ===========================================================================
// THE TEN CHECKS — each a generic, independently-testable pure function that
// takes a parsed packet and returns an array of findings. Each is derived from
// the GENERIC failure-class definition, never from a specific packet.
// ===========================================================================

// 1 — Declared STOP / named assertion must have executable enforcement.
export function checkDeclaredStopEnforcement(p) {
  const findings = [];
  const raiseBlocks = p.doBlocks.filter((d) => d.hasRaiseException);
  let seq = 0;
  for (const ctrl of p.namedControls) {
    const re = new RegExp('\\b' + escapeRegExp(ctrl.name) + '\\b');
    const enforced =
      raiseBlocks.some((d) => re.test(d.code)) ||
      // a conditional/constraint carrying the name also counts as enforcement
      p.sqlLines.some((l) => re.test(l.text) && /\b(RAISE|CHECK|CONSTRAINT|IF)\b/i.test(l.text));
    if (!enforced) {
      seq += 1;
      findings.push(
        mkFinding({
          checkId: 1,
          seq,
          severity: SEVERITY.HIGH,
          packetSection: ctrl.section,
          executableLocation: `declared at packet line ${ctrl.line}; no matching executable construct in any SQL block`,
          declaredControl: `named control "${ctrl.name}" (source: ${ctrl.origin})`,
          observedImplementation: `"${ctrl.name}" appears only in prose/register; no DO/RAISE/conditional/constraint enforces it`,
          consequence:
            'the declared STOP is not enforced at runtime; the transaction can commit even when its condition is violated (declared-control-not-consulted, inside the harness)',
          recommendedAuthorAction: `add a DO $$ ... IF <cond> THEN RAISE EXCEPTION ... END IF; END $$; block (or a constraint) that enforces "${ctrl.name}", or drop the claim if it is not a real control`,
        }),
      );
    }
  }
  return findings;
}

// 2 — Comment/prose abort claim with no adjacent/enclosing RAISE or DO.
export function checkProseOnlyAbort(p) {
  const findings = [];
  let seq = 0;
  // Generic abort-intent detection, robust to paraphrase, but scoped to DIRECTIVE
  // abort tokens — imperative "abort/halt/cancel/bail", the VERB form "roll … back"
  // (two words), or an explicit "do/must not commit". A descriptive NOUN phrase
  // ("the rollback", "rollback depends on it", "the rollback in §6") is NOT an
  // abort directive, so bare one-word "rollback" and "stop" are deliberately
  // excluded (they are overwhelmingly nouns in these packets).
  const abortSyn =
    /(\babort\b|\bhalt\b|\bbail\b|\bcancel\b|\broll\s+(?:[a-z]+\s+){0,3}back\b|do not (?:commit|proceed|apply)|must not (?:commit|proceed))/i;
  const abortModal =
    /(\bmust\b|\belse\b|\bshould\b|\bwill\b|otherwise|if it (?:does not|fails|is not)|\bunless\b|\bshall\b|has to|needs? to)/i;
  // A bare-conditional abort ("abort if <cond>", "halt when <cond>") is also an
  // abort control: a DIRECTIVE abort token followed by a clear SUBORDINATING
  // conditional — "if" or "when" ONLY (never the loose "on"/"unless"). The
  // directive token must NOT be an article-led noun phrase ("the abort", "a
  // halt"), so descriptive narrative is not mistaken for a directive.
  const abortConditional =
    /(?<!\b(?:the|a|an|this|that|its|our|their)\s)\b(?:abort|halt|cancel|bail)\b[\s\S]{0,20}?\b(?:if|when)\b/i;
  const abortClaim = (t) => (abortSyn.test(t) && abortModal.test(t)) || abortConditional.test(t);
  for (const c of p.sqlComments) {
    if (!abortClaim(c.text)) continue;
    const nearRaise =
      p.sqlRaiseLines.some((ln) => Math.abs(ln - c.lineNo) <= 3) ||
      p.doBlocks.some((d) => d.hasRaiseException && c.lineNo >= d.startLine - 2 && c.lineNo <= d.endLine + 2);
    if (!nearRaise) {
      seq += 1;
      findings.push(
        mkFinding({
          checkId: 2,
          seq,
          severity: SEVERITY.HIGH,
          packetSection: p.sectionForLine(c.lineNo),
          executableLocation: `SQL comment at line ${c.lineNo}`,
          declaredControl: `abort/STOP claimed in a comment: "${c.text}"`,
          observedImplementation:
            'the abort is asserted in a comment only; no RAISE / DO block enforces it within ±3 lines',
          consequence: 'a comment is never enforcement — every statement commits regardless of the claimed abort',
          recommendedAuthorAction:
            'replace the comment with an executable DO $$ ... IF <cond> THEN RAISE EXCEPTION ... END IF; END $$; guard',
        }),
      );
    }
  }
  return findings;
}

// 3 — Stated expected row count without fail-closed enforcement. The claim is
//     caught whether it appears in a SQL comment OR in packet prose (a stated
//     count must be backed by GET DIAGNOSTICS ... ROW_COUNT + RAISE EXCEPTION).
export function checkRowCountFailClosed(p) {
  const findings = [];
  let seq = 0;
  const countClaim =
    /\b(?:exactly\s+)?(\d+)\s+rows?\b|report\s+exactly\s+(\d+)|\bmust\s+return\s+(\d+)\b|=\s*(\d+)\s+rows?|(?:affect|update|delete|insert|deactivate|touch)[a-z]*\s+(?:exactly\s+)?(\d+)\s+rows?/i;
  const expectationCue = /\b(exactly|must|expect(?:ed|s)?|report|return|else|should|shall|affect|update|delete|insert|deactivate)\b/i;
  const isCountExpectation = (t) => countClaim.test(t) && expectationCue.test(t);

  // (a) SQL comments — enforcement is checked by proximity to a fail-closed block
  for (const c of p.sqlComments) {
    if (!isCountExpectation(c.text)) continue;
    const enforced = p.doBlocks.some(
      (d) =>
        d.hasRaiseException &&
        (d.hasGetDiagRowcount || /\bcount\s*\(/i.test(d.code)) &&
        c.lineNo >= d.startLine - 8 &&
        c.lineNo <= d.endLine + 8,
    );
    if (!enforced) {
      seq += 1;
      findings.push(rowCountFinding(p, seq, c.lineNo, c.text, 'SQL comment'));
    }
  }

  // (b) packet prose (lines outside SQL fences) — a stated count with NO
  // fail-closed rowcount enforcement anywhere in the packet is unenforced.
  const sqlLineNos = new Set(p.sqlLines.map((l) => l.lineNo));
  const hasFailClosedRowcount = p.doBlocks.some((d) => d.hasRaiseException && d.hasGetDiagRowcount);
  if (!hasFailClosedRowcount) {
    for (let i = 0; i < p.lines.length; i++) {
      const lineNo = i + 1;
      if (sqlLineNos.has(lineNo)) continue; // prose only
      const t = p.lines[i];
      // skip markdown table rows, blockquotes and headings — those are register
      // cells / descriptions, not a narrative expected-count claim.
      if (/^\s*(\||>|#)/.test(t)) continue;
      if (!isCountExpectation(t)) continue;
      seq += 1;
      findings.push(rowCountFinding(p, seq, lineNo, t.trim(), 'prose'));
    }
  }
  return findings;
}

function rowCountFinding(p, seq, lineNo, text, where) {
  return mkFinding({
    checkId: 3,
    seq,
    severity: SEVERITY.HIGH,
    packetSection: p.sectionForLine(lineNo),
    executableLocation: `${where} at line ${lineNo}`,
    declaredControl: `expected row count stated in ${where}: "${text}"`,
    observedImplementation:
      'no GET DIAGNOSTICS ... ROW_COUNT (or count(*) INTO) + RAISE EXCEPTION backs the stated count',
    consequence:
      'the expected count is not fail-closed — a wrong row count (including the zero-rows catastrophe) commits with no error',
    recommendedAuthorAction:
      'capture the count with GET DIAGNOSTICS n = ROW_COUNT inside the mutating DO block and RAISE EXCEPTION when n <> expected',
  });
}

// 4 — Single-transaction atomicity asserted but no single-call channel NAMED.
export function checkTransactionChannelNamed(p) {
  const findings = [];
  if (p.atomicityAsserted && !p.channel.named) {
    findings.push(
      mkFinding({
        checkId: 4,
        seq: 1,
        severity: SEVERITY.HIGH,
        packetSection: '(execution control / channel)',
        executableLocation: p.hasBegin ? 'BEGIN ... COMMIT transaction present in SQL' : 'atomicity asserted in prose',
        declaredControl: 'single-transaction atomicity',
        observedImplementation:
          'the packet asserts single-transaction atomicity but names no single-call execution channel that provides it',
        consequence:
          'without a named single-call channel the transaction may be split across pooled backends; a BEGIN in one call and a COMMIT in another do not compose, so a partial apply can commit silently',
        recommendedAuthorAction:
          'name the exact sanctioned single-call/single-session execution channel (and make any other channel a STOP)',
        incompleteTrigger: true,
      }),
    );
  }
  return findings;
}

// 5 — Design assumes a multi-call transaction composes across pooled backends.
export function checkMultiCallTransaction(p) {
  const findings = [];
  const fragmentationRisk = p.fragmentByFence || p.multiCall;
  if (fragmentationRisk && !p.xidGuardPresent) {
    const loc = p.multiCall
      ? `multi-call execution described at line ${p.multiCallLine}`
      : 'BEGIN and COMMIT appear in separate SQL blocks (transaction spans execution units)';
    findings.push(
      mkFinding({
        checkId: 5,
        seq: 1,
        severity: SEVERITY.HIGH,
        packetSection: '(execution / transaction composition)',
        executableLocation: loc,
        declaredControl: 'single atomic transaction (BEGIN ... COMMIT)',
        observedImplementation:
          'the design assumes a BEGIN in one call and a COMMIT/dependent statement in another compose across separate (pooled) calls, and no in-transaction identity guard (e.g. an xid anchor via pg_current_xact_id) detects fragmentation',
        consequence:
          'each fragment autocommits on its own pooled backend; a partial apply commits and the intended atomicity is silently lost',
        recommendedAuthorAction:
          'submit the whole transaction through one named single-call channel AND add an xid anchor guard (record pg_current_xact_id() at step 0; RAISE EXCEPTION in each mutating step if the current xid differs)',
      }),
    );
  }
  return findings;
}

// 6 — Baseline COVERAGE. For every assertion that evaluates a specific SCOPE
//     (an entity / partition / platform / identity value), some baseline or
//     snapshot in the packet must actually PROVIDE that scope's pre-image data.
//       - a FULL-TABLE in-transaction snapshot covers ALL scopes;
//       - a FILTERED baseline covers ONLY its included value set;
//       - if NO baseline anywhere covers the assertion's evaluated scope → FIRE.
//     This is coverage, not exclusion, and it does not rely on the nearest
//     preceding query: a filtered baseline that legitimately omits an unaffected
//     entity is fine for its own purpose; the trigger is that the ASSERTION's
//     scope has no covering baseline. It applies whether the assertion is
//     executable, a comment, or a register-declared row.
export function checkBaselineScope(p) {
  const findings = [];
  let seq = 0;
  const hasFullSnapshot = p.baselines.some((b) => b.kind === 'FULL');

  // Does SOME baseline in the packet provide data for scope value v (on column
  // col, when known)? A full-table snapshot always does.
  const covered = (col, v) => {
    if (hasFullSnapshot) return true;
    const lv = String(v).toLowerCase();
    return p.baselines.some(
      (b) =>
        b.kind === 'FILTERED' &&
        b.values &&
        (!col || !b.col || b.col.toLowerCase() === col.toLowerCase()) &&
        [...b.values].some((x) => String(x).toLowerCase() === lv),
    );
  };

  const emitted = new Set(); // dedupe a scope value across executable/comment/register sources
  for (const a of p.scopeAssertions) {
    if (covered(a.col, a.value)) continue;
    const key = String(a.value).toLowerCase();
    if (emitted.has(key)) continue;
    emitted.add(key);
    seq += 1;
    const filteredScopes = p.baselines
      .filter((b) => b.kind === 'FILTERED' && b.values)
      .map((b) => `"${b.name || 'snapshot'}"(${b.col} IN ${[...b.values].map((x) => `'${x}'`).join(',')})`);
    findings.push(
      mkFinding({
        checkId: 6,
        seq,
        severity: SEVERITY.MEDIUM,
        packetSection: p.sectionForLine(a.line),
        executableLocation: `${a.location} (${a.kind} assertion)`,
        declaredControl: `non-regression assertion evaluates scope ${a.col ? `${a.col} = ` : ''}'${a.value}' against a pre-image baseline`,
        observedImplementation:
          p.baselines.length === 0
            ? `no baseline/snapshot is captured anywhere in the packet, so scope '${a.value}' has no pre-image data`
            : `no baseline covers scope '${a.value}': there is no full-table snapshot and the filtered baseline(s) ${filteredScopes.join(', ') || '(none applicable)'} do not include it`,
        consequence:
          'a named non-regression STOP has no baseline data to evaluate against; it silently passes on that scope and cannot catch a change there',
        recommendedAuthorAction:
          "capture an in-transaction snapshot that covers this assertion's scope (a full-table snapshot covers every scope), and enforce the comparison in an executable DO block",
      }),
    );
  }
  return findings;
}

// 7 — Apply vs rollback identity mismatch (divergent / duplicated identity set).
export function checkApplyRollbackIdentity(p) {
  const findings = [];
  let seq = 0;
  // A zero placeholder is the classic all-zeros-with-trailing-counter id
  // (e.g. 00000000-0000-0000-0000-000000000001..000f) or a fully-zero uuid.
  const isZeroUuid = (u) =>
    /^0{8}-0{4}-0{4}-0{4}-0{11}[0-9a-f]$/.test(u) || /^0{8}-0{4}-0{4}-0{4}-0{12}$/.test(u);
  const isPlaceholder = (g) =>
    g.uuids.every(isZeroUuid) || /replace|paste|<--|todo|placeholder/i.test(g.contextLines);

  // (a) duplicate identity within any group
  for (const g of p.uuidGroups) {
    const seen = new Set();
    const dups = new Set();
    for (const u of g.uuids) {
      if (seen.has(u)) dups.add(u);
      seen.add(u);
    }
    if (dups.size) {
      seq += 1;
      findings.push(
        mkFinding({
          checkId: 7,
          seq,
          severity: SEVERITY.MEDIUM,
          packetSection: g.section,
          executableLocation: `identity list at lines ${g.startLine}-${g.endLine}`,
          declaredControl: 'a pinned identity set (apply/rollback target list)',
          observedImplementation: `the identity list repeats ${dups.size} id(s), e.g. ${[...dups][0]}`,
          consequence:
            'a duplicated identity mis-states the true target set; row-count guards keyed on the list size can be satisfied by the wrong rows',
          recommendedAuthorAction: 'de-duplicate the identity list so it holds exactly the intended distinct ids',
        }),
      );
    }
  }

  // (b) apply "pinned" set vs rollback "reactivate originals" set diverge
  const applyGroups = p.uuidGroups.filter((g) => !/rollback|roll back/i.test(g.section) && !isPlaceholder(g));
  const rbGroups = p.uuidGroups.filter((g) => /rollback|roll back/i.test(g.section) && !isPlaceholder(g));
  const applyPinned = applyGroups.sort((a, b) => b.uuids.length - a.uuids.length)[0];
  const rbOriginals =
    rbGroups.find((g) => /original|pinned|reactivate|same|restore/i.test(g.contextLines)) ||
    rbGroups.sort((a, b) => b.uuids.length - a.uuids.length)[0];
  if (applyPinned && rbOriginals) {
    const A = new Set(applyPinned.uuids);
    const B = new Set(rbOriginals.uuids);
    const missing = [...A].filter((u) => !B.has(u));
    const extra = [...B].filter((u) => !A.has(u));
    if (missing.length || extra.length) {
      seq += 1;
      findings.push(
        mkFinding({
          checkId: 7,
          seq,
          severity: SEVERITY.MEDIUM,
          packetSection: `${applyPinned.section} vs ${rbOriginals.section}`,
          executableLocation: `apply identity list lines ${applyPinned.startLine}-${applyPinned.endLine}; rollback identity list lines ${rbOriginals.startLine}-${rbOriginals.endLine}`,
          declaredControl: 'rollback reverses exactly what the apply changed (consistent identity set)',
          observedImplementation: `the rollback "originals" identity set diverges from the apply's pinned set (${missing.length} id(s) only in apply, ${extra.length} only in rollback)`,
          consequence:
            'the rollback would not restore the exact pre-apply state — it can miss originals or touch rows the apply never changed',
          recommendedAuthorAction:
            'derive the rollback identity set from the same single source as the apply, so the two lists cannot diverge',
        }),
      );
    }
  }

  // (c) NON-UUID identity: the rollback must restore from the SAME snapshot /
  // pre-image RELATION the apply created as its ROLLBACK pre-image. This compares
  // ONLY against the apply's actual, NON-EPHEMERAL rollback pre-image capture —
  // an in-transaction assertion baseline (created `ON COMMIT DROP`, or referenced
  // only inside an assertion DO block) is dropped at commit and cannot be a
  // cross-transaction rollback source, so it is EXCLUDED. If the rollback
  // restores FROM a pre-image relation whose identity differs from the apply's
  // durable pre-image capture, the rollback is keyed on the wrong source.
  const preimageSuffix = /(?:_pre|_before|_snapshot|_baseline|_preimage|_preimg|_orig)$/i;
  const isPreimageName = (bare) => preimageSuffix.test(bare);
  const preimageTokenRe = /\b([A-Za-z_][A-Za-z0-9_]*(?:_pre|_before|_snapshot|_baseline|_preimage|_preimg|_orig))\b/gi;
  const namesIn = (text) => {
    const s = new Set();
    let m;
    preimageTokenRe.lastIndex = 0;
    while ((m = preimageTokenRe.exec(text)) !== null) s.add(m[1].toLowerCase());
    return s;
  };
  const createRelOne =
    /\bCREATE\s+(?:GLOBAL\s+|LOCAL\s+|TEMP(?:ORARY)?\s+|UNLOGGED\s+)*TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?([A-Za-z_][A-Za-z0-9_.$]*)/i;
  const baselineNames = new Set(p.baselines.map((b) => b.name).filter(Boolean).map((n) => n.toLowerCase()));

  // split SQL lines into apply-region vs rollback-region (by section)
  const applyLines = [];
  const rbLines = [];
  for (const l of p.sqlLines) {
    if (/rollback|roll\s?back/i.test(p.sectionForLine(l.lineNo))) rbLines.push(l);
    else applyLines.push(l);
  }
  const applyJoined = applyLines.map((l) => l.text).join('\n');
  const rbJoined = rbLines.map((l) => l.text).join('\n');

  // DO-assertion line ranges — a pre-image referenced ONLY inside these is an
  // ephemeral in-transaction assertion baseline, not a rollback pre-image.
  const doRanges = p.doBlocks.map((d) => [d.startLine, d.endLine]);
  const inDo = (lineNo) => doRanges.some(([s, e]) => lineNo >= s && lineNo <= e);

  // apply-created pre-image relations + whether each is ephemeral
  const applyRollbackPreimages = new Set();
  for (let i = 0; i < applyLines.length; i++) {
    const cm = createRelOne.exec(applyLines[i].text);
    if (!cm) continue;
    const bare = cm[1].toLowerCase().replace(/^.*\./, '');
    if (!isPreimageName(bare)) continue;
    // accumulate the CREATE statement (to its terminating ';' or 'AS') to see ON COMMIT DROP
    let stmt = applyLines[i].text;
    for (let k = i + 1; k < applyLines.length && !/;/.test(stmt) && !/\bAS\b/i.test(stmt); k++) {
      stmt += '\n' + applyLines[k].text;
    }
    if (/\bON\s+COMMIT\s+DROP\b/i.test(stmt)) continue; // ephemeral: dropped at commit
    // referenced only inside assertion DO blocks in the apply region?
    const occ = applyLines.filter((l) => new RegExp('\\b' + escapeRegExp(bare) + '\\b').test(l.text));
    if (occ.length > 0 && occ.every((l) => inDo(l.lineNo))) continue; // ephemeral: assertion baseline
    applyRollbackPreimages.add(bare);
  }

  // restore-source reads in the rollback: FROM / USING / JOIN <pre-image relation>
  const recognisablePreimage = new Set([...namesIn(applyJoined), ...namesIn(rbJoined), ...baselineNames, ...applyRollbackPreimages]);
  const rbReads = new Set();
  const readRe = /\b(?:FROM|USING|JOIN)\s+([A-Za-z_][A-Za-z0-9_.]*)/gi;
  let rm;
  while ((rm = readRe.exec(rbJoined)) !== null) {
    const nm = rm[1].toLowerCase().replace(/^.*\./, '');
    if (recognisablePreimage.has(nm)) rbReads.add(nm);
  }
  if (applyRollbackPreimages.size > 0) {
    const divergent = [...rbReads].filter((n) => !applyRollbackPreimages.has(n));
    if (divergent.length) {
      seq += 1;
      findings.push(
        mkFinding({
          checkId: 7,
          seq,
          severity: SEVERITY.HIGH,
          packetSection: '(apply vs rollback)',
          executableLocation: `apply's durable rollback pre-image relation(s) {${[...applyRollbackPreimages].join(', ')}}; rollback restores from {${divergent.join(', ')}}`,
          declaredControl: 'rollback restores from the SAME durable snapshot / pre-image identity the apply created',
          observedImplementation: `the rollback restores from pre-image relation(s) ${divergent.map((n) => `"${n}"`).join(', ')}, which is not the durable pre-image the apply created (${[...applyRollbackPreimages].map((n) => `"${n}"`).join(', ')})`,
          consequence:
            'the rollback is keyed on the wrong restore source; it would not reproduce the true pre-apply state (or would fail to find the relation), so the rollback path is not actually reversible',
          recommendedAuthorAction:
            'restore from the exact durable pre-image relation the apply captured (name them from a single source so the apply and rollback identities cannot diverge)',
        }),
      );
    }
  }

  return findings;
}

// 8 — Executable ordering inconsistent with the declared step/gate sequence.
export function checkExecutableOrdering(p) {
  const findings = [];
  if (!p.declaredSequence.length) return findings;
  // declared order of tokens (first declared position wins)
  const declaredPos = new Map();
  for (const s of p.declaredSequence) if (!declaredPos.has(s.token)) declaredPos.set(s.token, s.order);
  // executable order = first SQL line each token appears on (in a real construct)
  const execPos = new Map();
  for (const l of p.sqlLines) {
    const toks = l.text.match(/[A-Z][A-Za-z0-9-]{1,23}/g) || [];
    for (const raw of toks) {
      const tok = raw.replace(/[.,;:]$/, '');
      if (declaredPos.has(tok) && !execPos.has(tok)) execPos.set(tok, l.lineNo);
    }
  }
  const common = [...declaredPos.keys()].filter((t) => execPos.has(t));
  if (common.length < 2) return findings;
  const byDeclared = [...common].sort((a, b) => declaredPos.get(a) - declaredPos.get(b));
  const byExec = [...common].sort((a, b) => execPos.get(a) - execPos.get(b));
  let seq = 0;
  for (let i = 0; i < common.length; i++) {
    if (byDeclared[i] !== byExec[i]) {
      seq += 1;
      findings.push(
        mkFinding({
          checkId: 8,
          seq,
          severity: SEVERITY.MEDIUM,
          packetSection: '(declared sequence vs executable order)',
          executableLocation: `executable order: ${byExec.join(' -> ')}`,
          declaredControl: `declared step/gate order: ${byDeclared.join(' -> ')}`,
          observedImplementation: 'the order the guards actually execute differs from the order the packet declares',
          consequence:
            'a guard the sequence requires before a mutation may run after it, so a dependent mutation is not actually protected in the declared order',
          recommendedAuthorAction: 'reorder the executable steps to match the declared gate sequence (pre-checks before mutation, guards before dependent mutations)',
        }),
      );
      break; // one ordering finding is sufficient signal
    }
  }
  return findings;
}

// 9 — A failure branch that logs/continues where the semantics require abort.
export function checkFailureBranchContinues(p) {
  const findings = [];
  let seq = 0;
  for (const d of p.doBlocks) {
    if (!d.hasExceptionHandler) continue;
    // handler body = text after EXCEPTION WHEN ... THEN
    const m = /\bEXCEPTION\s+WHEN\b[\s\S]*/i.exec(d.code);
    if (!m) continue;
    const handler = m[0];
    const reRaises = /\bRAISE\s+EXCEPTION\b/i.test(handler) || /\bRAISE\s*;/i.test(handler);
    if (!reRaises) {
      seq += 1;
      const swallows = /\bRAISE\s+NOTICE\b/i.test(handler)
        ? 'RAISE NOTICE (log-only)'
        : /\bCONTINUE\b/i.test(handler)
          ? 'CONTINUE'
          : /\bNULL\s*;/i.test(handler)
            ? 'NULL (swallow)'
            : 'no re-raise';
      findings.push(
        mkFinding({
          checkId: 9,
          seq,
          severity: SEVERITY.HIGH,
          packetSection: p.sectionForLine(d.startLine),
          executableLocation: `EXCEPTION handler in DO block at lines ${d.startLine}-${d.endLine}`,
          declaredControl: 'fail-closed harness (an error must abort the transaction)',
          observedImplementation: `the EXCEPTION handler ${swallows} and does not re-raise; the error is caught and execution continues`,
          consequence:
            'a handled failure is swallowed instead of aborting; the apply continues past a condition the harness is supposed to treat as fatal',
          recommendedAuthorAction:
            'remove the swallowing handler or re-raise (RAISE; / RAISE EXCEPTION) so the failure aborts the transaction',
        }),
      );
    }
  }
  return findings;
}

// 10 — Missing execution-channel or control-register information → INCOMPLETE.
export function checkMissingControlInfo(p) {
  const findings = [];
  let seq = 0;
  if (!p.channel.named) {
    seq += 1;
    findings.push(
      mkFinding({
        checkId: 10,
        seq,
        severity: SEVERITY.HIGH,
        packetSection: '(execution control)',
        executableLocation: 'no sanctioned/single-call execution channel is named anywhere in the packet',
        declaredControl: 'a named execution channel',
        observedImplementation: 'the packet does not name the single-call/single-session channel through which the harness must run',
        consequence:
          'the harness cannot be reliably assessed — without a named channel there is no way to confirm the transaction runs as one unit',
        recommendedAuthorAction: 'add an execution-control section naming the exact sanctioned single-call channel(s)',
        incompleteTrigger: true,
      }),
    );
  }
  if (!p.hasControlRegister) {
    seq += 1;
    findings.push(
      mkFinding({
        checkId: 10,
        seq,
        severity: SEVERITY.HIGH,
        packetSection: '(assertion / control register)',
        executableLocation: 'no assertion/control register found',
        declaredControl: 'a declared assertion/control register',
        observedImplementation:
          'the packet declares no assertion/STOP/control register, so there is no declared control set to check the SQL against',
        consequence: 'the harness cannot be reliably assessed — the declared control set is unknown',
        recommendedAuthorAction: 'add an assertion register mapping each STOP/assertion to where it is enforced in the SQL',
        incompleteTrigger: true,
      }),
    );
  }
  return findings;
}

export const CHECKS = [
  checkDeclaredStopEnforcement,
  checkProseOnlyAbort,
  checkRowCountFailClosed,
  checkTransactionChannelNamed,
  checkMultiCallTransaction,
  checkBaselineScope,
  checkApplyRollbackIdentity,
  checkExecutableOrdering,
  checkFailureBranchContinues,
  checkMissingControlInfo,
];

// ===========================================================================
// VERDICT ROLLUP + ASSESSMENT
// ===========================================================================

export function rollupVerdict(findings) {
  if (findings.some((f) => f.incompleteTrigger)) return VERDICT.INCOMPLETE;
  if (findings.length > 0) return VERDICT.CONCERNS;
  return VERDICT.PASS;
}

// Assess raw packet text. Fail-closed: any internal error → INCOMPLETE + an
// error finding, never a fabricated PASS.
export function assess(text) {
  try {
    const parsed = parsePacket(text);
    const findings = [];
    for (const check of CHECKS) {
      const got = check(parsed);
      if (Array.isArray(got)) findings.push(...got);
    }
    const verdict = rollupVerdict(findings);
    return { ok: true, verdict, findings };
  } catch (e) {
    return {
      ok: false,
      verdict: VERDICT.INCOMPLETE,
      findings: [
        mkFinding({
          checkId: 0,
          seq: 1,
          severity: SEVERITY.HIGH,
          packetSection: '(analyzer)',
          executableLocation: 'n/a',
          declaredControl: 'reliable static assessment of the packet',
          observedImplementation: `the analyzer failed to parse/assess the packet: ${e && e.message ? e.message : e}`,
          consequence: 'the harness could not be assessed — treat as INCOMPLETE, never as clean',
          recommendedAuthorAction: 'inspect the packet for malformed structure and re-run; do not treat the absence of findings as a pass',
          incompleteTrigger: true,
        }),
      ],
      error: e && e.message ? e.message : String(e),
    };
  }
}

// CCF-02 normalized verdict mapping (named per CLAUDE.md findings-contract):
//   PASS -> clean · CONCERNS -> concerns · INCOMPLETE -> block.
export function normalizedVerdict(verdict) {
  if (verdict === VERDICT.PASS) return 'clean';
  if (verdict === VERDICT.CONCERNS) return 'concerns';
  return 'block';
}

// ---------------------------------------------------------------------------
// Human-readable report (printed by main; findings enumerated independently of
// the rolled-up verdict).
// ---------------------------------------------------------------------------
export function formatReport(result, sourceLabel) {
  const lines = [];
  lines.push('=== apply-harness-auditor (CCF-04 · READ-ONLY · ADVISORY · decides nothing) ===');
  lines.push('');
  lines.push(`source: ${sourceLabel || '(in-memory)'}`);
  lines.push(`verdict: ${result.verdict}   (CCF-02 normalized: ${normalizedVerdict(result.verdict)})`);
  lines.push(`findings: ${result.findings.length} (always fully enumerated, independent of the top verdict)`);
  lines.push('');
  if (result.findings.length === 0) {
    lines.push('No declared-control / harness-fidelity findings from the ten mechanical checks.');
    lines.push('This is NOT an approval and NOT a judgment of business/payload/architecture correctness.');
    lines.push('db-rls-auditor, external review, and the PK apply gate all still run above this tool.');
  } else {
    for (const f of result.findings) {
      lines.push(`[${f.findingId}] severity=${f.severity}${f.incompleteTrigger ? ' (INCOMPLETE trigger)' : ''}`);
      lines.push(`  section   : ${f.packetSection}`);
      lines.push(`  location  : ${f.executableLocation}`);
      lines.push(`  declared  : ${f.declaredControl}`);
      lines.push(`  observed  : ${f.observedImplementation}`);
      lines.push(`  consequence: ${f.consequence}`);
      lines.push(`  action    : ${f.recommendedAuthorAction}`);
      lines.push('');
    }
  }
  lines.push('--- boundary (this tool NEVER does these) ---');
  lines.push('  approve an apply · judge payload/business correctness · judge architecture ·');
  lines.push('  verify live/DB/deploy/git truth · replace db-rls-auditor · decide proceed/abort.');
  lines.push('===============================================================================');
  return lines.join('\n');
}

// ===========================================================================
// THIN main() — reads the input file (the ONLY fs use), prints the report.
// Runs only on direct invocation. Fail-closed. Non-zero exit on error/parse
// failure so a wrapper can detect it.
// ===========================================================================
export function main(argv = process.argv.slice(2)) {
  const path = argv.find((a) => !a.startsWith('-'));
  if (!path) {
    process.stdout.write('usage: node apply-harness-auditor.mjs <apply-packet.md>\n');
    process.exitCode = 2;
    return;
  }
  let text;
  try {
    text = readFileSync(path, 'utf-8');
  } catch (e) {
    const result = {
      ok: false,
      verdict: VERDICT.INCOMPLETE,
      findings: [],
      error: `could not read input file: ${e && e.message ? e.message : e}`,
    };
    process.stdout.write(formatReport(result, path) + '\n');
    process.stdout.write(`ERROR: ${result.error}\n`);
    process.exitCode = 2;
    return;
  }
  const result = assess(text);
  process.stdout.write(formatReport(result, path) + '\n');
  if (argv.includes('--json')) {
    process.stdout.write(JSON.stringify({ verdict: result.verdict, normalized: normalizedVerdict(result.verdict), findings: result.findings }, null, 2) + '\n');
  }
  // Fail-closed exit: non-zero when the analyzer itself failed to assess.
  process.exitCode = result.ok === false ? 2 : 0;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main();
}
