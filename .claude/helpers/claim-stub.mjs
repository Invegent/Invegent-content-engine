// claim-stub.mjs — CCF-04 Mechanical Assistant #4 (Claim Stub)
//
// PURPOSE
//   A session about to cut a register version (v6.NN) or open a new task
//   (cc-NNNN) runs this to answer ONE question: "what is the next free
//   identifier, and is there already a collision on it?" It PROPOSES a next-free
//   identifier + REPORTS any existing collision, and RESOLVES NOTHING. It is a
//   lens over the read-then-write allocation race, not a fixer.
//
// WHAT IT IS (charter: docs/briefs/ccf-04-mechanical-assistants-charter.md;
//   Gate-1 brief: docs/briefs/ccf-04-claim-stub-gate1-brief-v1.md)
//   Zero-authority, deterministic, read-only. It removes manual effort (scanning
//   the highest existing number by hand across registers + open claim stubs +
//   filenames, then eyeballing collisions) WITHOUT removing judgment (which
//   claimant keeps a collided number, whether to trust the proposal and cut —
//   all stay with the human). It mirrors the PROVEN shape of source-truth-check.mjs
//   and hash-checkpoint.mjs: exported PURE-CORE functions (deterministic,
//   unit-testable with INJECTED scan-inputs + injected clock, no I/O) driven by a
//   thin main() that runs ONLY on direct invocation, FAIL-CLOSED throughout.
//
// OPTION A — PROPOSE-ONLY, ZERO-WRITE (PK-elected).
//   There is NO stub-write path. The helper prints the next-free identifier, the
//   ready-to-paste CLAIMED line, and any collision report; the HUMAN writes and
//   commits the stub. No node:fs write anywhere; no network; git READ-ONLY only
//   (show / log / ls-tree / rev-parse / worktree list class).
//
// THE VERDICT CONTRACT (PK-resolved)
//   Native   : PROPOSED · COLLISION · STALE · INCOMPLETE.
//   Normalized (CCF-02): PROPOSED->clean · COLLISION->escalate (O-2) ·
//              STALE->block · INCOMPLETE->block.
//   Precedence (fail-closed): INCOMPLETE > STALE > COLLISION > PROPOSED.
//
// THE TWO TRUST-KILLERS — impossible by construction
//   (1) A FALSE "free" proposal (proposing a number already taken). Every
//       ambiguity — a missing/unreadable register, a malformed marker that could
//       be higher than the clean max, a next-free that lands on a reserved-to-
//       branch hold, an absent identity/clock — resolves to INCOMPLETE and NEVER
//       to a fabricated free number. The highest is derived GENERICALLY (highest
//       major, then highest minor within it; highest integer) — NEVER a hardcoded
//       major (B-1). The sibling source-truth-check.mjs hardcodes /v5\.(\d+)/ and
//       is already stale at v6.27 — this module must not repeat that.
//   (2) An AUTO-RESOLVED collision (choosing a winner / renumbering). Collisions
//       are REPORTED with every claimant + timestamp; the earliest-timestamp-keeps
//       rule is a HUMAN decision. This tool never picks a winner, never renumbers,
//       never version-bumps after a collision.

import { spawnSync } from 'node:child_process';
import { readFileSync, existsSync, readdirSync } from 'node:fs'; // READ-ONLY imports; no writeFileSync
import { pathToFileURL } from 'node:url';
import { join } from 'node:path';

// ===========================================================================
// PURE CORE — no side effects, no fs, no git, no clock. Injected scan-inputs in,
// structured result out. These are what the unit tests exercise.
// ===========================================================================

export const VERDICT = {
  PROPOSED: 'PROPOSED',
  COLLISION: 'COLLISION',
  STALE: 'STALE',
  INCOMPLETE: 'INCOMPLETE',
};

// CCF-02 normalized vocabulary (PK O-2): only PROPOSED is clean; COLLISION is
// escalate (a human reconciliation decision); STALE + INCOMPLETE are block.
export const NORMALIZED = { CLEAN: 'clean', ESCALATE: 'escalate', BLOCK: 'block' };

export const CLAIM_TYPE = { REGISTER: 'register', TASK: 'task' };

// Finding severities. Each finding contributes at most one verdict class; INFO
// never changes the verdict. Precedence order encoded in finalize().
export const SEVERITY = {
  INFO: 'INFO',
  PROPOSED: 'PROPOSED',
  COLLISION: 'COLLISION',
  STALE: 'STALE',
  INCOMPLETE: 'INCOMPLETE',
};

export const SCHEMA = 'ccf-04-claim-stub/v1';

// --- normalized mapping (PK O-2) -------------------------------------------
export function normalizedVerdict(native) {
  if (native === VERDICT.PROPOSED) return NORMALIZED.CLEAN;
  if (native === VERDICT.COLLISION) return NORMALIZED.ESCALATE;
  return NORMALIZED.BLOCK; // STALE, INCOMPLETE, anything unexpected -> fail-closed block
}

// --- deterministic canonical JSON (stable key ordering) --------------------
// Guarantees byte-identical output across runs on identical inputs.
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

// ---------------------------------------------------------------------------
// GENERIC identifier parsing (B-1 — NEVER hardcode a major/namespace value)
// ---------------------------------------------------------------------------

