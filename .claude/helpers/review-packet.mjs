// review-packet.mjs — CCF-04 Mechanical Assistant #5 (Review Packet Template)
//
// PURPOSE
//   A session about to fire `ask_chatgpt_review` runs this to answer one
//   question: "Is this external-review packet correctly assembled and validly
//   hash-pinned, so the bridge will ACCEPT it and it will stay valid for the
//   EXACT artifact it reviewed?" It COMPOSES a canonical packet, VALIDATES a
//   composed-or-supplied one, does a SHALLOW staleness check of the pinned hash
//   against current bytes, and EMITS the result to stdout. It RESOLVES NOTHING.
//
// WHAT IT IS (charter: docs/briefs/ccf-04-mechanical-assistants-charter.md;
//   Gate-1 brief: docs/briefs/ccf-04-review-packet-template-gate1-brief-v1.md)
//   Zero-authority, deterministic, read-only. It removes manual effort
//   (assembling the canonical packet, measuring context size, scanning for a
//   raw-diff blob, computing + comparing the pin hash) WITHOUT removing judgment
//   (what the proposal argues, whether to fire the review, which triage route a
//   non-clean verdict takes, whether the gate passes — all stay with the human).
//   It mirrors the PROVEN shape of source-truth-check.mjs and hash-checkpoint.mjs:
//   exported PURE-CORE functions (deterministic, unit-testable with INJECTED
//   artifact bytes/hashes, no I/O) driven by a thin main() that runs only on
//   direct invocation, FAIL-CLOSED throughout.
//
// THE FIVE FUNCTIONS (brief)
//   1. COMPOSE — request -> canonical packet. If reviewed_input_hash is omitted
//      but artifact bytes are readable/injected, compute the sha256 and pin it
//      (recording WHAT was hashed). If neither, it does NOT fabricate a hash —
//      it composes with the hash ABSENT and the validator returns
//      HASH-UNPINNED-OR-STALE (fail-closed). Canonical / stable-key-ordered.
//   2. VALIDATE — report-only, each check an independent finding: (a) action_type
//      enumerated; (b) proposal present + above a MECHANICAL length floor (never
//      judges argument quality); (c) the 7 REQUIRED context fields for a
//      FULL-protocol action_type (absence for a LIGHT-protocol type is a WARNING,
//      not a block); (d) context minimal/structured/under-threshold/no-raw-diff;
//      (e) reviewed_input_hash present + pinned to a declared artifact_ref.
//   3. CONTEXT SHAPE / RAW-DIFF REFUSAL — context must be structured scalars /
//      short strings / evidence pointers, NOT raw file bodies. Refuse (->
//      OVERSIZED-CONTEXT) when serialized context exceeds a CONSERVATIVE byte
//      threshold, OR any single field exceeds a per-field cap, OR any field is a
//      diff blob (@@ .. @@ hunk markers / a high ratio of leading +/- lines).
//   4. STALENESS (SHALLOW) — compute the current artifact sha256 and compare it
//      to the pinned reviewed_input_hash. Match -> current; differ/unreadable ->
//      HASH-UNPINNED-OR-STALE. NAMED HANDOFF: the DEEP question (is the artifact
//      stable/immutable/not still being written, committed-ref reproduction) is
//      NOT re-implemented here — it is handed to `hash-checkpoint`
//      (.claude/helpers/hash-checkpoint.mjs). This helper does ONLY the shallow
//      pinned==current-bytes check.
//   5. EMIT — print the canonical packet / validation result to stdout. NEVER
//      fires the review, NEVER writes a file.
//
// VERDICT CONTRACT (PK-resolved)
//   Native: READY · INCOMPLETE · OVERSIZED-CONTEXT · HASH-UNPINNED-OR-STALE.
//   Normalized (CCF-02): READY->clean · INCOMPLETE->block · OVERSIZED-CONTEXT->block ·
//   HASH-UNPINNED-OR-STALE->block. (PK O-2: hash-stale is BLOCK, not escalate,
//   mirroring PK's O-3 hash-checkpoint ruling.) A LIGHT-protocol packet missing
//   the 7 context fields is READY WITH a non-blocking warning.
//
// TWO HONESTY GUARDRAILS (the whole point)
//   1. Never resolves, never writes. No fs WRITE anywhere; NO network (it never
//      fires the review); no git mutation. Its only I/O is reading the declared
//      artifact bytes + the input packet, read-only. Every finding is printed as
//      a HUMAN DECISION. It may LABEL triage classes, it NEVER routes.
//   2. Never a FALSE READY. A packet that would be bounced/truncated by the
//      bridge (oversized / raw-diff context) OR is pinned to a stale/absent hash
//      is the HIGHEST-SEVERITY failure and is impossible by construction. Every
//      ambiguity — a missing field, an unreadable artifact, an unparseable
//      context, any internal error — resolves toward INCOMPLETE /
//      OVERSIZED-CONTEXT / HASH-UNPINNED-OR-STALE, NEVER toward a fabricated READY.

