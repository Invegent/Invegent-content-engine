# Result — Control Tower v2 takeover, PK priority order + cc-0079 Slice 2 format ruling (v6.22)

**Status:** `PK PRIORITY ORDER RECORDED · SLICE 2 RULING ISSUED · SLICE 2 RE-VERIFIED LIVE · ZERO PRODUCTION MUTATION`
**Lane classification (CCF-02):** SAFETY_GATE · **T1** (docs/registers) · **Register pointer:** **v6.22**
**Date:** 2026-07-24 Sydney · **Executor:** Control Tower v2 (registrar)
**Predecessor:** v6.21 (`1839358`, pushed)

> **This pass applied nothing to production.** It records a PK ruling, a PK priority order, and an
> independent live re-verification of an already-authored packet. No DML, no deploy, no migration.

---

## 0. Stale-ref gate — PASS

`git fetch --prune`; `HEAD` = `origin/main` = `18393587d56de110f694655426bd286dd250bdfd`, parity 0/0,
confirmed independently by `git ls-remote origin refs/heads/main`.

## 1. PK priority order — recorded verbatim in substance

PK issued a three-item ordered program and a blocker rule. Recorded because it governs every lane
allocation from here:

1. **Dashboard Client Schedule redesign — urgent.** The schedule must support planning by **both
   platform and format**. Slice 2's material-consequence ruling is issued (§2). Accepted scope for
   this slice, **not a permanent ceiling on future formats**. Slice 2 opens as the first owned window;
   its reviewed scope is preserved and **must not broaden into unrelated dashboard work**.
2. **Creatomate governed video production.** ICE produces static images today; the objective is an
   operational Creatomate video path. **Distinct from AGP multi-character work.** Opens after Slice 2
   reaches its next PK gate. **First proof = a governed smoke render for inspection — no publication,
   no broad enablement, until approved.**
3. **AGP multi-character.** Step B remains the prerequisite for governed multi-character selection.
   **`:92` repair rides in-scope.** Its Gate-1 brief **must** carry a genuine Stage-2 proof that
   demonstrates designation-driven selection rather than storage-order behaviour — **parity is not
   acceptable evidence where candidate-set size is one.**

**Blocker rule (PK):** anything that materially blocks one of these three becomes priority work, but
the connection must be **explicit** — name which priority it blocks · show why it blocks progress ·
contain the work to the **minimum repair** · return to the ordered program immediately after. Unrelated
safety, cleanup, registry or opportunistic-improvement work **must not displace these priorities.**

## 2. 🟢 PK RULING — cc-0079 Slice 2 material consequence, ISSUED

The `policy_decision` open since the packet was authored is now settled. PK ruling:

> **Facebook: 3 valid formats · Instagram: 2 valid formats · LinkedIn: 2 valid formats.**
> Accepted scope for this slice; **not a permanent ceiling on future formats.**

This discharges §8 of the apply packet and item 4 of the external review record's "what remains".
**It does not open the apply window and does not waive the SoD control or the `db-rls-auditor` pass.**

## 3. Independent live re-verification of Slice 2 — packet is NOT stale

Verified by the registrar directly against project `mbkmaxqhsohbtwsqolns`, not taken from the packet:

| Check | Result |
|---|---|
| `cc-0079-slice-2-apply-packet-v2.md` sha256 | **`73dd7413…`** — matches the pin; external review remains valid |
| `cc-0079-slice-2-external-review-record-v1.md` sha256 | **`0494f77e…`** — matches |
| Both artifacts on a ref | committed at **`1839358`** → the SoD apply hand can `git show <ref>:<path>` and hash **that**, never a working tree |
| §6 identity drift STOP | **17 live current rows for FB/IG/LI; all 17 `mix_default_id` match the pinned list exactly**; all `effective_from = 2026-04-22` |
| A0 pre-assert (H1 collision) | **0 rows** at `effective_from = CURRENT_DATE` — first apply is safe |
| `platform_support` vs PK's ruling | **exact match** — FB valid = `carousel`/`image_quote`/`text` (**3**) · IG = `carousel`/`image_quote` (**2**) · LI = `image_quote`/`text` (**2**) |

**PK's ruling is not merely accepted policy — it is what the database already asserts.** The drift STOP
does not trip; the packet is live-applicable as written.

