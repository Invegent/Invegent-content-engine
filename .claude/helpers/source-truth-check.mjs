// source-truth-check.mjs — CCF-04 Mechanical Assistant #1 (Source Truth Check)
//
// PURPOSE
//   A session runs this BEFORE starting a lane to answer one question:
//   "Am I working from truth?" It PRINTS a situational report over five
//   read-only signals and RESOLVES NOTHING. It is a lens, not a fixer.
//
// WHAT IT IS (charter: docs/briefs/ccf-04-mechanical-assistants-charter.md)
//   Zero-authority, purely READ-ONLY. It removes manual effort (gathering the
//   truth-signals by hand) WITHOUT removing judgment (every risk is handed
//   back to the human to decide). It mirrors the PROVEN shape of the
//   sql-content-gate hook: exported pure-core functions (deterministic,
//   unit-testable without spawning git) driven by a thin main() that runs only
//   on direct invocation, with a FAIL-CLOSED posture.
//
// THE FIVE READ-ONLY SIGNALS
//   1. git fetch origin — the ONLY network/git action; refreshes remote-tracking
//      refs only (never pull/merge/rebase/reset/checkout/a working file).
//   2. origin/main HEAD SHA + the LIVE origin register head version (highest
//      v5.NN marker read from docs/00_sync_state.md on origin/main — never hardcoded).
//   3. local main vs origin/main: ahead N / behind M and whether they DIVERGED
//      (both moved past the merge-base).
//   4. working-tree state: dirty / staged / untracked summary (status --porcelain).
//   5. lane-hint "already-landed?" check — given optional --hint (comma-sep file
//      paths and/or a slug), report whether origin/main ALREADY contains matching
//      files (byte-identical under any path) or commits whose subject contains the
//      slug. (The cc-0028 class: work already on origin under a rebased/different SHA.)
//
// TWO HONESTY GUARDRAILS (the whole point)
//   1. Never resolves, never writes. No reset/rebase/commit/pull/merge/push/
//      config/stash/reconcile/fix; no file write ANYWHERE. git fetch is the sole
//      exception and it mutates only remote-tracking refs. Every risk is printed
//      as a HUMAN DECISION.
//   2. Never a false "all clear."
//      (a) On ANY internal/git error: FAIL CLOSED — print the error and assert
//          nothing ("could not determine truth — treat as UNKNOWN").
//      (b) The already-landed NO-match reports as "no match found (not proof of
//          novelty)" — NEVER "safe to proceed" / "not landed" / "clear".

import { spawnSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';

// ---------------------------------------------------------------------------
// PURE CORE — no side effects, no git, no fs. These are what the tests exercise.
// ---------------------------------------------------------------------------

// Risk levels (severity ordering for display / sorting).
export const RISK = { INFO: 'INFO', DECISION: 'DECISION', UNKNOWN: 'UNKNOWN' };

// Parse the highest v5.NN register head marker from sync_state text.
// Returns the marker string (e.g. "v5.33") or null when none is found.
// Numeric max over the minor component — never relies on file ordering.
export function parseRegisterHead(syncStateText) {
  if (typeof syncStateText !== 'string' || syncStateText === '') return null;
  const re = /\bv5\.(\d+)\b/g;
  let best = null;
  let m;
  while ((m = re.exec(syncStateText)) !== null) {
    const minor = Number.parseInt(m[1], 10);
    if (Number.isFinite(minor) && (best === null || minor > best)) best = minor;
  }
  return best === null ? null : `v5.${best}`;
}

// Classify the gathered git state into a list of {level, message} risks.
// Pure: takes a plain gitState object, returns an array (never throws on a
// well-typed object). Fail-closed: an `error` field on gitState yields a single
// UNKNOWN risk and nothing is ever asserted clean.
export function classifyRisks(gitState) {
  const risks = [];
  const g = gitState || {};

  // Guardrail 2(a): any gathered error → UNKNOWN, assert nothing.
  if (g.error) {
    risks.push({
      level: RISK.UNKNOWN,
      message:
        `could not determine truth — treat as UNKNOWN (${g.error}). ` +
        'No signal below can be trusted; do NOT treat this as all-clear.',
    });
    return risks;
  }

  const ahead = Number.isFinite(g.ahead) ? g.ahead : null;
  const behind = Number.isFinite(g.behind) ? g.behind : null;

  // If we could not compute ahead/behind, that itself is UNKNOWN (fail closed).
  if (ahead === null || behind === null) {
    risks.push({
      level: RISK.UNKNOWN,
      message:
        'ahead/behind vs origin/main could not be computed — treat as UNKNOWN. ' +
        'Do NOT treat this as all-clear.',
    });
    return risks;
  }

  // Signal 3: divergence — both moved past the merge-base. Human decision.
  if (g.diverged || (ahead > 0 && behind > 0)) {
    risks.push({
      level: RISK.DECISION,
      message:
        `local main and origin/main have DIVERGED (ahead ${ahead}, behind ${behind}; ` +
        'both past the merge-base) — you decide how to reconcile. This tool does not resolve it.',
    });
  } else if (behind > 0) {
    // Stale local — behind only.
    risks.push({
      level: RISK.DECISION,
      message:
        `local main is BEHIND origin/main by ${behind} — you are not on the latest truth. ` +
        'You decide whether to update before starting. This tool does not update it.',
    });
  } else if (ahead > 0) {
    // Ahead only — unpushed local work. Informational, but the human decides.
    risks.push({
      level: RISK.DECISION,
      message:
        `local main is AHEAD of origin/main by ${ahead} — you hold unpushed local commit(s). ` +
        'You decide (they may belong to another lane). This tool does not push or reset.',
    });
  }

  // Signal 4: working-tree dirty.
  const dirty = Array.isArray(g.dirtyFiles) ? g.dirtyFiles : [];
  if (dirty.length > 0) {
    risks.push({
      level: RISK.DECISION,
      message:
        `working tree is DIRTY (${dirty.length} path(s) staged/modified/untracked) — ` +
        'you decide whether that is expected for this lane. This tool does not stash or clean.',
    });
  }

  // Signal 5: already-landed hint. Guardrail 2(b): presence is a human decision,
  // ABSENCE is "no match found (not proof of novelty)" — never a green light.
  if (g.hintProvided) {
    const matches = Array.isArray(g.hintMatches) ? g.hintMatches : [];
    if (matches.length > 0) {
      const summary = matches
        .map((m) => (typeof m === 'string' ? m : `${m.kind}: ${m.detail}`))
        .join('; ');
      risks.push({
        level: RISK.DECISION,
        message:
          `possible ALREADY-LANDED on origin/main (${matches.length} match(es): ${summary}) — ` +
          'this work may already be on origin under a different/rebased SHA (the cc-0028 class). ' +
          'You decide whether to proceed. This is not a certainty and this tool takes no action.',
      });
    } else {
      risks.push({
        level: RISK.INFO,
        message:
          'already-landed hint: no match found (NOT proof of novelty). ' +
          'Absence of a match is not a green light — you must still confirm the work is new.',
      });
    }
  }

  return risks;
}

// Format a single risk line.
function fmtRisk(r) {
  return `  [${r.level}] ${r.message}`;
}

// Build the full situational report string from a gathered gitState.
// Pure: returns a string (never writes anywhere). Fail-closed: an errored
// gitState never yields a clean-sounding report.
export function computeReport(gitState) {
  const g = gitState || {};
  const risks = classifyRisks(g);
  const lines = [];

  lines.push('=== CCF-04 Source Truth Check (READ-ONLY · resolves nothing) ===');
  lines.push('');

  // Signal 1: fetch.
  if (g.fetchOk === true) {
    lines.push('[1] git fetch origin: OK (remote-tracking refs refreshed; no working file touched)');
  } else if (g.fetchOk === false) {
    lines.push(`[1] git fetch origin: FAILED (${g.fetchError || 'unknown'}) — remote refs may be stale`);
  } else {
    lines.push('[1] git fetch origin: not attempted / unknown');
  }

  // Signal 2: origin head + register head.
  const oh = g.originHead ? String(g.originHead) : 'UNKNOWN';
  const rh = g.registerHead ? String(g.registerHead) : 'UNKNOWN (could not read docs/00_sync_state.md on origin/main)';
  lines.push(`[2] origin/main HEAD: ${oh}`);
  lines.push(`    origin register head: ${rh}`);

  // Signal 3: ahead / behind / diverged.
  if (Number.isFinite(g.ahead) && Number.isFinite(g.behind)) {
    const div = g.diverged || (g.ahead > 0 && g.behind > 0) ? ' (DIVERGED)' : '';
    lines.push(`[3] local main vs origin/main: ahead ${g.ahead}, behind ${g.behind}${div}`);
  } else {
    lines.push('[3] local main vs origin/main: UNKNOWN (could not compute ahead/behind)');
  }

  // Signal 4: working tree.
  const dirty = Array.isArray(g.dirtyFiles) ? g.dirtyFiles : null;
  if (dirty === null) {
    lines.push('[4] working tree: UNKNOWN (could not read status)');
  } else if (dirty.length === 0) {
    lines.push('[4] working tree: clean (no staged/modified/untracked paths)');
  } else {
    lines.push(`[4] working tree: DIRTY — ${dirty.length} path(s):`);
    for (const d of dirty.slice(0, 20)) lines.push(`      ${d}`);
    if (dirty.length > 20) lines.push(`      ... and ${dirty.length - 20} more`);
  }

  // Signal 5: already-landed hint.
  if (!g.hintProvided) {
    lines.push('[5] already-landed hint: none supplied (pass --hint path,slug to check)');
  } else {
    const matches = Array.isArray(g.hintMatches) ? g.hintMatches : [];
    if (matches.length === 0) {
      lines.push('[5] already-landed hint: no match found (NOT proof of novelty)');
    } else {
      lines.push(`[5] already-landed hint: ${matches.length} possible match(es) on origin/main:`);
      for (const m of matches) {
        lines.push(`      ${typeof m === 'string' ? m : `${m.kind}: ${m.detail}`}`);
      }
    }
  }

  lines.push('');
  lines.push('--- RISKS (each is a HUMAN DECISION — this tool resolves nothing) ---');
  if (risks.length === 0) {
    // NOTE: no risks flagged is NOT an "all clear". Say exactly that.
    lines.push('  no risk flags raised by the checks above.');
    lines.push('  This is NOT a certification of truth — the checks are heuristic and read-only.');
    lines.push('  You decide whether you are working from truth.');
  } else {
    for (const r of risks) lines.push(fmtRisk(r));
  }

  // Fail-closed banner whenever any UNKNOWN is present.
  const hasUnknown = risks.some((r) => r.level === RISK.UNKNOWN);
  lines.push('');
  if (hasUnknown) {
    lines.push('VERDICT: UNKNOWN — could not determine truth. Do NOT treat as all-clear.');
  } else {
    lines.push('VERDICT: report above is informational only; no action taken. You decide.');
  }
  lines.push('===============================================================');

  return { report: lines.join('\n'), risks, hasUnknown };
}

// ---------------------------------------------------------------------------
// THIN main() — gathers gitState via read-only git, prints the report.
// Runs ONLY on direct invocation. Never writes a file. Fail-closed throughout.
// ---------------------------------------------------------------------------

// Run a git command read-only. Returns { ok, stdout, stderr, code }.
function git(args, { cwd } = {}) {
  const r = spawnSync('git', args, { cwd, encoding: 'utf-8' });
  if (r.error) return { ok: false, stdout: '', stderr: r.error.message, code: null };
  return { ok: r.status === 0, stdout: (r.stdout || ''), stderr: (r.stderr || ''), code: r.status };
}

function parseHintArg(argv) {
  const i = argv.indexOf('--hint');
  if (i === -1 || i + 1 >= argv.length) return { provided: false, paths: [], slugs: [] };
  const raw = argv[i + 1];
  const parts = raw.split(',').map((s) => s.trim()).filter(Boolean);
  const paths = [];
  const slugs = [];
  for (const p of parts) {
    // Heuristic: treat anything with a slash or a dot-extension as a path,
    // everything else as a slug. Both are checked read-only either way.
    if (p.includes('/') || /\.[A-Za-z0-9]+$/.test(p)) paths.push(p);
    else slugs.push(p);
  }
  return { provided: true, paths, slugs, raw };
}

// Gather the five signals. Any failure sets gitState.error (fail closed) OR a
// per-signal UNKNOWN. Never throws.
function gatherGitState(argv) {
  const state = { fetchOk: null };
  try {
    // Signal 1: fetch origin — the ONLY network/mutating-of-refs action.
    const fetched = git(['fetch', 'origin']);
    state.fetchOk = fetched.ok;
    if (!fetched.ok) state.fetchError = (fetched.stderr || '').trim().split('\n').slice(-1)[0];

    // Signal 2a: origin/main HEAD sha.
    const oh = git(['rev-parse', 'origin/main']);
    if (!oh.ok) { state.error = `cannot resolve origin/main (${(oh.stderr || '').trim()})`; return state; }
    state.originHead = oh.stdout.trim();

    // Signal 2b: register head — read docs/00_sync_state.md ON origin/main (never worktree).
    const sync = git(['show', 'origin/main:docs/00_sync_state.md']);
    state.registerHead = sync.ok ? parseRegisterHead(sync.stdout) : null;

    // Signal 3: ahead / behind vs origin/main + divergence.
    const lm = git(['rev-parse', 'main']);
    if (!lm.ok) {
      // No local main is not fatal to the whole report, but ahead/behind is UNKNOWN.
      state.ahead = null; state.behind = null;
    } else {
      // left = commits on origin not on local (behind), right = on local not on origin (ahead)
      const counts = git(['rev-list', '--left-right', '--count', 'origin/main...main']);
      if (counts.ok) {
        const [behind, ahead] = counts.stdout.trim().split(/\s+/).map((n) => Number.parseInt(n, 10));
        state.behind = Number.isFinite(behind) ? behind : null;
        state.ahead = Number.isFinite(ahead) ? ahead : null;
        // Divergence: both ahead>0 AND behind>0 means both moved past merge-base.
        const mb = git(['merge-base', 'main', 'origin/main']);
        state.diverged =
          state.ahead > 0 && state.behind > 0 &&
          mb.ok && mb.stdout.trim() !== state.originHead && mb.stdout.trim() !== lm.stdout.trim();
      } else {
        state.ahead = null; state.behind = null;
      }
    }

    // Signal 4: working-tree state (porcelain, READ ONLY).
    const status = git(['status', '--porcelain']);
    if (status.ok) {
      state.dirtyFiles = status.stdout.split('\n').map((l) => l.trimEnd()).filter(Boolean);
    } else {
      state.dirtyFiles = null;
    }

    // Signal 5: already-landed hint.
    const hint = parseHintArg(argv);
    state.hintProvided = hint.provided;
    if (hint.provided) {
      state.hintMatches = gatherHintMatches(hint);
    }

    return state;
  } catch (e) {
    // Guardrail 2(a): any unexpected error → fail closed.
    state.error = `internal error while gathering git state: ${e.message}`;
    return state;
  }
}

// Read-only already-landed detection. Byte-identical files under ANY path on
// origin/main + commit subjects containing a slug. Never writes.
function gatherHintMatches(hint) {
  const matches = [];

  // Path hints: does origin/main contain a blob byte-identical to the local file?
  for (const p of hint.paths) {
    try {
      // Hash the LOCAL file's content as a git blob (read-only; no staging).
      const localHash = git(['hash-object', '--', p]);
      if (!localHash.ok) {
        // Local file may not exist — that is fine, just cannot compare by content.
        continue;
      }
      const wantSha = localHash.stdout.trim();
      // List every blob on origin/main and match by object id (content-identical
      // under ANY path). ls-tree -r gives "<mode> blob <sha>\t<path>".
      const tree = git(['ls-tree', '-r', 'origin/main']);
      if (!tree.ok) continue;
      for (const line of tree.stdout.split('\n')) {
        const m = /^\S+\s+blob\s+(\S+)\t(.+)$/.exec(line);
        if (m && m[1] === wantSha) {
          matches.push({ kind: 'byte-identical file', detail: `local "${p}" == origin/main:${m[2]}` });
        }
      }
    } catch { /* read-only best-effort; never throws out */ }
  }

  // Slug hints: any origin/main commit subject containing the slug?
  for (const slug of hint.slugs) {
    try {
      const log = git(['log', '--format=%h %s', '-i', `--grep=${slug}`, 'origin/main']);
      if (log.ok && log.stdout.trim() !== '') {
        for (const line of log.stdout.trim().split('\n').slice(0, 10)) {
          matches.push({ kind: 'commit subject match', detail: `slug "${slug}" → ${line}` });
        }
      }
    } catch { /* best-effort */ }
  }

  return matches;
}

export function main(argv = process.argv.slice(2)) {
  let out;
  try {
    const gitState = gatherGitState(argv);
    out = computeReport(gitState);
  } catch (e) {
    // Final fail-closed net: never emit a clean-sounding report on error.
    const fallback = computeReport({ error: `unhandled error: ${e.message}` });
    process.stdout.write(fallback.report + '\n');
    process.exitCode = 2;
    return;
  }
  process.stdout.write(out.report + '\n');
  // Non-zero exit when truth is UNKNOWN so a wrapper can detect fail-closed.
  process.exitCode = out.hasUnknown ? 2 : 0;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main();
}