import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

// ===========================================================================
// PURE CORE — no side effects, no fs, no git, no network, no clock. Injected
// artifact bytes / hashes in, structured result out. These are what the unit
// tests exercise.
// ===========================================================================

export const SCHEMA = 'ccf-04-review-packet/v1';

// --- native verdicts + CCF-02 normalized mapping (PK O-2) ------------------
export const VERDICT = {
  READY: 'READY',
  INCOMPLETE: 'INCOMPLETE',
  OVERSIZED_CONTEXT: 'OVERSIZED-CONTEXT',
  HASH_UNPINNED_OR_STALE: 'HASH-UNPINNED-OR-STALE',
};

export const NORMALIZED = { CLEAN: 'clean', BLOCK: 'block' };

// PK O-2: only READY is clean; every other native verdict is block (not escalate).
export function normalizedVerdict(native) {
  return native === VERDICT.READY ? NORMALIZED.CLEAN : NORMALIZED.BLOCK;
}

// Finding severities. Each finding contributes at most one verdict class; the
// WARNING/INFO severities never block (they are advisory only).
export const SEVERITY = {
  INCOMPLETE: 'INCOMPLETE',
  OVERSIZED: 'OVERSIZED',
  HASH_STALE: 'HASH_STALE',
  WARNING: 'WARNING',
  INFO: 'INFO',
};

// --- action_type enumeration + protocol weight (mcp_review_protocol.md:126-137)
export const ACTION_TYPES = new Set([
  'sql_destructive',
  'ef_deploy',
  'config_change',
  'plan_review',
  'sql_read',
  'finding_classification',
  'other',
]);

// LIGHT protocol: the 7 context fields are encouraged, not blocking.
export const LIGHT_PROTOCOL_TYPES = new Set(['sql_read', 'finding_classification']);
// Every other enumerated type (incl. `other`, which "defaults to full") is FULL.

// --- the 7 REQUIRED call-side context fields (mcp_review_protocol.md:16-30) --
export const REQUIRED_CONTEXT_FIELDS = [
  'decision_under_review',
  'production_action_if_approved',
  'consequence_if_delayed',
  'cost_of_waiting',
  'current_evidence',
  'known_weak_evidence',
  'default_action',
];

// --- triage vocabulary (CLAUDE.md External review rule 5) ------------------
// The helper may LABEL these; it NEVER decides the route (reject-list
// `auto review-routing`). An out-of-vocabulary label is a non-blocking WARNING.
export const TRIAGE_CLASSES = new Set([
  'concrete_defect',
  'missing_evidence',
  'structural_DDL_DML_escalation',
  'policy_decision',
  'scope_design_concern',
  'runtime_verification_required',
]);

// --- CONFIGURABLE thresholds (B-1) -----------------------------------------
// B-1 / O-4: these are CONSERVATIVE DEFAULTS, deliberately well below the
// bridge's asserted ~50 KB context truncation so truncation can NEVER silently
// drop evidence. They are NOT bridge-confirmed numbers — the exact threshold
// MUST be re-confirmed against the live bridge separately before being treated
// as authoritative. `thresholdIsBridgeConfirmed` is emitted as false to make the
// provenance explicit in every report. Override via the `config` argument / CLI.
export const DEFAULT_CONFIG = Object.freeze({
  // Total serialized-context byte ceiling (~1/6th of the asserted 50 KB bounce).
  contextSizeThresholdBytes: 8192,
  // Any single field value above this is treated as a body, not a pointer.
  perFieldCapBytes: 4096,
  // Mechanical floor for `proposal` length (chars). NOT a quality judgment.
  minProposalLength: 40,
  // A multi-line string with >= diffMinLines lines AND >= diffLeadRatioThreshold
  // of them starting with +/- is a raw-diff blob (in addition to @@ hunk markers).
  diffMinLines: 12,
  diffLeadRatioThreshold: 0.3,
  // Provenance flag — always false until re-confirmed against the live bridge.
  thresholdIsBridgeConfirmed: false,
});

