import io, os
os.chdir(r'C:\Users\parve\Invegent-content-engine')
SYNC='docs/00_sync_state.md'; ACT='docs/00_action_list.md'
RESULT='_harness/image_harvester_v0/b3m4_intake/B3M4_INTAKE_RESULT.md'
STUB='CLAIMED v5.14 · pp-bg-b3m4-intake · shared-main-docs · register-commit-gate · 2026-07-06T09:15Z\n'

V514=(
"> **✅ v5.14 PP B3M4 INTAKE — APPLIED + VERIFIED (T2 · SAFETY_GATE; 2 uploads + 2 INSERT-only double-fenced candidates; POOL-NEUTRAL PROVEN) — CLOSES THE FREE-STOCK B3/P1 HARVEST PROGRAM** — "
"the final 2 B3M4 ACCEPT_VISUAL_ONLY best-picks intaken (ids b3a20009 `bg_pp_advisory_desk_flatlay` [Pexels/Towfiqu barbhuiya, person-free advisory desk] + b3a20010 `bg_pp_contract_signing_closeup` [Pexels/Elisabeth Ende, pen-on-blank]) — both is_active=false + approved=false + production_use_allowed=false + intake_candidate · "
"apply `4772c0a5…` (db-rls-auditor PASS zero-must-fix; external review PARTIAL/ESCALATE `511ae9a8…` — generic production-DML escalation, no concrete defect, same reflex as v5.12 batch `fe9d7372`, PK-approved at the judgment gate) · uploads staged→x-upsert:false→public-URL sha256 verified · "
"**pool UNCHANGED 6/6/6/5 — machine-asserted + live-proven (fb winner still bg_perth_cbd, both rejected `inactive`, resolve_brand_assets 0 hits); 6 governed untouched; PP total 40** · advisory keyed `bg_pp_advisory_desk_flatlay` per PK (workbook `bg_pp_real_estate_agent_tablet` slot stays OPEN for a future release-safe/paid agent image) · scrim units consistent 0-1 (batch unit-mix carry avoided) · "
"rollback `6056452c…` guarded · canonical `_harness/image_harvester_v0/b3m4_intake/B3M4_INTAKE_RESULT.md` · **PP bg inventory: 6 governed/active + 15 inactive candidates (5 batch-2 + 8 B3 + 2 B3M4)** · HOLD carries: market-data · balcony · coastal (commissioned/vantage); 283939 Samsung-glyph trade-dress policy call open · next gates: per-asset promotion (each = live Option-D rotation change) · queue impact: none. Supersedes → v5.13."
)

V514_ACT=(
"> Last updated: 2026-07-06 Sydney — **current marker v5.14 — PP B3M4 intake APPLIED + VERIFIED (T2; 2 double-fenced candidates, pool-neutral proven) — free-stock B3/P1 program CLOSED** — "
"advisory_desk_flatlay + contract_signing_closeup intaken (b3a20009/10, all fenced); apply `4772c0a5…` (db-rls PASS; external PARTIAL/ESCALATE `511ae9a8…` generic-no-defect, PK-approved); uploads public-URL sha256-verified; **pool UNCHANGED 6/6/6/5 live-proven, PP total 40**; workbook agent-tablet slot stays open; rollback `6056452c…`; canonical `_harness/image_harvester_v0/b3m4_intake/B3M4_INTAKE_RESULT.md`; PP inventory 6 active + 15 candidates; queue impact none. "
)

r=io.open(RESULT,encoding='utf-8').read()
assert not r.startswith('CLAIMED'),'already claimed'
io.open(RESULT,'w',encoding='utf-8',newline='\n').write(STUB+r)

s=io.open(SYNC,encoding='utf-8').read()
anchor="Restructured 2026-05-03 (G1). See `docs/runtime/archive/sync_state-pre-2026-05-03.md` for pre-restructure history.\n\n---\n"
assert s.count(anchor)==1 and '> **✅ v5.13 AP-2' in s and 'v5.14' not in s,'sync precondition fail'
io.open(SYNC,'w',encoding='utf-8',newline='\n').write(s.replace(anchor, anchor+'\n'+V514+'\n\n---\n',1))

a=io.open(ACT,encoding='utf-8').read(); lines=a.split('\n')
assert lines[7].startswith('> Last updated: 2026-07-06 Sydney — **current marker v5.13'),'act anchor: '+lines[7][:80]
assert 'v5.14' not in a
prev=lines[7].split('— ',1)[1] if '— ' in lines[7] else lines[7]
lines[7]=V514_ACT.rstrip()+'Previous marker '+prev
io.open(ACT,'w',encoding='utf-8',newline='\n').write('\n'.join(lines))
print('v5.14 applied: claim stub + sync block + action marker')