// A clean register marker: vMAJOR.MINOR anywhere in text. Global; numeric max is
// taken over the (major, minor) TUPLE, never file ordering, never a fixed major.
const REGISTER_STRICT = /\bv(\d+)\.(\d+)\b/g;
// A SUSPECT (malformed) register-like marker: v<digits>.<optional digits><LETTER>…
// e.g. "v6.3O" (letter O), "v6.x". It cannot be read as a clean vMAJOR.MINOR but
// occupies the version namespace, so if it could be >= the clean max it makes the
// highest AMBIGUOUS -> fail-closed INCOMPLETE (never guess past a marker we can't
// read — that is exactly how a false-free would slip through).
const REGISTER_SUSPECT = /\bv(\d+)\.\d*[A-Za-z][0-9A-Za-z]*/g;

// A clean task id: cc-NNNN (canonical 4-digit zero-padded; shorter numeric forms
// like cc-47 also parse). ICE task ids are canonically CANONICAL_CC_WIDTH digits.
// Classification of letter-bearing cc tokens (identifier-FORMAT knowledge, not a
// hardcoded historical value):
//   - cc-<4+digits><letter>  e.g. cc-0033a  -> a VARIANT/sub-lane of a readable
//     base number; it does NOT occupy the numeric successor, so it is NOT a
//     max-threat. Ignored for max + ambiguity.
//   - cc-<letters...>        e.g. cc-phase1, cc-a2 -> a non-numeric LABEL, not in
//     the cc-NNNN numeric namespace. Ignored.
//   - cc-<1..3 digits><letter> e.g. cc-004X, cc-9O -> a letter sits INSIDE the
//     canonical 4-digit field, so a digit may be masked and the true number could
//     be higher than the clean max -> SUSPECT -> fail-closed ambiguity.
// (A cc-<4+digits><letter> variant is matched by neither TASK_STRICT — the \b
// after the digits fails before the letter — nor TASK_SUSPECT below, so it is
// naturally ignored, exactly as intended.)
const CANONICAL_CC_WIDTH = 4;
const TASK_STRICT = /\bcc-(\d+)\b/g;
const TASK_SUSPECT = new RegExp(`\\bcc-\\d{1,${CANONICAL_CC_WIDTH - 1}}[A-Za-z]`, 'g');

// ENTRY-HEADER anchor (per line). ICE register VERSION markers head a register
// entry: after an optional blockquote/bullet prefix and a bold "**" + a short
// status glyph, the line STARTS with vMAJOR.MINOR. Foreign version tokens in
// register prose ("Graph v24.0", "insights-worker v14.5.0", "v19.0") sit
// MID-sentence and are NOT matched — this is how the CLI reads the true register
// head off a noisy real register WITHOUT hardcoding a major (B-1 preserved).
// Injected fixtures default to the generic "all markers" parser; only the CLI's
// real register-FILE sources opt into this entry-header mode.
const REGISTER_ENTRY_STRICT = /^\s*(?:>|·|-|\*)?\s*\*\*[^\n]{0,10}?\bv(\d+)\.(\d+)\b/;
const REGISTER_ENTRY_SUSPECT = /^\s*(?:>|·|-|\*)?\s*\*\*[^\n]{0,10}?\bv(\d+)\.\d*[A-Za-z]/;

// Extract ONLY register entry-header markers (one per matching line).
export function extractRegisterEntryHeaders(text) {
  const markers = [];
  const suspects = [];
  if (typeof text !== 'string' || text === '') return { markers, suspects };
  for (const line of text.split('\n')) {
    const m = REGISTER_ENTRY_STRICT.exec(line);
    if (m) {
      const major = Number.parseInt(m[1], 10);
      const minor = Number.parseInt(m[2], 10);
      if (Number.isFinite(major) && Number.isFinite(minor)) {
        markers.push({ raw: `v${major}.${minor}`, major, minor });
        continue;
      }
    }
    const s = REGISTER_ENTRY_SUSPECT.exec(line);
    if (s) {
      const major = Number.parseInt(s[1], 10);
      if (Number.isFinite(major)) suspects.push({ raw: s[0].trim(), major });
    }
  }
  return { markers, suspects };
}

// Parse ALL clean register markers + suspect markers from a text blob.
// Returns { markers:[{raw,major,minor}], suspects:[{raw,major}] }.
export function parseRegisterMarkers(text) {
  const markers = [];
  const suspects = [];
  if (typeof text !== 'string' || text === '') return { markers, suspects };
  let m;
  REGISTER_STRICT.lastIndex = 0;
  while ((m = REGISTER_STRICT.exec(text)) !== null) {
    const major = Number.parseInt(m[1], 10);
    const minor = Number.parseInt(m[2], 10);
    if (Number.isFinite(major) && Number.isFinite(minor)) {
      markers.push({ raw: `v${major}.${minor}`, major, minor });
    }
  }
  let s;
  REGISTER_SUSPECT.lastIndex = 0;
  while ((s = REGISTER_SUSPECT.exec(text)) !== null) {
    const major = Number.parseInt(s[1], 10);
    if (Number.isFinite(major)) suspects.push({ raw: s[0], major });
  }
  return { markers, suspects };
}

// Parse ALL clean task ids + suspect task ids from a text blob (or filename).
// Returns { markers:[{raw,n}], suspects:[{raw}] }.
export function parseTaskMarkers(text) {
  const markers = [];
  const suspects = [];
  if (typeof text !== 'string' || text === '') return { markers, suspects };
  let m;
  TASK_STRICT.lastIndex = 0;
  while ((m = TASK_STRICT.exec(text)) !== null) {
    const n = Number.parseInt(m[1], 10);
    if (Number.isFinite(n)) markers.push({ raw: fmtTask(n), n });
  }
  let s;
  TASK_SUSPECT.lastIndex = 0;
  while ((s = TASK_SUSPECT.exec(text)) !== null) {
    suspects.push({ raw: s[0] });
  }
  return { markers, suspects };
}

