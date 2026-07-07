import io, os
os.chdir(r'C:\Users\parve\Invegent-content-engine')
SYNC='docs/00_sync_state.md'; ACT='docs/00_action_list.md'
RESULT='_harness/image_harvester_v0/run8_balcony_coastal/intake/BALCONY_COASTAL_INTAKE_RESULT.md'
STUB='CLAIMED v5.24 · pp-bg-balcony-coastal-intake · shared-main-docs · register-commit-gate · 2026-07-06T23:55Z\n'

V524=(
"> **✅ v5.24 PP BALCONY/COASTAL BATCH INTAKE — APPLIED + VERIFIED (T2 · SAFETY_GATE; 2 INSERT-only fenced candidates; pool-neutral; FIRST lane under Image Workflow Acceleration v1)** — "
"`bg_pp_city_skyline_vantage` (b3a20012…, GENERIC non-AU São Paulo skyline) + `bg_pp_coastal_waterfront` (b3a20013…, verifiable AU Whitehaven QLD coastal) intaken as double-fenced candidates on PK hash approval `f407c095…` · "
"**P1 batch** (both in one gate) · **P2 mechanical 10-check same-shape gate PASSED** vs the market-data/v5.12 template → full db-rls-auditor+external chain rode the proven shape, NOT re-run (~28-min auditor tax skipped); per-apply guards NOT waived (byte-verify + crop-proof 1:1/1080/0.56 + in-txn fail-closed pool-neutrality assertion + image-reviewer clean) · both uploads public-URL sha256-verified · "
"**eligible pool UNCHANGED 9/9/9/8 — no approval · no promotion · no rotation change** · geography fences embedded (skyline generic-only never AU/Perth-label; coastal AU-QLD never Perth/WA-label) · standing HOLD structurally confirmed (no free-stock verifiable Perth/WA skyline OR coastal; P5 rejected Sydney[JPMorgan/CyberCX+Sydney Tower]/Brisbane[CityCat+passengers]/Gold Coast[crowd+sub-2400] at discovery) · "
"rollback `97b801e4…` standing (guarded delete of the 2 unpromoted rows) · canonical `_harness/image_harvester_v0/run8_balcony_coastal/intake/BALCONY_COASTAL_INTAKE_RESULT.md` · **PP bg pool now 9 governed/active + 15 inactive candidates** · promotion = separate later PK gate · queue impact: none. Supersedes → v5.23."
)

V524_ACT=(
"> Last updated: 2026-07-06 Sydney — **current marker v5.24 — PP balcony/coastal batch intake APPLIED + VERIFIED (T2; 2 double-fenced candidates, pool-neutral; first lane under Image Workflow Accel v1)** — "
"`bg_pp_city_skyline_vantage` (b3a20012, generic São Paulo) + `bg_pp_coastal_waterfront` (b3a20013, AU Whitehaven QLD) intaken fenced on PK hash `f407c095…`; P1 batch + P2 same-shape gate PASSED → full chain skipped (rode proven shape, ~28-min auditor tax removed), per-apply guards ran; **pool UNCHANGED 9/9/9/8**; geography fences embedded; standing HOLD confirmed (no free-stock Perth/WA skyline/coastal; P5 rejected Sydney/Brisbane/Gold Coast at discovery); rollback `97b801e4…`; PP pool 9 governed + 15 candidates; canonical `_harness/image_harvester_v0/run8_balcony_coastal/intake/BALCONY_COASTAL_INTAKE_RESULT.md`; queue impact none. "
)

r=io.open(RESULT,encoding='utf-8').read()
assert not r.startswith('CLAIMED'),'already claimed'
io.open(RESULT,'w',encoding='utf-8',newline='\n').write(STUB+r)

s=io.open(SYNC,encoding='utf-8').read()
anchor="Restructured 2026-05-03 (G1). See `docs/runtime/archive/sync_state-pre-2026-05-03.md` for pre-restructure history.\n\n---\n"
assert s.count(anchor)==1 and '> **✅ v5.23 IMAGE WORKFLOW ACCELERATION' in s and 'v5.24' not in s,'sync precondition fail'
io.open(SYNC,'w',encoding='utf-8',newline='\n').write(s.replace(anchor, anchor+'\n'+V524+'\n\n---\n',1))

a=io.open(ACT,encoding='utf-8').read(); lines=a.split('\n')
assert lines[7].startswith('> Last updated: 2026-07-06 Sydney — **current marker v5.23'),'act anchor: '+lines[7][:80]
assert 'v5.24' not in a
prev=lines[7].split('— ',1)[1] if '— ' in lines[7] else lines[7]
lines[7]=V524_ACT.rstrip()+'Previous marker '+prev
io.open(ACT,'w',encoding='utf-8',newline='\n').write('\n'.join(lines))
print('v5.24 applied: claim stub + sync block + action marker')
