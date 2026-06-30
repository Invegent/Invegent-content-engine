// session-bootstrap.mjs — ICE CCF-01 Phase 1 SessionStart hook (bootstrap)
//
// PURPOSE
//   Load repo/branch/HEAD/register context into the session at start, so the
//   operator/orchestrator does not rely on memory for the basics. INFORM ONLY:
//   it emits context and never blocks, never reconciles, never approves.
//
//   Per U5, register context for Phase 1 is the HEADS of:
//     - docs/00_sync_state.md
//     - docs/00_action_list.md
//   reported "AS RECORDED (not reconciled)" — surfacing, not judging.
//
// CONTRACT
//   SessionStart hooks emit additionalContext that is added to the session.
//   This hook has NO enforcing mode (nothing to enforce) and always exits 0.

import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { pathToFileURL, fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');

function git(args) {
  try {
    const r = spawnSync('git', args, { cwd: REPO_ROOT, encoding: 'utf-8' });
    return r.status === 0 ? (r.stdout || '').trim() : null;
  } catch {
    return null;
  }
}

export function gatherGit() {
  const symbolic = git(['symbolic-ref', '-q', '--short', 'HEAD']);
  const detached = symbolic === null || symbolic === '';
  const branch = detached ? null : symbolic;
  const head = git(['rev-parse', '--short', 'HEAD']);
  const dirty = git(['status', '--porcelain']);
  const dirtyCount = dirty == null ? null : dirty.split('\n').filter(Boolean).length;
  let ahead = null, behind = null;
  const counts = git(['rev-list', '--count', '--left-right', '@{upstream}...HEAD']);
  if (counts && /^\d+\s+\d+$/.test(counts)) {
    const [b, a] = counts.split(/\s+/);
    behind = Number(b); ahead = Number(a);
  }
  const wt = git(['worktree', 'list']);
  const worktreeCount = wt == null ? null : wt.split('\n').filter(Boolean).length;
  return { branch, detached, head, dirtyCount, ahead, behind, worktreeCount };
}

// Read the head of a register file (first `maxLines` non-empty lines, capped).
export function registerHead(relPath, maxLines = 20, maxChars = 1400) {
  try {
    const full = join(REPO_ROOT, relPath);
    const text = readFileSync(full, 'utf-8');
    const lines = text.split(/\r?\n/);
    const out = [];
    for (const ln of lines) {
      out.push(ln);
      if (out.filter((l) => l.trim()).length >= maxLines) break;
    }
    return out.join('\n').slice(0, maxChars);
  } catch (e) {
    return `(could not read ${relPath}: ${e.code || e.message})`;
  }
}

export function formatContext(state, registers) {
  const g = state;
  const lines = [];
  lines.push('## ICE session bootstrap (CCF-01 Phase 1 — inform only)');
  lines.push('');
  lines.push('### Git state (HEAD truth)');
  lines.push(`- branch: ${g.detached ? 'DETACHED HEAD ⚠' : g.branch || 'unknown'}`);
  lines.push(`- HEAD: ${g.head || 'unknown'}`);
  lines.push(`- working tree: ${g.dirtyCount == null ? 'unknown' : g.dirtyCount === 0 ? 'clean' : `${g.dirtyCount} changed path(s)`}`);
  lines.push(`- upstream parity: ${g.ahead == null ? 'unknown/none' : `ahead ${g.ahead}, behind ${g.behind}`}`);
  lines.push(`- active worktrees: ${g.worktreeCount == null ? 'unknown' : g.worktreeCount}`);
  lines.push('');
  lines.push('### Register heads — AS RECORDED (not reconciled)');
  for (const r of registers) {
    lines.push(`#### ${r.path}`);
    lines.push('```');
    lines.push(r.head);
    lines.push('```');
  }
  lines.push('');
  lines.push('_Bootstrap surfaces state only; it does not reconcile registers or grant any approval._');
  return lines.join('\n');
}

function main() {
  try {
    const state = gatherGit();
    const registers = [
      { path: 'docs/00_sync_state.md', head: registerHead('docs/00_sync_state.md') },
      { path: 'docs/00_action_list.md', head: registerHead('docs/00_action_list.md') },
    ];
    const context = formatContext(state, registers);
    const out = {
      hookSpecificOutput: {
        hookEventName: 'SessionStart',
        additionalContext: context,
      },
    };
    process.stdout.write(JSON.stringify(out));
    process.exit(0);
  } catch (e) {
    // Inform-only: never break session start. Emit nothing on failure.
    process.stderr.write(`[session-bootstrap] non-fatal: ${e.message}\n`);
    process.exit(0);
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main();
}
