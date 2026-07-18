# Result — NDIS Sensitive Real-Imagery Intake Policy (Gate-1 governance closeout)

**Brief file:** `docs/briefs/ndis-sensitive-real-imagery-intake-policy-v1.md` (rev-2, hash `93825466f4e17f007c0781554f9ebd764ed66de3e8b1e42a9693196483f13f8b`)
**Executed by:** Claude Code (orchestrator)
**Completed:** 2026-07-19 Sydney
**Lane / label / tier:** T1 docs+charter · SAFETY_GATE · closeout-only

---

## 1. Result status

`Complete` — policy ratified rev-2 and closed out (charter deltas + governance doc + register record). No sourcing/intake/promotion authorised or performed.

## 2. Commit(s)

- {pending PK commit/push gate} — closeout commit (register lane; exact message + push at PK instruction)

## 3. Files changed

- `docs/briefs/ndis-sensitive-real-imagery-intake-policy-v1.md` — created (rev-1) then revised to rev-2 (APPROVED for closeout; §J prerequisite-status table added)
- `docs/briefs/results/ndis-sensitive-real-imagery-intake-policy-v1.md` — created (this record)
- `.claude/agents/image-harvester.md` — modified (NDIS sensitive-imagery fence: Phase-1 person-free only; cannot source Phase 2/3)
- `.claude/agents/image-reviewer.md` — modified (NDIS sensitive-imagery checklist: identity-leak/dignity/affiliation/cultural flags; cultural element → ESCALATE never PASS)
- `CLAUDE.md` — modified (new "NDIS sensitive real-imagery intake (staged lane)" section after the image-workflow §2 block)
- `docs/00_sync_state.md` — modified (v5.79 pointer)
- `docs/00_action_list.md` — modified (v5.79 marker)

## 4. Actions taken

- **Gate 1 (design):** authored the sensitive-intake policy (rev-1); PK ruled APPROVED WITH REVISION with six rulings.
- **Revision (rev-2):** folded in all six — staged Phase 0/1/2/3 model (§A); evidence-based rights rule replacing free-vs-paid (§B); disability-led representation reviewer (§C); First-Nations standing-adviser + community-specific consultation replacing a single "universal authority" (§D); permanent generic-rotation exclusions incl. NDIS affiliation cues (§E); purpose-binding for participant/cultural imagery (§F); plus expanded model-release evidence fields and the OAIC / stock-licence / NDIA / PWDA / Style-Manual references.
- **Closeout ruling:** PK APPROVED rev-2 for governance closeout; directed the 4-step authorised sequence and a prerequisite-status table; both specialist roles held (not appointed).
- **§J added:** prerequisite-status table with the non-negotiable anti-drift rule — *an unfilled specialist role is never permission to proceed*; a lane finding a prerequisite HELD/BLOCKED STOPs and surfaces to PK.
- **Step 1 — external review:** `ask_chatgpt_review` hash-pinned to `93825466…` → **agree / medium / high, no pushback, proceed** (review_id `02efbc94-9bbc-40e8-b01b-67e9d9cb2ff1`).
- **Step 2 — charter deltas + governance doc:** applied §I fences to both agent charters; added the CLAUDE.md staged-lane section.
- **Step 3 — register record:** v5.79 pointers cut in `00_sync_state.md` + `00_action_list.md` (Convention 1).
- **Step 4 — Phase 1 brief:** to follow as a **separate** Gate-1 brief (real, person-free, non-identifying only) — not part of this closeout.

## 5. Constraints confirmed

- No image sourced, harvested, downloaded, crop-proofed, or reviewed — confirmed not done.
- No DB intake, upload, INSERT, governance flip, promotion, or production rotation — confirmed not done.
- No specialist role appointed (§C disability-led reviewer, §D First-Nations adviser) — confirmed held, not appointed.
- No §2 image-workflow non-negotiable weakened — confirmed (policy adds gates only).
- P0 fenced abstract set and the v5.77 fenced rotation-pool candidates untouched — confirmed.
- No tool/permission change to either agent (charter text only) — confirmed.

## 6. Open issues

- **Commit/push held at PK gate.** Edits applied + branch-warden verified; exact commit message + push await PK instruction (register-lane hard stop).
- **Two held prerequisites** gate their phases: §C disability-led reviewer (Phase 2) and §D First-Nations adviser + consultation (cultural). Neither is appointed; both flip only via separate deliberate PK decisions.

## 7. Next recommended step

Commit + push the closeout on PK instruction (exact message), then return with a **separate Phase-1 Gate-1 brief** (real, person-free, non-identifying NDIS backgrounds only). Phase 2 stays closed until the §C reviewer is appointed; cultural content stays hard-blocked until §D exists.

---

## 8. Verification

**Verdict:** `Pass` (pending commit/push gate)

**Notes:**
- Output matches the brief and all six PK rulings; §J anti-drift table present.
- Constraints respected — closeout is docs+charter only; no sourcing/DB/deploy surface touched.
- Files changed == the approved closeout set (policy + result + 2 charters + CLAUDE.md + 2 registers); branch-warden to confirm no extras.
- Success criteria met: staged model, evidence-based rights rule, held-prerequisite structure, §2 inherited.
- New risk: none introduced; the anti-drift rule (§J) closes the "vacant role read as permission" loophole the external review probed.

## 9. Learning notes

- The load-bearing correction (PK ruling 1) generalises: the gate for people-imagery is **evidence retention of release + context-of-use**, not the free-vs-paid axis — a stock copyright licence never conveys disability-context association.
- Staged escalation (real-but-person-free before identifiable people) let the brand warm up without entering the highest-risk category — a reusable pattern for any sensitive brand.
- Local HEAD authoritative: bootstrap showed v5.76 but the register was already at v5.78 (v5.77 = NDIS abstract rotation-pool sourcing) — always re-derive the version from local HEAD before claiming.