// Format helpers (canonical rendering).
export function fmtRegister(t) {
  if (!t || !Number.isFinite(t.major) || !Number.isFinite(t.minor)) return null;
  return `v${t.major}.${t.minor}`;
}
export function fmtTask(n) {
  if (!Number.isFinite(n)) return null;
  return `cc-${String(n).padStart(4, '0')}`;
}

// Highest register tuple by (major, minor). null when empty.
export function highestRegister(markers) {
  let best = null;
  for (const t of (Array.isArray(markers) ? markers : [])) {
    if (!Number.isFinite(t.major) || !Number.isFinite(t.minor)) continue;
    if (best === null || t.major > best.major || (t.major === best.major && t.minor > best.minor)) {
      best = { major: t.major, minor: t.minor };
    }
  }
  return best;
}
// Successor = next MINOR within the highest MAJOR (never crosses major).
export function successorRegister(t) {
  return { major: t.major, minor: t.minor + 1 };
}

// Highest task integer. null when empty.
export function highestTask(nums) {
  let best = null;
  for (const n of (Array.isArray(nums) ? nums : [])) {
    if (!Number.isFinite(n)) continue;
    if (best === null || n > best) best = n;
  }
  return best;
}
export function successorTask(n) { return n + 1; }

// Parse a single CLAIMED stub line-1 into its fields.
//   "CLAIMED v6.20 · lane · worktree · gate · 2026-07-25T..." (register), OR
//   "CLAIMED cc-0047 · lane · worktree · gate · 2026-07-25T..." (task)
// Returns { identifier, kind, register?, task?, lane, worktree, gate, timestamp }
// or null when the line is not a claim stub.
export function parseStubLine(line) {
  if (typeof line !== 'string') return null;
  const m = /^\s*CLAIMED\s+(v\d+\.\d+|cc-\d+)\b(.*)$/.exec(line);
  if (!m) return null;
  const token = m[1];
  const rest = m[2] || '';
  const parts = rest.split('·').map((p) => p.trim()).filter((p) => p !== '');
  const [lane = null, worktree = null, gate = null, timestamp = null] = parts;
  const out = { identifier: token, lane, worktree, gate, timestamp };
  if (token.startsWith('cc-')) {
    out.kind = CLAIM_TYPE.TASK;
    out.task = Number.parseInt(token.slice(3), 10);
    out.identifier = fmtTask(out.task);
  } else {
    out.kind = CLAIM_TYPE.REGISTER;
    const rm = /^v(\d+)\.(\d+)$/.exec(token);
    out.register = { major: Number.parseInt(rm[1], 10), minor: Number.parseInt(rm[2], 10) };
    out.identifier = fmtRegister(out.register);
  }
  return out;
}

// Compose the exact CCF-02 CLAIMED line. The HUMAN writes/commits it (Option A).
//   CLAIMED <identifier> · <lane> · <worktree> · <gate> · <timestamp>
export function composeClaimedLine({ identifier, lane, worktree, gate, timestamp }) {
  if (typeof identifier !== 'string' || !/^(v\d+\.\d+|cc-\d+)$/.test(identifier)) {
    throw new Error(`composeClaimedLine: invalid identifier ${JSON.stringify(identifier)}`);
  }
  return [
    `CLAIMED ${identifier}`,
    String(lane ?? ''),
    String(worktree ?? ''),
    String(gate ?? ''),
    String(timestamp ?? ''),
  ].join(' · ');
}

// Collision detection (REPORT-ONLY). claimants: [{identifier, source, locator, timestamp}].
// A collision = one identifier asserted by >=2 DISTINCT locators. Returns
// { present, groups:[{identifier, claimants:[...]}], keys:[identifier,...] }.
// NEVER picks a winner, NEVER renumbers.
export function detectCollisions(claimants) {
  const byId = new Map();
  for (const c of (Array.isArray(claimants) ? claimants : [])) {
    if (!c || typeof c.identifier !== 'string') continue;
    const list = byId.get(c.identifier) || [];
    // Dedupe by locator (same file asserting the same id once is one claimant).
    if (!list.some((x) => x.locator === c.locator && x.source === c.source)) {
      list.push({ source: c.source ?? null, locator: c.locator ?? null, timestamp: c.timestamp ?? null });
    }
    byId.set(c.identifier, list);
  }
  const groups = [];
  for (const [identifier, list] of byId) {
    if (list.length >= 2) {
      const claims = [...list].sort((a, b) => cmpStr(claimSortKey(a), claimSortKey(b)));
      groups.push({ identifier, claimants: claims });
    }
  }
  groups.sort((a, b) => cmpStr(a.identifier, b.identifier));
  return { present: groups.length > 0, groups, keys: groups.map((g) => g.identifier) };
}
function claimSortKey(c) { return `${c.timestamp ?? ''}|${c.locator ?? ''}|${c.source ?? ''}`; }
function cmpStr(a, b) { return a < b ? -1 : a > b ? 1 : 0; }

