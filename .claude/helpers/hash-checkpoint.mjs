// hash-checkpoint.mjs — CCF-04 Mechanical Assistant #2 (Hash Checkpoint)
//
// PURPOSE
//   A lane runs this BEFORE it trusts an artifact hash as a pin to answer one
//   question: "Is this artifact stable enough to be pinned, and can its exact
//   bytes be reproduced from the declared source?" It PRINTS a situational
//   report + a verdict and RESOLVES NOTHING. It is a lens, not a fixer.
//
// WHAT IT IS (charter: docs/briefs/ccf-04-mechanical-assistants-charter.md;
//   Gate-1 brief: docs/briefs/ccf-04-hash-checkpoint-gate1-brief-v1.md)
//   Zero-authority, deterministic, read-only. It removes manual effort
//   (re-hashing, re-reading, and git-reproducing an artifact by hand) WITHOUT
//   removing judgment (which pin is authoritative, whether to freeze, whether a
//   gate passes — all stay with the human). It mirrors the PROVEN shape of
//   source-truth-check.mjs: exported PURE-CORE functions (deterministic,
//   unit-testable with injected observations, no I/O) driven by a thin main()
//   that runs only on direct invocation, FAIL-CLOSED throughout.
//
// THE VERDICT CONTRACT (PK-resolved)
//   Native: STABLE · UNSTABLE · INCOMPLETE · MISMATCH.
//   Normalized (CCF-02, PK O-3 override): STABLE→clean · UNSTABLE→block ·
//   INCOMPLETE→block · MISMATCH→block. (MISMATCH is BLOCK, not escalate.)
//   A STABLE working-tree result MUST report "STABLE BUT NOT IMMUTABLE".
//   "IMMUTABLE CHECKPOINT" may be reported ONLY for an exact-commit-SHA
//   reproduction.
//
// TWO HONESTY GUARDRAILS (the whole point)
//   1. Never resolves, never writes. No stage/commit/checkout/reset/lock/kill/
//      modify; no fs WRITE anywhere; git is read-only only (rev-parse / show /
//      cat-file / ls-tree). It never messages or controls the owner session.
//      Every risk is printed as a HUMAN DECISION.
//   2. Never a false STABLE / IMMUTABLE. A false STABLE or false IMMUTABLE is
//      the HIGHEST-SEVERITY failure. Every ambiguity resolves toward
//      UNSTABLE/INCOMPLETE, never toward a fabricated STABLE. Any internal /
//      parse / validation error → INCOMPLETE.