const HEX64 = /^[0-9a-f]{64}$/i;

// --- deterministic canonical JSON (stable key ordering) --------------------
// Guarantees byte-identical output across runs on identical inputs
// (mirrors hash-checkpoint.mjs:109-120).
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

function isNonEmptyString(s) {
  return typeof s === 'string' && s.trim() !== '';
}

// sha256 of injected bytes (Buffer or string). Deterministic; no I/O.
export function sha256Hex(bytes) {
  return createHash('sha256').update(bytes).digest('hex');
}

// --- raw-diff blob heuristic (Function 3) ----------------------------------
// Returns a reason string ('raw-diff-blob') or null. Never throws.
export function looksLikeRawDiff(str, config = DEFAULT_CONFIG) {
  if (typeof str !== 'string') return null;
  // Unified-diff hunk marker: @@ -a,b +c,d @@
  if (/^@@[^\n]*@@/m.test(str)) return 'raw-diff-blob';
  const lines = str.split('\n');
  if (lines.length >= config.diffMinLines) {
    const lead = lines.filter((l) => /^[+-]/.test(l)).length;
    if (lead / lines.length >= config.diffLeadRatioThreshold) return 'raw-diff-blob';
  }
  return null;
}

function collectLeafStrings(value, prefix, out) {
  if (typeof value === 'string') {
    out.push({ field: prefix || '(root)', value });
    return;
  }
  if (Array.isArray(value)) {
    value.forEach((v, i) => collectLeafStrings(v, `${prefix}[${i}]`, out));
    return;
  }
  if (value && typeof value === 'object') {
    for (const k of Object.keys(value)) {
      collectLeafStrings(value[k], prefix ? `${prefix}.${k}` : k, out);
    }
  }
  // numbers / booleans / null contribute to byte size but not to string checks
}

// --- context shape analysis (Function 3) -----------------------------------
export function analyzeContext(context, config = DEFAULT_CONFIG) {
  const cfg = { ...DEFAULT_CONFIG, ...(config || {}) };
  const serialized = stableStringify(context ?? {});
  const totalBytes = Buffer.byteLength(serialized, 'utf8');
  const leaves = [];
  collectLeafStrings(context ?? {}, '', leaves);
  const perFieldOversize = [];
  const rawDiffFields = [];
  for (const { field, value } of leaves) {
    const bytes = Buffer.byteLength(value, 'utf8');
    if (bytes > cfg.perFieldCapBytes) perFieldOversize.push({ field, bytes });
    const diff = looksLikeRawDiff(value, cfg);
    if (diff) rawDiffFields.push({ field, reason: diff });
  }
  return {
    totalBytes,
    thresholdBytes: cfg.contextSizeThresholdBytes,
    perFieldCapBytes: cfg.perFieldCapBytes,
    overThreshold: totalBytes > cfg.contextSizeThresholdBytes,
    perFieldOversize,
    rawDiffFields,
  };
}

// --- normalize an artifact_ref (string path OR {path, git_ref}) ------------
function normalizeArtifactRef(ref) {
  if (typeof ref === 'string') return { path: ref.trim() === '' ? null : ref, git_ref: null };
  if (ref && typeof ref === 'object' && !Array.isArray(ref)) {
    const path = isNonEmptyString(ref.path) ? ref.path : null;
    const git_ref = isNonEmptyString(ref.git_ref)
      ? ref.git_ref
      : (isNonEmptyString(ref.gitRef) ? ref.gitRef : null);
    return { path, git_ref };
  }
  return { path: null, git_ref: null };
}

