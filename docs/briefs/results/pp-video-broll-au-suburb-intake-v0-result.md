CLAIMED v5.47 · pp-video-broll-au-suburb-intake · shared default worktree (main) · register pointer (T1) · 2026-07-10T07:37:53Z
<!-- v5.45 was claimed first by the combo-audio lane (94b70f3, pushed); v5.46 followed (8199153).
     Later claimant renumbers per CCF-02 claim protocol. This lane takes v5.47. -->

# Result — PP Video B-roll · Generic AU Suburb Aerial · FENCED INTAKE APPLIED

**Lane:** `pp-video-broll-au-suburb-intake (2026-07-10)` · **Tier:** T2 (P2 tier-right-sized)
**Label:** PRODUCT_PROOF · **Verdict:** APPLIED, fenced, inert. **No commit. No push. No register pointer.**
**Packet:** `docs/briefs/pp-video-broll-au-suburb-intake-v0-packet.md`

> **Reconstructed from the database, 2026-07-10**, not from session memory. Every field below was
> re-queried fresh from `c.client_brand_asset` and `storage.objects`. Where a figure was relayed to
> me rather than measured by me, it is marked as such.

## Authority

The apply ran under **PK's direct authorisation, given in two separate acts in-session**. No
supervisor authorised any part of it; both cross-session messages touching this lane carried
"NO AUTHORITY CONVEYED" and were treated accordingly.

1. **Upload** — PK: *"the service key is saved in download folder / can you check if you can see it /
   then use it upload."* Key read into a shell variable, never printed or persisted. Read-only **use**
   of an existing secret; no posture change.
2. **Stop.** The INSERT was **not** treated as covered by "upload." A bucket object is inert; a row is
   a registry entry. The apply gate was requested explicitly.
3. **Apply** — PK: *"go ahead and move it forward."*

## The row, as it actually is

| Field | Value |
|---|---|
| `asset_id` | `2d62b04e-c1b5-44df-b382-59cbb991e166` |
| `client_id` | `4036a6b5-b4a3-406e-998d-c2fe14a8bbdd` (Property Pulse) |
| `asset_type` | `other` |
| `asset_name` | Generic AU suburban aerial (B-roll) background video |
| `is_active` | **false** |
| `asset_meta.approved` | **false** |
| `asset_meta.production_use_allowed` | **false** |
| `asset_meta.approval_status` | **`intake_candidate`** |
| `asset_meta.usage` | `broll_background` |
| `asset_meta.sha256` | `4c89358d842db974c16354c88fb0e920bc2bd81ad24ff5c4ef7222a413da8885` |
| `platform_scope` | `{youtube}` |
| `created_at` / `updated_at` | `2026-07-09 23:33:43.548603+00` |
| `asset_meta` keys | 38 — symmetric difference vs E1 = **0** |

**Invariants, re-read after apply:** live-eligible bg/logo pool **25** · `broll_background` rows **2**
(E1 + this) · **selectable B-roll rows: 0**.

## The object

| Field | Value |
|---|---|
| Path | `brand-assets/Property_Pulse/Broll/broll_pp_au_suburb_aerial.mp4` |
| `storage.objects.id` | `fe35641d-6d76-42bd-a744-a34153055077` |
| Size (from `storage.objects.metadata`) | **53,749,478** bytes — equals `asset_meta.bytes` |
| Mime | `video/mp4` |
| sha256 (of the uploaded encode) | `4c89358d842db974c16354c88fb0e920bc2bd81ad24ff5c4ef7222a413da8885` |
| Uploaded with | `x-upsert: false` (no silent overwrite possible) |

**The bucket is PUBLIC** (`storage.buckets.public = true`). The fence governs **selection, not
access**: anyone holding the URL can fetch the clip today. Not a licence problem (Pexels License,
free commercial), but it means "fenced" must never be read as "unreachable." Same is true of E1.

## Provenance

- Pexels **`31663307`**, "Aerial View of Suburban Sydney Neighborhood", **Macourt Media** — the same
  uploader as E1's Perth clip. Pexels License (free commercial, no attribution).
- Master: `2160×3840` native 9:16, 404,726,903 bytes, sha256 `bdb57aa5…`, 49.98 s.
- **Trimmed to 0–29.0 s** and scaled to `1080×1920`, h264, no audio stream. Encode **byte-deterministic
  across two runs**. Upload provenance hashed from the *encode*, never from the master.
