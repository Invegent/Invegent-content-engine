# SEED PACKET — S2 · Image Proof

**Issued:** 2026-07-24 by the ICE orchestrator, under PK ruling of 2026-07-24.
**You are:** a worker session. The orchestrator session is the control tower and registrar.
**You do not cut register entries or push. You return findings and packets to PK.**

---

## 0. Read first (in this order)

1. `CLAUDE.md` (repo root) — the standing orchestration contract. Binding on you.
2. `docs/briefs/results/cc-0049-invegent-quote-card-winner-mapping.md` — **your lane's canonical
   record. §5 is the load-bearing section.**
3. `docs/briefs/results/cc-0048-image-worker-creative-contract-registry-recovery.md` — the predecessor.
4. `docs/00_sync_state.md` v6.13.

Current as of `origin/main adfd0f0`.

## 1. What you own (sole writer)

**The `image-worker` edge function** and its family: `b1_production.ts`, `creative_contract.ts`
(both vendored copies), `branch_b_proof.ts`, `index.ts`.

**No other session deploys image-worker.** You do not own heygen-worker (S3), the dashboard repo (S1),
or the registers.

## 2. Task ID

**You continue `cc-0049`.** Do not take a new ID merely because a new session owns the lane — IDs
identify governed tasks, not sessions. The obligation is unchanged and unfinished.

New child tasks only: **cc-0058–cc-0062 reserved to you** (e.g. if F-A or F-C is opened as its own
governed lane). Register block **v6.30–v6.39** — you draft pointers, the orchestrator commits them.

## 3. Entry state — established, do not re-derive

**Deployed and content-verified:** image-worker **v3.33.0**, Supabase function version **101**,
deployed **2026-07-23T04:38:06Z**, `verify_jwt=false`, drift **A-LE clean**, deploy == repo 3.33.0.
Deployed-bundle grep confirmed all six cc-0049 markers present and the stale `image-worker-v3.32.0`
string absent (bundles-from-CWD trap excluded). Commit `e232607`.

**Post-deploy `image_quote` render evidence (deploy boundary = 2026-07-23T04:38:06Z):**

| Client | Post-deploy render | State |
|---|---|---|
| invegent | 05:15:17Z `654b7a6d…` · 06:30:10Z `bc8e97ce…` | RENDER-PROVEN |
| ndis-yarns | 15:30:16Z `bb4be175…` | RENDER-PROVEN |
| care-for-welfare-pty-ltd | 15:30:25Z `a17872dc…` | RENDER-PROVEN |
| **property-pulse** | **NONE** (last 02:15:16Z, pre-boundary) | 🔴 **PENDING** |

## 4. Your mission (PK-specified)

1. **Observe for the first natural PP post-v3.33.0 `image_quote` render.** All PP drafts currently
   carry `image_status='generated'` (rendered pre-deploy), so none is queued — this arrives with the
   next natural slot fill. **It cannot be manufactured and you must not try.**
2. **Prepare — but do NOT invoke — the Invegent geometry smoke.**
3. **Distinguish provider success from visual acceptance** in everything you write.
4. **Return the narrow T3 packet** required for the controlled non-publishing proof.
5. **Do NOT claim a PK visual PASS.** None exists.

## 5. The distinction your whole lane turns on

> `status='succeeded'` means **the provider completed a render**. It says **nothing** about whether
> the quote-card layout is correct.

Text can overflow, overprint, or mis-anchor and still return `succeeded`. The `e232607` commit states
in terms that *the first controlled production render is the mandatory geometry/visual-proof gate*,
because the market-insight geometry is **explicitly non-portable** to the quote card and **no layout
guard was added**.

**Two Invegent renders succeeded. That is not acceptance. Record render outcomes and geometry
acceptance as separate obligations, always.**

## 6. The prepared proof action — stop at its gate

The existing non-publishing supervised entrypoint **`governed_image_quote_smoke`** (shipped in
image-worker v3.25.0) renders a governed proof to `_smoke/` with **no draft update and no publish**.
It is the narrowest instrument that discharges the geometry obligation.

**Invoking it requires an `x-series-key` and is a controlled production event → T3 PK gate.**
Your job is to produce the packet — exact invocation, preconditions, expected evidence, rollback
posture, STOP conditions — and **stop there**.

## 7. Open carries in your lane (do not silently absorb)

- **F-A — ai-worker parity edit shipped UNDEPLOYED.** `creative_contract.ts` exists in two vendored
  copies kept byte-identical by a parity test; the ai-worker copy was edited but never deployed.
  No evidence either way that it has since deployed. **Verify before assuming.**
- **F-C — `RENDER_ATTEMPT_CAP=5` is unreachable for continuously-retried drafts.** `pipeline-fixer`
  FIX 2 filters `updated_at < now()-120min`, but every failed render refreshes `updated_at`, so a
  draft failing every ~15 min is never a candidate and is neither reset nor dead-lettered. Drafts
  carried 10–72 failed renders with `dead_reason IS NULL`. Same family as the cc-0040 headline-gate
  loop. **Not fixed.** Opening it = a new governed task from your reserved range.

## 8. Deploy gotchas — these have caused real incidents here

- **`supabase functions deploy` bundles from the CURRENT directory, not git HEAD.** Deploying from
  `main` while your change sits in a worktree silently ships OLD code. **Always grep the DEPLOYED
  bundle for a change-specific marker.**
- **The drift gate hashes ONLY `index.ts`.** A helper-only fix stays A-LE forever and `safe-deploy.sh`
  blocks it → pair it with a cosmetic `index.ts` VERSION bump.
- **Use `scripts/safe-deploy.sh <ef> --allow-warn`** — raw `supabase functions deploy` is deny-listed.
  Refresh `drift-check?write=true&slug=<ef>` after pushing, before deploying.
- **Deploy without `--no-verify-jwt` flips `verify_jwt`→true** and breaks `x-series-key`-only callers
  (401→502).
- Deno tests need `--allow-read --allow-net --allow-env` or they false-fail on permissions.
- Prefer an **isolated worktree**; re-verify HEAD before any commit (78 worktrees exist on this box).

## 9. Read path

Route view-coverable reads through `python scripts/db-read.py "SELECT … FROM ice_ro.<view>"`
(zero prompt). `ice_ro.render_status` serves most of your render queries — note it exposes
`client_id`, not `client_slug`. Use `execute_sql` (SELECT-only) for `m.*`/`c.*` columns no view covers.

## 10. First gate

**Return to PK: the T3 geometry-proof packet, plus a status line on PP.** Do not invoke anything.
Report outcome-only — blockers, scope changes, failed verifications, approval gates, final results.
