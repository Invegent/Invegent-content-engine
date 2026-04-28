# Result — Branch Hygiene Sweep (Phase 2 Execution)

> **Date completed:** 28 April 2026
> **Brief:** `docs/briefs/2026-04-28-cc-task-branch-hygiene.md`
> **Owner:** Claude Code
> **Outcome:** 2 deletes + 1 archive across the 3 in-scope branches. One stop condition surfaced for PK.

---

## Summary

- **Branch 1 (content-engine `feature/discovery-stage-1.1`)** — verified, **deleted** (remote + local)
- **Branch 2 (content-engine `feature/slot-driven-v3-build`)** — verified, **archived** to `archive/slot-driven-v3-build` per brief special handling, then deleted from `feature/` namespace
- **Branch 3 (invegent-dashboard `feature/discovery-stage-1.1`)** — verified, **deleted** (remote + local)

`gh` CLI is not installed on this machine, so the verification protocol substituted `git diff origin/main...origin/<branch> --stat` as the determinant of safe-to-delete. The decision matrix collapses cleanly: PR-merged + diff-empty and No-PR + diff-empty have the same outcome (DELETE), so the absence of `gh pr list` data did not change any decision for branches 1 and 3. Branch 2's action is unconditional (archive) per the brief's special handling, regardless of diff.

---

## Branch 1 — `Invegent-content-engine/feature/discovery-stage-1.1`

**Verification:**
- HEAD SHA: `741f3bc47852cd64e708c2e33e30285e9a9dedd0` ✓ matches inventory
- Last commit: `2026-04-27 17:29:39 +1000 — feat(db): Discovery 1.1 — public.add_client_discovery_seeds RPC (migration 002)`
- Commits not on main: **0**
- Diff vs main (`git diff origin/main...origin/feature/discovery-stage-1.1 --stat`): **empty**
- PR check: skipped (no `gh` CLI); diff-empty determines safety unambiguously

**Action taken:** `git push origin --delete feature/discovery-stage-1.1` — confirmed deleted on remote. Local branch deleted.

**1-line summary:** Discovery 1.1 work fully landed on main; branch was a no-op duplicate, removed.

---

## Branch 2 — `Invegent-content-engine/feature/slot-driven-v3-build`

**Verification:**
- HEAD SHA: `6d66312f7908bec6743e165f90241acc77e1c3b0` ✓ matches inventory
- Last commit: `2026-04-27 15:40:37 +1000 — feat(db): Stage 12.053 — fill_pending_slots ai_job UPSERT (architectural symmetry)`
- Commits not on main: **26**
- Diff vs main: **non-empty — 55 files changed, 4881 insertions(+), 31 deletions(-)** (slot-driven Stage 11–12 migrations + ai-worker v2.10–2.11 changes)
- PR check: skipped (no `gh` CLI)

**Action taken:** archived rather than deleted, per brief's explicit special handling: "even if its content has been replicated to main, the branch is a permanent record of the build path." Commands run:

```bash
git branch archive/slot-driven-v3-build origin/feature/slot-driven-v3-build
git push origin archive/slot-driven-v3-build
git push origin --delete feature/slot-driven-v3-build
```

Both pushes succeeded. New ref `archive/slot-driven-v3-build` exists on remote at the same SHA `6d66312`; the misleading `feature/` prefix is gone.

**1-line summary:** Slot-driven Phase A build history preserved under `archive/` namespace; PK can override to hard-delete later if preferred.

**Side note for PK:** the diff vs main is genuinely non-empty (4881 insertions ahead), suggesting the branch carried Stage 12.050–053 migrations that have not been replicated under those exact filenames to main. Sync state confirms Phase B is autonomous and producing slots, so the migrations clearly applied in production — but the GitHub `supabase/migrations/` directory may not carry the 050–053 files under those filenames. Worth a quick check in a future session if filename audit trail is important; the archive ref preserves the source-of-truth either way.

---

## Branch 3 — `invegent-dashboard/feature/discovery-stage-1.1`

**Verification:**
- HEAD SHA: `c32aaf90596c8464a8fcc1c576493dcd2e1e6bbf` ✓ matches inventory
- Last commit: `2026-04-27 17:46:43 +1000 — refactor(dashboard): split DiscoveryKeywordsTab into Form + List, wire into existing Onboarding tab`
- Commits not on main: **0**
- Diff vs main: **empty**
- PR check: skipped (no `gh` CLI); diff-empty determines safety

**Action taken:** `git push origin --delete feature/discovery-stage-1.1` — confirmed deleted on remote. Local branch deleted.

**1-line summary:** Discovery 1.1 dashboard work fully on main via direct-push; branch was a no-op duplicate, removed.

---

## PK action required — stop condition surfaced

The brief states "9 of 12 branches in the sync state's hygiene list are already gone. Only 3 branches remain." A fresh `git ls-remote --heads` on all three repos shows that **all 9 of the supposedly-deleted branches still exist on remote**:

**`Invegent-content-engine`** (3 surviving fix/* branches not in the brief's table):
- `fix/m11-fb-ig-publish-disparity` at `105352bef8791cedc7d7dfef54fb1022674ad426`
- `fix/m8-ai-worker-draft-multiplication` at `2e65d39b035e740bde8658ce8dc54158b32da703`
- `fix/q2-normalise-feed-config-url` at `d83dfede4527411f3893535540f58afa25fc5f27`

**`invegent-dashboard`** (5 surviving fix/* branches not in the brief's table):
- `fix/cfw-schedule-save-silent-error` at `a9169ef05ae188c8de301d81c729e21bd4cdabe1`
- `fix/m5-rpc-get-publish-schedule` at `b4a219ea38f9ccc684ea0a587b8c139f93fa1e60`
- `fix/m7-dashboard-feeds-create-exec-sql` at `17359c876a1a8feae0a74f15a2a57988fb3d1a40`
- `fix/m9-client-switch-staleness-and-platform-display` at `d6028a228d48d0d8683f63f3de928b5a0cd8594b`
- `fix/q2-dashboard-feeds-create-key` at `26162c60e76d99ed9f81b29c77c94f23cde8b51a`

**`invegent-portal`** (1 surviving fix/* branch):
- `fix/m6-portal-exec-sql-eradication` at `59c78adc1f69d4fcc6826a36c152c838ea18cc43`

These match the sync state's full 12-branch list (line 138). The brief's "9 already gone" assumption appears to be incorrect — none have been deleted. Per the brief's explicit instruction ("Do not touch any branch not on the 3-row table above"), CC did not run the verification protocol or take action on these 9. **PK to confirm whether the 9 should be processed in a follow-up sweep, and whether the brief's inventory was based on a different baseline (e.g. local-branch-only view, or a snapshot from a different time).**

---

## Final post-sweep state

**`Invegent-content-engine`** (5 non-main branches):
- `archive/slot-driven-v3-build` (newly created, was `feature/slot-driven-v3-build`)
- 3× `fix/*` (untouched per brief scope — see PK action above)

**`invegent-dashboard`** (5 non-main branches):
- 5× `fix/*` (untouched per brief scope — see PK action above)

**`invegent-portal`** (1 non-main branch):
- 1× `fix/*` (untouched per brief scope — see PK action above)

Total: **9 non-main branches remaining across 3 repos** (down from 12 in scope). 1 became `archive/`, 2 deleted, 9 untouched per brief scope.
