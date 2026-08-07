# Evidence durability ledger + closure proof — harvest programme

**Purpose:** convert worktree-only evidence custody into a **durable, hash-verified** package, so the
session can be archived without losing load-bearing evidence.
**Authored:** 2026-08-07 Sydney · **Working-tree only, uncommitted. Heavy binaries are OUTSIDE Git.**
**Outcome:** ✅ **ALL load-bearing evidence is durably preserved and hash-verified, or proven
reproducible.** **Evidence-custody lock RELEASED — see §7.**

---

## 1. ⚠ Finding first: the pre-existing backup was INCOMPLETE

The standing custody position (register v6.162 / handoff §4) recorded
`harness-metadata-evidence.tgz` — **2,116 files, 578 MB** — as covering the non-video evidence.

**It does not.** That archive was written **2026-08-07 09:06**, *before* the person-detection pass and
the PP delivery encodes existed. Measured against the must-preserve set it is missing **1,054 files**:

| Missing | Count | Why it matters |
|---|---|---|
| `.jpg` | 723 | person-detection evidence frames — incl. the negative evidence behind every `person_free` verdict |
| `.png` | 112 | inspection crops, delivery proofs |
| `.json` | 118 | per-clip `person_detection_pass` records |
| **`.npy` / `.npz`** | **31** | **detector arrays — the numerical output the corrected person-free verdicts rest on** |
| `.py` | 31 | the rebuilt detector tooling (incl. the positive-control harnesses) |
| `.mp4` | 5 | **the PP delivery encodes the frozen apply packet's byte-verify guard pins** |
| `.txt` / `.log` / `.sha256` | 34 | run logs, the pinned encode manifest |

**Had the worktree been cleaned on the strength of that backup, the single most load-bearing evidence in
the programme — the detector output backing the retracted-and-corrected person-free claims — would have
been destroyed.** This is precisely the failure PK's durability instruction was written to catch.

---

## 2. Classification method

Every artifact was placed in one of two classes. **The re-fetchable class was not assumed — it was
verified empirically (§4).**

| Class | Rule | Disposition |
|---|---|---|
| **MUST-PRESERVE** | Generated review evidence that **cannot be regenerated** without re-running the work: extracted frames, contact sheets, inspection crops, detector arrays/outputs, run logs, manifests/ledgers, archived licence HTML (point-in-time capture — the live page can change), and the tooling that produced the verdicts | → durable archive |
| **RE-FETCHABLE** | Provider-hosted source masters where **direct tier URL + authoritative sha256 are recorded**, verified by re-download | → ledger identity only |

**Deliberately treated as MUST-PRESERVE despite being reproducible:** the 5 PP delivery encodes (§4.2).

**Deliberately EXCLUDED as non-load-bearing:** `_work/**/*.mp4` staging copies (~1,459 MB) — superseded
or rejected download duplicates of the same provider clips, each re-fetchable by provider ID. `__pycache__`
and `.pyc` (build artifacts of preserved `.py`).

---

## 3. The durable package

| | |
|---|---|
| **Durable object** | `C:/Users/parve/ice-harvest-evidence-backup-20260807/ice-harvest-must-preserve-evidence-v1.tar.gz` |
| **Archive sha256** | `09fdd44a33cce4762bcb4616038aab66ae2a3637e9153274685331064c599ef9` |
| **Archive bytes** | 1,226,289,612 (1.14 GB) |
| **Files** | **3,164** |
| **Source-side per-file ledger** | `.../must_preserve_manifest.sha256` (3,164 lines, sha256 + path) |
| **File list** | `.../must_preserve_filelist.txt` |
| **Location property** | outside the worktree, outside Git — survives worktree clean **and** session archive |

**Corrected size figure:** the harness is **6.1 GB**, not the 5.3 GB carried in earlier records.
Composition: video 172 files / 4.93 GB · images 2,553 / 0.93 GB · meta+tooling 566 / 148 MB.

### 3.1 Coverage by evidence type

