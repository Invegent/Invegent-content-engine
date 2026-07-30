# Result — Creatomate Global: Announcement Card Publish and Selector Graduation

**Brief:** PK outcome "Announcement Card Publish and Selector Graduation" (named in-session as the next fresh outcome after the template repair, 2026-07-30)
**Executed by:** Claude Code (orchestrator + subagent chain)
**Completed:** 2026-07-30 Sydney

---

## 1. Result status

**Partial — publish proof complete (with a disclosed incident and recovery), selector-ranking promotion stopped at the apply gate as designed.** Facebook native publisher path proven with a real, live, supervised post. Platform-suitability upgrade drafted, not applied. Selector-ranking-change packet drafted, not applied — and it surfaced an undisclosed secondary blast radius that needs PK's explicit sign-off before it can ever be applied.

## 2. Commit(s)

- None from this lane yet (this result doc + its register pointer are the only pending commit, staged after this doc is written). No code/DB migration was created or applied in this pass — only DML (drafts, queue rows, one backfilled audit row) via direct SQL, all disclosed below.

## 3. Files changed

- None in the repo from this specific lane (all actions were DB-side DML on drafts/queue/audit tables, or drafted-not-executed SQL packets). This result doc is the first file this lane creates.

## 4. Actions taken

**Platform selection:**
- LinkedIn was the original target (from the earlier Part A brief), but investigation found **no deployed native LinkedIn publisher EF exists at all** — only `linkedin-zapier-publisher` (Zapier bridge) is live. PK switched the target to Facebook, which has a genuine dedicated native EF (`publisher`).