// ===========================================================================
// FUNCTION 1 — COMPOSE (deterministic). Request in, canonical packet out.
//   opts.artifactBytes: optional Buffer/string injected for hash computation
//   (fail-closed: absent bytes + absent supplied hash => packet with NO hash).
// ===========================================================================
export function composePacket(request, opts = {}) {
  const r = (request && typeof request === 'object' && !Array.isArray(request)) ? request : {};
  const { path, git_ref } = normalizeArtifactRef(r.artifact_ref);

  let hash = isNonEmptyString(r.reviewed_input_hash) ? r.reviewed_input_hash.trim() : null;
  let hashSource = null;
  if (hash) {
    hashSource = { path, git_ref, computed: false, algorithm: 'sha256' };
  } else if (opts.artifactBytes != null) {
    hash = sha256Hex(opts.artifactBytes);
    hashSource = { path, git_ref, computed: true, algorithm: 'sha256' };
  }
  // else: neither a supplied hash nor readable bytes -> DO NOT fabricate. Compose
  // with the hash absent; the validator will return HASH-UNPINNED-OR-STALE.

  const ctxFields = (r.context_fields && typeof r.context_fields === 'object' && !Array.isArray(r.context_fields))
    ? r.context_fields
    : {};
  const context = { ...ctxFields };
  if (r.evidence_pointers !== undefined) context.evidence_pointers = r.evidence_pointers;

  const triage = Array.isArray(r.triage_labels) ? r.triage_labels.slice() : [];

  return {
    schema: SCHEMA,
    action_type: isNonEmptyString(r.action_type) ? r.action_type : null,
    artifact_ref: { path, git_ref },
    context,
    hash_source: hashSource,
    proposal: isNonEmptyString(r.proposal) ? r.proposal : null,
    reviewed_input_hash: hash,
    triage_labels: triage,
  };
}