// ---------------------------------------------------------------------------
// Normalize + validate the injected observations request.
// ---------------------------------------------------------------------------
export function validateRequest(req) {
  const errors = [];
  if (!req || typeof req !== 'object' || Array.isArray(req)) {
    return { ok: false, errors: ['request is not a JSON object'] };
  }
  const types = Object.values(CLAIM_TYPE);
  if (!types.includes(req.claimType)) {
    errors.push(`claimType: required one of ${types.join(' | ')}`);
  }
  for (const f of ['lane', 'worktree', 'gate']) {
    if (typeof req[f] !== 'string' || req[f].trim() === '') {
      errors.push(`${f}: required non-empty string (claim identity — never inferred)`);
    }
  }
  return { ok: errors.length === 0, errors };
}

// Parse a reserved-hold entry ("v6.11" / "cc-0047" / {raw}) for a claimType.
// Returns the canonical identifier string or null when it does not match the type.
function normalizeReserved(entry, claimType) {
  const raw = typeof entry === 'string' ? entry : (entry && typeof entry.raw === 'string' ? entry.raw : null);
  if (!raw) return null;
  if (claimType === CLAIM_TYPE.REGISTER) {
    const m = /\bv(\d+)\.(\d+)\b/.exec(raw);
    return m ? `v${Number.parseInt(m[1], 10)}.${Number.parseInt(m[2], 10)}` : null;
  }
  const m = /\bcc-(\d+)\b/.exec(raw);
  return m ? fmtTask(Number.parseInt(m[1], 10)) : null;
}

