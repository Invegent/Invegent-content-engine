# SEED PACKET — S3 · AGP Identity

**Issued:** 2026-07-24 by the ICE orchestrator, under PK ruling of 2026-07-24.
**You are:** a worker session, **PLANNING-ONLY**. The orchestrator session is the control tower and
registrar. **You do not cut register entries or push.**

> ## ⛔ YOU MAY NOT TOUCH `heygen-worker`
> No edit, no deploy, no flag flip, no secret change, no avatar activation, no marker write.
> This prohibition lifts **only** when PK approves a *new* implementation gate. A previous session
> crossed exactly this line and caused a production outage — see §4.

---

## 0. Read first (in this order)

1. `CLAUDE.md` (repo root) — the standing orchestration contract. Binding on you.
2. `docs/briefs/results/cc-0047-agp-v2-identity-resolution-planning.md` — **the PK-ACCEPTED plan.
   This is your foundation.**
3. `docs/briefs/results/cc-0052-heygen-typed-resolver-incident-result-v1.md` — **read this before
   acting on cc-0047's "named next slice" paragraph. That slice was attempted and failed.**
4. `docs/00_sync_state.md` entries **v6.11** and **v6.12**.

All durably on `origin/main adfd0f0` as of this packet.

## 1. What you own

**The AGP / governed identity-resolution lane** — as a *planning* owner. The `heygen-worker` EF is
nominally yours in the sense that no other session may write it, but **you may not write it either**
until a new gate opens.

## 2. Task ID

**You continue `cc-0047`.** It is PK-ACCEPTED and final. Do not renumber, and do not open a new ID
merely because a new session owns the lane.

New child tasks (e.g. Brand Host Designation as its own governed lane):
**cc-0063–cc-0067 reserved to you.** Register block **v6.40–v6.49** — you draft, orchestrator commits.

⚠ **`cc-0050` is VOID/retired** — it was a duplicate draft of your lane, never gated. Never recycle it.
⚠ **`cc-0052` is your lane's failed child.** Its brief carries a DO-NOT-EXECUTE banner.

## 3. Entry state — census verified, do not re-derive

- **1 active realistic avatar per brand** for NDIS and PP; **0 avatars** for Invegent and CFW.
- `is_primary` / `is_default_host` markers exist with two partial unique indexes — **0 of 28 rows
  set**, and **not referenced anywhere in code**.
- `r.avatar_resolution_shadow` exists, **0 rows**; `resolve_and_record_avatar_shadow` live;
  `AVATAR_SHADOW_TELEMETRY` inferred OFF.
- `stakeholder_role` is **null on all 86–87 renders and all 119 `video_short_avatar` drafts** — the
  role predicate has **never fired in production**. Selection is 100% `fallback_limit1`.
- Persona input is **dark**: the Stage-1 suggester produced 16 good suggestions on 2026-06-15, then
  `no_persona_available` on 38 consecutive drafts.
- AGP v1 infrastructure is **RETAINED** where census-verified compatible. Phase 3.3 activation/cutover
  plan is **SUPERSEDED**. Cutover **BLOCKED**; Branch B **NOT AUTHORISED**.

**Avatar is the last asset class outside the governed resolver spine** — `resolve_slot_assets` v1.2
knows only `Background` and `Logo`; nothing models identity.

## 4. What went wrong last time — the lesson you must carry

`cc-0052` replaced `lookupAvatar`'s `exec_sql` query with a supabase-js query-builder resolver at
claimed **"strict parity"**, deployed it, and took down avatar rendering.

**Root cause:** the **`c`-schema PostgREST `!inner` embed does not resolve via supabase-js at
runtime**, and the code destructured **only `data`** — so the error was swallowed into a **false
null** → `lookupAvatar` returned null → *"No active avatar"*. Casualty: NDIS `video_short_avatar`
draft failed 2026-07-23T09:30:04Z. Rolled back to v2.3.0 (fn 43).

**Three lessons, binding on your design work:**
1. A supabase-js query that destructures only `data` hides **every** query error as a false null.
   Always check `error`.
2. "Strict parity" between an `exec_sql` string join and a query-builder `!inner` embed is **not** a
   safe assumption on non-`public` schemas.
3. Verify a resolver change against a **real live submit**, never against a parity claim plus unit
   tests. Unit tests cannot exercise live PostgREST resolution.

**Also true and recorded:** the rollback restored the vulnerable-shaped code, so **the `exec_sql`
injection shape in `lookupAvatar` remains OPEN**. Accepted for now (service-role only, not
anon-reachable). Do not treat it as closed — and do not treat closing it as urgent enough to rush.

## 5. Your mission (PK-specified, in order)

1. **Brand Host Designation FIRST.** This leads; everything else trails.
2. **Define how genuine ambiguity is created and governed** — what it means for a brand to have more
   than one legitimately active identity, and who decides.
3. **Remove the meaningless one-active-avatar soak from the critical path.** The Phase 3.3 soak
   measures resolver-vs-live agreement when multiple candidates exist. With exactly one active avatar
   per client it would return `candidate_count=1 / agree=true` on every row — a deploy plus a secret
   flip for **zero decision evidence**. It only becomes informative *after* a second avatar is
   legitimately active.
4. **Incorporate the cc-0052 incident lessons** into the design of record.
5. **Prohibit a typed-resolver refix** until its contract and error behaviour are proven. Any future
   attempt needs a NEW brief under a NEW gate and **must not inherit cc-0052's pinned mechanism**
   (the brief pinned a query-builder implementation and de-scoped the RPC — that removed the fallback
   that would have avoided the outage).

## 6. Hard constraints

- **Planning only.** No code, no deploy, no migration, no flag, no marker write, no avatar activation,
  no shadow soak, no cutover.
- Standing holds unchanged: **Phase 3.3 BLOCKED · cutover BLOCKED · Branch B NOT AUTHORISED.**
- The append-only shadow-table `service_role` over-grant is a **separate** safety follow-up. **Do not
  fold it into any resolver slice** without a distinct PK scope ruling.
- Do not repair the persona outage in this lane — it is a **named handoff**, not your scope.
- Do not touch the `image_quote` incident lanes (`cc-0048`/`cc-0049`, owner S2). They share two
  affected client ids and must not be conflated with avatar findings.
- **Do not reintroduce `69541fd`.** It stays on `origin/claude/new-session-swx6cf` as evidence.

## 7. Read path

`python scripts/db-read.py "SELECT … FROM ice_ro.<view>"` for view-coverable reads (zero prompt);
`execute_sql` SELECT-only for `c.brand_avatar` / `r.*` / `m.*` reads no view serves.
Read-only only — the DB is your evidence, not your subject.

## 8. First gate

**Return to PK: the Brand Host Designation Gate-1 brief** — what designation means, who holds it, how
it creates governed ambiguity, its tier, its evidence bar, its rollback, and explicitly what it does
**not** authorise. Report outcome-only.
