// Hermetic tests for apply-harness-auditor.mjs (CCF-04 advisory analyzer).
// Node built-in test runner. No network, no DB, no real cc-0079 packets.
// The pure core is exercised with hand-authored synthetic fixtures + inline
// snippets. Each of the ten checks is tested in BOTH directions (fires / silent).
//   Run: node --test

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

import {
  parsePacket,
  assess,
  rollupVerdict,
  normalizedVerdict,
  VERDICT,
  SEVERITY,
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
} from './apply-harness-auditor.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const MODULE = join(HERE, 'apply-harness-auditor.mjs');
const FIX = join(HERE, 'fixtures', 'apply-harness-auditor');

function fixture(name) {
  return readFileSync(join(FIX, name), 'utf-8');
}
function run(check, text) {
  return check(parsePacket(text));
}
function has(s, phrase) {
  return String(s).toLowerCase().includes(phrase.toLowerCase());
}
// A minimal SQL fence helper for inline snippets.
function sql(body) {
  return '```sql\n' + body + '\n```\n';
}

// ===========================================================================
// PARSER SANITY
// ===========================================================================
test('parsePacket extracts sql blocks, DO blocks, named controls, and a channel', () => {
  const p = parsePacket(fixture('safe-complete.md'));
  assert.ok(p.sqlBlocks.length >= 2, 'finds sql fences');
  assert.ok(p.doBlocks.length >= 4, 'finds DO blocks');
  assert.ok(p.doBlocks.every((d) => typeof d.hasRaiseException === 'boolean'));
  assert.ok(p.namedControls.some((c) => c.name === 'A1'), 'picks up register control A1');
  assert.equal(p.channel.named, true, 'detects the named single-call channel');
});

// ===========================================================================
// FULL-PACKET VERDICTS (the acceptance controls)
// ===========================================================================
test('SAFE fixture -> PASS with zero findings', () => {
  const r = assess(fixture('safe-complete.md'));
  assert.equal(r.verdict, VERDICT.PASS, `expected PASS, got ${r.verdict}: ${JSON.stringify(r.findings.map((f) => f.findingId))}`);
  assert.equal(r.findings.length, 0);
});

test('payload-looks-wrong fixture -> PASS (agent does NOT judge business/payload correctness)', () => {
  const r = assess(fixture('payload-looks-wrong-harness-sound.md'));
  assert.equal(r.verdict, VERDICT.PASS, `expected PASS, got ${r.verdict}: ${JSON.stringify(r.findings)}`);
  assert.equal(r.findings.length, 0, 'odd business numbers must not produce any finding');
});

test('no-channel fixture -> INCOMPLETE, not PASS (missing required control info)', () => {
  const r = assess(fixture('incomplete-no-channel.md'));
  assert.equal(r.verdict, VERDICT.INCOMPLETE);
  assert.ok(r.findings.some((f) => f.incompleteTrigger), 'carries an INCOMPLETE trigger');
  assert.ok(r.findings.some((f) => f.checkId === 4 || f.checkId === 10));
});

test('comment-only-STOP fixture -> CONCERNS, with declared-STOP + comment-abort + row-count findings', () => {
  const r = assess(fixture('defect-comment-only-stop.md'));
  assert.equal(r.verdict, VERDICT.CONCERNS, `got ${r.verdict}`);
  assert.ok(r.findings.some((f) => f.checkId === 1), 'declared STOP not enforced');
  assert.ok(r.findings.some((f) => f.checkId === 2), 'comment-only abort claim');
  assert.ok(r.findings.some((f) => f.checkId === 3), 'row count not fail-closed');
  assert.ok(!r.findings.some((f) => f.incompleteTrigger), 'not INCOMPLETE (channel + register present)');
});

test('multi-call fixture -> INCOMPLETE, but the concrete multi-call finding is STILL enumerated', () => {
  const r = assess(fixture('defect-multicall-unnamed-channel.md'));
  assert.equal(r.verdict, VERDICT.INCOMPLETE);
  // O-2: findings are enumerated independently of the rolled-up verdict.
  assert.ok(r.findings.some((f) => f.checkId === 5), 'multi-call transaction finding is not suppressed by INCOMPLETE');
});

test('baseline-scope-gap fixture -> CONCERNS with the baseline finding', () => {
  const r = assess(fixture('defect-baseline-scope-gap.md'));
  assert.equal(r.verdict, VERDICT.CONCERNS, `got ${r.verdict}: ${JSON.stringify(r.findings.map((f) => f.findingId))}`);
  assert.ok(r.findings.some((f) => f.checkId === 6));
});

