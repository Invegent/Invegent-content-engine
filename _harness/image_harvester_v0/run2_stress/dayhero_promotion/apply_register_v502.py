import io, os

os.chdir(r'C:\Users\parve\Invegent-content-engine')
SYNC = 'docs/00_sync_state.md'
ACT = 'docs/00_action_list.md'
RESULT = '_harness/image_harvester_v0/run2_stress/dayhero_promotion/PROMOTION_RESULT.md'

STUB = 'CLAIMED v5.02 · pp-bg-dayhero-promotion · shared-main-docs · register-commit-gate · 2026-07-05T06:20Z\n'

V502 = (
"> **✅ v5.02 PP DAY-HERO BACKGROUND PROMOTED TO LIVE PRODUCTION (T3 · PRODUCT_PROOF; 1-row CAS-guarded UPDATE; PK-acknowledged production-rotation change; SELECTION WITNESSED)** — "
"`bg_pp_perth_cbd_skyline_day_wide` (`b2a10008…`, cc-0027 run-2 best-pick) intake_candidate → governed/active on PK hash approval `635275548…` (db-rls-auditor PASS zero-must-fix + external review agree `8cc1a406…`) · "
"**Option-D eligible pool: facebook/linkedin 5→6 LIVE · instagram stays 5 via platform fence (`platform_scope={facebook,linkedin}` — FIRST per-platform pool divergence, fence-proven live: ig rejects `platform_excluded`)** · "
"post-apply proof 6/6: unseeded winner still `bg_perth_cbd` all platforms · day-hero ranks last (created_at untouched) · 27 probe seeds span all 6 members · **seed `wit-1` on the production market_insight template SELECTS the day-hero (witnessed, per auditor recommendation)** · prior 5 governed + 5 batch-2 candidates untouched · "
"demotion rollback `3c5a8e2556…` standing (byte-exact, itself a reverse production change, PK-gated) · consumers verified pool-size-generic (vendored v2 contract 5-key list = stamp-metadata only, now stale text → strengthens the standing contract-v3 carry) · "
"canonical: `_harness/image_harvester_v0/run2_stress/dayhero_promotion/PROMOTION_RESULT.md` · next gates: none for this lane (bright-day Perth hero carry CLOSED end-to-end: candidate agents sourced → stress-proven → PK accepted → intaken → LIVE) · queue impact: none. Supersedes → v5.01."
)

V502_ACT = (
"> Last updated: 2026-07-05 Sydney — **current marker v5.02 — PP Day-Hero Background PROMOTED TO LIVE PRODUCTION (T3; fb/li pool 5→6, ig stays 5 via fence — first per-platform divergence; selection WITNESSED on production template)** — "
"apply `635275548…` PK-hash-approved (db-rls PASS + external agree `8cc1a406…`); proof 6/6 incl. seed `wit-1` selecting the day-hero live; demotion rollback `3c5a8e2556…` standing; day-hero carry CLOSED end-to-end (cc-0027 candidate agents → production); canonical `_harness/image_harvester_v0/run2_stress/dayhero_promotion/PROMOTION_RESULT.md`; queue impact: none. "
)

r = io.open(RESULT, encoding='utf-8').read()
assert not r.startswith('CLAIMED'), 'result doc already claimed — ABORT'
io.open(RESULT, 'w', encoding='utf-8', newline='\n').write(STUB + r)

s = io.open(SYNC, encoding='utf-8').read()
anchor = "Restructured 2026-05-03 (G1). See `docs/runtime/archive/sync_state-pre-2026-05-03.md` for pre-restructure history.\n\n---\n"
assert s.count(anchor) == 1, 'sync_state anchor not unique — ABORT'
assert '> **✅ v5.01 PP DAY-HERO BACKGROUND INTAKE' in s, 'v5.01 head missing — ABORT'
assert 'v5.02' not in s, 'v5.02 already present — ABORT'
io.open(SYNC, 'w', encoding='utf-8', newline='\n').write(
    s.replace(anchor, anchor + '\n' + V502 + '\n\n---\n', 1))

a = io.open(ACT, encoding='utf-8').read()
lines = a.split('\n')
assert lines[7].startswith('> Last updated: 2026-07-05 Sydney — **current marker v5.01'), 'action_list anchor mismatch — ABORT: ' + lines[7][:100]
assert 'v5.02' not in a, 'v5.02 already present in action_list — ABORT'
prev = lines[7].split('— ', 1)[1] if '— ' in lines[7] else lines[7]
lines[7] = V502_ACT.rstrip() + 'Previous marker ' + prev
io.open(ACT, 'w', encoding='utf-8', newline='\n').write('\n'.join(lines))
print('claim stub + v5.02 sync_state block + action_list marker applied')
