# Build Packet — Asset Graduation Slice 1: `asset-graduation-check` (static background images)

> **Status:** `GATE 1 — issued for PK. STOPPED AT THE IMPLEMENTATION GATE. Nothing built.`
> **Governing contract:** `docs/briefs/asset-graduation-contract-v1.md` (§3 check vector, §9 ratchet,
> §11 reason codes, §12 guards).
> **Asset class:** static background images — `c.client_brand_asset` (per-client) and
> `c.shared_creative_asset` (shared pool). The most routine class in ICE: governed selector, machine
> predicate, interchangeable in rotation, no person/cultural content.
> **Lane classification (CCF-02):** SAFETY_GATE. **Tier: T2** — isolated code, read-only, no DB
> object, no production mutation, no autonomous trigger.
> **Base:** CE `main`, HEAD `4e7dfa6`, parity 0/0.

---

## 1 · What is being built — and why this is the smallest thing worth building

**One read-only, zero-authority evaluator** that takes a batch of fenced background-asset candidates
and emits (a) the contract §3 check vector per asset, (b) a §11 reason code for each failure, and
(c) a single PK-facing decision sheet.

It is the **mechanical evidence assembly** and nothing else. It writes no DB row, mints no DB object,
flips no fence, and its PASS clears no gate — the same posture as the four CCF-04 helpers, and
deliberately so: a shadow-mode advisory tool needs no gate of its own to be useful.

**Why this slice and not something larger.** Three things already exist and must not be rebuilt:
sourcing (`image-harvester`), review (`image-reviewer`), and fenced intake (Automated Image Intake v1,
COMPLETE v6.36 **[asserted]**). Three things do not exist: the check vector as executable code, the
reason-code vocabulary as data, and the decision sheet. This packet builds exactly those three and
stops. Everything downstream — the promotion packet, the guards, the apply — stays where it is today:
manual, T3, PK-gated.

**What PK notices after this ships:** a batch arrives as one sheet with every mechanical question
already answered and every failure already named, instead of a pile of assets each needing fourteen
checks re-derived by hand.

---

## 2 · Deliverables — three files, no DB object

| File | Kind | Purpose |
|---|---|---|
| `.claude/helpers/asset-graduation-check.mjs` | Node, read-only | Consumes a candidate JSON payload, evaluates the check vector, emits verdict + reason codes + the decision sheet |
| `.claude/helpers/asset-graduation-check.test.mjs` | hermetic tests | Fixture-driven; **no network, no DB** |
| `docs/briefs/artifacts/asset-graduation-candidates-v1.sql` | hash-pinned read-only SELECT pack | One `execute_sql` SELECT per batch producing the evaluator's input payload |

**No migration. No new DB object. No `ice_ro` view in this slice** (contract O-4: accept one prompted
batch read for v1; the view is a named follow-on lane, never a widened `execute_sql` allowance).

---

## 3 · Checks in slice 1 — and the ones deliberately left out

Contract §3, restricted to what a static background evaluator can honestly decide:

| Check | In slice 1 | Note |
|---|---|---|
| C1 byte identity (`sha256` local == public URL == `asset_meta`) | ✅ | the one network read; `--offline` skips it and reports `not_run` |
| C2 object reachability + bucket == `brand-assets` | ✅ | |
| C3 rights: allow-listed source · licence name+URL · commercial use · expiry · attribution | ✅ | hold-list and excluded licences → `licence_unsafe` |
| C4 dimensions / aspect (D1 `dimension_short`, D2 `upscale_required`, D3 60 % crop, D4 aspect list) | ✅ | duration D5/D6 **N/A** for static |
| C5 geography: `geo_scope` is a known class + basis recorded | ✅ | provider tag alone is **not** a basis |
| C6 content-theme: tag presence + vocabulary conformance only | ✅ **partial, and says so** | it never judges brand fit — that is PK's |
| C7 slot compatibility: element kind · `platform_scope` **column** · `client_asset_pool_policy` reachability | ✅ | absent policy row ⇒ `client_only` ⇒ shared asset is a phantom |
| C8 `safe_for_text_overlay ∈ {'true','needs_scrim'}` | ✅ **the highest-value check** | catches the false-6 class before it reaches a pool count |
| C9 exact-duplicate (sha256 vs live pool) | ✅ | |
| C10 previously-rejected (composite provider + asset_id/url + sha256) | ⚠ **reads the store if it exists; reports `not_run` if it does not** | the store's existence is not this packet's to assume |
| C11 near-duplicate / pHash | ⛔ `not_run` | deferred to v2 by the Gate-1 ruling (`automated-image-intake-v1.md:10`) |
| C12 declared == resolver-reachable | ⛔ **out of slice 1** | needs a live seed sweep; belongs to the promotion packet's guard G5, not to a pre-approval evaluator |
| C13 pool neutrality | ⛔ out | an in-txn apply assertion; there is no transaction here |
| C14 fence integrity on readback | ✅ | cheap, and catches the per-client default-open trap |
| D7 compression/artefact | ⛔ `not_run` | a pixel-quality judgment; stays with `image-reviewer` + PK |