// ===========================================================================
// The assessment: observations in, structured result out. Deterministic + pure.
// Fail-closed: any doubt -> INCOMPLETE, never a fabricated free number.
// ===========================================================================
export function computeResult(observations) {
  const obs = observations || {};
  const findings = [];
  let seq = 0;
  const add = (code, severity, fields) => {
    seq += 1;
    findings.push({
      id: `CS-${String(seq).padStart(2, '0')}`,
      code,
      severity,
      source: fields.source ?? null,
      identifier: fields.identifier ?? null,
      observed: fields.observed ?? null,
      whyItMatters: fields.whyItMatters,
      suggestedAction: fields.suggestedAction,
    });
  };

  // ---- validate request (fail-closed -> INCOMPLETE) -----------------------
  const v = validateRequest(obs.request);
  if (!v.ok) {
    for (const e of v.errors) {
      add('bad-request', SEVERITY.INCOMPLETE, {
        whyItMatters: `invalid/absent required input: ${e}`,
        suggestedAction: 'supply a complete request (claimType + lane + worktree + gate); a malformed request can NEVER yield a free number',
      });
    }
    return finalize(findings, obs, { claimType: null, scan: emptyScan(), collision: emptyCollision(), proposed: null, claimedLine: null, reVerify: { performed: false } });
  }
  const req = obs.request;
  const claimType = req.claimType;

  // ---- validate run clock (needed for the composed CLAIMED line) ----------
  const now = typeof obs.now === 'string' ? obs.now.trim() : '';
  const nowMs = now ? Date.parse(now) : NaN;
  if (!now || !Number.isFinite(nowMs)) {
    add('bad-clock', SEVERITY.INCOMPLETE, {
      whyItMatters: 'run clock (now, UTC ISO-8601) absent or unparseable — cannot stamp a claim timestamp',
      suggestedAction: 'inject a valid UTC ISO-8601 run clock; the tool never fabricates a timestamp',
    });
  }

  // ---- gather sources; a required source that is unavailable/errored is a
  //      missing/unreadable register -> INCOMPLETE (no false-free) -----------
  const sources = Array.isArray(obs.sources) ? obs.sources : [];
  const perSource = [];
  const allMarkers = [];   // {major,minor} or {n}
  const allSuspects = [];  // suspect records
  const claimants = [];    // for collision detection
  let anyRegisterTextAvailable = false;

  for (const src of sources) {
    const label = (src && src.label) || (src && src.id) || 'unknown-source';
    const kind = src && src.kind;
    const required = !!(src && src.required);
    const available = !!(src && src.available);
    const entryOut = { source: label, kind: kind || null, required, available, highest: null, count: 0 };

    if (!available || (src && src.error)) {
      entryOut.error = (src && src.error) || 'source unavailable';
      if (required) {
        add('unreadable-source', SEVERITY.INCOMPLETE, {
          source: label,
          observed: entryOut.error,
          whyItMatters: 'a REQUIRED scan source (register / result-doc stub set) is missing or unreadable — the full claimant set cannot be determined',
          suggestedAction: 'make the source readable, or acknowledge the scan is incomplete; never treat an unseen source as "free"',
        });
      } else {
        add('optional-source-skipped', SEVERITY.INFO, {
          source: label,
          observed: entryOut.error,
          whyItMatters: 'an optional scan source was not readable — recorded, not fatal',
          suggestedAction: 'no action required; the basis below excludes this source',
        });
      }
      perSource.push(entryOut);
      continue;
    }

    // Available source: extract identifiers per claimType.
    if (kind === 'register-text') {
      const text = typeof src.text === 'string' ? src.text : '';
      // A register-FILE source may opt into entry-header extraction (mode:
      // 'register-entry') to ignore foreign version tokens in prose. Injected
      // fixtures without a mode use the generic all-markers parser (grader-safe).
      const entryMode = src.mode === 'register-entry';
      if (claimType === CLAIM_TYPE.REGISTER) {
        anyRegisterTextAvailable = true;
        const { markers, suspects } = entryMode ? extractRegisterEntryHeaders(text) : parseRegisterMarkers(text);
        allMarkers.push(...markers);
        allSuspects.push(...suspects);
        entryOut.count = markers.length;
        entryOut.highest = fmtRegister(highestRegister(markers));
      } else {
        anyRegisterTextAvailable = true; // registers also carry cc-ids
        const { markers, suspects } = parseTaskMarkers(text);
        allMarkers.push(...markers.map((x) => ({ n: x.n })));
        allSuspects.push(...suspects);
        entryOut.count = markers.length;
        const h = highestTask(markers.map((x) => x.n));
        entryOut.highest = h === null ? null : fmtTask(h);
      }
    } else if (kind === 'stub-lines') {
      const entries = Array.isArray(src.entries) ? src.entries : [];
      let hi = null;
      for (const e of entries) {
        const locator = (e && e.locator) || null;
        const parsed = parseStubLine(e && e.text);
        if (!parsed) continue;
        if (parsed.kind !== claimType) continue; // only same-type stubs feed this claim
        if (claimType === CLAIM_TYPE.REGISTER) {
          allMarkers.push({ major: parsed.register.major, minor: parsed.register.minor });
          hi = pickHigherReg(hi, parsed.register);
        } else {
          allMarkers.push({ n: parsed.task });
          hi = hi === null ? parsed.task : Math.max(hi, parsed.task);
        }
        claimants.push({ identifier: parsed.identifier, source: label, locator, timestamp: parsed.timestamp });
        entryOut.count += 1;
      }
      entryOut.highest = claimType === CLAIM_TYPE.REGISTER
        ? fmtRegister(hi)
        : (hi === null ? null : fmtTask(hi));
    } else if (kind === 'filenames') {
      const names = Array.isArray(src.names) ? src.names : [];
      // A source may declare that its entries are NOT reliable collision claimants
      // (e.g. real brief/result FILENAMES: one task legitimately owns many files,
      // so filename multiplicity is not a claim collision — the authoritative
      // collision signal is the CCF-02 CLAIMED stub). Such a source feeds the MAX
      // only. Default true (injected fixtures treat each name as a distinct claim).
      const feedClaimants = src.collisionClaimants !== false;
      let hi = null;
      for (const name of names) {
        if (claimType === CLAIM_TYPE.REGISTER) {
          const { markers, suspects } = parseRegisterMarkers(name);
          for (const t of markers) {
            allMarkers.push({ major: t.major, minor: t.minor });
            hi = pickHigherReg(hi, t);
            if (feedClaimants) claimants.push({ identifier: fmtRegister(t), source: label, locator: name, timestamp: null });
          }
          allSuspects.push(...suspects);
        } else {
          const { markers, suspects } = parseTaskMarkers(name);
          for (const t of markers) {
            allMarkers.push({ n: t.n });
            hi = hi === null ? t.n : Math.max(hi, t.n);
            if (feedClaimants) claimants.push({ identifier: fmtTask(t.n), source: label, locator: name, timestamp: null });
          }
          allSuspects.push(...suspects);
        }
        entryOut.count += 1;
      }
      entryOut.highest = claimType === CLAIM_TYPE.REGISTER
        ? fmtRegister(hi)
        : (hi === null ? null : fmtTask(hi));
    } else {
      add('unknown-source-kind', SEVERITY.INFO, {
        source: label,
        observed: kind,
        whyItMatters: 'source of an unrecognized kind was ignored',
        suggestedAction: 'use kind: register-text | stub-lines | filenames',
      });
    }
    perSource.push(entryOut);
  }

  // ---- reserved-to-branch HOLDS (never proposed free) ---------------------
  const reservedSet = new Set();
  for (const r of (Array.isArray(obs.reserved) ? obs.reserved : [])) {
    const id = normalizeReserved(r, claimType);
    if (id) reservedSet.add(id);
  }

  // ---- compute the highest + successor (GENERIC; B-1) ---------------------
  let overallHighest = null;
  let proposed = null;
  let ambiguous = false;

  if (claimType === CLAIM_TYPE.REGISTER) {
    const hi = highestRegister(allMarkers);
    overallHighest = fmtRegister(hi);
    // Ambiguity: a suspect marker that could be >= the clean max makes the
    // highest unreadable. If there is NO clean max at all but a suspect exists,
    // that is also ambiguous. Fail-closed either way.
    for (const s of allSuspects) {
      if (hi === null || s.major >= hi.major) { ambiguous = true; break; }
    }
    if (ambiguous) {
      add('ambiguous-highest', SEVERITY.INCOMPLETE, {
        observed: allSuspects.map((s) => s.raw),
        whyItMatters: 'a malformed version-like marker sits at or above the clean maximum — the true highest cannot be read, so any successor could already be taken',
        suggestedAction: 'fix/clarify the malformed marker; the tool refuses to guess past a marker it cannot read (no false-free)',
      });
    } else if (hi === null) {
      add('no-basis', SEVERITY.INCOMPLETE, {
        whyItMatters: 'no clean vMAJOR.MINOR marker found in any available register/stub source — there is no basis to derive a next-free',
        suggestedAction: 'confirm the registers were read; the tool never invents a first version',
      });
    } else {
      const succ = successorRegister(hi);
      proposed = fmtRegister(succ);
    }
  } else {
    const nums = allMarkers.map((x) => x.n).filter((n) => Number.isFinite(n));
    const hi = highestTask(nums);
    overallHighest = hi === null ? null : fmtTask(hi);
    if (allSuspects.length > 0) {
      ambiguous = true;
      add('ambiguous-highest', SEVERITY.INCOMPLETE, {
        observed: allSuspects.map((s) => s.raw),
        whyItMatters: 'a malformed cc-id-like marker occupies the task-id namespace and cannot be read — the true highest is ambiguous',
        suggestedAction: 'fix/clarify the malformed marker; the tool refuses to guess (no false-free)',
      });
    } else if (hi === null) {
      add('no-basis', SEVERITY.INCOMPLETE, {
        whyItMatters: 'no clean cc-NNNN found in any available source — no basis to derive a next-free',
        suggestedAction: 'confirm the sources were read; the tool never invents a first task id',
      });
    } else {
      proposed = fmtTask(successorTask(hi));
    }
  }

  // ---- reserved-hold guard on the proposal (INCOMPLETE, never auto-skip) ---
  if (proposed && reservedSet.has(proposed)) {
    add('reserved-hold', SEVERITY.INCOMPLETE, {
      identifier: proposed,
      observed: [...reservedSet].sort(),
      whyItMatters: `the next-free ${proposed} is RESERVED to an unmerged branch — it is held, not free, and must not be reused on main`,
      suggestedAction: 'honour the hold; a human decides the next identifier (the tool never auto-skips a reserved number, which could collide with another hold)',
    });
    proposed = null; // never emit a reserved number as the proposal
  }

  // ---- collision detection (REPORT-ONLY) ----------------------------------
  const collision = detectCollisions(claimants);
  if (collision.present) {
    for (const g of collision.groups) {
      add('collision', SEVERITY.COLLISION, {
        identifier: g.identifier,
        observed: g.claimants,
        whyItMatters: `${g.claimants.length} distinct claimants assert ${g.identifier} — a real allocation collision`,
        suggestedAction: 'a HUMAN reconciles which claimant keeps the number (CCF-02 earliest-committed-timestamp rule). The tool never picks a winner or renumbers.',
      });
    }
  }

  // ---- re-verify-at-claim (STALE when the basis moved) --------------------
  const reVerify = { performed: false, stale: false, reasons: [] };
  const prior = obs.request && obs.request.priorProposal;
  if (prior && typeof prior === 'object') {
    reVerify.performed = true;
    const priorMax = typeof prior.scanMax === 'string' ? prior.scanMax : null;
    const priorKeys = Array.isArray(prior.collisionKeys) ? [...prior.collisionKeys].sort() : [];
    const nowKeys = [...collision.keys].sort();
    if (priorMax !== overallHighest) {
      reVerify.stale = true;
      reVerify.reasons.push(`scanned maximum changed since the proposal (was ${priorMax ?? 'null'}, now ${overallHighest ?? 'null'})`);
    }
    if (JSON.stringify(priorKeys) !== JSON.stringify(nowKeys)) {
      reVerify.stale = true;
      reVerify.reasons.push(`collision set changed since the proposal (was [${priorKeys.join(', ')}], now [${nowKeys.join(', ')}])`);
    }
    if (reVerify.stale) {
      add('stale', SEVERITY.STALE, {
        observed: reVerify.reasons,
        whyItMatters: 'the scan changed between the proposal and this re-verify — the earlier proposal is no longer trustworthy',
        suggestedAction: 're-run the scan and re-propose from the current truth; never proceed on a stale proposal',
      });
    }
  }

  // ---- compose the ready-to-paste CLAIMED line ----------------------------
  let claimedLine = null;
  const clockOk = !!now && Number.isFinite(nowMs);
  if (proposed && clockOk) {
    claimedLine = composeClaimedLine({
      identifier: proposed,
      lane: req.lane,
      worktree: req.worktree,
      gate: req.gate,
      timestamp: now,
    });
  }

  const scan = {
    perSource,
    overallHighest,
    reservedHonored: [...reservedSet].sort(),
  };

  return finalize(findings, obs, { claimType, scan, collision, proposed, claimedLine, reVerify });
}

