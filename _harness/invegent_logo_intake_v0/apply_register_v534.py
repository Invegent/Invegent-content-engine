import io, os
os.chdir(r'C:\Users\parve\ce-logoreg')
SYNC='docs/00_sync_state.md'; ACT='docs/00_action_list.md'
CFW_R='_harness/care_for_welfare_logo_intake_v0/CFW_LOGO_INTAKE_RESULT.md'
INV_R='_harness/invegent_logo_intake_v0/INVEGENT_LOGO_INTAKE_RESULT.md'
STUB='CLAIMED v5.34 · cfw+invegent-logo-intake · isolated-worktree ce-logoreg · register-commit-gate · 2026-07-08\n'

V534=(
"> **✅ v5.34 CFW + INVEGENT LOGO-VARIANT INTAKES v0 — APPLIED + VERIFIED (T1 RECORD_ONLY for two T2 SAFETY_GATE applies; CONSOLIDATED pointer (P4); both fenced, production-neutral)** — "
"two new-client logo intakes recorded in one pointer: **Care for Welfare** (`3eca32aa…`) 16 fenced candidates (d2c10001…-16, apply `e0b283ff…`, FAITHFUL vector kit; live logo in client-assets bucket, DIFFERENT bucket, untouched) + **Invegent** (`93494a09…`) 17 fenced candidates (d3d10001…-17, apply `5673979b…`, RECONSTRUCTION kit; **`brand_logo_url` IS NULL — no live logo, stays null**) · "
"both: SVG `usage=logo_vector_source` + PNG `usage=logo`, all four fences, asset_type CHECK-valid (never invalid 'logo'), uploaded x-upsert:false to `brand-assets/<Client>/Logos/` (public-URL sha256 all verified, NO overwrite), all stored sha256==manifest (byte-faithful applies) · both production-neutral: governed-logo=0, brand_profile untouched · "
"db-rls-auditor PASS zero-must-fix ×2 + external `3270c228…` AGREE (CFW clean) / `e1c435c6…` partial-no-concrete-defect (Invegent, escalate=false) · rollbacks `bb5000bb…` (CFW) / `9f3202dd…` (Invegent) standing · "
"canonical `_harness/care_for_welfare_logo_intake_v0/CFW_LOGO_INTAKE_RESULT.md` + `_harness/invegent_logo_intake_v0/INVEGENT_LOGO_INTAKE_RESULT.md` · mirror proven PP v4.87 + NDIS v5.32 · register cut in ISOLATED worktree (R4: local main's another-lane commit `2118334` TMR-readiness NOT touched) · "
"NOT done (future PK gates, per client): promotion · brand_profile swap / first-live-logo · production logo · template assignment · resolver change · queue impact: none. Supersedes → v5.33."
)

V534_ACT=(
"> Last updated: 2026-07-08 Sydney — **current marker v5.34 — CFW + Invegent logo-variant intakes v0 APPLIED + VERIFIED (T1; consolidated P4 pointer; 16+17 fenced, both production-neutral)** — "
"two new-client logo intakes in ONE pointer: Care for Welfare (16 fenced, d2c10001…-16, apply `e0b283ff…`, faithful vector, live logo client-assets bucket untouched) + Invegent (17 fenced, d3d10001…-17, apply `5673979b…`, reconstruction, brand_logo_url NULL stays null); both all-four-fences, asset_type CHECK-valid, x-upsert:false uploads sha256-verified, all sha256==manifest, governed-logo=0, brand_profile untouched; db-rls PASS ×2 + external `3270c228…`(CFW clean)/`e1c435c6…`(Invegent no-defect); rollbacks `bb5000bb…`/`9f3202dd…`; canonical CFW+Invegent RESULT.md; mirror PP/NDIS; isolated-worktree (R4: 2118334 untouched); promotion/brand_profile = future gates; queue impact none. "
)

for R in (CFW_R, INV_R):
    r=io.open(R,encoding='utf-8').read()
    assert not r.startswith('CLAIMED'),'already claimed: '+R
    io.open(R,'w',encoding='utf-8',newline='\n').write(STUB+r)

s=io.open(SYNC,encoding='utf-8').read()
anchor="Restructured 2026-05-03 (G1). See `docs/runtime/archive/sync_state-pre-2026-05-03.md` for pre-restructure history.\n\n---\n"
assert s.count(anchor)==1 and '> **✅ v5.33 ' in s and 'v5.34' not in s,'sync precondition fail'
io.open(SYNC,'w',encoding='utf-8',newline='\n').write(s.replace(anchor, anchor+'\n'+V534+'\n\n---\n',1))

a=io.open(ACT,encoding='utf-8').read(); lines=a.split('\n')
assert lines[7].startswith('> Last updated: 2026-07-08 Sydney — **current marker v5.33'),'act anchor: '+lines[7][:80]
assert 'v5.34' not in a
prev=lines[7].split('— ',1)[1] if '— ' in lines[7] else lines[7]
lines[7]=V534_ACT.rstrip()+'Previous marker '+prev
io.open(ACT,'w',encoding='utf-8',newline='\n').write('\n'.join(lines))
print('v5.34 applied in worktree: 2 claim stubs + sync block + action marker')