// ===========================================================================
// FUNCTIONS 2/3/4 — VALIDATE (+ context shape + shallow staleness).
//   opts.staleness: undefined | { readable:false } | { readable:true, currentHash }
//     undefined       -> staleness NOT checked (fail-closed => HASH finding)
//     {readable:false}-> artifact unreadable  (fail-closed => HASH finding)
//     {readable:true,currentHash} -> compare to the pinned hash
//   opts.config: threshold overrides (see DEFAULT_CONFIG)
// ===========================================================================
export function assessPacket(packet, opts = {}) {
  const cfg = { ...DEFAULT_CONFIG, ...(opts.config || {}) };
  const findings = [];
  let seq = 0;
  const add = (check, severity, fields) => {
    seq += 1;
    findings.push({
      id: `RP-${check}-${String(seq).padStart(2, '0')}`,
      check,
      severity,
      field: fields.field ?? null,
      observed: fields.observed ?? null,
      expected: fields.expected ?? null,
      reason: fields.reason ?? null,
      whyItMatters: fields.whyItMatters,
      suggestedAction: fields.suggestedAction,
    });
  };

  const p = (packet && typeof packet === 'object' && !Array.isArray(packet)) ? packet : {};

  // ---- check (a): action_type enumerated ----------------------------------
  const at = p.action_type;
  let protocolWeight = 'full';
  if (!isNonEmptyString(at)) {
    add('action_type', SEVERITY.INCOMPLETE, {
      field: 'action_type', observed: at ?? null, expected: [...ACTION_TYPES].join(' | '),
      whyItMatters: 'action_type is a required packet field; without it the protocol weight cannot be determined',
      suggestedAction: 'set action_type to one of the enumerated protocol types',
    });
  } else if (!ACTION_TYPES.has(at)) {
    add('action_type', SEVERITY.INCOMPLETE, {
      field: 'action_type', observed: at, expected: [...ACTION_TYPES].join(' | '),
      whyItMatters: 'action_type is not one of the enumerated protocol types — the bridge weight is undefined',
      suggestedAction: 'correct action_type to an enumerated value (mcp_review_protocol.md action-type table)',
    });
  } else {
    protocolWeight = LIGHT_PROTOCOL_TYPES.has(at) ? 'light' : 'full';
  }

  // ---- check (b): proposal present + mechanical length floor ---------------
  const proposal = p.proposal;
  if (!isNonEmptyString(proposal)) {
    add('proposal', SEVERITY.INCOMPLETE, {
      field: 'proposal', observed: proposal ?? null,
      whyItMatters: 'proposal carries the packet substance; the bridge produces generic objections without it',
      suggestedAction: 'supply a proposal-heavy "what/why" string',
    });
  } else if (proposal.trim().length < cfg.minProposalLength) {
    add('proposal', SEVERITY.INCOMPLETE, {
      field: 'proposal', observed: `${proposal.trim().length} chars`, expected: `>= ${cfg.minProposalLength} chars`,
      whyItMatters: 'proposal is below the MECHANICAL length floor (this is a floor only — the helper never judges argument quality)',
      suggestedAction: 'expand the proposal above the mechanical minimum; substance judgment stays with the human',
    });
  }

  // ---- artifact_ref present (required field) -------------------------------
  const ref = normalizeArtifactRef(p.artifact_ref);
  if (!isNonEmptyString(ref.path)) {
    add('artifact_ref', SEVERITY.INCOMPLETE, {
      field: 'artifact_ref.path', observed: ref.path,
      whyItMatters: 'artifact_ref names WHAT the hash is of; without it the pin and staleness check are ambiguous',
      suggestedAction: 'declare artifact_ref.path (and optional git_ref) identifying the reviewed artifact',
    });
  }

  // ---- check (c): the 7 required context fields ----------------------------
  const ctx = (p.context && typeof p.context === 'object' && !Array.isArray(p.context)) ? p.context : null;
  if (ctx === null) {
    add('context', SEVERITY.INCOMPLETE, {
      field: 'context', observed: p.context ?? null,
      whyItMatters: 'context must be a structured object of the required call-side fields',
      suggestedAction: 'supply context as a structured object (never a raw diff / file body)',
    });
  } else {
    for (const f of REQUIRED_CONTEXT_FIELDS) {
      const present = Object.prototype.hasOwnProperty.call(ctx, f)
        && (isNonEmptyString(ctx[f]) || typeof ctx[f] === 'number' || typeof ctx[f] === 'boolean'
          || (ctx[f] && typeof ctx[f] === 'object'));
      if (!present) {
        if (protocolWeight === 'full') {
          add('context_field', SEVERITY.INCOMPLETE, {
            field: `context.${f}`, observed: 'absent',
            whyItMatters: `${f} is one of the 7 required call-side fields for a full-protocol action_type`,
            suggestedAction: `add context.${f} (mcp_review_protocol.md:16-30)`,
          });
        } else {
          add('context_field', SEVERITY.WARNING, {
            field: `context.${f}`, observed: 'absent',
            whyItMatters: `${f} is encouraged for a light-protocol action_type but its absence is NON-BLOCKING`,
            suggestedAction: `optionally add context.${f}; a light-protocol review may proceed without it`,
          });
        }
      }
    }
  }

  // ---- check (d) / Function 3: context shape + size + raw-diff refusal ------
  const ctxAnalysis = analyzeContext(ctx ?? {}, cfg);
  if (ctxAnalysis.overThreshold) {
    add('context_size', SEVERITY.OVERSIZED, {
      field: 'context', reason: 'oversize',
      observed: `${ctxAnalysis.totalBytes} bytes`, expected: `<= ${ctxAnalysis.thresholdBytes} bytes`,
      whyItMatters: 'serialized context exceeds the conservative threshold — the bridge may truncate it and silently drop evidence',
      suggestedAction: 'move the substance into `proposal`; keep context to minimal structured pointers',
    });
  }
  for (const pf of ctxAnalysis.perFieldOversize) {
    add('context_size', SEVERITY.OVERSIZED, {
      field: pf.field, reason: 'oversize',
      observed: `${pf.bytes} bytes`, expected: `<= ${ctxAnalysis.perFieldCapBytes} bytes`,
      whyItMatters: 'a single context field exceeds the per-field cap — it is a body, not a pointer',
      suggestedAction: 'replace the field value with a pointer (path / sha256 / prior verdict / review id)',
    });
  }
  for (const df of ctxAnalysis.rawDiffFields) {
    add('context_raw_diff', SEVERITY.OVERSIZED, {
      field: df.field, reason: 'raw-diff-blob',
      observed: 'diff-hunk markers / high +/- line ratio',
      whyItMatters: 'context carries a RAW DIFF blob — the bridge bounces context-blob calls; the diff belongs in the pinned artifact, not the context',
      suggestedAction: 'remove the raw diff from context; pin its sha256 as reviewed_input_hash and reference it as a pointer',
    });
  }

  // ---- check (e) + Function 4: hash present/pinned + SHALLOW staleness ------
  const hRaw = p.reviewed_input_hash;
  const h = isNonEmptyString(hRaw) ? hRaw.trim() : null;
  const pinned = h !== null && HEX64.test(h);
  let hashStateName;
  let currentHash = null;

  if (h === null) {
    hashStateName = 'unpinned';
    add('hash_pin', SEVERITY.HASH_STALE, {
      field: 'reviewed_input_hash', observed: 'absent',
      whyItMatters: 'reviewed_input_hash is MANDATORY (CLAUDE.md rule 4) — an unpinned review is valid for nothing',
      suggestedAction: 'pin the sha256 of the exact artifact bytes',
    });
  } else if (!pinned) {
    hashStateName = 'unpinned';
    add('hash_pin', SEVERITY.HASH_STALE, {
      field: 'reviewed_input_hash', observed: h, expected: 'a 64-char sha256 hex string',
      whyItMatters: 'reviewed_input_hash is not a valid sha256 hex — it cannot be trusted as a pin',
      suggestedAction: 're-pin the sha256 of the exact artifact bytes',
    });
  } else {
    // hash is well-formed; now the SHALLOW staleness check (Function 4).
    const st = opts.staleness;
    if (st === undefined) {
      hashStateName = 'pinned-unverified';
      add('hash_staleness', SEVERITY.HASH_STALE, {
        field: 'reviewed_input_hash', observed: h, reason: 'unverified',
        whyItMatters: 'no current artifact bytes were provided — the pin could NOT be verified against current bytes (fail-closed; never assume current)',
        suggestedAction: 'provide the current artifact bytes so the pin can be confirmed (the CLI reads them from artifact_ref.path)',
      });
    } else if (st.readable === false) {
      hashStateName = 'unreadable';
      add('hash_staleness', SEVERITY.HASH_STALE, {
        field: 'artifact_ref', observed: 'unreadable', reason: 'unreadable',
        whyItMatters: 'the artifact could not be read at artifact_ref — the pin cannot be confirmed (fail-closed)',
        suggestedAction: 'confirm the artifact exists at artifact_ref.path before firing the review',
      });
    } else if (!isNonEmptyString(st.currentHash) || !HEX64.test(st.currentHash.trim())) {
      hashStateName = 'unreadable';
      add('hash_staleness', SEVERITY.HASH_STALE, {
        field: 'artifact_ref', observed: st.currentHash ?? null, reason: 'unreadable',
        whyItMatters: 'the current artifact hash is missing/invalid — the pin cannot be confirmed (fail-closed)',
        suggestedAction: 'recompute the current artifact sha256 and re-run',
      });
    } else {
      currentHash = st.currentHash.trim();
      if (currentHash.toLowerCase() === h.toLowerCase()) {
        hashStateName = 'current';
        add('hash_staleness', SEVERITY.INFO, {
          field: 'reviewed_input_hash', observed: h, expected: currentHash,
          whyItMatters: 'the pinned hash matches the current artifact bytes — the review will be valid for exactly these bytes',
          suggestedAction: 'none — re-pin only if the artifact is re-cut (a re-cut voids the review, CLAUDE.md rule 4)',
        });
      } else {
        hashStateName = 'stale';
        add('hash_staleness', SEVERITY.HASH_STALE, {
          field: 'reviewed_input_hash', observed: h, expected: currentHash, reason: 'stale',
          whyItMatters: 'the pinned hash does NOT match the current artifact bytes — the artifact was re-cut and the review would be STALE (CLAUDE.md rule 4 STOP)',
          suggestedAction: 're-pin the current sha256 and re-run the review (do not fire against a stale pin)',
        });
      }
    }
  }

  // ---- triage_labels (advisory; NEVER routes) ------------------------------
  const triageLabels = Array.isArray(p.triage_labels) ? p.triage_labels : [];
  for (const t of triageLabels) {
    if (!TRIAGE_CLASSES.has(t)) {
      add('triage_label', SEVERITY.WARNING, {
        field: 'triage_labels', observed: t, expected: [...TRIAGE_CLASSES].join(' | '),
        whyItMatters: 'triage label is outside the rule-5 vocabulary (advisory only — the helper LABELS, it never routes)',
        suggestedAction: 'use a rule-5 triage class, or drop the label',
      });
    }
  }

  // ---- finalize: verdict precedence (all non-READY -> block) ---------------
  // Precedence (headline verdict only; ALL findings are always reported):
  //   INCOMPLETE > OVERSIZED-CONTEXT > HASH-UNPINNED-OR-STALE > READY.
  const has = (sev) => findings.some((f) => f.severity === sev);
  let verdict = VERDICT.READY;
  if (has(SEVERITY.INCOMPLETE)) verdict = VERDICT.INCOMPLETE;
  else if (has(SEVERITY.OVERSIZED)) verdict = VERDICT.OVERSIZED_CONTEXT;
  else if (has(SEVERITY.HASH_STALE)) verdict = VERDICT.HASH_UNPINNED_OR_STALE;

  const warnings = findings.filter((f) => f.severity === SEVERITY.WARNING).map((f) => f.whyItMatters);

  return {
    schema: SCHEMA,
    mode: 'validate',
    action_type: isNonEmptyString(at) ? at : null,
    protocolWeight,
    packet: p,
    checks: findings,
    warnings,
    hasWarnings: warnings.length > 0,
    contextSize: {
      bytes: ctxAnalysis.totalBytes,
      thresholdBytes: ctxAnalysis.thresholdBytes,
      perFieldCapBytes: ctxAnalysis.perFieldCapBytes,
      overThreshold: ctxAnalysis.overThreshold,
      perFieldOversize: ctxAnalysis.perFieldOversize,
      rawDiffFields: ctxAnalysis.rawDiffFields,
    },
    hashState: {
      pinned,
      pinnedHash: h,
      currentHash,
      state: hashStateName,
    },
    triageLabels,
    config: {
      contextSizeThresholdBytes: cfg.contextSizeThresholdBytes,
      perFieldCapBytes: cfg.perFieldCapBytes,
      minProposalLength: cfg.minProposalLength,
      diffMinLines: cfg.diffMinLines,
      diffLeadRatioThreshold: cfg.diffLeadRatioThreshold,
      thresholdIsBridgeConfirmed: false,
    },
    notes: [
      'context-size / per-field thresholds are CONSERVATIVE DEFAULTS, NOT bridge-confirmed (B-1/O-4) — re-confirm against the live bridge before treating as authoritative.',
      'staleness here is the SHALLOW pinned==current-bytes check only; deep byte-stability/immutability + committed-ref reproduction is a NAMED HANDOFF to hash-checkpoint (.claude/helpers/hash-checkpoint.mjs).',
      'this helper composes/validates/emits only — it never fires the review, decides the verdict, routes triage, approves a gate, edits the artifact, or fabricates a hash.',
    ],
    verdict,
    normalized: normalizedVerdict(verdict),
  };
}

