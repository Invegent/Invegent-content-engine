import io, os
os.chdir(r'C:\Users\parve\Invegent-content-engine')
SYNC='docs/00_sync_state.md'; ACT='docs/00_action_list.md'
RESULT='_harness/image_harvester_v0/batch_intake/BATCH_INTAKE_RESULT.md'

STUB='CLAIMED v5.12 · pp-bg-b3-batch-intake · shared-main-docs · register-commit-gate · 2026-07-06T07:35Z\n'

V512=(
"> **✅ v5.12 PP BACKGROUND B3 BATCH-INTAKE — APPLIED + VERIFIED (T2 · SAFETY_GATE; 8 uploads + 8 INSERT-only double-fenced candidates; POOL-NEUTRAL PROVEN)** — "
"8 PK-visually-accepted (ACCEPT_VISUAL_ONLY) B3 backgrounds intaken as governed candidates (ids b3a20001…-08: au_suburb_texture · transaction_keys_contract · kitchen_living_open_plan · family_backyard_summer · new_build_construction_site · subdivision_land_estate · mortgage_calculator_keys · inspection_checklist_clipboard) — every row is_active=false + approved=false + production_use_allowed=false + intake_candidate · "
"apply `4c1f84a1…` (db-rls-auditor PASS zero-must-fix; external review PARTIAL/ESCALATE `fe9d7372…` — its 'irreversible deletions' reason MISREAD the INSERT-only apply, no concrete defect, PK-approved at the judgment gate) · uploads staged→x-upsert:false→public-URL sha256 all verified · "
"**pool UNCHANGED 6/6/6/5 — machine-asserted + live-proven (fb+ig winner still bg_perth_cbd, all 8 rejected `inactive`, resolve_brand_assets 0 hits); 6 governed untouched; PP total 38** · label constraints embedded (subdivision_land_estate = generic new-estate ONLY, NEVER WA/Perth/location-specific; suburb_texture never location-specific) · licences 6 Unsplash + 2 Pexels (ratified-policy-compliant) · "
"market-data HOLD (excluded — legible chart header failed the 0.56-scrim crop proof) · rollback `297f3032…` guarded · CARRY: suggested_scrim_opacity unit-mix (0-100 vs 0-1) normalise at promotion gate (auditor low note, metadata-only) · canonical `_harness/image_harvester_v0/batch_intake/BATCH_INTAKE_RESULT.md` · "
"PP bg inventory: 6 governed/active + 13 inactive candidates (5 batch-2 + 8 B3) · next gates: per-asset promotion (each = live rotation change under Option D) · queue impact: none. Supersedes → v5.11."
)

V512_ACT=(
"> Last updated: 2026-07-06 Sydney — **current marker v5.12 — PP background B3 batch-intake APPLIED + VERIFIED (T2; 8 double-fenced candidates, pool-neutral proven)** — "
"8 ACCEPT_VISUAL_ONLY B3 bgs intaken (b3a20001…-08, all is_active/approved/production_use_allowed=false); apply `4c1f84a1…` (db-rls PASS; external PARTIAL/ESCALATE `fe9d7372…` misread-insert-only, PK-approved); uploads public-URL sha256-verified; **pool UNCHANGED 6/6/6/5 live-proven, 6 governed untouched, PP total 38**; estate label-constraint never-WA/Perth embedded; market-data HOLD; rollback `297f3032…`; CARRY scrim-unit-normalise at promotion; canonical `_harness/image_harvester_v0/batch_intake/BATCH_INTAKE_RESULT.md`; queue impact none. "
)

r=io.open(RESULT,encoding='utf-8').read()
assert not r.startswith('CLAIMED'),'already claimed'
io.open(RESULT,'w',encoding='utf-8',newline='\n').write(STUB+r)

s=io.open(SYNC,encoding='utf-8').read()
anchor="Restructured 2026-05-03 (G1). See `docs/runtime/archive/sync_state-pre-2026-05-03.md` for pre-restructure history.\n\n---\n"
assert s.count(anchor)==1 and '> **✅ v5.11 AP-1' in s and 'v5.12' not in s,'sync anchor/precondition fail'
io.open(SYNC,'w',encoding='utf-8',newline='\n').write(s.replace(anchor, anchor+'\n'+V512+'\n\n---\n',1))

a=io.open(ACT,encoding='utf-8').read(); lines=a.split('\n')
assert lines[7].startswith('> Last updated: 2026-07-06 Sydney — **current marker v5.11'),'act anchor: '+lines[7][:80]
assert 'v5.12' not in a
prev=lines[7].split('— ',1)[1] if '— ' in lines[7] else lines[7]
lines[7]=V512_ACT.rstrip()+'Previous marker '+prev
io.open(ACT,'w',encoding='utf-8',newline='\n').write('\n'.join(lines))
print('v5.12 applied: claim stub + sync block + action marker')