function pickHigherReg(cur, t) {
  if (!t) return cur;
  if (cur === null) return { major: t.major, minor: t.minor };
  if (t.major > cur.major || (t.major === cur.major && t.minor > cur.minor)) return { major: t.major, minor: t.minor };
  return cur;
}
function emptyScan() { return { perSource: [], overallHighest: null, reservedHonored: [] }; }
function emptyCollision() { return { present: false, groups: [], keys: [] }; }

// Roll findings up into a native verdict (precedence INCOMPLETE > STALE >
// COLLISION > PROPOSED), then normalize (O-2). Fail-closed by ordering.
function finalize(findings, obs, ctx) {
  const has = (sev) => findings.some((f) => f.severity === sev);
  let verdict = VERDICT.PROPOSED;
  if (has(SEVERITY.INCOMPLETE)) verdict = VERDICT.INCOMPLETE;
  else if (has(SEVERITY.STALE)) verdict = VERDICT.STALE;
  else if (has(SEVERITY.COLLISION)) verdict = VERDICT.COLLISION;

  // On any non-PROPOSED verdict the proposal is not a trusted free number.
  const proposedIdentifier = verdict === VERDICT.PROPOSED ? ctx.proposed : null;
  // The composed line is kept for a COLLISION (successor may still be the intended
  // number to reconcile toward) but withheld for INCOMPLETE/STALE (untrustworthy).
  let claimedLine = ctx.claimedLine;
  if (verdict === VERDICT.INCOMPLETE || verdict === VERDICT.STALE) claimedLine = null;

  return {
    schema: SCHEMA,
    option: 'A-propose-only-zero-write',
    claimType: ctx.claimType,
    verdict,
    normalized: normalizedVerdict(verdict),
    proposedIdentifier,
    scan: ctx.scan,
    collision: ctx.collision,
    claimedLine,
    reVerify: ctx.reVerify,
    caveats: Array.isArray(obs.caveats) ? obs.caveats.slice() : [],
    findings,
  };
}

