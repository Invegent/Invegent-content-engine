#!/usr/bin/env node
// ICE Assurance Routine v1 — zero-authority deterministic check runner.
// Governor contract: stateless, read-only, recomputes from source, idempotent, never decides.
// DB access ONLY via the allowlisted read-only wrapper scripts/db-read.py (ice_ro + catalog).
// Any check error => UNKNOWN (fail-closed). A FLAG informs; it clears/holds nothing.
// Registry + cadence + baselines doc: docs/architecture/ice-assurance-routine-v1.md

import { spawnSync } from 'node:child_process';
import { readFileSync, readdirSync, statSync, mkdirSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO = join(dirname(fileURLToPath(import.meta.url)), '..', '..');

// Accepted baselines — frozen in Baseline Snapshot 2026-08-08 (db68f7b). Only NEW entrants FLAG.
const BASELINE_GHOST_SLUGS = ['ingest', 'compliance-monitor', 'pipeline-ai-summary', 'pipeline-doctor'];
const BASELINE_NOAUTH_EFS = [
  'ai-diagnostic', 'client-weekly-summary', 'compliance-reviewer', 'draft-notifier', 'drift-check',
  'email-ingest', 'external-reviewer-digest', 'feed-intelligence', 'insights-feedback', 'insights-worker',
  'onboarding-notifier', 'pipeline-diagnostician', 'pipeline-healer', 'pipeline-sentinel',
  'subscription-email-ingest', 'weekly-manager-report',
];
const BASELINE_QUERYKEY_EFS = ['linkedin-publisher', 'external-reviewer'];
const EXPECTED_R0_VIEWS = [
  // Original R0 ten (v5.87) — note CLAUDE.md's "10 views" line is stale against this observed reality:
  'asset_governance_status', 'cron_health', 'deploy_drift_status', 'draft_status', 'music_governance_status',
  'pipeline_health', 'publish_status', 'render_status', 'slot_status', 'template_registry_status',
  // Gated later additions observed 2026-08-08 (WS-3 asset-gap + graduation read model v6.87):
  'asset_gap_backlog', 'asset_graduation_client_owned', 'asset_graduation_client_pool_policy',
  'asset_graduation_geo_classes', 'asset_graduation_shared_reachability',
];
// Columns deliberately withheld from R0 (snapshot §4.3); their appearance = ungated posture widening.
const WITHHELD_COLUMNS = ['skip_reason', 'error_message', 'last_error', 'dead_reason', 'storage_path', 'render_spec', 'source_material', 'created_by'];

function dbRead(sql) {
  const r = spawnSync('python', [join(REPO, 'scripts', 'db-read.py'), sql], { encoding: 'utf8', cwd: REPO, timeout: 60000 });
  if (r.status !== 0) throw new Error(`db-read exit ${r.status}: ${(r.stderr || r.stdout || '').slice(0, 300)}`);
  const lines = r.stdout.split(/\r?\n/).filter((l) => l.length > 0);
  if (lines.length && /^\(\d+ rows?\)$/.test(lines[lines.length - 1])) lines.pop();
  const rows = lines.map((l) => l.split('\t'));
  return { header: rows[0] ?? [], rows: rows.slice(1) };
}
function git(args) {
  const r = spawnSync('git', args, { encoding: 'utf8', cwd: REPO, timeout: 30000 });
  if (r.status !== 0) throw new Error(`git ${args[0]} exit ${r.status}`);
  return r.stdout;
}
const read = (rel) => readFileSync(join(REPO, rel), 'utf8');

const checks = [
  {
    id: 'AR-01', name: 'Skip-rate / throughput threshold',
    fn: () => {
      const facts = [], flags = [];
      const s = dbRead("SELECT status, count(*) FROM ice_ro.slot_status WHERE updated_at > now() - interval '7 days' GROUP BY 1 ORDER BY 1");
      const counts = Object.fromEntries(s.rows.map(([k, v]) => [k, Number(v)]));
      const filled = counts.filled ?? 0, skipped = counts.skipped ?? 0;
      const share = filled + skipped ? skipped / (filled + skipped) : null;
      facts.push(`slots 7d: filled=${filled} skipped=${skipped} skip-share=${share === null ? 'n/a' : (share * 100).toFixed(1) + '%'}`);
      const d = dbRead("SELECT count(*) FILTER (WHERE created_at > now() - interval '7 days') AS cur, count(*) FILTER (WHERE created_at <= now() - interval '7 days' AND created_at > now() - interval '14 days') AS prev FROM ice_ro.draft_status");
      const cur = Number(d.rows[0]?.[0] ?? 0), prev = Number(d.rows[0]?.[1] ?? 0);
      facts.push(`drafts: last7d=${cur} prior7d=${prev}`);
      if (share !== null && share > 0.5) flags.push(`skip share ${(share * 100).toFixed(1)}% > 50% threshold`);
      if (prev >= 5 && cur < 0.6 * prev) flags.push(`drafts 7d dropped >40% week-over-week (${prev} -> ${cur})`);
      return { facts, flags };
    },
  },
  { id: 'AR-02', name: 'Capability drop digest', stub: 'blocked on cc-0091 A3-1 apply (Gate B) — ice_ro.format_capability_drop_status does not exist yet' },
  { id: 'AR-03', name: 'Migration ledger vs git', stub: 'needs a gated ledger read or a future secret-free ice_ro ledger view (R0 coverage-gap rule)' },
  { id: 'AR-04', name: 'Deployed bundle parity', stub: 'deploy-verifier agent lane (Management API), not a script check' },
  {
    id: 'AR-05', name: 'Register federation count',
    fn: () => {
      const facts = [], flags = [];
      const action = read('docs/00_action_list.md');
      const openIds = new Set();
      for (const line of action.split(/\r?\n/)) {
        if (!/\bOPEN\b/.test(line)) continue;
        for (const m of line.matchAll(/\b(?:F|SEC)-[A-Z0-9][A-Z0-9-]+/g)) openIds.add(m[0]);
      }
      facts.push(`action-list open F-*/SEC-* ids: ${openIds.size}`);
      let auditCount = null;
      try {
        const audit = read('docs/audit/open_findings.md');
        // Semantic parse of the Summary severity table: | Critical | <open> | <closed> |
        const sev = [...audit.matchAll(/^\|\s*(Critical|High|Medium|Low|Info)\s*\|\s*(\d+)\s*\|/gim)];
        if (sev.length >= 5) auditCount = sev.reduce((a, m) => a + Number(m[2]), 0);
      } catch { /* audit register unreadable -> stays null */ }
      facts.push(`audit-register stated open count: ${auditCount === null ? 'UNPARSED' : auditCount}`);
      if (auditCount === 0 && openIds.size > 0) flags.push(`federation divergence: audit register says 0 open, action list carries ${openIds.size} (AB-12)`);
      if (auditCount === null) return { facts, flags, unknown: 'audit register open-count not parseable' };
      return { facts, flags };
    },
  },
  {
    id: 'AR-06', name: 'Ghost-EF detector',
    fn: () => {
      const facts = [], flags = [];
      const toml = read('supabase/config.toml');
      const slugs = [...toml.matchAll(/\[functions\.([A-Za-z0-9_-]+)\]/g)].map((m) => m[1]);
      const dirs = readdirSync(join(REPO, 'supabase', 'functions')).filter((d) => {
        try { return statSync(join(REPO, 'supabase', 'functions', d)).isDirectory(); } catch { return false; }
      });
      const ghosts = slugs.filter((s) => !dirs.includes(s));
      const unlisted = dirs.filter((d) => !slugs.includes(d));
      facts.push(`config.toml function entries=${slugs.length}; repo EF dirs=${dirs.length}`);
      facts.push('limitation: deploy-only ghosts reachable via live cron targets (AB-18: ingest, compliance-monitor, pipeline-ai-summary, pipeline-doctor) need the DB cron read — AR-03/AR-04 tier, not visible to this local check');
      facts.push(`standing ghosts (baseline-accepted, AB-18): ${ghosts.filter((g) => BASELINE_GHOST_SLUGS.includes(g)).join(', ') || 'none'}`);
      if (unlisted.length) facts.push(`repo dirs absent from config.toml (informational — default verify_jwt=true applies on deploy): ${unlisted.join(', ')}`);
      const newGhosts = ghosts.filter((g) => !BASELINE_GHOST_SLUGS.includes(g));
      if (newGhosts.length) flags.push(`NEW ghost slugs (config entry, no repo source): ${newGhosts.join(', ')}`);
      return { facts, flags };
    },
  },
  {
    id: 'AR-07', name: 'Untracked-but-cited files',
    fn: () => {
      const facts = [], flags = [];
      const untracked = git(['status', '--porcelain', '-uall']).split(/\r?\n/)
        .filter((l) => l.startsWith('?? ')).map((l) => l.slice(3).trim())
        .filter((p) => p.startsWith('docs/') && !p.endsWith('/'));
      const registers = read('docs/00_sync_state.md') + '\n' + read('docs/00_action_list.md');
      const cited = untracked.filter((p) => registers.includes(p) || registers.includes(p.split('/').pop()));
      facts.push(`untracked docs/** paths=${untracked.length}; cited by a register head=${cited.length}`);
      if (cited.length) flags.push(`register-cited but untracked (AB-21 class): ${cited.slice(0, 10).join(', ')}${cited.length > 10 ? ` … +${cited.length - 10} more` : ''}`);
      return { facts, flags };
    },
  },
  {
    id: 'AR-08', name: 'Secret-hygiene scan (local)',
    fn: () => {
      const facts = [], flags = [];
      const base = join(REPO, 'supabase', 'functions');
      // Scope: only EFs declared in config.toml run with verify_jwt=false (open gateway) — absence from
      // config.toml means the CLI default verify_jwt=true gateway-authenticates the function.
      const toml = read('supabase/config.toml');
      const openGateway = [...toml.matchAll(/\[functions\.([A-Za-z0-9_-]+)\]/g)].map((m) => m[1]);
      const noAuth = [], queryKey = [];
      for (const d of readdirSync(base)) {
        // Concatenate all top-level + lib/*.ts sources: cadence-family EFs authenticate in lib/db.ts, not index.ts.
        let text = '';
        for (const sub of ['', 'lib']) {
          const dir = join(base, d, sub);
          try {
            for (const f of readdirSync(dir)) if (f.endsWith('.ts')) text += readFileSync(join(dir, f), 'utf8') + '\n';
          } catch { /* no such subdir */ }
        }
        if (!text) continue;
        // Inbound checks only: headers.get(...) or Hono req.header(...) reading x-* / authorization —
        // an outbound `Authorization:`/`x-api-key:` fetch-header OBJECT literal must not count.
        const hasInboundAuth = /(?:headers\.get|\.header)\(\s*['"](?:x-[a-z0-9-]+|authorization)['"]/i.test(text);
        if (openGateway.includes(d) && !hasInboundAuth) noAuth.push(d);
        if (/searchParams\.get\(\s*['"]key['"]\s*\)|[?&]key=\$\{/.test(text)) queryKey.push(d);
      }
      facts.push(`EFs with no inbound-auth marker: ${noAuth.length} (baseline ${BASELINE_NOAUTH_EFS.length})`);
      facts.push(`EFs accepting a key via URL/query: ${queryKey.join(', ') || 'none'} (baseline: ${BASELINE_QUERYKEY_EFS.join(', ')})`);
      const newNoAuth = noAuth.filter((d) => !BASELINE_NOAUTH_EFS.includes(d));
      const newQueryKey = queryKey.filter((d) => !BASELINE_QUERYKEY_EFS.includes(d));
      if (newNoAuth.length) flags.push(`NEW no-auth EFs beyond baseline (AB-17): ${newNoAuth.join(', ')}`);
      if (newQueryKey.length) flags.push(`NEW query-param key acceptance: ${newQueryKey.join(', ')}`);
      return { facts, flags };
    },
  },
  {
    id: 'AR-09', name: 'R0 view blind-spot regression',
    fn: () => {
      const facts = [], flags = [];
      const v = dbRead("SELECT table_name FROM information_schema.tables WHERE table_schema='ice_ro' ORDER BY 1");
      const views = v.rows.map((r) => r[0]);
      facts.push(`ice_ro views present: ${views.length} [${views.join(', ')}]`);
      const missing = EXPECTED_R0_VIEWS.filter((x) => !views.includes(x));
      const extra = views.filter((x) => !EXPECTED_R0_VIEWS.includes(x));
      if (missing.length) flags.push(`expected views MISSING: ${missing.join(', ')}`);
      if (extra.length) facts.push(`views beyond snapshot baseline (expected when A3/publish_status_v2 land — verify gated): ${extra.join(', ')}`);
      const w = dbRead(`SELECT table_name, column_name FROM information_schema.columns WHERE table_schema='ice_ro' AND column_name IN (${WITHHELD_COLUMNS.map((c) => `'${c}'`).join(',')}) ORDER BY 1,2`);
      if (w.rows.length) flags.push(`withheld-class columns now exposed (posture widening — confirm it was gated): ${w.rows.map((r) => r.join('.')).join(', ')}`);
      else facts.push('withheld-class columns: none exposed (posture unchanged)');
      return { facts, flags };
    },
  },
  {
    id: 'AR-10', name: 'Governance coverage',
    fn: () => {
      const facts = [], flags = [];
      const t = dbRead("SELECT count(DISTINCT family_key) FILTER (WHERE family_status='active'), count(DISTINCT family_key), count(*) FROM ice_ro.template_registry_status");
      facts.push(`template families: active=${t.rows[0][0]} of ${t.rows[0][1]} (templates=${t.rows[0][2]})`);
      const g = dbRead('SELECT count(*), count(DISTINCT format) FROM ice_ro.asset_governance_status');
      facts.push(`asset-governance rows=${g.rows[0][0]} distinct formats=${g.rows[0][1]}`);
      const m = dbRead('SELECT count(*) FILTER (WHERE production_use_allowed), count(*) FROM ice_ro.music_governance_status');
      facts.push(`music: eligible=${m.rows[0][0]} of ${m.rows[0][1]} (Lane-5 unfreeze threshold: 4)`);
      if (Number(m.rows[0][0]) < 4) flags.push(`music eligible pool ${m.rows[0][0]} < 4 — Lane 5 stays frozen; kinetic audio gap persists (AB-07)`);
      return { facts, flags };
    },
  },
  { id: 'AR-11', name: 'Stale-citation lint', stub: 'later tranche — resolve cited file:line anchors in governing packets' },
];

const results = [];
for (const c of checks) {
  if (c.stub) { results.push({ id: c.id, name: c.name, status: 'STUB', facts: [c.stub], flags: [] }); continue; }
  try {
    const r = c.fn();
    results.push({ id: c.id, name: c.name, status: r.unknown ? 'UNKNOWN' : r.flags.length ? 'FLAG' : 'OK', facts: r.facts, flags: r.flags, note: r.unknown });
  } catch (e) {
    results.push({ id: c.id, name: c.name, status: 'UNKNOWN', facts: [], flags: [], note: `check error (fail-closed): ${String(e).slice(0, 200)}` });
  }
}

const now = new Date();
const stamp = now.toISOString().slice(0, 10);
let md = `# ICE Assurance Routine v1 — run ${now.toISOString()}\n\n`;
md += `Zero-authority, read-only, inform-only. A FLAG clears or holds nothing; UNKNOWN is fail-closed. Registry: docs/architecture/ice-assurance-routine-v1.md\n\n`;
md += `| Check | Status | Summary |\n|---|---|---|\n`;
for (const r of results) md += `| ${r.id} ${r.name} | **${r.status}** | ${(r.flags[0] ?? r.note ?? r.facts[0] ?? '')} |\n`;
md += `\n## Detail\n`;
for (const r of results) {
  md += `\n### ${r.id} ${r.name} — ${r.status}\n`;
  for (const f of r.facts) md += `- ${f}\n`;
  for (const f of r.flags) md += `- **FLAG:** ${f}\n`;
  if (r.note) md += `- note: ${r.note}\n`;
}
const DAILY = process.argv.includes('--daily');

if (!DAILY) {
  // Manual/notable run: record under docs/ (commit is a human act, never this script's).
  const outDir = join(REPO, 'docs', 'architecture', 'assurance-runs');
  mkdirSync(outDir, { recursive: true });
  const outPath = join(outDir, `${stamp}-routine-v1.md`);
  writeFileSync(outPath, md);
  console.log(md);
  console.log(`\n[written] ${outPath}`);
} else {
  // DAILY CRON MODE — inform-only, incapable of remediation/gating/approval/register mutation.
  // Writes ONLY under gitignored _harness/assurance_routine/. Full output is preserved in the
  // ordinary execution log; operator attention is raised ONLY for deltas (NEW FLAG / RECOVERED)
  // and for UNKNOWN — unchanged known FLAGs are listed as standing, never re-alerted.
  const routineDir = join(REPO, '_harness', 'assurance_routine');
  const logDir = join(routineDir, 'logs');
  mkdirSync(logDir, { recursive: true });

  // Previous state = the latest durable run record (logs dir, else the committed docs run records).
  // Derived from durable artifacts only — the check layer itself stays stateless.
  const latestStatuses = (dir) => {
    try {
      const files = readdirSync(dir).filter((f) => /^\d{4}-\d{2}-\d{2}.*\.md$/.test(f)).sort();
      if (!files.length) return null;
      const txt = readFileSync(join(dir, files[files.length - 1]), 'utf8');
      const map = {};
      for (const m of txt.matchAll(/^\|\s*(AR-\d+)[^|]*\|\s*\*\*([A-Z]+)\*\*/gm)) map[m[1]] = m[2];
      return Object.keys(map).length ? { file: files[files.length - 1], map } : null;
    } catch { return null; }
  };
  const prev = latestStatuses(logDir) ?? latestStatuses(join(REPO, 'docs', 'architecture', 'assurance-runs'));

  const attention = [], standing = [];
  for (const r of results) {
    const p = prev?.map[r.id];
    if (r.status === 'UNKNOWN') attention.push(`${r.id} ${r.name}: UNKNOWN (fail-closed) — ${r.note ?? ''}`);
    else if (r.status === 'FLAG' && p !== 'FLAG') attention.push(`${r.id} ${r.name}: NEW FLAG — ${r.flags[0] ?? ''}`);
    else if (r.status === 'OK' && p === 'FLAG') attention.push(`${r.id} ${r.name}: RECOVERED (was FLAG)`);
    else if (r.status === 'FLAG') standing.push(r.id);
  }

  let delta = `\n## Delta vs previous run (${prev ? prev.file : 'none — first daily run'})\n`;
  delta += attention.length ? attention.map((a) => `- **${a}**\n`).join('') : '- no attention conditions (no NEW FLAG / RECOVERED / UNKNOWN)\n';
  delta += standing.length ? `- standing known FLAGs (not re-alerted): ${standing.join(', ')}\n` : '';

  writeFileSync(join(logDir, `${stamp}-routine-v1.md`), md + delta);
  writeFileSync(join(routineDir, 'ATTENTION-latest.md'),
    `# Assurance Routine — attention (${now.toISOString()})\n\n` +
    (attention.length ? attention.map((a) => `- ${a}\n`).join('') : 'No attention conditions today.\n') +
    (standing.length ? `\nStanding known FLAGs: ${standing.join(', ')} (full detail in logs/${stamp}-routine-v1.md)\n` : ''));
  if (attention.length) {
    // Best-effort, non-blocking operator toast; failure is irrelevant to the run.
    try { spawnSync('msg', ['*', '/TIME:30', `ICE Assurance Routine: ${attention.length} attention item(s) — see _harness/assurance_routine/ATTENTION-latest.md`], { timeout: 5000 }); } catch { /* best-effort */ }
  }
  console.log(md + delta);
  console.log(`\n[daily log] _harness/assurance_routine/logs/${stamp}-routine-v1.md · attention items: ${attention.length}`);
  process.exitCode = 0; // always: a FLAG informs, it never fails/gates anything
}
