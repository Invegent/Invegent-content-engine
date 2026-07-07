import io, os
os.chdir(r'C:\Users\parve\Invegent-content-engine')
SYNC='docs/00_sync_state.md'; ACT='docs/00_action_list.md'
RESULT='_harness/image_harvester_v0/run8_balcony_coastal/coastal_promo/COASTAL_PROMO_RESULT.md'
STUB='CLAIMED v5.25 · pp-bg-coastal-promo · shared-main-docs · register-commit-gate(LOCAL,push-held-R4) · 2026-07-07T00:10Z\n'

V525=(
"> **✅ v5.25 PP COASTAL PROMOTION — APPLIED + VERIFIED (T3 · PRODUCT_PROOF; 1-row UPDATE; LIVE PRODUCTION ROTATION CHANGE; SELECTION WITNESSED; pool's first coastal)** — "
"`bg_pp_coastal_waterfront` (b3a20013…, Whitehaven Beach QLD) promoted intake_candidate → governed/active on PK hash approval `e4830afa…` (db-rls-auditor PASS zero-must/should-fix + external review `790fec05…` AGREE / risk medium / confidence high) · "
"**Option-D eligible pool: facebook 9→10 · linkedin 9→10 · instagram 8→9 LIVE** (platform_scope {fb,ig,li}) · pre-apply STOP-check passed (row fenced, pool 9/9/9/8) · "
"post-apply proof ALL PASS: unseeded winner still `bg_perth_cbd` (fb+ig) · **30 fb seed probes across all 10 pool members, coastal selected 3× = witnessed selection** · prior 9 governed untouched · "
"demotion rollback `a9b892d6…` standing (byte-exact, verified jsonb-equal + == intake-inserted meta, pool 10→9, reverse production change, PK-gated) · label fence binding (AU coastal / Whitehaven QLD, NEVER Perth/WA) · "
"canonical `_harness/image_harvester_v0/run8_balcony_coastal/coastal_promo/COASTAL_PROMO_RESULT.md` · **PP bg pool now 10 governed/active + 14 inactive candidates** (skyline `bg_pp_city_skyline_vantage` stays fenced) · queue impact: none. Supersedes → v5.24."
)

V525_ACT=(
"> Last updated: 2026-07-06 Sydney — **current marker v5.25 — PP coastal_waterfront PROMOTED to live production (T3; pool fb/li 9→10, ig 8→9; pool's first coastal; selection witnessed)** — "
"`bg_pp_coastal_waterfront` (b3a20013, Whitehaven QLD) intake_candidate → governed/active on PK hash `e4830afa…` (db-rls PASS zero-must/should-fix; external `790fec05…` AGREE/medium/high); pre-apply STOP-check + 4 in-txn assertions passed; proof ALL PASS incl. 30 fb seeds across all 10 members (coastal 3×), unseeded winner still bg_perth_cbd (fb+ig); demotion rollback `a9b892d6…`; label fence AU/Whitehaven-QLD never Perth/WA; PP pool now 10 governed + 14 candidates; canonical `_harness/image_harvester_v0/run8_balcony_coastal/coastal_promo/COASTAL_PROMO_RESULT.md`; queue impact none. "
)

r=io.open(RESULT,encoding='utf-8').read()
assert not r.startswith('CLAIMED'),'already claimed'
io.open(RESULT,'w',encoding='utf-8',newline='\n').write(STUB+r)

s=io.open(SYNC,encoding='utf-8').read()
anchor="Restructured 2026-05-03 (G1). See `docs/runtime/archive/sync_state-pre-2026-05-03.md` for pre-restructure history.\n\n---\n"
assert s.count(anchor)==1 and '> **✅ v5.24 PP BALCONY/COASTAL' in s and 'v5.25' not in s,'sync precondition fail'
io.open(SYNC,'w',encoding='utf-8',newline='\n').write(s.replace(anchor, anchor+'\n'+V525+'\n\n---\n',1))

a=io.open(ACT,encoding='utf-8').read(); lines=a.split('\n')
assert lines[7].startswith('> Last updated: 2026-07-06 Sydney — **current marker v5.24'),'act anchor: '+lines[7][:80]
assert 'v5.25' not in a
prev=lines[7].split('— ',1)[1] if '— ' in lines[7] else lines[7]
lines[7]=V525_ACT.rstrip()+'Previous marker '+prev
io.open(ACT,'w',encoding='utf-8',newline='\n').write('\n'.join(lines))
print('v5.25 applied: claim stub + sync block + action marker')
