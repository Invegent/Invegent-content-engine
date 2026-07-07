import io, os
os.chdir(r'C:\Users\parve\ce-imgreg')   # ISOLATED worktree at origin/main — shared checkout untouched
SYNC='docs/00_sync_state.md'; ACT='docs/00_action_list.md'

V526=(
"> **✅ v5.26 PP BACKGROUND PROMOTIONS — coastal + skyline + good-enough batch APPLIED + VERIFIED (T3 · PRODUCT_PROOF; 8 backgrounds → live; consolidated P4 pointer; DB applied in prior lanes, this is the docs closeout on rebased origin)** — "
"three T3 promotion lanes recorded together: (1) `bg_pp_coastal_waterfront` (b3a20013, Whitehaven QLD — pool's first coastal) apply `e4830afa…` pool 9→10; (2) `bg_pp_city_skyline_vantage` (b3a20012, GENERIC São Paulo, geo-fenced never-AU/Perth) apply `f0150f36…` pool 10→11; (3) good-enough BATCH of 6 (sold_sign · construction · subdivision[never-WA/Perth] · mortgage · inspection · modern_home_exterior) apply `661338bc…` pool 11→17 — first P1-batch at the T3 tier, ONE full chain for 6 · "
"**Option-D eligible pool 9→17 LIVE (fb 17 / li 15 / ig 14)** · each lane: db-rls PASS + external AGREE (`790fec05`/`09a86df7`/`9d4cca9a`) + pre-apply STOP-checks + in-txn fail-closed assertions + witnessed selection + prior-governed untouched · byte-exact rollbacks standing (`a9b892d6`/`fde57bd1`/`7b63fee5` — batch = mechanical reversal, verified 6/6 read-only) · label/geo fences binding · "
"canonical results `_harness/image_harvester_v0/run8_balcony_coastal/{coastal_promo,skyline_promo}/*_RESULT.md` + `_harness/image_harvester_v0/goodenough_batch_promo/GOODENOUGH_BATCH_PROMO_RESULT.md` · **PP bg pool now 17 governed/active + 7 inactive candidates — every core content pillar covered** (workbook recon: P0+P1 core = 18/19 sourced, only auction = paid-HOLD; P2 = later tier) · carry: declarative-doc pool-lag now 9→17 (D3, dashboard/declarative reconcile) · "
"reconciled onto origin `33779ed` in an isolated worktree (parallel spine-gen took v5.25 → image-lane renumbered v5.25→v5.26; **cc-0028 `4e81263` NOT carried, held to its own LinkedIn lane per R4**) · **no DB change in this lane** (docs closeout only) · queue impact: none. Supersedes → v5.25."
)

V526_ACT=(
"> Last updated: 2026-07-07 Sydney — **current marker v5.26 — PP background promotions coastal + skyline + good-enough batch LIVE + docs closeout (T3; pool 9→17; consolidated)** — "
"8 backgrounds promoted across 3 T3 lanes (coastal `e4830afa`, skyline `f0150f36`, batch-6 `661338bc`); each db-rls PASS + external AGREE, witnessed selection, prior-governed untouched, byte-exact rollbacks standing; **PP pool now 17 governed + 7 candidates — every core pillar covered**; renumbered off origin's v5.25 (parallel spine-gen); cc-0028 `4e81263` NOT carried (R4 hold); no DB change (docs closeout); canonical results under run8_balcony_coastal/{coastal_promo,skyline_promo} + goodenough_batch_promo; queue impact none. "
)

s=io.open(SYNC,encoding='utf-8').read()
anchor="Restructured 2026-05-03 (G1). See `docs/runtime/archive/sync_state-pre-2026-05-03.md` for pre-restructure history.\n\n---\n"
assert s.count(anchor)==1 and '> **✅ v5.25 SPINE GENERALISATION' in s and 'v5.26' not in s,'sync precondition fail'
io.open(SYNC,'w',encoding='utf-8',newline='\n').write(s.replace(anchor, anchor+'\n'+V526+'\n\n---\n',1))

a=io.open(ACT,encoding='utf-8').read(); lines=a.split('\n')
assert lines[7].startswith('> Last updated: 2026-07-07 Sydney — **current marker v5.25 — SPINE GENERALISATION'),'act anchor: '+lines[7][:80]
assert 'v5.26' not in a
prev=lines[7].split('— ',1)[1] if '— ' in lines[7] else lines[7]
lines[7]=V526_ACT.rstrip()+'Previous marker '+prev
io.open(ACT,'w',encoding='utf-8',newline='\n').write('\n'.join(lines))
print('v5.26 applied in worktree: sync block + action marker')