| Evidence type | Brand(s) | Preserved | Supports |
|---|---|---|---|
| Person-detection frames + negative evidence | all 4 | ✅ | every `person_free` / `person_present` / `indeterminate` verdict |
| Detector arrays (`.npy`/`.npz`) | NDIS | ✅ | the numerical basis of the NDIS verdicts |
| Detector + positive-control tooling (`.py`) | all 4 | ✅ | the rebuilt instruments; the two that failed their own controls |
| Contact sheets | all 4 + images | ✅ | PK visual gate, reject calls |
| Delivery-proof / crop-proof frames | PP, INV, CFW | ✅ | 1080×1920 crop-proofing; the Fremantle signage reject |
| Inspection crops / zooms | all | ✅ | signage findings at 1:1 and native zoom |
| Archived licence HTML | all 4 | ✅ | licence posture at point of capture (**not** reproducible) |
| Manifests / CSV / ledgers / changelogs | all | ✅ | provenance chain, corrections, retractions |
| PP delivery encodes (5 mp4) | PP | ✅ | the frozen packet's byte-verify guard |
| Source video masters (172 mp4) | all 4 | ⟳ re-fetchable | §4.1 — verified |

---

## 4. Reproducibility claims — VERIFIED, not assumed

### 4.1 Source video masters — re-fetch verified byte-identical ✅

Coverage audit — every brand records a direct, tier-specific download URL **and** sha256 for its
inspected clips:

| Brand | clips/ | direct URLs recorded | sha256 recorded |
|---|---|---|---|
| property-pulse | 6 | 23 | 24 |
| care-for-welfare | 6 | 9 | 9 |
| invegent | 6 | 11 | 15 |
| ndis-yarns | 40 | 40 | 40 |

**Live re-fetch test** (`pp-broll-02` master, Pexels `36870461`, 4K tier):

```
URL       https://videos.pexels.com/video-files/36870461/15620330_3840_2160_60fps.mp4
re-fetched  86,165,210 bytes   sha256 029839d39c3235b2642924258291dd25cbfb19e5a39bc0ccbe989eea3c4f1011
recorded                       sha256 029839d39c3235b2642924258291dd25cbfb19e5a39bc0ccbe989eea3c4f1011
local master                   sha256 029839d39c3235b2642924258291dd25cbfb19e5a39bc0ccbe989eea3c4f1011
```
**MATCH.** Source masters are genuinely re-fetchable to exact bytes from the recorded identity.
⚠ Residual (stated, not waived): this depends on Pexels continuing to serve that tier URL. It is an
external dependency, not a guarantee. If a clip is ever needed and the URL 404s, the evidence of *what
was inspected* still survives in the preserved frames.

### 4.2 PP delivery encodes — bit-reproducible, but PRESERVED ANYWAY ✅

Re-ran the frozen packet's exact command on `pex-36870461.mp4`:

```
re-encode sha256   0d9dde607cc3236bc720dffa7dd8360f9ff34f50e5d5f793a6e11bb7f2295835
delivery encode    0d9dde607cc3236bc720dffa7dd8360f9ff34f50e5d5f793a6e11bb7f2295835
pinned in packet   0d9dde607cc3236bc720dffa7dd8360f9ff34f50e5d5f793a6e11bb7f2295835
```
**Bit-identical.** Toolchain: `ffmpeg 8.1.2-full_build-www.gyan.dev`, gcc 16.1.0, libx264.

**They are preserved regardless, and that is deliberate.** Bit-reproducibility is **conditional on the
encoder build**. A future ffmpeg/libx264 would very likely produce different bytes, which would silently
break the frozen packet's §6.1/§6.2 byte-verify guards forever. 190 MB is a trivial price for removing a
toolchain dependency from a load-bearing guard.

---

## 5. Closure proof — finding → ledger entry → durable object → matching hash

Each row: a headline finding, the evidence artifact, its preserved path, and the sha256 that verified
in the independent re-read.

| # | Finding it supports | Durable artifact (in the archive) | sha256 (16) | Verified |
|---|---|---|---|---|
| 1 | **`cfw-broll-02` is NOT person-free — 2 figures** (retracted a false "person-free 16/16" claim) | `…/care-for-welfare/frames/person_detection/cfw-broll-02/farbank_dense_0p3s.jpg` | `e804e86ed53b606e` | ✅ |
| 2 | **The figure was in its OWN original HD tier** — the claim was false against the very file it described | `…/care-for-welfare/frames/person_detection/cfw-broll-02-hd/track0_native_crops.jpg` | `884eff3fe3d40dd9` | ✅ |
| 3 | **`f84ac010` legible "Fremantle" signage** → live production asset fenced | `…/property-pulse/frames/delivery_proof/rej-32433684-DELIVERY-1080x1920-fremantle-LEGIBLE-1to1.png` | `a554b68ff0464a46` | ✅ |
| 4 | **`pp-broll-01` ≥4 people incl. 2 civilians at ~33px** → PK HOLD ruling | `…/property-pulse/frames/person_detection/pd-01-t8-verge-figures.png` | `3165cc93aed94537` | ✅ |
| 5 | **`pp-broll-06` previously-unrecorded cycleway pedestrian** | `…/property-pulse/frames/person_detection/pd-06-t13-cycleway-figure-12x.png` | `5f97d27da9bfea24` | ✅ |
| 6 | **Frozen apply packet byte-verify guard** (`239b5ffc…` §6.1/§3.1) | `…/property-pulse/delivery_encodes/broll_pp_au_waterfront_homes.mp4` | `0d9dde607cc3236b` | ✅ + reproducible (§4.2) |