test('reworded-abort fixture -> the paraphrased abort claim is STILL caught (wording robustness)', () => {
  const r = assess(fixture('defect-reworded-abort.md'));
  const c2 = r.findings.filter((f) => f.checkId === 2);
  assert.ok(c2.length >= 1, 'a reworded abort claim (no literal "else ABORT") is caught');
  const joined = c2.map((f) => f.declaredControl).join(' | ').toLowerCase();
  assert.ok(joined.includes('halt') || joined.includes('cancel'), 'catches the paraphrased wording');
});

// ===========================================================================
// THE TEN CHECKS — each fires when the defect is present, silent when absent.
// ===========================================================================

// 1 — declared STOP -> executable enforcement
test('check1 fires when a named control has no executable enforcement', () => {
  const t =
    '## S\n| # | Assertion | Enforcement |\n|---|---|---|\n| **G1** | comment only |\n' +
    sql('BEGIN;\nUPDATE x SET a = 1;\nCOMMIT;');
  assert.ok(run(checkDeclaredStopEnforcement, t).length >= 1);
});
test('check1 silent when the named control is enforced by a RAISE-bearing DO', () => {
  const t =
    '## S\n| # | Assertion | Enforcement |\n|---|---|---|\n| **G1** | RAISE |\n' +
    sql("DO $$\nBEGIN\n  IF 1 = 1 THEN RAISE EXCEPTION 'G1 FAILED'; END IF;\nEND $$;");
  assert.equal(run(checkDeclaredStopEnforcement, t).length, 0);
});

// 2 — comment/prose abort claim without RAISE
test('check2 fires on a comment-only abort claim with no adjacent RAISE', () => {
  const t = sql('-- must report exactly 5 rows, else ABORT.\nUPDATE x SET a = 1;');
  assert.ok(run(checkProseOnlyAbort, t).length >= 1);
});
test('check2 silent when the abort claim annotates a real RAISE', () => {
  const t = sql(
    "DO $$\nDECLARE n int;\nBEGIN\n  UPDATE x SET a = 1;\n  GET DIAGNOSTICS n = ROW_COUNT;\n  -- must be 5, else abort\n  IF n <> 5 THEN RAISE EXCEPTION 'FAILED'; END IF;\nEND $$;",
  );
  assert.equal(run(checkProseOnlyAbort, t).length, 0);
});

// 3 — expected row count without fail-closed enforcement
test('check3 fires on an expected row count stated only in a comment', () => {
  const t = sql('-- must update exactly 5 rows\nUPDATE x SET a = 1;');
  assert.ok(run(checkRowCountFailClosed, t).length >= 1);
});
test('check3 silent when the count is backed by GET DIAGNOSTICS + RAISE', () => {
  const t = sql(
    "DO $$\nDECLARE n int;\nBEGIN\n  -- expect exactly 5 rows\n  UPDATE x SET a = 1;\n  GET DIAGNOSTICS n = ROW_COUNT;\n  IF n <> 5 THEN RAISE EXCEPTION 'FAILED'; END IF;\nEND $$;",
  );
  assert.equal(run(checkRowCountFailClosed, t).length, 0);
});

// 4 — atomicity asserted but no named single-call channel
test('check4 fires when atomicity is asserted but no channel is named', () => {
  const t = sql('BEGIN;\nUPDATE x SET a = 1;\nCOMMIT;');
  const f = run(checkTransactionChannelNamed, t);
  assert.ok(f.length >= 1 && f[0].incompleteTrigger);
});
test('check4 silent when a single-call channel is named', () => {
  const t =
    'Submit the entire script as a single call (sanctioned channel).\n' +
    sql('BEGIN;\nUPDATE x SET a = 1;\nCOMMIT;');
  assert.equal(run(checkTransactionChannelNamed, t).length, 0);
});

// 5 — multi-call transaction composition assumption
test('check5 fires when a transaction is split across calls with no xid guard', () => {
  const t =
    sql('BEGIN;\nUPDATE x SET a = 1;') +
    'Then in a separate call:\n' +
    sql('COMMIT;');
  assert.ok(run(checkMultiCallTransaction, t).length >= 1);
});
test('check5 silent when the transaction is one block with an xid anchor guard', () => {
  const t = sql(
    "BEGIN;\nCREATE TEMP TABLE _t AS SELECT pg_current_xact_id() AS xid;\nDO $$\nDECLARE v xid8;\nBEGIN\n  SELECT xid INTO v FROM _t;\n  IF pg_current_xact_id() <> v THEN RAISE EXCEPTION 'GUARD'; END IF;\nEND $$;\nUPDATE x SET a = 1;\nCOMMIT;",
  );
  assert.equal(run(checkMultiCallTransaction, t).length, 0);
});