import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { readFileSync, statSync, existsSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

// ===========================================================================
// PURE CORE — no side effects, no fs, no git, no clock. Injected observations
// in, structured result out. These are what the unit tests exercise.
// ===========================================================================

export const VERDICT = {
  STABLE: 'STABLE',
  UNSTABLE: 'UNSTABLE',
  INCOMPLETE: 'INCOMPLETE',
  MISMATCH: 'MISMATCH',
};

// CCF-02 normalized vocabulary. PK O-3 override: MISMATCH maps to BLOCK, not
// escalate. Only STABLE is clean; every other native verdict is block.
export const NORMALIZED = { CLEAN: 'clean', BLOCK: 'block' };

// Finding severities — each finding contributes at most one verdict class.
export const SEVERITY = {
  INFO: 'INFO',
  DECISION: 'DECISION',
  MISMATCH: 'MISMATCH',
  UNSTABLE: 'UNSTABLE',
  INCOMPLETE: 'INCOMPLETE',
};

// Source identity of the bytes being checkpointed.
export const SOURCE = {
  WORKING_TREE: 'working-tree',
  WORKTREE: 'isolated-worktree',
  INDEX: 'staged-index',
  COMMITTED_REF: 'committed-ref',
};

// Checkpoint purpose (declared by the invoker — NEVER inferred from filenames).
export const PURPOSE = {
  AUTHOR_FREEZE: 'author-freeze',
  REVIEW_HANDOFF: 'review-handoff',
  APPLY_HANDOFF: 'apply-handoff',
  REGISTER_POINTER: 'register-pointer',
};

// Checkpoint lifecycle classification (check 10).
export const LIFECYCLE = {
  PROVISIONAL: 'provisional-observation',
  STABLE_WT: 'stable-working-tree',
  COMMITTED_IMMUTABLE: 'committed-immutable',
  SUPERSEDED: 'superseded',
};

// Owner-state words that mean the writer is NOT idle.
const ACTIVE_STATES = new Set(['active', 'writing', 'busy', 'editing', 'running']);

// O-1 quiet-interval tiers (PK). Named constants, never magic numbers in logic.
export const DEFAULT_QUIET_INTERVAL_SEC = 10; // ordinary observation default
export const FREEZE_MIN_INTERVAL_SEC = 60;    // working-tree pre-freeze floor

// Required phrases (checks 3/4).
export const PHRASE_STABLE_NOT_IMMUTABLE = 'STABLE BUT NOT IMMUTABLE';
export const PHRASE_IMMUTABLE = 'IMMUTABLE CHECKPOINT';

export const SCHEMA = 'ccf-04-hash-checkpoint/v1';

// --- normalized mapping (PK O-3) -------------------------------------------
export function normalizedVerdict(native) {
  return native === VERDICT.STABLE ? NORMALIZED.CLEAN : NORMALIZED.BLOCK;
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

// --- deterministic path normalization (check 5) ----------------------------
// Normalizes separators only. NEVER lowercases (paths are case-sensitive) and
// NEVER absolutizes (keeps the declared identity as given).
export function normalizePath(p) {
  if (typeof p !== 'string') return '';
  return p.replace(/\\/g, '/').replace(/\/{2,}/g, '/').replace(/\/+$/, '').trim();
}

// --- input validation (typed/validated JSON in) ----------------------------
// A malformed / absent required field → NOT ok. The caller turns !ok into
// INCOMPLETE — a fabricated STABLE is never produced from a bad request.
export function validateRequest(req) {
  const errors = [];
  if (!req || typeof req !== 'object' || Array.isArray(req)) {
    return { ok: false, errors: ['request is not a JSON object'], normalized: null };
  }
  const artifacts = Array.isArray(req.artifacts) ? req.artifacts : null;
  if (!artifacts || artifacts.length === 0) {
    errors.push('artifacts: required non-empty array of {path}');
  } else {
    artifacts.forEach((a, i) => {
      if (!a || typeof a !== 'object' || typeof a.path !== 'string' || a.path.trim() === '') {
        errors.push(`artifacts[${i}].path: required non-empty string`);
      }
    });
  }
  if (typeof req.lane !== 'string' || req.lane.trim() === '') {
    errors.push('lane: required non-empty string (owning lane/session)');
  }
  const purposes = Object.values(PURPOSE);
  if (!purposes.includes(req.purpose)) {
    errors.push(`purpose: required one of ${purposes.join(' | ')} (never inferred from a filename)`);
  }
  let quiet = req.quietInterval;
  if (quiet === undefined || quiet === null) quiet = DEFAULT_QUIET_INTERVAL_SEC;
  if (typeof quiet !== 'number' || !Number.isFinite(quiet) || quiet <= 0) {
    errors.push('quietInterval: must be a positive number of seconds');
  }
  if (req.pins !== undefined && (typeof req.pins !== 'object' || req.pins === null || Array.isArray(req.pins))) {
    errors.push('pins: when present, must be an object of {author,reviewer,applyHand,register,committedRef}');
  }
  if (errors.length) return { ok: false, errors, normalized: null };
  return { ok: true, errors: [], normalized: { ...req, quietInterval: quiet } };
}

// --- parse an ISO/epoch timestamp to ms; NaN when unparseable --------------
function toMs(t) {
  if (typeof t === 'number' && Number.isFinite(t)) return t;
  if (typeof t === 'string' && t.trim() !== '') {
    const ms = Date.parse(t);
    return Number.isFinite(ms) ? ms : NaN;
  }
  return NaN;
}

// --- check 1: writer/owner state (O-2) -------------------------------------
// Requires invoker-supplied timestamped owner-state that BRACKETS the interval
// and is IDLE at start AND end. NEVER infers idle from matching hashes.
// Returns { status: 'idle'|'active'|'incomplete', reasons:[], start, end }.
export function checkOwnerState(samplesIn, firstReadMs, lastReadMs) {
  const reasons = [];
  const samples = Array.isArray(samplesIn) ? samplesIn : (samplesIn ? [samplesIn] : []);
  if (samples.length === 0) {
    return { status: 'incomplete', reasons: ['owner-state evidence absent'], start: null, end: null };
  }
  const parsed = [];
  for (const s of samples) {
    const at = toMs(s && s.at);
    const status = (s && typeof s.status === 'string') ? s.status.trim().toLowerCase() : null;
    if (!Number.isFinite(at) || !status) {
      return { status: 'incomplete', reasons: ['owner-state sample missing a valid timestamp or status (unvalidatable)'], start: null, end: null };
    }
    parsed.push({ at, status });
  }
  if (!Number.isFinite(firstReadMs) || !Number.isFinite(lastReadMs)) {
    return { status: 'incomplete', reasons: ['cannot bracket owner-state without valid read timestamps'], start: null, end: null };
  }
  // Start = latest sample at-or-before the first read; End = earliest at-or-after the last read.
  const startCandidates = parsed.filter((p) => p.at <= firstReadMs).sort((a, b) => b.at - a.at);
  const endCandidates = parsed.filter((p) => p.at >= lastReadMs).sort((a, b) => a.at - b.at);
  const start = startCandidates[0] || null;
  const end = endCandidates[0] || null;
  if (!start) reasons.push('no owner-state sample at or before the START of the quiet interval (absent/stale)');
  if (!end) reasons.push('no owner-state sample at or after the END of the quiet interval (absent/stale)');
  if (!start || !end) return { status: 'incomplete', reasons, start, end };
  if (ACTIVE_STATES.has(start.status) || ACTIVE_STATES.has(end.status)) {
    reasons.push(`owner not idle across the interval (start="${start.status}", end="${end.status}")`);
    return { status: 'active', reasons, start, end };
  }
  return { status: 'idle', reasons: [], start, end };
}

// --- check 2/7: repeated-hash + quiet-period integrity ---------------------
// Requires >=2 reads with identical size, mtime, inode, AND content hash.
// Detects create/delete/rename mid-interval. Returns a status + reasons.
export function checkReadStability(readsIn) {
  const reads = Array.isArray(readsIn) ? readsIn : [];
  if (reads.length === 0) {
    return { status: 'incomplete', reasons: ['no working-tree reads gathered'], elapsedMs: NaN, hash: null };
  }
  if (reads.some((r) => r && r.error)) {
    return { status: 'incomplete', reasons: ['a read errored — cannot assess stability'], elapsedMs: NaN, hash: null };
  }
  const existFlags = reads.map((r) => r && r.exists !== false);
  const anyExist = existFlags.some(Boolean);
  const allExist = existFlags.every(Boolean);
  if (!anyExist) {
    return { status: 'incomplete', reasons: ['declared artifact does not exist in any read (missing source)'], elapsedMs: NaN, hash: null };
  }
  if (!allExist) {
    // Created or deleted DURING the observation — quiet-period integrity broken.
    return { status: 'unstable', reasons: ['artifact created/deleted during the observation window'], elapsedMs: NaN, hash: null };
  }
  if (reads.length < 2) {
    return { status: 'incomplete', reasons: ['only one read — cannot confirm stability across a quiet interval'], elapsedMs: NaN, hash: reads[0].hashRaw || null };
  }
  const first = reads[0];
  const last = reads[reads.length - 1];
  const firstMs = toMs(first.at);
  const lastMs = toMs(last.at);
  const elapsedMs = (Number.isFinite(firstMs) && Number.isFinite(lastMs)) ? (lastMs - firstMs) : NaN;
  const reasons = [];
  const base = reads[0];
  for (let i = 1; i < reads.length; i++) {
    const r = reads[i];
    if (r.hashRaw !== base.hashRaw) reasons.push(`content hash changed between reads (${base.hashRaw} -> ${r.hashRaw})`);
    if (r.size !== base.size) reasons.push(`size changed between reads (${base.size} -> ${r.size})`);
    if (r.mtimeMs !== base.mtimeMs) reasons.push(`mtime changed between reads (${base.mtimeMs} -> ${r.mtimeMs})`);
    if (r.inode !== undefined && base.inode !== undefined && r.inode !== base.inode) {
      reasons.push(`file identity/inode changed between reads (${base.inode} -> ${r.inode}) — replaced/renamed`);
    }
  }
  if (reasons.length > 0) return { status: 'unstable', reasons, elapsedMs, hash: null };
  return { status: 'stable', reasons: [], elapsedMs, hash: base.hashRaw };
}

// --- check 4: git-ref reproducibility (immutable-ref rule) -----------------
// IMMUTABLE requires an EXACT COMMIT SHA. A symbolic ref must resolve to and
// RECORD a single exact SHA; two distinct resolutions = the ref MOVED = UNSTABLE.
export function resolveRefStatus(refResolution) {
  if (!refResolution || typeof refResolution !== 'object') {
    return { status: 'none', resolvedSha: null, reasons: [] };
  }
  if (refResolution.error) {
    return { status: 'incomplete', resolvedSha: null, reasons: [`ref could not be resolved: ${refResolution.error}`] };
  }
  const shas = Array.isArray(refResolution.resolvedShas)
    ? refResolution.resolvedShas.filter((s) => typeof s === 'string' && s.trim())
    : [];
  const distinct = [...new Set(shas.map((s) => s.trim()))];
  if (distinct.length === 0) {
    return { status: 'incomplete', resolvedSha: null, reasons: ['ref supplied but no commit SHA was recorded'] };
  }
  if (distinct.length > 1) {
    return {
      status: 'moved',
      resolvedSha: null,
      reasons: [`ref "${refResolution.requestedRef}" resolved to DIFFERENT commit SHAs between observations (${distinct.join(', ')}) — the ref moved`],
    };
  }
  const sha = distinct[0];
  const isExactSha = /^[0-9a-f]{40}$/i.test(sha);
  const reasons = [];
  if (refResolution.isExactShaInput === false) {
    reasons.push(`symbolic ref "${refResolution.requestedRef}" resolved to exact commit SHA ${sha} — pin the SHA, not the moving ref`);
  }
  return { status: isExactSha ? 'exact' : 'incomplete', resolvedSha: sha, reasons };
}

// --- check 6: downstream pin consistency (O-3) -----------------------------
// Enumerates EVERY supplied pin + its source. On disagreement → MISMATCH.
// NEVER selects an authoritative hash.
export function comparePins(pins, observedHash) {
  const entries = [];
  const map = [
    ['author', 'author'],
    ['reviewer', 'reviewer'],
    ['applyHand', 'apply-hand'],
    ['register', 'register'],
    ['committedRef', 'committed-ref'],
  ];
  if (pins && typeof pins === 'object') {
    for (const [key, label] of map) {
      const val = pins[key];
      if (typeof val === 'string' && val.trim() !== '') entries.push({ source: label, value: val.trim() });
    }
  }
  if (typeof observedHash === 'string' && observedHash.trim() !== '') {
    entries.push({ source: 'observed', value: observedHash.trim() });
  }
  const distinct = [...new Set(entries.map((e) => e.value))];
  const mismatch = entries.length >= 2 && distinct.length > 1;
  return { entries, mismatch, distinctCount: distinct.length };
}

// --- multi-file rollup (check 5) -------------------------------------------
// Deterministic: stable sort of normalized "path\thash" lines, then sha256.
export function computeRollup(items) {
  const lines = items
    .map((it) => `${normalizePath(it.path)}\t${it.hash}`)
    .sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
  const rollup = createHash('sha256').update(lines.join('\n')).digest('hex');
  return { rollup, orderedLines: lines };
}

// --- the assessment: observations in, structured result out ----------------
// Deterministic and pure. Fail-closed: any doubt resolves toward
// INCOMPLETE/UNSTABLE, never toward a fabricated STABLE.
export function computeResult(observations) {
  const obs = observations || {};
  const findings = [];
  let seq = 0;
  const add = (check, severity, fields) => {
    seq += 1;
    findings.push({
      id: `HC-c${check}-${String(seq).padStart(2, '0')}`,
      check,
      severity,
      artifactPath: fields.artifactPath ?? null,
      ref: fields.ref ?? null,
      sourceIdentity: fields.sourceIdentity ?? null,
      observed: fields.observed ?? null,
      declared: fields.declared ?? null,
      whyItMatters: fields.whyItMatters,
      suggestedAction: fields.suggestedAction,
    });
  };

  // ---- validate input (fail-closed → INCOMPLETE) --------------------------
  const v = validateRequest(obs.request);
  if (!v.ok) {
    for (const e of v.errors) {
      add(9, SEVERITY.INCOMPLETE, {
        whyItMatters: `invalid/absent required input: ${e}`,
        suggestedAction: 'supply a complete, well-typed checkpoint request; a malformed request can NEVER certify STABLE',
      });
    }
    return finalize(findings, obs, { req: null, sourceClass: null, immutableEligible: false, phraseHash: null });
  }
  const req = v.normalized;

  const arts = Array.isArray(obs.artifacts) ? obs.artifacts : [];
  if (arts.length === 0) {
    add(9, SEVERITY.INCOMPLETE, {
      whyItMatters: 'no per-artifact evidence was gathered — stability cannot be assessed (missing source)',
      suggestedAction: 'gather working-tree reads and/or a committed-ref blob for each declared artifact',
    });
    return finalize(findings, obs, { req, sourceClass: null, immutableEligible: false, phraseHash: null });
  }

  // ---- ref resolution (check 4) -------------------------------------------
  const refStat = resolveRefStatus(obs.refResolution);
  if (refStat.status === 'moved') {
    add(4, SEVERITY.UNSTABLE, {
      ref: obs.refResolution && obs.refResolution.requestedRef,
      observed: (obs.refResolution && obs.refResolution.resolvedShas) || null,
      whyItMatters: refStat.reasons.join('; '),
      suggestedAction: 'a moving ref cannot be pinned — re-issue the checkpoint against a single exact commit SHA',
    });
  } else if (refStat.status === 'incomplete') {
    add(4, SEVERITY.INCOMPLETE, {
      ref: obs.refResolution && obs.refResolution.requestedRef,
      whyItMatters: refStat.reasons.join('; '),
      suggestedAction: 'resolve the ref to a recorded exact commit SHA before treating it as immutable',
    });
  } else if (refStat.status === 'exact' && refStat.reasons.length) {
    add(4, SEVERITY.DECISION, {
      ref: obs.refResolution && obs.refResolution.requestedRef,
      observed: refStat.resolvedSha,
      whyItMatters: refStat.reasons.join('; '),
      suggestedAction: 'record and pin the exact commit SHA rather than the symbolic ref',
    });
  }

  // ---- per-artifact assessment --------------------------------------------
  const perArtSource = [];
  const stableItems = []; // {path, hash} for rollup / identity
  const hashByPath = new Map();
  let workingTreeElapsedMs = NaN;
  let sawWorkingTree = false;

  for (const a of arts) {
    const path = (a && typeof a.path === 'string') ? a.path : '(unknown)';
    const src = (a && a.sourceIdentity) || SOURCE.WORKING_TREE;
    perArtSource.push(src);

    if (src === SOURCE.COMMITTED_REF) {
      // Trust flows from an exact-SHA reproduction (check 4), not a timed interval.
      const blob = a.gitBlob || null;
      if (!blob || blob.present === false || blob.error) {
        add(9, SEVERITY.INCOMPLETE, {
          artifactPath: path, sourceIdentity: src,
          observed: blob ? blob.error || 'not present' : 'no blob gathered',
          whyItMatters: 'committed-ref artifact could not be read at the declared ref (missing source)',
          suggestedAction: 'confirm the path exists at the exact commit SHA before pinning',
        });
        continue;
      }
      const hash = blob.hashRaw;
      // check 4: expected/pinned hash must reproduce byte-for-byte.
      if (typeof a.expectedHash === 'string' && a.expectedHash.trim() && a.expectedHash.trim() !== hash) {
        add(4, SEVERITY.MISMATCH, {
          artifactPath: path, sourceIdentity: src, ref: refStat.resolvedSha,
          observed: hash, declared: a.expectedHash.trim(),
          whyItMatters: 'the declared/pinned hash does NOT reproduce from the ref byte-for-byte',
          suggestedAction: 'do not trust the pin — reconcile which bytes are authoritative (a human decision)',
        });
      } else {
        add(4, SEVERITY.INFO, {
          artifactPath: path, sourceIdentity: src, ref: refStat.resolvedSha,
          observed: { hash, blobId: blob.blobId ?? null, pathAtRef: blob.pathAtRef ?? path },
          whyItMatters: 'artifact reproduced from the exact commit SHA (repo identity + path + blob + content hash recorded)',
          suggestedAction: 'this is an immutable-ref reproduction; still a human decision whether to pin it',
        });
      }
      hashByPath.set(path, hash);
      stableItems.push({ path, hash });
      // check 8: if a working-tree copy was ALSO gathered, compare line endings.
      lineEndingCheck(a, hash, path, add);
      continue;
    }

    // --- working-tree / worktree / index source ---
    sawWorkingTree = true;
    const stab = checkReadStability(a.reads);
    if (stab.status === 'incomplete') {
      add(2, SEVERITY.INCOMPLETE, {
        artifactPath: path, sourceIdentity: src,
        whyItMatters: stab.reasons.join('; '),
        suggestedAction: 'gather >=2 clean reads across the quiet interval before assessing stability',
      });
      continue;
    }
    if (stab.status === 'unstable') {
      add(7, SEVERITY.UNSTABLE, {
        artifactPath: path, sourceIdentity: src,
        observed: stab.reasons,
        whyItMatters: 'artifact changed during the quiet interval — a hash taken now is a FALSE PIN',
        suggestedAction: 'wait until the artifact is idle and unchanging, then re-checkpoint',
      });
      continue;
    }
    // stable bytes so far — record elapsed for the freeze-floor check.
    if (Number.isFinite(stab.elapsedMs)) {
      workingTreeElapsedMs = Number.isFinite(workingTreeElapsedMs)
        ? Math.min(workingTreeElapsedMs, stab.elapsedMs)
        : stab.elapsedMs;
    }
    const hash = stab.hash;
    if (typeof a.expectedHash === 'string' && a.expectedHash.trim() && a.expectedHash.trim() !== hash) {
      add(6, SEVERITY.MISMATCH, {
        artifactPath: path, sourceIdentity: src,
        observed: hash, declared: a.expectedHash.trim(),
        whyItMatters: 'observed working-tree hash does not match the declared/expected hash',
        suggestedAction: 'reconcile which value is authoritative (a human decision) — the tool does not choose',
      });
    }
    hashByPath.set(path, hash);
    stableItems.push({ path, hash });
    lineEndingCheck(a, hash, path, add);
  }

  const allCommitted = perArtSource.length > 0 && perArtSource.every((s) => s === SOURCE.COMMITTED_REF);
  const sourceClass = allCommitted ? 'committed-ref' : 'working-tree';

  // ---- check 1 + O-1 freeze floor (working-tree only) ---------------------
  if (sawWorkingTree) {
    // Determine the overall interval from the artifacts' reads.
    const firstMs = minReadMs(arts, true);
    const lastMs = minReadMs(arts, false);
    const owner = checkOwnerState(obs.request.ownerState, firstMs, lastMs);
    if (owner.status === 'incomplete') {
      add(1, SEVERITY.INCOMPLETE, {
        whyItMatters: `writer/owner state unusable — ${owner.reasons.join('; ')}. Idle is NEVER inferred from matching hashes.`,
        suggestedAction: 'supply timestamped owner-state that brackets the interval and is idle at start AND end',
      });
    } else if (owner.status === 'active') {
      add(1, SEVERITY.UNSTABLE, {
        observed: { start: owner.start, end: owner.end },
        whyItMatters: `owner still active — ${owner.reasons.join('; ')}. A hash taken while a session is still writing is a FALSE PIN.`,
        suggestedAction: 'wait for the owner to go idle for the full interval, then re-checkpoint',
      });
    }
    // O-1: a working-tree freeze needs >= FREEZE_MIN_INTERVAL_SEC of observed quiet.
    const floorMs = FREEZE_MIN_INTERVAL_SEC * 1000;
    if (Number.isFinite(workingTreeElapsedMs) && workingTreeElapsedMs < floorMs) {
      add(1, SEVERITY.INCOMPLETE, {
        observed: { observedQuietSec: workingTreeElapsedMs / 1000, freezeFloorSec: FREEZE_MIN_INTERVAL_SEC },
        whyItMatters: `observed quiet interval (${workingTreeElapsedMs / 1000}s) is below the ${FREEZE_MIN_INTERVAL_SEC}s freeze floor — reportable ONLY as a provisional observation, cannot certify a freeze`,
        suggestedAction: 'increase the quiet interval to >=60s (or an explicit author-idle confirmation) before pinning',
      });
    }
  }

  // ---- check 5: multi-file rollup -----------------------------------------
  let rollupHash = null;
  if (stableItems.length > 0) {
    const { rollup, orderedLines } = computeRollup(stableItems);
    rollupHash = rollup;
    if (stableItems.length > 1) {
      add(5, SEVERITY.INFO, {
        observed: { rollup, order: orderedLines },
        whyItMatters: 'deterministic multi-file rollup (stable sort + path normalization) — same tree always rolls up to the same value',
        suggestedAction: 'pin the rollup for the set; individual files remain independently identified',
      });
    }
  }

  // ---- check 3: equal bytes at distinct declared paths are NOT collapsed --
  const byHash = new Map();
  for (const it of stableItems) {
    const list = byHash.get(it.hash) || [];
    list.push(it.path);
    byHash.set(it.hash, list);
  }
  for (const [hash, paths] of byHash) {
    if (paths.length > 1) {
      add(3, SEVERITY.INFO, {
        observed: { hash, paths },
        whyItMatters: 'multiple DISTINCT declared paths share identical content — their artifact identities are reported separately, NOT collapsed',
        suggestedAction: 'confirm whether identical content at different paths is intended (a human decision)',
      });
    }
  }

  // ---- check 6: downstream pin consistency --------------------------------
  const observedHashForPins = stableItems.length === 1 ? stableItems[0].hash : rollupHash;
  const pinCmp = comparePins(req.pins, observedHashForPins);
  if (pinCmp.entries.length > 0) {
    add(6, SEVERITY.INFO, {
      observed: pinCmp.entries,
      whyItMatters: 'every supplied pin enumerated with its source (author/reviewer/apply-hand/register/committed-ref/observed)',
      suggestedAction: 'these are reported independently; the tool does NOT choose which pin is authoritative',
    });
  }
  if (pinCmp.mismatch) {
    add(6, SEVERITY.MISMATCH, {
      observed: pinCmp.entries,
      whyItMatters: `supplied pins DISAGREE (${pinCmp.distinctCount} distinct values) — reviewed/applied/registered bytes are not the same`,
      suggestedAction: 'a human must reconcile which pin is authoritative — the tool reports, it does not decide',
    });
  }

  // ---- check 10: lifecycle (superseded) -----------------------------------
  const supersededBy = supersededMarker(req);
  if (supersededBy) {
    add(10, SEVERITY.DECISION, {
      observed: { supersededBy },
      whyItMatters: 'this checkpoint is declared SUPERSEDED — it is not the current checkpoint',
      suggestedAction: 'use the superseding checkpoint; this one is retained as history only',
    });
  }

  // ---- immutability eligibility (checks 3/4) ------------------------------
  const immutableEligible =
    allCommitted &&
    refStat.status === 'exact' &&
    !findings.some((f) => f.check === 4 && (f.severity === SEVERITY.MISMATCH || f.severity === SEVERITY.INCOMPLETE || f.severity === SEVERITY.UNSTABLE));

  return finalize(findings, obs, {
    req,
    sourceClass,
    immutableEligible,
    phraseHash: observedHashForPins,
    rollupHash,
    stableItems,
    refStat,
    supersededBy,
  });
}

// Line-ending / serialization clarity (check 8). Compares a working-tree read
// against a committed git blob when BOTH are present for the same artifact.
function lineEndingCheck(a, primaryHash, path, add) {
  const wt = firstExistingRead(a.reads);
  const blob = a.gitBlob;
  if (!wt || !blob || blob.present === false || blob.error) return;
  const wtRaw = wt.hashRaw;
  const blobRaw = blob.hashRaw;
  if (typeof wtRaw !== 'string' || typeof blobRaw !== 'string') return;
  if (wtRaw === blobRaw) return; // byte-identical; nothing to report
  const wtLF = wt.hashLF;
  const blobLF = blob.hashLF;
  if (typeof wtLF === 'string' && typeof blobLF === 'string' && wtLF === blobLF) {
    add(8, SEVERITY.DECISION, {
      artifactPath: path, sourceIdentity: 'working-tree+committed-ref',
      observed: { workingTreeHash: wtRaw, committedBlobHash: blobRaw, lfNormalizedHash: wtLF },
      whyItMatters: 'working-tree bytes differ from the committed git blob by LINE ENDINGS ONLY (CRLF vs LF) — reported explicitly, NOT treated as byte-identical',
      suggestedAction: 'decide which byte form is authoritative (typically the committed LF blob); the EOL difference is cosmetic but real',
    });
  } else {
    add(8, SEVERITY.MISMATCH, {
      artifactPath: path, sourceIdentity: 'working-tree+committed-ref',
      observed: { workingTreeHash: wtRaw, committedBlobHash: blobRaw },
      whyItMatters: 'working-tree bytes differ from the committed git blob beyond line endings — the two sources are NOT the same content',
      suggestedAction: 'reconcile which source is authoritative (a human decision); do not silently pin either',
    });
  }
}

function firstExistingRead(reads) {
  if (!Array.isArray(reads)) return null;
  return reads.find((r) => r && r.exists !== false && !r.error) || null;
}

function minReadMs(arts, wantFirst) {
  let best = NaN;
  for (const a of arts) {
    if (!Array.isArray(a.reads) || a.reads.length === 0) continue;
    const read = wantFirst ? a.reads[0] : a.reads[a.reads.length - 1];
    const ms = toMs(read && read.at);
    if (!Number.isFinite(ms)) continue;
    if (!Number.isFinite(best)) best = ms;
    else best = wantFirst ? Math.min(best, ms) : Math.max(best, ms);
  }
  return best;
}

function supersededMarker(req) {
  if (req && req.lifecycle && typeof req.lifecycle === 'object' && typeof req.lifecycle.supersededBy === 'string' && req.lifecycle.supersededBy.trim()) {
    return req.lifecycle.supersededBy.trim();
  }
  if (req && typeof req.supersededBy === 'string' && req.supersededBy.trim()) return req.supersededBy.trim();
  return null;
}

// Roll findings up into a native verdict (precedence: INCOMPLETE > UNSTABLE >
// MISMATCH > STABLE), assign lifecycle + immutability phrase, and normalize.
function finalize(findings, obs, ctx) {
  const has = (sev) => findings.some((f) => f.severity === sev);
  let verdict = VERDICT.STABLE;
  if (has(SEVERITY.INCOMPLETE)) verdict = VERDICT.INCOMPLETE;
  else if (has(SEVERITY.UNSTABLE)) verdict = VERDICT.UNSTABLE;
  else if (has(SEVERITY.MISMATCH)) verdict = VERDICT.MISMATCH;

  const req = ctx.req;
  let lifecycle;
  let immutable = false;
  let phrase = null;

  if (ctx.supersededBy) {
    lifecycle = LIFECYCLE.SUPERSEDED;
  } else if (verdict === VERDICT.STABLE && ctx.sourceClass === 'committed-ref' && ctx.immutableEligible) {
    lifecycle = LIFECYCLE.COMMITTED_IMMUTABLE;
    immutable = true;
    phrase = PHRASE_IMMUTABLE;
  } else if (verdict === VERDICT.STABLE) {
    lifecycle = LIFECYCLE.STABLE_WT;
    phrase = PHRASE_STABLE_NOT_IMMUTABLE;
  } else {
    lifecycle = LIFECYCLE.PROVISIONAL;
  }

  return {
    schema: SCHEMA,
    verdict,
    normalized: normalizedVerdict(verdict),
    lifecycle,
    immutable,
    phrase,
    purpose: req ? req.purpose : null,
    lane: req ? req.lane : null,
    sourceClass: ctx.sourceClass,
    quietIntervalSec: req ? req.quietInterval : null,
    freezeFloorSec: FREEZE_MIN_INTERVAL_SEC,
    ref: (obs.refResolution && obs.refResolution.requestedRef) || null,
    resolvedSha: ctx.refStat ? ctx.refStat.resolvedSha : null,
    rollupHash: ctx.rollupHash || null,
    artifacts: (ctx.stableItems || []).map((it) => ({ path: it.path, hash: it.hash })),
    findings,
  };
}

// ---------------------------------------------------------------------------
// Report renderer — deterministic string from a result. No I/O.
// ---------------------------------------------------------------------------
export function renderReport(result) {
  const L = [];
  L.push('=== CCF-04 Hash Checkpoint (READ-ONLY · resolves nothing) ===');
  L.push('');
  L.push(`lane/session : ${result.lane ?? 'UNKNOWN'}`);
  L.push(`purpose      : ${result.purpose ?? 'UNKNOWN'}`);
  L.push(`source class : ${result.sourceClass ?? 'UNKNOWN'}`);
  if (result.ref) L.push(`ref          : ${result.ref}${result.resolvedSha ? ` -> ${result.resolvedSha}` : ''}`);
  L.push(`quiet interval: ${result.quietIntervalSec ?? 'n/a'}s (freeze floor ${result.freezeFloorSec}s)`);
  if (result.rollupHash) L.push(`rollup hash  : ${result.rollupHash}`);
  L.push('');
  L.push('--- FINDINGS (each is a HUMAN DECISION — this tool resolves nothing) ---');
  if (result.findings.length === 0) {
    L.push('  (no findings)');
  } else {
    for (const f of result.findings) {
      L.push(`  [${f.severity}] ${f.id} (check ${f.check})${f.artifactPath ? ` ${f.artifactPath}` : ''}`);
      L.push(`      why : ${f.whyItMatters}`);
      L.push(`      do  : ${f.suggestedAction}`);
    }
  }
  L.push('');
  L.push(`LIFECYCLE : ${result.lifecycle}`);
  if (result.phrase) L.push(`STATE     : ${result.phrase}`);
  L.push(`VERDICT   : ${result.verdict}  (normalized: ${result.normalized})`);
  if (result.verdict === VERDICT.STABLE && !result.immutable) {
    L.push('NOTE      : a working-tree checkpoint is STABLE BUT NOT IMMUTABLE — only an exact-commit-SHA reproduction is immutable.');
  }
  L.push('This report is advisory only; no action was taken. You decide.');
  L.push('==============================================================');
  return L.join('\n');
}

export function renderJson(result) {
  return stableStringify(result);
}

// ---------------------------------------------------------------------------
// THIN main() — gathers observations via read-only fs + read-only git, calls
// the pure core, prints the report. Runs ONLY on direct invocation. Never
// writes a file. Fail-closed throughout.
// ---------------------------------------------------------------------------

function git(args, cwd) {
  const r = spawnSync('git', args, { cwd, encoding: 'utf-8', maxBuffer: 64 * 1024 * 1024 });
  if (r.error) return { ok: false, stdout: '', stderr: r.error.message, code: null };
  return { ok: r.status === 0, stdout: r.stdout || '', stderr: r.stderr || '', code: r.status };
}

function gitBytes(args, cwd) {
  const r = spawnSync('git', args, { cwd, maxBuffer: 256 * 1024 * 1024 });
  if (r.error) return { ok: false, buf: null, stderr: r.error.message };
  return { ok: r.status === 0, buf: r.stdout, stderr: (r.stderr || '').toString() };
}

function sha256Hex(buf) {
  return createHash('sha256').update(buf).digest('hex');
}

// LF-normalize CRLF -> LF at the byte level, then hash.
function sha256LF(buf) {
  const lf = Buffer.from(buf).toString('latin1').replace(/\r\n/g, '\n');
  return createHash('sha256').update(Buffer.from(lf, 'latin1')).digest('hex');
}

// Synchronous sleep for the quiet interval (CLI only; unit tests never sleep).
function sleepSync(ms) {
  if (!(ms > 0)) return;
  const sab = new Int32Array(new SharedArrayBuffer(4));
  Atomics.wait(sab, 0, 0, ms);
}

function readArgs(argv) {
  const out = { input: null, json: null, format: 'text' };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--input' && i + 1 < argv.length) out.input = argv[++i];
    else if (a === '--json' && i + 1 < argv.length) out.json = argv[++i];
    else if (a === '--format' && i + 1 < argv.length) out.format = argv[++i];
  }
  return out;
}

function loadRequest(args) {
  if (args.json) return JSON.parse(args.json);
  if (args.input) return JSON.parse(readFileSync(args.input, 'utf-8'));
  // stdin fallback
  const raw = readFileSync(0, 'utf-8');
  return JSON.parse(raw);
}

function statFile(p) {
  const s = statSync(p);
  return { size: s.size, mtimeMs: s.mtimeMs, inode: s.ino };
}

// Read a working-tree file into a read record. Read-only.
function readWorkingTree(absPath, atIso) {
  if (!existsSync(absPath)) return { at: atIso, exists: false };
  try {
    const st = statFile(absPath);
    const buf = readFileSync(absPath);
    return { at: atIso, exists: true, size: st.size, mtimeMs: st.mtimeMs, inode: st.inode, hashRaw: sha256Hex(buf), hashLF: sha256LF(buf) };
  } catch (e) {
    return { at: atIso, exists: true, error: e.message };
  }
}

// Gather a committed-ref blob for a path. Read-only git.
function gatherGitBlob(cwd, sha, path) {
  const show = gitBytes(['show', `${sha}:${path}`], cwd);
  if (!show.ok || !show.buf) return { present: false, error: (show.stderr || 'git show failed').trim() };
  const blobId = git(['rev-parse', `${sha}:${path}`], cwd);
  return {
    present: true,
    hashRaw: sha256Hex(show.buf),
    hashLF: sha256LF(show.buf),
    blobId: blobId.ok ? blobId.stdout.trim() : null,
    pathAtRef: path,
  };
}

// Resolve a ref twice (start + end of the window) to catch a moving branch.
function resolveRef(cwd, ref) {
  const isExactShaInput = /^[0-9a-f]{40}$/i.test(ref);
  const one = git(['rev-parse', `${ref}^{commit}`], cwd);
  if (!one.ok) return { requestedRef: ref, resolvedShas: [], isExactShaInput, error: (one.stderr || 'rev-parse failed').trim() };
  const repoId = git(['rev-parse', '--show-toplevel'], cwd);
  return {
    requestedRef: ref,
    resolvedShas: [one.stdout.trim()],
    isExactShaInput,
    repoId: repoId.ok ? repoId.stdout.trim() : null,
  };
}

function reResolveRef(cwd, ref, resolution) {
  if (!resolution || resolution.error) return resolution;
  const two = git(['rev-parse', `${ref}^{commit}`], cwd);
  if (two.ok) resolution.resolvedShas.push(two.stdout.trim());
  return resolution;
}

// Gather all observations for a request. Read-only. Never throws out.
export function gatherObservations(req, nowFn = () => new Date().toISOString()) {
  const cwd = req.repo || req.worktree || process.cwd();
  const ref = typeof req.ref === 'string' && req.ref.trim() ? req.ref.trim() : null;
  let refResolution = ref ? resolveRef(cwd, ref) : null;

  const artifacts = [];
  const needSleep = Array.isArray(req.artifacts) && req.artifacts.some((a) => (a.sourceIdentity || SOURCE.WORKING_TREE) !== SOURCE.COMMITTED_REF);
  const quietMs = (typeof req.quietInterval === 'number' && req.quietInterval > 0 ? req.quietInterval : DEFAULT_QUIET_INTERVAL_SEC) * 1000;

  // First pass of working-tree reads.
  const firstReads = new Map();
  for (const a of (req.artifacts || [])) {
    const src = a.sourceIdentity || SOURCE.WORKING_TREE;
    if (src === SOURCE.COMMITTED_REF && !(a.alsoReadWorkingTree)) continue;
    const abs = resolveArtifactPath(cwd, a.path);
    firstReads.set(a.path, readWorkingTree(abs, nowFn()));
  }
  if (needSleep) sleepSync(quietMs);
  if (ref) refResolution = reResolveRef(cwd, ref, refResolution);

  for (const a of (req.artifacts || [])) {
    const src = a.sourceIdentity || SOURCE.WORKING_TREE;
    const abs = resolveArtifactPath(cwd, a.path);
    const rec = { path: a.path, sourceIdentity: src, expectedHash: a.expectedHash || null };
    if (src === SOURCE.COMMITTED_REF) {
      const sha = (refResolution && refResolution.resolvedShas && refResolution.resolvedShas[0]) || ref;
      rec.gitBlob = sha ? gatherGitBlob(cwd, sha, a.path) : { present: false, error: 'no resolved sha' };
      if (a.alsoReadWorkingTree) rec.reads = [firstReads.get(a.path), readWorkingTree(abs, nowFn())].filter(Boolean);
    } else {
      const second = readWorkingTree(abs, nowFn());
      rec.reads = [firstReads.get(a.path), second].filter(Boolean);
      if (ref) {
        const sha = (refResolution && refResolution.resolvedShas && refResolution.resolvedShas[0]) || null;
        if (sha) rec.gitBlob = gatherGitBlob(cwd, sha, a.path);
      }
    }
    artifacts.push(rec);
  }

  return { now: nowFn(), request: req, artifacts, refResolution };
}

function resolveArtifactPath(cwd, p) {
  if (/^([a-zA-Z]:[\\/]|\/)/.test(p)) return p; // already absolute
  return `${cwd.replace(/[\\/]+$/, '')}/${p}`;
}

const EXIT = { STABLE: 0, INCOMPLETE: 2, UNSTABLE: 3, MISMATCH: 4 };

export function main(argv = process.argv.slice(2)) {
  let result;
  try {
    const args = readArgs(argv);
    const req = loadRequest(args);
    const observations = gatherObservations(req);
    result = computeResult(observations);
    const text = args.format === 'json' ? renderJson(result) : renderReport(result);
    process.stdout.write(text + '\n');
  } catch (e) {
    // Final fail-closed net: any error → INCOMPLETE, never a clean-sounding report.
    const fallback = computeResult({ request: null, artifacts: [], _error: e.message });
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
