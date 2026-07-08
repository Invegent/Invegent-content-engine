# Result cc-0029 — LinkedIn attempt_no safety closeout + LinkedIn lane PARKING

**Lane:** cc-0029 (executed as safety-closeout only) · **Tier:** T3 · **Label:** PRODUCT_PROOF → PARKING
**Date:** 2026-07-08 Sydney
**Status:** **TRANSPORT PROVEN / GOVERNED SUPPLY CARRY** — LinkedIn media lane **PARKED** by PK decision.
**Predecessor result:** `docs/briefs/results/cc-0028-linkedin-image-media-publish-v0.md`
**Follow-on lane:** `docs/briefs/cc-0030-linkedin-governed-image-quote-supply-proof-v1.md`

---

## PK decision (2026-07-08)

Close/park the LinkedIn lane rather than keep expanding it. Complete only the cc-0029 **safety closeout** (the `attempt_no` / checked-audit-insert fix); park the governed-supply work into a future follow-on lane.

## Accepted conclusions

- **cc-0028 transport proof is ACCEPTED:** LinkedIn native image publishing through the Zapier bridge works (v1.3.0 published an `image_quote` draft's rendered image as a native LinkedIn image post; no text-only fallback — visually confirmed on the Property Pulse page).
- The **old-style published image** was a **legacy-rendered draft issue, not a transport failure** (the proof draft `7d0c0102` was rendered a month before the governed pipeline existed).
- **Governed/TMR LinkedIn creative supply is NOT yet proven** — the render pipeline *covers* LinkedIn (confirmed: `select_template('property-pulse','linkedin','image_quote',…)` returns a governed winner), but no fresh governed LinkedIn draft has been rendered + published end-to-end.
- **GFCP migration remains UNAPPLIED** (`image_quote → linkedin:false`; migration `20260706120000` committed, not applied).
- **No broadening approved.**

## Safety closeout — cc-0029 step 1 (attempt_no / checked audit insert)

**Defect (cc-0028 F3):** the publisher's `m.post_publish` inserts hardcoded `attempt_no=1` and did not check the insert `.error`, so a republish collided on `uq_publish_attempt UNIQUE (post_draft_id, attempt_no)`, the error was swallowed, and the queue was marked `published` with **no audit row**.

**Fix (v1.4.0):** both inserts (published-path + `writeTerminalBlock`) now derive the next-free `attempt_no` per `post_draft_id` (`nextAttemptNoFrom`, pure + unit-tested) and **check `insertErr`**; the published path **never throws** on an audit-insert error (the Zapier POST already fired → no requeue/re-fire/duplicate), and surfaces `audit_row_inserted` + `attempt_no` in the result. Mirrors the proven `youtube-publisher` v1.10.0 (F-YT-PUB-PUBLISH-AUDIT-GAP). `guard.ts` byte-unchanged; no DB/schema/migration.

**Review chain (clean):** ef-builder `deno check` clean + **18/18** hermetic tests · branch-warden **safe** · external review **partial → PK-triaged proceed** (not a concrete defect; residual cross-publisher race is the accepted house pattern whose worst case is a *surfaced* audit miss, never a duplicate; hash `47f108c3cb5bb4ae8b0ef46be0a655bdbf56521dc08ce33e28a2b5eec9d9a4fe`, review_id `ea666e5f-22b2-4a84-a5eb-d5b402df1004`).

**Landed:** main commit **`9906e1a`** (3 files, `guard.ts` `84628286` unchanged), local-only (unpushed).

**Deploy status:** ✅ **DEPLOYED + VERIFIED (2026-07-08)** — PK-deployed `--no-verify-jwt`; orchestrator-verified production GET returns `linkedin-zapier-publisher-v1.4.0`. The `attempt_no` / checked-audit-insert fix is now **in place** in production. **No further live publish** was run to prove it — the runtime proof (`attempt_no=2` on republish, no duplicate) is deferred to cc-0030's supervised publish.

## Sibling-publisher carry (flagged, NOT fixed)

The identical latent `attempt_no`/unchecked-insert defect exists in `publisher/index.ts` (Facebook), `instagram-publisher/index.ts`, and the repo-only `linkedin-publisher/index.ts`. Out of scope here — recommend a future lane applying the same `nextAttemptNoFrom` + checked-insert pattern.

## Held production state (DO NOT change without explicit PK decision)

- **Cron `jobid 54` (linkedin-zapier-publisher) is PAUSED** — ⚠️ all LinkedIn auto-publishing (text included) is OFF. **Re-enable only on a separate explicit PK decision** (tracked in cc-0030).
- **GFCP migration `20260706120000` UNAPPLIED.**
- **No broadening.**
- Staging artifacts from cc-0028: queue row `6e9cb735` (`published`), the duplicate/legacy PP LinkedIn post (2026-06-07 text + 2026-07-07 image — removal is a PK hygiene decision).
- **Git:** local main diverged from origin (behind 5 / ahead 4) + a **register-version collision** (local `a538545` vs origin `33779ed`, both "v5.25") — reconcile deliberately before any push (no blind fast-forward / force-push).

## Carry → cc-0030 (LinkedIn governed image_quote supply proof v1)

1. GFCP flip (`image_quote → linkedin:true`) — only after the safety fix is deployed.
2. Fresh, never-published PP LinkedIn image_quote draft.
3. Governed/TMR render proof on that draft (governed winner + governed assets, not legacy).
4. One supervised native LinkedIn publish.
5. Persisted `post_publish` audit row (`method='image'`, `image_sent=true`, correct `attempt_no`) — this is also the runtime proof of the cc-0029 safety fix.
6. Cron 54 re-enable decision.
7. Open product decisions carried from cc-0028: LinkedIn aspect (1:1 vs landscape); formally back the LinkedIn platform scope (clear `platform_suitability_unproven` / `platform_scope_unbacked`) or accept.

---

*Canonical parking record. Transport = PROVEN; governed supply = CARRY. Nothing pushed, nothing applied, nothing broadened, cron 54 paused. cc-0029's original brief scoped the full governed lane; per PK 2026-07-08 it was executed as safety-only and the governed-supply scope is re-issued as cc-0030.*