// ===========================================================================
// COMPOSE + VALIDATE (default lane): compose a canonical packet from a request,
// then validate it. When artifact bytes are injected and no explicit staleness
// is given, staleness is derived from the SAME bytes (compose pins current bytes).
// ===========================================================================
export function composeAndValidate(request, opts = {}) {
  const packet = composePacket(request, { artifactBytes: opts.artifactBytes });
  let staleness = opts.staleness;
  if (staleness === undefined) {
    if (opts.artifactBytes != null) {
      staleness = { readable: true, currentHash: sha256Hex(opts.artifactBytes) };
    } else if (isNonEmptyString(request && request.reviewed_input_hash)) {
      // A supplied hash with no artifact bytes: staleness cannot be verified.
      staleness = undefined;
    }
  }
  const result = assessPacket(packet, { staleness, config: opts.config });
  result.mode = 'compose+validate';
  return result;
}

// --- emit helpers (Function 5) ---------------------------------------------
export function renderResultJson(result) {
  return stableStringify(result);
}
export function renderPacketJson(packet) {
  return stableStringify(packet);
}

// ===========================================================================
// THIN main() — reads the input packet/request + the declared artifact bytes
// (read-only fs), computes the current hash, calls the pure core, prints to
// stdout. Runs ONLY on direct invocation. Writes NO file. No network. No git.
// Fail-closed throughout.
// ===========================================================================