**`not_run` is never reported as `pass`.** Any `not_run` on a graduation-blocking check surfaces on the
sheet as an explicit gap with the reason it was not run.

---

## 4 · Contract — output shape and posture

**Output:** one JSON object per batch — `evaluator_version`, `input_digest`, `batch_id`, and per asset
`{asset_id, asset_key, client, format, platform_scope, checks{C→pass|fail|not_run}, reason_code|null,
remediation_route|null, requires_pk_visual_review: bool, blocking_gaps[]}` — plus a rendered
decision sheet grouping assets into **ready for PK visual review** / **failed, with reason** /
**incomplete, with the gap named**.

**Verdict vocabulary:** `READY_FOR_PK_REVIEW` · `FAILED` · `INCOMPLETE`. **Fail-closed:** any parse or
internal error → `INCOMPLETE`, never a fabricated `READY`.

**Posture — non-negotiable and stated in the tool's own output:**

- It **decides nothing.** `READY_FOR_PK_REVIEW` means "the mechanical questions are answered", not
  "approve this". PK's visual verdict remains the only deciding act.
- It **writes nothing** — no DB, no storage, no fence, no repo file outside its own package.
- It **clears no gate.** Every specialist and PK gate above it runs unchanged.
- It sets `requires_pk_visual_review: true` for every contract §10 trigger and **cannot clear that
  flag** under any input.
- **Initial posture: SHADOW / ADVISORY** — for the first N batches its sheet is produced *alongside*
  the existing manual assembly and compared, per the `apply-harness-auditor` shadow precedent.

---

## 5 · Success criteria

| # | Criterion | Method |
|---|---|---|
| S1 | Every check in §3 marked ✅ is implemented and independently unit-tested against fixtures | hermetic test suite, no network/DB |
| S2 | **The false-6 case is caught.** A fixture with `safe_for_text_overlay='needs_gradient_scrim'` returns `FAILED` / `text_safety_unknown` | regression fixture built from the real `42211c0f` row |
| S3 | **The upscale case is caught.** A 1920×1080 fixture targeting 1080×1920 returns `upscale_required`, and its retained-crop figure reproduces ~32 % | regression fixture from the same real case |
| S4 | **The phantom-shared-asset case is caught.** A shared asset for a client with no `client_asset_pool_policy` row returns a blocking gap, not a pass | fixture |
| S5 | **The default-open trap is caught.** A `c.client_brand_asset` fixture with `is_active` left at its default returns `fence_open_on_intake` | fixture |
| S6 | Fail-closed proven: malformed input, missing field, and an internal throw each yield `INCOMPLETE` — never `READY_FOR_PK_REVIEW` | fixture |
| S7 | `not_run` never contributes to a `READY` verdict on a blocking check | fixture |
| S8 | Zero writes: a full run over a real batch leaves DB, storage, and repo byte-identical | pre/post verification |
| S9 | The SELECT pack is read-only — SELECT statements only, no DML/DDL token anywhere | static check + `db-rls-auditor` |
| S10 | Sheet reproduces the manual assembly on **one real historical batch** with no false `READY` | shadow comparison vs the recorded batch-1 background promotion |

**S2–S5 are the whole point:** each is a real defect this arc actually shipped or nearly shipped. A
version of this tool that cannot catch those four is not worth building.

---

## 6 · Review chain, boundaries, rollback

**Chain (T2):** `ef-builder` in an isolated worktree → hermetic tests green → `db-rls-auditor` on the
SELECT pack (read-only confirmation) → `ask_chatgpt_review` pinned to the artifact hash →
`branch-warden` (HEAD / branch / parity / file set) → **PK gate 2** for commit. Push is a separate PK
instruction.