// 6 — assertion vs baseline scope gap
test('check6 fires when the baseline filter excludes a value the assertion evaluates', () => {
  const r = run(checkBaselineScope, fixture('defect-baseline-scope-gap.md'));
  assert.ok(r.length >= 1);
});
test('check6 silent when the baseline covers the full scope (no excluding filter)', () => {
  assert.equal(run(checkBaselineScope, fixture('safe-complete.md')).length, 0);
});

// 7 — apply vs rollback identity mismatch / duplicate
test('check7 fires on a duplicated identity in a list', () => {
  const t = sql(
    "INSERT INTO pinned VALUES\n  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'),\n  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa');",
  );
  assert.ok(run(checkApplyRollbackIdentity, t).some((f) => has(f.observedImplementation, 'repeats')));
});
test('check7 fires when rollback originals diverge from the apply pinned set', () => {
  const t =
    '## Apply\n' +
    sql("-- pinned originals\nINSERT INTO pinned VALUES ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa');") +
    '## Rollback\n' +
    sql("-- reactivate the originals\nINSERT INTO pinned VALUES ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb');");
  assert.ok(run(checkApplyRollbackIdentity, t).some((f) => has(f.declaredControl, 'rollback reverses')));
});
test('check7 silent when apply and rollback identity sets match (no duplicates)', () => {
  assert.equal(run(checkApplyRollbackIdentity, fixture('safe-complete.md')).length, 0);
});

// 8 — executable ordering vs declared sequence
test('check8 fires when the executable order contradicts the declared sequence', () => {
  const t =
    '## Steps\n1. GUARD-B runs second in code\n2. GUARD-A runs first in code\n\n## SQL\n' +
    sql("DO $$\nBEGIN\n  RAISE EXCEPTION 'GUARD-A x';\nEND $$;\nDO $$\nBEGIN\n  RAISE EXCEPTION 'GUARD-B y';\nEND $$;");
  assert.ok(run(checkExecutableOrdering, t).length >= 1);
});
test('check8 silent when executable order matches the declared sequence', () => {
  assert.equal(run(checkExecutableOrdering, fixture('safe-complete.md')).length, 0);
});

// 9 — failure branch that continues instead of aborting
test('check9 fires on an EXCEPTION handler that logs and does not re-raise', () => {
  const t = sql(
    "DO $$\nBEGIN\n  UPDATE x SET a = 1;\nEXCEPTION WHEN OTHERS THEN\n  RAISE NOTICE 'logged and continuing';\nEND $$;",
  );
  assert.ok(run(checkFailureBranchContinues, t).length >= 1);
});
test('check9 silent when there is no swallowing handler', () => {
  assert.equal(run(checkFailureBranchContinues, fixture('safe-complete.md')).length, 0);
});

// 10 — missing execution-channel or control-register info
test('check10 fires (INCOMPLETE) when no execution channel is named', () => {
  const t =
    '## S\n| # | Assertion | Enforcement |\n|---|---|---|\n| **A1** | RAISE |\n' +
    sql('BEGIN;\nUPDATE x SET a = 1;\nCOMMIT;');
  const f = run(checkMissingControlInfo, t);
  assert.ok(f.some((x) => x.incompleteTrigger && has(x.declaredControl, 'execution channel')));
});
test('check10 silent when both a channel and a control register are present', () => {
  assert.equal(run(checkMissingControlInfo, fixture('safe-complete.md')).length, 0);
});