const EXIT = {
  [VERDICT.READY]: 0,
  [VERDICT.INCOMPLETE]: 2,
  [VERDICT.OVERSIZED_CONTEXT]: 3,
  [VERDICT.HASH_UNPINNED_OR_STALE]: 4,
};

function readArgs(argv) {
  const out = { input: null, json: null, mode: null, repo: null, emit: 'result', config: {} };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--input' && i + 1 < argv.length) out.input = argv[++i];
    else if (a === '--json' && i + 1 < argv.length) out.json = argv[++i];
    else if (a === '--mode' && i + 1 < argv.length) out.mode = argv[++i];
    else if (a === '--repo' && i + 1 < argv.length) out.repo = argv[++i];
    else if (a === '--emit' && i + 1 < argv.length) out.emit = argv[++i];
    else if (a === '--context-threshold' && i + 1 < argv.length) out.config.contextSizeThresholdBytes = Number.parseInt(argv[++i], 10);
    else if (a === '--per-field-cap' && i + 1 < argv.length) out.config.perFieldCapBytes = Number.parseInt(argv[++i], 10);
    else if (a === '--min-proposal' && i + 1 < argv.length) out.config.minProposalLength = Number.parseInt(argv[++i], 10);
  }
  return out;
}

function loadInput(args) {
  if (args.json) return JSON.parse(args.json);
  if (args.input) return JSON.parse(readFileSync(args.input, 'utf-8'));
  return JSON.parse(readFileSync(0, 'utf-8')); // stdin fallback
}