**Forbidden in this build:**

- ⛔ No DB object, migration, DDL, DML, GRANT, or deploy.
- ⛔ No write of any kind outside the three declared files.
- ⛔ No change to `resolve_slot_assets`, `select_template`, any worker, template, or asset row.
- ⛔ No approval language in any output; no auto-advance; no gate cleared.
- ⛔ No widening of the `execute_sql` allowance and no bypass of `db-read.py` for anything a view
  could serve.
- ⛔ No harvesting, sourcing, or intake — this slice touches no new bytes.
- ⛔ No scope creep into B-roll, logo, music, video, replenishment, or the promotion packet.

**Rollback:** trivial and total — three new files, no DB object, no production surface. Reverting is
deleting them. **Stated plainly because it is the reason this slice is safe to build first.**

**Named residual risks:**

1. **The evaluator can be wrong.** Shadow mode exists for exactly this; its sheet is compared against
   manual assembly before anyone relies on it.
2. **A green sheet may read as permission.** Mitigated by the §4 posture text in the output itself, but
   it is a human-factors risk, not an eliminated one.
3. **Slice 1 does not check declared == reachable** (C12). That invariant stays where it is proven
   today: guard G5 inside the T3 promotion apply. Do not let a clean slice-1 sheet imply it was
   checked.

---

## 7 · What comes after — named, not started

Sequenced, each its own Gate-1 brief. **None of it is authorised by this packet.**

1. **Slice 2 — graduation packet generator.** Emits the forward + rollback SQL with the §12 G0–G9
   guard set pre-wired and digest-pinned. Still PK-applied.
2. **Slice 3 — `ice_ro.asset_graduation_candidates` view** (contract O-4). Removes the prompted read.
3. **Slice 4 — auto-fence-back watcher.** The only automatable fail-open-adjacent act
   (contract §9): licence expired / object unreachable / hash changed → fence back, notify PK with
   the exact reversal.
4. **Slice 5 — B-roll class extension.** Adds D5/D6 duration and native-dimension checks.
5. **Slice 6 — pHash near-duplicate** (contract C11 / the v2 deferral).

---

## 8 · Stop condition

**This packet stops here — at the implementation gate. Nothing is built.**

Gate 1 needs from PK: (a) approval of `asset-graduation-contract-v1.md` including its five open
decisions O-1…O-5; (b) confirmation that static background images are the right first class;
(c) authorisation to open the slice-1 build lane at T2. On approval the lane runs §6's chain and stops
at gate 2 for the commit.

**Non-claims:** no code written, no file created beyond this packet and its contract, no DB read
performed against asset rows this session, no live pool count re-measured, no `cc-` id allocated, no
register version claimed. This packet approves nothing and does not approve itself.

---

## FREEZE BLOCK

```
artifact  : docs/briefs/asset-graduation-backgrounds-slice1-build-packet-v1.md
lane      : Asset Graduation Slice 1 -- asset-graduation-check evaluator -- NO cc- ID
governed by: docs/briefs/asset-graduation-contract-v1.md
class     : static background images (c.client_brand_asset + c.shared_creative_asset)
tier      : T2 -- isolated read-only code, three files, no DB object, no autonomous trigger
builds    : .claude/helpers/asset-graduation-check.mjs (+ .test.mjs)
            docs/briefs/artifacts/asset-graduation-candidates-v1.sql
posture   : SHADOW / ADVISORY -- zero authority, writes nothing, clears no gate, decides nothing
key proofs: S2 false-6 (needs_gradient_scrim) · S3 upscale (1920x1080 -> 1080x1920, ~32% crop)
            S4 phantom shared asset (no client_asset_pool_policy row) · S5 default-open fence
out of slice: C11 pHash · C12 declared==reachable (stays guard G5 in the T3 apply) · C13 pool
            neutrality · D7 artefact judgment · promotion SQL · any DB object
rollback  : delete three files -- no DB object, no production surface
stop      : IMPLEMENTATION GATE -- nothing built; needs PK Gate-1 approval of the contract + class
base      : CE HEAD == 4e7dfa6 (main, ahead 0 / behind 0)
sha256    : carried out-of-band. Verify:
            python -c "import hashlib;print(hashlib.sha256(open(r'docs/briefs/asset-graduation-backgrounds-slice1-build-packet-v1.md','rb').read()).hexdigest())"
```