**Publish proof — with a real incident, disclosed and recovered:**
- First candidate draft (`52165857…`) was rendered and nearly presented for sign-off, but turned out to be a leftover internal test artifact — its own body literally read *"B1-v1 v3.14.1 controlled proof — not for publish."* Caught before any queue/publish action; rolled back byte-exact.
- Second candidate (`881602ab…`, real content: "Inflation still too high — RBA prepared to act on rates again") was selected because it had **zero rows in `m.post_publish_queue`**, which was read as "never published." This was an incomplete check — the draft had, in fact, **already been published to LinkedIn at 02:00 UTC that same day** via the normal automated pipeline (a real, unrelated, correct publish that predates this session's involvement). The queue row for that publish had already been consumed/cleared by the time this lane checked, so only `m.post_publish` itself carried the evidence, and it wasn't checked before reuse.
- The draft was re-rendered with the repaired announcement_card template (real production pipeline, `b1_variant_intent_override`), its `platform` field was changed to `facebook`, and — after external review flagged a legitimate concern about bypassing the governed enqueue RPC — it was queued via the real `public.draft_approve_and_enqueue()` RPC (not a raw manual insert), with only the resulting row's `scheduled_for` manually brought forward to `now()` per PK's explicit approval (natural slot was 21:30 UTC, ~16h out).
- The Facebook publisher's standing 5-minute cron picked it up and **genuinely published it live** — confirmed via the provider's own returned `platform_post_id: 122118714753268380`.
- **A second, independent defect surfaced in the same step:** the publish's own audit-trail write to `m.post_publish` silently failed. Root cause, confirmed via `pg_constraint`: `m.post_publish` has `UNIQUE(post_draft_id, attempt_no)`; the publisher EF's insert never sets `attempt_no` and never checks the insert's `{error}` result, so it collided with the draft's pre-existing `attempt_no=1` LinkedIn row and was silently dropped — no exception, no log, nothing to indicate the loss short of manually cross-checking the table. Flagged as its own follow-up task (`task_05bf8b3d`).
- **Net effect, per PK's explicit decision:** the live Facebook post stays up (a real post is not deleted over a process mistake). The missing audit row was **backfilled accurately** using the real recovered provider response (`net._http_response`), clearly labeled in its own `request_payload.note` field as a manual backfill with the root cause named, at `attempt_no=2`.

**Platform suitability (drafted, not applied):**
- `c.creative_template_platform_suitability` already has a `candidate`-status row for announcement_card × Facebook (from original template registration) — not a fresh INSERT scenario. Drafted UPDATE upgrades it to `production_proven` with `proof_reference` set to the real `platform_post_id` and a reason citing this lane's evidence. Not applied.

**Selector-ranking-change packet (drafted, not applied):**
- Live-repulled the full ranking fresh (per the standing precondition): 11 tied `strong_candidate` rows for property-pulse/`image_quote`; 6 of them (including announcement_card) share the **exact same `created_at` timestamp**, so the true tiebreak within that group is `t.id` (UUID) ascending, then `vc.variant_key` — confirmed via `pg_get_functiondef` on the live function, not the migration file.
- The only available "promotion" lever, given the current schema has no explicit priority/rank column, is backdating `announcement_card`'s `created_at` by one microsecond earlier than the tied group. Drafted with fail-closed guards (`WHERE created_at = <exact value>` precondition + intended row-count assertion) per `db-rls-auditor`'s required fix.
- **`db-rls-auditor` surfaced a real, undisclosed secondary effect:** `public.derive_asset_appetite` (SECURITY DEFINER, called by the live Asset Gap Analysis demand loop — `analyze_asset_gap`, cc-0042/cc-0043) independently uses the **identical tiebreak** over the same rows, live-verified to currently also rank market_insight_card first / announcement_card 6th. The drafted backdate would silently flip Asset Gap's own candidate-template selection too, not just `select_template`/image-worker as originally scoped.
- **Also confirmed, structurally important:** `select_template` is fully deterministic (no rotation, no randomization) — whichever row wins the tiebreak wins **100% of the time** for every unforced render. Promoting announcement_card this way doesn't add rotation/diversity to the `image_quote` format; it simply swaps which single template is the permanent, exclusive winner. This is the honest "recent-template-repetition implication": going from 1-of-11 reachable to the sole reachable winner, same as today's incumbent.

## 5. Constraints confirmed

- No image-worker code changed in this lane (all actions were DML/DB reads, or drafted-not-applied SQL).
- Selector ranking was **not applied** — packet drafted and stopped at the gate, exactly as scoped.
- Template was not further promoted beyond the drafted (unapplied) proposal.
- No carousel work.
- Market-insight incumbent untouched and confirmed still the live, unforced winner.

## 6. Open issues

- **Live Facebook post `122118714753268380`** now exists with content that was already published to LinkedIn hours earlier — an unintended duplicate cross-post, left live per PK's explicit decision, audit trail backfilled and clearly labeled.
- **Code defect confirmed and spun off** (`task_05bf8b3d`): `m.post_publish` inserts across at least the Facebook publisher (and likely instagram/youtube/linkedin-zapier publishers — same pattern not yet checked in those files) never set `attempt_no` and never check insert errors, so any second publish attempt for an already-published draft silently loses its audit row while the real-world publish still succeeds.
- **Selector-ranking packet is explicitly NOT ready for an apply gate** until PK rules on the `derive_asset_appetite`/Asset Gap secondary-effect question `db-rls-auditor` raised — this is a new, separate PK decision, not a defect to silently fix.
- The CTA placeholder gap (Creatomate's literal "Call to action" text) remains unresolved — accepted for this one proof publish, but a real content decision for any future promotion.

## 7. Next recommended step

Two independent, PK-gated forks, neither started further in this session:
1. **Selector-ranking apply decision** — PK needs to explicitly rule on the `derive_asset_appetite` secondary effect before the drafted packet can go through a real apply gate (full T3 chain: `db-rls-auditor` re-review of the finalized packet, `apply-harness-auditor`, external review, PK gate).
2. **Publisher audit-trail bug fix** (`task_05bf8b3d`) — a real, disclosed, live-production data-integrity gap worth fixing before it silently drops another audit row on a future real publish.

---

## 8. Verification (chat fills this)

**Verdict:** `Pass with notes`

**Notes:**

- The publish proof itself succeeded (real platform_post_id), but only after a real process mistake (reusing an already-published draft) that was caught mid-flight, fully disclosed, and corrected per PK's explicit direction rather than hidden or silently patched.
- A genuine, independent system defect (silent audit-insert failure) was found as a direct consequence of this incident and is now tracked separately rather than papered over.
- The selector-ranking packet stopped exactly where it should have — external review-equivalent scrutiny (`db-rls-auditor`) caught a real undisclosed blast-radius gap before it could reach an apply gate, which is the review chain working as intended.
- All constraints respected; no unauthorized image-worker/selector/carousel changes.

## 9. Learning notes (chat fills this)

- **"No queue row" is not the same as "never published."** `m.post_publish_queue` can be empty for a draft that was already successfully published and had its queue row cleared/consumed. Any future reuse of an "approved+generated" draft must check `m.post_publish` directly for prior publish history, not just the queue table, before treating it as untouched.
- **A successful external side effect (a real live post) and a successful internal audit write are two separate guarantees** — this system's publisher code proved the first can succeed while the second silently fails, with no distinguishing signal in the function's own returned success response. Worth treating "did the audit row land" as its own explicit verification step after any publish action, not an assumption from a 200 response.
- **Reusable pattern for register/ranking changes:** always re-pull the live ranking fresh immediately before drafting a change (confirmed valuable twice now — pool composition and tiebreak details genuinely shift between sessions), and always ask a specialist review pass to check for OTHER live consumers of the same underlying column/table before assuming a change's blast radius is scoped to the one function you set out to change.