// ===========================================================================
// RULE DEFECT 1 — declared-control extraction must be STRUCTURALLY CREDIBLE.
// A packet DISCUSSING a prior finding / option / SQLSTATE / session must not be
// mistaken for one DECLARING an executable control.
// ===========================================================================
test('declared controls come only from credible sources — discussion noise is excluded', () => {
  const p = parsePacket(fixture('discipline-declared-controls.md'));
  const names = p.namedControls.map((c) => c.name);
  // genuine declared controls (STOP register + executable guard) are extracted
  assert.ok(names.includes('A1'), 'extracts A1 (executable guard + STOP register)');
  assert.ok(names.includes('A2'), 'extracts A2 (declared STOP register)');
  // discussion tokens are NOT declared controls
  for (const noise of ['M-1', 'M-2', 'M-3', 'S1', 'S-1', 'P3', 'P0001', 'O-4']) {
    assert.ok(!names.includes(noise), `does not treat "${noise}" as a declared control`);
  }
});
test('no finding is ABOUT a discussed finding-id / option / SQLSTATE', () => {
  const r = assess(fixture('discipline-declared-controls.md'));
  const blob = JSON.stringify(r.findings);
  for (const noise of ['M-1', 'M-2', 'M-3', 'P0001', 'O-4']) {
    assert.ok(!blob.includes(`"${noise}"`), `no finding names "${noise}"`);
    assert.ok(!blob.includes(`"${noise} `), `no finding declares "${noise}"`);
  }
});
test('a defect-history table is NOT read as an assertion register', () => {
  // header lacks a name column keyword (assert/stop/control/guard) -> not a register
  const t =
    '## Defects\n| # | Defect | Closure | Repair |\n|---|---|---|---|\n| **M-1** | x | y | 2 |\n' +
    'Submit as a single call.\n' +
    sql("DO $$ BEGIN RAISE EXCEPTION 'K1 FAILED'; END $$;");
  const names = parsePacket(t).namedControls.map((c) => c.name);
  assert.ok(!names.includes('M-1'), 'M-1 from a defect-history table is not a control');
});
test('a genuine STOP register IS still extracted', () => {
  const t =
    '## S\n### STOP conditions\nThe apply STOPs on: A1 not exactly 3 · A9 duplicate present.\n' +
    'Submit as a single call.\n' +
    sql('BEGIN;\nUPDATE x SET a = 1;\nCOMMIT;');
  const names = parsePacket(t).namedControls.map((c) => c.name);
  assert.ok(names.includes('A1') && names.includes('A9'), 'STOP-register tokens are extracted');
});
test('SQLSTATE codes and option/finding ids are rejected even inside a credible block', () => {
  const t =
    '## S\n### STOP conditions\nAbort on P0001 or O-4 or M-1, but enforce A1.\n' +
    'Submit as a single call.\n' +
    sql("DO $$ BEGIN RAISE EXCEPTION 'A1 FAILED'; END $$;");
  const names = parsePacket(t).namedControls.map((c) => c.name);
  assert.ok(names.includes('A1'));
  for (const bad of ['P0001', 'O-4', 'M-1']) assert.ok(!names.includes(bad), `${bad} rejected by shape`);
});
test('hyphenated narrative language is not a declared control', () => {
  const t =
    '## S\nThe statement-by-statement approach is discussed here.\n' +
    '### STOP conditions\nEnforce A1.\n' +
    'Submit as a single call.\n' +
    sql("DO $$ BEGIN RAISE EXCEPTION 'A1 FAILED'; END $$;");
  const names = parsePacket(t).namedControls.map((c) => c.name);
  assert.ok(!names.some((n) => /statement/i.test(n)), 'no narrative token is a control');
});

// ===========================================================================
// RULE DEFECT 2 — baseline linkage follows the assertion's ACTUAL dependency.
// ===========================================================================
test('a comment-only assertion whose baseline is ABSENT is flagged (no DO block needed)', () => {
  const r = run(checkBaselineScope, fixture('defect-baseline-comment-only-absent.md'));
  assert.ok(r.length >= 1, 'flags the absent-baseline comment-only assertion');
  assert.ok(r.some((f) => has(f.declaredControl, 'baseline') || has(f.observedImplementation, 'no baseline')));
});
test('an executable assertion with a valid full-table snapshot is NOT flagged', () => {
  assert.equal(run(checkBaselineScope, fixture('safe-complete.md')).length, 0);
});
test('a targeted mutation baseline that excludes an unchanged platform is NOT flagged', () => {
  assert.equal(run(checkBaselineScope, fixture('baseline-mutation-scope-ok.md')).length, 0);
});
test('a separate non-regression snapshot for the excluded platform is NOT flagged (multi-baseline)', () => {
  assert.equal(run(checkBaselineScope, fixture('baseline-separate-nonregression-ok.md')).length, 0);
});
test('an assertion links to its NAMED baseline, not the nearby wrong query', () => {
  assert.equal(run(checkBaselineScope, fixture('baseline-real-vs-nearby-wrong.md')).length, 0);
});
test('an executable assertion whose linked filtered baseline excludes its scope IS flagged', () => {
  const r = run(checkBaselineScope, fixture('defect-baseline-scope-gap.md'));
  assert.ok(r.length >= 1);
});
test('parseBaselines classifies a full-table snapshot as FULL and a filtered one as FILTERED', () => {
  const p = parsePacket(fixture('baseline-real-vs-nearby-wrong.md'));
  const real = p.baselines.find((b) => b.name === '_real_before');
  const wrong = p.baselines.find((b) => b.name === '_wrong_scan');
  assert.equal(real.kind, 'FULL');
  assert.equal(wrong.kind, 'FILTERED');
});

