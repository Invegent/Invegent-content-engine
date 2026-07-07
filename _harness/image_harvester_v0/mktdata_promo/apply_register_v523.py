import io, os
os.chdir(r'C:\Users\parve\Invegent-content-engine')
SYNC='docs/00_sync_state.md'; ACT='docs/00_action_list.md'

V523=(
"> **✅ v5.23 IMAGE WORKFLOW ACCELERATION v1 — RATIFIED (T1 · RECORD_ONLY; orchestration-contract amendment, cc-0027 image lanes)** — "
"PK ratified all six proposals **P1–P6** (P1 batch-first default · P2 tier-right-sized intake review with a MECHANICAL 10-check same-shape gate · P3 PK-elected per-asset promote-direct fast-path · P4 one register pointer per batch · P5 discovery-time text/signage reject · P6 concurrent review stages) **over an explicit `policy_decision` escalation** (no concrete defect) · "
"rev-1 external `2866370a` raised \"define shape\" → fixed in rev-2 (mechanical structural-diff gate) · rev-2 external `634bbb74` (hash `dd3c3156…`) verified the fix + found no defect, escalating only the human-judgment policy call → PK decided ratify · "
"**§2 non-negotiables UNCHANGED** (PK visual verdict sole deciding act · text-safety crop proof · pool-neutrality machine-assertion on every intake · full T3 chain + live proof + proven rollback on every rotation change · fenced-until-approved · CAS/fail-closed) · "
"CLAUDE.md amended (new 'Image workflow acceleration (v1)' section) · canonical `docs/briefs/image-workflow-acceleration-packet-v1.md` (RATIFIED) · result `docs/briefs/results/image-workflow-acceleration-ratification-result.md` · in force now · queue impact: applies to the next image batch (market-data arc already complete). Supersedes → v5.22."
)

V523_ACT=(
"> Last updated: 2026-07-06 Sydney — **current marker v5.23 — Image Workflow Acceleration v1 RATIFIED (T1; image-lane ceremony trim, P1–P6)** — "
"PK ratified all six over an explicit policy_decision escalation (rev-1 `2866370a` → define-shape fixed; rev-2 `634bbb74` hash `dd3c3156…` verified fix, no defect, human-judgment escalation → PK ratify); P2 same-shape = mechanical 10-check diff, per-apply byte-verify + pool-neutrality assertion never waived; §2 non-negotiables unchanged; CLAUDE.md amended; canonical `docs/briefs/image-workflow-acceleration-packet-v1.md`; result `docs/briefs/results/image-workflow-acceleration-ratification-result.md`; in force; queue impact: next image batch. "
)

# --- sync_state: insert v5.23 block directly under the header anchor (newest on top) ---
s=io.open(SYNC,encoding='utf-8').read()
anchor="Restructured 2026-05-03 (G1). See `docs/runtime/archive/sync_state-pre-2026-05-03.md` for pre-restructure history.\n\n---\n"
assert s.count(anchor)==1 and '> **✅ v5.22 ' in s and 'v5.23' not in s,'sync precondition fail'
io.open(SYNC,'w',encoding='utf-8',newline='\n').write(s.replace(anchor, anchor+'\n'+V523+'\n\n---\n',1))

# --- action_list: prepend v5.23 marker, demote v5.22 to Previous ---
a=io.open(ACT,encoding='utf-8').read(); lines=a.split('\n')
assert lines[7].startswith('> Last updated: 2026-07-06 Sydney — **current marker v5.22'),'act anchor: '+lines[7][:80]
assert 'v5.23' not in a
prev=lines[7].split('— ',1)[1] if '— ' in lines[7] else lines[7]
lines[7]=V523_ACT.rstrip()+'Previous marker '+prev
io.open(ACT,'w',encoding='utf-8',newline='\n').write('\n'.join(lines))
print('v5.23 applied: sync block + action marker')
