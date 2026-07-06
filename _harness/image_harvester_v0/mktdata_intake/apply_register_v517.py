import io, os
os.chdir(r'C:\Users\parve\Invegent-content-engine')
SYNC='docs/00_sync_state.md'; ACT='docs/00_action_list.md'
RESULT='_harness/image_harvester_v0/mktdata_intake/MKTDATA_INTAKE_RESULT.md'
STUB='CLAIMED v5.17 · pp-bg-mktdata-intake · shared-main-docs · register-commit-gate · 2026-07-06T12:20Z\n'

V517=(
"> **✅ v5.17 PP MARKET-DATA INTAKE — APPLIED + VERIFIED (T1 RECORD_ONLY register lane for a T2 SAFETY_GATE apply; 1 INSERT-only double-fenced candidate; pool-neutral)** — "
"`bg_pp_market_data_chart_grid` (b3a20011…) intaken as a DOUBLE-FENCED candidate (is_active=false · asset_meta.approved=false · production_use_allowed=false · approval_status=intake_candidate) on PK hash approval `9fc52c38…` · "
"storage upload public-URL sha256-verified (Pexels 6203470 / cottonbro, sha `d3cb9b1c…`, 2400×3600) · **eligible rotation pool UNCHANGED 8/8/8/7 live-verified post-apply — no approval · no promotion · no rotation change** · "
"db-rls-auditor PASS zero-must-fix + external review `5bbe0efe…` AGREE / risk low / confidence high (first fenced-intake to clear external review cleanly — explicit INSERT-only framing landed) · "
"PK-named 9-asset roster was stale (8/9 already in DB: 7 fenced v5.12 + kitchen governed v5.16) → only the one absent asset intaken · rollback `9eb0b248…` standing (guarded single-row delete) · "
"canonical `_harness/image_harvester_v0/mktdata_intake/MKTDATA_INTAKE_RESULT.md` · **PP bg pool now 8 governed/active + 14 inactive candidates** · promotion = separate later PK gate (Option-D pool is production-live) · queue impact: none. Supersedes → v5.16."
)

V517_ACT=(
"> Last updated: 2026-07-06 Sydney — **current marker v5.17 — PP market-data intake APPLIED + VERIFIED (T1 record; 1 double-fenced candidate, pool-neutral)** — "
"`bg_pp_market_data_chart_grid` (b3a20011…) intaken double-fenced (is_active/approved/production_use_allowed=false, intake_candidate) on PK hash `9fc52c38…`; upload public-URL sha256-verified (Pexels 6203470, `d3cb9b1c…`); **pool UNCHANGED 8/8/8/7 — no approval/promotion/rotation change**; db-rls PASS zero-must-fix + external `5bbe0efe…` AGREE/low/high; stale 9-asset roster reconciled (8/9 already in DB) → only absent asset intaken; rollback `9eb0b248…`; PP pool 8 governed + 14 candidates; canonical `_harness/image_harvester_v0/mktdata_intake/MKTDATA_INTAKE_RESULT.md`; queue impact none. "
)

# --- claim stub on the result doc ---
r=io.open(RESULT,encoding='utf-8').read()
assert not r.startswith('CLAIMED'),'already claimed'
io.open(RESULT,'w',encoding='utf-8',newline='\n').write(STUB+r)

# --- sync_state: insert v5.17 block directly under the header anchor (newest on top) ---
s=io.open(SYNC,encoding='utf-8').read()
anchor="Restructured 2026-05-03 (G1). See `docs/runtime/archive/sync_state-pre-2026-05-03.md` for pre-restructure history.\n\n---\n"
assert s.count(anchor)==1 and '> **✅ v5.16 PP BACKGROUND PROMOTION v2' in s and 'v5.17' not in s,'sync precondition fail'
io.open(SYNC,'w',encoding='utf-8',newline='\n').write(s.replace(anchor, anchor+'\n'+V517+'\n\n---\n',1))

# --- action_list: prepend v5.17 marker, demote v5.16 to Previous ---
a=io.open(ACT,encoding='utf-8').read(); lines=a.split('\n')
assert lines[7].startswith('> Last updated: 2026-07-06 Sydney — **current marker v5.16'),'act anchor: '+lines[7][:80]
assert 'v5.17' not in a
prev=lines[7].split('— ',1)[1] if '— ' in lines[7] else lines[7]
lines[7]=V517_ACT.rstrip()+'Previous marker '+prev
io.open(ACT,'w',encoding='utf-8',newline='\n').write('\n'.join(lines))
print('v5.17 applied: claim stub + sync block + action marker')
