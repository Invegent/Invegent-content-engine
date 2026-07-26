// source-truth-session-hook.mjs — ICE CCF-04 SessionStart adapter
//
// PURPOSE
//   Runs the CCF-04 Source Truth Check (.claude/helpers/source-truth-check.mjs)
//   at session start and injects its report as session additionalContext, so the
//   "am I working from truth?" panel — a FRESH git fetch + the PARSED register
//   head + ahead/behind/dirty/already-landed risk flags — is present WITHOUT a
//   human remembering to run it. This closes the CCF-04 adoption gap: the helper
//   was built + proven but only ever run by hand, so its value was intermittent.
//
//   It complements (does NOT replace) session-bootstrap.mjs: the bootstrap is a
//   fast, fetch-free local snapshot; this adds the fetched truth (bootstrap's
//   ahead/behind can be stale — the "digest lag" failure this check exists for).
//
// CONTRACT (mirrors session-bootstrap.mjs + the CCF-04 charter)
//   INFORM ONLY. It never blocks, resolves, approves, or mutates. It ALWAYS
//   exits 0 — a failed/absent check degrades to an honest note, never breaks
//   session start, and is NEVER phrased as a certification of truth. This adapter
//   adds NO judgment of its own: the helper stays the single source of the check;
//   the adapter only transports the helper's report into the additionalContext
//   channel (and surfaces the helper's fail-closed UNKNOWN verdict as a banner).

import { spawnSync } from 'node:child_process';
import { pathToFileURL, fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';

const HERE = dirname(fileURLToPath(import.meta.url));
const HELPER = join(HERE, '..', 'helpers', 'source-truth-check.mjs');
const REPO_ROOT = resolve(HERE, '..', '..');

function emit(additionalContext) {
  const out = { hookSpecificOutput: { hookEventName: 'SessionStart', additionalContext } };
  process.stdout.write(JSON.stringify(out));
  process.exit(0);
}

function main() {
  try {
    // The helper does its own read-only git (fetch origin is its ONLY mutating-of-
    // refs action). A generous timeout keeps a slow network from stalling startup.
    const r = spawnSync(process.execPath, [HELPER], {
      cwd: REPO_ROOT, encoding: 'utf-8', timeout: 30000, maxBuffer: 8 * 1024 * 1024,
    });
    const report = ((r.stdout || '') + (r.stderr || '')).trim();
    if (!report) {
      emit('## ICE Source Truth Check (CCF-04 — inform only)\n\n' +
        '_(no output — the check was skipped this session; absence is NOT a certification of truth)_');
    }
    // The helper exits 2 iff it declared UNKNOWN (fail-closed). Surface that.
    const unknown = r.status === 2;
    const header = unknown
      ? '## ICE Source Truth Check (CCF-04) — ⚠ VERDICT UNKNOWN (fail-closed; do NOT treat as all-clear)'
      : '## ICE Source Truth Check (CCF-04 — inform only)';
    emit(`${header}\n\n\`\`\`\n${report}\n\`\`\`\n\n` +
      '_Advisory only; resolves nothing. Each flag is a human decision — you decide whether you are working from truth._');
  } catch (e) {
    // Never break session start.
    emit('## ICE Source Truth Check (CCF-04 — inform only)\n\n' +
      `_(non-fatal: ${e.message}; the check did not run — absence is NOT a certification of truth)_`);
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main();
}