// GAP 1 — coverage reframe: a scope with no covering baseline fires regardless of
// whether the assertion is executable, a comment, or a register-declared row.
test('check6 fires when an assertion scope is covered by NO baseline (comment + register, filtered-only)', () => {
  const p = parsePacket(fixture('defect-baseline-scope-uncovered.md'));
  // the scope is declared both in the register and in a comment — no DO compares it
  assert.ok(p.scopeAssertions.some((a) => a.kind === 'register' && a.value === 'west'));
  assert.ok(p.scopeAssertions.some((a) => a.kind === 'comment' && a.value === 'west'));
  const r = checkBaselineScope(p);
  assert.equal(r.length, 1, 'one deduped finding for the uncovered scope');
  assert.ok(has(r[0].observedImplementation, 'west'));
});
test('check6 stays silent for the SAME assertion once a full-table snapshot covers it', () => {
  assert.equal(run(checkBaselineScope, fixture('baseline-scope-covered-fulltable.md')).length, 0);
});
test('check6 stays silent for a mutation baseline that omits an entity no assertion needs', () => {
  assert.equal(run(checkBaselineScope, fixture('baseline-mutation-scope-ok.md')).length, 0);
});

// GAP 2 — control extraction excludes evidence citations and descriptive phrases
// WITHOUT regressing genuine (incl. hyphenated) controls.
test('register mixing real controls with a citation + descriptor extracts ONLY the real controls', () => {
  const names = parsePacket(fixture('discipline-register-mixed.md')).namedControls.map((c) => c.name);
  // regression guard: hyphenated real controls + A0/A6 still extract
  for (const real of ['G-ATOMIC', 'A0', 'A-DRIFT', 'A6']) {
    assert.ok(names.includes(real), `keeps real control ${real}`);
  }
  // citations / descriptors are not controls
  for (const bad of ['S1', 'P3', 'PK-directed']) {
    assert.ok(!names.includes(bad), `drops non-control ${bad}`);
  }
});
test('isAssertionId regression: hyphenated real controls pass, descriptors/adjectives fail', () => {
  // exercised via a register name-column: A-PROBE and A5 keep; PK-directed drops.
  const t =
    '## S\n| # | Assertion | Enforcement |\n|---|---|---|\n' +
    '| **A-PROBE** | RAISE |\n| **A5** | RAISE |\n| **PK-directed** | descriptor |\n' +
    'Submit as a single call.\n' +
    sql("DO $$ BEGIN RAISE EXCEPTION 'A-PROBE FAILED'; END $$;");
  const names = parsePacket(t).namedControls.map((c) => c.name);
  assert.ok(names.includes('A-PROBE') && names.includes('A5'));
  assert.ok(!names.includes('PK-directed'));
});
// GENERALIZATION — non-regression scopes extracted from grounded PROSE entities.
test('check6 fires on an UNQUOTED prose non-regression entity (register) that no baseline covers', () => {
  const p = parsePacket(fixture('defect-nonreg-prose-uncovered.md'));
  assert.ok(p.domainValues.has('zephyr'), 'zephyr is corroborated as a partition value');
  assert.ok(p.scopeAssertions.some((a) => a.kind === 'register' && a.value === 'zephyr'));
  const r = checkBaselineScope(p);
  assert.equal(r.length, 1);
  assert.ok(has(r[0].observedImplementation, 'zephyr'));
});
test('the SAME prose assertion is silent once a full-table snapshot covers it', () => {
  assert.equal(run(checkBaselineScope, fixture('baseline-nonreg-prose-fulltable.md')).length, 0);
});
test('the SAME prose assertion is silent when a filtered baseline INCLUDES the entity', () => {
  assert.equal(run(checkBaselineScope, fixture('baseline-nonreg-prose-filtered-includes.md')).length, 0);
});
test('a prose non-regression entity named in a COMMENT is also extracted and fired', () => {
  const p = parsePacket(fixture('nonreg-prose-comment-uncovered.md'));
  assert.ok(p.scopeAssertions.some((a) => a.kind === 'comment' && a.value === 'zephyr'));
  assert.ok(checkBaselineScope(p).length >= 1);
});
test('an arbitrary proper noun (only in narrative, not a domain value) is NOT a scope — no fire', () => {
  const p = parsePacket(fixture('nonreg-prose-false-positive-guard.md'));
  assert.ok(!p.domainValues.has('canberra'), 'the incidental proper noun is not corroborated');
  assert.ok(!p.scopeAssertions.some((a) => a.value === 'canberra'), 'it is not extracted as a scope');
  assert.equal(checkBaselineScope(p).length, 0, 'no spurious check-6 fire');
});
test('quoted-literal scope extraction still works alongside prose extraction', () => {
  // the original quoted-'west' defect fixture still fires exactly once
  assert.equal(run(checkBaselineScope, fixture('defect-baseline-scope-uncovered.md')).length, 1);
});