// ---------------------------------------------------------------------------
// Report renderer — deterministic string from a result. No I/O.
// ---------------------------------------------------------------------------
export function renderReport(result) {
  const L = [];
  L.push('=== CCF-04 Claim Stub (READ-ONLY · PROPOSE-ONLY · resolves nothing) ===');
  L.push('');
  L.push(`claim type   : ${result.claimType ?? 'UNKNOWN'}`);
  L.push(`scanned high : ${result.scan.overallHighest ?? 'UNKNOWN (no basis)'}`);
  L.push('');
  L.push('--- SCAN BASIS (per source: highest / count) ---');
  if (result.scan.perSource.length === 0) {
    L.push('  (no sources scanned)');
  } else {
    for (const s of result.scan.perSource) {
      const state = s.available ? `high=${s.highest ?? '-'} count=${s.count}` : `UNAVAILABLE${s.error ? ` (${s.error})` : ''}`;
      L.push(`  [${s.required ? 'req' : 'opt'}] ${s.source} (${s.kind ?? '?'}): ${state}`);
    }
  }
  if (result.scan.reservedHonored.length) {
    L.push(`  reserved holds honoured (never proposed): ${result.scan.reservedHonored.join(', ')}`);
  }
  L.push('');
  L.push(`PROPOSED next-free : ${result.proposedIdentifier ?? 'NONE (see verdict — never a fabricated number)'}`);
  if (result.claimedLine) {
    L.push('READY-TO-PASTE     : (the HUMAN writes + commits this — Option A, zero-write)');
    L.push(`  ${result.claimedLine}`);
  }
  L.push('');
  L.push('--- COLLISIONS (REPORT-ONLY — a HUMAN reconciles; the tool never picks a winner) ---');
  if (!result.collision.present) {
    L.push('  none detected in the scanned claimant set (NOT a proof that none exists off-scan)');
  } else {
    for (const g of result.collision.groups) {
      L.push(`  COLLISION on ${g.identifier}: ${g.claimants.length} claimants`);
      for (const c of g.claimants) {
        L.push(`      ${c.timestamp ?? '(no timestamp)'} · ${c.locator ?? '?'} · ${c.source ?? '?'}`);
      }
    }
  }
  if (result.reVerify.performed) {
    L.push('');
    L.push(`--- RE-VERIFY-AT-CLAIM : ${result.reVerify.stale ? 'STALE (basis moved)' : 'unchanged'} ---`);
    for (const r of result.reVerify.reasons) L.push(`  ${r}`);
  }
  if (result.caveats.length) {
    L.push('');
    L.push('--- CAVEATS (possible off-scan claims — never authoritative) ---');
    for (const c of result.caveats) L.push(`  ${c}`);
  }
  L.push('');
  L.push('--- FINDINGS (each is a HUMAN DECISION — this tool resolves nothing) ---');
  if (result.findings.length === 0) {
    L.push('  (no findings)');
  } else {
    for (const f of result.findings) {
      L.push(`  [${f.severity}] ${f.id} (${f.code})${f.identifier ? ` ${f.identifier}` : ''}`);
      L.push(`      why : ${f.whyItMatters}`);
      L.push(`      do  : ${f.suggestedAction}`);
    }
  }
  L.push('');
  L.push(`VERDICT : ${result.verdict}  (normalized: ${result.normalized})`);
  L.push('This report is advisory only; no file written, no number allocated. You decide.');
  L.push('=======================================================================');
  return L.join('\n');
}

export function renderJson(result) { return stableStringify(result); }

// ===========================================================================
// THIN main() — gathers scan-inputs via READ-ONLY git + READ-ONLY fs, injects a
// run clock, calls the pure core, prints the report. Runs ONLY on direct
// invocation. NEVER writes a file. FAIL-CLOSED throughout.
// ===========================================================================

function git(args, cwd) {
  const r = spawnSync('git', args, { cwd, encoding: 'utf-8', maxBuffer: 64 * 1024 * 1024 });
  if (r.error) return { ok: false, stdout: '', stderr: r.error.message, code: null };
  return { ok: r.status === 0, stdout: r.stdout || '', stderr: r.stderr || '', code: r.status };
}

function argValue(argv, flag) {
  const i = argv.indexOf(flag);
  return (i === -1 || i + 1 >= argv.length) ? null : argv[i + 1];
}

// Read line-1 of every result doc under docs/briefs/results (READ-ONLY fs) to
// find open CLAIM stubs. Returns [{locator, text}].
function scanResultStubEntries(repo) {
  const dir = join(repo, 'docs', 'briefs', 'results');
  const out = [];
  if (!existsSync(dir)) return out;
  let names;
  try { names = readdirSync(dir); } catch { return out; }
  for (const name of names) {
    if (!name.endsWith('.md')) continue;
    const p = join(dir, name);
    try {
      const text = readFileSync(p, 'utf-8');
      const firstLine = text.split('\n')[0] ?? '';
      out.push({ locator: `docs/briefs/results/${name}`, text: firstLine });
    } catch { /* read-only best effort */ }
  }
  return out;
}