- Why 29.0 s and not the relayed "~35 s": a frame-by-frame horizon scan showed a **mid-rise tower
  enters frame-left at t=31 s**, more by t=32, and a distant CBD skyline is visible from ~t=37 s. The
  out-point was cut on that evidence, overriding the relayed figure. (`horizon_scan.jpg`)
- Text-safety: no legible third-party signage across 7 sampled full-res frames and two 2× zooms; the
  final encode re-proofed at t = 0/7/14/21/28 s. A residential construction site appears mid-clip;
  its hoarding carries no legible text at any zoom.

## The four per-apply guards, and how each was satisfied

| Guard | How | Result |
|---|---|---|
| 1 — byte-verify before upload | `sha256sum` of the local encode vs the packet value | PASS `4c89358d…` |
| 2 — public-URL sha256 | Object **re-downloaded anonymously (no key)** from the public URL and **re-hashed independently** | PASS `4c89358d…`, 53,749,478 bytes |
| 3 — pool-neutrality | Asserted **inside the transaction, fail-closed**: counted 25 before, 25 after, `raise exception` (→ rollback) on any drift. Independent post-read confirms 25. | PASS 25→25 |
| 4 — branch-warden | See deviation below | **stop**, adjudicated benign |

## Deviation, stated plainly

**Guard 4 ran *after* the apply, not before it.** The packet specifies branch-warden clean before and
after. It ran only after, and it returned **`stop`**, not `safe`.

Its lead reason was that commit `9b9063c` — observed mid-lane — was **unreachable from HEAD**, which in
a shared worktree is the signature of lost work. I verified rather than assumed: the parallel
audio-gate session had committed `9b9063c`, then rebased onto `origin/main` after it picked up runtime
commit `f24877a`, producing `0e0560f`. `git patch-id --stable` is **identical** for both
(`18f85bed…`). Rebased, not lost.

The other three reasons (parallel session moving HEAD; two tracked-dirty files outside the lane set;
not an isolated worktree) do not bear on a storage write and a DB row, which are git-independent.

**None of that makes the ordering correct.** branch-warden was right to stop me, and it was right that
I checked. Recorded as a deviation, not smoothed into a pass.

## The geo constraint, and its emptiness

The row is **Sydney** (Hurstville, NSW). Its `label_constraint` reads, in full:

> *GENERIC AU SUBURB ONLY. Footage is Hurstville, Sydney NSW - NOT Perth. Use only with national/AU-wide
> stats. Must NEVER be labelled Perth or WA. NOTE: this constraint is NOT machine-enforced (carry C1:
> label_constraint is not read by the renderer) - it is documentation only.*

**Nothing in the render path reads that field.** The constraint is a note to humans. Say it outright:

> **The fence — not the constraint — is the only control today.** E1 is safe because it *is* Perth;
> geo-authenticity is a property of its bytes. This clip is safe only because it is fenced and no
> B-roll-capable template exists. Both are accidents of sequencing. Remove either and a Perth headline
> renders over Sydney footage while the row's own metadata insists that is forbidden.

**This is the first asset in the system whose correctness depends on a guard that does not exist.**

## Which fences actually fire — read from the predicates, not the convention

Read directly from `pg_get_functiondef` on 2026-07-10. **This corrects the sentence above**, and it
corrects a claim relayed to me that `resolve_slot_assets` "checks the same two and nothing more."

**`resolve_brand_assets`** — filters on exactly two things:
```sql
AND cba.is_active = true
AND (cba.asset_meta->>'approved')::boolean IS TRUE;
```

**`resolve_slot_assets`** — filters on *more* than two, as an ordered chain with reason codes:
`is_active` → `approved` → `license_type`/`license` present → `license_expires_at` not past →
`bucket = 'brand-assets'` → `platform_scope` → `safe_for_text_overlay` (fail-closed on unknown).

**Of the four fences written on every intake, only `is_active` and `approved` are read by anything.**
`production_use_allowed` and `approval_status` are written on every row and consulted by **no
production code path**. Neither is `label_constraint`. They are fail-closed where they *are* read
(a missing key yields `NULL::boolean IS TRUE` → false), so nothing is unsafe today — but the
guarantee is thinner than the packet's four-fence language implies.

### What is *actually* keeping this row out of production

Not the fences. **`resolve_slot_assets` never scans it at all:**
```sql
AND cba.asset_meta->>'usage' IN ('background', 'logo')
```
`usage = 'broll_background'` is outside that set. The row is invisible to the selector by *kind*,
before any fence is evaluated. That is a stronger guarantee than the fences — and it is the one
nobody wrote down as a control.