test('a STOP-register line that is an evidence citation does not yield a control', () => {
  const t =
    '## S\n### STOP conditions\n' +
    'Abort if the state differs from what S1 proved in probe P3.\n' +
    'Abort on A0 collision at the target date.\n' +
    'Submit as a single call.\n' +
    sql("DO $$ BEGIN RAISE EXCEPTION 'A0 FAILED'; END $$;");
  const names = parsePacket(t).namedControls.map((c) => c.name);
  assert.ok(names.includes('A0'), 'the real STOP token A0 is extracted');
  assert.ok(!names.includes('S1') && !names.includes('P3'), 'the evidence citation line yields no control');
});

// ===========================================================================
// GAP 1 — check 7 catches a NON-UUID (pre-image relation) identity mismatch.
// ===========================================================================
test('check7 fires when the rollback restores from a DIFFERENT pre-image relation than the apply created', () => {
  const r = run(checkApplyRollbackIdentity, fixture('defect-rollback-wrong-preimage.md'));
  assert.ok(r.some((f) => has(f.declaredControl, 'pre-image') && has(f.observedImplementation, 'wm_b_pre')));
});
test('check7 silent when apply and rollback reference the SAME pre-image relation', () => {
  assert.equal(run(checkApplyRollbackIdentity, fixture('rollback-same-preimage-ok.md')).length, 0);
});
test('check7 fires on a schema-qualified PERSISTENT CREATE TABLE pre-image mismatch', () => {
  const r = run(checkApplyRollbackIdentity, fixture('defect-rollback-wrong-preimage-persistent.md'));
  assert.ok(r.some((f) => has(f.declaredControl, 'pre-image') && has(f.observedImplementation, 'wmix_backup_pre')));
});
test('check7 silent when apply/rollback share a schema-qualified persistent pre-image', () => {
  assert.equal(run(checkApplyRollbackIdentity, fixture('rollback-same-preimage-persistent-ok.md')).length, 0);
});
test('check7 does NOT fire on an ephemeral in-txn assertion baseline + separate rollback snapshot', () => {
  assert.equal(run(checkApplyRollbackIdentity, fixture('rollback-ephemeral-assertion-baseline-ok.md')).length, 0);
});
test('check7 does NOT fire when the rollback is a DELETE with no restore-FROM relation', () => {
  assert.equal(run(checkApplyRollbackIdentity, fixture('rollback-delete-no-restore-ok.md')).length, 0);
});
test('check7 UUID-list cases still work (regression)', () => {
  const dup = sql(
    "INSERT INTO pinned VALUES\n  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'),\n  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa');",
  );
  assert.ok(run(checkApplyRollbackIdentity, dup).some((f) => has(f.observedImplementation, 'repeats')));
});

// ===========================================================================
// GAP 2 — a psql single-transaction / single-file channel is recognised.
// ===========================================================================
test('a psql --single-transaction -f channel is recognised (no false INCOMPLETE)', () => {
  const p = parsePacket(fixture('channel-psql-single-transaction.md'));
  assert.equal(p.channel.named, true, 'psql single-file/single-transaction is a named channel');
  const r = assess(fixture('channel-psql-single-transaction.md'));
  assert.ok(!r.findings.some((f) => f.checkId === 4), 'no atomicity-without-channel finding');
  assert.ok(!r.findings.some((f) => f.checkId === 10), 'no missing-channel INCOMPLETE');
  assert.equal(r.verdict, VERDICT.PASS);
});