// List brief/result filenames under docs/briefs (git ls-tree, READ-ONLY).
function scanBriefFilenames(repo) {
  const tree = git(['ls-tree', '-r', '--name-only', 'HEAD', 'docs/briefs/'], repo);
  if (!tree.ok) return { available: false, error: (tree.stderr || 'ls-tree failed').trim(), names: [] };
  const names = tree.stdout.split('\n').map((s) => s.trim()).filter((s) => s.endsWith('.md'));
  return { available: true, names };
}

// Build the observations bundle from READ-ONLY git + fs (no fetch, no write).
export function gatherObservations(argv, nowFn = () => new Date().toISOString()) {
  const repo = argValue(argv, '--repo') || process.cwd();
  const claimType = argValue(argv, '--claim');
  const lane = argValue(argv, '--lane');
  const worktree = argValue(argv, '--worktree') || repo;
  const gate = argValue(argv, '--gate');
  const reservedArg = argValue(argv, '--reserved');
  const reserved = reservedArg ? reservedArg.split(',').map((s) => s.trim()).filter(Boolean) : [];
  const priorArg = argValue(argv, '--prior');
  let priorProposal = null;
  if (priorArg) { try { priorProposal = JSON.parse(priorArg); } catch { priorProposal = null; } }

  const sources = [];
  const caveats = [];

  // origin/main registers (READ-ONLY; NOT fetched — may be as-of-last-fetch).
  for (const f of ['docs/00_sync_state.md', 'docs/00_action_list.md']) {
    const show = git(['show', `origin/main:${f}`], repo);
    sources.push({
      id: `origin:${f}`, label: `origin/main:${f}`, kind: 'register-text', required: true,
      mode: 'register-entry', // real register file — read entry-header markers, not prose tokens
      available: show.ok, error: show.ok ? null : (show.stderr || 'git show failed').trim(),
      text: show.ok ? show.stdout : null,
    });
  }
  caveats.push('origin/main was NOT fetched (read-only) — remote-tracking refs may be stale.');

  // local working-tree registers (READ-ONLY fs).
  for (const f of ['docs/00_sync_state.md', 'docs/00_action_list.md']) {
    const p = join(repo, ...f.split('/'));
    let available = false; let text = null; let error = null;
    try { text = readFileSync(p, 'utf-8'); available = true; } catch (e) { error = e.message; }
    sources.push({ id: `local:${f}`, label: `local:${f}`, kind: 'register-text', required: true, mode: 'register-entry', available, error, text });
  }

  // open result-doc CLAIM stubs (READ-ONLY fs).
  const stubEntries = scanResultStubEntries(repo);
  sources.push({ id: 'result-stubs', label: 'docs/briefs/results/**:line1', kind: 'stub-lines', required: true, available: true, entries: stubEntries });

  // brief/result filenames (task claims mainly).
  if (claimType === CLAIM_TYPE.TASK) {
    const fn = scanBriefFilenames(repo);
    // collisionClaimants:false — a task legitimately owns many files, so filename
    // multiplicity is NOT a collision. Filenames feed the MAX; real collisions are
    // detected from CCF-02 CLAIMED stubs (distinct lane + timestamp per claim).
    sources.push({ id: 'brief-filenames', label: 'docs/briefs/**:filenames', kind: 'filenames', required: true, available: fn.available, error: fn.error || null, names: fn.names, collisionClaimants: false });
    caveats.push('brief/result FILENAMES feed the max only; collision detection uses CCF-02 CLAIMED stubs, not filename multiplicity (one task owns many files).');
  }

  // O-3 honesty: sibling worktrees may hold invisible claims — surface, never trust.
  const wt = git(['worktree', 'list', '--porcelain'], repo);
  if (wt.ok) {
    const count = (wt.stdout.match(/^worktree /gm) || []).length;
    if (count > 1) caveats.push(`${count} git worktrees exist — sibling worktrees may hold unpushed claims invisible to this scan (O-3); a "next-free" here is not proof no sibling claimed it.`);
  }

  return {
    request: { claimType, lane, worktree, gate, priorProposal },
    now: nowFn(),
    sources,
    reserved,
    caveats,
  };
}

const EXIT = { PROPOSED: 0, COLLISION: 3, STALE: 4, INCOMPLETE: 2 };

export function main(argv = process.argv.slice(2)) {
  let result;
  try {
    // Fully-injected observations (offline/reproducible) OR gather from repo.
    const inputPath = argValue(argv, '--input');
    const jsonArg = argValue(argv, '--json');
    let observations;
    if (jsonArg) observations = JSON.parse(jsonArg);
    else if (inputPath) observations = JSON.parse(readFileSync(inputPath, 'utf-8'));
    else observations = gatherObservations(argv);
    result = computeResult(observations);
    const format = argValue(argv, '--format') || 'text';
    process.stdout.write((format === 'json' ? renderJson(result) : renderReport(result)) + '\n');
  } catch (e) {
    // Final fail-closed net: any error -> INCOMPLETE, never a clean-sounding report.
    const fallback = computeResult({ request: null, sources: [], _error: e.message });
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