function resolveArtifactPath(cwd, p) {
  if (typeof p !== 'string' || p.trim() === '') return null;
  if (/^([a-zA-Z]:[\\/]|\/)/.test(p)) return p; // already absolute
  return `${String(cwd).replace(/[\\/]+$/, '')}/${p}`;
}

// Read the current artifact bytes read-only. Returns a staleness object for the
// pure core. Never throws out; unreadable => fail-closed { readable:false }.
function readStaleness(cwd, artifactRef) {
  const ref = normalizeArtifactRef(artifactRef);
  const abs = resolveArtifactPath(cwd, ref.path);
  if (!abs) return { readable: false };
  try {
    const buf = readFileSync(abs);
    return { readable: true, currentHash: sha256Hex(buf), bytes: buf };
  } catch {
    return { readable: false };
  }
}

export function main(argv = process.argv.slice(2)) {
  let result;
  try {
    const args = readArgs(argv);
    const input = loadInput(args);
    const cwd = args.repo || process.cwd();
    const config = args.config;

    // Auto-detect mode: a request carries `context_fields`; a packet carries `context`.
    const looksLikeRequest = input && typeof input === 'object'
      && (Object.prototype.hasOwnProperty.call(input, 'context_fields')
        || Object.prototype.hasOwnProperty.call(input, 'evidence_pointers'));
    const mode = args.mode || (looksLikeRequest ? 'compose' : 'validate');

    if (mode === 'compose' || mode === 'both' || mode === 'compose+validate') {
      const st = readStaleness(cwd, input.artifact_ref);
      const artifactBytes = st.readable ? st.bytes : undefined;
      // Strip the raw buffer out of the staleness object handed to the core.
      const staleness = st.readable ? { readable: true, currentHash: st.currentHash } : { readable: false };
      const packet = composePacket(input, { artifactBytes });
      if (args.emit === 'packet') {
        process.stdout.write(renderPacketJson(packet) + '\n');
        result = assessPacket(packet, { staleness, config });
        result.mode = 'compose+validate';
        process.exitCode = EXIT[result.verdict] ?? 2;
        return;
      }
      result = assessPacket(packet, { staleness, config });
      result.mode = 'compose+validate';
    } else {
      // validate a supplied packet
      const st = readStaleness(cwd, input.artifact_ref);
      const staleness = st.readable ? { readable: true, currentHash: st.currentHash } : { readable: false };
      result = assessPacket(input, { staleness, config });
      if (args.emit === 'packet') {
        process.stdout.write(renderPacketJson(input) + '\n');
        process.exitCode = EXIT[result.verdict] ?? 2;
        return;
      }
    }

    process.stdout.write(renderResultJson(result) + '\n');
  } catch (e) {
    // Final fail-closed net: any error -> INCOMPLETE, never a clean-sounding READY.
    const fallback = assessPacket(null, {});
    fallback.error = `fail-closed: ${e.message}`;
    process.stdout.write(renderResultJson(fallback) + '\n');
    process.exitCode = EXIT[VERDICT.INCOMPLETE];
    return;
  }
  process.exitCode = EXIT[result.verdict] ?? 2;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main();
}