**Limit, stated honestly:** the registrar verified the **identity set, `effective_from`, and validity
flags**. It did **not** re-run `m.build_weekly_demand_grid` / `m.allocate_week_formats`, so the packet's
§1 allocation table (6 of 15 → 0 of 15) is **carried from the packet, not independently reproduced here**.
That reproduction is the owning session's step ⑤ and the post-apply proof.

## 4. ⚠ Scope correction — "Dashboard Slice 2" contains no dashboard change

Recorded so no later reader over-reads the lane name. **cc-0079 Slice 2 is a data-only DML against
`t.platform_format_mix_default`. It contains zero dashboard file changes.**

- **What it delivers toward priority 1:** the schedule stops allocating formats the platform cannot
  publish — **6 of 15 weekly Property Pulse slots (40%) → 0 of 15**. LinkedIn is worst at **3 of every
  5 slots**, because `carousel` holds the single largest share (40%) and is `linkedin:false`.
- **What it does NOT deliver:** **planning by platform and format in the dashboard UI.** That surface
  is not built, not designed, and appears in no reviewed packet. Slice 2 makes the underlying
  allocation trustworthy; it does not put a planning surface in front of an operator.

The planning surface is carried as a **separate Gate-1 scoping lane** (S2), read-only, no window.

## 5. Board — sessions renumbered, four lanes dispersed

Prior sessions (v1 control tower, S4 recording lane) confirmed **archived**. PK opened four sessions
renumbered from 1. Lane allocation follows the priority order:

| Session | Lane | Priority | Posture |
|---|---|---|---|
| **S1** | cc-0079 **Slice 2 apply** | 1 | **The only open production window.** T3 apply gate. |
| **S2** | Dashboard schedule **platform+format planning surface** — Gate-1 scoping | 1 | **Read-only.** No window, no dashboard file write. |
| **S3** | **Creatomate governed video** — Gate-1 prep | 2 | **Held** until Slice 2 reaches its next PK gate. Smoke render only. |
| **S4** | **AGP Step B + `:92`** — Gate-1 brief | 3 | **Authoring only.** Stage-2 proof mandatory. |

**Standing constraint enforced:** exactly **one** production-mutation window at a time (S1). S2/S3/S4
are read-only or authoring until PK opens their windows — PK attention is the shared resource.

## 6. Carried, not actioned — and explicitly NOT blocking

Per PK's blocker rule, these are recorded and parked because **none of them blocks priorities 1–3**:

- **🔴 Published draft `2f89e33f…`** (NDIS Yarns, Facebook, `published_at` 2026-02-18 08:50:04Z,
  `platform_post_id` `950779394792976_122102400141261740`). Registrar re-verified live: the
  `m.post_publish` row is **untouched** — one attempt, `error: null`, **no unpublish or delete recorded
  anywhere**. The draft's `approval_status = 'dead'` with `updated_at` **2026-03-22** is a stale
  draft-record state from four months ago and **must not be read as evidence of removal**.
  **New fact not in the original forensic: the published message is prefixed `[TEST]` with
  `dry_run: false`** — a test-mode post reached a real client Facebook page. **ICE cannot observe
  whether the post is still live on Facebook; only PK can confirm removal.** Awaiting PK decision.
- **cc-0080 v3** (`713ab4ae…`) — NOT APPLIED, NOT REVIEWED. Unchanged.
- **cc-0081** patches A/B/C — designed, not built. L2 and L3 remain open.
- **cc-0055**, **cc-0078 build**, **S6 dashboard redesign**, **Slice 0.5 / Slice 1 enforcement** — parked.
- **C-2** (`assign_brand_avatar` unconditional `is_active = true`) — open, scoped, **a governance
  control not a database one**; becomes consequential when AGP step B lands.

## 7. What this lane changed

**Committed:** this result doc + both registers. **Production mutations: 0.** No apply, migration run,
DML, deploy, flag change, or promotion. `branch-warden` ran before commit.

**Push authorized explicitly by PK** for v6.22.

## 8. Next gate

> **S1** — Slice 2 apply gate is **PK's**, after `db-rls-auditor` + the §2 re-derivation + the 17-row
> identity re-confirmation. Post-apply proof: every platform **0 invalid of 5**.
> **S2** — returns a Gate-1 scoping brief for the planning surface; **no build authority.**
> **S3** — returns a Creatomate Gate-1 packet; **must not open a window** until Slice 2 clears its gate.
> **S4** — returns the Step B Gate-1 brief **including its Stage-2 proof design**; `:92` in scope.
> **🔴 `2f89e33f…` still needs a PK decision** — leave, review, or remove.