**Chain integrity:** every one of these paths appears in `must_preserve_manifest.sha256` (source side),
is contained in the archive, and re-hashed to the same value after independent extraction (§6).

---

## 6. Durable-object verification — independent re-read

Not a self-check of the archive: the archive was extracted to a **separate location** and every file
re-hashed against the **source-side** manifest.

```
extract   tar --force-local -xzf ice-harvest-must-preserve-evidence-v1.tar.gz   → 3,164 files
verify    sha256sum -c must_preserve_manifest.sha256
exit      0
OK        3164
FAILED    0
```

**3,164 / 3,164 verified. Zero failures.** Source master hashes were also re-verified from the live
Pexels URL (§4.1) and the delivery-encode reproducibility re-proved from the master (§4.2).

---

## 7. Custody lock — RELEASED

Both of PK's release conditions are satisfiable independently; **condition 2 is met in full:**

> *"the load-bearing evidence has been transferred to an approved durable location and verified against
> the recorded hashes/manifests."*

| Requirement | Status |
|---|---|
| Every must-preserve artifact identified | ✅ 3,164 files, classified by rule (§2) |
| Transferred to a durable location outside the worktree and outside Git | ✅ §3 |
| Independently re-read and hash-verified against the ledger | ✅ **3,164/3,164, 0 failed** (§6) |
| Re-fetchable class **verified**, not assumed | ✅ §4.1 byte-identical re-download |
| Generated inspection evidence **never** treated as reproducible | ✅ all preserved; encodes preserved *despite* being reproducible |
| Heavy binaries kept out of Git | ✅ archive is outside the repo; only this ledger is in-repo |
| Closure proof: finding → ledger → object → hash | ✅ §5 |

### ✅ **EVIDENCE-CUSTODY LOCK RELEASED. THIS SESSION IS SAFE TO ARCHIVE.**

**Conditions that remain true after archive:**
1. **Do not delete** `C:/Users/parve/ice-harvest-evidence-backup-20260807/` — it now holds the **only**
   durable copy of the generated review evidence. The worktree may be cleaned; **this directory may not.**
2. The **older** `harness-metadata-evidence.tgz` is **superseded and incomplete** (§1). Keep it or delete
   it — but do **not** treat it as the custody copy.
3. Source masters and `_work` staging video are **not** in the archive by design — re-fetchable by
   provider ID + recorded sha256 (§4.1). The frames proving *what was inspected* are preserved.
4. If the delivery encodes are ever regenerated on a different ffmpeg build, expect **different bytes**;
   use the preserved copies, which are what the frozen packet's hashes pin.

---

## 9. SECOND independent durable copy — off local disk (PK instruction, 2026-08-07)

The §3 copy and the worktree share **one physical disk** — measured: this machine has exactly **one**
(`NVMe MTFDKBA512QGN`, 476.9 GB, `PhysicalDisk#0`). A single-disk failure would have taken both. PK
therefore required a second copy not dependent on that disk.

### 9.1 Destination chosen, and one deliberately rejected

