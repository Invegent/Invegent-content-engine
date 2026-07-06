import io, os
os.chdir(r'C:\Users\parve\Invegent-content-engine')
SYNC='docs/00_sync_state.md'; ACT='docs/00_action_list.md'
RESULT='_harness/image_harvester_v0/mktdata_promo/MKTDATA_PROMO_RESULT.md'
STUB='CLAIMED v5.20 · pp-bg-mktdata-promo · shared-main-docs · register-commit-gate · 2026-07-06T22:40Z\n'

V520=(
"> **✅ v5.20 PP MARKET-DATA PROMOTION — APPLIED + VERIFIED (T3 · PRODUCT_PROOF; 1-row UPDATE; LIVE PRODUCTION ROTATION CHANGE; SELECTION WITNESSED)** — "
"`bg_pp_market_data_chart_grid` (b3a20011…, first abstract/data-motif bg in the pool) promoted intake_candidate → governed/active on PK hash approval `0275b74c…` (db-rls-auditor PASS zero-must-fix + external review `017992cd…` AGREE / risk medium / confidence high) · "
"**Option-D eligible pool: facebook 8→9 · linkedin 8→9 · instagram 7→8 LIVE** (platform_scope {fb,ig,li}) · pre-apply STOP-check passed (row fenced, pool 8/8/8/7) · "
"post-apply proof ALL PASS: unseeded winner still `bg_perth_cbd` on all 3 platforms · market-data ranks last (created_at) · **24 fb seed probes spread across all 9 pool members, market-data selected 2× = witnessed selection** · prior 8 governed untouched · "
"demotion rollback `193b5f97…` standing (byte-exact, verified jsonb-equal pre-apply, pool 9→8, reverse production change, PK-gated) · **market-data carry CLOSED end-to-end: re-source → intake → promotion → live selection** (last of 3 HOLD rows resolved; balcony/coastal still HOLD) · "
"canonical `_harness/image_harvester_v0/mktdata_promo/MKTDATA_PROMO_RESULT.md` · **PP bg pool now 9 governed/active + 13 inactive candidates** · queue impact: none. Supersedes → v5.19."
)

V520_ACT=(
"> Last updated: 2026-07-06 Sydney — **current marker v5.20 — PP market-data PROMOTED to live production (T3; pool fb/li 8→9, ig 7→8; selection witnessed)** — "
"`bg_pp_market_data_chart_grid` (b3a20011…) intake_candidate → governed/active on PK hash `0275b74c…` (db-rls PASS zero-must-fix; external `017992cd…` AGREE/medium/high); pre-apply STOP-check + 4 in-txn assertions passed; proof ALL PASS incl. 24 fb seeds across all 9 pool members (market-data 2×), unseeded winner still bg_perth_cbd all platforms; demotion rollback `193b5f97…`; **market-data carry CLOSED end-to-end (re-source→intake→promotion→live)**; PP pool now 9 governed + 13 candidates; canonical `_harness/image_harvester_v0/mktdata_promo/MKTDATA_PROMO_RESULT.md`; queue impact none. "
)

# --- claim stub on the result doc ---
r=io.open(RESULT,encoding='utf-8').read()
assert not r.startswith('CLAIMED'),'already claimed'
io.open(RESULT,'w',encoding='utf-8',newline='\n').write(STUB+r)

# --- sync_state: insert v5.20 block directly under the header anchor (newest on top) ---
s=io.open(SYNC,encoding='utf-8').read()
anchor="Restructured 2026-05-03 (G1). See `docs/runtime/archive/sync_state-pre-2026-05-03.md` for pre-restructure history.\n\n---\n"
assert s.count(anchor)==1 and '> **✅ v5.19 AP-5 STAMPER' in s and 'v5.20' not in s,'sync precondition fail'
io.open(SYNC,'w',encoding='utf-8',newline='\n').write(s.replace(anchor, anchor+'\n'+V520+'\n\n---\n',1))

# --- action_list: prepend v5.20 marker, demote v5.19 to Previous ---
a=io.open(ACT,encoding='utf-8').read(); lines=a.split('\n')
assert lines[7].startswith('> Last updated: 2026-07-06 Sydney — **current marker v5.19'),'act anchor: '+lines[7][:80]
assert 'v5.20' not in a
prev=lines[7].split('— ',1)[1] if '— ' in lines[7] else lines[7]
lines[7]=V520_ACT.rstrip()+'Previous marker '+prev
io.open(ACT,'w',encoding='utf-8',newline='\n').write('\n'.join(lines))
print('v5.20 applied: claim stub + sync block + action marker')
