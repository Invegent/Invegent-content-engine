# Result — `mcp-github-bridge` provenance recovery (read-only)

**Status:** `DEPLOYED-AHEAD-OF-REPO · SOURCE UNVERSIONED · PROVENANCE ESTABLISHED · NO REMEDIATION TAKEN`
**Lane class:** control-tower governance recovery · T1 read-only
**Recorded:** 2026-07-24
**Executed by:** orchestrator (control tower), read-only. No deploy, no rollback, no repo source altered.

> Surfaced by the 2026-07-24 health triage (item 4). PK-authorized as read-only recovery; cross-model
> concurrence: *"a deployed write-capable artifact with no source on any ref is a governance-recovery
> issue within the control tower's remit — do not redeploy, roll back, reconstruct source
> speculatively, or alter any repo until provenance is established."*

---

## 1. The gap, stated precisely

| | Deployed (live) | Repo (`origin/main`) |
|---|---|---|
| Version | **3.0.0** | **2.0.0** |
| Write tools | **`create_or_update_file` + `push_files`** | **none** (0 occurrences) |
| Source location | Supabase platform only | `supabase/functions/mcp-github-bridge/index.ts` |
| sha256 | `ezbr_sha256` **`302eed0123b233ce69f0ad153c8b65b7a3fdf2110e02d943a320a895f7889ace`** | `c06668992fd40d7e18b0b789004cd56f148262ddf36f9ea6b68e88296b838830` (34704 B) |

**The v3.0.0 source exists on NO git ref.** Verified: `git log --all -S'3.0.0' -- supabase/functions/mcp-github-bridge/` returns nothing across every `origin/*` ref and all local refs.

## 2. Live deploy identity (read-only, `get_edge_function`)

- Function id `992b5886-c875-4ea1-b3d1-03e26477131c` · slug `mcp-github-bridge` · **version 17** · status **ACTIVE**
- **`verify_jwt = false`**
- Created **2026-05-04T03:08:38Z** · **last updated 2026-05-14T04:06:43Z**
- Repo's last commit touching the bridge: **`32622d8`, 2026-05-04T04:39:09Z** (*"mcp-github-bridge v2.0.0 — OAuth 2.1 + DCR + PKCE"*)

**→ v3.0.0 was deployed ~10 days after the last commit to that path, and was never committed.**

## 3. Capability delta — what v3.0.0 can do that the versioned source cannot

- **`create_or_update_file`** — single-file write (auto-resolves current sha; optional explicit sha for concurrent-edit detection).
- **`push_files`** — atomic multi-file commit (blobs → tree → commit → ref advance), capped `MAX_FILES_PER_PUSH = 25`.
- Writes require `GITHUB_PAT` with **Contents:read+write**.
- Repo whitelist (hardcoded, defence-in-depth over PAT scope): `Invegent/Invegent-content-engine` · `Invegent/invegent-dashboard` · `Invegent/invegent-portal`.
- Auth on `POST /`: `X-MCP-Secret` **or** OAuth 2.1 JWT bearer (DCR + PKCE, `/register` `/authorize` `/token`).

## 4. ⚠ Severity is "unversioned", NOT "rogue" — read this before acting

The deployed artifact is **deliberate, coherent and self-documenting.** Its own header states the intent
verbatim: *v3.0.0 adds write tools… bridge is no longer read-only. Mobile sessions can now execute
4-way sync close work.* The whitelist, the 1 MB read cap, the 25-file push cap, the PAT-scope
defence-in-depth and the OAuth structure are all consistent with the v2.0.0 design lineage.

**So this is not unknown code running in production — it is known-shaped, intentional code that never
entered version control.** The governance defect is the *absence of a repo record and a review gate*
for an artifact that acquired **GitHub write authority over three repositories**, not the code itself.

**Do not characterise this as a compromise or an incident.** Equally, do not treat "it looks
intentional" as a substitute for the missing review.

## 5. What was NOT done (deliberate)

- **No redeploy, no rollback** — the live function is untouched.
- **No repo source altered** — `supabase/functions/mcp-github-bridge/index.ts` remains at v2.0.0,
  byte-unchanged. Overwriting it with recovered bytes would be an unreviewed code change wearing a
  recovery label.
- **No speculative reconstruction committed.** The deployed source was read and reviewed in place; it
  is retrievable on demand via `get_edge_function`, and `ezbr_sha256 302eed01…` is its authoritative
  fingerprint. A byte-exact transcription was not committed because its fidelity could not be
  independently proven at this gate — recording an unverifiable artifact as canonical would repeat the
  failure class this lane exists to close.

## 6. Recommended reconciliation (needs its own PK gate — NOT authorized here)

1. **Recover + commit the v3.0.0 source** to `supabase/functions/mcp-github-bridge/index.ts` under a
   normal review chain, with the recovered bytes verified against the live deployment before commit.
2. **Retro-review the write tools** — the review that never happened: PAT scope, whitelist
   sufficiency, the `X-MCP-Secret`-or-JWT auth surface on a write-capable endpoint, and whether
   `verify_jwt=false` is correct for a bridge that can now push to three repos.
3. **Record the drift class** — `deploy_drift_status` reads **B-RR / regression-risk**
   (deploy 3.0.0 > repo 2.0.0, `repo_path_status=present`). It resolves only when step 1 lands.
4. **Decide the standing question:** should an MCP bridge hold GitHub *write* authority at all, given
   the control tower's own push discipline (fresh `branch-warden` + explicit PK gate per push)? A
   write-capable bridge is a **second, ungated path to the same repos.** That is a PK policy call.

## 7. Non-claims

No exploitation is claimed or evidenced — no logs or forensics were reviewed, and no assertion is made
that the write tools have ever been invoked. This lane establishes provenance only. It does not
approve, retro-approve, or close anything, and it authorizes no change to the deployed function or to
any repository.
