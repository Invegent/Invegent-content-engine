import io, os
os.chdir(r'C:\Users\parve\ce-ndisreg')
SYNC='docs/00_sync_state.md'; ACT='docs/00_action_list.md'
RESULT='_harness/ndis_yarns_logo_intake_v0/NDIS_LOGO_INTAKE_RESULT.md'
STUB='CLAIMED v5.32 · ndis-yarns-logo-intake-v0 · isolated-worktree ce-ndisreg · register-commit-gate · 2026-07-08\n'

V532=(
"> **✅ v5.32 NDIS YARNS LOGO-VARIANT INTAKE v0 — APPLIED + VERIFIED (T1 RECORD_ONLY for a T2 SAFETY_GATE apply; 17 fenced logo candidates, production-neutral)** — "
"first brand-asset intake for NDIS Yarns (`fb98a472…`, previously 0 rows) · 17 curated fenced candidates (9 SVG `usage=logo_vector_source` + 8 PNG `usage=logo`, ids `d1b10001…`-`d1b10017…`, all is_active/approved/production_use_allowed=false + intake_candidate) on PK hash approval `8a8e2569…` · "
"uploaded to `NDIS_Yarns/Logos/ny_logo_*` (x-upsert:false, public-URL sha256 17/17, **NO overwrite** of the 3 live files) · **production-neutral: governed-logo=0, `brand_profile.brand_logo_url` UNCHANGED** (live NDIS logo served from brand_profile, untouched) · "
"asset_type all CHECK-valid (never the invalid 'logo'); all 17 stored sha256==manifest (44KB apply byte-faithful) · reconstruction caveat recorded (Claude Design manual vector reconstruction · font approximated · not pixel-perfect) · "
"db-rls-auditor PASS zero-must-fix + external `48f76536…` partial/escalate NO concrete defect (reflexive production-adjacent escalation, PK-approved) · rollback `17b4dc66…` standing · canonical `_harness/ndis_yarns_logo_intake_v0/NDIS_LOGO_INTAKE_RESULT.md` · mirrors proven PP logo intake v4.87 · "
"NOT done (future PK gates): promotion · brand_profile swap · production logo swap · TMR for NDIS · template assignment · resolver change · register cut in ISOLATED worktree (R4: local main's another-lane commit `2118334` TMR-readiness-workbook NOT touched) · queue impact: none. Supersedes → v5.31."
)

V532_ACT=(
"> Last updated: 2026-07-08 Sydney — **current marker v5.32 — NDIS Yarns logo-variant intake v0 APPLIED + VERIFIED (T1; 17 fenced logo candidates, production-neutral)** — "
"first NDIS brand-asset intake (client fb98a472, was 0 rows); 17 curated fenced (9 SVG logo_vector_source + 8 PNG logo, d1b10001…-17) on PK hash `8a8e2569…`; uploaded NDIS_Yarns/Logos/ny_logo_* (x-upsert:false, sha256 17/17, no overwrite of 3 live files); **production-neutral — governed-logo=0, brand_profile.brand_logo_url UNCHANGED**; asset_type CHECK-valid (no 'logo'); all 17 sha256==manifest; reconstruction caveat recorded; db-rls PASS + external `48f76536…` no-concrete-defect (PK-approved); rollback `17b4dc66…`; mirrors PP logo intake v4.87; promotion/brand_profile-swap/TMR = future gates; isolated-worktree cut (R4: 2118334 untouched); canonical `_harness/ndis_yarns_logo_intake_v0/NDIS_LOGO_INTAKE_RESULT.md`; queue impact none. "
)

r=io.open(RESULT,encoding='utf-8').read()
assert not r.startswith('CLAIMED'),'already claimed'
io.open(RESULT,'w',encoding='utf-8',newline='\n').write(STUB+r)

s=io.open(SYNC,encoding='utf-8').read()
anchor="Restructured 2026-05-03 (G1). See `docs/runtime/archive/sync_state-pre-2026-05-03.md` for pre-restructure history.\n\n---\n"
assert s.count(anchor)==1 and '> **✅ v5.31 ' in s and 'v5.32' not in s,'sync precondition fail'
io.open(SYNC,'w',encoding='utf-8',newline='\n').write(s.replace(anchor, anchor+'\n'+V532+'\n\n---\n',1))

a=io.open(ACT,encoding='utf-8').read(); lines=a.split('\n')
assert lines[7].startswith('> Last updated: 2026-07-08 Sydney — **current marker v5.31'),'act anchor: '+lines[7][:80]
assert 'v5.32' not in a
prev=lines[7].split('— ',1)[1] if '— ' in lines[7] else lines[7]
lines[7]=V532_ACT.rstrip()+'Previous marker '+prev
io.open(ACT,'w',encoding='utf-8',newline='\n').write('\n'.join(lines))
print('v5.32 applied in worktree: claim stub + sync block + action marker')
