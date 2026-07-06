import io, os
os.chdir(r'C:\Users\parve\Invegent-content-engine')
SYNC='docs/00_sync_state.md'; ACT='docs/00_action_list.md'
RESULT='_harness/image_harvester_v0/promo_review2/PROMOTION_V2_RESULT.md'
STUB='CLAIMED v5.16 · pp-bg-promo-v2 · shared-main-docs · register-commit-gate · 2026-07-06T10:55Z\n'

V516=(
"> **✅ v5.16 PP BACKGROUND PROMOTION v2 — APPLIED + VERIFIED (T3 · PRODUCT_PROOF; 2-row UPDATE; LIVE PRODUCTION ROTATION CHANGE; SELECTION WITNESSED)** — "
"`bg_pp_kitchen_living_open_plan` (b3a20003…, first interior in the pool) + `bg_pp_advisory_desk_flatlay` (b3a20009…, first professional-desk) promoted intake_candidate → governed/active on PK hash approval `9a76f660…` (db-rls-auditor PASS zero-must-fix + external review PARTIAL/ESCALATE `9ea170e6…` high-risk — substantively CORRECT for a real production change, no concrete defect) · "
"**Option-D eligible pool: facebook 6→8 · linkedin 6→8 · instagram 5→7 LIVE** (both platform_scope {fb,ig,li}) · post-apply proof ALL PASS: unseeded winner still `bg_perth_cbd` on all 3 platforms · both rank last (created_at untouched) · resolve_brand_assets 2 hits · **16 fb seed probes spread across all 8 pool members, 4 landing on the 2 new assets = witnessed selection** · prior 6 governed untouched · "
"demotion rollback `5bea647e…` standing (byte-exact, pool 8→6, reverse production change, PK-gated) · carries: vendored v2 contract key-list further stale (contract-v3 carry, metadata-only) · scrim-unit normalise (future scrim_opacity_override) · "
"canonical `_harness/image_harvester_v0/promo_review2/PROMOTION_V2_RESULT.md` · **PP bg pool now 8 governed/active + 13 inactive candidates** · next gates: further promotions from the 13 (each a live rotation change) · 3 HOLD rows (market-data/balcony/coastal) · queue impact: none. Supersedes → v5.15."
)

V516_ACT=(
"> Last updated: 2026-07-06 Sydney — **current marker v5.16 — PP background promotion v2 APPLIED + VERIFIED (T3; kitchen + advisory_desk → governed/active; LIVE pool fb/li 6→8, ig 5→7; selection witnessed)** — "
"apply `9a76f660…` PK-hash-approved (db-rls PASS; external PARTIAL/ESCALATE `9ea170e6…` high-risk, substantively-correct for a real production change); proof ALL PASS incl. 4/16 fb seeds landing on the 2 new assets, unseeded winner still bg_perth_cbd all platforms; demotion rollback `5bea647e…`; PP pool now 8 governed + 13 candidates; canonical `_harness/image_harvester_v0/promo_review2/PROMOTION_V2_RESULT.md`; queue impact none. "
)

r=io.open(RESULT,encoding='utf-8').read()
assert not r.startswith('CLAIMED'),'already claimed'
io.open(RESULT,'w',encoding='utf-8',newline='\n').write(STUB+r)

s=io.open(SYNC,encoding='utf-8').read()
anchor="Restructured 2026-05-03 (G1). See `docs/runtime/archive/sync_state-pre-2026-05-03.md` for pre-restructure history.\n\n---\n"
assert s.count(anchor)==1 and '> **✅ v5.15 AP-3' in s and 'v5.16' not in s,'sync precondition fail'
io.open(SYNC,'w',encoding='utf-8',newline='\n').write(s.replace(anchor, anchor+'\n'+V516+'\n\n---\n',1))

a=io.open(ACT,encoding='utf-8').read(); lines=a.split('\n')
assert lines[7].startswith('> Last updated: 2026-07-06 Sydney — **current marker v5.15'),'act anchor: '+lines[7][:80]
assert 'v5.16' not in a
prev=lines[7].split('— ',1)[1] if '— ' in lines[7] else lines[7]
lines[7]=V516_ACT.rstrip()+'Previous marker '+prev
io.open(ACT,'w',encoding='utf-8',newline='\n').write('\n'.join(lines))
print('v5.16 applied: claim stub + sync block + action marker')