// ===========================================================================
// GAP 3 — comment-only bare-conditional "abort if <cond>" is caught.
// ===========================================================================
test('check2 fires on a comment-only "abort if <cond>" with no RAISE', () => {
  assert.ok(run(checkProseOnlyAbort, fixture('defect-abort-if-conditional.md')).length >= 1);
});
test('check2 silent when an "abort if" comment annotates a real RAISE', () => {
  const t = sql(
    "DO $$\nDECLARE n int;\nBEGIN\n  UPDATE x SET a = 1;\n  GET DIAGNOSTICS n = ROW_COUNT;\n  -- abort if n <> 5\n  IF n <> 5 THEN RAISE EXCEPTION 'FAILED'; END IF;\nEND $$;",
  );
  assert.equal(run(checkProseOnlyAbort, t).length, 0);
});
// GAP 3 tightening — narrative "rollback" NOUN must not false-positive.
test('check2 does NOT fire on descriptive "rollback" noun narrative', () => {
  assert.equal(run(checkProseOnlyAbort, fixture('narrative-rollback-noun-ok.md')).length, 0);
});
test('check2 does NOT fire on "rollback depends on it" (noun + loose "on")', () => {
  assert.equal(run(checkProseOnlyAbort, sql('-- the ONLY result set (the rollback depends on it)\nSELECT 1;')).length, 0);
});
test('check2 recall preserved: "else ABORT", "halt if", "cancel when" still fire (no RAISE)', () => {
  assert.ok(run(checkProseOnlyAbort, sql('-- else ABORT\nUPDATE x SET a = 1;')).length >= 1);
  assert.ok(run(checkProseOnlyAbort, sql('-- halt if the guard fails\nUPDATE x SET a = 1;')).length >= 1);
  assert.ok(run(checkProseOnlyAbort, sql('-- cancel when count = 0\nUPDATE x SET a = 1;')).length >= 1);
});

// ===========================================================================
// GAP 4 — a stated row-count claim in PROSE fires the specific row-count finding.
// ===========================================================================
test('check3 fires on a prose row-count claim with no fail-closed RAISE', () => {
  const r = run(checkRowCountFailClosed, fixture('defect-prose-rowcount.md'));
  assert.ok(r.length >= 1 && r.every((f) => f.checkId === 3), 'a row-count finding is emitted');
  assert.ok(r.some((f) => has(f.executableLocation, 'prose')));
});
test('check3 does NOT fire in prose when the packet has a fail-closed rowcount guard', () => {
  // safe-complete states counts but backs them with GET DIAGNOSTICS + RAISE
  assert.equal(run(checkRowCountFailClosed, fixture('safe-complete.md')).length, 0);
});
test('assess emits the specific row-count finding even alongside an INCOMPLETE verdict', () => {
  const r = assess(fixture('defect-prose-rowcount.md'));
  assert.ok(r.findings.some((f) => f.checkId === 3), 'the specific row-count finding is not swallowed');
});

// ===========================================================================
// VERDICT ROLLUP
// ===========================================================================
test('rollupVerdict: incompleteTrigger dominates -> INCOMPLETE', () => {
  assert.equal(rollupVerdict([{ incompleteTrigger: true }, { incompleteTrigger: false }]), VERDICT.INCOMPLETE);
});
test('rollupVerdict: findings but none incomplete -> CONCERNS', () => {
  assert.equal(rollupVerdict([{ incompleteTrigger: false }]), VERDICT.CONCERNS);
});
test('rollupVerdict: no findings -> PASS', () => {
  assert.equal(rollupVerdict([]), VERDICT.PASS);
});
test('INCOMPLETE never suppresses an already-detected concrete finding', () => {
  const r = assess(fixture('defect-multicall-unnamed-channel.md'));
  assert.equal(r.verdict, VERDICT.INCOMPLETE);
  const concrete = r.findings.filter((f) => !f.incompleteTrigger);
  assert.ok(concrete.length >= 1, 'concrete non-incomplete findings survive an INCOMPLETE rollup');
});

// ===========================================================================
// CCF-02 NORMALIZED MAPPING
// ===========================================================================
test('normalizedVerdict maps PASS->clean, CONCERNS->concerns, INCOMPLETE->block', () => {
  assert.equal(normalizedVerdict(VERDICT.PASS), 'clean');
  assert.equal(normalizedVerdict(VERDICT.CONCERNS), 'concerns');
  assert.equal(normalizedVerdict(VERDICT.INCOMPLETE), 'block');
});