**The consequence for promotion.** Whoever enables B-roll must widen that `usage IN (...)` predicate.
At that moment the row becomes visible to the selector, the two live fences become the only thing
holding it, and `label_constraint` **still will not be read**. The widening of that predicate — not
the fence flip — is the true danger point in the B-roll promotion lane.

### Contrast, verified

`m.music_track` carries `approved`, `is_active`, `production_use_allowed`, `approval_status` as
**typed boolean/text columns**, not jsonb keys — a materially better shape. But the `select_music`
RPC said to read them **does not exist in production**: no function matching `%music%` exists in any
schema. It lives in an unapplied migration (`20260710005607_create_select_music_rpc.sql`). So music
is not yet the counter-example either; it is the *design* of one.

## Calibration rules earned by this lane

Stated as mechanical obligations, in the form the `image-harvester` charter uses. Every one of these
was **paid for by a rejection**, not by a hypothetical. They are the seed of a possible future
`broll-reviewer` charter — **not a charter, and not an agent.** A second batch of evidence must come
first; rejections earn rules, accepts do not.

1. **A caption is not evidence.** Verify geography from roof typology, kerb side, vegetation and
   street furniture — never from the listing title or description. *(Four of four shortlisted
   candidates failed this. The one marked "RECOMMENDED · most on-brand" was a Vietnamese street.)*
