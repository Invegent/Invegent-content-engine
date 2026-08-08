# Register pointer payload — cc-0092 B1 FROZEN + cc-0093 ISSUED

**SUBMISSION TO THE REGISTER-CUT-OWNER CHANNEL. DELIBERATELY VERSION-LESS.**

**Why no version number:** PK item 7 designates exactly ONE session at a time as register-cut-owner.
A lane that allocates its own number bypassing the owner gets the cut **retracted** as a channel
violation, not treated as a factual dispute (precedent: v6.111 was cut out-of-channel, retracted via
`6d39d09`, then correctly resubmitted and landed as v6.113). Register head at time of writing was
**v6.173**; **no owner session is confirmed open**, so this payload waits rather than assuming the
role. The owner allocates the number and places the text.

**Convention 1 applied:** pointer entries only. The full evidence lives in the brief and artifacts
and is not duplicated into the registers.

---

## Payload A — for `docs/00_sync_state.md`

> **📼 vX.XX — cc-0092 Gate B B1 packet FROZEN (audit CLEAN) + cc-0093 ISSUED; NOTHING APPLIED, watch gate intact** — brief `docs/briefs/cc-0092-gate-b-instagram-reel-transport-proof-brief-v1.md` (Amendments 1–3); commits `bf8a5f0` (freeze) / `0931d8e` (bounded pass) / `7019dda` (Amendment 2).
> · **Two INDEPENDENT freeze sets (PK ruling):** A2a fwd `8708ba7b952d04c8` · rb `f1e47c4b4920703f` — A2b v2 fwd `c88c5a87f099b676` · rb `44b9ddbfe1548eef`. `db-rls-auditor` final pass: `must_fix []` / `should_fix []` / **CLEAN**; correction cycle CLOSED under PK's stop rule.
> · **Two production-impacting defects caught BEFORE apply:** (1) three `platform_support` Instagram values wrong → the format registry, not render/transport, zeroed IG video (cc-0091 A1); (2) the first A2b design would have pushed **NDIS Yarns to 4 of 7 IG posts video** off a 35% decision made for **Property Pulse** — a platform-level mix share means a different real allocation per brand, because each brand's surviving format set differs by template graduation state.
> · **Gate B scope AMENDED to ONE format** (`video_short_stat`, property-pulse): `video_short_stat_voice` / `video_short_kinetic_voice` are unreachable (`is_enabled=false` AND `select_template` `status='fail_closed'`, `fail_reason='format_unmapped'` — **zero** rows in `c.creative_template_variant_candidate` for either key). Root cause = grid demands governed selectability from formats the renderer serves via its **legacy** branch → **cc-0093** (ISSUED, T3, authoring-only).
> · **NEXT (PK, after ~2026-08-11 20:20 Sydney + explicit gate):** A1 → A2a → nightly path → ONE governed Reel → B4 permit/block. Runbook `docs/briefs/artifacts/cc-0092-apply-runbook-v1.md`.

## Payload B — for `docs/00_action_list.md`

> **cc-0092 Gate B — B1 COMPLETE, packet FROZEN, audit CLEAN. BLOCKED on the watch gate (~2026-08-11 20:20 Sydney) + PK apply gate.** Apply sequence = **A1 then A2a only** (A2b v2 authored, NOT applicable by this lane under any outcome; A3-1/A3-2/A3-3 deliberately excluded). Channel NAMED: Supabase `apply_migration` (mints its own version — record it). Runbook prepared: `docs/briefs/artifacts/cc-0092-apply-runbook-v1.md`.
> **cc-0093 — capability truth for non-Creatomate engines. ISSUED (Gate 1 PASSED), T3, AUTHORING-ONLY, nothing authorised to apply.** Not a new finding: it is **AB-01 root cause #2** and its remediation option (b), now confirmed from the scheduling side. `video_short_avatar` is the sharpest case — 136 YT publishes + 6 IG Reels, 90 renders / 0 failures, `instagram:true` already, and today it cannot be scheduled at all. ⚠ Must NOT apply before cc-0092 B3 publishes.
> **CARRY-INFRA-1 — apply-channel transaction proof.** Whether `apply_migration` honours an embedded `BEGIN`/`COMMIT` as one transaction is closed by **assertion, not proof**. Prove ONCE independently, then let future gates cite it. Procedure: `docs/briefs/artifacts/cc-0092-carry-infra-1-apply-channel-proof-procedure-v1.md`.
> **Accepted-not-to-be-fixed (do not "improve" these):** N-7(a/b/c), F-8, F-9, F-10 — all verified **false-abort-only, never false-pass**, by enumerating reachable values. Recorded in the brief's freeze section.

---

## Notes for the owner

- Both payloads are **pointer-only**; no long facts, per Convention 1. Do not expand them.
- Nothing in this payload asserts anything applied, deployed, published, or proven. If any wording
  reads that way at placement time, cut it rather than softening it.
- The two freeze sets are **independent by PK ruling** so further A2b work cannot destabilise A2a.
  Keep them listed separately — collapsing them into one line loses that property.