// ===========================================================================
// FAIL-CLOSED — an internal error yields INCOMPLETE, never a fabricated PASS.
// ===========================================================================
test('assess is fail-closed: an internal error becomes INCOMPLETE, not PASS', () => {
  const exploding = {
    toString() {
      throw new Error('boom');
    },
  };
  const r = assess(exploding);
  assert.equal(r.ok, false);
  assert.equal(r.verdict, VERDICT.INCOMPLETE);
  assert.ok(r.findings[0].incompleteTrigger);
  assert.notEqual(r.verdict, VERDICT.PASS);
});

// ===========================================================================
// FINDING SHAPE — every finding carries the required fields.
// ===========================================================================
test('every finding carries all required fields', () => {
  const r = assess(fixture('defect-comment-only-stop.md'));
  assert.ok(r.findings.length > 0);
  for (const f of r.findings) {
    for (const k of [
      'findingId',
      'severity',
      'packetSection',
      'executableLocation',
      'declaredControl',
      'observedImplementation',
      'consequence',
      'recommendedAuthorAction',
    ]) {
      assert.ok(f[k] !== undefined && f[k] !== null && String(f[k]).length > 0, `finding missing ${k}`);
    }
    assert.ok(/^AHA-\d{2}-\d+$/.test(f.findingId), `stable finding id shape: ${f.findingId}`);
    assert.ok(Object.values(SEVERITY).includes(f.severity));
  }
});

// ===========================================================================
// DETERMINISM — same input yields identical findings (ids + order).
// ===========================================================================
test('assess is deterministic across runs', () => {
  const a = assess(fixture('defect-comment-only-stop.md'));
  const b = assess(fixture('defect-comment-only-stop.md'));
  assert.deepEqual(a.findings.map((f) => f.findingId), b.findings.map((f) => f.findingId));
});

// ===========================================================================
// STATIC SOURCE GUARANTEES — no fs WRITE surface, no network, no child process.
// ===========================================================================
test('module source imports NO fs write surface and NO network/child-process', () => {
  const src = readFileSync(MODULE, 'utf-8');
  for (const banned of [
    'writeFileSync',
    'appendFileSync',
    'mkdirSync',
    'createWriteStream',
    'rmSync',
    'unlinkSync',
    'renameSync',
    'writeSync',
  ]) {
    assert.ok(!src.includes(banned), `does not reference ${banned}`);
  }
  for (const net of ["'node:http'", "'node:https'", "'node:net'", "'node:dgram'", "'node:child_process'", 'fetch(']) {
    assert.ok(!src.includes(net), `does not use ${net}`);
  }
  // the only fs use is a read.
  assert.ok(/readFileSync/.test(src), 'reads its input (allowed)');
});

// ===========================================================================
// BLINDNESS GUARANTEE — the analyzer hardcodes NO fixture-specific answers.
// ===========================================================================
test('module source hardcodes no platform names, no packet filenames, no line numbers', () => {
  const src = readFileSync(MODULE, 'utf-8').toLowerCase();
  for (const platform of ['facebook', 'instagram', 'linkedin', 'youtube']) {
    assert.ok(!src.includes(platform), `no hardcoded platform name: ${platform}`);
  }
  // never references the real graded packets
  assert.ok(!src.includes('cc-0079'), 'no reference to the real cc-0079 packets');
  assert.ok(!src.includes('slice-2-apply-packet'), 'no reference to a specific packet file');
  // no "if this is packet X" style embedded answer
  assert.ok(!/expected\s*answer/i.test(src), 'no embedded expected-answer list');
});

// ===========================================================================
// INTEGRATION — the module runs end-to-end via direct invocation, read-only.
// ===========================================================================
test('module runs end-to-end on a fixture and prints a report', () => {
  const target = join(FIX, 'safe-complete.md');
  const r = spawnSync(process.execPath, [MODULE, target], { encoding: 'utf-8', cwd: HERE });
  const text = (r.stdout || '') + (r.stderr || '');
  assert.ok(has(text, 'apply-harness-auditor'), 'prints the report header');
  assert.ok(has(text, 'verdict: PASS'), 'reports the SAFE fixture as PASS');
  assert.equal(r.status, 0, 'clean assessment exits 0');
});

test('module does not modify the working tree it runs in (read-only)', () => {
  const before = spawnSync('git', ['status', '--porcelain'], { encoding: 'utf-8', cwd: HERE });
  spawnSync(process.execPath, [MODULE, join(FIX, 'defect-comment-only-stop.md')], { encoding: 'utf-8', cwd: HERE });
  const after = spawnSync('git', ['status', '--porcelain'], { encoding: 'utf-8', cwd: HERE });
  assert.equal(after.stdout || '', before.stdout || '', 'working tree unchanged after a run');
});