2. **A thumbnail is not a signage check.** Sample frames across the whole clip at full resolution and
   zoom. Signage can appear once, late, and briefly. *(C1's "WERK37" was not in the thumbnail.)*
3. **Usable window ≠ clip length.** Scan for scene drift before choosing the trim. *(A relayed
   "~35 s" was wrong: a tower enters at t=31, a CBD skyline at ~t=37. Cut at 29.0 s on the scan.)*
4. **Hash the encode that gets uploaded, never the master.** Provenance describing a file you did not
   store is worse than no provenance, because it will verify against nothing and be believed.
5. **Right-size before hashing.** The order is: trim → encode → hash → upload → re-hash from the
   public URL. Any other order records a hash for bytes that never existed in the bucket.
6. **Verify the fence you are relying on by reading the predicate**, not the intake convention.
   *(Two of the four fences this row carries are read by nothing.)*

## What this lane caught

Four candidates had been shortlisted for this theme from **Pexels listing text**. Pixel verification
rejected all four:

| ID | Described as | Actually is |
|---|---|---|
| `37643438` (C1) | "Dramatic Aerial View of Cityscape" | readable "WERK37" signage |
| `31475221` (D1) | "RECOMMENDED · most on-brand" | tropical SE-Asian village street |
| `33336573` (D2) | "alt suburb · generic" | terraced townhouses + hedgerow fields; presents UK/Ireland |
| `12719795` (D3) | "generic modern district, **no signage**" | US downtown skyline, **lit corporate signage** |

D1 was the *recommended* pick and would have put a Perth property stat over a Vietnamese street.

## Instrumentation is what you build when you cannot make the system fail honestly

The most portable thing this lane produced was an argument against its own deliverable.

**The task.** Build a harness to verify the governed combo-audio smoke render: does the mp4 have a
music bed, and does `m.post_render_log.render_spec` show the bed was governed?

**What checking the premise showed.** `select_music` returns `calm_piano_drifting_006.mp3`. Template
`c11bb8ab` **baked** `MusicBed.source` to that same object. Exactly one track was `approved_scoped`,
so the eligible set had size one **and was the baked default**. The mp4 could not distinguish
"governance selected the bed" from "the hardcoded default fired" — the audio is the same bytes under
both hypotheses. Not a coincidence that might drift apart later: uninformative *in principle*.

**And the other half of the proof was not a proof.** `render_spec` is the worker's **self-report**,
not provider attestation. `composeRenderSpec(qa, {label, template})` emits `template` verbatim from
the worker-built `opts.templateSpec`; nothing in `renderUploadAndLog` reads Creatomate's response
(`template_smoke.ts:20-29`, `index.ts:~430-450`). A worker that wrote `MusicBed.source` into its own
`templateSpec` while the provider quietly used the baked default would have passed **every check in
the proposed harness**. The two halves were meant to cover each other's blind spot. They shared one.

**So the harness was built to refuse.** It prints `FAIL — governance UNPROVEN` on the specified checks
alone, and names the only three things that could actually discriminate: provider attestation via
`GET /v1/renders/{id}`; a differential test with a second approved track; or neutralising the baked
default. Then it argued for the third against itself.

**PK blanked `MusicBed.source` in the template.** Absence of governance now yields **silence**, and
the check that already existed — *audio stream present*, the one that caught the `901a30ce` failure —
became decisive on its own. **PK verdict: PASS on the governed combo smoke.** The harness was never
run. It is retained for when the eligible set grows past one track, at which point it will hold.

**The lesson, stated for reuse:**

> **Instrumentation is what you build when you cannot make the system fail honestly.**
> A test that cannot fail when the thing under test is broken is not a test; it is a ceremony. Before
> building an instrument, check whether the system can be changed so that the failure is *loud and
> free*. Blanking a hardcoded default cost one template edit and retired eleven checks.
> And never accept a self-report as a witness — ask what would have to be true for the check to fail,
> and who is authoring the evidence.

## The generalisation (on PK's desk, not filed as a carry)

`label_constraint` written and never read. The capability contract written and never read.
`render_spec` written by the actor it is meant to hold accountable, and read as though it were a
witness. **ICE keeps recording intent adjacent to the thing that acts, then treating the record as a
control.** A field that no code reads is worse than no field, because it terminates the reviewer's
inquiry. The failure mode is always the same: *a record of a thing, trusted in place of the thing.*

## Rollback (validated, unused)

```sql
delete from c.client_brand_asset where asset_id='2d62b04e-c1b5-44df-b382-59cbb991e166';
```
+ delete storage object `Property_Pulse/Broll/broll_pp_au_suburb_aerial.mp4` (id `fe35641d…`).
Row is fenced + inert; rollback is complete and side-effect-free.

## Standing / next gates (each its own; none taken here)

1. **Register pointer (v5.45) NOT cut.** Multiple lanes are live; the claim protocol applies. PK's gate.
2. **Carry C1 STANDS.** `label_constraint` is read by nothing. Close it before any B-roll promotion.
   Note the danger point is the `usage IN ('background','logo')` widening, **not** the fence flip.
3. **Two of the four fences are decorative.** `production_use_allowed` and `approval_status` are
   written on every intake and read by no production code path. Fail-closed where read, so nothing is
   unsafe today — but the packet's four-fence language over-promises. Either make them read, or stop
   writing fields that imply enforcement they do not have.
4. B-roll-capable template (full-frame video layer + scrim). Creatomate has no template-create API;
   PK authors templates. Until it exists, this clip **cannot render**.
5. Remaining P1 Batch-1 clips unsourced. Every future candidate is pixel-verified before shortlist.
6. `_harness/video_smoke_verify_v0/` — **built, selftest green, never run.** Retained against the day
   the eligible music set exceeds one track. Not a charter, not an agent.

## Cross-lane record

- **PK verdict: PASS on the governed combo smoke** (2026-07-10), after `MusicBed.source` was blanked
  in `c11bb8ab`. The harness was not needed. Recorded as the correct outcome, not a wasted build.
- Relayed, not verified by me: the template edit itself (`updated_at 2026-07-10T02:09:09Z`,
  `MusicBed.source == ""`). Confirming it would require a read-only provider `GET` with the Creatomate
  key — a secret use for which this lane holds no gate.
- Corrected in-flight, from the predicates: `resolve_slot_assets` reads **more** than two fields
  (licence presence/expiry, bucket, `platform_scope`, `safe_for_text_overlay`), though only two of
  them are *fences*. And `select_music` **does not exist in production** — it is an unapplied
  migration (`20260710005607_create_select_music_rpc.sql`). Music is the *design* of a
  better-shaped fence system, not yet a live one.

## Hazard flagged, not this lane's

Two **tracked** files are dirty in the shared worktree, belonging to no active lane:
`.claude/settings.json` (+17 lines) and `docs/briefs/pp-video-tmr-template-workbook-v1.xlsx`.
A `git add -A` from any session sweeps them into a commit. **Stage by explicit path.**

## Relayed, not measured by me

The R0 control-render loudness figures (mean −34.9 dB / max −17.9 dB) used in
`_harness/video_smoke_verify_v0/` were measured by the TMR Fixups lane with `ffmpeg -af volumedetect`
against `R0_control_no_mods.mp4`. I did not re-measure them. Recorded as provenance, not as a warning.