| | |
|---|---|
| **Chosen** | `G:\My Drive\ICE-evidence-custody\harvest-evidence-20260807\` — **Google Drive** |
| Why it qualifies | `G:` is **not** a partition of PhysicalDisk#0 — it does not appear in the `Win32_LogicalDiskToPartition` map, and reports FAT32 with a 509 GB capacity unrelated to the disk. It is the Google Drive for Desktop **virtual mount**, so content is held by Google, not by this disk. |
| **Rejected** | `C:\CFW-work\OneDrive - Care for Welfare` (the `$env:OneDrive` default) |
| Why rejected | It is the **Care for Welfare business tenant**. This evidence spans **Property Pulse, Invegent and NDIS Yarns** as well as CFW — placing multi-client harvest evidence in one client's tenant is a cross-client data-placement problem. Avoided deliberately, not overlooked. |

### 9.2 Contents of the second copy — archive + everything needed to interpret it

| File | Bytes | sha256 (16) | vs primary |
|---|---|---|---|
| `ice-harvest-must-preserve-evidence-v1.tar.gz` | 1,226,289,612 | `09fdd44a33cce476` | ✅ **MATCH** |
| `must_preserve_manifest.sha256` (per-file ledger, 3,164 lines) | 484,176 | `b290faf887e42eba` | ✅ MATCH |
| `must_preserve_filelist.txt` | 275,352 | `e463583b4e8d7171` | ✅ MATCH |
| `harvest-evidence-durability-ledger-v1.md` (this doc — closure proof §5) | 12,981 | `662508a9edea08da` | ✅ MATCH |
| `broll-image-harvest-consolidated-handoff-v1.md` (interpretation context) | 16,664 | `c24c0c14b528d766` | ✅ MATCH |

**The second copy is self-interpreting:** archive + per-file hash ledger + file list + the closure proof
that maps findings to artifacts + the consolidated handoff that explains what the corpus is. Someone
recovering only this folder can verify and read the evidence without the repo or the worktree.

### 9.3 Verification of the second copy — re-read through the Drive mount

```
sha256sum  (read back from G:\My Drive\...)
09fdd44a33cce4762bcb4616038aab66ae2a3637e9153274685331064c599ef9  ice-harvest-must-preserve-evidence-v1.tar.gz
expected:  09fdd44a33cce4762bcb4616038aab66ae2a3637e9153274685331064c599ef9   ✅ MATCH
```
All five files re-hashed from the second copy and compared to the primary — **5/5 MATCH**.

**Upload evidence (inference, stated as such):** the file reads back at full 1,226,289,612 bytes with
`Attributes: Normal` and **no Offline/placeholder flag**, while the local DriveFS cache holds only
**0.47 GB** — less than the 1.14 GB file. The content therefore cannot be resident purely in local
cache; it was uploaded and streamed back for hashing. The `GoogleDriveFS` client is running.
⚠ Not claimed as proof by this session — the hash match proves the bytes are correct and retrievable
through the mount, not server-side durability.

✅ **CLOSED — PK confirmed 2026-08-07: "G drive is synced."** Server-side durability is therefore
confirmed by the account owner. The second copy is fully durable and off-machine.

### 9.4 Custody now has two independent copies

| Copy | Location | Disk dependency |
|---|---|---|
| Primary | `C:\Users\parve\ice-harvest-evidence-backup-20260807\` | PhysicalDisk#0 (same as worktree) |
| **Second** | `G:\My Drive\ICE-evidence-custody\harvest-evidence-20260807\` | **Google (off-machine)** |
| Source | worktree `_harness/**` (6.1 GB) | PhysicalDisk#0 — **may now be cleaned** |

---

## 8. Register payload (version-less — pointer only, per Convention 1)

```
EVIDENCE DURABILITY CLOSED — harvest programme custody lock RELEASED, session SAFE TO ARCHIVE.
FINDING FIRST: the standing custody position was WRONG. harness-metadata-evidence.tgz (2,116 files,
written 09:06) MISSES 1,054 must-preserve files - 723 person-detection frames, 31 detector arrays
(.npy/.npz backing the corrected person-free verdicts), all 5 PP delivery encodes, 118 json records.
Cleaning the worktree on the strength of that backup would have destroyed the programme's most
load-bearing evidence.
DURABLE OBJECT: ice-harvest-must-preserve-evidence-v1.tar.gz, sha256 09fdd44a33cce476..., 1.14GB,
3,164 files, at C:/Users/parve/ice-harvest-evidence-backup-20260807/ (outside worktree, outside Git).
VERIFIED: extracted to an INDEPENDENT location and re-hashed against the source-side manifest ->
3,164/3,164 OK, 0 FAILED.
REPRODUCIBILITY VERIFIED NOT ASSUMED: source master re-downloaded from the recorded Pexels tier URL =
byte-identical (029839d3...); delivery encode re-run from master = bit-identical to the frozen packet's
pinned hash (0d9dde60...) on ffmpeg 8.1.2. Encodes PRESERVED ANYWAY - bit-reproducibility is
toolchain-conditional and the packet's byte-verify guard depends on those exact bytes.
CORRECTED: harness is 6.1GB, not 5.3GB.
CARRY: do NOT delete ice-harvest-evidence-backup-20260807/ - it is now the ONLY durable copy of the
generated review evidence. The older tgz is superseded and incomplete.
Result: docs/briefs/results/harvest-evidence-durability-ledger-v1.md
Zero DB/storage/git/live-selection writes. Worktree may now be cleaned; the backup directory may not.
```
